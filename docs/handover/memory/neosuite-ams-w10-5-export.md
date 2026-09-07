---
name: neosuite-ams-w10-5-export
description: "NeoSuite AMS W10.5 — real PDF/XLSX export + nol-vendor Ed25519 seal + verify-seal UI (COMPLETE, Fase 0-3)"
metadata: 
  node_type: memory
  type: project
  originSessionId: bb3ad062-8690-46dd-9441-acfa0d235723
---

W10.5 = second slice of the final wave (W10 = "Keamanan, ekspor, observability & deploy"); closes
the export(PDF/XLSX)+e-Sign deferral from [[neosuite-ams-w10-hardening]]. Turns cosmetic export
buttons into REAL downloadable, sealed, audited artifacts. Governing doc: `PRD - W10.5 Ekspor
(PDF-XLSX) & Segel Nol-Vendor.md` (repo root). Decisions (user "Proceed", all defaults): **Q1=A**
client-side libs (jspdf/jspdf-autotable/qrcode + SheetJS, lazy-loaded — boot unaffected, no headless
in container), **Q2=A** nol-vendor Ed25519 seal (NOT e-Meterai/PSrE — provenance+integrity only),
**Q3=A** PDF deliverables + XLSX registers. On branch `master`.

**Pre-W10.5 reality:** only `window.amsPrintDoc()` (`ui.jsx`) was semi-real (browser print of
visible `.doc-paper`, no Blob/hash/seal); ~20 "Ekspor/Unduh" buttons were dead; XLSX = mock
filenames only; e-Sign nonexistent. Seed already anticipated an `EXPORT` audit action.

**Fase 0 DONE (`f0ec8c4` "W10.5 Fase 0: server export seal (Ed25519) & export-event audit").**
- `Seal` model (Prisma): id(=sealId)/kind/contentHash/scope/scopeId/signerUserId/signerRole/
  signedAt/pubKeyId/signature.
- `server/src/crypto/signing.ts`: Ed25519 (Node crypto, nol-vendor). Key from `APP_SIGNING_KEY`
  (base64 PKCS8 DER); no env = **ephemeral per-process dev key** (works end-to-end but seals don't
  survive restart → verify reports `key-rotated`, not tamper). `signHash`/`verifyHash`,
  `pubKeyId`=sha256(SPKI)[:16], `__resetSigner` (test), `exportPrivateKeyBase64`.
- `server/src/export/seal.ts`: `createSeal` (sign+persist), `verifySeal(sealId,hash)` → reasons
  `ok|not-found|hash-mismatch|bad-signature|key-rotated`. Hash covers CANONICAL CONTENT PAYLOAD
  (not raw bytes — re-export reproduces it).
- Router `exporter`: `seal` / `verifySeal` / `logEvent` (unsealed exports). Gated **CAP.EXPORT**
  (new in shared `rbac.js`, granted ALL 4 roles; audit-trail export still needs AUDIT_VIEW) +
  W7.5 `assertEngagementAccess` for scope=engagement. Audits `SEAL`/`EXPORT` (action added to
  `audit/log.ts` union) — **detail = metadata only** (kind, format, hash[:12]), never content.
- +11 server vitest → **95 total** (signing round-trip, verify reasons, RBAC-deny unknown role,
  isolation member-vs-outsider, audit metadata-only). typecheck 0.
- **GOTCHA:** must `prisma db push` to the DEV db too (`server: npm run db:push`) — the test runner
  only pushes test.db; first live seal 500'd "table main.Seal does not exist" until pushed. The
  push's regenerate step EPERMs on the running tsx-watch (DLL lock) — harmless, client already had
  the model.

