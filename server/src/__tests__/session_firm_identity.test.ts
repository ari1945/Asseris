/* ============================================================
   Sesi memberi tahu firmanya — PRD docs/prd-identitas-firma-sesi.md PR-A (A2, A3 sisi server)

   Dua cacat yang membuat frontend firma NON-demo mustahil benar, apa pun yang
   diperbaiki di sisi klien:

   A2 — frontend tak punya cara mengetahui `firmId` sesinya. `publicUser`
        (router.ts) tak memuatnya, dan bundel `bootstrap` memilih firm TANPA `id`.
        Akibatnya `FIRM_SCOPE_ID = 'FIRM-WHR'` dipaku di klien (persist_scope.ts:22).

   A3 — `bootstrap` mewajibkan `engagementId` lalu `assertEngagementAccess`. Firma
        yang BELUM punya perikatan (setiap firma segar hasil `npm run bootstrap`)
        tak bisa memuat bundel tingkat-firmanya sama sekali — klien lalu jatuh
        ke data demo (P0-4).

   Yang DIPERTAHANKAN (uji lama tetap hijau): bundel dengan `engagementId` tetap
   menuntut akses ke perikatan itu (engagement_isolation, stage1_data_isolation),
   dan pengguna tanpa firma tetap gagal-tertutup (`firm-unresolved`).
   ============================================================ */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { contextForToken } from '../context';
import { prisma } from '../db';
import { hashPassword } from '../auth/password';

const FRESH = 'SFI-FIRM-FRESH'; // firma segar: nol klien, nol perikatan
const BUSY = 'SFI-FIRM-BUSY'; // firma dengan perikatan, untuk membuktikan wtb/states tak bocor
const FRESH_ADMIN = 'SFI-FRESH-ADMIN';
const BUSY_PARTNER = 'SFI-BUSY-PARTNER';
const BUSY_JUNIOR = 'SFI-BUSY-JUNIOR';
const BUSY_CLIENT = 'SFI-BUSY-CLIENT';
const BUSY_ENG = 'SFI-BUSY-ENG';
const PASSWORD = 'Sesi#Firma-2026!';

function callerAs(id: string, firmId: string, role: string) {
  return createCallerFactory(appRouter)({ user: { id, firmId, role } as User, token: 'sfi-test' });
}

async function loginToken(email: string): Promise<string> {
  let token = '';
  const caller = createCallerFactory(appRouter)({
    user: null, token: null,
    setCookie(cookie: string) {
      const m = /ams_session=([^;]+)/.exec(cookie);
      if (m) token = decodeURIComponent(m[1]);
    },
  });
  await caller.auth.login({ email, password: PASSWORD });
  if (!token) throw new Error('login tidak menerbitkan cookie sesi');
  return token;
}

beforeAll(async () => {
  await prisma.firm.createMany({
    data: [
      { id: FRESH, name: 'Firma Segar Uji', short: 'SFU' },
      { id: BUSY, name: 'Firma Sibuk Uji', short: 'SBU' },
    ],
  });
  const hash = await hashPassword(PASSWORD);
  await prisma.user.createMany({
    data: [
      { id: FRESH_ADMIN, firmId: FRESH, name: 'Admin Segar', role: 'Engagement Partner', email: 'sfi-fresh@test.local', dataJson: '{}', passwordHash: hash },
      { id: BUSY_PARTNER, firmId: BUSY, name: 'Partner Sibuk', role: 'Engagement Partner', email: 'sfi-busy-p@test.local', dataJson: '{}' },
      { id: BUSY_JUNIOR, firmId: BUSY, name: 'Junior Sibuk', role: 'Junior Auditor', email: 'sfi-busy-j@test.local', dataJson: '{}' },
    ],
  });
  await prisma.client.create({ data: { id: BUSY_CLIENT, firmId: BUSY, name: 'Klien Sibuk' } });
  await prisma.engagement.create({ data: { id: BUSY_ENG, firmId: BUSY, clientId: BUSY_CLIENT } });
  await prisma.wtbRow.create({
    data: { engagementId: BUSY_ENG, ord: 1, group: 'Aset', code: '1-100', name: 'Kas', ly: 1, unadj: 1, aje: 0, lead: 'A' },
  });
  await prisma.stateDoc.create({
    data: { scope: 'engagement', scopeId: BUSY_ENG, key: 'wpState', valueJson: '{}', version: 1, updatedBy: BUSY_PARTNER },
  });
});

