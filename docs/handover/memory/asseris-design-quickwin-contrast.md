---
name: asseris-design-quickwin-contrast
description: "2026-07-25 evaluasi desain terukur — ✅ MERGED master PR #127 (bb3bf0f): kontras token AA terang & gelap, --num-neg, pemisahan token teks/isian, de-noise kontainer. Gerbang visual R-3 DILEWATI atas keputusan Ari"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1c4067f4-604e-4b4d-ace6-2878c6d7937c
  modified: 2026-07-24T22:41:57.002Z
---

Evaluasi desain Asseris berbasis pengukuran (bukan kesan) + implementasi paket quick-win.

**PR-1 — SELESAI, 2 commit di branch `feat/design-quickwin-contrast`** (belum push/PR):
- `7133104` sidebar putih seragam (lihat [[asseris-sidebar-white-labels]])
- `d0cc386` Fase 1–4 PRD "Quick-Win Desain Visual": ramp ink `--ink-3` #61717c→**#4f5c64**, `--ink-4` #8a97a1→**#656e76** (2,99 gagal AA bahkan utk teks besar; dipakai **575× di 142 berkas**) · `--amber` #9a6a00→**#926500** · token baru **`--num-neg` #8c3a34** (gelap #af7571) utk `.neg`, melepas angka negatif dari merah alarm · buang `box-shadow` `.panel`/`.portlet` + ratakan gradient `.portlet-h`→`var(--surface-2)`.
- Verifikasi: wtb 5 pelanggaran→0 (merah 63→0), home 2→0, workpapers 0. Gerbang: typecheck/lint/build + **test 565/565 snapshot canon utuh**.

**⚠️ GOTCHA TERBESAR — Vite dev server menyajikan STYLESHEET BASI.** Menghasilkan **dua temuan palsu** dalam satu sesi: (1) `body` kehilangan warna terwaris → seluruh teks turunan `rgb(0,0,0)` alih-alih `--ink`; (2) `color: var(--amber)` resolve ke nilai LAMA padahal `:root` sudah baru. Gejalanya menipu: `getComputedStyle(html).getPropertyValue('--x')` menunjukkan nilai BARU sementara elemen memakai nilai LAMA, dan enumerasi `document.styleSheets` menampilkan aturan yang benar namun tak diterapkan. **Selalu: (a) hard reload (`navigate` ke URL lagi) sebelum mengukur CSS, (b) uji-silang ke build produksi (`wedge-dist` = vite preview :5190) sebelum melaporkan cacat CSS apa pun.** Jangan pernah laporkan cacat CSS dari dev server tanpa langkah (b).

**Tangga ink harus ditata BERPASANGAN, bukan ditambal.** Menggelapkan `--ink-4` sendirian ke ambang 4,5 membuatnya kembar `--ink-3` (4,55 vs 5,05) → 4 tingkat runtuh jadi 3. Ikat pada **terburuk-dari-4-latar** (surface/surface-2/**surface-3 #eef1f4**/bg) — surface-3 adalah pengikatnya, bukan putih. Hasil 15,94/9,17/6,93/5,19, jarak 1,74×/1,32×/1,34×.

