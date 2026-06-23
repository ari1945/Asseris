/* ============================================================
   Asseris — canon part5: SA 570 going concern (rasio solvabilitas + Altman Z)
   ------------------------------------------------------------
   Sinyal kuantitatif penilaian kelangsungan usaha DITARIK PENUH dari
   Working Trial Balance (AMS.WTB / useAudit().wtb) — bukan di-hardcode.
   Satu perubahan AJE mengalir konsisten ke kartu rasio, Altman Z, dan
   verdict SA 570, selaras FS Generator & Rekonsiliasi.

   Skema kode WTB dipakai untuk agregasi:
     1-1xxx aset lancar · 1-2xxx aset tidak lancar
     2-1xxx liabilitas jk. pendek · 2-2xxx liabilitas jk. panjang
     3-xxxx ekuitas · 4-xxxx pendapatan · 5-xxxx beban
   Aset bersaldo positif; liabilitas/ekuitas/pendapatan bersaldo negatif
   (konvensi WTB), sehingga dibalik tanda saat diagregasi.

   Semua agregat dalam Rp JUTA; rasio unitless. Dihitung untuk dua periode:
   `adj` (audited tahun berjalan) & `ly` (komparatif tahun lalu).
   ============================================================ */
import type { WTB, WtbAmountField, GcAggregates, AltmanZ, GoingConcernResult } from './canon_types';
import { AMS } from './data';

const jtP5 = (n: number) => (n || 0) / 1e6; // rupiah penuh → juta

/* sumber WTB: argumen reaktif (useAudit().wtb) bila ada, jika tidak AMS.WTB statis */
function srcWtb(wtb?: WTB): WTB {
  return (wtb && wtb.length) ? wtb : (((AMS && AMS.WTB) as WTB) || []);
}

/* jumlah satu field atas baris yang kodenya memenuhi prefix */
function sumByPrefix(W: WTB, field: WtbAmountField, prefix: string): number {
  return W.reduce((s, r) => (r.code && r.code.indexOf(prefix) === 0 ? s + (r[field] ?? 0) : s), 0);
}
/* nilai satu akun by-code */
function valByCode(W: WTB, field: WtbAmountField, code: string): number {
  const r = W.find(x => x.code === code);
  return r ? (r[field] ?? 0) : 0;
}

const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

/* Altman Z asli (manufaktur publik): Z = 1.2X1 + 1.4X2 + 3.3X3 + 0.6X4 + 1.0X5.
   X4 memakai nilai buku ekuitas (proksi — kapitalisasi pasar tak ada di WTB). */
function altman(a: GcAggregates): AltmanZ {
  const x1 = safeDiv(a.workingCapital, a.totalAssets);
  const x2 = safeDiv(a.retainedEarnings, a.totalAssets);
  const x3 = safeDiv(a.ebit, a.totalAssets);
  const x4 = safeDiv(a.equity, a.totalLiab);
  const x5 = safeDiv(a.sales, a.totalAssets);
  const z = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;
  const zone: AltmanZ['zone'] = z > 2.99 ? 'safe' : z >= 1.81 ? 'grey' : 'distress';
  return { x1, x2, x3, x4, x5, z, zone };
}

/* agregat + rasio untuk satu periode (field WTB) */
function aggregate(W: WTB, field: WtbAmountField, ocf: number | null): GcAggregates {
  const currentAssets = jtP5(sumByPrefix(W, field, '1-1'));
  const nonCurrentAssets = jtP5(sumByPrefix(W, field, '1-2'));
  const currentLiab = jtP5(-sumByPrefix(W, field, '2-1'));   // liabilitas negatif → positif
  const nonCurrentLiab = jtP5(-sumByPrefix(W, field, '2-2'));
  const inventory = jtP5(valByCode(W, field, '1-1300'));
  const totalAssets = currentAssets + nonCurrentAssets;
  const totalLiab = currentLiab + nonCurrentLiab;
  const equity = jtP5(-sumByPrefix(W, field, '3-'));
  const retainedEarnings = jtP5(-valByCode(W, field, '3-2100'));
  const sales = jtP5(-valByCode(W, field, '4-1100'));
  const cogs = jtP5(valByCode(W, field, '5-1100'));
  const sell = jtP5(valByCode(W, field, '5-2100'));
  const admin = jtP5(valByCode(W, field, '5-3100'));
  const interest = jtP5(valByCode(W, field, '5-4100'));
  const tax = jtP5(valByCode(W, field, '5-5100'));
  const ebit = sales - cogs - sell - admin;                  // laba usaha sebelum bunga & pajak
  const netIncome = ebit - interest - tax;
  const workingCapital = currentAssets - currentLiab;
  return {
    currentAssets, currentLiab, inventory, totalAssets, totalLiab, equity,
    retainedEarnings, sales, ebit, interest, netIncome, workingCapital,
    currentRatio: safeDiv(currentAssets, currentLiab),
    quickRatio: safeDiv(currentAssets - inventory, currentLiab),
    der: safeDiv(totalLiab, equity),
    interestCoverage: safeDiv(ebit, interest),
    operatingCashFlow: ocf,
  };
}

/* Arus kas operasi metode tak langsung dari mutasi WTB (ly→adj), Rp juta:
   laba bersih + penyusutan/amortisasi + kenaikan CKPN (non-kas) − ΔModal kerja operasi.
   Efek-kas tiap pos modal kerja = (ly − adj): kenaikan aset = arus keluar,
   kenaikan liabilitas (saldo makin negatif) = arus masuk. Analitik murni-WTB;
   FS Generator tetap laporan arus kas otoritatif. */
function indirectOcf(W: WTB, niAdj: number): number {
  const mvt = (code: string) => jtP5(valByCode(W, 'ly', code) - valByCode(W, 'adj', code));
  const depr = mvt('1-2110');   // akumulasi penyusutan (makin negatif → +)
  const amort = mvt('1-2410');  // akumulasi amortisasi
  const eclProv = mvt('1-1210'); // kenaikan CKPN (non-kas)
  const wcCodes = ['1-1200', '1-1300', '1-1400', '1-1500', '2-1100', '2-1300', '2-1400', '2-2300'];
  const dWc = wcCodes.reduce((s, c) => s + mvt(c), 0);
  return niAdj + depr + amort + eclProv + dWc;
}

/** Sinyal going concern (rasio + Altman Z) dari WTB. `wtb` opsional:
 *  bila diberi (useAudit().wtb reaktif) → angka mengikuti AJE live. */
export function goingConcern(wtb?: WTB): GoingConcernResult {
  const W = srcWtb(wtb);
  const cyBase = aggregate(W, 'adj', null);
  const ocf = indirectOcf(W, cyBase.netIncome);
  const cy: GcAggregates = { ...cyBase, operatingCashFlow: ocf };
  const py = aggregate(W, 'ly', null); // OCF tahun lalu butuh t-2 → null
  return { cy, py, altman: altman(cy), altmanPy: altman(py) };
}

export type { GcAggregates, AltmanZ, GoingConcernResult };
