# Prompt perbaikan — modul `apar` (AP / AR Firma)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-E (ledger/SoD) + D (definisi selesai).
>
> ⚠ **BERKAS SEDANG BERUBAH.** `migration/src/view_firmgl.tsx` berstatus `M`
> (termodifikasi, belum di-commit) — pekerjaan modul `firmgl` baru saja mendarat di
> pohon kerja: `GATED_EXPORTS`, `ReconBand`, dan gerbang Q-2. Berkas tumbuh 535 → 716
> baris, dan `FirmAPAR()` kini mulai di baris 572. **Langkah pertamamu adalah
> memverifikasi ulang seluruh nomor baris di prompt ini terhadap HEAD saat kamu
> membacanya**, dan memastikan pekerjaan yang belum di-commit itu tidak hilang oleh
> perubahanmu.
>
> **Catatan pembuat prompt:** modul ini memiliki DUA dari EMPAT akun kontrol yang
> direkonsiliasi seluruh aplikasi — Piutang Usaha (`1-200`) dan Utang Usaha (`2-100`),
> keduanya ber-`owner: 'apar'` di `data_firmfin.ts`. Sejak gerbang Q-2 mendarat, kedua
> baris itu ikut menentukan apakah Neraca Saldo dan Laporan Keuangan firma boleh
> dikeluarkan sebagai kertas kerja.
>
> Dan justru di situ cacat terberatnya: **gerbang itu buta terhadap setiap tulisan yang
> modul ini lakukan.**

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya. Berkas ini SEDANG berubah — verifikasi setiap nomor baris sendiri.
2. SSOT. Satu konsep = satu register. Menemukan dua register untuk hal yang sama adalah
   TEMUAN — jangan disinkronkan, laporkan dan pilih satu.
3. GERBANG YANG MEMBACA DATA BEKU BUKAN GERBANG. Sebuah pemeriksaan yang tidak dapat
   berubah oleh tindakan pengguna hanya memberi rasa aman.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. TIDAK ADA ASUMSI DIAM-DIAM. Apa pun yang mengubah pembukuan firma diusulkan dulu.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: buat rekonsiliasi Piutang & Utang firma benar-benar melihat data yang hidup,
dan hentikan modul ini memakai register piutang yang berbeda dari yang ditulis Billing.

KONTEKS MODUL
- id modul: apar (grup "Keuangan Firma (ERP)")
- berkas: migration/src/view_firmgl.tsx → fungsi `FirmAPAR()` (baris ±572-716).
  Berkas ini JUGA memuat modul `firmgl` — yang pekerjaannya BARU SAJA mendarat dan
  belum di-commit. Jangan menimpanya.
- mesin: data_firmfin.ts → `reconciliations(ctx)` (baris ±568) · `arAging(ctx)` (±332)
  · `ap(ctx)` · `invOf(ctx)` · `pl()`
- register faktur yang HIDUP: modul `billing` di view_pipeline.tsx:581 —
  `useAmsPersist('invoices', () => AMS.INVOICES)`
- PRD terkait: docs/prd-firm-erp-deepening.md (Approved) · jembatan AR/AP #240

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Klok SSOT: `const REF = new Date(AMS.TODAY)`.
- Gerbang SoD sudah ada: `canEdit = auth.can(CAP.FIRMFIN_EDIT)`, dan tombol "Bayar"
  diganti penanda kunci untuk yang tak berwenang — alasannya benar (mencegah tulisan
  ditolak server secara senyap). Pertahankan.
- Status "Read-only" pada AR memang disengaja (entri faktur dikelola di modul lain).
  Yang salah bukan read-only-nya, melainkan DARI MANA ia membaca (lihat A2).

CACAT

A1 · Gerbang rekonsiliasi buta terhadap tulisan modul ini  [P0]
    view_firmgl.tsx:108 memanggil:
      FIRMFIN.reconciliations({ engagements, clients, coa: coaDerived, reconLines })
    Konteks itu TIDAK memuat `invoices` maupun `firmap`. Mesinnya membaca sub-buku
    lewat pola `ctx.x || AMS.X` (`invOf(ctx)`, `ap(ctx)`) — sehingga tanpa kunci itu,
    kedua sub-buku jatuh ke SEED.
    Akibatnya sisi GL dari rekonsiliasi hidup (diturunkan dari jurnal terposting)
    sementara sisi sub-buku beku. Membayar utang di modul ini mengubah `firmap`, dan
    baris rekonsiliasi `2-100` tidak bergerak sedikit pun. Gerbang yang kini menentukan
    boleh-tidaknya Neraca Saldo dan Laporan Keuangan firma keluar sebagai kertas kerja
    karena itu memeriksa sesuatu yang tak dapat berubah.
    Verifikasi sendiri sebelum memperbaiki — baca `invOf`, `ap`, dan `arAging` di
    data_firmfin.ts dan tunjukkan barisnya. Ini persis jebakan yang pernah tercatat di
    repo: gerbang cakupan atas berkas konsumen tidak dapat melihat pembaca seed yang
    lewat mesin ber-`ctx.x || A.X`; cacatnya ada pada PEMANGGIL yang tak mengirim kunci.
    Kerjakan: kirim register yang hidup ke dalam ctx. Periksa juga pemanggil
    `reconciliations()` lain di repo — kalau ada yang mengirim ctx berbeda, dua layar
    akan menjawab beda soal pertanyaan yang sama; laporkan temuanmu.

