// Stage 4 — durable audit pipeline.
// Producers enqueue immutable metadata; one serial worker turns pending rows into the hash chain.
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { inc, log, setGauge } from '../obs/log';
import { verifyAuditCheckpoint, writeAuditCheckpoint } from './checkpoint';

export const GENESIS_HASH = '0'.repeat(64);

export type AuditAction =
  | 'STATE_SET' | 'LOGIN' | 'LOGOUT' | 'LLM_NARRATE' | 'EXPORT' | 'SEAL' | 'SYNC' | 'ARCHIVE'
  | 'ROLE_CREATE' | 'ROLE_UPDATE_GRANTS' | 'ROLE_DELETE'
  | 'SELF_SERVICE'
  | 'ATTACH_UPLOAD' | 'ATTACH_REMOVE' | 'ATTACH_PURGE_APPROVE' | 'ATTACH_PURGE';

export interface AuditEntry {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  scope?: string | null;
  scopeId?: string | null;
  key?: string | null;
  detail?: string | null;
}

function outboxData(entry: AuditEntry, idempotencyKey: string) {
  return {
    idempotencyKey,
    actorUserId: entry.actorUserId ?? null,
    actorRole: entry.actorRole ?? null,
    action: entry.action,
    scope: entry.scope ?? null,
    scopeId: entry.scopeId ?? null,
    key: entry.key ?? null,
    detail: entry.detail ?? null,
  };
}

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
  return createHash('sha256').update([
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
  ].join('|')).digest('hex');
}

/** Enqueue inside the caller's transaction. This is the critical business/audit atomic boundary. */
export async function enqueueAudit(
  tx: Prisma.TransactionClient,
  entry: AuditEntry,
  idempotencyKey: string,
): Promise<string> {
  const row = await tx.auditOutbox.create({
    data: outboxData(entry, idempotencyKey),
    select: { id: true },
  });
  inc('audit_outbox_enqueued_total');
  return row.id;
}

let activeDrain: Promise<number> | null = null;
let drainRequested = false;
let standaloneProducerTail: Promise<void> = Promise.resolve();
let workerTimer: NodeJS.Timeout | null = null;
let injectedWorkerFailure: Error | null = null;

async function processOne(): Promise<boolean> {
  let attemptedId: string | null = null;
  try {
    const checkpoint = await prisma.$transaction(async (tx): Promise<{ seq: number; hash: string } | null> => {
      const pending = await tx.auditOutbox.findFirst({
        where: { checkpointedAt: null },
        orderBy: [{ enqueuedAt: 'asc' }, { id: 'asc' }],
      });
      if (!pending) return null;
      attemptedId = pending.id;
      if (injectedWorkerFailure) throw injectedWorkerFailure;

      // Defensive recovery for a process that somehow committed the AuditLog row before the
      // processed marker (normally impossible because both writes share this transaction).
      const existing = await tx.auditLog.findUnique({ where: { outboxId: pending.id } });
      if (existing) {
        if (!pending.processedAt) {
          await tx.auditOutbox.update({ where: { id: pending.id }, data: { processedAt: new Date(), lastError: null } });
        }
        return { seq: existing.seq, hash: existing.hash };
      }

      const last = await tx.auditLog.findFirst({ orderBy: { seq: 'desc' } });
      const seq = (last?.seq ?? 0) + 1;
      const prevHash = last?.hash ?? GENESIS_HASH;
      const ts = new Date();
      const material = {
        seq,
        ts,
        actorUserId: pending.actorUserId,
        actorRole: pending.actorRole,
        action: pending.action,
        scope: pending.scope,
        scopeId: pending.scopeId,
        key: pending.key,
        detail: pending.detail,
        prevHash,
      };
      const hash = hashRow(material);
      await tx.auditLog.create({ data: { ...material, hash, outboxId: pending.id } });
      await tx.auditOutbox.update({
        where: { id: pending.id },
        data: { processedAt: ts, attempts: { increment: 1 }, lastError: null },
      });
      return { seq, hash };
    });
    if (checkpoint) {
      await writeAuditCheckpoint(checkpoint.seq, checkpoint.hash);
      if (attemptedId) {
        await prisma.auditOutbox.update({
          where: { id: attemptedId },
          data: { checkpointedAt: new Date(), lastError: null },
        });
      }
      inc('audit_appends_total');
    }
    return checkpoint !== null;
  } catch (error) {
    if (attemptedId) {
      await prisma.auditOutbox.update({
        where: { id: attemptedId },
        data: {
          attempts: { increment: 1 },
          lastError: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
        },
      }).catch(() => {});
    }
    inc('audit_outbox_failures_total');
    throw error;
  }
}

