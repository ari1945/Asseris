/* ============================================================
   Asseris — Generator WTB sintetis (grup/konsolidasi, ~5.000+ baris)
   ------------------------------------------------------------
   PRD: docs/prd-performance-baseline-capacity.md — dipakai HANYA untuk
   baseline performa lokal (WSL Docker, bukan produksi). Data 100% fiktif:
   nama entitas/pihak rekaan, angka rupiah dibangkitkan deterministik
   (bukan acak — supaya hasil generate dapat direproduksi persis).

   Cara pakai (dari repo root):
     server/node_modules/.bin/tsx deploy/aws-ec2-test/loadtest/gen-synthetic-wtb.ts

   Keluaran (ke deploy/aws-ec2-test/loadtest/fixtures/):
     - synthetic-wtb-group.csv          — TB tempel-siap (format sama drawer impor UI)
     - synthetic-wtb-group.parsed.json  — { rows, meta, coverage, importedAt, source }
       PERSIS bentuk yang dikirim WtbImportDrawer.apply() ke state.set key
       'wtbImport' (lihat migration/src/view_execution.tsx) — dipakai
       langsung sebagai payload oleh bench.mjs, tanpa reimplementasi parser.

   Desain volume: 1 blok "entitas induk" (berisi 11 kode pemicu WTB_MAP
   supaya seluruh engine PSAK menyala) + 5 blok "subsidiari" berisi detail
   sub-ledger (piutang/utang per pihak, aset tetap per unit, persediaan per
   SKU) — pola realistis penyebab WTB beribu-baris (bukan TB ringkas,
   melainkan dump GL detail). Tiap blok balance sendiri ke 0 (baris kontra
   ekuitas/RE per blok) sehingga total keseluruhan otomatis seimbang tanpa
   perlu plug tersembunyi.
   ============================================================ */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTrialBalance } from '../../../migration/src/wtb_import';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'fixtures');

/* ---------- kode pemicu WTB_MAP (canon_base.ts) — HARUS persis kode ini
   supaya 6 engine PSAK (24/71/16/19/73/46) menyala di computeCoverage() ---------- */
const MARKER_ROWS: Array<[string, string, number]> = [
  ['2-2300', 'Liabilitas Imbalan Kerja (PSAK 24)', -1_800_000_000],
  ['1-1210', 'Cadangan Kerugian Penurunan Nilai (PSAK 71)', -500_000_000],
  ['1-2100', 'Aset Tetap — Harga Perolehan (PSAK 16)', 20_000_000_000],
  ['1-2110', 'Akumulasi Penyusutan (PSAK 16)', -6_000_000_000],
  ['1-2400', 'Aset Takberwujud — Harga Perolehan (PSAK 19)', 3_000_000_000],
  ['1-2410', 'Akumulasi Amortisasi (PSAK 19)', -900_000_000],
  ['1-2300', 'Aset Hak-Guna (PSAK 73)', 2_400_000_000],
  ['2-1500', 'Liabilitas Sewa — Jk. Pendek (PSAK 73)', -600_000_000],
  ['2-2200', 'Liabilitas Sewa — Jk. Panjang (PSAK 73)', -1_500_000_000],
  ['1-2500', 'Aset Pajak Tangguhan (PSAK 46)', 1_000_000_000],
  ['5-5100', 'Beban Pajak Penghasilan', 5_500_000_000],
];

interface Row { code: string; name: string; ly: number; unadj: number; aje: number; }

