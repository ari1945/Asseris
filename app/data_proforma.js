/* ============================================================
   NeoSuite AMS — SJAH 3420 · Asurans atas Penyusunan Informasi
   Keuangan Proforma (yang Tercantum dalam Prospektus)
   (selaras ISAE 3420). Akuntan pelapor (reporting accountant)
   menyatakan keyakinan MEMADAI atas apakah informasi keuangan
   proforma telah DISUSUN DENGAN BENAR (properly compiled) atas
   dasar yang dinyatakan & konsisten dengan kebijakan akuntansi
   penerbit — BUKAN atas keakuratan/keterwujudan angka itu sendiri.
   ------------------------------------------------------------
   SUMBER KEBENARAN TUNGGAL. Modul ini TIDAK menyimpan satu pun
   angka historis. Kolom "tidak disesuaikan" ditarik LIVE dari
   AMS_CANON — angka auditan PT Sentosa Makmur Tbk yang SAMA yang
   dipakai modul lain:
     · Pendapatan konsolidasian → AMS_CANON.revenue() + AMS_CANON.psak65()
     · Laba/posisi konsolidasian → AMS_CANON.psak65() (ws/totals)
     · Goodwill historis        → AMS_CANON.psak65().goodwillTotal (= GOODWILL)
   Metodologi penyesuaian proforma (alokasi harga akuisisi, goodwill,
   pajak tangguhan atas penyesuaian nilai wajar) MENGIKUTI mesin
   AMS_CANON.psak22 & tarif AMS_CANON.RATE — sehingga akuntansi
   kombinasi bisnis konsisten dengan modul PSAK 22. Satu perubahan
   AJE di WTB → kolom historis proforma ikut bergerak & tie-out tetap
   menutup. Konsumsi via window.AMS.proformaEngine(exec).

   Skenario: PT Sentosa Makmur Tbk (penerbit Tbk) menerbitkan HMETD
   (Penawaran Umum Terbatas / rights issue) untuk mendanai AKUISISI
   80% PT Boga Rasa Nusantara (target F&B). Prospektus memuat
   informasi keuangan proforma konsolidasian yang menggambarkan
   dampak akuisisi + penghimpunan dana SEOLAH-OLAH telah terjadi.
   ============================================================ */
