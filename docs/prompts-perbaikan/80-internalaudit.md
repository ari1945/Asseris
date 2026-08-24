# Prompt perbaikan — modul `internalaudit` (Internal Audit, SA 610)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-A (ekspor) + C-C (integritas) + D.
>
> **Catatan pembuat prompt:** modul ini punya satu hal yang `opening` tidak punya —
> evaluasi tiga faktor SA 610 ¶16 benar-benar **ter-persist dan dapat disunting**
> (`internalAudit.v1`), sehingga auditor dapat mengubah skor dan sub-kriteria. Itu
> mekanisme kertas kerja yang sah. Yang diekspor pun faktor hasil suntingan, bukan
> konstanta. Pertahankan.
>
> Cacat terberatnya ada di **memo tersegel**: dokumennya membawa nomor perikatan
> literal `ENG-2025-014` pada mukanya, sementara `scopeId`-nya diambil dari perikatan
> aktif. Satu berkas bersegel yang isinya membantah scope-nya sendiri. Ditambah nama
> firma literal dan nama klien yang jatuh ke satu klien tertentu bila konteks kosong.
>
> Dan aksi utamanya — tombol **"Simpulkan"** — tidak melakukan apa-apa.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya.
2. DOKUMEN BERSEGEL TIDAK BOLEH MEMBANTAH SCOPE-NYA SENDIRI. Identitas yang tercetak
   di muka berkas dan identitas yang dipakai menyegelnya WAJIB berasal dari sumber
   yang sama.
3. FALLBACK TIDAK BOLEH MENYEBUT ENTITAS TERTENTU. Nama klien, nama firma, nomor
   perikatan: bila konteksnya kosong, dokumen TIDAK dibuat — bukan dibuat atas nama
   pihak yang kebetulan ada di seed.
4. KERTAS KERJA LAHIR DENGAN PERTANYAAN, BUKAN DENGAN JAWABAN. Seed yang berisi skor
   dan temuan spesifik membuat auditor mengoreksi kesimpulan, bukan membentuknya.
5. JANGAN MENAMAI YANG MATI — tombol tanpa handler diaktifkan atau dihapus.
6. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
7. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
8. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: hentikan memo SA 610 menyegel identitas yang salah, hidupkan atau cabut aksi
yang mati, dan hentikan modul ini menyajikan fakta tentang fungsi audit internal klien
yang tidak berasal dari mana pun.

KONTEKS MODUL
- id modul: internalaudit (grup "Area Khusus & Estimasi")
- berkas: migration/src/view_internalaudit.tsx (618 baris)
- state: `internalAudit.v1` lewat `useAmsPersist` — faktor evaluasi ter-persist
- ekspor: memo PDF tersegel (`amsExportPdf`, kind `sa610-memo`)
- pembanding yang sudah benar di repo: `opening_assessment` + `assessment_model`
  (dipakai modul `opening` dan `continuance`) · `WpPanel` (rantai sign-off SA 230)

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Faktor evaluasi SA 610 ¶16 ter-persist dan dapat disunting; memo mengekspor hasil
  suntingan, bukan konstanta. Mekanisme ini benar.
- `scopeId` memo diambil dari `firm.activeEngagement.id` — sudah benar; yang salah
  adalah teks yang tercetak (lihat IA1).
- Tombol ekspor memo hidup dan memakai `amsExportPdf` (tersegel).

CACAT

IA1 · Memo tersegel membawa identitas yang salah, dan membantah scope-nya sendiri  [P0]
    view_internalaudit.tsx:132-137
      scope: 'engagement', scopeId: firm.activeEngagement?.id,     ← benar
      firm: 'KAP Wijaya Hartono & Rekan',                          ← literal
      meta: [`${client} · ENG-2025-014 · FY2025 · SA 610 (Revisi 2013)`]   ← literal
    dan view_internalaudit.tsx:103
      const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
    Tiga cacat dalam satu dokumen bersegel:
      · nomor perikatan yang TERCETAK adalah `ENG-2025-014` untuk perikatan apa pun,
        sementara yang dipakai menyegel adalah perikatan aktif — muka berkas dan
        scope-nya menunjuk dua hal berbeda;
      · nama firma literal;
      · nama klien jatuh ke satu klien tertentu bila konteks kosong, sehingga memo
        SA 610 dapat terbit atas nama entitas yang tidak sedang diaudit.
    Juga: `FY2025` literal — periksa apakah siklus perikatan tersedia di konteks.
    Kerjakan: seluruh identitas pada muka berkas berasal dari konteks perikatan aktif —
    sumber yang SAMA dengan `scopeId`. Bila konteks tidak lengkap, ekspor TIDAK
    dijalankan dan pengguna diberi tahu alasannya. Hapus ketiga fallback bernama;
    jangan menggantinya dengan nama lain.

