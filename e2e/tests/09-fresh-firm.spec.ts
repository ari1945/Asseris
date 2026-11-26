// Gerbang firma segar — Fase 2 (docs/prd-gerbang-firma-segar.md §4, §10 baris 2a/2b).
//
// Seluruh spek 01–08 berjalan di atas seed demo FIRM-WHR / ENG-2025-014, sehingga cacat
// "identitas demo dipaku di frontend" tak terlihat secara STRUKTURAL: di dunia uji, id yang dipaku
// dan id sesi selalu sama. Spek ini berjalan di stack KEDUA yang dibuat lewat jalur produksi —
// `migrate reset` + `npm run bootstrap` (bukan seed) — sehingga firma, admin, dan id-nya berasal
// dari bootstrapFirm, persis seperti pelanggan pertama. Jalankan:
//
//   npx playwright test -c playwright.fresh.config.ts
//
// Struktur (pelajaran Fase 1, PRD §12): `test.fail()` juga LULUS bila harness-nya rusak. Karena itu
// setiap prasyarat yang diandalkan uji karantina diuji ulang di uji NON-karantina yang wajib hijau.
//
// Fase 1 (migration/src/fresh_firm_gate.test.ts) menunjuk tiap cacat secara tepat; spek ini
// menangkap yang lolos di antara unit — perjalanan nyata atas Postgres, server, dan SPA hasil build.
import { expect, test, type Page } from '@playwright/test';
import { gotoModule, login, stateGetSafe, stateSetSafe, trpcSafe, USERS } from '../helpers';
import { DEMO_MARKERS, FRESH_FIRM } from '../fresh-firm.mjs';

const ADMIN = FRESH_FIRM.admin;

/** Penanda demo yang muncul di sebuah teks (DOM atau JSON StateDoc). */
function demoMarkersIn(text: string, { withIds }: { withIds: boolean }): string[] {
  const markers = [
    DEMO_MARKERS.firmName,
    ...DEMO_MARKERS.clientNames,
    ...DEMO_MARKERS.personNames,
    ...(withIds ? [DEMO_MARKERS.firmId, DEMO_MARKERS.engagementId, ...DEMO_MARKERS.clientIds] : []),
  ];
  return markers.filter((m) => text.includes(m));
}

interface CreatedClient {
  id: string;
  name: string;
  /** Badan permintaan `state.set` untuk kunci `clients` yang dipicu formulir. */
  writeBody: string;
  writeStatus: number;
}

/**
 * Tambah klien lewat UI Direktori Klien (#/crm → "Klien Baru") dan TUNGGU tulisan ke server.
 * Mengembalikan badan & status tulisannya agar prasyarat dapat membuktikan tulisan memang
 * dicoba — tanpa itu, "klien hilang setelah muat ulang" tak bisa dibedakan dari "tak pernah ditulis".
 */
async function createClientViaUi(page: Page, name: string): Promise<CreatedClient> {
  await gotoModule(page, 'crm');
  await page.getByRole('button', { name: /Klien Baru/ }).click();
  const id = await page.getByLabel('ID Klien').inputValue();
  await page.getByLabel('Nama Entitas').fill(name);
  await page.getByLabel('Industri').fill('Jasa Profesional');
  await page.getByLabel('Domisili').fill('Bandung');

  const write = waitForStateWrite(page, 'clients');
  await page.getByRole('button', { name: /Tambah Klien/ }).click();
  const res = await write;
  return { id, name, writeBody: res.request().postData() ?? '', writeStatus: res.status() };
}

/** Respons `state.set` (batch tRPC) yang memuat kunci tertentu — diterima ATAU ditolak. */
function waitForStateWrite(page: Page, key: string) {
  return page.waitForResponse(
    (r) => r.url().includes('state.set') && (r.request().postData() ?? '').includes(`"key":"${key}"`),
    { timeout: 15_000 },
  );
}

/** Buat perikatan lewat #/engagement → "Engagement Baru" untuk klien tertentu; tunggu tulisannya. */
async function createEngagementViaUi(page: Page, clientName: string): Promise<{ writeBody: string }> {
  await gotoModule(page, 'engagement');
  await page.getByRole('button', { name: /Engagement Baru/ }).first().click();
  await page.getByLabel('Klien', { exact: true }).selectOption({ label: clientName });
  const write = waitForStateWrite(page, 'engagements');
  await page.getByRole('button', { name: /Buat Engagement/ }).click();
  const res = await write;
  return { writeBody: res.request().postData() ?? '' };
}

/** Buka Pengaturan seperti pengguna: `settings` BUKAN rute sidebar (tak ada di MODULE_INDEX), jadi
 *  navigasi hash diabaikan app.tsx:222-223; satu-satunya pintu UI = topbar "Tampilan" →
 *  "Semua Pengaturan…" (shell.tsx:92, :535). */
async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Tampilan' }).click();
  await page.getByText('Semua Pengaturan…').click();
  await expect(page.locator('.subbar .crumb')).toContainText('Pengaturan');
}

