---
name: neosuite-ams-w12-typescript-view
description: W12 — widening TypeScript from data layer to the view layer (view_*.jsx → .tsx); foundation-shim infra + recipe + slice-list
metadata: 
  node_type: memory
  type: project
  originSessionId: c730a19a-b91a-47d8-8013-aeb02218756b
---

**W12 — Perluasan TypeScript: lapisan data → lapisan view (`view_*.jsx → .tsx`).** Lanjutan
W11 (data SELESAI, [[neosuite-ams-w11-typescript-data]]). PRD root `PRD - W12 Perluasan
TypeScript — Lapisan View (.tsx).md`. Keputusan terkunci **D1–D4** (semua = rekomendasi):
**D1** urut by #importer terkecil-dulu (pola W11) · **D2** `_parts` by importer-count
(erat-kopel boleh ride induk) · **D3** ratchet app-tier→strict = **sub-fase terminal W13+**
(BUKAN di tengah arc) · **D4** scope = **173 view saja**; 16 fondasi (`ui`/`shell`/`contexts`/
`app`/`icons`/…) = W13+. Lihat [[neosuite-ams-arc]].

**Struktur terukur:** 173 `view_*.jsx` (10 `_parts`) + 16 fondasi non-view. Importer-bernama
(excl. side-effect `main.jsx`): 2×0 · **154×1** (umumnya route `app.jsx`) · 9×2 · 2×3 · lalu
penyedia 7/9/12/22/29/**48**. Wiring: `main.jsx` side-effect import semua view + `app.jsx`
named-import utk `viewFor()` route. **View BUKAN canon-reachable** (terverifikasi: tak ada
`canon_*.ts` import view) ⇒ SEMUA slice **app-tier relaks**, tak ada 🔒 (beda dari data
`part1-4`/`base`). `jsx:"react-jsx"` sudah di kedua tsconfig.

**Progres commit:** `5f0f4fd` Fase 0 beachhead (pilot 3: view_subsequent/sad/timebudget +
infra). `e2d86b2` **Fase 1 batch 1 (18 view, lintas-WS pure-leaf)**: psak1/psak2/psak22/psak46 ·
sa200/sa230/sa580/sa701 · aje/jet/reconcile(via dataflow)/evidence · capacity/disclosure/
compmatrix/kb · payroll/hrops(leave+performance). 144→0 app-tier; 19 route live-proven Partner
0 err. `83f5fd8` **Fase 1 batch 2 (18+1)**: psak19/24/25/16/14/48/58 · sa705/710 · opinion/eqr/
framework · isqm_deep(route **soqm** bukan isqm—isqm=scaffold) · mytasks(route **tasks**) ·
scheduler/settings/forensic · diagnostics(route **diagnostic**) **+mytasks_parts** (rode induk,
D2). 149→0; 19 route live 0 err incl deep (isqm_deep tabs, settings Keamanan/AI&LLM/Peran).
`c1ba57f` **Fase 1 batch 3 (18)**: psak65/66/68/71/117 · isak35/syariah · sakroadmap/sectorck/
sustain/ojkfiling/auditcomm (OJK) · nonaudit/duediligence · audittimeline · pc_hcm(route **hcm**
Analitik) · pc_talent(route **recruitment**+**learning**) · wtb_deep(route **wtb** tabs). 169→0;
20 route live 0 err. Pola: **A:any sumber AMS** (cascade tunggal −puluhan err), **`(AMS_CANON as
any).X()`** augmentasi-runtime kanon (8 OJK/syariah — anchor `=> AMS_CANON.X()`/`=> canon.X()`,
JANGAN replace_all krn nama ada di prosa JSX), `(arr as any[]).reduce(...,0)` (string[] overload).
⇒ **58 .tsx view total**, ~97 leaf 1-imp tersisa.
`96cb8b2` **Fase 1 batch 4 (18, lintas-WS pure-leaf)**: risk · lease(route **psak73**) · goingconcern ·
icfr · governance · internalaudit · insurance · invprop · sa240/501/520/530/540/720/800/805/810 ·
serviceorg. 94→0; **76 .tsx view total**, ~79 leaf 1-imp tersisa; 18 route live-proven Partner 0 err.
**⭐ INFRA do-once batch 4: 5 shim PENYEDIA-BERSAMA** (pertama kali leaf konsumsi provider Fase 2 di
luar view_calc/analytical-yg-sdh-ada) — `view_analytical.d.ts` (KvBox 48-imp), `view_bo1.d.ts`
(BoStat/BoBadge/BoTabPanel + boJt/boM), `view_fpm_parts.d.ts` (KV/SectionTitle/MSub/Delta/FGauge/…
29-imp), `view_onboarding.d.ts` (OKv 9-imp + obStage/dst :any), `view_materiality.d.ts`
(SliderRow/Compare/MaterialityCalc 3-imp). Semua `AnyComp`+`:any`; **HAPUS tiap saat provider→.tsx
(Fase 2)**. Pola: `A:any` sumber AMS (governance −20 err 1 baris) · `(AMS_CANON as any).X` augment
(sa501 PROV_REGISTER/P57_TREAT) · `(AMS as any).socEngine` (serviceorg, not-callable) · `SO_ORGS:any[]`
(sel.sourceModule/sourceEng union) · `(+z)` numeric-string `>` (goingconcern toFixed→string) · callback
`([cat,items]:[string,any])` + `(i:any)` (tuple useState tak alir any) · local comp `:any`
(InsChip/NavRow800/805/810). GOTCHA: KvBox/BoStat/KV dll tampak "lokal" tapi di-IMPOR dari provider →
errornya tak bisa ditambal `:any` di call-site; shim `.d.ts` provider satu-satunya fix bersih.
`0b14825` **Fase 1 batch 5 (18 + 2 _parts, lintas-WS)**: assoc · confirm(+confirm_parts) · delivery ·
dms · newdisc · opening · pdp · pppk · profit(route **profitability**) · psak72(+psak72_parts) ·
records · sa2comm(route **sa250/260/265**) · segmen · specifics2(route **expert**) · tax23(route
**tax**) · sjah3000 · spr2400 · firmgl. 132→0; **96 .tsx view total**, ~61 leaf 1-imp tersisa; 18 route
live-proven Partner fresh-server 0 err. **⭐ INFRA do-once batch 5: 2 shim** — `view_docparts.d.ts`
(PDrawer/PField/PModal/PThread/PTimeline/PVerList 7-imp), **`evidence.d.ts`** (FileDropField/FileList/
SecurePipeline/EvidenceControl + ams* fns; modul bukti **lintas-sektor Fase 3**, BUKAN view → W13,
pola diagnostics_panel.d.ts; deklarasi SEMUA ekspor agar importer .tsx tak putus). Pola BARU batch 5:
(1) **destructure `const {X,Y} = AMS as any`** (delivery/profit — `:any` per-key tak bisa di destructure);
(2) **Date arith `+a - +b`** masif (delivery/dms/firmgl/pppk — `Date - Date` & `REF - new Date()` &
`new Date(a)-new Date(b)`; `+x` perilaku identik); (3) **helper 2-arg→opsional `(d:any, o?:any)`**
(dDate/rrDID — TS2554 "Expected 2 args got 1" = param trailing tanpa default ter-infer required); (4)
**`(window as any).X` bus** (dms classifyDoc/amsFakeHash/amsFileMeta/amsAttachEvidence — ad-hoc window
read, bukan curated bus → cast per-situs, JANGAN tambah ke globals.d.ts); (5) `(AMS as any).socEngine/
.ghgEngine` (sjah3000) + `(AMS_CANON as any).pdp()`; (6) **`Object.values({})`/`Object.entries(x)` balik
`unknown[]`** (BUKAN any[] walau sumber `:any` — overload `{}`→`unknown[]`) → cast `(Object.values(m) as
any[])` / callback `([k,v]:[string,any])` (firmgl/profit/dms); (7) local comp `:any` di _parts
(CfMeta/CfReconWorksheet di confirm_parts, RevCard/P72_SspTable/P72StepHead/P72CritRow di psak72/_parts —
komponen di-IMPOR dari _parts batch-mate, fix di def-nya); (8) `SEG_MAP.map(...)`→`const segs:any[]`
(segmen menulis `s.assets` dinamis ke objek hasil map → union tanpa field). **⚠ GOTCHA HMR-rename:**
rename .jsx→.tsx di bawah dev-server hidup ⇒ console banjir `[hmr] Failed to reload /src/view_X.jsx`
(path lama sudah hilang) — itu **churn transisi HMR, BUKAN runtime err**; bukti bersih = **preview_stop
+ preview_start (server fresh)** lalu full-reload 1 route → 0 err (sama spirit W8 HMR-detached).
`e7e2b5a` **Fase 1 batch 6 (22, firm-ops/BI/dashboard family)**: login · bi(+bi2) · bo2(0-imp,
**legacy-unused** FirmLegal_LEGACY_UNUSED — tak ada route, hanya side-effect main) · bo3(route
**licensing**/**travel**) · clientportal · cockpit2(route **cockpit**) · compliance(**ComplianceView**
fallback) · crypto · dashboard(+dashboard2) · dataflow(+dataflow2) · facilities(+facilities2) ·
firmfinance(route firmfinance/**wip**) · firmops(+firmops2) · firmrevenue(route **revenue**) · firmtax ·
firmtreasury(route **treasury**/**cashbank**/**fixedassets**) · opinion_parts(0-imp, render via **opinion**).
282→0; **118 .tsx total, ~38 leaf 1-imp left** (55 jsx tersisa: 38×1-imp, 9×2, 2×3, +penyedia
7/9/12/22/29/48). 16 route live-proven Partner fresh-server 0 err (anak 2-var ter-render via marker induk).
**⭐ INFRA do-once batch 6: 2 shim penyedia lintas-sektor Fase 3→W13** — `ai_insights.d.ts` (AiInsightPanel/
amsCrossChecks/useAiInsights; dipakai cockpit2 + jet-yg-sdh-.tsx; AiInsightPanel di-deprecate per P4 tapi
masih dirender) + **`wp_signoff.d.ts`** (P2/SA230 sign-off lintas-sektor; **WAJIB superset SEMUA ekspor** —
WpCompletenessRecap/usePhaseGate/PhaseGateDialog/wpCompletenessFor/WP_MODULE_MAP/useWpSignoff/wpSignersFor/
WpPanel/dst — krn .d.ts MENGGANTIKAN tipe modul; omit 1 ekspor yg diimpor .tsx = error). Pola dominan:
**(1) bulk `s/^(\s*const \w+) = (AMS\.\w+);$/$1: any = $2;/`** (cascade AMS-unknown, −106 err 1 perl — sumber
`useFirm()`/`AMS.X` ter-infer unknown via `[k]:unknown`); (2) **`Object.values(reduce(...,{}))`→`unknown[]`
walau seed `{} as any`** (overload `{}`→unknown[] tetap) ⇒ fix = **anotasi param callback** `.map((p:any)=>`/
`.sort((a:any,b:any)=>` (perl `s/\.(map|filter|find|some|every|forEach|flatMap)\((\w+) =>/.\1((\2: any) =>/g`
+ sort 2-arg), BUKAN seed; (3) **`(window as any).X` bus ad-hoc** (clientportal WP_META/amsEvidenceCount/
classifyDoc/amsAttachEvidence; crypto amsFakeHash/amsAuditList/amsAuditVerify/amsEvidenceAll/
amsExportVerifySeal; dataflow __amsOpenCopilot — perl batch identifier, per-situs JANGAN globals.d.ts);
(4) **Date arith `+a - +b`** (cockpit2 `dl-CKP_START`/firmrevenue/firmtax `new Date(o.due)-new Date(x)`/
firmtreasury); (5) `(AMS as any).PROP` inline tak-tertangkap-cascade (CPE_REQ/CAPACITY.grades/FIXED_ASSETS/
PLATFORM.buildAuditStream/RISKS/DMS_DOCS/INTEGRITY_RULES — bentuk `(AMS&&AMS.X)||[]` perlu `(AMS as any).X`
+ anotasi `const x: any[] =`); (6) `(AMS_CANON as any).legalSeal`; (7) `(api as any).auth.login.mutate`
(tRPC sub-router) + `(window as any).LoginScreen=`; (8) tuple destructure callback `([d,w]: [string,any])`
(firmtreasury drivers Object.entries) + `.map(([l,v,bold]: any[])=>` (firmtax JSX-literal rows union
string|number|boolean → `v<0`). **GOTCHA: anak 2-variant (bi2/dashboard2/dataflow2/facilities2/firmops2)
di-IMPOR sibling induk (bukan app.jsx route) → bundle cluster sekaligus + rewrite specifier induk; bo2
legacy-unused tetap dikonversi (build/typecheck) walau tak dirender.**
`0f3cead` **Fase 1 batch 7 (18, leaf 1-importer)**: misc1(route **strategy**) · misc2(route
**templates**) · pc_org(route **orgchart**) · pipeline · platform(route **approvals**) ·
platform2(route **integrations**) · platform3(route **audittrail**) · related · sjah3400/3402/
3410/3420 · wip_firm(route **wipreal**) · workspace(route **reviewnotes**) · evidence2(via
**evidence.tsx**) · psak14_nrv(via **psak14.tsx**) · psak16_register(via **psak16.tsx**) ·
risk2(via **risk.tsx**). 143→0; **136 .tsx total, ~20 leaf .jsx left**. 16 route live-proven
Partner fresh-server 0 err. **⭐ TANPA infra shim baru** — pertama kali sejak batch 3 batch
bersih tanpa shim: SEMUA sibling-import sudah ber-`.d.ts` (analytical/calc/fpm_parts batch 4)
atau parent sudah .tsx (evidence/psak14/psak16/risk → anak2-nya konversi + rewrite specifier
parent). Pola dominan (semua sudah dikenal): **A:any sumber AMS cascade** (pc_org `const A: any =
AMS` → staff/ORG/byId/FIRM/DEPT_HEAD semua any, 10 org-node render) · local comp `: any`
(Th/Num/Line/RN_Row/ApprovalDetail/ImSrc/ImportQueue/ImportRecon/IntegrationDetail/Node — JSX
`key=` bikin props `{key,...}` tak-assignable ke `{...}` infer dari destructure) · `(AMS as
any).PROP` inline (PLATFORM.buildApprovals/buildAuditStream/ROUTING_RULES · RISKS · ENGAGEMENTS ·
DMS_DOCS · REVIEW_NOTES · TEMPLATES · PROSPECTS · USER) · **`(window as any).X` bus** (pipeline
amsAddProspect; platform2 amsIntegrationStatus/Reconcile/Sync) · **Date arith `+a - +b`** (platform
slaInfo `+due - +PF_NOW`; workspace RN_days; platform2 `+new Date(it.expiry) - +new Date(...)`) ·
`Object.values(m).map((x:any)=>...)` + `...x` spread butuh x:any (wip_firm TS2698) · `Object.entries
(m:any).sort((a:any,b:any)=>b[1]-a[1])` (platform3, seed `const m:any={}`) · `[l,n,c]:any[]` tuple
JSX-literal rows (misc2) · engine `(AMS as any).pfiEngine/socEngine/ghgEngine/proformaEngine(exec)`
(4 sjah, nama engine ada di komentar prosa lines 19-22 tapi anchor `const E = AMS.` aman) ·
`sum.connectors.find(...) || {}` → `const c:any=` (platform2, found-type tanpa `posted` di branch
`{}`). GOTCHA dikonfirmasi-ulang: `const X: any[] = AMS.Y || []` TETAP error TS2740 (`{}` truthy-
branch unknown tak-assignable array) → wajib `(AMS as any).Y || []`. **Ditunda batch 8 (terakhir
Fase 1):** 4 leaf tarik sibling tak-ber-shim (pc_conduct→ethics_parts, presentasi→final3,
relatedsvc→nonaudit2, spr2410→fsgen_model) + cluster parent+anak (fsgen+panels/isqm+parts/legal2+
legal/people+independence_parts) + anak parent-Fase2 (analytical2/crm2/eng2/onboarding2-3/
procurement2/groupaudit_parts/materiality_parts) — butuh shim/konversi sibling sesuai kebutuhan.
Lalu Fase 2 (2-3 imp + penyedia bersama terakhir). Setiap slice: lint0/typecheck-2tier0/build/
59 vitest+fingerprint + live Partner.
`1571c00` **Fase 1 batch 8 (23, TERAKHIR Fase 1 — cluster+sibling) ⇒ FASE 1 SELESAI**: pc_conduct(route
**ethics**+**hrcases**)+ethics_parts · presentasi+final3(route **management**) · relatedsvc+nonaudit2 ·
spr2410 · fsgen+fsgen_panels · isqm(route **soqm**)+isqm_parts · legal2(route **firmlegal**)+legal ·
people(route **cpe**+**hcm**+**independence**)+independence_parts · analytical2 · crm2 · eng2(route
**engagements**) · onboarding2/3 · procurement2 · groupaudit_parts · materiality_parts. 326→0; **159 .tsx
view total, 14 .jsx sisa (semua Fase 2)**; 15 route live-proven Partner fresh-server 0 console err (anak
ter-render via parent route). **⭐ TANPA infra shim baru** (batch ke-2 beruntun nihil-shim): 4 sibling
**tak-ber-shim DIKONVERSI langsung** (ethics_parts/final3/nonaudit2 — final3 toh route sendiri; lebih
bersih drpd shim, nol utang). **KEPUTUSAN PENTING: non-view model `fsgen_model.jsx` + Fase-2 parent
`view_firm`/`view_procurement`/`view_groupaudit` TETAP `.jsx` & ter-infer BERSIH (0 err) → NOL shim.**
Bukti penentu pra-konversi: `fsgen_model` sudah diimpor 8 `.tsx` lain (forensic/isak35/psak14/16/19/2/72/
segmen) pada 0-err ⇒ **infer-dari-.jsx via `allowJs:true`+`checkJs:false` bekerja sempurna** (export
.jsx dapat tipe ter-infer, error DALAM .jsx tak dilaporkan); `view_firm` ternyata **0 importer .tsx lain**
(grep `view_firm` over-match `view_firmops`—firmops impor firmops2 bukan firm). eng2 impor EngagementDetail
dari view_firm.jsx → 0 err call-site tanpa shim (terkonfirmasi live). Pola dominan: **A:any sumber AMS
cascade** (`const A: any = AMS` satu anotasi −belasan err) + local comp `: any` (R/KpiTile/EquityStatement/
PRSlide/PRStat/MLFinding/AupDocRow/PullRow/Row/Line/SecTitle/ExpResult/NumDriver) + **`Object.values(...)
as any[]`** cast (crm2/eng2/onboarding3 — overload `unknown[]`, cast hasil bukan callback) + **Date arith
`+new Date(...) - +today`** (eng2) + **helper trailing param opsional** `(v, py?)`/`(no,title,body,psak?)`
(TS2554) + engine `(AMS as any).aupEngine/pfiEngine/socEngine/ghgEngine()` (nonaudit2/relatedsvc) +
`(window as any).soqmPull` (isqm) + `(AMS as any).QM_*` (isqm/isqm_parts). **Resep batch (efisien, ramah
paralel):** git mv 23 + **1 perl seragam** `s#\./view_(ALT)\.jsx#./view_$1#g` atas SEMUA .jsx/.tsx (rewrite
importer extensionless; alternasi exact-name + anchor `\.jsx` aman thd prefix-collision legal/legal2,
isqm/isqm_parts, onboarding/2/3 krn `\.jsx` memaksa full-match) + 23 entri tsconfig include, lalu **8 sub-agent
paralel per-cluster** (file disjoint → edit type-only aman; tiap agent verifikasi `tsc | grep file-nya`;
gate global + live + commit oleh induk). Provider Fase-2 ber-`.d.ts` (analytical/bo1/calc/docparts/fpm_parts/
materiality/onboarding) dipakai via specifier `.jsx` apa adanya (basename-match honor `.d.ts`).
**⇒ FASE 1 W12 SELESAI. Sisa = Fase 2 (14 view):** 2-imp execution/firm/groupaudit/palette/procurement/wp ·
3-imp cockpit/materiality · penyedia docparts(7)/onboarding(9)/bo1(12)/calc(22)/fpm_parts(29)/analytical(48)
— **HAPUS shim `.d.ts` saat tiap provider→.tsx** (firm/procurement/groupaudit/materiality juga sudah ber-shim).

`af75d00` **Fase 2 Slice A (8, 2–3 imp, non-mega-provider)**: execution(route **wtb**/AJEForm via aje) ·
wp(route **workpapers**) · palette(⌘K, render via shell) · cockpit(AuditProgramme route **programme**,
EngagementCockpit override di cockpit2 route **cockpit**) · firm(ClientCRM route **crm**/EngagementMgmt route
**engagement**/EngagementDetail via eng2) · procurement · groupaudit · materiality(**penyedia, shim DIHAPUS**).
34→0. **HAPUS `view_materiality.d.ts`** → SliderRow/RailChip/MaterialityCalc tipe asli .tsx; konsumen
lease(psak73)/firmfinance(wip) tarik strict → tambal **SliderRow def `:any`** (kunci: fix di DEF penyedia
meng-cascade ke call-site). **⭐ INFRA do-once batch Slice A** (`types/globals.d.ts`): (1) `AmsData.rp` →
`(n, decimals?: number)=>string` (rp NYATA 2-arg `(n,d=0)` di data_base.ts; view_firm `rp(c.fee/1e6,0)`
TS2554) — selaras fmt; (2) `Window.clearPersisted?:()=>void` (bus dual-publish `window.clearPersisted=` di
contexts.jsx:410, keluarga persist loadLS/useAmsPersist — jujur, BUKAN `(window as any)`). Pola: local comp
`:any` (RailChip/SliderRow/ScoreBar) · **`(AMS as any).STAFF/INVOICES/FIRM_AP || []`** (palette forEach;
WTB ter-ketik tak kena, sibling tidak) · **`Object.entries(reduce(...,{})) as [string,any][]`** (cockpit
effort-tab — cast hasil fix sort+map sekaligus) · `(a, x:any)` reduce + `([ref,s]:[string,any])` +
`const patch:any` (wp metrik/sign-chain). 167 .tsx; 6 .jsx provider sisa.
`a26edf5` **Fase 2 Slice B (6 mega-provider) ⇒ FASE 2 & ARC W12 SELESAI**: docparts(7) · onboarding(9) ·
bo1(12) · calc(22) · fpm_parts(29) · analytical(48). **HAPUS 6 shim `.d.ts`** (analytical/bo1/calc/docparts/
fpm_parts/onboarding) → tipe asli .tsx ambil alih; ~80 konsumen (mayoritas SUDAH .tsx dari Fase 1) tarik
infer ketat. **⭐ SHOCKWAVE TERUKUR: 518 err awal**, 446 = **TS2741/2739 "prop X hilang"** pd komponen
penyedia TER-EKSPOR yg kini infer prop **WAJIB** (KvBox `{label,v,accent}`-48imp · KV `{label,v,strong}`-29 ·
Kv/RowKv-22 · BoStat-12 · OKv-9 · PDrawer/PField-7 · chart `{series,labels,yMax,yFmt}` fpm_parts). **LEVER
TUNGGAL = anotasi `:any` param destructure komponen ter-ekspor DI 6 PENYEDIA** (perl batch-1
`s/(function [A-Z]\w*\s*\(\{[^}]*\})\)/$1: any)/g` + varian `const [A-Z]\w* = (\{…\})`) → **518→69 cascade**
(semua err konsumen lenyap; fix di def penyedia, BUKAN tiap call-site). Sisa 69 = penyedia-internal:
**analytical `const A = {}`→`const A: any = {}`** (−65: bangun objek LK dinamis `A.sales=…` pd `{}` →
TS2339 sales/cogs/grossProfit/…); calc `Array.from(hits:Set).sort((a,b)=>a-b)` → `(a:any,b:any)`
(Set→`unknown[]`, arith non-number TS2362/2363); onboarding `(window as any).amsAddProspect` (×2 bus).
0 err. **Resep efisien Slice B: 1 perl anotasi-penyedia + ~4 fix internal = seluruh shockwave** (TAK perlu
sentuh konsumen sama sekali; specifier-rewrite saja). 14 route live-proven Partner fresh-server 0 console err
lintas-6-penyedia: internalaudit/legal/treasury(analytical KvBox) · bi 132-SVG(fpm_parts chart yFmt/series) ·
sad/treasury(calc Kv) · facilities/records(bo1 BoStat) · governance/dms/clientportal(onboarding OKv) ·
dms/facilities/legal(docparts PDrawer/PField).
**⇒ W12 SELESAI: 173/173 view `.tsx`, 0 `.jsx` view tersisa.** Fondasi (`ui`/`shell`/`contexts`/`app`/`icons` +
non-view model `fsgen_model.jsx` + **12 shim `.d.ts` non-view yg TETAP**: evidence/wp_signoff/ai_insights/
diagnostics_panel/shell/ui/… — modul lintas-sektor Fase 3/fondasi) = **W13+**. Ratchet app-tier→strict (D3,
`strictNullChecks` penuh) = **sub-fase terminal W13+** setelah fondasi `.jsx`→`.tsx`. **GOTCHA verifikasi:
server "prod" (`.claude/preview-static.mjs` :5188) menyajikan APP BEKU `app/compiled/app.js` (buildless,
`EngagementCockpit is not defined` = pre-existing, BUKAN migration) — SALAH target; app migration diverifikasi
via launch "vite" :5180 (+ backend :5181 standalone via Bash, `PORT=5181 npm --prefix ../server run dev`).
Login seed Partner `hartono.w@whr-cpa.id`/`Partner#2025!` (BUILD.md), sesi persist httpOnly cookie lintas
restart vite. Route≠id banyak (firm→crm/engagement, cockpit→programme(AuditProgramme), wp→workpapers,
execution→wtb, materiality-consumers lease→psak73/firmfinance→wip, firmtreasury→treasury).**