IA2 · Aksi utama "Simpulkan" tidak melakukan apa-apa  [P0]
    view_internalaudit.tsx:157 — `<Btn sm variant="primary"><I.check size={14}/> Simpulkan</Btn>`
    tanpa `onClick`. Ia berdiri di SubBar sebagai tombol primer: tindakan yang
    seharusnya merekam kesimpulan auditor atas penggunaan pekerjaan audit internal.
    Modul menghitung `verdict` dan `avg`, menampilkannya, dan mengekspornya — tetapi
    tidak ada satu pun cara menyatakan bahwa kesimpulan itu DIAMBIL, oleh siapa, kapan.
    Kerjakan: aktifkan atau hapus.
      · Bila diaktifkan, kesimpulan harus tersimpan (pola `internalAudit.v1` sudah ada
        di berkas ini) dengan pelaku dari `useCurrentAuditor()` dan tanggal dari
        `AMS.TODAY` — dan itu berarti ia juga masuk memo.
      · Bila menurutmu perekaman kesimpulan semestinya lewat rantai sign-off `WpPanel`
        seperti modul lain, USULKAN dan berhenti; itu keputusan alur kerja.
    Tombol kedua yang mati: baris 410, `Buka WP {sel.lead}` — sama perlakuannya
    (aktifkan dengan `nav('workpapers', { from:'internalaudit' })` ke rujukan yang
    benar, atau hapus).

IA3 · Profil fungsi audit internal klien adalah konstanta modul  [P1]
    view_internalaudit.tsx:19-28 — `IA_PROFILE` memuat fakta tentang ENTITAS KLIEN:
    nama unit, garis pelaporan, **nama kepala SPI** ("Wijaya Kusuma, QIA · CIA"),
    jumlah personel, jumlah bersertifikat, tanggal pengesahan piagam, metodologi.
    Tidak ter-persist, tidak dapat disunting, dan sama untuk setiap klien — lalu
    dirender sebagai fakta di dua tempat (baris 167-173 dan 259-266).
    Berbeda dari faktor evaluasi yang memang dapat disunting, profil ini mengunci
    auditor pada gambaran organisasi klien yang tidak berasal dari mana pun.
    Kerjakan: jadikan ter-persist dan dapat disunting dengan pola yang SUDAH ADA di
    berkas ini (`useAmsPersist`), diseed KOSONG — bukan diseed dengan profil karangan.
    Bila menurutmu profil ini semestinya datang dari data klien di aplikasi, grep dulu
    dan katakan hasilnya; jangan mengarang jembatan.

