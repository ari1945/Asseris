/* Fase 2 — bukti WIRING end-to-end: guard sign-off ditegakkan lewat jalur tRPC
   state.set NYATA (bukan hanya unit guard). Memakai Manager (punya ENGAGEMENT_VIEW_ALL
   → lolos isolasi engagement tanpa setup membership) yang DIBLOKIR guard pada slot
   Partner; Partner berhasil. Membuktikan state.set memanggil guard dgn prev yang benar. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { createAttachment, softRemove } from '../attachments/store';
import { createHash } from 'node:crypto';

/* PRD prd-wp-signoff-integrity — sesi kini membawa NAMA, dan tanda tangan harus
   menyebut penulisnya. `mk` karenanya menyuntikkan nama juga; tanpa itu tulisan
   ditolak `signature-name-mismatch` — persis yang kita inginkan dari produksi. */
// D3 (fail-closed tenancy) — principal uji membawa firmId, dan perikatannya harus benar-benar ada
// (fixture di beforeAll di bawah). Keduanya kini diverifikasi assertEngagementAccess.
const SIFIRM = 'FIRM-TEST-SIGNOFF';
const SICLI = 'SI-CLI';
const mk = (id: string, role: string, name: string) =>
  createCallerFactory(appRouter)({ user: { id, name, role, firmId: SIFIRM } as unknown as User, token: 'test' });
const manager = mk('TEST-MGR', 'Audit Manager', 'Mira Gunawan');
const partner = mk('TEST-PTR', 'Engagement Partner', 'Toni Prasetyo');
const _senior = mk('TEST-SNR', 'Senior Auditor', 'Bagas Winata');


/* ============================================================
   `expect(p).rejects.toMatchObject({ message })` adalah ASSERTION VAKUM di sini:
   `message` bersifat NON-ENUMERABLE pada Error, sehingga `toMatchObject` tak pernah
   memeriksanya dan pesan apa pun lolos. Ditemukan lewat probe hidup — uji K4 di bawah
   "lulus" padahal tulisannya ditolak `signature-self-review`, bukan oleh gerbang pakar
   yang sedang diuji. Helper ini memeriksa KODE dan PESAN secara eksplisit, dan gagal
   bila tulisan justru BERHASIL.
   ============================================================ */
async function expectRejected(p: Promise<unknown>, code: string, message: RegExp) {
  let err: unknown;
  try { await p; } catch (e) { err = e; }
  expect(err, 'tulisan seharusnya DITOLAK, tetapi berhasil').toBeTruthy();
  expect((err as { code?: string }).code).toBe(code);
  expect(String((err as Error).message)).toMatch(message);
}

const at = () => new Date().toISOString();
const sigPrep = { by: 'Bagas W.', byUserId: 'TEST-SNR', at: at() };
const sigRev = { by: 'Mira G.', byUserId: 'TEST-MGR', at: at() };
const sigPtr = { by: 'Toni P.', byUserId: 'TEST-PTR', at: at() };
const scope = 'engagement' as const;
const scopeId = 'TEST-ENG-SIGNOFF';
const key = 'wpState';
const firmScopeId = SIFIRM;

/* D3 — fixture firma/klien/perikatan sungguhan. assertEngagementAccess kini memverifikasi
   perikatan ini ADA dan milik firma pemanggil; sebelumnya suite ini menulis ke id perikatan
   yang tak punya baris sama sekali. `firmScopeId` sengaja dilebur ke SIFIRM: tulisan firm-scope
   di bawah sesi nyata hanya boleh menyasar firma pemanggil sendiri. */
beforeAll(async () => {
  await prisma.firm.upsert({ where: { id: SIFIRM }, update: {}, create: { id: SIFIRM, name: 'Signoff Firm', short: 'SI' } });
  await prisma.client.upsert({ where: { id: SICLI }, update: {}, create: { id: SICLI, firmId: SIFIRM, name: 'Signoff Client' } });
  await prisma.engagement.upsert({ where: { id: scopeId }, update: {}, create: { id: scopeId, firmId: SIFIRM, clientId: SICLI } });
});

afterAll(async () => {
  await prisma.engagement.deleteMany({ where: { id: scopeId } });
  await prisma.client.deleteMany({ where: { id: SICLI } });
  await prisma.firm.deleteMany({ where: { id: SIFIRM } });
});

