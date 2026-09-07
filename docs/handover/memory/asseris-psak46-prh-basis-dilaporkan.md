---
name: asseris-psak46-prh-basis-dilaporkan
description: "PR-H0..H4 (#157-#161) memindahkan seluruh konsumen kolom `adj` ke basis DILAPORKAN; KELIMA PR MERGED (master 86daaa7); tinjauan piksel TUNTAS & menemukan 3 cacat yang 804 uji lewatkan"
metadata: 
  node_type: memory
  type: project
  originSessionId: 971176f4-fe5c-4c01-b2e4-201c25ac9c11
  modified: 2026-07-29T13:19:49.557Z
---

**2026-07-29.** Arc **TUNTAS — kelima PR MERGED**, master **`86daaa7`** (dari `7d6dac1`):

| PR | Squash commit | Isi |
|---|---|---|
| [#157](https://github.com/ari1945/Asseris/pull/157) PR-H0 | `be8ac44` | `reportedBalance` diberi fallback `AMS.AJE` |
| [#158](https://github.com/ari1945/Asseris/pull/158) PR-H1 | `d3730e9` | `WtbBasis` + `wtbOn()`; 10 konsumen pindah basis |
| [#159](https://github.com/ari1945/Asseris/pull/159) PR-H2 | `5ec5011` | chip basis di `SubBar` + sakelar FS Generator |
| [#160](https://github.com/ari1945/Asseris/pull/160) PR-H3 | `f3e7f4c` | tie-out tautologis diganti + PRD |
| [#161](https://github.com/ari1945/Asseris/pull/161) PR-H4 | `86daaa7` | 6 pembaca `.adj` tingkat-view |

Kelima cabang remote dihapus. Gerbang pada master hasil merge: **typecheck 0 · lint 0 ·
806 uji hijau (62 berkas)**; CI 6/6 hijau di tiap langkah sebelum merge.

**Merge dijalankan dengan resep 6 langkah** [[asseris-wtb-eval-pr1-pr2]] — nol konflik,
jadi peringatan "jangan `-u` buta pada snapshot" tak pernah terpakai. Diff tiap PR
DIVERIFIKASI tak membengkak pasca-retarget: 24 brk +899/−515 · 2 brk +65/−2 ·
7 brk +331/−39 · 8 brk +122/−31 — identik dengan sebelum rebase.

**GOTCHA rebase berantai (baru, akan terulang):** setelah `git rebase --onto origin/master
<base> <turunan>`, ref cabang base sudah BERGESER. Rebase berikutnya **tidak boleh** memakai
nama cabang base sebagai upstream — ia bukan lagi leluhur cabang turunan dan rentang commit
jadi salah. Pakai **sha tip LAMA** yang dicatat sebelum rebase pertama (di sini
h1=`22e0ddb`, h2=`d1700eb`, h3=`9cb9b95`). Catat kelima sha di awal, sebelum menyentuh apa pun.

**GOTCHA worktree:** `feat/psak46-pr-h4-*` dipegang worktree sesi sebelumnya
(`.claude/worktrees/exciting-noyce-7676ba`) → `git checkout`/`branch -D` gagal exit 128 di
repo utama, dan `gh pr merge --delete-branch` **gagal separuh**: cabang REMOTE tidak
terhapus meski PR merged (yang gagal justru penghapusan lokal, tapi gh berhenti).
Verifikasi `git branch -r` setelahnya, jangan percaya `--delete-branch`. Solusi: jalankan
rebase + gerbang DI DALAM worktree itu (ia punya `node_modules` sendiri), lalu
`git checkout --detach` untuk melepas nama cabang.

## ⚠️ TABRAKAN NAMA — DIPUTUSKAN: TETAP "PR-H" (jangan rename)
master memuat **PR-H1 (#153, groupaudit CP-01)** & **PR-H2 (#152, materialitas per-field)**
dari arc SA 600 — tak berhubungan. `git log --grep "PR-H1"` memberi dua hasil berbeda.
**Sudah dipertimbangkan & ditolak:** label "PR-H" tertanam di **63 komentar pada 28 berkas**
sebagai penanda provenans; rename penuh = menyentuh ulang 28 berkas + verifikasinya (churn
+ risiko regresi demi kerapian), rename separuh LEBIH buruk. Bedakan lewat cabang
`feat/psak46-pr-h*` atau scope commit (`feat(canon)`/`feat(ui)`/`fix(fsgen)` vs
`fix(groupaudit)`/`fix(materiality)`). **Jangan buka ulang keputusan ini.**

## Cacat inti yang ditutup
Kolom `adj` = `unadj + SELURUH jurnal` (kolom `aje` adalah **seed statis**, tak tahu status).
Ia bukan "audited" melainkan pengandaian *"bila semua usulan diterima"*. Sepuluh konsumen
memakainya sebagai default, termasuk **FS Generator yang MENERBITKAN LK** — sementara modul
SAD di sebelahnya sudah basis dilaporkan dan mengevaluasi AJE-03/AJE-05 sebagai salah saji
**tidak dikoreksi**. Satu perikatan, dua laporan keuangan.

**PR-G1 sendiri baru separuh terpasang:** `reportedBalance` tanpa fallback `AMS.AJE` →
`deferredTax(wtb)` memberi ember `ecl` **1.980** (vs 2.600 pada dua bentuk lain), dan
**2 dari 3 view hidup** memakai bentuk yang bocor. Akibatnya baris rekonsiliasi `ckpn` yang
tugasnya MELAPORKAN beda basis justru `variance 0 / ok` di aplikasi. Lolos gerbang PR-G1
karena setiap uji memakai jalur zero-arg atau `(SEED, SEED_AJE)` — dua bentuk yang kebetulan
benar. Kelas kegagalan yang sama dengan [[asseris-materiality-om-split]].

## GOTCHA yang mahal ditemukan
1. **Sapuan `wtbVal(…, 'adj')` TIDAK menemukan `r.adj` bentuk akses-properti.**
   `forensic_canon.dmod` memakai bentuk itu → jembatan arus kas membandingkan dua basis dan
   `cfoTies` menjadi false. **Ditangkap uji, bukan sapuan.** Sapu KEDUA bentuk.
2. **Memindahkan seluruh akun TIDAK otomatis menjaga neraca FS Generator seimbang** —
   penalaran double-entry yang terdengar meyakinkan dan SALAH. Sebabnya WTB
   mempertahankan akun 4-/5- **terbuka** sementara `3-2100` adalah saldo **penutup** yang
   sudah memuat laba basis `ifAllProposed`. Terukur `bsDiff` = 6.910 / **2.970** / 0 untuk
   unadj/reported/ifAllProposed. Perlu penutupan laba (`reShift`). **Tanda ia benar:** plug
   OCI jadi KONSTAN lintas-basis (dulu −356/3.584/6.554 — sedang menyerap ketidakseimbangan).
3. **`Σ WTB per kolom = −11.540 = −laba neto basis `adj`** — cara cepat membuktikan saldo
   laba seed memang mengandung laba basis `ifAllProposed`.
4. **CI `npm audit` bisa gagal karena registry 400** ("endpoint is being retired / Invalid
   package tree"), bukan karena kerentanan. Cek diff menyentuh `server/` atau tidak sebelum
   menduga; `gh run rerun <id> --failed` menyelesaikannya.

## Keputusan metodologi (Ari mendelegasikan — "Proceed" tanpa memilih)
1. Default kanon **`reported`** (SA 450: LK menyajikan koreksi yang DITERIMA).
2. **Eksposur ECL = piutang basis DILAPORKAN** (termasuk yang fiktif; AJE-03 belum
   disetujui). PSAK 71 ¶5.5.1 mengukur atas aset yang DIAKUI; fiktifnya adalah salah saji
   *keterjadian* terpisah (`M-01` di SAD). Piutang neto-AJE-03 menghitung koreksi dua kali.
3. Cakupan penuh, bukan tiga modul.

## Angka yang bergerak (Rp juta)
`netClose` 142.040→**143.160** · `deprAudited` 7.440→**6.320** · `eclModel` 2.603→**2.700** ·
`gap` 623→**720** · **`auditVariance` 3,0→100,4** (dulu artefak beda basis yang terbaca "dalam
toleransi"; kini di atas CTT → wajib masuk SAD) · PSAK 48 headroom 7.426→**6.306**,
`impairLoss` **tetap 0** (keempat sensitivitas tak berbalik). Suku identitas PSAK 46
**nihil pergerakan**.

## ✅ TINJAUAN PIKSEL TUNTAS — dan menemukan 3 cacat yang 804 uji lewatkan
Ari login + panel Browser dibuka. Diperiksa KPI **dan** tabel pada PSAK 16 (7/7 tie-out,
KPI 143,2 M & 6,3 M cocok tabel), PSAK 71 (51.322 / 2.700 / +720; nilai lama nol
kemunculan), FS Generator (319,5 M ⇄ 316,6 M, 8/8 tie-out & seimbang pada KEDUA basis,
pilihan bertahan setelah reload), Alur Data (kedua baris "selisih Rp 0 · COCOK").

**Cacat yang HANYA muncul di layar** — alasan tinjauan piksel bukan formalitas:
1. Tie-out `t7` PSAK 16 menuntut hal TERBALIK sejak pindah basis → memerah (6/7) tepat
   ketika sistem benar, catatannya menyatakan sebaliknya. Vitest tak pernah merender view.
2. Chip basis MEMBANTAH sakelar FS Generator ("Basis: DILAPORKAN" bersama sakelar "Bila
   semua usulan diterima") — cacat yang diperkenalkan PR-H2 sendiri.
3. **TDZ (`Cannot access 'M' before initialization`) + `rules-of-hooks` LOLOS typecheck**,
   hanya muncul sebagai layar crash.

**GOTCHA ALAT:** klik `computer` berbasis KOORDINAT tidak menggerakkan `Seg` mana pun —
termasuk kontrol lama ("Ribuan") yang tak saya sentuh. `element.click()` bekerja normal.
Selalu uji kontrol LAMA sebagai pembanding sebelum menuduh kode sendiri. Juga: error
konsol BASI (`?t=<timestamp>` versi modul lama) terus muncul setelah perbaikan — baca
timestamp modulnya, jangan simpulkan masih rusak.

**Efek samping yang DISENGAJA & dicatat:** uji kewajaran penyusutan SA 520 bergerak
−1.403 jt (−15,9%) → **−2.523 jt (−28,5%)**. Itu PEMULIHAN alarm: AJE-05 diusulkan persis
karena penyusutan kurang saji, dan basis `adj` selama ini membungkam analitik yang menjadi
alasan jurnal itu ada. Pola sama dengan `bt-etr` di [[asseris-psak46-fiscal-split-sweep]].

## PR-H4 — SELESAI (#161), termasuk cacat kedua yang tak terduga
Enam pembaca `.adj` tingkat-view dipindahkan. Mereka lolos sapuan `wtbVal(…,'adj')` karena
memakai bentuk AKSES-PROPERTI.

**Cacat kedua:** `view_materiality` & `view_misc1` membaca **`AMS.WTB` SINGLETON BEKU** —
"akun melampaui PM" tak bergerak saat WTB perikatan berubah (cache-dingin, pola #129/PR-6b).
Ambangnya PM = keputusan **luas pengujian**, jadi salah populasi = **salah ruang lingkup**.
Kini reaktif; keduanya sepakat 27 akun.

`view_dataflow` dipindahkan meski **invarian terhadap basis secara konstruksi**; invariannya
DIPAKU uji, dan Σ ≠ 0 dinyatakan sebagai SIFAT WTB (akun 4-/5- terbuka, saldo laba =
saldo penutup) supaya tak ada yang "memperbaikinya" jadi nol & membatalkan `reShift`.

`view_execution.tsx` (modul WTB) SENGAJA dibiarkan — menampilkan kolom `adj` memang tugasnya.

## Sisa pekerjaan di master `86daaa7`
Dua PR lain tetap terbuka dan **sudah dievaluasi ulang GitHub sebagai CLEAN/MERGEABLE**
di atas master baru — tak butuh rebase: [#155](https://github.com/ari1945/Asseris/pull/155)
(uji SA 600 atas fixture, lihat [[asseris-test-tier-typecheck-gate]]) dan
[#156](https://github.com/ari1945/Asseris/pull/156) (larik kosong ≠ tak diberi — kebocoran
data klien). Worktree `sleepy-curran-2acd84` memegang cabang #155.

## Menjalankan worktree ini
`.claude/launch.json` kini punya **`dev-all-h1`** (vite **5182** / server **5183**) supaya tak
menabrak server sesi lain di 5180/5181. Worktree butuh `npm ci` sendiri di `migration/` DAN
`server/`; DB dibuat dengan **`npx prisma db push`** (BUKAN `migrate deploy` — `migration_lock.toml`
bilang postgresql sementara schema sqlite → error P3019), lalu `npm run seed`.
