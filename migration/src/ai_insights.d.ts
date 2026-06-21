/* ============================================================
   W12 — shim tipe sementara untuk ai_insights.jsx (panel AI Tier-2 lintas-sektor,
   Fase 3). Di luar scope view W12 → dikonversi W13 (fondasi). Sampai itu konsumen
   .tsx (mis. view_cockpit2/view_jet) menarik tipe longgar dari sini agar prop JSX
   (<AiInsightPanel/> tanpa scope/title/embedded) tak di-infer "required".
   HAPUS file ini saat ai_insights.jsx → .tsx (W13). Pola identik evidence.d.ts.
   ============================================================ */
type AnyComp = (props: any) => any;
export const AiInsightPanel: AnyComp;
export const amsCrossChecks: any;
export const useAiInsights: any;
