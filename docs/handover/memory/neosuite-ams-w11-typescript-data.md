---
name: neosuite-ams-w11-typescript-data
description: W11 — widening TypeScript from canon to the app data layer (data*.js → .ts); relaxed app tier + recipe + slice-list
metadata: 
  node_type: memory
  type: project
  originSessionId: e0c1c0b0-f182-464e-bcbe-b54769e24a2e
---

**W11 — Perluasan TypeScript: kanon → lapisan data (`data*.js → .ts`).** Lanjutan W5
(kanon TS). PRD root `PRD - W11 Perluasan TypeScript — Lapisan Data.md` (Proceed:
**data-first / tier-relaks-yang-di-ratchet / defined-beachhead**). Lihat [[neosuite-ams-arc]].

**Progres commit:** `7b6438e` Fase0-1 (infra+pilot 3) · `9f53111` side-fix seed · `dd2c32d`
slice 2 (17 file 0-importer) · `58e422c` slice 3 (import/part3/part4) · `f8eb4d4` slice 4
(part1/procurement) · `77506dc` slice 5 (base/part2) · `8f05e8f` slice 6 (firmfin) ·
`40f0777` slice 7 (legal) · `bd10439` slice 8 (backoffice) · **`be996c2` BOSS `data.js`→`.ts`
(AMS, 149 importer, 🔒)**. **⇒ LAPISAN DATA SELESAI — tak ada `src/data*.js` tersisa.**
Berikut: view `.jsx→.tsx` (W12+). Setiap slice: lint0/typecheck-2tier0/build/59 vitest+fingerprint
+ live-proven (Partner, 0 console err).

**GOTCHA 3 — boss: JSDoc `@type` berhenti dihormati di `.ts` (temuan boss `be996c2`).**
`data.js` (.js, checkJs:false) → `data.ts`: JSDoc `/** @type {import('./types/globals').AmsData} */`
pada `export const AMS` **berhenti dihormati** begitu file jadi `.ts`. Efek GANDA: (1) AMS jadi
tipe literal konkret (bukan AmsData) → augmenter `AMS.proformaEngine=` (proforma dkk) TS2339;
(2) JSDoc `import('./types/globals')` tadinya mem-LOAD ambient kanon (`Window.BENCHMARKS`/
`amsResetFigures`) ke app program — kini tak → file kanon yg ditarik transitif app graph (via
`import {AMS_CANON} from './canon'`) error window-undefined. **Satu fix tutup keduanya:** JSDoc →
`import type { AmsData } from './types/globals'` NYATA + `export const AMS: AmsData = {…}`. Anotasi
nyata dihormati 2 tier; import nyata tarik ambient kanon ke app program; `AmsData` `[k]:unknown`
serap augmentasi. **Pelajaran: di `.ts` jangan andalkan JSDoc `@type` lintas-tier — pakai TS asli.**
Plus 4 cast `:any` forEach seed-normalisasi (QM_INSPECTIONS/EQR_REVIEWS/COMPLAINTS) + `CLIENTS.find`.
Live-proven Partner (Hartono W): facilities Rp403jt/84%, materiality Rp4.260M/3.195M/213jt, 0 err.

**GOTCHA 1 — canon-reachability (temuan slice 3):** `tsconfig.json` (kanon, full strict)
menarik tiap `.ts` di graf impor `canon_base/canon_part1 → data.js → {data_base, data_part1,
data_part2, data_part3, data_part4}`. Ke-5 file itu + boss WAJIB lolos `strict:true` (🔒),
BUKAN app-tier relaks — beda dari slice-2 (IIFE yg hanya main.jsx load). `checkJs:false`:
data.js sendiri tak dicek tapi `.ts` impornya tetap strict. Non-🔒 (import/procurement/firmfin/
legal/backoffice) import DARI data.js tapi tak di-import OLEH-nya → relaks. Fix strict type-only:
`(r:any[])` tuple, `over:any={}`, `!` seed `.find()`, `:any` param eksplisit.

**GOTCHA 2 — riak tipe antar-.ts data (temuan slice 8):** ubah leaf yg di-import sibling `.ts`
data (yg ada di `include`) → ekspornya jadi konkret → error akses-properti di konsumen. BO
di-import 9 sibling `.ts` → ketik ekspor namespace `const BO: any` di hulu (hentikan riak).
firmfin/legal tak beriak (konsumennya `.jsx` view, di luar include). **Pelajaran utk boss:**
konversi data.js akan paparkan riak ke SEMUA `.ts` data — AMS sudah typed AmsData (JSDoc);
rencanakan export `any`/luwes.

