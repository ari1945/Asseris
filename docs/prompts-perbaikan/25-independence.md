# Prompt perbaikan — modul `independence` (Independensi Firma & Rotasi)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-C (integritas) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini memuat deklarasi independensi, konflik
> kepentingan, dan rotasi partner emiten — artefak kepatuhan SA 220 / Kode Etik IAPI /
> POJK 13/2017. Fondasinya benar: server memfilter baris per-pengguna
> (`PERSONAL_STATE_KEYS`) dan menggerbang tulis dengan `HR_MANAGE` (`rbac.ts:172`).
>
> Yang salah ada di lapisan klien, dan bentuknya khas: **UI menawarkan aksi yang server
> pasti tolak, lalu penolakannya tidak terlihat**. Ditambah satu hal yang lebih berat
> untuk modul kepatuhan — rantai persetujuan tiga lapis yang tidak menegakkan
> pemisahan tugas sama sekali: satu orang dapat menandatangani ketiganya.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya. Klaim "absen" di repo ini secara historis SALAH SISTEMATIS — di modul ini
   khususnya, sebagian penjagaan yang tampak hilang ternyata ADA di server. Periksa
   kedua sisi sebelum menyimpulkan.
2. SSOT. Angka, tanggal, dan identitas berasal dari canon*/data*/sesi, bukan literal.
3. AKSI YANG PASTI DITOLAK TIDAK BOLEH DITAWARKAN. Kalau pengguna tak berwenang, UI
   menyatakan itu; ia tidak menampilkan tombol yang gagal diam-diam.
4. RANTAI PERSETUJUAN YANG TIDAK MEMISAHKAN PERAN BUKAN RANTAI. Kalau satu orang bisa
   mengisi semua lapis, lapisnya hiasan.
5. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
6. JANGAN MENAMAI YANG MATI — tombol mati diaktifkan atau dihapus.
7. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
8. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: hentikan modul `independence` menawarkan aksi yang tidak berwenang dilakukan
pemakainya, dan tegakkan pemisahan peran pada rantai persetujuan deklarasi.

KONTEKS MODUL
- id modul: independence (grup "SDM & Kepatuhan")
- berkas: migration/src/view_people.tsx → fungsi `Independence()` baris 368-551 dan
  `IndepDrawer()` baris 552-671. Berkas ini juga memuat modul `hcm` (HCM) dan `cpe`
  (CPETracker) — JANGAN sentuh keduanya.
- kunci state: 'independence' · 'indepAppr' · 'indepThreats' · 'indepRotAck'
- JANGAN keliru dengan modul `teamindep` (Independensi Tim, view_independence.tsx) —
  itu modul berbeda dengan ujinya sendiri (member_independence.test.ts).

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- BACA server: keempat kunci di atas ada di `PERSONAL_STATE_KEYS` (contexts.tsx:572),
  jadi hidrasinya lewat `personal.get` yang memfilter baris per-pengguna. Pengguna
  non-privileged TIDAK menerima baris kolega. **Ini bukan kebocoran data — jangan
  melaporkannya sebagai kebocoran.**
- Tulis ke keempat kunci itu digerbang `HR_MANAGE` di server (rbac.ts:172).
- Ambang rotasi memakai `rotTier(tenure, rotationLimit)` — SSOT, bukan literal.
- Ekspor PDF deklarasi sudah tersegel (K-06). Isi & strukturnya benar.

CACAT

I1 · UI menawarkan aksi yang server pasti tolak, dan penolakannya senyap  [P0]
    Di seluruh fungsi `Independence()` (baris 368-551) tidak ada satu pun
    `auth.can(CAP.*)`, tidak ada `AccessDenied`. Konfirmasi sendiri:
      sed -n '368,552p' migration/src/view_people.tsx | grep -n "can(\|CAP\.\|AccessDenied"
    Bandingkan dengan DUA modul lain di berkas yang sama: `HCM()` dan
    `SuccessionPlanning()` keduanya menggerbang `CAP.HR_MODULE_VIEW` lalu merender
    `<AccessDenied>`. Modul independensi satu-satunya yang tidak.
    Akibatnya untuk pengguna tanpa HR_MANAGE: tombol toggle deklarasi, tombol
    persetujuan berlapis, penambahan ancaman, dan pengakuan rotasi semuanya TAMPIL dan
    dapat diklik — lalu tulisannya ditolak server tanpa pesan apa pun. Pengguna
    mengira tindakannya tercatat.
    Perbaiki: kapabilitas ditegakkan di UI sebelum aksi ditawarkan, dan kegagalan tulis
    yang tetap terjadi WAJIB terlihat. Pilih gerbang yang tepat — periksa lebih dulu
    apakah modul ini seharusnya tertutup penuh (seperti HCM) atau terbuka-baca dengan
    aksi yang tergerbang. Kalau menurutmu jawabannya tidak jelas dari kode, TANYA;
    ini keputusan kebijakan akses, bukan keputusan teknis.

