/* W3 Phase 4 — rewrite dynamic-window JSX to imported refs (fixes jsx-no-undef). */
import { readFileSync, writeFileSync } from 'node:fs';
const S = 'migration/src/';
const NEED_I = ['related_modules.jsx','view_isqm_deep.jsx','view_legal.jsx','view_isqm_parts.jsx'];
const HAS_I  = ['view_facilities.jsx','view_isqm.jsx','view_firmops.jsx','view_procurement.jsx']; // already import I
let report = [];
function rw(file, fn){ const p=S+file; const before=readFileSync(p,'utf8'); const after=fn(before); writeFileSync(p,after); report.push([file, (before.match(/\bwindow\.(I|TrendBars)\b/g)||[]).length]); }

for (const f of [...NEED_I, ...HAS_I]) {
  rw(f, code => {
    // add I import after the React import (only NEED_I files)
    if (NEED_I.includes(f)) code = code.replace(`import React from 'react';\n`, `import React from 'react';\nimport { I } from './icons.jsx';\n`);
    return code.replace(/\bwindow\.I\b/g, 'I');
  });
}
// view_execution.jsx: TrendBars
rw('view_execution.jsx', code =>
  code.replace(`import { WtbAnalytical, WtbGrouping, WtbKpiBand } from './view_wtb_deep.jsx';`,
               `import { TrendBars, WtbAnalytical, WtbGrouping, WtbKpiBand } from './view_wtb_deep.jsx';`)
      .replace(/\bwindow\.TrendBars\b/g, 'TrendBars'));

for (const [f,n] of report) console.log(`${f}: ${n} window.{I,TrendBars} refs rewritten`);
// sanity: ensure no window.IMPORT/IRM got clobbered
