---
name: asseris-firmrevenue-rollfwd-kontrak
description: "Roll-forward kontrak PSAK 72 modul Pendapatan Firma — panel liabilitas tautologis, panel aset meleset 15,0 jt; jalur (b) dipilih karena FIRM_COA tak punya akun kontrak sama sekali"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2929670d-7fb4-4992-b1ca-b8d56fbcfc0a
  modified: 2026-08-26T22:21:42.750Z
---

**PR #307 MENDARAT `8aecc49`** (2026-08-26, squash). Master hijau di keempat
workflow (CI · e2e · deploy-smoke · dependency-audit). Cabang & worktree dihapus.

**GOTCHA pengiriman — dua-duanya terjadi di sesi ini:**

1. **`gh pr merge` GAGAL dengan `fatal: 'master' is already used by worktree at …`
   PADAHAL merge-nya SUDAH BERHASIL.** Errornya dari checkout lokal PASCA-merge,
   bukan dari merge-nya. Jangan simpulkan gagal dari exit code — konfirmasi lewat
   `gh pr view <n> --json state,mergeCommit`. Akibat lain: `--delete-branch`
   tak pernah jalan, hapus manual `git push origin --delete <cabang>`.
2. **Mengejar base segar TAK BISA DIMENANGKAN saat banyak sesi paralel mendarat.**
   Saya `gh pr update-branch` ke `7fb1a4a`, CI hijau 9/9 — lalu #308 mendarat
   (`0f9ed9f`) sebelum merge, jadi checks-nya BASI LAGI satu commit. GitHub
   menyquash ke `0f9ed9f`. Yang benar-benar menjaga R-7 bukan kesegaran base PR,
   melainkan **CI master pasca-merge**; itu yang wajib ditunggu.

Bukti isi benar-benar mendarat (squash ⇒ `git cherry`/`origin/master..HEAD`
memberi `+` PALSU, lihat [[asseris-git-cherry-squash-palsu]]): bandingkan ISI —
`git diff <tip-cabang> origin/master -- <berkas>` harus KOSONG.

Basis kerja: worktree dari `origin/master` = `f650c74`; `npm run verify` PASSED
lokal sebelum kirim.

## Angka yang terukur (jangan hitung ulang dari nol)

Seed sekarang, `extraHours = {}`: totRecognized 4.942,8 jt · totBilled 4.610,0 jt ·
totAsset 1.176,5 jt · totLiab 843,6 jt.

- Panel **liabilitas** `×1,4 + ×0,9 − ×1,3` atas SATU basis (`totLiab`) ⇒ 1,0 ×
  totLiab. Menutup **secara aljabar, apa pun datanya**. Menguji panel ini apa
  adanya SELALU hijau — itu A == A.
- Panel **aset** `0,74×totAsset + 0,32×totRecognized − 0,28×totBilled` = 1.161,5 jt
  vs saldo akhir 1.176,5 jt ⇒ **selisih 15,0 jt**, dan selisih itu TERBACA di
  layar (871 + 1.582 − 1.291 vs 1.177 setelah pembulatan `fmt(x,0)`).
- **Kecilnya kebetulan (1,27%).** Pada fixture uji faktor yang sama meleset 42 jt
  atas saldo 300 jt (14%). Jangan simpulkan "hampir menutup" dari seed saja.

## Kenapa jalur (b), bukan menurunkan komponennya

`FIRM_COA` **tak punya akun aset maupun liabilitas kontrak sama sekali** — aset &
liabilitas kontrak PSAK 72 firma adalah PENYAJIAN turunan (`fee × kemajuan −
tertagih`), bukan akun buku besar, jadi tak ada jurnal pergerakan untuk
dienumerasi. Grep `openingRecognized|openingHrs|openingAsset|openingLiab|
openingContract|openingBilled` = **nol hasil**.

**GOTCHA yang hampir menjebak:** `FIRMFIN.wip()` (data_firmfin.ts) PUNYA
roll-forward yang benar-benar dienumerasi — `openingUnbilled` + `chargedInPeriod`
fakta per-perikatan, plus baris alarm `rollForwardResidual` bila tak menutup. Ia
adalah BENTUK yang harus ditiru, **bukan sumber yang boleh dipinjam**: basisnya
nilai standar jam (kontrol GL `1-300`), bukan nilai kontrak; dan
`WIP_ENG.billed` **membantah register faktur** — ENG-2025-014 = 1.200 jt di
WIP_ENG vs 1.480 jt dari `use_invoices`. Dua register, dua ukuran.

Saldo awal tertagih juga tak dapat disimpulkan: register faktur hanya memuat
faktur 2026 (Jan–Mar). **Diamnya register tentang 2025 bukan bukti nol ditagih.**

## Resep gerbang render yang terpakai

Pola `revenue_row_control.test.ts`: jsdom + `createRoot` + `vi.mock('./contexts')`
/`'./use_invoices'`/`'./shell'`. Untuk dua set data: simpan register di objek
mutable (`state.invoices`) yang dibaca mock saat dipanggil, lalu unmount →
remount.

- **`panelTitled` WAJIB pakai `:scope > div.panel-h > h3`.** Tab ini dibungkus
  `<Panel noBody>`, jadi `p.querySelector('h3')` keturunan ikut memilih
  pembungkusnya → gerbang gagal karena BENTUK DOM, bukan karena cacatnya. Merah
  pertama saya persis begini; merah yang salah alasan bukan bukti.
- Gerbang inti = **sensitivitas satu masukan** (adendum C-E): ubah SATU faktur
  2026 → hanya saldo akhir boleh bergerak, sebesar delta fakturnya. Kode lama
  menggeser "Saldo awal (1 Jan)" 44,4 jt karena faktur MARET berubah — saldo
  periode LALU digerakkan penagihan periode INI. Itu kalimat vonisnya.
- Heredoc Bash **memotong** berkas uji berisi regex (158 dari ~190 baris, senyap).
  Tulis berkas uji lewat tool Write. Lihat [[asseris-repo-hygiene-2026-08-19]].

## Yang TIDAK dikerjakan

Modul ini nol persist & nol ekspor (`grep` hanya `lazy_views` + `related_modules_data`),
jadi "bantahan ikut tersegel" tak ada tempatnya — dan menambah ekspor dilarang
prompt. `RowKv` (view_calc.tsx:179) memakai `fontSize: 12.5` — setengah langkah,
melanggar skala tipografi [[asseris-typography-scale]]; di luar lingkup, belum
dilaporkan sebagai isu.

Terkait: [[asseris-revenue-psak72-kontrak-pengukuran]] ·
[[asseris-wip-rollforward-falsifiable]] · [[asseris-firmgl-rekonsiliasi-ekspor]]
