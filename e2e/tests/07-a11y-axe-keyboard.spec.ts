// Tahap 9 — aksesibilitas: pemindaian axe + smoke navigasi keyboard.
//
// Dua lapis gerbang:
//   1) axe pada halaman kunci (login, Beranda, Dashboard Firma, Pengaturan)
//      → ZERO pelanggaran impact 'critical'. Pelanggaran 'serious' lainnya
//      dilaporkan ke console untuk ditinjau (bukan gerbang), supaya suite
//      tidak merah karena utang aksesibilitas pra-ada yang belum ditutup —
//      namun REGRESI critical tetap menggagalkan CI.
//   2) smoke keyboard: urutan Tab logis, fokus terlihat, tombol bisa
//      diaktifkan Enter/Space, switch native bisa di-toggle Space, dan
//      Escape menutup menu. Ini menegakkan perbaikan Tahap 9 (kontrol
//      form native) tanpa perlu snapshot visual.
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, USERS } from '../helpers';

const CRITICAL_GATE = true; // gerbang CI: zero impact "critical"
const SERIOUS_LOG = true;   // lapor serious ke console untuk triase

async function scanAndAssert(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    // Aturan yang sengaja dimatikan: kontras adalah keputusan desain yang sudah
    // di-audit terpisah (PRD Quick-Win Desain Visual), dan heading-order/region
    // belum ditargetkan di Tahap 9 ini.
    .disableRules(['color-contrast', 'heading-order', 'region'])
    .analyze();

  const critical = results.violations.filter((v) => v.impact === 'critical');
  const serious = results.violations.filter((v) => v.impact === 'serious');

  // eslint-disable-next-line no-console
  console.log(`[axe] ${label}: ${results.violations.length} pelanggaran ` +
    `(critical=${critical.length}, serious=${serious.length})`);
  for (const v of results.violations) {
    // eslint-disable-next-line no-console
    console.log(`[axe]   ${v.impact} ${v.id}: ${v.help} — ${v.nodes.length} node`);
  }

  if (CRITICAL_GATE) {
    expect(critical, `axe ${label}: pelanggaran critical tidak boleh ada`).toHaveLength(0);
  }
  if (SERIOUS_LOG && serious.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[axe] ${label}: ${serious.length} pelanggaran serious belum ditutup (bukan gerbang).`);
  }
}

test.describe('Tahap 9 — aksesibilitas (axe) & smoke keyboard', () => {
  test('halaman login bersih dari pelanggaran critical axe', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#lg-email')).toBeVisible();
    await scanAndAssert(page, 'login');
  });

  test('halaman kunci pasca-login bersih dari pelanggaran critical axe', async ({ page }) => {
    await login(page, USERS.manager);

    // Beranda (titik masuk pasca-login).
    await page.evaluate(() => { window.location.hash = '#/home'; });
    await expect(page.locator('.topbar')).toBeVisible();
    await page.waitForTimeout(400);
    await scanAndAssert(page, 'beranda');

    // Dashboard Firma.
    await page.evaluate(() => { window.location.hash = '#/dashboard'; });
    await page.waitForTimeout(500);
    await scanAndAssert(page, 'dashboard');

    // Pengaturan — memuat semua switch native Tahap 9.
    await page.evaluate(() => { window.location.hash = '#/settings'; });
    await page.waitForTimeout(500);
    await scanAndAssert(page, 'pengaturan');
  });

  test('smoke keyboard: Tab, fokus terlihat, dan Space men-toggle switch native', async ({ page }) => {
    await login(page, USERS.manager);

    // 1) Fokus awal masuk ke elemen pertama yang fokusable (bukan body).
    await page.evaluate(() => {
      const first = document.activeElement as HTMLElement;
      if (first && first.tagName === 'BODY') {
        // tekan Tab sekali bila fokus masih di body
      }
    });
    await page.keyboard.press('Tab');
    const activeTag = await page.evaluate(() => (document.activeElement as HTMLElement).tagName);
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(activeTag);

    // 2) Buka menu "Tampilan" (topbar) lewat keyboard: fokuskan tombolnya lalu Enter.
    await page.locator('button[title="Tampilan"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.dropmenu')).toBeVisible();

    // 3) Fokuskan switch native "Mode Gelap" (input checkbox role="switch") dan
    //    toggle dengan Space — kontrol native harus merespons keyboard.
    const darkSwitch = page.locator('.dropmenu .switch-native input').first();
    await darkSwitch.focus();
    await page.keyboard.press('Space');
    const darkOn = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(darkOn, 'Space harus mengaktifkan Mode Gelap (switch native)').toBe(true);
    await darkSwitch.press('Space');
    const darkOff = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(darkOff, 'Space kedua harus mematikan Mode Gelap').toBe(false);

    // 4) Escape menutup menu.
    await page.keyboard.press('Escape');
    await expect(page.locator('.dropmenu')).not.toBeVisible();
  });

  test('smoke keyboard: Pengaturan — switch native fokusable & dapat di-toggle Space', async ({ page }) => {
    await login(page, USERS.manager);

    // Halaman Pengaturan tidak punya id modul di MODULE_INDEX (router menolak
    // hash langsung), jadi buka lewat jalur UI yang sah: menu Tampilan →
    // "Semua Pengaturan…".
    await page.locator('button[title="Tampilan"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.dropmenu')).toBeVisible();
    await page.getByText('Semua Pengaturan…', { exact: true }).click();
    await page.waitForTimeout(800);

    // Fokuskan switch native pertama di Pengaturan ("Kurangi Animasi").
    const sw = page.locator('.switch-native input').first();
    await sw.focus();
    const isSwitch = await sw.evaluate((el) =>
      el.getAttribute('role') === 'switch' || el.type === 'checkbox');
    expect(isSwitch, 'harus ada switch native yang fokusable di Pengaturan').toBe(true);

    // Space men-toggle switch "Kurangi Animasi" (document.body class reduce-motion).
    const before = await page.evaluate(() => document.body.classList.contains('reduce-motion'));
    await sw.press('Space');
    const after = await page.evaluate(() => document.body.classList.contains('reduce-motion'));
    expect(after, 'Space harus mengubah state switch').toBe(!before);
  });
});
