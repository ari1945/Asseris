# PRD — Quick-Win Desain Visual (kontras token · de-noise kontainer · merah bermakna-ganda)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-25 |
| Pemilik | Ari Widodo |
| Status | Draft — menunggu sign-off |
| Engagement ID terkait | — (perubahan produk lintas-modul) |

---

## 1. Problem

Evaluasi desain terukur (2026-07-25) atas dua halaman representatif — Beranda (170 simpul teks, padat portlet) dan Working Trial Balance (314 simpul teks, padat tabel) — plus analisis seluruh lapisan token menemukan **tiga cacat visual yang independen dari tata letak**, semuanya berakar di lapisan token/CSS bersama, bukan di modul.

### 1.1 Kontras: 4 pasangan gagal AA di tema terang, 7 gagal di tema gelap

Palet inti Asseris kuat — `--ink`/putih 15,94:1, `--navy` 14,66:1, `--blue` 8,45:1, `--ink-2` 9,17:1. Masalahnya di ujung-ujung ramp dan di tema gelap.

**Tema terang** (latar `--surface` #ffffff / canvas `--bg` #f0f2f5):

| Pasangan | Nilai | Rasio | Ambang AA | Status |
|---|---|---:|---:|---|
| `--ink-4` / surface | #8a97a1 | **2,99** | 4,5 | ❌ gagal bahkan utk teks besar (3,0) |
| `--ink-4` / canvas | #8a97a1 | **2,67** | 4,5 | ❌ gagal |
| `--amber` / `--amber-bg` (badge) | #9a6a00 | **4,19** | 4,5 | ❌ gagal |
| `--ink-3` / `--surface-3` (badge abu) | #61717c | **4,45** | 4,5 | ❌ gagal marginal |

`--ink-4` dipakai **575 kali di 142 file** — untuk teks (`.mt-kv label`, `.mt-col-empty`, `.mt-sub-text.done`) maupun ikon (`.portlet-h .grip`, `.mt-star`). Ini "abu-abu tak terbaca" yang paling luas dampaknya.

**Tema gelap** (`body.dark`, fitur terkirim & bisa di-toggle user — [shell.tsx:484](migration/src/shell.tsx:484) "Mode Gelap", persist `ams.dark`):

| Pasangan badge | Rasio sekarang | Status |
|---|---:|---|
| `--blue` / `--blue-100` | **1,62** | ❌ nyaris tak terlihat |
| `--purple` / `--purple-bg` | **2,22** | ❌ |
| `--teal` / `--teal-bg` | **2,59** | ❌ |
| `--red` / `--red-bg` | **2,64** | ❌ |
| `--green` / `--green-bg` | **3,06** | ❌ |
| `--amber` / `--amber-bg` | **3,32** | ❌ |
| `--ink-4` / `--surface` | **3,59** | ❌ |

**Akar masalah tema gelap bersifat struktural, bukan kebetulan:** blok `body.dark` ([styles_base.css:70](migration/src/styles_base.css:70)) menimpa seluruh **latar** (`--*-bg`, `--surface*`, `--blue-100`) tetapi **tidak menimpa satu pun warna depan semantik** (`--green` `--amber` `--red` `--purple` `--teal` `--blue`). Warna depan tema terang dipasangkan dengan latar tema gelap → seluruh badge runtuh. Ini bukan enam bug terpisah; ini satu kelalaian sistematis.

### 1.2 Kemasan berlapis: tiga pembatas pada setiap kontainer

`.panel` dan `.portlet` masing-masing memakai **border + `box-shadow` + header ber-`border-bottom`**, dan `.portlet-h` menambah **gradient** `linear-gradient(180deg,#fbfcfd,#eef1f4)` — hex hardcode di luar sistem token.

Garis pemisahnya sendiri sangat lemah: `--line` 1,39:1, `--line-soft` 1,22:1. Hasilnya banyak pembatas samar yang saling menumpuk — "kotak di dalam kotak" — yaitu noise tanpa struktur. Pada halaman padat-portlet seperti Beranda, efeknya berlipat sejumlah portlet.

### 1.3 `--red` bermakna ganda: angka negatif vs alarm

Di WTB, `--red` #b3261e muncul **63 kali dalam satu layar** — seluruhnya kelas `.neg`, yaitu angka negatif. Itu konvensi akuntansi yang benar. Tetapi merah itu **identik** dengan merah eksepsi / risiko tinggi / terlambat (`.mt-due.over`, `.mt-row.p-high`, badge merah).

Konsekuensi: neraca saldo yang sepenuhnya normal terbaca sebagai "layar penuh masalah", dan sinyal alarm terdilusi justru di modul yang paling membutuhkannya. Angka negatif sudah disandikan kurung `(1.850,0)` — warnanya tidak perlu berteriak.

---

## 2. Objective

Menaikkan kenyamanan visual dan kepatuhan **WCAG 2.1 AA** aplikasi **melalui perubahan lapisan token/CSS saja** — tanpa menyentuh komponen React, struktur DOM, tata letak, atau `AMS_CANON`.

Ini objective yang benar karena:

1. **Leverage.** `--ink-4` dipakai 575×, `--amber` 1230×, `--red` 893×. Satu baris token memperbaiki ratusan lokasi sekaligus. Alternatif "perbaiki per-modul" berbiaya 100× lebih besar dengan hasil yang lebih tidak konsisten.
2. **Risiko rendah, dapat diverifikasi mesin.** Kontras adalah kriteria objektif; keberhasilan diukur skrip, bukan opini.
3. **Tidak mendahului keputusan mahal.** Skala tipografi (temuan P1, ~500 lokasi) sengaja **dikeluarkan** — itu keputusan produk terpisah yang butuh evaluasi visual lebih dulu.

**Bukan** tujuan: redesign, penyegaran visual, atau perubahan identitas merek. Navy + Oracle Blue dipertahankan utuh.

---

## 3. Success Criteria

Terukur, diverifikasi dengan skrip pengukur yang sama seperti pada evaluasi (perhitungan rasio WCAG atas `getComputedStyle`):

1. **Kontras — tema terang:** seluruh pasangan token yang dipakai untuk **teks** mencapai ≥ 4,5:1 pada latar yang benar-benar dipakainya (`--surface`, `--surface-2`, `--surface-3`, `--bg`, dan latar badge masing-masing). Nol kegagalan.
2. **Kontras — tema gelap:** keenam badge `.b-*` dan `--ink-4` mencapai ≥ 4,5:1. Nol kegagalan.
3. **Hierarki ink tetap terbaca:** empat tingkat `ink` → `ink-2` → `ink-3` → `ink-4` mempertahankan jarak rasio yang dapat dibedakan (target: ≥ 1,3× antar tingkat berurutan). Kriteria ini mencegah "perbaikan" yang meruntuhkan dua tingkat menjadi satu.
4. **Pemisahan merah:** pada WTB, jumlah simpul teks berwarna `--red` turun dari **63 → 0** (angka negatif pindah ke `--num-neg`); simpul `--red` yang tersisa hanya yang berstatus alarm nyata.
5. **De-noise kontainer:** `.panel` dan `.portlet` memakai **satu** bahasa pemisah (border). `box-shadow` pada kontainer statis = 0; bayangan hanya tersisa pada elemen melayang (menu, drawer, modal, kartu draggable).
6. **Gerbang hijau:** `npm run typecheck` = 0 error · `npm run lint` = 0 · `npm run build` sukses · `npm test` lulus **tanpa perubahan snapshot canon**.
7. **Nol regresi fungsional:** tanpa perubahan pada `AMS_CANON`, data numerik, struktur DOM, atau perilaku komponen. Diff terbatas pada berkas `styles_*.css` (+ `minimap.tsx` bila token tersuntik di sana).
8. **Verifikasi live** pada minimal 3 modul (Beranda, WTB, satu modul kertas kerja) × 2 tema.

---

## 4. Scope

### Fase 1 — Ramp ink tema terang (memperbaiki 1.1 sekaligus menjaga hierarki)

Menggelapkan `--ink-4` saja ke ambang 4,5 akan membuatnya **nyaris identik** dengan `--ink-3` (4,55 vs 5,05) — dua tingkat runtuh jadi satu. Karena itu ramp ditata ulang, bukan ditambal:

| Token | Sekarang | Rasio (putih) | Usul | Rasio baru (putih) | Rasio (canvas) |
|---|---|---:|---|---:|---:|
| `--ink` | #12242e | 15,94 | *tetap* | 15,94 | — |
| `--ink-2` | #3a4a55 | 9,17 | *tetap* | 9,17 | — |
| `--ink-3` | #61717c | 5,05 | **#515f68** | 6,59 | 5,88 |
| `--ink-4` | #8a97a1 | **2,99** | **#667077** | 4,90 | 4,52 |

Tangga hasil: **15,9 → 9,2 → 6,6 → 4,9** (rasio antar-tingkat 1,73× · 1,39× · 1,35×) — memenuhi Success Criteria #3.

Efek samping menguntungkan: badge abu (`--ink-3` pada `--surface-3`) ikut naik 4,45 → **5,9**, jadi tidak butuh perbaikan terpisah.

### Fase 2 — Amber tema terang

| Token | Sekarang | Rasio pd `--amber-bg` | Usul | Rasio baru |
|---|---|---:|---|---:|
| `--amber` | #9a6a00 | **4,19** | **#926500** | 4,55 |

Catatan: `--amber` lolos di latar putih (4,73) tetapi gagal di latar badge-nya sendiri, jadi perbaikan bersifat wajib, bukan opsional.

### Fase 3 — Pisahkan angka negatif dari alarm

Token baru + satu aturan:

```css
:root {
  --num-neg: #8c3a34;   /* angka negatif — redup, desaturasi */
}
.neg { color: var(--num-neg); }   /* dulu: var(--red) */
```

`--red` tidak berubah dan tetap eksklusif untuk alarm.

**Mengapa aman:** `.neg` diterapkan lewat satu pola konsisten di seluruh basis kode — `className={n < 0 ? 'neg' : ''}` — sepenuhnya terpisah dari 893 pemakaian `var(--red)` untuk status. Tidak ada pemanggil yang perlu diubah.

### Fase 4 — De-noise kontainer

| Sasaran | Perubahan |
|---|---|
| `.panel` | hapus `box-shadow: var(--shadow-sm)` |
| `.portlet` | hapus `box-shadow: var(--shadow-sm)` |
| `.portlet-h` | `linear-gradient(180deg,#fbfcfd,#eef1f4)` → `background: var(--surface-2)` (rata, ber-token) |

Border dan `border-bottom` header **dipertahankan** — itu bahasa pemisah yang dipilih.

### Fase 5 — Tema gelap ⚠️ **TAMBAHAN, DITEMUKAN SAAT PENYUSUNAN PRD**

Fase ini **tidak** ada dalam paket yang Anda pilih (prioritas 2+5+3). Ia muncul saat verifikasi Fase 1–2 ke tema gelap. Disajikan sebagai **keputusan terpisah** — lihat §11 OQ-1.

Tema gelap **tidak dapat** diperbaiki dengan mengganti nilai token, karena token semantik merangkap dua peran:

- **Warna depan** pada latar bernuansa — `.b-blue { color: var(--blue) }`
- **Isian solid** — `.btn.primary { background: var(--blue); color:#fff }`, `.side-item.active { background: var(--blue) }`

Mencerahkan `--blue` agar badge terbaca akan merusak tombol primer (teks putih di atas biru muda). Karena itu perbaikannya **memecah peran**, bukan menggeser nilai:

```css
:root {
  --b-green-fg: var(--green);  --b-amber-fg: var(--amber);
  --b-red-fg:   var(--red);    --b-purple-fg: var(--purple);
  --b-teal-fg:  var(--teal);   --b-blue-fg:   var(--blue);
}
body.dark {
  --b-green-fg: #4c9571;  --b-amber-fg: #ab832b;
  --b-red-fg:   #c9655f;  --b-purple-fg: #8c79c1;
  --b-teal-fg:  #4c9399;  --b-blue-fg:   #6b9ab8;
  --ink-4:      #7a858f;   /* 3,59 → 4,54 */
}
.b-green { color: var(--b-green-fg); }   /* dst. untuk keenam kelas */
```

Seluruh nilai usul sudah diverifikasi ≥ 4,5:1 pada latar gelap masing-masing. Dampak: **6 token baru + 7 aturan CSS**, nol perubahan pada tema terang (token baru default-nya menunjuk token lama).

---

## 5. Non-Scope

Dikecualikan secara eksplisit — masing-masing butuh keputusan tersendiri:

- **Skala tipografi** (temuan P1: 9–10 ukuran font per halaman; 72% teks ≤11px di Beranda, 48% di WTB). Dampak terbesar tetapi ~500 lokasi. **PRD terpisah.**
- **Pengurangan HURUF KAPITAL** (temuan P4: 17% simpul teks).
- **Konsolidasi radius** (temuan P6: 8 nilai berbeda dalam satu halaman).
- **Sidebar** — sudah diputuskan putih rata (2026-07-25, terimplementasi). Tidak dibuka kembali.
- **Bayangan pada `.mt-row` / `.mt-card`** — `box-shadow` di sana adalah afordans hover/drag yang bermakna, bukan dekorasi. Dipertahankan.
- Perubahan tata letak, spasi, grid, atau komponen apa pun.
- Perubahan identitas merek / hue dasar (navy, Oracle Blue).

---

## 6. Constraints

| Dimensi | Batasan |
|---|---|
| Sistem | Diff **hanya** berkas `styles_*.css` (+ `minimap.tsx` bila perlu — CSS tersuntik di sana). Nol perubahan komponen React. |
| Gerbang | `typecheck` 0 · `lint` 0 · `build` sukses · `npm test` tanpa perubahan snapshot canon. |
| Regulasi | Target WCAG 2.1 **AA** (4,5:1 teks normal, 3:1 teks besar). AAA tidak dikejar. |
| Verifikasi | **Screenshot tidak tersedia** pada sesi kerja saat ini (pane browser tidak meng-compose frame). Verifikasi bertumpu pada `getComputedStyle` + perhitungan rasio. Ini kuat untuk kontras/ukuran, **buta terhadap komposisi visual** — lihat Risiko R-3. |
| Waktu | Fase 1–4 kecil dan berdiri sendiri; dapat dikirim sebagai satu PR. Fase 5 sebaiknya PR terpisah (lihat §10). |

---

## 7. Existing Solutions

| Opsi | Penilaian |
|---|---|
| **Sistem token `:root` yang sudah ada** | ✅ **Dipakai.** Infrastrukturnya sudah benar — variabel CSS, tema gelap, mode density, semua sudah berdiri. Yang salah adalah **nilai** di ujung ramp dan **kelalaian** menimpa warna depan di blok gelap. Tidak perlu membangun apa pun yang baru. |
| Adopsi design system pihak ketiga (Tailwind, Radix, shadcn) | ❌ Ditolak. Biaya migrasi 158 modul / 173 berkas view untuk masalah yang tuntas dengan ~15 baris CSS. Melanggar prinsip "custom work harus membuktikan diri" — di sini justru *penggantian* yang harus membuktikan diri, dan ia gagal. |
| Utility `!important` per-modul | ❌ Ditolak. Menambah utang, tidak menyembuhkan akar, dan menggagalkan SSOT token. |
| Biarkan (do nothing) | ❌ Ditolak untuk kontras — tema gelap pada 1,62:1 secara praktis tidak terbaca dan itu fitur terkirim. |

Fondasi aksesibilitas yang **sudah ada dan tidak boleh dirusak**: `focus-visible` ring ([styles_work.css:143](migration/src/styles_work.css:143)), `prefers-reduced-motion`, mode `dense`, breakpoint responsif.

---

## 8. Proposed Approach

**Token-first, berlapis, dapat dibatalkan per fase.**

Prinsip yang dipegang:

1. **Perbaiki di token, bukan di pemakai.** Rasio leverage 575:1, 1230:1, 893:1 membuat ini tidak terbantahkan.
2. **Tata ulang ramp, jangan tambal satu titik.** Menambal `--ink-4` sendirian meruntuhkan hierarki — itulah sebabnya Fase 1 menggeser `--ink-3` juga. Ini alasan Success Criteria #3 ada.
3. **Pecah peran token, jangan geser nilai bersama.** Untuk tema gelap, `--b-*-fg` memisahkan "warna depan badge" dari "isian solid" — masalah yang tak terlihat sampai nilai hendak diubah.
4. **Satu bahasa pemisah per konteks.** Border untuk kontainer statis; bayangan hanya untuk yang benar-benar melayang.
5. **Konvensi domain dihormati, sinyal dilindungi.** Angka negatif tetap merah (konvensi akuntansi) tetapi merah yang **berbeda dan lebih redup** dari merah alarm.

**Alternatif yang dipertimbangkan untuk `--ink-4`:**

| Opsi | Konsekuensi | Putusan |
|---|---|---|
| (a) Gelapkan ke 4,5 saja | Runtuh jadi kembar `--ink-3` (4,55 vs 5,05) | ❌ |
| (b) Larang untuk teks; hanya ikon dekoratif | Butuh audit 575 pemakaian + aturan yang harus terus dijaga manusia | ❌ |
| (c) **Tata ulang ramp `ink-3` + `ink-4`** | Dua nilai berubah; hierarki 4 tingkat terjaga & lolos AA | ✅ **dipilih** |

---

## 9. Risks

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| **R-1** | Menggeser `--ink-3` (5,05 → 6,59) membuat teks sekunder terasa **lebih berat**; pembedaan dari `--ink-2` (9,17) menyempit. | Sedang — perubahan nuansa lintas-aplikasi | Rasio antar-tingkat tetap 1,39× (di atas ambang 1,3× pada SC #3). Bila terasa terlalu berat saat verifikasi visual, mundur ke `--ink-3` #59676f (≈5,9) dan turunkan `--ink-4` seimbang. Reversibel: dua nilai. |
| **R-2** | Menghapus `box-shadow` membuat panel terasa "datar"/kurang berlapis, terutama pada canvas `--bg` yang hanya 1 langkah dari `--surface`. | Sedang | Border `--line` dipertahankan sebagai pemisah. Bila kurang, naikkan kontras `--line` (1,39 → ~1,8) alih-alih mengembalikan bayangan — itu memisahkan bidang tanpa menambah lapisan. |
| **R-3** | **Verifikasi buta-komposisi.** Skrip membuktikan kontras, bukan keindahan. Perubahan bisa lolos semua gerbang namun terasa salah. | Tinggi bila tak ditangani | Wajib **verifikasi visual manusia** (Ari) sebelum merge, dengan pane browser ditampilkan. Ini gerbang non-negosiabel; PR tidak di-merge atas dasar angka saja. |
| **R-4** | `--num-neg` #8c3a34 pada latar zebra `--surface-2` / hover `--blue-050` bisa turun di bawah AA. | Rendah-sedang | Ukur `--num-neg` pada **keempat** latar baris tabel (surface, surface-2, blue-050, blue-100) sebagai bagian Fase 3; sesuaikan bila ada yang < 4,5. |
| **R-5** | Fase 5 menyentuh `.b-*` yang dipakai sangat luas; salah ketik satu kelas → badge kehilangan warna senyap. | Sedang | Token baru default menunjuk token lama (`--b-red-fg: var(--red)`), sehingga kelalaian menimpa = perilaku lama, bukan badge tanpa warna. Verifikasi keenam kelas di kedua tema. |
| **R-6** | Perubahan token menyentuh berkas yang sama dengan pekerjaan sidebar 2026-07-25 yang **belum di-commit** di working tree `master`. | Rendah | Commit / branch-kan pekerjaan sidebar lebih dulu (lihat §11 OQ-3) agar dua perubahan tidak tercampur dalam satu diff. |

---

## 10. Implementation Plan

**PR-1 — "Kontras token & de-noise" (Fase 1–4)**

| Milestone | Isi | Verifikasi |
|---|---|---|
| M1 | Fase 1: ramp ink (`--ink-3`, `--ink-4`) | Skrip rasio: 4 tingkat lolos AA + jarak ≥1,3× |
| M2 | Fase 2: `--amber` → #926500 | Badge amber ≥ 4,5 |
| M3 | Fase 3: `--num-neg` + `.neg` | WTB: simpul `--red` 63 → 0; `--num-neg` diukur di 4 latar baris (R-4) |
| M4 | Fase 4: hapus shadow `.panel`/`.portlet`, ratakan `.portlet-h` | `box-shadow` pd kontainer statis = 0 |
| M5 | Gerbang + verifikasi live 3 modul × tema terang | typecheck/lint/build/test hijau |
| M6 | **Verifikasi visual oleh Ari** (gerbang R-3) | Persetujuan eksplisit sebelum merge |

**PR-2 — "Tema gelap: pisahkan warna depan badge" (Fase 5)** — hanya bila OQ-1 disetujui.

| Milestone | Isi | Verifikasi |
|---|---|---|
| N1 | 6 token `--b-*-fg` di `:root` (menunjuk token lama) | Nol perubahan visual tema terang |
| N2 | Override `body.dark` + `--ink-4` gelap | Keenam badge + ink-4 ≥ 4,5 di gelap |
| N3 | Alihkan `.b-*` ke token baru | Keenam kelas benar di **kedua** tema |
| N4 | Gerbang + verifikasi live × tema gelap | Hijau + visual Ari |

Dipisah karena: PR-1 berisiko rendah dan bisa dikirim cepat; PR-2 menyentuh permukaan lebih luas dan memerlukan sesi verifikasi tema gelap tersendiri. Menggabungkannya akan mengaburkan bila terjadi regresi.

---

## 11. Open Questions

**OQ-1 — Apakah Fase 5 (tema gelap) masuk sekarang?**
Tidak ada dalam paket yang Anda pilih; ditemukan saat penyusunan PRD. Argumen memasukkan: cacatnya **lebih parah** dari tema terang (1,62:1 vs 2,99:1), tema gelap adalah fitur terkirim yang bisa di-toggle user, dan perbaikannya masih terkurung (6 token + 7 aturan). Argumen menunda: menambah permukaan uji dan menggandakan beban verifikasi visual.
**Rekomendasi saya: masukkan sebagai PR-2 terpisah**, dikerjakan setelah PR-1 merge.

**OQ-2 — Seberapa jauh `--ink-3` boleh digelapkan?**
Usul #515f68 (6,59) memperlebar jarak dari `--ink-4` tetapi mempersempit dari `--ink-2`. Ini pertimbangan rasa, bukan angka. Alternatif konservatif: `--ink-3` tetap #61717c dan `--ink-4` → #6d777f, menerima bahwa keduanya berdekatan dan `--ink-4` efektif pensiun sebagai tingkat teks.

**OQ-3 — Pekerjaan sidebar 2026-07-25 masih belum di-commit di `master`.**
Tiga berkas berubah (`styles_chrome.css`, `minimap.tsx`, `shell.tsx`) dan `styles_chrome.css` juga akan disentuh Fase 4. Perlu diputuskan: commit/branch-kan dulu, atau gabungkan ke PR-1?

**OQ-4 — Apakah `--line` perlu dinaikkan bersamaan dengan penghapusan bayangan?**
Mitigasi R-2 menyarankan menaikkan `--line` dari 1,39 bila panel terasa terlalu datar. Sebaiknya ditunda sampai verifikasi visual M6 — jangan mengubah dua variabel sekaligus lalu kehilangan jejak penyebab.

---

**Sign-off:** ditandai dengan balasan **"Proceed."**
