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
  },
});
