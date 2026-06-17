// W3 Phase 3: split data.js IIFE into ESM modules — same proven approach as
// w3-split-canon.mjs (line-based verbatim extraction + AST-computed cross-module
// imports). data.js has ZERO forward refs (pure DAG, no cycles): foundation =
// fmt/rp; rest = seed data + assurance engines (aupEngine/pfiEngine/socEngine/
// ghgEngine/proformaEngine) that read seeds via backward imports.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = 'D:/Claude AI/06-BUSINESS-DEVELOPMENT/Audit System/migration/';
const require = createRequire(ROOT);
const parser = require('@babel/parser');

const PREFIX = 'data';
const CUT = 'FIRM';            // first non-foundation decl (foundation = fmt, rp)
const NPARTS = 4;
const ASGN_RE = /window\.AMS = \{/;
const P = ROOT + 'src/data.js';
const raw = readFileSync(P, 'utf8');
const lines = raw.split('\n');

const iifeOpen = lines.findIndex(l => /^\(function \(\) \{/.test(l));
const asgnStart = lines.findIndex(l => ASGN_RE.test(l));
const iifeClose = lines.findIndex((l, i) => i > asgnStart && /^\}\)\(\);/.test(l));
const header = lines.slice(0, iifeOpen).join('\n');

// AST first: locate trailing BARE statements (load-time side effects, e.g. seed
// normalization forEach passes) that sit between the last decl and the assembly.
// They are not decls; they must run in the INDEX after all imports (the index
// imports every symbol for the assembly), not inside a part.
const astEarly = parser.parse(raw, { sourceType: 'module', plugins: ['jsx'] });
let iifeEarly = null;
for (const node of astEarly.program.body) {
  if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression'
      && node.expression.callee.type === 'FunctionExpression') { iifeEarly = node.expression.callee; break; }
}
const isAssembly = s => s.type === 'ExpressionStatement' && s.expression.type === 'AssignmentExpression'
  && s.expression.left.type === 'MemberExpression' && s.expression.left.object.name === 'window';
const bareStmts = iifeEarly.body.body.filter(s => s.type !== 'FunctionDeclaration' && s.type !== 'VariableDeclaration' && !isAssembly(s));
const tailStartIdx = bareStmts.length ? Math.min(...bareStmts.map(s => s.loc.start.line - 1)) : asgnStart;
const tailText = bareStmts.length ? lines.slice(tailStartIdx, asgnStart).join('\n').replace(/^  /gm, '') : '';

const decls = [];
for (let i = iifeOpen + 1; i < tailStartIdx; i++) {
  const m = lines[i].match(/^  (const|let|function)\s+([A-Za-z_0-9]+)/);
  if (m) decls.push({ name: m[2], start: i });
}
for (let i = 0; i < decls.length; i++) decls[i].end = (decls[i + 1] ? decls[i + 1].start : tailStartIdx) - 1;
const blockText = d => lines.slice(d.start, d.end + 1).join('\n');
const lineCount = d => d.end - d.start + 1;
const allNames = new Set(decls.map(d => d.name));

const ast = parser.parse(raw, { sourceType: 'module', plugins: ['jsx'] });
let iife = null;
for (const node of ast.program.body) {
  if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression'
      && node.expression.callee.type === 'FunctionExpression') { iife = node.expression.callee; break; }
}
const stmts = iife.body.body;
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
    for (const k in n) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'leadingComments' || k === 'trailingComments') continue;
      walk(n[k]);
    }
  })(node);
  return found;
}
const refsByName = new Map();
for (const stmt of stmts) {
  const dn = declNamesOf(stmt);
  if (!dn.length) continue;
  const refs = idsIn(stmt, dn);
  for (const name of dn) refsByName.set(name, refs);
}

const firstEngineIdx = decls.findIndex(d => d.name === CUT);
const foundation = decls.slice(0, firstEngineIdx);
const rest = decls.slice(firstEngineIdx);
const foundNames = foundation.map(d => d.name);

const totalLines = rest.reduce((s, d) => s + lineCount(d), 0);
const target = totalLines / NPARTS;
const groups = Array.from({ length: NPARTS }, () => []);
let g = 0, acc = 0;
for (const d of rest) {
  groups[g].push(d); acc += lineCount(d);
  if (acc >= target && g < NPARTS - 1) { g++; acc = 0; }
}

const moduleOf = new Map();
foundNames.forEach(n => moduleOf.set(n, 'base'));
groups.forEach((grp, i) => grp.forEach(d => moduleOf.set(d.name, 'part' + (i + 1))));

const ban = n => `/* ============================================================\n   NeoSuite AMS — data ${n} (W3 split dari data.js; perilaku identik).\n   ============================================================ */`;
const fileFor = n => n === 'base' ? `./${PREFIX}_base.js` : `./${PREFIX}_${n}.js`;

function importsFor(members, selfModule) {
  const memberNames = new Set(members.map(d => d.name));
  const needed = new Map();
  for (const d of members) {
    for (const ref of (refsByName.get(d.name) || [])) {
      if (memberNames.has(ref)) continue;
      const src = moduleOf.get(ref);
      if (!src || src === selfModule) continue;
      if (!needed.has(src)) needed.set(src, new Set());
      needed.get(src).add(ref);
    }
  }
  return [...needed.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([src, set]) => `import { ${[...set].sort().join(', ')} } from '${fileFor(src)}';`)
    .join('\n');
}

writeFileSync(ROOT + `src/${PREFIX}_base.js`,
  ban('base (helper fmt/rp)') + '\n' +
  foundation.map(blockText).join('\n') + '\n\n' +
  `export { ${foundNames.join(', ')} };\n`);

groups.forEach((grp, i) => {
  const imp = importsFor(grp, 'part' + (i + 1));
  writeFileSync(ROOT + `src/${PREFIX}_part${i + 1}.js`,
    ban(`part${i + 1} (seed + engine)`) + '\n' +
    (imp ? imp + '\n\n' : '') +
    grp.map(blockText).join('\n') + '\n\n' +
    `export { ${grp.map(d => d.name).join(', ')} };\n`);
});

const groupNames = groups.map(grp => grp.map(d => d.name));
const assembly = lines.slice(asgnStart, iifeClose).join('\n').replace(/^  /gm, '');
writeFileSync(P,
  header + '\n' +
  `import { ${foundNames.join(', ')} } from '${fileFor('base')}';\n` +
  groupNames.map((ns, i) => `import { ${ns.join(', ')} } from '${fileFor('part' + (i + 1))}';`).join('\n') + '\n\n' +
  (tailText ? `/* load-time seed normalization (was trailing in the IIFE; runs after all imports) */\n` + tailText + '\n\n' : '') +
  assembly + '\n\n' +
  `/* [W3 split] ESM exports (dual-publish; window writes dipertahankan) */\n` +
  `export const AMS = window.AMS;\n`);

console.log('foundation:', foundNames.length, 'decls,', foundation.reduce((s,d)=>s+lineCount(d),0), 'lines:', foundNames.join(', '));
groups.forEach((grp,i)=>{
  console.log(`part${i+1}:`, grp.length, 'decls,', grp.reduce((s,d)=>s+lineCount(d),0), 'lines');
  const imp = importsFor(grp, 'part'+(i+1));
  if (imp) console.log('   imports:\n     ' + imp.replace(/\n/g,'\n     '));
});
console.log('index data.js lines:', readFileSync(P,'utf8').split('\n').length);
