---
name: asseris-pagehead-single-row
description: "Header modul (SubBar) satu-baris + font kecil + buang redundansi — ✅ PR #115 MERGED master (101d0d1)"
metadata: 
  node_type: memory
  type: project
  originSessionId: bf5aba9a-8fa1-417b-b6c9-34320f189fd2
  modified: 2026-07-22T01:17:36.664Z
---

Sesi 2026-07-22. Merombak `SubBar` (header/pagehead tiap modul) di `migration/src/shell.tsx` + `styles_chrome.css`.

**Status: ✅ PR #115 MERGED ke master 2026-07-22 (squash `101d0d1`), branch dihapus.** 6/6 CI hijau (lint·typecheck·tests·build·docker/deploy-smoke·npm-audit). Review konfirmasi self-consistent: `.pagehead-meta`/`FIRMWIDE_GROUPS` dibuang tanpa dangling ref; `.pagehead-spacer` tetap dipakai (shell.tsx:349); `RELATED_SA`/`MODULE_IFRS` hanya berhenti dirender di SubBar—registry global tetap utuh (Copilot/Matriks/minimap/related-modules dock); ratchet `:any` shell.tsx 42→41 (buang 1 `r:any`).

**Apa yang berubah** (3 iterasi digabung jadi 1 commit):
1. Dua-baris → satu-baris: buang strip meta bawah + chip "Standar Terkait · SA <no>" (redundan dgn Badge SA di aksi view).
2. Fix judul terpotong ("Working Papers"→"W"): `.pagehead-titles min-width` + prioritas; toolbar view `flex-wrap: wrap` (turun baris ke-2 alih-alih menggencet judul).
3. Perkecil font + buang SEMUA redundansi: judul 19→15px (dense 13.5), eyebrow 10.5→9px, ikon 38→30px, padding 9×18→7×16. Buang chip **engagement** (redundan dgn TopBar), **Firma-wide**, **alias IFRS** (redundan dgn judul "PSAK x→y"). Header seragam: `[kembali][ikon][judul]…[aksi view]`. Var tak-terpakai dibersihkan: `firm/scoped/firmWide/FIRMWIDE_GROUPS`.

**Keputusan Ari:** modul PSAK dgn toolbar-view ~10 tombol (lebih lebar dari layar: 1065px > 1016px) **dibiarkan wrap** (2 baris) — bukan overflow-menu, bukan scroll. Nyaris semua modul lain = 1 baris 45px (Dashboard/Going Concern/Working Papers/Timeline terverifikasi).


GOTCHA teknis (lihat juga [[asseris-tooling-gh]]):
- `shell.tsx` menyimpan **literal `—`** (6 char backslash-u-2014) di string title alias IFRS — bikin tool Edit GAGAL match (auto-swap em-dash char↔escape bentrok bila ada BOTH bentuk di old_string). Solusi: pecah edit agar tiap old_string cuma 1 bentuk, atau hapus per-nomor-baris via PowerShell `[System.IO.File]::ReadAllLines/WriteAllLines`.
- Screenshot/zoom browser-pane **timeout konsisten (30s)** di lingkungan ini → verifikasi via `javascript_tool` ukur DOM (`getBoundingClientRect`, `scrollWidth>clientWidth` utk deteksi truncation).
- Navigasi SPA tanpa klik: `localStorage.setItem('ams.route', '<id>'); location.reload()` (route dipersist di `ams.route`).
- Login seed dev (fixture di `server/src/seed.ts`, BUKAN rahasia): Managing Partner `hartono.w@whr-cpa.id` / `Partner#2025!`; primary Manager (Anindya) pass `Manager#2025!`. Preview `dev-all` port 5180 (server :5181).
- TopBar menampilkan klien+engagement persisten via `.ctx-value` (shell.tsx:47/51) → itu sebabnya chip engagement di pagehead redundan.

Terkait: [[asseris-pagehead-module-title]] (pagehead 2-baris versi lama yang kini di-single-row-kan).
