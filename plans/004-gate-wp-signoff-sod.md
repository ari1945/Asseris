# Plan 004: Role-gate the WP drill sign-off (SoD) + sign with session identity

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 55594d9..HEAD -- src/view_wp.tsx src/rbac.ts`
> (`55594d9` = the plan-003 commit this plan builds on; the diff must be empty.)
> Plans 001, 002, 003 must be merged first. The excerpts below assume the
> **post-003** state of `SignoffTab`/`WPFooter` (honest `preparer`, `wpToday()`,
> session `me`). If a prior plan changed the code differently than expected,
> compare the excerpts and adapt within the intent of this plan.
>
> **Line-ref note**: line numbers in the excerpts are from the **pre-001** file
> (commit `366eb37`); after plans 001–003 the *content* is as quoted but at
> different line numbers. Locate each block by the quoted code.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-wp-canon-extract-tests.md, plans/002-unify-wp-status-derivation.md, plans/003-wp-signoff-chain-identity.md
- **Category**: security / tech-debt
- **Planned at**: commit `366eb37`, 2026-08-06
- **Issue**: (none)

## Why this matters

BUILD.md declares that every authoritative intra-document action (sign /
approve / clear) is gated to a **role**, not to ordering or completeness — and
the server enforces it per-slot in `server/src/signoff.ts:34-38`
(`reviewer → SIGNOFF_REVIEWER`, `partner → OPINION_APPROVE`,
`eqr → EQR_REVIEW`). The shared sign-off layer `wp_signoff.tsx` honors this
(`useWpSignoff.canReview`, `WpSignoff` gates its buttons).

The WP module's own drill, however, has a **second, ungated sign-off path**:

- `SignoffTab` in `view_wp.tsx` lets any logged-in user click "Sign-off" on the
  Reviewer / Partner / EQR rows (its `canSign` checks only ordering + `locked`),
  and records the signer as the hardcoded slot name (`lvl.who`, e.g.
  "Anindya P." / "Hartono W.") instead of the session user.
- `WPFooter.quickSign` marks a WP "Reviewed" with one click — no role check, and
  it stamps the assigned reviewer name, not the session.

Consequences:
- When the server is up, a low-privilege user gets a silent 403 on the write
  (the optimistic local state may even look changed until reconcile) — a broken
  UX, and the record's `by` is still not the session identity.
- When the server is absent (offline/dev degradation, which the app explicitly
  supports — contexts.tsx degrades to cache-only), there is **no enforcement at
  all**, and the UI has already claimed an authoritative sign-off.
- The audit trail / print signature block (`wpSignersFor` reads `chain`) records
  a slot name that may not be the actual signer.

This plan makes the drill's sign-off UI gate the same `CAP` capabilities as
`wp_signoff.tsx` and record the session identity — closing the parallel ungated
path and matching the server's per-slot enforcement.

## Current state

`migration/src/view_wp.tsx` — `SignoffTab` (post-003; line refs approximate):

```ts
  const canSign = (idx: any) => !locked && !levels[idx].signed && (idx === 0 || !!levels[idx - 1].signed);
  const sign = (idx: any) => {
    const lvl = levels[idx];
    const patch: any = { chain: { ...chain, [lvl.key]: { by: lvl.who, at: today } } };
    if (lvl.key === 'reviewer') { patch.status = 'Reviewed'; patch.reviewer = lvl.who; patch.signedAt = today; }
    if (lvl.key === 'preparer' && (status === 'Not Started' || status === 'In Progress')) patch.status = 'In Review';
    setWp(ref_, patch);
  };
  const unsign = (idx: any) => {
    const lvl = levels[idx];
    const nc = { ...chain }; delete nc[lvl.key];
    const patch: any = { chain: nc };
    if (lvl.key === 'reviewer') { patch.status = 'In Review'; patch.reviewer = null; patch.signedAt = null; }
    setWp(ref_, patch);
  };
