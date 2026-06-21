# PRD — W13 · Fondasi TypeScript (`.jsx → .tsx`) & Ratchet `noImplicitAny`

> Status: **Keputusan terkunci (D1–D4) — menunggu "Proceed." untuk mulai Fase 0** · Penulis: Claude (atas arahan Ari) · 2026-06-22
> Arc terkait: W5 (kanon→TS, selesai) · W11 (data→`.ts`, SELESAI) · **W12 (view→`.tsx`, SELESAI 173/173)** ·
> memory `[[neosuite-ams-w11-typescript-data]]` · `[[neosuite-ams-w12-typescript-view]]` · `[[neosuite-ams-arc]]`

---

## 1. Problem

W11 menutup **lapisan data** (31 `data*.js → .ts`) dan W12 menutup **lapisan view** (173 `view_*.jsx → .tsx`),
keduanya di-`include` `tsconfig.app.json` **relaks**. Yang tersisa = **lapisan fondasi**: **16 file `.jsx`**
di `migration/src` yang **tidak diperiksa tipe sama sekali** (`allowJs` resolusi-saja, `checkJs:false`, tak masuk
`include` tier mana pun). Ini bukan sembarang sisa — ini **akar pohon impor**:

- `icons.jsx` (172 importer), `ui.jsx` (169), `contexts.jsx` (143), `shell.jsx` (137) — diimpor mayoritas view.
- 6 di antaranya ber-**shim `.d.ts` tulis-tangan** (`ui`/`shell`/`evidence`/`wp_signoff`/`ai_insights`/`diagnostics_panel`)
  yang menambal tipe sejak W12 — **tipe palsu, bukan tipe nyata dari sumber**. Selama shim ada, kontrak
  primitif UI (`Badge`/`Btn`/`Panel`/`Portlet`…), shell (`SubBar`), context-hook (`useFirm`/`useAuth`/`useNav`),
  dan modul lintas-sektor (evidence, sign-off) **tak pernah diverifikasi terhadap implementasinya**.

Konsekuensi: salah prop ke primitif, salah signature hook, salah bentuk return — semua lolos `typecheck`
karena shim `.d.ts` "selalu setuju". Selain itu, **app-tier masih `strict:false`/`noImplicitAny:false`** —
artinya bahkan view & data yang sudah `.tsx`/`.ts` **masih membiarkan `any` implisit** menyelinap. Arc TS
"selesai secara file" tapi **belum menambah jaring tipe yang berarti** di tepi terpenting.

Arahan: **tutup lapisan fondasi** (`.jsx → .tsx`, hapus shim → tipe nyata mengambil alih) **dan** mulai
**meratchet ketegasan** tier-app dari relaks → `noImplicitAny`.

## 2. Objective

1. **Konversi 16 file fondasi/lintas-sektor `.jsx → .tsx`** di bawah tier-app, dengan **resep sama-terbukti**
   W11/W12 (type-strip + tulis-ulang specifier extensionless + anotasi type-only). **Hapus 6 shim `.d.ts`** —
   tipe **nyata** dari sumber mengambil alih.
2. **Ratchet tier-app ke `noImplicitAny:true`** sebagai sub-fase terminal — paksa setiap `any` jadi eksplisit
   (anotasi nyata bila murah; `:any` sadar hanya untuk bus dinamis). **`strictNullChecks` + paritas-kanon penuh
   DITUNDA ke W14** (D3).
3. Setelahnya: **nol sumber React `.jsx`** di `migration/src`; **nol shim `.d.ts`** penambal-fondasi
   (sisa `.d.ts` = ambient sah saja); tier-app `noImplicitAny`-bersih.

## 3. Success Criteria

1. `npm run typecheck` (dua tier) **0 error** setiap slice; fondasi terkonversi kini dijaga `tsc`, bukan ESLint;
   tier-app `noImplicitAny:true` 0 error pada akhir Fase 4.
2. **Nol regresi numerik per slice:** 59 vitest migration + 116 server vitest hijau, snapshot fingerprint kanon
   **identik**, render live modul terdampak **0 console error** (login Partner, lintas-route).
