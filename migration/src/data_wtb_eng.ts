/* ============================================================
   PR-J — NERACA SALDO PER PERIKATAN.

   Sebelum ini hanya ENG-2025-014 yang punya neraca saldo, dan setiap perikatan
   lain diam-diam memakai miliknya: ENG-2025-040 (PT Mandiri Sejahtera Finance,
   multifinance) menampilkan bagan akun manufaktur lengkap dengan Beban Pokok
   Penjualan, persediaan, dan aset hak-guna. Memperbaiki hidrasi saja membuat enam
   perikatan tampil KOSONG — benar, tetapi demo kehilangan seluruh isinya. Berkas
   ini mengisi keenamnya dengan bagan akun yang memang milik industrinya.

   Bukan sekadar angka berbeda: multifinance tak punya persediaan, SaaS punya
   pendapatan diterima di muka dan aset takberwujud yang dikembangkan sendiri,
   perkebunan punya tanaman produktif, properti punya persediaan real estat dan
   uang muka pelanggan. Bila yang membedakan hanya nominal, kebocoran lama akan
   sulit terlihat lagi bila terulang.

   SALDO LABA sengaja menjadi ANGKA PENYEIMBANG. Neraca saldo wajib menutup, dan
   saldo laba AWAL memang residu akuntansi dari periode-periode sebelumnya — laba
   tahun berjalan masih hidup di akun laba-rugi yang belum ditutup. Ini satu-satunya
   plug yang sah di berkas ini, dan uji `wtb_engagement_seed.test.ts` memakukan
   bahwa setiap neraca saldo benar-benar menutup ke nol.

   Konvensi tanda mengikuti WTB ENG-2025-014: aset positif, kontra-aset negatif,
   liabilitas & ekuitas & pendapatan negatif, beban positif. Rupiah penuh.
   ============================================================ */

type Spec = [group: string, code: string, name: string, ly: number, unadj: number, aje: number, lead: string];

export interface EngWtbRow {
  key: string; group: string; code: string; name: string;
  ly: number; unadj: number; aje: number; adj: number; lead: string;
}

/* Bangun baris WTB dari spesifikasi, lalu SISIPKAN saldo laba sebagai penyeimbang
   agar Σ ly = 0 dan Σ unadj = 0. Kolom `aje` tidak ikut diseimbangkan: jurnal
   penyesuaian memang berpasangan sendiri (debit = kredit) di dalam registernya. */
function build(spec: Spec[]): EngWtbRow[] {
  const sum = (i: 3 | 4) => spec.reduce((s, r) => s + (r[i] as number), 0);
  const retained: Spec = ['Ekuitas', '3-2100', 'Saldo Laba', -sum(3), -sum(4), 0, 'K'];
  /* disisipkan tepat setelah Modal Saham agar urutan penyajian tetap wajar */
  const at = spec.findIndex(r => r[1] === '3-1100');
  const rows = at >= 0 ? [...spec.slice(0, at + 1), retained, ...spec.slice(at + 1)] : [...spec, retained];
  return rows.map((r, i) => ({
    key: 'wtb' + i, group: r[0], code: r[1], name: r[2],
    ly: r[3], unadj: r[4], aje: r[5], adj: r[4] + r[5], lead: r[6],
  }));
}

const M = 1_000_000;

/* ---- ENG-2025-040 · PT Mandiri Sejahtera Finance — Multifinance (PSAK 71) ----
   Tak ada persediaan & tak ada beban pokok penjualan: pendapatan berasal dari bunga
   pembiayaan, dan biaya risiko kredit muncul sebagai beban CKPN tersendiri. */
