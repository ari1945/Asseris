# Prompt perbaikan — modul `fixedassets` (Aset Tetap Kantor)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-A (ekspor) + D (definisi selesai).
>
> **Catatan pembuat prompt:** ini modul terbaik yang saya periksa di grup Keuangan
> Firma, dan sebagian besar temuan lama tentangnya sudah BASI. PR-1 (#258) sudah
> mendarat: dua register digabung jadi satu, mesin penyusutan lokal dicabut, klok SSOT,
> dan yang paling penting — **roll-forward NBV kini DIENUMERASI dan BISA GAGAL**.
> `data_fixedassets.rollForward` menurunkan capex dari perolehan dalam jendela,
> memisahkan penyusutan aset dimiliki vs dilepas, menilai pelepasan pada tanggal
> pelepasan, lalu membandingkan `computed` dengan `closing` dan memunculkan `residual`.
> Layarnya menampilkan kegagalan itu apa adanya, dengan kalimat yang tepat: *"komponennya
> dienumerasi dari register, bukan diturunkan dari saldo akhir; karena itu ia dapat
> gagal, dan kali ini gagal."* Catatan E-9 "capex Rp 0" sudah tidak berlaku.
> **Jangan mengerjakan ulang apa pun dari itu.**
>
> Yang tersisa justru ironis: bagian yang paling berharga — roll-forward yang dapat
> dinyatakan salah, dan kandidat pencatatan ganda — **tidak ikut ke dalam kertas
> kerjanya**. Yang diekspor hanyalah daftar aset dan ringkasan kelas. Daftar aset
> adalah inventaris; roll-forward-lah buktinya.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya. Di modul ini khususnya: banyak temuan lama SUDAH ditutup PR-1. Memeriksa
   lebih murah daripada mengerjakan ulang.
2. KERTAS KERJA MEMBAWA BAGIAN YANG DAPAT DINYATAKAN SALAH. Ekspor yang hanya memuat
   daftar dan ringkasan menyembunyikan justru bagian yang membuat angkanya dapat diuji.
3. SELISIH YANG JUJUR TIDAK DISEMBUNYIKAN DAN TIDAK DILUNAKKAN. Bila roll-forward atau
   kontrol GL tidak menutup, itu masuk ke berkas — bukan dihapus dari tampilannya.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: bawa bukti yang sudah dihitung modul ini ke dalam kertas kerjanya, dan bereskan
sisa utang konvensi — tanpa menyentuh PR-2.

KONTEKS MODUL
- id modul: fixedassets (grup "Keuangan Firma (ERP)")
- berkas: migration/src/view_firmtreasury.tsx → `FixedAssets()` baris 409-597 dan
  `DepreciationSchedule()` baris 598-645.
  Berkas ini JUGA memuat `treasury` (36-226) dan `cashbank` (227-408) — JANGAN sentuh.
- mesin: migration/src/data_fixedassets.ts → `assetsAt` · `activeAssets` ·
  `rollForward` · `duplicateCandidates` · `depreciate`
- PRD induk: docs/prd-firm-erp-deepening.md — **PR-1 SELESAI (#258)**;
  **PR-2 Approved, belum dikerjakan**: "Aset tetap menutup ke buku besar. Akun bruto +
  akumulasi penyusutan; beban penyusutan DIPOSTING ke `5-xxx`; baris `1-400` di
  `reconciliations()`; roll-forward dienumerasi (capex & pelepasan dari `DISPOSALS`)."

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Satu register, satu mesin penyusutan (PR-1). Jangan menambah mesin kedua.
- `REF = new Date(AMS.TODAY)` — klok SSOT.
- Roll-forward dienumerasi dari register dan MEMILIKI `residual`/`ties` yang dapat
  gagal. Ia sedang gagal, dan layar mengatakannya. Itu benar.
- Selisih kontrol GL `1-400` ditampilkan jujur di layar DAN disebut di baris `meta`
  ekspor ("TIDAK menutup … selisih Rp X jt belum dijelaskan").
- Kandidat pencatatan ganda lintas-register dihitung dan ditampilkan.
- Ekspor XLSX sudah tersegel dan tombolnya hidup.

CACAT

FA1 · Kertas kerja tidak memuat bagian yang dapat dinyatakan salah  [P1]
    `onExportAssets` menyusun DUA lembar: 'Register Aset' dan 'Ringkasan Kelas'.
    Yang TIDAK ikut:
      · roll-forward NBV beserta komponennya (saldo awal, capex, penyusutan periode,
        NBV pelepasan, NBV akhir menurut komponen) dan — terutama — `residual` serta
        status `ties`;
      · daftar pelepasan yang menjelaskan pergerakan (`rollFwd.disposed`);
      · kandidat pencatatan ganda.
    Selisih kontrol GL memang disebut di `meta`, tetapi satu baris meta bukan kertas
    kerja: pembaca berkas tidak dapat menelusuri dari saldo awal ke saldo akhir.
    Daftar aset menjawab "apa yang kami punya"; roll-forward menjawab "mengapa
    angkanya bergerak seperti itu" — dan yang kedua itulah yang diuji auditor.
    Kerjakan: tambahkan lembar-lembar itu, dengan angka dari `rollForward()` yang sama
    dengan yang dirender — jangan menghitung ulang dan jangan menyalin dari tampilan.
    Bila roll-forward sedang TIDAK menutup, berkasnya WAJIB mengatakan itu sejelas
    layarnya. Jangan menunda ekspor sampai ia menutup, dan jangan membulatkan
    selisihnya hilang.

FA2 · Kandidat pencatatan ganda tidak punya jalur keputusan  [P2 — USULKAN dulu]
    Panel "Kandidat Pencatatan Ganda" menyatakan sendiri: *"perlu keputusan firma"* —
    tetapi tidak ada cara merekam keputusan itu. Tidak ada persistensi, tidak ada
    pelaku, tidak ada tanggal. Setiap kali layar dibuka, pasangan yang sama muncul lagi
    seolah belum pernah dilihat siapa pun.
    Modul `diagnostic` sudah punya pola yang dicari: temuan + keputusan auditor
    (tindak lanjut / abaikan, dengan alasan) yang ter-persist engagement-scoped —
    lihat `useDiagDecisions` di diagnostics_panel.tsx. Tetapi register aset adalah data
    FIRMA, bukan perikatan, sehingga scope-nya berbeda dan kewenangannya juga
    (FIRMFIN_EDIT?).
    Tulis usulan singkat: scope kunci, kewenangan, dan apa yang terjadi pada pasangan
    yang sudah diputuskan (hilang dari daftar, atau tetap tampil dengan status?).
    Lalu BERHENTI. Jangan membangun alur keputusan tanpa jawaban itu.

FA3 · Baris aset adalah kontrol palsu  [P1]
    `<tr … onClick={() => setSel(...)} style={{ cursor:'pointer' }}>` pada tabel
    register. Memilih aset untuk membuka jadwal penyusutannya mustahil tanpa tetikus:
    `<tr>` tidak fokusabel dan tidak menanggapi Enter/Space.
    Perbaiki dengan kontrol native di dalam baris; beri cincin fokus yang terlihat.
    Pola yang sama sedang/sudah dibereskan di modul lain (`orgchart`, `succession`,
    `revenue`) — periksa dulu, dan ikuti pola yang sudah mendarat.

FA4 · Nama firma hardcode di dalam ekspor tersegel  [P2]
    `firm: 'KAP Wijaya Hartono & Rekan'` pada payload `amsExportXlsx`.
    Register aset tetap adalah dokumen firma yang disegel; nama firma yang salah pada
    dokumen bersegel memberi otoritas pada isi yang keliru.
    Pakai SSOT (`AMS.FIRM?.name` / `FIRM.short`) — `view_pc_org.tsx` sudah melakukannya.
    Perbaiki DI BERKAS INI SAJA, dan HANYA pada rentang `FixedAssets`. `treasury` di
    berkas yang sama juga memakai literal (baris 82) — itu lingkup prompt 31; jangan
    kamu sentuh, cukup jangan menirunya.

GERBANG YANG HARUS KAMU TULIS
`data_fixedassets.ts` sudah murni; bangun di atasnya. Berkas uji .ts WAJIB bebas `any`.
  a. Payload ekspor memuat komponen roll-forward DAN `residual`; ketika roll-forward
     tidak menutup, berkasnya menyatakan itu. (Merah sebelum FA1.)
  b. Angka pada payload ekspor identik dengan hasil `rollForward()` untuk masukan yang
     sama — bukan salinan, bukan hitungan kedua. (Merah sebelum FA1.)
  c. Melepas satu aset di dalam jendela MENGUBAH komponen roll-forward pada ekspor
     (capex/penyusutan/NBV pelepasan bergerak). Gerbang perilaku, bukan gerbang
     keberadaan kolom.
  d. Daftar kandidat pencatatan ganda ikut ke berkas bila ada. (Merah sebelum FA1.)
  e. Gerbang sumber untuk rentang `FixedAssets`: nol literal nama firma, nol
     `<tr onClick>` — buang komentar dulu sebelum memindai (pola helper `kode()` di
     cockpit_conventions.test.ts). Batasi pemindaian pada rentang fungsi ini; kalau
     `treasury`/`cashbank` masih memuat pelanggaran, LAPORKAN tanpa memperbaikinya.

LANGKAH
1. INVESTIGASI — konfirmasi keempat cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca `data_fixedassets.rollForward` seluruhnya lebih dulu dan nyatakan dengan
   kalimatmu sendiri: apa itu `computed`, apa itu `closing`, mengapa keduanya bisa
   berbeda, dan apa arti `residual` yang sekarang muncul. Kalau kamu tidak dapat
   menjelaskan itu, kamu belum siap menulis lembar ekspornya.
   Laporkan juga besaran `residual` dan selisih `1-400` hari ini — angka, bukan kesan.
2. RENCANA — susunan lembar ekspor, dan usulan FA2 (lalu berhenti untuk FA2).
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — FA1, FA3, FA4. FA2 hanya usulan.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. WAJIB tetap hijau:
   uji `data_fixedassets` / register aset yang ada, firm_bridge, cash_bank_recon,
   firmfin_ledger. Angka di layar TIDAK boleh bergeser — kamu hanya membawa angka yang
   sudah ada ke dalam berkas.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · `residual` roll-forward
   dan selisih `1-400` dalam angka · usulan FA2 · pelanggaran yang kamu temukan di
   `treasury`/`cashbank` (laporan saja) · yang TIDAK dikerjakan + alasannya · asumsi
   (seharusnya nol).

BATAS
- ⛔ JANGAN mengerjakan PR-2. Memposting beban penyusutan ke `5-xxx`, menambah akun
  bruto & akumulasi penyusutan, dan memasukkan `1-400` ke `reconciliations()` adalah
  arc tersendiri yang sudah disetujui, dengan urutan mengikat (PR-1 → PR-2 → PR-4) dan
  risiko terdokumentasi (§8 R-1: penyusutan yang mulai dibukukan MENGGESER laba firma
  dan memerahkan snapshot kanon serta angka di BI/cockpit).
  Kalau menurutmu FA1 tidak dapat diselesaikan tanpa PR-2, KATAKAN dan berhenti —
  membawa roll-forward yang sudah ada ke dalam berkas seharusnya tidak memerlukannya.
- ⛔ JANGAN menghilangkan atau melunakkan selisih `residual` maupun `1-400`. Keduanya
  hasil yang benar; PRD §9 bahkan mencatat selisih `1-400` sebesar 3.374 jt sebagai
  sesuatu yang mungkin memang belum dapat dijembatani.
- ⛔ JANGAN menambah mesin penyusutan kedua, dan jangan menghitung ulang apa pun di view.
- JANGAN menyentuh `FirmTreasury` atau `CashBank` di berkas yang sama.
- JANGAN membangun alur keputusan duplikat tanpa jawaban FA2.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; angka di layar tidak bergeser.
[ ] Kertas kerja memuat roll-forward, komponennya, daftar pelepasan, `residual`, dan
    kandidat pencatatan ganda.
[ ] Ketika roll-forward tidak menutup, berkasnya mengatakan itu sejelas layarnya.
[ ] Angka ekspor identik dengan hasil mesin, bukan hitungan kedua.
[ ] Memilih aset dapat dilakukan penuh dengan papan-ketik.
[ ] Nol literal nama firma di rentang `FixedAssets`, dijaga gerbang sumber.
[ ] PR-2 tidak disentuh; `treasury` & `cashbank` tidak disentuh.
[ ] Usulan FA2 tertulis dan TIDAK diimplementasikan.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan memuat `residual` dan selisih `1-400` dalam angka.
```
