---
title: PRD — Pendalaman WTB / AJE / Working Papers untuk Pengujian Asersi Manajemen
status: SELESAI (2026-06-25) — di-sign-off "Proceed."; gate typecheck/lint/181 test hijau, terverifikasi live
owner: Ari Widodo
date: 2026-06-25
standard: SA 315 (revisi) · SA 330 · SA 500 · SA 450
---

# PRD — Asersi Manajemen sebagai Tulang Punggung Pengujian

## 1. Problem
Aplikasi sudah memuat banyak infrastruktur asersi, tetapi **tercerai-berai dan tidak menjadi benang merah**:
- `RiskRow.assertion` (Inggris: *Occurrence, Valuation…*) di `data_part1.ts`.
- `WP_PROCS` memetakan tiap prosedur → **satu** asersi (Indonesia: *Keberadaan, Pisah Batas…*) di `view_wp.tsx`.
- `EvRec.asr[]` (singkatan: *E/O, C, V…*) — **hanya informasi, tak dipakai logika**.
- Kesimpulan hanya **per-prosedur** (`ExecP.concl`), bukan per-asersi.
- **WTB & AJE tidak punya keterkaitan asersi sama sekali.**

Akibatnya file audit **tidak bisa menjawab pertanyaan inti**: *"Untuk akun X, apakah setiap asersi relevan sudah (a) dinilai risikonya → (b) ditanggapi prosedur → (c) didukung bukti cukup & tepat → (d) disimpulkan?"* Tiga taksonomi berbeda menamai asersi yang sama → tak bisa diagregasi.

## 2. Objective
Jadikan **asersi sebagai tulang punggung** yang merajut: **Risiko (SA 315) → Akun WTB → Prosedur WP (SA 330) → Bukti (SA 500) → Koreksi AJE (SA 450) → Kesimpulan per-asersi**, dengan **satu taksonomi kanonik (SSOT)** yang dirujuk ketiga modul, bukan didefinisikan ulang.

## 3. Success Criteria
1. **SSOT taksonomi** — satu sumber asersi di canon (SA 315 dwi-kategori: transaksi & saldo). Risk/WP/Evidence semua **resolve** ke id kanonik; data lama (Inggris/Indo/singkatan) tetap tertaut via resolver (nol data break).
2. **Peta relevansi akun×asersi** di canon — tiap pos LK material punya daftar asersi *relevan* (bukan semua asersi relevan ke semua akun — prinsip SA 315 "relevant assertions").
3. **Selektor cakupan** — `assertionCoverage()` mengembalikan, per akun×asersi: risiko tertaut, prosedur penanggap, kecukupan bukti, hasil uji, status kesimpulan.
4. **View khusus "Matriks Asersi"** lintas-modul: baris = akun signifikan (dari WTB material), kolom = asersi relevan, sel = status cakupan; drill sel → benang penuh risiko→prosedur→bukti→AJE→kesimpulan.
5. **In-place**:
   - WTB: strip relevansi asersi + status uji per lead account terpilih.
   - AJE: tiap entri ber-tag asersi yang dikoreksinya; lensa "per asersi".
   - WP: kesimpulan **per-asersi** (roll-up dari prosedur+bukti) + penanda asersi-relevan-belum-diuji.
6. **Gate hijau**: `npm run typecheck` 0 error (canon tier strict, bebas-`any`); ESLint ratchet no-explicit-any lolos; 306 test eksisting tetap hijau + test baru untuk resolver/relevansi/coverage.

## 4. Scope
- Canon baru: `canon_assertions.ts` (taksonomi + alias-resolver + peta relevansi + selektor coverage), di-wire ke `AMS_CANON_BASE` (`canon.ts`) dan diekspos lewat `canon_selectors.ts`.
- Tipe: tambah `AssertionId`, `AssertionDef`, `AssertionCoverage` di `canon_types.ts`.
- Data: `AJE_META[id].assertions[]` (tag entri seed); normalisasi `RiskRow.assertion`, `WP_PROCS`, `EvRec.asr` lewat resolver (tanpa mengubah string sumber — resolusi di titik-baca).
- wpState: tambah `asrConcl[assertionId] = { result, concl, by, at }` (kesimpulan per-asersi; pra-isi dari turunan, final = judgment auditor).
- UI: modul baru `view_assertions.tsx` (Matriks Asersi) + registrasi `icons.jsx`/route `app.tsx`/script di HTML; panel in-place di `view_wtb_deep.tsx`, `view_aje.tsx`, `view_wp.tsx`.
- Test: `canon_assertions.test.ts` (resolver round-trip, relevansi, coverage).

## 5. Non-Scope
- Tidak membangun UI authoring penilaian risiko penuh (risk tetap dari data seed).
- Tidak mengubah mekanik RBAC / sign-off / segel / export (hanya **membaca** status sign-off untuk kesimpulan).
- Tidak menyentuh track buildless beku (`app/*`, `NeoSuite AMS.html` legacy) — ESM-only.
- Bukan e-Meterai / bukan konektor data baru.

