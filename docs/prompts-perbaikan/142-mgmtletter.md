# Prompt perbaikan — modul `mgmtletter` (Management Letter)

> Dibuat 2026-08-24 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble, aturan keras 1–9) + B (inti) + adendum **C-H** (identitas karangan)
> + C-B (klok & scope) + C-J + D.
> Gelombang 1, urutan **3**. Skor kedalaman **3,00 / 5** — dan skor itulah masalahnya.
>
> **Modul ini masuk Gelombang 1 justru karena skornya TIDAK rendah.** Agregat 3,00
> menyembunyikan dua cacat P0 sepenuhnya. Ia sekaligus **uji lapangan pertama untuk
> adendum C-H yang baru** — kalau C-H tidak menangkap apa yang ada di bawah, C-H yang
> perlu diperbaiki sebelum dipakai ke 20 modul berikutnya.
>
> **Catatan pembuat prompt — verifikasi sendiri, 2026-08-24. Berkas view-nya BUKAN
> `view_mgmtletter.tsx` (tidak ada): rutenya `view_final3.tsx` → `ManagementLetter`
> (lazy_views.tsx:109), 693 baris.**
>
> **1. "13 situs Linda Wijaya" TIDAK SEKELAS — dan ini koreksi terpenting saya
> terhadap sensus.** Sensus kedalaman menghitung 13 kemunculan dan menyebutnya satu
> cacat. Setelah dibaca, 13 itu terbelah dua:
>
> | Kelas | Baris | Sifat |
> |---|---|---|
> | **Tulis HIDUP (P0)** | 244 · 521 · 526 | auditor NYATA menekan tombol NYATA hari ini → jejaknya distempel `'Linda Wijaya'` |
> | Seed ilustratif | 23 · 47 · 70 · 82 · 110 · 111 · 121 · 126 · 131 · 137 | data contoh di `ML_FINDINGS_SEED` / `ML_DISCUSSIONS_SEED` |
>
> Baris 244 adalah yang terburuk: `onAdd({ … who: role === 'auditor' ? 'Linda Wijaya' : 'Wakil Klien' … })`
> — setiap catatan diskusi yang ditulis auditor mana pun diatribusikan ke seorang
> kolega nyata. Baris 521 dan 526 melakukan hal yang sama untuk **keputusan** (`decisionBy`)
> dan stempel keputusan.
>
> Kalau prompt menyuruh "bersihkan 13 situs", pengeksekusi akan menghabiskan tenaga
> menyikat data seed sementara tiga situs tulis-hidup lolos — atau menukar nama seed
> dengan nama karangan lain. **Tiga situs tulis-hidup itulah pekerjaannya.**
>
> `useCurrentAuditor()` sudah ada (`contexts.tsx:280`) dan sudah dipakai lima modul:
> `view_firmgl` · `view_firmtax` · `view_mytasks_parts` · `view_wp` · contexts sendiri.
>
> **2. Isolasi perikatan BOCOR — cacat P0 yang tidak disebut sensus sama sekali.**
> Baris 507–508:
>
> ```
> const [findings,   setFindings]   = persist('mgmtletter.findings.v2',   ML_FINDINGS_SEED);
> const [discussions,setDiscussions]= persist('mgmtletter.discussions.v2', ML_DISCUSSIONS_SEED);
> ```
>
> `useAmsPersist` (contexts.tsx:812–819) menentukan scope begini:
>
> ```
> const scope = AMS_PERSIST_SCOPE[key] || (PR4_ENGAGEMENT_KEY_RE.test(key) ? 'engagement' : 'firm');
> ```
>
> `mgmtletter` **tidak terdaftar** di `AMS_PERSIST_SCOPE`, dan `PR4_ENGAGEMENT_KEY_RE`
> (contexts.tsx:807) hanya mencocokkan `psak\d+|syariah|sustain|sectorck|auditcomm|spr2410|presentasi|sakroadmap`.
> Jadi keduanya jatuh ke **`'firm'`**. Temuan surat manajemen — yang menurut sifatnya
> milik satu perikatan satu klien — **terlihat di seluruh perikatan firma**. Itu
> kebocoran isolasi W7.5, dan modul ini memang memanggil `useFirm()` untuk
> `activeClient`/`activeEngagement` (baris 504) sehingga surat yang tercetak memakai
> nama klien yang sedang aktif **di atas temuan milik klien lain**.
>
> **3. Klok dari jam mesin.** Baris 168: `const today = () => new Date().toISOString().slice(0,10);`
> — dipakai di baris 244, 521, 526 (stempel tanggal keputusan & diskusi). Repo ini
> sudah memindahkan 68 stempel kertas kerja ke `AMS.TODAY`; modul ini tertinggal.
>
> **4. Identitas firma tidak konsisten di dalam SATU berkas.** Baris 393 menuliskan
> `KAP Wijaya Hartono &amp; Rekan` **harfiah di badan surat** — dokumen yang sampai ke
> klien. Sementara baris 555, di berkas yang sama, sudah melakukannya dengan benar:
> `firm: AMS.FIRM.name || 'KAP Wijaya Hartono & Rekan'`. Satu berkas, dua kebiasaan.
>
> **Tidak ada keputusan produk yang memblokir modul ini.** Keempat cacat punya jawaban
> yang benar tanpa perlu bertanya ke Ari — itulah sebabnya ia bisa dikerjakan penuh di
> Gelombang 1, berbeda dengan `spr2400` dan `invprop`.

