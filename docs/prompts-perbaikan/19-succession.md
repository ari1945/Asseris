# Prompt perbaikan — modul `succession` (Suksesi & Karier)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-D (a11y) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini termasuk yang paling matang di grup SDM. Ia
> memakai mesin nyata (`canon_succession`: `readinessOf`, `successionRoleState`), dan
> — jarang di repo ini — ia **membandingkan klaim dengan turunan**: `successionRoleState`
> menandai `contradicts` ketika label kesiapan yang tertulis di data tidak sama dengan
> kesiapan yang dihitung dari sertifikasi × kompetensi × progres IDP.
>
> Cacatnya justru ada pada apa yang terjadi SETELAH pembandingan itu: hasilnya nyaris
> tidak disampaikan. Satu variabel agregat dihitung lalu dibuang, dan peringatan
> per-kandidat menyusut jadi satu karakter "⚠" tanpa nama yang bisa dibaca siapa pun
> selain pengguna tetikus yang menghovernya.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah
   dan hasilnya. Klaim "absen" di repo ini secara historis SALAH SISTEMATIS.
   Contoh nyata dari modul tetangga: `A.byId` TERLIHAT seperti bisa melempar, padahal
   ia punya fallback (data_people.ts:283). Prompt sebelumnya salah menebak itu.
   Baca fungsinya, jangan menyimpulkan dari pemakaiannya.
2. SSOT. Angka & penilaian berasal dari canon*/data*, bukan literal atau turunan
   aritmatika di view.
3. TEMUAN YANG DIHITUNG WAJIB DISAMPAIKAN. Kalau kode sudah menghitung sebuah sinyal
   (kontradiksi, pemblokir, kesenjangan), menyembunyikannya sama buruknya dengan tidak
   menghitungnya — pengguna menanggung risiko yang sistem sebenarnya sudah tahu.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. JANGAN MENAMAI YANG MATI; dan jangan menyampaikan makna lewat glyph saja.
6. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
7. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: sampaikan hasil pembandingan klaim-vs-bukti yang sudah dihitung modul ini,
dan buat tabel perannya dapat dioperasikan dengan papan-ketik.

KONTEKS MODUL
- id modul: succession (grup "SDM & Kepatuhan"); butuh CAP.HR_MODULE_VIEW
- berkas: migration/src/view_pc_org.tsx → fungsi `SuccessionPlanning()` baris 288-…
  Berkas ini juga memuat modul `orgchart` (`OrgChart`) — JANGAN sentuh.
- mesin: migration/src/canon_succession.ts → readinessOf · successionRoleState ·
  READINESS_LABEL · READINESS_ORDER · ReadinessBlocker
- data: AMS.SUCCESSION_ROLES · CAREER_LADDER · IDP · COMPETENCY_ACTUAL ·
  COMPETENCY_REQ · READY_COLOR

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Kesiapan SUDAH diturunkan mesin, bukan literal. `readiness` di data hanya
  DIBANDINGKAN, tidak dipercaya (SC-18). Ini benar — pertahankan.
- Ekspor XLSX tersegel, memakai nama firma SSOT (`A.FIRM.short`), dan kolom
  "Kesiapan" pada lembar Kandidat Penerus memakai label TURUNAN (`d.label`) plus
  pemblokir yang dienumerasi. Ini sudah benar; jangan diubah.
- Gerbang kapabilitas view ada. Bukan cacat.
- Modul tidak menyimpan state; wajar untuk tampilan perencanaan.

CACAT

S1 · Sinyal terpenting modul ini dihitung lalu dibuang  [P0 — kerjakan]
    view_pc_org.tsx:298
      const contradicting = roleStates.reduce((n, r) =>
        n + r.successors.filter(s => s.contradicts).length, 0);
    Grep seluruh berkas: `contradicting` hanya muncul di baris itu. Ia tidak pernah
    dirender. Empat kartu KPI menampilkan jumlah peran, penerus siap, risiko
    kehilangan, dan tanpa penerus — tetapi TIDAK menampilkan berapa banyak klaim
    kesiapan yang dibantah bukti.
    Padahal itulah keluaran paling berharga modul ini: "rencana suksesi Anda memuat N
    kandidat yang datanya mengatakan siap, sementara sertifikasi/kompetensi/IDP-nya
    mengatakan tidak."
    Perbaiki: sampaikan angka itu di tempat yang setara dengan KPI lain, dengan
    penjelasan yang bisa ditindaklanjuti.
    SEBELUM itu, konfirmasi satu hal dan laporkan jawabannya: variabel ini tidak
    terpakai — mengapa `npm run lint` tidak menangkapnya? Kalau gerbang lint yang
    seharusnya merah ternyata diam, itu temuan tersendiri yang lebih besar daripada
    modul ini. Jangan diperbaiki sendiri; laporkan.

