---
name: asseris-tipografi-gerbang-buta-ternari
description: "Gerbang §5 tipografi yang hijau selama ini karena regexnya menuntut digit persis sesudah `fontSize:` — sementara SEMUA pelanggaran nyata berbentuk ternari; plus tiga klon RowKv tak-terdeklarasi."
metadata: 
  node_type: memory
  type: project
  originSessionId: ce6e159a-415a-414c-a55e-77b459a1361e
  modified: 2026-08-26T22:40:00.682Z
---

PR **#310** MENDARAT `b627215` (squash, 2026-08-26; cabang dihapus) — 28 situs
setengah-langkah `fontSize` di 21 berkas `migration/src`, bukan satu komponen bersama.

## GOTCHA TERBESAR — gerbang yang hijau di atas kode yang bocor

`cockpit_conventions.test.ts:100` SUDAH menjaga §5 sejak PR-C-6. Ia buta dua kali:

1. **Lingkup** — hanya membaca `view_cockpit2.tsx`.
2. **Bentuk** — regex `/fontSize:\s*(\d+(?:\.\d+)?)/` menuntut ANGKA persis sesudah
   titik dua. Bentuk nyata di repo adalah TERNARI (`fontSize: strong ? 14 : 12.5`),
   yang menyusul adalah `strong` ⇒ **nol kecocokan**. Setiap pelanggaran nyata
   melewatinya.

Pelajaran umum: **regex gerbang yang menuntut token literal di posisi tertentu akan
melewatkan seluruh kelas cacat bila bentuk dominan di repo memakai ekspresi.** Sebelum
percaya sebuah gerbang, jalankan regexnya pada CONTOH pelanggaran nyata. Gerbang baru
`typography_scale.test.ts` memuat **uji-atas-uji** yang memaku lubang ini (assert bahwa
regex lama mengembalikan `[]`), supaya sensusnya tak bisa hijau-palsu. Lihat
[[asseris-a11y-anchor-href-gerbang-tertahan]] dan [[asseris-s1-kode-mati-retensi-bo]]
(gerbang lolos vakum) untuk pola sejenis.

## Klon tak-terdeklarasi — grep importir SAJA tidak cukup

`grep "from './view_calc'"` menemukan 21 importir, tapi `view_psak65/68/71` memikul
cacat yang sama lewat **salinan lokal** `P65RowKv` · `P68RowKv` · `P71RowKv` (badan
identik, hanya menambah prop `accent`), melayani 42 pemanggil lagi. Resep: setelah
grep importir, grep juga `function .*<NamaKomponen>` dan nama ber-prefiks.

## Pemetaan skala — arah kontras, bukan substitusi buta

12,5 **tidak selalu** turun ke 12; perannya berbeda per situs:

| Pola | Peran 12,5 | Hasil |
|---|---|---|
| `strong ? 14 : 12.5` | cabang biasa | `--fs-md : --fs-sm` |
| `total ? 12.5 : 12` | cabang **tegas** | `--fs-md : --fs-sm` |
| `compact ? 12 : 12.5` | ukuran **dasar** | `--fs-sm : --fs-md` |

Memetakan 12,5 → 12 di keluarga kedua **menghapus** beda baris-total vs baris-biasa.
Nilai tegas → **13**, bukan 15: 15 = ukuran judul panel (`styles_base.css:136`), dua
langkah di atas label 12, lebih nyaring dari 14 yang digantikan. Repo sudah menjawab
sendiri di `view_wtb_deep.tsx:503` (`strong ? 13`).

## Yang SENGAJA dibiarkan (jangan dilaporkan sebagai selesai)

- **Ukuran terhitung** — kelas terpisah, tak dijaga gerbang baru (kalau dijaga, master
  MERAH): `ui.tsx:127` Avatar `size * 0.4`; `view_misc2.tsx:34` FmtBadge `size * 0.185`
  → **7,03px** pada `size=38`, **di bawah lantai 11px**.
- `Kv` (`view_calc.tsx:177`) hex mentah `#9fc0d2` di atas panel gelap padahal token
  `--on-dark-muted` ada; nilainya beda (`#bcd6e4`) ⇒ bukan no-op. ≥5 berkas.
