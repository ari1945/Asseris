---
name: neosuite-ams-w9-connectors
description: NeoSuite AMS W9 — konektor data / integrasi nyata (server framework + Bank Feed E2E)
metadata: 
  node_type: memory
  type: project
  originSessionId: c215f35e-79ea-4fec-b4f5-b5aa7cacae34
---

Wave **W9 "Integrasi nyata"** — gelombang Fase B berikutnya. Lanjutan [[neosuite-ams-arc]] ·
[[neosuite-ams-w6-backend]] · [[neosuite-ams-w8-llm-proxy]]. PRD root: `PRD - W9 Konektor Data
(Integrasi Nyata).md` (**Proceed.** 2026-06-19; keputusan 1a/2a/3a).

**Reality-check (menentukan scope):** DoD backlog W9·1 = "konektor tarik data NYATA E2E", tapi
provider asli (Coretax/DJP, BCA/Mandiri OpenAPI, PrivyID, MS-Graph) **tak bisa dikreditensialkan
dari lingkungan ini** (sertifikat PKP / mTLS / app-reg tenant). Maka — **persis pola W8** — bangun
kerangka NYATA, buktikan vs **adapter fixture**, adapter HTTP-nyata = drop-in tipis. Cetak-biru
`migration/src/data_import.js` (8 konektor, mapping/scope/webhook/control-total/tie-out SSOT) tadinya
**100% simulatif** (digerakkan `feedCounts` statis).

**Keputusan:** 1a kerangka+1 konektor vs fixture · 2a **Bank Feed → cashbank** dulu (E2E terbersih,
`controlTotal('bank')` sudah ada) · 3a `data_import.js` jadi read-model atas server.

**W9 SELESAI penuh (Fase 0–3).** Semua di `master`, live-proven, 0 console err, nol regresi numerik.

**Fase 0** (`7c3f62d`) — groundwork, server read-only:
- Prisma: `Connector` (seeded byte-faithful dari `window.IMPORT.CONNECTORS` via window-stub —
  `loadConnectorSeed()` di `seedData.ts`, panggil `connectorsSeed()` yg TAK sentuh feedCounts;
  identity/target/scopes(JSON)/mapping(JSON) + `metaJson` amplop tampilan lossless (pola User.dataJson)
  + `wired` flag) · `SyncJob` (rows/valid/rejected/posted + `gatePassed` + `cursor`) · `ConnectorToken`
  (`secretEnc` via `crypto/secretbox`, tak pernah ke klien). Seed 8 konektor.
- RBAC (`migration/src/rbac.js` SSOT): `CAP.INTEGRATION_VIEW` (semua peran — transparansi) +
  `CAP.INTEGRATION_MANAGE` (Partner+Manager — sync/koneksi = firm-ops sensitif). `server/rbac.ts`
  auto-ikut (re-export `_CAP`).
- `integrations/config.ts`: `listConnectors()`/`getConnector()` read-model client-safe (NO secret).
- Router `integration.list`/`status` (VIEW-gated). 5 test.

**Fase 1** (`33dee91`) — **jantung W9**, runner E2E:
- `providers/bankFixture.ts`: rekening deterministik (opening 1jt + 5 mutasi Σ+500rb → closing 1.5jt),
  varian `pullBankStatementBroken` (closing off-by-1) utk uji gerbang.
- `mapping.ts` `applyMapping(mapping, raw)`: projeksi HANYA field termapping (drop sisanya).
- `sync.ts` `runBankSync(actor, pull=defaultBankPull())`: **pull → applyMapping → validate →
  GERBANG TOTAL-KONTROL (opening + Σ harus = closing; mismatch → `staged`, TAK posting) → posting
  idempoten (merge by natural-key txnId di StateDoc `scope='firm' scopeId='FIRM-WHR' key='bankFeed'`
  via CAS+retry) → SyncJob → `appendAudit(action='SYNC')`**. Post sukses pertama set `wired=true`.
  `reconcileBank()` tie-out posted==consumed. `audit/log.ts` +`'SYNC'` ke AuditAction.
