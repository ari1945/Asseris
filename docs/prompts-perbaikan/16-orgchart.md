# Prompt perbaikan — modul `orgchart` (Struktur Organisasi)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-D (a11y) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini kecil dan tidak menyimpan apa pun — ia
> menggambar struktur dari data. Karena itu cacatnya bukan soal angka salah, melainkan
> soal **orang yang hilang dari gambar tanpa ada yang memberi tahu**, dan **bagan yang
> tak bisa disentuh sama sekali dengan papan-ketik**.
>
> Satu cacat di sini bersambung dengan modul `hcm`: karyawan yang ditambahkan lewat
> "Karyawan Baru" tidak punya garis pelaporan, dan bagan ini menampilkan siapa pun
> tanpa garis pelaporan sebagai **puncak organisasi** — setara Managing Partner.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah
   dan hasilnya. Klaim "absen" di repo ini secara historis SALAH SISTEMATIS.
2. SSOT. Angka & struktur berasal dari data, bukan literal di view.
3. TIDAK ADA PENGHILANGAN SENYAP. Kalau sebuah tampilan tidak dapat menampilkan
   sebagian data, ia WAJIB mengatakannya. Daftar yang diam-diam tidak lengkap lebih
   buruk daripada daftar yang mengaku tidak lengkap.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. JANGAN MENAMAI YANG MATI. aria-label pada kontrol yang tak fokusabel memperburuk a11y.
6. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
7. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: buat bagan organisasi dapat dioperasikan dengan papan-ketik, dan hentikan
modul ini menghilangkan orang dari struktur tanpa suara.

KONTEKS MODUL
- id modul: orgchart (grup "SDM & Kepatuhan")
- berkas: migration/src/view_pc_org.tsx → fungsi `OrgChart()` baris 37-158.
  Berkas ini juga memuat modul `succession` (`SuccessionPlanning`) — JANGAN sentuh.
- data struktur: data_people.ts → `ORG` (10 entri eksplisit + `ORG_EXT` dari
  data_roster.ts untuk 59 personel) dan `DEPT_HEAD`
- roster: AMS.STAFF (data_part1.ts), dijaga hcm_roster.test.ts

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Ekspor XLSX sudah tersegel DAN sudah memakai nama firma dari SSOT
  (`A.FIRM.short || 'KAP'`) — bukan literal 'KAP Wijaya Hartono & Rekan' seperti
  modul lain. Selesai; jangan disentuh.
- Headcount pada kartu statistik memakai FIRM.partners+managers+staff, dan
  hcm_roster.test.ts sudah memaku bahwa FIRM menutup ke roster yang sama.
  Bukan cacat.
- Modul ini tidak menyimpan state; itu wajar untuk tampilan struktur.

CACAT

O1 · Bagan organisasi tidak dapat dioperasikan dengan papan-ketik  [P0 — kerjakan]
    Dua kontrol palsu:
      · view_pc_org.tsx:53 — simpul bagan adalah
        <span className="org-node …" onClick={() => setSel(s.id)}>
      · tab "Divisi" (sekitar baris 120) — kartu anggota adalah
        <div … onClick={() => setSel(m.id)} style={{ cursor:'pointer' }}>
    Keduanya tidak fokusabel, tidak menanggapi Enter/Space, dan menggagalkan gerbang
    axe. Akibatnya SELURUH interaksi modul ini — memilih orang untuk melihat detailnya —
    mustahil tanpa tetikus.
    Perbaiki dengan elemen native (<button> atau komponen dari ui.tsx), bukan dengan
    menambahkan role/tabIndex pada <span>/<div>. CSS `.org-node` boleh dipertahankan;
    yang berubah elemennya. Perhatikan `.org-tree` memakai pseudo-element ::before/
    ::after pada <li> untuk menggambar garis — pastikan penggantian elemen tidak
    merusak gambar garisnya, dan periksa hasilnya secara visual.
    Beri juga cincin fokus yang terlihat (pola sudah ada di repo — lihat uji
    cockpit_conventions.test.ts tentang "cincin fokus terlihat").

