import { expect, test } from '@playwright/test';
import {
  ENG_014, ENG_031, gotoModule, login, stateGetSafe, stateSetSafe, switchEngagement, USERS,
} from '../helpers';

test.describe('Perjalanan 3 — edit lalu berpindah engagement (PR-J)', () => {
  test('edit per engagement tetap terisolasi setelah perpindahan UI + rehidrasi WTB', async ({ page }) => {
    await login(page, USERS.manager);

    // 1) Edit dokumen milik ENG-2025-014.
    const key = `e2e.switch.${Date.now()}`;
    const before14 = await stateGetSafe(page, { scope: 'engagement', scopeId: ENG_014, key });
    expect(before14.ok).toBe(true);
    const w14 = await stateSetSafe(page, {
      scope: 'engagement', scopeId: ENG_014, key,
      value: { eng: ENG_014, marker: 'first' },
      baseVersion: before14.data.version,
    });
    expect(w14.ok).toBe(true);

    // 2) Pindah engagement lewat dropdown TopBar.
    await switchEngagement(page, ENG_031);

    // 3) WTB rehidrasi mengikuti perikatan aktif: bagan akun khas 031 tampil di modul WTB.
    await gotoModule(page, 'wtb');
    await expect(page.getByText('Tanaman Produktif — Harga Perolehan', { exact: false }).first()).toBeVisible();
    // Akun khas 014 (manufaktur) tidak boleh bocor ke layar 031.
    await expect(page.getByText('Pendapatan Jasa Audit', { exact: false })).toHaveCount(0);

    // 4) Dokumen 014 TIDAK bocor ke 031 (key yang sama belum pernah ditulis di 031).
    const before31 = await stateGetSafe(page, { scope: 'engagement', scopeId: ENG_031, key });
    expect(before31.ok).toBe(true);
    expect(before31.data.value).toBeNull();

    // 5) Edit dokumen dengan key yang sama di 031 → nilai berbeda.
    const w31 = await stateSetSafe(page, {
      scope: 'engagement', scopeId: ENG_031, key,
      value: { eng: ENG_031, marker: 'second' },
      baseVersion: 0,
    });
    expect(w31.ok).toBe(true);

    // 6) Pindah kembali → edit pertama masih utuh; keduanya hidup berdampingan.
    await switchEngagement(page, ENG_014);
    const after14 = await stateGetSafe(page, { scope: 'engagement', scopeId: ENG_014, key });
    expect(after14.ok).toBe(true);
    expect(after14.data.value).toMatchObject({ eng: ENG_014, marker: 'first' });

    const after31 = await stateGetSafe(page, { scope: 'engagement', scopeId: ENG_031, key });
    expect(after31.ok).toBe(true);
    expect(after31.data.value).toMatchObject({ eng: ENG_031, marker: 'second' });
  });
});
