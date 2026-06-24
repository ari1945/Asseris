import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';

// Inject a user of a given role directly into the context — authorization reads only
// ctx.user.{id,role}, so no DB row or real session is needed to exercise the gate.
function callerAs(role: string, id = `U-${role}`) {
  const user = { id, role } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}
const anon = createCallerFactory(appRouter)({ user: null, token: null });

const ENG = 'AUTHZ-ENG';
const FIRM = 'AUTHZ-FIRM';
const FIRM_ROW = 'AUTHZ-FIRM-ROW';
const CLI = 'AUTHZ-CLI';
// These suites exercise the W7 CAPABILITY gate. Under W7.5, engagement-scoped access ALSO
// requires membership, so give the non-oversight principals (Junior/Senior) membership of ENG —
// otherwise the engagement gate would mask the capability behaviour we mean to test.
const ENG_MEMBERS: Array<[string, string]> = [
  ['U-Junior Auditor', 'Junior Auditor'],
  ['U-Senior Auditor', 'Senior Auditor'],
];

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM_ROW, name: 'Authz Firm', short: 'AZ' } });
  await prisma.client.create({ data: { id: CLI, firmId: FIRM_ROW, name: 'Authz Client' } });
  await prisma.engagement.create({ data: { id: ENG, firmId: FIRM_ROW, clientId: CLI } });
  for (const [id, role] of ENG_MEMBERS) {
    await prisma.user.create({ data: { id, firmId: FIRM_ROW, name: id, role, dataJson: '{}' } });
    await prisma.engagementMember.create({ data: { engagementId: ENG, userId: id } });
  }
});

afterAll(async () => {
  await prisma.stateDoc.deleteMany({ where: { scopeId: { in: [ENG, FIRM, 'U-Junior Auditor', 'U-Audit Manager'] } } });
  await prisma.engagementMember.deleteMany({ where: { engagementId: ENG } });
  await prisma.engagement.deleteMany({ where: { id: ENG } });
  await prisma.client.deleteMany({ where: { id: CLI } });
  await prisma.user.deleteMany({ where: { id: { in: ENG_MEMBERS.map(([id]) => id) } } });
  await prisma.firm.deleteMany({ where: { id: FIRM_ROW } });
  await prisma.$disconnect();
});

describe('authentication gate (protectedProcedure)', () => {
  it('rejects anonymous reads and writes with UNAUTHORIZED', async () => {
    await expect(anon.state.get({ scope: 'engagement', scopeId: ENG, key: 'aje' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      anon.state.set({ scope: 'engagement', scopeId: ENG, key: 'aje', value: [], baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.engagement.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.bootstrap({ engagementId: ENG })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('lets any authenticated role read', async () => {
    const got = await callerAs('Junior Auditor').state.get({ scope: 'engagement', scopeId: ENG, key: 'aje' });
    expect(got.version).toBe(0); // missing doc, but the read is allowed
  });
});

describe('capability gate on writes (negative authz)', () => {
  it('Junior CANNOT write AJE (needs aje.edit) — FORBIDDEN', async () => {
    await expect(
      callerAs('Junior Auditor').state.set({ scope: 'engagement', scopeId: ENG, key: 'aje', value: [{ id: 'x' }], baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('Senior CAN write AJE', async () => {
    const r = await callerAs('Senior Auditor').state.set({ scope: 'engagement', scopeId: ENG, key: 'aje', value: [{ id: 'x' }], baseVersion: 0 });
    expect(r.version).toBe(1);
  });

  it('Junior CAN write working-paper state (wp.edit is granted to all roles)', async () => {
    const r = await callerAs('Junior Auditor').state.set({ scope: 'engagement', scopeId: ENG, key: 'wpState', value: { a: 1 }, baseVersion: 0 });
    expect(r.version).toBe(1);
  });

  it('Junior CANNOT manage the firm roster (clients) — FORBIDDEN', async () => {
    await expect(
      callerAs('Junior Auditor').state.set({ scope: 'firm', scopeId: FIRM, key: 'clients', value: [], baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('Manager CAN manage the firm roster (engagement.manage)', async () => {
    const r = await callerAs('Audit Manager').state.set({ scope: 'firm', scopeId: FIRM, key: 'engagements', value: [], baseVersion: 0 });
    expect(r.version).toBe(1);
  });

  it('Manager CANNOT change firm settings/RBAC (needs firm.admin) — FORBIDDEN', async () => {
    await expect(
      callerAs('Audit Manager').state.set({ scope: 'firm', scopeId: FIRM, key: 'rbacConfig', value: {}, baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('Manager CAN do prospect intake (prospects = engagement.manage)', async () => {
    const r = await callerAs('Audit Manager').state.set({ scope: 'firm', scopeId: FIRM, key: 'prospects', value: [], baseVersion: 0 });
    expect(r.version).toBe(1);
  });

  it('Senior CANNOT do prospect intake (no engagement.manage) — FORBIDDEN', async () => {
    await expect(
      callerAs('Senior Auditor').state.set({ scope: 'firm', scopeId: FIRM, key: 'prospects', value: [], baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('user-scope ownership', () => {
  it('a user CAN write their own user doc', async () => {
    const r = await callerAs('Junior Auditor', 'U-Junior Auditor').state.set({
      scope: 'user', scopeId: 'U-Junior Auditor', key: 'prefs', value: { theme: 'dark' }, baseVersion: 0,
    });
    expect(r.version).toBe(1);
  });

  it("a non-admin CANNOT write another user's doc — FORBIDDEN", async () => {
    await expect(
      callerAs('Junior Auditor', 'U-Junior Auditor').state.set({
        scope: 'user', scopeId: 'U-Audit Manager', key: 'prefs', value: {}, baseVersion: 0,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('a Partner (firm.admin) CAN write another user doc', async () => {
    const r = await callerAs('Engagement Partner', 'U-Partner').state.set({
      scope: 'user', scopeId: 'U-Audit Manager', key: 'prefs', value: { by: 'admin' }, baseVersion: 0,
    });
    expect(r.version).toBe(1);
  });
});
