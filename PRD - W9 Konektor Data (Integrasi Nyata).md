# PRD — W9 Konektor Data (Integrasi Nyata)

> Wajib diisi sebelum implementasi. Implementasi TIDAK dimulai sebelum sign-off (**"Proceed."**).
> Stream: gelombang Fase B berikutnya, lanjutan dari [[neosuite-ams-arc]] · [[neosuite-ams-w6-backend]] ·
> [[neosuite-ams-w8-llm-proxy]] (semua SELESAI). Acuan backlog: `Evaluasi NeoSuite AMS - Kesiapan
> Pengembangan Claude Code.html` §07 (W9 "Integrasi nyata", W9·1).

| Field | Isi |
|---|---|
| Tanggal | 2026-06-19 |
| Pemilik | Ari Widodo |
| Status | **DRAFT — menunggu sign-off** |
| Engagement ID terkait | (lintas-engagement; firma-ops; demo `ENG-2025-014`) |

---

## 0. Reality-check (baca lebih dulu — ini menentukan seluruh scope)

Backlog W9·1 menuntut: *"≥1 konektor menarik data **nyata** ujung-ke-ujung & memposting ke modul
target"*, urut nilai `Coretax/e-Faktur → Bank Feed → PrivyID → SharePoint`.

**Kendala keras:** tak satu pun provider nyata bisa dikreditensialkan/dijangkau dari lingkungan
dev ini, dan semuanya BUKAN OAuth-SaaS biasa:
- **Coretax/e-Faktur (DJP)** — perlu Sertifikat Elektronik PKP + registrasi ASP/PJAP, bukan OAuth app publik.
- **Bank Feed (BCA/Mandiri OpenAPI)** — perlu onboarding merchant + sertifikat mTLS.
- **PrivyID / MS-Graph SharePoint** — perlu kredensial tenant + app-registration nyata.

Maka "data nyata dari provider asli" **tidak dapat dikirim di sesi ini** — dan tidak akan
disimulasikan lalu diklaim "nyata".

**Pendekatan yang dipilih (cermin W8 LLM-proxy):** bangun **kerangka konektor sisi-server
end-to-end yang NYATA**, buktikan seluruh pipa terhadap **adapter provider fixture deterministik**,
dengan adapter HTTP-nyata sebagai *drop-in tipis* menunggu kredensial. Sama persis seperti W8
yang dibuktikan vs mock upstream lalu kemudian terbukti vs DeepSeek nyata tanpa ubah kode.

## 1. Problem
Modul Impor & Integrasi (`data_import.js` + `view_platform2.jsx`) adalah **cetak biru lengkap tapi
100% simulatif**: 8 konektor termodel (scope, pemetaan field, webhook, total kontrol, tie-out
SSOT `posted == consumed`) digerakkan oleh `AMS.PLATFORM.feedCounts()` statis di klien. Tidak ada:
- penyimpanan token/kredensial OAuth,
- job sync nyata (pull terjadwal / webhook),
- mesin pemetaan-field yang benar-benar mentransformasi → memposting ke tabel/StateDoc pemilik,
- gerbang total-kontrol yang sungguh memblokir posting,
- penerimaan webhook,
- RBAC/audit untuk operasi integrasi.

Akibatnya klaim "data mengalir dari sistem eksternal ke modul SSOT" belum punya tulang punggung
server — padahal W6 sudah menyediakan server (tRPC+Prisma), W7 RBAC, W10 audit hash-chain & secretbox.

## 2. Objective
Bangun **kerangka konektor sisi-server** (`server/src/integrations/`, sejajar pola `server/src/llm/`)
yang menjalankan rantai nyata **pull → staging → validasi → gerbang total-kontrol → posting
idempoten ke SSOT → dikonsumsi modul hilir → rekonsiliasi tie-out**, dengan **satu konektor
dibuktikan ujung-ke-ujung** terhadap adapter provider fixture. Adapter HTTP-nyata = swap tipis.
**Pakai ulang** aset yang ada: blueprint `data_import.js` (definisi/pemetaan), `crypto/secretbox`
(token at-rest), `rbac.js`, `audit/log` (hash-chain), pola modul `llm/`. `data_import.js` berubah
dari mock → **read-model tipis** atas kebenaran server (konektor non-wired tetap simulatif sebagai
fallback offline).

## 3. Success Criteria
- `server/src/integrations/` nyata: `config` (registry konektor seeded dari blueprint) · `providers`
  (adapter; fixture + kerangka HTTP) · `sync` (job runner: stage→validate→gate→post) · `mapping`
  (transform field-by-field) · `events`/`webhook` · plus endpoint tRPC (`integration.list/sync/
  status/postWebhook`).
