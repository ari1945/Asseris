---
name: asseris-wip-rollforward-falsifiable
description: Arc 2026-08-15 - mencabut empat angka plug di FIRMFIN.wip (opening, additions, reconciling, rasio 0.82); roll-forward & jembatan GL kini dapat gagal; PR #239
metadata:
  type: project
---

Arc **2026-08-15**, cabang `feat/wip-rollforward-falsifiable`,
**[PR #239](https://github.com/ari1945/Asseris/pull/239) MERGED** (squash, 9/9 CI hijau).
`origin/master` = **`f0f71ce`**.
PRD `docs/prd-wip-rollforward-falsifiable.md` → **Implemented**.
Jawaban Ari: Q-1 = WIP saja · Q-2 = badge merah + blokir ekspor · Q-3 = seed disetel menutup
(ketiganya "sesuai rekomendasi").

**Empat plug yang dicabut** di `FIRMFIN.wip()`: `additions` literal 10.400 jt · `opening`
sebagai turunan-plug · `reconciling = control − unbilledTotal` · `otherPortfolio =
reconciling × 0,82` (dengan dua label yang terdengar spesifik).

**Bukti yang membuka kasusnya** (diukur, bukan dikira): mengisi timesheet pada SATU
perikatan menggeser "Saldo awal WIP" 3.180 → 1.360 jt — saldo periode LALU bergerak karena
input hari ini — dan menaikkan baris "WIP perikatan portofolio LAIN (di luar sampel)"
1.296 → 2.788 jt, yakni baris yang mengaku menjelaskan perikatan di luar sampel berubah
karena perikatan di dalam sampel. Plus: **tak satu pun dari 6 jurnal `FIRM_GL` menyentuh
akun 1-300** — "kontrol GL" tak pernah diposting.

**Bentuk perbaikannya:** `WIP_ENG` mendapat `openingUnbilled` + `chargedInPeriod`
(invarian `opening + charged === std`, dijaga uji). Revaluasi jam aktual & write-down
manual jadi BARIS BERNAMA, dan di jembatan dibalik sebagai "belum diposting ke GL".
Jembatan memakai register terenumerasi `WIP_NONMATERIAL`/`WIP_ACCRUAL`. Bendera
`reconciles` memerahkan panel DAN mengunci ekspor tersegel (gerbang di handler, bukan
cuma `disabled` tombol).

**GOTCHA HITUNGAN — basis ASET vs NETO.** Jembatan sempat meleset Rp 400 jt karena saya
mengurangkan `unpostedAdj` dari `unbilledTotal` (yang hanya menjumlah baris POSITIF).
Perikatan yang berpindah tanda saat direvaluasi (unbilled +1.820 → −400) membuat aljabar
itu salah. Solusi: hitung `postedAsset` LANGSUNG dari nilai seed, jangan dialjabarkan dari
basis kini. Aturan umum: bila satu basis memfilter baris (`> 0`), selisih antar-basis TIDAK
bisa dipindahkan dengan pengurangan.

**GOTCHA KERAS — `git checkout -- <berkas>` MENGHAPUS kerja yang belum di-commit.** Saya
memakainya untuk memulihkan seed yang sengaja dirusak saat verifikasi hidup; berkas itu
juga memuat pekerjaan baru yang belum di-commit, dan hilang seluruhnya. Untuk merusak data
sementara saat verifikasi: **commit dulu**, atau simpan salinan berkas, atau pakai
`git stash` — jangan `checkout --` di berkas yang sedang dikerjakan.

**Sisa utang (Non-Scope, sadar):**
1. `arAging()` & `ap()` memakai plug `control − open` yang IDENTIK (kontrol 1-200 & 2-100)
   dan tampil berdampingan di Firm Finance — arc sendiri.
2. Menjadikan 1-300 benar-benar terposting: butuh jurnal WIP di `FIRM_GL` + menyalurkan
   `firm_ledger` (kini hanya dipakai `view_firmgl`) ke `FIRMFIN`.

Uji +15 (total 1769), termasuk DUA uji yang merusak seed lalu memulihkannya — tanpa itu
"dapat gagal" hanya klaim. Ratchet `:any` tetap 8058. Live-verified DUA keadaan.
