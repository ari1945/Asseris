# Prompt perbaikan — modul `treasury` (Anggaran & Arus Kas)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-B (klok/kebijakan) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini terbelah dua. Tab **Anggaran vs Aktual** sudah
> benar dan tidak boleh disentuh — aktual diturunkan dari saldo buku besar lewat
> `FIRMFIN.budget({ coa })`, dan komentar di baris 43-48 mencatat bahwa modul ini dulu
> menjumlahkan `actual` sendiri sebagai salinan keempat dari aritmetika yang sudah ada.
>
> Tab **Forecast Arus Kas** adalah kebalikannya: deret enam bulan yang literal, dengan
> skenario berupa pengali datar. Sebagian dari itu **sudah diungkap** di catatan kaki
> (mekanika ×1,12/×0,97 disebut apa adanya) — pertahankan pengungkapan itu. Yang TIDAK
> diungkap justru yang lebih mendasar: bahwa deret dasarnya sendiri adalah angka seed,
> bukan turunan jatuh tempo piutang, utang, dan pajak.
>
> Penggantinya adalah **PR-6**, arc yang sudah disetujui. Prompt ini TIDAK
> mengerjakannya — ia membereskan yang dapat dibereskan tanpa menyentuh arc itu.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya.
2. SSOT. Angka, tanggal, dan AMBANG KEBIJAKAN berasal dari satu tempat bernama —
   bukan tersebar sebagai konstanta di dalam tampilan.
3. PENGUNGKAPAN HARUS MENUTUP HAL YANG PALING MENDASAR LEBIH DULU. Mengungkap mekanika
   skenario sambil mendiamkan bahwa deret dasarnya karangan adalah pengungkapan yang
   menyesatkan justru karena ia terdengar teliti.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambang kebijakan keuangan bukan milikmu untuk ditetapkan.
6. Kontrol NATIVE · skala tipografi 8 ukuran · WARNA LEWAT TOKEN, bukan hex ·
   `:any` baru = lint merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: jujurkan tab Forecast Arus Kas, cabut ambang kebijakan dan tahun yang tertanam
di tampilan, dan bereskan utang konvensi di berkas ini — tanpa menyentuh PR-6.

KONTEKS MODUL
- id modul: treasury (grup "Keuangan Firma (ERP)")
- berkas: migration/src/view_firmtreasury.tsx → fungsi `FirmTreasury()` baris 36-171
  dan `BudgetLineDrill()` baris 172-226.
  Berkas ini JUGA memuat modul `cashbank` (baris 227+) dan `fixedassets` (baris 409+) —
  JANGAN sentuh keduanya.
- deret forecast: `AMS.CASH_FORECAST` (data_part2.ts:106) — enam baris literal
  {m, open, inflow, outflow} mulai 'Mar'
