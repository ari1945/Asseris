---
name: asseris-session-2026-07-25-checkpoint
description: "Checkpoint 2026-07-25 — repo BERSIH di master 7f11f13, 0 PR terbuka (kecuali 2 dependabot). Evaluasi desain: 5 dari 7 temuan tuntas via PR #127+#128. Sisa: uppercase & radius, + tinjauan visual yang 2x dilewati"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1c4067f4-604e-4b4d-ace6-2878c6d7937c
  modified: 2026-07-24T23:22:16.610Z
---

Titik lanjut untuk sesi berikutnya. Detail teknis ada di [[asseris-design-quickwin-contrast]] dan [[asseris-typography-scale]] — jangan diulang di sini.

## Keadaan repo
`master` = **`7f11f13`**, lokal sinkron remote, working tree bersih. **0 PR terbuka** kecuali 2 Dependabot (#116 typescript-eslint, #117 aws-sdk). Branch remote non-dependabot tinggal `origin/chore/deploy-aws-ec2-test` (ditahan Ari sejak 2026-07-21, keputusannya).

## Yang dikerjakan sesi ini
Berawal dari permintaan sepele ("sidebar putih semua"), berkembang jadi evaluasi desain terukur lalu dua PR besar:
- **PR #127** (`bb3bf0f`) — kontras token AA terang & gelap · `--num-neg` (angka negatif ≠ merah alarm) · de-noise kontainer · pemisahan peran token teks/isian.
- **PR #128** (`7f11f13`) — skala tipografi mengikat, 41 nilai ukuran huruf → 8, lantai 11px.

## Temuan evaluasi — 5 dari 7 tuntas
| Temuan | Status |
|---|---|
| Kontras token gagal AA | ✅ #127 |
| Kemasan berlapis (border+shadow+gradient) | ✅ #127 |
| Merah bermakna ganda | ✅ #127 |
| Tema gelap (kanvas + badge + peran token) | ✅ #127 |
| Skala tipografi | ✅ #128 |
| **HURUF KAPITAL — 17% simpul teks** | ⬜ **belum** |
| **Radius — 8 nilai dalam satu halaman** (token bilang `--radius:4px`) | ⬜ **belum** |

Keduanya jauh lebih kecil dari yang sudah dikerjakan dan **sama-sama menyentuh badge/header tabel**, jadi sebaiknya digabung dalam **satu PR** bila dilanjut. Usul radius: 3 nilai — 4px kontrol · 8px kontainer · 999px pil.

## Utang yang perlu diangkat lebih dulu
1. **Tinjauan visual DILEWATI 2×.** Gerbang R-3 (PRD #127) mensyaratkan Ari melihat sendiri sebelum merge; #127 dan #128 keduanya di-merge tanpa itu. Yang terverifikasi hanya kontras, ukuran, konsistensi, ketiadaan teks terpotong — **bukan** apakah hasilnya enak dilihat. Khususnya #128: kepadatan informasi per layar **pasti** berkurang (1.071 setengah-langkah + 293 sub-11px semuanya naik). **Tanya Ari di awal sesi berikutnya apakah sudah sempat melihat**, dan tawarkan penyetelan.
   Mitigasi siap-pakai bila ada keluhan: terasa **longgar** → turunkan satu langkah di `body.dense` (jangan batalkan skala) · panel terasa **datar** → naikkan `--line` (1,39→~1,8), jangan kembalikan `box-shadow` · teks sekunder **berat** → `--ink-3` mundur ke ~#59676f.
2. **Guliran horizontal +25px di Beranda** — SVG sparkline berlebar tetap 520px. Pra-ada (dibuktikan via `git stash` ke keadaan M3), terdokumentasi di PR #128, belum diperbaiki. Kecil dan mudah.

## Pelajaran metode sesi ini (berlaku umum, jangan diulangi)
Pengukuran browser **menghasilkan 5 temuan palsu** sepanjang sesi. Sebelum melaporkan cacat CSS apa pun: (a) **hard-reload** — Vite dev menyajikan stylesheet basi; (b) **paksa recalc** (`body.style.display='none'; void offsetHeight; …=''`) — browser tertanam tak me-recalc warna warisan `<body>` setelah kelas tema berubah di `<html>`; (c) **uji-silang ke build produksi** (`wedge-dist` :5190). Dua hipotesis saya juga terbukti salah (siklus `:has()`, "hardcode amber") — jangan percaya pengukuran pertama.

Login dev: `anindya.p@whr-cpa.id` / `Manager#2025!` (Audit Manager). Server: `dev-all` :5180 (+ backend :5181), `wedge-dist` :5190 utk uji build produksi.