IA4 · Kertas kerja lahir sudah terisi kesimpulan  [P1]
    `IA_FACTORS_SEED` menjadi nilai awal `internalAudit.v1`: tiga faktor dengan skor
    4 / 4 / 3, catatan naratif, dan sub-kriteria yang sudah dinilai ok/tidak — termasuk
    temuan yang sangat spesifik ("Skema bonus sebagian terkait KPI divisi", "Asesmen
    mutu eksternal belum dilakukan 5 tahun terakhir").
    Karena ter-persist, ini "hanya" nilai awal — tetapi nilai awal berupa KESIMPULAN
    mengubah pekerjaan auditor dari membentuk penilaian menjadi mengoreksi penilaian
    orang lain, atas klien yang mungkin belum ia lihat.
    Kerjakan: seed berisi PERTANYAAN — daftar faktor dan sub-kriteria SA 610 ¶16 —
    tanpa skor dan tanpa jawaban ok/tidak. Kerangka standarnya berguna; jawabannya
    tidak boleh disediakan.
    Perhatikan kompatibilitas: dokumen `internalAudit.v1` yang sudah tersimpan tidak
    boleh hilang. Jelaskan jalur kompatibilitasmu di RENCANA.

IA5 · Baris area penggunaan adalah kontrol palsu  [P1]
    view_internalaudit.tsx:375 — `<tr … onClick={() => setSelId(a.id)} style={{cursor:'pointer'}}>`.
    Tidak fokusabel, tidak menanggapi Enter/Space. Perbaiki dengan kontrol native;
    cincin fokus terlihat. Ikuti pola yang sudah mendarat di modul lain.

IA6 · Mesin penilaian kedua, dan tanpa rantai sign-off  [LAPORKAN & USULKAN — jangan
      kerjakan]
    Modul ini merakit skor dan verdict-nya sendiri, sementara repo punya
    `assessment_model` yang sudah dipakai `opening` dan `continuance`. Ia juga tidak
    memakai `WpPanel`, sehingga kertas kerja SA 610 tidak punya rantai sign-off.
    Keduanya adalah usulan E-9 untuk modul ini, dan keduanya MENGUBAH angka atau
    menambah alur kerja — bukan keputusanmu.
    Tulis usulan singkat: apa yang berubah bila skor dipindah ke `assessment_model`
    (termasuk apakah angkanya bergeser), dan bagaimana `WpPanel` akan berinteraksi
    dengan tombol "Simpulkan" di IA2. Lalu BERHENTI.

GERBANG YANG HARUS KAMU TULIS
Ekstrak perakitan payload memo & derivasi verdict ke fungsi murni ber-ekspor bernama.
Berkas uji .ts WAJIB bebas `any`.
  a. Identitas pada payload memo (klien, perikatan, siklus, firma) berasal dari konteks
     yang sama dengan `scopeId` — mengubah perikatan aktif MENGUBAH keduanya bersamaan.
     (Merah sebelum IA1.)
  b. Konteks perikatan yang tidak lengkap TIDAK menghasilkan berkas. (Merah sebelum IA1.)
  c. Gerbang sumber: nol nomor perikatan, nama klien, dan nama firma yang tertanam
     sebagai literal di view_internalaudit.tsx — buang komentar dulu sebelum memindai
     (pola helper `kode()` di cockpit_conventions.test.ts). (Merah sebelum IA1.)
  d. Nol `<Btn>` tanpa `onClick`; nol `<tr onClick>`. (Merah sebelum IA2/IA5.)
  e. Seed evaluasi tidak memuat skor maupun jawaban ok/tidak. (Merah sebelum IA4.)
  f. Dokumen `internalAudit.v1` lama tetap terbaca setelah perubahan seed.
     (Uji kompatibilitas — tulis sebelum mengubah bentuknya.)

LANGKAH
1. INVESTIGASI — konfirmasi IA1–IA5 di HEAD sekarang; tempelkan bukti barisnya.
   Periksa juga: apakah konteks menyediakan siklus/FY perikatan aktif (untuk mengganti
   `FY2025` literal)? Apakah ada data fungsi audit internal klien di aplikasi (untuk
   IA3)? Jawab dengan grep, bukan dugaan.
2. RENCANA — termasuk jalur kompatibilitas untuk IA4, dan keputusanmu atas kedua
   tombol mati. Usulan IA6 ditulis terpisah, lalu berhenti untuk bagian itu.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — IA1, IA2, IA3, IA4, IA5. IA6 hanya usulan.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Modul `opening` dan
   `continuance` yang memakai `assessment_model` TIDAK boleh berubah — kalau ujinya
   merah, kamu menyentuh IA6.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · nasib kedua tombol ·
   hasil grep untuk siklus perikatan & data fungsi IA klien · usulan IA6 · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN mengganti fallback bernama dengan nama lain — hapus, dan hentikan ekspor
  bila konteks kosong.
- ⛔ JANGAN mengarang profil fungsi audit internal pengganti, dan jangan memindahkan
  `IA_PROFILE` apa adanya ke berkas data — memindahkan karangan tidak menyembuhkannya.
- ⛔ JANGAN memindahkan skor ke `assessment_model` atau menambahkan `WpPanel` tanpa
  keputusan (IA6).
- JANGAN mengubah `assessment_model`, `opening_assessment`, atau `WpPanel`.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; `opening` & `continuance` tidak berubah.
[ ] Muka memo tersegel dan scope-nya menyebut perikatan yang SAMA.
[ ] Tidak ada nama klien, nama firma, atau nomor perikatan literal di modul ini.
[ ] Ekspor tidak berjalan ketika konteks perikatan tidak lengkap.
[ ] Tidak ada tombol mati tersisa; "Simpulkan" hidup (dan merekam pelaku + tanggal)
    atau hilang.
[ ] Profil fungsi audit internal dapat disunting dan tidak diseed dengan karangan.
[ ] Seed evaluasi berisi pertanyaan, bukan jawaban; dokumen lama tetap terbaca.
[ ] Memilih area penggunaan dapat dilakukan penuh dengan papan-ketik.
[ ] Usulan IA6 tertulis dan TIDAK diimplementasikan.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
```
