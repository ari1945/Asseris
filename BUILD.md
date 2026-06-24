# Asseris — Build & Workflow (ESM-only, W3 Phase 2)

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

**Deploy (W10) — container + Postgres (LIVE-PROVEN on W11).**
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

**Deploy verification — offline pass (no Docker/Postgres on the original dev box).** What was proven
*statically* (every item below was later confirmed by the live smoke — see "Live container smoke" further down):
- **Postgres flip is structurally valid.** `prisma migrate diff --from-empty --to-schema-datamodel`
  on a `provider="postgresql"` copy emits clean DDL for **all 13 tables** (5 unique indexes, 10 FKs)
  with **zero SQLite-only constructs** (no AUTOINCREMENT/BLOB/rowid). The `sed` flip is sound.
- **Image hygiene OK.** Root `.dockerignore` excludes `**/node_modules`/`**/dist`/`**/*.db`/secrets,
  so `COPY server ./server` can't clobber the `npm ci` modules with host binaries or leak state.
  Dockerfile build-context paths resolve (`server` + `migration/src` co-located → `../../migration/src`).
- **Footgun fixed (`tsx` + `prisma` were devDeps but are RUNTIME tools).** The container start command
  is `prisma db push … && npm start`(=`tsx src/server.ts`) — both `prisma` (CLI) and `tsx` were in
  `devDependencies`, so any `npm ci --omit=dev` hardening would have silently broken prod. Moved both
  to `dependencies` (verified `npm ls --omit=dev` now resolves tsx/prisma/@prisma/client; server
  typecheck 0 + 95 vitest green). `npm ci --omit=dev` is now safe (Dockerfile notes it as the slim path).
- **Footgun fixed (migration/package.json was NOT in the Docker image).** Dockerfile only copied
  `migration/src/` but omitted `migration/package.json`. Since `migration/src/rbac.js` and other shared
  `.js` files use `export const` (ESM syntax), Node.js/tsx needs `"type":"module"` from the nearest
  `package.json` to interpret them as ESM. Without it, `tsx` treats them as CommonJS → `SyntaxError:
  does not provide an export named 'CAP'` at boot. Fixed by adding `COPY migration/package.json
  ./migration/package.json` in the Dockerfile before `COPY migration/src`. (Live-proven: the fix
  resolved the boot crash; `curl /healthz` now returns 200.)
- **Honest gaps:** (1) ~~CI exercises sqlite only~~ — **addressed (W10.1):** `.github/workflows/
  deploy-smoke.yml` builds the image from `server/Dockerfile`, boots the compose stack against
  `postgres:16`, then asserts `db push → healthz → seed → login` (paths-filtered to deploy files).
  Its command chain is **locally validated** (each step run by hand 2026-06-21), but it has **not yet
  run on GitHub Actions** — the repo has **no remote**, so neither `ci.yml` nor `deploy-smoke.yml` has
  ever executed on Actions. They are ready artifacts that activate when the repo gains a GitHub home.
  (2) prod runs TS via `tsx` (transpile-on-run), not a compiled `dist/` — acceptable at this scale.

**Live container smoke — DONE (2026-06-21, Docker Desktop / WSL2 backend).** The full chain is now
run end-to-end on a real Docker host, no longer just static:
- **build + up:** `docker compose up --build` → `auditsystem-db-1` (postgres:16) + `auditsystem-server-1`
  both report **healthy**; `prisma db push` applied the sed-flipped Postgres schema cleanly on boot.
- **healthz:** `curl localhost:5181/healthz` → `200 {"status":"ok","db":"up",...}` (server ↔ Postgres
  connected); `/metrics` renders Prometheus text.
- **seed (the W11 regression surface):** `docker compose run --rm server npm run seed` →
  `Seeded: 1 firm, 4 users, 6 team, 8 clients, 7 engagements, 28 WTB rows (ENG-2025-014),
  5 engagement memberships, 8 connectors.` This **proves `tsx` resolves the `.js` import specifiers
  to the W11-renamed `.ts` files** at runtime in the container — `seedData.ts` imports
  `migration/src/data.js` → `data.ts` and `data_import.js` → `data_import.ts` (the only `.js→.ts`
  surface; the boot path only touches `rbac.js`, still `.js`). No code change was needed.
- **login (auth ↔ seeded Postgres):** `POST /auth.login` as the seeded Partner
  (`hartono.w@whr-cpa.id`) → `200` with a session token + user `WHR-EP-0001`, **no `passwordHash`
  leaked**. Confirms the server reads seeded users from Postgres, verifies the scrypt hash, and issues
  a session — the full `build → up → db push → seed → login` chain is green.
- **Note:** the compose stack serves **API + DB only** (`:5181` + Postgres); the SPA UI is not served
  by compose, so UI-level smoke (bootstrap/CAS/audit-chain/export) is exercised separately via the
  Vite dev app pointed at `:5181` (see the dev runbook above), not the container.

**One-shot runbook (on a Docker-capable host) — executed 2026-06-21:**
```
# compose reads a .env BESIDE it (repo root); none is committed. Create one:
printf 'POSTGRES_PASSWORD=%s\nAPP_ENCRYPTION_KEY=%s\nCOOKIE_SECURE=1\n' "<strong-pw>" "$(openssl rand -hex 32)" > .env
docker compose up --build -d          # postgres:16 + server; compose runs `prisma db push` then start
docker compose run --rm server npm run seed   # DESTRUCTIVE demo seed (4 role accounts)
curl -fsS localhost:5181/healthz                # expect 200
# then smoke via the app: login → bootstrap → edit (state CAS) → audit chain → export seal/verify
```

**Deferred to later:** SMTP (email alerts/password-reset); cross-device revoke; full ISQM
retention/legal-hold workflow; OIDC; a real migration history; an actual cloud deploy (the live
container smoke above).

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

**Fase 3 (klien — verify-seal UI, SELESAI).** `CRVerifySeal` di tab "Meterai & PSrE" (`view_crypto`):
tempel Seal ID + hash konten, atau muatan QR `neosuite-seal:<id>;<hash>` (auto-split) →
`exportVerifySeal` → verdikt. Peta semua alasan server: `ok` / `hash-mismatch` (diubah) /
`bad-signature` (dipalsukan) / `not-found` / `key-rotated` (kunci dev ephemeral) / `unavailable`;
validasi 64-heks di klien sebelum panggil. Tampilkan kind/scope/signer/signedAt/pubKeyId saat cocok.
Dibingkai "BUKAN e-Meterai" kontras dgn register TTE/PSrE legal di bawahnya. Tombol legacy "Unduh
Bukti Segel" di drawer DMS **sengaja tak disentuh** (itu demo `amsFakeHash`, bukan segel ekspor W10.5).

**W10.5 SELESAI (Fase 0–3).** **Deferred:** real e-Meterai/PSrE; pengiriman ekspor via email;
paket-engagement (zip multi-artefak).

## W9 — Konektor data / integrasi nyata (`server/src/integrations/`)

Mengganti cetak-biru konektor **simulatif** (`migration/src/data_import.js`, digerakkan
`feedCounts` statis) dengan **kerangka konektor sisi-server nyata**. Provider asli (Coretax/DJP,
BCA/Mandiri OpenAPI, PrivyID, MS-Graph) **tak bisa dikreditensialkan dari sini** (butuh sertifikat
PKP / mTLS / app-reg tenant), jadi — persis pola W8 — pipa dibuktikan terhadap **adapter fixture**,
adapter HTTP-nyata = drop-in. PRD: `PRD - W9 Konektor Data (Integrasi Nyata).md` (Proceed. 1a/2a/3a).

**Skema (Prisma):** `Connector` (seeded byte-faithful dari `window.IMPORT.CONNECTORS` via
window-stub — identity/target/scopes/mapping + `metaJson` amplop tampilan lossless + `wired`),
`SyncJob` (per-run tie-out: rows/valid/rejected/posted + `gatePassed` + `cursor` idempotensi),
`ConnectorToken` (`secretEnc` terenkripsi via `crypto/secretbox`, tak pernah ke klien).

**RBAC:** `CAP.INTEGRATION_VIEW` (semua peran — transparansi data yang dikonsumsi) ·
`CAP.INTEGRATION_MANAGE` (Partner+Manager — picu sync/kelola koneksi = firm-ops sensitif).

**Pipeline runner** (`integrations/sync.ts`, `runBankSync`): **pull → map (`mapping.ts`,
projeksi field termapping saja) → validate → GERBANG TOTAL-KONTROL (saldo awal + Σ mutasi harus =
saldo akhir; mismatch → `staged`, TAK diposting) → posting idempoten (merge by natural-key di
StateDoc firm `bankFeed` via CAS) → SyncJob → audit `action=SYNC`**. `reconcileBank` buktikan
tie-out `posted == consumed`. Provider di-inject: `defaultBankPull()` pilih HTTP bila env, else
fixture.

