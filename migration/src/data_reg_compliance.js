/* ============================================================
   NeoSuite AMS — Presisi Regulatori (lapisan tambahan)
   Menutup gap evaluasi kepatuhan SAK·SPAP·P2PK·OJK:
     G6  Independensi etika di luar rotasi — ketergantungan
         imbalan · pra-persetujuan NAS · asosiasi jangka panjang
     G7  Alur NOCLAR profesi (Kode Etik) — terpisah dari SA 250
     G8  Kemutakhiran versi standar revisi (SA 315/540/600/220)
     G9  Etika jasa pajak & teknologi (IESBA terbaru)
   Semua angka imbalan ditarik dari AMS.PPPK_CLIENTS (SSOT);
   modul TIDAK menyimpan salinan privat imbalan per klien.
   ============================================================ */
import { AMS } from './data.js';
(function () {
  const A = AMS;
  const feeOf = (id) => { const c = (A.PPPK_CLIENTS || []).find(x => x.id === id); return c ? c.fee : 0; };

  /* ===========================================================
     G6a · KETERGANTUNGAN IMBALAN (Fee Dependency)
     IESBA 410 / KEPAP — untuk klien PIE, total imbalan dari satu
     klien (+ entitas berelasi) > 15% total imbalan firma selama
     dua tahun berturut-turut memicu pengamanan & komunikasi TCWG.
     curFee ditarik dari PPPK_CLIENTS; priorFee = realisasi TA-1.
     =========================================================== */
  const FEE_DEPENDENCY = {
    threshold: 15,                 // % ambang IESBA untuk PIE
    firmRevCur: 13_800,            // total imbalan firma TA2025 (jt)
    firmRevPrior: 12_600,          // total imbalan firma TA2024 (jt)
    clients: [
      { id: 'C-040', name: 'PT Mandiri Sejahtera Finance', pie: true, sektorJK: true, priorFee: 1_980, related: 0 },
      { id: 'C-014', name: 'PT Sentosa Makmur Tbk', pie: true, sektorJK: false, priorFee: 1_700, related: 180 },
      { id: 'C-063', name: 'PT Graha Properti Investama', pie: true, sektorJK: false, priorFee: 1_520, related: 0 },
      { id: 'C-031', name: 'PT Bumi Hijau Agrindo', pie: true, sektorJK: false, priorFee: 980, related: 0 },
      { id: 'C-052', name: 'PT Karya Beton Perkasa', pie: false, sektorJK: false, priorFee: 600, related: 0 },
    ],
  };
  /* perkaya tiap baris dengan persentase & status pengamanan (turunan, bukan hardcode) */
  FEE_DEPENDENCY.rows = FEE_DEPENDENCY.clients.map(c => {
    const curFee = feeOf(c.id) + (c.related || 0);
    const curPct = +(curFee / FEE_DEPENDENCY.firmRevCur * 100).toFixed(1);
    const priorPct = +((c.priorFee + (c.related || 0)) / FEE_DEPENDENCY.firmRevPrior * 100).toFixed(1);
    const overCur = c.pie && curPct > FEE_DEPENDENCY.threshold;
    const overPrior = c.pie && priorPct > FEE_DEPENDENCY.threshold;
    const trigger = overCur && overPrior;          // 2 tahun berturut > 15%
    return {
      ...c, curFee, curPct, priorPct, overCur, overPrior, trigger,
      status: trigger ? 'Pengamanan + Komunikasi TCWG' : overCur ? 'Pantau (1 tahun > 15%)' : 'Dalam ambang',
      safeguard: trigger
        ? 'Reviu pra-penerbitan oleh AP independen + pengungkapan & komunikasi tahunan ke TCWG (IESBA 410)'
        : overCur ? 'Pemantauan tren; reviu mutu perikatan' : '—',
    };
  });

  /* ===========================================================
     G6b · PRA-PERSETUJUAN JASA SELAIN ASURANS (NAS)
     IESBA 600-series — sebagian NAS dilarang untuk klien audit
     PIE. Portofolio nonaudit ditautkan ke daftar larangan.
     =========================================================== */
  const NAS_PROHIBITION = [
    { ref: 'IESBA 601', svc: 'Jasa akuntansi & pembukuan' },
    { ref: 'IESBA 603', svc: 'Jasa valuasi / estimasi signifikan' },
    { ref: 'IESBA 604', svc: 'Jasa perpajakan (perhitungan utk dasar jurnal material)' },
    { ref: 'IESBA 606', svc: 'Desain/implementasi sistem TI pelaporan keuangan' },
    { ref: 'IESBA 608', svc: 'Jasa hukum / advokasi' },
    { ref: 'IESBA 609', svc: 'Jasa rekrutmen eksekutif kunci' },
  ];
  const NAS_PREAPPROVAL = [
    { id: 'NAS-01', client: 'PT Mandiri Sejahtera Finance', pie: true, svc: 'Prosedur Disepakati (AUP) — portofolio pembiayaan', cat: 'Jasa Terkait (SPSJL 4400)', selfReview: 'Rendah', prohibited: false, status: 'Disetujui', approver: 'Ethics & Independence Partner', basis: 'Bukan asurans atas LK; diizinkan dgn pengamanan' },
    { id: 'NAS-02', client: 'PT Sentosa Makmur Tbk', pie: true, svc: 'Penilaian estimasi akuntansi signifikan (impairment)', cat: 'Valuasi', selfReview: 'Tinggi', prohibited: true, status: 'Ditolak', approver: '—', basis: 'IESBA 603 — dilarang untuk klien audit PIE (ancaman telaah-pribadi)' },
    { id: 'NAS-03', client: 'PT Sentosa Makmur Tbk', pie: true, svc: 'Jasa perpajakan — perencanaan pajak agresif', cat: 'Pajak', selfReview: 'Sedang', prohibited: true, status: 'Ditolak', approver: '—', basis: 'IESBA 604/280 — perencanaan pajak agresif dilarang (advokasi)' },
    { id: 'NAS-04', client: 'PT Bumi Hijau Agrindo', pie: true, svc: 'Desain & implementasi sistem TI pelaporan keuangan', cat: 'Teknologi', selfReview: 'Tinggi', prohibited: true, status: 'Ditolak', approver: '—', basis: 'IESBA 606 — sistem yang menjadi bagian pengendalian internal PLK' },
    { id: 'NAS-05', client: 'PT Cahaya Logistik Nusantara', pie: false, svc: 'Kompilasi LK (SPSJL 4410)', cat: 'Kompilasi', selfReview: 'Sedang', prohibited: false, status: 'Disetujui', approver: 'Ethics & Independence Partner', basis: 'Non-PIE; bukan klien audit — diizinkan dgn pengamanan' },
    { id: 'NAS-06', client: 'PT Samudra Pangan Lestari', pie: false, svc: 'Pelatihan standar akuntansi internal', cat: 'Pelatihan', selfReview: 'Rendah', prohibited: false, status: 'Menunggu', approver: '—', basis: 'Tidak menimbulkan ancaman material; menunggu pra-persetujuan' },
  ];

  /* ===========================================================
     G6c · ASOSIASI JANGKA PANJANG (Long Association)
     IESBA 540 — personel senior (di luar AP penanda tangan) yang
     berasosiasi lama dengan klien audit memicu ancaman kedekatan.
     =========================================================== */
  const LONG_ASSOCIATION = [
    { name: 'Hartono Wijaya', role: 'Engagement Partner', client: 'PT Sentosa Makmur Tbk', years: 5, kind: 'AP perikatan', regime: '5 thn (PIE umum)', threat: 'Kedekatan / kepentingan pribadi', action: 'Rotasi pada FY berikut; reviu EQR wajib', flag: 'due' },
    { name: 'Rudi Gunawan', role: 'Engagement Partner', client: 'PT Mandiri Sejahtera Finance', years: 6, kind: 'AP perikatan', regime: '3 thn (sektor jasa keuangan)', threat: 'Kedekatan', action: 'Melebihi batas 3 thn — rotasi mendesak + cooling-off 2 thn', flag: 'over' },
    { name: 'Anindya Pramesti', role: 'Manajer Audit Kunci', client: 'PT Sentosa Makmur Tbk', years: 7, kind: 'Personel senior', regime: 'Tinjauan kebijakan firma', threat: 'Kedekatan', action: 'Reviu independen tahunan; pertimbangkan rotasi personel kunci', flag: 'warn' },
    { name: 'Dewi Anggraini', role: 'Engagement Quality Reviewer', client: 'PT Sentosa Makmur Tbk', years: 4, kind: 'EQR', regime: 'Maks. keterlibatan EQR', threat: 'Kedekatan', action: 'Pantau; batasi masa keterlibatan EQR', flag: 'ok' },
  ];

  /* ===========================================================
     G7 · ALUR NOCLAR PROFESI (Kode Etik — terpisah dari SA 250)
     Kode Etik IAPI Seksi 360 (akuntan praktisi). Berbeda dari SA
     250: melekat pada profesi — dokumentasi, eskalasi manajemen/
     TCWG, & keputusan pengungkapan ke otoritas.
     =========================================================== */
  const NOCLAR_STAGES = [
    'Identifikasi indikasi',
    'Evaluasi (Kode Etik §360)',
    'Diskusi dengan manajemen',
    'Eskalasi ke TCWG',
    'Keputusan pengungkapan otoritas',
    'Dokumentasi & penutupan',
  ];
  const NOCLAR_ETHICS = [
    { id: 'NCE-01', client: 'PT Sentosa Makmur Tbk', issue: 'Indikasi dugaan suap perizinan oleh manajemen entitas anak', law: 'UU Tipikor / anti-suap', section: '§360.20', severity: 'Tinggi', stageIdx: 3, disclosure: 'Dipertimbangkan', determinant: 'Dapat mengalahkan kerahasiaan bila kepentingan publik mendesak', note: 'Telah dieskalasi ke TCWG; menunggu opini penasihat hukum sebelum keputusan pengungkapan.' },
    { id: 'NCE-02', client: 'PT Mandiri Sejahtera Finance', issue: 'Dugaan pelanggaran BMPK & pelaporan menyesatkan ke OJK', law: 'POJK perbankan/pembiayaan', section: '§360.25', severity: 'Tinggi', stageIdx: 4, disclosure: 'Wajib — sektor diawasi OJK', determinant: 'Pengungkapan ke OJK diwajibkan regulasi sektoral', note: 'Komunikasi ke OJK dikoordinasikan; dokumentasi keputusan pengungkapan disiapkan.' },
    { id: 'NCE-03', client: 'PT Teknologi Andalan Digital', issue: 'Ketidakpatuhan kontrak baku & dugaan penghindaran pajak terstruktur', law: 'UU Pajak / UU Perlindungan Konsumen', section: '§360.20', severity: 'Sedang', stageIdx: 2, disclosure: 'Belum diperlukan', determinant: 'Belum melewati ambang material; respons di tingkat manajemen', note: 'Didiskusikan dengan manajemen; tindak lanjut korektif dipantau.' },
    { id: 'NCE-04', client: 'PT Cahaya Logistik Nusantara', issue: 'Tunggakan iuran jaminan sosial — telah dilunasi pasca-periode', law: 'UU Ketenagakerjaan / BPJS', section: '§360.16', severity: 'Rendah', stageIdx: 5, disclosure: 'Tidak diperlukan', determinant: 'Telah diperbaiki; tidak material', note: 'Selesai — terdokumentasi sebagai indikasi minor yang telah ditangani.' },
  ];

  /* ===========================================================
     G9 · ETIKA JASA PAJAK & TEKNOLOGI (IESBA — amandemen 2024)
     =========================================================== */
  const TAX_TECH_ETHICS = {
    tax: [
      { t: 'Tidak menganjurkan posisi pajak yang tidak memiliki dasar memadai (no credible basis)', ref: 'IESBA 280/604', status: 'Patuh' },
      { t: 'Tidak terlibat dalam perencanaan pajak agresif yang menyalahgunakan celah hukum', ref: 'IESBA Tax Planning 2024', status: 'Patuh' },
      { t: 'Mendokumentasikan pertimbangan kepentingan publik & dampak reputasi atas saran pajak', ref: 'IESBA Tax Planning 2024', status: 'Perlu Tinjau' },
      { t: 'Memisahkan jasa advokasi pajak dari jasa asurans untuk menghindari telaah-pribadi', ref: 'IESBA 604', status: 'Patuh' },
      { t: 'Komunikasi ketidakpastian & rentang hasil posisi pajak kepada klien secara transparan', ref: 'IESBA Tax Planning 2024', status: 'Perlu Tinjau' },
    ],
    tech: [
      { t: 'Menjaga kompetensi atas teknologi (termasuk AI) yang dipakai dalam perikatan', ref: 'IESBA Tech 2023/2024', status: 'Patuh' },
      { t: 'Menilai keandalan, bias, & keterjelasan output alat berbasis AI sebelum diandalkan', ref: 'IESBA Tech 2024', status: 'Perlu Tinjau' },
      { t: 'Menjaga kerahasiaan data klien saat menggunakan alat/AI pihak ketiga (cloud)', ref: 'IESBA 114 / UU PDP', status: 'Patuh' },
      { t: 'Tidak mengandalkan teknologi secara berlebihan tanpa skeptisisme & pertimbangan profesional', ref: 'IESBA Tech 2024', status: 'Patuh' },
      { t: 'Mendokumentasikan tata kelola & jejak audit penggunaan AI dalam kertas kerja', ref: 'IESBA Tech 2024 / SA 230', status: 'Perlu Tinjau' },
    ],
  };

  /* ===========================================================
     G8 · KEMUTAKHIRAN VERSI STANDAR AUDIT REVISI
     =========================================================== */
  const STD_VERSIONS = [
    { code: 'SA 315', title: 'Identifikasi & Penilaian Risiko Kesalahan Penyajian Material', ver: 'Revisi 2021', eff: 'Periode ≥ 15 Des 2022', key: 'Pemisahan risiko inheren & pengendalian · faktor risiko inheren · prosedur "stand-back"', module: 'riskassessment', current: true },
    { code: 'SA 540', title: 'Audit Estimasi Akuntansi & Pengungkapannya', ver: 'Revisi', eff: 'Periode ≥ 15 Des 2021', key: 'Spektrum ekspektasi · pengujian indikator bias manajemen · faktor risiko inheren', module: 'sa540', current: true },
    { code: 'SA 600', title: 'Pertimbangan Khusus — Audit Grup', ver: 'Revisi', eff: 'Periode ≥ 15 Des 2023', key: 'Keterlibatan tim grup pada penilaian risiko komponen · pelingkupan berbasis risiko (bukan sekadar komponen signifikan)', module: 'groupaudit', current: true },
    { code: 'SA 220', title: 'Pengelolaan Mutu Audit Laporan Keuangan', ver: 'Revisi', eff: 'Periode ≥ 15 Des 2022', key: 'Selaras SPM 1/ISQM 1 · pendekatan manajemen kualitas perikatan · keterlibatan AP', module: 'soqm', current: true },
  ];

  Object.assign(AMS, {
    FEE_DEPENDENCY, NAS_PROHIBITION, NAS_PREAPPROVAL, LONG_ASSOCIATION,
    NOCLAR_STAGES, NOCLAR_ETHICS, TAX_TECH_ETHICS, STD_VERSIONS,
  });
})();
