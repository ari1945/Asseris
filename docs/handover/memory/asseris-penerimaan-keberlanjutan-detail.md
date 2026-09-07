---
name: asseris-penerimaan-keberlanjutan-detail
description: "Asseris pendalaman Penerimaan & Keberlanjutan klien (P1-P6) — model skor bersama, pemicu tahun-lalu, kertas kerja + memo tersegel PDF/XLSX"
metadata: 
  node_type: memory
  type: project
  originSessionId: a2bcc94c-b7f7-47ff-8b17-a52f76b02d63
---

**STATUS (pause 2026-07-19, lanjut sesi baru):** ✅ P1–P6 SELESAI, di-commit & di-push, **PR #93 TERBUKA** (belum merge). Working tree bersih. **Aksi tertunda #1:** putuskan urutan merge PR #92 (deep-link) vs #93 — **keduanya ubah `view_continuance.tsx`** → KONFLIK pasti. Resolusi: pertahankan keduanya (import+seed `useInitialSelection` dari #92 + kertas kerja/ekspor dari #93); yang merge belakangan rebase + selesaikan konflik. Ada juga PR #94 (chat lain, `feat/ui-module-header-padding` — SubBar/panel padding; bisa bentrok ringan dgn SubBar/Panel di view_continuance). Catatan: HEAD repo mungkin di branch lain (chat paralel switch branch repo-global); kerjaku aman di origin. Kandidat lanjutan (opsional): SA 510 auditor pendahulu, deklarasi independensi per-anggota, persistensi server priorYear, konsentrasi fee.

Pendalaman end-to-end fitur **Penerimaan & Keberlanjutan klien** (2026-07-18), cabang `feat/penerimaan-keberlanjutan-detail` (off master; belum merge saat ditulis). PRD `docs/prd-penerimaan-keberlanjutan-detail.md`; metodologi `docs/acceptance-continuance-methodology.md`. Lanjutan dari [[asseris-deeplink-tab-nav]] (PR #92) & [[asseris-continuance-isqm]] (PR #26 modul continuance asal).

**Yang dibangun (6 fase, tiap fase 1 commit, gate hijau tiap fase):**
- **P1** `assessment_model.ts` (murni, bebas-any): `weightedScore(factors)` = Σ(s·w)/Σw guard `||1`, `verdict(score,kind)` ambang ≥4/≥3/<3. SSOT dipakai penerimaan DAN keberlanjutan. `obAccScore`/`obAccVerdict` di-refactor memakainya (perilaku IDENTIK — ada uji kesetaraan).
- **P2** `continuance_engine` pemicu pengalaman tahun lalu: `opiniLY` (high, `isOpinionModified()` WDP/TMP/TW; **WTP-EoM ≠ modifikasi**), `temuanLY` (≥2 med/=1 low), `perubahan` (low). `CONT_FACTORS` (6 faktor Σ100, bobot 20/25/20/15/10/10). Fail-safe: tanpa priorYear = tanpa pemicu.
- **P3** kertas kerja keberlanjutan di `view_continuance.tsx`: panel full-width (matriks faktor+CNScorePick, PriorYearCard, safeguard, keputusan+trail append-only, `approved` lock). RBAC: nilai=`ENGAGEMENT_VIEW_ALL`, kunci=`FIRM_ADMIN`.
- **P4** `acceptance_continuance_memo.ts` (generator MURNI, tanpa Date/random → hash reprodusibel) → blok PDF + lembar XLSX 2 kind. Tombol Memo PDF/XLSX + Verifikasi Segel di `view_continuance` DAN `StepAcceptance`. Reuse `amsExportPdf`/`amsExportXlsx` (segel Ed25519 server + `exportVerifySeal`). `memoSeal` persist.
- **P5** riwayat siklus (`CONTINUANCE_HISTORY` read-only) di workpaper.
- **P6** dokumentasi.

**GOTCHA arsitektur (mahal ditemukan):** `hydrateCoreFromApi` (`api.ts:225`) membangun ulang `AMS.CLIENTS` dari bootstrap server HANYA kolom tetap → **field ad-hoc (mis. priorYear) DILUCUTI saat hidrasi**. Solusi: simpan sebagai **peta referensi ber-clientId** (`PRIOR_YEAR` di `data_part1`), view memperkaya `clients.map(c=>({...c, priorYear: PRIOR_YEAR[c.id]}))` sebelum panggil engine. Jangan taruh data non-CRM inline di CLIENTS.

**GOTCHA lint (berulang):** `:any` BARU di file `.ts` ber-baseline (mis. `data_part1`) meng-**un-suppress SELURUH file** (7 error sekaligus). Ketik param benar (mis. `over: Record<number,{...}>`, bukan `over: any`). Event handler view: React shim tak ekspor `ChangeEvent` → pakai tipe struktural `(e: { target: { value: string } })`, JANGAN `React.ChangeEvent` (TS2694) & JANGAN `(e: any)` di file bebas-any.

**Verifikasi live (peran Manajer `anindya.p@whr-cpa.id`/`Manager#2025!`):** Bumi Hijau (C-031, opini WDP) → TINGGI/5 pemicu, skor 2.85→Tidak Dilanjutkan, kartu tahun-lalu lengkap; edit skor rekomputasi (3.00→3.40); ekspor PDF → segel server persist → Verifikasi "✓ Segel sah — konten utuh". Manager punya `EXPORT` (rbac.ts:107) tapi bukan `FIRM_ADMIN` → bisa nilai, tak bisa kunci (benar). **Reseed menghapus SEMUA StateDoc+sesi** (seed destruktif) → login ulang; tapi priorYear via peta TAK butuh reseed.

Gate akhir: typecheck 0 · lint bersih · **461 test** (assessment_model 8, memo 8, continuance 18). Kandidat lanjutan: SA 510 auditor pendahulu, deklarasi independensi per-anggota, persistensi server priorYear.
