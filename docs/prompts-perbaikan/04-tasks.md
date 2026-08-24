# Prompt perbaikan — modul `tasks` (My Tasks)

> Dibuat 2026-08-20 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-B (scope) + D (definisi selesai).
>
> **Catatan pembuat prompt:** berbeda dari `home` dan `cockpit`, di sini cacatnya
> **substantif, bukan kosmetik**. Tiga di antaranya membuat modul menampilkan hal yang
> berbeda dari namanya: "Tugas Pribadi" yang dilihat seluruh firma, "My Tasks" yang
> memuat lebih sedikit tugas daripada kartu ringkasannya di Beranda, dan status tugas
> yang bisa berpindah diam-diam ke tugas lain. Satu di antaranya butuh **keputusan
> arsitektur dari Ari sebelum kode ditulis** — lihat M2.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah
   dan hasilnya. Klaim "absen" di repo ini secara historis SALAH SISTEMATIS.
2. SSOT. Satu konsep = satu sumber. Kalau kamu menemukan dua register untuk hal yang
   sama, itu temuan — jangan disinkronkan, laporkan.
3. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
4. JANGAN MENAMAI YANG MATI.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: perbaiki modul `tasks` (My Tasks). Ada empat cacat; M2 BUKAN untuk dikerjakan
sekarang — ia untuk diusulkan dan ditunggu keputusannya.

KONTEKS MODUL
- id modul: tasks (grup "Ruang Kerja Perikatan")
- berkas: migration/src/view_mytasks.tsx (327 baris) +
          migration/src/view_mytasks_parts.tsx (207 baris — hook data `useMyTasks`
          dan derivasi `mtSystemTasks` ada di sini)
- pembanding sisi server: server/src/taskAgg.ts + router.ts:1157 (`tasks.mine`),
  teruji di server/src/__tests__/task_agg.test.ts
- konsumen lain: Beranda memanggil tasksMine() (view_home.tsx) — bukan hook ini

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diragukan tanpa bukti baru):
- MT_TODAY = new Date(AMS.TODAY + 'T00:00:00') — klok SSOT, K-02 sudah tertutup.
- Identitas "saya" dari useCurrentAuditor() (sesi nyata W7), bukan nama hardcode.
- window.useAmsPersist (baris 89–90) MASIH dipublikasikan contexts.tsx:820 dan dipakai
  puluhan view — bukan global yang sudah dilucuti, jadi bukan bug. Boleh dirapikan jadi
  impor ESM biasa kalau kamu sedang menyentuh baris itu; jangan jadikan pekerjaan sendiri.
- Modul ini tidak punya ekspor sama sekali. Itu BENAR untuk sekarang — jangan menambah
  ekspor di PR ini (Program A punya urutannya sendiri).

CACAT

