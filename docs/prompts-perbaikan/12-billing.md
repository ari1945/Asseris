# Prompt perbaikan — modul `billing` (Billing & Invoicing)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-E (ledger & SoD finansial) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini menerbitkan dokumen keuangan bernomor ke klien.
> Formnya sudah rapi (validasi jatuh-tempo lewat `canon_validation`, `<Overlay>`,
> field berlabel), ekspor "Cetak" SUDAH tersegel lewat `amsExportPdf` — temuan E-9
> "billing memakai amsPrintDoc" sudah BASI, jangan dikerjakan.
>
> Yang belum benar ada di tiga tempat yang lebih dalam: **nomor faktur yang bisa
> menabrak nomor terbit**, **piutang firma yang tidak pernah tahu faktur sudah dibayar**,
> dan **jejak aktivitas yang mencatat orang yang salah**. Dua di antaranya sudah punya
> preseden perbaikan di repo ini — pakai preseden itu, jangan menemukan pola baru.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah
   dan hasilnya. Klaim "absen" di repo ini secara historis SALAH SISTEMATIS.
2. SSOT. Satu register per konsep. Kalau satu modul MENULIS dokumen persist sementara
   modul lain MEMBACA seed literalnya, itu bukan "belum tersambung" — itu dua register.
3. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
4. JANGAN MENAMAI YANG MATI.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. UANG MEMBLOKIR, dan dokumen keuangan yang keluar ke klien tidak boleh bergantung
   pada angka yang bisa berubah diam-diam.
7. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: perbaiki penomoran faktur, sambungkan register faktur ke piutang firma, dan
benahi identitas pelaku pada jejak aktivitas.

KONTEKS MODUL
- id modul: billing (grup "Operasi Praktik")
- berkas: migration/src/view_pipeline.tsx — fungsi `Billing()` baris 578-713 dan
  `InvForm()` baris 715-763. Berkas ini juga memuat modul `pipeline`; ubah HANYA
  bagian Billing/InvForm kecuali disebut lain di bawah.
- dokumen persist: `invoices` (firm-scope; capForWrite = FIRMFIN_EDIT, rbac.ts:181)
- konsumen yang seharusnya: modul `apar` (view_firmgl.tsx → FirmAPAR)

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Ekspor "Cetak" faktur SUDAH memakai amsExportPdf (tersegel). Selesai.
- Gerbang tulis UI (CAP.FIRMFIN_EDIT, baris 587) selaras dengan penegakan server.
  Bukan cacat.
- Form faktur sudah memvalidasi jatuh-tempo < tanggal terbit lewat
  `dueBeforeIssued` (canon_validation) dan sudah memakai `<Overlay>` + field berlabel.
- `logActivity` menulis jejak LOKAL, bukan rantai server. Itu diketahui dan
  cakupannya seluruh aplikasi (E-9 Program C, perlu PRD sendiri). JANGAN kerjakan
  di sini — cukup sebutkan di laporan.

CACAT

B1 · Nomor faktur diturunkan dari PANJANG ARRAY  [P0 — kerjakan]
    view_pipeline.tsx:613
      const id = 'INV-2026-0' + (46 + invoices.length);
    Tiga kegagalan sekaligus pada dokumen yang bernomor:
      · Hapus/batalkan satu faktur, lalu terbitkan yang baru → nomornya MENABRAK
        nomor yang sudah pernah terbit. Faktur ganda-nomor bukan kosmetik.
      · '2026' beku di dalam literal — tahun buku berikutnya salah tanpa suara.
      · Di atas 99 faktur, formatnya rusak: 'INV-2026-0100'.
    Perbaiki: nomor berikutnya diturunkan dari nomor TERTINGGI yang pernah dipakai
    pada register (bukan dari jumlah barisnya), tahun dari klok SSOT (AMS.TODAY),
    dan lebar angka yang tidak pecah saat melewati 99.
    Kalau menurutmu penomoran perlu kebijakan lain (per-tahun reset, per-klien, prefiks
    firma) — itu keputusan Ari. Terapkan yang minimal & benar, lalu SEBUTKAN
    pertanyaannya di laporan; jangan mengarang kebijakan.

