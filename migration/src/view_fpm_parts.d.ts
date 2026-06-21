/* ============================================================
   W12 — shim tipe sementara untuk view_fpm_parts.jsx (penyedia komponen bersama).
   view_fpm_parts = 29-importer; dikonversi terakhir (Fase 2). Sampai itu konsumen
   .tsx menarik tipe longgar dari sini agar prop JSX (mis. <KV> tanpa `accent`/`sub`,
   <SectionTitle> tanpa `right`) tak di-infer "required". HAPUS file ini saat
   view_fpm_parts.jsx → .tsx. Pola identik view_calc.d.ts / ui.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const Delta: AnyComp;
export const FGauge: AnyComp;
export const Funnel: AnyComp;
export const HBars: AnyComp;
export const KV: AnyComp;
export const LineChart: AnyComp;
export const MSub: AnyComp;
export const SectionTitle: AnyComp;
export const StackBar: AnyComp;
