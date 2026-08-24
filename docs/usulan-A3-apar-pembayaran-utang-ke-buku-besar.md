# Usulan A3 — pembayaran utang firma: menyentuh buku besar, atau tidak?

> Status: **USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-22 menjawab A3 (dan A6) di [`prompts-perbaikan/29-apar.md`](prompts-perbaikan/29-apar.md).
> Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk registri status §7).
> A1 · A2 · A4 · A5 dari prompt yang sama SUDAH dikerjakan. A1 adalah prasyarat usulan
> ini: sebelum A1, konsekuensi yang dibahas di bawah **tak dapat terlihat sama sekali**.

## Cacat yang terverifikasi

`payAp(id)` ([view_firmgl.tsx](../migration/src/view_firmgl.tsx), fungsi `FirmAPAR`)
menandai satu baris register `firmap` menjadi lunas dan mencatat aktivitas `AP_PAY`.
**Ia tidak memposting jurnal apa pun.**

Sejak Program E, buku besar firma diturunkan dari jurnal **terposting**
([firm_ledger.ts](../migration/src/firm_ledger.ts)), bukan dari saldo seed. Artinya:
ketika utang dibayar, kas dan utang **di buku besar tidak bergerak**. Yang bergerak
hanya sub-buku.

Sampai hari ini akibatnya tak terlihat, karena `FIRMFIN.ap(ctx)` membaca `AMS.FIRM_AP`
tanpa syarat — sub-buku yang dipakai rekonsiliasi **beku pada seed**. Setelah A1
(`apOf(ctx)`, dan `firmap` disalurkan dari kedua pemanggil), sub-buku itu hidup, dan
konsekuensinya menjadi terukur.

### Angkanya

Keadaan seed, baris rekonsiliasi `2-100` (Utang Usaha):

| | kontrol GL `2-100` | sub-buku (`firmap`) | jembatan (`AP_BRIDGE`) | residual | status |
|---|---:|---:|---:|---:|---|
| sekarang | 1.820 jt | 1.123 jt | 697 jt | **0** | `bridged` |
| setelah `AP-0042` (340 jt) dibayar | 1.820 jt | 783 jt | 697 jt | **+340 jt** | **`open`** |

Kontrol GL **tidak bergerak sedikit pun** — itu yang dibuktikan uji
`kontrol GL 2-100 TIDAK bergerak — sub-buku sendirian yang berubah`
([apar_register.test.ts](../migration/src/apar_register.test.ts)).

Dan karena gerbang Q-2 mengunci ekspor Neraca Saldo & Laporan Keuangan begitu ada baris
`open`, **satu pembayaran utang mengunci kertas kerja firma**. Itu bukan alasan untuk
membatalkan A1; merah yang jujur adalah hasil yang benar. Itu alasan untuk memutuskan
hal berikut.

## Pertanyaan yang harus diputuskan

Apakah pembayaran utang di modul `apar` semestinya **memposting jurnal** ke buku besar
firma (Dr `2-100` Utang Usaha / Cr `1-10x` Kas) — dan bila ya:

1. **Rekening kas mana?** `FIRM_COA` kini punya enam akun kas per rekening
   (`1-101`…`1-106`, PRD cash-bank-reconciliation-register). Tak ada satu pun kolom di
   `firmap` yang menyatakan dari rekening mana tagihan dibayar.
2. **Dengan wewenang siapa?** `CAP.FIRMFIN_EDIT` sudah menjadi syarat untuk menandai
   lunas. Memposting jurnal ke pembukuan firma adalah tindakan yang lebih besar —
   apakah syaratnya sama, atau perlu pemisahan (yang menyiapkan ≠ yang memposting,
   seperti rantai `wp_signoff`)?
3. **Bagaimana pembatalannya?** Jurnal firma bersifat append-only lewat toggle
   `posted`; membatalkan pembayaran berarti membatalkan posting **dan** mengembalikan
   status baris `firmap`. Dua tulisan yang harus konsisten.

## Opsi

### Opsi A — `payAp` memposting jurnal Dr 2-100 / Cr kas

Sub-buku dan buku besar bergerak bersama; residual `2-100` tetap nol; ekspor tidak
terkunci oleh pembayaran yang wajar.

- **Butuh:** kolom rekening kas pada `firmap` (atau pemilihan rekening di dialog
  pembayaran), keputusan wewenang, dan jalur pembatalan.
- **Risiko:** modul `apar` menjadi penulis pembukuan firma. Hari ini satu-satunya
  penulis jurnal adalah Firm GL. Menambah penulis kedua tanpa rantai otorisasi yang
  setara adalah persis pola yang membuat write-down WIP bermasalah
  ([usulan-W1](usulan-W1-wip-writedown-otorisasi.md)).
