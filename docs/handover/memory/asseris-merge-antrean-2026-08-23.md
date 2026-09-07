---
name: asseris-merge-antrean-2026-08-23
description: Menutup antrean lima PR dalam satu sesi — CI PR yang BASI, dan dua arc yang menutup cacat yang sama sehingga konfliknya semantik, bukan tekstual
metadata:
  type: project
---

2026-08-23: lima PR mendarat berurutan, `origin/master` `77dba9b` -> **`d553947`**,
**nol PR terbuka**, CI master hijau di keempat workflow (CI · e2e · deploy-smoke ·
dependency-audit). Urutan: #290 -> #289 -> #288 -> #286 -> #276.

## PELAJARAN UTAMA — "PR hijau" bukan "aman di-merge"
CI sebuah PR membuktikan kombinasi **pada saat ia berjalan**. Begitu PR lain
mendarat, hijau itu BASI, dan `mergeable: CLEAN` dari GitHub hanya berarti "tak ada
konflik tekstual" — bukan "gerbangnya masih lolos". Risikonya konkret di repo ini:
#290 menambah gerbang sumber **repo-lebar** (`firm_identity.test.ts`), dan tiga PR
sama-sama menyentuh `eslint-suppressions.json` + `clock_ssot.test.ts`.

RESEP: `gh pr update-branch <n>` -> tunggu CI-nya -> baru merge -> lalu tunggu
KEEMPAT workflow master selesai (`gh run watch <id> --exit-status`), bukan berhenti
saat masih `queued`. Ini yang menjaga R-7 (master selalu hijau).

## Konflik #276 adalah konflik SEMANTIK, bukan tekstual
`gh pr update-branch 276` menolak. Sebabnya: **dua arc menutup cacat yang SAMA**
secara terpisah — "penolakan tulisan server tak terlihat":
- #276: `writeFailureKind(err) === 'rejected'` + event `ams:write-rejected`
- #284/#285 (sudah di master): `isRejected(err)` + event `ams:rejected`

Resolusi: `contexts.tsx` diambil **utuh dari master** (lebih lengkap: kunci personal
lewat `personal.get` — `state.get` MENOLAKNYA sehingga satu pembaca untuk keduanya
gagal DIAM; pemulihan ke nilai awal bila dokumen belum pernah ada; kalimat penolakan
server; **401 sengaja dikecualikan** karena sesi kedaluwarsa bersifat sementara).
`view_people.tsx` diambil dari #276 (kerja SoD), perubahan klok-SSOT master di berkas
sama dipertahankan, impor `amsDateShortId` yang jadi mati dibuang.

**GOTCHA BESAR:** penggabungan otomatis git menghasilkan `const cardRejected` **GANDA**
di `ConflictToaster` — dua deklarasi, TANPA penanda konflik. Auto-merge yang "berhasil"
di sekitar hunk yang konflik tetap bisa melahirkan kode yang tak dapat dikompilasi.
Selalu baca region di SEKITAR konflik, bukan hanya hunk-nya.

## Uji yang memaku implementasi yang tergantikan
`write_rejection_visible.test.ts` (#276) adalah gerbang SUMBER atas `contexts.tsx`
yang memaku implementasi #276. Sesudah mengambil versi master ia jadi salah sasaran.
Jawaban yang benar bukan menghapusnya (master TAK punya gerbang sumber atas cabang
penolakan di `flush()`) melainkan **mengarahkan ulang** assertionnya. Satu assertion
dicabut karena tak dapat dijaga: keberadaan cabang "offline" hanya terlihat dari
KOMENTARNYA, sementara helper `kode()` membuang komentar.

`api.ts` kini memuat DUA klasifikator (`writeFailureKind` dan `isRejected`) yang
berbeda pada 401 — perbedaan itu ditulis eksplisit di header supaya menukar salah
satunya tidak mengubah perilaku diam-diam.

## Membuktikan cabang aman dihapus SESUDAH squash-merge
`git merge-base --is-ancestor` **selalu bilang BELUM** untuk cabang yang di-squash —
SHA-nya memang tak pernah jadi leluhur. `git diff origin/master origin/<b>` juga
menyesatkan: ia menampilkan DUA arah, jadi cabang yang bersih pun tampak "beda" ketika
master sudah melaju. Uji yang benar: daftar berkas yang berbeda harus PERSIS berkas
milik PR-PR yang mendarat SESUDAHNYA — nol berkas milik cabang itu sendiri. Untuk
cabang tanpa PR, bandingkan berkas yang ia sentuh satu per satu terhadap master
(`git diff --quiet origin/master origin/<b> -- <berkas>`); `claude/mystifying-bun-9e08b3`
ternyata ketiga berkasnya IDENTIK — kerjanya sudah mendarat lewat PR lain.
Catat SHA sebelum menghapus.

## GOTCHA operasional
- `gh pr merge --delete-branch` **gagal** bila cabangnya dipegang worktree lokal —
  tetapi **merge-nya tetap mendarat**. Verifikasi `gh pr view <n> --json state` dulu
  sebelum menyimpulkan gagal. Bandingkan [[asseris-wp-signoff-ditolak-senyap]].
- Menyusun body squash: `git log --no-merges origin/master..<branch>` — memakai
  `-1 FETCH_HEAD` mengambil commit MASTER yang baru saja jadi leluhur.
- Komentar blok yang disisipkan lewat Edit gampang mendarat DI LUAR `/* … */`;
  periksa penutupnya sesudah menyunting header berkas.
- `awk` memecah path worktree yang mengandung SPASI ("D:/Claude AI/…") sehingga
  `git -C` gagal DIAM dan setiap worktree dilaporkan **0 berkas kotor** — termasuk
  yang punya 44. Pakai `sed -n 's/^worktree //p'` + `while IFS= read -r`.

Lihat juga [[asseris-fixedassets-kertas-kerja-rollforward]] ·
[[asseris-firm-identity-mock-mengarang-konteks]] · [[asseris-sesi-paralel-satu-worktree]].
