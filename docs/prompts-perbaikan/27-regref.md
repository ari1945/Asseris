# Prompt perbaikan — modul `regref` (Data Referensi Regulatori)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-B (klok) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini adalah yang paling baik dirancang dari semua
> yang saya periksa. Ia merender `regrefCatalog()` — daftar yang SAMA dengan yang
> ditegakkan gerbang uji, sehingga "yang tampil" dan "yang ditegakkan" tak dapat
> berbeda. Taksonomi statusnya menolak menebak ('tak tercakup' ≠ 'belum dicocokkan'),
> dan yang menyangkut uang MENGHENTIKAN perhitungan alih-alih memakai dasar tahun lain.
> Kontrolnya berlabel, natif, dan memakai klok SSOT.
>
> Karena itu tugas di sini BUKAN memperbaiki modulnya, melainkan **menutup lubang yang
> justru menjadi alasan modul ini dibuat**: ada besaran regulatori lain di aplikasi
> yang berubah menurut kalender, tidak terdaftar di katalog, dan mengulang persis
> cacat yang Tahap A hapus dari tarif payroll — punya field tahun yang dipakai sebagai
> LABEL, bukan sebagai pemilih.
>
> ⛔ **Tahap B (menyunting data regulatori lewat UI: atestasi + RBAC + jejak audit)
> MENUNGGU KEPUTUSAN ARI. Jangan mulai, jangan merancang, jangan "menyiapkan
> fondasinya".**

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum terdaftar" tanpa grep; sertakan
   perintah dan hasilnya.
2. TAK ADA "YANG TERDEKAT". Data yang berubah menurut kalender tidak boleh dihitung
   dengan dasar masa lain. Yang menyangkut uang MEMBLOKIR; yang tidak, dihitung dengan
   penanda yang terlihat.
3. FIELD TAHUN BUKAN PEMILIH SAMPAI IA MEMILIH. Sebuah record dengan `year: 2026`
   yang hanya dipakai sebagai teks di layar TIDAK membuat data itu bermasa berlaku.
   Ia justru lebih berbahaya daripada tanpa tahun sama sekali, karena tampak benar.
4. GERBANG COCOKKAN TIPE, BUKAN NAMA. Gerbang cakupan yang mencari nama-nama tertentu
   akan hijau selamanya untuk besaran baru yang belum kamu pikirkan. Cocokkan BENTUK
   data (bermasa berlaku / tidak), bukan daftar nama.
5. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
6. TIDAK ADA ASUMSI DIAM-DIAM, DAN TIDAK ADA ANGKA REGULATORI KARANGAN. Kalau sebuah
   tarif/ambang/tanggal untuk masa mendatang belum kamu punya dokumennya, JANGAN
   mengarang nilainya dan jangan menyalin nilai tahun sebelumnya. Daftarkan masanya
   sebagai belum tercakup dan biarkan gerbangnya bekerja.
7. `:any` baru = lint merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: perluas cakupan registri data regulatori ke besaran-besaran yang saat ini
berada di luarnya, dan hapus pola "tahun sebagai label" di tempat ia masih hidup.

KONTEKS MODUL
- id modul: regref (grup "SDM & Kepatuhan")
- berkas: migration/src/view_regref.tsx (159 baris) ·
  migration/src/regref_catalog.ts (katalog) · migration/src/canon_regref.ts (mesin:
  regrefFor · regrefIssues · regrefSpan)
- uji yang sudah ada (JANGAN dirusak): regref_catalog.test.ts ·
  regref_registry.test.ts · regref_pph21_period.test.ts · bpjs_period_gate.test.ts
- PRD: docs/prd-regulatory-reference-annual.md (Tahap A)

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- View-nya benar: memakai AMS.TODAY, input `asOf` berlabel, tombol natif, tanpa
  kontrol mati, tanpa literal nama firma, tanpa angka hardcode.
- Katalog memuat LIMA set: bpjs · ter · ptkp · biaya-jabatan · hari-libur.
- Mesin `regrefFor` sudah membedakan blokir vs peringatan, dan status 'no-coverage'
  vs 'unverified'. Kontrak ini benar — bangun di atasnya, jangan menggantinya.

CACAT / LUBANG CAKUPAN

