// Full ESLint report analyzer. Run AFTER generating migration/.eslint-report.json
// from INSIDE migration/ (so the flat config + globals apply):
//   cd migration && npx eslint src -f json > .eslint-report.json
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const r = JSON.parse(readFileSync('migration/.eslint-report.json', 'utf8'));
const byRule = {};
const undefSym = {};      // no-undef + jsx-no-undef distinct identifiers
const dupeKeys = [];
for (const f of r) {
  for (const m of f.messages) {
    const key = (m.severity === 2 ? 'ERR  ' : 'warn ') + (m.ruleId || '(parse)');
    byRule[key] = (byRule[key] || 0) + 1;
    if (m.ruleId === 'no-undef' || m.ruleId === 'react/jsx-no-undef') {
      const mm = m.message.match(/'([^']+)'/);
      if (mm) undefSym[mm[1]] = (undefSym[mm[1]] || 0) + 1;
    }
    if (m.ruleId === 'no-dupe-keys') dupeKeys.push(basename(f.filePath) + ':' + m.line + '  ' + m.message);
  }
}
console.log('=== rule breakdown ===');
Object.entries(byRule).sort((a, b) => b[1] - a[1]).forEach(([k, c]) => console.log(String(c).padStart(4), k));
const us = Object.entries(undefSym).sort((a, b) => b[1] - a[1]);
console.log(`\n=== distinct undefined symbols (no-undef + jsx-no-undef): ${us.length} ===`);
us.forEach(([n, c]) => console.log('  ' + String(c).padStart(3) + '  ' + n));
if (dupeKeys.length) { console.log('\n=== no-dupe-keys (real bugs) ==='); dupeKeys.forEach(d => console.log('  ' + d)); }
