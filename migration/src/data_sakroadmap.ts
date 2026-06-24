/* ============================================================
   Asseris — Roadmap SAK & Pelacak ISAK  (menutup Gap G5)
   ------------------------------------------------------------
   SUMBER KEBENARAN TUNGGAL untuk horizon Standar Akuntansi Keuangan:
   AMS_CANON.sakHorizon() — seluruh tab & kertas kerja menarik angka
   dari SATU fungsi ini, tidak ada daftar yang ditulis ulang antar tab.

   Sistem sebelumnya hanya MEMOTRET standar yang berlaku; modul ini
   mengantisipasi perubahan:
     • Roadmap "terbit, belum efektif" (PSAK 25 ¶30–31) — PSAK 207
       (adopsi IFRS 18), PSAK 208 (entitas anak tanpa akuntabilitas
       publik / pengungkapan tereduksi), amandemen instrumen keuangan.
     • Registri ISAK terlacak terpisah dari PSAK induk (ISAK 16, 30,
       34, 36, dll.) — agar audit-trail kelengkapan kerangka utuh.

   Horizon dibingkai relatif terhadap PERIODE PELAPORAN yang diaudit:
   FY2025 (tutup buku 31 Des 2025). Standar dengan tanggal efektif
   1 Jan 2026 ke atas = "terbit, belum efektif" → wajib diungkap pada
   CALK FY2025 sesuai PSAK 25 ¶30–31 (sebelumnya PSAK 1 ¶30).
   ============================================================ */
import { AMS_CANON } from './canon';
import type { PsakRenumberRow } from './canon_types';

/* ============================================================
   AK-01 — Padanan Penomoran PSAK/ISAK lama ↔ baru (SSOT)
   ------------------------------------------------------------
   SUMBER: dokumen resmi IAI "Perubahan Penomoran PSAK dan ISAK
   dalam SAK Indonesia" (web.iaiglobal.or.id). Penomoran berubah
   efektif 1 Jan 2024; SUBSTANSI tiap standar TIDAK berubah.
   Skema: 1xx=adopsi IFRS · 2xx=adopsi IAS · 3xx=lokal · 4xx=syariah.
   Nilai di bawah PERSIS dokumen IAI (bukan formula/tebakan). Syariah
   (PSAK 101–112→401–412) sengaja diluar cakupan modul audit umum.
   Diakses 24 Jun 2026.
   ============================================================ */
