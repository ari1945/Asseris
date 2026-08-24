# Prompt perbaikan — modul `profitability` (Profitability)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-E (ledger/SoD) + D (definisi selesai).
>
> **Catatan pembuat prompt:** satu perbaikan penting sudah mendarat di sini — `RATE_CARD`
> lokal yang dulu menduplikasi tarif kini diturunkan dari `FIRMFIN.WIP_BILL` (P0-B1).
> Jangan dikerjakan ulang.
>
> Tetapi tarif yang dipakai untuk menghitung **biaya** adalah tarif itu juga —
> `WIP_BILL`, yaitu tarif JUAL. `stdCost = jam × blended rate jual`, lalu
> `margin = billed − stdCost`. Artinya angka utama modul ini mengurangkan pendapatan
> dengan pendapatan: ia tidak dapat menjadi margin, berapa pun datanya.
> `FIRMFIN.WIP_COST` ada di repo dan tidak dirujuk satu kali pun oleh berkas ini.
>
> Layarnya bahkan menjelaskan perhitungannya dengan jujur — *"Biaya dihitung dari N jam
> aktual × Rp Xk/jam (blended rate dari staffing aktual)"* — dan justru itu yang
> membuatnya sulit tertangkap: penjelasannya benar tentang MEKANISME, sementara
> labelnya salah tentang SIFAT angkanya.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya.
2. LABEL HARUS SESUAI SIFAT ANGKANYA. Menjelaskan cara sebuah angka dihitung tidak
   membuat namanya benar. Angka yang dihitung pada tarif jual bukan "biaya", dan
   selisih dua angka pendapatan bukan "margin".
3. PERUBAHAN YANG MENGGESER SELURUH ANGKA BUKAN KEPUTUSANMU. Bila perbaikan yang benar
   akan mengubah setiap margin di aplikasi, tugasmu adalah MEMBUKTIKAN besarnya
   pergeseran dan melaporkannya — bukan melakukannya diam-diam.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: buktikan dan laporkan bahwa "biaya" di modul ini bukan biaya, hentikan jam satu
perikatan mendarat di perikatan lain, dan bereskan sisa literal — tanpa mengeksekusi
PR-3.

KONTEKS MODUL
- id modul: profitability (grup "Keuangan Firma (ERP)")
- berkas: migration/src/view_profit.tsx (306 baris)
- SSOT tarif: `FIRMFIN.WIP_BILL` (tarif jual) dan `FIRMFIN.WIP_COST` (tarif biaya) —
  keduanya ada di data_firmfin.ts
- register faktur yang hidup: modul `billing` (view_pipeline.tsx:581,
  `useAmsPersist('invoices', …)`)
- PRD induk: docs/prd-firm-erp-deepening.md — **PR-3 Approved, belum dikerjakan**:
  "Biaya adalah biaya. `WIP_COST`/`STD_RATE` dari SSOT; `CHARGE_MULT`, `GRADE_COST`,
  `REALIZATION` dicabut; realisasi dari `INVOICES`; `useMemo` deps diperbaiki; jembatan
  margin → `opProfit`." Urutan: PR-3 independen setelah PR-2.
- PRD §8 R-4 sudah mengantisipasi: menurunkan realisasi dari `INVOICES` MENGUBAH margin
  yang selama ini ditampilkan — "pergeseran adalah koreksi, bukan regresi; dokumentasikan
  delta per engagement".

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- `RATE_CARD` sudah diturunkan dari `FIRMFIN.WIP_BILL` (P0-B1), bukan tabel lokal kedua.
- `blendedRate` memakai `AMS.SCHEDULE` (staffing aktual) dan menyebutkan sumbernya
  ('staffing aktual' vs 'mix standar') di layar. Transparansi sumber itu benar —
  pertahankan.
- Ekspor XLSX sudah tersegel dan tombolnya hidup.

CACAT

