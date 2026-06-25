/* ============================================================
   Asseris — Keterkaitan Modul (lineage dua arah)
   Replikasi pola "Modul Terkait" PSAK ke modul tulang-punggung audit.
   Dirender global (app.jsx) sebagai dock bawah halaman; hanya muncul
   untuk modul yang terdaftar di LINEAGE. Navigasi memakai nav(id,{from})
   sehingga breadcrumb "kembali" & follow-workspace tetap bekerja.
   ============================================================ */

/* up   = Hulu   — modul SUMBER yang memberi masukan ke modul ini
   down = Hilir  — modul PENGGUNA keluaran/kesimpulan modul ini
   ic/lbl/rel mengikuti format kartu lineage PSAK. */
const LINEAGE: any = {
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

/* ============================================================
   Evaluasi modul (isu #5) — dock keterkaitan untuk modul TULANG-PUNGGUNG
   perikatan yang tadinya orphan (dirujuk sbg up/down oleh modul lain, tapi
   sendiri tak punya entri → tak menampilkan dock). WTB & Materiality node
   paling sentral. Arah: up=sumber masukan, down=pengguna keluaran. SSOT:
   angka dari WTB→AMS_CANON; status WP dari deriveWpStatus. ============================================================ */
const BACKBONE_LINEAGE = {
  wtb: { std: 'SA 500 · Working Trial Balance (SSOT angka)',
    up: [
      { id: 'integrations', ic: 'link2', lbl: 'Impor & Integrasi Data', rel: 'Saldo buku besar klien → neraca saldo (gerbang total-kontrol)' },
      { id: 'aje', ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Jurnal penyesuaian → saldo setelah audit (adjusted TB)' },
      { id: 'icfr', ic: 'sliders', lbl: 'Internal Control', rel: 'Keandalan pengendalian → keyakinan atas saldo buku' },
    ],
    down: [
      { id: 'materiality', ic: 'target', lbl: 'Materiality', rel: 'Tolok ukur (laba/aset/pendapatan) → penetapan materialitas' },
      { id: 'analytical', ic: 'trend', lbl: 'Analytical Review', rel: 'Saldo berjalan vs prior → prosedur analitis' },
      { id: 'jet', ic: 'flask', lbl: 'Journal Entry Testing', rel: 'Populasi jurnal buku besar → pengujian (SA 240)' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Saldo final → penyusunan laporan keuangan' },
    ] },
  materiality: { std: 'SA 320 · Materialitas',
    up: [
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Tolok ukur terpilih → basis perhitungan OM/PM' },
      { id: 'strategy', ic: 'doc', lbl: 'Strategy Memo', rel: 'Pemahaman entitas → pemilihan benchmark & persentase' },
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Penilaian risiko → materialitas pelaksanaan (PM)' },
    ],
    down: [
      { id: 'sampling', ic: 'dice', lbl: 'Sampling Engine', rel: 'PM & tolerable misstatement → ukuran sampel' },
      { id: 'analytical', ic: 'trend', lbl: 'Analytical Review', rel: 'Ambang investigasi fluktuasi (threshold)' },
      { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'PM & ambang sepele (clearly trivial) → evaluasi salah saji' },
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Lingkup & kedalaman prosedur' },
    ] },
  workpapers: { std: 'SA 230 / 330 · Kertas Kerja',
    up: [
      { id: 'programme', ic: 'flask', lbl: 'Audit Programme', rel: 'Prosedur terencana → eksekusi kertas kerja' },
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Matriks RoMM → respons & prosedur (SA 330)' },
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Lead schedule per akun signifikan' },
    ],
    down: [
      { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Hasil prosedur → kecukupan & ketepatan bukti' },
      { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Eksepsi pengujian → akumulasi salah saji (SA 450)' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Dokumentasi dasar simpulan → opini' },
    ] },
  aje: { std: 'SA 450 · Adjusting Entries (AJE)',
    up: [
      { id: 'jet', ic: 'flask', lbl: 'Journal Entry Testing', rel: 'Jurnal anomali teridentifikasi → usulan koreksi' },
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Temuan prosedur substantif → ayat penyesuaian' },
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Salah saji faktual pada saldo buku' },
    ],
    down: [
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'AJE diposting → saldo setelah audit (adjusted)' },
      { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Koreksi dilakukan/ditolak → daftar salah saji' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Angka final pasca-penyesuaian → LK' },
    ] },
  asersi: { std: 'SA 315 · Matriks Asersi',
    up: [
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'RoMM per asersi → relevansi asersi' },
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo & golongan transaksi signifikan → cakupan asersi' },
      { id: 'icfr', ic: 'sliders', lbl: 'Internal Control', rel: 'Pengendalian relevan per asersi' },
    ],
    down: [
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Asersi → prosedur yang menanggapi (coverage)' },
      { id: 'programme', ic: 'flask', lbl: 'Audit Programme', rel: 'Asersi belum ditanggapi → prosedur tambahan' },
      { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Kecukupan bukti per asersi' },
    ] },
  sampling: { std: 'SA 530 · Sampling Audit',
    up: [
      { id: 'materiality', ic: 'target', lbl: 'Materiality', rel: 'PM / tolerable misstatement → ukuran sampel' },
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Tingkat risiko → luas pengujian (extent)' },
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Populasi saldo/transaksi → kerangka sampel' },
    ],
    down: [
      { id: 'confirm', ic: 'mail', lbl: 'Confirmation Hub', rel: 'Pemilihan item & ukuran sampel konfirmasi' },
      { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Hasil uji sampel → proyeksi ke populasi' },
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Dokumentasi seleksi & evaluasi sampel' },
    ] },
  diagnostic: { std: 'Diagnostik Audit (Benford · book-tax · sintesis)',
    up: [
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo & rasio → uji book-tax & anomali' },
      { id: 'jet', ic: 'flask', lbl: 'Journal Entry Testing', rel: 'Populasi jurnal → uji Benford & pola' },
      { id: 'forensic', ic: 'water', lbl: 'Forensic Cash Flow', rel: 'Arus kas forensik → indikator tekanan' },
    ],
    down: [
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Temuan diagnostik → risiko baru/terkonfirmasi' },
      { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Sinyal deterministik → prosedur lanjutan' },
      { id: 'aje', ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Salah saji terindikasi → usulan koreksi' },
    ] },
  fsgen: { std: 'SA 700 · Financial Statement Generator',
    up: [
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo setelah audit → muka laporan' },
      { id: 'aje', ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Penyesuaian → angka final LK' },
      { id: 'psak1', ic: 'report', lbl: 'PSAK 1 · Penyajian LK', rel: 'Kerangka penyajian & klasifikasi' },
    ],
    down: [
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Komponen LK → item pengungkapan wajib (CALK)' },
      { id: 'analytical', ic: 'trend', lbl: 'Analytical Review', rel: 'Angka LK & rasio → reviu menyeluruh akhir' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'LK final → dasar opini & paket pelaporan' },
    ] },
  disclosure: { std: 'SA 700 · Daftar-Uji Pengungkapan (CALK)',
    up: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Komponen LK → item pengungkapan wajib' },
      { id: 'psak1', ic: 'report', lbl: 'PSAK 1 · Penyajian LK', rel: 'Persyaratan penyajian & pengungkapan' },
      { id: 'related', ic: 'link2', lbl: 'Related Parties', rel: 'Pihak berelasi → pengungkapan (PSAK 7 / SA 550)' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Pengungkapan lengkap → CALK final' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Kelengkapan pengungkapan → kewajaran penyajian' },
    ] },
  mgmtletter: { std: 'SA 260 / 265 · Management Letter',
    up: [
      { id: 'icfr', ic: 'sliders', lbl: 'Internal Control', rel: 'Defisiensi signifikan → komunikasi (SA 265)' },
      { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Salah saji tak dikoreksi → komunikasi ke manajemen' },
      { id: 'goingconcern', ic: 'pulse', lbl: 'Going Concern', rel: 'Indikator & rencana mitigasi → komunikasi' },
    ],
    down: [
      { id: 'auditcomm', ic: 'group', lbl: 'Komite Audit', rel: 'Hal tata kelola → komunikasi TCWG (SA 260)' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Defisiensi/temuan → pertimbangan pelaporan' },
    ] },
  related: { std: 'SA 550 · Pihak Berelasi',
    up: [
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Risiko transaksi pihak berelasi → fokus pengujian' },
      { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo & transaksi → identifikasi pihak berelasi' },
      { id: 'icfr', ic: 'sliders', lbl: 'Internal Control', rel: 'Kontrol identifikasi & otorisasi transaksi berelasi' },
    ],
    down: [
      { id: 'confirm', ic: 'mail', lbl: 'Confirmation Hub', rel: 'Konfirmasi syarat & saldo pihak berelasi' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Pengungkapan pihak berelasi (PSAK 7)' },
      { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Salah saji transaksi berelasi → akumulasi' },
    ] },
  groupaudit: { std: 'SA 600 · Audit Grup (Komponen)',
    up: [
      { id: 'psak65', ic: 'building', lbl: 'PSAK 65 · Konsolidasian', rel: 'Struktur grup & komponen → lingkup audit grup' },
      { id: 'materiality', ic: 'target', lbl: 'Materiality', rel: 'Materialitas komponen' },
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Risiko tingkat komponen' },
    ],
    down: [
      { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Paket pelaporan komponen → bukti audit grup' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Konsolidasi → LK grup' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Kecukupan bukti komponen → opini grup' },
    ] },
  expert: { std: 'SA 620 · Penggunaan Pakar Auditor',
    up: [
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Area kompleks (estimasi/valuasi) → kebutuhan pakar' },
      { id: 'psak68', ic: 'layers', lbl: 'PSAK 68 · Nilai Wajar', rel: 'Valuasi nilai wajar → pekerjaan pakar (KJPP)' },
      { id: 'psak24', ic: 'users', lbl: 'PSAK 24 · Imbalan Kerja', rel: 'Asumsi aktuaria → pakar aktuaris' },
    ],
    down: [
      { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Hasil pakar → kecukupan & ketepatan bukti' },
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Dokumentasi evaluasi & penggunaan pakar' },
      { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Selisih estimasi vs pakar → salah saji' },
    ] },
  serviceorg: { std: 'SA 402 · Organisasi Jasa',
    up: [
      { id: 'icfr', ic: 'sliders', lbl: 'Internal Control', rel: 'Proses yang di-outsource → pemahaman kontrol' },
      { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Risiko atas proses di organisasi jasa' },
    ],
    down: [
      { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Laporan ISAE 3402 (Type 1/2) → bukti kontrol' },
      { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'CUEC & dampak → dokumentasi' },
    ] },
};
Object.assign(LINEAGE, BACKBONE_LINEAGE);

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


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { LINEAGE };
