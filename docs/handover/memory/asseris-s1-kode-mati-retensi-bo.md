---
name: asseris-s1-kode-mati-retensi-bo
description: "PR #293 (CI 9/9, menunggu merge) mencabut RecordsRetentionLegacy + RETENTION_POLICY — konflik SEMANTIK dengan #292 yang tak terlihat `mergeable`, gerbang regex yang LOLOS VAKUM karena heredoc memakan backslash, dan resep bootstrap worktree yang tidak meracuni klien Prisma pohon utama"
metadata: 
  node_type: memory
  type: project
  originSessionId: fba2d128-ed16-40de-801a-b69fcabd6b8b
  modified: 2026-08-23T05:48:26.677Z
---

Arc S1 (2026-08-23, worktree `elated-meitner-15b58b`, cabang
`claude/elated-meitner-15b58b`): mencabut `RecordsRetentionLegacy()`
(`view_bo1.tsx`, 140 baris) + `RETENTION_POLICY` (`data_backoffice.ts`) —
tabel kebijakan retensi KEDUA yang menduplikasi `RETENTION_CLASSES` SSOT di
`data_records.ts`. Gerbang baru: `migration/src/backoffice_retention_dead_code.test.ts`
(11 uji). **PR #293 (`cb0e0e9`), CI 9/9 hijau, mergeState CLEAN — MENUNGGU MERGE.**
Di-rebase ke `origin/master` `5833ad3`. Lanjutan dari [[asseris-sa230-arsip-siklus-hidup]].

**KONFLIK SEMANTIK yang tak terlihat `mergeable`.** Master bergerak dua commit di
tengah kerja: #291 (`13d7493`) lalu #292 (`5833ad3`). **#292 mencabut pembaca
produksi TERAKHIR `BO.ARCHIVES`/`BO.LEGAL_HOLDS`** (`view_firmops.tsx`,
`data_firmops.ts`), sehingga premis prompt "keduanya MASIH HIDUP" jadi SALAH dan
dua asersi positif gerbang saya jadi merah. Rebase-nya BERSIH secara tekstual —
nol penanda konflik. Jawaban yang benar BUKAN ikut mencabut keduanya: gerbang #292
(`archive_register_ssot.test.ts`) MEMBACA `BO.ARCHIVES` untuk membuktikan register
statis itu menyimpang dari kanon, jadi mencabutnya sekarang MEMBUTAKAN gerbang itu.
Asersinya diubah jadi "tetap ADA pada objek BO"; invarian "tak boleh dibaca
produksi" diserahkan ke #292 tanpa duplikasi. **POLA: sebelum menghapus simbol,
periksa apakah ada gerbang yang memakainya sebagai FIXTURE.**
Sepupu: [[asseris-merge-antrean-2026-08-23]].

**GOTCHA TERBESAR — gerbang yang LOLOS VAKUM.** Menulis berkas uji lewat
heredoc tool Bash (`<<'TSEOF'`, TANDA KUTIP SEKALIPUN) **memakan satu
backslash dari pasangan `\\`**: `new RegExp('\\b' + sym + '\\b')` mendarat di
disk sebagai `new RegExp('\b' + sym + '\b')` — dan `'\b'` di JS adalah
karakter BACKSPACE (U+0008), bukan batas-kata. Regexnya jadi
`/<BS>RecordsRetentionLegacy<BS>/` yang tak pernah cocok, sehingga uji utama
**hijau di atas pohon yang masih membawa kode matinya**. `cat -A` TIDAK
menolong di sini: ia menampilkan `\b` (dua karakter sumber), bukan `^H` —
byte 0x08 baru lahir saat JS mem-parse escape-nya. Varian sepupu tercatat di
[[asseris-sa230-arsip-siklus-hidup]] dan [[asseris-repo-hygiene-2026-08-19]].
**Pelajaran operasional:** (1) tulis TS ber-regex lewat Python/Write, bukan
heredoc Bash; (2) lebih baik hindari `\\` sama sekali — di sini
`expect(src).not.toContain(sym)` menggantikan `new RegExp` dan justru lebih
ketat; (3) **JANGAN percaya gerbang yang belum pernah dilihat MERAH** —
falsifikasi wajib: `git show HEAD:<berkas> > <berkas>`, jalankan uji (harus
merah), lalu pulihkan. Di sini falsifikasi naik dari 3 merah → 5 merah dan
justru itulah yang membongkar cacatnya.

**Bootstrap worktree tanpa meracuni pohon utama.** Worktree lahir tanpa
`node_modules` sama sekali. Resep yang dipakai:
`cmd /c mklink /J` (lewat PowerShell, BUKAN Git Bash — lihat
[[asseris-cashbank-kurs-masa-berlaku]]) untuk **root · `migration/` · `e2e/`**,
tapi **`npm ci` NYATA untuk `server/`** (~7 menit, 130 paket). Alasannya:
klien Prisma memanggang DIREKTORI SKEMA asal generasinya, jadi
`server/node_modules` yang dijunction membuat `verify` di worktree
membelokkan `test.db` pohon utama — persis kerusakan yang didokumentasikan
`tools/ensure-prisma-client.mjs` dan [[asseris-prisma-client-worktree-trap]].
⚠ Junction harus dilepas dengan `cmd /c rmdir` sebelum worktree dihapus.

**GOTCHA lama yang berulang lagi:** menghapus kode ber-`:any` MENURUNKAN
hitungan, dan eslint keluar **exit 2** dengan satu baris
"There are suppressions left that do not occur anymore" — `npm run verify`
mencetak `VERIFY FAILED: frontend lint` tanpa satu pun error lint. Obatnya
`npm run lint:any-baseline` (view_bo1.tsx 37 → 27). Sama seperti
[[asseris-diagnostic-atribusi-masukan]] dan
[[asseris-fixedassets-kertas-kerja-rollforward]]. ⚠ Jangan pipe `npm run verify`
ke `tail` — `tail` menelan exit code-nya sehingga kegagalan tampak sukses.

**Belum dikerjakan, sengaja (di luar lingkup prompt):** `ProcurementLegacy`
(view_bo1.tsx:46-158) dan `FacilitiesLegacy` (:165-281) MATI dengan bukti
yang sama persis — tak diekspor, nol referensi selain definisinya. Total
~250 baris. Register arsip statis `ARCHIVES` juga tetap bermasalah (ARC-014
"diarsipkan" 2026-02-28 mendahului tanggal laporannya sendiri 2026-03-20) —
arc terpisah, sengaja tidak dicampur. Akar semuanya: repo nol gerbang
variabel mati (`docs/usulan-S1-gerbang-variabel-mati.md`, masih usulan).
