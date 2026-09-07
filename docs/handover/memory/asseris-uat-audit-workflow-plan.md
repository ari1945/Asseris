---
name: asseris-uat-audit-workflow-plan
description: "Rencana UAT fungsional alur kerja audit Asseris (drafted 2026-07-02, belum dieksekusi)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0cbce7c4-379a-477e-92d2-7deedf0adc96
---

# UAT — Fitur & Alur Kerja Audit (Asseris)

Drafted 2026-07-02, bagian dari kesiapan deploy tapi domain terpisah dari [[asseris-deploy-readiness]] (QA fungsional, bukan infra). **Status: 0% dieksekusi** — baru daftar tugas, belum ada hasil Pass/Fail.

## Sumber kebenaran dipakai untuk menyusun plan
Bukan checklist generik — diturunkan dari kode aktual: modul dari `MODULES` di `migration/src/icons.tsx`, peran+kapabilitas dari `GRANTS` di `migration/src/rbac.ts` (6 role: **Engagement Partner, Audit Manager, Senior Auditor, Junior Auditor, Admin & HR Firma, Finance Firma**). Bisa diregenerasi/diperluas dengan grep ulang file yang sama jika modul baru ditambahkan sejak tanggal ini.

## Struktur plan (8 bagian, urut siklus hidup perikatan)
0. **Persiapan** — reseed, ≥2 engagement aktif (uji isolasi), login tiap 6 role.
1. **Akseptasi & Perikatan (SA 210/220)** — gerbang Perencanaan→Eksekusi, override Partner-only ter-log.
2. **Perencanaan** — Risk Assessment SA315, Materiality (uji SSOT ke hilir), Strategy Memo SA300/330 approval gate, ICFR, Matriks Asersi.
3. **Eksekusi** — WTB ingress+integritas, ledger drill, AJE, WP execution+sign-off SoD (Junior→Senior/Manager→Partner), Sampling SA530, JET/SA240, Confirmation Hub SA505, Going Concern/Opening Balance/Subsequent Events/Related Parties/Group Audit/Use of Expert/Service Org/Evidence Evaluation, Tax Audit Diagnostic, Time&Budget→WIP, My Tasks isolasi.
4. **Pelaporan** — FS Generator (presisi angka), Disclosure checklist, Opinion Generator (Partner-only + gerbang etika/AML), EQR ISQM2 (Partner-only), Management Letter lineage, Export+Seal (termasuk **negative test**: file dimodifikasi pasca-export harus gagal verify-seal).
5. **Arsip** — gerbang WP/opini lengkap, read-only pasca-arsip, `audit.verify` full-chain `ok`.
6. **Lintas-alur/SSOT** — propagasi angka WTB→hilir tanpa refresh manual, conflict-toaster 2-tab (atomic CAS), dock lineage no-orphan, isolasi W7.5.
7. **Matriks RBAC** — tabel per-aksi × role (approve opini, EQR, override fase, kelola integrasi, HR, keuangan firma, VIEW_ALL) — **uji boleh DAN uji ditolak**, server-side (tRPC 403) bukan cuma UI disabled.
8. **Regresi konektor** — Coretax/e-Faktur idempotent-post (2× sync tak dobel-posting), gate Σ-PPN.

## Rekomendasi format tracking (belum dibuat)
Tabel: item × Pass/Fail/Blocked × role penguji × engagement × catatan. User diusulkan taruh di `09-AI-OPERATING-SYSTEM/Briefs/` per konvensi vault — **belum ada file dibuat**, ini masih usulan.

## Next action saat resume
Tanya user: mulai eksekusi UAT dari bagian mana (disarankan mulai dari §1 Akseptasi karena itu gerbang paling hulu), atau breakdown 1 bagian jadi skenario langkah-demi-langkah dulu sebelum eksekusi massal. Terkait [[asseris-deploy-readiness]] untuk prioritas go-live gabungan.
