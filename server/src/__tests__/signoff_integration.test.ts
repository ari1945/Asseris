/* Fase 2 — bukti WIRING end-to-end: guard sign-off ditegakkan lewat jalur tRPC
   state.set NYATA (bukan hanya unit guard). Memakai Manager (punya ENGAGEMENT_VIEW_ALL
   → lolos isolasi engagement tanpa setup membership) yang DIBLOKIR guard pada slot
   Partner; Partner berhasil. Membuktikan state.set memanggil guard dgn prev yang benar. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';

const mk = (id: string, role: string) =>
  createCallerFactory(appRouter)({ user: { id, role } as unknown as User, token: 'test' });
const manager = mk('TEST-MGR', 'Audit Manager');
const partner = mk('TEST-PTR', 'Engagement Partner');

const SIG = { by: 'Tester', at: '2026-03-14' };
const scope = 'engagement' as const;
const scopeId = 'TEST-ENG-SIGNOFF';
const key = 'wpState';
const firmScopeId = 'FIRM-TEST-SIGNOFF';

describe('Fase 2 — guard sign-off ditegakkan via state.set (tRPC)', () => {
  beforeAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDoc.deleteMany({ where: { scope: 'firm', scopeId: firmScopeId, key: 'prospects' } });
  });
  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDoc.deleteMany({ where: { scope: 'firm', scopeId: firmScopeId, key: 'prospects' } });
    await prisma.$disconnect();
  });

  it('Manager BOLEH menulis tanda tangan reviewer (SIGNOFF_REVIEWER) — jalur sah', async () => {
    const r = await manager.state.set({ scope, scopeId, key, baseVersion: 0,
      value: { B: { chain: { preparer: SIG, reviewer: SIG } } } });
    expect(r.version).toBe(1);
  });

  it('Manager DITOLAK menambah slot Partner (butuh OPINION_APPROVE) — guard via tRPC', async () => {
    await expect(
      manager.state.set({ scope, scopeId, key, baseVersion: 1,
        value: { B: { chain: { preparer: SIG, reviewer: SIG, partner: SIG } } } }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'requires:opinion.approve' });
    // tulisan ditolak → versi tetap 1
    const got = await partner.state.get({ scope, scopeId, key });
    expect(got.version).toBe(1);
  });

  it('Partner BOLEH menambah slot Partner — jalur sah', async () => {
    const r = await partner.state.set({ scope, scopeId, key, baseVersion: 1,
      value: { B: { chain: { preparer: SIG, reviewer: SIG, partner: SIG } } } });
    expect(r.version).toBe(2);
  });

  // Q5 — akseptasi (firm prospects): intake = ENGAGEMENT_MANAGE (Manager boleh), tapi
  // PERSETUJUAN = FIRM_ADMIN (Partner-only). Diuji lewat jalur tRPC nyata.
  const fp = { scope: 'firm' as const, scopeId: firmScopeId, key: 'prospects' };
  const prospect = (approved: boolean) => [{ id: 'PR-1', acceptance: { approved }, letter: { status: 'draft' } }];

  it('Manager BOLEH intake prospek (akseptasi belum disetujui)', async () => {
    const r = await manager.state.set({ ...fp, baseVersion: 0, value: prospect(false) });
    expect(r.version).toBe(1);
  });

  it('Manager DITOLAK menyetujui akseptasi (butuh FIRM_ADMIN)', async () => {
    await expect(
      manager.state.set({ ...fp, baseVersion: 1, value: prospect(true) }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'requires:firm.admin' });
    const got = await partner.state.get(fp);
    expect(got.version).toBe(1);
  });

  it('Partner BOLEH menyetujui akseptasi', async () => {
    const r = await partner.state.set({ ...fp, baseVersion: 1, value: prospect(true) });
    expect(r.version).toBe(2);
  });
});
