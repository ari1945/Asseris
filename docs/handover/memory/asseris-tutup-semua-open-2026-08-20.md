---
name: asseris-tutup-semua-open-2026-08-20
description: "Sesi 2026-08-20 menutup SELURUH yang terbuka di Asseris — 8 PR mendarat, 14 cabang debris dihapus, nol PR/isu terbuka; plus gotcha npm-audit, vitest 4, dan cabang lokal yang tak pernah di-push"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1837004f-8725-4f68-8b5c-abf84f33eb01
  modified: 2026-08-20T02:49:28.992Z
---

**Perintah Ari: "selesaikan semua isu yg masih open" (2026-08-20).** Hasil akhir:
`origin/master` = `2632a23`, **nol PR terbuka · nol isu terbuka · remote hanya
`refs/heads/master`**, CI hijau 9/9. Yang mendarat: **#260** (audit deps) · **#259**
(regref Tahap A) · **#257** (SC-24a) · **#258** (register aset PR-1) · **#255** (arc
Cockpit C-1..C-7, dengan #253 dilipat ke dalamnya) · **#214·#261·#217·#215**
(dependabot) · **#262** (vitest 4 server) · **#263** (gerbang registri PRD) · **#264**
(arc Delivery PR-1..PR-3). **#218 & #253 ditutup karena isinya sudah masuk lewat PR lain.**

## Yang paling layak diingat

**1 — Gerbang bisa MEMERAH tanpa satu baris kode berubah.** `dependency-audit` jalan
pada *push ke master*, tiap PR, DAN mingguan. Advisory GHSA-ggr8-5vv4-36mx
(`deepmerge-ts <8.0.0`) terbit antara 17 dan 19 Agustus; sejak itu **semua** PR merah
dan me-merge apa pun akan memerahkan `master`. Rantainya
`prisma → @prisma/config → deepmerge-ts` dengan **pin KERAS `7.1.5`**, dan **tak ada
rilis prisma yang menutupnya** (advisory 6.13.0-dev.1…7.10.0; `latest` npm 7.9.1).
Satu-satunya jalan tanpa migrasi mayor: `"overrides": { "deepmerge-ts": "^8.0.1" }` di
`server/package.json`. `prisma` ada di dependencies PROD karena deploy menjalankan
`migrate deploy` — jadi ini permukaan produksi, bukan kebisingan dev.

**2 — GOTCHA KERAS: lockfile bisa berbohong tentang isi disk.** Setelah
`npm install --package-lock-only` lalu `npm install`, `npm ls` dan `package-lock.json`
berkata `deepmerge-ts@8.0.1` sementara `node_modules/deepmerge-ts/package.json`
**masih 7.1.5**. Hanya `npm ci` yang benar-benar menukarnya. **Selalu baca berkas di
disk, jangan percaya `npm ls`.**

**3 — vitest 4: angka coverage turun tanpa satu uji pun bergeser.**
`@vitest/coverage-v8` 4 memetakan ulang berbasis AST; v2 memakai rentang byte V8 mentah
yang MELEBIH-HITUNG. 431 uji lulus sebelum & sesudah, tetapi 7 ambang jatuh. **Cara
membedakannya dari regresi: lihat BENTUK pergeserannya** — `lines` nyaris diam
(audit 90→87,4), statements/branches/functions yang jatuh. Ambang di-baseline ulang +
seluruh angkanya dicatat di `vitest.config.ts`.

**4 — vitest 4 memanggil implementasi mock lewat `new`.**
`vi.fn().mockImplementation(() => ({ send }))` (fungsi panah) meledak:
*"is not a constructor"*. Perbaikannya `function () { return { send }; }` — sah di
kedua versi. Cacatnya SELALU ada; v2 hanya tak pernah menunjukkannya.

**5 — `migration` TAK BISA naik ke vitest 4.** Peer-nya `vite ^6|^7|^8`, sedangkan
app dibangun dengan vite 5.4. npm memasang vite kedua yang bersarang — lolos di laptop,
lalu `npm ci` GAGAL di CI: `Missing: esbuild@0.28.2 from lock file`. **Utang tercatat:
menaikkannya = arc migrasi vite 5→7 pada BUILD aplikasi, bukan bump dev-dependency.**

