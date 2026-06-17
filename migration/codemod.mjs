#!/usr/bin/env node
/* ============================================================================
   NeoSuite AMS — window-namespace → ESM codemod (safe, incremental dual-publish)
   ----------------------------------------------------------------------------
   APA YANG DILAKUKAN
   1. Membaca urutan muat dari "NeoSuite AMS.html" (urutan <script> = boot order).
   2. Menyalin semua berkas app/* ke migration/src/ (ASLI TIDAK DISENTUH).
   3. Membangun PETA SIMBOL GLOBAL via AST (@babel/parser):
        nama global  ->  berkas pemilik
      Sumber ekspor yang dideteksi:
        - Object.assign(window, { A, B, C })      -> A,B,C milik berkas ini
        - window.NAMA = ...                        -> NAMA milik berkas ini
        - window.AMS = ... / window.PROC = ...     -> namespace data (pemilik = berkas pertama)
   4. Untuk SETIAP berkas, dengan analisis ruang-lingkup (scope) Babel:
        - cari identifier BEBAS (termasuk nama komponen JSX <Foo/> dan <I.x/>)
          yang ada di peta global tetapi TIDAK dideklarasikan/diimpor lokal,
        - kelompokkan per berkas pemilik -> sisipkan `import { ... } from './pemilik'`,
        - 'React'   -> import React from 'react'
        - 'ReactDOM'-> import ReactDOM from 'react-dom/client'
   5. DUAL-PUBLISH: blok `import` ditambah di ATAS, blok `export` di BAWAH.
      Tulisan ke `window` yang lama DIPERTAHANKAN sebagai jaring pengaman runtime,
      sehingga migrasi sebagian pun tidak pernah membuat "layar putih".
   6. Membuat src/main.jsx (entri tunggal, urutan = boot order) + index.html (Vite).

   YANG TIDAK DIUBAH (sengaja, aman):
   - Bus imperatif runtime: window.__amsOpenSA, window.__amsOpenCopilot,
     window.amsApplyPrefs, window.COMPLIANCE_CONFIG, window.claude, dll.
     Akses `window.X` member tetap apa adanya (tetap jalan via dual-publish).
   - Hanya identifier BARE yang dikonversi jadi import; tak ada kode lama ditimpa.

   CARA PAKAI
     cd migration && npm install && node codemod.mjs && npm run dev
   FLAG
     --root <dir>   akar proyek (default: ..)
     --dry          hanya laporan, tidak menulis
============================================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

/* ---------- args ---------- */
const argv = process.argv.slice(2);
const getFlag = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const PROJECT_ROOT = path.resolve(getFlag('--root', '..'));
const DRY = !!getFlag('--dry', false);
const HERE = path.resolve('.');                 // migration/
const SRC_OUT = path.join(HERE, 'src');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const HTML_IN = path.join(PROJECT_ROOT, 'NeoSuite AMS.html');

/* ---------- nama runtime/browser yang JANGAN dianggap modul ---------- */
const BROWSER_GLOBALS = new Set([
  'window','document','console','localStorage','sessionStorage','navigator','location','history',
  'setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','cancelAnimationFrame',
  'JSON','Math','Object','Array','String','Number','Boolean','Date','Promise','Map','Set','WeakMap','WeakSet',
  'RegExp','Intl','Symbol','Error','TypeError','RangeError','Reflect','Proxy','BigInt','parseInt','parseFloat',
  'isNaN','isFinite','encodeURIComponent','decodeURIComponent','fetch','URL','URLSearchParams','Blob','File',
  'FileReader','FormData','Headers','Request','Response','crypto','structuredClone','queueMicrotask','alert',
  'confirm','prompt','atob','btoa','getComputedStyle','matchMedia','ResizeObserver','IntersectionObserver',
  'MutationObserver','CustomEvent','Event','undefined','NaN','Infinity','globalThis','self','top','parent',
  'performance','screen','print','open','close','HTMLElement','Node','Element','Image','Audio','Worker',
  'TextEncoder','TextDecoder','AbortController',
]);
/* default-imported, bukan named export berkas */
const REACT_DEFAULTS = { React: "import React from 'react';", ReactDOM: "import ReactDOM from 'react-dom/client';" };

/* ---------- util parse ---------- */
function parseFile(code) {
  return parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
    errorRecovery: true,
  });
}

/* nama identifier dari property key (Object.assign(window,{...})) */
function keyName(prop) {
  if (prop.type === 'ObjectProperty' || prop.type === 'ObjectMethod') {
    if (prop.key.type === 'Identifier') return prop.key.name;
    if (prop.key.type === 'StringLiteral') return prop.key.value;
  }
  if (prop.type === 'SpreadElement') return null;
  return null;
}

/* ---------- load order dari HTML ---------- */
function readLoadOrder() {
  const html = fs.readFileSync(HTML_IN, 'utf8');
  const order = [];
  const re = /<script\b[^>]*\bsrc=["']app\/([^"']+)["'][^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) order.push(m[1]);
  const cssLink = /<link\b[^>]*\bhref=["']app\/([^"']+\.css)["']/.exec(html);
  return { order, css: cssLink ? cssLink[1] : 'styles.css' };
}

