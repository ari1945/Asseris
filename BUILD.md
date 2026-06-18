# NeoSuite AMS — Build & Workflow (ESM-only, W3 Phase 2)

> **The app is now ESM-only.** `migration/` (Vite + ESM) is the **canonical
> application**; `migration/src/*` is **hand-maintained source** (committed, no
> longer codemod-generated). The buildless `app/*` + `NeoSuite AMS.html` +
> `build/` precompile at the repo root are a **FROZEN reference** — kept to
> diff against, **not edited, not built, not shipped**.

## Where to work

| Layer | Path | Status |
|---|---|---|
| **Canonical source** ⭐ | `migration/src/*.jsx`, `*.js` | **edit here** |
| Entry | `migration/index.html` → `src/main.jsx` (boot-ordered imports) | edit here |
| Build / dev / lint / test | `migration/` (`npm run dev\|build\|lint\|test`) | here |
| ~~Buildless app~~ | `NeoSuite AMS.html`, `app/*` | **frozen reference** |
| ~~Prod precompile~~ | `build/` → `NeoSuite AMS (prod).html` | **retired** (reference) |
| ~~Codemod~~ | `migration/codemod.mjs` | **retired** — running it overwrites canonical `src` |

## Workflow
```powershell
cd migration
# 1) edit src/*.jsx | *.js | *.ts
npm run lint       # error-gate (no-undef + no-dupe-keys = 0) on .js/.jsx — MUST stay green
npm run typecheck  # tsc --noEmit — canon TypeScript gate (W5), MUST stay 0 errors
npm run build      # vite build — no resolution failures
npm run dev        # http://localhost:5180 (HMR) — verify render + numbers
npm run test       # vitest — canon "number engine" net (W4); add --coverage for the gate
```

> **Loader note (W5):** the canon layer is now TypeScript (`.ts`). `vite.config.mjs`
> uses esbuild `loader: 'tsx'` over `.js/.jsx/.ts/.tsx` (a superset that strips
> types and transforms JSX uniformly). Bare generics in `.ts` need a trailing
> comma (`<T,>`) to avoid being parsed as JSX.

## W6 — Backend & data layer (`server/`)

Since W6 the engagement state SSOT is a backend, not localStorage. The
`server/` package (Node + TS, **tRPC + Prisma/SQLite**) is separate from
`migration/` and has its own `package.json`/`tsconfig`/tests.

```powershell
cd server
npm install            # first time
npm run prisma:generate
npm run db:push        # create/sync dev.db (SQLite)
npm run seed           # seed core entities + WTB from migration/src/data.js (byte-identical)
npm run typecheck      # tsc --noEmit — MUST stay 0 (extends the W5 gate to server/)
npm run test           # vitest — StateDoc CAS + W7 auth/authz integration tests
npm start              # tRPC server on http://localhost:5181 (localhost only)
```

## W7 — Auth, sesi & RBAC (`server/src/auth/`)

> **W7 COMPLETE (Fase 0–3).** Fase 0: server-side auth (login/sessions/TOTP/password + audit trail).
> Fase 1: RBAC enforced — W6 endpoints are `protectedProcedure`; `state.set` is capability-gated
> by `(scope,key)` via the shared map (`migration/src/rbac.js` → `server/src/rbac.ts`); `updatedBy`
> comes from the session. Fase 2: client login — `api.js` sends a Bearer token (localStorage;
> httpOnly-cookie hardening = W10) and broadcasts `ams:auth-expired` on 401; `app.jsx` `Root` is a
> session gate (checking → `<LoginScreen>` → app); `contexts.jsx` `AuthContext` is real
> (`login`/`logout`/`can`, role from session, act-as removed). Fase 3: UI mirrors enforcement —
> `useAuth().can(CAP.*)` gates AJE/opinion/firm-settings; `SecKeamanan` does real changePassword/TOTP/
> session-list+revoke/auth-event panel (endpoints `auth.sessions`/`auth.revokeOtherSessions`/
> `auth.events`); `SecAkses` is read-only from the shared map. **Deferred → W10:** httpOnly cookies,
> IP-allowlist, email login-alerts/reset, cross-device revoke. **No per-engagement data isolation**
> (any authenticated role reads any engagement) → W7.5/W9.
>
> **Run it:** `cd migration; npm run dev:all` then open :5180 → login. Dev accounts below. If the
> server grabbed the wrong port behind a port-injecting launcher, pin it: `$env:PORT='5181'`.

