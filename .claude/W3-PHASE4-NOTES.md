# W3 Phase 4 — dissolve buildless guards + rewrite dynamic-window JSX, promote lint to error (DONE)

## Scope (user-approved: "lint-gate scope")
Phase 4 was re-scoped at the start of the session. The arc line "strip window
per-workspace" turned out to be FAR larger than implied: the codemod left **every
data/engine read on `window`** (~1,500+ reads across ~189 files — 592 `window.AMS`,
143 `window.I`, 113 `window.AMS_CANON`, + BO/LEGAL/FSGEN/FIRMOPS/…). The dual-publish
`Object.assign(window,…)` writes are still load-bearing; you cannot remove them until
every reader is converted to an ESM import. **None of that is required for the lint gate.**

So Phase 4 = the two mechanical rewrites that unblock the Phase 5 lint promotion,
+ the promotion itself (Phase 5 folded in). **Full window-namespace strip is DEFERRED**
to its own later arc item.

## What was done
1. **Dissolved 152 hook guards** (`.claude/w3-p4-guards.mjs`, AST-located string splice):
   `(typeof useNav === 'function') ? useNav() : <fallback>` → `useNav()`.
   Safe because the codemod already ESM-imports these hooks, so `typeof===function`
   is always true — the false-branch was DEAD code (buildless script-load-order
   insurance). Verified every guarded hook is imported first
   (`.claude/w3-p4-check-imports.mjs`). Context defaults match the old fallbacks
   (`NavContext` default `()=>{}`, the others `null`), and at runtime the hook always
   existed, so the collapse is behavior-identical.
2. **Rewrote 38 `<window.X/>` dynamic JSX → imported refs** (`.claude/w3-p4-jsx.mjs`):
   `window.I` → `I` (word-boundary regex `\bwindow\.I\b` so `window.IMPORT`/`window.IRM`
   are NOT clobbered) across 9 files, adding `import { I } from './icons.jsx'` where
   missing; `<window.TrendBars/>` → `<TrendBars/>` (import from view_wtb_deep.jsx).
   NOTE: dynamic *computed* access `window.I[key]` / `React.createElement(window.I[..])`
   in other files is NOT JSX, does NOT trip jsx-no-undef, and was left for the
   deferred window-strip.
3. **11 residual rules-of-hooks** (`.claude/w3-p4-residual.mjs`) — heterogeneous, not
   simple guards:
   - `useAmsPersist` indirection (copilot, view_final3, view_psak14_nrv):
     `const persist = (typeof window.useAmsPersist==='function')?window.useAmsPersist:(k,v)=>useStateX(v)`
     → `const persist = useAmsPersist;` + import. (the useState-in-callback fallback was dead)
   - contexts.jsx: anonymous `window.useAmsPersist = function(){…}` → named
     `function useAmsPersist(){…}; window.useAmsPersist = useAmsPersist;` + `export { useAmsPersist }`
     (the `use` prefix makes eslint accept React.useState/useEffect inside it).
   - view_dataflow: `(typeof useEvidence==='function')?useEvidence(null):[]` → `useEvidence(null)`
     (guards codemod skipped it — consequent had 1 arg; useEvidence always returns an array).
   - **GENUINE bugs the rule correctly caught** (fixed by hoisting hooks above the early return):
     `GAPackages` (view_groupaudit_parts.jsx) — 4 `useStateGAP` after `if(!p65) return …`;
     `UserMenu` (view_palette.jsx) — `useAuth()` after `if(!open) return null`.
4. **Promoted both rules to `error`** in `migration/eslint.config.js`:
   `react/jsx-no-undef` and `react-hooks/rules-of-hooks` (was `warn`). Comments updated.

## Result
Lint **207 warnings → 0 problems** (both rules now ERROR, error-gate still green).
`vite build` green. **Zero numeric regression — proven structurally**: no
canon_*/data_*/forensic_canon engine module is in the changeset (git diff), and the
live app computes materiality OM=Rp 4.260 / PM=3.195 (= W0 baseline), canon 74 / AMS 142.
Render verified on Vite dev (:5180): boots, 0 console errors across boot + copilot/SA/
minimap drawers + SOQM/governance/dataflow/EQR/group-audit views + user menu; no error boundary.

## Reusable learnings
- **`react/jsx-no-undef` fires on `<window.X/>`** — the rule treats `window` as the JSX
  root identifier and flags it "not defined" even though window is a browser global.
  Computed `window.I[key]` does NOT fire it. So the rule is a precise detector of
  *dynamic-window JSX elements* specifically.
- **Buildless `typeof useHook==='function'` guards are dead under ESM** — once the hook
  is a static import the false-branch never runs; collapse to a bare call is
  behavior-identical. But VERIFY the import exists first (a guard whose hook is NOT
  imported would actually take the false-branch → bare call throws).
- **Hooks-after-early-return** (`GAPackages`, `UserMenu`) were latent real bugs masked by
  `warn`. Promoting the rule to error surfaced + fixed them. Standard fix: hoist all
  hook calls above the conditional return (the guards don't depend on the return condition).

## Next: W3 Phase 5 is effectively COMPLETE (folded into Phase 4 — both rules are error & green).
Remaining W3 ambition = the deferred **full window-namespace strip** (convert ~1,500
`window.AMS/I/CANON/…` reads to ESM imports workspace-by-workspace, drop dual-publish
writes, keep the imperative bus `__amsOpen*`/`amsApplyPrefs`/`compliancePct`). Large,
multi-session, oracle-gated per workspace. Treat as its own arc item.
