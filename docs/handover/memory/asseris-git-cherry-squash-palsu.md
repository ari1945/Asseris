---
name: asseris-git-cherry-squash-palsu
description: "`git cherry` menandai commit sebagai BELUM upstream (`+`) bila PR-nya di-squash dari lebih dari satu commit — patch-id gabungannya tak cocok dengan patch-id masing-masing"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 68d92f5f-046d-449d-9456-f298b2b39e0a
  modified: 2026-08-24T00:58:33.440Z
---

Repo Asseris memakai **squash merge**. Konsekuensi yang menipu saat memutuskan apakah
sebuah cabang aman dihapus:

- PR berisi **satu** commit → squash mempertahankan patch-id ⇒ `git cherry origin/master <sha>`
  menampilkan `-` (sudah upstream). Benar.
- PR berisi **dua atau lebih** commit → squash melahirkan SATU patch-id gabungan yang tak
  cocok dengan patch-id commit mana pun ⇒ `git cherry` menampilkan `+` (seolah belum
  upstream) untuk SEMUANYA. **Salah, dan bisa membuat pekerjaan dikirim dua kali.**

Terjadi 2026-08-24: `ab3ce02` & `1059316` (internalaudit) muncul `+` padahal keduanya
sudah mendarat lewat PR #296 yang men-squash keduanya jadi `da3f3cc`.

**Cara membuktikan yang benar** — bandingkan POHON, bukan pesan commit dan bukan
`git cherry`:
```
git show --name-only --format= <sha1> <sha2> | sort -u | grep -v '^$' |
while read f; do
  a=$(git rev-parse <sha2>:"$f"); b=$(git rev-parse origin/master:"$f")
  [ "$a" = "$b" ] && echo "$f IDENTIK" || echo "$f BEDA"
done
```
`migration/eslint-suppressions.json` akan selalu "BEDA" — ia berkas BERSAMA lintas arc
dan bergerak terus; kecualikan dari penilaian.

Pelengkap yang tetap sahih: cocokkan patch-id commit lokal dengan commit di CABANG PR
(sebelum di-squash), bukan dengan master:
`git show <sha> | git patch-id --stable`.

**Why:** aturan keras "jangan hapus cabang tanpa membuktikan isinya ada di master"
memerlukan alat yang tidak berbohong. `git cherry` berbohong pada squash multi-commit.

Lihat juga [[asseris-repo-hygiene-2026-08-19]] · [[asseris-gelombang0-baseline-master-bukan-head]]
