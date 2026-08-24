# Prompt perbaikan — modul `hcm` (Human Capital)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-B (klok/scope) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini menyimpan data orang, dan cacat terberatnya
> adalah **angka yang dikarang lalu disajikan sebagai fakta tentang seseorang** —
> penilaian kinerja empat dimensi yang seluruhnya diturunkan dari satu angka rating,
> dan profil yang menyatakan "KTP & NPWP: Lengkap" untuk orang yang datanya justru
> tidak ada. Di modul SDM, mengarang bukan sekadar pelanggaran SSOT; ia bisa dipakai
> orang untuk mengambil keputusan tentang manusia.
>
> Ironisnya mesin yang benar SUDAH ADA di modul yang sama: drawer 360°
> (`view_pc_hcm.tsx:74`) memakai `perfPersonOf` dari `canon_perf`, sementara panel
> utama di sebelahnya memakai aritmatika karangan.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah
   dan hasilnya. Klaim "absen" di repo ini secara historis SALAH SISTEMATIS —
   di modul ini khususnya, mesin yang benar sering sudah ada dan modulnya memakai
   yang salah.
2. SSOT. Angka berasal dari canon*/data*, bukan literal atau turunan aritmatika di view.
3. TIDAK ADA DATA ≠ NOL, DAN TIDAK ADA DATA ≠ "LENGKAP". Ketidaktahuan ditampilkan
   sebagai ketidaktahuan. Jangan pernah mengisi ketiadaan data dengan nilai yang
   terbaca sebagai pernyataan kepatuhan.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: hentikan modul `hcm` menyajikan angka karangan sebagai fakta tentang orang,
dan benahi penomoran identitas karyawan serta klok masa kerja.

KONTEKS MODUL
- id modul: hcm (grup "SDM & Kepatuhan"); butuh CAP.HR_MODULE_VIEW untuk dibuka
- berkas: migration/src/view_people.tsx → fungsi `HCM()` baris 27-158 dan
  `StaffForm()` baris 159-197. Berkas ini juga memuat modul `cpe` (CPETracker) dan
  `independence` (Independence) — JANGAN sentuh keduanya.
- pendalaman profil & analitik: migration/src/view_pc_hcm.tsx (Profile360Drawer,
  HCMAnalytics)
- mesin kinerja yang benar: canon_perf.ts → perfPersonOf
- mesin cuti: canon_leave.ts → leaveLedgerOf

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Headcount roster SUDAH ber-SSOT dan bergerbang: hcm_roster.test.ts memaku 69 orang,
  komposisi grade/tenure/usia/gender/sertifikasi, dan bahwa FIRM menutup ke roster
  yang sama. Arc "tiga headcount" sudah selesai — jangan diutak-atik.
- Mesin PPL tunggal sudah ditegakkan (ppl_single_engine.test.ts) — itu milik modul
  `cpe`, di luar lingkup kamu.
- Ekspor XLSX direktori sudah tersegel (K-06). Bukan cacat.
- Gerbang kapabilitas view (HR_MODULE_VIEW, view_people.tsx:80) ada. Bukan cacat.
- Drawer 360° menarik data personal lewat `personal.get` (baris ter-filter per
  pengguna). Arsitekturnya benar; yang salah hanya nilai fallback-nya (lihat H2).

CACAT

H1 · Penilaian kinerja empat dimensi dikarang dari satu angka  [P0 — kerjakan]
    view_people.tsx:75-80
      const apprais = [
        ['Kualitas teknis audit',        Math.min(5, person.rating + 0.1)],
        ['Kepemimpinan & supervisi',     person.rating - 0.2],
        ['Manajemen waktu & deadline',   person.rating],
        ['Komunikasi klien',             person.rating - 0.1],
      ];
    Dirender sebagai penilaian per-dimensi di baris 135. Ini bukan penilaian — ini
    satu angka yang digeser ±0,1/0,2 lalu diberi empat nama. Tidak ada penilai, tidak
    ada periode, tidak ada dasar. Seseorang bisa membaca "Kepemimpinan & supervisi 3,8"
    dan mengira ada yang menilainya.
    Mesin yang benar ADA DI MODUL YANG SAMA: view_pc_hcm.tsx:73-74 memakai
      perfPersonOf(s.id, perfRec, goals)
    atas dokumen `perfPeople`/`perfGoals` — penilaian nyata dari modul Siklus Kinerja.
    Perbaiki: panel ini memakai mesin yang sama. Untuk orang yang BELUM punya catatan
    kinerja, tampilkan ketiadaannya secara jujur (dan tunjuk ke modul `performance`) —
    jangan menurunkan angka apa pun dari `rating`.
    Kalau ternyata `rating` sendiri juga tak berdasar (periksa dari mana ia datang di
    roster), katakan itu di laporan sebagai temuan terpisah — jangan diam-diam
    memperluas perbaikan.