- CSS `styles_*.css` sudah **bersih** (nol `font-size` di luar skala) — sudah dicek.

Token `--fs-xs/sm/md/lg/xl` + `--fs-d1/d2/d3` ada di `styles_base.css:133-142`;
`body.dense` **tidak** meredefinisikannya. Terkait: [[asseris-typography-scale]].

## Jebakan: pembacaan `origin/master` bisa BASI dalam hitungan menit

YANG TERBUKTI di sesi ini: `git rev-parse origin/master` tepat sesudah
`git fetch origin master` mengembalikan `7fb1a4a`; empat menit kemudian
`git checkout -b <cabang> origin/master` melahirkan cabang di atas **`8aecc49`**.
Jadi ref remote-tracking berubah di bawah kaki saya, di `.git` yang DIPAKAI BERSAMA,
tanpa perintah dari saya — kemungkinan besar sesi paralel yang mem-fetch di antaranya
(lihat [[asseris-sesi-paralel-satu-worktree]]).

Yang TIDAK terbukti — jangan tulis sebagai aturan: bahwa `git fetch origin master`
sendiri gagal memperbarui ref-nya. Output `-> FETCH_HEAD` memang tak menyebut
`-> origin/master`, tapi di sini ref-nya toh berakhir benar, jadi sebabnya tak
terpisahkan dari aktivitas sesi paralel.

ATURAN PRAKTIS: jangan pernah melaporkan basis cabang dari `git rev-parse` yang
dibaca LEBIH AWAL di sesi. Buktikan tepat sebelum branch/merge dengan
`git rev-list --left-right --count origin/master...HEAD` (harus `0 <n>`) dan
`git log --oneline -1 HEAD^`.

## Jebakan: CI PR bisa TAK PERNAH ter-dispatch — dan diamnya mirip “masih antre”

#310 mendapat **NOL** workflow run selama ~20 menit padahal `ci.yml` memakai
`on: pull_request` tanpa filter, sementara empat cabang PR lain menyelesaikan
keempatnya di jendela waktu yang sama. `statusCheckRollup` kosong dan
`mergeable`/`mergeStateStatus` tetap `UNKNOWN`. Obatnya: **`gh pr update-branch <n>`**
— memicu `synchronize` sekaligus menyegarkan basis; sesudah itu keempat workflow
langsung jalan dan hijau.

Cara MEMBEDAKAN “belum dispatch” dari “masih berjalan”: `gh api
repos/<o>/<r>/actions/runs?per_page=30` lalu saring `head_branch`. Nol baris =
belum dispatch. Monitor WAJIB berbunyi pada kondisi nol-run, bukan hanya pada
sukses/gagal — kalau tidak, kegagalan terlihat identik dengan kesabaran.

## Tooling: `jq` TIDAK ADA di shell Bash sesi ini

Pipeline monitor pertama saya mati total tanpa suara karenanya. Tambahan:
`gh pr checks <n>` keluar dengan **kode 1** saat masih pending/gagal, jadi pola
`s=$(gh pr checks .. || echo '[]')` MERUSAK JSON yang ditangkap (JSON + `[]`
berdempet). Parse dengan `node -e` / `gh api -q`, jangan `jq`.

## Merge: `gh pr merge --squash --delete-branch` GAGAL SEBAGIAN di worktree

Errornya `fatal: 'master' is already used by worktree at ...` — tapi **merge di
remote TETAP TERJADI** (`state=MERGED`). Yang gagal hanya langkah git lokal, dan
akibatnya **cabang remote TIDAK terhapus**. Jangan percaya exit code; periksa
`gh pr view <n> --json state,mergeCommit` lalu hapus cabangnya manual via
`gh api -X DELETE repos/<o>/<r>/git/refs/heads/<cabang>` sesudah membuktikan
POHON-nya identik dengan master (squash ⇒ `git cherry` memberi `+` palsu; lihat
[[asseris-git-cherry-squash-palsu.md]]).
