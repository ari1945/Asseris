/* ============================================================
   Build TERPISAH untuk Wedge MVP single-file (klik-buka, offline).
   ------------------------------------------------------------
   Beda dari vite.config.mjs (multi-entry app penuh): HANYA wedge.html,
   di-inline penuh oleh vite-plugin-singlefile → satu berkas HTML mandiri
   (semua JS/CSS + dynamic import xlsx/jspdf di-inline) yang KAP bisa
   double-click tanpa server/dev-tooling. Output: dist-wedge/wedge.html.
   ============================================================ */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react({ include: /\.(jsx|js|ts|tsx)$/ }), viteSingleFile()],
  esbuild: { loader: 'tsx', include: /src\/.*\.(jsx|js|ts|tsx)$/, exclude: [] },
  build: {
    target: 'es2020',
    outDir: 'dist-wedge',
    rollupOptions: { input: 'wedge.html' },
    // viteSingleFile mengatur inlineDynamicImports + assetsInlineLimit → satu berkas.
  },
});