export const PSAK_RENUMBER: PsakRenumberRow[] = [
  { kind: 'PSAK', old: 'PSAK 1', neu: 'PSAK 201', title: 'Penyajian Laporan Keuangan' },
  { kind: 'PSAK', old: 'PSAK 2', neu: 'PSAK 207', title: 'Laporan Arus Kas' },
  { kind: 'PSAK', old: 'PSAK 3', neu: 'PSAK 234', title: 'Laporan Keuangan Interim' },
  { kind: 'PSAK', old: 'PSAK 4', neu: 'PSAK 227', title: 'Laporan Keuangan Tersendiri' },
  { kind: 'PSAK', old: 'PSAK 5', neu: 'PSAK 108', title: 'Segmen Operasi' },
  { kind: 'PSAK', old: 'PSAK 7', neu: 'PSAK 224', title: 'Pengungkapan Pihak-Pihak Berelasi' },
  { kind: 'PSAK', old: 'PSAK 8', neu: 'PSAK 210', title: 'Peristiwa Setelah Periode Pelaporan' },
  { kind: 'PSAK', old: 'PSAK 10', neu: 'PSAK 221', title: 'Pengaruh Perubahan Kurs Valuta Asing' },
  { kind: 'PSAK', old: 'PSAK 13', neu: 'PSAK 240', title: 'Properti Investasi' },
  { kind: 'PSAK', old: 'PSAK 14', neu: 'PSAK 202', title: 'Persediaan' },
  { kind: 'PSAK', old: 'PSAK 15', neu: 'PSAK 228', title: 'Investasi pada Entitas Asosiasi dan Ventura Bersama' },
  { kind: 'PSAK', old: 'PSAK 16', neu: 'PSAK 216', title: 'Aset Tetap' },
  { kind: 'PSAK', old: 'PSAK 18', neu: 'PSAK 226', title: 'Akuntansi dan Pelaporan Program Manfaat Purnakarya' },
  { kind: 'PSAK', old: 'PSAK 19', neu: 'PSAK 238', title: 'Aset Takberwujud' },
  { kind: 'PSAK', old: 'PSAK 22', neu: 'PSAK 103', title: 'Kombinasi Bisnis' },
  { kind: 'PSAK', old: 'PSAK 24', neu: 'PSAK 219', title: 'Imbalan Kerja' },
  { kind: 'PSAK', old: 'PSAK 25', neu: 'PSAK 208', title: 'Kebijakan Akuntansi, Perubahan Estimasi Akuntansi, dan Kesalahan' },
  { kind: 'PSAK', old: 'PSAK 26', neu: 'PSAK 223', title: 'Biaya Pinjaman' },
  { kind: 'PSAK', old: 'PSAK 46', neu: 'PSAK 212', title: 'Pajak Penghasilan' },
  { kind: 'PSAK', old: 'PSAK 48', neu: 'PSAK 236', title: 'Penurunan Nilai Aset' },
  { kind: 'PSAK', old: 'PSAK 50', neu: 'PSAK 232', title: 'Instrumen Keuangan: Penyajian' },
  { kind: 'PSAK', old: 'PSAK 53', neu: 'PSAK 102', title: 'Pembayaran Berbasis Saham' },
  { kind: 'PSAK', old: 'PSAK 55', neu: 'PSAK 239', title: 'Instrumen Keuangan: Pengakuan dan Pengukuran' },
  { kind: 'PSAK', old: 'PSAK 56', neu: 'PSAK 233', title: 'Laba per Saham' },
  { kind: 'PSAK', old: 'PSAK 57', neu: 'PSAK 237', title: 'Provisi, Liabilitas Kontinjensi, dan Aset Kontinjensi' },
  { kind: 'PSAK', old: 'PSAK 58', neu: 'PSAK 105', title: 'Aset Tidak Lancar yang Dikuasai untuk Dijual dan Operasi yang Dihentikan' },
  { kind: 'PSAK', old: 'PSAK 60', neu: 'PSAK 107', title: 'Instrumen Keuangan: Pengungkapan' },
  { kind: 'PSAK', old: 'PSAK 61', neu: 'PSAK 220', title: 'Akuntansi Hibah Pemerintah dan Pengungkapan Bantuan Pemerintah' },
  { kind: 'PSAK', old: 'PSAK 62', neu: 'PSAK 104', title: 'Kontrak Asuransi' },
  { kind: 'PSAK', old: 'PSAK 63', neu: 'PSAK 229', title: 'Pelaporan Keuangan dalam Ekonomi Hiperinflasi' },
  { kind: 'PSAK', old: 'PSAK 64', neu: 'PSAK 106', title: 'Aktivitas Eksplorasi dan Evaluasi pada Pertambangan Sumber Daya Mineral' },
  { kind: 'PSAK', old: 'PSAK 65', neu: 'PSAK 110', title: 'Laporan Keuangan Konsolidasian' },
  { kind: 'PSAK', old: 'PSAK 66', neu: 'PSAK 111', title: 'Pengaturan Bersama' },
  { kind: 'PSAK', old: 'PSAK 67', neu: 'PSAK 112', title: 'Pengungkapan Kepentingan dalam Entitas Lain' },
  { kind: 'PSAK', old: 'PSAK 68', neu: 'PSAK 113', title: 'Pengukuran Nilai Wajar' },
  { kind: 'PSAK', old: 'PSAK 69', neu: 'PSAK 241', title: 'Agrikultur' },
  { kind: 'PSAK', old: 'PSAK 71', neu: 'PSAK 109', title: 'Instrumen Keuangan' },
  { kind: 'PSAK', old: 'PSAK 72', neu: 'PSAK 115', title: 'Pendapatan dari Kontrak dengan Pelanggan' },
  { kind: 'PSAK', old: 'PSAK 73', neu: 'PSAK 116', title: 'Sewa' },
  { kind: 'PSAK', old: 'PSAK 74', neu: 'PSAK 117', title: 'Kontrak Asuransi' },
  { kind: 'ISAK', old: 'ISAK 9', neu: 'ISAK 101', title: 'Perubahan atas Liabilitas Aktivitas Purnaoperasi, Restorasi, dan Liabilitas Serupa' },
  { kind: 'ISAK', old: 'ISAK 13', neu: 'ISAK 116', title: 'Lindung Nilai Investasi Neto dalam Kegiatan Usaha Luar Negeri' },
  { kind: 'ISAK', old: 'ISAK 15', neu: 'ISAK 114', title: 'Batas Aset Imbalan Pasti, Persyaratan Pendanaan Minimum, dan Interaksinya' },
  { kind: 'ISAK', old: 'ISAK 16', neu: 'ISAK 112', title: 'Perjanjian Konsesi Jasa' },
  { kind: 'ISAK', old: 'ISAK 18', neu: 'ISAK 210', title: 'Bantuan Pemerintah – Tidak Berelasi Spesifik dengan Aktivitas Operasi' },
  { kind: 'ISAK', old: 'ISAK 29', neu: 'ISAK 120', title: 'Biaya Pengupasan Lapisan Tanah dalam Tahap Produksi pada Tambang Terbuka' },
  { kind: 'ISAK', old: 'ISAK 30', neu: 'ISAK 121', title: 'Pungutan' },
  { kind: 'ISAK', old: 'ISAK 31', neu: 'ISAK 331', title: 'Interpretasi atas Ruang Lingkup PSAK 240: Properti Investasi' },
  { kind: 'ISAK', old: 'ISAK 32', neu: 'ISAK 332', title: 'Definisi dan Hierarki Standar Akuntansi Keuangan' },
  { kind: 'ISAK', old: 'ISAK 33', neu: 'ISAK 122', title: 'Transaksi Valuta Asing dan Imbalan di Muka' },
  { kind: 'ISAK', old: 'ISAK 34', neu: 'ISAK 123', title: 'Ketidakpastian dalam Perlakuan Pajak Penghasilan' },
  { kind: 'ISAK', old: 'ISAK 35', neu: 'ISAK 335', title: 'Penyajian Laporan Keuangan Entitas Berorientasi Nonlaba' },
  { kind: 'ISAK', old: 'ISAK 36', neu: 'ISAK 336', title: 'Interaksi Hak atas Tanah (PSAK 216: Aset Tetap) dengan PSAK 116: Sewa' },
];