**Provider** (`integrations/providers/`): `bankFixture.ts` (rekening deterministik, varian sehat +
sengaja-rusak utk uji gerbang) · `httpBank.ts` (`fetch`+Bearer, mTLS=seam drop-in, `not-configured`
anggun bila `BANK_API_*` kosong).

**Webhook** (`integrations/webhook.ts`): `integration.postWebhook` **publicProcedure** (provider
POST tanpa sesi) ber-auth **HMAC-SHA256** atas body kanonik; event pemicu jalankan runner yang sama
(actor `system:webhook`); `not-configured` bila `INTEGRATION_WEBHOOK_SECRET` kosong.

**Router** `integration`: `list`/`status`/`jobs`/`reconcile` (VIEW) · `sync` (MANAGE) ·
`postWebhook` (public+HMAC).

**Klien read-model:** `api.js` `integrationStatus/list/jobs/reconcile/sync` (degradasi anggun null).
`data_import.js` → `setServerData({recon})`; `connectors()`/`reconciliation()` **overlay** angka
server nyata (posted/consumed/tied + `serverBacked`) utk konektor ter-wire, else base simulatif
(fallback offline). `view_platform2.jsx`: tombol **"Sinkronkan Bank"** (MANAGE-gated) → sync nyata +
badge "Bank Feed: server" + chip "live · server" di tab Rekonsiliasi.

**New env vars (semua opsional; absen = fixture/feature-off):**
```
BANK_API_BASE_URL=https://openapi.bca.co.id/v2   # + BANK_API_TOKEN → pakai adapter HTTP (else fixture)
BANK_API_TOKEN=…
BANK_API_ACCOUNT=0182-99-0001                     # opsional query account
INTEGRATION_WEBHOOK_SECRET=<hmac-secret>          # absen = webhook not-configured
```

**W9 SELESAI (Fase 0–3, konektor Bank Feed → cashbank).** Live-proven (Partner login): Sinkronkan →
`wired` 0→1, reconcile posted=5/consumed=5/tied=true (closing 1.500.000), re-sync consumed tetap 5
(idempoten), 0 console error. 116 server vitest + 59 migration vitest (canon fingerprint identik).
**Deferred (W9·2+):** konektor ke-2..8 ter-wire; OAuth login-flow interaktif; scheduler cron;
smoke vs provider berbayar nyata (Coretax/bank/PrivyID/SharePoint).

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
- **RBAC matrix net:** `src/rbac.test.ts` memaku matriks kapabilitas `rbac.ts`
  (SSOT yang dikonsumsi UI **dan** server). Melindungi penegakan **sign-off berbasis
  peran** (lihat invarian di bawah) dari regresi — mis. bila SIGNOFF_REVIEWER/
  OPINION_APPROVE/EQR_REVIEW tak sengaja diberikan ke peran lebih rendah, uji gagal.

## Sign-off berbasis peran (segregation of duties) — INVARIAN

> PRD: `PRD - Penegakan Sign-off Berbasis Peran (Dua-Lapis).md` (Fase 0+1 SELESAI;
> Fase 2 server PENDING). Konteks lengkap di memory `asseris-opinion-signoff-sod-defect`.

Aksi **otoritatif intra-dokumen** WAJIB di-gate ke **peran**, bukan urutan/kelengkapan.
Setiap tombol sign/approve/kliring mengikuti pola `firm_attest.tsx` (`allowed = can(role.cap)`):

| Aksi | Kapabilitas | Boleh |
|---|---|---|
| Sign-off **Reviewer** kertas kerja (`wp_signoff.tsx`) | `SIGNOFF_REVIEWER` | Partner, Manager |
| **Preparer** kertas kerja | `WP_EDIT` | semua auditor |
| Slot opini **Reviu Manajer** (`view_opinion_parts.tsx`) | `SIGNOFF_REVIEWER` | Partner, Manager |
| Slot opini **Rekan Perikatan** | `OPINION_APPROVE` | Partner |
| Slot opini **EQR** | `EQR_REVIEW` | Partner |
| **Kliring/buka** catatan reviu (`view_workspace.tsx`) | `SIGNOFF_REVIEWER` | Partner, Manager |
| **Penerbitan** opini (finalisasi) | `OPINION_APPROVE` | Partner |
| **Persetujuan akseptasi** klien (`view_onboarding.tsx`) | `FIRM_ADMIN` | Partner |
| **Penerbitan** surat perikatan SA 210 → sent/signed (`view_onboarding2.tsx`) | `FIRM_ADMIN` | Partner |

> Identitas penanda-tangan opini direkam dari **sesi** (`auth.user.name`), bukan nama slot
> hardcode — UI menampilkan "Ditandatangani oleh \<nama\>". Jejak audit server (`actorUserId`)
> tetap sumber otoritatif "siapa".

**Penegakan dua-lapis (Fase 1 UI + Fase 2 server — SELESAI):**
- **UI** (`wp_signoff.tsx`/`view_opinion_parts.tsx`/`view_workspace.tsx`): tombol di-gate
  `can(role.cap)` — menutup jalur normal.
- **Server** (`server/src/signoff.ts` `guardSignoffWrite`, dipanggil di `state.set`): `capForWrite`
  hanya gate per-DOKUMEN (`wpState`/`opinionDoc.v1`/`reviewNotes` = `WP_EDIT`; `prospects` =
  `ENGAGEMENT_MANAGE`), jadi guard **mem-diff** nilai tersimpan vs masuk dan menuntut kapabilitas
  per-slot/per-keputusan yang tepat (termasuk akseptasi/penerbitan surat = `FIRM_ADMIN`) —
  menutup request termodifikasi yang lolos gate dokumen. Slot+cap masuk ke `detail` jejak audit
  (metadata-saja). SSOT kapabilitas sama (`rbac`) dengan UI.

**JANGAN tambah sign-off baru tanpa:** (1) gate UI `can()` peran-spesifik, DAN (2) entri di
`guardSignoffWrite` (server/src/signoff.ts) bila aksi menulis ke key engagement sensitif.

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

## W11 — Perluasan TypeScript ke lapisan app (data → view)

> Memperluas TS dari kanon ke **lapisan app**, dimulai dari **lapisan data**
> (`data*.js → .ts`). PRD: `PRD - W11 Perluasan TypeScript — Lapisan Data.md`
> (Proceed: data-first / tier-relaks / beachhead). **LAPISAN DATA SELESAI** (Fase 0–1
> pilot + slice 2–8 + boss `data.js`→`.ts` `be996c2`). Berikut: view `.jsx→.tsx` (W12+).

**Tier (HISTORIS → kini SATU config):** W11–W13 memakai **dua tier terpisah** — kanon
(`tsconfig.json`, full-strict) + app (`tsconfig.app.json`, relaks lalu di-ratchet). **W14 Fase 2
menyatukannya jadi SATU `tsconfig.json` full-strict** untuk seluruh `src` (kanon + data + view +
fondasi + infra), `include` = **glob** `src/**/*.ts(x)`, `npm run typecheck` = **satu** `tsc --noEmit`.
Penjelasan ratchet per-tier di bawah berlaku untuk sejarah W11–W13; keadaan akhir = full-strict tunggal.

**Temuan resolver (penentu resep):** Vite/Rollup **TIDAK** me-resolve specifier
`./x.js` ke file `x.ts` (`build` gagal "Could not resolve"). Tapi **extensionless**
`./x` **resolve** ke `.ts` — persis konvensi kanon W5 (`import './canon'`). ⇒ konversi
**bukan rename-saja**: tiap importer harus ditulis ulang ke extensionless.

**Resep per slice (analog window-strip — terkecil dulu):**
1. `git mv src/data_<x>.js src/data_<x>.ts`.
2. Tulis ulang SEMUA importer specifier `./data_<x>.js` → `./data_<x>` (extensionless).
   Sertakan side-effect import di `main.jsx`. (`grep -rn "data_<x>\.js" src/`.)
