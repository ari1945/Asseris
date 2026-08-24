# Prompt perbaikan — modul `cashbank` (Kas, Bank & Rekonsiliasi)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-B (klok/kurs) + C-A (ekspor) + D.
>
> **Catatan pembuat prompt:** modul ini sudah melewati tiga PR perbaikan (#247/#249/#251)
> dan hasilnya terlihat. Sisi buku rekonsiliasi diturunkan dari akun buku besar tiap
> rekening; pencocokan disalurkan ke ctx FIRMFIN sehingga benar-benar menggeser residual
> Kas; aritmetikanya tidak dihitung ulang di view; kurs buku sudah SSOT (`AMS.FX_BOOK`)
> setelah sebelumnya jadi konstanta privat; gerbang SoD terpasang; dan chip palsu
> "Bank feed: 15 mnt lalu" DICABUT dengan alasan yang tertulis — karena ia berdiri
> persis di atas layar yang bergantung pada saldo bank sebagai data eksternal tepercaya.
> **Jangan mengerjakan ulang satu pun dari itu.**
>
> Yang tersisa berpusat pada satu hal: **kurs**. Seluruh tab Revaluasi Valas dan KPI
> "Selisih Kurs Diakui (GL 5-600)" — angka yang sejak #249 benar-benar DIBUKUKAN —
> berdiri di atas satu record kurs tanpa tanggal. Itu bentuk cacat yang sama persis
> dengan yang dicabut Tahap A dari tarif payroll, hidup di tempat yang menyentuh
> pembukuan firma.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya. Di modul ini khususnya: sebagian besar yang tampak rusak SUDAH diperbaiki
   oleh tiga PR sebelumnya.
2. NILAI YANG BERUBAH MENURUT KALENDER WAJIB PUNYA MASA BERLAKU. Record tunggal tanpa
   tanggal untuk sesuatu yang berubah setiap hari bukan data — ia foto lama yang
   menyamar jadi data hari ini.
3. YANG MENYANGKUT UANG MEMBLOKIR. Bila kurs untuk tanggal yang ditinjau tak tercakup,
   perhitungan berhenti — bukan memakai kurs masa lain.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. TIDAK ADA ASUMSI DIAM-DIAM, DAN TIDAK ADA KURS KARANGAN. Kalau kurs untuk suatu
   tanggal belum kamu punya, JANGAN mengisinya dan jangan menyalin kurs sebelumnya.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: beri kurs masa berlaku, buktikan bahwa saldo kas yang ditampilkan menutup ke
akun kontrol yang dimiliki modul ini, dan lengkapi kertas kerja rekonsiliasi bank.

KONTEKS MODUL
- id modul: cashbank (grup "Keuangan Firma (ERP)")
- berkas: migration/src/view_firmtreasury.tsx → fungsi `CashBank()` baris 227-408.
  Berkas ini JUGA memuat `treasury` (baris 36-226) dan `fixedassets` (baris 409+) —
  JANGAN sentuh keduanya.
- mesin: `FIRMFIN.bankRecon({ coa, reconLines })` · `useBankRecon()` · `useFirmCoa()`
- data kurs: data_part2.ts:8 `FX_RATES` (kurs pasar) · data_part2.ts:14 `FX_BOOK`
  (kurs buku, ber-dokumentasi)
- modul ini adalah PEMILIK baris rekonsiliasi Kas (`1-101…1-106`) di
  `FIRMFIN.reconciliations()` — bersama `apar` yang memiliki dua baris lainnya.
- uji yang sudah ada (JANGAN dirusak): cash_bank_recon.test.ts · firm_bridge.test.ts

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Rekonsiliasi PER REKENING dengan sisi buku dari buku besar (#251). Benar.
- `matched` disalurkan ke ctx FIRMFIN sehingga pencocokan menggeser residual Kas.
- `FX_BOOK` sudah SSOT dan berkomentar — jangan dikembalikan jadi konstanta view.
- Revaluasi valas DIBUKUKAN ke GL 5-600 (#249), bukan sekadar ditampilkan.
- Gerbang SoD `CAP.FIRMFIN_EDIT` ada pada `toggleMatch`.
- Chip "Bank feed" palsu sudah dicabut. Jangan dihidupkan lagi dalam bentuk apa pun.
- Saldo menurut BANK sengaja tetap literal — ia data EKSTERNAL (lihat komentar
  data_part2.ts:17). Itu benar; jangan "diturunkan".

CACAT

CB1 · Kurs adalah record tunggal tanpa tanggal  [P0]
    data_part2.ts:8   const FX_RATES = { IDR: 1, USD: 16_250, SGD: 12_050, EUR: 17_600 };
    data_part2.ts:14  const FX_BOOK  = { IDR: 1, USD: 15_780, SGD: 11_640, EUR: 17_120 };
    Kurs berubah setiap hari. Keduanya disimpan sebagai satu record tanpa masa berlaku,
    tanpa dasar (kurs tengah BI? kurs KMK? kurs transaksi?), dan tanpa tanggal.
    Yang bergantung padanya: seluruh tab Revaluasi Valas, KPI "Selisih Kurs Diakui
    (GL 5-600)", KPI "Total Kas (ekuivalen IDR)", dan — sejak #249 — jurnal revaluasi
    yang benar-benar masuk pembukuan firma.
    Akibatnya: ketika klok SSOT bergerak, aplikasi tetap merevaluasi pada kurs Maret
    2026 dan membukukan selisihnya, tanpa satu pun tanda.
    Ini bentuk cacat yang sama dengan `CPE_REQ` dan `PAYROLL_RATES.period` — "punya
    nilai, tidak punya masa". Modul `regref` ada justru untuk kelas cacat ini.
    Kerjakan:
      · jadikan kurs himpunan bermasa berlaku, dan
      · daftarkan sebagai entri katalog `regrefCatalog()` dengan
        `enforcement: 'block'` (menyangkut uang, dan hasilnya dibukukan), dan
      · pastikan tanggal di luar masa yang terdaftar menghasilkan 'no-coverage' yang
        MENGHENTIKAN revaluasi — bukan memakai kurs terakhir.
    Baca `canon_regref.ts` dan `regref_catalog.ts` lebih dulu; ikuti bentuk set yang
    sudah ada, jangan membuat mekanisme kedua.
    JANGAN mengarang kurs untuk tanggal mana pun. Bila hanya ada satu tanggal yang
    diketahui, daftarkan satu masa itu saja dan biarkan sisanya tak tercakup.
    Bila prompt 27-regref sedang/sudah dikerjakan paralel, IKUTI pola yang sudah
    mendarat di sana — periksa dulu.

CB2 · Saldo kas yang ditampilkan belum terbukti menutup ke akun kontrolnya  [P0 —
      buktikan dulu, perbaiki hanya bila terbukti berselisih]
    KPI "Total Kas (ekuivalen IDR)" dihitung di view:
      const idrOf = (a) => a.balance * FX[a.ccy];   // kurs PASAR
      const totalIDR = accts.reduce((s, a) => s + idrOf(a), 0);
    Sementara baris rekonsiliasi Kas yang DIMILIKI modul ini membandingkan buku besar
    dengan sub-buku. Setelah #249 membukukan revaluasi, keduanya SEHARUSNYA sama.
    Jangan berasumsi ke arah mana pun. Kerjakan urutannya begini:
      1. tulis uji yang membandingkan `totalIDR` dengan saldo akun kontrol kas di buku
         besar untuk keadaan data sekarang;
      2. jalankan. Kalau HIJAU: laporkan bahwa keduanya menutup, dan biarkan ujinya
         berdiri sebagai gerbang anti-kambuh — JANGAN mengaku telah memerahkannya;
      3. kalau MERAH: itu temuan nyata — angka utama modul ini berselisih dengan akun
         kontrol yang ia sendiri miliki. Perbaiki dengan menurunkan KPI dari sumber
         yang sama dengan rekonsiliasi, lalu laporkan selisih yang kamu temukan
         beserta sebabnya (kurs pasar vs kurs buku adalah tersangka pertama).

CB3 · Rekonsiliasi bank tidak dapat dikeluarkan sebagai kertas kerja  [P1]
    Tidak ada satu pun `amsExport*` di seluruh `CashBank()`. Rekonsiliasi bank adalah
    kertas kerja paling standar dalam audit; modul ini menghasilkannya per rekening,
    lengkap dengan item terbuka, saldo buku disesuaikan, dan saldo bank disesuaikan —
    dan tak ada cara mengeluarkannya.
    Kerjakan: ekspor XLSX tersegel per rekening (dan/atau seluruh rekening), berisi
    baris rekonsiliasi, item belum cocok, dan kedua saldo disesuaikan. Angkanya
    diturunkan dari `FIRMFIN.bankRecon()` — jangan menyalin dari tampilan.
    Nama firma pada payload WAJIB dari SSOT, bukan literal (catatan: `treasury` di
    berkas yang sama masih memakai literal di baris 82 — itu lingkup prompt 31,
    JANGAN kamu perbaiki di sini, cukup jangan menirunya).
    Soal apakah ekspor ini tunduk gerbang Q-2 (seperti Neraca Saldo & LK): menurut
    penalaran `GATED_EXPORTS` di view_firmgl.tsx, rekonsiliasi adalah ALAT PENELUSURAN
    selisih, bukan pernyataan posisi — sehingga semestinya TIDAK dikunci. Nyatakan
    alasanmu di laporan; kalau kamu menyimpulkan sebaliknya, usulkan dan berhenti.

CB4 · Pelaku jejak berasal dari seed statis  [P1]
    `const who = (AMS.USER && AMS.USER.name) || 'Pengguna';` dipakai pada
    `logActivity({ who, action: 'RECON_TOGGLE', … })`.
    Mencocokkan item rekonsiliasi adalah tindakan yang mengubah residual akun kontrol
    kas — jejaknya harus menyebut siapa yang benar-benar melakukannya. `AMS.USER`
    adalah data seed.
    Pakai `useCurrentAuditor()` (identitas sesi nyata W7; contoh di
    view_mytasks_parts.tsx:88). Bila identitas tak tersedia, pencocokan TIDAK dicatat —
    bukan dicatat atas nama fallback.

GERBANG YANG HARUS KAMU TULIS
Berkas uji .ts WAJIB bebas `any`. Bangun di atas `FIRMFIN.bankRecon` yang sudah murni.
  a. Kurs untuk tanggal di luar masa yang terdaftar TIDAK menghasilkan angka revaluasi;
     perhitungan berhenti dan menyatakan sebabnya. (Merah sebelum CB1.)
  b. Memajukan `AMS.TODAY` melewati masa kurs terakhir mengubah keadaan modul dari
     "terhitung" menjadi "tak tercakup". (Merah sebelum CB1.)
  c. Perbandingan total kas vs akun kontrol — lihat CB2 langkah 1; laporkan apa adanya
     apakah ia lahir merah atau hijau.
  d. Mencocokkan satu item rekonsiliasi MENGGESER residual baris Kas di
     `FIRMFIN.reconciliations()`. (Kemungkinan sudah hijau berkat #251 — kalau ya,
     katakan begitu; ia tetap berharga sebagai gerbang anti-kambuh.)
  e. Payload ekspor rekonsiliasi identik dengan yang dirender (bukan salinan), dan
     seimbang: saldo buku disesuaikan == saldo bank disesuaikan untuk rekening yang
     dinyatakan rekonsiliasi. (Merah sebelum CB3.)
  f. Tidak ada pencocokan yang tercatat tanpa identitas sesi nyata. (Merah sebelum CB4.)

LANGKAH
1. INVESTIGASI — konfirmasi keempat cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca `FIRMFIN.bankRecon` dan `data_part2.ts:8-20` lebih dulu, lalu nyatakan dengan
   kalimatmu sendiri: apa beda `FX_RATES` dan `FX_BOOK`, mana yang dipakai untuk apa,
   dan angka mana yang sudah masuk buku besar sejak #249.
   Periksa juga status prompt 27-regref — kalau pola pendaftaran set sudah mendarat,
   ikuti; jangan membuat cara kedua.
2. RENCANA — termasuk: bentuk set kurs (satu set untuk pasar & buku, atau dua?),
   `enforcement` yang kamu pilih, dan apa yang dilihat pengguna ketika kurs tak
   tercakup. Kalau menurutmu kurs buku dan kurs pasar memerlukan perlakuan masa yang
   berbeda, USULKAN dan tunggu — itu keputusan akuntansi.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — CB1, CB3, CB4, dan CB2 hanya bila langkah pembuktiannya merah.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. WAJIB tetap hijau:
   cash_bank_recon · firm_bridge · firmfin_ledger · firmfin_budget · keempat uji regref.
   Bila angka revaluasi berubah, jelaskan sebagai KOREKSI dengan angkanya — jangan
   mengembalikannya.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau (dan mana yang lahir
   hijau) · hasil pembuktian CB2 dalam angka · alasan gerbang Q-2 untuk ekspor
   rekonsiliasi · yang TIDAK dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN mengarang kurs untuk tanggal mana pun, dan jangan menyalin kurs masa lalu
  ke masa berikutnya.
- ⛔ JANGAN menghidupkan kembali indikator "bank feed" atau integrasi bank dalam bentuk
  apa pun — chip itu dicabut dengan alasan yang tertulis.
- ⛔ JANGAN mengubah saldo bank menjadi turunan; ia data eksternal dan memang literal.
- JANGAN menyentuh `FirmTreasury` (lingkup prompt 31) atau `FixedAssets` di berkas
  yang sama — termasuk literal nama firma di baris 82.
- JANGAN mengubah kontrak `FIRMFIN.bankRecon` / `reconciliations` kecuali kamu
  membuktikan cacat di sana; kalau ada, laporkan dulu.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan,
    dan uji yang lahir hijau disebut apa adanya.
[ ] `npm run verify` hijau dari root; uji keuangan & regref tetap hijau.
[ ] Kurs punya masa berlaku, terdaftar di katalog regref, dan MEMBLOKIR revaluasi
    ketika masanya tak tercakup.
[ ] Tidak ada satu pun kurs baru yang dikarang.
[ ] Hubungan antara total kas yang ditampilkan dan akun kontrolnya sudah DIBUKTIKAN —
    dengan angka, bukan kesan.
[ ] Rekonsiliasi bank dapat diekspor tersegel, angkanya identik dengan yang dirender.
[ ] Jejak pencocokan memakai identitas sesi nyata.
[ ] `treasury` dan `fixedassets` di berkas yang sama tidak tersentuh.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
