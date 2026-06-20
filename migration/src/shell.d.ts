/* ============================================================
   W12 — shim tipe sementara untuk shell.jsx (kerangka aplikasi).
   shell = fondasi (TopBar/Sidebar/SubBar/SettingsMenu); dikonversi W13.
   TS meng-infer prop shell.jsx sebagai required (destructuring tanpa
   default) → mis. <SubBar moduleId="x" /> tanpa `right` di-flag. Sampai
   shell.jsx → .tsx, konsumen .tsx menarik tipe longgar dari sini.
   HAPUS file ini saat shell.jsx → .tsx (W13). Pola identik ui.d.ts.
   Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const TopBar: AnyComp;
export const Sidebar: AnyComp;
export const SubBar: AnyComp;
export const SettingsMenu: AnyComp;
