/* ============================================================
   Asseris — shim bundel CSS (W13 Fase 2)
   ------------------------------------------------------------
   Entry `main.tsx` meng-import lima bundel `*.css` via side-effect
   (Vite menanganinya saat build/dev). Tanpa deklarasi ini tsc app-tier
   melempar TS2882 untuk impor side-effect berkas non-TS.

   ⚠️ Berkas ini SENGAJA non-module (TANPA import/export top-level) supaya
   `declare module '*.css'` menjadi deklarasi modul AMBIENT GLOBAL — bukan
   augmentasi-modul terlingkup. (Padanan `vite/client.d.ts`.) Bila kelak file
   ini diberi `export`, wildcard berhenti berlaku global → TS2882 kembali.
   ============================================================ */
declare module '*.css' {}