- **Crypto = Node built-in only** (no `bcrypt`/`argon2`/`otpauth` deps): scrypt for password
  hashing (`auth/password.ts`), RFC 6238 HMAC-SHA1 for TOTP (`auth/totp.ts`). Keeps the W6
  "nol-vendor / agent-executable" stance and dodges Windows native builds.
- **Schema:** `User` gains `passwordHash`/`totpSecret`/`totpEnabled`/`failedLogins`/`lockedUntil`
  (+ `email @unique`); new `Session` (opaque token, absolute expiry + sliding lastSeen, revoke on
  logout) and `AuthEvent` (append-only LOGIN/LOGIN_FAIL/LOGOUT/PASSWORD_CHANGE/TOTP_*/LOCKOUT).
- **Context:** `context.ts` `createContext` reads the token from `Authorization: Bearer …` **or**
  the `ams_session` cookie, resolves the session → `ctx.user`. `protectedProcedure` (in `trpc.ts`)
  requires it. `SESSION_TTL_HOURS` env (default 8) sets expiry.
- **Router (`auth.*`):** `login` (public; 5-fail → 15-min lockout; generic error, no enumeration),
  `me` (public), `logout`/`changePassword`/`enrollTotp`/`verifyTotp` (protected).
- **Seed dev accounts** (one per RBAC role — `npm run seed`; **dev passwords, NOT production**):

  | Role | Email | Password |
  |---|---|---|
  | Engagement Partner | `hartono.w@whr-cpa.id` | `Partner#2025!` |
  | Audit Manager (primary) | `anindya.p@whr-cpa.id` | `Manager#2025!` |
  | Senior Auditor | `bagas.n@whr-cpa.id` | `Senior#2025!` |
  | Junior Auditor | `citra.l@whr-cpa.id` | `Junior#2025!` |

  > After editing `schema.prisma`: `npm run prisma:generate && npm run db:push && npm run seed`.

**Run the app WITH the backend** (from `migration/`):
```powershell
npm run dev:all        # concurrently: server (:5181) + Vite (:5180)
```
Vite proxies `/trpc` → `:5181` (prefix stripped). `npm run dev` alone still works —
the persistence hook **degrades to cache-only** when the server is absent, so the
app never breaks; you just lose cross-browser sync.

**Persistence model** (`migration/src/contexts.jsx` + `api.js`): `useServerState`
(and the public `useAmsPersist`) read the localStorage cache synchronously for
instant paint, hydrate from the server, and debounce optimistic compare-and-swap
writes. Keys live under `(scope, scopeId)` — `user`/`firm`/`engagement`. Cache keys
are `ams.v1.<scope>.<scopeId>.<key>` (legacy unscoped `ams.v1.<key>` is read once as
a fallback). **Zero numeric regression** still gated by the canon Vitest net + live
oracle (`materiality` OM 4260 / PM 3195 / CTT 213).

## W7.5 — Per-engagement data isolation (`server/src/engagementAccess.ts`)

> **W7.5 COMPLETE (Fase 0–1).** Closes W7's honest gap ("any authenticated role reads any
> engagement"). A user may touch an engagement's **working data** (`bootstrap` + StateDoc
> scope=`engagement` + WTB) only if they are a **member** (`EngagementMember`) OR their role has
> **`ENGAGEMENT_VIEW_ALL`** (Partner + Manager oversight — W7.5 Q1). The firm-ops **roster** (engagement
> names in pipeline/scheduler/profit) stays visible (Q2 = isolate working data, not the roster).