R1 · Kewajiban PPL (SKP) mengulang cacat yang Tahap A hapus  [P0 — kerjakan]
    data_part1.ts:524
      const CPE_REQ = { annual: 40, structured: 30, unstructuredCap: 10, year: 2026 };
    SATU record, bukan himpunan bermasa berlaku. Field `year` dipakai hanya sebagai
    teks di layar — konfirmasi sendiri:
      grep -rn "CPE_REQ" migration/src
    Pemakaian yang ada: view_people.tsx:242/253/287 dan view_bo3.tsx:546 mencetak
    `req.year` sebagai label; ethics_compliance.ts:31 mengambil `CPE_REQ?.year || 2026`.
    Tidak ada satu pun yang MEMILIH set menurut tanggal.
    Akibat pada 1 Januari 2027: aplikasi menampilkan "PPL 2026 · 40 SKP", menghitung
    kepatuhan PPL terhadap kewajiban 2026, dan memberi label 2026 — sementara seluruh
    firma sudah berada di tahun berikutnya. Tidak ada yang merah, tidak ada peringatan.
    Ini persis pola `PAYROLL_RATES.period` yang Tahap A cabut, hidup di tempat lain.
    Kerjakan: jadikan kewajiban PPL himpunan bermasa berlaku dan daftarkan sebagai
    entri katalog `regrefCatalog()`, dengan `enforcement` yang kamu argumentasikan
    (PPL bukan uang, tetapi ia menentukan status izin — nyatakan pilihanmu dan
    alasannya di laporan).
    JANGAN mengarang angka kewajiban 2027. Bila masanya belum tercakup, itulah yang
    harus ditampilkan.

R2 · Batas rotasi partner tidak terdaftar sebagai data regulatori  [P1 — kerjakan]
    data_licensing.ts:89  `const tenure = ind.tenure || 0, limit = ind.rotationLimit || 5;`
    Batas rotasi berasal dari UU 5/2011, PP 20/2015, dan POJK 13/2017 — ia berubah
    ketika regulasinya berubah, dan pernah berubah. Sekarang ia tersimpan sebagai
    angka per-orang di data independensi, dengan fallback literal `5`, tanpa masa
    berlaku dan tanpa dasar hukum yang tercatat.
    Modul `independence` memakai angka ini untuk memunculkan peringatan "Rotasi
    partner wajib … (UU 5/2011 & POJK 13/2017)" — mengutip regulasi atas angka yang
    tidak tertaut ke regulasi mana pun.
    Kerjakan: daftarkan batas rotasi sebagai set bermasa berlaku di katalog, dengan
    `basis` yang menyebut dasar hukumnya. Nilai per-orang tetap boleh ada (klien
    emiten vs non-emiten berbeda), tetapi BATASNYA berasal dari registri.
    Kalau ternyata pemetaan batas → jenis klien lebih rumit daripada satu angka,
    BERHENTI dan tanyakan; jangan menyederhanakan sendiri.

R3 · Tarif PPh badan sebagai fallback literal  [P1 — kerjakan]
    data_proforma.ts:129  `const RATE = C ? C.RATE : 0.22;`
    22% adalah tarif statuter yang pernah berubah (25% → 22%) dan dapat berubah lagi.
    Ia dipakai untuk perhitungan yang menyangkut UANG, jadi menurut aturan modul ini
    ia semestinya MEMBLOKIR bila masanya tak tercakup — bukan diam-diam memakai 0,22.
    Kerjakan: daftarkan sebagai set bermasa berlaku, `enforcement: 'block'`.
    Periksa dulu apakah `C.RATE` sudah berasal dari sumber yang lebih baik; kalau ya,
    perbaikannya adalah menghapus fallback-nya, bukan menambah registri kedua.

R4 · Cakupan registri belum pernah diuji sebagai CAKUPAN  [P0 — kerjakan]
    Ketiga temuan di atas saya temukan dengan membaca, bukan dengan gerbang. Artinya
    besaran keempat, kelima, dan seterusnya akan lolos dengan cara yang sama.
    Kerjakan: tulis gerbang CAKUPAN yang mencocokkan BENTUK, bukan nama. Gagasan yang
    harus kamu kembangkan sendiri — misalnya: setiap konstanta data yang membawa
    penanda masa (year/period/berlaku/efektif) WAJIB terdaftar di `regrefCatalog()`,
    atau terdaftar eksplisit sebagai pengecualian beralasan di satu tempat.
    Gerbang yang hanya memeriksa "kelima set lama masih ada" adalah tautologi —
    jangan menulis itu.
    Lakukan juga sapuan manual sekali dan LAPORKAN hasilnya secara lengkap: besaran
    apa saja di `migration/src/data_*.ts` yang berubah menurut kalender/regulasi tetapi
    tidak terdaftar. Kandidat untuk diperiksa (bukan daftar lengkap, dan belum
    diverifikasi semuanya): tarif PPh 23, ambang PPN, tarif denda/sanksi pajak, kurs
    pajak, UMP, ambang PMK yang dipakai modul pajak, kewajiban pelaporan PPPK/OJK.

