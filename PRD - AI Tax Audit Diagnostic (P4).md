# PRD — Tax Audit Diagnostic (P4)

> Wajib sign-off ("Proceed.") sebelum implementasi.
> Acuan gap: `Evaluasi Fitur NeoSuite AMS - Gap & Pendalaman.md` §4 (P4) & §7.
> Stream: setelah P1/P2/P5 (lapisan WP auditable + gerbang lifecycle) berdiri.

| Field | Isi |
|---|---|
| Tanggal | 2026-06-18 |
| Pemilik | Ari Widodo |
| Status | **DRAFT — menunggu sign-off** |

---

## 1. Problem
"AI-enabled Tax Audit Diagnostic" adalah side-project Anda yang **belum jadi fitur**. Sentuhan
AI di app hanya 2: `amsCrossChecks` (6 cek lintas-modul deterministik, dilabeli "AI Insights")
& copilot global. Padahal fondasi **forensik deterministik** sudah kuat tapi **terpencar &
kurang dieksploitasi**: `forensic_canon` (8 kriteria JET SA 240, populasi jurnal ber-skor, arus
kas forensik: `flagged`/`anomalyOut`/`rpExposure`), `reconcile()` (varians tie-out lintas-modul),
jembatan **book-tax** `psak46`/`FISCAL`/`figuresFromWTB`, dan `computeWtbSummary` (outlier varians).

Yang hilang: (a) **mesin diagnostik tunggal** yang mensintesis sinyal-sinyal ini menjadi temuan
ber-prioritas, ber-rujukan standar, dengan **saran prosedur**; (b) **detektor bernilai tinggi yang
belum ada** — terutama **Benford's Law** (disebut eksplisit di register fraud SA 240 FR-04 tapi
TAK diimplementasikan) dan **red-flag fiskal/book-tax** (inti "Tax" Audit Diagnostic); (c)
**penyajian terembed per-area**, bukan hanya drawer global.

**Catatan kritis (truth over hype):** lapisan LLM **stub** — `llm_providers.js` menyatakan
"Aplikasi ini TIDAK memanggil API nyata"; panggilan butuh **proxy server** (W6-adjacent). Maka
"AI" di sini = **mesin forensik/statistik deterministik & teruji**, BUKAN LLM. Narasi LLM ditunda
sampai ada API/proxy nyata (lihat §5/§10).

## 2. Objective
Bangun **Tax Audit Diagnostic engine** deterministik di atas `AMS_CANON`/`AMS_FORENSIC` yang:
menjalankan baterai **detektor** (Benford, red-flag fiskal/book-tax, sintesis JET/forensik,
breach rekonsiliasi, outlier WTB, cross-checks), menghasilkan **temuan terstandardisasi**
(severity · rujukan SA/PSAK · modul · drill-to-view · **saran prosedur**), dan menyajikannya
**terembed per-area** + agregat. Honest, **teruji (unit test gaya canon)**, offline, SSOT.

## 3. Success Criteria
- Fungsi murni `amsDiagnostics(ctx)` (lapisan canon, TypeScript) → array temuan tervalidasi:
  `{ id, detector, severity, stdRef, title, detail, modules, drillView, suggestedProcedure, evidence }`.
- ≥1 detektor **baru greenfield**: **Benford** (1-digit, MAD/χ² + flag deviasi) atas amount
  jurnal/pembayaran — pure, ber-unit-test.
- ≥1 detektor **tax-spesifik**: red-flag book-tax (mis. beda permanen besar, pemulihan DTA,
  tren beda temporer) dari `psak46`/`FISCAL`.
- Sintesis sinyal yang SUDAH ada (JET `flagged`, `rpExposure`, `reconcile` err/warn,
  `computeWtbSummary` unexplained, `amsCrossChecks`) ke skema temuan tunggal — tanpa hardcode
  ulang angka (tarik dari canon).
- Komponen embeddable `<DiagnosticPanel area=… />` + satu view agregat; terpasang di ≥2 host.
- **Audit trail**: terima/tolak temuan tercatat (reuse pola keputusan `ai_insights`).
- Gate teknis: `lint`/`typecheck` (strict) hijau; **unit test baru hijau & canon 49 tetap utuh**;
  0 console error; diverifikasi live (Vite :5180) di host + agregat.

## 4. Scope
- **Mesin** `diagnostics.ts` (lapisan canon, TS strict, dual-publish `window.AMS_DIAG` + ESM):
  - `benford(amounts)` murni (distribusi 1-digit, MAD, verdict).
  - `bookTaxFlags(fiscal/fig)` murni (red-flag fiskal).
  - `amsDiagnostics(ctx)` orkestrator → temuan tergabung & ber-skor; `ctx` = {wtb, aje, risks,
    forensic pop, reconcile rows, …} (ditarik dari canon/forensic/audit).
  - Unit test (`diagnostics.test.js`) gaya `canon_*`.
- **UI** `diagnostics_panel.jsx`: `<DiagnosticPanel area>` (filter per-area) + view agregat
  `view_diagnostics.jsx` (route + nav entry, ikuti checklist 4-langkah CLAUDE.md §3).
- **Embed** awal: host paling relevan — **forensic**, **jet**, **wtb** (Fase 2 perluas).
- **Keputusan terima/tolak** persist `localStorage` (reuse pola `ai_insights`).

## 5. Non-Scope
- **Integrasi LLM nyata / narasi AI** — stub & butuh proxy (W6). Ditunda; arsitektur mesin
  dibuat agar lapisan narasi bisa ditambah belakangan tanpa rombak.
