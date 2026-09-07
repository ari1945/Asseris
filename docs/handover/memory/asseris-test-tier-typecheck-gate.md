---
name: asseris-test-tier-typecheck-gate
description: "PR #155 MERGED (6df8271) — uji SA 600 diam-diam berjalan atas singleton AMS.WTB karena `SAMPLE_WTB` tak pernah diekspor; gerbang `npm run typecheck:test` kini WAJIB di CI"
metadata: 
  node_type: memory
  type: project
  originSessionId: 073e0539-24af-454a-a24f-1e9ba8095679
  modified: 2026-08-07T12:35:05.828Z
---

**2026-07-29 ditulis · MERGED 2026-08-07** sebagai `6df8271`. Gerbang `npm run typecheck:test`
kini terpasang WAJIB di `ci.yml` untuk setiap PR.

**GOTCHA saat menghidupkan gerbang yang sudah lama menunggu:** PR ini hijau di basis 29 Juli,
lalu duduk 9 hari. Saat di-rebase ke master `166fa5b`, gerbangnya sendiri menemukan **14 error
di `wp_canon.test.ts`** — berkas yang lahir dari #177, setelah gerbang ditulis, sehingga tak
pernah dihadapkan padanya. Gerbang baru selalu punya utang retroaktif sebesar kode yang lahir
selama ia menunggu. **Rebase dulu, jalankan gerbangnya sendiri, baru merge** — CI hijau di basis
lama tak mengatakan apa pun tentang ini. Isi temuannya: tipe `Sig` ditulis ulang di dalam uji
dengan `by` WAJIB padahal `WpSignature.by` OPSIONAL, dan baris sign-off dianggap `WpChainLink`
(ber-`slot`) padahal `deriveWpStatus` mengembalikan bentuk hasil map ber-`key`. Perbaikannya
menurunkan tipe dari fungsinya (`ReturnType<typeof deriveWpStatus>['signoff'][number]`).

`SAMPLE_WTB` tak pernah diekspor `migration/src/__fixtures__/wtb.ts` → `undefined` → `psak65(undefined, …)` jatuh ke singleton `AMS.WTB` lewat `wtbRows()`. Kedua berkas uji arc SA 600 karena itu menguji seed produksi, bukan fixture — persis kebalikan dari tujuan fixture ("PURE functions of the WTB they are given"). Diperbaiki ke `FIXTURE_TB_FULL` (bukan `FIXTURE_WTB`: hanya TB_FULL punya akun 3-/4-/5- DAN seimbang → `balCheck` 0; FIXTURE_WTB memberi 82.140).

**Pelajaran yang berlaku umum — uji struktural tidak menguji sumbernya.** Ke-12 uji lulus TANPA satu angka pun diubah karena seluruh asersinya struktural (identitas, pertidaksamaan). Justru itu sebabnya cacat bertahan. Uji struktural WAJIB dilengkapi satu uji yang membandingkan hasil fixture terhadap `fn(undefined)` — kalau tidak, fallback singleton tak akan pernah terdeteksi.

**Pola yang lebih berbahaya dari cacatnya:** PR-H1 (#153) SUDAH menemukan cacat ini dan menulisnya rapi di komentar — lalu di-merge apa adanya, dan lima uji baru dibangun DI ATAS fallback-nya (`AMS.WTB.find('4-1100')`). Mendokumentasikan cacat bukan menutupnya; tanpa gerbang, catatan justru mengawetkannya. Direkonsiliasi di #155.

**Gerbang: `npm run typecheck:test`** = `tsc --noEmit -p tsconfig.test.json`, terpasang di `ci.yml` (terverifikasi benar-benar jalan di runner, bukan skipped). Test-tier di-EXCLUDE dari `typecheck` sejak W15 — masuk akal untuk strictness, tapi ikut membutakan tsc terhadap **TS2305**. Config sengaja NON-strict: hanya resolusi modul & keberadaan ekspor. Bukan `import/named` (dependensi baru + disarankan tidak dipakai pada TS). Gerbang memunculkan 20 error; TAK ADA TS2305/TS2307 lain — `SAMPLE_WTB` satu-satunya.

## Terbuka — keputusan Ari, JANGAN diputuskan sendiri
1. **`@types/node`** — menghapus 3 dari 4 baris baseline pengecualian (`export_pdf`, `export_xlsx`, `materiality_single_door`). Baris ke-4 (`__tests__/setup.ts`) permanen: sengaja memalsukan env browser.
2. **`balCheck = −11.540`** (= persis `−npatParent`) — kertas kerja konsolidasi TIDAK menutup atas seed produksi; baris rekonsiliasi *"LPK konsolidasian menutup (A = L + E)"* → `ok: false` di app hidup. `psak65` memperlakukan `3-2100` pra-tutup-buku (`indukSaldoLaba = saldoLabaWTB + npatParent`, `canon_part3.ts`), `AMS.WTB` tampak pasca-tutup-buku. Butuh PRD metodologi, bukan tambalan.

## GOTCHA
- **Worktree `.claude/worktrees/*` TIDAK punya `node_modules`.** Buat junction (tanpa admin, tanpa npm install): `cmd /c mklink /J "<worktree>\migration\node_modules" "<repo>\migration\node_modules"`. Hapus dgn `cmd /c rmdir` (BUKAN `rm -rf` — menghapus isi target).
- **Worktree bisa tertinggal jauh dari master** — `git fetch origin master` + cek `git rev-list --left-right --count` SEBELUM kerja, bukan sesudah. Di sesi ini tertinggal 3 commit dan #153 sudah menyentuh berkas yang sama.
- Probe angka kanon: tulis `*.test.ts` sementara di `migration/src/`, hapus per-nama. Lihat [[asseris-psak46-fiscal-split-sweep]] soal larangan skrip scratch di repo.

Terkait: [[asseris-psak46-prg1-taxeffect]] (asal temuan) · [[asseris-test-coverage]] · [[neosuite-ams-w15-typescript-model]] (asal pengecualian test-tier).
