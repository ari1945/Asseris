---
name: neosuite-ams-w13-typescript-foundation
description: "W13 — TypeScript ke lapisan fondasi (16 .jsx → .tsx, hapus 6 shim .d.ts) + ratchet noImplicitAny; PRD, resep, slice-list, progres"
metadata: 
  node_type: memory
  type: project
  originSessionId: 050e0eb7-c1a9-4b3d-8ecd-75287527cb45
---

**W13 — Perluasan TypeScript: lapisan FONDASI (`.jsx → .tsx`) + ratchet `noImplicitAny`.**
Lanjutan W11 (data, SELESAI) & W12 (view, SELESAI 173/173). PRD root:
`PRD - W13 Fondasi TypeScript & Ratchet noImplicitAny.md` (sign-off "Proceed." 2026-06-22).
Lihat [[neosuite-ams-w12-typescript-view]] · [[neosuite-ams-w11-typescript-data]] · [[neosuite-ams-arc]].

## Keputusan terkunci (AskUserQuestion 2026-06-22)
- **D1 Cakupan = NOL `.jsx`.** 16 file fondasi/lintas-sektor `.jsx → .tsx`; hapus **6 shim `.d.ts`**;
  infra `.js` (api/rbac/llm_providers/export_pdf/export_xlsx) + `*.test.js` TETAP `.js` (calon W14).
- **D3 Ratchet = BERTAHAP.** Fase 4 = flip `tsconfig.app.json` → `noImplicitAny:true` saja.
  `strictNullChecks` + paritas-kanon penuh + penyatuan 2 tsconfig **DITUNDA W14**.
- **D2 Resep = identik W11/W12** + lever `:any` destructure-param utk shockwave hapus-shim.
- **D4 Urutan = blast-radius menaik:** leaf bersih → no-shim fondasi → ber-shim (shockwave) → ratchet.

## KOREKSI FAKTA (penting)
Memory lama menyebut "12 shim `.d.ts`". **Aktual di disk = 8 `.d.ts`; hanya 6 shim penambal-fondasi**
yang dihapus W13: `ui.d.ts`/`shell.d.ts`/`evidence.d.ts`/`wp_signoff.d.ts`/`ai_insights.d.ts`/
`diagnostics_panel.d.ts`. Dua sisanya **TETAP** (ambient sah, BUKAN shim): `types/globals.d.ts` (kanon)
+ `app-globals.d.ts` (peta kopling `window.*` residual; tumbuh tiap fase W13). Sebagian shim
view-provider sudah terhapus di W12 Slice B.

## Progres commit
- **`e9fd826` Fase 0 (pilot 3 leaf bersih):** `sa_canonical`/`related_modules`/`minimap` → `.tsx`.
- **`44d0742` Fase 1 (leaf bersih sisa):** `copilot`/`ai_extract`/`fsgen_model` → `.tsx`.
- **`4a7f058` Fase 2 (no-shim router/entry — DONE):** `icons`(185 imp)/`contexts`(153)/`app`(router)/`main`(entry)
  → `.tsx`. ~185 importer specifier `.jsx`→extensionless (1 perl). index.html `/src/main.jsx`→`.tsx`.
- **`970ba7b` Fase 4 (RATCHET TERMINAL — DONE) ⇒ W13 SELESAI:** flip `tsconfig.app.json`
  `noImplicitAny:false → true`. **66.433 err → 0** via DUA lever struktural: **(1) shim ambient
  `src/jsx-intrinsics.d.ts`** (di `include`) TANPA @types/react (React CDN-pin):
  `declare namespace JSX { interface IntrinsicElements { [k]:any } … }` + `declare module
  'react'/'react/jsx-runtime'/'react-dom/client'/'react-dom'` → tutup **58.487 TS7026** (elemen
  host JSX tanpa IntrinsicElements) + **371 TS7016** (impor React). PERMANEN/struktural (padanan
  shims-css), BUKAN penambal. **(2) codemod TS-API sekali-pakai diagnostik-terpandu** (dibuang,
  tak di-commit; BUKAN blanket sweep ⇒ param ter-infer kontekstual tetap tipe nyata) atas **7.482
  implicit-any NYATA**: TS7006 5.585 + TS7031 856 → `(x:any)`; TS7053 1.009 → `(expr as any)[k]`;
  TS7018 ~70 (multi-pass literal bersarang) → cast nilai; TS7034 32 → `:any[]`. **16 semantik
  manual:** TS2339 aje `const steps:any[]=[]` (evolving-array settle shape push-1) · TS2538 calc
  `Array.from(Set)→unknown[]` ⇒ `idxArr:any[]` · TS7011 arrow-return konteks-any `((): any=>null)`/
  `(): any[]=>[]`. **GOTCHA CODEMOD KRITIS:** param arrow tanpa kurung `r=>` TAK boleh ber-anotasi →
  WAJIB `(r:any)=>`; deteksi AST benar = `arrow.getStart()===param.getStart()` ⇒ tak-berkurung
  (cek "char-sebelum-param==`(`" SALAH: `(` milik `filter(`). **Rasio :any (SC#6 — utang W14
  jujur):** +5.940 `: any` + 1.068 `as any`. TINGGI BY DESIGN (tipe nyata butuh paritas-model AMS,
  ditunda W14); BUKAN kosmetik (hanya node ter-tandai tsc diberi any). Gate hijau (lint/typecheck
  2-tier/59+116 vitest/build/fingerprint identik) + live Partner dashboard/aje/calc/presentasi/
  clientportal 0 err. Type-erasure murni ⇒ JS emit identik. **Belum push.** BUILD.md §W13 `d2dbd48`.
