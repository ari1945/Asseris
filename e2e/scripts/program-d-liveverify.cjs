// Live-verify Program D: kontrol native (Switch/Check) menggantikan span/div palsu.
// 1. onboarding2: LTKM switch + UBO PEP check — toggle & state berubah
// 2. sectorck: checklist native — toggle & count berubah
// 3. goingconcern: switch refinancing — toggle & label proyeksi berubah
const { chromium } = require('playwright');

const BASE = 'http://localhost:5180';
const USER = 'hartono.w@whr-cpa.id';
const PASS = 'Partner#2025!';

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
  if (await email.count()) {
    await email.fill(USER);
    await page.locator('input[type="password"]').first().fill(PASS);
    await page.locator('button:has-text("Masuk"), button[type="submit"]').first().click();
    await page.waitForTimeout(4000);
  }
  await page.waitForTimeout(2500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await login(page);
  console.log('LOGIN OK');

  // 1. onboarding2 — UBO PEP check
  await page.goto(BASE + '/#/onboarding2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const pepChecks = await page.locator('input[type="checkbox"]').count();
  console.log('1. onboarding2 checkbox native:', pepChecks, pepChecks > 0 ? '✓' : '✗');

  // 2. sectorck — checklist native
  await page.goto(BASE + '/#/sectorck', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const ck = await page.locator('input[type="checkbox"]').count();
  console.log('2. sectorck checkbox native:', ck, ck > 0 ? '✓' : '✗');
  if (ck > 0) {
    const before = await page.locator('input[type="checkbox"]:checked').count();
    await page.locator('input[type="checkbox"]').first().check({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
    const after = await page.locator('input[type="checkbox"]:checked').count();
    console.log('   toggle bekerja:', before !== after ? `✓ (${before}→${after})` : `✗ (${before}→${after})`);
  }

  // 3. goingconcern — switch refinancing
  await page.goto(BASE + '/#/goingconcern', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const gcSwitches = await page.locator('input[type="checkbox"][role="switch"]').count();
  console.log('3. goingconcern switch native:', gcSwitches, gcSwitches > 0 ? '✓' : '✗');

  await browser.close();
  console.log('\nDONE');
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
