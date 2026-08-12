# PRD — Skala Tipografi (5 langkah teks + tier display, lantai 11px)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-25 |
| Pemilik | Ari Widodo |
| Status | **Draft** — menunggu sign-off |
| Engagement ID terkait | — (perubahan produk lintas-modul) |

---

## 1. Problem

Evaluasi desain terukur (2026-07-25) menempatkan ini sebagai **temuan berdampak tertinggi terhadap kenyamanan mata** — dan satu-satunya dari enam temuan yang belum dikerjakan (lima lainnya tuntas di PR #127).

Inventaris seluruh basis kode:

| Sumber | Deklarasi | Nilai berbeda |
|---|---:|---:|
| CSS `font-size` | 218 | 19 |
| JSX inline `fontSize` | 2.599 | 34 |
| **Total** | **2.817** | **39** (gabungan) |

**Tidak ada skala.** 39 ukuran berbeda untuk satu aplikasi. Sebaran aktualnya:

```
 7    1  |  10.5   73  ██████       |  15     73  ██████
 7.5  1  |  11    174  ██████████████ | 15.5    2
 8   14  |  11.5  465  ████████████████████████████████████
 8.5 20  |  12    666  ██████████████████████████████████████████████████
 9   39  |  12.3    6                 | 16     33
 9.5 69  |  12.5  562  ███████████████████████████████████████████
10   61  |  13    229  ████████████████ | 17     29 · 18 44 · 19 29
13.5 25 · 14 87 · 14.5  9              | 20-46  103
```

Tiga masalah konkret:

1. **Setengah-langkah tak membawa informasi.** `11,5` (465) · `12,5` (562) · `13,5` (25) · `14,5` (9) · `12,3` (6) = **1.067 deklarasi**. Mata tidak dapat membaca selisih 0,5px sebagai *hierarki* — yang terbaca hanya ketidakteraturan. Biaya kognitif dibayar tanpa imbalan informasi.
2. **279 deklarasi di bawah 11px** (7 s.d. 10,5). Pada Beranda **72% simpul teks ≤11px**, di WTB 48%. Ini penyebab utama "capek dilihat" — bukan kontras (kontras sudah tuntas di PR #127).
3. **Tiga nilai memikul 63% beban** (11,5 · 12 · 12,5 = 1.673 dari 2.817) padahal ketiganya secara visual nyaris sama. Sisanya ekor panjang 36 nilai.

Konsekuensi lanjutan: setiap modul baru menebak ukurannya sendiri karena tak ada rujukan, sehingga ekor panjang terus bertambah.

---

## 2. Objective

Menetapkan **skala tipografi tunggal yang mengikat**, menaikkan lantai keterbacaan ke 11px, dan memigrasi 2.817 deklarasi ke skala itu — sehingga hierarki dibawa oleh langkah yang benar-benar terlihat, dan modul baru punya rujukan alih-alih menebak.

Objective ini benar karena: (a) ini temuan berdampak-mata tertinggi yang tersisa; (b) tanpa skala yang **ditulis dan ditegakkan**, migrasi sekali-jalan akan tergerus kembali oleh modul berikutnya; (c) perubahannya murni presentasi — nol sentuhan pada `AMS_CANON`, data, atau logika.

**Bukan** objective: redesign tata letak, mengubah bobot huruf, atau menyentuh warna (sudah selesai di PR #127).

---

## 3. Success Criteria

1. **Nilai `font-size`/`fontSize` yang dipakai hanya berasal dari skala** (§4.1). Diukur dengan skrip inventaris yang sama: nilai di luar skala = **0**, kecuali pengecualian terdaftar di §5.
2. **Lantai 11px**: nol deklarasi < 11px (kecuali pengecualian terdaftar).
3. **Setengah-langkah punah**: nol deklarasi pada 11,5 · 12,3 · 12,5 · 13,5 · 14,5 · 15,5.
4. **Nol overflow/terpotong** akibat pembesaran: diverifikasi pada 6 permukaan padat yang paling berisiko (§10 M4) di dua lebar viewport (1280 & 1024).
5. **Kontras tidak mundur**: sapuan WCAG 3 modul × 2 tema tetap **0 pelanggaran** (ambang AA berubah mengikuti ukuran — teks yang naik ke ≥14px bold berpindah ke ambang 3:1, jadi harus diukur ulang, bukan diasumsikan).
6. **Gerbang hijau**: `typecheck` 0 · `lint` 0 · `test` 565/565 tanpa perubahan snapshot canon · `build` sukses.
7. **Nol perubahan** pada `AMS_CANON`, angka, struktur DOM, atau logika komponen. Diff terbatas pada nilai ukuran huruf + berkas token.
8. **Rujukan tertulis** ada di `CLAUDE.md` sehingga modul baru tak menebak lagi.

---

## 4. Scope

### 4.1 Skala yang diusulkan

**Tier teks — 5 langkah** (sesuai arahan Anda):

| Langkah | px | Peran | Perkiraan volume |
|---|---:|---|---:|
| `xs` | **11** | meta, timestamp, footer, badge, header tabel, label KPI | ~525 |
| `sm` | **12** | isi tabel, tombol, chip, isi padat | ~1.140 |
| `md` | **13** | body / default aplikasi | ~260 |
| `lg` | **15** | judul panel & portlet | ~170 |
| `xl` | **19** | judul halaman | ~100 |

**Tier display — 3 langkah** (angka KPI/hero; **tidak ada** dalam usulan awal saya — lihat §11 OQ-1):

| Langkah | px | Peran | Volume |
|---|---:|---|---:|
| `d1` | **22** | angka KPI (`.stat .s-val` hari ini 22px) | ~60 |
| `d2` | **28** | angka sorot besar | ~20 |
| `d3` | **34** | angka hero/presentasi | ~22 |

Total **8 nilai** menggantikan 39.

### 4.2 Peta migrasi

| Dari | Ke | Deklarasi | Catatan |
|---|---|---:|---|
| 7 · 7,5 · 8 · 8,5 · 9 · 9,5 · 10 · 10,5 | **11** | **279** | Menaikkan lantai. Dampak visual terbesar & risiko overflow terbesar. |
| 11 | 11 | 174 | tetap |
| 11,5 | **12** | 465 | |
| 12 | 12 | 666 | tetap |
| 12,3 · 12,5 | **12** | 568 | ke bawah, bukan ke 13 — menjaga densitas tabel/tombol |
| 13 | 13 | 229 | tetap |
| 13,5 · 14 · 14,5 | **15** | 121 | |
| 15 | 15 | 73 | tetap |
| 15,5 · 16 · 17 | **15** | 64 | |
| 18 · 19 | **19** | 73 | |
| 20 · 21 · 22 · 23 | **22** | ~58 | tier display |
| 24 · 26 · 28 · 30 | **28** | ~28 | tier display |
| 34 · 40 · 46 | **34** | ~17 | tier display |

### 4.3 Lapisan token + rujukan

- Tambahkan `--fs-xs/sm/md/lg/xl` + `--fs-d1/d2/d3` di `:root` (dipakai oleh CSS).
- JSX inline tetap memakai angka literal (2.599 lokasi — memaksa impor konstanta ke 166 berkas view adalah refactor tersendiri, lihat §5).
- Tulis skalanya ke `CLAUDE.md` §5 (Pola & Konvensi) sebagai aturan mengikat.

---

## 5. Non-Scope

- **Mengganti 2.599 angka JSX inline dengan konstanta/token impor.** Nilainya dinormalkan, tetapi tetap literal. Mengubahnya jadi `FS.sm` menuntut impor di 166 berkas — refactor terpisah dengan manfaat marginal atas normalisasi nilai.
- **Bobot huruf, `line-height`, `letter-spacing`.** Hanya ukuran. (Catatan: `line-height` saat ini `normal` di `.dtbl` — perbaikan ritme vertikal adalah PRD tersendiri.)
- **Pengurangan HURUF KAPITAL** (temuan P4, 17% simpul teks) — terpisah, meski bersinggungan di badge/header tabel.
- **Konsolidasi radius** (temuan P6).
- Perubahan warna apa pun (tuntas di PR #127).

**Pengecualian yang tetap boleh di luar skala** (didaftarkan agar SC #1/#2 dapat diuji):
- `#print-area` dan gaya cetak — tunduk pada ukuran kertas, bukan layar.
- `body.dense` boleh menurunkan satu langkah (mis. `.pagehead-title` 19→15) — mode padat memang untuk kepadatan.
- Ikon SVG `font-size` (bila ada) — bukan teks.

---

## 6. Constraints

| Dimensi | Batasan |
|---|---|
| Sistem | Diff hanya nilai ukuran huruf + `styles_base.css` (token) + `CLAUDE.md`. Nol perubahan DOM/logika. |
| Gerbang | typecheck 0 · lint 0 · test 565/565 tanpa perubahan snapshot canon · build sukses. |
| Skala | 2.817 deklarasi di ~170 berkas. Terlalu besar untuk tangan; **wajib terskrip + verifikasi hitungan**. |
| Verifikasi | Pengukuran DOM andal untuk ukuran & kontras, **buta terhadap overflow visual**. Overflow harus diuji lewat pemeriksaan geometri (`scrollWidth > clientWidth`), bukan mata saja. |
| Pelajaran sesi lalu | Browser tertanam bisa menyajikan CSS basi & tak me-recalc; setiap pengukuran WAJIB didahului muat-ulang + paksa recalc, dan temuan CSS diuji-silang ke build produksi. |

---

## 7. Existing Solutions

| Opsi | Penilaian |
|---|---|
| **Normalisasi nilai + token CSS + aturan di CLAUDE.md** | ✅ **Dipilih.** Memakai infrastruktur token yang sudah ada dan terbukti di PR #127. Murah, dapat diverifikasi mesin, tanpa lapisan baru. |
| Utility class tipografi (`.t-sm`, `.t-md`) | ❌ Menuntut menyentuh markup di 166 berkas view untuk manfaat yang sama dengan normalisasi nilai. |
| `clamp()` / skala fluid | ❌ Aplikasi desktop-padat dengan tabel; ukuran fluid justru merusak keterbacaan tabel dan menyulitkan verifikasi. |
| Biarkan | ❌ Ekor panjang akan terus tumbuh; ini satu-satunya temuan evaluasi berdampak-mata yang tersisa. |

---

## 8. Proposed Approach

**Terskrip, bertahap, terverifikasi per tahap.**

1. **Petakan dulu, ganti kemudian.** Skrip inventaris (sudah ada, dipakai di §1) menjadi alat verifikasi: dijalankan sebelum & sesudah tiap tahap; jumlah per nilai harus cocok dengan peta §4.2. Ini menangkap penggantian yang meleset atau berlebih.
2. **Urutan dari risiko terendah ke tertinggi** — setengah-langkah dulu (aman: pergeseran ≤0,5px, tak mungkin memicu overflow), lantai 11px terakhir (paling berisiko).
3. **Uji overflow secara geometris, bukan visual.** Pada permukaan padat, ukur `scrollWidth > clientWidth + 1` dan `offsetHeight` baris tabel. Ini menangkap teks terpotong yang tak akan terlihat dari pengukuran ukuran huruf.
4. **Ambang AA diukur ulang, bukan diasumsikan.** Menaikkan ukuran memindahkan sebagian teks ke ambang "teks besar" (3:1) — sapuan kontras harus diulang penuh.

**Mengapa 12,5 → 12 dan bukan 13:** 12,5 dipakai 562× terutama di kontrol padat (tombol, chip, input, sel tabel). Menaikkannya ke 13 akan menambah tinggi baris di ribuan tempat dan melawan karakter "dense enterprise" aplikasi ini. Menurunkan ke 12 menjaga densitas dan menyatukannya dengan 666 deklarasi 12px yang sudah ada.

---

## 9. Risks

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| **R-1** | **Lantai 11px memicu overflow.** 279 deklarasi naik, sebagian besar teks HURUF KAPITAL ber-`letter-spacing` di chip/badge/header tabel berlebar tetap. 10,5→11 pada teks kapital ≈ +5% lebar. | **Tinggi** — teks terpotong di chip sempit | Uji geometri otomatis (§8.3) pada 6 permukaan padat × 2 lebar viewport. Bila ada yang terpotong: kecualikan kelas itu ke 10,5 dan daftarkan, ATAU kurangi `letter-spacing`-nya (bukan turunkan ukuran). |
| **R-2** | **Aplikasi terasa "membesar" secara keseluruhan** — 1.067 setengah-langkah + 279 sub-11 naik. Kepadatan informasi per layar berkurang. | Sedang-tinggi (perubahan karakter produk) | `body.dense` sudah ada sebagai katup. Bila terasa terlalu longgar, turunkan satu langkah di mode padat — bukan batalkan skala. Reversibel: peta §4.2 dijalankan mundur. |
| **R-3** | **Penggantian terskrip meleset** — `fontSize: 12` juga cocok dengan `fontSize: 12.5` bila regex tak berbatas; template string & nilai terhitung bisa rusak. | **Tinggi** (kerusakan senyap) | Regex berbatas (`\b`/lookahead non-digit), lalu **hitung ulang inventaris** dan cocokkan dengan peta §4.2. Jumlah tak cocok = gagal, bukan lanjut. Gerbang penuh tiap tahap. |
| **R-4** | Ambang AA berubah untuk teks yang menyeberang ke ≥14px bold (3:1) — sebagian yang tadinya lolos bisa jadi gagal, atau sebaliknya tak terdeteksi. | Sedang | SC #5 mewajibkan sapuan kontras diulang penuh, bukan diasumsikan. |
| **R-5** | Tier display (§4.1) belum pernah Anda setujui — ia muncul dari data, bukan dari arahan "5 langkah". | Rendah (tapi mengubah cakupan) | Diangkat sebagai OQ-1. Bila ditolak, 122 deklarasi 20–46px dibiarkan apa adanya dan SC #1 dilonggarkan untuknya. |
| **R-6** | Verifikasi visual manusia dilewati lagi (seperti PR #127), padahal risiko utama di sini justru **overflow visual**. | Sedang-tinggi | Uji geometri otomatis dirancang khusus untuk menutup celah ini — tetapi tidak menggantikan mata untuk "terasa terlalu besar/longgar" (R-2). |

---

## 10. Implementation Plan

Satu PR, empat commit berurutan agar dapat ditinjau & dibatalkan per tahap.

| Milestone | Isi | Verifikasi |
|---|---|---|
| **M1** | Token `--fs-*` di `:root` + tulis skala ke `CLAUDE.md`. Belum ada nilai diubah. | Gerbang hijau; nol perubahan visual |
| **M2** | **Setengah-langkah** → skala (11,5→12 · 12,3/12,5→12 · 13,5/14,5→15 · 15,5→15). 1.067 deklarasi. Risiko terendah. | Inventaris cocok peta; gerbang; sapuan kontras |
| **M3** | **Langkah penuh di luar skala** (14→15 · 16/17→15 · 18→19) + tier display (20–46 → 22/28/34). ~280 deklarasi. | idem + uji geometri |
| **M4** | **Lantai 11px** — 279 deklarasi < 11px → 11. Paling berisiko. | **Uji geometri wajib**: 6 permukaan padat (WTB · Working Papers · Beranda kokpit · Matriks Kepatuhan · My Tasks kanban · sidebar) × viewport 1280 & 1024; `scrollWidth ≤ clientWidth + 1` untuk tiap chip/badge/th |
| **M5** | Sapuan penuh: inventaris = 8 nilai; kontras 3 modul × 2 tema; gerbang lengkap | SC #1–#7 |
| **M6** | **Tinjauan visual Ari** — khusus R-2 ("terasa terlalu besar?") | Persetujuan sebelum merge |

---

## 11. Open Questions

**OQ-1 — Tier display (22/28/34) disetujui?**
Arahan Anda menyebut "5 langkah". Data menunjukkan 122 deklarasi di 20–46px yang bukan teks melainkan angka KPI/hero; skala 5-langkah tidak dapat menampungnya tanpa merusak fungsinya. **Rekomendasi: setujui tier display terpisah.** Alternatif: biarkan 20–46px apa adanya (ekor panjang tetap ada, tapi terbatas pada angka display).

**OQ-2 — 12,5 → 12 (turun) atau 13 (naik)?**
562 deklarasi. Saya merekomendasikan **turun ke 12** demi menjaga densitas (alasan di §8). Naik ke 13 akan terasa lebih lega tetapi mengurangi baris per layar di seluruh tabel — bertentangan dengan karakter "dense enterprise".

**OQ-3 — Bila lantai 11px memicu overflow di badge, mana yang dikorbankan?**
(a) kecualikan badge/header tabel di 10,5 dan daftarkan sebagai pengecualian; (b) pertahankan 11px dan kurangi `letter-spacing` uppercase-nya; (c) pertahankan 11px dan longgarkan padding chip. **Rekomendasi: (b)** — `letter-spacing` pada teks kapital kecil adalah beban baca sekaligus beban lebar; menguranginya menyelesaikan dua hal.

**OQ-4 — Apakah `body.dense` perlu peta turun-satu-langkah?**
Bila R-2 terwujud (aplikasi terasa membesar), mode padat menjadi katupnya. Sebaiknya diputuskan setelah M6, jangan diborong sekarang.

---

**Sign-off:** ditandai dengan balasan **"Proceed."**
