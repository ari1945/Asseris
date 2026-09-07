---
name: asseris-on-dark-token-sweep
description: "Sweep hex on-dark → token — empat literal kembar, pemetaan \"struktural\" yang justru merusak kontras, dan gerbang yang di-lingkup lewat RONA"
metadata: 
  node_type: memory
  type: project
  originSessionId: a88d1ccc-d361-47d8-969b-57f4ccdc6cde
  modified: 2026-08-26T23:28:46.212Z
---

**PR #311** · cabang `fix/on-dark-token-hex` (2026-08-27), dari `origin/master` `8aecc49`. `npm run verify` HIJAU penuh (3536 uji depan + 461 belakang).
Dua commit: `3058836` gerbang MERAH → `37a73f0` sapuan. 65 berkas.

**Utangnya tercatat di kodenya sendiri.** `styles_base.css` (blok PR-C-6) menulis
"dipakai MENTAH di 58 berkas (122 kemunculan) … menyapu 57 berkas sisanya adalah
sweep tersendiri". Sebelum sensus manual, BACA komentar token — ia sering sudah
memberi tahu ukuran utangnya.

**Daftar di prompt hampir selalu belum lengkap.** Prompt menyebut 7 situs; sensus
nyata 232. Yang terlewat justru yang paling informatif.

## Temuan yang tak terlihat dari grep satu nilai
Sub-keterangan hero gelap ditulis EMPAT literal yang mata tak bisa bedakan —
`#9fc0d2` `#9fc1d4` `#9fc2d4` `#9fb9c8` — bersebelahan dengan `#bcd6e4`. Tampak
seperti hierarki dua-tingkat yang dirancang; sebenarnya penyalinan yang meleset
empat kali. Pola yang sama berulang di keluarga lain: `#7ee2b0`/`#ffd27a` adalah
drift dari `--on-dark-ok`/`--on-dark-warn`. **Grep satu nilai menyembunyikan
justru bukti driftnya** — enumerasi per-KONTEKS (semua `color:` di dalam panel
gelap) yang memunculkannya.

## Pemetaan yang "benar secara struktur" bisa MERUSAK kontras
Godaannya: `#bcd6e4` = eyebrow → `--on-dark-muted`; sub-keterangan → `--on-dark-faint`
(persis struktur `view_cockpit2`). ITU SALAH. Teks 11px ⇒ AA 4,5:1; pada henti
gradien paling terang `#005085`:
`#9fc0d2` **4,40 ✗** · `--on-dark-faint` **3,68 ✗** · `--on-dark-muted` **5,58 ✓**
`faint` MEMPERBURUK kegagalan yang sudah ada. Hierarki tetap terbawa huruf kapital
+ letterspacing. → **Hitung kontras sebelum memilih token, jangan menalar dari
nama peran.** (cockpit2 sendiri pakai `faint` di 3,68 — cacat DORMAN, tak disentuh.)

**Satu pemetaan ditolak karena REGRESI:** `#ffd2c9` → `--on-dark-danger` jatuh
5,96 → 3,92 (token itu dirancang untuk navy polos, bukan chip merah-tersemu).
Solusinya **menamai nilainya** (`--on-dark-danger-fg`) — bukan memaksanya ke
token terdekat. Keluarga sudah punya `--on-dark-danger-bg` tanpa pasangan depan.