3. `npm run lint` hijau untuk `.js` infra tersisa; `npm run build` (Vite/Rollup) hijau — **tak ada** "Could not
   resolve" (semua importer ditulis-ulang extensionless).
4. **Nol `migration/src/*.jsx`** (kecuali jika di-defer eksplisit) dan **nol shim `.d.ts`** dari daftar 6.
5. Setiap konversi = **struktural-saja** (type-strip + rewire specifier + anotasi type-only + hapus shim);
   **tanpa perubahan logika/JSX/perilaku runtime**.
6. **Rasio `:any` terukur & dilaporkan** pada ratchet (Fase 4): hindari ratchet jadi kosmetik — anotasi nyata
   diutamakan; `:any` hanya untuk bus `window.*`/sumber dinamis (`Object.values`/`AMS` lebar). Bila rasio `:any`
   tinggi tak terhindarkan di suatu file, **dicatat** sebagai utang W14, bukan disembunyikan.

## 4. Scope (D1 = Nol .jsx)

**16 file `.jsx` → `.tsx`:**

| Kelompok | File | Catatan |
|---|---|---|
| Fondasi inti **no-shim** | `icons` (172 imp), `contexts` (143), `app` (router, 525 LOC), `main` (entry) | infer bersih dari `.jsx` hari ini; konversi = body kini dicek tier-app |
| Fondasi inti **ber-shim** | `ui` (169 imp, 6 shim primitif), `shell` (137 imp, SubBar) | **SHOCKWAVE** saat shim dihapus → tipe nyata ambil alih |
| Lintas-sektor **ber-shim** | `evidence` (P2), `wp_signoff` (P2, 575 LOC), `ai_insights`, `diagnostics_panel` | hapus shim → superset ekspor jadi tipe nyata |
| Leaf bersih **no-shim** | `copilot` (739 LOC), `ai_extract`, `minimap`, `related_modules` (LINEAGE), `sa_canonical`, `fsgen_model` | importer sedikit; kalibrasi pola error |

**Hapus 6 shim `.d.ts`:** `ui.d.ts`, `shell.d.ts`, `evidence.d.ts`, `wp_signoff.d.ts`, `ai_insights.d.ts`,
`diagnostics_panel.d.ts` (masing-masing saat file pasangannya jadi `.tsx`).

**Ratchet (Fase 4):** `tsconfig.app.json` → `noImplicitAny:true`.

## 5. Non-Scope (eksplisit — calon W14)

- **`strictNullChecks` & paritas-kanon penuh** (`strict:true`) — push terpisah, blast-radius berbeda (null-flow,
  bukan implicit-any). **Ditunda W14** (D3).
- **Penyatuan dua `tsconfig`** menjadi satu config strict — W14, setelah SNC.
- **Infra `.js` → `.ts`**: `api.js`, `rbac.js`, `llm_providers.js`, `export_pdf.js`, `export_xlsx.js` — **tetap `.js`**
  (bukan React-fondasi; permukaan risiko di luar tema). Calon W14.
- **`*.test.js`** & `__fixtures__/*.js`, `__tests__/setup.js` — tetap `.js`.
- **`app-globals.d.ts` & `types/globals.d.ts`** — **TETAP**. Keduanya ambient sah: `globals.d.ts` = kanon;
  `app-globals.d.ts` = peta kopling `window.*` **residual yang sengaja dipertahankan** (bus imperatif `__amsOpen*`,
  sibling `window.AMS_*` non-terukur — lihat `[[neosuite-ams-window-strip]]`). **Bukan** shim penambal-fondasi.
- **Window-strip lanjutan** — arc terpisah & sudah COMPLETE; W13 tak menyentuhnya.

## 6. Constraints

- **Resolver gotcha (penentu resep):** Vite/Rollup **tak** resolve `./x.jsx` → `x.tsx`. Importer fondasi hari ini
  pakai specifier **`.jsx` eksplisit** (`from './ui.jsx'`, 169×). ⇒ konversi WAJIB **tulis-ulang tiap importer ke
  extensionless** (`from './ui'`). Sama seperti W11/W12; **bukan rename-saja**.