**⭐ INFRA do-once batch 2:** `diagnostics_panel.d.ts` shim (modul fitur P4 lintas-sektor, di luar
scope view → W13; pola ui.d.ts). `globals.d.ts` +bus (semua dual-publish nyata): `Spark`(ui.jsx
Object.assign)/`RP_TXN`/`RP_PARTIES`(view_related)/`LINEAGE`(related_modules_data)/`AMSOpinion`
(view_opinion_parts)/`__amsSetSidebar`(app.jsx)/`amsApplyPrefs`(view_settings)/`AMS_LLM`(llm_providers)/
`amsLlmStatus`(api.js). **`canon_types.AjeRow` +`desc?:string`** (field narasi NYATA psak14/16/58;
canon-tier additif-opsional → fingerprint identik). **tRPC `(api as any).auth.*`** cast (sub-router
type union tak ekspos endpoint sessions/events/enrollTotp/dst — per-situs, importer lain api.js
masih .jsx). GOTCHA route≠id: byk view render via SubBar `moduleId` beda (isqm→soqm scaffold,
mytasks→tasks, diagnostics→diagnostic) — verifikasi live pakai id `viewFor()`/SubBar, bukan nama file.

**⭐ INFRA do-once BARU di batch 1 (pilot 3 tak kena; benih utk 173 view):**
1. **`src/shell.d.ts`** — shim AnyComp `SubBar`/`TopBar`/`Sidebar`/`SettingsMenu`. `SubBar` infer
   prop **required** saat dipanggil parsial (`<SubBar moduleId="x"/>` tanpa `right`); pilot selalu
   kirim semua prop → tak kena. Pola ui.d.ts; **HAPUS saat shell.jsx→.tsx (W13)**.
