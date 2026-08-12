/* ============================================================
   Asseris — Gerbang sign-off estimasi ber-pakar (SA 620 · SA 500 ¶8)
   ------------------------------------------------------------
   Estimasi yang jalur responsnya "Gunakan pakar (SA 620)" bersandar
   SEPENUHNYA pada pekerjaan pihak ketiga. Menandatangani kertas kerja
   SA 540 tanpa mengevaluasi pekerjaan itu — dan tanpa dokumennya ada di
   bukti kertas kerja — berarti menyatakan kecukupan bukti yang tak pernah
   diperiksa.

   Mengikuti pola `useEthicsGate` yang sudah ada: logika MURNI di
   `canon_expert_eval.ts`, hook tipis di sini, `wp_signoff` memakainya
   sebagai `canSign` + `noAuthHint`. Penegakan di LAPISAN UI, sejajar
   dengan gerbang etik/AML (lihat catatan lingkup di ethics_gate.tsx).
   ============================================================ */
import { useAmsPersist } from './contexts';
import { amsEvidenceFor } from './evidence';
import { EST_SEED, type Estimate, type EstState } from './canon_estimates';
import { expertGateBlockers, type ExpertEvalState, type ExpertGateBlocker } from './canon_expert_eval';

export interface EstimateExpertGate {
  blocked: boolean;
  blockers: ExpertGateBlocker[];
  /** ringkas untuk hint tombol sign-off */
  hint?: string;
}

/** uid dokumen yang BENAR-BENAR terlampir pada modul kertas kerja SA 540. */
function evidenceUidsFor(moduleId: string): string[] {
  try {
    const list = amsEvidenceFor(moduleId) as Array<{ uid?: string }> | undefined;
    return (list || []).map(d => d && d.uid).filter((u): u is string => !!u);
  } catch (e) { return []; }
}

export function useEstimateExpertGate(moduleId: string): EstimateExpertGate {
  const [est] = useAmsPersist('estimates.v1', () => EST_SEED);
  const [expertEval] = useAmsPersist('expertEval.v1', () => ({} as ExpertEvalState));
  /* gerbang ini hanya relevan bagi kertas kerja estimasi */
  if (moduleId !== 'sa540') return { blocked: false, blockers: [] };
  const register: Estimate[] = (est && (est as EstState).register) || [];
  const blockers = expertGateBlockers(register, expertEval as ExpertEvalState, evidenceUidsFor(moduleId));
  if (!blockers.length) return { blocked: false, blockers };
  const names = blockers.map(b => b.id).join(', ');
  return {
    blocked: true,
    blockers,
    hint: `evaluasi pekerjaan pakar belum lengkap (${names})`,
  };
}