- **Model:** `EngagementMember(engagementId, userId)` — the `Engagement.partner/manager` name strings
  are NOT a membership source (they don't map to login users). Seeded: all 4 accounts → `ENG-2025-014`
  (boot bootstraps it for everyone); Senior also → `ENG-2025-031` (so Junior→031 is FORBIDDEN, Senior→031
  is allowed — the live isolation demo).
- **Server enforcement:** `assertEngagementAccess(user, engId)` gates `bootstrap` and engagement-scoped
  `state.get`/`state.set`; `engagement.list` is filtered to `accessibleEngagementIds` (oversight → all).
- **Client:** `contexts.jsx` FirmProvider fetches the accessible set from `engagement.list`, exposes
  `canAccessEngagement` + a **guarded** `setActiveEngagementId` (refuses inaccessible ids) and
  auto-corrects a stale active engagement. The shell switcher + command palette only offer accessible
  engagements. Degrades gracefully offline (server down → no UI restriction; server still enforces).
- **Honest boundary:** isolates engagement *working data*, not the *existence* of engagements in
  firm-ops views (Q2); no per-firm multi-tenancy; no membership-management UI (seed + endpoints only);
  encryption-at-rest / retention / deploy = W10.

> After editing `schema.prisma`: `npm run prisma:generate && npm run db:push && npm run seed`.
> The seed now also clears `Session`/`AuthEvent` so a re-seed after anyone has logged in won't trip a
> foreign-key violation.

## W8 — LLM proxy (`server/src/llm/`)

> **W8 COMPLETE (Fase 0–2).** A server-side proxy is the only place real LLM calls happen:
> the **API key lives in server env**, never the browser. The proxy is **auth + RBAC +
> rate-limit + egress-redacted + audited**, and unblocks **P4 Fase 3** (LLM narration over
> the *deterministic* diagnostic findings). Degrades gracefully: no key → `not-configured`,
> UI stays deterministic-only.

- **Nol-vendor:** plain `fetch` (Node ≥18), no SDK. Two adaptors (`providers.ts`):
  Anthropic `/messages` + a generic OpenAI-compatible `/chat/completions` (covers
  OpenAI/DeepSeek/Kimi). Gemini stays proxy-pending.
- **Key custody:** server env only. `readLlmConfig()` returns null when unset (the
  `not-configured` signal). The Settings → AI key field is now display-only ("dikelola server").
- **Egress redaction (the confidentiality boundary):** the client may only send the
  **deterministic finding text** (title/std/severity/detail/suggested procedure). zod strips
  unknown keys; `redactFindings()` re-projects onto an allow-list; the **server owns the
  prompt** (`buildNarrationPrompt`) so a caller can't widen what leaves the building. No raw
  WTB rows, client names/NPWP, or extra context egress.
- **RBAC:** new `CAP.LLM_USE` in the shared map (`migration/src/rbac.js`), granted to all 4
  roles; the gate still denies by default (unknown roles → FORBIDDEN).
- **Rate-limit + audit:** per-user fixed window (`ratelimit.ts`, default 20/h); append-only
  `LlmEvent` records **usage, not content** (provider/model/finding-count/token-usage).
- **Endpoints (`llm.*`, both `protectedProcedure`):** `status` → `{configured, canUse,
  provider, model}` (drives the honest UI badge); `complete({task:'narrate-diagnostics',
  findings})` → `{status:'ok', text, …}` | `{status:'not-configured'}`.
- **Client:** `api.js` `llmStatus()`/`llmNarrateDiagnostics()`; `diagnostics_panel.jsx` has a
  "Jelaskan N temuan" button → narration + disclaimer ("model bahasa — bukan deterministik;
  verifikasi sebelum dipakai"); `view_settings.jsx` AI panel shows the real server status.

**Configure a real provider.** Put the key in **`server/.env.local`** (gitignored — the tracked
`server/.env` holds only `DATABASE_URL`, no secret). The server loads `.env` then `.env.local` at
boot via `src/env.ts` (`process.loadEnvFile`, Node built-in — the runtime does NOT auto-load `.env`
otherwise; only the Prisma CLI does):
```
LLM_API_KEY=sk-…            # required; absence = not-configured
LLM_PROVIDER=anthropic      # anthropic | openai | deepseek | kimi (default anthropic)
LLM_MODEL=claude-sonnet-4-6 # optional override of the provider default
LLM_BASE_URL=…              # optional; required only for an unknown OpenAI-compat endpoint
```
Restart the server (`npm run dev:all`). Without a key the app runs deterministic-only.
**Real-proven:** the OpenAI-compat path is smoke-tested live against DeepSeek (`LLM_PROVIDER=deepseek`).

> **Local verification:** `.claude/w8-verify-proxy.mts` drives the real env→config→redact→fetch
> chain. Against a **real** provider: `node --env-file=.env.local --import tsx
> ../.claude/w8-verify-proxy.mts` (from `server/`). Against a **mock** (no key): start
> `.claude/w8-mock-llm.mjs` (:9999) and run with `LLM_PROVIDER=openai
> LLM_BASE_URL=http://localhost:9999/v1`.

## W10 — Hardening, audit trail, observability & deploy

> **W10 slice 1 (this wave): audit-trail core + hardening + observability + deploy-readiness.**
> Export (PDF/XLSX) + e-Meterai/e-Sign are deferred to a later slice (W10.5). Deploy artifacts
> are **authored, not verified from the dev machine** — treat them as a runbook starting point.

**Audit trail (`server/src/audit/log.ts`).** Real server-side, append-only, hash-chained record
that replaces the client pseudo-hash demo (`amsFakeHash`/`buildAuditStream`). Each row chains via
`hash = SHA-256(seq|ts|actor|action|target|detail|prevHash)`; `verifyAuditChain()` recomputes and
reports the first break. `appendAudit()` is serialized in-process (single-process deploy
assumption — horizontal scaling needs DB-level sequencing). Hooked on `state.set` (create+CAS),
`auth.login`/`logout`, `llm.complete`. **`detail` is metadata only** (key + version delta) — never
working-paper content, so the trail is safe firm-wide. No update/delete path. Endpoints
`audit.list`/`audit.verify` gated by `CAP.AUDIT_VIEW` (Partner+Manager). Client: `api.js`
`auditList`/`auditVerify`; `view_crypto.jsx` chain tab renders the real chain (falls back to the
demo when offline/forbidden). **Tests run files serially** (`vitest.config.ts fileParallelism:false`)
— the chain is global state every `state.set` appends to.

**Auth/secret hardening.**
- **httpOnly cookie** (`auth/cookie.ts`): login sets `Set-Cookie ams_session` (HttpOnly,
  SameSite=Strict, Path=/, Max-Age=TTL; `Secure` when `COOKIE_SECURE=1`), logout clears it.
  `createContext` exposes `ctx.setCookie` (v11 standalone adapter passes `res`). The **client no
  longer persists the token** — in-memory only, `credentials:'include'`; a reload restores the
  session from the cookie. Bearer header still works for tests/curl.
- **Encryption-at-rest** (`crypto/secretbox.ts`): AES-256-GCM over `totpSecret`, key from
  `APP_ENCRYPTION_KEY` (32B hex/base64). Legacy plaintext stays readable; no key = dev pass-through.
- **IP-allowlist** (`security/ipAllowlist.ts`): optional `ADMIN_IP_ALLOWLIST` (exact IPs + IPv4
  CIDR), off by default, fail-closed when set; gates `auth.login`.

**Observability (`server/src/obs/log.ts`, wrapped in `server.ts`).** Structured JSON logs (one
line per event; `tRPC onError` → error log + counter). The HTTP server wraps the tRPC handler so
the same port answers ops probes:
- `GET /healthz` → `{status, db, uptime}` (cheap `SELECT 1` DB check; 503 if DB down).
- `GET /metrics` → Prometheus text (`neosuite_http_requests_total`, `_errors_total`,
  `logins_total`, `llm_requests_total`, `audit_appends_total`, `process_uptime_seconds`).

**New env vars (all optional; absence = feature off / dev defaults):**
```
APP_ENCRYPTION_KEY=<32B hex or base64>   # encrypts totpSecret at rest
COOKIE_SECURE=1                          # add Secure to the session cookie (prod behind TLS)
ADMIN_IP_ALLOWLIST=127.0.0.1,10.0.0.0/8  # CSV of IPs/CIDRs allowed to log in
SESSION_TTL_HOURS=8                      # session lifetime (existing)
APP_SIGNING_KEY=<base64 PKCS8 Ed25519>   # W10.5 — signs export seals; unset = ephemeral dev key
```

**Deploy (W10) — container + Postgres (UNTESTED FROM HERE).**
- `server/Dockerfile` (build context = **repo root** — the server imports `migration/src`),
  `docker-compose.yml` (app + `postgres:16`), `.github/workflows/ci.yml` (server typecheck+tests;
  migration lint+typecheck+tests+build).
- **Postgres flip:** the repo schema stays `sqlite` for zero-ops dev; the Docker build flips
  `provider = "sqlite"` → `"postgresql"` via `sed` at image build. No vendor-specific SQL is used,
  so the flip is mechanical. Schema is applied with `prisma db push` (no `migrations/` dir yet — a
  proper migration history is a follow-up).
- **Run locally to validate:** `docker compose up --build`; then `curl localhost:5181/healthz`.
  One-time demo seed (DESTRUCTIVE): `docker compose run --rm server npm run seed`.
- **Before trusting it:** confirm the Prisma engine resolves on the image platform, set
  `APP_ENCRYPTION_KEY` + `POSTGRES_PASSWORD` + `COOKIE_SECURE=1`, and put a TLS terminator in front.

**Deferred to later:** SMTP (email alerts/password-reset); cross-device revoke; full ISQM
retention/legal-hold workflow; OIDC; a real migration history; an actual cloud deploy.

## W10.5 — Ekspor (PDF/XLSX) & segel nol-vendor

Membuat ekspor menjadi artefak nyata + segel provenans. PRD: `PRD - W10.5 Ekspor (PDF-XLSX) &
Segel Nol-Vendor.md`.

**Fase 0 (server, SELESAI).** `CAP.EXPORT` (semua peran; ekspor jejak audit tetap `AUDIT_VIEW`).
Router `exporter`:
- `exporter.seal({kind, contentHash, scope?, scopeId?})` → tandatangani hash konten kanonik
  (Ed25519, `crypto/signing.ts`), simpan `Seal`, audit `action=SEAL` (metadata-saja). Kembalikan
  `{sealId, signature, pubKeyId, …}` untuk dibenamkan ke artefak.
- `exporter.verifySeal({sealId, contentHash})` → recompute: `ok` | `not-found` | `hash-mismatch`
  (artefak diubah) | `bad-signature` (baris dipalsukan) | `key-rotated` (kunci dev ganti pasca-restart).
- `exporter.logEvent({kind, format, scope?, scopeId?, contentHash?})` → audit `action=EXPORT`
  untuk ekspor tanpa-segel (mis. XLSX register).
- Semua di-gate `CAP.EXPORT` + (scope=engagement) isolasi W7.5.

**Signing key:** `APP_SIGNING_KEY` (base64 PKCS8 DER Ed25519 private). Tanpa env = keypair
**ephemeral** per-proses (dev jalan end-to-end, tapi segel tak bertahan lintas-restart →
`verifySeal` melaporkan `key-rotated`, BUKAN tamper). Set di prod agar `pubKeyId` stabil.

**Batas jujur:** segel ini **BUKAN** e-Meterai (PERURI) / PSrE tersertifikasi (PrivyID/VIDA) —
hanya provenans (siapa) + integritas (hash tak berubah). Disclaimer wajib di artefak & UI.

**Fase 1 (klien — PDF deliverable, SELESAI).** `src/export_pdf.js` → `amsExportPdf(model)`: komposer
dokumen terstruktur (heading/para/kv/table/signature) → PDF Blob nyata via **lazy** `import()`
jspdf+jspdf-autotable+qrcode (chunk rollup sendiri — di luar bundle boot). Hitung sha256 payload
kanonik → `exportSeal` → benamkan sealId+pubKeyId+hash+QR-verifikasi + `SEAL_DISCLAIMER`. Degrade ke
**UNSEALED** + `exportLogEvent` bila server mati / peran tanpa EXPORT. Tersambung: **memo
materialitas** (`view_materiality_parts`), **LK** (`view_fsgen`, 4 laporan dari model FSGEN),
**opini** (`view_opinion`) — prosa single-source dgn pratinjau, nol-drift numerik.

**Fase 2 (klien — XLSX register, SELESAI).** `src/export_xlsx.js` → `amsExportXlsx(model)`: dari model
sheet terstruktur (`sheets:[{name, columns, rows, totals?, colWidths?}]`) → workbook .xlsx Blob nyata
via **lazy** `import('xlsx')` (SheetJS, chunk sendiri ~499 KB — di luar boot). Alur segel identik
Fase 1 (hash payload sheet kanonik → `exportSeal` → sheet **"Segel"** memuat sealId+pubKeyId+hash+
disclaimer; degrade UNSEALED+`logEvent`). Angka **pre-formatted via `rp()`/`fmt()`** di pemanggil
(SSOT = `AMS_CANON`/`wtb`), sel = teks id-ID identik layar (negatif dalam kurung). Tersambung 5
register: **WTB** (`view_execution` `WTBView`, kind `wtb-register`), **AJE** (`view_aje`, 2 sheet:
daftar+baris jurnal, `aje-register`), **risk RoMM** (`view_risk`, `risk-register`), **register aset
tetap** (`view_psak16` "Kertas Kerja E", 2 sheet: sub-ledger+rekonsiliasi-GL, `fixed-asset-register`),
**jejak audit** (`view_crypto` tab Rantai `CRServerChain`, `audit-trail`, scope=firm) — tombol ekspor
jejak **otomatis ter-gate AUDIT_VIEW** karena hanya muncul saat `srvChain` termuat (server hanya
mengembalikan baris ke peran AUDIT_VIEW). 4 register kerja scope=engagement (isolasi W7.5).

**Catatan SheetJS:** dipasang dari CDN resmi (`https://cdn.sheetjs.com/xlsx-0.20.3/...`, bukan npm
0.18.5 yang ber-CVE pada jalur *parse*) → **0 prod vulnerabilities**. Kita hanya **menulis** (writeFile),
tak pernah parse berkas tak-tepercaya, jadi jalur baca yang rentan tak terjangkau.

**Deferred:** real e-Meterai/PSrE; pengiriman ekspor via email; paket-engagement (zip multi-artefak);
**Fase 3 opsional** (UI verify-seal di `view_crypto`: tempel id/hash/QR → `exportVerifySeal`).

## Test harness (W4 — `vitest.config.mjs`)
- **Scope:** the canon "number engines" (`canon*.js` + `forensic_canon.js`) — pure
  numeric I/O, highest value-per-test-line.
- **Env:** `node` + a hand-rolled `window`/`localStorage`/`BENCHMARKS` stub in
  `src/__tests__/setup.js` (no jsdom). Setup uses **dynamic** imports ordered
  `data.js → canon.js` (static imports hoist above the stub and crash on
  `window.AMS = …`; canon_base computes `SRC`/`FIG` from `window.AMS.WTB` at load).
- **Files:** one `*.test.js` per canon module (`canon_base`, `canon_part1..4`,
  `forensic_canon`). Key figures are **hard-pinned** to the audit-verified
  `W0-BASELINE.md` examples (materiality OM 4.260 / PM 3.195 / CTT 213, PSAK 46
  `deferredTax`, PSAK 71 `psak71`, PSAK 73 `leasePortfolio`, `reconcile` tie-out).
- **Regression net:** `canon_regression.test.js` sweeps every zero-arg `AMS_CANON`
  engine, deep-normalizes (round 3dp, sort keys) and **snapshots** it
  (`src/__snapshots__/`). Any W2/3/6 refactor that shifts a canonical number fails
  the snapshot. Update intentionally with `npm run test -- -u` only after
  re-verifying against an audit-confirmed example.
- **Fixture:** `src/__fixtures__/wtb.js` — a minimal WTB proving engines are pure
  functions of the trial balance they're handed.
- **Coverage gate:** `npm run test -- --coverage` → v8, ≥80% lines/stmts/funcs on
  canon (currently ~99% lines / 100% funcs / 77% branches).

## TypeScript gate (W5 — `migration/tsconfig.json`)
- **Scope:** the canon "number engines" only — `canon.ts`, `canon_base.ts`,
  `canon_part1..4.ts`, `forensic_canon.ts`, plus `canon_types.ts` (public types
  `WTB`/`Figures`/`Fig`/`MaterialityResult`/`FsModel`), `canon_selectors.ts`
  (typed accessors consumed by views), and `src/types/globals.d.ts` (the residual
  `window` contract: `AMS`/`AMS_CANON`/`BENCHMARKS`/`FSGEN`/`AMS_FORENSIC`).
- **Posture:** **full `strict: true`** (incl. `strictNullChecks` — flipped on in the
  W5 ramp). The canon **surface has zero `any`** (verified by emitting `.d.ts` and
  scanning). `.find().prop` lookups that are domain-guaranteed use `!` non-null
  assertions (type-only, erased — zero runtime change, gated by the 49-test snapshot).
- **Gate:** `npm run typecheck` (`tsc --noEmit`) MUST stay **0 errors**. This is the
  gate for `.ts` files — ESLint does **not** lint `.ts` (flat config matches only
  `.js/.jsx`); `tsc` is the stronger check there (catches undefined refs + duplicate
  keys + types). Views stay `.jsx` and consume canon types via `canon_selectors`.

## ESLint gate (`migration/eslint.config.js`)
- **ERROR (hard gate, green):** `no-undef`, `no-dupe-keys`.
- **WARN (W3 remaining worklist, 207):**
  - `react/jsx-no-undef` (44) — only `<window.X/>` dynamic-JSX (rule ignores
    declared globals); Phase 4 rewrites these to imported refs, then → error.
  - `react-hooks/rules-of-hooks` (163) — intentional buildless-era guards
    (`typeof useNav==='function'?…`, `window.useAmsPersist`); dissolve as
    `window` is stripped (Phase 4), then → error.

## How the freeze works (W3 history)
- W1 made Vite the build SSOT; W3 Phase 1 completed the import graph
  (jsx-no-undef 444→44); **Phase 2 (here)** committed `src` as canonical and
  stopped codemod regeneration. Phases 3–5: canon/data engine splits → strip
  `window` per-workspace (keep the imperative runtime bus) → promote lint to error.
- To compare against the frozen baseline, the old prod precompile still works
  from `app/` (`cd build; npm run build`) but its output must NOT be shipped.
