/* ============================================================
   NeoSuite AMS — data part2 (seed + engine) (W3 split dari data.js; perilaku identik).
   ============================================================ */
import { fmt } from './data_base.js';

  const FX_RATES = { IDR: 1, USD: 16_250, SGD: 12_050, EUR: 17_600 };

  /* Cash & bank accounts (multi-currency) */
  const BANK_ACCOUNTS = [
    { id: 'BCA-OPS', bank: 'BCA', name: 'Operasional', no: '••• 4471', ccy: 'IDR', balance: 6_120_000_000 },
    { id: 'MDR-PAY', bank: 'Mandiri', name: 'Penggajian', no: '••• 0098', ccy: 'IDR', balance: 1_480_000_000 },
    { id: 'BNI-TAX', bank: 'BNI', name: 'Pajak & Escrow', no: '••• 5520', ccy: 'IDR', balance: 940_000_000 },
    { id: 'BCA-USD', bank: 'BCA', name: 'Valas USD', no: '••• 7782', ccy: 'USD', balance: 48_500 },
    { id: 'DBS-SGD', bank: 'DBS', name: 'Cabang Singapura', no: '••• 3310', ccy: 'SGD', balance: 92_300 },
    { id: 'KAS-PTY', bank: 'Tunai', name: 'Kas Kecil', no: 'Petty cash', ccy: 'IDR', balance: 35_000_000 },
  ];

  /* Bank reconciliation (BCA Operasional · Feb 2026) */
  const BANK_RECON = {
    account: 'BCA-OPS', period: 'Februari 2026', bankBalance: 6_120_000_000, bookBalance: 6_047_850_000,
    lines: [
      { id: 'S1', date: '2026-02-27', desc: 'Transfer masuk — Sentosa Makmur (INV-2026-031)', amount: 925_000_000, matched: true, ref: 'JV-0312' },
      { id: 'S2', date: '2026-02-26', desc: 'Pembayaran gaji staf Februari', amount: -1_820_000_000, matched: true, ref: 'JV-0311' },
      { id: 'S3', date: '2026-02-28', desc: 'Biaya administrasi & RTGS bank', amount: -1_250_000, matched: false, ref: '' },
      { id: 'S4', date: '2026-02-28', desc: 'Jasa giro (bunga)', amount: 3_400_000, matched: false, ref: '' },
      { id: 'S5', date: '2026-02-25', desc: 'Cek beredar #00124 — sewa kantor Q1', amount: -480_000_000, matched: false, ref: 'outstanding' },
      { id: 'S6', date: '2026-02-24', desc: 'Setoran dalam perjalanan — Graha Properti', amount: 410_000_000, matched: false, ref: 'transit' },
    ],
  };

  /* Firm budget vs actual (FY2025, P&L) */
  /* Firm budget vs actual (FY2025, P&L) — kolom `actual` & `acct` mengikat tiap baris
     ke akun Buku Besar (FIRM_COA) → Treasury, BI & Firm Finance memakai satu angka. */
  const FIRM_BUDGET = [
    { line: 'Pendapatan Jasa', budget: 12_000_000_000, actual: 11_300_000_000, type: 'rev', acct: '4-100' },
    { line: 'Beban Gaji & Tunjangan', budget: 5_200_000_000, actual: 5_420_000_000, type: 'cost', acct: '5-100' },
    { line: 'Beban Overhead Kantor', budget: 1_500_000_000, actual: 1_570_000_000, type: 'cost', acct: '5-200' },
    { line: 'Beban Umum & Administrasi', budget: 560_000_000, actual: 540_000_000, type: 'cost', acct: '5-300' },
    { line: 'Beban Pemasaran & Pengembangan', budget: 420_000_000, actual: 360_000_000, type: 'cost', acct: '5-400' },
    { line: 'Beban Teknologi & Lisensi', budget: 540_000_000, actual: 610_000_000, type: 'cost', acct: '5-500' },
  ];
  /* 6-month rolling cash-flow forecast (Rp jt) */
  const CASH_FORECAST = [
    { m: 'Mar', open: 8_575, inflow: 2_480, outflow: 2_010 },
    { m: 'Apr', open: 9_045, inflow: 3_120, outflow: 2_240 },
    { m: 'Mei', open: 9_925, inflow: 1_980, outflow: 2_180 },
    { m: 'Jun', open: 9_725, inflow: 2_640, outflow: 2_360 },
    { m: 'Jul', open: 10_005, inflow: 2_210, outflow: 2_090 },
    { m: 'Agu', open: 10_125, inflow: 2_050, outflow: 2_300 },
  ];

  /* Office fixed-asset register (depreciation ref date 1 Mar 2026) */
  const FIXED_ASSETS = [
    { id: 'FA-001', name: 'Renovasi & Interior Kantor Pusat', cat: 'Bangunan & Renovasi', acq: '2021-06-01', cost: 2_400_000_000, life: 8 },
    { id: 'FA-002', name: 'Server & Infrastruktur Jaringan', cat: 'Peralatan IT', acq: '2023-03-15', cost: 880_000_000, life: 4 },
    { id: 'FA-003', name: 'Lisensi Software Audit (perpetual)', cat: 'Aset Takberwujud', acq: '2024-01-10', cost: 620_000_000, life: 5 },
    { id: 'FA-004', name: 'Kendaraan Operasional (3 unit)', cat: 'Kendaraan', acq: '2022-09-01', cost: 1_350_000_000, life: 8 },
    { id: 'FA-005', name: 'Furnitur, Partisi & Inventaris', cat: 'Inventaris Kantor', acq: '2021-06-01', cost: 540_000_000, life: 4 },
    { id: 'FA-006', name: 'Laptop Tim Audit (40 unit)', cat: 'Peralatan IT', acq: '2024-07-01', cost: 720_000_000, life: 4 },
  ];

  /* Firm's own tax obligations + e-Faktur PPN */
  const TAX_OBLIGATIONS = [
    { jenis: 'PPN Masa', period: 'Feb 2026', due: '2026-03-31', amount: 1_245_700_000, status: 'Belum Lapor' },
    { jenis: 'PPh Pasal 21', period: 'Feb 2026', due: '2026-03-10', amount: 210_000_000, status: 'Lapor' },
    { jenis: 'PPh Pasal 23', period: 'Feb 2026', due: '2026-03-10', amount: 18_400_000, status: 'Lapor' },
    { jenis: 'PPh Pasal 4(2) Final — Sewa', period: 'Feb 2026', due: '2026-03-10', amount: 48_000_000, status: 'Lapor' },
    { jenis: 'PPh Pasal 25 (Angsuran)', period: 'Feb 2026', due: '2026-03-15', amount: 103_000_000, status: 'Bayar' },
    { jenis: 'SPT Tahunan PPh Badan', period: 'FY2025', due: '2026-04-30', amount: 1_240_000_000, status: 'Draft' },
  ];
  const EFAKTUR = [
    { no: '010.000-26.00000118', client: 'PT Sentosa Makmur Tbk', dpp: 925_000_000, ppn: 101_750_000, kind: 'Keluaran', status: 'Approved' },
    { no: '010.000-26.00000119', client: 'PT Sentosa Makmur Tbk', dpp: 555_000_000, ppn: 61_050_000, kind: 'Keluaran', status: 'Approved' },
    { no: '010.000-26.00000120', client: 'PT Mandiri Sejahtera Finance', dpp: 1_170_000_000, ppn: 128_700_000, kind: 'Keluaran', status: 'Approved' },
    { no: '010.000-26.00000121', client: 'PT Bumi Hijau Agrindo', dpp: 560_000_000, ppn: 61_600_000, kind: 'Keluaran', status: 'Pending' },
    { no: '010.000-26.00000122', client: 'PT Graha Properti Investama', dpp: 820_000_000, ppn: 90_200_000, kind: 'Keluaran', status: 'Draft' },
    { no: '010.002-26.99000341', client: 'PT Solusi Teknologi Audit', dpp: 340_000_000, ppn: 37_400_000, kind: 'Masukan', status: 'Approved' },
    { no: '010.002-26.99000342', client: 'PT Properti Graha Kantor', dpp: 40_000_000, ppn: 4_400_000, kind: 'Masukan', status: 'Approved' },
  ];
  const PPH_WITHHELD = [
    { jenis: 'PPh 21', basis: 'Gaji & tunjangan karyawan', rate: 'Progresif', dpp: 1_400_000_000, tax: 210_000_000 },
    { jenis: 'PPh 23', basis: 'Jasa konsultan & sewa peralatan', rate: '2%', dpp: 920_000_000, tax: 18_400_000 },
    { jenis: 'PPh 4(2)', basis: 'Sewa kantor (final)', rate: '10%', dpp: 480_000_000, tax: 48_000_000 },
  ];

  /* Credit notes (nota kredit) */
  const CREDIT_NOTES = [
    { id: 'CN-2026-001', inv: 'INV-2026-018', client: 'PT Graha Properti Investama', amount: 60_000_000, reason: 'Penyesuaian lingkup audit', date: '2026-03-05', status: 'Issued' },
    { id: 'CN-2026-002', inv: 'INV-2026-012', client: 'PT Samudra Pangan Lestari', amount: 25_000_000, reason: 'Koreksi pembebanan biaya langsung', date: '2026-02-20', status: 'Applied' },
  ];

  /* ---- HCM: Payroll, Leave, Performance ---- */
  /* Monthly gross (IDR), PTKP status & TER category (PMK 168/2023). */
  const PAYROLL = {
    'EMP-001': { gross: 92_000_000, allowance: 8_000_000, ptkp: 'K/3', terCat: 'C', ter: 0.20 },
    'EMP-002': { gross: 86_000_000, allowance: 7_500_000, ptkp: 'K/2', terCat: 'B', ter: 0.19 },
    'EMP-003': { gross: 84_000_000, allowance: 7_500_000, ptkp: 'K/1', terCat: 'B', ter: 0.185 },
    'EMP-007': { gross: 40_000_000, allowance: 4_000_000, ptkp: 'K/1', terCat: 'B', ter: 0.12 },
    'EMP-008': { gross: 36_000_000, allowance: 3_500_000, ptkp: 'K/0', terCat: 'A', ter: 0.115 },
    'EMP-012': { gross: 37_000_000, allowance: 3_500_000, ptkp: 'K/2', terCat: 'B', ter: 0.11 },
    'EMP-021': { gross: 21_000_000, allowance: 2_000_000, ptkp: 'TK/0', terCat: 'A', ter: 0.09 },
    'EMP-022': { gross: 20_000_000, allowance: 2_000_000, ptkp: 'K/0', terCat: 'A', ter: 0.075 },
    'EMP-031': { gross: 10_500_000, allowance: 1_200_000, ptkp: 'TK/0', terCat: 'A', ter: 0.0175 },
    'EMP-032': { gross: 9_500_000, allowance: 1_200_000, ptkp: 'TK/0', terCat: 'A', ter: 0.01 },
  };
  /* BPJS & statutory rates */
  const PAYROLL_RATES = {
    period: 'Maret 2026',
    kesEmp: 0.01, kesEr: 0.04, kesCap: 12_000_000,
    jhtEmp: 0.02, jhtEr: 0.037,
    jpEmp: 0.01, jpEr: 0.02, jpCap: 10_547_400,
    jkkEr: 0.0024, jkmEr: 0.003,
  };
  /* Annual leave: 12 days entitlement; used so far in 2026 */
  const LEAVE_BALANCE = {
    'EMP-001': { ent: 12, used: 3, carry: 2 }, 'EMP-002': { ent: 12, used: 5, carry: 0 },
    'EMP-003': { ent: 12, used: 2, carry: 1 }, 'EMP-007': { ent: 12, used: 4, carry: 3 },
    'EMP-008': { ent: 12, used: 6, carry: 0 }, 'EMP-012': { ent: 12, used: 8, carry: 2 },
    'EMP-021': { ent: 12, used: 1, carry: 0 }, 'EMP-022': { ent: 12, used: 3, carry: 0 },
    'EMP-031': { ent: 12, used: 0, carry: 0 }, 'EMP-032': { ent: 12, used: 2, carry: 0 },
  };
  const LEAVE_REQUESTS = [
    { id: 'LV-0042', emp: 'EMP-012', name: 'Citra Halim', type: 'Cuti Tahunan', from: '2026-03-09', to: '2026-03-13', days: 5, reason: 'Liburan keluarga', status: 'Disetujui', approver: 'Hartono Wijaya' },
    { id: 'LV-0048', emp: 'EMP-021', name: 'Dimas Raharjo', type: 'Cuti Tahunan', from: '2026-03-24', to: '2026-03-25', days: 2, reason: 'Urusan pribadi', status: 'Menunggu', approver: 'Anindya Pramesti' },
    { id: 'LV-0049', emp: 'EMP-032', name: 'Rina Kusuma', type: 'Sakit', from: '2026-03-06', to: '2026-03-07', days: 2, reason: 'Surat dokter terlampir', status: 'Menunggu', approver: 'Bayu Saputra' },
    { id: 'LV-0050', emp: 'EMP-008', name: 'Bayu Saputra', type: 'Cuti Tahunan', from: '2026-04-01', to: '2026-04-04', days: 4, reason: 'Mudik Lebaran', status: 'Menunggu', approver: 'Rudi Gunawan' },
    { id: 'LV-0051', emp: 'EMP-022', name: 'Sinta Wulandari', type: 'Cuti Menikah', from: '2026-04-20', to: '2026-04-22', days: 3, reason: 'Pernikahan', status: 'Menunggu', approver: 'Sari Dewanti' },
  ];
  /* Performance cycle FY2025→2026: rating (1-5) × potential (1-5); status of review */
  const PERF_CYCLE = {
    cycle: 'Siklus FY2025', phase: 'Year-End Review',
    people: {
      'EMP-007': { goalsSet: true, selfDone: true, mgrDone: true, calibrated: true, perf: 4.7, pot: 4.5, box: '9-box: Bintang', promote: 'Kandidat Partner (2027)' },
      'EMP-008': { goalsSet: true, selfDone: true, mgrDone: true, calibrated: true, perf: 4.2, pot: 3.6, box: 'Kinerja Tinggi', promote: '—' },
      'EMP-012': { goalsSet: true, selfDone: true, mgrDone: true, calibrated: false, perf: 4.3, pot: 4.0, box: 'Kinerja Tinggi', promote: '—' },
      'EMP-021': { goalsSet: true, selfDone: true, mgrDone: true, calibrated: true, perf: 4.5, pot: 4.4, box: '9-box: Bintang', promote: 'Promosi ke Manager (2026)' },
      'EMP-022': { goalsSet: true, selfDone: true, mgrDone: false, calibrated: false, perf: 4.4, pot: 3.8, box: 'Kinerja Tinggi', promote: '—' },
      'EMP-031': { goalsSet: true, selfDone: true, mgrDone: false, calibrated: false, perf: 4.0, pot: 3.5, box: 'Inti', promote: '—' },
      'EMP-032': { goalsSet: true, selfDone: false, mgrDone: false, calibrated: false, perf: 3.9, pot: 3.4, box: 'Inti', promote: 'Perlu rencana pengembangan' },
    },
    goals: {
      'EMP-021': [
        { kpi: 'Realisasi jam terhadap anggaran', target: '≤ 100%', actual: '96%', score: 4.6, weight: 30 },
        { kpi: 'Kualitas kertas kerja (skor reviu)', target: '≥ 4,3', actual: '4,5', score: 4.5, weight: 30 },
        { kpi: 'Pemenuhan PPL (SKP)', target: '40 SKP', actual: '12 SKP', score: 3.5, weight: 15 },
        { kpi: 'Supervisi & coaching junior', target: '≥ 4,0', actual: '4,4', score: 4.4, weight: 25 },
      ],
    },
  };

  /* ---- ISQM 1/2: SOQM operasional, EQR, PPPK ---- */
  /* Quality objective → quality risk → response → control → monitoring → remediation */
  const SOQM_RISKS = [
    { id: 'QR-01', comp: 'Penerimaan & Keberlanjutan', objective: 'Menerima/melanjutkan hanya perikatan yang dapat dilaksanakan dengan kompeten dan beretika.', risk: 'Penilaian integritas klien tidak memadai untuk klien sektor berisiko tinggi.', lik: 3, imp: 4, response: 'Wajib EDD + persetujuan partner kedua untuk klien risiko tinggi/PEP.', owner: 'Rudi Gunawan', monitor: 'Efektif', deficiency: null },
    { id: 'QR-02', comp: 'Sumber Daya', objective: 'Menugaskan tim dengan kompetensi & kapasitas memadai.', risk: 'Beban kerja puncak musim audit melebihi kapasitas senior bersertifikat.', lik: 4, imp: 3, response: 'Perencanaan kapasitas triwulanan + rekrutmen senior + pembatasan penerimaan klien baru Q1.', owner: 'Anindya Pramesti', monitor: 'Defisiensi', deficiency: { sev: 'Sedang', desc: 'Utilisasi 2 senior >92% pada Feb–Mar; risiko penurunan mutu reviu.', rootCause: 'Penerimaan 3 klien baru tanpa penyesuaian kapasitas.', action: 'Tunda 1 perikatan non-PIE; rekrut 1 senior; redistribusi beban.', owner: 'Anindya Pramesti', due: '2026-04-30', status: 'Berjalan' } },
    { id: 'QR-03', comp: 'Pelaksanaan Perikatan', objective: 'Perikatan dilaksanakan sesuai standar profesi & ketentuan hukum.', risk: 'Konsultasi atas hal kompleks (mis. PSAK 71/72) tidak terdokumentasi.', lik: 2, imp: 4, response: 'Kebijakan konsultasi wajib + log konsultasi teknis ditinjau EQR.', owner: 'Hartono Wijaya', monitor: 'Efektif', deficiency: null },
    { id: 'QR-04', comp: 'Ketentuan Etika', objective: 'Mematuhi ketentuan etika termasuk independensi.', risk: 'Pelacakan rotasi partner emiten tidak otomatis.', lik: 2, imp: 5, response: 'Register rotasi terintegrasi + peringatan otomatis pada tahun ke-6.', owner: 'Sari Dewanti', monitor: 'Efektif', deficiency: null },
    { id: 'QR-05', comp: 'Informasi & Komunikasi', objective: 'Informasi mutu mengalir tepat waktu ke pihak terkait.', risk: 'Defisiensi mutu tidak dikomunikasikan ke seluruh partner.', lik: 2, imp: 3, response: 'Rapat mutu triwulanan + dashboard SOQM real-time.', owner: 'Hartono Wijaya', monitor: 'Efektif', deficiency: null },
    { id: 'QR-06', comp: 'Pemantauan & Remediasi', objective: 'Mengidentifikasi & meremediasi defisiensi secara tepat waktu.', risk: 'Inspeksi internal perikatan tidak menjangkau cukup sampel.', lik: 3, imp: 3, response: 'Program inspeksi siklus: ≥1 perikatan/partner/tahun, fokus PIE.', owner: 'Citra Halim', monitor: 'Efektif', deficiency: null },
  ];
  const COMPLAINTS = [
    { id: 'CMP-01', date: '2026-02-12', source: 'Klien (PT Graha Properti)', type: 'Keluhan', subject: 'Keterlambatan penerbitan laporan audit.', severity: 'Rendah', status: 'Selesai', owner: 'Citra Halim', resolution: 'Akar masalah: keterlambatan PBC klien. Direvisi jadwal & komunikasi mingguan.' },
    { id: 'CMP-02', date: '2026-01-28', source: 'Internal (whistleblowing)', type: 'Tuduhan', subject: 'Dugaan pelanggaran independensi staf pada satu perikatan.', severity: 'Tinggi', status: 'Investigasi', owner: 'Hartono Wijaya', resolution: 'Investigasi independen oleh partner non-terkait; staf di-recuse sementara.' },
    { id: 'CMP-03', date: '2026-03-03', source: 'Eksternal (regulator)', type: 'Keluhan', subject: 'Permintaan klarifikasi kertas kerja perikatan emiten.', severity: 'Sedang', status: 'Ditangani', owner: 'Sari Dewanti', resolution: 'Menyiapkan paket kertas kerja & memo respons; target 14 hari.' },
  ];
  const EQR_REVIEWS = [
    { id: 'EQR-063', eng: 'ENG-2025-063', client: 'PT Graha Properti Investama', partner: 'Rudi Gunawan', reviewer: 'Hartono Wijaya, CPA', type: 'Wajib (PIE)', stage: 'Opini', status: 'Berjalan', cleared: false,
      checklist: [
        { k: 'Pertimbangan signifikan & kesimpulan tim', ok: true },
        { k: 'Hal audit utama (KAM) & opini', ok: true },
        { k: 'Independensi & etika perikatan', ok: true },
        { k: 'Konsultasi atas hal kompleks terdokumentasi', ok: false },
        { k: 'Kecukupan bukti atas area berisiko tinggi', ok: false },
      ],
      findings: [{ t: 'Dokumentasi konsultasi PSAK 72 belum lengkap', sev: 'Sedang', status: 'Terbuka' }] },
    { id: 'EQR-014', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', partner: 'Hartono Wijaya', reviewer: 'Sari Dewanti, CPA', type: 'Wajib (PIE)', stage: 'Penyelesaian', status: 'Belum Mulai', cleared: false,
      checklist: [
        { k: 'Pertimbangan signifikan & kesimpulan tim', ok: false },
        { k: 'Hal audit utama (KAM) & opini', ok: false },
        { k: 'Independensi & etika perikatan', ok: false },
        { k: 'Konsultasi atas hal kompleks terdokumentasi', ok: false },
        { k: 'Kecukupan bukti atas area berisiko tinggi', ok: false },
      ], findings: [] },
    { id: 'EQR-040', eng: 'ENG-2025-040', reviewer: 'Hartono Wijaya, CPA', type: 'Berbasis Risiko', stage: 'Opini', status: 'Selesai', cleared: true,
      checklist: [
        { k: 'Pertimbangan signifikan & kesimpulan tim', ok: true },
        { k: 'Hal audit utama (KAM) & opini', ok: true },
        { k: 'Independensi & etika perikatan', ok: true },
        { k: 'Konsultasi atas hal kompleks terdokumentasi', ok: true },
        { k: 'Kecukupan bukti atas area berisiko tinggi', ok: true },
      ], findings: [], clearedBy: 'Hartono Wijaya, CPA', clearedDate: '2026-02-22' },
  ];
  const PPPK_REPORT = {
    year: 2025, dueDate: '2026-04-30', status: 'Draft',
    sections: [
      { t: 'Identitas & susunan KAP/AP', status: 'Lengkap' },
      { t: 'Daftar klien & jenis jasa (Lampiran)', status: 'Lengkap' },
      { t: 'Jumlah & jenis opini diterbitkan', status: 'Lengkap' },
      { t: 'Realisasi PPL seluruh AP/staf', status: 'Perlu Perhatian' },
      { t: 'Sistem pengendalian mutu (ISQM)', status: 'Lengkap' },
      { t: 'Perikatan emiten & kepentingan publik', status: 'Lengkap' },
      { t: 'Laporan keuangan KAP', status: 'Belum' },
    ],
    opinions: [
      { type: 'Wajar Tanpa Modifikasian (WTM)', n: 38 },
      { type: 'WTM dgn Paragraf Penekanan', n: 5 },
      { type: 'Wajar Dengan Pengecualian', n: 3 },
      { type: 'Tidak Menyatakan Pendapat', n: 1 },
      { type: 'Tidak Wajar', n: 0 },
    ],
    pie: 4, totalClients: 47,
    inspection: { lastP2PK: '2023', result: 'Tanpa temuan signifikan', nextDue: '2026', openFindings: 0 },
  };

  /* ---- Portal Klien / PBC (Prepared By Client) ----
     Tiap item: riwayat versi berkas, utas komentar per-item, jejak audit. */
  const PBC_REQUESTS = [
    { id: 'PBC-014-01', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', item: 'Rekening koran seluruh bank Des 2025', cat: 'Kas & Bank', priority: 'Tinggi', module: 'confirm', wp: 'A', assertion: 'Keberadaan & Pisah Batas', desc: 'Salinan rekening koran (e-statement) seluruh rekening bank perusahaan untuk Desember 2025, termasuk rekening valas USD untuk uji rekonsiliasi & cut-off kas.', requestedBy: 'Sinta Wulandari', due: '2026-03-05', status: 'Diterima', uploadedBy: 'Bag. Keuangan', date: '2026-03-04', file: 'rekkoran-des2025.pdf',
      versions: [{ ver: 1, file: 'rekkoran-des2025.pdf', by: 'Bag. Keuangan', side: 'client', date: '2026-03-04', sizeMB: 4.2, note: 'Unggahan awal — 6 rekening (BCA, Mandiri, BNI, USD).' }],
      thread: [{ by: 'Sinta Wulandari', side: 'firm', text: 'Mohon sertakan juga rekening valas USD ya.', time: '03 Mar 14:10' }, { by: 'Bag. Keuangan', side: 'client', text: 'Sudah termasuk, ada di halaman 5–6.', time: '04 Mar 09:02' }],
      events: [['request', 'Sinta Wulandari', '01 Mar 08:30', 'Permintaan dibuat'], ['upload', 'Bag. Keuangan', '04 Mar 09:00', 'Mengunggah v1'], ['receive', 'Sistem', '04 Mar 09:00', 'Berkas diterima & dipindai virus']] },
    { id: 'PBC-014-02', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', item: 'Daftar piutang usaha & umur (aging)', cat: 'Piutang', priority: 'Tinggi', module: 'confirm', wp: 'B', assertion: 'Keberadaan & Penilaian (ECL)', desc: 'Rincian piutang usaha per pelanggan beserta skedul umur (current, 1–30, 31–60, 61–90, >90 hari) per 31 Des 2025 untuk dasar konfirmasi & uji penurunan nilai.', requestedBy: 'Dimas Raharjo', due: '2026-03-06', status: 'Direviu', uploadedBy: 'Bag. Keuangan', date: '2026-03-05', file: 'aging-ar-v2.xlsx',
      versions: [{ ver: 1, file: 'aging-ar.xlsx', by: 'Bag. Keuangan', side: 'client', date: '2026-03-04', sizeMB: 0.6, note: 'Versi awal.' }, { ver: 2, file: 'aging-ar-v2.xlsx', by: 'Bag. Keuangan', side: 'client', date: '2026-03-05', sizeMB: 0.7, note: 'Revisi: tambah kolom umur >90 hari sesuai permintaan.' }],
      thread: [{ by: 'Dimas Raharjo', side: 'firm', text: 'Kolom umur >90 hari belum ada, mohon dilengkapi.', time: '04 Mar 16:20' }, { by: 'Bag. Keuangan', side: 'client', text: 'Sudah kami revisi di v2.', time: '05 Mar 08:40' }, { by: 'Dimas Raharjo', side: 'firm', text: 'Diterima, sudah saya reviu & tautkan ke WP B-200.', time: '05 Mar 11:05' }],
      events: [['request', 'Dimas Raharjo', '01 Mar 08:30', 'Permintaan dibuat'], ['upload', 'Bag. Keuangan', '04 Mar 15:00', 'Mengunggah v1'], ['upload', 'Bag. Keuangan', '05 Mar 08:40', 'Mengunggah v2 (revisi)'], ['review', 'Dimas Raharjo', '05 Mar 11:05', 'Ditandai direviu · tertaut WP B-200']] },
    { id: 'PBC-014-03', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', item: 'Stock opname & rekonsiliasi persediaan', cat: 'Persediaan', priority: 'Sedang', module: 'psak14', wp: 'C', assertion: 'Keberadaan & Penilaian (NRV)', desc: 'Berita acara stock opname akhir tahun beserta rekonsiliasi hasil opname terhadap kartu stok dan buku besar persediaan.', requestedBy: 'Dimas Raharjo', due: '2026-03-10', status: 'Diminta', uploadedBy: '', date: '', file: '',
      versions: [], thread: [{ by: 'Dimas Raharjo', side: 'firm', text: 'Sertakan juga foto pelaksanaan opname & daftar slow-moving.', time: '02 Mar 10:00' }],
      events: [['request', 'Dimas Raharjo', '01 Mar 08:30', 'Permintaan dibuat']] },
    { id: 'PBC-014-04', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', item: 'Kontrak penjualan signifikan ≥ Rp 5 M', cat: 'Pendapatan', priority: 'Tinggi', module: 'psak72', wp: 'R', assertion: 'Keterjadian & Pisah Batas', desc: 'Salinan kontrak/PO untuk transaksi penjualan ≥ Rp 5 miliar selama 2025 untuk uji pengakuan pendapatan (PSAK 72) & pisah batas.', requestedBy: 'Anindya Pramesti', due: '2026-03-04', status: 'Terlambat', uploadedBy: '', date: '', file: '',
      versions: [], thread: [{ by: 'Anindya Pramesti', side: 'firm', text: 'Item ini sudah melewati tenggat. Mohon prioritaskan.', time: '06 Mar 09:20' }],
      events: [['request', 'Anindya Pramesti', '01 Mar 08:30', 'Permintaan dibuat'], ['reminder', 'Anindya Pramesti', '06 Mar 09:20', 'Pengingat keterlambatan dikirim']] },
    { id: 'PBC-014-05', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', item: 'Rincian aset tetap & penyusutan', cat: 'Aset Tetap', priority: 'Sedang', module: 'psak16', wp: 'E', assertion: 'Keberadaan & Penilaian', desc: 'Daftar aktiva tetap (fixed asset register) lengkap dengan tanggal perolehan, harga perolehan, metode & beban penyusutan 2025, serta mutasi penambahan/pelepasan.', requestedBy: 'Fajar Nugroho', due: '2026-03-12', status: 'Diminta', uploadedBy: '', date: '', file: '',
      versions: [], thread: [], events: [['request', 'Fajar Nugroho', '01 Mar 08:30', 'Permintaan dibuat']] },
    { id: 'PBC-014-06', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', item: 'Notulen RUPS & rapat direksi 2025', cat: 'Tata Kelola', priority: 'Sedang', module: 'related', wp: 'K', assertion: 'Kelengkapan & Pengungkapan', desc: 'Notulen Rapat Umum Pemegang Saham dan rapat direksi/komisaris sepanjang 2025 untuk identifikasi keputusan signifikan, dividen, dan transaksi pihak berelasi.', requestedBy: 'Anindya Pramesti', due: '2026-03-08', status: 'Diterima', uploadedBy: 'Corporate Secretary', date: '2026-03-07', file: 'notulen-2025.pdf',
      versions: [{ ver: 1, file: 'notulen-2025.pdf', by: 'Corporate Secretary', side: 'client', date: '2026-03-07', sizeMB: 2.1, note: 'Notulen RUPST + 4 rapat direksi.' }],
      thread: [], events: [['request', 'Anindya Pramesti', '01 Mar 08:30', 'Permintaan dibuat'], ['upload', 'Corporate Secretary', '07 Mar 10:15', 'Mengunggah v1'], ['receive', 'Sistem', '07 Mar 10:15', 'Berkas diterima']] },
    { id: 'PBC-014-07', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', item: 'Konfirmasi utang bank & fasilitas kredit', cat: 'Liabilitas', priority: 'Sedang', module: 'confirm', wp: 'BB', assertion: 'Kelengkapan & Keberadaan', desc: 'Daftar fasilitas kredit & saldo utang bank per 31 Des 2025 beserta perjanjian kredit untuk dasar surat konfirmasi bank.', requestedBy: 'Sinta Wulandari', due: '2026-03-14', status: 'Diminta', uploadedBy: '', date: '', file: '',
      versions: [], thread: [], events: [['request', 'Sinta Wulandari', '01 Mar 08:30', 'Permintaan dibuat']] },
  ];
  const PORTAL_MSGS = [
    { from: 'Anindya Pramesti (KAP)', side: 'firm', text: 'Selamat pagi, kami telah mengunggah daftar permintaan dokumen (PBC) untuk audit FY2025. Mohon diunggah sebelum tanggal jatuh tempo masing-masing.', time: '08:30' },
    { from: 'Bag. Keuangan (Klien)', side: 'client', text: 'Baik, rekening koran & notulen sudah kami unggah. Untuk kontrak penjualan menyusul hari ini.', time: '09:15' },
    { from: 'Anindya Pramesti (KAP)', side: 'firm', text: 'Terima kasih. Mohon prioritaskan kontrak penjualan ≥ Rp 5 M karena sudah melewati tenggat.', time: '09:20' },
  ];

  /* ---- DMS: dokumen, versi, klasifikasi, retensi, legal hold ----
     Tiap dokumen: riwayat versi, log akses (lihat/unduh/cetak), tautan WP. */
  const DMS_DOCS = [
    { id: 'DOC-0312', name: 'Kertas Kerja Final — Sentosa Makmur FY2024', eng: 'ENG-2024-014', client: 'PT Sentosa Makmur Tbk', type: 'Kertas Kerja', ver: 3, classification: 'Rahasia', owner: 'Anindya Pramesti', modified: '2025-04-28', sizeMB: 184, retentionYears: 10, archivedOn: '2025-04-28', legalHold: false, assembly: 'complete',
      versions: [{ ver: 1, by: 'Anindya Pramesti', date: '2025-03-20', sizeMB: 176, note: 'Berkas dirakit pasca tanggal laporan.' }, { ver: 2, by: 'Hartono Wijaya', date: '2025-04-10', sizeMB: 181, note: 'Penambahan memo EQR & lampiran.' }, { ver: 3, by: 'Anindya Pramesti', date: '2025-04-28', sizeMB: 184, note: 'Final lock SA 230 — file dikunci.' }],
      access: [['Anindya Pramesti', 'lock', '2025-04-28 16:00'], ['Sari Dewanti', 'view', '2025-06-12 09:30'], ['Tim BPK', 'download', '2025-09-02 11:00']], linkedWP: ['A-100 Memo Strategi', 'X-900 Ringkasan Reviu'] },
    { id: 'DOC-0518', name: 'Laporan Auditor Independen — Mandiri Finance', eng: 'ENG-2025-047', client: 'PT Mandiri Sejahtera Finance', type: 'Laporan', ver: 2, classification: 'Rahasia', owner: 'Sari Dewanti', modified: '2026-02-22', sizeMB: 12, retentionYears: 10, archivedOn: '2026-02-25', legalHold: false, assembly: 'complete',
      versions: [{ ver: 1, by: 'Sari Dewanti', date: '2026-02-18', sizeMB: 11, note: 'Draf laporan untuk reviu partner.' }, { ver: 2, by: 'Sari Dewanti', date: '2026-02-22', sizeMB: 12, note: 'Final tertandatangani.' }],
      access: [['Sari Dewanti', 'view', '2026-02-22 14:20'], ['Rudi Gunawan', 'download', '2026-02-23 08:10']], linkedWP: ['R-700 Opini', 'R-100 Draf Laporan'] },
    { id: 'DOC-0623', name: 'Kertas Kerja — Sentosa Makmur FY2025', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', type: 'Kertas Kerja', ver: 7, classification: 'Rahasia', owner: 'Anindya Pramesti', modified: '2026-03-08', sizeMB: 142, retentionYears: 10, archivedOn: null, legalHold: false, assembly: 'in-progress', opinionDate: '2026-03-20',
      versions: [{ ver: 5, by: 'Dimas Raharjo', date: '2026-03-02', sizeMB: 128, note: 'Penyelesaian seksi piutang & kas.' }, { ver: 6, by: 'Fajar Nugroho', date: '2026-03-06', sizeMB: 137, note: 'Seksi aset tetap & persediaan.' }, { ver: 7, by: 'Anindya Pramesti', date: '2026-03-08', sizeMB: 142, note: 'Reviu manajer — catatan reviu ditambahkan.' }],
      access: [['Anindya Pramesti', 'edit', '2026-03-08 17:40'], ['Dimas Raharjo', 'edit', '2026-03-08 15:10'], ['Hartono Wijaya', 'view', '2026-03-07 10:00']], linkedWP: ['B-200 Aging Piutang', 'C-100 Kas & Bank', 'D-300 Aset Tetap'] },
    { id: 'DOC-0631', name: 'Surat Perikatan — Graha Properti', eng: 'ENG-2025-063', client: 'PT Graha Properti Nusantara', type: 'Surat Perikatan', ver: 1, classification: 'Internal', owner: 'Rudi Gunawan', modified: '2026-01-15', sizeMB: 1, retentionYears: 10, archivedOn: '2026-01-16', legalHold: true, assembly: 'complete', holdReason: 'Sengketa litigasi klien — tahan hingga putusan pengadilan.',
      versions: [{ ver: 1, by: 'Rudi Gunawan', date: '2026-01-15', sizeMB: 1, note: 'Surat perikatan tertandatangani.' }],
      access: [['Rudi Gunawan', 'view', '2026-01-16 09:00'], ['Legal KAP', 'lock', '2026-02-28 13:30']], linkedWP: ['A-010 Surat Perikatan'] },
    { id: 'DOC-0644', name: 'Memo EQR — Graha Properti', eng: 'ENG-2025-063', client: 'PT Graha Properti Nusantara', type: 'EQR', ver: 1, classification: 'Rahasia', owner: 'Hartono Wijaya', modified: '2026-03-07', sizeMB: 3, retentionYears: 10, archivedOn: null, legalHold: true, assembly: 'pending', holdReason: 'Sengketa litigasi klien — tahan hingga putusan pengadilan.',
      versions: [{ ver: 1, by: 'Hartono Wijaya', date: '2026-03-07', sizeMB: 3, note: 'Memo reviu pengendalian mutu perikatan.' }],
      access: [['Hartono Wijaya', 'edit', '2026-03-07 11:20'], ['Legal KAP', 'lock', '2026-03-07 18:00']], linkedWP: ['X-900 Ringkasan Reviu'] },
    { id: 'DOC-0701', name: 'Template Audit Methodology v4.2', eng: '—', client: 'Firma (Internal)', type: 'Template', ver: 4, classification: 'Internal', owner: 'KAP', modified: '2026-01-02', sizeMB: 8, retentionYears: 3, archivedOn: '2026-01-02', legalHold: false, assembly: 'n/a',
      versions: [{ ver: 3, by: 'Tim Metodologi', date: '2025-01-04', sizeMB: 7, note: 'Selaras ISA 2023.' }, { ver: 4, by: 'Tim Metodologi', date: '2026-01-02', sizeMB: 8, note: 'Pembaruan ISQM & SA 315 (revisi).' }],
      access: [['Anindya Pramesti', 'download', '2026-01-10 09:00'], ['Dimas Raharjo', 'download', '2026-02-01 08:30']], linkedWP: [] },
    { id: 'DOC-0205', name: 'Kertas Kerja Final — Bumi Hijau FY2021', eng: 'ENG-2021-008', client: 'PT Bumi Hijau Lestari', type: 'Kertas Kerja', ver: 2, classification: 'Rahasia', owner: 'Sari Dewanti', modified: '2022-03-30', sizeMB: 96, retentionYears: 10, archivedOn: '2022-03-30', legalHold: false, assembly: 'complete',
      versions: [{ ver: 1, by: 'Sari Dewanti', date: '2022-03-15', sizeMB: 92, note: 'Berkas dirakit.' }, { ver: 2, by: 'Sari Dewanti', date: '2022-03-30', sizeMB: 96, note: 'Final lock SA 230.' }],
      access: [['Sari Dewanti', 'lock', '2022-03-30 15:00'], ['Tim Mutu', 'view', '2024-05-18 10:00']], linkedWP: ['A-100 Memo Strategi'] },
  ];

  /* ---- Jasa selain Audit LK (SPAP): Asurans & Jasa Terkait ---- */
  /* Taksonomi SPAP: Asurans (Reviu SPR 2400 · Asurans lain SPA 3000/3402/3400)
     dan Selain Asurans/Jasa Terkait (AUP SPSJL 4400 · Kompilasi SPSJL 4410). */
  const NONAUDIT = [
    { id: 'REV-2025-022', client: 'PT Cahaya Logistik Nusantara', cat: 'Reviu', std: 'SPR 2400', stdLabel: 'Reviu Laporan Keuangan', assurance: 'Terbatas (negatif)', partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', fee: 380_000_000, deadline: '2026-05-31', progress: 60, status: 'Eksekusi', route: 'review2400' },
    { id: 'AUP-2025-047', client: 'PT Mandiri Sejahtera Finance', cat: 'Jasa Terkait', std: 'SPSJL 4400', stdLabel: 'Prosedur yang Disepakati', assurance: 'Tanpa asurans', partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', fee: 240_000_000, deadline: '2026-04-15', progress: 75, status: 'Eksekusi', route: 'relatedsvc' },
    { id: 'CMP-2025-071', client: 'PT Sinar Kreatif Mandiri', cat: 'Jasa Terkait', std: 'SPSJL 4410', stdLabel: 'Kompilasi Informasi Keuangan', assurance: 'Tanpa asurans', partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', fee: 90_000_000, deadline: '2026-04-10', progress: 80, status: 'Eksekusi', route: 'relatedsvc' },
    { id: 'ASR-2025-080', client: 'PT Hijau Energi Terbarukan', cat: 'Asurans Lain', std: 'SJAH 3410', stdLabel: 'Asurans Emisi GRK (Scope 1 & 2)', assurance: 'Terbatas', partner: 'Rudi Gunawan, CPA', manager: 'Anindya Pramesti', fee: 520_000_000, deadline: '2026-06-20', progress: 35, status: 'Perencanaan', route: 'assurance' },
    { id: 'ASR-2025-081', client: 'PT Payroll Solusi Indonesia', cat: 'Asurans Lain', std: 'SPA 3402', stdLabel: 'Laporan Pengendalian Organisasi Jasa (Type 2)', assurance: 'Memadai', partner: 'Hartono Wijaya, CPA', manager: 'Citra Halim', fee: 410_000_000, deadline: '2026-05-10', progress: 50, status: 'Eksekusi', route: 'assurance' },
    { id: 'PFI-2025-090', client: 'PT Mega Properti Sentosa', cat: 'Asurans Lain', std: 'SPA 3400', stdLabel: 'Pemeriksaan Informasi Keuangan Prospektif', assurance: 'Terbatas + WTM proyeksi', partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', fee: 300_000_000, deadline: '2026-04-30', progress: 20, status: 'Perencanaan', route: 'assurance' },
    { id: 'DD-2025-105', client: 'PT Mega Properti Sentosa', cat: 'Advisory', std: 'Non-Asurans', stdLabel: 'Financial Due Diligence', assurance: 'Tanpa asurans', partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', fee: 950_000_000, deadline: '2026-04-10', progress: 55, status: 'Eksekusi', route: 'duediligence' },
  ];
  /* SPR 2400 review workspace */
  const REVIEW_2400 = {
    id: 'REV-2025-022', client: 'PT Cahaya Logistik Nusantara', fy: 'FY2025', framework: 'SAK',
    analytics: [
      { metric: 'Margin laba kotor', py: '22,4%', cy: '18,1%', threshold: 3, varied: true, note: 'Penurunan 4,3 ppt — perlu inquiry atas kenaikan beban langsung.' },
      { metric: 'Rasio lancar', py: '1,8x', cy: '1,9x', threshold: 0.3, varied: false, note: '' },
      { metric: 'Perputaran piutang (hari)', py: '46', cy: '63', threshold: 10, varied: true, note: 'Naik 17 hari — inquiry kebijakan kredit & penyisihan.' },
      { metric: 'Rasio utang terhadap ekuitas', py: '1,1x', cy: '1,2x', threshold: 0.3, varied: false, note: '' },
      { metric: 'Pertumbuhan pendapatan', py: '+8%', cy: '+11%', threshold: 5, varied: false, note: '' },
    ],
    inquiries: [
      { q: 'Prinsip akuntansi & penerapan konsisten dengan tahun lalu', resp: 'Konsisten; tidak ada perubahan kebijakan.', done: true },
      { q: 'Transaksi luar biasa / pihak berelasi signifikan', resp: 'Pinjaman pemegang saham Rp 2 M, terungkap di CALK.', done: true },
      { q: 'Penyebab penurunan margin laba kotor', resp: 'Kenaikan harga BBM & sewa armada; wajar untuk industri.', done: true },
      { q: 'Kebijakan penyisihan piutang atas kenaikan umur piutang', resp: '', done: false },
      { q: 'Peristiwa kemudian (subsequent events) sampai tanggal laporan', resp: '', done: false },
      { q: 'Kelangsungan usaha — indikasi keraguan material', resp: 'Tidak ada indikasi; arus kas operasi positif.', done: true },
    ],
    conclusion: 'unmodified', // unmodified | qualified | adverse | disclaimer
  };
  /* ============================================================
     SPA / SPSJL 4400 — Perikatan Prosedur yang Disepakati (AUP)
     ------------------------------------------------------------
     SUMBER KEBENARAN TUNGGAL untuk perikatan AUP-2025-047. Setiap
     temuan faktual & status pengecualian DITARIK (dihitung) dari
     `measure` di tiap prosedur — TIDAK di-hardcode sebagai teks.
     Satu perubahan angka sumber mengalir konsisten ke:
       · Modul Jasa Terkait (view_relatedsvc · AUPPanel)
       · Laporan Temuan Faktual (view_nonaudit2 · NAReport)
       · Portofolio Jasa (view_nonaudit · progres dihitung engine)
       · Matriks Kepatuhan (SPA 4400)
     Konsumsi via AMS.aupEngine(exec).
     ============================================================ */
  const AUP_4400 = {
    id: 'AUP-2025-047',
    client: 'PT Mandiri Sejahtera Finance',
    requester: 'PT Bank Pembangunan Sindikasi (agen fasilitas, atas nama sindikasi kreditur)',
    recipients: 'Sindikasi kreditur perjanjian fasilitas kredit — penggunaan terbatas',
    subject: 'kepatuhan terhadap persyaratan rasio keuangan (financial covenant) perjanjian fasilitas kredit sindikasi per 31 Desember 2025',
    framework: 'SPSJL 4400 (selaras ISRS 4400 Revisian)',
    standard: 'SPSJL 4400',
    partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', preparer: 'Dimas Raharjo',
    fee: 240_000_000,
    engagedOn: '12 Jan 2026', cutoff: '31 Desember 2025', reportTarget: '15 Apr 2026', deadline: '2026-04-15',
    independence: 'Tidak disyaratkan oleh SPSJL 4400 — KAP tetap independen & status diungkap dalam laporan.',
    /* Persyaratan perikatan (acceptance & terms) — SPSJL 4400 ¶ penerimaan */
    terms: [
      { k: 'Sifat & tujuan dinyatakan jelas: melaporkan temuan faktual, bukan asurans', ok: true },
      { k: 'Prosedur yang akan dilaksanakan disepakati tertulis oleh KAP & pihak terkait', ok: true },
      { k: 'Kriteria pengukuran/perbandingan disepakati (klausul perjanjian kredit)', ok: true },
      { k: 'Pembatasan distribusi & penggunaan laporan disepakati', ok: true },
      { k: 'Akses ke catatan, dokumentasi, dan personel yang relevan dipastikan', ok: true },
      { k: 'Tanggal pelaksanaan & format pelaporan temuan faktual disepakati', ok: false },
    ],
    /* Prosedur yang disepakati. `measure` = angka sumber; temuan & pengecualian
       DIHITUNG oleh aupEngine — bukan teks tetap. seedDone = status awal. */
    procedures: [
      { no: 1, clause: 'Klausul 8.1(a)', proc: 'Hitung ulang Debt-to-Equity Ratio (D/E) dari laporan keuangan auditan dan bandingkan terhadap ambang yang disepakati.',
        measure: { label: 'D/E', op: 'lte', threshold: 2.5, computed: 2.30, unit: 'x', dp: 2,
          requirement: '≤ 2,50x', recompute: 'Liabilitas berbunga ÷ Total ekuitas', formula: '=B1/B2',
          inputs: [{ k: 'Liabilitas berbunga', v: 'Rp 138.000 jt', n: 138000 }, { k: 'Total ekuitas', v: 'Rp 60.000 jt', n: 60000 }],
          source: 'LK Auditan FY2025 (opini WTP, KAP lain) — Laporan Posisi Keuangan' },
        docs: [
          { name: 'LK Auditan FY2025 — PT Mandiri Sejahtera Finance.pdf', kind: 'pdf', src: 'Klien', status: 'received' },
          { name: 'Rekomputasi Rasio D-E.xlsx', kind: 'xlsx', src: 'KAP', status: 'received' },
        ], seedDone: true },
      { no: 2, clause: 'Klausul 8.1(b)', proc: 'Hitung ulang Debt Service Coverage Ratio (DSCR) dari LK auditan & jadwal amortisasi, bandingkan terhadap ambang.',
        measure: { label: 'DSCR', op: 'gte', threshold: 1.25, computed: 1.42, unit: 'x', dp: 2,
          requirement: '≥ 1,25x', recompute: 'EBITDA ÷ Beban layanan utang (pokok + bunga)', formula: '=B1/B2',
          inputs: [{ k: 'EBITDA', v: 'Rp 71.000 jt', n: 71000 }, { k: 'Pokok + bunga jatuh tempo', v: 'Rp 50.000 jt', n: 50000 }],
          source: 'LK Auditan FY2025 & jadwal amortisasi fasilitas' },
        docs: [
          { name: 'Jadwal Amortisasi Fasilitas Sindikasi.xlsx', kind: 'xlsx', src: 'Klien', status: 'received' },
          { name: 'Perhitungan EBITDA & DSCR.xlsx', kind: 'xlsx', src: 'KAP', status: 'received' },
          { name: 'LK Auditan FY2025 — Laba Rugi.pdf', kind: 'pdf', src: 'Klien', status: 'received' },
        ], seedDone: true },
      { no: 3, clause: 'Klausul 9.2', proc: 'Periksa saldo minimum rekening cadangan layanan utang (DSRA/escrow) terhadap ambang yang disyaratkan.',
        measure: { label: 'Saldo escrow', op: 'gte', threshold: 50000, computed: 38000, unit: ' jt', dp: 0, money: true,
          requirement: '≥ Rp 50.000 jt', recompute: 'Konfirmasi bank & rekening koran escrow 31 Des 2025', formula: '=B1',
          inputs: [{ k: 'Saldo escrow per konfirmasi bank', v: 'Rp 38.000 jt', n: 38000 }, { k: 'Saldo minimum disyaratkan', v: 'Rp 50.000 jt', n: 50000 }],
          source: 'Konfirmasi bank (selaras SA 505) & rekening koran escrow' },
        docs: [
          { name: 'Konfirmasi Bank — Rekening Escrow.pdf', kind: 'pdf', src: 'Bank', status: 'received' },
          { name: 'Rekening Koran Escrow Des 2025.pdf', kind: 'pdf', src: 'Bank', status: 'received' },
        ], seedDone: true },
      { no: 4, clause: 'Klausul 10.1', proc: 'Hitung rasio cakupan jaminan fidusia (nilai agunan ÷ baki debet) terhadap ambang yang disepakati.',
        measure: { label: 'Rasio cakupan jaminan', op: 'gte', threshold: 1.25, computed: 1.34, unit: 'x', dp: 2,
          requirement: '≥ 1,25x', recompute: 'Nilai agunan ÷ Baki debet fasilitas', formula: '=B1/B2',
          inputs: [{ k: 'Nilai agunan (daftar fidusia)', v: 'Rp 185.000 jt', n: 185000 }, { k: 'Baki debet fasilitas', v: 'Rp 138.000 jt', n: 138000 }],
          source: 'Sertifikat jaminan fidusia & daftar agunan terkini' },
        docs: [
          { name: 'Sertifikat Jaminan Fidusia.pdf', kind: 'pdf', src: 'Klien', status: 'received' },
          { name: 'Daftar Agunan Terkini.xlsx', kind: 'xlsx', src: 'Klien', status: 'received' },
        ], seedDone: true },
      { no: 5, clause: 'Klausul 7.3', proc: 'Telusur 12 angsuran 2025 ke mutasi rekening & advis bank; hitung jumlah keterlambatan pembayaran bunga/pokok.',
        measure: { label: 'angsuran terlambat', op: 'lte', threshold: 0, computed: 0, unit: '', dp: 0, count: true, of: 12,
          requirement: '0 keterlambatan', recompute: 'Telusur 12 angsuran bulanan ke mutasi rekening', formula: '=COUNTIF(terlambat)',
          inputs: [{ k: 'Angsuran tepat waktu', v: '12 dari 12', n: 12 }, { k: 'Keterlambatan', v: '0', n: 0 }],
          source: 'Mutasi rekening pembayaran & advis bank sepanjang 2025' },
        docs: [
          { name: 'Mutasi Rekening Pembayaran 2025.csv', kind: 'csv', src: 'Bank', status: 'pending' },
          { name: 'Advis Bank — Angsuran Bulanan.pdf', kind: 'pdf', src: 'Bank', status: 'pending' },
        ], seedDone: false },
    ],
  };
  /* ---- Engine AUP: hitung temuan faktual & status dari measure (pure) ----
     exec: peta { [no]: bool } status pelaksanaan (override seedDone).
     Jika exec tak diberi → dibaca dari localStorage; custom procs dari localStorage. */
  function aupNarrate(m, pass) {
    if (!m) return '';
    const f = (v) => fmt(v, m.dp || 0);
    if (m.count) {
      const ok = m.of - m.computed;
      return ok + ' dari ' + m.of + ' angsuran tepat waktu; ' + m.computed + ' keterlambatan — persyaratan ' + m.requirement + ' ' + (pass ? 'terpenuhi' : 'TIDAK terpenuhi') + '.';
    }
    const cv = m.money ? ('Rp ' + f(m.computed) + ' jt') : (f(m.computed) + m.unit);
    const gap = Math.abs(m.computed - m.threshold);
    const gapTxt = m.money ? ('Rp ' + f(gap) + ' jt') : (f(gap) + m.unit);
    return m.label + ' hasil rekomputasi ' + cv + '; persyaratan ' + m.requirement + ' — ' + (pass ? 'terpenuhi' : 'TIDAK terpenuhi (selisih ' + gapTxt + ')') + '.';
  }
  function aupEvalMeasure(m) {
    if (!m) return { pass: true, finding: '' };
    const pass = m.op === 'lte' ? (m.computed <= m.threshold) : (m.op === 'gte' ? (m.computed >= m.threshold) : true);
    return { pass, finding: aupNarrate(m, pass) };
  }
  function aupEngine(execArg, customArg) {
    const A = AUP_4400;
    let exec = execArg;
    if (!exec && typeof localStorage !== 'undefined') {
      try { exec = JSON.parse(localStorage.getItem('ams.v1.aup4400.exec') || 'null'); } catch (e) {}
    }
    exec = exec || {};
    let custom = customArg;
    if (!custom && typeof localStorage !== 'undefined') {
      try { custom = JSON.parse(localStorage.getItem('ams.v1.aup4400.custom') || 'null') || []; } catch (e) {}
    }
    custom = custom || [];
    const seeded = A.procedures.map(p => {
      const ev = aupEvalMeasure(p.measure);
      const done = (exec && Object.prototype.hasOwnProperty.call(exec, p.no)) ? !!exec[p.no] : !!p.seedDone;
      return { ...p, finding: ev.finding, pass: ev.pass, exception: !ev.pass, done };
    });
    const customP = (custom || []).map(c => ({ ...c, custom: true, pass: !c.exception }));
    const procedures = [...seeded, ...customP];
    const total = procedures.length;
    const done = procedures.filter(p => p.done).length;
    const exceptions = procedures.filter(p => p.done && p.exception).length;
    const progress = total ? Math.round((done / total) * 100) : 0;
    const ready = total > 0 && done === total;
    return { meta: A, procedures, total, done, exceptions, progress, ready,
      complete: done === total, anyException: exceptions > 0 };
  }
  /* Kompilasi SPSJL 4410 */
  const COMPILATION_4410 = {
    id: 'CMP-2025-071', client: 'PT Sinar Kreatif Mandiri (UMKM)', framework: 'SAK EMKM', period: 'FY2025',
    statements: [
      { name: 'Laporan Posisi Keuangan', compiled: true },
      { name: 'Laporan Laba Rugi', compiled: true },
      { name: 'Catatan atas Laporan Keuangan', compiled: true },
    ],
    sourceQuality: [
      { k: 'Buku besar & jurnal lengkap diterima', ok: true },
      { k: 'Rekening koran & rekonsiliasi bank', ok: true },
      { k: 'Daftar aset tetap & penyusutan', ok: true },
      { k: 'Rincian persediaan akhir', ok: true },
    ],
  };
  /* ============================================================
     SJAH 3400 — Pemeriksaan Informasi Keuangan Prospektif (PFI)
     ------------------------------------------------------------
     SUMBER KEBENARAN TUNGGAL untuk perikatan PFI-2025-090. Seluruh
     angka turunan (EBITDA, laba, CAGR, pajak, sensitivitas), status
     kewajaran asumsi, temuan prosedur, progres, bentuk simpulan, &
     paragraf peringatan (caveat WTM) DIHITUNG oleh `pfiEngine` dari
     `model` + `assumptions` + `procedures` — TIDAK di-hardcode.
     Satu perubahan angka sumber mengalir konsisten ke:
       · Modul SJAH 3400 (view_sjah3400 — halaman penuh)
       · Asurans Lain (view_relatedsvc · OtherAssurance — hal pokok)
       · Laporan Asurans Prospektif (view_nonaudit2 · NAReport)
       · Portofolio Jasa (view_nonaudit · progres dihitung engine)
       · Matriks Kepatuhan (SJAH 3400)
     Konsumsi via AMS.pfiEngine(exec).
     ============================================================ */
  const PFI_3400 = {
    id: 'PFI-2025-090', client: 'PT Mega Properti Sentosa',
    project: 'Apartemen Green Vista — Menara B',
    partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', preparer: 'Anindya Pramesti',
    std: 'SJAH 3400', framework: 'SJAH 3400 (selaras ISAE/SPA 3400)',
    /* Mengandung asumsi hipotetis ⇒ informasi prospektif berjenis PROYEKSI
       (bukan Prakiraan/forecast). Tingkat keyakinan: terbatas atas asumsi. */
    pfiType: 'Proyeksi', level: 'Terbatas',
    subject: 'Proyeksi Keuangan Proyek Apartemen Green Vista (Menara B) 2026–2028',
    intendedUser: 'PT Bank Pembangunan Sindikasi — calon kreditur fasilitas konstruksi (penggunaan terbatas)',
    purpose: 'Mendukung pengajuan fasilitas kredit konstruksi Menara B senilai Rp 180.000 jt.',
    criteria: 'Asumsi terbaik manajemen & asumsi hipotetis yang diungkap, disusun atas dasar PSAK yang konsisten dengan laporan keuangan historis auditan.',
    engagedOn: '20 Feb 2026', cutoff: '31 Desember 2025 (titik tolak proyeksi)',
    reportTarget: '30 Apr 2026', deadline: '2026-04-30',
    taxRate: 0.025, // PPh final pengalihan/penjualan properti — atas pendapatan
    independence: 'KAP independen terhadap klien sesuai Kode Etik IAPI; status diungkap dalam laporan.',
    /* Persyaratan penerimaan perikatan — SJAH 3400 ¶10–12 */
    terms: [
      { k: 'Tujuan & penggunaan PFI dinyatakan jelas dan dibatasi (intended user)', ok: true },
      { k: 'Sifat informasi prospektif disepakati: proyeksi (asumsi hipotetis) vs prakiraan', ok: true },
      { k: 'Unsur asumsi (terbaik vs hipotetis) & dasar penyusunan teridentifikasi', ok: true },
      { k: 'Periode yang dicakup tidak melampaui batas yang dapat diandalkan manajemen', ok: true },
      { k: 'Akses ke model, asumsi, & dokumentasi pendukung dipastikan', ok: true },
      { k: 'Format laporan & paragraf peringatan (caveat) disepakati tertulis', ok: false },
    ],
    /* Model proyeksi — ANGKA SUMBER (Rp jt). EBITDA/laba/pajak direkomputasi engine. */
    periods: ['2026P', '2027P', '2028P'],
    model: {
      rev:         [142000, 198000, 226000], // pendapatan (penjualan unit + sewa)
      opex:        [98000, 132000, 148000],  // beban operasional & pokok penjualan
      statedEbitda:[44000, 66000, 78000],    // EBITDA yang DISAJIKAN manajemen (engine cek tie vs rev−opex)
      da:          [9000, 11000, 12500],     // penyusutan & amortisasi
    },
    occupancy: { value: 78, lo: 72, hi: 82, market: 80 }, // % hunian — band kewajaran pasar
    /* Asumsi: best = terbaik manajemen; hypo = hipotetis ("andaikan"). */
    assumptions: [
      { id: 'A1', kind: 'best', k: 'Tingkat hunian stabil 78%', basis: 'Data hunian historis 24 bulan & survei pasar koridor', reasonable: true },
      { id: 'A2', kind: 'best', k: 'Kenaikan harga jual & sewa 6% p.a.', basis: 'Indeks harga properti regional & tren 3 tahun', reasonable: true },
      { id: 'A3', kind: 'best', k: 'Beban operasional naik sesuai inflasi 4% p.a.', basis: 'Proyeksi inflasi Bank Indonesia & kontrak vendor', reasonable: true },
      { id: 'A4', kind: 'hypo', k: 'Konstruksi Menara B selesai tepat waktu Q2-2027', basis: 'Andaikan tidak ada penundaan perizinan/material', reasonable: true, disclosed: true },
      { id: 'A5', kind: 'hypo', k: 'Fasilitas kredit konstruksi Rp 180.000 jt cair penuh 2026', basis: 'Andaikan persetujuan kredit sindikasi diperoleh', reasonable: true, disclosed: true },
    ],
    /* Prosedur pemeriksaan SJAH 3400. Temuan DIHITUNG oleh engine dari model
       & assumptions — bukan teks tetap. seedDone = status awal pelaksanaan. */
    procedures: [
      { no: 1, id: 'occ', ref: '¶17', short: 'Kewajaran asumsi hunian',
        proc: 'Evaluasi kewajaran asumsi tingkat hunian terhadap band data pasar & historis.', seedDone: true },
      { no: 2, id: 'cagr', ref: '¶17', short: 'Kewajaran pertumbuhan pendapatan',
        proc: 'Hitung CAGR pendapatan proyeksi dan uji kewajaran terhadap ambang pertumbuhan pasar.', seedDone: true },
      { no: 3, id: 'tie', ref: '¶19', short: 'Rekomputasi aritmetika model',
        proc: 'Rekomputasi aritmetika model proyeksi (EBITDA = Pendapatan − Beban) untuk seluruh periode.', seedDone: true },
      { no: 4, id: 'hypo', ref: '¶17', short: 'Asumsi hipotetis & pengungkapan',
        proc: 'Pastikan asumsi hipotetis konsisten dengan tujuan proyeksi dan diungkapkan secara memadai.', seedDone: false },
      { no: 5, id: 'consistency', ref: '¶18', short: 'Konsistensi dasar PSAK',
        proc: 'Uji konsistensi dasar penyusunan proyeksi dengan kebijakan akuntansi PSAK & LK historis.', seedDone: false },
      { no: 6, id: 'presentation', ref: '¶21', short: 'Penyajian & paragraf peringatan',
        proc: 'Telaah penyajian, pengungkapan asumsi, tanggal, dan paragraf peringatan (caveat) sesuai SJAH 3400.', seedDone: false },
    ],
  };
  /* ---- Engine PFI: hitung turunan, temuan, simpulan dari sumber (pure) ----
     exec: peta { [no]: bool } status pelaksanaan (override seedDone);
     bila tak diberi → dibaca dari localStorage. */

export { FX_RATES, BANK_ACCOUNTS, BANK_RECON, FIRM_BUDGET, CASH_FORECAST, FIXED_ASSETS, TAX_OBLIGATIONS, EFAKTUR, PPH_WITHHELD, CREDIT_NOTES, PAYROLL, PAYROLL_RATES, LEAVE_BALANCE, LEAVE_REQUESTS, PERF_CYCLE, SOQM_RISKS, COMPLAINTS, EQR_REVIEWS, PPPK_REPORT, PBC_REQUESTS, PORTAL_MSGS, DMS_DOCS, NONAUDIT, REVIEW_2400, AUP_4400, aupNarrate, aupEvalMeasure, aupEngine, COMPILATION_4410, PFI_3400 };
