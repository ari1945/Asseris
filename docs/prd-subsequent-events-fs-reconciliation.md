# PRD — SA 560 Peristiwa Kemudian: Rekonsiliasi ke Laporan Keuangan

> Evaluasi modul isu **#4** (modul SPAP tipis/terputus). Pick kedua: **SA 560 `subsequent`**
> (pick pertama SA 550 `related` = PR #32). Pola sengaja dicerminkan dari PR #32.
> **Status:** **Draft** — menunggu sign-off ("Proceed.")
> Tanggal: 2026-06-25 · Cabang usulan: `feat/subsequent-events-fs-reconciliation` (off `master`).

---

## Problem
Modul `subsequent` (`migration/src/view_subsequent.tsx`, SA 560 / PSAK 8) **100% hardcode**,
sama persis penyakit `related` pra-PR#32:
- `SE_EVENTS` = array statis; seg-toggle penyesuai/non-penyesuai hanya demo.
- **Terputus dari laporan keuangan.** Inti SA 560/PSAK 8: peristiwa **penyesuai (Type 1)**
  WAJIB *tercermin* dalam LK (lewat jurnal penyesuai), peristiwa **non-penyesuai (Type 2)**
  WAJIB *diungkapkan*. Modul tak pernah menguji apakah itu benar terjadi — `amount` dampak
  hardcode, tak ada tautan ke register AJE (`AMS.AJE`, SSOT koreksi) maupun ke daftar-uji
  pengungkapan.
- Akibatnya risiko nyata tak terangkat: **peristiwa penyesuai material yang belum dibukukan**
  (mis. SE-01 — pelanggan PKPU, piutang Rp 2,53 M) lewat tanpa flag.
- WP signoff `subsequent` (`wp_signoff.tsx:76`) sudah mensyaratkan "Prosedur s.d. tgl laporan"
  & "Pertimbangan dual dating" — tapi view tak menautkan apa pun.

## Objective
Ubah `subsequent` dari timeline statis menjadi kertas kerja SA 560 **sadar-LK**: rekonsiliasi
tiap peristiwa penyesuai terhadap register AJE (booked/proposed/**unbooked**) dan tiap
peristiwa non-penyesuai terhadap status pengungkapan, angkat **gap** (penyesuai belum
dibukukan / non-penyesuai belum diungkap), dengan roll-up dampak LK. Logika murni & teruji
di kanon; view mengonsumsi. Persis kontrak `canon_related` (PR #32).

## Success Criteria
1. Modul murni baru `canon_subsequent.ts` (tanpa React) — `scanSubsequent({events, aje})`
   mengembalikan per-peristiwa: `bookStatus` (`posted`|`proposed`|`unbooked`) untuk penyesuai
   via tautan `aje`→`AMS.AJE`; `discStatus` (`disclosed`|`undisclosed`) untuk non-penyesuai;
   plus roll-up `adjustingImpact`/`unbookedImpact`/`undisclosedCount`/`gaps`. Unit test ≥10
   kasus (incl. integrasi `AMS.AJE` nyata), `tsc` 0 error, ESLint bebas-`any` (file `.ts` baru).
2. `SE_EVENTS` pindah ke kanon sebagai SSOT, bertipe; tambah field aditif `aje?` (id AJE
   penaut, penyesuai) & `disclosed?` (non-penyesuai). Dampak `amount` tetap (tak ada angka LK
   baru yang seharusnya dari canon — `amount` di sini = estimasi dampak peristiwa, sah sebagai
   judgment kertas kerja).
3. View `subsequent` mendapat panel **"Rekonsiliasi ke Laporan Keuangan"**: peristiwa
   penyesuai ↔ status AJE (Posted/Proposed/**Belum Dibukukan**) dengan nav ke `aje`;
   non-penyesuai ↔ status pengungkapan dengan nav ke `disclosure`; roll-up dampak penyesuai &
   **dampak belum-dibukukan**. Timeline + toggle existing dipertahankan.
4. Gate hijau (`lint`/`typecheck`/`test`/`build`); diverifikasi live (Partner & Manager).

## Scope
Hanya modul SA 560 `subsequent`: ekstraksi kanon + scan-rekonsiliasi ke AJE/pengungkapan +
perakitan view.

## Non-Scope
- Pick lain isu #4: `mgmtletter` (SA 260/265), `strategy` (SA 300).
- **Automasi dual-dating/coverage-ke-tgl-opini**: cukup catatan tampilan (periode → tgl
  laporan sudah ada di timeline); tak menyentuh modul `opinion`.
- **Membuat entri `AMS.AJE` baru** (data bersama, dikonsumsi modul lain) — hanya *membaca*
  register AJE untuk resolusi status. Bila peristiwa penyesuai tak punya AJE → itu memang
  temuan `unbooked` (jujur), bukan alasan menambah AJE palsu.
- Perubahan server/persistensi; toggle tetap state view (persistensi `wpState` = follow-up).

## Constraints
- ESM-only; edit `migration/src/*`. Aturan emas anti-tabrakan (alias hook unik, ekspor eksplisit).
- SSOT: status pembukuan diturunkan dari `AMS.AJE`, tak di-hardcode.
- `tsc` 0 error (full strict); ratchet ESLint `no-explicit-any` — **GOTCHA PR#32**: file `.ts`
  baru wajib bebas-`any`; tambahan `.tsx` digigit baseline bulk-suppress (lampaui count →
  SELURUH file ter-unsuppress) → **tipekan, jangan re-baseline**. `view_subsequent.tsx`
  baseline `any` = cek `eslint-suppressions.json` sebelum edit.
- UI Bahasa Indonesia; `rp()`/`fmt()`; CSS var.

## Existing Solutions (reuse)
- `canon_related.ts` (PR #32) = template kanon-murni + scan + test + pola view-panel.
- `AMS.AJE` (`data_part1.ts`) = SSOT koreksi (`{id,desc,ref,status:'Posted'|'Proposed',dr,cr,amount}`).
- nav `aje`/`disclosure`/`opinion` sudah ada; lineage & WP signoff `subsequent` sudah terdaftar.

## Proposed Approach
1. **`canon_subsequent.ts`** (murni): pindahkan `SE_EVENTS` (typed `SubsequentEvent`) + field
   aditif `aje?`/`disclosed?`. Ekspor `scanSubsequent(...)`: resolusi status pembukuan dari
   `AMS.AJE` (tautan id; `posted`/`proposed`/`unbooked`), status pengungkapan dari `disclosed`,
   roll-up dampak + gap. Dual-publish `window.SE_EVENTS` bila ada konsumen (cek; kemungkinan
   tak ada — bila tak ada, tak perlu).
2. **`canon_subsequent.test.ts`**: posted/proposed/unbooked, undisclosed, roll-up dampak,
   penyesuai-tanpa-aje = gap, integrasi `AMS.AJE`, input kosong.
3. **Refactor `view_subsequent.tsx`**: impor data+scan dari kanon; tambah panel rekonsiliasi
   LK + roll-up; pertahankan timeline & seg-toggle; gap → nav `aje`/`disclosure`.

## Risks
- **Tautan AJE↔peristiwa fuzzy** → mitigasi: tautan **eksplisit** (`aje` id), bukan
  pencocokan teks; tanpa tautan = `unbooked` (jujur).
- **Ratchet `any`** pada edit view → mitigasi: tipekan; impor tipe dari kanon (pelajaran PR#32).
- **Scope creep ke opinion/dual-dating** → mitigasi: catatan tampilan saja.

## Implementation Plan
1. Sign-off PRD.
2. `canon_subsequent.ts` + test (TDD) → gate.
3. Refactor view + panel rekonsiliasi.
4. Gate penuh + verifikasi live (Partner & Manager) + screenshot.
5. PR off `master`; update memory `asseris-module-evaluation` (#4 progres).

## Open Questions
1. **Seed peristiwa penyesuai**: pertahankan SE-01 & SE-04 sebagai `unbooked` (gap jujur —
   teridentifikasi saat fieldwork, belum dibukukan), atau tautkan salah satu ke AJE existing
   untuk mendemokan state `posted`/`proposed`? — **Saran: biarkan unbooked (jujur; tak ada
   AJE existing yang benar-benar membukukan peristiwa ini)**; state posted/proposed tetap
   diimplementasikan & diuji via fixture test.
2. **Status pengungkapan non-penyesuai**: seed sebagian `disclosed:false` agar ada gap
   pengungkapan untuk didemokan? — **Saran: ya, seed 1 non-penyesuai belum diungkap.**
3. **Nama cabang** `feat/subsequent-events-fs-reconciliation` — OK?
