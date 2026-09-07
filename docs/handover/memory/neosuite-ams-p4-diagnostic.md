---
name: neosuite-ams-p4-diagnostic
description: "NeoSuite AMS feature stream P4 — Tax Audit Diagnostic engine (deterministik, bukan LLM): status & fase"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6ad69e92-5be7-43e0-98d7-b555b1f3d121
---

Feature build **P4** (gap eval §4 P4; side-project Ari "AI Tax Audit Diagnostic"). PRD = `Audit System/PRD - AI Tax Audit Diagnostic (P4).md` (Proceed. diberikan). Lanjutan setelah [[neosuite-ams-p1-conclusions]]/[[neosuite-ams-p2-wp-signoff]]/[[neosuite-ams-p5-lifecycle-gates]].

**Keputusan kunci (truth over hype):** lapisan LLM **STUB** — `llm_providers.js` nyatakan "TIDAK memanggil API nyata", butuh proxy server (W6-adjacent). Maka P4 = **mesin forensik/statistik DETERMINISTIK & teruji** di atas `AMS_CANON`/`AMS_FORENSIC`, BUKAN LLM. Narasi LLM = fase masa depan (gated W6/proxy). Konsisten: app sudah melabeli `amsCrossChecks` deterministik sbg "AI Insights". PRD Q: Q1 deterministik-first · Q2 tax-weighted (Benford pembayaran + book-tax) + forensik umum · Q3 mesin+view baru (serap AiInsightPanel) · Q4 localStorage.

**Infra eksisting yang dikonsumsi (peta Explore):** `AMS_FORENSIC` (JET_CRITERIA 8 flag SA240, JOURNAL_POP amount/flags/forensic/rpId/dir, score, buildCash→flagged/anomalyOut/rpExposure) · `AMS_CANON.reconcile()`→`{accounting:[{id,pos,variance,status,ref}]}` · `FIG`/`RATE`(0.22)/`FISCAL` di canon_base (pbt 48500,pkp 53500,permAdd 1200,permLess 3000,dtaReported,taxLoss 3000,taxExpBooked) · `computeWtbSummary` outlier · `amsCrossChecks(ctx)`→`{id,sev,std,title,detail,modules}` (ai_insights.jsx, deterministik, 6 cek). **Benford = greenfield** (SA240 FR-04 sebut tapi tak ada).

**Fase 0 = DONE & committed** (`93c78e1`). `diagnostics.ts` (TS strict, dual-publish `window.AMS_DIAG`+ESM) + `diagnostics.test.js` (10 test). BELUM ada UI.
- `benford(amounts)`→`{n,counts,observedPct,expectedPct,mad,conformity,topDeviation}`. MAD Nigrini (close<0.006<acceptable<0.012<marginal<0.015<nonconforming); n<30→'insufficient'. `leadingDigit` via `toExponential()[0]`.
- `bookTaxFlags(fig,rate=RATE)`→`DiagFinding[]`: bt-perm (permTotal/pbt>8%), bt-etr (|taxExp/pbt − rate|>3%), bt-dta (dta>0 && taxLoss>0). std PSAK 46.
- `amsDiagnostics(ctx?)`→`DiagFinding[]` urut severity: benford(amount jurnal+aje) + bookTaxFlags(FIG) + adaptor JET (≥3 flag→jet-concentration), RPT (rpId+dir out+forensic→rpt-exposure SA550/PSAK7), reconcile breach (status≠ok). Murni bila ctx lengkap; default dari canon/forensic. `ctx.extraFindings` utk gabung amsCrossChecks dari view (hindari import React ke engine).
- `DiagFinding`={id,detector,sev(high/med/low),std,title,detail,modules,drillView?,suggestedProcedure?}; `DIAG_SEV` rank/tone/label.
- 59 test total (canon 49 utuh). lint/typecheck/build hijau. (Engine belum di-import app → tree-shaken dari bundle; di-load saat view Fase 1 mengimpornya.)

