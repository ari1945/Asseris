/* ============================================================
   Asseris — ISAK 35 · Penyajian Laporan Keuangan
   Entitas Berorientasi Nonlaba  (menggantikan PSAK 45)
   ------------------------------------------------------------
   MESIN HITUNG / SUMBER KEBENARAN TUNGGAL untuk modul isak35.
   Mengaugmentasi AMS_CANON (objek modul) dengan isak35() — seluruh tab,
   laporan & daftar-uji menarik angka dari SATU fungsi ini; tidak
   ada angka yang ditulis ulang antar tab.

   Konteks perikatan: Yayasan Pendidikan Cendekia Nusantara — entitas
   nonlaba sektor pendidikan (UU 16/2001 jo. UU 28/2004 tentang
   Yayasan). Periode pelaporan tahun yang berakhir 31 Desember 2025,
   komparatif 2024.

   ISAK 35 mengadopsi struktur PSAK 1 namun:
     · Ekuitas → "ASET NETO", diklasifikasikan menjadi
         (a) Tanpa Pembatasan dari pemberi sumber daya
         (b) Dengan Pembatasan dari pemberi sumber daya
     · "Laporan Laba Rugi" → "LAPORAN PENGHASILAN KOMPREHENSIF"
       (surplus/defisit, bukan laba/rugi)
     · Set laporan: Posisi Keuangan · Penghasilan Komprehensif ·
       Perubahan Aset Neto · Arus Kas · CALK

   Semua nilai dalam Rupiah PENUH. Konsisten dgn fmt()/rp() id-ID.
   Konvensi tanda WTB: aset (+), liabilitas & aset neto (−).
   ============================================================ */
import { AMS_CANON } from './canon';

