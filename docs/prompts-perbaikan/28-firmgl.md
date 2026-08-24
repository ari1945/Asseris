# Prompt perbaikan — modul `firmgl` (General Ledger)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-A (ekspor) + C-E (ledger/SoD) + D.
>
> **Catatan pembuat prompt — BACA SEBELUM APA PUN:** cacat P0 yang dicatat E-9 untuk
> modul ini ("posting jurnal TIDAK mengubah TB/LK — seed statis") **SUDAH DITUTUP**.
> Buku besar, neraca saldo, dan laporan keuangan kini diturunkan dari jurnal terposting
> lewat `firm_ledger.ts`, dengan uji tersendiri (`firm_ledger.test.ts`,
> `firm_gl_control_journals.test.ts`). Nomor jurnal sudah tidak lagi diturunkan dari
> panjang array, klok sudah SSOT, dan gerbang SoD `CAP.FIRMFIN_EDIT` sudah terpasang
> justru untuk mencegah tulisan ditolak server secara senyap.
> **Jangan mengerjakan ulang satu pun dari itu.**
>
> Yang tersisa adalah satu lubang yang serius justru karena sisanya sudah benar:
> laporan keuangan firma dirender **tanpa menyebut apakah rekonsiliasinya menutup**,
> padahal mesin rekonsiliasi sudah ada dan teruji, dan Ari sudah memutuskan bahwa
> rekonsiliasi yang gagal harus **memblokir** ekspor laporan keuangan.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya. Di modul ini khususnya: sebagian besar yang tampak rusak SUDAH diperbaiki.
   Memeriksa lebih murah daripada mengerjakan ulang.
2. SSOT. Angka dari jurnal terposting; identitas dari sesi; klok dari AMS.TODAY.
3. LAPORAN KEUANGAN YANG BELUM MENUTUP TIDAK BOLEH KELUAR DIAM-DIAM. Bila jembatan
   rekonsiliasi tidak menutup, itu dinyatakan di layar dan memblokir ekspor — bukan
   badge kecil di sudut, dan bukan diam.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: sambungkan laporan keuangan firma ke status rekonsiliasi yang sudah dihitung,
tambahkan ekspor yang menghormati pemblokiran itu, dan benahi identitas pelaku jejak.

KONTEKS MODUL
- id modul: firmgl (grup "Keuangan Firma (ERP)")
- berkas: migration/src/view_firmgl.tsx → fungsi `FirmGL()` baris 20-…
  Berkas ini JUGA memuat modul `apar` (AP/AR Firma) — jangan sentuh kecuali diminta
  eksplisit di bawah.
- mesin buku besar: migration/src/firm_ledger.ts → trialBalance · statements ·
  accountLedger · currentBalances · mergeSeedJournals
- mesin rekonsiliasi: `FIRMFIN.reconciliations(ctx)` di data_firmfin.ts:568,
  teruji di firm_bridge.test.ts dan cash_bank_recon.test.ts
- PRD induk: docs/prd-firm-erp-deepening.md — status **In Progress — Approved**
  (2026-08-16). BACA §8 (risiko) dan keputusan Q-1..Q-5 di baris status sebelum mulai.

KEPUTUSAN YANG SUDAH DIAMBIL ARI (jangan ditawar ulang):
- **Q-2 = BLOKIR ekspor LK.** Bila jembatan rekonsiliasi tidak menutup, ekspor laporan
  keuangan firma diblokir — konsisten dengan perlakuan WIP dan Kas. Ini kebijakan,
  bukan preferensi implementasi.
- **Q-5 = tetap read-only** untuk hal-hal yang PRD sebut read-only.
- Urutan PR mengikat: PR-1 → PR-2 → PR-4; PR-3/5/6 independen setelah PR-2.

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- TB/LK/Buku Besar diturunkan dari jurnal terposting (P0 Program E — SUDAH DITUTUP).
- Nomor jurnal = tertinggi yang ada + 1, bukan panjang array (komentar baris 81-89
  menjelaskan bug lamanya). Sudah benar.
- Tanggal jurnal baru memakai `AMS.TODAY`; dua `REF` lain juga (baris 367, 397).
- Gerbang SoD `CAP.FIRMFIN_EDIT` sudah ada di UI, dengan alasan yang tepat: mencegah
  tulisan pengguna non-privileged ditolak server secara SENYAP.
