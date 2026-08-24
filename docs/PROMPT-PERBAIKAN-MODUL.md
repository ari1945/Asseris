# Template Prompt — Perbaikan Modul Asseris

> **Untuk apa:** menaikkan kedalaman satu modul (L0–L5, taksonomi E-9) dengan cara
> yang bisa diverifikasi, bukan yang terdengar meyakinkan. Dipakai oleh agen AI
> maupun manusia yang mengeksekusi perbaikan.
>
> **Sumber kebenaran yang dirujuk template ini** (jangan salin isinya ke sini — tautkan saja):
> - **Kedalaman terkini per modul (PAKAI INI, bukan E-9 mentah):**
>   [`KEDALAMAN-158-MODUL-TERKINI.md`](KEDALAMAN-158-MODUL-TERKINI.md) — skor 0–5,
>   plafon L0–L5, kolom ⚠ (cacat terbukti hidup), dan §6 daftar modul yang skornya
>   diketahui MENGECILKAN keadaan.
> - Rubrik & hasil kedalaman (baseline, 2026-08-13): [`PRD-RINGKASAN-KEDALAMAN-E9.md`](PRD-RINGKASAN-KEDALAMAN-E9.md)
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

### 0.1 · Mengisi parameter dari tabel kedalaman

BLOK-B minta `<L_SEKARANG>`, `<L_TARGET>`, `<temuan>`, `<program>`. Ambil dari
[`KEDALAMAN-158-MODUL-TERKINI.md`](KEDALAMAN-158-MODUL-TERKINI.md) §3:

| Kolom tabel | Isi slot template |
|---|---|
| **Ceil / Plafon** | `<L_SEKARANG>` |
| **Sekarang (skor)** | penentu `<L_TARGET>`: skor < 2,0 → naik satu level plafon · skor 2,0–3,0 → **tutup gap ke plafon yang sudah ada**, bukan naik level · skor > 3,0 → cukup BLOK-E satu titik |
| **⚠n** | wajib jadi butir pertama `<temuan>`; literalnya ada di §4 |
| status `※` basi / arc mendarat | **jangan kirim prompt** sebelum baca ulang kodenya |
| §6 "mengecilkan" (`↑`) | investigasi WAJIB membaca mesin di luar berkas view |
| Plafon **L4⚠️** | wajib adendum C-B (key firm-scope = P0) |
| Plafon **L0/L1** | wajib adendum C-G (kertas kerja atau referensi?) |

**Pemilihan adendum** — maksimal dua per prompt; lebih dari dua = pecah PR.
C-J tidak dihitung, ia selalu ikut.

| Gejala di modul | Adendum |
|---|---|
| Tombol unduh/cetak mati; `amsPrintDoc` untuk output klien | C-A |
| Literal `20xx-xx-xx`; tabel tarif sendiri; key firm-scope | C-B |
| Badge "Terverifikasi" tanpa `audit.verify`; tulis lokal | C-C |
| `<span onClick>` sebagai toggle; tombol ikon tanpa label | C-D |
| Angka laporan tak bergerak saat jurnal diposting; angka "plug" | C-E |
| Chip tautan modul tak memanggil `nav()` | C-F |
| Plafon L0/L1; isi seluruhnya hardcode | C-G |
| Nama orang/firma/nomor dokumen literal di view atau ekspor | **C-H** |
| `X ? kanon : SEED`; register tanpa pembaca render | **C-I** |
| Menyentuh lint / worktree / berkas baru | **C-J** (selalu) |

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
7. FALSIFIKASI GERBANGMU SENDIRI. Setelah menulis uji, buktikan ia bisa MERAH pada
   kode LAMA: `git stash && npm test -- <berkas uji>` -> harus GAGAL -> `git stash pop`.
   Gerbang yang lolos "vakum" sudah terjadi TIGA kali di repo ini:
   - regex yang DIRAKIT dari string/template literal kehilangan escape-nya. Urutan
     backslash-b di dalam template literal JS, atau lewat heredoc shell, mendarat
     sebagai byte BACKSPACE = pola yang tak pernah cocok. `cat -A` TIDAK
     menampakkannya. Tulis regex sebagai literal /.../ , atau pakai toContain untuk
     teks harfiah. Jangan pernah merakit RegExp dari string di dalam uji gerbang.
   - toMatchObject({p: /regex/}) SELALU lolos.
   - menguji keberadaan simbol, bukan perilaku.
   Uji yang belum pernah kamu lihat MERAH bukan gerbang.
