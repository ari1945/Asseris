# Usulan R3 — pengukuran kemajuan PSAK 72: apa yang boleh menggerakkan pendapatan firma?

> Status: **USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-22 menjawab V3 pada prompt perbaikan modul `revenue`
> (Pendapatan & Penagihan, [`view_firmrevenue.tsx`](../migration/src/view_firmrevenue.tsx)).
> Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk registri status §7).
> V1 · V2 · V4 · V5 dari prompt yang sama sudah dikerjakan dan **tidak** menunggu
> keputusan ini; V6 dilaporkan di [`usulan-R6-ekspor-dan-gerbang-akses-pendapatan.md`](usulan-R6-ekspor-dan-gerbang-akses-pendapatan.md).

## Yang sudah dikerjakan lebih dulu (agar keputusan ini tak dipaksa)

Kolom lama memasang klasifikasi PSAK 72 — `'Over-time (input)'` untuk perikatan
ber-`type` mengandung "Audit", `'Point-in-time'` untuk sisanya — sementara **setiap
baris tanpa kecuali** dihitung `nilai kontrak × progress/100`. Label dan aritmetikanya
saling membantah: dua perikatan yang dilabeli *Point-in-time* (`ENG-2025-047`
Agreed-Upon Procedures, `ENG-2025-022` Review SPR 2400) tetap mengakui persentase dari
nilai kontraknya, padahal *point-in-time* berarti nol sampai kewajiban pelaksanaan
selesai, lalu penuh.

