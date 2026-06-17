/* ============================================================
   NeoSuite AMS — Sample data
   KAP Wijaya Hartono & Rekan  ·  fictional Indonesian firm
   ============================================================ */
(function () {
  const fmt = (n, d = 0) =>
    (n < 0 ? '(' : '') +
    Math.abs(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) +
    (n < 0 ? ')' : '');
  const rp = (n, d = 0) => 'Rp ' + fmt(n, d);

  /* ---- The firm ---- */
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
  ].map((r, i) => ({
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
  ];

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
  const ACC_FACTORS = (over = {}) => [
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
     Konsumsi via window.AMS.aupEngine(exec).
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
     Konsumsi via window.AMS.pfiEngine(exec).
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
  function pfiEngine(execArg) {
    const A = PFI_3400, M = A.model, n = M.rev.length;
    let exec = execArg;
    if (!exec && typeof localStorage !== 'undefined') {
      try { exec = JSON.parse(localStorage.getItem('ams.v1.pfi3400.exec') || 'null'); } catch (e) {}
    }
    exec = exec || {};
    /* ---- model turunan (semua direkomputasi dari angka sumber) ---- */
    const ebitda = M.rev.map((r, i) => r - M.opex[i]);
    const ebitdaTie = ebitda.every((v, i) => v === M.statedEbitda[i]);
    const npbt = ebitda.map((e, i) => e - M.da[i]);
    const tax = M.rev.map(r => Math.round(r * A.taxRate));
    const npat = npbt.map((p, i) => p - tax[i]);
    const cagr = Math.pow(M.rev[n - 1] / M.rev[0], 1 / (n - 1)) - 1; // desimal
    const cagrCap = 0.30;
    const occ = A.occupancy;
    const occOk = occ.value >= occ.lo && occ.value <= occ.hi;
    /* sensitivitas: hunian −10 ppt → pendapatan turun proporsional thd hunian */
    const sensPpt = 10;
    const sensRevFactor = sensPpt / occ.value;
    const sensRevDrop = Math.round(M.rev[0] * sensRevFactor);
    const sensNpat = npat[0] - sensRevDrop; // dampak ke laba tahun pertama
    /* asumsi */
    const bestA = A.assumptions.filter(a => a.kind === 'best');
    const hypoA = A.assumptions.filter(a => a.kind === 'hypo');
    const reasonableAll = bestA.every(a => a.reasonable) && hypoA.every(a => a.reasonable);
    const hyposDisclosed = hypoA.every(a => a.disclosed);
    /* ---- evaluasi per prosedur (pass + narasi temuan) ---- */
    const pct1 = (x) => (x * 100).toFixed(1).replace('.', ',');
    const evalProc = (p) => {
      switch (p.id) {
        case 'occ': return { pass: occOk,
          finding: 'Asumsi hunian ' + occ.value + '% berada dalam band pasar ' + occ.lo + '–' + occ.hi + '% (acuan pasar ' + occ.market + '%) — ' + (occOk ? 'wajar.' : 'DI LUAR band — perlu pertimbangan.') };
        case 'cagr': return { pass: cagr <= cagrCap,
          finding: 'CAGR pendapatan ' + pct1(cagr) + '% (Rp ' + fmt(M.rev[0]) + ' → Rp ' + fmt(M.rev[n - 1]) + ' jt); ambang pasar ' + pct1(cagrCap) + '% — ' + (cagr <= cagrCap ? 'dalam batas wajar.' : 'MELEBIHI ambang — agresif.') };
        case 'tie': return { pass: ebitdaTie,
          finding: ebitdaTie
            ? 'Rekomputasi EBITDA = Pendapatan − Beban cocok untuk seluruh ' + n + ' periode (mis. ' + fmt(M.rev[0]) + ' − ' + fmt(M.opex[0]) + ' = ' + fmt(ebitda[0]) + ' jt).'
            : 'Selisih aritmetika EBITDA pada model — TIDAK cocok dengan angka yang disajikan.' };
        case 'hypo': return { pass: hyposDisclosed,
          finding: hypoA.length + ' asumsi hipotetis (mis. ' + hypoA.map(a => a.k.split(' ').slice(0, 3).join(' ')).join('; ') + ') — ' + (hyposDisclosed ? 'seluruhnya diungkap & konsisten dengan tujuan.' : 'pengungkapan belum lengkap.') };
        case 'consistency': return { pass: true,
          finding: 'Dasar penyusunan proyeksi konsisten dengan kebijakan akuntansi PSAK & LK historis auditan FY2025.' };
        case 'presentation': return { pass: true,
          finding: 'Penyajian, pengungkapan asumsi, tanggal proyeksi, & paragraf peringatan ditelaah sesuai SJAH 3400 ¶21–27.' };
        default: return { pass: true, finding: '' };
      }
    };
    const procedures = A.procedures.map(p => {
      const ev = evalProc(p);
      const done = Object.prototype.hasOwnProperty.call(exec, p.no) ? !!exec[p.no] : !!p.seedDone;
      return { ...p, pass: ev.pass, finding: ev.finding, exception: done && !ev.pass, done };
    });
    const total = procedures.length;
    const done = procedures.filter(p => p.done).length;
    const exceptions = procedures.filter(p => p.done && !p.pass).length;
    const progress = total ? Math.round((done / total) * 100) : 0;
    const complete = done === total;
    /* asumsi dinilai = prosedur kewajaran (occ, cagr, hypo) selesai & lolos */
    const assumpProcs = procedures.filter(p => ['occ', 'cagr', 'hypo'].includes(p.id));
    const assumpReviewed = assumpProcs.every(p => p.done);
    const assumpReasonable = assumpReviewed && assumpProcs.every(p => p.pass) && reasonableAll;
    const presentationDone = procedures.find(p => p.id === 'presentation').done;
    const canConclude = complete && exceptions === 0;
    /* bentuk simpulan SJAH 3400: keyakinan NEGATIF atas asumsi +
       opini POSITIF atas penyusunan/penyajian + paragraf peringatan WAJIB. */
    const negativeAssurance = (assumpReasonable
      ? 'Berdasarkan pemeriksaan bukti pendukung asumsi, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa asumsi-asumsi tersebut tidak memberikan dasar yang memadai bagi proyeksi.'
      : 'Pemeriksaan kewajaran asumsi belum selesai — simpulan keyakinan negatif belum dapat dirumuskan.');
    const properlyPrepared = (ebitdaTie
      ? 'Menurut opini kami, proyeksi tersebut telah disusun dengan tepat atas dasar asumsi yang diungkapkan dan disajikan sesuai dengan PSAK.'
      : 'Opini atas penyusunan tertunda — terdapat ketidakcocokan aritmetika model.');
    const caveat = 'Realisasi kemungkinan berbeda dari proyeksi karena peristiwa yang diantisipasi sering kali tidak terjadi sebagaimana diharapkan, dan perbedaannya dapat material — terlebih karena proyeksi memuat asumsi hipotetis.';
    /* hal pokok (matters) — untuk konsistensi tampilan Asurans Lain & laporan */
    const matters = procedures.map(p => ({
      m: p.short, ref: p.ref, claim: p.id === 'cagr' ? pct1(cagr) + '%' : (p.id === 'occ' ? occ.value + '%' : (p.id === 'tie' ? 'Rp ' + fmt(ebitda[0]) + ' jt' : (p.id === 'hypo' ? hypoA.length + ' hipotetis' : '—'))),
      proc: p.proc, concl: p.finding, ok: p.done && p.pass,
    }));
    const assuranceEntry = {
      std: 'SJAH 3400', level: A.level + ' + WTM proyeksi',
      subject: A.subject, criteria: A.criteria, matters,
    };
    return {
      meta: A, periods: A.periods,
      derived: { ebitda, ebitdaTie, npbt, tax, npat, cagr, cagrCap, occOk, sensPpt, sensRevDrop, sensNpat },
      assumptions: A.assumptions, bestA, hypoA, reasonableAll, hyposDisclosed,
      procedures, total, done, exceptions, progress, complete,
      assumpReviewed, assumpReasonable, presentationDone, canConclude,
      conclusion: { negativeAssurance, properlyPrepared, caveat },
      matters, assuranceEntry,
    };
  }
  /* ============================================================
     SJAH 3402 — Laporan Asurans atas Pengendalian Organisasi Jasa
     ------------------------------------------------------------
     SUMBER KEBENARAN TUNGGAL untuk perikatan ASR-2025-081 (kita
     sebagai AUDITOR JASA menerbitkan laporan Type 2 atas organisasi
     jasa penggajian PT Payroll Solusi Indonesia — selaras ISAE 3402
     / SOC 1). Seluruh agregat (jumlah tujuan pengendalian, kontrol,
     kontrol yang diuji, deviasi, pengecualian yang dilaporkan),
     efektivitas operasi per tujuan, bentuk opini tiga-bagian, progres,
     & ringkasan untuk pengguna DIHITUNG oleh `socEngine` dari
     `objectives`/`controls`/`tests` — TIDAK di-hardcode.
     Satu perubahan angka sumber mengalir konsisten ke:
       · Modul SJAH 3402 (view_sjah3402 — halaman penuh)
       · Asurans Lain (view_relatedsvc · OtherAssurance — hal pokok)
       · Portofolio Jasa (view_nonaudit · progres dihitung engine)
       · Organisasi Jasa SA 402 (view_serviceorg · SO-01 — sisi auditor
         pengguna menarik reportType/opini/deviasi/CUEC dari engine)
       · Katalog SJAH 3000 (view_sjah3000 · ASR-081 — hal pokok)
       · Matriks Kepatuhan (SJAH 3402)
     Konsumsi via window.AMS.socEngine(exec).
     ============================================================ */
  const SOC_3402 = {
    id: 'ASR-2025-081', client: 'PT Payroll Solusi Indonesia',
    system: 'Sistem Pemrosesan Penggajian Ter-outsource — "NeoPay"',
    std: 'SJAH 3402', framework: 'SJAH 3402 (selaras ISAE 3402 / SOC 1 Type 2)',
    reportType: 'Type 2', level: 'Memadai', approach: 'Langsung + asersi tertulis manajemen',
    period: '1 Januari – 31 Desember 2025', periodShort: 'Jan – Des 2025', asOf: '31 Desember 2025',
    partner: 'Hartono Wijaya, CPA', manager: 'Citra Halim', preparer: 'Dimas Raharjo',
    fee: 410_000_000, engagedOn: '15 Jan 2026', reportTarget: '10 Mei 2026', deadline: '2026-05-10',
    subject: 'Kewajaran penyajian deskripsi sistem, kesesuaian desain, & efektivitas operasi pengendalian pada organisasi jasa penggajian sepanjang periode',
    criteria: 'Kriteria deskripsi & tujuan pengendalian yang ditetapkan manajemen organisasi jasa (selaras ISAE 3402)',
    intendedUsers: 'Entitas pengguna (klien alih daya penggajian) & auditor laporan keuangan mereka — penggunaan terbatas',
    responsibleParty: 'Manajemen PT Payroll Solusi Indonesia',
    independence: 'KAP independen terhadap organisasi jasa sesuai Kode Etik IAPI; status diungkap dalam laporan.',
    /* Penanganan subservice — Inclusive (tidak ada sub-pemroses signifikan yang di-carve-out) */
    subservice: { method: 'Inclusive', name: null, note: 'Tidak terdapat organisasi subservice signifikan; seluruh kontrol relevan tercakup metode inclusive.' },
    /* Akun/asersi entitas pengguna yang terpengaruh (untuk pemetaan SA 402) */
    userImpact: { areas: 'Beban Gaji · Utang Gaji · PPh 21 · BPJS', assertions: 'Akurasi · Kelengkapan · Pisah Batas' },
    /* Persyaratan penerimaan perikatan — ISAE/SJAH 3402 ¶13–17 */
    terms: [
      { k: 'Kriteria deskripsi & tujuan pengendalian sesuai dan tersedia bagi pengguna', ok: true },
      { k: 'Manajemen menyediakan asersi tertulis atas deskripsi, desain, & efektivitas operasi', ok: true },
      { k: 'Lingkup pekerjaan tidak dibatasi oleh manajemen organisasi jasa', ok: true },
      { k: 'Penanganan organisasi subservice disepakati (inclusive vs carve-out)', ok: true },
      { k: 'Tipe laporan disepakati: Type 2 (desain + efektivitas operasi sepanjang periode)', ok: true },
      { k: 'Akses ke bukti, sistem, & personel relevan dipastikan', ok: true },
      { k: 'Format laporan & paragraf pembatasan penggunaan disepakati tertulis', ok: false },
    ],
    /* Tujuan pengendalian → kontrol. Setiap kontrol: jenis, frekuensi, sifat uji,
       populasi, sampel, deviasi. Efektivitas & opini DIHITUNG engine.
       `eval` hanya ada bila ditemukan deviasi (untuk dasar simpulan). */
    objectives: [
      { id: 'CO-1', name: 'Manajemen Akses Logis & Keamanan', desc: 'Akses ke sistem & data penggajian dibatasi pada personel yang berwenang.', controls: [
        { id: 'AC-1', name: 'Pemberian akses berbasis peran disetujui sebelum aktivasi', type: 'Preventif', freq: 'Per perubahan', nature: ['Inspeksi', 'Reperformance'], pop: 38, sample: 25, dev: 0, seedDone: true },
        { id: 'AC-2', name: 'Penonaktifan akses karyawan resign ≤ 24 jam', type: 'Preventif', freq: 'Per kejadian', nature: ['Inspeksi'], pop: 14, sample: 14, dev: 0, seedDone: true },
        { id: 'AC-3', name: 'Reviu berkala hak akses & pemisahan tugas (SoD)', type: 'Detektif', freq: 'Triwulanan', nature: ['Inspeksi'], pop: 4, sample: 4, dev: 0, seedDone: true },
        { id: 'AC-4', name: 'Kebijakan kata sandi & MFA ditegakkan sistem', type: 'Preventif', freq: 'Berkelanjutan', nature: ['Inspeksi', 'Observasi'], pop: 1, sample: 1, dev: 0, seedDone: true },
      ]},
      { id: 'CO-2', name: 'Akurasi & Kelengkapan Pemrosesan Penggajian', desc: 'Penggajian diproses lengkap, akurat, dan tepat waktu sesuai data yang diotorisasi.', controls: [
        { id: 'PR-1', name: 'Validasi otomatis masukan (jam kerja, lembur) terhadap batas', type: 'Preventif', freq: 'Per batch', nature: ['Inspeksi', 'Reperformance'], pop: 12, sample: 12, dev: 0, seedDone: true },
        { id: 'PR-2', name: 'Rekonsiliasi total kontrol batch (input vs output)', type: 'Detektif', freq: 'Per siklus', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: true },
        { id: 'PR-3', name: 'Rekalkulasi independen gaji bersih sampel karyawan', type: 'Detektif', freq: 'Bulanan', nature: ['Reperformance'], pop: 12, sample: 12, dev: 0, seedDone: true },
        { id: 'PR-4', name: 'Reviu & approval register gaji sebelum rilis pembayaran', type: 'Preventif', freq: 'Bulanan', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: false },
        { id: 'PR-5', name: 'Rekonsiliasi pembayaran gaji ke instruksi bank', type: 'Detektif', freq: 'Bulanan', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: false },
      ]},
      { id: 'CO-3', name: 'Otorisasi Perubahan Data Induk Karyawan', desc: 'Perubahan data induk penggajian diotorisasi, lengkap, dan akurat.', controls: [
        { id: 'MD-1', name: 'Perubahan data induk diotorisasi & didukung dokumen sumber', type: 'Preventif', freq: 'Per perubahan', nature: ['Inspeksi'], pop: 60, sample: 25, dev: 0, seedDone: false },
        { id: 'MD-2', name: 'Laporan perubahan data induk direviu independen', type: 'Detektif', freq: 'Bulanan', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: false },
        { id: 'MD-3', name: 'Pemisahan tugas input vs persetujuan data induk', type: 'Preventif', freq: 'Berkelanjutan', nature: ['Inspeksi'], pop: 1, sample: 1, dev: 0, seedDone: false },
      ]},
      { id: 'CO-4', name: 'Manajemen Perubahan Aplikasi', desc: 'Perubahan aplikasi penggajian diuji, diotorisasi, dan dimigrasikan secara terkendali.', controls: [
        { id: 'CM-1', name: 'Pengujian (UAT) & persetujuan sebelum migrasi ke produksi', type: 'Preventif', freq: 'Per perubahan', nature: ['Inspeksi'], pop: 24, sample: 24, dev: 1, seedDone: true,
          eval: { isolated: true, remediated: true, objectiveAchieved: true,
            note: 'Deviasi pada 1 dari 24 perubahan: hotfix darurat dimigrasikan tanpa arsip UAT formal lengkap. Pengujian diperluas atas sifat hotfix (logika non-finansial) & uji substantif output siklus terdampak tidak menemukan anomali. Proses UAT diperkuat (remediasi) sejak Sep 2025 — deviasi terisolasi, tujuan pengendalian tetap tercapai; tidak menimbulkan pengecualian terhadap opini.' } },
        { id: 'CM-2', name: 'Pemisahan lingkungan pengembangan & produksi', type: 'Preventif', freq: 'Berkelanjutan', nature: ['Observasi', 'Inspeksi'], pop: 1, sample: 1, dev: 0, seedDone: true },
        { id: 'CM-3', name: 'Akses migrasi ke produksi dibatasi & tercatat (log)', type: 'Preventif', freq: 'Berkelanjutan', nature: ['Inspeksi'], pop: 18, sample: 18, dev: 0, seedDone: false },
      ]},
      { id: 'CO-5', name: 'Perhitungan & Penyetoran PPh 21 & BPJS', desc: 'Pemotongan, perhitungan, dan penyetoran kewajiban statutori akurat dan tepat waktu.', controls: [
        { id: 'TX-1', name: 'Tarif PPh 21 & iuran BPJS dikinikan sesuai regulasi terbaru', type: 'Preventif', freq: 'Per perubahan', nature: ['Inspeksi'], pop: 3, sample: 3, dev: 0, seedDone: false },
        { id: 'TX-2', name: 'Rekalkulasi PPh 21 & iuran BPJS untuk sampel karyawan', type: 'Detektif', freq: 'Bulanan', nature: ['Reperformance'], pop: 12, sample: 12, dev: 0, seedDone: false },
        { id: 'TX-3', name: 'Rekonsiliasi & bukti setor PPh 21/BPJS tepat waktu', type: 'Detektif', freq: 'Bulanan', nature: ['Inspeksi'], pop: 12, sample: 12, dev: 0, seedDone: false },
      ]},
    ],
    /* CUEC — Complementary User Entity Controls (kontrol pelengkap di entitas
       pengguna) yang DIASUMSIKAN beroperasi agar tujuan pengendalian tercapai.
       Sumber tunggal yang juga dirujuk modul SA 402 (view_serviceorg SO-01). */
    cuec: [
      'Otorisasi & verifikasi data master karyawan sebelum dikirim ke organisasi jasa',
      'Rekonsiliasi register gaji organisasi jasa ke buku besar entitas',
      'Review & approval batch pembayaran gaji sebelum rilis',
      'Pembatasan & review akses pengguna entitas ke portal organisasi jasa',
      'Rekonsiliasi setoran PPh 21 & BPJS ke laporan organisasi jasa',
    ],
  };
  /* ---- Engine SJAH 3402: hitung efektivitas, deviasi, opini (pure) ----
     exec: peta { [controlId]: bool } status pelaksanaan uji (override seedDone);
     bila tak diberi → dibaca dari localStorage. */
  function socEngine(execArg) {
    const A = SOC_3402;
    let exec = execArg;
    if (!exec && typeof localStorage !== 'undefined') {
      try { exec = JSON.parse(localStorage.getItem('ams.v1.soc3402.exec') || 'null'); } catch (e) {}
    }
    exec = exec || {};
    const isDone = (c) => Object.prototype.hasOwnProperty.call(exec, c.id) ? !!exec[c.id] : !!c.seedDone;
    /* deviasi yang dilaporkan sebagai PENGECUALIAN: ada deviasi DAN tidak
       dievaluasi sebagai terisolasi+remediasi dengan tujuan tetap tercapai. */
    const isReportedException = (c) => c.dev > 0 && !(c.eval && c.eval.isolated && c.eval.remediated && c.eval.objectiveAchieved);
    /* kontrol beroperasi efektif bila tanpa deviasi, atau deviasi terevaluasi
       tidak menghalangi tercapainya tujuan pengendalian. */
    const ctrlEffective = (c) => c.dev === 0 || (c.eval && c.eval.objectiveAchieved);
    const objectives = A.objectives.map(o => {
      const controls = o.controls.map(c => ({
        ...c, tested: isDone(c), effective: ctrlEffective(c),
        deviationNoted: c.dev > 0, reportedException: isReportedException(c),
      }));
      const total = controls.length;
      const tested = controls.filter(c => c.tested).length;
      const allTested = tested === total;
      const effectiveAll = controls.every(c => c.effective);
      const achieved = allTested && effectiveAll;          // tujuan tercapai bila semua kontrol diuji & efektif
      const devNoted = controls.filter(c => c.deviationNoted).length;
      return { ...o, controls, total, tested, allTested, effectiveAll, achieved, devNoted };
    });
    const allControls = objectives.flatMap(o => o.controls);
    const totalControls = allControls.length;
    const controlsTested = allControls.filter(c => c.tested).length;
    const deviationsNoted = allControls.filter(c => c.deviationNoted).length;
    const exceptionsReported = allControls.filter(c => c.reportedException).length;
    const progress = totalControls ? Math.round((controlsTested / totalControls) * 100) : 0;
    const allTested = controlsTested === totalControls;
    /* tiga bagian opini Type 2 */
    const descriptionFair = true;                                  // deskripsi wajar (asersi manajemen tervalidasi)
    const designSuitable = allControls.every(c => true);           // desain seluruh kontrol sesuai
    const operatingEffective = allTested && objectives.every(o => o.achieved) && exceptionsReported === 0;
    /* opini final/diproyeksikan = properti TEMUAN (independen dari progres uji):
       tanpa modifikasi bila tak ada pengecualian dilaporkan; bila ada → dengan pengecualian. */
    const opinionType = exceptionsReported === 0 ? 'unqualified' : 'qualified';
    const opinionLabel = opinionType === 'unqualified' ? 'Tanpa Modifikasi' : 'Dengan Pengecualian';
    const canIssue = allTested && operatingEffective && exceptionsReported === 0;
    const objAchievedN = objectives.filter(o => o.achieved).length;
    const opinion = {
      type: opinionType, label: opinionLabel,
      description: 'Deskripsi sistem penggajian menyajikan secara wajar, dalam semua hal yang material, sistem organisasi jasa yang dirancang & diimplementasikan sepanjang periode ' + A.period + '.',
      design: 'Pengendalian yang terkait dengan tujuan pengendalian dirancang secara sesuai untuk memberikan keyakinan memadai bahwa tujuan pengendalian akan tercapai bila pengendalian beroperasi efektif.',
      operating: (opinionType === 'unqualified'
        ? 'Pengendalian yang diuji beroperasi secara efektif sepanjang periode untuk mencapai tujuan pengendalian terkait — dengan mempertimbangkan CUEC yang diasumsikan beroperasi di entitas pengguna.'
        : 'Kecuali atas pengecualian yang dijelaskan dalam hasil pengujian, pengendalian beroperasi efektif sepanjang periode untuk mencapai tujuan pengendalian.'),
      basis: deviationsNoted > 0
        ? 'Selama periode tercatat ' + deviationsNoted + ' deviasi (manajemen perubahan) yang dievaluasi terisolasi & telah diremediasi; tujuan pengendalian tetap tercapai sehingga opini tidak dimodifikasi.'
        : 'Tidak ada deviasi yang menghalangi tercapainya tujuan pengendalian.',
    };
    /* hal pokok (matters) — satu baris per tujuan pengendalian */
    const natFmt = (cs) => Array.from(new Set(cs.flatMap(c => c.nature))).join(' · ');
    const matters = objectives.map(o => ({
      m: o.name, ref: o.id, claim: o.total + ' kontrol',
      proc: 'Uji desain & efektivitas operasi (' + natFmt(o.controls) + ')',
      concl: !o.allTested
        ? 'Pengujian berjalan (' + o.tested + '/' + o.total + ' kontrol)'
        : (o.achieved
          ? (o.devNoted ? 'Beroperasi efektif (1 deviasi terisolasi, diremediasi)' : 'Beroperasi efektif sepanjang periode')
          : 'Pengecualian — tujuan belum tercapai'),
      ok: o.achieved,
    }));
    const assuranceEntry = {
      std: 'SJAH 3402', level: A.level, subject: A.subject, criteria: A.criteria, matters,
    };
    /* proyeksi untuk auditor pengguna (SA 402) — ditarik modul Organisasi Jasa */
    const userAuditorView = {
      reportType: A.reportType, std: 'ISAE 3402', period: A.periodShort,
      opinion: opinionLabel, exc: exceptionsReported, cuec: A.cuec.length,
      objectives: objectives.length, controls: totalControls,
      areas: A.userImpact.areas, assertions: A.userImpact.assertions,
      method: A.subservice.method, coverage: 'full',
    };
    return {
      meta: A, objectives, controls: allControls,
      counts: { objectives: objectives.length, controls: totalControls, controlsTested, deviationsNoted, exceptionsReported, cuec: A.cuec.length, objAchieved: objAchievedN },
      progress, allTested, descriptionFair, designSuitable, operatingEffective, canIssue,
      opinion, cuec: A.cuec, subservice: A.subservice,
      matters, assuranceEntry, userAuditorView,
    };
  }
  /* ============================================================
     SJAH 3410 — Perikatan Asurans atas Laporan Emisi Gas Rumah Kaca
     ------------------------------------------------------------
     SUMBER KEBENARAN TUNGGAL untuk perikatan ASR-2025-080 (KAP sebagai
     PRAKTISI memberikan keyakinan TERBATAS atas Laporan Emisi GRK
     Scope 1 & 2 PT Hijau Energi Terbarukan — selaras ISAE 3410 ·
     GHG Protocol · ISO 14064-1). Seluruh angka emisi DIHITUNG dari
     data aktivitas × faktor emisi/GWP (tCO₂e = aktivitas × faktor ÷
     1000) — TIDAK di-hardcode. Total per Scope, total terasurans
     (Scope 1+2), intensitas emisi, materialitas (5% total), evaluasi
     salah saji (asersi manajemen vs rekalkulasi), bentuk simpulan
     keyakinan terbatas (negatif) + paragraf penekanan ketidakpastian,
     progres, & ringkasan hal pokok dihitung oleh `ghgEngine`.
     Satu perubahan data aktivitas / faktor mengalir konsisten ke:
       · Modul SJAH 3410 (view_sjah3410 — halaman penuh)
       · Asurans Lain (view_relatedsvc · OtherAssurance — hal pokok)
       · Katalog SJAH 3000 (view_sjah3000 · ASR-080 — hal pokok)
       · Portofolio Jasa (view_nonaudit · progres dihitung engine)
       · Matriks Kepatuhan (SJAH 3410)
     Konsumsi via window.AMS.ghgEngine(exec).
     ============================================================ */
  const GHG_3410 = {
    id: 'ASR-2025-080', client: 'PT Hijau Energi Terbarukan',
    sector: 'Energi Terbarukan · Pembangkit Surya & Biomassa',
    std: 'SJAH 3410', framework: 'SJAH 3410 (selaras ISAE 3410) · GHG Protocol Corporate Standard · ISO 14064-1',
    level: 'Terbatas', assuranceForm: 'Negatif',
    period: '1 Januari – 31 Desember 2025', periodShort: 'FY2025', baseYear: 'FY2024 (tahun dasar)',
    partner: 'Rudi Gunawan, CPA', manager: 'Anindya Pramesti', preparer: 'Dimas Raharjo',
    fee: 520_000_000, engagedOn: '03 Mar 2026', reportTarget: '20 Jun 2026', deadline: '2026-06-20',
    boundaryApproach: 'Kendali Operasional',
    subject: 'Laporan Emisi Gas Rumah Kaca (Scope 1 & 2) untuk tahun yang berakhir 31 Desember 2025',
    criteria: 'GHG Protocol Corporate Accounting & Reporting Standard dan ISO 14064-1',
    intendedUsers: 'Manajemen & Dewan Komisaris PT Hijau Energi Terbarukan serta pemangku kepentingan keberlanjutan (investor & pemberi pinjaman hijau)',
    responsibleParty: 'Manajemen PT Hijau Energi Terbarukan — menyusun Laporan Emisi GRK & menetapkan metodologi inventarisasi',
    independence: 'KAP independen terhadap entitas sesuai Kode Etik IAPI; kompetensi tim mencakup keahlian kuantifikasi GRK (SJAH 3410 ¶31). Status diungkap dalam laporan.',
    materialityPct: 0.05,
    /* Indikator produksi untuk uji intensitas (analitis) */
    production: { v: 410_000, u: 'MWh', label: 'Energi terbarukan dibangkitkan FY2025' },
    /* Persyaratan penerimaan perikatan — SJAH 3410 ¶13–18 */
    terms: [
      { k: 'Kriteria (GHG Protocol & ISO 14064-1) sesuai, tersedia bagi pengguna, & diterapkan konsisten', ok: true },
      { k: 'Batas organisasi (kendali operasional) & batas operasional Scope ditetapkan jelas', ok: true },
      { k: 'Tingkat keyakinan disepakati: TERBATAS (limited) atas Scope 1 & 2', ok: true },
      { k: 'Manajemen bertanggung jawab atas Laporan Emisi GRK & pengendalian internal terkait', ok: true },
      { k: 'Akses ke data aktivitas, faktor emisi, log meter, & personel relevan dipastikan', ok: true },
      { k: 'Tim memiliki kompetensi kuantifikasi GRK & keahlian asurans (¶31)', ok: true },
      { k: 'Pernyataan ketidakpastian inheren & paragraf penekanan disepakati dalam format laporan', ok: false },
    ],
    /* Batas organisasi — entitas/fasilitas yang dikonsolidasi (kendali operasional) */
    entities: [
      { name: 'PT Hijau Energi Terbarukan (induk · kantor pusat)', approach: 'Kendali operasional', included: true, note: 'Kantor pusat, gudang, & workshop O&M' },
      { name: 'PLTS Sumba 45 MWp', approach: 'Kendali operasional', included: true, note: 'Genset solar backup & konstruksi' },
      { name: 'PLTS & Biomassa Lombok 30 MWp', approach: 'Kendali operasional', included: true, note: 'Hibrida surya-biomassa' },
      { name: 'JV Angin Sulawesi 20% (non-pengendali)', approach: 'Bagi-ekuitas', included: false, note: 'Dikecualikan — tanpa kendali operasional; diungkap terpisah' },
    ],
    /* Registri faktor emisi & GWP — diverifikasi ke sumber otoritatif (prosedur P5) */
    factors: [
      { fuel: 'Solar / HSD (pembakaran)', v: 2.68, u: 'kgCO₂e/liter', ref: 'IPCC 2006 GL · KLHK 2023' },
      { fuel: 'LPG (pembakaran)', v: 2.98, u: 'kgCO₂e/kg', ref: 'IPCC 2006 GL' },
      { fuel: 'Refrigeran R-32 (GWP-100)', v: 675, u: 'kgCO₂e/kg', ref: 'IPCC AR5' },
      { fuel: 'Listrik grid Jamali (location-based)', v: 0.858, u: 'kgCO₂e/kWh', ref: 'Faktor Emisi Sistem Ketenagalistrikan · Kepdirjen Gatrik 2023' },
    ],
    /* Inventarisasi sumber emisi. `reported` = asersi manajemen (tCO₂e);
       emisi terhitung = act.v × ef.v ÷ 1000 (engine). Scope 3 bersifat
       informasional (di luar lingkup keyakinan terbatas). seedDone = status
       awal "telah diuji/direkalkulasi". */
    sources: [
      { id: 'S1-1', scope: 1, cat: 'Pembakaran tidak bergerak', src: 'Genset solar (PLTD backup & konstruksi)', facility: 'PLTS Sumba & Lombok', gas: 'CO₂·CH₄·N₂O', act: { v: 4_000_000, u: 'liter' }, ef: { v: 2.68, u: 'kgCO₂e/liter' }, reported: 10_700.0, method: 'Kalkulasi', evidence: 'Log harian genset + faktur pembelian solar', proc: 'Rekalkulasi liter × faktor; vouch faktur ke kuitansi', seedDone: true },
      { id: 'S1-2', scope: 1, cat: 'Pembakaran bergerak', src: 'Kendaraan operasional (solar)', facility: 'Armada O&M', gas: 'CO₂', act: { v: 480_000, u: 'liter' }, ef: { v: 2.68, u: 'kgCO₂e/liter' }, reported: 1_286.4, method: 'Kalkulasi', evidence: 'Catatan BBM kendaraan + kartu fleet', proc: 'Rekalkulasi konsumsi × faktor emisi', seedDone: true },
      { id: 'S1-3', scope: 1, cat: 'Pembakaran tidak bergerak', src: 'LPG operasional & kantin', facility: 'Kantor pusat & mess', gas: 'CO₂', act: { v: 90_000, u: 'kg' }, ef: { v: 2.98, u: 'kgCO₂e/kg' }, reported: 268.2, method: 'Kalkulasi', evidence: 'Faktur pembelian LPG', proc: 'Rekalkulasi kg × faktor emisi', seedDone: false },
      { id: 'S1-4', scope: 1, cat: 'Emisi fugitif', src: 'Kebocoran refrigeran R-32 (AC)', facility: 'Gedung kantor & ruang server', gas: 'HFC', act: { v: 300, u: 'kg' }, ef: { v: 675, u: 'kgCO₂e/kg' }, reported: 202.5, method: 'Estimasi (top-up)', evidence: 'Catatan pengisian ulang refrigeran', proc: 'Estimasi kebocoran = top-up tahunan × GWP; uji ketidakpastian', seedDone: false },
      { id: 'S2-1', scope: 2, cat: 'Listrik dibeli (location-based)', src: 'Listrik PLN — kantor, gudang, workshop', facility: 'Seluruh fasilitas tersambung grid', gas: 'CO₂', act: { v: 9_500_000, u: 'kWh' }, ef: { v: 0.858, u: 'kgCO₂e/kWh' }, reported: 8_180.0, method: 'Kalkulasi (location-based)', evidence: 'Tagihan PLN 12 bulan + pembacaan meter', proc: 'Rekonsiliasi kWh ke tagihan PLN × faktor grid', seedDone: true },
      { id: 'S3-1', scope: 3, cat: 'Kategori 6 · Perjalanan dinas', src: 'Penerbangan & perjalanan dinas', facility: 'Korporat', gas: 'CO₂e', act: { v: 1_250_000, u: 'km' }, ef: { v: 0.15, u: 'kgCO₂e/km' }, reported: 187.5, method: 'Estimasi', evidence: 'Data perjalanan agen', proc: 'Disaring — diungkap, di luar lingkup keyakinan', seedDone: false, informational: true },
      { id: 'S3-2', scope: 3, cat: 'Kategori 4 · Transportasi hulu', src: 'Distribusi peralatan & logistik EPC', facility: 'Rantai pasok', gas: 'CO₂e', act: { v: 3_200_000, u: 'ton-km' }, ef: { v: 0.105, u: 'kgCO₂e/ton-km' }, reported: 336.0, method: 'Estimasi', evidence: 'Data logistik vendor', proc: 'Disaring — diungkap, di luar lingkup keyakinan', seedDone: false, informational: true },
    ],
    /* Prosedur keyakinan terbatas SJAH 3410 — sifat & luas lebih terbatas
       dibanding keyakinan memadai (terutama inquiry, analitis, rekalkulasi). */
    procedures: [
      { id: 'P1', ref: '¶23', short: 'Pemahaman entitas & batas organisasi', proc: 'Pahami aktivitas, batas organisasi (kendali operasional), batas Scope, & metodologi inventarisasi GRK.', seedDone: true },
      { id: 'P2', ref: '¶25', short: 'Penilaian risiko salah saji material', proc: 'Identifikasi & nilai RoMM informasi emisi pada tingkat asersi (kelengkapan, akurasi, pisah-batas).', seedDone: true },
      { id: 'P3', ref: '¶29', short: 'Rekalkulasi emisi Scope 1', proc: 'Rekalkulasi emisi pembakaran & fugitif = data aktivitas × faktor emisi / GWP.', seedDone: false },
      { id: 'P4', ref: '¶29', short: 'Rekonsiliasi Scope 2 ke tagihan PLN', proc: 'Cocokkan kWh ke tagihan PLN 12 bulan × faktor grid (location-based).', seedDone: true },
      { id: 'P5', ref: '¶32', short: 'Verifikasi faktor emisi & GWP', proc: 'Telusur faktor emisi & GWP ke sumber otoritatif (KLHK / IPCC AR5) & uji konsistensi penerapan.', seedDone: false },
      { id: 'P6', ref: '¶33L', short: 'Prosedur analitis & intensitas', proc: 'Analitis tahun-ke-tahun & uji kewajaran intensitas emisi (tCO₂e/MWh) terhadap tahun dasar.', seedDone: false },
      { id: 'P7', ref: '¶35', short: 'Evaluasi ketidakpastian estimasi', proc: 'Evaluasi ketidakpastian estimasi emisi fugitif (refrigeran) & dampaknya terhadap materialitas.', seedDone: false },
      { id: 'P8', ref: '¶47', short: 'Telaah penyajian & pengungkapan', proc: 'Telaah penyajian Laporan Emisi GRK: pengungkapan batas, metodologi, faktor, & pernyataan ketidakpastian.', seedDone: false },
    ],
  };
  /* ---- Engine SJAH 3410: hitung emisi, materialitas, salah saji, simpulan (pure) ----
     exec: peta { [id]: bool } status uji sumber & pelaksanaan prosedur (override
     seedDone); bila tak diberi → dibaca dari localStorage. */
  function ghgEngine(execArg) {
    const A = GHG_3410;
    let exec = execArg;
    if (!exec && typeof localStorage !== 'undefined') {
      try { exec = JSON.parse(localStorage.getItem('ams.v1.ghg3410.exec') || 'null'); } catch (e) {}
    }
    exec = exec || {};
    const isDone = (id, seed) => Object.prototype.hasOwnProperty.call(exec, id) ? !!exec[id] : !!seed;
    const r1 = (n) => Math.round(n * 10) / 10;
    /* setiap sumber: emisi terhitung = aktivitas × faktor ÷ 1000 (kg→ton) */
    const sources = A.sources.map(s => {
      const computed = r1(s.act.v * s.ef.v / 1000);
      const variance = r1(s.reported - computed);
      return { ...s, computed, variance, absVar: Math.abs(variance), tested: isDone(s.id, s.seedDone) };
    });
    const inScope = sources.filter(s => !s.informational);   // Scope 1 & 2 — terasurans
    const info = sources.filter(s => s.informational);        // Scope 3 — informasional
    const sumC = (arr) => r1(arr.reduce((t, s) => t + s.computed, 0));
    const sumR = (arr) => r1(arr.reduce((t, s) => t + s.reported, 0));
    const s1 = inScope.filter(s => s.scope === 1), s2 = inScope.filter(s => s.scope === 2);
    const scope1 = sumC(s1), scope2 = sumC(s2), scope3 = sumC(info);
    const assured = r1(scope1 + scope2);
    const reportedAssured = sumR(inScope);
    const materiality = r1(assured * A.materialityPct);
    /* salah saji = asersi manajemen − rekalkulasi (atas seluruh sumber terasurans) */
    const netMisstatement = r1(inScope.reduce((t, s) => t + s.variance, 0));
    const grossMisstatement = r1(inScope.reduce((t, s) => t + s.absVar, 0));
    const exceedsMateriality = Math.abs(netMisstatement) > materiality;
    const intensity = assured / A.production.v;               // tCO₂e per MWh
    /* progres dari prosedur asurans (sifat keyakinan terbatas) */
    const procedures = A.procedures.map(p => ({ ...p, done: isDone(p.id, p.seedDone) }));
    const doneN = procedures.filter(p => p.done).length, totalP = procedures.length;
    const progress = totalP ? Math.round((doneN / totalP) * 100) : 0;
    const allProc = doneN === totalP;
    const sourcesTested = inScope.filter(s => s.tested).length;
    const allTested = sourcesTested === inScope.length;
    /* bentuk simpulan keyakinan terbatas (negatif). Salah saji material ⇒
       simpulan dimodifikasi (dengan pengecualian). */
    const conclType = exceedsMateriality ? 'qualified' : 'unmodified';
    const conclLabel = conclType === 'unmodified' ? 'Tanpa Modifikasi (Negatif)' : 'Dengan Pengecualian';
    const canIssue = allProc && allTested && !exceedsMateriality;
    const conclusion = {
      type: conclType, label: conclLabel,
      negativeAssurance: conclType === 'unmodified'
        ? 'Berdasarkan prosedur yang kami lakukan dan bukti yang kami peroleh, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa Laporan Emisi GRK (Scope 1 & 2) sejumlah ' + fmt(assured, 1) + ' tCO₂e tidak disusun, dalam semua hal yang material, sesuai dengan ' + A.criteria + '.'
        : 'Berdasarkan prosedur kami, terdapat salah saji ' + fmt(Math.abs(netMisstatement), 1) + ' tCO₂e yang melampaui materialitas ' + fmt(materiality, 1) + ' tCO₂e; kecuali atas hal tersebut, tidak ada hal lain yang menjadi perhatian kami.',
      basis: grossMisstatement > 0
        ? 'Rekalkulasi menemukan selisih agregat ' + fmt(grossMisstatement, 1) + ' tCO₂e (neto ' + fmt(netMisstatement, 1) + ' tCO₂e) antara asersi manajemen & rekalkulasi praktisi — ' + (exceedsMateriality ? 'melampaui' : 'di bawah') + ' materialitas ' + fmt(materiality, 1) + ' tCO₂e (' + (A.materialityPct * 100) + '% total emisi).'
        : 'Tidak terdapat selisih antara asersi manajemen & rekalkulasi praktisi.',
      emphasis: 'Penekanan Hal: Kuantifikasi emisi GRK tunduk pada ketidakpastian inheren karena keterbatasan ilmiah dalam penentuan faktor emisi & data aktivitas — khususnya emisi fugitif yang diestimasi. Simpulan kami tidak dimodifikasi terkait hal ini.',
    };
    /* hal pokok (matters) untuk Asurans Lain & katalog SJAH 3000 */
    const s1ok = s1.length > 0 && s1.every(s => s.tested);
    const s2ok = s2.length > 0 && s2.every(s => s.tested);
    const boundaryOk = isDone('P1', true) && isDone('P8', false);
    const matters = [
      { m: 'Emisi Scope 1 (pembakaran & fugitif)', ref: 'Scope 1', claim: fmt(scope1, 1) + ' tCO₂e', proc: 'Rekalkulasi data aktivitas × faktor emisi / GWP', concl: s1ok ? 'Tidak ada hal yang menjadi perhatian' : 'Rekalkulasi berjalan (' + s1.filter(s => s.tested).length + '/' + s1.length + ' sumber)', ok: s1ok },
      { m: 'Emisi Scope 2 (listrik dibeli, location-based)', ref: 'Scope 2', claim: fmt(scope2, 1) + ' tCO₂e', proc: 'Rekonsiliasi kWh ke tagihan PLN × faktor grid', concl: s2ok ? 'Tidak ada hal yang menjadi perhatian' : 'Rekonsiliasi berjalan', ok: s2ok },
      { m: 'Batas organisasi & metodologi', ref: 'Batas', claim: A.boundaryApproach, proc: 'Telaah batas (kendali operasional) & konsistensi metodologi', concl: boundaryOk ? 'Konsisten dengan kriteria' : 'Sedang ditelaah', ok: boundaryOk },
    ];
    const assuranceEntry = { std: A.std, level: A.level, subject: A.subject, criteria: A.criteria, matters };
    return {
      meta: A, sources, inScope, info, procedures,
      totals: { scope1, scope2, scope3, assured, reportedAssured },
      intensity, materiality, materialityPct: A.materialityPct,
      misstatement: { net: netMisstatement, gross: grossMisstatement, exceedsMateriality },
      counts: { sources: inScope.length, sourcesTested, scopes: 2, entities: A.entities.filter(e => e.included).length, proceduresDone: doneN, procedures: totalP },
      progress, allProc, allTested, canIssue, conclusion, matters, assuranceEntry,
    };
  }
  /* Asurans Lain SPA 3000/3402/3400 — subject matters per engagement */
  const ASSURANCE_ENG = {
    /* Ditarik dari SUMBER KEBENARAN TUNGGAL SJAH 3410 — bukan hardcode.
       Subject/criteria/level/matters dihitung oleh ghgEngine (emisi = aktivitas × faktor). */
    'ASR-2025-080': ghgEngine().assuranceEntry,
    /* Ditarik dari SUMBER KEBENARAN TUNGGAL SJAH 3402 — bukan hardcode.
       Subject/criteria/level/matters dihitung oleh socEngine (Type 2). */
    'ASR-2025-081': socEngine().assuranceEntry,
    /* Ditarik dari SUMBER KEBENARAN TUNGGAL SJAH 3400 — bukan hardcode.
       Subject/criteria/level/matters dihitung oleh pfiEngine. */
    'PFI-2025-090': pfiEngine().assuranceEntry,
  };

  /* ---- BI Firma Terkonsolidasi (executive analytics) ---- */
  const BI_DATA = {
    fyRevenue: 11_300_000_000, prevYearRevenue: 10_100_000_000,
    revenueByService: [
      { svc: 'Audit Laporan Keuangan', std: 'SA', amount: 8_200_000_000, color: '#005085' },
      { svc: 'Asurans Lain', std: 'SPA 3000/3402/3400', amount: 1_000_000_000, color: '#0a6b73' },
      { svc: 'Jasa Pajak & Konsultasi', std: 'PMK', amount: 860_000_000, color: '#9a6a00' },
      { svc: 'Reviu Laporan Keuangan', std: 'SPR 2400', amount: 760_000_000, color: '#5b3fa6' },
      { svc: 'Jasa Terkait (AUP/Kompilasi)', std: 'SPSJL 4400/4410', amount: 480_000_000, color: '#647889' },
    ],
    months: ['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb'],
    monthlyRev: [820, 870, 910, 980, 1020, 940, 1010, 990, 1080, 1140, 1080, 1160], // Rp jt diakui
    monthlyMargin: [28, 30, 29, 32, 34, 31, 33, 32, 35, 36, 34, 37], // %
    monthlyUtil: [79, 82, 80, 85, 88, 84, 86, 83, 90, 92, 88, 91], // %
    targetRevenue: 12_000_000_000,
  };

  /* Reviu SPR 2400 — planning addendum */
  const REVIEW_2400_PLAN = {
    materiality: 900_000_000, benchmark: '1% dari pendapatan', pm: 675_000_000,
    focus: [
      { area: 'Pengakuan Pendapatan', risk: 'Sedang', why: 'Cut-off jasa logistik akhir tahun; inquiry & analitis pendapatan per bulan.' },
      { area: 'Piutang Usaha', risk: 'Sedang', why: 'Umur piutang meningkat; inquiry kebijakan penyisihan.' },
      { area: 'Beban Operasional', risk: 'Rendah', why: 'Analitis tren beban BBM & sewa armada.' },
      { area: 'Kelangsungan Usaha', risk: 'Rendah', why: 'Arus kas operasi positif; inquiry rencana manajemen.' },
    ],
  };
  /* ============================================================
     Financial Due Diligence (jasa non-asurans / advisory)
     ------------------------------------------------------------
     SUMBER KEBENARAN TUNGGAL. Field identitas (klien, partner,
     manajer, imbalan, tenggat, progres, status) TIDAK di-hardcode
     di sini — ditarik dari catatan kanonik lintas-modul:
       · Pipeline / CRM  → OPP-105  (peluang "Won")
       · Onboarding      → PROS-06  (akseptasi · PMPJ · surat perikatan)
       · Registri Non-Audit → DD-2025-105 (portofolio jasa)
     Satu perubahan di catatan sumber mengalir konsisten ke modul DD,
     portofolio Non-Audit, dan dock Keterkaitan Modul.
     Nilai keuangan deal disimpan dalam Rp MILIAR (kecuali ebitdaBridge
     yang memakai rupiah penuh /1e9, dipertahankan agar laporan lama jalan).
     ============================================================ */
  const DD_OPP  = PIPELINE.find(o => o.id === 'OPP-105');
  const DD_PROS = PROSPECTS.find(p => p.id === 'PROS-06');
  const DD_REG  = NONAUDIT.find(n => n.id === 'DD-2025-105');

  const DD_EBITDA_BRIDGE = [
    { k: 'EBITDA dilaporkan', v: 84_000_000_000, type: 'base' },
    { k: '(+) Beban non-rutin (one-off legal)', v: 3_200_000_000, type: 'add' },
    { k: '(+) Normalisasi gaji pemilik di atas pasar', v: 2_400_000_000, type: 'add' },
    { k: '(−) Pendapatan non-berulang (penjualan aset)', v: -5_600_000_000, type: 'less' },
    { k: '(−) Penyesuaian sewa pihak berelasi ke harga pasar', v: -1_800_000_000, type: 'less' },
    { k: 'EBITDA ternormalisasi', v: 82_200_000_000, type: 'total' },
  ];
  const DD_NORM_EBITDA = DD_EBITDA_BRIDGE.find(b => b.type === 'total').v / 1e9; // 82,2 miliar

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
    { name: 'Platform NeoSuite AMS', type: 'Teknologi', reliance: 'Eksekusi, dokumentasi, & pemantauan mutu', evaluated: '2026-02', status: 'Memadai', note: 'Kendali akses, jejak audit & retensi kertas kerja teruji.' },
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
      diff: null,
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
      consults: [],
      diff: null,
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
  const engById = (id) => _engIndex[id] || null;
  const clientById = (id) => _cliIndex[id] || null;
  const shortName = (n) => (n || '').replace(/^PT\s+/, '').replace(/\s+Tbk$/, '').trim();
  const bareName = (n) => (n || '').split(',')[0].trim();           // "Rudi Gunawan, CPA" → "Rudi Gunawan"
  const staffByName = (n) => STAFF.find(s => s.name === bareName(n)) || null;
  const industryTag = (ind) => (ind || '').split(/[·&\/]/)[0].trim().toLowerCase();
  function engMeta(engId) {
    const e = engById(engId);
    if (!e) return null;
    const c = clientById(e.clientId) || {};
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
  QM_INSPECTIONS.forEach(ins => {
    const m = engMeta(ins.eng);
    if (m) { ins.clientId = m.clientId; ins.client = m.client; ins.partner = m.partner; ins.scope = m.scope; ins.pie = m.pie; ins.manager = m.manager; }
  });
  EQR_REVIEWS.forEach(r => {
    const m = engMeta(r.eng);
    if (m) { r.clientId = m.clientId; r.client = m.client; r.partner = m.partnerFull; r.pie = m.pie; r.type = m.pie ? 'Wajib (PIE)' : (r.type || 'Berbasis Risiko'); }
  });
  COMPLAINTS.forEach(c => {
    const hit = CLIENTS.find(cl => { const t = shortName(cl.name).split(' ').slice(0, 2).join(' '); return t && ((c.source || '').includes(t) || (c.subject || '').includes(t)); });
    if (hit) { c.clientId = hit.id; c.clientName = hit.name; }
  });

  window.AMS = {
    fmt, rp, FIRM, USER, CLIENTS, ENGAGEMENTS, WTB, AJE, RISKS, TEAM,
    engById, clientById, staffByName, engMeta, shortName,
    DELIVERY, DELIVERY_WINDOW, WIP_ENG, WIP_AGING, CAPACITY,
    QM_COMPONENTS, QM_ROLES, QM_PROVIDERS, QM_CULTURE, QM_EVAL,
    QM_INSPECTIONS, QM_INSP_FINDINGS, QM_MON_ACTIVITIES, EQR_META,
    PPPK_CLIENTS, PPPK_PPL, PPPK_ROTATION, PPPK_HISTORY,
    WORKPAPERS, ACTIVITY, DEADLINES,
    REVIEW_NOTES, TIME_ENTRIES, PIPELINE, INVOICES, SCHEDULE, STAFF, CPE_REQ, CPE_LOG, INDEPENDENCE,
    FIRM_COA, FIRM_GL, FIRM_AP, PROSPECTS,
    FX_RATES, BANK_ACCOUNTS, BANK_RECON, FIRM_BUDGET, CASH_FORECAST, FIXED_ASSETS,
    TAX_OBLIGATIONS, EFAKTUR, PPH_WITHHELD, CREDIT_NOTES,
    PAYROLL, PAYROLL_RATES, LEAVE_BALANCE, LEAVE_REQUESTS, PERF_CYCLE,
    SOQM_RISKS, COMPLAINTS, EQR_REVIEWS, PPPK_REPORT, PBC_REQUESTS, PORTAL_MSGS, DMS_DOCS,
    NONAUDIT, REVIEW_2400, AUP_4400, aupEngine, COMPILATION_4410, ASSURANCE_ENG, BI_DATA,
    REVIEW_2400_PLAN, DUE_DILIGENCE, PFI_3400, pfiEngine, SOC_3402, socEngine,
    GHG_3410, ghgEngine,
  };
})();
