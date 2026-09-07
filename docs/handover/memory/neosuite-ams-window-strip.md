---
name: neosuite-ams-window-strip
description: NeoSuite AMS legacy track — per-namespace window-namespace strip (recipe + slice progress)
metadata: 
  node_type: memory
  type: project
  originSessionId: df553f07-f14d-4afd-a8f0-88cf7a01374a
---

Legacy-track arc (post-W10.5): dissolve buildless-era `window.<NS>` coupling (~930 reads measured
2026-06-19: 632 AMS, 108 AMS_CANON, 41 I, 40 BO, 35 LEGAL, 26 FSGEN, 13 FAC, 12 IMPORT, 11 FIRMFIN,
10 AMS_FORENSIC, 6 PROC) **one data namespace at a time**, structural-only, all-gates-per-slice. Chosen
over TS-widen because sequencing is better (strip first → ESM imports carry types natively; TS-first
grows the `globals.d.ts` ambient contract the strip later dissolves). PRD at repo root
("PRD - Legacy Track Window-Namespace Strip (Slice 1 PROC).md"). **KEEP the imperative bus**
(`__amsOpen*`/`amsApplyPrefs`/`compliancePct`/`__amsNav`) — runtime plumbing, not a data namespace.
Full recipe + slice order in BUILD.md §"Legacy track — window-namespace strip".

**Recipe (proven):** owner `data_<ns>.js`: dual-publish (`window.NS={…}` + `export const NS=window.NS`)
→ pure `const NS=(IIFE); export { NS }` (drop window write; IIFE may still read OTHER namespaces via
window — out of scope, leave them; boot order already loads deps first, do NOT reorder main.jsx imports).
Consumers: `import { NS }` + rewrite `window.NS`→`NS` + fix header comments. Gates in order: lint 0 →
typecheck 0 → build → 59 vitest (canon fingerprint identical) → dev:all live render 0 console err →
grep nol-residu `window.NS`=0.

**Slice 1 = PROC — DONE (`2a212d4`).** Smallest blast radius (1 owner `data_procurement.js`, 2 views
view_procurement/view_procurement2, 6 reads, no cross-ns refs). Live-proven Partner login: Pengadaan
module renders (Belanja YTD Rp 5,3 M / 9 vendor / 7 PO), Vendor360 drawer via `PROC.vendor360()` full
record (V-018 Rp 642 jt, NPWP/rekening/SLA/Legal-SSOT contracts), 0 console err. PROC had no
globals.d.ts entry. All gates green.

**Slice 2 = FIRMFIN — DONE (`074dec0`).** Done OUT of order (chose it over IMPORT, which is next-by-list
but W9-wired/careful). 1 owner `data_firmfin.js` (firm-finance canonical layer, all figures derived from
window.AMS via `A()` at call-time — out of scope, left as window read), 4 consumers (view_firmfinance ×2,
view_wip_firm, view_dashboard2, view_firmgl), 5 reads. Live-proven Partner: Firm Finance cockpit renders
(Pendapatan KAP Rp 11,3 M / Laba Operasi Rp 2,80 M / Posisi Kas Rp 8,42 M + Sumber-Kebenaran recon tab),
WIP & Realisasi + FirmGL render, 0 console err. All gates green, canon fingerprint identical, 0 residu.
GOTCHA (nav): `localStorage['ams.route']` stores route RAW (not JSON) — `JSON.stringify` it and the id
gets quotes, missing the `viewFor` switch → StubView. Set raw string + reload. Preview: run server pinned
(`PORT=5181`) separately + preview-start Vite alone (dodges port-steal); launch.json left untracked.