const ENG_040: Spec[] = [
  ['Aset Lancar', '1-1100', 'Kas dan Setara Kas', 41_200 * M, 38_640 * M, 0, 'A'],
  ['Aset Lancar', '1-1150', 'Piutang Pembiayaan Konsumen', 612_400 * M, 704_180 * M, 0, 'B'],
  ['Aset Lancar', '1-1160', 'Piutang Sewa Pembiayaan', 148_900 * M, 171_320 * M, 0, 'B'],
  ['Aset Lancar', '1-1210', 'Cadangan Kerugian Penurunan Nilai', -22_800 * M, -26_450 * M, 0, 'B'],
  ['Aset Lancar', '1-1400', 'Pajak Dibayar di Muka', 6_310 * M, 7_040 * M, 0, 'D'],
  ['Aset Lancar', '1-1500', 'Biaya Dibayar di Muka', 3_120 * M, 3_580 * M, 0, 'D'],
  ['Aset Tidak Lancar', '1-2100', 'Aset Tetap — Harga Perolehan', 46_800 * M, 51_200 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2110', 'Akumulasi Penyusutan', -18_400 * M, -22_100 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2500', 'Aset Pajak Tangguhan', 9_240 * M, 10_880 * M, 0, 'G'],
  ['Liabilitas Jk. Pendek', '2-1200', 'Utang Bank Jangka Pendek', -218_000 * M, -246_500 * M, 0, 'BB'],
  ['Liabilitas Jk. Pendek', '2-1300', 'Beban Akrual', -12_400 * M, -14_980 * M, 0, 'CC'],
  ['Liabilitas Jk. Pendek', '2-1400', 'Utang Pajak', -8_900 * M, -10_420 * M, 0, 'DD'],
  ['Liabilitas Jk. Pendek', '2-1600', 'Surat Berharga Diterbitkan — Jk. Pendek', -96_000 * M, -118_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Panjang', '2-2100', 'Utang Bank Jangka Panjang', -284_000 * M, -312_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Panjang', '2-2300', 'Liabilitas Imbalan Kerja', -21_600 * M, -24_900 * M, 0, 'H'],
  ['Ekuitas', '3-1100', 'Modal Saham', -120_000 * M, -120_000 * M, 0, 'K'],
  ['Pendapatan', '4-1200', 'Pendapatan Bunga Pembiayaan', -142_800 * M, -168_400 * M, 0, 'R'],
  ['Pendapatan', '4-1300', 'Pendapatan Administrasi & Provisi', -18_600 * M, -22_140 * M, 0, 'R'],
  ['Beban', '5-2100', 'Beban Penjualan & Pemasaran', 21_400 * M, 25_880 * M, 0, 'T'],
  ['Beban', '5-3100', 'Beban Umum & Administrasi', 38_900 * M, 44_620 * M, 0, 'U'],
  ['Beban', '5-3200', 'Beban Cadangan Kerugian Penurunan Nilai', 16_200 * M, 21_450 * M, 0, 'B'],
  ['Beban', '5-4100', 'Beban Bunga & Keuangan', 62_400 * M, 74_180 * M, 0, 'V'],
  ['Beban', '5-5100', 'Beban Pajak Penghasilan', 8_640 * M, 10_120 * M, 0, 'W'],
];