S2 · Peringatan kontradiksi disampaikan lewat satu glyph tanpa nama  [P0 — kerjakan]
    Pada kartu kandidat penerus (tab "Peta Suksesi"):
      <span className="badge" title={blockers…}>{d.label}{d.label !== s.readiness ? ' ⚠' : ''}</span>
    Tiga masalah sekaligus:
      · "⚠" tidak punya nama aksesibel — pembaca layar tidak menyampaikan apa pun
        yang bermakna;
      · penjelasannya (daftar pemblokir) hanya ada di atribut `title` pada <span>,
        yang tidak dapat dijangkau papan-ketik;
      · tidak ada yang menyebutkan APA yang diklaim data, sehingga pengguna melihat
        label turunan + tanda seru tanpa tahu klaim yang dibantahnya.
    Perbaiki: nyatakan kontradiksinya dengan teks — apa yang diklaim, apa yang
    diturunkan, dan apa pemblokirnya — dalam bentuk yang terbaca pembaca layar dan
    dapat dijangkau papan-ketik. `ReadinessBlocker` sudah menyediakan `detail`
    ter-enumerasi; pakai itu, jangan merangkum jadi kalimat baru.

S3 · Baris tabel peran adalah kontrol palsu  [P1 — kerjakan]
    Tab "Peta Suksesi": <tr … onClick={() => setSel(r.id)} style={{ cursor:'pointer' }}>
    Memilih peran kunci — satu-satunya interaksi utama modul ini — mustahil tanpa
    tetikus: <tr> tidak fokusabel dan tidak menanggapi Enter/Space.
    Perbaiki dengan kontrol native di dalam baris (pola yang sudah dipakai di repo),
    bukan dengan menempelkan role/tabIndex pada <tr>. Beri cincin fokus yang terlihat.
    Catatan: modul `orgchart` di berkas yang SAMA punya cacat sejenis. Kalau prompt
    16-orgchart sudah dikerjakan lebih dulu, ikuti pola yang dipakai di sana supaya
    berkas ini tidak berisi dua gaya berbeda. Kalau belum, jangan ikut memperbaikinya
    — cukup pastikan polamu bisa diikuti nanti.

