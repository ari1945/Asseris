# PRD — W11 · Perluasan TypeScript ke Lapisan Data (`.ts`)

> Status: **DRAFT — menunggu "Proceed."** · Penulis: Claude (atas arahan Ari) · 2026-06-19
> Arc terkait: W5 (kanon→TS, selesai) · legacy window-strip (selesai) · memory `[[neosuite-ams-arc]]`

---

## 1. Problem

Sejak W5, hanya **lapisan kanon** (10 file `.ts`, number engines) yang type-checked di bawah
`tsconfig.json` (full `strict`, di-`include` eksplisit). **Seluruh `.js`/`.jsx` aplikasi tidak
diperiksa tipe sama sekali** (`checkJs:false`, tidak masuk `include`). Konsekuensinya: kontrak data
yang dibaca seluruh app — 31 file `data*.js` (namespace `AMS`/`BO`/`FAC`/`FIRMFIN`/…) — tidak
punya jaring tipe. Bug bentuk-data (key salah ketik, field hilang, bentuk berubah) baru ketahuan saat
render/runtime, bukan saat `typecheck`.

Arahan: **perluas TS dari kanon → lapisan data** (`data*.js → .ts`), sebagai langkah pertama menuju
view (`.jsx → .tsx`, arc terpisah).

## 2. Objective

Membangun **beachhead** TypeScript di lapisan data: infrastruktur tier-relaks yang bisa di-ratchet,
**resep konversi yang terbukti** pada 2–3 file data leaf end-to-end (semua gate hijau, angka identik),
dan **backlog slice** terurut untuk sisa lapisan data. Bukan mengonversi semuanya sekarang.

## 3. Success Criteria

1. `npm run typecheck` mencakup **dua tier**: kanon (full-strict, tak berubah) **+ tier app
   relaks** — keduanya **0 error**, dijalankan satu perintah.
2. **2–3 file `data*.js` leaf** (blast-radius terkecil) dikonversi ke `.ts`, masuk tier app,
   `typecheck` 0 error.
3. **Nol regresi numerik:** 59 vitest kanon + snapshot fingerprint **identik**; render live modul
   terdampak **0 console error**.
4. ESLint tetap hijau (`no-undef`/`no-dupe-keys` = 0) untuk file `.js/.jsx` tersisa; file yang
   pindah ke `.ts` kini dijaga `tsc` (bukan ESLint) — **tidak ada penurunan cakupan gate**.
5. **Resep terdokumentasi** di `BUILD.md` (analog resep window-strip) + **slice-list** 31 file data
   terurut by blast-radius, dengan status.
6. Setiap konversi = **struktural-saja** (type-strip + rewire import bila perlu), **nol perubahan
   perilaku/angka** — dibuktikan per slice.

## 4. Scope (arc ini)

- **Fase 0** — Spike resolver + infra tier-app (`tsconfig.app.json`, `globals.d.ts` app, wiring
  `typecheck`).
- **Fase 1** — Konversi pilot **2–3 file data leaf** (kandidat: `data_facilities.js` [2 konsumen],
  `data_proforma.js`, `data_licensing.js` — diverifikasi di Fase 0) end-to-end melalui semua gate.
- **Fase 2** — Dokumentasi resep + slice-list backlog di `BUILD.md`/memory.

## 5. Non-Scope (eksplisit — dipagari)

- **Konversi 173 view `.jsx → .tsx`** — arc terpisah (W12+), tidak disentuh di sini.
- **Konversi 28 file data sisa** — masuk backlog, dieksekusi sesi lain per slice.
- **Menaikkan tier app ke full-strict** — ratchet dilakukan belakangan, bukan sekarang.
- **`data.js` (AMS, 147 konsumen — "the boss")** — sengaja **terakhir**, bukan di arc beachhead ini.
- Refactor logika, perubahan API data, atau window-strip lanjutan (FIRMOPS dll. — lihat Risiko R2).

## 6. Constraints

- **Source of truth = `migration/src`** (ESM-only). `app/*` buildless = frozen, jangan disentuh.
- **Vite/esbuild loader `tsx`** sudah memproses `.ts` (W5) → rename mekanis untuk build; biaya ada di
  **memenuhi typecheck**, bukan transpile.
- Tier app **relaks** (keputusan): `strict:false`, `noImplicitAny:false`, `strictNullChecks:false`,
  `checkJs:false`. **Kanon tetap full-strict, terpisah, tak tersentuh.**
- **Import specifier eksplisit ber-`.js`** (`import { AMS } from './data.js'`) di seluruh konsumen
  → lihat R1, penentu biaya utama.
- Gate per slice (urutan): `lint → typecheck → build → test → dev live` — **semua hijau sebelum
  commit**, identik disiplin window-strip.

## 7. Existing Solutions (dipakai ulang)

- **Resep window-strip** (memory `[[neosuite-ams-window-strip]]`): per-namespace, smallest-blast-first,
  per-slice gated, fingerprint-identik — **pola yang sama** kita pinjam untuk konversi data.
- **Jaring vitest kanon + snapshot** (W4): oracle nol-regresi sudah ada, gratis dipakai.
- **Pola dua-tier tsconfig** (incremental-TS standar): `tsconfig.json` strict + `tsconfig.app.json`
  relaks yang di-ratchet — solusi industri, bukan custom.

## 8. Proposed Approach

