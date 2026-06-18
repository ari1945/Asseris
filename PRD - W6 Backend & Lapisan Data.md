# PRD — W6 · Backend & Lapisan Data (NeoSuite AMS)

> Wajib sign-off ("Proceed.") sebelum implementasi.
> Acuan: `Evaluasi NeoSuite AMS - Kesiapan Pengembangan Claude Code.html` §07 (W6·1, W6·2);
> peta seam `Peta Jalan Teknis - Handoff Claude Code.html`. Lanjutan setelah W0–W5 (arc
> `neosuite-ams-arc`): ESM-only, canon TypeScript full-strict, Vitest net 49 hijau.
> **Gelombang pertama Fase B** — eval menandai Fase B "butuh keputusan arsitektur (skema,
> auth, deploy)". Keputusan stack & scope di §11 sudah diambil (AskUserQuestion 2026-06-18).

| Field | Isi |
|---|---|
| Tanggal | 2026-06-18 |
| Pemilik | Ari Widodo |
| Status | **DRAFT — menunggu sign-off** |

---

## 1. Problem
Seluruh status perikatan NeoSuite AMS hidup di **localStorage browser** sebagai satu-satunya basis
data (gap eval P·A·DATA → Wave 6). `usePersisted('aje'…)`/`useAmsPersist('…')` di
`migration/src/contexts.jsx` membaca/menulis `ams.<key>` & `ams.v1.<key>` per-browser. Konsekuensi:

- **Tidak ada SSOT lintas-perangkat.** Dua auditor (atau dua browser) tak pernah melihat status
  perikatan yang sama; tak ada kolaborasi, tak ada penegakan integritas.
- **Data terikat device & rapuh.** Clear-cache / ganti mesin = kehilangan kertas kerja, sign-off,
  keputusan diagnostik, review notes. Tidak dapat diandalkan untuk pekerjaan KAP nyata.
- **Tak ada kontrol konkurensi.** Tak ada cara mencegah dua tulisan saling menimpa.
- **Seed = konstanta runtime.** `CLIENTS/ENGAGEMENTS/WTB/TEAM` di `data.js` adalah data demo yang
  tercampur kode — bukan seed DB / fixtures yang bisa di-reset & diuji.

Catatan jujur: app saat ini berjalan di **data demo fiktif** (mis. `ENG-2025-014`), bukan berkas
klien nyata Ari. Maka kerahasiaan riil adalah perkara **hilir (W10/ISQM)**; W6 bertujuan memindahkan
**fondasi penyimpanan**, bukan mengangkat data nyata.

## 2. Objective
Pindahkan SSOT status perikatan dari localStorage ke **backend (API + DB)**; localStorage turun
pangkat jadi **cache offline**. Status dibagikan lintas-browser, tahan reload, dengan
**optimistic-concurrency** mencegah tabrakan tulis. Seed dipindah ke **seed DB + fixtures**; engine
canon membaca status **via argumen**, bukan `window`/localStorage. Semua **tanpa regresi numerik**
terhadap baseline W0 dan net Vitest 49.

## 3. Success Criteria (= DoD W6·1 + W6·2)
- **Dua browser berbeda berbagi status perikatan yang sama**; muat ulang tanpa kehilangan data.
- Engine canon (`materiality`, `psak*`, `reconcile`, `figuresFromWTB`, …) membaca status dari
  server **via argumen** — tidak dari localStorage.
- **Optimistic-concurrency** (versi per-dokumen, compare-and-swap) mencegah tabrakan tulis
  antar-pengguna; penulis yang kalah mendapat konflik + refetch, bukan timpa senyap.
- `CLIENTS/ENGAGEMENTS/WTB/TEAM` berhenti jadi konstanta runtime di `data.js` → **seed DB +
  fixtures**; `data.js` hanya menyisakan helper murni (`fmt`/`rp`) & engine. App memuat data inti
  dari **API**.
- **Gate teknis:** `lint` hijau; `typecheck` (strict) hijau **termasuk paket `server/`**; **49
  Vitest canon + test diagnostik tetap utuh**; live oracle (fingerprint canon 74 / AMS 142)
  **identik** dgn baseline; materiality OM 4.260 / PM 3.195 / CTT 213 tak bergeser; 0 console error;
  diverifikasi live (SPA + server lokal).

## 4. Scope
- **Paket baru `server/`** (Node + TypeScript): tRPC router + Prisma + SQLite (dev), siap-Postgres.
  - `schema.prisma`: entitas inti (`Firm`, `User`, `Client`, `Engagement`, keanggotaan tim) +
    **`StateDoc`** — tabel key/value ber-versi: `(scope, scopeId, key, valueJson, version,
    updatedAt, updatedBy)`. `scope ∈ {engagement, firm, user}` memetakan kunci `ams.*`/`ams.v1.*`
    ke baris yang benar (status perikatan → scope=engagement; prefs → scope=user).
  - Router: `state.get(scope,scopeId,key)`, `state.set(... , baseVersion)` (compare-and-swap →
    konflik 409), `bootstrap(engagementId)` (entitas inti + WTB untuk hidrasi awal), `engagement.list`.
  - Seed script dari konstanta `data.js` saat ini (nilai **identik** → nol pergeseran angka).