PF1 · Angka "Biaya" dihitung pada tarif JUAL — sehingga "Margin" bukan margin  [P0
      — BUKTIKAN & LAPORKAN; perbaikan angkanya adalah PR-3]
    view_profit.tsx:17-24 → `RATE_CARD` = `FIRMFIN.WIP_BILL` (tarif charge-out).
    view_profit.tsx:33-42 → `blendedRate()` memakai `RATE_CARD`.
    view_profit.tsx:51    → `const stdCost = Math.round(hours * br.rate);`
    view_profit.tsx:73-74 → `const billed = e.fee * e.realized; const margin = billed - e.stdCost;`
    `FIRMFIN.WIP_COST` tidak dirujuk satu kali pun di berkas ini — konfirmasi sendiri:
      grep -n "WIP_COST" migration/src/view_profit.tsx
    Konsekuensinya struktural, bukan soal besar-kecil angka: apa pun datanya, modul ini
    mengurangkan pendapatan dengan jam yang dinilai pada harga jual. `marginPct`,
    `effRate`, dan `recovery` semuanya mewarisi cacat yang sama.
    Kerjakan DUA hal:
      (a) SEGERA — perbaiki LABELNYA, bukan angkanya. Selama angka itu dihitung pada
          tarif jual, ia tidak boleh disebut "Biaya", dan selisihnya tidak boleh
          disebut "Margin". Beri nama yang jujur atas apa yang benar-benar dihitung
          (mis. nilai standar jam pada tarif jual, dan selisih realisasi terhadapnya),
          dan pertahankan kalimat penjelas yang sudah ada.
      (b) BUKTIKAN & BERHENTI — hitung ulang seluruh baris memakai `FIRMFIN.WIP_COST`
          di dalam UJI (bukan di dalam view), lalu laporkan delta per perikatan:
          margin sekarang vs margin bila biaya dihitung pada tarif biaya. Sertakan
          angkanya. Itu bahan keputusan untuk PR-3 — JANGAN mengganti sumber tarif di
          view atas inisiatif sendiri.
    Alasan pembagian ini: mengganti tarif akan menggeser setiap angka profitabilitas di
    aplikasi (dan mungkin snapshot kanon serta modul BI/cockpit). Itu keputusan Ari,
    dan PRD sudah menyediakan tempatnya.

PF2 · Persentase realisasi adalah konstanta per perikatan  [P1 — LAPORKAN, jangan ganti]
    view_profit.tsx:27-30
      const REALIZATION = { 'ENG-2025-014': 0.91, 'ENG-2025-040': 0.88, … };
    dengan fallback `|| 0.9` di baris 54. `billed = fee × realized` — jadi seluruh
    pendapatan terealisasi modul ini berasal dari tujuh angka yang diketik, plus
    tebakan 0,9 untuk perikatan yang tidak terdaftar.
    Register faktur yang hidup ADA (modul `billing`), dan PR-3 memerintahkan realisasi
    diturunkan dari sana.
    Kerjakan: JANGAN menggantinya sendiri (itu PR-3, dan §8 R-4 mengantisipasi
    pergeserannya). Yang harus kamu lakukan:
      · pastikan angka ini tidak tampil sebagai fakta tanpa penanda — beri penanda
        asumsi yang terlihat di layar dan di ekspor;
      · laporkan berapa perikatan yang jatuh ke fallback `0.9` hari ini.

PF3 · Jam timesheet satu perikatan mendarat di baris perikatan lain  [P0 — kerjakan]
    view_profit.tsx:66-68
      const loggedHours = (timeEntries || []).reduce(…);
      const seedLogged  = (AMS.TIME_ENTRIES || []).reduce(…);
      const extraHours  = { 'ENG-2025-014': Math.max(0, loggedHours - seedLogged) };
    `timeEntries` berasal dari konteks perikatan AKTIF, tetapi selisihnya selalu
    ditambahkan ke baris `ENG-2025-014` yang dipaku literal. Bila perikatan aktif
    adalah 031, jam yang dicatat di 031 menambah jam — dan karenanya "biaya" serta
    "margin" — milik 014.
    Kerjakan: kaitkan tambahan jam ke perikatan yang benar-benar aktif. Bila konteks
    tidak menyediakan identitas perikatan untuk `timeEntries`, JANGAN menebak: jangan
    menambahkan jam ke baris mana pun, dan katakan itu di laporan.
    Hapus literal `'ENG-2025-014'` dari berkas ini.

PF4 · Nama firma hardcode di dalam ekspor tersegel  [P2]
    view_profit.tsx:108 — `firm: 'KAP Wijaya Hartono & Rekan'`.
    Pakai SSOT (`AMS.FIRM?.name` / `FIRM.short`); `view_pc_org.tsx` sudah melakukannya.
    Perbaiki DI BERKAS INI SAJA — jangan menyapu repo.