- Model ML terlatih / pembelajaran perilaku (di luar deterministik+statistik).
- Backend (tetap `localStorage`).
- Modul host di luar batch (psak46/aje/risk = Fase 2; selain itu nanti).
- Mengubah `forensic_canon`/`canon` numerik (hanya MENGONSUMSI; canon 49 test tak tersentuh).

## 6. Constraints
TypeScript strict untuk lapisan mesin (gate `tsc --noEmit`) · `lint`/test hijau · ESM-only
`migration/src/*` · aturan emas anti-tabrakan · SSOT (figur dari canon, jangan hardcode) ·
Bahasa Indonesia UI · **PRD dulu**.

## 7. Existing Solutions / dipakai ulang
- `AMS_FORENSIC` (JET_CRITERIA, JOURNAL_POP, score, buildCash → flagged/anomalyOut/rpExposure).
- `AMS_CANON.reconcile` (varians tie-out), `psak46`/`FISCAL`/`figuresFromWTB` (book-tax),
  `computeWtbSummary` (outlier varians).
- `amsCrossChecks` + pola keputusan terima/tolak ber-audit-trail (`ai_insights.jsx`) — cetakan
  UX & skema severity (high/med/low, std, refs).
- `AiInsightPanel` sebagai referensi komponen embeddable.
Custom work dibenarkan: detektor baru (Benford, book-tax) + orkestrator + penyajian terembed —
tak ada yang setara saat ini (greenfield per §8 map).

## 8. Proposed Approach
1. **Skema temuan tunggal** `DiagFinding` — semua detektor menormalkan ke bentuk ini.
2. **Detektor murni** (TS, ber-test): `benford`, `bookTaxFlags`; **adaptor** yang membungkus
   sinyal eksisting (`reconcile`→breach, forensic `flagged`→concentration/RPT, WTB unexplained,
   crossChecks) jadi `DiagFinding`.
3. **Orkestrator** `amsDiagnostics(ctx)` jalankan semua, dedupe, skor, urutkan severity.
4. **Penyajian**: `<DiagnosticPanel area>` filter `drillView`/modul; view agregat dengan ringkasan
   per-severity & per-standar; tombol drill `nav(drillView)` & terima/tolak (persist + audit log).
5. **Arsitektur siap-LLM**: temuan deterministik bisa kelak dilewatkan ke lapisan narasi opsional
   (Fase masa depan) tanpa mengubah mesin.

## 9. Risks
- **Scope sprawl** (banyak detektor × banyak host) → mitigasi: Fase 0 mesin+2 detektor inti+
  sintesis; UI 1 agregat+2 host; sisanya fase lanjут.
- **"AI" menyesatkan** (kesan LLM padahal deterministik) → mitigasi: label jujur ("Diagnostik
  Forensik", "berbasis aturan & statistik"); narasi LLM eksplisit ditandai non-aktif.
- **False positives** (mis. Benford pada populasi kecil) → mitigasi: ambang sampel minimum +
  verdict "tidak konklusif"; temuan = PROPOSAL, auditor memutuskan (audit trail).
- **Duplikasi dgn `amsCrossChecks`** → mitigasi: serap crossChecks sebagai salah satu sumber,
  bukan paralel; pertimbangkan deprecate/aliaskan nanti.
- **TS strict friction** → mitigasi: ikuti pola `canon_*.ts` + `canon_types.ts`.

## 10. Implementation Plan (bertahap, pola P1/P5)
- **Fase 0:** mesin `diagnostics.ts` — skema + `benford` + `bookTaxFlags` + adaptor sinyal
  eksisting + `amsDiagnostics` orkestrator; `diagnostics.test.js`. Ekspor `AMS_DIAG`. (Tanpa UI.)
- **Fase 1:** `<DiagnosticPanel>` + `view_diagnostics.jsx` (route+nav) agregat; embed di 1 host
  (forensic). Verifikasi live.
- **Fase 2:** embed jet + wtb (+ psak46/aje/risk), terima/tolak ber-audit-trail, serap crossChecks.
- **Fase 3 (masa depan, gated W6/proxy):** lapisan narasi LLM opsional di atas temuan.
- Tiap fase: `lint`/`typecheck`/test + verifikasi browser + commit + memory.

## 11. Open Questions (perlu keputusan sebelum "Proceed.")
1. **Deterministik-first vs tunggu LLM** — bangun mesin forensik/statistik deterministik sekarang
   (LLM ditunda), atau tahan P4 sampai proxy LLM ada? *(rekomendasi: deterministik-first — bernilai,
   jujur, shippable; LLM = lapisan masa depan.)*
2. **Bobot fokus** — tax-weighted (Benford pembayaran + red-flag book-tax/fiskal jadi sorotan)
   plus forensik umum, atau forensik-audit umum saja? *(rekomendasi: tax-weighted sesuai nama
   "Tax Audit Diagnostic", tetap sertakan forensik umum yang canon dukung.)*
3. **Penyajian** — mesin baru + view agregat "Diagnostik" + embed per-host (rekomendasi), atau
   cukup perluas `AiInsightPanel` yang ada? *(rekomendasi: mesin+view baru; `AiInsightPanel` jadi
   salah satu konsumen/diserap.)*
4. **`localStorage`** untuk keputusan terima/tolak (warisan)? *(diasumsikan ya.)*

---
**Sign-off:** balas **"Proceed."** untuk mulai Fase 0. Bila ingin ubah Q1-Q3, sebutkan dan saya
sesuaikan PRD lebih dulu.
