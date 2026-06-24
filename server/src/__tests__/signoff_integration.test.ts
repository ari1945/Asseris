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

describe('Fase 2 — guard sign-off ditegakkan via state.set (tRPC)', () => {
  beforeAll(async () => { await prisma.stateDoc.deleteMany({ where: { scope, scopeId } }); });
  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
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
});