- **Sibling-shim dihormati Babel runtime:** menghapus `ui.d.ts` aman selama `ui.tsx` ada (tipe nyata menggantikan).
- **Babel & React dipin** (versi+integrity di `<head>`) — jangan ubah.
- **`allowJs:true`/`checkJs:false`** tetap (infra `.js` & test masih diimpor & di-resolve, tak dicek).
- **SSOT kanon `tsconfig.json` (full strict) tak tersentuh** — W13 hanya menyentuh `tsconfig.app.json`.
- **Target verifikasi (gotcha W12):** app migration via launch **"vite" :5180** + backend **:5181 standalone**
  (`PORT=5181 npm --prefix ../server run dev`). **JANGAN** server "prod" :5188 (= app BEKU `app/compiled`, salah target).
- **Gate pre-commit (mirror CI):** migration `lint`+`typecheck`+`test`+`build`; **server `typecheck`+`test`**
  (server `tsc` full-strict mengikuti `seedData.ts → data*.ts` — pernah lolos lokal, ditangkap CI; lihat `6fbf005`).

## 7. Existing Solutions (kenapa custom dibenarkan)

Resep sudah ada & terbukti 2 arc (W11 data, W12 view): tier-app relaks + `include` eksplisit tumbuh-per-slice +
gate identik + live-prove. W13 **menggunakan-ulang** resep itu apa adanya untuk fondasi; satu-satunya hal baru =
**penghapusan shim** (sudah dilatih di W12 Slice B "SHOCKWAVE" 518→0 via lever `:any` param destructure) dan
**langkah ratchet** (baru, tapi mekanis: flip flag → perbaiki ledakan). Tak ada yang perlu ditemukan dari nol.

## 8. Proposed Approach & Recipe (D2)

Per file, **struktural-saja**:
1. `git mv view.jsx → view.tsx` (atau `*.jsx → *.tsx`).
2. **Tulis-ulang semua importer** `from './<m>.jsx'` → `from './<m>'` (extensionless), termasuk side-effect di `main`.
3. **Hapus shim** `<m>.d.ts` bila ada → tipe nyata sumber mengambil alih.
4. Tambah file ke `include` `tsconfig.app.json`.
5. Perbaiki error **type-only** dengan pola terbank:
   - **Lever SHOCKWAVE (ber-shim):** anotasi `:any` pada **param destructure komponen ter-ekspor** di file penyedia
     (`function Btn({ ...props }: any)`) — satu edit mematikan cascade TS2741/2739 "prop hilang" di ratusan konsumen
     (terbukti W12 Slice B).
   - Sumber lebar `const A = AMS` → `const A: any = AMS`; augmentasi kanon `(AMS_CANON as any).X`; `Object.values(x)`
     → callback param `:any`; `Date−Date` → `+a − +b`; bus ad-hoc `(window as any).X`.
6. **Gate penuh** tiap slice: `lint`+`typecheck`(2-tier)+`test`(59)+`build` + fingerprint kanon identik +
   **live-prove** route terdampak (Partner, 0 console err).

## 9. Implementation Plan (D4 = urutan blast-radius menaik)

- **Fase 0 — Beachhead/pilot (leaf bersih, no-shim).** 2–3 file importer-sedikit: `sa_canonical` (6), `related_modules`,
  `minimap`. Kalibrasi pola error fondasi-spesifik (hook-context defensif, ikon, LINEAGE). Buktikan gate+live.
- **Fase 1 — Leaf bersih sisa.** `copilot` (739), `ai_extract`, `fsgen_model` (W12 sengaja membiarkannya `.jsx`;
  konversi di sini, infer bersih). Tanpa shim.
- **Fase 2 — Fondasi no-shim (giant rewrite).** `icons` (172), `contexts` (143), lalu `app` (router `viewFor()` +
  `ViewErrorBoundary`) + `main` (entry). Banyak tulis-ulang importer, **tanpa** shockwave shim.
- **Fase 3 — Ber-shim (SHOCKWAVE).** `ui` (169) → `shell` (137) → `evidence` → `wp_signoff` (575) → `ai_insights`
  → `diagnostics_panel`. Tiap file: hapus shim → lever `:any` destructure-param → cascade-kill → gate+live. **Fase
  paling berisiko**; satu slice per file besar.
