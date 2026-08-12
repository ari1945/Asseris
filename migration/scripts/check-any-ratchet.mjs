/* ============================================================
   R-4 — Gerbang RATCHET `:any`. Satu arah: turun boleh, naik tidak.
   ------------------------------------------------------------
   `eslint-suppressions.json` mencatat berapa banyak `@typescript-eslint/no-explicit-any`
   yang di-grandfather per berkas. W15 menyebutnya "ratchet", tetapi ratchet itu tak
   pernah punya GERBANG: berkas itu hanyalah data, dan `eslint --suppress-rule` dengan
   senang hati MENAIKKAN angkanya. Maka pada 2026-08-12 total naik diam-diam 8.155 →
   8.175 (+20) di dalam satu commit checkpoint, tanpa satu pun cek yang berbunyi.

   Skrip ini memberi ratchet-nya gigi: total suppression tidak boleh melampaui langit-langit
   yang tercatat di bawah. Menurunkan langit-langit = perbaikan yang disambut (skrip
   memberitahu angka barunya). Menaikkannya = keputusan sadar yang harus diedit di sini,
   di dalam PR, dengan alasannya — bukan efek samping `lint:any-baseline`.

   Jalankan: node scripts/check-any-ratchet.mjs   (dipanggil `npm run verify` + CI)
   ============================================================ */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* LANGIT-LANGIT. Turunkan bebas; menaikkan butuh alasan tertulis di baris ini.
   8175 = keadaan master sesudah commit checkpoint 18d6e69 (naik +20 dari 8155 tanpa
   gerbang). 8174 = sesudah R-1/R-2 memangkas satu di contexts.tsx.
   UTANG TERCATAT: 19 di atas baseline pra-checkpoint (8155). Penurunannya bukan bagian
   Fase R — yang penting sekarang adalah angka ini berhenti naik diam-diam. */
const CEILING = 8174;
const PRE_CHECKPOINT_BASELINE = 8155;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'eslint-suppressions.json');

let json;
try {
  json = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`check-any-ratchet: tidak dapat membaca ${file} — ${err.message}`);
  process.exit(1);
}

let total = 0;
const perFile = [];
for (const [path, rules] of Object.entries(json)) {
  const count = Object.values(rules).reduce((n, r) => n + (r?.count ?? 0), 0);
  total += count;
  perFile.push([path, count]);
}

if (total > CEILING) {
  perFile.sort((a, b) => b[1] - a[1]);
  console.error(`check-any-ratchet: GAGAL — ${total} suppression \`:any\`, langit-langit ${CEILING} (+${total - CEILING}).`);
  console.error('Ratchet hanya boleh turun. Hilangkan `any` yang baru, atau — bila penambahannya');
  console.error('memang disengaja — naikkan CEILING di scripts/check-any-ratchet.mjs BESERTA alasannya.');
  console.error('\nBerkas dengan suppression terbanyak:');
  for (const [path, count] of perFile.slice(0, 10)) console.error(`  ${String(count).padStart(4)}  ${path}`);
  process.exit(1);
}

const debt = total - PRE_CHECKPOINT_BASELINE;
console.log(`check-any-ratchet: OK — ${total} suppression \`:any\` (langit-langit ${CEILING}).`);
if (total < CEILING) {
  console.log(`  ${CEILING - total} di bawah langit-langit — turunkan CEILING ke ${total} untuk mengunci kemajuan ini.`);
}
if (debt > 0) {
  console.log(`  Catatan: masih ${debt} di atas baseline pra-checkpoint (${PRE_CHECKPOINT_BASELINE}).`);
}
