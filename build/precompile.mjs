/* ============================================================
   NeoSuite AMS — Pra-kompilasi (precompile.mjs)
   ------------------------------------------------------------
   Apa yang dilakukan:
     1. Membaca "NeoSuite AMS.html", mengambil SEMUA
        <script type="text/babel" src="app/*.jsx"> sesuai URUTAN.
     2. Mentranspilasi tiap .jsx -> JS biasa (HANYA JSX, preset-react,
        sourceType:"script") ke app/compiled/<nama>.js.
        Ini identik dengan yang dilakukan Babel di browser, sehingga
        scope global & urutan boot TIDAK berubah (sesuai CLAUDE.md).
     3. Menghasilkan "NeoSuite AMS (prod).html":
          - TANPA @babel/standalone (tidak ada transpilasi di browser)
          - React/ReactDOM versi PRODUCTION (lebih kecil & cepat)
          - <script src="app/compiled/x.js"> biasa (bukan text/babel)
        Urutan, data .js, dan .css dibiarkan apa adanya.

   Jalankan:  (dari folder build/)
     npm install
     npm run build         # sekali
     npm run watch         # otomatis recompile saat .jsx berubah

   Hasilnya buka "NeoSuite AMS (prod).html" — boot ~2-3 dtk.
   ============================================================ */
