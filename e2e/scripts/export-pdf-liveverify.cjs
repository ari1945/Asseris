// Live-verify: tombol ekspor PDF (amsExportPdf) di 5 modul yang di-migrasi dari amsPrintDoc.
// Verifikasi: download event → file PDF nyata (%PDF header) + idealnya TERSEGEL.
// Menembak dev stack: Vite :5180 + tRPC :5181.
const { chromium } = require('playwright');

const BASE = 'http://localhost:5180';
const USER = 'hartono.w@whr-cpa.id';
const PASS = 'Partner#2025!';

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  // cari form login
  const emailSel = 'input[type="email"], input[name="email"], input[placeholder*="mail"], input[placeholder*="email"]';
  const passSel = 'input[type="password"]';
  const email = page.locator(emailSel).first();
  if (await email.count()) {
    await email.fill(USER);
    await page.locator(passSel).first().fill(PASS);
    const btn = page.locator('button:has-text("Masuk"), button:has-text("Login"), button[type="submit"]').first();
    await btn.click();
    await page.waitForTimeout(4000);
  }
  // tunggu shell (sidebar)
  await page.waitForSelector('.view-scroll, [class*="shell"], .sidebar', { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function tryModule(page, moduleId, clickFn) {
  const result = { module: moduleId, status: 'SKIP', note: '' };
  try {
    await page.goto(BASE + '/#/' + moduleId, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);
    // tunggu tombol export hadir
    const dl = page.waitForEvent('download', { timeout: 20000 });
    await clickFn(page);
    const download = await dl;
    const path = await download.path();
    if (!path) { result.status = 'FAIL'; result.note = 'no download path'; return result; }
    const fs = require('fs');
    const buf = fs.readFileSync(path);
    const head = buf.slice(0, 8).toString('latin1');
    const txt = buf.toString('latin1');
    result.note = 'bytes=' + buf.length + ' head=' + head;
    if (head.startsWith('%PDF')) {
      result.status = 'PDF_OK';
      if (txt.includes('TERSEGEL')) { result.status = 'PDF_SEALED'; result.note += ' TERSEGEL=YES'; }
      else if (txt.includes('TIDAK TERSEGEL')) { result.note += ' TERSEGEL=NO(server)'; }
      else { result.note += ' TERSEGEL=UNKNOWN'; }
    } else {
      result.status = 'FAIL';
      result.note += ' NOT_A_PDF';
    }
  } catch (e) {
    result.status = 'ERROR';
    result.note = String(e).slice(0, 160);
  }
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await login(page);
  console.log('LOGIN OK');

  const results = [];

  // 1. strategy (misc1) — tombol "Export PDF" di SubBar
  results.push(await tryModule(page, 'strategy', async (p) => {
    const btn = p.locator('button:has-text("Export PDF")').first();
    await btn.click();
  }));

  // 2. billing (pipeline) — klik faktur lalu "Cetak"
  results.push(await tryModule(page, 'billing', async (p) => {
    await p.locator('table.dtbl tbody tr').first().click();
    await p.waitForTimeout(1200);
    const btn = p.locator('button:has-text("Cetak")').first();
    await btn.click();
  }));

  // 3. payroll — klik karyawan pertama (buka drawer), lalu "Unduh Slip (PDF)"
  results.push(await tryModule(page, 'payroll', async (p) => {
    // klik baris karyawan pertama di daftar gaji
    const row = p.locator('table.dtbl tbody tr, [class*="row"]:has-text("Rp")').first();
    await row.click().catch(() => {});
    await p.waitForTimeout(1500);
    const btn = p.locator('button:has-text("Unduh Slip")').first();
    if (!(await btn.count())) throw new Error('tombol Unduh Slip tidak muncul');
    await btn.click();
  }));

  // 4. isak35 — tombol "Export PDF" di SubBar
  results.push(await tryModule(page, 'isak35', async (p) => {
    const btn = p.locator('button:has-text("Export PDF")').first();
    await btn.click();
  }));

  // 5. mgmtletter (final3) — buka tab preview, lalu "Export PDF"
  results.push(await tryModule(page, 'mgmtletter', async (p) => {
    const tab = p.locator('button:has-text("Pratinjau Surat")').first();
    await tab.click();
    await p.waitForTimeout(1500);
    const btn = p.locator('button:has-text("Export PDF")').first();
    await btn.click();
  }));

  // 6. relatedsvc (nonaudit2) — buka tab Laporan → "Laporan Temuan Faktual" → download di drawer
  results.push(await tryModule(page, 'relatedsvc', async (p) => {
    const tab = p.locator('button:has-text("Laporan")').first();
    await tab.click();
    await p.waitForTimeout(1200);
    const btn = p.locator('button:has-text("Laporan Temuan Faktual"), button:has-text("Pratinjau Laporan Temuan")').first();
    await btn.click({ force: true });
    await p.waitForTimeout(1800);
    // drawer terbuka: top-btn ke-4 (sebelum "Tutup") = tombol download (tanpa title)
    const dlBtn = p.locator('button.top-btn').nth(4);
    if (!(await dlBtn.count())) throw new Error('tombol download drawer tidak ditemukan');
    await dlBtn.click({ force: true });
  }));

  console.log('\n=== HASIL LIVE-VERIFY PDF ===');
  for (const r of results) {
    console.log(`${r.status.padEnd(12)} ${r.module.padEnd(12)} ${r.note}`);
  }
  await browser.close();
  const ok = results.filter(r => r.status === 'PDF_SEALED' || r.status === 'PDF_OK').length;
  console.log(`\nPASS ${ok}/${results.length} (sealed: ${results.filter(r => r.status === 'PDF_SEALED').length})`);
  process.exit(ok >= 3 ? 0 : 1);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
