# Plan 001: Extract the pure WP derivation layer into `src/wp_canon.ts` + characterization tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 366eb37..HEAD -- src/view_wp.tsx src/wp_signoff.tsx src/wp_canon.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `366eb37`, 2026-08-06
- **Issue**: (none)

## Why this matters

The Working Papers module's pure logic — the WP status SSOT (`deriveWpStatus`,
`procStatusAt`, `execStatus`, `defaultProcState`) and evidence evaluation
(`wpEvidenceEval`) — is embedded inside `view_wp.tsx`, a 1,321-line React file.
Nothing tests it: there is no `view_wp`/`wp_signoff` test in `src/*.test.ts`,
yet `deriveWpStatus` is what SA 2xx/3xx/5xx reference pages, the client portal
and the cockpit trust for "how complete is this working paper". The test
harness runs in a `node` environment (no jsdom, see `vitest.config.mjs`), so
the functions cannot be tested while they live in a `.tsx` file that imports
React components (`ui.jsx`, `shell.jsx`, `icons.jsx`).

This plan moves that pure layer verbatim into a new dependency-free
`src/wp_canon.ts` module, makes `view_wp.tsx`/`wp_signoff.tsx` import it back
(so no consumer changes — the same window globals and exports remain), and
pins current behavior with characterization tests. The next plan (002) then
unifies the two divergent derivation paths on top of these tests.

## Current state

### The pure layer lives inside `migration/src/view_wp.tsx`

The functions to move (copy verbatim; line numbers refer to commit `366eb37`):

- `WP_INDEX` (lines 23–29) — the canonical file index registry.
- `WP_PROCS` (40–59) + `procsFor` (60) — per-WP audit procedures.
- `PROC_EXC_SEED` (61) + `defaultProcState` (62–68) — heuristic fallback status.
- `procStatusAt` (71–75) — exec-aware per-procedure status.
- `WP_SEED_NOTES` (89–97) — seeded review notes per WP.
- `execStatus` (493–501) — derive procedure status from exec test items.
- `wpEvidenceEval` (504–516) — evidence sufficiency/appropriateness verdict.
- `WP_TITLE`/`WP_REFS` (1229–1231), `WP_META` (1247–1248) — derived indices.
- `deriveWpStatus` (1250–1298) — the canonical per-WP status (SSOT).
- `wpProcedureInputs` (1302–1309) — procedure inputs for the assertion engine.

Example excerpt (what `deriveWpStatus` looks like today, `view_wp.tsx:1250-1251`):

```ts
function deriveWpStatus(ref: any, audit: any, firm: any) {
  const wpState = (audit && audit.wpState) || {};
  const wtb = (audit && audit.wtb) || [];
```

### `wpToday` lives in `migration/src/wp_signoff.tsx` (122–125)

```ts
function wpToday() {
  try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return ''; }
}
```

Move it to `wp_canon.ts` too — plan 003 needs both layers to share one date
source.

### Consumers that must keep working (do NOT change these)

- `view_wp.tsx:1321` re-exports `WPDrill, WP_META, WP_REFS, WorkingPapers,
  collectWpNotes, deriveWpStatus, openCanonicalWp, wpEvidenceEval,
  wpProcedureInputs, procsFor, WP_PROCS`; and `:1317` assigns them to `window`.
- `view_misc1.tsx` imports `{ deriveWpStatus, WP_META, openCanonicalWp }` from `./view_wp`.
- `view_assertions.tsx` imports `{ wpProcedureInputs, WP_META }` from `./view_wp`.
- `view_evidence.tsx` imports `{ wpEvidenceEval }` from `./view_wp`.
- `sa_canonical.tsx` calls `window.deriveWpStatus`.
- `view_workspace.tsx:83` reads `window.WP_REFS`.

Because `view_wp.tsx` will import these names back from `wp_canon` and
re-export them, every consumer above is untouched.

### Repo conventions to match

- ESM import specifiers are **extensionless** for `.ts`: `import { X } from './wp_canon'`
  (never `'./wp_canon.ts'` — Vite/Rollup does not resolve that; see BUILD.md W11).