---

## Prompt (salin seluruh blok)

```
[Salin BLOK-A dari docs/PROMPT-PERBAIKAN-MODUL.md — preamble tetap, aturan keras 1–9.]

TUGAS: cabut atribusi karangan pada jalur TULIS dan tutup kebocoran isolasi perikatan
di modul mgmtletter (Management Letter).

KONTEKS MODUL
- id modul: mgmtletter (icons.tsx, grup "3 · Penyelesaian & Pelaporan")
- berkas view: migration/src/view_final3.tsx (693 baris), komponen `ManagementLetter`
  (baris 503). BUKAN view_mgmtletter.tsx — berkas itu tidak ada.
  Rute: lazy_views.tsx:109
- skor kedalaman: 3,00 / 5 — skor ini MENYEMBUNYIKAN dua cacat P0 di bawah
- program terkait: identitas karangan (C-H) + klok & scope (C-B)

═══════════════════════════════════════════════════════════════════════
KEADAAN AWAL YANG SUDAH DIVERIFIKASI (2026-08-24) — verifikasi ulang sebelum bertindak
═══════════════════════════════════════════════════════════════════════

CACAT-1 · Atribusi karangan pada jalur TULIS (P0) — TIGA situs, bukan 13
  view_final3.tsx:244   onAdd({ ... who: role === 'auditor' ? 'Linda Wijaya' : 'Wakil Klien', ... })
                        -> setiap catatan diskusi yang ditulis auditor NYATA hari ini
  view_final3.tsx:521   decisionBy: stage === 'diskusi' ? '' : 'Linda Wijaya (Manager)'
                        -> setiap KEPUTUSAN atas temuan
  view_final3.tsx:526   { d: today(), who: 'Linda Wijaya', role: 'auditor', ... }
                        -> stempel keputusan yang masuk utas diskusi

  SEPULUH kemunculan lain (baris 23, 47, 70, 82, 110, 111, 121, 126, 131, 137) ada di
  dalam ML_FINDINGS_SEED (baris 19-105) dan ML_DISCUSSIONS_SEED (baris 106-147).
  Itu DATA SEED ILUSTRATIF — kelas masalah BERBEDA, prioritas BERBEDA. Jangan
  menghabiskan tugas ini menyikatnya, dan JANGAN menukarnya dengan nama karangan lain.
  Kalau menurutmu seed itu juga harus dicabut, itu USULAN terpisah — tulis, jangan
  kerjakan.

  Mesin yang benar SUDAH ADA: useCurrentAuditor() di contexts.tsx:280, dipakai
  view_firmgl · view_firmtax · view_mytasks_parts · view_wp.
  ⚠ PERINGATAN: useCurrentAuditor() JATUH KEMBALI ke AMS.USER. Untuk ATRIBUSI TULIS,
  fallback itu SALAH. Periksa bagaimana modul yang sudah benar menanganinya —
  view_wp.tsx dan view_firmtax.tsx adalah preseden terdekat — dan tiru yang TERBARU,
  bukan yang pertama kamu temukan.

CACAT-2 · Kebocoran isolasi perikatan (P0, W7.5) — TIDAK disebut sensus
  view_final3.tsx:507   persist('mgmtletter.findings.v2',    ML_FINDINGS_SEED)
  view_final3.tsx:508   persist('mgmtletter.discussions.v2', ML_DISCUSSIONS_SEED)
  contexts.tsx:812-819  useAmsPersist -> scope = AMS_PERSIST_SCOPE[key]
                                        || (PR4_ENGAGEMENT_KEY_RE.test(key) ? 'engagement' : 'firm')
  contexts.tsx:807      PR4_ENGAGEMENT_KEY_RE = /^(psak\d+|syariah|sustain|sectorck|
                        auditcomm|spr2410|presentasi|sakroadmap)\./
  `mgmtletter` TIDAK terdaftar di AMS_PERSIST_SCOPE dan TIDAK cocok regex itu ->
  jatuh ke 'firm'. Temuan surat manajemen satu klien terlihat di SELURUH perikatan.
  Modul memanggil useFirm() untuk activeClient/activeEngagement (baris 504), sehingga
  surat mencetak nama klien AKTIF di atas temuan milik klien LAIN.

CACAT-3 · Klok dari jam mesin (P1)
  view_final3.tsx:168   const today = () => new Date().toISOString().slice(0, 10);
  Dipakai di baris 244, 521, 526. Repo sudah memindahkan 68 stempel kertas kerja ke
  AMS.TODAY; modul ini tertinggal.

CACAT-4 · Identitas firma tidak konsisten DI DALAM SATU BERKAS (P1)
  view_final3.tsx:393   <div ...>KAP Wijaya Hartono &amp; Rekan</div>   <- HARFIAH, di
                        BADAN SURAT yang sampai ke klien
  view_final3.tsx:555   firm: AMS.FIRM.name || 'KAP Wijaya Hartono & Rekan'  <- BENAR
  Satu berkas, dua kebiasaan. Samakan ke jalur yang benar.
  Baris 393 juga memakai warna hex harfiah '#0c2430' — ganti dengan token CSS var.

═══════════════════════════════════════════════════════════════════════
LANGKAH
═══════════════════════════════════════════════════════════════════════

1. INVESTIGASI — laporkan sebelum menyentuh kode:
   a. Keempat cacat masih persis seperti itu? Kalau ada yang tertutup: katakan, berhenti.
   b. Bagaimana view_wp.tsx dan view_firmtax.tsx menangani fallback useCurrentAuditor()
      untuk atribusi TULIS? Tunjukkan barisnya. Tiru yang terbaru.
   c. Cara yang BENAR mendaftarkan key sebagai engagement-scope di repo ini: lewat
      AMS_PERSIST_SCOPE, atau lewat penamaan yang cocok PR4_ENGAGEMENT_KEY_RE?
      Periksa bagaimana modul lain yang engagement-scope melakukannya dan ikuti.
      ⚠ Kalau mengganti NAMA key, data lama pengguna akan yatim. Laporkan
      konsekuensinya dan pilih jalur yang tidak membuang data — atau katakan kalau
      memang harus dibuang, dengan alasannya.
   d. Apakah `today()` dipakai di tempat lain dalam view_final3.tsx selain 244/521/526?

2. RENCANA — satu paragraf. Butuh ubah canon*/skema/kontrak tRPC -> BERHENTI, PRD dulu.

3. GERBANG MERAH — tulis uji yang GAGAL pada kode sekarang, lalu FALSIFIKASI
   (`git stash` -> harus merah -> `git stash pop`). Tempelkan output merahnya.
   Yang harus dipaku:
     · Auditor A dan auditor B melakukan aksi yang sama -> jejak yang tersimpan
       menyebut nama yang BERBEDA. Gerbang yang hanya memeriksa "bukan Linda Wijaya"
       TIDAK CUKUP: nama karangan lain juga bukan Linda Wijaya.
     · Temuan yang dicatat pada perikatan A TIDAK TERLIHAT pada perikatan B.
       ⚠ WAJIB memakai perikatan KEDUA. 'ENG-2025-014'/'FY2025' adalah perikatan
       BAWAAN seed — menguji di atasnya membuat cacat isolasi TAK TERLIHAT.
     · Stempel tanggal mengikuti AMS.TODAY, bukan jam mesin: geser AMS.TODAY -> stempel
       ikut bergeser.
     · Nama firma di badan surat berubah ketika identitas firma berubah.
   ⛔ JANGAN merakit RegExp dari string di dalam uji (aturan keras 7).
   ⛔ JANGAN memakai toMatchObject({p: /regex/}) — selalu lolos.

4. IMPLEMENTASI — sekecil mungkin.

5. VERIFIKASI — `npm run verify` dari root. Tempelkan output. Jangan pipe ke `tail`.

6. LAPORAN — format tetap, plus: apakah adendum C-H menangkap keempat cacat ini, atau
   ada yang lolos? Prompt ini adalah uji lapangan pertama C-H; jawabanmu akan dipakai
   memperbaiki adendumnya.

═══════════════════════════════════════════════════════════════════════
⛔ BATAS DAN LARANGAN
═══════════════════════════════════════════════════════════════════════

1. ⛔ JANGAN menyentuh 10 kemunculan 'Linda Wijaya' di ML_FINDINGS_SEED /
   ML_DISCUSSIONS_SEED. Itu kelas masalah lain. Kalau menurutmu perlu dicabut, tulis
   USULAN (docs/usulan-*.md, TANPA awalan prd) dan berhenti di situ.
2. ⛔ JANGAN mengganti nama karangan dengan nama karangan lain. Identitas berasal dari
   sesi, atau tidak ada sama sekali.
3. ⛔ view_final3.tsx berisi tujuh komponen (MLFinding, MLDiscussionThread,
   MLDecisionPanel, MLFindingList, MLWorkflowFull, MLLetter, MLStatStrip). Sentuh
   hanya yang diperlukan keempat cacat. Tidak ada drive-by refactor.
4. ⛔ JANGAN menambah sign-off, ekspor tersegel, atau alur baru. Ini perbaikan cacat,
   bukan pendalaman modul.
5. ⛔ JANGAN mengubah bentuk data tersimpan tanpa memikirkan data pengguna yang sudah
   ada (lihat Langkah 1c).

[Tempel ADENDUM C-H, C-B, dan C-J dari BLOK-C template, lalu BLOK-D definisi selesai.]

TAMBAHAN untuk definisi selesai:
[ ] Tiga situs tulis-hidup (244, 521, 526) memakai identitas sesi; dibuktikan uji yang
    memperlihatkan DUA auditor berbeda menghasilkan DUA nama berbeda.
[ ] Key persistensi mgmtletter engagement-scope; dibuktikan uji isolasi dengan
    perikatan KEDUA (bukan ENG-2025-014).
[ ] Nol `new Date()` tersisa untuk stempel di view_final3.tsx.
[ ] Nama firma di badan surat berasal dari identitas firma; hex harfiah baris 393 diganti token.
[ ] Sepuluh situs seed TIDAK tersentuh (batas 1 dihormati).
[ ] Laporan menjawab: apakah C-H menangkap keempat cacat, atau ada yang lolos?
```

