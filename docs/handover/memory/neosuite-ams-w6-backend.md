---
name: neosuite-ams-w6-backend
description: "NeoSuite AMS W6 — backend & lapisan data (tRPC+Prisma/SQLite): keputusan, fase, status"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8cc1bca5-f027-477e-99e9-d5bfebe0032e
---

Wave **W6 "Backend & lapisan data"** — gelombang **pertama Fase B** (produk; eval menandai
Fase B butuh keputusan arsitektur, bukan hand-off mekanis spt W0–W5). Lanjutan [[neosuite-ams-arc]].
PRD = `Audit System/PRD - W6 Backend & Lapisan Data.md` (**Proceed.** 2026-06-18).

**DoD W6 (eval §07):** dua browser berbagi status perikatan sama, tahan reload; engine baca status
via argumen (bukan localStorage); optimistic-concurrency cegah tabrakan tulis; `CLIENTS/ENGAGEMENTS/
WTB/TEAM` dari `data.js` → seed DB + fixtures (`data.js` sisakan helper+engine saja).

**Keputusan kunci (AskUserQuestion 2026-06-18):**
- **Stack:** Node + **tRPC** + **Prisma/SQLite** (dev), satu-baris flip ke Postgres utk prod (W10).
  Reuse tipe canon TS, end-to-end type-safe, nol-ops/vendor/biaya. (Tolak: Postgres-now / Supabase-BaaS / REST.)
- **Scope:** Full DoD dalam satu arc, difase 0–3.
- **Tanpa auth (→W7), tanpa LLM-proxy (→W8).** Catatan: narasi LLM P4 sebenarnya digerbang **W8**,
  bukan W6 spt shorthand lama. API W6 **localhost-only**, jangan diekspos jaringan sblm W7.

**Seam yg diganti:** `migration/src/contexts.jsx` — `usePersisted(key,init)`→`ams.<key>` (status
engagement: clients/engagements/aje/risks/wtbOverrides/wpState/reviewNotes/noteThreads/timeEntries/
taskState/logEntries) & `useAmsPersist(key,init)`→`ams.v1.<key>` (state modul). Keduanya
localStorage read-on-mount + write-on-effect.

**Kopling kritis (Risk R1):** `canon_base` hitung `FIG`/`SRC` dari `window.AMS.WTB` **saat
module-load** (sinkron). Jadi W6·2 (pindah WTB keluar data.js) WAJIB refactor canon agar terima WTB
sbg argumen — difase ke Fase 3, digerbang nol regresi (seed byte-identik).

**Fase 0 = DONE & committed** (`0293aed`). Paket baru `server/` (Node+TS ESM strict), belum sentuh client.
- `prisma/schema.prisma`: Firm/User/TeamMember/Client/Engagement/WtbRow + **StateDoc**
  `(scope, scopeId, key, valueJson, version, updatedAt, updatedBy)` `@@unique([scope,scopeId,key])`.
  Angka = Float (JS double, eksak <2^53 → nol drift). WtbRow cermin shape runtime
  `{key,group,code,name,ly,unadj,aje,adj,lead}` (adj=unadj+aje derived; key='wtb'+ord).
- Router tRPC: `engagement.list`, `bootstrap(engagementId)` (entitas+WTB+state docs utk hidrasi),
  `state.get` (missing→{value:null,version:0}), `state.set` = **CAS atomik** via `updateMany WHERE
  version=baseVersion` (count 0→CONFLICT 409); baseVersion=0→create, P2002→CONFLICT.
- Seed `src/seed.ts`+`seedData.ts`: impor `migration/src/data.js` lewat **window-stub** (pola
  `__tests__/setup.js` W4) → byte-identik. 1 firm/1 user/6 team/8 clients/7 eng/28 WTB (ENG-2025-014).
- **Gotcha Prisma 6.19:** `db push --force-reset` kena guardrail AI (butuh PRISMA_USER_CONSENT env).
  Hindari: globalSetup test hapus `prisma/test.db` lalu `db push` polos (non-destruktif, isolasi setara).
