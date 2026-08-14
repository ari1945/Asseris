// Live-verify Program C: rantai integritas psak71 (L5) + sa720 P0 rep580.
// 1. #/psak71 → tab "Kertas Kerja B-7" → panel Rantai Integritas tampil
// 2. Toggle prosedur → history bertambah + badge hijau (verify ok)
// 3. #/sa720 → tab status → representasi tidak lagi hijau hardcode
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
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await login(page);
  console.log('LOGIN OK');

  // 1. psak71 → tab kk
  await page.goto(BASE + '/#/psak71', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.click('button:has-text("Kertas Kerja B-7")');
  await page.waitForTimeout(2500);

  const chainVisible = await page.locator('text=Rantai Integritas Server').count();
  console.log('1. Panel Rantai Integritas:', chainVisible > 0 ? 'ADA ✓' : 'TIDAK ADA ✗');

  // cek badge verify (hijau/amber/merah)
  const badge = await page.evaluate(() => {
    const t = document.body.innerText;
    if (t.includes('Rantai server utuh')) return 'hijau';
    if (t.includes('GAGAL di')) return 'merah';
    if (t.includes('Server Tak Tersedia')) return 'amber';
    return 'tidak ditemukan';
  });
  console.log('2. Badge verify:', badge);

  // history rows (vN)
  const histBefore = await page.locator('span:has-text("v1"), span:has-text("v0")').count();
  console.log('3. Entri history sebelum toggle:', histBefore);

  // toggle satu prosedur checklist di tab "Audit · SA 540"
  await page.click('button:has-text("Audit · SA 540")');
  await page.waitForTimeout(1500);
  const procRows = await page.locator('label:has-text("SA 540"), label:has-text("SA 500"), label:has-text("PSAK 71")').count();
  console.log('   prosedur SA 540:', procRows);
  if (procRows > 0) {
    await page.locator('label:has-text("SA 540")').first().click();
    await page.waitForTimeout(2500);
    // kembali ke kk → history harus bertambah
    await page.click('button:has-text("Kertas Kerja B-7")');
    await page.waitForTimeout(3000);
    const histAfter = await page.locator('span:has-text("v1"), span:has-text("v2")').count();
    console.log('4. Entri history setelah toggle:', histAfter, histAfter > 0 ? '(ADA ✓)' : '(KOSONG ✗)');
    const badgeAfter = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('span.badge')).map(e => e.textContent.trim());
      return b.find(x => x.includes('prosedur ditandai')) || 'none';
    });
    console.log('   badge prosedur setelah:', badgeAfter);
  } else {
    console.log('4. SKIP toggle (prosedur tidak ditemukan)');
  }

  // 5. sa720 → tab "Status & Komunikasi" → representasi harus AMBER (belum terlampir) bukan hijau hardcode
  await page.goto(BASE + '/#/sa720', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  await page.click('button:has-text("Status & Komunikasi")');
  await page.waitForTimeout(2000);
  const repText = await page.evaluate(() => {
    const t = document.body.innerText;
    const idx = t.indexOf('Representasi tertulis info lain (SA 580)');
    if (idx < 0) return 'tidak ditemukan';
    const near = t.slice(idx, idx + 140);
    return near.includes('belum terlampir') ? 'AMBER (belum terlampir) ✓' : (near.includes('Representasi tertulis') ? 'hijau/ada' : '?');
  });
  console.log('5. sa720 representasi:', repText);

  await browser.close();
  console.log('\nDONE');
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
