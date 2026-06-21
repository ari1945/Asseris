/* ============================================================
   W12 — shim tipe sementara untuk view_onboarding.jsx (penyedia komponen bersama).
   view_onboarding = 9-importer; dikonversi terakhir (Fase 2). Sampai itu konsumen
   .tsx menarik tipe longgar dari sini agar prop JSX (mis. <OKv> tanpa `accent`)
   tak di-infer "required". HAPUS file ini saat view_onboarding.jsx → .tsx.
   Pola identik view_calc.d.ts / ui.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const ClientOnboarding: AnyComp;
export const OnboardingDrawer: AnyComp;
export const ProspectForm: AnyComp;
export const ScorePick: AnyComp;
export const StepAcceptance: AnyComp;
export const StepConvert: AnyComp;
export const OKv: AnyComp;
export const OB_STAGES: any;
export const obAccScore: any;
export const obAccVerdict: any;
export const obGates: any;
export const obStage: any;
export const amsAddProspect: any;
