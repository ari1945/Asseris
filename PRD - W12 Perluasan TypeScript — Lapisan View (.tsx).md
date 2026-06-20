# PRD — W12 · Perluasan TypeScript ke Lapisan View (`.jsx → .tsx`)

> Status: **Keputusan terkunci (D1–D4) — menunggu "Proceed." untuk mulai Fase 0** · Penulis: Claude (atas arahan Ari) · 2026-06-20
> Arc terkait: W5 (kanon→TS, selesai) · **W11 (lapisan data→`.ts`, SELESAI)** · memory
> `[[neosuite-ams-w11-typescript-data]]` · `[[neosuite-ams-arc]]`

---

## 1. Problem

W11 menutup **lapisan data** (31 file `data*.js → .ts`, semua di-`include` `tsconfig.app.json`
relaks; boss `data.js`/AMS terakhir, `be996c2`). Tapi **lapisan view masih `.jsx` mentah** —
**173 file `view_*.jsx`** ditambah 16 file fondasi/lintas-sektor (`ui`/`shell`/`contexts`/`app`/
`icons`/…) **tidak diperiksa tipe sama sekali** (`allowJs` resolusi-saja, `checkJs:false`, tak masuk
`include` tier mana pun). Konsekuensi: kontrak antara view ↔ kanon (`canon_selectors`) ↔ data (`AMS`/
`AmsData` yang **kini konkret** sejak W11 boss) tak punya jaring tipe. Salah-ketik prop, salah bentuk
hasil `figures()`/`materialityFor()`, handler event keliru, hook-return salah-pakai — semua baru
ketahuan saat render, bukan saat `typecheck`. Inilah justru lapisan terbesar & paling sering disentuh.

Arahan: **lanjutkan perluasan TS dari data → view** (`view_*.jsx → .tsx`), pola identik slice W11.

## 2. Objective

Mengonversi **lapisan view** (`view_*.jsx → .tsx`) ke TypeScript di bawah tier-app relaks yang sudah
ada, **per slice terurut blast-radius** (terkecil dulu), dengan **resep yang sama-terbukti** dari W11
— setiap slice: semua gate hijau, **angka identik**, live-proven. Membangun **beachhead view** (pilot
kecil untuk kalibrasi pola error view-spesifik), lalu menjalankan backlog. **Bukan** mengonversi 16
file fondasi (`ui`/`shell`/`app`/…) — itu arc terpisah (W13+, lihat Non-Scope).

## 3. Success Criteria

1. `npm run typecheck` (dua tier) tetap **0 error** setiap slice; view terkonversi kini dijaga `tsc`
   (tier app relaks), bukan ESLint.
2. **Nol regresi numerik per slice:** 59 vitest migration + snapshot fingerprint kanon **identik**;
   render live modul terdampak **0 console error** (login Partner).
3. ESLint tetap hijau (`no-undef`/`no-dupe-keys` = 0) untuk `.js/.jsx` tersisa; file pindah ke `.tsx`
   kini dijaga `tsc` — **tidak ada penurunan cakupan gate** (sama seperti `.ts` di W5/W11).
4. `build` (Vite/Rollup) tetap hijau — **tak ada** "Could not resolve" (semua importer ditulis-ulang
   extensionless).
5. Setiap konversi = **struktural-saja** (type-strip + rewire specifier + anotasi type-only),
   **nol perubahan perilaku/angka** — dibuktikan per slice.
6. Resep + slice-list view terurut **terdokumentasi** di `BUILD.md` §W12, dengan status per slice.
7. **Beachhead view** (pilot 3–5 view representatif) lulus end-to-end sebelum batch besar.

## 4. Scope (arc ini)

- **Fase 0 — Pilot/beachhead view (3–5 file).** Kalibrasi pola error view-spesifik (props `:any`,
  hook-return, handler event, riak tipe dari `canon_selectors`/`AmsData` konkret) pada 3–5 view
  representatif: satu leaf murni (1-importer), satu konsumen `canon_selectors`, satu ber-hook/state
  & event-handler berat. Semua gate hijau + live-proven. Dokumentasikan resep di `BUILD.md` §W12.
- **Fase 1 — Backlog leaf 1-importer.** 154 view dengan 1 importer-bernama (umumnya hanya route
  `app.jsx`). Batch ~15–25/slice (skala dari kalibrasi Fase 0).
