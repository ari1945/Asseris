// W3 Phase 3: split canon.js IIFE into ESM modules — CORRECTED.
// base (foundation, self-contained) + part1/2/3 (engines+seeds). Unlike the first
// attempt, each part imports EVERY external symbol its members reference (computed
// via babel AST, comment/string-safe), grouped by defining module. Source order is
// a valid init order; the single forward edge (reconcile->psak66, a runtime fn call)
// is handled as a normal cross-part import (ESM live binding, safe).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = 'D:/Claude AI/06-BUSINESS-DEVELOPMENT/Audit System/migration/';
const require = createRequire(ROOT);
const parser = require('@babel/parser');

const P = ROOT + 'src/canon.js';
const raw = readFileSync(P, 'utf8');
const lines = raw.split('\n');

// --- line-based decl extraction (same as verified-good W2/foundation approach) ---
const iifeOpen = lines.findIndex(l => /^\(function \(\) \{/.test(l));
const asgnStart = lines.findIndex(l => /window\.AMS_CANON = \{/.test(l));
const iifeClose = lines.findIndex((l, i) => i > asgnStart && /^\}\)\(\);/.test(l));
const header = lines.slice(0, iifeOpen).join('\n');

const decls = [];
for (let i = iifeOpen + 1; i < asgnStart; i++) {
  const m = lines[i].match(/^  (const|let|function)\s+([A-Za-z_0-9]+)/);
  if (m) decls.push({ name: m[2], start: i });
}
for (let i = 0; i < decls.length; i++) decls[i].end = (decls[i + 1] ? decls[i + 1].start : asgnStart) - 1;
const blockText = d => lines.slice(d.start, d.end + 1).join('\n');
const lineCount = d => d.end - d.start + 1;
const allNames = new Set(decls.map(d => d.name));

// --- AST-based reference computation (ignores comments & string contents) ---
const ast = parser.parse(raw, { sourceType: 'module', plugins: ['jsx'] });
let iife = null;
for (const node of ast.program.body) {
  if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression'
      && node.expression.callee.type === 'FunctionExpression') { iife = node.expression.callee; break; }
}
const stmts = iife.body.body;
// map each top-level statement node to the decl name(s) it introduces
function declNamesOf(stmt) {
  if (stmt.type === 'FunctionDeclaration' && stmt.id) return [stmt.id.name];
  if (stmt.type === 'VariableDeclaration') return stmt.declarations.filter(d => d.id.type === 'Identifier').map(d => d.id.name);
  return [];
}
function idsIn(node, selfNames) {
  const found = new Set();
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n.type) return;
    if (n.type === 'Identifier' && allNames.has(n.name) && !selfNames.includes(n.name)) found.add(n.name);
    // skip object property KEYS (non-computed) to avoid false hits on shorthand-lookalike keys
    for (const k in n) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'leadingComments' || k === 'trailingComments') continue;
      walk(n[k]);
    }
  })(node);
  return found;
}
const refsByName = new Map(); // declName -> Set(referenced top-level names)
for (const stmt of stmts) {
  const dn = declNamesOf(stmt);
  if (!dn.length) continue;
  const refs = idsIn(stmt, dn);
  for (const name of dn) refsByName.set(name, refs);
}

// --- partition ---
const firstEngineIdx = decls.findIndex(d => d.name === 'deferredTax');
const foundation = decls.slice(0, firstEngineIdx);
const rest = decls.slice(firstEngineIdx);
const foundNames = foundation.map(d => d.name);

const NPARTS = 4;
const totalLines = rest.reduce((s, d) => s + lineCount(d), 0);
const target = totalLines / NPARTS;
const groups = Array.from({ length: NPARTS }, () => []);
let g = 0, acc = 0;
for (const d of rest) {
  groups[g].push(d); acc += lineCount(d);
  if (acc >= target && g < NPARTS - 1) { g++; acc = 0; }
}

// module-of map: name -> 'base' | 'part1' | 'part2' | 'part3'
const moduleOf = new Map();
foundNames.forEach(n => moduleOf.set(n, 'base'));
groups.forEach((grp, i) => grp.forEach(d => moduleOf.set(d.name, 'part' + (i + 1))));

const ban = n => `/* ============================================================\n   NeoSuite AMS — canon ${n} (W3 split dari canon.js; perilaku identik).\n   ============================================================ */`;

// compute imports for a set of member decls: external refs grouped by source module
function importsFor(members, selfModule) {
  const memberNames = new Set(members.map(d => d.name));
  const needed = new Map(); // sourceModule -> Set(names)
  for (const d of members) {
    for (const ref of (refsByName.get(d.name) || [])) {
      if (memberNames.has(ref)) continue;            // defined locally in this module
      const src = moduleOf.get(ref);
      if (!src || src === selfModule) continue;
      if (!needed.has(src)) needed.set(src, new Set());
      needed.get(src).add(ref);
    }
  }
  const fileFor = n => n === 'base' ? './canon_base.js' : `./canon_${n}.js`;
  return [...needed.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([src, set]) => `import { ${[...set].sort().join(', ')} } from '${fileFor(src)}';`)
    .join('\n');
}

// --- write base ---
writeFileSync(ROOT + 'src/canon_base.js',
  ban('base (foundation: helper + konstanta + lease/figures)') + '\n' +
  foundation.map(blockText).join('\n') + '\n\n' +
  `export { ${foundNames.join(', ')} };\n`);

// --- write parts ---
groups.forEach((grp, i) => {
  const imp = importsFor(grp, 'part' + (i + 1));
  writeFileSync(ROOT + `src/canon_part${i + 1}.js`,
    ban(`part${i + 1} (engine + seed)`) + '\n' +
    (imp ? imp + '\n\n' : '') +
    grp.map(blockText).join('\n') + '\n\n' +
    `export { ${grp.map(d => d.name).join(', ')} };\n`);
});

// --- rewrite canon.js index: header + imports + assembly + window publish + export ---
const groupNames = groups.map(grp => grp.map(d => d.name));
const assembly = lines.slice(asgnStart, iifeClose).join('\n').replace(/^  /gm, '');
writeFileSync(P,
  header + '\n' +
  `import { ${foundNames.join(', ')} } from './canon_base.js';\n` +
  groupNames.map((ns, i) => `import { ${ns.join(', ')} } from './canon_part${i + 1}.js';`).join('\n') + '\n\n' +
  assembly + '\n\n' +
  `/* [W3 split] ESM exports (dual-publish; window writes dipertahankan) */\n` +
  `export const AMS_CANON = window.AMS_CANON;\n`);

console.log('foundation:', foundNames.length, 'decls,', foundation.reduce((s,d)=>s+lineCount(d),0), 'lines');
groups.forEach((grp,i)=>{
  console.log(`part${i+1}:`, grp.length, 'decls,', grp.reduce((s,d)=>s+lineCount(d),0), 'lines');
  const imp = importsFor(grp, 'part'+(i+1));
  if (imp) console.log('   imports:\n     ' + imp.replace(/\n/g,'\n     '));
});
console.log('index canon.js lines:', readFileSync(P,'utf8').split('\n').length);
