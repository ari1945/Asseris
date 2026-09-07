---
name: asseris-field-label-sweep
description: "PR #248 merged — sapuan 164 kontrol .field dapat htmlFor/id + dua gerbang baru; pelajaran codemod (buta komentar, useId per instans bukan per iterasi) dan grep yang cacat karena arrow function"
metadata: 
  node_type: memory
  type: project
  originSessionId: 712d85bf-6018-4587-ab87-3eb497e4e28c
  modified: 2026-08-15T09:39:37.025Z
---

**PR [#248](https://github.com/ari1945/Asseris/pull/248) MERGED 2026-08-15** — `origin/master` = **`a0cab60`**. Uji **1831** frontend + 431 server, 9/9 CI hijau. Lanjutan langsung dari [[asseris-firmjvform-overlay-contract]].

164 situs `.field` di 28 berkas view kini punya pasangan `htmlFor`/`id` (id dari `React.useId()` per komponen). Diterapkan **codemod**, bukan tangan.

## Gerbang baru — pakai ini, jangan bikin sendiri

- **`migration/src/a11y_field_labels.test.ts`** — pemindai SUMBER. Dua invarian: tiap `<label>` bersaudara punya `htmlFor` DAN kontrolnya punya `id`; id-nya bukan literal statis (`view_login.tsx` dikecualikan — `#lg-email`/`#lg-pw` kontrak helper e2e).
- **`e2e/tests/07-a11y-axe-keyboard.spec.ts`** — tiap `scanAndAssert` juga menolak **id kontrol kembar**.

**Why gerbangnya di SUMBER:** mayoritas `.field` hidup di dalam dialog, dan gerbang axe hanya memindai halaman yang berhasil dibuka → titik buta. Pemindai sumber tak punya titik buta itu. Lihat pola besar di [[asseris-firmjvform-overlay-contract]].

## GOTCHA — grep JSX rusak oleh arrow function

`</label>\s*<input[^>]*placeholder=` melaporkan "hanya 1 dari 126 punya placeholder". SALAH: `[^>]*` berhenti di `>` milik `=>` dalam `onChange={(e) => …}`. Angka sebenarnya **164 situs, 26 punya placeholder**.

**How to apply:** untuk apa pun yang menyentuh atribut JSX, JANGAN pakai `[^>]*`. Tulis pemindai tag yang menghormati kutip dan kedalaman `{}` (ada di `a11y_field_labels.test.ts`, fungsi `tagEnd`). Regex ber-grup lazy juga melompati pasangan lain saat gagal — versi pertama gerbang melaporkan 161 situs, sebagian palsu.

## GOTCHA KERAS — codemod WAJIB buta komentar

Codemod versi pertama **merusak `view_firmgl.tsx`**: komentar yang saya tulis sendiri di #246 memuat kata `<label>` harfiah → pemindai cocok ke dalam komentar → dua edit tumpang tindih. `tsc` yang menangkapnya, bukan uji.

**How to apply:** kosongkan isi komentar **tanpa mengubah panjangnya** (ganti tiap karakter dengan spasi, pertahankan `\n`) supaya seluruh indeks dan nomor baris tetap sahih. Implementasi ada di `a11y_field_labels.test.ts` (`blankComments`). Ini juga menjaga gerbang dari false positive abadi.

## GOTCHA — `useId()` unik per INSTANS KOMPONEN, bukan per ITERASI

`.field` di dalam `.map()` tetap menghasilkan id kembar untuk seluruh baris; semua `<label htmlFor>` lalu menunjuk kontrol PERTAMA. Terjadi di `view_psak48.tsx` (5 baris VIU). Obat: sertakan kunci baris — `uid+'-viu-'+f.k`.

Deteksi otomatisnya TIDAK andal: detektor saya ikut menandai `view_serviceorg.tsx` yang ternyata memakai seleksi tunggal (`sel`), bukan perulangan (paren-matching naif tak menghormati kutip). Karena itu penjaganya **runtime** (id-kembar di e2e), bukan statis.

## Sisa utang terukur — kelas BERBEDA, bukan kandidat codemod

- **Kontrol tanpa `<label>` sama sekali** (input inline tabel kovenan, slider, select `≥/≤`): **35 node critical** — `goingconcern` 16 `label` + 9 `select-name`, `sa540` 7, `sa520` 2, `tasks` 1. Butuh `aria-label` yang menjelaskan konteks baris; perlu keputusan Ari soal bunyinya.
- **±40 tombol tutup dialog** (`className="top-btn"` + `<I.x>`) tanpa `aria-label`/`title` → `button-name` critical. Mekanis, murah.

## Catatan proses

Sapuan mekanis besar begini lebih aman lewat codemod + review diff + gerbang, daripada ratusan edit tangan. Urutan yang terbukti: **tulis gerbang dulu (lihat angkanya merah) → codemod → gerbang hijau → verifikasi hidup**. Verifikasi hidup 20 rute menangkap dua kelas sisa yang tak terlihat dari sumber.
