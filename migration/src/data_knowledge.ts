/* ============================================================
   Asseris — Knowledge Base (lapisan editorial + penyambung)
   ------------------------------------------------------------
   PRINSIP SUMBER KEBENARAN:
   Knowledge Base TIDAK menyimpan daftar artikel sendiri. Katalognya
   DIBANGKITKAN dari registri standar kanonik (window.STANDARDS_REGISTRY)
   — registri YANG SAMA yang dipakai Matriks Kepatuhan. File ini hanya
   menambahkan LAPISAN EDITORIAL (ringkasan, isi, poin penerapan) yang
   dikunci pada `code` standar, lalu menyambungkannya secara LIVE ke:
     · AMS.TEMPLATES        → template yang mengimplementasikan standar
     · window.compliancePct(mod)   → progres checklist kepatuhan (live)
     · window.MODULE_INDEX         → modul fungsional yang menjalankan standar
     · window.RELATED_SA           → rujukan-silang standar serumpun

   Akibatnya satu perubahan di registri/standar/template mengalir
   konsisten ke Knowledge Base tanpa duplikasi data. Standar tanpa
   editorial khusus tetap memiliki artikel — dibangun dari metadata
   registri lewat buildFallback().
   ============================================================ */
import { AMS } from './data';
/* Tahap 8 — registri standar dipindah KE SINI dari view_compmatrix.tsx
   (yang menjadi lazy chunk). data_knowledge membangkitkan katalog KB dari
   registri ini, dan view_kb (lazy) memakainya lewat import ESM — bukan
   window.STANDARDS_REGISTRY yang hanya terisi setelah Matriks dimuat. */
