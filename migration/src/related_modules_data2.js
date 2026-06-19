/* ============================================================
   NeoSuite AMS — Related-modules data (lanjutan): template-lineage,
   entri lineage tambahan & peta SA. Dimuat SETELAH related_modules_data.js
   (LINEAGE sudah ada) dan SEBELUM related_modules.jsx.
   ============================================================ */
import { LINEAGE } from './related_modules_data.js'; // ESM: mutate the shared object, not a window re-binding (fixes TDZ)
import { AMS } from './data.js';


/* ============================================================
   Template Library — lineage DIBANGKITKAN dari registri kanonik
   (AMS.TEMPLATES). Hilir = modul yang memakai keluaran
   template; dibangun otomatis agar konsisten dengan sumber data.
   ============================================================ */
(function buildTemplateLineage() {
  const T = (AMS && AMS.TEMPLATES) || [];
  if (!T.length) return;
  const MI = window.MODULE_INDEX || {};
  /* kelompokkan per modul konsumen, hitung jumlah & contoh template */
  const byMod = {};
  T.forEach(t => {
    const m = (byMod[t.module] = byMod[t.module] || { id: t.module, n: 0, dl: 0, sample: t.name, ic: (MI[t.module] || {}).icon || 'doc', lbl: (MI[t.module] || {}).label || t.module });
    m.n += 1; m.dl += t.dl; if (t.dl > 0 && t.name.length < m.sample.length) m.sample = t.name;
  });
  const down = Object.values(byMod)
    .sort((a, b) => b.n - a.n || b.dl - a.dl)
    .slice(0, 8)
    .map(m => ({ id: m.id, ic: m.ic, lbl: m.lbl, rel: m.n > 1 ? m.n + ' template · mis. ' + m.sample : m.sample }));

  LINEAGE.templates = {
    std: 'Referensi & Indeks · Registri Template (IAPI / ISQM)',
    up: [
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'ISQM 1 — metodologi & kebijakan mutu yang membakukan template' },
      { id: 'kb', ic: 'book', lbl: 'Knowledge Base', rel: 'Panduan standar & praktik yang menjadi dasar isi template' },
      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Pemetaan standar → ketertelusuran template ke prosedur' },
      { id: 'dms', ic: 'archive', lbl: 'Document Management', rel: 'Versi & retensi pack metodologi yang dikendalikan' },
    ],
    down,
  };
})();

/* Knowledge Base — hulu: registri standar (Matriks Kepatuhan) & metodologi mutu;
   hilir: modul yang menerapkan standar + template/DMS. Dock dua-arah yang sama. */
LINEAGE.kb = {
  std: 'Referensi & Indeks · Basis Pengetahuan Standar (SA/PSAK)',
  up: [
    { id: 'compmatrix', ic: 'table',    lbl: 'Matriks Kepatuhan', rel: 'Registri standar kanonik — sumber tunggal katalog artikel KB' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)',  rel: 'ISQM 1 — kebijakan & metodologi mutu yang dirujuk panduan' },
    { id: 'templates',  ic: 'template', lbl: 'Template Library',   rel: 'Berkas yang mengimplementasikan standar terkait (tarikan live)' },
  ],
  down: [
    { id: 'risk',       ic: 'shield',  lbl: 'Risk Assessment',     rel: 'Panduan SA 315 → penerapan penilaian risiko' },
    { id: 'workpapers', ic: 'layers',  lbl: 'Working Papers',      rel: 'Standar → desain prosedur respons & dokumentasi (SA 330/230)' },
    { id: 'sa540',      ic: 'target',  lbl: 'SA 540 · Estimasi',   rel: 'Panduan estimasi akuntansi → checklist kepatuhan' },
    { id: 'dms',        ic: 'archive', lbl: 'Document Management', rel: 'Versi panduan & pack metodologi yang terarsip' },
  ],
};


/* Forensic Cash Flow — analitik anomali kas. Hulu: WTB & mesin FS Generator
   (waterfall/jembatan), PSAK 2 (arus kas kanonik), JET (populasi jurnal),
   Pihak Berelasi (RPT). Hilir: JET (pengujian terarah), Going Concern
   (likuiditas), SAD (eksepsi), SA 520 (analitis). Satu sumber kebenaran. */
