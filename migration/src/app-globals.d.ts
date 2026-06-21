/* ============================================================
   Asseris — ambient window contract, APP tier (W11)
   ------------------------------------------------------------
   Saat lapisan DATA dikonversi .js → .ts (PRD W11), tiap baca/tulis
   `window.<NS>` yang TERSISA harus dideklarasikan di sini agar file
   .ts kompil di bawah `tsconfig.app.json`. Ini bukan strictness —
   `window.X` yang tak dikenal selalu error walau tier relaks.

   Setiap entri = kopling runtime-bus yang BELUM dilucuti window-strip;
   daftar ini MENJADI peta sisa kopling untuk window-strip-2. Tipe `any`
   (tier app relaks). Tumbuh per slice W11; menyusut saat window-strip-2
   melucutinya. Terpisah dari kontrak kanon (src/types/globals.d.ts).
   ============================================================ */
export {};

declare global {
  interface Window {
    /** Keuangan operasional firma (data_firmops) — masih dibaca lewat window
     *  oleh data_facilities (annualDepreciation). Window-strip-2 candidate. */
    FIRMOPS: any;
    /** Lisensi & langganan (data_licensing) — file masih dual-publish
     *  (`window.LICENSING = …`), belum di-strip. Window-strip-2 candidate. */
    LICENSING: any;
    /* W11 slice 2 — namespace residual yang dibaca/ditulis lapisan data 0-importer.
       Semua kandidat window-strip-2; `any` di tier app relaks. */
    RETENTION: any;
    MODULE_INDEX: any;
    TRAVEL: any;
    TAX: any;
    STANDARDS_REGISTRY: any;
    IRM: any;
    RELATED_SA: any;
    TAX23: any;
  }
}