/* PRNG deterministik (mulberry32) — supaya generate ulang menghasilkan file identik,
   bukan demi keamanan kriptografis. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260703);

function parentBlock(): Row[] {
  const rows: Row[] = [];
  for (const [code, name, unadj] of MARKER_ROWS) {
    rows.push({ code, name, ly: Math.round(unadj * (0.85 + rnd() * 0.3)), unadj, aje: 0 });
  }
  // pelengkap neraca induk supaya blok ini sendiri balance ke 0 (sebelum ditambah subsidiari)
  rows.push({ code: '1-1100', name: 'Kas dan Setara Kas — Induk', ly: 4_000_000_000, unadj: 4_500_000_000, aje: 0 });
  rows.push({ code: '1-1200', name: 'Piutang Usaha — Induk', ly: 6_000_000_000, unadj: 6_800_000_000, aje: 0 });
  rows.push({ code: '2-1100', name: 'Utang Usaha — Induk', ly: -3_000_000_000, unadj: -3_400_000_000, aje: 0 });
  rows.push({ code: '3-1100', name: 'Modal Saham — Induk', ly: -10_000_000_000, unadj: -10_000_000_000, aje: 0 });
  rows.push({ code: '4-1100', name: 'Penjualan Bersih — Induk', ly: -25_000_000_000, unadj: -28_000_000_000, aje: 0 });
  rows.push({ code: '5-1100', name: 'Beban Pokok Penjualan — Induk', ly: 17_000_000_000, unadj: 19_000_000_000, aje: -200_000_000 });
  const subtotal = rows.reduce((s, r) => s + r.unadj + r.aje, 0);
  rows.push({ code: '3-2100', name: 'Saldo Laba — Induk (plug penyeimbang blok)', ly: 0, unadj: -subtotal, aje: 0 });
  return rows;
}

const SUBS = [
  { id: 'SUB1', name: 'PT Konsolidasi Nusantara Cabang Jawa' },
  { id: 'SUB2', name: 'PT Konsolidasi Nusantara Cabang Sumatra' },
  { id: 'SUB3', name: 'PT Konsolidasi Nusantara Cabang Kalimantan' },
  { id: 'SUB4', name: 'PT Konsolidasi Nusantara Cabang Sulawesi' },
  { id: 'SUB5', name: 'PT Konsolidasi Nusantara Cabang Bali-Nusra' },
];

/* Parameterizable via env — dipakai untuk membangkitkan preset kedua (volume "wajar", bukan
   grup/konsolidasi terberat) untuk perikatan pendamping di skenario multi-perikatan aktif
   (Fase 3 PRD), tanpa menduplikasi skrip ini. Default = preset besar ~5.000+ baris. */
const CUSTOMERS_PER_SUB = Number(process.env.WTB_CUST ?? 350);
const VENDORS_PER_SUB = Number(process.env.WTB_VEND ?? 350);
const FIXED_ASSETS_PER_SUB = Number(process.env.WTB_FA ?? 200);
const INVENTORY_SKU_PER_SUB = Number(process.env.WTB_INV ?? 100);
const OUT_NAME = process.env.WTB_OUT_NAME ?? 'synthetic-wtb-group';
const SUB_COUNT = Number(process.env.WTB_SUBS ?? SUBS.length);
const ACTIVE_SUBS = SUBS.slice(0, SUB_COUNT);

function subsidiaryBlock(sub: { id: string; name: string }): Row[] {
  const rows: Row[] = [];
  // detail piutang per pelanggan (Aset Lancar, Dr)
  for (let i = 1; i <= CUSTOMERS_PER_SUB; i++) {
    const bal = Math.round((5_000_000 + rnd() * 95_000_000) / 10_000) * 10_000;
    rows.push({
      code: `1-1200-${sub.id}-${String(i).padStart(4, '0')}`,
      name: `Piutang — Pelanggan ${sub.id}-${i}`,
      ly: Math.round(bal * (0.8 + rnd() * 0.3)), unadj: bal, aje: 0,
    });
  }
  // detail utang per pemasok (Liabilitas Jk. Pendek, Cr)
  for (let i = 1; i <= VENDORS_PER_SUB; i++) {
    const bal = -Math.round((3_000_000 + rnd() * 60_000_000) / 10_000) * 10_000;
    rows.push({
      code: `2-1100-${sub.id}-${String(i).padStart(4, '0')}`,
      name: `Utang — Pemasok ${sub.id}-${i}`,
      ly: Math.round(bal * (0.8 + rnd() * 0.3)), unadj: bal, aje: 0,
    });
  }
  // register aset tetap per unit (Aset Tidak Lancar, Dr)
  for (let i = 1; i <= FIXED_ASSETS_PER_SUB; i++) {
    const bal = Math.round((10_000_000 + rnd() * 490_000_000) / 100_000) * 100_000;
    rows.push({
      code: `1-2100-${sub.id}-${String(i).padStart(4, '0')}`,
      name: `Aset Tetap — Unit ${sub.id}-${i}`,
      ly: Math.round(bal * (0.9 + rnd() * 0.15)), unadj: bal, aje: 0,
    });
  }
  // persediaan per SKU (Aset Lancar, Dr)
  for (let i = 1; i <= INVENTORY_SKU_PER_SUB; i++) {
    const bal = Math.round((1_000_000 + rnd() * 49_000_000) / 10_000) * 10_000;
    rows.push({
      code: `1-1300-${sub.id}-${String(i).padStart(4, '0')}`,
      name: `Persediaan — SKU ${sub.id}-${i}`,
      ly: Math.round(bal * (0.85 + rnd() * 0.25)), unadj: bal, aje: 0,
    });
  }
  // kontra ekuitas per blok — menyeimbangkan subsidiari ini persis ke 0
  const subtotal = rows.reduce((s, r) => s + r.unadj + r.aje, 0);
  rows.push({
    code: `3-2100-${sub.id}`,
    name: `Ekuitas Antar-Perusahaan — ${sub.name} (plug penyeimbang blok)`,
    ly: 0, unadj: -subtotal, aje: 0,
  });
  return rows;
}

