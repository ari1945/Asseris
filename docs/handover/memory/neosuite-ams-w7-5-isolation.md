---
name: neosuite-ams-w7-5-isolation
description: "NeoSuite AMS W7.5 COMPLETE — per-engagement data isolation (membership-gated bootstrap/state, server-enforced)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6221b25c-0f3d-4ec6-8053-89e1fbdcae85
---

> ⚠️ UPDATE 2026-06-26: seed login Senior/Junior DIRENAME (R1, [[asseris-mytasks-integration]]) —
> **Bagas Nugroho (WHR-SR-0210)→Dimas Raharjo (dimas.r@)**, **Citra Lestari (WHR-JR-0388)→Fajar Nugroho (fajar.n@)**.
> IDs & membership tak berubah; demo isolasi sama, hanya nama/email. Tabel di bawah "Bagas/Citra" = baca Dimas/Fajar.

W7.5 = security follow-up to W7 (NOT the eval's "W9" — that is *real connector integrations*; this
is a W7 deferral). Closes W7's honest gap: *"RBAC enforced at StateDoc document granularity; NO
per-engagement data isolation — any authenticated role reads any engagement — deferred W7.5/W9"*
([[neosuite-ams-w7-auth]]). Governing doc: `PRD - W7.5 Isolasi Data Per-Engagement.md` (repo root).
**Decisions (user-confirmed via AskUserQuestion 2026-06-18):** Q1=A — `ENGAGEMENT_VIEW_ALL` to
**Partner + Manager** (oversight); Senior/Junior limited to their memberships. Q2=A — isolate
**working data** (bootstrap + StateDoc scope=engagement + WTB); the firm-ops **roster** (engagement
names in pipeline/scheduler/profit) stays visible. Q3 server+client; Q4 membership = access only
(firm role still governs capability).

**The gap (pre-W7.5):** `bootstrap(anyEngId)` + `state.get/set` scope=engagement were
`protectedProcedure` gated only by capability `(scope,key)` — NOT by whether the user belonged to the
engagement. Any login could read another engagement's working papers/AJE/conclusions/diagnostics. No
user↔engagement model existed (`Engagement.partner/manager` are free-text names that don't even match
seed login users).

**Fase 0 DONE (`3653add`)** — server enforcement. New `EngagementMember(engagementId, userId)`
(+`@@unique`/`@@index`, relations on User/Engagement). `rbac.js`: `CAP.ENGAGEMENT_VIEW_ALL=
'engagement.viewAll'` granted Partner+Manager only. `server/src/engagementAccess.ts`:
`assertEngagementAccess(user, engId)` (view-all OR member, else FORBIDDEN), `accessibleEngagementIds`
('all' | id[]). Router: gate `bootstrap` (input.engagementId), `state.get`/`state.set` when
scope==='engagement' (engagement gate BEFORE the W7 capability gate), and `engagement.list` filtered to
accessible. Seed: 4 accounts → `ENG-2025-014` (boot bootstraps it for everyone → boot stays safe);
Senior (Bagas WHR-SR-0210) also → `ENG-2025-031` (so Junior→031 FORBIDDEN, Senior→031 OK = the demo).
**Seed FK fix:** added `session.deleteMany()`/`authEvent.deleteMany()` before `user.deleteMany()` —
re-seed after anyone had logged in tripped a P2003 FK violation (Session/AuthEvent → User). Tests:
`engagement_isolation.test.ts` (15 — read/write/bootstrap/list isolation, member+non-member+oversight+
anon+user-scope-unaffected, helpers). `authz.test.ts` updated: it tests the *capability* gate, so its
Junior/Senior principals now get a `beforeAll` firm/client/engagement/user/EngagementMember setup
(otherwise the new engagement gate would mask the capability behaviour). **59 server vitest** (was 44),
typecheck 0.

**Fase 1 DONE (`19286ea`) → W7.5 COMPLETE.** Client UX. `contexts.jsx` FirmProvider: fetch accessible
set from `api.engagement.list` (server-filtered), expose `accessibleEngagementIds` +
`canAccessEngagement`, **wrap `setActiveEngagementId`** in a guard that refuses inaccessible ids (so
ALL 86 `useFirm()` consumers get enforcement without edits — the switch action funnels through this),
and an effect that auto-corrects a stale active engagement to the first accessible. Switchers filtered:
`shell.jsx` TopBar dropdown + `view_palette.jsx` command palette only list accessible engagements.
Degrades offline (server down → accessibleEngIds=null → no UI restriction; server still enforces).
Gate: lint 0, typecheck 0, **59 migration vitest** (zero numeric regression — canon untouched), build.

**Live-proven (dev:all, 3 roles):**
| Role | engagement.list | bootstrap ENG-031 | switcher |
|---|---|---|---|
| Junior (Citra) | [ENG-2025-014] | FORBIDDEN | 1 |
| Senior (Bagas) | [ENG-014, ENG-031] | ALLOWED | 2 |
| Manager (Anindya, oversight) | all 7 | ALLOWED | all |
0 console err. Manager = demo default → unchanged (sees all).

**Honest boundary:** isolates engagement *working data*, not the *existence* of engagements in
firm-ops roster views (Q2 — intentional). No per-firm multi-tenancy. No membership-management UI (seed
+ `accessibleEngagementIds`/`assertEngagementAccess` only — admin screen = later). Boot still hardcodes
`bootstrap(DEFAULT_ENG='ENG-2025-014')`; safe because all seed users are members — a non-member-of-default
user would hit the offline fallback then FirmProvider corrects activeEng (edge case, demo doesn't trigger).
Encryption-at-rest/retention/deploy = W10. Next: W10 hardening, or new feature stream.
