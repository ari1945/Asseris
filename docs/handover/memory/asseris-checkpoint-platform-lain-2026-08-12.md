---
name: asseris-checkpoint-platform-lain-2026-08-12
description: "Evaluasi commit 18d6e69 \"chore: checkpoint\" (370 berkas, dikerjakan platform lain) — 3 dari 6 workflow CI merah di master, race lintas-engagement terbukti tapi belum ditutup"
metadata: 
  node_type: memory
  type: project
  originSessionId: c23808de-c801-4c39-b364-d89a205b7786
  modified: 2026-08-12T05:32:49.772Z
---

**2026-08-12.** Ari mengerjakan satu blok besar di platform AI lain, lalu di-push
langsung ke `master` sebagai **satu commit `18d6e69`**: 370 berkas, +8.245/−2.124,
pesan "chore: checkpoint pengembangan — e2e Playwright, migrasi stage 5/6,
hardening server, PRD W6–W15 & docs". Tanpa PR, tanpa PRD, tanpa review.

**Status master sesudahnya (diverifikasi via `gh run list`, semua HIJAU sebelum
commit ini):**
- `CI` **MERAH** — `migration` gagal di `npm test`.
- `deploy-smoke` **MERAH** (2 job) · `restore-drill` **MERAH**.
- `e2e` HIJAU (12 tes Playwright × Postgres, asersi sungguhan) · `dependency-audit`,
  `log-shipping-drill` hijau.

**Akar tunggal 3 workflow merah #1 (deploy-smoke ×2 + restore-drill):**
Stage 5 menghapus `token` dari respons `auth.login` (`server/src/router.ts` ~L265 —
sekarang `return { user: publicUser(user) }`, sesi cookie-only). Perubahan ini BENAR
secara keamanan, tapi tiga workflow masih `grep -q '"token"'` / `sed` ambil token
untuk header `authorization`. Login sendiri **200 OK**; asersinya yang basi.
GOTCHA: `restore-drill` mencetak pesan **menyesatkan** "seed itself produced a broken
audit chain — not a restore bug" padahal penyebabnya token kosong → 401. Drill DR
(backup→restore→verify hash-chain) belum pernah sampai ke langkah restore-nya.

**Akar merah #2 (CI):** berkas BARU `migration/src/stage0_context_races_repro.test.ts`
(2 tes) di-commit dalam keadaan **gagal** — repro jujur, bukan tes rusak.

