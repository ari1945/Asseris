/* ============================================================
   Tahap 8 — Gerbang budget bundle di CI.
   ------------------------------------------------------------
   Dijalankan SETELAH `vite build` (npm run build). Membaca hasil
   dist/assets/, menghitung ukuran entry utama (berkas yang direferensikan
   index.html) PRE-GZIP, lalu gagal (exit 1) bila melampaui budget.
   Juga memastikan library berat (xlsx/jspdf/qrcode/html2canvas) TETAP
   chunk terpisah (dimuat on-demand), bukan tersedot ke entry.

   Budget default: entry utama ≤ 1500 KB pre-gzip (target awal Tahap 8).
   Override: BUNDLE_MAIN_KB=… (angka dalam KB).
   ============================================================ */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const assetsDir = join(dist, 'assets');

if (!existsSafe(assetsDir)) {
  console.error('dist/assets tidak ditemukan — jalankan `npm run build` dulu.');
  process.exit(1);
}

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
const mainJs = (indexHtml.match(/src="\/(assets\/[^"]+\.js)"/) || [])[1];
if (!mainJs) {
  console.error('index.html tidak mereferensikan entry JS.');
  process.exit(1);
}

const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const sizes = files.map((f) => ({ name: f, bytes: statSync(join(assetsDir, f)).size }))
  .sort((a, b) => b.bytes - a.bytes);

const main = sizes.find((s) => s.name === mainJs.split('/').pop());
const mainKB = main ? main.bytes / 1024 : 0;

// Library berat harus chunk SENDIRI (on-demand), bukan bagian entry.
// Target eksplisit Tahap 8: XLSX + PDF (jspdf/html2canvas turunannya).
// qrcode di-bundle dalam chunk `index.es-*` (build ES-nya sendiri) yang tetap
// on-demand — dilaporkan informatif, bukan gerbang keras.
const heavy = ['xlsx', 'jspdf', 'html2canvas'];
const heavySplit = heavy.filter((h) => sizes.some((s) => s.name.includes(h)));
const qrChunk = sizes.some((s) => s.name.includes('index.es'));

const budgetKB = Number(process.env.BUNDLE_MAIN_KB ?? 1500);

console.log('=== Bundle budget (Tahap 8) ===');
console.log(`Entry utama : ${main ? main.name : '?'}  ${mainKB.toFixed(0)} KB pre-gzip`);
console.log(`Budget      : ${budgetKB} KB pre-gzip`);
console.log('Chunk berat on-demand: ' + (heavySplit.length ? heavySplit.join(', ') : '(tidak terpisah!)'));
console.log('qrcode on-demand (index.es): ' + (qrChunk ? 'ya' : 'TIDAK'));
console.log('Chunk JS terbesar:');
for (const s of sizes.slice(0, 8)) console.log(`  ${s.name.padEnd(45)} ${(s.bytes / 1024).toFixed(1).padStart(8)} KB`);

let fail = false;
if (mainKB > budgetKB) {
  console.error(`✗ Entry utama ${mainKB.toFixed(0)} KB MELAMPAUI budget ${budgetKB} KB.`);
  fail = true;
} else {
  console.log(`✓ Entry utama dalam budget (${mainKB.toFixed(0)} ≤ ${budgetKB} KB).`);
}
for (const h of heavy) {
  if (!heavySplit.includes(h)) {
    console.error(`✗ ${h} tidak terpisah sebagai chunk on-demand.`);
    fail = true;
  }
}
process.exit(fail ? 1 : 0);

function existsSafe(p) {
  try { statSync(p); return true; } catch { return false; }
}