afterAll(async () => {
  const users = [FRESH_ADMIN, BUSY_PARTNER, BUSY_JUNIOR];
  await prisma.authEvent.deleteMany({ where: { userId: { in: users } } });
  await prisma.session.deleteMany({ where: { userId: { in: users } } });
  await prisma.stateDoc.deleteMany({ where: { scopeId: BUSY_ENG } });
  await prisma.wtbRow.deleteMany({ where: { engagementId: BUSY_ENG } });
  await prisma.engagement.deleteMany({ where: { firmId: { in: [FRESH, BUSY] } } });
  await prisma.client.deleteMany({ where: { firmId: { in: [FRESH, BUSY] } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.firm.deleteMany({ where: { id: { in: [FRESH, BUSY] } } });
  await prisma.$disconnect();
});

describe('A2 — sesi memuat firmId', () => {
  it('auth.login dan auth.me (jalur cookie nyata) mengembalikan firmId pengguna', async () => {
    const token = await loginToken('sfi-fresh@test.local');
    const me = await createCallerFactory(appRouter)(await contextForToken(token)).auth.me();
    expect(me?.id).toBe(FRESH_ADMIN);
    expect(me?.firmId).toBe(FRESH);
  });

  it('bundel bootstrap memuat firm.id = firma pemanggil', async () => {
    const b = await callerAs(BUSY_PARTNER, BUSY, 'Engagement Partner').bootstrap({ engagementId: BUSY_ENG });
    expect(b.firm?.id).toBe(BUSY);
  });
});

describe('A3 — bootstrap tanpa engagementId (firma tanpa perikatan aktif)', () => {
  it('firma segar: bundel tingkat-firma datang KOSONG, bukan galat', async () => {
    const b = await callerAs(FRESH_ADMIN, FRESH, 'Engagement Partner').bootstrap({});
    expect(b.firm?.id).toBe(FRESH);
    expect(b.firm?.name).toBe('Firma Segar Uji');
    expect(b.clients).toEqual([]);
    expect(b.engagements).toEqual([]);
    expect(b.wtb).toEqual([]);
    expect(b.states).toEqual([]);
    expect(b.users.map((u) => u.id)).toEqual([FRESH_ADMIN]);
  });

  it('tanpa engagementId, wtb & states perikatan TIDAK dikirim walau firmanya punya perikatan', async () => {
    const b = await callerAs(BUSY_PARTNER, BUSY, 'Engagement Partner').bootstrap({});
    expect(b.engagements.map((e) => e.id)).toEqual([BUSY_ENG]);
    expect(b.wtb).toEqual([]);
    expect(b.states).toEqual([]);
  });

  it('non-anggota tanpa engagementId hanya melihat dirinya dan nol perikatan', async () => {
    const b = await callerAs(BUSY_JUNIOR, BUSY, 'Junior Auditor').bootstrap({});
    expect(b.engagements).toEqual([]);
    expect(b.clients).toEqual([]);
    expect(b.users.map((u) => u.id)).toEqual([BUSY_JUNIOR]);
  });

  it('dengan engagementId, akses tetap ditegakkan (lintas firma & non-anggota FORBIDDEN)', async () => {
    await expect(callerAs(FRESH_ADMIN, FRESH, 'Engagement Partner').bootstrap({ engagementId: BUSY_ENG }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', message: 'cross-firm-engagement' });
    await expect(callerAs(BUSY_JUNIOR, BUSY, 'Junior Auditor').bootstrap({ engagementId: BUSY_ENG }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', message: 'not-engagement-member' });
  });

  it('pengguna tanpa firma tetap gagal-tertutup walau tanpa engagementId', async () => {
    await expect(callerAs(BUSY_PARTNER, '', 'Engagement Partner').bootstrap({}))
      .rejects.toMatchObject({ code: 'FORBIDDEN', message: 'firm-unresolved' });
  });
});