- **`1f1555d` Fase 3 (ber-shim SHOCKWAVE — DONE):** `ui`(176)/`shell`(139)/`evidence`/`wp_signoff`/
  `ai_insights`/`diagnostics_panel` → `.tsx` + **HAPUS 6 shim .d.ts**. ⇒ **NOL .jsx di migration/src (D1 tercapai).**
  **SHOCKWAVE DIHINDARI** dgn menerapkan lever `:any` PROAKTIF saat konversi (bukan reaktif spt W12 518→0):
  `perl -i -pe 's/^(function \w+\()(\{.*\})(\) \{)/$1$2: any$3/' src/X.tsx` (greedy `\{.*\}` aman utk
  default `={}` di param) → konsumen lihat signature longgar SAMA dgn shim `(props:any)=>any` ⇒ ui/shell 0 err.
  Final-4 sisa 18→0: **+8 window-bus** app-globals (shell: NOTIFS/wsForModule/MODULE_IFRS; final-4:
  classifyDoc/PROGRAMME/CONFIRMATIONS/logAiUsage/amsLlmNarrateDiagnostics) · `const USER:any=AMS.USER||{}`
  (.name/.role) · arity TS2554 param opsional (`wtbVal(code,field?)`/`useDiagnostics(area?)` — **fix di PENYEDIA
  bukan konsumen** view_diagnostics) · `arr.map((f:any,i)=>)`. **Sisa .d.ts = app-globals + shims-css +
  types/globals (ambient SAH, bukan penambal-fondasi).** Ini titik **CHECKPOINT** sebelum Fase 4 ratchet.
- Tiap fase: typecheck 2-tier 0 · lint 0 · 59 vitest (fingerprint kanon identik) · build 0 ·
  live-proven Partner 0 console err.

## RESEP per file (struktural-saja)
1. `git mv x.jsx x.tsx`.
2. **Tulis-ulang SEMUA importer** `from './x.jsx'` → `from './x'` (extensionless) — **WAJIB**, resolver
   Vite tak map `./x.jsx`→`x.tsx`. Importer fondasi pakai specifier `.jsx` eksplisit (bukan extensionless!):
   icons 172 · ui 169 · contexts 143 · shell 137. Termasuk side-effect di `main.jsx` + import di `app.jsx`.
   Perl: `s{(['\"]\./x)\.jsx(['\"])}{$1$2}g` over `src/*.tsx src/*.jsx`.
3. **Hapus shim** `x.d.ts` bila ada → tipe nyata sumber ambil alih (Fase 3 = SHOCKWAVE).
4. Tambah `src/x.tsx` ke `include` `tsconfig.app.json` (array string; JANGAN sisip `"key":"val"` = JSON invalid).
5. Perbaiki error type-only (lihat pola di bawah).
6. Gate penuh + live-prove.

## POLA ERROR fondasi (terbank Fase 0–1)
- **Komponen inline ber-prop `key` → TS2322** "key tak ada di `{props}`": param destructure ter-infer tipe
  tertutup. Fix = `:any` di param: `const Chip = ({ c, side }: any) =>` / `function ExFieldRow({...}: any)`.
  Anotasi di **definisi** komponen (bisa di file lain bila diimpor, mis. ExtractReview di ai_extract dipakai copilot).
- **`window.X` tak-terdeklarasi → TS2339** (dicek walau tier relaks): tambah ke `app-globals.d.ts`.
  Sudah +5 Fase 0–1: `GROUP_WS`/`WORKSPACES`/`HIDDEN_GROUPS`/`MODULES`/`claude`.
  (Sudah ada dari W11: MODULE_INDEX/RELATED_SA + via globals.d.ts kanon: deriveWpStatus/openCanonicalWp/
  LINEAGE/__amsOpenSA — tertarik ke app-program via import-graph data→canon.)
- **`Array.from(any)` lib TS → `unknown[]`** (bukan any[]): `.name` dst → TS2339 unknown. Fix `const arr: any[] =`.
- **`Object.values/entries` → `unknown[]`**: callback param `:any`.
- **AMS-derived sempit/unknown** (AmsData `[k]:unknown`): `const X: any = AMS.Y` (cascade lumpuh banyak error).
- **Helper arity TS2554** (`f()` tapi `f(x)`): param opsional `(x?: any)`.
- **`Date−Date`**: `+a − +b`.
- fsgen_model **0-error bersih** (infer-bersih, dipertahankan .jsx di W12 tapi dikonversi W13 D1).
- **(Fase 2) Kelas React-class boundary**: TAK ada `@types/react`; `import React from 'react'` ter-resolve
  dari JS → `React.Component` ter-infer PARSIAL (tanpa state/props/setState) → generic `<any,any>` TAK
  menolong. Fix = basis ber-tipe any: `const ReactComponentBase: any = React.Component; class X extends
  ReactComponentBase {}` (extends-of-any suppress TS2339). Target ES2020 ⇒ `useDefineForClassFields=false`
  → deklarasi field juga aman, tapi any-base lebih sedikit churn & nol risiko clobber props.
