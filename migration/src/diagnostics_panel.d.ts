/* ============================================================
   W12 — shim tipe sementara untuk diagnostics_panel.jsx (modul fitur P4,
   lintas-sektor; di luar scope view W12 → dikonversi W13+). View .tsx
   (mis. view_diagnostics) memanggil <DiagnosticPanel title="…"/> tanpa
   `area` → TS infer prop required. Sampai diagnostics_panel.jsx → .tsx,
   konsumen tarik tipe longgar dari sini. HAPUS saat provider → .tsx.
   Pola identik ui.d.ts / view_calc.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const DiagnosticPanel: AnyComp;
export const useDiagnostics: (...args: any[]) => any;
export const useDiagDecisions: (...args: any[]) => any;
export const diagSevCount: (...args: any[]) => any;
