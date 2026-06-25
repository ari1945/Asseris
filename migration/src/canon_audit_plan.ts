/* ============================================================
   Asseris — Rencana Audit (SA 300/330): Pemetaan Risiko → Respons
   → Prosedur sebagai SUMBER KEBENARAN TUNGGAL.
   ------------------------------------------------------------
   Logika "pendekatan terencana per risiko" (smDefaultApproach +
   SM_APPROACHES) semula tertanam inline di view_misc1.tsx
   (Strategy Memo, tab Pendekatan per Area). Diangkat ke sini agar:
     1. View mengonsumsi SATU model pendekatan — tak ada duplikasi.
     2. Strategi dapat MEREKONSILIASI tiap RoMM (SA 315) terhadap
        respons audit (SA 330): apakah respons MEMADAI untuk tingkat
        risiko (SA 330.18/.21 — risiko signifikan & kecurangan wajib
        prosedur substantif diperluas/spesifik), apakah tertaut ke
        prosedur & kertas kerja, dan apakah KK itu sedang dieksekusi.
        Setiap celah (under-response / tak-tertaut / KK belum mulai)
        diangkat sebagai gap kelengkapan rencana.
   Murni & deterministik; tanpa React/efek-samping. Status KK
   diinjeksi pemanggil (view menghitung via deriveWpStatus) agar
   modul ini tak menyentuh global — meniru reconcileGovernanceComms.
   ============================================================ */

export type ApproachId = 'sub' | 'ctrl' | 'ext';

export interface ApproachDef {
  id: ApproachId;
  short: string;
  label: string;
  color: string;
}

/* Opsi pendekatan audit (urut = intensitas naik). Diangkat 1:1 dari view_misc1. */
export const APPROACHES: ApproachDef[] = [
  { id: 'sub',  short: 'Substantif',           label: 'Prosedur substantif',                color: 'var(--blue)' },
  { id: 'ctrl', short: 'Pengendalian + Sub.',  label: 'Andalkan pengendalian + substantif', color: 'var(--teal)' },
  { id: 'ext',  short: 'Substantif Diperluas', label: 'Substantif diperluas (risiko sig.)', color: 'var(--red)' },
];

/* peringkat intensitas: sub < ctrl < ext */
export const APPROACH_RANK: Record<ApproachId, number> = { sub: 0, ctrl: 1, ext: 2 };

/* status KK (lead schedule) yang dianggap "sedang/selesai dikerjakan". */
export const READY_WP_STATUS: string[] = ['In Progress', 'In Review', 'Reviewed'];

export interface RiskInput {
  id: string;
  area: string;
  assertion: string;
  inherent: string;        // 'Low' | 'Moderate' | 'Significant'
  fraud: boolean;
  likelihood: number;
  impact: number;
  response?: string;
  wp?: string;
  proc?: string;
  owner?: string;
  desc?: string;
}

/** Pendekatan DEFAULT yang disarankan untuk sebuah risiko (perilaku lama view). */
export function defaultApproach(r: RiskInput): ApproachId {
  return r.inherent === 'Significant' ? 'ext' : (r.likelihood * r.impact >= 9 ? 'ctrl' : 'sub');
}

/** Pendekatan MINIMUM yang memadai (SA 330): signifikan/kecurangan → ext; L×I≥9 → ctrl; selain itu sub. */
export function adequateApproach(r: RiskInput): ApproachId {
  if (r.inherent === 'Significant' || r.fraud) return 'ext';
  if (r.likelihood * r.impact >= 9) return 'ctrl';
  return 'sub';
}

export type PlanGapKind = 'under-response' | 'no-response' | 'no-proc' | 'no-wp' | 'wp-not-started';

/** Label manusiawi per jenis gap (UI). */
export const GAP_LABEL: Record<PlanGapKind, string> = {
  'under-response': 'Respons kurang memadai',
  'no-response':    'Tanpa respons terencana',
  'no-proc':        'Tak tertaut prosedur',
  'no-wp':          'Tak tertaut kertas kerja',
  'wp-not-started': 'Kertas kerja belum dimulai',
};

