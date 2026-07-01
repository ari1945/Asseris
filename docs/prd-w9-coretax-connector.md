# PRD — W9·2 Konektor Coretax / e-Faktur → firmtax (Integrasi Nyata, konektor ke-2)

> Status: **SELESAI (Proceed. 2026-06-26)** — Fase 0–3 + live-proven (Manager). Branch:
> `feat/w9-coretax-connector`. Lanjutan W9 (Bank Feed SELESAI). Memory: `neosuite-ams-w9-connectors`.
>
> **Hasil:** mergeFeedState generik (jalur bank 0 regresi) · runCoretaxSync + reconcileCoretax +
> coretaxFixture (sehat/rusak/faktur-cacat) + httpCoretax (CORETAX_API_*) · router
> `sync({connectorId})` dispatch bank|coretax + reconcile {bank,coretax} + webhook RUNNERS map ·
> klien tombol "Sinkronkan Pajak" + badge + overlay. Gerbang: server typecheck 0 + 148 vitest
> (integration 21→32); client lint/typecheck 0 + 358 vitest (canon fingerprint identik). Live
> (Manager): wired 0→1, posted/consumed=5 tied, vatTotal 443.300.000 = canon, re-sync idempoten, 0
> console error. Q1 parameterisasi ✅ · Q2 HTTP adapter disertakan ✅ · Q3 gate batch-Σ + arit.
> per-faktur ✅ · Q4 konektor #2 dikonfirmasi.

---

## Problem
W9 membuktikan kerangka konektor sisi-server nyata **end-to-end untuk satu konektor saja**: Bank
Feed → `cashbank` (pull → map → validate → gerbang total-kontrol → posting idempoten → reconcile →
audit). Tujuh konektor lain di `data_import.ts` (`coretax`, `esign`, `dms`, `ahu`, …) masih
**100% simulatif** — angka mereka digerakkan `feedCounts` statis, bukan pipa server nyata. Backlog
W9 menamai eksplisit langkah berikutnya: *"konektor ke-2..8 ter-wire (Coretax→firmtax dst, 'satu
per kali')"*. Selama itu belum, klaim "integrasi nyata" Asseris hanya tervalidasi di satu domain
(keuangan/bank), belum di domain **pajak** — yang justru jadi tulang punggung tesis tax-defense
CoreSys/Asseris.

## Objective
Wire **konektor #2 = Coretax / e-Faktur → `firmtax`** ke pipa server nyata yang sama, dibuktikan vs
adapter fixture (provider DJP asli tak bisa dikreditensialkan dari sini — butuh Sertifikat
Elektronik/PKP), dengan **gerbang total-kontrol pajak** yang menahan data cacat sebelum menyentuh
SSOT — persis pola yang sudah terbukti pada Bank Feed.

## Success Criteria
1. `integration.sync` (atau `syncCoretax`) menjalankan runner E2E Coretax: pull fixture e-Faktur →
   map → validate → **gerbang total-kontrol** → posting idempoten ke StateDoc `firm`/`taxFeed` →
   `SyncJob` → audit `action='SYNC'`.
2. **Gerbang pajak menahan data cacat:** fixture varian rusak (mis. `DPP × tarif ≠ PPN`, atau Σ PPN
   ≠ total header) → `status='staged'`, **nol posting**, SSOT tak tersentuh.
3. **Idempoten:** re-sync data sehat → `consumed` tetap (merge by natural-key `invoice_number`),
   bukan berlipat.
4. **Tie-out:** `reconcileCoretax()` → `posted == consumed`, dan Σ PPN ter-posting **cocok** dengan
   total-kontrol kanon `Σ PPN Keluaran` (`controlTotal('coretax')` di `data_import.ts`).
5. **RBAC:** sync Coretax = `INTEGRATION_MANAGE` (Partner+Manager); junior/senior → FORBIDDEN.
   View/jobs/reconcile = `INTEGRATION_VIEW` (semua peran).
6. **Klien:** `view_platform2.jsx` punya tombol **"Sinkronkan Pajak"** (MANAGE-gated) + overlay
   `serverBacked` untuk konektor `coretax` + badge "live · server" di tab terkait; degradasi anggun
   bila server mati/forbidden (fallback simulatif).
