/* ============================================================
   W12 — shim tipe sementara untuk view_materiality.jsx (view + penyedia komponen bersama).
   view_materiality = 3-importer (Fase 2); meng-ekspor SliderRow/Compare yang dipakai
   leaf lain. Sampai dikonversi, konsumen .tsx menarik tipe longgar dari sini agar prop
   JSX (mis. <SliderRow> tanpa `hint`/`disabled`) tak di-infer "required". HAPUS file ini
   saat view_materiality.jsx → .tsx. Pola identik view_calc.d.ts / ui.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const Compare: AnyComp;
export const MaterialityCalc: AnyComp;
export const SliderRow: AnyComp;
export const BENCHMARKS: any;
