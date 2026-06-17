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
