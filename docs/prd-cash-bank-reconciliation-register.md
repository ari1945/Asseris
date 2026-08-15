# PRD — Kas menutup ke buku besar: saldo buku per rekening, bukan satu akun untuk enam bank

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-15 |
| Pemilik | Ari Widodo |
| Status | **Draft** — menunggu sign-off ("Proceed.") |
| Pemicu | Baris Kas 1-100 `open` sejak #240 — satu-satunya baris rekonsiliasi yang masih merah, dan ia mengunci ekspor Laporan Keuangan |
| PRD terkait | `prd-ar-ap-bridge-falsifiable.md` · `prd-wip-rollforward-falsifiable.md` · `prd-firmfin-ledger-derived.md` · `prd-budget-actual-ledger-derived.md` (semua Implemented) |
| Prasyarat | Di atas `master` `ac31d5e` |

---

## 1. Problem

### 1.1 Angkanya

Diukur atas seed nyata (probe sekali pakai, sudah dihapus):

| | Rp jt |
|---|---:|
| Σ saldo rekening (6 rekening, ekuiv. IDR @ kurs pasar) | 10.475,34 |
| Kontrol GL 1-100 | 8.420,00 |
| **Selisih (kontrol − sub-buku)** | **(2.055,34)** |

Rekening bank **melebihi** buku besar sebesar Rp 2.055 jt. Status baris = `open`, dan
karena `reconciliations()` adalah satu-satunya baris merah, **Kas sendirian mengunci
ekspor Laporan Keuangan** (gerbang #239: `D.recon.some(status === 'open')`).

Ketiga baris lain sudah `bridged` dengan `residual` nol — jadi utang ini betul-betul
tinggal satu.

### 1.2 Apa yang sudah bisa dijelaskan — dan seberapa kecil

| Komponen | Rp jt | % selisih | Sudah ada di aplikasi? |
|---|---:|---:|---|
| Revaluasi valas (kurs pasar − kurs buku) | 60,64 | 2,9% | ya — tab "Revaluasi Valas", tak pernah disalurkan ke rekonsiliasi |
| Item rekonsiliasi sisi buku BCA-OPS (biaya bank, jasa giro) | 2,15 | 0,1% | ya — `BANK_RECON` |
| **Sisa TANPA PEMILIK** | **1.994,70** | **97,0%** | — |

Cek silang: Σ rekening pada **kurs buku** = 10.414,70 jt, kontrol 8.420,00 jt →
selisih 1.994,70 jt. Revaluasi valas memang persis komponen 60,64 jt itu, dan
**tak ada apa pun yang menjelaskan 97% sisanya.**

### 1.3 Akar masalahnya struktural, bukan angka yang salah

**Bagan akun punya SATU akun kas (`1-100`) untuk ENAM rekening bank.** Akibatnya
**saldo buku per rekening tidak dapat diturunkan dari mana pun** — padahal itulah satu
sisi dari setiap rekonsiliasi bank. Yang tersedia hanya satu literal:
`BANK_RECON.bookBalance = 6.047,85 jt` untuk BCA-OPS. Lima rekening lain tidak punya
saldo buku sama sekali, jadi rekonsiliasinya bukan "belum dikerjakan" — ia **mustahil
dirumuskan**.

Turunannya:

- **`BANK_RECON` mencakup 1 dari 6 rekening.** Register-nya sendiri sehat (adjusted bank
  6.050,00 = adjusted book 6.050,00, menutup), tetapi ia hanya menjelaskan satu rekening.
- **Periodenya tak sinkron.** `BANK_RECON.period = "Februari 2026"`, sedangkan seluruh
  jurnal buku besar bertanggal **Maret 2026**. Rekonsiliasi bicara tentang periode yang
  berbeda dari buku yang direkonsiliasinya.
- **`BANK_RECON.bookBalance` adalah literal**, bukan turunan. Ia tidak bergerak saat
  jurnal diposting.
- **`FX_BOOK` (kurs buku) adalah konstanta privat modul** di
  [view_firmtreasury.tsx:221](../migration/src/view_firmtreasury.tsx#L221) — tidak
  diekspor, tidak di `AMS`, tidak dipakai lapisan kanon. Kurs buku bukan SSOT.
- **Tidak ada akun laba/rugi selisih kurs di COA.** Revaluasi 60,64 jt karena itu tak
  punya tempat untuk diposting; ia hanya angka di layar.

### 1.4 Yang BUKAN masalah di sini

`BANK_ACCOUNTS[].balance` adalah literal dan **memang seharusnya begitu** — itu saldo
menurut **bank**, data eksternal. Justru keseluruhan gunanya rekonsiliasi bank adalah
mempertemukan dua sumber yang independen. Jadi pola "hapus literal, turunkan dari GL"
dari `prd-budget-actual-ledger-derived` **TIDAK boleh diterapkan pada sisi bank**.

Yang hilang adalah **sisi buku**-nya. Setengah dari rekonsiliasi ini tak pernah ada.

### 1.5 Kenapa ini merugikan

- **Mengunci fungsi nyata.** Ekspor Laporan Keuangan mati pada keadaan demo, karena satu
  baris yang tak bisa ditutup oleh siapa pun.
- **Kas adalah akun yang paling diuji auditor.** Produk audit yang tak bisa menunjukkan
  rekonsiliasi bank per rekening sulit dipertahankan di depan pengguna sasarannya.
- **Selisih Rp 2 miliar tanpa pemilik** pada firma dengan pendapatan Rp 11,3 M adalah 18%
  dari pendapatan setahun.

---

## 2. Objective

**Setiap rekening bank punya saldo buku yang diturunkan dari jurnal terposting, dan
selisihnya terhadap saldo bank dijelaskan oleh item rekonsiliasi yang dapat dijumlah —
per rekening, per periode.** Sisa yang tak dijelaskan siapa pun tetap MERAH.

## 3. Success Criteria

| # | Kriteria | Cara uji |
|---|---|---|
| SC-1 | Saldo buku tiap rekening **diturunkan** dari jurnal terposting; nol literal saldo buku | grep-gate + uji |
| SC-2 | Σ saldo buku seluruh rekening == kontrol GL kas, secara konstruksi | uji |
| SC-3 | Memposting jurnal kas menggeser saldo buku rekening yang tepat, dua arah | uji |
| SC-4 | Tiap rekening punya rekonsiliasi sendiri: bank ± (cek beredar, setoran transit) == buku ± (biaya bank, jasa giro) | uji per rekening |
| SC-5 | Baris Kas di `reconciliations()` `tied`/`bridged` pada seed — dan ekspor LK terbuka | uji + live |
| SC-6 | **Gerbang DAPAT MERAH**: menaikkan satu saldo bank tanpa item rekonsiliasi ⇒ baris Kas `open` & ekspor terkunci lagi | uji perusak |
| SC-7 | Revaluasi valas memakai kurs buku dari SSOT bersama (bukan konstanta privat view) | grep + uji |
| SC-8 | Periode register selaras dengan periode buku besar | uji |
| SC-9 | Nol-delta di luar Kas: P&L, laba, WIP/AR/AP tak bergerak | uji regresi |
| SC-10 | `npm run verify` hijau; ratchet `:any` tidak naik | CI |
| SC-11 | Live-verified: rekonsiliasi per rekening tampil, DAN keadaan merahnya | screenshot dua keadaan |

## 4. Scope

1. **Dimensi rekening pada kas di buku besar** — sesuai jawaban Q-1.
2. **Register rekonsiliasi per rekening & per periode** — menggantikan `BANK_RECON`
   tunggal; bentuknya meniru `AR_BRIDGE`/`AP_BRIDGE` (#240): komponen bernama yang
   dapat dijumlah, sisa yang tak tercakup memerahkan.
3. **`cash()` & baris `cash` di `reconciliations()`** menyalurkan komponen itu
   (`bridgeTotal`/`residual`), persis seperti AR/AP/WIP.
4. **Kurs buku ke SSOT** — `FX_BOOK` keluar dari view, masuk lapisan data/kanon.
5. **Penyelarasan seed** sesuai jawaban Q-2 & Q-3.
6. **Uji + verifikasi hidup dua keadaan** (menutup & TIDAK menutup).

## 5. Non-Scope

- Impor rekening koran sungguhan / bank feed (roadmap CoreSys). Chip "Bank feed: 15 mnt
  lalu" di SubBar `cashbank` **menyesatkan** dan sebaiknya dicabut atau dilabeli demo —
  catat, tapi bukan inti PRD ini.
- Kas mata uang asing multi-periode dengan kurs historis per transaksi.
- Entri transaksi kas/bank oleh pengguna (modul masih read-only by design).
- Menyentuh sub-buku WIP/AR/AP — semuanya baru saja ditutup.

## 6. Constraints

- CLAUDE.md §3.2 SSOT · ratchet `:any` · `master` selalu hijau.
- **Gerbang harus dibuktikan MERAH** (SC-6). Bahaya terbesar arc ini adalah "menutup"
  selisih dengan komponen karangan — itu persis cacat `note` hardcode #240 dan empat plug
  #239 yang baru dicabut. Komponen jembatan harus mewakili sesuatu yang benar-benar ada.
- **Nol-delta di luar Kas** (SC-9).
- Saldo bank (`BANK_ACCOUNTS[].balance`) tetap literal — data eksternal (§1.4).

## 7. Existing Solutions

**Jangan tulis ulang — pakai yang sudah terbukti:**

- **Pola jembatan #240** (`AR_BRIDGE`/`AP_BRIDGE` + `bridgeTotal`/`residual` +
  status dari angka) sudah persis bentuk yang dibutuhkan baris Kas. `mk()` di
  `reconciliations()` bahkan sudah menerima parameternya — baris Kas hari ini mengirim
  `bridgeTotal: 0`.
- **`adjustedBank`/`adjustedBook`** sudah dihitung benar di
  [view_firmtreasury.tsx:245](../migration/src/view_firmtreasury.tsx#L245) dan register
  BCA-OPS-nya memang menutup. Yang kurang: cakupan & penyaluran, bukan aritmetikanya.
- **`firm_ledger.ts`** (saldo turunan) & **`useFirmCoa`** — dimensi rekening baru otomatis
  ikut, tanpa mesin baru.
- **`mergeSeedJournals()`** (#243) sudah menangani cache `firmgl` basi — penambahan
  jurnal/akun seed di arc ini tak akan mengulang cacat itu.
- Radius perubahan `'1-100'` **kecil**: 9 acuan di sumber (`data_firmfin` ×3,
  `data_part1` ×5, `view_firmgl` ×1) + 2 berkas uji.

## 8. Proposed Approach

**F-1 — Dimensi rekening pada kas** (bentuknya menunggu Q-1).

**F-2 — Register rekonsiliasi per rekening.** `BANK_RECON` tunggal → `BANK_RECONS`
ber-kunci rekening & periode. Tiap baris: sisi bank (cek beredar, setoran dalam
perjalanan) vs sisi buku (biaya bank, jasa giro, transfer belum dibukukan).

**F-3 — Salurkan ke `reconciliations()`.** Baris Kas mengirim `bridgeTotal` = Σ komponen
bernama dan `residual` = sisa. Status jadi turunan angka seperti tiga baris lain — dan
`open` tetap mungkin.

**F-4 — `FX_BOOK` ke SSOT** + revaluasi diperlakukan sesuai Q-3.

**F-5 — Uji & verifikasi hidup**, termasuk keadaan merahnya.

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | **Menutup selisih dengan komponen karangan** — mengulang #239/#240 | SC-6 uji perusak; Q-2 memaksa keputusan eksplisit alih-alih diam-diam menambal |
| R-2 | Memecah `1-100` merusak `balanceSheet.ca`, uji ledger, `view_firmgl` | Radius terukur 9+2 berkas (§7); uji saldo awal memaku |
| R-3 | Menambah akun P&L selisih kurs **memerahkan gerbang cakupan anggaran** yang baru dibangun | Itu gerbangnya BEKERJA. Tambahkan baris anggarannya — dan pakai ini sebagai bukti hidup SC-6 arc sebelumnya |
| R-4 | Angka demo di luar Kas bergeser | SC-9; jangkar saldo awal (pola nol-delta #241) |
| R-5 | Menyelaraskan saldo bank seed terasa "mengarang data" | Saldo bank memang data yang kita tetapkan untuk demo; yang haram adalah mengarang **item rekonsiliasi** untuk menutup selisih yang tak nyata |

## 10. Implementation Plan

| Fase | Isi | Kriteria |
|---|---|---|
| F-1 | Dimensi rekening pada kas | SC-1..SC-3 |
| F-2 | Register rekonsiliasi per rekening & periode | SC-4, SC-8 |
| F-3 | Salurkan ke `reconciliations()`; ekspor terbuka | SC-5, SC-6 |
| F-4 | `FX_BOOK` ke SSOT + perlakuan revaluasi | SC-7 |
| F-5 | Uji + verifikasi hidup dua keadaan | SC-9..SC-11 |

Perkiraan **dua PR**: F-1+F-2 (data & mesin), lalu F-3+F-4+F-5 (penyaluran, gerbang,
bukti). Lihat Q-5.

## 11. Open Questions

**Q-1 · Bagaimana kas mendapat dimensi rekening?**
- **(a) Sub-akun kas di COA** — `1-101 BCA Operasional` … `1-106 Kas Kecil`; `1-100`
  jadi rollup. Saldo buku per rekening **diturunkan dari jurnal**, dan Σ == kontrol
  **secara konstruksi** (bukan karena dicocokkan). Jurnal seed kas diarahkan ke
  sub-akunnya. ← *rekomendasi: satu-satunya opsi yang membuat SC-2 benar by
  construction, dan disiplin yang sama dengan arc anggaran — turunkan, jangan simpan.
  Radius kecil (§7)*
- **(b) Sub-buku kas terpisah** — register mutasi per rekening di samping `1-100`.
  Menciptakan sumber kedua untuk peristiwa yang sama; saldo buku per rekening jadi
  literal lagi. Persis cacat yang baru kita cabut dua kali.
- **(c) Hanya register jembatan**, tanpa dimensi rekening — baris Kas bisa jadi
  `bridged`, tetapi rekonsiliasi **per rekening** tetap mustahil dan 97% selisih hanya
  berganti nama. Menutup gejala.

**Q-2 · Sisa Rp 1.994,70 jt yang tak berpemilik.**
- **(a) Selaraskan saldo bank seed** ke buku besar, sisakan selisih kecil yang realistis
  dan **benar-benar dienumerasi** (cek beredar, setoran transit, biaya bank).
  Saldo bank adalah data demo yang memang kita tetapkan. ← *rekomendasi: jujur. Angka
  8.420 vs 10.475 lahir dari dua orang memilih angka secara terpisah, bukan dari
  peristiwa ekonomi apa pun*
- **(b) Enumerasi Rp 2 miliar item rekonsiliasi** agar menutup. Itu mengarang peristiwa
  supaya badge hijau — kelas cacat yang arc #239/#240 justru cabut.
- **(c) Biarkan merah.** Jujur, tetapi ekspor LK tetap terkunci dan PRD ini tak mencapai
  tujuannya.

**Q-3 · Revaluasi valas Rp 60,64 jt.**
- **(a) Jadi jurnal terposting** — tambah akun `Laba (Rugi) Selisih Kurs` di COA, posting
  revaluasi, sehingga saldo buku sudah memuatnya dan rekonsiliasi bersih. ← *rekomendasi:
  konsisten dengan "semua angka berasal dari jurnal". Konsekuensi yang dikehendaki: akun
  P&L baru akan **memerahkan gerbang cakupan anggaran** (#242) sampai baris anggarannya
  ditambahkan — itu bukti hidup gerbang itu bekerja*
- **(b) Komponen jembatan non-posting** — lebih murah, tapi menyisakan angka P&L yang
  tak pernah masuk buku besar.

**Q-4 · Periode.** `BANK_RECON` = Februari 2026, seluruh jurnal = Maret 2026.
- **(a) Selaraskan ke Maret 2026** dan buat register-nya ber-periode. ← *rekomendasi*
- **(b) Simpan keduanya** (Feb historis + Mar berjalan) untuk menunjukkan riwayat.
  Lebih realistis, seed lebih besar.

**Q-5 · Pengemasan.**
- **(a) Dua PR** — data & mesin dulu, lalu penyaluran + gerbang + bukti. ← *rekomendasi*
- **(b) Satu PR.**

**Q-6 · Chip "Bank feed: 15 mnt lalu"** di SubBar `cashbank` menyiratkan integrasi bank
yang tidak ada.
- **(a) Cabut dalam arc ini** — ia berdiri persis di atas layar yang sedang dibetulkan. ← *rekomendasi*
- **(b) Beri label "demo".**
- **(c) Biarkan.**