- **Konsekuensi tersembunyi:** saldo kas `1-10x` yang bergerak akan menggeser baris
  rekonsiliasi **Kas** — sisi bank tidak ikut bergerak, jadi baris `cash` berpindah ke
  `open` sampai mutasinya dicocokkan di modul Rekonsiliasi Bank. Memindahkan masalah,
  bukan menghapusnya; tetapi memindahkannya ke tempat yang memang bertugas
  menyelesaikannya.

### Opsi B — `payAp` tidak memposting; jurnalnya dibuat di Firm GL seperti sekarang

Modul `apar` tetap murni sub-buku. Selisihnya **terlihat jujur** di pita rekonsiliasi
sampai seseorang memposting jurnal kasnya di Firm GL.

- **Butuh:** tidak ada perubahan kode. Setelah A1, pita rekonsiliasi sudah mengatakan
  yang sebenarnya.
- **Risiko:** pengguna membayar beberapa tagihan, ekspor terkunci, dan tak ada satu
  petunjuk pun di layar `apar` tentang apa yang harus dilakukan untuk membukanya.
  (Dapat diperbaiki murah: pita rekonsiliasi `2-100` dirender juga di modul `apar`,
  dengan tautan "posting jurnal kas di Firm GL".)
- **Jujur secara akuntansi:** sub-buku dan buku besar memang dapat berbeda; yang tak
  boleh adalah perbedaannya tak terlihat.

### Opsi C — pembayaran menghasilkan jurnal **draft** (belum diposting)

`payAp` membuat entri `firmgl` dengan `posted: false`, memakai nomor voucher berikutnya.
Buku besar belum bergerak (draft tak masuk neraca saldo), tetapi jurnalnya sudah
tersusun dan menunggu di antrean "Belum Diposting" yang sudah ada di Firm GL.

- **Butuh:** rekening kas (sama seperti A) — tetapi wewenang memposting tetap di Firm
  GL, jadi pertanyaan 2 dan 3 terjawab oleh mekanisme yang sudah ada.
- **Risiko:** selisih tetap terbuka selama draft belum diposting (sama seperti B),
  tetapi jaraknya satu klik dan pelakunya jelas.

## Rekomendasi

**Opsi C**, dengan Opsi B sebagai keadaan sementara yang sudah benar hari ini.

Alasannya: C menyelesaikan pekerjaan pembukuannya (jurnal tersusun, tak ada yang perlu
diketik ulang) tanpa menambah penulis kedua ke pembukuan firma. Wewenang posting tetap
tunggal, pembatalan tetap satu mekanisme (`togglePost`), dan pita rekonsiliasi tetap
mengatakan yang sebenarnya sampai jurnalnya benar-benar diposting.

Yang tetap harus Ari putuskan sebelum C dapat dikerjakan: **rekening kas mana** —
kolom baru pada `firmap`, atau pemilihan saat membayar.

---

## A6 — ekspor sub-buku AP/AR (usulan menyertai, belum dikerjakan)

`FirmAPAR` tidak punya satu pun `amsExport*`: daftar utang, daftar piutang, dan skedul
umur tak dapat dikeluarkan sebagai kertas kerja. Pola yang siap pakai sudah ada
([firm_gl_export.ts](../migration/src/firm_gl_export.ts) + `amsExportXlsx`), dan nama
firma wajib dari SSOT (`AMS.FIRM`), bukan literal.

**Apakah ia harus tunduk gerbang Q-2?** Menurut penalaran yang dipakai `GATED_EXPORTS`
— jurnal dan buku besar **tidak** dikunci justru karena dibutuhkan untuk menelusuri
selisih — sub-buku juga tidak semestinya dikunci: ia adalah salah satu dari dua sisi
yang sedang direkonsiliasi, dan menutup aksesnya membuat selisihnya lebih sulit
dijelaskan, bukan lebih aman.

**Mengapa belum dikerjakan di sini:** payload sub-buku AP hanya bermakna sebagai kertas
kerja bila hubungannya dengan buku besar terdefinisi. Selama A3 belum diputuskan,
hubungan itu berubah setiap kali seseorang menekan "Bayar" — dan ekspor tersegel yang
menyatakan "Utang Usaha per tanggal X" akan menyegel angka yang tak dapat dijelaskan
terhadap `2-100` tanpa kalimat yang belum ada. Begitu A3 diputuskan, A6 adalah pekerjaan
kecil: empat model lembar (AP · AR · Aging · Rekonsiliasi 2 baris) di satu modul murni,
tanpa gerbang.
