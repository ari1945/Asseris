/* ============================================================
   NeoSuite AMS — PSAK 117 · Kontrak Asuransi (adopsi IFRS 17)
   ------------------------------------------------------------
   MESIN HITUNG / SUMBER KEBENARAN TUNGGAL untuk modul PSAK 117.
   Mengaugmentasi window.AMS_CANON dengan psak117() — seluruh tab
   & Kertas Kerja menarik angka dari SATU fungsi ini, tidak ada
   angka yang ditulis ulang antar tab.

   Konteks perikatan: PT Asuransi Nusantara Jiwa Tbk (asuransi jiwa
   & kesehatan), profil sektor jasa keuangan (OJK). PSAK 117 efektif
   1 Januari 2025; tanggal transisi (DOT) 1 Januari 2024.

   Model pengukuran:
     · GMM  — General Measurement Model (Building Block Approach)
     · PAA  — Premium Allocation Approach (kontrak jangka pendek ≤1th)
     · VFA  — Variable Fee Approach (kontrak partisipasi langsung / PAYDI)

   Blok pengukuran (GMM/VFA):
     Liabilitas Sisa Perlindungan (LRC)
       = Estimasi nilai kini arus kas pemenuhan (FCF)
       + Penyesuaian Risiko non-keuangan (RA)
       + Marjin Jasa Kontraktual (CSM)
     Liabilitas Klaim Terjadi (LIC) = PV klaim + RA klaim

   Semua nilai dalam Rp JUTA. Konsisten dgn fmt()/rp() id-ID.
   ============================================================ */
