import { readFileSync, writeFileSync } from 'node:fs';
const S = 'migration/src/';
const edits = [
  ['copilot.jsx',
    [`import { useFirm, useNav } from './contexts.jsx';`,
     `import { useAmsPersist, useFirm, useNav } from './contexts.jsx';`],
    [`  const persist = (typeof window.useAmsPersist === 'function') ? window.useAmsPersist : ((k, init) => useStateCP(init));`,
     `  const persist = useAmsPersist;`]],
  ['view_final3.jsx',
    [`import { useFirm } from './contexts.jsx';`,
     `import { useAmsPersist, useFirm } from './contexts.jsx';`],
    [`  const persist = (typeof window.useAmsPersist === 'function') ? window.useAmsPersist : ((k, v) => useStateF3(v));`,
     `  const persist = useAmsPersist;`]],
  ['view_psak14_nrv.jsx',
    [`import React from 'react';\nimport { I } from './icons.jsx';`,
     `import React from 'react';\nimport { useAmsPersist } from './contexts.jsx';\nimport { I } from './icons.jsx';`],
    [`  const persist = window.useAmsPersist || ((k, d) => useStateNRV(typeof d === 'function' ? d() : d));`,
     `  const persist = useAmsPersist;`]],
  ['view_dataflow.jsx',
    [`  const log = (typeof useEvidence === 'function') ? useEvidence(null) : [];`,
     `  const log = useEvidence(null);`]],
  ['view_groupaudit_parts.jsx',
    [`function GAPackages({ p65, packages, setPackages, seedSubs, fmt, nav, gotoTab }) {\n  if (!p65) return <div style={{ padding: 24 }} className="muted">Memuat paket pelaporan (AMS_CANON.psak65)…</div>;\n  const [editId, setEditId] = useStateGAP(null);\n  const [impId, setImpId] = useStateGAP(null);\n  const [impText, setImpText] = useStateGAP('');\n  const [impErr, setImpErr] = useStateGAP('');`,
     `function GAPackages({ p65, packages, setPackages, seedSubs, fmt, nav, gotoTab }) {\n  const [editId, setEditId] = useStateGAP(null);\n  const [impId, setImpId] = useStateGAP(null);\n  const [impText, setImpText] = useStateGAP('');\n  const [impErr, setImpErr] = useStateGAP('');\n  if (!p65) return <div style={{ padding: 24 }} className="muted">Memuat paket pelaporan (AMS_CANON.psak65)…</div>;`]],
  ['view_palette.jsx',
    [`function UserMenu({ open, onClose, user, onNavigate }) {\n  if (!open) return null;\n  const auth = useAuth();`,
     `function UserMenu({ open, onClose, user, onNavigate }) {\n  const auth = useAuth();\n  if (!open) return null;`]],
];
let ok = 0, fail = 0;
for (const [file, ...pairs] of edits) {
  const p = S + file; let code = readFileSync(p, 'utf8');
  for (const [from, to] of pairs) {
    const n = code.split(from).length - 1;
    if (n !== 1) { console.log(`FAIL ${file}: pattern occurs ${n}x:\n   ${from.slice(0,70)}`); fail++; continue; }
    code = code.replace(from, to); ok++;
  }
  writeFileSync(p, code);
}
console.log(`\n${ok} edits applied, ${fail} failed`);
