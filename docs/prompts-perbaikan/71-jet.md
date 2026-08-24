# Prompt perbaikan — modul `jet` (Journal Entry Testing)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-D (a11y) + D (definisi selesai).
>
> **Catatan pembuat prompt:** rangka modul ini benar — state ter-persist
> engagement-scoped (`jet.v1`), populasi & kriteria ditarik dari kanon bersama
> (`AMS_FORENSIC`, dipakai juga oleh Forensic Cash Flow), sign-off lewat `WpPanel`
> (SA 230), dan tipenya ditulis rapi tanpa `any`.
>
> Yang salah adalah **apa yang ditampilkan di atas rangka itu**. Corong populasi —
> bagian yang menjawab pertanyaan inti SA 240 ¶32, "dari populasi berapa Anda memilih,
> dan bagaimana Anda menyempitkannya" — dibangun dari tiga angka karangan, salah
> satunya penambah `+38` yang tak punya arti apa pun. Corong itu berdiri persis di
> bawah lencana bertuliskan **"SA 240 · ¶32"**, dan tidak ada satu kalimat pun yang
> mengaku bahwa angkanya bukan populasi klien.
>
> Ditambah: tombol **"Jalankan Pengujian"** — aksi utama modul ini — tidak melakukan
> apa-apa.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya.
2. ANGKA POPULASI ADALAH KLAIM AUDIT. Sebuah angka yang menyatakan "total jurnal
   entitas" bukan hiasan tata letak — ia adalah dasar kesimpulan cakupan pengujian.
   Angka semacam itu diturunkan dari data, atau tidak ditampilkan sama sekali.
   Tidak ada jalan tengah berupa angka masuk akal.
3. TIDAK ADA DATA ≠ ANGKA YANG MASUK AKAL. Bila populasi klien belum ada di aplikasi,
   katakan begitu di tempat pengguna membacanya.
4. JANGAN MENAMAI YANG MATI. Tombol tanpa handler diaktifkan atau dihapus — memberinya
   label, tooltip, atau atribut aksesibilitas memperburuk keadaan.
5. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
6. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
7. Kontrol NATIVE · skala tipografi 8 ukuran · WARNA LEWAT TOKEN, bukan hex ·
   `:any` baru = lint merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: hentikan modul ini menyajikan analisis populasi yang dikarang sebagai kertas
kerja SA 240, dan bereskan kontrol yang mati serta yang palsu.

KONTEKS MODUL
- id modul: jet (grup "2 · Pelaksanaan")
- berkas: migration/src/view_jet.tsx (236 baris)
- populasi & kriteria: migration/src/forensic_canon.ts → `AMS_FORENSIC.JOURNAL_POP`
  (populasi ilustratif tetap, ±belasan jurnal bernarasi) · `JET_CRITERIA` · `score()`
- state: `jet.v1`, engagement-scoped (AMS_PERSIST_SCOPE), RBAC WP_EDIT
- sign-off: `WpPanel` (SA 230)

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- `jet.v1` sudah engagement-scoped — isolasi W7.5 benar.
- Kriteria & skoring memakai kanon bersama `AMS_FORENSIC`, populasi yang SAMA dengan
  Forensic Cash Flow. Satu mesin, bukan dua. Pertahankan.
- Tipe state ditulis eksplisit tanpa `any` — pertahankan gaya itu di kode baru.
- `locked` (perikatan terkunci) sudah dihormati di semua penulis state.

CACAT

J1 · Corong populasi dibangun dari angka karangan  [P0]
    view_jet.tsx:
      const totalJE = 18452, manualJE = 1240;
      const funnel = [
        { l: 'Total Jurnal',        v: totalJE },
        { l: 'Jurnal Manual',       v: manualJE },
        { l: 'Memenuhi Kriteria',   v: flagged.length + 38 },
        { l: 'Dipilih untuk Diuji', v: flagged.length },
      ];
    Tiga masalah bertumpuk:
      · `18452` dan `1240` adalah literal — sama untuk SETIAP perikatan, tidak
        berhubungan dengan data klien mana pun;
      · `flagged.length + 38` — penambah yang tidak punya arti, ada semata agar corong
        menyempit secara meyakinkan;
      · setiap kartu mencetak "% dari tahap sebelumnya" — persentase yang dihitung
        rapi di atas angka yang tidak ada.
    Semua itu berdiri di bawah lencana "SA 240 · ¶32", yaitu paragraf tentang pemilihan
    jurnal dari populasi. Seorang auditor yang membaca layar ini wajar menyimpulkan
    bahwa populasi entitas berjumlah 18.452 dan bahwa penyempitannya terdokumentasi.
    Kerjakan — pilih SATU, dan katakan mana yang kamu pilih beserta alasannya:
      (a) turunkan seluruh angka corong dari populasi yang benar-benar ada di aplikasi
          (`JOURNAL_POP`), sehingga corong menggambarkan apa yang nyata meski kecil; atau
      (b) hapus corongnya dan ganti dengan pernyataan jujur bahwa populasi jurnal
          entitas belum tersedia di aplikasi, beserta apa yang dibutuhkan agar tersedia.
    Yang DILARANG: mempertahankan angka literal, mengganti `+38` dengan penambah lain,
    atau memberi corong itu label "ilustrasi" lalu membiarkannya berdiri di bawah
    klaim SA 240. Menandai sesuatu ilustrasi sah untuk demonstrasi mekanika; tidak sah
    untuk angka yang menjadi dasar kesimpulan cakupan.