2. **`types/globals.d.ts` `interface Window`** — ketik runtime-bus yg **sengaja dipertahankan**
   (CLAUDE §4 + [[neosuite-ams-window-strip]]): `compliancePct`/`__amsOpenSA`/`loadLS`/
   `useAmsPersist`/`STD_IFRS_ALIAS` + WP-helper `WP_REFS`/`deriveWpStatus`/`collectWpNotes`/
   `openCanonicalWp`/`SignoffDots`/`amsPrintDoc`. Semua dual-publish NYATA (view_wp/sa_canonical/
   ui) → jujur, bukan `(window as any)` sebar. **⚠ `compliancePct` return objek ber-`.pct`, BUKAN
   number → `=> any`.** Canon-tier tetap 0 (additif opsional).

**⭐ TEMUAN PENENTU Fase 0 — konversi naif tak viable; infra do-once wajib.** Konversi
1 view menyembur **~64 error, ~85% dari komponen FONDASI tak-berketik** (`Panel`/`Btn`/
`Badge`/`Stat`/`Avatar` di `ui.jsx`): TS infer prop sebagai **required** krn destructuring
tanpa default → tiap `<Panel noBody>` error "missing sub/actions/noBody". Fix infra (sekali,
untungkan 173 view):
1. **`src/ui.d.ts`** — shim longgar (`type AnyComp=(props:any)=>any;` tiap ekspor ui).
   **SPIKE MEMBUKTIKAN: sibling `.d.ts` dihormati walau importer pakai `./ui.jsx` EKSPLISIT**
   (basename match ui.d.ts↔ui.jsx) ⇒ **TAK perlu** rewrite specifier fondasi. 192→60 err.
   Bridge SEMENTARA: **HAPUS saat `ui.jsx → ui.tsx` (W13)**, tipe asli ambil alih.