/* ---- ENG-2025-031 · PT Bumi Hijau Agrindo — Perkebunan (PSAK 73 · tanaman produktif) ---- */
const ENG_031: Spec[] = [
  ['Aset Lancar', '1-1100', 'Kas dan Setara Kas', 12_400 * M, 9_880 * M, 0, 'A'],
  ['Aset Lancar', '1-1200', 'Piutang Usaha — Pihak Ketiga', 28_600 * M, 34_120 * M, 0, 'B'],
  ['Aset Lancar', '1-1210', 'Cadangan Kerugian Penurunan Nilai', -1_240 * M, -1_680 * M, 0, 'B'],
  ['Aset Lancar', '1-1300', 'Persediaan — CPO, Pupuk & Suku Cadang', 31_800 * M, 38_940 * M, 0, 'C'],
  ['Aset Lancar', '1-1400', 'Pajak Dibayar di Muka', 4_120 * M, 5_260 * M, 0, 'D'],
  ['Aset Tidak Lancar', '1-2200', 'Tanaman Produktif — Harga Perolehan', 214_000 * M, 238_500 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2210', 'Akumulasi Penyusutan Tanaman Produktif', -62_400 * M, -74_800 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2100', 'Aset Tetap — Harga Perolehan', 96_200 * M, 108_400 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2110', 'Akumulasi Penyusutan', -34_800 * M, -41_600 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2300', 'Aset Hak-Guna (PSAK 73)', 18_600 * M, 22_400 * M, 0, 'F'],
  ['Aset Tidak Lancar', '1-2500', 'Aset Pajak Tangguhan', 5_880 * M, 6_940 * M, 0, 'G'],
  ['Liabilitas Jk. Pendek', '2-1100', 'Utang Usaha', -22_400 * M, -27_180 * M, 0, 'AA'],
  ['Liabilitas Jk. Pendek', '2-1200', 'Utang Bank Jangka Pendek', -38_000 * M, -44_500 * M, 0, 'BB'],
  ['Liabilitas Jk. Pendek', '2-1300', 'Beban Akrual', -6_240 * M, -7_880 * M, 0, 'CC'],
  ['Liabilitas Jk. Pendek', '2-1400', 'Utang Pajak', -3_180 * M, -4_020 * M, 0, 'DD'],
  ['Liabilitas Jk. Pendek', '2-1500', 'Liabilitas Sewa — Jk. Pendek', -4_800 * M, -5_600 * M, 0, 'F'],
  ['Liabilitas Jk. Panjang', '2-2100', 'Utang Bank Jangka Panjang', -84_000 * M, -96_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Panjang', '2-2200', 'Liabilitas Sewa — Jk. Panjang', -14_200 * M, -17_400 * M, 0, 'F'],
  ['Liabilitas Jk. Panjang', '2-2300', 'Liabilitas Imbalan Kerja', -18_600 * M, -21_800 * M, 0, 'H'],
  ['Ekuitas', '3-1100', 'Modal Saham', -80_000 * M, -80_000 * M, 0, 'K'],
  ['Pendapatan', '4-1100', 'Penjualan Bersih — CPO & Inti Sawit', -186_400 * M, -214_800 * M, 0, 'R'],
  ['Beban', '5-1100', 'Beban Pokok Penjualan', 128_600 * M, 149_200 * M, 0, 'S'],
  ['Beban', '5-2100', 'Beban Penjualan', 9_840 * M, 11_620 * M, 0, 'T'],
  ['Beban', '5-3100', 'Beban Umum & Administrasi', 18_200 * M, 21_400 * M, 0, 'U'],
  ['Beban', '5-4100', 'Beban Keuangan', 11_600 * M, 13_880 * M, 0, 'V'],
  ['Beban', '5-5100', 'Beban Pajak Penghasilan', 3_940 * M, 4_620 * M, 0, 'W'],
];

/* ---- ENG-2025-063 · PT Graha Properti Investama — Properti & Real Estate ---- */
const ENG_063: Spec[] = [
  ['Aset Lancar', '1-1100', 'Kas dan Setara Kas', 22_800 * M, 26_400 * M, 0, 'A'],
  ['Aset Lancar', '1-1200', 'Piutang Usaha — Pihak Ketiga', 34_200 * M, 41_600 * M, 0, 'B'],
  ['Aset Lancar', '1-1210', 'Cadangan Kerugian Penurunan Nilai', -1_800 * M, -2_460 * M, 0, 'B'],
  ['Aset Lancar', '1-1310', 'Persediaan Real Estat — Tanah & Bangunan Siap Jual', 186_400 * M, 208_900 * M, 0, 'C'],
  ['Aset Lancar', '1-1400', 'Pajak Dibayar di Muka', 7_240 * M, 8_620 * M, 0, 'D'],
  ['Aset Tidak Lancar', '1-2600', 'Properti Investasi', 248_000 * M, 272_400 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2100', 'Aset Tetap — Harga Perolehan', 62_400 * M, 68_800 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2110', 'Akumulasi Penyusutan', -21_600 * M, -26_400 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2500', 'Aset Pajak Tangguhan', 6_420 * M, 7_180 * M, 0, 'G'],
  ['Liabilitas Jk. Pendek', '2-1100', 'Utang Usaha', -28_600 * M, -33_400 * M, 0, 'AA'],
  ['Liabilitas Jk. Pendek', '2-1700', 'Uang Muka Pelanggan', -74_200 * M, -92_600 * M, 0, 'CC'],
  ['Liabilitas Jk. Pendek', '2-1200', 'Utang Bank Jangka Pendek', -46_000 * M, -52_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Pendek', '2-1400', 'Utang Pajak', -6_840 * M, -8_120 * M, 0, 'DD'],
  ['Liabilitas Jk. Panjang', '2-2100', 'Utang Bank Jangka Panjang', -168_000 * M, -184_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Panjang', '2-2300', 'Liabilitas Imbalan Kerja', -12_400 * M, -14_600 * M, 0, 'H'],
  ['Ekuitas', '3-1100', 'Modal Saham', -150_000 * M, -150_000 * M, 0, 'K'],
  ['Pendapatan', '4-1400', 'Pendapatan Penjualan Real Estat', -142_600 * M, -168_400 * M, 0, 'R'],
  ['Pendapatan', '4-1500', 'Pendapatan Sewa Properti Investasi', -28_400 * M, -32_200 * M, 0, 'R'],
  ['Beban', '5-1200', 'Beban Pokok Penjualan Real Estat', 96_800 * M, 114_600 * M, 0, 'S'],
  ['Beban', '5-2100', 'Beban Penjualan', 12_400 * M, 14_800 * M, 0, 'T'],
  ['Beban', '5-3100', 'Beban Umum & Administrasi', 22_600 * M, 26_400 * M, 0, 'U'],
  ['Beban', '5-4100', 'Beban Keuangan', 18_200 * M, 21_400 * M, 0, 'V'],
  ['Beban', '5-5100', 'Beban Pajak Penghasilan', 4_820 * M, 5_640 * M, 0, 'W'],
];

/* ---- ENG-2025-022 · PT Cahaya Logistik Nusantara — Transportasi (Review SPR 2400) ---- */
const ENG_022: Spec[] = [
  ['Aset Lancar', '1-1100', 'Kas dan Setara Kas', 8_640 * M, 10_280 * M, 0, 'A'],
  ['Aset Lancar', '1-1200', 'Piutang Usaha — Pihak Ketiga', 22_400 * M, 26_800 * M, 0, 'B'],
  ['Aset Lancar', '1-1210', 'Cadangan Kerugian Penurunan Nilai', -980 * M, -1_340 * M, 0, 'B'],
  ['Aset Lancar', '1-1320', 'Persediaan Bahan Bakar & Suku Cadang', 4_820 * M, 5_640 * M, 0, 'C'],
  ['Aset Lancar', '1-1400', 'Pajak Dibayar di Muka', 2_140 * M, 2_680 * M, 0, 'D'],
  ['Aset Tidak Lancar', '1-2100', 'Aset Tetap — Armada & Peralatan', 128_400 * M, 146_200 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2110', 'Akumulasi Penyusutan', -52_600 * M, -64_800 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2300', 'Aset Hak-Guna (PSAK 73)', 24_800 * M, 28_600 * M, 0, 'F'],
  ['Aset Tidak Lancar', '1-2500', 'Aset Pajak Tangguhan', 3_240 * M, 3_880 * M, 0, 'G'],
  ['Liabilitas Jk. Pendek', '2-1100', 'Utang Usaha', -14_200 * M, -17_400 * M, 0, 'AA'],
  /* Utang bank ditekan (bukan modal dinaikkan): dalam neraca saldo yang BELUM ditutup,
     total ekuitas sudah terpaku oleh aset, liabilitas & laba-rugi — menaikkan modal hanya
     memindahkan angka ke saldo laba dan justru memperbesar defisitnya. Dengan utang lama,
     ekuitas jatuh ke ~13 M atas aset ~158 M (DER ~11×): entitas nyaris gagal, padahal seed
     menandai klien ini berisiko MEDIUM. Neraca saldo yang seimbang tetapi membantah label
     risikonya sendiri hanya memindahkan ketidakkonsistenan ke tempat lain. */
  ['Liabilitas Jk. Pendek', '2-1200', 'Utang Bank Jangka Pendek', -10_000 * M, -12_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Pendek', '2-1300', 'Beban Akrual', -3_840 * M, -4_620 * M, 0, 'CC'],
  ['Liabilitas Jk. Pendek', '2-1400', 'Utang Pajak', -1_920 * M, -2_380 * M, 0, 'DD'],
  ['Liabilitas Jk. Pendek', '2-1500', 'Liabilitas Sewa — Jk. Pendek', -6_400 * M, -7_200 * M, 0, 'F'],
  ['Liabilitas Jk. Panjang', '2-2100', 'Utang Bank Jangka Panjang', -18_000 * M, -20_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Panjang', '2-2200', 'Liabilitas Sewa — Jk. Panjang', -18_600 * M, -21_800 * M, 0, 'F'],
  ['Liabilitas Jk. Panjang', '2-2300', 'Liabilitas Imbalan Kerja', -8_240 * M, -9_680 * M, 0, 'H'],
  ['Ekuitas', '3-1100', 'Modal Saham', -40_000 * M, -40_000 * M, 0, 'K'],
  ['Pendapatan', '4-1600', 'Pendapatan Jasa Angkutan & Pergudangan', -118_400 * M, -136_800 * M, 0, 'R'],
  ['Beban', '5-1300', 'Beban Langsung Operasional', 82_600 * M, 96_400 * M, 0, 'S'],
  ['Beban', '5-3100', 'Beban Umum & Administrasi', 14_800 * M, 17_200 * M, 0, 'U'],
  ['Beban', '5-4100', 'Beban Keuangan', 7_240 * M, 8_620 * M, 0, 'V'],
  ['Beban', '5-5100', 'Beban Pajak Penghasilan', 2_180 * M, 2_540 * M, 0, 'W'],
];

/* ---- ENG-2025-058 · PT Samudra Pangan Lestari — Manufaktur F&B (Arsip) ---- */
const ENG_058: Spec[] = [
  ['Aset Lancar', '1-1100', 'Kas dan Setara Kas', 6_820 * M, 8_140 * M, 0, 'A'],
  ['Aset Lancar', '1-1200', 'Piutang Usaha — Pihak Ketiga', 18_600 * M, 21_400 * M, 0, 'B'],
  ['Aset Lancar', '1-1210', 'Cadangan Kerugian Penurunan Nilai', -820 * M, -1_060 * M, 0, 'B'],
  ['Aset Lancar', '1-1300', 'Persediaan', 24_200 * M, 28_800 * M, 0, 'C'],
  ['Aset Lancar', '1-1400', 'Pajak Dibayar di Muka', 1_840 * M, 2_240 * M, 0, 'D'],
  ['Aset Tidak Lancar', '1-2100', 'Aset Tetap — Harga Perolehan', 68_400 * M, 74_200 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2110', 'Akumulasi Penyusutan', -26_800 * M, -31_600 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2500', 'Aset Pajak Tangguhan', 2_140 * M, 2_480 * M, 0, 'G'],
  ['Liabilitas Jk. Pendek', '2-1100', 'Utang Usaha', -16_400 * M, -19_200 * M, 0, 'AA'],
  ['Liabilitas Jk. Pendek', '2-1200', 'Utang Bank Jangka Pendek', -12_000 * M, -14_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Pendek', '2-1300', 'Beban Akrual', -2_680 * M, -3_240 * M, 0, 'CC'],
  ['Liabilitas Jk. Pendek', '2-1400', 'Utang Pajak', -1_420 * M, -1_780 * M, 0, 'DD'],
  /* Klien berisiko RENDAH pada seed — utangnya ditekan agar ekuitas tak tampil tipis. */
  ['Liabilitas Jk. Panjang', '2-2100', 'Utang Bank Jangka Panjang', -14_000 * M, -16_000 * M, 0, 'BB'],
  ['Liabilitas Jk. Panjang', '2-2300', 'Liabilitas Imbalan Kerja', -5_640 * M, -6_480 * M, 0, 'H'],
  ['Ekuitas', '3-1100', 'Modal Saham', -30_000 * M, -30_000 * M, 0, 'K'],
  ['Pendapatan', '4-1100', 'Penjualan Bersih', -98_400 * M, -112_600 * M, 0, 'R'],
  ['Beban', '5-1100', 'Beban Pokok Penjualan', 68_200 * M, 78_400 * M, 0, 'S'],
  ['Beban', '5-2100', 'Beban Penjualan', 8_240 * M, 9_620 * M, 0, 'T'],
  ['Beban', '5-3100', 'Beban Umum & Administrasi', 11_400 * M, 13_200 * M, 0, 'U'],
  ['Beban', '5-4100', 'Beban Keuangan', 3_180 * M, 3_640 * M, 0, 'V'],
  ['Beban', '5-5100', 'Beban Pajak Penghasilan', 1_620 * M, 1_880 * M, 0, 'W'],
];

/* ---- ENG-2025-047 · PT Teknologi Andalan Digital — SaaS (AUP · SJAH 3000) ----
   Pendapatan diterima di muka & aset takberwujud yang dikembangkan sendiri adalah
   ciri modelnya; tak ada persediaan maupun beban pokok penjualan barang. */
const ENG_047: Spec[] = [
  ['Aset Lancar', '1-1100', 'Kas dan Setara Kas', 14_200 * M, 18_640 * M, 0, 'A'],
  ['Aset Lancar', '1-1200', 'Piutang Usaha — Pihak Ketiga', 8_400 * M, 11_280 * M, 0, 'B'],
  ['Aset Lancar', '1-1210', 'Cadangan Kerugian Penurunan Nilai', -420 * M, -640 * M, 0, 'B'],
  ['Aset Lancar', '1-1500', 'Biaya Dibayar di Muka', 1_240 * M, 1_680 * M, 0, 'D'],
  ['Aset Tidak Lancar', '1-2400', 'Aset Takberwujud — Perangkat Lunak Dikembangkan', 22_600 * M, 29_400 * M, 0, 'EI'],
  ['Aset Tidak Lancar', '1-2410', 'Akumulasi Amortisasi', -8_200 * M, -12_400 * M, 0, 'EI'],
  ['Aset Tidak Lancar', '1-2100', 'Aset Tetap — Harga Perolehan', 6_800 * M, 8_240 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2110', 'Akumulasi Penyusutan', -2_400 * M, -3_180 * M, 0, 'E'],
  ['Aset Tidak Lancar', '1-2300', 'Aset Hak-Guna (PSAK 73)', 4_200 * M, 5_640 * M, 0, 'F'],
  ['Liabilitas Jk. Pendek', '2-1100', 'Utang Usaha', -3_240 * M, -4_180 * M, 0, 'AA'],
  ['Liabilitas Jk. Pendek', '2-1800', 'Pendapatan Diterima di Muka — Langganan', -12_400 * M, -17_800 * M, 0, 'CC'],
  ['Liabilitas Jk. Pendek', '2-1300', 'Beban Akrual', -1_840 * M, -2_420 * M, 0, 'CC'],
  ['Liabilitas Jk. Pendek', '2-1400', 'Utang Pajak', -680 * M, -940 * M, 0, 'DD'],
  ['Liabilitas Jk. Pendek', '2-1500', 'Liabilitas Sewa — Jk. Pendek', -1_400 * M, -1_820 * M, 0, 'F'],
  ['Liabilitas Jk. Panjang', '2-2200', 'Liabilitas Sewa — Jk. Panjang', -2_900 * M, -3_960 * M, 0, 'F'],
  ['Liabilitas Jk. Panjang', '2-2300', 'Liabilitas Imbalan Kerja', -2_180 * M, -2_840 * M, 0, 'H'],
  ['Ekuitas', '3-1100', 'Modal Saham', -20_000 * M, -20_000 * M, 0, 'K'],
  ['Pendapatan', '4-1700', 'Pendapatan Langganan Perangkat Lunak', -32_400 * M, -44_800 * M, 0, 'R'],
  ['Beban', '5-1400', 'Beban Infrastruktur & Hosting', 8_620 * M, 11_400 * M, 0, 'S'],
  ['Beban', '5-1500', 'Beban Riset & Pengembangan', 9_240 * M, 12_800 * M, 0, 'S'],
  ['Beban', '5-3100', 'Beban Umum & Administrasi', 7_400 * M, 9_680 * M, 0, 'U'],
  ['Beban', '5-4100', 'Beban Keuangan', 620 * M, 840 * M, 0, 'V'],
  ['Beban', '5-5100', 'Beban Pajak Penghasilan', 1_240 * M, 1_720 * M, 0, 'W'],
];

/** Neraca saldo per perikatan SELAIN ENG-2025-014 (yang tetap tinggal di data_part1). */
export const WTB_BY_ENGAGEMENT: Record<string, EngWtbRow[]> = {
  'ENG-2025-040': build(ENG_040),
  'ENG-2025-031': build(ENG_031),
  'ENG-2025-063': build(ENG_063),
  'ENG-2025-022': build(ENG_022),
  'ENG-2025-058': build(ENG_058),
  'ENG-2025-047': build(ENG_047),
};