```

The `levels` array (post-003) is built as:

```ts
  const levels = [
    { key: 'preparer', role: 'Preparer', who: it[2], desc: '...', signed: preparer },
    { key: 'reviewer', role: 'Reviewer (Manager)', who: 'Anindya P.', desc: '...', signed: reviewer },
    { key: 'partner', role: 'Engagement Partner', who: 'Hartono W.', desc: '...', signed: partner },
  ];
  if (eqrReq) levels.push({ key: 'eqr', role: 'EQR (Penelaah Mutu)', who: 'Sari Dewanti', desc: '...', signed: eqr });
```

And the signed-row button:

```ts
              {l.signed
                ? <button className="btn sm" disabled={locked} onClick={() => unsign(i)} style={{ flex: '0 0 auto' }}><I.sync size={12} /> Batalkan</button>
                : <Btn sm variant={canSign(i) ? 'primary' : ''} disabled={!canSign(i)} onClick={() => sign(i)} style={{ flex: '0 0 auto' }}><I.check size={13} /> Sign-off</Btn>}
```

`WPFooter` (post-003):

```ts
  const quickSign = () => setWp(ref_, { status: 'Reviewed', reviewer: me, signedAt: wpToday(), chain: { ...(st.chain || {}), preparer: (st.chain && st.chain.preparer) || { by: it[2], at: wpToday() }, reviewer: { by: me, at: wpToday() } } });
  const reopen = () => { const nc = { ...(st.chain || {}) }; delete nc.reviewer; delete nc.partner; delete nc.eqr; setWp(ref_, { status: 'In Review', reviewer: null, signedAt: null, chain: nc }); };
```

The gated reference implementation to mirror: `migration/src/wp_signoff.tsx`,
`useWpSignoff` (161) and `WpSignoff` (217–249):

```ts
  const canReview = !auth || typeof auth.can !== 'function' || auth.can(CAP.SIGNOFF_REVIEWER);
```

Capability constants (`migration/src/rbac.ts`):
`CAP.WP_EDIT` (all auditors), `CAP.SIGNOFF_REVIEWER` (Partner + Manager),
`CAP.OPINION_APPROVE` (Partner), `CAP.EQR_REVIEW` (Partner).

Server reference — the exact per-slot authority (`server/src/signoff.ts:34-38`):

```ts
const WP_CHAIN_CAP: Record<string, string> = {
  reviewer: CAP.SIGNOFF_REVIEWER,
  partner: CAP.OPINION_APPROVE,
  eqr: CAP.EQR_REVIEW,
};
```

Note: `preparer` has no cap in the map — signing preparer is `WP_EDIT`
(all auditors). But **removing** preparer via `unsign(0)` also deletes the
reviewer, so the Preparer "Batalkan" button must be gated like the reviewer slot.

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Typecheck | `npm run typecheck` (in `migration/`)        | exit 0, no errors   |
| Lint      | `npm run lint`                               | exit 0              |
| Tests     | `npm run test`                               | all pass (rbac matrix still green) |
| Build     | `npm run build`                              | no resolution failures |

## Scope

**In scope** (the only files you should modify):
- `migration/src/view_wp.tsx` (`SignoffTab` and `WPFooter`)

**Out of scope** (do NOT touch):
- `server/src/signoff.ts` — already correct; client gates must *match* it, not change it.
- `wp_signoff.tsx` — already gated.
- `src/rbac.ts` — the capability matrix is correct; the rbac matrix test
  (`rbac.test.ts`) protects it. Do not add capabilities.
- The chain/date/identity work from plan 003.

## Git workflow

- Branch: `advisor/004-wp-signoff-sod-gate`
- Commit style: `fix(wp): gate sign-off drill ke peran (SoD) + identitas sesi — selaras wp_signoff/server`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: import the capability module + auth in `view_wp.tsx`

Add to the imports:

```ts
import { CAP } from './rbac';
```

Ensure `useAuth` is in the `./contexts` import (plan 003 added it). If it is
not there, add it now.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: gate `SignoffTab` per slot + sign with session identity

Inside `SignoffTab`:

1. Add a per-slot capability map at module level (top of the file, near the
   other `const` tables):

```ts
/* Otoritas slot rantai sign-off WP — SELARAS dengan server/src/signoff.ts
   (WP_CHAIN_CAP) dan wp_signoff.tsx. `preparer` = WP_EDIT (semua auditor). */
