# Template Prompt — Perbaikan Modul Asseris

> **Untuk apa:** menaikkan kedalaman satu modul (L0–L5, taksonomi E-9) dengan cara
> yang bisa diverifikasi, bukan yang terdengar meyakinkan. Dipakai oleh agen AI
> maupun manusia yang mengeksekusi perbaikan.
>
> **Sumber kebenaran yang dirujuk template ini** (jangan salin isinya ke sini — tautkan saja):
> - Rubrik & hasil kedalaman: [`PRD-RINGKASAN-KEDALAMAN-E9.md`](PRD-RINGKASAN-KEDALAMAN-E9.md)
> - Program sistemik A–F + 12 modul terdangkal: [`PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md`](PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md)
> - Kandidat per-temuan K-01..K-05: [`PRD-KATALOG-EVALUASI-158-MODUL.md`](PRD-KATALOG-EVALUASI-158-MODUL.md)
> - Aturan repo: [`../CLAUDE.md`](../CLAUDE.md) · gerbang: [`../BUILD.md`](../BUILD.md) §R-7
> - Status PRD: [`PRD-REGISTRY.md`](PRD-REGISTRY.md)

---

## 0 · Cara pakai

1. Tentukan **satu** modul dan **satu** target level. Satu prompt = satu modul.
   Naik lebih dari satu level sekaligus hampir selalu jadi PR yang tak bisa direviu.
2. Salin **BLOK-A** (preamble tetap, tak pernah diubah) + **BLOK-B** (isi parameternya).
3. Tempelkan **adendum** dari BLOK-C yang cocok dengan pola gap modul itu. Boleh lebih
   dari satu, tapi kalau lebih dari dua — pecah jadi beberapa PR.
4. Untuk perbaikan kecil satu-titik (satu tombol mati, satu tanggal beku),
   pakai **BLOK-E** (versi ringkas) saja.

**Kapan WAJIB PRD dulu:** target L4→L5, perubahan skema Prisma, perubahan kontrak
tRPC, atau apa pun yang menyentuh `canon*`. Selain itu, perbaikan yang menutup cacat
yang sudah terdokumentasi di E-9/katalog boleh langsung dikerjakan — cukup rujuk
temuannya.

**Rubrik kedalaman (ringkas):** L0 tak ada (fallback) · L1 display statis ·
L2 interaktif lokal · L3 persisten lokal · L4 server-backed (SSOT server) ·
L5 siklus hidup penuh (server + rantai audit + sign-off/SoD + ekspor tersegel).

