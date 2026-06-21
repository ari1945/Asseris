/* ============================================================
   Asseris — Tax Audit Diagnostic engine (P4 · SSOT)
   ------------------------------------------------------------
   Mesin diagnostik DETERMINISTIK (aturan + statistik) di atas
   AMS_CANON / AMS_FORENSIC. BUKAN LLM — semua temuan dihitung dari
   data kanonik, ber-rujukan standar (SA/PSAK), dan menyertakan saran
   prosedur. Lapisan narasi LLM (opsional) dapat ditambah belakangan
   tanpa mengubah mesin (lihat PRD P4 §5/§10).

   Detektor:
     · benford()        — uji Benford 1-digit (SA 240 ¶32 · FR-04) [greenfield]
     · bookTaxFlags()   — red-flag fiskal/book-tax dari FIG (PSAK 46) [greenfield, tax]
     · adaptor sinтеsis — JET (SA 240), eksposur RPT (SA 550), breach
                          rekonsiliasi (reconcile), tanpa hardcode angka.

   Semua nilai moneter dari canon dalam Rupiah JUTA kecuali JOURNAL_POP
   (Rupiah penuh). Temuan = USULAN; auditor memutuskan (audit trail di UI).
   ============================================================ */
import { AMS_FORENSIC } from './forensic_canon';
import { FIG, RATE } from './canon_base';
import { reconcile } from './canon_part3';
import type { Fig } from './canon_types';

export type DiagSev = 'high' | 'med' | 'low';

export const DIAG_SEV: Record<DiagSev, { rank: number; tone: string; label: string }> = {
  high: { rank: 3, tone: 'red', label: 'Tinggi' },
  med: { rank: 2, tone: 'amber', label: 'Sedang' },
  low: { rank: 1, tone: 'blue', label: 'Rendah' },
};

export interface DiagFinding {
  id: string;
  detector: string;
  sev: DiagSev;
  std: string;
  title: string;
  detail: string;
  modules: string[];
  drillView?: string;
  suggestedProcedure?: string;
}

interface DiagJournal {
  id?: string; amount: number; flags?: string[]; forensic?: string[];
  rpId?: string; dir?: string; cash?: boolean; party?: string;
}
interface DiagAje { id?: string; amount?: number; status?: string; desc?: string }
interface DiagReconRow { id?: string; pos?: string; variance?: number; status?: string; ref?: string }

export interface DiagCtx {
  journalPop?: DiagJournal[];
  aje?: DiagAje[];
  fig?: Partial<Fig>;
  reconcileRows?: DiagReconRow[];
  /** temuan eksternal (mis. amsCrossChecks dari lapisan view) untuk digabung */
  extraFindings?: DiagFinding[];
}

/* —— util —— */
const rpJt = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID') + ' jt';
const rpFull = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return 'Rp ' + (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
  return 'Rp ' + Math.round(n / 1e6).toLocaleString('id-ID') + ' jt';
};
const pct1 = (x: number) => (x * 100).toFixed(1) + '%';

/* digit-awal signifikan (1..9); 0 = tidak valid (nol/non-finite) */
function leadingDigit(x: number): number {
  const a = Math.abs(x);
  if (!isFinite(a) || a < 1e-12) return 0;
  const d = parseInt(a.toExponential()[0], 10);
  return d >= 1 && d <= 9 ? d : 0;
}

/* ============================================================
   benford(amounts) — distribusi digit-awal vs hukum Benford.
   Ambang MAD (Nigrini, proporsi): <0.006 close · <0.012 acceptable ·
   <0.015 marginal · ≥0.015 nonconforming. Sampel <30 → 'insufficient'.
   ============================================================ */
export type BenfordConformity = 'close' | 'acceptable' | 'marginal' | 'nonconforming' | 'insufficient';

export interface BenfordResult {
  n: number;
  counts: number[];        // index 0..8 → digit 1..9
  observedPct: number[];   // %
  expectedPct: number[];   // %
  mad: number;             // mean absolute deviation (proporsi)
  conformity: BenfordConformity;
  topDeviation: { digit: number; observed: number; expected: number; diff: number } | null;
}

