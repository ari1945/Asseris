# Plan 002: Unify the WP status derivation — single exec-aware path in `wp_canon.ts`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat fdaa1f5..HEAD -- src/wp_canon.ts src/view_wp.tsx src/wp_canon.test.ts`
> (`fdaa1f5` = the plan-001 commit this plan builds on; the diff must be empty.)
> If any in-scope file changed since then, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. In particular, plan 001 must be
> merged first — this plan assumes `deriveWpStatus`, `procStatusAt` and
> `defaultProcState` already live in `src/wp_canon.ts`.
>
> **Line-ref note**: line numbers in "Current state" are from the **pre-001**
> file (commit `366eb37`). After plan 001 the excerpt *content* is unchanged,
> but it sits at different line numbers (view_wp.tsx shrank by ~160 lines).
> Locate each block by the quoted code, not the line number.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-wp-canon-extract-tests.md
- **Category**: bug / tech-debt
- **Planned at**: commit `366eb37`, 2026-08-06
- **Issue**: (none)

## Why this matters

There are two divergent derivations of a working paper's procedure status:

- `procStatusAt(ref, st, status, defs, i)` (`wp_canon.ts`) is **exec-aware** —
  it derives status from the saved test items (`st.exec['p'+i].items`) first,
  falling back to legacy `st.procs` flags and then the `defaultProcState`
  heuristic. This is what the WP drill (ProcsTab) shows.
- The index metrics in `WorkingPapers` (`view_wp.tsx`, the `metrics` useMemo)
  and `deriveWpStatus` (the SSOT consumed by SA 2xx/3xx/5xx pages, the client
  portal and the cockpit) read only `st.procs` and fall straight to the
  heuristic — they **never** see `st.exec`.

Since the Fase-1 execution workflow writes only `st.exec` (`setExec` →
`setWp(ref_, { exec: { ...['p'+i]: { items, concl } } })`, `view_wp.tsx:667`),
a WP whose procedures have real test items shows one status in the drill and a
different one in the index and the SA pages. Example: WP B has 6 procedures;
after the auditor runs items on `p0` with one `exc`, the drill reports a
Pengecualian while the index and `deriveWpStatus` still show the seed
heuristic. This is a user-visible SSOT violation inside the module's core.

This plan makes `deriveWpStatus` and the index metrics use the same
exec-aware derivation, and pins the new behavior with tests. For the seed
(no `st.exec` anywhere) the numbers are unchanged — the seed tests from plan
001 stay green.

## Current state

In `migration/src/wp_canon.ts` (after plan 001):

`procStatusAt` — the exec-aware core (moved verbatim from `view_wp.tsx:71-75`):

```ts
function procStatusAt(ref: any, st: any, status: any, defs: any, i: any) {
  const es = execStatus((st.exec || {})['p' + i]);
  if (es) return es;
  return (st.procs && st.procs['p' + i] != null) ? st.procs['p' + i] : defaultProcState(ref, status, i, defs.length);
}
```

`deriveWpStatus` — currently reads only `st.procs` (non-exec), the same block
exists in `view_wp.tsx`'s `metrics` useMemo (`view_wp.tsx:128-133`):

```ts
  const defs = procsFor(ref);
  const saved = st.procs || {};
  let done = 0, exc = 0;
  defs.forEach((_: any, i: any) => {
    const s = saved['p' + i] != null ? saved['p' + i] : defaultProcState(ref, status, i, defs.length);
    if (s === 'Selesai') done++; else if (s === 'Pengecualian') exc++;
  });
```

In `view_wp.tsx` the `metrics` useMemo uses the same non-exec block:

```ts
      const saved = (wpState[ref] && wpState[ref].procs) || {};
      let done = 0, exc = 0;
      defs.forEach((_: any, i: any) => {
        const s = saved['p' + i] != null ? saved['p' + i] : defaultProcState(ref, st, i, defs.length);
        if (s === 'Selesai') done++; if (s === 'Pengecualian') exc++;
      });
```

Note `metrics` calls `defaultProcState(ref, st, i, ...)` (passes `st`, the
WP-level status string) while `deriveWpStatus` calls
`defaultProcState(ref, status, i, ...)` — same value in practice.

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
- `migration/src/view_wp.tsx`
- `migration/src/wp_canon.test.ts`
- `migration/eslint-suppressions.json` (**regenerate only** via the two-step
  `npx eslint` interface in Step 5 — never hand-edit it)

