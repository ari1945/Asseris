# Usulan — nama kolega nyata di dalam DATA SEED Surat Manajemen

| | |
|---|---|
| Status | **Diputuskan — Opsi C, dilaksanakan** (Ari, 2026-08-24) |
| Tanggal | 2026-08-24 |
| Asal | Arc perbaikan modul `mgmtletter` (batas 1 prompt: seed TIDAK disentuh) |
| Terkait | `migration/src/view_final3.tsx` baris 24, 48, 71, 83, 111, 112, 122, 127, 132, 138 |

## Yang sudah selesai (bukan bagian usulan ini)

Tiga situs tulis-HIDUP di `view_final3.tsx` sudah dicabut: catatan diskusi dan
keputusan atas temuan kini beratribusi pada identitas **sesi**, dan tanpa sesi
aksi tulisnya tidak dijalankan sama sekali. Digerbangi
`migration/src/mgmtletter_attribution.test.ts`.

## Yang diusulkan

Sepuluh kemunculan `'Linda Wijaya'` yang tersisa ada di dalam
`ML_FINDINGS_SEED` dan `ML_DISCUSSIONS_SEED` — data ilustratif yang menjadi
isi awal modul untuk setiap perikatan yang belum pernah disunting.

Kelas masalahnya berbeda dari cacat yang baru ditutup, tetapi tidak nol:

1. **Nama itu milik orang yang nyata di roster firma.** `AMS.STAFF` memuat
   Linda Wijaya. Seed membuat sepuluh pernyataan — termasuk empat *keputusan*
   ("KEPUTUSAN: Masuk Final ML", "KEPUTUSAN: TUNTAS") — atas namanya, pada
   perikatan mana pun yang dibuka. Ini kelas yang sama dengan cacat yang baru
   dicabut; yang berbeda hanya jalur masuknya (seed, bukan tombol).
2. **Ia tidak dapat dibedakan dari jejak nyata setelah tersimpan.** Begitu
   pengguna menyunting satu temuan, seluruh dokumen (termasuk sembilan baris
   seed lain) tertulis ke StateDoc perikatan itu sebagai kertas kerja.
   Tidak ada penanda "ilustratif" pada barisnya.
3. **Ia masuk ke surat yang diekspor.** `decisionBy` tampil pada panel
   keputusan, dan utas diskusi ikut ke jejak; ekspor PDF tersegel dibangun dari
   `findings` yang sama.

## Pilihan

| Opsi | Konsekuensi |
|---|---|
| **A — biarkan** | Demo tetap kaya. Risiko: pernyataan atas nama kolega nyata bertahan di kertas kerja setiap perikatan. |
| **B — kosongkan `decisionBy`/`who` di seed** | Modul dibuka dengan temuan tanpa pemutus. Jujur, tetapi panel keputusan jadi "—" dan nilai demonstrasinya turun. |
| **C — beri penanda `illustrative: true`** | Baris seed dirender dengan pita "Contoh — belum ada keputusan nyata" dan DIKECUALIKAN dari ekspor sampai disunting. Paling banyak pekerjaan; paling tidak menyesatkan. |

Preseden repo condong ke **C** (pola "risiko ilustratif" SMM, arc 8a-2).

## Keputusan & pelaksanaan

**Ari memilih Opsi C (2026-08-24).** Terlaksana pada commit yang sama dengan dokumen
ini:

- Penanda dipasang di **satu tempat** — `mlMarkIllustrative` / `mlMarkIllustrativeThreads`
  membungkus deklarasi `ML_FINDINGS_SEED` / `ML_DISCUSSIONS_SEED`. **Isi seed tidak
  disentuh sama sekali**; yang berubah hanya statusnya, dan baris seed baru ikut
  tertandai tanpa perlu diingat. Gerbang menolak penanda yang disulam per-objek.
- Penanda **terlihat**: pita penjelas pada badan temuan, lencana "Contoh" pada kartu
  daftar, dan baris keterangan pada catatan diskusi peraga.
- Baris bertanda **dikecualikan dari surat dan dari ekspor**, lewat SATU saringan
  (`mlLetterFindings`) yang dipakai keduanya — bukan dua rantai filter yang bisa
  berpisah diam-diam. Tombol ekspor terkunci dengan alasan yang terbaca, dan surat
  yang kosong **menjelaskan sebabnya** alih-alih diam.
- Penanda **hilang** begitu baris benar-benar disunting atau diputuskan manusia
  (`mlClearIllustrative` di kedua situs tulis); field-nya dihapus, bukan disetel
  `false`, supaya bentuk baris nyata identik dengan baris yang tak pernah bertanda.

Cakupan ternyata **lebih luas dari 10 situs** yang disebut prompt: seed juga menyebut
`Rudi Gunawan (Partner)` (2 keputusan) dan `Citra Halim`, plus nama pihak klien.
Pembungkus menandai ketujuh temuan dan seluruh 24 catatan diskusi, jadi seluruhnya
tercakup — bukan hanya nama yang kebetulan di-grep.

### Konsekuensi yang ditemukan saat pelaksanaan

`view_presentasi.tsx` — **dek yang dipresentasikan kepada klien** — membaca kunci yang
sama dan karenanya akan menayangkan temuan peraga sebagai fakta. Dua hal diperbaiki di
sana: (a) ia membaca alamat **tak-berlingkup** (`prLoadLS('mgmtletter.findings.v2')`),
yang sejak W6 tak pernah ditulis siapa pun sehingga dek itu diam-diam memakai seed pada
SETIAP perikatan — kini mengikuti alamat berlingkup perikatan seperti `opinionDoc` di
baris bawahnya; (b) baris peraga dibuang sebelum dek dirakit.

## Catatan lain yang ditemukan, di luar lingkup

- `view_opinion.tsx:138, 161, 448` menulis nama firma harfiah — cacat identik
  dengan ML-4 yang baru ditutup di `view_final3.tsx`, di dokumen yang lebih
  penting lagi (laporan auditor).
- `view_final3.tsx:391` masih memakai hex harfiah `#0c2430` pada garis kop
  surat; kertas surat secara keseluruhan memakai belasan hex harfiah
  (`#16242c`, `#7a8893`, `#e7eaef`, …). Menyapunya adalah pekerjaan desain
  tersendiri, bukan bagian perbaikan atribusi.
- Catatan diskusi bersuara KLIEN tersimpan sebagai `who: 'Wakil Klien'` —
  label peran, bukan nama karangan, jadi tidak dicabut. Tetapi **perekamnya**
  (auditor sesi yang mengetik) tidak tercatat di mana pun pada baris itu.
  Menambah field `by` bersifat aditif dan kompatibel-mundur; perlu keputusan.
