// K5 — thin CLI wrapper around audit/export.ts. Prints the audit chain (or the slice after
// SINCE_SEQ) as JSONL to stdout; a shell wrapper (deploy/aws-ec2-test/export-audit-log.sh)
// pipes this through gzip + encryption + optional off-box (S3) upload, mirroring backup.sh.
//
//   npm run export-audit-log                  # full chain
//   SINCE_SEQ=1200 npm run export-audit-log    # only rows after seq 1200 (incremental/cron)
//
// Exits 1 with a clear stderr message (no stdout output) if the chain fails verification —
// a broken chain must never produce a silently-exported "looks fine" artifact.
import './env';
import { prisma } from './db';
import { exportAuditLogJsonl } from './audit/export';

async function main(): Promise<void> {
  const sinceSeq = Number(process.env.SINCE_SEQ ?? 0);
  const result = await exportAuditLogJsonl(sinceSeq);
  if (result.count > 0) process.stdout.write(result.jsonl + '\n');
  console.error(`✓ exported ${result.count} row(s), seq ${result.fromSeq ?? '-'}..${result.toSeq ?? '-'}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('✗ export-audit-log gagal:', e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
