import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Isolated DB file so tests never touch dev.db. Injected into every worker's
    // process.env; globalSetup pushes the schema to it before the suite runs.
    env: { DATABASE_URL: 'file:./test.db' },
    globalSetup: './src/__tests__/globalSetup.ts',
    include: ['src/**/*.test.ts'],
  },
});