async function drain(limit: number): Promise<number> {
  let count = 0;
  while (count < limit && await processOne()) count++;
  await refreshAuditOutboxMetrics();
  return count;
}

/** Serial, idempotent worker drain. Concurrent callers join one in-process queue. */
export function drainAuditOutbox(limit = 100): Promise<number> {
  if (activeDrain) {
    // The active serial worker will make one more pass, including rows enqueued while it ran.
    // All concurrent producers share this promise instead of queueing N redundant empty drains.
    drainRequested = true;
    return activeDrain;
  }
  activeDrain = (async () => {
    let total = 0;
    do {
      drainRequested = false;
      total += await drain(limit);
    } while (drainRequested);
    return total;
  })().finally(() => {
    activeDrain = null;
  });
  return activeDrain;
}

/** Legacy/non-StateDoc producer: durable enqueue first, then eagerly drain for low latency. */
export async function appendAudit(entry: AuditEntry, idempotencyKey = `audit:${randomUUID()}`): Promise<void> {
  // SQLite dev/test and the single-worker production contract both benefit from serial standalone
  // producers: a burst cannot contend with the chain transaction or spawn competing drains.
  const run = standaloneProducerTail.then(async () => {
    await prisma.auditOutbox.create({ data: outboxData(entry, idempotencyKey) });
    inc('audit_outbox_enqueued_total');
    await drainAuditOutbox().catch((error) => {
      log.error('audit.outbox_drain_failed', { error: error instanceof Error ? error.message : String(error) });
    });
  });
  standaloneProducerTail = run.catch(() => {});
  await run;
}

export interface AuditOutboxStatus {
  pending: number;
  oldestAgeSeconds: number;
  stalled: boolean;
  thresholdSeconds: number;
}

export async function auditOutboxStatus(now = new Date()): Promise<AuditOutboxStatus> {
  const [pending, oldest] = await Promise.all([
    prisma.auditOutbox.count({ where: { checkpointedAt: null } }),
    prisma.auditOutbox.findFirst({ where: { checkpointedAt: null }, orderBy: { enqueuedAt: 'asc' }, select: { enqueuedAt: true } }),
  ]);
  const thresholdSeconds = Math.max(1, Number(process.env.AUDIT_OUTBOX_STALL_SECONDS ?? 60));
  const oldestAgeSeconds = oldest ? Math.max(0, Math.floor((now.getTime() - oldest.enqueuedAt.getTime()) / 1000)) : 0;
  return { pending, oldestAgeSeconds, stalled: pending > 0 && oldestAgeSeconds >= thresholdSeconds, thresholdSeconds };
}

export async function refreshAuditOutboxMetrics(): Promise<AuditOutboxStatus> {
  const status = await auditOutboxStatus();
  setGauge('audit_outbox_pending', status.pending);
  setGauge('audit_outbox_oldest_age_seconds', status.oldestAgeSeconds);
  if (status.stalled) log.error('audit.outbox_stalled', { ...status });
  return status;
}

export async function auditReadiness(): Promise<{
  ok: boolean;
  outbox: AuditOutboxStatus;
  checkpoint: Awaited<ReturnType<typeof verifyAuditCheckpoint>>;
}> {
  const [outbox, checkpoint] = await Promise.all([refreshAuditOutboxMetrics(), verifyAuditCheckpoint()]);
  return { ok: !outbox.stalled && checkpoint.ok, outbox, checkpoint };
}

export function startAuditOutboxWorker(intervalMs = Math.max(250, Number(process.env.AUDIT_OUTBOX_POLL_MS ?? 1000))): () => void {
  if (workerTimer) return () => stopAuditOutboxWorker();
  const tick = () => void drainAuditOutbox().catch((error) => {
    log.error('audit.outbox_worker_failed', { error: error instanceof Error ? error.message : String(error) });
  });
  tick();
  workerTimer = setInterval(tick, intervalMs);
  workerTimer.unref();
  return () => stopAuditOutboxWorker();
}

export function stopAuditOutboxWorker(): void {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}

export interface VerifyResult {
  ok: boolean;
  brokenAt: number | null;
  count: number;
}

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
    if (r.prevHash !== prevHash || r.hash !== expected) return { ok: false, brokenAt: r.seq, count: rows.length };
    prevHash = r.hash;
  }
  return { ok: true, brokenAt: null, count: rows.length };
}

export function __setAuditWorkerFailureForTests(error: Error | null): void {
  injectedWorkerFailure = error;
}

export const __hashRow = hashRow;
