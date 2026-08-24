# Prompt perbaikan — modul `diagnostic` (Tax Audit Diagnostic)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-C (integritas) + D (definisi selesai).
>
> **Catatan pembuat prompt:** mesin di belakang modul ini bagus dan teruji
> (`diagnostics.ts` + `diagnostics.test.ts`): deterministik, ber-severity, menyebut
> standar (SA 240 ¶32), menyertakan prosedur usulan, dan — jarang — punya temuan jujur
> *"populasi terlalu kecil untuk uji Benford"* alih-alih memaksakan kesimpulan.
> Keputusan auditornya pun ter-persist **engagement-scoped** (`diagnostics.v1` →
> `engagement`, contexts.tsx:417). Viewnya sendiri hanya 45 baris dan tidak menghitung
> apa pun sendiri. Semua itu benar; jangan dikerjakan ulang.
>
> Cacat terberatnya ada di jejak keputusan: sebuah pertimbangan profesional — menutup
> atau menindaklanjuti temuan risiko kecurangan — dapat tercatat **atas nama seorang
> kolega yang tidak pernah membuatnya**, pada waktu **tanpa tanggal**.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya.
2. JEJAK PERTIMBANGAN PROFESIONAL TIDAK BOLEH MENGARANG PELAKU ATAU WAKTU. Nama yang
   salah lebih buruk daripada nama yang kosong; waktu tanpa tanggal bukan waktu.
3. MESIN YANG TIDAK DIBERI DATA TIDAK SEDANG MEMERIKSA APA-APA. Sebuah detektor yang
   diam karena tak menerima masukan terlihat sama persis dengan detektor yang memeriksa
   dan tidak menemukan apa pun. Keduanya WAJIB dapat dibedakan.
4. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
5. TIDAK ADA ASUMSI DIAM-DIAM. Ambigu → BERHENTI dan tanya.
6. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: hentikan jejak keputusan mengarang pelaku dan waktu, beri mesin diagnostik data
perikatan yang sebenarnya, dan bedakan detektor yang bersih dari detektor yang bisu.

KONTEKS MODUL
- id modul: diagnostic (grup "2 · Pelaksanaan")
- berkas: migration/src/view_diagnostics.tsx (45 baris — hanya ringkasan + panel) ·
  migration/src/diagnostics_panel.tsx (267 baris — panel, hook, jejak keputusan) ·
  migration/src/diagnostics.ts (mesin, teruji di diagnostics.test.ts)
- empat detektor: `benford` · `forensic` · `jet` · `reconcile`
- state keputusan: `diagnostics.v1`, engagement-scoped (contexts.tsx:417)
- PRD terkait: "AI Tax Diagnostic" (Draft) dan "Wedge MVP Diagnostik TB-GL"
  (In Progress) — KEDUANYA DI LUAR LINGKUP prompt ini.

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Mesin deterministik dan teruji; ia menolak menyimpulkan pada populasi kecil
  (temuan `benford-insufficient`). Pertahankan sifat itu.
- `diagnostics.v1` sudah engagement-scoped — isolasi W7.5 benar.
- Kalimat di view — "dihitung dari data kanonik (aturan + statistik), bukan model
  bahasa; tiap temuan adalah usulan, auditor memutuskan" — benar dan berguna.
  Pertahankan; setelah D2 kamu perbaiki, ia menjadi lebih benar lagi.
- View tidak menghitung apa pun sendiri. Jaga supaya tetap begitu.

CACAT

D1 · Jejak keputusan mengarang pelaku dan tidak punya tanggal  [P0]
    diagnostics_panel.tsx:158-161
      const USER: any = (AMS && AMS.USER) || { name: 'Anindya Pramesti', role: 'Audit Manager' };
      const when = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setDecisions(d => ({ ...d, [f.id]: { verdict, who: USER.name, role: USER.role, when, … } }));
    Tiga cacat menumpuk pada satu catatan:
      · `AMS.USER` adalah data SEED, bukan sesi — sehingga siapa pun yang memutuskan,
        yang tercatat adalah nama di seed;
      · fallback-nya menyebut **nama seorang kolega yang nyata** ('Anindya Pramesti',
        'Audit Manager'). Menutup temuan risiko kecurangan dapat tercatat atas nama
        orang yang tidak pernah membuat keputusan itu. Fallback anonim buruk; fallback
        yang menuduh orang tertentu jauh lebih buruk;
      · `when` hanya jam dan menit — TANPA TANGGAL, dan dari jam sistem, bukan
        `AMS.TODAY`. Sebuah keputusan bertanda "14:23" tidak dapat ditempatkan pada
        hari mana pun.
    `logActivity` di bawahnya mewarisi ketiganya.
    Kerjakan: identitas dari `useCurrentAuditor()` (sesi nyata W7; contoh di
    view_mytasks_parts.tsx:88); stempel waktu memakai klok SSOT dan menyertakan
    tanggal. Bila identitas tak tersedia, keputusan TIDAK dicatat — bukan dicatat atas
    nama siapa pun.
    HAPUS fallback bernama itu; jangan menggantinya dengan nama lain.

