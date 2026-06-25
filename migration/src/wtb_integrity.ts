/* ============================================================
   Asseris — W-WTB·2 · Gerbang integritas Working Trial Balance
   ------------------------------------------------------------
   Fungsi MURNI (tanpa efek samping, tanpa `any`) yang menilai integritas
   neraca saldo kerja & rekonsiliasinya dengan register AJE. Mengganti chip
   "Balanced" kosmetik dengan verdikt nyata.

   Tiga lapis (sesuai keputusan W-WTB·2):
   1. FOOTING (Σ adj semua akun) — INFORMASIONAL & sadar-laba: TB pra-tutup
      yang benar ber-Σ 0; bila Σ = −laba berjalan, itu NORMAL (laba belum
      ditutup ke saldo laba) → dijelaskan, bukan error.
   2. REKONSILIASI NERACA (aset = liabilitas + ekuitas) — DITEGAKKAN; selisih
      ≈ laba berjalan juga dianggap wajar (TB pra-tutup).
   3. REKONSILIASI AJE (Σ aje kolom WTB = 0 & tie ke proyeksi register) —
      DITEGAKKAN; ketidakcocokan ditampilkan per-akun.

   Status GRADUATED ('ok' | 'attention') — TIDAK pernah memblok keras.
   ============================================================ */

export interface IntegrityAjeLine { code: string; debit?: number; credit?: number; }
export interface IntegrityAjeEntry { id?: string; amount?: number; status?: string; dr?: string; cr?: string; lines?: IntegrityAjeLine[]; }
export interface IntegrityWtbRow { code: string; group?: string; unadj?: number; aje?: number; adj?: number; }

export interface IntegrityMessage { level: 'ok' | 'warn' | 'info'; text: string; }
export interface AjeMismatch { code: string; wtb: number; register: number; diff: number; }
export interface AdjMismatch { code: string; expected: number; actual: number; }

export interface WtbIntegrityResult {
  /* footing — informasional */
  sumAdj: number;
  sumUnadj: number;
  footed: boolean;                 // |Σ adj| ≤ tol
  netIncome: number;               // laba berjalan (Rp penuh)
  footingExplainedByIncome: boolean; // Σ adj ≈ −laba (pra-tutup, normal)
  /* rekonsiliasi neraca — gerbang */
  assets: number;
  liabilities: number;
  equity: number;
  bsDiff: number;                  // aset − (liab + ekuitas)
  bsTied: boolean;                 // |bsDiff| ≤ tol ATAU ≈ laba berjalan
  bsExplainedByIncome: boolean;    // |bsDiff − laba| ≤ tol
  /* adj = unadj + aje — gerbang */
  adjConsistent: boolean;
  adjMismatches: AdjMismatch[];
  /* rekonsiliasi AJE vs register — gerbang */
  wtbAjeSum: number;
  ajeBalanced: boolean;            // |Σ aje kolom| ≤ tol
  registerReconciled: boolean;     // kolom aje ≡ proyeksi register (per akun)
  ajeMismatches: AjeMismatch[];
  /* ringkasan graduated */
  status: 'ok' | 'attention';
  messages: IntegrityMessage[];
  tol: number;
}

/* Proyeksi register AJE → delta per akun (Dr +, Cr −). Mendukung dua bentuk:
   terstruktur (`lines:[{code,debit,credit}]`) atau ringkas (`dr`/`cr` + `amount`). */
export function ajeRegisterByAccount(aje: IntegrityAjeEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  const add = (code: string, v: number) => { if (code) m.set(code, (m.get(code) || 0) + v); };
  for (const a of aje) {
    if (Array.isArray(a.lines) && a.lines.length) {
      for (const ln of a.lines) add(ln.code, (ln.debit || 0) - (ln.credit || 0));
    } else if (a.dr && a.cr && a.amount != null) {
      add(a.dr.split(/\s+/)[0], a.amount);
      add(a.cr.split(/\s+/)[0], -a.amount);
    }
  }
  return m;
}

const num = (v: number | undefined) => (v == null ? 0 : v);
const lead = (code: string) => (code || '').replace(/\s/g, '').charAt(0);

export interface IntegrityOptions { tolerancePct?: number; toleranceFloor?: number; }