/* ============================================================ MAIN */
const { order, css } = readLoadOrder();
const files = order.filter(f => /\.(js|jsx)$/.test(f));
log(`Boot order: ${files.length} berkas · CSS: ${css}`);

/* baca semua sumber + AST */
const SRC = {};       // file -> code
const AST = {};       // file -> ast
for (const f of files) {
  const p = path.join(APP_DIR, f);
  if (!fs.existsSync(p)) { warn(`HILANG di app/: ${f}`); continue; }
  SRC[f] = fs.readFileSync(p, 'utf8');
  try { AST[f] = parseFile(SRC[f]); }
  catch (e) { warn(`Gagal parse ${f}: ${e.message}`); }
}
const present = files.filter(f => AST[f]);

/* ---- PASS 1: peta ekspor global  (nama -> [pemilik...]) ---- */
const owners = new Map();      // name -> [file,...] (urut load order)
const addOwner = (name, f) => {
  if (!name) return;
  if (!owners.has(name)) owners.set(name, []);
  const arr = owners.get(name);
  if (!arr.includes(f)) arr.push(f);
};
const fileExports = {};        // file -> Set(names)

for (const f of present) {
  const set = new Set();
  traverse(AST[f], {
    CallExpression(p) {
      const c = p.node.callee;
      // Object.assign(window, {...})
      if (c.type === 'MemberExpression' && c.object.name === 'Object' && c.property.name === 'assign') {
        const a0 = p.node.arguments[0];
        if (a0 && a0.type === 'Identifier' && a0.name === 'window') {
          for (const arg of p.node.arguments.slice(1)) {
            if (arg.type === 'ObjectExpression') for (const pr of arg.properties) { const n = keyName(pr); if (n) { set.add(n); addOwner(n, f); } }
          }
        }
      }
    },
    AssignmentExpression(p) {
      const L = p.node.left;
      // window.NAMA = ...
      if (L.type === 'MemberExpression' && L.object.type === 'Identifier' && L.object.name === 'window'
          && L.property.type === 'Identifier' && !L.computed) {
        const n = L.property.name;
        if (!n.startsWith('__ams') && n !== 'amsApplyPrefs' && n !== 'amsPrintDoc' || true) {
          // namespaces & top-level publish — semua dicatat sbg ekspor berkas ini
          set.add(n); addOwner(n, f);
        }
      }
    },
  });
  fileExports[f] = set;
}

/* deteksi tabrakan nama (footgun yang dikenal) */
const collisions = [...owners.entries()].filter(([, fs_]) => fs_.length > 1);
const ownerOf = (name) => { const a = owners.get(name); return a && a.length ? a[0] : null; }; // first-in-load-order wins

/* ---- PASS 2: hitung import/eksport per berkas ---- */
function relImport(fromFile, toFile) {
  return './' + toFile;            // berkas datar di src/, sertakan ekstensi
}

const unresolved = new Set();
const outputs = {};                // file -> code final

for (const f of present) {
  const ast = AST[f];
  const selfExports = fileExports[f];
  const needFromFile = new Map();  // ownerFile -> Set(names)
  const reactImports = new Set();

  const considerRef = (name, scopePath) => {
    if (!name || selfExports.has(name)) return;
    if (REACT_DEFAULTS[name]) {
      // hanya impor React/ReactDOM bila benar2 global (tak ter-binding lokal)
      if (!scopePath.scope.getBinding(name)) reactImports.add(name);
      return;
    }
    if (BROWSER_GLOBALS.has(name)) return;
    if (!owners.has(name)) return;                       // bukan simbol modul yg dikenal
    if (scopePath.scope.getBinding(name)) return;        // sudah dideklarasi/diimpor lokal
    const own = ownerOf(name);
    if (!own || own === f) return;
    if (!needFromFile.has(own)) needFromFile.set(own, new Set());
    needFromFile.get(own).add(name);
  };

  traverse(ast, {
    ReferencedIdentifier(p) { considerRef(p.node.name, p); },
    // komponen JSX: <Foo/>, <Foo.Bar/>, <I.x/>
    JSXOpeningElement(p) {
      let nameNode = p.node.name;
      while (nameNode.type === 'JSXMemberExpression') nameNode = nameNode.object;
      if (nameNode.type === 'JSXIdentifier') {
        const nm = nameNode.name;
        if (/^[A-Z]/.test(nm) || owners.has(nm)) considerRef(nm, p);
      }
    },
  });

  /* laporkan global tak dikenal (kemungkinan simbol terlewat / typo) */
  traverse(ast, {
    ReferencedIdentifier(p) {
      const nm = p.node.name;
      if (BROWSER_GLOBALS.has(nm) || REACT_DEFAULTS[nm] || owners.has(nm)) return;
      if (selfExports.has(nm)) return;
      if (p.scope.getBinding(nm)) return;
      unresolved.add(`${nm}  (${f})`);
    },
  });

  /* ---- bangun blok import ---- */
  const importLines = [];
  for (const rn of ['React', 'ReactDOM']) if (reactImports.has(rn)) importLines.push(REACT_DEFAULTS[rn]);
  const ownersSorted = [...needFromFile.keys()].sort();
  for (const own of ownersSorted) {
    const names = [...needFromFile.get(own)].sort();
    if (names.length) importLines.push(`import { ${names.join(', ')} } from '${relImport(f, own)}';`);
  }

  /* ---- bangun blok export (dual-publish) ---- */
  const topScope = collectTopBindings(ast);
  const named = [];   // punya binding top-level -> export { ... }
  const indirect = []; // tak ada binding -> export const X = window.X
  for (const n of selfExports) {
    if (topScope.has(n)) named.push(n);
    else indirect.push(n);
  }
  const exportLines = [];
  if (named.length) exportLines.push(`export { ${named.sort().join(', ')} };`);
  for (const n of indirect.sort()) exportLines.push(`export const ${n} = window.${n};`);

  const header = importLines.length ? ('/* [codemod] ESM imports */\n' + importLines.join('\n') + '\n\n') : '';
  const footer = exportLines.length ? ('\n\n/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */\n' + exportLines.join('\n') + '\n') : '';
  outputs[f] = header + SRC[f] + footer;
}