export const STANDARDS_REGISTRY = [
  // ——— SA 200: Tanggung jawab umum ———
  { code: 'SA 200', title: 'Tujuan Keseluruhan Auditor Independen', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'sa200' },
  { code: 'SA 210', title: 'Persetujuan Ketentuan Perikatan Audit', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'engagement' },
  { code: 'SA 220', title: 'Pengendalian Mutu untuk Audit LK', type: 'SA', phase: 'Mutu', coverage: 'module', module: 'soqm' },
  { code: 'SA 230', title: 'Dokumentasi Audit', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'sa230' },
  { code: 'SA 240', title: 'Tanggung Jawab atas Kecurangan (Fraud)', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'sa240' },
  { code: 'SA 250', title: 'Hukum & Regulasi dalam Audit LK', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'sa250' },
  { code: 'SA 260', title: 'Komunikasi dengan TCWG', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa260' },
  { code: 'SA 265', title: 'Defisiensi Pengendalian Internal', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa265' },
  // ——— SA 300/400: Penilaian & respons risiko ———
  { code: 'SA 300', title: 'Perencanaan Audit LK', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'strategy' },
  { code: 'SA 315', title: 'Identifikasi & Penilaian ROMM', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'risk' },
  { code: 'SA 320', title: 'Materialitas dalam Perencanaan & Pelaksanaan', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'materiality' },
  { code: 'SA 330', title: 'Respons Auditor terhadap Risiko', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'workpapers' },
  { code: 'SA 402', title: 'Pertimbangan Audit atas Organisasi Jasa', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'serviceorg' },
  { code: 'SA 450', title: 'Evaluasi Salah Saji', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sad' },
  // ——— SA 500: Bukti audit ———
  { code: 'SA 500', title: 'Bukti Audit', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'evidence' },
  { code: 'SA 501', title: 'Bukti Audit — Unsur Tertentu', type: 'SA', phase: 'Pelaksanaan', coverage: 'checklist', module: 'sa501' },
  { code: 'SA 505', title: 'Konfirmasi Eksternal', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'confirm' },
  { code: 'SA 510', title: 'Perikatan Audit Tahun Pertama — Saldo Awal', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'opening' },
  { code: 'SA 520', title: 'Prosedur Analitis', type: 'SA', phase: 'Pelaksanaan', coverage: 'checklist', module: 'sa520' },
  { code: 'SA 530', title: 'Sampling Audit', type: 'SA', phase: 'Pelaksanaan', coverage: 'checklist', module: 'sa530' },
  { code: 'SA 540', title: 'Audit Estimasi Akuntansi', type: 'SA', phase: 'Pelaksanaan', coverage: 'checklist', module: 'sa540' },
  { code: 'SA 550', title: 'Pihak Berelasi', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'related' },
  { code: 'SA 560', title: 'Peristiwa Kemudian', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'subsequent' },
  { code: 'SA 570', title: 'Kelangsungan Usaha', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'goingconcern' },
  { code: 'SA 580', title: 'Representasi Tertulis', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa580' },
  // ——— SA 600: Penggunaan pekerjaan pihak lain ———
  { code: 'SA 600', title: 'Audit Grup (Komponen)', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'groupaudit' },
  { code: 'SA 610', title: 'Penggunaan Pekerjaan Auditor Internal', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'internalaudit' },
  { code: 'SA 620', title: 'Penggunaan Pekerjaan Pakar Auditor', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'expert' },
  // ——— SA 700: Kesimpulan & pelaporan ———
  { code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'opinion' },
  { code: 'SA 701', title: 'Hal Audit Utama (KAM)', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa701' },
  { code: 'SA 705', title: 'Modifikasi Opini Auditor Independen', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa705' },
  { code: 'SA 706', title: 'Paragraf Penekanan Suatu Hal & Hal Lain', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa705' },
  { code: 'SA 710', title: 'Informasi Komparatif', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa710' },
  { code: 'SA 720', title: 'Informasi Lain dalam Laporan Tahunan', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa720' },
  // ——— SA 800: Area khusus ———
  { code: 'SA 800', title: 'Audit LK Kerangka Bertujuan Khusus', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa800' },
  { code: 'SA 805', title: 'Audit LK Tunggal & Elemen Tertentu', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa805' },
  { code: 'SA 810', title: 'Perikatan Pelaporan atas Ringkasan LK', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa810' },
  // ——— Mutu firma & etika ———
  { code: 'SMM 1', title: 'Manajemen Mutu Bagi KAP', type: 'SMM', phase: 'Mutu', coverage: 'module', module: 'governance' },
  { code: 'SMM 2', title: 'Penelaahan Mutu Perikatan (EQR)', type: 'SMM', phase: 'Mutu', coverage: 'module', module: 'eqr' },
  { code: 'KEPAP', title: 'Kode Etik Profesi Akuntan Publik — Independensi & Etika', type: 'KEPAP', phase: 'Mutu', coverage: 'module', module: 'governance' },
  // ——— Perikatan selain audit ———
  { code: 'SPR 2400', title: 'Perikatan Reviu atas LK Historis', type: 'SPR', phase: 'Perikatan Lain', coverage: 'module', module: 'spr2400' },
  { code: 'SPR 2410', title: 'Reviu atas Informasi Keuangan Interim', type: 'SPR', phase: 'Perikatan Lain', coverage: 'module', module: 'spr2410' },
  { code: 'SPA 4400', title: 'Perikatan Prosedur yang Disepakati', type: 'SPA', phase: 'Perikatan Lain', coverage: 'module', module: 'relatedsvc' },
  { code: 'SPA 4410', title: 'Perikatan Kompilasi', type: 'SPA', phase: 'Perikatan Lain', coverage: 'module', module: 'relatedsvc' },
  { code: 'SJAH 3000', title: 'Perikatan Asurans selain Audit/Reviu', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3000' },
  { code: 'SJAH 3400', title: 'Pemeriksaan Informasi Keuangan Prospektif', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3400' },
  { code: 'SJAH 3402', title: 'Laporan Asurans atas Pengendalian Organisasi Jasa', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3402' },
  { code: 'SJAH 3410', title: 'Perikatan Asurans atas Laporan Emisi Gas Rumah Kaca', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3410' },
  { code: 'SJAH 3420', title: 'Asurans atas Penyusunan Informasi Keuangan Proforma', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3420' },
  // ——— Kerangka akuntansi (PSAK) ———
  { code: 'PSAK 1', title: 'Penyajian Laporan Keuangan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak1' },
  { code: 'PSAK 2', title: 'Laporan Arus Kas', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak2' },
  { code: 'PSAK 7', title: 'Pengungkapan Pihak Berelasi', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'related' },
  { code: 'PSAK 8', title: 'Peristiwa Setelah Periode Pelaporan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'subsequent' },
  { code: 'PSAK 5', title: 'Segmen Operasi', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'segmen' },
  { code: 'PSAK 13', title: 'Properti Investasi', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'invprop' },
  { code: 'PSAK 15', title: 'Investasi pada Entitas Asosiasi & Ventura Bersama', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'assoc' },
  { code: 'PSAK 14', title: 'Persediaan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak14' },
  { code: 'PSAK 16', title: 'Aset Tetap', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak16' },
  { code: 'PSAK 19', title: 'Aset Takberwujud', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak19' },
  { code: 'PSAK 22', title: 'Kombinasi Bisnis', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak22' },
  { code: 'PSAK 24', title: 'Imbalan Kerja', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak24' },
  { code: 'PSAK 25', title: 'Kebijakan Akuntansi, Perubahan Estimasi & Kesalahan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak25' },
  { code: 'PSAK 46', title: 'Pajak Penghasilan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak46' },
  { code: 'PSAK 58', title: 'Aset Dimiliki untuk Dijual & Operasi Dihentikan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak58' },
  { code: 'PSAK 66', title: 'Pengaturan Bersama (Joint Arrangements)', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak66' },
  { code: 'PSAK 71', title: 'Instrumen Keuangan', type: 'PSAK', phase: 'Akuntansi', coverage: 'checklist', module: 'psak71' },
  { code: 'PSAK 72', title: 'Pendapatan dari Kontrak dengan Pelanggan', type: 'PSAK', phase: 'Akuntansi', coverage: 'checklist', module: 'psak72' },
  { code: 'PSAK 73', title: 'Sewa', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak73' },
  { code: 'SAK EP', title: 'SAK Entitas Privat (pengganti SAK ETAP)', type: 'SAK', phase: 'Akuntansi', coverage: 'checklist', module: 'sakep' },
  { code: 'PSAK 65', title: 'Laporan Keuangan Konsolidasian', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak65' },
  { code: 'PSAK 68', title: 'Pengukuran Nilai Wajar', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak68' },
  { code: 'PSAK 48/57', title: 'Penurunan Nilai Aset & Provisi', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak48' },
];
(function () {
  const KB_UPDATED = 'Juni 2026';

  /* kerangka penyajian per-tipe registri */
  const FRAMEWORK = {
    SA:   { label: 'Standar Audit (SA)',           kind: 'blue',  blurb: 'Standar Audit — IAPI/SPAP' },
    PSAK: { label: 'Akuntansi (PSAK)',             kind: 'green', blurb: 'Standar Akuntansi Keuangan — DSAK IAI' },
    SAK:  { label: 'Akuntansi (SAK)',              kind: 'green', blurb: 'Kerangka akuntansi' },
    SPR:  { label: 'Perikatan Reviu (SPR)',        kind: 'amber', blurb: 'Standar Perikatan Reviu' },
    SPA:  { label: 'Jasa Terkait (SPA)',           kind: 'amber', blurb: 'Standar Perikatan Audit lain / jasa terkait' },
    SJAH: { label: 'Asurans (SJAH)',               kind: 'amber', blurb: 'Standar Perikatan Asurans' },
    SMM:  { label: 'Mutu (SMM)',                   kind: 'navy',  blurb: 'Standar Manajemen Mutu' },
    KEPAP:{ label: 'Etika (KEPAP)',                kind: 'navy',  blurb: 'Kode Etik Profesi Akuntan Publik' },
  };

  /* tingkat: Pengantar | Inti | Lanjutan */
  const S = (h: any, p: any) => ({ h: h, p: p });

  /* ---------- LAPISAN EDITORIAL (dikunci pada `code` registri) ----------
     read = menit baca · level · hot = ditampilkan di "Paling dirujuk"
     tags = kata kunci pencarian tambahan · sections = isi · points = poin utama */
  const KB_CONTENT = {
    'SA 200': {
      read: 7, level: 'Pengantar', hot: true, tags: ['skeptisisme', 'pertimbangan profesional', 'asurans memadai'],
      summary: 'Tujuan keseluruhan auditor independen: memperoleh asurans yang memadai bahwa laporan keuangan secara keseluruhan bebas dari kesalahan penyajian material, serta melaporkan sesuai temuan.',
      sections: [
        S('Asurans yang memadai, bukan absolut', 'Audit dirancang untuk menurunkan risiko audit ke tingkat rendah yang dapat diterima — bukan menjaminnya nol. Keterbatasan inheren (sifat pelaporan, sampling, pertimbangan) membuat absolutisme mustahil; auditor karenanya bekerja dengan ambang materialitas dan bukti yang cukup dan tepat.'),
        S('Skeptisisme & pertimbangan profesional', 'Skeptisisme profesional disetel sepanjang perikatan: waspada terhadap bukti yang bertentangan, keandalan dokumen, dan kondisi yang mengindikasikan kecurangan. Pertimbangan profesional menentukan sifat, saat, dan luas prosedur serta evaluasi atas kecukupan bukti.'),
        S('Kerangka standar (SA) sebagai dasar', 'SA 200 menjadi payung seluruh SA lain. Kepatuhan terhadap SA yang relevan adalah prasyarat untuk menyatakan bahwa audit dilaksanakan berdasarkan Standar Audit — termasuk pemenuhan ketentuan etika dan independensi.'),
      ],
      points: ['Tetapkan asurans memadai melalui risiko audit yang rendah dapat diterima', 'Pertahankan skeptisisme profesional di setiap tahap', 'Dokumentasikan pertimbangan profesional yang signifikan', 'Patuhi seluruh SA yang relevan dengan perikatan'],
    },
    'SA 210': {
      read: 5, level: 'Pengantar', tags: ['surat perikatan', 'prasyarat audit', 'ruang lingkup'],
      summary: 'Menyepakati ketentuan perikatan audit dengan manajemen/TCWG dan memastikan prasyarat audit terpenuhi sebelum menerima atau melanjutkan perikatan.',
      sections: [
        S('Prasyarat audit', 'Pastikan kerangka pelaporan keuangan yang berlaku dapat diterima dan manajemen mengakui tanggung jawabnya atas LK, pengendalian internal, serta pemberian akses. Bila prasyarat tidak terpenuhi, perikatan umumnya tidak boleh diterima.'),
        S('Isi surat perikatan', 'Surat perikatan mendokumentasikan tujuan & ruang lingkup audit, tanggung jawab auditor dan manajemen, kerangka pelaporan, dan bentuk laporan yang diharapkan — mengurangi kesenjangan ekspektasi.'),
        S('Perikatan berulang', 'Untuk audit berulang, nilai apakah ketentuan perlu direvisi dan apakah perlu mengingatkan entitas atas ketentuan yang masih berlaku.'),
      ],
      points: ['Verifikasi keberterimaan kerangka pelaporan', 'Peroleh pengakuan tanggung jawab manajemen', 'Sepakati ruang lingkup & bentuk laporan tertulis', 'Tinjau ulang ketentuan pada perikatan berulang'],
    },
    'SA 230': {
      read: 6, level: 'Inti', hot: true, tags: ['dokumentasi', 'kertas kerja', 'arsip', 'experienced auditor'],
      summary: 'Dokumentasi audit harus cukup agar auditor berpengalaman yang tidak terlibat dapat memahami sifat, saat, dan luas prosedur, hasil, bukti, serta kesimpulan signifikan.',
      sections: [
        S('Uji "auditor berpengalaman"', 'Standar kecukupan dokumentasi adalah keterpahaman oleh auditor berpengalaman tanpa keterlibatan sebelumnya. Catat karakteristik pengidentifikasi item yang diuji, siapa pelaksana & penelaah, serta tanggalnya.'),
        S('Hal signifikan & pertimbangan', 'Dokumentasikan hal-hal signifikan, diskusi dengan manajemen/TCWG, dan bagaimana inkonsistensi bukti diselesaikan. Pertimbangan profesional yang sulit harus terlihat jejaknya.'),
        S('Penyelesaian & retensi arsip', 'Rakit arsip final tepat waktu (umumnya 60 hari sejak tanggal laporan) dan jaga retensi (umumnya 10 tahun). Perubahan setelah tanggal penyelesaian harus tercatat alasannya.'),
      ],
      points: ['Catat identitas item, pelaksana, penelaah, dan tanggal', 'Dokumentasikan hal signifikan & penyelesaian inkonsistensi', 'Rakit arsip final tepat waktu', 'Patuhi periode retensi & kontrol perubahan'],
    },
    'SA 220': {
      read: 6, level: 'Inti', tags: ['pengendalian mutu perikatan', 'EQR', 'reviu', 'independensi'],
      summary: 'Tanggung jawab auditor atas prosedur pengendalian mutu pada tingkat perikatan audit — kepemimpinan, etika, penerimaan, penugasan, supervisi, reviu, dan konsultasi.',
      sections: [
        S('Tanggung jawab rekan perikatan', 'Rekan perikatan bertanggung jawab atas mutu menyeluruh: menetapkan budaya yang berfokus pada mutu, memastikan independensi, dan menilai kompetensi tim secara kolektif.'),
        S('Reviu & konsultasi', 'Pekerjaan ditelaah berjenjang sebelum laporan diterbitkan; hal sulit/kontroversial dikonsultasikan. Bila kriteria terpenuhi, telaah pengendalian mutu perikatan (EQR) dilakukan penelaah independen.'),
        S('Selaras SMM 1', 'Prosedur tingkat perikatan bersandar pada sistem manajemen mutu firma (SMM 1). Bila ada indikasi sistem tidak berfungsi, eskalasi sesuai kebijakan firma.'),
      ],
      points: ['Tetapkan tone-at-the-top atas mutu perikatan', 'Pastikan independensi & kompetensi tim', 'Lakukan reviu berjenjang dan EQR bila perlu', 'Selaraskan dengan sistem mutu firma (SMM 1)'],
    },
    'SA 240': {
      read: 10, level: 'Lanjutan', hot: true, tags: ['fraud', 'kecurangan', 'management override', 'journal entry', 'presumed risk'],
      summary: 'Tanggung jawab auditor terkait kecurangan: skeptisisme, diskusi tim, identifikasi risiko kecurangan (termasuk praduga pengakuan pendapatan & override manajemen), dan respons.',
      sections: [
        S('Dua praduga risiko', 'SA 240 menetapkan praduga adanya risiko kecurangan pada pengakuan pendapatan, dan risiko override pengendalian oleh manajemen yang selalu ada. Keduanya wajib direspons kecuali praduga pendapatan disanggah dengan alasan terdokumentasi.'),
        S('Pengujian jurnal (JET)', 'Untuk merespons override, auditor menguji jurnal dan penyesuaian: seleksi berbasis kriteria risiko (akhir periode, akun tak lazim, pembuat tak biasa, nilai bulat) lalu telusuri ke bukti pendukung.'),
        S('Sikap & komunikasi', 'Pertahankan skeptisisme bahkan ketika integritas manajemen tampak baik. Indikasi kecurangan dikomunikasikan ke tingkat manajemen yang tepat & TCWG, dan dipertimbangkan dampaknya ke opini.'),
      ],
      points: ['Respons praduga risiko pendapatan & management override', 'Lakukan Journal Entry Testing berbasis kriteria risiko', 'Diskusikan kerentanan fraud dalam tim perikatan', 'Komunikasikan indikasi kecurangan ke TCWG'],
    },
    'SA 300': {
      read: 5, level: 'Pengantar', tags: ['perencanaan', 'strategi audit', 'rencana audit'],
      summary: 'Menyusun strategi audit menyeluruh dan rencana audit terinci yang menetapkan ruang lingkup, saat, dan arah audit serta program prosedur.',
      sections: [
        S('Strategi vs rencana', 'Strategi menetapkan karakteristik perikatan, pelaporan, dan arah upaya; rencana menjabarkannya ke prosedur penilaian risiko dan prosedur lanjutan tingkat asersi.'),
        S('Keterlibatan & sumber daya', 'Tentukan komposisi tim, keterlibatan pakar/EQR, dan anggaran waktu. Perencanaan bersifat iteratif — disesuaikan seiring temuan.'),
        S('Tautan ke respons risiko', 'Output perencanaan menjadi masukan langsung bagi program audit (SA 330) dan penetapan materialitas (SA 320).'),
      ],
      points: ['Tetapkan strategi menyeluruh lebih dulu', 'Jabarkan ke rencana & program terinci', 'Alokasikan tim, pakar, dan anggaran waktu', 'Perlakukan perencanaan sebagai proses iteratif'],
    },
    'SA 315': {
      read: 9, level: 'Lanjutan', hot: true, tags: ['penilaian risiko', 'RoMM', 'pemahaman entitas', 'pengendalian internal', 'asersi'],
      summary: 'Mengidentifikasi & menilai risiko kesalahan penyajian material (RoMM) melalui pemahaman atas entitas, lingkungannya, dan pengendalian internal — pada tingkat LK dan asersi.',
      sections: [
        S('Pemahaman entitas & lingkungan', 'Pahami industri, regulasi, model bisnis, dan kerangka pelaporan. Pemahaman ini menjadi basis untuk mengantisipasi di mana kesalahan penyajian material mungkin timbul.'),
        S('Pengendalian internal yang relevan', 'Evaluasi lima komponen pengendalian dan identifikasi pengendalian yang relevan dengan audit, termasuk ITGC. Walkthrough mengonfirmasi desain & implementasi titik kontrol.'),
        S('Penilaian risiko inheren & pengendalian', 'Nilai risiko pada tingkat asersi dengan memisahkan risiko inheren (mempertimbangkan faktor seperti kompleksitas, subjektivitas, perubahan) dari risiko pengendalian. Risiko signifikan memerlukan perhatian khusus.'),
      ],
      points: ['Bangun pemahaman entitas, industri & regulasi', 'Evaluasi desain & implementasi pengendalian relevan', 'Nilai risiko inheren terpisah dari risiko pengendalian', 'Tandai risiko signifikan untuk respons khusus'],
    },
    'SA 320': {
      read: 6, level: 'Inti', hot: true, tags: ['materialitas', 'benchmark', 'performance materiality', 'ambang sepele'],
      summary: 'Menetapkan materialitas pada tahap perencanaan dan menggunakannya untuk menentukan sifat, saat, dan luas prosedur serta mengevaluasi dampak kesalahan penyajian.',
      sections: [
        S('Materialitas keseluruhan', 'Tetapkan dari benchmark yang sesuai (mis. laba sebelum pajak, pendapatan, total aset) dengan persentase yang mencerminkan kebutuhan pengguna LK. Pertimbangkan faktor kualitatif.'),
        S('Materialitas pelaksanaan (PM)', 'Setel PM di bawah materialitas keseluruhan untuk menurunkan probabilitas akumulasi kesalahan tak terkoreksi melampaui materialitas. Tetapkan pula ambang sepele (clearly trivial).'),
        S('Revisi seiring audit', 'Materialitas direvisi bila informasi baru muncul (mis. perubahan estimasi hasil aktual). Modul hilir menarik angka ini dari satu sumber agar konsisten.'),
      ],
      points: ['Pilih benchmark & persentase yang relevan pengguna', 'Setel performance materiality & ambang sepele', 'Pertimbangkan faktor kualitatif', 'Revisi materialitas saat kondisi berubah'],
    },
    'SA 330': {
      read: 7, level: 'Inti', tags: ['respons risiko', 'prosedur substantif', 'uji pengendalian', 'audit programme'],
      summary: 'Merancang dan melaksanakan respons audit yang proporsional terhadap RoMM yang dinilai — uji pengendalian dan/atau prosedur substantif pada tingkat asersi.',
      sections: [
        S('Respons menyeluruh & tingkat asersi', 'Respons tingkat LK (mis. penekanan skeptisisme, unsur tak terduga) dilengkapi prosedur tingkat asersi yang dirancang sesuai sifat & penyebab risiko.'),
        S('Uji pengendalian vs substantif', 'Bila berencana mengandalkan pengendalian, uji efektivitas operasinya. Terlepas dari itu, prosedur substantif tetap dilakukan untuk setiap golongan transaksi/saldo material.'),
        S('Respons risiko signifikan', 'Risiko signifikan memerlukan prosedur substantif yang spesifik; pengujian pengendalian periode berjalan diperlukan bila bermaksud mengandalkannya.'),
      ],
      points: ['Rancang respons sesuai sifat & penyebab risiko', 'Uji pengendalian bila hendak diandalkan', 'Selalu lakukan substantif atas pos material', 'Beri respons spesifik untuk risiko signifikan'],
    },
    'SA 450': {
      read: 6, level: 'Inti', tags: ['salah saji', 'SAD', 'akumulasi', 'evaluasi', 'koreksi'],
      summary: 'Mengakumulasi kesalahan penyajian yang teridentifikasi selama audit dan mengevaluasi dampaknya — baik individual maupun agregat — terhadap laporan keuangan.',
      sections: [
        S('Akumulasi & klasifikasi', 'Catat seluruh kesalahan penyajian (kecuali yang jelas sepele) dalam daftar (SAD): faktual, pertimbangan, dan proyeksi. Pisahkan yang terkoreksi dari tak terkoreksi.'),
        S('Komunikasi & koreksi', 'Komunikasikan kesalahan penyajian ke tingkat manajemen yang tepat dan minta koreksi. Tolakan untuk mengoreksi dipahami alasannya dan dipertimbangkan dampaknya.'),
        S('Evaluasi terhadap materialitas', 'Evaluasi apakah agregat kesalahan tak terkoreksi material — individual maupun gabungan, mempertimbangkan faktor kualitatif — dan dampaknya ke opini.'),
      ],
      points: ['Akumulasikan semua salah saji di luar yang sepele', 'Pisahkan terkoreksi vs tak terkoreksi', 'Komunikasikan & minta koreksi', 'Evaluasi agregat terhadap materialitas'],
    },
    'SA 500': {
      read: 6, level: 'Inti', tags: ['bukti audit', 'cukup dan tepat', 'asersi', 'relevansi', 'keandalan'],
      summary: 'Merancang dan melaksanakan prosedur audit untuk memperoleh bukti yang cukup dan tepat guna menarik kesimpulan yang menjadi dasar opini.',
      sections: [
        S('Cukup & tepat', '"Cukup" adalah ukuran kuantitas (dipengaruhi risiko & mutu bukti); "tepat" adalah ukuran kualitas — relevansi dan keandalan terhadap asersi yang diuji.'),
        S('Sumber & keandalan', 'Keandalan meningkat bila bukti dari sumber independen eksternal, pengendalian efektif, atau diperoleh langsung oleh auditor (mis. inspeksi/observasi).'),
        S('Penggunaan pekerjaan pihak lain', 'Bila menggunakan informasi yang dihasilkan entitas atau pekerjaan pakar, evaluasi akurasi, kelengkapan, dan kompetensi/objektivitasnya.'),
      ],
      points: ['Hubungkan setiap prosedur ke asersi', 'Timbang kecukupan (kuantitas) & ketepatan (kualitas)', 'Utamakan bukti dari sumber independen', 'Evaluasi keandalan informasi entitas & pakar'],
    },
    'SA 505': {
      read: 6, level: 'Inti', tags: ['konfirmasi eksternal', 'piutang', 'bank', 'positif', 'prosedur alternatif'],
      summary: 'Memperoleh bukti melalui konfirmasi eksternal langsung dari pihak ketiga, dengan kendali penuh auditor atas proses dan penanganan non-respons.',
      sections: [
        S('Kendali proses', 'Auditor mengendalikan pemilihan pihak, perancangan permintaan, pengiriman, dan penerimaan jawaban langsung — bukan melalui entitas — untuk menjaga keandalan.'),
        S('Konfirmasi positif vs negatif', 'Konfirmasi positif meminta jawaban dalam segala keadaan dan lebih andal; negatif hanya bila risiko rendah, populasi banyak & homogen, serta diharapkan tingkat respons memadai.'),
        S('Non-respons & pengecualian', 'Untuk non-respons konfirmasi positif lakukan prosedur alternatif (mis. uji penerimaan kas berikutnya, pencocokan dokumen). Selisih (pengecualian) diselidiki sebagai indikasi salah saji.'),
      ],
      points: ['Kendalikan seluruh proses konfirmasi', 'Pilih bentuk positif untuk risiko lebih tinggi', 'Lakukan prosedur alternatif atas non-respons', 'Selidiki setiap pengecualian'],
    },
    'SA 520': {
      read: 6, level: 'Inti', tags: ['prosedur analitis', 'ekspektasi', 'fluktuasi', 'reviu menyeluruh'],
      summary: 'Menggunakan prosedur analitis sebagai pengujian substantif dan pada reviu akhir untuk menilai konsistensi LK dengan pemahaman auditor.',
      sections: [
        S('Membangun ekspektasi', 'Efektivitas analitis bergantung pada ekspektasi yang cukup tepat (data andal, hubungan yang dapat diprediksi) dan ambang investigasi yang ditetapkan sebelumnya.'),
        S('Investigasi fluktuasi', 'Selisih yang melampaui ambang diselidiki: tanyakan ke manajemen, korroborasi penjelasan dengan bukti lain, dan lakukan prosedur tambahan bila penjelasan tidak memadai.'),
        S('Reviu analitis akhir', 'Menjelang penyelesaian, prosedur analitis membantu menilai apakah LK secara keseluruhan konsisten — dapat memunculkan risiko yang belum teridentifikasi.'),
      ],
      points: ['Bangun ekspektasi dari data yang andal', 'Tetapkan ambang investigasi di muka', 'Korroborasi penjelasan manajemen', 'Lakukan reviu analitis menyeluruh di akhir'],
    },
    'SA 530': {
      read: 7, level: 'Lanjutan', tags: ['sampling', 'MUS', 'monetary unit', 'proyeksi salah saji', 'populasi'],
      summary: 'Menerapkan sampling audit agar setiap unit sampling berpeluang dipilih, lalu memproyeksikan hasil ke populasi dengan dasar yang masuk akal.',
      sections: [
        S('Desain & ukuran sampel', 'Tetapkan tujuan, populasi, dan unit sampling. Ukuran sampel dipengaruhi risiko sampling yang dapat diterima, salah saji yang ditoleransi, dan ekspektasi salah saji.'),
        S('Metode pemilihan', 'Gunakan metode yang memberi peluang seleksi (acak, sistematis, MUS). Monetary Unit Sampling membobot peluang pada nilai rupiah sehingga item besar lebih mungkin terpilih.'),
        S('Evaluasi & proyeksi', 'Proyeksikan salah saji sampel ke populasi dan bandingkan dengan salah saji yang ditoleransi. Pertimbangkan risiko sampling sebelum menyimpulkan.'),
      ],
      points: ['Definisikan populasi & unit sampling', 'Tetapkan ukuran dari risiko & toleransi', 'Pilih metode dengan peluang seleksi (mis. MUS)', 'Proyeksikan salah saji & evaluasi vs toleransi'],
    },
    'SA 540': {
      read: 9, level: 'Lanjutan', hot: true, tags: ['estimasi akuntansi', 'ketidakpastian', 'bias manajemen', 'ECL', 'nilai wajar'],
      summary: 'Mengaudit estimasi akuntansi dan pengungkapannya — termasuk yang memiliki ketidakpastian tinggi — dengan menilai metode, asumsi, dan data, serta indikator bias manajemen.',
      sections: [
        S('Pemahaman & penilaian risiko', 'Pahami bagaimana manajemen membuat estimasi: metode, asumsi signifikan, dan data. Tingkat ketidakpastian estimasi memengaruhi penilaian risiko inheren.'),
        S('Tiga pendekatan pengujian', 'Auditor dapat menguji proses manajemen, mengembangkan estimasi/rentang sendiri, dan/atau menelaah peristiwa hingga tanggal laporan yang menguatkan estimasi.'),
        S('Indikator bias & pengungkapan', 'Tinjau pertimbangan & keputusan untuk indikator bias manajemen, dan evaluasi kecukupan pengungkapan ketidakpastian estimasi pada LK.'),
      ],
      points: ['Pahami metode, asumsi & data estimasi', 'Pilih pendekatan pengujian yang sesuai', 'Waspadai indikator bias manajemen', 'Evaluasi pengungkapan ketidakpastian'],
    },
    'SA 560': {
      read: 5, level: 'Pengantar', tags: ['peristiwa kemudian', 'subsequent events', 'tanggal laporan'],
      summary: 'Memperoleh bukti bahwa peristiwa antara tanggal LK dan tanggal laporan auditor yang memerlukan penyesuaian/pengungkapan telah tercermin dengan tepat.',
      sections: [
        S('Peristiwa hingga tanggal laporan', 'Lakukan prosedur (membaca notulen, kueri manajemen, telaah LK interim) untuk mengidentifikasi peristiwa yang memerlukan penyesuaian atau pengungkapan (PSAK 8).'),
        S('Fakta yang diketahui setelahnya', 'Bila fakta material diketahui setelah tanggal laporan namun sebelum penerbitan LK, diskusikan dengan manajemen dan pertimbangkan implikasi terhadap laporan.'),
        S('Kaitan dengan representasi', 'Cakupan peristiwa kemudian ditegaskan dalam surat representasi tertulis (SA 580).'),
      ],
      points: ['Lakukan prosedur hingga tanggal laporan', 'Bedakan peristiwa penyesuaian vs pengungkapan', 'Tangani fakta yang diketahui setelahnya', 'Tegaskan dalam representasi tertulis'],
    },
    'SA 570': {
      read: 7, level: 'Inti', tags: ['kelangsungan usaha', 'going concern', 'material uncertainty', 'rencana manajemen'],
      summary: 'Menilai kesesuaian penggunaan basis kelangsungan usaha oleh manajemen dan menyimpulkan apakah terdapat ketidakpastian material yang menimbulkan keraguan signifikan.',
      sections: [
        S('Identifikasi peristiwa/kondisi', 'Evaluasi indikator keuangan (rugi berulang, defisiensi modal kerja, kesulitan likuiditas), operasional, dan lainnya yang dapat menimbulkan keraguan atas kelangsungan usaha.'),
        S('Evaluasi rencana manajemen', 'Telaah penilaian manajemen dan kelayakan rencana mitigasi (refinancing, divestasi, restrukturisasi), termasuk asumsi proyeksi arus kas.'),
        S('Dampak pelaporan', 'Bila ada ketidakpastian material yang diungkapkan memadai → paragraf "Ketidakpastian Material terkait Kelangsungan Usaha". Bila pengungkapan tidak memadai atau basis tidak tepat → modifikasi opini.'),
      ],
      points: ['Identifikasi peristiwa/kondisi keraguan', 'Evaluasi kelayakan rencana manajemen', 'Nilai kecukupan pengungkapan', 'Tentukan dampak ke laporan auditor'],
    },
    'SA 580': {
      read: 5, level: 'Pengantar', tags: ['representasi tertulis', 'management rep letter', 'prasyarat opini'],
      summary: 'Memperoleh representasi tertulis dari manajemen sebagai bukti yang diperlukan, menegaskan tanggung jawab dan asersi tertentu menjelang penyelesaian.',
      sections: [
        S('Sifat & cakupan', 'Representasi menegaskan pemenuhan tanggung jawab manajemen atas LK, kelengkapan informasi, dan hal spesifik yang disyaratkan SA lain (mis. kecurangan, peristiwa kemudian, pihak berelasi).'),
        S('Bukan pengganti bukti lain', 'Representasi melengkapi, bukan menggantikan, bukti audit. Bila bertentangan dengan bukti lain, selidiki dan pertimbangkan keandalan representasi.'),
        S('Keandalan diragukan', 'Bila integritas manajemen diragukan sehingga representasi tidak andal, hal ini dapat berdampak pada kemungkinan menyatakan opini.'),
      ],
      points: ['Peroleh representasi atas tanggung jawab & asersi khusus', 'Perlakukan sebagai pelengkap, bukan pengganti bukti', 'Selidiki kontradiksi dengan bukti lain', 'Pertimbangkan dampak bila keandalan diragukan'],
    },
    'SA 600': {
      read: 7, level: 'Lanjutan', tags: ['audit grup', 'komponen', 'instruksi', 'konsolidasi'],
      summary: 'Pertimbangan khusus audit laporan keuangan grup yang mencakup pekerjaan auditor komponen — penentuan lingkup, materialitas komponen, dan keterlibatan.',
      sections: [
        S('Lingkup & materialitas komponen', 'Tentukan komponen signifikan (atas dasar signifikansi keuangan atau risiko khusus) dan tetapkan materialitas komponen di bawah materialitas grup.'),
        S('Instruksi & keterlibatan', 'Komunikasikan instruksi ke auditor komponen, evaluasi kompetensi & independensinya, dan tentukan tingkat keterlibatan tim grup atas pekerjaannya.'),
        S('Konsolidasi & kliring', 'Uji proses konsolidasi, eliminasi antar-entitas, dan selesaikan temuan komponen hingga clearance untuk opini grup.'),
      ],
      points: ['Identifikasi komponen signifikan', 'Tetapkan materialitas komponen', 'Kelola instruksi & evaluasi auditor komponen', 'Uji konsolidasi & eliminasi'],
    },
    'SA 700': {
      read: 7, level: 'Inti', hot: true, tags: ['opini', 'laporan auditor', 'wajar tanpa pengecualian', 'WTM'],
      summary: 'Merumuskan opini atas laporan keuangan dan menyusun laporan auditor independen dengan struktur dan unsur yang dibakukan.',
      sections: [
        S('Perumusan opini', 'Simpulkan apakah LK secara keseluruhan bebas dari kesalahan penyajian material berdasarkan bukti — termasuk evaluasi atas penyajian, struktur, dan pengungkapan sesuai kerangka.'),
        S('Struktur laporan', 'Laporan memuat paragraf opini terlebih dahulu, basis opini, kelangsungan usaha (bila relevan), hal audit utama (untuk entitas tertentu), tanggung jawab manajemen & auditor.'),
        S('Opini tanpa modifikasi', 'Dinyatakan bila LK disajikan secara wajar sesuai kerangka. Bila tidak, dirujuk ke SA 705 untuk modifikasi.'),
      ],
      points: ['Simpulkan kewajaran LK secara keseluruhan', 'Susun laporan dengan unsur baku', 'Tempatkan opini & basis di awal', 'Rujuk SA 705 bila perlu modifikasi'],
    },
    'SA 701': {
      read: 6, level: 'Lanjutan', tags: ['KAM', 'hal audit utama', 'key audit matters'],
      summary: 'Mengomunikasikan Hal Audit Utama (KAM) dalam laporan auditor — hal-hal yang paling signifikan dalam audit periode berjalan menurut pertimbangan profesional.',
      sections: [
        S('Penentuan KAM', 'Dari hal yang dikomunikasikan ke TCWG, pilih yang menuntut perhatian auditor signifikan (mis. area risiko tinggi, estimasi signifikan, transaksi besar tak biasa).'),
        S('Penyajian KAM', 'Untuk tiap KAM, uraikan mengapa dianggap signifikan dan bagaimana audit menanganinya — tanpa menjadi opini terpisah atas hal tersebut.'),
        S('Keterhubungan', 'KAM bertaut ke pengungkapan terkait di LK dan tidak menggantikan modifikasi opini atau paragraf kelangsungan usaha.'),
      ],
      points: ['Pilih KAM dari komunikasi ke TCWG', 'Jelaskan signifikansi & penanganannya', 'Tautkan ke pengungkapan LK terkait', 'Bedakan dari modifikasi opini'],
    },
    'SA 705': {
      read: 7, level: 'Lanjutan', hot: true, tags: ['modifikasi opini', 'WDP', 'tidak menyatakan', 'tidak wajar', 'qualified'],
      summary: 'Menentukan jenis opini modifikasian yang tepat ketika LK mengandung kesalahan penyajian material atau bukti yang cukup tidak diperoleh.',
      sections: [
        S('Dua pemicu modifikasi', 'Modifikasi timbul dari (a) kesalahan penyajian material, atau (b) ketidakmampuan memperoleh bukti yang cukup dan tepat (pembatasan lingkup).'),
        S('Jenis opini', 'Pilih berdasarkan material vs pervasif: Wajar Dengan Pengecualian (material tidak pervasif), Tidak Wajar (material & pervasif), atau Tidak Menyatakan Pendapat (pembatasan pervasif).'),
        S('Basis modifikasi', 'Uraikan dalam paragraf "Basis untuk Opini ..." sifat hal, dampak kuantitatif bila praktis, dan pengaruhnya terhadap opini.'),
      ],
      points: ['Identifikasi pemicu: salah saji atau pembatasan', 'Nilai material vs pervasif', 'Pilih WDP / Tidak Wajar / Tidak Menyatakan', 'Uraikan basis modifikasi secara jelas'],
    },
    'SA 720': {
      read: 5, level: 'Inti', tags: ['informasi lain', 'laporan tahunan', 'inkonsistensi material'],
      summary: 'Tanggung jawab auditor atas informasi lain dalam laporan tahunan — membaca dan mempertimbangkan apakah terdapat inkonsistensi material dengan LK atau pengetahuan auditor.',
      sections: [
        S('Membaca informasi lain', 'Peroleh dan baca informasi lain (mis. laporan manajemen, ikhtisar) untuk mempertimbangkan inkonsistensi material dengan LK auditan atau dengan pemahaman auditor.'),
        S('Penanganan salah saji', 'Bila terdapat kesalahan penyajian material pada informasi lain, minta koreksi; bila ditolak, komunikasikan ke TCWG dan pertimbangkan implikasinya.'),
        S('Paragraf Informasi Lain', 'Laporan auditor memuat paragraf "Informasi Lain" yang menjelaskan tanggung jawab auditor dan hasil pertimbangannya.'),
      ],
      points: ['Baca seluruh informasi lain yang tersedia', 'Identifikasi inkonsistensi material', 'Minta koreksi & eskalasi bila perlu', 'Sertakan paragraf Informasi Lain'],
    },
    'SMM 1': {
      /* Dua penyebutan "SPM 1" di bawah SENGAJA dipertahankan: entri knowledge base
         inilah tempat yang tepat untuk mencatat bahwa SMM 1 MENGGANTIKAN SPM 1.
         Pembaca yang mencari "SPM 1" harus mendarat di sini. Ini satu-satunya
         pengecualian gerbang nomenklatur di luar berkas kanon. */
      /* eslint-disable-next-line no-restricted-syntax */
      read: 8, level: 'Lanjutan', hot: true, tags: ['SMM 1', 'SOQM', 'manajemen mutu', 'risiko mutu', 'monitoring', 'menggantikan SPM 1'],
      /* eslint-disable-next-line no-restricted-syntax */
      summary: 'Sistem manajemen mutu firma berbasis risiko: menetapkan tujuan mutu, mengidentifikasi risiko mutu, merancang respons, serta memantau dan memperbaikinya. Disahkan IAPI 18-09-2024, berlaku efektif 31-12-2025 — menggantikan SPM 1.',
      sections: [
        S('Pendekatan berbasis risiko (¶23–27)', 'Firma menetapkan tujuan mutu, mengidentifikasi & menilai risiko mutu yang menghambatnya, lalu merancang respons yang responsif terhadap alasan penilaian risiko tersebut.'),
        S('Enam komponen & dua proses', 'Komponen: tata kelola & kepemimpinan (¶28), ketentuan etika (¶29), penerimaan & keberlanjutan (¶30), pelaksanaan perikatan (¶31), sumber daya (¶32), informasi & komunikasi (¶33). Ditambah dua proses: penilaian risiko (¶23–27) dan pemantauan & remediasi (¶35–47).'),
        S('Respons spesifik (¶34)', 'Sebagian respons diwajibkan standar, antara lain konfirmasi independensi tahunan (¶34(b)), penanganan keluhan & tuduhan (¶34(c)), dan penetapan perikatan yang wajib menjalani penelaahan mutu perikatan sesuai SMM 2 (¶34(f)).'),
        S('Pemantauan & remediasi (¶35–47)', 'Aktivitas pemantauan — termasuk inspeksi atas perikatan yang telah selesai, sekurangnya satu per rekan perikatan per siklus (¶38(c)) — mendeteksi defisiensi; firma menginvestigasi akar masalah, menilai signifikansi & pervasivitas (¶41), lalu meremediasi.'),
        S('Evaluasi tahunan (¶53–56)', 'Pemegang tanggung jawab tertinggi menyimpulkan, sekurangnya setahun sekali, salah satu dari tiga: (a) memberikan keyakinan memadai; (b) memadai kecuali untuk defisiensi signifikan tak pervasif; atau (c) tidak memberikan keyakinan memadai.'),
      ],
      points: ['Tetapkan 27 tujuan mutu mandatori (¶28–33)', 'Identifikasi & nilai risiko mutu atas tiap tujuan', 'Rancang respons, termasuk respons spesifik ¶34', 'Pantau, investigasi akar masalah & remediasi', 'Simpulkan evaluasi tahunan dalam salah satu dari tiga bentuk (¶54)'],
    },
    'SMM 2': {
      read: 6, level: 'Lanjutan', hot: true, tags: ['SMM 2', 'EQR', 'penelaahan mutu perikatan', 'eligibilitas', 'cooling-off'],
      summary: 'Penelaahan mutu perikatan: evaluasi objektif atas pertimbangan signifikan tim perikatan dan kesimpulan yang dihasilkannya, diselesaikan pada atau sebelum tanggal laporan. Disahkan IAPI 18-09-2024, berlaku efektif 31-12-2025.',
      sections: [
        S('Penunjukan & eligibilitas (¶17–21)', 'Penelaah bukan anggota tim perikatan, memiliki kompetensi, kapabilitas, waktu cukup & wewenang yang tepat (¶18(a)), memenuhi ketentuan etika termasuk objektivitas & independensi (¶18(b)). Individu yang membantu penelaah tunduk pada kriteria eligibilitasnya sendiri (¶20).'),
        S('Periode jeda dua tahun (¶19)', 'Mantan rekan perikatan tidak boleh menjadi penelaah mutu perikatan atas perikatan yang sama sebelum melewati jeda dua tahun — atau lebih lama bila diharuskan peraturan atau ketentuan etika.'),
        S('Penurunan eligibilitas (¶22–23)', 'Bila eligibilitas penelaah menurun: tolak penunjukan bila penelaahan belum dimulai, atau hentikan pelaksanaannya bila sudah berjalan; KAP menunjuk pengganti.'),
        S('Pelaksanaan (¶25)', 'Penelaah membaca informasi tim & hasil pemantauan KAP, mendiskusikan hal signifikan dengan rekan perikatan, menelaah dokumentasi terpilih, mengevaluasi dasar penentuan rekan atas independensi (¶25(d)) dan kecukupan keterlibatan rekan (¶25(f)), serta menelaah laporan keuangan & laporan auditor.'),
        S('Gerbang tanggal laporan (¶24(b) · ¶26–27)', 'Rekan perikatan tidak boleh menentukan tanggal laporan sebelum menerima pemberitahuan bahwa penelaahan selesai. Bila kekhawatiran penelaah tidak terselesaikan, penelaah memberi tahu KAP bahwa penelaahan TIDAK DAPAT diselesaikan.'),
        S('Dokumentasi (¶28–30)', 'Memuat nama penelaah & individu yang membantu, identifikasi dokumentasi perikatan yang ditelaah, dasar penentuan penyelesaian, pemberitahuan yang diberikan, dan tanggal penyelesaian.'),
      ],
      points: ['Penelaah bukan anggota tim & eligible (¶18)', 'Jeda 2 tahun bagi mantan rekan perikatan (¶19)', 'Eligibilitas turun ⇒ tolak atau hentikan (¶22–23)', 'Tanggal laporan terkunci sampai penelaahan selesai (¶24(b))', 'Dokumentasikan kelima butir ¶30'],
    },
    'KEPAP': {
      read: 6, level: 'Inti', tags: ['kode etik', 'independensi', 'ancaman', 'pengamanan', 'integritas'],
      summary: 'Kode Etik Profesi Akuntan Publik — prinsip dasar etika dan kerangka konseptual independensi dengan identifikasi ancaman serta pengamanan.',
      sections: [
        S('Prinsip dasar', 'Integritas, objektivitas, kompetensi & kehati-hatian profesional, kerahasiaan, dan perilaku profesional menjadi fondasi setiap perikatan.'),
        S('Kerangka konseptual ancaman', 'Identifikasi ancaman (kepentingan pribadi, telaah pribadi, advokasi, kedekatan, intimidasi), evaluasi signifikansinya, lalu terapkan pengamanan hingga ke tingkat yang dapat diterima.'),
        S('Independensi perikatan asurans', 'Untuk audit, jaga independensi in fact dan in appearance — termasuk rotasi, larangan jasa tertentu, dan batasan kepentingan keuangan.'),
      ],
      points: ['Junjung lima prinsip dasar etika', 'Terapkan kerangka konseptual ancaman', 'Pasang pengamanan yang memadai', 'Jaga independensi fakta & penampilan'],
    },
    'PSAK 1': {
      read: 6, level: 'Inti', tags: ['penyajian LK', 'going concern', 'komparatif', 'CALK'],
      summary: 'Dasar penyajian laporan keuangan bertujuan umum agar dapat dibandingkan — komponen LK lengkap, basis kelangsungan usaha, akrual, materialitas & agregasi.',
      sections: [
        S('Komponen LK lengkap', 'Mencakup laporan posisi keuangan, laba rugi & penghasilan komprehensif lain, perubahan ekuitas, arus kas, dan catatan atas LK, serta informasi komparatif.'),
        S('Asumsi dasar', 'LK disusun atas dasar kelangsungan usaha dan basis akrual; penyajian wajar mensyaratkan kepatuhan PSAK serta pengungkapan tambahan bila perlu.'),
        S('Materialitas & konsistensi', 'Pos material disajikan terpisah; penyajian & klasifikasi dipertahankan antar-periode kecuali ada alasan perubahan yang diungkapkan.'),
      ],
      points: ['Sajikan komponen LK lengkap + komparatif', 'Terapkan basis akrual & kelangsungan usaha', 'Pisahkan pos material', 'Jaga konsistensi penyajian'],
    },
    'PSAK 8': {
      read: 4, level: 'Pengantar', tags: ['peristiwa setelah periode', 'adjusting', 'non-adjusting'],
      summary: 'Pengakuan dan pengungkapan peristiwa setelah periode pelaporan — membedakan peristiwa yang memerlukan penyesuaian dari yang cukup diungkapkan.',
      sections: [
        S('Adjusting vs non-adjusting', 'Peristiwa yang memberi bukti kondisi pada tanggal pelaporan → penyesuaian; peristiwa yang mengindikasikan kondisi setelahnya → pengungkapan bila material.'),
        S('Dividen & kelangsungan usaha', 'Dividen yang diumumkan setelah periode bukan liabilitas pada tanggal pelaporan. Bila kelangsungan usaha tak lagi tepat, LK tidak disusun atas dasar tersebut.'),
        S('Tanggal otorisasi', 'Ungkapkan tanggal LK diotorisasi terbit dan siapa yang mengotorisasi.'),
      ],
      points: ['Bedakan peristiwa penyesuai & non-penyesuai', 'Perlakukan dividen pasca-periode dengan tepat', 'Nilai ulang basis kelangsungan usaha', 'Ungkapkan tanggal otorisasi terbit'],
    },
    'PSAK 14': {
      read: 6, level: 'Inti', tags: ['persediaan', 'NRV', 'biaya perolehan', 'cut-off'],
      summary: 'Pengukuran persediaan pada nilai terendah antara biaya perolehan dan nilai realisasi neto (NRV), serta penentuan biaya dan pengakuan beban.',
      sections: [
        S('Biaya perolehan', 'Biaya mencakup pembelian, konversi, dan biaya lain hingga persediaan berada di lokasi & kondisi kini. Gunakan FIFO atau rata-rata tertimbang secara konsisten.'),
        S('Nilai realisasi neto', 'Bandingkan biaya dengan NRV (harga jual taksiran dikurangi biaya penyelesaian & penjualan). Selisih turun nilai diakui sebagai beban; pemulihan dibatasi.'),
        S('Cut-off & observasi', 'Audit menekankan keberadaan (observasi stock opname), kelengkapan, dan cut-off pembelian/penjualan di sekitar tanggal pelaporan.'),
      ],
      points: ['Tentukan biaya dengan metode konsisten', 'Ukur pada terendah biaya vs NRV', 'Akui penurunan ke NRV sebagai beban', 'Uji keberadaan & cut-off'],
    },
    'PSAK 16': {
      read: 7, level: 'Inti', hot: true, tags: ['aset tetap', 'penyusutan', 'umur manfaat', 'revaluasi', 'register'],
      summary: 'Pengakuan, pengukuran, penyusutan, dan penghentian aset tetap — termasuk komponenisasi, umur manfaat, nilai residu, dan model biaya vs revaluasi.',
      sections: [
        S('Pengakuan & pengukuran awal', 'Aset diakui bila manfaat ekonomik mengalir & biaya terukur andal; diukur pada biaya perolehan termasuk biaya yang dapat diatribusikan langsung dan estimasi pembongkaran.'),
        S('Penyusutan & komponen', 'Susutkan secara sistematis sepanjang umur manfaat; komponen signifikan disusutkan terpisah. Umur manfaat, nilai residu, dan metode ditinjau minimal tiap akhir tahun (estimasi — prospektif).'),
        S('Roll-forward & ketertelusuran', 'Saldo bruto & akumulasi penyusutan ditelusuri ke register aset dan ditutup persis ke buku besar (WTB); penambahan & pelepasan diuji.'),
      ],
      points: ['Kapitalisasi biaya yang dapat diatribusikan', 'Susutkan per komponen signifikan', 'Tinjau umur manfaat & residu (prospektif)', 'Rekonsiliasi register ke buku besar'],
    },
    'PSAK 24': {
      read: 7, level: 'Lanjutan', tags: ['imbalan kerja', 'imbalan pasti', 'aktuaria', 'diskonto', 'OCI'],
      summary: 'Akuntansi imbalan kerja, khususnya program imbalan pasti — kewajiban imbalan pasti (DBO), biaya jasa, bunga neto, dan pengukuran kembali di OCI.',
      sections: [
        S('Pengukuran liabilitas', 'DBO diukur dengan metode Projected Unit Credit dan asumsi aktuaria (tingkat diskonto, kenaikan gaji, mortalita). Tingkat diskonto mengacu pada imbal hasil obligasi korporasi/pemerintah berkualitas tinggi.'),
        S('Komponen biaya', 'Biaya terdiri dari biaya jasa (laba rugi), bunga neto (laba rugi), dan pengukuran kembali — keuntungan/kerugian aktuaria & imbal hasil aset — yang diakui di OCI dan tidak direklas.'),
        S('Sensitivitas & audit', 'Audit menilai kompetensi aktuaris, kewajaran asumsi, dan pengungkapan analisis sensitivitas (mis. dampak diskonto −1%).'),
      ],
      points: ['Ukur DBO dengan asumsi aktuaria yang wajar', 'Pisahkan biaya jasa, bunga neto & remeasurement', 'Akui pengukuran kembali di OCI', 'Evaluasi pakar aktuaria & pengungkapan'],
    },
    'PSAK 46': {
      read: 8, level: 'Lanjutan', tags: ['pajak penghasilan', 'pajak tangguhan', 'beda temporer', 'DTA', 'recoverability'],
      summary: 'Akuntansi pajak kini dan pajak tangguhan atas beda temporer antara nilai tercatat dan dasar pengenaan pajak aset/liabilitas, termasuk uji pemulihan aset pajak tangguhan.',
      sections: [
        S('Pajak kini & tangguhan', 'Pajak kini = utang/restitusi atas penghasilan kena pajak periode. Pajak tangguhan mengakui konsekuensi pajak masa depan dari beda temporer kena pajak (DTL) dan dapat dikurangkan (DTA).'),
        S('Pengakuan DTA', 'DTA (termasuk dari rugi fiskal) diakui sepanjang besar kemungkinan tersedia laba kena pajak masa depan untuk pemanfaatannya — dinilai ulang tiap tanggal pelaporan.'),
        S('Sumber lintas-modul', 'Beda temporer ditarik dari modul sumber (imbalan kerja, ECL, sewa, aset tetap) dan buku besar — bukan di-hardcode — agar konsisten dan dapat ditelusuri.'),
      ],
      points: ['Hitung pajak kini & tangguhan terpisah', 'Identifikasi beda temporer per pos', 'Uji recoverability DTA tiap periode', 'Telusuri beda temporer ke modul sumber'],
    },
    'PSAK 71': {
      read: 9, level: 'Lanjutan', hot: true, tags: ['instrumen keuangan', 'ECL', 'CKPN', 'klasifikasi', 'staging', 'SPPI'],
      summary: 'Klasifikasi & pengukuran instrumen keuangan dan model kerugian kredit ekspektasian (ECL) — penyisihan berbasis perkiraan ke depan, bukan kerugian yang sudah terjadi.',
      sections: [
        S('Klasifikasi & pengukuran', 'Aset keuangan diklasifikasikan berdasarkan model bisnis dan karakteristik arus kas (uji SPPI) ke biaya perolehan diamortisasi, FVOCI, atau FVTPL.'),
        S('Model ECL & staging', 'Cadangan kerugian (CKPN) dihitung dengan model ECL tiga tahap: 12-bulan untuk Stage 1, dan sepanjang umur untuk Stage 2/3 setelah peningkatan risiko kredit signifikan.'),
        S('Matriks provisi & overlay', 'Untuk piutang usaha, pendekatan sederhana memakai matriks provisi berbasis aging + overlay forward-looking (makroekonomi). Audit menguji aging, tingkat kerugian, dan kewajaran overlay.'),
      ],
      points: ['Klasifikasikan via model bisnis & uji SPPI', 'Terapkan ECL tiga tahap', 'Gunakan matriks provisi + overlay untuk piutang', 'Uji aging, loss rate & asumsi forward-looking'],
    },
    'PSAK 72': {
      read: 8, level: 'Lanjutan', hot: true, tags: ['pendapatan', 'kontrak pelanggan', 'lima langkah', 'kewajiban pelaksanaan', 'cut-off'],
      summary: 'Pengakuan pendapatan dari kontrak dengan pelanggan menggunakan model lima langkah — mengakui pendapatan saat (atau selama) kewajiban pelaksanaan dipenuhi.',
      sections: [
        S('Model lima langkah', 'Identifikasi kontrak → identifikasi kewajiban pelaksanaan → tentukan harga transaksi → alokasikan ke kewajiban → akui pendapatan saat kewajiban dipenuhi.'),
        S('Titik waktu vs sepanjang waktu', 'Pendapatan diakui sepanjang waktu bila kriteria terpenuhi (mis. pelanggan menerima manfaat bersamaan), jika tidak maka pada titik waktu pengalihan pengendalian.'),
        S('Risiko & cut-off', 'Pengakuan pendapatan adalah area praduga risiko kecurangan (SA 240). Audit menekankan occurrence dan cut-off; koreksi cut-off ditarik dari satu jurnal kunci (AJE) agar konsisten.'),
      ],
      points: ['Terapkan model lima langkah secara berurutan', 'Tentukan titik waktu vs sepanjang waktu', 'Alokasikan harga ke tiap kewajiban', 'Tekankan occurrence & cut-off pendapatan'],
    },
    'PSAK 73': {
      read: 7, level: 'Inti', hot: true, tags: ['sewa', 'aset hak-guna', 'liabilitas sewa', 'ROU', 'diskonto'],
      summary: 'Model sewa tunggal bagi penyewa: mengakui aset hak-guna (ROU) dan liabilitas sewa untuk hampir seluruh sewa, menggantikan dikotomi operasi/pembiayaan.',
      sections: [
        S('Pengakuan awal', 'Liabilitas sewa = nilai kini pembayaran sewa didiskontokan dengan suku bunga implisit atau suku bunga pinjaman inkremental; ROU = liabilitas + pembayaran awal + biaya langsung.'),
        S('Pengukuran selanjutnya', 'ROU disusutkan dan liabilitas diakui beban bunga (metode bunga efektif). Pengecualian tersedia untuk sewa jangka pendek & aset bernilai rendah.'),
        S('Portofolio & ketertelusuran', 'Perhitungan ROU & liabilitas dijalankan dari portofolio sewa kanonik (term, pembayaran, suku bunga) sebagai sumber tunggal yang ditarik PSAK 46 & LK.'),
      ],
      points: ['Akui ROU & liabilitas untuk hampir semua sewa', 'Diskontokan dengan suku bunga yang tepat', 'Susutkan ROU; bunga efektif atas liabilitas', 'Gunakan portofolio sewa sebagai sumber tunggal'],
    },
  };

  /* ---------- pembangun konten fallback dari metadata registri ----------
     Standar tanpa editorial khusus tetap punya artikel yang substantif:
     dibangun dari title, type, phase, & modul fungsional terkait. */
  function buildFallback(reg: any) {
    const mi = (window.MODULE_INDEX || {})[reg.module] || null;
    const modLbl = mi ? mi.label : null;
    const fw = (FRAMEWORK as any)[reg.type] || { label: reg.type };
    const isPSAK = reg.type === 'PSAK' || reg.type === 'SAK';
    const summary = isPSAK
      ? ('Pengaturan akuntansi atas ' + reg.title.toLowerCase() + ': pengakuan, pengukuran, penyajian, dan pengungkapan sesuai kerangka pelaporan yang berlaku.')
      : ('Standar yang mengatur tanggung jawab dan prosedur auditor terkait ' + reg.title.toLowerCase() + ' pada fase ' + (reg.phase || 'audit').toLowerCase() + '.');
    const sections = isPSAK ? [
      S('Pengakuan & pengukuran', 'Tentukan kapan pos diakui dan bagaimana diukur pada pengakuan awal maupun selanjutnya, sesuai kriteria ' + reg.code + '. Pertimbangan & estimasi signifikan diidentifikasi dan didokumentasikan.'),
      S('Penyajian & pengungkapan', 'Sajikan pos pada laporan keuangan dengan klasifikasi yang tepat dan ungkapkan kebijakan akuntansi, pertimbangan, serta informasi yang membantu pengguna memahami dampaknya.'),
      S('Implikasi audit', modLbl ? ('Prosedur audit dijalankan melalui modul ' + modLbl + ', yang menarik angka dari buku besar (WTB) sebagai sumber tunggal sehingga konsisten lintas modul.') : 'Auditor memperoleh bukti yang cukup dan tepat atas pengakuan, pengukuran, dan pengungkapan pos terkait.'),
    ] : [
      S('Tujuan & ruang lingkup', reg.code + ' menetapkan tujuan auditor dan ruang lingkup penerapannya. Prosedur dirancang proporsional terhadap risiko kesalahan penyajian material yang relevan.'),
      S('Prosedur utama', 'Auditor merancang & melaksanakan prosedur untuk memperoleh bukti yang cukup dan tepat, dengan mempertahankan skeptisisme profesional dan mendokumentasikan pertimbangan signifikan.'),
      S('Pelaksanaan di Asseris', modLbl ? ('Standar ini dijalankan melalui modul ' + modLbl + '; status ketertelusuran & kepatuhannya terpusat di Matriks Kepatuhan.') : 'Status keberlakuan & ketertelusuran standar ini dikelola di Matriks Kepatuhan.'),
    ];
    const points = isPSAK
      ? ['Pahami kriteria pengakuan & pengukuran', 'Terapkan kebijakan secara konsisten', 'Lengkapi pengungkapan yang disyaratkan', 'Telusuri angka ke buku besar (WTB)']
      : ['Pahami tujuan & ruang lingkup standar', 'Rancang prosedur proporsional terhadap risiko', 'Dokumentasikan bukti & pertimbangan', 'Pantau ketertelusuran di Matriks Kepatuhan'];
    return { summary: summary, sections: sections, points: points, fallback: true, level: isPSAK ? 'Inti' : 'Pengantar', read: 5, tags: [fw.label] };
  }

  /* gabungkan editorial + fallback untuk satu baris registri */
  function resolve(reg: any) {
    const c = (KB_CONTENT as any)[reg.code];
    if (c) return Object.assign({ fallback: false }, c);
    return buildFallback(reg);
  }

  /* ---------- template yang mengimplementasikan standar (tarikan LIVE) ----------
     match: salah satu entri t.sa.code == code, ATAU t.module == modul standar. */
  function templatesForStandard(code: any, moduleId: any) {
    const T = (AMS && (AMS as any).TEMPLATES) || [];
    const seen = {}, out: any[] = [];
    T.forEach(function (t: any) {
      const byStd = (t.sa || []).some(function (s: any) { return s.code === code; });
      const byMod = moduleId && t.module === moduleId;
      if ((byStd || byMod) && !(seen as any)[t.id]) { (seen as any)[t.id] = 1; out.push(t); }
    });
    return out;
  }

  /* ---------- katalog artikel: DIBANGKITKAN dari registri kanonik ----------
     Tidak ada daftar artikel independen — satu sumber kebenaran. */
  function articles() {
    const REG = STANDARDS_REGISTRY || [];
    return REG.map(function (reg: any) {
      const kb = resolve(reg);
      return {
        code: reg.code, title: reg.title, type: reg.type, phase: reg.phase,
        coverage: reg.coverage, module: reg.module,
        read: kb.read || 5, level: kb.level || 'Inti', hot: !!kb.hot,
        tags: kb.tags || [], fallback: !!kb.fallback,
      };
    });
  }

  Object.assign(AMS, {
    KB_CONTENT: KB_CONTENT, KB_FRAMEWORK: FRAMEWORK, KB_UPDATED: KB_UPDATED,
    kbResolve: resolve, kbArticles: articles, kbTemplatesForStandard: templatesForStandard,
  });
})();


/* [legacy slice 10a] AMS kini di-import dari ./data.js (owner data.js tetap dual-publish). */
