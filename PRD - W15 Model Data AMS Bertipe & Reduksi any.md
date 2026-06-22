# PRD — W15 · Model Data AMS Bertipe & Reduksi `:any` (boundary) + Test `.js→.ts`

> Status: **DRAFT — menunggu sign-off ("Proceed.")**
> Tanggal: 2026-06-22 · Pemilik: Ari Widodo · Arc: lanjutan W11–W14 (TypeScript migration)
> Memory terkait: `[[neosuite-ams-w14-typescript-strict]]`, `[[neosuite-ams-next-session]]`, `[[neosuite-ams-w13-typescript-foundation]]`

---

## Problem

W13 mengubah seluruh app jadi TypeScript dengan menyiram **6.013 `:any`/`as any`** (codemod Fase 4 + W12). W14 men-flip `strict:true` penuh — **tetapi** jaring-tipe nyaris tak menangkap apa-apa karena `:any` jenuh meng-korslet aliran-tipe (temuan kunci W14: strict "murah" justru karena ini). Akibatnya:

1. **Model data master `AMS` praktis tak bertipe.** `AmsData` hanya mengetik `WTB`/`AJE`/`fmt`/`rp`; **~75 koleksi lain** (`RISKS`, `CLIENTS`, `ENGAGEMENTS`, `TEAM`, `WORKPAPERS`, `REVIEW_NOTES`, `TIME_ENTRIES`, `PIPELINE`, …) jatuh ke `[k: string]: unknown`. Salah nama field / salah bentuk = **tak tertangkap kompilator**.
2. **Cast yang MELUMPUHKAN tipe yang sudah ada.** Ada **20 `(AMS_CANON as any).X()`** dan **62 `(AMS as any).Y`** yang secara aktif membuang tipe kanon (`canon_types.ts`) & `AmsData` yang sudah valid — ini regresi jaring-tipe, bukan sekadar utang.
3. **Tak ada rem regrowth.** Tanpa lint-rule, `:any` baru bebas masuk di kerja view berikutnya.
4. **Test masih `.js`** (10 berkas) — migrasi TS belum tuntas; berkas test tak ikut type-checked.

## Objective

Menaikkan **nilai nyata jaring-tipe** dengan membangun **model data `AMS` yang nyata** (paritas-kanon, SSOT) dan **memulihkan tipe di boundary** (canon ↔ data ↔ view), **bukan** menyapu buta seluruh 6.013 `:any`. Kunci durabilitas dengan ratchet ESLint. Tuntaskan migrasi test ke `.ts`.

## Success Criteria (terukur)

1. **Model bertipe:** `AmsData` mengetik koleksi bernilai-tinggi dengan interface nyata (target awal: `RISKS`, `CLIENTS`, `ENGAGEMENTS`, `TEAM`, `WORKPAPERS`, `REVIEW_NOTES`, `TIME_ENTRIES`, `PIPELINE`, `INVOICES`, `DEADLINES`, `ACTIVITY` — daftar final dikunci di Fase 0). Index signature dipersempit untuk ekor yang belum diketik (tetap kompil).
2. **Boundary bersih:** `(AMS_CANON as any)` **= 0** (20→0). `(AMS as any)` direduksi tajam; sisa **hanya** yang ber-justifikasi (pola augmenter / kunci dinamik), **masing-masing ber-komentar invarian**, jumlah dilaporkan jujur.
3. **Delta `:any` jujur:** total `:any`/`as any` turun dengan angka **terukur & dilaporkan** (before/after), bukan klaim "0". Tail view sengaja ditinggal (lihat Non-Scope).
4. **Ratchet aktif:** `@typescript-eslint/no-explicit-any` level **warn** terpasang; `npm run lint` hijau (warn tak menggagalkan; mencegah backsliding & terlihat di review).
5. **Test `.ts`:** 10 berkas test/fixture/setup → `.ts`; **59 vitest migration + 116 server** hijau.
6. **Nol regresi numerik:** `canon_regression` fingerprint **identik**; `tsc --noEmit` (config tunggal W14) **0 error**; `npm run build` hijau; live-proven nav ≥5 view lintas-WS; **CI hijau**.

## Scope

- Interface model untuk koleksi `AMS` bernilai-tinggi (data SSOT yang dibaca lintas view/kanon).
- Penghapusan cast boundary `(AMS_CANON as any)` / `(AMS as any)` → akses bertipe nyata.
- Propagasi tipe ke **situs pembaca koleksi** (lapisan `data_*.ts` + view yang mengonsumsi koleksi ter-tipe), mis. `RISKS.map((r:any)=>…)` → `(r: RiskRow)=>`.
- Ratchet ESLint `no-explicit-any` (warn).
- Konversi 10 test `.js→.ts`.
- Docs BUILD.md §W15 + update memory + push + verifikasi CI.

## Non-Scope (sengaja)

- **Ekor `:any` lapisan-view**: param callback `(r:any)=>` & destrukturisasi prop `({…}:any)` internal di leaf view — keluaran mekanis codemod, ROI keamanan ~nol, churn besar. (Bisa jadi W16 opsional bila diinginkan.)
- **Window-strip-2** (melucuti `window.X` residual di `app-globals.d.ts`) — arc terpisah.
- **Adopsi `@types/react`** — pola React-class boundary `:any` W13 dipertahankan.
- **Perubahan angka kanon apa pun.**
- **Hapus index signature `AmsData` sepenuhnya** (akan memaksa semua 75 koleksi ter-tipe sekaligus — di luar slice ini).

## Constraints

