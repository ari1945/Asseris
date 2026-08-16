/* ============================================================
   PRD `docs/prd-sdm-kepatuhan-deepening.md` · PR-7 ·
   SC-18 · SC-19 · SC-20 · SC-21 · SC-22 · SC-23.

   Lima cacat yang ditutup:
     · kesiapan suksesi adalah string yang diketik, padahal tangga karier,
       kompetensi, dan IDP semuanya tersedia dan tak pernah dibandingkan;
     · ambang gratifikasi dihitung hanya untuk mewarnai baris — statusnya data bebas;
     · skrining AML punya tanggal tanpa masa berlaku, jadi "Bersih" selamanya;
     · kasus disiplin aktif tak menyentuh gerbang apa pun (rekusal berupa teks);
     · sanksi ditetapkan satu klik oleh siapa pun yang membuka layar;
     · `tenure` rotasi AP diketik, cooling-off tak pernah dievaluasi, dan
       pelanggaran hanya menaikkan spanduk merah.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_people';
import {
  AML_POLICY, GIFT_POLICY, amlState, caseBlocks, caseGateFor, conductGate,
  giftState, giftSummary, sanctionCheck, sanctionOptions,
} from './canon_conduct';
import type { HrCase } from './canon_conduct';
import { readinessOf, successionRoleState } from './canon_succession';
import {
  REGIME_JK, REGIME_NONPIE, REGIME_PIE, consecutiveYears, coolOffState,
  regimeOf, rotationAssignCheck, rotationState,
} from './canon_rotation';
import type { SigningRecord } from './canon_rotation';
import { ethicsComplianceOf } from './ethics_compliance';

const TODAY = String(AMS.TODAY);
const A = AMS as unknown as {
  INDEPENDENCE: { id: string; name: string; rotationClient: string; tenure: number; rotationLimit: number; rotationTier: string; rotationBreached: boolean; sektorJK?: boolean; listed?: boolean }[];
  AP_SIGNING_HISTORY: SigningRecord[];
  GIFTS_REGISTER: { id: string; date: string; value: number; status?: string }[];
  AML_SCREENING: { id: string; screened?: string; result?: string }[];
  HR_CASES: HrCase[];
  CAREER_LADDER: { grade: string; next?: string; criteria?: string[] }[];
  COMPETENCY_ACTUAL: Record<string, Record<string, number>>;
  COMPETENCY_REQ: Record<string, Record<string, number>>;
  IDP: Record<string, { progress?: number; actions?: { a: string; s: string }[] }>;
  SUCCESSION_ROLES: { role: string; incumbent: string; critical?: string; successors: { id: string; readiness: string; gaps?: string }[] }[];
};

/* ------------------------------------------------------------------
   1. SC-23 — rotasi diturunkan dari register penandatanganan
   ------------------------------------------------------------------ */

/** `tenure` literal sebelum PR-7. */
const TENURE_SEBELUM_PR7: Record<string, number> = {
  'EMP-001': 5, 'EMP-002': 7, 'EMP-003': 3, 'EMP-004': 2.5, 'EMP-007': 0, 'EMP-008': 0,
};

