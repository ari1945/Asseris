---
name: asseris-apar-subbuku-hidup
description: "AP/AR firma — rekonsiliasi yang membaca sub-buku BEKU; dua premis prompt 29-apar yang saya cabut, dan tiga rumus piutang yang hanya berselisih di luar seed"
metadata: 
  node_type: memory
  type: project
  originSessionId: 38ad6606-cbdf-4bc9-a0d3-c673d701e5a7
  modified: 2026-08-22T01:23:25.966Z
---

Arc `apar` (prompt `docs/prompts-perbaikan/29-apar.md`, dikerjakan 2026-08-22, di atas
kerja `firmgl` yang belum di-commit — lihat [[asseris-firmgl-rekonsiliasi-ekspor]]).
A1·A2·A4·A5 dikerjakan; A3+A6 jadi usulan
(`docs/usulan-A3-apar-pembayaran-utang-ke-buku-besar.md`, rekomendasi: jurnal DRAFT).

Berkas baru: `apar_ratios.ts` (DSO/DPO → `number | null`), `use_firm_subledger.ts`
(satu pintu register `invoices`+`firmap`, sejajar `useFirmCoa`), `apar_register.test.ts`,
`apar_conventions.test.ts`. Mesin: `apOf(ctx)` di `data_firmfin.ts`.

## DUA premis prompt yang SALAH (dan saya cabut)

- **`ap(ctx)` bukan pola `ctx.x || AMS.X`.** `invOf` memang membacanya, tetapi `ap()`
  membaca `A().FIRM_AP` **tanpa syarat** — kuncinya belum pernah ada. Mengirim `firmap`
  ke dalam ctx saja TIDAK menggerakkan apa pun; mesinnya harus diberi `apOf` lebih dulu.
  Konsekuensi uji: gerbang AR (b) sudah HIJAU sebelum perbaikan (cacatnya murni di
  pemanggil), gerbang AP (a) merah.
- **`useCurrentAuditor()` bukan obat A4.** Prompt menyuruh memakainya; ia sengaja jatuh
  kembali ke `AMS.USER.name` (contexts.tsx:280) — persis cacat yang sedang ditutup.
  Yang benar `glActor()`/`glWriteAllowed()` dari `firm_gl_actor.ts`.

## GOTCHA yang mahal

- **Memperbaiki SATU pemanggil `reconciliations()` melahirkan dua layar yang berselisih.**
  `view_firmgl` dan `view_firmfinance` merender BARIS YANG SAMA dan mengunci ekspor
  dengan gerbang yang sama. ctx harus diperbaiki di KEDUANYA dalam perubahan yang sama.
- **TIGA rumus "piutang terbuka" yang sepakat di seed (2.695 jt) dan hanya berselisih di
  keadaan merosot**: `apar` (`status ∉ {Paid,Draft}`) · `billing` (`Σ ditagih − Σ
  terkumpul`, menjumlahkan `paid` faktur DRAFT) · `arAging` (`≠Draft` ∧ `out>0`). Uji
  yang hanya menjalankan seed TIDAK dapat membuktikan keduanya berbeda — register
  pembeda harus DIKARANG (draft ber-uang-muka; status `Paid` yang belum lunas penuh).
- **Menghapus `:any` MEMERAHKAN lint** ("suppressions left that do not occur anymore").
  `npm run lint:any-baseline` = `--suppress-rule` lalu `--prune-suppressions`, jadi ia
  juga MENELAN 61 error un-suppress milik sesi lain (`view_mytasks_parts.tsx`) —
  menyembunyikan arc orang lain. Yang benar: turunkan count berkasmu sendiri dengan
  tangan (`view_firmgl.tsx` 76 → 62; hitung dengan
  `npx eslint <berkas> --suppressions-location <json-kosong>`).
- **Gerbang "nol `AMS.INVOICES`" harus MENGECUALIKAN seed register-nya**:
  `useAmsPersist('invoices', () => AMS.INVOICES)` sah dan wajib ada. Buang pola itu
  dulu, baru pindai sisanya.
- **`FIRMFIN` sudah diimpor di `view_pipeline.tsx`** (baris 22) — impor kedua = TS2300,
  bukan error yang kelihatan sampai `typecheck`.
- **Jalankan `npm run verify` SEBELUM menyentuh apa pun.** Worktree bersama ini sudah
  merah dari 4 arc lain (`view_mytasks_parts` lint · `mytasks_derive` typecheck ·
  `a11y_anchor_href` · `home_composition` · `wip_writedown_authority` ·
  `mytasks_scope` backend). Tanpa baseline, mustahil membuktikan bukan kamu.
- **Verifikasi UI terhenti di layar login** — saya tidak memasukkan kata sandi. Yang
  belum terbukti runtime: FirmAPAR merender tanpa crash dengan hook baru
  (`useFirmCoa`/`useFirm`); build+typecheck+109 uji hijau bukan pengganti.

## Angka (seed, klok 2026-03-09)

Pita rekonsiliasi TIDAK berubah warna — keempat baris tetap `bridged`, residual 0
(kas 8.481/8.578 · AR 4.440/2.695+1.745 · WIP 9.300/7.720+1.580 · AP 1.820/1.123+697).
Yang berubah: barisnya kini BISA bergerak. Membayar `AP-0042` (340 jt) ⇒ sub-buku
1.123 → 783, kontrol DIAM, residual 340 jt, status `open` ⇒ ekspor Neraca Saldo & LK
terkunci. Itu premis usulan A3. DSO 87 hr · DPO 136 hr (tak bergeser; kini turunan
jurnal terposting, bukan seed COA + fallback karangan 11.300/8.500/5.420 yang ternyata
KODE MATI karena `pl()` tak pernah falsy).

Terkait: [[asseris-firmgl-rekonsiliasi-ekspor]] · [[asseris-billing-nomor-faktur-register]] ·
[[asseris-ar-ap-bridge-falsifiable]] · [[asseris-sesi-paralel-satu-worktree]] ·
[[asseris-cash-bank-recon-register]]
