---
name: asseris-asersi-manajemen
description: Lapisan asersi manajemen (SA 315) sebagai tulang punggung WTB/AJE/WP — canon_assertions.ts + Matriks Asersi
metadata: 
  node_type: memory
  type: project
  originSessionId: 922ff8ea-a0e2-4acd-8203-50ba1ea9101c
---

Fitur "Asersi Manajemen" (PRD `docs/PRD-asersi-manajemen.md`, SELESAI 2026-06-25, Ari "Proceed."). Menjadikan asersi benang merah: Risiko (SA 315) → Akun WTB → Prosedur WP (SA 330) → Bukti (SA 500) → Koreksi AJE (SA 450) → Kesimpulan per-asersi.

**Arsitektur (SSOT):** `migration/src/canon_assertions.ts` — taksonomi SA 315 **dwi-kategori** (6 transaksi + 6 saldo, `AssertionId`), **resolver alias** menyatukan 3 vocab lama (Inggris RiskRow / Indonesia WP_PROCS / singkatan EvRec.asr) → id kanonik; disambiguasi label dwi-kategori (Kelengkapan/Penyajian/Klasifikasi/E/O) oleh **kelompok akun** (4-/5- = transaksi). `ASSERTION_RELEVANCE` per lead schedule. `assertionCoverage()` PURE menggabungkan prosedur+risiko+bukti+kesimpulan → status sel (gap/planned/in-progress/exception/concluded).

**Penting — TIDAK dipasang ke AMS_CANON** (jaga fingerprint `canon_regression.test.ts`); diekspos via ESM + re-export `canon_selectors.ts` (boundary ber-tipe view). Unit test `canon_assertions.test.ts` (12).

**Permukaan UI:** (1) View baru `view_assertions.tsx` "Matriks Asersi" (route `asersi`, icon `columns`, grup Core Execution) — lead×asersi, glyph cells, drill benang penuh. (2) WP `view_wp.tsx`: panel `AssertionRollup` di ProcsTab (kesimpulan per-asersi, gap merah, persist `wpState.asrConcl`) + ekspor `wpProcedureInputs/procsFor/WP_PROCS` + helper SSOT `procStatusAt`. (3) AJE `view_aje.tsx`: `AJE_META.assertions[]` + chip + lensa `AjeAssertionLens`; ekspor `ajeAssertionIds`. (4) WTB `view_wtb_deep.tsx`: `WtbAssertionStrip` di editor telaah.

**Gotcha:** proyek TANPA `@types/react` (shim `jsx-intrinsics.d.ts`) → `React.ReactNode` & typed-prop `key` TAK resolve; view pakai props `:any` (konvensi sibling), di-baseline via `npx eslint src --suppress-rule @typescript-eslint/no-explicit-any` (script `lint:any-baseline` RUSAK — dua flag bentrok). Canon tetap strict bebas-`any`. Defaults Q-a/b/c: baris matriks = pos>PM ∪ risiko asersi-level; kesimpulan eksplisit pra-isi turunan; gap = peringatan visual (belum gate fase P5). Lihat [[asseris-test-coverage]] [[asseris-wp-execution]] [[neosuite-ams-p5-lifecycle-gates]].