(function () {
  'use strict';
  const R = Math.round;

  /* ---- Portofolio / kelompok kontrak (cohort) ---- */
  /* fcf = estimasi nilai kini arus kas pemenuhan (PV, positif = liabilitas neto)
     ra  = penyesuaian risiko non-keuangan pada LRC
     csm = marjin jasa kontraktual (laba belum diakui) — null utk PAA
     lc  = komponen kerugian (kontrak merugi) — relevan terutama PAA/onerous
     cu  = unit perlindungan periode berjalan (basis pelepasan CSM)        */
  const PORTFOLIOS = [
    { id: 'jiwa',   name: 'Jiwa Tradisional (Whole Life & Endowment)', model: 'GMM',
      onset: 'Pra-2015 · multi-kohort', dur: 'Jangka panjang', par: false,
      fcf: 1850000, ra: 145000, csm: 420000, lc: 0, cu: 0.290,
      disc: { locked: 6.2, current: 6.8 }, transition: 'MRA',
      note: 'Manfaat tetap, tanpa fitur partisipasi langsung → GMM penuh.' },
    { id: 'unitlink', name: 'Unit-Linked / PAYDI (Partisipasi Langsung)', model: 'VFA',
      onset: 'Pasca-2015', dur: 'Jangka panjang', par: true,
      fcf: 3200000, ra: 88000, csm: 265000, lc: 0, cu: 0.205,
      disc: { locked: 6.5, current: 6.8 }, transition: 'FRA',
      note: 'Imbal hasil tergantung aset pendasar → Variable Fee Approach.' },
    { id: 'anuitas', name: 'Anuitas & Dana Pensiun', model: 'GMM',
      onset: 'Multi-kohort', dur: 'Jangka panjang', par: false,
      fcf: 1420000, ra: 96000, csm: 110000, lc: 0, cu: 0.180,
      disc: { locked: 6.0, current: 6.8 }, transition: 'FVA',
      note: 'Pembayaran berkala seumur hidup; data historis tak lengkap → FVA.' },
    { id: 'kesehatan', name: 'Kesehatan & Kecelakaan (Jangka Pendek)', model: 'PAA',
      onset: 'Diperbarui tahunan', dur: '≤ 12 bulan', par: false,
      fcf: 340000, ra: 0, csm: null, lc: 18000, cu: 1.0,
      disc: { locked: 6.4, current: 6.8 }, transition: 'FRA',
      note: 'Periode perlindungan ≤1 tahun → memenuhi syarat PAA (¶53).' },
  ];

  /* ---- Liabilitas Klaim Terjadi (LIC) — agregat seluruh portofolio ---- */
  const LIC = { pv: 615000, ra: 42000, get total() { return this.pv + this.ra; } };

  /* ---- Mutasi CSM (roll-forward) agregat GMM + VFA, Rp juta ---- */
  const CSM_ROLL = [
    { k: 'open',    t: 'Saldo awal CSM (1 Jan 2025)',                          v: 812000, tot: true },
    { k: 'new',     t: 'Kontrak baru diterbitkan (laba terikat ke jasa masa depan)', v: 96000, kind: 'green' },
    { k: 'accr',    t: 'Akresi bunga — tarif terkunci saat pengakuan awal',    v: 50000, kind: 'blue' },
    { k: 'chg',     t: 'Perubahan estimasi terkait jasa masa depan (menyesuaikan CSM)', v: -41000, kind: 'amber' },
    { k: 'rel',     t: 'CSM diakui dalam laba rugi atas jasa periode berjalan', v: -122000, kind: 'red' },
    { k: 'close',   t: 'Saldo akhir CSM (31 Des 2025)',                         v: 795000, tot: true },
  ];

  /* ---- Mutasi Penyesuaian Risiko (RA) — non-keuangan ---- */
  const RA_ROLL = [
    { t: 'Saldo awal RA (1 Jan 2025)',                          v: 360000, tot: true },
    { t: 'Risiko ditanggung kontrak baru',                      v: 28000,  kind: 'green' },
    { t: 'Pelepasan RA atas risiko yang kedaluwarsa (ke L/R)',  v: -22000, kind: 'red' },
    { t: 'Perubahan asumsi & estimasi risiko',                  v: 5000,   kind: 'amber' },
    { t: 'Saldo akhir RA (31 Des 2025)',                        v: 371000, tot: true },
  ];

  /* ---- Hasil Jasa Asuransi (P&L · PSAK 117 ¶80–86) ---- */
  const PNL = [
    { t: 'Pendapatan asuransi (insurance revenue)',                 v: 1180000, kind: 'pos' },
    { t: 'Beban jasa asuransi (klaim & beban terjadi)',             v: -842000, kind: 'neg' },
    { t: 'Beban kerugian kontrak merugi (komponen kerugian)',       v: -28000,  kind: 'neg' },
    { t: 'Pemulihan beban akuisisi asuransi',                       v: -50000,  kind: 'neg' },
    { t: 'Hasil Jasa Asuransi (insurance service result)',          v: 260000,  tot: true },
    { t: 'Pendapatan/(beban) keuangan asuransi (insurance finance)', v: -95000, kind: 'neg' },
    { t: 'Pendapatan investasi atas aset pendukung',                v: 168000,  kind: 'pos' },
    { t: 'Hasil Keuangan Neto',                                     v: 73000,   tot: true },
  ];

  /* ---- Pohon keputusan pemilihan model pengukuran (¶29, ¶53, ¶71) ---- */
  const MODEL_TREE = {
    GMM: { label: 'General Measurement Model', sub: 'Building Block Approach · default',
      crit: 'Model dasar seluruh kontrak asuransi; LRC = FCF + RA + CSM, CSM dilepas seiring unit perlindungan.' },
    PAA: { label: 'Premium Allocation Approach', sub: 'penyederhanaan · jangka pendek',
      crit: 'Boleh bila periode perlindungan ≤ 1 tahun ATAU hasilnya tidak berbeda material dari GMM (¶53). LRC berbasis premi belum diakui (UPR); tanpa CSM eksplisit.' },
    VFA: { label: 'Variable Fee Approach', sub: 'partisipasi langsung',
      crit: 'Wajib utk kontrak partisipasi langsung (¶B101): pemegang polis berbagi imbal hasil aset pendasar yang dapat diidentifikasi. CSM menyerap perubahan nilai wajar bagian entitas.' },
  };

  /* ---- Pendekatan transisi (PSAK 117 ¶C3–C24) ---- */
  const TRANSITION = {
    FRA: { label: 'Pendekatan Retrospektif Penuh', short: 'FRA', ref: '¶C3',
      desc: 'Disajikan seolah PSAK 117 selalu berlaku. Wajib kecuali tidak praktis.' },
    MRA: { label: 'Pendekatan Retrospektif Dimodifikasi', short: 'MRA', ref: '¶C6–C19',
      desc: 'Modifikasi terbatas bila FRA tidak praktis, memaksimalkan penggunaan info wajar & terdukung.' },
    FVA: { label: 'Pendekatan Nilai Wajar', short: 'FVA', ref: '¶C20–C24',
      desc: 'CSM transisi = nilai wajar (PSAK 13) dikurangi FCF pada tanggal transisi.' },
  };

  /* ---- Prosedur audit estimasi aktuaria (SA 540 · SA 620) ---- */
  const PROC = [
    { ref: 'SA 540 ¶13', t: 'Pahami metodologi model aktuaria & tata kelola asumsi (mortalita, morbidita, lapse, diskonto)' },
    { ref: 'PSAK 117 ¶29', t: 'Evaluasi ketepatan klasifikasi model pengukuran (GMM / PAA / VFA) per portofolio' },
    { ref: 'PSAK 117 ¶53', t: 'Uji kelayakan PAA — periode perlindungan ≤1th atau hasil tak berbeda material dari GMM' },
    { ref: 'PSAK 117 ¶B101', t: 'Verifikasi kriteria kontrak partisipasi langsung (VFA) atas portofolio unit-linked' },
    { ref: 'SA 540 ¶15', t: 'Uji metodologi kurva diskonto (bottom-up: bebas risiko + premi ilikuiditas)' },
    { ref: 'SA 540 ¶18', t: 'Evaluasi teknik & tingkat keyakinan Penyesuaian Risiko (target persentil ke-75)' },
    { ref: 'PSAK 117 ¶44', t: 'Uji ulang gulir (roll-forward) CSM & dasar unit perlindungan (coverage units)' },
    { ref: 'PSAK 117 ¶47', t: 'Identifikasi kontrak merugi (onerous) & kecukupan komponen kerugian (loss component)' },
    { ref: 'PSAK 117 ¶C3', t: 'Nilai ketepatan & konsistensi pendekatan transisi (FRA/MRA/FVA) per portofolio' },
    { ref: 'SA 620',     t: 'Evaluasi kompetensi, objektivitas & kecukupan pekerjaan Aktuaris (pakar auditor)' },
    { ref: 'SA 500',     t: 'Uji kelengkapan & akurasi data polis & klaim yang menjadi input model' },
    { ref: 'PSAK 117 ¶93', t: 'Telaah kecukupan pengungkapan: rekonsiliasi LRC/LIC/CSM, sensitivitas & risiko' },
  ];

  /* ---- Analisis sensitivitas (SA 540) ---- */
  const SENS = [
    { driver: 'Tingkat diskonto −100 bps', dCsm: 0, dEquity: -96000, k: 'red',
      note: 'Diskonto turun → nilai kini liabilitas naik; efek lewat OCI/insurance finance.' },
    { driver: 'Mortalita/morbidita +5%', dCsm: -54000, dEquity: -12000, k: 'red',
      note: 'Asumsi memburuk → CSM menyerap (jasa masa depan); sisa membebani L/R.' },
    { driver: 'Tingkat lapse +10%', dCsm: 31000, dEquity: 4000, k: 'green',
      note: 'Lapse naik pada portofolio bermarjin → FCF turun, CSM bertambah.' },
    { driver: 'Penyesuaian Risiko persentil 75→80', dCsm: -22000, dEquity: -6000, k: 'amber',
      note: 'Keyakinan lebih tinggi → RA naik, menggerus CSM lalu L/R.' },
  ];

  /* ---- Keterkaitan kertas kerja (lineage) ---- */
  const UPSTREAM = [
    { id: 'evidence', ic: 'expert',  lbl: 'Pekerjaan Aktuaris (SA 620)', rel: 'Laporan aktuaris atas FCF, RA & CSM — bukti pakar' },
    { id: 'icfr',     ic: 'shield',  lbl: 'Pengendalian Internal',       rel: 'Kontrol data polis/klaim & tata kelola asumsi model' },
    { id: 'wtb',      ic: 'table',   lbl: 'Working Trial Balance',       rel: 'Saldo liabilitas kontrak asuransi & komponen P&L' },
    { id: 'materiality', ic: 'target', lbl: 'Materiality',               rel: 'Ambang untuk evaluasi selisih estimasi aktuaria' },
  ];
  const DOWNSTREAM = [
    { id: 'psak46',  ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan',  rel: 'Beda temporer CSM/RA & komponen kerugian → DTA/DTL' },
    { id: 'psak68',  ic: 'layers',  lbl: 'PSAK 68 · Nilai Wajar',      rel: 'Aset pendasar VFA & input transisi FVA → hierarki nilai wajar' },
    { id: 'psak1',   ic: 'report',  lbl: 'PSAK 1 · Penyajian LK',      rel: 'Penyajian hasil jasa asuransi & keuangan asuransi' },
    { id: 'fsgen',   ic: 'report',  lbl: 'FS Generator',               rel: 'Liabilitas kontrak asuransi & pendapatan asuransi → LK' },
    { id: 'sad',     ic: 'scale',   lbl: 'SAD Ledger (SA 450)',        rel: 'Selisih estimasi aktuaria → akumulasi salah saji' },
    { id: 'opinion', ic: 'gavel',   lbl: 'Opini & KAM (SA 701)',       rel: 'Valuasi kontrak asuransi → kandidat Hal Audit Utama' },
  ];

  /* ---- ketentuan kunci PSAK 117 vs PSAK 62 (lama) ---- */
  const KEY = [
    { k: 'Basis pengukuran', v: 'Arus kas pemenuhan', note: 'Estimasi kini, eksplisit & berbobot probabilitas — menggantikan kebijakan beragam PSAK 62.' },
    { k: 'Laba belum diakui', v: 'CSM', note: 'Tidak ada laba hari-1; CSM diakui seiring penyediaan jasa selama periode perlindungan.' },
    { k: 'Penyesuaian risiko', v: 'Eksplisit', note: 'Kompensasi atas ketidakpastian arus kas risiko non-keuangan; tingkat keyakinan diungkap.' },
    { k: 'Kontrak merugi', v: 'Segera diakui', note: 'Komponen kerugian diakui di L/R saat kontrak teridentifikasi merugi (¶47–52).' },
  ];

  /* ============================================================
     psak117() — agregator kanonik. Tidak menerima WTB karena
     domain ini tidak bersumber dari WTB klien manufaktur; seluruh
     figur aktuaria berasal dari paket pelaporan aktuaris yang
     ditelaah auditor. Disusun sebagai SATU sumber untuk view.
     ============================================================ */
  function psak117() {
    const ports = PORTFOLIOS.map(p => {
      const lrc = p.fcf + p.ra + (p.csm || 0) + (p.lc || 0);
      return { ...p, lrc };
    });
    const by = (m) => ports.filter(p => p.model === m);
    const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

    const lrcTotal = sum(ports, p => p.lrc);
    const csmTotal = sum(ports, p => p.csm || 0);
    const raLrc    = sum(ports, p => p.ra);
    const fcfTotal = sum(ports, p => p.fcf);
    const lcTotal  = sum(ports, p => p.lc || 0);
    const licTotal = LIC.total;
    const liabTotal = lrcTotal + licTotal;

    /* komposisi unit perlindungan (basis pelepasan CSM) — hanya GMM/VFA */
    const cuPorts = ports.filter(p => p.csm);
    const cuSum = sum(cuPorts, p => p.cu) || 1;

    /* roll-forward checks */
    const csmClose = CSM_ROLL.find(r => r.k === 'close').v;
    const csmTie = csmClose === csmTotal;            // tutup ke total CSM portofolio
    const raClose = RA_ROLL[RA_ROLL.length - 1].v;
    const raTie = raClose === (raLrc + LIC.ra);      // RA akhir = RA LRC + RA LIC

    /* P&L derivasi */
    const serviceResult = PNL.find(r => r.t.startsWith('Hasil Jasa')).v;
    const financeNet = PNL.find(r => r.t.startsWith('Hasil Keuangan')).v;
    const totalContribution = serviceResult + financeNet;

    /* model count */
    const modelMix = ['GMM', 'PAA', 'VFA'].map(m => {
      const list = by(m);
      return { model: m, n: list.length, lrc: sum(list, p => p.lrc), ...MODEL_TREE[m] };
    });

    return {
      asof: '31 Desember 2025', dot: '1 Januari 2024', effective: '1 Januari 2025',
      ports, modelMix,
      lrcTotal, csmTotal, raLrc, fcfTotal, lcTotal,
      lic: LIC, licTotal, liabTotal,
      csmRoll: CSM_ROLL, raRoll: RA_ROLL, pnl: PNL,
      serviceResult, financeNet, totalContribution,
      csmTie, raTie, csmClose, raClose, raTotal: raLrc + LIC.ra,
      cuPorts, cuSum,
      sens: SENS, proc: PROC, key: KEY,
      tree: MODEL_TREE, transition: TRANSITION,
      upstream: UPSTREAM, downstream: DOWNSTREAM,
      raConfidence: 75,
      client: { name: 'PT Asuransi Nusantara Jiwa Tbk', npwp: '02.118.557.4-054.000', sector: 'Asuransi Jiwa & Kesehatan (OJK)' },
    };
  }

  window.AMS_CANON = window.AMS_CANON || {};
  window.AMS_CANON.psak117 = psak117;
  window.AMS_CANON.P117_PORTFOLIOS = PORTFOLIOS;
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const AMS_CANON = window.AMS_CANON;
