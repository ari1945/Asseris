/* ============================================================
   W12 — shim tipe sementara untuk wp_signoff.jsx (evidence + sign-off WP lintas-sektor,
   Fase 3 / P2). Di luar scope view W12 → dikonversi W13 (fondasi). Sampai itu konsumen
   .tsx (mis. view_cockpit2/view_opinion_parts/view_firm) menarik tipe longgar dari sini
   agar prop JSX (<WpCompletenessRecap/> tanpa moduleIds) tak di-infer "required".
   HAPUS file ini saat wp_signoff.jsx → .tsx (W13). Pola identik evidence.d.ts.
   ============================================================ */
type AnyComp = (props: any) => any;
export const WP_MODULE_MAP: any;
export const WP_DISPOSITIONS: any;
export const PHASE_ORDER: any;
export const wpKeyFor: any;
export const requiredEvidenceFor: any;
export const wpSignersFor: any;
export const wpCompletenessFor: any;
export const engagementGate: any;
export const useWpSignoff: any;
export const useWpEvidence: any;
export const usePhaseGate: any;
export const WpStatusBadge: AnyComp;
export const WpSignoff: AnyComp;
export const WpEvidenceLink: AnyComp;
export const WpConclusion: AnyComp;
export const WpPanel: AnyComp;
export const WpSubBarControl: AnyComp;
export const WpCompletenessRecap: AnyComp;
export const EngagementGateSummary: AnyComp;
export const PhaseGateDialog: AnyComp;