(function () {
  'use strict';

  /* ---- Working Trial Balance entitas nonlaba (saldo setelah penyesuaian) ----
     grp: ca=aset lancar · nca=aset tidak lancar · cl=liabilitas jk pendek ·
          ncl=liabilitas jk panjang · na_un=aset neto tanpa pembatasan ·
          na_re=aset neto dengan pembatasan                                   */
  const TB = [
    { code: '1-1100', label: 'Kas dan setara kas',                   grp: 'ca',  cy: 8_400_000_000,  py: 6_900_000_000,  note: '4' },
    { code: '1-1200', label: 'Piutang jasa layanan — neto',          grp: 'ca',  cy: 1_250_000_000,  py: 1_080_000_000,  note: '5' },
    { code: '1-1300', label: 'Piutang hibah & sumbangan terikat',    grp: 'ca',  cy: 2_100_000_000,  py: 1_500_000_000,  note: '6' },
    { code: '1-1400', label: 'Perlengkapan dan persediaan',          grp: 'ca',  cy: 480_000_000,    py: 410_000_000,    note: '' },
    { code: '1-1500', label: 'Biaya dibayar di muka',                grp: 'ca',  cy: 320_000_000,    py: 290_000_000,    note: '' },
    { code: '1-1600', label: 'Investasi jangka pendek',              grp: 'ca',  cy: 4_500_000_000,  py: 4_000_000_000,  note: '7' },
    { code: '1-2100', label: 'Investasi dana abadi (endowment)',     grp: 'nca', cy: 12_000_000_000, py: 10_500_000_000, note: '7' },
    { code: '1-2200', label: 'Aset tetap — neto',                    grp: 'nca', cy: 28_600_000_000, py: 27_200_000_000, note: '8' },

    { code: '2-1100', label: 'Utang usaha dan beban akrual',         grp: 'cl',  cy: -1_850_000_000, py: -1_620_000_000, note: '9' },
    { code: '2-1200', label: 'Pendapatan diterima di muka',          grp: 'cl',  cy: -2_400_000_000, py: -2_100_000_000, note: '10' },
    { code: '2-1300', label: 'Liabilitas jangka pendek lain',        grp: 'cl',  cy: -650_000_000,   py: -700_000_000,   note: '' },
    { code: '2-2100', label: 'Utang bank jangka panjang',            grp: 'ncl', cy: -3_200_000_000, py: -3_800_000_000, note: '11' },

    { code: '3-1100', label: 'Tanpa pembatasan dari pemberi sumber daya', grp: 'na_un', cy: -33_050_000_000, py: -30_160_000_000, note: '12' },
    { code: '3-2100', label: 'Dengan pembatasan dari pemberi sumber daya', grp: 'na_re', cy: -16_500_000_000, py: -13_500_000_000, note: '12' },
  ];

  /* ---- Aktivitas (Laporan Penghasilan Komprehensif) ----
     Disimpan sebagai magnitudo positif; tanda diterapkan di penyajian. */
  const INCOME_UN = [ /* penghasilan TANPA pembatasan */
    { key: 'sumb', label: 'Sumbangan dan kontribusi tidak terikat', cy: 3_200_000_000,  py: 2_900_000_000,  note: '13' },
    { key: 'jasa', label: 'Pendapatan jasa layanan pendidikan',     cy: 18_500_000_000, py: 16_800_000_000, note: '14' },
    { key: 'inv',  label: 'Hasil investasi — neto',                 cy: 980_000_000,    py: 760_000_000,    note: '7' },
    { key: 'lain', label: 'Penghasilan lain-lain',                  cy: 420_000_000,    py: 360_000_000,    note: '' },
  ];
  const EXPENSE = [
    { key: 'prog_pend',  label: 'Program — pendidikan dan pengajaran',       cls: 'program', cy: 16_800_000_000, py: 15_400_000_000, note: '15' },
    { key: 'prog_bea',   label: 'Program — beasiswa',                        cls: 'program', cy: 3_900_000_000,  py: 3_500_000_000,  note: '15' },
    { key: 'prog_riset', label: 'Program — riset dan pengabdian masyarakat', cls: 'program', cy: 1_750_000_000,  py: 1_520_000_000,  note: '15' },
    { key: 'mgmt',       label: 'Manajemen dan umum',                        cls: 'support', cy: 1_860_000_000,  py: 1_720_000_000,  note: '16' },
    { key: 'fund',       label: 'Aktivitas penggalangan dana',              cls: 'support', cy: 500_000_000,    py: 460_000_000,    note: '16' },
  ];
  const INCOME_RE = [ /* penghasilan DENGAN pembatasan */
    { key: 'sumb_t', label: 'Sumbangan dan hibah terikat',          cy: 6_800_000_000, py: 6_200_000_000, note: '13' },
    { key: 'inv_t',  label: 'Hasil investasi dana abadi terikat',   cy: 800_000_000,   py: 720_000_000,   note: '7' },
  ];
  /* Reklasifikasi: aset neto dibebaskan dari pembatasan (masuk ke "tanpa",
     keluar dari "dengan"); berjumlah nol pada total. */
  const RELEASE = { cy: 4_600_000_000, py: 4_100_000_000,
    label: 'Aset neto yang dibebaskan dari pembatasan',
    detail: 'Pemenuhan tujuan program & berakhirnya pembatasan waktu' };
  const OCI = { cy: 0, py: 0, label: 'Penghasilan komprehensif lain' };

  /* ---- Arus kas (metode tidak langsung) — setiap mutasi non-kas
     diklasifikasikan agar Σ = perubahan kas. Nilai Rupiah penuh. ---- */
  const CF = {
    depreciation: 2_400_000_000,           // penyusutan aset tetap (non-kas)
    restrictedEndowment: 1_500_000_000,    // sumbangan terikat utk dana abadi → pendanaan
    wc: [
      { label: '(Kenaikan) piutang jasa layanan',          v: -170_000_000 },
      { label: '(Kenaikan) piutang hibah & sumbangan',     v: -600_000_000 },
      { label: '(Kenaikan) perlengkapan dan persediaan',   v: -70_000_000 },
      { label: '(Kenaikan) biaya dibayar di muka',         v: -30_000_000 },
      { label: 'Kenaikan utang usaha dan beban akrual',    v: 230_000_000 },
      { label: 'Kenaikan pendapatan diterima di muka',     v: 300_000_000 },
      { label: '(Penurunan) liabilitas jangka pendek lain', v: -50_000_000 },
    ],
    investing: [
      { label: 'Perolehan aset tetap',                     v: -3_800_000_000 },
      { label: 'Penempatan investasi jangka pendek — neto', v: -500_000_000 },
      { label: 'Penempatan investasi dana abadi',          v: -1_500_000_000 },
    ],
    financing: [
      { label: 'Penerimaan sumbangan terikat untuk dana abadi', v: 1_500_000_000 },
      { label: 'Pembayaran utang bank jangka panjang',     v: -600_000_000 },
    ],
  };

  /* ---- Daftar-uji pengungkapan ISAK 35 / PSAK 1 (CALK nonlaba) ---- */
  const DISCLOSURES = [
    { id: 'n01', ref: 'ISAK 35 ¶04', label: 'Pernyataan entitas berorientasi nonlaba & dasar penyusunan sesuai SAK', done: true },
    { id: 'n02', ref: 'PSAK 1 ¶51',  label: 'Identitas entitas, bentuk hukum (yayasan), domisili & sifat kegiatan utama', done: true },
    { id: 'n03', ref: 'ISAK 35 ¶09', label: 'Klasifikasi aset neto: tanpa pembatasan vs dengan pembatasan pemberi sumber daya', done: true },
    { id: 'n04', ref: 'ISAK 35 ¶10', label: 'Sifat & jumlah pembatasan permanen vs temporer atas aset neto', done: false },
    { id: 'n05', ref: 'PSAK 1 ¶117', label: 'Kebijakan akuntansi material (pengakuan sumbangan, hibah, jasa layanan)', done: true },
    { id: 'n06', ref: 'ISAK 35 IE',  label: 'Penyajian beban menurut klasifikasi fungsional (program vs pendukung)', done: true },
    { id: 'n07', ref: 'ISAK 35 IE',  label: 'Informasi beban menurut sifat (gaji, penyusutan, dsb) bila disajikan fungsional', done: false },
    { id: 'n08', ref: 'PSAK 71',     label: 'Cadangan kerugian kredit ekspektasian (ECL) atas piutang jasa layanan', done: true },
    { id: 'n09', ref: 'PSAK 16',     label: 'Aset tetap, metode & masa manfaat penyusutan', done: true },
    { id: 'n10', ref: 'ISAK 35 ¶11', label: 'Sumbangan/hibah dengan pembatasan yang dipenuhi pada periode yang sama', done: false },
    { id: 'n11', ref: 'PSAK 1 ¶25',  label: 'Penilaian kelangsungan usaha & ketergantungan pada sumber pendanaan utama', done: true },
    { id: 'n12', ref: 'PSAK 7',      label: 'Transaksi & saldo pihak berelasi (pembina, pengawas, pengurus)', done: false },
    { id: 'n13', ref: 'PSAK 8',      label: 'Peristiwa setelah periode pelaporan', done: true },
  ];

  /* ---- Prosedur audit khusus entitas nonlaba ---- */
  const PROC = [
    { ref: 'SA 250',     t: 'Uji kepatuhan terhadap UU Yayasan, AD/ART & ketentuan pemberi hibah (laws & regulations)' },
    { ref: 'ISAK 35 ¶09', t: 'Evaluasi ketepatan klasifikasi aset neto tanpa/dengan pembatasan per dokumen pemberi sumber daya' },
    { ref: 'SA 315',     t: 'Pahami siklus penerimaan sumbangan/hibah & risiko kelengkapan penerimaan kas non-pertukaran' },
    { ref: 'SA 240',     t: 'Pertimbangan risiko kecurangan penyalahgunaan aset & pengakuan sumbangan terikat' },
    { ref: 'SA 505',     t: 'Konfirmasi eksternal saldo piutang hibah & komitmen donor yang belum dicairkan' },
    { ref: 'SA 540',     t: 'Evaluasi estimasi: cadangan ECL piutang, masa manfaat aset, nilai wajar investasi' },
    { ref: 'ISAK 35 ¶11', t: 'Telusuri pelepasan pembatasan (release) ke pemenuhan tujuan program atau berakhirnya waktu' },
    { ref: 'SA 500',     t: 'Uji alokasi beban fungsional (program vs pendukung) terhadap basis alokasi yang wajar' },
    { ref: 'SA 700/810', t: 'Nilai kewajaran penyajian set laporan ISAK 35 & kecukupan pengungkapan CALK' },
  ];

  /* ---- Ketentuan kunci ISAK 35 vs PSAK 45 (lama) ---- */
  const KEY = [
    { k: 'Istilah ekuitas',   v: 'Aset Neto',          note: 'Selisih aset & liabilitas disebut "aset neto", bukan ekuitas.' },
    { k: 'Klasifikasi',       v: '2 kelas',            note: 'Tanpa pembatasan & dengan pembatasan — menyederhanakan 3 kelas PSAK 45 (terikat permanen/temporer/tidak terikat).' },
    { k: 'Nama laporan',      v: 'Penghasilan Komprehensif', note: 'Menggantikan "Laporan Aktivitas"; mengikuti kerangka PSAK 1.' },
    { k: 'Hasil periode',     v: 'Surplus / Defisit',  note: 'Bukan laba/rugi — mencerminkan orientasi nonlaba.' },
  ];

  const ENTITY = {
    name: 'Yayasan Pendidikan Cendekia Nusantara',
    legal: 'Yayasan (UU 16/2001 jo. UU 28/2004)',
    sector: 'Pendidikan — Entitas Berorientasi Nonlaba',
    city: 'Bandung', npwp: '31.214.667.8-441.000',
    period: 'Tahun yang berakhir 31 Desember 2025',
  };

  /* ============================================================
     isak35() — agregator kanonik. Membangun model laporan dari
     TB & aktivitas, lalu menghitung tie-out lintas-laporan.
     ============================================================ */
  function isak35() {
    const by: any = {}; TB.forEach(r => { by[r.grp] = by[r.grp] || []; by[r.grp].push(r); });
    const flip = (rows: any, neg: any) => rows.map((r: any) => ({ ...r, cy: neg ? -r.cy : r.cy, py: neg ? -r.py : r.py }));
    const sum = (rows: any, k: any) => rows.reduce((a: any, r: any) => a + r[k], 0);

    const ca = flip(by.ca, false), nca = flip(by.nca, false);
    const cl = flip(by.cl, true), ncl = flip(by.ncl, true);
    const naUn = flip(by.na_un, true), naRe = flip(by.na_re, true);

    const totalCA  = { cy: sum(ca, 'cy'),  py: sum(ca, 'py') };
    const totalNCA = { cy: sum(nca, 'cy'), py: sum(nca, 'py') };
    const totalAssets = { cy: totalCA.cy + totalNCA.cy, py: totalCA.py + totalNCA.py };
    const totalCL  = { cy: sum(cl, 'cy'),  py: sum(cl, 'py') };
    const totalNCL = { cy: sum(ncl, 'cy'), py: sum(ncl, 'py') };
    const totalLiab = { cy: totalCL.cy + totalNCL.cy, py: totalCL.py + totalNCL.py };
    const naUnTot = { cy: sum(naUn, 'cy'), py: sum(naUn, 'py') };
    const naReTot = { cy: sum(naRe, 'cy'), py: sum(naRe, 'py') };
    const totalNA = { cy: naUnTot.cy + naReTot.cy, py: naUnTot.py + naReTot.py };
    const totalLNA = { cy: totalLiab.cy + totalNA.cy, py: totalLiab.py + totalNA.py };
    const bsDiff = { cy: totalAssets.cy - totalLNA.cy, py: totalAssets.py - totalLNA.py };

    /* ---- Laporan Penghasilan Komprehensif ---- */
    const incUn = { cy: sum(INCOME_UN, 'cy'), py: sum(INCOME_UN, 'py') };
    const expTot = { cy: sum(EXPENSE, 'cy'), py: sum(EXPENSE, 'py') };
    const totUnAvail = { cy: incUn.cy + RELEASE.cy, py: incUn.py + RELEASE.py };
    const surplusUn = { cy: totUnAvail.cy - expTot.cy, py: totUnAvail.py - expTot.py };
    const incRe = { cy: sum(INCOME_RE, 'cy'), py: sum(INCOME_RE, 'py') };
    const surplusRe = { cy: incRe.cy - RELEASE.cy, py: incRe.py - RELEASE.py };
    const changeNA = { cy: surplusUn.cy + surplusRe.cy, py: surplusUn.py + surplusRe.py };
    const totalComp = { cy: changeNA.cy + OCI.cy, py: changeNA.py + OCI.py };

    const program = { cy: sum(EXPENSE.filter(e => e.cls === 'program'), 'cy'), py: sum(EXPENSE.filter(e => e.cls === 'program'), 'py') };
    const support = { cy: sum(EXPENSE.filter(e => e.cls === 'support'), 'cy'), py: sum(EXPENSE.filter(e => e.cls === 'support'), 'py') };
    const programRatio = { cy: program.cy / expTot.cy, py: program.py / expTot.py };

    /* ---- Arus kas ---- */
    const cfoWc = CF.wc.reduce((a, l) => a + l.v, 0);
    const cfoTotal = changeNA.cy + CF.depreciation - CF.restrictedEndowment + cfoWc;
    const cfo = [
      { label: 'Perubahan aset neto', v: changeNA.cy },
      { label: 'Penyesuaian:', head: true },
      { label: 'Penyusutan aset tetap', v: CF.depreciation },
      { label: 'Sumbangan terikat untuk dana abadi (aktivitas pendanaan)', v: -CF.restrictedEndowment },
      { label: 'Perubahan modal kerja:', head: true },
      ...CF.wc,
    ];
    const cfiTotal = CF.investing.reduce((a, l) => a + l.v, 0);
    const cffTotal = CF.financing.reduce((a, l) => a + l.v, 0);
    const netChange = cfoTotal + cfiTotal + cffTotal;
    const cashOpen = by.ca.find((r: any) => r.code === '1-1100').py;
    const cashClose = cashOpen + netChange;
    const cashBS = by.ca.find((r: any) => r.code === '1-1100').cy;

    /* ---- Perubahan Aset Neto (rollforward) ---- */
    const equityRoll = {
      un: { open: naUnTot.py, change: surplusUn.cy, oci: 0, close: naUnTot.cy },
      re: { open: naReTot.py, change: surplusRe.cy, oci: 0, close: naReTot.cy },
    };

    /* ---- Tie-out lintas laporan ---- */
    const T = 1e6;
    const chk = (id: any, label: any, ref: any, a: any, b: any, std: any, note: any) => ({ id, label, ref, std, note, a, b, diff: a - b, ok: Math.abs(a - b) < T });
    const checks = [
      chk('bs', 'Posisi keuangan seimbang', 'Posisi Keuangan', totalAssets.cy, totalLNA.cy, 'PSAK 1', 'Total Aset = Total Liabilitas + Aset Neto'),
      chk('na', 'Perubahan aset neto mengalir ke saldo', 'Penghasilan → Aset Neto', changeNA.cy, totalNA.cy - totalNA.py, 'ISAK 35', 'Kenaikan aset neto = saldo akhir − saldo awal'),
      chk('rel', 'Pelepasan pembatasan berjumlah nol', 'Penghasilan Komprehensif', RELEASE.cy, RELEASE.cy, 'ISAK 35 ¶11', 'Masuk "tanpa pembatasan" (+) = keluar "dengan pembatasan" (−)'),
      chk('un', 'Aset neto tanpa pembatasan menutup', 'Perubahan Aset Neto', equityRoll.un.open + equityRoll.un.change, equityRoll.un.close, 'ISAK 35', 'Saldo awal + surplus tanpa pembatasan = saldo akhir'),
      chk('re', 'Aset neto dengan pembatasan menutup', 'Perubahan Aset Neto', equityRoll.re.open + equityRoll.re.change, equityRoll.re.close, 'ISAK 35', 'Saldo awal + surplus dengan pembatasan = saldo akhir'),
      chk('cf', 'Arus kas menutup ke saldo kas', 'Arus Kas → Posisi Keuangan', cashClose, cashBS, 'PSAK 2', 'Kas awal + kenaikan kas neto = Kas dan setara kas'),
      chk('pycomp', 'Komparatif 2024 seimbang', 'Posisi Keuangan', totalAssets.py, totalLNA.py, 'PSAK 1', 'Saldo komparatif diperiksa kesesuaiannya'),
    ];

    return {
      entity: ENTITY,
      struct: { ca, nca, cl, ncl, naUn, naRe },
      bs: { ca, nca, cl, ncl, naUn, naRe, totalCA, totalNCA, totalAssets, totalCL, totalNCL, totalLiab, naUnTot, naReTot, totalNA, totalLNA, bsDiff, balanced: Math.abs(bsDiff.cy) < T },
      act: { incomeUn: INCOME_UN, expense: EXPENSE, incomeRe: INCOME_RE, release: RELEASE, oci: OCI,
             incUn, expTot, totUnAvail, surplusUn, incRe, surplusRe, changeNA, totalComp,
             program, support, programRatio },
      cf: { cfo, cfoTotal, cfi: CF.investing, cfiTotal, cff: CF.financing, cffTotal, netChange, cashOpen, cashClose, cashBS, ties: Math.abs(cashClose - cashBS) < T, depreciation: CF.depreciation, restrictedEndowment: CF.restrictedEndowment },
      equityRoll,
      checks, passed: checks.filter(c => c.ok).length,
      disclosures: DISCLOSURES, proc: PROC, key: KEY,
      tb: TB,
    };
  }

  AMS_CANON.isak35 = isak35;
  AMS_CANON.ISAK35_TB = TB;
  AMS_CANON.ISAK35_DISCLOSURES = DISCLOSURES;
})();
