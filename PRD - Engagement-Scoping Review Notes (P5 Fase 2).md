# PRD — Engagement-Scoping Catatan Review (P5 Fase 2)

> Wajib sign-off ("Proceed.") sebelum implementasi.
> Stream: lanjutan [[neosuite-ams-p5-lifecycle-gates]] (P5 core Fase 0-3 SELESAI).
> Dipicu oleh keterbatasan yang didokumentasikan di PRD P5 §9 & risiko gate.

| Field | Isi |
|---|---|
| Tanggal | 2026-06-18 |
| Pemilik | Ari Widodo |
| Status | **DRAFT — menunggu sign-off** |

---

## 1. Problem
`reviewNotes` adalah **satu array global** (persist `ams.v1.reviewNotes`, seed `data_part1.js:153`),
**tanpa `engagementId`**. Padahal aplikasi punya 7 engagement (kanban firm board) dengan satu
yang aktif (`activeEngagementId`). Akibat:
- **Gerbang fase P5** (`engagementGate`, `wp_signoff.jsx`) menghitung "catatan terbuka" dari
  SELURUH engagement → **over-count**: engagement lain bisa terblokir oleh catatan yang bukan
  miliknya, dan kriteria "0 catatan terbuka" untuk Arsip mustahil bila ada catatan terbuka di
  engagement mana pun.
- **Cockpit** (command center engagement aktif), **workspace board**, **My Tasks** menampilkan
  catatan lintas-engagement seolah milik engagement aktif.
Ini keterbatasan yang sudah ditandai di PRD P5 (Non-Scope Fase 1, ditunda ke sini).

## 2. Objective
Setiap catatan review terikat ke **satu engagement**; konsumen yang berlingkup-engagement
(gerbang fase, cockpit, workspace, my-tasks) hanya melihat/menghitung catatan engagement
yang relevan. **Backward-compatible** (state localStorage lama tak rusak), **minim-invasif**
(tetap satu store + field, bukan rombak struktur persist), konsisten SSOT.

## 3. Success Criteria
- Setiap catatan punya `engagementId`; `addReviewNote` menstempel `activeEngagementId`.
- Selector tunggal `notesForEngagement(notes, engId)` (murni) + turunan `reviewNotesActive`
  (terfilter `activeEngagementId`) diekspos dari AuditContext.
- `engagementGate` menghitung catatan dari engagement-scope (bukan global) → over-count hilang.
- Konsumen berlingkup-engagement memakai daftar terfilter (sesuai keputusan §11-Q3).
- Backward-compat: catatan lama tanpa `engagementId` tak hilang dari UI (lihat §11-Q2).
- Gate teknis: `lint`/`typecheck`/`build` hijau; **canon 49 test utuh**; 0 console error;
  diverifikasi live (Vite :5180) — switch engagement aktif → catatan & gate ikut berubah.

## 4. Scope
- Tambah `engagementId` ke seed `REVIEW_NOTES` (`data_part1.js`) = `'ENG-2025-014'` (semuanya
  memang milik engagement demo itu).
- `addReviewNote` (`contexts.jsx`) stempel `engagementId: activeEngagementId`.
- Selector `notesForEngagement` + `reviewNotesActive` di `contexts.jsx` (audit memo).
- `engagementGate` (`wp_signoff.jsx`) pakai catatan engagement-scope.
- Konsumen berlingkup-engagement → pakai daftar terfilter (default rekomendasi §11-Q3:
  cockpit + workspace + my-tasks; dashboard tetap firm-wide).

## 5. Non-Scope
- Rombak struktur persist jadi per-engagement key (`ams.v1.reviewNotes.<engId>`) — ditolak
  (lebih invasif, butuh migrasi; lihat §8 alternatif).
- W6/backend (tetap `localStorage`).
- Multi-engagement working state lain (wpState/aje/risks tetap active-scoped by-design — di
  luar P5; lihat catatan §9).
- Cross-engagement notes inbox / pelaporan lintas-engagement (fitur baru, bukan scoping).

## 6. Constraints
`localStorage` · ESM-only `migration/src/*` · aturan emas anti-tabrakan · SSOT · PRD dulu ·
tak boleh memecah state lama pengguna (backward-compat).