A2 · Piutang modul ini membaca seed, bukan register faktur yang ditulis Billing  [P0]
    view_firmgl.tsx:577  `const ar: any = AMS.INVOICES;`
    Sementara modul `billing` menulis ke register yang dipersistensikan:
      view_pipeline.tsx:581  useAmsPersist('invoices', () => AMS.INVOICES)
    Dua register untuk satu konsep. Menerbitkan faktur, menandainya lunas, atau
    mengubah jatuh temponya di Billing TIDAK terlihat sama sekali di sini — padahal
    di sinilah Piutang Outstanding, DSO, Posisi Neto, dan "Total Jatuh Tempo Lewat"
    dihitung, dan di sinilah baris rekonsiliasi `1-200` dimiliki.
    Kerjakan: baca register yang sama dengan yang ditulis Billing. Jangan menyalin,
    jangan menyinkronkan — pakai satu sumber.
    Laporkan juga pembaca `AMS.INVOICES` lain yang kamu temukan (`grep -rln
    "AMS.INVOICES\|A.INVOICES" migration/src`) sebagai temuan terpisah; JANGAN
    memperbaiki semuanya di PR ini.

A3 · Pembayaran utang tidak menyentuh buku besar  [P0 — USULKAN dulu, jangan langsung]
    `payAp(id)` menandai baris `firmap` menjadi lunas dan mencatat aktivitas. Ia tidak
    memposting jurnal apa pun. Sejak buku besar firma diturunkan dari jurnal terposting,
    artinya: kas dan utang di GL tidak bergerak ketika utang dibayar.
    Setelah A1 diperbaiki, konsekuensinya menjadi terlihat — dan benar: selisih `2-100`
    akan MELEBAR setiap pembayaran, dan itu dapat mengunci ekspor Neraca Saldo & LK.
    Itu bukan alasan untuk membatalkan A1. Itu alasan untuk memutuskan hal berikut,
    dan keputusannya BUKAN milikmu:
      apakah pembayaran utang di modul ini semestinya MEMPOSTING jurnal (Dr Utang /
      Cr Kas) ke buku besar firma — dan bila ya, rekening kas mana, dengan wewenang
      siapa, dan bagaimana pembatalannya?
    Tulis usulan singkat berisi opsi dan konsekuensinya (termasuk: membiarkan sub-buku
    dan GL berbeda, dengan selisih yang jujur terlihat di pita rekonsiliasi), lalu
    BERHENTI. Jangan memposting jurnal ke pembukuan firma atas inisiatif sendiri.

A4 · Pelaku jejak berasal dari seed statis  [P1]
    view_firmgl.tsx:584  `const who = (AMS.USER && AMS.USER.name) || 'Pengguna';`
    dipakai pada `logActivity({ who, action: 'AP_PAY', … })`. `AMS.USER` adalah data
    seed, bukan sesi — jejak pembayaran mencatat nama yang tak berhubungan dengan
    siapa yang menekan tombol, atau "Pengguna" bila seed kosong.
    Repo punya `useCurrentAuditor()` (identitas sesi nyata W7; contoh di
    view_mytasks_parts.tsx:88). Pakai itu. Bila identitas tak tersedia, aksi tulis
    TIDAK dijalankan — bukan dicatat atas nama fallback.

A5 · DSO/DPO jatuh ke angka keuangan karangan  [P1]
    view_firmgl.tsx:598
      const FFp = (FIRMFIN && FIRMFIN.pl()) || { revenue: 11_300_000_000,
                    totalExpense: 8_500_000_000, salary: 5_420_000_000 };
    Bila `pl()` tidak mengembalikan nilai, DSO dan DPO dihitung atas pendapatan dan
    beban yang dikarang — dan ditampilkan sebagai rasio keuangan firma tanpa penanda
    apa pun. Hapus fallback-nya: bila basisnya tak tersedia, rasio tidak ditampilkan.
    Angka yang tidak ada dan angka yang salah adalah dua hal berbeda; yang kedua lebih
    buruk.

