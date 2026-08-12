import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Isolated DB file so tests never touch dev.db. Injected into every worker's
    // process.env; globalSetup pushes the schema to it before the suite runs.
    env: { DATABASE_URL: 'file:./test.db' },
    globalSetup: './src/__tests__/globalSetup.ts',
    include: ['src/**/*.test.ts'],
    // Run test files sequentially. They share one SQLite test.db, and W10's audit chain is
    // global mutable state every state.set appends to — parallel files would race on max(seq).
    // Production is single-process (the audit append queue assumes it), so serial files match
    // the real concurrency model rather than papering over a test-only multi-worker race.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      // Tahap 7 — coverage CI bertahap untuk tujuh area kunci. Threshold per-glob di bawah
      // adalah BASELINE saat Tahap 7 dibuka (mengukur keadaan nyata, bukan target ideal);
      // rencana menaikkannya per gelombang ada di BUILD.md › Tahap 7. Artefak
      // coverage/coverage-summary.json di-upload CI agar trennya bisa dipantau.
      include: [
        'src/auth/**',
        'src/security/**',
        'src/rbac.ts',
        'src/roleStore.ts',
        'src/engagementAccess.ts',
        'src/stateAccess.ts',
        'src/stateMutation.ts',
        'src/payloadLimits.ts',
        'src/audit/**',
        'src/attachments/**',
        'src/integrations/**',
      ],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      // Baseline Tahap 7 (diukur 2026-08-12 atas 372 tes server, sqlite test.db):
      //   auth 98/82 · security 98/76 · rbac 100 · roleStore 94/81 · engagementAccess 100
      //   stateAccess 97/91 · stateMutation 93/83 · payloadLimits 100/63
      //   audit 90/86 · attachments 96/68 · integrations 95/73 (lines/branches)
      // Ambang di bawah ini menyisakan ruang aman ~2-8 poin agar CI stabil, dan
      // tetap menutup regresi berarti. Kenaikan bertahap per gelombang: BUILD.md › Tahap 7.
      thresholds: {
        'src/auth/**': { lines: 90, statements: 90, functions: 90, branches: 70 },
        'src/security/**': { lines: 90, statements: 90, functions: 80, branches: 65 },
        'src/rbac.ts': { lines: 90, statements: 90, functions: 90, branches: 85 },
        'src/roleStore.ts': { lines: 85, statements: 85, functions: 85, branches: 70 },
        'src/engagementAccess.ts': { lines: 90, statements: 90, functions: 90, branches: 90 },
        'src/stateAccess.ts': { lines: 90, statements: 90, functions: 90, branches: 80 },
        'src/stateMutation.ts': { lines: 85, statements: 85, functions: 85, branches: 75 },
        'src/payloadLimits.ts': { lines: 90, statements: 90, functions: 90, branches: 55 },
        'src/audit/**': { lines: 85, statements: 85, functions: 80, branches: 80 },
        'src/attachments/**': { lines: 90, statements: 90, functions: 90, branches: 60 },
        'src/integrations/**': { lines: 90, statements: 90, functions: 90, branches: 65 },
      },
    },
  },
});