/* ------------------------------------------------------------------------------------------
   PRASYARAT — NON-karantina, WAJIB HIJAU. Bila salah satu merah, hasil uji karantina di bawah
   tak bermakna (mereka bisa "gagal seperti diharapkan" karena alasan yang salah).
   ------------------------------------------------------------------------------------------ */
test.describe('prasyarat — stack ini sungguh firma segar hasil bootstrap', () => {
  test('admin bootstrap dapat login; server mengenalinya sebagai firma segar tanpa perikatan', async ({ page }) => {
    await login(page, ADMIN);

    const me = await trpcSafe<{ id: string }>(page, 'auth.me', 'query');
    expect(me.ok && me.data.id).toBe(ADMIN.id);

    const engs = await trpcSafe<unknown[]>(page, 'engagement.list', 'query');
    expect(engs.ok, 'engagement.list harus terjawab').toBe(true);
    expect(engs.ok && engs.data).toEqual([]);

    // Kontrak server (cross-firm-state, stateAccess.ts): firm-scope milik sendiri terbaca,
    // FIRM-WHR ditolak. Ini membuktikan firmId sesi = FIRM-SEGAR tanpa auth.me memuat firmId.
    const own = await stateGetSafe(page, { scope: 'firm', scopeId: FRESH_FIRM.id, key: 'clients' });
    expect(own.ok, `state.get firm ${FRESH_FIRM.id} harus diizinkan`).toBe(true);
    const demo = await stateGetSafe(page, { scope: 'firm', scopeId: DEMO_MARKERS.firmId, key: 'clients' });
    expect(demo.ok).toBe(false);
    expect(!demo.ok && demo.code).toBe('FORBIDDEN');
  });

  test('DB ini TIDAK memuat seed demo — kredensial demo ditolak', async ({ page }) => {
    await page.goto('/');
    await page.locator('#lg-email').fill(USERS.partner.email);
    await page.locator('#lg-pw').fill(USERS.partner.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('[role="alert"]')).toContainText('Email atau kata sandi salah.');
  });

  test('menambah klien lewat UI MENCOBA menulis kunci `clients` ke server', async ({ page }) => {
    await login(page, ADMIN);
    const c = await createClientViaUi(page, 'PT Prasyarat Tulis Segar');
    expect(c.writeBody).toContain('PT Prasyarat Tulis Segar');
    expect(c.writeStatus, 'server harus menjawab tulisan itu (diterima ATAU ditolak)').toBeGreaterThan(0);
  });

  test('formulir "Engagement Baru" dapat dikirim dan MENCOBA menulis kunci `engagements`', async ({ page }) => {
    await login(page, ADMIN);
    const c = await createClientViaUi(page, 'PT Prasyarat Perikatan Segar');
    const e = await createEngagementViaUi(page, c.name);
    expect(e.writeBody).toContain(c.id);
  });

  test('Pengaturan dapat dibuka lewat menu "Tampilan" (pintu yang dipakai langkah 1)', async ({ page }) => {
    await login(page, ADMIN);
    await openSettings(page);
    await expect(page.locator('.subbar .chip', { hasText: 'Enterprise' })).toBeVisible();
    await page.getByText('Firma & Standar').first().click();
    await expect(page.getByText('Identitas Firma')).toBeVisible();
  });
});

/* ------------------------------------------------------------------------------------------
   UJI CACAT — dikarantina (R-7: master selalu hijau). `test.fail()` LULUS selama cacatnya ada,
   dan MEMERAH begitu cacatnya diperbaiki — saat itu ganti `test.fail` → `test`.
   ------------------------------------------------------------------------------------------ */