## 7. Existing Solutions / dipakai ulang
- `activeEngagementId` + `activeEngagement` (`useFirm`).
- Pola per-entity yang sudah ada: `opinionDoc.<engId>` (keyed) sebagai preseden — tapi untuk
  notes kita pilih **field** (lebih cocok untuk daftar tunggal + selector).
- `reviewNotes`/`addReviewNote`/`resolveReviewNote`/`updateReviewNote` (`contexts.jsx`).

## 8. Proposed Approach
1. **Field, bukan re-key.** Tambah `engagementId` per-catatan. Seed = `'ENG-2025-014'`.
2. **Selector murni** `notesForEngagement(notes, engId)` →
   `notes.filter(n => n.engagementId === engId || n.engagementId == null)` (legacy unstamped
   ikut tampil untuk engagement aktif → tak ada yang hilang; §11-Q2).
3. **Turunan context** `reviewNotesActive = notesForEngagement(reviewNotes, activeEngagementId)`
   di audit memo. Konsumen berlingkup-engagement beralih dari `reviewNotes` → `reviewNotesActive`.
4. **`addReviewNote`** stempel `engagementId: activeEngagementId` (default, bisa di-override
   via arg).
5. **`engagementGate`** baca `audit.reviewNotesActive` (bukan `audit.reviewNotes`).

**Alternatif ditolak:** re-key per-engagement store → memecah array tunggal, butuh migrasi
localStorage lama, menyentuh 4 setter. Field + selector mencapai tujuan dengan jejak minimal.

## 9. Risks
- **Catatan "hilang" pasca-scoping** bila legacy tanpa engagementId disembunyikan → mitigasi:
  fallback `== null` tampil-untuk-aktif (Q2).
- **Konsumen salah lingkup** (mis. dashboard firm-wide vs engagement) → mitigasi: keputusan
  eksplisit per-konsumen (Q3), bukan asumsi.
- **Gate non-aktif engagement** masih pakai data engagement aktif untuk wpState/notes
  (keterbatasan single-active-engagement yang sudah ada) → mitigasi: dokumentasikan; scoping
  notes ini setidaknya menghilangkan over-count untuk engagement aktif. Konsisten dgn wpState.
- **Seed berubah** → snapshot test? Tak ada snapshot atas REVIEW_NOTES; canon tak tersentuh.

## 10. Implementation Plan
- **Fase A:** field + selector + `reviewNotesActive` + `addReviewNote` stamp (data+contexts).
  Tanpa mengubah konsumen dulu — verifikasi `reviewNotesActive` benar.
- **Fase B:** alihkan konsumen berlingkup-engagement (gate + cockpit + workspace + my-tasks per
  Q3) ke daftar terfilter; verifikasi switch-engagement.
- Satu commit/fase: `lint`/`typecheck`/`build` + verifikasi browser + commit + memory.

## 11. Open Questions (perlu keputusan sebelum "Proceed.")
1. **Mekanisme** — field `engagementId` + selector (rekomendasi) **vs** re-key per-engagement
   store? *(rekomendasi: field — minim-invasif, backward-compat.)*
2. **Legacy notes tanpa engagementId** — (a) tampil untuk engagement aktif (rekomendasi, tak ada
   yang hilang), (b) sembunyikan, (c) migrasi sekali ke `activeEngagementId` saat load.
   *(rekomendasi: (a).)*
3. **Lingkup per-konsumen** — mana yang difilter ke engagement aktif?
   - Gerbang fase P5, **Cockpit**, **Workspace board** → **scope** (rekomendasi).
   - **My Tasks** (catatan `to === saya`) → scope ke aktif (rekomendasi) atau lintas-engagement?
   - **Dashboard** (`view_dashboard2`, landing) → **firm-wide / global** (rekomendasi: biarkan,
     ini ringkasan lintas-engagement) atau scope?
   *(rekomendasi: scope gate+cockpit+workspace+mytasks; dashboard tetap global.)*
4. **`localStorage`** tetap (bukan W6)? *(diasumsikan ya, warisan P1/P2/P5.)*

---
**Sign-off:** balas **"Proceed."** untuk Fase A. Bila ingin ubah Q1-Q3 dari rekomendasi,
sebutkan dan saya sesuaikan PRD lebih dulu.
