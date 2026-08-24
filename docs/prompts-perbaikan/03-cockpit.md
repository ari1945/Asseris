# Prompt perbaikan — modul `cockpit` (Engagement Cockpit)

> Dibuat 2026-08-20 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-F (navigasi) + D (definisi selesai).
>
> **Catatan pembuat prompt:** Cockpit adalah salah satu modul TERKUAT di repo, bukan
> modul dangkal. Investigasi 2026-08-20 (HEAD `2632a23`): klok sudah `AMS.TODAY` (K-02
> tertutup), kontrol sudah native (PR-C-6), ekspor XLSX tersegel sudah ada (PR-C-7),
> angka ditarik dari `cockpit_model`/`cockpit_progress`/`cockpit_timeline`/`wp_signoff`/
> `canon_eqr_gate`, dan ada TUJUH berkas uji khusus. Tugas ini menutup dua cacat
> spesifik — bukan "memperdalam cockpit".
>
> E-9 secara eksplisit menggolongkan cockpit sebagai **"lensa SSOT" — by design L4,
> jangan dianggap gap**. Jangan menambahkan persistensi/state tulis ke modul ini.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src; app/,
build/, NeoSuite AMS.html adalah referensi beku — jangan diedit.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan pernah menulis "fitur X belum ada" tanpa grep lebih
   dulu. Di repo ini klaim "absen" secara historis SALAH SISTEMATIS. Setiap klaim
   absen harus disertai perintah grep yang kamu jalankan dan hasilnya.
2. SSOT. Angka DAN identitas berasal dari canon*/data*, bukan literal di view.
3. GERBANG HARUS BISA MERAH. Tulis dulu uji yang GAGAL pada kode sekarang, tempelkan
   output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
4. JANGAN MENAMAI YANG MATI. aria-label pada kontrol tanpa handler memperburuk a11y.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. Kontrol form NATIVE. Skala tipografi 8 ukuran (lantai 11px). Warna lewat token CSS
   var, bukan hex. `:any` baru = lint merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: tutup dua cacat pada modul `cockpit` (Engagement Cockpit).
Ini BUKAN tugas menaikkan level kedalaman — lihat "batas".

KONTEKS MODUL
- id modul: cockpit (grup "Ruang Kerja Perikatan")
- berkas: migration/src/view_cockpit2.tsx (1167 baris, <EngagementCockpit/>)
- pendukung murni & teruji: cockpit_model.ts · cockpit_progress.ts ·
  cockpit_timeline.ts · cockpit_report.ts · wp_signoff.tsx · canon_eqr_gate.ts
- uji yang sudah ada (JANGAN dirusak): cockpit_conventions · cockpit_gate ·
  cockpit_isolation · cockpit_model · cockpit_progress · cockpit_report ·
  cockpit_timeline

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- CKP_TODAY = new Date(AMS.TODAY) — klok SSOT, K-02 sudah tertutup.
- Nol <Btn> tanpa onClick; nol <div/span onClick> (PR-C-6 menutupnya, dan
  cockpit_conventions.test.ts menjaganya tetap tertutup).
- Ekspor XLSX tersegel ada, payloadnya dirakit fungsi murni teruji
  (buildCockpitStatusReport).
- Cockpit TIDAK menyimpan state apa pun — itu DISENGAJA (lensa baca-saja atas SSOT
  perikatan). Jangan menambahkan useAmsPersist/useServerState ke modul ini.

CACAT YANG HARUS DITUTUP

C1 · Tab tidak beralamat — view_cockpit2.tsx:138 & :381
    `const [tab, setTab] = useStateCkp('ringkasan')` adalah state lokal murni, dan
    <Tabs> di baris 381 tidak diseed dari `useInitialTab`. Akibatnya:
      · nav('cockpit', { tab:'risiko' }) DIABAIKAN — pemanggil mengira ia bekerja;
      · muat ulang / bagikan tautan #/cockpit?tab=… selalu mendarat di "Ringkasan";
      · tiga pemanggil yang ada (view_home.tsx:135, view_home_cockpit.tsx:352,
        view_scheduler.tsx:85) karena itu tak bisa menunjuk tab tertentu.
    15 view lain di repo sudah memakai useInitialTab; alamat hash diurus route_hash.ts.
    Perbaiki dengan pola yang SUDAH ADA itu — jangan bikin mekanisme baru.
    Sesudahnya, periksa apakah salah satu dari tiga pemanggil di atas sebaiknya
    menunjuk tab tertentu. Kalau menurutmu ya — USULKAN, jangan langsung ubah;
    itu keputusan alur kerja, bukan keputusan teknis.

