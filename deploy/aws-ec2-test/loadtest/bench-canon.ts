/* ============================================================
   Asseris — Benchmark compute kanon (headless, tanpa browser)
   ------------------------------------------------------------
   PRD: docs/prd-performance-baseline-capacity.md, Fase 4 (sumbu volume).

   `figuresFromWTB`/`reconcile`/`psak65` (migration/src/canon_part*.ts) adalah
   fungsi MURNI dari `wtb` — dijalankan identik di browser (tiap render/mount
   view) maupun di Node, TANPA memoisasi (dikonfirmasi lewat pembacaan kode:
   tak ada useMemo/cache pembungkus). Menjalankannya langsung di Node lebih
   presisi & reproducible daripada mengukur lewat DevTools browser (bebas
   noise render/paint/network) — mengukur PERSIS biaya komputasi yang
   ditanggung tiap kali view canon-berat (Materialitas/WTB Deep-Dive) di-mount.

   `materiality()` SENGAJA TIDAK diukur di sini: pembacaan kode
   (canon_part4.ts) menunjukkan fungsi ini TIDAK menerima `wtb` sebagai
   parameter — ia murni konfigurasi (localStorage + window.BENCHMARKS,
   O(1) terhadap ukuran WTB). Asumsi awal PRD bahwa `materiality()` adalah
   proxy volume-sensitif ternyata SALAH setelah dicek kode — dicatat di sini
   supaya jujur, bukan disembunyikan.

   Keterbatasan yang diakui: ini mengukur biaya KOMPUTASI murni, BUKAN waktu
   render React/paint browser (server-render exclusion sama seperti seluruh
   pengukuran headless lain di repo ini). Untuk "page-load" penuh, angka ini
   digabung dengan waktu jaringan (bench.mjs mode=volume, bootstrap fetch).

   Cara pakai (dari repo root):
     server/node_modules/.bin/tsx deploy/aws-ec2-test/loadtest/bench-canon.ts
   ============================================================ */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figuresFromWTB } from '../../../migration/src/canon_base';
import { reconcile, psak65 } from '../../../migration/src/canon_part3';
import { AMS } from '../../../migration/src/data';
import type { WTB } from '../../../migration/src/canon_types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');

const REPS = Number(process.env.CANON_BENCH_REPS ?? 200);

function loadBigWtb(): WTB {
  const raw = JSON.parse(readFileSync(join(FIXTURES, 'synthetic-wtb-group.parsed.json'), 'utf8'));
  return raw.rows as WTB;
}

function percentiles(samplesMs: number[]) {
  const s = [...samplesMs].sort((a, b) => a - b);
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99), min: s[0], max: s[s.length - 1] };
}

function bench(label: string, wtb: WTB, fn: (w: WTB) => unknown) {
  // warm-up (JIT) di luar pengukuran
  for (let i = 0; i < 5; i++) fn(wtb);
  const samples: number[] = [];
  for (let i = 0; i < REPS; i++) {
    const t0 = process.hrtime.bigint();
    fn(wtb);
    const t1 = process.hrtime.bigint();
    samples.push(Number(t1 - t0) / 1e6); // ms
  }
  const p = percentiles(samples);
  console.log(
    `${label.padEnd(28)} rows=${String(wtb.length).padStart(5)}  ` +
    `p50=${p.p50.toFixed(3)}ms  p95=${p.p95.toFixed(3)}ms  p99=${p.p99.toFixed(3)}ms  max=${p.max.toFixed(3)}ms`,
  );
  return p;
}

function main() {
  const baselineWtb = (AMS.WTB || []) as WTB;
  const bigWtb = loadBigWtb();
  console.log(`Baseline (seed existing): ${baselineWtb.length} baris`);
  console.log(`Volume besar (sintetis grup/konsolidasi): ${bigWtb.length} baris`);
  console.log(`Repetisi per fungsi: ${REPS}\n`);

  console.log('--- figuresFromWTB (agregasi ~13 figur PSAK, iterasi tunggal atas WTB) ---');
  bench('figuresFromWTB · baseline', baselineWtb, figuresFromWTB);
  bench('figuresFromWTB · besar', bigWtb, figuresFromWTB);

  console.log('\n--- reconcile (tie-out lintas-modul: figuresFromWTB + deferredTax + inventory + fixedAssets + intangibles + psak68/48/57/71) ---');
  bench('reconcile · baseline', baselineWtb, reconcile);
  bench('reconcile · besar', bigWtb, reconcile);

  console.log('\n--- psak65 (eliminasi konsolidasi grup — paling relevan utk skenario grup/konsolidasi PRD ini) ---');
  bench('psak65 · baseline', baselineWtb, psak65);
  bench('psak65 · besar', bigWtb, psak65);

  console.log('\nCatatan: materiality() TIDAK diukur — fungsi ini tidak menerima `wtb` (config-only, O(1) thd volume). Lihat komentar berkas.');
}

main();