O2 · Tab "Divisi" menghilangkan orang tanpa suara  [P0 — kerjakan]
    view_pc_org.tsx:65  const depts = Object.keys(A.DEPT_HEAD);
    `DEPT_HEAD` memuat EMPAT divisi. Nilai `dept` pada `ORG` memuat LIMA:
      Audit & Asurans · Mutu, Etika & Non-Audit · Mutu & Operasi Audit ·
      Pemantauan Mutu · **Kepemimpinan Firma**
    'Kepemimpinan Firma' tidak punya kepala divisi, sehingga:
      · Managing Partner (EMP-001) TIDAK PERNAH muncul di tab "Divisi";
      · kartu statistik "Divisi / Unit" menyebut 4, padahal ada 5;
      · tidak ada satu pun tanda bahwa ada yang tidak terhitung.
    Perbaiki: divisi diturunkan dari data struktur yang sebenarnya (nilai `dept` pada
    ORG), bukan dari daftar kepala divisi. Divisi tanpa kepala tetap ditampilkan dengan
    kepalanya dinyatakan tidak ada — jangan menyembunyikan divisinya, dan jangan
    mengarang kepalanya.
    Verifikasi sendiri angkanya sebelum menulis kode (jangan percaya angka di prompt
    ini begitu saja) dan laporkan hasilmu.

O3 · Karyawan tanpa garis pelaporan diam-diam menjadi PUNCAK organisasi  [P1 — kerjakan]
    view_pc_org.tsx (render bagan): akar pohon adalah
      staff.filter(s => !(ORG[s.id] || {}).reports)
    Siapa pun yang tidak punya entri `ORG` memenuhi syarat itu. Modul `hcm` dapat
    menambah karyawan baru (view_people.tsx:39, dokumen `staffExtra`) dan penambahan
    itu TIDAK menulis garis pelaporan apa pun. Jadi setiap karyawan baru muncul sebagai
    akar, sejajar dengan Managing Partner, tanpa peringatan.
    Perbaiki di sisi TAMPILAN: bedakan "puncak organisasi yang sah" dari "belum punya
    atasan", dan tampilkan yang kedua sebagai keadaan yang perlu dibereskan — bukan
    sebagai fakta struktural.
    JANGAN memperbaikinya dengan mengubah modul `hcm` atau menambah field ke
    `staffExtra`. Kalau menurutmu penetapan atasan seharusnya jadi bagian dari
    penambahan karyawan, tulis itu sebagai usulan di laporan dan berhenti di situ —
    itu keputusan alur kerja SDM milik Ari.

O4 · `spanAll` rekursi tanpa penjaga siklus  [P1 — kerjakan]
    view_pc_org.tsx:45
      const spanAll = (id) => { let n = 0; const walk = (x) => childrenOf(x)
        .forEach(c => { n++; walk(c.id); }); walk(id); return n; };
    Tidak ada penjaga simpul yang sudah dikunjungi. Satu lingkaran pelaporan di `ORG`
    (A melapor ke B, B melapor ke A) membuat tab "Rentang Kendali" berekursi tanpa
    henti — tab-nya menggantung, bukan menampilkan pesan.
    Data hari ini bersih, tetapi `ORG` adalah data yang bisa berubah dan tidak ada
    gerbang yang melarang siklus. Perbaiki keduanya: penjaga di fungsi, dan gerbang
    di uji (lihat di bawah).

