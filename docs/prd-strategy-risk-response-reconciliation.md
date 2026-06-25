# PRD — SA 300/330 Strategi Audit: Rekonsiliasi Risiko → Respons → Prosedur (Pemetaan Risiko→Prosedur)

> Evaluasi modul isu **#4** (modul SPAP tipis/terputus). Pick **terakhir**: **`strategy`**
> (SA 300/330). Pick sebelumnya: SA 550 `related` (#32), SA 560 `subsequent` (#33),
> SA 260/265 `mgmtletter` (#34).
> Status: **DRAFT — menunggu sign-off ("Proceed.") sebelum implementasi.**
> Tanggal: 2026-06-25 · Cabang usulan: `feat/strategy-risk-response-reconciliation` (off `master`).

---

## Problem
Modul `strategy` (`StrategyMemo` di `view_misc1.tsx`, SA 300) **kaya** secara UI — 4 tab
(Strategi Keseluruhan, Pendekatan per Area, Jadwal & Sumber Daya, Dokumen Memo, ~430 LOC),
menarik risiko/materialitas/tim dari konteks audit. **Bukan tipis.** Penyakitnya **TERPUTUS**,
persis seperti `mgmtletter` (#34): tab "Pendekatan per Area" (`SmApproach`) menampilkan tabel
risiko → pendekatan → prosedur kunci → WP, tetapi **murni display**. Tak ada rekonsiliasi.

Inti SA 300/330 = strategi harus **mengarahkan rencana**, dan setiap RoMM (SA 315) yang dinilai
harus tertelusur ke **respons audit spesifik** (SA 330) dan ke **kertas kerja** yang
menjalankannya. Tiga celah saat ini tak terangkat:

1. **Respons kurang memadai (SA 330.21).** Pengguna dapat menggeser pendekatan risiko
   **Signifikan/kecurangan** ke "Substantif" biasa (toggle `seg` di Tab 2) — strategi tetap
   hijau tanpa peringatan. Contoh nyata seed: `R-01` (Pendapatan, **Significant + fraud SA 240**,
   wp `B-3`) dan `R-05` (**Management Override**, fraud, assertion-level=false, wp `JE-1`,
   proc `jet`) wajib direspons prosedur substantif **diperluas/spesifik** — bila di-override ke
   "Substantif", itu under-response yang tak ketahuan.
2. **Tautan WP & kesiapan eksekusi.** Tiap risiko membawa `wp` (mis. `B-3`, `B-7`, `JE-1`) &
   `proc`, tetapi tak ada cek bahwa WP itu **ada & sedang dieksekusi** (`deriveWpStatus`).
   Respons terencana yang menunjuk WP **Not Started/kosong** = gap perencanaan↔eksekusi yang
   tak terlihat di memo strategi.
3. **Kelengkapan cakupan.** Tak ada roll-up "setiap RoMM punya respons memadai & tertaut WP".
   Risiko tanpa `response`/`wp`/`proc` lolos diam-diam.

Bonus penyakit arsitektur (sama seperti #34): logika perencanaan `smDefaultApproach` +
`SM_APPROACHES` tertanam **inline di view_misc1** — bukan kanon. Begitu rekonsiliasi
memerlukan logika "pendekatan yang memadai untuk sebuah risiko", logika itu harus jadi SSOT.

## Objective
Hubungkan penilaian risiko (SA 315) ke respons audit (SA 330) di dalam strategi: jadikan logika
"pendekatan terencana per risiko" **kanon SSOT**, lalu **rekonsiliasi** tiap RoMM terhadap
(a) kememadaian respons, (b) tautan prosedur/`proc`, dan (c) status WP — **angkat gap**:
risiko Signifikan/kecurangan dengan respons lemah, respons tanpa WP/prosedur, atau WP belum
mulai. Murni & teruji di kanon; view mengonsumsi. Mencerminkan kontrak #32/#33/#34.

## Success Criteria
1. Modul murni baru `canon_audit_plan.ts` (tanpa React):
   - `APPROACHES` (`sub`/`ctrl`/`ext` — id/short/label/color) + `defaultApproach(risk)`
     (diangkat 1:1 dari `smDefaultApproach` view_misc1) + `approachRank` (sub<ctrl<ext).
   - `adequateApproach(risk)` → pendekatan **minimum** yang memadai (Significant/fraud → `ext`;
     L×I≥9 → `ctrl`; selain itu → `sub`).
   - `reconcileRiskResponse({ risks, overrides, wpStatusByRef })` → per-risiko:
     `plan` (override∨default), `adequate` (rank(plan) ≥ rank(min)), `hasResponse`,
     `hasWp`, `hasProc`, `wpStatus`, `wpReady` (status ∈ {In Progress, Review, Done}),
     daftar `gaps[]` bertipe (`under-response` | `no-response` | `no-wp` | `no-proc` |
     `wp-not-started`), + roll-up (total RoMM, signifikan, fraud, gap per jenis, % cakupan
     memadai-&-tertaut-WP).
   - Pure: `wpStatusByRef: Record<string,string>` **diinjeksi** (view menghitung via
     `deriveWpStatus`), kanon tak menyentuh global — meniru `reconcileGovernanceComms` yang
     menerima `mlFindings`.
   - Unit test ≥12 kasus, `tsc` 0 (full strict), ESLint bebas-`any`.
2. **`view_misc1.tsx` (`SmApproach`) refactor SSOT (behavior-preserving)**: `SM_APPROACHES` &
   `smDefaultApproach` dikonsumsi dari kanon (hapus duplikasi inline). Tabel & toggle `seg`
   berperilaku identik (persist `strategyApproach.v1` tak berubah; verifikasi live).
3. **Panel baru "Pemetaan Risiko → Prosedur (SA 330)"** di Tab "Pendekatan per Area": ringkasan
   roll-up (cakupan memadai %, jumlah gap per jenis) + daftar risiko ber-gap di-flag (merah
   under-response/no-response, amber wp-not-started) dengan nav ke modul WP/`execution` terkait
   (`openCanonicalWp`/`nav(proc)`). Risiko tanpa gap = hijau.
4. Gate hijau (`lint`/`typecheck`/`test`/`build`); diverifikasi live (Partner & Manager).

## Scope
Modul `strategy` (rekonsiliasi risiko→respons→WP di Tab Pendekatan) + ekstraksi
`canon_audit_plan.ts` + refactor SSOT `SmApproach` (konsumsi kanon, tanpa ubah perilaku tabel).

## Non-Scope
- Tab lain strategy (Strategi Keseluruhan, Jadwal & Sumber Daya, Dokumen Memo) selain bila
  perlu menampilkan badge gap ringkas (opsional, tidak wajib).
- Mengubah register RISKS / seed risiko, modul `risk` (RoMM), atau `execution` (audit programme).
- Mengubah `deriveWpStatus` atau `wpState`; hanya **membaca** status WP.
- Persistensi baru; server. `strategyApproach.v1`/`strategyTab.v1` existing dipertahankan.
- Generator memo / export PDF.

## Constraints
- ESM-only; edit `migration/src/*`. Aturan emas anti-tabrakan (alias hook unik; tak ada
  `styles`/nama global bentrok; ekspor via `Object.assign(window, …)` dipertahankan).
- SSOT: pendakatan & kememadaian respons diturunkan dari kanon, tak diduplikasi; angka dari
  konteks/canon, tak hardcode.
- `tsc` 0 (full strict); ratchet ESLint `no-explicit-any` — file `.ts` baru **bebas-`any`**;
  tambahan `.tsx` digigit baseline bulk-suppress → **tipekan, jangan re-baseline** (pelajaran
  #32/#34). Cek baseline `view_misc1.tsx` di `eslint-suppressions.json` sebelum edit.
- UI Bahasa Indonesia; `rp()`/`fmt()`; CSS var.

## Existing Solutions (reuse)
- `canon_deficiency.ts` (#34) = template kanon-murni terverifikasi (model + reconcile + roll-up +
  test). `canon_assertions.ts` = contoh kanon-murni menerima `RiskInput[]`.
- `smDefaultApproach`/`SM_APPROACHES` (view_misc1) = logika yang diangkat ke kanon (konsumen
  tunggal saat ini → de-dup aman).
- `deriveWpStatus(ref, audit, firm)` (view_wp.tsx) = sumber status WP (dipanggil di view, hasil
  diinjeksi ke kanon). `openCanonicalWp(nav, ref)` = nav ke WP kanonik.
- RISKS seed (`data_part1.ts`): `response`/`wp`/`proc`/`inherent`/`fraud`/`assertionLvl`/
  `likelihood`/`impact` per risiko — sudah ada, cukup untuk rekonsiliasi.
- nav `risk`/`execution`/`materiality` & RELATED_SA `strategy`=SA 300 sudah terdaftar.

## Proposed Approach
1. **`canon_audit_plan.ts`** (murni): pindahkan `APPROACHES`+`defaultApproach` dari view_misc1;
   tambah `adequateApproach`, `approachRank`, tipe `RiskInput`/`PlanRow`/`PlanGap`/`PlanRollup`,
   dan `reconcileRiskResponse({risks, overrides, wpStatusByRef})`.
2. **`canon_audit_plan.test.ts`**: default approach per tingkat risiko; adequacy
   (signifikan/fraud→ext; override lemah=gap; override kuat=ok); no-response/no-wp/no-proc;
   wp-not-started vs wp-ready; roll-up cakupan; input kosong; integrasi seed nyata
   (R-01/R-05 signifikan-fraud, R-08 moderate).
3. **Refactor `SmApproach`**: impor `APPROACHES`/`defaultApproach` dari kanon; hitung
   `wpStatusByRef` dari `risks` via `deriveWpStatus`; panggil `reconcileRiskResponse`.
4. **Panel "Pemetaan Risiko → Prosedur (SA 330)"**: roll-up + daftar gap + nav. Tabel existing
   ditambah kolom/badge status (memadai? WP siap?) tanpa mengubah toggle.

## Risks
- **Regresi tabel pendekatan** → mitigasi: refactor behavior-preserving (kanon = ekstraksi 1:1
  dari `smDefaultApproach`), unit test + verifikasi live toggle & persist `strategyApproach.v1`.
- **`deriveWpStatus` tak diekspor lintas-modul** → mitigasi: cek ekspor; bila lokal di view_wp,
  re-export atau hitung status via selektor yang sama (tetap injeksi hasil ke kanon agar murni).
- **Ratchet `any`** pada edit view → mitigasi: tipekan; impor tipe kanon (`RiskInput` dll).
- **Scope creep** ke modul `execution`/`risk` → mitigasi: hanya baca; sentuh hanya `SmApproach`.
- **False-positive gap** (mis. risiko Moderate sengaja substantif) → mitigasi: adequacy berbasis
  minimum-rank, bukan kesetaraan; Moderate cukup `sub`.

## Implementation Plan
1. Sign-off PRD.
2. `canon_audit_plan.ts` + test (TDD) → gate.
3. Refactor `SmApproach` (konsumsi kanon) → gate + verifikasi live tabel/toggle.
4. Panel rekonsiliasi → gate + verifikasi live (Manager & Partner).
5. PR off `master`; update memory `asseris-module-evaluation` (#4 TUNTAS).

## Open Questions
1. **Definisi "memadai" (adequacy).** Usulan: Significant **atau** fraud → minimum `ext`
   (substantif diperluas); L×I≥9 (non-signifikan) → minimum `ctrl`; selain itu `sub`. Risiko
   override **ke atas** selalu OK; override **ke bawah** dari minimum = `under-response` gap. —
   **Saran: ya.** Setuju ambang ini?
2. **"WP siap" (wpReady).** Status WP ∈ {In Progress, Review, Selesai/Done} = siap; {Not
   Started/kosong} pada risiko Signifikan = gap `wp-not-started` (amber). Untuk risiko non-
   signifikan, WP belum mulai **tidak** di-flag (hanya dicatat). — **Saran: ya.** Setuju?
3. **Penempatan panel.** (a) Panel baru di **Tab "Pendekatan per Area"** (paling dekat tabel,
   saran), atau (b) tab ke-5 "Risiko→Prosedur" terpisah? — **Saran: (a).**
4. **Nama kanon** `canon_audit_plan.ts` (konsep SA 330, sesuai konvensi concept-named
   `canon_deficiency`/`canon_assertions`) — OK? Alternatif `canon_strategy.ts` (module-named).
5. **Nama cabang** `feat/strategy-risk-response-reconciliation` (off `master`) — OK?
