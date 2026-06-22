# PRD — W14 · Strict Penuh (app-tier), Unifikasi `tsconfig` & Infra `.js → .ts`

> Status: **Keputusan terkunci (D1–D4) — menunggu "Proceed." untuk mulai Fase 0** · Penulis: Claude (atas arahan Ari) · 2026-06-22
> Arc terkait: W11 (data→`.ts`, SELESAI) · W12 (view→`.tsx`, SELESAI 173/173) · **W13 (fondasi→`.tsx` + `noImplicitAny`, SELESAI)** ·
> memory `[[neosuite-ams-w13-typescript-foundation]]` · `[[neosuite-ams-w12-typescript-view]]` · `[[neosuite-ams-arc]]`

---

## 1. Problem

W13 menutup **cakupan berkas** (nol `.jsx` di `migration/src`) dan menyalakan **`noImplicitAny:true`** di
tier-app. Tapi tier-app **belum type-sound**:

- **`strictNullChecks:false`** — seluruh aliran null/undefined tak diperiksa. Pemanggilan
  `obj.maybeUndef.foo`, invoke fungsi yang bisa `undefined`, indeks yang bisa `null` — semua lolos.
- **Sisa keluarga `strict` mati** (`strictFunctionTypes`, `strictBindCallApply`,
  `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`).
- **Dua `tsconfig` terpisah** (`tsconfig.json` kanon **full-strict** + `tsconfig.app.json` **relaks**) =
  jahitan pemeliharaan: dua `include` tumbuh-paralel, dua invokasi `tsc`, dua tingkat ketegasan.
- **7 berkas infra `.js`** (`api`/`rbac`/`llm_providers`/`export_pdf`/`export_xlsx`/`related_modules_data`/
  `related_modules_data2`) masih **allowJs-resolusi-saja, `checkJs:false`** — tak diperiksa tipe sama sekali,
  padahal `api.js` (klien tRPC) & `rbac.js` (logika kapabilitas) adalah permukaan kritis.

**Temuan terukur (scratch flip, 2026-06-22):** menyalakan **full `strict:true`** di tier-app kini hanya
memunculkan **163 error** (78× TS18048 possibly-undefined · 46× TS2722 invoke-possibly-undefined · 22×
TS18047 possibly-null · sisa kecil TS2345/2532/2538/2531/2339/18046). **Kecil — justru karena saturasi
`:any` W13 meng-korslet aliran-null.** Ini pisau bermata dua: hardening **murah** sekarang, tapi SNC juga
**menangkap sedikit** sampai `:any` dikurangi (→ W15). W14 menuntaskan **ketegasan kompilator**; nilai
jaring-tipe penuh menyusul saat model data nyata dibangun (W15).

## 2. Objective

1. **Tier-app → full `strict:true`** (SNC + seluruh keluarga strict). Perbaiki ~163 error dengan
   **guard nyata / optional-chaining** (D3); `!`/`as` hanya bila invarian terbukti aman.
2. **Konversi 7 infra `.js → .ts`** dengan resep sama-terbukti W11/W12 (rename + tulis-ulang specifier
   extensionless + masuk `include` + perbaiki type-only). Diperiksa strict bersama sisa app.
3. **Satukan dua `tsconfig`** menjadi **satu config strict**: kanon (sudah full-strict) + app bergabung di
   satu `include`, satu `tsc --noEmit`. Skrip `typecheck` disederhanakan ke satu invokasi.
4. Setelahnya: tier-app **full-strict-bersih**, satu config, **0 `migration/src/*.js`** kecuali test/fixture
   (ditunda eksplisit). **`:any`-reduction TIDAK disentuh** (W15).

## 3. Success Criteria

1. **App tier full `strict:true`**, `typecheck` **0 error**; **satu** `tsconfig` strict (bukan dua);
   `npm run typecheck` = **satu** invokasi `tsc --noEmit` 0 error.
2. **7 infra `.js → .ts`**; **0 `migration/src/*.js`** kecuali `*.test.js`/`__fixtures__/*.js`/`__tests__/setup.js`
   (ditunda W15 — test-infra).
