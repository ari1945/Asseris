import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { appendAudit, verifyAuditChain, GENESIS_HASH, __hashRow } from '../audit/log';

// The audit chain is GLOBAL across the whole test DB — every state.set in the other suites also
// appends to it. So these tests assert *relative* / *structural* properties (chain stays valid,
// new rows link onto the existing tail, tamper is caught) rather than absolute seq/count values.
// fileParallelism:false (vitest.config) keeps appends from racing across workers.

function callerAs(role: string, id: string) {
  const user = { id, role } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}

const AFIRM = 'AUD-FIRM';
const ACLI = 'AUD-CLI';
const AENG = 'AUD-ENG';
const PARTNER = 'AUD-partner';
const JR = 'AUD-jr';

beforeAll(async () => {
  await prisma.firm.create({ data: { id: AFIRM, name: 'Audit Firm', short: 'AUD' } });
  await prisma.client.create({ data: { id: ACLI, firmId: AFIRM, name: 'Audit Client' } });
  await prisma.engagement.create({ data: { id: AENG, firmId: AFIRM, clientId: ACLI } });
  await prisma.user.create({ data: { id: PARTNER, firmId: AFIRM, name: 'Aud Partner', role: 'Engagement Partner', dataJson: '{}' } });
  await prisma.user.create({ data: { id: JR, firmId: AFIRM, name: 'Aud Junior', role: 'Junior Auditor', dataJson: '{}' } });
  // Partner has ENGAGEMENT_VIEW_ALL (oversight) so no membership needed; Junior needs one to write.
  await prisma.engagementMember.create({ data: { engagementId: AENG, userId: JR } });
});

afterAll(async () => {
  await prisma.engagementMember.deleteMany({ where: { engagementId: AENG } });
  await prisma.stateDoc.deleteMany({ where: { scopeId: AENG } });
  await prisma.engagement.deleteMany({ where: { id: AENG } });
  await prisma.user.deleteMany({ where: { id: { in: [PARTNER, JR] } } });
  await prisma.client.deleteMany({ where: { id: ACLI } });
  await prisma.firm.deleteMany({ where: { id: AFIRM } });
  await prisma.$disconnect();
});

describe('audit chain — append & verify', () => {
  it('appends link onto the tail and the chain verifies', async () => {
    const before = await verifyAuditChain();
    expect(before.ok).toBe(true); // whatever other suites wrote, it must be intact

    await appendAudit({ actorUserId: PARTNER, actorRole: 'Engagement Partner', action: 'LOGIN' });
    await appendAudit({ actorUserId: PARTNER, actorRole: 'Engagement Partner', action: 'STATE_SET', scope: 'engagement', scopeId: AENG, key: 'wpState', detail: 'v0->v1' });

    const after = await verifyAuditChain();
    expect(after.ok).toBe(true);
    expect(after.count).toBe(before.count + 2); // exactly the two we added (serialized)
  });

  it('the first row of an isolated chain would link to GENESIS', async () => {
    const first = await prisma.auditLog.findFirst({ orderBy: { seq: 'asc' } });
    expect(first?.prevHash).toBe(GENESIS_HASH);
  });

  it('seq is strictly increasing in insertion order', async () => {
    const rows = await prisma.auditLog.findMany({ orderBy: { seq: 'asc' }, select: { seq: true } });
    for (let i = 1; i < rows.length; i++) expect(rows[i].seq).toBeGreaterThan(rows[i - 1].seq);
  });
});

