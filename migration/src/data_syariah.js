/* ============================================================
   NeoSuite AMS — SAK Syariah · PSAK 101–112
   ------------------------------------------------------------
   MESIN HITUNG / SUMBER KEBENARAN TUNGGAL untuk modul Akuntansi
   Syariah. Mengaugmentasi AMS_CANON (objek modul) dengan syariah() —
   seluruh tab & Kertas Kerja menarik angka dari SATU fungsi ini.

   Konteks perikatan: PT Bank Syariah Amanah Nusantara Tbk (Bank
   Umum Syariah, OJK). Kerangka pelaporan: SAK Syariah (DSAS-IAI).

   Cakupan standar:
     PSAK 101 — Penyajian Laporan Keuangan Syariah
     PSAK 102 — Akuntansi Murabahah (jual-beli)
     PSAK 103 — Akuntansi Salam (jual-beli pesanan)
     PSAK 104 — Akuntansi Istishna' (pesanan manufaktur)
     PSAK 105 — Akuntansi Mudharabah (bagi hasil)
     PSAK 106 — Akuntansi Musyarakah (kemitraan)
     PSAK 107 — Akuntansi Ijarah (sewa)
     PSAK 108 — Transaksi Asuransi Syariah (takaful · tabarru')
     PSAK 109 — Akuntansi Zakat dan Infak/Sedekah
     PSAK 110 — Akuntansi Sukuk
     PSAK 111 — Akuntansi Wa'd (janji)
     PSAK 112 — Akuntansi Wakaf

   Semua nilai dalam Rp JUTA. Konsisten dgn fmt()/rp() id-ID.
   ============================================================ */
import { AMS_CANON } from './canon';