3. Tambah `src/data_<x>.ts` ke `include` `tsconfig.app.json`.
4. `tsc -p tsconfig.app.json --noEmit` → perbaiki error (semua **type-only**, nol-runtime):
   - **arity param opsional** — `f(list)` dipanggil `f()` → `f(list?)`; `mk(…,opts)` → `(…,opts?)`.
   - **`unknown` dari index-sig AmsData** (AMS hanya tipe sempit WTB/AJE sampai slice AMS) →
     cast titik-akses `(AMS as any).X`, atau cast var-akar sekali: `const A: any = AMS`
     (paling hemat — satu edit melumpuhkan puluhan error di satu file), atau wrapper
     `const A = (): any => AMS || {}`.
   - **augmentasi AMS_CANON** (file `isak35`/`syariah`/`sakroadmap`/`psak117` menambah metode
     ke objek kanon) → cast LHS: `(AMS_CANON as any).foo = …`.
   - **`Object.values(dyn).sort/map`** atas akumulator dinamis → ketik param callback `:any`
     (`.sort((a: any, b: any) => …)`).
   - **`Date − Date`** → `a.getTime() - b.getTime()` (ekuivalen runtime).
   - **baca/tulis `window.<NS>` residual** → deklarasikan di `src/app-globals.d.ts`
     (peta kopling sisa untuk window-strip-2; terpisah dari `types/globals.d.ts` kanon).
5. Gate berurutan: `lint`(0) → `typecheck`(0, dua-tier) → `build`(no-resolve-fail) →
   `test`(59 + fingerprint identik) → `dev:all` render modul terdampak **0 console error**.
6. Commit `w11(sliceN): data <x>.js → .ts (struktural; angka identik)`.

**Slice-list lapisan data (urut by #importer bernama, excl. side-effect `main.jsx`;
terkecil dulu).** ✅=selesai. Banyak file 0-importer = IIFE yang meng-augment
`AMS`/`window` (hanya `main.jsx` yang me-load); biaya = 1 rewrite specifier + casts.

| # | Modul | Importer | Status |
|---|---|---|---|
| — | `data_licensing` ✅ · `data_proforma` ✅ | 0 | **W11 F1** (pilot; dual-publish & IIFE-augment) |
| ✅ | `data_firmops` `data_fpm` `data_isak35` `data_knowledge` `data_legaldigital` `data_ojk` `data_people` `data_platform` `data_pph23` `data_psak117` `data_records` `data_reg_compliance` `data_risk` `data_sakroadmap` `data_syariah` `data_templates` `data_travel` | 0 | **W11 slice 2** (17 files; 102 errors → 0) |
| ✅ | `data_import` (W9-wired) `data_part3`🔒 `data_part4`🔒 | 1 | **W11 slice 3** (`58e422c`; trio. part3/4 canon-reachable = FULL strict, 43 errs→0) |
| ✅ | `data_facilities` | 2 | **W11 F1** (pilot; ESM-export leaf) |
| ✅ | `data_part1`🔒 `data_procurement` | 2 | **W11 slice 4** (`f8eb4d4`; part1 strict) |
| ✅ | `data_base`🔒 `data_part2`🔒 | 3 | **W11 slice 5** (`77506dc`; fmt/rp + aup engines) |
| ✅ | `data_firmfin` | 4 | **W11 slice 6** (`8f05e8f`; `A():any` + Date.getTime + Object.values casts) |
| ✅ | `data_legal` | 8 | **W11 slice 7** (`40f0777`; 1 err — `(AMS as any).fmt`) |
| ✅ | `data_backoffice` | 16 | **W11 slice 8** (`bd10439`; `BO:any` stops sibling-.ts ripple — see note 2) |
| ✅ | `data` (AMS — **the boss**)🔒 | 149 | **W11 boss** (`be996c2`; `import type {AmsData}` + anotasi eksplisit — see note 3) |

> **⇒ Lapisan data SELESAI — semua `data*.js` → `.ts`.** Boss `data.js` (root AMS,
> 149 importer, 🔒) terkonversi terakhir. Tak ada `src/data*.js` tersisa. Arc berikut:
> view `.jsx → .tsx` (W12+).

> **Note 3 — boss `data.js` & JSDoc-yang-berhenti-dihormati (temuan W11 boss).**
> Saat `data.js` (.js, `checkJs:false`) jadi `data.ts`, JSDoc `/** @type
> {import('./types/globals').AmsData} */` pada `export const AMS` **berhenti
> dihormati**. Efek ganda: (1) AMS jadi tipe **literal konkret** (bukan `AmsData`) →
> augmenter `AMS.proformaEngine = …` (data_proforma dkk) error TS2339; (2) JSDoc
> `import('./types/globals')` tadinya **mem-load ambient kanon** ke app program
> (deklarasi `Window.BENCHMARKS`/`amsResetFigures`), kini tak → file kanon yang
> ditarik transitif app graph (via `import {AMS_CANON} from './canon'`) error
> window-undefined. **Satu fix menutup keduanya:** ganti JSDoc → `import type
> { AmsData } from './types/globals'` **nyata** + `export const AMS: AmsData = {…}`.
> Anotasi nyata dihormati di kedua tier; import nyata menarik ambient kanon ke app
> program; index-sig `[k:string]: unknown` pada `AmsData` menyerap semua augmentasi
> AMS. Pelajaran: di `.ts`, **jangan andalkan JSDoc `@type` lintas-tier** — pakai
> konstruk TS asli. (Plus 4 cast `:any` pada forEach seed-normalisasi & `CLIENTS.find`.)

> **🔒 = canon-reachable ⇒ FULL strict (bukan app-tier relaks).** Temuan slice 3:
> `tsconfig.json` (kanon, full strict) menarik tiap `.ts` di graf impornya. Graf:
> `canon_base`/`canon_part1` → `import './data.js'` → `data.js` meng-import **5 file**:
> `data_base` · `data_part1` · `data_part2` · `data_part3` · `data_part4` (`part2`→`base`).
> Ke-5 itu + `data.js`(boss) **WAJIB lolos `strict:true`** (param `:any` eksplisit, `!`
> pada seed `.find()`, dst) — beda dari slice-2 (17 IIFE yang **hanya** `main.jsx`
> me-load → tak masuk graf kanon → app-tier relaks cukup). `checkJs:false` membuat
> `data.js` sendiri tak dicek, tapi `.ts` yang di-import-nya **tetap** dicek strict.
> **Bukan-🔒** (`data_import`, `data_procurement`, `data_firmfin`, `data_legal`,
> `data_backoffice`) meng-import **dari** `data.js` tapi tak di-import oleh `data.js`/kanon
> → app-tier relaks saja. Cek cepat: `npm run typecheck` (jalankan **kedua** tier).

> **Note 2 — riak tipe konkret antar-`.ts` data file (temuan slice 8).** Mengubah
> data-file **leaf** yang di-import file `.ts` data lain (yang ADA di `include`) membuat
> ekspornya bertipe konkret (bukan `any`), lalu memunculkan error akses-properti di
> konsumen tsb. `data_backoffice` (BO) di-import 9 sibling `.ts` (firmops/facilities/
> legal/licensing/pph23/procurement/records/risk/travel) → tipe baris BO yang ter-infer
> bikin `BO.x.ap/.ppl/.tujuan` "tak ada". **Solusi:** ketik ekspor namespace `const BO: any`
> di hulu (sesuai semangat relaks). `firmfin`/`legal` TAK beriak karena konsumennya `.jsx`
> view (di luar set type-check `include`). Pelajaran utk boss `data.js`: AMS sudah typed
> `AmsData` via JSDoc; konversi `.ts`-nya akan paparkan riak ke **semua** `.ts` data —
> rencanakan AMS export `any`/`AmsData`-luwes.

> Setelah lapisan data: arc terpisah untuk **view `.jsx → .tsx`** (W12+), pola sama,
> `include` tumbuh dengan `src/view_*.tsx`.

**Catatan — side-fix regresi seed (`server/src/seedData.ts`).** Saat verifikasi W11,
`npm run seed` gagal (`Cannot read properties of undefined (reading 'FIRM')`) — **regresi
pra-ada dari window-strip 10z** (`9d14ad8` melucuti tulisan `window.AMS` di `data.js`,
tapi `loadAmsSeed()` masih baca `g.window.AMS`). **Dua fungsi** kena pola sama: `loadAmsSeed`
(window.AMS) + `loadConnectorSeed` (window.IMPORT — strip `e627004`, bikin uji `connector seed
blueprint` RED: 0 < 8). Diperbaiki keduanya: ambil **ekspor ESM** (`mod.AMS`/`mod.IMPORT`), tetap
isi stub window agar pembaca hilir (`data_import.js` baca window.AMS) jalan. 116 server vitest hijau.
BUKAN bagian konversi TS — perbaikan korektif terpisah yang membuka jalur seed/login.

## W12 — Perluasan TypeScript ke lapisan view (`view_*.jsx → .tsx`)