- mesin anggaran: `FIRMFIN.budget({ coa })` — aktual dari buku besar
- PRD induk: docs/prd-firm-erp-deepening.md — **PR-6** ("Forecast arus kas dari
  register. Basis = kontrol kas; inflow/outflow dari jatuh tempo AR/AP/pajak; skenario
  jadi asumsi bernama atas komponen, bukan pengali datar") berstatus **Approved,
  belum dikerjakan**.

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Tab Anggaran vs Aktual sudah benar: `B = FIRMFIN.budget({ coa }).lines` dengan aktual
  turunan buku besar. Headline, tabel, drill-down, dan ekspor semuanya membacanya.
  JANGAN menghitung ulang apa pun di sini.
- Catatan kaki tab arus kas sudah menyebut mekanika skenario (×inF/×outF) dan ambang
  zona perhatian secara terbuka. Pertahankan sifat terbukanya.
- Ekspor XLSX tersegel sudah ada.

CACAT

TR1 · Pengungkapan menutup yang kecil dan mendiamkan yang besar  [P0 — murah, penting]
    Catatan kaki tab arus kas menjelaskan bahwa skenario mengalikan arus masuk ×inF dan
    arus keluar ×outF, dan bahwa saldo < Rp 7 M ditandai zona perhatian. Yang tidak
    disebut sama sekali: seluruh deret dasarnya — saldo awal, arus masuk, arus keluar
    untuk enam bulan — adalah angka seed di `data_part2.ts:106`, bukan turunan jatuh
    tempo piutang, utang, dan pajak yang sebenarnya ada di aplikasi ini.
    Pembaca yang membaca catatan kaki itu justru menyimpulkan sebaliknya: bahwa yang
    disintesis hanyalah faktor skenarionya.
    Kerjakan: nyatakan basis forecast apa adanya, dengan cara yang sama jujurnya seperti
    modul `revenue` menyatakan roll-forward-nya ilustrasi (lihat pita di
    view_firmrevenue.tsx tab roll-forward — tiru nada dan letaknya, jangan salin
    kalimatnya). Sebut juga apa penggantinya (forecast berbasis register, PR-6).
    JANGAN menghapus pengungkapan skenario yang sudah ada.

TR2 · Ambang kebijakan likuiditas tertanam sebagai angka ajaib, empat kali  [P1]
    `7000` muncul di baris 103, 146, 148, dan 159 — kartu KPI, label grafik, warna
    batang, dan kolom saldo akhir. Ia menentukan kapan kas firma disebut "zona
    perhatian".
    Itu kebijakan keuangan firma, bukan detail tampilan: siapa yang menetapkan Rp 7 M,
    atas dasar apa, dan kapan ia ditinjau? Empat salinan berarti mengubahnya di satu
    tempat menghasilkan layar yang berselisih dengan dirinya sendiri.
    Kerjakan: pindahkan ke satu parameter bernama di lapisan data/kebijakan (rumah yang
    dituju Program B untuk kebijakan firma yang terpecah adalah `data_firmfin`), dengan
    dasar yang tercatat. Nilainya JANGAN diubah — memindahkan bukan menetapkan ulang.
    Kalau menurutmu ambangnya semestinya turunan (mis. n bulan beban rata-rata alih-alih
    angka mati), USULKAN dan berhenti; itu keputusan Ari.

TR3 · Tahun dan awal periode tertanam di tampilan  [P1]
    Baris 159 dan payload ekspor menulis `r.m + ' 2026'`. Deret seed-nya sendiri mulai
    'Mar' — cocok dengan `AMS.TODAY` hari ini hanya karena kebetulan seeding.
    Akibatnya "forecast bergulir 6 bulan" tidak bergulir: ketika klok SSOT bergerak ke
    tahun berikutnya, label bulan tetap, tahunnya tetap 2026, dan tak ada yang merah.
    Kerjakan: label periode diturunkan dari klok SSOT. Bila deret seed tidak lagi
    sejalan dengan klok, itu HARUS terlihat — bukan ditutup dengan label yang menurut.
    Ini bukan PR-6: kamu tidak diminta menurunkan angkanya, hanya berhenti berbohong
    tentang periodenya.

TR4 · Nama firma hardcode di dalam ekspor tersegel  [P2]
    `firm: 'KAP Wijaya Hartono & Rekan'` pada payload `amsExportXlsx`.
    Pakai SSOT (`AMS.FIRM?.name` / `FIRM.short`), seperti view_pc_org.tsx sudah lakukan.
    Perbaiki DI BERKAS INI SAJA — jangan menyapu repo.

TR5 · Baris anggaran adalah kontrol palsu, dan warna grafik memakai hex mentah  [P1]
    · `<tr … onClick={() => setSelLine(...)} style={{ cursor:'pointer' }}>` pada tabel
      Anggaran: tidak fokusabel, tidak menanggapi Enter/Space — drill-down mustahil
      tanpa tetikus.
    · Baris 148 memakai gradien hex mentah (`#d99000`, `#9a6a00`, `#0a6b8a`, `#005085`)
      padahal repo mewajibkan token warna. Tidak ada gerbang yang menangkapnya untuk
      berkas ini — cockpit punya gerbangnya sendiri, berkas ini tidak.
    Perbaiki keduanya. Beri cincin fokus yang terlihat.

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji khusus hari ini)
Ekstrak derivasi murni (penerapan skenario, deret berjalan, penentuan zona perhatian,
pelabelan periode) ke berkas .ts murni dengan ekspor bernama; perilaku tidak berubah.
Berkas uji .ts WAJIB bebas `any`.
  a. Ambang zona perhatian berasal dari SATU sumber: mengubah parameternya mengubah
     KEEMPAT tempat sekaligus. (Merah sebelum TR2 — dan tidak bisa dipuaskan dengan
     mendeklarasikan konstanta lokal lalu memakainya empat kali di berkas yang sama;
     ujinya harus membaca dari lapisan data.)
  b. Label periode mengikuti klok SSOT: majukan `AMS.TODAY` satu tahun → label tahun
     ikut maju. (Merah sebelum TR3.)
  c. Deret berjalan konsisten: saldo akhir bulan n == saldo awal bulan n+1, dan saldo
     akhir == saldo awal + arus bersih untuk setiap baris. Gerbang bentuk, bukan nilai —
     ia harus tetap hijau setelah PR-6 mengganti sumber angkanya.
  d. Skenario tidak mengubah saldo awal periode pertama. (Invarian yang sekarang benar;
     tulis supaya PR-6 tidak merusaknya diam-diam. Kalau ia hijau sejak awal, katakan
     begitu — JANGAN mengaku telah memerahkannya.)
  e. Gerbang sumber untuk berkas ini: nol literal nama firma, nol warna heksadesimal,
     nol `<tr onClick>` — buang komentar dulu sebelum memindai (pola helper `kode()`
     di cockpit_conventions.test.ts). Batasi pemindaian pada rentang `FirmTreasury`
     bila `cashbank`/`fixedassets` masih memuat pelanggaran yang bukan lingkupmu —
     dan LAPORKAN apa yang kamu temukan di dua modul itu tanpa memperbaikinya.

