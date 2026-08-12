// Tahap 7 — Playwright atas stack Postgres. Dua webServer di-start oleh runner:
//   stack:api → prisma generate+migrate deploy+seed demo, lalu server tRPC (:5181)
//   stack:web → vite build + vite preview (:5180, proxy /trpc → :5181)
// Keduanya sengaja `reuseExistingServer: false` — e2e harus menembak stack yang
// baru saja di-seed, bukan dev server yang kebetulan sedang berjalan.
import { defineConfig, devices } from '@playwright/test';

const API_PORT = Number(process.env.E2E_API_PORT ?? 5181);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5180);

export default defineConfig({
  testDir: './tests',
  // Satu worker + serial: seluruh spek berbagi satu DB Postgres yang di-seed sekali
  // (sama seperti kontrak produksi single-process), jadi urutan deterministik.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run stack:api',
      url: `http://localhost:${API_PORT}/healthz`,
      timeout: 300_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run stack:web',
      url: `http://localhost:${WEB_PORT}`,
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
