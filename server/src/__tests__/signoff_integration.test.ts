/* Fase 2 — bukti WIRING end-to-end: guard sign-off ditegakkan lewat jalur tRPC
   state.set NYATA (bukan hanya unit guard). Memakai Manager (punya ENGAGEMENT_VIEW_ALL
   → lolos isolasi engagement tanpa setup membership) yang DIBLOKIR guard pada slot
   Partner; Partner berhasil. Membuktikan state.set memanggil guard dgn prev yang benar. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';

/* PRD prd-wp-signoff-integrity — sesi kini membawa NAMA, dan tanda tangan harus
   menyebut penulisnya. `mk` karenanya menyuntikkan nama juga; tanpa itu tulisan
   ditolak `signature-name-mismatch` — persis yang kita inginkan dari produksi. */
const mk = (id: string, role: string, name: string) =>
  createCallerFactory(appRouter)({ user: { id, name, role } as unknown as User, token: 'test' });
const manager = mk('TEST-MGR', 'Audit Manager', 'Mira Gunawan');
const partner = mk('TEST-PTR', 'Engagement Partner', 'Toni Prasetyo');
const senior = mk('TEST-SNR', 'Senior Auditor', 'Bagas Winata');

const at = () => new Date().toISOString();
const sigPrep = { by: 'Bagas W.', byUserId: 'TEST-SNR', at: at() };
const sigRev = { by: 'Mira G.', byUserId: 'TEST-MGR', at: at() };
const sigPtr = { by: 'Toni P.', byUserId: 'TEST-PTR', at: at() };
const scope = 'engagement' as const;
const scopeId = 'TEST-ENG-SIGNOFF';
const key = 'wpState';
const firmScopeId = 'FIRM-TEST-SIGNOFF';

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
    await expect(
      manager.state.set({ scope, scopeId, key, baseVersion: 1,
        value: { B: { chain: { preparer: sigPrep } }, C: { chain: { preparer: sigPrep } } } }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: /signature-identity-mismatch/ });
    const got = await partner.state.get({ scope, scopeId, key });
    expect(got.version).toBe(1);
  });

  it('Manager BOLEH menulis tanda tangan reviewer (SIGNOFF_REVIEWER) — jalur sah', async () => {
    const r = await manager.state.set({ scope, scopeId, key, baseVersion: 1,
      value: { B: { chain: { preparer: sigPrep, reviewer: sigRev } } } });
    expect(r.version).toBe(2);
  });

  it('Manager DITOLAK menambah slot Partner (butuh OPINION_APPROVE) — guard via tRPC', async () => {
    await expect(
      manager.state.set({ scope, scopeId, key, baseVersion: 2,
        value: { B: { chain: { preparer: sigPrep, reviewer: sigRev, partner: sigPtr } } } }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'requires:opinion.approve' });
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

  const seedDoc = async (scopeId: string, k: string, value: unknown) => {
    const valueJson = JSON.stringify(value);
    await prisma.stateDoc.create({ data: { scope, scopeId, key: k, valueJson, version: 1, updatedBy: 'TEST-MGR' } });
    await prisma.stateDocHistory.create({ data: { scope, scopeId, key: k, version: 1, valueJson, updatedBy: 'TEST-MGR' } });
  };
  /** Perikatan bersih milik satu uji; registri di-seed hanya bila diminta. */
  const engFor = async (name: string, opts: { register?: boolean; eval?: unknown } = {}) => {
    const scopeId = XPREFIX + name;
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.stateDocHistory.deleteMany({ where: { scope, scopeId } });
    if (opts.register) await seedDoc(scopeId, 'estimates.v1', REGISTER);
    if (opts.eval !== undefined) await seedDoc(scopeId, 'expertEval.v1', opts.eval);
    return scopeId;
  };

  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId: { startsWith: XPREFIX } } });
    await prisma.stateDocHistory.deleteMany({ where: { scope, scopeId: { startsWith: XPREFIX } } });
  });

  it('K1 — Manager DITOLAK menandatangani sa540 saat evaluasi pakar kosong', async () => {
    const scopeId = await engFor('k1', { register: true });
    await expect(
      manager.state.set({ scope, scopeId, key, baseVersion: 0,
        value: { sa540: { chain: { preparer: sigMgr() } } } }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', message: /expert-gate:E-04/ });
    // tulisan ditolak → dokumen tak pernah dibuat
    const got = await manager.state.get({ scope, scopeId, key });
    expect(got.version).toBe(0);
  });

  it('evaluasi 4/4 tersimpan → tanda tangan yang SAMA diterima', async () => {
    const scopeId = await engFor('ok', { register: true, eval: { 'E-04': FULL } });
    const r = await manager.state.set({ scope, scopeId, key, baseVersion: 0,
      value: { sa540: { chain: { preparer: sigMgr() } } } });
    expect(r.version).toBe(1);
  });

  it('K8 — hasil gerbang tercatat di jejak audit', async () => {
    const scopeId = await engFor('audit', { register: true, eval: { 'E-04': FULL } });
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
    const scopeId = await engFor('revoke', { register: true, eval: { 'E-04': FULL } });
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
    const scopeId = await engFor('edit', { register: true, eval: { 'E-04': FULL } });
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