const WP_SLOT_CAP: Record<string, string> = {
  preparer: CAP.WP_EDIT,
  reviewer: CAP.SIGNOFF_REVIEWER,
  partner: CAP.OPINION_APPROVE,
  eqr: CAP.EQR_REVIEW,
};
```

2. In `SignoffTab`, derive the current user and capability checker:

```ts
  const auth = useAuth();
  const me = (auth && auth.user && auth.user.name) ? amsShortName(auth.user.name) : it[2];
  const can = (cap: string) => !auth || typeof auth.can !== 'function' || auth.can(cap);
```

   (`amsShortName` must already be imported — plan 003 did; if not, add it to
   the `./contexts` import.)

3. In the `levels` array, attach the capability to each level:

```ts
  const levels = [
    { key: 'preparer', role: 'Preparer', who: it[2], cap: WP_SLOT_CAP.preparer, desc: '...', signed: preparer },
    { key: 'reviewer', role: 'Reviewer (Manager)', who: 'Anindya P.', cap: WP_SLOT_CAP.reviewer, desc: '...', signed: reviewer },
    { key: 'partner', role: 'Engagement Partner', who: 'Hartono W.', cap: WP_SLOT_CAP.partner, desc: '...', signed: partner },
  ];
  if (eqrReq) levels.push({ key: 'eqr', role: 'EQR (Penelaah Mutu)', who: 'Sari Dewanti', cap: WP_SLOT_CAP.eqr, desc: '...', signed: eqr });
```

4. Gate `canSign`:

```ts
  const canSign = (idx: any) => !locked && !levels[idx].signed && can(levels[idx].cap) && (idx === 0 || !!levels[idx - 1].signed);
```

5. Sign with the session identity (not the slot name):

```ts
  const sign = (idx: any) => {
    const lvl = levels[idx];
    const patch: any = { chain: { ...chain, [lvl.key]: { by: me, at: today } } };
    if (lvl.key === 'reviewer') { patch.status = 'Reviewed'; patch.reviewer = me; patch.signedAt = today; }
    if (lvl.key === 'preparer' && (status === 'Not Started' || status === 'In Progress')) patch.status = 'In Review';
    setWp(ref_, patch);
  };
```

6. Gate the signed-row "Batalkan" button by the slot capability. The Preparer
   row's unsign removes the reviewer too, so use the reviewer cap for it:

```ts
              {l.signed
                ? <button className="btn sm" disabled={locked || (l.key === 'preparer' ? !can(WP_SLOT_CAP.reviewer) : !can(l.cap))} onClick={() => unsign(i)} style={{ flex: '0 0 auto' }}><I.sync size={12} /> Batalkan</button>
                : <Btn sm variant={canSign(i) ? 'primary' : ''} disabled={!canSign(i)} onClick={() => sign(i)} style={{ flex: '0 0 auto' }}><I.check size={13} /> Sign-off</Btn>}
```

   Add an explanatory `title` on the disabled Sign-off / Batalkan buttons:
   `title={canSign(i) ? undefined : 'Peran Anda tidak berwenang untuk slot ini'}`.

**Verify**:
- `npm run typecheck` → exit 0.
- `npm run lint` → exit 0.
- `grep -n "by: lvl.who" src/view_wp.tsx` → no matches.

### Step 3: gate `WPFooter` quick sign-off / reopen

In `WPFooter`:

1. Derive the reviewer capability:

```ts
  const auth = useAuth();
  const canReview = !auth || typeof auth.can !== 'function' || auth.can(CAP.SIGNOFF_REVIEWER);