(function () {
  'use strict';
  const R = Math.round;

  /* ---- Pembiayaan per akad (aset produktif), Rp juta ---- */
  /* pokok = nilai tercatat pembiayaan; marjin = marjin/pendapatan ditangguhkan
     basis = dasar pengakuan pendapatan; kel = kelompok akad                  */
  const AKAD = [
    { id: 'murabahah', psak: 'PSAK 102', akad: 'Murabahah', kel: 'Jual-beli', pokok: 2450000, marjin: 312000,
      basis: 'Marjin diakui proporsional selama masa akad (¶24)',
      sajian: 'Piutang murabahah neto = bruto − marjin tangguhan − CKPN',
      audit: 'Uji eksistensi aset yang diperjualbelikan & ketepatan amortisasi marjin; pastikan bukan pembiayaan berbunga terselubung.' },
    { id: 'salam', psak: 'PSAK 103', akad: 'Salam', kel: 'Jual-beli pesanan', pokok: 45000, marjin: 0,
      basis: 'Aset salam diakui sebesar modal yang dibayarkan (¶11)',
      sajian: 'Piutang salam (modal usaha salam) — barang diserahkan kemudian',
      audit: 'Verifikasi spesifikasi barang pesanan & saat penyerahan; uji salam paralel bila ada.' },
    { id: 'istishna', psak: 'PSAK 104', akad: "Istishna'", kel: 'Jual-beli pesanan', pokok: 120000, marjin: 18000,
      basis: 'Pendapatan metode persentase penyelesaian (¶18)',
      sajian: 'Piutang istishna & termin; aset istishna dalam penyelesaian',
      audit: 'Uji pengukuran persentase penyelesaian & ketepatan pengakuan termin.' },
    { id: 'mudharabah', psak: 'PSAK 105', akad: 'Mudharabah', kel: 'Bagi hasil', pokok: 680000, marjin: 0,
      basis: 'Bagi hasil diakui saat hak menerima timbul (¶20); rugi ditanggung pemilik dana',
      sajian: 'Pembiayaan mudharabah sebesar kas/aset nonkas yang diserahkan',
      audit: 'Telaah laporan bagi hasil mudharib & dasar nisbah; rugi non-kelalaian bukan beban mudharib.' },
    { id: 'musyarakah', psak: 'PSAK 106', akad: 'Musyarakah', kel: 'Bagi hasil', pokok: 1120000, marjin: 0,
      basis: 'Laba dibagi sesuai nisbah; rugi sesuai porsi modal (¶24-27)',
      sajian: 'Pembiayaan musyarakah; musyarakah menurun (mutanaqishah) bila ada',
      audit: 'Verifikasi porsi modal mitra, dasar pembagian laba, & pengembalian modal musyarakah menurun.' },
    { id: 'ijarah', psak: 'PSAK 107', akad: 'Ijarah / IMBT', kel: 'Sewa', pokok: 340000, marjin: 0,
      basis: 'Pendapatan sewa diakui selama masa akad (¶14)',
      sajian: 'Aset ijarah & pembiayaan ijarah; IMBT = opsi pengalihan kepemilikan',
      audit: 'Uji penyusutan aset ijarah & pengakuan pengalihan pada IMBT (hibah/jual).' },
  ];

  const CKPN_PEMBIAYAAN = 95000;   // penyisihan kerugian penurunan nilai

  /* ---- Dana Syirkah Temporer (antara liabilitas & ekuitas) ---- */
  const DST = [
    { id: 'tabungan', label: 'Tabungan Mudharabah', amt: 1850000, nisbah: '40:60' },
    { id: 'deposito', label: 'Deposito Mudharabah', amt: 2600000, nisbah: '55:45' },
  ];

  /* ---- Bagi hasil (revenue sharing) periode berjalan, Rp juta ---- */
  const BAGI_HASIL = {
    pendapatanPengelolaan: 485000,   // pendapatan pengelolaan dana oleh bank (mudharib)
    hakPihakKetiga: 198000,          // hak pemilik DST atas bagi hasil
    hakBank: 287000,                 // bagian bank setelah bagi hasil
    pendapatanMargin: 298000,        // marjin murabahah/istishna diakui
    pendapatanSewa: 41000,           // ijarah
  };

  /* ---- PSAK 109 · Laporan Sumber & Penyaluran Dana Zakat ---- */
  const ZAKAT = {
    sumber: [
      { k: 'Zakat dari entitas (bank)', v: 8200 },
      { k: 'Zakat dari pihak luar (nasabah & pegawai)', v: 4300 },
    ],
    penyaluran: [
      { k: 'Fakir & Miskin', v: 6800 },
      { k: 'Amil', v: 1250 },
      { k: 'Muallaf', v: 400 },
      { k: 'Riqab', v: 0 },
      { k: 'Gharimin (terlilit utang)', v: 850 },
      { k: 'Fi Sabilillah', v: 1500 },
      { k: 'Ibnu Sabil', v: 400 },
    ],
    saldoAwal: 3500,
  };

  /* ---- Dana Kebajikan (Qardhul Hasan) — termasuk PEMURNIAN pendapatan ---- */
  const KEBAJIKAN = {
    sumber: [
      { k: 'Infak & sedekah', v: 1400, halal: true },
      { k: "Denda (ta'zir keterlambatan)", v: 320, halal: false },
      { k: 'Pendapatan non-halal (jasa giro bank konvensional)', v: 850, halal: false, purif: true },
      { k: 'Pengembalian dana kebajikan produktif', v: 180, halal: true },
    ],
    penggunaan: [
      { k: 'Dana kebajikan produktif (qardhul hasan)', v: 1600 },
      { k: 'Sumbangan & bantuan sosial', v: 500 },
    ],
    saldoAwal: 500,
  };

  /* ---- PSAK 110/112/108 — coverage tambahan ---- */
  const SUKUK = [
    { id: 'terbit', label: 'Sukuk Ijarah Diterbitkan', psak: 'PSAK 110', sisi: 'Liabilitas', amt: 500000,
      note: 'Diukur pada biaya perolehan diamortisasi; imbalan = ujrah/fee ijarah, bukan bunga.' },
    { id: 'investasi', label: 'Investasi Sukuk (dimiliki)', psak: 'PSAK 110', sisi: 'Aset', amt: 320000,
      note: 'Diklasifikasi biaya perolehan atau nilai wajar sesuai model & tujuan.' },
  ];
  const WAKAF = { aset: 28000, note: 'Bank sebagai nazhir wakaf uang (CWLS) — dikelola terpisah dari aset bank (PSAK 112).' };
  const TAKAFUL = { tabarru: 0, applicable: false,
    note: 'PSAK 108 (asuransi syariah/tabarru\') tidak berlaku langsung bagi bank; relevan bila terdapat entitas anak takaful. Disajikan sebagai rujukan kerangka.' };

  /* ---- Dewan Pengawas Syariah (DPS) — kepatuhan syariah ---- */
  const DPS = {
    anggota: 3,
    opini: 'Sesuai prinsip syariah dengan catatan',
    temuan: [
      { t: 'Pendapatan non-halal jasa giro telah dipisahkan ke dana kebajikan (pemurnian)', ok: true },
      { t: 'Akad murabahah: bukti kepemilikan aset sebelum penjualan lengkap', ok: true },
      { t: 'Dua akad mudharabah belum melampirkan laporan bagi hasil mutakhir', ok: false },
      { t: 'Nisbah bagi hasil DST sesuai akad pembukaan rekening', ok: true },
    ],
  };

  /* ---- Laporan keuangan syariah khas PSAK 101 (di luar format komersial) ---- */
  const LK_KHAS = [
    { id: 'zakat', label: 'Laporan Sumber & Penyaluran Dana Zakat', psak: 'PSAK 101 ¶11 · PSAK 109', khas: true },
    { id: 'kebajikan', label: 'Laporan Sumber & Penggunaan Dana Kebajikan', psak: 'PSAK 101 ¶11', khas: true },
    { id: 'rekonbagihasil', label: 'Laporan Rekonsiliasi Pendapatan & Bagi Hasil', psak: 'PSAK 101', khas: true },
    { id: 'neraca', label: 'Laporan Posisi Keuangan (memuat Dana Syirkah Temporer)', psak: 'PSAK 101 ¶9', khas: false },
    { id: 'labarugi', label: 'Laporan Laba Rugi & Penghasilan Komprehensif', psak: 'PSAK 101', khas: false },
    { id: 'aruskas', label: 'Laporan Arus Kas', psak: 'PSAK 101 · PSAK 2', khas: false },
    { id: 'ekuitas', label: 'Laporan Perubahan Ekuitas', psak: 'PSAK 101', khas: false },
  ];

  /* ---- Prosedur audit entitas syariah (SA + kepatuhan syariah) ---- */
  const PROC = [
    { ref: 'SA 250', t: 'Pahami kerangka regulasi syariah (POJK perbankan syariah, fatwa DSN-MUI) & dampak kepatuhan' },
    { ref: 'PSAK 102', t: 'Uji substansi akad murabahah — kepemilikan aset oleh bank sebelum dijual ke nasabah' },
    { ref: 'PSAK 105/106', t: 'Telaah dasar nisbah & laporan bagi hasil mudharabah/musyarakah; rugi non-kelalaian' },
    { ref: 'PSAK 107', t: 'Uji pengakuan pendapatan ijarah & pengalihan kepemilikan pada IMBT' },
    { ref: 'PSAK 101', t: 'Evaluasi penyajian Dana Syirkah Temporer (bukan liabilitas, bukan ekuitas)' },
    { ref: 'PSAK 109', t: 'Uji kelengkapan sumber & penyaluran dana zakat ke 8 asnaf serta saldo dana' },
    { ref: 'Pemurnian', t: 'Verifikasi identifikasi & pemisahan pendapatan non-halal ke dana kebajikan' },
    { ref: 'SA 620', t: 'Pertimbangkan penggunaan pekerjaan Dewan Pengawas Syariah (DPS) sebagai pakar' },
    { ref: 'SA 540', t: 'Uji estimasi penyisihan kerugian (CKPN) pembiayaan per akad' },
    { ref: 'PSAK 110', t: 'Telaah klasifikasi & pengukuran sukuk (diterbitkan & investasi)' },
    { ref: 'SA 500', t: 'Uji kelengkapan & akurasi data akad sebagai input penyajian' },
    { ref: 'PSAK 101', t: 'Telaah kecukupan pengungkapan kepatuhan syariah & opini DPS dalam CALK' },
  ];

  /* ---- Keterkaitan kertas kerja (lineage) ---- */
  const UPSTREAM = [
    { id: 'evidence', ic: 'book',    lbl: 'Opini Dewan Pengawas Syariah (DPS)', rel: 'Pernyataan kepatuhan syariah atas produk & akad — bukti pakar' },
    { id: 'icfr',     ic: 'shield',  lbl: 'Internal Control',                   rel: 'Kontrol akad, dokumentasi syariah & pemisahan pendapatan' },
    { id: 'wtb',      ic: 'table',   lbl: 'Working Trial Balance',              rel: 'Saldo pembiayaan, DST, dana zakat & dana kebajikan' },
  ];
  const DOWNSTREAM = [
    { id: 'psak71',  ic: 'coins',   lbl: 'PSAK 71 · Penurunan Nilai',  rel: 'CKPN pembiayaan per akad → kerugian kredit ekspektasian' },
    { id: 'psak72',  ic: 'receipt', lbl: 'Pengakuan Pendapatan',       rel: 'Marjin, bagi hasil & ujrah → pola pengakuan pendapatan' },
    { id: 'fsgen',   ic: 'report',  lbl: 'FS Generator',               rel: 'Penyajian LK syariah & laporan dana zakat/kebajikan → LK' },
    { id: 'sad',     ic: 'scale',   lbl: 'SAD Ledger (SA 450)',        rel: 'Selisih pengakuan akad & pemurnian → akumulasi salah saji' },
    { id: 'opinion', ic: 'gavel',   lbl: 'Opini & KAM (SA 701)',       rel: 'Kepatuhan syariah & valuasi akad → kandidat Hal Audit Utama' },
  ];

  /* ============================================================
     syariah() — agregator kanonik. Sumber tunggal untuk view.
     ============================================================ */
  function syariah() {
    const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

    /* pembiayaan */
    const akad = AKAD.map(a => ({ ...a, neto: a.pokok - a.marjin }));
    const pembiayaanBruto = sum(akad, a => a.pokok);
    const marjinTangguhan = sum(akad, a => a.marjin);
    const pembiayaanNeto = pembiayaanBruto - CKPN_PEMBIAYAAN;
    const byKel = ['Jual-beli', 'Jual-beli pesanan', 'Bagi hasil', 'Sewa'].map(k => ({
      kel: k, amt: sum(akad.filter(a => a.kel === k), a => a.pokok),
    })).filter(x => x.amt > 0);

    /* dana syirkah temporer */
    const dstTotal = sum(DST, d => d.amt);

    /* zakat */
    const zakatSumber = sum(ZAKAT.sumber, x => x.v);
    const zakatSalur = sum(ZAKAT.penyaluran, x => x.v);
    const zakatKenaikan = zakatSumber - zakatSalur;
    const zakatSaldo = ZAKAT.saldoAwal + zakatKenaikan;

    /* dana kebajikan */
    const kebSumber = sum(KEBAJIKAN.sumber, x => x.v);
    const kebPakai = sum(KEBAJIKAN.penggunaan, x => x.v);
    const kebKenaikan = kebSumber - kebPakai;
    const kebSaldo = KEBAJIKAN.saldoAwal + kebKenaikan;
    const nonHalal = sum(KEBAJIKAN.sumber.filter(x => !x.halal), x => x.v);  // total pemurnian
    const purif = sum(KEBAJIKAN.sumber.filter(x => x.purif), x => x.v);      // murni pendapatan non-halal

    /* sukuk */
    const sukukAset = sum(SUKUK.filter(s => s.sisi === 'Aset'), s => s.amt);
    const sukukLiab = sum(SUKUK.filter(s => s.sisi === 'Liabilitas'), s => s.amt);

    /* DPS */
    const dpsOk = DPS.temuan.filter(t => t.ok).length;
    const dpsPct = Math.round(dpsOk / DPS.temuan.length * 100);

    return {
      client: { name: 'PT Bank Syariah Amanah Nusantara Tbk', npwp: '01.557.882.3-051.000', sector: 'Bank Umum Syariah (OJK)' },
      asof: '31 Desember 2025', framework: 'SAK Syariah (DSAS-IAI)',
      akad, byKel, pembiayaanBruto, marjinTangguhan, pembiayaanNeto, ckpn: CKPN_PEMBIAYAAN,
      dst: DST, dstTotal,
      bagiHasil: BAGI_HASIL,
      zakat: ZAKAT, zakatSumber, zakatSalur, zakatKenaikan, zakatSaldo,
      kebajikan: KEBAJIKAN, kebSumber, kebPakai, kebKenaikan, kebSaldo, nonHalal, purif,
      sukuk: SUKUK, sukukAset, sukukLiab, wakaf: WAKAF, takaful: TAKAFUL,
      dps: DPS, dpsOk, dpsPct,
      lkKhas: LK_KHAS, proc: PROC,
      upstream: UPSTREAM, downstream: DOWNSTREAM,
    };
  }

  AMS_CANON.syariah = syariah;
  AMS_CANON.SYARIAH_AKAD = AKAD;
})();