O5 · Kepala divisi yang tidak ada di roster dikarang menjadi orang  [P2 — kerjakan]
    view_pc_org.tsx:68 `const head = A.byId(A.DEPT_HEAD[d]);` lalu dipakai sebagai
    `head.name`.
    `byId` TIDAK melempar — periksa sendiri di data_people.ts:283:
      const byId = (id) => A.STAFF.find(s => s.id === id)
                        || { id, name: id, role: '', grade: 'Junior', cert: '' };
    Jadi id yang tak dikenal tidak menghasilkan error maupun kosong, melainkan seorang
    "karyawan" bernama 'EMP-042' berjenjang Junior yang tampil sebagai kepala divisi.
    Ketiadaan disulap jadi keberadaan, tanpa suara — persis kelas cacat yang sama
    dengan O2 dan O3.
    Perbaiki di sisi pemakai: bedakan orang yang benar-benar ada dari hasil fallback,
    dan tampilkan yang kedua sebagai rujukan yang tidak dapat diselesaikan.
    JANGAN mengubah `byId` itu sendiri — ia dipakai lintas modul dan mengubah
    kontraknya adalah perubahan tersendiri; catat sebagai usulan bila menurutmu perlu.

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji hari ini)
Ekstrak derivasi struktur (akar pohon, daftar divisi, rentang kendali) ke berkas .ts
murni dengan ekspor bernama supaya bisa diuji di node tanpa render; perilaku tidak
berubah. Berkas uji .ts WAJIB bebas `any`.
Minimal yang dipaku:
  a. Setiap nilai `dept` yang muncul di ORG ikut terwakili di daftar divisi yang
     dirender — nol orang hilang. (Merah sebelum O2.)
  b. Jumlah anggota seluruh divisi == jumlah orang yang punya entri ORG. Ini gerbang
     CAKUPAN, bukan tie-out: ia harus merah kalau satu divisi dibuang, dan tidak boleh
     bisa dipuaskan dengan menghitung ulang dari daftar yang sama.
  c. Karyawan tanpa entri ORG tidak diklasifikasikan sebagai puncak organisasi yang
     sah. (Merah sebelum O3.)
  d. `ORG` bebas siklus, DAN perhitungan rentang kendali tetap berakhir (tidak
     menggantung) ketika diberi data bersiklus. (Merah sebelum O4.)
  e. Setiap id pada DEPT_HEAD ada di roster. (Merah sebelum O5 hanya bila datanya
     memang rusak — kalau hijau sejak awal, katakan begitu; ia tetap berguna sebagai
     gerbang anti-kambuh, tapi JANGAN mengaku telah memerahkannya.)
  f. Gerbang sumber a11y: nol `<span onClick>` / `<div onClick>` di view_pc_org.tsx —
     buang komentar dulu sebelum memindai (pola helper `kode()` di
     cockpit_conventions.test.ts). (Merah sebelum O1.)

LANGKAH
1. INVESTIGASI — konfirmasi kelima cacat di HEAD sekarang; tempelkan bukti barisnya.
   Hitung sendiri jumlah nilai `dept` unik pada ORG (data_people.ts + ORG_EXT di
   data_roster.ts) dan bandingkan dengan `Object.keys(DEPT_HEAD)`. Laporkan angkanya.
2. RENCANA — termasuk bentuk tampilan untuk divisi tanpa kepala (O2) dan untuk orang
   tanpa atasan (O3). Untuk usulan penetapan atasan saat menambah karyawan: tulis,
   lalu BERHENTI di situ.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — O1 sampai O5.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan hcm_roster,
   css_tokens, dan conduct_rotation tetap hijau. Periksa bagan secara visual setelah
   O1: garis penghubung `.org-tree` tidak boleh rusak.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · angka divisi yang kamu
   hitung sendiri · usulan penetapan atasan (O3) · yang TIDAK dikerjakan + alasannya ·
   asumsi (seharusnya nol).

ADENDUM A11Y (Program D)
- Ganti kontrol palsu dengan elemen native; jangan menempelkan role/tabIndex pada
  <span>/<div> yang tetap bukan kontrol.
- Cincin fokus wajib terlihat.
- Gerbang: axe untuk modul ini 0 critical, plus smoke keyboard — Tab ke sebuah simpul,
  tekan Enter, panel detail berubah ke orang itu.

BATAS
- JANGAN menyentuh `SuccessionPlanning` di berkas yang sama.
- JANGAN mengubah modul `hcm` atau bentuk dokumen `staffExtra`.
- JANGAN mengubah roster, headcount, atau apa pun yang dijaga hcm_roster.test.ts.
- JANGAN mengarang kepala divisi, atasan, atau divisi yang tidak ada di data.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; hcm_roster & css_tokens tetap hijau.
[ ] Bagan dan kartu divisi dapat dioperasikan penuh dengan papan-ketik, dengan cincin
    fokus terlihat; garis penghubung bagan tetap utuh (diperiksa visual).
[ ] Nol orang hilang dari tab Divisi; divisi tanpa kepala tampil apa adanya.
[ ] Kartu "Divisi / Unit" menyebut angka yang sama dengan yang dirender.
[ ] Orang tanpa atasan tidak tampil sebagai puncak organisasi yang sah.
[ ] Rentang kendali berakhir pada data bersiklus, dan siklus dijaga uji.
[ ] Nol `<span onClick>`/`<div onClick>` di view_pc_org.tsx, dijaga gerbang sumber.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