- **Gerbang hijau:** `npm run typecheck` 0 err; **6 test integrasi CAS** (incl. race 2 penulis→tepat 1
  menang) via `createCallerFactory`; server boot :5181, HTTP `engagement.list`→7 eng ter-join
  (materiality ENG-2025-014=4.250.000.000=data.js). prod-deps 0 vuln (5 audit warn = dev-only).
- **DB resolusi:** SQLite relative path di-anchor ke schema-dir (server/prisma/) di CLI & Client →
  konsisten. db.ts default `DATABASE_URL ??= 'file:./dev.db'`. Test pakai `file:./test.db` via vitest env.

**Fase 1 = DONE & committed** (`f4a947e`). Seam persistensi `contexts.jsx` → server-backed; kontrak
`[val,setVal]` (incl. functional updates) TETAP → nol call-site berubah.
- `migration/src/api.js`: tRPC client `createTRPCClient`+`httpBatchLink({url:'/trpc'})`; `isConflict()`;
  `window.AMS_API`. **Degradasi anggun:** semua caller telan error → fallback cache (app TAK rusak
  bila server mati; `npm run dev` solo tetap jalan, hanya tanpa sync).
- `useServerState(key,initial,scope,scopeId)` (engine): cache baca sinkron (paint instan) → hydrate
  GET → setVal optimistik + cache write-through + **debounce 400ms** CAS `state.set(baseVersion=versionRef)`.
  Konflik→adopsi server (refetch; toast ditunda Fase 2). Cache key `ams.v1.<scope>.<scopeId>.<key>`;
  **fallback baca legacy `ams.v1.<key>` sekali** (edit lama selamat). `usePersisted` lama DIHAPUS.
- Pemetaan scope (final): **user**=profile/role/activeEng (scopeId=`USER.employeeId`='WHR-AM-0142');
  **firm**=clients/engagements (scopeId=`FIRM-WHR`); **engagement**=aje/risks/wtbOverrides/wpState/
  reviewNotes/noteThreads/timeEntries/taskState/logEntries (scopeId=activeEngagementId → re-hydrate
  saat ganti engagement). Publik `useAmsPersist` **default firm** (=semantik global lama, kini
  lintas-browser; nol perubahan perilaku utk ~80 long-tail key); `AMS_PERSIST_SCOPE` map hanya
  diagnostics.v1/aiInsights.v1=engagement. Key yg sudah embed engId (opinionDoc.<id> dll) → firm OK.
- `vite.config.mjs` dev-proxy `/trpc`→:5181 (rewrite strip `^/trpc`); `dev:all` (concurrently) di
  migration; deps `@trpc/client`+`concurrently`; BUILD.md seksi W6.
- **Verifikasi live** (:5181+:5180): proxy OK (engagement.list→7); klik ENG-040 di tracker→TopBar
  optimistik + server activeEng=ENG-040 v1; **bukti lintas-browser: hapus SELURUH localStorage (59→0)
  + reload → app pulih activeEng=ENG-040 (Mandiri) HANYA dari server**, hook re-cache scoped key.
  0 console err; nol regresi (59 Vitest hijau, live OM4260/PM3195/CTT213=baseline, build 289 hijau,
  lint 0-err). **Catatan:** tak ada delete-endpoint (probe ditombstone null); dev.db `npm run db:reset`.

**Fase 2 = DONE & committed** (`bf415d3`). Surface konflik (no silent clobber). HANYA `contexts.jsx`.
- Bug yg diperbaiki: Fase 1 diam-diam adopsi server saat kalah CAS → HILANGKAN edit pengguna senyap.
- `useServerState` flush catch: saat CONFLICT pertahankan nilai lokal, sinkron versionRef→server
  terbaru, `emitConflict({scope,key,label,adopt,keepMine})` via window CustomEvent `ams:conflict`.
  adopt=muat server value; keepMine=re-flush lokal dgn baseVersion terbaru (timpa).
- `<ConflictToaster>` (dipasang dlm AppProviders, dlm AuditContext.Provider): dengar event, dedupe
  per (scope,key), auto-dismiss 14s, 2 aksi "Muat versi terbaru"(primer/non-destruktif)/"Timpa".
  Inline-styled (CSS var + fallback), `data-conflict-key` utk test. `CONFLICT_LABELS` per-key.
