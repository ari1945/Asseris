---
name: asseris-eval-menyeluruh-2026-07
description: "Evaluasi menyeluruh 12-tahap Asseris (2026-07-02) — skor, temuan kritis K1-K9, roadmap; + perbaikan K4/K5/K7/surat-perikatan diimplementasikan sesi sama"
metadata: 
  node_type: memory
  type: project
  originSessionId: 017e92ad-3ce0-4cdd-b062-b526ab3140cd
---

Evaluasi menyeluruh Asseris 2026-07-02 (HEAD `5047297`, branch feat/iac-terraform-ec2-provisioning) via 5 agen paralel + verifikasi silang manual. Deliverable: `Evaluasi Asseris - Evaluasi Menyeluruh 2026-07-02.md` di root proyek.

**Skor:** proses audit 82 · fitur 78 · arsitektur 72 · kode 74 · keamanan 70 · kinerja 65 · skalabilitas 45 · maintainability 68 · dokumentasi 85 · kesiapan KAP 60 · internal audit 50 · prod-readiness 58.

**Blocker go-live data riil (Critical, status per 2026-07-03 — update, bukan lagi 2026-07-02):**
K1 UU PDP — **kajian awal + kebijakan SELESAI** (`docs/PDP-COMPLIANCE-ASSESSMENT.md` dkk., commit
`ddc1249`), TAPI belum direview pengacara & `view_pdp` masih display-only (DSR belum wired ke
data produksi) — lihat handoff 2026-07-03 (dihapus) poin A · K2 alerting **SELESAI** (`62cb026`,
`.github/workflows/uptime-alert.yml`, `HEALTHZ_URL`/SMTP belum diisi = "later") · K3 belum pernah
di EC2 riil (RTO total belum terukur) **MASIH TERBUKA** · pentest independen **MASIH TERBUKA**
(`docs/PENTEST-READINESS.md` status "not started").

**✅ SELESAI DIPERBAIKI sesi sama (2026-07-02) — COMMITTED `508d730` + PUSHED ke `origin/feat/iac-terraform-ec2-provisioning` (2026-07-03):**
- **K4 (key-versioning segel)** — model `SigningKey` (pubKeyId+publicKey, migrasi `20260702120000_add_signing_key_archive`); `keyArchive.ts` (`ensureSigningKeyArchived`/`lookupSigningKey`); `createSeal()` arsipkan kunci SEBELUM sign; `verifySeal()` verifikasi via arsip bukan "kunci proses hari ini" → rotasi `APP_SIGNING_KEY` tidak lagi mematahkan segel lama. `VerifyReason 'key-rotated'→'unknown-key'`. Live-verified: seal+verify sungguhan via browser (Onboarding→Surat Perikatan).
- **K5 (AuditLog immutability + off-box)** — `dbHarden.ts` trigger Postgres BEFORE UPDATE/DELETE (no-op SQLite dev, self-apply tiap boot, best-effort non-fatal); `audit/export.ts` + `exportAuditLog.ts` CLI (`npm run export-audit-log`) + `deploy/aws-ec2-test/export-audit-log.sh` (cursor inkremental, prefix S3 terpisah `audit-log/`, saran Object Lock di DEPLOY.md §6a).
- **K7 (StateDoc history + assembly lock 60 hari SA 230 ¶A21)** — model `StateDocHistory` (append-only, semua key); `Engagement.archivedAt`; `state.set` dibungkus `prisma.$transaction` (sekalian nutup gap "no $transaction" terpisah); endpoint `engagement.archive` (FIRM_ADMIN); enforcement assembly-lock di `state.set` (FORBIDDEN pasca 60 hari kecuali `PHASE_OVERRIDE`, tertandai `OVERRIDE[assembly-lock]` di audit detail); `view_records.tsx` di-wire ke `archivedAt` server riil (bukan lagi demo `window.RETENTION`) + tombol "Arsipkan Perikatan (server)". Live-verified: archive button di modul Retensi & Arsip.
- **Surat Perikatan (dokumen tersegel)** — `letter_payload.ts` (`buildLetterPayload`, murni/testable) + `StepLetter.sign()` di `view_onboarding2.tsx` kini async: build payload → `amsExportPdf()` (pola sama `view_opinion.tsx`) → seal Ed25519 sungguhan → simpan `letter.seal{sealId,contentHash}`. Tombol "Buat Amandemen" (status signed, versi baru) + "Verifikasi Segel" (re-check live). Live-verified end-to-end: draft→sent→signed→sealed→"✓ Segel valid".

**Gate:** server typecheck 0 err + 229/229 test; migration typecheck 0 err + lint 0 err + 405/405 test. Baseline `eslint-suppressions.json` view_records.tsx 31→36 via `npm run lint:any-baseline` (regenerasi resmi, bukan hand-edit). Canon snapshot NOL sentuhan (sempat ke-touch CRLF oleh vitest run, direvert — konten identik).

**Fakta terverifikasi manual (koreksi klaim agen — grep dulu!):** (a) API key DeepSeek di `server/.env.local` TIDAK pernah ter-commit (git log -S seluruh history kosong; server/.env tracked hanya DSN SQLite) — tetap perlu rotasi + Secrets Manager; (b) segel Ed25519 SUDAH live (W10.5); (c) direktori migrasi Prisma ADA (0_init); (d) baseline any = 8.227 pelanggaran di 238 file (bukan ~1.1k).

**GOTCHA teknis penting untuk sesi depan:**
- Migrasi Prisma baru TIDAK bisa via `prisma migrate dev` di sini (no Docker/Postgres lokal; `migration_lock.toml`=postgresql sementara `schema.prisma` dev=sqlite) → migration.sql ditulis TANGAN mengikuti konvensi persis `0_init` (TEXT/TIMESTAMP(3)/CONSTRAINT naming), lalu `prisma db push` untuk sync SQLite dev.
- `_engIndex`/`engById()` di `data_part4.ts` adalah SNAPSHOT SEKALI-JALAN dari seed — TIDAK ikut ter-update saat `hydrateCoreFromApi()` mengganti `AMS.ENGAGEMENTS`. Field server baru (mis. `archivedAt`) harus di-fetch langsung via `api.<x>.query()` di view, bukan lewat `engById()`.
- Menambah `:any` baru ke file `.tsx` legacy yang SUDAH ber-baseline → un-suppress SELURUH file (bukan cuma baris baru) sampai baseline diregenerasi via `npm run lint:any-baseline` (scoped, hanya update count file yang disentuh — aman dipakai).

Terkait: [[asseris-deploy-readiness]] [[asseris-uat-audit-workflow-plan]] [[neosuite-ams-arc]]
