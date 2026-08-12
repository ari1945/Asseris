// Stage 6 — retention worker for the audit-evidence lifecycle. Soft-delete (store.ts softRemove)
// only HIDES an attachment; the bytes survive until this worker PURGES them. Purging is a
// deliberate, audited act that requires (1) an elapsed retention period for the attachment's
// retention class, (2) NO active legal hold on the engagement, and (3) an explicit approval by a
// FIRM_ADMIN user. The worker's three phases mirror that gate:
//   listPurgeCandidates()  — report what is eligible (soft-deleted + retention elapsed + no hold)
//   approvePurge(ids, by)  — a FIRM_ADMIN user grants deletion (purgeApprovedAt/By + audit)
//   runPurge(dryRun)       — actually null the blob / delete the S3 object for approved rows
//
// The CLI (server/src/retentionWorker.ts, `npm run retention-worker`) drives all three phases;
// the tRPC surface (router.ts attachment.purge.*) exposes list + approve so approval can be done
// in-app with the approver's session identity, while the byte-deletion stays worker-side.
import { prisma } from '../db';
import { can, CAP } from '../rbac';
import { refreshRoleCache } from '../roleStore';
import { purgeBlob } from './blobStore';

// Server-side mirror of the client retention registry (migration/src/data_records.ts
// RETENTION_CLASSES) — the SAME class ids, years, and the SAME default (kk-audit 7 thn). The
// client registry drives display; this one drives enforcement. Keep them in lockstep.
export const RETENTION_CLASSES = [
  { id: 'kk-audit', years: 7 },
  { id: 'asurans', years: 7 },
  { id: 'perikatan', years: 10 },
  { id: 'eqr', years: 7 },
  { id: 'pajak', years: 10 },
  { id: 'pmpj', years: 5 },
  { id: 'template', years: 3 },
] as const;

const DEFAULT_CLASS = RETENTION_CLASSES[0]; // kk-audit

/** Retention years for a class id; unknown/null classes fall back to kk-audit (7). */
export function retentionYearsForClass(retentionClass: string | null): number {
  return RETENTION_CLASSES.find((c) => c.id === retentionClass)?.years ?? DEFAULT_CLASS.years;
}

export interface PurgeCandidate {
  id: string;
  scope: string;
  scopeId: string;
  collection: string;
  name: string;
  size: number;
  retentionClass: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  purgeScheduledAt: Date | null;
  purgeApprovedAt: Date | null;
  retentionYears: number;
  held: boolean;
}

/** Engagement ids with an ACTIVE legal hold — purge is suspended for all of their attachments. */
export async function activeLegalHoldEngagementIds(): Promise<Set<string>> {
  const holds = await prisma.legalHold.findMany({ where: { status: 'Aktif' }, select: { engagementId: true } });
  return new Set(holds.map((h) => h.engagementId));
}

/**
 * Eligible purge candidates at `now`: soft-deleted, not yet purged, retention elapsed, and NOT
 * under an active legal hold (engagement scope only — firm/user scope has no hold registry).
 */
export async function listPurgeCandidates(now = new Date(), includeApproved = false): Promise<PurgeCandidate[]> {
  const held = await activeLegalHoldEngagementIds();
  const rows = await prisma.attachment.findMany({
    where: {
      deletedAt: { not: null },
      purgedAt: null,
      ...(includeApproved ? {} : { purgeApprovedAt: null }),
    },
    select: {
      id: true, scope: true, scopeId: true, collection: true, name: true, size: true,
      retentionClass: true, createdAt: true, deletedAt: true, purgeScheduledAt: true, purgeApprovedAt: true,
    },
  });
  return rows.flatMap((r) => {
    const retentionYears = retentionYearsForClass(r.retentionClass);
    const eligibleAt = new Date(r.createdAt.getTime() + retentionYears * 365.25 * 864e5);
    const isHeld = r.scope === 'engagement' && held.has(r.scopeId);
    if (eligibleAt > now || isHeld) return [];
    return [{
      id: r.id, scope: r.scope, scopeId: r.scopeId, collection: r.collection, name: r.name,
      size: r.size, retentionClass: r.retentionClass, createdAt: r.createdAt, deletedAt: r.deletedAt,
      purgeScheduledAt: r.purgeScheduledAt, purgeApprovedAt: r.purgeApprovedAt,
      retentionYears, held: false,
    }];
  });
}

/** Phase 1 — mark eligible candidates as scheduled (idempotent; safe to run on a cron). */
export async function schedulePurgeCandidates(now = new Date()): Promise<number> {
  const candidates = await listPurgeCandidates(now, false);
  const ids = candidates.filter((c) => !c.purgeScheduledAt).map((c) => c.id);
  if (ids.length === 0) return 0;
  await prisma.attachment.updateMany({ where: { id: { in: ids } }, data: { purgeScheduledAt: now } });
  return ids.length;
}