**Fase 1 DONE (`75b24c8` Fase 1a + `e32b287` Fase 1b).** Client PDF generator + 3 sealed deliverables.
- `migration/src/export_pdf.js`: `amsExportPdf(model)` — structured-doc composer (heading/para/kv/
  table/signature blocks) → real PDF Blob via lazy `import()` of jspdf+jspdf-autotable+qrcode (own
  rollup chunks — NOT in main bundle). Computes sha256 of canonical payload → `exportSeal` → embeds
  sealId+pubKeyId+hash+verify-QR (`neosuite-seal:<id>;<hash>`) + `SEAL_DISCLAIMER` ("BUKAN
  e-Meterai"). Degrades to UNSEALED + `exportLogEvent` when server down / role lacks EXPORT
  (reason forbidden|unavailable). `doc.save(fileName)` downloads.
- `api.js`: `exportSeal` (throws→degrade) / `exportVerifySeal` / `exportLogEvent` (swallow→null).
- Wired (all "Unduh/Export PDF" → real sealed export; added "Cetak"=amsPrintDoc secondary where apt):
  **materiality memo** (`view_materiality_parts.jsx` MatMemo; prose single-sourced as MAT_MEMO_SEC1..3
  shared with preview), **FS** (`view_fsgen.jsx` buildFsBlocks → 4 statements from FSGEN model via
  the view's `sc()` scaler = zero numeric drift), **opinion** (`view_opinion.jsx` OP_TXT/
  OPINION_PARA_O/buildOpinionBlocks single-sourced with preview; preview text byte-identical).
- table block gained `boldRows` (FS sections/totals via autotable didParseCell).
- **Live-proven (Manager Anindya `anindya.p@whr-cpa.id`/`Manager#2025!`):** all 3 → sealed=true,
  SEAL rows key=materiality/fs/opinion (metadata only), verifySeal ok / wrong-hash=hash-mismatch,
  opinion preview full text intact, 0 console err. lint 0 / typecheck 0 / build green (PDF libs
  lazy-split) / 59 migration vitest (zero numeric regression).
- 0 PROD vulnerabilities from the 3 new deps (8 reported are dev-only/pre-existing).

**Fase 2 DONE (`2e88a59` "W10.5 Fase 2: sealed XLSX register export (SheetJS)").** Client XLSX
generator mirroring Fase 1.
- `migration/src/export_xlsx.js`: `amsExportXlsx(model)` — sheet model `{sheets:[{name,columns,rows,
  totals?,colWidths?}]}` → real .xlsx Blob via **lazy** `import('xlsx')` (SheetJS, own ~499 KB rollup
  chunk — NOT in boot bundle). sha256 of canonical sheet payload → `exportSeal` → appends a **"Segel"**
  sheet (sealId+pubKeyId+hash+`SEAL_DISCLAIMER`). Degrades UNSEALED+`exportLogEvent` (forbidden|
  unavailable). `XLSX.writeFile` downloads. Numbers **pre-formatted via `rp()`/`fmt()` at callers**
  (SSOT=canon/wtb) → cells = id-ID text identical to screen (negatives in parens), no numeric cells
  (screen-fidelity over arithmetic, consistent w/ Fase 1 PDF tables).
- Wired 5 dead "Ekspor" buttons: **WTB** (`view_execution` WTBView, `wtb-register`), **AJE**
  (`view_aje`, 2 sheets list+lines, `aje-register`), **risk RoMM** (`view_risk`, `risk-register`),
  **fixed-asset** (`view_psak16` "Kertas Kerja E", 2 sheets sub-ledger+GL-recon, `fixed-asset-register`),
  **audit trail** (`view_crypto` `CRServerChain`, `audit-trail`, scope=firm). 4 working registers
  scope=engagement (W7.5). Audit-trail button **AUDIT_VIEW-gated by reuse** — only renders inside
  CRServerChain (server returns `srvChain` rows solely to AUDIT_VIEW roles).
- **SheetJS from official CDN `xlsx-0.20.3.tgz`** (NOT npm 0.18.5 = parse-path CVEs) → **0 prod vuln**;
  write-only usage never reaches the vulnerable read path. package.json records the CDN URL.
- **Live-proven (Manager Anindya):** 5 buttons → sealed=true, SEAL rows seq 14-18 (metadata only),
  each `verifySeal.kind` correct, wrong-hash=hash-mismatch, valid PK .xlsx round-trip (sheets +
  "Segel", rp() cells intact), 0 console err. lint 0 / typecheck 0 / build green / 59 vitest (zero
  numeric regression). GOTCHA: `exportVerifySeal` needs a 64-hex contentHash (input-validated) — a
  short dummy throws→null.

**Fase 3 DONE (`b05b089` "W10.5 Fase 3: verify-seal UI for export provenance seals") → W10.5 COMPLETE
(Fase 0–3).** `CRVerifySeal` di tab "Meterai & PSrE" (`view_crypto.jsx`): tempel Seal ID + hash, atau
muatan QR `neosuite-seal:<id>;<hash>` (auto-split via regex) → `amsExportVerifySeal` → verdikt
ber-warna untuk tiap reason (ok/hash-mismatch/bad-signature/not-found/key-rotated/unavailable) +
validasi 64-heks klien sebelum panggil + tampil kind/scope/signer/signedAt/pubKeyId saat cocok.
Dibingkai "BUKAN e-Meterai". Legacy "Unduh Bukti Segel" (drawer DMS, `amsFakeHash` demo) **sengaja
tak disentuh** — bukan segel ekspor W10.5. **GOTCHA fixed:** `I.fingerprint` TAK ADA di icons.jsx
(tab strip pakai `I[ic]||I.panel` fallback yg menutupinya) → header awal crash "type is invalid";
ganti ke `I.shield`. Live-proven (Manager): QR sah→TERVERIFIKASI(kind/scope/signer), hash salah→HASH
TAK COCOK, id asing→TAK DITEMUKAN, hash pendek→validasi; panel+register legal sama-sama render, 0
console err. lint/typecheck/build/59 vitest hijau. BUILD.md updated (Fase 0–3 SELESAI).

**Deferred (unchanged):** real e-Meterai/PSrE, email delivery, zip engagement package.

**Verify/preview gotchas (this session):** dev needs BOTH servers (`dev:all`); use launch.json
`dev-all` config (port 5180, pins server PORT=5181) via `preview_start` — it must OWN 5180 (stop any
manual `dev:all` first). Nav = `localStorage['ams.route']='<id>'` (PLAIN string) + `location.reload()`.
Export buttons trigger downloads (not observable) → verify via `window.amsExportPdf` return,
`amsAuditList`, console errors. Opinion Export-PDF button only on tab `builder` ("Penyusun Laporan").