**a. Infra tier-app (Fase 0).**
- Tambah `migration/tsconfig.app.json` (extends opsi dasar; `strict:false`, `noImplicitAny:false`,
  `strictNullChecks:false`, `noEmit:true`, `jsx:react-jsx`), `include` = daftar file `.ts` app yang
  sudah dikonversi (tumbuh per slice — bukan glob, agar ledakan error terkendali).
- Update `npm run typecheck` → jalankan **dua** proyek:
  `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.app.json --noEmit`.
- `src/types/app-globals.d.ts`: deklarasikan **window namespace residual** yang masih dibaca file
  data (`FIRMOPS`, `RETENTION`, `MODULE_INDEX`, `TRAVEL`, `LICENSING`, `TAX`, … — lihat R2) sebagai
  tipe longgar agar file `.ts` kompil. Ini **mendokumentasikan kopling sisa** (umpan window-strip-2).

**b. Resolver spike (Fase 0, de-risk R1).** Konversi **satu** file leaf, lalu uji apakah Vite
me-resolve specifier `./x.js` ke file `x.ts`:
- **Bila YA** → konversi = **rename-only** + masuk `include`. Murah, fan-out nol. (data.js 147
  konsumen tak tersentuh.)
- **Bila TIDAK** → tiap konversi **harus rewrite specifier** di semua konsumen (`./x.js → ./x.ts`
  atau extensionless). Mahal, fan-out lebar → **memperkuat** urutan smallest-first dan menunda AMS.

Hasil spike menentukan cabang resep. (Saya **tidak** menjalankan kode sebelum "Proceed." — spike ini
langkah **pertama setelah** sign-off.)

**c. Konversi pilot (Fase 1).** 2–3 file leaf via resep cabang-(b). Per file: rename → kompil tier-app
0 error (tambah deklarasi window residual seperlunya) → semua gate → render live modul terkait
(mis. Facilities) 0 console error → commit `w11(sliceN): data <x>.js → .ts`.

**d. Dokumentasi (Fase 2).** Resep final + slice-list 31 file (kolom: namespace, #konsumen, status) di
`BUILD.md`; update memory `[[neosuite-ams-arc]]`.

## 9. Risks & Mitigations

- **R1 — Resolusi `.js`-specifier → `.ts`-file tidak pasti.** Penentu biaya order-of-magnitude
  (rename-only vs rewrite 147 konsumen untuk AMS). **Mitigasi:** Fase 0 spike empiris sebelum bulk;
  resep bercabang pada hasil. *Saya tidak akan mengklaim perilaku Vite dari ingatan — diverifikasi.*
- **R2 — File data masih membaca ~15 window namespace residual** (`window.FIRMOPS` ×17, dst. —
  window-strip meninggalkannya, out-of-scope per-slice). Begitu jadi `.ts`, `tsc` meng-error-kan
  `window.FIRMOPS` ("tidak ada di Window") — **tier relaks tidak membungkam ini** (bukan aturan
  strictness). **Mitigasi:** `app-globals.d.ts` augmentasi Window. Side-benefit: peta kopling sisa.
- **R3 — Rename `.jsx`/`.js` keluar dari cakupan ESLint.** **Mitigasi:** `tsc` menggantikan
  (menangkap dupe-key + undefined ref + tipe). Diverifikasi: tier-app tetap menolak dua hal yang
  ESLint jaga. Tidak ada celah gate.
- **R4 — Regresi numerik dari rewire specifier yang salah.** **Mitigasi:** vitest kanon + snapshot
  fingerprint + render live per slice (type-strip = nol-runtime, tapi mis-wire bisa diam).
- **R5 — Gotcha HMR/`import()`** (dari window-strip): augmenter `Object.assign` bisa terlewat di
  `preview_eval`. **Mitigasi:** verifikasi via DOM ter-render, bukan `import()` lepas-HMR.
- **R6 — Scope creep ke 173 view.** **Mitigasi:** Non-Scope eksplisit; arc ini berhenti di beachhead
  data + backlog.

## 10. Implementation Plan

| Fase | Output | Gate |
|---|---|---|
| **0** | `tsconfig.app.json` + `app-globals.d.ts` + `typecheck` dua-tier; **spike resolver** pada 1 file leaf | typecheck 2-tier = 0; spike menjawab R1 |
| **1** | 2–3 file data leaf → `.ts`, masuk tier-app | lint 0 · typecheck 0 · build OK · 59 vitest + fingerprint identik · dev live 0 err |
| **2** | Resep + slice-list 31 file di `BUILD.md`; update memory arc | review |

Commit per slice: `w11(sliceN): data <x>.js → .ts (struktural; angka identik)`.

## 11. Open Questions

1. **Q-RESOLVER (penentu):** apakah Vite me-resolve `./x.js` → `x.ts`? → dijawab empiris Fase 0.
   Bila TIDAK, apakah Anda menerima rewrite specifier konsumen sebagai bagian tiap slice (untuk
   leaf-files biayanya kecil: `data_facilities` = 2 konsumen)?
2. **Q-PILOT:** setuju kandidat pilot `data_facilities` + `data_proforma` + `data_licensing`
   (semua leaf, konsumen sedikit)? Atau ada file data yang ingin Anda jadikan acuan duluan?
3. **Q-NEXT:** setelah beachhead, urutan eksekusi backlog 28 file data = strict smallest-first
   (default), atau prioritaskan namespace tertentu (mis. yang paling sering salah)?

---

> **Tindakan diminta:** review, jawab Open Questions, dan beri **"Proceed."** untuk memulai Fase 0.
> Saya tidak menyentuh kode sebelum itu.