**Slice 3 = IMPORT — DONE (`e627004`).** The "careful" W9-wired slice. 1 owner `data_import.js`
(data-import/integration canonical layer), 1 consumer `view_platform2.jsx`, 4 reads. W9 OVERLAY SAFE
(the risk): server read-model overlays real posted/consumed/tied via `IM.setServerData({recon})` — a
METHOD call mutating the module's internal `_serverRecon` closure, NOT a write to `window.IMPORT`. The
imported binding IS the same singleton → overlay path identical. Imperative bus
(`window.amsIntegrationStatus/Reconcile/Sync`) left untouched per recipe. Owner IIFE still reads
`window.AMS` via `A()` + early `if(!A) return` guard — safe because main.jsx loads data.js (line 8)
before data_import.js (line 17), so AMS exists at eval. Live-proven Partner: Integrasi renders, server
overlay intact — "BANK FEED: SERVER · TIE-OUT 0" (bank posted=5/consumed=5/tied from server reconcile),
0 console err. All gates green, fingerprint identical, 0 residu.

**Slice 4 = FAC — DONE (`ba77ff7`).** Aset & fasilitas canonical layer (PSAK 16 depreciation engine). 1
owner `data_facilities.js`, 3 consumers, 4 reads. FIRST slice where a consumer is another DATA module
(`data_risk.js`), not just views. Two eval-order facts handled: (1) owner IIFE keeps EVAL-TIME `const BO
= window.BO` — safe because main.jsx loads data_backoffice (line 11) before data_facilities (line 31);
(2) data_risk was reading window.FAC lazily at call-time, now `import { FAC }` — the new eval edge
data_risk→data_facilities adds no early-eval (data_risk side-effect-imported at main.jsx line 33, after
31) and no cycle (data_facilities reads BO/LEGAL/AMS/FIRMOPS via window, never risk). RECIPE NOTE: before
stripping, always check whether the owner has an EVAL-TIME `const X = window.X` (vs call-time reads) and
whether any consumer is another data module whose new import edge could re-order eval. view_facilities2
gets FAC via props (comment-only fix). Live-proven Partner: Facilities cockpit real figures (Perolehan
Rp 2,59 M / NBV-derived Rp 1,43 M / penyusutan Rp 403 jt / 84% okupansi), Asuransi cover ratio 43% no
NaN (data_risk edge OK), 0 console err. All gates green, fingerprint identical, 0 residu.

**Slice 5 = FSGEN — DONE (`bbefd1d`).** FS-generator view-model. 1 owner `fsgen_model.jsx` (pure), 11
consumers, 14 reads. NOT mechanical: `canon_part3.ts` (TS/SSOT/snapshot-tested) read window.FSGEN with
headless-null semantics the regression fingerprint depends on (psak58's FSGEN-derived netTotal/salesTot
= 0 in test because FSGEN absent). A static import would (a) flip those 0→real in tests → shift the
canon_regression snapshot (forbidden), (b) invert layering (canon .ts importing view-model .jsx). USER
CHOSE DI seam (Q asked). PATTERN (reusable for any canon↔view-model coupling): add holder +
`setFsgenBuilder()`/`fsgenModel()` to canon_base; the view-model self-registers `setFsgenBuilder(buildModel)`
at its module load; canon calls `fsgenModel(wtb)` (null when unregistered). App loads fsgen_model
(main.jsx) → registers; canon unit tests never import it → stays null → fingerprint IDENTICAL. No
canon→view import, no cycle (canon_base never imports fsgen). Also removed dead FsGen interface +
Window.FSGEN + FsModel import from globals.d.ts. Live-proven Partner: FS Generator real figures (Aset
Rp 316,6 M / seimbang / Laba Rp 14,7 M / tie-out 8/8 / CALK 62%), PSAK 58 renders, seam registered in
browser (psak58(wtb) netTotal=14660 non-zero vs null-in-test), 0 console err. NOTE: zero-arg psak58()
crashes buildModel(undefined) in browser — pre-existing (old code same via window.FSGEN), view always
passes live wtb; not a regression. All gates green, 0 code residu.

