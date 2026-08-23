# Usulan B6 — sisa kontradiksi C-058: jembatan piutang 492 jt & `WIP_ENG.billed` 2.260 jt

> Status: **USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-23 sesudah menutup cacat nilai faktur C-058 (lihat "Yang sudah
> dikerjakan"). Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk
> registri status §7).

## Yang SUDAH dikerjakan (tidak menunggu keputusan)

`INV-2026-012` menagih Rp 1.650 jt berlabel `Final (100%)` kepada C-058 yang fee
kontraknya Rp 580 jt. Angka itu **persis** `ENGAGEMENTS['ENG-2025-058'].materiality` —
tersalin dari kolom sebelah, kelas cacat yang sudah dicabut sekali di modul Pendapatan
(#277: `contract = e.materiality * 0.4`).

Buktinya internal dan tidak perlu data dari luar: **enam dari tujuh** faktur seed
memenuhi `amount === fee × persentase termin` **persis**; hanya baris ini yang membantah
label terminnya sendiri (284,5% di bawah label `100%`). `amount`/`paid` dikoreksi ke
Rp 580 jt dan invariannya dipasang sebagai gerbang
([`invoices_seed_consistency.test.ts`](../migration/src/invoices_seed_consistency.test.ts)),
lengkap dengan uji anti-tautologi yang memaku nilai historisnya.

Efek hilir yang ikut hilang: `recognitionSchedule` melaporkan liabilitas kontrak
Rp 1.070 jt atas perikatan yang 100% selesai — dan karena baris lain punya lubang data,
itu **seluruh** liabilitas kontrak yang dilaporkan firma. Kini nol.
Aging piutang & kontrol GL 1-200 tidak bergerak (faktur ini lunas penuh, `amount − paid`
tetap nol; `residual` 0, `reconciles` true sebelum dan sesudah).

## Keadaan yang terverifikasi — dan yang masih membantah dirinya

| perikatan | fee | Σ faktur | AR_BRIDGE | faktur+jembatan | % fee | `WIP_ENG.billed` |
|---|---:|---:|---:|---:|---:|---:|
| ENG-2025-014 | 1.850 | 1.480 | 370 | **1.850** | **100,0%** | 1.200 |
| ENG-2025-040 | 2.340 | 1.170 | 207 | 1.377 | 58,8% | 0 |
| ENG-2025-031 | 1.120 | 560 | 126 | 686 | 61,3% | 600 |
| ENG-2025-063 | 1.640 | 820 | 550 | 1.370 | 83,5% | 1.700 |
| ENG-2025-022 | 720 | 360 | 0 | 360 | 50,0% | 0 |
| **ENG-2025-058** | **580** | **580** | **492** | **1.072** | **184,8%** | **2.260** |
| ENG-2025-047 | 410 | 0 | 0 | 0 | 0,0% | 0 |

(dalam juta rupiah)

## R1 — `ARB-TRM-058`: termin 492 jt atas perikatan yang sudah ditagih penuh

```
{ id: 'ARB-TRM-058', kind: 'Termin', ref: 'ENG-2025-058',
  desc: 'Termin 2 — disetujui, faktur dalam proses', amount: 492_000_000 }
```

`ENG-2025-058` berstatus `Completed`, fase `Arsip`, progres 100%, dan faktur finalnya
sudah terbit **dan lunas**. Firma tetap mengklaim piutang 492 jt lagi atas klien yang
fee kontraknya sudah tertagih seluruhnya: 580 + 492 = **1.072 jt = 184,8% dari fee**.

Perhatikan baris ENG-2025-014 di tabel: faktur + jembatan mendarat **persis 100,0%**
dari fee. Invarian "penagihan terbit + termin belum difakturkan ≤ fee kontrak" tampak
memang disengaja, dan hanya C-058 yang melanggarnya.

**Mengapa ini TIDAK saya perbaiki sepihak.** `AR_BRIDGE` bukan register naratif — ia
komponen jembatan yang DIENUMERASI menuju kontrol GL 1-200:

```
residual = control − (open + bridgeTotal)     // data_firmfin.ts, arAging()
         = 4.440 − (2.695 + 1.745) = 0        // hari ini: reconciles = true
```

Mencabut atau memperkecil `ARB-TRM-058` memecah tie-out itu sebesar nilai yang dicabut,
kecuali saldo `1-200` di `FIRM_COA` — dan pasangannya di neraca saldo & neraca —
bergerak bersamanya. Itu perubahan seed **buku besar**, bukan perbaikan register, dan
angka penggantinya tidak dapat diturunkan dari data yang ada. Menambalnya = mengarang.

**Opsi:**

- **A — jembatan dikoreksi, GL mengikuti.** `ARB-TRM-058` dicabut (atau dipindah ke
  perikatan yang memang punya sisa kontrak), `FIRM_COA` `1-200` turun 492 jt, dan
  penyeimbangnya ditetapkan (kas? pendapatan? saldo laba?). Paling benar, paling luas;
  butuh keputusan Anda soal akun penyeimbang.
- **B — fee C-058 yang dinaikkan.** Ditolak oleh data: pada 980 jam anggaran, fee 1.072 jt
  berarti Rp 1.094 rb/jam untuk klien Tier 2 **risiko terendah** — di atas C-040
  (Tier 1, High, Rp 1.064 rb/jam). Dicatat hanya agar penolakannya terekam.
- **C — dibiarkan, dinyatakan.** Baris jembatan diberi keterangan bahwa ia melampaui
  fee kontrak dan menunggu keputusan. Tidak memperbaiki angka, tetapi berhenti diam.

Rekomendasi saya: **A**, dengan penyeimbang kas (perikatan sudah lunas ⇒ tak ada piutang
tersisa yang sah). Tetapi akun penyeimbang adalah keputusan Anda, bukan saya.

## R2 — `WIP_ENG.billed` 2.260 jt: bukan cacat C-058, melainkan basis seed

`WIP_ENG['ENG-2025-058'].billed` = 2.260 jt, kini 3,9× fee dan 3,9× register faktur.
Godaannya adalah menariknya ke 580 jt bersama faktur — **jangan**. Lihat kolom terakhir
tabel: `WIP_ENG.billed` tidak cocok dengan register faktur untuk **satu pun** perikatan
(…-014: 1.200 vs 1.480; …-040: 0 vs 1.170; …-063: 1.700 vs 820). Ia berada pada basis
lain sama sekali, dan sudah tercatat begitu — jam tersirat `std ÷ STD_RATE` melebihi
anggaran jam pada 5 dari 7 baris, dan rasio `cost/std` seed 0,591–0,644 tak sepakat
dengan konstanta FIRMFIN 0,700 maupun roster nyata 0,501.

Menyentuh satu baris saja akan menghasilkan register yang setengah konsisten — lebih
sulit dinyatakan salah daripada yang sekarang. Ini menunggu **keputusan basis seed
`WIP_ENG` secara keseluruhan** (butuh masukan Anda), bukan tambalan per baris.

## Yang saya minta

1. R1 — pilih A, B, atau C. Bila A: akun penyeimbang untuk penurunan `1-200` 492 jt.
2. R2 — konfirmasi bahwa basis `WIP_ENG` tetap ditunda (dan tidak ditambal per baris).