- Test pattern: pure-function vitest files like `src/wtb_integrity.test.ts`
  (imports `describe/it/expect` from `vitest`, imports the module under test
  and `{ AMS } from './data'`). Test env is `node`; `globalThis.window = globalThis`
  is set by `src/__tests__/setup.ts`.
- Test files are excluded from the strict `tsconfig` (see vitest.config.mjs W15 note);
  they are typechecked loosely — keep them clean anyway.
- No comments unless they add value; the codebase uses Indonesian for domain prose.

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Typecheck | `npm run typecheck` (in `migration/`)        | exit 0, no errors   |
| Lint      | `npm run lint`                               | exit 0              |
| Baseline  | `npm run lint:any-baseline`                  | exit 0; rewrites `eslint-suppressions.json` |
| Tests     | `npm run test -- wp_canon`                   | all pass (new file) |
| Full suite| `npm run test`                               | all pass            |
| Build     | `npm run build`                              | no resolution failures |

## Scope

**In scope** (the only files you should modify/create):
- `migration/src/wp_canon.ts` (create)
- `migration/src/wp_canon.test.ts` (create)
- `migration/src/view_wp.tsx` (remove moved definitions; import/re-export from `./wp_canon`)
- `migration/src/wp_signoff.tsx` (remove `wpToday`; import it from `./wp_canon`)
- `migration/eslint-suppressions.json` (**regenerate only** via the repo tool
  `npm run lint:any-baseline` — never hand-edit it; see Step 5)

**Out of scope** (do NOT touch, even though they look related):
- `WP_MODULE_MAP`, `wpKeyFor`, `requiredEvidenceFor`, `wpCompletenessFor`,
  `engagementGate` (all still in `wp_signoff.tsx`) — kept out so `wp_canon.ts`
  stays dependency-free.
- `WP_ATTACH`/`attachFor`, `TICKMARKS`, `WP_ASR`, `EV_SOURCES`, `PROC_RESULTS`,
  `PROC_FLOW`, `PROC_STYLE` and all React components in `view_wp.tsx` — they stay.
- Any behavior change to the moved functions. This plan is a **verbatim move**
  plus tests. Behavior is pinned, not changed (that is plan 002).
- `collectWpNotes` stays in `view_wp.tsx` (it reads React-adjacent state), but
  it will import `WP_TITLE`/`WP_SEED_NOTES` from `./wp_canon`.

## Git workflow

- Branch: `advisor/001-wp-canon-extract` (repo feature branches use
  `feat/<slug>`; the advisor convention is `advisor/NNN-<slug>`).
- Commit message style matches the repo (`git log --oneline`):
  `w16(wp): ekstrak lapisan murni WP ke wp_canon.ts + tes karakterisasi (struktural; angka identik)`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: create `migration/src/wp_canon.ts`

Create the file. It must be pure TypeScript with **no React imports and no
`.tsx` imports**. The only allowed import is a **type-only** import:

```ts
import type { ProcedureInput } from './canon_selectors';
```

Then move these definitions **verbatim** from `view_wp.tsx` (copy the exact
code, including the `(X as any)` casts and the surrounding comments):

1. `WP_INDEX` (lines 23–29) and the derived `WP_TITLE`, `WP_REFS`, `WP_META`
   builders (lines 1229–1231 and 1247–1248). Keep them in the same order as
   today: `WP_INDEX`, then `WP_PROCS`, `procsFor`, `PROC_EXC_SEED`,
   `defaultProcState`, `procStatusAt`, `WP_SEED_NOTES`, `execStatus`,
   `wpEvidenceEval`, then the derived indices (`WP_TITLE`/`WP_REFS`/`WP_META`),
   then `deriveWpStatus`, then `wpProcedureInputs`.
2. `WP_PROCS` + `procsFor` (40–60), `PROC_EXC_SEED` + `defaultProcState` (61–68),
   `procStatusAt` (69–75).
