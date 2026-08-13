// Tahap 8 — budget waktu hidrasi (CI).
//
// Mengukur waktu dari navigasi pertama hingga aplikasi siap dipakai (topbar +
// identitas user terlihat) untuk sesi login FRESH (cache kosong), lalu
// mengunci regresi: bila hidrasi melambat melewati budget, CI gagal.
//
// Budget default 8.000 ms sudah longgar untuk CI (build/API lokal); nilai
// dapat dinaikkan via env E2E_HYDRATION_BUDGET_MS bila runner sangat lambat.
import { expect, test } from '@playwright/test';
import { USERS } from '../helpers';

test.describe('Tahap 8 — budget hidrasi frontend', () => {
  test('login fresh → aplikasi terhidrasi dalam budget waktu', async ({ page }) => {
    const budget = Number(process.env.E2E_HYDRATION_BUDGET_MS ?? 8_000);

    // Ukur dari navigasi pertama (cache kosong di context baru per test).
    const start = Date.now();
    await page.goto('/');

    // layar login harus muncul; isi kredensial & submit.
    await expect(page.locator('#lg-email')).toBeVisible();
    await page.locator('#lg-email').fill(USERS.manager.email);
    await page.locator('#lg-pw').fill(USERS.manager.password);
    await page.locator('form button[type="submit"]').click();

    // Hidrasi dianggap selesai saat topbar + identitas user tampil.
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.user-chip .u-name')).toContainText('Anindya');

    const elapsed = Date.now() - start;
     
    console.log(`[hydrasi] login → topbar: ${elapsed} ms (budget ${budget} ms)`);
    expect(elapsed, `hidrasi ${elapsed} ms melewati budget ${budget} ms`).toBeLessThanOrEqual(budget);
  });
});
