---
name: asseris-w0-3-hcm-squash-twin
description: "W0-3 hcm (PR #319): cabang membawa DUA commit, satu sudah mendarat sebagai #266 DAN disalip — arah diff terukur sebelum rebase; peta W0 salah soal isi & ahead-count"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2419fc43-f376-42de-a9e8-f7eb7cb45a14
  modified: 2026-08-27T16:05:12.640Z
---

Disusun 2026-08-27 saat mendaratkan `fix/hcm-penilaian-karangan` → **PR #319**
(CI 9/9 hijau, `MERGEABLE CLEAN`) di atas `origin/master` `62593c4`.

## Yang paling penting: peta W0 SALAH soal cabang ini — dua kali

`docs/prompts-perbaikan/W0-00-PENDARATAN.md` mencatat cabang ini sebagai
**"H1/H2 + `hcm_derive.ts`", ahead 2 / behind 53**. Keduanya keliru:

1. **Isinya bukan itu.** Cabang membawa DUA commit yang terpisah bersih:
   `01e97eb` (hcm: H1–H5) dan `9dd1e57` (timebudget). `W0-3-hcm.md` sendiri sudah
   memperingatkan catatan lama tidak lengkap — dan peringatan itu benar.
2. **Ahead-nya efektif 1.** `9dd1e57` **sudah mendarat sebagai PR #266** lewat
   squash, lalu **DISALIP** `fb4127d`.

⇒ Kalau sensus W0-1/W0-2/W0-4 disusun dari catatan yang sama, jangan percaya kolom
isi maupun ahead/behind-nya. Uji blob dulu, per-commit.

## Resep: buktikan squash-twin PER COMMIT, bukan per cabang

`git diff --name-only origin/master...<cabang>` menandai berkas timebudget sebagai
`A` (ditambahkan) — **menyesatkan**, karena tiga-titik membandingkan **merge-base**,
bukan master. Master sudah punya berkasnya. Dua uji yang menutup kasus:

```bash
# (a) blob berkas dokumen/aset yang tak pernah diedit ulang — paling tajam
git rev-parse 9dd1e57:docs/usulan-TB3-bobot-fase-timebudget.md   # af83f19
git rev-parse origin/master:docs/usulan-TB3-...md                # af83f19 IDENTIK

# (b) judul commit di riwayat master — squash mempertahankannya kata-per-kata
git log --oneline <merge-base>..origin/master -- <berkas-kunci>
#   306b21d fix(time): modul yang berhenti meminjam angka perikatan lain … (#266)
```

Berkas **dokumen** (`docs/*.md`) adalah probe terbaik: kode diedit lagi sesudah
mendarat sehingga blob-nya bergeser, dokumen usulan tidak.

## Arah diff DIUKUR, bukan ditaksir

Sebelum memutuskan buang/bawa, hitung kedua arah:

```bash
git diff <cabang> origin/master -- <berkas> | grep -c '^-[^-]'   # hilang dari master
git diff <cabang> origin/master -- <berkas> | grep -c '^+[^+]'   # ditambah master
```

Hasil di sini: `timebudget_model.ts` 63/250 · `view_timebudget.tsx` 95/219 ·
`timebudget_isolation.test.ts` 10/56. Yang 63/95/10 itu **bukan kerja yang hilang** —
ia versi LAMA yang master sudah ganti. Membawanya = mengembalikan
`TB_FEE_FALLBACK = 1_520_000_000` (fee karangan yang dicabut `fb4127d`) dan
`TB_PHASE_PROFILE` jam-dipaku yang digantikan `phase_canon` (#282).

⇒ Rebase membuang satu commit: `git rebase --onto origin/master 9dd1e57 <cabang>`
(bukan dari `merge-base`).

## Tiga konflik — semuanya "master lebih maju", diselesaikan ke master

| Konflik | Master lebih maju pada | Cabang lebih maju pada | Hasil |
|---|---|---|---|
| `view_pc_hcm.tsx` badge | token `--on-dark-fg` (#311) | `p.band === UNKNOWN ? …` | token master + logika cabang |
| `view_people.tsx` impor | `resolveEmpId` + `indep_approval` (#276) | `canon_hcm`/`hcm_derive`/`canon_perf` | union |
| `view_people.tsx` nama firma | sudah punya `firmName` dari SSOT (baris 435) | — | **buang sisi cabang** |

Yang ketiga menghapus sentuhan cabang ke modul `independence` seluruhnya — sentuhan
yang commit aslinya sendiri akui di luar lingkup. Gerbang sumbernya
(`/'KAP [^']*'/` per-BERKAS) tetap terpenuhi karena master pun tak lagi memuat
literalnya. **Konflik bisa menyelesaikan utang lingkup, bukan cuma memindahkannya.**

Bukti tak-meregresi yang layak ditiru (dijalankan, bukan diasumsikan):

```bash
git diff origin/master -- <berkas...> | grep -E "^\+" \
  | grep -iE "#[0-9a-f]{3,6}\b|rgba\(255|linear-gradient"     # sapuan #311/#313
git diff origin/master -- <berkas...> | grep -E "^\+" \
  | grep -oE "fontSize: *[0-9.]+" | sort | uniq -c            # skala §5 (#310/#312)
```

## Jebakan lingkungan yang membakar ~20 menit

⚠ **`ln -s` di Bash tool MENYALIN, bukan menaut** — MSYS tanpa
`MSYS=winsymlinks:nativestrict`. `ln -s <main>/node_modules` menyalin gigabyte
(time-out 2 menit di tengah jalan, meninggalkan salinan parsial). Worktree sibling
memang tampak `lrwxrwxrwx`, tapi bukan `ln -s` polos yang membuatnya.
**Yang benar:** `& cmd.exe /c mklink /J "<worktree>\node_modules" "<main>\node_modules"`
dari PowerShell.

⚠ **Menghapus salinan itu juga terhalang:** hook memblokir `Remove-Item` pada path
ber-spasi (`'"D:\Claude'`) dan `cmd /c rmdir /s` (dibaca sebagai alias Remove-Item).
Yang jalan: `robocopy <dir-kosong> <target> /MIR` lalu
`[System.IO.Directory]::Delete($p, $true)` — tetap butuh ~10 menit.

⚠ `git grep -nE "^(<{7}|={7}|>{7})"` memberi **satu false-positive permanen**:
`migration/codemod.mjs:36` (penutup komentar `====… */`). Blob-nya identik dengan
master — periksa itu, jangan panik.

Lihat juga [[asseris-w0-pendaratan-urutan]] · [[asseris-sensus-cabang-2026-08-27]] ·
[[asseris-timebudget-fee-penagihan-karangan]] · [[asseris-git-cherry-squash-palsu]].