- **Seam persistensi ber-API** (`contexts.jsx`): varian `useAmsPersist`/`usePersisted` yang
  fetch-on-mount (per `activeEngagementId` + key), mutasi optimistik ter-debounce dgn `baseVersion`,
  localStorage sbg cache read-through/write-through + fallback offline. Gerbang boot (hydrate
  sebelum render penuh) memakai cache sbg tampilan instan.
- **Kanon menerima WTB sbg argumen** (W6·2): hilangkan pembacaan `window.AMS.WTB` saat module-load;
  `FIG`/`SRC` dihitung lazy/injectable agar app dapat hidrasi WTB dari API saat boot.
- **Dev tooling:** Vite dev-proxy `/trpc` → server; skrip `npm run server` / dev gabungan; BUILD.md
  diperbarui; `.gitignore` untuk `dev.db`.

## 5. Non-Scope (eksplisit)
- **Auth, sesi, RBAC nyata → W7.** W6 berjalan **tanpa auth**, hanya lokal (`localhost`). API
  belum boleh diekspos jaringan sebelum W7. `updatedBy` diisi dari `USER` mock yang ada.
- **Proxy LLM / RAG → W8.** Narasi LLM P4 tetap tergerbang (lihat `neosuite-ams-p4-diagnostic`).
- **Integrasi/konektor nyata (Coretax/Bank/PrivyID/SharePoint) → W9.**
- **Enkripsi at-rest, retensi 10thn/ISQM, audit-trail append-only server, ekspor nyata,
  observability, CI/CD, deploy → W10.**
- **Kolaborasi real-time** (kursor langsung/CRDT): tidak. Cukup last-write-wins + optimistic
  concurrency + refetch konflik.
- **Migrasi penuh 24 tabel skema.** W6 hanya entitas inti + StateDoc; tabel domain lain menyusul
  per-gelombang saat dibutuhkan.

## 6. Constraints
- **Nol regresi numerik** vs baseline W0 (`W0-BASELINE.md`) & net Vitest 49 + test diagnostik.
  Seed = nilai `data.js` saat ini, byte-identik secara semantik.
- **TypeScript strict** meluas ke `server/`; `npm run typecheck` 0 error. Tipe domain **dibagi**
  dari `canon_types.ts` (client↔server satu sumber).
- **ESM-only** dipertahankan; `app/` + `NeoSuite AMS.html` buildless tetap **referensi beku** — tak
  disentuh. Hanya `migration/src` + `server/` baru.
- **SQLite dev, Postgres-ready:** tanpa SQL spesifik-vendor; flip via satu baris `datasource`.
- Lingkungan dev **Windows/PowerShell**; skrip lintas-platform.
- localStorage **didemosikan** (cache), bukan dihapus — jalur offline tetap fungsional.

## 7. Existing Solutions (prefer-existing)
- Eval sudah meresepkan **API + DB** + pemetaan kunci→endpoint; PRD ini mengikatnya ke stack konkret.
- **Prisma + tRPC**: matang, type-safe end-to-end, tak menduplikasi skema request/response — cocok
  dgn monorepo TS yang sudah ada (reuse `canon_types.ts`).
- **Reuse W4 oracle harness** (fingerprint per-key djb2) sbg gerbang regresi runtime; reuse Vitest
  net sbg gerbang unit. Tak ada yang dibangun ulang.
- **SQLite** = "existing solution" paling ringan (nol-ops, file tunggal) yg memenuhi DoD; Postgres
  ditunda ke saat deploy (W10) lewat datasource Prisma.

## 8. Proposed Approach
Monorepo: tambah `server/` di sisi `migration/`. tRPC router type-safe; Prisma memetakan entitas
inti + `StateDoc` ber-versi. Seam `contexts.jsx` di-rewrite **di belakang antarmuka hook yang sama**
(`useAmsPersist(key,initial)` tetap kontraknya) sehingga ~ratusan call-site tak berubah — hanya
internal hook yang beralih dari localStorage ke fetch+mutate+cache. Optimistic-concurrency lewat
kolom `version` (compare-and-swap; mismatch → 409 → client refetch + toast konflik). Boot:
`bootstrap(engagementId)` menghidrasi `window.AMS` (entitas + WTB) **sebelum** canon menghitung,
menggantikan WTB-konstanta; canon di-refactor agar `FIG`/`SRC` injectable.

## 9. Risks
- **R1 — Kopling canon↔`window.AMS.WTB` saat load (tinggi).** Memindah WTB ke async memutus
  perhitungan FIG di module-load. *Mitigasi:* refactor injectable + gerbang hidrasi-sebelum-render;
  fixtures byte-identik → angka tak bergeser; Vitest setup sudah men-stub window (pola W4 dipakai
  ulang).
