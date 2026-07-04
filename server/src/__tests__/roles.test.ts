import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { refreshRoleCache, __resetRoleCacheForTests } from '../roleStore';

/* RBAC admin console (PRD docs/prd-rbac-admin-console.md) — the roles.* tRPC endpoints. Unlike
   authz.test.ts (which relies on roleStore's never-hydrated STATIC fallback to exercise can()
   without touching the DB), these tests exercise the real DB-backed path end to end: create real
   Role rows, call refreshRoleCache(), then assert list/create/updateGrants/delete behave — including
   the FIRM_ADMIN-retention guardrail (PRD §3 success criterion 4) and the delete guards (§3.5). */

const FIRM = 'ROLES-TEST-FIRM';

function callerAs(role: string, id = `U-${role}`) {
  const user = { id, role, firmId: FIRM } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}
const partner = () => callerAs('Engagement Partner');
const junior = () => callerAs('Junior Auditor');

let partnerRoleId: string;
let seniorRoleId: string;

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Roles Test Firm', short: 'RTF' } });
  const p = await prisma.role.create({
    data: { firmId: FIRM, name: 'Engagement Partner', capsJson: JSON.stringify(['firm.admin']), isBuiltIn: true },
  });
  const s = await prisma.role.create({
    data: { firmId: FIRM, name: 'Senior Auditor', capsJson: JSON.stringify(['wp.edit']), isBuiltIn: true },
  });
  partnerRoleId = p.id;
  seniorRoleId = s.id;
  await refreshRoleCache();
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { firmId: FIRM } });
  await prisma.role.deleteMany({ where: { firmId: FIRM } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  // Defensive: don't let this file's DB-backed cache leak into a later file even if vitest's
  // per-file module isolation is ever disabled — see file header comment.
  __resetRoleCacheForTests();
  await prisma.$disconnect();
});

