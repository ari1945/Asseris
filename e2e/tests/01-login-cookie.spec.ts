import { expect, test } from '@playwright/test';
import { ENG_014, login, logout, USERS } from '../helpers';

test.describe('Perjalanan 1 — login: cookie HttpOnly + hidrasi', () => {
  test('login menetapkan ams_session HttpOnly/SameSite=Strict dan aplikasi terhidrasi', async ({ page }) => {
    // Boot tanpa sesi → layar login.
    await page.goto('/');
    await expect(page.locator('#lg-email')).toBeVisible();

    await login(page, USERS.manager);

    // Cookie sesi: HttpOnly + SameSite=Strict + Path=/ — tidak bisa dibaca JavaScript.
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === 'ams_session');
    expect(session, 'ams_session cookie harus ada').toBeDefined();
    expect(session!.httpOnly).toBe(true);
    expect(session!.sameSite).toBe('Strict');
    expect(session!.path).toBe('/');

    // HttpOnly: document.cookie tidak memuat sesi; tidak ada token bearer legacy di localStorage.
    const jsView = await page.evaluate(() => ({
      cookie: document.cookie,
      token: localStorage.getItem('ams.auth.token'),
    }));
    expect(jsView.cookie).not.toContain('ams_session');
    expect(jsView.token).toBeNull();

    // Hidrasi: identitas user + perikatan aktif dari bootstrap server (Postgres).
    await expect(page.locator('.user-chip .u-name')).toContainText('Anindya');
    await expect(page.locator('.user-chip .u-role')).toHaveText('Audit Manager');
    await expect(page.locator('.top-ctx')).toContainText(ENG_014);

    // Reload → auth.me + bootstrap membaca ulang dari Postgres (tanpa layar login).
    await page.reload();
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('#lg-email')).not.toBeVisible();
    await expect(page.locator('.top-ctx')).toContainText(ENG_014);

    // Logout → cookie sesi dihapus; reload kembali ke login.
    await logout(page);
    await page.reload();
    await expect(page.locator('#lg-email')).toBeVisible();
    const after = await page.context().cookies();
    expect(after.some((c) => c.name === 'ams_session' && c.value !== ''), 'cookie sesi harus hilang').toBe(false);
  });

  test('kredensial salah ditolak dan tetap di layar login', async ({ page }) => {
    await page.goto('/');
    await page.locator('#lg-email').fill(USERS.manager.email);
    await page.locator('#lg-pw').fill('salah-password');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('[role="alert"]')).toContainText('Email atau kata sandi salah.');
    await expect(page.locator('#lg-email')).toBeVisible();
  });
});
