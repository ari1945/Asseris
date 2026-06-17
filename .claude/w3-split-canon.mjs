// W3 Phase 3: split canon.js IIFE into acyclic ESM modules.
// base (foundation, self-contained) <- part1/2/3 (engines+seeds import base);
// canon.js index imports all, assembles window.AMS_CANON, exports.
// Verbatim block extraction (no reformatting) — engines have zero inter-engine
// deps (verified), so each part only imports the foundation set.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'canon.js';
const lines = readFileSync(P, 'utf8').split('\n');           // 0-based array
const N = lines.length;

// locate IIFE + assembly
const iifeOpen = lines.findIndex(l => /^\(function \(\) \{/.test(l));       // L19 (idx 18)
const asgnStart = lines.findIndex(l => /window\.AMS_CANON = \{/.test(l));   // idx of assembly
const iifeClose = lines.findIndex((l, i) => i > asgnStart && /^\}\)\(\);/.test(l));
const header = lines.slice(0, iifeOpen).join('\n');          // top comment (L1-18)

// decls at IIFE level (2-space indent)
const decls = [];
for (let i = iifeOpen + 1; i < asgnStart; i++) {
  const m = lines[i].match(/^  (const|let|function)\s+([A-Za-z_0-9]+)/);
  if (m) decls.push({ name: m[2], start: i });
}
for (let i = 0; i < decls.length; i++) decls[i].end = (decls[i + 1] ? decls[i + 1].start : asgnStart) - 1;
const blockText = d => lines.slice(d.start, d.end + 1).join('\n');

// foundation = decls before deferredTax (the first engine)
const firstEngineIdx = decls.findIndex(d => d.name === 'deferredTax');
const foundation = decls.slice(0, firstEngineIdx);
const rest = decls.slice(firstEngineIdx);
const foundNames = foundation.map(d => d.name);

// partition rest into 3 balanced groups by line count
const totalLines = rest.reduce((s, d) => s + (d.end - d.start + 1), 0);
const target = totalLines / 3;
const groups = [[], [], []];
let g = 0, acc = 0;
for (const d of rest) {
  groups[g].push(d); acc += (d.end - d.start + 1);
  if (acc >= target && g < 2) { g++; acc = 0; }
}
const groupNames = groups.map(grp => grp.map(d => d.name));

const FOUND_IMPORT = `import { ${foundNames.join(', ')} } from './canon_base.js';`;
const ban = n => `/* ============================================================\n   NeoSuite AMS — canon ${n} (W3 split dari canon.js; perilaku identik).\n   ============================================================ */`;

// base module
writeFileSync('canon_base.js',
  ban('base (foundation: helper + konstanta + lease/figures)') + '\n' +
  foundation.map(blockText).join('\n') + '\n\n' +
  `export { ${foundNames.join(', ')} };\n`);

// part modules
groups.forEach((grp, i) => {
  writeFileSync(`canon_part${i + 1}.js`,
    ban(`part${i + 1} (engine + seed)`) + '\n' +
    FOUND_IMPORT + '\n\n' +
    grp.map(blockText).join('\n') + '\n\n' +
    `export { ${grp.map(d => d.name).join(', ')} };\n`);
});

// index canon.js: header + imports + assembly + window publish + export
const allNames = [...foundNames, ...groupNames.flat()];
const assembly = lines.slice(asgnStart, iifeClose).join('\n')   // 'window.AMS_CANON = { ... };' (indented)
  .replace(/^/gm, '').replace(/^  /gm, '');                      // light dedent
writeFileSync(P,
  header + '\n' +
  `import { ${foundNames.join(', ')} } from './canon_base.js';\n` +
  groupNames.map((ns, i) => `import { ${ns.join(', ')} } from './canon_part${i + 1}.js';`).join('\n') + '\n\n' +
  assembly + '\n\n' +
  `export const AMS_CANON = window.AMS_CANON;\n`);

console.log('foundation:', foundNames.length, 'decls,', foundation.reduce((s,d)=>s+(d.end-d.start+1),0), 'lines');
groups.forEach((grp,i)=>console.log('part'+(i+1)+':', grp.length, 'decls,', grp.reduce((s,d)=>s+(d.end-d.start+1),0), 'lines'));
console.log('index canon.js lines:', readFileSync(P,'utf8').split('\n').length);