J2 · Aksi utama modul ini tidak melakukan apa-apa  [P0]
    Dua tombol di SubBar tanpa `onClick`:
      <Btn sm disabled={locked}><I.upload/> Import GL</Btn>
      <Btn sm variant="primary" disabled={locked}><I.flask/> Jalankan Pengujian</Btn>
    "Jalankan Pengujian" adalah aksi utama sebuah modul pengujian jurnal. `disabled`
    hanya aktif saat perikatan terkunci, jadi pada perikatan terbuka tombol itu tampak
    hidup, dapat diklik, dan diam.
    Kerjakan: aktifkan atau hapus. Bila "Jalankan Pengujian" sebenarnya sudah terjadi
    terus-menerus (skoring dihitung ulang setiap render), maka tombol itu memang tidak
    punya pekerjaan — hapus, dan katakan begitu di laporan.
    "Import GL" kemungkinan besar tidak dapat diaktifkan tanpa alur impor yang belum
    ada. Kalau begitu: hapus tombolnya, dan tulis kebutuhannya sebagai usulan singkat
    (ia bertaut langsung dengan J1 — impor GL adalah yang membuat corong bisa nyata).

J3 · Sakelar kriteria adalah kontrol palsu  [P1]
    Daftar "Kriteria Risiko" memakai `<label … onClick={() => toggleCrit(c.id)}>` yang
    membungkus dua `<span>` bergaya sakelar. Tidak ada `<input>`, tidak ada
    `role="switch"`, tidak fokusabel, tidak menanggapi papan-ketik — dan `<label>`
    tanpa kontrol di dalamnya tidak menyampaikan apa pun ke pembaca layar.
    Kriteria inilah yang menentukan jurnal mana yang terpilih untuk diuji; memilihnya
    mustahil tanpa tetikus.
    Perbaiki dengan `<Switch>`/`<Check>` dari ui.tsx (CLAUDE.md §3.7). Pastikan status
    aktif/nonaktif terumumkan, dan hormati `locked` seperti sekarang.

J4 · Klok jejak memakai jam sistem, bukan klok SSOT  [P1]
    `function jetToday() { return new Date().toLocaleDateString('id-ID', …) }`
    Nilainya masuk ke field `at` pada setiap disposisi pengujian — jejak SA 230 tentang
    kapan sebuah jurnal diuji. Seluruh aplikasi memakai `AMS.TODAY`; modul ini memakai
    jam nyata, sehingga tanggal pengujian tidak dapat direkonsiliasi dengan tanggal
    apa pun di perikatan yang sama.
    Perbaiki ke `AMS.TODAY`.

J5 · Pelaku pengujian bisa tercatat sebagai "Auditor"  [P1]
    `const me = (auth && auth.user && auth.user.name) || 'Auditor';`
    `me` mengisi field `by` pada disposisi — siapa yang menguji jurnal itu. Kertas kerja
    yang penyusunnya bernama "Auditor" tidak memenuhi SA 230.
    Repo punya `useCurrentAuditor()` (identitas sesi nyata W7; contoh di
    view_mytasks_parts.tsx:88). Pakai itu. Bila identitas tak tersedia, disposisi TIDAK
    dicatat — bukan dicatat atas nama fallback.

J6 · Warna corong memakai hex mentah  [P2]
    `'#024661'`, `'#005085'`, `'#c79a1e'`, `'#b3261e'` pada definisi funnel.
    Repo mewajibkan token warna semantik. Bila corongnya dihapus (opsi J1-b), cacat ini
    ikut hilang — katakan begitu daripada memperbaikinya dua kali.