- **(Fase 2) CSS side-effect import → TS2882** (`main.tsx import './x.css'`): butuh shim wildcard. **DUA
  syarat**: (1) `declare module '*.css' {}` dgn **BRACES** (shorthand `;` tak match specifier RELATIF), (2)
  di berkas **non-module** (TANPA top-level import/export) → ambient GLOBAL. Taruh di `app-globals.d.ts`
  (modul, ber-`export {}`) ⇒ wildcard jadi TERLINGKUP, tak berlaku. ⇒ buat `src/shims-css.d.ts` khusus
  (padanan `vite/client.d.ts`). Ini **shim ke-9 .d.ts** tapi PERMANEN/trivial (bukan provider-shim Fase 3).

## SISA (10 .jsx) — urutan Fase
- **Fase 2 — no-shim fondasi (giant-rewrite, TANPA shockwave):** `icons` (172 imp) · `contexts` (143) ·
  `app` (router `viewFor()` ~175 case + ViewErrorBoundary, **R2: live-prove SEMUA workspace/route**) ·
  `main` (entry side-effect). icons/contexts infer-bersih hari ini (tak ber-shim) — body kini dicek saat di-include.
- **Fase 3 — ber-shim (SHOCKWAVE, risiko tertinggi, CHECKPOINT dulu):** `ui` (169) → `shell` (137) →
  `evidence` → `wp_signoff` (575 LOC) → `ai_insights` → `diagnostics_panel`. Hapus shim → tipe nyata ambil
  alih → ratusan TS2741/2739 "prop hilang" di konsumen → **lever tunggal `:any` param destructure komponen
  ter-ekspor di penyedia** (terbukti W12 Slice B 518→0). Satu slice per file besar. **wp_signoff.d.ts/
  evidence.d.ts: file .tsx baru WAJIB superset SEMUA ekspor** (krn .d.ts ganti tipe modul).
- **Fase 4 — ratchet terminal (CHECKPOINT dulu):** `tsconfig.app.json` `noImplicitAny:false → true`. Ledakan
  implicit-any lintas data+view+fondasi → anotasi nyata diutamakan, `:any` hanya bus dinamis. **Ukur & laporkan
  rasio `:any`** (SC#6 — hindari ratchet kosmetik). Lalu BUILD.md §W13 + tutup memory.

## Verifikasi (cara terbukti)
- **Server: vite :5180 (launch "vite") + backend :5181 standalone** (`PORT=5181 npm --prefix ../server run dev`,
  dev.db SQLite ada). JANGAN "prod" :5188 (app beku). GOTCHA: rename .jsx→.tsx saat server hidup ⇒ HMR churn
  `[hmr] Failed to reload .jsx` (BUKAN runtime err) → bukti bersih = `preview_stop`+`preview_start` fresh.
- **Login Partner** (cookie httpOnly W10): POST `/trpc/auth.login?batch=1` body `{0:{email,password}}`
  **TANPA wrapper `json`** (no superjson transformer). Creds: `hartono.w@whr-cpa.id`/`Partner#2025!`.
- **Navigasi:** `localStorage.setItem('ams.route', '<id>')` (STRING POLOS, **BUKAN** `JSON.stringify`!) +
  `location.reload()`. KOREKSI: app.tsx baca RAW `localStorage.getItem('ams.route')||'dashboard'` (bukan
  JSON.parse) — `JSON.stringify` menambah kutip → route=`"psak46"` (berkutip) → tak ada case → StubView
  "MODULE SCAFFOLDED" (menyesatkan, tampak seperti router rusak padahal cuma navigasi salah).
- **Trigger global:** `window.__amsOpenMiniMap()` (minimap) · `window.__amsOpenCopilot()` (copilot).
- Cek `preview_console_logs level=error` = bukti 0 err. Rute uji per modul: sa_canonical→sa540, minimap→overlay,
  fsgen_model→route 'fsgen', ai_extract→'workpapers' (WpExtractions). FSGEN kini ESM-only (window-strip), tak di window.

## Gate pre-commit (mirror CI — JALANKAN SEMUA)
migration: `npm run lint` + `npm run typecheck` (2-tier) + `npm test` + `npm run build`.
server: `npm run typecheck` + `npm test` (server tsc full-strict ikut `seedData.ts → data*.ts`; bug CI `6fbf005`
dulu lolos lokal krn server-typecheck terlewat). **Slice fondasi W13 tak sentuh data*.ts graf → server gate
opsional, tapi jalankan bila ragu.** Commit langsung ke master (pola W11/W12); **belum push** (user belum minta).