3. `WP_SEED_NOTES` (89–97).
4. The type aliases `EvRec` (464), `TestItem` (465), `ExecP` (466) — **required**
   by `execStatus` (`ep: ExecP | undefined`) and `wpEvidenceEval`
   (`evidence: EvRec[]`, `exec: Record<string, ExecP>`); `TestItem` moves too
   because `ExecP.items: TestItem[]` references it. Type-only aliases (erased at
   runtime) — safe for the node-env vitest file. `FormEvW`, `IpeRec`,
   `SmpDefaults`, `ConfRec` stay in `view_wp.tsx` (component-only use).
5. `execStatus` (493–501), `wpEvidenceEval` (504–516).
6. `deriveWpStatus` (1250–1298), `wpProcedureInputs` (1300–1309).

End the file with the ESM exports:

```ts
export type { EvRec, TestItem, ExecP };
export {
  WP_INDEX, WP_TITLE, WP_REFS, WP_META,
  WP_PROCS, procsFor, PROC_EXC_SEED, defaultProcState, WP_SEED_NOTES,
  execStatus, procStatusAt, wpEvidenceEval, deriveWpStatus, wpProcedureInputs,
  wpToday,
};
```

`wpToday` is copied from `wp_signoff.tsx:122-125` (see "Current state"). Put it
after `defaultProcState`.

**Verify**:
- `npx tsc --noEmit` (or `npm run typecheck`) → exit 0. If `canon_selectors`
  does not export `ProcedureInput`, check the import (it does — `view_wp.tsx:10`
  imports it from there). If a moved symbol references something you did not
  move (e.g. `TICKMARKS`), STOP — report back.

### Step 2: rewire `migration/src/view_wp.tsx`

1. Add at the top, with the other imports:

```ts
import { WP_INDEX, WP_PROCS, procsFor, defaultProcState, procStatusAt, WP_SEED_NOTES, wpEvidenceEval, deriveWpStatus, wpProcedureInputs, WP_TITLE, WP_META, WP_REFS } from './wp_canon';
import type { EvRec, TestItem, ExecP } from './wp_canon';
```

`WP_PROCS`, `procsFor`, `wpEvidenceEval`, `procStatusAt`, `defaultProcState`,
`WP_SEED_NOTES`, and the types `EvRec`/`TestItem`/`ExecP` are all still
referenced by code that stays in `view_wp.tsx` (`metrics`, `WPDrill`,
`EvidenceRegister`, `ProcRow`/`ProcsTab`, the `Object.assign`/export lines).
Do **not** add `execStatus` to this import — after the move it is used only by
`procStatusAt` inside `wp_canon.ts`, and an unused import trips the lint gate.

2. **Delete** the moved definitions from `view_wp.tsx`:
   - `WP_INDEX` block (23–29), `WP_PROCS` (40–59), `procsFor` (60),
     `PROC_EXC_SEED` (61), `defaultProcState` (62–68), `procStatusAt` (69–75),
     `WP_SEED_NOTES` (89–97), the type aliases `EvRec`/`TestItem`/`ExecP`
     (464–466), `execStatus` (493–501), `wpEvidenceEval` (504–516),
     the `WP_TITLE`/`WP_REFS` builders (1229–1231), `WP_META` (1247–1248),
     `deriveWpStatus` (1250–1298), `wpProcedureInputs` (1300–1309).
3. `collectWpNotes` (1232–1241) **stays** here. It references `WP_SEED_NOTES`
   and `WP_TITLE` — both now come from the `./wp_canon` import above, so no
   body change is needed.
4. Leave the `Object.assign(window, { ... })` (1317) and the ESM export (1321)
   exactly as they are — the imported names satisfy them.

Do not alter any component (WorkingPapers, WPDrill, ProcsTab, SignoffTab, etc.).
The `metrics` memo and `WPDrill` still call `defaultProcState`/`procStatusAt`/
`wpEvidenceEval` by the same names.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: rewire `migration/src/wp_signoff.tsx`

1. Add to the imports:

```ts
import { wpToday } from './wp_canon';
```

2. **Delete** the local `wpToday` definition (lines 122–125).
3. Leave everything else (including `Object.assign(window, ...)` at 679 and the
   export at 685) untouched.

**Verify**: `npm run typecheck` → exit 0. (Lint is verified in Step 5 — the new
`wp_canon.ts` is not yet in the ESLint `: any` suppression baseline, so `npm
run lint` is expected to fail until Step 5 runs `lint:any-baseline`.)