M1 · "Tugas Pribadi" sebenarnya milik seluruh firma  [P1 — kerjakan]
    `mt.personal` dan `mt.meta` terdaftar sebagai kunci FIRM-scope di
    server/src/stateAccess.ts:41 ("Legacy client keys that are still intentionally
    persisted at firm scope"), dan tak satu pun ada di PERSONAL_STATE_KEYS
    (migration/src/contexts.tsx). Tugas pribadi yang ditambahkan lewat AddTaskForm
    (view_mytasks_parts.tsx:182) TIDAK punya field pemilik, dan baris 113 menggabungkan
    seluruh isi `personal` tanpa filter `me`.
    Akibatnya, untuk setiap pengguna di firma yang sama:
      · tugas pribadi siapa pun terlihat oleh semua orang, dan bisa dihapus siapa pun;
      · `mt.meta` (status/bintang/catatan/subtugas) juga bersama — Dimas menandai
        "selesai", layar Fajar ikut berubah.
    Pola perbaikan SUDAH ADA di repo: `leaveReqs` dkk. diselesaikan lewat
    PERSONAL_STATE_KEYS + server/src/personalScope.ts (hidrasi baris ter-filter per
    pengguna). Ikuti pola itu; jangan menemukan mekanisme baru.
    Perhatikan: memindahkan scope kunci yang sudah berisi data adalah perubahan yang
    kompatibilitasnya harus dipikirkan (data lama ditulis firm-scope). Jelaskan
    rencana migrasi/baca-lewat di langkah RENCANA sebelum menulis kode.

M2 · My Tasks lebih SEMPIT daripada kartu ringkasannya di Beranda  [JANGAN kerjakan —
     usulkan dan tunggu keputusan]
    `useMyTasks` hanya menurunkan tugas dari SATU perikatan (yang sedang aktif),
    sementara `tasks.mine` di server mengagregasi lintas SEMUA perikatan yang boleh
    diakses pemanggil, dengan gerbang isolasi W7.5 yang teruji. Cacat ini sudah
    didokumentasikan di server/src/taskAgg.ts:6-12 oleh penulisnya sendiri.
    Akibat yang terlihat pengguna: menekan "Buka penuh" pada kartu "Tugas Saya" di
    Beranda bisa mendarat di halaman yang memuat LEBIH SEDIKIT tugas daripada kartunya.
    Dua daftar itu juga berbeda isi ke DUA arah:
      · hanya ada di klien: 'Catatan WP' (collectWpNotes) dan 'AJE' (usulan AJE)
      · hanya ada di server: WP assignment & deadline lintas-perikatan yang ter-scope
        ke klien dari perikatan yang boleh diakses
    Ini pertanyaan arsitektur, bukan pertanyaan teknis: apakah My Tasks menjadi
    KONSUMEN `tasks.mine` (server = SSOT, klien hanya memperkaya), atau `tasks.mine`
    yang diperluas memuat dua sumber klien itu?
    YANG HARUS KAMU LAKUKAN: tulis usulan singkat (maksimal satu halaman) berisi kedua
    opsi, konsekuensi masing-masing terhadap isolasi W7.5 dan terhadap `mt.meta` yang
    kuncinya berbasis id, lalu BERHENTI. Jangan mengimplementasikan salah satunya.
    Jangan pula "menyinkronkan" kedua daftar — dua register yang disinkronkan tetap
    dua register.

M3 · Id deadline berbasis INDEKS → status tugas berpindah diam-diam  [P1 — kerjakan]
    view_mytasks_parts.tsx:77 membuat id `'dl-' + i` dari indeks array. Id itulah kunci
    ke dalam `mt.meta`. Begitu urutan/isi `deadlines` berubah — deadline baru masuk,
    yang lama lewat — `mt.meta['dl-0']` menempel pada deadline yang BERBEDA: status
    "selesai", catatan, dan subtugas berpindah ke tugas lain tanpa suara.
    Perbaiki dengan id stabil yang diturunkan dari isi deadline itu sendiri (mis.
    klien + tugas + tanggal), bukan dari posisinya. Pikirkan apa yang terjadi pada
    `mt.meta` lama saat kunci berubah dan katakan rencanamu.

M4 · Pemotongan senyap `deadlines.slice(0, 4)`  [P2 — kerjakan bila M3 disentuh]
    Baris 77 juga memotong daftar deadline ke 4 teratas tanpa memberi tahu siapa pun.
    Pengguna melihat "semua tugas saya" yang diam-diam bukan semua. Hapus batasnya,
    atau kalau memang ada alasan menampilkan sebagian, tampilkan penanda "N lainnya"
    yang jujur. Jangan biarkan batas tak terucap.

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji khusus hari ini)
Buat migration/src/mytasks_*.test.ts. Agar bisa diuji di node tanpa render, ekstrak
derivasi murni (mtSystemTasks + penggabungan personal + pembuatan id) ke berkas .ts
murni dengan ekspor bernama — perilaku tidak berubah, dan berkas uji .ts WAJIB bebas
`any` (konvensi repo).
Minimal yang dipaku:
  a. Tugas pribadi milik pengguna lain TIDAK muncul untuk saya. (Merah sebelum M1.)
  b. Id deadline stabil terhadap perubahan urutan: susun ulang array masukan → id
     untuk deadline yang sama tetap sama. (Merah sebelum M3.)
  c. Tidak ada tugas yang hilang diam-diam dari daftar masukan. (Merah sebelum M4.)
  d. Filter kepemilikan tugas sistem benar-benar memakai identitas sesi, bukan
     nama literal.

LANGKAH
1. INVESTIGASI — konfirmasi keempat cacat di HEAD sekarang; tempelkan bukti barisnya.
   Kalau ada yang sudah tertutup PR lain: katakan, lewati.
2. RENCANA — termasuk rencana kompatibilitas data untuk M1 dan M3 (kunci berubah).
   Untuk M2: usulan dua opsi, lalu BERHENTI dan tunggu keputusan.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — M1, M3, M4 saja.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · usulan M2 · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol).

ADENDUM SCOPE (Program B)
- Kunci data per-pengguna WAJIB lewat jalur personal (PERSONAL_STATE_KEYS +
  personalScope), bukan firm-scope.
- Kunci data perikatan WAJIB engagement-scope.
- Gerbang: uji yang membuktikan dua pengguna berbeda TIDAK saling melihat datanya,
  dan dua perikatan berbeda tidak bercampur.

BATAS
- JANGAN mengimplementasikan M2 sebelum ada keputusan.
- JANGAN menambah ekspor.
- JANGAN mengubah tampilan/tata letak (List/Board/Focus tetap seperti sekarang).
- JANGAN menyentuh server/src/taskAgg.ts di PR ini — itu bagian dari keputusan M2.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root.
[ ] Tugas pribadi tidak lagi terlihat lintas-pengguna, dibuktikan uji.
[ ] Id tugas deadline stabil terhadap urutan, dibuktikan uji.
[ ] Tidak ada pemotongan daftar yang tak terucap.
[ ] Usulan M2 tertulis, dan TIDAK diimplementasikan.
[ ] Berkas uji baru bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
