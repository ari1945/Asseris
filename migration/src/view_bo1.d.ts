/* ============================================================
   W12 — shim tipe sementara untuk view_bo1.jsx (penyedia komponen bersama).
   view_bo1 = 12-importer; dikonversi terakhir (Fase 2). Sampai itu konsumen .tsx
   menarik tipe longgar dari sini agar prop JSX (mis. <BoStat> tanpa `accent`)
   tak di-infer "required". HAPUS file ini saat view_bo1.jsx → .tsx.
   Pola identik view_calc.d.ts / ui.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const BoBadge: AnyComp;
export const BoStat: AnyComp;
export const BoTabPanel: AnyComp;
export const boJt: any;
export const boM: any;