## Kedua tema dijaga oleh SATU angka
`--blue-solid` **sengaja tidak di-override** di `:root.dark` ("pasangan
isian-solid … TIDAK di-override"). Jadi henti paling terang `#005085` sama di
terang & gelap → satu perhitungan kontras menutup dua tema. Jangan hitung dua kali.

## Gerbang: lingkupi lewat RONA, dan ukur batasnya
`on_dark_tokens.test.ts` — 3 aturan (nilai token tak boleh mentah · `color:` di
panel gelap wajib `var()` · setiap rujukan `var()` ke `--on-dark-*` terdefinisi).
- **Aturan 1 buta pada nada BARU** (keempat varian di atas belum pernah jadi token);
  aturan 2 buta pada situs tanpa gradien sebaris. Keduanya perlu ada.
- **Jendela rona DIUKUR, bukan ditebak.** Upaya pertama `185–225` menyeret panel
  **teal** `view_sa705` masuk: `#063b40` = **185,2°**, lolos ambang 0,2°. Navy nyata
  196,4–207,3 · teal ≤185,2 · hijau ~155 · ungu ≥255,6 · merah ~3–7. Dipakai **192–230**.
- **`some(NAVY)` bukan `every`**: satu baris bisa memuat DUA gradien lewat ternari
  (`view_sa230` hijau saat `ready`, navy bila tidak). `every` mengeluarkan panel
  campuran justru karena ia campuran.
- Uji **penjaga-vakum** wajib (detektor menemukan ≥30 berkas) — regex yang tak
  pernah cocok tampak HIJAU selamanya. Lihat [[asseris-s1-kode-mati-retensi-bo]].

## `css_tokens.test.ts` membaca KOMENTAR & STRING sebagai kode
Ia memindai seluruh `migration/src` untuk `var(\s*--xxx` **tanpa membuang
komentar**, dan hanya mengecualikan DIRINYA SENDIRI. Menulis `var(--on-dark-*)`
di komentar/pesan uji ⇒ token hantu `--on-dark-` ⇒ suite merah. Tulis
`token --on-dark-*` tanpa awalan `var(`. Senada: [[asseris-sales-pipeline-arc]].

## Jerat yang kena lagi
- **`git checkout -- <berkas>` MENGHAPUS kerja belum-commit** — dipakai untuk
  membatalkan mutation-test, ikut membuang sapuan berkas itu. Pakai salinan
  `.bak` atau commit dulu. Ulangan [[asseris-wip-rollforward-falsifiable]].
- **Backslash lenyap lewat heredoc tool Bash** — berkas uji padat-regex WAJIB
  ditulis dengan tool Write/Edit. Ulangan [[asseris-repo-hygiene-2026-08-19]].
- Klon lokal lagi: **empat** komponen bernama `Kv` dengan bentuk prop berbeda.
  Yang diekspor `view_calc` cuma SATU importir (`view_lease`). `grep '<Kv '`
  saja menyesatkan — telusuri `import { Kv } from`. Ulangan
  [[asseris-tipografi-gerbang-buta-ternari]].
- `npm install` menambah `"peer": true` ke lockfile (npm lebih baru) — kebisingan
  lingkungan, `git restore` sebelum commit.
- Worktree ini mulai TANPA `node_modules` (root, `migration/`, `server/` — tiga
  kali install, ~7 menit).

## Sisa yang SENGAJA tak disentuh (untuk Ari)
1. **Panel gelap ber-rona** — ungu/hijau/teal/merah/amber pakai muted SENADA
   (`#d6cdf0 #d4c8ee #bfe3cf #b9e0e3 #bfe3e0 #f0c9c4 #f0d4cf #e8d6a8 #ecdcb0`;
   16 situs, 5 rona). Memaksanya ke `--on-dark-muted` yang kebiruan MERATAKAN
   keselarasan rona. Butuh keluarga token ber-rona = **keputusan desain Ari**.
2. **77 gradien hero mentah** `linear-gradient(…,#013a52,#005085)`. `view_cockpit2`
   memakai token, sisanya tidak ⇒ panel-panel itu **tak mengikuti tema gelap**
   (`--navy-700` gelap = `#0d1d29`). Mentokenkannya MENGUBAH tampilan 77 panel.
3. Hero **HIJAU** `view_sa230` (`#0b5d3b,#127a4e`): muted hanya 3,54 — masih
   <AA. Akarnya gradiennya terlalu terang, bukan tokennya.
4. `view_psak22.tsx:166` pil memakai `background: var(--navy)` — token TEKS
   sebagai ISIAN; di tema gelap `--navy` = `#8298a1` (terang) ⇒ pil terang, teks
   `--on-dark-muted` ⇒ ~1,3:1. Cacat tema-gelap PRA-ADA, di luar lingkup.
5. `#9fc0d2` di `view_final3:200` & `view_misc1:537` = **outline dasbor
   contenteditable di latar TERANG**, bukan on-dark. Peran lain — sengaja dibiarkan.