describe('Fase 2 — guard sign-off ditegakkan via state.set (tRPC)', () => {
  beforeAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDocHistory.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDoc.deleteMany({ where: { scope: 'firm', scopeId: firmScopeId, key: 'prospects' } });
    await prisma.stateDocHistory.deleteMany({ where: { scope: 'firm', scopeId: firmScopeId, key: 'prospects' } });
    /* Tanda tangan Preparer di-SEED langsung, bukan lewat router: Senior Auditor tak
       punya ENGAGEMENT_VIEW_ALL sehingga tak dapat menulis ke perikatan uji tanpa
       setup keanggotaan. Ia lalu menjadi tanda tangan yang TAK TERSENTUH pada setiap
       tulisan di bawah — sekaligus membuktikan toleransi warisan bekerja lewat tRPC. */
    const valueJson = JSON.stringify({ B: { chain: { preparer: sigPrep } } });
    await prisma.stateDoc.create({ data: { scope, scopeId, key, valueJson, version: 1, updatedBy: 'TEST-SNR' } });
    await prisma.stateDocHistory.create({ data: { scope, scopeId, key, version: 1, valueJson, updatedBy: 'TEST-SNR' } });
  });
  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDoc.deleteMany({ where: { scope: 'firm', scopeId: firmScopeId, key: 'prospects' } });
    await prisma.$disconnect();
  });

  /* K2 end-to-end — inilah yang dilakukan `quickSign` pada setiap kertas kerja:
     seorang reviewer menerbitkan tanda tangan Preparer atas nama auditor yang
     DITUGASKAN. Kapabilitasnya cukup (WP_EDIT); identitasnya tidak. */
  it('Manager DITOLAK menerbitkan tanda tangan Preparer atas nama Senior — via tRPC', async () => {
    await expectRejected(
      manager.state.set({ scope, scopeId, key, baseVersion: 1,
        value: { B: { chain: { preparer: sigPrep } }, C: { chain: { preparer: sigPrep } } } }),
      'FORBIDDEN', /signature-identity-mismatch/);
    const got = await partner.state.get({ scope, scopeId, key });
    expect(got.version).toBe(1);
  });

  it('Manager BOLEH menulis tanda tangan reviewer (SIGNOFF_REVIEWER) — jalur sah', async () => {
    const r = await manager.state.set({ scope, scopeId, key, baseVersion: 1,
      value: { B: { chain: { preparer: sigPrep, reviewer: sigRev } } } });
    expect(r.version).toBe(2);
  });

  it('Manager DITOLAK menambah slot Partner (butuh OPINION_APPROVE) — guard via tRPC', async () => {
    await expectRejected(
      manager.state.set({ scope, scopeId, key, baseVersion: 2,
        value: { B: { chain: { preparer: sigPrep, reviewer: sigRev, partner: sigPtr } } } }),
      'FORBIDDEN', /requires:opinion\.approve/);
    // tulisan ditolak → versi tetap 2
    const got = await partner.state.get({ scope, scopeId, key });
    expect(got.version).toBe(2);
  });

  it('Partner BOLEH menambah slot Partner — jalur sah', async () => {
    const r = await partner.state.set({ scope, scopeId, key, baseVersion: 2,
      value: { B: { chain: { preparer: sigPrep, reviewer: sigRev, partner: sigPtr } } } });
    expect(r.version).toBe(3);
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
    await expectRejected(
      manager.state.set({ ...fp, baseVersion: 1, value: prospect(true) }),
      'FORBIDDEN', /requires:firm\.admin/);
    const got = await partner.state.get(fp);
    expect(got.version).toBe(1);
  });

  it('Partner BOLEH menyetujui akseptasi', async () => {
    const r = await partner.state.set({ ...fp, baseVersion: 1, value: prospect(true) });
    expect(r.version).toBe(2);
  });
});

/* ============================================================
   PRD prd-sa620-expert-gate-server · PR-1 — WIRING gerbang pakar.
   ------------------------------------------------------------
   Unit guard diuji dengan konteks BUATAN TANGAN; yang diuji di sini justru
   lapisan yang tak dapat dijangkau unit test: apakah `state.set` benar-benar
   memanggil `signoffContextNeeds`, memuat StateDoc saudara lewat Prisma, dan
   meneruskannya ke guard. Gerbang yang benar dengan pemuat yang tak terpasang
   akan lolos 100% unit test dan nol tulisan nyata.
   ============================================================ */