CATATAN LINGKUP — populasi bersama antar-perikatan
`JOURNAL_POP` sama untuk setiap perikatan, sementara disposisi pengujiannya
engagement-scoped. Artinya dua perikatan menguji jurnal yang identik dan menyimpan
kesimpulan yang berbeda. Itu konsekuensi dari populasi ilustratif, dan penyelesaiannya
adalah impor GL nyata (lihat J2) — BUKAN pekerjaanmu di PR ini.
LAPORKAN saja, dengan satu kalimat tentang bagaimana J1 yang kamu pilih berinteraksi
dengan kenyataan ini.

GERBANG YANG HARUS KAMU TULIS
Ekstrak derivasi murni (corong/populasi, penyaringan kriteria, ambang nilai) ke berkas
.ts murni dengan ekspor bernama; perilaku tidak berubah. Berkas uji .ts WAJIB bebas
`any` — dan modul ini sudah bertipe rapi, jadi jangan menurunkan standarnya.
  a. Tidak ada angka populasi yang tidak dapat dijelaskan dari data: setiap nilai
     corong yang ditampilkan berubah ketika populasinya berubah. (Merah sebelum J1-a;
     bila kamu memilih J1-b, ganti dengan uji bahwa tidak ada angka populasi yang
     dirender sama sekali.)
  b. Menonaktifkan sebuah kriteria MENGURANGI jumlah jurnal terpilih — penyaringan
     benar-benar menyaring. (Kemungkinan hijau sejak awal; kalau ya, katakan begitu
     dan JANGAN mengaku telah memerahkannya.)
  c. Disposisi pengujian tidak tercatat tanpa identitas sesi nyata. (Merah sebelum J5.)
  d. Tanggal disposisi mengikuti klok SSOT: majukan `AMS.TODAY` → tanggal ikut maju.
     (Merah sebelum J4.)
  e. Gerbang sumber untuk view_jet.tsx: nol `<Btn>` tanpa `onClick`, nol
     `<label onClick>`/`<span onClick>`/`<div onClick>`, nol warna heksadesimal, nol
     `new Date()` tanpa AMS.TODAY — buang komentar dulu sebelum memindai (pola helper
     `kode()` di cockpit_conventions.test.ts). (Merah sebelum J2/J3/J4/J6.)

LANGKAH
1. INVESTIGASI — konfirmasi keenam cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca `forensic_canon.ts` lebih dulu dan nyatakan dengan kalimatmu sendiri: berapa
   jurnal yang benar-benar ada di populasi, apa yang dihitung `score()`, dan apakah
   ada apa pun di aplikasi ini yang mengetahui jumlah jurnal entitas klien.
2. RENCANA — nyatakan pilihanmu untuk J1 (a atau b) beserta alasannya SEBELUM menulis
   kode. Kalau menurutmu keduanya salah, usulkan yang ketiga dan berhenti.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — J1 sampai J6.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan modul
   `forensic` (Forensic Cash Flow) yang memakai populasi yang sama tetap benar —
   kalau kamu menyentuh `forensic_canon.ts`, kamu keluar dari lingkup.
6. LAPORAN — sebelum→sesudah bagi pengguna · pilihan J1 dan alasannya · uji
   merah→hijau · nasib kedua tombol (aktif atau hapus, dan mengapa) · usulan impor GL
   bila kamu menghapus tombolnya · catatan populasi bersama antar-perikatan · yang
   TIDAK dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN mengarang populasi baru, dan jangan mengganti `+38` dengan penambah lain.
- ⛔ JANGAN memberi label "ilustrasi" pada corong lalu membiarkannya di bawah klaim
  SA 240 — itu bukan pengungkapan, itu tameng.
- ⛔ JANGAN membangun alur impor GL di PR ini.
- JANGAN mengubah `forensic_canon.ts` (dipakai bersama modul `forensic`).
- JANGAN mengubah skema state `jet.v1` sehingga disposisi lama hilang; kalau perlu
  berubah, jelaskan jalur kompatibilitasnya.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; modul `forensic` tidak terganggu.
[ ] Tidak ada satu pun angka populasi di layar yang tidak dapat dijelaskan dari data.
[ ] Tidak ada tombol mati tersisa di modul ini.
[ ] Kriteria risiko dapat dipilih penuh dengan papan-ketik, statusnya terumumkan.
[ ] Disposisi pengujian memakai identitas sesi nyata dan klok SSOT.
[ ] Nol hex, nol kontrol palsu, nol `new Date()` di view_jet.tsx — dijaga gerbang sumber.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut pilihan J1, nasib kedua tombol, dan apa yang TIDAK dikerjakan.
```
