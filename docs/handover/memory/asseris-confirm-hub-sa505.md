---
name: asseris-confirm-hub-sa505
description: Confirmation Hub (SA 505) dibuat auditable — persist konfirmasi engagement-scoped + status WP + wire SAD; live-verified Manager
metadata: 
  node_type: memory
  type: project
  originSessionId: c01fefea-d4d3-450f-b59d-804d32f763e6
---

Standalone **Confirmation Hub** (`migration/src/view_confirm.tsx`) dijadikan auditable (2026-06-26). PRD: `PRD - SA 505 Confirmation Hub Auditable (...).md`. **✅ COMMITTED 2026-07-01 `1e51a8a` (LOKAL, belum push)** di branch `feat/w9-coretax-connector` — Ari konfirmasi mengenali & minta tetap. **CAVEAT non-self-contained:** commit itu HANYA `view_confirm.tsx` + PRD; perubahan `contexts.tsx` (AMS_PERSIST_SCOPE `confirmState.v1`) + `eslint-suppressions.json` yang jadi dependensinya ikut ter-commit di `6fc9d6b` (nav-beranda, sudah push) karena file itu intermingled dgn kerja Fase 3 personal-scope. Fungsional aman (satu branch punya semua potongan), tapi tak bisa cherry-pick SA505 sendiri tanpa 6fc9d6b.

**Pemicu = baris Matriks Konektivitas "confirm · 🟡 TERISOLASI · auto-link ke WP". DUA klaimnya SALAH (grep-dulu):** (1) `connectivity.json` rate `confirm`=`hub` (out6/inc8), bukan terisolasi — artefak W0 basi; (2) `confirm` SUDAH di `WP_MODULE_MAP` ([[asseris-authoritative-persist-key-recipe]] · wp_signoff.tsx:81) dgn requiredEvidence SA 505 — shell WP (sign-off+evidence+badge) sudah ada. Masalah NYATA: modul = cangkang demo (state efemeral, tombol SAD mati, klaim "diteruskan otomatis ke SAD" = vaporware).

**Yang dibangun (scope module-only, diputuskan Ari):**
- **Fase 1 persist:** state kerja (overrides status/resp/validated per-id atas seed `CONFIRMATIONS` + recon/altChecks/relChecks) → satu objek `useAmsPersist('confirmState.v1', …)`, **engagement-scoped** (ditambah ke `AMS_PERSIST_SCOPE` di contexts.tsx). UI-state (tab/filter/seleksi) tetap `useStateCF` efemeral. `items` = useMemo(seed+overrides).
- **Fase 2 status WP (module-only):** panel "Status Kertas Kerja SA 505" di tab Ringkasan, petakan 3 bukti wajib → kelengkapan dari hasil kerja (register terkirim / diskrepansi=0 / non-jawaban=0). **TIDAK auto-attach ke store evidence global** — `evidence.tsx` pakai `localStorage 'ams.v1.evidence'` keyed moduleId, **tak ber-scope perikatan** → auto-attach BOCOR antar-perikatan. (Opsi "extend wpCompletenessFor" & "refactor evidence engagement-scope" ditolak Ari = PRD terpisah.)
- **Fase 3 SAD + kejujuran:** tombol "Buka SAD Ledger" → `nav('sad',{from:'confirm'})` (modul `sad`=`SADLedger` NYATA, view_sad.tsx); hapus kata "otomatis" palsu → "dibawa auditor". Badge **DEMO** + title pada tombol simulasi (Import Saldo/Kirim Pengingat/Kirim Batch).

**KOREKSI altitude:** SAD (`view_sad.tsx`) juga cangkang demo (`SAD_SEED`→useState, tanpa persist/ingestion; M-03 SA530 = seed hardcode, bukan wired). "Kontribusi nyata confirm→SAD" butuh SSOT salah-saji bersama = PRD terpisah, JANGAN diselundupkan.

**Gates HIJAU:** typecheck 0 · lint 0 · test 358 · build OK. Baseline `:any` view_confirm 68→80 (file app-tier saturasi `:any`, no @types/react — edit ikut pola; regen via `npx eslint src --suppress-rule @typescript-eslint/no-explicit-any` karena `lint:any-baseline` RUSAK).

**LIVE-VERIFIED Manager** (anindya.p@whr-cpa.id/Manager#2025!, ENG-2025-014): render OK; tandai 2 No-Reply diterima → gate "Prosedur alternatif" flip BELUM→TERPENUHI, badge 1/3→2/3; **server `POST /state.set → 200`** (bukan 403 diam — Manager non-FIRM_ADMIN tulis engagement-scope OK, capForWrite=WP_EDIT); reload → state bertahan (server-persist); "Buka SAD Ledger" → modul SAD. Konteks ini ≠ tracker SA505 per-WP di `view_wp.tsx` ([[asseris-wp-execution]] Fase 3) — itu register mini di tab Bukti WP, ini modul standalone.

**GOTCHA dev.db:** dev.db lama PRE-rename → login current-seed DITOLAK. **Aku `npm run seed` (server) + kill/restart server :5181** (izin Ari). Sekarang dev.db = seed terkini: Manager anindya.p · Senior dimas.r · Junior fajar.n · Partner hartono.w (semua `<Role>#2025!`). handoff 2026-07-03 (dihapus) menyebut seed ini memang pending. Preview MCP nolak attach :5180 (chat lain) + vite.config hardcode port 5180 → verifikasi pakai vite sendiri :5190 + Chrome MCP.