3. **Nol regresi numerik:** 59 vitest migration + 116 server vitest hijau, snapshot fingerprint kanon
   **identik**, `npm run build` hijau (tak ada "Could not resolve"), render live **0 console error**
   (login Partner, **lintas-route** — R-router W13).
4. **Disiplin null-flow terukur & dilaporkan** (mirror kejujuran rasio `:any` W13): perbaikan utamakan
   guard/`?.`/`??`; **hitung & catat jumlah `!` non-null-assertion baru** — bila tinggi di suatu titik,
   dicatat sebagai utang, bukan disembunyikan.
5. Setiap konversi/flip = **struktural & type-only** (tanpa perubahan logika/perilaku runtime) **kecuali**
   guard null yang **menambah cabang aman setara** (mis. `x?.f()` ekuivalen bila `x` memang ada saat runtime;
   `?? default` tak mengubah jalur eksisting). Bila suatu guard mengubah perilaku, **di-flag**, bukan diam.

## 4. Scope (D1 = full strict + unify + infra)

| Bagian | Isi | Estimasi |
|---|---|---|
| **A. Infra `.js → .ts`** | `api` · `rbac` · `llm_providers` · `export_pdf` · `export_xlsx` · `related_modules_data` · `related_modules_data2` | 7 berkas |
| **B. Flip full strict** | `tsconfig.app.json` `strict:false → true` (hapus override eksplisit `strictNullChecks:false`/`noImplicitAny` redundant) | ~163 error |
| **C. Unifikasi tsconfig** | Gabung `tsconfig.json` (kanon) + `tsconfig.app.json` → satu config strict; `typecheck` = satu `tsc` | config |

## 5. Non-Scope (eksplisit — W15+)

- **`:any`-reduction / model data AMS nyata** (D2 = **ditunda penuh**). W13 menambah ~7.000 penanda `:any`;
  menggantinya dengan interface `AMS`/`WTB`/`AJE`/`RISKS`/… (paritas-model) = arc tersendiri (W15), bukan W14.
- **`*.test.js` · `__fixtures__/*.js` · `__tests__/setup.js` → `.ts`** — test-infra, ditunda. Tetap di-resolve
  via `allowJs` (dipertahankan di config tersatukan).
- **Server** (`server/`) — sudah full-strict dengan tsconfig sendiri; W14 tak menyentuhnya (kecuali bila
  konversi infra menyentuh graf `seedData.ts` → wajib server-gate, lihat R6).
- **Kanon `tsconfig.json` ketegasan** — sudah full-strict; W14 hanya **menggabung**, bukan mengubah ketegasannya.

## 6. Constraints

- **Resolver gotcha (penentu resep):** Vite/Rollup tak resolve `./x.js` → `x.ts`. ⇒ konversi infra **wajib**
  tulis-ulang tiap importer ke **extensionless** (`from './api'`), termasuk side-effect & test importer.
- **Override eksplisit menutupi `strict`:** `strict:true` **tak berlaku** bila `strictNullChecks:false` tetap
  tertulis (terbukti scratch: full.json salah-ukur 4 vs 163). ⇒ saat flip, **hapus** baris override
  `strictNullChecks:false` (dan `noImplicitAny` redundant) agar `strict:true` mengatur semua.
- **`useUnknownInCatchVariables`** (bagian `strict`) → `catch(e)` kini `unknown`: pola eksisting `catch(e){}`
  aman; `catch(e){ e.message }` perlu `(e as any)`/narrow. Banyak `try/catch` persist — antisipasi.
- **Babel & React dipin** (versi+integrity) — jangan ubah. `allowJs:true` **dipertahankan** (test `.js`).
- **Target verifikasi (gotcha W12/W13):** app migration via launch **"vite" :5180** + backend **:5181 standalone**
  (`PORT=5181 npm --prefix ../server run dev`). **JANGAN** "prod" :5188 (app beku). Nav uji =
  `localStorage.setItem('ams.route','<id>')` **POLOS** + reload. Screenshot app besar bisa timeout → pakai
  `preview_eval`/`console_logs`.