- **R2 — Boot async / flash empty-state (sedang).** *Mitigasi:* cache localStorage sbg tampilan
  instan; loading gate; optimistic.
- **R3 — Konkurensi salah → timpa senyap / deadlock (sedang).** *Mitigasi:* compare-and-swap +
  test integrasi router (dua tulis berurutan, yang kedua harus 409).
- **R4 — Scope creep ke W7/W8 (sedang).** API tanpa auth menggoda untuk "sekalian". *Mitigasi:*
  non-scope keras §5; localhost-only; flag prod butuh W7.
- **R5 — Dev loop lebih berat (rendah).** Perlu server + Vite jalan bareng. *Mitigasi:* skrip dev
  gabungan + dok BUILD.md.
- **R6 — Pemetaan scope kunci salah (sedang).** Sebagian kunci kini global di localStorage tapi
  semantiknya per-engagement. *Mitigasi:* tabel pemetaan eksplisit di Fase 1 (lihat Open Q1).

## 10. Implementation Plan (arc berfase — gerbang per fase)
- **Fase 0 — Skema + skeleton server.** `server/` (Node+TS+tRPC+Prisma/SQLite); `schema.prisma`
  (entitas inti + StateDoc); seed dari `data.js`; router `state.get/set/bootstrap/engagement.list`;
  **test integrasi** compare-and-swap. *DoD:* server boot, seed terisi, router test hijau, typecheck
  hijau. *Belum* menyentuh client.
- **Fase 1 — Seam persistensi ber-API.** Rewrite internal `useAmsPersist`/`usePersisted` →
  fetch+mutate+cache, ber-scope `activeEngagementId`. Pemetaan kunci→scope. *DoD:* **dua browser
  berbagi status; reload tanpa kehilangan data**; localStorage = cache; 0 console err.
- **Fase 2 — Optimistic-concurrency.** `version` end-to-end; surface konflik (refetch+toast).
  *DoD:* dua tulis konkuren tak saling timpa senyap; yang kalah dapat konflik & remerge.
- **Fase 3 — Seed migration + canon-from-args (W6·2).** Pindah `CLIENTS/ENGAGEMENTS/WTB/TEAM`
  keluar dari `data.js` runtime → seed DB + fixtures; canon `FIG`/`SRC` injectable; app hidrasi dari
  API saat boot. *DoD:* app muat data dari API; `data.js` = helper+engine saja; **49 Vitest + diag
  hijau; live oracle identik; OM/PM/CTT = baseline**; verifikasi live.

Setiap fase: tampilkan rencana+berkas sebelum kode; jalankan `lint`/`typecheck`/Vitest + oracle;
commit terpisah; nol regresi numerik sbg gerbang lulus.

## 11. Decisions (diambil 2026-06-18)
- **Stack:** Node + **tRPC** + **Prisma/SQLite** (dev), satu-baris flip ke Postgres untuk prod.
  Alasan: reuse tipe canon TS, end-to-end type-safe, nol-ops, nol vendor/biaya, sepenuhnya dapat
  dieksekusi agen. (Alternatif Postgres-now / Supabase-BaaS / REST ditolak — lihat §7.)
- **Scope:** **Full DoD dalam satu arc** (persistensi + multi-browser + optimistic-concurrency +
  seed migration), difase 0–3 di atas, digerbang net regresi.

## 12. Open Questions (perlu jawaban sebelum/di Fase 1)
1. **Pemetaan scope kunci.** Saya usulkan: scope=**engagement** untuk `clients`?, `engagements`?,
   `aje`, `risks`, `wtbOverrides`, `wpState`, `reviewNotes`, `noteThreads`, `timeEntries`,
   `taskState`, `logEntries`, `diagnostics.v1`, dan key `ams.v1.*` per-modul; scope=**user** untuk
   `profile`, `role`, prefs app (`ams.<key>` non-state). *Catatan:* `clients`/`engagements` secara
   semantik **firm-wide**, bukan per-engagement — usul scope=**firm** untuk keduanya. Setuju?
2. **Topologi proses dev.** Usul: server di port terpisah (mis. 5181), Vite dev-proxy `/trpc`
   → server; satu `npm run dev:all` (concurrently). Atau Anda prefer server menyajikan SPA juga?
3. **`activeEngagementId` saat boot.** Tetap dari state user (default `ENG-2025-014`) — konfirmasi
   ini scope=user, bukan global.

---

### Ringkasan untuk sign-off
W6 memindahkan SSOT dari localStorage ke server (tRPC+Prisma/SQLite), membuat status perikatan
berbagi lintas-browser dgn optimistic-concurrency, dan memindah seed→DB/fixtures dgn canon membaca
WTB via argumen — **nol regresi numerik**, **tanpa auth (→W7)**, **tanpa LLM (→W8)**. Arc 4 fase,
gerbang per fase. **Balas "Proceed." untuk mulai Fase 0**, atau jawab Open Questions §12 lebih dulu.