- **Satu konektor (rekomendasi: Bank Feed → cashbank) terbukti E2E**: tarik baris rekening fixture
  → validasi → **gerbang total-kontrol** (Σ cocok dgn saldo pemilik) → **posting idempoten** ke
  StateDoc target → modul hilir (`cashbank`) membaca record yang SAMA → `reconciliation()`
  menunjukkan `posted == consumed`, `tied == true`. Re-run job = nol duplikasi (idempoten).
- **Keamanan/tata-kelola NYATA:** operasi integrasi digerbang `CAP.INTEGRATION_*` (RBAC SSOT
  `rbac.js`); token disimpan terenkripsi via `crypto/secretbox` (AES-256-GCM); tiap sync/post →
  entri **audit hash-chain** (W10) — usage/metadata, bukan menelan PII mentah berlebihan.
- `data_import.js` jadi **read-model**: konektor/job/rekonsiliasi untuk konektor ter-wire ditarik
  dari server; lainnya fallback simulatif. Nol perubahan kontrak `window.IMPORT.*` bagi
  `view_platform2.jsx` (degradasi anggun bila server mati — pola `api.js` W6).
- **Gerbang teknis:** server `typecheck` 0-err + test integrasi baru hijau (incl. idempotensi +
  gerbang total-kontrol + negative-authz); client `lint`/`typecheck`/`build` hijau; **canon tak
  tersentuh (59 vitest, fingerprint identik)**; 0 console error; diverifikasi live (Vite :5180 +
  server :5181) di tab Integrasi.

## 4. Scope (Fase 1 — satu konektor, pipa penuh)
- Skema Prisma: `Connector` (seeded dari blueprint) · `SyncJob` (status/rows/control/ts) ·
  `ConnectorToken` (terenkripsi) — minimal yang dibutuhkan satu konektor + rekonsiliasi.
- `server/src/integrations/` modul (config/providers/sync/mapping/events/webhook).
- Adapter provider **fixture** untuk konektor terpilih (deterministik, in-repo) + kerangka adapter
  HTTP (signature siap, body `fetch` di-TODO/guard "not-configured" anggun spt `llm/providers`).
- Router tRPC `integration.*` + RBAC cap + audit entries.
- Re-wire `data_import.js` konektor terpilih → server; sisanya fallback simulatif.

## 5. Non-Scope
- Provider nyata berkredensial (Coretax/bank/PrivyID/SharePoint HTTP asli) — diblok lingkungan;
  adapter HTTP disediakan sbg drop-in, tak di-smoke vs endpoint asli (cermin W8: mock dulu).
- Konektor ke-2..8 ter-wire penuh (gelombang lanjutan W9·2+ per backlog "satu konektor per kali").
- OAuth login-flow interaktif end-to-end (redirect/callback UI) — token diasumsikan tersedia /
  di-set via env/seed terenkripsi untuk fixture; flow OAuth penuh = lanjutan.
- Scheduler cron produksi (job dipicu manual/endpoint di Fase 1; penjadwalan = lanjutan).
- Perubahan numerik canon apa pun.

## 6. Constraints
ESM-only, edit `migration/src/*` (klien) & `server/src/*` (server) — JANGAN `app/` beku ·
server = Node+tRPC+Prisma (W6), Postgres-flip tak diuji dari sini · RBAC via `rbac.js` SSOT ·
token at-rest via `crypto/secretbox` · audit via `audit/log` hash-chain (W10) · aturan emas
anti-tabrakan klien (alias hook unik, ekspor `window`, `app.jsx` terakhir) · figur dari SSOT,
jangan hardcode · API non-publik sampai aman (sudah W7+) · **PRD dulu**.

## 7. Existing Solutions / yang dipakai ulang
- **Blueprint konektor** `data_import.js`: `CONNECTORS` (8, lengkap mapping/scope/webhook/syncs),
  `controlTotal(id)` (Bank: saldo; Coretax: ΣPPN; dst), `jobs()`/`reconciliation()`/`summary()`,
  `PROVENANCE`. → diserap jadi seed server + kontrak read-model.
- **Pola modul `server/src/llm/`** (config·providers·ratelimit·events + router status/complete +
  RBAC cap + events audit + adapter nol-vendor via `fetch`, graceful not-configured) = cetakan
  langsung untuk `integrations/`.
- **W6** server/tRPC/Prisma + `api.js` degradasi-anggun + StateDoc CAS (posting idempoten ke SSOT).
- **W7** `rbac.js` (tambah `CAP.INTEGRATION_*` + GRANTS) + `protectedProcedure`.
- **W10** `crypto/secretbox` (token at-rest) + `audit/log` hash-chain (jejak sync/post).
- **`view_platform2.jsx`** UI tab Integrasi — konsumen read-model, idealnya nol perubahan kontrak.

