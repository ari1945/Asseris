# Plan 003: Honest WP sign-off chain — preparer semantics, live dates, session identity

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 3c6a9c2..HEAD -- src/wp_canon.ts src/view_wp.tsx src/wp_canon.test.ts src/wp_signoff.tsx`
> (`3c6a9c2` = the plan-002 commit this plan builds on; the diff must be empty.)
> Plans 001 and 002 must be merged (derivation lives in `wp_canon.ts` and plan
> 002 is green). This plan edits `deriveWpStatus` inside `wp_canon.ts` and the
> `SignoffTab`/`WPFooter`/`NotesTab`/`EvidenceRegister`/`AssertionRollup`
> components in `view_wp.tsx`.
>
> **Line-ref note**: line numbers in "Current state" are from the **pre-001**
> file (commit `366eb37`). After plans 001–002 the excerpt *content* is
> unchanged, but line numbers shifted (view_wp.tsx shrank ~170 lines;
> `deriveWpStatus` now sits at ~line 118 in wp_canon.ts). Locate each block by
> the quoted code, not the line number.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-wp-canon-extract-tests.md
- **Category**: bug / tech-debt
- **Planned at**: commit `366eb37`, 2026-08-06
- **Issue**: (none)

## Why this matters

Three correctness problems in the WP sign-off/identity layer:

1. **Preparer slot is always "signed" by default.** `deriveWpStatus` and
   `SignoffTab`/`WPFooter` fall back to a synthetic
   `{ by: <preparer>, at: '05 Mar 2026' }` when `chain.preparer` is absent, so
   a never-touched WP (e.g. ref 810, "Not Started") reports `signedCount: 1` and
   the drill shows the Preparer row with a green check and a fake date. The
   "Batalkan" (unsign) button on the Preparer row deletes `chain.preparer` but
   the display falls straight back to the synthetic default — **the button does
   nothing visible**. The sequential gate "reviewer requires preparer signed"
   is therefore fictional.
2. **Sign-off dates are hardcoded.** `SignoffTab` uses `const today =
   '09 Mar 2026'`, the footer stamps `'09 Mar 2026'`/`'05 Mar 2026'`, and
   `deriveWpStatus` defaults use `'05 Mar 2026'`/`'08 Mar 2026'`. Meanwhile the
   parallel sign-off layer `wp_signoff.tsx` uses `wpToday()` (real date). The
   same WP signed through the two UIs gets different dates.
3. **Identity attribution ignores the session.** `EvidenceRegister.add`,
   `AssertionRollup.setConcl` use `(AMS as { USER }).USER.name` (the static
   seed user), and `NotesTab.add` hardcodes `author: 'Anindya P.'` — while the
   rest of the app (e.g. `view_workspace.tsx:70`) uses the W7 session
   (`auth.user.name` via `amsShortName`). Any auditor posting evidence/notes is
   recorded as the seed user.

This plan makes the chain honest (assigned ≠ signed), stamps live dates through
one shared `wpToday()`, and attributes actions to the logged-in session.

## Current state

`migration/src/wp_canon.ts`, inside `deriveWpStatus` (moved verbatim from
`view_wp.tsx:1282-1294` by plan 001):

```ts
  const chain = st.chain || {};
  const listed = !!(firm && firm.activeClient && firm.activeClient.listed);
  const preparer = chain.preparer || { by: meta.preparer, at: '05 Mar 2026' };
  const reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || meta.reviewer || 'Anindya P.', at: st.signedAt || '08 Mar 2026' } : null);
  const partner = chain.partner || null;
  const eqr = chain.eqr || null;
  const signoff = [
    { key: 'preparer', role: 'Preparer', signed: preparer },
    { key: 'reviewer', role: 'Reviewer', signed: reviewer },
    { key: 'partner', role: 'Partner', signed: partner },
  ];
  if (listed) signoff.push({ key: 'eqr', role: 'EQR', signed: eqr });
  const signedCount = signoff.filter(l => l.signed).length;
```

`migration/src/view_wp.tsx`, `SignoffTab` (1122–1133) — the same synthetic
preparer, plus hardcoded `today` (1119):

```ts
  const today = '09 Mar 2026';
  const chain = st.chain || {};
  const preparer = chain.preparer || { by: it[2], at: '05 Mar 2026' };
  const reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || it[3] || 'Anindya P.', at: st.signedAt || '08 Mar 2026' } : null);
  const partner = chain.partner || null;
  const eqrReq = !!activeClient?.listed;
  const eqr = chain.eqr || null;
