---
name: asseris-seed-c058-faktur-materialitas
description: "Seed C-058: faktur menagih MATERIALITAS bukan fee — invarian label termin yang membuat register membantah dirinya sendiri, dan dua sisa kontradiksi yang sengaja tak disentuh"
metadata:
  type: project
---

Arc 2026-08-23, **PR #295** (`aa7e7f0`, cabang `fix/seed-c058-faktur` di worktree
`sa230-arsip`) — **MENDARAT `6e82d42`** (squash; CI PR 9/9, master hijau keempat workflow). Cabang lokal & remote dihapus, worktree dikembalikan ke parkir detached. Menutup butir yang
sejak #268 tercatat "TERBUKA" di komentar `ENG_FEE_REALIZATION`.

## Cara membuktikan angka seed mana yang benar TANPA data dari luar

Pertanyaannya "fee 580 jt, faktur 1.650 jt, `WIP_ENG.billed` 2.260 jt — mana yang
benar?". Jawabannya ada di **label yang datanya bawa sendiri**: `milestone`
berbunyi `Termin 1 (50%)`, `Final (100%)`, dst. Jadi:

```
amount === round(fee × persentase-di-label)
```

**ENAM dari tujuh** faktur seed memenuhinya PERSIS. Hanya `INV-2026-012` yang
tidak (284,5% di bawah label `100%`). Itu bukan "angka yang terasa besar", itu
register yang membantah dirinya sendiri — oracle yang tak perlu saya karang.

Mekanismenya lalu ketahuan: **1.650.000.000 = PERSIS
`ENGAGEMENTS['ENG-2025-058'].materiality`**. Salin-tempel dari kolom sebelah.
Repo sudah pernah mencabut kelas cacat ini (#277: `contract = e.materiality*0.4`)
— lihat [[asseris-revenue-psak72-kontrak-pengukuran]]. **Materialitas bukan
proksi nilai kontrak; kalau sebuah angka uang sama persis dengan materialitas,
curigai salin-tempel lebih dulu.**

Korroborasi kedua (fee/jam anggaran): enam lainnya 670–1.125 rb/jam; C-058 pada
580 jt = 592 rb/jam (wajar, Tier 2 risiko TERENDAH), pada 1.650 jt = 1.684 rb/jam
(1,5× yang tertinggi). Sejalan #274: **cari dulu apakah data sudah menyatakan
pembandingnya.**

## Yang paling mengejutkan: kerusakan hilirnya BUKAN di piutang

Dugaan wajar: ubah nilai faktur ⇒ piutang & kontrol GL 1-200 goyang. **Salah.**
`arAging` memakai `out = amount − paid` dan `if (out <= 0) return` — faktur ini
lunas penuh, jadi ia tak pernah ikut aging, sebelum maupun sesudah. `residual` 0
· `reconciles` true di kedua keadaan. **Diuji, bukan diasumsikan.**

Yang rusak justru **PSAK 72**: `recognitionSchedule` menulis
`liab = max(0, billed − recognized)`; billed 1.650 vs recognized 580 ⇒ liabilitas
kontrak **1.070 jt atas perikatan 100% selesai**. Dan karena baris lain punya
lubang data (`diakui = null`), itu **seluruh** `totLiab` firma. Kini nol.
Yang bergerak juga: register `billed` 5.680→4.610, `collected` 2.985→1.915,
tingkat penagihan 52,6%→41,5%.

**ATURAN: sebelum mengubah satu angka seed, JALANKAN mesin hilirnya dan cetak
keadaannya (probe vitest sekali pakai). Tebakan soal siapa yang terguncang
meleset.** Probe-nya: bikin `__tmp_probe.test.ts` yang `console.log` keluaran
mesin, jalankan, hapus. Murah dan menghapus seluruh spekulasi.
(Gotcha kecil: `recognitionSchedule` menerima `hoursOf` sebagai **fungsi**
`(id)=>number|null`, bukan Record.)

## Dua sisa kontradiksi yang SENGAJA tak disentuh

- **`ARB-TRM-058` = 492 jt** "Termin 2 — faktur dalam proses" atas perikatan yang
  sudah `Completed` + faktur final lunas ⇒ 580+492 = **184,8% dari fee**.
  Bandingkan ENG-2025-014: faktur+jembatan mendarat **persis 100,0%** — jadi
  invariannya memang disengaja dan hanya C-058 melanggar. **Tapi `AR_BRIDGE`
  adalah komponen tie-out ke kontrol GL 1-200** (`residual = control − (open +
  bridgeTotal)` = 0). Mencabutnya memecah rekonsiliasi 492 jt kecuali `FIRM_COA`
  `1-200` ikut turun — dan akun penyeimbangnya tak dapat diturunkan dari data.
- **`WIP_ENG.billed` 2.260 jt** — jangan tarik ke 580. Ia **tak cocok dengan
  register faktur untuk SATU PUN perikatan** (…-014 1.200 vs 1.480; …-063 1.700
  vs 820). Basis lain sama sekali; soal seed `WIP_ENG` menyeluruh
  ([[asseris-profit-isolasi-realisasi]]), bukan cacat C-058. Menyentuh satu baris
  = register setengah konsisten, lebih sulit dinyatakan salah.

Keduanya diajukan dengan opsi di `docs/usulan-B6-sisa-kontradiksi-c058.md`.

## Mekanis

- Direktori kerja UTAMA (`fix/timebudget-engagement-isolation`) tertinggal jauh;
  kerja dilakukan di worktree `sa230-arsip` yang diparkir bersih — `git checkout
  -b <br> origin/master` di sana, node_modules sudah ada, nol bootstrap.
- `data_part1.ts` **CRLF murni**: tulis lewat Python dengan
  `assert s.count(old)==1` (gotcha lama [[asseris-profit-isolasi-realisasi]]).
- Server TIDAK dijalankan: `server/` nol pembaca `INVOICES` (grep), dan
  `prisma generate` di worktree akan mengarahkan ulang klien Prisma bersama
  ([[asseris-prisma-client-worktree-trap]]).
- Gerbang bundle namanya `check:bundle`, bukan `budget-bundle`.