test.describe('perjalanan firma segar (P0 evaluasi 2026-11-25)', () => {
  // KARANTINA s/d 2026-12-31 — P0-4 (+P0-1): app.tsx menghidrasi ENG-2025-014 untuk SEMUA firma;
  // bootstrap ditolak cross-firm-engagement, galatnya ditelan, AMS.FIRM/CLIENTS tetap demo.
  test('langkah 1 — firma segar melihat identitasnya sendiri, nol data demo', async ({ page }) => {
    await login(page, ADMIN);

    await openSettings(page);
    const chip = (await page.locator('.subbar .chip', { hasText: 'Enterprise' }).first().textContent()) ?? '';
    await page.getByText('Firma & Standar').first().click();
    await expect(page.getByText('Identitas Firma')).toBeVisible();
    const firmNameShown = await page.getByText(FRESH_FIRM.name).first().isVisible();

    await gotoModule(page, 'crm');
    // Modul harus BENAR-BENAR terender. Begitu data demo hilang, firma tanpa klien membuat
    // ClientCRM membaca clients[0].id (view_firm.tsx:23,31) — nol nama demo di layar yang crash
    // bukan kemenangan.
    const crmRendered = await page.getByRole('button', { name: /Klien Baru/ }).isVisible().catch(() => false);
    const crmText = (await page.locator('body').textContent()) ?? '';

    expect({
      chipHasOwnShort: chip.includes(`${FRESH_FIRM.short} ·`),
      firmNameShown,
      crmRendered,
      demoMarkersOnScreen: demoMarkersIn(crmText, { withIds: false }),
    }).toEqual({ chipHasOwnShort: true, firmNameShown: true, crmRendered: true, demoMarkersOnScreen: [] });
  });

  // KARANTINA s/d 2026-12-31 — P0-1: FIRM_SCOPE_ID='FIRM-WHR' (persist_scope.ts:22) ⇒ tulisan
  // `clients` menuju firma demo dan ditolak cross-firm-state; klien hanya hidup di cache peramban.
  //
  // Dibuktikan di KONTEKS PERAMBAN BARU (setara perangkat lain), BUKAN `page.reload()`: draf
  // pertama memakai reload dan LULUS di CI walau server menolak tulisannya — klien kembali dari
  // cache localStorage `ams.v1.*`, yang menurut AGENTS.md §3.3 hanya offline-cache. "Bertahan"
  // berarti bertahan di SSOT server.
  test('langkah 2 — klien yang dibuat terlihat dari perangkat lain (sesi baru)', async ({ page, browser }) => {
    await login(page, ADMIN);
    const c = await createClientViaUi(page, 'PT Uji Segar Bertahan');

    const other = await browser.newContext();
    try {
      const page2 = await other.newPage();
      await login(page2, ADMIN);
      await gotoModule(page2, 'crm');
      await expect(page2.getByRole('button', { name: /Klien Baru/ })).toBeVisible();
      await expect(page2.getByText(c.name).first()).toBeVisible();
    } finally {
      await other.close();
    }
  });

  // KARANTINA s/d 2026-12-31 — P0-2: tak ada API yang membuat baris Engagement (hanya seed.ts &
  // pilotProvision.ts); addEngagement UI hanya menulis StateDoc (contexts.tsx). engagement.list,
  // bootstrap, dan assertEngagementAccess membaca tabel Prisma ⇒ perikatan baru tak pernah ada.
  // Asersi sengaja NETRAL-DESAIN: apa pun bentuk perbaikannya, server harus mengenal perikatan itu.
  test('langkah 3 — perikatan yang dibuat lewat UI dikenal server dan dapat ditulisi', async ({ page }) => {
    await login(page, ADMIN);
    const c = await createClientViaUi(page, 'PT Uji Segar Perikatan');
    await createEngagementViaUi(page, c.name);

    await page.reload();
    await expect(page.locator('.topbar')).toBeVisible();
    const engs = await trpcSafe<Array<{ id: string; clientId: string }>>(page, 'engagement.list', 'query');
    const mine = engs.ok ? engs.data.find((e) => e.clientId === c.id) : undefined;
    expect(mine, `engagement.list harus memuat perikatan untuk ${c.id}`).toBeDefined();

    const target = { scope: 'engagement', scopeId: mine!.id, key: 'e2e-fresh-wp' };
    const wrote = await stateSetSafe(page, { ...target, value: { note: 'kertas kerja pertama' }, baseVersion: 0 });
    expect(wrote.ok, 'menulis kertas kerja di perikatan baru').toBe(true);
    await page.reload();
    const read = await stateGetSafe(page, target);
    expect(read.ok && read.data.value).toEqual({ note: 'kertas kerja pertama' });
  });

  // Langkah 4 (undang staf → tugaskan → staf melihat perikatannya) DITUNDA, bukan dikarantina:
  // `users.invite` ada (router.ts:740), tetapi TIDAK ADA API maupun UI untuk menugaskan staf ke
  // perikatan — engagementMember.create hanya di seed.ts:239 & pilotProvision.ts:108. Menulisnya
  // sekarang berarti mengarang selektor untuk fitur yang belum didesain; uji seperti itu akan
  // tetap merah sesudah perbaikan yang benar. Ditulis bersama PRD P0-2 (PRD §10 baris 2b).
  test.fixme('langkah 4 — staf yang diundang & ditugaskan melihat perikatannya', async () => {});

  // KARANTINA s/d 2026-12-31 — P0-4 (+P0-1): StateDoc `clients` firma segar tak pernah ditulis
  // (tulisan ke FIRM-WHR ditolak). Begitu P0-1 diperbaiki, tulisan pertama akan memuat 8 klien
  // demo (Fase 1 G1-d) dan partner demo yang dipaku blankClient() (view_firm.tsx:224).
  test('langkah 5 — StateDoc firma segar memuat klien barunya dan NOL entitas demo', async ({ page }) => {
    await login(page, ADMIN);
    const c = await createClientViaUi(page, 'PT Uji Segar Bersih');

    const doc = await stateGetSafe(page, { scope: 'firm', scopeId: FRESH_FIRM.id, key: 'clients' });
    const json = doc.ok ? JSON.stringify(doc.data.value ?? null) : '';
    expect({
      readable: doc.ok,
      written: doc.ok && Number(doc.data.version) > 0,
      hasNewClient: json.includes(c.name),
      demoMarkersInDoc: demoMarkersIn(json, { withIds: true }),
    }).toEqual({ readable: true, written: true, hasNewClient: true, demoMarkersInDoc: [] });
  });
});