Kolom itu kini menyebut **pengukuran yang benar-benar dipakai** ("Over-time · %
penyelesaian dilaporkan") dan **menandai** baris yang klasifikasinya belum ditetapkan,
alih-alih mengarang klasifikasi. Itu mencabut pernyataan yang salah tanpa memutuskan
kebijakan akuntansinya — keputusan itulah isi dokumen ini.

## Cacat yang terverifikasi

`progress` adalah kolom **status** pada baris perikatan
([`data_part1.ts`](../migration/src/data_part1.ts)) — persentase yang *dilaporkan*
manajer perikatan. Ia bukan masukan yang dikeluarkan (jam), bukan pula keluaran yang
diserahkan. PSAK 72 ¶B14–B19 hanya mengenal dua keluarga ukuran kemajuan: **metode
keluaran** (survei kinerja, milestone tercapai, unit diserahkan) dan **metode masukan**
(jam, biaya, sumber daya yang dikonsumsi). Persentase yang dilaporkan tanpa dasar
terdokumentasi bukan salah satu pun dari keduanya — ia bisa dibenarkan sebagai *survei
kinerja* (metode keluaran) **hanya bila** ada surveinya.

Baris data yang sama sudah membawa `actualHrs` dan `budgetHrs`, dan **keduanya tak
dipakai sama sekali** dalam pengakuan pendapatan. Ia hanya ditampilkan sebagai KPI di
panel drill.

## Berapa besar bedanya (data seed hari ini)

| Perikatan | fee (Rp jt) | % dilaporkan | jam akt/angg | % masukan | diakui SEKARANG (Rp jt) | diakui METODE MASUKAN (Rp jt) | selisih |
|---|---:|---:|---:|---:|---:|---:|---:|
| ENG-2025-014 | 1.850 | 62% | 1146/1840 | 62,3% | 1.147,0 | 1.152,2 | +5,2 |
| ENG-2025-040 | 2.340 | 28% | 615/2200 | 28,0% | 655,2 | 654,1 | −1,1 |
| ENG-2025-031 | 1.120 | 54% | 812/1480 | 54,9% | 604,8 | 614,5 | +9,7 |
| ENG-2025-063 | 1.640 | 88% | 1588/1660 | **95,7%** | 1.443,2 | 1.568,9 | **+125,7** |
| ENG-2025-022 | 720 | 45% | 290/640 | 45,3% | 324,0 | 326,2 | +2,2 |
| ENG-2025-058 | 580 | 100% | 945/980 | **96,4%** | 580,0 | 559,3 | **−20,7** |
| ENG-2025-047 | 410 | 15% | 48/420 | **11,4%** | 61,5 | 46,9 | **−14,6** |
| **TOTAL** | | | | | **4.815,7** | **4.922,1** | **+106,4** |

Lima dari tujuh baris sepakat dalam ±1 poin persen — artinya `progress` **memang**
sebagian besar diturunkan dari jam, hanya tak pernah dinyatakan begitu. Yang tidak
sepakat justru yang paling informatif:

- **ENG-2025-063 (Finalisasi, +125,7 jt).** Jam sudah 95,7% dari anggaran sementara
  status dilaporkan 88%. Persis pola perikatan yang **melewati anggaran**: jam terbakar
  lebih cepat daripada kemajuan. Metode masukan naif akan mengakui pendapatan atas
  ketidakefisienan — hal yang PSAK 72 ¶B19 justru larang (masukan yang tak berkontribusi
  pada pemenuhan kewajiban pelaksanaan wajib **dikeluarkan** dari ukuran).
- **ENG-2025-058 (`Completed`, −20,7 jt).** Perikatan selesai, arsip, opini terbit —
  jam berhenti di 96,4% anggaran. Metode masukan naif akan menahan 3,6% pendapatan
  atas perikatan yang kewajibannya sudah **tuntas**. Ini pembuktian bahwa rasio jam
  tak boleh dipakai mentah-mentah.
- **ENG-2025-047 (Perencanaan, −14,6 jt).** Jam baru 11,4% dari anggaran, status 15%.

## Opsi A — metode masukan berbasis jam, dengan pagar

Kemajuan = `jam aktual / jam anggaran`, dijepit ke 100%, dengan dua pagar:

1. **Perikatan berstatus selesai/arsip ⇒ 100%** tanpa memandang jam. Kewajiban
   pelaksanaan tuntas adalah fakta, bukan rasio.
2. **Jam yang tak berkontribusi dikeluarkan** (PSAK 72 ¶B19): kelebihan jam atas
   anggaran tidak menambah pendapatan; ia menjadi **beban** dan muncul sebagai margin
   yang turun — bukan pendapatan yang naik.

- **Keunggulan:** ukurannya dapat diaudit. Jam berasal dari timesheet
  (`TIME_ENTRIES` + roster `engagementWip`, [`data_firmfin.ts`](../migration/src/data_firmfin.ts)),
  punya jejak per orang per hari, dan sudah menjadi SSOT untuk WIP & profitabilitas.
  Pendapatan diakui berhenti bergantung pada satu angka yang diketik.
- **Keunggulan kedua:** satu ukuran kemajuan untuk WIP, profitabilitas, dan pengakuan
  pendapatan. Hari ini WIP memakai jam dan pendapatan memakai `progress` — dua ukuran
  kemajuan untuk satu perikatan.
- **Biaya:** **anggaran jam menjadi angka yang menggerakkan pendapatan.** Merevisi
  `budgetHrs` ke atas akan *menurunkan* pendapatan diakui seluruh perikatan itu
  seketika. Konsekuensinya: revisi anggaran butuh otorisasi (pola SoD yang sama dengan
  write-down WIP — lihat [`usulan-W1-wip-writedown-otorisasi.md`](usulan-W1-wip-writedown-otorisasi.md)),
  kalau tidak, gerbang otorisasi write-down bisa dilewati lewat pintu belakang anggaran.
- **Biaya kedua:** angka pendapatan firma **bergerak** pada saat deploy (+106,4 jt,
  +2,21% pada seed). Itu restatement — perlu dinyatakan, bukan diam-diam.

## Opsi B — metode keluaran (milestone yang diserahkan)

Kemajuan = bobot milestone yang **benar-benar diserahkan** (perencanaan selesai ·
fieldwork selesai · draft LK · opini terbit). Modul Delivery & Milestones (arc #264)
sudah menyimpan komitmen milestone yang tak bisa dihapus.

- **Keunggulan:** paling dekat dengan cara jasa audit sungguh-sungguh dijual — klien
  membeli opini, bukan jam. Bukti pemenuhannya adalah artefak (WP ter-sign-off, laporan
  terbit), bukan input.
- **Keunggulan kedua:** kebal terhadap ketidakefisienan. Perikatan yang melewati
  anggaran tak mengakui pendapatan sedikit pun lebih banyak.
- **Biaya:** butuh **bobot** per milestone, dan bobot itu adalah pertimbangan yang harus
  dibuat sekali dan dipertahankan. Tanpa bobot yang disepakati, ia hanya memindahkan
  angka-yang-diketik dari `progress` ke tabel bobot.
- **Biaya kedua:** pengakuan menjadi **melompat**, bukan mulus. Secara akuntansi itu
  benar; bagi manajemen ia terasa seperti pendapatan yang tersendat antar-milestone.

## Opsi C — status quo, dinyatakan apa adanya (yang berlaku sekarang)

Tetap `progress`, tetapi layar **menyebut** bahwa ia persentase yang dilaporkan dan
bukan hasil pengukuran. Ini yang sudah dikerjakan sebagai akibat V4.

- **Keunggulan:** nol pergerakan angka, nol restatement, nol kebijakan baru.
- **Biaya:** pendapatan firma tetap digerakkan oleh satu bilangan yang diketik tanpa
  dasar terdokumentasi. Untuk sebuah **demo** itu cukup jujur; untuk firma yang benar
  memakainya, pengakuan pendapatan tanpa ukuran kemajuan yang dapat diaudit adalah
  temuan pengendalian — pada kertas kerja firma sendiri.

## Rekomendasi

**Opsi A dengan kedua pagarnya**, sebagai default; **Opsi B** untuk perikatan yang
harganya memang fixed-fee-per-milestone bila/ketika modul Delivery menyediakan bobot.
Alasannya bukan kemurnian PSAK melainkan auditabilitas: A adalah satu-satunya opsi yang
ukurannya sudah punya jejak (timesheet), dan pagar ke-1 menutup satu-satunya kasus di
mana A jelas salah (perikatan tuntas di bawah anggaran). Yang **tidak** saya sarankan
adalah A tanpa pagar — data seed sudah memuat dua baris yang membuktikannya salah.

## Pertanyaan terbuka untuk Ari

1. **Sumber kemajuan:** A (jam berpagar) · B (milestone berbobot) · C (status quo)?
2. Bila A: apakah revisi `budgetHrs` masuk rantai otorisasi yang sama dengan write-down
   WIP, atau kewenangan manajer perikatan sendiri?
3. Bila A atau B: pergerakan +106,4 jt pada saat deploy — dinyatakan sebagai koreksi
   metode di layar dan di ekspor, atau cukup di catatan rilis?
4. Perikatan non-audit (AUP, Review SPR 2400) — apakah kewajiban pelaksanaannya
   diselesaikan *over-time* juga, atau *point-in-time* saat laporan diserahkan? Jawaban
   inilah yang mencabut tanda "klasifikasi terbuka" pada kedua baris itu.
