---
name: asseris-spr2400-salinan-kanon-materialitas
description: "SPR 2400 — literal materialitas yang ternyata SALINAN AMS.REVIEW_2400_PLAN (bukan karangan), tanda tangan akuntan publik nyata pada laporan simulasi, dan dua register untuk satu perikatan reviu"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5023aaa7-f69d-462a-b08e-49dd8b4d73d0
  modified: 2026-08-23T16:38:45.027Z
---

Commit `e37df6b` di cabang lokal `fix/spr2400-fakta-perikatan` (worktree
`.claude/worktrees/spr2400`, dari `origin/master` `6e82d42`). **BELUM di-push,
belum ada PR** per 2026-08-23. `npm run verify` PASSED (3322 uji frontend / 461
backend).

## GOTCHA TERBESAR — "angka karangan" yang ternyata SALINAN kanon

Prompt tugas menyatakan literal `900` / `1% pendapatan` / `675` di
`view_spr2400.tsx` "tidak punya sumber di repo ini", dan memerintahkan
MENCABUTNYA. **Salah.** `AMS.REVIEW_2400_PLAN` (`data_part3.ts:475`) memuat
persis ketiganya:

```js
const REVIEW_2400_PLAN = { materiality: 900_000_000, benchmark: '1% dari pendapatan', pm: 675_000_000, focus: [...] };
```

dan `view_nonaudit.tsx:156-160` sudah merendernya sebagai "Materialitas Reviu".
Jadi kelas cacatnya **pelanggaran SSOT (salinan privat yang membusuk diam-diam)**,
bukan fabrikasi. Perbaikan yang benar = MENYAMBUNGKAN ke sumber, bukan mencabut.

**Pelajaran umum:** prompt bilang "grep X → kosong" bisa benar untuk simbol yang
di-grep tapi salah untuk faktanya. Di sini `grep material` pada blok `REVIEW_2400`
memang kosong — angkanya ada di objek TETANGGA bernama `REVIEW_2400_PLAN`, di
berkas LAIN (`data_part3.ts`, bukan `data_part2.ts`). Cari nilainya, bukan cuma
nama fieldnya.

## Temuan struktural: DUA register untuk satu perikatan reviu

`REV-2025-022` (NONAUDIT + REVIEW_2400, `data_part2.ts:528`) dan `ENG-2025-022`
(ENGAGEMENTS, `data_part1.ts:65`) = klien `C-022` yang sama, standar SPR 2400,
rekan & manajer & tenggat sama — **tanpa satu pun penghubung di repo**
(`grep -rnE "REV-2025-022.*ENG-2025-022|..."` → kosong). Progres berbeda (60 vs
45). Materialitas berbeda: **900 jt** vs **1.400 jt** (selisih 56%). `ENG-2025-022`
punya WTB penuh (`data_wtb_eng.ts:137,230`); `REV-2025-022` tidak.
Dua usulan menunggu keputusan Ari: `docs/usulan-SPR-kepemilikan-perikatan-reviu.md`
· `docs/usulan-SPR-materialitas-perikatan-reviu.md`.

## Jebakan lain yang terbukti di sesi ini

- **`useMateriality()` TIDAK menerima parameter perikatan** — ia hard-bound ke
  `useFirm().activeEngagement` (perikatan AUDIT). Untuk modul yang melayani
  perikatan LAIN, memakainya = menampilkan materialitas entitas berbeda.
  `materialityFor()` langsung ditutup gerbang `materiality_single_door.test.ts`
  (hanya `canon_selectors.ts` + `contexts.tsx`).
- **Test title yang memuat `var(--x)` harfiah MEMERAHKAN `css_tokens.test.ts`.**
  Gerbang itu memindai berkas uji juga dan hanya membuang KOMENTAR — judul `it()`
  adalah kode. Kepala `css_tokens.test.ts` sudah memperingatkan ini; saya tetap
  kena. Taruh contoh token di komentar, bukan di string kode.
- **Notifikasi task "exit code 0" BUKAN exit code perintahnya** bila baris
  perintah diakhiri `; echo "X=$?"` — yang dilaporkan adalah exit `echo`.
  Verify run pertama dilaporkan 0 padahal `VERIFY_EXIT=1` / `VERIFY FAILED`.
  Selalu baca `VERIFY_EXIT`/`VERIFY PASSED` dari lognya sendiri.
- **React onChange radio butuh `MouseEvent`, bukan `new Event('click')`.**
  Dispatch `Event` biasa TIDAK memicu onChange → uji interaksi lolos VAKUM
  (layar tak berubah, assertion negatif tetap hijau).
- **Menurunkan `:any` = lint exit 2 tanpa satu error dicetak** ("There are
  suppressions left that do not occur anymore"). `lint:any-baseline` TERLARANG
  (berkas bersama). Resep: kerja di worktree segar dari `origin/master` (di sana
  `eslint-suppressions.json` bersih), lalu patch HANYA kunci sendiri lewat
  replace byte CRLF-aware — diff jadi tepat 1 baris.
- Preseden uji yang disebut prompt (`treasury_conventions.test.ts`, helper
  `buang()`) **TIDAK ADA**. Yang nyata: `internalaudit_conventions.test.ts`
  (helper `kode()`) dan `css_tokens.test.ts` (helper `tanpaKomentar`).
  Uji render: `treasury_render.test.ts` (jsdom, `// @vitest-environment jsdom`).

## Pola gerbang yang dipakai (layak ditiru)

1. Pemindai sumber menerima `process.env.SPR2400_SRC` supaya bisa diarahkan ke
   `git show origin/master:<berkas>` — falsifikasi jadi satu perintah, berulang.
2. Uji RENDER yang **mengubah catatan kanonik lalu menuntut layar bergeser**
   (`plan().materiality = 4_321_000_000` → layar harus berbunyi `4.321` dan
   `900` harus HILANG). Itu satu-satunya cara membedakan "ditarik dari sumber"
   dari "kebetulan sama dengan sumber" — gerbang sumber saja akan hijau meski
   view menampilkan `undefined`.

Lihat juga [[asseris-treasury-forecast-jujur]] (preseden field `basis`),
[[asseris-css-token-ghost-sweep]] (token hantu), [[asseris-firmtax-bukti-potong-karangan]].
