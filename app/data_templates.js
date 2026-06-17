/* ============================================================
   NeoSuite AMS — Template Library (single source of truth)
   ------------------------------------------------------------
   Satu registri kanonik untuk seluruh template & kertas kerja
   firma. Ditarik oleh:
     · view_misc2 (Template Library) — katalog & tata kelola
     · related_modules (ModuleLineage) — dock "Keterkaitan Modul"
       untuk modul `templates` DIBANGKITKAN dari registri ini
     · DMS — pack metodologi yang diarsipkan (DOC-0701) ditaut balik

   PRINSIP: setiap template menaut ke (a) `module` = modul audit yang
   MEMAKAI keluarannya, dan (b) `sa` = standar yang dipenuhinya — memakai
   konvensi yang sama dengan RELATED_SA / window.__amsOpenSA, sehingga
   satu perubahan di registri mengalir konsisten ke seluruh modul.

   Status tinjauan dihitung relatif terhadap NOW (bukan di-hardcode):
   nextReview < NOW  →  "Perlu Reviu".
   ============================================================ */
(function () {
  const NOW = new Date('2026-06-13');

  /* fmt: DOCX | XLSX | PDF | PPTX
     phase: Perencanaan | Pelaksanaan | Pelaporan | Tata Kelola & Mutu | Pajak
     module: id modul audit yang memakai keluaran template (MODULE_INDEX)
     sa: [{ code, view? }] standar yang dipenuhi (view = halaman SA mendalam)
     dl: kumulatif unduhan · engs: engagement yang memakai (tahun berjalan) */
  const TEMPLATES = [
    /* ---------- Perencanaan ---------- */
    { id: 'TPL-PLN-01', name: 'Audit Strategy Memo', fmt: 'DOCX', phase: 'Perencanaan', cat: 'Perencanaan & Penerimaan',
      ver: '5.1', updated: '2026-01-12', steward: 'Tim Metodologi', status: 'Aktif', module: 'strategy',
      sa: [{ code: 'SA 300' }, { code: 'SA 315' }], dl: 124, engs: ['ENG-2025-014', 'ENG-2025-047', 'ENG-2025-063'],
      nextReview: '2027-01-12', retention: 3, desc: 'Memo strategi audit menyeluruh: pemahaman entitas, lingkungan, dan pendekatan respons risiko.' },
    { id: 'TPL-PLN-02', name: 'Engagement Letter', fmt: 'DOCX', phase: 'Perencanaan', cat: 'Perencanaan & Penerimaan',
      ver: '4.3', updated: '2025-11-20', steward: 'Rudi Gunawan, CPA', status: 'Aktif', module: 'onboarding',
      sa: [{ code: 'SA 210' }], dl: 156, engs: ['ENG-2025-047', 'ENG-2025-063'],
      nextReview: '2026-11-20', retention: 10, desc: 'Surat perikatan baku SA 210 — ketentuan, ruang lingkup, dan tanggung jawab para pihak.' },
    { id: 'TPL-PLN-03', name: 'Risk Assessment Matrix', fmt: 'XLSX', phase: 'Perencanaan', cat: 'Penilaian Risiko',
      ver: '6.0', updated: '2026-02-02', steward: 'Tim Metodologi', status: 'Aktif', module: 'risk',
      sa: [{ code: 'SA 315' }], dl: 98, engs: ['ENG-2025-014', 'ENG-2025-047'],
      nextReview: '2027-02-02', retention: 3, desc: 'Matriks identifikasi & penilaian RoMM tingkat asersi, terhubung ke respons audit (SA 330).' },
    { id: 'TPL-PLN-04', name: 'Materiality Worksheet', fmt: 'XLSX', phase: 'Perencanaan', cat: 'Penilaian Risiko',
      ver: '3.4', updated: '2025-09-15', steward: 'Tim Metodologi', status: 'Aktif', module: 'materiality',
      sa: [{ code: 'SA 320' }], dl: 211, engs: ['ENG-2025-014', 'ENG-2025-047', 'ENG-2025-063'],
      nextReview: '2026-09-15', retention: 3, desc: 'Penetapan benchmark, materialitas keseluruhan, pelaksanaan, dan ambang sepele.' },
    { id: 'TPL-PLN-05', name: 'Audit Programme (Master)', fmt: 'XLSX', phase: 'Perencanaan', cat: 'Penilaian Risiko',
      ver: '7.2', updated: '2026-03-01', steward: 'Tim Metodologi', status: 'Aktif', module: 'programme',
      sa: [{ code: 'SA 300' }, { code: 'SA 330' }], dl: 187, engs: ['ENG-2025-014', 'ENG-2025-063'],
      nextReview: '2027-03-01', retention: 3, desc: 'Program audit induk per siklus — prosedur respons risiko, anggaran jam, dan referensi kertas kerja.' },
    { id: 'TPL-PLN-06', name: 'Independence Declaration', fmt: 'DOCX', phase: 'Perencanaan', cat: 'Perencanaan & Penerimaan',
      ver: '2.1', updated: '2026-04-08', steward: 'Hartono Wijaya, CPA', status: 'Aktif', module: 'independence',
      sa: [{ code: 'SA 220' }], dl: 73, engs: ['ENG-2025-014', 'ENG-2025-047', 'ENG-2025-063'],
      nextReview: '2027-04-08', retention: 10, desc: 'Deklarasi independensi tim perikatan — benturan kepentingan, rotasi, dan ancaman familiaritas.' },

    /* ---------- Pelaksanaan ---------- */
    { id: 'TPL-EXE-01', name: 'Lead Schedule (semua akun)', fmt: 'XLSX', phase: 'Pelaksanaan', cat: 'Kertas Kerja Substantif',
      ver: '8.0', updated: '2026-02-18', steward: 'Tim Metodologi', status: 'Aktif', module: 'wtb',
      sa: [{ code: 'SA 500' }], dl: 340, engs: ['ENG-2025-014', 'ENG-2025-047', 'ENG-2025-063'],
      nextReview: '2027-02-18', retention: 10, desc: 'Lead & supporting schedule per pos LK — tertaut langsung ke Working Trial Balance dan AJE.' },
    { id: 'TPL-EXE-02', name: 'Sampling Worksheet (MUS)', fmt: 'XLSX', phase: 'Pelaksanaan', cat: 'Kertas Kerja Substantif',
      ver: '4.2', updated: '2025-12-05', steward: 'Tim Metodologi', status: 'Aktif', module: 'sampling',
      sa: [{ code: 'SA 530', view: 'sa530' }], dl: 87, engs: ['ENG-2025-014', 'ENG-2025-047'],
      nextReview: '2026-12-05', retention: 10, desc: 'Kalkulator sampel Monetary Unit Sampling — interval, seleksi, dan proyeksi salah saji populasi.' },
    { id: 'TPL-EXE-03', name: 'External Confirmation Pack', fmt: 'DOCX', phase: 'Pelaksanaan', cat: 'Konfirmasi & Eksternal',
      ver: '3.0', updated: '2025-10-22', steward: 'Sari Dewanti, CPA', status: 'Aktif', module: 'confirm',
      sa: [{ code: 'SA 505' }], dl: 132, engs: ['ENG-2025-014', 'ENG-2025-047'],
      nextReview: '2026-10-22', retention: 10, desc: 'Surat konfirmasi piutang, utang, bank, dan hukum — positif/negatif beserta prosedur alternatif.' },
    { id: 'TPL-EXE-04', name: 'Walkthrough Template', fmt: 'DOCX', phase: 'Pelaksanaan', cat: 'Pengendalian Internal',
      ver: '2.6', updated: '2025-08-30', steward: 'Tim Metodologi', status: 'Aktif', module: 'icfr',
      sa: [{ code: 'SA 315' }], dl: 76, engs: ['ENG-2025-014', 'ENG-2025-063'],
      nextReview: '2026-08-30', retention: 10, desc: 'Dokumentasi walkthrough alur transaksi — titik kontrol, atribut pengujian, dan kesimpulan desain.' },
    { id: 'TPL-EXE-05', name: 'Journal Entry Testing Sheet', fmt: 'XLSX', phase: 'Pelaksanaan', cat: 'Kertas Kerja Substantif',
      ver: '3.3', updated: '2026-01-28', steward: 'Tim Metodologi', status: 'Aktif', module: 'jet',
      sa: [{ code: 'SA 240', view: 'sa240' }], dl: 64, engs: ['ENG-2025-014'],
      nextReview: '2027-01-28', retention: 10, desc: 'Kriteria seleksi jurnal berisiko (override manajemen), atribut anomali, dan tindak lanjut eksepsi.' },
    { id: 'TPL-EXE-06', name: 'Analytical Review Workbook', fmt: 'XLSX', phase: 'Pelaksanaan', cat: 'Kertas Kerja Substantif',
      ver: '5.0', updated: '2026-02-25', steward: 'Tim Metodologi', status: 'Aktif', module: 'analytical',
      sa: [{ code: 'SA 520', view: 'sa520' }], dl: 119, engs: ['ENG-2025-014', 'ENG-2025-047', 'ENG-2025-063'],
      nextReview: '2027-02-25', retention: 10, desc: 'Reviu analitis: ekspektasi, ambang investigasi, dan penjelasan fluktuasi tak biasa.' },
    { id: 'TPL-EXE-07', name: 'ECL / CKPN Calculator', fmt: 'XLSX', phase: 'Pelaksanaan', cat: 'Estimasi Akuntansi',
      ver: '4.1', updated: '2026-03-10', steward: 'Tim Metodologi', status: 'Aktif', module: 'psak71',
      sa: [{ code: 'SA 540', view: 'sa540' }], dl: 142, engs: ['ENG-2025-047'],
      nextReview: '2027-03-10', retention: 10, desc: 'Model expected credit loss (PSAK 71) — staging, PD/LGD, dan re-perform aging piutang.' },
    { id: 'TPL-EXE-08', name: 'Inventory Observation Sheet', fmt: 'DOCX', phase: 'Pelaksanaan', cat: 'Konfirmasi & Eksternal',
      ver: '2.0', updated: '2025-06-30', steward: 'Tim Metodologi', status: 'Perlu Reviu', module: 'psak14',
      sa: [{ code: 'SA 501', view: 'sa501' }], dl: 58, engs: ['ENG-2025-014'],
      nextReview: '2026-06-30', retention: 10, desc: 'Lembar observasi stock opname — uji hitung dua arah, cut-off, dan identifikasi NRV.' },

    /* ---------- Pelaporan ---------- */
    { id: 'TPL-RPT-01', name: 'Audit Report (WTM / WDP / TW)', fmt: 'DOCX', phase: 'Pelaporan', cat: 'Laporan & Opini',
      ver: '6.3', updated: '2026-02-14', steward: 'Sari Dewanti, CPA', status: 'Aktif', module: 'opinion',
      sa: [{ code: 'SA 700' }, { code: 'SA 705/706', view: 'sa705' }], dl: 189, engs: ['ENG-2025-047'],
      nextReview: '2027-02-14', retention: 10, desc: 'Laporan auditor independen — varian opini tanpa modifikasi & modifikasi, beserta basis & KAM.' },
    { id: 'TPL-RPT-02', name: 'Management Letter', fmt: 'DOCX', phase: 'Pelaporan', cat: 'Komunikasi',
      ver: '3.1', updated: '2025-12-18', steward: 'Sari Dewanti, CPA', status: 'Aktif', module: 'mgmtletter',
      sa: [{ code: 'SA 260', view: 'sa260' }, { code: 'SA 265', view: 'sa265' }], dl: 142, engs: ['ENG-2025-014', 'ENG-2025-047'],
      nextReview: '2026-12-18', retention: 10, desc: 'Surat manajemen — defisiensi pengendalian, rekomendasi, dan tanggapan manajemen.' },
    { id: 'TPL-RPT-03', name: 'Financial Statement Template', fmt: 'XLSX', phase: 'Pelaporan', cat: 'Laporan & Opini',
      ver: '7.0', updated: '2026-01-30', steward: 'Tim Metodologi', status: 'Aktif', module: 'fsgen',
      sa: [{ code: 'SA 700' }], dl: 167, engs: ['ENG-2025-014', 'ENG-2025-063'],
      nextReview: '2027-01-30', retention: 10, desc: 'Kerangka LK lengkap selaras PSAK 1 — laporan posisi, laba rugi, perubahan ekuitas, arus kas & CALK.' },
    { id: 'TPL-RPT-04', name: 'Representation Letter', fmt: 'DOCX', phase: 'Pelaporan', cat: 'Komunikasi',
      ver: '4.0', updated: '2026-02-05', steward: 'Hartono Wijaya, CPA', status: 'Aktif', module: 'opinion',
      sa: [{ code: 'SA 580', view: 'sa580' }], dl: 121, engs: ['ENG-2025-047'],
      nextReview: '2027-02-05', retention: 10, desc: 'Surat representasi manajemen — prasyarat opini, mencakup peristiwa kemudian (SA 560).' },
    { id: 'TPL-RPT-05', name: 'TCWG Communication', fmt: 'DOCX', phase: 'Pelaporan', cat: 'Komunikasi',
      ver: '2.2', updated: '2025-11-08', steward: 'Sari Dewanti, CPA', status: 'Aktif', module: 'mgmtletter',
      sa: [{ code: 'SA 260', view: 'sa260' }], dl: 58, engs: ['ENG-2025-014'],
      nextReview: '2026-11-08', retention: 10, desc: 'Komunikasi dengan pihak bertanggung jawab atas tata kelola — lingkup, temuan signifikan, independensi.' },
    { id: 'TPL-RPT-06', name: 'Misstatement Summary (SAD)', fmt: 'XLSX', phase: 'Pelaporan', cat: 'Laporan & Opini',
      ver: '3.0', updated: '2025-10-12', steward: 'Tim Metodologi', status: 'Aktif', module: 'sad',
      sa: [{ code: 'SA 450', view: 'sad' }], dl: 94, engs: ['ENG-2025-014', 'ENG-2025-047'],
      nextReview: '2026-10-12', retention: 10, desc: 'Akumulasi salah saji terkoreksi & tak terkoreksi — evaluasi terhadap materialitas (SA 450).' },

    /* ---------- Tata Kelola & Mutu ---------- */
    { id: 'TPL-QM-01', name: 'Audit Methodology Pack', fmt: 'DOCX', phase: 'Tata Kelola & Mutu', cat: 'Metodologi & ISQM',
      ver: '4.2', updated: '2026-01-02', steward: 'Tim Metodologi', status: 'Aktif', module: 'governance',
      sa: [{ code: 'ISQM 1' }, { code: 'SA 220' }], dl: 92, engs: [], dmsDoc: 'DOC-0701',
      nextReview: '2027-01-02', retention: 3, desc: 'Pack metodologi firma menyeluruh — selaras ISQM & SA 315 (revisi). Diarsipkan & dikendalikan di DMS.' },
    { id: 'TPL-QM-02', name: 'EQR Review Checklist', fmt: 'DOCX', phase: 'Tata Kelola & Mutu', cat: 'Metodologi & ISQM',
      ver: '3.2', updated: '2025-12-20', steward: 'Hartono Wijaya, CPA', status: 'Aktif', module: 'eqr',
      sa: [{ code: 'SA 220' }], dl: 67, engs: ['ENG-2025-063'],
      nextReview: '2026-12-20', retention: 10, desc: 'Daftar tilik telaah pengendalian mutu perikatan (EQR) — kesimpulan, independensi, dan dokumentasi.' },
    { id: 'TPL-QM-03', name: 'Acceptance & Continuance', fmt: 'DOCX', phase: 'Tata Kelola & Mutu', cat: 'Metodologi & ISQM',
      ver: '2.5', updated: '2026-03-18', steward: 'Rudi Gunawan, CPA', status: 'Draf', module: 'onboarding',
      sa: [{ code: 'SA 220' }], dl: 41, engs: [],
      nextReview: '2027-03-18', retention: 10, desc: 'Formulir penerimaan & keberlanjutan klien — PMPJ/APU-PPT, integritas, dan kapasitas firma.' },

    /* ---------- Pajak ---------- */
    { id: 'TPL-TAX-01', name: 'PPh 23 Recap & e-Bupot', fmt: 'XLSX', phase: 'Pajak', cat: 'Pajak',
      ver: '2.0', updated: '2025-07-04', steward: 'Citra Halim', status: 'Perlu Reviu', module: 'tax',
      sa: [{ code: 'UU HPP' }], dl: 49, engs: ['ENG-2025-014'],
      nextReview: '2026-05-31', retention: 10, desc: 'Rekap pemotongan PPh Pasal 23 & rekonsiliasi e-Bupot Unifikasi dengan SPT Masa.' },
  ];

  /* status tinjauan turunan (live) — overdue bila nextReview < NOW */
  TEMPLATES.forEach(t => { t.reviewDue = new Date(t.nextReview) < NOW; });

  /* reverse-index: modul → template yang memberinya keluaran.
     Dipakai modul lain untuk menarik "template terkait" dari sumber yang sama. */
  const TEMPLATES_BY_MODULE = {};
  TEMPLATES.forEach(t => {
    (TEMPLATES_BY_MODULE[t.module] = TEMPLATES_BY_MODULE[t.module] || []).push(t);
  });
  const templatesForModule = (id) => TEMPLATES_BY_MODULE[id] || [];

  /* distinct daftar modul konsumen (untuk membangkitkan lineage dock) */
  const TEMPLATE_CONSUMERS = Array.from(new Set(TEMPLATES.map(t => t.module)));

  window.AMS = window.AMS || {};
  Object.assign(window.AMS, { TEMPLATES, TEMPLATES_BY_MODULE, templatesForModule, TEMPLATE_CONSUMERS });
})();
