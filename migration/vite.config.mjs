import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Berkas hasil codemod memakai ekstensi asli (.js berisi JSX? TIDAK — .js = data polos,
// .jsx = view). Konfigurasi ini memastikan plugin-react men-transform .jsx, dan esbuild
// memuat .js sebagai JS biasa. Tidak ada Babel-in-browser lagi.
export default defineConfig({
  plugins: [react({ include: /\.(jsx|js)$/ })],
  server: { port: 5180, open: true },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // Selama migrasi window→ESM masih dual-publish, jangan terlalu agresif memangkas.
    sourcemap: true,
  },
  esbuild: {
    // dukung JSX yang mungkin muncul di berkas .js jika nanti ada
    loader: 'jsx',
    include: /src\/.*\.(jsx|js)$/,
    exclude: [],
  },
});
