// Stage 6 — retention worker CLI (audit-evidence purge). Drives the three-phase lifecycle in
// attachments/retention.ts:
//   npm run retention-worker list            — report eligible candidates (no writes)
//   npm run retention-worker schedule        — mark eligible candidates purgeScheduledAt
//   npm run retention-worker approve <id|all> --by <userId>   — FIRM_ADMIN grants deletion
//   npm run retention-worker purge [--dry-run] — delete bytes of approved, still-eligible rows
//
// Approval writes an audit row (ATTACH_PURGE_APPROVE) keyed to the approver's session identity.
// The byte-deletion is a separate phase so the operator can inspect the approval trail first.
import './env';
import { prisma } from './db';
import { appendAudit } from './audit/log';
import { listPurgeCandidates, schedulePurgeCandidates, approvePurge, runPurge } from './attachments/retention';

function usage(): never {
  console.error('usage: retention-worker <list|schedule|approve|purge> [args]');
  console.error('  list                — report eligible purge candidates (no writes)');
  console.error('  schedule            — mark eligible candidates purgeScheduledAt');
  console.error('  approve <id|all> --by <userId>  — approve deletion (FIRM_ADMIN identity)');
  console.error('  purge [--dry-run]   — delete bytes of approved, still-eligible rows');
  process.exit(1);
}

async function main(): Promise<void> {
  const [cmd, arg, flag, flagValue] = process.argv.slice(2);
  if (!cmd) usage();

  if (cmd === 'list') {
    const candidates = await listPurgeCandidates(new Date(), false);
    console.log(`Purge candidates (soft-deleted, retention elapsed, no legal hold): ${candidates.length}`);
    for (const c of candidates) {
      console.log(`  ${c.id}  ${c.scope}:${c.scopeId}  ${c.collection}/${c.name}  ${c.size}B  class=${c.retentionClass ?? 'kk-audit'}`);
    }
    return;
  }

  if (cmd === 'schedule') {
    const scheduled = await schedulePurgeCandidates(new Date());
    console.log(`Scheduled ${scheduled} attachment(s) for purge (purgeScheduledAt).`);
    return;
  }

  if (cmd === 'approve') {
    if (!arg || (flag !== '--by' && flag !== '--by=') || !flagValue) usage();
    const userId = flagValue;
    const approver = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, name: true } });
    if (!approver) {
      console.error(`User ${userId} tidak ditemukan — approval harus memakai identitas user nyata (FIRM_ADMIN).`);
      process.exit(1);
    }
    const ids = arg === 'all' ? (await listPurgeCandidates(new Date(), false)).map((c) => c.id) : [arg];
    const approved = await approvePurge(ids, userId);
    if (approved === 0) {
      console.log('Tidak ada kandidat yang dapat disetujui (mungkin sudah approval, masih di-hold, atau retensi belum habis).');
      return;
    }
    await appendAudit({
      actorUserId: userId, actorRole: approver.role, action: 'ATTACH_PURGE_APPROVE',
      detail: `approved=${approved} ids=${ids.slice(0, 5).join(',')}${ids.length > 5 ? ` +${ids.length - 5}` : ''}`,
    });
    console.log(`Approved ${approved} attachment(s) for purge (approver ${approver.name}).`);
    return;
  }

  if (cmd === 'purge') {
    const dryRun = arg === '--dry-run';
    const result = await runPurge(dryRun);
    console.log(
      `Purge ${dryRun ? 'DRY-RUN ' : ''}selesai: attempted=${result.attempted} purged=${result.purged} skipped=${result.skipped}`,
    );
    if (!dryRun && result.purged > 0) {
      console.log('Audit ATTACH_PURGE ditulis per baris (drain outbox menunggu — lihat log server).');
    }
    return;
  }

  usage();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('✗ retention-worker gagal:', e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
