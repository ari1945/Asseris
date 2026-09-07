---
name: asseris-spr2400-pengiriman-dan-premis-salah
description: "SPR 2400 dikirim (#303 mendarat 35b0019, #304 gerbang axe/keyboard) — dan DUA premis \"keadaan terverifikasi\" di prompt yang terbukti salah karena grep membaca KOMENTAR sebagai kode"
metadata: 
  node_type: memory
  type: project
  originSessionId: e2c802d7-a466-424d-8f69-772f2b96ddc0
  modified: 2026-08-24T04:00:31.504Z
---

Sesi 2026-08-24. Cabang `fix/spr2400-fakta-perikatan` @ `e37df6b` (terdampar sejak
2026-08-23 23:37, tanpa PR) di-rebase ke `origin/master` = `236ae6f`, dikirim sebagai
**PR #303 → mendarat `35b0019`** (CI 9/9). Gerbang a11y menyusul sebagai **#304**.

## GOTCHA TERBESAR — grep yang membaca komentar sebagai kode

Prompt menyatakan dua "keadaan terverifikasi" yang **dua-duanya salah**, dan
keduanya salah karena sebab yang sama: perintah verifikasinya tidak membuang komentar.

| Klaim prompt | Kenyataan |
|---|---|
| `e37df6b` masih punya 2 `div onClick` | NOL. Kedua hit adalah **komentar** yang mengutip pola lama sebagai catatan sejarah. Kontrolnya sudah native (`<Btn>` + `fieldset`/`input[type=radio]`). |
| `useMateriality` dipanggil 2× | NOL panggilan. Dua hit adalah komentar yang menjelaskan mengapa hook itu **sengaja tidak dipakai**. |

Perintah yang dipakai prompt: `git show <sha>:file | grep -c 'div onClick'`.

**Pelajaran:** commit yang baik MENDOKUMENTASIKAN cacat lama di komentar. Maka
`grep -c` atas berkas semacam itu **selalu** melebih-lebihkan. Verifikasi harus
membuang komentar dulu:

```bash
git show <sha>:path | perl -0pe 's{/\*.*?\*/}{}gs; s{^[ \t]*//.*$}{}gm' | grep -nE '<(div|span)[^>]*onClick'
```

