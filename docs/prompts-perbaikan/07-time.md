# Prompt perbaikan — modul `time` (Time & Budget)

> Dibuat 2026-08-20 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-B (klok/tarif/scope) + D (definisi selesai).
>
> **Catatan pembuat prompt:** ini modul dengan cacat terberat dari empat yang sudah
> diperiksa. Bukan karena dangkal — ia punya ekspor tersegel, tarif SSOT dari
> `FIRMFIN.WIP_BILL`, dan model ekonomi yang benar — melainkan karena **untuk perikatan
> selain ENG-2025-014 ia menampilkan angka yang salah tanpa memberi tahu siapa pun**.
> Tiga cacat berasal dari satu keputusan yang sama: ketika data perikatan aktif tidak
> ada, modul ini **meminjam** milik perikatan lain alih-alih mengatakan kosong.
>
> Akar masalahnya adalah keterbatasan data yang jujur — `data_firmfin.ts:41` menyatakan
> sendiri "Hanya engagement dengan roster (demo: ENG-2025-014) yang punya timesheet".
> Yang salah bukan keterbatasan itu, melainkan **menyembunyikannya**.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah
   dan hasilnya. Klaim "absen" di repo ini secara historis SALAH SISTEMATIS.
2. SSOT. Angka berasal dari canon*/data*, bukan literal di view. Kalau angka tak
   tersedia untuk konteks aktif, tampilkan KOSONG YANG JUJUR — jangan pinjam angka
   konteks lain, jangan isi dengan literal.
3. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
4. JANGAN MENAMAI YANG MATI.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: hentikan modul `time` (Time & Budget) menampilkan angka perikatan lain sebagai
angka perikatan aktif, dan hentikan ia membantah dirinya sendiri antar-tab.

KONTEKS MODUL
- id modul: time (grup "Ruang Kerja Perikatan")
- berkas: migration/src/view_timebudget.tsx (574 baris)
- tab: Ringkasan · Anggaran per Fase · Timesheet · Tim & Utilisasi · Ekonomi
- SSOT ekonomi: data_firmfin.ts → FIRMFIN.engagementWip / WIP_BILL / WIP_COST /
  WIP_ROSTER_ENG. Baca komentar di data_firmfin.ts:36-42 sebelum mulai — ia
  menjelaskan kontraknya, termasuk bahwa engagementWip mengembalikan null untuk
  perikatan tanpa roster.