H2 · Profil mengarang kepatuhan untuk orang yang datanya tidak ada  [P0 — kerjakan]
    view_pc_hcm.tsx:24-42, profileOf(): ketika seorang karyawan tidak punya baris di
    `staffProfile`, fallback-nya BUKAN penanda "tidak diketahui", melainkan pernyataan:
      location: 'Jakarta (HQ)'      empType: 'Tetap'
      bpjsKes:  'Aktif'             bpjsTk:  'Aktif'
      docs:     [['Sertifikat …','Valid'], ['KTP & NPWP','Lengkap'], ['Kontrak Kerja','Aktif']]
    Modul ini dibuka HR dan Partner untuk keputusan SDM. "KTP & NPWP: Lengkap" atas
    orang yang recordnya kosong adalah klaim kepatuhan tanpa dasar — persis kebalikan
    dari yang seharusnya ditampilkan.
    Bedakan dua hal dan perlakukan berbeda:
      · MASKING (nik '3174••••••••', phone '0811-•••-xxx') — sengaja, untuk menutupi
        data yang ADA tapi tak boleh dilihat pemanggil. Pertahankan.
      · FABRIKASI (di atas) — mengisi data yang TIDAK ADA dengan nilai yang terbaca
        sebagai fakta. Ganti dengan penanda tidak-diketahui yang jelas.
    Kalau sebagian di antaranya sebenarnya punya sumber lain di repo (mis. status BPJS
    dari payroll), pakai sumbernya — grep dulu sebelum menyimpulkan tidak ada.

H3 · Id karyawan baru diturunkan dari panjang array  [P1 — kerjakan]
    view_people.tsx:39
      id: 'EMP-' + String(100 + list.length).padStart(3, '0')
    `list` adalah `staffExtra` saja. Hapus satu karyawan tambahan lalu tambah lagi →
    id terulang. Untuk data kepegawaian, id ganda berarti profil, payroll, cuti, SKP,
    dan catatan disiplin dua orang bisa tercampur.
    Catat juga: gerbang keunikan yang ada (hcm_roster.test.ts:65) memeriksa roster
    SEED, bukan penambahan saat berjalan — jadi ia tidak akan merah untuk cacat ini.
    Periksa juga apakah 'EMP-100' dst. bisa menabrak id yang sudah ada di seed;
    laporkan hasilnya apa pun temuanmu.
    Perbaiki: id baru dijamin unik terhadap SELURUH roster (seed + tambahan), bukan
    terhadap panjang salah satu daftar.

H4 · Klok masa kerja beku di tahun 2026  [P1 — kerjakan]
    view_people.tsx:39  `joined: 2026` sebagai nilai bawaan karyawan baru
    view_people.tsx:73  `const tenure = 2026 - person.joined;`
    view_people.tsx:129 menampilkan "<tenure> tahun (sejak <joined>)".
    Mulai 2027 masa kerja setiap orang salah satu tahun, tanpa suara. Klok SSOT
    `AMS.TODAY` sudah dipakai di seluruh repo (K-02). Pakai itu.

H5 · Nama firma hardcode di dalam ekspor tersegel  [P2 — kerjakan]
    view_people.tsx (payload amsExportXlsx direktori): firm: 'KAP Wijaya Hartono & Rekan'.
    Sama seperti temuan di cockpit: menyegel identitas yang salah memberi otoritas pada
    isi yang keliru. SSOT-nya sudah dipakai di tempat lain — lihat pola
    `AMS.FIRM?.name` di view_analytical.tsx:185 dan view_calc.tsx:66.
    Perbaiki di berkas ini saja; JANGAN menyapu repo (94 situs / 79 berkas — PR sendiri).

