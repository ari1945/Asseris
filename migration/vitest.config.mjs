import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.mjs';

// Extend the Vite build config (react/esbuild loaders) so tests resolve the
// same way the app does. Tests run in the `node` environment with a hand-rolled
// `window`/`localStorage`/`BENCHMARKS` stub (see src/__tests__/setup.js) — no
// jsdom dependency, since the canon engines are pure number functions.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      globals: true,
      setupFiles: ['./src/__tests__/setup.js'],
      include: ['src/**/*.test.js'],
      coverage: {
        provider: 'v8',
        // W4 scope = the canon "number engines" only.
        include: ['src/canon*.js', 'src/forensic_canon.js'],
        reporter: ['text', 'json-summary'],
        thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
      },
    },
  }),
);
