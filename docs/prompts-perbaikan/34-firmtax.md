# Prompt perbaikan — modul `firmtax` (PPh Badan Firma)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-E (ledger/SoD) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini sudah melakukan sesuatu yang benar dan patut
> ditiru modul lain — ia **membedakan baris yang berasal dari sumber kanonik dari baris
> yang tidak**. Baris PPh 23 ditarik dari register `TAX23` dan diberi chip hijau
> bertuliskan "SSOT" beserta tautan ke modul asalnya; baris lain tidak. Pertahankan
> mekanisme itu.
>
> Masalahnya: baris yang TIDAK bertanda itu bukan sekadar angka ilustratif — ia berupa
> **bukti potong dengan nomor dokumen lengkap** ("1.2-02.26-0001849",
> "1.1-02.26-0009921"), atas nama pihak tertentu, dengan DPP dan pajak terutang. Nomor
> bukti potong adalah artefak dunia nyata yang dilaporkan ke DJP. Menampilkannya
> berdampingan dengan baris ber-chip SSOT, dibedakan hanya oleh ADA-TIDAKNYA chip,
> memberi beban pembuktian kepada pembaca — padahal yang seharusnya berbeban adalah
> yang mengarang.
>
> Satu hipotesis saya sendiri GUGUR saat diperiksa, dan saya catat supaya kamu tidak
> mengulanginya: `window.TAX23` TIDAK berisiko undefined. `data_pph23.ts`
> diimpor eager di `main.tsx:29` (FASE 1), jadi cabang fallback `T23 ? … : null`
> praktis tak pernah aktif. Yang tersisa hanyalah soal konvensi impor — bukan cacat
> korektif.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya. Contoh nyata di modul ini: `window.TAX23` TERLIHAT rawan undefined karena
   view-nya lazy — padahal penerbitnya diimpor eager. Periksa jalur impornya, jangan
   menyimpulkan dari pola.
2. NOMOR DOKUMEN RESMI TIDAK BOLEH DIKARANG. Nomor bukti potong, nomor faktur pajak,
   dan NPWP adalah artefak yang dilaporkan ke otoritas. Angka boleh ilustratif;
   identitas dokumen tidak.
3. YANG NYATA DAN YANG BUKAN HARUS DIBEDAKAN SECARA POSITIF. Menandai yang nyata
   sambil membiarkan yang tidak nyata polos berarti ketiadaan tanda menjadi satu-satunya
   petunjuk — dan ketiadaan tidak terbaca. Yang ilustratif ditandai sebagai ilustratif.
4. SATU TARIF, SATU TEMPAT. Tarif statuter yang disalin ke dalam modul adalah salinan
   kedua yang akan basi diam-diam.
5. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
6. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
7. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: hentikan modul ini menampilkan bukti potong dengan nomor dokumen karangan,
tandai yang ilustratif secara positif, dan bereskan identitas jejak — tanpa menyentuh
PR-4.

KONTEKS MODUL
- id modul: firmtax (grup "Keuangan Firma (ERP)")
- berkas: migration/src/view_firmtax.tsx (295 baris)
- sumber kanonik yang sudah dipakai: `TAX23` (data_pph23.ts, eager di main.tsx:29;
  ekspor ESM tersedia di data_pph23.ts:226)
- mesin PPh 21 yang SUDAH ADA di aplikasi: modul `payroll` + `PAYROLL_RATES` (TER)
- state: `firmtax` lewat `useAmsPersist`; tulis digerbang `CAP.FIRMFIN_EDIT`
- PRD induk: docs/prd-firm-erp-deepening.md — **PR-4 Approved, belum dikerjakan**:
  "PPh Badan firma memakai mesin PSAK 46 milik firma sendiri. Beda temporer dari
  register; rekonsiliasi fiskal komersial→fiskal; baris `2-200` di `reconciliations()`".
  Urutan mengikat: PR-2 → PR-4.

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Baris PPh 23 SUDAH ditarik dari register kanonik dan diberi chip "SSOT" + tautan ke
  modul asalnya (baris 44, 47, 169-170). Mekanisme pembeda ini benar — perluas, jangan
  hapus.
- Gerbang SoD `CAP.FIRMFIN_EDIT` sudah ada pada `markFiled`, dengan alasan yang tepat.
- `window.TAX23` tidak berisiko undefined (penerbitnya eager). Bukan cacat korektif.

CACAT

