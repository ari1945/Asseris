---
name: neosuite-ams-w14-typescript-strict
description: "W14 — strict penuh app-tier + unifikasi tsconfig + infra .js→.ts; resep, gotcha, progres (SELESAI)"
metadata: 
  node_type: memory
  type: project
  originSessionId: e1880d87-71bf-41ab-9637-66342c8cf987
---

**W14 — Strict penuh (app-tier) + unifikasi `tsconfig` jadi SATU + infra `.js → .ts`. SELESAI.**
Lanjutan W13 (fondasi `.tsx` + `noImplicitAny`). PRD root: `PRD - W14 Strict Penuh, Unifikasi
tsconfig & Infra .js to .ts.md` (sign-off "Proceed." 2026-06-22).
Lihat [[neosuite-ams-w13-typescript-foundation]] · [[neosuite-ams-arc]].

## Keputusan terkunci (AskUserQuestion 2026-06-22)
- **D1 Cakupan = full strict + unify tsconfig + infra `.js→.ts`.** Arc hardening TERBATAS.
- **D2 `:any`-reduction = DITUNDA penuh W15** (model data AMS nyata = arc tersendiri).
- **D3 Null-flow = guard nyata / optional-chaining diutamakan**; `!`/`as` hanya bila invarian terbukti, **dihitung**.
- **D4 Urutan = dependensi:** infra `.js→.ts` → flip full strict → unifikasi config.

## TEMUAN KUNCI (membentuk rencana)
Full strict app-tier = **hanya 163 error** (terukur scratch). **Murah JUSTRU karena saturasi `:any`
W13 meng-korslet aliran-null** — pisau bermata dua: hardening murah, tapi SNC menangkap *sedikit*
sampai `:any` dikurangi (W15). Inilah alasan memisah W14 (kompilator) dari W15 (model).
**GOTCHA ukur:** `strict:true` TAK berlaku bila `strictNullChecks:false` masih tertulis eksplisit
(override) — saat flip WAJIB hapus baris override itu, bukan cuma set strict:true.

## Progres commit (semua gate hijau + live-proven; BELUM PUSH)
- **`bfa08f9` Fase 0 (infra `.js → .ts`, 7 berkas):** api/rbac/llm_providers/export_pdf/export_xlsx/
  related_modules_data/related_modules_data2. Resep W11/W12 (rename + rewrite specifier extensionless
  + include + type-only). Kunci: `const api:any` (klien tRPC tanpa AppRouter lintas-paket) −40 TS2339;
  `const LINEAGE:any` (di-augmentasi ~20 key lintas 2 file) −cascade; `(window as any)` bus;
  `Object.values(byMod) as any[]`; `declare module 'qrcode'`. **CROSS-PAKET:** `server/src/rbac.ts`
  impor `../../migration/src/rbac.js` → ubah extensionless `./rbac` (Bundler+tsx resolve `.ts`; rename
  `.js` memutus path lama). Server typecheck+test wajib (R6). 126→0 manual (api 48 terbesar).
- **`a4c2c78` Fase 1 (flip full `strict:true`):** hapus override SNC:false+noImplicitAny. **167 err → 0:**
  (1) **akar-tunggal −90** = `window.useAmsPersist` di `types/globals.d.ts` dijadikan **NON-OPSIONAL**
  (selalu dipublikasi contexts saat load-modul sebelum render) → memutus 45 TS18048 + 45 TS2722 di
  call-site (fix JUJUR, bukan 45 guard). (2) **77 sisa null-flow** di 21 file via **4 sub-agen paralel
  cluster-disjoint** (resep efisien W12), DISIPLIN D3 = guard nyata (`?.`/`?? 0`/`?? '—'`/`|| []`/
  `if (!x) return`/`(e as any).message` catch-unknown/anotasi tuple `([k,v]:[string,any])` TS2345
  Object.entries). **`!` HANYA 6 total**, semua ber-komentar invarian-terbukti: data_psak117 ×3 (find
  atas literal statis) · view_platform2 ×2 (IMPORT boot-order AMS) · view_dms ×1 (filter-terjamin) —
  SC#4. Side-benefit: 2 bug laten pra-ada kini aman (psak65 `WTB.find('4-1100')`→`?.adj ?? 0`;
  materiality `pickBench`→no-op).
- **`da45a03` Fase 2 (unifikasi tsconfig) ⇒ W14 SELESAI:** gabung `tsconfig.json`+`tsconfig.app.json`
  → **SATU** `tsconfig.json` full-strict, `include` = **glob** `src/**/*.ts(x)` (bukan daftar eksplisit —
  menutup mode-gagal "lupa tambah file ke include" W11). **HAPUS `tsconfig.app.json`.** `typecheck` →
  `tsc --noEmit` tunggal. **R7 bersih:** hanya `package.json` typecheck script merujuknya (ESLint
  non-type-aware, Vite=esbuild, CI lewat script). Config-only ⇒ bundle byte-identik Fase 1.
- **`dcbeb92` docs:** BUILD.md §W14 + perbarui deskripsi tier (kini SATU config).

## POLA & GOTCHA (bank)
- **GOTCHA arrow tanpa kurung** (warisan W13 Fase 4, terpakai lagi): param arrow `r =>` TAK boleh
  ber-anotasi → `(r:any) =>`.
- **SNC murah saat `:any` jenuh** — bukan keberhasilan jaring-tipe; nilai nyata = W15 model AMS.
- **Akar-tunggal optional window-bus**: prop bus `window.X` yang SELALU ada saat runtime sebaiknya
  **non-opsional** di `types/globals.d.ts` — satu edit mematikan banjir TS18048/TS2722 di semua
  call-site (useAmsPersist −90). Jauh lebih baik dari guard per-situs.
- **Cross-paket `.js`→`.ts`**: bila server impor file migration dgn `.js` eksplisit, rename memutusnya
  → ubah ke extensionless (Bundler + tsx resolve `.ts`). Jalankan server gate.
- **Unify = glob** akhir-keadaan: setelah semua src `.ts(x)` & strict-bersih, ganti daftar eksplisit
  dgn `src/**/*.ts(x)` (uji scratch dulu → 0, baru hapus config kedua).
- **Sub-agen paralel** efektif utk null-flow cluster-disjoint dgn instruksi D3 ketat + verifikasi
  per-file + lapor `!`. 4 agen, 77 err, 6 `!`.

## Verifikasi (sama W12/W13)
- vite :5180 (launch "vite") + backend :5181 standalone (`PORT=5181 npm --prefix ../server run dev`).
  JANGAN "prod" :5188. Login Partner `hartono.w@whr-cpa.id`/`Partner#2025!`. Nav = `setItem('ams.route',
  '<id>')` POLOS + reload. Screenshot app besar timeout → pakai eval/console_logs.
- Gate pre-commit: migration `lint`+`typecheck`(kini tunggal)+`test`(59)+`build`; server `typecheck`+
  `test`(116) bila menyentuh data graf / rbac. fingerprint kanon `canon_regression`.

## Sisa W15 (backlog)
1. **`:any`-reduction** — interface model AMS nyata (`AMS`/`WTB`/`AJE`/`RISKS`/…, paritas-kanon)
   ganti ~7.000 `:any` W13 → naikkan nilai jaring-tipe.
2. **Test `.js → .ts`** (`*.test.js`/`__fixtures__/*.js`/`__tests__/setup.js`).