- Router `integration.sync` (MANAGE) · `jobs`/`reconcile` (VIEW). 9 test E2E (mapping; pull→gate→post
  tied; idempoten re-run consumed tetap 5 BUKAN 10; gerbang blokir data cacat → SSOT untouched;
  reconcile; SYNC audit metadata-saja; manager-sync/junior-FORBIDDEN; unwired id→BAD_REQUEST).

**Fase 2** (`50b4b36`) — webhook + HTTP adapter:
- `providers/httpBank.ts`: `BankPullFn` via `fetch`+Bearer (nol-vendor, sama bentuk fixture →
  runner tak berubah); `readBankHttpConfig` null sampai `BANK_API_BASE_URL`+`TOKEN` di-set (→ fixture
  fallback); mTLS = seam drop-in (catatan, tak di-smoke vs endpoint asli — W9 §5).
- `sync.ts` `defaultBankPull()` pilih HTTP-bila-config else fixture (per-call).
- `webhook.ts`: `handleWebhook` **publicProcedure** (provider POST tanpa sesi) ber-auth **HMAC-SHA256**
  (`createHmac`+`timingSafeEqual`) atas body kanonik; `not-configured` bila `INTEGRATION_WEBHOOK_SECRET`
  kosong; event pemicu ('transaction.posted') jalankan runner yg SAMA (actor `system:webhook`).
- Router `integration.postWebhook`. 7 test (http config gate; http pull parse w/ Bearer; webhook
  not-configured/bad-sig UNAUTHORIZED/valid-sig→sync tied+SYNC audit/non-trigger acked/public route).

**Fase 3** (`36cbf9c`) — klien read-model:
- `api.js`: `integrationStatus/list/jobs/reconcile` (degradasi anggun null) + `integrationSync` (throw).
- `data_import.js`: `setServerData({recon})` → `connectors()`/`reconciliation()` **overlay** angka
  server (posted/consumed/tied + `serverBacked`) utk konektor ter-wire, else base simulatif (fallback
  offline). Diekspor di `window.IMPORT`.
- `view_platform2.jsx`: `useEffectIN` fetch status+recon on mount → push ke `window.IMPORT`; tombol
  **"Sinkronkan Bank"** (MANAGE-gated, log activity) → sync nyata → refresh; badge "Bank Feed: server"
  + chip "live · server" di tab Rekonsiliasi.