export interface PlanRow {
  id: string;
  area: string;
  assertion: string;
  inherent: string;
  fraud: boolean;
  score: number;            // likelihood × impact
  plan: ApproachId;         // override ∨ default
  minAdequate: ApproachId;  // pendekatan minimum memadai
  adequate: boolean;        // rank(plan) ≥ rank(minAdequate)
  hasResponse: boolean;
  hasProc: boolean;
  hasWp: boolean;
  proc: string;             // module id prosedur/standar terkait (untuk navigasi tindak lanjut)
  wpRef: string;
  wpSection: string;        // prefix sebelum '-' (lead schedule)
  wpStatus: string;         // status KK; '' / 'n/a' bila tak teridentifikasi
  wpKnown: boolean;         // status KK teridentifikasi (ada di lead schedule)
  wpReady: boolean;         // status ∈ READY_WP_STATUS
  gaps: PlanGapKind[];
}

export interface PlanRollup {
  total: number;
  significant: number;
  fraud: number;
  adequateCount: number;
  coveredCount: number;     // baris tanpa gap apa pun
  coveragePct: number;      // round(coveredCount / total × 100)
  gapRisks: number;         // baris dengan ≥1 gap
  byKind: Record<PlanGapKind, number>;
}

export interface PlanResult {
  rows: PlanRow[];
  rollup: PlanRollup;
}

const EMPTY_BY_KIND = (): Record<PlanGapKind, number> => ({
  'under-response': 0, 'no-response': 0, 'no-proc': 0, 'no-wp': 0, 'wp-not-started': 0,
});

/* ============================================================
   reconcileRiskResponse — RoMM ↔ respons audit ↔ kertas kerja.
     · plan = override ∨ default; memadai bila rank(plan) ≥ rank(min).
     · gap under-response: signifikan/kecurangan/high-LI direspons
       lebih lemah dari minimum.
     · gap no-response/no-proc/no-wp: tautan rencana tak lengkap.
     · gap wp-not-started: risiko signifikan/kecurangan menunjuk KK
       lead-schedule yang teridentifikasi tapi belum dikerjakan.
     · cakupan = % RoMM tanpa gap; roll-up per jenis.
   ============================================================ */
export function reconcileRiskResponse(input: {
  risks: RiskInput[];
  overrides?: Record<string, ApproachId>;
  wpStatusByRef?: Record<string, string>;
}): PlanResult {
  const { risks } = input;
  const overrides = input.overrides || {};
  const wpStatusByRef = input.wpStatusByRef || {};

  const rows: PlanRow[] = risks.map(r => {
    const score = r.likelihood * r.impact;
    const plan: ApproachId = overrides[r.id] || defaultApproach(r);
    const minAdequate = adequateApproach(r);
    const adequate = APPROACH_RANK[plan] >= APPROACH_RANK[minAdequate];

    const wpRef = (r.wp || '').trim();
    const wpSection = wpRef ? wpRef.split('-')[0] : '';
    const rawStatus = (wpStatusByRef[wpRef] || '').trim();
    const wpKnown = rawStatus !== '' && rawStatus !== 'n/a';
    const wpStatus = wpKnown ? rawStatus : 'n/a';
    const wpReady = wpKnown && READY_WP_STATUS.includes(rawStatus);

    const hasResponse = !!(r.response && r.response.trim());
    const hasProc = !!(r.proc && r.proc.trim());
    const hasWp = wpRef !== '';
    const critical = r.inherent === 'Significant' || r.fraud;

    const gaps: PlanGapKind[] = [];
    if (!adequate) gaps.push('under-response');
    if (!hasResponse) gaps.push('no-response');
    if (!hasProc) gaps.push('no-proc');
    if (!hasWp) gaps.push('no-wp');
    if (hasWp && wpKnown && !wpReady && critical) gaps.push('wp-not-started');

    return {
      id: r.id, area: r.area, assertion: r.assertion, inherent: r.inherent, fraud: r.fraud, score,
      plan, minAdequate, adequate,
      hasResponse, hasProc, hasWp,
      proc: (r.proc || '').trim(),
      wpRef, wpSection, wpStatus, wpKnown, wpReady,
      gaps,
    };
  });

  const byKind = EMPTY_BY_KIND();
  rows.forEach(row => row.gaps.forEach(g => { byKind[g] += 1; }));

  const total = rows.length;
  const coveredCount = rows.filter(r => r.gaps.length === 0).length;
  const rollup: PlanRollup = {
    total,
    significant: rows.filter(r => r.inherent === 'Significant').length,
    fraud: rows.filter(r => r.fraud).length,
    adequateCount: rows.filter(r => r.adequate).length,
    coveredCount,
    coveragePct: total ? Math.round((coveredCount / total) * 100) : 0,
    gapRisks: total - coveredCount,
    byKind,
  };

  return { rows, rollup };
}
