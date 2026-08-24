# Prompt perbaikan — modul `opening` (Opening Balance / Saldo Awal, SA 510)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-A (ekspor) + D (definisi selesai).
>
> **Catatan pembuat prompt:** setengah modul ini benar dan matang — penelusuran saldo
> awal memakai mesin nyata (`tieOutPriorYear`), penilaian risiko memakai
> `openingScore`/`openingVerdict` di atas `assessment_model`, kesiapan pendahulu
> memakai `predecessorReadiness`, dan memo tersegel dirakit fungsi murni
> (`opening_memo.ts`). Semua itu jangan disentuh.
>
> Setengah lainnya adalah masalah paling serius yang saya temukan dalam seluruh
> peninjauan ini. Tab **"Prosedur Audit Spesifik atas Saldo Awal Signifikan"** dan
> **"Evaluasi Konsistensi Kebijakan Akuntansi"** bukan berisi angka yang salah — ia
> berisi **pernyataan bahwa pekerjaan audit telah dilakukan dan bukti telah diperoleh**,
> lengkap dengan nama dokumen bertanggal dan kesimpulan "Memadai", ditulis sebagai
> konstanta, identik untuk setiap klien dan setiap perikatan.
>
> Satu hal yang meringankan dan WAJIB kamu pastikan tetap begitu: tabel-tabel itu
> **tidak ikut ke dalam memo tersegel** — `OpeningMemoInput` hanya membawa skor,
> verdict, faktor, langkah pendahulu, dan kesimpulan. Fabrikasinya berhenti di layar.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya.
2. APLIKASI TIDAK BOLEH MENYATAKAN BAHWA PROSEDUR AUDIT TELAH DILAKUKAN. Angka yang
   salah dapat dikoreksi; catatan bahwa bukti telah diperoleh padahal tidak, adalah
   dokumentasi palsu. Prosedur, bukti, dan kesimpulan hanya boleh berasal dari apa
   yang benar-benar diisi auditor pada perikatan itu.
3. TEMPLAT BOLEH; TEMPLAT YANG MENGAKU SUDAH TERISI TIDAK. Daftar prosedur yang
   DISARANKAN adalah alat bantu yang sah. Kolom "Hasil: Memadai" dan "Bukti: Berita
   Acara Opname 28 Des 2024" bukan saran — itu pernyataan.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. JANGAN MENAMAI YANG MATI — tombol tanpa handler diaktifkan atau dihapus.
6. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
7. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: hentikan modul ini menyatakan bahwa prosedur audit atas saldo awal telah
dilakukan dan buktinya telah diperoleh, tanpa merusak bagian yang sudah benar.

KONTEKS MODUL
- id modul: opening (grup "Area Khusus & Estimasi")
- berkas: migration/src/view_opening.tsx (654 baris)
- mesin yang sudah benar: `prior_year.tieOutPriorYear` · `opening_assessment`
  (`openingScore`, `openingVerdict`, `predecessorReadiness`, `OB_RISK_FACTORS`,
  `PREDECESSOR_STEPS`) · `assessment_model` · `opening_memo` (blocks/sheets/refNo)
- state: `opening.v1` lewat `useAmsPersist` (pola yang sudah ada di berkas ini)
- ekspor: memo tersegel PDF & XLSX, sudah hidup

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Penelusuran saldo awal memakai `tieOutPriorYear` — mesin nyata, dengan `TIE_LABEL`.
- Penilaian risiko saldo awal memakai model penilaian bersama, bukan skor karangan.
- Memo tersegel dirakit fungsi murni; `OpeningMemoInput` TIDAK memuat tabel prosedur
  spesifik maupun tabel kebijakan. Fabrikasi tidak tersegel — PERTAHANKAN batas itu.
- Tidak ada `new Date()` liar, tidak ada literal nama firma, tidak ada identitas
  fallback di berkas ini. Bagus; jangan menambahkannya.

CACAT

