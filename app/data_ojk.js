/* ============================================================
   NeoSuite AMS — OJK · Pasar Modal & Keberlanjutan (SSOT)
   ------------------------------------------------------------
   Memperluas window.AMS_CANON dengan empat domain regulasi OJK
   yang sebelumnya menjadi gap (Evaluasi Kepatuhan G13–G16):

     ojkSustain()    · Laporan Keberlanjutan POJK 51/2017 + RAKB
                       + kesiapan adopsi ISSB / IFRS S1–S2 (G13)
     ojkSector()     · Daftar-uji audit spesifik-sektor jasa
                       keuangan: bank · asuransi · pembiayaan ·
                       emiten pasar modal (G14)
     ojkFiling()     · Batas waktu & penyampaian elektronik LK
                       auditan ke OJK (SPRINT) & BEI (IDXnet) (G15)
     ojkAuditComm()  · Komunikasi komite audit POJK 55/2015 jo.
                       POJK 13/2017 — di luar SA 260 (G16)

   Identitas klien ditarik dari satu sumber: window.AMS.CLIENTS.
   Seluruh nilai rasio bersifat ilustratif lapangan; angka LK
   yang relevan tetap mengacu AMS_CANON figur kanonik.
   ============================================================ */
(function () {
  'use strict';
  if (!window.AMS_CANON) { window.AMS_CANON = {}; }
  const AMS = window.AMS || {};
  const CLIENTS = AMS.CLIENTS || [];
  const cli = (id) => CLIENTS.find(c => c.id === id) || { name: id, npwp: '—' };

  /* =========================================================
     G13 · LAPORAN KEBERLANJUTAN — POJK 51/POJK.03/2017
     ========================================================= */
  function ojkSustain() {
    /* Isi minimum Laporan Keberlanjutan — Lampiran II POJK 51/2017
       jo. SEOJK 16/SEOJK.04/2021 (9 muatan wajib). */
    const content = [
      { ref: 'LK-1', t: 'Strategi keberlanjutan', d: 'Penjelasan strategi & komitmen penerapan keuangan berkelanjutan.', done: true },
      { ref: 'LK-2', t: 'Ikhtisar kinerja keberlanjutan', d: 'Aspek ekonomi, lingkungan hidup, dan sosial secara ringkas.', done: true },
      { ref: 'LK-3', t: 'Profil singkat perusahaan', d: 'Visi-misi, skala usaha, rantai pasok, keanggotaan asosiasi.', done: true },
      { ref: 'LK-4', t: 'Penjelasan Direksi', d: 'Kebijakan, capaian, tantangan, & target keberlanjutan.', done: true },
      { ref: 'LK-5', t: 'Tata kelola keberlanjutan', d: 'Struktur, tugas Direksi/Dewan Komisaris, kompetensi & remunerasi.', done: false },
      { ref: 'LK-6', t: 'Kinerja keberlanjutan — ekonomi', d: 'Produktivitas, perbandingan target & capaian pendapatan hijau.', done: true },
      { ref: 'LK-7', t: 'Kinerja keberlanjutan — lingkungan', d: 'Energi, emisi GRK, air, limbah/B3, keanekaragaman hayati.', done: false },
      { ref: 'LK-8', t: 'Kinerja keberlanjutan — sosial', d: 'Ketenagakerjaan, K3, pengembangan masyarakat, HAM.', done: true },
      { ref: 'LK-9', t: 'Tanggung jawab produk/jasa keuangan berkelanjutan', d: 'Portofolio pembiayaan berkelanjutan (KUBL) & inovasi produk.', done: false },
      { ref: 'LK-10', t: 'Verifikasi tertulis pihak independen', d: 'Asurans terbatas/menengah bila tersedia (SPA 3000 / ISSA 5000).', done: false, opt: true },
      { ref: 'LK-11', t: 'Lembar umpan balik (feedback)', d: 'Formulir tanggapan pembaca + respons tahun sebelumnya.', done: true },
    ];

    /* Rencana Aksi Keuangan Berkelanjutan (RAKB) — Ps. 8 POJK 51 */
    const rakb = [
      { ref: 'RAKB-A', t: 'Pengembangan produk/jasa keuangan berkelanjutan', status: 'Berjalan', tgt: 'Portofolio KUBL ≥ 12%' },
      { ref: 'RAKB-B', t: 'Pengembangan kapasitas internal SDM', status: 'Berjalan', tgt: '4 pelatihan ESG/tahun' },
      { ref: 'RAKB-C', t: 'Penyesuaian organisasi, manajemen risiko, tata kelola, SOP', status: 'Sebagian', tgt: 'Integrasi risiko iklim ke ERM' },
      { ref: 'RAKB-D', t: 'Disampaikan ke OJK bersama Rencana Bisnis', status: 'Selesai', tgt: 'Sebelum akhir Nov tahun sebelumnya' },
    ];

    /* Entitas terdampak kewajiban POJK 51 (LJK, Emiten, Perusahaan Publik) */
    const ENT = [
      { id: 'C-040', sector: 'LJK — Multifinance', kind: 'LJK', sr: 'Terbit', rakb: 'Disampaikan', issb: 'Pilot', phase: 'Wajib sejak 2019' },
      { id: 'C-031', sector: 'Emiten — Agribisnis/Perkebunan', kind: 'Emiten', sr: 'Terbit', rakb: 'N/A', issb: 'Gap-assessment', phase: 'Wajib sejak 2025' },
      { id: 'C-014', sector: 'Emiten — Manufaktur (Tbk)', kind: 'Emiten', sr: 'Terbit', rakb: 'N/A', issb: 'Belum mulai', phase: 'Wajib sejak 2025' },
      { id: 'C-063', sector: 'Emiten — Properti & Real Estate', kind: 'Emiten', sr: 'Draf', rakb: 'N/A', issb: 'Belum mulai', phase: 'Wajib sejak 2025' },
    ].map(e => ({ ...e, name: cli(e.id).name }));

    /* Kesiapan adopsi ISSB / IFRS S1–S2 (diadopsi DSK-IAI → SPK; didorong OJK) */
    const issbS1 = [
      { ref: 'S1-G', t: 'Tata kelola — pengawasan risiko & peluang keberlanjutan', state: 'siap' },
      { ref: 'S1-St', t: 'Strategi — dampak ke model bisnis & rantai nilai', state: 'sebagian' },
      { ref: 'S1-R', t: 'Manajemen risiko — proses identifikasi & penilaian', state: 'sebagian' },
      { ref: 'S1-M', t: 'Metrik & target lintas-topik keberlanjutan', state: 'belum' },
      { ref: 'S1-C', t: 'Konektivitas dengan laporan keuangan (entity-specific)', state: 'belum' },
    ];
    const issbS2 = [
      { ref: 'S2-P', t: 'Risiko fisik iklim (akut & kronis)', state: 'sebagian' },
      { ref: 'S2-T', t: 'Risiko transisi (kebijakan, pasar, teknologi)', state: 'sebagian' },
      { ref: 'S2-G1', t: 'Emisi GRK Cakupan 1 & 2 (GHG Protocol)', state: 'siap' },
      { ref: 'S2-G3', t: 'Emisi GRK Cakupan 3 (rantai nilai)', state: 'belum' },
      { ref: 'S2-S', t: 'Analisis skenario iklim & ketahanan strategi', state: 'belum' },
      { ref: 'S2-Tp', t: 'Rencana transisi & target net-zero', state: 'belum' },
    ];

    const contentDone = content.filter(c => c.done && !c.opt).length;
    const contentReq = content.filter(c => !c.opt).length;
    const srPct = Math.round(contentDone / contentReq * 100);
    const issbAll = issbS1.concat(issbS2);
    const issbReady = issbAll.filter(x => x.state === 'siap').length;
    const issbPct = Math.round((issbAll.filter(x => x.state === 'siap').length + 0.5 * issbAll.filter(x => x.state === 'sebagian').length) / issbAll.length * 100);

    return {
      effective: '2019 (LJK) · 2025 (seluruh Emiten & Perusahaan Publik)',
      reg: 'POJK 51/POJK.03/2017',
      content, rakb, entities: ENT, issbS1, issbS2,
      srPct, contentDone, contentReq,
      issbPct, issbReady, issbTotal: issbAll.length,
      entCount: ENT.length, entTerbit: ENT.filter(e => e.sr === 'Terbit').length,
      bridge: [
        { id: 'sjah3410', lbl: 'SJAH 3410 · Asurans Emisi GRK', rel: 'Verifikasi data emisi Cakupan 1–2' },
        { id: 'sectorck', lbl: 'Daftar-Uji Sektor JK', rel: 'Portofolio KUBL & klasifikasi hijau' },
        { id: 'sa720', lbl: 'SA 720 · Informasi Lain', rel: 'Laporan Keberlanjutan = informasi lain dalam LT' },
        { id: 'ojkfiling', lbl: 'Batas Waktu OJK/BEI', rel: 'SR melekat pada Laporan Tahunan' },
      ],
    };
  }

  /* =========================================================
     G14 · DAFTAR-UJI AUDIT SPESIFIK-SEKTOR JASA KEUANGAN
     ========================================================= */
  function ojkSector() {
    const sectors = [
      {
        id: 'bank', label: 'Perbankan', icon: 'building', accent: '#005085',
        client: 'Profil acuan — Bank Umum (BUKU 3)',
        regs: ['POJK 40/2019 · Kualitas Aset', 'POJK 11/2016 · KPMM', 'POJK 32/2018 · BMPK', 'PSAK 71 · CKPN'],
        ratios: [
          { k: 'KPMM (CAR)', v: '21,4%', min: '≥ 9–14% (sesuai profil risiko)', ok: true },
          { k: 'NPL gross / net', v: '2,8% / 0,9%', min: 'NPL net ≤ 5%', ok: true },
          { k: 'CKPN / PPKA (PSAK 71)', v: 'Rp 1.240 jt', min: 'Memadai vs ECL', ok: true },
          { k: 'GWM Rupiah', v: '6,2%', min: 'Sesuai ketentuan BI', ok: true },
          { k: 'LCR / NSFR', v: '142% / 118%', min: '≥ 100%', ok: true },
          { k: 'BMPK pihak terkait', v: '8,1%', min: '≤ 10% modal', ok: true },
        ],
        checks: [
          { ref: 'BNK-1', t: 'Uji penggolongan kualitas aset (lancar–macet) & ketepatan kolektibilitas', done: true },
          { ref: 'BNK-2', t: 'Rekonsiliasi CKPN PSAK 71 ↔ PPKA regulatoris (gap analysis)', done: true },
          { ref: 'BNK-3', t: 'Pengujian perhitungan KPMM (ATMR kredit, pasar, operasional)', done: false },
          { ref: 'BNK-4', t: 'Uji kepatuhan BMPK & ketentuan pihak terkait', done: false },
          { ref: 'BNK-5', t: 'Penilaian Tingkat Kesehatan Bank (RBBR) & dampak ke going concern', done: false },
        ],
      },
      {
        id: 'asuransi', label: 'Asuransi', icon: 'umbrella', accent: '#0a6b73',
        client: 'Profil acuan — Asuransi Umum/Jiwa',
        regs: ['POJK 71/2016 · Kesehatan Keuangan', 'POJK 28/2020', 'PSAK 117 · Kontrak Asuransi', 'SEOJK cadangan teknis'],
        ratios: [
          { k: 'RBC (Risk-Based Capital)', v: '186%', min: '≥ 120%', ok: true },
          { k: 'Rasio likuiditas', v: '124%', min: '≥ 100%', ok: true },
          { k: 'Rasio kecukupan investasi', v: '108%', min: '≥ 100%', ok: true },
          { k: 'Dana jaminan', v: 'Rp 220 jt', min: '≥ 20% modal sendiri / 5% premi', ok: true },
          { k: 'Cadangan teknis (PSAK 117)', v: 'Rp 4.180 jt', min: 'LRC + LIC memadai', ok: true },
        ],
        checks: [
          { ref: 'INS-1', t: 'Uji kecukupan cadangan teknis & interaksi PSAK 117 (LRC/LIC/CSM)', done: true, view: 'psak117' },
          { ref: 'INS-2', t: 'Perhitungan RBC & dampak salah saji ke tingkat solvabilitas', done: true },
          { ref: 'INS-3', t: 'Uji kekayaan yang diperkenankan & batasan investasi', done: false },
          { ref: 'INS-4', t: 'Konfirmasi dana jaminan ke bank kustodian', done: false },
          { ref: 'INS-5', t: 'Telaah keterlibatan Aktuaris (SA 620) atas asumsi & metode', done: false, view: 'expert' },
        ],
      },
      {
        id: 'pembiayaan', label: 'Pembiayaan / Multifinance', icon: 'coins', accent: '#5b3fa6',
        client: 'C-040', clientLabel: true,
        regs: ['POJK 35/2018 · Multifinance', 'POJK 10/2019 · Kesehatan PP', 'PSAK 71 · CKPN', 'PSAK 73 · Sewa Pembiayaan'],
        ratios: [
          { k: 'Gearing ratio', v: '4,8x', min: '≤ 10x', ok: true },
          { k: 'NPF (Non-Performing Financing)', v: '3,4%', min: '≤ 5%', ok: true },
          { k: 'Rasio permodalan (ekuitas)', v: 'Rp 980 jt', min: '≥ ketentuan minimum', ok: true },
          { k: 'BMPP (Batas Maks. Pemberian Pembiayaan)', v: '18,6%', min: '≤ 25% ekuitas', ok: true },
          { k: 'Piutang pembiayaan bersih', v: 'Rp 6.420 jt', min: 'Sesuai PSAK 71/73', ok: true },
        ],
        checks: [
          { ref: 'MFN-1', t: 'Uji klasifikasi & kualitas piutang pembiayaan (lancar–macet)', done: true },
          { ref: 'MFN-2', t: 'Rekonsiliasi CKPN PSAK 71 atas piutang pembiayaan', done: true, view: 'psak71' },
          { ref: 'MFN-3', t: 'Pemisahan sewa pembiayaan (PSAK 73) vs sewa operasi', done: true, view: 'psak73' },
          { ref: 'MFN-4', t: 'Uji kepatuhan gearing ratio & BMPP terhadap POJK 35/2018', done: false },
          { ref: 'MFN-5', t: 'Telaah restrukturisasi pembiayaan & dampak pengakuan pendapatan', done: false },
        ],
      },
      {
        id: 'emiten', label: 'Emiten Pasar Modal', icon: 'trend', accent: '#9a6a00',
        client: 'C-014', clientLabel: true,
        regs: ['POJK 4/2022 · Format LK Emiten', 'SEOJK Pedoman Penyajian per Sektor', 'POJK 14/2022 · Laporan Berkala', 'SA 700/720'],
        ratios: [
          { k: 'Format & klasifikasi LK', v: 'Sesuai', min: 'POJK 4/2022 + SEOJK sektor', ok: true },
          { k: 'Pengungkapan transaksi afiliasi', v: 'Lengkap', min: 'POJK 42/2020', ok: true },
          { k: 'Pengungkapan transaksi material', v: 'Lengkap', min: 'POJK 17/2020', ok: true },
          { k: 'Segmen operasi (PSAK 5)', v: 'Disajikan', min: 'Wajib emiten', ok: true, view: 'segmen' },
          { k: 'Laba per saham (PSAK 56)', v: 'Disajikan', min: 'Dasar & dilusian', ok: true },
        ],
        checks: [
          { ref: 'EMT-1', t: 'Kesesuaian format & muatan LK dengan POJK 4/2022 + SEOJK sektor', done: true },
          { ref: 'EMT-2', t: 'Uji pengungkapan transaksi afiliasi/benturan kepentingan (POJK 42/2020)', done: true, view: 'related' },
          { ref: 'EMT-3', t: 'Uji pengungkapan transaksi material & perubahan kegiatan usaha', done: false },
          { ref: 'EMT-4', t: 'Telaah informasi lain dalam Laporan Tahunan (SA 720)', done: false, view: 'sa720' },
          { ref: 'EMT-5', t: 'Penyajian segmen, EPS, & ikhtisar data keuangan penting', done: false },
        ],
      },
    ].map(s => ({ ...s, clientName: s.client && s.client.startsWith('C-') ? cli(s.client).name : s.client }));

    const allChecks = sectors.reduce((a, s) => a + s.checks.length, 0);
    const doneChecks = sectors.reduce((a, s) => a + s.checks.filter(c => c.done).length, 0);
    return { sectors, allChecks, doneChecks, pct: Math.round(doneChecks / allChecks * 100) };
  }

  /* =========================================================
     G15 · BATAS WAKTU & PENYAMPAIAN ELEKTRONIK LK → OJK/BEI
     ========================================================= */
  function ojkFiling() {
    /* Tahun buku 31 Des 2025. Batas waktu mengacu:
       - LK Tahunan Auditan: akhir bulan ke-3 (POJK 14/2022)  → 31 Mar 2026
       - Laporan Tahunan: akhir bulan ke-4 / sebelum RUPS (POJK 44/2024) → 30 Apr 2026
       - Penyampaian elektronik: SPRINT OJK + IDXnet BEI.
       Tanggal acuan "hari ini" untuk pelacak: 17 Jun 2026. */
    const TODAY = new Date('2026-06-17');
    const dday = (d) => Math.round((new Date(d) - TODAY) / 86400000);

    const obligations = [
      { kind: 'LK Tahunan Auditan', basis: 'POJK 14/2022 Ps. 7', due: '2026-03-31', channels: 'SPRINT · IDXnet', win: 'akhir bulan ke-3' },
      { kind: 'Laporan Tahunan (Annual Report)', basis: 'POJK 44/2024', due: '2026-04-30', channels: 'SPRINT · IDXnet', win: 'akhir bulan ke-4' },
      { kind: 'LK Tengah Tahunan', basis: 'POJK 14/2022', due: '2025-07-31', channels: 'SPRINT · IDXnet', win: 'akhir bulan ke-1 (reviu) / ke-2', interim: true },
    ];

    /* Status penyampaian per emiten (listed:true) — tanda terima elektronik. */
    const seed = [
      { id: 'C-014', lkAud: { st: 'Disampaikan', on: '2026-03-21', rcpt: 'SPRINT/2026/03/014-778', late: false }, ar: { st: 'Disampaikan', on: '2026-04-18', rcpt: 'IDX/AR/2026/0418-014', late: false } },
      { id: 'C-040', lkAud: { st: 'Disampaikan', on: '2026-03-30', rcpt: 'SPRINT/2026/03/040-902', late: false }, ar: { st: 'Disampaikan', on: '2026-04-29', rcpt: 'IDX/AR/2026/0429-040', late: false } },
      { id: 'C-031', lkAud: { st: 'Disampaikan', on: '2026-04-03', rcpt: 'SPRINT/2026/04/031-115', late: true, lateDays: 3 }, ar: { st: 'Tertunda', on: null, rcpt: null, late: false } },
      { id: 'C-063', lkAud: { st: 'Proses EQR', on: null, rcpt: null, late: false, atRisk: true }, ar: { st: 'Belum mulai', on: null, rcpt: null, late: false } },
    ];
    const entities = seed.map(s => {
      const c = cli(s.id);
      return { ...s, name: c.name, npwp: c.npwp,
        sector: (c.industry || '').split('·')[0].trim() || '—' };
    });

    const submitted = entities.filter(e => e.lkAud.st === 'Disampaikan').length;
    const late = entities.filter(e => e.lkAud.late).length;
    const atRisk = entities.filter(e => e.lkAud.atRisk).length;

    return {
      asof: '17 Jun 2026', period: '31 Desember 2025',
      obligations: obligations.map(o => ({ ...o, dday: dday(o.due) })),
      entities, count: entities.length, submitted, late, atRisk,
      channelsNote: 'SPRINT — Sistem Pelaporan Elektronik OJK · IDXnet — pelaporan elektronik BEI.',
      penalty: 'Sanksi keterlambatan: denda administratif s.d. Rp 1.000.000/hari kerja (POJK 14/2022 jo. POJK sanksi).',
    };
  }

  /* =========================================================
     G16 · KOMUNIKASI KOMITE AUDIT — POJK 55/2015 jo. POJK 13/2017
     ========================================================= */
  function ojkAuditComm() {
    /* Catatan kemutakhiran: pedoman kerja Komite Audit emiten diatur
       POJK 55/POJK.04/2015; rekomendasi penunjukan AP/KAP oleh Komite
       Audit pada LJK diatur POJK 13/POJK.03/2017. Dimensi ini di luar
       komunikasi SA 260 (audit) yang sudah tercakup modul sa260. */
    const composition = [
      { role: 'Ketua — Komisaris Independen', name: 'Ir. Soemarno Widjaja', indep: true, fin: false },
      { role: 'Anggota — Pihak Independen (akuntansi/keuangan)', name: 'Dra. Retno Kusumawardani, CA', indep: true, fin: true },
      { role: 'Anggota — Pihak Independen (hukum)', name: 'Hendra Saputra, S.H., M.H.', indep: true, fin: false },
    ];

    /* Daftar-uji tugas Komite Audit di luar SA 260 (POJK 55/2015 Ps. 4) */
    const duties = [
      { ref: 'KA-1', t: 'Rekomendasi penunjukan AP/KAP berbasis independensi, ruang lingkup & imbalan', basis: 'POJK 13/2017 · POJK 55/2015', done: true },
      { ref: 'KA-2', t: 'Evaluasi independensi & objektivitas Akuntan Publik', basis: 'POJK 55/2015 Ps. 4', done: true },
      { ref: 'KA-3', t: 'Telaah pelaksanaan audit oleh AP & kecukupan ruang lingkup', basis: 'POJK 55/2015 Ps. 4', done: true },
      { ref: 'KA-4', t: 'Telaah informasi keuangan yang diterbitkan (LK & proyeksi)', basis: 'POJK 55/2015 Ps. 4', done: true },
      { ref: 'KA-5', t: 'Telaah ketaatan terhadap peraturan perundang-undangan pasar modal', basis: 'POJK 55/2015 Ps. 4', done: false },
      { ref: 'KA-6', t: 'Telaah & laporan pengaduan (whistleblowing) terkait proses akuntansi', basis: 'POJK 55/2015 Ps. 4', done: false },
      { ref: 'KA-7', t: 'Telaah pelaksanaan manajemen risiko oleh Direksi', basis: 'POJK 55/2015 Ps. 4', done: false },
      { ref: 'KA-8', t: 'Pra-persetujuan jasa selain audit (NAS) oleh AP', basis: 'Kode Etik · POJK 13/2017', done: false, view: 'nonaudit' },
      { ref: 'KA-9', t: 'Penjagaan kerahasiaan dokumen, data & informasi perusahaan', basis: 'POJK 55/2015 Ps. 11', done: true },
    ];

    /* Risalah rapat auditor ↔ Komite Audit (terpisah dari TCWG SA 260) */
    const meetings = [
      { date: '12 Nov 2025', topic: 'Perencanaan audit, ruang lingkup & rekomendasi penunjukan KAP', who: 'Komite Audit + Partner', kind: 'Pra-audit' },
      { date: '04 Feb 2026', topic: 'Temuan interim, defisiensi pengendalian & risiko signifikan', who: 'Komite Audit + Manajer', kind: 'Interim' },
      { date: '18 Mar 2026', topic: 'Hal Audit Utama (KAM), salah saji belum dikoreksi & draf opini', who: 'Komite Audit + Partner', kind: 'Penyelesaian' },
      { date: '20 Mar 2026', topic: 'Pernyataan independensi & evaluasi mutu audit tahunan', who: 'Komite Audit + EQR', kind: 'Independensi' },
    ];

    const done = duties.filter(d => d.done).length;
    return {
      reg: 'POJK 55/POJK.04/2015 jo. POJK 13/POJK.03/2017',
      composition, duties, meetings,
      done, total: duties.length, pct: Math.round(done / duties.length * 100),
      compMin: composition.length >= 3, hasFin: composition.some(c => c.fin), chairIndep: composition[0] && composition[0].indep,
      bridge: [
        { id: 'sa260', lbl: 'SA 260 · Komunikasi TCWG', rel: 'Hulu komunikasi audit formal' },
        { id: 'sa265', lbl: 'SA 265 · Defisiensi Pengendalian', rel: 'Materi telaah komite' },
        { id: 'governance', lbl: 'Governance (SOQM)', rel: 'Tata kelola firma & independensi' },
        { id: 'nonaudit', lbl: 'Portofolio Jasa Non-Audit', rel: 'Pra-persetujuan NAS' },
      ],
    };
  }

  Object.assign(window.AMS_CANON, { ojkSustain, ojkSector, ojkFiling, ojkAuditComm });
})();