2. **`AmsData.fmt`/`rp`** (`types/globals.d.ts`) — sblm `[k]:unknown` ⇒ `AMS.fmt(...)` "not
   callable {}". Tambah `fmt:(n,decimals?)=>string`/`rp:(n)=>string`. 60→19. Canon-tier tetap
   0 (fmt/rp memang di literal AMS). `I`(icons)+`SubBar`(shell) infer BAIK → tak perlu shim.
3. **Shim penyedia-bersama** (`view_calc.d.ts` dst.) — view penyedia (`view_calc` Kv/RowKv
   22-imp · `view_analytical` KvBox 48 · `docparts`/`bo1`/`onboarding`/`fpm_parts`) dikonversi
   **terakhir** (Fase 2). Sampai itu konsumen `.tsx` tarik tipe longgar dari `<provider>.d.ts`
   sibling. **HAPUS tiap shim saat provider→.tsx.** Dibuat **on-demand** saat leaf pertama pakai.

**Sisa error per-view (minoritas, type-only nol-runtime):** (a) **komponen lokal** (sub-komp
di file, mis. KpiCard/TBBar/EacRow/AjeKv/D2*) prop required → `function K({a,b}: any)` —
batch 1: bulk perl `s/(function [A-Z]\w*\s*\(\{[^}]*\})\)/$1: any)/g` + varian `const Name = ({…})`
juga sapu prop `key=` di JSX map; (b) **`Object.entries`/`Object.values(x:any)` sering balik
`[string,unknown][]`/`unknown[]`** di tier ini → anotasi **param callback** (`(a:any,b:any)`/
`([k,v]:[string,any])`) atau **cast hasil** (`as number[]`), bukan cuma sumbernya; (c) **JSDoc
`@type {import(...)}` BERHENTI dihormati di `.tsx`** (= GOTCHA 3 boss W11) → hapus; (d) **metode
AMS ad-hoc** (`AMS.kbArticles()`/`kbResolve`/dst tak di `AmsData`) → `(AMS as any).m()` per-situs;
(e) **Date aritmetika** (`reportDate - ref`) → `+reportDate - +ref`; (f) **destruktur data AMS
`unknown`** (`const staff = AMS.STAFF`) → `: any` di sumber; hook tuple (`const [r,set] =
useAmsPersist(...)`) → `... as any`.