```

`WPFooter` (1206–1209):

```ts
function WPFooter({ ref_, it, status, st, setWp, locked, doneCount, totalProcs }: any) {
  const reviewer = st.reviewer || (status === 'Reviewed' ? it[3] : null);
  const quickSign = () => setWp(ref_, { status: 'Reviewed', reviewer: 'Anindya P.', signedAt: '09 Mar 2026', chain: { ...(st.chain || {}), preparer: (st.chain && st.chain.preparer) || { by: it[2], at: '05 Mar 2026' }, reviewer: { by: 'Anindya P.', at: '09 Mar 2026' } } });
  const reopen = () => { const nc = { ...(st.chain || {}) }; delete nc.reviewer; delete nc.partner; delete nc.eqr; setWp(ref_, { status: 'In Review', reviewer: null, signedAt: null, chain: nc }); };
```

Identity bugs in `view_wp.tsx`:

- `EvidenceRegister.add` (797): `by: (u && u.name) || 'Auditor'` where `u` is
  `(AMS as { USER?: { name?: string } }).USER` (defined at 796).
- `AssertionRollup.setConcl` (720–721): `by: (u && u.name) || 'Auditor'` with
  the same `(AMS as { USER })` source.
- `NotesTab.add` (1066): `author: 'Anindya P.'`.

The session helpers already exist and are used elsewhere:
`useAuth()` (contexts.tsx:22, exports `auth.user.name`) and
`amsShortName(full)` (contexts.tsx:35-43, normalizes 'Anindya Pramesti' →
'Anindya P.'), imported in `view_workspace.tsx` as
`import { useAudit, useAuth, useFirm, useNav, amsShortName } from './contexts';`.

`wpToday()` is already exported from `wp_canon.ts` (moved there by plan 001).

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Typecheck | `npm run typecheck` (in `migration/`)        | exit 0, no errors   |
| Lint      | `npm run lint`                               | exit 0              |
| Tests     | `npm run test -- wp_canon`                   | all pass            |
| Full suite| `npm run test`                               | all pass            |
| Build     | `npm run build`                              | no resolution failures |

## Scope

**In scope** (the only files you should modify):
- `migration/src/wp_canon.ts`
- `migration/src/wp_canon.test.ts`
- `migration/src/view_wp.tsx`

**Out of scope** (do NOT touch):
- `wp_signoff.tsx` — its `WpSignoff`/`WpConclusion` already use session
  identity and `wpToday()`; it needs no change.
- Role gating of sign-off buttons (SIGNOFF_REVIEWER etc.) — that is plan 004.
- The exec-aware derivation (plan 002) — leave it alone.

## Git workflow

- Branch: `advisor/003-wp-signoff-chain-identity`
- Commit style: `fix(wp): rantai sign-off jujur (assigned ≠ signed) + tanggal live + identitas sesi`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: honest preparer + live dates in `deriveWpStatus`

In `src/wp_canon.ts`, change the chain block to treat the preparer as signed
**only** when actually present in `chain`, and use `wpToday()` for defaults:

```ts
  const chain = st.chain || {};
  const listed = !!(firm && firm.activeClient && firm.activeClient.listed);
  const preparer = chain.preparer || null;                       // assigned ≠ signed
  const reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || meta.reviewer || 'Anindya P.', at: st.signedAt || wpToday() } : null);
  const partner = chain.partner || null;
  const eqr = chain.eqr || null;
  const signoff = [
    { key: 'preparer', role: 'Preparer', signed: preparer, assigned: meta.preparer },
    { key: 'reviewer', role: 'Reviewer', signed: reviewer, assigned: meta.reviewer },
    { key: 'partner', role: 'Partner', signed: partner, assigned: '' },
  ];
  if (listed) signoff.push({ key: 'eqr', role: 'EQR', signed: eqr, assigned: '' });
  const signedCount = signoff.filter(l => l.signed).length;
```

`wpToday` must already be imported/defined in `wp_canon.ts` (plan 001 moved it
there); if not, add `function wpToday() { try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }`.

**Verify**:
- `npm run typecheck` → exit 0.
- `npm run test -- wp_canon` → **update the seed `deriveWpStatus`
  expectations** in `wp_canon.test.ts`: every ref's `signedCount` drops by 1
  (preparer no longer auto-signed): A `2→1`, B `1→0`, C `1→0`, E `1→0`,
  R `1→0`, 300 `2→1`, 810 `1→0`. `fullySigned` stays `false` everywhere.
  Update the two test descriptions that mention "signedCount 1 MESKI belum ada
  tanda tangan" (810) and "reviewer default saja" (A) to reflect the honest
  numbers. Do not change any other expectation.
- `npm run test` → suite green.

### Step 2: honest preparer + live date in `SignoffTab`

In `view_wp.tsx` `SignoffTab`:
- Replace `const today = '09 Mar 2026';` with `const today = wpToday();` and add
  `wpToday` to the existing `./wp_canon` import in this file.
- Replace `const preparer = chain.preparer || { by: it[2], at: '05 Mar 2026' };`
  with `const preparer = chain.preparer || null;`
- Replace `const reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || it[3] || 'Anindya P.', at: st.signedAt || '08 Mar 2026' } : null);`
  with `const reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || it[3] || 'Anindya P.', at: st.signedAt || wpToday() } : null);`
- In the `levels` array, keep `who` (the assigned name) but render **signed**
  state from `signed` only. Change the Preparer row so that when `preparer` is
  null it shows "Belum ditandatangani" (or "Ditugaskan: <it[2]> · belum
  menandatangani"), not a green check. The reviewer/partner/eqr rows keep their
  current rendering.
- `unsign` (1143–1149) already deletes `chain.preparer` correctly; with the
  honest fallback the "Batalkan" button on the Preparer row now has a visible
  effect. No change needed there beyond confirming it.

**Verify**: `npm run typecheck` → exit 0; `npm run lint` → exit 0.

### Step 3: live date + session identity in `WPFooter`

In `view_wp.tsx` `WPFooter`:
- Add `useAuth` to the `./contexts` import in this file
  (currently `import { useAudit, useFirm, useAmsPersist, useNav, useCurrentAuditor } from './contexts';`),
  and `amsShortName` too if not present.
- At the top of the component: `const auth = useAuth(); const me = (auth && auth.user && auth.user.name) ? amsShortName(auth.user.name) : (it[2]);`
  (fallback to the assigned preparer when no session).
- Replace `quickSign` so it stamps the session identity and a live date:

```ts
  const quickSign = () => setWp(ref_, { status: 'Reviewed', reviewer: me, signedAt: wpToday(), chain: { ...(st.chain || {}), preparer: (st.chain && st.chain.preparer) || { by: it[2], at: wpToday() }, reviewer: { by: me, at: wpToday() } } });