- **Gate pre-commit (mirror CI):** migration `lint`+`typecheck`+`test`+`build`; **server `typecheck`+`test`**
  bila slice menyentuh graf `seedData.ts → data*.ts` (R6).

## 7. Existing Solutions (kenapa custom dibenarkan)

Resep konversi `.js→.ts` & flip-ketegasan sudah terbukti 3 arc (W11/W12/W13): tier eksplisit + `include`
tumbuh + gate identik + live-prove + (W13) flip flag→perbaiki ledakan + ukur-lapor rasio. W14 **menggunakan
-ulang** semuanya; yang baru hanya **unifikasi config** (mekanis: gabung dua `include`, satu `tsc`) dan
**disiplin null-flow** (guard, bukan assertion). Tak ada yang ditemukan dari nol.

## 8. Proposed Approach & Recipe (D2/D3)

**A. Infra `.js → .ts`** (per berkas, struktural):
1. `git mv src/<m>.js src/<m>.ts`.
2. Tulis-ulang SEMUA importer `from './<m>.js'`/`'./<m>'` → `'./<m>'` (extensionless); termasuk test importer.
3. Tambah `src/<m>.ts` ke `include`.
4. Perbaiki type-only (implicit-any param spt W13 bila ada; interop pustaka `jspdf`/`xlsx` → tipe longgar
   bila perlu, `:any` bus dinamis sah).

