/* ============================================================
   W12 — shim tipe sementara untuk view_docparts.jsx (penyedia komponen bersama).
   view_docparts = 7-importer; dikonversi terakhir (Fase 2). Sampai itu konsumen .tsx
   menarik tipe longgar dari sini agar prop JSX (mis. <PField>/<PModal> parsial) tak
   di-infer "required". HAPUS file ini saat view_docparts.jsx → .tsx.
   Pola identik view_calc.d.ts / ui.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const PDrawer: AnyComp;
export const PField: AnyComp;
export const PModal: AnyComp;
export const PThread: AnyComp;
export const PTimeline: AnyComp;
export const PVerList: AnyComp;
export const PEVT: any;
export const pNowTime: any;