export function checkWtbIntegrity(
  rows: IntegrityWtbRow[],
  aje: IntegrityAjeEntry[] = [],
  opts: IntegrityOptions = {},
): WtbIntegrityResult {
  const tolerancePct = opts.tolerancePct != null ? opts.tolerancePct : 0.0001; // 0,01%
  const toleranceFloor = opts.toleranceFloor != null ? opts.toleranceFloor : 1000;

  let assets = 0, liabilities = 0, equity = 0, revMag = 0, expenses = 0;
  let sumAdj = 0, sumUnadj = 0, wtbAjeSum = 0;
  const adjMismatches: AdjMismatch[] = [];
  const wtbAjeByAccount = new Map<string, number>();

  for (const r of rows) {
    const unadj = num(r.unadj), ajeV = num(r.aje);
    const adj = r.adj != null ? r.adj : unadj + ajeV;
    sumAdj += adj; sumUnadj += unadj; wtbAjeSum += ajeV;
    wtbAjeByAccount.set(r.code, (wtbAjeByAccount.get(r.code) || 0) + ajeV);
    const expected = unadj + ajeV;
    if (Math.abs(adj - expected) > 0.5) adjMismatches.push({ code: r.code, expected, actual: adj });
    const k = lead(r.code);
    if (k === '1') assets += adj;
    else if (k === '2') liabilities += -adj;
    else if (k === '3') equity += -adj;
    else if (k === '4') revMag += -adj;
    else if (k === '5' || k === '6') expenses += adj;
  }

  const netIncome = revMag - expenses;
  const tol = Math.max(toleranceFloor, Math.abs(assets) * tolerancePct);

  const footed = Math.abs(sumAdj) <= tol;
  const footingExplainedByIncome = Math.abs(sumAdj + netIncome) <= tol;

  const bsDiff = assets - (liabilities + equity);
  const bsExplainedByIncome = Math.abs(bsDiff - netIncome) <= tol;
  const bsTied = Math.abs(bsDiff) <= tol || bsExplainedByIncome;

  const adjConsistent = adjMismatches.length === 0;

  const ajeBalanced = Math.abs(wtbAjeSum) <= tol;
  const reg = ajeRegisterByAccount(aje);
  const ajeMismatches: AjeMismatch[] = [];
  const codes = new Set<string>([...wtbAjeByAccount.keys(), ...reg.keys()]);
  for (const code of codes) {
    const w = wtbAjeByAccount.get(code) || 0;
    const rg = reg.get(code) || 0;
    if (Math.abs(w - rg) > tol) ajeMismatches.push({ code, wtb: w, register: rg, diff: w - rg });
  }
  ajeMismatches.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const registerReconciled = ajeMismatches.length === 0;

  const messages: IntegrityMessage[] = [];
  // footing (info)
  if (footed) messages.push({ level: 'ok', text: 'Neraca saldo ter-foot (debit = kredit, Σ adjusted = 0).' });
  else if (footingExplainedByIncome) messages.push({ level: 'info', text: 'Σ adjusted ≠ 0 sebesar laba berjalan — normal untuk TB pra-tutup (laba belum ditutup ke saldo laba).' });
  else messages.push({ level: 'warn', text: 'Σ adjusted tidak nol dan tak setara laba berjalan — kemungkinan akun hilang atau salah tanda.' });
  // neraca (gate)
  if (Math.abs(bsDiff) <= tol) messages.push({ level: 'ok', text: 'Neraca seimbang — aset = liabilitas + ekuitas.' });
  else if (bsExplainedByIncome) messages.push({ level: 'info', text: 'Selisih neraca ≈ laba berjalan (wajar untuk TB pra-tutup; ditutup ke ekuitas pada penyajian LK).' });
  else messages.push({ level: 'warn', text: 'Neraca tidak seimbang — periksa pemetaan/akun.' });
  // adj consistency (gate)
  if (!adjConsistent) messages.push({ level: 'warn', text: `${adjMismatches.length} akun: adjusted ≠ unadjusted + AJE.` });
  // aje recon (gate)
  if (!ajeBalanced) messages.push({ level: 'warn', text: `Kolom AJE belum seimbang (Σ = ${fmtRp(wtbAjeSum)}) — jurnal penyesuaian tampaknya tak berpasangan penuh di WTB.` });
  if (!registerReconciled) messages.push({ level: 'warn', text: `${ajeMismatches.length} akun: kolom AJE WTB tak selaras dengan register AJE.` });
  if (ajeBalanced && registerReconciled) messages.push({ level: 'ok', text: 'AJE tersinkron dengan register (seimbang & tie per akun).' });

  const gatesPass = bsTied && adjConsistent && ajeBalanced && registerReconciled;
  const status: 'ok' | 'attention' = gatesPass ? 'ok' : 'attention';

  return {
    sumAdj, sumUnadj, footed, netIncome, footingExplainedByIncome,
    assets, liabilities, equity, bsDiff, bsTied, bsExplainedByIncome,
    adjConsistent, adjMismatches,
    wtbAjeSum, ajeBalanced, registerReconciled, ajeMismatches,
    status, messages, tol,
  };
}

function fmtRp(n: number): string {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '(' : 'Rp ') + s + (neg ? ')' : '');
}
