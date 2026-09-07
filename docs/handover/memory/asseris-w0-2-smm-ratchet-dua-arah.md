---
name: asseris-w0-2-smm-ratchet-dua-arah
description: "W0-2 (#320) — ratchet klok memerah karena pemakaian DIHAPUS; dan test.db 0-byte milik worktree lain yang menyamar sebagai cacat backend"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1da77137-1746-4bbd-a566-441db42c1dba
  modified: 2026-08-27T16:12:20.027Z
---

**W0-2 MENDARAT: PR #320 squash-merge `7ae8d68` (2026-08-27).** Rebase
`--onto origin/master` dari merge-base `1b32c7f` ke `62593c4`; nol konflik tekstual;
9/9 cek PR hijau. Kesembilan blob TERBUKTI identik di master, cabang remote+lokal+worktree
sudah dihapus. Di jam yang sama W0-1 newdisc mendarat sebagai #321 `a6f4f74`.
Isi: `canon_smm_period.ts` mencabut `CPE_REQ.year` (tahun kewajiban PPL) sebagai tahun
atestasi SOQM di tiga view. Lihat [[asseris-w0-pendaratan-urutan]].

## 1 · Ratchet bisa memerah karena kamu MENGHAPUS, bukan menambah

`clock_ssot.test.ts` (lahir di master lewat #281, **sesudah** merge-base cabang)
menyimpan izin `new Date()` **beserta JUMLAH yang tepat**. Cabang ini mencabut
`new Date().getFullYear()` dari `canon_firm_attest.ts` ⇒ `izin 1, nyata 0` ⇒ MERAH.

**Ini kelas tabrakan yang rebase tak bisa lihat**: nol konflik tekstual, gerbangnya
lahir di berkas yang cabang tak pernah sentuh. Satu-satunya yang menangkap: menjalankan
gerbang penuh sesudah rebase. "Rebase bersih" TIDAK berarti "kompatibel dengan master".

Resolusinya: **cabut entri izinnya**, jangan setel `n: 0` (entri mati). Preseden ada di
berkas yang sama — `diagnostics_panel.tsx` DICABUT, lengkap dengan alasan tertulis.
Arahnya mengencangkan gerbang, jadi ia boleh melewati larangan "jangan sentuh berkas di
luar delapan berkas cabang" — nyatakan terbuka di deskripsi PR.

Pemindainya mencocokkan `new\s+Date\s*\(\s*\)` — **tanpa argumen**. `new Date(Date.UTC(…))`
sebagai penolak tanggal-bukan-kalender TIDAK terjaring, jadi tak perlu izin baru.

## 2 · `test.db` 0-byte milik worktree lain menyamar sebagai cacat backend

Gejala: 19 uji backend gagal `The table 'main.StateDoc' does not exist in the current
database` — padahal PR menyentuh **nol** berkas `server/`.

Sebab: perluasan [[asseris-prisma-client-worktree-trap]]. Sesi lain (`w0-hcm`) menjalankan
`prisma generate` dari worktree-nya; `server/node_modules` dibagi, jadi klien saya membuka
`w0-hcm/server/prisma/test.db` — yang saat itu **0 byte** karena `globalSetup` sesi itu
sedang mereset-nya pada detik yang sama.

**Bukti yang menutup kasus dalam dua perintah** (bukan dugaan):
```
grep -ao "sourceFilePath[^,]*" server/node_modules/.prisma/client/index.js
ls -la .claude/worktrees/<lain>/server/prisma/test.db      # 0 byte ⇒ balapan, bukan cacat
```
Cek proses dulu sebelum memanggang ulang — memanggang saat sesi lain sedang jalan akan
MERUSAK gerbang mereka di tengah jalan:
```
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match '<worktree-lain>' }
```
Tunggu sampai nol, baru `npm run verify` (langkah 1-nya memanggang ulang sendiri).
Sesudah selesai: `cd <pohon-utama>/server && npx prisma generate`.

## 3 · Catatan sensus lama yang SALAH, terkoreksi

Memori sebelumnya menyebut cabang ini "mencabut fallback `new Date().getFullYear()`"
dari ketiga view. **Tidak akurat** — `getFullYear` nol hasil di ketiga view pada master.
Ia ada satu lapis di bawah, di dalam `attestYear()` sebagai fallback-dari-fallback.
Ketergantungan nyata di ketiga view adalah `CPE_REQ.year`. Prompt W0-2 sudah memperingatkan
ini; verifikasi sendiri, jangan mewarisi rumusan lama.

## 4 · Urutan yang masih mengikat

**W0-4 (`fix/regref-tahap-a2`) HARUS menyusul #320.** R1 mengubah `CPE_REQ` jadi
multi-record; bila ia lebih dulu, `(AD.CPE_REQ || {}).year` jadi `undefined` di tiga view
dan **tak satu pun gerbang memerah** — `attestKeyFor` menerima `undefined`, `attestYear`
diam-diam jatuh ke tahun berjalan. #320 melepaskan ketiga view dari ketergantungan itu.
`data_part4.ts` bersinggungan; itu konflik yang regref selesaikan sesudah #320 mendarat.