- **Live-proven** (Vite :5180 + server :5181, login **Partner** hartono.w@whr-cpa.id/Partner#2025!):
  klik Sinkronkan → `wired` 0→1, reconcile posted=5/consumed=5/tied=true → cashbank (closing
  1.500.000); `window.IMPORT` overlay serverBacked; rekon "Menutup (selisih 0)"; re-sync consumed
  tetap 5 (idempoten); **0 console error**.

**Gerbang hijau:** server `typecheck` 0-err + **116 server vitest** (incl. 21 integration);
client lint/typecheck 0-err + **59 vitest** (canon fingerprint IDENTIK — nol regresi).

**New env (opsional; absen = fixture/feature-off):** `BANK_API_BASE_URL`+`BANK_API_TOKEN`
(→ adapter HTTP, else fixture) · `BANK_API_ACCOUNT` · `INTEGRATION_WEBHOOK_SECRET`. Detail: BUILD.md §W9.

**GOTCHA:** (1) `$env:PORT=''` (string kosong) → server `Number('')=0` → listen port acak (rusak proxy
Vite); pakai `PORT='5181'` eksplisit atau `Remove-Item Env:PORT`. (2) `preview_start` MENOLAK bila
:5180 sudah dipakai launcher manual → bunuh node dulu, biar preview yg start (config `dev-all`
sudah pin PORT=5181). (3) app butuh login (W7) — cookie httpOnly bisa bertahan; nav modul via
`localStorage['ams.route']='integrations'`+reload (pola W8). (4) live sync memutasi dev.db (bank
wired=true + StateDoc bankFeed) — normal, `npm run db:reset` mengembalikan.

**Deferred (W9·3+):** konektor ke-3..8 ter-wire (esign/dms/ahu/emeterai/idx/payroll, "satu per
kali"); OAuth login-flow interaktif (redirect/callback UI; token kini via seed/env); scheduler cron
(job dipicu manual/webhook); smoke vs provider berbayar nyata. Next Fase B / legacy track: lihat
[[neosuite-ams-arc]].

---

## W9·2 — Konektor Coretax / e-Faktur → firmtax (output VAT) — SELESAI 2026-06-26

Konektor **kedua** ter-wire (setelah Bank Feed). PRD: `docs/prd-w9-coretax-connector.md` (Proceed.
2026-06-26; in-repo, BUKAN vault). Branch `feat/w9-coretax-connector`, commit **`c5cacde`** (BELUM
merge/push per 2026-06-26 — tanya user sebelum PR). Dipilih krn **anchor tie-out kanon sudah ada**
(`controlTotal('coretax')` = `Σ PPN Keluaran` atas `A.EFAKTUR`), persis alasan Bank Feed pertama.

- **Fase 0** — ekstrak `mergeFeedState<TRow>({stateKey,collKey,keyOf,storedOf,scalars,updatedBy})`
  generik dari `mergeBankState` di `sync.ts`. Jalur bank delegasi → **byte-identik, 0 regresi** (21
  uji bank tetap hijau). Prinsip: faktor dari 2 contoh, BUKAN 1 — generalisasi runner penuh ditunda.
- **Fase 1** — `providers/coretaxFixture.ts` (5 e-Faktur Keluaran byte-faithful EFAKTUR, Σ PPN
  **443.300.000**, semua tarif 0.11; varian `pullCoretaxFeedBroken` total off + `pullCoretaxFeed
  BadInvoice` ppn-cacat). `runCoretaxSync`: pull→map(`applyMapping`)→validate (kind='Keluaran' +
  arit. `round(DPP×rate)==PPN`)→**gerbang batch-Σ** (Σ PPN valid == declaredVatTotal; mismatch→
  staged)→`mergeFeedState` ke StateDoc `firm/taxFeed` by `invoice_number`→SyncJob→audit SYNC
  key='coretax'. `reconcileCoretax` (posted==consumed + `vatTotal`).
- **Fase 2** — router `integration.sync({connectorId})` dispatch bank|coretax (else BAD_REQUEST);
  `reconcile` → `{bank, coretax}`; `httpCoretax.ts` (`CORETAX_API_BASE_URL/TOKEN/PERIOD`, drop-in);
  webhook `SYNC_EVENTS.coretax`=['faktur.approved','spt.accepted'] + **`RUNNERS` map** (bank/coretax).
- **Fase 3** — `view_platform2.tsx`: `onSyncCoretax` + tombol **"Sinkronkan Pajak"** (MANAGE) + badge
  **"Coretax: server · tie-out 0"**. Overlay `_serverRecon.coretax` **GRATIS** (sudah keyed-by-id;
  `data_import.ts`/`api.ts` tak disentuh — `integrationSync(connectorId)` sudah param).
- **Gerbang:** server typecheck 0 + **148 vitest** (integration 21→32, +11 incl. http+webhook
  coretax); client lint 0 + typecheck 0 + **358 vitest canon fingerprint IDENTIK**. Live-proven
  **Manager** (anindya.p@whr-cpa.id): wired 0→1, posted/consumed=5 tied, vatTotal 443.300.000=canon,
  re-sync idempoten (tetap 5), **0 console error**.

## W9·2 — STATUS PARKIR + push (update 2026-06-26)

KOREKSI status: c5cacde kini **PUSHED**, bundel di handoff 2026-07-03 (dihapus) **PR #41 OPEN** (4 commit, MERGEABLE). Konektor Coretax **diparkir sengaja** — menunggu kematangan API DJP / Sertifikat Elektronik PKP (eksternal, bukan utang kita). Tak dibangun lanjut; dibuat **parkir aman** (commit **`1ad4fa6`**):

- **Tripwire produksi** (`defaultCoretaxPull`): `NODE_ENV=production` tanpa `CORETAX_API_*` → pull **menolak** (SyncJob `failed`), TAK fallback fixture. Sebab: fixture byte-faithful ke Σ-PPN 443,3jt → **lolos gate control-total** → bisa mencemari SSOT firmtax dgn data demo. Dev/test tetap fixture. +3 uji.
- **Badge UI "Mode demo"**: `ConnectorView.configured` (SSOT, dari `coretax/bankHttpConfigured`) → `integration.status.configured` map → kartu konektor di `view_platform2.tsx`. Jujur saat tampak 'connected' tapi adapter eksternal absen. Generik → **Bank Feed juga tertandai**.
- **PRD addendum** "Status: PARKIR" + Definition-of-Resume di `docs/prd-w9-coretax-connector.md`.
- **Utang dicatat:** Bank Feed (`defaultBankPull`) punya silent-fallback IDENTIK; tripwire produksi BELUM dipasang utk bank — pasang sebelum platform pegang data keuangan klien nyata.
- Pola reusable: [[asseris-authoritative-persist-key-recipe]] (gotcha connectivity.json stale serupa).

**GOTCHA tambahan W9·2:** (5) ESLint ratchet = `eslint-suppressions.json` (tracked, dibaca otomatis
oleh `eslint src`); script `lint:any-baseline` **RUSAK** (gabung `--suppress-rule`+`--prune-
suppressions` yg kini saling-eksklusif) → regen pakai `npx eslint src --suppress-rule
@typescript-eslint/no-explicit-any` saja. view `:any` baselined (platform2 51→53, window-cast
idiomatik). (6) `localStorage['ams.route']` dibaca **RAW string** (`app.tsx:408`), JANGAN
`JSON.stringify` (quoted→StubView "Module Scaffolded"). (7) snapshot canon EOL LF→CRLF muncul M tapi
`git diff --ignore-all-space` kosong → `git checkout --` buang (bukan regresi numerik).

## ⛔ KEPUTUSAN ARI — CORETAX CLOSE CASE (2026-06-26)

**Ari memutuskan: STOP pengembangan konektor Coretax. Tidak ada fitur/pengembangan lanjutan.**
Keputusan produk/roadmap, **Opsi A** (dari 3 opsi yang saya ajukan):
- Kode Coretax **DIBIARKAN TERPARKIR** di codebase (commit `c5cacde` + parkir aman `1ad4fa6`):
  badge "Mode demo" jujur + tripwire produksi → harmless, tak mencemari SSOT. **TIDAK dibuang.**
- **PR #41 TIDAK ditutup.** Alasan kritis: branch `feat/w9-coretax-connector` namanya menyesatkan —
  PR #41 bundel **7 commit, hanya 2 Coretax** (`c5cacde`+`1ad4fa6`); 5 lain non-Coretax & bernilai
  (My Tasks `9709670` · T&B→WIP `e758620` · Strategy Memo SA300 `ef64aca` · sampling→SA530 bridge
  `b64713f` · [[asseris-audittimeline-relocation]] `366eb37`). Menutup PR = mengorbankan semuanya +
  merusak basis [[asseris-sa530-consolidation]] PR #42 (stacked `base=feat/w9-coretax-connector`).
- **Implikasi untuk sesi mendatang:** JANGAN usulkan/lanjutkan W9·3+ Coretax (OAuth DJP, scheduler,
  smoke vs API DJP nyata). Bila ada follow-up W9, fokus ke konektor lain (Bank tripwire utang masih
  terbuka — lihat §STATUS PARKIR). PR #41 tetap menempuh jalur merge normal saat Ari siap, membawa
  5 fitur non-Coretax (+Coretax terparkir ikut, harmless).
- Nol aksi git/GitHub dieksekusi atas keputusan ini — murni pencatatan.
