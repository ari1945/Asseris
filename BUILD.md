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
# 1) edit src/*.jsx | *.js
npm run lint     # error-gate (no-undef + no-dupe-keys = 0) — MUST stay green
npm run build    # vite build — 245 modules, no resolution failures
npm run dev      # http://localhost:5180 (HMR) — verify render + numbers
npm run test     # vitest (added in W4)
```

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
