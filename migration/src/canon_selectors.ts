/* ============================================================
   Asseris — selektor kanon ber-tipe (W5)
   ------------------------------------------------------------
   Lapisan tipis & ber-tipe di atas lapisan kanon. View (JSX)
   memanggil selektor ini agar tipe WTB/Figures/Fig/Materiality
   mengalir ke modul halaman tanpa mengubah angka — nilai identik
   dengan AMS_CANON.* (sumber yang sama). Tujuan W5:
   "tipe WTB/FIG dipakai ≥3 view" dengan boundary yang type-checked.
   ============================================================ */
import { figuresFromWTB, FIG } from './canon_base';
import { materiality } from './canon_part4';
import { goingConcern } from './canon_part5';
import type { WTB, Figures, Fig, MaterialityOpts, MaterialityResult, GoingConcernResult } from './canon_types';

/* W-asersi — boundary ber-tipe untuk lapisan asersi manajemen (SA 315).
   Engine asersi sengaja TIDAK dipasang ke AMS_CANON (fingerprint regresi tetap
   utuh); view menariknya dari sini, satu sumber yang sama dengan canon_assertions. */
export {
  ASSERTIONS, assertionDef, assertionsByGroup, resolveAssertion,
  groupForAccountCode, groupForWtbGroup, relevanceFor, assertionCoverage,
  ASSERTION_RELEVANCE, ASSERTION_STATUS_META,
} from './canon_assertions';
export type {
  AssertionId, AssertionGroup, AssertionDef, AssertionStatus,
  AssertionCell, LeadAssertionCoverage, CoverageInput,
  ProcedureInput, RiskInput, EvidenceInput, AssertionConclInput,
} from './canon_assertions';

/** Figur akuntansi entitas (Rp juta) yang ditarik dari WTB. `wtb` opsional:
 *  bila diberi (mis. useAudit().wtb yang reaktif) → angka mengikuti AJE live. */
export function figures(wtb?: WTB): Figures {
  return figuresFromWTB(wtb);
}

/** Saldo akhir kanonik tiap pos (Rp juta) — figur ber-sumber WTB + fiskal. */
export function fig(): Fig {
  return FIG;
}

/** Materialitas (OM/PM/CTT) lintas-modul, identik dengan Materiality Workspace. */
export function materialityFor(opts?: MaterialityOpts): MaterialityResult {
  return materiality(opts);
}

/** Sinyal going concern SA 570 (rasio solvabilitas + Altman Z) dari WTB. `wtb`
 *  opsional: bila diberi (useAudit().wtb reaktif) → angka mengikuti AJE live. */
export function goingConcernFor(wtb?: WTB): GoingConcernResult {
  return goingConcern(wtb);
}

export type { WTB, Figures, Fig, MaterialityResult, GoingConcernResult };