**Out of scope** (do NOT touch):
- The sign-off chain (`chain`, `signedCount`, `fullySigned`, dates) inside
  `deriveWpStatus` — that is plan 003.
- `wpCompletenessFor`, `engagementGate`, `WP_MODULE_MAP` (still in `wp_signoff.tsx`).
- Any consumer file (SA pages, portal, cockpit) — their inputs change
  (correctly) through `deriveWpStatus`; no edits needed there.

## Git workflow

- Branch: `advisor/002-wp-derivation-unify`
- Commit style: `w16(wp): derivasi status WP satu jalur exec-aware (SSOT; seed identik)`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: add a shared aggregate helper in `src/wp_canon.ts`

Add (near `procStatusAt`), and export it:

```ts
/* Status per-prosedur (exec-aware) untuk satu WP + agregat done/exc.
   SUMBER TUNGGAL: dipakai deriveWpStatus, metrics indeks & WPDrill. */
function procStatesFor(ref: any, st: any, status: any): { statuses: string[]; done: number; exc: number } {
  const defs = procsFor(ref);
  const statuses = defs.map((_: any, i: number) => procStatusAt(ref, st || {}, status, defs, i));
  const done = statuses.filter((s: string) => s === 'Selesai').length;
  const exc = statuses.filter((s: string) => s === 'Pengecualian').length;
  return { statuses, done, exc };
}
```

Add `procStatesFor` to the module's export list.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: make `deriveWpStatus` use `procStatesFor`

In `src/wp_canon.ts`, replace the non-exec block inside `deriveWpStatus`
(see "Current state") with:

```ts
  const { statuses, done, exc } = procStatesFor(ref, st, status);
```

Keep everything around it identical — in particular `status` must still be the
effective WP-level status (`st.status || meta.statusDefault`), and the rest of
the function (openNotes, coverage, sign-off chain) must not change.

**Verify**:
- `npm run typecheck` → exit 0.
- `npm run test -- wp_canon` → the seed `deriveWpStatus` characterization tests
  (A/B/C/E/R/300/810 from plan 001) still pass **unchanged** — seed has no
  `st.exec`, so done/exc must be identical.

### Step 3: make the index `metrics` use `procStatesFor`

In `migration/src/view_wp.tsx`, the `metrics` useMemo currently imports
`defaultProcState`/`WP_SEED_NOTES` and computes done/exc inline. Add
`procStatesFor` to the existing `./wp_canon` import in this file, then replace
the inline loop body so done/exc come from the shared helper:

Before (inside `all.forEach`, `view_wp.tsx:126-133`):

```ts
      const ref = it[0], st = statusOf(it);
      const defs = procsFor(ref);
      const saved = (wpState[ref] && wpState[ref].procs) || {};
      let done = 0, exc = 0;
      defs.forEach((_: any, i: any) => {
        const s = saved['p' + i] != null ? saved['p' + i] : defaultProcState(ref, st, i, defs.length);
        if (s === 'Selesai') done++; if (s === 'Pengecualian') exc++;
      });
```

After:

```ts
      const ref = it[0], st = statusOf(it);
      const defs = procsFor(ref);
      const { done, exc } = procStatesFor(ref, (wpState[ref] || {}), st);
```

Keep the rest of the loop (openNotes, risk count) untouched. If `defaultProcState`
is now unused elsewhere in `view_wp.tsx`, you may drop it from the `./wp_canon`
import list — but only if the typecheck confirms it is unused.

**Verify**:
- `npm run typecheck` → exit 0.
- `npm run lint` → exit 0 (no unused import warnings).
- `npm run test -- wp_canon` → green.
- `npm run build` → exit 0.

### Step 4: pin the new exec-aware behavior with tests

Append to `src/wp_canon.test.ts` a describe block proving the unification:
`deriveWpStatus` done/exc now follow `st.exec`, matching `procStatusAt`.

