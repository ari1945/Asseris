/* ============================================================
   W12 — shim tipe sementara untuk view_calc.jsx (penyedia komponen bersama).
   view_calc = 22-importer "boss provider"; dikonversi terakhir (Fase 2).
   Sampai itu, konsumen .tsx menarik tipe longgar dari sini agar prop JSX
   tak di-infer "required". HAPUS file ini saat view_calc.jsx → .tsx.
   Pola identik ui.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const ECLCalculator: AnyComp;
export const Kv: AnyComp;
export const RowKv: AnyComp;
export const SamplingEngine: AnyComp;
