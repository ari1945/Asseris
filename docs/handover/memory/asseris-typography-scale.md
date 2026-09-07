---
name: asseris-typography-scale
description: "2026-07-25 skala tipografi Asseris — ✅ MERGED master PR #128 (7f11f13): 41 nilai ukuran huruf → 8 (teks 11/12/13/15/19 + display 22/28/34), lantai 11px, aturan mengikat di CLAUDE.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1c4067f4-604e-4b4d-ace6-2878c6d7937c
  modified: 2026-07-24T23:20:09.705Z
---

Temuan berdampak-mata tertinggi dari [[asseris-design-quickwin-contrast]] yang tersisa; dikerjakan setelah PR #127 merge.

**Skala MENGIKAT, kini tercatat di `CLAUDE.md` §5** — teks `--fs-xs/sm/md/lg/xl` = **11·12·13·15·19**, display `--fs-d1/d2/d3` = **22·28·34**. **Lantai 11px.** Dilarang setengah-langkah. Berlaku untuk CSS *dan* `fontSize` inline `.tsx`.

**Hasil:** inventaris **41 nilai → 8**, di luar skala **1.667 → 0**, atas 2.861 deklarasi. Beranda dari **10 ukuran & 72% simpul teks ≤11px → 4 ukuran & 0%**; WTB 9→3 ukuran. Kontras 3 modul × 2 tema = **6 kombinasi, 0 pelanggaran**. Gerbang hijau + 565/565.

**✅ MERGED master PR #128 (`7f11f13`), 193 berkas.** Empat commit: M1 token+CLAUDE.md (nol perubahan visual) · M2 setengah-langkah 1.071 · M3 langkah penuh + display 260 · M4 lantai 293.

**Urutan tahap SENGAJA dibalik dari intuisi:** setengah-langkah dulu (pergeseran ≤1px, mustahil overflow) meski bukan yang paling terlihat; **lantai 11px terakhir** karena memikul hampir seluruh risiko (293 deklarasi, mayoritas teks KAPITAL ber-letter-spacing di badge/chip/header tabel berlebar tetap; 10,5→11 pd kapital ≈ +5% lebar).

**Alat: `fs-tool.ps1`** (scratchpad sesi) — mode `inventory` & `migrate "11.5=12,..."`. Empat bentuk penulisan harus ditangani: `font-size:Npx` · `font:` shorthand (`700 9px/1`) · `fontSize: N` · `fontSize:'Npx'`. **Lookaround `(?<![\d.])`/`(?![\d.])` WAJIB** — tanpa itu `12` ikut mencocoki `12.5`. Verifikasi = jalankan inventory sebelum & sesudah, cocokkan dgn peta migrasi; jumlah tak cocok = gagal.

**Keputusan (OQ PRD, dijawab sendiri krn Ari hanya bilang "Proceed"):** tier display 22/28/34 **masuk** (122 deklarasi 20–46px = angka KPI/hero, tier teks tak bisa menampungnya) · **12,5 → 12 turun bukan naik ke 13** (566 deklarasi di kontrol padat; naik = tambah tinggi baris di ribuan tempat, lawan karakter "dense enterprise") · aturan umum = **langkah terdekat**.

**PENGECUALIAN, tak ada di PRD:** `view_presentasi.tsx` **dikeluarkan** — 62 dari 67 deklarasinya di kelas slide `.pr-*` (sampul 60px, nomor seksi 200px); konteks slide layar-penuh, bukan UI aplikasi. Juga terdaftar: `#print-area`, dan `body.dense` boleh turun satu langkah.

**Uji geometri (bukan mata) menutup risiko overflow:** `scrollWidth > clientWidth+1` per elemen pd 5 permukaan × 2 lebar viewport, baseline diambil SEBELUM M4. Hasil terpotong **1→1** — satu-satunya adalah `.side-item .lbl` yang memang ellipsis by-design. Nol overflow baru, jadi OQ-3 (kurangi letter-spacing) tak perlu dijalankan.

**Temuan pra-ada, DI LUAR cakupan:** Beranda punya guliran horizontal +25px dari **SVG sparkline berlebar tetap 520px**. Dipastikan pra-ada lewat `git stash` ke keadaan M3 (identik 1062/1037), bukan akibat perubahan tipografi.

**GOTCHA:** sempat commit M1 langsung ke `master` — diperbaiki dgn `git branch feat/typography-scale` lalu `git reset --hard origin/master`. Selalu branch dulu setelah PR sebelumnya merge (checkout balik ke master).

Sisa temuan evaluasi yang belum dikerjakan: **17% simpul teks HURUF KAPITAL** dan **8 nilai radius** dalam satu halaman.
