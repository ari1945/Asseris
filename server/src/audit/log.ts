// W10 — server-side, append-only, hash-chained audit trail. Replaces the client-side
// pseudo-hash demo (window.amsFakeHash / buildAuditStream). Every audit-significant action
// (StateDoc write, login/logout, LLM narration) appends one immutable row; each row's `hash`
// chains the previous row's hash, so any later edit, deletion, or reorder breaks the chain and
// is caught by verifyAuditChain(). There is intentionally NO update/delete path here.
import { createHash } from 'node:crypto';
import { prisma } from '../db';
import { inc } from '../obs/log';

// The chain root. The first row's prevHash is this; an empty DB verifies as ok.
export const GENESIS_HASH = '0'.repeat(64);

export type AuditAction =
  | 'STATE_SET' | 'LOGIN' | 'LOGOUT' | 'LLM_NARRATE' | 'EXPORT' | 'SEAL' | 'SYNC' | 'ARCHIVE'
  // RBAC admin console (PRD docs/prd-rbac-admin-console.md) — every role/grant change is a
  // security-sensitive event (PRD §3 success criterion 6).
  | 'ROLE_CREATE' | 'ROLE_UPDATE_GRANTS' | 'ROLE_DELETE'
  // 2026-07-06 — self-service pegawai (ajukan cuti / deklarasi sendiri) dari "Data Personal Saya".
  | 'SELF_SERVICE';

export interface AuditEntry {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  scope?: string | null;
  scopeId?: string | null;
  key?: string | null;
  detail?: string | null; // metadata only — never working-paper content
}

// The exact, order-sensitive material hashed for a row. Kept in one place so appendAudit and
// verifyAuditChain can never disagree about the recipe. `|` join with normalized nulls → '';
// ts is the ISO string of the stored DateTime (verify reads the same value back).
function hashRow(r: {
  seq: number;
  ts: Date;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  scope: string | null;
  scopeId: string | null;
  key: string | null;
  detail: string | null;
  prevHash: string;
}): string {
  const material = [
    r.seq,
    r.ts.toISOString(),
    r.actorUserId ?? '',
    r.actorRole ?? '',
    r.action,
    r.scope ?? '',
    r.scopeId ?? '',
    r.key ?? '',
    r.detail ?? '',
    r.prevHash,
  ].join('|');
  return createHash('sha256').update(material).digest('hex');
}

// In-process serialization queue. seq and prevHash are read-then-written, so two concurrent
// appends must not interleave or they'd race on max(seq) and fork the chain. A single Node
// process is the deployment assumption (W10 deploy notes); horizontal scaling would move this
// sequencing into the DB (e.g. a SERIALIZABLE txn or a dedicated sequence + advisory lock).
let tail: Promise<unknown> = Promise.resolve();

/**
 * Append one row to the audit chain. Best-effort: a logging failure must never break the
 * operation being audited, so errors are swallowed (the caller already did its real work).
 * Returns when this append has settled, preserving ordering for callers that await it.
 */
export async function appendAudit(entry: AuditEntry): Promise<void> {
  const run = tail.then(async () => {
    const last = await prisma.auditLog.findFirst({ orderBy: { seq: 'desc' } });
    const seq = (last?.seq ?? 0) + 1;
    const prevHash = last?.hash ?? GENESIS_HASH;
    const ts = new Date();
    const row = {
      seq,
      ts,
      actorUserId: entry.actorUserId ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      scope: entry.scope ?? null,
      scopeId: entry.scopeId ?? null,
      key: entry.key ?? null,
      detail: entry.detail ?? null,
      prevHash,
    };
    const hash = hashRow(row);
    await prisma.auditLog.create({ data: { ...row, hash } });
    inc('audit_appends_total');
  });
  // Keep the queue alive even if this append throws, so a single failure doesn't wedge the
  // chain for every later append. The error is intentionally not propagated to the caller.
  tail = run.catch(() => {});
  await tail;
}

export interface VerifyResult {
  ok: boolean;
  brokenAt: number | null; // seq of the first row that fails (prevHash mismatch or bad hash)
  count: number;
}

/** Recompute the whole chain oldest→newest and report the first break, if any. */
export async function verifyAuditChain(): Promise<VerifyResult> {
  const rows = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
  let prevHash = GENESIS_HASH;
  for (const r of rows) {
    const expected = hashRow({
      seq: r.seq,
      ts: r.ts,
      actorUserId: r.actorUserId,
      actorRole: r.actorRole,
      action: r.action,
      scope: r.scope,
      scopeId: r.scopeId,
      key: r.key,
      detail: r.detail,
      prevHash,
    });
    if (r.prevHash !== prevHash || r.hash !== expected) {
      return { ok: false, brokenAt: r.seq, count: rows.length };
    }
    prevHash = r.hash;
  }
  return { ok: true, brokenAt: null, count: rows.length };
}

// Exposed for tests only — lets a test recompute a row's hash to forge a "successful" tamper
// (verify must still catch the prevHash break that the forge can't repair without rehashing
// every later row). Not used by production code.
export const __hashRow = hashRow;
