// Detect cross-file React hook-alias "borrows": an alias used in a file that
// does NOT declare it (works in global/buildless, breaks under ESM module scope).
import { readdir, readFile } from 'node:fs/promises';

const dir = 'app';
const files = (await readdir(dir)).filter(f => /\.(jsx|js)$/.test(f));
const reDecl = /const\s*\{([^}]*)\}\s*=\s*React\s*;/g;

// alias -> declaring file
const declOf = {};
const fileText = {};
for (const f of files) {
  const t = await readFile(dir + '/' + f, 'utf8');
  fileText[f] = t;
  let m;
  while ((m = reDecl.exec(t))) {
    m[1].split(',').forEach(p => {
      p = p.trim(); if (!p) return;
      const alias = p.includes(':') ? p.split(':')[1].trim() : p.trim();
      if (alias) declOf[alias] = f;
    });
  }
}

// hook-alias name pattern (use*XX). Check each alias used in non-declaring files.
const borrows = [];
for (const [alias, owner] of Object.entries(declOf)) {
  if (!/^use[A-Z]/.test(alias)) continue;
  const re = new RegExp('\\b' + alias + '\\b');
  for (const f of files) {
    if (f === owner) continue;
    if (re.test(fileText[f])) borrows.push({ alias, owner, usedIn: f });
  }
}
console.log('Cross-file hook-alias borrows:', borrows.length);
const byFile = {};
for (const b of borrows) (byFile[b.usedIn] = byFile[b.usedIn] || []).push(`${b.alias}(from ${b.owner})`);
for (const [f, list] of Object.entries(byFile)) console.log('  ' + f + '  <-  ' + list.join(', '));