const BENFORD_MIN = 30;

export function benford(amounts: number[]): BenfordResult {
  const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let n = 0;
  for (const x of amounts) {
    const d = leadingDigit(x);
    if (d >= 1 && d <= 9) { counts[d - 1]++; n++; }
  }
  const expectedPct = Array.from({ length: 9 }, (_v, i) => Math.log10(1 + 1 / (i + 1)) * 100);
  const observedPct = counts.map(c => (n ? (c / n) * 100 : 0));
  if (n < BENFORD_MIN) {
    return { n, counts, observedPct, expectedPct, mad: 0, conformity: 'insufficient', topDeviation: null };
  }
  let madSum = 0;
  for (let i = 0; i < 9; i++) madSum += Math.abs(observedPct[i] / 100 - expectedPct[i] / 100);
  const mad = madSum / 9;
  const conformity: BenfordConformity = mad < 0.006 ? 'close' : mad < 0.012 ? 'acceptable' : mad < 0.015 ? 'marginal' : 'nonconforming';
  let top: BenfordResult['topDeviation'] = null;
  let best = -1;
  for (let i = 0; i < 9; i++) {
    const diff = Math.abs(observedPct[i] - expectedPct[i]);
    if (diff > best) { best = diff; top = { digit: i + 1, observed: observedPct[i], expected: expectedPct[i], diff: observedPct[i] - expectedPct[i] }; }
  }
  return { n, counts, observedPct, expectedPct, mad, conformity, topDeviation: top };
}

/* ============================================================
   bookTaxFlags(fig, rate) — red-flag fiskal / book-tax (PSAK 46).
   Fungsi murni atas FIG (Rp juta). Menghasilkan DiagFinding[].
   ============================================================ */
type BookTaxFig = Pick<Fig, 'pbt' | 'pkp' | 'permAdd' | 'permLess' | 'taxExpBooked' | 'dtaReported' | 'taxLoss'>;

export function bookTaxFlags(fig: Partial<BookTaxFig>, rate = RATE): DiagFinding[] {
  const out: DiagFinding[] = [];
  const pbt = fig.pbt || 0;
  const permAdd = fig.permAdd || 0;
  const permLess = fig.permLess || 0;
  const taxExp = fig.taxExpBooked || 0;
  const dta = fig.dtaReported || 0;
  const taxLoss = fig.taxLoss || 0;

  /* 1) Beda permanen besar relatif terhadap laba sebelum pajak */
  const permTotal = permAdd + permLess;
  if (pbt > 0 && permTotal / pbt > 0.08) {
    out.push({
      id: 'bt-perm', detector: 'bookTax', sev: 'med', std: 'PSAK 46 · UU HPP',
      title: 'Beda permanen signifikan pada rekonsiliasi fiskal',
      detail: `Beda permanen total ${rpJt(permTotal)} (tak dapat dikurangkan ${rpJt(permAdd)} + penghasilan final/dikecualikan ${rpJt(permLess)}) = ${pct1(permTotal / pbt)} dari laba sebelum pajak ${rpJt(pbt)}. Verifikasi klasifikasi & dukungan tiap pos beda permanen.`,
      modules: ['psak46'], drillView: 'psak46',
      suggestedProcedure: 'Telaah daftar beda permanen ke bukti (PPh final, beban nondeductible Ps. 9 UU PPh); pastikan tak ada beda temporer yang salah diklasifikasi sebagai permanen.',
    });
  }

  /* 2) Tarif pajak efektif menyimpang dari tarif statuter */
  if (pbt > 0 && taxExp > 0) {
    const etr = taxExp / pbt;
    if (Math.abs(etr - rate) > 0.03) {
      out.push({
        id: 'bt-etr', detector: 'bookTax', sev: 'med', std: 'PSAK 46 ¶81 · SA 540',
        title: 'Tarif pajak efektif menyimpang dari tarif statuter',
        detail: `ETR ${pct1(etr)} (beban pajak ${rpJt(taxExp)} / laba sebelum pajak ${rpJt(pbt)}) vs tarif statuter ${pct1(rate)} — selisih ${pct1(Math.abs(etr - rate))}. Rekonsiliasi tarif efektif (PSAK 46 ¶81) perlu menjelaskan penyebabnya.`,
        modules: ['psak46'], drillView: 'psak46',
        suggestedProcedure: 'Susun/telaah rekonsiliasi tarif efektif; kaitkan selisih ke beda permanen, aset pajak tangguhan tak diakui, atau koreksi tahun lalu.',
      });
    }
  }

  /* 3) Pemulihan aset pajak tangguhan termasuk rugi fiskal */
  if (dta > 0 && taxLoss > 0) {
    out.push({
      id: 'bt-dta', detector: 'bookTax', sev: 'med', std: 'PSAK 46 ¶34 · SA 540',
      title: 'Pemulihan aset pajak tangguhan perlu bukti laba masa depan',
      detail: `Aset pajak tangguhan dilaporkan ${rpJt(dta)} termasuk kompensasi rugi fiskal ${rpJt(taxLoss)}. PSAK 46 ¶34 mensyaratkan bukti meyakinkan adanya laba kena pajak masa depan yang memadai sebelum DTA atas rugi fiskal diakui.`,
      modules: ['psak46'], drillView: 'psak46',
      suggestedProcedure: 'Uji proyeksi laba kena pajak (asumsi & horizon), periode kedaluwarsa kompensasi rugi (5 tahun), dan konsistensi dengan asumsi going concern.',
    });
  }

  return out;
}