O1 · Kertas kerja menyatakan prosedur telah dilakukan dan bukti telah diperoleh  [P0]
    view_opening.tsx:29-45 — `OB_SPECIFIC`, lima akun signifikan, setiap baris memuat:
      · `proc`     — prosedur audit, ditulis dalam bentuk telah dikerjakan;
      · `evidence` — bukti yang "diperoleh", dengan nama dan tanggal dokumen spesifik
                     (mis. "Berita Acara Opname 28 Des 2024", "KKP B-2 TA lalu",
                     "Laporan aktuaria 31 Des 2024 (audited)");
      · `result`   — KESIMPULAN: 'Memadai' / 'Dalam Proses'.
    view_opening.tsx:47+ — `OB_POLICY`, perbandingan kebijakan akuntansi periode lalu
    vs kini dengan `ok: true` — yaitu kesimpulan bahwa kebijakan konsisten.
    Keduanya konstanta modul: tidak ter-persist, tidak dapat disunting, dan IDENTIK
    untuk setiap klien dan setiap perikatan. Dirender langsung sebagai badge hijau
    "Memadai" (baris 513, 522, 533) dan sebagai hitungan "N konsisten" (baris 548).
    Seorang auditor yang membuka modul ini pada klien mana pun akan melihat bahwa
    prosedur atas persediaan, piutang, aset tetap, sewa, dan imbalan kerja sudah
    dinilai memadai — sebelum ia mengerjakan apa pun.
    Kerjakan DUA hal, berurutan:
      (a) SEGERA — hentikan penyajiannya sebagai fakta perikatan ini. Kolom `result`
          dan `evidence` tidak boleh muncul sebagai pernyataan. Pilihan minimal yang
          dapat kamu ambil sendiri: pertahankan `proc` sebagai DAFTAR PROSEDUR YANG
          DISARANKAN (itu sah dan berguna), hapus/ kosongkan kolom hasil dan bukti,
          dan beri judul yang jujur. Hal yang sama untuk `OB_POLICY`: pertanyaannya
          boleh tetap ada, jawabannya tidak.
      (b) USULKAN — jadikan tab ini kertas kerja per-perikatan yang sesungguhnya:
          auditor mengisi bukti dan kesimpulan, tersimpan lewat pola `opening.v1`
          yang SUDAH ADA di berkas ini, dengan pelaku dan tanggal. Tulis usulannya
          (bentuk state, kewenangan, apakah masuk memo tersegel), lalu BERHENTI —
          jangan membangunnya tanpa keputusan.
    Yang DILARANG: memindahkan literal itu ke berkas data lalu menyebutnya SSOT;
    memberi label "contoh" pada kolom kesimpulan lalu membiarkannya berdiri; atau
    menghapus tabnya diam-diam tanpa mengatakannya.

O2 · Tombol "Buka WP" mati  [P1]
    view_opening.tsx:535 — `<Btn sm variant="primary" …><I.flask/> Buka WP {sel.wp}</Btn>`
    tanpa `onClick`. Ia menjanjikan membuka kertas kerja yang dirujuk baris bukti —
    referensi yang, karena O1, juga tidak nyata.
    Aktifkan (navigasi ke `workpapers` dengan rujukan WP yang benar, pola
    `nav(id, { from:'opening' })`) atau hapus. Bila referensi WP-nya sendiri tidak
    nyata setelah O1, hapus tombolnya — jangan menautkan ke sesuatu yang dikarang.

O3 · Baris prosedur adalah kontrol palsu  [P1]
    view_opening.tsx:508 — `<tr … onClick={() => setSelId(s.id)} style={{cursor:'pointer'}}>`.
    Tidak fokusabel, tidak menanggapi Enter/Space.
    Perbaiki dengan kontrol native di dalam baris; cincin fokus terlihat. Pola yang
    sama sedang dibereskan di beberapa modul lain — periksa dan ikuti yang sudah mendarat.

O4 · Nilai transisi tertanam sebagai konstanta  [P2 — LAPORKAN, perbaiki hanya bila jelas]
    view_opening.tsx:26 — `OB_TRANSITION = { '1-2300': 13_100_000_000, '2-1500': …, '2-2200': … }`
    Tiga angka rupiah untuk akun-akun transisi (tampaknya PSAK 73), literal.
    Periksa dari mana angka ini SEHARUSNYA berasal — WTB perikatan? memo transisi?
    Laporkan temuanmu. Kalau sumbernya jelas ada di aplikasi, sambungkan; kalau tidak,
    JANGAN mengarang dan jangan memindahkannya ke berkas data — laporkan sebagai utang
    dengan usulan asalnya.