describe('SC-23 — masa tugas dari register, bukan diketik', () => {
  it('`tenure` & `cooloff` literal DICABUT dari INDEPENDENCE', () => {
    const raw = readFileSync(join(__dirname, 'data_part1.ts'), 'utf8');
    const block = raw.slice(raw.indexOf('const INDEPENDENCE_BASE = ['), raw.indexOf('const INDEPENDENCE = INDEPENDENCE_BASE'));
    expect(block).not.toMatch(/tenure:\s*[\d.]+/);
    expect(block).not.toMatch(/cooloff:\s*\d+/);
  });

  it.each(['EMP-001', 'EMP-002', 'EMP-003', 'EMP-007', 'EMP-008'])('%s masa tugasnya tak bergeser', (id) => {
    const d = A.INDEPENDENCE.find((x) => x.id === id) as { tenure: number };
    expect(d.tenure).toBe(TENURE_SEBELUM_PR7[id]);
  });

  /* Satu SENGAJA bergerak: 2,5 tahun tak dapat dinyatakan register bertahun-buku. */
  it('EMP-004 dibulatkan KE ATAS 2,5 → 3 — mengecilkan masa tugas mengecilkan risiko', () => {
    const d = A.INDEPENDENCE.find((x) => x.id === 'EMP-004') as { tenure: number; rotationBreached: boolean; rotationLimit: number };
    expect(d.tenure).toBe(3);
    expect(d.rotationLimit).toBe(REGIME_JK.limit);
    expect(d.rotationBreached).toBe(true);
  });

  it('rezim dipilih dari sifat klien, bukan diketik per baris', () => {
    expect(regimeOf({ sektorJK: true, listed: true })).toBe(REGIME_JK);
    expect(regimeOf({ listed: true })).toBe(REGIME_PIE);
    expect(regimeOf({})).toBe(REGIME_NONPIE);
    expect(REGIME_PIE.basis).toMatch(/PP 20\/2015/);
    expect(REGIME_JK.basis).toMatch(/POJK 13/);
  });

  it('hanya tahun BERTURUT yang dihitung — jeda memutus rantai', () => {
    const h: SigningRecord[] = [
      { ap: 'X', client: 'K', year: 2020 }, { ap: 'X', client: 'K', year: 2021 },
      /* 2022 bolong */
      { ap: 'X', client: 'K', year: 2023 }, { ap: 'X', client: 'K', year: 2024 },
    ];
    expect(consecutiveYears(h, 'X', 'K', 2024)).toEqual([2023, 2024]);
    expect(rotationState({ ap: 'X', client: 'K', history: h, asOfYear: 2024, listed: true }).tenure).toBe(2);
  });

  it('pelanggaran MEMBLOKIR penugasan tahun berikutnya', () => {
    const chk = rotationAssignCheck({
      ap: 'EMP-002', client: 'PT Graha Properti Investama',
      history: A.AP_SIGNING_HISTORY, year: 2027, listed: true,
    });
    expect(chk.ok).toBe(false);
    expect(chk.reason).toMatch(/harus AP lain/);
  });

  it('cooling-off dievaluasi — kembali terlalu cepat ditolak', () => {
    const early = rotationAssignCheck({ ap: 'EMP-001', client: 'PT Bumi Hijau Agrindo', history: A.AP_SIGNING_HISTORY, year: 2025, listed: true });
    expect(early.ok).toBe(false);
    expect(early.reason).toMatch(/[Mm]asa jeda/);
    const later = rotationAssignCheck({ ap: 'EMP-001', client: 'PT Bumi Hijau Agrindo', history: A.AP_SIGNING_HISTORY, year: 2027, listed: true });
    expect(later.ok).toBe(true);
  });

  it('cooling-off: belum pernah menandatangani → tak ada jeda yang perlu dilewati', () => {
    const c = coolOffState({ ap: 'BARU', client: 'K', history: [], asOfYear: 2026, regime: REGIME_PIE });
    expect(c.satisfied).toBe(true);
    expect(c.lastYear).toBeNull();
  });

  it('Non-PIE tak punya batas statutori — tak diblokir', () => {
    expect(rotationAssignCheck({ ap: 'EMP-003', client: 'PT Cahaya Logistik Nusantara', history: A.AP_SIGNING_HISTORY, year: 2027 }).ok).toBe(true);
  });
});

/* ------------------------------------------------------------------
   2. SC-19 — gratifikasi
   ------------------------------------------------------------------ */

