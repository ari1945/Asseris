---
name: neosuite-ams-w10-hardening
description: "NeoSuite AMS W10 slice 1 COMPLETE — server audit-trail, auth/secret hardening, observability & deploy; container LIVE-SMOKED 2026-06-21 (up+healthz+seed+login on Docker/WSL2)"
metadata: 
  node_type: memory
  type: project
  originSessionId: eb00558c-205e-4c85-9083-8df1187275db
---

W10 = final wave ("Keamanan, ekspor, observability & deploy"). It bundles 7 items, several
infeasible in-sandbox (cloud deploy, e-Meterai/PrivyID vendor, SMTP, TLS). **Slice 1**
(user-chosen via AskUserQuestion 2026-06-18) = **audit-trail core + hardening + observability +
deploy-readiness**; export(PDF/XLSX)+e-Sign deferred to W10.5; nol-vendor kept; deploy target =
container+Postgres (artifacts only, untested-from-here). Governing doc: `PRD - W10 Pengerasan,
Audit Trail Server-Side & Deploy-Readiness.md` (repo root). Builds on [[neosuite-ams-w7-auth]],
[[neosuite-ams-w7-5-isolation]], [[neosuite-ams-w8-llm-proxy]]. On branch `master`.

**Fase 0 DONE (`4a33fd5` "W10 Fase 0: server-side append-only hash-chained audit trail").**
Replaces the CLIENT pseudo-hash demo (`amsFakeHash`/`buildAuditStream` in view_crypto/records)
with a real server chain. `AuditLog` model (seq unique, ts explicit, actor/action/target/detail,
prevHash, hash). `server/src/audit/log.ts`: `appendAudit()` serialized via in-process promise
queue (`tail`) — seq+prevHash consistent under concurrency, single-process deploy assumption;
`hash=SHA-256(seq|ts|actor|action|target|detail|prevHash)` (Node crypto), GENESIS=64×'0';
`verifyAuditChain()` recomputes oldest→newest, returns `{ok,brokenAt,count}`. **Hooked**:
state.set (create+CAS), auth.login/logout, llm.complete. **detail = metadata only** (key + "v3->v4"),
never WP content → trail safe firm-wide. **No update/delete path.** `audit.list`/`audit.verify`
endpoints gated by new `CAP.AUDIT_VIEW` (Partner+Manager, shared rbac.js). Client `api.js`
`auditList`/`auditVerify` (→null offline/forbidden); `view_crypto.jsx` `CRRantai` renders real
chain + live verify, falls back to demo banner when null. **GOTCHA fixed**: `vitest.config.ts`
`fileParallelism:false` — chain is global state every state.set appends to; parallel files raced
on max(seq). +8 audit tests (chain valid, tamper at exact row, re-hash forge caught at NEXT row
via prevHash, state.set hook, RBAC, 20× concurrent monotonic).

**Fase 1 DONE (`b7801b4` "W10 Fase 1: auth & secret hardening").** Closes 3 W7→W10 deferrals.
- **httpOnly cookie** (`auth/cookie.ts`): login sets `Set-Cookie ams_session` (HttpOnly,
  SameSite=Strict, Path=/, Max-Age=TTL; Secure when `COOKIE_SECURE=1`), logout clears. Set via
  new `ctx.setCookie` — `createContext` now takes `res` (v11 standalone passes it) →
  `res.appendHeader`. **Client (api.js) no longer persists token** — in-memory only,
  `credentials:'include'`, clears legacy `ams.auth.token`. Bearer path intact for tests/curl.
- **Encryption-at-rest** (`crypto/secretbox.ts`): AES-256-GCM over `totpSecret`, key
  `APP_ENCRYPTION_KEY` (32B hex/base64). Format `enc:v1:iv:tag:ct`; legacy plaintext readable;
  no-key = dev pass-through; GCM tag = tamper-evident. Wired enrollTotp(store)/login+verifyTotp(read).
- **IP-allowlist** (`security/ipAllowlist.ts`): optional `ADMIN_IP_ALLOWLIST` (exact + IPv4 CIDR),
  off by default, fail-closed; gates auth.login. +17 hardening tests.

**Fase 2 DONE (`b93bd01` "W10 Fase 2: observability + deploy-readiness") → W10 slice 1 COMPLETE.**
- **Observability** (`obs/log.ts`): JSON logs (1 line/event; tRPC onError→log+counter).
  `server.ts` rewritten to `createServer` wrapping `createHTTPHandler` → same port serves
  `GET /healthz` ({status,db,uptime}, `SELECT 1`, 503 if down) + `GET /metrics` (Prometheus text:
  http_requests/errors_total, logins_total, llm_requests_total, audit_appends_total,
  process_uptime_seconds). Vite strips `/trpc` so procedures stay at root — wrapper only
  intercepts the two probe paths. inc() in login/llm/appendAudit.
- **Deploy-readiness (UNTESTED FROM DEV MACHINE)**: `server/Dockerfile` (build context = REPO ROOT
  — server imports migration/src/{rbac,data}.js; flips Prisma provider sqlite→postgresql via `sed`
  at image build), `docker-compose.yml` (app + postgres:16, `db push` on start, healthcheck),
  `.dockerignore`, `.github/workflows/ci.yml` (server typecheck+tests; migration
  lint+typecheck+tests+build — CI-safe: no server test imports data.js, rbac.js has no deps).
  BUILD.md W10 section (env vars, runbook, deferrals).