D2 · Mesin diagnostik tidak diberi data perikatan  [P0]
    diagnostics_panel.tsx:144-151
      amsDiagnostics({ aje: audit.aje, extraFindings: crossChecksAsFindings(audit) })
    Sementara mesinnya menerima lebih banyak (diagnostics.ts:188-193):
      pop        = c.journalPop    || AMS_FORENSIC.JOURNAL_POP
      fig        = c.fig           || FIG
      reconRows  = c.reconcileRows || safeReconcileRows()
    Tiga dari empat masukan karena itu jatuh ke bawaan: populasi jurnal ilustratif yang
    SAMA untuk setiap perikatan (populasi yang juga dipakai modul `jet`), figur bawaan,
    dan baris rekonsiliasi bawaan. Yang benar-benar berasal dari perikatan aktif
    hanyalah AJE.
    Akibatnya uji Benford dijalankan atas populasi ilustratif + AJE perikatan, lalu
    hasilnya disajikan sebagai diagnostik perikatan itu — dan dua perikatan berbeda
    akan melihat temuan yang sebagian besar sama.
    Ini pola yang sudah dikenal di repo: mesin ber-`ctx.x || bawaan`, cacatnya ada pada
    PEMANGGIL yang tidak mengirim kunci.
    Kerjakan: kirim kunci ctx yang memang tersedia dari `useAudit()`/konteks perikatan.
    Untuk kunci yang MEMANG belum ada datanya di aplikasi (mis. populasi jurnal klien
    yang sebenarnya — lihat modul `jet`), JANGAN mengarang: biarkan tak terkirim, dan
    pastikan D3 membuat keadaan itu terlihat.

D3 · Detektor yang bersih tidak dapat dibedakan dari detektor yang bisu  [P0]
    view_diagnostics.tsx: `const byDetector = {}` diisi dari temuan, lalu kartu
    keempat menampilkan `Object.keys(byDetector).length` dengan label **"Detektor
    aktif"**.
    Itu bukan jumlah detektor yang berjalan — itu jumlah detektor yang MENGHASILKAN
    temuan. Detektor yang berjalan dan tidak menemukan apa pun tidak terhitung, dan
    detektor yang tidak berjalan karena tak menerima data juga tidak terhitung. Kedua
    keadaan itu tampak identik: angka yang lebih kecil.
    Untuk modul diagnostik, "berjalan dan bersih" adalah informasi asurans — justru
    itu yang ingin diketahui auditor.
    Kerjakan: bedakan tiga keadaan per detektor — berjalan & menemukan · berjalan &
    bersih · tidak dapat berjalan (masukan tidak tersedia) — dan tampilkan ketiganya.
    Label "Detektor aktif" hanya boleh dipakai bila ia benar-benar berarti itu.
    Empat detektor terdaftar hari ini: `benford`, `forensic`, `jet`, `reconcile` —
    verifikasi sendiri dengan grep, jangan percaya angka di prompt ini.

D4 · Temuan severity rendah dihitung lalu dibuang  [P2]
    `const c = { high: 0, med: 0, low: 0 }` diisi lengkap, tetapi hanya `high` dan
    `med` yang dirender; `c.low` tidak muncul di mana pun. Temuan `low` termasuk
    `benford-insufficient` — justru temuan yang memberi tahu auditor bahwa pengujian
    tidak konklusif.
    Kerjakan: tampilkan, atau hapus penghitungannya. Jangan menghitung diam-diam.

D5 · Temuan & keputusan tidak dapat dikeluarkan sebagai kertas kerja  [P1]
    Tidak ada `amsExport*` di view_diagnostics.tsx maupun diagnostics_panel.tsx.
    Temuan diagnostik beserta keputusan auditor (tindak lanjut / abaikan, dengan
    alasan) adalah dokumentasi SA 240 — dan tidak ada cara mengeluarkannya.
    Kerjakan setelah D1: ekspor XLSX/PDF tersegel berisi tiap temuan, severity,
    standar rujukan, prosedur usulan, keputusan auditor, alasannya, pelaku, dan
    tanggalnya. Nama firma dari SSOT, bukan literal.
    Ekspor ini HANYA bermakna bila D1 sudah benar — mengekspor keputusan yang pelakunya
    dikarang berarti menyegel atribusi yang salah. Kerjakan berurutan.