**Slice 6 = BO — DONE (`03a1753`).** Biggest yet (40 reads, 1 owner `data_backoffice.js` + 16 consumers).
Back-office sub-ledger (vendors/assets/policies/contracts/disputes/travel/licenses). THREE consumer idioms
handled distinctly: (a) object-style data (firmops/legal/facilities/risk/procurement) — `import { BO }`,
delete inner `const BO = window.BO` aliases (incl. eval-time ones in FAC/PROC/risk IIFE tops — ESM import
edge now guarantees the eval-order the buildless window-load order relied on, so the memory's "preserve
order" worry dissolves: import forces data_backoffice eval before importer body runs); (b) lazy data
(licensing/pph23/records/travel) use `const BO = () => window.BO || {}` (a FUNCTION named BO) — MUST alias
import `{ BO as BO_NS }` to avoid the local-const self-ref clash, then `() => BO_NS || {}`; (c) views
(bo1/2/3/firmops/facilities/legal2/procurement) — append `import { BO }`, `const B = window.BO` → `const B
= BO`. NO DI seam: `canon_part3.ts` had no real BO token (noisy `BO\b` substring matches in
tax23/related_modules were display-text only) so no canon coupling. data_backoffice reads NO other
namespace → no cycle; it's main.jsx line 11 (before all consumers) but import edge makes that moot. No
globals.d.ts BO entry existed. All gates green, canon fingerprint identical (59 vitest), 0 code residu
(window.BO only in 2 doc comments). Live-proven Partner: firmops cockpit (sewa Rp 2,28 M = V-024 ytd,
penyusutan Rp 403.125.000, spendReconciliation 9/9 ok=true), procurement/facilities/legal/travel render,
0 console err. RECIPE ADDENDUM (lazy-fn consumers): when consumer aliases the namespace as a local
`const NS = () => window.NS || {}`, import as `{ NS as NS_NS }` — a plain `import { NS }` collides with the
local const (TDZ self-ref). GOTCHA: PROC/FAC already window-stripped → `window.PROC`/`window.FAC` undefined
in eval; test their VIEWS via DOM, not window. App was already logged-in (session persisted) — no login needed.

**Slice 7 = LEGAL — DONE (`6216a7e`).** Contract & legal registry (buildRegister/reconcileLegacy/
SOURCE_META/CLAUSES/DISPUTE_LINKS/moneyJt/daysTo). 1 owner `data_legal.js` + 8 consumers, ~26 code reads.
EASIER than BO on every axis: ALL reads call-time (no eval-time `const LEGAL = window.LEGAL` at IIFE tops —
the buildless guard `(window.LEGAL && firm) ? window.LEGAL.buildRegister(firm) : []` was call-time-lazy),
so no order hazard; no canon coupling (no canon*.ts reads LEGAL → no DI seam); no globals.d.ts entry; no
lazy-fn alias needed (no consumer aliased LEGAL as a local const). Mechanical: owner pure-ESM conversion +
per-file `import { LEGAL } from './data_legal.js'` + `replace_all window.LEGAL → LEGAL` (covers guards,
JSX, comments alike) + 1 comment-wording fix in data_procurement (was "IIFE membaca window.LEGAL/FIRMOPS").
data consumers (facilities/firmops/procurement/risk), views (view_legal/legal2/firmops/procurement2).
CYCLE CHECK: data_legal imports ONLY BO (→data_backoffice, a sink); no consumer-of-LEGAL is imported by
data_legal → DAG clean. data_legal itself still reads window.AMS/FIRMOPS at call-time (other namespaces,
left). All gates green, fingerprint identical (59 vitest), 0 code residu (window.LEGAL in 1 doc comment).
Live-proven Partner: legal registry (lease Rp 2.280 jt from BO master via buildRegister, disputes + source
chips), firmops cockpit (operatingCosts Rp 6,92 M unchanged, unifiedObligations 32 incl 2 legal
contract-renewals), 0 console err.

**Slice 8 = I — DONE (`99bf896`).** Icon registry. DIFFERENT shape from data namespaces: `I` was ALREADY
ESM-exported from icons.jsx (codemod did `export { ...I... }` for ALL the icons.jsx names) — so this slice
only (a) removed the runtime `window.I` reads and (b) dropped `I` from the BULK `Object.assign(window,
{Icon,I,MODULES,MODULE_INDEX,WORKSPACES,GROUP_WS,wsForModule,HIDDEN_GROUPS,RELATED_SA})` publish (the other
8 names stay — separate namespaces, NOT in the measured strip list, left dual-published). 9 consumers
(minimap + view_facilities2/firmops2/insurance/kb/misc2/legal2/presentasi/procurement2); 8 already imported
`I`, only minimap needed the import line added; rest just `window.I[...]→I[...]`.
**⚠️ SUBSTRING-COLLISION GOTCHA (cost a debug cycle — CRITICAL for AMS slices):** `I` is a 1-letter
namespace. A literal `replace_all "window.I" → "I"` ALSO mangles `window.IRM` → `IRM` (IRM = insurance-risk
engine, a DIFFERENT un-stripped namespace) because `window.I` is a textual PREFIX of `window.IRM`. The
detection grep `window\.I\b` (word-boundary) correctly SKIPS window.IRM, but the Edit tool's literal
replace does NOT — so grep-clean ≠ edit-safe. Symptom: eslint `'IRM' is not defined` at the call sites that
used `window.IRM` directly (not the local `const IRM = window.IRM`). Fixed by reverting 3 window.IRM spots
in view_insurance to original. **RULE: never blind replace_all a namespace that is a prefix of another.
window.AMS prefixes window.AMS_CANON & window.AMS_FORENSIC** — for the AMS slice, either strip
AMS_CANON+AMS_FORENSIC FIRST, or anchor each replace on `window.AMS[` / `window.AMS.` / `window.AMS ` /
`window.AMS;` / `window.AMS,` / `window.AMS)` rather than bare `window.AMS`. Gates green, fingerprint
identical (59 vitest). Live-proven Partner: insurance (window.I stripped + window.IRM intact, PII/D&O/Cyber
polShort labels render, 150 svg icons), kb (247 icons), firmops/firmops2 lineage (167 icons), 0 console err.

**Slice 9 = AMS_FORENSIC — DONE (`657f996`).** Forensic & journal canonical (SSOT) — JET_CRITERIA/
JOURNAL_POP/score/dmod/buildCash. 1 owner `forensic_canon.ts` + 3 consumers (diagnostics.ts, view_jet,
view_forensic), 10 reads. SIMPLEST slice yet — NO DI seam despite being a canon-layer .ts that another
canon module reads: the lone canon reader `diagnostics.ts` ALREADY used `import { AMS_FORENSIC }` (not
window), and the owner IIFE has ZERO eval-time cross-ns reads (the `window.*` mentions in its header are
doc-only). So unlike FSGEN (slice 5), no headless-null fingerprint coupling → plain ESM. Owner recipe:
`(function(){…})()` statement → `const AMS_FORENSIC = (function(){…; return {…}})()` (replace
`window.AMS_FORENSIC = {…}` with `return {…}`) + `export { AMS_FORENSIC }`. Consumers: view_jet had
MODULE-LOAD-TIME reads (`const JET_CRITERIA = (window.AMS_FORENSIC && …)`) — import edge guarantees
forensic_canon evals first; view_forensic call-time `buildCash`. Removed dead `Window.AMS_FORENSIC` from
globals.d.ts + setup.js comment (forensic_canon import now a pure no-op — main.jsx line 22 side-effect
import left in place, harmless). All gates green, canon fingerprint identical (59 vitest, incl
forensic_canon 6 + diagnostics 10 against the new export), 0 residue. Live-proven Partner:
`window.AMS_FORENSIC` undefined, Forensic Cash Flow (Rp 3,98 M, buildCash via ESM, no NaN) + JET
(JET_CRITERIA + 13 JOURNAL_POP rows via module-load ESM read) render, 0 console err. VERIFY GOTCHA: the
running `prod` preview (:5188) serves the FROZEN LEGACY app (`/app/compiled/*`, still has window.AMS_FORENSIC)
— NOT migration; must verify against migration Vite. Proven flow: backend pinned `$env:PORT='5181'` in bg
+ preview_start "vite" (:5180, from root launch.json); app session persists via httpOnly cookie (no login
needed). Partner creds (BUILD.md): `hartono.w@whr-cpa.id` / `Partner#2025!`.

**Slice 10 = AMS_CANON — DONE (`37c2c4f`).** Calc SSOT engine (the big one before AMS). 81
`window.AMS_CANON` occurrences / 45 files at strip (BUILD.md "108" = older count). NOVEL SHAPE vs all
prior slices: AMS_CANON is not just owned-and-read, it is **AUGMENTED** by 6 data files
(data_isak35/ojk/legaldigital/psak117/sakroadmap/syariah) that each did `window.AMS_CANON ||= {}` +
`window.AMS_CANON.x = …`/`Object.assign(window.AMS_CANON, …)` to bolt domain methods onto the shared
object. SOLUTION (reusable for any augmented namespace): owner `canon.ts` `window.AMS_CANON = {…}` +
dual-publish footer → single `export const AMS_CANON = {…}`; each augmenter `import { AMS_CANON } from
'./canon'` then `Object.assign(AMS_CANON, …)` / `AMS_CANON.x = …` onto the **same imported singleton**
(ESM live binding — all importers share one object; mutating a `const` import's PROPERTIES is legal).
MUST **delete** the `window.AMS_CANON ||= {}` guards (blind-replacing them → `AMS_CANON = AMS_CANON ||
{}` = assign-to-const-import error) and **drop the re-export footers** (`export const AMS_CANON =
window.AMS_CANON`) — else duplicate-binding with the new import; safe because grep proved NO consumer
imported AMS_CANON from those augmenters (only `canon_regression.test` imports it, already from
'./canon'). NO DI seam despite canon-layer .ts: the owner IS the SSOT object, its sole canon reader
(the regression test) already used `import { AMS_CANON }`, and canon_base/canon_selectors only mentioned
it in DOC COMMENTS. SUBSTRING-SAFE: `window.AMS_CANON` is not a prefix of any other namespace → a global
`perl s/window\.AMS_CANON/AMS_CANON/g` over the 34 views was collision-free (contrast slice 8 `I`). Bulk
view transform = one perl loop (insert `import { AMS_CANON } from './canon'` after `import React`, then
strip) — 34 views, 0 residue, 1 import each. globals.d.ts: removed `Window.AMS_CANON: AmsCanon`, the now-
orphaned `AmsCanon` interface, and its unused type imports (Figures/Fig/MaterialityOpts/MaterialityResult;
kept WTB/AjeRow/Benchmark). Gates green (lint0/tsc0/build 753 mods/59 vitest, canon snapshot UNCHANGED).
Live-proven (migration Vite :5180, Partner via persisted cookie): `window.AMS_CANON` undefined,
`await import('/src/canon.ts')` export has **74 keys = base + all 6 augmenters' methods** (proves the
Object.assign-onto-imported-singleton runs at boot), syariah (augmented) + psak46 (base) render real
figures, 0 console err. 46 files committed (excluded unrelated settings.local.json). VERIFY GOTCHA
(unchanged): the running `prod` preview (:5188) serves FROZEN legacy — start `dev-all` launch config
(pins `$env:PORT='5181'`, Vite :5180) to test migration.

**Slice 11 = AMS (the boss, 632 reads / 156 files) — DONE (10a `092e066` + 10b `320ca9e` + 10c `2019d6f`
+ 10z `9d14ad8`). ⇒ WINDOW-STRIP ARC COMPLETE.** KEY STRUCTURAL
RULE discovered: AMS can't be done owner-first like slices 1-10. The moment `data.js` drops its
`window.AMS` write, ALL ~156 consumers still reading `window.AMS` get `undefined` → app dies. So AMS is
**consumer-first**: migrate consumers to `import { AMS } from './data.js'` in BATCHES while owner
`data.js` KEEPS dual-publishing (`window.AMS = {…}; export const AMS = window.AMS`) → app always works,
each batch independently shippable & gated. The owner window-write is dropped in the FINAL sub-slice once
grep `window.AMS\b` (active code) = 0. Planned batches: **10a data-layer ✅** → 10b…n view groups
(mechanical) → 10z drop owner write + Window.AMS from globals.d.ts.
  • **10a — data layer DONE (`092e066`).** 19 data_*.js (owner data.js UNTOUCHED). 5 augmenters
    (fpm/knowledge/proforma/reg_compliance/templates) Object.assign onto the imported singleton (= same
    obj as window.AMS during dual-publish); deleted `window.AMS ||= {}` guards + re-export footers (no
    importer). data_part2/3 left (already pure-ESM `export {…aupEngine…}`; their window.AMS = stale
    COMMENTS only). Bulk via anchored perl `s/window\.AMS([.\[;, )])/AMS$1/g` — SAFE now that
    AMS_CANON/AMS_FORENSIC are stripped (no longer prefix-collide). **GOTCHA (cost a fix cycle): the
    anchored perl corrupts LOCAL ALIASES** — `const AMS = window.AMS || {}` → `const AMS = AMS || {}`
    (TDZ self-ref + shadows import). Only 2 files aliased AMS locally: data_ojk (eager → delete the alias
    line, use import) + data_legaldigital (lazy `() => window.AMS||{}` → `import { AMS as AMS_NS }` +
    `() => AMS_NS||{}`, BO recipe). ALWAYS `grep "const AMS\b"` after the perl. Gates green, snapshot
    unchanged; live-proven all augmented fields present at boot + 2 fixed engines run clean, 0 console err.
  • **10b — view layer DONE (`320ca9e`).** 119 view_*.jsx (~480 reads). Anchored perl + import after
    `import React`. 2 special cases: view_firmops2 (NO React anchor → import added after first import
    `./icons.jsx`); view_presentasi (eager `const AMS = window.AMS||{}` → perl self-ref'd → dropped line,
    use import). Gates green, snapshot unchanged. Live (Partner login via direct tRPC POST — see GOTCHA):
    presentasi/psak71/kb render, kb reads 10a-augmented AMS.KB_* through a 10b view (end-to-end), 0 err.
    **LOGIN GOTCHA:** preview_fill + button-click does NOT log in (React controlled inputs / submit). Works:
    `fetch('/trpc/auth.login?batch=1',{method:'POST',body:JSON.stringify({0:{email,password}})})` — NOTE
    httpBatchLink, NO transformer, so input is bare `{0:{email,password}}` NOT `{0:{json:{…}}}` (the json
    wrapper returns 400). Sets httpOnly cookie → reload → authed. Creds: hartono.w@whr-cpa.id / Partner#2025!
  • **10c — canon + infra DONE (`2019d6f`).** Consumer finale. canon-layer .ts: canon_base.ts
    (figuresFromWTB WTB read) + canon_part1.ts (deferredTax AJE read) → `import { AMS } from './data.js'`;
    canon/canon_part3/canon_types comments. **TYPECHECK INSIGHT (proven): a .ts importing the .js owner is
    type-SAFE despite checkJs:false** — allowJs lets tsc infer `AMS: AmsData` from data.js's
    `export const AMS = window.AMS` (window.AMS ambiently typed in globals.d.ts), so NO type loss, no
    noImplicitAny, canon_regression snapshot UNCHANGED. No DI seam needed (unlike FSGEN slice 5): AMS is
    PRESENT in test setup (setup.js imports data.js), so AMS===window.AMS during dual-publish → headless
    figures identical; the FSGEN headless-null hazard doesn't apply. Edge canon→data.js DAG-clean (data.js
    imports nothing). infra: api.js (drop local `const AMS = window.AMS` in hydrateCoreFromApi; keep import),
    contexts.jsx (userScopeId/AppProviders), copilot (already imported AMS — just strip `window.`),
    ai_insights/ai_extract/diagnostics_panel USER reads, related_modules_data2 TEMPLATES IIFE. **10b-RESIDUE
    SWEPT (gotcha): the 10b anchored perl `s/window\.AMS([.\[;, )])/.../` SKIPPED optional-chaining —
    `window.AMS?.FIRM` (the `?` not in the anchor charclass) survived in view_presentasi (4 real reads, import
    already present from 10b) + view_isqm comment/display text. ALWAYS re-grep `window\.AMS($|[^_A-Za-z])`
    after an anchored-perl slice to catch `?.`/`<`/`:` non-anchored reads.** Gates green (lint0/tsc0/build/
    59 vitest snapshot identical). Live-proven Partner (migration Vite :5180, persisted cookie):
    `data.AMS===window.AMS`, canon figDbo=13080/figCkpn=1980 via imported AMS.WTB, deferredTax via imported
    AMS.AJE, presentasi(AMS?.FIRM footer)/diagnostic/psak46 render, 0 console err.
  • **10z — owner drop DONE (`9d14ad8`). ARC COMPLETE.** data.js `window.AMS = {…}; export const AMS =
    window.AMS` → `/** @type {import('./types/globals').AmsData} */ export const AMS = {…}` (nothing on
    window). **KEY TYPING TRICK (proven): JSDoc `@type {import('./types/globals').AmsData}` on the .js
    export IS honored by tsc despite checkJs:false** (allowJs provides the type to .ts importers regardless
    of error-reporting), so canon's imported AMS stays typed AmsData = byte-identical → canon_regression
    snapshot UNCHANGED. Without the annotation the literal would infer per-row types and `r[field]` (field:
    WtbAmountField union) would error on rows missing a key — so DON'T rely on inference, annotate.
    globals.d.ts: dropped `Window.AMS` (nothing reads it), KEPT `AmsData` (now the data.js JSDoc annotation
    target), Window trimmed to BENCHMARKS + amsResetFigures. setup.js: NO window assignment needed — canon
    reads AMS via its own `import { AMS }`, so headless tests work with zero window.AMS (confirmed: grep
    proved no test-path reader remains); only refreshed stale comments. Also fixed wtb.js + data_part2/3
    comments. **grep `window\.AMS($|[^_A-Za-z])` = 0 across migration/src.** Gates green (lint0/tsc0/build/
    59 vitest snapshot identical — headless canon now reads ESM AMS with NO window at all). Live-proven
    Partner (migration Vite :5180): `window.AMS===undefined`, app renders dashboard / kb (72 standar from
    10a-augmented KB_*) / psak46 (canon Rp 48.500 pbt / Rp 4.980 DTA via imported AMS), 0 console err/warn.
    GOTCHA (verify only, not a regression): an ad-hoc `await import('/src/data.js')` in preview_eval can
    return an HMR-DETACHED module instance lacking the augmenter Object.assigns (TEMPLATES/KB_* missing) —
    the app's real singleton is fine; verify via RENDERED DOM (kb shows "72 STANDAR"), not a fresh import.

