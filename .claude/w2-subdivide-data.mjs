// W2: subdivide related_modules_data.js (1015 lines) at line 540 into two
// <600-line data files. Part 1 builds core LINEAGE (consumes FIRM/ENG/ADVISORY)
// and publishes window.LINEAGE; part 2 adds template-lineage + extended entries
// + SA maps (references LINEAGE via global/window).
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'app/related_modules_data.js';
const L = readFileSync(P, 'utf8').split('\n');
const part1 = L.slice(0, 540).join('\n');      // 1-540 (ends at Object.assign window LINEAGE)
const part2body = L.slice(540).join('\n');      // 541-end

const part2 =
`/* ============================================================
   NeoSuite AMS — Related-modules data (lanjutan): template-lineage,
   entri lineage tambahan & peta SA. Dimuat SETELAH related_modules_data.js
   (LINEAGE sudah ada) dan SEBELUM related_modules.jsx.
   ============================================================ */

${part2body}`;

writeFileSync(P, part1 + '\n', 'utf8');
writeFileSync('app/related_modules_data2.js', part2, 'utf8');

// register data2 after data1, before the jsx
const H = 'NeoSuite AMS.html';
let html = readFileSync(H, 'utf8');
const data1Tag = '<script src="app/related_modules_data.js"></script>';
const data2Tag = '<script src="app/related_modules_data2.js"></script>';
if (!html.includes(data2Tag)) {
  html = html.replace(data1Tag, data1Tag + '\n  ' + data2Tag);
  writeFileSync(H, html, 'utf8');
}
console.log('part1 lines:', part1.split('\n').length);
console.log('part2 lines:', part2.split('\n').length);
console.log('registered:', html.includes(data2Tag));