GERBANG YANG HARUS KAMU TULIS
`diagnostics.ts` sudah murni & teruji; tambahkan uji untuk lapisan hook/panel dengan
mengekstrak apa yang perlu ke fungsi murni ber-ekspor bernama. Berkas uji .ts WAJIB
bebas `any`.
  a. Keputusan yang dibuat tanpa identitas sesi TIDAK tersimpan. (Merah sebelum D1.)
  b. Tidak ada nama orang yang tertanam sebagai fallback di kode diagnostik — gerbang
     sumber, buang komentar dulu sebelum memindai (pola helper `kode()` di
     cockpit_conventions.test.ts). (Merah sebelum D1.)
  c. Stempel keputusan memuat tanggal dan mengikuti klok SSOT: majukan `AMS.TODAY` →
     stempel ikut maju. (Merah sebelum D1.)
  d. Mengubah data perikatan yang dikirim ke mesin MENGUBAH temuan yang dihasilkan —
     dua konteks perikatan berbeda tidak menghasilkan temuan yang identik.
     (Merah sebelum D2.)
  e. Detektor yang tidak menerima masukan dilaporkan sebagai "tidak dapat berjalan",
     BUKAN sebagai nol temuan. (Merah sebelum D3.)
  f. Payload ekspor memuat pelaku dan tanggal untuk setiap keputusan yang ada.
     (Merah sebelum D5.)

LANGKAH
1. INVESTIGASI — konfirmasi kelima cacat di HEAD sekarang; tempelkan bukti barisnya.
   Baca `diagnostics.ts` seluruhnya lebih dulu dan nyatakan dengan kalimatmu sendiri:
   masukan apa saja yang diterima `amsDiagnostics`, detektor apa yang bergantung pada
   masukan mana, dan apa yang terjadi pada masing-masing bila masukannya tidak dikirim.
   Tanpa jawaban itu kamu tidak dapat mengerjakan D2 maupun D3.
   Periksa juga apakah konteks perikatan benar-benar menyediakan kunci yang kurang —
   kalau tidak tersedia, katakan; jangan mengarang jembatannya.
2. RENCANA — termasuk bentuk tampilan tiga keadaan detektor (D3) dan isi ekspor (D5).
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — D1, D2, D3, D4, lalu D5 (berurutan; D5 setelah D1).
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. `diagnostics.test.ts`
   WAJIB tetap hijau — kalau ia merah, kamu mengubah mesin, dan itu di luar lingkup.
   Periksa juga modul `jet` dan `forensic` yang berbagi populasi: keduanya tidak boleh
   berubah perilakunya.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · daftar kunci ctx yang
   berhasil kamu sambungkan DAN yang memang belum ada datanya · berapa detektor yang
   ternyata "tidak dapat berjalan" hari ini (angka, bukan kesan) · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN menambah detektor baru, mengubah ambang, atau menyentuh `diagnostics.ts`.
  Mesinnya teruji; yang salah adalah apa yang diberikan kepadanya dan bagaimana
  hasilnya disajikan.
- ⛔ JANGAN membangun drill-down per temuan atau alur diagnostik baru — itu PRD
  "AI Tax Diagnostic" (Draft) dan "Wedge MVP Diagnostik TB-GL" (In Progress),
  keduanya di luar lingkup.
- ⛔ JANGAN mengarang masukan untuk detektor yang datanya memang belum ada. Membuat
  detektor "berjalan" dengan data karangan lebih buruk daripada membiarkannya
  dinyatakan tidak dapat berjalan.
- ⛔ JANGAN mengganti fallback bernama dengan nama lain — hapus.
- JANGAN mengubah `AMS_FORENSIC.JOURNAL_POP` (dipakai bersama `jet` dan `forensic`).
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; diagnostics.test.ts tetap hijau.
[ ] Tidak ada nama orang yang tertanam sebagai fallback di kode diagnostik.
[ ] Keputusan auditor memakai identitas sesi nyata dan stempel bertanggal dari klok SSOT.
[ ] Mesin menerima data perikatan yang tersedia; yang belum tersedia dinyatakan, bukan
    diganti bawaan diam-diam.
[ ] Detektor bersih dan detektor bisu dapat dibedakan di layar.
[ ] Temuan severity rendah ditampilkan atau tidak dihitung sama sekali.
[ ] Temuan + keputusan dapat diekspor tersegel, lengkap dengan pelaku dan tanggal.
[ ] Mesin `diagnostics.ts` tidak disentuh; `jet` & `forensic` tidak berubah perilaku.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut berapa detektor yang tidak dapat berjalan hari ini.
```