PF5 · Pembagian tanpa penjaga  [P2]
    view_profit.tsx:77 — `const recovery = e.fee / (e.stdCost);` dan baris 76
    `effRate = billed / e.hours`. Perikatan tanpa jam atau tanpa biaya menghasilkan
    `Infinity`/`NaN` yang akan dirender apa adanya.
    Beri penjaga; tampilkan ketiadaan sebagai ketiadaan, bukan sebagai angka.

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji hari ini)
Ekstrak `blendedRate` + `buildEngEcon` + derivasi baris ke berkas .ts murni dengan
ekspor bernama; perilaku tidak berubah. Berkas uji .ts WAJIB bebas `any`.
  a. Uji delta PF1(b): untuk setiap perikatan, hitung margin dengan `WIP_BILL` dan
     dengan `WIP_COST`, dan pastikan keduanya BERBEDA — membuktikan bahwa tarif yang
     dipakai sekarang memang tarif jual. Uji ini mendokumentasikan cacatnya; ia tidak
     mengubah view.
  b. Jam tambahan mendarat pada perikatan yang aktif, bukan pada id literal: ubah
     perikatan aktif → baris yang bertambah ikut berubah. (Merah sebelum PF3.)
  c. Gerbang sumber: nol literal id perikatan dan nol literal nama firma di
     view_profit.tsx — buang komentar dulu sebelum memindai (pola helper `kode()` di
     cockpit_conventions.test.ts). (Merah sebelum PF3/PF4.)
  d. Perikatan tanpa jam atau tanpa biaya tidak menghasilkan `Infinity`/`NaN`.
     (Merah sebelum PF5.)
  e. Setiap angka yang berasal dari asumsi (realisasi) membawa penanda asumsi pada
     payload ekspor. (Merah sebelum PF2.)

LANGKAH
1. INVESTIGASI — konfirmasi PF1–PF5 di HEAD sekarang; tempelkan bukti barisnya.
   Baca `FIRMFIN.WIP_BILL` dan `FIRMFIN.WIP_COST` lebih dulu dan nyatakan dengan
   kalimatmu sendiri: apa beda keduanya, dan mana yang semestinya dipakai untuk biaya.
   Periksa juga apakah konteks menyediakan identitas perikatan untuk `timeEntries`
   (dibutuhkan PF3) — jawab dengan grep, bukan dugaan.
2. RENCANA — termasuk label pengganti untuk PF1(a). Nama yang kamu pilih akan dibaca
   partner; usulkan satu, jangan mengarang istilah baru yang tidak dipakai profesi.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — PF1(a), PF3, PF4, PF5. PF1(b) dan PF2 adalah pembuktian + laporan.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Angka margin TIDAK boleh
   bergeser di PR ini — kalau bergeser, kamu mengeksekusi PR-3. Satu-satunya angka yang
   boleh berubah adalah baris perikatan yang terdampak PF3, dan itu WAJIB kamu jelaskan
   sebagai koreksi dengan angkanya.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · **tabel delta PF1(b):
   margin sekarang vs margin pada tarif biaya, per perikatan** · berapa perikatan yang
   memakai fallback realisasi 0,9 · apakah konteks menyediakan identitas perikatan
   untuk timeEntries · yang TIDAK dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN mengganti sumber tarif biaya di view (PR-3). Buktikan deltanya di uji dan
  laporkan; keputusannya milik Ari.
- ⛔ JANGAN mencabut `REALIZATION` atau menurunkan realisasi dari `INVOICES` (PR-3).
- ⛔ JANGAN "memperbaiki" margin dengan mengubah rumusnya agar terlihat masuk akal.
  Kalau labelnya jujur, angka yang aneh justru berguna.
- JANGAN menyentuh `data_firmfin.ts`, modul `billing`, atau modul `time`.
- JANGAN menyapu literal nama firma ke seluruh repo.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; angka margin tidak bergeser kecuali akibat PF3,
    yang dijelaskan dengan angka.
[ ] Tidak ada angka yang dihitung pada tarif jual yang disebut "Biaya", dan tidak ada
    selisih dua angka pendapatan yang disebut "Margin".
[ ] Jam timesheet mendarat pada perikatan yang benar, atau tidak mendarat sama sekali.
[ ] Nol literal id perikatan dan nol literal nama firma di view_profit.tsx.
[ ] Angka realisasi membawa penanda asumsi di layar dan di ekspor.
[ ] Tidak ada `Infinity`/`NaN` yang dirender.
[ ] Laporan memuat tabel delta margin (tarif jual vs tarif biaya) per perikatan.
[ ] PR-3 tidak dieksekusi.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
```
