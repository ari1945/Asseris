---
name: asseris-gelombang0-baseline-master-bukan-head
description: "Direktori kerja utama tertinggal di belakang master, jadi `git status` di sana MELEBIH-LEBIHKAN pekerjaan yang tertunggak — baseline ulang tiap berkas terhadap origin/master sebelum triase"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 68d92f5f-046d-449d-9456-f298b2b39e0a
  modified: 2026-08-24T00:57:46.533Z
---

Di repo Asseris, direktori kerja utama rutin duduk di cabang lama (mis.
`fix/timebudget-engagement-isolation` @ `1059316`) sementara `origin/master` sudah jauh
di depan. Akibatnya `git status --porcelain` di sana membandingkan terhadap **HEAD cabang
itu**, bukan master — dan berkas yang isinya SUDAH mendarat di master tetap muncul
sebagai `M` atau `??`.

Pada Gelombang 0 (2026-08-24) premis prompt menyebut "45 berkas belum di-commit" dan
"empat commit yatim". Sesudah baseline ulang terhadap `origin/master`, kenyataannya:
- **2 dari 4 commit sudah ada di master** (`9dd1e57` time = `306b21d` PR #266;
  `0508891` firmtax satu-satunya yatim sejati).
- **Arc `jet` seluruhnya sudah mendarat** (PR #280) — `view_jet.tsx` di direktori kerja
  BYTE-IDENTIK dengan master, tetapi tetap terdaftar `M`.

**Cara membaseline ulang (untracked butuh perlakuan berbeda):**
```
# tracked: git diff cukup
for f in $(git diff --name-only); do
  git cat-file blob origin/master:"$f" | diff -q - "$f" >/dev/null && echo "$f IDENTIK"
done
# untracked: `git diff origin/master -- <path>` BERBOHONG (melaporkan "+0 -N",
# seolah berkasnya dihapus) karena berkas untracked tak masuk diff sama sekali.
# Harus bandingkan byte:
git cat-file blob origin/master:"$f" | diff -q - "$f"
```
Bandingkan **setelah `tr -d '\r'`**: master menyimpan LF, salinan kerja Windows CRLF.
Selisih ukuran = persis jumlah baris ⇒ murni akhir-baris, bukan isi.

**Why:** menyalin berkas "yang belum di-commit" ke cabang baru dari master TANPA
baseline ulang akan MENGEMBALIKAN master ke versi lama — regresi senyap yang tak satu
pun gerbang tangkap, karena berkasnya memang kompilabel.

**How to apply:** langkah pertama triase apa pun = `git fetch origin` lalu bandingkan
tiap berkas terhadap `origin/master`. Baru sesudah itu kelompokkan per arc. Untuk
menerapkan delta lokal ke master pakai tiga-arah, bukan salin:
`git diff HEAD -- <berkas> > /tmp/x.patch` lalu `git apply -3 /tmp/x.patch` di worktree
dari master — konflik yang muncul adalah informasi, bukan gangguan.

Lihat juga [[asseris-gelombang0-arc-tersalip-master]] · [[asseris-git-cherry-squash-palsu]] ·
[[asseris-sesi-paralel-satu-worktree]]
