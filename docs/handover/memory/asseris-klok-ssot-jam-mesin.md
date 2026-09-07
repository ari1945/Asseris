---
name: asseris-klok-ssot-jam-mesin
description: "Sapuan K-02 lanjutan — 68 stempel `new Date()` pindah ke AMS.TODAY; ada DUA klok yang sah dan salah satunya WAJIB tetap jam nyata"
metadata: 
  node_type: memory
  type: project
  originSessionId: 190bf788-abe4-4692-9d30-c655cef14c31
  modified: 2026-08-22T11:04:43.646Z
---

Arc 2026-08-22, **MENDARAT** di `origin/master` sebagai `98f8859` (PR #281, squash,
CI 9/9 hijau termasuk playwright/axe; cabang & worktree sudah dibersihkan).
Kelanjutan langsung dari [[asseris-jet-corong-populasi]] (J4).

## Temuan struktural: DUA klok, dan keduanya benar

Ini yang hampir membuat saya merusak persetujuan AJE:

| Klok | Untuk apa | Nasib |
|---|---|---|
| **Perikatan** `AMS.TODAY` | Tanggal yang muncul di kertas kerja & harus rekonsiliabel dgn data perikatan | Disapu |
| **Nyata** | Jendela kesegaran yang **divalidasi server** | WAJIB dibiarkan |

`nowStamp()` (`aje_approval.ts`) dipakai tanda tangan AJE **dan** rantai KK, lalu
diperiksa `decisionTimestampError` terhadap `AJE_DECISION_SKEW_MS` (10 menit).
Memindahkannya ke klok perikatan = **server menolak SETIAP keputusan** (skew ~5 bulan).
Pembanding SLA `Date.now()` di `view_aje`/`view_platform` ikut dibiarkan — ia harus
satu klok dengan stempel yang dibandingkannya.
**Pola umum: sebelum menyeragamkan sebuah "klok", cari dulu siapa yang MEMVALIDASI
nilainya terhadap klok lain.**

## Angka & desain

- Sensus benar = **80 situs / 54 berkas** (perkiraan awal saya "±10 modul" berasal
  dari grep sempit atas helper `*Today()` — SALAH, dan saya cabut di laporan).
- 68 dipindah, 12 diizinkan tinggal: stempel **jam-saja** (obrolan, "diputuskan
  pukul …" — tak ada tanggal yang bisa salah), fallback di **modul kanon murni**
  yang tak boleh mengimpor AMS, dan **Wedge MVP** (tak punya dataset perikatan).
- `clock_ssot.ts`: TANGGAL dari `AMS.TODAY`, **JAM tetap nyata** — yang dibekukan
  HARInya, bukan detiknya; membekukan jam meruntuhkan pengurutan log yang memakai
  stempel sebagai kunci. Format dirakit TANGAN (bukan `toLocaleDateString`) supaya
  tak bergeser sehari ikut zona waktu; `amsIsoTs()` menyatakan jam sebagai **UTC**
  agar `slice(0,10)` di hilir selalu tanggal SSOT.
- Payoff paling kasat mata: Beranda `2026-03-31 · lewat 144h` → `· 22h`. SELURUH
  portofolio tadinya tampak lewat tempo, angkanya naik satu tiap hari.

## GOTCHA

- **2.900 uji frontend HIJAU semua saat 68 stempel berubah nilai.** Suite lama tak
  menyentuh kelas ini sama sekali; satu-satunya penahan kambuh adalah gerbang baru.
  Jangan longgarkan `IZIN` tanpa alasan tertulis.
- **Gerbang wajib mengenumerasi berkas DARI DISK.** Pemindai itu menemukan
  `wedge/WedgeApp.tsx` yang grep manual saya lewatkan. `IZIN` disimpan per-berkas
  **dengan JUMLAH** — menambah satu pemakaian di berkas berizin tetap merah.
- **Uji kesetaraan format WAJIB untuk 12 bulan.** Mengganti `toLocaleDateString`
  dengan format tangan diam-diam mengubah teks di ratusan tempat kalau meleset
  satu nama bulan (`Agu` vs `Agt`).
- **`re.finditer(r'^import .*?;[ \t]*$', re.M)` GAGAL pada pohon CRLF** — `\r`
  duduk sebelum `\n`. Pakai lookahead `(?=[ \t\r]*$)` supaya CR tak ikut termakan
  (kalau termakan, sisipan melahirkan CR ganda).
- **Heredoc tool Bash memakan backslash** (lagi) — skrip sapuan harus ditulis lewat
  alat `Write`, dan `chr(92)` dibangun dari kode. Lihat [[asseris-repo-hygiene-2026-08-19]].
- **`gh pr merge --squash --delete-branch` GAGAL di worktree**: "fatal: 'master' is
  already used by worktree at …". Merge-nya SUDAH mendarat di GitHub — yang gagal
  hanya checkout lokal sesudahnya. Cek `gh pr view --json state`, lalu
  `git push origin --delete <branch>` sendiri; jangan ulangi merge-nya.
- **Worktree menolak dihapus** karena proses `vite` masih hidup meski task-nya
  di-stop. Cari dengan `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`
  + filter path, `Stop-Process`, baru hapus. Lalu `npx prisma generate` dari pohon
  utama. Lihat [[asseris-prisma-client-worktree-trap]].
- `preview_start` tak bisa menyajikan worktree — jalankan `npx vite --port 5186`
  sendiri lalu `preview_start {url}`; dan HENTIKAN semua server sebelum `verify`
  (lihat [[asseris-jet-corong-populasi]]).

## Ditemukan, TIDAK dikerjakan

1. **Tanda tangan KK lewat UI gagal pemeriksaan integritasnya sendiri.**
   `wp_signoff.sign()` menulis `at` = `'09 Mar 2026'`; `parseStamp` hanya membaca
   ISO dan `'YYYY-MM-DD HH:MM'` ⇒ `decisionTimestampError` → `missing-timestamp`.
   `byUserId` juga tak ditulis ⇒ `signature-missing-identity`. **Cacat lama, tak
   berubah oleh PR ini** (kedua format sama-sama tak terbaca) — tapi artinya SETIAP
   tanda tangan KK dari layar ditandai cacat. Kandidat PR berikutnya, terasa lebih
   serius daripada yang baru diperbaiki.
2. **`Date.now()`** = kelas ketiga, belum digerbangi. Mayoritas sah (pembangkit id
   + klok-nyata di atas), jadi perlu keputusan Ari sebelum gerbang diperluas.