B2 · Piutang firma tidak pernah tahu faktur sudah dibayar  [P0 — kerjakan]
    Billing menulis ke dokumen persist:
      view_pipeline.tsx:581  useAmsPersist('invoices', () => AMS.INVOICES)
    Modul AP/AR membaca SEED, bukan dokumen itu:
      view_firmgl.tsx:396    const ar: any = AMS.INVOICES;
    Jadi "Tandai Lunas" dan "Kirim Faktur" mengubah KPI di layar Billing, sementara
    tab Piutang, aging AR, dan ringkasan per-klien tetap melihat keadaan seed selamanya.
    Dan view_firmgl.tsx:526 mengatakan kepada pengguna:
      "AR tersinkron dari modul Billing & Invoicing · AP dikelola di sini · keduanya
       mengalir ke GL firma."
    Kalimat itu tidak benar hari ini.
    PRESEDEN YANG HARUS DIIKUTI (jangan bikin pola baru): register peluang punya
    masalah yang persis sama dan sudah diselesaikan lewat SATU PINTU —
    `use_pipeline.ts` (`usePipelineRegister`), yang sendiri menyebut dirinya sejajar
    dengan `useFirmCoa` (#241). Baca use_pipeline.ts:14-25 dan komentar
    view_platform.tsx:118-123 lebih dulu, lalu buat pintu yang setara untuk faktur.
    Kamu DIIZINKAN mengubah view_firmgl.tsx HANYA pada titik konsumsi register faktur
    (baris 396 dan turunannya yang langsung). Tidak ada perubahan lain di berkas itu.

B3 · Jejak aktivitas mencatat orang yang salah  [P1 — kerjakan]
    view_pipeline.tsx:67, 306, dan 590:
      const who = (AMS.USER && AMS.USER.name) || 'Pengguna';
    Itu nama dari data seed, bukan identitas sesi. Setiap logActivity dari modul ini
    — INV_CREATE, INV_SENT, INV_PAID — menempel pada orang yang sama siapa pun yang
    login. Untuk modul uang yang mengklaim SoD finansial, jejak yang salah orang
    lebih buruk daripada tidak ada jejak.
    `useCurrentAuditor()` sudah ada dan sudah dipakai view_wip.tsx, view_wp.tsx, dan
    view_mytasks_parts.tsx. Pakai itu. Ketiga situs di berkas ini boleh kamu ganti
    sekaligus meski dua di antaranya milik modul pipeline — cacatnya identik dan
    perbaikannya satu baris per situs.

B4 · Pelunasan tanpa jumlah, tanggal, atau bukti  [P1 — kerjakan yang jelas,
     USULKAN sisanya]
    view_pipeline.tsx:598 markPaid memaksa `paid: x.amount, status: 'Paid'`. Padahal
    tabelnya punya kolom "Dibayar" terpisah dan modul AR menghitung `out = amount - paid`
    — struktur datanya MENGANDAIKAN pembayaran parsial mungkin terjadi, sementara UI
    hanya bisa melunasi penuh. Tidak ada tanggal bayar yang dicatat, sehingga aging
    piutang dan rekonsiliasi kas tidak punya dasar.
    Hal yang JELAS dan harus dikerjakan: catat tanggal pelunasan (dari klok SSOT) pada
    faktur saat ditandai lunas; begitu juga tanggal kirim saat status → 'Sent'.
    Hal yang BUTUH KEPUTUSAN — usulkan, jangan putuskan: apakah pembayaran parsial
    (dan bukti/referensi bank) masuk lingkup modul ini, atau datang dari modul
    "Kas, Bank & Rekonsiliasi". Tulis opsinya, sebutkan konsekuensinya terhadap aging
    AR, lalu BERHENTI.

B5 · Faktur baru selalu lahir bertanggal 9 Maret 2026  [P2 — kerjakan]
    view_pipeline.tsx:713
      const INV_FORM_INIT = { …, issued: '2026-03-09', due: '2026-04-15', … };
    Nilai awal form faktur beku. Klok SSOT `AMS.TODAY` sudah dipakai di seluruh repo
    (K-02). Tanggal terbit default harus hari ini; jatuh tempo default diturunkan dari
    termin/kebijakan, bukan literal. Kalau kebijakan terminnya belum ada di data,
    katakan — jangan mengarang jumlah harinya.

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji hari ini)
Ekstrak logika murni (penomoran, transisi status faktur) ke berkas .ts murni dengan
ekspor bernama; berkas uji .ts WAJIB bebas `any`.
Minimal yang dipaku:
  a. Nomor faktur baru tidak pernah menabrak nomor yang sudah ada — termasuk setelah
     sebuah faktur dihapus dari register, dan termasuk ketika register melewati 99
     baris. (Merah sebelum B1.)
  b. Menandai faktur lunas mengubah angka yang DIBACA modul AR — bukan hanya angka di
     layar Billing. Uji ini harus membaca register lewat satu pintu yang sama.
     (Merah sebelum B2.)
  c. Gerbang CAKUPAN, bukan tie-out (pelajaran dari `pipeline_ssot_coverage.test.ts`):
     setiap pembaca register faktur di migration/src masuk lewat pintu itu — nol
     pembacaan langsung `AMS.INVOICES` di luar pintu. Buang komentar sebelum memindai;
     gerbang yang ikut membaca komentar akan salah merah.
  d. Faktur yang ditandai lunas membawa tanggal pelunasan; yang dikirim membawa
     tanggal kirim. (Merah sebelum B4.)
  e. Nilai awal form tidak memuat tanggal literal. (Merah sebelum B5.)