GERBANG YANG HARUS KAMU TULIS
Berkas uji .ts WAJIB bebas `any`. Ekstrak apa pun yang perlu ke fungsi murni dengan
ekspor bernama supaya bisa diuji di node tanpa render; perilaku tidak berubah.
Minimal yang dipaku:
  a. Penilaian per-dimensi TIDAK dapat diturunkan dari `rating` — untuk orang tanpa
     catatan kinerja, hasilnya adalah "tidak ada penilaian", bukan angka.
     (Merah sebelum H1.)
  b. Dua orang dengan `rating` sama tetapi catatan kinerja berbeda menghasilkan
     penilaian yang BERBEDA. (Merah sebelum H1 — dan ini gerbang yang tidak bisa
     dilewati dengan mengganti konstanta pergeseran.)
  c. Profil tanpa baris `staffProfile` tidak menghasilkan satu pun nilai yang terbaca
     sebagai pernyataan kepatuhan ('Aktif', 'Lengkap', 'Valid'). (Merah sebelum H2.)
  d. Id karyawan baru unik terhadap seluruh roster, termasuk setelah sebuah karyawan
     tambahan dihapus. (Merah sebelum H3.)
  e. Masa kerja dihitung dari klok SSOT: majukan AMS.TODAY satu tahun → masa kerja
     bertambah satu. (Merah sebelum H4.)
  f. Nol literal nama firma di kode view_people.tsx — gerbang sumber, buang komentar
     dulu sebelum memindai (pola helper `kode()` di cockpit_conventions.test.ts).
     (Merah sebelum H5.)

LANGKAH
1. INVESTIGASI — konfirmasi kelima cacat di HEAD sekarang; tempelkan bukti barisnya.
   Sebelum menyentuh H1, baca canon_perf.ts dan view_pc_hcm.tsx:56-74, lalu nyatakan
   dengan kalimatmu sendiri data apa yang dibutuhkan `perfPersonOf` dan apa yang
   terjadi bila data itu tidak ada.
2. RENCANA — termasuk: bentuk tampilan "belum ada penilaian" (H1) dan penanda
   tidak-diketahui (H2). Keduanya menyentuh apa yang DILIHAT pengguna; kalau menurutmu
   ada pilihan yang lebih baik daripada sekadar '—', usulkan singkat lalu lanjutkan
   dengan yang paling sederhana.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — H1 sampai H5.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan hcm_roster dan
   ppl_single_engine tetap hijau — kalau salah satunya merah, kamu keluar dari lingkup.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · temuan tentang asal
   `rating` (H1) · hasil pemeriksaan tabrakan id terhadap seed (H3) · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol).

ADENDUM SCOPE & KLOK (Program B)
- Tanggal "hari ini" hanya dari AMS.TODAY; tidak ada tahun literal dalam perhitungan.
- Data personal tetap lewat jalur personal.get yang sudah ada — jangan mengubah
  arsitektur isolasinya, hanya nilai fallback-nya.
- Gerbang: uji yang membuktikan ketiadaan data tampil sebagai ketiadaan, bukan sebagai
  angka atau status.

BATAS
- JANGAN menyentuh CPETracker (`cpe`) atau Independence (`independence`) di berkas
  yang sama.
- JANGAN mengubah roster seed, headcount, atau komposisi apa pun yang dijaga
  hcm_roster.test.ts.
- JANGAN mengubah arsitektur isolasi data personal (personal.get / PERSONAL_STATE_KEYS).
- JANGAN menyapu literal nama firma ke seluruh repo.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; hcm_roster & ppl_single_engine tetap hijau.
[ ] Penilaian kinerja berasal dari canon_perf, dan ketiadaannya tampil jujur.
[ ] Dua orang ber-rating sama tetapi catatan berbeda menghasilkan penilaian berbeda.
[ ] Profil tanpa data tidak menyatakan 'Aktif'/'Lengkap'/'Valid' atas apa pun.
[ ] Id karyawan baru unik terhadap seluruh roster, dibuktikan uji.
[ ] Masa kerja mengikuti klok SSOT.
[ ] Nol literal nama firma di view_people.tsx, dijaga gerbang sumber.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