GERBANG YANG HARUS KAMU TULIS
Ekstrak apa yang perlu ke fungsi murni ber-ekspor bernama. Berkas uji .ts WAJIB bebas
`any`.
  a. Gerbang sumber: tidak ada kesimpulan hasil audit ('Memadai', 'Dalam Proses') dan
     tidak ada rujukan bukti bertanggal yang tertanam sebagai konstanta di
     view_opening.tsx — buang komentar dulu sebelum memindai (pola helper `kode()` di
     cockpit_conventions.test.ts). (Merah sebelum O1a.)
  b. Tidak ada tombol tanpa `onClick` di berkas ini. (Merah sebelum O2.)
  c. Nol `<tr onClick>` / `<span onClick>` / `<div onClick>`. (Merah sebelum O3.)
  d. Memo tersegel TIDAK memuat kesimpulan prosedur spesifik maupun kebijakan —
     invarian yang sekarang BENAR; tulis supaya perubahan berikutnya tidak merusaknya
     diam-diam. Kalau ia hijau sejak awal, katakan begitu dan JANGAN mengaku telah
     memerahkannya.
  e. Penelusuran saldo awal (`tieOutPriorYear`) tetap menghasilkan hasil yang sama
     sebelum dan sesudah perubahanmu — kamu tidak menyentuh mesin.

LANGKAH
1. INVESTIGASI — konfirmasi keempat cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca `opening_memo.ts` dan `OpeningMemoInput` lebih dulu, lalu nyatakan dengan
   kalimatmu sendiri APA yang benar-benar masuk ke memo tersegel — supaya kamu tahu
   batas mana yang harus dijaga.
2. RENCANA — bentuk tampilan setelah O1a (apa yang tersisa di tab itu, dan bagaimana
   ia memberi tahu auditor bahwa ini daftar prosedur, bukan hasil). Usulan O1b ditulis
   terpisah, lalu BERHENTI untuk bagian itu.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — O1a, O2, O3. O1b hanya usulan; O4 laporan (atau perbaikan bila
   sumbernya jelas).
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Uji yang menyentuh
   `prior_year` / `opening_assessment` / `opening_memo` WAJIB tetap hijau — kalau merah,
   kamu menyentuh mesin dan itu di luar lingkup.
6. LAPORAN — sebelum→sesudah bagi pengguna (khususnya: apa yang TIDAK LAGI diklaim
   modul ini) · uji merah→hijau (dan mana yang lahir hijau) · usulan O1b · temuan O4 ·
   yang TIDAK dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN memindahkan `OB_SPECIFIC`/`OB_POLICY` apa adanya ke berkas data. Memindahkan
  fabrikasi tidak menyembuhkannya — ia hanya membuatnya tampak seperti data.
- ⛔ JANGAN memasukkan kesimpulan prosedur spesifik atau kebijakan ke memo tersegel.
- ⛔ JANGAN mengarang sumber untuk `OB_TRANSITION`.
- ⛔ JANGAN membangun alur pengisian kertas kerja (O1b) tanpa keputusan.
- JANGAN menyentuh `tieOutPriorYear`, `opening_assessment`, atau `opening_memo`.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan,
    dan uji yang lahir hijau disebut apa adanya.
[ ] `npm run verify` hijau dari root; mesin saldo awal & memo tetap hijau.
[ ] Modul tidak lagi menyatakan bahwa prosedur telah dilakukan, bukti telah diperoleh,
    atau kebijakan telah dinilai konsisten — untuk perikatan mana pun.
[ ] Daftar prosedur yang disarankan (bila dipertahankan) berjudul jujur sebagai saran.
[ ] Tidak ada tombol mati tersisa; tidak ada kontrol palsu tersisa.
[ ] Memo tersegel tetap tidak memuat kesimpulan yang dikarang, dijaga uji.
[ ] Usulan O1b tertulis dan TIDAK diimplementasikan.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyatakan secara eksplisit apa yang TIDAK LAGI diklaim modul ini.
```