```

2. Render the footer button so a user without `SIGNOFF_REVIEWER` cannot mark a
   WP Reviewed or reopen it:

```ts
      {locked
        ? <Badge kind="gray"><I.lock size={12} /> Read-only</Badge>
        : status !== 'Reviewed'
          ? canReview
            ? <Btn variant="primary" onClick={quickSign}><I.check size={14} /> Sign-off Review</Btn>
            : <span className="tiny muted" style={{ color: 'var(--ink-3)' }}><I.lock size={11} /> Sign-off review hanya oleh Reviewer berwenang</span>
          : canReview
            ? <Btn onClick={reopen}><I.sync size={14} /> Buka Kembali</Btn>
            : <span className="tiny muted" style={{ color: 'var(--ink-3)' }}><I.lock size={11} /> Hanya Reviewer berwenang</span>}
```

   `quickSign`/`reopen` bodies stay as plan 003 left them (session `me`,
   `wpToday()`).

**Verify**:
- `npm run typecheck` → exit 0.
- `npm run lint` → exit 0.

### Step 4: build + smoke (role matrix)

- `npm run build` → exit 0.
- `npm run test` → full suite green (especially `src/rbac.test.ts`).
- App smoke against the running backend (`http://localhost:5180`):
  1. Login as **Junior** (`fajar.n@whr-cpa.id` / `Junior#2025!`). Open Working
     Papers → any WP → Sign-off tab: the Reviewer/Partner/EQR rows' "Sign-off"
     buttons must be disabled (with the title hint); the footer must show the
     reviewer-only hint, not the button. Confirm the server does not receive a
     chain write for those slots (no 403; buttons simply don't fire).
  2. Login as **Manager** (`anindya.p@whr-cpa.id` / `Manager#2025!`): the
     Reviewer row Sign-off is enabled; clicking it stamps the Manager's session
     name (e.g. "Anindya P.") and today's date. The Partner/EQR rows stay
     disabled (OPINION_APPROVE/EQR_REVIEW are Partner-only).
  3. Login as **Partner** (`hartono.w@whr-cpa.id` / `Partner#2025!`): Partner
     and (for a listed client, e.g. ref A) EQR rows become signable.
  - 0 console errors throughout.

## Test plan

- No new unit tests (the repo has no component test harness for `.tsx` views).
- The capability matrix is already pinned by `src/rbac.test.ts` — it must stay
  green (this plan consumes `CAP`, does not change it).
- Manual role smoke in Step 4 is the verification surface; the server guard
  (`server/src/signoff.ts`) is the defense-in-depth backstop and is unchanged.
- Verification: `npm run test` → green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `WP_SLOT_CAP` exists in `src/view_wp.tsx` with the four slots
- [ ] `grep -n "by: lvl.who" src/view_wp.tsx` returns no matches (sign uses `me`)
- [ ] `grep -n "const canSign" src/view_wp.tsx` shows a gate that includes `can(levels[idx].cap)`
- [ ] `grep -n "canReview" src/view_wp.tsx` appears in `WPFooter`
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0 (rbac matrix + all suites green)
- [ ] `npm run build` exits 0
- [ ] `git diff --stat HEAD -- src/server 2>$null` (no server changes) — confirm `server/src/signoff.ts` is untouched
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row for 004 set to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The `levels` array does not match the post-003 excerpt (plan 003 not merged
  or changed shape) — adapt only the extraction, keep this plan's intent.
- `rbac.test.ts` fails after your change — you changed capability wiring; revert
  and report.
- The server (`server/src/signoff.ts`) appears to need a change to make a role
  scenario work — that means the client gate or the server cap is the wrong one;
  STOP and report instead of editing the server.
- A step's verification fails twice after a reasonable fix attempt.
- The change requires touching an out-of-scope file.

## Maintenance notes

- The drill sign-off and the SubBar `WpSignoff` now enforce the **same**
  capabilities and both record the session user — there is no longer a parallel
  ungated path. Any future sign-off action must add both a `can(CAP.*)` gate
  here AND the matching entry in `server/src/signoff.ts` (BUILD.md's rule).
- The `me` fallback `it[2]` (assigned slot name) applies only when no session
  exists (render outside provider/offline) — acceptable defensive default; the
  server still enforces authority on real writes.
- If the drill gains a 4th authoritative action (e.g. "finalize WP"), follow the
  same pattern: slot cap + session identity + server guard entry.
