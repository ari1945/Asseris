/* ============================================================
   Asseris — data part1 (seed + engine) (W3 split dari data.js; perilaku identik).
   ============================================================ */
  const FIRM = {
    name: 'KAP Wijaya Hartono & Rekan',
    short: 'WHR',
    license: 'Izin KAP No. 1142/KM.1/2019',
    partners: 6, managers: 11, staff: 58,
  };

  const USER = {
    name: 'Anindya Pramesti', initials: 'AP', role: 'Audit Manager',
    title: 'Audit Manager', email: 'anindya.p@whr-cpa.id', phone: '+62 812-3456-7890',
    photo: null,
    employeeId: 'WHR-AM-0142',
    department: 'Jasa Asurans (Assurance)',
    office: 'Jakarta — Kantor Pusat',
    joinDate: '04 Maret 2019',
    reportsTo: 'Hartono Wijaya, CPA · Engagement Partner',
    apNumber: 'AP.1284',
    stan: 'STAN-12.3456',
    iapiNumber: 'IAPI-2284',
    cpaSince: '2017',
    cpeHours: 38, cpeTarget: 40,
    languages: 'Indonesia · English',
  };

  /* ---- Clients ---- */
  const CLIENTS = [
    { id: 'C-014', name: 'PT Sentosa Makmur Tbk', industry: 'Manufaktur · Consumer Goods', tier: 'Tier 1', risk: 'High', npwp: '01.234.567.8-045.000', city: 'Bekasi, Jawa Barat', listed: true, since: 2016, partner: 'Hartono Wijaya, CPA', fee: 1_850_000_000, status: 'Active' },
    { id: 'C-022', name: 'PT Cahaya Logistik Nusantara', industry: 'Transportasi & Logistik', tier: 'Tier 2', risk: 'Medium', npwp: '02.811.450.1-091.000', city: 'Surabaya, Jawa Timur', listed: false, since: 2019, partner: 'Sari Dewanti, CPA', fee: 720_000_000, status: 'Active' },
    { id: 'C-031', name: 'PT Bumi Hijau Agrindo', industry: 'Agribisnis · Perkebunan', tier: 'Tier 2', risk: 'High', npwp: '03.119.882.4-431.000', city: 'Pekanbaru, Riau', listed: true, since: 2020, partner: 'Hartono Wijaya, CPA', fee: 1_120_000_000, status: 'Active' },
    { id: 'C-040', name: 'PT Mandiri Sejahtera Finance', industry: 'Jasa Keuangan · Multifinance', tier: 'Tier 1', risk: 'High', npwp: '01.557.203.9-058.000', city: 'Jakarta Selatan', listed: true, since: 2017, partner: 'Rudi Gunawan, CPA', fee: 2_340_000_000, status: 'Active' },
    { id: 'C-047', name: 'PT Teknologi Andalan Digital', industry: 'Teknologi · SaaS', tier: 'Tier 3', risk: 'Medium', npwp: '04.220.118.6-013.000', city: 'Bandung, Jawa Barat', listed: false, since: 2022, partner: 'Sari Dewanti, CPA', fee: 410_000_000, status: 'Active' },
    { id: 'C-052', name: 'PT Karya Beton Perkasa', industry: 'Konstruksi & Material', tier: 'Tier 2', risk: 'Medium', npwp: '02.901.337.2-407.000', city: 'Semarang, Jawa Tengah', listed: false, since: 2021, partner: 'Hartono Wijaya, CPA', fee: 640_000_000, status: 'Proposal' },
    { id: 'C-058', name: 'PT Samudra Pangan Lestari', industry: 'Manufaktur · F&B', tier: 'Tier 2', risk: 'Low', npwp: '03.445.901.7-622.000', city: 'Medan, Sumatera Utara', listed: false, since: 2018, partner: 'Rudi Gunawan, CPA', fee: 580_000_000, status: 'Active' },
    { id: 'C-063', name: 'PT Graha Properti Investama', industry: 'Properti & Real Estate', tier: 'Tier 1', risk: 'High', npwp: '01.778.224.0-079.000', city: 'Jakarta Pusat', listed: true, since: 2015, partner: 'Rudi Gunawan, CPA', fee: 1_640_000_000, status: 'Active' },
  ];

  /* ---- Engagements ---- */
  const ENGAGEMENTS = [
    { id: 'ENG-2025-014', clientId: 'C-014', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA (ISA-converged)', status: 'Fieldwork', phase: 'Eksekusi', progress: 62, partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', deadline: '2026-03-31', budgetHrs: 1840, actualHrs: 1146, risk: 'High', materiality: 4_250_000_000 },
    { id: 'ENG-2025-040', clientId: 'C-040', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA + PSAK 71', status: 'Planning', phase: 'Perencanaan', progress: 28, partner: 'Rudi Gunawan, CPA', manager: 'Bayu Saputra', deadline: '2026-04-15', budgetHrs: 2200, actualHrs: 615, risk: 'High', materiality: 6_800_000_000 },
    { id: 'ENG-2025-031', clientId: 'C-031', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA + PSAK 73', status: 'Fieldwork', phase: 'Eksekusi', progress: 54, partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', deadline: '2026-04-30', budgetHrs: 1480, actualHrs: 812, risk: 'High', materiality: 3_100_000_000 },
    { id: 'ENG-2025-063', clientId: 'C-063', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA', status: 'Review', phase: 'Finalisasi', progress: 88, partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', deadline: '2026-03-15', budgetHrs: 1660, actualHrs: 1588, risk: 'High', materiality: 5_200_000_000 },
    { id: 'ENG-2025-022', clientId: 'C-022', type: 'Review (SPR 2400)', fy: 'FY2025', standard: 'SPR 2400', status: 'Fieldwork', phase: 'Eksekusi', progress: 45, partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', deadline: '2026-05-31', budgetHrs: 640, actualHrs: 290, risk: 'Medium', materiality: 1_400_000_000 },
    { id: 'ENG-2025-058', clientId: 'C-058', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA', status: 'Completed', phase: 'Arsip', progress: 100, partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', deadline: '2026-02-28', budgetHrs: 980, actualHrs: 945, risk: 'Low', materiality: 1_650_000_000 },
    { id: 'ENG-2025-047', clientId: 'C-047', type: 'Agreed-Upon Procedures', fy: 'FY2025', standard: 'SJAH 3000', status: 'Planning', phase: 'Perencanaan', progress: 15, partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', deadline: '2026-06-30', budgetHrs: 420, actualHrs: 48, risk: 'Medium', materiality: 720_000_000 },
  ];

  /* ---- Active engagement: PT Sentosa Makmur (ENG-2025-014) ---- */
  /* Working Trial Balance — grouped by FS caption */
  const WTB = [
    // group, code, name, ly(prior audited), unadjusted(current), aje, lead
    ['Aset Lancar', '1-1100', 'Kas dan Setara Kas', 18_420_500_000, 21_905_300_000, 0, 'A'],
    ['Aset Lancar', '1-1200', 'Piutang Usaha — Pihak Ketiga', 42_180_900_000, 51_322_400_000, -1_850_000_000, 'B'],
    ['Aset Lancar', '1-1210', 'Cadangan Kerugian Penurunan Nilai', -2_109_000_000, -1_980_000_000, -620_000_000, 'B'],
    ['Aset Lancar', '1-1300', 'Persediaan', 64_550_200_000, 78_904_100_000, -2_340_000_000, 'C'],
    ['Aset Lancar', '1-1400', 'Pajak Dibayar di Muka', 3_902_100_000, 4_551_800_000, 0, 'D'],
    ['Aset Lancar', '1-1500', 'Biaya Dibayar di Muka', 1_780_400_000, 2_104_600_000, 0, 'D'],
    ['Aset Tidak Lancar', '1-2100', 'Aset Tetap — Harga Perolehan', 183_209_000_000, 200_339_700_000, 0, 'E'],
    ['Aset Tidak Lancar', '1-2110', 'Akumulasi Penyusutan', -50_860_000_000, -57_180_000_000, -1_120_000_000, 'E'],
    ['Aset Tidak Lancar', '1-2400', 'Aset Takberwujud — Harga Perolehan', 8_400_000_000, 9_600_000_000, 0, 'EI'],
    ['Aset Tidak Lancar', '1-2410', 'Akumulasi Amortisasi', -3_360_000_000, -4_700_000_000, 0, 'EI'],
    ['Aset Tidak Lancar', '1-2300', 'Aset Hak-Guna (PSAK 73)', 0, 12_640_000_000, 0, 'F'],
    ['Aset Tidak Lancar', '1-2500', 'Aset Pajak Tangguhan', 4_110_000_000, 4_980_000_000, 0, 'G'],
    ['Liabilitas Jk. Pendek', '2-1100', 'Utang Usaha', -38_220_700_000, -44_900_300_000, 0, 'AA'],
    ['Liabilitas Jk. Pendek', '2-1200', 'Utang Bank Jangka Pendek', -25_000_000_000, -31_500_000_000, 0, 'BB'],
    ['Liabilitas Jk. Pendek', '2-1300', 'Beban Akrual', -6_440_200_000, -8_120_900_000, -980_000_000, 'CC'],
    ['Liabilitas Jk. Pendek', '2-1400', 'Utang Pajak', -4_980_300_000, -6_220_100_000, 0, 'DD'],
    ['Liabilitas Jk. Pendek', '2-1500', 'Liabilitas Sewa — Jk. Pendek', 0, -3_180_000_000, 0, 'F'],
    ['Liabilitas Jk. Panjang', '2-2100', 'Utang Bank Jangka Panjang', -42_000_000_000, -38_500_000_000, 0, 'BB'],
    ['Liabilitas Jk. Panjang', '2-2200', 'Liabilitas Sewa — Jk. Panjang', 0, -9_620_000_000, 0, 'F'],
    ['Liabilitas Jk. Panjang', '2-2300', 'Liabilitas Imbalan Kerja', -11_220_000_000, -13_080_000_000, 0, 'H'],
    ['Ekuitas', '3-1100', 'Modal Saham', -60_000_000_000, -60_000_000_000, 0, 'K'],
    ['Ekuitas', '3-2100', 'Saldo Laba', -82_362_900_000, -100_456_600_000, 0, 'K'],
    ['Pendapatan', '4-1100', 'Penjualan Bersih', -284_500_000_000, -331_900_000_000, 0, 'R'],
    ['Beban', '5-1100', 'Beban Pokok Penjualan', 198_420_000_000, 230_140_000_000, 2_340_000_000, 'S'],
    ['Beban', '5-2100', 'Beban Penjualan', 22_180_000_000, 26_440_000_000, 0, 'T'],
    ['Beban', '5-3100', 'Beban Umum & Administrasi', 31_990_000_000, 36_720_000_000, 980_000_000, 'U'],
    ['Beban', '5-4100', 'Beban Keuangan', 7_220_000_000, 8_910_000_000, 0, 'V'],
    ['Beban', '5-5100', 'Beban Pajak Penghasilan', 9_180_000_000, 11_240_000_000, 470_000_000, 'W'],
  ].map((r: any[], i) => ({
    key: 'wtb' + i, group: r[0], code: r[1], name: r[2],
    ly: r[3], unadj: r[4], aje: r[5], adj: r[4] + r[5], lead: r[6],
  }));

  /* ---- Adjusting Journal Entries ---- */
  const AJE = [
    { id: 'AJE-01', desc: 'Penyesuaian cut-off penjualan akhir tahun', ref: 'B-3', status: 'Posted', dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 2_340_000_000 },
    { id: 'AJE-02', desc: 'Tambahan CKPN piutang sesuai PSAK 71 (ECL)', ref: 'B-7', status: 'Posted', dr: '5-3100 Beban Umum', cr: '1-1210 CKPN', amount: 620_000_000 },
    { id: 'AJE-03', desc: 'Pembalikan piutang fiktif teridentifikasi', ref: 'B-2', status: 'Proposed', dr: '4-1100 Penjualan', cr: '1-1200 Piutang', amount: 1_850_000_000 },
    { id: 'AJE-04', desc: 'Akrual bonus manajemen belum dicatat', ref: 'CC-1', status: 'Posted', dr: '5-3100 Beban Umum', cr: '2-1300 Akrual', amount: 980_000_000 },
    { id: 'AJE-05', desc: 'Koreksi penyusutan mesin produksi', ref: 'E-4', status: 'Proposed', dr: '5-1100 BPP', cr: '1-2110 Ak. Penyusutan', amount: 1_120_000_000 },
  ];

  /* ---- Risk Assessment (RoMM register) ---- */
  const RISKS = [
    { id: 'R-01', area: 'Pendapatan', assertion: 'Occurrence', desc: 'Pengakuan pendapatan dini melalui channel stuffing menjelang tutup buku', likelihood: 4, impact: 5, inherent: 'Significant', fraud: true, assertionLvl: true, response: 'Cut-off testing diperluas + konfirmasi piutang', wp: 'B-3', proc: 'psak72', owner: 'Anindya P.' },
    { id: 'R-02', area: 'Persediaan', assertion: 'Valuation', desc: 'Persediaan usang tidak diturunkan ke NRV', likelihood: 3, impact: 4, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Uji NRV & observasi stock opname', wp: 'C-2', proc: 'psak14', owner: 'Dimas R.' },
    { id: 'R-03', area: 'Piutang Usaha', assertion: 'Valuation', desc: 'Estimasi ECL (PSAK 71) tidak memadai', likelihood: 4, impact: 4, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Re-perform model ECL & uji aging', wp: 'B-7', proc: 'ecl', owner: 'Anindya P.' },
    { id: 'R-04', area: 'Aset Tetap', assertion: 'Existence', desc: 'Aset tetap dilepas namun belum dihapusbukukan', likelihood: 2, impact: 3, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Vouching penambahan & fisik sampling', wp: 'E-4', proc: 'psak16', owner: 'Dimas R.' },
    { id: 'R-05', area: 'Management Override', assertion: 'Multiple', desc: 'Manajemen mengesampingkan pengendalian melalui jurnal manual', likelihood: 3, impact: 5, inherent: 'Significant', fraud: true, assertionLvl: false, response: 'JE testing (SA 240) + telaah estimasi', wp: 'JE-1', proc: 'jet', owner: 'Anindya P.' },
    { id: 'R-06', area: 'Sewa (PSAK 73)', assertion: 'Completeness', desc: 'Kontrak sewa baru tidak diakui sebagai aset hak-guna', likelihood: 3, impact: 3, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Telaah kontrak & re-kalkulasi liabilitas sewa', wp: 'F-1', proc: 'psak73', owner: 'Sinta W.' },
    { id: 'R-07', area: 'Imbalan Kerja', assertion: 'Valuation', desc: 'Asumsi aktuaria tidak sesuai kondisi terkini', likelihood: 2, impact: 3, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Evaluasi pakar aktuaria (SA 500)', wp: 'H-2', proc: 'psak24', owner: 'Sinta W.' },
    { id: 'R-08', area: 'Pihak Berelasi', assertion: 'Completeness', desc: 'Transaksi pihak berelasi tidak diungkapkan lengkap', likelihood: 2, impact: 4, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Pengujian kelengkapan & konfirmasi', wp: 'RP-1', proc: 'related', owner: 'Dimas R.' },
  ];

  /* ---- Team / engagement staffing ---- */
  const TEAM = [
    { name: 'Hartono Wijaya, CPA', role: 'Engagement Partner', util: 71 },
    { name: 'Anindya Pramesti', role: 'Audit Manager', util: 88 },
    { name: 'Dimas Raharjo', role: 'Senior Auditor', util: 94 },
    { name: 'Sinta Wulandari', role: 'Senior Auditor', util: 90 },
    { name: 'Fajar Nugroho', role: 'Junior Auditor', util: 82 },
    { name: 'Rina Kusuma', role: 'Junior Auditor', util: 79 },
  ];

  /* ---- Working paper index (lead schedules) ---- */
  const WORKPAPERS = [
    { ref: 'A', title: 'Kas dan Setara Kas', status: 'Reviewed', preparer: 'Fajar N.', reviewer: 'Anindya P.' },
    { ref: 'B', title: 'Piutang Usaha & ECL', status: 'In Review', preparer: 'Dimas R.', reviewer: 'Anindya P.' },
    { ref: 'C', title: 'Persediaan', status: 'In Progress', preparer: 'Rina K.', reviewer: '—' },
    { ref: 'E', title: 'Aset Tetap', status: 'In Review', preparer: 'Dimas R.', reviewer: 'Anindya P.' },
    { ref: 'F', title: 'Sewa — PSAK 73', status: 'In Progress', preparer: 'Sinta W.', reviewer: '—' },
    { ref: 'R', title: 'Pendapatan', status: 'In Progress', preparer: 'Dimas R.', reviewer: '—' },
  ];

  /* ---- Activity feed ---- */
  const ACTIVITY = [
    { who: 'Dimas Raharjo', what: 'mengunggah konfirmasi bank BCA pada WP A-2', when: '14 menit lalu', icon: 'upload' },
    { who: 'Hartono Wijaya', what: 'me-review dan menyetujui AJE-04', when: '1 jam lalu', icon: 'check' },
    { who: 'Sistem', what: 'WTB ENG-2025-014 disinkronkan dari GL klien', when: '2 jam lalu', icon: 'sync' },
    { who: 'Anindya Pramesti', what: 'menaikkan risiko Pendapatan ke Significant', when: '3 jam lalu', icon: 'flag' },
    { who: 'Sinta Wulandari', what: 'menyelesaikan re-kalkulasi liabilitas sewa (F-1)', when: '5 jam lalu', icon: 'check' },
    { who: 'Citra Halim', what: 'mengirim draft opini ENG-2025-063 untuk EQR', when: 'Kemarin', icon: 'send' },
  ];

  /* ---- Deadlines ---- */
  const DEADLINES = [
    { client: 'PT Graha Properti', task: 'EQR & tanda tangan opini', date: '15 Mar', days: 6, sev: 'red' },
    { client: 'PT Sentosa Makmur', task: 'Selesai fieldwork', date: '31 Mar', days: 22, sev: 'amber' },
    { client: 'PT Mandiri Finance', task: 'Walkthrough pengendalian', date: '02 Apr', days: 24, sev: 'gray' },
    { client: 'PT Bumi Hijau', task: 'Konfirmasi piutang batch-2', date: '30 Apr', days: 52, sev: 'gray' },
  ];

  /* ---- Review notes (coaching/review/EQR notes, cross-module) ----
     type:  review | coaching | eqr | query
     ref:   cross-reference to a WP / procedure / AJE
     due:   ISO date the note should be cleared by (null = no SLA)
     thread: ordered conversation AFTER the originating note (note.text is msg 0)
             kind: response (preparer) | comment | clear (reviewer clearance) */
  const REVIEW_NOTES = [
    { id: 'RN-01', module: 'wtb', moduleLabel: 'Working Trial Balance', type: 'review', ref: 'C · Lead Persediaan', text: 'Mohon tambahkan referensi silang AJE-01 ke lead schedule persediaan (C). Saat ini cut-off BPP belum tertaut ke kertas kerja.', author: 'Hartono Wijaya', to: 'Dimas R.', status: 'open', created: '2 jam lalu', raised: '2026-03-09', due: '2026-03-12', priority: 'high', thread: [] },
    { id: 'RN-02', module: 'icfr', moduleLabel: 'Internal Control', type: 'coaching', ref: 'WP B-7 · Model ECL', text: 'Dokumentasikan dasar loss rate Stage 3 (45%) — bandingkan dengan data historis 3 tahun & ekspektasi forward-looking PSAK 71.', author: 'Anindya Pramesti', to: 'Sinta W.', status: 'open', created: '4 jam lalu', raised: '2026-03-09', due: '2026-03-13', priority: 'medium',
      thread: [
        { author: 'Sinta W.', kind: 'response', when: '1 jam lalu', text: 'Sudah saya tarik data write-off 2022–2024; rata-rata recovery 38%. Sedang menyiapkan memo penyesuaian forward-looking, draft selesai sore ini.' },
      ] },
    { id: 'RN-03', module: 'confirm', moduleLabel: 'Confirmation Hub', type: 'review', ref: 'WP B-4 · Konfirmasi Piutang', text: 'CV Sumber Rejeki "No Reply" pada batch-1 — pastikan prosedur alternatif (uji penerimaan setelah tanggal neraca) terdokumentasi lengkap sebelum kesimpulan.', author: 'Hartono Wijaya', to: 'Dimas R.', status: 'open', created: 'Kemarin', raised: '2026-03-08', due: '2026-03-07', priority: 'high',
      thread: [
        { author: 'Dimas R.', kind: 'response', when: 'Kemarin', text: 'Sudah dikirim ulang via email & WhatsApp PIC. Bila tetap nihil sampai 11 Mar, saya jalankan subsequent receipt testing terhadap pelunasan Jan–Feb 2026.' },
        { author: 'Hartono Wijaya', kind: 'comment', when: '5 jam lalu', text: 'Setuju. Lampirkan bukti pelunasan & cocokkan ke rekening koran. Catatan tetap terbuka sampai kertas kerja alternatif diunggah.' },
      ] },
    { id: 'RN-04', module: 'risk', moduleLabel: 'Risk Assessment', type: 'review', ref: 'R-01 · Pendapatan', text: 'Setuju kenaikan risiko pendapatan ke Significant. Tautkan penilaian ini ke prosedur cut-off yang diperluas & JE testing (SA 240).', author: 'Hartono Wijaya', to: 'Anindya P.', status: 'resolved', created: '2 hari lalu', raised: '2026-03-07', due: '2026-03-09', priority: 'medium',
      thread: [
        { author: 'Anindya P.', kind: 'response', when: '2 hari lalu', text: 'Sudah ditautkan ke prosedur B-3 (cut-off) dan JE-1 (journal entry testing). Matriks RoMM diperbarui.' },
        { author: 'Hartono Wijaya', kind: 'clear', when: '1 hari lalu', text: 'Memadai. Catatan dikliring.' },
      ] },
    { id: 'RN-05', module: 'fsgen', moduleLabel: 'Financial Statement', type: 'query', ref: 'CALK 18 · Sewa', text: 'Periksa kembali pengungkapan PSAK 73 di CALK — saldo aset hak-guna Rp 12,64 M sudah cocok dengan WP F-1?', author: 'Anindya Pramesti', to: 'Sinta W.', status: 'resolved', created: '3 hari lalu', raised: '2026-03-06', due: '2026-03-08', priority: 'low',
      thread: [
        { author: 'Sinta W.', kind: 'response', when: '3 hari lalu', text: 'Cocok dengan F-1. Jatuh tempo liabilitas sewa (lancar/jk panjang) juga sudah dipisah di CALK 18.' },
        { author: 'Anindya P.', kind: 'clear', when: '2 hari lalu', text: 'Oke, dikliring.' },
      ] },
    { id: 'RN-06', module: 'jet', moduleLabel: 'Journal Entry Testing', type: 'eqr', ref: 'JE-1 · Population', text: 'EQR: pastikan kriteria seleksi jurnal manual mencakup entri akhir pekan & nominal bulat besar. Dokumentasikan rasional ambang batas.', author: 'Sari Dewanti', to: 'Anindya P.', status: 'open', created: '6 jam lalu', raised: '2026-03-09', due: '2026-03-14', priority: 'high', thread: [] },
    { id: 'RN-07', module: 'wtb', moduleLabel: 'Working Trial Balance', type: 'coaching', ref: 'A · Lead Kas', text: 'Coaching: gunakan tickmark standar firma pada rekonsiliasi bank (Ω = ditelusuri ke rekening koran). Hindari anotasi bebas.', author: 'Anindya Pramesti', to: 'Fajar N.', status: 'open', created: '8 jam lalu', raised: '2026-03-08', due: '2026-03-15', priority: 'low', thread: [] },
    { id: 'RN-08', module: 'aje', moduleLabel: 'Adjusting Entries (AJE)', type: 'review', ref: 'AJE-05 · Penyusutan', text: 'AJE-05 koreksi penyusutan mesin masih berstatus Proposed — sertakan perhitungan ulang & dasar revisi masa manfaat sebelum diajukan ke partner.', author: 'Anindya Pramesti', to: 'Dimas R.', status: 'open', created: '1 hari lalu', raised: '2026-03-08', due: '2026-03-11', priority: 'medium',
      thread: [
        { author: 'Dimas R.', kind: 'response', when: '6 jam lalu', text: 'Perhitungan ulang terlampir di E-4. Masa manfaat mesin lini-2 direvisi 10→8 thn berdasarkan kajian teknis pabrik.' },
      ] },
  ].map(n => ({ engagementId: 'ENG-2025-014', ...n }));   /* P5 Fase 2: seed milik engagement demo */

  /* ---- Time entries (timesheet) ---- */
  const TIME_ENTRIES = [
    { id: 'TE-01', member: 'Anindya Pramesti', date: '2026-03-08', phase: 'Eksekusi', task: 'Review piutang & ECL', hours: 6.5 },
    { id: 'TE-02', member: 'Dimas Raharjo', date: '2026-03-08', phase: 'Eksekusi', task: 'Vouching aset tetap', hours: 8 },
    { id: 'TE-03', member: 'Sinta Wulandari', date: '2026-03-08', phase: 'Eksekusi', task: 'Re-kalkulasi sewa PSAK 73', hours: 7.5 },
    { id: 'TE-04', member: 'Fajar Nugroho', date: '2026-03-07', phase: 'Eksekusi', task: 'Lead schedule kas & bank', hours: 7 },
    { id: 'TE-05', member: 'Dimas Raharjo', date: '2026-03-07', phase: 'Eksekusi', task: 'Cut-off testing pendapatan', hours: 8 },
    { id: 'TE-06', member: 'Anindya Pramesti', date: '2026-03-07', phase: 'Eksekusi', task: 'Walkthrough pengendalian', hours: 5 },
    { id: 'TE-07', member: 'Rina Kusuma', date: '2026-03-06', phase: 'Eksekusi', task: 'Observasi stock opname', hours: 6 },
  ];

  /* ---- D: Sales pipeline (opportunities) ---- */
  const PIPELINE = [
    { id: 'OPP-101', name: 'PT Karya Beton Perkasa', service: 'Audit Laporan Keuangan', stage: 'Proposal', value: 640_000_000, prob: 60, owner: 'Hartono Wijaya', close: '2026-04-30', industry: 'Konstruksi' },
    { id: 'OPP-102', name: 'PT Digital Andalan Teknologi', service: 'Agreed-Upon Procedures', stage: 'Lead', value: 410_000_000, prob: 25, owner: 'Sari Dewanti', close: '2026-06-15', industry: 'Teknologi' },
    { id: 'OPP-103', name: 'PT Pelita Energi Nusantara', service: 'Audit + Tax', stage: 'Negotiation', value: 1_280_000_000, prob: 75, owner: 'Rudi Gunawan', close: '2026-04-10', industry: 'Energi' },
    { id: 'OPP-104', name: 'PT Sari Boga Internasional', service: 'Audit Laporan Keuangan', stage: 'Qualified', value: 720_000_000, prob: 45, owner: 'Sari Dewanti', close: '2026-05-20', industry: 'F&B' },
    { id: 'OPP-105', name: 'PT Mega Properti Sentosa', service: 'Due Diligence', stage: 'Won', value: 950_000_000, prob: 100, owner: 'Rudi Gunawan', close: '2026-03-01', industry: 'Properti' },
    { id: 'OPP-106', name: 'PT Cahaya Tekstil Mandiri', service: 'Audit Laporan Keuangan', stage: 'Lost', value: 540_000_000, prob: 0, owner: 'Hartono Wijaya', close: '2026-02-15', industry: 'Manufaktur' },
    { id: 'OPP-107', name: 'PT Bahari Logistik Prima', service: 'Review (SPR 2400)', stage: 'Qualified', value: 380_000_000, prob: 50, owner: 'Bayu Saputra', close: '2026-05-31', industry: 'Logistik' },
  ];

  /* ---- D: Invoices ---- */
  const INVOICES = [
    { id: 'INV-2026-031', clientId: 'C-014', client: 'PT Sentosa Makmur Tbk', eng: 'ENG-2025-014', issued: '2026-02-15', due: '2026-03-17', amount: 925_000_000, paid: 925_000_000, status: 'Paid', milestone: 'Termin 1 (50%)' },
    { id: 'INV-2026-040', clientId: 'C-014', client: 'PT Sentosa Makmur Tbk', eng: 'ENG-2025-014', issued: '2026-03-01', due: '2026-03-31', amount: 555_000_000, paid: 0, status: 'Sent', milestone: 'Termin 2 (30%)' },
    { id: 'INV-2026-022', clientId: 'C-040', client: 'PT Mandiri Sejahtera Finance', eng: 'ENG-2025-040', issued: '2026-02-20', due: '2026-03-22', amount: 1_170_000_000, paid: 0, status: 'Overdue', milestone: 'Termin 1 (50%)' },
    { id: 'INV-2026-035', clientId: 'C-031', client: 'PT Bumi Hijau Agrindo', eng: 'ENG-2025-031', issued: '2026-03-05', due: '2026-04-04', amount: 560_000_000, paid: 0, status: 'Sent', milestone: 'Termin 1 (50%)' },
    { id: 'INV-2026-018', clientId: 'C-063', client: 'PT Graha Properti Investama', eng: 'ENG-2025-063', issued: '2026-01-30', due: '2026-03-01', amount: 820_000_000, paid: 410_000_000, status: 'Partial', milestone: 'Termin 2 (50%)' },
    { id: 'INV-2026-012', clientId: 'C-058', client: 'PT Samudra Pangan Lestari', eng: 'ENG-2025-058', issued: '2026-01-15', due: '2026-02-14', amount: 1_650_000_000, paid: 1_650_000_000, status: 'Paid', milestone: 'Final (100%)' },
    { id: 'INV-2026-045', clientId: 'C-022', client: 'PT Cahaya Logistik Nusantara', eng: 'ENG-2025-022', issued: '2026-03-08', due: '2026-04-07', amount: 360_000_000, paid: 0, status: 'Draft', milestone: 'Termin 1 (50%)' },
  ];

  /* ---- D: Resource schedule (weekly allocation %) ---- */
  const SCHEDULE = [
    { member: 'Hartono Wijaya, CPA', role: 'Partner', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 8, color: '#005085' },
      { eng: 'ENG-2025-031', client: 'Bumi Hijau', hrs: 6, color: '#1f7a4d' },
    ]},
    { member: 'Anindya Pramesti', role: 'Manager', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 24, color: '#005085' },
      { eng: 'ENG-2025-031', client: 'Bumi Hijau', hrs: 11, color: '#1f7a4d' },
    ]},
    { member: 'Dimas Raharjo', role: 'Senior', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 38, color: '#005085' },
    ]},
    { member: 'Sinta Wulandari', role: 'Senior', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 20, color: '#005085' },
      { eng: 'ENG-2025-040', client: 'Mandiri Finance', hrs: 16, color: '#5b3fa6' },
    ]},
    { member: 'Fajar Nugroho', role: 'Junior', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 33, color: '#005085' },
    ]},
    { member: 'Rina Kusuma', role: 'Junior', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 18, color: '#005085' },
      { eng: 'ENG-2025-022', client: 'Cahaya Logistik', hrs: 14, color: '#0a6b73' },
    ]},
    { member: 'Bayu Saputra', role: 'Manager', capacity: 40, alloc: [
      { eng: 'ENG-2025-040', client: 'Mandiri Finance', hrs: 22, color: '#5b3fa6' },
    ]},
  ];

  /* ---- E: Staff (HCM) ---- */
  const STAFF = [
    { id: 'EMP-001', name: 'Hartono Wijaya', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, CA, AP', joined: 2009, util: 71, status: 'Aktif', email: 'hartono.w@whr-cpa.id', engagements: 3, rating: 4.6 },
    { id: 'EMP-002', name: 'Rudi Gunawan', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, AP', joined: 2011, util: 68, status: 'Aktif', email: 'rudi.g@whr-cpa.id', engagements: 2, rating: 4.5 },
    { id: 'EMP-003', name: 'Sari Dewanti', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, AP', joined: 2013, util: 74, status: 'Aktif', email: 'sari.d@whr-cpa.id', engagements: 2, rating: 4.4 },
    { id: 'EMP-007', name: 'Anindya Pramesti', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2016, util: 88, status: 'Aktif', email: 'anindya.p@whr-cpa.id', engagements: 2, rating: 4.7 },
    { id: 'EMP-008', name: 'Bayu Saputra', role: 'Audit Manager', grade: 'Manager', cert: 'CPA', joined: 2017, util: 81, status: 'Aktif', email: 'bayu.s@whr-cpa.id', engagements: 2, rating: 4.2 },
    { id: 'EMP-012', name: 'Citra Halim', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2017, util: 79, status: 'Cuti', email: 'citra.h@whr-cpa.id', engagements: 1, rating: 4.3 },
    { id: 'EMP-021', name: 'Dimas Raharjo', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2020, util: 94, status: 'Aktif', email: 'dimas.r@whr-cpa.id', engagements: 1, rating: 4.5 },
    { id: 'EMP-022', name: 'Sinta Wulandari', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2020, util: 90, status: 'Aktif', email: 'sinta.w@whr-cpa.id', engagements: 2, rating: 4.4 },
    { id: 'EMP-031', name: 'Fajar Nugroho', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2023, util: 82, status: 'Aktif', email: 'fajar.n@whr-cpa.id', engagements: 1, rating: 4.0 },
    { id: 'EMP-032', name: 'Rina Kusuma', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2024, util: 79, status: 'Aktif', email: 'rina.k@whr-cpa.id', engagements: 2, rating: 3.9 },
  ];

  /* ---- E: CPE/PPL requirement & records (annual 40 SKP; 20 terstruktur) ---- */
  const CPE_REQ = { annual: 40, structured: 20, year: 2026 };
  /* per staff: structured + unstructured hours logged this year */
  const CPE_LOG = {
    'EMP-001': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10' }, { t: 'ISQM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22' }, { t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 10, date: '2026-03-01' }],
    'EMP-002': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10' }, { t: 'Etika Profesi & Independensi', type: 'Terstruktur', skp: 4, date: '2026-01-18' }, { t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 6, date: '2026-03-02' }],
    'EMP-003': [{ t: 'PSAK 117 (Kontrak Asuransi)', type: 'Terstruktur', skp: 8, date: '2026-02-12' }, { t: 'ISQM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22' }, { t: 'Audit Berbasis Risiko', type: 'Terstruktur', skp: 8, date: '2026-02-26' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 9, date: '2026-03-05' }],
    'EMP-007': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 14, date: '2026-03-06' }],
    'EMP-021': [{ t: 'Audit Sampling MUS', type: 'Terstruktur', skp: 6, date: '2026-02-20' }, { t: 'Self-study', type: 'Tidak Terstruktur', skp: 6, date: '2026-03-02' }],
    'EMP-031': [{ t: 'Onboarding Audit Methodology', type: 'Terstruktur', skp: 12, date: '2026-01-15' }],
  };

  /* ---- E: Independence declarations & partner rotation ----
     Ambang rotasi AP terdiferensiasi per rezim (SSOT):
       · PIE umum            → 5 th berturut  (PP 20/2015 Ps. 11)
       · Sektor jasa keuangan → 3 th berturut  (POJK 13/POJK.03/2017)
     cooling-off 2 tahun. Non-PIE: tidak ada batas statutori AP. */
  const INDEPENDENCE = [
    { id: 'EMP-001', name: 'Hartono Wijaya', declared: true, conflicts: 0, finInterest: 'Tidak ada', rotationClient: 'PT Sentosa Makmur Tbk', tenure: 5, rotationLimit: 5, sektorJK: false, sektor: 'PIE umum', basis: 'PP 20/2015 Ps. 11', cooloff: 2, listed: true },
    { id: 'EMP-002', name: 'Rudi Gunawan', declared: true, conflicts: 0, finInterest: 'Tidak ada', rotationClient: 'PT Graha Properti Investama', tenure: 7, rotationLimit: 5, sektorJK: false, sektor: 'PIE umum', basis: 'PP 20/2015 Ps. 11', cooloff: 2, listed: true },
    { id: 'EMP-003', name: 'Sari Dewanti', declared: true, conflicts: 1, finInterest: 'Saudara bekerja di calon klien (di-mitigasi)', rotationClient: 'PT Cahaya Logistik Nusantara', tenure: 3, rotationLimit: 5, sektorJK: false, sektor: 'Non-PIE', basis: 'Kebijakan firma (tanpa batas statutori)', cooloff: 0, listed: false },
    { id: 'EMP-007', name: 'Anindya Pramesti', declared: true, conflicts: 0, finInterest: 'Tidak ada', rotationClient: '—', tenure: 0, rotationLimit: 5, sektorJK: false, sektor: '—', basis: '—', cooloff: 2, listed: false },
    { id: 'EMP-008', name: 'Bayu Saputra', declared: false, conflicts: 0, finInterest: 'Belum dideklarasikan', rotationClient: '—', tenure: 0, rotationLimit: 5, sektorJK: false, sektor: '—', basis: '—', cooloff: 2, listed: false },
  ];

  /* ---- F: Firm GL — chart of accounts ---- */
  const FIRM_COA = [
    { code: '1-100', name: 'Kas & Bank', type: 'Aset', bal: 8_420_000_000 },
    { code: '1-200', name: 'Piutang Usaha (klien)', type: 'Aset', bal: 4_440_000_000 },
    { code: '1-300', name: 'WIP Belum Ditagih', type: 'Aset', bal: 9_300_000_000 },
    { code: '1-400', name: 'Aset Tetap — neto', type: 'Aset', bal: 6_100_000_000 },
    { code: '2-100', name: 'Utang Usaha (vendor)', type: 'Liabilitas', bal: -1_820_000_000 },
    { code: '2-200', name: 'Utang Pajak', type: 'Liabilitas', bal: -940_000_000 },
    { code: '2-300', name: 'Beban Akrual', type: 'Liabilitas', bal: -1_260_000_000 },
    { code: '3-100', name: 'Modal Rekan', type: 'Ekuitas', bal: -14_000_000_000 },
    { code: '3-200', name: 'Saldo Laba', type: 'Ekuitas', bal: -7_440_000_000 },
    { code: '4-100', name: 'Pendapatan Jasa', type: 'Pendapatan', bal: -11_300_000_000 },
    { code: '5-100', name: 'Beban Gaji & Tunjangan', type: 'Beban', bal: 5_420_000_000 },
    { code: '5-200', name: 'Beban Overhead Kantor', type: 'Beban', bal: 1_570_000_000 },
    { code: '5-300', name: 'Beban Umum & Administrasi', type: 'Beban', bal: 540_000_000 },
    { code: '5-400', name: 'Beban Pemasaran & Pengembangan', type: 'Beban', bal: 360_000_000 },
    { code: '5-500', name: 'Beban Teknologi & Lisensi', type: 'Beban', bal: 610_000_000 },
  ];

  /* ---- F: Firm GL — journal entries ---- */
  const FIRM_GL = [
    { id: 'JV-0312', date: '2026-03-08', desc: 'Penerimaan pembayaran INV-2026-031 (Sentosa)', dr: '1-100', cr: '1-200', amount: 925_000_000, posted: true },
    { id: 'JV-0311', date: '2026-03-07', desc: 'Pembayaran gaji staf Maret', dr: '5-100', cr: '1-100', amount: 1_820_000_000, posted: true },
    { id: 'JV-0310', date: '2026-03-05', desc: 'Faktur vendor IT & lisensi software', dr: '5-200', cr: '2-100', amount: 340_000_000, posted: true },
    { id: 'JV-0309', date: '2026-03-04', desc: 'Pengakuan pendapatan termin INV-2026-040', dr: '1-200', cr: '4-100', amount: 555_000_000, posted: true },
    { id: 'JV-0308', date: '2026-03-03', desc: 'Sewa kantor kuartal Q1', dr: '5-200', cr: '1-100', amount: 480_000_000, posted: true },
    { id: 'JV-0307', date: '2026-03-01', desc: 'Akrual PPh 21 karyawan', dr: '5-100', cr: '2-200', amount: 210_000_000, posted: false },
  ];

  /* ---- F: Firm AP — vendor payables ---- */
  const FIRM_AP = [
    { id: 'AP-0042', vendor: 'PT Solusi Teknologi Audit', cat: 'Software & Lisensi', issued: '2026-02-20', due: '2026-03-22', amount: 340_000_000, paid: 0, status: 'Outstanding' },
    { id: 'AP-0041', vendor: 'PT Properti Graha Kantor', cat: 'Sewa Kantor', issued: '2026-03-01', due: '2026-03-31', amount: 480_000_000, paid: 0, status: 'Outstanding' },
    { id: 'AP-0040', vendor: 'CV Cipta Kreatif Media', cat: 'Marketing & Branding', issued: '2026-02-10', due: '2026-03-12', amount: 95_000_000, paid: 0, status: 'Overdue' },
    { id: 'AP-0039', vendor: 'PT Asuransi Profesi Indonesia', cat: 'Asuransi PI', issued: '2026-01-15', due: '2026-02-14', amount: 620_000_000, paid: 620_000_000, status: 'Paid' },
    { id: 'AP-0038', vendor: 'Koperasi Karyawan WHR', cat: 'Operasional', issued: '2026-02-25', due: '2026-03-27', amount: 130_000_000, paid: 0, status: 'Outstanding' },
    { id: 'AP-0037', vendor: 'PT Listrik & Utilitas', cat: 'Utilitas', issued: '2026-03-02', due: '2026-04-01', amount: 78_000_000, paid: 0, status: 'Outstanding' },
  ];

  /* ---- Front-office: Client & Engagement Onboarding pipeline ---- */
  /* Each prospect carries 4 gates: acceptance · pmpj · letter · convert. */
  const ACC_FACTORS = (over: any = {}) => [
    { k: 'Integritas & Reputasi Manajemen', w: 25, s: 3, note: '', ...over[0] },
    { k: 'Independensi & Konflik Kepentingan', w: 20, s: 3, note: '', ...over[1] },
    { k: 'Kompetensi, Waktu & Kapasitas Tim', w: 20, s: 3, note: '', ...over[2] },
    { k: 'Risiko Perikatan & Industri', w: 25, s: 3, note: '', ...over[3] },
    { k: 'Etika & Proporsionalitas Imbalan', w: 10, s: 3, note: '', ...over[4] },
  ];
  const PROSPECTS = [
    {
      id: 'PROS-01', name: 'PT Pelita Energi Nusantara', industry: 'Energi · Pembangkit Listrik', city: 'Jakarta Selatan',
      listed: false, kind: 'Klien Baru', service: 'Audit LK + Jasa Pajak', standard: 'SA + PSAK 71',
      partner: 'Rudi Gunawan, CPA', manager: 'Bayu Saputra', fee: 1_280_000_000, materiality: 3_400_000_000,
      npwp: '02.667.881.3-091.000', fyEnd: '31 Desember 2025', deadline: '2026-05-15', budgetHrs: 1680, source: 'OPP-103',
      acceptance: {
        approved: true, decision: 'Terima dengan Syarat', approver: 'Rudi Gunawan, CPA', date: '2026-02-18',
        safeguard: 'Tambahkan spesialis industri energi & pakar pajak; EDD atas pemilik manfaat PEP.',
        factors: ACC_FACTORS({
          0: { s: 4, note: 'Penelusuran media & rekam jejak litigasi: tidak ada temuan material.' },
          1: { s: 5, note: 'Tidak ada kepentingan keuangan/keluarga; rotasi partner aman.' },
          2: { s: 3, note: 'Memerlukan spesialis industri energi & pakar pajak.' },
          3: { s: 3, note: 'Regulasi ketenagalistrikan, subsidi & PSAK 71 — risiko sedang–tinggi.' },
          4: { s: 4, note: 'Imbalan wajar, tidak ada indikasi lowballing.' },
        }),
      },
      pmpj: {
        verified: false, riskRating: 'Tinggi', cddLevel: 'Mendalam (EDD)', str: false, purpose: 'Perikatan audit & kepatuhan pajak tahunan.',
        ubo: [
          { name: 'Bambang Sutrisno', pct: 42, role: 'Komisaris Utama', idType: 'KTP', idNo: '3174••••••••0012', pep: true },
          { name: 'Pelita Holdings Pte Ltd (SG)', pct: 33, role: 'Pemegang Saham Korporasi', idType: 'Reg. SG', idNo: '2018•••••W', pep: false },
          { name: 'Dewi Anggraini', pct: 25, role: 'Direktur Utama', idType: 'KTP', idNo: '3174••••••••0024', pep: false },
        ],
        screening: [
          { name: 'Bambang Sutrisno', list: 'PEP — eks-pejabat BUMN 2019–2022', hit: true, status: 'Mitigasi: EDD + persetujuan partner' },
          { name: 'PT Pelita Energi Nusantara', list: 'DTTOT / Daftar Terduga Teroris', hit: false, status: 'Bersih' },
          { name: 'Pelita Holdings Pte Ltd', list: 'OFAC / UN Consolidated List', hit: false, status: 'Bersih' },
        ],
      },
      letter: { version: 0, status: 'draft', scope: 'Audit atas laporan keuangan FY2025 sesuai SA + jasa kepatuhan PPh Badan.', esign: [] },
    },
    {
      id: 'PROS-02', name: 'PT Sari Boga Internasional', industry: 'Manufaktur · F&B', city: 'Tangerang, Banten',
      listed: false, kind: 'Klien Baru', service: 'Audit Laporan Keuangan', standard: 'SA',
      partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', fee: 720_000_000, materiality: 1_600_000_000,
      npwp: '04.551.220.8-411.000', fyEnd: '31 Desember 2025', deadline: '2026-06-20', budgetHrs: 940, source: 'OPP-104',
      acceptance: {
        approved: false, decision: '', approver: '', date: '', safeguard: '',
        factors: ACC_FACTORS({
          0: { s: 3, note: 'Menunggu konfirmasi auditor pendahulu (SA 300/SA 510).' },
          1: { s: 4, note: 'Belum teridentifikasi konflik; konfirmasi independensi tim berjalan.' },
          2: { s: 4, note: 'Kapasitas tim memadai untuk skala perikatan.' },
          3: { s: 3, note: 'Risiko cut-off & retur penjualan distribusi F&B.' },
          4: { s: 3, note: 'Imbalan kompetitif; perlu uji proporsionalitas terhadap ruang lingkup.' },
        }),
      },
      pmpj: {
        verified: false, riskRating: 'Sedang', cddLevel: 'Standar', str: false, purpose: 'Perikatan audit laporan keuangan tahunan.',
        ubo: [
          { name: 'Hendra Wijaya', pct: 60, role: 'Pemegang Saham Pengendali', idType: 'KTP', idNo: '3603••••••••0009', pep: false },
          { name: 'Maria Tanudjaja', pct: 40, role: 'Komisaris', idType: 'KTP', idNo: '3603••••••••0017', pep: false },
        ],
        screening: [
          { name: 'Hendra Wijaya', list: 'PEP / DTTOT', hit: false, status: 'Bersih' },
          { name: 'PT Sari Boga Internasional', list: 'Daftar Sanksi', hit: false, status: 'Bersih' },
        ],
      },
      letter: { version: 0, status: 'draft', scope: 'Audit atas laporan keuangan FY2025 sesuai Standar Audit (SA).', esign: [] },
    },
    {
      id: 'PROS-03', name: 'PT Karya Beton Perkasa', industry: 'Konstruksi & Material', city: 'Semarang, Jawa Tengah',
      listed: false, kind: 'Klien Baru', service: 'Audit Laporan Keuangan', standard: 'SA',
      partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', fee: 640_000_000, materiality: 1_350_000_000,
      npwp: '02.901.337.2-407.000', fyEnd: '31 Desember 2025', deadline: '2026-04-30', budgetHrs: 880, source: 'OPP-101', clientId: 'C-052',
      acceptance: {
        approved: true, decision: 'Terima', approver: 'Hartono Wijaya, CPA', date: '2026-02-26', safeguard: '',
        factors: ACC_FACTORS({
          0: { s: 4, note: 'Reputasi baik; tidak ada catatan negatif.' },
          1: { s: 5, note: 'Tidak ada konflik; independensi tim dikonfirmasi.' },
          2: { s: 4, note: 'Tim & jadwal tersedia sesuai tenggat.' },
          3: { s: 3, note: 'Pengakuan pendapatan kontrak konstruksi (PSAK 72) — perhatian.' },
          4: { s: 4, note: 'Imbalan proporsional.' },
        }),
      },
      pmpj: {
        verified: true, riskRating: 'Sedang', cddLevel: 'Standar', str: false, purpose: 'Perikatan audit laporan keuangan tahunan.',
        ubo: [
          { name: 'Sutopo Hadi', pct: 55, role: 'Direktur Utama / Pendiri', idType: 'KTP', idNo: '3374••••••••0003', pep: false },
          { name: 'Karya Investama (Holding)', pct: 45, role: 'Pemegang Saham Korporasi', idType: 'NIB', idNo: '8120•••••', pep: false },
        ],
        screening: [
          { name: 'Sutopo Hadi', list: 'PEP / DTTOT / OFAC', hit: false, status: 'Bersih' },
          { name: 'PT Karya Beton Perkasa', list: 'Daftar Sanksi', hit: false, status: 'Bersih' },
        ],
      },
      letter: { version: 1, status: 'draft', scope: 'Audit atas laporan keuangan FY2025 sesuai Standar Audit (SA).', esign: [] },
    },
    {
      id: 'PROS-04', name: 'PT Sentosa Makmur Tbk', industry: 'Manufaktur · Consumer Goods', city: 'Bekasi, Jawa Barat',
      listed: true, kind: 'Keberlanjutan', service: 'Audit Laporan Keuangan', standard: 'SA (ISA-converged)',
      partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', fee: 1_850_000_000, materiality: 4_250_000_000,
      npwp: '01.234.567.8-045.000', fyEnd: '31 Desember 2025', deadline: '2026-03-31', budgetHrs: 1840, source: 'Eksisting', clientId: 'C-014',
      priorYear: 'Opini Wajar Tanpa Modifikasian (FY2024). Tahun ke-5 partner — pantau ambang rotasi.',
      acceptance: {
        approved: false, decision: '', approver: '', date: '', safeguard: '',
        factors: ACC_FACTORS({
          0: { s: 4, note: 'Hubungan baik; tidak ada perubahan integritas signifikan.' },
          1: { s: 3, note: 'Tahun ke-5 partner penanggung jawab — dekati ambang rotasi (7 thn).' },
          2: { s: 4, note: 'Tim eksisting memahami bisnis klien.' },
          3: { s: 4, note: 'Indikasi channel stuffing tahun lalu — risiko kecurangan pendapatan naik.' },
          4: { s: 4, note: 'Imbalan disesuaikan inflasi; proporsional.' },
        }),
      },
      pmpj: {
        verified: true, riskRating: 'Sedang', cddLevel: 'Standar (pembaruan tahunan)', str: false, purpose: 'Pembaruan PMPJ atas perikatan keberlanjutan.',
        ubo: [
          { name: 'Keluarga Sentosa (Trust)', pct: 51, role: 'Pengendali Utama', idType: 'Akta', idNo: 'No. 14/2016', pep: false },
          { name: 'Publik (IDX free-float)', pct: 35, role: 'Publik', idType: '—', idNo: '—', pep: false },
          { name: 'Lim Investment Ltd', pct: 14, role: 'Pemegang Saham', idType: 'Reg. SG', idNo: '2014•••••X', pep: false },
        ],
        screening: [
          { name: 'Pengurus & Pemegang Saham >25%', list: 'PEP / DTTOT / OFAC', hit: false, status: 'Bersih (pembaruan tahunan)' },
        ],
      },
      letter: { version: 0, status: 'draft', scope: 'Audit atas laporan keuangan FY2025 sesuai SA (perikatan keberlanjutan).', esign: [] },
    },
    {
      id: 'PROS-05', name: 'PT Bahari Logistik Prima', industry: 'Transportasi & Logistik', city: 'Surabaya, Jawa Timur',
      listed: false, kind: 'Klien Baru', service: 'Review (SPR 2400)', standard: 'SPR 2400',
      partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', fee: 380_000_000, materiality: 900_000_000,
      npwp: '02.778.114.5-622.000', fyEnd: '31 Desember 2025', deadline: '2026-05-31', budgetHrs: 520, source: 'OPP-107',
      acceptance: {
        approved: true, decision: 'Terima', approver: 'Sari Dewanti, CPA', date: '2026-02-10', safeguard: '',
        factors: ACC_FACTORS({
          0: { s: 4, note: 'Reputasi & rekam jejak baik.' },
          1: { s: 5, note: 'Tidak ada konflik.' },
          2: { s: 4, note: 'Kapasitas memadai (perikatan reviu, lingkup terbatas).' },
          3: { s: 4, note: 'Risiko rendah–sedang; keyakinan terbatas.' },
          4: { s: 4, note: 'Imbalan proporsional.' },
        }),
      },
      pmpj: {
        verified: true, riskRating: 'Rendah', cddLevel: 'Sederhana', str: false, purpose: 'Perikatan reviu laporan keuangan tahunan.',
        ubo: [
          { name: 'Agus Santoso', pct: 70, role: 'Direktur Utama / Pendiri', idType: 'KTP', idNo: '3578••••••••0001', pep: false },
          { name: 'Linda Santoso', pct: 30, role: 'Komisaris', idType: 'KTP', idNo: '3578••••••••0019', pep: false },
        ],
        screening: [
          { name: 'Agus Santoso', list: 'PEP / DTTOT / OFAC', hit: false, status: 'Bersih' },
        ],
      },
      letter: {
        version: 2, status: 'signed', scope: 'Reviu atas laporan keuangan FY2025 sesuai SPR 2400 (keyakinan terbatas).',
        signedBy: 'Agus Santoso (Direktur Utama)', signedDate: '2026-03-04',
        esign: [
          { t: 'Surat dibuat (v1)', who: 'Bayu Saputra', date: '2026-02-26' },
          { t: 'Dikirim untuk tanda tangan (PrivyID)', who: 'Sistem', date: '2026-03-01' },
          { t: 'Ditandatangani klien & partner', who: 'PrivyID', date: '2026-03-04' },
        ],
      },
    },
    {
      id: 'PROS-06', name: 'PT Mega Properti Sentosa', industry: 'Properti & Real Estate', city: 'Jakarta Pusat',
      listed: false, kind: 'Klien Baru', service: 'Due Diligence', standard: 'SJAH 3000',
      partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', fee: 950_000_000, materiality: 2_000_000_000,
      npwp: '01.992.554.0-079.000', fyEnd: '31 Desember 2025', deadline: '2026-04-10', budgetHrs: 720, source: 'OPP-105',
      converted: true, convertedTo: 'ENG-2025-0X',
      acceptance: { approved: true, decision: 'Terima', approver: 'Rudi Gunawan, CPA', date: '2026-01-20', safeguard: '', factors: ACC_FACTORS({ 0: { s: 4 }, 1: { s: 5 }, 2: { s: 4 }, 3: { s: 4 }, 4: { s: 4 } }) },
      pmpj: { verified: true, riskRating: 'Sedang', cddLevel: 'Standar', str: false, purpose: 'Uji tuntas keuangan (financial due diligence).', ubo: [{ name: 'Mega Group Holding', pct: 100, role: 'Korporasi', idType: 'NIB', idNo: '9120•••••', pep: false }], screening: [{ name: 'Mega Group Holding', list: 'PEP / Sanksi', hit: false, status: 'Bersih' }] },
      letter: { version: 1, status: 'signed', scope: 'Perikatan asurans uji tuntas keuangan sesuai SJAH 3000.', signedBy: 'Direktur Mega Group', signedDate: '2026-02-28', esign: [{ t: 'Ditandatangani', who: 'PrivyID', date: '2026-02-28' }] },
    },
  ];

  /* ---- Firm Finance (ERP) — Treasury, Tax, Revenue ---- */
  /* FX rates to IDR (per 28 Feb 2026) */

export { FIRM, USER, CLIENTS, ENGAGEMENTS, WTB, AJE, RISKS, TEAM, WORKPAPERS, ACTIVITY, DEADLINES, REVIEW_NOTES, TIME_ENTRIES, PIPELINE, INVOICES, SCHEDULE, STAFF, CPE_REQ, CPE_LOG, INDEPENDENCE, FIRM_COA, FIRM_GL, FIRM_AP, ACC_FACTORS, PROSPECTS };