---

## Hasil eksekusi (2026-08-24) — uji lapangan pertama C-H

Cabang **`fix/mgmtletter-atribusi-isolasi`**, di-baseline ke `origin/master` (`f650c74`),
BUKAN ke HEAD direktori kerja.

### Premis prompt: 4/4 benar — tapi satu sudah tertutup di master

| Cacat | Status di direktori kerja (`1059316`) | Status di `origin/master` (`f650c74`) |
|---|---|---|
| 1 · atribusi karangan, 3 situs | terbukti | **masih terbuka** |
| 2 · kebocoran lingkup persist | terbukti | **masih terbuka** |
| 3 · klok `new Date()` | terbukti | **SUDAH DITUTUP** — `clock_ssot.ts` · `amsDateIso()` |
| 4 · nama firma harfiah di kop | terbukti | **masih terbuka** |

Direktori kerja utama tertinggal **39 commit**. Menulis perbaikan di atasnya lalu
mengirim versi lokal akan **MENGEMBALIKAN** `new Date()` yang sudah dicabut master —
kelas kesalahan yang sama dengan arc `firmgl+apar` yang tersalip. Karena itu ML-3 di
gerbang ini berubah peran menjadi **penjaga regresi**, bukan gerbang merah, dan
perekam baru menyalurkan `today()` (= `amsDateIso()`) sebagai ARGUMEN.