FT1 · Bukti potong dengan nomor dokumen karangan  [P0]
    view_firmtax.tsx:46-50, `ebupotFeb` menggabungkan baris kanonik PPh 23 dengan DUA
    baris literal:
      { no: '1.2-02.26-0001849', jenis: 'PPh 4(2)', pihak: 'PT Properti Graha Kantor',
        dpp: 480_000_000, rate: '10%', tax: 48_000_000 }
      { no: '1.1-02.26-0009921', jenis: 'PPh 21', pihak: '38 karyawan (kolektif)',
        dpp: 1_400_000_000, rate: 'TER', tax: 210_000_000 }
    Keduanya berbentuk bukti potong lengkap: nomor seri, jenis pajak, pihak yang
    dipotong, DPP, tarif, dan pajak terutang. Nomor bukti potong adalah identitas
    dokumen yang dilaporkan ke DJP — mengarangnya berbeda kelas dari mengarang angka.
    Yang PPh 21 lebih berat lagi: aplikasi ini PUNYA mesin PPh 21 (modul `payroll`
    dengan `PAYROLL_RATES` dan skema TER). Modul ini mengarang angkanya alih-alih
    memakai mesin yang ada — pola "mesin yang benar sudah ada dan modulnya memakai
    yang salah".
    Kerjakan, berurutan:
      (a) SEGERA — hapus nomor dokumen karangan. Nomor bukti potong hanya boleh tampil
          bila berasal dari register nyata.
      (b) PPh 21 — sambungkan ke mesin payroll bila datanya memang tersedia untuk masa
          yang ditampilkan. Grep dulu; kalau tersedia, pakai. Kalau TIDAK tersedia untuk
          masa itu, JANGAN mengarang: tampilkan baris itu sebagai belum tersedia.
      (c) PPh 4(2) — periksa apakah ada register sewa/jasa di aplikasi yang dapat
          menjadi sumbernya. Kalau tidak ada, baris itu ditandai ilustratif (lihat FT2)
          atau dihapus; katakan mana yang kamu pilih dan mengapa.

FT2 · Yang nyata ditandai, yang tidak nyata dibiarkan polos  [P0 — pasangan FT1]
    Chip "SSOT" hanya menempel pada baris kanonik. Baris lain tidak membawa tanda apa
    pun, sehingga pembaca harus menyimpulkan status sebuah baris dari KETIADAAN chip —
    dan ketiadaan tidak terbaca, apalagi dalam tabel yang sebagian besar barisnya
    bertanda.
    Kerjakan: setiap baris yang tidak berasal dari register nyata WAJIB membawa penanda
    positifnya sendiri (mis. "ilustrasi"), dengan bobot visual yang setara. Aturan yang
    sama berlaku untuk seluruh tabel di modul ini, bukan hanya e-bupot.

FT3 · Pelaku jejak berasal dari seed statis  [P1]
    view_firmtax.tsx:32 — `const who = (AMS.USER && AMS.USER.name) || 'Pengguna';`
    dipakai pada `logActivity` saat `markFiled` — menandai sebuah kewajiban pajak
    telah dilaporkan. Itu tindakan kepatuhan; jejaknya harus menyebut pelaku yang
    sebenarnya. `AMS.USER` adalah data seed.
    Pakai `useCurrentAuditor()` (identitas sesi nyata W7; contoh di
    view_mytasks_parts.tsx:88). Bila identitas tak tersedia, penandaan TIDAK dilakukan.

FT4 · Tarif PPh badan disalin ke dalam modul  [P1 — perbaiki setengahnya, laporkan sisanya]
    view_firmtax.tsx:67 — `const RATE = 0.22;` dipakai untuk seluruh perhitungan pajak
    tangguhan. Tarif statuter yang pernah berubah (25% → 22%), disalin ke dalam view.
    Salinan lain ada di `data_proforma.ts:129` (`const RATE = C ? C.RATE : 0.22`).
    Kerjakan: jangan menambah salinan ketiga, dan jangan menetapkan sendiri rumah
    barunya. Yang benar adalah tarif ini menjadi set bermasa berlaku di
    `regrefCatalog()` — itu lingkup prompt 27-regref (R3). Periksa apakah prompt itu
    sudah dikerjakan:
      · sudah → pakai set yang ada, hapus `RATE` lokal;
      · belum → LAPORKAN sebagai temuan tertaut, biarkan `RATE` di tempatnya, dan
        JANGAN memindahkannya ke berkas data sebagai konstanta baru.

