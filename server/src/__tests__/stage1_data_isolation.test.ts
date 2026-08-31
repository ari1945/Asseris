import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { assertEngagementAccess, accessibleEngagementIds } from '../engagementAccess';
import { assertStateDocRead } from '../stateAccess';
import { listConnectors, getConnector, resolveSoleConnectorByKey } from '../integrations/config';
import { listJobs, runBankSync } from '../integrations/sync';
import { pullBankStatement } from '../integrations/providers/bankFixture';

const FIRM_A = 'S1-FIRM-A';
const FIRM_B = 'S1-FIRM-B';
const CLIENT_A = 'S1-CLIENT-A';
const CLIENT_A2 = 'S1-CLIENT-A2';
const CLIENT_B = 'S1-CLIENT-B';
const ENG_A = 'S1-ENG-A';
const ENG_A2 = 'S1-ENG-A2';
const ENG_B = 'S1-ENG-B';
const USER_A = 'S1-USER-A';
const USER_A2 = 'S1-USER-A2';
const ADMIN_A = 'S1-ADMIN-A';
const USER_B = 'S1-USER-B';
const PASSWORD_SENTINEL = 'S1-passwordHash-must-not-leave';
const TOTP_SENTINEL = 'S1-totpSecret-must-not-leave';
const SESSION_SENTINEL = 'S1-session-token-must-not-leave';

function callerAs(id: string, firmId: string, role: string) {
  return createCallerFactory(appRouter)({ user: { id, firmId, role } as User, token: 'stage1-test' });
}

beforeAll(async () => {
  await prisma.firm.createMany({
    data: [
      { id: FIRM_A, name: 'Stage 1 Firm A', short: 'S1A' },
      { id: FIRM_B, name: 'Stage 1 Firm B', short: 'S1B' },
    ],
  });
  await prisma.client.createMany({
    data: [
      { id: CLIENT_A, firmId: FIRM_A, name: 'Client A' },
      { id: CLIENT_A2, firmId: FIRM_A, name: 'Client A2' },
      { id: CLIENT_B, firmId: FIRM_B, name: 'Client B' },
    ],
  });
  await prisma.engagement.createMany({
    data: [
      { id: ENG_A, firmId: FIRM_A, clientId: CLIENT_A },
      { id: ENG_A2, firmId: FIRM_A, clientId: CLIENT_A2 },
      { id: ENG_B, firmId: FIRM_B, clientId: CLIENT_B },
    ],
  });
  await prisma.user.createMany({
    data: [
      {
        id: USER_A, firmId: FIRM_A, name: 'Stage User A', role: 'Junior Auditor',
        email: 's1-a@test.local', dataJson: JSON.stringify({
          employeeId: USER_A, title: 'Junior', passwordHash: PASSWORD_SENTINEL,
          totpSecret: TOTP_SENTINEL, session: SESSION_SENTINEL, internalDebug: 'never-send',
        }),
      },
      {
        id: USER_A2, firmId: FIRM_A, name: 'Stage User A2', role: 'Junior Auditor',
        email: 's1-a2@test.local', dataJson: '{}', passwordHash: PASSWORD_SENTINEL,
        totpSecret: TOTP_SENTINEL, totpEnabled: true,
      },
      {
        id: ADMIN_A, firmId: FIRM_A, name: 'Stage Admin A', role: 'Engagement Partner',
        email: 's1-admin@test.local', dataJson: '{}',
      },
      {
        id: USER_B, firmId: FIRM_B, name: 'Stage User B', role: 'Junior Auditor',
        email: 's1-b@test.local', dataJson: '{}', passwordHash: PASSWORD_SENTINEL,
      },
    ],
  });
  await prisma.teamMember.createMany({
    data: [
      { firmId: FIRM_A, name: 'Stage User A', role: 'Junior Auditor' },
      { firmId: FIRM_A, name: 'Stage User A2', role: 'Junior Auditor' },
      { firmId: FIRM_A, name: 'Stage Admin A', role: 'Engagement Partner' },
      { firmId: FIRM_B, name: 'Stage User B', role: 'Junior Auditor' },
    ],
  });
  await prisma.engagementMember.createMany({
    data: [
      { engagementId: ENG_A, userId: USER_A },
      { engagementId: ENG_A2, userId: USER_A2 },
      { engagementId: ENG_B, userId: USER_B },
    ],
  });
  await prisma.session.create({
    data: {
      token: SESSION_SENTINEL, userId: USER_A2,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  // D2 — KEDUA firma memiliki konektor ber-key 'bank'. Sebelum D2 itu mustahil: `key` adalah
  // primary key global, jadi konektor Coretax/bank hanya bisa dimiliki satu firma di seluruh DB.
  await prisma.connector.createMany({
    data: [
      {
        id: 'S1-CONN-A', firmId: FIRM_A, key: 'bank', name: 'Bank Feed A', category: 'Keuangan',
        target: 'cashbank', status: 'connected',
        mappingJson: JSON.stringify([['Tgl Transaksi', 'value_date'], ['Nominal', 'amount']]),
      },
      {
        id: 'S1-CONN-B', firmId: FIRM_B, key: 'bank', name: 'Bank Feed B', category: 'Keuangan',
        target: 'cashbank', status: 'connected',
        mappingJson: JSON.stringify([['Tgl Transaksi', 'value_date'], ['Nominal', 'amount']]),
      },
    ],
  });
  await prisma.stateDoc.createMany({
    data: [
      { scope: 'engagement', scopeId: ENG_A, key: 'wpState', valueJson: JSON.stringify({ own: true }) },
      { scope: 'engagement', scopeId: ENG_A2, key: 'wpState', valueJson: JSON.stringify({ other: true }) },
      { scope: 'engagement', scopeId: ENG_B, key: 'wpState', valueJson: JSON.stringify({ foreign: true }) },
      { scope: 'user', scopeId: USER_A2, key: 'profile', valueJson: JSON.stringify({ private: 'a2' }) },
      { scope: 'user', scopeId: USER_B, key: 'profile', valueJson: JSON.stringify({ private: 'b' }) },
      { scope: 'firm', scopeId: FIRM_A, key: 'prospects', valueJson: '[]' },
      { scope: 'firm', scopeId: FIRM_A, key: 'serverOnlySecret', valueJson: JSON.stringify({ secret: true }) },
      { scope: 'firm', scopeId: FIRM_A, key: 'payrollData', valueJson: '{}' },
      { scope: 'firm', scopeId: FIRM_B, key: 'prospects', valueJson: '[]' },
      { scope: 'firm', scopeId: FIRM_B, key: 'payrollData', valueJson: '{}' },
    ],
  });
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { userId: { in: [USER_A, USER_A2, ADMIN_A, USER_B] } } });
  await prisma.syncJob.deleteMany({ where: { connectorId: { in: ['S1-CONN-A', 'S1-CONN-B'] } } });
  await prisma.connector.deleteMany({ where: { id: { in: ['S1-CONN-A', 'S1-CONN-B'] } } });
  await prisma.stateDoc.deleteMany({ where: { scopeId: { in: [ENG_A, ENG_A2, ENG_B, USER_A2, USER_B, FIRM_A, FIRM_B] } } });
  await prisma.engagementMember.deleteMany({ where: { engagementId: { in: [ENG_A, ENG_A2, ENG_B] } } });
  await prisma.teamMember.deleteMany({ where: { firmId: { in: [FIRM_A, FIRM_B] } } });
  await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_A2, ADMIN_A, USER_B] } } });
  await prisma.engagement.deleteMany({ where: { id: { in: [ENG_A, ENG_A2, ENG_B] } } });
  await prisma.client.deleteMany({ where: { id: { in: [CLIENT_A, CLIENT_A2, CLIENT_B] } } });
  await prisma.firm.deleteMany({ where: { id: { in: [FIRM_A, FIRM_B] } } });
  await prisma.$disconnect();
});