- **Fase 2 — View ber-importer ≥2 & `_parts`.** 9 view (2 importer) → 2 view (3 importer:
  `view_cockpit`, `view_materiality`) → penyedia komponen bersama (`view_docparts` 7, `view_onboarding`
  9, `view_bo1` 12, `view_calc` 22, `view_fpm_parts` 29, `view_analytical` 48 — para "boss" arc ini,
  terakhir).
- **Fase 3 — Penutup.** Update `BUILD.md` §W12 + memory; konfirmasi tak ada `src/view_*.jsx` tersisa.

## 5. Non-Scope (eksplisit — dipagari)

- **16 file fondasi/lintas-sektor `.jsx`** (`ui` `shell` `contexts` `app` `icons` `copilot`
  `evidence` `ai_insights` `ai_extract` `diagnostics_panel` `fsgen_model` `related_modules`
  `sa_canonical` `wp_signoff` `minimap` `main`) — **arc terpisah W13+**. Ini fan-in tertinggi &
  paling berisiko (`app.jsx`=148 import; `ui`/`icons`/`contexts` di-import hampir semua view). W12
  menyentuh `app.jsx`/`main.jsx` **hanya** untuk menulis-ulang specifier view ke extensionless —
  isinya tetap `.jsx`, tidak dikonversi.
- **Menaikkan tier app ke full-strict (ratchet)** — **TIDAK** di tengah arc (akan memunculkan ulang
  error di file yang sudah terkonversi). Ratchet dilakukan sebagai **sub-fase terminal terpisah**
  setelah SELURUH app jadi `.ts/.tsx` (W13+), agar seluruh program app berbalik strict sekaligus.
- Refactor logika view, perubahan API/props publik, window-strip lanjutan, atau konversi data
  (sudah selesai W11).

## 6. Constraints

- **SSOT = `migration/src`** (ESM-only). `app/*` buildless = frozen, jangan disentuh.
- **Resolver (penentu resep, sama W11):** Vite/Rollup **TIDAK** resolve `./view_x.jsx` → `view_x.tsx`.
  **Extensionless** `./view_x` resolve ke `.tsx`. ⇒ konversi **bukan rename-saja**: tiap importer
  (side-effect `main.jsx` **dan** named-import `app.jsx`/sibling view) ditulis-ulang extensionless.
- **`jsx:"react-jsx"`** sudah ada di **kedua** tsconfig → tak perlu `import React`.
- **Vite/esbuild loader `tsx`** sudah memproses `.ts/.tsx` (sejak W5) → tak ada perubahan toolchain.
- View **bukan canon-reachable** (terverifikasi: tak ada `canon_*.ts` meng-import view) ⇒ **app-tier
  relaks cukup** — beda dari `data_part1-4`/`data_base` (🔒 full-strict). Tak ada view yang 🔒.

## 7. Existing Solutions (dipakai-ulang, bukan bikin baru)

- **Tier-app relaks** (`tsconfig.app.json`, W11) — view tinggal ditambah ke `include`.
- **`src/app-globals.d.ts`** (W11) — tempat deklarasi `window.<NS>` residual baru bila muncul.
- **`canon_selectors.ts`** (W5) — view tarik tipe `figures()/fig()/materialityFor()` dari sini.
- **Resep slice & gate** (W11 §BUILD.md) — `git mv` → rewrite specifier extensionless → tambah
  `include` → `typecheck` fix type-only → gate berurutan → commit. W12 = pola identik, ekstensi `.tsx`.

## 8. Proposed Approach — resep per slice (analog W11, ekstensi `.tsx`)

1. `git mv src/view_<x>.jsx src/view_<x>.tsx`.
2. Tulis-ulang **SEMUA** importer specifier `./view_<x>.jsx` → `./view_<x>` (extensionless):
   side-effect `main.jsx` + named-import `app.jsx` + sibling view mana pun (`grep -rn "view_<x>"`).
3. Tambah `src/view_<x>.tsx` ke `include` `tsconfig.app.json`.
4. `tsc -p tsconfig.app.json --noEmit` → perbaiki error (semua **type-only**, nol-runtime). Pola
   antisipasi view-spesifik:
   - **Props komponen** tanpa anotasi → `function V(props: any)` atau `({a,b}: any)`.
   - **Hook-return** (`useFirm()`/`useAudit()`/`useState`) yang diakses propertinya → cast `:any`
     pada destructure bila tipe context belum lengkap.
   - **Event handler** `(e) => …` → `(e: any)` (relaks; tak ketat `React.ChangeEvent`).
   - **Riak dari `canon_selectors`/`AmsData` konkret** (W11) — akses properti hasil typed; kalau
     bentuk beda dari ekspektasi view → cast titik-akses `(x as any).k`.
   - **`window.<NS>` residual** → deklarasi di `src/app-globals.d.ts`.
   - **JSDoc `@type` BERHENTI dihormati di `.tsx`** (GOTCHA 3 boss W11) → ganti ke **anotasi TS asli**.