/* binding top-level: const/let/var/function/class di Program body */
function collectTopBindings(ast) {
  const s = new Set();
  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id) s.add(node.id.name);
    else if (node.type === 'ClassDeclaration' && node.id) s.add(node.id.name);
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) collectPatternNames(d.id, s);
  }
  return s;
}
function collectPatternNames(idNode, s) {
  if (!idNode) return;
  if (idNode.type === 'Identifier') s.add(idNode.name);
  else if (idNode.type === 'ObjectPattern') for (const p of idNode.properties) { if (p.type === 'ObjectProperty') collectPatternNames(p.value, s); else if (p.type === 'RestElement') collectPatternNames(p.argument, s); }
  else if (idNode.type === 'ArrayPattern') for (const el of idNode.elements) el && collectPatternNames(el.type === 'RestElement' ? el.argument : el, s);
  else if (idNode.type === 'AssignmentPattern') collectPatternNames(idNode.left, s);
}

/* ---- entri + index.html ---- */
const dataFiles = files.filter(f => f.endsWith('.js'));
const appFile = files.find(f => f === 'app.jsx') || files[files.length - 1];
const sideEffectFirst = files.filter(f => f !== appFile);  // import semua utk side-effect, app terakhir
const mainSrc =
`/* [codemod] Entri tunggal — menggantikan ~${files.length} tag <script>.
   Urutan = boot order asli (untuk side-effect data & registrasi window). */
import './${css}';
${sideEffectFirst.map(f => `import './${f}';`).join('\n')}
import './${appFile}';   // memanggil ReactDOM.createRoot(...).render
`;

const indexHtml =
`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NeoSuite AMS | Audit Enterprise</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`;

/* ---------- tulis ---------- */
if (DRY) {
  log('--dry: tidak menulis berkas.');
} else {
  fs.mkdirSync(SRC_OUT, { recursive: true });
  for (const f of present) fs.writeFileSync(path.join(SRC_OUT, f), outputs[f]);
  // berkas non-parse (mis. .css) disalin apa adanya
  const cssPath = path.join(APP_DIR, css);
  if (fs.existsSync(cssPath)) fs.copyFileSync(cssPath, path.join(SRC_OUT, css));
  fs.writeFileSync(path.join(SRC_OUT, 'main.jsx'), mainSrc);
  fs.writeFileSync(path.join(HERE, 'index.html'), indexHtml);
  log(`Ditulis: src/${present.length} modul + main.jsx + ${css} + index.html`);
}

/* ---------- laporan ---------- */
log('\n──────── LAPORAN ────────');
log(`Berkas modul     : ${present.length}`);
log(`Simbol global    : ${owners.size}`);
if (collisions.length) {
  warn(`Tabrakan nama (${collisions.length}) — perlu tinjauan manual; codemod memakai pemilik pertama (load order), window fallback tetap aktif:`);
  for (const [n, fs_] of collisions) warn(`  • ${n}  ←  ${fs_.join(', ')}`);
} else log('Tabrakan nama    : tidak ada 🎉');
if (unresolved.size) {
  warn(`Global tak dikenal (${unresolved.size}) — cek apakah perlu ditambah ke peta atau ke BROWSER_GLOBALS:`);
  for (const u of [...unresolved].sort().slice(0, 60)) warn('  • ' + u);
  if (unresolved.size > 60) warn(`  … +${unresolved.size - 60} lagi`);
} else log('Global tak dikenal: tidak ada');
log('\nSelesai. Berikutnya:  npm run dev   lalu verifikasi di browser.');
log('Rollback: hapus folder migration/ — app asli tidak tersentuh.');

/* ---------- helpers ---------- */
function log(...a){ console.log(...a); }
function warn(...a){ console.warn('⚠ ', ...a); }