describe('PR-1 — gerbang pakar SA 620 ditegakkan via state.set (tRPC + Prisma)', () => {
  /* Perikatan BERBEDA per uji, bukan reset di antara uji: kunci dedupe outbox audit
     adalah `statedoc:<scope>:<scopeId>:<key>:v<versi>`, dan jejak audit itu APPEND-ONLY
     (trigger DB). Menghapus StateDoc lalu menulis ulang v1 karenanya bertabrakan dengan
     baris audit uji sebelumnya — dan menghapus baris audit demi kenyamanan uji berarti
     menguji sistem yang tidak kita kirim. */
  const XPREFIX = 'TEST-ENG-EXPERT-';
  const xAt = () => new Date().toISOString();
  const sigMgr = () => ({ by: 'Mira G.', byUserId: 'TEST-MGR', at: xAt() });
  const REGISTER = {
    register: [
      { id: 'E-04', name: 'Imbalan Kerja', approach: 'Gunakan pakar (SA 620)' },
      { id: 'E-01', name: 'CKPN', approach: 'Rentang independen' },
    ],
  };
  const FULL = { competence: true, objectivity: true, scope: true, findings: true };

  /* Lampiran DMS NYATA (byte + SHA-256 diverifikasi store) — bukan baris palsu.
     Inilah yang membuktikan `loadSignoffContext` benar-benar membaca DMS. */
  const seedDoc540 = async (scopeId: string, estimateId: string) => {
    const bytes = Buffer.from(`%PDF-1.4 laporan pakar ${estimateId}
`);
    const meta = await createAttachment({
      scope, scopeId, collection: 'sa540', refId: estimateId,
      name: `Laporan Pakar ${estimateId}.pdf`, mime: 'application/pdf',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes, uploadedBy: 'TEST-MGR',
    });
    return meta.id;
  };
  const evalWithDoc = (docUid: string) => ({ 'E-04': { ...FULL, docUid } });

  const seedDoc = async (scopeId: string, k: string, value: unknown) => {
    const valueJson = JSON.stringify(value);
    await prisma.stateDoc.create({ data: { scope, scopeId, key: k, valueJson, version: 1, updatedBy: 'TEST-MGR' } });
    await prisma.stateDocHistory.create({ data: { scope, scopeId, key: k, version: 1, valueJson, updatedBy: 'TEST-MGR' } });
  };
  /** Perikatan bersih milik satu uji; registri di-seed hanya bila diminta. */
  const engFor = async (name: string, opts: { register?: boolean; eval?: unknown } = {}) => {
    const scopeId = XPREFIX + name;
    // D3 — perikatan harus BENAR-BENAR ada dan milik firma pemanggil; assertEngagementAccess
    // memverifikasi keduanya sekarang.
    await prisma.engagement.upsert({
      where: { id: scopeId }, update: {},
      create: { id: scopeId, firmId: SIFIRM, clientId: SICLI },
    });
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDocHistory.deleteMany({ where: { scope, scopeId } });
    await prisma.attachment.deleteMany({ where: { scope, scopeId } });
    if (opts.register) await seedDoc(scopeId, 'estimates.v1', REGISTER);
    if (opts.eval !== undefined) await seedDoc(scopeId, 'expertEval.v1', opts.eval);
    return scopeId;
  };

  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId: { startsWith: XPREFIX } } });
    await prisma.stateDocHistory.deleteMany({ where: { scope, scopeId: { startsWith: XPREFIX } } });
    await prisma.attachment.deleteMany({ where: { scope, scopeId: { startsWith: XPREFIX } } });
    await prisma.engagement.deleteMany({ where: { id: { startsWith: XPREFIX } } });
  });

  it('K1 — Manager DITOLAK menandatangani sa540 saat evaluasi pakar kosong', async () => {
    const scopeId = await engFor('k1', { register: true });
    await expectRejected(
      manager.state.set({ scope, scopeId, key, baseVersion: 0,
        value: { sa540: { chain: { preparer: sigMgr() } } } }),
      'FORBIDDEN', /expert-gate:E-04/);
    // tulisan ditolak → dokumen tak pernah dibuat
    const got = await manager.state.get({ scope, scopeId, key });
    expect(got.version).toBe(0);
  });

  it('evaluasi 4/4 + laporan pakar di DMS → tanda tangan yang SAMA diterima', async () => {
    const scopeId = await engFor('ok', { register: true });
    const docId = await seedDoc540(scopeId, 'E-04');
    await seedDoc(scopeId, 'expertEval.v1', evalWithDoc(docId));
    const r = await manager.state.set({ scope, scopeId, key, baseVersion: 0,
      value: { sa540: { chain: { preparer: sigMgr() } } } });
    expect(r.version).toBe(1);
  });

  /* PR-3 — limb DOKUMEN lewat jalur tRPC + Prisma nyata. Ini yang membuktikan
     router benar-benar memuat daftar lampiran, bukan hanya guard-nya benar. */
  it('K3 — evaluasi 4/4 tetapi laporan pakar tak ditautkan → DITOLAK', async () => {
    const scopeId = await engFor('nodoc', { register: true, eval: { 'E-04': FULL } });
    await expectRejected(
      manager.state.set({ scope, scopeId, key, baseVersion: 0,
        value: { sa540: { chain: { preparer: sigMgr() } } } }),
      'FORBIDDEN', /belum ditautkan dari DMS/);
  });

  it('K4 — laporan pakar DICABUT dari DMS → tanda tangan berikutnya DITOLAK', async () => {
    const scopeId = await engFor('revoked', { register: true });
    const docId = await seedDoc540(scopeId, 'E-04');
    await seedDoc(scopeId, 'expertEval.v1', evalWithDoc(docId));
    // sah selagi dokumennya hidup
    await manager.state.set({ scope, scopeId, key, baseVersion: 0,
      value: { sa540: { chain: { preparer: sigMgr() } } } });
    await softRemove(docId, 'TEST-MGR');
    /* Tanda tangan DICABUT lebih dulu (K5: pencabutan tak pernah digerbang), lalu slot
       yang SAMA dicoba lagi. Memakai slot reviewer di sini akan ditolak aturan
       satu-orang-satu-langkah SEBELUM gerbang pakar sempat bicara — dan uji yang
       ditolak oleh aturan lain tidak menguji apa pun tentang gerbang ini. */
    const cur = await manager.state.get({ scope, scopeId, key });
    const cleared = await manager.state.set({ scope, scopeId, key, baseVersion: cur.version, value: { sa540: { chain: {} } } });
    await expectRejected(
      manager.state.set({ scope, scopeId, key, baseVersion: cleared.version,
        value: { sa540: { chain: { preparer: sigMgr() } } } }),
      'FORBIDDEN', /tidak lagi ada di DMS/);
  });

  it('Q1 — tautan WARISAN (uid localStorage) ditolak dengan sebabnya sendiri', async () => {
    const scopeId = await engFor('legacy', {
      register: true, eval: { 'E-04': { ...FULL, docUid: 'ev-1754976000000-4821' } },
    });
    await expectRejected(
      manager.state.set({ scope, scopeId, key, baseVersion: 0,
        value: { sa540: { chain: { preparer: sigMgr() } } } }),
      'FORBIDDEN', /Tautan warisan/);
  });

  it('K8 — hasil gerbang tercatat di jejak audit', async () => {
    const scopeId = await engFor('audit', { register: true });
    await seedDoc(scopeId, 'expertEval.v1', evalWithDoc(await seedDoc540(scopeId, 'E-04')));
    await manager.state.set({ scope, scopeId, key, baseVersion: 0,
      value: { sa540: { chain: { preparer: sigMgr() } } } });
    const row = await prisma.auditLog.findFirst({ where: { scopeId, key }, orderBy: { seq: 'desc' } });
    expect(row?.detail).toContain('expert-gate:pass');
  });

  it('Q2 — registri TAK TERSIMPAN di server: lolos, tetapi jejak audit menandainya', async () => {
    const scopeId = await engFor('noreg');
    const r = await manager.state.set({ scope, scopeId, key, baseVersion: 0,
      value: { sa540: { chain: { preparer: sigMgr() } } } });
    expect(r.version).toBe(1);
    const row = await prisma.auditLog.findFirst({ where: { scopeId, key }, orderBy: { seq: 'desc' } });
    expect(row?.detail).toContain('expert-gate:no-register');
  });

  it('K5 — pencabutan tanda tangan lolos meski gerbang aktif', async () => {
    const scopeId = await engFor('revoke', { register: true });
    await seedDoc(scopeId, 'expertEval.v1', evalWithDoc(await seedDoc540(scopeId, 'E-04')));
    await manager.state.set({ scope, scopeId, key, baseVersion: 0,
      value: { sa540: { chain: { preparer: sigMgr() } } } });
    /* evaluasi dicabut → gerbang kini aktif; pencabutan tanda tangan harus tetap bisa */
    await prisma.stateDoc.update({
      where: { scope_scopeId_key: { scope, scopeId, key: 'expertEval.v1' } },
      data: { valueJson: JSON.stringify({}) },
    });
    const r = await manager.state.set({ scope, scopeId, key, baseVersion: 1,
      value: { sa540: { chain: {} } } });
    expect(r.version).toBe(2);
  });

  it('K7 — suntingan isi kertas kerja sa540 tidak digerbang', async () => {
    const scopeId = await engFor('edit', { register: true });
    await seedDoc(scopeId, 'expertEval.v1', evalWithDoc(await seedDoc540(scopeId, 'E-04')));
    const sig = sigMgr();
    await manager.state.set({ scope, scopeId, key, baseVersion: 0,
      value: { sa540: { chain: { preparer: sig } } } });
    await prisma.stateDoc.update({
      where: { scope_scopeId_key: { scope, scopeId, key: 'expertEval.v1' } },
      data: { valueJson: JSON.stringify({}) },
    });
    const r = await manager.state.set({ scope, scopeId, key, baseVersion: 1,
      value: { sa540: { chain: { preparer: sig }, conclusion: { text: 'kesimpulan' } } } });
    expect(r.version).toBe(2);
  });
});