describe('SC-19 — status gratifikasi dari nilai, bukan dari ketikan', () => {
  const gift = (id: string) => A.GIFTS_REGISTER.find((g) => g.id === id) as { id: string; date: string; value: number; status?: string };

  it('di bawah ambang → Tercatat; di atas & belum diputus → Menunggu', () => {
    expect(giftState({ id: 'x', date: '2026-03-01', value: 350_000 }, TODAY).derivedStatus).toBe('Tercatat');
    expect(giftState({ id: 'y', date: '2026-03-01', value: 2_000_000 }, TODAY).derivedStatus).toBe('Menunggu');
  });

  it('G-04 (Rp 2 jt, menggantung) TEREskalasi — dulu duduk diam tanpa SLA', () => {
    const st = giftState(gift('G-04'), TODAY);
    expect(st.overThreshold).toBe(true);
    expect(st.requiresDecision).toBe(true);
    expect(st.ageDays).toBeGreaterThan(0);
    expect(st.escalated).toBe(st.ageDays! > GIFT_POLICY.escalateAfterDays);
  });

  it('keputusan manusia dihormati, tidak ditimpa', () => {
    /* `status` = keputusan atas CATATANNYA; `action` = apa yang dilakukan atas
       barangnya. G-02 undangan ditolak (action) tetapi catatannya disetujui. */
    expect(giftState(gift('G-01'), TODAY).derivedStatus).toBe('Disetujui');
    expect(giftState(gift('G-02'), TODAY).derivedStatus).toBe('Disetujui');
    expect(giftState(gift('G-02'), TODAY).requiresDecision).toBe(false);
    /* dan keputusan itu bertahan meski nilainya jauh di atas ambang */
    expect(giftState(gift('G-02'), TODAY).overThreshold).toBe(true);
    expect(giftState({ id: 't', date: '2026-01-01', value: 9_000_000, status: 'Ditolak' }, TODAY).derivedStatus).toBe('Ditolak');
  });

  it('"Tercatat" untuk barang DI ATAS ambang ditandai bertentangan', () => {
    const st = giftState({ id: 'z', date: '2026-03-01', value: 5_000_000, status: 'Tercatat' }, TODAY);
    expect(st.contradicts).toBe(true);
    expect(st.derivedStatus).toBe('Menunggu');
  });

  it('ambang punya SATU sumber dengan dasarnya', () => {
    expect(GIFT_POLICY.threshold).toBe(1_000_000);
    expect(GIFT_POLICY.basis).toMatch(/Seksi 340/);
  });

  it('ringkasan menghitung yang menuntut keputusan', () => {
    const s = giftSummary(A.GIFTS_REGISTER, TODAY);
    expect(s.total).toBe(A.GIFTS_REGISTER.length);
    expect(s.pending).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------
   3. SC-20 — masa berlaku skrining AML
   ------------------------------------------------------------------ */

describe('SC-20 — skrining AML punya masa berlaku', () => {
  it('skrining segar & bersih → sah', () => {
    const st = amlState({ id: 'E', screened: '2026-01-08', result: 'Bersih' }, TODAY);
    expect(st.valid).toBe(true);
    expect(st.expiresOn).toBe('2027-01-08');
  });

  it('skrining KEDALUWARSA tak lagi sah, walau hasilnya bersih', () => {
    const st = amlState({ id: 'E', screened: '2024-01-08', result: 'Bersih' }, TODAY);
    expect(st.clean).toBe(true);
    expect(st.expired).toBe(true);
    expect(st.valid).toBe(false);
    expect(st.reason).toMatch(/kedaluwarsa/);
  });

  it('bersih TANPA tanggal tak dapat ditua-kan → tidak sah', () => {
    expect(amlState({ id: 'E', result: 'Bersih' }, TODAY).valid).toBe(false);
  });

  it('tanggal acuan tak valid → tak dapat ditentukan, bukan aman secara default', () => {
    const st = amlState({ id: 'E', screened: '2026-01-08', result: 'Bersih' }, '');
    expect(st.valid).toBe(false);
    expect(st.reason).toMatch(/tak dapat ditentukan/);
  });

  it('gerbang etik MEMBLOKIR skrining kedaluwarsa seperti skrining tertunda', () => {
    const decl = { E: { signed: true, date: '2026-01-02', exceptions: 0 } };
    const segar = ethicsComplianceOf(decl, [{ id: 'E', result: 'Bersih', screened: '2026-01-08' }], {}, 'E', 'TA 2026', { asOf: TODAY });
    expect(segar.ok).toBe(true);
    const basi = ethicsComplianceOf(decl, [{ id: 'E', result: 'Bersih', screened: '2023-01-08' }], {}, 'E', 'TA 2026', { asOf: TODAY });
    expect(basi.ok).toBe(false);
    expect(basi.amlExpired).toBe(true);
  });

  it('kebijakan menyebut dasarnya', () => {
    expect(AML_POLICY.validMonths).toBe(12);
    expect(AML_POLICY.basis).toMatch(/PPATK|155/);
  });
});

/* ------------------------------------------------------------------
   4. SC-21 — kasus disiplin menyentuh gerbang
   ------------------------------------------------------------------ */

describe('SC-21 — kasus berat aktif memblokir, dengan override ber-atestasi', () => {
  it('HC-2026-03 (independensi · berat · investigasi) MEMBLOKIR EMP-022', () => {
    const hc = A.HR_CASES.find((c) => c.id === 'HC-2026-03') as HrCase;
    expect(caseBlocks(hc)).toBe(true);
    expect(caseGateFor(A.HR_CASES, 'EMP-022').blocking).toBe(true);
  });

  it('kasus RINGAN atau SELESAI tidak memblokir', () => {
    for (const id of ['HC-2026-02', 'HC-2025-09', 'HC-2025-07']) {
      expect(caseBlocks(A.HR_CASES.find((c) => c.id === id) as HrCase), id).toBe(false);
    }
  });

  it('kategori di luar independensi/kerahasiaan tak memblokir walau berat', () => {
    expect(caseBlocks({ id: 'X', staff: 'E', cat: 'Kedisiplinan / Kehadiran', severity: 'Berat', status: 'Investigasi' })).toBe(false);
  });

  it('gerbang etik ikut memblokir orang yang kasusnya aktif', () => {
    const decl = { 'EMP-022': { signed: true, date: '2026-01-02', exceptions: 0 } };
    const aml = [{ id: 'EMP-022', result: 'Bersih', screened: '2026-01-11' }];
    const c = ethicsComplianceOf(decl, aml, {}, 'EMP-022', 'TA 2026', { asOf: TODAY, cases: A.HR_CASES });
    expect(c.caseBlocked).toBe(true);
    expect(c.ok).toBe(false);
    expect(c.reason).toMatch(/HC-2026-03/);
  });

  it('override Partner ber-alasan membuka gerbang; override KOSONG tidak', () => {
    const kosong = conductGate({ emp: 'EMP-022', cases: A.HR_CASES, overrides: { 'EMP-022': { by: 'EMP-001', at: TODAY, reason: '  ' } } });
    expect(kosong.blocking).toBe(true);
    const sah = conductGate({ emp: 'EMP-022', cases: A.HR_CASES, overrides: { 'EMP-022': { by: 'EMP-001', at: TODAY, reason: 'Recuse dari perikatan terkait; ditelaah partner independen.' } } });
    expect(sah.blocking).toBe(false);
    expect(sah.overridden).toBe(true);
    expect(sah.reason).toMatch(/di-override/);
  });
});

/* ------------------------------------------------------------------
   5. SC-22 — pemisahan tugas penetapan sanksi
   ------------------------------------------------------------------ */

describe('SC-22 — pelapor, penyelidik & pemutus adalah tiga pihak', () => {
  const kasus: HrCase = {
    id: 'HC-T', staff: 'EMP-032', cat: 'Pelanggaran Prosedur', severity: 'Sedang',
    status: 'Investigasi', reportedBy: 'EMP-021', investigatedBy: 'EMP-008', sanction: 'Teguran Lisan',
  };
  const hr = { emp: 'EMP-501', canHrManage: true, canFirmAdmin: false };

  it('HR independen boleh menetapkan', () => expect(sanctionCheck(kasus, hr).ok).toBe(true));

  it('yang dikenai sanksi tidak boleh menetapkan sanksinya sendiri', () => {
    expect(sanctionCheck(kasus, { emp: 'EMP-032', canHrManage: true, canFirmAdmin: true }).reason).toMatch(/dikenai/);
  });

  it('PELAPOR tidak boleh menjadi pemutus', () => {
    expect(sanctionCheck(kasus, { emp: 'EMP-021', canHrManage: true, canFirmAdmin: false }).reason).toMatch(/[Pp]elapor/);
  });

  it('PENYELIDIK tidak boleh menjadi pemutus', () => {
    expect(sanctionCheck(kasus, { emp: 'EMP-008', canHrManage: true, canFirmAdmin: false }).reason).toMatch(/[Pp]enyelidik/);
  });

  it('tanpa kewenangan HR/Rekan ditolak; tanpa identitas ditolak', () => {
    expect(sanctionCheck(kasus, { emp: 'EMP-031', canHrManage: false, canFirmAdmin: false }).ok).toBe(false);
    expect(sanctionCheck(kasus, { emp: null, canHrManage: true, canFirmAdmin: true }).ok).toBe(false);
  });

  it('kasus yang sudah ditutup tak dapat disanksi ulang', () => {
    expect(sanctionCheck({ ...kasus, status: 'Selesai' }, hr).ok).toBe(false);
  });

  it('anak tangga DIPILIH — tak ada kenaikan otomatis', () => {
    expect(sanctionOptions('Teguran Lisan')).toEqual(['Teguran Lisan', 'SP-1 (Tertulis)', 'SP-2', 'SP-3 / Skorsing', 'PHK']);
    expect(sanctionOptions('SP-2')).toEqual(['SP-2', 'SP-3 / Skorsing', 'PHK']);
  });
});

/* ------------------------------------------------------------------
   6. SC-18 — kesiapan suksesi diturunkan
   ------------------------------------------------------------------ */

const readinessFor = (empId: string) => {
  const staff = (AMS.STAFF as unknown as { id: string; grade?: string; cert?: string }[]).find((s) => s.id === empId);
  const rung = A.CAREER_LADDER.find((r) => r.grade === staff?.grade);
  return readinessOf({
    cert: staff?.cert, currentGrade: staff?.grade, targetGrade: rung?.next,
    ladder: A.CAREER_LADDER, competencyActual: A.COMPETENCY_ACTUAL[empId],
    competencyRequired: A.COMPETENCY_REQ[String(rung?.next)] || A.COMPETENCY_REQ[String(staff?.grade)],
    idp: A.IDP[empId],
  });
};

describe('SC-18 — kesiapan dari tangga karier × kompetensi × IDP', () => {
  it('EMP-021 TIDAK dapat "Siap sekarang" selama CPA belum penuh', () => {
    const d = readinessFor('EMP-021');
    expect(d.certHeld).toMatch(/kandidat/i);
    expect(d.key).not.toBe('siap');
    expect(d.blockers.some((b) => b.kind === 'sertifikasi')).toBe(true);
  });

  it('…dan klaim lamanya memang "Siap sekarang" — itulah pertentangannya', () => {
    const role = A.SUCCESSION_ROLES.find((r) => r.role === 'Audit Manager');
    const claim = role?.successors.find((s) => s.id === 'EMP-021');
    expect(claim?.readiness).toBe('Siap sekarang');
    expect(readinessFor('EMP-021').label).not.toBe(claim?.readiness);
  });

  it('pemblokir menyebut kriterianya, bukan sekadar "belum siap"', () => {
    const d = readinessFor('EMP-021');
    expect(d.certRequired).toMatch(/CPA/);
    for (const b of d.blockers) expect(b.detail.length).toBeGreaterThan(10);
  });

  it('tanpa pemblokir & IDP ≥ 80 → Siap sekarang', () => {
    const d = readinessOf({
      cert: 'CPA, CA', currentGrade: 'Senior', targetGrade: 'Manager',
      ladder: [{ grade: 'Senior', next: 'Manager', criteria: ['CPA penuh'] }],
      competencyActual: { 'CO-01': 5 }, competencyRequired: { 'CO-01': 4 },
      idp: { progress: 90, actions: [{ a: 'x', s: 'Selesai' }] },
    });
    expect(d.key).toBe('siap');
    expect(d.blockers).toEqual([]);
  });

  it('tanpa data sama sekali → "Belum siap", bukan diam-diam siap', () => {
    const d = readinessOf({});
    expect(d.key).toBe('belum');
    expect(d.note).toMatch(/tak dapat diturunkan/);
  });

  it('peran kritikal tanpa penerus siap ditandai berisiko', () => {
    const st = successionRoleState({
      role: 'R', incumbent: 'EMP-001', critical: 'Kritikal',
      successors: [{ id: 'EMP-021', claimed: 'Siap sekarang' }], readinessFor,
    });
    expect(st.readyNow).toBe(0);
    expect(st.atRisk).toBe(true);
    expect(st.successors[0].contradicts).toBe(true);
  });
});

/* ------------------------------------------------------------------
   7. Gerbang cakupan
   ------------------------------------------------------------------ */

const read = (f: string) => readFileSync(join(__dirname, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('gerbang cakupan — PR-7', () => {
  it('view konduk masuk lewat canon_conduct', () => {
    expect(read('view_pc_conduct.tsx')).toMatch(/from '\.\/canon_conduct'/);
  });

  it('ambang gratifikasi tak lagi diketik di view', () => {
    expect(read('view_pc_conduct.tsx')).not.toMatch(/>=\s*1_000_000/);
  });

  it('kenaikan sanksi otomatis satu klik sudah dicabut', () => {
    const src = read('view_pc_conduct.tsx');
    expect(src).not.toMatch(/Math\.min\(i \+ 1, A\.SANCTION_LADDER\.length - 1\)/);
    expect(src).toMatch(/sanctionCheck\(/);
  });

  it('suksesi masuk lewat canon_succession & tak membaca `s.readiness` untuk memutuskan', () => {
    const src = read('view_pc_org.tsx');
    expect(src).toMatch(/from '\.\/canon_succession'/);
    expect(src).not.toMatch(/s\.readiness === 'Siap sekarang'/);
  });

  it('gerbang etik meneruskan tanggal acuan & kasus disiplin', () => {
    expect(read('ethics_gate.tsx')).toMatch(/caseOverrides/);
  });
});
