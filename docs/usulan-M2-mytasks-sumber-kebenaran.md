# Usulan M2 — satu sumber kebenaran untuk "tugas saya"

> Status: **USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-20 menjawab M2 di [`prompts-perbaikan/04-tasks.md`](prompts-perbaikan/04-tasks.md).
> Bukan PRD (sengaja: nama berkas tak berawalan `prd` agar tak masuk registri status).

## Masalah yang sudah terverifikasi

Ada **dua register** untuk satu pertanyaan pengguna ("apa tugas saya?"), dan keduanya
memberi jawaban berbeda ke **dua arah** — bukan satu subset dari yang lain:

| | `useMyTasks` (klien, [view_mytasks_parts.tsx:85](../migration/src/view_mytasks_parts.tsx)) | `tasks.mine` (server, [router.ts:1157](../server/src/router.ts) + [taskAgg.ts](../server/src/taskAgg.ts)) |
|---|---|---|
| Perikatan | **SATU** — yang sedang aktif (`useAuditHeavy`) | **SEMUA** yang boleh diakses (`accessibleEngagementIds`, W7.5) |
| Sumber | Review Note · Catatan WP · AJE · Siapkan WP · Reviu WP · Deadline · Pribadi | Review Note · Siapkan WP · Reviu WP · Deadline |
| Tenggat | **seluruh `DEADLINES` firma, tanpa filter klien** | ter-scope ke klien dari perikatan yang terjangkau |
| Tugas pribadi | ada (kini `mt.personal`, lingkup pengguna) | tidak ada |

Akibat yang terlihat pengguna: kartu "Tugas Saya" di Beranda menulis "N tugas · M
perikatan", lalu **"Buka penuh"** mendarat di halaman yang bisa memuat **lebih sedikit**
tugas (perikatan lain hilang) **dan sekaligus lebih banyak** (AJE & Catatan WP muncul).
Penulis `taskAgg.ts` sudah mencatat cacatnya sendiri di baris 6–12; yang belum tercatat
adalah arah sebaliknya dan baris "Tenggat" di tabel di atas.

**Temuan tambahan (bukan bagian keputusan, tapi harus ikut ditutup):** `audit.deadlines`
= `D.DEADLINES` apa adanya ([contexts.tsx:1305](../migration/src/contexts.tsx)). My Tasks
karena itu menampilkan tenggat **klien yang tak punya perikatan dengan si auditor** —
persis yang `deriveDeadlineTasks` di server ada untuk mencegah. Ini kebocoran isolasi
kecil (nama klien + jenis pekerjaan + tanggal), bukan sekadar ketidakkonsistenan.
Menghapus `.slice(0, 4)` (M4) tidak memperlebarnya: `DEADLINES` hari ini tepat 4 baris.

## Opsi A — server jadi SSOT; klien hanya memperkaya

`useMyTasks` memanggil `tasks.mine`, lalu menempelkan `mt.meta` (status/bintang/catatan/
subtugas) dan `mt.personal` di atasnya. `taskAgg.ts` diperluas dua sumber yang hari ini
hanya ada di klien.

- **Isolasi W7.5:** menguat. Semua sumber melewati satu gerbang yang sudah teruji negatif
  (`__tests__/task_agg.test.ts`). Kebocoran tenggat di atas tertutup sebagai efek samping.
- **Kelayakan:** `aje` dan `wpState` sudah dokumen StateDoc **berlingkup perikatan**, jadi
  server membacanya dengan pola yang sama persis dengan `reviewNotes` — tak ada mesin
  isolasi baru yang perlu ditemukan.
- **Biaya `mt.meta`:** BESAR jika tak ditangani. Skema id berbeda di dua sisi:

  | | klien sekarang | server sekarang |
  |---|---|---|
  | Review note | `rn-RN-01` | `rn-<engId>-RN-01` |
  | Tenggat | `dl-DL-01` (sesudah M3) | `dl-<indeks>` ← **masih berbasis indeks** |
  | Penugasan KK | `wp-prep-<ref>` / `wp-rev-<ref>` | sama |

  Mengadopsi id server berarti setiap entri `mt.meta` untuk review note & tenggat menjadi
  yatim: centang "selesai", catatan, dan subtugas auditor **hilang tanpa suara**.
- **Waktu yang tepat justru SEKARANG.** M1 baru saja memindahkan `mt.meta` dari lingkup
  firma ke lingkup pengguna, jadi dokumen itu memang dimulai dari nol satu kali. Melakukan
  perubahan skema id di jendela yang sama = nol kehilangan tambahan. Menundanya berarti
  membayar kehilangan yang sama lagi nanti, di atas data yang sudah terkumpul.
- **Prasyarat wajib:** `deriveDeadlineTasks` di server masih memakai `dl-<indeks>`, dan
  indeksnya dihitung **sesudah** `.filter(...)` — sehingga `dl-0` menunjuk tenggat yang
  BERBEDA bagi Junior dan bagi Partner. Cacat M3 yang sama, lebih parah. Ia harus ditutup
  (`DEADLINES[].id` sudah tersedia sejak M3) **sebelum** id server dijadikan kunci `mt.meta`.
  Tidak dikerjakan di PR ini karena `04-tasks.md` melarang menyentuh `taskAgg.ts`.

## Opsi B — klien tetap SSOT; server hanya untuk Beranda

`useMyTasks` diperluas mengagregasi lintas perikatan sendiri, `tasks.mine` dibiarkan
sebagai pembuat ringkasan Beranda.

- **Isolasi W7.5:** melemah. Klien harus memutuskan sendiri perikatan mana yang boleh
  dibaca, sementara `useAuditHeavy` hari ini hanya menghidrasi SATU perikatan. Menghidrasi
  banyak perikatan di klien = memperbanyak permukaan yang harus dipercaya, untuk data yang
  server sudah tahu cara menyaringnya.
- **Biaya `mt.meta`:** kecil — id klien tak berubah.
- **Biaya sebenarnya:** dua register tetap dua register. Setiap sumber tugas baru harus
  ditulis dua kali dan bisa menyimpang lagi. Ini persis pola yang berulang di repo ini
  (dua register peluang, tiga headcount, dua register SKP).

## Rekomendasi

**Opsi A**, dikerjakan sebagai satu arc dua PR:

1. **PR-1** — `taskAgg.ts`: id tenggat stabil (`dl-<DEADLINES[].id>`) + tambah sumber
   `AJE` dan `Catatan WP` per perikatan terjangkau. Uji negatif isolasi diperluas.
2. **PR-2** — `useMyTasks` jadi konsumen `tasks.mine`; `mt.personal` & `mt.meta`
   ditempelkan di klien; tenggat tak lagi dibaca dari `D.DEADLINES` langsung.

Alasan: satu-satunya biaya nyata Opsi A adalah reset `mt.meta`, dan jendela di mana biaya
itu **nol** sedang terbuka sekarang. Opsi B lebih murah minggu ini dan lebih mahal setiap
minggu sesudahnya.

## Yang saya TIDAK putuskan sendiri

- Apakah "Pribadi" kelak ikut ke server (butuh kunci StateDoc baru + kebijakan tulis), atau
  tetap dokumen lingkup-pengguna yang ditempelkan di klien. Usulan di atas mengasumsikan
  yang kedua.
- Apakah reset `mt.meta` perlu diberitahukan ke pengguna (mis. banner sekali-tampil) atau
  cukup dicatat di changelog.
