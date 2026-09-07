---
name: asseris-css-token-ghost-sweep
description: "Token CSS hantu (--ink-1 dkk) gagal DIAM-DIAM; sapuan repo-lebar + gerbang css_tokens.test.ts (PR-C-7), plus gotcha junction node_modules × prisma generate"
metadata: 
  node_type: memory
  type: project
  originSessionId: 40c7ecfe-a277-44ea-9c70-074ccc5673ec
  modified: 2026-08-15T23:12:18.049Z
---

Arc Engagement Cockpit **PR-C-6b** (branch `feat/cockpit-c7-ink-token-sweep`, di atas
`feat/cockpit-arc` — BUKAN master; `--on-dark-*` & `cockpit_conventions.test.ts` hanya ada
di arc). PR **#253**, commit `fc65276`, `npm run verify` + 9/9 CI HIJAU.

**KOREKSI PENOMORAN (pelajaran):** saya menamainya PR-C-7 mengikuti urutan commit arc —
salah. **PRD sudah memesan PR-C-7 = "Ekspor mengikuti layar".** Baca peta PR di PRD sebelum
mengklaim nomor arc. Diperbaiki jadi C-6b (turunan lingkup C-6, bukan butir peta jalan baru).

**PR-C-4 tidak hilang, sengaja ditahan:** PRD mengunci C-4 (jalur kritis) di belakang **Open
Question Q1** (`ENGAGEMENTS` tak punya `startDate`). Q1/Q2/Q3/Q5 masih terbuka, dan
**PRD masih `Status: Draft — menunggu sign-off`** padahal C-1..C-6 sudah diimplementasikan —
pelanggaran "PRD dulu, sign-off dulu" yang sudah terjadi sebelum saya. Arc dibuka sebagai
PR **#255** (base master) dengan ketiga hal itu ditulis sebagai blocker keputusan.

**Temuan inti: `--ink-1` bukan cacat tunggal melainkan KELAS.** Sapuan seluruh
`migration/src` menemukan 7 nama token yang tak pernah didefinisikan, 25 pemanggilan,
17 berkas: `--ink-1`→`--ink` (6) · `--surface-1`→`--surface` (10) · `--ink-5`→`--ink-4` ·
`--blue-bg`→`--blue-050` (2) · `--navy-050`→`--surface-3` (3) · `--navy-bg`→`--surface-2` ·
`--green-050`→`--green-bg` (2).

**Mengapa tak terlihat bertahun-tahun:** substitusi custom property yang gagal TIDAK
melempar error. Deklarasinya jadi *invalid at computed-value time* → properti jatuh ke
nilai **warisan** (`color`) atau nilai **awal** (`background-color` → **transparan**).
Terverifikasi hidup: `getComputedStyle(root).getPropertyValue('--ink-1')` = `''`.

**Aturan penggantian yang dipakai (bisa dipakai ulang):**
- Tanpa fallback → token keluarga yang dimaksud.
- Dengan fallback → token TERDEFINISI yang menghasilkan warna yang selama ini benar-benar
  TAMPIL ⇒ delta visual nol. **Kecuali** fallback hex mentah: `var(--surface-1, #fff)`
  memaku PUTIH di mode gelap — itu cacat, bukan status quo.
- Keluarga warna yang jelas dari konteks baris (sebelahnya `var(--amber-bg)`) menang atas
  fallback netral. Satu-satunya perubahan visual yang disengaja: 3 tempat.

**GOTCHA gerbang repo-lebar: ia akan menuduh DIRINYA SENDIRI.** Membuang komentar saja
tak cukup — judul `describe('… var(--x) …')` adalah KODE, dan langsung merah. Contoh token
dilarang muncul di luar komentar. (Senada dengan pelajaran gerbang cakupan di
[[asseris-budget-actual-ledger-derived]].) Gerbangnya juga memuat uji **"bukan gerbang
kosong"** (≥150 berkas, ≥60 token, ≥500 pemanggilan) — gerbang yang memindai nol berkas
lulus dengan gemilang. Difalsifikasi sebelum kirim: menanam `--ink-1` ⇒ 2 uji merah.
Batas sadar: token yang dirakit runtime (`'var(--' + tone + ')'`) tak terjangkau.

**GOTCHA KERAS lingkungan — junction `server/node_modules` × `prisma generate`:** worktree
baru datang TANPA node_modules. Men-junction ketiganya dari repo utama membuat
`npm test` di `server/` menjalankan `prisma generate` yang menulis ke `.prisma/client`
**milik worktree lain** ⇒ `EPERM rename query_engine-windows.dll.node.tmpNNNN` dan **36 uji
backend merah menyesatkan** (`version-mismatch:server=0`) yang TIDAK ada hubungannya dengan
perubahan apa pun. Obat: `cmd /c rmdir server\node_modules` lalu **`npm install` sungguhan
di `server/`** + `npx prisma generate` ⇒ 431/431 hijau. Junction untuk root & `migration/`
aman (tak ada codegen). Lihat juga [[asseris-timebudget-engagement-isolation]]
(varian klien BASI) dan [[asseris-checkpoint-2026-08-14]] (lepas junction SEBELUM hapus
worktree). Efek samping: `npm install` menyisipkan `"peer": true` di
`server/package-lock.json` — kembalikan dengan `git restore` sebelum commit.

**Browser pane tak ditampilkan** ⇒ `computer screenshot` gagal (tak ada frame), tetapi
`javascript_tool` + `getComputedStyle` untuk **warna** tetap dapat dipercaya dan itu yang
membuktikan `--ink-1` = string kosong. (Bandingkan [[asseris-icon-button-names]] yang
menyimpulkan getComputedStyle tak bisa dipercaya — yang tak bisa dipercaya adalah hal-hal
yang bergantung LAYOUT/compositing, bukan resolusi token warna.)
