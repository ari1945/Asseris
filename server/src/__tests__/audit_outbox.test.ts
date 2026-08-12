import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditOutboxStatus, __setAuditWorkerFailureForTests, drainAuditOutbox } from '../audit/log';
import { verifyAuditCheckpoint } from '../audit/checkpoint';
import { prisma } from '../db';
import { mutateStateDoc } from '../stateMutation';

const identity = { scope: 'firm', scopeId: 'STAGE4-FIRM', key: 'failure-probe' };
const checkpointPath = join(tmpdir(), `asseris-audit-checkpoint-${process.pid}-${randomUUID()}.json`);

describe('Stage 4 — transactional outbox failure gates', () => {
  beforeAll(async () => {
    process.env.AUDIT_CHECKPOINT_PATH = checkpointPath;
    await prisma.stateDoc.deleteMany({ where: identity });
    await prisma.stateDocHistory.deleteMany({ where: identity });
    await prisma.auditOutbox.deleteMany({ where: { scopeId: identity.scopeId } });
  });

  afterAll(async () => {
    __setAuditWorkerFailureForTests(null);
    await prisma.stateDoc.deleteMany({ where: identity });
    await prisma.stateDocHistory.deleteMany({ where: identity });
    await prisma.auditOutbox.deleteMany({ where: { scopeId: identity.scopeId } });
    rmSync(checkpointPath, { force: true });
    delete process.env.AUDIT_CHECKPOINT_PATH;
  });

  it('failure before outbox insert rolls back StateDoc and history too', async () => {
    await expect(mutateStateDoc({
      ...identity,
      expectedVersion: 0,
      updatedBy: 'stage4-user',
      actorRole: 'Engagement Partner',
      action: 'STATE_SET',
      auditDetail: 'fault-before-outbox',
      mutate: () => ({ value: { mustRollback: true } }),
      beforeOutbox: () => { throw new Error('simulated-outbox-insert-failure'); },
    })).rejects.toThrow('simulated-outbox-insert-failure');

    expect(await prisma.stateDoc.count({ where: identity })).toBe(0);
    expect(await prisma.stateDocHistory.count({ where: identity })).toBe(0);
    expect(await prisma.auditOutbox.count({ where: { scopeId: identity.scopeId } })).toBe(0);
  });

  it('worker failure leaves one durable outbox; repeated retries create exactly one audit event', async () => {
    __setAuditWorkerFailureForTests(new Error('simulated-chain-writer-down'));
    const written = await mutateStateDoc({
      ...identity,
      expectedVersion: 0,
      updatedBy: 'stage4-user',
      actorRole: 'Engagement Partner',
      action: 'STATE_SET',
      auditDetail: 'v0->v1',
      mutate: () => ({ value: { committed: true } }),
    });
    expect(written.version).toBe(1);
    expect(await prisma.stateDoc.count({ where: identity })).toBe(1);
    expect(await prisma.stateDocHistory.count({ where: identity })).toBe(1);
    expect(await prisma.auditOutbox.count({ where: { scopeId: identity.scopeId, processedAt: null } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { scopeId: identity.scopeId, key: identity.key } })).toBe(0);

    __setAuditWorkerFailureForTests(null);
    await Promise.all([drainAuditOutbox(), drainAuditOutbox(), drainAuditOutbox()]);
    expect(await prisma.auditLog.count({ where: { scopeId: identity.scopeId, key: identity.key } })).toBe(1);
    const outbox = await prisma.auditOutbox.findFirst({ where: { scopeId: identity.scopeId } });
    expect(outbox?.processedAt).toBeInstanceOf(Date);
    expect(await prisma.auditLog.count({ where: { outboxId: outbox?.id } })).toBe(1);
  });

  it('off-box write failure remains backlog and retries the checkpoint without duplicating the chain row', async () => {
    const before = await prisma.auditLog.count({ where: { scopeId: identity.scopeId, key: identity.key } });
    // checkpointPath is already a FILE from the prior append; treating it as a directory makes
    // mkdir/write fail deterministically on every platform.
    process.env.AUDIT_CHECKPOINT_PATH = join(checkpointPath, 'nested.json');
    const written = await mutateStateDoc({
      ...identity,
      expectedVersion: 1,
      updatedBy: 'stage4-user',
      actorRole: 'Engagement Partner',
      action: 'STATE_SET',
      auditDetail: 'v1->v2',
      mutate: () => ({ value: { committed: 'checkpoint-pending' } }),
    });
    expect(written.version).toBe(2);
    const pending = await prisma.auditOutbox.findUnique({
      where: { idempotencyKey: `statedoc:${identity.scope}:${identity.scopeId}:${identity.key}:v2` },
    });
    expect(pending?.processedAt).toBeInstanceOf(Date);
    expect(pending?.checkpointedAt).toBeNull();
    expect(await prisma.auditLog.count({ where: { scopeId: identity.scopeId, key: identity.key } })).toBe(before + 1);

    process.env.AUDIT_CHECKPOINT_PATH = checkpointPath;
    await Promise.all([drainAuditOutbox(), drainAuditOutbox()]);
    const retried = await prisma.auditOutbox.findUnique({ where: { id: pending!.id } });
    expect(retried?.checkpointedAt).toBeInstanceOf(Date);
    expect(await prisma.auditLog.count({ where: { outboxId: pending!.id } })).toBe(1);
  });

  it('signed off-box checkpoint detects tail truncation', async () => {
    const checkpoint = await verifyAuditCheckpoint();
    expect(checkpoint.ok).toBe(true);
    expect(checkpoint.lastSeq).toBeGreaterThan(0);
    const tail = await prisma.auditLog.findUnique({ where: { seq: checkpoint.lastSeq! } });
    expect(tail).toBeTruthy();
    await prisma.auditLog.delete({ where: { id: tail!.id } });
    expect(await verifyAuditCheckpoint()).toMatchObject({ ok: false, configured: true });
    await prisma.auditLog.create({ data: tail! });
    expect((await verifyAuditCheckpoint()).ok).toBe(true);
  });

  it('an old pending outbox is classified as stalled for readiness/alerting', async () => {
    const previous = process.env.AUDIT_OUTBOX_STALL_SECONDS;
    process.env.AUDIT_OUTBOX_STALL_SECONDS = '1';
    const idempotencyKey = `stalled-test:${randomUUID()}`;
    await prisma.auditOutbox.create({
      data: {
        idempotencyKey,
        enqueuedAt: new Date(Date.now() - 5_000),
        action: 'STATE_SET',
        scope: 'firm',
        scopeId: 'STALLED-ONLY',
        key: 'probe',
      },
    });
    expect(await auditOutboxStatus()).toMatchObject({ pending: expect.any(Number), stalled: true, thresholdSeconds: 1 });
    await prisma.auditOutbox.delete({ where: { idempotencyKey } });
    if (previous === undefined) delete process.env.AUDIT_OUTBOX_STALL_SECONDS;
    else process.env.AUDIT_OUTBOX_STALL_SECONDS = previous;
  });
});
