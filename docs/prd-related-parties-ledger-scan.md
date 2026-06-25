# PRD — SA 550 Pihak Berelasi: Scan Ledger & Rekonsiliasi Kelengkapan

> Evaluasi modul isu **#4** (modul SPAP tipis/terputus). Pick pertama: **SA 550 `related`**.
> Status: **DRAFT — menunggu sign-off ("Proceed.") sebelum implementasi.**
> Tanggal: 2026-06-25 · Cabang usulan: `feat/related-parties-ledger-scan` (off `master`).

---

## Problem
Modul `related` (`migration/src/view_related.tsx`, SA 550 / PSAK 7) **100% hardcode**:
- `RP_PARTIES` & `RP_TXN` = array statis di dalam view; toggle "diungkapkan"/"arm's-length"
  hanya demo (tak terhubung apa pun).
- **Tidak ada prosedur kelengkapan** — inti risiko SA 550 (RPT **tak tercatat / tak
  diungkapkan**, ¶15–17, ¶22) tak pernah diuji terhadap buku besar.
- Sumber ledger kanonik **sudah menandai** aktivitas pihak berelasi yang diabaikan:
  `forensic_canon.JOURNAL_POP` memuat `rpId`/`party` (mis. `JV-24-09001`→RP-05 CV Mitra
  Keluarga, `JV-24-09002`→RP-04 Dir. Utama). Modul `related` tak membacanya.
- **Risiko SSOT**: data RP dimiliki sebuah *view*, lalu dikonsumsi `view_forensic` via
  `window.RP_TXN`/`window.RP_PARTIES` — kopling rapuh, sumber kebenaran tersebar.

Akibatnya modul ini "tipis" (display saja) dan "terputus" (tak menyentuh ledger maupun
hilir secara bermakna), persis temuan evaluasi.

## Objective
Ubah `related` dari tampilan statis menjadi kertas kerja SA 550 **sadar-ledger**: pindai
populasi jurnal untuk aktivitas pihak berelasi, **rekonsiliasi** terhadap registri RPT yang
diungkapkan, dan **angkat gap kelengkapan** (jurnal RPT yang tak ada di registri / belum
diungkapkan). Logika murni & teruji di lapisan kanon; view hanya mengonsumsi.

## Success Criteria
1. Modul murni baru `canon_related.ts` (tanpa React) — `scanRelatedParties({parties, register, journal})`
   mengembalikan: `matched` (registri ↔ jurnal), `undisclosedInLedger` (jurnal ke RP tanpa
   entri registri terungkap), `unsupportedRegister` (registri tanpa dukungan jurnal),
   plus roll-up `exposure`/`nonArm`/`undisclosed`. Unit test ≥10 kasus, `tsc` 0 error,
   ESLint bebas-`any` (file `.ts` baru).
2. `RP_PARTIES`/`RP_TXN` **pindah** ke lapisan kanon sebagai SSOT; dual-publish ke `window`
   dipertahankan agar `view_forensic` tetap jalan tanpa perubahan perilaku.
3. View `related` mendapat panel **"Rekonsiliasi Ledger ↔ Registri RPT"** + hasil scan
   kelengkapan yang **menandai entri terbukti-di-ledger-tapi-belum-diungkap** (CV Mitra
   Keluarga / T-06) **diturunkan dari `JOURNAL_POP`**, bukan hardcode.