LINEAGE.forensic = {
  std: 'Forensic Cash Flow · Analitik Anomali Kas (SA 240 · SA 520 · PSAK 2)',
  up: [
    { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo & mutasi akun kas → basis arus kas (efek-kas −Δsaldo)' },
    { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Mesin derivasi LK yang sama → waterfall & jembatan arus kas bruto' },
    { id: 'psak2', ic: 'water', lbl: 'PSAK 2 · Arus Kas', rel: 'Laporan arus kas kanonik — angka O/I/F yang identik' },
    { id: 'jet', ic: 'flask', lbl: 'Journal Entry Testing', rel: 'Populasi jurnal manual yang SAMA → anomali mutasi kas' },
    { id: 'related', ic: 'group', lbl: 'Pihak Berelasi', rel: 'Registri RPT (SA 550 · PSAK 7) → eksposur pihak berelasi' },
  ],
  down: [
    { id: 'jet', ic: 'flask', lbl: 'Journal Entry Testing', rel: 'Anomali kas → seleksi pengujian jurnal terarah (SA 240)' },
    { id: 'goingconcern', ic: 'pulse', lbl: 'Going Concern', rel: 'Arus kas operasi & tekanan likuiditas (SA 570)' },
    { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Eksepsi forensik → akumulasi salah saji (SA 450)' },
    { id: 'analytical', ic: 'trend', lbl: 'Analytical Review', rel: 'Fluktuasi arus kas tak biasa → prosedur analitis (SA 520)' },
  ],
};

/* ---- P2: modul akuntansi & pengungkapan baru (berkaca dari LK ilustratif) ---- */
Object.assign(LINEAGE, {
  segmen: {
    std: 'PSAK 5 · Informasi Segmen (IFRS 8)',
    up: [
      { id: 'psak72', ic: 'receipt', lbl: 'PSAK 72 · Pendapatan', rel: 'Disagregasi pendapatan per lini → basis segmen' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Total aset & laba usaha → rekonsiliasi segmen' },
      { id: 'risk', ic: 'target', lbl: 'Risk Assessment', rel: 'Konsentrasi pelanggan/segmen → RoMM' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Catatan informasi segmen pada CALK' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Persyaratan 108p23 → status pengungkapan' },
    ],
  },
  invprop: {
    std: 'PSAK 13 · Properti Investasi (IAS 40)',
    up: [
      { id: 'psak68', ic: 'layers', lbl: 'PSAK 68 · Nilai Wajar', rel: 'Hierarki & input Level 3 → pengukuran nilai wajar' },
      { id: 'expert', ic: 'shield', lbl: 'Penggunaan Pakar', rel: 'Penilaian KJPP/MAPPI (SA 620)' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Pos neraca & keuntungan nilai wajar → Laba Rugi' },
      { id: 'psak46', ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan', rel: 'Beda temporer atas keuntungan nilai wajar' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Persyaratan 240p76 → status pengungkapan' },
    ],
  },
  assoc: {
    std: 'PSAK 15 · Investasi Asosiasi (IAS 28)',
    up: [
      { id: 'psak65', ic: 'building', lbl: 'PSAK 65 · Konsolidasi', rel: 'Batas konsolidasi → nilai tercatat di luar konsolidasi' },
      { id: 'psak66', ic: 'columns', lbl: 'PSAK 66 · Ventura Bersama', rel: 'Metode ekuitas serumpun (ventura)' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Bagian laba asosiasi → Laba Rugi konsolidasian' },
      { id: 'psak48', ic: 'scale', lbl: 'PSAK 48 · Penurunan Nilai', rel: 'Uji penurunan nilai investasi (¶42)' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Persyaratan 228p21 → status pengungkapan' },
    ],
  },
  newdisc: {
    std: 'Pengungkapan Baru 2024 (Pilar Dua · Iklim · Pendanaan Pemasok)',
    up: [
      { id: 'psak46', ic: 'receipt', lbl: 'PSAK 46 · Pajak Penghasilan', rel: 'ETR per yurisdiksi → eksposur Pilar Dua' },
      { id: 'psak71', ic: 'coins', lbl: 'PSAK 71 · Instrumen Keuangan', rel: 'Overlay iklim pada ECL' },
    ],
    down: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Pengungkapan baru pada CALK & arus kas' },
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: '212p88A & DV iklim → status pengungkapan' },
    ],
  },
  sakroadmap: {
    std: 'Roadmap SAK & Pelacak ISAK (horizon standar — Gap G5)',
    up: [
      { id: 'framework', ic: 'scale', lbl: 'Penentu Kerangka', rel: 'Kerangka pelaporan (SAK/EP/EMKM) yang dipantau horizonnya' },
      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Registri standar & alias penomoran selaras-IFRS' },
    ],
    down: [
      { id: 'disclosure', ic: 'checkCircle', lbl: 'Daftar-Uji Pengungkapan', rel: 'Standar terbit belum efektif → baris pengungkapan (PSAK 25 ¶30)' },
      { id: 'psak1', ic: 'report', lbl: 'PSAK 1 → 207 · Penyajian LK', rel: 'Pemetaan struktur L/R ke kategori PSAK 207' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Template LK dimutakhirkan ke struktur standar baru' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Kelengkapan kerangka pelaporan → perumusan opini (SA 700)' },
    ],
  },
  disclosure: {
    std: 'Daftar-Uji Pengungkapan (rujukan paragraf selaras-IFRS)',
    up: [
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement', rel: 'Keluaran LK diuji terhadap persyaratan paragraf' },
      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Registri standar & alias penomoran' },
      { id: 'segmen', ic: 'columns', lbl: 'Informasi Segmen', rel: 'Sumber pemenuhan 108p23' },
    ],
    down: [
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Kelengkapan pengungkapan → perumusan opini (SA 700)' },
      { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Telaah mutu kelengkapan CALK' },
    ],
  },
});
Object.assign(window, { LINEAGE });

/* Portal Klien / PBC — hulu: perikatan & penilaian risiko menentukan dokumen
   yang diminta; hilir: berkas diterima mengalir ke kertas kerja, konfirmasi,
   evaluasi bukti & arsip DMS. Satu sumber kebenaran lintas modul. */
LINEAGE.clientportal = {
  std: 'Portal & Dokumen · Permintaan Dokumen Klien (PBC)',
  up: [
    { id: 'engagement', ic: 'briefcase', lbl: 'Engagement Mgmt',  rel: 'Identitas perikatan & klien (sumber tunggal) → konteks portal' },
    { id: 'risk',       ic: 'shield',    lbl: 'Risk Assessment',  rel: 'Area berisiko → prioritas & cakupan dokumen yang diminta' },
    { id: 'cockpit',    ic: 'dashboard', lbl: 'Engagement Cockpit', rel: 'Program audit → daftar dokumen yang dibutuhkan tim' },
  ],
  down: [
    { id: 'workpapers', ic: 'layers',  lbl: 'Working Papers',      rel: 'Berkas diterima → bukti substantif pada lead schedule (WP)' },
    { id: 'confirm',    ic: 'mail',    lbl: 'Confirmation Hub',    rel: 'Daftar piutang/bank → dasar konfirmasi eksternal (SA 505)' },
    { id: 'evidence',   ic: 'search2', lbl: 'Evaluasi Bukti',      rel: 'Klasifikasi otomatis → bukti per area & asersi (SA 500)' },
    { id: 'dms',        ic: 'archive', lbl: 'Document Management', rel: 'Arsip terenkripsi AES-256, klasifikasi & retensi (ISQM)' },
  ],
};

/* ============================================================
   Firm Platform — lineage dua-arah. SSOT: antrean persetujuan,
   integrasi data eksternal & jejak audit semuanya menarik dari
   entitas kanonik yang sama yang dibaca modul-modul ini.
   ============================================================ */
LINEAGE.approvals = {
  std: 'Firm Platform · Otorisasi & Persetujuan (ISQM 1)',
  up: [
    { id: 'aje', ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Jurnal Proposed → persetujuan; final → posting ke WTB' },
    { id: 'billing', ic: 'receipt', lbl: 'Billing & Invoicing', rel: 'Faktur Draft / termin besar → otorisasi penerbitan' },
    { id: 'pipeline', ic: 'trend', lbl: 'Sales Pipeline', rel: 'Peluang tahap Proposal/Negosiasi → penerimaan klien' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'Perikatan fase Finalisasi → persetujuan penerbitan opini' },
    { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Deklarasi & rotasi wajib → persetujuan etika' },
  ],
  down: [
    { id: 'audittrail', ic: 'lock', lbl: 'Audit Trail', rel: 'Setiap keputusan tercatat permanen (tamper-evident)' },
    { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'AJE disetujui → saldo WTB & laporan keuangan ter-update' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Bukti otorisasi mutu — pemantauan ISQM' },
  ],
};
LINEAGE.integrations = {
  std: 'Firm Platform · Impor & Integrasi Data (gerbang masuk SSOT)',
  up: [
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan keamanan, retensi & gerbang kontrol data (ISQM 1)' },
    { id: 'settings', ic: 'sliders', lbl: 'Pengaturan Firma', rel: 'Kredensial, scope & jadwal sinkron konektor' },
    { id: 'approvals', ic: 'checkCircle', lbl: 'Approvals', rel: 'Otorisasi & gerbang total kontrol sebelum posting' },
    { id: 'dataflow', ic: 'link2', lbl: 'Alur Data & Integritas', rel: 'Peta modul pemilik data (feedCounts) → tujuan posting' },
  ],
  down: [
    { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'e-Faktur & SPT masa (DJP Coretax) → di-posting; Σ PPN = total kontrol' },
    { id: 'cashbank', ic: 'building', lbl: 'Kas, Bank & Rekonsiliasi', rel: 'Bank feed → mutasi rekening; saldo = total kontrol' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', rel: 'e-Signature (PrivyID) → tanda tangan laporan & opini' },
    { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'SharePoint → indeks kertas kerja (retensi ISQM)' },
    { id: 'onboarding', ic: 'flag', lbl: 'Onboarding & PMPJ', rel: 'AHU Online → verifikasi badan hukum klien' },
    { id: 'audittrail', ic: 'lock', lbl: 'Audit Trail', rel: 'Tiap impor → entri jejak SYNC tamper-evident' },
  ],
};
LINEAGE.audittrail = {
  std: 'Firm Platform · Jejak Audit Sistem (tamper-evident)',
  up: [
    { id: 'approvals', ic: 'checkCircle', lbl: 'Approvals', rel: 'Setiap keputusan persetujuan → entri log real-time' },
    { id: 'aje', ic: 'ledger', lbl: 'Adjusting Entries (AJE)', rel: 'Posting & penyetujuan jurnal tercatat' },
    { id: 'integrations', ic: 'link2', lbl: 'Integrations', rel: 'Peristiwa sinkron konektor (SYNC)' },
    { id: 'dataflow', ic: 'link2', lbl: 'Alur Data & Integritas', rel: 'Propagasi materialitas & tarikan WTB' },
  ],
  down: [
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Bukti pemantauan & remediasi mutu (ISQM 1)' },
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Jejak telaah mutu perikatan' },
    { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'Ketertelusuran untuk inspeksi regulator' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Ketertelusuran aksi → standar' },
  ],
};

/* SA 230 · Dokumentasi Audit — hub dokumentasi perikatan.
   Hulu: modul yang MENGHASILKAN materi/dasar dokumentasi (apa yang
   wajib didokumentasikan & isinya). Hilir: modul yang MENGGUNAKAN
   dokumentasi sebagai bukti kelengkapan, dasar telaah mutu & opini. */
LINEAGE.sa230 = {
  std: 'SA 230 · Dokumentasi Audit',
  up: [
    { id: 'workpapers', ic: 'layers',  lbl: 'Working Papers',     rel: '¶8(a–b) — sifat/saat/lingkup prosedur & hasilnya: substrat dokumentasi' },
    { id: 'risk',       ic: 'shield',  lbl: 'Risk Assessment',    rel: '¶8(c) — hal signifikan & RoMM menentukan apa yang wajib didokumentasikan' },
    { id: 'materiality',ic: 'target',  lbl: 'Materiality',        rel: '¶8(c) — ambang materialitas: dasar pertimbangan profesional & kesimpulan' },
    { id: 'reviewnotes',ic: 'mail',    lbl: 'Review Notes',       rel: '¶9(c)/¶10 — diskusi hal signifikan & clearance: jejak pereviu & tanggal' },
    { id: 'evidence',   ic: 'search2', lbl: 'Evaluasi Bukti',     rel: '¶8(b) · SA 500 — bukti audit per asersi membentuk isi dokumentasi' },
  ],
  down: [
    { id: 'dms',        ic: 'archive',     lbl: 'Manajemen Dokumen', rel: '¶14–16 — perakitan berkas final ≤60 hari, kunci WORM & retensi 10 thn' },
    { id: 'eqr',        ic: 'checkCircle', lbl: 'EQR Workflow',      rel: 'SA 220 / ISQM 1 — telaah mutu atas kecukupan dokumentasi sebelum opini' },
    { id: 'sad',        ic: 'scale',       lbl: 'SAD Ledger',        rel: '¶11 · SA 450 — pengecualian/inkonsistensi prosedur → akumulasi salah saji' },
    { id: 'opinion',    ic: 'gavel',       lbl: 'Audit Opinion',     rel: 'SA 700 — dokumentasi memadai sebagai fondasi kesimpulan & opini' },
    { id: 'audittrail', ic: 'lock',        lbl: 'Audit Trail',       rel: '¶16 — perubahan pasca-perakitan tercatat tamper-evident' },
  ],
};

Object.assign(window, { LINEAGE });

/* ============================================================
   Compliance & Kriptografi — lineage dua-arah (SSOT).
   Hulu: Document Mgmt (dokumen & hash), Evaluasi Bukti (berkas
   ter-hash), Alur Data (aturan integritas), Audit Trail (arus
   jejak hash-chain), Audit Opinion & Onboarding (e-signature).
   Hilir: Governance/ISQM, Retensi & Arsip, Matriks Kepatuhan.
   Modul ini TIDAK menyimpan data sendiri — seluruhnya ditarik
   dari sumber kebenaran tunggal di atas.
   ============================================================ */
LINEAGE.crypto = {
  std: 'Mutu, Risiko & Regulasi · Keamanan, Integritas & Kriptografi (ISQM 1 · ISO 27001 · SA 230)',
  up: [
    { id: 'dms',       ic: 'archive', lbl: 'Document Management', rel: 'Dokumen, versi & hash SHA-256 → register integritas (AES-256 / WORM)' },
    { id: 'evidence',  ic: 'search2', lbl: 'Evaluasi Bukti',      rel: 'Berkas bukti ter-hash → objek integritas terpantau' },
    { id: 'dataflow',  ic: 'link2',   lbl: 'Alur Data & Integritas', rel: 'Katalog aturan integritas → status kontrol kepatuhan' },
    { id: 'audittrail',ic: 'lock',    lbl: 'Audit Trail',         rel: 'Arus jejak tunggal → rantai-hash tamper-evident' },
    { id: 'opinion',   ic: 'gavel',   lbl: 'Audit Opinion',       rel: 'e-Signature opini & kertas kerja → sertifikat PrivyID' },
  ],
  down: [
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Bukti kontrol keamanan & integritas data (ISQM 1)' },
    { id: 'records',    ic: 'archive',  lbl: 'Retensi & Arsip',   rel: 'Imutabilitas WORM & legal hold → kebijakan retensi (SA 230)' },
    { id: 'compmatrix', ic: 'table',    lbl: 'Matriks Kepatuhan', rel: 'Ketertelusuran kontrol → standar profesi & regulasi' },
  ],
};

Object.assign(window, { LINEAGE });

/* ============================================================
   Pajak PPh 23 (Firm Backoffice) — lineage dua-arah (SSOT).
   Hulu: Pengadaan & Vendor (master + NPWP), AP/AR (faktur jasa),
   Governance (kebijakan pemotongan). Hilir: General Ledger (utang
   pajak 2-200), Pajak Firma (agregat PPh Pot/Put & SPT Masa),
   Anggaran & Arus Kas (pembayaran), Integrasi DJP Coretax (e-Bupot).
   ============================================================ */
LINEAGE.tax = {
  std: 'Firm Backoffice · PPh Pasal 23 (UU HPP · PMK 141 · e-Bupot Unifikasi)',
  up: [
    { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Master vendor & NPWP (BO.VENDORS) → identitas & tarif pemotongan' },
    { id: 'apar', ic: 'coins', lbl: 'AP / AR Firma', rel: 'Faktur jasa vendor (FIRM_AP) → DPP yang dipotong' },
    { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Belanja jasa firma → populasi objek PPh 23' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan pemotongan & kepatuhan perpajakan firma' },
  ],
  down: [
    { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'PPh 23 terutang → pos kontrol Utang Pajak 2-200' },
    { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Agregat PPh Pot/Put & e-Bupot → SPT Masa Unifikasi' },
    { id: 'treasury', ic: 'pulse', lbl: 'Anggaran & Arus Kas', rel: 'Setoran PPh 23 → proyeksi arus kas keluar' },
    { id: 'integrations', ic: 'link2', lbl: 'Integrasi & Data Eksternal', rel: 'e-Bupot & SPT Masa disinkronkan via DJP Coretax' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Perjalanan & Reimbursement — lineage dua-arah (SSOT).
   Hulu: HCM (pegawai/grade), Engagement (klien/lokasi), Scheduler
   (alokasi tim), Governance (kebijakan plafon), Procurement (vendor
   travel). Hilir: GL & Firm Finance (beban), Time & Budget (alokasi
   per perikatan), Payroll (PPh 21 kelebihan), Approvals (otorisasi).
   Semua menarik dari window.TRAVEL yang menurunkan satu angka.
   ============================================================ */
LINEAGE.travel = {
  std: 'Operasi Firma · Perjalanan Dinas & Reimbursement',
  up: [
    { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Pegawai & grade (AMS.STAFF) → kelas plafon per diem & transport' },
    { id: 'cockpit', ic: 'briefcase', lbl: 'Engagement Mgmt', rel: 'Perikatan, klien & kota klien → tujuan & lokasi fieldwork' },
    { id: 'scheduler', ic: 'users', lbl: 'Resource Scheduler', rel: 'Alokasi tim ke perikatan → siapa berangkat ke mana' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan plafon (PER_DIEM) & tarif rute → entitlement' },
    { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Vendor travel V-033 → tiket & akomodasi fieldwork' },
  ],
  down: [
    { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Biaya perjalanan → akun kontrol beban (FIRM_COA)' },
    { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Beban langsung perikatan → terserap di P&L firma' },
    { id: 'time', ic: 'clock', lbl: 'Time & Budget', rel: 'Alokasi biaya per perikatan → beban vs anggaran' },
    { id: 'payroll', ic: 'coins', lbl: 'Payroll & PPh 21', rel: 'Kelebihan per diem di atas plafon → objek PPh 21' },
    { id: 'approvals', ic: 'checkCircle', lbl: 'Approvals', rel: 'Approval perjalanan & klaim lewat plafon → otorisasi (ISQM)' },
    { id: 'firmops', ic: 'layers', lbl: 'Cockpit Operasi Firma', rel: 'Tren biaya → komposisi biaya operasi firma' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Lisensi & Perizinan — lineage dua-arah (SSOT).
   Hulu: HCM (AP holder), CPE/PPL (SKP), Independence (rotasi),
   Engagement/CRM (cakupan emiten), Governance (kebijakan mutu).
   Hilir: PPPK (pelaporan), Firm Finance (iuran→biaya), Cockpit
   Operasi (kalender kewajiban), Governance (pemantauan ISQM).
   ============================================================ */
LINEAGE.licensing = {
  std: 'Operasi Firma · Lisensi & Perizinan (PPPK · IAPI · OJK)',
  up: [
    { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Partner pemegang Izin AP (AMS.STAFF) → identitas & peran' },
    { id: 'cpe', ic: 'book', lbl: 'CPE / PPL Tracker', rel: 'SKP terstruktur & total (CPE_LOG) → kecukupan PPL izin AP' },
    { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Masa penugasan & batas rotasi AP → status kepatuhan' },
    { id: 'cockpit', ic: 'briefcase', lbl: 'Engagement Mgmt', rel: 'Perikatan klien emiten (listed) → dasar registrasi OJK' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan mutu & kompetensi (ISQM 1) → prasyarat izin' },
  ],
  down: [
    { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'Izin KAP & AP, PPL & rotasi → laporan tahunan regulator' },
    { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Iuran keanggotaan & perpanjangan → overhead di P&L' },
    { id: 'firmops', ic: 'layers', lbl: 'Cockpit Operasi Firma', rel: 'Tenggat perpanjangan → kalender kewajiban terpadu' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kepatuhan lisensi & PPL → pemantauan mutu firma' },
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Eligibilitas AP (emiten & rotasi) → penugasan EQR' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Prioritas P2 (gap analysis) — tiga modul yang tadinya pulau:
   Sanksi & Disiplin (hrcase), SOQM Operasional (soqm), SAK EP (sakep).
   Diberi dock "Keterkaitan Modul" dua-arah agar masuk ke graf lineage.
   ============================================================ */
LINEAGE.hrcase = {
  std: 'SDM & Kepatuhan · Sanksi & Disiplin (Kode Etik · ISQM 1)',
  up: [
    { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Master pegawai & jenjang → subjek perkara disiplin' },
    { id: 'ethics', ic: 'scale', lbl: 'Kode Etik & AML/PMPJ', rel: 'Temuan pelanggaran kode etik / PMPJ → pembukaan kasus' },
    { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Benturan kepentingan tak diungkap → dasar sanksi' },
    { id: 'performance', ic: 'target', lbl: 'Siklus Kinerja', rel: 'Eskalasi PIP / pelanggaran kinerja → tindakan disiplin' },
  ],
  down: [
    { id: 'hcm', ic: 'users', lbl: 'Human Capital', rel: 'Catatan disiplin & status → berkas kepegawaian' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Rekap pelanggaran & sanksi → pemantauan budaya mutu (ISQM 1)' },
    { id: 'learning', ic: 'flask', lbl: 'Pelatihan & Kompetensi', rel: 'Sanksi → pelatihan remedial / etika wajib' },
  ],
};
LINEAGE.soqm = {
  std: 'Mutu, Risiko & Regulasi · SOQM Operasional (ISQM 1)',
  up: [
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan, tujuan & risiko mutu firma → dasar respons operasional' },
    { id: 'independence', ic: 'shield', lbl: 'Independence & Rotasi', rel: 'Status independensi & rotasi → input pemantauan mutu' },
    { id: 'cpe', ic: 'book', lbl: 'CPE / PPL Tracker', rel: 'Kecukupan PPL & kompetensi → komponen sumber daya' },
  ],
  down: [
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Pemicu reviu mutu perikatan untuk perikatan berisiko tinggi' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Defisiensi & remediasi → evaluasi tata kelola mutu' },
    { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'Hasil pemantauan sistem mutu → laporan regulator' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Status pemenuhan SPM 1 / ISQM 1 → ketertelusuran' },
  ],
};
LINEAGE.sakep = {
  std: 'Akuntansi · SAK Entitas Privat (pengganti SAK ETAP)',
  up: [
    { id: 'kb', ic: 'book', lbl: 'Knowledge Base', rel: 'Metodologi & rujukan kerangka EP → basis penerapan' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Registri standar (kerangka pelaporan) → cakupan' },
    { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Saldo akun klien → pos yang disusun menurut SAK EP' },
  ],
  down: [
    { id: 'fsgen', ic: 'report', lbl: 'Financial Statement Gen.', rel: 'Pemilihan kerangka EP → struktur & pengungkapan LK' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator', rel: 'Kerangka pelaporan berlaku → acuan opini auditor' },
    { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Penerapan kerangka → ketertelusuran kepatuhan' },
  ],
};
/* ============================================================
   Prioritas P3 (gap analysis) — simpul inti yang tadinya "sink"
   (hanya dirujuk) kini menaut balik ke hilir → dua-arah.
   Working Papers (SA 230/330) & Use of Expert (SA 620).
   ============================================================ */
LINEAGE.workpapers = {
  std: 'SA 230 / SA 330 · Kertas Kerja Audit',
  up: [
    { id: 'programme', ic: 'flask', lbl: 'Audit Programme', rel: 'Prosedur terinci → indeks & isi kertas kerja' },
    { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Respons atas RoMM → kertas kerja terarah' },
    { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Bukti audit terevaluasi → dilampirkan ke WP' },
    { id: 'internalaudit', ic: 'shield', lbl: 'Internal Audit', rel: 'Dokumentasi dasar penggunaan auditor internal' },
  ],
  down: [
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator', rel: 'Kesimpulan kertas kerja → dasar perumusan opini' },
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'Berkas WP → cakupan reviu pengendalian mutu perikatan' },
    { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', rel: 'Eksepsi terdokumentasi → akumulasi salah saji' },
    { id: 'dms', ic: 'layers', lbl: 'Manajemen Dokumen', rel: 'Arsip final WP (SA 230) → retensi & DMS' },
  ],
};
LINEAGE.expert = {
  std: 'SA 620 · Penggunaan Pekerjaan Pakar Auditor',
  up: [
    { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', rel: 'Area kompleks/estimasi signifikan → kebutuhan pakar' },
    { id: 'materiality', ic: 'target', lbl: 'Materiality', rel: 'Signifikansi pos → keputusan melibatkan pakar' },
    { id: 'psak68', ic: 'layers', lbl: 'PSAK 68 · Nilai Wajar', rel: 'Pengukuran nilai wajar → pakar penilai independen' },
    { id: 'psak24', ic: 'users', lbl: 'PSAK 24 · Imbalan Kerja', rel: 'Liabilitas imbalan kerja → aktuaris' },
  ],
  down: [
    { id: 'evidence', ic: 'search2', lbl: 'Evidence Evaluation', rel: 'Hasil kerja pakar → bukti audit yang dievaluasi' },
    { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', rel: 'Lingkup, kompetensi & temuan pakar → dokumentasi WP' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator', rel: 'Kecukupan bukti pakar → pertimbangan opini' },
  ],
};
Object.assign(window, { LINEAGE });

/* ============================================================
   Prioritas 2 — Halaman Standar Audit (SA) menaut balik.
   Reverse-index RELATED_SA: untuk tiap halaman SA, prosedur mana
   yang memenuhinya. Plus standar serumpun + tautan Matriks Kepatuhan.
   ============================================================ */

/* Grup yang berisi halaman SA (deep pages) */
const SA_GROUPS = new Set([
  'SA · Tanggung Jawab (200)', 'SA · Bukti Audit (500)',
  'SA · Pelaporan (700)', 'SA · Area Khusus & Perikatan',
]);

/* Reverse-index dari RELATED_SA (hanya entri yang punya `view` = id halaman SA) */
const SA_REVERSE = {};
(function () {
  const RS = window.RELATED_SA || {};
  Object.keys(RS).forEach(proc => (RS[proc] || []).forEach(r => {
    if (!r.view) return;
    const arr = SA_REVERSE[r.view] = SA_REVERSE[r.view] || [];
    if (!arr.some(x => x.module === proc)) arr.push({ module: proc, note: (r.title || r.code) + ' · ' + (r.phase || '') });
  }));
})();

/* Fallback kurasi untuk halaman SA tanpa entri RELATED_SA(view) */
const SA_FULFILLED_BY = {
  sa200: [{ module: 'strategy', note: 'Tujuan keseluruhan → strategi & pendekatan audit' }, { module: 'workpapers', note: 'Skeptisisme & pertimbangan profesional terdokumentasi' }],
  sa250: [{ module: 'icfr', note: 'Kepatuhan hukum & regulasi dalam pengendalian' }, { module: 'risk', note: 'Risiko ketidakpatuhan → RoMM' }],
  sa580: [{ module: 'opinion', note: 'Representasi tertulis sebagai prasyarat opini' }, { module: 'subsequent', note: 'Representasi mencakup peristiwa kemudian' }],
  sa720: [{ module: 'fsgen', note: 'Informasi lain dalam laporan tahunan' }, { module: 'opinion', note: 'Paragraf Informasi Lain pada laporan auditor' }],
  sa800: [{ module: 'opinion', note: 'Opini atas kerangka bertujuan khusus' }, { module: 'fsgen', note: 'Penyajian sesuai kerangka khusus' }],
  sa805: [{ module: 'opinion', note: 'Opini atas LK tunggal / elemen' }, { module: 'fsgen', note: 'Penyajian elemen LK' }],
  sa810: [{ module: 'opinion', note: 'Opini atas ringkasan LK' }, { module: 'fsgen', note: 'Penyusunan ringkasan dari LK auditan' }],
  spr2400: [{ module: 'review2400', note: 'Perikatan reviu LK historis (assurans terbatas)' }],
  spr2410: [{ module: 'review2400', note: 'Reviu informasi keuangan interim' }],
  sjah3000: [{ module: 'assurance', note: 'Perikatan asurans selain audit / reviu' }],
  sjah3400: [{ module: 'assurance', note: 'Pemeriksaan informasi keuangan prospektif' }],
  sjah3402: [{ module: 'serviceorg', note: 'Laporan pengendalian organisasi jasa' }],
  sjah3410: [{ module: 'assurance', note: 'Perikatan asurans atas Laporan Emisi GRK' }],
  sjah3420: [{ module: 'assurance', note: 'Asurans penyusunan informasi keuangan proforma (prospektus)' }],
};

/* W2: published for the components split out to related_modules.jsx */
Object.assign(window, { LINEAGE, SA_GROUPS, SA_REVERSE, SA_FULFILLED_BY });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA_FULFILLED_BY, SA_GROUPS, SA_REVERSE };
export { LINEAGE }; // re-export the imported shared object (no TDZ const)
