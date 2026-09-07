---
name: asseris-fixedassets-kertas-kerja-rollforward
description: "Aset Tetap (PR #289) — roll-forward masuk kertas kerja; premis prompt \"roll-forward sedang gagal\" TERBUKTI SALAH (residual = Rp 0), dan aljabarnya menunjukkan ia hanya bisa gagal untuk perolehan bertanggal maju"
metadata: 
  node_type: memory
  type: project
  originSessionId: 40831e6d-21cf-4b57-b08e-6ceb47ffa10f
  modified: 2026-08-22T22:42:03.463Z
---

PR **#289 MENDARAT** 2026-08-22 sebagai squash **`e881525`** — `origin/master` sekarang
`e881525`. Cabang & worktree sudah dibersihkan (lokal + remote). Prompt `docs/prompts-perbaikan/33-fixedassets.md` — **FA1·FA2·FA3·FA4
seluruhnya dikerjakan** (ronde 1: FA1/FA3/FA4 + usulan FA2; ronde 2 sesudah Ari
menyetujui: FA2 dibangun, mesin penyusutan kedua dicabut, **FA4 dikoreksi**).

## KESALAHAN SAYA YANG DITEMUKAN SESI LAIN — baca ini dulu
FA4 ronde 1 memakai `useFirm().firm.name`, MENIRU tetangga di berkas yang sama.
**FirmContext TIDAK PERNAH menerbitkan kunci `firm`** (`FirmProvider` →
clients/engagements/activeEngagement/…; `firm: D.FIRM` ada di **AuthProvider**).
Jadi tombol ekspor saya berdiri **permanen `disabled`** — dan uji render saya HIJAU
karena ia me-mock `useFirm: () => ({firm:{name}})`, bentuk konteks yang DIKARANG.
Ditemukan lewat memori sesi paralel (PR #290, [[asseris-firm-identity-mock-mengarang-konteks]]).
PELAJARAN: **meniru pola tetangga tanpa memeriksa sumbernya = mewarisi cacatnya**;
dan mock yang mengarang bentuk konteks membuat oracle memvalidasi dirinya sendiri.
Koreksi: sesudah #290 mendarat (`2e6aadf`), PR ini di-rebase dan memakai pintu bersama
**`useFirmName()`** (`firm_identity.ts`); mock uji diperbaiki ke bentuk NYATA; gerbang
sumber menuntut `useFirmName()` dan menolak `useFirm().…firm`.

## Premis prompt yang saya CABUT
Prompt (dan catatan pembuatnya) menyatakan roll-forward NBV **sedang gagal** dan
"layar mengatakannya". **Salah.** Pada seed nyata (`AMS.TODAY = 2026-03-09`):
`residual = Rp 0`, `ties = TRUE`, `disposed = []` — layar menampilkan cabang *menutup*.
Sebabnya: satu-satunya pelepasan berstatus `Selesai` adalah `DSP-00 → AST-0512`,
pelepasan **menggantung** ke aset yang tak pernah ada. Tak ada aset yang benar-benar
dilepas. Akibat praktis: fixture gerbang "berkas menyatakan kegagalan" harus DIBANGUN
sendiri, tak bisa diambil dari seed.

## GOTCHA TERBESAR — roll-forward ini nyaris tautologis
Aljabar `data_fixedassets.rollForward` diturunkan dan dibuktikan uji:

> `residual = −Σ cost` atas aset yang tanggal perolehannya **SESUDAH** tanggal acuan.

Semua suku `accDep` saling meniadakan PERSIS (aset yang diperoleh di dalam jendela
punya `accDep(from) = 0` eksak — bukan sisa pembulatan). Artinya umur manfaat salah,
penyusutan salah, atau NBV pelepasan salah **TIDAK** akan memerahkannya: kedua sisi
memanggil `depreciate()` yang sama. Ia "dapat gagal" hanya lewat satu pintu.
Falsifiabilitas sungguhan modul ini ada pada selisih kontrol GL `1-400`.
Pola umum yang layak dicurigai di modul lain: **rekonsiliasi yang kedua sisinya
memanggil mesin yang sama = nol-delta aljabar dengan baju baru.** Bandingkan
[[asseris-firmfin-ledger-derived]] · [[asseris-wip-rollforward-falsifiable]].

## Angka hari ini (2026-08-22, seed `AMS.TODAY = 2026-03-09`)
- `opening 5.502.614.583 · capex 84.000.000 · depreciation 1.429.625.000 · disposalNbv 0`
- `computed = closing = 4.156.989.583` → **residual Rp 0**
- Selisih kontrol GL `1-400` = **Rp 1.943.010.417** (kontrol Rp 6,1 M literal di
  `data_part1.ts:639` vs Σ NBV register). **PRD §9 mencatat 3.374 jt — BASI** sejak
  dua register digabung (#258). Jangan mengutip angka PRD tanpa menghitung ulang.
- Kandidat pencatatan ganda: `FA-006`⟷`AST-1042` (30 hari, Rp 1.332.500.000) ·
  `FA-002`⟷`AST-1051` (28 hari, Rp 1.165.000.000).

## Yang dikerjakan
`migration/src/fixedassets_export.ts` — modul MURNI, pola `bank_recon_export.ts`
(#283). Menerima HASIL MESIN (`assetsAt`/`rollForward`/`duplicateCandidates`), tidak
memanggil mesin sendiri. Gerbang terkuatnya: **roll-forward PALSU** disuntikkan dan
angkanya wajib muncul apa adanya — kalau modul diam-diam menghitung ulang, uji merah.
Lembar baru: `Roll-Forward NBV` (5 komponen + 2 saldo akhir + total `residual`),
`Pelepasan` (SELALU ada, nihil pun — lembar hilang terbaca "tidak diekspor"),
`Kandidat Pencatatan Ganda` (hanya bila ada).
FA3 `<tr onClick>` → `<button class="asset-row-btn">` ber-`aria-expanded` (pola
`bud-line-btn` #287). FA4 literal nama firma → SSOT sesi (`useAuth().firm` — lihat
koreksi di atas), model MELEMPAR bila kosong.

## Gerbang tetangga yang MEMINTA diturunkan
`treasury_conventions.test.ts` punya blok "utang tetangga" yang MEMAKU jumlah
pelanggaran di `cashbank`+`fixedassets` (2 `<tr onClick>`, 1 `KAP Wijaya`). Ia MERAH
begitu salah satu dibereskan, dan komentarnya sendiri menyuruh **menurunkan angkanya**,
bukan melonggarkan gerbang. Saya turunkan 2→1 dan 1→0. Pola ini layak ditiru:
utang lintas-modul dipaku sebagai uji, bukan komentar TODO.

## Sisa utang yang saya LAPORKAN, tidak perbaiki
- `cashbank`: satu `<tr onClick>` · satu hex `'#fff'` (dipaku di
  `fixedassets_conventions.test.ts`). `treasury` sudah bersih sejak #287.

## FA2 — dibangun (Ari: "ikut rekomendasi anda")
`fixedassets_dup_decisions.ts` (murni) + `DupCandidatesPanel`.
Lingkup **firm** (`assetDupDecisions.v1`) · kewenangan **`FIRMFIN_EDIT` didaftarkan
EKSPLISIT** di `capForWrite` (satu peta, diimpor server) · **opsi B**: yang diputuskan
tetap tampil di balik penyaring. Verdict `duplikat` = **PENGUNGKAPAN**, bukan koreksi
(register tak berubah — itu PR-2), dan layar+berkas menyatakan itu. Keputusan atas
pasangan yang **tak lagi dihitung mesin DISIMPAN** & ditandai — karena itu catatannya
harus **MEMOTRET** pasangannya (nama/kelas/hari/nilai); tanpa potret ia tak dapat
ditampilkan dan lenyap saat satu tanggal perolehan dikoreksi. Pelaku/alasan/tanggal
WAJIB (melempar); stempel dari `AMS.TODAY`.

## Mesin penyusutan KEDUA (temuan sendiri, diperbaiki)
`DepreciationSchedule` menghitung `a.cost / a.life` (abai `residu`) + `curYear = 2026`.
Ia BERSELISIH dengan register: FA-001 (Juni 2021, 2.400 jt/8 th) → skedul 300 jt untuk
2021, register hanya 7 bulan = **175 jt**. `depreciationSchedule()` kini MEMBACA
`depreciate()` (acc tiap tahun = `accDep` pada 1 Jan tahun berikutnya). **Angka di layar
BERGESER — disengaja.** Pola yang layak dicari di modul lain: panel drill-down yang
menghitung ulang ringkasan yang membukanya.

## GOTCHA operasional
- `npm run verify` MERAH dua kali di ~20 berkas uji backend **tanpa sebab dari kode**:
  klien Prisma di `node_modules` bersama terpanggang ke path skema worktree LAIN
  (sesi paralel me-`generate` DI TENGAH verify). Obatnya `prisma generate` dari
  worktree sendiri, lalu ulang. Gejala khas: `table main.StateDoc does not exist`,
  lalu setelah generate berubah jadi `version-mismatch` / `expected 2 to be 1`.
  Sama dengan [[asseris-prisma-client-worktree-trap]] · [[asseris-cashbank-kurs-masa-berlaku]].
- **Heredoc `<<'EOF'` lewat tool Bash GAGAL** untuk berkas TS besar
  ("unexpected EOF while looking for matching `'`") — pakai tool Write.
- `npm run verify` **FAILED: frontend lint** dengan eslint sendiri **exit 0** dan nol
  error dicetak — pesannya cuma "There are suppressions left that do not occur
  anymore". Terjadi bila hitungan `:any` **TURUN**. Obat: `npm run lint:any-baseline`.
- Mock `useAmsPersist` yang menulis ke objek modul TANPA `React.useState` **tidak
  memicu render**, jadi uji "keputusan tampil di layar" merah padahal kodenya benar.