/* ============================================================
   PEMISAHAN TUGAS RANTAI INDEPENDENSI — LEWAT tRPC NYATA.

   `guardSignoffWrite` diuji sebagai fungsi murni di `indep_signoff.test.ts`.
   Yang dibuktikan DI SINI adalah perkabelannya: bahwa `state.set` benar-benar
   memanggilnya untuk `indepAppr`, dengan `prev` yang benar dan dengan empId
   aktor yang diturunkan dari SESI (bukan dari payload). Tanpa berkas ini,
   "aturannya benar" dan "aturannya berlaku" adalah dua klaim berbeda.

   Nama sesi sengaja memakai personel roster nyata: `resolveEmpId` memetakan
   sesi → EMP lewat roster (`STAFF ∪ FIRM_STAFF`), dan akun di luar roster
   GAGAL-TERTUTUP — perilaku yang ikut diuji di bawah.
   ============================================================ */
/* D3 — tulisan firm-scope hanya boleh menyasar firma PEMANGGIL. Konstanta ini dulu bernilai
   sendiri ('FIRM-TEST-INDEP') yang tak pernah sama dengan firma sesi mana pun; itu lolos hanya
   karena state.set belum memeriksa batas firma pada sisi tulis. Ia kini firma suite ini. */
const indepScopeId = SIFIRM;
const INDEP_KEYS = ['indepAppr', 'independence'];
const YUNI_EMP = 'EMP-501';   // Yuni Marlina — Admin & HR Firma (FIRM_STAFF)
const HW_EMP = 'EMP-001';     // Hartono Wijaya — Rekan Pemimpin (STAFF)
const yuni = mk('TEST-YUNI', 'Admin & HR Firma', 'Yuni Marlina');
const hartono = mk('TEST-HW', 'Rekan Pemimpin', 'Hartono Wijaya');
const asing = mk('TEST-GHOST', 'Rekan Pemimpin', 'Akun Di Luar Roster');

