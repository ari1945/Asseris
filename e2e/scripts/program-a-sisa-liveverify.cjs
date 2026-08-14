// Live-verify: Program A sisa — tombol ekspor PDF baru di view_confirm (SA 505) & view_sad (SA 580).
// Verifikasi: download event → PDF nyata (%PDF) + TERSEGEL.
const { chromium } = require('playwright');
const fs = require('fs');

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
  await page.waitForSelector('.view-scroll, .sidebar', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function verifyPdf(page, { hash, clickSel, label }) {
  await page.goto(BASE + '/' + hash, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  if (clickSel.prep) { await page.click(clickSel.prep); await page.waitForTimeout(1200); }
  const dl = page.waitForEvent('download', { timeout: 20000 });
  if (clickSel.btn === '__js_download') {
    const ok = await page.evaluate(clickSel.js);
    if (!ok) throw new Error(label + ': tombol tidak ditemukan');
  } else {
    await page.click(clickSel.btn);
  }
  const d = await dl;
  const path = await d.path();
  if (!path) throw new Error(label + ': download.path() null');
  const buf = fs.readFileSync(path);
  const txt = buf.toString('latin1');
  const isPdf = buf.subarray(0, 4).toString('latin1') === '%PDF';
  const sealed = txt.includes('TERSEGEL');
  const hasSeal = /Seal: [A-Za-z0-9-]+/.test(txt);
  console.log(`  ${label}: ${isPdf ? 'PDF ✓' : 'BUKAN PDF ✗'} | bytes=${buf.length} | TERSEGEL=${sealed} | SealId=${hasSeal}`);
  return { isPdf, sealed };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await login(page);
  console.log('LOGIN OK');

  const results = [];

  // 1. confirm — tab "Daftar Konfirmasi" → klik item CF-005 → tombol "Unduh" surat (index 0)
  results.push(await verifyPdf(page, {
    hash: '#/confirm', label: 'confirm-letter',
    clickSel: {
      prep: 'button:has-text("Daftar Konfirmasi")',
      btn: '__js_download',
      js: () => {
        // klik item CF-005 lalu tombol Unduh pertama
        const item = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('CF-005') && d.textContent.includes('Distribusi'));
        if (!item) return false;
        item.click();
        setTimeout(() => {
          const btns = Array.from(document.querySelectorAll('button[title="Unduh"]'));
          if (btns.length) btns[0].click();
        }, 800);
        return true;
      },
    },
  }));

  // 2. sad — tab Komunikasi & Disposisi, lalu "Surat Representasi"
  results.push(await verifyPdf(page, {
    hash: '#/sad', label: 'sad-rep-letter',
    clickSel: {
      prep: 'button:has-text("Komunikasi"), button:has-text("Disposisi")',
      btn: 'button:has-text("Surat Representasi")',
    },
  }));

  console.log('\n=== RINGKASAN ===');
  const ok = results.filter(r => r && r.isPdf && r.sealed);
  console.log(`PASS ${ok.length}/${results.length} (PDF+TERSEGEL)`);
  await browser.close();
  process.exit(ok.length >= 2 ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(2); });