A6 · Nol ekspor  [P2 — usulkan, kerjakan bila jelas]
    Tidak ada `amsExport*` di seluruh `FirmAPAR()`. Daftar utang, daftar piutang, dan
    strip umur piutang tak dapat dikeluarkan sebagai kertas kerja.
    Sub-buku BUKAN pernyataan posisi, jadi menurut penalaran yang dipakai `GATED_EXPORTS`
    (jurnal & buku besar tidak dikunci karena justru dibutuhkan untuk menelusuri selisih)
    ekspor sub-buku semestinya juga tidak dikunci — tetapi itu penalaranku, bukan
    keputusan yang sudah diambil. Nyatakan alasanmu di laporan sebelum menambahkannya.
    Nama firma pada payload WAJIB dari SSOT, bukan literal.

GERBANG YANG HARUS KAMU TULIS
Berkas uji .ts WAJIB bebas `any`.
  a. Membayar sebuah utang MENGUBAH baris rekonsiliasi `2-100` — sub-buku yang dipakai
     gerbang bergerak mengikuti register yang hidup. (Merah sebelum A1.)
  b. Menandai sebuah faktur lunas di register `invoices` MENGUBAH piutang outstanding
     dan baris rekonsiliasi `1-200` di modul ini. (Merah sebelum A1/A2.)
  c. Modul ini dan modul `billing` melaporkan piutang outstanding yang SAMA untuk
     keadaan register yang sama. (Merah sebelum A2 — dan tidak bisa dipuaskan dengan
     menyalin nilai.)
  d. Tidak ada aksi tulis yang tercatat tanpa identitas sesi nyata. (Merah sebelum A4.)
  e. Ketika basis laba-rugi tidak tersedia, DSO/DPO tidak menghasilkan angka.
     (Merah sebelum A5.)
  f. Gerbang sumber: nol pembacaan `AMS.INVOICES` langsung di dalam `FirmAPAR` — buang
     komentar dulu sebelum memindai (pola helper `kode()` di cockpit_conventions.test.ts).

LANGKAH
1. INVESTIGASI — verifikasi ulang SETIAP nomor baris terhadap HEAD sekarang (berkas
   sedang berubah). Konfirmasi A1–A5; tempelkan bukti barisnya. Sebelum menyentuh A1,
   baca `reconciliations`, `invOf`, `ap`, dan `arAging` di data_firmfin.ts lalu
   nyatakan dengan kalimatmu sendiri: kunci ctx apa yang masing-masing baca, dan apa
   yang terjadi bila kunci itu tidak dikirim.
2. RENCANA — termasuk usulan A3 (dan A6). Untuk A3: usulan, lalu BERHENTI di situ.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — A1, A2, A4, A5. A3 hanya usulan.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. WAJIB tetap hijau:
   firm_bridge · cash_bank_recon · firm_ledger · firm_gl_control_journals ·
   firmfin_ledger · firmfin_budget · uji billing/pipeline. Kalau salah satunya merah,
   periksa apakah ia merah karena KOREKSI (angka bergerak karena akhirnya membaca data
   hidup) atau karena REGRESI — dan jelaskan yang mana di laporan, dengan angkanya.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · usulan A3 · daftar
   pembaca `AMS.INVOICES` lain · pemanggil `reconciliations()` lain dan ctx-nya ·
   apakah pita rekonsiliasi berubah warna setelah perbaikan (angka, bukan kesan) ·
   yang TIDAK dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN memposting jurnal ke pembukuan firma tanpa keputusan (A3).
- ⛔ JANGAN membatalkan atau melunakkan gerbang Q-2 karena pita rekonsiliasi menjadi
   merah setelah perbaikanmu. Merah yang jujur adalah hasil yang benar; gerbang yang
   sebelumnya hijau karena membaca data beku bukanlah tolok ukur.
- JANGAN menimpa pekerjaan `firmgl` yang belum di-commit di berkas yang sama.
- JANGAN memperbaiki seluruh pembaca `AMS.INVOICES` di repo — laporkan saja.
- JANGAN mengubah kontrak `FIRMFIN.reconciliations()`; yang salah adalah ctx yang
  dikirim pemanggil.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; uji keuangan & billing tetap hijau, atau
    pergeserannya dijelaskan sebagai koreksi dengan angka.
[ ] Rekonsiliasi `1-200` dan `2-100` bergerak mengikuti register yang hidup.
[ ] Modul ini dan Billing melaporkan piutang yang sama untuk keadaan yang sama.
[ ] DSO/DPO tidak pernah dihitung atas angka karangan.
[ ] Jejak pembayaran memakai identitas sesi nyata.
[ ] Usulan A3 tertulis dan TIDAK diimplementasikan.
[ ] Nol pembacaan seed faktur langsung di FirmAPAR, dijaga gerbang sumber.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan memuat status pita rekonsiliasi setelah perbaikan, dalam angka.
```
