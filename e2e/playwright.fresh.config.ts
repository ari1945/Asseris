// Gerbang firma segar (docs/prd-gerbang-firma-segar.md Fase 2) — stack e2e KEDUA, terpisah.
//
// Mengapa konfigurasi sendiri, bukan `project` kedua di playwright.config.ts: `webServer`
// Playwright berlaku GLOBAL untuk satu jalan, bukan per project. Stack segar butuh DB lain
// (`*_fresh`), proses API lain yang dibuat lewat `bootstrap` (bukan seed demo), dan SPA yang
// mem-proxy ke API itu. Menjalankannya sebagai jalan terpisah juga mencegah dua `prisma generate`
// berebut menulis klien bersama di server/node_modules (R-6, prepare-postgres.mjs).
//
//   npx playwright test -c playwright.fresh.config.ts
//
// Port berbeda dari stack demo (:5182/:5183 vs :5181/:5180) agar keduanya bisa hidup bersamaan di
// mesin lokal tanpa saling tembak; start-*.mjs menolak port yang sudah dipakai.
import { defineConfig, devices } from '@playwright/test';

const API_PORT = Number(process.env.E2E_FRESH_API_PORT ?? 5182);
const WEB_PORT = Number(process.env.E2E_FRESH_WEB_PORT ?? 5183);
const FRESH_DATABASE_URL =
  process.env.DATABASE_URL_FRESH ?? 'postgresql://neosuite:changeme@localhost:5432/neosuite_e2e_fresh';

export default defineConfig({
  testDir: './tests',
  testMatch: '09-fresh-firm.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  // TANPA retry: spek ini memakai test.fail() — retry atas uji karantina yang "gagal seperti
  // yang diharapkan" tak menambah apa pun, dan atas prasyarat justru menyembunyikan flakiness.
  retries: 0,
  outputDir: 'test-results-fresh',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-fresh' }],
  ],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run stack:api',
      url: `http://localhost:${API_PORT}/healthz`,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { E2E_STACK: 'fresh', E2E_API_PORT: String(API_PORT), DATABASE_URL: FRESH_DATABASE_URL },
    },
    {
      command: 'npm run stack:web',
      url: `http://localhost:${WEB_PORT}`,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { E2E_WEB_PORT: String(WEB_PORT), E2E_API_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
  projects: [{ name: 'chromium-fresh', use: { ...devices['Desktop Chrome'] } }],
});
