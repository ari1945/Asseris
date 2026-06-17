# W3 Phase 3 — canon.js / data.js engine split (DONE — `dc35a93`, `3c8c3b6`)

## Status: COMPLETE
Both monoliths split into <600-line ESM modules, oracle-verified zero regression.
- canon.js 2026L -> canon_base + canon_part1..4 + index (`dc35a93`). AMS_CANON 74/74 match.
- data.js  2002L -> data_base  + data_part1..4 + index (`3c8c3b6`). window.AMS 142/142 match.
Lint 0-error (207 warns unchanged), vite build green, app renders identically both times.

The first canon attempt (`538678d`, reverted) failed because parts didn't import each
other (6 orchestrators broke at call time). FIX that worked: generator computes EVERY
external symbol each part references (via @babel AST, comment/string-safe) and emits
grouped cross-module imports. See `.claude/w3-split-{canon,data}.mjs` + `w3-canon-dag.mjs`
(generalized: `node w3-canon-dag.mjs <file> <firstNonFoundationDecl>` reports the DAG +
forward refs). Live-oracle baselines: `w3-{canon,data}-live-{pre,post}.json`.

### Key learnings (reusable for W4 Vitest + any future IIFE->ESM split)
1. **Gate on the runtime oracle, never `vite build`.** Rollup stays green on missing
   in-function refs; only calling every engine (the fingerprint does this) catches it.
2. **ESM cycles are safe IFF no module has top-level (load-time) initializers that read
   across the cycle.** canon has a part3<->part4 cycle (reconcile->psak66 forward edge +
   psak22->GOODWILL back edge) — harmless because both are function-body refs; the only
   load-time computed consts (SRC, FIG) live self-contained in canon_base. Proven by oracle.
3. **Watch for BARE top-level statements** (not decls) in the IIFE. data.js had 3 trailing
   seed-normalization `.forEach` passes that mutate seeds at load time. They must go in the
   INDEX after all imports (where every symbol is imported for the assembly), NOT swept into
   a part's last decl block. The dag analyzer's AST walk flags them (`s.type` not Fn/VarDecl).
4. **Preview eval runs in an isolated world** — `window.AMS_CANON` reads undefined there
   though DOM is shared. Bridge: inject a `<script>` that computes + writes JSON into a DOM
   node, then read the node's textContent back via eval. (See the fingerprint snippets.)

## Original prep notes (kept for context)
Prep artifacts kept: `.claude/w3-canon-baseline.json` (old fingerprint format, superseded
by the live-pre/post pairs), `.claude/w3-split-canon.mjs` (generator).

## The numeric oracle (USE THIS — reusable for W4 Vitest too)
- Baseline = frozen **prod** build (`NeoSuite AMS (prod).html`, original canon).
  Serve root via `node .claude/preview-static.mjs` (:5188), then run the
  fingerprint eval (see git history of this session / w3-split notes) → per-key
  `length:djb2hash` for all `AMS_CANON` keys. Saved in `w3-canon-baseline.json`.
- After any canon edit, run the SAME fingerprint on Vite (:5180) and diff.
  A broken engine shows `11:bd778ef6` (= `FN:"[args]"`, i.e. it threw).

## What went wrong (the key learning)
The clean "engines are independent, only need foundation" assumption is **FALSE**
for orchestrator engines. The oracle flagged 6 broken: **reconcile, psak65,
psak66, psak22, psak48, psak58** (the later/bigger ones). They call OTHER engines
and/or use seeds that landed in a different part module, but the parts didn't
import each other. e.g. `reconcile` returns `{dt, inv, fa, intan, figures, p71}`
— it calls `deferredTax`, `inventory`, `fixedAssets`, `intangibles`,
`figuresFromWTB`, `psak71`. (My quick `interEngineDeps` analysis under-reported
these — don't trust it; grep each engine body directly.)

These broke at CALL time, not load/build time — `vite build` stayed green
(rollup doesn't fail on a missing in-function ref). **Only the runtime numeric
oracle catches this.** Always gate the canon split on the oracle, never on build.

## Correct approach for next attempt
1. Keep `canon_base.js` = foundation (self-contained): RATE, ASOF, jt, wtbRow,
   wtbVal, WTB_MAP, figuresFromWTB, FIG, FISCAL, LEASES, leaseCalc, leasePortfolio.
   (This part worked — part1 leaf engines deferredTax/inventory/fixedAssets/
   revenue/intangibles/psak25/psak71/psak68 all matched baseline.)
2. Build the REAL dependency DAG: for every engine, grep its body for all other
   AMS_CANON symbol names (engines + seeds). Orchestrators (reconcile, psak65,
   psak22, psak66, psak48, psak58) call leaf engines — these edges are acyclic
   (orchestrators → leaves), so put leaves in earlier parts, orchestrators later,
   and import across parts accordingly (part_orch imports {leaf engines} from
   part_leaf). Keep each seed in the SAME part as its consuming engine.
3. Re-run oracle until ALL 74 keys match byte-for-byte, AND app renders.
4. Then rebalance to <600 lines/file (4 parts ok). data.js split is similar
   (window.AMS built in one IIFE; mostly seed data + fmt/rp helpers + the
   assurance engines aupNarrate/pfiEngine/socEngine/ghgEngine that read state).

## Recommendation
Do this with fresh context — it's the SSOT, needs the DAG done carefully, and
the oracle makes it verifiable. Foundation-extraction (step 1) is low-risk;
the orchestrator wiring (step 2) is where the care goes.