- Verifikasi live (simulasi: bump versi server di blkg hook → tulis baseVersion basi → CONFLICT):
  toast muncul (key activeEng), **pilihan lokal pengguna TETAP (063) bukan revert senyap**; adopt→
  TopBar=022 server tak berubah; keepMine→server=ENG-040 v6. 0 console err, lint/build hijau.

**Fase 3 = DONE & committed** (`55818ae`). Seed migration + canon-from-args (W6·2).
- **canon-from-args (R1 dibereskan, BEDAH 1 file):** satu-satunya pembacaan WTB saat module-load =
  `canon_base.ts:121 const SRC = figuresFromWTB()` + `const FIG`. Diubah jadi **lazy memoized via
  Proxy** (`lazyFigures`): bangun saat **akses properti pertama** (render, sesudah boot hidrasi WTB),
  bukan saat load. Tetap OBJEK → `FIG.x`, `Object.assign({},FIG,…)`, spread, `AMS_CANON.FIG` jalan
  TANPA ubah pemanggil/test. `resetFigures()` buang memo. **GOTCHA fingerprint:** menaruh
  `resetFigures` di objek `AMS_CANON` memunculkan key baru di snapshot regresi (`canon_regression.test`)
  → expose sbg **`window.amsResetFigures` standalone** (BUKAN di AMS_CANON) agar fingerprint canon
  byte-identik. Typing: `Window.amsResetFigures?:()=>void` di `globals.d.ts`.
- **Boot hidrasi (`api.js` + `app.jsx`):** `hydrateCoreFromApi(engId)` (`window.amsHydrateCore`) panggil
  `api.bootstrap.query` → overwrite `window.AMS.{FIRM,USER,CLIENTS,ENGAGEMENTS,TEAM,WTB}`. **Lossless
  verified**: USER via `dataJson` envelope; FIRM/CLIENT/ENG/TEAM kolom-per-kolom (tak ada field demo
  ekstra); WTB rekonstruksi `key='wtb'+ord, adj=unadj+aje`. `app.jsx` tail jadi **async `amsBoot()`**:
  loading-gate "Memuat…" → `await hydrateCoreFromApi('ENG-2025-014')` (catch→fallback) → render.
- **Resolusi kontradiksi DoD vs §5 non-scope** ("data.js=helper saja" vs "tabel domain lain menyusul"):
  core-6 **didemosikan jadi FALLBACK offline** di data.js (boot dari API=SSOT operatif), array demo
  belum-dimodelkan (WORKPAPERS/AJE/RISKS/…) TETAP di data.js (future-wave fixtures). Alasan keras
  menyimpan core-6 di data.js: `data_ojk.js:25 const CLIENTS=AMS.CLIENTS` baca **saat module-load**
  (sebelum boot async) → tanpa fallback sinkron app pecah. Komentar penjelas ditambah di data.js.
- **Gerbang hijau:** client typecheck 0-err, lint 0-err, **59 Vitest hijau (fingerprint canon
  IDENTIK + diagnostik utuh)**; server typecheck 0-err + 6 CAS test hijau.
- **Verifikasi live (:5181+:5180) — bukti definitif API-source:** ubah DB WtbRow 2-2300 unadj→-14bn,
  reload → app tampil `FIG.dbo=14000` (lazy canon rebuild dari WTB API; fallback data.js akan 13080)
  → **terbukti muat dari API**, lalu re-seed→13080. Offline (server mati): app tetap boot dari
  fallback data.js (FIG.dbo 13080, 28 WTB, OM4260/PM3195/CTT213), **0 console error**. Baseline pulih.

**W6 SELESAI penuh (Fase 0–3).** Sisa kebersihan opsional: jika ingin core-6 benar-benar keluar dari
`data.js` (DoD literal), perlu file fixtures terpisah + modelkan tabel domain lain (future wave, di luar
§5 W6). Next gelombang Fase B: **W7 auth/RBAC** lalu **W8 LLM-proxy** (buka P4 narasi). Lihat [[neosuite-ams-arc]].