describe('audit chain — tamper evidence', () => {
  it('mutating a row breaks verification, then restoring re-validates it', async () => {
    await appendAudit({ actorUserId: PARTNER, actorRole: 'Engagement Partner', action: 'STATE_SET', scope: 'engagement', scopeId: AENG, key: 'aje', detail: 'v0->v1' });
    const target = await prisma.auditLog.findFirst({ where: { scopeId: AENG, key: 'aje' }, orderBy: { seq: 'desc' } });
    expect(target).toBeTruthy();
    const original = target!.detail;

    // Silently rewrite history (the attack the chain defends against).
    await prisma.auditLog.update({ where: { id: target!.id }, data: { detail: 'v0->v9 (forged)' } });
    const broken = await verifyAuditChain();
    expect(broken.ok).toBe(false);
    expect(broken.brokenAt).toBe(target!.seq); // caught at exactly the tampered row

    // Restore so the global chain (shared by other suites) stays valid.
    await prisma.auditLog.update({ where: { id: target!.id }, data: { detail: original } });
    expect((await verifyAuditChain()).ok).toBe(true);
  });

  it('re-hashing the tampered row does NOT repair the chain (next row prevHash mismatch)', async () => {
    // Two consecutive rows we control.
    await appendAudit({ actorUserId: PARTNER, actorRole: 'Engagement Partner', action: 'STATE_SET', scope: 'engagement', scopeId: AENG, key: 'k1', detail: 'a' });
    await appendAudit({ actorUserId: PARTNER, actorRole: 'Engagement Partner', action: 'STATE_SET', scope: 'engagement', scopeId: AENG, key: 'k2', detail: 'b' });
    const rowA = await prisma.auditLog.findFirst({ where: { scopeId: AENG, key: 'k1' }, orderBy: { seq: 'desc' } });
    const rowB = await prisma.auditLog.findFirst({ where: { scopeId: AENG, key: 'k2' }, orderBy: { seq: 'desc' } });
    const origDetail = rowA!.detail;
    const origHash = rowA!.hash;

    // A sophisticated attacker edits rowA AND recomputes its hash so rowA self-validates.
    const forgedDetail = 'TAMPERED';
    const forgedHash = __hashRow({
      seq: rowA!.seq, ts: rowA!.ts, actorUserId: rowA!.actorUserId, actorRole: rowA!.actorRole,
      action: rowA!.action, scope: rowA!.scope, scopeId: rowA!.scopeId, key: rowA!.key,
      detail: forgedDetail, prevHash: rowA!.prevHash,
    });
    await prisma.auditLog.update({ where: { id: rowA!.id }, data: { detail: forgedDetail, hash: forgedHash } });

    // rowA now hashes consistently — but rowB.prevHash still points at the OLD rowA.hash.
    const broken = await verifyAuditChain();
    expect(broken.ok).toBe(false);
    expect(broken.brokenAt).toBe(rowB!.seq); // the break surfaces at the *next* row

    // Restore.
    await prisma.auditLog.update({ where: { id: rowA!.id }, data: { detail: origDetail, hash: origHash } });
    expect((await verifyAuditChain()).ok).toBe(true);
  });
});

describe('audit chain — state.set hook & RBAC', () => {
  it('a real state.set appends a STATE_SET row for the acting user', async () => {
    const before = await prisma.auditLog.count({ where: { action: 'STATE_SET', scopeId: AENG, key: 'wpState' } });
    await callerAs('Junior Auditor', JR).state.set({ scope: 'engagement', scopeId: AENG, key: 'wpState', value: { ok: 1 }, baseVersion: 0 });
    const rows = await prisma.auditLog.findMany({ where: { action: 'STATE_SET', scopeId: AENG, key: 'wpState' }, orderBy: { seq: 'desc' } });
    expect(rows.length).toBe(before + 1);
    expect(rows[0].actorUserId).toBe(JR);
    expect(rows[0].actorRole).toBe('Junior Auditor');
    expect(rows[0].detail).toBe('v0->v1');
    // detail carries metadata only — never the written value.
    expect(rows[0].detail).not.toContain('ok');
  });

  it('audit.list / audit.verify require AUDIT_VIEW — Junior FORBIDDEN, Partner OK', async () => {
    await expect(callerAs('Junior Auditor', JR).audit.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(callerAs('Junior Auditor', JR).audit.verify()).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const list = await callerAs('Engagement Partner', PARTNER).audit.list({ limit: 5 });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeLessThanOrEqual(5);
    const v = await callerAs('Engagement Partner', PARTNER).audit.verify();
    expect(v.ok).toBe(true);
  });
});

describe('audit chain — concurrent appends stay monotonic & valid', () => {
  it('20 parallel appends produce a contiguous, valid extension', async () => {
    const before = await prisma.auditLog.count();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        appendAudit({ actorUserId: PARTNER, actorRole: 'Engagement Partner', action: 'STATE_SET', scope: 'firm', key: `c${i}`, detail: String(i) }),
      ),
    );
    const after = await prisma.auditLog.count();
    expect(after).toBe(before + 20); // queue serialized them — none dropped, none duplicated
    expect((await verifyAuditChain()).ok).toBe(true);
  });
});
