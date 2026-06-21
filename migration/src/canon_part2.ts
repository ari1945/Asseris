/* ============================================================
   Asseris — canon part2 (engine + seed) (W3 split dari canon.js; perilaku identik).
   ============================================================ */
import { FIG, FISCAL, RATE, figuresFromWTB, jt, wtbVal } from './canon_base';
import { deferredTax, fixedAssets, intangibles, inventory } from './canon_part1';
import type { WTB } from './canon_types';

  const RESTATE = {
    // Kesalahan periode lalu (prior period error) — penjualan & piutang fiktif FY2024
    // (channel stuffing R-01) teridentifikasi pada audit FY2025. Bruto Rp juta.
    errRevenue: 2400,
    label: 'Penjualan & piutang fiktif FY2024 (channel stuffing)',
    parValue: 100,   // nilai nominal saham (Rp) untuk EPS dasar
  };

  function psak25(wtb?: WTB) {
    const s   = figuresFromWTB(wtb);
    const inv = inventory(wtb);
    const fa  = fixedAssets(wtb);
    const intan = intangibles(wtb);
    const dt  = deferredTax(wtb);

    /* ——— nilai PY (audited) yang ditarik dari WTB kolom `ly` ——— */
    const prevCkpn = -jt(wtbVal(wtb, '1-1210', 'ly'));   // 2.109
    const prevDbo  = -jt(wtbVal(wtb, '2-2300', 'ly'));   // 11.220
    const prevDta  =  jt(wtbVal(wtb, '1-2500', 'ly'));   // 4.110
    const grossAr  =  jt(wtbVal(wtb, '1-1200', 'adj'));  // piutang bruto audited

    /* === REGISTER ESTIMASI AKUNTANSI (perubahan estimasi → prospektif ¶36) ===
       Tiap baris menelusuri SATU estimasi ke modul sumbernya — nilai tercatat
       ditarik LIVE dari canon (mengikuti AJE), bukan di-hardcode. */
    const estimates = [
      { id: 'ecl', pos: 'Penyisihan kerugian ECL piutang', module: 'ecl', ref: 'PSAK 71 · SA 540',
        basis: 'Tingkat kerugian (loss rate) & overlay forward-looking',
        assumpPy: 'Matriks historis', assumpCy: '+ overlay makroekonomi',
        carryPy: prevCkpn, carryCy: s.ckpnAudited, drives: 'Beban penurunan nilai',
        sens: Math.round(grossAr * 0.01), sensLbl: '+1% loss rate', treat: 'Prospektif' },
      { id: 'dep', pos: 'Umur manfaat & nilai residu aset tetap', module: 'psak16', ref: 'PSAK 16 ¶51',
        basis: 'Umur manfaat / pola konsumsi manfaat ekonomik',
        assumpPy: 'Mesin 16 th', assumpCy: 'Mesin 14 th (ditinjau)',
        carryPy: Math.round(fa.netOpen), carryCy: Math.round(fa.netClose), drives: 'Beban penyusutan Rp ' + Math.round(fa.deprAudited) + ' jt',
        sens: Math.round(fa.expectedDep * 0.08), sensLbl: 'umur −1 th', treat: 'Prospektif' },
      { id: 'amort', pos: 'Umur manfaat aset takberwujud', module: 'psak19', ref: 'PSAK 19 ¶104',
        basis: 'Umur manfaat lisensi & perangkat lunak',
        assumpPy: 'Software 5 th', assumpCy: 'Software 4 th',
        carryPy: Math.round(intan.netOpen), carryCy: Math.round(intan.netClose), drives: 'Beban amortisasi Rp ' + Math.round(intan.amortAudited) + ' jt',
        sens: Math.round(intan.expectedAmort * 0.10), sensLbl: 'umur −1 th', treat: 'Prospektif' },
      { id: 'nrv', pos: 'Cadangan penurunan nilai persediaan (NRV)', module: 'psak14', ref: 'PSAK 14 ¶34',
        basis: 'Estimasi nilai realisasi neto barang lambat-laku',
        assumpPy: 'Cadangan dibukukan', assumpCy: 'NRV taksiran auditor',
        carryPy: Math.round(inv.bookedWD), carryCy: Math.round(inv.requiredWD), drives: 'Penyesuaian BPP',
        sens: Math.round(inv.shortfallWD), sensLbl: 'usulan tambahan', treat: 'Prospektif' },
      { id: 'eb', pos: 'Asumsi aktuaria imbalan pasti', module: 'psak24', ref: 'PSAK 24 ¶57',
        basis: 'Tingkat diskonto & kenaikan gaji',
        assumpPy: 'Diskonto 7,00%', assumpCy: 'Diskonto 6,80%',
        carryPy: prevDbo, carryCy: s.dboBooked, drives: 'Pengukuran kembali (OCI) Rp ' + FIG.ociRemeasure + ' jt',
        sens: Math.round(s.dboBooked * 0.097), sensLbl: 'diskonto −1%', kind: 'oci', treat: 'Prospektif · OCI' },
      { id: 'dta', pos: 'Pemulihan aset pajak tangguhan', module: 'psak46', ref: 'PSAK 46 ¶56',
        basis: 'Proyeksi laba fiskal masa depan',
        assumpPy: 'Proyeksi 3 th', assumpCy: 'Proyeksi 4 th',
        carryPy: prevDta, carryCy: s.dtaReported, drives: 'Manfaat pajak tangguhan',
        sens: dt.items.find(i => i.id === 'tlc') ? Math.abs(dt.items.find(i => i.id === 'tlc')!.dt) : 660, sensLbl: 'rugi fiskal', treat: 'Prospektif' },
    ];
    const estTotalCy = estimates.reduce((a, e) => a + e.carryCy, 0);

    /* === KATALOG KLASIFIKASI PERUBAHAN (pohon keputusan ¶32 vs ¶19 vs ¶42) === */
    const changes = [
      { id: 'c-ecl',  item: 'Tingkat kerugian ECL forward-looking direvisi (overlay makro)', cat: 'estimate', treat: 'Prospektif — periode kini & mendatang', ref: '¶36', module: 'ecl', amt: estimates[0].carryCy - estimates[0].carryPy },
      { id: 'c-dep',  item: 'Umur manfaat mesin produksi ditinjau (16 → 14 tahun)', cat: 'estimate', treat: 'Prospektif — penyusutan disesuaikan', ref: '¶36', module: 'psak16', amt: null },
      { id: 'c-eb',   item: 'Asumsi diskonto aktuaria 7,00% → 6,80%', cat: 'estimate', treat: 'Prospektif — dampak ke OCI (PSAK 24)', ref: '¶36', module: 'psak24', amt: FIG.ociRemeasure },
      { id: 'c-err',  item: RESTATE.label, cat: 'error', treat: 'Retrospektif — penyajian kembali komparatif & saldo laba awal', ref: '¶42', module: 'sad', amt: RESTATE.errRevenue },
      { id: 'c-pol',  item: 'Adopsi awal PSAK 73 — pendekatan retrospektif modifikasian', cat: 'policy', treat: 'Penyesuaian saldo laba awal (tanpa saji ulang komparatif)', ref: '¶19 · PSAK 73 C5', module: 'psak73', amt: null },
      { id: 'c-rcl',  item: 'Reklasifikasi lisensi perangkat lunak: Aset Tetap → Aset Takberwujud', cat: 'reclass', treat: 'Penyajian kembali pos komparatif (PSAK 1 ¶41)', ref: 'PSAK 1 ¶41', module: 'psak19', amt: null },
    ];

    /* === ROLL-FORWARD SALDO LABA — PENYAJIAN KEMBALI (¶42, ¶49) ===
       Komparatif FY2024 ditarik dari WTB kolom `ly`; koreksi neto pajak 22%. */
    const reOpenReported  = -jt(wtbVal(wtb, '3-2100', 'ly'));   // saldo laba awal th berjalan (= akhir PY) per buku
    const reCloseReported = -jt(wtbVal(wtb, '3-2100', 'adj'));  // saldo laba akhir per buku

    const pyRev  = -jt(wtbVal(wtb, '4-1100', 'ly'));
    const pyCogs =  jt(wtbVal(wtb, '5-1100', 'ly'));
    const pySell =  jt(wtbVal(wtb, '5-2100', 'ly'));
    const pyGA   =  jt(wtbVal(wtb, '5-3100', 'ly'));
    const pyFin  =  jt(wtbVal(wtb, '5-4100', 'ly'));
    const pyTax  =  jt(wtbVal(wtb, '5-5100', 'ly'));
    const pyAr   =  jt(wtbVal(wtb, '1-1200', 'ly'));
    const pyPbt  = pyRev - pyCogs - pySell - pyGA - pyFin;
    const pyNet  = pyPbt - pyTax;

    const errGross = RESTATE.errRevenue;
    const errTax   = Math.round(errGross * RATE);
    const errNet   = errGross - errTax;

    const revR = pyRev - errGross;
    const taxR = pyTax - errTax;
    const arR  = pyAr  - errGross;
    const pbtR = pyPbt - errGross;
    const netR = pbtR  - taxR;
    const reOpenRestated = reOpenReported - errNet;

    const impact = [
      { id: 'rev', label: 'Penjualan bersih',           rep: pyRev,  adj: -errGross, res: revR },
      { id: 'ar',  label: 'Piutang usaha',              rep: pyAr,   adj: -errGross, res: arR },
      { id: 'pbt', label: 'Laba sebelum pajak',         rep: pyPbt,  adj: -errGross, res: pbtR },
      { id: 'tax', label: 'Beban pajak penghasilan',    rep: pyTax,  adj: -errTax,   res: taxR },
      { id: 'net', label: 'Laba tahun berjalan',        rep: pyNet,  adj: -errNet,   res: netR, bold: true },
      { id: 're',  label: 'Saldo laba — akhir periode', rep: reOpenReported, adj: -errNet, res: reOpenRestated, bold: true },
    ];

    /* EPS dasar (¶49 mensyaratkan dampak ke laba per saham diungkapkan bila relevan) */
    const shares = RESTATE.parValue ? jt(wtbVal(wtb, '3-1100', 'adj')) * -1 / RESTATE.parValue * 1e6 / 1e6 : 0;
    // jt(modal) dlm juta rupiah; lembar = (modal juta * 1e6) / par. Hasil dlm juta lembar:
    const sharesM = RESTATE.parValue ? (-jt(wtbVal(wtb, '3-1100', 'adj'))) * 1e6 / RESTATE.parValue / 1e6 : 0;
    const eps = { reported: sharesM ? pyNet / sharesM : 0, restated: sharesM ? netR / sharesM : 0, sharesM };

    const restate = {
      errGross, errTax, errNet, reOpenReported, reCloseReported, reOpenRestated,
      py: { rev: pyRev, cogs: pyCogs, sell: pySell, ga: pyGA, fin: pyFin, tax: pyTax, ar: pyAr, pbt: pyPbt, net: pyNet },
      restated: { rev: revR, tax: taxR, ar: arR, pbt: pbtR, net: netR },
      impact, eps,
      material: true,            // restatement material → PSAK 1 ¶40A: sajikan posisi keuangan ketiga
      thirdBalanceSheet: true,
    };

    /* ringkasan klasifikasi untuk kartu/donut */
    const counts: Record<string, number> = { estimate: 0, policy: 0, error: 0, reclass: 0 };
    changes.forEach(c => { counts[c.cat] = (counts[c.cat] || 0) + 1; });

    return { estimates, estTotalCy, changes, counts, restate, rate: RATE };
  }

  /* ---------- PSAK 71 · Instrumen Keuangan (sumber kebenaran ECL & klasifikasi) ----------
     IFRS 9. Piutang usaha bruto ditarik dari WTB 1-1200; CKPN dibukukan klien &
     audited dari WTB 1-1210 — sehingga AJE-02 (tambahan CKPN) mengalir KONSISTEN ke
     modul PSAK 71, kalkulator ECL, reconcile(), PSAK 46 (DTA), PSAK 2 (add-back) &
     FS Generator. SATU model ECL di sini menggantikan duplikasi loss-rate yang dulu
     ada di view_calc & reconcile.

     Pendekatan piutang usaha: DISEDERHANAKAN (lifetime ECL, ¶5.5.15) via MATRIKS
     PROVISI. Eksposur per bucket = bobot aging (asumsi model) × gross WTB → terikat
     ke satu sumber. Loss rate historis disesuaikan OVERLAY FORWARD-LOOKING: skenario
     makroekonomi berbobot probabilitas (¶5.5.17). Rp juta. */
  const ECL_AGING = [
    { id: 'b0', label: 'Belum jatuh tempo', stage: 1, weight: 0.636, histRate: 1.0,  sicr: false },
    { id: 'b1', label: '1\u201330 hari',    stage: 1, weight: 0.189, histRate: 2.5,  sicr: false },
    { id: 'b2', label: '31\u201390 hari',   stage: 2, weight: 0.103, histRate: 9.0,  sicr: true  },
    { id: 'b3', label: '91\u2013180 hari',  stage: 3, weight: 0.042, histRate: 25.0, sicr: true  },
    { id: 'b4', label: '> 180 hari',        stage: 3, weight: 0.030, histRate: 63.0, sicr: true  },
  ];
  /* skenario forward-looking (¶5.5.17) — overlay makro berbobot probabilitas.
     overlay tertimbang = Σ prob × mult ≈ 1,0575 → menaikkan ECL basis historis. */
  const ECL_SCENARIOS = [
    { id: 'up',   label: 'Optimistis', prob: 0.20, mult: 0.85, macro: 'PDB +5,2% \u00b7 inflasi terkendali' },
    { id: 'base', label: 'Dasar',      prob: 0.55, mult: 1.00, macro: 'PDB +5,0% \u00b7 suku bunga stabil' },
    { id: 'down', label: 'Pesimistis', prob: 0.25, mult: 1.35, macro: 'PDB +3,8% \u00b7 tekanan likuiditas ritel' },
  ];
  /* riwayat penghapusbukuan & pemulihan piutang (sub-ledger / memo manajemen) — SATU
     sumber untuk tab Forward-Looking (basis ekspektasi loss rate independen) DAN
     roll-forward CKPN. Entri ber-flag `current` = tahun berjalan (mengalir ke mutasi
     CKPN). Tren recovery menurun → dasar menaikkan loss rate Stage 3. Rp juta. */
  const ECL_HISTORY = [
    { y: 2022, writeOff: 1180, recovery: 410 },
    { y: 2023, writeOff: 1340, recovery: 380 },
    { y: 2024, writeOff: 1420, recovery: 240 },
    { y: 2025, writeOff: 1485, recovery: 165, current: true },
  ];

  function psak71(wtb?: WTB) {
    const grossAudited = jt(wtbVal(wtb, '1-1200', 'adj'));     // piutang bruto audited (= dasar matriks)
    const grossUnadj   = jt(wtbVal(wtb, '1-1200', 'unadj'));   // bruto pra-audit (sebelum AJE-03 piutang fiktif)
    const grossPy      = jt(wtbVal(wtb, '1-1200', 'ly'));      // bruto PY audited
    const ckpnBooked   = -jt(wtbVal(wtb, '1-1210', 'unadj'));  // CKPN dibukukan klien (magnitudo)
    const ckpnAudited  = -jt(wtbVal(wtb, '1-1210', 'adj'));    // CKPN audited (setelah AJE-02)
    const ckpnPy       = -jt(wtbVal(wtb, '1-1210', 'ly'));     // CKPN awal (PY audited)
    const ckpnAje      = -jt(wtbVal(wtb, '1-1210', 'aje'));    // tambahan via AJE-02 (magnitudo, +)

    const overlay = ECL_SCENARIOS.reduce((a, s) => a + s.prob * s.mult, 0);

    const buckets = ECL_AGING.map(b => {
      const gross   = grossAudited * b.weight;          // eksposur bruto per bucket (terikat WTB)
      const baseEcl = gross * b.histRate / 100;         // ECL basis matriks historis
      const rate    = b.histRate * overlay;             // loss rate efektif (stlh overlay)
      const ecl     = baseEcl * overlay;                // ECL forward-looking
      return { ...b, gross, baseEcl, rate, ecl };
    });
    const grossTot   = buckets.reduce((a, b) => a + b.gross, 0);
    const baseTot     = buckets.reduce((a, b) => a + b.baseEcl, 0);
    const eclModel    = buckets.reduce((a, b) => a + b.ecl, 0);   // ECL per model auditor (forward-looking)
    const overlayAmt  = eclModel - baseTot;                       // dampak overlay makro
    const coverage    = grossTot ? eclModel / grossTot : 0;

    const gap          = eclModel - ckpnBooked;     // under-provision: model − dibukukan klien → dasar AJE-02
    const auditVariance = eclModel - ckpnAudited;   // model vs saldo audited (≈0, dalam toleransi)

    const stages = [1, 2, 3].map(st => {
      const bs = buckets.filter(b => b.stage === st);
      const gross = bs.reduce((a, b) => a + b.gross, 0);
      const ecl   = bs.reduce((a, b) => a + b.ecl, 0);
      return { stage: st, gross, ecl, coverage: gross ? ecl / gross : 0, n: bs.length };
    });

    /* mutasi CKPN (roll-forward) — write-off & recovery DITARIK dari ECL_HISTORY (satu sumber,
       entri tahun berjalan) bukan angka lepas; charge adalah derivasi-plug agar saldo menutup
       PERSIS ke WTB (pola sama dgn modul lain). */
    const histCurr      = ECL_HISTORY.find(h => h.current) || ECL_HISTORY[ECL_HISTORY.length - 1];
    const writeOff      = histCurr.writeOff;                          // piutang dihapusbukukan th berjalan
    const recovery      = histCurr.recovery;                          // pemulihan piutang telah dihapusbukukan
    const chargeClient  = ckpnBooked - ckpnPy + writeOff - recovery;  // beban penurunan nilai per buku klien
    const chargeAudited = chargeClient + ckpnAje;                     // setelah AJE-02 (= menutup ke ckpnAudited)

    return {
      grossAudited, grossUnadj, grossPy,
      ckpnBooked, ckpnAudited, ckpnPy, ckpnAje,
      overlay, buckets, grossTot, baseTot, eclModel, overlayAmt, coverage,
      gap, auditVariance, stages,
      writeOff, recovery, chargeClient, chargeAudited,
      history: ECL_HISTORY.map(h => ({ ...h })),
      scenarios: ECL_SCENARIOS.map(s => ({ ...s })), aging: ECL_AGING.map(b => ({ ...b })),
      rate: RATE,
    };
  }

  /* ---------- PSAK 68 · Pengukuran Nilai Wajar (IFRS 13) ----------
     Modul "hub pengukuran". PSAK 68 TIDAK memiliki saldo sendiri — ia
     mengatur BAGAIMANA nilai wajar diukur & diungkap untuk pos yang
     pengakuannya diatur standar lain. Karena itu setiap angka DITARIK
     dari sumber yang SAMA dengan modul pemiliknya, bukan di-hardcode
     ulang:
       · Obligasi (SUN) / forward valas / saham privat → FV_PORTFOLIO,
         seed kanonik yang SAMA dipakai view PSAK 71 untuk pos non-WTB
         (FVOCI/FVTPL). Satu definisi, dua konsumen — tanpa duplikasi.
       · Tanah & bangunan (model revaluasi) → laporan penilai KJPP
         (Pakar · WP V-2, Rp 84.500 jt) yang juga dirujuk modul
         Penggunaan Pakar & Specifics (V-2) dan dipakai PSAK 16.
     Output: tabel hierarki (Level 1/2/3), teknik valuasi & input,
     roll-forward Level 3 + sensitivitas input tak teramati (¶91-99),
     serta dampak pajak tangguhan (OCI) yang dirujuk PSAK 46. Rp juta. */
  const FV_PORTFOLIO: Array<{ id: string; p71id?: string; side?: string; label: string; std: string; cls: string; level: number; recurring: boolean; fv: number; module: string; expert?: string; approach: string; technique: string; inputs: Array<{ k: string; obs: boolean; val: string; range?: string }>; hbu: string | null; note: string }> = [
    { id: 'sun',    p71id: 'bond',   side: 'aset', label: 'Obligasi pemerintah (SUN)',
      std: 'PSAK 71 · FVOCI', cls: 'FVOCI', level: 1, recurring: true, fv: 4200, module: 'psak71',
      approach: 'pasar', technique: 'Harga kuotasi pasar aktif (IBPA/IDX)',
      inputs: [{ k: 'Harga kuotasi pasar aktif', obs: true, val: 'IBPA · tanggal pelaporan' }],
      hbu: null, note: 'Untung/rugi belum direalisasi diakui di OCI' },
    { id: 'fwd',    p71id: 'fwd',    side: 'aset', label: 'Kontrak forward valas (lindung nilai)',
      std: 'PSAK 71 · FVTPL', cls: 'FVTPL', level: 2, recurring: true, fv: 6400, module: 'psak71', expert: 'V-3',
      approach: 'penghasilan', technique: 'Diskonto arus kas forward (mark-to-model)',
      inputs: [{ k: 'Kurva forward USD/IDR', obs: true, val: 'Penyedia data pasar' }, { k: 'Faktor diskonto OIS', obs: true, val: 'Kurva OIS' }, { k: 'Penyesuaian risiko kredit (CVA/DVA)', obs: false, val: 'Disesuaikan', range: '±0,3%' }],
      hbu: null, note: 'Valuasi Pakar Auditor · IFRS 13 ¶42 (CVA/DVA)' },
    { id: 'equity', p71id: 'equity', side: 'aset', label: 'Penyertaan saham non-pengendali (privat)',
      std: 'PSAK 71 · FVOCI elektif', cls: 'FVOCI', level: 3, recurring: true, fv: 2100, module: 'psak71',
      approach: 'pasar+penghasilan', technique: 'Kelipatan EV/EBITDA pembanding + DCF',
      inputs: [{ k: 'Kelipatan EV/EBITDA', obs: false, val: '6,5×', range: '5,5×–7,5×' }, { k: 'Tingkat diskonto (WACC)', obs: false, val: '15,5%', range: '14%–17%' }, { k: 'Diskon ketiadaan pemasaran (DLOM)', obs: false, val: '20%' }],
      hbu: null, note: 'Entitas privat — tanpa harga kuotasi (¶5.7.5)' },
    { id: 'land',   side: 'aset', label: 'Tanah — model revaluasi',
      std: 'PSAK 16 · Revaluasi', cls: 'Revaluasi', level: 2, recurring: true, fv: 52000, module: 'psak16', expert: 'V-2',
      approach: 'pasar', technique: 'Data pembanding penjualan (sales comparison)',
      inputs: [{ k: 'Harga tanah pembanding /m²', obs: true, val: 'Rp 3,2 jt/m²' }, { k: 'Penyesuaian lokasi, luas & bentuk', obs: true, val: 'Kuantitatif' }],
      hbu: 'Penggunaan saat ini (kawasan industri) = penggunaan tertinggi & terbaik', note: 'KJPP Mitra · SPI/IVS · WP V-2' },
    { id: 'build',  side: 'aset', label: 'Bangunan & prasarana — model revaluasi',
      std: 'PSAK 16 · Revaluasi', cls: 'Revaluasi', level: 3, recurring: true, fv: 32500, module: 'psak16', expert: 'V-2',
      approach: 'biaya', technique: 'Biaya pengganti terdepresiasi (DRC)',
      inputs: [{ k: 'Biaya pembangunan baru /m²', obs: false, val: 'Rp 6,8 jt/m²', range: '6,2–7,4' }, { k: 'Penyusutan fisik & keusangan fungsional', obs: false, val: '38%', range: '34%–42%' }],
      hbu: 'Penggunaan saat ini (fasilitas produksi)', note: 'KJPP Mitra · DRC · input signifikan tak teramati' },
  ];

  function psak68(wtb?: WTB) {
    const items = FV_PORTFOLIO.map(it => ({
      ...it,
      nObs: it.inputs.filter(i => i.obs).length,
      nUnobs: it.inputs.filter(i => !i.obs).length,
    }));
    const total = items.reduce((a, x) => a + x.fv, 0);
    const byLevel = [1, 2, 3].map(L => {
      const list = items.filter(i => i.level === L);
      const amt = list.reduce((a, x) => a + x.fv, 0);
      return { level: L, amt, pct: total ? amt / total : 0, n: list.length, items: list };
    });
    const get = (id: string) => items.find(i => i.id === id);
    const finItems   = items.filter(i => i.module === 'psak71');
    const finTotal   = finItems.reduce((a, x) => a + x.fv, 0);   // 12.700 — SAMA dgn pos FV non-WTB di PSAK 71
    const reval      = items.filter(i => i.cls === 'Revaluasi');
    const revalTotal = reval.reduce((a, x) => a + x.fv, 0);      // 84.500 — SAMA dgn laporan KJPP (V-2)
    const l3         = items.filter(i => i.level === 3);
    const l3Total    = l3.reduce((a, x) => a + x.fv, 0);         // 34.600
    const recurringTot = items.filter(i => i.recurring).reduce((a, x) => a + x.fv, 0);

    /* roll-forward Level 3 (¶93e) — menutup persis ke l3Total */
    const l3RF = { opening: 31200, additions: 600, gainsPl: 0, gainsOci: 2800, transfersIn: 0, transfersOut: 0, settlements: 0, closing: 0 };
    l3RF.closing = l3RF.opening + l3RF.additions + l3RF.gainsPl + l3RF.gainsOci + l3RF.transfersIn - l3RF.transfersOut - l3RF.settlements;

    /* sensitivitas input signifikan tak teramati (¶93h) — dampak ke NW (Rp juta) */
    const fvBuild = get('build')!.fv, fvEq = get('equity')!.fv;
    const sens = [
      { item: 'build', label: 'Bangunan · biaya pengganti /m²', shock: '±5%', fav: Math.round(fvBuild * 0.05), unf: -Math.round(fvBuild * 0.05) },
      { item: 'build', label: 'Bangunan · tingkat penyusutan', shock: '∓5 pp', fav: Math.round(fvBuild * 0.08), unf: -Math.round(fvBuild * 0.08) },
      { item: 'equity', label: 'Saham · kelipatan EV/EBITDA', shock: '±0,5×', fav: Math.round(fvEq * 0.077), unf: -Math.round(fvEq * 0.077) },
      { item: 'equity', label: 'Saham · tingkat diskonto WACC', shock: '∓1%', fav: Math.round(fvEq * 0.085), unf: -Math.round(fvEq * 0.085) },
    ];
    const sensFav = sens.reduce((a, s) => a + s.fav, 0);
    const sensUnf = sens.reduce((a, s) => a + s.unf, 0);

    /* dampak pajak tangguhan (PSAK 46) atas surplus revaluasi & FVOCI → diakui di OCI */
    const revalSurplusYr = l3RF.gainsOci;                 // kenaikan NW diakui OCI th berjalan
    const dtlOci = Math.round(revalSurplusYr * RATE);     // liabilitas pajak tangguhan di OCI (22%)

    /* transfer antar level (¶93c,e) */
    const transfers = { in: 0, out: 0, note: 'Tidak ada transfer antar Level pada periode berjalan; kebijakan menetapkan transfer diakui pada akhir periode pelaporan.' };

    return {
      items, total, byLevel, get,
      finItems, finTotal, reval, revalTotal,
      l3, l3Total, recurringTot, l3RF, sens, sensFav, sensUnf,
      revalSurplusYr, dtlOci, transfers, rate: RATE,
    };
  }

  /* ---------- PSAK 48 · Penurunan Nilai Aset (Impairment of Assets) ----------
     IAS 36. Modul ini TIDAK menyimpan saldo sendiri: nilai tercatat tiap pos
     yang diuji ditarik dari modul pemiliknya yang ber-sumber WTB —
       · Aset tetap (neto)            → fixedAssets(wtb)  ← WTB 1-2100/1-2110
       · Aset takberwujud (terbatas)  → intangibles(wtb)  ← WTB 1-2400/1-2410
       · Aset hak-guna (ROU)          → figuresFromWTB    ← WTB 1-2300
       · Lisensi umur tak-terbatas    → intangibles().indefCarry/recoverable (uji ¶10)
     Goodwill akuisisi (PSAK 22) adalah satu-satunya angka seed non-WTB di sini
     (tak punya akun GL tunggal) — dialokasikan ke UPK & diuji tahunan (¶90).
     Jumlah terpulihkan UPK = nilai pakai (value-in-use) via DCF; rugi penurunan
     nilai = max(0, tercatat − terpulihkan). Selaras dgn SA 540 (E-05 goodwill) &
     SA 701 (KAM-3). Rp juta. */
  const GOODWILL = 6800;        // goodwill akuisisi (alokasi PPA · PSAK 22) — diuji tahunan
  const P48 = { wacc: 0.135, growth: 0.030, terminal: 0.030, years: 5, cf1: 17800 };
  /* indikator penurunan nilai (¶12) — sumber eksternal & internal */
  const P48_INDICATORS = [
    { id: 'ext-cap',   scope: 'Eksternal', t: 'Kapitalisasi pasar < nilai tercatat aset neto entitas', present: false },
    { id: 'ext-rate',  scope: 'Eksternal', t: 'Kenaikan suku bunga pasar menaikkan tingkat diskonto (WACC)', present: true,  note: 'WACC naik ±50 bps YoY → menekan nilai pakai' },
    { id: 'ext-tech',  scope: 'Eksternal', t: 'Perubahan teknologi / pasar / hukum yang merugikan entitas', present: false },
    { id: 'int-obs',   scope: 'Internal',  t: 'Bukti keusangan atau kerusakan fisik aset', present: true,  note: 'SKU & lini tertentu lambat-bergerak (rujuk PSAK 14)' },
    { id: 'int-perf',  scope: 'Internal',  t: 'Kinerja ekonomik aset lebih buruk dari ekspektasi', present: false },
    { id: 'int-plan',  scope: 'Internal',  t: 'Rencana restrukturisasi / penghentian / pelepasan operasi', present: false },
  ];

  /* nilai pakai (value-in-use, ¶30-57): DCF arus kas pra-pajak + nilai terminal */
  function valueInUse(cf1: number, growth: number, wacc: number, years: number, tg: number) {
    let pv = 0, cf = cf1;
    const flows = [];
    for (let y = 1; y <= years; y++) {
      const disc = cf / Math.pow(1 + wacc, y);
      flows.push({ y, cf, pv: disc });
      pv += disc; cf = cf * (1 + growth);
    }
    const cfTerm = cf * (1 + tg);                       // arus kas tahun (years+1)
    const tv = cfTerm / (wacc - tg);                    // nilai terminal pada akhir tahun `years`
    const tvPv = tv / Math.pow(1 + wacc, years);
    return { pv: pv + tvPv, explicitPv: pv, tv, tvPv, flows };
  }

  function psak48(wtb?: WTB) {
    const s = figuresFromWTB(wtb);
    const fa = fixedAssets(wtb);
    const intan = intangibles(wtb);
    const R = Math.round;

    /* —— komposisi nilai tercatat UPK Operasi Inti — tiap baris ditarik dari sumbernya —— */
    const parts = [
      { id: 'ppe',     label: 'Aset tetap — nilai tercatat neto',       module: 'psak16', route: 'psak16', code: '1-2100 / 1-2110', val: R(fa.netClose) },
      { id: 'intanFin',label: 'Aset takberwujud berumur terbatas',      module: 'psak19', route: 'psak19', code: '1-2400 / 1-2410', val: R(intan.finiteCarry) },
      { id: 'rou',     label: 'Aset hak-guna (ROU · PSAK 73)',          module: 'psak73', route: 'psak73', code: '1-2300',          val: R(s.rouCarry) },
      { id: 'gw',      label: 'Goodwill akuisisi (PSAK 22)',            module: 'psak48', route: 'psak48', code: 'alokasi PPA',      val: GOODWILL },
    ];
    const carry = parts.reduce((a, p) => a + p.val, 0);   // tercatat UPK (incl. goodwill)

    /* —— jumlah terpulihkan = nilai pakai (DCF) —— */
    const viu = valueInUse(P48.cf1, P48.growth, P48.wacc, P48.years, P48.terminal);
    const recoverable = R(viu.pv);
    const headroom = recoverable - carry;
    const headroomPct = carry ? headroom / carry : 0;
    const impairLoss = Math.max(0, carry - recoverable);  // 0 bila terpulihkan > tercatat

    /* —— sensitivitas (¶134f) — pergeseran asumsi utama vs headroom —— */
    const mkSens = (label: string, shock: string, w: number, g: number, c: number) => {
      const rec = R(valueInUse(P48.cf1 * c, g, w, P48.years, P48.terminal).pv);
      return { label, shock, rec, head: rec - carry };
    };
    const sens = [
      mkSens('Tingkat diskonto (WACC) +1%', '+1,0 pp', P48.wacc + 0.01, P48.growth, 1),
      mkSens('Tingkat diskonto (WACC) −1%', '−1,0 pp', P48.wacc - 0.01, P48.growth, 1),
      mkSens('Pertumbuhan terminal −0,5%', '−0,5 pp', P48.wacc, P48.growth - 0.005, 1),
      mkSens('Arus kas dasar −5%', '−5%', P48.wacc, P48.growth, 0.95),
    ];

    /* —— uji tahunan lisensi umur tak-terbatas (¶10) — reuse perhitungan PSAK 19 —— */
    const license = {
      carry: R(intan.indefCarry), recoverable: R(intan.recoverable),
      headroom: R(intan.recoverable - intan.indefCarry), impairLoss: R(intan.impairLoss),
    };

    const tested = carry + license.carry;
    const totalImpair = impairLoss + license.impairLoss;
    const cgu = { id: 'inti', label: 'UPK Operasi Inti (incl. goodwill)', parts, carry, recoverable, headroom, headroomPct, impairLoss, viu };

    return { cgu, parts, carry, recoverable, headroom, headroomPct, impairLoss, viu, sens,
             license, tested, totalImpair, goodwill: GOODWILL, params: P48,
             indicators: P48_INDICATORS, indicatorCount: P48_INDICATORS.filter(i => i.present).length };
  }

  /* ---------- PSAK 57 · Provisi, Liabilitas Kontinjensi & Aset Kontinjensi ----------
     IAS 37. Register kanonik provisi & klaim — SUMBER TUNGGAL yang juga dibaca modul
     SA 501 (litigasi) & SA 540 (estimasi garansi). Klasifikasi (provisi diakui /
     liabilitas kontinjensi diungkap / remote tak diungkap) DITURUNKAN dari tingkat
     kemungkinan via pohon keputusan (¶14, ¶27, ¶86) — bukan di-hardcode ganda.
     Provisi diakui menutup ke roll-forward (¶84). Beda temporer dapat dikurangkan
     mengalir ke PSAK 46 (deductible saat realisasi). Rp juta. */
  const PROV_REGISTER = [
    { id: 'PRV-WAR', kind: 'warranty',  party: 'Provisi Garansi Produk', nature: 'Produk',
      claim: 1080, estimate: 1080, likely: 'Besar Kemungkinan', counsel: 'Internal · QA',
      resp: true, status: 'Berjalan', module: 'sa540', ref: 'E-03', deductibleTemp: true,
      assess: 'Tingkat klaim historis 36 bln × penjualan bergaransi; telaah retrospektif PY akurat (−6%).',
      roll: { opening: 1150, addl: 980, used: 1050, reversed: 0, unwind: 0 } },
    { id: 'LIT-02', kind: 'litigation', party: 'Gugatan Wanprestasi — PT Mitra Logistik', nature: 'Komersial',
      claim: 3400, estimate: 3400, likely: 'Besar Kemungkinan', counsel: 'Hadiputranto & Rekan',
      resp: true, status: 'Mediasi', module: 'sa501', deductibleTemp: false,
      assess: 'Kemungkinan kalah tinggi; provisi penuh dibentuk atas nilai klaim.',
      roll: { opening: 0, addl: 3400, used: 0, reversed: 0, unwind: 0 } },
    { id: 'LIT-01', kind: 'litigation', party: 'Sengketa Pajak — DJP (SKPKB PPN 2023)', nature: 'Pajak',
      claim: 8600, estimate: 2100, likely: 'Mungkin', counsel: 'Hadiputranto & Rekan',
      resp: true, status: 'Banding · Pengadilan Pajak',
      assess: 'Peluang menang ±60%; banding berjalan. Arus keluar mungkin, tidak besar kemungkinan.' },
    { id: 'LIT-04', kind: 'litigation', party: 'Klaim Garansi Produk — kolektif', nature: 'Produk',
      claim: 1500, estimate: 600, likely: 'Mungkin', counsel: 'Internal Legal',
      resp: false, status: 'Negosiasi',
      assess: 'Menunggu konfirmasi penasihat hukum eksternal; arus keluar mungkin.' },
    { id: 'LIT-03', kind: 'litigation', party: 'Klaim Ketenagakerjaan — eks-karyawan (PHK)', nature: 'Ketenagakerjaan',
      claim: 950, estimate: 0, likely: 'Kecil', counsel: 'Internal Legal',
      resp: true, status: 'PHI tingkat I',
      assess: 'Kemungkinan kalah kecil (remote); tidak diakui maupun diungkap.' },
  ];
  /* kemungkinan → perlakuan akuntansi (pohon keputusan ¶14/27/86) */
  const P57_TREAT: Record<string, { treat: string; disc: string; kind: string }> = {
    'Besar Kemungkinan': { treat: 'provision',  disc: 'Provisi diakui',          kind: 'red'  },
    'Mungkin':           { treat: 'contingent', disc: 'Diungkap (kontinjensi)',  kind: 'amber'},
    'Kecil':             { treat: 'remote',     disc: 'Tidak diungkap',          kind: 'gray' },
  };

  function psak57(wtb?: WTB) {
    const R = Math.round;
    const items = PROV_REGISTER.map(p => {
      const m = P57_TREAT[p.likely] || P57_TREAT['Mungkin'];
      return { ...p, ...m,
        recognized: m.treat === 'provision' ? p.estimate : 0,
        contingent: m.treat === 'contingent' ? p.claim : 0,
        remote:     m.treat === 'remote' ? p.claim : 0 };
    });
    const provisionTotal  = items.reduce((a, i) => a + i.recognized, 0);   // 4.480 (garansi 1.080 + LIT-02 3.400)
    const contingentTotal = items.reduce((a, i) => a + i.contingent, 0);   // 10.100 (LIT-01 8.600 + LIT-04 1.500)
    const remoteTotal     = items.reduce((a, i) => a + i.remote, 0);       // 950
    const claimExposure   = items.reduce((a, i) => a + i.claim, 0);

    /* roll-forward provisi (¶84) — agregat pos yang diakui */
    const rf = items.filter(i => i.roll).reduce((a, i) => ({
      opening: a.opening + i.roll!.opening, addl: a.addl + i.roll!.addl,
      used: a.used + i.roll!.used, reversed: a.reversed + i.roll!.reversed,
      unwind: a.unwind + i.roll!.unwind,
    }), { opening: 0, addl: 0, used: 0, reversed: 0, unwind: 0 } as Record<string, number>);
    rf.closing = rf.opening + rf.addl - rf.used - rf.reversed + rf.unwind;
    const rollTies = Math.abs(rf.closing - provisionTotal) <= 1;

    /* dampak pajak tangguhan (PSAK 46): provisi deductible saat realisasi → beda temporer.
       Komponen yang dimodelkan ke PSAK 46 = FISCAL.provisi (porsi garansi). Provisi
       litigasi LIT-02 tidak deductible hingga penyelesaian hukum → tidak dimodelkan. */
    const tempDiffModeled = FISCAL.provisi;                          // 900 — dipakai PSAK 46 'prv'
    const tempDiffPotensi = items.filter(i => i.deductibleTemp).reduce((a, i) => a + i.recognized, 0); // 1.080
    const dtAsset = R(tempDiffModeled * RATE);                       // aset pajak tangguhan provisi

    const counts: Record<string, number> = { provision: 0, contingent: 0, remote: 0 };
    items.forEach(i => { counts[i.treat] = (counts[i.treat] || 0) + 1; });

    return { items, provisionTotal, contingentTotal, remoteTotal, claimExposure,
             rf, rollTies, tempDiffModeled, tempDiffPotensi, dtAsset, counts,
             litigation: items.filter(i => i.kind === 'litigation'),
             treatMap: P57_TREAT, rate: RATE };
  }

  /* ============================================================
     PSAK 58 · Aset Tidak Lancar Dimiliki untuk Dijual & Operasi
     yang Dihentikan (IFRS 5)
     Modul ini TIDAK menyimpan saldo sendiri. Nilai tercatat disposal
     group ditarik dari modul sumber yang sama ber-WTB:
       · Register Aset Tetap (PSAK 16) → assetRegister(wtb) ← WTB 1-2100/1-2110
         (anggota grup dipilih per nomor tag — nilai buku neto per aset
          mengikuti roll-forward PSAK 16 & koreksi AJE-05 secara live)
       · Pendapatan segmen dihentikan → revenue(wtb) ← WTB 4-1100 (PSAK 72)
       · Laba bersih total → FSGEN.buildModel(wtb).is.netIncome
       · Nilai wajar grup → appraisal KJPP (PSAK 68, input Level 2/3) —
         satu-satunya input independen (nilai wajar memang estimasi eksternal)
     Pengukuran: lower of carrying amount & fair value less costs to sell
     (¶15); penyusutan dihentikan (¶25); rugi penurunan reklasifikasi
     (¶20) mengalir ke hasil operasi dihentikan (¶33). Penyajian terpisah
     di Neraca (¶38) & jumlah tunggal di Laba Rugi (¶33a). Rp juta. */

export { RESTATE, psak25, ECL_AGING, ECL_SCENARIOS, ECL_HISTORY, psak71, FV_PORTFOLIO, psak68, GOODWILL, P48, P48_INDICATORS, valueInUse, psak48, PROV_REGISTER, P57_TREAT, psak57 };
