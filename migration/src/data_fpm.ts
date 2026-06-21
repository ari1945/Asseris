/* ============================================================
   Asseris — Firm Practice Management · supplementary data
   New analytical dimensions for the deepened FPM modules. Plain
   JS; merged into AMS (data.js builds the base object).
   ============================================================ */
import { AMS } from './data';
(function () {
  const B = 1_000_000_000, M = 1_000_000;

  /* ---- CRM 360°: per-client relationship intelligence (keyed by clientId) ---- */
  const CRM_360 = {
    'C-014': { csat: 4.6, nps: 62, health: 88, sentiment: 'Positif', tenure: 10, dso: 41, billedYtd: 1_420 * M, outstanding: 430 * M, lastContact: '2026-03-04', partnerRel: 'Hartono Wijaya',
      contracts: [
        { id: 'CTR-014-A', type: 'Engagement Letter · Audit LK', value: 1_850 * M, start: '2026-01-12', end: '2026-06-30', status: 'Aktif', renewal: 'Auto-roll' },
        { id: 'CTR-014-B', type: 'Jasa Pajak (PPh Badan)', value: 320 * M, start: '2026-01-12', end: '2026-12-31', status: 'Aktif', renewal: 'Tahunan' },
      ],
      opps: [
        { id: 'OPP-201', svc: 'ESG Assurance (SJAH 3000)', value: 480 * M, stage: 'Proposal', prob: 55, close: '2026-05' },
        { id: 'OPP-202', svc: 'Reviu Pengendalian Internal', value: 260 * M, stage: 'Qualified', prob: 35, close: '2026-07' },
      ],
      activities: [
        { d: '2026-03-04', type: 'meeting', who: 'Hartono W.', note: 'Progress review Q1 dengan CFO & Komite Audit' },
        { d: '2026-02-18', type: 'call', who: 'Anindya P.', note: 'Klarifikasi cut-off pendapatan & rencana stock opname' },
        { d: '2026-01-12', type: 'doc', who: 'Sari D.', note: 'Engagement letter FY2025 ditandatangani' },
        { d: '2025-12-09', type: 'email', who: 'Anindya P.', note: 'Kick-off & permintaan PBC dikirim' },
      ] },
    'C-040': { csat: 4.2, nps: 48, health: 74, sentiment: 'Netral', tenure: 9, dso: 58, billedYtd: 980 * M, outstanding: 1_360 * M, lastContact: '2026-03-01', partnerRel: 'Rudi Gunawan',
      contracts: [{ id: 'CTR-040-A', type: 'Engagement Letter · Audit LK', value: 2_340 * M, start: '2026-01-20', end: '2026-07-15', status: 'Aktif', renewal: 'Tender 3-thn' }],
      opps: [{ id: 'OPP-205', svc: 'Audit Kepatuhan OJK', value: 540 * M, stage: 'Negotiation', prob: 70, close: '2026-04' }],
      activities: [
        { d: '2026-03-01', type: 'meeting', who: 'Rudi G.', note: 'Pembahasan model ECL PSAK 71 & data historis' },
        { d: '2026-02-10', type: 'call', who: 'Bayu S.', note: 'Eskalasi keterlambatan data pinjaman' },
        { d: '2026-01-20', type: 'doc', who: 'Rudi G.', note: 'Engagement letter ditandatangani (tender menang)' },
      ] },
    'C-031': { csat: 3.9, nps: 31, health: 61, sentiment: 'Perlu Perhatian', tenure: 6, dso: 72, billedYtd: 620 * M, outstanding: 980 * M, lastContact: '2026-02-25', partnerRel: 'Hartono Wijaya',
      contracts: [{ id: 'CTR-031-A', type: 'Engagement Letter · Audit LK', value: 1_120 * M, start: '2026-02-02', end: '2026-07-31', status: 'Aktif', renewal: 'Tahunan' }],
      opps: [{ id: 'OPP-208', svc: 'Due Diligence Akuisisi Lahan', value: 720 * M, stage: 'Lead', prob: 20, close: '2026-08' }],
      activities: [
        { d: '2026-02-25', type: 'meeting', who: 'Hartono W.', note: 'Diskusi sengketa lahan & going concern' },
        { d: '2026-02-02', type: 'doc', who: 'Anindya P.', note: 'Engagement letter ditandatangani' },
        { d: '2026-01-15', type: 'email', who: 'Anindya P.', note: 'Tindak lanjut invoice tertunggak 60+ hari' },
      ] },
    'C-022': { csat: 4.4, nps: 55, health: 82, sentiment: 'Positif', tenure: 7, dso: 38, billedYtd: 540 * M, outstanding: 180 * M, lastContact: '2026-02-28', partnerRel: 'Sari Dewanti',
      contracts: [{ id: 'CTR-022-A', type: 'Engagement Letter · Reviu (SPR 2400)', value: 720 * M, start: '2026-02-05', end: '2026-08-31', status: 'Aktif', renewal: 'Tahunan' }],
      opps: [{ id: 'OPP-210', svc: 'Upgrade ke Audit Penuh', value: 360 * M, stage: 'Qualified', prob: 40, close: '2026-09' }],
      activities: [
        { d: '2026-02-28', type: 'call', who: 'Bayu S.', note: 'Konfirmasi ruang lingkup reviu interim' },
        { d: '2026-02-05', type: 'doc', who: 'Sari D.', note: 'Engagement letter SPR 2400 ditandatangani' },
      ] },
    'C-047': { csat: 4.7, nps: 70, health: 90, sentiment: 'Positif', tenure: 4, dso: 29, billedYtd: 290 * M, outstanding: 60 * M, lastContact: '2026-03-03', partnerRel: 'Sari Dewanti',
      contracts: [{ id: 'CTR-047-A', type: 'Agreed-Upon Procedures', value: 410 * M, start: '2026-02-14', end: '2026-09-30', status: 'Aktif', renewal: 'Per-proyek' }],
      opps: [{ id: 'OPP-212', svc: 'SOC 1 Type II (Service Org)', value: 620 * M, stage: 'Proposal', prob: 50, close: '2026-06' }],
      activities: [
        { d: '2026-03-03', type: 'meeting', who: 'Sari D.', note: 'Demo platform & scoping SOC report' },
        { d: '2026-02-14', type: 'doc', who: 'Bayu S.', note: 'AUP engagement letter ditandatangani' },
      ] },
    'C-058': { csat: 4.3, nps: 50, health: 79, sentiment: 'Netral', tenure: 8, dso: 44, billedYtd: 580 * M, outstanding: 0, lastContact: '2026-02-20', partnerRel: 'Rudi Gunawan',
      contracts: [{ id: 'CTR-058-A', type: 'Engagement Letter · Audit LK', value: 580 * M, start: '2025-12-15', end: '2026-02-28', status: 'Selesai', renewal: 'Tahunan' }],
      opps: [],
      activities: [
        { d: '2026-02-20', type: 'doc', who: 'Citra H.', note: 'Laporan audit diterbitkan (WTP) & arsip' },
        { d: '2026-02-12', type: 'meeting', who: 'Rudi G.', note: 'Closing meeting & management letter' },
      ] },
    'C-063': { csat: 4.0, nps: 38, health: 68, sentiment: 'Perlu Perhatian', tenure: 11, dso: 63, billedYtd: 1_180 * M, outstanding: 520 * M, lastContact: '2026-03-02', partnerRel: 'Rudi Gunawan',
      contracts: [{ id: 'CTR-063-A', type: 'Engagement Letter · Audit LK', value: 1_640 * M, start: '2025-12-20', end: '2026-05-31', status: 'Aktif', renewal: 'Rotasi partner 2026' }],
      opps: [{ id: 'OPP-214', svc: 'Valuasi Properti Independen', value: 450 * M, stage: 'Lost', prob: 0, close: '2026-02' }],
      activities: [
        { d: '2026-03-02', type: 'meeting', who: 'Rudi G.', note: 'EQR clearance & resolusi temuan revaluasi' },
        { d: '2026-02-08', type: 'call', who: 'Citra H.', note: 'Diskusi rotasi partner wajib (SA 700/PPPK)' },
      ] },
  };

  const ACTIVITY_META = {
    meeting: { icon: 'users', color: '#005085', label: 'Rapat' },
    call: { icon: 'pulse', color: '#0a6b73', label: 'Telepon' },
    email: { icon: 'mail', color: '#5b3fa6', label: 'Email' },
    doc: { icon: 'doc', color: '#9a6a00', label: 'Dokumen' },
  };

  /* ---- Engagement detail: WBS, staffing, budget-by-phase, billing milestones ---- */
  const ENG_DETAIL = {
    'ENG-2025-014': {
      wbs: [
        { phase: 'Perencanaan', task: 'Penilaian risiko & materialitas', owner: 'Anindya P.', plan: 120, actual: 124, status: 'Selesai', pct: 100 },
        { phase: 'Perencanaan', task: 'Pemahaman entitas & ICFR', owner: 'Dimas R.', plan: 90, actual: 88, status: 'Selesai', pct: 100 },
        { phase: 'Eksekusi', task: 'Substantif Pendapatan & Piutang', owner: 'Dimas R.', plan: 260, actual: 188, status: 'Berjalan', pct: 72 },
        { phase: 'Eksekusi', task: 'Substantif Persediaan (stock opname)', owner: 'Sinta W.', plan: 240, actual: 156, status: 'Berjalan', pct: 65 },
        { phase: 'Eksekusi', task: 'Aset Tetap & Sewa (PSAK 73)', owner: 'Sinta W.', plan: 180, actual: 92, status: 'Berjalan', pct: 51 },
        { phase: 'Finalisasi', task: 'Penyelesaian, SAD & opini', owner: 'Anindya P.', plan: 200, actual: 0, status: 'Belum', pct: 0 },
        { phase: 'Finalisasi', task: 'EQR & penerbitan laporan', owner: 'Hartono W.', plan: 120, actual: 0, status: 'Belum', pct: 0 },
      ],
      staffing: [
        { name: 'Hartono Wijaya', role: 'Partner', alloc: 8, hrs: 64, rate: 2_400_000 },
        { name: 'Anindya Pramesti', role: 'Manager', alloc: 35, hrs: 412, rate: 1_100_000 },
        { name: 'Dimas Riyadi', role: 'Senior', alloc: 90, hrs: 386, rate: 650_000 },
        { name: 'Sinta Wahyuni', role: 'Senior', alloc: 85, hrs: 198, rate: 650_000 },
        { name: 'Rafi Pratama', role: 'Staff', alloc: 100, hrs: 86, rate: 380_000 },
      ],
      budgetByPhase: [
        { phase: 'Perencanaan', budget: 380, actual: 372, color: '#5b3fa6' },
        { phase: 'Eksekusi', budget: 920, actual: 612, color: '#005085' },
        { phase: 'Finalisasi', budget: 420, actual: 122, color: '#9a6a00' },
        { phase: 'Arsip', budget: 120, actual: 40, color: '#1f7a4d' },
      ],
      billing: [
        { milestone: 'Retainer awal (30%)', pct: 30, amount: 555 * M, status: 'Tertagih', date: '2026-01-15' },
        { milestone: 'Selesai fieldwork (40%)', pct: 40, amount: 740 * M, status: 'WIP', date: '2026-03-31' },
        { milestone: 'Penerbitan laporan (30%)', pct: 30, amount: 555 * M, status: 'Belum', date: '2026-06-30' },
      ],
    },
  };
  /* default detail generator for engagements without bespoke data */
  (ENG_DETAIL as any)._default = function (e) {
    const f = e.budgetHrs;
    return {
      wbs: [
        { phase: 'Perencanaan', task: 'Penerimaan & penilaian risiko', owner: e.manager.split(' ')[0] + '.', plan: Math.round(f * 0.18), actual: Math.round(f * 0.18 * Math.min(1, e.progress / 28)), status: e.progress > 28 ? 'Selesai' : 'Berjalan', pct: Math.min(100, Math.round(e.progress / 28 * 100)) },
        { phase: 'Eksekusi', task: 'Prosedur substantif inti', owner: e.manager.split(' ')[0] + '.', plan: Math.round(f * 0.5), actual: Math.round(f * 0.5 * Math.max(0, Math.min(1, (e.progress - 28) / 50))), status: e.progress > 78 ? 'Selesai' : e.progress > 28 ? 'Berjalan' : 'Belum', pct: Math.max(0, Math.min(100, Math.round((e.progress - 28) / 50 * 100))) },
        { phase: 'Finalisasi', task: 'Penyelesaian, SAD & opini', owner: e.partner.split(' ')[0] + '.', plan: Math.round(f * 0.22), actual: Math.round(f * 0.22 * Math.max(0, (e.progress - 78) / 22)), status: e.progress >= 100 ? 'Selesai' : e.progress > 78 ? 'Berjalan' : 'Belum', pct: Math.max(0, Math.round((e.progress - 78) / 22 * 100)) },
        { phase: 'Arsip', task: 'Arsip kertas kerja (ISQM)', owner: 'Sistem', plan: Math.round(f * 0.1), actual: e.phase === 'Arsip' ? Math.round(f * 0.1) : 0, status: e.phase === 'Arsip' ? 'Selesai' : 'Belum', pct: e.phase === 'Arsip' ? 100 : 0 },
      ],
      staffing: [
        { name: e.partner.split(',')[0], role: 'Partner', alloc: 7, hrs: Math.round(e.actualHrs * 0.05), rate: 2_400_000 },
        { name: e.manager, role: 'Manager', alloc: 32, hrs: Math.round(e.actualHrs * 0.32), rate: 1_100_000 },
        { name: 'Tim Senior', role: 'Senior', alloc: 85, hrs: Math.round(e.actualHrs * 0.45), rate: 650_000 },
        { name: 'Tim Staff', role: 'Staff', alloc: 100, hrs: Math.round(e.actualHrs * 0.18), rate: 380_000 },
      ],
      budgetByPhase: [
        { phase: 'Perencanaan', budget: Math.round(f * 0.18), actual: Math.round(f * 0.18 * Math.min(1, e.progress / 28)), color: '#5b3fa6' },
        { phase: 'Eksekusi', budget: Math.round(f * 0.5), actual: Math.round(f * 0.5 * Math.max(0, Math.min(1, (e.progress - 28) / 50))), color: '#005085' },
        { phase: 'Finalisasi', budget: Math.round(f * 0.22), actual: Math.round(f * 0.22 * Math.max(0, (e.progress - 78) / 22)), color: '#9a6a00' },
        { phase: 'Arsip', budget: Math.round(f * 0.1), actual: e.phase === 'Arsip' ? Math.round(f * 0.1) : 0, color: '#1f7a4d' },
      ],
      billing: [
        { milestone: 'Retainer awal (30%)', pct: 30, amount: 0, status: e.progress > 10 ? 'Tertagih' : 'Belum', date: '—' },
        { milestone: 'Selesai fieldwork (40%)', pct: 40, amount: 0, status: e.progress > 80 ? 'Tertagih' : e.progress > 40 ? 'WIP' : 'Belum', date: '—' },
        { milestone: 'Penerbitan laporan (30%)', pct: 30, amount: 0, status: e.progress >= 100 ? 'Tertagih' : 'Belum', date: '—' },
      ],
    };
  };

  /* ---- Risk: control catalogue mapped to RoMM + residual trend ---- */
  const RISK_CONTROLS = [
    { id: 'CTL-01', area: 'Pendapatan', name: 'Three-way match order–delivery–invoice', type: 'Preventive', freq: 'Per transaksi', owner: 'Controller', auto: true, effective: 'Efektif', tested: true, dev: false, risks: ['R-01'] },
    { id: 'CTL-02', area: 'Pendapatan', name: 'Reviu cut-off penjualan akhir bulan', type: 'Detective', freq: 'Bulanan', owner: 'Fin. Manager', auto: false, effective: 'Sebagian', tested: true, dev: true, risks: ['R-01'] },
    { id: 'CTL-03', area: 'Persediaan', name: 'Perhitungan fisik siklus & rekonsiliasi', type: 'Detective', freq: 'Bulanan', owner: 'Gudang', auto: false, effective: 'Efektif', tested: true, dev: false, risks: ['R-02'] },
    { id: 'CTL-04', area: 'Persediaan', name: 'Reviu persediaan usang & NRV', type: 'Detective', freq: 'Kuartalan', owner: 'Controller', auto: false, effective: 'Tidak Efektif', tested: true, dev: true, risks: ['R-02'] },
    { id: 'CTL-05', area: 'Piutang Usaha', name: 'Model ECL & aging review (PSAK 71)', type: 'Detective', freq: 'Bulanan', owner: 'Credit Mgr', auto: true, effective: 'Sebagian', tested: true, dev: true, risks: ['R-03'] },
    { id: 'CTL-06', area: 'Aset Tetap', name: 'Otorisasi pelepasan & register aset', type: 'Preventive', freq: 'Per transaksi', owner: 'Fin. Manager', auto: false, effective: 'Efektif', tested: true, dev: false, risks: ['R-04'] },
    { id: 'CTL-07', area: 'Management Override', name: 'Reviu & otorisasi jurnal manual', type: 'Detective', freq: 'Bulanan', owner: 'CFO', auto: true, effective: 'Sebagian', tested: false, dev: false, risks: ['R-05'] },
    { id: 'CTL-08', area: 'Management Override', name: 'Segregation of duties (akses ERP)', type: 'Preventive', freq: 'Berkelanjutan', owner: 'IT GRC', auto: true, effective: 'Efektif', tested: true, dev: false, risks: ['R-05'] },
    { id: 'CTL-09', area: 'Sewa (PSAK 73)', name: 'Registrasi kontrak sewa terpusat', type: 'Preventive', freq: 'Per kontrak', owner: 'Legal', auto: false, effective: 'Sebagian', tested: true, dev: true, risks: ['R-06'] },
    { id: 'CTL-10', area: 'Imbalan Kerja', name: 'Reviu asumsi aktuaria tahunan', type: 'Detective', freq: 'Tahunan', owner: 'HR + Aktuaris', auto: false, effective: 'Efektif', tested: true, dev: false, risks: ['R-07'] },
    { id: 'CTL-11', area: 'Pihak Berelasi', name: 'Deklarasi & register pihak berelasi', type: 'Preventive', freq: 'Tahunan', owner: 'Corp. Sec.', auto: false, effective: 'Sebagian', tested: false, dev: false, risks: ['R-08'] },
  ];

  /* inherent → residual trajectory across planning checkpoints (per risk id) */
  const RISK_TREND = {
    periods: ['Penilaian Awal', 'Pasca Kontrol', 'Interim', 'Saat Ini'],
    series: {
      'R-01': [20, 16, 14, 12], 'R-02': [16, 14, 12, 12], 'R-03': [16, 13, 12, 11],
      'R-04': [9, 6, 6, 6], 'R-05': [20, 16, 15, 15], 'R-06': [9, 7, 6, 6],
      'R-07': [9, 6, 6, 6], 'R-08': [12, 9, 8, 8],
    },
    firmAvg: [13.9, 10.9, 9.9, 9.5],
  };

  /* ---- BI extra: revenue by industry, AR aging, win/loss, retention ---- */
  const BI_INDUSTRY = [
    { industry: 'Jasa Keuangan', rev: 2.34 * B, clients: 1, color: '#005085' },
    { industry: 'Manufaktur', rev: 2.43 * B, clients: 2, color: '#0a6b73' },
    { industry: 'Properti', rev: 1.64 * B, clients: 1, color: '#5b3fa6' },
    { industry: 'Agribisnis', rev: 1.12 * B, clients: 1, color: '#1f7a4d' },
    { industry: 'Transportasi', rev: 0.72 * B, clients: 1, color: '#9a6a00' },
    { industry: 'Teknologi', rev: 0.41 * B, clients: 1, color: '#b3508a' },
  ];
  const BI_AR_AGING = [
    { bucket: 'Lancar (0–30)', amount: 1_840 * M, color: '#1f7a4d' },
    { bucket: '31–60 hari', amount: 1_120 * M, color: '#caa53d' },
    { bucket: '61–90 hari', amount: 680 * M, color: '#d98324' },
    { bucket: '> 90 hari', amount: 420 * M, color: '#b3261e' },
  ];
  const BI_WINLOSS = {
    won: 6, lost: 2, winRate: 75,
    byQuarter: [{ q: 'Q1', w: 1, l: 1 }, { q: 'Q2', w: 2, l: 0 }, { q: 'Q3', w: 1, l: 1 }, { q: 'Q4', w: 2, l: 0 }],
    lossReasons: [{ r: 'Harga / fee', n: 1 }, { r: 'Rotasi wajib', n: 1 }],
  };
  const BI_RETENTION = {
    cohorts: [
      { year: '2021', start: 8, retained: [8, 8, 7, 7, 6] },
      { year: '2022', start: 7, retained: [7, 7, 6, 6] },
      { year: '2023', start: 9, retained: [9, 8, 8] },
      { year: '2024', start: 6, retained: [6, 6] },
      { year: '2025', start: 5, retained: [5] },
    ],
    logoRetention: 94, netRevRetention: 108,
  };

  /* ---- Data Flow: integrity rule catalogue + audit trail ---- */
  const INTEGRITY_RULES = [
    { id: 'IR-01', cat: 'Referensial', rule: 'Setiap perikatan tertaut ke satu klien master', severity: 'Kritis', scope: 'Firma', status: 'pass', detail: '7/7 perikatan tervalidasi' },
    { id: 'IR-02', cat: 'Referensial', rule: 'Partner perikatan = partner master klien', severity: 'Tinggi', scope: 'Firma', status: 'warn', detail: '1 ketidaksesuaian (rotasi)' },
    { id: 'IR-03', cat: 'Konsistensi', rule: 'Materialitas ditetapkan sebelum eksekusi', severity: 'Tinggi', scope: 'Perikatan', status: 'pass', detail: 'Semua perikatan eksekusi terisi' },
    { id: 'IR-04', cat: 'Keseimbangan', rule: 'WTB seimbang (debit = kredit)', severity: 'Kritis', scope: 'Perikatan', status: 'pass', detail: 'Selisih < 0,5%' },
    { id: 'IR-05', cat: 'Kelengkapan', rule: 'NPWP klien valid & terisi', severity: 'Sedang', scope: 'Firma', status: 'warn', detail: '1 NPWP perlu verifikasi' },
    { id: 'IR-06', cat: 'Kelengkapan', rule: 'RoMM dinilai untuk tiap perikatan aktif', severity: 'Tinggi', scope: 'Perikatan', status: 'pass', detail: '8 risiko terdaftar' },
    { id: 'IR-07', cat: 'Otorisasi', rule: 'AJE diposting memiliki approver', severity: 'Tinggi', scope: 'Perikatan', status: 'pass', detail: 'Seluruh AJE Posted ter-review' },
    { id: 'IR-08', cat: 'Independensi', rule: 'Konfirmasi independensi tim diperoleh', severity: 'Kritis', scope: 'Firma', status: 'pass', detail: 'Semua anggota terkonfirmasi' },
    { id: 'IR-09', cat: 'Konsentrasi', rule: 'Klien tunggal < 25% pendapatan firma', severity: 'Sedang', scope: 'Firma', status: 'warn', detail: 'Klien terbesar 25,4%' },
    { id: 'IR-10', cat: 'Retensi', rule: 'Arsip kertas kerja ≤ 60 hari pasca laporan (ISQM)', severity: 'Tinggi', scope: 'Firma', status: 'pass', detail: '1 arsip dalam tenggat' },
  ];
  const AUDIT_TRAIL = [
    { ts: '2026-03-05 09:42', user: 'Anindya P.', action: 'Mengubah skor risiko', entity: 'R-01 Pendapatan → 12', module: 'risk' },
    { ts: '2026-03-05 08:15', user: 'Sistem', action: 'Propagasi materialitas', entity: 'ENG-2025-014 → 6 modul', module: 'dataflow' },
    { ts: '2026-03-04 16:30', user: 'Dimas R.', action: 'Memposting AJE', entity: 'AJE-05 Penyusutan', module: 'aje' },
    { ts: '2026-03-04 14:02', user: 'Hartono W.', action: 'Mengkliring catatan reviu', entity: 'RN-04', module: 'risk' },
    { ts: '2026-03-04 11:20', user: 'Sari D.', action: 'Memperbarui profil klien', entity: 'C-014 · annual fee', module: 'crm' },
    { ts: '2026-03-03 15:48', user: 'Bayu S.', action: 'Memindah fase perikatan', entity: 'ENG-2025-040 → Eksekusi', module: 'engagement' },
    { ts: '2026-03-03 10:05', user: 'Sistem', action: 'Cek integritas terjadwal', entity: '24 aturan dievaluasi', module: 'dataflow' },
    { ts: '2026-03-02 17:12', user: 'Citra H.', action: 'Menerbitkan laporan audit', entity: 'ENG-2025-058 (WTP)', module: 'opinion' },
  ];

  /* ---- merge into AMS ---- */
  const add = { CRM_360, ACTIVITY_META, ENG_DETAIL, RISK_CONTROLS, RISK_TREND, BI_INDUSTRY, BI_AR_AGING, BI_WINLOSS, BI_RETENTION, INTEGRITY_RULES, AUDIT_TRAIL };
  Object.assign(AMS, add);
})();


/* [legacy slice 10a] AMS kini di-import dari ./data.js (owner data.js tetap dual-publish). */
