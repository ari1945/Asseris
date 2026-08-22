# Usulan J — impor buku besar: yang membuat corong JET bisa menyatakan cakupan

> Dibuat 2026-08-22 saat mengerjakan [`prompts-perbaikan/71-jet.md`](prompts-perbaikan/71-jet.md).
> **Status: usulan, belum dikerjakan.** Sengaja TIDAK dibangun dalam PR JET —
> prompt itu melarangnya secara eksplisit, dan alur impor GL adalah pekerjaan
> lintas-lapisan (skema Prisma · tRPC · validasi · UI) yang layak jadi PRD sendiri.

## Mengapa usulan ini ada

Modul `jet` (Journal Entry Testing, SA 240 ¶32) menampilkan corong populasi:
dari berapa jurnal auditor memilih, dan bagaimana ia menyempitkannya. Sampai
PR ini corong itu dibangun dari angka karangan — dua literal populasi identik
untuk setiap perikatan (`18452`, `1240`) plus penambah tetap `+38` pada jumlah
jurnal ter-flag — lalu setiap kartu mencetak "% dari tahap sebelumnya".

PR itu mencabut angka karangannya: seluruh nilai corong kini turunan dari
populasi yang benar-benar dimuat (`AMS_FORENSIC.JOURNAL_POP`, 13 jurnal
ilustratif), dan layar menyatakan bahwa populasi jurnal **entitas** belum ada.

Yang **tidak** diselesaikan PR itu: aplikasi masih tak tahu berapa jurnal yang
dimiliki klien. Selama itu benar, `jet` tidak dapat menjadi dasar kesimpulan
cakupan SA 240 ¶32 — hanya demonstrasi mekanika penyaringan. Tombol
**"Import GL"** di SubBar dihapus karena tidak ada alur di baliknya;
dokumen ini adalah isi tombol itu.

## Yang dibutuhkan

### 1 · Data yang harus masuk (per-perikatan)

Kolom minimum satu baris jurnal, agar kedelapan kriteria `JET_CRITERIA` dapat
dievaluasi dari data alih-alih dari `flags` yang ditulis tangan di seed:

| Kolom | Dipakai oleh | Catatan |
|---|---|---|
| `no` (nomor jurnal) | identitas baris | kunci disposisi `jet.v1` |
| `tanggal` posting | `periodend` | relatif tanggal tutup buku perikatan |
| `jam` posting | `afterhrs`, `weekend` | butuh jam KERJA entitas, bukan asumsi 08–17 |
| `user` penginput | `rareuser` | + frekuensi posting per user (stratifikasi) |
| `akun` D/K + nama | `unusual`, `seldom` | dipetakan ke kode WTB untuk tie-out |
| `nilai` | `round`, `threshold` | butuh ambang otorisasi entitas |
| `sumber` manual/otomatis | pemisahan "jurnal manual" | **inti SA 240 ¶32** — hari ini tak ada |
| `keterangan` | naratif kertas kerja | |

Selain baris jurnal, tiga besaran **tingkat-ekstrak** yang selama ini dikarang:

- jumlah baris & jumlah jurnal seluruh populasi (bukan hanya yang diekstrak);
- periode ekstrak (dari–sampai) dan tanggal ekstraknya;
- total debit/kredit populasi, untuk **tie-out ke neraca saldo** — tanpa ini
  tidak ada yang membuktikan ekstraknya lengkap, dan corong yang berdiri di
  atas ekstrak tak lengkap sama menyesatkannya dengan corong karangan.

### 2 · Parameter entitas yang hari ini diasumsikan diam-diam

Kriteria risiko tidak dapat dievaluasi tanpa nilai-nilai ini, dan semuanya
sekarang tertanam sebagai `flags` di seed — bukan dihitung:

- jam kerja & hari kerja entitas (untuk `afterhrs` / `weekend`);
- kalender hari libur yang berlaku (SKB cuti bersama; lihat catatan regref);
- ambang otorisasi berjenjang (untuk `threshold` — "tepat di bawah ambang");
- definisi "akun jarang dipakai" (untuk `seldom` — perlu frekuensi historis);
- tanggal tutup buku & jendela "dekat tutup buku" (untuk `periodend`).

Selama parameter ini tidak ada, `score()` membaca `flags` yang sudah jadi.
Itu sah untuk populasi ilustratif; ia tidak sah untuk populasi klien.

### 3 · Bentuk teknis

- **Skema**: tabel `JournalEntry` berlingkup `engagementId` + tabel
  `JournalExtract` (metadata ekstrak: periode, jumlah baris, total D/K, hash
  berkas sumber, siapa & kapan mengimpor). Ekstrak bersifat append-only dan
  masuk rantai audit — mengganti populasi setelah disposisi dicatat adalah
  peristiwa yang harus terlihat, bukan penimpaan senyap.
- **tRPC**: `journal.import` (unggah + validasi + tie-out), `journal.list`
  (berhalaman — 13 baris hari ini, puluhan ribu nanti), `journal.summary`
  (besaran corong dihitung SERVER, bukan dengan menarik seluruh populasi ke UI).
- **Validasi masuk**: baris tak seimbang, tanggal di luar periode, akun tak
  dikenal di WTB, dan selisih tie-out — ditolak dengan laporan baris, bukan
  diterima diam-diam.
- **UI**: `jet` menampilkan corong empat tahap yang sudah ada; hanya sumber
  tahap pertama yang berganti dari `JOURNAL_POP` ke ekstrak per-perikatan,
  dan tahap "jurnal manual" yang hari ini tak dapat diturunkan menjadi dapat.

## Konsekuensi bila tidak dikerjakan

1. `jet` tetap L2/L3 (interaktif & persisten) dan tidak akan pernah mencapai
   kertas kerja yang dapat ditandatangani atas dasar cakupan.
2. Populasi tetap SAMA untuk setiap perikatan sementara disposisinya
   engagement-scoped: dua perikatan menguji jurnal identik dan menyimpan
   kesimpulan berbeda. PR JET menyatakan hal ini di layar; ia tidak dapat
   memperbaikinya.
3. Modul `forensic` (Forensic Cash Flow) berbagi populasi yang sama dan
   mewarisi batas yang sama — satu impor menyembuhkan keduanya.

## Ketergantungan & catatan

- Menyentuh `forensic_canon.ts` (populasi bersama) — perubahan apa pun di sana
  harus diuji terhadap `canon_*`/`forensic` sekaligus, bukan `jet` saja.
- Perlu keputusan Ari: apakah impor GL masuk lingkup Asseris, atau ditarik dari
  CoreSys bila entitas memakainya (di situ buku besarnya sudah terstruktur dan
  penanda manual/otomatis sudah ada di sumbernya).