**⚠ GOTCHA importer-count (batch 1):** regex hitung naif `from './base('|\.jsx')` **over-match**
(alternasi tak ter-group → `\.jsx'` cocok SEMUA baris). `view_reconcile` tampak 1-imp padahal
di-impor `view_dataflow` juga. **Selalu `grep -rnE "\./view_<v>\.jsx"` SELURUH src sesudah rename**
utk tangkap sibling-view importer (rewrite specifier-nya juga). reconcile dirute via `dataflow`,
bukan case `app.jsx` langsung.

**Resep per slice (identik W11, ekstensi `.tsx`):** `git mv .jsx→.tsx` → rewrite importer
specifier `./view_x.jsx`→`./view_x` extensionless (main.jsx side-effect + app.jsx named-import +
sibling view; **hanya yg menunjuk file dikonversi** — import fondasi `./ui.jsx` dst TETAP) →
tambah `include` tsconfig.app.json → typecheck fix type-only → gate → commit. Resolver-gotcha
sama W11 (`.jsx`→`.tsx` tak resolve; extensionless resolve). Resep+slice-list: **BUILD.md §W12**.

**Live-proven Fase 0 (Partner Hartono W.):** subsequent (SA560 timeline/PKPU), sad (canon
materiality CTT **Rp 213 jt** = W0 baseline SSOT, RowKv shim render), timebudget (TBRoleMix
donut 1.840 jam, EAC 1.848). 0 console err tiap route. Nav: `localStorage['ams.route']`+reload
(W8 gotcha); login persist via httpOnly cookie (W10, bukan localStorage token). Server :5181
standalone (preview PORT-inject curi port Vite — W7 gotcha; jalankan server terpisah, preview
hanya vite :5180).
