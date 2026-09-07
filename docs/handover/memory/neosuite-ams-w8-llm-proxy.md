---
name: neosuite-ams-w8-llm-proxy
description: "NeoSuite AMS W8 COMPLETE — server LLM proxy (key on server, RBAC+rate-limit+redaction) + P4 Fase 3 narration"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6221b25c-0f3d-4ec6-8053-89e1fbdcae85
---

W8 = third wave of Fase B (after [[neosuite-ams-w7-auth]]): replace the LLM **stub**
(`migration/src/llm_providers.js` — registry only, "TIDAK memanggil API nyata") with a real
**server-side proxy**. Governing doc: `PRD - W8 LLM Proxy.md` (repo root). Decisions (PRD §11
recommendations adopted — user said "Proceed" without override): **Q1=A** egress = redacted
finding text only (no raw WTB/client names/NPWP); **Q2=A** Anthropic first + generic OpenAI-compat
adaptor (covers OpenAI/DeepSeek/Kimi; Gemini proxy-pending); **Q3=A** key in server env only
(never browser/DB); **Q4=A** proxy + wire P4 Fase 3 narration; **Q5** LLM_USE granted all 4 roles
(deny-by-default gate kept); **Q6** non-streaming `mutation` (streaming deferred). Unblocks
**P4 Fase 3** (LLM narration over the deterministic diagnostic findings — see [[neosuite-ams-p4-diagnostic]]).

Stack reuse: W6/W7 tRPC `protectedProcedure` + `createContext`→`ctx.user`, Prisma, shared RBAC
SSOT `rbac.js`/`rbac.ts`, append-only-event pattern. **Nol-vendor:** plain global `fetch`
(Node ≥18), NO `@anthropic-ai`/`openai` SDK — keeps the W6/W7 stance + dodges native builds.

**Fase 0 DONE (`8f2932a`)** — server proxy, no client yet. New
`server/src/llm/`:
- `config.ts` — `readLlmConfig(env)`: key from `LLM_API_KEY` (null when unset = the
  `not-configured` signal); `LLM_PROVIDER`/`LLM_MODEL`/`LLM_BASE_URL` override a small
  provider-defaults table (anthropic→/messages compat='anthropic'; openai/deepseek/kimi→
  compat='openai'). Unknown provider + explicit base URL = OpenAI-compat custom endpoint.