> ⚠ **Temuan E-9 bertanggal 2026-08-13 dan sebagian SUDAH ditutup** (Program B klok
> SSOT lewat PR #231, Program C sebagian lewat PR #225/#232, Program D sebagian lewat
> PR #233). Contoh: E-9 menulis "AMS.TODAY hanya dipakai 2 view" — per 2026-08-20
> sudah 47 berkas. **Langkah 1 setiap prompt wajib memverifikasi ulang temuannya di
> kode sekarang.** Mengirim agen memperbaiki cacat yang sudah tertutup menghasilkan
> perubahan tanpa dasar, dan itu lebih mahal daripada tidak mengerjakan apa pun.

---

## BLOK-A · Preamble tetap (salin apa adanya)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src; app/,
build/, NeoSuite AMS.html adalah referensi beku — jangan diedit.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan pernah menulis "fitur X belum ada" / "modul ini tidak
   punya Y" tanpa grep lebih dulu. Di repo ini klaim "absen" secara historis SALAH
   SISTEMATIS — konverter, mesin, dan helper yang dikira belum ada ternyata sudah ada
   dengan nama lain. Setiap klaim absen harus disertai perintah grep yang kamu jalankan
   dan hasilnya.
2. SSOT. Angka berasal dari canon*/data*, bukan literal di view. Kalau kamu menemukan
   angka hardcode yang seharusnya turunan, itu temuan — laporkan, jangan diam-diam
   dibiarkan atau diganti dengan literal lain.
3. GERBANG HARUS BISA MERAH. Sebelum memperbaiki, tulis dulu uji yang GAGAL pada kode
   sekarang, dan tunjukkan output merahnya. Uji yang hijau sejak sebelum perbaikan
   tidak membuktikan apa pun. Waspadai gerbang tautologis: menguji "aktual == turunan"
   ketika keduanya dihitung dari variabel yang sama = hiasan, bukan rekonsiliasi.
   toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
4. JANGAN MENAMAI YANG MATI. Memberi aria-label/title pada tombol yang tidak punya
   handler membuat keadaan LEBIH BURUK: pembaca layar mengumumkan kontrol yang tak
   melakukan apa-apa. Tombol mati: aktifkan atau hapus. Tidak ada opsi ketiga.
5. TIDAK ADA ASUMSI DIAM-DIAM. Kalau spesifikasi ambigu, atau kamu butuh data yang
   tidak ada di repo (tarif, lampiran regulasi, keputusan kebijakan) — BERHENTI dan
   tanyakan. Jangan mengarang nilai, jangan mempersempit scope tanpa bilang.
6. Kontrol form NATIVE (<Switch>/<Check> dari ui.tsx), bukan <span onClick>.
   Skala tipografi hanya 8 ukuran (lantai 11px, dilarang setengah langkah).
   Warna lewat token CSS var, bukan hex. `:any` baru = lint merah.

GERBANG SELESAI (jalankan dari root, tempelkan outputnya):
   npm run verify
master selalu hijau (BUILD.md §R-7). Kalau ada repro cacat yang belum ditutup, pakai
it.fails()/it.skip() + komentar "// KARANTINA s/d <tanggal>" — jangan kirim merah.
```

---

## BLOK-B · Template inti (isi parameternya)

```
TUGAS: naikkan kedalaman modul <ID> (<LABEL>) dari <L_SEKARANG> ke <L_TARGET>.

KONTEKS MODUL
- id modul: <ID>          (terdaftar di migration/src/icons.tsx MODULES)
- berkas view: <view_*.tsx>   (peta rute di migration/src/lazy_views.tsx)
- grup / workspace: <GRUP>
- temuan E-9 untuk modul ini: <SALIN BARIS TEMUAN, mis. "materialitas hardcode 900 jt
  — pelanggaran SSOT; tombol Unduh mati; ttd hardcode">
- program sistemik terkait: <A ekspor | B klok-tarif-scope | C integritas | D a11y |
  E ledger-SoD | F navigasi | —>

LANGKAH (jangan lompat)
1. INVESTIGASI — sebelum menulis kode apa pun, laporkan:
   a. Apa yang MODUL INI benar-benar lakukan sekarang (baca view-nya, jangan menebak
      dari nama).
   b. Mesin/kanon apa yang SUDAH ADA dan bisa dipakai. Grep dulu:
      `grep -rn "<konsep>" migration/src/canon*.ts migration/src/data*.ts`
      Sebutkan perintah + hasilnya. Kalau mesin yang tepat sudah ada dan modul ini
      memakai yang salah — itu temuan utamanya, bukan "fitur belum ada".
   c. Di mana state modul ini disimpan sekarang (key persist, firm-scope atau
      engagement-scope) dan apakah scope-nya benar.
   d. Daftar kontrol mati (tombol tanpa onClick) di modul ini.
   e. APAKAH TEMUAN E-9 DI ATAS MASIH BERLAKU? Temuan itu bertanggal 2026-08-13 dan
      sebagian sudah ditutup PR belakangan. Kalau sudah tertutup: katakan begitu,
      hentikan tugas, jangan cari-cari pekerjaan pengganti.
2. RENCANA — satu paragraf: perubahan apa, di berkas mana, kenapa itu yang minimal.
   Kalau ternyata butuh perubahan canon*/skema/kontrak tRPC → BERHENTI, tulis PRD dulu
   (template: 00-DASHBOARD/Templates/prd-template.md), tunggu "Proceed."
3. GERBANG MERAH — tulis uji yang gagal pada kode sekarang. Tempelkan output merahnya.
   Uji harus memaku PERILAKU (angka benar / scope benar / aksi berdampak), bukan
   keberadaan simbol.
4. IMPLEMENTASI — perubahan sekecil mungkin yang membuat gerbang hijau.
5. VERIFIKASI — `npm run verify` dari root. Tempelkan output.
6. LAPORAN — format tetap:
   - Sebelum → sesudah (level, dan APA yang berubah bagi pengguna)
   - Bukti: uji yang tadinya merah, sekarang hijau
   - Yang TIDAK dikerjakan dan alasannya
   - Asumsi yang kamu ambil (kalau ada — seharusnya nol, lihat aturan 5)

BATAS
- Jangan menyentuh modul lain kecuali untuk menghapus duplikasi yang kamu buktikan
  duplikat.
- Jangan merapikan kode yang tidak berkaitan (no drive-by refactor).
- Jangan menambah dependensi.
```

---

## BLOK-C · Adendum per pola gap

Tempelkan yang relevan di bawah BLOK-B.

### C-A · Output naik kelas (ekspor tersegel) — Program A

```
ADENDUM EKSPOR
- Semua ekspor lewat amsExportPdf/amsExportXlsx (tersegel Ed25519). amsPrintDoc
  DILARANG untuk output yang sampai ke klien.
- Kalau tombol ekspor sudah ADA tapi mati: wire ke aksi nyata. Kalau tidak ada isi
  yang layak diekspor, HAPUS tombolnya dan katakan begitu di laporan.
- Isi ekspor harus dari SSOT modul (canon/state server), bukan menyalin ulang angka
  yang ditampilkan.
- Gerbang: uji yang memastikan payload ekspor berubah ketika data sumber berubah
  (bukan sekadar "fungsi ekspor dipanggil").
```

### C-B · Klok, tarif, dan scope — Program B

```
ADENDUM KLOK/TARIF/SCOPE
- Tanggal "hari ini" HANYA dari AMS.TODAY. Cari literal '2026-' di modul ini dan
  ganti semuanya; rentang tahun buku yang memang kanonik boleh tetap literal —
  sebutkan mana yang kamu anggap sah dan kenapa.
- Tarif HANYA dari FIRMFIN.WIP_BILL. Kalau modul ini punya tabel tarif sendiri,
  itu duplikat — hapus, jangan sinkronkan.
- Key persistensi data perikatan WAJIB engagement-scope. Periksa terhadap registri
  scope (AMS_PERSIST_SCOPE / PR4_ENGAGEMENT_KEY_RE). Key firm-scope untuk data
  perikatan = kebocoran isolasi W7.5, perlakukan sebagai cacat P0.
- Gerbang: uji yang membuktikan dua perikatan berbeda TIDAK saling melihat datanya.
```

### C-C · Integritas server, bukan tampilan — Program C

```
ADENDUM INTEGRITAS
- Klaim "Terverifikasi"/"Immutable" di UI hanya boleh muncul kalau berasal dari
  audit.verify server (rantai sha256), bukan hash lokal.
- Aksi tulis harus meninggalkan jejak server (state.set + audit event), bukan
  setState lokal.
- Identitas pelaku dari sesi (useCurrentAuditor), bukan nama hardcode.
- Gerbang: uji yang membuktikan rantai PUTUS terdeteksi (rusak satu entri → verify
  harus gagal). Uji yang hanya memanggil verify pada data sehat tidak membuktikan apa pun.
```

### C-D · Aksesibilitas & kontrol native — Program D

```
ADENDUM A11Y
- Ganti <span/div onClick> yang berperan sebagai switch/checkbox/radio dengan
  <Switch>/<Check> native dari ui.tsx.
- Tombol ikon: beri aria-label/title HANYA setelah dipastikan tombolnya hidup
  (lihat aturan keras 4).
- Hapus fontSize setengah langkah; pakai token --fs-*.
- Ganti hex hardcode dengan token warna semantik.
- Gerbang: e2e axe untuk modul ini = 0 critical, plus smoke keyboard (tab → aktifkan
  → state berubah).
```

### C-E · Ledger-based reporting & SoD finansial — Program E

```
ADENDUM LEDGER/SoD
- Angka laporan harus DITURUNKAN dari transaksi nyata; posting jurnal WAJIB berdampak
  pada TB/LK. Seed statis yang tidak bergerak ketika jurnal diposting = cacat P0.
- Jangan membuat gerbang nol-delta aljabar (menguji A == A dengan nama berbeda).
  Gerbang yang benar: ubah satu transaksi → laporan bergerak sebesar itu.
- Komponen jembatan rekonsiliasi harus DIENUMERASI satu per satu, tidak boleh ada
  angka "plug" yang diturunkan dari selisihnya sendiri.
- Aksi tulis finansial di-gate kapabilitas + tercatat di jejak; server otoritatif.
```

### C-F · Navigasi lintas modul — Program F

```
ADENDUM NAVIGASI
- Chip/panel "Tautan Modul" harus benar-benar memanggil nav(id, {from:'<ID>'}).
- Petanya sudah ada di RELATED_SA / LINEAGE — pakai itu, jangan bikin daftar baru.
- Deep-link tab lewat useInitialTab; alamat hash diurus route_hash.ts.
- Gerbang: uji yang membuktikan chip menghasilkan rute yang benar (bukan sekadar
  chip-nya tampil).
```

### C-G · Cangkang L1 → kertas kerja (modul display-only)

```
ADENDUM NAIK DARI DISPLAY-ONLY
Modul ini sekarang hanya menampilkan konten hardcode. Sebelum menambah apa pun,
JAWAB DULU pertanyaan produk ini dan tunggu keputusan:

  Apakah modul ini seharusnya jadi (a) KERTAS KERJA — auditor mengisi, tersimpan,
  ditandatangani, diekspor; atau (b) REFERENSI — bahan bacaan yang lebih tepat hidup
  di Knowledge Base ketimbang sebagai modul tersendiri?

Kalau (a): target minimum = state server engagement-scope + sign-off + ekspor tersegel.
Kalau (b): usulkan pemindahan ke kb dan penghapusan entri MODULES-nya — kurangi
permukaan, jangan tambah.
Jangan mulai coding sebelum jawabannya jelas. Menambah form ke modul yang seharusnya
dihapus adalah kerugian ganda.
```

---

## BLOK-D · Definisi Selesai (tempel di akhir setiap prompt)

```
SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root (bukan hanya lint, bukan hanya test).
[ ] Tidak ada `:any` baru tanpa sinkronisasi baseline (npm run lint:any-baseline).
[ ] Tidak ada angka hardcode baru yang seharusnya turunan.
[ ] Tidak ada tombol/kontrol mati baru; kontrol mati lama yang kamu sentuh sudah
    dihidupkan atau dihapus.
[ ] Kalau modul menyimpan data perikatan: key-nya engagement-scope, dan ada uji
    isolasinya.
[ ] PRD (kalau dibuat) terdaftar konsisten di docs/PRD-REGISTRY.md.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```

---

## BLOK-E · Versi ringkas (perbaikan satu titik)

```
Asseris — baca CLAUDE.md dulu. Sumber di migration/src.

Perbaiki: <deskripsi satu kalimat, mis. "tombol 'Kertas Kerja' di view_psak19.tsx
tidak punya onClick">.

Aturan: (1) grep dulu, jangan klaim sesuatu tidak ada tanpa bukti; (2) tulis uji yang
merah dulu, tempelkan outputnya; (3) tombol mati — hidupkan atau hapus, jangan
sekadar diberi label; (4) angka dari canon*, bukan literal; (5) selesai =
`npm run verify` hijau dari root, output ditempelkan; (6) kalau ada yang ambigu,
berhenti dan tanya — jangan mengarang.

Laporkan: apa yang berubah bagi pengguna · uji merah→hijau · apa yang tidak dikerjakan.
```

---

## Contoh terisi — `spr2400` (L1 → L4)

```
[BLOK-A preamble ...]

TUGAS: naikkan kedalaman modul spr2400 (SPR 2400 · Reviu) dari L1 ke L4.

KONTEKS MODUL
- id modul: spr2400
- berkas view: migration/src/view_spr2400.tsx
- grup: SA · Area Khusus & Perikatan (grup dengan agregat terendah, 1,50)
- temuan E-9: display-only; materialitas HARDCODE 900 jt — pelanggaran SSOT; tanpa
  ekspor laporan reviu
- program terkait: A (ekspor) + G (cangkang → kertas kerja)

LANGKAH
1. INVESTIGASI — khususnya: materialitas yang benar sudah dihitung di mana? Grep
   canon_base/canon_part3 untuk mesin materialitas yang dipakai modul `materiality`.
   Jangan bikin perhitungan baru kalau mesinnya sudah ada.
   ...
[BLOK-B sisanya, + adendum C-A dan C-G, + BLOK-D]
```

Catatan yang membuat contoh ini instruktif: gap utamanya **bukan** "belum ada
perhitungan materialitas" — mesinnya sudah ada dan modul ini memakai literal.
Prompt yang dimulai dari "tambahkan perhitungan materialitas" akan menghasilkan
mesin kedua, dan dua sumber kebenaran lebih buruk daripada satu yang salah.

---

## Anti-pola yang membuat hasil kerja ditolak

| Anti-pola | Kenapa fatal |
|---|---|
| "Modul ini belum punya X" tanpa grep | Klaim absen di repo ini salah secara sistematis; hasilnya mesin duplikat |
| Uji ditulis setelah perbaikan | Tidak membuktikan apa pun; gerbang yang tak pernah merah bukan gerbang |
| Gerbang tautologis (A == A) | Terlihat seperti rekonsiliasi, sebenarnya hiasan |
| `toMatchObject({p: /regex/})` | Selalu lolos |
| aria-label pada tombol mati | Memburukkan a11y, bukan memperbaikinya |
| Angka literal "sementara" | Tak pernah sementara; jadi SSOT kedua |
| Key firm-scope untuk data perikatan | Kebocoran isolasi W7.5 |
| Naik dua level dalam satu PR | Tak bisa direviu; gagal parsial jadi tak terdeteksi |
| Mengirim `master` merah | Melanggar R-7 |