describe('roles.* — FIRM_ADMIN-only gate', () => {
  it('non-admin (Junior Auditor) is FORBIDDEN from all 4 endpoints', async () => {
    await expect(junior().roles.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(junior().roles.create({ name: 'X', caps: [] })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(junior().roles.updateGrants({ roleId: seniorRoleId, caps: [] })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(junior().roles.delete({ roleId: seniorRoleId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('roles.list', () => {
  it('Partner sees both seeded roles with their capabilities', async () => {
    const rows = await partner().roles.list();
    const names = rows.map((r) => r.name);
    expect(names).toContain('Engagement Partner');
    expect(names).toContain('Senior Auditor');
    const p = rows.find((r) => r.id === partnerRoleId)!;
    expect(p.caps).toEqual(['firm.admin']);
    expect(p.isBuiltIn).toBe(true);
  });
});

describe('roles.create', () => {
  it('creates a new role with ZERO capabilities by default (deny-by-default for new roles)', async () => {
    const r = await partner().roles.create({ name: 'Tax Consultant Internal', caps: [] });
    expect(r.caps).toEqual([]);
    expect(r.isBuiltIn).toBe(false);
    const rows = await partner().roles.list();
    expect(rows.find((x) => x.id === r.id)?.userCount).toBe(0);
  });

  it('rejects a duplicate role name in the same firm — CONFLICT', async () => {
    await expect(partner().roles.create({ name: 'Senior Auditor', caps: [] })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects an unknown capability string — BAD_REQUEST', async () => {
    await expect(partner().roles.create({ name: 'Bogus', caps: ['not.a.real.cap'] })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('a freshly created role has NO engagement access by default (no ENGAGEMENT_VIEW_ALL, not an EngagementMember)', async () => {
    const r = await partner().roles.create({ name: 'IT Support', caps: [] });
    // can() reads the DB-backed cache after refreshRoleCache() ran inside roles.create.
    const { can, CAP } = await import('../rbac');
    expect(can(r.name, CAP.ENGAGEMENT_VIEW_ALL)).toBe(false);
  });
});

describe('roles.updateGrants', () => {
  it('Partner can change a role\'s capability set; effective immediately via the cache', async () => {
    const updated = await partner().roles.updateGrants({ roleId: seniorRoleId, caps: ['wp.edit', 'aje.edit'] });
    expect(updated.caps).toEqual(['wp.edit', 'aje.edit']);
    const { can, CAP } = await import('../rbac');
    expect(can('Senior Auditor', CAP.AJE_EDIT)).toBe(true);
  });

  it('rejects an unknown capability — BAD_REQUEST', async () => {
    await expect(partner().roles.updateGrants({ roleId: seniorRoleId, caps: ['bogus.cap'] })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('GUARDRAIL: rejects stripping FIRM_ADMIN from the only role that holds it — self-lockout prevention', async () => {
    // At this point Partner (partnerRoleId) is the ONLY role in this firm holding firm.admin.
    await expect(partner().roles.updateGrants({ roleId: partnerRoleId, caps: [] })).rejects.toMatchObject({ code: 'BAD_REQUEST', message: expect.stringContaining('lockout') });
    // Unaffected — the rejected write must not have partially applied.
    const rows = await partner().roles.list();
    expect(rows.find((r) => r.id === partnerRoleId)?.caps).toEqual(['firm.admin']);
  });

  it('allows stripping FIRM_ADMIN once a SECOND role also holds it', async () => {
    const backupAdmin = () => callerAs('Backup Admin');
    const second = await partner().roles.create({ name: 'Backup Admin', caps: ['firm.admin'] });
    const updated = await partner().roles.updateGrants({ roleId: partnerRoleId, caps: [] });
    expect(updated.caps).toEqual([]);
    // The 'Engagement Partner' role itself has zero caps now — a caller authenticated AS that
    // role can no longer act as FIRM_ADMIN (this is the security model working correctly, not a
    // bug). Restore using the OTHER role that still holds firm.admin.
    await backupAdmin().roles.updateGrants({ roleId: partnerRoleId, caps: ['firm.admin'] });
    await backupAdmin().roles.delete({ roleId: second.id });
  });
});

describe('roles.delete', () => {
  it('rejects deleting a built-in role — BAD_REQUEST', async () => {
    await expect(partner().roles.delete({ roleId: seniorRoleId })).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'cannot-delete-builtin-role' });
  });

  it('rejects deleting a custom role that is still assigned to a user', async () => {
    const r = await partner().roles.create({ name: 'Assigned Role', caps: [] });
    await prisma.user.create({ data: { id: 'ROLES-TEST-USER-1', firmId: FIRM, name: 'Test User', role: r.name, dataJson: '{}' } });
    await expect(partner().roles.delete({ roleId: r.id })).rejects.toMatchObject({ code: 'BAD_REQUEST', message: expect.stringContaining('role-in-use') });
  });

  it('deletes an unassigned custom role successfully', async () => {
    const r = await partner().roles.create({ name: 'Unassigned Role', caps: [] });
    const res = await partner().roles.delete({ roleId: r.id });
    expect(res.ok).toBe(true);
    const rows = await partner().roles.list();
    expect(rows.find((x) => x.id === r.id)).toBeUndefined();
  });

  it('GUARDRAIL: rejects deleting the only (even if unused) role that holds FIRM_ADMIN', async () => {
    // Move FIRM_ADMIN off the built-in Partner role onto a fresh, unassigned custom role. Once
    // that happens, a caller authenticated AS 'Engagement Partner' has no FIRM_ADMIN of its own
    // any more — so the guardrail check itself must be exercised via a caller authenticated as
    // the role that actually still holds it (the realistic scenario: an admin using their own,
    // now-only, admin account tries to delete that very role).
    const soleAdmin = () => callerAs('Sole Admin Holder');
    const sole = await partner().roles.create({ name: 'Sole Admin Holder', caps: ['firm.admin'] });
    await partner().roles.updateGrants({ roleId: partnerRoleId, caps: [] });
    await expect(soleAdmin().roles.delete({ roleId: sole.id })).rejects.toMatchObject({ code: 'BAD_REQUEST', message: expect.stringContaining('lockout') });
    // Restore.
    await soleAdmin().roles.updateGrants({ roleId: partnerRoleId, caps: ['firm.admin'] });
    await soleAdmin().roles.delete({ roleId: sole.id });
  });
});

describe('audit trail', () => {
  it('roles.create / updateGrants / delete each append an audit row', async () => {
    const r = await partner().roles.create({ name: 'Audited Role', caps: ['wp.edit'] });
    const created = await prisma.auditLog.findFirst({ where: { action: 'ROLE_CREATE', key: 'Audited Role' }, orderBy: { seq: 'desc' } });
    expect(created).toBeTruthy();

    await partner().roles.updateGrants({ roleId: r.id, caps: [] });
    const updated = await prisma.auditLog.findFirst({ where: { action: 'ROLE_UPDATE_GRANTS', key: 'Audited Role' }, orderBy: { seq: 'desc' } });
    expect(updated).toBeTruthy();

    await partner().roles.delete({ roleId: r.id });
    const deleted = await prisma.auditLog.findFirst({ where: { action: 'ROLE_DELETE', key: 'Audited Role' }, orderBy: { seq: 'desc' } });
    expect(deleted).toBeTruthy();
  });
});
