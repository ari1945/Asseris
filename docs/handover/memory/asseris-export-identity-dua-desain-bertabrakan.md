---
name: asseris-export-identity-dua-desain-bertabrakan
description: Arc identitas ekspor — W1 ditahan, keller menang (#330); arc-nya di-rebase & dikirim sebagai PR #332 (draft, menunggu sign-off PRD)
metadata:
  type: project
---

**Cabang `claude/intelligent-keller-7b28db` (`3d88e81`) dan gelombang W1 (doc mendarat
`bc51f47` / #328, 2026-08-28) menyerang CACAT YANG SAMA dengan DUA DESAIN yang tidak
dapat hidup berdampingan.** Rebase dihentikan sengaja; keputusan arsitektur ada pada Ari.

**Cacatnya (sama untuk keduanya):** tombol ekspor membangun payload yang **disegel
Ed25519** dan dicatat ke jejak audit server, tetapi identitas di dalamnya dikarang di
view — `firm: 'KAP Wijaya Hartono & Rekan'` literal, `scopeId` hantu, klien/perikatan
fallback. **66 berkas `view_*.tsx` di master masih memuat literal itu** per `8ce8e8e`.

| | keller F-1/F-2 (belum mendarat) | W1 (8 paket, doc #328 mendarat) |
|---|---|---|
| Titik perbaikan | **choke point** — `export_pdf.ts` (+74) menarik identitas sendiri | **tiap call site** — view memanggil `useFirmName()` |
| SSOT | `export_identity.ts` **BARU** (`resolveExportIdentity`, semantik TOLAK) | `firm_identity.ts` **sudah di master**, W1-00 melarang mengubahnya |
| Jangkauan | 102 berkas, tiap perubahan berupa PENGHAPUSAN | 40+ view lewat 8 sesi paralel |
| Status | 3 commit, tak pernah di-push | W1-E sedang dieksekusi di worktree `D:/Claude AI/_wt/pppk` |

⚠️ **Dokumen W1 ditulis TANPA tahu cabang keller ada** — nol sebutan `export_identity`
di seluruh `docs/prompts-perbaikan/W1-*`. Ada cabang bernama `docs/w1-ditahan-export-identity`
(nol commit, penanda saja), jadi tegangan ini pernah disadari lalu terlupakan.

**Mendaratkan keduanya = SSOT kedua** — pola yang berulang menggigit repo ini
([[asseris-invprop-ssot-kedua]], [[asseris-framework-satu-accent-dua-peran]]).

## Keadaan rebase (dihentikan, tak ada yang hilang)

Worktree terpisah `.claude/worktrees/export-identity`, cabang `feat/export-identity-ssot`
(masih di `3d88e81`, rebase di-abort bersih). **Hasil separuh diselamatkan sebagai
`wip/export-identity-f1-rebased` (`be81178`)** = PRD + F-1 sudah di atas master, 2 konflik
terselesaikan.

- `git rebase --onto origin/master 5d4a9af` → F-1 konflik 2 berkas, F-2 konflik **16 berkas**.
- Empat konflik yang sudah saya selesaikan berpola SATU: **master bergerak maju, cabang
  memakai versi lama**. Resolusi benar = **ambil dua-duanya**, bukan pilih satu sisi:
  `amsDateIso()`/`amsYear()` master (arc klok SSOT) + `FIRM_SCOPE_ID` cabang;
  `retentionClass: RETENTION.classForType(f.type).id` master + `FIRM_SCOPE_ID` cabang;
  `namaKlien` master + pencabutan `firm:`/`scopeId` cabang.
- **16 sisanya BUKAN mekanis.** Contoh yang membuktikan: `view_bo1.tsx` — master
  MENGHAPUS fungsi mati `RecordsRetentionLegacy` (arc #293), cabang masih memuatnya;
  `view_firmtreasury.tsx` — master SUDAH memperbaiki lewat `useFirmName()` (#290) lengkap
  dengan gerbang penolakan, dan F-2 akan MENCABUTNYA. Menyelesaikan ke-16 itu = memilih
  arsitektur secara diam-diam.

**How to apply:** jangan lanjutkan rebase sebelum Ari memilih desain. Bila keller dipilih,
delapan prompt W1 harus ditulis ulang lebih dulu (mereka menyuruh sesi memakai
`useFirmName()` di call site — persis yang F-2 cabut). Bila W1 dipilih, cabang keller
dibuang tapi **PRD-nya (`docs/prd-export-seal-identity-ssot.md`) dan gerbang
`export_identity_callsites.test.ts` layak diselamatkan** — gerbang itu yang mencegah
literal kembali menyelinap.

Terkait: [[asseris-w1-identitas-tersegel-paralel]] · [[asseris-sensus-cabang-2026-08-27]] ·
[[asseris-firm-identity-mock-mengarang-konteks]]


---

## KEPUTUSAN SUDAH ADA — #330, 2026-08-28 22:35 (jangan tanya ulang)

Ditemukan sesudah memo di atas ditulis: **`868678d` / PR #330 sudah mendarat**, dan isinya
memutuskan tabrakan ini ke arah **keller**, bukan W1:

> **Keputusan Ari: kerjakan W1-E saja; tahan sisanya; lalu sign-off PRD dan daratkan arc-nya.**

`W1-00-IDENTITAS-TERSEGEL.md` kini berspanduk merah **"GELOMBANG INI DITAHAN — kecuali
W1-E"**, dan §2-nya (`useFirmName()` per call-site) dinyatakan **SALAH sebagai anjuran**
untuk 123 call-site — benar hanya untuk `view_firmtreasury`. W1-A…D, F…H diberi spanduk
DITAHAN; isinya dipertahankan sebagai temuan terverifikasi, bukan perintah kerja.
**W1-E jalan terus** dan sudah jadi PR **#329** (OPEN), tapi butir E1 dicabut
(`view_records.tsx:405` masuk lingkup arc keller).

**Argumen yang memenangkan keller**, dicatat karena kuat:
- Lingkup **123 call-site di ±60 view** vs 32 berkas W1.
- **Kelas cacat KEEMPAT yang W1 lewatkan:** `|| 'default'` truthy ⇒ `assertEngagementAccess`
  JALAN dan GAGAL ⇒ artefak **diam-diam TIDAK TERSEGEL** — beda dari `undefined` yang justru
  melewati penjagaan.
- Bantahan langsung atas pola W1: *"Selama identitas boleh didorong pemanggil, tombol
  ekspor ke-124 bebas mengarangnya lagi."*

⚠️ **Akar kekeliruan yang dicatat #330** — pada 2026-08-27 cabang keller divonis "sudah
mendarat" berdasarkan **SATU berkas contoh** (`view_sa580.tsx`) yang memang identik karena
#317 men-cherry-pick-nya; 100 berkas lain tak pernah diperiksa. Metode sensus kini menuntut
perbandingan **POHON** (`git diff --name-only origin/master <cabang>`) **dan** `gh pr list`
sebagai tempat **KEEMPAT** yang wajib diperiksa — PR terbuka tidak muncul di sensus cabang
lokal, dan #318 hanya ketahuan lewat itu.

**Langkah berikutnya yang sah:** sign-off PRD `docs/prd-export-seal-identity-ssot.md`
(status Draft, hidup di cabang keller), lalu daratkan arc-nya — yaitu **menyelesaikan rebase
yang dihentikan di atas**, dengan resolusi konflik "ambil dua-duanya" (kemajuan master
dipertahankan, argumen identitas dicabut).


---

## PR #332 TERKIRIM (draft) — 2026-08-28

Cabang **`feat/export-identity-ssot`** (`d3f39b7`), rebase penuh ke `f57c24b`.
**`npm run verify` PASSED** — 3.971 uji frontend + 472 backend, tsc 0 error dua tier.
**Sengaja DRAFT:** PRD masih `Draft — menunggu sign-off ("Proceed.")`; merge = keputusan Ari.
112 berkas, +1.470/−479. Literal nama firma di `view_*.tsx`: **66 berkas → 4** (keempatnya
sah: `'Kepada KAP …'` SA 580 = alamat TUJUAN, dua fallback `AMS.FIRM` di modul non-ekspor).

**Commit ke-4 adalah temuan baru, bukan sekadar rebase:** empat **model builder** yang
mendarat SESUDAH cabang dibuat (`firm_gl_export` #318 · `diagnostics_export` ·
`bank_recon_export` · `fixedassets_export` #289) merakit model di luar view lalu mendorong
identitas lewat **spread**. **Yang menemukannya `tsc`** (`firm?: never` → 7 error di 7 titik),
bukan pembacaan manual — sensus TEKS tak akan menemukan satu pun. Ini pembenaran empiris
untuk menaruh gerbang utama di TIPE, bukan di regex. Ikut mati: `|| 'Kantor Akuntan Publik'`
di `view_firmgl.tsx`, yang lolos sensus 60-literal karena bukan nama KAP kita.

**Enam uji lama menegakkan kontrak LAMA** (identitas ADA di payload) — assertion DIBALIK,
bukan dihapus. Yang paling tajam `internalaudit_conventions`: gerbangnya dulu MENUNTUT
`scopeId: memoCtx.engagementId` di view; sejak identitas ditarik SSOT, tuntutan itu berbalik
jadi larangan. **Pelajaran umum: gerbang bisa jadi SALAH bukan karena bug, melainkan karena
arsitektur di bawahnya berubah arah.**

### Resolusi konflik — aturan "AMBIL DUA-DUANYA"

20 konflik. Aturannya bukan pilih-satu-sisi melainkan: **kemajuan master dipertahankan,
argumen identitas dicabut**. Yang tertolong karenanya — dan akan MEREGRESI bila di-merge
naif: `amsDateIso()`/`amsYear()` (klok SSOT) · penghapusan `RecordsRetentionLegacy` (#293) ·
`fixedAssetsExportModel` (#289) · helper memo SA 610 yang mencabut literal `ENG-2025-014`
(#296) · `fwStdLabel` (#315) · `namaKlien` · `retentionClass: RETENTION.classForType().id`.
Konflik terakhir menegaskan arah: `view_records.tsx` di master MENAHAN literalnya dengan
komentar yang menunjuk arc ini sebagai yang mencabutnya.

### Sisa & jebakan

- `wip/export-identity-f1-rebased` (`be81178`) kini SUBSET dari PR — hapus sesudah #332 merge.
- Worktree `.claude/worktrees/export-identity` masih ada (node_modules junction; lepas dengan
  `cmd /c rmdir`, JANGAN `rm -rf`).
- ⚠️ **`view_firmgl.tsx` disentuh PR ini DAN dimodifikasi (+287 belum-commit) di worktree
  utama oleh sesi lain** — konflik pasti terjadi saat sesi itu commit.
- ⚠️ **`` menjadi BACKSPACE harfiah** bila ditulis lewat string Python non-raw. Terjadi pada
  saya di `internalaudit_conventions.test.ts` (tertangkap `cat -A`). Sapuan menemukan DUA
  korban lama di master: `newdisc_derive.test.ts:371` dan `timebudget_isolation.test.ts:318` —
  keduanya gerbang yang TAK PERNAH BISA MEMERAH. Ditandai sebagai tugas terpisah.
  Perluasan [[asseris-repo-hygiene-2026-08-19]]: bukan cuma heredoc, tapi setiap penulisan
  berkas lewat string berescape. Verifikasi dengan `grep -rlP ""`.