const indepSig = (userId: string, empId: string, name: string) =>
  ({ by: name, byUserId: userId, byEmpId: empId, at: '2026-03-09' });

describe('SoD rantai independensi ditegakkan via state.set (tRPC)', () => {
  beforeAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope: 'firm', scopeId: indepScopeId, key: { in: INDEP_KEYS } } });
    await prisma.stateDocHistory.deleteMany({ where: { scope: 'firm', scopeId: indepScopeId, key: { in: INDEP_KEYS } } });
  });
  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope: 'firm', scopeId: indepScopeId, key: { in: INDEP_KEYS } } });
    await prisma.stateDocHistory.deleteMany({ where: { scope: 'firm', scopeId: indepScopeId, key: { in: INDEP_KEYS } } });
  });

  it('MENOLAK tiga lapis sekali tulis — celah yang gate UI tak dapat menutup', async () => {
    const s = indepSig('TEST-YUNI', YUNI_EMP, 'Yuni Marlina');
    await expectRejected(
      yuni.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'indepAppr', baseVersion: 0,
        value: { [HW_EMP]: { level: 3, steps: [s, s, s], period: 'TA 2026' } } }),
      'FORBIDDEN', /hanya yang bersangkutan/,
    );
  });

  it('MENOLAK tanda tangan yang mengaku dibubuhkan orang lain', async () => {
    await expectRejected(
      yuni.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'indepAppr', baseVersion: 0,
        value: { [YUNI_EMP]: { level: 1, steps: [indepSig('TEST-HW', HW_EMP, 'Hartono Wijaya')], period: 'TA 2026' } } }),
      'FORBIDDEN', /signature-identity-mismatch/,
    );
  });

  it('MENOLAK sesi di luar roster firma (gagal-tertutup)', async () => {
    await expectRejected(
      asing.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'indepAppr', baseVersion: 0,
        value: { [HW_EMP]: { level: 1, steps: [indepSig('TEST-GHOST', HW_EMP, 'Akun Di Luar Roster')], period: 'TA 2026' } } }),
      'FORBIDDEN', /no-emp-mapping|signature-identity-mismatch/,
    );
  });

  it('rantai berjalan lapis demi lapis oleh orang yang BERBEDA, lalu berhenti', async () => {
    const yuniSig = indepSig('TEST-YUNI', YUNI_EMP, 'Yuni Marlina');
    const hwSig = indepSig('TEST-HW', HW_EMP, 'Hartono Wijaya');
    // lapis 1 — Yuni atas deklarasinya SENDIRI
    const v1 = await yuni.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'indepAppr', baseVersion: 0,
      value: { [YUNI_EMP]: { level: 1, steps: [yuniSig], period: 'TA 2026' } } });
    expect(v1.version).toBe(1);
    // lapis 2 — Hartono (hr.manage, bukan deklaran)
    const v2 = await hartono.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'indepAppr', baseVersion: 1,
      value: { [YUNI_EMP]: { level: 2, steps: [yuniSig, hwSig], period: 'TA 2026' } } });
    expect(v2.version).toBe(2);
    // lapis 3 — Hartono LAGI: ditolak meski ia memegang firm.admin
    await expectRejected(
      hartono.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'indepAppr', baseVersion: 2,
        value: { [YUNI_EMP]: { level: 3, steps: [yuniSig, hwSig, hwSig], period: 'TA 2026' } } }),
      'FORBIDDEN', /satu orang tidak dapat mengisi dua lapis/,
    );
    // dan tanda tangan yang sudah ada tak dapat ditulis ulang
    await expectRejected(
      yuni.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'indepAppr', baseVersion: 2,
        value: { [YUNI_EMP]: { level: 2, steps: [yuniSig, yuniSig], period: 'TA 2026' } } }),
      'FORBIDDEN', /signature-overwrite/,
    );
  });

  it('MENOLAK Admin HR yang mencentang deklarasi tahunan orang lain', async () => {
    const row = (id: string, declared: boolean) => ({ id, name: id, declared, conflicts: 0, tenure: 0, rotationLimit: 5 });
    await yuni.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'independence', baseVersion: 0,
      value: [row(HW_EMP, false), row(YUNI_EMP, false)] });
    await expectRejected(
      yuni.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'independence', baseVersion: 1,
        value: [row(HW_EMP, true), row(YUNI_EMP, false)] }),
      'FORBIDDEN', /indep-decl:not-own/,
    );
    const ok = await yuni.state.set({ scope: 'firm', scopeId: indepScopeId, key: 'independence', baseVersion: 1,
      value: [row(HW_EMP, false), row(YUNI_EMP, true)] });
    expect(ok.version).toBe(2);
  });
});