5. Gate berurutan: `lint`(0) → `typecheck`(0, dua-tier) → `build`(no-resolve-fail) →
   `test`(59 + fingerprint identik) → `dev:all` render modul terdampak **0 console error** (Partner).
6. Commit `w12(sliceN): view_<x> .jsx → .tsx (struktural; angka identik)`.

## 9. Risks & Mitigasi

- **R1 — Volume (189 file).** 173 view + nanti 16 fondasi. *Mitigasi:* batch by importer-count,
  kalibrasi ukuran batch di Fase 0; gate per slice cegah utang menumpuk.
- **R2 — Pola error view > data.** View punya props/hooks/JSX/handler — lebih banyak permukaan dari
  IIFE data. *Mitigasi:* Fase 0 pilot 3–5 view representatif untuk pemetaan pola sebelum scaling.
- **R3 — Penyedia komponen bersama (`view_analytical` 48, `view_calc` 22, `view_fpm_parts` 29).**
  Konversi = rewrite puluhan specifier di konsumen `.jsx`. *Mitigasi:* taruh **terakhir** (Fase 2);
  konsumen `.jsx` tak di-type-check, hanya specifier yang berubah.
- **R4 — `app.jsx` (148 named-import) tersentuh tiap slice.** *Mitigasi:* hanya rewrite specifier
  (extensionless), bukan edit logika; perubahan kecil & mekanis; gate `build`+live tiap slice.
- **R5 — Penurunan cakupan ESLint** saat `.jsx`→`.tsx` (flat-config tak melint `.tsx`). *Mitigasi:*
  `tsc` (tier app) menggantikan & lebih kuat — sama persis kasus `.ts` W5/W11, bukan regresi gate.
- **R6 — Riak tipe konkret antar-view** (sibling view import view terkonversi). *Mitigasi:* app-tier
  relaks (`noImplicitAny:false`); konsumen `.jsx` tak di-check; cast `any` di hulu bila perlu (analog
  Note 2 W11 `BO:any`).

## 10. Implementation Plan (urutan eksekusi)

- **Fase 0 (beachhead):** pilih 3–5 pilot → konversi → semua gate + live → tulis `BUILD.md` §W12 +
  slice-list. **Checkpoint ke Ari** sebelum scaling.
- **Fase 1:** batch 154 leaf 1-importer, ~15–25/slice, commit per slice.
- **Fase 2:** 2-importer (9) → 3-importer (2) → penyedia bersama (docparts/onboarding/bo1/calc/
  fpm_parts/analytical, terakhir).
- **Fase 3:** verifikasi `ls src/view_*.jsx` kosong; finalisasi `BUILD.md` §W12 + memory.

## 11. Keputusan (TERKUNCI — 2026-06-20)

- **D1 — Urutan slice.** ✅ **By #importer-bernama, terkecil dulu** (identik W11) — minim rewrite
  specifier per slice, ledakan error terkendali.
- **D2 — `view_*_parts`.** ✅ **By importer-count sendiri**; `_parts` ber-1-importer erat-kopel (mis.
  `view_materiality_parts`→`view_materiality`) **boleh ride bareng induk** dalam 1 commit; `_parts`
  fan-in tinggi (`view_fpm_parts`=29) ikut batch penyedia-bersama (Fase 2, terakhir).
- **D3 — Ratchet app-tier ke strict.** ✅ **Sub-fase terminal** setelah seluruh `.jsx` (view +
  fondasi W13) terkonversi — W12 tetap relaks penuh, tak ada re-error di tengah arc.
- **D4 — Scope fondasi.** ✅ **TIDAK — W12 = 173 view saja**; 16 fondasi (`ui`/`shell`/`contexts`/
  `app`/`icons`/…) = W13+ (fan-in tertinggi, paling berisiko). W12 menyentuh `app.jsx`/`main.jsx`
  hanya untuk rewrite specifier extensionless.

> **Status: keputusan terkunci — menunggu "Proceed." untuk mulai Fase 0 (pilot 3–5 view).**