7. **Gerbang hijau, nol regresi:** server `typecheck` 0-err + seluruh vitest server hijau (tambah
   ~8–9 uji E2E Coretax meniru paket Bank Feed); client lint/typecheck 0-err + **canon fingerprint
   IDENTIK** (konektor TIDAK menyentuh mesin canon — hanya membaca `A.EFAKTUR` untuk total-kontrol).
8. **Live-proven** (login Manager — bukan Partner; lihat gotcha): klik Sinkronkan Pajak → `wired`
   0→1, reconcile tied=true, re-sync idempoten, **0 console error**.

## Scope
- Provider fixture Coretax (`providers/coretaxFixture.ts`): record e-Faktur deterministik (varian
  sehat + varian sengaja-rusak untuk uji gerbang).
- Adapter HTTP drop-in **opsional** (`providers/httpCoretax.ts`, `fetch`+Bearer, `not-configured`
  bila `CORETAX_API_*` kosong → fallback fixture) — **bila murah**; jika menambah risiko, ditunda ke
  scope-cut (lihat Open Questions Q2).
- Runner Coretax + gerbang total-kontrol pajak + posting idempoten ke `taxFeed` (CAS).
- `reconcileCoretax()` tie-out.
- Router: parameterisasi `integration.sync({connectorId})` ATAU `syncCoretax` terpisah (Open Q1).
- Klien: tombol sync pajak + overlay + badge di `view_platform2.jsx` + `api.js`.
- Uji E2E server meniru paket Bank Feed (mapping, gate pass/block, idempoten, reconcile, audit,
  RBAC, unwired-id).

## Non-Scope (sengaja DI-LUAR)
- Konektor #3..8 (esign/dms/ahu/emeterai/idx/payroll) — "satu per kali", masing-masing PRD/scope
  sendiri.
- **OAuth login-flow interaktif** (redirect/callback UI) — deferred W9 tetap deferred; token via
  seed/env. Konektor ini *memakai* auth lewat env, tak membangun flow OAuth.
- **Scheduler cron** — job tetap dipicu manual/webhook. Tak ada penjadwal di scope ini.
- Smoke vs DJP Coretax **berbayar/asli** — mustahil tanpa Sertifikat Elektronik PKP.
- Generalisasi penuh runner ke "connector-strategy abstrak" — **sengaja ditunda** (lihat Proposed
  Approach: faktor dari 2 contoh, bukan 1).
- Perubahan apa pun pada mesin canon / angka SSOT yang sudah ada.

## Constraints
- **Nol-vendor / agent-executable:** `fetch` + crypto Node built-in saja (pola W8/W9). Tak ada SDK
  DJP.
- **ESM-only**, edit di `migration/src/*` (klien) + `server/src/*`; specifier extensionless (W11).
- Server `.ts` & test `.ts` **wajib bebas-`any`** baru (ratchet `no-explicit-any`, W15) — kecuali
  baseline yang sudah ada.
- **SSOT:** total-kontrol pajak ditarik dari `A.EFAKTUR`/canon, **bukan** hardcode.
- Posting Coretax = StateDoc scope `firm` (firmtax = data firma, sama seperti `bankFeed`), **bukan**
  engagement — konsisten dengan target `firmtax`.

## Existing Solutions (reuse — jangan bangun ulang)
- **Runner Bank Feed** (`server/src/integrations/sync.ts`) — cetak-biru pipa; copy struktur job
  lifecycle + gate-decision + audit.
- **`mergeBankState` (CAS+retry)** — pola merge idempoten by natural-key; generalisasi ke helper
  `mergeFeedState(stateKey, naturalKeyFn, rows)`.
- **`applyMapping`** (`mapping.ts`) — sudah generik, pakai langsung dengan `conn.mapping` Coretax
  (`NPWP Klien→taxpayer_id`, `No. Faktur→invoice_number`, `DPP→tax_base`, `PPN→vat_amount`, `Masa
  Pajak→tax_period`).
- **Seed `Connector`** — baris `coretax` **sudah ada** di seed (byte-faithful dari
  `CONNECTORS`), termasuk `mapping`/`scopes`/`target='firmtax'`. Tak perlu skema baru.