```

- `reopen` (1209) has no identity/date bug; leave it.

**Verify**: `npm run typecheck` → exit 0; `npm run lint` → exit 0.

### Step 4: session identity in `EvidenceRegister`, `AssertionRollup`, `NotesTab`

All three components are inside `view_wp.tsx`. Use the same `useAuth` +
`amsShortName` pattern as Step 3 (define `me` once per component, or pass it
down — prefer the local `const { short: me } = useCurrentAuditor();` which is
already imported from `./contexts` and used by `WorkingPapers`).

- `EvidenceRegister.add` (795–801): replace the
  `const u = (AMS as { USER?: { name?: string } }).USER;` /
  `by: (u && u.name) || 'Auditor'` pair with
  `by: me || 'Auditor'` using `useCurrentAuditor().short`.
- `AssertionRollup.setConcl` (718–722): same replacement for `by`.
- `NotesTab.add` (1064–1069): replace `author: 'Anindya P.'` with `author: me`.

`useCurrentAuditor()` returns `{ full, short }` and falls back to the seed user
when there is no session (contexts.tsx:45-49) — exactly the behavior the rest
of the app relies on.

**Verify**:
- `npm run typecheck` → exit 0.
- `npm run lint` → exit 0.
- `grep -rn "AMS as { USER" src/view_wp.tsx` → no matches.

### Step 5: build + smoke

- `npm run build` → exit 0.
- App smoke (`http://localhost:5180`, login as any seeded account): open
  Working Papers → ref 810 drill → Sign-off tab: Preparer row must show
  "belum ditandatangani" (no green check, no "05 Mar 2026"); click "Sign-off"
  on Preparer → date stamps as today's date; open a different WP (e.g. B) →
  add an evidence record → the "Diunggah oleh" shows your session name, not the
  seed user. 0 console errors.

## Test plan

- Update only the `deriveWpStatus` seed expectations in `src/wp_canon.test.ts`
  per Step 1 (signedCount drops by 1 for all 7 refs; `fullySigned` unchanged).
- No new files. The chain/hardcoded-date/identity fixes are component-level and
  covered by typecheck/lint/build + manual smoke (the repo has no component
  test harness for `.tsx` views).
- Verification: `npm run test` → green after the expectation updates.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "preparer = chain.preparer || null" src/wp_canon.ts` matches
- [ ] `grep -rn "05 Mar 2026" src/wp_canon.ts src/view_wp.tsx` returns no matches
- [ ] `grep -rn "08 Mar 2026" src/wp_canon.ts src/view_wp.tsx` returns no matches
- [ ] `grep -n "const today = '09 Mar 2026'" src/view_wp.tsx` returns no matches
- [ ] `grep -rn "AMS as { USER" src/view_wp.tsx` returns no matches
- [ ] `grep -rn "author: 'Anindya P.'" src/view_wp.tsx` returns no matches
- [ ] `wp_canon.test.ts` seed expectations updated (signedCount A=1, 810=0, …)
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0
- [ ] `npm run build` exits 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row for 003 set to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `src/wp_canon.ts` has no `deriveWpStatus` (plan 001 not merged).
- A plan-002 test (exec-aware block) fails after this change — you must not
  regress it; report.
- `wpToday` is not exported from `./wp_canon` (plan 001 partial) — check the
  export list before adding a duplicate.
- A step's verification fails twice after a reasonable fix attempt.
- The change requires touching an out-of-scope file.

## Maintenance notes

- The rule is now **assigned ≠ signed**: `chain.<slot>` presence is the only
  source of truth for "signed". The `assigned` field added to `signoff` is
  display-only metadata; consumers that read `signoff[].signed` keep working.
- Plan 004 builds on this: it will add role gates to `SignoffTab`/`WPFooter`
  and keep the session-identity `me` from these steps.
- If a future plan removes the "seed Reviewed" default-status fiction, revisit
  the `reviewer` default in `deriveWpStatus` (it still synthesizes a reviewer
  for `status === 'Reviewed'` WPs that were never actually signed).