- **Fase 4 — Ratchet terminal D3.** Flip `tsconfig.app.json` → `noImplicitAny:true`. Perbaiki ledakan implicit-any
  lintas data+view+fondasi (anotasi nyata diutamakan; `:any` sadar untuk bus). Laporkan rasio `:any`. Gate penuh +
  live lintas-route. Update BUILD.md §W13 + memory.

Setiap fase = satu (atau beberapa) commit; tiap commit melewati gate lengkap. Boleh sub-agent paralel per-cluster
file disjoint (resep efisien W12: 1 perl seragam rewrite specifier + agen paralel).

## 10. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | **Shim shockwave `ui`/`shell`** — ratusan TS2741/2739 saat tipe nyata ambil alih | Lever `:any` param destructure komponen ter-ekspor (terbukti W12 Slice B 518→0); satu slice per penyedia |
| R2 | **`app.jsx` router** — `viewFor()` switch ~175 case + `ViewErrorBoundary`; salah tipe → routing pecah | Konversi struktural murni; live-prove **semua workspace/route** pasca-konversi (bukan sampel) |
| R3 | **Ratchet `noImplicitAny` jadi kosmetik** — banjir `:any` mengikis nilai tipe | Anotasi nyata bila murah; `:any` hanya bus dinamis; **ukur & laporkan rasio** (SC#6); utang → W14 |
| R4 | **`contexts` hooks** — `useFirm`/`useAuth`/`useNav` dipakai 143× | Pertahankan signature; infer-clean; defensif `typeof useNav==='function'` (aturan emas #6) |
| R5 | **`fsgen_model`** — W12 sengaja `.jsx` (infer bersih lewat 10 importer `.tsx`) | Rendah (252 LOC); konversi di Fase 1 terisolasi; bila buka error tak terduga → boleh defer dgn catatan |
| R6 | **Server typecheck terlewat** (pola bug CI `6fbf005`) | Jalankan **server `typecheck`+`test`** tiap slice yang menyentuh `data*.ts` graf; bagian gate wajib |
| R7 | **HMR churn rename** (`[hmr] Failed to reload .jsx`) disangka error runtime | Bukti bersih = `preview_stop`+start fresh (gotcha W12) |

## 11. Open Questions

1. **`fsgen_model`** — konversi di Fase 1 (rencana saat ini, D1=nol-`.jsx`) atau defer permanen dengan catatan?
   Default: **konversi**; defer hanya bila membuka error tak proporsional (R5).
2. **Pemecahan commit Fase 3** — satu commit per file ber-shim (6 commit) vs gabung pasangan kecil
   (`ai_insights`+`diagnostics_panel`)? Default: `ui`/`shell`/`wp_signoff` masing-masing solo; sisanya boleh gabung.
3. **Pengukuran rasio `:any`** — perlu metrik formal (mis. hitung `: any` baru per file di Fase 4) atau cukup
   penilaian kualitatif di commit message? Default: hitung kasar + catat di BUILD.md §W13.

## 12. Definition of Done

- 16 file `.jsx → .tsx`; **0 `migration/src/*.jsx`**; 6 shim `.d.ts` dihapus; `tsconfig.app.json` `noImplicitAny:true`.
- Semua gate hijau (lint/typecheck-2tier/test 59+116/build) + fingerprint kanon identik + live-proven lintas-route.
- BUILD.md §W13 + memory `[[neosuite-ams-w13-...]]` ditulis. `strictNullChecks`/paritas-penuh/infra-`.js` tercatat
  sebagai backlog **W14**.

---

### Keputusan terkunci (menunggu "Proceed.")
- **D1 — Cakupan = Nol `.jsx`.** 16 file → `.tsx`, hapus 6 shim, infra `.js` tetap `.js`.
- **D2 — Resep = identik W11/W12** + lever `:any` destructure-param untuk shockwave hapus-shim.
- **D3 — Ratchet = bertahap.** `noImplicitAny:true` sub-fase terminal W13; `strictNullChecks` + paritas-penuh +
  penyatuan config + infra-`.js` **ditunda W14**.
- **D4 — Urutan = blast-radius menaik.** leaf bersih → no-shim fondasi → ber-shim (shockwave) → ratchet.