**Fase 1 = DONE & committed** (`5621d69`). UI:
- `diagnostics_panel.jsx`: `<DiagnosticPanel area title>` embeddable (filter `drillView===area || modules.includes(area)`; kosong=agregat) + `useDiagnostics(area)` hook (live atas `audit.aje`, default tarik canon) + `DiagFindingCard` (badge severity, std mono, detail, saran prosedur, tombol "Buka modul"→`nav(drillView,{from:'diagnostic'})`). Label jujur "berbasis aturan & statistik — bukan model bahasa".
- `view_diagnostics.jsx`: `TaxAuditDiagnostic` agregat (stat total/high/med/detektor + catatan deterministik + DiagnosticPanel tanpa area).
- Registrasi: `icons.jsx` MODULES `diagnostic` (Core Execution, ikon `sparkle`) · `app.jsx` import+`case 'diagnostic'` · embed `<DiagnosticPanel area="forensic">` di `view_forensic.jsx`. Mengimpor `diagnostics_panel`→`diagnostics.ts` memuat `AMS_DIAG`.

**Verified :5180 (data LIVE canon, ENG-2025-014):** view agregat **11 temuan** — jet-concentration(5 jurnal ≥3 flag)+rpt-exposure HIGH; bt-perm+bt-dta+6 breach reconcile (lease/dta/tax/impair/prov/ja) MED; benford-insufficient LOW. **bt-etr TAK firing** (ETR≈22% → tanpa false positive — bukti ambang bekerja). Embed forensic terfilter→1 temuan (rpt-exposure). 0 console err. 59 test (canon+diag) utuh; lint/typecheck/build hijau.

**Fase 2 = DONE & committed** (`0dcc9ac`).
- **Serap crossChecks**: `crossChecksAsFindings(audit)` (panel) normalisasi `amsCrossChecks`→DiagFinding (detector 'crossChecks', drillView=refs[0]); `useDiagnostics` kirim sbg `ctx.extraFindings`. Live = **17 temuan** (11 mesin + 6 cross-modul: fraud-aje, inv-nrv, jet-override, conf-noreply, conf-discrep, wp-noreviewer).
- **Keputusan ber-audit-trail**: `useDiagDecisions` (pola AiInsightPanel) persist `ams.v1.diagnostics.v1` `{verdict,who,role,when,reason}` + `logActivity(mod:'diagnostic')`. Card: "Tindak lanjuti" / "Abaikan + alasan WAJIB"; toggle "Tampilkan diputuskan"; badge severity = sebaran temuan TERBUKA (selaras "N terbuka", bukan total).
- **Multi-embed**: `<DiagnosticPanel area>` di jet/psak46/aje/risk (+ forensic Fase 1). **wtb dilewati** (anchor view tak bersih; inv-nrv tetap di agregat).
- Verified :5180: follow→decided+log (17→16 open); dismiss→reason wajib (rpt-exposure); persist lintas-route; embed aje(fraud-aje)+jet(jet-override+benford) terfilter. 0 console err; 59 test utuh.

**P4 DETERMINISTIK SELESAI (Fase 0-1-2).** Fase 3 (narasi LLM) **kini TERKIRIM via W8** (`8195929` —
lihat [[neosuite-ams-w8-llm-proxy]]): tombol "Jelaskan N temuan" di `diagnostics_panel.jsx` melewatkan
temuan deterministik TERBUKA (ter-redaksi) ke proxy LLM server → narasi model bahasa + disclaimer
("bukan deterministik · verifikasi sebelum dipakai"); muncul hanya bila `status.canUse`, degradasi
anggun bila proxy tak terkonfigurasi. Mesin deterministik tetap SSOT; narasi = lapisan baca opsional.
Sisa minor (opsional): detektor WTB-outlier khusus + embed wtb; deprecate `AiInsightPanel` (kini
diserap diagnostik); smoke narasi vs provider berbayar nyata (sejauh ini mock upstream).