```ts
describe('deriveWpStatus — exec-aware setelah unifikasi (plan 002)', () => {
  const audit = { wtb: (AMS as any).WTB, risks: (AMS as any).RISKS, wpState: {
    B: { exec: { p0: { items: [{ result: 'tie' }] }, p1: { items: [{ result: 'exc' }] } } },
  } };
  const firm = { activeEngagement: { materiality: 4260000000 }, activeClient: { listed: true } };
  it('done/exc dihitung dari st.exec, bukan heuristik', () => {
    const r = deriveWpStatus('B', audit, firm);
    // B punya 6 prosedur: p0 Selesai (exec tie), p1 Pengecualian (exec exc),
    // p2..p4 jatuh ke heuristic In Review (Selesai), p5 seed Pengecualian.
    expect(r.done).toBe(4); // p0 + p2 + p3 + p4
    expect(r.exc).toBe(2);  // p1 + p5
  });
});
```

**Recompute if uncertain**: for ref B (In Review, 6 procs), `p0` exec `tie` →
`Selesai`; `p1` exec `exc` → `Pengecualian`; `p2..p4` no exec → heuristic
`Selesai` (`defaultProcState('B','In Review',i,6)` → Selesai for i < 5); `p5`
no exec → seed `PROC_EXC_SEED.B=[5]` → `Pengecualian`. Hence done = 4, exc = 2.
If your run disagrees, recheck `execStatus` on the two fixtures and
`defaultProcState` for i=2..4 — do not weaken the test to pass.

**Verify**: `npm run test -- wp_canon` → all pass, including the new block.
Then `npm run test` → full suite green.

### Step 5: regenerate the ESLint `: any` baseline

`procStatesFor` adds new explicit `: any` params (its `(ref: any, st: any,
status: any)` and the `_: any` map callback). The repo ratchets
`@typescript-eslint/no-explicit-any` through `migration/eslint-suppressions.json`,
so `npm run lint` will fail until the baseline is refreshed. **The repo script
`npm run lint:any-baseline` is broken** (ESLint rejects `--suppress-rule` +
`--prune-suppressions` together — a pre-existing bug). Use the two-step
interface it maps to:

```powershell
npx eslint src --suppress-rule @typescript-eslint/no-explicit-any
npx eslint src --prune-suppressions
```

Each exits 0. This adds the new `wp_canon.ts` suppressions and prunes nothing
else (verify with `git diff -- migration/eslint-suppressions.json` — only the
`src/wp_canon.ts` count grows by the number of new `: any`).

**Verify**: `npm run lint` → exit 0.

### Step 6: smoke

Open the app (`http://localhost:5180`, Partner login), Working Papers → ref B
drill → Prosedur tab: add a test item with result "Pengecualian" on one
procedure. Confirm the drill shows Pengecualian **and** the module index row for
B now reflects the same done/exc after reopening (refresh if needed). 0 console
errors.

## Test plan

- Append the plan-002 block in Step 4 to `src/wp_canon.test.ts`.
- Seed tests from plan 001 must stay green **without edits** — they prove the
  unification is behavior-preserving for the seed.
- Verification: `npm run test -- wp_canon` → all pass; `npm run test` → suite green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `procStatesFor` exists in `src/wp_canon.ts` and is exported
- [ ] `deriveWpStatus` body uses `procStatesFor` (grep the function, no inline
      `saved['p' + i]` loop left)
- [ ] `view_wp.tsx` `metrics` useMemo calls `procStatesFor` (grep — no inline
      `saved['p' + i]` loop in `view_wp.tsx`)
- [ ] `git diff -- migration/eslint-suppressions.json` touches only `src/wp_canon.ts` count
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0 (seed tests unchanged + new exec-aware block)
- [ ] `npm run build` exits 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row for 002 set to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `src/wp_canon.ts` does not contain `deriveWpStatus`/`procStatusAt` (plan 001
  not merged yet).
- A plan-001 seed test fails after Step 2 — that means the unification changed
  seed behavior; STOP (it should be impossible).
- The Step 5 baseline regen touches suppressions outside `src/wp_canon.ts` —
  STOP and report; do not commit unrelated baseline churn.
- A step's verification fails twice after a reasonable fix attempt.
- The change requires touching an out-of-scope file beyond the sanctioned
  `eslint-suppressions.json` regeneration.

## Maintenance notes

- The **index**, the **drill**, and **`deriveWpStatus`** (hence SA pages, portal,
  cockpit) now share one derivation: `procStatesFor`. Future status-state
  changes must go through it, never add a third inline loop.
- `defaultProcState` remains the fallback inside `procStatusAt` — keep it, it is
  the "no data yet" heuristic that plan 003 does not affect.