8. MESIN MEMBANTAH, BUKAN MENGISI. Kalau modul menyajikan kesimpulan/angka yang
   seharusnya lahir dari pekerjaan auditor, dan pekerjaan itu belum dilakukan —
   jawabannya BUKAN mengisi nilai "yang benar". Mengarang jawaban benar mengulang
   cacat yang sedang dicabut, hanya dengan pengarang berbeda. Yang benar: panel
   KOSONG + kontrol pengisinya, atau mesin yang MEMBANTAH (menyatakan datanya belum
   ada / urutannya mustahil). Bantahan itu ikut TERSEGEL dalam ekspor.
   Konsekuensi: mencabut data karangan sering MEWAJIBKAN menambah kontrol yang
   hilang — kalau tidak, data karangan cuma bertukar jadi panel MATI.
   Gerbang untuk ini hanya boleh memaku urutan yang MUSTAHIL (mis. persetujuan
   bertanggal sebelum bantuan diberikan), bukan menebak isi yang benar.
9. CABANG KERJA != CABANG PR. Jalankan `git log --oneline origin/master..HEAD` dan
   `git status --short` SEBELUM mulai. Direktori kerja utama repo ini rutin memegang
   commit arc LAIN yang belum punya PR, dan berkas `M` milik sesi paralel. Kirim
   lewat cabang BARU dari origin/master + cherry-pick, verify ulang di atas master
   terkini. Jangan menumpang cabang yang isinya bukan milikmu, dan jangan menyebut
   nomor baris berkas yang sedang `M`.

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

### C-H · Identitas karangan (pelaku, dokumen, entitas)

Pola cacat dengan sebaran terbesar di repo ini (~94 situs/79 berkas hanya untuk nama
firma). Tempel untuk modul mana pun yang menghasilkan memo, kertas kerja, bukti
potong, faktur, atau ekspor tersegel.

> **Direvisi 2026-08-24 sesudah uji lapangan pertama (`mgmtletter`).** Versi pertama
> menangkap 2 dari 4 cacat modul itu, dan yang lebih buruk: **gerbang penutupnya HIJAU
> di atas kode yang bocor.** Tiga perubahan di bawah lahir dari situ —
> (1) alat yang benar disebut LEBIH DULU, (2) lingkup persistensi masuk sebagai
> identitas, (3) gerbangnya menagih ISI, bukan kop. Rinciannya:
> `docs/prompts-perbaikan/142-mgmtletter.md`.