import { readFile, writeFile, mkdir, readdir, watch, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let transformAsync, presetReact;
try {
  ({ transformAsync } = await import('@babel/core'));
  presetReact = (await import('@babel/preset-react')).default;
} catch (e) {
  console.error('\n[!] Dependensi Babel belum terpasang.');
  console.error('    Jalankan dulu:  cd build && npm install\n');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_HTML = path.join(ROOT, 'NeoSuite AMS.html');
const OUT_HTML = path.join(ROOT, 'NeoSuite AMS (prod).html');
const COMPILED_DIR = path.join(ROOT, 'app', 'compiled');
const VENDOR_DIR = path.join(ROOT, 'app', 'vendor');

/* Berkas React yang di-self-host agar app jalan 100% offline.
   Diunduh sekali saat build (butuh internet SAAT itu saja), lalu dipakai lokal. */
const VENDOR_FILES = [
  { name: 'react.production.min.js',     url: 'https://unpkg.com/react@18.3.1/umd/react.production.min.js' },
  { name: 'react-dom.production.min.js', url: 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js' },
];

const BANNER = '/* DIBUAT OTOMATIS oleh build/precompile.mjs — JANGAN diedit tangan. Edit sumber app/*.jsx lalu jalankan ulang. */\n';

/* ---- ambil daftar <script type="text/babel" src> berurutan ---- */
async function readJsxList() {
  const html = await readFile(SRC_HTML, 'utf8');
  const re = /<script\s+type="text\/babel"\s+src="([^"]+)"><\/script>/g;
  const list = [...html.matchAll(re)].map(m => m[1]);
  return { html, list };
}

/* ---- transpilasi satu file .jsx -> string JS ---- */
async function compileOne(srcRel) {
  const abs = path.join(ROOT, srcRel);
  const code = await readFile(abs, 'utf8');
  const res = await transformAsync(code, {
    filename: abs,
    presets: [[presetReact, { runtime: 'classic' }]],
    sourceType: 'script',   // KRUSIAL: pertahankan scope skrip-global (bukan modul)
    babelrc: false,
    configFile: false,
    comments: true,
    compact: false,
    retainLines: false,
  });
  return res.code;
}

/* ---- self-host React: unduh ke app/vendor/ bila belum ada ---- */
async function fileExists(p) { try { await access(p); return true; } catch { return false; } }

async function ensureVendor() {
  await mkdir(VENDOR_DIR, { recursive: true });
  const report = [];
  for (const f of VENDOR_FILES) {
    const dest = path.join(VENDOR_DIR, f.name);
    if (await fileExists(dest)) { report.push(`  • ${f.name} (sudah ada, lewati)`); continue; }
    try {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const code = await res.text();
      if (!code || code.length < 1000) throw new Error('isi tidak wajar (' + code.length + ' byte)');
      await writeFile(dest, code, 'utf8');
      report.push(`  • ${f.name} (diunduh, ${(code.length/1024).toFixed(0)} KB)`);
    } catch (e) {
      report.push(`  ! ${f.name} GAGAL diunduh: ${e.message}`);
      throw new Error('Gagal mengunduh ' + f.name + ' — pastikan ada internet saat build PERTAMA. (' + e.message + ')');
    }
  }
  return report;
}

/* ---- bangun HTML produksi ---- */
function buildProdHtml(html, jsxList) {
  let out = html;

  // 1) React & ReactDOM -> file LOKAL (self-host) agar app jalan offline.
  out = out.replace(
    /<script src="https:\/\/unpkg\.com\/react@18\.3\.1\/umd\/react\.development\.js"[^>]*><\/script>/,
    '<script src="app/vendor/react.production.min.js" crossorigin="anonymous"></script>'
  );
  out = out.replace(
    /<script src="https:\/\/unpkg\.com\/react-dom@18\.3\.1\/umd\/react-dom\.development\.js"[^>]*><\/script>/,
    '<script src="app/vendor/react-dom.production.min.js" crossorigin="anonymous"></script>'
  );

  // 2) buang @babel/standalone (tak ada transpilasi di browser lagi)
  out = out.replace(/\n?\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"[^>]*><\/script>/, '');

  // 3) ganti tiap <script type="text/babel" src="app/x.jsx"> -> <script src="app/compiled/x.js">
  for (const src of jsxList) {
    const base = path.basename(src).replace(/\.jsx$/, '.js');
    const tag = `<script type="text/babel" src="${src}"></script>`;
    const repl = `<script src="app/compiled/${base}"></script>`;
    out = out.split(tag).join(repl);
  }

  // 4) penanda + judul
  out = out.replace('<title>', '<!-- BUILD PRODUKSI (pra-kompilasi). Sumber: NeoSuite AMS.html — JANGAN edit file ini langsung. -->\n  <title>');
  return out;
}

/* ---- proses penuh ---- */
async function runBuild() {
  const t0 = Date.now();
  const { html, list } = await readJsxList();
  await mkdir(COMPILED_DIR, { recursive: true });

  const vendorReport = await ensureVendor();

  let ok = 0; const failed = [];
  for (const src of list) {
    try {
      const js = await compileOne(src);
      const base = path.basename(src).replace(/\.jsx$/, '.js');
      await writeFile(path.join(COMPILED_DIR, base), BANNER + js, 'utf8');
      ok++;
    } catch (e) {
      failed.push(src + '  ::  ' + (e.message || e));
    }
  }

  const prod = buildProdHtml(html, list);
  await writeFile(OUT_HTML, prod, 'utf8');

  const ms = Date.now() - t0;
  console.log(`\n  NeoSuite AMS — pra-kompilasi selesai (${ms} ms)`);
  console.log(`  • ${ok}/${list.length} file JSX -> app/compiled/*.js`);
  console.log('  React self-host (app/vendor/):');
  vendorReport.forEach(r => console.log(r));
  console.log(`  • HTML produksi  -> ${path.basename(OUT_HTML)}`);
  if (failed.length) {
    console.log(`\n  [!] ${failed.length} file GAGAL dikompilasi:`);
    failed.forEach(f => console.log('      - ' + f));
    console.log('      (perbaiki sintaks di file tsb lalu jalankan ulang)');
    process.exitCode = 1;
  } else {
    console.log('  • Semua file OK. Buka "NeoSuite AMS (prod).html".\n');
  }
}

/* ---- mode watch (opsional) ---- */
async function runWatch() {
  await runBuild();
  console.log('  [watch] memantau app/*.jsx — Ctrl+C untuk berhenti.\n');
  const appDir = path.join(ROOT, 'app');
  let timer = null;
  try {
    const watcher = watch(appDir);
    for await (const ev of watcher) {
      if (ev.filename && ev.filename.endsWith('.jsx')) {
        clearTimeout(timer);
        timer = setTimeout(() => { console.log('  [watch] perubahan terdeteksi -> rebuild…'); runBuild().catch(console.error); }, 200);
      }
    }
  } catch (e) {
    console.error('  [watch] gagal:', e.message);
  }
}

if (process.argv.includes('--watch')) runWatch();
else runBuild();