> Lanjutan W11 (lapisan data SELESAI). PRD: `PRD - W12 Perluasan TypeScript — Lapisan
> View (.tsx).md`. Keputusan terkunci (D1–D4): **urut by #importer terkecil-dulu** ·
> `_parts` by importer-count (erat-kopel boleh ride induk) · **ratchet strict = sub-fase
> terminal** (W13+, BUKAN di tengah arc) · **scope = 173 view saja** (16 fondasi
> `ui`/`shell`/`app`/… = W13+). View **bukan canon-reachable** ⇒ semua slice **app-tier
> relaks** (tak ada 🔒). Tier & resolver identik W11; ekstensi `.tsx`, `jsx:"react-jsx"`
> sudah ada di kedua tsconfig.

**Resep per slice (identik W11, ekstensi `.tsx`):**
1. `git mv src/view_<x>.jsx src/view_<x>.tsx`.
2. Tulis-ulang SEMUA importer specifier `./view_<x>.jsx` → `./view_<x>` (extensionless):
   side-effect `main.jsx` + named-import `app.jsx` + sibling view (`grep -rn "view_<x>"`).
   **CATATAN:** hanya rewrite specifier yang menunjuk file YANG DIKONVERSI. Import fondasi
   `./ui.jsx`/`./icons.jsx`/`./shell.jsx`/`./contexts.jsx` **tetap** (fondasi belum dikonversi).
3. Tambah `src/view_<x>.tsx` ke `include` `tsconfig.app.json`.
4. `tsc -p tsconfig.app.json --noEmit` → perbaiki error (type-only, nol-runtime — lihat pola).
5. Gate: `lint`(0) → `typecheck`(0 dua-tier) → `build` → `test`(59 + fingerprint) →
   `dev:all` render modul terdampak **0 console err** (Partner).
6. Commit `w12(sliceN): view_<x> .jsx → .tsx (struktural; angka identik)`.

**⭐ INFRA Fase 0 (sekali, untungkan semua 173 view) — temuan penentu:** konversi naif
per-view menyemburkan **~64 error/view, ~85% dari komponen FONDASI tak-berketik** (`Panel`/
`Btn`/`Badge`/`Stat`/`Avatar` di `ui.jsx`): TS meng-infer prop sebagai **required** karena
destructuring tanpa default → tiap `<Panel noBody>` "missing sub/actions". Tak viable
ditambal `:any` per-view. **Fix infra do-once:**
- **`src/ui.d.ts`** — shim longgar (`type AnyComp = (props:any)=>any;` tiap ekspor ui).
  **Spike membuktikan: sibling `.d.ts` DIHORMATI walau importer pakai `./ui.jsx` eksplisit**
  (basename match ui.d.ts↔ui.jsx) → **TAK perlu** rewrite specifier fondasi. 192→60 error.
  Bridge sementara: **HAPUS saat `ui.jsx → ui.tsx` (W13)**, tipe asli ambil alih.
- **`AmsData.fmt`/`rp`** (`types/globals.d.ts`) — sebelumnya `[k]:unknown` ⇒ `AMS.fmt(...)`
  "not callable". Ditambah `fmt:(n,decimals?)=>string`/`rp:(n)=>string`. 60→19. (Canon-tier
  tetap 0 — fmt/rp memang ada di literal AMS.) `I` (icons) & `SubBar` (shell) ter-infer
  **baik** dari literal/signature → **tak perlu** shim.
- **Shim penyedia-komponen-bersama** (`view_calc.d.ts` dst.) — view penyedia (`view_calc`
  Kv/RowKv 22-imp · `view_analytical` KvBox 48 · `view_docparts`/`bo1`/`onboarding`/`fpm_parts`)
  dikonversi **terakhir** (Fase 2); sampai itu konsumen `.tsx` tarik tipe longgar dari
  `<provider>.d.ts` sibling (`export const RowKv: AnyComp;`). **HAPUS tiap shim saat
  provider-nya → .tsx.** Dibuat **on-demand** saat leaf pertama meng-konsumsi provider.

**Sisa error per-view (minoritas, type-only):**
- **Komponen lokal** (sub-komponen di file view, mis. `KpiCard`/`TBBar`/`EacRow`) prop
  required ter-infer → `function K({a,b}: any)` pada param destructure (hanya yang di-flag tsc).
- **`Object.entries(dyn)`/aritmetika `unknown`** → ketik akumulator `const x: any = {}` +
  param callback `([k,v]: [string, any])`.
- **JSDoc `@type {import(...)}` BERHENTI dihormati di `.tsx`** (= GOTCHA 3 boss W11) → hapus
  (inferensi fungsi sudah memberi tipe) atau ganti anotasi TS asli.
- **Baca `window.<bus>` (BARU, muncul Fase 1; pilot 3 tak kena):** view membaca runtime-bus
  imperatif (`compliancePct`/`__amsOpenSA`/`loadLS`/`useAmsPersist`/`STD_IFRS_ALIAS`/`WP_REFS`/
  `deriveWpStatus`/`collectWpNotes`/`openCanonicalWp`/`SignoffDots`/`amsPrintDoc`). Fix **do-once
  di `types/globals.d.ts`** (`interface Window`, opsional, longgar) — bus ini sengaja dipertahankan
  (CLAUDE §4 + memory window-strip), jadi mengetiknya jujur & tahan-lama; **jangan** sebar
  `(window as any)`. ⚠ `compliancePct` me-return objek ber-`.pct`, BUKAN number → ketik `=> any`.
- **`SubBar`/`shell.*` prop required** saat dipanggil parsial (mis. `<SubBar moduleId="x" />`
  tanpa `right`): pilot 3 tak kena krn selalu kirim semua prop. Fix do-once **`src/shell.d.ts`**
  (shim AnyComp, pola `ui.d.ts`); HAPUS saat `shell.jsx → .tsx` (W13).
- **`Object.entries`/`Object.values(x:any)`** sering balik `[string, unknown][]`/`unknown[]` di
  tier ini → anotasi param callback (`(a:any,b:any)`) atau cast hasil (`as number[]`), bukan
  cuma sumbernya.
- **Metode AMS ad-hoc** (`AMS.kbArticles()`/`kbResolve`/dst) tak di `AmsData` → `(AMS as any).m()`
  per-situs (terlalu banyak utk dienum global). **Method/`Date` aritmetika:** `+date - +ref`.
- **Augmentasi runtime `AMS_CANON.X()`** (batch 3; mis. `ojkAuditComm`/`isak35`/`syariah`/`psak117`/
  `ojkFiling`/`sakHorizon`/`ojkSector`/`ojkSustain`) — metode kanon yg ditambah data_*.js via
  `Object.assign`, TAK ada di tipe strict `canon.ts` → `(AMS_CANON as any).X()` per-situs. **⚠ Jangan
  blind replace_all** — nama metode muncul juga di **prosa JSX** (`<span>AMS_CANON.ojkFiling()</span>`);
  anchor pada konteks kode `=> AMS_CANON\.X\(\)` / `=> canon\.X\(\)` (alias `canon`=AMS_CANON di sebagian view).
- **`Array<string>.reduce(cb, 0)` overload-pick** (psak71 `r.codes:string[]`): TS pilih overload
  homogen `init:string` → `0` ditolak. Fix: cast **array**-nya `(arr as any[]).reduce(...)`, bukan
  param callback/akumulator (anotasi `a:number` malah picu konflik overload-2).

