// W2: split view_groupaudit.jsx (1016 lines) — move GAPackages/GAConsol/
// GAElimReview (contiguous lines 403-943) into view_groupaudit_parts.jsx.
// Behavior-preserving: parts loads BEFORE main; shared consts window-published
// in main; moved hook alias renamed to a unique per-file alias (golden-rule #1).
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'app/view_groupaudit.jsx';
const lines = readFileSync(P, 'utf8').split('\n');
const MOVE_START = 403, MOVE_END = 943; // 1-based inclusive

const before = lines.slice(0, MOVE_START - 1);      // 1..402
const movedRaw = lines.slice(MOVE_START - 1, MOVE_END); // 403..943
const after = lines.slice(MOVE_END);                 // 944..end

// rename the borrowed hook alias inside the moved block only
const moved = movedRaw.join('\n').replace(/\buseStateGA\b/g, 'useStateGAP');

const partsContent =
`/* ============================================================
   NeoSuite AMS — Group Audit (bagian): GAPackages · GAConsol · GAElimReview
   Dipecah dari view_groupaudit.jsx (W2). Dimuat SEBELUM view_groupaudit.jsx.
   Konstanta bersama (GA_CONSOL_*, PKG_*) tetap di file utama & dipublikasikan
   ke window agar tetap satu sumber; komponen di sini diekspor balik ke window.
   ============================================================ */
const { useState: useStateGAP } = React;

${moved}

Object.assign(window, { GAPackages, GAConsol, GAElimReview });
`;

// main: insert window-publish of the 6 shared consts just before GroupAudit
const PUBLISH = 'Object.assign(window, { GA_CONSOL_PROC, GA_CONSOL_UP, GA_CONSOL_DOWN, PKG_STATUS_KIND, PKG_FIELDS, PKG_NUM_KEYS }); // shared with view_groupaudit_parts.jsx (W2)';
const beforeTxt = before.join('\n').replace(/\nfunction GroupAudit\(\) \{/, '\n' + PUBLISH + '\n\nfunction GroupAudit() {');
const mainContent = beforeTxt + '\n' + after.join('\n');

writeFileSync('app/view_groupaudit_parts.jsx', partsContent, 'utf8');
writeFileSync(P, mainContent, 'utf8');

// register <script> before the main file in NeoSuite AMS.html
const H = 'NeoSuite AMS.html';
let html = readFileSync(H, 'utf8');
const mainTag = '<script type="text/babel" src="app/view_groupaudit.jsx"></script>';
const partsTag = '<script type="text/babel" src="app/view_groupaudit_parts.jsx"></script>';
if (!html.includes(partsTag)) {
  html = html.replace(mainTag, '  ' + partsTag + '\n  ' + mainTag);
  writeFileSync(H, html, 'utf8');
}

console.log('parts lines:', partsContent.split('\n').length);
console.log('main lines :', mainContent.split('\n').length);
console.log('html registered:', html.includes(partsTag));