LANGKAH
1. INVESTIGASI — konfirmasi kelima cacat di HEAD sekarang; tempelkan bukti barisnya.
   Sebelum menyentuh B2, baca use_pipeline.ts dan pipeline_ssot_coverage.test.ts, lalu
   nyatakan dengan kalimatmu sendiri apa yang membuat pola "satu pintu" itu bekerja.
2. RENCANA — termasuk: bentuk pintu register faktur, dan rencana kompatibilitas untuk
   dokumen `invoices` yang sudah ada (baris lama tak punya tanggal bayar/kirim).
   Untuk bagian B4 yang butuh keputusan: usulan, lalu BERHENTI.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — B1, B2, B3, B5, dan bagian B4 yang jelas.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Pastikan uji keuangan
   yang ada (firm_wip · firm_bridge · firmfin_ledger · cash_bank_recon ·
   pipeline_ssot_coverage) tetap hijau.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · usulan B4 · pertanyaan
   kebijakan penomoran (B1) · yang TIDAK dikerjakan + alasannya · asumsi (seharusnya
   nol) · catatan bahwa jejak masih lokal (Program C).
   Sebutkan juga sebagai temuan kecil: header InvForm memakai gradien heksadesimal
   mentah (view_pipeline.tsx:732) — pelanggaran token warna. Jangan perbaiki di PR ini
   kecuali kamu memang sedang mengubah baris itu.

ADENDUM LEDGER & SoD (Program E)
- Angka laporan diturunkan dari transaksi nyata; perubahan status faktur WAJIB
  berdampak pada AR. Register yang tidak bergerak ketika transaksinya berubah = cacat.
- Jangan membuat gerbang nol-delta aljabar. Gerbang yang benar: ubah satu faktur →
  angka AR bergerak sebesar itu.
- Identitas pelaku dari sesi; server tetap otoritatif.

BATAS
- JANGAN mengubah modul `pipeline` selain tiga situs `who` pada B3.
- JANGAN mengubah view_firmgl.tsx selain titik konsumsi register faktur (B2).
- JANGAN memindahkan logActivity ke rantai server (PRD tersendiri).
- JANGAN mengubah alur/tata letak Billing atau menambah tab.
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; uji keuangan lama tetap hijau.
[ ] Nomor faktur tidak dapat menabrak nomor terbit, dibuktikan uji (termasuk kasus
    faktur terhapus dan register > 99 baris).
[ ] Menandai faktur lunas menggerakkan angka AR, dibuktikan uji.
[ ] Nol pembacaan langsung `AMS.INVOICES` di luar satu pintu, dijaga gerbang cakupan
    yang membuang komentar.
[ ] Pelunasan & pengiriman membawa tanggal dari klok SSOT.
[ ] Nol tanggal literal di nilai awal form.
[ ] Jejak aktivitas memakai identitas sesi.
[ ] Usulan B4 tertulis dan TIDAK diimplementasikan sepihak.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
