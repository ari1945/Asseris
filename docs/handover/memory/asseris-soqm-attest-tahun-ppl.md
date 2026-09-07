---
name: asseris-soqm-attest-tahun-ppl
description: "Atestasi SOQM dialamatkan dengan tahun PPL — cacat DORMAN, bukan aktif; dua premis prompt salah; tanpa migrasi (dibuktikan)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 44c77db9-0796-4c0c-9371-0972844c97df
  modified: 2026-08-21T22:12:42.822Z
---

Arc 2026-08-22, commit lokal `5f4da4d` di `claude/fervent-tharp-227ee5` (belum di-push).
`npm run verify` HIJAU (158 berkas / 2825 uji frontend · 30 / 431 backend).

## Cacatnya nyata, tetapi TIDAK seperti yang dilaporkan

Tiga modul memanggil `attestKeyFor('soqmAnnualEval', period, CPE_REQ.year)`. Argumen
ketiga adalah **fallback** — ia HANYA dieksekusi ketika label periode tak memuat empat
digit. Label seed berbunyi `'1 Jan – 31 Des 2025'`, jadi `attestYear` menemukan `2025`
dan tahun PPL **tak pernah dipakai**. Cacatnya **DORMAN**.

Dua klaim prompt yang saya cabut setelah probe:

1. **"Nilainya kebetulan sama hari ini."** Tidak. `CPE_REQ.year = 2026`, tahun evaluasi
   `= 2025` — sudah berselisih satu tahun. Yang menyembunyikannya adalah label yang
   kebetulan bertahun, bukan nilai yang kebetulan sama.
2. **"Sejak PR `fix/regref-tahap-b`, `CPE_REQ` seluruhnya TURUNAN lewat `data_clock.ts`."**
   Tidak ada `data_clock.ts` di `master`; tak ada cabang bernama `fix/regref-tahap-b`.
   Yang ada: cabang LOKAL belum-merge `fix/regref-tahap-a2` (`18bbcc0`) milik sesi lain —
   dan justru komentarnya sudah menyebut cacat ini. Di `master`, `CPE_REQ` masih literal
   `{ annual: 40, structured: 30, unstructuredCap: 10, year: 2026 }`.

**PELAJARAN:** sebelum menerima cerita "sudah diperbaiki di PR X", cek PR X ADA di pohon
yang sedang dikerjakan. Pekerjaan sesi lain bisa hidup hanya di cabang lokal.

Cacat dormannya tetap berbahaya: jalur bangunnya ditulis ketiga modul itu sendiri
(`master.period || 'Tahun Berjalan'`). Begitu `QM_EVAL.period` kosong, alamat melompat
ke jam PPL tanpa suara dan atestasi tersimpan hilang dari pandangan.

## Yang dikerjakan

- `canon_smm_period.ts` (baru): `QM_EVAL` membawa `periodStart`/`periodEnd` ISO. **Label
  manusiawi DAN tahun alamat sama-sama diturunkan dari dua tanggal itu**, sehingga tak
  dapat berselisih — sebelumnya tahun DIURAI dari string tampilan.
- Periode tak dinyatakan ⇒ `year: null`, artefak tak dapat dialamatkan; SOQM mengunci
  penandatanganan. Sentinel `soqmAnnualEval.0000` tetap 4 digit supaya tidak ditolak 403
  SENYAP oleh `/^firmAttest\.soqmAnnualEval\.\d{4}$/` di `server/src/stateAccess.ts`.
- **`attestKeyFor` DIHAPUS** beserta parameter `fallback` pada `attestYear` (kini
  mengembalikan `null`; tak ada lagi `new Date().getFullYear()`). Nol pemanggil produksi
  tersisa. Perakit alamat tunggal: `attestKeyOf(name, year)`.
- Bonus satu keluarga: `evalPeriod.slice(-4)` di Governance mencetak **`'alan'`** untuk
  label `'Tahun Berjalan'` — diganti tahun dari SSOT.

## Tanpa migrasi — DIBUKTIKAN, bukan diasumsikan

Alamat tetap `firmAttest.soqmAnnualEval.2025`, sama seperti sebelum perubahan
(bandingkan `server/src/__tests__/signoff.test.ts:763`). Dibuktikan tiga cara: probe
vitest sebelum menyentuh apa pun · uji `canon_smm_period.test.ts` yang memaku string
alamatnya · request `state.get` nyata di browser → **200**, bukan 403. Jalur label
warisan sengaja mempertahankan perilaku `attestYear` (empat digit PERTAMA, bukan
terakhir) supaya alamat lama tak berpindah untuk label lintas-tahun.

## GOTCHA

- **Parameter fallback = tempat sembunyi.** Nilai salah-domain dapat duduk di sana
  bertahun-tahun tanpa gejala, karena jalurnya hanya hidup di keadaan tepi. Bila tahun
  artefak dapat diturunkan dari data, JANGAN sediakan parameter labelnya sama sekali —
  hapus, jangan dokumentasikan. Lihat juga [[asseris-regref-tahap-a2-sensus]].
- **Alat `Write` menulis LF sementara pohon kerja CRLF** (`core.autocrlf=true`). Berkas
  baru harus dinormalisasi ke CRLF, kalau tidak jangkar `str.replace` Python berisi `\r\n`
  GAGAL pada berkas itu sendiri. Bandingkan [[asseris-profit-isolasi-realisasi]].
- **Uji backend 34–46 merah TANPA satu pun berkas `server/` berubah** = perangkap klien
  Prisma lagi ([[asseris-prisma-client-worktree-trap]]). Detail baru: `vitest.config.ts`
  menetapkan `env: { DATABASE_URL: 'file:./test.db' }`, yang **MENIMPA env proses** — jadi
  menyuntik `DATABASE_URL` absolut dari shell TIDAK bisa dipakai sebagai jalan pintas.
  Satu-satunya perbaikan: `npx prisma generate` dari pohon yang sedang diuji, lalu
  **panggang ulang kembali ke pohon utama sesudahnya** agar sesi lain tak ikut merah.
- **`npm run verify` bisa merah lalu hijau tanpa perubahan kode** karena sesi lain
  menjalankan vitest atas engine Prisma yang sama (junction `node_modules`). Sebelum
  menuduh perubahan sendiri: `Get-CimInstance Win32_Process` cari `vitest`, dan jalankan
  gerbang yang sama pada `git stash -u` untuk memisahkan.
- **Server dev sendiri mencemari basis data.** `dev.db` dan `test.db` berbeda di sini,
  jadi itu bukan sebabnya — tetapi hentikan `preview_start` sebelum menjalankan gerbang.
- `preview_start` di sesi ini **menyajikan worktree yang benar** (beda dengan catatan
  [[asseris-independence-sod-rantai]]). Buktikan dengan `curl http://localhost:<port>/src/<berkas-baru>.ts`
  sebelum percaya apa yang dirender.

Terkait: [[asseris-sc24a-satu-register-skp]] (register PPL) · [[asseris-smm1-smm2-adoption]] ·
[[asseris-sesi-paralel-satu-worktree]].
