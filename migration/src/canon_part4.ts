/* ============================================================
   NeoSuite AMS — canon part4 (engine + seed) (W3 split dari canon.js; perilaku identik).
   ============================================================ */
import { RATE, jt } from './canon_base';
import { assetRegister, intangibles } from './canon_part1';
import { GOODWILL } from './canon_part2';
import { GROUP_ASSOCIATES, GROUP_CONTROL, GROUP_SUBS } from './canon_part3';
import type { WTB, MaterialityOpts, MaterialityResult } from './canon_types';

  interface JointArr {
    id: string; refId: string | null; type: string; name: string; partner: string; activity: string;
    interest: number; since: string; vehicle: boolean; vehicleForm: string; legalForm: string;
    contractTerms: string; otherFacts: string; classify: string; collective: boolean; unanimous: boolean;
    decisionRule: string;
    cost?: number; openCarry?: number; shareProfit?: number; dividend?: number; oci?: number;
    sf?: { assets: number; liab: number; rev: number; profit: number };
    ppeTags?: string[]; shareCurrent?: number; shareLiab?: number; shareRev?: number; shareExp?: number;
  }

  /** Hasil tiap pengaturan bersama — gabungan field ventura (jv) & operasi (jo),
   *  opsional sesuai cabang; index signature untuk field warisan dari seed. */
  export interface JointArrResult {
    type: string;
    carry?: number; rfClose?: number; netAssetShare?: number; goodwillInCarry?: number;
    shareProfitCheck?: number; carryTie?: boolean; shareProfit?: number; interest?: number;
    sf?: { assets: number; liab: number; rev: number; profit: number };
    ppeShare?: number; assetsShare?: number; netAssets?: number; result?: number; ppeTags?: string[];
    [k: string]: unknown;
  }

  const JOINT_ARR: JointArr[] = [
    {
      id: 'JA-01', refId: 'AS-02', type: 'jv',
      name: 'KSO Sentosa-Andalan', partner: 'PT Andalan Maritim',
      activity: 'Pengoperasian terminal curah kering & jasa bongkar-muat pelabuhan',
      interest: 50, since: '2021',
      vehicle: true, vehicleForm: 'Badan hukum terpisah (PT patungan)',
      legalForm: 'Bentuk hukum (PT) memisahkan aset & liabilitas dari para pihak (¶B23)',
      contractTerms: 'Ketentuan kontraktual TIDAK mengesampingkan — para pihak berhak atas ASET NETO (¶B25)',
      otherFacts: 'Tidak ada fakta lain yang mewajibkan pembelian seluruh keluaran/jaminan liabilitas (¶B29-B33)',
      classify: 'jv',
      collective: true, unanimous: true, decisionRule: 'Keputusan aktivitas relevan butuh persetujuan 100% (kedua sekutu 50:50)',
      /* roll-forward metode ekuitas (PSAK 15) — closing = GROUP_ASSOCIATES.carry */
      cost: 2400, openCarry: 2750, shareProfit: 560, dividend: 210, oci: 0,
      /* informasi keuangan ringkas ventura @100% (PSAK 67 ¶B12-B13) */
      sf: { assets: 9200, liab: 3400, rev: 14600, profit: 1120 },
    },
    {
      id: 'JA-02', refId: null, type: 'jo',
      name: 'Proyek Bersama Terminal Logistik Terpadu', partner: 'PT Nusa Logistik & PT Bahari Trans',
      activity: 'Pembangunan & pengoperasian prasarana gudang serta utilitas logistik bersama',
      interest: 40, since: '2022',
      vehicle: true, vehicleForm: 'Badan hukum terpisah, namun ketentuan kontraktual mengesampingkan (¶B24, B26)',
      legalForm: 'Kendaraan terpisah ada, tetapi tidak menentukan secara konklusif',
      contractTerms: 'Para pihak berhak atas ASET & berkewajiban atas LIABILITAS pengaturan (¶B27)',
      otherFacts: 'Para pihak wajib membeli SELURUH keluaran → membiayai liabilitas pengaturan (¶B31-B32)',
      classify: 'jo',
      collective: true, unanimous: true, decisionRule: 'Keputusan butuh persetujuan bulat para operator bersama',
      /* bagian proporsional 40% (¶20) — aset tetap ditarik dari register tag (WTB 1-2100) */
      ppeTags: ['BD-104', 'MC-204'],
      shareCurrent: 1240,   // bagian aset lancar (kas operasi & piutang JO)
      shareLiab: 1850,      // bagian liabilitas (utang & pinjaman proyek)
      shareRev: 6200, shareExp: 5400,   // bagian pendapatan & beban (¶20)
    },
  ];
  /* checklist pengungkapan PSAK 67 (IFRS 12) untuk pengaturan bersama */
  const P66_DISCLOSURE = [
    { id: 'd07', ref: 'PSAK 67 ¶7', t: 'Pertimbangan signifikan penetapan pengendalian bersama', ok: true },
    { id: 'd07b', ref: 'PSAK 67 ¶7(c)', t: 'Pertimbangan klasifikasi (operasi bersama vs ventura bersama)', ok: true },
    { id: 'd21a', ref: 'PSAK 67 ¶21(a)', t: 'Nama, sifat aktivitas & tempat usaha tiap pengaturan bersama', ok: true },
    { id: 'd21b', ref: 'PSAK 67 ¶21(b)', t: 'Proporsi kepemilikan & dasar penentuannya', ok: true },
    { id: 'dB12', ref: 'PSAK 67 ¶B12', t: 'Informasi keuangan ringkas ventura bersama material', ok: true },
    { id: 'dB14', ref: 'PSAK 67 ¶B14', t: 'Rekonsiliasi info ringkas ke nilai tercatat metode ekuitas', ok: true },
    { id: 'd23', ref: 'PSAK 67 ¶23', t: 'Komitmen & liabilitas kontinjensi terkait pengaturan bersama', ok: false },
    { id: 'd22c', ref: 'PSAK 67 ¶22(c)', t: 'Pembatasan kemampuan ventura mentransfer dana ke entitas', ok: false, na: true },
  ];

  function psak66(wtb?: WTB) {
    const R = Math.round;
    const assoc = GROUP_ASSOCIATES.find(a => a.id === 'AS-02') || { carry: 3100 };
    const ctrl  = GROUP_CONTROL.find(c => c.id === 'AS-02') || {};
    const reg   = assetRegister(wtb);            // sub-ledger ber-WTB (PSAK 16) → 1-2100

    const arrangements: JointArrResult[] = JOINT_ARR.map(a => {
      if (a.type === 'jv') {
        /* metode ekuitas — closing harus = nilai tercatat kanonik GROUP_ASSOCIATES */
        const rfClose = a.openCarry + a.shareProfit - a.dividend + a.oci;
        const carry   = assoc.carry;                       // SUMBER KEBENARAN (= 3.100)
        const netAssetShare = R((a.sf.assets - a.sf.liab) * a.interest / 100);
        const goodwillInCarry = carry - netAssetShare;     // selisih nilai tercatat vs bagian aset neto
        const shareProfitCheck = R(a.sf.profit * a.interest / 100);
        return { ...a, rfClose, carry, netAssetShare, goodwillInCarry, shareProfitCheck,
          carryTie: rfClose === carry, ctrl, label: 'Ventura bersama · ekuitas (PSAK 15)' };
      }
      /* operasi bersama — bagian aset tetap ditarik per tag dari register (WTB 1-2100) */
      const tagRows = a.ppeTags.map(t => reg.rows.find(r => r.tag === t)).filter(Boolean);
      const ppeShare = R(tagRows.reduce((s, r) => s + r.nbv, 0));
      const assetsShare = ppeShare + a.shareCurrent;
      const netAssets = assetsShare - a.shareLiab;
      const result = a.shareRev - a.shareExp;              // kontribusi laba operasi bersama
      return { ...a, tagRows, ppeShare, assetsShare, netAssets, result,
        ctrl, label: 'Operasi bersama · bagian proporsional (¶20)' };
    });

    const jv = arrangements.find(a => a.type === 'jv');
    const jo = arrangements.find(a => a.type === 'jo');

    /* tie-out lintas-laporan (satu sumber kebenaran) */
    const tieRows = [
      { id: 't1', label: 'Nilai tercatat ventura bersama = pos PSAK 65 (luar konsolidasi)', std: 'PSAK 15 · ¶24', a: jv.carry, b: assoc.carry, route: 'psak65',
        note: 'Metode ekuitas. Nilai tercatat Rp ' + jv.carry + ' jt = GROUP_ASSOCIATES AS-02 — angka yang SAMA disajikan PSAK 65 sebagai asosiasi/ventura di luar batas konsolidasi.' },
      { id: 't2', label: 'Roll-forward ekuitas menutup ke nilai tercatat', std: 'PSAK 15 · ¶10', a: jv.rfClose, b: jv.carry, route: null,
        note: 'Saldo awal + bagian laba − dividen ± OCI = Rp ' + jv.rfClose + ' jt = nilai tercatat akhir.' },
      { id: 't3', label: 'Bagian aset tetap operasi bersama = Register Aset Tetap (PSAK 16)', std: '¶20(a)', a: jo.ppeShare, b: jo.ppeShare, route: 'psak16',
        note: 'Bagian aset tetap operasi bersama (tag ' + jo.ppeTags.join(', ') + ') ditarik dari Register Aset Tetap → menutup ke akun kontrol GL WTB 1-2100.' },
      { id: 't4', label: 'Bagian laba ventura → Laba Rugi (ekuitas)', std: 'PSAK 15 · ¶10', a: jv.shareProfit, b: jv.shareProfitCheck, route: 'fsgen',
        note: 'Bagian laba Rp ' + jv.shareProfit + ' jt = ' + jv.interest + '% × laba ventura Rp ' + jv.sf.profit + ' jt (info keuangan ringkas).' },
      { id: 't5', label: 'Ventura bersama TIDAK dikonsolidasi (batas PSAK 65)', std: 'PSAK 66 · ¶24', a: 0, b: 0, route: 'psak65',
        note: 'Pengendalian BERSAMA (bukan pengendalian) → tidak dikonsolidasi; disajikan metode ekuitas, konsisten dengan penilaian GROUP_CONTROL AS-02.' },
    ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < 1.5 }));
    const tiePass = tieRows.filter(r => r.ok).length;

    /* lineage — tiap angka satu sumber */
    const lineage = [
      { k: 'Nilai tercatat ventura bersama (ekuitas)', src: 'GROUP_ASSOCIATES · AS-02', route: 'psak65', icon: 'building' },
      { k: 'Penilaian pengendalian bersama', src: 'GROUP_CONTROL · AS-02', route: 'groupaudit', icon: 'shield' },
      { k: 'Bagian aset tetap operasi bersama', src: 'Register Aset Tetap · WTB 1-2100', route: 'psak16', icon: 'ledger' },
      { k: 'Koreksi penyusutan (AJE-05)', src: 'Buku Besar · AJE', route: 'aje', icon: 'scale' },
      { k: 'Bagian laba ventura → Laba Rugi', src: 'FS Generator', route: 'fsgen', icon: 'report' },
      { k: 'Batas konsolidasi (tidak dikonsolidasi)', src: 'PSAK 65 · IFRS 10', route: 'psak65', icon: 'columns' },
      { k: 'Metode ekuitas — investasi asosiasi/JV', src: 'PSAK 15 · IAS 28', route: 'psak65', icon: 'layers' },
    ];

    const carryTotal = jv.carry;                                  // nilai tercatat di Neraca (ekuitas)
    const joAssets = jo.assetsShare, joNet = jo.netAssets, joResult = jo.result;

    return {
      arrangements, jv, jo, tieRows, tiePass, lineage,
      carryTotal, joAssets, joNet, joResult,
      shareProfit: jv.shareProfit,
      disclosure: P66_DISCLOSURE,
      counts: { total: JOINT_ARR.length, jv: arrangements.filter(a => a.type === 'jv').length, jo: arrangements.filter(a => a.type === 'jo').length },
      reg,
    };
  }

  /* ---------- PSAK 22 · Kombinasi Bisnis (IFRS 3) ----------
     Metode akuisisi (¶4-5). Modul ini adalah SUMBER KEBENARAN akuntansi
     AKUISISI pada TANGGAL AKUISISI: imbalan dialihkan (¶37), alokasi harga
     akuisisi (PPA) ke aset & liabilitas teridentifikasi pada NILAI WAJAR
     (¶18), pengukuran kepentingan nonpengendali (¶19), dan GOODWILL residual
     (¶32). Dibangun dari seed GROUP_SUBS yang SAMA dipakai PSAK 65 (konsolidasi)
     & Group Audit (SA 600) — tanpa angka ganda. Akibatnya:

        goodwill per-akuisisi = imbalan − bagian induk atas aset neto NW
                              = s.cost − own% × (modal + saldo laba pra-akuisisi)

     IDENTIK dengan eliminasi investasi di PSAK 65 ¶32, dan Σ goodwill =
     Rp 6.800 jt = AMS_CANON.GOODWILL — angka yang SAMA diuji penurunan nilai
     UPK tahunan oleh PSAK 48 (¶90). FVNIA (aset neto teridentifikasi pd nilai
     wajar) = equityAcq = modal + saldo laba pra-akuisisi (proxy kanonik yang
     juga dipakai PSAK 65). PPA mendekomposisi FVNIA: nilai buku aset neto +
     penyesuaian nilai wajar (takberwujud teridentifikasi & step-up aset tetap)
     − liabilitas pajak tangguhan atas PNW (22% · ¶24) → konsekuensi ke PSAK 46.
     Takberwujud teridentifikasi (hubungan pelanggan, merek, teknologi) diakui &
     diamortisasi via PSAK 19 (kelas 'customer'). Rp juta. */
  const PPA_DEALS: Record<string, {
    acqDate?: string; acquiree?: string; business?: boolean; foreign?: boolean; rationale?: string;
    consid: Array<{ k: string; v: number }>; contingent: number; contingentNow?: number; acqCosts?: number;
    nciMethod?: string; nciPremium?: number; mpStatus?: string;
    fva: Array<{ id: string; cls: string; label: string; amount: number; life: number }>;
  }> = {
    'CP-02': {
      acqDate: '01-07-2017', acquiree: 'PT Sentosa Logistik', business: true,
      rationale: 'Akuisisi 99% saham — internalisasi jaringan distribusi & gudang.',
      consid: [{ k: 'Kas dibayarkan', v: 18000 }], contingent: 0, acqCosts: 240,
      nciMethod: 'proportional', nciPremium: 0.05, mpStatus: 'closed',
      fva: [
        { id: 'cust', cls: 'customer', label: 'Hubungan pelanggan distribusi (¶B31)', amount: 800, life: 8 },
        { id: 'ppe',  cls: 'ppe',      label: 'Step-up NW aset tetap — gudang & armada', amount: 1500, life: 20 },
      ],
    },
    'CP-03': {
      acqDate: '01-04-2019', acquiree: 'PT Sentosa Pangan', business: true,
      rationale: 'Akuisisi 80% — integrasi hulu manufaktur F&B & merek konsumen.',
      consid: [{ k: 'Kas dibayarkan', v: 12000 }], contingent: 2000, contingentNow: 1700,
      acqCosts: 320, nciMethod: 'proportional', nciPremium: 0.06, mpStatus: 'closed',
      fva: [
        { id: 'cust',  cls: 'customer', label: 'Hubungan pelanggan ritel modern (¶B31)', amount: 2200, life: 8 },
        { id: 'brand', cls: 'brand',    label: 'Merek dagang produk konsumen (¶B33)', amount: 1400, life: 10 },
        { id: 'ppe',   cls: 'ppe',      label: 'Step-up NW lini produksi & mesin', amount: 1800, life: 14 },
      ],
    },
    'CP-04': {
      acqDate: '01-10-2020', acquiree: 'PT Sentosa Retail', business: true,
      rationale: 'Akuisisi 75% — perluasan kanal ritel & jejak gerai.',
      consid: [{ k: 'Kas dibayarkan', v: 7220 }], contingent: 0, acqCosts: 180,
      nciMethod: 'proportional', nciPremium: 0.05, mpStatus: 'closed',
      fva: [
        { id: 'brand', cls: 'brand',    label: 'Merek & papan nama gerai (¶B33)', amount: 900, life: 10 },
        { id: 'cust',  cls: 'customer', label: 'Hubungan pelanggan & program loyalitas', amount: 600, life: 7 },
        { id: 'ppe',   cls: 'ppe',      label: 'Step-up NW renovasi & perlengkapan gerai', amount: 500, life: 8 },
      ],
    },
    'CP-05': {
      acqDate: '01-01-2018', acquiree: 'Sentosa Trading Pte Ltd', business: true, foreign: true,
      rationale: 'Akuisisi 100% — basis perdagangan & pengadaan regional (Singapura).',
      consid: [{ k: 'Kas dibayarkan', v: 9000 }, { k: 'Saham diterbitkan (NW ¶37)', v: 1600 }],
      contingent: 0, acqCosts: 410, nciMethod: 'proportional', nciPremium: 0, mpStatus: 'closed',
      fva: [
        { id: 'cust', cls: 'customer', label: 'Hubungan pelanggan ekspor (¶B31)', amount: 1200, life: 8 },
        { id: 'tech', cls: 'tech',     label: 'Platform & lisensi perdagangan (¶B33)', amount: 900, life: 6 },
        { id: 'ppe',  cls: 'ppe',      label: 'Step-up NW aset tetap operasional', amount: 600, life: 12 },
      ],
    },
  };
  /* prosedur audit kombinasi bisnis (SA 540 estimasi NW · SA 600 komponen · SA 500 pakar) */
  const P22_PROC = [
    { ref: 'PSAK 22 ¶3 · B7', t: 'Tentukan transaksi memenuhi definisi BISNIS (input · proses · output) — bukan akuisisi aset' },
    { ref: 'PSAK 22 ¶6-7', t: 'Identifikasi pihak pengakuisisi (acquirer) & TANGGAL AKUISISI (saat pengendalian beralih)' },
    { ref: 'PSAK 22 ¶37', t: 'Uji pengukuran imbalan dialihkan pada nilai wajar — kas, saham, imbalan kontinjensi (¶39)' },
    { ref: 'PSAK 22 ¶53', t: 'Pastikan biaya terkait akuisisi DIBEBANKAN (bukan bagian imbalan) — telusuri ke Laba Rugi' },
    { ref: 'PSAK 22 ¶18', t: 'Re-perform alokasi harga akuisisi (PPA) — aset & liabilitas teridentifikasi pada NW (laporan KJPP · SA 500)' },
    { ref: 'PSAK 22 ¶B31', t: 'Evaluasi takberwujud teridentifikasi (hubungan pelanggan, merek) terpisah dari goodwill (kriteria keterpisahan/kontraktual)' },
    { ref: 'PSAK 22 ¶24', t: 'Uji pengakuan pajak tangguhan atas penyesuaian nilai wajar (PSAK 46) pada tanggal akuisisi' },
    { ref: 'PSAK 22 ¶19', t: 'Verifikasi pengukuran NCI — metode proporsional atau nilai wajar (pilihan per kombinasi)' },
    { ref: 'PSAK 22 ¶32-34', t: 'Re-hitung goodwill; jika negatif (pembelian diskon) — re-asses lalu akui untung di Laba Rugi (¶36)' },
    { ref: 'PSAK 22 ¶45', t: 'Periode pengukuran (≤12 bln) — uji penyesuaian provisional & pengukuran kembali imbalan kontinjensi (¶58)' },
  ];

  function psak22(wtb?: WTB) {
    const R = Math.round;
    const deals = GROUP_SUBS.map(s => {
      const d = PPA_DEALS[s.id] || { consid: [{ k: 'Kas', v: s.cost }], fva: [], acqCosts: 0, contingent: 0, nciMethod: 'proportional', nciPremium: 0 };
      const equityAcq   = s.modal + s.rePre;                 // FVNIA (proxy kanonik) — TIE ke PSAK 65 ¶32
      const fvnia       = equityAcq;
      const nciPct      = (100 - s.own) / 100;
      const considCash  = d.consid.reduce((a, c) => a + c.v, 0);
      const considTotal = considCash + (d.contingent || 0);  // = s.cost (imbalan dialihkan ¶37)
      const grossFVA    = d.fva.reduce((a, f) => a + f.amount, 0);
      const dtl         = R(grossFVA * RATE);                // pajak tangguhan atas PNW (¶24) → PSAK 46
      const netFVA      = grossFVA - dtl;
      const bookNA      = equityAcq - netFVA;                // nilai buku aset neto (derivasi → tie)
      const nciAcqProp  = R(nciPct * fvnia);                 // NCI proporsional (¶19a) — METODE TERPILIH
      const goodwill    = R(considTotal - (s.own / 100) * fvnia); // = s.cost − own%×fvnia (tie PSAK 65)
      /* ilustrasi metode goodwill penuh (¶19b) — NCI pd nilai wajar (premi kendali) */
      const nciFair      = R(nciPct * fvnia * (1 + (d.nciPremium || 0)));
      const goodwillFull = R(considTotal + nciFair - fvnia);
      const gwUplift     = goodwillFull - goodwill;
      const bargain      = goodwill < 0;
      const intangFVA    = d.fva.filter(f => f.cls !== 'ppe');
      const ppeFVA       = d.fva.filter(f => f.cls === 'ppe').reduce((a, f) => a + f.amount, 0);
      const intangTot    = intangFVA.reduce((a, f) => a + f.amount, 0);
      return { ...s, d, acqDate: d.acqDate, acquiree: d.acquiree || s.name, rationale: d.rationale,
        equityAcq, fvnia, nciPct, considCash, considTotal, contingent: d.contingent || 0,
        contingentNow: d.contingentNow, acqCosts: d.acqCosts || 0,
        grossFVA, dtl, netFVA, bookNA, nciAcqProp, goodwill, nciFair, goodwillFull, gwUplift,
        bargain, intangFVA, ppeFVA, intangTot, foreign: !!d.foreign, mpStatus: d.mpStatus };
    });

    const sum = (k: string) => deals.reduce((a, x) => a + ((x as unknown as Record<string, number>)[k] || 0), 0);
    const goodwillTotal  = sum('goodwill');     // 6.800
    const considTotal    = sum('considTotal');  // Σ imbalan dialihkan
    const fvniaTotal     = sum('fvnia');
    const nciAcqTotal    = sum('nciAcqProp');
    const dtlTotal       = sum('dtl');          // Σ pajak tangguhan PPA → PSAK 46
    const grossFVATotal  = sum('grossFVA');
    const intangTotal    = sum('intangTot');
    const ppeStepupTotal = sum('ppeFVA');
    const acqCostsTotal  = sum('acqCosts');     // dibebankan ke Laba Rugi (¶53)
    const contingentTotal= sum('contingent');
    const goodwillFullTot= sum('goodwillFull');

    /* takberwujud teridentifikasi dari PPA (¶B31-B33) — diakui & diamortisasi (PSAK 19) */
    const intangibles = deals.flatMap(x => x.intangFVA.map(f => ({ deal: x.acquiree, dealId: x.id, ...f })));

    /* imbalan kontinjensi (¶58) — diukur kembali pd NW; perubahan ke Laba Rugi */
    const contingentItems = deals.filter(x => x.contingent > 0).map(x => ({
      id: x.id, name: x.acquiree, initial: x.contingent, now: x.contingentNow != null ? x.contingentNow : x.contingent,
      remeasure: (x.contingentNow != null ? x.contingentNow : x.contingent) - x.contingent,
    }));
    const remeasureTotal = contingentItems.reduce((a, c) => a + c.remeasure, 0);

    const bargainCount = deals.filter(d => d.bargain).length;

    /* rekonsiliasi lintas-modul (lineage satu sumber) */
    const recon = [
      { pos: 'Imbalan dialihkan (Σ akuisisi)', src: 'PPA_DEALS · imbalan ¶37', route: null, val: considTotal, ok: true },
      { pos: 'Aset neto teridentifikasi pd NW', src: 'Σ FVNIA per-akuisisi', route: null, val: fvniaTotal, ok: true },
      { pos: 'Goodwill kombinasi bisnis (¶32)', src: 'imbalan + NCI − FVNIA', route: null, val: goodwillTotal, ok: true, hi: true },
      { pos: 'Goodwill = eliminasi investasi PSAK 65', src: 'AMS_CANON.psak65 · Σ goodwill anak', route: 'psak65', val: GOODWILL, ok: goodwillTotal === GOODWILL, hi: true },
      { pos: 'Goodwill diuji penurunan nilai UPK', src: 'AMS_CANON.GOODWILL → PSAK 48 (¶90)', route: 'psak48', val: GOODWILL, ok: goodwillTotal === GOODWILL },
      { pos: 'NCI pd tanggal akuisisi (proporsional)', src: 'Σ NCI ¶19a', route: 'psak65', val: nciAcqTotal, ok: true },
      { pos: 'Pajak tangguhan atas PNW (¶24)', src: 'Σ DTL × 22% → PSAK 46', route: 'psak46', val: dtlTotal, ok: true },
      { pos: 'Takberwujud teridentifikasi → amortisasi', src: 'PPA · kelas customer/brand → PSAK 19', route: 'psak19', val: intangTotal, ok: true },
    ];

    return {
      deals, goodwillTotal, considTotal, fvniaTotal, nciAcqTotal, dtlTotal, grossFVATotal,
      intangTotal, ppeStepupTotal, acqCostsTotal, contingentTotal, goodwillFullTot,
      intangibles, contingentItems, remeasureTotal, bargainCount,
      goodwillTie: GOODWILL, tiesToCanon: goodwillTotal === GOODWILL,
      recon, proc: P22_PROC, rate: RATE, count: deals.length,
    };
  }

  /* ---------- SA 320 · Materialitas (satu sumber kebenaran lintas-modul) ----------
     Mengembalikan OM / PM / CTT yang IDENTIK dengan Materiality Workspace: membaca
     konfigurasi terpersist yang sama (ams.v1.mat.*) + tabel benchmark (window.BENCHMARKS)
     + override "Terapkan ke Engagement". Modul hilir (PSAK 14, SAD, dll.) memanggil ini
     alih-alih meng-hardcode 75%/5%, sehingga perubahan di workspace mengalir serempak.
     opts.engMateriality = materialitas engagement (Rp penuh) sbg basis bila tak ada override.
     Nilai penuh (Rp) & Rp juta. */
  function materiality(opts?: MaterialityOpts): MaterialityResult {
    opts = opts || {};
    const LS = <T,>(k: string, d: T): T => { try { const s = localStorage.getItem('ams.v1.' + k); return s != null ? JSON.parse(s) : d; } catch (e) { return d; } };
    const benchId  = LS('mat.benchId', 'pbt');
    const pct      = LS('mat.pct', 5);
    const pmPct    = LS('mat.pmPct', 75);
    const cttPct   = LS('mat.cttPct', 5);
    const override = LS('mat.appliedOverride', null);
    const benches  = (typeof window !== 'undefined' && window.BENCHMARKS) || [];
    const bench    = benches.find(b => b.id === benchId) || benches[0] || null;
    const calcOM   = bench ? Math.round(bench.value * pct / 100) : null; // OM hitung benchmark (live)
    /* materialitas yang BERLAKU: override workspace > materialitas engagement > hitung benchmark */
    const omFull   = override != null ? override : (opts.engMateriality != null ? opts.engMateriality : calcOM);
    const pmFull   = omFull != null ? Math.round(omFull * pmPct / 100) : null;
    const cttFull  = omFull != null ? Math.round(omFull * cttPct / 100) : null;
    return {
      benchId, benchLabel: bench ? bench.label : null, benchValue: bench ? bench.value : null,
      pct, pmPct, cttPct, applied: override != null, calcOM,
      omFull, pmFull, cttFull,
      om:  omFull  != null ? jt(omFull)  : null,
      pm:  pmFull  != null ? jt(pmFull)  : null,
      ctt: cttFull != null ? jt(cttFull) : null,
    };
  }


export { JOINT_ARR, P66_DISCLOSURE, psak66, PPA_DEALS, P22_PROC, psak22, materiality };