```
ADENDUM IDENTITAS
Cari SEMUA identitas di modul ini dan buktikan asal tiap satu:
  grep -n "Wijaya|Hartono|Linda|CPA|KAP |ENG-20|FY20|NPWP" <view>

- Nama pelaku (penyusun/peninjau/penandatangan) pada JALUR TULIS: pakai pola
  glActor() (firm_gl_actor.ts) — turunkan HANYA dari auth.user, dan bila sesi tak
  menyediakannya, JANGAN JALANKAN aksi tulisnya. Tombol dinonaktifkan dengan alasan
  yang terbaca; tidak ada nama cadangan. Jejak yang salah orang lebih buruk daripada
  tidak ada jejak, karena ia terbaca seolah-olah terbukti. Preseden: glActor
  (Firm GL, AP/AR, Pajak Firma), iaActor (internalaudit_memo.ts), mlActor
  (mgmtletter_record.ts — yang ini juga membawa PERAN dari sesi, bukan cuma nama).
  JANGAN pakai useCurrentAuditor() untuk atribusi tulis: ia sengaja JATUH KEMBALI ke
  AMS.USER (data seed). Jaring itu benar untuk memfilter "milik saya" di tampilan —
  di sana tebakan yang meleset tak merusak apa pun — tetapi pada jalur tulis ia
  justru cacat yang sama dengan nama berbeda.
  Dan jangan meniru modul tetangga tanpa memeriksa: meniru `useFirm().firm.name`
  (yang tak pernah ada) sudah melahirkan tiga tombol ekspor mati permanen.
- Nama firma/klien/perikatan dari konteks (useFirm/useAudit), bukan literal.
  Literal 'ENG-2025-014'/'FY2025' adalah perikatan BAWAAN seed, sehingga cacatnya
  TAK TERLIHAT pada perikatan default. Uji WAJIB memakai perikatan KEDUA.
- Nomor dokumen (faktur, bukti potong, nomor KK) TIDAK BOLEH diturunkan dari panjang
  array atau indeks — nomornya bergeser saat data bergerak dan menabrak nomor lama.
- Nama pihak ketiga (auditor pendahulu, vendor, pegawai) yang masuk ke output
  TERSEGEL: kalau datanya tidak ada di repo, BERHENTI dan tanya. Jangan mengarang.
- Anotasi tipe INLINE di call-site bisa MENGARANG bentuk objek sehingga tsc ikut diam
  dan sel memo selalu kosong. Ambil tipe dari sumbernya, jangan tulis ulang di
  parameter callback.
- LINGKUP PERSISTENSI ADALAH IDENTITAS. Identitas bukan hanya apa yang DICETAK,
  melainkan DOKUMEN SIAPA yang dibuka. Untuk SETIAP useAmsPersist(<key>) di modul,
  buktikan lingkupnya: kunci yang tak terdaftar di AMS_PERSIST_SCOPE dan tak cocok
  PR4_ENGAGEMENT_KEY_RE JATUH KE LINGKUP FIRMA — kertas kerja satu klien terbaca pada
  SELURUH perikatan. Cacat ini TIDAK menghasilkan satu pun literal, jadi grep di atas
  buta terhadapnya; ia hanya terlihat dengan membaca peta lingkup. Efek keduanya:
  firm-scope tanpa cabang capForWrite = FIRM_ADMIN, jadi suntingan Manajer/Senior
  ditolak server SENYAP. Memindahkan kunci ke 'engagement' TIDAK perlu menaikkan
  versi — lingkup sudah bagian dari alamat (ams.v1.<scope>.<scopeId>.<key>), sehingga
  dokumen firma lama tidak tertimpa dan tidak pula terbaca.
- Gerbang: TULIS pada perikatan A -> buka perikatan B -> ISI-nya harus TIDAK ADA di
  sana. Gerbang yang hanya memeriksa "identitas di payload ekspor berbeda" TIDAK
  CUKUP dan bisa MENYESATKAN: di mgmtletter, scopeId/nama klien/refNo sudah diturunkan
  dari activeEngagement sehingga kop surat memang berubah — sementara temuan di
  bawahnya milik klien lain. Kop yang benar di atas isi yang salah lebih buruk
  daripada kop yang salah. Perikatan KEDUA wajib (bukan ENG-2025-014/FY2025 bawaan).
- Gerbang pelaku: dua sesi berbeda melakukan aksi yang SAMA -> jejak tersimpan menyebut
  nama BERBEDA, dan tanpa sesi tak ada baris yang tertulis sama sekali. Gerbang yang
  hanya memeriksa "bukan <nama karangan lama>" tidak membuktikan apa pun — nama
  karangan yang lain juga bukan nama itu.
- Pisahkan DATA SEED dari KODE HIDUP sebelum menghitung. grep di atas tidak tahu
  bedanya: di mgmtletter ia menandai 13 situs padahal hanya 3 yang jalur tulis.
  Seed ilustratif adalah kelas masalah lain dengan prioritas lain — iris berkasnya
  (mis. dari deklarasi komponen pertama) dan gerbangi jumlah situs seed agar tetap
  UTUH, supaya batas itu sendiri terbukti dihormati.
```