**B. Flip full strict** (`tsconfig.app.json`):
1. Set `strict:true`; **hapus** `strictNullChecks:false` + `noImplicitAny` (redundant di bawah `strict`).
2. Perbaiki ~163 error — **D3 = guard nyata diutamakan:**
   - `x` possibly-undefined/null (TS18048/18047/2532) → `x?.`/`x ?? def`/`if (!x) return`/guard awal.
   - invoke possibly-undefined (TS2722, mis. `useNav()` opsional, callback prop) → `fn?.()` atau cek `typeof
     fn==='function'` (aturan emas #6 — sudah pola fondasi).
   - `catch(e)` unknown → narrow `(e as any)` hanya di akses `.message` (sah; e memang dinamis).
   - `!`/`as` **hanya** bila invarian terbukti (mis. elemen DOM yang pasti ada pasca-mount); **hitung**.

**C. Unifikasi tsconfig:**
1. Gabung: `tsconfig.json` jadi satu-satunya config (strict penuh), `include` = kanon `.ts` + seluruh app
   `.ts/.tsx` + `.d.ts` ambient. Pertahankan `allowJs`/`checkJs:false`/`skipLibCheck`/`jsx`.
2. Hapus `tsconfig.app.json` (atau jadikan `extends` tipis bila Vite/ESLint merujuknya — cek `vite.config`,
   `eslint.config.js`, `package.json`).
3. `typecheck` script → `tsc --noEmit` tunggal.
4. **Verifikasi kanon fingerprint identik** + canon vitest hijau (config tunggal tak boleh melonggarkan kanon).

**Gate tiap slice:** `lint`+`typecheck`+`test`(59)+`build` + fingerprint kanon identik + **live-prove** route
terdampak (Partner, 0 console err). Sub-agent paralel boleh utk infra disjoint (resep efisien W12).

## 9. Implementation Plan (D4 = urutan dependensi)

- **Fase 0 — Infra `.js → .ts` (7 berkas)** di bawah ketegasan app **saat ini** (noImplicitAny, SNC-off).
  Konversi + masuk `include` + perbaiki implicit-any. Memasukkan infra ke himpunan-tercek **dulu** agar flip
  strict (Fase 1) langsung mencakupnya. Boleh 1–2 commit (mis. `api`/`rbac` solo; `export_*`/`related_*` gabung).
- **Fase 1 — Flip full `strict:true`.** Hapus override; perbaiki ~163 (+ null-flow infra baru) dengan guard.
  **Live-prove SEMUA workspace/route** (R-router). Satu commit (atau pecah bila ledakan terbukti > perkiraan).
- **Fase 2 — Unifikasi tsconfig.** Gabung jadi satu config strict; sederhanakan `typecheck`; rujukan Vite/
  ESLint disesuaikan. Gate + **fingerprint kanon identik**. Satu commit. Lalu BUILD.md §W14 + tutup memory.

Tiap fase = satu/beberapa commit; tiap commit lewat gate lengkap.

## 10. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | **Unifikasi melonggarkan kanon** (config tunggal salah-set → kanon tak lagi full-strict) | Config tersatukan `strict:true`; verifikasi kanon vitest + **fingerprint identik** + count error kanon tetap 0 |
| R2 | **Infra strict meledak** (`api.js` klien tRPC dinamis; `export_*` interop `jspdf`/`xlsx`) | Konversi satu-per-satu, ukur; interop pustaka → tipe longgar/`:any` bus sah; `skipLibCheck` aktif |
| R3 | **`!` berlebihan menutupi bug null nyata** | D3 guard diutamakan; `!` hanya invarian terbukti; **hitung & laporkan** (SC#4) |
| R4 | **SNC di `contexts`/`app`** (hook 143×/router) — null-flow di provider/route | Guard defensif (aturan emas #6 sudah ada); live-prove **semua** route pasca-flip |
| R5 | **`useUnknownInCatchVariables`** memecah banyak `catch(e)` akses `.message` | Narrow `(e as any).message` (sah, e dinamis); sapuan terukur |
| R6 | **Infra menyentuh graf `seedData.ts`** (server typecheck terlewat — pola bug CI `6fbf005`) | Jalankan **server `typecheck`+`test`** bila Fase 0 menyentuh `data*.ts`/`rbac` yg diimpor server |
| R7 | **`tsconfig.app.json` masih dirujuk** (Vite/ESLint/CI) pasca-hapus | Grep rujukan dulu (`vite.config`/`eslint.config`/`package.json`/`.github`); sesuaikan sebelum hapus |

## 11. Open Questions

1. **`tsconfig.app.json` — hapus atau jadikan `extends` tipis?** Default: hapus bila tak ada perkakas merujuknya
   (R7); kalau Vite/ESLint butuh nama itu, sisakan stub `{"extends":"./tsconfig.json"}`.
2. **Pemecahan commit Fase 0** — 7 infra dalam 1 commit atau dipecah (`api`/`rbac` solo)? Default: `api`+`rbac`
   solo (kritis), `export_*`+`llm_providers`+`related_*` gabung.
3. **Test `.js` → `.ts`** — benar-benar ditunda W15, atau ikut sekalian bila murah? Default: **ditunda** (test-infra,
   di luar tema hardening produksi; `allowJs` tetap meng-cover).

## 12. Definition of Done

- App tier **full `strict:true`**; **satu** `tsconfig` strict; `typecheck` satu invokasi 0 error.
- 7 infra `.js → .ts`; **0 `migration/src/*.js`** kecuali test/fixture (ditunda W15).
- Semua gate hijau (lint/typecheck/test 59+116/build) + fingerprint kanon identik + live-proven lintas-route.
- Jumlah `!` baru dilaporkan (SC#4). BUILD.md §W14 + memory `[[neosuite-ams-w14-...]]` ditulis.
  **`:any`-reduction / model AMS + test `.js→.ts`** tercatat sebagai backlog **W15**.

---

### Keputusan terkunci (menunggu "Proceed.")
- **D1 — Cakupan = full strict + unifikasi tsconfig + infra `.js→.ts`.** Arc hardening **terbatas**; `:any`-reduction ditunda.
- **D2 — `:any`-reduction = DITUNDA penuh ke W15** (model data AMS = arc tersendiri).
- **D3 — Null-flow = guard nyata / optional-chaining diutamakan**; `!`/`as` hanya bila invarian terbukti, dihitung.
- **D4 — Urutan = dependensi:** infra `.js→.ts` (masuk himpunan-tercek) → flip full strict → unifikasi config.
