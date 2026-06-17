// Analyze view_groupaudit.jsx split at lines 403-943 (the move block).
// Report: symbols defined in KEPT main but referenced by the MOVED block
// (these must be window-published) and vice-versa.
import { readFileSync } from 'node:fs';
const lines = readFileSync('app/view_groupaudit.jsx', 'utf8').split('\n');
const MOVE_START = 403, MOVE_END = 943; // 1-based inclusive
const kept = [], moved = [];
lines.forEach((l, i) => { const n = i + 1; (n >= MOVE_START && n <= MOVE_END ? moved : kept).push(l); });
const keptTxt = kept.join('\n'), movedTxt = moved.join('\n');

// top-level definitions (function/const) with their line + which side
const defRe = /^(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/;
const defs = {};
lines.forEach((l, i) => { const m = l.match(defRe); if (m) defs[m[1]] = i + 1; });
const sideOf = (ln) => (ln >= MOVE_START && ln <= MOVE_END ? 'moved' : 'kept');

const ref = (txt, name) => new RegExp('\\b' + name + '\\b').test(txt);
console.log('=== KEPT-defined symbols referenced by MOVED block (must window-publish) ===');
for (const [name, ln] of Object.entries(defs)) {
  if (sideOf(ln) === 'kept' && ref(movedTxt, name)) console.log('  ' + name + '  (def line ' + ln + ')');
}
console.log('\n=== MOVED-defined symbols referenced by KEPT main (parts must window-export) ===');
for (const [name, ln] of Object.entries(defs)) {
  if (sideOf(ln) === 'moved' && ref(keptTxt, name)) console.log('  ' + name + '  (def line ' + ln + ')');
}
console.log('\n=== hooks used in moved block ===');
console.log('  ', (movedTxt.match(/\buse(State|Memo|Effect|Ref|Callback)GA\b/g) || []).reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {}));
console.log('=== useAmsPersist / nav / fmt in moved block (runtime-bus/props) ===');
console.log('  useAmsPersist:', (movedTxt.match(/\buseAmsPersist\b/g) || []).length);
