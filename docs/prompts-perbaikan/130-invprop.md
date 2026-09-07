# Prompt perbaikan — modul `invprop` (PSAK 13 · Properti Investasi)

> Dibuat 2026-08-24 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble, aturan keras 1–9) + B (inti) + adendum C-I (fallback/seed) + C-J + D.
> Gelombang 1, urutan **2**. Skor kedalaman **1,40 / 5** · plafon **L2**.
>
> **Kenapa modul ini dipilih:** berkas view-nya **tidak tersentuh sejak sensus E-9
> (13 Ags)**. Ia satu-satunya kandidat yang klaim lamanya berlaku penuh tanpa perlu
> diragukan — tidak ada arc yang diam-diam sudah menutupnya.
>
> **Catatan pembuat prompt — verifikasi sendiri di `view_invprop.tsx` (186 baris),
> 2026-08-24:**
>
> **1. Empat konstanta literal, dan salah satunya mengaku.** Baris 19–31 mendefinisikan
> `IP_PORTFOLIO`, `IP_ROLL`, `IP_PL`, `IP_SENS`. Komentar di atas `IP_PORTFOLIO`
> berbunyi: *"sub-ledger kanonik modul"*. Itu deklarasi eksplisit tentang SSOT kedua —
> modul ini menyatakan dirinya sumber kebenaran untuk saldo yang sudah punya akun di
> neraca saldo.
>
> **2. Akunnya SUDAH ADA di WTB.** Ini yang mengubah bentuk perbaikan:
>
> ```
> data_wtb_eng.ts:117  ['Aset Tidak Lancar', '1-2600', 'Properti Investasi', 248_000*M, 272_400*M, 0, 'E']
> data_wtb_eng.ts:129  ['Pendapatan', '4-1500', 'Pendapatan Sewa Properti Investasi', -28_400*M, -32_200*M, 0, 'R']
> ```
>
> Jadi pertanyaannya **bukan** "dari mana angkanya seharusnya datang" — akun saldo
> awal, saldo akhir, dan pendapatan sewa ketiganya ada. Modul menampilkan
> `fvSum = 15.748` (jt) sementara WTB mencatat `272.400 × M` untuk akun yang sama.
> Angka itu **membantah neraca saldo perikatan yang sedang dibuka**. Pengeksekusi wajib
> memeriksa satuan `M` sebelum menyimpulkan besaran selisihnya — jangan mengutip angka
> saya, hitung sendiri.
>
> **3. Tie-out yang hanya HIASAN — ini temuan terpenting.** Baris 41 dan 59:
>
> ```
> return { close, fvSum, noi, tie: close === fvSum };
> ...
> <span style={{ color: D.tie ? 'var(--green)' : 'var(--red)' }}>● Roll-forward {D.tie ? 'menutup' : 'selisih'}</span>
> ```
>
> `close` dihitung dari `IP_ROLL`; `fvSum` dijumlahkan dari `IP_PORTFOLIO`. Keduanya
> **konstanta yang disetel tangan** — komentar baris 24 bahkan menuliskan hasilnya
> lebih dulu (`// close = 15.748`). Badge hijau "Roll-forward menutup" karena itu tidak
> merekonsiliasi apa pun; ia menampilkan kesamaan dua literal yang memang dibuat sama.
> Ini persis anti-pola "gerbang tautologis" di template — bedanya, di sini ia bukan
> gerbang uji melainkan **klaim yang dilihat auditor**.
>
> **4. Nol konteks perikatan.** `grep -n "useAudit\|useFirm"` → nol hasil. Modul ini
> menampilkan portofolio yang **identik untuk setiap klien dan setiap perikatan**.
> Nol `useAmsPersist`/`useServerState`, nol `amsExport*`.
>
> **5. Ada kaitan perikatan yang sudah terdaftar.** `data_part1.ts:210` mencatat risiko
> `R63-2` untuk `ENG-2025-063`: *"Nilai wajar properti investasi (PSAK 13) menggunakan
> asumsi kapitalisasi usang"*, WP `E-5`. Jadi tautan modul↔perikatan bukan barang baru
> yang harus diciptakan.
>
> **BATAS YANG SENGAJA SAYA PASANG.** Menjadikan modul ini kertas kerja penuh (isian
> auditor + sign-off + ekspor tersegel) adalah keputusan produk yang sama dengan
> Gelombang 2. Prompt ini berhenti di **menurunkan angka dari sumber kanonik dan
> mencabut klaim rekonsiliasi palsu** — dua hal yang benar apa pun keputusan itu.

---

## Prompt (salin seluruh blok)