I2 · Rantai persetujuan tiga lapis tidak memisahkan peran  [P0]
    view_people.tsx (setApprove): `steps[n - 1] = { by: me, at: indepToday }` untuk n
    berapa pun, tanpa memeriksa siapa `me`.
    Komentar di atasnya menyatakan maksud rantainya: "self → reviu manajer etika →
    persetujuan partner". Kode tidak menegakkan satu pun dari tiga peran itu, dan tidak
    mencegah orang yang sama mengisi ketiga lapis berturut-turut.
    Untuk deklarasi independensi, rantai tanpa pemisahan peran menghapus seluruh
    maknanya: yang tercatat hanya bahwa seseorang menekan tombol tiga kali.
    Perbaiki: tegakkan pemisahan tugas — lapis mana boleh diisi siapa, dan seorang yang
    sudah mengisi satu lapis tidak boleh mengisi lapis berikutnya.
    Pola SoD sudah ada di repo — cari lebih dulu (`grep -rn "canSignOwn\|SoD" migration/src
    server/src`) dan PAKAI yang ada; jangan menulis mekanisme keempat.
    Ingat: server otoritatif. Kalau penegakan ini juga harus ada di server dan belum
    ada, katakan itu di laporan — jangan menganggap gerbang UI sudah cukup.

I3 · Tombol "Minta Deklarasi" mati  [P1]
    view_people.tsx:452 — `<Btn sm><I.send size={13} /> Minta Deklarasi</Btn>` tanpa
    onClick, terpasang di SubBar modul.
    Aktifkan (kirim permintaan deklarasi yang benar-benar tercatat) atau hapus.
    Tidak ada opsi ketiga, dan JANGAN sekadar memberinya aria-label.
    Kalau mengaktifkannya berarti membuat alur baru yang belum ada, hapus tombolnya dan
    tulis alurnya sebagai usulan.

I4 · Dua klok bercampur dalam satu jejak  [P1]
    view_people.tsx: `const indepToday = new Date().toLocaleDateString('id-ID', …)`
    Seluruh aplikasi memakai `AMS.TODAY` sebagai klok SSOT (K-02); modul ini memakai
    jam sistem nyata. Akibatnya jejak persetujuan, mitigasi ancaman, dan pengakuan
    rotasi tercatat pada tanggal nyata sementara data di sekitarnya berada di periode
    yang berbeda — jejak yang tidak dapat direkonsiliasi dengan apa pun.
    K-02 luput di sini karena cacatnya bukan tanggal literal. Perbaiki ke AMS.TODAY.

I5 · Pelaku jejak bisa tercatat sebagai "Auditor"  [P1]
    view_people.tsx:371 — `const me = auth?.user?.name || 'Auditor'`, lalu `me` dipakai
    sebagai `by` pada steps persetujuan, mitigasi ancaman, dan pengakuan rotasi.
    Jejak auditable yang pelakunya bernama "Auditor" bukan jejak.
    Repo punya `useCurrentAuditor()` (identitas sesi nyata W7, dipakai a.l. di
    view_mytasks_parts.tsx:88). Pakai itu. Bila identitas benar-benar tak tersedia,
    aksi tulis TIDAK dilakukan — bukan dicatat atas nama fallback.

I6 · Id ancaman diturunkan dari panjang array  [P2]
    view_people.tsx (addThreat): `'TH-' + personId + '-' + (list.length + 1)` memakai
    panjang SELURUH daftar ancaman, bukan milik orang itu. Hapus satu ancaman lalu
    tambah lagi → id terulang, dan patch/tanda tangan mendarat di ancaman yang salah.
    Perbaiki dengan id yang dijamin unik terhadap seluruh daftar yang ada.