- `mergeSeedJournals` menyembuhkan cache localStorage yang tertinggal di belakang seed.

CACAT

G1 · Laporan keuangan dirender tanpa menyebut apakah rekonsiliasinya menutup  [P0]
    Konfirmasi sendiri: `grep -n "reconcil" migration/src/view_firmgl.tsx` → kosong.
    Tab "Laporan Keuangan" merender Laba Rugi dan Neraca firma dengan keterangan
    "dihitung dari N jurnal terposting" — dan berhenti di situ. Tidak ada satu pun
    rujukan ke `FIRMFIN.reconciliations()`, padahal mesin itu ada, teruji, dan
    dipakai modul lain.
    Akibatnya pembaca melihat neraca firma tanpa tahu bahwa jembatan aset tetap
    (`1-400`) atau pendapatan (`4-100`) belum menutup — dan PRD §9 mencatat selisih
    `1-400` sebesar 3.374 juta yang mungkin memang belum dapat dijembatani.
    Kerjakan: tampilkan status rekonsiliasi pada tab Laporan Keuangan, dengan angka
    selisihnya, dari mesin yang sudah ada. Jangan menghitung ulang sendiri, jangan
    membuat ambang kedua — `data_firmfin.ts:26` menyatakan ambangnya sengaja tunggal.
    Bila status itu MERAH sekarang, itu hasil yang benar (PRD §8 R-3 sudah
    mengantisipasinya). Jangan menyembunyikannya, jangan melunakkan ambangnya.

G2 · Modul buku besar tanpa satu pun ekspor  [P1 — kerjakan, dengan syarat Q-2]
    `grep -n "amsExport" migration/src/view_firmgl.tsx` → kosong. Empat tab berisi
    Jurnal Umum, Buku Besar, Neraca Saldo, dan Laporan Keuangan; tak satu pun dapat
    dikeluarkan sebagai kertas kerja.
    Kerjakan:
      · Jurnal Umum, Buku Besar, dan Neraca Saldo → ekspor XLSX tersegel lewat
        `amsExportXlsx` (bukan `amsPrintDoc`). Ketiganya adalah data mentah/antara,
        tidak terikat Q-2.
      · Laporan Keuangan → ekspor mengikuti **Q-2: DIBLOKIR** ketika rekonsiliasi
        tidak menutup. Pemblokirannya harus menjelaskan APA yang tidak menutup dan
        berapa selisihnya, bukan sekadar menonaktifkan tombol.
    Isi ekspor diturunkan dari mesin yang sama dengan yang dirender — jangan menyalin
    ulang angka dari tampilan.
    Nama firma pada payload ekspor WAJIB dari SSOT (`AMS.FIRM?.name` / `FIRM.short`),
    bukan literal.

G3 · Pelaku jejak aktivitas berasal dari seed statis  [P1]
    view_firmgl.tsx:44 — `const who = (AMS.USER && AMS.USER.name) || 'Pengguna';`
    dipakai pada `logActivity({ who, action: 'GL_POST', … })` (baris 77 dan 91).
    `AMS.USER` adalah data seed, bukan sesi. Jejak posting jurnal karena itu mencatat
    nama yang tidak ada hubungannya dengan siapa yang benar-benar menekan tombol —
    dan bila seed kosong, mencatat "Pengguna".
    Repo punya `useCurrentAuditor()` (identitas sesi nyata W7; contoh pemakaian di
    view_mytasks_parts.tsx:88). Pakai itu. Bila identitas tak tersedia, aksi tulis
    TIDAK dijalankan — bukan dicatat atas nama fallback.
    CATATAN LINGKUP: pola yang sama ada di baris 403, tetapi itu milik komponen AP/AR
    (modul `apar`). LAPORKAN, jangan perbaiki di PR ini.