```
[Salin BLOK-A dari docs/PROMPT-PERBAIKAN-MODUL.md — preamble tetap, aturan keras 1–9.
Aturan 7 (falsifikasi gerbang) dan aturan 8 (mesin MEMBANTAH, bukan MENGISI) berlaku
penuh; aturan 8 menentukan bentuk perbaikan CACAT-3.]

TUGAS: cabut SSOT kedua di modul invprop (PSAK 13 · Properti Investasi) dan hentikan
klaim rekonsiliasi yang tidak merekonsiliasi apa pun.

KONTEKS MODUL
- id modul: invprop (icons.tsx, grup "Akuntansi (PSAK & SAK)")
- berkas view: migration/src/view_invprop.tsx (186 baris) — TIDAK berbagi dengan
  modul lain
- skor kedalaman: 1,40 / 5 · plafon L2 (interaktif lokal)
- berkas ini TIDAK TERSENTUH sejak 2026-08-13; tak ada arc yang diam-diam menutupinya
- program terkait: E (ledger-based reporting) + pola fallback/seed (adendum C-I)

═══════════════════════════════════════════════════════════════════════
KEADAAN AWAL YANG SUDAH DIVERIFIKASI (2026-08-24) — verifikasi ulang sebelum bertindak
═══════════════════════════════════════════════════════════════════════

CACAT-1 · Sub-ledger privat (P0, SSOT kedua)
  view_invprop.tsx:19-31   IP_PORTFOLIO · IP_ROLL · IP_PL · IP_SENS
  Komentar baris 18 menyebut IP_PORTFOLIO "sub-ledger kanonik modul" — pengakuan
  eksplisit atas SSOT kedua.
  Akun kanoniknya SUDAH ADA di neraca saldo per-perikatan:
    data_wtb_eng.ts:117   '1-2600' Properti Investasi           (saldo awal & akhir)
    data_wtb_eng.ts:129   '4-1500' Pendapatan Sewa Properti Investasi
  PERIKSA SATUAN `M` di data_wtb_eng.ts sebelum membandingkan besaran. Modul bekerja
  dalam Rp juta. Jangan mengutip selisih dari catatan ini — hitung sendiri dan
  laporkan angkanya.

CACAT-2 · Nol konteks perikatan (P0, konsekuensi CACAT-1)
  grep -n "useAudit\|useFirm" view_invprop.tsx  ->  NOL HASIL.
  Portofolio yang sama tampil untuk SETIAP klien dan SETIAP perikatan.
  Tautan perikatan sudah ada preseden: data_part1.ts:210 mendaftarkan risiko R63-2
  (ENG-2025-063, PSAK 13, WP E-5).

CACAT-3 · Tie-out HIASAN (P0, klaim palsu ke auditor)
  view_invprop.tsx:41   return { close, fvSum, noi, tie: close === fvSum };
  view_invprop.tsx:59   badge hijau/merah "● Roll-forward menutup / selisih"
  `close` dari IP_ROLL, `fvSum` dari IP_PORTFOLIO — dua konstanta yang DISETEL agar
  sama (komentar baris 24 menuliskan hasilnya lebih dulu: "// close = 15.748").
  Badge itu tidak merekonsiliasi apa pun. Ia menampilkan kesamaan dua literal.

TIDAK ADA persistensi & TIDAK ADA ekspor (nol hasil useAmsPersist/useServerState/
amsExport). Itu FAKTA, bukan tugasmu — lihat BATAS.

═══════════════════════════════════════════════════════════════════════
LANGKAH
═══════════════════════════════════════════════════════════════════════

1. INVESTIGASI — laporkan sebelum menyentuh kode:
   a. Ketiga cacat masih persis seperti itu? Kalau ada yang tertutup: katakan, berhenti.
   b. Bagaimana modul PSAK tetangga yang SUDAH benar menarik angka dari WTB? Cari
      preseden — `psak16` (Aset Tetap) dan `psak73` (Sewa) adalah kandidat terdekat.
      Grep dulu, tiru jalurnya. JANGAN menciptakan jalur baru kalau sudah ada.
        grep -rn "figuresFromWTB\|wtbRows\|useWtb" migration/src/canon*.ts migration/src/view_psak16.tsx
   c. Akun '1-2600' memberi SALDO. Portofolio per-properti (IP-01/02/03, luas, yield,
      okupansi) TIDAK ADA di WTB — itu detail sub-ledger. Tentukan dan LAPORKAN:
      apakah repo punya sumber untuk detail itu, atau tidak ada sama sekali?
      Jawaban "tidak ada" adalah jawaban yang sah dan menentukan bentuk CACAT-1.
   d. IP_SENS (analisis sensitivitas) adalah hasil PEKERJAAN AUDITOR, bukan data
      entitas. Perlakukan terpisah dari CACAT-1 — lihat aturan keras 8.

2. RENCANA — satu paragraf. Kalau butuh mengubah canon*/skema/kontrak tRPC ->
   BERHENTI, tulis PRD, tunggu "Proceed."

3. GERBANG MERAH — tulis uji yang GAGAL pada kode sekarang, lalu FALSIFIKASI
   (`git stash` -> harus merah -> `git stash pop`). Tempelkan output merahnya.
   Yang harus dipaku:
     · UBAH saldo akun '1-2600' di neraca saldo -> angka yang ditampilkan invprop
       IKUT BERGERAK sebesar itu. Ini gerbang utamanya.
     · Buka modul pada DUA perikatan berbeda -> angkanya BERBEDA.
     · Badge roll-forward BISA MERAH: rakit keadaan di mana roll-forward memang tidak
       menutup, dan buktikan badge-nya berubah. Kalau setelah perbaikan badge itu
       masih tidak mungkin merah, ia tetap hiasan — CABUT badge-nya.
   ⛔ JANGAN membuat gerbang nol-delta aljabar: menguji `A == A` dengan dua nama
      berbeda adalah hiasan, bukan rekonsiliasi. Kalau kedua sisi rekonsiliasimu
      memanggil mesin yang sama, gerbangmu tautologis.
   ⛔ JANGAN merakit RegExp dari string di dalam uji (aturan keras 7).
   ⚠ Sebagian mesin repo ini JATUH KE SINGLETON bila diberi larik kosong (mis.
     `wtbRows([])`). "Membuktikan ketiadaan" lewat masukan kosong bisa MENGULANG
     cacatnya alih-alih menangkapnya. Larik kosong juga truthy.

4. IMPLEMENTASI — sekecil mungkin.
   Untuk detail yang TIDAK punya sumber kanonik (portofolio per-properti, sensitivitas):
   terapkan aturan keras 8 — mesin MEMBANTAH, bukan MENGISI. Panel kosong + kontrol
   pengisinya, atau pernyataan eksplisit bahwa datanya belum ada. JANGAN memindahkan
   literal itu ke berkas data lain — itu hanya memindahkan karangan, bukan mencabutnya.
   ⚠ Mencabut data karangan tanpa menambah kontrol pengisinya akan menukar data
     karangan menjadi panel MATI. Kalau menambah kontrol berarti melewati BATAS di
     bawah, katakan dan berhenti di situ.

5. VERIFIKASI — `npm run verify` dari root. Tempelkan output. Jangan pipe ke `tail`.

6. LAPORAN — format tetap, plus: selisih nyata antara angka modul dan akun '1-2600'
   (dengan satuan yang benar), dan detail mana yang ternyata tak punya sumber kanonik.

═══════════════════════════════════════════════════════════════════════
⛔ BATAS DAN LARANGAN
═══════════════════════════════════════════════════════════════════════

1. ⛔ JANGAN menambah sign-off, ekspor tersegel, atau alur kertas kerja penuh.
   Itu keputusan produk Gelombang 2 dan bukan milikmu. Persistensi engagement-scope
   BOLEH bila — dan hanya bila — ia diperlukan agar kontrol pengisi di Langkah 4
   berfungsi; kalau kamu memakainya, key WAJIB engagement-scope dan disertai uji
   isolasi dua perikatan.
2. ⛔ JANGAN memindahkan IP_PORTFOLIO ke data_*.ts lalu menyebutnya selesai.
   Memindahkan karangan bukan mencabut karangan.
3. ⛔ JANGAN mengarang angka pengganti untuk detail yang tak punya sumber. Kalau
   butuh data yang tidak ada di repo — BERHENTI dan tanya (aturan keras 5).
4. ⛔ JANGAN mempertahankan badge tie-out yang tidak bisa merah.
5. ⛔ JANGAN menyentuh modul PSAK lain. Berkas ini tidak berbagi.

[Tempel ADENDUM C-I dan C-J dari BLOK-C template, lalu BLOK-D definisi selesai.]

TAMBAHAN untuk definisi selesai:
[ ] Angka properti investasi bergerak saat saldo akun '1-2600' berubah — dibuktikan uji.
[ ] Dua perikatan berbeda menampilkan angka berbeda — dibuktikan uji.
[ ] Badge roll-forward BISA merah, dibuktikan uji; atau badge-nya dicabut.
[ ] Nol literal besaran tersisa di view untuk angka yang punya akun kanonik.
[ ] Detail tanpa sumber kanonik: panel kosong/membantah + kontrol, ATAU dilaporkan
    sebagai blokir — TIDAK dibiarkan sebagai literal, TIDAK dipindahkan ke berkas lain.
```