GERBANG YANG HARUS KAMU TULIS
Berkas uji .ts WAJIB bebas `any`.
  a. Gerbang cakupan berbasis BENTUK (R4). Ia harus MERAH sekarang karena CPE_REQ
     tidak terdaftar, dan tetap merah bila seseorang menambah konstanta bermasa baru
     tanpa mendaftarkannya.
  b. Untuk setiap set yang kamu tambahkan: tanggal di luar masa yang terdaftar
     menghasilkan 'no-coverage' — dan untuk yang `enforcement: 'block'`, perhitungan
     yang bergantung padanya benar-benar BERHENTI, bukan memakai nilai lain.
     (Uji perilaku pemblokirannya, bukan keberadaan flag-nya.)
  c. PPL: tanggal 1 Januari tahun setelah masa terakhir yang terdaftar TIDAK
     menghasilkan kewajiban tahun sebelumnya, dan TIDAK menampilkan label tahun lama.
     (Merah sebelum R1.)
  d. Tidak ada label tahun yang diambil dari record tanpa pemilihan masa — gerbang
     sumber atas pemakaian `CPE_REQ.year` sebagai teks. (Merah sebelum R1.)

LANGKAH
1. INVESTIGASI — konfirmasi R1–R3 di HEAD sekarang; tempelkan bukti barisnya. Baca
   canon_regref.ts dan regref_catalog.ts seluruhnya lebih dulu, lalu nyatakan dengan
   kalimatmu sendiri: bentuk sebuah "set" itu apa, apa yang membuat `blocked` bernilai
   true, dan apa beda 'unverified' dengan 'no-coverage'. Jangan menebak dari view.
2. RENCANA — termasuk: `enforcement` apa untuk tiap set baru dan alasannya; dan
   bagaimana bentuk gerbang cakupan R4 akan menangkap konstanta yang belum ada.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya. Gerbang cakupan
   WAJIB merah sebelum perbaikan; kalau ia hijau sejak awal, rancanganmu salah.
4. IMPLEMENTASI — R1, R2, R3, R4.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Keempat uji regref lama
   WAJIB tetap hijau. Periksa juga bahwa modul `cpe`, `independence`, dan modul pajak
   masih menampilkan angka yang benar untuk AMS.TODAY sekarang.
6. LAPORAN — sebelum→sesudah · uji merah→hijau · argumentasi `enforcement` tiap set
   baru · HASIL SAPUAN LENGKAP R4 (daftar besaran bermasa yang belum terdaftar, termasuk
   yang kamu putuskan tidak perlu didaftarkan, dengan alasannya) · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN mengerjakan Tahap B (menyunting data regulatori lewat UI, atestasi, RBAC,
  jejak audit). Itu menunggu keputusan Ari. Jangan pula membuat "persiapan" untuknya.
- ⛔ JANGAN mengarang nilai regulatori untuk masa yang dokumennya belum ada. Ada tiga
  item data yang memang sedang ditunggu dari Ari (Lampiran PMK 168, cuti bersama SKB
  2026, konfirmasi batas Jaminan Pensiun). Kalau pekerjaanmu menyentuh salah satunya,
  daftarkan masanya sebagai belum tercakup dan sebutkan di laporan — jangan mengisi.
- JANGAN mengubah kontrak `regrefFor`/`regrefIssues`/`regrefSpan` kecuali kamu
  membuktikan cacat di sana; kalau ada, laporkan dulu.
- JANGAN mengubah tata letak view_regref.tsx selain yang dibutuhkan set baru.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; keempat uji regref lama tetap hijau.
[ ] Gerbang cakupan berbasis BENTUK ada, dan terbukti merah sebelum perbaikan.
[ ] Kewajiban PPL bermasa berlaku dan terdaftar; 1 Januari tahun tak tercakup tidak
    menghasilkan kewajiban tahun lama maupun label tahun lama.
[ ] Batas rotasi partner berasal dari registri bertanggal dengan dasar hukum tercatat.
[ ] Tarif PPh badan terdaftar dan MEMBLOKIR bila masanya tak tercakup.
[ ] Tidak ada satu pun nilai regulatori baru yang dikarang.
[ ] Tahap B tidak disentuh sama sekali.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan memuat hasil sapuan cakupan yang lengkap.
```