- **`controlTotal('coretax')`** (`data_import.ts`) — anchor tie-out kanon `Σ PPN Keluaran` SUDAH
  ADA; runner memvalidasi terhadapnya.
- **Overlay `_serverRecon`** sudah keyed by connector id (`{bank:…, coretax:…}`) → overlay klien
  generalisasi **gratis**; `connectors()`/`reconciliation()` tinggal terima entri `coretax`.
- **RBAC `INTEGRATION_VIEW/MANAGE`** — sudah ada, tak perlu cap baru.

## Proposed Approach
**Tambah runner Coretax paralel, BUKAN abstraksi generik prematur.** Kita baru punya 1 bentuk
konektor konkret (bank). Memfaktorkan "connector-strategy" abstrak dari satu contoh berisiko salah-
abstraksi + regresi pada jalur bank yang sudah terbukti. Sebaliknya:

1. **Ekstrak yang benar-benar dipakai-ulang** dari `sync.ts` jadi helper kecil tanpa mengubah
   perilaku bank: `mergeFeedState(stateKey, naturalKey, rows, …)` (CAS generik) + bingkai
   job-lifecycle/audit. Jalur `runBankSync` memanggil helper yang sama → terbukti tak berubah oleh
   snapshot test bank.
2. **`runCoretaxSync(actor, pull)`** dengan strategi pajak: normalisasi e-Faktur (natural-key =
   `invoice_number`), **gerbang total-kontrol pajak** = (a) integritas aritmetik per-faktur
   `round(tax_base × tarif) == vat_amount`, DAN (b) batch Σ vat_amount == total header deklarasi →
   mismatch ⇒ `staged`, nol posting. Posting ke StateDoc `firm`/`taxFeed`.
3. **`reconcileCoretax()`** tie-out `posted == consumed` + cocokkan Σ PPN ke `controlTotal`.
4. **Router**: parameterisasi `integration.sync({connectorId:'coretax'|'bank'})` (switch internal →
   `runBankSync`/`runCoretaxSync`) — forward-looking, satu pintu MANAGE-gated.
5. **Klien**: tombol "Sinkronkan Pajak" + push `coretax` ke `_serverRecon` + badge.
6. **Generalisasi penuh ditunda ke W9·3** — saat konektor ke-3 memberi contoh kedua untuk
   memfaktorkan dengan benar (faktor dari 2, bukan 1).

## Risks
| Risiko | Mitigasi |
|---|---|
| Refactor `mergeBankState` → helper generik **meregresi jalur bank** | Snapshot/9 uji bank E2E harus tetap hijau SEBELUM commit; ekstraksi murni mekanis, perilaku identik. |
| Gerbang pajak salah-desain (tarif PPN, pembulatan) → false staged/posted | Definisikan tarif eksplisit dari data faktur (bukan asumsi 11/12%); gate aritmetik pakai `round()` id-ID; fixture sehat membuktikan lolos, fixture rusak membuktikan blokir. |
| Σ PPN kanon (`A.EFAKTUR` filter `Keluaran`) ≠ basis posting (semua faktur) | Selaraskan basis tie-out: posting & control-total pakai filter yang SAMA (Keluaran), didokumentasikan di runner. |
| HTTP adapter menambah permukaan tanpa endpoint asli untuk smoke | Jadikan opsional/scope-cut (Q2); fixture-only sah untuk DoD (pola W9 bank: HTTP = seam, tak di-smoke vs asli). |
| `any` baru di `.ts`/test memicu ratchet | Tipe normalisasi faktur eksplisit (`interface TaxInvoice`), mirror gaya `BankTxn`. |

## Implementation Plan (fase kecil, tiap fase gerbang hijau)
- **Fase 0 — ekstraksi tanpa-regresi:** generalisasi `mergeBankState`→`mergeFeedState`; `runBankSync`
  pakai helper; **bukti: 9 uji bank E2E + snapshot tetap hijau, 0 perubahan numerik.**
- **Fase 1 — runner Coretax (jantung):** `coretaxFixture.ts` (sehat + rusak) · `runCoretaxSync` ·
  gerbang pajak · `taxFeed` posting idempoten · `reconcileCoretax` · audit SYNC. +~6 uji E2E.