**TERVERIFIKASI HIDUP 2026-08-12** (bukan bermock — `dev:all`, login Rekan Pemimpin,
modul Materialitas): geser slider materialitas **9% → 7%** saat ENG-2025-014 (PT
Sentosa Makmur) aktif, ganti engagement ke ENG-2025-031 (PT Bumi Hijau Agrindo) 1 ms
kemudian. Hasil di server: `mat.pct` **ENG-2025-014 tetap 9**, **ENG-2025-031 jadi 7**.
`AuditLog seq=514` mencatat STATE_SET ke 031 SEBELUM `seq=515` perpindahan → korupsi
terbaca sebagai tindakan sengaja. Dan `localStorage['ams.v1.engagement.ENG-2025-014.mat.pct']
= 7` → **layar berbohong**: dua auditor pada satu perikatan melihat materialitas berbeda.
Akar: `contexts.tsx` menugaskan ulang `targetRef.current` TIAP RENDER sedangkan `flush()`
membacanya SAAT TIMER 400 ms MENYALA — target tak ikut ditangkap ke closure debounce;
`cacheWrite` memakai target saat edit (karena itu cache ≠ server). Isolasi W7.5 tidak dan
TIDAK BISA menangkapnya: penulisnya berhak atas kedua perikatan.
**DITUTUP [PR #181](https://github.com/ari1945/Asseris/pull/181)** (Fase R). Perbaikan:
tulisan tertunda membawa `{scope,scopeId,key,cacheKey}`+`baseVersion` yang dibekukan SAAT
EDIT ke `pendingRef`; saat target berpindah/unmount, tulisan tertunda di-flush DULU ke
target lamanya (keputusan Ari: opsi (a), bukan dibuang). Diverifikasi hidup lagi dengan
probe identik: `mat.pct`=6 mendarat di ENG-2025-014, NOL baris untuk ENG-2025-031, cache
peramban sepakat dengan server. Artefak probe sudah dibersihkan dari `dev.db`.

**GOTCHA yang mahal waktunya:** repro #2 (`hydrateCoreFromApi` basi) TAK MUNGKIN dihijaukan
di `stage0_context_races_repro.test.ts` — di sana fungsi itu DI-MOCK, padahal ia pemilik
penjaganya, dan mock-nya memutasi `AMS.WTB` tanpa syarat. Dipindah ke `api.test.ts` (mock
transport tRPC, fungsi nyata dieksekusi). Kalau menemui repro yang "mustahil hijau", cek
dulu apakah mock-nya menggantikan justru unit yang seharusnya diuji.

**GOTCHA React:** `React.useRef<T>(…)` GAGAL di repo ini (TS2347 — tak ada `@types/react`,
hook-nya untyped). Pakai `React.useRef(null)` + `as T | null` di titik baca.

**Utang gerbang lain:**
- `@ts-nocheck` di berkas uji baru itu = SATU-SATUNYA di seluruh `migration/src`,
  dan tepat melubangi gerbang `typecheck:test` yang dibuat PR #155 karena insiden
  `SAMPLE_WTB`.
- Ratchet `:any` MUNDUR: 8.155 → 8.175 (+20). `wp_canon.ts` +8, `contexts.tsx` +7.
- `tools/verify.mjs` TIDAK menjalankan `vite build` / `check-bundle`, padahal
  CLAUDE.md §2 mengklaim "migration lint/typecheck/test/build". Lokal hijau ≠ CI hijau.
- `e2e/scripts/prepare-postgres.mjs` → `prisma generate` atas skema Postgres turunan
  menimpa `server/node_modules/@prisma/client` bersama dan **tidak dipulihkan**;
  sesudah e2e lokal, `cd server && npm test` mati total dengan "URL must start with
  postgresql://". Komentarnya mengklaim worktree tetap sqlite — benar untuk skema,
  salah untuk client. Perbaiki: `output` terpisah di generator skema turunan.
- `retentionWorker.ts approve --by <userId>` (Stage 6, penghapusan bukti audit)
  hanya mengecek user **ADA**, tidak pernah `can(role, CAP.FIRM_ADMIN)` — padahal
  usage-text-nya berkata FIRM_ADMIN. Jalur tRPC `attachment.purge.approve` DI-GATE
  benar. Jadi CLI bisa menstempel `purgeApprovedBy` + baris audit
  `ATTACH_PURGE_APPROVE` atas nama siapa pun → persetujuan fiktif, kelas cacat yang
  sama dengan [[asseris-aje-immutability-live-approvals]] dan
  [[asseris-wp-signoff-integrity]].
- Program "Stage 0–9" ini **tidak punya PRD sama sekali** (`docs/PRD-REGISTRY.md`
  tak memuatnya); satu-satunya jejak adalah 1 kalimat di BUILD.md:30 yang bilang
  `npm run verify` "sengaja merah". CLAUDE.md yang diedit di commit yang sama tidak
  menyebut itu → dua dokumen bertentangan.

**Yang benar-benar bagus (jangan dibongkar):** suite e2e Playwright × Postgres
(`e2e/tests/04-signoff-sod.spec.ts` menguji FORBIDDEN per-slot + satu-orang-satu-langkah
+ rantai audit), lifecycle retensi Stage 6 (kelas retensi KAP 7/10/5 thn, legal hold,
approve terpisah dari hapus-byte, re-cek kelayakan saat purge), coverage CI per-area,
window-strip ~150 `Object.assign(window,…)` bersih tanpa pembaca yatim, dan
`styles_chrome.css` baru patuh skala tipografi 8-ukuran.