### Jawaban atas pertanyaan Langkah 6

**C-H versi pertama menangkap 2 dari 4.**

- Cacat 1 ✅ tertangkap — **tetapi menyebut alat yang SALAH lebih dulu**
  (`useCurrentAuditor()`), dengan peringatan fallback baru di kalimat berikutnya. Agen
  yang mengikutinya harfiah akan memasang alat itu dan mendapat cacat yang sama dengan
  nama berbeda. Aturan yang sebenarnya berlaku di repo ini — *tanpa sesi, aksi tulisnya
  tidak dijalankan* — tidak ada sama sekali di C-H.
- Cacat 2 ⚠️ **LOLOS, dan gerbang C-H HIJAU di atas kode yang bocor.** C-H menutup
  dengan "identitas di payload ekspor harus BERBEDA"; di modul ini `scopeId`, nama
  klien, dan `refNo` sudah diturunkan dari `activeEngagement`, jadi kop surat memang
  berubah — sementara temuan di bawahnya milik klien lain. Grep C-H
  (`Wijaya|…|ENG-20|FY20|NPWP`) nol hasil, karena cacatnya tak punya literal.
- Cacat 3 — memang wilayah C-B, benar tidak di C-H.
- Cacat 4 ✅ tertangkap langsung oleh grep-nya.