function toCsvLine(r: Row): string {
  const fmt = (n: number) => (n < 0 ? `(${Math.abs(n).toLocaleString('id-ID')})` : n.toLocaleString('id-ID'));
  return [r.code, r.name, fmt(r.ly), fmt(r.unadj), fmt(r.aje)].join('\t');
}

function main() {
  const allRows: Row[] = [...parentBlock(), ...ACTIVE_SUBS.flatMap(subsidiaryBlock)];
  const grandTotal = allRows.reduce((s, r) => s + r.unadj + r.aje, 0);
  console.log(`Preset: ${OUT_NAME}  (${ACTIVE_SUBS.length} subsidiari × cust=${CUSTOMERS_PER_SUB}/vend=${VENDORS_PER_SUB}/fa=${FIXED_ASSETS_PER_SUB}/inv=${INVENTORY_SKU_PER_SUB})`);
  console.log(`Baris dibangkitkan: ${allRows.length}`);
  console.log(`Total adjusted (harus ~0): ${grandTotal.toLocaleString('id-ID')}`);

  const csv = ['Kode\tNama\tTA Lalu\tUnadjusted\tAJE', ...allRows.map(toCsvLine)].join('\n');
  mkdirSync(OUT_DIR, { recursive: true });
  const csvPath = join(OUT_DIR, `${OUT_NAME}.csv`);
  writeFileSync(csvPath, csv, 'utf8');
  console.log(`CSV ditulis: ${csvPath}`);

  // Validasi via parser NYATA (bukan reimplementasi) — sama fungsi yang dipakai
  // WtbImportDrawer di UI produksi.
  const parsed = parseTrialBalance(csv);
  const errors = parsed.issues.filter((i) => i.level === 'error');
  console.log(`Parser: ok=${parsed.ok}  rows=${parsed.rows.length}  balanced=${parsed.meta.balanced}  ` +
    `diff=${parsed.meta.balanceDiff.toLocaleString('id-ID')}  errors=${errors.length}  warns=${parsed.issues.length - errors.length}`);
  console.log('Cakupan engine PSAK:', parsed.coverage.engines.map((e) => `${e.lit ? '●' : '○'} ${e.label}`).join(' | '));

  if (!parsed.ok) {
    console.error('GAGAL — parser melaporkan error, lihat detail:', errors.slice(0, 10));
    process.exitCode = 1;
    return;
  }
  const litCount = parsed.coverage.engines.filter((e) => e.lit).length;
  if (litCount < parsed.coverage.engines.length) {
    console.warn(`PERINGATAN — hanya ${litCount}/${parsed.coverage.engines.length} engine menyala (cek MARKER_ROWS vs WTB_MAP).`);
  }

  // Payload PERSIS bentuk yang dikirim WtbImportDrawer.apply() → state.set key 'wtbImport'.
  const payload = {
    rows: parsed.rows, meta: parsed.meta, coverage: parsed.coverage,
    importedAt: new Date().toISOString(), source: 'paste-csv' as const,
  };
  const jsonPath = join(OUT_DIR, `${OUT_NAME}.parsed.json`);
  writeFileSync(jsonPath, JSON.stringify(payload), 'utf8');
  console.log(`Payload state.set ditulis: ${jsonPath}  (${(JSON.stringify(payload).length / 1024).toFixed(1)} KB uncompressed)`);
}

main();