FT5 · Impor lewat global, bukan ESM  [P2]
    Baris 41 dan 46 membaca `window.TAX23`, padahal `data_pph23.ts:226` sudah
    mengekspor `TAX23` sebagai modul ESM. CLAUDE.md §3.1 mendaftar global yang masih
    boleh dipakai; `TAX23` tidak termasuk.
    Kerjakan: ganti ke impor ESM. Karena penerbitnya eager, cabang `T23 ? … : null`
    menjadi kode mati setelah itu — sederhanakan, dan katakan di laporan bahwa cabang
    itu memang tak pernah aktif (jangan melaporkannya sebagai bug yang kamu perbaiki).

GERBANG YANG HARUS KAMU TULIS
Ekstrak perakitan baris e-bupot & rekonsiliasi ke fungsi murni ber-ekspor bernama.
Berkas uji .ts WAJIB bebas `any`.
  a. Gerbang sumber: nol nomor bukti potong berpola dokumen resmi yang tertanam sebagai
     literal di view_firmtax.tsx — buang komentar dulu sebelum memindai (pola helper
     `kode()` di cockpit_conventions.test.ts). (Merah sebelum FT1a.)
  b. Setiap baris yang dirender membawa penanda asal: kanonik ATAU ilustrasi — tidak
     ada baris tanpa penanda. (Merah sebelum FT2.)
  c. Baris PPh 23 berubah ketika register `TAX23` berubah — pembuktian bahwa ia benar
     benar terhubung, bukan kebetulan cocok. (Kemungkinan sudah hijau; kalau ya,
     katakan begitu dan JANGAN mengaku telah memerahkannya.)
  d. Penandaan "sudah lapor" tidak tercatat tanpa identitas sesi nyata.
     (Merah sebelum FT3.)
  e. Bila FT4 jalur "sudah": tanggal di luar masa tarif yang terdaftar menghentikan
     perhitungan pajak tangguhan, bukan memakai 22% diam-diam.

LANGKAH
1. INVESTIGASI — konfirmasi FT1–FT5 di HEAD sekarang; tempelkan bukti barisnya.
   Sebelum FT1b, grep mesin PPh 21 di modul `payroll` dan nyatakan dengan kalimatmu
   sendiri: data apa yang ia butuhkan, untuk masa apa ia punya data, dan apakah masa
   yang ditampilkan e-bupot termasuk di dalamnya. Jangan menebak.
   Periksa juga status prompt 27-regref untuk FT4.
2. RENCANA — termasuk keputusanmu untuk FT1c (PPh 4(2): sambung, tandai, atau hapus)
   beserta alasannya.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — FT1, FT2, FT3, FT5; FT4 sesuai jalurnya.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Modul `tax` (PPh 23) dan
   `payroll` TIDAK boleh berubah perilakunya. Bila angka di modul ini bergeser karena
   akhirnya memakai mesin payroll, jelaskan sebagai KOREKSI dengan angkanya.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau (dan mana yang lahir
   hijau) · nasib tiap baris e-bupot literal · status FT4 (jalur mana) · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN mengerjakan PR-4. Rekonsiliasi fiskal komersial→fiskal, beda temporer dari
  register, dan baris `2-200` di `reconciliations()` adalah arc tersendiri yang sudah
  disetujui dengan urutan mengikat (PR-2 → PR-4). Empat baris `tempDiff` literal di
  baris 68-72 adalah bagian dari arc itu — LAPORKAN, jangan perbaiki.
- ⛔ JANGAN mengarang nomor dokumen pengganti, dan jangan "menyamarkan" nomor lama
  (mis. mengganti digit) — hapus atau ambil dari register.
- ⛔ JANGAN memindahkan `RATE = 0.22` ke berkas data sebagai konstanta baru.
- JANGAN mengubah `data_pph23.ts` maupun modul `payroll`.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan,
    dan uji yang lahir hijau disebut apa adanya.
[ ] `npm run verify` hijau dari root; modul `tax` & `payroll` tidak berubah perilaku.
[ ] Tidak ada nomor bukti potong karangan di modul ini.
[ ] Setiap baris membawa penanda asal secara positif — kanonik atau ilustrasi.
[ ] PPh 21 berasal dari mesin payroll, atau dinyatakan belum tersedia untuk masa itu.
[ ] Penandaan lapor memakai identitas sesi nyata.
[ ] Impor `TAX23` lewat ESM; cabang mati disederhanakan dan dijelaskan apa adanya.
[ ] `RATE` tidak disalin ke tempat baru; status FT4 dilaporkan.
[ ] PR-4 tidak disentuh; `tempDiff` literal dilaporkan, bukan diperbaiki.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut nasib tiap baris e-bupot literal.
```