**Slice-list view (urut #importer-bernama, excl. side-effect `main.jsx`; terkecil dulu).**
✅=selesai. Distribusi terukur: 2×0-imp · 154×1-imp (umumnya route `app.jsx`) · 9×2 · 2×3 ·
lalu penyedia 7/9/12/22/29/48.

| # | Modul | Importer | Status |
|---|---|---|---|
| ✅ | `view_subsequent` (leaf murni) · `view_sad` (canon_selectors+hooks) · `view_timebudget` (handler-berat) | 1 | **W12 Fase 0** (pilot/beachhead; infra ui.d.ts + fmt/rp + view_calc.d.ts; 192→0; live-proven Partner) |
| ✅ | **Batch 1 (18, lintas-WS, pure-leaf):** `psak1` `psak2` `psak22` `psak46` `sa200` `sa230` `sa580` `sa701` `hrops`(leave+performance) `payroll` `capacity` `disclosure` `compmatrix` `aje` `jet` `reconcile`(via `dataflow`) `evidence` `kb` | 1 | **W12 Fase 1 batch 1** (144→0; +infra do-once: `shell.d.ts` shim SubBar/TopBar/Sidebar/SettingsMenu, globals.d.ts +runtime-bus `compliancePct(→any)`/`__amsOpenSA`/`loadLS`/`useAmsPersist`/`STD_IFRS_ALIAS`/`WP_REFS`/`deriveWpStatus`/`collectWpNotes`/`openCanonicalWp`/`SignoffDots`/`amsPrintDoc`; 19 route live-proven Partner 0 err) |
| ✅ | **Batch 2 (18+1, lintas-WS):** `psak19` `psak24` `psak25` `psak16` `psak14` `psak48` `psak58` `sa705` `sa710` `opinion` `eqr` `framework` `isqm_deep`(via `isqm`/route `soqm`) `mytasks`(route `tasks`) `scheduler` `settings` `forensic` `diagnostics`(route `diagnostic`) **+`mytasks_parts`** (rode induk, D2) | 1 | **W12 Fase 1 batch 2** (149→0; +infra do-once: `diagnostics_panel.d.ts` shim (DiagnosticPanel/useDiagnostics/…), globals.d.ts +bus `Spark`/`RP_TXN`/`RP_PARTIES`/`LINEAGE`/`AMSOpinion`/`__amsSetSidebar`/`amsApplyPrefs`/`AMS_LLM`/`amsLlmStatus`, **`canon_types.AjeRow` +`desc?`** (narasi psak14/16/58, canon-tier additif), `(api as any).auth.*` cast (tRPC sub-router); 19 route live-proven Partner 0 err incl deep paths isqm_deep tabs/mytasks_parts/settings security+LLM+perm) |
| ✅ | **Batch 3 (18, lintas-WS):** `psak65` `psak66` `psak68` `psak71` `psak117` `isak35` `syariah` `sakroadmap` `sectorck` `sustain` `nonaudit` `ojkfiling` `duediligence` `auditcomm` `audittimeline` `pc_hcm`(via `people`/route `hcm`) `pc_talent`(route `recruitment`+`learning`) `wtb_deep`(via `execution`/route `wtb`) | 1 | **W12 Fase 1 batch 3** (169→0; +infra `globals.d.ts` +`DEFAULT_EXPL`/`computeWtbSummary` (self-publish wtb_deep); pola dominan **`A:any` sumber data AMS** (duediligence/pc_talent/pc_hcm/nonaudit/audittimeline) + **`(AMS_CANON as any).X()`** augmentasi-runtime kanon (8 OJK/syariah view, cast via konteks `=>` agar prosa JSX aman) + `(AMS as any).engine()` + `r.codes as any[]` reduce-overload; 20 route live-proven Partner 0 err incl deep wtb/hcm/pc_talent) |
| ✅ | **Batch 4 (18, lintas-WS, pure-leaf):** `risk` `lease`(route `psak73`) `goingconcern` `icfr` `governance` `internalaudit` `insurance` `invprop` `sa240` `sa501` `sa520` `sa530` `sa540` `sa720` `sa800` `sa805` `sa810` `serviceorg` | 1 | **W12 Fase 1 batch 4** (94→0; **+infra do-once 5 shim penyedia-bersama**: `view_analytical.d.ts` (KvBox, 48-imp), `view_bo1.d.ts` (BoStat/BoBadge/BoTabPanel + boJt/boM), `view_fpm_parts.d.ts` (KV/SectionTitle/MSub/Delta/…, 29-imp), `view_onboarding.d.ts` (OKv, 9-imp), `view_materiality.d.ts` (SliderRow/Compare, 3-imp) — semua AnyComp, **HAPUS saat provider→.tsx**; pola: **`A:any` sumber AMS** (governance cascade) + **`(AMS_CANON as any).X`** augment (sa501 PROV_REGISTER/P57_TREAT) + `(AMS as any).socEngine` (serviceorg) + `SO_ORGS:any[]` + `(+z)` numeric-string compare (goingconcern) + callback `[string,any]` (inds) + local comp `:any` (InsChip/NavRow800/805/810); 18 route live-proven Partner 0 err) |
| ✅ | **Batch 5 (18 + 2 _parts, lintas-WS):** `assoc` `confirm`(+`confirm_parts`) `delivery` `dms` `newdisc` `opening` `pdp` `pppk` `profit`(route `profitability`) `psak72`(+`psak72_parts`) `records` `sa2comm`(route `sa250`/`sa260`/`sa265`) `segmen` `specifics2`(route `expert`) `tax23`(route `tax`) `sjah3000` `spr2400` `firmgl` | 1 | **W12 Fase 1 batch 5** (132→0; **+infra do-once 2 shim**: `view_docparts.d.ts` (PDrawer/PField/PModal/PThread/PTimeline/PVerList, 7-imp), `evidence.d.ts` (FileDropField/FileList/SecurePipeline/EvidenceControl + ams* fns; modul lintas-sektor Fase 3 → W13, pola `diagnostics_panel.d.ts`); pola: **destructure `= AMS as any`** (delivery/profit) + **Date arith `+a - +b`** (delivery/dms/firmgl/pppk) + **helper 2-arg→opsional `(d:any,o?:any)`** (dDate/rrDID, TS2554) + **`(window as any).X` bus** (dms classifyDoc/amsFakeHash/amsFileMeta/amsAttachEvidence) + `(AMS as any).socEngine/.ghgEngine` + `(AMS_CANON as any).pdp()` + `Object.entries/values` callback `[string,any]`/cast `as any[]` (firmgl/profit/dms) + local comp `:any` (CfMeta/CfReconWorksheet/RevCard/P72_SspTable/P72StepHead/P72CritRow) + `SEG_MAP.map`→`:any[]` (segmen dynamic `.assets`); 18 route live-proven Partner fresh-server 0 err) |
| ✅ | **Batch 6 (22, firm-ops/BI/dashboard family):** `login` `bi`(+`bi2`) `bo2`(0-imp, legacy-unused) `bo3`(route `licensing`/`travel`) `clientportal` `cockpit2`(route `cockpit`) `compliance`(ComplianceView fallback) `crypto` `dashboard`(+`dashboard2`) `dataflow`(+`dataflow2`) `facilities`(+`facilities2`) `firmfinance`(route `firmfinance`/`wip`) `firmops`(+`firmops2`) `firmrevenue`(route `revenue`) `firmtax` `firmtreasury`(route `treasury`/`cashbank`/`fixedassets`) `opinion_parts`(0-imp, render via `opinion`) | 0–1 | **W12 Fase 1 batch 6** (282→0; **+infra do-once 2 shim penyedia lintas-sektor Fase 3→W13**: `ai_insights.d.ts` (AiInsightPanel/amsCrossChecks/useAiInsights — dipakai cockpit2/jet), `wp_signoff.d.ts` (WpCompletenessRecap/usePhaseGate/PhaseGateDialog/wpCompletenessFor/useWpSignoff/wpSignersFor/… SEMUA ekspor — wajib superset agar importer .tsx tak putus); pola: **A:any sumber AMS** (bulk `const X = AMS.Y;`→`:any`, −106 err) + **callback param :any** (Object.values→`unknown[]`: `.map/.filter/.sort`) + **reduce seed `{} as any`** + local comp :any + **`(window as any).X` bus** (clientportal/crypto/dataflow: WP_META/amsEvidence*/classifyDoc/amsAttachEvidence/amsFakeHash/amsAudit*/__amsOpenCopilot) + **Date arith `+a - +b`** (cockpit2/firmrevenue/firmtax/firmtreasury) + `(AMS as any).PROP` inline (CPE_REQ/CAPACITY/FIXED_ASSETS/PLATFORM/RISKS/DMS_DOCS/INTEGRITY_RULES) + `(AMS_CANON as any).legalSeal` + `(api as any).auth.login` (tRPC) + tuple `([d,w]: [string,any])`; 16 route live-proven Partner fresh-server 0 err, anak 2-var ter-render via marker induk) |
| ✅ | **Batch 7 (18, leaf 1-importer):** `misc1`(route `strategy`) `misc2`(route `templates`) `pc_org`(route `orgchart`) `pipeline` `platform`(route `approvals`) `platform2`(route `integrations`) `platform3`(route `audittrail`) `related` `sjah3400` `sjah3402` `sjah3410` `sjah3420` `wip_firm`(route `wipreal`) `workspace`(route `reviewnotes`) `evidence2`(via `evidence.tsx`) `psak14_nrv`(via `psak14.tsx`) `psak16_register`(via `psak16.tsx`) `risk2`(via `risk.tsx`) | 1 | **W12 Fase 1 batch 7** (143→0; **tanpa infra shim baru** — semua sibling-import sudah ber-`.d.ts` (`analytical`/`calc`/`fpm_parts`) atau parent sudah `.tsx`; pola: **A:any sumber AMS cascade** (`pc_org` `const A: any = AMS`, 10 org-node live) + local comp `: any` (Th/Num/Line/RN_Row/ApprovalDetail/ImSrc/IntegrationDetail/Node) + `(AMS as any).PROP` inline (PLATFORM/RISKS/ENGAGEMENTS/DMS_DOCS/REVIEW_NOTES/TEMPLATES) + **`(window as any).X` bus** (amsAddProspect/amsIntegrationStatus/Reconcile/Sync) + **Date arith `+a - +b`** (slaInfo/RN_days/expiry) + Object.values/entries callback `(x:any)` + engine call `(AMS as any).pfiEngine/socEngine/ghgEngine/proformaEngine`; 16 route live-proven Partner fresh-server 0 err) |
| ✅ | **Batch 8 (23, TERAKHIR Fase 1 — cluster+sibling):** `pc_conduct`(route `ethics`/`hrcases`)+`ethics_parts` · `presentasi`+`final3`(route `management`) · `relatedsvc`+`nonaudit2` · `spr2410` · `fsgen`+`fsgen_panels` · `isqm`(route `soqm`)+`isqm_parts` · `legal2`(route `firmlegal`)+`legal` · `people`(route `cpe`/`hcm`/`independence`)+`independence_parts` · `analytical2` · `crm2` · `eng2`(route `engagements`) · `onboarding2` · `onboarding3` · `procurement2` · `groupaudit_parts` · `materiality_parts` | 1 | **W12 Fase 1 batch 8** (326→0; **TANPA infra shim baru** — 4 sibling (`ethics_parts`/`final3`/`nonaudit2`) DIKONVERSI langsung (bukan di-shim), `final3` toh route sendiri; non-view model `fsgen_model.jsx` + Fase-2 parent `view_firm`/`view_procurement`/`view_groupaudit` **tetap `.jsx` & ter-infer bersih** (bukti: `fsgen_model` sudah diimpor 8 `.tsx` lain 0-err; `view_firm` tak punya importer `.tsx` lain) → NOL shim; pola dominan: **A:any sumber AMS cascade** (`const A: any = AMS` — ethics_parts/pc_conduct/independence_parts/people/onboarding2 satu anotasi −belasan err) + local comp `: any` (R/KpiTile/EquityStatement/PRSlide/PRStat/MLFinding/AupDocRow/PullRow/Row/Line/SecTitle/ExpResult/NumDriver) + **`Object.values(...) as any[]`** cast (crm2/eng2/onboarding3 — overload `unknown[]`) + callback param `:any` + **Date arith `+a - +b`** (eng2 `+new Date(...) - +today`) + helper trailing param opsional `(v, py?)`/`(no,title,body,psak?)` (TS2554) + engine `(AMS as any).aupEngine/pfiEngine/socEngine/ghgEngine()` (nonaudit2/relatedsvc) + `(window as any).soqmPull` (isqm); 15 route live-proven Partner fresh-server 0 err — semua anak ter-render via parent route) |
| ✅ | **Slice A (8, 2–3 imp, non-mega-provider):** `execution`(route `wtb`/`AJEForm`) · `wp`(route `workpapers`) · `palette`(⌘K) · `cockpit`(`AuditProgramme` route `programme`) · `firm`(`crm`/`engagement`+`EngagementDetail`) · `procurement` · `groupaudit` · `materiality`(penyedia, shim dihapus) | 2–3 | **W12 Fase 2 Slice A** (34→0; **HAPUS `view_materiality.d.ts`** → SliderRow/RailChip/MaterialityCalc tipe asli .tsx, konsumen `lease`(psak73)/`firmfinance`(wip) ditambal SliderRow def `:any`; **infra do-once**: `globals.d.ts` AmsData.rp →`(n,decimals?)` (view_firm fee `rp(c.fee/1e6,0)`) + `Window.clearPersisted?` (bus dual-publish contexts.jsx); pola: local comp `:any` (RailChip/SliderRow/ScoreBar) · `(AMS as any).STAFF/INVOICES/FIRM_AP` (palette forEach) · `Object.entries(...) as [string,any][]` (cockpit effort-tab) · callback `(x:any)`/`([ref,s]:[string,any])`+`patch:any` (wp metrik+sign-chain); 12 route live-proven Partner 0 err incl effort-tab agregasi PIC/crm fee/3+2 slider/EngagementDetail drill/palette 79 hasil) |
| ✅ | **Slice B (6 mega-provider, TERAKHIR ⇒ ARC SELESAI):** `docparts`(7) · `onboarding`(9) · `bo1`(12) · `calc`(22) · `fpm_parts`(29) · `analytical`(48) | 7–48 | **W12 Fase 2 Slice B** (518→0; **HAPUS 6 shim `.d.ts`** → tipe asli .tsx ambil alih, ~80 konsumen tarik infer ketat; **shockwave**: 446/518 = TS2741/2739 "prop hilang" pd komponen penyedia ter-ekspor yg kini infer prop WAJIB; **lever tunggal = anotasi `:any` param destructure komponen ter-ekspor di 6 penyedia** (perl batch-1 `function/const [A-Z]\w*\(\{…\}\)`→`}: any)`) → **518→69 cascade**; sisa 69 penyedia-internal: analytical `const A: any={}` (−65 agg LK pd `{}`)/calc sort `(a:any,b:any)` (Set→unknown[])/onboarding `(window as any).amsAddProspect`; 14 route live-proven Partner fresh-server 0 err lintas-6-penyedia: internalaudit/legal/treasury(KvBox)·bi-132SVG(chart yFmt/series)·sad/treasury(Kv)·facilities/records(BoStat)·governance/dms/clientportal(OKv)·dms/facilities/legal(PDrawer)) |
| ✅ | **⇒ W12 SELESAI: 173/173 view `.tsx`, 0 `.jsx` view.** Fondasi (`ui`/`shell`/`contexts`/`app`/`icons` + `fsgen_model.jsx` + 12 shim `.d.ts` non-view: `evidence`/`wp_signoff`/`ai_insights`/`diagnostics_panel`/`shell`/`ui`/…) = **W13+**. | — | Ratchet app-tier→strict (D3) = sub-fase terminal W13+ |

> **Ratchet strict (D3): sub-fase terminal W13+**, setelah view + fondasi `.jsx` semua
> `.tsx`, agar program app berbalik strict sekaligus tanpa re-error file yang sudah jadi.

## W13 — Fondasi TypeScript (`.jsx → .tsx`) & ratchet `noImplicitAny` — **SELESAI**

> Lanjutan W11 (data) + W12 (view). PRD: `PRD - W13 Fondasi TypeScript & Ratchet
> noImplicitAny.md`. D1 = **nol `.jsx`** (16 fondasi/lintas-sektor → `.tsx`, hapus 6 shim
> `.d.ts`) · D3 = ratchet **bertahap** (`noImplicitAny:true` saja; `strictNullChecks` +
> paritas-kanon + penyatuan tsconfig + infra-`.js` → **W14**) · D4 = urut blast-radius
> menaik. Resep konversi identik W11/W12 (type-strip + rewire specifier extensionless +
> hapus shim → tipe asli ambil alih). Tier & resolver identik.

**Fase 0–3 (`.jsx → .tsx`, D1):** leaf bersih → no-shim fondasi → ber-shim (shockwave).
`e9fd826` F0 (`sa_canonical`/`related_modules`/`minimap`) · `44d0742` F1 (`copilot`/
`ai_extract`/`fsgen_model`) · `4a7f058` F2 (`icons`/`contexts`/`app`/`main` — no-shim;
~185 importer specifier `.jsx`→extensionless via 1 perl) · `1f1555d` F3 (`ui`/`shell`/
`evidence`/`wp_signoff`/`ai_insights`/`diagnostics_panel` — **HAPUS 6 shim**). ⇒ **0
`migration/src/*.jsx`**. Pola F2/F3: React-class boundary `const B:any=React.Component;
extends B` (tak ada @types/react) · CSS import shim `shims-css.d.ts` (braces, non-module) ·
SHOCKWAVE hapus-shim dihindari dgn lever `:any` param destructure **PROAKTIF** saat
konversi (perl `function X({…})`→`({…}: any)`). Sisa `.d.ts` ambient SAH: `app-globals.d.ts`
+ `types/globals.d.ts` + `shims-css.d.ts`.

**Fase 4 — ratchet terminal (`970ba7b`):** flip `tsconfig.app.json` `noImplicitAny:false →
true`. Ledakan **66.433 error → 0** lewat dua lever struktural:
1. **Shim ambient `src/jsx-intrinsics.d.ts`** (di `include` tier-app) — **TANPA @types/react**
   (sejalan keputusan W12/W13; React dipin CDN). Isi: `declare namespace JSX { interface
   IntrinsicElements { [k]:any } … }` + `declare module 'react'/'react/jsx-runtime'/
   'react-dom/client'/'react-dom'`. Menutup **58.487 TS7026** (elemen host JSX `<div>`/… tanpa
   `JSX.IntrinsicElements`) + **371 TS7016** (impor React tak ber-deklarasi). **Permanen/
   struktural** (padanan `shims-css.d.ts`), BUKAN penambal-fondasi yg dihapus.
2. **Anotasi `:any` diagnostik-terpandu** atas **7.482 implicit-any NYATA** — codemod TS-API
   sekali-pakai (lalu dibuang; tak di-commit), **bukan blanket sweep** ⇒ param ter-infer
   kontekstual (tipe nyata) TAK tersentuh. Pemetaan kode→fix:
   - **TS7006** param (5.585) & **TS7031** binding-destructure (856) → anotasi param
     `(x: any)`. **Gotcha kritis:** param arrow tanpa kurung `r => …` TAK boleh ber-anotasi →
     WAJIB jadi `(r: any) => …` (deteksi AST: arrow `getStart()` == param `getStart()` ⇒ tak
     berkurung; cek "char sebelum param == `(`" **SALAH** — `(` itu milik `filter(` bukan param).
   - **TS7053** index akses (1.009) → bungkus objek `(expr as any)[k]`.
   - **TS7018** prop literal implicit-any (~70, multi-pass utk literal bersarang) → cast nilai
     `(… as any)`/`(… as any[])`.
   - **TS7034** var `any[]` (32) → anotasi deklarasi `: any[]`.
   - **Sisa 16 semantik manual:** TS2339 `view_aje` (`const steps: any[] = []` — evolving-array
     settle ke shape push-pertama ⇒ `.from/.to/.delta` hilang) · TS2538 `view_calc`
     (`Array.from(Set)`→`unknown[]` ⇒ `const idxArr: any[]`) · TS7011 arrow return ke konteks
     any (`|| (() => null)` → `((): any => null)`, `() => []` → `(): any[] => []`).

**Rasio `:any` (SC#6 — dilaporkan jujur sbg UTANG W14, bukan disembunyikan):** slice Fase 4
menambah **+5.940 anotasi `: any`** + **+1.068 cast `as any`** (~7.008 penanda any eksplisit).
**Tinggi BY DESIGN** — tipe nyata menuntut paritas-model data AMS (paritas-kanon), yang
eksplisit ditunda W13 → **W14**. Ini **bukan ratchet kosmetik**: hanya node yang `tsc` tandai
yang diberi any; ribuan param ter-infer kontekstual tetap bertipe nyata. Nilai jaring tipe
yang berarti datang dari W14 (strictNullChecks + model AMS), bukan dari memaksa anotasi palsu
sekarang.

**Gate Fase 4 (semua hijau):** migration `lint`/`typecheck` 2-tier (canon FULL strict + app
`noImplicitAny`)/`test` 59/`build` + server `typecheck`/`test` 116 + fingerprint kanon
**identik** (`canon_regression`) + live Partner (dashboard/aje/calc/presentasi/clientportal
render, 0 console err). **Type-erasure murni** ⇒ JS emit identik (annotasi/`as any`/kurung
arrow semua hilang di transpile). **Sisa W14:** `strictNullChecks` · paritas-kanon penuh ·
satukan dua tsconfig · infra `.js → .ts` (`api`/`rbac`/`llm_providers`/`export_*`) · ganti
sebagian `:any` dgn tipe model AMS nyata.

## W14 — Strict penuh (app-tier), unifikasi `tsconfig` & infra `.js → .ts` — **SELESAI**

> Lanjutan W13. PRD: `PRD - W14 Strict Penuh, Unifikasi tsconfig & Infra .js to .ts.md`.
> D1 = full strict + unify + infra `.js→.ts` · D2 = **`:any`-reduction DITUNDA W15** · D3 = guard
> nyata diutamakan (`!` hanya bila invarian terbukti, dihitung) · D4 = urut dependensi.
> **Temuan terukur:** full strict app-tier = hanya **163 error** — murah JUSTRU karena saturasi
> `:any` W13 meng-korslet aliran-null (pisau bermata dua: hardening murah tapi SNC menangkap
> sedikit sampai `:any` dikurangi → W15).

**Fase 0 — Infra `.js → .ts` (`bfa08f9`).** 7 berkas (`api`/`rbac`/`llm_providers`/`export_pdf`/
`export_xlsx`/`related_modules_data`/`related_modules_data2`) → `.ts` di bawah noImplicitAny (SNC
off), masuk himpunan-tercek sebelum flip strict. Resep W11/W12 (rename + rewrite specifier
extensionless + include + perbaiki type-only). Kunci: `const api:any` (klien tRPC tanpa AppRouter
lintas-paket) −40 TS2339; `const LINEAGE:any` (di-augmentasi ~20 key) −cascade kedua file;
`(window as any)` bus; `Object.values(byMod) as any[]` (overload unknown[]); `declare module
'qrcode'` (tanpa @types). **CROSS-PAKET:** `server/src/rbac.ts` impor `../../migration/src/rbac.js`
→ extensionless `./rbac` (Bundler+tsx resolve `.ts`; rename `.js` memutus path lama) — server
typecheck+test wajib (R6).

**Fase 1 — Flip full `strict:true` (`a4c2c78`).** Hapus override `strictNullChecks:false`+`noImplicitAny`
(strict mengaturnya). **167 error → 0:** (1) akar-tunggal `window.useAmsPersist` di
`types/globals.d.ts` dijadikan **non-opsional** (selalu dipublikasi contexts saat load-modul) →
−90 (45 TS18048 + 45 TS2722 di call-site); (2) 77 sisa null-flow (TS18048/18047/2532/2722/2345/
2531/2538/2339/18046) di 21 file via **4 sub-agen paralel cluster-disjoint**, **D3 = guard nyata**
(`?.`/`?? 0`/`?? '—'`/`|| []`/`if (!x) return`/`(e as any).message` utk catch unknown/anotasi tuple
`([k,v]:[string,any])` utk TS2345 Object.entries). **`!` hanya 6 total**, semua ber-komentar
invarian-terbukti (data_psak117 ×3 find atas literal statis · view_platform2 ×2 IMPORT boot-order
AMS · view_dms ×1 filter-terjamin) — SC#4. Side-benefit: 2 bug laten pra-ada kini aman (psak65
`WTB.find('4-1100')`→`?.adj ?? 0`; materiality `pickBench`→no-op).

**Fase 2 — Unifikasi tsconfig (`da45a03`) ⇒ W14 SELESAI.** Gabung `tsconfig.json`+`tsconfig.app.json`
→ **satu** `tsconfig.json` full-strict, `include` = **glob** `src/**/*.ts(x)` (bukan daftar eksplisit
— menutup mode-gagal "lupa tambah file" W11). HAPUS `tsconfig.app.json`. `typecheck` → `tsc --noEmit`
tunggal. R7 bersih (tak ada perkakas lain merujuknya: ESLint non-type-aware, Vite=esbuild, CI lewat
script). Config-only ⇒ bundle byte-identik Fase 1.

**Gate tiap fase (hijau):** migration `lint`/`typecheck`/`test` 59/`build` + server `typecheck`/`test`
116 + fingerprint kanon **identik** + live Partner lintas-route 0 console err (F0: psak65/settings;
F1: icfr/dms/integrations/settings/materiality/jet; F2: smoke dashboard). **Type-erasure + guard
setara ⇒ perilaku runtime identik.** Infra `.js→.ts` murni anotasi.

**Backlog W15:** (a) **`:any`-reduction** — bangun interface model AMS nyata (`AMS`/`WTB`/`AJE`/`RISKS`/…,
paritas-kanon) menggantikan ~7.000 `:any` W13 → menaikkan nilai jaring-tipe (SNC kini menangkap
sedikit krn saturasi `:any`); (b) **test `.js → .ts`** (`*.test.js`/`__fixtures__`/`setup.js`).

## W15 — Model data AMS bertipe + reduksi `:any` (boundary) + ratchet + test `.ts` — **SELESAI**

> Lanjutan W14. PRD: `PRD - W15 Model Data AMS Bertipe & Reduksi any.md`.
> **D1 = "Model + boundary"** (interface koleksi AMS bernilai-tinggi + hapus cast canon-boundary;
> **ekor `:any` lapisan-view leaf DITINGGAL** — bukan full-sweep ke 0) · D2 = ratchet ESLint
> `no-explicit-any` · D3 = test `.js→.ts` ikut.
> **Temuan terukur:** baseline `:any` = **6013** (basis-baris) / **8160** (basis-violasi ESLint).
> Permukaan tipe SUDAH ADA (`canon_types`/`canon_selectors`); gap = `AmsData` hanya ketik
> WTB/AJE/fmt/rp, ~75 koleksi lain `[k:string]:unknown`.

**Fase 0 — Fondasi model (`95c4420`).** Berkas BARU `src/ams_types.ts` = 14 interface koleksi
bernilai-tinggi (FIRM/USER/CLIENTS/ENGAGEMENTS/RISKS/TEAM/WORKPAPERS/ACTIVITY/DEADLINES/REVIEW_NOTES/
TIME_ENTRIES/PIPELINE/INVOICES/STAFF) + reuse WTB/AJE dari canon_types; di-wire ke `AmsData`
(`types/globals.d.ts`), index signature `[k:string]:unknown` DIPERTAHANKAN utk ekor (~60 koleksi tak
perlu diketik sekaligus). **Type-only: 0 err, 0 call-site change, delta nol by-design** — `data.ts`
assign STRUKTURAL (extra-prop OK, hanya missing-required yg error; field enum-ish diketik `string`
bukan union literal → cascade terkendali).

**Fase 1 — Bersihkan cast boundary (`bc999c6`).** `(AMS_CANON as any)` **20→0**, `(AMS as any)` 62→42.
- **AMS_CANON:** interface `CanonAugmentations` (canon_types) + **SATU typed-cast** di canon.ts
  (`const AMS_CANON_BASE={…}; export const AMS_CANON: typeof AMS_CANON_BASE & CanonAugmentations =
  AMS_CANON_BASE as …`). Permukaan calc kanon TETAP presisi; 16 member augmentasi domain (isak35/
  psak117/ojk×4/legalSeal/pdp = factory `() => any`; 6 data = `any`) NON-OPSIONAL (augmenter selalu
  jalan load-modul pra-render — pola useAmsPersist W14). Ganti 20 cast tersebar di 4 augmenter +
  7 view. Pemodelan tipe-balikan factory DITUNDA (deep-typing leaf-view = ekor Non-Scope).
- **AMS:** drop cast member kini ber-tipe (USER/fmt/RISKS/STAFF/TEAM/REVIEW_NOTES/INVOICES/CLIENTS/
  ENGAGEMENTS) via perl presisi. Sisa **42** `(AMS as any)` = koleksi ekor di luar model-14
  (socEngine/PLATFORM/QM_*/…) = remainder kategorikal (di-surface ratchet Fase 3).
- **Type-net tangkap 1 bug nyata:** `data_ojk` `cli()` fallback `{name,npwp}` kurang `industry` →
  konsumen baca `.industry` (sudah ber-guard `||''`) → fix fallback `+industry:''`.

**Fase 2 — Propagasi tipe ke pembaca koleksi (`474319d`).** Drop `:any` callback param yg meng-iterasi
koleksi model-14 ber-tipe → row type mengalir (`CLIENTS.find((cl))`→ClientRow; bi/bi2 sumber
`const CLIENTS/PIPELINE = AMS.X`; psak117/71/syariah `(TEAM.find()||{}).name`→`?.name`). `:any`
5994→5985. **Temuan scope:** jangkauan propagasi TERBATAS — mayoritas iterasi koleksi lewat sumber
`as any` / fallback `|| {}` yg cascade ke hilir; situs cascade-prone/tail-mixed (delivery/profit/
audittimeline/people) SENGAJA dibiarkan `:any` (ekor Non-Scope D1). Idiom `find()||{}` = peluang
tindak-lanjut, bukan scope W15. **Nilai W15 ada di model (F0) + boundary (F1), bukan volume reduksi.**

**Fase 3 — Ratchet ESLint `no-explicit-any` (`7416d4f`).** ESLint kini melint `.ts(x)` (sebelumnya
hanya `.js/.jsx`) via blok flat-config parser `typescript-eslint` (sintaktik, tanpa
`parserOptions.project` → cepat). Rule severity **`error`** (meniru gerbang W13 noImplicitAny); 8160
`:any` yg ADA di-**grandfather** lewat baseline `eslint-suppressions.json` (per-file count), `:any`
BARU = error → `npm run lint` gagal CI/pre-commit. Output tetap bersih (ter-suppress tak dicetak) →
gerbang `no-undef`/hooks lama tetap terbaca. **Severity `error` WAJIB** — fitur suppressions ESLint
hanya berlaku utk error (warn → file kosong). +devDep `typescript-eslint` (lint-time, nol dampak
runtime/bundle) + skrip `lint:any-baseline` (regen+prune saat sengaja menurunkan `:any`).

**Fase 4 — Test-tier `.js → .ts` (`df8a839`) ⇒ W15 SELESAI.** 8 `*.test.js` + `__fixtures__/wtb.js` +
`__tests__/setup.js` → `.ts` ⇒ **NOL `.js`/`.jsx` di src** (migrasi TS tuntas). vitest.config
include/setupFiles/coverage → `.ts`; snapshot canon_regression rename-mengikut, **diff byte-identik**.
tsconfig **EXCLUDE test-tier** (`*.test.ts`+`__tests__`+`__fixtures__`) dari gate strict — kode uji,
bukan permukaan-tipe produksi; `setup.ts` sengaja memalsukan env browser di node (global stub) → tak
layak full-strict. Tetap dijalankan vitest/esbuild & di-lint ESLint (konversi-dari-JS = 0 `:any` →
ratchet bersih).

**Gate tiap fase (hijau):** migration `lint`/`typecheck`/`test` 59/`build` + fingerprint kanon
**identik** + (fase sentuh-UI) live Partner 0 console err (F1: pdp/crypto+Meterai[legalSeal]/
auditcomm/ojkfiling; F2: bi/psak117). **Semua perubahan runtime no-op** (cast-erasure + boolean/`?.`
setara + fallback-key + rename). Net `:any` 6013→**5985** (basis-baris) — kecil by-design (D1); nilai
nyata = model bertipe + boundary bersih + ratchet anti-regresi.

## ESLint gate (`migration/eslint.config.js`)
- **ERROR (hard gate, green):** `no-undef`, `no-dupe-keys`.
- **WARN (W3 remaining worklist, 207):**
  - `react/jsx-no-undef` (44) — only `<window.X/>` dynamic-JSX (rule ignores
    declared globals); Phase 4 rewrites these to imported refs, then → error.
  - `react-hooks/rules-of-hooks` (163) — intentional buildless-era guards
    (`typeof useNav==='function'?…`, `window.useAmsPersist`); dissolve as
    `window` is stripped (Phase 4), then → error.

## Legacy track — window-namespace strip (per-namespace, gated)

> Dissolving the buildless-era `window.<NS>` coupling (~930 reads) one **data
> namespace** at a time. Each slice is structural-only (no behavior/number change)
> and must pass all gates before commit. **KEEP the imperative bus**
> (`__amsOpen*`/`amsApplyPrefs`/`compliancePct`/`__amsNav`) — that is runtime
> plumbing, not a data namespace.

**The repeatable recipe (proven on `PROC`, slice 1 — `2a212d4`):**
1. **Owner data file** (`data_<ns>.js`): turn dual-publish
   ```js
   window.NS = {…}; })();
   export const NS = window.NS;        // codemod footer
   ```
   into a pure ESM export — capture the IIFE, drop the window write:
   ```js
   const NS = (function () { … return {…}; })();
   export { NS };
   ```
   The IIFE may still read **other** namespaces via `window.X` — those are out of
   scope for this slice (leave them; they stay dual-published). Boot order in
   `main.jsx` already loads dependencies first — **do not reorder imports.**
2. **Consumer views/files:** add `import { NS } from './data_<ns>.js'`; rewrite
   `window.NS` → `NS`. Update header comments that mention `window.NS`.
3. **Gates, in order:** `npm run lint` (0) → `npm run typecheck` (0) →
   `npm run build` (no resolution failure) → `npm run test` (59 green, canon
   fingerprint identical) → `npm run dev:all` live render of the affected
   module(s), **0 console error**.
4. **Nol-residu:** `grep -rE "window\.NS" migration/src` → 0 in active code.
5. If the namespace had a `globals.d.ts` entry, drop it once `tsc` stays 0.

**Slice order (coarse, by blast radius — smallest first; per-slice sign-off for
the big ones):** `PROC`✅(6) → `IMPORT`(12, but W9-wired — careful) →
`FIRMFIN`(11) → `FAC`(13) → `FSGEN`(26) → `BO`(40, fans into many data files) →
`LEGAL`(35) → `I`(41) → `AMS_FORENSIC`(10) → `AMS_CANON`(108) → `AMS`(632, the
multi-session boss). Counts = `window.<NS>` reads measured 2026-06-19.

## How the freeze works (W3 history)
- W1 made Vite the build SSOT; W3 Phase 1 completed the import graph
  (jsx-no-undef 444→44); **Phase 2 (here)** committed `src` as canonical and
  stopped codemod regeneration. Phases 3–5: canon/data engine splits → strip
  `window` per-workspace (keep the imperative runtime bus) → promote lint to error.
- To compare against the frozen baseline, the old prod precompile still works
  from `app/` (`cd build; npm run build`) but its output must NOT be shipped.
