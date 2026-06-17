/* W3 Phase 4 — dissolve buildless hook guards.
 *   (typeof useNav === 'function') ? useNav() : <fallback>   ->   useNav()
 * The codemod already imports these hooks as ESM bindings, so the guard's
 * `typeof === 'function'` test is always true; the false-branch is dead code
 * that never ran at runtime. Context defaults match the fallbacks, so the
 * collapse is behavior-identical. Surgical: AST-locate each ConditionalExpression,
 * splice its char range with `useX()` — everything else (comments, spacing) intact.
 *
 * Usage: node .claude/w3-p4-guards.mjs           (dry run, lists every site)
 *        node .claude/w3-p4-guards.mjs --write    (apply)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '../migration/node_modules/@babel/parser/lib/index.js';
import _traverse from '../migration/node_modules/@babel/traverse/lib/index.js';
const traverse = _traverse.default || _traverse;

const SRC = 'migration/src';
const HOOKS = new Set(['useNav', 'useFirm', 'useAudit', 'useAuth', 'useNavFrom', 'useEvidence']);
const WRITE = process.argv.includes('--write');

function isTypeofHookTest(test) {
  // matches:  typeof useX === 'function'   OR   'function' === typeof useX
  if (!test || test.type !== 'BinaryExpression') return null;
  if (test.operator !== '===' && test.operator !== '==') return null;
  const { left, right } = test;
  const pick = (a, b) =>
    a.type === 'UnaryExpression' && a.operator === 'typeof' &&
    a.argument.type === 'Identifier' && HOOKS.has(a.argument.name) &&
    b.type === 'StringLiteral' && b.value === 'function'
      ? a.argument.name : null;
  return pick(left, right) || pick(right, left);
}

let total = 0;
const files = readdirSync(SRC).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));
for (const f of files) {
  const p = join(SRC, f);
  const code = readFileSync(p, 'utf8');
  let ast;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
  } catch (e) { continue; }
  const edits = [];
  traverse(ast, {
    ConditionalExpression(path) {
      const node = path.node;
      const hook = isTypeofHookTest(node.test);
      if (!hook) return;
      // consequent must be a no-arg call to the SAME hook
      const c = node.consequent;
      if (c.type !== 'CallExpression' || c.callee.type !== 'Identifier' ||
          c.callee.name !== hook || c.arguments.length !== 0) return;
      edits.push({ start: node.start, end: node.end, repl: `${hook}()`, hook });
    },
  });
  if (!edits.length) continue;
  console.log(`\n${f}  (${edits.length})`);
  for (const e of edits) console.log(`  ${code.slice(e.start, e.end).replace(/\s+/g, ' ').slice(0, 90)}  ->  ${e.repl}`);
  total += edits.length;
  if (WRITE) {
    edits.sort((a, b) => b.start - a.start); // right-to-left splice
    let out = code;
    for (const e of edits) out = out.slice(0, e.start) + e.repl + out.slice(e.end);
    writeFileSync(p, out);
  }
}
console.log(`\n${WRITE ? 'APPLIED' : 'DRY-RUN'} — ${total} guard sites across files`);
