---
name: asseris-tipografi-terhitung-lantai-geometri
description: "PR #312 — mencabut pengecualian \"ekspresi terhitung\" di gerbang §5; lantai 11px punya konsekuensi GEOMETRI yang harus diukur di peramban, bukan dinalar"
metadata: 
  node_type: memory
  type: project
  originSessionId: bea940ff-64ff-4ec8-b413-dadaf277b967
  modified: 2026-08-26T23:37:17.134Z
---

**PR #312 — MENDARAT `86ff9ce`** (squash; cabang dihapus). Berangkat dari
`master` setelah #310 mendarat di `b627215`. Menutup dua situs `fontSize` terhitung se-repo:
`ui.tsx` Avatar `size * 0.4` (6,4px pada diameter 16) dan `view_misc2.tsx`
FmtBadge `size * 0.185` (7,03px, satu pemanggil selalu default 38).

## Yang tak terduga

1. **Lantai tipografi memaksa perubahan GEOMETRI, bukan cuma ukuran huruf.**
   Diukur di peramban pada 11px/700: pasangan inisial lazim ("AW","TW") =
   18,8px; "MW" 21,7px; "WW" 23,1px. Artinya avatar berdiameter 16/17/18
   membuat huruf TUMPAH ke luar lingkaran (`.avatar` tak memotong) — teks
   putih di atas latar halaman. Enam situs pencilan dinaikkan ke 20. **Angka
   ini TIDAK bisa dinalar dari rasio; harus diukur.** Cara ukurnya: injeksi
   markup ke halaman login (CSS aplikasi sudah termuat, tak perlu backend)
   lalu `Range.getBoundingClientRect()` atas isi simpul.
   Sisa tegangan: dua inisial pada 11px butuh diameter ≥ 24 — 34 situs di
   tier 20/22 tetap sesak. SUDAH ADA sebelum PR; tidak diputuskan di sini.

2. **Perbaikan lewat KELAS, bukan `fontSize` inline.** `fs_tier.ts` (berkas
   tanpa React, agar teruji sendiri) memetakan piksel bebas → anggota skala
   terdekat; komponen memancarkan kelas `fs-xs`…`fs-d3`. Menaruh hasilnya di
   `fontSize` inline lewat sebuah `const` akan MENIPU gerbangnya — gerbang
   membaca teks di situs `fontSize:`, bukan aliran nilai.

3. **Jebakan cascade:** `.avatar` di `styles_chrome.css` memuat
   `font-size: 11px`. styles_chrome dimuat SESUDAH styles_base dengan
   spesifisitas sama ⇒ ia mengalahkan kelas `fs-*` dan membekukan semua
   avatar. Harus dicabut. Diuji eksplisit di `fs_tier.test.ts`.

4. **Gerbang butuh DUA bentuk.** Mencabut `if (/[*\/]/.test(ekspresi)) continue;`
   saja tidak cukup: `fontSize: size * ratio` **nol literal angka**, jadi
   sensus literal hijau selamanya di atasnya. Ditambah sensus BENTUK.

5. **`css_tokens.test.ts` memindai berkas UJI juga.** Menulis rujukan token
   harfiah dengan tier berupa placeholder (`var(--fs-${tier})`) membuatnya
   menuduh `--fs-` sebagai token tak terdefinisi. Rakit stringnya:
   `'var(' + '--' + 'fs-' + tier + ')'`.

6. **Heredoc Bash tool memakan backslash walau dikutip (`<<'EOF'`)**: `\\.`
   jadi `\.`. Regex di dalam `new RegExp(\`…\`)` rusak senyap. Tulis berkas
   uji lewat Python, atau pakai `.includes()` alih-alih regex.
   → lihat [[asseris-repo-hygiene-2026-08-19]]

## Sensus (angka yang dipakai di badan PR)

91 pemanggil `<Avatar>`; 63 jalur di bawah lantai sebelum perbaikan.
Diameter dipakai: 20(15) 22(19) 24(21) 26(8) 28(5) 30(10) 32 34(2) 36(2) 40
42(3) 44 46 48 50 92. Satu pemanggil dinamis (`RefLine` di `view_pc_org`)
memasok 26 & 30 — `grep '<Avatar.*size={[0-9]'` MELEWATKANNYA.

Terkait: [[asseris-tipografi-gerbang-buta-ternari]] · [[asseris-typography-scale]]
