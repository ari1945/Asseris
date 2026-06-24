import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.mjs';

// Extend the Vite build config (react/esbuild loaders) so tests resolve the
// same way the app does. Tests run in the `node` environment with a hand-rolled
// `window`/`localStorage`/`BENCHMARKS` stub (see src/__tests__/setup.ts) — no
// jsdom dependency, since the canon engines are pure number functions.
// W15: test-tier kini .ts (esbuild transpile via vite; di-EXCLUDE dari tsconfig
// strict — bukan permukaan-tipe produksi). Lihat tsconfig "exclude".
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      globals: true,
      setupFiles: ['./src/__tests__/setup.ts'],
      include: ['src/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        // W4 scope = the canon "number engines"; P2 widened to the now-tested
        // client logic layer (api transport + export deliverable generators).
        include: [
          'src/canon*.ts', 'src/forensic_canon.ts',
          'src/api.ts', 'src/export_pdf.ts', 'src/export_xlsx.ts',
        ],
        reporter: ['text', 'json-summary'],
        // Per-glob thresholds: keep the canon gate strict; hold the client layer
        // to a realistic floor (boot-only hydration paths stay legitimately uncovered).
        thresholds: {
          'src/canon*.ts': { lines: 80, statements: 80, functions: 80, branches: 70 },
          'src/forensic_canon.ts': { lines: 80, statements: 80, functions: 80, branches: 70 },
          // api.ts: hydrateCoreFromApi (boot-only) + authFetch transport stay
          // uncovered by design; the tested transport/redaction logic sets the floor.
          'src/api.ts': { lines: 65, statements: 65, functions: 80, branches: 80 },
          // export_*.ts: remaining branches are defensive try/catch (QR/addImage),
          // page-break, and `||` filename fallbacks needing the real libs — not forced.
          'src/export_*.ts': { lines: 90, statements: 90, functions: 85, branches: 60 },
        },
      },
    },
  }),
);