### Step 4: create `migration/src/wp_canon.test.ts` (characterization)

Follow the structural pattern of `src/wtb_integrity.test.ts`: `import {
describe, it, expect } from 'vitest';` and import the module under test plus
`{ AMS } from './data';`.

Pin the **current** behavior. Expected values below were computed at commit
`366eb37` by running the exact moved code against the real seed.

```ts
import { describe, it, expect } from 'vitest';
import { defaultProcState, procStatusAt, execStatus, wpEvidenceEval, deriveWpStatus } from './wp_canon';
import { AMS } from './data';

describe('defaultProcState — heuristic per WP-level status (characterization)', () => {
  it('Reviewed → semua Selesai', () => {
    expect(defaultProcState('A', 'Reviewed', 0, 5)).toBe('Selesai');
    expect(defaultProcState('A', 'Reviewed', 4, 5)).toBe('Selesai');
  });
  it('In Review → Selesai kecuali prosedur terakhir', () => {
    expect(defaultProcState('A', 'In Review', 3, 5)).toBe('Selesai');
    expect(defaultProcState('A', 'In Review', 4, 5)).toBe('Belum');
  });
  it('In Progress → separuh atas Selesai', () => {
    expect(defaultProcState('R', 'In Progress', 2, 5)).toBe('Selesai');   // i < ceil(5/2)=3
    expect(defaultProcState('R', 'In Progress', 3, 5)).toBe('Belum');
  });
  it('Not Started → Belum; proc tanpa ref → fallback default', () => {
    expect(defaultProcState('X', 'Not Started', 0, 3)).toBe('Belum');
    expect(defaultProcState('900', 'Not Started', 0, 3)).toBe('Belum');
  });
  it('PROC_EXC_SEED memaksa Pengecualian (B[5], C[2])', () => {
    expect(defaultProcState('B', 'In Review', 5, 6)).toBe('Pengecualian');
    expect(defaultProcState('C', 'In Progress', 2, 5)).toBe('Pengecualian');
  });
});

describe('execStatus — derive dari item uji (characterization)', () => {
  it('kosong → null', () => expect(execStatus(undefined)).toBeNull());
  it('ada pengecualian → Pengecualian', () =>
    expect(execStatus({ items: [{ result: 'exc' }] })).toBe('Pengecualian'));
  it('belum semua diuji → Berjalan', () =>
    expect(execStatus({ items: [{ result: 'tie' }, { result: '' }] })).toBe('Berjalan'));
  it('semua N/A → N/A', () =>
    expect(execStatus({ items: [{ result: 'na' }, { result: 'na' }] })).toBe('N/A'));
  it('semua dinilai (non-exc, non-na) → Selesai', () =>
    expect(execStatus({ items: [{ result: 'tie' }, { result: 'tie' }] })).toBe('Selesai'));
});

describe('procStatusAt — prioritas exec → procs manual → heuristic (characterization)', () => {
  const defs = [['a', 'E/O'], ['b', 'E/O'], ['c', 'E/O'], ['d', 'E/O'], ['e', 'E/O'], ['f', 'E/O']];
  it('exec mengalahkan heuristic', () => {
    const st = { exec: { p0: { items: [{ result: 'exc' }] } } };
    expect(procStatusAt('B', st, 'In Review', defs, 0)).toBe('Pengecualian');
  });
  it('st.procs manual mengalahkan heuristic', () => {
    const st = { procs: { p1: 'Pengecualian' } };
    expect(procStatusAt('B', st, 'In Review', defs, 1)).toBe('Pengecualian');
  });
  it('tanpa keduanya → heuristic (seed B p5 = Pengecualian)', () => {
    expect(procStatusAt('B', {}, 'In Review', defs, 5)).toBe('Pengecualian');
  });
});

describe('wpEvidenceEval — kecukupan & ketepatan (characterization)', () => {
  it('tanpa bukti/item → Belum Memadai', () => {
    const r = wpEvidenceEval([], {});
    expect(r.verdict.l).toBe('Belum Memadai'); expect(r.suffPct).toBe(0);
  });
  it('bukti tier-5 + semua teruji → Cukup & Tepat', () => {
    const r = wpEvidenceEval([{ id: 'E1', tier: 5 }], { p0: { items: [{ result: 'tie' }, { result: 'tie' }] } });
    expect(r.appr).toBe(5); expect(r.suffPct).toBe(100); expect(r.verdict.l).toBe('Bukti Cukup & Tepat');
  });
  it('ada pengecualian → tidak pernah Cukup & Tepat', () => {
    const r = wpEvidenceEval([{ id: 'E1', tier: 5 }], { p0: { items: [{ result: 'exc' }, { result: 'tie' }] } });
    expect(r.exc).toBe(1); expect(r.verdict.l).not.toBe('Bukti Cukup & Tepat');
  });
});

describe('deriveWpStatus — SEED ENG-2025-014, wpState kosong (characterization)', () => {
  const audit = { wtb: (AMS as any).WTB, risks: (AMS as any).RISKS, wpState: {} };
  const firm = { activeEngagement: { materiality: 4260000000 }, activeClient: { listed: true } };
  const expectSeed = (ref: string, want: any) => {
    const r = deriveWpStatus(ref, audit, firm);
    expect(r.ref).toBe(ref);
    expect(r.status).toBe(want.status);
    expect(r.done).toBe(want.done);
    expect(r.total).toBe(want.total);
    expect(r.exc).toBe(want.exc);
    expect(r.openNotes).toBe(want.openNotes);
    if (want.coverage) expect(r.coverage).toEqual(want.coverage); else expect(r.coverage).toBeNull();
    expect(r.signedCount).toBe(want.signedCount);
    expect(r.fullySigned).toBe(want.fullySigned);
    expect(r.hasLead).toBe(want.hasLead);
  };
  it('A — Reviewed, 5/5, coverage full, reviewer default saja', () =>
    expectSeed('A', { status: 'Reviewed', done: 5, total: 5, exc: 0, openNotes: 0, coverage: { bal: 21905300000, level: 'full' }, signedCount: 2, fullySigned: false, hasLead: true }));
  it('B — In Review, 5/6, 1 exc seed, 2 catatan terbuka', () =>
    expectSeed('B', { status: 'In Review', done: 5, total: 6, exc: 1, openNotes: 2, coverage: { bal: 46872400000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('C — In Progress, 2/5, 1 exc seed, 1 catatan terbuka', () =>
    expectSeed('C', { status: 'In Progress', done: 2, total: 5, exc: 1, openNotes: 1, coverage: { bal: 76564100000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('E — In Review, 4/5, catatan seed resolved → 0 terbuka', () =>
    expectSeed('E', { status: 'In Review', done: 4, total: 5, exc: 0, openNotes: 0, coverage: { bal: 142039700000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('R — In Progress, 3/5, saldo negatif → abs full, 1 catatan terbuka', () =>
    expectSeed('R', { status: 'In Progress', done: 3, total: 5, exc: 0, openNotes: 1, coverage: { bal: -330050000000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('300 — Reviewed, 3/3, tanpa lead → coverage null', () =>
    expectSeed('300', { status: 'Reviewed', done: 3, total: 3, exc: 0, openNotes: 0, coverage: null, signedCount: 2, fullySigned: false, hasLead: false }));
  it('810 — Not Started, 0/3, signedCount 1 MESKI belum ada tanda tangan (bug yang akan diperbaiki plan 003)', () =>
    expectSeed('810', { status: 'Not Started', done: 0, total: 3, exc: 0, openNotes: 0, coverage: null, signedCount: 1, fullySigned: false, hasLead: false }));
});
```