**PR-2a — SELESAI, commit `32e40eb`.** Tiga dari enam kelas cacat tema gelap beres:
1. **KANVAS TERANG DI MODE GELAP** (cacat terbesar, **terverifikasi ada di PRODUKSI**): blok token gelap dulu hanya berselektor `body.dark` → token gelap tak pernah sampai `:root`(=`<html>`) → `html, body { background: var(--bg) }` membuat **`<html>` mengecat kanvas terang #f0f2f5**; `.app`/`.view-scroll`/`.view-pad` transparan → latar terang tembus di semua celah antar panel. Fix: selektor jadi `:root:has(body.dark), body.dark`. `:has()` dipilih supaya kelas tetap boleh di `<body>` — app.tsx:460 + shell.tsx:470 + view_settings.tsx:174 semua menulis ke `document.body`.
2. **6 token `--b-*-fg`** (green #4c9571 · amber #ab832b · red #c9655f · purple #8c79c1 · teal #4c9399 · blue #6b9ab8), di terang menunjuk token lama = nol perubahan.
3. **Tangga ink gelap berpasangan**: `--ink-3` #8b98a5→**#a1acb6**, `--ink-4` #687480→**#8b949d**; diikat ke terburuk-dari-4 permukaan gelap (**surface-3 #222c38 pengikatnya**). Rasio 14,50/10,53/7,39/5,56.
Verifikasi: gelap 12→11 pelanggaran (semua kegagalan badge & ink-4 hilang), terang **0** (nol regresi). Gerbang hijau + 565/565.

**PR-2b — SELESAI, commit `bd7b366` (78 berkas). TEMA GELAP KINI AA PENUH.**

**Temuan inti: SETIAP token semantik merangkap 2 peran dgn arah penyesuaian BERLAWANAN.** Pd `--surface` gelap #161c24, peran TEKS butuh luminans **≥0,2258**, peran ISIAN (teks putih di atasnya) butuh **≤0,1833** — **TAK BERIRISAN**, jadi pemisahan token wajib secara aritmetik, bukan selera.

**Arah pemisahan ditentukan sebaran nyata:** `--blue` teks **781**× vs isian **31**× · `--navy` 277 vs 56 · `--red/green/amber/purple/teal` 755 vs 7 → total **1.813 teks vs 94 isian (19:1)**. Maka token semantik TETAP jadi token TEKS (dicerahkan di gelap) dan yang 94 pindah ke **`--*-solid`**. Membalikkannya = menyunting 1.813 lokasi.

Nilai teks gelap (terikat terburuk-dari-4 permukaan gelap, semua ≥4,55): navy #8298a1 · blue #6b9ab8 · red #d17b76 · green #60a181 · amber #af8f45 · purple #9b8ac9 · teal #5d9da3. `--navy-solid` di-override gelap ke **#0a1620** agar chrome tak berubah. `--num-neg` gelap #af7571→**#ba8985** (yg lama hanya terikat `--surface`, meleset di tfoot `--surface-3` 3,77 & baris terpilih `--blue-100` 3,66).

Juga: **`background:#fff` hardcode 17 lokasi → `var(--surface)`** (`#print-area` dikecualikan); **kelas tema pindah ke `<html>`** (`body.dark`→`:root.dark`, 3 titik TS kini tulis ke `document.documentElement`) yang menghapus `:root:has(body.dark)` dari PR-2a; `html, body { color/background }` dipecah — kini **hanya di `<html>`**, body mewarisi.

Verifikasi: **3 modul × 2 tema = 6 kombinasi, SEMUA 0 pelanggaran.** Gerbang hijau + 565/565.

**⚠️ GOTCHA BARU (menyelamatkan dari 2 kesimpulan salah):** browser tertanam **TIDAK me-recalc warna warisan `<body>`** setelah kelas tema berubah di `<html>` — `getComputedStyle` melaporkan nilai tema LAMA. Sempat tampil sbg 3 "pelanggaran" `--ink` terang di atas panel gelap yang **tidak nyata**. Wajib paksa recalc sebelum mengukur: `body.style.display='none'; void body.offsetHeight; body.style.display=''`. Hipotesis "siklus invalidasi `:has()`" TERBUKTI SALAH. GOTCHA probe: di Chrome modern **`CSSStyleRule` juga punya `.cssRules`** (truthy, untuk nested CSS) — `if(r.cssRules){walk();return;}` akan melewati SEMUA aturan biasa; pakai `r.cssRules && r.cssRules.length`. GOTCHA regex: `[^)]*` dan lazy `.*?\)` berhenti di kurung PERTAMA → gradien multi-token terlewat.

**Taksiran PRD Fase 5 ("6 token + 7 aturan") SALAH** — diturunkan dari kelas `.b-*` saja; nyatanya enam kelas akar.

**Temuan DILUAR cakupan, belum dikerjakan** (Non-Scope PRD, masing-masing butuh PRD sendiri): **skala tipografi** — 9–10 ukuran font per halaman, **72% teks ≤11px** di Beranda / 48% di WTB; setengah-langkah 10,5·11,5·12,5 = ketidakteraturan tanpa hierarki; usul 5 langkah 11·12·13·15·19. **17% simpul teks HURUF KAPITAL.** **8 nilai radius** dalam satu halaman padahal token `--radius:4px`.

**Screenshot tak tersedia** sepanjang sesi (pane browser tak meng-compose frame) → seluruh bukti dari `getComputedStyle` + rasio WCAG. Kuat utk kontras/ukuran, **buta komposisi**. PRD menjadikan verifikasi visual Ari sbg gerbang wajib sebelum merge (R-3).

Login dev: `anindya.p@whr-cpa.id` / `Manager#2025!` (Audit Manager). PRD: `PRD - Quick-Win Desain Visual (...).md` di root repo. Lihat [[asseris-pagehead-single-row]], [[asseris-sidebar-learning-curve]].
