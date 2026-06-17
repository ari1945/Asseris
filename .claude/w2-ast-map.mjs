// AST map of top-level statements in a JSX file (exact line ranges) so the
// data/component split is boundary-accurate. Uses @babel/parser from migration.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('D:/Claude AI/06-BUSINESS-DEVELOPMENT/Audit System/migration/');
const parser = require('@babel/parser');

const file = process.argv[2] || 'app/related_modules.jsx';
const code = readFileSync(file, 'utf8');
const ast = parser.parse(code, { sourceType: 'script', plugins: ['jsx'] });

const name = (n) => {
  if (n.type === 'FunctionDeclaration') return 'function ' + (n.id?.name || '?');
  if (n.type === 'VariableDeclaration') return n.kind + ' ' + n.declarations.map(d => d.id.name || '?').join(',');
  if (n.type === 'ExpressionStatement') {
    const e = n.expression;
    if (e.type === 'CallExpression') {
      const c = e.callee;
      if (c.type === 'MemberExpression') return 'call ' + (c.object.name || '') + '.' + (c.property.name || '');
      if (c.type === 'FunctionExpression' || c.type === 'ArrowFunctionExpression') return 'IIFE';
      return 'call ' + (c.name || '?');
    }
    return e.type;
  }
  return n.type;
};
for (const n of ast.program.body) {
  console.log(String(n.loc.start.line).padStart(4) + '-' + String(n.loc.end.line).padEnd(4) + '  ' + name(n));
}