/**
 * Phase 2 — a FIRM_ADMIN approver grants deletion. Only rows that are still eligible (retention
 * elapsed, not held) may be approved; returns the number approved. Caller appends the audit.
 *
 * R-3 — OTORISASI DITEGAKKAN DI SINI, di fungsi yang MENULIS, bukan diserahkan ke tiap pemanggil.
 * Jalur tRPC `attachment.purge.approve` memang sudah menuntut CAP.FIRM_ADMIN, tetapi CLI
 * `retention-worker approve --by <userId>` hanya memastikan user-nya ADA — sehingga persetujuan
 * pemusnahan BUKTI AUDIT bisa distempel atas nama siapa pun, termasuk Junior Auditor, dan masuk
 * ke jejak audit sebagai persetujuan yang tak pernah terjadi. Itu kelas cacat yang sudah tiga
 * kali ditutup di tempat lain (#169 tanda tangan Reviewer fiktif · #176 persetujuan AJE
 * dipalsukan · #177 identitas sign-off). Menaruh gerbangnya di sini menutup SETIAP pemanggil,
 * termasuk yang belum ditulis.
 *
 * Melempar (bukan mengembalikan 0) supaya penolakan otorisasi tak bisa disalahbaca sebagai
 * "tidak ada kandidat yang memenuhi syarat".
 */
export async function approvePurge(ids: string[], approvedBy: string, now = new Date()): Promise<number> {
  if (ids.length === 0) return 0;
  const approver = await prisma.user.findUnique({ where: { id: approvedBy }, select: { id: true, role: true } });
  if (!approver) throw new Error(`purge-approver-unknown:${approvedBy}`);
  await refreshRoleCache();          // peran dari DB (konsol RBAC), bukan katalog statis
  if (!can(approver.role, CAP.FIRM_ADMIN)) {
    throw new Error(`purge-approver-forbidden:${approvedBy}:${approver.role}:requires:${CAP.FIRM_ADMIN}`);
  }
  const eligible = await listPurgeCandidates(now, false);
  const eligibleIds = new Set(eligible.map((c) => c.id));
  const approvable = ids.filter((id) => eligibleIds.has(id));
  if (approvable.length === 0) return 0;
  await prisma.attachment.updateMany({
    where: { id: { in: approvable } },
    data: { purgeApprovedAt: now, purgeApprovedBy: approvedBy },
  });
  return approvable.length;
}

export interface PurgeResult {
  attempted: number;
  purged: number;
  skipped: number; // no longer eligible at purge time (e.g. legal hold appeared after approval)
  dryRun: boolean;
  purgedIds: string[];
}

/**
 * Phase 3 — actually delete the bytes of approved, still-eligible rows. Re-checks eligibility at
 * purge time (a legal hold that appeared AFTER approval suspends the deletion — approval is
 * necessary but not sufficient). Returns counts; the caller appends the per-row audit.
 */
export async function runPurge(dryRun: boolean, now = new Date()): Promise<PurgeResult> {
  const held = await activeLegalHoldEngagementIds();
  const rows = await prisma.attachment.findMany({
    where: { deletedAt: { not: null }, purgedAt: null, purgeApprovedAt: { not: null } },
    select: {
      id: true, scope: true, scopeId: true, collection: true, name: true,
      retentionClass: true, createdAt: true, storageKind: true, blob: true, objectKey: true,
      purgeApprovedAt: true,
    },
  });
  let purged = 0;
  let skipped = 0;
  const purgedIds: string[] = [];
  for (const r of rows) {
    const retentionYears = retentionYearsForClass(r.retentionClass);
    const eligibleAt = new Date(r.createdAt.getTime() + retentionYears * 365.25 * 864e5);
    const isHeld = r.scope === 'engagement' && held.has(r.scopeId);
    if (eligibleAt > now || isHeld) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      purged += 1;
      purgedIds.push(r.id);
      continue;
    }
    const cleared = await purgeBlob({ storageKind: r.storageKind, blob: r.blob, objectKey: r.objectKey });
    await prisma.attachment.update({
      where: { id: r.id },
      data: {
        ...(cleared ?? {}),
        purgedAt: now,
        purgeApprovedAt: r.purgeApprovedAt, // keep the approval stamp for the audit trail
      },
    });
    purged += 1;
    purgedIds.push(r.id);
  }
  return { attempted: rows.length, purged, skipped, dryRun, purgedIds };
}
