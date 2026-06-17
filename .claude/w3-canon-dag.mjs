// W3 Phase 3 (read-only analysis): build the real inter-decl dependency DAG of
// canon.js's IIFE. For each top-level decl, collect references to OTHER top-level
// decl names anywhere in its body. Report forward references (decl -> later decl),
// which would break naive source-order binning.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('D:/Claude AI/06-BUSINESS-DEVELOPMENT/Audit System/migration/');
const parser = require('@babel/parser');
const traverseMod = require('@babel/traverse');
const traverse = traverseMod.default || traverseMod;

const SRC = 'D:/Claude AI/06-BUSINESS-DEVELOPMENT/Audit System/migration/src/canon.js';
const code = readFileSync(SRC, 'utf8');
const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });

// find the IIFE: an ExpressionStatement -> CallExpression -> FunctionExpression
let iife = null;
for (const node of ast.program.body) {
  if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
    const c = node.expression.callee;
    if (c.type === 'FunctionExpression') { iife = c; break; }
  }
}
if (!iife) throw new Error('IIFE not found');
const body = iife.body.body; // statements inside the IIFE

// collect top-level decls (in order) and their {name, start, end, node}
const decls = [];
for (const stmt of body) {
  if (stmt.type === 'FunctionDeclaration' && stmt.id) {
    decls.push({ name: stmt.id.name, node: stmt, kind: 'fn', start: stmt.start, end: stmt.end });
  } else if (stmt.type === 'VariableDeclaration') {
    for (const d of stmt.declarations) {
      if (d.id.type === 'Identifier') decls.push({ name: d.id.name, node: stmt, kind: stmt.kind, start: stmt.start, end: stmt.end });
    }
  }
}
const names = new Set(decls.map(d => d.name));
const order = new Map(decls.map((d, i) => [d.name, i]));

// for each decl, find referenced top-level names within its node
function refsOf(decl) {
  const found = new Set();
  traverse(ast, {
    noScope: false,
    enter(path) {},
  });
  // simpler: walk the subtree manually
  const seen = new Set();
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n.type) return;
    if (n.type === 'Identifier') {
      if (names.has(n.name) && n.name !== decl.name) found.add(n.name);
    }
    for (const k in n) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'leadingComments' || k === 'trailingComments') continue;
      walk(n[k]);
    }
  })(decl.node);
  return found;
}

const FOUND = ['RATE','ASOF','jt','wtbRow','wtbVal','WTB_MAP','figuresFromWTB','elapsedMonths','leaseCalc','leasePortfolio','LEASES','FISCAL','SRC','FIG'];
const firstEngineIdx = decls.findIndex(d => d.name === 'deferredTax');
console.log('total decls:', decls.length, '| foundation cut at deferredTax idx', firstEngineIdx);
console.log('foundation decls:', decls.slice(0, firstEngineIdx).map(d=>d.name).join(', '));

let forwardCount = 0;
for (const d of decls) {
  const r = [...refsOf(d)];
  const fwd = r.filter(n => order.get(n) > order.get(d.name));
  if (fwd.length) {
    forwardCount += fwd.length;
    console.log(`FWD-REF  ${d.name} (idx ${order.get(d.name)}) -> ${fwd.map(n=>`${n}(${order.get(n)})`).join(', ')}`);
  }
}
console.log('\nTotal forward references:', forwardCount);
