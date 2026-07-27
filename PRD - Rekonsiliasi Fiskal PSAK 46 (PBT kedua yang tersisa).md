# PRD — Rekonsiliasi Fiskal PSAK 46 · PBT kedua yang tersisa

Status: **menunggu keputusan basis + "Proceed."** · Basis: master `4f98fdb`

## Problem

PR-A menurunkan jumlah PBT dalam sistem dari empat menjadi dua. Yang tersisa adalah `FISCAL.pbt` (`canon_base.ts:240`):

```
FISCAL = { pbt: 48 500, pkp: 53 500, permAdd: 1 200, permLess: 3 000, fiscalTempMovement: 6 800 }
```

Identitas rekonsiliasinya **benar secara aritmetika**: 48.500 + 1.200 − 3.000 + 6.800 = 53.500 ✓. Itulah sebabnya PR-A sengaja tidak menyentuhnya — mengganti `pbt` tanpa menghitung ulang `pkp` akan memecahkan PSAK 46.

Tetapi titik berangkatnya membantah buku besar. PBT turunan WTB adalah **29.690** (unadjusted) / **25.750** (dilaporkan, setelah AJE terposting) / **22.780** (bila seluruh usulan diposting). Tidak satu pun 48.500.

Konsekuensinya bukan kosmetik. `pkp` menggerakkan pajak kini, dan pajak kini menggerakkan beban pajak di laporan laba rugi — yang oleh modul AJE sudah ditampilkan sebagai 22% dari PBT turunan WTB (`Beban Pajak (22%) (5.665)` atas PBT dilaporkan 25.750). **Satu entitas melaporkan dua beban pajak**: 22% × 53.500 = 11.770 lewat jalur PSAK 46, dan 5.665 lewat jalur WTB.

## Temuan metodologi yang lebih penting daripada angkanya

Rekonsiliasi fiskal berangkat dari **laba komersial menurut laporan keuangan auditan** — bukan dari laba sebelum audit. Karena AJE menggeser PBT, rekonsiliasi fiskal secara inheren berada **di hilir finalisasi AJE**.

Sistem saat ini memperlakukannya sebagai konstanta independen, sehingga PSAK 46 dapat "selesai" sementara jurnal penyesuaian masih berstatus usulan. Itu urutan yang terbalik, dan ia menjelaskan mengapa angkanya bisa melenceng sejauh ini tanpa ada yang menyadari: tak ada satu pun jalur yang memaksanya melihat WTB.

## Objective

Satu PBT untuk satu entitas. Rekonsiliasi fiskal berangkat dari PBT auditan yang sama dengan yang dipakai seluruh modul lain, dan `pkp` menjadi **hasil hitung**, bukan konstanta yang ditala agar identitasnya tampak seimbang.

## KEPUTUSAN YANG SAYA MINTA — basis PBT untuk rekonsiliasi fiskal

**Opsi 1 — PBT dilaporkan (25.750; unadjusted + AJE terposting). REKOMENDASI.**
Ini laba komersial menurut LK yang akan diterbitkan pada titik waktu berjalan. `pkp` = 25.750 + 1.200 − 3.000 + 6.800 = **30.750**; pajak kini 22% × 30.750 = **6.765**. Selaras dengan `Beban Pajak` yang sudah ditampilkan modul AJE.

**Opsi 2 — PBT setelah seluruh usulan diposting (22.780).**
Mengasumsikan seluruh AJE usulan akan disetujui. Menghasilkan angka fiskal final lebih awal, tetapi **mengandaikan keputusan partner yang belum diambil** — masalah sirkularitas yang sama yang membuat Q2 PR-A menolak basis `adj`.

**Opsi 3 — pertahankan konstanta, tandai sebagai data SPT tahun lalu.**
Jujur secara pelabelan dan nol risiko regresi, tetapi membiarkan dua beban pajak hidup berdampingan. Saya tidak merekomendasikannya.

Beda permanen (`permAdd`/`permLess`) dan movement beda temporer **tetap sebagai input** dari kertas kerja fiskal — keduanya memang tidak ada sebagai saldo di buku besar komersial, dan komentar di `canon_base.ts:231` sudah menyatakan itu dengan benar.

## Scope

- `FISCAL.pbt` menjadi turunan `entityFigures(wtb, basis)` alih-alih konstanta; `pkp` dihitung dari identitas rekonsiliasi, bukan disimpan.
- Konsumen PSAK 46 (`deferredTax`, `canon_part1`) membaca nilai terhitung.
- Panel PSAK 46 menampilkan jembatan PBT → PKP secara eksplisit, sehingga selisihnya dapat ditelusuri auditor.
- Gerbang urutan: tandai rekonsiliasi fiskal sebagai belum final selama masih ada AJE berstatus usulan.

## Non-Scope

- Mengubah tarif, beda permanen, atau movement beda temporer.
- Pajak tangguhan OCI (`ociRemeasure`) — terpisah dan tidak bergantung PBT.

## Risks

- **Snapshot regresi kanon WAJIB diperbarui** (`canon_regression.test.ts.snap`) — menyentuh `AMS_CANON` selalu menggesernya. Uji yang memakai nilai lama sebagai oracle harus diperiksa satu per satu, bukan di-`--update` massal: itu persis cara sebuah nilai karangan bertahan lima kali evaluasi.
- Pajak kini turun ±43% (11.770 → 6.765). Setiap modul yang menarasikan beban pajak berubah; naskah demo perlu dibaca ulang.
- Bila ada uji yang memaku `pkp: 53500`, uji itu memaku angka karangan dan harus diganti, bukan dipertahankan.

## Success Criteria

1. Nol konstanta PBT tersisa di `canon_base`; `grep` untuk `48500` tak menghasilkan apa pun di jalur perhitungan.
2. Beban pajak yang ditampilkan modul PSAK 46 dan modul AJE **berangka sama**.
3. Jembatan PBT → PKP tampil di layar dan tie.
4. `typecheck` 0 · `lint` 0 · seluruh test hijau dengan snapshot yang diperiksa manual.

## Open Questions

1. Basis PBT — Opsi 1, 2, atau 3. **Memblokir.**
2. Apakah `fiscalTempMovement` seharusnya ikut bergerak ketika AJE menyentuh pos yang punya beda temporer (mis. penyusutan AJE-05)? Bila ya, ia bukan lagi input murni. Saya menduga ya, tetapi ini pertanyaan untuk spesialis pajak — yaitu Anda.