- **Fase 2 — router + (opsional) HTTP adapter:** `integration.sync({connectorId})` ·
  `httpCoretax.ts` bila murah · +uji RBAC/unwired/http-config.
- **Fase 3 — klien read-model:** `api.js` sync param · `view_platform2.jsx` tombol "Sinkronkan
  Pajak" + overlay `coretax` + badge · live-verify (Manager).
- **Gerbang akhir:** server typecheck 0 + semua vitest hijau; client lint/typecheck 0 + canon
  fingerprint identik; live-proven 0 console error. Update memory `neosuite-ams-w9-connectors`.

## Open Questions (butuh keputusan sebelum / saat build)
1. **Router shape** — parameterisasi `sync({connectorId})` (rekomendasi: ya, forward-looking) vs
   endpoint `syncCoretax` terpisah? **Rekomendasi: parameterisasi.**
2. **HTTP adapter Coretax** — sertakan di W9·2 (seam drop-in, opsional) atau tunda ke saat ada
   endpoint nyata? **Rekomendasi: sertakan bila ≤30 menit & nol risiko ke jalur fixture; jika
   tidak, scope-cut.**
3. **Tarif PPN untuk gate aritmetik** — ambil per-faktur dari data (tak hardcode), atau cukup gate
   batch-Σ saja? **Rekomendasi: gate batch-Σ (Σ PPN == header) sebagai primer; per-faktur sebagai
   sekunder bila data faktur menyediakan tarif.**
4. **Konfirmasi arah** — PRD ini mengasumsikan "lanjutan konektor data" = **wire konektor #2**, bukan
   OAuth/scheduler. Jika maksudnya OAuth atau scheduler, hentikan & re-scope.

---

## Addendum — Status: PARKIR (per 2026-06-26)

Konektor diparkir **sengaja** menunggu kematangan sisi DJP (bukan utang teknis kita). Pipa
sudah lengkap & terbukti vs fixture; yang kurang **hanya** kredensial/endpoint DJP nyata.

### Pemblokir (eksternal)
- **Sertifikat Elektronik PKP** tak bisa dikreditensialkan dari sini (per-WP, on-prem).
- Endpoint/kontrak **API Coretax DJP** belum tersedia/stabil untuk konsumsi pihak ketiga.

### Definition-of-Resume (pemicu lanjut)
Lanjutkan saat **salah satu** terpenuhi:
1. DJP merilis spesifikasi API Coretax (auth, skema e-Faktur Keluaran, paging) yang dapat dikonsumsi; **atau**
2. Klien menyediakan Sertifikat Elektronik + kredensial untuk uji sandbox.

### Yang SUDAH siap (tinggal di-credential — resume dingin tanpa gali ulang)
- Adapter HTTP `server/src/integrations/providers/httpCoretax.ts` — drop-in; aktif begitu env
  `CORETAX_API_*` terbaca (`readCoretaxHttpConfig`). Tinggal petakan skema respons DJP nyata → `RawTaxRecord`.
- Anchor tie-out kanon `controlTotal('coretax')` = Σ PPN Keluaran (`A.EFAKTUR`) — gate sudah jalan.
- Runner idempoten by `invoice_number`, SyncJob, audit SYNC, reconcile — tak berubah.

### Pengaman parkir yang DIPASANG (commit lanjutan)
- **Tripwire produksi** (`defaultCoretaxPull`): di `NODE_ENV=production` tanpa `CORETAX_API_*`,
  konektor **menolak** (SyncJob `failed`) alih-alih diam-diam memakai fixture — mencegah data
  demo (Σ-PPN 443,3jt yang sengaja lolos control-total) mencemari SSOT `firmtax`. Dev/test tetap fixture.
- **Badge UI "Mode demo"** (server-truth `integration.status.configured`) di kartu konektor saat
  adapter eksternal belum terpasang. Berlaku generik (mis. Bank Feed juga ditandai).

### Utang yang DICATAT (belum dikerjakan — bukan blocker sekarang)
- **Bank Feed** punya pola silent-fallback yang **identik** (`defaultBankPull`); tripwire produksi
  belum dipasang untuk bank. Pasang sebelum platform memproses data keuangan klien nyata.
