# Prompt perbaikan — modul `wip` (WIP · Valuasi & Realisasi)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-E (ledger & SoD finansial) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini secara teknis salah satu yang paling rapi di
> repo — SSOT tunggal lewat `useFirmWip`, tab beralamat (`useInitialTab`), seleksi
> beralamat, ekspor tersegel, gerbang kapabilitas UI **dan** server yang selaras
> (`FIRMFIN_EDIT` di rbac.ts:181), dan lima berkas uji menyentuhnya. Peleburan
> `wip`+`wipreal` juga sudah tuntas.
>
> Cacatnya bukan di kerapian, melainkan di **urutan kejadian pada aksi yang memindahkan
> uang**. Modul ini menurunkan nilai WIP seketika, lalu mengatakan kepada pengguna bahwa
> hal itu "menunggu otorisasi". Dan orang yang melakukannya tidak tercatat di mana pun,
> sehingga gerbang pemisahan tugas yang sudah ada menjadi tak bergigi.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah
   dan hasilnya. Klaim "absen" di repo ini secara historis SALAH SISTEMATIS.
2. SSOT. Angka berasal dari canon*/data*, bukan literal di view.
3. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. Waspadai gerbang tautologis. toMatchObject({p: /regex/})
   SELALU lolos — jangan dipakai.
4. JANGAN MENAMAI YANG MATI.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. UANG MEMBLOKIR. Aksi yang mengubah angka keuangan tidak boleh berlaku lebih dulu
   lalu meminta izin belakangan, dan tidak boleh mengaku "menunggu otorisasi" kalau
   efeknya sudah jalan. Kalau kamu tak yakin kebijakan mana yang berlaku — tanya.
7. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: perbaiki otorisasi write-down WIP. Empat cacat; W1 butuh KEPUTUSAN Ari sebelum
diimplementasikan — sisanya dikerjakan sekarang dan merupakan prasyaratnya.

KONTEKS MODUL
- id modul: wip (grup "Operasi Praktik"); PRD: docs/prd-wip-merge-valuasi-realisasi.md
- berkas: migration/src/view_wip.tsx (225 baris) + view_wip_parts.tsx
- SSOT: use_firm_wip.ts → FIRMFIN.wip(ctx, provFactor, liveByEng, adj) di data_firmfin.ts.
  Modul ini TIDAK menghitung ulang apa pun — pertahankan sifat itu.
- antrean persetujuan: view_platform.tsx (modul `approvals`) menurunkan itemnya dari
  `wip.adj` lewat AMS.PLATFORM.buildApprovals (data_platform.ts:277-293)
- kewenangan langkah: aje_approval.ts → stepAuthority()
- uji yang sudah ada (JANGAN dirusak): firm_wip · firm_bridge · firmfin_ledger ·
  cash_bank_recon · tab_address

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diragukan tanpa bukti baru):
- Tab & seleksi sudah beralamat (useInitialTab/useInitialSelection) — jangan disentuh.
- Gerbang tulis UI (CAP.FIRMFIN_EDIT, view_wip.tsx:50) SELARAS dengan penegakan server
  (rbac.ts:181). Bukan cacat.
- Ekspor tersegel sudah ada.
- `logActivity` di view_wip.tsx:75/81 mencatat WIP_WRITEDOWN ke jejak LOKAL, bukan
  rantai server. Itu diketahui, cakupannya seluruh aplikasi (contexts.tsx), dan
  E-9 Program C menyatakan ia perlu PRD sendiri. JANGAN kerjakan di sini — cukup
  sebutkan di laporan.

CACAT

