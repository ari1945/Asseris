/* ============================================================
   NeoSuite AMS — Keterkaitan Modul (lineage dua arah)
   Replikasi pola "Modul Terkait" PSAK ke modul tulang-punggung audit.
   Dirender global (app.jsx) sebagai dock bawah halaman; hanya muncul
   untuk modul yang terdaftar di LINEAGE. Navigasi memakai nav(id,{from})
   sehingga breadcrumb "kembali" & follow-workspace tetap bekerja.
   ============================================================ */

/* up   = Hulu   — modul SUMBER yang memberi masukan ke modul ini
   down = Hilir  — modul PENGGUNA keluaran/kesimpulan modul ini
   ic/lbl/rel mengikuti format kartu lineage PSAK. */
const LINEAGE = {
  syariah: {
    std: 'SAK Syariah · PSAK 101–112',
    up: [
      { id: 'evidence', ic: 'book',   lbl: 'Opini Dewan Pengawas Syariah', rel: 'Pernyataan kepatuhan syariah atas akad & produk — bukti pakar' },
      { id: 'icfr',     ic: 'shield', lbl: 'Internal Control',             rel: 'Kontrol akad, dokumentasi & pemisahan pendapatan non-halal' },
      { id: 'wtb',      ic: 'table',  lbl: 'Working Trial Balance',        rel: 'Saldo pembiayaan, DST, dana zakat & kebajikan' },
    ],
    down: [
      { id: 'psak71',  ic: 'coins',  lbl: 'PSAK 71 · Penurunan Nilai', rel: 'CKPN pembiayaan per akad → kerugian kredit ekspektasian' },
      { id: 'fsgen',   ic: 'report', lbl: 'FS Generator',              rel: 'Penyajian LK syariah & laporan dana zakat/kebajikan → LK' },
      { id: 'sad',     ic: 'scale',  lbl: 'SAD Ledger',                rel: 'Selisih pengakuan akad & pemurnian → akumulasi salah saji' },
      { id: 'opinion', ic: 'gavel',  lbl: 'Opini & KAM (SA 701)',      rel: 'Kepatuhan syariah & valuasi akad → kandidat Hal Audit Utama' },
    ],
  },
  psak117: {
    std: 'PSAK 117 · Kontrak Asuransi (adopsi IFRS 17)',
    up: [
      { id: 'evidence',    ic: 'expert',  lbl: 'Pekerjaan Aktuaris (SA 620)', rel: 'Laporan aktuaris atas FCF, RA & CSM — bukti pakar auditor' },
      { id: 'icfr',        ic: 'shield',  lbl: 'Internal Control',            rel: 'Kontrol data polis/klaim & tata kelola asumsi model' },
      { id: 'materiality', ic: 'target',  lbl: 'Materiality',                 rel: 'Ambang evaluasi selisih estimasi aktuaria' },
    ],
    down: [
      { id: 'psak46',  ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan', rel: 'Beda temporer CSM/RA & komponen kerugian → DTA/DTL' },
      { id: 'psak68',  ic: 'layers',  lbl: 'PSAK 68 · Nilai Wajar',     rel: 'Aset pendasar VFA & input transisi FVA → hierarki nilai wajar' },
      { id: 'fsgen',   ic: 'report',  lbl: 'FS Generator',              rel: 'Liabilitas kontrak asuransi & pendapatan asuransi → LK' },
      { id: 'opinion', ic: 'gavel',   lbl: 'Opini & KAM (SA 701)',      rel: 'Valuasi kontrak asuransi → kandidat Hal Audit Utama' },
    ],
  },
  isak35: {
    std: 'ISAK 35 · Entitas Berorientasi Nonlaba',
    up: [
      { id: 'wtb',      ic: 'table',  lbl: 'Working Trial Balance',  rel: 'Saldo aset, liabilitas & aset neto entitas nonlaba' },
      { id: 'psak71',   ic: 'coins',  lbl: 'PSAK 71 · Instrumen Keuangan', rel: 'ECL atas piutang jasa layanan & hibah → nilai neto' },
      { id: 'evidence', ic: 'book',   lbl: 'Dokumen Pemberi Sumber Daya', rel: 'Surat hibah & pembatasan donor → klasifikasi aset neto' },
      { id: 'icfr',     ic: 'shield', lbl: 'Internal Control',        rel: 'Kontrol penerimaan sumbangan & alokasi beban fungsional' },
    ],
    down: [
      { id: 'fsgen',   ic: 'report', lbl: 'FS Generator',         rel: 'Set laporan nonlaba (profil ISAK 35) → laporan keuangan' },
      { id: 'psak1',   ic: 'report', lbl: 'PSAK 1 · Penyajian LK', rel: 'Kerangka penyajian & pengungkapan yang diadopsi ISAK 35' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Pengungkapan pembatasan & beban fungsional → kelengkapan CALK' },
      { id: 'opinion', ic: 'gavel',  lbl: 'Opini & KAM (SA 701)',  rel: 'Kewajaran penyajian laporan nonlaba → opini audit' },
    ],
  },
  risk: {
    std: 'SA 315 · Identifikasi & Penilaian RoMM',
    up: [
      { id: 'strategy',  ic: 'doc',    lbl: 'Strategy Memo',        rel: 'Pemahaman entitas, industri & lingkungan pengendalian' },
      { id: 'icfr',      ic: 'sliders',lbl: 'Internal Control',     rel: 'Defisiensi pengendalian → sumber risiko tingkat asersi' },
      { id: 'analytical',ic: 'trend',  lbl: 'Analytical Review',    rel: 'Prosedur analitis awal menandai area fluktuasi tak biasa' },
    ],
    down: [
      { id: 'jet',     ic: 'flask',  lbl: 'Journal Entry Testing', rel: 'R-05 override manajemen → uji jurnal manual (SA 240)' },
      { id: 'confirm', ic: 'mail',   lbl: 'Confirmation Hub',      rel: 'R-01 pendapatan/piutang → respons konfirmasi eksternal' },
      { id: 'ecl',     ic: 'coins',  lbl: 'Kalkulator ECL',        rel: 'R-03 estimasi ECL → re-perform & uji aging' },
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers',     rel: 'Matriks RoMM → desain respons & prosedur (SA 330)' },
    ],
  },
  icfr: {
    std: 'SA 315 / SA 265 · Pengendalian Internal',
    up: [
      { id: 'strategy', ic: 'doc',   lbl: 'Strategy Memo',  rel: 'Pemahaman proses bisnis & siklus transaksi' },
      { id: 'dataflow', ic: 'link2', lbl: 'Alur Data & Integritas', rel: 'Walkthrough alur transaksi & titik kontrol' },
    ],
    down: [
      { id: 'risk',       ic: 'shield', lbl: 'Risk Assessment',   rel: 'Defisiensi desain/operasi → menaikkan RoMM' },
      { id: 'jet',        ic: 'flask',  lbl: 'Journal Entry Testing', rel: 'SoD & ITGC lemah → perluas pengujian jurnal' },
      { id: 'mgmtletter', ic: 'mail',   lbl: 'Management Letter',  rel: 'Defisiensi signifikan → komunikasi ke manajemen (SA 265)' },
    ],
  },
  jet: {
    std: 'SA 240 · Tanggung Jawab atas Kecurangan',
    up: [
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'R-05 management override → fokus seleksi jurnal' },
      { id: 'wtb',  ic: 'table',  lbl: 'Working Trial Balance', rel: 'Populasi jurnal buku besar — sumber pengujian' },
      { id: 'icfr', ic: 'sliders',lbl: 'Internal Control', rel: 'SoD & otorisasi → ekspektasi pengendalian jurnal' },
    ],
    down: [
      { id: 'aje',     ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Jurnal anomali teridentifikasi → usulan koreksi' },
      { id: 'sad',     ic: 'scale',  lbl: 'SAD Ledger',     rel: 'Eksepsi pengujian → akumulasi salah saji (SA 450)' },
      { id: 'opinion', ic: 'gavel',  lbl: 'Audit Opinion',  rel: 'Indikasi kecurangan → pertimbangan opini & komunikasi' },
    ],
  },
  confirm: {
    std: 'SA 505 · Konfirmasi Eksternal',    up: [
      { id: 'risk',     ic: 'shield', lbl: 'Risk Assessment', rel: 'R-01 piutang → keputusan konfirmasi & cakupan' },
      { id: 'psak71',   ic: 'coins',  lbl: 'PSAK 71 · Instrumen', rel: 'Saldo piutang & basis CKPN/ECL yang dikonfirmasi' },
      { id: 'sampling', ic: 'dice',   lbl: 'Sampling Engine', rel: 'Pemilihan debitur & ukuran sampel konfirmasi' },
    ],
    down: [
      { id: 'psak71',  ic: 'coins',   lbl: 'PSAK 71 · Instrumen', rel: 'Hasil konfirmasi → validasi keberadaan & ECL' },
      { id: 'sad',     ic: 'scale',   lbl: 'SAD Ledger',     rel: 'Selisih konfirmasi & prosedur alternatif → salah saji' },
      { id: 'evidence',ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Reliabilitas bukti konfirmasi → kecukupan bukti' },
    ],
  },
  analytical: {
    std: 'SA 520 · Prosedur Analitis',
    up: [
      { id: 'wtb',         ic: 'table',  lbl: 'Working Trial Balance', rel: 'Saldo buku besar berjalan vs prior — basis flux' },
      { id: 'materiality', ic: 'target', lbl: 'Materiality',   rel: 'Ambang investigasi fluktuasi (threshold)' },
      { id: 'fsgen',       ic: 'report', lbl: 'Financial Statement', rel: 'Angka LK & rasio untuk reviu menyeluruh' },
    ],
    down: [
      { id: 'risk',       ic: 'shield',  lbl: 'Risk Assessment', rel: 'Fluktuasi tak terjelaskan → area berisiko baru' },
      { id: 'evidence',   ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Bukti substantif analitis → kecukupan' },
      { id: 'goingconcern',ic: 'pulse',  lbl: 'Going Concern',  rel: 'Rasio likuiditas/solvabilitas → indikator GC' },
    ],
  },
  goingconcern: {
    std: 'SA 570 · Kelangsungan Usaha',
    up: [
      { id: 'analytical', ic: 'trend', lbl: 'Analytical Review', rel: 'Rasio likuiditas, tren rugi & arus kas operasi' },
      { id: 'forensic',   ic: 'water', lbl: 'Forensic Cash Flow', rel: 'Proyeksi arus kas & uji tekanan likuiditas' },
      { id: 'subsequent', ic: 'calendar', lbl: 'Subsequent Events', rel: 'Peristiwa setelah tanggal neraca yang relevan GC' },
    ],
    down: [
      { id: 'opinion', ic: 'gavel',  lbl: 'Audit Opinion',  rel: 'Ketidakpastian material → paragraf penekanan/modifikasi' },
      { id: 'fsgen',   ic: 'report', lbl: 'Financial Statement', rel: 'Pengungkapan asumsi & ketidakpastian GC di CALK' },
      { id: 'mgmtletter', ic: 'mail', lbl: 'Management Letter', rel: 'Komunikasi indikator & rencana manajemen' },
    ],
  },
  opening: {
    std: 'SA 510 · Saldo Awal — Perikatan Tahun Pertama',
    up: [
      { id: 'wtb',      ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo awal vs audited prior — penelusuran' },
      { id: 'strategy', ic: 'doc',   lbl: 'Strategy Memo',  rel: 'Jenis perikatan (awal/lanjutan) & ketergantungan auditor pendahulu' },
    ],
    down: [
      { id: 'analytical', ic: 'trend',  lbl: 'Analytical Review', rel: 'Konsistensi kebijakan → reviu komparatif' },
      { id: 'fsgen',      ic: 'report', lbl: 'Financial Statement', rel: 'Informasi komparatif (SA 710) di LK' },
      { id: 'opinion',    ic: 'gavel',  lbl: 'Audit Opinion',  rel: 'Implikasi saldo awal terhadap opini' },
    ],
  },
  subsequent: {
    std: 'SA 560 · Peristiwa Kemudian',
    up: [
      { id: 'confirm', ic: 'mail',   lbl: 'Confirmation Hub', rel: 'Penerimaan setelah tanggal neraca (subsequent receipts)' },
      { id: 'risk',    ic: 'shield', lbl: 'Risk Assessment',  rel: 'Area berisiko yang perlu ditelaah hingga tgl laporan' },
    ],
    down: [
      { id: 'opinion',     ic: 'gavel',  lbl: 'Audit Opinion', rel: 'Peristiwa penyesuai/pengungkap → opini & tanggal laporan' },
      { id: 'fsgen',       ic: 'report', lbl: 'Financial Statement', rel: 'Pengungkapan peristiwa setelah periode pelaporan' },
      { id: 'goingconcern',ic: 'pulse',  lbl: 'Going Concern', rel: 'Peristiwa yang mengubah penilaian kelangsungan usaha' },
    ],
  },
  evidence: {
    std: 'SA 500 · Bukti Audit',
    up: [
      { id: 'confirm',    ic: 'mail',   lbl: 'Confirmation Hub', rel: 'Bukti eksternal — reliabilitas tertinggi' },
      { id: 'sampling',   ic: 'dice',   lbl: 'Sampling Engine',  rel: 'Hasil uji sampel → proyeksi populasi' },
      { id: 'analytical', ic: 'trend',  lbl: 'Analytical Review', rel: 'Bukti substantif analitis' },
      { id: 'jet',        ic: 'flask',  lbl: 'Journal Entry Testing', rel: 'Bukti pengujian jurnal' },
    ],
    down: [
      { id: 'sad',     ic: 'scale', lbl: 'SAD Ledger',    rel: 'Kecukupan & ketepatan bukti → kesimpulan salah saji' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Bukti memadai/tidak → dasar opini (SA 705)' },
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Dokumentasi bukti (SA 230)' },
    ],
  },
  sad: {
    std: 'SA 450 · Evaluasi Salah Saji',
    up: [
      { id: 'aje',         ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Salah saji dikoreksi & belum dikoreksi' },
      { id: 'jet',         ic: 'flask',  lbl: 'Journal Entry Testing', rel: 'Eksepsi pengujian jurnal → salah saji faktual' },
      { id: 'materiality', ic: 'target', lbl: 'Materiality',   rel: 'PM & ambang sepele (clearly trivial)' },
    ],
    down: [
      { id: 'opinion', ic: 'gavel',      lbl: 'Audit Opinion', rel: 'Salah saji tak dikoreksi ≥ PM → modifikasi opini' },
      { id: 'eqr',     ic: 'checkCircle',lbl: 'EQR Workflow',  rel: 'Telaah penilai mutu atas kesimpulan salah saji' },
      { id: 'mgmtletter', ic: 'mail',    lbl: 'Management Letter', rel: 'Daftar salah saji tak dikoreksi ke manajemen' },
    ],
  },
  opinion: {
    std: 'SA 700 / 705 / 701 · Perumusan Opini',
    up: [
      { id: 'sad',         ic: 'scale',   lbl: 'SAD Ledger',    rel: 'Salah saji tak dikoreksi → jenis & dasar opini' },
      { id: 'goingconcern',ic: 'pulse',   lbl: 'Going Concern', rel: 'Ketidakpastian material → EoM/penekanan' },
      { id: 'evidence',    ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Kecukupan bukti → opini wajar/modifikasi' },
      { id: 'subsequent',  ic: 'calendar',lbl: 'Subsequent Events', rel: 'Peristiwa kemudian → tanggal & isi laporan' },
    ],
    down: [
      { id: 'fsgen', ic: 'report',      lbl: 'Financial Statement', rel: 'LK final + laporan auditor → paket pelaporan' },
      { id: 'eqr',   ic: 'checkCircle', lbl: 'EQR Workflow',  rel: 'Telaah mutu wajib sebelum tanda tangan' },
      { id: 'pppk',  ic: 'report',      lbl: 'Pelaporan PPPK', rel: 'Pelaporan opini ke regulator (PPPK)' },
    ],
  },
};

/* ============================================================
   Prioritas 4 — Rantai Firma: ERP & SDM/Operasi.
   Sub-graf sisi firma yang tadinya pulau, dirangkai jadi dua rantai
   terhubung lewat dock "Keterkaitan Modul" yang sama (ModuleLineage).
   ============================================================ */
const FIRM_LINEAGE = {
  /* ---------- Rantai ERP ---------- */
  firmfinance: { std: 'Firm Finance · Cockpit Keuangan Firma (SSOT)',
    up: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Neraca saldo firma (FIRM_COA) → P&L, neraca & pos kontrol' },
      { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP', rel: 'Pendapatan diakui & WIP belum ditagih (PSAK 72)' },
      { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Piutang & utang usaha → modal kerja' },
      { id: 'cashbank', ic: 'building', lbl: 'Kas, Bank & Rekonsiliasi', rel: 'Saldo kas multi-mata uang → posisi likuiditas' },
      { id: 'treasury', ic: 'pulse', lbl: 'Anggaran & Arus Kas', rel: 'Anggaran vs aktual (terikat ke akun GL)' },
      { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Portofolio fee & margin per partner' },
    ],
    down: [
      { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Laba buku → dasar rekonsiliasi fiskal PPh badan' },
      { id: 'bi', ic: 'trend', lbl: 'BI & Konsolidasi', rel: 'KPI keuangan firma → konsolidasi & analitik' },
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kesehatan keuangan → pemantauan mutu firma' },
    ] },
  firmgl: { std: 'ERP Firma · General Ledger',
    up: [
      { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Utang & piutang usaha → jurnal langganan' },
      { id: 'payroll', ic: 'coins', lbl: 'Payroll & PPh 21', rel: 'Beban gaji & PPh 21 → jurnal' },
      { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP', rel: 'Pendapatan jasa diakui → jurnal' },
      { id: 'cashbank', ic: 'building', lbl: 'Kas, Bank & Rekonsiliasi', rel: 'Mutasi kas/bank → jurnal' },
    ],
    down: [
      { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Saldo akun → laba per lini jasa' },
      { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Laba buku → rekonsiliasi fiskal' },
      { id: 'treasury', ic: 'pulse', lbl: 'Anggaran & Arus Kas', rel: 'Realisasi vs anggaran' },
    ] },
  apar: { std: 'ERP Firma · Utang / Piutang',
    up: [
      { id: 'billing', ic: 'receipt', lbl: 'Billing & Invoicing', rel: 'Faktur klien → piutang usaha' },
      { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'PO vendor → utang usaha' },
    ],
    down: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Posting AP/AR ke buku besar' },
      { id: 'cashbank', ic: 'building', lbl: 'Kas, Bank & Rekonsiliasi', rel: 'Pelunasan → mutasi kas' },
      { id: 'treasury', ic: 'pulse', lbl: 'Anggaran & Arus Kas', rel: 'Proyeksi arus kas masuk/keluar' },
    ] },
  revenue: { std: 'ERP Firma · Pendapatan & WIP',
    up: [
      { id: 'billing', ic: 'receipt', lbl: 'Billing & Invoicing', rel: 'Faktur & termin → pendapatan' },
      { id: 'wipreal', ic: 'hourglass', lbl: 'WIP & Realisasi', rel: 'WIP → realisasi pendapatan' },
      { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Jam terpakai → akrual WIP' },
    ],
    down: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Posting pendapatan jasa' },
      { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Pendapatan per lini & per partner' },
      { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Objek PPh badan' },
    ] },
  treasury: { std: 'ERP Firma · Anggaran & Arus Kas',
    up: [
      { id: 'cashbank', ic: 'building', lbl: 'Kas, Bank & Rekonsiliasi', rel: 'Saldo kas/bank aktual' },
      { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Proyeksi piutang & utang' },
      { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP', rel: 'Proyeksi penerimaan' },
    ],
    down: [
      { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Anggaran vs aktual' },
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Realisasi anggaran' },
    ] },
  cashbank: { std: 'ERP Firma · Kas & Bank',
    up: [
      { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Pelunasan piutang/utang' },
      { id: 'payroll', ic: 'coins', lbl: 'Payroll & PPh 21', rel: 'Pembayaran gaji' },
    ],
    down: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Posting kas/bank' },
      { id: 'treasury', ic: 'pulse', lbl: 'Anggaran & Arus Kas', rel: 'Saldo aktual → arus kas' },
    ] },
  fixedassets: { std: 'ERP Firma · Aset Tetap Kantor',
    up: [
      { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Pengadaan aset & kapitalisasi' },
    ],
    down: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Penyusutan → jurnal' },
      { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Penyusutan fiskal' },
    ] },
  firmtax: { std: 'ERP Firma · Pajak Firma',
    up: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Laba buku → rekonsiliasi fiskal' },
      { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP', rel: 'Objek PPh badan' },
      { id: 'payroll', ic: 'coins', lbl: 'Payroll & PPh 21', rel: 'PPh 21 karyawan' },
    ],
    down: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Beban & utang pajak → jurnal' },
      { id: 'treasury', ic: 'pulse', lbl: 'Anggaran & Arus Kas', rel: 'Pembayaran pajak' },
    ] },
  profitability: { std: 'ERP Firma · Profitabilitas',
    up: [
      { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP', rel: 'Pendapatan per lini jasa' },
      { id: 'payroll', ic: 'coins', lbl: 'Payroll & PPh 21', rel: 'Beban SDM' },
      { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Biaya & utilisasi jam' },
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Beban operasional' },
    ],
    down: [
      { id: 'pipeline', ic: 'trend', lbl: 'Sales Pipeline', rel: 'Target & penetapan harga' },
      { id: 'bi', ic: 'trend', lbl: 'BI & Konsolidasi', rel: 'Konsolidasi & analitik firma' },
    ] },

  /* ---------- Rantai SDM & Operasi ---------- */
  hcm: { std: 'SDM · Modal Insani',
    up: [
      { id: 'recruitment', ic: 'briefcase', lbl: 'Rekrutmen & Onboarding', rel: 'Karyawan baru → master' },
      { id: 'orgchart', ic: 'group', lbl: 'Struktur Organisasi', rel: 'Posisi, jenjang & atasan' },
    ],
    down: [
      { id: 'payroll', ic: 'coins', lbl: 'Payroll & PPh 21', rel: 'Master gaji & tunjangan' },
      { id: 'performance', ic: 'target', lbl: 'Siklus Kinerja', rel: 'Populasi siklus kinerja' },
      { id: 'leave', ic: 'calendar', lbl: 'Cuti & Kehadiran', rel: 'Kuota cuti & saldo' },
      { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Kapasitas & peran tim' },
      { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Daftar partner/staf → rotasi' },
    ] },
  payroll: { std: 'SDM · Payroll & PPh 21',
    up: [
      { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Master karyawan & komponen gaji' },
      { id: 'leave', ic: 'calendar', lbl: 'Cuti & Kehadiran', rel: 'Lembur & potong kehadiran' },
      { id: 'performance', ic: 'target', lbl: 'Siklus Kinerja', rel: 'Merit & bonus' },
    ],
    down: [
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Beban gaji → jurnal' },
      { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'PPh 21 → SPT masa' },
      { id: 'cashbank', ic: 'building', lbl: 'Kas, Bank & Rekonsiliasi', rel: 'Pembayaran gaji' },
    ] },
  performance: { std: 'SDM · Siklus Kinerja',
    up: [
      { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Master karyawan & jenjang' },
      { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Realisasi jam & utilisasi' },
    ],
    down: [
      { id: 'payroll', ic: 'coins', lbl: 'Payroll & PPh 21', rel: 'Merit / bonus' },
      { id: 'succession', ic: 'trend', lbl: 'Suksesi & Karier', rel: 'Talenta → rencana suksesi' },
      { id: 'learning', ic: 'flask', lbl: 'Pelatihan & Kompetensi', rel: 'Gap kompetensi → pelatihan' },
    ] },
  scheduler: { std: 'Operasi · Penjadwalan Sumber Daya',
    up: [
      { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Kapasitas & peran' },
      { id: 'capacity', ic: 'pulse', lbl: 'Capacity Planning', rel: 'Ketersediaan tim' },
      { id: 'pipeline', ic: 'trend', lbl: 'Sales Pipeline', rel: 'Engagement masuk → resourcing' },
    ],
    down: [
      { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Alokasi → timesheet' },
      { id: 'delivery', ic: 'flag', lbl: 'Delivery & Milestones', rel: 'Jadwal milestone' },
      { id: 'wipreal', ic: 'hourglass', lbl: 'WIP & Realisasi', rel: 'Alokasi → akrual WIP' },
    ] },
  capacity: { std: 'Operasi · Perencanaan Kapasitas',
    up: [
      { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Headcount & FTE' },
      { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Beban alokasi aktual' },
    ],
    down: [
      { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Rebalancing alokasi' },
      { id: 'pipeline', ic: 'trend', lbl: 'Sales Pipeline', rel: 'Kapasitas vs pipeline' },
    ] },
  independence: { std: 'SDM & Kepatuhan · Independensi',
    up: [
      { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Daftar partner & staf' },
      { id: 'crm', ic: 'users', lbl: 'Client CRM', rel: 'Klien & relasi keuangan' },
      { id: 'engagement', ic: 'briefcase', lbl: 'Engagement Mgmt', rel: 'Penugasan & tenure rotasi' },
    ],
    down: [
      { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Telaah independensi perikatan' },
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'SOQM · etika & independensi' },
      { id: 'ethics', ic: 'scale', lbl: 'Kode Etik & AML', rel: 'Benturan kepentingan' },
    ] },
  cpe: { std: 'SDM & Kepatuhan · CPE / PPL',
    up: [
      { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Staf wajib PPL' },
      { id: 'learning', ic: 'flask', lbl: 'Pelatihan & Kompetensi', rel: 'Pelatihan diikuti → SKP' },
    ],
    down: [
      { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Syarat kompetensi penugasan' },
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kepatuhan PPL SDM' },
    ] },

  /* ---------- Jembatan Operasi (menghubungkan ERP & SDM) ---------- */
  billing: { std: 'Operasi · Penagihan',
    up: [
      { id: 'wipreal', ic: 'hourglass', lbl: 'WIP & Realisasi', rel: 'WIP → dasar tagihan' },
      { id: 'delivery', ic: 'flag', lbl: 'Delivery & Milestones', rel: 'Milestone → termin' },
      { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP', rel: 'Pendapatan diakui' },
    ],
    down: [
      { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Faktur → piutang usaha' },
      { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Realisasi vs WIP' },
    ] },
  wipreal: { std: 'Operasi · WIP & Realisasi',
    up: [
      { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Jam terpakai → WIP' },
      { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Alokasi tim' },
    ],
    down: [
      { id: 'billing', ic: 'receipt', lbl: 'Billing & Invoicing', rel: 'WIP → faktur' },
      { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP', rel: 'Realisasi pendapatan' },
      { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Write-off & realisasi' },
    ] },
  delivery: { std: 'Operasi · Pengiriman & Milestone',
    up: [
      { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Jadwal & alokasi' },
      { id: 'engagement', ic: 'briefcase', lbl: 'Engagement Mgmt', rel: 'Lingkup & tenggat' },
    ],
    down: [
      { id: 'billing', ic: 'receipt', lbl: 'Billing & Invoicing', rel: 'Milestone → termin tagih' },
      { id: 'cockpit', ic: 'dashboard', lbl: 'Engagement Cockpit', rel: 'Status → cockpit engagement' },
    ] },
  pipeline: { std: 'Operasi · Pipeline Penjualan',
    up: [
      { id: 'crm', ic: 'users', lbl: 'Client CRM', rel: 'Klien & prospek' },
    ],
    down: [
      { id: 'onboarding', ic: 'flag', lbl: 'Onboarding Klien', rel: 'Won → onboarding klien' },
      { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Resourcing engagement' },
      { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Proyeksi pendapatan' },
    ] },
};
Object.assign(LINEAGE, FIRM_LINEAGE);

/* Valuasi WIP (route 'wip') — modul valuasi mendalam. Hulu: jam (Time),
   realisasi & write-down (WIP & Realisasi), alokasi (Scheduler). Hilir:
   penagihan, pendapatan diakui (PSAK 72), kontrol GL 1-300 & profitabilitas.
   Satu sumber kebenaran: FIRMFIN.wip() → sub-buku WIP_ENG → kontrol 1-300. */
LINEAGE.wip = {
  std: 'Firm Finance · Valuasi WIP (PSAK 72 · kontrol GL 1-300)',
  up: [
    { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Jam ter-charge × tarif standar → nilai standar WIP terbentuk' },
    { id: 'wipreal', ic: 'hourglass', lbl: 'WIP & Realisasi', rel: 'Write-up/down & realisasi per partner (sub-buku yang sama)' },
    { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Alokasi tim → akrual jam yang membentuk WIP' },
  ],
  down: [
    { id: 'billing', ic: 'receipt', lbl: 'Billing & Invoicing', rel: 'WIP terpulihkan → penerbitan faktur (transfer ke piutang 1-200)' },
    { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP', rel: 'WIP → pendapatan diakui (% penyelesaian, PSAK 72)' },
    { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Saldo WIP → menutup ke kontrol GL 1-300 (Sumber Kebenaran)' },
    { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Realisasi, margin & write-off per lini & partner' },
  ],
};

/* Prioritas 5 — tutup pulau sisa di workspace Perikatan (perencanaan & spesifik) */
const ENGAGEMENT_EXTRA = {
  strategy: { std: 'SA 300 · Strategi Audit',
    up: [
      { id: 'onboarding', ic: 'flag', lbl: 'Onboarding Klien', rel: 'Penerimaan & pemahaman klien' },
      { id: 'materiality', ic: 'target', lbl: 'Materiality', rel: 'Materialitas perencanaan' },
      { id: 'crm', ic: 'users', lbl: 'Client CRM', rel: 'Profil, industri & relasi klien' },
    ],
    down: [
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Penilaian RoMM' },
      { id: 'icfr', ic: 'sliders', lbl: 'Internal Control', rel: 'Pemahaman pengendalian' },
      { id: 'programme', ic: 'flask', lbl: 'Audit Programme', rel: 'Program audit terinci' },
    ] },
  programme: { std: 'SA 300 / 330 · Program Audit',
    up: [
      { id: 'strategy', ic: 'doc', lbl: 'Strategy Memo', rel: 'Strategi & pendekatan audit' },
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'RoMM → prosedur respons (SA 330)' },
      { id: 'materiality', ic: 'target', lbl: 'Materiality', rel: 'Lingkup & ukuran sampel' },
    ],
    down: [
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Eksekusi prosedur → kertas kerja' },
      { id: 'tasks', ic: 'check', lbl: 'My Tasks', rel: 'Penugasan ke tim' },
      { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Anggaran jam per prosedur' },
    ] },
  internalaudit: { std: 'SA 610 · Penggunaan Auditor Internal',
    up: [
      { id: 'icfr', ic: 'sliders', lbl: 'Internal Control', rel: 'Pemahaman & evaluasi fungsi audit internal' },
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Area yang dapat diandalkan' },
    ],
    down: [
      { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Bukti dari pekerjaan auditor internal' },
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Dokumentasi dasar penggunaan' },
    ] },
  time: { std: 'Operasi · Time & Budget',
    up: [
      { id: 'programme', ic: 'flask', lbl: 'Audit Programme', rel: 'Anggaran jam per prosedur' },
      { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Alokasi tim → timesheet' },
    ],
    down: [
      { id: 'wipreal', ic: 'hourglass', lbl: 'WIP & Realisasi', rel: 'Jam terpakai → WIP' },
      { id: 'profitability', ic: 'trend', lbl: 'Profitability', rel: 'Biaya & utilisasi' },
      { id: 'performance', ic: 'target', lbl: 'Siklus Kinerja', rel: 'Utilisasi staf' },
    ] },
};
Object.assign(LINEAGE, ENGAGEMENT_EXTRA);

/* Prioritas 6 — Jasa advisory: Financial Due Diligence menaut ke rantai
   akuisisi (CRM/Onboarding di hulu; PSAK 22 / Asurans proyeksi di hilir). */
const ADVISORY_LINEAGE = {
  duediligence: { std: 'Advisory · Financial Due Diligence (Non-Asurans)',
    up: [
      { id: 'crm', ic: 'users', lbl: 'Client CRM', rel: 'OPP-105 (Won) → mandat financial due diligence' },
      { id: 'onboarding', ic: 'flag', lbl: 'Onboarding & PMPJ', rel: 'PROS-06 · akseptasi, PMPJ/APU-PPT & surat perikatan' },
      { id: 'pipeline', ic: 'trend', lbl: 'Sales Pipeline', rel: 'Peluang Won → konversi perikatan advisory' },
    ],
    down: [
      { id: 'assurance', ic: 'shield', lbl: 'Asurans Lain (SPA 3400)', rel: 'PFI-2025-090 · pemeriksaan proyeksi klien yang sama' },
      { id: 'nonaudit', ic: 'flask', lbl: 'Portofolio Jasa Non-Audit', rel: 'DD-2025-105 terdaftar pada registri jasa SPAP' },
      { id: 'psak22', ic: 'coins', lbl: 'PSAK 22 · Kombinasi Bisnis', rel: 'EBITDA & net debt ternormalisasi → dasar PPA pasca-akuisisi' },
    ] },
};
Object.assign(LINEAGE, ADVISORY_LINEAGE);

/* SJAH 3410 — Asurans Laporan Emisi GRK (ISAE 3410). SSOT: ghgEngine —
   emisi dihitung dari data aktivitas × faktor emisi/GWP. Hulu: katalog &
   portofolio asurans + gerbang data aktivitas; hilir: hal pokok Asurans
   Lain, progres portofolio, & cakupan Matriks Kepatuhan. */
LINEAGE.sjah3410 = {
  std: 'SJAH 3410 · Asurans Laporan Emisi GRK (selaras ISAE 3410 · GHG Protocol · ISO 14064-1)',
  up: [
    { id: 'assurance', ic: 'shield', lbl: 'Asurans Lain (Portofolio)', rel: 'ASR-2025-080 · perikatan keyakinan terbatas Emisi GRK' },
    { id: 'sjah3000', ic: 'shield', lbl: 'SJAH 3000 · Katalog Asurans', rel: 'Lima elemen perikatan & keberterimaan kriteria' },
    { id: 'integrations', ic: 'link2', lbl: 'Impor & Integrasi Data', rel: 'Data aktivitas (liter solar · kWh PLN) → gerbang masuk SSOT' },
  ],
  down: [
    { id: 'assurance', ic: 'shield', lbl: 'Asurans Lain — Hal Pokok', rel: 'Subject matter, klaim emisi & simpulan ditarik dari ghgEngine' },
    { id: 'nonaudit', ic: 'briefcase', lbl: 'Portofolio Jasa Non-Audit', rel: 'ASR-2025-080 · progres dihitung engine' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'SJAH 3410 · cakupan modul (sebelumnya gap)' },
  ],
};
Object.assign(window, { LINEAGE });

/* SJAH 3420 — Asurans Penyusunan Informasi Keuangan Proforma (ISAE 3420). SSOT:
   proformaEngine. Kolom tidak disesuaikan ditarik LIVE dari AMS_CANON (PSAK 65/72);
   penyesuaian selaras AMS_CANON.psak22 & tarif AMS_CANON.RATE. Hulu: sumber historis
   konsolidasian + akuntansi akuisisi; hilir: portofolio asurans, hal pokok Asurans
   Lain, & cakupan Matriks Kepatuhan (sebelumnya gap). */
LINEAGE.sjah3420 = {
  std: 'SJAH 3420 · Asurans Penyusunan Informasi Keuangan Proforma (selaras ISAE 3420 · PSAK 22 · POJK 7/2017)',
  up: [
    { id: 'psak65', ic: 'building', lbl: 'PSAK 65 · Konsolidasian', rel: 'Sumber tidak disesuaikan — posisi & laba konsolidasian auditan (live AMS_CANON)' },
    { id: 'psak72', ic: 'receipt', lbl: 'PSAK 72 · Pendapatan', rel: 'Pendapatan konsolidasian tidak disesuaikan (tie-out)' },
    { id: 'psak22', ic: 'layers', lbl: 'PSAK 22 · Kombinasi Bisnis', rel: 'Metodologi penyesuaian — goodwill, PPA, NCI, pajak tangguhan' },
    { id: 'assurance', ic: 'shield', lbl: 'Asurans Lain (Portofolio)', rel: 'PFR-2025-091 · perikatan keyakinan memadai proforma' },
  ],
  down: [
    { id: 'assurance', ic: 'shield', lbl: 'Asurans Lain — Hal Pokok', rel: 'Subject matter & simpulan ditarik dari proformaEngine' },
    { id: 'nonaudit', ic: 'briefcase', lbl: 'Portofolio Jasa Non-Audit', rel: 'PFR-2025-091 · progres dihitung engine' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'SJAH 3420 · cakupan modul (sebelumnya gap)' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Template Library — lineage DIBANGKITKAN dari registri kanonik
   (window.AMS.TEMPLATES). Hilir = modul yang memakai keluaran
   template; dibangun otomatis agar konsisten dengan sumber data.
   ============================================================ */
(function buildTemplateLineage() {
  const T = (window.AMS && window.AMS.TEMPLATES) || [];
  if (!T.length) return;
  const MI = window.MODULE_INDEX || {};
  /* kelompokkan per modul konsumen, hitung jumlah & contoh template */
  const byMod = {};
  T.forEach(t => {
    const m = (byMod[t.module] = byMod[t.module] || { id: t.module, n: 0, dl: 0, sample: t.name, ic: (MI[t.module] || {}).icon || 'doc', lbl: (MI[t.module] || {}).label || t.module });
    m.n += 1; m.dl += t.dl; if (t.dl > 0 && t.name.length < m.sample.length) m.sample = t.name;
  });
  const down = Object.values(byMod)
    .sort((a, b) => b.n - a.n || b.dl - a.dl)
    .slice(0, 8)
    .map(m => ({ id: m.id, ic: m.ic, lbl: m.lbl, rel: m.n > 1 ? m.n + ' template · mis. ' + m.sample : m.sample }));

  LINEAGE.templates = {
    std: 'Referensi & Indeks · Registri Template (IAPI / ISQM)',
    up: [
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'ISQM 1 — metodologi & kebijakan mutu yang membakukan template' },
      { id: 'kb', ic: 'book', lbl: 'Knowledge Base', rel: 'Panduan standar & praktik yang menjadi dasar isi template' },
      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Pemetaan standar → ketertelusuran template ke prosedur' },
      { id: 'dms', ic: 'archive', lbl: 'Document Management', rel: 'Versi & retensi pack metodologi yang dikendalikan' },
    ],
    down,
  };
})();

/* Knowledge Base — hulu: registri standar (Matriks Kepatuhan) & metodologi mutu;
   hilir: modul yang menerapkan standar + template/DMS. Dock dua-arah yang sama. */
LINEAGE.kb = {
  std: 'Referensi & Indeks · Basis Pengetahuan Standar (SA/PSAK)',
  up: [
    { id: 'compmatrix', ic: 'table',    lbl: 'Matriks Kepatuhan', rel: 'Registri standar kanonik — sumber tunggal katalog artikel KB' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)',  rel: 'ISQM 1 — kebijakan & metodologi mutu yang dirujuk panduan' },
    { id: 'templates',  ic: 'template', lbl: 'Template Library',   rel: 'Berkas yang mengimplementasikan standar terkait (tarikan live)' },
  ],
  down: [
    { id: 'risk',       ic: 'shield',  lbl: 'Risk Assessment',     rel: 'Panduan SA 315 → penerapan penilaian risiko' },
    { id: 'workpapers', ic: 'layers',  lbl: 'Working Papers',      rel: 'Standar → desain prosedur respons & dokumentasi (SA 330/230)' },
    { id: 'sa540',      ic: 'target',  lbl: 'SA 540 · Estimasi',   rel: 'Panduan estimasi akuntansi → checklist kepatuhan' },
    { id: 'dms',        ic: 'archive', lbl: 'Document Management', rel: 'Versi panduan & pack metodologi yang terarsip' },
  ],
};


/* Forensic Cash Flow — analitik anomali kas. Hulu: WTB & mesin FS Generator
   (waterfall/jembatan), PSAK 2 (arus kas kanonik), JET (populasi jurnal),
   Pihak Berelasi (RPT). Hilir: JET (pengujian terarah), Going Concern
   (likuiditas), SAD (eksepsi), SA 520 (analitis). Satu sumber kebenaran. */
LINEAGE.forensic = {
  std: 'Forensic Cash Flow · Analitik Anomali Kas (SA 240 · SA 520 · PSAK 2)',
  up: [
    { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo & mutasi akun kas → basis arus kas (efek-kas −Δsaldo)' },
    { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Mesin derivasi LK yang sama → waterfall & jembatan arus kas bruto' },
    { id: 'psak2', ic: 'water', lbl: 'PSAK 2 · Arus Kas', rel: 'Laporan arus kas kanonik — angka O/I/F yang identik' },
    { id: 'jet', ic: 'flask', lbl: 'Journal Entry Testing', rel: 'Populasi jurnal manual yang SAMA → anomali mutasi kas' },
    { id: 'related', ic: 'group', lbl: 'Pihak Berelasi', rel: 'Registri RPT (SA 550 · PSAK 7) → eksposur pihak berelasi' },
  ],
  down: [
    { id: 'jet', ic: 'flask', lbl: 'Journal Entry Testing', rel: 'Anomali kas → seleksi pengujian jurnal terarah (SA 240)' },
    { id: 'goingconcern', ic: 'pulse', lbl: 'Going Concern', rel: 'Arus kas operasi & tekanan likuiditas (SA 570)' },
    { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Eksepsi forensik → akumulasi salah saji (SA 450)' },
    { id: 'analytical', ic: 'trend', lbl: 'Analytical Review', rel: 'Fluktuasi arus kas tak biasa → prosedur analitis (SA 520)' },
  ],
};

/* ---- P2: modul akuntansi & pengungkapan baru (berkaca dari LK ilustratif) ---- */
Object.assign(LINEAGE, {
  segmen: {
    std: 'PSAK 5 · Informasi Segmen (IFRS 8)',
    up: [
      { id: 'psak72', ic: 'receipt', lbl: 'PSAK 72 · Pendapatan', rel: 'Disagregasi pendapatan per lini → basis segmen' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Total aset & laba usaha → rekonsiliasi segmen' },
      { id: 'risk', ic: 'target', lbl: 'Risk Assessment', rel: 'Konsentrasi pelanggan/segmen → RoMM' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Catatan informasi segmen pada CALK' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Persyaratan 108p23 → status pengungkapan' },
    ],
  },
  invprop: {
    std: 'PSAK 13 · Properti Investasi (IAS 40)',
    up: [
      { id: 'psak68', ic: 'layers', lbl: 'PSAK 68 · Nilai Wajar', rel: 'Hierarki & input Level 3 → pengukuran nilai wajar' },
      { id: 'expert', ic: 'shield', lbl: 'Penggunaan Pakar', rel: 'Penilaian KJPP/MAPPI (SA 620)' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Pos neraca & keuntungan nilai wajar → Laba Rugi' },
      { id: 'psak46', ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan', rel: 'Beda temporer atas keuntungan nilai wajar' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Persyaratan 240p76 → status pengungkapan' },
    ],
  },
  assoc: {
    std: 'PSAK 15 · Investasi Asosiasi (IAS 28)',
    up: [
      { id: 'psak65', ic: 'building', lbl: 'PSAK 65 · Konsolidasi', rel: 'Batas konsolidasi → nilai tercatat di luar konsolidasi' },
      { id: 'psak66', ic: 'columns', lbl: 'PSAK 66 · Ventura Bersama', rel: 'Metode ekuitas serumpun (ventura)' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Bagian laba asosiasi → Laba Rugi konsolidasian' },
      { id: 'psak48', ic: 'scale', lbl: 'PSAK 48 · Penurunan Nilai', rel: 'Uji penurunan nilai investasi (¶42)' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Persyaratan 228p21 → status pengungkapan' },
    ],
  },
  newdisc: {
    std: 'Pengungkapan Baru 2024 (Pilar Dua · Iklim · Pendanaan Pemasok)',
    up: [
      { id: 'psak46', ic: 'receipt', lbl: 'PSAK 46 · Pajak Penghasilan', rel: 'ETR per yurisdiksi → eksposur Pilar Dua' },
      { id: 'psak71', ic: 'coins', lbl: 'PSAK 71 · Instrumen Keuangan', rel: 'Overlay iklim pada ECL' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Pengungkapan baru pada CALK & arus kas' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: '212p88A & DV iklim → status pengungkapan' },
    ],
  },
  sakroadmap: {
    std: 'Roadmap SAK & Pelacak ISAK (horizon standar — Gap G5)',
    up: [
      { id: 'framework', ic: 'scale', lbl: 'Penentu Kerangka', rel: 'Kerangka pelaporan (SAK/EP/EMKM) yang dipantau horizonnya' },
      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Registri standar & alias penomoran selaras-IFRS' },
    ],
    down: [
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Standar terbit belum efektif → baris pengungkapan (PSAK 25 ¶30)' },
      { id: 'psak1', ic: 'report', lbl: 'PSAK 1 → 207 · Penyajian LK', rel: 'Pemetaan struktur L/R ke kategori PSAK 207' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Template LK dimutakhirkan ke struktur standar baru' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Kelengkapan kerangka pelaporan → perumusan opini (SA 700)' },
    ],
  },
  disclosure: {
    std: 'Daftar-Uji Pengungkapan (rujukan paragraf selaras-IFRS)',
    up: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Keluaran LK diuji terhadap persyaratan paragraf' },
      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Registri standar & alias penomoran' },
      { id: 'segmen', ic: 'columns', lbl: 'Informasi Segmen', rel: 'Sumber pemenuhan 108p23' },
    ],
    down: [
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Kelengkapan pengungkapan → perumusan opini (SA 700)' },
      { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Telaah mutu kelengkapan CALK' },
    ],
  },
});
Object.assign(window, { LINEAGE });


function ModuleLineage({ moduleId }) {
  const L = (typeof LINEAGE !== 'undefined' ? LINEAGE : window.LINEAGE || {})[moduleId];
  const nav = (typeof useNav === 'function') ? useNav() : (window.__amsNav || (() => {}));
  const [open, setOpen] = React.useState(true);
  if (!L) return null;

  const Chip = ({ m, color }) => {
    const Ic = (window.I && (window.I[m.ic] || window.I.doc));
    return (
      <button type="button" className="lin-chip" title={m.rel + ' — buka ' + m.lbl}
        onClick={() => nav(m.id, { from: moduleId })} style={{ borderLeftColor: color }}>
        <span className="lin-ic" style={{ color }}>{Ic ? <Ic size={14} /> : null}</span>
        <span className="lin-txt"><span className="lin-lbl">{m.lbl}</span><span className="lin-rel">{m.rel}</span></span>
        <span className="lin-go">{window.I ? <window.I.arrowRight size={12} /> : '→'}</span>
      </button>
    );
  };

  return (
    <div className={'lineage-dock' + (open ? '' : ' collapsed')}>
      <button type="button" className="lin-head" onClick={() => setOpen(o => !o)} title={open ? 'Sembunyikan' : 'Tampilkan keterkaitan'}>
        {window.I ? <window.I.link2 size={14} /> : null}
        <span className="lin-h-t">Keterkaitan Modul</span>
        <span className="lin-h-s">{L.std}</span>
        <span className="lin-h-c">lineage dua arah</span>
        {window.I ? <window.I.chevDown size={14} style={{ transform: open ? 'none' : 'rotate(180deg)', transition: '.15s', marginLeft: 'auto' }} /> : null}
      </button>
      {open && (
        <div className="lin-body">
          <div className="lin-col">
            <span className="lin-col-h up">↑ Hulu · sumber masukan</span>
            <div className="lin-chips">{L.up.map(m => <Chip key={'u' + m.id} m={m} color="var(--blue)" />)}</div>
          </div>
          <div className="lin-col">
            <span className="lin-col-h down">↓ Hilir · pengguna keluaran</span>
            <div className="lin-chips">{L.down.map(m => <Chip key={'d' + m.id} m={m} color="var(--green)" />)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Portal Klien / PBC — hulu: perikatan & penilaian risiko menentukan dokumen
   yang diminta; hilir: berkas diterima mengalir ke kertas kerja, konfirmasi,
   evaluasi bukti & arsip DMS. Satu sumber kebenaran lintas modul. */
LINEAGE.clientportal = {
  std: 'Portal & Dokumen · Permintaan Dokumen Klien (PBC)',
  up: [
    { id: 'engagement', ic: 'briefcase', lbl: 'Engagement Mgmt',  rel: 'Identitas perikatan & klien (sumber tunggal) → konteks portal' },
    { id: 'risk',       ic: 'shield',    lbl: 'Risk Assessment',  rel: 'Area berisiko → prioritas & cakupan dokumen yang diminta' },
    { id: 'cockpit',    ic: 'dashboard', lbl: 'Engagement Cockpit', rel: 'Program audit → daftar dokumen yang dibutuhkan tim' },
  ],
  down: [
    { id: 'workpapers', ic: 'layers',  lbl: 'Working Papers',      rel: 'Berkas diterima → bukti substantif pada lead schedule (WP)' },
    { id: 'confirm',    ic: 'mail',    lbl: 'Confirmation Hub',    rel: 'Daftar piutang/bank → dasar konfirmasi eksternal (SA 505)' },
    { id: 'evidence',   ic: 'search2', lbl: 'Evaluasi Bukti',      rel: 'Klasifikasi otomatis → bukti per area & asersi (SA 500)' },
    { id: 'dms',        ic: 'archive', lbl: 'Document Management', rel: 'Arsip terenkripsi AES-256, klasifikasi & retensi (ISQM)' },
  ],
};

/* ============================================================
   Firm Platform — lineage dua-arah. SSOT: antrean persetujuan,
   integrasi data eksternal & jejak audit semuanya menarik dari
   entitas kanonik yang sama yang dibaca modul-modul ini.
   ============================================================ */
LINEAGE.approvals = {
  std: 'Firm Platform · Otorisasi & Persetujuan (ISQM 1)',
  up: [
    { id: 'aje', ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Jurnal Proposed → persetujuan; final → posting ke WTB' },
    { id: 'billing', ic: 'receipt', lbl: 'Billing & Invoicing', rel: 'Faktur Draft / termin besar → otorisasi penerbitan' },
    { id: 'pipeline', ic: 'trend', lbl: 'Sales Pipeline', rel: 'Peluang tahap Proposal/Negosiasi → penerimaan klien' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Perikatan fase Finalisasi → persetujuan penerbitan opini' },
    { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Deklarasi & rotasi wajib → persetujuan etika' },
  ],
  down: [
    { id: 'audittrail', ic: 'lock', lbl: 'Audit Trail', rel: 'Setiap keputusan tercatat permanen (tamper-evident)' },
    { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'AJE disetujui → saldo WTB & laporan keuangan ter-update' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Bukti otorisasi mutu — pemantauan ISQM' },
  ],
};
LINEAGE.integrations = {
  std: 'Firm Platform · Impor & Integrasi Data (gerbang masuk SSOT)',
  up: [
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan keamanan, retensi & gerbang kontrol data (ISQM 1)' },
    { id: 'settings', ic: 'sliders', lbl: 'Pengaturan Firma', rel: 'Kredensial, scope & jadwal sinkron konektor' },
    { id: 'approvals', ic: 'checkCircle', lbl: 'Approvals', rel: 'Otorisasi & gerbang total kontrol sebelum posting' },
    { id: 'dataflow', ic: 'link2', lbl: 'Alur Data & Integritas', rel: 'Peta modul pemilik data (feedCounts) → tujuan posting' },
  ],
  down: [
    { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'e-Faktur & SPT masa (DJP Coretax) → di-posting; Σ PPN = total kontrol' },
    { id: 'cashbank', ic: 'building', lbl: 'Kas, Bank & Rekonsiliasi', rel: 'Bank feed → mutasi rekening; saldo = total kontrol' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'e-Signature (PrivyID) → tanda tangan laporan & opini' },
    { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'SharePoint → indeks kertas kerja (retensi ISQM)' },
    { id: 'onboarding', ic: 'flag', lbl: 'Onboarding & PMPJ', rel: 'AHU Online → verifikasi badan hukum klien' },
    { id: 'audittrail', ic: 'lock', lbl: 'Audit Trail', rel: 'Tiap impor → entri jejak SYNC tamper-evident' },
  ],
};
LINEAGE.audittrail = {
  std: 'Firm Platform · Jejak Audit Sistem (tamper-evident)',
  up: [
    { id: 'approvals', ic: 'checkCircle', lbl: 'Approvals', rel: 'Setiap keputusan persetujuan → entri log real-time' },
    { id: 'aje', ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Posting & penyetujuan jurnal tercatat' },
    { id: 'integrations', ic: 'link2', lbl: 'Integrations', rel: 'Peristiwa sinkron konektor (SYNC)' },
    { id: 'dataflow', ic: 'link2', lbl: 'Alur Data & Integritas', rel: 'Propagasi materialitas & tarikan WTB' },
  ],
  down: [
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Bukti pemantauan & remediasi mutu (ISQM 1)' },
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Jejak telaah mutu perikatan' },
    { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'Ketertelusuran untuk inspeksi regulator' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Ketertelusuran aksi → standar' },
  ],
};

/* SA 230 · Dokumentasi Audit — hub dokumentasi perikatan.
   Hulu: modul yang MENGHASILKAN materi/dasar dokumentasi (apa yang
   wajib didokumentasikan & isinya). Hilir: modul yang MENGGUNAKAN
   dokumentasi sebagai bukti kelengkapan, dasar telaah mutu & opini. */
LINEAGE.sa230 = {
  std: 'SA 230 · Dokumentasi Audit',
  up: [
    { id: 'workpapers', ic: 'layers',  lbl: 'Working Papers',     rel: '¶8(a–b) — sifat/saat/lingkup prosedur & hasilnya: substrat dokumentasi' },
    { id: 'risk',       ic: 'shield',  lbl: 'Risk Assessment',    rel: '¶8(c) — hal signifikan & RoMM menentukan apa yang wajib didokumentasikan' },
    { id: 'materiality',ic: 'target',  lbl: 'Materiality',        rel: '¶8(c) — ambang materialitas: dasar pertimbangan profesional & kesimpulan' },
    { id: 'reviewnotes',ic: 'mail',    lbl: 'Review Notes',       rel: '¶9(c)/¶10 — diskusi hal signifikan & clearance: jejak pereviu & tanggal' },
    { id: 'evidence',   ic: 'search2', lbl: 'Evaluasi Bukti',     rel: '¶8(b) · SA 500 — bukti audit per asersi membentuk isi dokumentasi' },
  ],
  down: [
    { id: 'dms',        ic: 'archive',     lbl: 'Manajemen Dokumen', rel: '¶14–16 — perakitan berkas final ≤60 hari, kunci WORM & retensi 10 thn' },
    { id: 'eqr',        ic: 'checkCircle', lbl: 'EQR Workflow',      rel: 'SA 220 / ISQM 1 — telaah mutu atas kecukupan dokumentasi sebelum opini' },
    { id: 'sad',        ic: 'scale',       lbl: 'SAD Ledger',        rel: '¶11 · SA 450 — pengecualian/inkonsistensi prosedur → akumulasi salah saji' },
    { id: 'opinion',    ic: 'gavel',       lbl: 'Audit Opinion',     rel: 'SA 700 — dokumentasi memadai sebagai fondasi kesimpulan & opini' },
    { id: 'audittrail', ic: 'lock',        lbl: 'Audit Trail',       rel: '¶16 — perubahan pasca-perakitan tercatat tamper-evident' },
  ],
};

Object.assign(window, { LINEAGE, ModuleLineage });

/* ============================================================
   Compliance & Kriptografi — lineage dua-arah (SSOT).
   Hulu: Document Mgmt (dokumen & hash), Evaluasi Bukti (berkas
   ter-hash), Alur Data (aturan integritas), Audit Trail (arus
   jejak hash-chain), Audit Opinion & Onboarding (e-signature).
   Hilir: Governance/ISQM, Retensi & Arsip, Matriks Kepatuhan.
   Modul ini TIDAK menyimpan data sendiri — seluruhnya ditarik
   dari sumber kebenaran tunggal di atas.
   ============================================================ */
LINEAGE.crypto = {
  std: 'Mutu, Risiko & Regulasi · Keamanan, Integritas & Kriptografi (ISQM 1 · ISO 27001 · SA 230)',
  up: [
    { id: 'dms',       ic: 'archive', lbl: 'Document Management', rel: 'Dokumen, versi & hash SHA-256 → register integritas (AES-256 / WORM)' },
    { id: 'evidence',  ic: 'search2', lbl: 'Evaluasi Bukti',      rel: 'Berkas bukti ter-hash → objek integritas terpantau' },
    { id: 'dataflow',  ic: 'link2',   lbl: 'Alur Data & Integritas', rel: 'Katalog aturan integritas → status kontrol kepatuhan' },
    { id: 'audittrail',ic: 'lock',    lbl: 'Audit Trail',         rel: 'Arus jejak tunggal → rantai-hash tamper-evident' },
    { id: 'opinion',   ic: 'gavel',   lbl: 'Audit Opinion',       rel: 'e-Signature opini & kertas kerja → sertifikat PrivyID' },
  ],
  down: [
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Bukti kontrol keamanan & integritas data (ISQM 1)' },
    { id: 'records',    ic: 'archive',  lbl: 'Retensi & Arsip',   rel: 'Imutabilitas WORM & legal hold → kebijakan retensi (SA 230)' },
    { id: 'compmatrix', ic: 'table',    lbl: 'Matriks Kepatuhan', rel: 'Ketertelusuran kontrol → standar profesi & regulasi' },
  ],
};

Object.assign(window, { LINEAGE });

/* ============================================================
   Pajak PPh 23 (Firm Backoffice) — lineage dua-arah (SSOT).
   Hulu: Pengadaan & Vendor (master + NPWP), AP/AR (faktur jasa),
   Governance (kebijakan pemotongan). Hilir: General Ledger (utang
   pajak 2-200), Pajak Firma (agregat PPh Pot/Put & SPT Masa),
   Anggaran & Arus Kas (pembayaran), Integrasi DJP Coretax (e-Bupot).
   ============================================================ */
LINEAGE.tax = {
  std: 'Firm Backoffice · PPh Pasal 23 (UU HPP · PMK 141 · e-Bupot Unifikasi)',
  up: [
    { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Master vendor & NPWP (BO.VENDORS) → identitas & tarif pemotongan' },
    { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Faktur jasa vendor (FIRM_AP) → DPP yang dipotong' },
    { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Belanja jasa firma → populasi objek PPh 23' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan pemotongan & kepatuhan perpajakan firma' },
  ],
  down: [
    { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'PPh 23 terutang → pos kontrol Utang Pajak 2-200' },
    { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Agregat PPh Pot/Put & e-Bupot → SPT Masa Unifikasi' },
    { id: 'treasury', ic: 'pulse', lbl: 'Anggaran & Arus Kas', rel: 'Setoran PPh 23 → proyeksi arus kas keluar' },
    { id: 'integrations', ic: 'link2', lbl: 'Integrasi & Data Eksternal', rel: 'e-Bupot & SPT Masa disinkronkan via DJP Coretax' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Perjalanan & Reimbursement — lineage dua-arah (SSOT).
   Hulu: HCM (pegawai/grade), Engagement (klien/lokasi), Scheduler
   (alokasi tim), Governance (kebijakan plafon), Procurement (vendor
   travel). Hilir: GL & Firm Finance (beban), Time & Budget (alokasi
   per perikatan), Payroll (PPh 21 kelebihan), Approvals (otorisasi).
   Semua menarik dari window.TRAVEL yang menurunkan satu angka.
   ============================================================ */
LINEAGE.travel = {
  std: 'Operasi Firma · Perjalanan Dinas & Reimbursement',
  up: [
    { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Pegawai & grade (AMS.STAFF) → kelas plafon per diem & transport' },
    { id: 'cockpit', ic: 'briefcase', lbl: 'Engagement Mgmt', rel: 'Perikatan, klien & kota klien → tujuan & lokasi fieldwork' },
    { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Alokasi tim ke perikatan → siapa berangkat ke mana' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan plafon (PER_DIEM) & tarif rute → entitlement' },
    { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Vendor travel V-033 → tiket & akomodasi fieldwork' },
  ],
  down: [
    { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Biaya perjalanan → akun kontrol beban (FIRM_COA)' },
    { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Beban langsung perikatan → terserap di P&L firma' },
    { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Alokasi biaya per perikatan → beban vs anggaran' },
    { id: 'payroll', ic: 'coins', lbl: 'Payroll & PPh 21', rel: 'Kelebihan per diem di atas plafon → objek PPh 21' },
    { id: 'approvals', ic: 'checkCircle', lbl: 'Approvals', rel: 'Approval perjalanan & klaim lewat plafon → otorisasi (ISQM)' },
    { id: 'firmops', ic: 'layers', lbl: 'Cockpit Operasi Firma', rel: 'Tren biaya → komposisi biaya operasi firma' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Lisensi & Perizinan — lineage dua-arah (SSOT).
   Hulu: HCM (AP holder), CPE/PPL (SKP), Independence (rotasi),
   Engagement/CRM (cakupan emiten), Governance (kebijakan mutu).
   Hilir: PPPK (pelaporan), Firm Finance (iuran→biaya), Cockpit
   Operasi (kalender kewajiban), Governance (pemantauan ISQM).
   ============================================================ */
LINEAGE.licensing = {
  std: 'Operasi Firma · Lisensi & Perizinan (PPPK · IAPI · OJK)',
  up: [
    { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Partner pemegang Izin AP (AMS.STAFF) → identitas & peran' },
    { id: 'cpe', ic: 'book', lbl: 'CPE / PPL Tracker', rel: 'SKP terstruktur & total (CPE_LOG) → kecukupan PPL izin AP' },
    { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Masa penugasan & batas rotasi AP → status kepatuhan' },
    { id: 'cockpit', ic: 'briefcase', lbl: 'Engagement Mgmt', rel: 'Perikatan klien emiten (listed) → dasar registrasi OJK' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan mutu & kompetensi (ISQM 1) → prasyarat izin' },
  ],
  down: [
    { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'Izin KAP & AP, PPL & rotasi → laporan tahunan regulator' },
    { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Iuran keanggotaan & perpanjangan → overhead di P&L' },
    { id: 'firmops', ic: 'layers', lbl: 'Cockpit Operasi Firma', rel: 'Tenggat perpanjangan → kalender kewajiban terpadu' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kepatuhan lisensi & PPL → pemantauan mutu firma' },
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Eligibilitas AP (emiten & rotasi) → penugasan EQR' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Prioritas P2 (gap analysis) — tiga modul yang tadinya pulau:
   Sanksi & Disiplin (hrcase), SOQM Operasional (soqm), SAK EP (sakep).
   Diberi dock "Keterkaitan Modul" dua-arah agar masuk ke graf lineage.
   ============================================================ */
LINEAGE.hrcase = {
  std: 'SDM & Kepatuhan · Sanksi & Disiplin (Kode Etik · ISQM 1)',
  up: [
    { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Master pegawai & jenjang → subjek perkara disiplin' },
    { id: 'ethics', ic: 'scale', lbl: 'Kode Etik & AML/PMPJ', rel: 'Temuan pelanggaran kode etik / PMPJ → pembukaan kasus' },
    { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Benturan kepentingan tak diungkap → dasar sanksi' },
    { id: 'performance', ic: 'target', lbl: 'Siklus Kinerja', rel: 'Eskalasi PIP / pelanggaran kinerja → tindakan disiplin' },
  ],
  down: [
    { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Catatan disiplin & status → berkas kepegawaian' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Rekap pelanggaran & sanksi → pemantauan budaya mutu (ISQM 1)' },
    { id: 'learning', ic: 'flask', lbl: 'Pelatihan & Kompetensi', rel: 'Sanksi → pelatihan remedial / etika wajib' },
  ],
};
LINEAGE.soqm = {
  std: 'Mutu, Risiko & Regulasi · SOQM Operasional (ISQM 1)',
  up: [
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan, tujuan & risiko mutu firma → dasar respons operasional' },
    { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Status independensi & rotasi → input pemantauan mutu' },
    { id: 'cpe', ic: 'book', lbl: 'CPE / PPL Tracker', rel: 'Kecukupan PPL & kompetensi → komponen sumber daya' },
  ],
  down: [
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Pemicu reviu mutu perikatan untuk perikatan berisiko tinggi' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Defisiensi & remediasi → evaluasi tata kelola mutu' },
    { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'Hasil pemantauan sistem mutu → laporan regulator' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Status pemenuhan SPM 1 / ISQM 1 → ketertelusuran' },
  ],
};
LINEAGE.sakep = {
  std: 'Akuntansi · SAK Entitas Privat (pengganti SAK ETAP)',
  up: [
    { id: 'kb', ic: 'book', lbl: 'Knowledge Base', rel: 'Metodologi & rujukan kerangka EP → basis penerapan' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Registri standar (kerangka pelaporan) → cakupan' },
    { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo akun klien → pos yang disusun menurut SAK EP' },
  ],
  down: [
    { id: 'fsgen', ic: 'report', lbl: 'Financial Statement Gen.', rel: 'Pemilihan kerangka EP → struktur & pengungkapan LK' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator', rel: 'Kerangka pelaporan berlaku → acuan opini auditor' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Penerapan kerangka → ketertelusuran kepatuhan' },
  ],
};
/* ============================================================
   Prioritas P3 (gap analysis) — simpul inti yang tadinya "sink"
   (hanya dirujuk) kini menaut balik ke hilir → dua-arah.
   Working Papers (SA 230/330) & Use of Expert (SA 620).
   ============================================================ */
LINEAGE.workpapers = {
  std: 'SA 230 / SA 330 · Kertas Kerja Audit',
  up: [
    { id: 'programme', ic: 'flask', lbl: 'Audit Programme', rel: 'Prosedur terinci → indeks & isi kertas kerja' },
    { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Respons atas RoMM → kertas kerja terarah' },
    { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Bukti audit terevaluasi → dilampirkan ke WP' },
    { id: 'internalaudit', ic: 'shield', lbl: 'Internal Audit', rel: 'Dokumentasi dasar penggunaan auditor internal' },
  ],
  down: [
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator', rel: 'Kesimpulan kertas kerja → dasar perumusan opini' },
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Berkas WP → cakupan reviu pengendalian mutu perikatan' },
    { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Eksepsi terdokumentasi → akumulasi salah saji' },
    { id: 'dms', ic: 'layers', lbl: 'Manajemen Dokumen', rel: 'Arsip final WP (SA 230) → retensi & DMS' },
  ],
};
LINEAGE.expert = {
  std: 'SA 620 · Penggunaan Pekerjaan Pakar Auditor',
  up: [
    { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Area kompleks/estimasi signifikan → kebutuhan pakar' },
    { id: 'materiality', ic: 'target', lbl: 'Materiality', rel: 'Signifikansi pos → keputusan melibatkan pakar' },
    { id: 'psak68', ic: 'layers', lbl: 'PSAK 68 · Nilai Wajar', rel: 'Pengukuran nilai wajar → pakar penilai independen' },
    { id: 'psak24', ic: 'users', lbl: 'PSAK 24 · Imbalan Kerja', rel: 'Liabilitas imbalan kerja → aktuaris' },
  ],
  down: [
    { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Hasil kerja pakar → bukti audit yang dievaluasi' },
    { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Lingkup, kompetensi & temuan pakar → dokumentasi WP' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator', rel: 'Kecukupan bukti pakar → pertimbangan opini' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Prioritas 2 — Halaman Standar Audit (SA) menaut balik.
   Reverse-index RELATED_SA: untuk tiap halaman SA, prosedur mana
   yang memenuhinya. Plus standar serumpun + tautan Matriks Kepatuhan.
   ============================================================ */

/* Grup yang berisi halaman SA (deep pages) */
const SA_GROUPS = new Set([
  'SA · Tanggung Jawab (200)', 'SA · Bukti Audit (500)',
  'SA · Pelaporan (700)', 'SA · Area Khusus & Perikatan',
]);

/* Reverse-index dari RELATED_SA (hanya entri yang punya `view` = id halaman SA) */
const SA_REVERSE = {};
(function () {
  const RS = window.RELATED_SA || {};
  Object.keys(RS).forEach(proc => (RS[proc] || []).forEach(r => {
    if (!r.view) return;
    const arr = SA_REVERSE[r.view] = SA_REVERSE[r.view] || [];
    if (!arr.some(x => x.module === proc)) arr.push({ module: proc, note: (r.title || r.code) + ' · ' + (r.phase || '') });
  }));
})();

/* Fallback kurasi untuk halaman SA tanpa entri RELATED_SA(view) */
const SA_FULFILLED_BY = {
  sa200: [{ module: 'strategy', note: 'Tujuan keseluruhan → strategi & pendekatan audit' }, { module: 'workpapers', note: 'Skeptisisme & pertimbangan profesional terdokumentasi' }],
  sa250: [{ module: 'icfr', note: 'Kepatuhan hukum & regulasi dalam pengendalian' }, { module: 'risk', note: 'Risiko ketidakpatuhan → RoMM' }],
  sa580: [{ module: 'opinion', note: 'Representasi tertulis sebagai prasyarat opini' }, { module: 'subsequent', note: 'Representasi mencakup peristiwa kemudian' }],
  sa720: [{ module: 'fsgen', note: 'Informasi lain dalam laporan tahunan' }, { module: 'opinion', note: 'Paragraf Informasi Lain pada laporan auditor' }],
  sa800: [{ module: 'opinion', note: 'Opini atas kerangka bertujuan khusus' }, { module: 'fsgen', note: 'Penyajian sesuai kerangka khusus' }],
  sa805: [{ module: 'opinion', note: 'Opini atas LK tunggal / elemen' }, { module: 'fsgen', note: 'Penyajian elemen LK' }],
  sa810: [{ module: 'opinion', note: 'Opini atas ringkasan LK' }, { module: 'fsgen', note: 'Penyusunan ringkasan dari LK auditan' }],
  spr2400: [{ module: 'review2400', note: 'Perikatan reviu LK historis (assurans terbatas)' }],
  spr2410: [{ module: 'review2400', note: 'Reviu informasi keuangan interim' }],
  sjah3000: [{ module: 'assurance', note: 'Perikatan asurans selain audit / reviu' }],
  sjah3400: [{ module: 'assurance', note: 'Pemeriksaan informasi keuangan prospektif' }],
  sjah3402: [{ module: 'serviceorg', note: 'Laporan pengendalian organisasi jasa' }],
  sjah3410: [{ module: 'assurance', note: 'Perikatan asurans atas Laporan Emisi GRK' }],
  sjah3420: [{ module: 'assurance', note: 'Asurans penyusunan informasi keuangan proforma (prospektus)' }],
};

function StandardLinkback({ moduleId }) {
  const meta = (window.MODULE_INDEX || {})[moduleId];
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  /* default COLLAPSE — bar keterkaitan standar tampil terlipat di semua modul */
  const [open, setOpen] = React.useState(false);
  if (!meta) return null;

  const isSAPage = SA_GROUPS.has(meta.group);
  const saRefs = (window.RELATED_SA || {})[moduleId] || [];

  /* Standar dari peta keterkaitan modul (LINEAGE.std) — menjangkau modul
     fungsional yang punya basis standar tapi tidak terdaftar di RELATED_SA
     (mis. risk → SA 315). Hanya dipakai bila std diawali kode standar resmi
     agar entri sisi-firma (mis. "ERP Firma · General Ledger") tidak ikut. */
  const linStd = (window.LINEAGE && window.LINEAGE[moduleId] && window.LINEAGE[moduleId].std) || '';
  const linIsStd = /^(SA|PSAK|ISA|ISAE|ISQM|SPR|SPM|SPAP|SJAH|SAK)\b/.test(linStd);

  /* Tampil untuk: (a) halaman SA — telusur balik prosedur; atau
     (b) modul fungsional yang menerapkan/merujuk standar audit. */
  if (!isSAPage && !saRefs.length && !linIsStd) return null;

  /* Daftar standar untuk modul fungsional: utamakan RELATED_SA (terstruktur &
     dapat dibuka), bila kosong turunkan dari LINEAGE.std (kode → Matriks). */
  let stdRefs = saRefs;
  if (!isSAPage && !stdRefs.length && linIsStd) {
    const parts = linStd.split(' · ');
    stdRefs = [{ code: parts[0], title: parts.slice(1).join(' · ') || meta.label, phase: '' }];
  }

  /* Label di kepala bar (terlihat saat collapse): kode/uraian standar. */
  const stdLabel = isSAPage ? meta.label
    : (linIsStd ? linStd : (saRefs.length ? saRefs.map(r => r.code).join(' · ') : meta.label));

  const openSA = (r) => {
    if (window.__amsOpenSA) window.__amsOpenSA({ ...r, fromModule: moduleId });
    else nav('compmatrix', { from: moduleId });
  };

  const ProcChip = ({ p }) => {
    const m = (window.MODULE_INDEX || {})[p.module] || { label: p.module, icon: 'doc' };
    const Ic = window.I && (window.I[m.icon] || window.I.doc);
    return (
      <button type="button" className="lin-chip" title={p.note + ' — buka ' + m.label}
        onClick={() => nav(p.module, { from: moduleId })} style={{ borderLeftColor: 'var(--navy)' }}>
        <span className="lin-ic" style={{ color: 'var(--navy)' }}>{Ic ? <Ic size={14} /> : null}</span>
        <span className="lin-txt"><span className="lin-lbl">{m.label}</span><span className="lin-rel">{p.note}</span></span>
        <span className="lin-go">{window.I ? <window.I.arrowRight size={12} /> : '→'}</span>
      </button>
    );
  };
  const SibChip = ({ s }) => {
    const Ic = window.I && (window.I[s.icon] || window.I.doc);
    return (
      <button type="button" className="lin-chip sib" title={'Buka ' + s.label}
        onClick={() => nav(s.id, { from: moduleId })} style={{ borderLeftColor: 'var(--teal)' }}>
        <span className="lin-ic" style={{ color: 'var(--teal)' }}>{Ic ? <Ic size={14} /> : null}</span>
        <span className="lin-txt"><span className="lin-lbl">{s.label}</span></span>
      </button>
    );
  };
  const StdChip = ({ r }) => {
    const Ic = window.I && window.I.shield;
    return (
      <button type="button" className="lin-chip" title={r.code + ' · ' + r.title + (r.view ? ' — buka rujukan standar' : ' — lihat di Matriks Kepatuhan')}
        onClick={() => openSA(r)} style={{ borderLeftColor: 'var(--navy)' }}>
        <span className="lin-ic" style={{ color: 'var(--navy)' }}>{Ic ? <Ic size={14} /> : null}</span>
        <span className="lin-txt"><span className="lin-lbl">{r.code}</span><span className="lin-rel">{r.title}{r.phase ? ' · ' + r.phase : ''}</span></span>
        <span className="lin-go">{window.I ? <window.I.arrowRight size={12} /> : '→'}</span>
      </button>
    );
  };

  const Header = (
    <button type="button" className="lin-head" onClick={() => setOpen(o => !o)} title={open ? 'Sembunyikan' : 'Tampilkan keterkaitan standar'}>
      {window.I ? <window.I.shield size={14} /> : null}
      <span className="lin-h-t">Keterkaitan Standar</span>
      <span className="lin-h-s">{stdLabel}</span>
      <span className="lin-h-c">ketertelusuran</span>
      {window.I ? <window.I.chevDown size={14} style={{ transform: open ? 'none' : 'rotate(180deg)', transition: '.15s', marginLeft: 'auto' }} /> : null}
    </button>
  );

  /* ---- (a) Halaman SA: telusur balik prosedur yang memenuhinya + standar serumpun ---- */
  if (isSAPage) {
    const fulfilled = SA_REVERSE[moduleId] || SA_FULFILLED_BY[moduleId] || [];
    const grp = (window.MODULES || []).find(g => g.group === meta.group);
    const siblings = grp ? grp.items.filter(i => i.id !== moduleId) : [];
    return (
      <div className={'lineage-dock sa' + (open ? '' : ' collapsed')}>
        {Header}
        {open && (
          <div className="lin-body">
            <div className="lin-col">
              <span className="lin-col-h proc">↳ Dipenuhi oleh prosedur{fulfilled.length ? ' · ' + fulfilled.length : ''}</span>
              <div className="lin-chips">
                {fulfilled.length ? fulfilled.map(p => <ProcChip key={p.module} p={p} />)
                  : <span className="lin-empty">Belum ada prosedur yang dipetakan — lihat Matriks Kepatuhan.</span>}
              </div>
            </div>
            <div className="lin-col">
              <span className="lin-col-h sib">Standar serumpun · {meta.group.replace(/^SA · /, '')}</span>
              <div className="lin-chips">
                <button type="button" className="lin-cta" onClick={() => nav('compmatrix', { from: moduleId })}>
                  {window.I ? <window.I.table size={13} /> : null} Lihat di Matriks Kepatuhan
                </button>
                {siblings.map(s => <SibChip key={s.id} s={s} />)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---- (b) Modul fungsional: standar yang diterapkan/dirujuk + ketertelusuran kepatuhan ---- */
  return (
    <div className={'lineage-dock sa' + (open ? '' : ' collapsed')}>
      {Header}
      {open && (
        <div className="lin-body">
          <div className="lin-col">
            <span className="lin-col-h proc">↳ Menerapkan / merujuk standar · {stdRefs.length}</span>
            <div className="lin-chips">{stdRefs.map(r => <StdChip key={r.code} r={r} />)}</div>
          </div>
          <div className="lin-col">
            <span className="lin-col-h sib">Ketertelusuran kepatuhan</span>
            <div className="lin-chips">
              <button type="button" className="lin-cta" onClick={() => nav('compmatrix', { from: moduleId })}>
                {window.I ? <window.I.table size={13} /> : null} Lihat di Matriks Kepatuhan
              </button>
              <button type="button" className="lin-chip sib" title="Buka Basis Pengetahuan Standar (SA/PSAK)"
                onClick={() => nav('kb', { from: moduleId })} style={{ borderLeftColor: 'var(--teal)' }}>
                <span className="lin-ic" style={{ color: 'var(--teal)' }}>{window.I ? <window.I.book size={14} /> : null}</span>
                <span className="lin-txt"><span className="lin-lbl">Basis Pengetahuan</span></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { LINEAGE, ModuleLineage, SA_REVERSE, SA_FULFILLED_BY, StandardLinkback });