LANGKAH
1. INVESTIGASI — konfirmasi kelima cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca `FIRMFIN.budget` dan `data_part2.ts:106` lebih dulu, lalu nyatakan dengan
   kalimatmu sendiri: mana bagian modul ini yang sudah berbasis buku besar dan mana
   yang tidak. Kalau kamu tidak dapat menjawab itu, kamu belum siap menulis kode.
2. RENCANA — termasuk bunyi pengungkapan TR1 dan rumah parameter TR2.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — TR1 sampai TR5.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. WAJIB tetap hijau:
   firmfin_budget · firmfin_ledger · cash_bank_recon · css_tokens. Angka pada tab
   Anggaran TIDAK boleh bergeser sama sekali — kalau bergeser, kamu menyentuh yang
   tidak seharusnya.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · usulan ambang turunan
   (bila kamu punya) · pelanggaran token/kontrol yang kamu temukan di `cashbank` dan
   `fixedassets` (laporan saja) · yang TIDAK dikerjakan + alasannya · asumsi
   (seharusnya nol).

BATAS
- ⛔ JANGAN mengerjakan PR-6. Menurunkan inflow/outflow dari jatuh tempo AR/AP/pajak
  dan mengubah skenario menjadi asumsi bernama adalah arc tersendiri yang sudah
  disetujui. Kalau menurutmu TR1 tidak dapat diselesaikan tanpa PR-6, KATAKAN dan
  berhenti — pengungkapan yang jujur justru tidak memerlukannya.
- ⛔ JANGAN mengubah nilai ambang Rp 7 M. Memindahkan bukan menetapkan ulang.
- ⛔ JANGAN menyentuh tab Anggaran vs Aktual selain kontrol palsu di TR5.
- JANGAN menyentuh `CashBank` atau `FixedAssets` di berkas yang sama — laporkan saja.
- JANGAN menyapu literal nama firma atau hex ke seluruh repo.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; angka tab Anggaran tidak bergeser.
[ ] Tab arus kas menyatakan basis forecastnya apa adanya, dan pengungkapan skenario
    yang lama masih ada.
[ ] Ambang zona perhatian berasal dari satu parameter bernama, nilainya tidak berubah.
[ ] Label periode mengikuti klok SSOT; tidak ada tahun literal.
[ ] Nol literal nama firma dan nol hex di rentang `FirmTreasury`, dijaga gerbang sumber.
[ ] Drill-down baris anggaran dapat dioperasikan penuh dengan papan-ketik.
[ ] PR-6 tidak disentuh; `cashbank` & `fixedassets` tidak disentuh.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan memuat temuan di dua modul tetangga tanpa memperbaikinya.
```
