/* ============================================================
   W12 — shim tipe sementara untuk view_analytical.jsx (penyedia komponen bersama).
   view_analytical = 48-importer "boss provider"; dikonversi TERAKHIR (Fase 2).
   Sampai itu, konsumen .tsx menarik tipe longgar dari sini agar prop JSX
   (mis. <KvBox> tanpa `accent`) tak di-infer "required". HAPUS file ini saat
   view_analytical.jsx → .tsx. Pola identik view_calc.d.ts / ui.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const AnalyticalReview: AnyComp;
export const KvBox: AnyComp;
export const FLUX_SEED: any;
export const VERDICT_COLOR: any;
export const arDerive: any;
export const benchVerdict: any;
