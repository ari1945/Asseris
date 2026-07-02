import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';

// W7 Fase 1 — state.* now require a session. Inject a Partner (all capabilities) so this
// suite tests compare-and-swap, not authorization (that is authz.test.ts).
const partner = { id: 'TEST-PARTNER', role: 'Engagement Partner' } as unknown as User;
const caller = createCallerFactory(appRouter)({ user: partner, token: 'test' });

describe('StateDoc optimistic-concurrency (compare-and-swap)', () => {
  const scope = 'engagement' as const;
  const scopeId = 'TEST-ENG';
  const key = 'cas-probe';

  beforeAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
  });
  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.$disconnect();
  });

  it('creates a fresh doc at version 1 (baseVersion 0)', async () => {
    const r = await caller.state.set({ scope, scopeId, key, value: { a: 1 }, baseVersion: 0 });
    expect(r.version).toBe(1);
    const got = await caller.state.get({ scope, scopeId, key });
    expect(got).toEqual({ value: { a: 1 }, version: 1 });
  });

  it('updates with the current version (1 → 2)', async () => {
    const r = await caller.state.set({ scope, scopeId, key, value: { a: 2 }, baseVersion: 1 });
    expect(r.version).toBe(2);
    const got = await caller.state.get({ scope, scopeId, key });
    expect(got.value).toEqual({ a: 2 });
    expect(got.version).toBe(2);
  });

  it('rejects a stale write (baseVersion 1 when server is 2) with CONFLICT, value unchanged', async () => {
    await expect(
      caller.state.set({ scope, scopeId, key, value: { a: 99 }, baseVersion: 1 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const got = await caller.state.get({ scope, scopeId, key });
    expect(got.value).toEqual({ a: 2 });
    expect(got.version).toBe(2);
  });

  it('rejects creating over an existing doc (baseVersion 0) with CONFLICT', async () => {
    await expect(
      caller.state.set({ scope, scopeId, key, value: { a: 0 }, baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('serializes concurrent writes — exactly one of two racing writers wins', async () => {
    // Both read version 2 and try to advance to 3; CAS must let exactly one through.
    const results = await Promise.allSettled([
      caller.state.set({ scope, scopeId, key, value: { a: 'A' }, baseVersion: 2 }),
      caller.state.set({ scope, scopeId, key, value: { a: 'B' }, baseVersion: 2 }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const conflict = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(conflict).toHaveLength(1);
    const got = await caller.state.get({ scope, scopeId, key });
    expect(got.version).toBe(3);
  });

  it('get on a missing key returns version 0 / null', async () => {
    const got = await caller.state.get({ scope, scopeId, key: 'does-not-exist' });
    expect(got).toEqual({ value: null, version: 0 });
  });
});

// K7 — every successful state.set write must leave a matching StateDocHistory row (create AND
// CAS paths), independent of and never drifting from what StateDoc itself holds.
describe('StateDoc version history (K7)', () => {
  const scope = 'engagement' as const;
  const scopeId = 'TEST-ENG-HIST';
  const key = 'hist-probe';

  beforeAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDocHistory.deleteMany({ where: { scope, scopeId } });
  });
  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDocHistory.deleteMany({ where: { scope, scopeId } });
    await prisma.$disconnect();
  });

  it('the create path (baseVersion 0) writes a version-1 history row', async () => {
    await caller.state.set({ scope, scopeId, key, value: { a: 1 }, baseVersion: 0 });
    const rows = await prisma.stateDocHistory.findMany({ where: { scope, scopeId, key }, orderBy: { version: 'asc' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].version).toBe(1);
    expect(JSON.parse(rows[0].valueJson)).toEqual({ a: 1 });
    expect(rows[0].updatedBy).toBe('TEST-PARTNER');
  });

  it('the CAS path (baseVersion > 0) appends a new history row per successful write, never overwriting prior ones', async () => {
    await caller.state.set({ scope, scopeId, key, value: { a: 2 }, baseVersion: 1 });
    await caller.state.set({ scope, scopeId, key, value: { a: 3 }, baseVersion: 2 });
    const rows = await prisma.stateDocHistory.findMany({ where: { scope, scopeId, key }, orderBy: { version: 'asc' } });
    expect(rows.map((r) => r.version)).toEqual([1, 2, 3]);
    expect(rows.map((r) => JSON.parse(r.valueJson))).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it('a lost CAS race writes NO history row (history stays exactly in sync with StateDoc)', async () => {
    const before = await prisma.stateDocHistory.count({ where: { scope, scopeId, key } });
    await expect(caller.state.set({ scope, scopeId, key, value: { a: 99 }, baseVersion: 1 })).rejects.toMatchObject({ code: 'CONFLICT' });
    const after = await prisma.stateDocHistory.count({ where: { scope, scopeId, key } });
    expect(after).toBe(before); // conflict must not leave a stray history row
  });
});

// K7 — SA 230 ¶A21 assembly-lock: once an engagement is archived, engagement-scoped writes are
// blocked ASSEMBLY_LOCK_DAYS after archivedAt unless the actor holds PHASE_OVERRIDE (Partner).
describe('assembly-lock (K7)', () => {
  const AFIRM = 'LOCK-FIRM';
  const ACLI = 'LOCK-CLI';
  const AENG = 'LOCK-ENG';
  const PARTNER_ID = 'LOCK-partner';
  const MGR_ID = 'LOCK-manager';
  const SIXTY_ONE_DAYS_MS = 61 * 86400000;

  beforeAll(async () => {
    await prisma.firm.create({ data: { id: AFIRM, name: 'Lock Firm', short: 'LK' } });
    await prisma.client.create({ data: { id: ACLI, firmId: AFIRM, name: 'Lock Client' } });
    await prisma.engagement.create({
      data: { id: AENG, firmId: AFIRM, clientId: ACLI, archivedAt: new Date(Date.now() - SIXTY_ONE_DAYS_MS) },
    });
    await prisma.user.create({ data: { id: PARTNER_ID, firmId: AFIRM, name: 'Lock Partner', role: 'Engagement Partner', dataJson: '{}' } });
    await prisma.user.create({ data: { id: MGR_ID, firmId: AFIRM, name: 'Lock Manager', role: 'Audit Manager', dataJson: '{}' } });
    await prisma.engagementMember.create({ data: { engagementId: AENG, userId: MGR_ID } });
  });
  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scopeId: AENG } });
    await prisma.stateDocHistory.deleteMany({ where: { scopeId: AENG } });
    await prisma.engagementMember.deleteMany({ where: { engagementId: AENG } });
    await prisma.engagement.deleteMany({ where: { id: AENG } });
    await prisma.user.deleteMany({ where: { id: { in: [PARTNER_ID, MGR_ID] } } });
    await prisma.client.deleteMany({ where: { id: ACLI } });
    await prisma.firm.deleteMany({ where: { id: AFIRM } });
    await prisma.$disconnect();
  });

  it('a Manager (no PHASE_OVERRIDE) is FORBIDDEN from writing past the 60-day lock', async () => {
    const mgr = createCallerFactory(appRouter)({ user: { id: MGR_ID, role: 'Audit Manager' } as unknown as User, token: 'test' });
    await expect(
      mgr.state.set({ scope: 'engagement', scopeId: AENG, key: 'wtbImport', value: { x: 1 }, baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('a Partner (PHASE_OVERRIDE) can still write past the lock, tagged distinctly in the audit detail', async () => {
    const p = createCallerFactory(appRouter)({ user: { id: PARTNER_ID, role: 'Engagement Partner' } as unknown as User, token: 'test' });
    const r = await p.state.set({ scope: 'engagement', scopeId: AENG, key: 'wtbImport', value: { x: 1 }, baseVersion: 0 });
    expect(r.version).toBe(1);
    const row = await prisma.auditLog.findFirst({ where: { action: 'STATE_SET', scopeId: AENG, key: 'wtbImport' }, orderBy: { seq: 'desc' } });
    expect(row?.detail).toContain('OVERRIDE[assembly-lock]');
  });

  it('an engagement archived WITHIN the 60-day window does not lock writes', async () => {
    const RECENT_ENG = 'LOCK-ENG-RECENT';
    await prisma.engagement.create({ data: { id: RECENT_ENG, firmId: AFIRM, clientId: ACLI, archivedAt: new Date() } });
    await prisma.engagementMember.create({ data: { engagementId: RECENT_ENG, userId: MGR_ID } });
    const mgr = createCallerFactory(appRouter)({ user: { id: MGR_ID, role: 'Audit Manager' } as unknown as User, token: 'test' });
    const r = await mgr.state.set({ scope: 'engagement', scopeId: RECENT_ENG, key: 'wtbImport', value: { x: 1 }, baseVersion: 0 });
    expect(r.version).toBe(1);
    await prisma.stateDoc.deleteMany({ where: { scopeId: RECENT_ENG } });
    await prisma.stateDocHistory.deleteMany({ where: { scopeId: RECENT_ENG } });
    await prisma.engagementMember.deleteMany({ where: { engagementId: RECENT_ENG } });
    await prisma.engagement.deleteMany({ where: { id: RECENT_ENG } });
  });
});

describe('engagement.archive (K7)', () => {
  const AFIRM = 'ARC-FIRM';
  const ACLI = 'ARC-CLI';
  const AENG = 'ARC-ENG';
  const PARTNER_ID = 'ARC-partner';
  const MGR_ID = 'ARC-manager';

  beforeAll(async () => {
    await prisma.firm.create({ data: { id: AFIRM, name: 'Archive Firm', short: 'ARC' } });
    await prisma.client.create({ data: { id: ACLI, firmId: AFIRM, name: 'Archive Client' } });
    await prisma.engagement.create({ data: { id: AENG, firmId: AFIRM, clientId: ACLI } });
    await prisma.user.create({ data: { id: PARTNER_ID, firmId: AFIRM, name: 'Arc Partner', role: 'Engagement Partner', dataJson: '{}' } });
    await prisma.user.create({ data: { id: MGR_ID, firmId: AFIRM, name: 'Arc Manager', role: 'Audit Manager', dataJson: '{}' } });
    await prisma.engagementMember.create({ data: { engagementId: AENG, userId: MGR_ID } });
  });
  afterAll(async () => {
    await prisma.engagementMember.deleteMany({ where: { engagementId: AENG } });
    await prisma.engagement.deleteMany({ where: { id: AENG } });
    await prisma.user.deleteMany({ where: { id: { in: [PARTNER_ID, MGR_ID] } } });
    await prisma.client.deleteMany({ where: { id: ACLI } });
    await prisma.firm.deleteMany({ where: { id: AFIRM } });
    await prisma.$disconnect();
  });

  it('a Manager (no FIRM_ADMIN) cannot archive', async () => {
    const mgr = createCallerFactory(appRouter)({ user: { id: MGR_ID, role: 'Audit Manager' } as unknown as User, token: 'test' });
    await expect(mgr.engagement.archive({ engagementId: AENG })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('a Partner (FIRM_ADMIN) can archive; archivedAt is set and an ARCHIVE row is audited', async () => {
    const p = createCallerFactory(appRouter)({ user: { id: PARTNER_ID, role: 'Engagement Partner' } as unknown as User, token: 'test' });
    const before = await prisma.auditLog.count({ where: { action: 'ARCHIVE', scopeId: AENG } });
    const r = await p.engagement.archive({ engagementId: AENG });
    expect(r.archivedAt).toBeInstanceOf(Date);
    const eng = await prisma.engagement.findUnique({ where: { id: AENG } });
    expect(eng?.archivedAt).toBeTruthy();
    expect(eng?.phase).toBe('Arsip');
    const after = await prisma.auditLog.count({ where: { action: 'ARCHIVE', scopeId: AENG } });
    expect(after).toBe(before + 1);
  });
});
