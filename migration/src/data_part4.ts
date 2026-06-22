/* ============================================================
   Asseris — data part4 (seed + engine) (W3 split dari data.js; perilaku identik).
   ============================================================ */
import { CLIENTS, ENGAGEMENTS, PIPELINE, PROSPECTS, STAFF } from './data_part1';
import { NONAUDIT } from './data_part2';

  const DD_OPP  = PIPELINE.find(o => o.id === 'OPP-105')!;
  const DD_PROS = PROSPECTS.find(p => p.id === 'PROS-06')!;
  const DD_REG  = NONAUDIT.find(n => n.id === 'DD-2025-105')!;

  const DD_EBITDA_BRIDGE = [
    { k: 'EBITDA dilaporkan', v: 84_000_000_000, type: 'base' },
    { k: '(+) Beban non-rutin (one-off legal)', v: 3_200_000_000, type: 'add' },
    { k: '(+) Normalisasi gaji pemilik di atas pasar', v: 2_400_000_000, type: 'add' },
    { k: '(−) Pendapatan non-berulang (penjualan aset)', v: -5_600_000_000, type: 'less' },
    { k: '(−) Penyesuaian sewa pihak berelasi ke harga pasar', v: -1_800_000_000, type: 'less' },
    { k: 'EBITDA ternormalisasi', v: 82_200_000_000, type: 'total' },
  ];
  const DD_NORM_EBITDA = DD_EBITDA_BRIDGE.find(b => b.type === 'total')!.v / 1e9; // 82,2 miliar

  const DUE_DILIGENCE = {
    /* ---- identitas ditarik dari satu sumber kebenaran ---- */
    id: DD_REG.id,
    client: DD_REG.client,                 // pihak pengakuisisi (klien kami)
    partner: DD_REG.partner,
    manager: DD_REG.manager,
    fee: DD_REG.fee,
    deadline: DD_REG.deadline,
    progress: DD_REG.progress,
    status: DD_REG.status,
    std: 'Non-Asurans (Advisory)',
    sourceOpp: DD_OPP.id,                  // CRM/Pipeline
    sourceProspect: DD_PROS.id,            // Onboarding
    relatedEng: 'PFI-2025-090',            // pemeriksaan proyeksi (SPA 3400) klien sama
    acceptance: DD_PROS.acceptance,        // reuse keputusan akseptasi onboarding
    pmpj: DD_PROS.pmpj,                    // reuse PMPJ/APU-PPT onboarding
    letter: DD_PROS.letter,               // reuse surat perikatan onboarding
    npwp: DD_PROS.npwp,
    budgetHrs: DD_PROS.budgetHrs,

    /* ---- konteks transaksi ---- */
    target: 'PT Graha Vista Land',
    targetDesc: 'Pengembang & pemilik land bank kawasan Bekasi–Karawang.',
    dealType: 'Akuisisi 70% saham (pengendali)',
    stakePct: 70,
    rationale: 'Ekspansi land bank & integrasi vertikal pengembangan; sinergi penjualan unit residensial.',
    period: 'TTM s.d. 31 Des 2025',
    scopePeriods: ['FY2023', 'FY2024', 'TTM Des-2025'],
    basis: 'Completion accounts (diusulkan) — penyesuaian harga atas net debt & modal kerja aktual saat penutupan.',

    /* ---- QoE: jembatan normalisasi EBITDA (rupiah penuh) ---- */
    ebitdaBridge: DD_EBITDA_BRIDGE,
    normEbitda: DD_NORM_EBITDA,            // Rp miliar

    /* ---- QoE: tren bulanan TTM (pendapatan Rp miliar & margin EBITDA ternormalisasi %) ---- */
    qoeMonthly: [
      { m: 'Jan', rev: 29.4, mgn: 21.0 }, { m: 'Feb', rev: 27.8, mgn: 20.4 },
      { m: 'Mar', rev: 33.1, mgn: 22.6 }, { m: 'Apr', rev: 30.2, mgn: 21.8 },
      { m: 'Mei', rev: 28.6, mgn: 20.9 }, { m: 'Jun', rev: 35.4, mgn: 23.4 },
      { m: 'Jul', rev: 31.0, mgn: 22.0 }, { m: 'Agu', rev: 29.9, mgn: 21.5 },
      { m: 'Sep', rev: 34.7, mgn: 23.1 }, { m: 'Okt', rev: 32.5, mgn: 22.4 },
      { m: 'Nov', rev: 30.8, mgn: 21.7 }, { m: 'Des', rev: 30.6, mgn: 22.2 },
    ],
    revQuality: { recurringPct: 88, retentionPct: 91, organicGrowth: 9 },
    customers: [
      { name: 'Pelanggan A — kontrak berakhir 2026', pct: 24, flag: true },
      { name: 'Pelanggan B', pct: 14, flag: false },
      { name: 'Pelanggan C', pct: 9, flag: false },
      { name: 'Pelanggan D', pct: 7, flag: false },
      { name: 'Pelanggan E', pct: 5, flag: false },
      { name: 'Pelanggan lain (long tail)', pct: 41, flag: false },
    ],

    /* ---- Net debt & item debt-like (Rp miliar; tanda + = utang, − = kas) ---- */
    netDebtBridge: [
      { k: 'Pinjaman bank berbunga', v: 120.0, kind: 'debt' },
      { k: 'Liabilitas sewa (PSAK 73)', v: 18.0, kind: 'debt' },
      { k: 'Pinjaman pemegang saham', v: 12.0, kind: 'debtlike' },
      { k: 'Kas & setara kas', v: -22.0, kind: 'cash' },
      { k: 'Imbalan pasca-kerja kurang dicatat (temuan QoE)', v: 6.5, kind: 'debtlike', found: true },
      { k: 'Eksposur PPN belum dibayar (temuan pajak)', v: 4.2, kind: 'debtlike', found: true },
      { k: 'Dividen diumumkan belum dibayar', v: 3.6, kind: 'debtlike' },
    ],

    /* ---- Modal kerja: tren bulanan TTM (Rp miliar) & peg ternormalisasi ---- */
    nwcMonthly: [42.0, 40.5, 39.2, 44.1, 47.3, 41.0, 36.4, 34.0, 33.2, 35.1, 32.0, 30.0],
    nwcPeg: 38.0,                          // target modal kerja ternormalisasi (rata-rata 12 bln)
    nwcCompletion: 30.0,                   // posisi saat penutupan (di bawah peg → kurang)

    /* ---- Valuasi & harga (Rp miliar) ---- */
    valuation: {
      multiple: 7.5,                       // EV / EBITDA ternormalisasi (DD-adjusted)
      preDdMultiple: 8.0,                  // basis tawaran awal (atas EBITDA dilaporkan)
    },

    /* ---- Eksposur pajak (Rp miliar) ---- */
    taxExposure: [
      { item: 'PPN kurang bayar (masa 2024)', exposure: 4.2, likelihood: 'Tinggi', status: 'Teridentifikasi' },
      { item: 'Sengketa PPh Badan 2023', exposure: 9.5, likelihood: 'Sedang', status: 'Banding — Pengadilan Pajak' },
      { item: 'PPh 21 kurang potong', exposure: 1.3, likelihood: 'Rendah', status: 'Teridentifikasi' },
    ],

    /* ---- Komitmen & kontinjensi (Rp miliar) ---- */
    contingencies: [
      { item: 'Komitmen pembelian lahan (land bank)', value: 85.0, kind: 'Komitmen modal', due: 'Jatuh tempo 2026' },
      { item: 'Garansi bank ke kontraktor', value: 22.0, kind: 'Kontinjensi', due: 'Berlaku s.d. 2027' },
      { item: 'Litigasi sengketa lahan (perdata)', value: 15.0, kind: 'Kontinjensi', due: 'Proses berjalan' },
      { item: 'Jaminan korporat atas utang afiliasi', value: 30.0, kind: 'Kontinjensi', due: 'Off-balance sheet' },
    ],

    /* ---- Workstream (lead, progres, flag) ---- */
    workstreams: [
      { area: 'Quality of Earnings (QoE)', status: 'Selesai', flags: 1, pct: 100, lead: 'Dimas Raharjo', note: 'Pendapatan berulang 88%; satu pelanggan = 24% pendapatan (risiko konsentrasi).' },
      { area: 'Net Debt & Debt-like Items', status: 'Selesai', flags: 1, pct: 100, lead: 'Citra Halim', note: 'Net debt Rp 142 M; ditemukan liabilitas imbalan kerja kurang dicatat Rp 6,5 M.' },
      { area: 'Normalized Working Capital', status: 'Berjalan', flags: 1, pct: 65, lead: 'Sinta Wulandari', note: 'Peg WC ternormalisasi Rp 38 M; posisi penutupan Rp 30 M (kurang Rp 8 M).' },
      { area: 'Tax Exposure', status: 'Berjalan', flags: 2, pct: 50, lead: 'Bayu Saputra', note: 'Potensi kurang bayar PPN Rp 4,2 M & sengketa PPh Badan 2023 belum selesai.' },
      { area: 'Komitmen & Kontinjensi', status: 'Belum Mulai', flags: 1, pct: 10, lead: 'Fajar Nugroho', note: 'Telaah kontrak, jaminan bank, litigasi & komitmen lahan tertunda.' },
    ],

    /* ---- Red flags + mekanisme implikasi SPA ---- */
    redFlags: [
      { sev: 'Tinggi', area: 'Pendapatan', quantum: 90.0, t: 'Konsentrasi pelanggan 24% pada satu kontrak yang berakhir 2026 — risiko pendapatan pasca-akuisisi.', spa: 'Warranty + Condition Precedent: perpanjangan/renegosiasi kontrak sebagai syarat penutupan; pertimbangkan earn-out.' },
      { sev: 'Sedang', area: 'Net Debt', quantum: 6.5, t: 'Liabilitas imbalan pasca-kerja kurang dicatat ~Rp 6,5 M — debt-like item.', spa: 'Penyesuaian harga (net debt) −Rp 6,5 M melalui completion accounts.' },
      { sev: 'Sedang', area: 'Pajak', quantum: 13.7, t: 'Eksposur PPN Rp 4,2 M & sengketa PPh Badan 2023 Rp 9,5 M.', spa: 'Specific indemnity + escrow Rp 14 M ditahan 18 bulan hingga sengketa inkracht.' },
      { sev: 'Sedang', area: 'Modal Kerja', quantum: 8.0, t: 'Modal kerja penutupan Rp 30 M di bawah peg ternormalisasi Rp 38 M.', spa: 'Completion accounts: penyesuaian harga rupiah-per-rupiah terhadap target NWC.' },
      { sev: 'Rendah', area: 'Pihak Berelasi', quantum: 1.8, t: 'Sewa pihak berelasi di bawah harga pasar — normalisasi EBITDA Rp 1,8 M.', spa: 'Klausul TSA & normalisasi ke harga pasar pasca-akuisisi.' },
    ],

    /* ---- Permintaan data / dataroom (PBC) ---- */
    pbc: [
      { ref: 'DR-01', item: 'Laporan keuangan auditan FY2023–FY2024', cat: 'Keuangan', owner: 'Target', status: 'Diterima' },
      { ref: 'DR-02', item: 'GL & neraca saldo TTM Des-2025', cat: 'Keuangan', owner: 'Target', status: 'Diterima' },
      { ref: 'DR-03', item: 'Rincian pendapatan per pelanggan 24 bulan', cat: 'Pendapatan', owner: 'Target', status: 'Diterima' },
      { ref: 'DR-04', item: 'Aging piutang & utang usaha', cat: 'Modal Kerja', owner: 'Target', status: 'Diterima' },
      { ref: 'DR-05', item: 'SPT & bukti bayar pajak 2023–2025', cat: 'Pajak', owner: 'Target', status: 'Terlambat' },
      { ref: 'DR-06', item: 'Laporan aktuaria imbalan kerja terkini', cat: 'Net Debt', owner: 'Aktuaris', status: 'Tertunda' },
      { ref: 'DR-07', item: 'Kontrak pelanggan utama & klausul change-of-control', cat: 'Komersial', owner: 'Target', status: 'Tertunda' },
      { ref: 'DR-08', item: 'Daftar litigasi & surat kuasa hukum', cat: 'Legal', owner: 'Penasihat Hukum', status: 'Diterima' },
      { ref: 'DR-09', item: 'Perjanjian sewa pihak berelasi', cat: 'Modal Kerja', owner: 'Target', status: 'Diterima' },
      { ref: 'DR-10', item: 'Skedul utang bank & covenant', cat: 'Net Debt', owner: 'Target', status: 'Diterima' },
    ],
  };

  /* ============================================================
     ISQM 1 GOVERNANCE — 8 komponen SPM, akuntabilitas, sumber daya,
     budaya mutu, simpulan evaluasi tahunan firma.
     ============================================================ */
  const QM_COMPONENTS = [
    { id: 'C1', name: 'Tata Kelola & Kepemimpinan', ref: '¶28–30', score: 92, status: 'Efektif', owner: 'Hartono Wijaya', obj: 4, risks: 3, defs: 0, trend: [86, 88, 90, 92], desc: 'Komitmen mutu, akuntabilitas pimpinan, struktur organisasi & alokasi sumber daya.' },
    { id: 'C2', name: 'Proses Penilaian Risiko Firma', ref: '¶25–27', score: 87, status: 'Efektif', owner: 'Anindya Pramesti', obj: 2, risks: 6, defs: 1, trend: [80, 82, 85, 87], desc: 'Penetapan tujuan mutu, identifikasi & penilaian risiko mutu, perancangan respons.' },
    { id: 'C3', name: 'Ketentuan Etika Relevan', ref: '¶31–32', score: 96, status: 'Efektif', owner: 'Sari Dewanti', obj: 5, risks: 4, defs: 0, trend: [94, 95, 95, 96], desc: 'Independensi, objektivitas, kerahasiaan, rotasi, kepatuhan kode etik IAPI.' },
    { id: 'C4', name: 'Penerimaan & Keberlanjutan', ref: '¶33–34', score: 88, status: 'Efektif', owner: 'Rudi Gunawan', obj: 3, risks: 4, defs: 0, trend: [84, 85, 87, 88], desc: 'Penilaian integritas klien, kompetensi & kapasitas firma, pertimbangan etika sebelum menerima/melanjutkan.' },
    { id: 'C5', name: 'Pelaksanaan Perikatan', ref: '¶35–36', score: 84, status: 'Efektif', owner: 'Hartono Wijaya', obj: 6, risks: 5, defs: 0, trend: [81, 82, 83, 84], desc: 'Arahan, supervisi, reviu, konsultasi, perbedaan pendapat, EQR & dokumentasi perikatan.' },
    { id: 'C6', name: 'Sumber Daya', ref: '¶32', score: 79, status: 'Perlu Perhatian', owner: 'Anindya Pramesti', obj: 4, risks: 6, defs: 1, trend: [83, 81, 80, 79], desc: 'SDM, teknologi, sumber daya intelektual (metodologi), & penyedia jasa eksternal.' },
    { id: 'C7', name: 'Informasi & Komunikasi', ref: '¶37–38', score: 90, status: 'Efektif', owner: 'Citra Halim', obj: 2, risks: 3, defs: 0, trend: [85, 87, 89, 90], desc: 'Arus informasi mutu internal & dengan jaringan/pihak eksternal yang relevan.' },
    { id: 'C8', name: 'Pemantauan & Remediasi', ref: '¶38–47', score: 81, status: 'Efektif', owner: 'Citra Halim', obj: 3, risks: 4, defs: 1, trend: [76, 78, 80, 81], desc: 'Aktivitas pemantauan, evaluasi temuan, komunikasi & remediasi defisiensi secara tepat waktu.' },
  ];
  const QM_ROLES = [
    { role: 'Tanggung Jawab Akhir atas SPM', person: 'Hartono Wijaya, CPA', title: 'Managing Partner', ref: 'ISQM 1 ¶20(a)', since: '2019', note: 'Akuntabilitas tertinggi atas Sistem Pengelolaan Mutu firma.' },
    { role: 'Tanggung Jawab Operasional SPM', person: 'Anindya Pramesti, CPA', title: 'Quality Management Leader', ref: 'ISQM 1 ¶20(b)', since: '2023', note: 'Pengelolaan operasional harian SPM & koordinasi evaluasi tahunan.' },
    { role: 'Kepemimpinan Etika & Independensi', person: 'Sari Dewanti, CPA', title: 'Ethics & Independence Partner', ref: 'ISQM 1 ¶20(c)', since: '2021', note: 'Kepatuhan kode etik IAPI, register independensi & rotasi.' },
    { role: 'Kepemimpinan Pemantauan & Remediasi', person: 'Citra Halim, CPA', title: 'Monitoring Partner', ref: 'ISQM 1 ¶20(c)', since: '2022', note: 'Program inspeksi perikatan, akar masalah & remediasi defisiensi.' },
  ];
  const QM_PROVIDERS = [
    { name: 'Jaringan Afiliasi Global (AGN-Asia)', type: 'Jaringan', reliance: 'Metodologi & inspeksi lintas-batas', evaluated: '2025-11', status: 'Memadai', note: 'Evaluasi kelayakan jaringan tahunan; akses metodologi & pelatihan.' },
    { name: 'Metodologi Audit WHR v4.2', type: 'Sumber Daya Intelektual', reliance: 'Kerangka kerja & template perikatan', evaluated: '2026-01', status: 'Memadai', note: 'Diperbarui selaras SA & ISQM terkini; di-review komite teknis.' },
    { name: 'Platform Asseris', type: 'Teknologi', reliance: 'Eksekusi, dokumentasi, & pemantauan mutu', evaluated: '2026-02', status: 'Memadai', note: 'Kendali akses, jejak audit & retensi kertas kerja teruji.' },
    { name: 'Pakar Penilai (KJPP Mitra)', type: 'Penyedia Jasa Eksternal', reliance: 'Penilaian nilai wajar aset spesifik', evaluated: '2025-12', status: 'Memadai', note: 'Kompetensi, objektivitas & kapabilitas dievaluasi per SA 620.' },
    { name: 'Penyedia Konfirmasi Digital', type: 'Penyedia Jasa Eksternal', reliance: 'Konfirmasi eksternal terstandar', evaluated: '2025-09', status: 'Pemantauan', note: 'Kontrol keamanan penyedia ditinjau ulang setelah pembaruan sistem.' },
  ];
  const QM_CULTURE = [
    { k: 'Bobot mutu dalam evaluasi & remunerasi partner', v: '40%', accent: 'green', note: 'Mutu sebagai komponen utama penilaian kinerja partner.' },
    { k: 'Komunikasi mutu pimpinan (YTD)', v: '7', accent: 'blue', note: 'Town hall, memo mutu & sesi tone-at-the-top tahun berjalan.' },
    { k: 'Realisasi PPL terstruktur firma', v: '86%', accent: 'amber', note: 'Rata-rata pemenuhan SKP terstruktur seluruh AP & staf.' },
    { k: 'Survei budaya mutu (skor)', v: '4,3 / 5', accent: 'green', note: 'Persepsi staf atas prioritas mutu di atas tenggat waktu.' },
  ];
  const QM_EVAL = {
    period: '1 Jan – 31 Des 2025', date: '2026-03-05', by: 'Anindya Pramesti, CPA (QM Leader)',
    approvedBy: 'Hartono Wijaya, CPA (Managing Partner)',
    conclusion: 'reasonable',
    statement: 'Sistem Pengelolaan Mutu firma memberikan keyakinan memadai bahwa firma dan personelnya memenuhi tanggung jawab profesional sesuai standar profesi & ketentuan hukum, serta laporan yang diterbitkan telah tepat sesuai kondisinya — dengan pengecualian defisiensi pada komponen Sumber Daya yang tidak berdampak pervasif dan tengah diremediasi.',
    basis: ['Hasil pemantauan & inspeksi perikatan siklus 2025', 'Evaluasi efektivitas respons atas seluruh risiko mutu', 'Status remediasi defisiensi teridentifikasi', 'Keluhan & tuduhan yang diterima dan penyelesaiannya'],
  };

  /* ---- SOQM monitoring: inspeksi perikatan & aktivitas pemantauan ---- */
  const QM_INSPECTIONS = [
    { id: 'INS-25-01', eng: 'ENG-2025-040', type: 'Inspeksi Pasca-Terbit (Cold)', inspector: 'Citra Halim', date: '2026-02-18', grade: 'Memuaskan', findings: 0 },
    { id: 'INS-25-02', eng: 'ENG-2025-014', client: 'PT Sentosa Makmur Tbk', type: 'Inspeksi Berjalan (Hot)', partner: 'Hartono Wijaya', inspector: 'Citra Halim', date: '2026-03-02', grade: 'Perlu Perbaikan', findings: 2, scope: 'PIE · manufaktur' },
    { id: 'INS-25-03', eng: 'ENG-2025-022', client: 'PT Cahaya Logistik Nusantara', type: 'Inspeksi Pasca-Terbit (Cold)', partner: 'Sari Dewanti', inspector: 'Bayu Saputra', date: '2026-01-30', grade: 'Memuaskan', findings: 1, scope: 'Non-PIE · logistik' },
    { id: 'INS-25-04', eng: 'ENG-2025-031', client: 'PT Bumi Hijau Agrindo', type: 'Inspeksi Berjalan (Hot)', partner: 'Hartono Wijaya', inspector: 'Citra Halim', date: '2026-03-06', grade: 'Dijadwalkan', findings: 0, scope: 'PIE · agribisnis' },
  ];
  const QM_INSP_FINDINGS = [
    { ins: 'INS-25-02', area: 'Pengakuan Pendapatan (PSAK 72)', sev: 'Sedang', desc: 'Dokumentasi pertimbangan atas kewajiban pelaksanaan kontrak multi-elemen belum lengkap.', cause: 'Tekanan tenggat & template belum mengakomodasi skenario kompleks.', rca5: ['Apa: dokumentasi judgement kurang', 'Mengapa: reviewer fokus angka, bukan rasionalisasi', 'Mengapa: checklist tidak menuntut memo judgement', 'Mengapa: template belum diperbarui pasca-PSAK 72', 'Akar: pembaruan metodologi tertinggal'] },
    { ins: 'INS-25-02', area: 'Supervisi Tim', sev: 'Rendah', desc: 'Bukti reviu senior atas sebagian kertas kerja junior belum ter-sign-off tepat waktu.', cause: 'Beban kerja senior >90% pada puncak musim.', rca5: ['Apa: sign-off reviu terlambat', 'Mengapa: senior kelebihan beban', 'Mengapa: 3 klien baru diterima Q1', 'Mengapa: perencanaan kapasitas belum mengikat penerimaan', 'Akar: defisiensi komponen Sumber Daya'] },
    { ins: 'INS-25-03', area: 'Konfirmasi Eksternal', sev: 'Rendah', desc: 'Prosedur alternatif atas non-respons konfirmasi piutang kurang terdokumentasi.', cause: 'Pemahaman SA 505 ¶12 belum merata di tim junior.', rca5: [] },
  ];
  const QM_MON_ACTIVITIES = [
    { act: 'Inspeksi perikatan siklus', freq: 'Tahunan', last: '2026-03', owner: 'Citra Halim', cover: '≥1 perikatan / partner; seluruh PIE', result: 'Berjalan' },
    { act: 'Pemantauan kepatuhan independensi', freq: 'Triwulanan', last: '2026-01', owner: 'Sari Dewanti', cover: 'Seluruh AP & staf kunci', result: 'Efektif' },
    { act: 'Reviu pembaruan metodologi & SA', freq: 'Tahunan', last: '2026-01', owner: 'Anindya Pramesti', cover: 'Template & program audit', result: 'Efektif' },
    { act: 'Pemantauan penyedia jasa & teknologi', freq: 'Tahunan', last: '2026-02', owner: 'Anindya Pramesti', cover: 'Vendor & sistem kritikal', result: 'Pemantauan' },
  ];

  /* ---- EQR meta: kelayakan reviewer, lini masa, konsultasi, perbedaan pendapat ---- */
  const EQR_META = {
    'EQR-063': {
      coolingOff: 'Terpenuhi — reviewer tidak terlibat perikatan 2 tahun terakhir', coolingOk: true,
      competence: 'Hartono Wijaya, CPA — kompetensi & otoritas memadai (Partner, 16 thn)', compOk: true,
      objectivity: 'Tidak ada ancaman objektivitas teridentifikasi', objOk: true,
      appointedBy: 'QM Leader', appointedDate: '2026-01-20',
      timeline: [
        { stage: 'Penunjukan & penilaian kelayakan', date: '2026-01-20', status: 'Selesai' },
        { stage: 'Reviu perencanaan & penilaian risiko', date: '2026-02-05', status: 'Selesai' },
        { stage: 'Reviu pertimbangan signifikan', date: '2026-03-04', status: 'Berjalan' },
        { stage: 'Reviu opini & laporan', date: '—', status: 'Belum Mulai' },
        { stage: 'Penutupan EQR (gerbang opini)', date: '—', status: 'Belum Mulai' },
      ],
      consults: [{ t: 'Konsultasi PSAK 72 — pengakuan pendapatan kontrak properti', with: 'Komite Teknis', status: 'Terbuka' }],
      diff: (null as any),
    },
    'EQR-014': {
      coolingOff: 'Terpenuhi — reviewer baru ditunjuk, bebas keterlibatan', coolingOk: true,
      competence: 'Sari Dewanti, CPA — kompetensi memadai untuk klien manufaktur PIE', compOk: true,
      objectivity: 'Tidak ada ancaman objektivitas teridentifikasi', objOk: true,
      appointedBy: 'QM Leader', appointedDate: '2026-02-28',
      timeline: [
        { stage: 'Penunjukan & penilaian kelayakan', date: '2026-02-28', status: 'Selesai' },
        { stage: 'Reviu perencanaan & penilaian risiko', date: '—', status: 'Belum Mulai' },
        { stage: 'Reviu pertimbangan signifikan', date: '—', status: 'Belum Mulai' },
        { stage: 'Reviu opini & laporan', date: '—', status: 'Belum Mulai' },
        { stage: 'Penutupan EQR (gerbang opini)', date: '—', status: 'Belum Mulai' },
      ],
      consults: ([] as any[]),
      diff: (null as any),
    },
    'EQR-040': {
      coolingOff: 'Terpenuhi — reviewer tidak terlibat perikatan & bukan partner perikatan', coolingOk: true,
      competence: 'Hartono Wijaya, CPA — kompetensi & otoritas memadai (Partner senior, independen dari tim)', compOk: true,
      objectivity: 'Tidak ada ancaman objektivitas teridentifikasi', objOk: true,
      appointedBy: 'QM Leader', appointedDate: '2026-01-12',
      timeline: [
        { stage: 'Penunjukan & penilaian kelayakan', date: '2026-01-12', status: 'Selesai' },
        { stage: 'Reviu perencanaan & penilaian risiko', date: '2026-01-25', status: 'Selesai' },
        { stage: 'Reviu pertimbangan signifikan', date: '2026-02-10', status: 'Selesai' },
        { stage: 'Reviu opini & laporan', date: '2026-02-20', status: 'Selesai' },
        { stage: 'Penutupan EQR (gerbang opini)', date: '2026-02-22', status: 'Selesai' },
      ],
      consults: [{ t: 'Konsultasi penyajian provisi kerugian kredit (PSAK 71)', with: 'Komite Teknis', status: 'Selesai' }],
      diff: { topic: 'Tingkat provisi ECL atas portofolio macet', team: 'Tim usul provisi 4,1%', reviewer: 'Reviewer minta sensitivitas tambahan & naik ke 4,6%', resolution: 'Disepakati 4,6% setelah analisis sensitivitas; terdokumentasi.', status: 'Terselesaikan' },
    },
  };

  /* ============================================================
     PELAPORAN PPPK — register klien (Lampiran), realisasi PPL,
     register rotasi AP emiten, riwayat penyampaian & inspeksi.
     ============================================================ */
  const PPPK_CLIENTS = [
    { id: 'C-014', client: 'PT Sentosa Makmur Tbk', service: 'Audit LK', std: 'SA', ap: 'Hartono Wijaya', emiten: true, opinion: 'WTM', fee: 1_850, reportDate: '2026-03-20', tenure: 5 },
    { id: 'C-040', client: 'PT Mandiri Sejahtera Finance', service: 'Audit LK', std: 'SA', ap: 'Rudi Gunawan', emiten: true, opinion: 'WTM dgn Penekanan', fee: 2_340, reportDate: '2026-02-22', tenure: 6 },
    { id: 'C-063', client: 'PT Graha Properti Investama', service: 'Audit LK', std: 'SA', ap: 'Rudi Gunawan', emiten: true, opinion: 'Dalam Proses', fee: 1_640, reportDate: '—', tenure: 7 },
    { id: 'C-031', client: 'PT Bumi Hijau Agrindo', service: 'Audit LK', std: 'SA', ap: 'Hartono Wijaya', emiten: true, opinion: 'Dalam Proses', fee: 1_120, reportDate: '—', tenure: 4 },
    { id: 'C-022', client: 'PT Cahaya Logistik Nusantara', service: 'Reviu LK', std: 'SPR 2400', ap: 'Sari Dewanti', emiten: false, opinion: 'Reviu — tanpa modifikasi', fee: 720, reportDate: '2026-04-10', tenure: 3 },
    { id: 'C-058', client: 'PT Samudra Pangan Lestari', service: 'Audit LK', std: 'SA', ap: 'Rudi Gunawan', emiten: false, opinion: 'WTM', fee: 580, reportDate: '2026-03-12', tenure: 2 },
    { id: 'C-047', client: 'PT Teknologi Andalan Digital', service: 'Audit LK', std: 'SA', ap: 'Sari Dewanti', emiten: false, opinion: 'WDP', fee: 410, reportDate: '2026-03-28', tenure: 1 },
    { id: 'C-052', client: 'PT Karya Beton Perkasa', service: 'Audit LK', std: 'SA', ap: 'Hartono Wijaya', emiten: false, opinion: 'WTM', fee: 640, reportDate: '2026-04-02', tenure: 3 },
  ];
  const PPPK_PPL = [
    { ap: 'Hartono Wijaya', grade: 'Partner · AP', structured: 22, total: 44, req: 40, reqStr: 20 },
    { ap: 'Rudi Gunawan', grade: 'Partner · AP', structured: 20, total: 41, req: 40, reqStr: 20 },
    { ap: 'Sari Dewanti', grade: 'Partner · AP', structured: 18, total: 38, req: 40, reqStr: 20 },
    { ap: 'Anindya Pramesti', grade: 'Manager', structured: 22, total: 32, req: 40, reqStr: 20 },
    { ap: 'Bayu Saputra', grade: 'Manager', structured: 14, total: 24, req: 40, reqStr: 20 },
  ];
  /* Rezim per-perikatan: PIE umum 5 th (PP 20/2015 Ps. 11) ·
     sektor jasa keuangan 3 th (POJK 13/POJK.03/2017) · cooling-off 2 th. */
  const PPPK_ROTATION = [
    { ap: 'Rudi Gunawan', client: 'PT Mandiri Sejahtera Finance', tenure: 6, limit: 3, sektorJK: true, sektor: 'Sektor jasa keuangan', basis: 'POJK 13/POJK.03/2017', status: 'Wajib Rotasi', next: 'Rotasi mendesak — melebihi 3 th + cooling-off 2 th' },
    { ap: 'Rudi Gunawan', client: 'PT Graha Properti Investama', tenure: 7, limit: 5, sektorJK: false, sektor: 'PIE umum', basis: 'PP 20/2015 Ps. 11', status: 'Wajib Rotasi', next: 'FY2026 — partner pengganti' },
    { ap: 'Hartono Wijaya', client: 'PT Sentosa Makmur Tbk', tenure: 5, limit: 5, sektorJK: false, sektor: 'PIE umum', basis: 'PP 20/2015 Ps. 11', status: 'Wajib Rotasi', next: 'FY2026 — partner pengganti' },
    { ap: 'Hartono Wijaya', client: 'PT Bumi Hijau Agrindo', tenure: 4, limit: 5, sektorJK: false, sektor: 'PIE umum', basis: 'PP 20/2015 Ps. 11', status: 'Tahun Terakhir', next: 'Rotasi FY2027' },
  ];
  const PPPK_HISTORY = [
    { year: 2024, submitted: '2025-04-22', status: 'Diterima', channel: 'e-reporting PPPK', receipt: 'TT-PPPK/2025/04/0192', note: 'Laporan tahunan KAP FY2024 — lengkap & tepat waktu.' },
    { year: 2023, submitted: '2024-04-18', status: 'Diterima', channel: 'e-reporting PPPK', receipt: 'TT-PPPK/2024/04/0177', note: 'Disertai laporan inspeksi P2PK 2023 — tanpa temuan signifikan.' },
    { year: 2022, submitted: '2023-04-27', status: 'Diterima', channel: 'e-reporting PPPK', receipt: 'TT-PPPK/2023/04/0151', note: 'Realisasi PPL ditindaklanjuti dengan rencana perbaikan.' },
  ];

  /* ============================================================
     D+: Practice Operations — pendalaman
     Delivery & Milestones · WIP & Realisasi · Capacity Planning
     Anchor "hari ini" = 2026-03-09 (selaras Resource Scheduler).
     ============================================================ */

  /* ---- Delivery plan: fase + milestone per engagement (Gantt) ---- */
  const DELIVERY_WINDOW = { start: '2025-11-17', end: '2026-06-30', today: '2026-03-09' };
  const DELIVERY = [
    { id: 'ENG-2025-063', phases: [
        { name: 'Perencanaan', start: '2025-12-08', end: '2026-01-09' },
        { name: 'Eksekusi', start: '2026-01-12', end: '2026-02-27' },
        { name: 'Finalisasi', start: '2026-03-02', end: '2026-03-15' } ],
      milestones: [
        { label: 'Draft LK final', date: '2026-03-02', status: 'done' },
        { label: 'EQR (SA 220)', date: '2026-03-10', status: 'due' },
        { label: 'Tanda tangan opini', date: '2026-03-15', status: 'upcoming' } ] },
    { id: 'ENG-2025-014', phases: [
        { name: 'Perencanaan', start: '2026-01-12', end: '2026-02-06' },
        { name: 'Eksekusi', start: '2026-02-09', end: '2026-03-20' },
        { name: 'Finalisasi', start: '2026-03-23', end: '2026-03-31' } ],
      milestones: [
        { label: 'Kickoff', date: '2026-01-12', status: 'done' },
        { label: 'Interim review', date: '2026-02-13', status: 'done' },
        { label: 'Observasi stock opname', date: '2026-02-27', status: 'done' },
        { label: 'Selesai fieldwork', date: '2026-03-20', status: 'due' },
        { label: 'EQR', date: '2026-03-26', status: 'upcoming' },
        { label: 'Sign-off', date: '2026-03-31', status: 'upcoming' } ] },
    { id: 'ENG-2025-031', phases: [
        { name: 'Perencanaan', start: '2026-01-19', end: '2026-02-20' },
        { name: 'Eksekusi', start: '2026-02-23', end: '2026-04-17' },
        { name: 'Finalisasi', start: '2026-04-20', end: '2026-04-30' } ],
      milestones: [
        { label: 'Kickoff', date: '2026-01-19', status: 'done' },
        { label: 'Stock opname CPO', date: '2026-03-06', status: 'done' },
        { label: 'Konfirmasi piutang', date: '2026-03-27', status: 'due' },
        { label: 'Selesai fieldwork', date: '2026-04-17', status: 'upcoming' },
        { label: 'Sign-off', date: '2026-04-30', status: 'upcoming' } ] },
    { id: 'ENG-2025-040', phases: [
        { name: 'Perencanaan', start: '2026-02-02', end: '2026-03-13' },
        { name: 'Eksekusi', start: '2026-03-16', end: '2026-04-08' },
        { name: 'Finalisasi', start: '2026-04-09', end: '2026-04-15' } ],
      milestones: [
        { label: 'Kickoff', date: '2026-02-02', status: 'done' },
        { label: 'Risk assessment', date: '2026-02-27', status: 'done' },
        { label: 'Walkthrough pengendalian', date: '2026-04-02', status: 'upcoming' },
        { label: 'Selesai fieldwork', date: '2026-04-08', status: 'upcoming' },
        { label: 'Sign-off', date: '2026-04-15', status: 'upcoming' } ] },
    { id: 'ENG-2025-022', phases: [
        { name: 'Perencanaan', start: '2026-02-16', end: '2026-03-13' },
        { name: 'Eksekusi', start: '2026-03-16', end: '2026-05-15' },
        { name: 'Finalisasi', start: '2026-05-18', end: '2026-05-31' } ],
      milestones: [
        { label: 'Kickoff', date: '2026-02-16', status: 'done' },
        { label: 'Prosedur analitis', date: '2026-04-10', status: 'upcoming' },
        { label: 'Selesai prosedur', date: '2026-05-15', status: 'upcoming' },
        { label: 'Laporan reviu', date: '2026-05-31', status: 'upcoming' } ] },
    { id: 'ENG-2025-047', phases: [
        { name: 'Perencanaan', start: '2026-03-02', end: '2026-04-17' },
        { name: 'Eksekusi', start: '2026-04-20', end: '2026-06-12' },
        { name: 'Finalisasi', start: '2026-06-15', end: '2026-06-30' } ],
      milestones: [
        { label: 'Kickoff', date: '2026-03-02', status: 'done' },
        { label: 'Scoping AUP', date: '2026-03-20', status: 'due' },
        { label: 'Mulai prosedur', date: '2026-04-20', status: 'upcoming' },
        { label: 'Laporan temuan faktual', date: '2026-06-30', status: 'upcoming' } ] },
    { id: 'ENG-2025-058', phases: [
        { name: 'Perencanaan', start: '2025-11-17', end: '2025-12-12' },
        { name: 'Eksekusi', start: '2025-12-15', end: '2026-02-13' },
        { name: 'Finalisasi', start: '2026-02-16', end: '2026-02-28' } ],
      milestones: [
        { label: 'Sign-off opini', date: '2026-02-26', status: 'done' },
        { label: 'Arsip (ISQM)', date: '2026-02-28', status: 'done' } ] },
  ];

  /* ---- WIP & Realisasi: ekonomi perikatan (nilai standar vs tagihan) ----
     std       = nilai standar jam ter-charge sampai saat ini
     billed    = telah difakturkan
     writeUp   = penambahan nilai (premium)
     writeDown = penghapusan / write-off
     cost      = biaya waktu (blended cost) sampai saat ini
     → recoverable = std + writeUp - writeDown ; wip = recoverable - billed
     originDays = umur WIP belum tertagih (hari sejak charge/penagihan terakhir)
     Sub-buku ini adalah SUMBER KEBENARAN tunggal nilai WIP — FIRMFIN.wip()
     menurunkan recoverable, realisasi, margin, aging & penyisihan darinya, lalu
     menutup ke kontrol GL 1-300 (Firm Finance · Sumber Kebenaran). */
  const WIP_ENG = [
    { id: 'ENG-2025-014', std: 3_200_000_000, billed: 1_200_000_000, writeUp: 0,           writeDown: 180_000_000, cost: 1_950_000_000, originDays: 48 },
    { id: 'ENG-2025-040', std: 1_980_000_000, billed: 0,             writeUp: 90_000_000,  writeDown: 0,           cost: 1_180_000_000, originDays: 22 },
    { id: 'ENG-2025-031', std: 1_420_000_000, billed: 600_000_000,   writeUp: 0,           writeDown: 160_000_000, cost: 850_000_000,   originDays: 75 },
    { id: 'ENG-2025-063', std: 2_640_000_000, billed: 1_700_000_000, writeUp: 110_000_000, writeDown: 0,           cost: 1_560_000_000, originDays: 95 },
    { id: 'ENG-2025-022', std: 980_000_000,   billed: 0,             writeUp: 0,           writeDown: 40_000_000,  cost: 620_000_000,   originDays: 38 },
    { id: 'ENG-2025-047', std: 1_180_000_000, billed: 0,             writeUp: 0,           writeDown: 0,           cost: 760_000_000,   originDays: 18 },
    { id: 'ENG-2025-058', std: 2_180_000_000, billed: 2_260_000_000, writeUp: 60_000_000,  writeDown: 0,           cost: 1_320_000_000, originDays: 12 },
  ];
  /* WIP aging buckets — DERIVASI dari WIP_ENG (umur belum tertagih). Dipertahankan
     sebagai cache; FIRMFIN.wip().aging menghitung ulang langsung dari sub-buku. */
  const WIP_AGING = [
    { bucket: '0–30 hari', value: 3_250_000_000 },
    { bucket: '31–60 hari', value: 2_760_000_000 },
    { bucket: '61–90 hari', value: 660_000_000 },
    { bucket: '> 90 hari', value: 1_050_000_000 },
  ];

  /* ---- Capacity Planning: proyeksi 8 minggu ke depan ---- */
  const CAPACITY = {
    weeks: ['9 Mar', '16 Mar', '23 Mar', '30 Mar', '6 Apr', '13 Apr', '20 Apr', '27 Apr'],
    grades: [
      { grade: 'Partner', supply: [54, 54, 54, 48, 54, 54, 54, 54], demand: [40, 44, 48, 46, 40, 38, 30, 26] },
      { grade: 'Manager', supply: [80, 80, 80, 80, 80, 80, 120, 120], demand: [96, 104, 112, 108, 96, 88, 84, 80] },
      { grade: 'Senior',  supply: [80, 80, 80, 72, 80, 80, 80, 80], demand: [88, 92, 96, 90, 78, 72, 70, 66] },
      { grade: 'Junior',  supply: [80, 80, 80, 80, 80, 72, 80, 80], demand: [78, 84, 88, 82, 70, 64, 68, 72] },
    ],
    staff: [
      { name: 'Hartono Wijaya', grade: 'Partner', forecast: [80, 90, 95, 85, 70, 60, 55, 50] },
      { name: 'Rudi Gunawan',   grade: 'Partner', forecast: [88, 95, 100, 92, 80, 70, 60, 55] },
      { name: 'Sari Dewanti',   grade: 'Partner', forecast: [70, 75, 80, 78, 72, 68, 64, 60] },
      { name: 'Anindya Pramesti', grade: 'Manager', forecast: [95, 105, 115, 108, 96, 88, 82, 78] },
      { name: 'Bayu Saputra',   grade: 'Manager', forecast: [82, 90, 98, 95, 90, 86, 84, 80] },
      { name: 'Citra Halim',    grade: 'Manager', forecast: [0, 0, 0, 0, 40, 70, 95, 100], leave: true },
      { name: 'Dimas Raharjo',  grade: 'Senior', forecast: [98, 110, 118, 112, 95, 80, 72, 68] },
      { name: 'Sinta Wulandari', grade: 'Senior', forecast: [92, 100, 108, 100, 88, 82, 80, 76] },
      { name: 'Fajar Nugroho',  grade: 'Junior', forecast: [85, 92, 98, 90, 78, 70, 72, 74] },
      { name: 'Rina Kusuma',    grade: 'Junior', forecast: [80, 86, 92, 86, 72, 66, 70, 75] },
    ],
    pipeline: [
      { name: 'PT Pelita Energi Nusantara', service: 'Audit + Tax', start: '2026-04-13', hrs: 64, prob: 75 },
      { name: 'PT Sari Boga Internasional', service: 'Audit LK', start: '2026-05-04', hrs: 48, prob: 45 },
    ],
  };

  /* ============================================================
     RESOLVER KANONIK — SATU SUMBER KEBENARAN ENTITAS PERIKATAN
     ------------------------------------------------------------
     Modul mutu (SOQM / EQR / PPPK) tidak lagi menyimpan nama klien,
     partner, atau status PIE secara terpisah. Semua DITARIK dari
     ENGAGEMENTS + CLIENTS + STAFF lewat engMeta(), sehingga satu
     perubahan pada master mengalir konsisten ke seluruh modul dan
     tidak ada lagi denormalisasi yang dapat menyimpang.
     ============================================================ */
  const _engIndex = Object.fromEntries(ENGAGEMENTS.map(e => [e.id, e]));
  const _cliIndex = Object.fromEntries(CLIENTS.map(c => [c.id, c]));
  const engById = (id: any) => _engIndex[id] || null;
  const clientById = (id: any) => _cliIndex[id] || null;
  const shortName = (n: any) => (n || '').replace(/^PT\s+/, '').replace(/\s+Tbk$/, '').trim();
  const bareName = (n: any) => (n || '').split(',')[0].trim();           // "Rudi Gunawan, CPA" → "Rudi Gunawan"
  const staffByName = (n: any) => STAFF.find(s => s.name === bareName(n)) || null;
  const industryTag = (ind: any) => (ind || '').split(/[·&\/]/)[0].trim().toLowerCase();
  function engMeta(engId: any) {
    const e = engById(engId);
    if (!e) return null;
    const c: any = clientById(e.clientId) || {};
    return {
      engId: e.id, eng: e, clientId: e.clientId,
      client: c.name || '—', shortClient: shortName(c.name),
      partner: bareName(e.partner), partnerFull: e.partner, manager: e.manager,
      listed: !!c.listed, pie: !!c.listed, pieLabel: c.listed ? 'PIE' : 'Non-PIE',
      industry: c.industry || '', industryTag: industryTag(c.industry),
      scope: (c.listed ? 'PIE' : 'Non-PIE') + ' · ' + industryTag(c.industry),
      std: e.standard, type: e.type, risk: e.risk, tier: c.tier, city: c.city,
      phase: e.phase, status: e.status, progress: e.progress, deadline: e.deadline,
      materiality: e.materiality, fee: c.fee,
    };
  }

  /* — Normalisasi data mutu: tulis ulang field turunan dari resolver kanonik.
     Yang disimpan di sumber hanyalah FOREIGN KEY (eng). Sisanya diturunkan. — */

export { DD_OPP, DD_PROS, DD_REG, DD_EBITDA_BRIDGE, DD_NORM_EBITDA, DUE_DILIGENCE, QM_COMPONENTS, QM_ROLES, QM_PROVIDERS, QM_CULTURE, QM_EVAL, QM_INSPECTIONS, QM_INSP_FINDINGS, QM_MON_ACTIVITIES, EQR_META, PPPK_CLIENTS, PPPK_PPL, PPPK_ROTATION, PPPK_HISTORY, DELIVERY_WINDOW, DELIVERY, WIP_ENG, WIP_AGING, CAPACITY, _engIndex, _cliIndex, engById, clientById, shortName, bareName, staffByName, industryTag, engMeta };
