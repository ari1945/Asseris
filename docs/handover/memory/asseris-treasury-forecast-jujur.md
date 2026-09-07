---
name: asseris-treasury-forecast-jujur
description: "Arc treasury 2026-08-22 (PR #287) — pengungkapan basis forecast, ambang kebijakan likuiditas keluar dari JSX, label periode ikut klok SSOT tanpa berbohong, baris anggaran jadi tombol."
metadata: 
  node_type: memory
  type: project
  originSessionId: c2237051-e2ab-49be-999c-144cfdf03cbf
  modified: 2026-08-22T15:45:45.583Z
---

**MENDARAT** sebagai `77dba9b` (PR #287, squash, 2026-08-22; CI 9/9 setelah rebase ke `dc1d2d5`).
Cabang & worktree sudah dibuang.
Spesifikasi: `docs/prompts-perbaikan/31-treasury.md` (TR1–TR5). Worktree `.claude/worktrees/treasury-jujur`.

## Yang paling berharga dari arc ini

**Modul terbelah rapi di garis tab, dan itu harus dinyatakan sebelum menulis kode.**
`view_firmtreasury` tab "Anggaran vs Aktual" SUDAH berbasis buku besar (`FIRMFIN.budget({coa})`);
tab "Forecast Arus Kas" seluruhnya seed. Prompt menuntut jawaban itu dulu — dan memang benar:
tanpa memisahkannya, mudah sekali "memperbaiki" sisi yang sudah benar.

**Memperbaiki label periode bisa melahirkan kebohongan KEDUA.** Bentuk lama `r.m + ' 2026'`
tak pernah bergulir. Tetapi menempelkan tahun klok ke bulan seed akan melabeli angka Maret
sebagai "September" begitu klok bergerak enam bulan — lebih halus dan lebih berbahaya.
Aturan yang dipakai: bulan seed cocok bulan klok → label = bulan + tahun klok; TIDAK cocok →
label tanpa tahun + pita merah yang menyebut kedua sisi. Ketidakcocokan itu KABAR, bukan
hal yang ditutup.

**Ambang kebijakan yang dipindahkan bukan berarti dijelaskan.** `7000` × 4 di JSX → satu
`FIRM_CASH_POLICY` di `data_firmfin` (rumah yang sama dengan `WIP_WRITEOFF_APPROVAL_MIN`).
`basis` sengaja KOSONG + `open` menyebut tiga pertanyaan yang belum dijawab — pola yang sama
dengan `verified:false` regref. Menuliskan alasan yang masuk akal membuat angka tanpa dasar
TERDENGAR berdasar; itu lebih buruk daripada mengaku belum punya dasar.
Satuan juta DITURUNKAN (`cashWatchFloorJt()`), tidak diketik terpisah — kalau tidak, ia jadi
sumber kedua yang bisa menyimpang.

**Jalur amber DORMAN pada data hari ini** (saldo terendah 9.045 jt > ambang 7.000 jt), jadi
gerbang "keempat penanda bergerak bersama" WAJIB menaikkan kebijakan (12 M) untuk menguji
apa pun. Uji yang tidak menyebut premis dorman ini akan tampak membuktikan sesuatu yang
sebenarnya tidak diuji.

**Usulan yang saya berhenti di situ:** 7 M ÷ rata-rata arus keluar 2.196,7 jt = **3,2 bulan
beban**. Bentuk usulan: `watchFloor = n × beban operasi bulanan rata-rata dari buku besar`.
Menunggu keputusan Ari.

## Gerbang & pola

- Gerbang sumber DIBATASI pada rentang satu modul (awal berkas → `function CashBank()`),
  karena satu berkas memuat tiga modul. Utang tetangga (2 `<tr onClick>`, 1 literal nama
  firma, 1 `#fff`) DIPAKU sebagai assertion angka — kalau dibereskan, uji merah dan yang
  benar menurunkan angkanya, bukan melonggarkan gerbang.
- Regex tahun: `\b20\d{2}\b` **MELEWATKAN `FY2025`** (tak ada batas-kata antara `Y` dan `2`).
  Pakai lookaround `(?<![0-9])20\d{2}(?![0-9])` — di situlah tahun anggaran bersembunyi.
- Gerbang BENTUK deret berjalan (`akhir n == awal n+1`) ditulis agar TIDAK bergantung pada
  angka seed, supaya tetap hijau setelah PR-6 mengganti sumbernya.
- Baris tabel yang bisa ditekan: pola `view_firmrevenue` — `<button>` di dalam sel dengan
  `aria-expanded`, BUKAN `<tr tabIndex role=button>`. Cincin fokus `:focus-visible` wajib.

## GOTCHA lingkungan (terulang lagi, biaya ~15 menit)

Klien Prisma bersama dipanggang ulang oleh sesi lain (`worktrees/datenow`) DI TENGAH run
`npm run verify` saya ⇒ 19 uji backend merah dengan `table main.Firm does not exist`
(globalSetup mendorong skema ke `test.db` worktree saya, klien membaca milik worktree lain).
Cek pemiliknya: `grep -ao "Audit System[^\"']*schema.prisma" server/node_modules/.prisma/client/index.js`.
Lihat [[asseris-cashbank-kurs-masa-berlaku]] dan [[asseris-prisma-client-worktree-trap]].
