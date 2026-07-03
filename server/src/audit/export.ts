// K5 hardening — off-box, append-only export of the audit chain, independent of the daily
// full-DB backup (deploy/aws-ec2-test/backup.sh). Point: an attacker who compromises the DB host
// still has to also compromise wherever this export lands (S3, a different key) to erase every
// copy of the audit trail. Chain integrity is checked BEFORE export — a corrupted/tampered chain
// refuses to export silently-wrong data; the operator sees the break instead.
import { prisma } from '../db';
import { verifyAuditChain, GENESIS_HASH } from './log';

export interface AuditExportResult {
  jsonl: string;
  count: number;
  fromSeq: number | null;
  toSeq: number | null;
}

/**
 * Verify the chain, then serialize rows with seq > sinceSeq (default: all rows) to JSONL —
 * one AuditLog row per line, oldest first, so a re-import/verify can replay it in order.
 * Pure (no filesystem/network I/O) so it's directly unit-testable; callers (the CLI wrapper)
 * own writing/encrypting/uploading the result.
 */
export async function exportAuditLogJsonl(sinceSeq = 0): Promise<AuditExportResult> {
  const verify = await verifyAuditChain();
  if (!verify.ok) {
    throw new Error(
      `audit chain broken at seq=${verify.brokenAt} — refusing to export (would silently ship tampered/corrupted data)`,
    );
  }
  const rows = await prisma.auditLog.findMany({
    where: { seq: { gt: sinceSeq } },
    orderBy: { seq: 'asc' },
  });
  const jsonl = rows.map((r) => JSON.stringify(r)).join('\n');
  return {
    jsonl,
    count: rows.length,
    fromSeq: rows[0]?.seq ?? null,
    toSeq: rows[rows.length - 1]?.seq ?? null,
  };
}

// Exposed for tests only — lets a test assert the genesis constant used to seed re-verification
// of an exported JSONL slice (a partial export's first row chains to whatever prevHash it has,
// not GENESIS_HASH, unless sinceSeq=0).
export const __GENESIS_HASH = GENESIS_HASH;
