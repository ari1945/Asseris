/* ============================================================
   Asseris — People & Compliance: extended data
   Augments AMS with data for the deepened HCM modules and
   six new modules (Org Chart · Succession · Recruitment ·
   Learning · Ethics/AML · HR Cases). Loaded AFTER data.js.
   ============================================================ */
import { AMS } from './data';
import { ORG_EXT } from './data_roster';
import { hcmAttrition, hcmAttritionByGrade, hcmDemographics, hcmHeadcountTrend, hcmTimeToFill } from './canon_hcm';
import type { HcmExit, HcmMember, HcmRequisition } from './canon_hcm';
(function () {
  const A = AMS;

  /* ---- Reporting lines + division for org chart ---- */
  const ORG = {
    'EMP-001': { reports: (null as any),      dept: 'Kepemimpinan Firma' },
    'EMP-002': { reports: 'EMP-001', dept: 'Audit & Asurans' },
    'EMP-003': { reports: 'EMP-001', dept: 'Mutu, Etika & Non-Audit' },
    'EMP-007': { reports: 'EMP-001', dept: 'Mutu & Operasi Audit' },
    'EMP-008': { reports: 'EMP-002', dept: 'Audit & Asurans' },
    'EMP-012': { reports: 'EMP-003', dept: 'Pemantauan Mutu' },
    'EMP-021': { reports: 'EMP-007', dept: 'Audit & Asurans' },
    'EMP-022': { reports: 'EMP-008', dept: 'Audit & Asurans' },
    'EMP-031': { reports: 'EMP-021', dept: 'Audit & Asurans' },
    'EMP-032': { reports: 'EMP-022', dept: 'Audit & Asurans' },
    ...ORG_EXT,   // PR-4 — garis pelaporan 59 personel tambahan
  };
  const DEPT_HEAD = {
    'Audit & Asurans': 'EMP-002',
    'Mutu, Etika & Non-Audit': 'EMP-003',
    'Mutu & Operasi Audit': 'EMP-007',
    'Pemantauan Mutu': 'EMP-012',
  };

  /* ---- 360° profile enrichment (subset; others fall back gracefully) ---- */
  const STAFF_PROFILE = {
    'EMP-001': { phone: '0811-1900-001', location: 'Jakarta (HQ)', birth: '1981-04-12', gender: 'L', empType: 'Tetap', band: 'P4', salaryBand: 'Rp 90–105 jt', nik: '3174••••0012', npwp: '08.221.••.•-091', bpjsKes: 'Aktif', bpjsTk: 'Aktif',
      emergency: { name: 'Lestari Wijaya', rel: 'Pasangan', phone: '0812-•••-4410' },
      skills: [['Audit Emiten/PIE', 5], ['SMM & Mutu', 5], ['PSAK 71/72', 4], ['Kepemimpinan', 5], ['Pajak Korporasi', 3]],
      docs: [['Sertifikat CPA (IAPI)', 'Valid s.d. 2027'], ['Izin Akuntan Publik', 'Valid'], ['KTP & NPWP', 'Lengkap'], ['Kontrak Kerja', 'PKWTT 2009']],
      timeline: [['2009', 'Bergabung sebagai Manager'], ['2014', 'Promosi Partner'], ['2019', 'Managing Partner'], ['2019', 'Pemegang izin AP'] ] },
    'EMP-021': { phone: '0813-2100-021', location: 'Jakarta (HQ)', birth: '1995-09-03', gender: 'L', empType: 'Tetap', band: 'S2', salaryBand: 'Rp 22–28 jt', nik: '3174••••0024', npwp: '09.551.••.•-091', bpjsKes: 'Aktif', bpjsTk: 'Aktif',
      emergency: { name: 'Putri Raharjo', rel: 'Saudara', phone: '0856-•••-9921' },
      skills: [['Pengujian Substantif', 5], ['Sampling MUS', 4], ['Data Analytics', 4], ['Supervisi Junior', 4], ['PSAK 71', 3]],
      docs: [['Sertifikat CA', 'Valid'], ['Kandidat CPA', 'Ujian 3/4'], ['KTP & NPWP', 'Lengkap'], ['Kontrak Kerja', 'PKWTT 2020']],
      timeline: [['2020', 'Bergabung sebagai Junior'], ['2022', 'Promosi Senior'], ['2025', 'Kandidat Manager']] },
    'EMP-032': { phone: '0857-3200-032', location: 'Jakarta (HQ)', birth: '2001-01-22', gender: 'P', empType: 'Tetap', band: 'J1', salaryBand: 'Rp 9–12 jt', nik: '3174••••0099', npwp: '— (proses)', bpjsKes: 'Aktif', bpjsTk: 'Aktif',
      emergency: { name: 'Sukma Kusuma', rel: 'Orang tua', phone: '0813-•••-2201' },
      skills: [['Vouching & Tracing', 3], ['Kertas Kerja', 3], ['Konfirmasi', 3], ['Excel/Caseware', 4], ['PSAK Dasar', 2]],
      docs: [['Ijazah S.Ak', 'Lengkap'], ['Sertifikat CA', 'Belum'], ['KTP', 'Lengkap'], ['Kontrak Kerja', 'PKWTT 2024']],
      timeline: [['2024', 'Bergabung sebagai Junior'], ['2025', 'Rotasi tim manufaktur']] },
  };

  /* ---- HCM analytics — DITURUNKAN (PRD sdm-kepatuhan PR-4) ----
     Seluruh blok ini dulu literal. Ia mengklaim 69 orang sementara roster berisi
     10, memberi warna kondisional pada `annualAttrition` (amber bila > 15)
     sehingga sebuah konstanta tampak seperti hasil pemantauan, dan menaruh
     `annualAttrition: 16` bersebelahan dengan `regrettable: 62` — pasangan yang
     MUSTAHIL benar bersamaan untuk firma seukuran ini (hanya ada solusi bulat
     pada headcount 79–83, sementara `gradeMix` di objek yang sama berbunyi 69).

     Kini semuanya dihitung `canon_hcm` dari roster (69 orang, `data_roster.ts`)
     dan register keluar (`AMS.EXITS`). Distribusi lamanya direproduksi PERSIS —
     ia menjadi spesifikasi roster, lalu dihapus. Yang BERGERAK, dan sengaja:

       regrettable  62% → 64%  (7 dari 11; 62% tak dapat dicapai pecahan bulat
                                mana pun pada 11 kepergian)
       timeToFill   38 → diturunkan dari tanggal requisition dibuka→terisi
       headcountTrend           dihitung mundur dari roster + register keluar,
                                jadi ia SELALU menutup ke jumlah yang nyata. */
  const hcmRoster = () => (A as unknown as { STAFF?: HcmMember[] }).STAFF || [];
  const hcmExits = () => (A as unknown as { EXITS?: HcmExit[] }).EXITS || [];
  const hcmAsOf = () => String((A as unknown as { TODAY?: string }).TODAY || '');
  const HCM_ANALYTICS = {
    get headcountTrend() { return hcmHeadcountTrend(hcmRoster(), hcmExits(), hcmAsOf()); },
    get gradeMix() { return hcmDemographics(hcmRoster(), hcmAsOf()).gradeMix.map((b) => ({ g: b.k, n: b.n })); },
    get genderMix() { return hcmDemographics(hcmRoster(), hcmAsOf()).genderMix; },
    get tenureMix() { return hcmDemographics(hcmRoster(), hcmAsOf()).tenureMix; },
    get ageMix() { return hcmDemographics(hcmRoster(), hcmAsOf()).ageMix; },
    get certMix() { return hcmDemographics(hcmRoster(), hcmAsOf()).certMix; },
    get avgTenure() { return hcmDemographics(hcmRoster(), hcmAsOf()).avgTenure; },
    get attritionByGrade() {
      return hcmAttritionByGrade(hcmRoster(), hcmExits(), hcmAsOf()).map((r) => ({ g: r.g, rate: r.ratePct ?? 0 }));
    },
    get annualAttrition() { return hcmAttrition(hcmRoster(), hcmExits(), hcmAsOf()).ratePct; },
    get regrettable() { return hcmAttrition(hcmRoster(), hcmExits(), hcmAsOf()).regrettablePct; },
    get timeToFill() { return hcmTimeToFill((A as unknown as { REQUISITIONS?: HcmRequisition[] }).REQUISITIONS).days; },
    get attritionBasis() { return hcmAttrition(hcmRoster(), hcmExits(), hcmAsOf()).basis; },
    get timeToFillBasis() { return hcmTimeToFill((A as unknown as { REQUISITIONS?: HcmRequisition[] }).REQUISITIONS).basis; },
  };

  /* ========================================================
     1) SUCCESSION & CAREER
     ======================================================== */
  const SUCCESSION_ROLES = [
    { id: 'SR-01', role: 'Managing Partner', incumbent: 'EMP-001', critical: 'Kritikal', riskOfLoss: 'Rendah', vacancyImpact: 'Tinggi',
      successors: [
        { id: 'EMP-002', readiness: 'Siap sekarang', gaps: 'Eksposur regulator PPPK' },
        { id: 'EMP-003', readiness: 'Siap 1–2 th', gaps: 'Skala portofolio PIE' },
      ] },
    { id: 'SR-02', role: 'Quality Management Leader (SMM)', incumbent: 'EMP-007', critical: 'Kritikal', riskOfLoss: 'Sedang', vacancyImpact: 'Tinggi',
      successors: [
        { id: 'EMP-012', readiness: 'Siap 1–2 th', gaps: 'Sertifikasi spesialis mutu' },
        { id: 'EMP-008', readiness: 'Siap 2–3 th', gaps: 'Pengalaman remediasi SOQM' },
      ] },
    { id: 'SR-03', role: 'Ethics & Independence Partner', incumbent: 'EMP-003', critical: 'Penting', riskOfLoss: 'Rendah', vacancyImpact: 'Sedang',
      successors: [
        { id: 'EMP-007', readiness: 'Siap 1–2 th', gaps: 'Penunjukan formal etika' },
      ] },
    { id: 'SR-04', role: 'Engagement Partner — PIE', incumbent: 'EMP-002', critical: 'Kritikal', riskOfLoss: 'Sedang', vacancyImpact: 'Tinggi',
      successors: [
        { id: 'EMP-007', readiness: 'Siap 2–3 th', gaps: 'Izin AP & jam tanda tangan' },
        { id: 'EMP-008', readiness: 'Siap 2–3 th', gaps: 'Izin AP' },
      ] },
    { id: 'SR-05', role: 'Audit Manager', incumbent: 'EMP-008', critical: 'Penting', riskOfLoss: 'Sedang', vacancyImpact: 'Sedang',
      successors: [
        { id: 'EMP-021', readiness: 'Siap sekarang', gaps: '—' },
        { id: 'EMP-022', readiness: 'Siap 1–2 th', gaps: 'CPA penuh' },
      ] },
  ];
  /* career ladder definition */
  const CAREER_LADDER = [
    { grade: 'Junior', years: '0–2 th', next: 'Senior', criteria: ['CA / lulus 2 mata ujian CPA', 'Skor kinerja ≥ 3,8', '≥ 1.500 jam audit', 'Kuasai kertas kerja inti'] },
    { grade: 'Senior', years: '2–5 th', next: 'Manager', criteria: ['CPA penuh', 'Skor kinerja ≥ 4,2', 'Memimpin ≥ 2 perikatan', 'Supervisi tim & reviu'] },
    { grade: 'Manager', years: '5–9 th', next: 'Partner', criteria: ['Izin AP (untuk tanda tangan)', 'Skor kinerja ≥ 4,4', 'Pengembangan bisnis / portofolio', 'Kepemimpinan mutu'] },
    { grade: 'Partner', years: '9+ th', next: 'Managing Partner', criteria: ['Track record PIE', 'Tanggung jawab SMM', 'Kepemimpinan firma'] },
  ];
  /* individual development plans for high-potentials */
  const IDP = {
    'EMP-021': { target: 'Manager (2026)', sponsor: 'EMP-007', progress: 72,
      actions: [ { a: 'Selesaikan ujian CPA (2 dari 4)', s: 'Berjalan', due: 'Q4 2026' }, { a: 'Pimpin 1 perikatan PIE sebagai in-charge', s: 'Berjalan', due: 'Q3 2026' }, { a: 'Pelatihan kepemimpinan IAPI', s: 'Selesai', due: 'Q1 2026' } ] },
    'EMP-022': { target: 'Manager (2027)', sponsor: 'EMP-008', progress: 48,
      actions: [ { a: 'Selesaikan CPA penuh', s: 'Berjalan', due: 'Q2 2027' }, { a: 'Sertifikasi Data Analytics audit', s: 'Belum', due: 'Q4 2026' }, { a: 'Rotasi ke tim non-audit', s: 'Belum', due: 'Q1 2027' } ] },
    'EMP-007': { target: 'Partner (2027)', sponsor: 'EMP-001', progress: 64,
      actions: [ { a: 'Pengurusan izin Akuntan Publik', s: 'Berjalan', due: 'Q3 2026' }, { a: 'Akumulasi jam tanda tangan terbimbing', s: 'Berjalan', due: '2027' }, { a: 'Program pengembangan bisnis', s: 'Berjalan', due: 'Berkelanjutan' } ] },
  };

  /* ========================================================
     2) RECRUITMENT & ONBOARDING
     ======================================================== */
  /* `applicants` → `applicantsDeclared` (PRD sdm-kepatuhan PR-6).
     Ia jumlah lamaran MASUK menurut portal/ATS di luar aplikasi — memang tak
     dapat diturunkan di sini. Dulu ia berdiri bersebelahan dengan `filled`
     seolah keduanya sejenis, sehingga "34 pelamar" tampak seperti 34 orang di
     register padahal registernya berisi empat. `filled` kini DITURUNKAN dari
     kandidat tahap "Diterima" ∪ onboarding yang menunjuk requisition ini. */
  const REQUISITIONS = [
    { id: 'REQ-2026-07', title: 'Senior Auditor (PIE)', grade: 'Senior', dept: 'Audit & Asurans', count: 2, status: 'Dibuka', priority: 'Tinggi', hiringMgr: 'EMP-007', opened: '2026-02-12', target: '2026-05-01', applicantsDeclared: 34, reason: 'Kapasitas musim audit (QR-02)' },
    { id: 'REQ-2026-06', title: 'Junior Auditor', grade: 'Junior', dept: 'Audit & Asurans', count: 4, status: 'Dibuka', priority: 'Sedang', hiringMgr: 'EMP-008', opened: '2026-01-20', target: '2026-04-15', applicantsDeclared: 96, reason: 'Pertumbuhan portofolio' },
    { id: 'REQ-2026-05', title: 'Manager — Jasa Non-Audit', grade: 'Manager', dept: 'Mutu, Etika & Non-Audit', count: 1, status: 'Persetujuan', priority: 'Sedang', hiringMgr: 'EMP-003', opened: '2026-03-01', target: '2026-06-01', applicantsDeclared: 11, reason: 'Ekspansi lini asurans SPA' },
    { id: 'REQ-2026-04', title: 'Spesialis Pajak', grade: 'Senior', dept: 'Audit & Asurans', count: 1, status: 'Terisi', priority: 'Tinggi', hiringMgr: 'EMP-002', opened: '2025-12-05', filledDate: '2026-01-12', target: '2026-02-28', applicantsDeclared: 22, reason: 'Dukungan PSAK & pajak korporasi' },
  ];
  const CAND_STAGES = ['Pelamar', 'Penyaringan', 'Wawancara', 'Penawaran', 'Diterima'];
  const CANDIDATES = [
    { id: 'C-101', name: 'Galih Pratama', req: 'REQ-2026-07', stage: 'Penawaran', source: 'Referral', rating: 4.6, exp: '4 th', cert: 'CPA', current: 'KAP Tier-2', expected: 'Rp 26 jt', note: 'Kuat di PIE & analytics.' },
    { id: 'C-102', name: 'Maya Sari', req: 'REQ-2026-07', stage: 'Wawancara', source: 'LinkedIn', rating: 4.3, exp: '5 th', cert: 'CPA', current: 'Korporasi', expected: 'Rp 28 jt', note: 'Latar industri F&B.' },
    { id: 'C-103', name: 'Reza Firmansyah', req: 'REQ-2026-07', stage: 'Penyaringan', source: 'Job Portal', rating: 3.9, exp: '3 th', cert: 'CA', current: 'KAP lokal', expected: 'Rp 24 jt', note: 'Perlu uji teknis.' },
    { id: 'C-104', name: 'Indah Permata', req: 'REQ-2026-06', stage: 'Wawancara', source: 'Kampus (UI)', rating: 4.1, exp: 'Fresh', cert: 'S.Ak', current: 'Fresh grad', expected: 'Rp 9,5 jt', note: 'IPK 3,72; magang Big-4.' },
    { id: 'C-105', name: 'Yoga Saputra', req: 'REQ-2026-06', stage: 'Pelamar', source: 'Kampus (UGM)', rating: 0, exp: 'Fresh', cert: 'S.Ak', current: 'Fresh grad', expected: 'Rp 9 jt', note: 'Menunggu penyaringan CV.' },
    { id: 'C-106', name: 'Nadia Hartanto', req: 'REQ-2026-06', stage: 'Penawaran', source: 'Referral', rating: 4.4, exp: 'Fresh', cert: 'S.Ak', current: 'Fresh grad', expected: 'Rp 10 jt', note: 'Juara kompetisi audit nasional.' },
    { id: 'C-107', name: 'Bagas Nugroho', req: 'REQ-2026-06', stage: 'Penyaringan', source: 'Job Portal', rating: 3.6, exp: 'Fresh', cert: 'S.Ak', current: 'Fresh grad', expected: 'Rp 9 jt', note: '' },
    { id: 'C-108', name: 'Sherly Anjani', req: 'REQ-2026-05', stage: 'Wawancara', source: 'Headhunter', rating: 4.5, exp: '7 th', cert: 'CPA, CA', current: 'KAP Big-4', expected: 'Rp 42 jt', note: 'Spesialis asurans keberlanjutan (SPA 3000).' },
    { id: 'C-109', name: 'Doni Kurnia', req: 'REQ-2026-07', stage: 'Pelamar', source: 'LinkedIn', rating: 0, exp: '4 th', cert: 'CA', current: 'KAP Tier-2', expected: 'Rp 25 jt', note: '' },
    { id: 'C-111', name: 'Arya Baskara', req: 'REQ-2026-06', stage: 'Diterima', source: 'Kampus (UGM)', rating: 4.0, exp: 'Fresh', cert: 'S.Ak', current: 'Mulai 1 Apr', expected: 'Rp 9,8 jt', note: 'Onboarding dijadwalkan.' },
    { id: 'C-110', name: 'Vina Maharani', req: 'REQ-2026-06', stage: 'Diterima', source: 'Kampus (UI)', rating: 4.2, exp: 'Fresh', cert: 'S.Ak', current: 'Mulai 1 Apr', expected: 'Rp 10 jt', note: 'Onboarding dijadwalkan.' },
  ];
  /* `req` & `cand` ditambahkan (PR-6): tanpa tautan itu onboarding tak dapat
     dihubungkan ke lowongan yang diisinya, sehingga `filled` tak punya dasar. */
  const ONBOARDING_HIRES = [
    { id: 'NH-01', name: 'Vina Maharani', req: 'REQ-2026-06', cand: 'C-110', role: 'Junior Auditor', start: '2026-04-01', buddy: 'EMP-021', progress: 35,
      tasks: [ { t: 'Kontrak & dokumen kepegawaian', done: true, owner: 'HR' }, { t: 'Pembuatan akun & akses sistem', done: true, owner: 'IT' }, { t: 'Deklarasi independensi & kode etik', done: true, owner: 'Etika' }, { t: 'Pelatihan metodologi audit (onboarding)', done: false, owner: 'L&D' }, { t: 'Pendaftaran PPL IAPI', done: false, owner: 'L&D' }, { t: 'Penugasan perikatan pertama', done: false, owner: 'Manager' } ] },
    { id: 'NH-02', name: 'Galuh Wicaksono', req: 'REQ-2026-04', role: 'Senior — Pajak', start: '2026-03-03', buddy: 'EMP-008', progress: 83,
      tasks: [ { t: 'Kontrak & dokumen kepegawaian', done: true, owner: 'HR' }, { t: 'Pembuatan akun & akses sistem', done: true, owner: 'IT' }, { t: 'Deklarasi independensi & kode etik', done: true, owner: 'Etika' }, { t: 'Screening PMPJ internal', done: true, owner: 'Etika' }, { t: 'Pelatihan sistem & metodologi', done: true, owner: 'L&D' }, { t: 'Penugasan perikatan pertama', done: false, owner: 'Manager' } ] },
  ];

  /* ========================================================
     3) LEARNING & COMPETENCY
     ======================================================== */
  const COMPETENCIES = [
    { id: 'CO-01', name: 'Standar Audit (SA)', cat: 'Teknis' },
    { id: 'CO-02', name: 'PSAK / Pelaporan Keuangan', cat: 'Teknis' },
    { id: 'CO-03', name: 'Audit Data Analytics', cat: 'Teknis' },
    { id: 'CO-04', name: 'Perpajakan', cat: 'Teknis' },
    { id: 'CO-05', name: 'Mutu & SMM', cat: 'Teknis' },
    { id: 'CO-06', name: 'Supervisi & Kepemimpinan', cat: 'Perilaku' },
    { id: 'CO-07', name: 'Komunikasi Klien', cat: 'Perilaku' },
  ];
  /* required level per grade (1-5) */
  const COMPETENCY_REQ = {
    Junior:  { 'CO-01': 3, 'CO-02': 3, 'CO-03': 3, 'CO-04': 2, 'CO-05': 2, 'CO-06': 2, 'CO-07': 3 },
    Senior:  { 'CO-01': 4, 'CO-02': 4, 'CO-03': 4, 'CO-04': 3, 'CO-05': 3, 'CO-06': 4, 'CO-07': 4 },
    Manager: { 'CO-01': 5, 'CO-02': 4, 'CO-03': 4, 'CO-04': 4, 'CO-05': 4, 'CO-06': 5, 'CO-07': 5 },
    Partner: { 'CO-01': 5, 'CO-02': 5, 'CO-03': 4, 'CO-04': 4, 'CO-05': 5, 'CO-06': 5, 'CO-07': 5 },
  };
  /* actual level per staff (subset; others default to required-1) */
  const COMPETENCY_ACTUAL = {
    'EMP-007': { 'CO-01': 5, 'CO-02': 4, 'CO-03': 4, 'CO-04': 3, 'CO-05': 5, 'CO-06': 5, 'CO-07': 5 },
    'EMP-008': { 'CO-01': 4, 'CO-02': 4, 'CO-03': 3, 'CO-04': 4, 'CO-05': 3, 'CO-06': 4, 'CO-07': 4 },
    'EMP-021': { 'CO-01': 4, 'CO-02': 4, 'CO-03': 5, 'CO-04': 2, 'CO-05': 3, 'CO-06': 4, 'CO-07': 4 },
    'EMP-022': { 'CO-01': 4, 'CO-02': 3, 'CO-03': 4, 'CO-04': 3, 'CO-05': 2, 'CO-06': 3, 'CO-07': 4 },
    'EMP-031': { 'CO-01': 3, 'CO-02': 2, 'CO-03': 3, 'CO-04': 2, 'CO-05': 1, 'CO-06': 2, 'CO-07': 3 },
    'EMP-032': { 'CO-01': 2, 'CO-02': 2, 'CO-03': 4, 'CO-04': 1, 'CO-05': 1, 'CO-06': 2, 'CO-07': 3 },
  };
  /* `enrolled: <angka>` DICABUT (PR-6). `doEnroll` dulu menaikkan bilangan bulat
     tanpa satu pun `empId`, sementara `cpeFromTraining` membaca kehadiran yang
     BERKUNCI empId — dua dunia terpisah: 25 orang dapat "terdaftar" dengan nol
     kehadiran, dan kehadiran dapat dikonfirmasi untuk orang yang tak pernah
     mendaftar. Pendaftaran kini daftar NAMA (`TRAINING_ENROLMENT`), dan jumlahnya
     menutup persis ke angka literal lama. */
  const TRAINING_CATALOG = [
    { id: 'TR-01', title: 'Update SA Terkini & ISA Alignment', provider: 'IAPI', mode: 'Terstruktur', fmt: 'Luring', skp: 8, hours: 16, date: '2026-04-10', seats: 30, comp: 'CO-01', topic: 'akuntansi' },
    { id: 'TR-02', title: 'PSAK 71/72/73 Deep Dive', provider: 'IAPI', mode: 'Terstruktur', fmt: 'Daring', skp: 8, hours: 16, date: '2026-04-24', seats: 40, comp: 'CO-02', topic: 'akuntansi' },
    { id: 'TR-03', title: 'Audit Data Analytics (Caseware IDEA)', provider: 'Internal', mode: 'Terstruktur', fmt: 'Daring', skp: 6, hours: 12, date: '2026-05-08', seats: 25, comp: 'CO-03', topic: 'akuntansi' },
    { id: 'TR-04', title: 'Pajak Coretax & PPh Badan 2026', provider: 'DJP / IKPI', mode: 'Terstruktur', fmt: 'Daring', skp: 4, hours: 8, date: '2026-03-28', seats: 50, comp: 'CO-04', topic: 'lain' },
    { id: 'TR-05', title: 'SMM 1 Implementation Workshop', provider: 'IAPI', mode: 'Terstruktur', fmt: 'Luring', skp: 6, hours: 12, date: '2026-05-20', seats: 20, comp: 'CO-05', topic: 'pembinaan' },
    { id: 'TR-06', title: 'Coaching & Review Skills untuk Senior', provider: 'Internal', mode: 'Tidak Terstruktur', fmt: 'Luring', skp: 4, hours: 8, date: '2026-06-05', seats: 15, comp: 'CO-06', topic: 'pembinaan' },
  ];

  /* Pendaftaran pelatihan — berkunci empId. Jumlah tiap baris SAMA PERSIS dengan
     `enrolled` literal yang digantikannya (22 · 18 · 25 · 31 · 9 · 7). */
  const TRAINING_ENROLMENT = {
    "TR-01": ['EMP-001', 'EMP-007', 'EMP-021', 'EMP-032', 'EMP-103', 'EMP-203', 'EMP-206', 'EMP-301', 'EMP-304', 'EMP-307', 'EMP-310', 'EMP-313', 'EMP-316', 'EMP-319', 'EMP-402', 'EMP-405', 'EMP-408', 'EMP-411', 'EMP-414', 'EMP-417', 'EMP-420', 'EMP-423'],
    "TR-02": ['EMP-022', 'EMP-101', 'EMP-201', 'EMP-204', 'EMP-207', 'EMP-302', 'EMP-305', 'EMP-308', 'EMP-311', 'EMP-314', 'EMP-317', 'EMP-320', 'EMP-403', 'EMP-406', 'EMP-409', 'EMP-412', 'EMP-415', 'EMP-418'],
    "TR-03": ['EMP-202', 'EMP-205', 'EMP-208', 'EMP-303', 'EMP-306', 'EMP-309', 'EMP-312', 'EMP-315', 'EMP-318', 'EMP-401', 'EMP-404', 'EMP-407', 'EMP-410', 'EMP-413', 'EMP-416', 'EMP-419', 'EMP-422', 'EMP-425', 'EMP-428', 'EMP-003', 'EMP-012', 'EMP-031', 'EMP-102', 'EMP-302', 'EMP-304'],
    "TR-04": ['EMP-301', 'EMP-304', 'EMP-307', 'EMP-310', 'EMP-313', 'EMP-316', 'EMP-319', 'EMP-402', 'EMP-405', 'EMP-408', 'EMP-411', 'EMP-414', 'EMP-417', 'EMP-420', 'EMP-423', 'EMP-426', 'EMP-001', 'EMP-007', 'EMP-021', 'EMP-032', 'EMP-103', 'EMP-203', 'EMP-206', 'EMP-314', 'EMP-315', 'EMP-317', 'EMP-318', 'EMP-320', 'EMP-401', 'EMP-403', 'EMP-404'],
    "TR-05": ['EMP-308', 'EMP-311', 'EMP-314', 'EMP-317', 'EMP-320', 'EMP-403', 'EMP-406', 'EMP-409', 'EMP-412'],
    "TR-06": ['EMP-315', 'EMP-318', 'EMP-401', 'EMP-404', 'EMP-407', 'EMP-410', 'EMP-413'],
  };

  /* ========================================================
     4) ETHICS · ANNUAL DECLARATION · AML/PMPJ (staff)
     ======================================================== */
  const ETHICS_ITEMS = [
    { k: 'Independensi & Konflik Kepentingan', ref: 'Kode Etik IAPI Seksi 120' },
    { k: 'Kepentingan Keuangan & Pinjaman', ref: 'Seksi 510/511' },
    { k: 'Kerahasiaan Informasi Klien', ref: 'Seksi 114' },
    { k: 'Anti Suap & Gratifikasi', ref: 'Kebijakan ABC firma' },
    { k: 'Aktivitas Bisnis di Luar / Rangkap Jabatan', ref: 'Seksi 520' },
    { k: 'Kepatuhan APU-PPT (PMPJ)', ref: 'PMK 155/2017 · PPATK' },
  ];
  const ETHICS_DECL = {
    'EMP-001': { signed: true, date: '2026-01-08', exceptions: 0, items: [1,1,1,1,1,1] },
    'EMP-002': { signed: true, date: '2026-01-09', exceptions: 0, items: [1,1,1,1,1,1] },
    'EMP-003': { signed: true, date: '2026-01-07', exceptions: 1, items: [0,1,1,1,1,1], exNote: 'Saudara bekerja di calon klien — di-recuse & dimitigasi.' },
    'EMP-007': { signed: true, date: '2026-01-10', exceptions: 0, items: [1,1,1,1,1,1] },
    'EMP-008': { signed: false, date: '', exceptions: 0, items: [0,0,0,0,0,0] },
    'EMP-012': { signed: true, date: '2026-01-12', exceptions: 0, items: [1,1,1,1,1,1] },
    'EMP-021': { signed: true, date: '2026-01-11', exceptions: 0, items: [1,1,1,1,1,1] },
    'EMP-022': { signed: false, date: '', exceptions: 0, items: [0,0,0,0,0,0] },
    'EMP-031': { signed: true, date: '2026-01-14', exceptions: 0, items: [1,1,1,1,1,1] },
    'EMP-032': { signed: true, date: '2026-01-15', exceptions: 0, items: [1,1,1,1,1,1] },
  };
  const GIFTS_REGISTER = [
    { id: 'G-01', date: '2026-02-18', staff: 'EMP-021', counter: 'PT Sentosa Makmur', type: 'Hampers Imlek', value: 850_000, action: 'Dilaporkan & disumbangkan', status: 'Disetujui' },
    { id: 'G-02', date: '2026-01-30', staff: 'EMP-008', counter: 'Vendor software audit', type: 'Undangan konferensi', value: 4_500_000, action: 'Ditolak', status: 'Disetujui' },
    { id: 'G-03', date: '2026-03-04', staff: 'EMP-031', counter: 'PT Graha Properti', type: 'Makan siang', value: 350_000, action: 'Di bawah ambang (Rp 1 jt)', status: 'Tercatat' },
    { id: 'G-04', date: '2026-03-08', staff: 'EMP-022', counter: 'Calon klien (PT Pelita)', type: 'Voucher belanja', value: 2_000_000, action: 'Menunggu keputusan', status: 'Menunggu' },
  ];
  const AML_SCREENING = [
    { id: 'EMP-001', training: true, screened: '2026-01-08', dttot: 'Bersih', pep: 'Tidak', result: 'Bersih' },
    { id: 'EMP-002', training: true, screened: '2026-01-09', dttot: 'Bersih', pep: 'Tidak', result: 'Bersih' },
    { id: 'EMP-003', training: true, screened: '2026-01-07', dttot: 'Bersih', pep: 'Tidak', result: 'Bersih' },
    { id: 'EMP-007', training: true, screened: '2026-01-10', dttot: 'Bersih', pep: 'Tidak', result: 'Bersih' },
    { id: 'EMP-008', training: false, screened: '—', dttot: '—', pep: '—', result: 'Tertunda' },
    { id: 'EMP-021', training: true, screened: '2026-01-11', dttot: 'Bersih', pep: 'Tidak', result: 'Bersih' },
    { id: 'EMP-022', training: true, screened: '2026-02-02', dttot: 'Bersih', pep: 'Tidak', result: 'Bersih' },
    { id: 'EMP-031', training: true, screened: '2026-01-14', dttot: 'Bersih', pep: 'Tidak', result: 'Bersih' },
    { id: 'EMP-032', training: false, screened: '—', dttot: '—', pep: '—', result: 'Tertunda' },
  ];

  /* ========================================================
     5) HR CASES — DISIPLIN & WHISTLEBLOWING
     ======================================================== */
  const HR_CASES = [
    { id: 'HC-2026-03', date: '2026-02-14', staff: 'EMP-022', cat: 'Pelanggaran Independensi', severity: 'Berat', channel: 'Whistleblowing internal', status: 'Investigasi', owner: 'EMP-001', sanction: 'Pending hasil investigasi', desc: 'Dugaan kepemilikan instrumen pada klien perikatan tanpa deklarasi.', steps: [ ['2026-02-14', 'Laporan diterima via kanal WBS'], ['2026-02-16', 'Recuse sementara dari perikatan'], ['2026-02-20', 'Investigasi oleh partner non-terkait'] ] },
    { id: 'HC-2026-02', date: '2026-01-22', staff: 'EMP-031', cat: 'Pelanggaran Prosedur', severity: 'Ringan', channel: 'Reviu mutu', status: 'Selesai', owner: 'EMP-008', sanction: 'Teguran lisan + coaching', desc: 'Kertas kerja tidak ditandatangani reviewer sebelum arsip.', steps: [ ['2026-01-22', 'Temuan inspeksi internal'], ['2026-01-25', 'Coaching & remediasi kertas kerja'], ['2026-01-28', 'Ditutup — terdokumentasi'] ] },
    { id: 'HC-2025-09', date: '2025-11-30', staff: 'EMP-032', cat: 'Kedisiplinan / Kehadiran', severity: 'Ringan', channel: 'Manajer lini', status: 'Selesai', owner: 'EMP-022', sanction: 'Teguran tertulis (SP-1)', desc: 'Keterlambatan berulang tanpa keterangan.', steps: [ ['2025-11-30', 'Diskusi dengan manajer'], ['2025-12-03', 'SP-1 diterbitkan'], ['2026-02-28', 'Perbaikan — SP dicabut'] ] },
    { id: 'HC-2025-07', date: '2025-09-15', staff: 'EMP-012', cat: 'Kerahasiaan', severity: 'Sedang', channel: 'Klien', status: 'Selesai', owner: 'EMP-003', sanction: 'Pelatihan ulang + peringatan', desc: 'Pengiriman dokumen ke alamat email yang salah.', steps: [ ['2025-09-15', 'Keluhan klien'], ['2025-09-18', 'Investigasi & notifikasi'], ['2025-09-30', 'Remediasi & pelatihan DLP'] ] },
  ];
  const SANCTION_LADDER = ['Teguran Lisan', 'SP-1 (Tertulis)', 'SP-2', 'SP-3 / Skorsing', 'PHK'];

  /* ---- shared lookups for People & Compliance views ---- */
  const byId = (id: any) => (A as any).STAFF.find((s: any) => s.id === id) || { id, name: id, role: '', grade: 'Junior', cert: '' };
  const GRADE_COLOR_PC = { Partner: '#002C3F', Manager: '#005085', Senior: '#0a6b73', Junior: '#5b3fa6' };
  const READY_COLOR = { 'Siap sekarang': 'var(--green)', 'Siap 1–2 th': 'var(--blue)', 'Siap 2–3 th': 'var(--amber)' };

  Object.assign(A, {
    byId, GRADE_COLOR_PC, READY_COLOR,
    ORG, DEPT_HEAD, STAFF_PROFILE, HCM_ANALYTICS,
    SUCCESSION_ROLES, CAREER_LADDER, IDP,
    REQUISITIONS, CAND_STAGES, CANDIDATES, ONBOARDING_HIRES,
    COMPETENCIES, COMPETENCY_REQ, COMPETENCY_ACTUAL, TRAINING_CATALOG, TRAINING_ENROLMENT,
    ETHICS_ITEMS, ETHICS_DECL, GIFTS_REGISTER, AML_SCREENING,
    HR_CASES, SANCTION_LADDER,
  });
})();