I7 · Nama firma hardcode di dalam PDF deklarasi yang TERSEGEL  [P2]
    view_people.tsx (onExportDecl): `firm: 'KAP Wijaya Hartono & Rekan'`.
    Deklarasi independensi adalah dokumen kepatuhan yang keluar dari aplikasi dengan
    segel. Menyegel nama firma yang salah memberi otoritas pada dokumen yang keliru.
    Pola SSOT sudah dipakai di tempat lain — `AMS.FIRM?.name` (view_analytical.tsx:185)
    atau `A.FIRM.short` (view_pc_org.tsx). Perbaiki DI BERKAS INI SAJA; jangan menyapu
    repo (94 situs / 79 berkas — PR tersendiri).

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji khusus hari ini —
member_independence.test.ts milik modul `teamindep`, bukan modul ini)
Ekstrak logika murni (kelayakan lapis persetujuan, pembuatan id ancaman, derivasi
status rotasi) ke berkas .ts murni dengan ekspor bernama; perilaku tidak berubah.
Berkas uji .ts WAJIB bebas `any`.
Minimal yang dipaku:
  a. Orang yang sudah mengisi satu lapis persetujuan tidak dapat mengisi lapis
     berikutnya. (Merah sebelum I2.)
  b. Lapis persetujuan hanya dapat diisi peran yang berhak; peran lain ditolak.
     (Merah sebelum I2.)
  c. Pengguna tanpa kapabilitas tulis tidak ditawari aksi tulis. (Merah sebelum I1.)
  d. Tidak ada aksi tulis yang tercatat tanpa identitas pelaku yang nyata.
     (Merah sebelum I5.)
  e. Id ancaman unik setelah penghapusan-lalu-penambahan. (Merah sebelum I6.)
  f. Gerbang sumber: nol `new Date()` tanpa AMS.TODAY dan nol literal nama firma di
     kode Independence — buang komentar dulu sebelum memindai (pola helper `kode()`
     di cockpit_conventions.test.ts). (Merah sebelum I4/I7.)

LANGKAH
1. INVESTIGASI — konfirmasi ketujuh cacat di HEAD sekarang; tempelkan bukti barisnya.
   Sebelum menyentuh I1/I2, jawab dulu dengan bukti: (i) apa yang server izinkan dan
   tolak untuk keempat kunci ini; (ii) pola SoD apa yang SUDAH ada di repo. Kalau kamu
   melewatkan langkah ini kamu akan menulis mekanisme keempat.
2. RENCANA — termasuk keputusan gerbang akses I1 (tertutup penuh vs terbuka-baca).
   Kalau tidak jelas dari kode, TANYA sebelum menulis kode.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — I1 sampai I7, kecuali bagian yang menunggu jawaban.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan rbac.test.ts,
   member_independence.test.ts, dan uji HCM/suksesi tetap hijau — kalau salah satunya
   merah, kamu keluar dari lingkup.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · apakah penegakan SoD
   juga dibutuhkan di server (dan apakah sudah ada) · yang TIDAK dikerjakan +
   alasannya · asumsi (seharusnya nol).

ADENDUM INTEGRITAS (Program C)
- Identitas pelaku dari sesi, bukan literal maupun fallback.
- Aksi tulis meninggalkan jejak yang dapat diperiksa, dengan klok SSOT.
- Klaim status di UI ("Dideklarasikan", "Dimitigasi", "Disetujui") hanya boleh muncul
  bila tulisannya benar-benar berhasil — bukan optimistik atas tulisan yang mungkin
  ditolak server.
- Gerbang: uji yang membuktikan penolakan server TERLIHAT oleh pengguna.

BATAS
- JANGAN menyentuh `HCM` atau `CPETracker` di berkas yang sama.
- JANGAN menyentuh modul `teamindep` (view_independence.tsx).
- JANGAN mengubah `PERSONAL_STATE_KEYS` atau peta kapabilitas server tanpa
  menyatakannya sebagai perubahan tersendiri di laporan.
- JANGAN menyapu literal nama firma ke seluruh repo.
- JANGAN mengubah isi/struktur PDF deklarasi selain nama firmanya.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; rbac & member_independence tetap hijau.
[ ] Pengguna tanpa wewenang tidak ditawari aksi tulis, dan kegagalan tulis terlihat.
[ ] Satu orang tidak dapat mengisi lebih dari satu lapis rantai persetujuan.
[ ] Tombol "Minta Deklarasi" hidup atau hilang — tidak ada tombol mati tersisa.
[ ] Seluruh jejak memakai klok SSOT dan identitas sesi nyata.
[ ] Id ancaman unik, dibuktikan uji.
[ ] Nol literal nama firma di kode Independence, dijaga gerbang sumber.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyatakan apakah SoD juga perlu ditegakkan di server.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