- `redact.ts` — **the confidentiality boundary**: `redactFindings()` re-projects each finding
  onto an allow-list (id/detector/sev/std/title/detail/suggestedProcedure) — drops everything
  else; `buildNarrationPrompt()` builds the **server-owned** system+user prompt (client never
  supplies prompt text → can't widen egress).
- `providers.ts` — `complete(cfg,{system,user},fetchImpl=fetch)` dispatched by compat: Anthropic
  (`x-api-key`+`anthropic-version`, parses `content[].text`+`usage.{input,output}_tokens`) /
  OpenAI (`Authorization: Bearer`, parses `choices[0].message.content`+`usage.{prompt,completion}_tokens`).
  `fetch` injected → tests run with no key/network. Non-2xx → throw (caller maps to generic
  INTERNAL; key never surfaced).
- `ratelimit.ts` — in-memory per-user fixed window (default 20/h), injectable clock; `resetRateLimits()`.
- `events.ts` — `logLlmEvent()` best-effort to new `LlmEvent` model; records **usage, NOT content**
  (no prompt/output persisted).
- Router `llm.status` (→ `{configured,canUse,provider,model}`) + `llm.complete`
  (`{task:'narrate-diagnostics', findings:[…max 50]}`; gate `CAP.LLM_USE`; rate-limit; redact;
  call; audit; → `{status:'ok',text,…}` | `{status:'not-configured'}`). zod `findingInput`
  strips unknown keys (structural redaction layer 1).
- `rbac.js`: `CAP.LLM_USE='llm.use'` granted to all 4 roles; gate still deny-by-default.
- schema: `LlmEvent` (append-only). Ran `prisma generate` + `db:push` (dev.db + test.db via globalSetup).
- **13 new tests** (`__tests__/llm.test.ts`): redaction anti-leak (NPWP/clientName/wtbRows dropped),
  config defaults, adaptors via mock-fetch, rate-limit window, router auth(401)/RBAC(deny-by-default
  unknown role→FORBIDDEN)/not-configured-graceful/egress-no-smuggle/NARRATE-audit. **44 server vitest
  green** (was 31), typecheck 0.

**Fase 1+2 DONE (`8195929`) → W8 COMPLETE.**
- F1 (status): `api.js` `llmStatus()`/`llmNarrateDiagnostics()` (degrade → not-configured if server
  absent; client also slims payload = defence-in-depth). `view_settings.jsx` SecAI: **real** server
  status banner (aktif provider/model · or "belum dikonfigurasi" amber) replacing the "tidak memanggil
  API nyata" prototype banner; "Uji koneksi"→"Status proxy server" reads server; key field marked
  display-only ("Proxy memakai kunci di server … tidak dikirim").
- F2 (P4 Fase 3 consumer): `diagnostics_panel.jsx` `<DiagNarration>` + `useLlmNarration` — "Jelaskan
  N temuan" button over OPEN findings → narration + disclaimer ("model bahasa — bukan deterministik;
  verifikasi sebelum dipakai di kertas kerja"); shows only when `status.canUse`; not-configured/error
  → honest message, deterministic panel intact. Cached module-level status promise (`llmStatusCached`)
  avoids per-embed status calls.
- Gate: migration lint 0, typecheck 0, **59 vitest** (zero numeric regression — canon untouched), build.
- **Live-proven** (mock OpenAI-compat upstream `.claude/w8-mock-llm.mjs` :9999, env via temp
  `dev-all-llm` launch config since reverted): login(Manager)→diagnostic→"Jelaskan **17** temuan"→
  narration renders + disclaimer + "openai · mock-narrator"; upstream got **6080 char redacted** text
  (PT RAHASIA/NPWP/wtbRows NOT leaked — also proven by `.claude/w8-verify-proxy.mts`); `LlmEvent`
  NARRATE logged ("findings=17; in=100 out=42" — usage only). Restarted plain `dev-all` (no key):
  status configured=false; narrate→"belum dikonfigurasi di server", deterministik utuh. 0 console err both.

GOTCHAs: (1) browser nav has no global — set `localStorage['ams.route']` + reload to jump views
(command palette didn't index module by label in eval). (2) preview screenshot times out on this app;
use `preview_eval`/`inspect` text assertions (also the recommended path). (3) port gotcha from W7 still
applies — pin `$env:PORT='5181'`.

**REAL-PROVEN vs DeepSeek (`5fdcd7a` era, post-W8):** smoke-tested the live OpenAI-compat path
against `api.deepseek.com` (`deepseek-chat`) via `.claude/w8-verify-proxy.mts` —
`node --env-file=.env.local --import tsx`. Real HTTP, real billed tokens (289 in/364 out), returned a
coherent grounded Indonesian narration (SA 240/PSAK 46 + honest "bukti belum memadai" caveat). **Egress
leak check PASSED against a real third party** (planted PT RAHASIA/NPWP/wtbRows stripped before egress).
Key hygiene: real keys live in **gitignored `server/.env.local`** (LLM_API_KEY/PROVIDER/MODEL), loaded
via Node `--env-file` (NOT auto-loaded by tsx/runtime — only Prisma CLI loads `.env`); tracked
`server/.env` keeps DATABASE_URL only (no secret). Anthropic path still unsmoked (DeepSeek covers the
openai-compat adaptor; Anthropic adaptor is spec-built + unit-tested). **Browser ALSO real-proven**
(`13a68ab`): dev:all → diagnostic → "Jelaskan 17 temuan" → real deepseek-chat narrative rendered
(grouped by theme, SA240/PSAK refs), NARRATE audited (in=2225 out=708), 0 console err. Required a
runtime fix — server never auto-loaded `.env` (only Prisma CLI did), so added `server/src/env.ts`
(`process.loadEnvFile` .env then .env.local, imported FIRST in server.ts) so dev:all picks up the key
on its own. NUANCE: party names that the deterministic engine embeds in a finding's `detail` (e.g.
"Direktur Utama"/"CV Mitra Keluarga" in rpt-exposure) DO egress — they're part of the allow-listed
finding text (Q1=A sends finding text). Only EXTRA top-level identifiers (client name/NPWP/WTB rows)
are stripped. For real client data the firm must weigh that finding details can name related parties.

**Honest boundary:** egress is demo/fictional data; redaction is the production *pattern*, not a
confidentiality guarantee (real client data → provider DPA + W10 hardening). Streaming,
copilot/ai_insights wiring, per-user BYO key = deferred. Next: legacy track (widen TS /
window-namespace strip) or new feature stream.
