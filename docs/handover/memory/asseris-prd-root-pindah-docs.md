---
name: asseris-prd-root-pindah-docs
description: "KEPUTUSAN ARI 2026-08-28 — 61 PRD di root repo DIPINDAH ke docs/prd/ (bukan dihapus), DITUNDA sampai cabang lokal mendarat"
metadata: 
  node_type: memory
  type: project
  originSessionId: df5493d9-cd14-4e16-9e6c-5eb83a8a2fce
  modified: 2026-08-28T13:35:51.766Z
---

**Keputusan Ari (2026-08-28):** 61 berkas `PRD - *.md` di root `github.com/ari1945/Asseris`
**dipindah** ke `docs/prd/` — **BUKAN dihapus** — dan pekerjaan itu **ditunda sampai
cabang lokal mendarat**. Jangan mulai sebelum antrean PR kosong.

**Keadaan saat keputusan diambil:** 61 PRD di root + 51 di `docs/` = **108 PRD**
(semua ter-track). Registri: 53 Draft · 37 Implemented · 12 In Progress · 5 Approved ·
1 Superseded. Ari bertanya apakah bisa dihapus saja; jawabannya tidak.

**Why:** menghapus akan membuang **58 pekerjaan yang belum dikerjakan** (53 Draft +
5 Approved = pipeline Asseris) dan 37 catatan keputusan desain. Selain itu ada gerbang
CI yang menegakkannya — `migration/src/prd_registry.test.ts` memindai SELURUH berkas
berawalan `PRD`/`prd` di root + `docs/`, mencocokkan ke `docs/PRD-REGISTRY.md`, dan
**menghitung ulang** blok "## Ringkasan". Hapus/pindah berkas tanpa menyunting registri
⇒ `npm run verify` merah ⇒ melanggar R-7 (`master` selalu hijau).

Penundaannya punya sebab teknis, bukan kehati-hatian umum: `docs/PRD-REGISTRY.md`
adalah **titik konflik merge paling sering di repo ini** (tertulis di komentar gerbangnya
sendiri — auto-merge "bersih" pernah membuat In Progress 8 vs daftar 10 di master).
Rename 61 berkas + sunting registri akan berkonflik dengan hampir semua cabang yang
belum mendarat. Per 2026-08-28 masih ada enam cabang lokal memikul kerja tak
tergantikan (lihat [[asseris-sensus-cabang-2026-08-27]]).

**How to apply:** ketika antrean PR sudah kosong, kerjakan sebagai **satu PR docs-only**:
1. `git mv "PRD - *.md" docs/prd/` untuk ke-61 berkas (nama memuat em-dash dan `·` —
   pakai `git -c core.quotepath=false ls-files` saat menyensus, `comm` atas keluaran
   ter-quote memberi lima "tak ter-track" PALSU).
2. Perbarui kolom path di `docs/PRD-REGISTRY.md` (108 baris di bawah `## Daftar`).
3. Perbarui peta `BUKAN_PRD` di `migration/src/prd_registry.test.ts` (4 entri
   `docs/PRD-*.md` yang bukan PRD: registri sendiri, KATALOG-158-MODUL,
   RINGKASAN-KEDALAMAN-E9, USULAN-PENGEMBANGAN-E9).
4. `npm run verify` wajib hijau sebelum kirim.

Terkait: [[asseris-merge-antrean-2026-08-23]] · [[asseris-checkpoint-2026-08-27]]
