// W2: split related_modules.jsx (1200 lines) using AST-accurate boundaries.
// Data layer (LINEAGE graph + SA maps) -> related_modules_data.js (plain JS,
// loaded first). Components ModuleLineage (691-732) + StandardLinkback
// (1057-1198) stay in related_modules.jsx. Behavior-preserving.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'app/related_modules.jsx';
const L = readFileSync(P, 'utf8').split('\n');
const slice = (a, b) => L.slice(a - 1, b).join('\n'); // 1-based inclusive

// DATA: [1-688] + [733-1055]; component publish at 827 references ModuleLineage
// (which leaves to the .jsx) -> drop ModuleLineage from that publish.
const dataPart2 = slice(733, 1055).replace(
  'Object.assign(window, { LINEAGE, ModuleLineage });',
  'Object.assign(window, { LINEAGE });'
);
const dataContent =
slice(1, 688) + '\n' + dataPart2 + `

/* W2: published for the components split out to related_modules.jsx */
Object.assign(window, { LINEAGE, SA_GROUPS, SA_REVERSE, SA_FULFILLED_BY });
`;

// COMPONENTS: ModuleLineage [691-732] + StandardLinkback [1057-1198]
const jsxContent =
`/* ============================================================
   NeoSuite AMS — Related-modules dock & SA linkback (komponen).
   Data graf (LINEAGE) & peta SA dipindah ke related_modules_data.js (W2),
   dimuat SEBELUM berkas ini; komponen membacanya via global/window.
   ============================================================ */

${slice(691, 732)}

${slice(1057, 1198)}

Object.assign(window, { ModuleLineage, StandardLinkback });
`;

writeFileSync('app/related_modules_data.js', dataContent, 'utf8');
writeFileSync(P, jsxContent, 'utf8');

// register the data script BEFORE related_modules.jsx in NeoSuite AMS.html
const H = 'NeoSuite AMS.html';
let html = readFileSync(H, 'utf8');
const mainTag = '<script type="text/babel" src="app/related_modules.jsx"></script>';
const dataTag = '<script src="app/related_modules_data.js"></script>';
if (!html.includes(dataTag)) {
  html = html.replace(mainTag, '  ' + dataTag + '\n  ' + mainTag);
  writeFileSync(H, html, 'utf8');
}

console.log('data.js lines:', dataContent.split('\n').length);
console.log('jsx    lines:', jsxContent.split('\n').length);
console.log('html registered:', html.includes(dataTag));