Tambahan: grep C-H tidak membedakan **data seed** dari **kode hidup** — di sini ia
menandai 13 situs padahal hanya 3 yang jalur tulis.

### C-H sudah direvisi

`docs/PROMPT-PERBAIKAN-MODUL.md` §C-H, tiga perubahan: (1) `glActor` disebut lebih
dulu berikut aturan "tanpa sesi tidak menulis"; (2) bullet baru **lingkup persistensi
adalah identitas**; (3) gerbang diganti dari "kop berbeda" menjadi **"tulis di A →
buka B → ISI-nya tidak ada"**, plus gerbang pelaku dua-sesi dan aturan mengiris seed.

---

## Lanjutan — Opsi C dilaksanakan (keputusan Ari, 2026-08-24)

Batas 1 prompt ini ("JANGAN menyentuh 10 kemunculan di seed; kalau menurutmu perlu
dicabut, tulis USULAN dan berhenti") dihormati pada putaran pertama: usulan ditulis,
pekerjaan berhenti. Ari kemudian memilih **Opsi C**, dan itu dikerjakan pada commit
berikutnya di cabang yang sama.

### Yang ditemukan saat melaksanakannya

1. **Cakupan seed lebih luas dari premis prompt.** Prompt menyebut 10 kemunculan
   `'Linda Wijaya'`. Seed sebenarnya juga memuat `'Rudi Gunawan (Partner)'` (2
   keputusan), `'Citra Halim'` (5 catatan), dan nama pihak klien — total 7 temuan dan
   24 catatan. Menandai "sepuluh situs" akan meninggalkan separuh masalahnya.
   **Pelajaran untuk penulis prompt berikutnya:** angka hasil grep atas SATU nama
   bukan ukuran sebuah kelas cacat.
2. **Penanda dipasang di deklarasi, bukan disulam ke 31 objek.**
   `mlMarkIllustrative(...)` / `mlMarkIllustrativeThreads(...)` membungkus seed —
   isinya tak disentuh, baris seed baru ikut tertandai tanpa perlu diingat, dan
   gerbang MENOLAK penanda yang diketik manual (`illustrative:` di irisan seed harus 0).
3. **Pembaca kedua yang tak disebut sensus mana pun.** `view_presentasi.tsx` — dek
   yang dipresentasikan KEPADA KLIEN — membaca kunci yang sama, jadi temuan peraga
   akan tayang di sana sebagai fakta. Ia juga membaca alamat **tak-berlingkup**
   (`prLoadLS('mgmtletter.findings.v2')`), yang sejak W6 tak pernah ditulis siapa pun,
   sehingga dek itu diam-diam memakai seed pada SETIAP perikatan. Keduanya diperbaiki.
   **Pelajaran:** memindahkan lingkup sebuah kunci WAJIB diikuti sensus pembacanya —
   `grep -rn "<key>"` di seluruh `migration/src`, bukan hanya modul pemiliknya.
4. **Gerbang sumber saya sendiri memerah karena perbaikan tipe saya sendiri.**
   `/mlLetterFindings\s*\(/` tidak cocok dengan `mlLetterFindings<MlRow>(` begitu satu
   situs diberi argumen tipe. Itu perilaku yang BENAR dari sebuah gerbang — ia menagih
   janji, bukan mengikuti kode — tetapi regex pemindai sumber harus mengizinkan
   argumen tipe opsional sejak awal: `/nama\s*(?:<[^>]*>)?\s*\(/`.
5. **Dua `(f: any)` baru melewati baseline suppression dan MEMBUKA seluruh berkas**
   (63 error dari satu berkas, bukan 2). Perbaikannya bukan menaikkan baseline
   melainkan mencabut duplikasinya: rantai filter kedua di view digantikan
   `mlLetterSplit` yang mengembalikan isi DAN jumlah yang dibuang sekaligus — yang
   kebetulan juga menutup pola "dua rantai yang bisa berpisah diam-diam" yang
   digerbangi arc ini sendiri.
