import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../db';
import { roleCan, roleCaps, cachedRoleNames, refreshRoleCache, __resetRoleCacheForTests } from '../roleStore';

/* RBAC admin console (PRD docs/prd-rbac-admin-console.md) — unit coverage for the cache module
   itself, isolated from the tRPC layer (see roles.test.ts for the endpoint-level tests). The
   never-hydrated fallback is what keeps the other ~230 pre-existing server tests passing unchanged
   (PRD §3 success criterion 7) — this pins that contract directly. */

const FIRM = 'ROLESTORE-TEST-FIRM';

afterAll(async () => {
  await prisma.role.deleteMany({ where: { firmId: FIRM } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  __resetRoleCacheForTests();
  await prisma.$disconnect();
});

describe('roleStore — never-hydrated fallback (cache === null)', () => {
  it('falls back to the static GRANTS map for known roles', () => {
    expect(roleCan('Engagement Partner', 'firm.admin')).toBe(true);
    expect(roleCan('Junior Auditor', 'aje.edit')).toBe(false); // static GRANTS denies this
    expect(roleCan('Junior Auditor', 'wp.edit')).toBe(true);
  });

  it('denies unknown role/capability by default', () => {
    expect(roleCan('Nonexistent Role', 'firm.admin')).toBe(false);
    expect(roleCan('Engagement Partner', 'not.a.real.cap')).toBe(false);
  });

  it('cachedRoleNames() returns the static catalog keys', () => {
    expect(cachedRoleNames()).toContain('Engagement Partner');
  });
});

describe('roleStore — DB-backed cache (after refreshRoleCache)', () => {
  it('an explicit empty capsJson DENIES everything, even for a role the static map would grant', async () => {
    await prisma.firm.create({ data: { id: FIRM, name: 'RoleStore Test Firm', short: 'RST' } });
    // 'Engagement Partner' would be granted firm.admin by the static fallback — but once a DB row
    // exists for it (even with zero caps), the DB wins completely. This is the behavior the PRD
    // relies on for "an admin explicitly revoked everything from this role" to actually take effect.
    await prisma.role.create({ data: { firmId: FIRM, name: 'Engagement Partner', capsJson: '[]', isBuiltIn: true } });
    await refreshRoleCache();
    expect(roleCan('Engagement Partner', 'firm.admin')).toBe(false);
    expect(roleCaps('Engagement Partner')).toEqual([]);
  });

  it('reflects a custom role and its exact granted set', async () => {
    await prisma.role.create({ data: { firmId: FIRM, name: 'Custom Role X', capsJson: JSON.stringify(['export.use']), isBuiltIn: false } });
    await refreshRoleCache();
    expect(roleCan('Custom Role X', 'export.use')).toBe(true);
    expect(roleCan('Custom Role X', 'firm.admin')).toBe(false);
    expect(cachedRoleNames()).toContain('Custom Role X');
  });

  it('a role with NO DB row after hydration is unknown → denied (does NOT fall back to static once hydrated)', async () => {
    // 'Senior Auditor' was never inserted into this test's Role table, but the cache IS hydrated
    // (non-null) — so it must be treated as unknown, not silently rescued by the static map.
    expect(roleCan('Senior Auditor', 'wp.edit')).toBe(false);
  });
});
