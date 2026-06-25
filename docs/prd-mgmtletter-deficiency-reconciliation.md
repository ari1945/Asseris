# PRD — SA 260/265 Surat Manajemen: Rekonsiliasi Defisiensi → Komunikasi Tata Kelola

> Evaluasi modul isu **#4** (modul SPAP tipis/terputus). Pick ketiga: **`mgmtletter`**
> (SA 260/265). Pick sebelumnya: SA 550 `related` (#32), SA 560 `subsequent` (#33).
> Status: **DRAFT — menunggu sign-off ("Proceed.") sebelum implementasi.**
> Tanggal: 2026-06-25 · Cabang usulan: `feat/mgmtletter-deficiency-reconciliation` (off `master`).

---

## Problem
Modul `mgmtletter` (`ManagementLetter` di `view_final3.tsx`, SA 260/265) **kaya** secara UI
(temuan 6-bagian Kondisi-Sebab-Kriteria-Akibat-Rekomendasi-Tanggapan, thread diskusi
klien-auditor, workflow keputusan, generator surat) — **bukan tipis**. Penyakitnya
**TERPUTUS**: `ML_FINDINGS_SEED` adalah daftar temuan hardcode yang **tak terhubung** ke
register defisiensi pengendalian yang dievaluasi modul ICFR (`view_icfr.tsx`, tab "Evaluasi &
Agregasi Defisiensi SA 265", persist `icfrDef.v1`).

Dua dunia paralel:
- **ICFR** mengklasifikasi tiap defisiensi (R-03, I-02, F-01, ITGC-SoD) ke 3 level severity
  (`classifyDef` → Defisiensi Pengendalian / Signifikan / Kelemahan Material) + memetakan
  kewajiban komunikasi (`COMMS`: Signifikan+ → **tertulis ke TCWG, SA 265.9**).
- **Surat Manajemen** punya temuan sendiri (ML-01..07), tanpa tautan balik ke defisiensi ICFR.

Akibatnya **risiko kelengkapan komunikasi tata kelola tak terangkat**: defisiensi yang
SA 265.9 wajibkan dikomunikasikan tertulis ke TCWG bisa **tak sampai ke surat final**.
Contoh nyata seed: **F-01** (review jurnal manual, oper Deficiency → **Signifikan**) berkaitan
dengan **ML-02** yang masih berstatus *Diskusi* (belum Final ML) — defisiensi signifikan yang
belum dipastikan dikomunikasikan.

Bonus penyakit arsitektur: model severity SA 265 (`classifyDef`/`LEVELS`/`LEVEL_KIND`/
`COMMS`/`DEF_SEED`) tertanam **inline di view_icfr** — bukan kanon (pelanggaran SSOT bila
modul lain perlu logika sama; dan memang `mgmtletter` kini memerlukannya).

## Objective
Hubungkan defisiensi pengendalian (model severity SA 265) ke surat manajemen: jadikan model
severity **kanon SSOT**, lalu di `mgmtletter` rekonsiliasi tiap defisiensi terhadap apakah ia
**terkomunikasikan** (tertaut ke temuan ML berstatus Final), dan **angkat gap** — defisiensi
**Signifikan/Material** yang belum masuk surat final (pelanggaran kelengkapan SA 265.9).
Murni & teruji di kanon; view mengonsumsi. Mencerminkan kontrak #32/#33.

## Success Criteria
1. Modul murni baru `canon_deficiency.ts` (tanpa React): `classifyDeficiency(mag,lik,comp)`,
   konstanta `LEVELS`/`LEVEL_KIND`/`COMMS` (ref SA 265.9/.10), register kanonik `DEFICIENCIES`
   (R-03/I-02/F-01/ITGC-SoD: id/src/desc/kind), seed `DEF_SEED`, tautan `DEFICIENCY_ML_LINK`
   (def→ml), dan `reconcileGovernanceComms({deficiencies, defSeed, links, mlFindings})` →
   per-defisiensi: level severity, kewajiban komunikasi, `communicated` (tertaut ML Final),
   `isGap` (Signifikan+ belum terkomunikasi) + roll-up. Unit test ≥10 kasus, `tsc` 0, ESLint
   bebas-`any`.
2. **`view_icfr.tsx` refactor SSOT (behavior-preserving)**: `classifyDef`/`LEVELS`/`LEVEL_KIND`/
   `COMMS`/`DEF_SEED` + register `defs` dikonsumsi dari kanon (hapus duplikasi inline). Tab
   "Evaluasi Defisiensi" berperilaku identik (persist `icfrDef.v1` tak berubah; verifikasi live).
3. **`mgmtletter` (`view_final3.tsx`)**: panel **"Rekonsiliasi Defisiensi → Komunikasi TCWG
   (SA 265.9)"** — daftar defisiensi + level + status terkomunikasi, gap (Signifikan+ belum di
   surat final) di-flag merah dengan nav ke modul `icfr`. Roll-up (total/gap/dampak).
4. Gate hijau (`lint`/`typecheck`/`test`/`build`); diverifikasi live (Partner & Manager).

## Scope
Modul `mgmtletter` (rekonsiliasi) + ekstraksi `canon_deficiency.ts` + refactor SSOT
`view_icfr` (konsumsi kanon, tanpa ubah perilaku).

## Non-Scope
- Pick lain isu #4: `strategy` (SA 300).
- Mengubah workflow/generator surat ML, thread diskusi, atau seed temuan ML (selain menambah
  field tautan opsional & status terkomunikasi).
- Mengubah matriks RCM/ITGC ICFR, tab COSO/RCM/ITGC (hanya tab Evaluasi Defisiensi disentuh
  untuk konsumsi kanon).
- Persistensi baru; server. `icfrDef.v1` existing dipertahankan apa adanya.

## Constraints
- ESM-only; edit `migration/src/*`. Aturan emas anti-tabrakan.
- SSOT: severity & komunikasi defisiensi diturunkan dari kanon, tak diduplikasi.
- `tsc` 0 (full strict); ratchet ESLint `no-explicit-any` — file `.ts` baru bebas-`any`;
  tambahan `.tsx` digigit baseline bulk-suppress (lampaui count → seluruh file ter-unsuppress)
  → **tipekan, jangan re-baseline** (pelajaran #32). Cek baseline `view_final3.tsx` &
  `view_icfr.tsx` di `eslint-suppressions.json` sebelum edit.
- UI Bahasa Indonesia; `rp()`/`fmt()`; CSS var.

## Existing Solutions (reuse)
- `canon_related.ts` (#32) / `canon_subsequent.ts` (#33) = template kanon-murni + scan + test + panel.
- `view_icfr.tsx` `classifyDef`/`COMMS`/`DEF_SEED`/`DEFICIENCIES`-derivation = sumber yang
  diangkat ke kanon (konsumen tunggal saat ini → de-dup aman).
- `ML_FINDINGS_SEED` (`stage`: draft/diskusi/final/tuntas; `sev`) = sisi surat manajemen.
- nav `icfr`/`mgmtletter` & WP signoff/lineage `mgmtletter` sudah terdaftar.

## Proposed Approach
1. **`canon_deficiency.ts`** (murni): pindahkan severity model + register + COMMS dari
   view_icfr; tambah `DEFICIENCY_ML_LINK` (def→ml) & `reconcileGovernanceComms(...)`.
2. **`canon_deficiency.test.ts`**: classify 2×2(+komp), level→COMMS, terkomunikasi (ML Final)
   vs gap (Signifikan+ non-Final/absen), Control Deficiency bukan gap, roll-up, input kosong,
   integrasi seed nyata (F-01 gap karena ML-02 diskusi).
3. **Refactor `view_icfr`**: impor model dari kanon (de-dup), `defs` = `DEFICIENCIES` kanon.
4. **`mgmtletter`**: panel rekonsiliasi + roll-up; gap → nav `icfr`.

## Risks
- **Regresi ICFR** (tab severity kaya) → mitigasi: refactor behavior-preserving (kanon =
  ekstraksi 1:1), unit test logika + verifikasi live tab Evaluasi Defisiensi (persist utuh).
- **Tautan def↔ml fuzzy** → mitigasi: tautan **eksplisit** (`DEFICIENCY_ML_LINK`), bukan match teks.
- **Ratchet `any`** pada edit dua view → mitigasi: tipekan; impor tipe kanon.
- **Scope creep ICFR** → mitigasi: sentuh hanya tab Evaluasi Defisiensi.

## Implementation Plan
1. Sign-off PRD.
2. `canon_deficiency.ts` + test (TDD) → gate.
3. Refactor `view_icfr` (konsumsi kanon) → gate + verifikasi live tab Defisiensi.
4. Panel rekonsiliasi `mgmtletter` → gate + verifikasi live.
5. PR off `master`; update memory `asseris-module-evaluation` (#4 progres).

## Open Questions
1. **Cakupan refactor ICFR**: (a) penuh — `view_icfr` konsumsi `DEFICIENCIES`+logika dari
   kanon (SSOT bersih, blast-radius sedikit lebih besar), atau (b) minimal — kanon hanya untuk
   `mgmtletter`, ICFR biarkan inline (cepat, tapi logika terduplikasi = langgar SSOT)? —
   **Saran: (a) penuh** — konsumen tunggal, de-dup aman, sesuai prinsip SSOT vault.
2. **Tautan def→ml**: seed `DEFICIENCY_ML_LINK` = {I-02→ML-01, R-03→ML-03, F-01→ML-02,
   ITGC-SoD→ML-05}? (F-01 jadi gap karena ML-02 'diskusi'; ITGC = Control Deficiency, bukan
   gap). — **Saran: ya** (mencerminkan kaitan nyata seed).
3. **Nama cabang** `feat/mgmtletter-deficiency-reconciliation` — OK?
