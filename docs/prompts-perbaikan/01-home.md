# Prompt perbaikan — modul `home` (Beranda)

> Dibuat 2026-08-20 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-D (a11y) + D (definisi selesai).
>
> **Catatan pembuat prompt:** Beranda BUKAN modul dangkal. Investigasi awal
> (2026-08-20, commit `2632a23`) menemukan: SSOT bersih, tanpa tanggal beku, tanpa
> tombol mati, isolasi W7.5 dihormati, degradasi offline ada. Karena itu tugasnya
> **menutup tiga cacat spesifik + mengunci perilaku dengan uji**, bukan menaikkan
> level. Jangan mengubah framing ini menjadi "perdalam Beranda".

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src; app/,
build/, NeoSuite AMS.html adalah referensi beku — jangan diedit.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan pernah menulis "fitur X belum ada" / "modul ini tidak
   punya Y" tanpa grep lebih dulu. Di repo ini klaim "absen" secara historis SALAH
   SISTEMATIS. Setiap klaim absen harus disertai perintah grep yang kamu jalankan
   dan hasilnya.
2. SSOT. Angka berasal dari canon*/data*, bukan literal di view.
3. GERBANG HARUS BISA MERAH. Sebelum memperbaiki, tulis dulu uji yang GAGAL pada kode
   sekarang, dan tunjukkan output merahnya. Uji yang hijau sejak sebelum perbaikan
   tidak membuktikan apa pun. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
4. JANGAN MENAMAI YANG MATI. Memberi aria-label/title pada kontrol tanpa handler
   membuat keadaan LEBIH BURUK. Kontrol mati: aktifkan atau hapus.
5. TIDAK ADA ASUMSI DIAM-DIAM. Kalau spesifikasi ambigu atau kamu butuh keputusan
   kebijakan — BERHENTI dan tanya. Jangan mengarang, jangan mempersempit scope diam-diam.
6. Kontrol form NATIVE (<Switch>/<Check> dari ui.tsx), bukan <span onClick>.
   Skala tipografi hanya 8 ukuran (lantai 11px, dilarang setengah langkah).
   Warna lewat token CSS var, bukan hex. `:any` baru = lint merah.

GERBANG SELESAI (jalankan dari root, tempelkan outputnya):
   npm run verify
master selalu hijau (BUILD.md §R-7).

---------------------------------------------------------------------------

TUGAS: tutup tiga cacat pada modul `home` (Beranda) dan kunci perilakunya dengan uji.
Ini BUKAN tugas menaikkan level kedalaman — lihat "batas" di bawah.

KONTEKS MODUL
- id modul: home (grup "Beranda", sengaja di HIDDEN_GROUPS, dipin di atas toggle
  workspace; wsForModule('home') → null)
- berkas: migration/src/view_home.tsx (247 baris) +
          migration/src/view_home_cockpit.tsx (437 baris, <HomeCockpit/>)
- PRD induk: "PRD - Restrukturisasi Navigasi & Beranda Berbasis Peran.md"
  → status In Progress (Fase 0–3 SELESAI & live-verified; Fase 4–8 menunggu tinjauan).
  BACA PRD itu sebelum mengubah komposisi apa pun. Kalau perbaikanmu menyentuh
  komposisi per-peran, itu masuk Fase 4–8 → BERHENTI dan minta keputusan dulu.
- program sistemik terkait: D (a11y & kontrol native)

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan diragukan tanpa bukti baru;
verifikasi ulang hanya kalau HEAD sudah bergerak dari 2632a23):
- Tidak ada tanggal beku di kedua berkas (AMS.TODAY tidak diperlukan di sini).
- Tidak ada <Btn> tanpa onClick di kedua berkas.
- HomeCockpit menarik SEMUA angka dari SSOT (useFirm/useAudit/FIRMFIN.wip/
  capacityModel/AMS.BI_*) — tidak ada angka ilustratif.
- Urutan portlet disimpan di localStorage 'ams.home.cockpit.order' — ini preferensi
  UI, SENGAJA bukan useAmsPersist. Jangan "diperbaiki" jadi state server.
- useAmsPersist('leaveReqs', []) di view_home.tsx:132 SUDAH BENAR: 'leaveReqs' ada di
  PERSONAL_STATE_KEYS (contexts.tsx:570) sehingga hidrasinya lewat personal.get yang
  memfilter baris per-pengguna; initializer kosong adalah pola yang benar untuk key
  personal (lihat komentar emptyLike). Bukan kebocoran. Jangan diutak-atik.

CACAT YANG HARUS DITUTUP

P1 · Kontrol palsu — view_home.tsx:209
    Fallback offline merender <a style=... onClick={() => nav('tasks', {from:'home'})}>
    My Tasks</a> TANPA href. Anchor tanpa href tidak fokusabel, tidak bisa Enter,
    dan gagal gerbang axe. Ganti dengan kontrol native (<Btn> dari ui.tsx, atau
    button dengan gaya link) yang memanggil nav yang sama.

