---
name: asseris-cockpit-tab-segel
description: "Cockpit C1/C2 — tab tak beralamat yang tak bisa dilihat gerbang SC-9, dan identitas firma literal di dalam payload TERSEGEL; 59 call-site ekspor lain masih hardcode"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5b87c770-9d61-492e-b0bc-64b6b9c4f73c
  modified: 2026-08-20T05:03:59.290Z
---

# Engagement Cockpit — C1 (tab tak beralamat) & C2 (identitas tersegel) — 2026-08-20

Dua cacat di `migration/src/view_cockpit2.tsx`, keduanya ditutup + digerbangi.
PR **#265** MERGED 2026-08-20 (squash `17fe62e`) — CI 9/9 hijau, cabang dihapus.
`origin/master` = **`17fe62e`**, nol PR - nol isu, remote hanya `master`.

**Cara commit tanpa mengganggu sesi paralel** (worktree ini dipakai bersama, ada
kerja asing belum di-commit di `view_home*`/`styles_*`): JANGAN `git checkout -b` —
itu memindahkan branch sesi lain. Pakai plumbing, working tree tak tersentuh:
`git read-tree HEAD --index-output=.git/tmpindex` → `GIT_INDEX_FILE=... git add <berkas>`
→ `git write-tree` → `git commit-tree` → `git branch <nama> <sha>`.
Lihat [[asseris-sesi-paralel-satu-worktree]].

## C1 — kenapa gerbang SC-9 TIDAK bisa melihatnya

`tab_address.test.ts` SC-9 hanya memeriksa modul yang **sudah jadi sasaran**
`nav(id, { tab })` di suatu view. Cockpit **belum pernah** dipanggil dengan `{tab}` —
tiga pemanggilnya (`view_home`, `view_home_cockpit`, `view_scheduler`) memanggil
`nav('cockpit')` polos. Jadi modul yang tak beralamat itu **tak pernah masuk daftar
periksa**, dan `#/cockpit?tab=risiko` selalu mendarat di Ringkasan tanpa error.

**POLA UMUM:** gerbang berbasis "siapa yang dipanggil" buta terhadap kemampuan yang
belum pernah dicoba. Cacatnya bukan tautan yang salah — melainkan **kemampuan yang
tak ada**, sehingga tak ada yang berani menautkannya. Gerbang semacam itu perlu
pasangan: uji yang memaku modul tertentu tetap beralamat (`describe('C-1 …')`).

Perbaikan: `TABS` (lokal komponen) → `CKP_TABS` scope modul, `CKP_TAB_IDS =
CKP_TABS.map(…)` **diturunkan** (presedens `WTB_TAB_IDS`, gerbang SC-6 anti-busuk),
lalu `useInitialTab('cockpit', 'ringkasan', CKP_TAB_IDS)`.

## C2 — literal DI DALAM payload yang disegel Ed25519

`firmName: 'KAP Wijaya Hartono & Rekan'` ditulis tangan ke `buildCockpitStatusReport`,
yang lalu disegel `amsExportXlsx` (hash konten + Ed25519) dan keluar sebagai artefak.
**Menyegel identitas yang salah lebih buruk daripada tidak menyegel** — segel memberi
otoritas pada isi yang keliru, dan pembaca berkas tak punya cara tahu namanya tak
pernah berasal dari profil firma.

Diganti `(AMS.FIRM as { name?: string } | undefined)?.name || ''` — **tanpa fallback
literal**, alasannya sama: berkas tersegel tak boleh mengarang identitas. `export_xlsx`
menulis `['Firma', model.firm || '']`, jadi sel kosong, bukan nama karangan.

## SISA YANG BELUM DITUTUP (keputusan Ari)

`FirmContext` **tidak** membawa profil firma sama sekali — SSOT satu-satunya adalah
`AMS.FIRM` (`data_part1.ts`). Di `migration/src`:

- **59 call-site** di **50 berkas** masih `firm: 'KAP Wijaya Hartono & Rekan'` literal —
  semuanya lewat `amsExportXlsx`, jadi **semuanya tersegel** (cacat C2 yang sama).
- **32 call-site** sudah baca `AMS.FIRM.name`, tapi hampir semuanya **masih menyimpan
  fallback literal** (`|| 'KAP Wijaya Hartono & Rekan'` / `|| 'KAP'`) — cacatnya hidup
  di cabang fallback.

Perbaikan struktural yang layak dipertimbangkan: `amsExportXlsx` **mengisi sendiri**
`firm` dari `AMS.FIRM` bila tak diberikan, + gerbang statik "tak ada literal `'KAP …'`
di `view_*.tsx`". Belum dikerjakan — di luar lingkup C1/C2.

Terkait: [[asseris-tab-beralamat-v9]] · [[asseris-prd-tab-beralamat-v9]] ·
[[asseris-repo-hygiene-2026-08-19]] · [[asseris-deeplink-tab-nav]]