**✅ WINDOW-STRIP ARC COMPLETE (all 11 namespaces stripped; `9d14ad8`).** Every measured data namespace
(PROC·FIRMFIN·IMPORT·FAC·FSGEN·BO·LEGAL·I·AMS_FORENSIC·AMS_CANON·AMS) is now ESM-only; `grep window.<NS>`
= 0 for all. The imperative bus (`__amsOpen*`/`amsApplyPrefs`/`compliancePct`/`__amsNav`) was deliberately
KEPT (runtime plumbing, not a data namespace) — plus a handful of non-measured `window.AMS_*` siblings
(AMS_API/AMS_LLM/AMS_DIAG/AMSOpinion) that were never in scope. Possible future cleanup, not part of this arc.
HISTORICAL substring rule (no longer live since all AMS_* readers stripped): `window.AMS` is a
prefix of `window.AMS_CANON` & `window.AMS_FORENSIC` (both now stripped, so no live collision remains,
but a blind `replace_all "window.AMS"` would still mangle any stray `window.AMS_*` — anchor on
`window.AMS.`/`window.AMS[`/`window.AMS `/`window.AMS;`/`window.AMS,`/`window.AMS)`). See
[[neosuite-ams-arc]] for wave history,
[[neosuite-ams-w0-w10-conventions]] for invariants.
RECIPE ADDENDUM: when a CANON (.ts, snapshot-tested) module reads the namespace being stripped, prefer
the DI-seam (canon_base holder + setter, view self-registers) over a static import — preserves the
headless-null fingerprint and avoids canon→view layering inversion.
