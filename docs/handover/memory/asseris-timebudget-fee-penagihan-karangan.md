---
name: asseris-timebudget-fee-penagihan-karangan
description: "TB5/TB6 Time & Budget (PR #279) — fee fallback dorman & penagihan disintesis; plus gotcha PR berkonflik = CI TIDAK PERNAH JALAN, dan Python Windows merusak UTF-8"
metadata: 
  node_type: memory
  type: project
  originSessionId: f1d228e5-d2ec-4505-9ea5-211d05a32196
  modified: 2026-08-22T08:52:48.290Z
---

# Time & Budget: fee karangan (dorman) & penagihan yang disintesis — PR #279

Dua temuan §12 PRD metode masukan PSAK 72, dikerjakan di atas `77776fe` (#278).
**MENDARAT** sebagai `fb4127d` di master (squash, 2026-08-22), CI 9/9, `verify`
PASSED. Sempat di-rebase DUA kali: ke `77776fe` (#278) lalu ke `7e640a6` (#280).

- **TB5** `TB_FEE_FALLBACK = 1_520_000_000` lewat `?.fee || TB_FEE_FALLBACK` →
  diganti `contractValueOf` (kanon bersama dengan skedul PSAK 72). `fee`,
  `marginCompletion`, `realization` jadi nullable; `feeGap: RevenueGap | null`.
- **TB6** `fee × 0,5` / `fee × 0,3` → `tbBilling()` membaca `useInvoiceRegister()`
  dan MEMINJAM `UNBILLED_STATUS` dari `revenue_psak72.ts` (kini diekspor).

## GOTCHA yang mahal (urutan biaya)

1. **PR berkonflik ⇒ CI TIDAK PERNAH START.** GitHub tak bisa membuat
   `refs/pull/N/merge` untuk PR `CONFLICTING`, jadi workflow ber-trigger
   `pull_request` gagal dijadwalkan. `gh pr checks` menjawab **"no checks
   reported"** — dan itu menyamar sebagai "masih antre", bukan sebagai
   kegagalan. **Sesudah `gh pr create`, periksa `gh pr view --json mergeable`
   DULU, jangan menunggu check.** Saya menunggu 30 menit sia-sia.
2. **Python di Windows: `open()` default cp1252, BUKAN UTF-8.** Repo ini penuh
   `—`/`×`/`÷`/`≠` dan berbahasa Indonesia. `open(p,'r',newline='')` tanpa
   `encoding='utf-8'` membaca-lalu-menulis-balik = seluruh non-ASCII jadi `?`.
   Kerusakannya SENYAP (skrip exit 0). **Selalu**
   `open(p, encoding='utf-8', newline='')` di kedua arah.
3. **`jq` TIDAK ADA** di lingkungan ini. Pemantau berbasis `jq` diam total
   selama 40 iterasi tanpa satu pun pesan galat. Pakai exit code
   `gh pr checks` (`8` = pending, `0` = semua lulus, `1` = ada gagal).
4. **Heredoc tool Bash memakan kutipan** pada string Python bertanda `'''` →
   "unexpected EOF". Untuk skrip apa pun yang panjang/berkutip: tulis ke berkas
   lewat tool `Write`, lalu `python berkas.py`. (Sekeluarga dengan gotcha
   backslash di [[asseris-repo-hygiene-2026-08-19]].)
5. Terulang lagi, dua-duanya sudah tercatat sebelumnya:
   `git checkout -- <dir>` di loop mutasi **menghapus kerja belum-commit**
   (commit dulu, baru mutasi), dan `npm run verify > log; echo $?; tail`
   melaporkan exit code **`tail`** — `verify` merah tapi terbaca hijau.

## Pelajaran substansi

- **"Dorman" dan "tidak dorman" adalah dua kelas cacat berbeda, dan uji-nya
  berbeda.** TB5 dorman ⇒ uji harus MEMBANGUN keadaan pemicu + menuliskan
  PREMIS bahwa seed tak bisa menangkapnya. TB6 ternyata **tidak** dorman: pada
  seed `fee × 0,5` = 925 jt sementara register = 1.480 jt. PRD melaporkannya
  sekadar "disintesis" — periksa sendiri, jangan mewarisi klaimnya.
- **Mengganti satu angka karangan bisa menyembunyikan angka lain.** Baris "WIP
  belum ditagih" berlantai `Math.max(0, …)`; begitu tertagih menjadi nyata,
  perikatan yang menagih DI MUKA menampilkan Rp 0 dan liabilitas kontrak 328 jt
  hilang. Harus dilaporkan BERPASANGAN (aset & liabilitas), sekosakata dengan
  `revenue_psak72` (`asset`/`liab`).
- `TB_FEE_FALLBACK` dipakai dengan `||`, bukan `??` ⇒ **fee 0 (pro bono) ikut
  jatuh ke fallback**. Selalu periksa operatornya, bukan cuma nilainya.
- Modul yang ditulis ulang sering menyimpan **pembaca seed kedua**:
  `useTBModel` membaca `AMS.CLIENTS` padahal komponen yang SAMA sudah memegang
  `activeClient` dari `useFirm()`. Pola berulang — lihat
  [[asseris-billing-nomor-faktur-register]].

## Sesi paralel (lagi)

`origin/master` maju di tengah kerja: #278 mendarat ~40 menit sebelum push dan
menyentuh `timebudget_model.ts` + `view_timebudget.tsx`, mengubah
`revRecognized` dari `fee × e.progress` → `progressOf` (metode masukan
berpagar), menambah `recogPct`, melebarkan `RevenueGap` jadi union, dan membuat
`recognitionSchedule` menuntut `hoursOf`. **Jangan selesaikan konflik dengan
regex** — `git reset --hard origin/master` lalu terapkan ulang dari skrip.
Akibatnya `revRecognized` kini null karena DUA sebab; tambahkan uji yang
membuktikan model dapat membedakannya. Lihat [[asseris-sesi-paralel-satu-worktree]].

## Konvensi yang saya langgar tanpa sengaja

`gh pr merge --squash --subject "..."` memakai subjek itu **VERBATIM** dan
TIDAK menambahkan `(#279)`. Seluruh commit master lain berakhiran nomor PR-nya
(`(#277)`, `(#278)`, `(#280)`); `fb4127d` tidak. **Jangan berikan `--subject`**
— biarkan gh memakai judul PR, karena jalur itulah yang menempelkan nomornya.
Tak bisa diperbaiki tanpa menulis ulang sejarah master.

Sisa: `TB_PHASE_PROFILE` (bobot fase, `pct`, `period`) masih literal —
pertanyaan terbuka yang menunggu keputusan Ari, tercatat di berkas modelnya.
