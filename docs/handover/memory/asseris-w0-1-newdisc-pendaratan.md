---
name: asseris-w0-1-newdisc-pendaratan
description: W0-1 newdisc mendarat (#321 a6f4f74) — dan gerbang ensure-prisma-client yang mencetak OK di atas klien terpanggang worktree lain
metadata:
  type: project
---

**W0-1 SELESAI 2026-08-27.** `fix/newdisc-pilar-dua-turunan` mendarat lewat **PR #321
`a6f4f74`**; cabang remote dihapus manual. Dibuktikan lewat **blob**, bukan `git log`:
`newdisc_derive.ts` = `40e809f` dan `view_newdisc.tsx` = `da5b4e4` identik di master
dan cabang; `grep P2_JURIS` atas `origin/master` → nol hasil.

W0-3 `hcm` (**#319 `abb36a7`**) mendarat di sela pemeriksaan-dan-merge saya, jadi #321
tersusun di atasnya. `origin/master` sesudahnya = `a6f4f74`.

## Yang paling mahal di sesi ini bukan kodenya — melainkan gerbang yang berbohong

`npm run verify` dari worktree gagal 19 uji backend dengan
`The table main.StateDoc does not exist`, padahal `db push` mencetak "Your database is
now in sync" dan **nol berkas `server/`** disentuh cabang. Sebabnya: `server/node_modules`
di-junction bersama, klien Prisma memanggang direktori skema, dan sesi W0-3 paralel
sudah memanggangnya ke worktree **mereka**. Rinciannya + resep isolasi:
[[asseris-prisma-client-worktree-trap]].

Yang layak diingat di luar Prisma — **dan ini sudah dikoreksi sekali**: dugaan pertama
saya adalah `tools/ensure-prisma-client.mjs` buta karena kuncinya hilang. SALAH. Grep
diagnostik SAYA yang buta (`"sourceFilePath":"` tanpa spasi sesudah titik dua). Gerbangnya
cocok sempurna. Cacat sesungguhnya: ia memeriksa SEKALI di langkah 1 dari 12, lalu sesi
paralel memanggang ulang klien bersama di tengah pipeline.

Pelajarannya justru lebih tajam karena koreksinya: **sebelum menuduh sebuah gerbang
buta, jalankan regex-nya atas berkas sungguhan.** Nol hasil dari grep tangan saya
bukan bukti gerbangnya diam — ia bisa berarti pola saya yang salah. Ditutup lewat PR
gerbang 2026-08-28; rinciannya di [[asseris-prisma-client-worktree-trap]].

## Isi yang didaratkan

`P2_JURIS`/`SF` literal → `newdisc_derive.ts` (murni, teruji). Inti cacatnya bukan
hardcode melainkan **SSOT kedua**: `GROUP_SUBS` mencatat Sentosa Trading Pte
pbt 4.880 / tax 830 → **ETR 17,0%**, di ATAS tarif minimum GloBE; literal modul menulis
10,5% untuk entitas yang sama, dan dari selisih itulah "eksposur top-up Rp 275 jt"
lahir — identik untuk setiap klien. Lihat [[asseris-newdisc-pilar2-reaktivitas-semu]].

Dilaporkan di PR §7, **tidak dikerjakan**: dua kesimpulan naratif tanpa masukan
perikatan yang masih hidup di `view_newdisc.tsx` (panel PSAK 46/212 "Grup menerapkan
pengecualian wajib"; tab Iklim "Tidak terdapat dampak penyesuai material") — kelas cacat
yang sama dengan angka yang baru dicabut, hanya berbentuk **prosa**, jadi tak satu pun
sensus angka akan menemukannya. Plus `<div onClick>` pada baris area iklim.

## Sisa W0

`W0-2 smm` WAJIB sebelum `W0-4 regref` — R1 mengubah `CPE_REQ` jadi multi-record dan
tiga view masih meminjam `CPE_REQ.year` sebagai tahun atestasi SOQM lewat
`attestKeyFor(…)` yang menerima `undefined` **tanpa gerbang memerah**.
Lihat [[asseris-w0-pendaratan-urutan]].