Berkas ujinya sendiri sudah tahu ini — `spr2400_conventions.test.ts` punya helper
`tanpaKomentar` yang **diuji terhadap dirinya sendiri** ("gerbang yang stripnya
salah taruh akan HIJAU di atas kode yang belum berubah"). Pemindai sumber di repo
ini WAJIB buang komentar. Lihat juga [[asseris-sales-pipeline-arc]].

Akibat praktis: **langkah 3 prompt sudah selesai sebelum sesi dimulai.** Yang
benar-benar tersisa adalah hal yang prompt tidak minta — **membuktikan** gerbangnya.

## Premis ketiga yang salah: "identitas dari sesi/konteks"

Prompt minta dibuktikan bahwa tanda tangan akuntan publik "kini berasal dari
sesi/konteks". Perbaikannya **bukan itu** — blok tanda tangan **DICABUT seluruhnya**
(pratinjau ini templat elemen ¶86, bukan laporan terbit). Nama rekan yang tersisa
ditarik dari `AMS.NONAUDIT` berkunci `REVIEW_2400.id` dan **berlabel rekaman**, bukan
tanda tangan.

Itu pilihan yang BENAR: sesi/konteks = user yang login, yang belum tentu rekan
perikatan reviu tersebut. Menarik identitas dari sesi akan melahirkan kebohongan
baru. Pola sama dengan penolakan `useMateriality()` di bawah.

## Yang cabang itu tolak kerjakan (dan benar menolaknya)

`useMateriality()` membaca `useFirm().activeEngagement` = perikatan **AUDIT** aktif,
dan **tidak menerima parameter perikatan**. Menyambungkannya ke modul reviu akan
menampilkan materialitas entitas LAIN di bawah judul reviu — kebohongan yang lebih
sulit terlihat daripada literal `900` yang digantikannya. Gerbang S1 memaku
larangannya (`expect(src).not.toContain('useMateriality')`).

## Temuan `--gray` — kegagalan DIAM yang terverifikasi ulang

View lama: `CONCL_2400` punya `k: 'gray'`, dipakai `` `var(--${x.k})` ``. `--gray`
**tidak pernah terdefinisi** di satu pun stylesheet ⇒ substitusi gagal ⇒ deklarasi
invalid ⇒ opsi keempat kehilangan warna tanpa satu pun error. Perakitan runtime juga
**buta bagi `css_tokens.test.ts`**. Ironinya: baris tetangga (`ASSUR_CONTINUUM`) sudah
punya guard `c.color === 'gray' ? 'ink-4' : c.color` — seseorang tahu, lalu melewatkan
yang satunya. Lihat [[asseris-css-token-ghost-sweep]].

## Falsifikasi gerbang — angka commit terbukti jujur

`SPR2400_SRC=<view lama> npx vitest run src/spr2400_conventions.test.ts`
→ **8 gagal / 11 lulus dari 19**, persis yang diklaim pesan commit. Env-override
untuk mengarahkan pemindai ke berkas lain adalah pola yang layak ditiru: falsifikasi
bisa **diulang kapan saja**, bukan sekali saat menulis.

## GOTCHA e2e: `exact: true` vs `.includes()`

Uji jsdom pakai helper `tombol()` ber-`.includes()`; uji Playwright saya pakai
`getByRole(..., { exact: true })`. Label sebenarnya `"REV-2025-022 · Analitis &
Inquiry"` (dirakit dari id perikatan) ⇒ jsdom hijau, Playwright MERAH. Beda semantik
pencocokan antar-lapis uji tak terlihat sampai ditembak di peramban.

## GOTCHA infrastruktur

- **`server/node_modules` TIDAK boleh junction** ke direktori utama (klien Prisma
  dipanggang ke direktori skema — [[asseris-prisma-client-worktree-trap]]). Root,
  `migration/`, `e2e/` boleh junction; `server/` wajib `npm ci` sendiri (~8 menit).
- **Jangan jalankan dua `npm ci` bersamaan** di direktori yang sama → `ENOTEMPTY`,
  pohon dependensi campur. `rm -rf node_modules` lalu satu kali saja; verifikasi
  dengan `npm ls --depth=0`.
- Postgres/Docker **tidak ada** di mesin ini ⇒ suite Playwright hanya dapat
  dibuktikan di CI PR, tidak lokal.

## Blokir terbuka — MILIK ARI, jangan dijawab

- `docs/usulan-SPR-kepemilikan-perikatan-reviu.md` — spr2400 tetap lapisan metodologi
  atau jadi kertas kerja? Investigasi menemukan `REV-2025-022` dan `ENG-2025-022`
  adalah **dua register untuk satu perikatan yang sama**, tanpa penghubung, dengan
  progres berbeda (60 vs 45). Lihat [[asseris-spr2400-salinan-kanon-materialitas]].
- `docs/usulan-SPR-materialitas-perikatan-reviu.md`

## Cabang terdampar lain (uji: bandingkan ISI berkas yang disentuh, bukan `git cherry`)

Genuinely terdampar (beda isi sumber nyata): `claude/fervent-tharp-227ee5` (SOQM
attest) · `claude/intelligent-keller-7b28db` (F-2 ekspor identitas SSOT, +4) ·
`fix/hcm-penilaian-karangan` · `fix/phase-canon` · `fix/regref-tahap-a2` ·
`fix/firmgl-rekonsiliasi-ekspor`.

Sudah mendarat, aman dihapus: `claude/mystifying-bun-9e08b3` ·
`docs/gelombang0-prompt-perbaikan` · `fix/cabut-arb-trm-058` ·
`test/firm-gl-actor-gerbang`. Empat lagi (`fix/firmtax-bupot-karangan`,
`fix/opening-sa510-prosedur`, `fix/orgchart-succession-a11y`,
`fix/sa610-internalaudit-register`) hanya beda di `migration/eslint-suppressions.json`
— berkas BERSAMA yang selalu bergerak; itu bukan tanda terdampar.

Resep uji:
```bash
mb=$(git merge-base origin/master $b)
files=$(git diff --name-only $mb $b)
git diff --name-only origin/master $b -- $files   # kosong ⇒ sudah mendarat
```