W1 · Write-down berlaku SEBELUM otorisasi, dan penolakan tidak membatalkannya
     [P0 — USULKAN, jangan implementasikan sebelum ada keputusan]
    view_wip.tsx:74 memanggil setAdj(...) yang menulis `wip.adj`; nilai itu langsung
    dikonsumsi FIRMFIN.wip, sehingga angka WIP turun seketika di modul ini, Dashboard,
    kokpit Beranda, Firm Finance, dan ekspor tersegel.
    Sementara itu view_wip.tsx:181 menulis kepada pengguna:
      "<N> write-down manual ≥ Rp <X> jt menunggu otorisasi Audit Manager →
       Managing Partner."
    dan view_wip_parts.tsx:148 menulis "masuk antrean Approvals".
    Kenyataannya antrean itu DITURUNKAN dari `wip.adj` (data_platform.ts:277) — ia
    melaporkan sesuatu yang sudah terjadi, bukan menahan sesuatu yang belum terjadi.
    Lebih jauh: di view_platform.tsx, decide('reject') hanya menulis overlay
    (ajeRejectOverlay). Jalur tulis-balik ke sumber HANYA ada untuk AJE
    (`d.writesBack && d.sourceModule === 'aje'`). Untuk WIP tidak ada sama sekali.
    Akibatnya penolakan Managing Partner meninggalkan write-down tetap berlaku:
    antrean berkata "ditolak", laporan keuangan firma tetap turun.
    DUA OPSI, dan ini keputusan Ari:
      (A) Menahan efek — `wip.adj` membawa status; FIRMFIN.wip hanya mengonsumsi entri
          yang sudah disetujui. Cocok dengan aturan "uang memblokir", dan membuat teks
          UI yang sekarang menjadi benar tanpa diubah.
      (B) Efek segera + pembatalan — tambahkan jalur tulis-balik seperti AJE, sehingga
          penolakan menghapus entri; teks UI harus diubah supaya jujur bahwa efeknya
          sudah berjalan.
    Tulis usulan maksimal satu halaman: konsekuensi masing-masing terhadap konsumen
    hilir (Dashboard, cockpit, Firm Finance, ekspor yang sudah tersegel), terhadap
    data `wip.adj` yang sudah ada, dan terhadap uji firm_wip yang berlaku sekarang.
    Rekomendasikan satu, lalu BERHENTI.

W2 · Pelaku write-down tidak tercatat → gerbang SoD tak bergigi  [P0 — kerjakan]
    `wip.adj` berbentuk { engagementId: jumlah } (view_wip.tsx:74). Tidak ada siapa,
    tidak ada kapan. Karena itu data_platform.ts:287 mengisi `from` dengan MANAJER
    PERIKATAN (`e.manager`), bukan orang yang benar-benar melakukannya.
    Gerbang self-approval di aje_approval.ts:336 membandingkan `user.name === it.from`.
    Dengan `from` yang salah orang, gerbang itu memblokir manajer perikatan — yang
    mungkin tak melakukan apa-apa — dan MEMBIARKAN pelaku sebenarnya menyetujui
    write-down-nya sendiri. Perhatikan bahwa peran 'Finance Firma' memegang
    FIRMFIN_EDIT (rbac.ts:116), dan peran Partner memegang FIRMFIN_EDIT sekaligus
    kewenangan menyetujui.
    Perbaiki: catat pelaku (dan waktu) bersama jumlahnya, dan gunakan itu sebagai
    `from`. Ini mengubah bentuk `wip.adj` — jelaskan rencana baca-lewat untuk data
    lama bentuk lama di langkah RENCANA sebelum menulis kode, dan jangan memutus
    kontrak FIRMFIN.wip yang dipakai konsumen hilir.
    Identitas diambil dari sesi (pola useCurrentAuditor), bukan nama literal.

W3 · Rantai "Audit Manager → Managing Partner" tidak ditegakkan per langkah  [P1 — kerjakan]
    aje_approval.ts:355-357: untuk `it.kind !== 'AJE'` kewenangan jatuh ke
      const legacy = user.role.includes('Partner') || user.role.includes('Manager');
    Artinya untuk WIP Write-off, siapa pun yang namanya mengandung "Manager" atau
    "Partner" boleh menuntaskan langkah mana pun — termasuk langkah Managing Partner —
    padahal item itu membawa `chain` dua langkah yang eksplisit. Rantai yang
    ditampilkan kepada pengguna karena itu bukan rantai yang ditegakkan.
    Perbaiki agar langkah yang ditegakkan = langkah yang ditampilkan, memakai peran
    pada `it.chain[it.step]`. Jangan menyentuh cabang AJE; ia sudah benar dan teruji.
    Kalau perubahan ini membuat jenis persetujuan LAIN (Faktur/Billing, Penerimaan
    Klien, Opini, Independensi) ikut berubah perilaku — BERHENTI dan laporkan dulu
    ruang lingkupnya. Jangan memperluas sendiri.