If any expected value differs when you run the suite, first confirm the moved
code is a verbatim copy (diff it against `git show 366eb37:src/view_wp.tsx`).
Only if the code is genuinely identical but a number still differs, STOP and
report — do not silently "correct" expectations.

**Verify**: `npm run test -- wp_canon` → all tests in `wp_canon.test.ts` pass.
Then `npm run test` → the full suite is green (nothing else changed).

### Step 5: regenerate the ESLint `: any` baseline

The repo ratchets `@typescript-eslint/no-explicit-any` through the tracked
suppression file `migration/eslint-suppressions.json`. New files
(`wp_canon.ts`, `wp_canon.test.ts`) have no baseline entry, so `npm run lint`
errors on them — this is expected and is fixed with the repo's own tool:

```powershell
npm run lint:any-baseline
```

This rewrites `eslint-suppressions.json` (adding entries for the two new files
and pruning the now-empty `view_wp.tsx`/`wp_signoff.tsx` counts). Do NOT
hand-edit the JSON.

**Verify**:
- `npm run lint:any-baseline` → exit 0.
- `npm run lint` → exit 0 (no remaining `no-explicit-any` errors).
- `git diff -- migration/eslint-suppressions.json` → only the two new file keys
  added and existing counts pruned; nothing else.

### Step 6: build + smoke

