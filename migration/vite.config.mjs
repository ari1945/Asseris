import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Berkas hasil codemod memakai ekstensi asli (.js = data polos, .jsx = view).
// Sejak W5 lapisan kanon ditulis TypeScript (.ts). Loader esbuild 'tsx' adalah
// superset (TS + JSX) sehingga keempat ekstensi .js/.jsx/.ts/.tsx ditransform
// seragam: tipe di-strip & JSX ditransform. Tidak ada Babel-in-browser lagi.
export default defineConfig({
  plugins: [react({ include: /\.(jsx|js|ts|tsx)$/ })],
  server: { port: 5180, open: true },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // Selama migrasi window→ESM masih dual-publish, jangan terlalu agresif memangkas.
    sourcemap: true,
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.(jsx|js|ts|tsx)$/,
    exclude: [],
  },
});