**Gates (all green):** server typecheck 0 + **84 vitest** (was 59: +8 audit +17 hardening);
migration lint 0 + typecheck 0 + **59 vitest (zero numeric regression — canon untouched)** + build.
**Live-proven (dev:all, Manager Anindya):** real chain links genesis→edc856→2f42c8, verify ok, UI
shows tamper-evident rows + "Terverifikasi", detail metadata-only (no value leak); cookie migration
— reload clears legacy token→login, form login→app boots with NO JS-readable cookie (httpOnly) &
nothing in localStorage, **hard reload restores session purely from cookie**, LOGIN audited;
/healthz ok, /metrics renders, request+audit_appends counters increment on real traffic; 0 console err.

GOTCHAs: (1) `ams.route` localStorage is a PLAIN STRING (`'crypto'`), not JSON. (2) port-steal
gotcha persists — `dev-all` launch pins `$env:PORT='5181'`. (3) preview screenshots time out → use
eval/snapshot. (4) seed creds: Manager `anindya.p@whr-cpa.id`/`Manager#2025!` (BUILD.md table).

**Honest boundary:** append-only enforced at APP layer (no update/delete endpoint; hash-chain
detects direct-DB tamper) — a DB-trigger immutability is a deploy note; in-process append seq
assumes single process. **Deferred W10.5/later:** export PDF/XLSX + e-Meterai/e-Sign (→W10.5 DONE,
[[neosuite-ams-w10-5-export]]), SMTP (email alert/reset), cross-device revoke, full ISQM
retention/legal-hold, OIDC, real Prisma migration history, actual cloud deploy.

**Deploy LIVE-SMOKED (2026-06-21).** Earlier offline pass (`a4222f9`, 2026-06-19) was confirmed
end-to-end on a real Docker host (Docker Desktop / WSL2 backend, distro Alpine; docker CLI NOT on
Windows PATH — reach it via `wsl -e docker …`, project `auditsystem`). Full chain green:
`docker compose up --build` → `auditsystem-{db,server}-1` both healthy → `curl :5181/healthz`
`{"status":"ok","db":"up"}` + `/metrics` renders → `docker compose run --rm server npm run seed`
→ `Seeded: 1 firm, 4 users, 6 team, 8 clients, 7 engagements, 28 WTB rows (ENG-2025-014),
5 memberships, 8 connectors` → `POST /auth.login` Partner `hartono.w@whr-cpa.id` returns token+user
`WHR-EP-0001`, no passwordHash leak. **W11 REGRESSION DISPROVEN AT RUNTIME:** the seed exercises the
only `.js→.ts` surface (`seedData.ts` imports `migration/src/data.js`→`data.ts`,
`data_import.js`→`data_import.ts`); `tsx` resolves both — boot path only touches `rbac.js` (still
`.js`). NO code change needed. tRPC wire: no transformer + httpBatchLink → mutation =
`POST /auth.login?batch=1` body `{"0":{…}}`, server serves procedures at ROOT (Vite strips `/trpc`).
compose serves API+DB only (`:5181`+PG); SPA UI smoke is separate (Vite app → `:5181`). See [[neosuite-ams-w11-typescript-data]].

**W10.1 — CI deploy-smoke (PRD `PRD - CI Deploy-Smoke (W10.1).md`).** Added
`.github/workflows/deploy-smoke.yml` (SEPARATE workflow, NOT a job in ci.yml — `paths:` is
workflow-level so a separate file is the only clean way to scope the filter to deploy files;
ci.yml untouched). Job: `docker compose up --build -d` → poll `/healthz` (40×3s) → `run --rm server
npm run seed` → assert `healthz` grep `"db":"up"` + `POST /auth.login?batch=1` grep `"token"` →
`down -v` always + logs on failure. Env in-job: POSTGRES_PASSWORD dummy + APP_ENCRYPTION_KEY via
`openssl rand -hex 32`→$GITHUB_ENV + COOKIE_SECURE=0. **GOTCHA: GitHub Actions does NOT reliably
expand YAML anchors (`&`/`*`) — duplicated the paths list by hand, do not re-introduce an anchor.**
Validated: YAML parses (yq), both curl|grep assertions exit 0 vs live stack. **HONEST LIMIT: repo
has NO git remote → neither ci.yml nor deploy-smoke.yml has EVER run on Actions; both are ready
artifacts, command chain only locally proven.** Uses dev seed creds (Partner `hartono.w@whr-cpa.id`
/`Partner#2025!`); if seed creds change, update the assert step.

**Earlier offline pass (`a4222f9`, 2026-06-19).** Proven statically: (1) Postgres flip structurally
valid — `prisma migrate diff --from-empty --to-schema-datamodel` on a postgresql copy emits clean
DDL for all 13 tables (5 uniq idx, 10 FK), **zero SQLite-isms** → sed-flip sound. (2) `.dockerignore`
excludes node_modules/dist/*.db/secrets; Dockerfile build-context paths resolve. **FOOTGUN FIXED:**
`tsx` (npm start) + `prisma` CLI (compose `db push`) were **devDependencies** but are RUNTIME tools
in the container start cmd → `npm ci --omit=dev` would've silently broken prod; moved BOTH to
`dependencies` (`@prisma/client` already prod), verified `npm ls --omit=dev` resolves them, server
typecheck 0 + **95 vitest** green; Dockerfile notes `--omit=dev` now safe slim path. **SECRET LEAK
CLOSED:** root `.gitignore` had no `.env` rule → deploy `.env` (POSTGRES_PASSWORD+APP_ENCRYPTION_KEY)
committable; added `.env`/`.env.*`/`server/.env.local` ignores (`server/.env`=sqlite path only, left
tracked). One-shot deploy runbook + findings written to BUILD.md. **Honest gap recorded:** CI
(`ci.yml`) exercises **sqlite only** — a `services: postgres` job would auto-prove the flip (offered,
user deferred). Next options: W9 real connectors (unblock single-WTB-seed limit), legacy track
(widen TS / strip `window`), CI-Postgres job, or live container smoke on a Docker host.
