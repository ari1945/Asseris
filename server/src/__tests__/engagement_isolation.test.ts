import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { accessibleEngagementIds, isEngagementMember } from '../engagementAccess';

// callerAs injects ctx.user; the engagement gate then looks membership up in the DB by id,
// so the membership rows below MUST use the same ids the callers use.
function callerAs(role: string, id: string) {
  const user = { id, role } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}
const anon = createCallerFactory(appRouter)({ user: null, token: null });

const FIRM = 'ISO-FIRM';
const CLI = 'ISO-CLI';
const ENG_A = 'ISO-ENG-A'; // Junior is a member
const ENG_B = 'ISO-ENG-B'; // Junior is NOT a member
const JR = 'ISO-jr'; // Junior Auditor, member of ENG_A only (needs a User row for the FK)
const MGR = 'ISO-mgr'; // Audit Manager — oversight (ENGAGEMENT_VIEW_ALL), no membership needed

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Iso Firm', short: 'ISO' } });
  await prisma.client.create({ data: { id: CLI, firmId: FIRM, name: 'Iso Client' } });
  await prisma.engagement.create({ data: { id: ENG_A, firmId: FIRM, clientId: CLI } });
  await prisma.engagement.create({ data: { id: ENG_B, firmId: FIRM, clientId: CLI } });
  await prisma.user.create({ data: { id: JR, firmId: FIRM, name: 'Iso Junior', role: 'Junior Auditor', dataJson: '{}' } });
  await prisma.engagementMember.create({ data: { engagementId: ENG_A, userId: JR } });
});

afterAll(async () => {
  await prisma.engagementMember.deleteMany({ where: { engagementId: { in: [ENG_A, ENG_B] } } });
  await prisma.stateDoc.deleteMany({ where: { scopeId: { in: [ENG_A, ENG_B, JR] } } });
  await prisma.engagement.deleteMany({ where: { id: { in: [ENG_A, ENG_B] } } });
  await prisma.user.deleteMany({ where: { id: JR } });
  await prisma.client.deleteMany({ where: { id: CLI } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  await prisma.$disconnect();
});

describe('access helpers', () => {
  it('isEngagementMember reflects the membership rows', async () => {
    expect(await isEngagementMember(JR, ENG_A)).toBe(true);
    expect(await isEngagementMember(JR, ENG_B)).toBe(false);
  });
  it('accessibleEngagementIds: list for a member, "all" for oversight', async () => {
    expect(await accessibleEngagementIds({ id: JR, role: 'Junior Auditor' })).toEqual([ENG_A]);
    expect(await accessibleEngagementIds({ id: MGR, role: 'Audit Manager' })).toBe('all');
  });
});

describe('state read isolation (engagement scope)', () => {
  it('member CAN read their engagement', async () => {
    const r = await callerAs('Junior Auditor', JR).state.get({ scope: 'engagement', scopeId: ENG_A, key: 'wpState' });
    expect(r.version).toBe(0); // missing doc, but the read is allowed
  });
  it('non-member CANNOT read another engagement — FORBIDDEN', async () => {
    await expect(
      callerAs('Junior Auditor', JR).state.get({ scope: 'engagement', scopeId: ENG_B, key: 'wpState' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('oversight role reads ANY engagement without membership', async () => {
    const r = await callerAs('Audit Manager', MGR).state.get({ scope: 'engagement', scopeId: ENG_B, key: 'aje' });
    expect(r.version).toBe(0);
  });
});

describe('state write isolation (engagement scope)', () => {
  it('member CAN write their engagement (wp.edit granted to all roles)', async () => {
    const r = await callerAs('Junior Auditor', JR).state.set({ scope: 'engagement', scopeId: ENG_A, key: 'wpState', value: { a: 1 }, baseVersion: 0 });
    expect(r.version).toBe(1);
  });
  it('non-member CANNOT write another engagement — FORBIDDEN', async () => {
    await expect(
      callerAs('Junior Auditor', JR).state.set({ scope: 'engagement', scopeId: ENG_B, key: 'wpState', value: { a: 1 }, baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('engagement isolation is checked BEFORE the capability gate (non-member, no cap → still FORBIDDEN, not a cap error leak)', async () => {
    // Junior also lacks aje.edit; the point is the engagement gate fires regardless.
    await expect(
      callerAs('Junior Auditor', JR).state.set({ scope: 'engagement', scopeId: ENG_B, key: 'aje', value: [], baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('bootstrap isolation', () => {
  it('non-member → FORBIDDEN', async () => {
    await expect(callerAs('Junior Auditor', JR).bootstrap({ engagementId: ENG_B })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('member → resolves', async () => {
    const b = await callerAs('Junior Auditor', JR).bootstrap({ engagementId: ENG_A });
    expect(b).toHaveProperty('wtb');
  });
  it('oversight → resolves for any engagement', async () => {
    const b = await callerAs('Audit Manager', MGR).bootstrap({ engagementId: ENG_B });
    expect(b).toHaveProperty('wtb');
  });
  it('anonymous → UNAUTHORIZED', async () => {
    await expect(anon.bootstrap({ engagementId: ENG_A })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('engagement.list filtering', () => {
  it('a member sees only their engagements', async () => {
    const list = await callerAs('Junior Auditor', JR).engagement.list();
    expect(list.map((e) => e.id).sort()).toEqual([ENG_A]);
  });
  it('an oversight role sees all (incl. both test engagements)', async () => {
    const ids = (await callerAs('Audit Manager', MGR).engagement.list()).map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining([ENG_A, ENG_B]));
  });
});

describe('non-engagement scopes are unaffected', () => {
  it('user-scope write is NOT subject to the engagement gate', async () => {
    const r = await callerAs('Junior Auditor', JR).state.set({ scope: 'user', scopeId: JR, key: 'prefs', value: { theme: 'dark' }, baseVersion: 0 });
    expect(r.version).toBe(1);
  });
});