P2 · Penyusunan ulang portlet hanya bisa dengan tetikus — view_home_cockpit.tsx:394-410
    rootFor()/gripFor() hanya memasang onDragOver/onDrop/draggable/onDragStart/
    onDragEnd. Tidak ada onKeyDown, role, maupun tabIndex → pengguna keyboard TIDAK
    BISA menyusun ulang kokpitnya sama sekali.
    Perbaiki: beri grip peran & nama yang benar (fokusabel, punya nama aksesibel) plus
    jalur keyboard untuk memindah portlet naik/turun. Bentuk persisnya kamu yang pilih —
    syaratnya: bisa dioperasikan penuh dengan keyboard, statusnya terumumkan, dan
    urutannya tetap tersimpan ke 'ams.home.cockpit.order' seperti sekarang.
    Kalau kamu menilai drag-and-drop ini sebaiknya diganti kontrol naik/turun eksplisit
    (menghapus drag sama sekali), USULKAN dulu — itu keputusan produk, bukan keputusanmu.

P3 · Nol uji untuk komposisi per-peran
    Beranda bercabang untuk 6 peran (isFirmOps: 'Admin & HR Firma'/'Finance Firma';
    isOversight: CAP.ENGAGEMENT_VIEW_ALL) dan HM_FIRMOPS_AREAS memetakan persona
    firm-ops → daftar module id. Satu-satunya uji yang menyebut 'home' adalah
    route_hash.test.ts. Artinya: menambah peran baru, mengganti nama peran, atau
    menghapus modul dari MODULES akan merusak Beranda TANPA SUARA.
    Tulis uji yang memaku minimal ini:
      a. Setiap id di HM_FIRMOPS_AREAS benar-benar ada di MODULE_INDEX (icons.tsx).
         Uji ini harus MERAH kalau sebuah id dihapus dari MODULES.
      b. Kedua persona firm-ops punya entri di HM_FIRMOPS_AREAS, dan peran auditor
         TIDAK punya (mereka memakai panel "Perikatan Saya").
      c. Filter perikatan menghormati accessibleEngagementIds: null → tidak membatasi;
         daftar → hanya id yang diizinkan. (Ekstrak fungsi murni bila perlu agar
         bisa diuji di node tanpa render.)
    Kalau untuk itu kamu perlu mengekspor konstanta/fungsi kecil dari view_home.tsx,
    lakukan — ekspor bernama, tanpa mengubah perilaku.

LANGKAH
1. INVESTIGASI — konfirmasi ketiga cacat masih ada di HEAD sekarang; tempelkan
   grep/baris buktinya. Kalau salah satu sudah tertutup PR lain: katakan, lewati,
   jangan cari pekerjaan pengganti.
2. RENCANA — satu paragraf: perubahan apa di berkas mana. P2 lebih dulu diusulkan
   bentuknya kalau kamu memilih menghapus drag.
3. GERBANG MERAH — tulis uji P3 dulu dan jalankan; sebagian harus MERAH sebelum
   perbaikan. Untuk P1/P2 tunjukkan bukti keadaan sekarang (grep menunjukkan tidak ada
   onKeyDown/href) sebagai baseline.
4. IMPLEMENTASI — perubahan sekecil mungkin.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Sebutkan juga hasil
   pemeriksaan a11y untuk Beranda kalau kamu menjalankan e2e axe.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · yang TIDAK dikerjakan
   + alasannya · asumsi yang diambil (seharusnya nol).

ADENDUM A11Y (Program D)
- Ganti kontrol palsu dengan native; jangan sekadar menambah role/aria pada elemen
  yang tetap tak fokusabel.
- Tombol ikon: beri aria-label/title HANYA setelah dipastikan tombolnya hidup.
- Jangan menambah fontSize setengah langkah; pakai token --fs-*.
- Jangan menambah hex hardcode; pakai token warna semantik.
- Gerbang: axe untuk Beranda = 0 critical, plus smoke keyboard (tab ke grip →
  pindahkan portlet → urutan berubah dan bertahan setelah reload).

BATAS
- JANGAN mengubah komposisi per-peran, menambah/menghapus panel, atau mengubah apa
  yang tampil untuk peran mana. Itu wilayah PRD Restrukturisasi Fase 4–8 dan menunggu
  keputusan Ari.
- JANGAN mengubah 'ams.home.cockpit.order' menjadi state server.
- JANGAN menyentuh modul lain. Kalau uji P3(a) menemukan id yang tidak ada di
  MODULE_INDEX, LAPORKAN — jangan diam-diam menghapusnya dari HM_FIRMOPS_AREAS.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root.
[ ] Tidak ada `:any` baru tanpa sinkronisasi baseline (npm run lint:any-baseline).
[ ] Tidak ada kontrol non-native baru; P1 benar-benar native.
[ ] Penyusunan ulang portlet bisa dioperasikan penuh dengan keyboard.
[ ] Komposisi per-peran TIDAK berubah.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
