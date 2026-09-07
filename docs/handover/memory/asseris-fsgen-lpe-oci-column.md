---
name: asseris-fsgen-lpe-oci-column
description: "LPE tanpa kolom PKL (kolom tak foot Rp 6.554 jt, penutup bertentangan dgn Neraca) — DITUTUP & MERGED, PR #178 squash b0f6de9"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0238eb7e-6c90-4477-bcec-3ab396beaf61
  modified: 2026-08-07T13:35:01.097Z
---

Ditemukan saat **verifikasi hidup #175** (bukan oleh 1128 uji, bukan oleh CI). Efek
samping langsung dari #175 yang tak ikut dirapikan.

## Cacatnya

`EquityStatement` di [view_fsgen.tsx:424](../migration/src/view_fsgen.tsx:424) hanya
punya TIGA kolom: `Modal Saham | Saldo Laba | Total Ekuitas`, dengan
`Total = modal + re`. Barisnya:

- `Penghasilan komprehensif lain — neto`¹³ menaruh `e.oci` (6.554 jt) di kolom **Saldo Laba**
- baris penutup memakai `re: e.endRE`

Sebelum #175 ini foot, karena `oci` adalah RESIDU DI DALAM saldo laba sehingga `endRE`
memuatnya. #175 memindahkan PKL ke akunnya sendiri (3-3100) → `endRE` **tidak lagi**
memuat PKL, tetapi LPE tak ikut diubah.

Akibatnya, pada seed dan pada KEDUA basis:

| | Dilaporkan | Bila semua usulan diterima |
|---|---|---|
| Jumlah baris kolom Saldo Laba | 103.427 | 100.457 |
| Saldo penutup yang ditampilkan | 96.873 | 93.903 |
| **Kolom tak foot sebesar** | **6.554** | **6.554** |
| Total ekuitas LPE | 156.873 | 153.903 |
| Total ekuitas NERACA | 163.427 | 160.457 |
| **LPE vs Neraca** | **6.554** | **6.554** |

Neraca sendiri BENAR (`bs.eq` punya baris `akumoci` 6.554 dan `totalEq` 163.427);
yang salah hanya penyajian LPE.

## Yang membuatnya berbahaya

Panel Validasi menyatakan **8/8 tie-out lolos** di atas laporan primer PSAK 1 yang
tak menjumlah dan bertentangan dengan neracanya sendiri — laporan yang bisa
di-Export PDF untuk diterbitkan. **Tak ada tie-out yang membandingkan saldo penutup
LPE terhadap total ekuitas Neraca**; itu lubang berbentuk-pemeriksaan, keluarga yang
sama dengan cacat yang #175 justru perbaiki (lihat [[asseris-wtb-integrity-falsifiable]]).

## Ditutup — [PR #178](https://github.com/ari1945/Asseris/pull/178) **MERGED** `b0f6de9`

Atas instruksi Ari ("perbaiki" → "merge"). CI 6/6 hijau di PR maupun di master. Isi:

1. Kolom `Penghasilan Komprehensif Lain` berdiri sendiri (PSAK 1 ¶106),
   `Total = modal + re + oci`.
2. **`FSGEN.equityRows`** jadi SATU sumber baris untuk layar DAN muatan ekspor —
   sebelumnya ditulis dua kali di `view_fsgen` (komponen + payload PDF/XLSX), dan
   duplikasi itulah yang memungkinkan dokumen terbitan menjumlah berbeda dari layar.
3. Tie-out ke-9 **`eqroll`**. Pembandingnya BUKAN `eqr.totalEqCY` vs `bs.totalEq.cy`
   (identitas — tie-out mustahil gagal, penyakit yang PR-H3 cabut) melainkan
   ROLLFORWARD vs SALDO AKHIR. Menyala bila ekuitas bergerak tanpa baris di LPE.

Terverifikasi hidup: penutup LPE 163.427 = Neraca (160.457 di basis
`ifAllProposed`), panel 9/9, `eqroll` merah saat ekuitas akhir digeser Rp 4.000 jt.
1137 uji · lint/typecheck/typecheck:test/build bersih.

**GOTCHA ratchet ESLint (kena dua kali dalam satu sesi):** menambah SATU anotasi
`any` baru — bahkan `(r: any, i: number)` di dalam `.map` — meng-un-suppress
SELURUH berkas (97 error di `view_fsgen.tsx`, lalu 31 di `fsgen_model.tsx`).
Solusinya menipekan (interface `FsEquityRow` / `FsEquityInput`), bukan menambah
suppression.