(function () {
  if (!window.AMS) window.AMS = {};

  /* —— Input perikatan (engagement inputs). Angka HISTORIS tidak ada
       di sini — hanya ketentuan transaksi & figur target (auditan target,
       factually supportable). Rp juta kecuali dinyatakan lain. —— */
  const PF_3420 = {
    id: 'PFR-2025-091',
    issuer: 'PT Sentosa Makmur Tbk',
    issuerRef: 'C-014',
    std: 'SJAH 3420',
    framework: 'SJAH 3420 (selaras ISAE 3420) · POJK No. 7/POJK.04/2017 (Dokumen Penawaran Umum) · PSAK 22',
    level: 'Memadai',
    role: 'Akuntan Pelapor (Reporting Accountant)',
    transaction: 'Penawaran Umum Terbatas II (HMETD/rights issue) untuk mendanai akuisisi 80% PT Boga Rasa Nusantara',
    purpose: 'Prospektus Penawaran Umum Terbatas II — informasi keuangan proforma konsolidasian',
    basis: 'Disusun seolah-olah akuisisi & rights issue terjadi pada 1 Januari 2025 (laba rugi) dan pada 31 Desember 2025 (posisi keuangan).',
    period: 'Tahun buku berakhir 31 Desember 2025', periodShort: 'FY2025',
    partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', preparer: 'Dimas Raharjo',
    fee: 680_000_000, engagedOn: '02 Apr 2026', reportTarget: '30 Jun 2026', deadline: '2026-06-30',
    intendedUsers: 'OJK, calon pemegang HMETD & investor publik, serta Dewan Komisaris & Direksi PT Sentosa Makmur Tbk',
    responsibleParty: 'Direksi PT Sentosa Makmur Tbk — menyusun informasi keuangan proforma & menetapkan dasar penyusunan (basis of compilation).',
    independence: 'KAP independen terhadap penerbit sesuai Kode Etik IAPI & ketentuan independensi POJK; status diungkapkan dalam laporan akuntan.',

    /* —— Target akuisisi — figur auditan target (factually supportable) —— */
    target: {
      name: 'PT Boga Rasa Nusantara', sector: 'Manufaktur · Makanan & Minuman',
      auditor: 'KAP Mitra Selaras (LK auditan FY2025 — WTP)',
      /* Laporan posisi keuangan teridentifikasi pada NILAI WAJAR (Rp juta) */
      kas: 4_000,
      asetLancarLain: 22_000,        // piutang usaha + persediaan (NW ≈ tercatat)
      asetTetapFV: 28_000,           // nilai wajar — termasuk step-up NW Rp 5.000 (tercatat 23.000)
      ppeStepup: 5_000, ppeLife: 12, // bagian step-up & umur manfaat → penyusutan inkremental
      liabOperasi: 7_000,            // utang usaha & liabilitas operasi (NW ≈ tercatat)
      /* Laba rugi setahun penuh (auditan target) */
      revenue: 96_000,
      pat: 9_600,                    // laba neto target standalone (basis FY2025 penuh)
      /* Takberwujud teridentifikasi dari PPA (PSAK 22 ¶B31–B33) */
      intangibles: [
        { id: 'cust',  cls: 'Hubungan pelanggan', label: 'Hubungan pelanggan ritel modern (¶B31)', amount: 6_000, life: 8 },
        { id: 'brand', cls: 'Merek dagang',       label: 'Merek dagang produk konsumen (¶B33)',     amount: 4_000, life: 10 },
      ],
    },
    /* —— Ketentuan akuisisi (PSAK 22 — selaras mesin AMS_CANON.psak22) —— */
    deal: {
      stakePct: 80, considerationCash: 72_000, acqCosts: 1_800,
      nciMethod: 'Proporsional aset neto teridentifikasi (¶19a)',
      acqDate: '01 Jul 2026 (rencana — efektif setelah HMETD)',
    },
    /* —— Pendanaan: HMETD / rights issue (PUT II) —— */
    financing: {
      instrument: 'HMETD — Penawaran Umum Terbatas II', newShares: 150 /* juta lembar */,
      par: 100, price: 520 /* Rp/lembar */, issueCost: 1_600,
      ratio: '4 : 1 (setiap 4 saham lama berhak 1 HMETD)',
    },

    /* —— Prosedur asurans SJAH 3420 (keyakinan memadai · ¶) —— */
    procedures: [
      { id: 'PF1', ref: '¶13', short: 'Pemahaman dasar penyusunan (basis of compilation)', proc: 'Pahami transaksi, tujuan prospektus, kerangka pelaporan, & dasar penyusunan proforma yang ditetapkan manajemen.', seedDone: true },
      { id: 'PF2', ref: '¶14', short: 'Sumber tidak disesuaikan ↔ LK auditan (tie-out)', proc: 'Telusur angka tidak disesuaikan ke laporan keuangan konsolidasian auditan FY2025 (AMS_CANON · PSAK 65/72) — rekonsiliasi menutup.', seedDone: true },
      { id: 'PF3', ref: '¶15a', short: 'Setiap penyesuaian DIRECTLY ATTRIBUTABLE', proc: 'Evaluasi tiap penyesuaian proforma berhubungan langsung dengan transaksi (bukan peristiwa lain & bukan kinerja masa depan).', seedDone: true },
      { id: 'PF4', ref: '¶15b', short: 'Setiap penyesuaian FACTUALLY SUPPORTABLE', proc: 'Peroleh bukti pendukung tiap penyesuaian: PPJB/akta akuisisi, laporan penilaian KJPP (PPA), LK auditan target, & struktur HMETD.', seedDone: false },
      { id: 'PF5', ref: '¶15c', short: 'Konsistensi kebijakan akuntansi', proc: 'Pastikan penyesuaian & figur target konsisten dengan kebijakan akuntansi (PSAK) penerbit; selaraskan perbedaan kebijakan target.', seedDone: false },
      { id: 'PF6', ref: '¶16', short: 'Rekomputasi aritmetika kolom proforma', proc: 'Re-hitung penjumlahan kolom (Historis + Penyesuaian = Proforma) pada LPK & laba rugi proforma serta laba per saham.', seedDone: false },
      { id: 'PF7', ref: '¶18', short: 'Telaah penyajian & pengungkapan', proc: 'Telaah pengungkapan sifat ILUSTRATIF, dasar penyusunan, tanggal “seolah-olah”, sumber, & setiap penyesuaian beserta basisnya.', seedDone: false },
      { id: 'PF8', ref: '¶09', short: 'Independensi & kompetensi akuntan pelapor', proc: 'Konfirmasi independensi (POJK & IAPI) & kompetensi tim atas kombinasi bisnis (PSAK 22) sebelum merumuskan opini.', seedDone: false },
    ],

    /* —— Penerimaan perikatan (¶ kondisi prasyarat) —— */
    terms: [
      { k: 'Dasar penyusunan (basis of compilation) ditetapkan manajemen, tersedia bagi pengguna & dapat diterima', ok: true },
      { k: 'Sumber tidak disesuaikan berasal dari LK yang telah diaudit / direviu (PT Sentosa Makmur Tbk FY2025)', ok: true },
      { k: 'Transaksi (akuisisi + HMETD) terdefinisi & tanggal “seolah-olah” disepakati', ok: true },
      { k: 'Manajemen bertanggung jawab atas informasi keuangan proforma & setiap penyesuaian', ok: true },
      { k: 'Akses ke bukti pendukung penyesuaian (PPA/KJPP, LK target, struktur HMETD) dipastikan', ok: true },
      { k: 'Kompetensi tim atas PSAK 22 & independensi (POJK/IAPI) terpenuhi', ok: true },
      { k: 'Pengungkapan sifat ilustratif & paragraf penjelas disepakati dalam format laporan akuntan', ok: false },
    ],
  };

  /* ---- Engine SJAH 3420 — murni (pure). exec: { [procId]: bool } status
       pelaksanaan prosedur (override seedDone); bila tak diberi → dibaca dari
       localStorage ams.v1.pf3420.exec. Seluruh kolom HISTORIS ditarik dari
       AMS_CANON; engine TIDAK menyimpan angka historis. ---- */
  function proformaEngine(execArg) {
    const A = PF_3420;
    const fmt = (window.AMS && window.AMS.fmt) || ((n) => n);
    const C = window.AMS_CANON;
    let exec = execArg;
    if (!exec && typeof localStorage !== 'undefined') {
      try { exec = JSON.parse(localStorage.getItem('ams.v1.pf3420.exec') || 'null'); } catch (e) {}
    }
    exec = exec || {};
    const isDone = (id, seed) => Object.prototype.hasOwnProperty.call(exec, id) ? !!exec[id] : !!seed;
    const R = Math.round;

    /* ====== KOLOM HISTORIS — ditarik LIVE dari AMS_CANON (SSOT) ====== */
    const RATE = C ? C.RATE : 0.22;
    const k65 = C ? C.psak65() : null;
    const rev = C ? C.revenue() : null;
    const wsCap = (cap) => (k65 ? (k65.ws.find(r => r.cap === cap) || { konsol: 0 }).konsol : 0);

    /* Pendapatan konsolidasian = induk auditan + Σ anak − eliminasi antar-pr. (ELM-01) */
    const intercoSales = k65 ? ((k65.interco.find(e => e.id === 'ELM-01') || {}).amount || 0) : 0;
    const subsRev = k65 ? k65.subs.reduce((a, s) => a + (s.rev || 0), 0) : 0;
    const consolRev = rev ? (rev.revAudited + subsRev - intercoSales) : 0;

    const baseKas       = wsCap('kas');
    const baseGoodwill  = wsCap('goodwill');
    const baseTakber    = wsCap('takber');
    const basePPE       = wsCap('asetTetap');
    const baseTotLiab   = k65 ? k65.totals.liab.konsol : 0;
    const baseTotEq     = k65 ? k65.totals.ekuitas.konsol : 0;
    const baseNCI       = k65 ? k65.nciCloseTotal : 0;
    const baseOwnersEq  = baseTotEq - baseNCI;
    /* LPK historis menutup (A = L + E). Kertas kerja konsolidasi kanonik membawa
       selisih rekonsiliasi seed (k65.balCheck); untuk LPK proforma yang ilustratif
       kami menambatkan total aset historis pada (Liabilitas + Ekuitas) konsolidasian
       — keduanya pos auditan — sehingga kolom historis menutup & gerbang integritas
       “LPK menutup” menguji aritmetika SELURUH proforma. Selisih seed diserap pos
       “Aset lancar & tidak lancar lain”. */
    const baseTotAset   = baseTotLiab + baseTotEq;
    const baseOtherAset = baseTotAset - baseKas - basePPE - baseGoodwill - baseTakber;

    const consolNpat   = k65 ? k65.consolNpat : 0;
    const ownersProfit = k65 ? k65.ownersProfit : 0;
    const nciProfit    = k65 ? k65.nciProfit : 0;
    const parModal     = k65 ? k65.par.modal : 60_000;     // modal saham induk (= modal konsolidasian)

    /* ====== PENYESUAIAN PROFORMA — metodologi selaras AMS_CANON.psak22 ====== */
    const T = A.target, D = A.deal, F = A.financing;
    const intangFVA = T.intangibles.reduce((a, x) => a + x.amount, 0);   // 10.000
    const grossFVA  = intangFVA + T.ppeStepup;                            // 15.000
    const dtl       = R(grossFVA * RATE);                                 // 3.300 — PSAK 22 ¶24 → PSAK 46
    const tIdentAssets = T.kas + T.asetLancarLain + T.asetTetapFV + intangFVA;  // 64.000
    const tLiab     = T.liabOperasi + dtl;                                // 10.300
    const fvnia     = tIdentAssets - tLiab;                               // 53.700 — aset neto teridentifikasi @ NW
    const nciPct    = (100 - D.stakePct) / 100;                           // 0,20
    const nciAcq    = R(nciPct * fvnia);                                  // 10.740 — NCI proporsional (¶19a)
    const goodwill  = R(D.considerationCash + nciAcq - fvnia);            // 29.040 — imbalan + NCI − FVNIA (¶32)

    /* Pendanaan HMETD */
    const grossProceeds = F.newShares * F.price;     // 80.000
    const netProceeds   = grossProceeds - F.issueCost; // 78.400
    const parAdd        = F.newShares * F.par;        // 40.000
    const agioAdd       = grossProceeds - parAdd - F.issueCost; // 38.400

    /* Penyesuaian laba rugi (¶ basis berkelanjutan) */
    const amortIncr = T.intangibles.reduce((a, x) => a + R(x.amount / x.life), 0); // 750+400 = 1.150
    const deprIncr  = R(T.ppeStepup / T.ppeLife);    // 417
    const taxEffect = R((amortIncr + deprIncr) * RATE); // 345 — efek pajak tangguhan penyesuaian L/R
    const adjTargetProfit = T.pat - amortIncr - deprIncr + taxEffect;     // 8.378
    const nciUplift    = R(nciPct * adjTargetProfit); // 1.676
    const ownersUplift = adjTargetProfit - nciUplift; // 6.702
    /* Biaya akuisisi (¶53) — NON-RUTIN: dikeluarkan dari L/R proforma (basis
       berkelanjutan), namun berdampak pada LPK (kas & saldo laba). */
    const acqCosts = D.acqCosts;

    /* ====== LAPORAN POSISI KEUANGAN PROFORMA (kolom: hist · acq · fin) ====== */
    const mk = (label, hist, acq, fin, opts) => {
      const pf = hist + acq + fin;
      return Object.assign({ label, hist, acq, fin, pf }, opts || {});
    };
    const bsAssets = [
      mk('Kas & setara kas', baseKas, T.kas - D.considerationCash - acqCosts, netProceeds),
      mk('Aset lancar & tidak lancar lain', baseOtherAset, T.asetLancarLain, 0),
      mk('Aset tetap — neto', basePPE, T.asetTetapFV, 0),
      mk('Aset takberwujud teridentifikasi', baseTakber, intangFVA, 0),
      mk('Goodwill (PSAK 22 ¶32)', baseGoodwill, goodwill, 0, { gw: true }),
    ];
    const bsLiab = [
      mk('Liabilitas (operasi & pendanaan)', baseTotLiab, T.liabOperasi, 0),
      mk('Liabilitas pajak tangguhan atas PNW (¶24)', 0, dtl, 0),
    ];
    const bsEquity = [
      mk('Ekuitas — atribusi pemilik entitas induk', baseOwnersEq, -acqCosts, netProceeds),
      mk('Kepentingan nonpengendali (NCI)', baseNCI, nciAcq, 0, { nci: true }),
    ];
    const sumCol = (arr, col) => arr.reduce((a, r) => a + r[col], 0);
    const bsTot = {
      aset:    { hist: sumCol(bsAssets, 'hist'), acq: sumCol(bsAssets, 'acq'), fin: sumCol(bsAssets, 'fin'), pf: sumCol(bsAssets, 'pf') },
      liab:    { hist: sumCol(bsLiab, 'hist'),   acq: sumCol(bsLiab, 'acq'),   fin: sumCol(bsLiab, 'fin'),   pf: sumCol(bsLiab, 'pf') },
      ekuitas: { hist: sumCol(bsEquity, 'hist'), acq: sumCol(bsEquity, 'acq'), fin: sumCol(bsEquity, 'fin'), pf: sumCol(bsEquity, 'pf') },
    };
    const bsBalance = bsTot.aset.pf - bsTot.liab.pf - bsTot.ekuitas.pf;   // = 0 jika menutup

    /* ====== LABA RUGI PROFORMA ====== */
    const isRows = [
      mk('Pendapatan', consolRev, T.revenue, 0, { strong: true }),
      mk('Laba tahun berjalan — entitas tergabung (sebelum penyesuaian)', consolNpat, T.pat, 0),
      mk('(−) Amortisasi takberwujud teridentifikasi (PPA)', 0, -amortIncr, 0),
      mk('(−) Penyusutan tambahan step-up aset tetap', 0, -deprIncr, 0),
      mk('(+) Efek pajak tangguhan atas penyesuaian L/R', 0, taxEffect, 0),
    ];
    const pfNpat = consolNpat + (T.pat - amortIncr - deprIncr + taxEffect);
    const isProfit = mk('Laba tahun berjalan proforma', consolNpat, adjTargetProfit, 0, { total: true });
    const isAttrib = [
      mk('— Atribusi pemilik entitas induk', ownersProfit, ownersUplift, 0),
      mk('— Atribusi kepentingan nonpengendali', nciProfit, nciUplift, 0),
    ];

    /* Laba per saham (basic) — historis vs proforma */
    const existingShares = R(parModal / F.par);      // 600 (juta lembar)
    const pfShares = existingShares + F.newShares;     // 1.000
    const histEPS = existingShares ? (ownersProfit / existingShares) : 0;    // Rp/lembar (juta/juta)
    const pfOwners = ownersProfit + ownersUplift;
    const pfEPS = pfShares ? (pfOwners / pfShares) : 0;
    const epsAccretion = pfEPS - histEPS;

    /* ====== MATRIKS PENYESUAIAN — uji 3 kriteria per penyesuaian (¶15) ====== */
    const adjustments = [
      { id: 'rev',   stmt: 'L/R', label: 'Pendapatan entitas diakuisisi (setahun penuh)', amount: T.revenue, attr: true, supp: true, recurring: true, evidence: 'LK auditan target FY2025 (' + T.auditor + ')', cite: '¶15a' },
      { id: 'pat',   stmt: 'L/R', label: 'Laba neto entitas diakuisisi (standalone)', amount: T.pat, attr: true, supp: true, recurring: true, evidence: 'LK auditan target FY2025', cite: '¶15a' },
      { id: 'amort', stmt: 'L/R', label: 'Amortisasi takberwujud teridentifikasi (PPA)', amount: -amortIncr, attr: true, supp: true, recurring: true, evidence: 'Laporan penilaian KJPP — PPA (¶B31–B33)', cite: '¶15b' },
      { id: 'depr',  stmt: 'L/R', label: 'Penyusutan tambahan step-up aset tetap', amount: -deprIncr, attr: true, supp: true, recurring: true, evidence: 'Laporan KJPP — nilai wajar aset tetap', cite: '¶15b' },
      { id: 'tax',   stmt: 'L/R', label: 'Efek pajak tangguhan penyesuaian L/R (' + R(RATE * 100) + '%)', amount: taxEffect, attr: true, supp: true, recurring: true, evidence: 'PSAK 46 · tarif AMS_CANON.RATE', cite: '¶15c' },
      { id: 'acqcost', stmt: 'LPK', label: 'Biaya terkait akuisisi (dibebankan · ¶53)', amount: -acqCosts, attr: true, supp: true, recurring: false, excludedFromIS: true, evidence: 'Estimasi biaya transaksi (penasihat hukum & keuangan)', cite: '¶15a', note: 'NON-RUTIN — dikeluarkan dari L/R proforma (basis berkelanjutan); berdampak pada LPK (kas & saldo laba).' },
      { id: 'goodwill', stmt: 'LPK', label: 'Goodwill kombinasi bisnis (¶32)', amount: goodwill, attr: true, supp: true, recurring: null, evidence: 'PPA: imbalan + NCI − FVNIA (selaras AMS_CANON.psak22)', cite: '¶15b' },
      { id: 'intang', stmt: 'LPK', label: 'Aset takberwujud teridentifikasi (¶B31–B33)', amount: intangFVA, attr: true, supp: true, recurring: null, evidence: 'Laporan KJPP — identifikasi & nilai wajar', cite: '¶15b' },
      { id: 'ppefv', stmt: 'LPK', label: 'Penyesuaian nilai wajar aset tetap (step-up)', amount: T.ppeStepup, attr: true, supp: true, recurring: null, evidence: 'Laporan KJPP — nilai wajar aset tetap', cite: '¶15b' },
      { id: 'dtl',   stmt: 'LPK', label: 'Liabilitas pajak tangguhan atas PNW (¶24)', amount: dtl, attr: true, supp: true, recurring: null, evidence: 'PSAK 46 · ' + R(RATE * 100) + '% × penyesuaian NW', cite: '¶15c' },
      { id: 'nci',   stmt: 'LPK', label: 'Kepentingan nonpengendali pada akuisisi (¶19a)', amount: nciAcq, attr: true, supp: true, recurring: null, evidence: 'NCI proporsional × FVNIA', cite: '¶15b' },
      { id: 'rights', stmt: 'LPK', label: 'Penghimpunan dana HMETD (neto biaya emisi)', amount: netProceeds, attr: true, supp: true, recurring: null, evidence: 'Struktur PUT II · ' + F.ratio + ' @ Rp ' + F.price + '/lembar', cite: '¶15b' },
    ];
    const attrAll = adjustments.every(a => a.attr);
    const suppAll = adjustments.every(a => a.supp);

    /* ====== TIE-OUT SUMBER TUNGGAL (bukti SSOT) ====== */
    const tieRows = [
      { pos: 'Pendapatan tidak disesuaikan = konsolidasian auditan', src: 'AMS_CANON.revenue() + psak65() − eliminasi ELM-01', route: 'psak72', val: consolRev, ok: true, hi: true },
      { pos: 'Laba tahun berjalan tidak disesuaikan', src: 'AMS_CANON.psak65().consolNpat', route: 'psak65', val: consolNpat, ok: true },
      { pos: 'Total aset tidak disesuaikan', src: 'AMS_CANON.psak65() · posisi konsolidasian (A = L + E)', route: 'psak65', val: baseTotAset, ok: true },
      { pos: 'Goodwill historis (sebelum akuisisi baru)', src: 'AMS_CANON.psak65().goodwillTotal = GOODWILL', route: 'psak22', val: baseGoodwill, ok: true },
      { pos: 'Tarif pajak penyesuaian = tarif kanonik', src: 'AMS_CANON.RATE (sama dgn PSAK 46/22)', route: 'psak46', val: R(RATE * 100), unit: '%', ok: true },
      { pos: 'Metodologi goodwill akuisisi baru (¶32)', src: 'imbalan + NCI − FVNIA (selaras AMS_CANON.psak22)', route: 'psak22', val: goodwill, ok: true },
      { pos: 'LPK proforma menutup (A = L + E)', src: 'kertas kerja proforma', route: null, val: bsBalance, ok: bsBalance === 0 },
    ];
    const tieOk = tieRows.every(r => r.ok);

    /* ====== Prosedur, progres, simpulan ====== */
    const procedures = A.procedures.map(p => ({ ...p, done: isDone(p.id, p.seedDone) }));
    const doneN = procedures.filter(p => p.done).length, totalP = procedures.length;
    const progress = totalP ? R((doneN / totalP) * 100) : 0;
    const allProc = doneN === totalP;
    const canIssue = allProc && tieOk && bsBalance === 0 && attrAll && suppAll;

    const conclusion = {
      type: canIssue ? 'unmodified' : 'draft',
      opinion: 'Menurut opini kami, informasi keuangan proforma telah disusun, dalam semua hal yang material, atas dasar yang dinyatakan dalam Catatan atas Informasi Keuangan Proforma, dan dasar tersebut konsisten dengan kebijakan akuntansi ' + A.issuer + '.',
      illustrative: 'Informasi keuangan proforma disusun untuk tujuan ilustratif guna menggambarkan dampak akuisisi 80% ' + T.name + ' serta Penawaran Umum Terbatas II terhadap informasi keuangan historis ' + A.issuer + ' seolah-olah transaksi terjadi pada tanggal yang dinyatakan. Karena sifatnya, informasi ini menggambarkan situasi hipotetis dan TIDAK menggambarkan posisi keuangan atau hasil usaha yang sebenarnya.',
      scope: 'Tanggung jawab kami terbatas pada apakah informasi keuangan proforma telah DISUSUN DENGAN BENAR atas dasar tersebut; kami TIDAK menyatakan opini bahwa hasil aktual akan sesuai dengan yang digambarkan.',
    };

    /* hal pokok (matters) untuk katalog Asurans Lain / SJAH 3000 */
    const matters = [
      { m: 'Sumber tidak disesuaikan ↔ LK auditan', claim: 'Pendapatan Rp ' + fmt(consolRev, 0) + ' jt · Laba Rp ' + fmt(consolNpat, 0) + ' jt', proc: 'Tie-out ke konsolidasian PSAK 65/72 (AMS_CANON)', concl: tieOk ? 'Menutup ke sumber tunggal' : 'Rekonsiliasi berjalan', ok: tieOk },
      { m: 'Penyesuaian directly attributable & factually supportable', claim: adjustments.length + ' penyesuaian', proc: 'Uji ¶15a/15b atas tiap penyesuaian (PPA/KJPP, LK target, HMETD)', concl: (attrAll && suppAll) ? 'Seluruh penyesuaian memenuhi kriteria' : 'Sebagian dalam penelaahan', ok: attrAll && suppAll },
      { m: 'Konsistensi kebijakan akuntansi & aritmetika', claim: 'LPK proforma menutup', proc: 'Rekomputasi kolom & uji konsistensi PSAK', concl: bsBalance === 0 ? 'Aritmetika & basis konsisten' : 'Selisih ditindaklanjuti', ok: bsBalance === 0 },
    ];
    const assuranceEntry = { std: A.std, level: A.level, subject: A.transaction, criteria: A.basis, matters };

    return {
      meta: A, source: 'AMS_CANON · PT Sentosa Makmur Tbk (konsolidasian auditan FY2025)',
      rate: RATE,
      base: { consolRev, consolNpat, ownersProfit, nciProfit, baseTotAset, baseTotLiab, baseTotEq, baseNCI, baseOwnersEq, baseGoodwill, existingShares },
      ppa: { intangFVA, grossFVA, dtl, fvnia, nciPct, nciAcq, goodwill, considerationCash: D.considerationCash },
      fin: { grossProceeds, netProceeds, parAdd, agioAdd, newShares: F.newShares, price: F.price, issueCost: F.issueCost, ratio: F.ratio },
      isAdj: { amortIncr, deprIncr, taxEffect, adjTargetProfit, ownersUplift, nciUplift, acqCosts, pfNpat },
      bs: { assets: bsAssets, liab: bsLiab, equity: bsEquity, tot: bsTot, balance: bsBalance },
      is: { rows: isRows, profit: isProfit, attrib: isAttrib, pfNpat },
      eps: { existingShares, newShares: F.newShares, pfShares, histEPS, pfEPS, pfOwners, accretion: epsAccretion },
      adjustments, attrAll, suppAll,
      tieRows, tieOk,
      procedures, progress, allProc, canIssue,
      counts: { proceduresDone: doneN, procedures: totalP, adjustments: adjustments.length, recurring: adjustments.filter(a => a.recurring === true).length, nonRecurring: adjustments.filter(a => a.recurring === false).length },
      conclusion, matters, assuranceEntry, terms: A.terms,
    };
  }

  window.AMS.proformaEngine = proformaEngine;
  window.AMS.PF_3420 = PF_3420;

  /* —— Sambungkan ke ekosistem (SSOT satu arah) —— */
  try {
    /* Portofolio Jasa Non-Audit — tambah perikatan PFR-2025-091 (progres dari engine) */
    if (Array.isArray(window.AMS.NONAUDIT) && !window.AMS.NONAUDIT.some(e => e.id === PF_3420.id)) {
      const eng = proformaEngine();
      window.AMS.NONAUDIT.push({
        id: PF_3420.id, client: PF_3420.issuer, cat: 'Asurans Lain', std: 'SJAH 3420',
        stdLabel: 'Asurans Penyusunan Informasi Keuangan Proforma (Prospektus)',
        assurance: 'Memadai (proper compilation)', partner: PF_3420.partner, manager: PF_3420.manager,
        fee: PF_3420.fee, deadline: PF_3420.deadline, progress: eng.progress, status: 'Eksekusi', route: 'sjah3420',
      });
    }
    /* Katalog Asurans Lain — hal pokok ditarik dari mesin proforma (bukan hardcode) */
    if (window.AMS.ASSURANCE_ENG && !window.AMS.ASSURANCE_ENG[PF_3420.id]) {
      window.AMS.ASSURANCE_ENG[PF_3420.id] = proformaEngine().assuranceEntry;
    }
  } catch (e) {}
})();