- Nol regresi numerik — gerbang `canon_regression`.
- Satu `tsconfig.json` full-strict (warisan W14) — semua harus 0-error di situ.
- ESM-only; edit hanya `migration/src/*`.
- Verifikasi UI: vite :5180 (launch "vite") + backend :5181 standalone (`PORT=5181 npm --prefix ../server run dev`). JANGAN :5188. Login Partner `hartono.w@whr-cpa.id`/`Partner#2025!`; nav = `setItem('ams.route','<id>')` polos + reload.
- Gate pre-commit (mirror CI): migration `lint`+`typecheck`+`test`+`build`; server `typecheck`+`test`. **Jalankan server typecheck** (pelajaran CI W14).

## Existing Solutions (pakai dulu, jangan reinvent)

- `canon_types.ts` — permukaan tipe kanon (`WtbRow`/`AjeRow`/`Figures`/`Fig`/`MaterialityResult`/`FsModel`). **Diperluas, bukan diganti.**
- `canon_selectors.ts` — seam konsumsi bertipe (`figures()`/`fig()`/`materialityFor()`). View idealnya menarik tipe dari sini.
- `AmsData` di `types/globals.d.ts` — titik anotasi `@type` untuk `export const AMS`. **Diperluas di sini.**
- Resep migrasi W11/W12/W14: rename + rewrite specifier extensionless + sub-agen paralel cluster-disjoint untuk propagasi.

## Proposed Approach

**Struktur tipe:** koleksi domain (non-kanon) ditaruh di berkas tipe baru **`src/ams_types.ts`** (paralel `canon_types.ts`), di-impor oleh `AmsData` (`types/globals.d.ts`) dan `data.ts`. `canon_types.ts` tetap khusus permukaan-numerik-kanon. `AmsData` menyimpan **index signature yang dipersempit** agar ekor koleksi tak-bertipe tetap kompil tanpa harus mengetik 75 koleksi sekaligus.

**Disiplin (warisan D3 W14):** ganti `as any` dengan akses bertipe nyata; bila bentuk benar-benar dinamik (augmenter `Object.assign(AMS_CANON, …)`, kunci dinamik) → cast minimal **ber-komentar invarian** dan dihitung. Tanpa `:any` baru tak-ber-justifikasi.

## Implementation Plan (urutan dependensi)

- **Fase 0 — Fondasi model.** Buat `src/ams_types.ts`; kunci daftar koleksi target (audit field nyata dari `data.ts`/`data_*.ts`, paritas pemakaian canon). Sambungkan ke `AmsData` + persempit index signature. Gate: typecheck 0, build, fingerprint identik. (Belum ubah call-site → delta nol, fondasi saja.)
- **Fase 1 — Bersihkan cast boundary.** `(AMS_CANON as any)` 20→0; `(AMS as any)` 62→sisa-ber-justifikasi. Tiap berkas: typecheck per-berkas, catat `as any` tersisa + alasan. Sub-agen paralel cluster-disjoint.
- **Fase 2 — Propagasi tipe ke pembaca koleksi.** Ganti `:any` di situs yang membaca koleksi ter-tipe (data_* + view konsumen) dengan interface `ams_types`. Hanya koleksi bernilai-tinggi; ekor leaf-view dilewati (Non-Scope). Sub-agen paralel.
- **Fase 3 — Ratchet ESLint.** Tambah `@typescript-eslint/no-explicit-any: 'warn'`. Pastikan `lint` tetap hijau (warn). Dokumentasikan kebijakan.
- **Fase 4 — Test `.js→.ts`.** Konversi 8 `*.test.js` + `__fixtures__/wtb.js` + `__tests__/setup.js`; verifikasi vitest pickup `.ts`, 59 hijau, fingerprint identik.
- **Fase 5 — Docs + push.** BUILD.md §W15; update memory; push; tonton CI (`gh run watch`).

Tiap fase = commit terpisah, gate hijau + (bila menyentuh UI) live-proven sebelum lanjut.

## Risks

- **Cascade saat mengetik koleksi** — satu interface menyingkap salah-bentuk di banyak konsumen. *Mitigasi:* index signature dipertahankan untuk ekor; ketik per-koleksi; sub-agen per-cluster; bila bug nyata tersingkap → laporkan (itu nilai jaring-tipe, bukan kegagalan).
- **Pola augmenter** (`data_*.ts` meng-`Object.assign` ke `AMS_CANON`) bisa pecah saat cast dilepas. *Mitigasi:* ketik permukaan augmenter atau pertahankan cast ber-komentar (dihitung di SC#2).
- **`no-explicit-any` membanjiri** bila dipasang `error` (≈6.000 warning). *Keputusan terkunci:* level **warn** (ratchet), bukan error — terlihat tanpa menggagalkan CI.
- **Test `.ts`** — resolusi vitest/tsx untuk fixture yang diimpor; pastikan path & tipe fixture benar.
- **Regresi numerik tersembunyi** — selalu jalankan `canon_regression` tiap fase.

## Keputusan (terkunci via AskUserQuestion 2026-06-22)

- **D1 Kedalaman scope = Model + boundary** (koleksi AMS bernilai-tinggi + hapus cast canon-boundary; ekor view ditinggal). *Bukan* full-sweep ke ~0.
- **D2 Regrowth guard = ESLint ratchet** `no-explicit-any` (warn).
- **D3 Test `.js→.ts` = ikut di W15.**

## Open Questions

1. **Daftar final koleksi target Fase 0** — diusulkan ~11 koleksi bernilai-tinggi di SC#1; akan dikunci setelah audit field nyata di Fase 0. Setuju mengunci daftar saat Fase 0 (bukan sekarang)?
2. **Ambang "sisa `as any` ber-justifikasi"** di SC#2 — target angka spesifik atau cukup "seminimal mungkin, tiap sisa ber-komentar"? (Usulan: yang kedua, seperti `!`-budget W14.)