**6 — Ringkasan `docs/PRD-REGISTRY.md` meleset lewat AUTO-MERGE YANG BERSIH.** Ketika
dua cabang sama-sama menambah PRD, git me-merge baris ringkasan tanpa konflik dan
angkanya salah tanpa suara (`master` sempat berkata "In Progress 8" atas daftar berisi
10). Kini dijaga `migration/src/prd_registry.test.ts` (5 uji: parser tak boleh lulus
kosong · ringkasan = hitungan · berkas ada & status sah · status berkas = registri ·
tiap PRD terdaftar). **Gerbang itu langsung menangkap drift berikutnya** saat arc
Delivery di-rebase — pemakaian pertama di luar PR-nya sendiri.

**7 — GOTCHA: gerbang atas berkas `docs/` lulus VAKUM karena CRLF.** Git menormalkan
dokumen ke CRLF di working copy Windows; `split('\n')` menyisakan `\r`,
`indexOf('## Daftar')` meleset, parser kosong, dan "0 dari 0" itu HIJAU. Uji keempat
lulus tanpa memeriksa apa pun. **Setiap gerbang pemindai wajib punya uji "parser
benar-benar menemukan sesuatu".**

**8 — Pekerjaan selesai bisa bersembunyi di cabang LOKAL yang tak pernah di-push.**
`feat/delivery-pr1-rbac` menyimpan **3 commit + PRD lengkap** (arc Delivery PR-1..PR-3)
yang tak pernah punya remote maupun PR. Ditemukan lewat `git branch -vv`, bukan lewat
`gh pr list`. **Saat menyapu "yang masih terbuka", daftar PR TIDAK cukup — periksa
cabang lokal tanpa remote.**

**9 — Durasi uji absurd = beban mesin, bukan regresi alat.** Satu putaran verify
melaporkan dua uji konkurensi server dengan durasi **38 menit**. Penyebabnya proyek
lain (`D:\CoreSys`) menjalankan vitest + vite preview di mesin yang sama
(`Get-Process node` membuktikannya). Diulang saat senggang: 35 detik, 431 hijau.

**10 — Dua PR yang tumpang tindih: lipat subset ke superset SEBELUM squash.** #253
(C-1..C-6b) dan #255 (C-1..C-7) berbagi lima commit tetapi masing-masing punya yang tak
dimiliki lawannya. Mendaratkan keduanya terpisah = PR kedua harus memutar ulang commit
yang identitasnya hilang karena squash. Digabung dulu di satu cabang → satu merge.
Bonus: gerbang token `css_tokens.test.ts` jadi berjalan di atas kode C-4 & C-7 juga.

## Kebersihan repo

**14 cabang dihapus** (3 sa620 + 11 lainnya) setelah dibuktikan isinya ada di master —
buktinya PR MERGED + berkas fiturnya benar-benar ada (`COLLECTION_MAX_FILE_BYTES.sa540 =
20 MB`), **bukan** `git diff` dua-titik yang selalu besar karena master sudah bergerak.
Remote kini hanya `master`.

## Yang TIDAK bisa ditutup, dan sebabnya

- **Menunggu DATA dari Ari:** Lampiran PMK 168 (`TER_TABLE.verified=false`) · daftar cuti
  bersama SKB 2026 · konfirmasi `jpCap 10.547.400` angka 2026 atau warisan.
- **Menunggu KEPUTUSAN Ari:** regref **Tahap B** (data regulatori dapat disunting admin
  firma + atestasi + jejak audit).
- **Disetujui tapi belum dikerjakan:** `prd-firm-erp-deepening` **PR-2..PR-6** ·
  `prd-delivery-milestones-deepening` **PR-4..PR-6**. Keduanya arc penuh, bukan sisa.
- **Utang berdiri:** 35 kontrol tanpa `<label>` sama sekali (`goingconcern` · `sa540` ·
  `sa520`) · 71 tombol tanpa handler · `migration` di vite 5/vitest 2.

Terkait: [[asseris-regref-annual-arc]] · [[asseris-sdm-kepatuhan-arc]] ·
[[asseris-firm-erp-deepening-arc]] · [[asseris-css-token-ghost-sweep]] ·
[[asseris-repo-hygiene-2026-08-19]] · [[asseris-tooling-gh]]