describe('Tahap 1 — bootstrap least privilege', () => {
  it('member only receives its reachable firm/engagement/client/team/user rows and public columns', async () => {
    const payload = await callerAs(USER_A, FIRM_A, 'Junior Auditor').bootstrap({ engagementId: ENG_A });
    const serialized = JSON.stringify(payload);

    expect(payload.firm?.name).toBe('Stage 1 Firm A');
    expect(payload.engagements.map((row) => row.id)).toEqual([ENG_A]);
    expect(payload.clients.map((row) => row.id)).toEqual([CLIENT_A]);
    expect(payload.users.map((row) => row.id)).toEqual([USER_A]);
    expect(payload.team.map((row) => row.name)).toEqual(['Stage User A']);
    expect(payload.states).toEqual([{ key: 'wpState', version: 1 }]);

    for (const forbidden of [
      PASSWORD_SENTINEL, TOTP_SENTINEL, SESSION_SENTINEL,
      'passwordHash', 'totpSecret', 'dataJson', 'failedLogins', 'lockedUntil', 'internalDebug',
      'valueJson', 'updatedBy', 'updatedAt',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('oversight remains limited to its own firm', async () => {
    const payload = await callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').bootstrap({ engagementId: ENG_A2 });
    expect(payload.engagements.map((row) => row.id).sort()).toEqual([ENG_A, ENG_A2]);
    expect(payload.clients.map((row) => row.id).sort()).toEqual([CLIENT_A, CLIENT_A2]);
    expect(payload.users.map((row) => row.id).sort()).toEqual([ADMIN_A, USER_A, USER_A2].sort());
    expect(payload.team.map((row) => row.name).sort()).toEqual(['Stage Admin A', 'Stage User A', 'Stage User A2']);
    await expect(
      callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').bootstrap({ engagementId: ENG_B }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('Tahap 1 — centralized StateDoc read guard', () => {
  it('enforces user owner/admin and the admin firm boundary', async () => {
    await expect(
      callerAs(USER_A, FIRM_A, 'Junior Auditor').state.get({ scope: 'user', scopeId: USER_A2, key: 'profile' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await expect(
      callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').state.get({ scope: 'user', scopeId: USER_A2, key: 'profile' }),
    ).resolves.toMatchObject({ value: { private: 'a2' }, version: 1 });

    await expect(
      callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').state.get({ scope: 'user', scopeId: USER_B, key: 'profile' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('enforces engagement membership/oversight inside the caller firm only', async () => {
    await expect(
      callerAs(USER_A, FIRM_A, 'Junior Auditor').state.get({ scope: 'engagement', scopeId: ENG_A2, key: 'wpState' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await expect(
      callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').state.get({ scope: 'engagement', scopeId: ENG_A2, key: 'wpState' }),
    ).resolves.toMatchObject({ value: { other: true }, version: 1 });

    await expect(
      callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').state.get({ scope: 'engagement', scopeId: ENG_B, key: 'wpState' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('allows only same-firm allowlisted firm keys', async () => {
    await expect(
      callerAs(USER_A, FIRM_A, 'Junior Auditor').state.get({ scope: 'firm', scopeId: FIRM_A, key: 'prospects' }),
    ).resolves.toMatchObject({ value: [], version: 1 });

    await expect(
      callerAs(USER_A, FIRM_A, 'Junior Auditor').state.get({ scope: 'firm', scopeId: FIRM_A, key: 'serverOnlySecret' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await expect(
      callerAs(USER_A, FIRM_A, 'Junior Auditor').state.get({ scope: 'firm', scopeId: FIRM_B, key: 'prospects' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('forces every personal key through personal.get and keeps that path in-firm', async () => {
    await expect(
      callerAs(USER_A, FIRM_A, 'Junior Auditor').state.get({ scope: 'firm', scopeId: FIRM_A, key: 'payrollData' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    await expect(
      callerAs(USER_A, FIRM_A, 'Junior Auditor').personal.get({ scope: 'firm', scopeId: FIRM_A, key: 'payrollData' }),
    ).resolves.toMatchObject({ value: {}, version: 1 });

    await expect(
      callerAs(USER_A, FIRM_A, 'Junior Auditor').personal.get({ scope: 'firm', scopeId: FIRM_B, key: 'payrollData' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

/* ============================================================
   D3 — GAGAL-TERTUTUP.

   Setiap cek lintas-firma dulu berbentuk `if (user.firmId) { … }`, sehingga principal TANPA
   firmId melewati semuanya. Uji di bawah memaku kebalikannya. Ia dipanggil pada lapisan guard
   (bukan lewat router) dengan sengaja: cast `as User` di seluruh suite uji repo ini bisa
   menghilangkan firmId tanpa satu pun keluhan kompilator — jaring runtime-lah yang harus
   membuktikan diri, dan hanya pemanggilan langsung yang dapat mengujinya.
   ============================================================ */
describe('D3 — principal tanpa firmId ditolak, bukan diloloskan', () => {
  const noFirm = { id: USER_A, role: 'Engagement Partner' } as unknown as {
    id: string; role: string; firmId: string;
  };

  it('assertEngagementAccess menolak, meski perannya punya ENGAGEMENT_VIEW_ALL', async () => {
    await expect(assertEngagementAccess(noFirm, ENG_A)).rejects.toMatchObject({
      code: 'FORBIDDEN', message: 'firm-unresolved',
    });
  });

  it('accessibleEngagementIds menolak alih-alih mengembalikan "all"', async () => {
    await expect(accessibleEngagementIds(noFirm)).rejects.toMatchObject({
      code: 'FORBIDDEN', message: 'firm-unresolved',
    });
  });

  it('assertStateDocRead menolak dokumen firm-scope', async () => {
    await expect(
      assertStateDocRead(noFirm, { scope: 'firm', scopeId: FIRM_A, key: 'prospects' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'firm-unresolved' });
  });

  it('assertStateDocRead menolak dokumen user-scope milik orang lain', async () => {
    await expect(
      assertStateDocRead(noFirm, { scope: 'user', scopeId: USER_A2, key: 'profile' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'firm-unresolved' });
  });
});

/* ============================================================
   D3 — batas firma pada sisi TULIS.

   Sisi baca sudah dipagari sejak W7.5; sisi tulis TIDAK. `state.set` hanya memanggil
   assertEngagementAccess untuk scope 'engagement', sehingga pemegang kapabilitas dapat menulis
   dokumen firm-scope firma lain — dan seorang FIRM_ADMIN dapat menulis profil pengguna firma
   lain — padahal MEMBACA keduanya sudah dilarang. Uji ini memaku asimetri itu tertutup.
   ============================================================ */
describe('D3 — tulisan lintas-firma ditolak, bukan hanya bacaan', () => {
  it('Partner firma A tak dapat MENULIS dokumen firm-scope firma B', async () => {
    await expect(
      callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').state.set({
        scope: 'firm', scopeId: FIRM_B, key: 'prospects', value: [{ injected: true }], baseVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'cross-firm-state' });
    // dan dokumen firma B benar-benar tak tersentuh
    const doc = await prisma.stateDoc.findUnique({
      where: { scope_scopeId_key: { scope: 'firm', scopeId: FIRM_B, key: 'prospects' } },
    });
    expect(doc?.valueJson).toBe('[]');
  });

  it('FIRM_ADMIN firma A tak dapat MENULIS dokumen user-scope pengguna firma B', async () => {
    await expect(
      callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').state.set({
        scope: 'user', scopeId: USER_B, key: 'profile', value: { hijacked: true }, baseVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'cross-firm-user' });
    const doc = await prisma.stateDoc.findUnique({
      where: { scope_scopeId_key: { scope: 'user', scopeId: USER_B, key: 'profile' } },
    });
    expect(JSON.parse(doc!.valueJson)).toEqual({ private: 'b' });
  });

  it('tulisan firm-scope ke firma SENDIRI tetap lolos (gerbang membatasi, bukan memblokir)', async () => {
    const r = await callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').state.set({
      scope: 'firm', scopeId: FIRM_A, key: 'prospects', value: [{ ok: true }], baseVersion: 1,
    });
    expect(r.version).toBe(2);
  });
});

/* ============================================================
   D2 — konektor milik firma.
   ============================================================ */
describe('D2 — konektor & job sinkronisasi ter-isolasi per firma', () => {
  it('dua firma dapat memiliki key konektor yang SAMA, masing-masing melihat miliknya sendiri', async () => {
    const a = await listConnectors(FIRM_A);
    const b = await listConnectors(FIRM_B);
    expect(a.map((c) => c.id)).toEqual(['bank']);
    expect(b.map((c) => c.id)).toEqual(['bank']);
    expect(a[0].name).toBe('Bank Feed A');
    expect(b[0].name).toBe('Bank Feed B');
  });

  it('getConnector di-scope firma — key firma lain tak terjangkau', async () => {
    expect(await getConnector(FIRM_A, 'bank')).toMatchObject({ name: 'Bank Feed A' });
    expect(await getConnector(FIRM_A, 'coretax')).toBeNull();
  });

  it('integration.list lewat router hanya memaparkan konektor firma pemanggil', async () => {
    const rows = await callerAs(ADMIN_A, FIRM_A, 'Engagement Partner').integration.list();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Bank Feed A');
    // `id` di kawat tetap key klien, bukan primary key baris — kontrak klien tak berubah.
    expect(rows[0].id).toBe('bank');
  });

  it('resolveSoleConnectorByKey MELEMPAR ketika dua firma berbagi key (webhook tak menebak)', async () => {
    await expect(resolveSoleConnectorByKey('bank')).rejects.toThrow(/connector-ambiguous:bank/);
  });

  it('sync memposting ke firma AKTOR, dan job firma lain tak bocor ke daftarnya', async () => {
    const summary = await runBankSync(
      { id: ADMIN_A, role: 'Engagement Partner', firmId: FIRM_A },
      pullBankStatement,
    );
    expect(summary.status).toBe('posted');

    // Feed mendarat di StateDoc firma A — bukan di konstanta 'FIRM-WHR' yang dulu di-hardcode.
    const posted = await prisma.stateDoc.findUnique({
      where: { scope_scopeId_key: { scope: 'firm', scopeId: FIRM_A, key: 'bankFeed' } },
    });
    expect(posted).toBeTruthy();
    expect(await prisma.stateDoc.count({ where: { scope: 'firm', scopeId: FIRM_B, key: 'bankFeed' } })).toBe(0);

    // Antrean impor firma B kosong meski key konektornya identik.
    expect(await listJobs(FIRM_A, 'bank')).not.toHaveLength(0);
    expect(await listJobs(FIRM_B, 'bank')).toHaveLength(0);

    await prisma.stateDoc.deleteMany({ where: { scope: 'firm', scopeId: FIRM_A, key: 'bankFeed' } });
    await prisma.stateDocHistory.deleteMany({ where: { scope: 'firm', scopeId: FIRM_A, key: 'bankFeed' } });
  });
});