GERBANG YANG HARUS KAMU TULIS
Berkas uji .ts WAJIB bebas `any`. Bangun di atas `firm_ledger.ts` yang sudah murni;
untuk logika baru, ekstrak ke fungsi murni ber-ekspor bernama.
  a. Ketika rekonsiliasi tidak menutup, ekspor Laporan Keuangan TIDAK menghasilkan
     berkas — dan alasannya menyebut jembatan mana serta besar selisihnya.
     (Uji perilaku pemblokiran, bukan keberadaan flag.)
  b. Ketika rekonsiliasi menutup, ekspor Laporan Keuangan menghasilkan payload yang
     angkanya SAMA dengan yang dirender dari `statements()` — bukan salinan terpisah.
  c. Ekspor Neraca Saldo seimbang: total debit == total kredit, diuji atas jurnal
     terposting, bukan atas angka yang sudah dijumlahkan tampilan.
  d. Tidak ada aksi tulis GL yang tercatat tanpa identitas sesi yang nyata.
     (Merah sebelum G3.)
  e. Gerbang sumber: nol literal nama firma di kode view_firmgl.tsx — buang komentar
     dulu sebelum memindai (pola helper `kode()` di cockpit_conventions.test.ts).

LANGKAH
1. INVESTIGASI — konfirmasi ketiga cacat di HEAD sekarang; tempelkan bukti barisnya.
   Sebelum menyentuh G1, baca `FIRMFIN.reconciliations` (data_firmfin.ts:568) dan
   firm_bridge.test.ts, lalu nyatakan dengan kalimatmu sendiri: baris apa saja yang
   direkonsiliasi hari ini, apa arti `status` dan `residual`, dan ambang mana yang
   dipakai. Jangan menebak dari nama.
2. RENCANA — termasuk bentuk penyampaian status rekonsiliasi di tab LK dan bentuk
   pemblokiran ekspor. Kalau menurutmu pemblokiran seharusnya berlaku juga untuk
   Neraca Saldo, USULKAN — jangan putuskan sendiri; Q-2 hanya menyebut LK.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — G1, G2, G3.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Uji berikut WAJIB tetap
   hijau: firm_ledger · firm_gl_control_journals · firm_bridge · cash_bank_recon ·
   firmfin_ledger · firmfin_budget. Kalau salah satunya merah, kamu keluar dari lingkup.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · STATUS REKONSILIASI
   NYATA saat ini (menutup atau tidak, dan berapa selisihnya — angka, bukan kesan) ·
   temuan `who` di baris 403 milik `apar` · yang TIDAK dikerjakan + alasannya ·
   asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN mengerjakan PR-2..PR-6 dari docs/prd-firm-erp-deepening.md. Itu arc
  tersendiri yang sudah disetujui, punya urutan mengikat dan risiko terdokumentasi
  (§8 R-1: memposting penyusutan MENGGESER laba firma dan memerahkan snapshot kanon
  serta angka di BI/cockpit). Menyelipkannya ke sini akan membuat PR ini tak dapat
  direviu. Kalau menurutmu G1 tak dapat diselesaikan tanpa PR-2, KATAKAN dan berhenti.
- ⛔ JANGAN melunakkan ambang rekonsiliasi supaya gerbang menjadi hijau. Gerbang yang
  lahir merah adalah hasil yang benar.
- JANGAN menyentuh komponen AP/AR (`apar`) di berkas yang sama, selain melaporkan
  temuan `who`.
- JANGAN mengubah `logActivity` menjadi rantai server — itu Program C dan butuh PRD
  sendiri (perubahan arsitektur).
- JANGAN mengubah kontrak `firm_ledger.ts` kecuali kamu membuktikan cacat di sana.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; keenam uji keuangan di atas tetap hijau.
[ ] Tab Laporan Keuangan menyebut status rekonsiliasi beserta selisihnya, dari mesin
    yang sudah ada — tanpa ambang kedua.
[ ] Ekspor Jurnal/Buku Besar/Neraca Saldo tersedia dan tersegel.
[ ] Ekspor Laporan Keuangan DIBLOKIR ketika rekonsiliasi tidak menutup, dengan alasan
    yang menyebut jembatan dan selisihnya — dibuktikan uji.
[ ] Angka ekspor identik dengan yang dirender, bukan salinan.
[ ] Jejak posting jurnal memakai identitas sesi nyata.
[ ] Nol literal nama firma di view_firmgl.tsx, dijaga gerbang sumber.
[ ] PR-2..PR-6 tidak disentuh.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan memuat status rekonsiliasi nyata dalam angka.
```