## 6. Constraints
- **SSOT keras**: taksonomi & relevansi didefinisikan sekali di canon; tidak ada duplikasi di view. Angka tetap dari `AMS_CANON.*`/WTB.
- **Full `strict` + bebas-`any`** di lapisan canon (`tsc --noEmit` = 0; ratchet ESLint).
- Resolver **murni** (pure) & idempoten; tak boleh memecah fingerprint regresi canon (`canon_regression.test.ts`) — bila perlu, asersi diekspos sebagai member baru, bukan mengubah angka yang ada.
- Bahasa UI Indonesia; pakai CSS var; pola `nav(id,{from})` & lineage eksisting.

## 7. Existing Solutions (reuse, jangan bangun ulang)
- `WP_PROCS` (prosedur↔asersi), `EvRec.asr`, `RiskRow.assertion/assertionLvl/wp/proc` → jadi **input** resolver, bukan dibuang.
- `ExecP`/`TestItem` (eksekusi & tickmark), register bukti SA 500, IPE SA 500, konfirmasi SA 505 → sumber status bukti.
- Pola `canon_selectors.ts` (lapisan tipis ber-tipe) → tempat selektor coverage.
- Pola lineage/related-modules & SubBar → anchor in-place.

## 8. Proposed Approach (teknis)
**Lapisan canon (SSOT).** `canon_assertions.ts`:
- `ASSERTIONS: AssertionDef[]` — dua grup SA 315:
  - *Transaksi/peristiwa*: Keterjadian, Kelengkapan, Akurasi, Pisah Batas, Klasifikasi, Penyajian.
  - *Saldo akun*: Keberadaan, Hak & Kewajiban, Kelengkapan, Akurasi-Penilaian-Alokasi, Klasifikasi, Penyajian.
  - Tiap def: `{ id, label, group:'transaksi'|'saldo', abbr, aliases[] }`. `aliases` memuat bentuk Inggris/Indo/singkatan lama → resolver.
- `resolveAssertion(s: string): AssertionId | null` — normalisasi semua bentuk lama.
- `ASSERTION_RELEVANCE` — pos LK/kelompok akun → asersi relevan (di-seed dari `RiskRow` yang ada + default per caption; dapat ditelusuri).
- `assertionCoverage(opts)` di `canon_selectors.ts` — gabungkan risiko + `WP_PROCS` + wpState (exec/evidence/asrConcl) → `AssertionCoverage` per akun×asersi.

**UI.** Matriks Asersi (view khusus) sebagai peta utama; panel ringkas in-place di tiga modul yang me-`nav` ke matriks untuk benang penuh.

## 9. Risks
- **Regresi WP execution** (file 1.207 baris): mitigasi → canon additive, resolver pure, UI additive; jalankan suite penuh.
- **Peta relevansi = judgment**: harus defensibel SA 315; mitigasi → turunkan dari risiko eksisting + default per caption, tandai sumbernya.
- **Fingerprint canon**: asersi sebagai member baru; verifikasi `canon_regression` tetap byte-identik.
- **Scope besar (full model sekaligus)**: mitigasi → urutkan implementasi (canon → selektor → matriks → in-place) sehingga tiap langkah typecheck-hijau sebelum lanjut.

## 10. Implementation Plan (urut, tiap langkah gate-hijau)
1. `canon_types.ts`: `AssertionId`/`AssertionDef`/`AssertionCoverage`.
2. `canon_assertions.ts`: taksonomi + resolver + relevansi (+ unit test).
3. Wire ke `AMS_CANON_BASE` (`canon.ts`) + selektor `assertionCoverage` di `canon_selectors.ts` (+ test).
4. Data: tag `AJE_META.assertions[]`; pastikan resolver menyerap `RiskRow`/`WP_PROCS`/`EvRec.asr`.
5. wpState `asrConcl` + roll-up kesimpulan per-asersi di `view_wp.tsx`.
6. `view_assertions.tsx` (Matriks Asersi) + registrasi icons/route/HTML.
7. Panel in-place: WTB → AJE → WP.
8. Suite penuh + typecheck + lint; perbaiki; ringkas hasil.

## 11. Open Questions
- (Q-a) Akun "signifikan" untuk baris matriks: ambang = pos > PM, atau seluruh lead schedule WP? *Default usulan: pos > PM ∪ akun ber-risiko asersi-level.*
- (Q-b) Kesimpulan per-asersi: tersimpan eksplisit (judgment) dengan pra-isi turunan — setuju? *Default: ya.*
- (Q-c) Perlu kolom "asersi relevan tapi belum diuji" memicu gate fase (P5 lifecycle), atau cukup peringatan visual dulu? *Default: peringatan visual fase ini; integrasi gate menyusul.*