### C-I · Fallback ke seed karangan

```
ADENDUM FALLBACK
Cari pola `X ? kanon : SEED` dan `ctx.x || BAWAAN` di view DAN di mesin yang dipanggil.

- Fallback ke data karangan LEBIH BURUK daripada tanpa fallback: modul terlihat hidup,
  angkanya tidak. Inilah cara ARC-014 bertahan melewati tiga PR.
- Cacatnya sering di PEMANGGIL, bukan mesin: pemanggil tak mengirim kunci ctx, lalu
  mesin `ctx.x || bawaan` diam-diam memakai seed.
- Larik KOSONG adalah truthy. `rows.length ? kanon : seed` berbeda dari `rows || seed`.
  Sebagian mesin repo ini JATUH KE SINGLETON saat diberi larik kosong (wtbRows([])),
  jadi "membuktikan ketiadaan" lewat input kosong justru MENGULANG cacatnya.
- Telusuri sampai SITUS RENDER sebelum menyebut sebuah register "hidup". Register yang
  punya pembaca di mesin tapi nol pembaca di view adalah kode mati — dan repo ini
  tidak punya gerbang variabel mati yang akan menangkapnya.
- "Dipertahankan sebagai referensi" = mekanisme agar data salah bertahan. Cabut, lalu
  tulis uji yang MENAGIH janji pencabutannya sendiri.
- Gerbang: matikan sumber kanon -> modul harus KOSONG atau MEMBANTAH, bukan
  menampilkan seed.
```

### C-J · Higiene gerbang repo (ikut di SETIAP prompt)

```
ADENDUM GERBANG REPO
- `npm run lint` bisa exit 2 TANPA mencetak satu error pun bila hitungan `:any` TURUN.
  Itu bukan kegagalan kodemu — sinkronkan: `npm run lint:any-baseline`.
- eslint-suppressions.json adalah berkas BERSAMA lintas arc. Bila direktori kerja
  memegang perubahan arc lain, JANGAN jalankan lint:any-baseline lalu commit seluruh
  berkas. Stage bedah: `git show HEAD:<berkas>` -> sunting -> `git hash-object -w` +
  `git update-index --cacheinfo`.
- Impor ke berkas UNTRACKED = commit takkan build. Verifikasi sebelum kirim:
  `git write-tree` lalu `git ls-tree` — pastikan berkas barunya benar-benar masuk.
- Bila direktori kerja utama MERAH oleh arc lain, verify di worktree segar.
  PERINGATAN: `ensure-prisma-client` di worktree MERACUNI pohon utama lewat junction
  server/node_modules — pakai `npm ci` NYATA untuk server/, junction hanya untuk
  root/migration/e2e. Lepas junction dengan `cmd /c rmdir` SEBELUM `git worktree remove`.
- `tail` menelan exit code `npm run verify`. Jangan menyimpulkan hijau dari ekor log.
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
| `new RegExp` dirakit dari string di dalam uji gerbang | Escape hilang → pola tak pernah cocok → uji hijau di atas kode rusak (terjadi 3×) |
| Mengisi jawaban "yang benar" untuk pekerjaan yang belum dilakukan | Mengulang cacat karangan dengan pengarang berbeda; mesin harus MEMBANTAH |
| Mencabut data karangan tanpa menambah kontrol pengisinya | Data karangan bertukar jadi panel MATI |
| Menguji hanya pada perikatan bawaan (`ENG-2025-014`) | Cacat isolasi tak terlihat pada perikatan default |
| `commit` di cabang kerja yang memegang arc orang lain | Commit-mu ikut menyandera arc yang belum punya PR |
| Menyimpulkan verify hijau dari ekor log | `tail` menelan exit code |
