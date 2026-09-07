---
name: neosuite-ams-w7-auth
description: "NeoSuite AMS W7 COMPLETE — real auth, sessions & server-enforced RBAC (Fase B, after W6 backend)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 24c2399c-e8f8-4ee5-a592-868068d75855
---

W7 = second wave of Fase B (after [[neosuite-ams-w6-backend]]): replace mock identity/RBAC
with real **auth + server-enforced authorization**. Governing doc: `PRD - W7 Auth, Sesi & RBAC.md`
(repo root). Decisions (recommended in PRD §11, user said "Proceed" without overriding → adopted):
**A** self-hosted email+password+TOTP on the W6 tRPC+Prisma stack (OIDC deferred W10, swappable behind
session abstraction); **B** server-enforced **capability gate** as the W7 core (PERM_MATRIX→SSOT),
per-engagement data isolation = NON-SCOPE (defer W7.5/W9); **C** seed 4 role users + real login,
**delete the act-as role dropdown**; **D** real password/session/timeout/logout/TOTP + login→audit-trail;
defer IP-allowlist/email-login-alerts/cross-device-revoke/email-reset → W10.

Pre-W7 assets: 4 roles (Engagement Partner / Audit Manager / Senior Auditor / Junior Auditor);
`ROLE_CAPS`+`PERM_MATRIX` in `view_settings.jsx:651` were **cosmetic**; `auth.role`/`setRole` a free
dropdown; server W6 had zero auth (all publicProcedure, `createContext:()=>({})`, updatedBy = client claim).

Arc = 4 phases, gate per phase (negative-authz tests + zero numeric regression; W7 doesn't touch
canon/WTB so the 59 migration Vitest + oracle stay pinned, only checked in client-touching phases):
- **Fase 0 DONE (`603e771`)** — server-side auth, no client yet, W6 endpoints stay public (Fase 1
  protects them). **Crypto = Node built-in only** (scrypt password `auth/password.ts`; RFC6238 HMAC-SHA1
  TOTP `auth/totp.ts`) — chose this over bcrypt/otpauth to keep W6 nol-vendor + dodge Windows native
  builds. Schema: User +passwordHash/totpSecret/totpEnabled/failedLogins/lockedUntil (+email @unique);
  models Session (opaque token, absolute expiry + sliding lastSeen, revoke on logout, `SESSION_TTL_HOURS`
  default 8) + AuthEvent (append-only). `context.ts` createContext reads token (Bearer / `ams_session`
  cookie) → ctx.user; `protectedProcedure` in trpc.ts. Router `auth.*`: login (public; 5-fail→15min
  lockout; generic error anti-enumeration), me (public), logout/changePassword(min12)/enrollTotp/
  verifyTotp (protected). Seed 4 role accounts w/ dev passwords (BUILD.md table; primary Anindya/Audit
  Manager stays users[0] → preserves client window.AMS.USER hydration). Gate: typecheck 0; **18 server
  vitest** (6 W6 CAS + 12 auth incl. negatives); live HTTP smoke ok.
- **Fase 1 DONE (`35a3048`)** — shared capability map `migration/src/rbac.js` (ROLES·CAP(7)·GRANTS
  mirror PERM_MATRIX·can·capForWrite) imported server-side via typed `server/src/rbac.ts` (@ts-ignore
  cross-pkg like seedData). W6 endpoints → `protectedProcedure`; `state.set` capability-gated by
  `(scope,key)` (inline `assertCanWrite`: user-scope=self-or-admin; not a static `authorizedProcedure`
  because the cap is dynamic per input); `updatedBy=ctx.user.id` (dropped client updatedBy). state.test
  caller→injected Partner. `authz.test.ts` 11 tests incl. **negatives** (Junior→AJE/clients FORBIDDEN,
  Senior→AJE ok, anon 401, user-scope ownership). 29 server vitest green. EQR = capability, not 5th role.
- **Fase 2 DONE (`21d10b2`)** — client login restores the SPA broken by Fase 1. `api.js`: Bearer token
  in localStorage (httpOnly-cookie = W10), `authFetch` fires `ams:auth-expired` on 401;
  `hydrateCoreFromApi(engId,userId)` sets window.AMS.USER = logged-in user (not always users[0]).
  `view_login.jsx` (new) email+pw, reveals TOTP field on `totp-required`. `app.jsx` `Root` = session
  gate (checking→auth.me · login→`<LoginScreen>` · ready→hydrate-then-`<AppProviders>`). `contexts.jsx`
  `AppProviders({me,onLogout})`: identity/role from `me`, `can()` reads rbac.js SSOT, `setRole`=warn shim
  (act-as removed); useServerState no longer sends updatedBy. `view_palette` UserMenu: "Keluar"→logout
  (revoke), act-as `<select>`→static role chip. Gate: lint 0, build green, 59 migration vitest (zero
  numeric regression). **Live preview proven:** no-session→login; Partner login→app w/ correct identity
  (HW); reload keeps session; logout→login+token cleared; 0 console errors. GOTCHA: preview/port-injecting
  launchers set PORT for the whole `dev:all`, so the server grabbed Vite's port → proxy ECONNREFUSED;
  fix = pin `$env:PORT='5181'` in the launch command (see .claude/launch.json `dev-all`).
- **Fase 3 DONE (`26fa6fd`) → W7 COMPLETE.** UI mirrors server enforcement. (3a) view_settings: removed
  the last act-as dropdowns (SecProfil + SecAkses) → role read-only from session; SecAkses "Ditegakkan
  di server" chip + matrix caption referencing rbac.js SSOT; `isPartner`→`can(FIRM_ADMIN)`. **Zero
  role-`<select>` left in the app.** (3b) SecKeamanan real: changePassword (min12/match), TOTP
  enrollTotp(show secret)+verifyTotp, real Session list (UA/IP/lastSeen + "Sesi ini" current flag) +
  revokeOtherSessions, AuthEvent activity panel. New server endpoints `auth.sessions`/
  `auth.revokeOtherSessions`/`auth.events` (protected). (3c) action gates via `useAuth().can(CAP.*)`
  (CAP imported from rbac.js): AJE add/post/toggle = AJE_EDIT (Junior read-only + amber banner);
  opinion finalize = OPINION_APPROVE (Partner-only + note). Gate: server typecheck 0 + **31 server
  vitest**; migration lint 0 + build + **59 vitest** (zero numeric regression). Live-proven: Junior→AJE
  Baru disabled+banner; SecKeamanan shows real session (UA/IP/"Sesi ini")+LOGIN event; SecAkses no
  dropdown; 0 console err.

Decisions resolved: Q2 = Bearer header + localStorage (not cookie — simpler through Vite proxy;
httpOnly hardening deferred W10); Q3 = keep 4 roles, EQR=capability; Q4 = seed creds in BUILD.md.

**Honest W7 boundary:** RBAC enforced at StateDoc *document* granularity (key→capability); finer
intra-doc gating (e.g. opinion signoff inside wpState) is UI-level can() only. NO per-engagement data
isolation (any authed role reads any engagement) — deferred W7.5/W9. **(W7.5 now DONE — see
[[neosuite-ams-w7-5-isolation]]: membership-gated bootstrap/state/list, Partner/Manager oversight.)** Deferred W10: httpOnly cookies,
IP-allowlist, email login-alerts/password-reset, real cross-device session revoke from other devices.
Next wave: **W8 LLM-proxy** (unblocks P4 Fase 3 LLM narration — see [[neosuite-ams-p4-diagnostic]]).