4. Navigasi hilir (`sad`/disclosure/confirm) tetap; lineage dock (PR#30) tak berubah.
5. Semua gate hijau (`typecheck`/`lint`/`test`/`build`); diverifikasi live (Manager + Partner).

## Scope
Hanya modul SA 550 `related`: ekstraksi kanon + scan/rekonsiliasi + perakitan view.

## Non-Scope
- SA 560 `subsequent`, `mgmtletter` (SA 260/265), `strategy` (SA 300) — pick berikutnya.
- Konektor data baru; sub-buku RPT penuh. Kita **merekonsiliasi populasi jurnal kanonik
  yang sudah ada**, bukan membangun ETL.
- Perubahan server/persistensi. Toggle pengungkapan tetap state view (seperti sekarang);
  **persistensi `wpState` di-flag sebagai follow-up**, bukan bagian PR ini.

## Constraints
- ESM-only; edit di `migration/src/*`. Patuhi aturan emas anti-tabrakan (alias hook unik,
  tanpa `styles` global, ekspor eksplisit).
- SSOT: angka pihak berelasi tak boleh diduplikasi/hardcode bila bisa diturunkan dari kanon.
- `tsc --noEmit` 0 error (full strict); ratchet ESLint `no-explicit-any` (file `.ts` baru
  wajib bebas-`any`; tambahan `.tsx` juga digigit ratchet).
- UI Bahasa Indonesia; `rp()`/`fmt()` id-ID; CSS var, bukan warna baru.

## Existing Solutions (reuse — jangan bangun ulang)
- `forensic_canon.JOURNAL_POP` (`rpId`/`party` sudah ada) = **sumber data scan**.
- `view_forensic.tsx` sudah lintas-referensi eksposur RP (`window.RP_TXN`) — pola ditiru.
- `engagement_phase_gate.ts` & `canon_assertions.ts` = template kanon-murni + pola test.
- Lineage dock `related` (PR#30) & WP signoff evidence `related` (`wp_signoff.tsx:78`) sudah ada.

## Proposed Approach
1. **`canon_related.ts`** (murni): pindahkan `RP_PARTIES`/`RP_TXN` ke sini; ekspor
   `scanRelatedParties(...)`. Pencocokan **utama via `rpId`**, fallback nama ter-normalisasi
   (hanya sinyal sekunder). Output rekonsiliasi + flag kelengkapan + roll-up. Dual-publish
   `window.RP_PARTIES`/`RP_TXN` agar forensic tak putus.
2. **`canon_related.test.ts`**: matched, undisclosed-in-ledger, unsupported-register,
   agregasi non-arm, input kosong, fallback-nama.
3. **Refactor `view_related.tsx`**: impor data + scan dari kanon; tambah panel rekonsiliasi
   & hasil scan kelengkapan; pertahankan UX toggle; tandai entri undisclosed turunan-ledger.
4. **Verifikasi `view_forensic`** tetap membaca `window.RP_TXN`/`RP_PARTIES` (kini bersumber kanon).

## Risks
- **Kopling forensic** putus bila sumber dipindah tanpa dual-publish → mitigasi: kanon tulis
  `window` + verifikasi live forensic.
- **False-positive pencocokan nama** (string registri ≠ jurnal) → mitigasi: `rpId` dulu,
  nama hanya fallback ternormalisasi.
- **Scope creep ke persistensi** → mitigasi: derivasi-saja; toggle tetap state view.
- **Ratchet `any`** pada edit view → mitigasi: tambahan bertipe; pakai `:any` ter-baseline saja.

## Implementation Plan
1. Sign-off PRD.
2. `canon_related.ts` + test (TDD) → gate.
3. Cek graf impor (view → kanon; tak perlu `<script>` baru karena ESM).
4. Refactor view + panel rekonsiliasi.
5. Gate penuh + verifikasi live (Manager & Partner) + screenshot.
6. PR off `master`; update memory `asseris-module-evaluation` (#4 progres).

## Open Questions
1. **Persistensi toggle**: biarkan state view (bounded scope) atau SSOT `wpState` seperti modul
   WP lain? — **Saran: view-local sekarang; persistensi = follow-up.**
2. **Registri RP**: tetap 5 pihak seed kurasi, atau turunkan kandidat pihak baru dari string
   `party` jurnal yang tak ada di registri? — **Saran: registri seed; scan hanya menandai
   entri ber-`rpId` yang absen dari registri (sinyal kelengkapan). Menurunkan pihak baru dari
   teks bebas = berisik.**
3. **Nama cabang** `feat/related-parties-ledger-scan` — OK?
