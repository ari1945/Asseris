import { Prisma } from '@prisma/client';
import type { AuditAction } from './audit/log';
import { drainAuditOutbox, enqueueAudit } from './audit/log';
import { prisma } from './db';
import { serializeStateDoc } from './payloadLimits';

export interface StateDocIdentity {
  scope: string;
  scopeId: string;
  key: string;
}

export class StateDocConflictError extends Error {
  constructor(public readonly currentVersion: number, message = 'version-mismatch') {
    super(message);
    this.name = 'StateDocConflictError';
  }
}

export interface StateMutationInput<TResult = undefined> extends StateDocIdentity {
  expectedVersion?: number;
  updatedBy: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  auditKey?: string;
  auditDetail: string | ((fromVersion: number, toVersion: number) => string);
  seed?: () => unknown | Promise<unknown>;
  mutate: (current: unknown, currentVersion: number) =>
    | { value: unknown; result?: TResult }
    | Promise<{ value: unknown; result?: TResult }>;
  skipIfUnchanged?: boolean;
  maxRetries?: number;
  /** Failure injection only: proves business/history roll back if outbox insertion cannot finish. */
  beforeOutbox?: (tx: Prisma.TransactionClient) => void | Promise<void>;
}

export interface StateMutationResult<TResult = undefined> {
  value: unknown;
  version: number;
  changed: boolean;
  result?: TResult;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * The only runtime StateDoc writer. CAS, immutable history and audit outbox are inseparable here.
 * A successful changed=true return therefore proves all three rows committed together.
 */
export async function mutateStateDoc<TResult = undefined>(
  input: StateMutationInput<TResult>,
): Promise<StateMutationResult<TResult>> {
  const identity = { scope: input.scope, scopeId: input.scopeId, key: input.key };
  const attempts = Math.max(1, input.expectedVersion === undefined ? (input.maxRetries ?? 5) : 1);

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const doc = await tx.stateDoc.findUnique({ where: { scope_scopeId_key: identity } });
        const currentVersion = doc?.version ?? 0;
        if (input.expectedVersion !== undefined && currentVersion !== input.expectedVersion) {
          throw new StateDocConflictError(currentVersion, input.expectedVersion === 0 ? 'already-exists' : 'version-mismatch');
        }
        const current = doc ? JSON.parse(doc.valueJson) as unknown : await input.seed?.() ?? null;
        const mutation = await input.mutate(current, currentVersion);
        const valueJson = serializeStateDoc(mutation.value);

        if (doc && input.skipIfUnchanged && doc.valueJson === valueJson) {
          return { value: mutation.value, version: doc.version, changed: false, result: mutation.result };
        }

        let nextVersion: number;
        if (!doc) {
          const last = await tx.stateDocHistory.findFirst({
            where: identity,
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          nextVersion = (last?.version ?? 0) + 1;
          await tx.stateDoc.create({ data: { ...identity, valueJson, version: nextVersion, updatedBy: input.updatedBy } });
        } else {
          nextVersion = currentVersion + 1;
          const updated = await tx.stateDoc.updateMany({
            where: { ...identity, version: currentVersion },
            data: { valueJson, version: nextVersion, updatedBy: input.updatedBy },
          });
          if (updated.count !== 1) throw new StateDocConflictError(currentVersion, 'lost-cas');
        }

        await tx.stateDocHistory.create({
          data: { ...identity, version: nextVersion, valueJson, updatedBy: input.updatedBy },
        });
        await input.beforeOutbox?.(tx);
        const detail = typeof input.auditDetail === 'function'
          ? input.auditDetail(currentVersion, nextVersion)
          : input.auditDetail;
        await enqueueAudit(tx, {
          actorUserId: input.actorUserId ?? input.updatedBy,
          actorRole: input.actorRole ?? null,
          action: input.action,
          scope: identity.scope,
          scopeId: identity.scopeId,
          key: input.auditKey ?? identity.key,
          detail,
        }, `statedoc:${input.scope}:${input.scopeId}:${input.key}:v${nextVersion}`);

        return { value: mutation.value, version: nextVersion, changed: true, result: mutation.result };
      });

      // Low-latency eager drain. Failure is deliberately non-fatal: the durable outbox is the
      // guarantee, and the background worker/readiness path will retry and surface a stall.
      if (outcome.changed) await drainAuditOutbox().catch(() => {});
      return outcome;
    } catch (error) {
      if (error instanceof StateDocConflictError) {
        if (input.expectedVersion === undefined && attempt + 1 < attempts) continue;
        // Re-read because updateMany's lost-CAS error only knows the version it attempted.
        const current = await prisma.stateDoc.findUnique({ where: { scope_scopeId_key: identity }, select: { version: true } });
        throw new StateDocConflictError(current?.version ?? 0, error.message);
      }
      if (isUniqueViolation(error)) {
        const current = await prisma.stateDoc.findUnique({ where: { scope_scopeId_key: identity }, select: { version: true } });
        if (input.expectedVersion === undefined && attempt + 1 < attempts) continue;
        throw new StateDocConflictError(current?.version ?? 0, current ? 'already-exists' : 'create-race');
      }
      throw error;
    }
  }
  throw new Error(`${input.key} CAS contention — exceeded retries`);
}