/* ============================================================
   amsDiagnostics(ctx) — orkestrator. Jalankan semua detektor &
   adaptor, gabung extraFindings, urutkan severity. Murni bila ctx
   lengkap; selain itu menarik default dari canon/forensic (SSOT).
   ============================================================ */
function safeReconcileRows(): DiagReconRow[] {
  try {
    const r = reconcile() as { accounting?: DiagReconRow[] };
    return Array.isArray(r.accounting) ? r.accounting : [];
  } catch (e) { return []; }
}

export function amsDiagnostics(ctx?: DiagCtx): DiagFinding[] {
  const c = ctx || {};
  const pop: DiagJournal[] = c.journalPop || (AMS_FORENSIC && AMS_FORENSIC.JOURNAL_POP) || [];
  const aje: DiagAje[] = c.aje || [];
  const fig = c.fig || FIG;
  const reconRows: DiagReconRow[] = c.reconcileRows || safeReconcileRows();
  const out: DiagFinding[] = [];

  /* —— Benford atas amount jurnal + AJE —— */
  const amounts = pop.map(j => j.amount).concat(aje.map(a => a.amount || 0)).filter(x => x > 0);
  const bf = benford(amounts);
  if (bf.conformity === 'nonconforming' || bf.conformity === 'marginal') {
    const dev = bf.topDeviation;
    out.push({
      id: 'benford', detector: 'benford', sev: bf.conformity === 'nonconforming' ? 'high' : 'med', std: 'SA 240 ¶32',
      title: 'Distribusi digit-awal menyimpang dari hukum Benford',
      detail: `Uji Benford 1-digit atas ${bf.n} nilai: MAD ${bf.mad.toFixed(4)} (${bf.conformity}).` +
        (dev ? ` Deviasi terbesar pada digit ${dev.digit}: teramati ${dev.observed.toFixed(1)}% vs harapan ${dev.expected.toFixed(1)}%.` : ''),
      modules: ['jet', 'forensic'], drillView: 'jet',
      suggestedProcedure: 'Stratifikasi entri pada digit-awal yang anomali; uji manual jurnal & pembayaran terkait (SA 240 ¶32) untuk indikasi fabrikasi/ambang otorisasi.',
    });
  } else if (bf.conformity === 'insufficient') {
    out.push({
      id: 'benford-insufficient', detector: 'benford', sev: 'low', std: 'SA 240 ¶32',
      title: 'Populasi terlalu kecil untuk uji Benford',
      detail: `Hanya ${bf.n} nilai valid (< ${BENFORD_MIN}). Uji Benford tidak konklusif pada populasi sekecil ini — perluas populasi (mis. seluruh jurnal manual / pembayaran) sebelum menyimpulkan.`,
      modules: ['jet'], drillView: 'jet',
      suggestedProcedure: 'Tarik populasi jurnal/pembayaran penuh dari GL untuk uji Benford yang bermakna.',
    });
  }

  /* —— book-tax / fiskal —— */
  out.push(...bookTaxFlags(fig));

  /* —— JET: konsentrasi jurnal manual berisiko (SA 240 ¶32) —— */
  const highRisk = pop.filter(j => (j.flags || []).length >= 3);
  if (highRisk.length) {
    const amt = highRisk.reduce((s, j) => s + (j.amount || 0), 0);
    out.push({
      id: 'jet-concentration', detector: 'jet', sev: 'high', std: 'SA 240 ¶32',
      title: `${highRisk.length} jurnal manual memenuhi ≥3 kriteria risiko fraud`,
      detail: `${highRisk.length} entri (total ${rpFull(amt)}) memenuhi ≥3 kriteria SA 240 ¶32 (mis. ${highRisk.slice(0, 3).map(j => j.id).filter(Boolean).join(', ')}). Konsentrasi flag pada jurnal manual = indikasi override manajemen.`,
      modules: ['jet'], drillView: 'jet',
      suggestedProcedure: 'Telaah dukungan & otorisasi tiap entri berisiko tinggi; kaitkan ke simpulan risiko override manajemen dan, bila perlu, perluas pengujian.',
    });
  }

  /* —— eksposur pihak berelasi pada arus kas keluar anomali (SA 550 / PSAK 7) —— */
  const rptOut = pop.filter(j => j.rpId && j.dir === 'out' && (j.forensic || []).length > 0);
  if (rptOut.length) {
    const exp = rptOut.reduce((s, j) => s + (j.amount || 0), 0);
    out.push({
      id: 'rpt-exposure', detector: 'forensic', sev: 'high', std: 'SA 550 · PSAK 7',
      title: 'Eksposur pihak berelasi pada arus kas keluar anomali',
      detail: `${rptOut.length} pembayaran ke pihak berelasi ber-flag forensik, total ${rpFull(exp)} (mis. ${rptOut.map(j => j.party).filter(Boolean).slice(0, 2).join(', ')}). Periksa pengungkapan & kewajaran harga (arm's length).`,
      modules: ['forensic', 'related'], drillView: 'forensic',
      suggestedProcedure: 'Konfirmasi hubungan & syarat transaksi pihak berelasi; uji kewajaran harga dan kelengkapan pengungkapan (PSAK 7 / SA 550).',
    });
  }

  /* —— breach rekonsiliasi lintas-modul (reconcile) —— */
  reconRows.filter(r => r.status && r.status !== 'ok').forEach(r => {
    out.push({
      id: 'recon-' + (r.id || r.pos || 'x'), detector: 'reconcile', sev: r.status === 'err' ? 'high' : 'med',
      std: r.ref || 'SA 500',
      title: `Selisih rekonsiliasi: ${r.pos || r.id}`,
      detail: `Varians ${rpJt(r.variance || 0)} (${r.status}) antar-modul untuk ${r.pos || r.id}. Angka konsumen belum sepenuhnya tie-out ke sumber.`,
      modules: ['dataflow', String(r.id || '')], drillView: 'dataflow',
      suggestedProcedure: 'Telusuri sumber selisih ke kertas kerja; selaraskan angka konsumen ke satu sumber kebenaran sebelum simpulan.',
    });
  });

  /* —— gabung temuan eksternal (mis. amsCrossChecks) —— */
  if (c.extraFindings) out.push(...c.extraFindings);

  return out.sort((a, b) => DIAG_SEV[b.sev].rank - DIAG_SEV[a.sev].rank);
}

/* dual-publish: window + ESM (konsisten lapisan canon/forensic) */
declare global {
  interface Window { AMS_DIAG?: Record<string, unknown> }
}
window.AMS_DIAG = { DIAG_SEV, benford, bookTaxFlags, amsDiagnostics };

export const AMS_DIAG = window.AMS_DIAG;