- konsumen hilir: WIP Valuation & WIP·Realisasi meng-overlay hasil modul ini
  (param liveByEng) — jangan memutus kontrak itu.

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diragukan tanpa bukti baru):
- Tarif charge-out & cost SUDAH SSOT dari FIRMFIN (Program B / PR #235) — jangan
  "dibetulkan" lagi.
- Ekspor XLSX tersegel sudah ada (PR #228).
- Label kontrol form sudah disapu (PR #248).
- Modul ini tidak menyimpan state sendiri; itu wajar.

CACAT

TB1 · Meminjam perikatan lain saat perikatan aktif tak punya data  [P0 — kerjakan]
    view_timebudget.tsx:46
      const ew = (FIRMFIN.engagementWip(timeEntries, e.id)
                  || FIRMFIN.engagementWip(timeEntries, 'ENG-2025-014'))!;
    `engagementWip` sengaja mengembalikan null untuk perikatan tanpa roster
    (data_firmfin.ts:57). Fallback ini mengubah "tidak ada data" menjadi "data milik
    ENG-2025-014", lalu SELURUH halaman — jam aktual, nilai standar, biaya, utilisasi,
    ekonomi — dirender dengan judul perikatan yang sedang aktif. Pengguna tidak punya
    cara mengetahui angka itu bukan miliknya. Ini kebocoran isolasi W7.5 dalam bentuk
    paling berbahaya: bukan error, bukan kosong, melainkan angka orang lain yang
    tampak masuk akal.
    Perbaiki: hapus fallback. Ketika engagementWip null, render keadaan kosong yang
    JUJUR — menyebut bahwa perikatan ini belum punya roster/timesheet, dan menunjuk
    ke mana pengguna harus pergi. Jangan menampilkan nol yang tampak seperti fakta;
    nol dan "belum ada data" adalah dua pernyataan berbeda.

TB2 · Roster terkunci ke satu perikatan literal  [P0 — kerjakan]
    view_timebudget.tsx:21
      const TB_ROSTER = FIRMFIN.WIP_ROSTER_ENG['ENG-2025-014'];
    Konstanta tingkat-modul, dievaluasi sekali saat impor, dipakai di baris 404 untuk
    melookup peran anggota tiap baris timesheet lalu menghitung "Nilai (std)". Untuk
    perikatan mana pun selain 014, `find` gagal → `val = 0`: kolom Nilai (std) diam-diam
    menjadi Rp 0 di seluruh tabel, dan totalnya ikut salah.
    Perbaiki: ambil roster dari perikatan aktif (hasil engagementWip yang sudah kamu
    punya di useTBModel, `ew.roster`), bukan dari konstanta modul.

TB3 · Anggaran per fase hardcode — modul membantah dirinya sendiri  [P1 — kerjakan
      bagian yang jelas; USULKAN bagian yang butuh keputusan]
    view_timebudget.tsx:27-32, TB_PHASES: budget 320 + 1080 + 320 + 120 = 1840 jam.
    Itu persis `budgetHrs` ENG-2025-014 (data_part1.ts:61) — dekomposisi anggaran SATU
    perikatan yang dibekukan sebagai konstanta. Sementara itu tab Ringkasan memakai
    `ew.budgetHrs` yang nyata per perikatan.
    Akibat yang bisa dilihat langsung: untuk ENG-2025-031 (budgetHrs 1480), tab
    "Ringkasan" menyebut 1480 jam sementara tab "Anggaran per Fase" menjumlahkan 1840.
    Dua tab dalam satu layar memberi dua angka untuk hal yang sama.
    Yang JELAS dan harus dikerjakan: total anggaran fase WAJIB sama dengan anggaran
    perikatan aktif.
    Yang BUTUH KEPUTUSAN — usulkan, jangan putuskan sendiri: dari mana bobot per fase
    berasal. `PHASE_BUDGET_WEIGHT` sudah ada di cockpit_progress.ts:63, TAPI taksonomi
    fasenya berbeda (ia punya 'Specifics' dan 'Review & Arsip'; TB_PHASES punya
    'Pelaporan'). Memetakan diam-diam antar dua taksonomi fase adalah persis jenis
    asumsi senyap yang dilarang. Tulis opsinya, sebutkan konsekuensinya, lalu tanya.
    Catat juga: `p.base` (jam yang sudah tercatat sebelum timesheet live) juga literal
    per fase — masuk dalam usulan yang sama.

TB4 · Delapan minggu jam kerja yang tidak pernah terjadi  [P1 — kerjakan]
    view_timebudget.tsx:33-36, TB_WEEKLY: delapan pasang {minggu, jam} literal, dipakai
    untuk grafik batang "jam tercatat/minggu" (baris 242-250), rata-rata (baris 253),
    dan puncak (baris 254). Modul ini PUNYA `timeEntries` bertanggal — seri ini
    seharusnya diturunkan darinya, bukan dikarang.
    Dan satu bug yang berdiri sendiri: baris 254 menulis
      Puncak {Math.max(...TB_WEEKLY.map(w => w.h))} jam (W4)
    Angkanya dihitung, labelnya "(W4)" literal. Begitu datanya berubah, kalimat itu
    berbohong tentang minggu mana yang puncak. Perbaiki tanpa perlu bertanya.
    Untuk serinya: turunkan dari timeEntries. Kalau rentangnya tak cukup untuk delapan
    minggu (jam pembuka tidak bertanggal), tampilkan apa adanya dan katakan periodenya
    — jangan menambal dengan literal supaya grafiknya "penuh".

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji hari ini)
Ekstrak `useTBModel` (atau derivasi murninya) ke berkas .ts murni dengan ekspor
bernama supaya bisa diuji di node tanpa render; perilaku tidak berubah. Berkas uji
.ts WAJIB bebas `any` (konvensi repo).
Minimal yang dipaku:
  a. Untuk perikatan TANPA roster, model tidak mengembalikan angka perikatan lain.
     (Merah sebelum TB1.)
  b. Nilai standar baris timesheet dihitung dari roster perikatan AKTIF — untuk
     anggota perikatan aktif nilainya > 0. (Merah sebelum TB2.)
  c. Jumlah anggaran seluruh fase == anggaran perikatan aktif, diuji untuk LEBIH DARI
     SATU perikatan di ENGAGEMENTS. (Merah sebelum TB3.)
  d. Seri mingguan berubah ketika satu entri timesheet berubah. (Merah sebelum TB4.)
  e. Gerbang sumber: nol literal id perikatan ('ENG-….') di kode view_timebudget.tsx
     — buang komentar dulu sebelum memindai, seperti helper `kode()` di
     cockpit_conventions.test.ts. (Merah sebelum TB1/TB2.)

LANGKAH
1. INVESTIGASI — konfirmasi keempat cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca data_firmfin.ts:36-60 dan katakan dengan kalimatmu sendiri apa kontrak
   engagementWip, termasuk kapan ia null.
2. RENCANA — termasuk bentuk keadaan kosong untuk TB1 (apa yang dilihat pengguna
   perikatan tanpa roster). Untuk bagian TB3 yang butuh keputusan: usulan, lalu BERHENTI.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — TB1, TB2, TB4, dan bagian TB3 yang jelas (total fase = anggaran nyata).
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan konsumen hilir
   (WIP Valuation / WIP·Realisasi) tetap hijau — uji firm_wip ada di suite.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · usulan TB3 · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol).
   Laporkan juga sebagai temuan terpisah: hitung sendiri berapa view lain memakai
   literal 'ENG-2025-014' sebagai fallback pemilihan DATA (bukan sekadar label) —
   `grep -rn "'ENG-2025-014'" migration/src`. Itu pola sistemik, bukan milik modul ini
   saja, dan perlu keputusan tersendiri.

ADENDUM SCOPE (Program B)
- Data perikatan hanya boleh berasal dari perikatan aktif. Tidak ada fallback ke id
  literal. Tidak ada konstanta tingkat-modul yang mengunci satu perikatan.
- Gerbang: uji yang membuktikan dua perikatan berbeda menghasilkan angka berbeda —
  dan bahwa perikatan tanpa data menghasilkan KOSONG, bukan angka perikatan lain.

BATAS
- JANGAN menambahkan roster/timesheet untuk perikatan lain ke data seed. Itu keputusan
  data/produk milik Ari, bukan bagian dari perbaikan ini.
- JANGAN mengubah kontrak FIRMFIN.engagementWip (WIP Valuation & WIP·Realisasi
  bergantung padanya).
- JANGAN memetakan taksonomi fase TB_PHASES ke PHASE_BUDGET_WEIGHT tanpa keputusan.
- JANGAN mengubah tata letak tab atau menambah tab.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; uji firm_wip & konsumen hilir tetap hijau.
[ ] Perikatan tanpa roster menampilkan keadaan kosong yang jujur, bukan angka
    perikatan lain — dibuktikan uji.
[ ] Nol literal id perikatan di kode view_timebudget.tsx, dijaga gerbang sumber.
[ ] Total anggaran per fase == anggaran perikatan aktif, diuji untuk >1 perikatan.
[ ] Seri mingguan diturunkan dari timeEntries; tidak ada label periode literal.
[ ] Usulan TB3 (sumber bobot fase) tertulis dan TIDAK diimplementasikan sepihak.
[ ] Berkas uji baru bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan memuat hitungan sapuan literal 'ENG-2025-014' sebagai temuan terpisah.
```