**Slice 2 learnings (skala):** root-var cast `const A: any = AMS` (satu edit lumpuhkan puluhan error/file);
augmentasi `(AMS_CANON as any).foo=` (isak35/syariah/sakroadmap/psak117 tambah metode kanon);
`Object.values(dyn).sort/map`→param `:any`. 8 window residual baru di app-globals (RETENTION/MODULE_INDEX/
TRAVEL/TAX/TAX23/STANDARDS_REGISTRY/IRM/RELATED_SA). 102 error→0. Live: boot OK (17 IIFE jalan),
records/tax23/platform render, 0 console err.

**Fase 0–1 SELESAI (beachhead).** Infra + pilot 3 file (mewakili 3 bentuk data-file):
`data_facilities` (ESM-export leaf, 2 importer), `data_proforma` (IIFE augment AMS),
`data_licensing` (dual-publish `window.LICENSING`, belum di-strip). Semua gate hijau
(lint 0 · typecheck 2-tier 0 · build OK · 59 vitest + fingerprint identik) + **live-proven**
(Partner login): facilities render figur FAC (Rp 1.750/403/84), sjah3420 render proforma
(goodwill 29.040 / FVNIA 53.700), `window.LICENSING.summary()` → 3 AP (Hartono Wijaya CPA,
PPL 24, "Rotasi Wajib"), 0 console error tiap route.

**Infra dua-tier (terpisah):** kanon `tsconfig.json` tetap **full strict**, tak tersentuh.
Baru `tsconfig.app.json` **relaks** (`strict:false`/`noImplicitAny:false`/`strictNullChecks:false`/
`checkJs:false`/`allowJs:true`), `include`=**daftar eksplisit** file terkonversi (tumbuh per slice,
bukan glob). `npm run typecheck` = `tsc --noEmit && tsc -p tsconfig.app.json --noEmit` (keduanya 0).
Baru `src/app-globals.d.ts` = augmentasi Window utk `window.<NS>` residual (FIRMOPS, LICENSING…) —
peta kopling sisa utk window-strip-2; terpisah dari `types/globals.d.ts` kanon.

**GOTCHA resolver (penentu resep):** Vite/Rollup **TIDAK** resolve specifier `./x.js` → file `x.ts`
(build "Could not resolve"). **Extensionless** `./x` resolve ke `.ts` (= konvensi kanon W5
`import './canon'`). ⇒ konversi BUKAN rename-saja: **tulis ulang tiap importer ke extensionless**
(termasuk side-effect `main.jsx`). Resep penuh + slice-list di **BUILD.md §W11**.

**Error pola (semua type-only, nol-runtime):** (1) arity param opsional `f(list)`→`f(list?)`,
`mk(…,opts)`→`(…,opts?)`; (2) `unknown` dari index-sig AmsData (AMS sempit WTB/AJE sampai slice
AMS terakhir) → cast `(AMS as any).X` atau wrapper `const A=():any=>AMS||{}`; (3) `Date−Date` →
`.getTime()`; (4) baca/tulis `window.<NS>` residual → deklarasi di `app-globals.d.ts`.

**Slice-list backlog (urut #importer bernama, terkecil dulu):** ✅ pilot(3). Lalu ~17 file
0-importer (IIFE augment, cheap) → `data_import`(1, W9-wired hati2)/part3/part4 → facilities✅/
part1/procurement(2) → base/part2(3) → firmfin(4) → legal(8) → backoffice(16) → **`data`(AMS,
147 importer = the boss, TERAKHIR**, di luar beachhead). Detail tabel: BUILD.md §W11.
Setelah data: arc view `.jsx→.tsx` (W12+).

**Side-fix (BUKAN W11):** `server/src/seedData.ts` 2 regresi pra-ada dari window-strip:
`loadAmsSeed()` baca `g.window.AMS` (dilucuti slice 10z `9d14ad8` → seed gagal "FIRM undefined") +
`loadConnectorSeed()` baca `g.window.IMPORT` (dilucuti `e627004` → uji `connector seed blueprint`
RED 0<8). Perbaiki keduanya: ambil ekspor ESM (`mod.AMS`/`mod.IMPORT`) + tetap isi stub window utk
pembaca hilir. 116 server vitest hijau. Tak ketahuan sebelumnya: tak ada `dev.db` & server-test tak
di-rerun pasca-strip. [[neosuite-ams-window-strip]]