C2 · Nama firma HARDCODE di dalam ekspor TERSEGEL — view_cockpit2.tsx:298
    `firmName: 'KAP Wijaya Hartono & Rekan'` ditulis literal ke payload yang kemudian
    disegel Ed25519 dan keluar dari aplikasi sebagai artefak. Menyegel identitas yang
    salah lebih buruk daripada tidak menyegel: segelnya memberi otoritas pada isi yang
    keliru. SSOT-nya sudah ada dan sudah dipakai di tempat lain — lihat pola di
    view_analytical.tsx:185 dan view_calc.tsx:66 (`AMS.FIRM?.name` dengan fallback).
    Ganti di cockpit; JANGAN menyapu seluruh repo di PR ini (lihat "batas").

GERBANG YANG HARUS KAMU TULIS
- Untuk C1: uji bahwa tab awal berasal dari seed navigasi, bukan selalu 'ringkasan'.
  Kalau perlu, ekstrak pemilihan tab awal jadi fungsi murni kecil agar bisa diuji di
  node tanpa render — ekspor bernama, perilaku tak berubah.
- Untuk C2: tambahkan gerbang anti-kambuh ke cockpit_conventions.test.ts — berkas itu
  memang GERBANG SUMBER (ia membaca view_cockpit2.tsx dan menolak pola lama). Uji baru:
  "nol literal nama firma di kode cockpit" (buang komentar dulu, seperti helper `kode()`
  yang sudah ada di berkas itu — gerbang yang ikut membaca komentar akan salah merah).
  Uji ini WAJIB merah sebelum perbaikan. Tempelkan outputnya.
- Perhatikan: cockpit_report.test.ts:55 memberi nama firma sebagai FIXTURE input ke
  fungsi murni. Itu wajar dan bukan cacat — fungsi murninya memang menerima firmName
  sebagai parameter. Cacatnya ada di SITUS PEMANGGIL yang tak teruji. Jangan mengubah
  tanda tangan fungsi murni hanya supaya terlihat teruji.

LANGKAH
1. INVESTIGASI — konfirmasi kedua cacat masih ada di HEAD sekarang; tempelkan bukti
   barisnya. Kalau salah satu sudah tertutup PR lain: katakan, lewati, jangan cari
   pekerjaan pengganti.
2. RENCANA — satu paragraf: perubahan apa, berkas mana.
3. GERBANG MERAH — jalankan uji baru, tempelkan output merahnya.
4. IMPLEMENTASI — perubahan sekecil mungkin.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan ketujuh uji
   cockpit yang sudah ada tetap hijau.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · yang TIDAK dikerjakan
   + alasannya · asumsi (seharusnya nol) · DAN: laporkan angka sapuan nama firma
   (hitung ulang sendiri: grep -rn "KAP Wijaya Hartono & Rekan" migration/src) sebagai
   temuan terpisah untuk keputusan Ari.

ADENDUM NAVIGASI (Program F)
- Deep-link tab lewat useInitialTab; one-shot seed di sessionStorage
  'ams.navtab.<id>'; alamat hash diurus route_hash.ts. Pakai yang ada.
- Gerbang: uji membuktikan RUTE/TAB yang dihasilkan benar, bukan sekadar chip tampil.

BATAS
- JANGAN menambahkan persistensi ke cockpit. Ia lensa baca-saja by design.
- JANGAN menyapu 94 situs literal nama firma di 79 berkas. Perbaiki cockpit saja,
  laporkan sisanya. Sapuan repo-wide adalah PR tersendiri dengan gerbang tersendiri.
- JANGAN mengubah komposisi tab, isi kartu, atau angka apa pun.
- JANGAN memecah view_cockpit2.tsx dalam PR ini (1167 baris memang di atas kebiasaan
  repo, tapi memecah + mengubah perilaku dalam satu PR membuat reviu mustahil).
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; tujuh uji cockpit lama tetap hijau.
[ ] nav('cockpit', { tab:'…' }) benar-benar membuka tab itu, dan tautan hash pulih
    setelah muat ulang.
[ ] Nol literal nama firma di kode view_cockpit2.tsx, dijaga gerbang sumber.
[ ] Cockpit tetap tanpa persistensi.
[ ] Tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan memuat hitungan sapuan nama firma repo-wide sebagai temuan terpisah.
```