W4 · Item lahir langsung melewati SLA  [P2 — kerjakan]
    data_platform.ts:288 memberi `submitted: NOW, due: NOW` pada item write-down manual.
    Karena `due` sama dengan waktu pembuatannya, setiap item baru langsung dihitung
    lewat tenggat oleh slaInfo() dan muncul di hitungan "breached". Tenggat harus
    diturunkan dari kebijakan SLA yang berlaku untuk jenis ini, bukan disamakan dengan
    waktu pengajuan. Kalau kebijakan SLA-nya belum ada di data, katakan — jangan
    mengarang durasinya.

GERBANG YANG HARUS KAMU TULIS
Tambahkan ke migration/src/firm_wip.test.ts (atau berkas baru bersebelahan; berkas uji
.ts WAJIB bebas `any`):
  a. Entri `wip.adj` membawa identitas pelaku, dan item persetujuan yang dihasilkan
     memakai identitas itu sebagai `from` — bukan manajer perikatan. (Merah sebelum W2.)
  b. Pelaku write-down TIDAK dapat menyetujui item write-down-nya sendiri.
     (Merah sebelum W2.)
  c. Peran yang tidak sesuai langkah aktif ditolak: pemegang peran Manager tidak dapat
     menuntaskan langkah Managing Partner pada item WIP Write-off. (Merah sebelum W3.)
  d. Item write-down manual yang baru dibuat TIDAK langsung berstatus lewat tenggat.
     (Merah sebelum W4.)
  e. Uji karakterisasi untuk W1 — TULIS SEKARANG, tandai `it.fails()` dengan komentar
     "// KARANTINA s/d keputusan W1 <tanggal>": setelah item write-down ditolak, nilai
     WIP kembali seperti sebelum write-down. Ini mendokumentasikan cacatnya dalam
     bentuk yang bisa dijalankan tanpa mengirim master merah (BUILD.md §R-7).

LANGKAH
1. INVESTIGASI — konfirmasi keempat cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca data_firmfin.ts (kontrak FIRMFIN.wip) dan data_platform.ts:250-295, lalu
   nyatakan dengan kalimatmu sendiri kapan sebuah write-down mulai berpengaruh pada
   angka yang dilihat orang lain.
2. RENCANA — termasuk rencana kompatibilitas bentuk `wip.adj` untuk W2. Untuk W1:
   usulan dua opsi + rekomendasi, lalu BERHENTI menunggu keputusan.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — W2, W3, W4 saja.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan firm_wip,
   firm_bridge, firmfin_ledger, dan cash_bank_recon tetap hijau.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · usulan W1 · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol) · catatan bahwa jejak WIP_WRITEDOWN
   masih lokal (Program C, PRD tersendiri).

ADENDUM LEDGER & SoD (Program E)
- Aksi tulis finansial di-gate kapabilitas DAN tercatat dengan identitas pelaku;
  server tetap otoritatif.
- Rantai yang ditampilkan wajib sama dengan rantai yang ditegakkan.
- Jangan membuat gerbang nol-delta aljabar. Gerbang yang benar untuk modul ini:
  ubah satu write-down → angka hilir bergerak sebesar itu; tolak satu write-down →
  angka hilir kembali.

BATAS
- JANGAN mengimplementasikan W1 sebelum ada keputusan Ari.
- JANGAN memindahkan `logActivity` ke rantai server (PRD tersendiri, Program C).
- JANGAN mengubah kontrak FIRMFIN.wip yang dipakai Dashboard/cockpit/Firm Finance.
- JANGAN mengubah cabang AJE pada stepAuthority.
- JANGAN mengubah tata letak tab atau menambah tab.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; lima uji WIP/keuangan lama tetap hijau.
[ ] `wip.adj` mencatat pelaku dari sesi, dan `from` pada antrean memakai pelaku itu.
[ ] Pelaku tidak dapat menyetujui write-down-nya sendiri — dibuktikan uji.
[ ] Langkah yang ditegakkan == langkah yang ditampilkan untuk WIP Write-off.
[ ] Item baru tidak lahir dalam keadaan lewat tenggat.
[ ] Uji karantina W1 ada, terbaca sebagai dokumentasi cacat, dan master tetap hijau.
[ ] Usulan W1 tertulis dan TIDAK diimplementasikan sepihak.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