S4 · Pemangku/kandidat yang hilang dari roster dikarang menjadi orang  [P1 — kerjakan]
    `A.byId(r.incumbent)` dan `A.byId(s.id)` dipakai langsung sebagai `ic.name`,
    `inc.name`, `p.name`. `byId` TIDAK melempar — periksa data_people.ts:283:
      const byId = (id) => A.STAFF.find(s => s.id === id)
                        || { id, name: id, role: '', grade: 'Junior', cert: '' };
    Jadi ketika seorang pemangku jabatan atau kandidat tidak ada di roster, modul
    menampilkan "karyawan" bernama 'EMP-0xx' berjenjang Junior. Ini paling berbahaya
    justru di modul ini: perencanaan suksesi ADALAH tentang orang yang mungkin pergi,
    dan data keluar (AMS.EXITS) memang ada di repo.
    Lebih jauh: fallback itu memberi `grade: 'Junior'` dan `cert: ''`, yang kemudian
    MASUK ke `readinessFor()` — sehingga mesin kesiapan menghitung angka untuk orang
    yang tidak ada, dan angka itu ikut ke ekspor tersegel.
    Perbaiki: rujukan yang tidak dapat diselesaikan ditampilkan sebagai rujukan yang
    tidak dapat diselesaikan, dan TIDAK dihitung kesiapannya.
    JANGAN mengubah `byId` — ia dipakai lintas modul; catat sebagai usulan bila perlu.

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji hari ini)
`canon_succession.ts` sudah murni dan dapat diuji langsung. Untuk bagian yang masih
di dalam view, ekstrak ke berkas .ts murni dengan ekspor bernama; perilaku tidak
berubah. Berkas uji .ts WAJIB bebas `any`.
Minimal yang dipaku:
  a. Jumlah kontradiksi yang dihitung == jumlah kandidat yang label turunannya berbeda
     dari klaim data — dan angka itu benar-benar sampai ke lapisan tampilan (uji
     fungsi/selector-nya, bukan sekadar keberadaannya). (Merah sebelum S1.)
  b. Sebuah kandidat yang klaimnya 'Siap' tetapi sertifikasinya kurang menghasilkan
     kontradiksi DAN daftar pemblokir yang tidak kosong. (Merah sebelum S1/S2 —
     dan tidak bisa dipuaskan dengan mengubah teks.)
  c. Kandidat/pemangku dengan id yang tidak ada di roster: tidak menghasilkan orang
     berjenjang 'Junior', dan tidak menghasilkan skor kesiapan. (Merah sebelum S4.)
  d. Gerbang sumber a11y: nol `<tr onClick>` / `<span onClick>` / `<div onClick>` di
     view_pc_org.tsx — buang komentar dulu sebelum memindai (pola helper `kode()` di
     cockpit_conventions.test.ts). Uji ini akan ikut menutup modul `orgchart` di
     berkas yang sama; itu disengaja. (Merah sebelum S3.)
  e. Makna tidak disampaikan lewat glyph saja: tidak ada '⚠' yang berdiri tanpa teks
     pendamping yang terbaca. (Merah sebelum S2.)

LANGKAH
1. INVESTIGASI — konfirmasi keempat cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca canon_succession.ts seluruhnya lebih dulu dan nyatakan dengan kalimatmu sendiri:
   apa yang membuat `contradicts` bernilai true, dan apa saja jenis `ReadinessBlocker`.
   Jangan menebak dari pemakaian di view.
2. RENCANA — termasuk bentuk penyampaian kontradiksi (S1/S2). Ini menyentuh apa yang
   DILIHAT pengguna; kalau ada pilihan yang lebih baik daripada menambah kartu KPI
   keempat-plus-satu, usulkan singkat lalu lanjutkan dengan yang paling sederhana.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — S1 sampai S4.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan
   conduct_rotation & css_tokens tetap hijau.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · JAWABAN atas pertanyaan
   lint di S1 · yang TIDAK dikerjakan + alasannya · asumsi (seharusnya nol).

ADENDUM A11Y (Program D)
- Kontrol native, cincin fokus terlihat, tidak ada makna yang hanya lewat warna atau
  glyph.
- Penjelasan tidak boleh hanya di `title` pada elemen non-fokusabel.
- Gerbang: axe 0 critical untuk modul ini, plus smoke keyboard — Tab ke sebuah peran
  kunci, Enter, panel kandidat berubah.

BATAS
- JANGAN menyentuh `OrgChart` di berkas yang sama (kecuali gerbang sumber (d) yang
  memang berlaku untuk seluruh berkas).
- JANGAN mengubah `canon_succession.ts` kecuali ada cacat yang kamu buktikan di sana
  — kalau ada, laporkan dulu.
- JANGAN mengubah `byId` di data_people.ts.
- JANGAN mengubah bentuk ekspor XLSX; ia sudah benar.
- JANGAN mengarang label kesiapan, pemblokir, atau kandidat yang tidak ada di data.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root.
[ ] Jumlah kontradiksi klaim-vs-bukti sampai ke layar, bukan berhenti di variabel.
[ ] Setiap kontradiksi menyebut klaimnya, turunannya, dan pemblokirnya dalam teks yang
    terbaca pembaca layar dan terjangkau papan-ketik.
[ ] Memilih peran kunci bisa dilakukan penuh dengan papan-ketik, cincin fokus terlihat.
[ ] Rujukan orang yang tidak ada di roster tidak menjadi "Junior" dan tidak dihitung
    kesiapannya — dibuktikan uji.
[ ] Laporan memuat jawaban mengapa lint tidak menangkap variabel tak terpakai.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
