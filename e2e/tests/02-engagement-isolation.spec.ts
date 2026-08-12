import { expect, test } from '@playwright/test';
import { ENG_014, ENG_031, login, stateGetSafe, stateSetSafe, trpcSafe, USERS } from '../helpers';

test.describe('Perjalanan 2 — penolakan engagement lintas-user (W7.5)', () => {
  test('Junior (bukan anggota ENG-2025-031) ditolak membaca/menulis perikatan itu', async ({ page }) => {
    await login(page, USERS.junior);

    // UI: switcher hanya menawarkan perikatan yang boleh diakses (014, bukan 031).
    await page.locator('.top-ctx').click();
    const menu = page.locator('.dropmenu');
    await expect(menu).toBeVisible();
    await expect(menu.getByText(ENG_014, { exact: false }).first()).toBeVisible();
    await expect(menu.getByText(ENG_031, { exact: false })).toHaveCount(0);
    await page.keyboard.press('Escape');

    // API (lewat sesi cookie browser): state.get lintas-user → FORBIDDEN.
    const read = await stateGetSafe(page, { scope: 'engagement', scopeId: ENG_031, key: 'aje' });
    expect(read.ok).toBe(false);
    expect(read.code).toBe('FORBIDDEN');

    // state.set juga ditolak — isolasi diperiksa SEBELUM gerbang kapabilitas.
    const write = await stateSetSafe(page, {
      scope: 'engagement', scopeId: ENG_031, key: 'e2e.isolation.v1', value: { x: 1 }, baseVersion: 0,
    });
    expect(write.ok).toBe(false);
    expect(write.code).toBe('FORBIDDEN');

    // Riwayat StateDoc ikut terisolasi (boundary baca yang sama).
    const history = await trpcSafe(page, 'state.history', 'query', {
      scope: 'engagement', scopeId: ENG_031, key: 'aje',
    });
    expect(history.ok).toBe(false);
    expect(history.code).toBe('FORBIDDEN');

    // Perikatan miliknya sendiri tetap bisa dibaca.
    const own = await stateGetSafe(page, { scope: 'engagement', scopeId: ENG_014, key: 'aje' });
    expect(own.ok).toBe(true);
  });

  test('Senior (anggota ENG-2025-031) boleh membaca perikatan kedua', async ({ page }) => {
    await login(page, USERS.senior);

    const read = await stateGetSafe(page, { scope: 'engagement', scopeId: ENG_031, key: 'aje' });
    expect(read.ok).toBe(true);

    await page.locator('.top-ctx').click();
    await expect(page.locator('.dropmenu').getByText(ENG_031, { exact: false }).first()).toBeVisible();
  });
});