Custom work yang dibenarkan = **hanya** kerangka konektor server + satu adapter fixture; tak ada
ulang-tulis blueprint, canon, atau UI.

## 8. Proposed Approach
1. **Skema** `Connector`/`SyncJob`/`ConnectorToken`; seed `Connector` dari blueprint (byte-faithful
   via window-stub, pola seed W6).
2. **`integrations/config.ts`** — registry + status (connected/available/error) dari DB.
3. **`integrations/providers/`** — `fixtureBank.ts` (kembalikan baris rekening deterministik) +
   `httpBank.ts` (kerangka `fetch`+mTLS TODO, guard not-configured). Pemilihan via env/flag.
4. **`integrations/mapping.ts`** — terapkan `mapping[]` blueprint: sumber→field target.
5. **`integrations/sync.ts`** — job runner: `pull(provider) → stage → validate → controlTotal gate
   (tolak bila Σ≠pemilik) → post idempoten (upsert by natural-key, CAS) → tulis SyncJob → audit`.
6. **`integrations/webhook.ts`** — endpoint terima event (HMAC verify kerangka), enqueue sync.
7. **Router** `integration.list/status/sync/postWebhook` (protected, cap-gated).
8. **Klien** `api.js` + `data_import.js`: read-model untuk konektor ter-wire; fallback simulatif.
9. Verifikasi live di tab Integrasi (jobs posted, recon tied, re-run idempoten).

## 9. Risks
- **Klaim "nyata" menyesatkan** → mitigasi: label jelas "adapter fixture, HTTP drop-in"; DoD
  jujur (cermin W8 yg awalnya mock).
- **Idempotensi rusak → duplikasi posting** → mitigasi: natural-key upsert + CAS + test re-run.
- **Tie-out SSOT pecah** (`posted != consumed`) → mitigasi: post ke SSOT yg sama yg dibaca modul
  hilir; recon test sbg gerbang.
- **Scope sprawl** (8 konektor, OAuth UI, scheduler) → mitigasi: Fase 1 = 1 konektor, pull manual,
  token via seed; sisanya lanjutan.
- **Kebocoran PII di audit** → mitigasi: audit metadata/jumlah, bukan body mentah (pola redaksi W8).
- **Regresi canon** → mitigasi: tak sentuh canon_*/data_* core; gate 59 vitest fingerprint.

## 10. Implementation Plan (bertahap, pola W6/W8)
- **Fase 0:** skema + seed `Connector` dari blueprint + `integrations/config` + router `list/status`
  (read-only) + RBAC cap + test. Belum sentuh klien.
- **Fase 1:** `sync` runner + `mapping` + adapter fixture (konektor terpilih) + posting idempoten ke
  SSOT + audit; test E2E (pull→post→recon tied, idempoten, control-gate, neg-authz).
- **Fase 2:** webhook receiver + kerangka adapter HTTP (not-configured anggun).
- **Fase 3:** re-wire `data_import.js` → read-model; verifikasi live tab Integrasi; fallback offline.
- Tiap fase: server `typecheck`+test · client `lint`/`typecheck`/`build`+vitest · verifikasi
  browser · commit · update memory.

## 11. Open Questions (perlu keputusan sebelum "Proceed.")
1. **Scope realitas** — (a) **kerangka + 1 konektor vs adapter fixture** (drop-in HTTP nyata
   menyusul) [REKOMENDASI], (b) kerangka saja tanpa konektor ter-wire, (c) coba provider nyata
   sekarang (tak feasible — tanpa kredensial/sandbox, onboarding teregulasi).
   *(rekomendasi: (a) — satu-satunya yg membuktikan pipa benar-benar mengalir, dapat dikirim di sini.)*
2. **Konektor pertama** — (a) **Bank Feed → cashbank** [REKOMENDASI: pembuktian E2E terbersih;
   `controlTotal('bank')` sudah ada; baris tabular→saldo→tie-out paling auditable], (b) Coretax→
   firmtax (nilai tertinggi tapi provider+target paling kompleks), (c) SharePoint→workpapers
   (OAuth bersih tapi posting WP paling rumit).
3. **Perlakuan blueprint** — (a) **server SSOT, `data_import.js` jadi read-model** [REKOMENDASI:
   satu sumber; seed dari blueprint], (b) biarkan `data_import.js` apa adanya, server berjalan
   paralel (blast-radius kecil tapi dua sumber).

---
**Sign-off:** balas **"Proceed."** untuk memulai Fase 0 dengan rekomendasi di atas (1a · 2a · 3a).
Bila ingin mengubah salah satu Q, sebutkan nomornya — saya sesuaikan PRD lebih dulu.
