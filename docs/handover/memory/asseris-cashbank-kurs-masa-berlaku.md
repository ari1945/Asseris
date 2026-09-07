---
name: asseris-cashbank-kurs-masa-berlaku
description: Arc cashbank 2026-08-22 — kurs jadi RegRefSet bermasa berlaku; kertas kerja rekonsiliasi bisa diekspor; pelaku jejak dari sesi. Plus gotcha junction/log/Prisma lintas-sesi.
metadata: 
  node_type: memory
  type: project
  originSessionId: c2237051-e2ab-49be-999c-144cfdf03cbf
  modified: 2026-08-22T11:15:31.647Z
---

**MENDARAT** sebagai `8cdc51c` (PR #283, squash, 2026-08-22; CI 9/9). Cabang & worktree sudah dibuang
(direktori `.claude/worktrees/cashbank-fx` tersisa sebagai orphan karena file lock — registrasi git sudah dipangkas). Spesifikasi: `docs/prompts-perbaikan/32-cashbank.md`.

## Keputusan desain yang tidak sepele

- **SATU set membawa DUA tabel kurs** (`book` + `closing`) untuk satu periode pelaporan,
  bukan dua registry terpisah. Alasannya: revaluasi PSAK 10 = saldo × (closing − book);
  dua registry membuat pasangan tak sepadan (closing April × book Februari) MUNGKIN dan
  tetap menghasilkan angka. Satu set = pasangan salah jadi mustahil dirumuskan.
- **Dua sumber tanggal yang berbeda, dan itu memang benar:**
  · revaluasi → **klok SSOT `AMS.TODAY`** (ia pernyataan "hari ini"), MEMBLOKIR bila tak tercakup;
  · rekonsiliasi & Total Kas → **`BANK_RECONS[].periodEnd`** (kertas kerja punya periodenya sendiri).
  Kalau rekonsiliasi ikut klok, kertas kerja Maret yang sudah menutup akan "membuka" sendiri
  berbulan-bulan kemudian tanpa satu transaksi pun. Ini pilihan yang menentukan seluruh bentuk arc.
- `fx[ccy] || 1` adalah **karangan paling sulit terlihat**: mata uang tak dikenal dinilai 1:1
  terhadap rupiah dan tetap menghasilkan angka yang tampak sah. Diganti NaN → `reconciled:false`
  → baris Kas `open` → ekspor LK terkunci, dengan `fxNote` yang menyebut sebabnya.
- `AMS.FX_RATES`/`AMS.FX_BOOK` **DIHAPUS** dari AMS (hanya 2 konsumen nyata: `data_firmfin`,
  `view_firmtreasury`). Gerbang sumber menolak peta `USD:<angka>` di berkas mana pun selain
  `canon_fx.ts` — komentar dibuang dulu agar tidak berisik.

## CB2 — oracle yang benar bukan kesamaan

"Buktikan Total Kas menutup ke akun kontrolnya" TIDAK berarti `totalIDR == control`.
Angkanya: 8.577.538.000 (Σ bank) vs 8.480.638.000 (Σ GL 1-101…1-106); selisih **96,9 jt**
= persis Σ item rekonsiliasi (72,15 + 23,15 + 1,60), residual 0. Uji kesamaan mentah akan
MERAH untuk alasan yang sah — dan "temuan" itu palsu. **Lahir hijau, dan dikatakan apa adanya.**

## Premis prompt yang saya cabut

Prompt menyuruh `useCurrentAuditor()` untuk CB4. Hook itu sendiri berbunyi
`auth.user.name || AMS.USER.name` (contexts.tsx ~282) — memakainya hanya memindahkan
fallback seed satu lapis ke dalam. Dipakai `auth.user.name` LANGSUNG; ada gerbang yang
memaku premis ini supaya tak hilang (`cash_bank_conventions.test.ts`). Lihat juga
[[asseris-apar-subbuku-hidup]].

## GOTCHA lintas-sesi (mahal, terulang)

1. **`cmd //c "mklink /J … D:\path"` lewat Git Bash membuat target `D:\D:\path`** — MSYS
   menambahkan backslash di depan, cmd menempelkan drive. Junction "berhasil dibuat" tapi
   MATI; gejalanya `Cannot find module …/server/node_modules/typescript/bin/tsc`. `ln -s`
   gagal "Operation not permitted". **Pakai PowerShell `New-Item -ItemType Junction`.**
2. **`/tmp/verify-*.log` BERTABRAKAN antar sesi paralel.** Log yang saya baca ditimpa
   sesi lain di tengah jalan — saya sempat membaca hasil run ORANG LAIN (62 berkas/908 uji)
   sebagai hasil saya. Tulis log ke direktori scratchpad sesi.
3. **Klien Prisma dipanggang ke direktori skema SIAPA PUN yang terakhir `generate`.**
   `server/node_modules/.prisma/client/index.js` memuat path skemanya; `DATABASE_URL`
   uji = `file:./test.db` RELATIF terhadap path itu, jadi globalSetup mendorong skema ke
   `test.db` worktree-mu sementara klien membaca `test.db` worktree lain → **34 dari 431
   uji backend merah** dengan pesan menyesatkan `version-mismatch:server=0` (bukan P2002
   kali ini — murni salah berkas DB). Gerbang `ensure-prisma-client` melaporkan **OK**
   karena ia hanya mencocokkan PROVIDER, bukan PATH. Obatnya `npx prisma generate` dari
   worktree-mu; kembalikan ke pohon utama setelah selesai. Lihat
   [[asseris-prisma-client-worktree-trap]].

## Yang ikut berubah & wajib diperbarui saat menambah registry regref

`regref_catalog.test.ts` memuat **sensus**: daftar `unverified` hari ini dan daftar yang
`blocked` pada 2027-01-01. Menambah set apa pun MENGUBAH kedua daftar itu — memperbaruinya
bukan melemahkan gerbang. `REGREF_EXPECTED_IDS` juga wajib bertambah, dan `SC-9` menuntut
`export const X: RegRefSet<…>[]` disebut namanya di `regref_catalog.ts`.

## Tinjauan visual tanpa peramban

Aplikasi dev menuntut login, jadi peramban in-app tak dipakai. Ganti: `cash_bank_render.test.ts`
(jsdom, pola `timebudget_econ_render.test.ts`) memaku DUA keadaan layar — "terhitung"
(`Rp 8,58 M` · `+Rp 61 jt`) dan "tak tercakup" (`—`, panel "Revaluasi dihentikan", dan
BUKTI bahwa `+Rp 61 jt` tak lagi tergambar). Lebih tahan lama daripada tangkapan layar.
