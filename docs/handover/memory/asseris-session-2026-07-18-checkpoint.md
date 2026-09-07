---
name: asseris-session-2026-07-18-checkpoint
description: "Checkpoint sesi 2026-07-18 — semua kerja MERGED, repo bersih (0 PR terbuka, master sinkron); 2 bug produksi diperbaiki + Dependabot dibereskan total. Titik mulai sesi berikutnya."
metadata: 
  node_type: memory
  type: project
  originSessionId: 196ffae8-6856-46f1-a4eb-cd24c693d549
---

> ⏸️ **PAUSE 2026-07-18 → lanjut sesi baru.** Repo Asseris dalam keadaan **BERSIH TOTAL**: `master` lokal = `origin/master`, working tree bersih, **0 PR terbuka**. Tak ada utang menggantung. Aksi pertama sesi depan: konfirmasi `git status` bersih; tak perlu reseed (kerja sesi ini config/server/docs, bukan data).

**Sesi bermula** dari "cek apakah status terakhir sudah di-push?" lalu berkembang jadi pembersihan menyeluruh.

**Fitur di-MERGE ke master sesi ini:**
- PR #61 isolasi data personal (merge `2dc48c6`) — lihat [[asseris-personal-data-isolation]].
- PR #70 Excel Engagement Pack (merge `d255b16`) — lihat [[asseris-excel-engagement-pack]].

**DUA BUG PRODUKSI ditemukan (lewat menolak menerima kegagalan restore-drill CI begitu saja) + diperbaiki + terverifikasi end-to-end di Postgres:**
- **PR #85 (`fix/rolestore-empty-table-fallback`, merge di master):** regresi dari refactor RBAC DB-backed (b36f6a9/PR #61). `server/src/roleStore.ts` menghidrasi cache cap **sekali saat boot**; pada urutan normal `docker compose up` di deploy segar, server boot SEBELUM `npm run seed` isi tabel `Role` → cache jadi Map kosong → **deny-all SEMUA cap sampai restart** (Managing Partner Hartono tak bisa `audit.view` → restore-drill 403). FIX: `refreshRoleCache()` → `cache = size===0 ? null : next` (tabel kosong = belum-seed → pertahankan fallback statik GRANTS). Guardrail retensi FIRM_ADMIN jamin tabel-kosong hanya pra-seed. +test regresi di `roleStore.test.ts`. GOTCHA: test `audit.test.ts`/`audit_export.test.ts` sengaja `auditLog.update()` untuk buktikan deteksi-tamper → trigger append-only TAK BOLEH ada di SQLite.
- **PR #86 (`fix/dbharden-postgres-multistatement`, merge `089e796`):** `server/src/dbHarden.ts` jalankan seluruh DDL sebagai satu `$executeRawUnsafe` → Postgres tolak multi-command (42601) → **trigger K5 append-only AuditLog TAK PERNAH terpasang di deploy Postgres mana pun** (non-fatal, lolos tak terdeteksi). FIX: pecah jadi `HARDEN_STATEMENTS[]`, jalankan satu per panggilan; SQLite tetap no-op disengaja. +assertion di `restore-drill.yml` ("K5 trigger active": UPDATE langsung ke AuditLog harus ditolak) — drill kini permanen menguji trigger (dulu tak pernah). Terbukti hijau di Postgres CI.

**Dependabot DIBERESKAN TOTAL** (memakai `.github/dependabot.yml` + [[asseris-*]] tak ada; catatan di repo):
- 13 PR aman di-MERGE (action bumps, patch, node 22→26, zod 3→4 diperiksa aman, checkout/setup-node/terraform, @babel/parser+traverse, concurrently, dev-deps minor).
- 9 PR breaking di-CLOSE + ditahan via `ignore` di `dependabot.yml` + dicatat di **`docs/UPGRADE-BACKLOG.md`**: React 19 (#53/#54), Prisma 7 (#50/#51), TS 7 toolchain=typescript/@types/node/vitest (#63/#66), Vite 8+@vitejs/plugin-react (#78/#80), ESLint 10+@eslint/js (#83).
- Config PR #71/#84/#87: grup dev-deps dibatasi minor+patch (agar 1 major breaking tak menenggelamkan grup) + ignore per-major. **Saat siap garap upgrade tertunda: hapus entri `ignore` yang cocok + ikuti langkah di `docs/UPGRADE-BACKLOG.md`.**
- Housekeeping: PR #88 profil launch "server" :5181 (`.claude/launch.json`) — kini di master (dulu berulang "sengaja uncommitted", akhirnya di-commit atas persetujuan Ari).

**Pola berulang penting:** verifikasi live/CI WAJIB — jangan terima kegagalan CI sebagai "flaky" tanpa baca log; dua bug produksi nyata di atas ketahuan justru karena menolak asumsi flaky. Untuk merge Dependabot: cek CI hijau dulu; major yang gagal = defer via ignore + backlog, bukan merge paksa. Tool gh via PowerShell `C:\Program Files\GitHub CLI\gh.exe` (lihat [[asseris-tooling-gh]]).
