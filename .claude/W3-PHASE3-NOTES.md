# W3 Phase 3 — canon.js / data.js engine split (ATTEMPTED, reverted; notes for next run)

## Status
Attempted the canon.js split; **reverted** to committed-good (`d60199d`) because the
numeric oracle caught a regression. No code change landed. Prep artifacts kept:
`.claude/w3-canon-baseline.json` (oracle), `.claude/w3-split-canon.mjs` (generator).

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
