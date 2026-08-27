# PRD — Penentu Kerangka: SSOT masukan & konsumsi hilir (D1 · D2 · D3)

| Field | Isi |
|---|---|
| Tanggal | 2026-08-27 |
| Pemilik | Ari Widodo |
| Status | In Progress — "Proceed." 2026-08-27; PR-1 & PR-2 selesai & hijau, PR-3..PR-5 belum |
| Modul | `framework` (`migration/src/view_framework.tsx`) |
| Hilir terdampak | `fsgen` · `opinion` · `compmatrix` |
| Prasyarat | Sapuan token warna + gerbang `framework_tokens.test.ts` (selesai, terpisah) |

---

## 1. Problem

Modul Penentu Kerangka memikul mesin keputusan normatif `fwDetermine()` yang
menetapkan kerangka pelaporan (SAK / SAK EP / SAK EMKM) suatu entitas. Header
modul mengklaim mesin ini adalah SSOT yang membuat "klasifikasi konsisten lintas
modul". **Basis kode membantah klaim itu di kedua ujungnya.** Tiga cacat
terverifikasi (2026-08-27, terhadap `origin/master`):

**D1 · SSOT kedua atas identitas & ukuran entitas.**
`FW_PORTFOLIO` ([view_framework.tsx:75](../migration/src/view_framework.tsx#L75))
adalah literal 9 entri yang membayangi `AMS.CLIENTS`. Delapan entri memiliki
`id` yang sama dengan klien nyata, dan **dua di antaranya membantah sumbernya**:

| id | `AMS.CLIENTS` (`data_part1.ts`) | `FW_PORTFOLIO` |
|---|---|---|
| C-031 | PT Bumi Hijau Agrindo | PT Bumi Hijau Agrindo **Tbk** |
| C-063 | PT Graha Properti Investama | PT Graha Properti Investama **Tbk** |

Entri kesembilan (`CMP-071`) tidak ada di `AMS.CLIENTS` sama sekali. Komentar di
atas larik itu menyatakan datanya "disintesis dari CLIENTS" — berkas ini **nol
impor data**, jadi pernyataan itu tidak benar.

Angka `sales`/`capital`-nya juga karangan. Dibandingkan neraca saldo nyata
(`entityFigures()` atas `WTB_BY_ENGAGEMENT`), selisihnya material dan pada satu
kasus **mengubah alasan penetapan**:

| Klien | `FW_PORTFOLIO` | Turunan WTB | Akibat |
|---|---|---|---|
| C-031 | penjualan 740 M | 214,8 M | 3,4× terlalu besar |
| C-047 | penjualan 18 M · modal 6 M | 44,8 M · ekuitas 16,3 M | Gerbang **3** ("UMKM naik karena kompleksitas") → seharusnya gerbang **2** ("entitas besar") |

Kerangka akhir C-047 kebetulan sama (SAK EP), tetapi **dasar penetapan yang
ditampilkan salah** — dan dasar penetapan itulah keluaran audit yang dipakai.

**D2 · Mesin nol-pemanggil.** `fwDetermine` diekspor, tetapi grep se-repo
menemukan **nol importir**. Ia hanya dipakai di dalam berkasnya sendiri.

**D3 · Hilir tak pernah menerima keluarannya.** `window.LINEAGE.framework.down`
([:513](../migration/src/view_framework.tsx#L513)) menjanjikan `fsgen` menerima
"struktur & pengungkapan LK" dan `opinion` menerima "bentuk opini (SA 700/800)".
Ketiga modul hilir **nol kemunculan** string `SAK EP` / `SAK EMKM`; semuanya
mengasumsikan SAK penuh tanpa syarat:

- `view_fsgen` — CALK memaku PSAK 1/24/71/72/73 (di SAK EMKM: pajak tangguhan
  tidak diakui, PSAK 71/72/73 tidak berlaku, hanya 3 laporan).
- `view_opinion` — memaku "SA 700/705/701" (di SAK EMKM: SA 700/**800**, basis
  akuntansi tertentu).
- `view_compmatrix` — cakupan daftar-uji tidak menyempit mengikuti kerangka.

Akibat gabungannya: aplikasi dapat menetapkan SAK EMKM di satu layar lalu
menerbitkan CALK ber-PSAK 73 dan opini SA 700 penyajian wajar di layar lain,
**tanpa satu pun kontradiksi terdeteksi.**

---

## 2. Objective

Membuat penetapan kerangka menjadi keputusan yang **mengikat** — satu mesin,
masukan bersumber kanonik, keluaran yang benar-benar mengubah perilaku modul
hilir — sehingga klaim SSOT di header modul menjadi benar, bukan aspirasi.

Ini objective yang benar karena cacatnya bukan kosmetik: kerangka pelaporan
menentukan bentuk opini (SA 700 vs 800). Sistem yang membiarkan keduanya
berbeda diam-diam menghasilkan kertas kerja yang saling membantah.

---

## 3. Success Criteria (terukur, bukan opini)

| # | Kriteria | Gerbang |
|---|---|---|
| S1 | Nol literal identitas klien di modul framework; nama/sektor/`listed` berasal dari `AMS.CLIENTS` | uji: setiap entri portofolio cocok byte-per-byte dengan `CLIENTS` |
| S2 | `sales`/`capital` turunan `entityFigures()`, bukan literal | uji: mengubah WTB menggerakkan angka portofolio |
| S3 | Perikatan tanpa WTB **tidak** memperoleh angka karangan | uji: `available:false` → status "belum dapat disimpulkan", bukan nilai 0 |
| S4 | Masukan pertimbangan yang belum dijawab ≠ "tidak" | uji: `fiduciary` tak-diketahui pada entitas non-tercatat → mesin menolak menyimpulkan |
| S5 | `fwDetermine` punya ≥1 importir nyata di luar berkasnya | uji: gerbang importir |
| S6 | CALK `fsgen` menyempit mengikuti kerangka | uji: SAK EMKM → nol catatan PSAK 71/72/73, nol pajak tangguhan |
| S7 | Bentuk opini `opinion` mengikuti kerangka | uji: SAK EMKM → SA 700/800, bukan SA 700/705/701 |
| S8 | Kontradiksi lintas-modul mustahil senyap | uji: kerangka X di framework + keluaran kerangka Y di hilir → MERAH |

Setiap gerbang wajib dibuktikan MERAH lewat mutasi sebelum dianggap ada
(pelajaran berulang: gerbang yang belum pernah merah tak membuktikan apa pun).

---

## 4. Scope

1. Modul turunan baru `fw_canon.ts` (tanpa JSX) memuat `fwDetermine`, ambang, dan
   perakit portofolio dari `CLIENTS` + `ENGAGEMENTS` + WTB. `view_framework`
   mengimpor dari sana; ekspor lama dipertahankan sebagai re-export.
2. Semantik **tak-diketahui** yang eksplisit untuk masukan pertimbangan
   (`fiduciary`, `complex`, `elect`) dan untuk figur tanpa WTB.
3. Konsumsi hilir di `fsgen`, `opinion`, `compmatrix`.
4. Gerbang S1–S8.

## 5. Non-Scope

- **Tidak** mengubah pohon keputusan, ambang UMKM (50 M/10 M), atau teks normatif
  mana pun. Regulasinya tetap; hanya sumber angkanya yang berpindah.
- Tidak memindahkan konten referensi ke `kb` (matriks `FW_COMPARE` tetap di modul;
  pemindahannya urusan Gelombang 2 terpisah).
- Tidak menyentuh `window.LINEAGE` sebagai mekanisme (lihat Risiko R3).
- Tidak menambah kerangka keempat (syariah, ISAK 35) — arc terpisah.

## 6. Constraints

- `master` selalu hijau (R-7); pohon kerja saat ini **sudah merah** karena kerja
  sesi lain yang belum selesai — arc ini harus di-branch dari `origin/master`
  yang bersih, bukan dari direktori kerja.
- `AMS.CLIENTS` **tidak** memuat `sales`, `capital`, `fiduciary`, `complex`,
  `elect`. Hanya `listed`, `name`, `industry` yang tersedia.
- WTB hanya ada untuk 7 perikatan; `C-052` (status Proposal) tak punya.
- PP 7/2021 mendefinisikan "modal usaha" sebagai kekayaan bersih **di luar tanah
  & bangunan tempat usaha**. Neraca saldo **tidak memisahkan** tanah/bangunan
  (nol akun demikian) — pengecualian itu tidak terhitung dari data yang ada.

## 7. Existing Solutions

- `entityFigures()` (`canon_base.ts:93`) sudah menjadi SSOT figur entitas dan
  memberi `revenue`, `equity`, dan bendera `available`. **Dipakai, tidak ditulis
  ulang.**
- `WTB_BY_ENGAGEMENT` (`data_wtb_eng.ts`) sudah menyediakan neraca saldo per
  perikatan; `ENG-2025-014` tinggal di `data_part1`. Resolver gabungan perlu
  ditulis (belum ada) — kecil.
- Tidak ada solusi eksternal yang relevan; ini logika domain internal.

## 8. Proposed Approach

**Prinsip: angka dari kanon, pertimbangan dari manusia, dan keduanya dibedakan.**

Kerangka ditentukan oleh dua jenis masukan yang secara mendasar berbeda, dan
cacat D1 lahir karena keduanya diperlakukan sama (literal di larik):

| Jenis | Contoh | Sumber yang benar |
|---|---|---|
| **Fakta terukur** | penjualan tahunan, ekuitas, status tercatat | kanon (`entityFigures`, `CLIENTS.listed`) — turunan, tak dapat disunting |
| **Pertimbangan penilai** | fidusia, kompleksitas transaksi, pilihan naik sukarela | jawaban tersimpan per-klien; **default TAK-DIKETAHUI** |

`fwDetermine` diperluas mengembalikan `fw: null` + `pending: [...]` ketika
sebuah masukan yang **determinatif pada jalur itu** belum dijawab. Contoh
konkret: entitas non-tercatat di industri jasa keuangan tidak boleh diam-diam
diperlakukan "bukan fidusia" hanya karena bidangnya belum diisi — itu jalan
menuju kerangka yang salah tanpa jejak.

Gerbang 1 dan 2 tetap persis seperti sekarang; yang berubah hanyalah bahwa
"belum dijawab" berhenti menyamar sebagai "tidak".

Hilir mengonsumsi lewat satu selektor `frameworkFor(clientId)` sehingga tak ada
modul yang menyimpan salinan keputusan.

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | Portofolio jadi kosong dari SAK EMKM (7 klien nyata semuanya besar) sehingga demo kehilangan satu cabang | Simulator kandidat tetap mendemokan EMKM; **jangan** mengarang klien EMKM untuk mengisi tampilan — itu mengulang D1 |
| R2 | "Modal usaha" ≈ ekuitas adalah **aproksimasi**; PP 7/2021 mengecualikan tanah & bangunan | Pakai ekuitas, **beri label eksplisit di UI** bahwa pengecualian tanah/bangunan tak terpisahkan dari neraca saldo. Aproksimasi yang diungkapkan ≠ angka karangan |
| R3 | `window.LINEAGE` di luar daftar dual-publish sah CLAUDE.md §3.1 | Di luar scope; catat sebagai utang. Jangan campur dengan arc ini |
| R4 | Menyentuh `fsgen`/`opinion` berisiko regresi pada jalur SAK penuh (jalur yang dipakai 7 dari 7 perikatan) | SAK penuh = jalur default; gerbang snapshot pada jalur itu sebelum menyentuhnya |
| R5 | Perubahan `fwDetermine` mengembalikan `null` dapat memutus pemanggil yang mengasumsikan string | Hanya ada satu pemanggil hari ini (D2) — risiko rendah, tutup sekarang selagi murah |

## 10. Implementation Plan

| PR | Isi | Gerbang |
|---|---|---|
| **PR-1** ✅ | `fw_canon.ts`: ekstraksi mesin + resolver WTB gabungan + perakit portofolio dari CLIENTS/ENGAGEMENTS. `view_framework` jadi konsumen. | S1 · S2 · S3 · S5 — **hijau** |
| **PR-2** ✅ | Semantik tak-diketahui (`pending`/`pendingKeys`) + jawaban pertimbangan per-klien (StateDoc firma `framework.judgements.v1`) + label aproksimasi modal usaha. | S4 — **hijau** |
| **PR-3** ✅ | `fsgen` sadar-kerangka: `fwProfile` menyaring rujukan PSAK di CALK; kerangka belum ditetapkan → CALK **menolak terbit**. | S6 — **hijau** |
| **PR-4** ✅ | `opinion` sadar-kerangka: bentuk opini & label standar turunan profil (SA 700·705·701 vs SA 700·800). | S7 — **hijau** |
| **PR-5** ⛔ | **DITARIK — premisnya keliru.** Lihat catatan di bawah. | — |

PR-1 dan PR-2 berdiri sendiri dan sudah menutup D1 + D2. PR-3..PR-5 menutup D3
dan dapat ditunda tanpa membuat PR-1/PR-2 sia-sia.

## 11. Open Questions

> **Terjawab 2026-08-27** — Ari membalas "Proceed." tanpa memilih di antara opsi,
> sehingga rekomendasi PRD ini yang dijalankan: **Q1=(i)** · **Q2=buang CMP-071** ·
> **Q3=C-052 tetap, figur kosong** · **Q4=urut PR-1→PR-5**. Semuanya dapat dibantah
> dan dibalik — jawaban pertimbangan hidup di StateDoc, bukan di kode.

**Q1 — Sumber `fiduciary` / `complex` / `elect`.** Ketiganya pertimbangan
penilai, bukan data. Pilihan:

- **(i) Jawaban tersimpan per-klien, default tak-diketahui** — mesin menolak
  menyimpulkan sampai dijawab. *Rekomendasi saya.* Paling jujur; biayanya, layar
  portofolio akan menampilkan "belum disimpulkan" untuk sebagian klien sampai
  seseorang mengisinya.
- **(ii) Turunkan dari `CLIENTS.industry`** (mis. "Jasa Keuangan" ⇒ fidusia).
  Murah, tetapi **mengarang pertimbangan profesional dari string industri** —
  persis kelas cacat yang sedang ditutup. Tidak saya rekomendasikan.
- **(iii) Pindahkan literalnya ke `CLIENTS`** sebagai field baru. Menghapus SSOT
  kedua tetapi mempertahankan angka karangan sebagai "data". Setengah perbaikan.

**Q2 — `CMP-071`.** Bukan klien nyata. Dibuang dari portofolio (rekomendasi),
atau dipertahankan dengan label eksplisit "ilustrasi, bukan klien"?

**Q3 — `C-052` (Proposal, tanpa WTB).** Tampilkan sebagai "figur belum tersedia"
(rekomendasi), atau keluarkan dari portofolio sampai perikatan berjalan?

**Q4 — Urutan.** Kerjakan PR-1+PR-2 saja dulu (tutup D1+D2, ~1 sesi), atau
lanjut menembus PR-3..PR-5 (tutup D3, lebih besar & menyentuh keluaran audit)?

---

## 12. Temuan yang mengubah rencana — PR-5 ditarik

**PR-5 ("`compmatrix` menyempit mengikuti kerangka") tidak dikerjakan karena
premisnya salah, dan premis itu saya sendiri yang menulisnya.**

Baris D3 di §1 menuduh `view_compmatrix` "cakupan daftar-uji tidak menyempit
mengikuti kerangka". Tuduhan itu diturunkan dari klaim `LINEAGE.framework.down`,
bukan dari membaca modulnya. Setelah dibaca: `view_compmatrix` **nol kemunculan**
`activeClient` / `activeEngagement` / `useFirm` — ia adalah **register cakupan
standar tingkat FIRMA**: SA/PSAK mana yang aplikasi ini liput lewat checklist,
lewat modul fungsional, atau belum sama sekali (`gap`).

Menyempitkannya mengikuti kerangka klien aktif akan menjadi **cacat baru**, bukan
perbaikan:

1. Ia menyembunyikan standar yang tetap wajib diliput firma untuk klien LAIN —
   register kemampuan berubah menjadi daftar berdasarkan siapa yang kebetulan
   sedang dibuka.
2. Ia mengaburkan dua hal yang berbeda: **cakupan aplikasi** (kemampuan firma)
   vs **keberlakuan standar bagi satu entitas** (keluaran penetapan kerangka).
   D1 lahir persis dari mengaburkan dua jenis hal yang berbeda.

Kalau daftar keberlakuan per-entitas memang diinginkan, itu **fitur baru** di
modul Penentu Kerangka (menampilkan `psakAllowed` untuk kerangka yang ditetapkan)
— bukan penyempitan register firma. Butuh PRD tersendiri.

**S8 sebagian tercapai lewat jalan lain.** Kontradiksi lintas-modul kini dijaga
oleh `fw_downstream.test.ts`: konsistensi internal profil (bendera pajak
tangguhan ⟺ daftar-putih PSAK 46; `specialPurpose` ⟺ bentuk opini SA 800) plus
gerbang statik bahwa tiap modul hilir benar-benar memanggil `frameworkFor`.

## 13. Sisa yang diketahui (bukan bagian PR-1..PR-4)

- **Boilerplate opini tersimpan** (`mgmtResp` di `opinionDoc.v1`) masih menyebut
  "Standar Akuntansi Keuangan di Indonesia" tanpa syarat. Teks itu dokumen yang
  DISUNTING pengguna dan tersimpan per perikatan; menulis ulangnya dari kode akan
  menabrak suntingan auditor. Perlu keputusan terpisah: migrasi sekali-jalan, atau
  peringatan saat kerangka dan teks berbeda.
- **Cabang EP/EMKM belum pernah dijalankan data seed.** Ketujuh perikatan seed
  bermuara ke SAK penuh (empat tercatat; sisanya menunggu jawaban pertimbangan),
  jadi jalur EP/EMKM dijaga uji unit + gerbang statik, **bukan** oleh pemakaian
  nyata. Ini disengaja dan dicatat, bukan diabaikan.
- **`window.LINEAGE`** tetap di luar daftar dual-publish sah CLAUDE.md §3.1 (R3).

---

**Sign-off:** ditandai dengan balasan **"Proceed."**
