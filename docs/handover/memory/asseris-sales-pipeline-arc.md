---
name: asseris-sales-pipeline-arc
description: "Arc Sales Pipeline (PRD 6 PR) — register peluang tunggal, penerimaan terfalsifikasi, integritas serah-terima; PR-1 selesai + gotcha verifikasi live"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3e2644b1-aae7-4a82-8bf3-d8e6da21ece1
  modified: 2026-08-15T18:00:23.062Z
---

**PRD `docs/prd-sales-pipeline-deepening.md`** (2026-08-15) — disetujui Ari dengan
"Saya ikut rekomendasi anda": Q-1..Q-5 = rekomendasi saya, Q-6 = opsi b (materialitas
dari figur entitas bila ada, fallback kosong; **JANGAN kelipatan fee**).

**ARC TUNTAS & MERGED.** [PR #254](https://github.com/ari1945/Asseris/pull/254) squash-merged
2026-08-15 → `origin/master` = **`1bdc7e8`**. 9 check CI hijau; isi master
diverifikasi lokal (`npm run verify` hijau) dengan merekonstruksi isinya, karena
`git checkout master` DITOLAK — branch itu dipakai worktree sesi lain
(`sleepy-curran-2acd84`). SC-1..SC-16 tertutup.

**PR-6:** `BI_WINLOSS` literal (75%) dicabut → win/loss & alasan kalah diturunkan
dari tanggal keputusan + taksonomi alasan yang ditangkap saat transisi (TTM kini
44%, 4 menang · 5 kalah). Kartu jadi `<button>` native + **pindah-tahap tanpa
tetikus** lewat `<select>`. Sheet beralamat `#/pipeline/<OPP-id>`.

**Temuan PR-6 yang paling berharga: LUBANG DI KONTRAK V-9 SENDIRI.** Sumbu
`tab`/`sel` sudah DITULIS ke alamat sejak V-9 tapi tak pernah DIBACA saat masuk
dari luar — `useInitialTab`/`useInitialSelection` hanya membaca sessionStorage
yang diisi `navigate()`. Tautan yang dibagikan mendarat di modul yang benar
dengan rekaman TIDAK terbuka, dan itu tak pernah terlihat dari dalam aplikasi
karena navigasi internal selalu lewat `navigate()`. Ditambal lewat `oneShotSeeds`
(murni, di `route_hash`, diuji) ⇒ **seluruh modul beralamat ikut sembuh.**

**PR-5 hasil:** build-up jam×tarif jadi dasar nilai; `CAP_BLENDED_RATE` (800rb) &
`PIPELINE_BUDGET_RATE` (700rb) DICABUT ke SSOT `FIRMFIN.WIP_BILL`; demand kapasitas
DIPISAH "tercatat vs estimasi" (resolusi Q-3 yang kontradiktif di PRD: dipisah,
bukan dibuang). Dua kebohongan pembulatan tertutup: bagian tak menutup ke total,
dan headline tak menutup ke bagiannya.

**UJI BACKEND (34 merah) — TUNTAS**, commit `1c4a0a7`. `npm run verify` HIJAU PENUH.

**PR-4 hasil:** `history` jadi DATA register (backfill 14 peluang seed) ⇒ umur,
macet per-ambang tahap, conversion + median hari, **win rate PER PERIODE**, dan
disiplin probabilitas (default tahap 20/40/60/75 ± 10; menyimpang tanpa alasan =
eksepsi). **`moveWithHistory` memulihkan probabilitas** saat kartu kembali dari
Won — cacat yang ditemukan verifikasi PR-1 (Rp 320 jt tertimbang palsu dari satu
perjalanan bolak-balik).

**PR-3 hasil:** serah-terima berhenti mengarang. `canon_pipeline_handoff.ts`
MEMUTUSKAN (`planHandoff`) lalu MENULIS (`applyHandoff`) — materialitas & jam
anggaran dikosongkan dengan alasan tercetak; partner dari roster staf (**yang
menghalangi PERAN, bukan gelar** — Bayu ber-CPA tapi Audit Manager); duplikat
jadi tombol "Buka Prospek PROS-xx"; cross-sell diarahkan ke Keberlanjutan;
serah-terima TIDAK lagi menandai Won. `window.amsAddProspect` DICABUT (nol
pembaca). Konsekuensi hilir ditutup di PR yang sama: konversi prospek→perikatan
kini digerbangi materialitas SA 320 + partner SA 220.14.

**PR-2 hasil:** 8 dari 14 peluang punya hal terbuka yang dulu hijau semua.
Dua aturan yang menentukan: (1) **register mengalahkan penilaian-diri** — skor
faktor = penilaian tim atas dirinya; deklarasi/skrining/rotasi = fakta terdaftar;
(2) **hal terbuka MENGHALANGI** — "siap terbitkan surat" menuntut `issues === 0`,
bukan cuma akseptasi + PMPJ.

## Yang ditemukan (dasar seluruh arc)

Tema: modul yang terlihat selesai, tapi tak satu pun angkanya menutup.

- **Dua register peluang**: `AMS.PIPELINE` (OPP-1xx, klien baru) vs
  `AMS.CRM_360[*].opps` (OPP-2xx cross-sell, hanya dibaca view_crm2). Cross-sell
  ±Rp 3 M tak pernah masuk pipeline firma.
- **Modul menulis persist, semua konsumen baca seed** (view_bi · view_bi2 ·
  view_capacity · data_platform buildApprovals). Sama dengan cacat WTB PR-3/4/5 & #241.
- **Panel "Penerimaan Klien (SA 220/SMM)" tak bisa gagal**: integritas & independensi
  dipaku `ok: true`; dua sisanya dari `stage`/`prob` — sirkular. Padahal datanya ADA:
  PROS-01/03/05 sudah punya keputusan akseptasi (Feb 2026), `INDEPENDENCE` EMP-008
  Bayu Saputra `declared:false`, EMP-003 Sari Dewanti `conflicts:1`. → PR-2.
- **Serah-terima mengarang**: `materiality = value × 2,5` (plug rata-rata rasio seed;
  mengalir ke `addEngagement`), `partner = owner + ', CPA'` (mengangkat Manager jadi
  Partner ber-CPA), `amsAddProspect` menulis localStorage mentah & `return` SENYAP
  bila duplikat — 4 dari 7 peluang sudah punya prospek. → PR-3.
- `BI_WINLOSS.winRate = 75` literal vs modul 33% turunan — dicabut di PR-6.
- `PIPELINE_BUDGET_RATE` 700rb vs `CAP_BLENDED_RATE` 800rb: dua tarif satu konversi. → PR-5.

## Temuan tambahan dari verifikasi live (bahan PR-4)

- **Won menyetel `prob=100` secara destruktif**; memindahkan kembali ke Negotiation
  TIDAK memulihkan 75% — probabilitas lama hilang permanen.
- **Tak ada UI menyunting peluang yang sudah ada** — nilai/prob/owner/close hanya
  bisa diisi saat pembuatan. Detail sheet cuma punya Menang/Kalah/Onboarding.

## GOTCHA (mahal, jangan ulangi)

1. **Gerbang cakupan yang mengg-grep sumber WAJIB membuang komentar.** Komentar yang
   MENJELASKAN pola lama (`AMS.PIPELINE`, `.opps`) menggagalkan gerbangnya sendiri.
   Menghapus penjelasan sejarah demi menghijaukan gerbang = kemunduran.
2. **`data_fpm.ts` men-`Object.assign(AMS, …)` lewat IIFE dan TIDAK mengekspor apa pun.**
   Di luar boot (uji/seed) `AMS.CRM_360` undefined → register diam-diam kehilangan
   separuh isinya, TANPA error. Wajib `import './data_fpm'` efek-samping.
3. **Dev server di :5180 bisa milik SESI LAIN dengan worktree berbeda.** Buktikan
   dulu perubahan Anda terlihat di sana sebelum percaya hasil verifikasi. Solusi:
   entri `vite-5186` baru di `.claude/launch.json`.
4. **`useAmsPersist` = server-backed bila :5181 hidup** (walau dinyalakan sesi lain).
   `localStorage.removeItem` + reload TIDAK mereset — dokumen kembali dari server.
   Pemulihan: `const { api } = await import('/src/api.ts')` (Vite menyajikan modul
   sumber di dev) lalu `api.state.get.query({scope:'firm',scopeId:'FIRM-WHR',key})`
   dan `api.state.set.mutate({...key, value, baseVersion: doc.version})`. Perlu
   **reload** sesudahnya — `useServerState` tak punya broadcast (arc #237).
5. **Drag HTML5 sintetis butuh `dragstart` dan `drop` di TICK BERBEDA** — handler
   `drop` menangkap `dragId` dari render saat itu; satu tick = `dragId` masih null.
6. **`docs/PRD-REGISTRY.md` & `.claude/launch.json` sedang ditulis sesi lain** —
   suntingan saya ke registry pernah hilang tanpa jejak. Periksa ulang sesudah
   mengedit; worktree ini DIBAGI dengan sesi Claude lain yang aktif menulis.
7. **`npm run verify` bisa melaporkan PASSED sementara `migration` lint exit 2.**
   Terjadi nyata pada PR-1: baseline `:any` jadi basi (turun 50) dan gerbangnya
   tidak menangkapnya pada run itu, padahal `spawnSync` verify.mjs memang
   mengembalikan status=2 bila diuji langsung. **ATURAN BARU: setiap PR yang
   menyentuh berkas ber-`any` WAJIB `npm run lint:any-baseline` + cek
   `node node_modules/eslint/bin/eslint.js src; echo $?` SENDIRI — jangan
   percaya "VERIFY PASSED" saja.**
11. **Angka headline WAJIB = penjumlahan bagian yang ditampilkan.** Dua kali dalam
   satu PR: `demandSplit` membulatkan bagian & total terpisah (171 vs 172), lalu
   KPI kapasitas menghitung ulang totalnya sendiri di atas pemisahan dari
   penghasil lain (171 di atas 95+77). Satu angka, satu penghasil.
10. **`mergeSeed*` = celah rilis untuk FIELD BARU, bukan cuma baris baru.**
   Menambah field pada seed (mis. `history` PR-4) TIDAK sampai ke siapa pun yang
   sudah punya dokumen terpersist — hanya baris yang HILANG yang disembuhkan.
   Ditemukan verifikasi hidup, bukan uji. Saat menyembuhkan field baru, tanyakan
   apakah field itu FAKTA TETAP (aman disalin: `origin`/`clientId`) atau
   RANGKAIAN PERISTIWA yang harus konsisten dengan keadaan sekarang (riwayat →
   hanya salin bila tahap akhir seed = tahap tersimpan; kalau tidak, biarkan
   kosong dan biarkan turunan berkata "—").
9. **Verifikasi hidup butuh backend :5181 HIDUP.** Bila proses itu mati (mis.
   dimatikan sesi lain), Vite proxy `auth.me` ECONNREFUSED → app jatuh ke layar
   LOGIN dan tak merender apa pun. **Saya tidak boleh mengetik kata sandi** →
   verifikasi UI berhenti sampai Ari login. Gejalanya menipu: konsol hanya
   menampilkan 500/404 dan "hmr failed", bukan pesan auth.
8. **Fallback pencocokan berbasis NAMA itu berbahaya bila satu entitas punya
   banyak perikatan.** OPP-201 (ESG Rp 480 jt) tertaut ke PROS-04 (prospek AUDIT
   klien yang sama, Rp 1.850 jt). Yang MENGUNGKAPNYA adalah peringatan selisih
   nilai — instrumentasi kecil yang menangkap tautan salah.

## Sisa arc

PR-2 penerimaan terfalsifikasi · PR-3 integritas serah-terima · PR-4 riwayat tahap,
umur, velocity, disiplin probabilitas · PR-5 build-up fee→jam (kapasitas berhenti
menebak) · PR-6 win-loss turunan + aktivitas + a11y/alamat.

Terkait: [[asseris-budget-actual-ledger-derived]] (pola gerbang cakupan),
[[asseris-firmfin-ledger-derived]] (pola SATU PINTU `useFirmCoa`),
[[asseris-cash-bank-recon-register]] (`mergeSeed*` menyembuhkan yang HILANG),
[[asseris-authoritative-persist-key-recipe]] (capForWrite → gagal tulis senyap).