/* peta lama→baru (key dinormalisasi 'PSAK 71'/'ISAK 35') */
const PSAK_RENUMBER_INDEX: Record<string, PsakRenumberRow> = (() => {
  const m: Record<string, PsakRenumberRow> = {};
  PSAK_RENUMBER.forEach(r => { m[r.old.replace(/\s+/g, ' ').trim().toUpperCase()] = r; });
  return m;
})();

export function psakRenumber(oldCode: string): PsakRenumberRow | null {
  if (!oldCode) return null;
  return PSAK_RENUMBER_INDEX[String(oldCode).replace(/\s+/g, ' ').trim().toUpperCase()] || null;
}

(function () {
  'use strict';

  /* tahun fiskal yang sedang diaudit (acuan horizon) */
  const FY_END = '31 Desember 2025';
  const FY_EFF_CUTOFF = 2026; // efektif ≥ tahun ini = "terbit, belum efektif" utk FY2025

  /* ---- Registri Standar (PSAK & amandemen) ----
     status diturunkan otomatis dari effYear vs FY_EFF_CUTOFF:
       effYear  < cutoff → 'efektif'  (diterapkan / sudah berlaku)
       effYear >= cutoff → 'horizon'  (terbit, belum efektif)
       phase:'ed'        → 'ed'       (eksposur draf / agenda DSAK)
     impact: dampak atas LK klien aktif (manufaktur, terdaftar/Tbk)
     rel: relevansi perikatan aktif — 'wajib' | 'relevan' | 'pantau' | 'tidak'
     view: id modul mendalam (bila ada) untuk navigasi silang          */
  const STANDARDS = [
    /* —— Sudah efektif / diterapkan pada FY2025 —— */
    { id: 's-117', code: 'PSAK 117', title: 'Kontrak Asuransi', ifrs: 'IFRS 17',
      effYear: 2025, effective: '1 Jan 2025', impact: 'Tinggi', rel: 'tidak', view: 'psak117',
      replaces: 'PSAK 62 / PSAK 28 / PSAK 36', tag: 'Adopsi penuh',
      note: 'Berlaku 2025. Tak berdampak pada klien manufaktur (bukan entitas asuransi) — terdokumentasi N/A.' },
    { id: 's-1cl', code: 'Amd. PSAK 1', title: 'Klasifikasi Liabilitas: Lancar / Tidak Lancar & Liabilitas berkovenan', ifrs: 'Amd. IAS 1',
      effYear: 2024, effective: '1 Jan 2024', impact: 'Sedang', rel: 'relevan', view: 'psak1',
      replaces: '—', tag: 'Amandemen',
      note: 'Klasifikasi didasarkan pada hak menunda penyelesaian ≥12 bln pada tanggal pelaporan; kovenan pasca-tanggal pelaporan menjadi pengungkapan. Memengaruhi penyajian utang bank berkovenan klien.' },
    { id: 's-73sl', code: 'Amd. PSAK 73', title: 'Liabilitas Sewa dalam Transaksi Jual & Sewa-Balik', ifrs: 'Amd. IFRS 16',
      effYear: 2024, effective: '1 Jan 2024', impact: 'Rendah', rel: 'relevan', view: 'psak73',
      replaces: '—', tag: 'Amandemen',
      note: 'Penjual-penyewa mengukur ulang liabilitas sewa agar tak mengakui laba/rugi atas hak guna yang dipertahankan. Relevan bila ada transaksi jual-sewa-balik aset pabrik.' },
    { id: 's-sf', code: 'Amd. PSAK 2 & 71', title: 'Pengungkapan Pengaturan Pendanaan Pemasok (Supplier Finance)', ifrs: 'Amd. IAS 7 & IFRS 7',
      effYear: 2024, effective: '1 Jan 2024', impact: 'Sedang', rel: 'relevan', view: 'newdisc',
      replaces: '—', tag: 'Amandemen',
      note: 'Pengungkapan syarat, jumlah terutang, & dampak likuiditas program pendanaan pemasok. Relevan untuk rantai pasok manufaktur dengan skema reverse factoring.' },
    { id: 's-fx', code: 'Amd. PSAK 65/55', title: 'Kurang Dapat Ditukarnya Suatu Valuta (Lack of Exchangeability)', ifrs: 'Amd. IAS 21',
      effYear: 2025, effective: '1 Jan 2025', impact: 'Rendah', rel: 'pantau', view: null,
      replaces: '—', tag: 'Amandemen',
      note: 'Cara menilai keterukaran valuta & estimasi kurs spot saat tak dapat ditukar. Dampak rendah; valuta transaksi klien dapat ditukar.' },

    /* —— Terbit, belum efektif (PSAK 25 ¶30–31) — horizon —— */
    { id: 's-207', code: 'PSAK 207', title: 'Penyajian & Pengungkapan dalam Laporan Keuangan', ifrs: 'IFRS 18',
      effYear: 2027, effective: '1 Jan 2027', impact: 'Tinggi', rel: 'wajib', view: 'psak1',
      replaces: 'menggantikan PSAK 1', tag: 'Standar baru',
      note: 'Restrukturisasi laporan laba rugi ke kategori Operasi / Investasi / Pendanaan, subtotal baku (laba operasi & laba sebelum pendanaan-pajak), pengungkapan Ukuran Kinerja yang Ditentukan Manajemen (MPM/non-GAAP), serta prinsip agregasi/disagregasi. Berlaku retrospektif — komparatif FY2026 harus disajikan ulang. Klien Tbk: WAJIB.' },
    { id: 's-208', code: 'PSAK 208', title: 'Entitas Anak Tanpa Akuntabilitas Publik: Pengungkapan', ifrs: 'IFRS 19',
      effYear: 2027, effective: '1 Jan 2027', impact: 'Sedang', rel: 'tidak', view: null,
      replaces: '—', tag: 'Standar baru',
      note: 'Opsi pengungkapan tereduksi bagi entitas anak yang memenuhi syarat (induk menerapkan SAK & menyusun LK konsolidasian tersedia publik) sambil tetap memakai pengakuan & pengukuran SAK penuh. Klien aktif adalah induk terdaftar → tidak memenuhi syarat; relevan untuk entitas anak dalam grup konsolidasi.' },
    { id: 's-9cm', code: 'Amd. PSAK 71 & 60', title: 'Klasifikasi & Pengukuran Instrumen Keuangan', ifrs: 'Amd. IFRS 9 & 7',
      effYear: 2026, effective: '1 Jan 2026', impact: 'Sedang', rel: 'relevan', view: 'psak71',
      replaces: '—', tag: 'Amandemen',
      note: 'Penghentian pengakuan liabilitas via sistem pembayaran elektronik, penilaian arus kas kontraktual fitur ESG/terkait-keberlanjutan (SPPI), dan pengungkapan instrumen ekuitas FVOCI. Belum efektif FY2025 → ungkap dampak pada CALK.' },
    { id: 's-ai11', code: 'Penyempurnaan Tahunan', title: 'Annual Improvements — Volume 11', ifrs: 'AIP Vol. 11',
      effYear: 2026, effective: '1 Jan 2026', impact: 'Rendah', rel: 'pantau', view: null,
      replaces: '—', tag: 'Penyempurnaan',
      note: 'Klarifikasi minor lintas PSAK (a.l. PSAK 71, PSAK 73, PSAK 60). Dampak diperkirakan tidak material; tetap diungkap sebagai standar belum efektif.' },

    /* —— Eksposur Draf / Agenda DSAK (belum disahkan) —— */
    { id: 's-ed1', code: 'ED DSAK', title: 'Kontrak Listrik Bergantung Sifat Lingkungan (PPA energi terbarukan)', ifrs: 'Amd. IFRS 9 & 7',
      effYear: 2027, effective: 'Usulan 2027', impact: 'Rendah', rel: 'pantau', view: (null as any), phase: 'ed',
      replaces: '—', tag: 'Eksposur Draf',
      note: 'Akuntansi kontrak pembelian listrik (PPA) energi terbarukan dengan karakteristik "pakai-atau-bayar". Pantau bila klien beralih ke sumber energi terbarukan kontraktual.' },
    { id: 's-ed2', code: 'Agenda DSAK', title: 'Adopsi pemutakhiran berkelanjutan IFRS (konvergensi 1-tahun)', ifrs: 'IASB pipeline',
      effYear: 2028, effective: 'Berkelanjutan', impact: 'Rendah', rel: 'pantau', view: null, phase: 'ed',
      replaces: '—', tag: 'Agenda',
      note: 'DSAK-IAI menjaga jeda konvergensi ±1 tahun terhadap IFRS. Registri ini ditinjau tiap rilis Buku SAK untuk menjaga kelengkapan kerangka.' },
  ];

  /* ---- Registri ISAK (interpretasi) — dilacak TERPISAH dari PSAK induk ----
     status: 'berlaku' | 'dicabut'
     rel: 'relevan' (dinilai berdampak) | 'pantau' | 'tidak' (terdokumentasi N/A)  */
  const ISAKS = [
    { code: 'ISAK 9',  title: 'Perubahan Liabilitas Purna-operasi, Restorasi & Liabilitas Serupa', parent: 'PSAK 57 · PSAK 16', status: 'berlaku', rel: 'pantau',
      note: 'Perubahan estimasi biaya pembongkaran/restorasi disesuaikan ke biaya perolehan aset.' },
    { code: 'ISAK 13', title: 'Lindung Nilai Investasi Neto dalam Kegiatan Usaha Luar Negeri', parent: 'PSAK 71', status: 'berlaku', rel: 'tidak',
      note: 'Tidak ada kegiatan usaha luar negeri yang dilindung-nilai.' },
    { code: 'ISAK 15', title: 'Batas Aset Imbalan Pasti, Persyaratan Pendanaan Minimum & Interaksinya', parent: 'PSAK 24', status: 'berlaku', rel: 'relevan',
      note: 'Membatasi pengakuan surplus program imbalan pasti. Relevan atas program pensiun karyawan klien.' },
    { code: 'ISAK 16', title: 'Perjanjian Konsesi Jasa', parent: 'PSAK 72 · PSAK 71', status: 'berlaku', rel: 'tidak',
      note: 'IFRIC 12 — operator infrastruktur publik-ke-swasta. Klien manufaktur tak memiliki perjanjian konsesi.' },
    { code: 'ISAK 18', title: 'Bantuan Pemerintah — Tanpa Relasi Spesifik dengan Aktivitas Operasi', parent: 'PSAK 61', status: 'berlaku', rel: 'pantau',
      note: 'Perlakuan hibah/insentif pemerintah yang tak terkait langsung aktivitas operasi.' },
    { code: 'ISAK 21', title: 'Perjanjian Konstruksi Real Estat', parent: 'PSAK 72', status: 'dicabut', rel: 'tidak',
      note: 'Dicabut seiring berlakunya PSAK 72 (Pendapatan dari Kontrak dengan Pelanggan).' },
    { code: 'ISAK 25', title: 'Hak atas Tanah', parent: 'PSAK 16 · PSAK 19', status: 'berlaku', rel: 'relevan',
      note: 'Biaya pengurusan legal perolehan/perpanjangan hak (HGB) diakui sebagai aset takberwujud terpisah. Relevan: tanah pabrik klien berstatus HGB.' },
    { code: 'ISAK 26', title: 'Penilaian Ulang Derivatif Melekat', parent: 'PSAK 71', status: 'berlaku', rel: 'pantau',
      note: 'Penilaian ulang derivatif melekat saat reklasifikasi kontrak hibrida.' },
    { code: 'ISAK 29', title: 'Biaya Pengupasan Lapisan Tanah Tahap Produksi pada Tambang Terbuka', parent: 'PSAK 14 · PSAK 16', status: 'berlaku', rel: 'tidak',
      note: 'Khusus industri pertambangan. Tidak relevan untuk manufaktur.' },
    { code: 'ISAK 30', title: 'Pungutan (Levies)', parent: 'PSAK 57', status: 'berlaku', rel: 'relevan',
      note: 'IFRIC 21 — saat pengakuan liabilitas pungutan pemerintah (mis. PBB, retribusi). Relevan: pemicu kewajiban menentukan periode pengakuan beban.' },
    { code: 'ISAK 31', title: 'Interpretasi atas Ruang Lingkup PSAK 13: Properti Investasi', parent: 'PSAK 13', status: 'berlaku', rel: 'pantau',
      note: 'Bangunan dalam konstruksi/pengembangan untuk properti investasi.' },
    { code: 'ISAK 32', title: 'Definisi & Hierarki Standar Akuntansi Keuangan', parent: 'KKPK', status: 'berlaku', rel: 'relevan',
      note: 'Menetapkan hierarki sumber dalam memilih kebijakan akuntansi (PSAK 25). Dasar audit-trail kelengkapan kerangka.' },
    { code: 'ISAK 33', title: 'Transaksi Valuta Asing & Imbalan di Muka', parent: 'PSAK 10', status: 'berlaku', rel: 'relevan',
      note: 'IFRIC 22 — tanggal transaksi untuk kurs saat ada uang muka. Relevan: uang muka impor bahan baku klien.' },
    { code: 'ISAK 34', title: 'Ketidakpastian dalam Perlakuan Pajak Penghasilan', parent: 'PSAK 46', status: 'berlaku', rel: 'relevan',
      note: 'IFRIC 23 — pengakuan posisi pajak tak pasti. Relevan: dinilai bersama estimasi pajak tangguhan (PSAK 46).' },
    { code: 'ISAK 35', title: 'Penyajian Laporan Keuangan Entitas Berorientasi Nonlaba', parent: 'PSAK 1', status: 'berlaku', rel: 'tidak', view: 'isak35',
      note: 'Format pelaporan yayasan/nirlaba. Klien aktif berorientasi laba → N/A; modul tersedia untuk perikatan nonlaba.' },
    { code: 'ISAK 36', title: 'Interaksi Ketentuan Hak atas Tanah (PSAK 16) dengan PSAK 73', parent: 'PSAK 16 · PSAK 73', status: 'berlaku', rel: 'relevan',
      note: 'Apakah hak atas tanah dicatat sebagai aset tetap (PSAK 16) atau sewa (PSAK 73). Relevan: penentuan klasifikasi HGB tanah pabrik.' },
  ];

  /* ---- Kesiapan PSAK 207 (IFRS 18) untuk perikatan aktif (default) ---- */
  const READINESS_207 = [
    { id: 'r1', t: 'Identifikasi pos pendapatan/beban ke kategori Operasi, Investasi & Pendanaan' },
    { id: 'r2', t: 'Petakan subtotal baku baru: "Laba Operasi" & "Laba sebelum pendanaan & pajak"' },
    { id: 'r3', t: 'Inventarisasi Ukuran Kinerja Ditentukan Manajemen (MPM) dalam laporan tahunan & siaran pers' },
    { id: 'r4', t: 'Rancang pengungkapan rekonsiliasi MPM ke subtotal SAK + dampak pajak/NCI' },
    { id: 'r5', t: 'Terapkan prinsip agregasi/disagregasi — uraikan pos "lain-lain" yang material' },
    { id: 'r6', t: 'Susun ulang komparatif FY2026 secara retrospektif untuk sajian FY2027' },
    { id: 'r7', t: 'Mutakhirkan pemetaan FS Generator & template CALK ke struktur PSAK 207' },
    { id: 'r8', t: 'Diskusikan dampak penyajian dengan TCWG (SA 260) sebelum periode transisi' },
  ];

  /* ============================================================
     sakHorizon() — agregator kanonik tunggal.
     ============================================================ */
  function sakHorizon() {
    const withStatus = STANDARDS.map(s => ({
      ...s,
      status: s.phase === 'ed' ? 'ed' : (s.effYear >= FY_EFF_CUTOFF ? 'horizon' : 'efektif'),
    }));

    const efektif = withStatus.filter(s => s.status === 'efektif');
    const horizon = withStatus.filter(s => s.status === 'horizon');
    const ed = withStatus.filter(s => s.status === 'ed');

    const isakBerlaku = ISAKS.filter(i => i.status === 'berlaku');
    const isakDicabut = ISAKS.filter(i => i.status === 'dicabut');
    const isakRelevan = ISAKS.filter(i => i.rel === 'relevan');

    /* peta tahun untuk timeline (2024–2028) */
    const years = [2024, 2025, 2026, 2027, 2028];

    return {
      fyEnd: FY_END, cutoff: FY_EFF_CUTOFF, asof: '16 Juni 2026',
      standards: withStatus, efektif, horizon, ed, years,
      isaks: ISAKS, isakBerlaku, isakDicabut, isakRelevan,
      readiness207: READINESS_207,
      counts: {
        efektif: efektif.length, horizon: horizon.length, ed: ed.length,
        isakTotal: ISAKS.length, isakBerlaku: isakBerlaku.length,
        isakDicabut: isakDicabut.length, isakRelevan: isakRelevan.length,
        wajib: withStatus.filter(s => s.status === 'horizon' && s.rel === 'wajib').length,
      },
    };
  }

  AMS_CANON.sakHorizon = sakHorizon;
  AMS_CANON.SAK_STANDARDS = STANDARDS;
  AMS_CANON.SAK_ISAKS = ISAKS;
  AMS_CANON.PSAK_RENUMBER = PSAK_RENUMBER;
  AMS_CANON.psakRenumber = psakRenumber;
})();