**Verify**:
- `npm run build` → exit 0, no "Could not resolve" for `./wp_canon`.
- Open the app (the dev server is at `http://localhost:5180`; if not running,
  `npm run dev` in `migration/`). Log in as Partner
  (`hartono.w@whr-cpa.id` / `Partner#2025!`), open **Working Papers**, open a
  WP drill (e.g. ref B), and confirm the index, procedures, evidence register
  and sign-off tab render with 0 console errors.

## Test plan

- New file `src/wp_canon.test.ts` covering: `defaultProcState`, `execStatus`,
  `procStatusAt`, `wpEvidenceEval`, and `deriveWpStatus` on the real seed
  (7 refs). Listed in Step 4.
- Pattern: `src/wtb_integrity.test.ts` (pure-function vitest, `node` env).
- Verification: `npm run test -- wp_canon` → all pass; `npm run test` → suite green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `migration/src/wp_canon.ts` exists; contains the moved functions + type aliases and exports them
- [ ] `migration/src/wp_canon.test.ts` exists with the Step 4 tests
- [ ] `grep -rn "function deriveWpStatus" src/view_wp.tsx` returns no matches
- [ ] `grep -rn "function procStatusAt" src/view_wp.tsx` returns no matches
- [ ] `grep -rn "function wpToday" src/wp_signoff.tsx` returns no matches
- [ ] `grep -rn "function execStatus" src/view_wp.tsx` returns no matches
- [ ] `grep -rn "type ExecP" src/view_wp.tsx` returns no matches
- [ ] `grep -rn "from './wp_canon'" src/` matches `view_wp.tsx` and `wp_signoff.tsx`
- [ ] `grep -n "wp_canon" migration/eslint-suppressions.json` matches (baseline entries added)
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0 (includes the new `wp_canon` tests)
- [ ] `npm run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status` in `migration/`)
- [ ] `plans/README.md` status row for 001 set to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the "Current state" locations doesn't match the excerpts (drifted).
- A moved function references a symbol that wasn't moved (e.g. `TICKMARKS`,
  `WP_ATTACH`) — the move set is incomplete; report instead of importing more.
- A Step 4 expected value differs despite a verbatim move — do NOT edit the
  expectation to force green.
- `npm run lint:any-baseline` rewrites more of `eslint-suppressions.json` than
  the two new-file keys + pruning (i.e. it touches unrelated suppressions) —
  STOP and report; do not commit unrelated baseline churn.
- A step's verification fails twice after a reasonable fix attempt.
- The fix requires touching an out-of-scope file beyond the sanctioned
  `eslint-suppressions.json` regeneration.

## Maintenance notes

- `wp_canon.ts` is the **single home** for WP derivation. Future status changes
  (plan 002 unification, plan 003 chain semantics) edit it — never re-embed
  derivation into `view_wp.tsx`.
- The `deriveWpStatus` seed numbers (coverage balances) depend on `AMS.WTB` and
  `AMS.RISKS`; if a future seed edit changes those, `wp_canon.test.ts` breaks —
  that is the intended regression signal.
- `wpCompletenessFor`/`engagementGate` intentionally remain in `wp_signoff.tsx`;
  when they are next refactored, consider moving them here too (they would then
  need `WP_MODULE_MAP` + an injectable evidence-count function).
