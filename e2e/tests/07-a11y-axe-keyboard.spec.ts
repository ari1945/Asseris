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
import { gotoModule, login, USERS } from '../helpers';

const CRITICAL_GATE = true; // gerbang CI: zero impact "critical"
const SERIOUS_LOG = true;   // lapor serious ke console untuk triase

/* Penjaga runtime untuk kelas cacat yang TAK dapat diputuskan pemindai sumber:
   id kontrol form yang kembar. `React.useId()` unik per instans komponen, bukan
   per iterasi, sehingga sebuah `.field` di dalam `.map()` bisa memberi id yang
   sama ke seluruh baris — dan setiap <label htmlFor> lalu menunjuk kontrol
   PERTAMA saja. Di DOM hidup ini sepele diperiksa. */
async function assertNoDuplicateControlIds(page: import('@playwright/test').Page, label: string) {
  const dupes = await page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const el of Array.from(document.querySelectorAll('input[id], select[id], textarea[id]'))) {
      const id = el.getAttribute('id') || '';
      seen.set(id, (seen.get(id) || 0) + 1);
    }
    return Array.from(seen.entries()).filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
  });
  expect(dupes, `${label}: id kontrol form kembar — <label htmlFor> hanya akan menunjuk yang pertama`).toEqual([]);
}

async function scanAndAssert(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    // Aturan yang sengaja dimatikan: kontras adalah keputusan desain yang sudah
    // di-audit terpisah (PRD Quick-Win Desain Visual), dan heading-order/region
    // belum ditargetkan di Tahap 9 ini.
    .disableRules(['color-contrast', 'heading-order', 'region'])
    .analyze();

  const critical = results.violations.filter((v) => v.impact === 'critical');
  const serious = results.violations.filter((v) => v.impact === 'serious');

   
  console.log(`[axe] ${label}: ${results.violations.length} pelanggaran ` +
    `(critical=${critical.length}, serious=${serious.length})`);
  for (const v of results.violations) {
     
    console.log(`[axe]   ${v.impact} ${v.id}: ${v.help} — ${v.nodes.length} node`);
  }

  if (CRITICAL_GATE) {
    expect(critical, `axe ${label}: pelanggaran critical tidak boleh ada`).toHaveLength(0);
  }
  await assertNoDuplicateControlIds(page, label);
  if (SERIOUS_LOG && serious.length > 0) {
     
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

  // Toggle posting jurnal GL firma: kontrol paling berkonsekuensi di aplikasi —
  // sejak PR #241 memposting jurnal menggeser SELURUH angka keuangan firma
  // (Firm Finance, BI, Treasury, Dashboard). Sampai 2026-08-15 ia dirender
  // <span onClick>: tak ada di pohon aksesibilitas, tak fokusable, mustahil
  // dioperasikan keyboard. Uji ini memaku bentuk NATIVE-nya (CLAUDE.md §3.7).
  test('smoke keyboard: toggle posting jurnal GL firma adalah <button> native', async ({ page }) => {
    // Partner memegang FIRMFIN_EDIT; peran tanpa kapabilitas melihat badge statis.
    await login(page, USERS.partner);
    await gotoModule(page, 'firmgl');

    // Sengaja dicari lewat PERAN + nama aksesibel: locator ini hanya resolve bila
    // kontrolnya benar-benar ada di pohon aksesibilitas — persis yang dulu gagal.
    const toggle = page.getByRole('button', { name: /jurnal JV-0307/ });
    await expect(toggle).toBeVisible();

    // 1) Elemennya <button> asli, bukan <span role="button"> yang menipu getByRole.
    await expect(toggle).toHaveJSProperty('tagName', 'BUTTON');

    // 2) Nama aksesibel diawali teks pil yang terlihat (WCAG 2.5.3 Label-in-Name),
    //    lalu identitas jurnal — pembaca layar tahu jurnal MANA yang diposting.
    await expect(toggle).toHaveAccessibleName(/^Draft — jurnal JV-0307/);

    // 3) Fokusable lewat keyboard.
    await toggle.focus();
    await expect(toggle).toBeFocused();

    // 4) Enter memposting jurnal — badge berubah Draft → Posted.
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveText('Posted');
    await expect(toggle).toHaveAccessibleName(/^Posted — jurnal JV-0307/);

    // 5) Space membatalkan posting — kembali ke Draft (state awal dipulihkan).
    await toggle.press('Space');
    await expect(toggle).toHaveText('Draft');

    // 6) Halaman GL masuk gerbang axe. Diverifikasi hidup 2026-08-15 sesudah
    //    perbaikan: 0 critical, 0 serious (sisa 1 moderate landmark-one-main,
    //    utang app-wide di luar cakupan aturan yang digerbangi).
    await scanAndAssert(page, 'firm general ledger');
  });

  // Dialog "Jurnal Baru" (FirmJVForm) dulu merakit `position:fixed` tangan:
  // tanpa role=dialog, focus trap, Escape, scroll-lock, maupun penjagaan
  // perubahan belum tersimpan — pelanggaran CLAUDE.md §5. Karena tak pernah
  // dapat dipindai, TIGA pelanggaran critical axe bersembunyi di dalamnya
  // (label Jumlah + nama kedua <select> akun). Uji ini mengunci keduanya.
  test('dialog Jurnal Baru memenuhi kontrak <Overlay> (aria · Escape · penjaga perubahan)', async ({ page }) => {
    await login(page, USERS.partner);
    await gotoModule(page, 'firmgl');

    const trigger = page.getByRole('button', { name: 'Jurnal Baru' });
    await trigger.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAccessibleName(/Jurnal Umum Firma/);

    // Tiap kontrol form punya nama aksesibel. <label> di sini BERSAUDARA dengan
    // kontrolnya, jadi tanpa pasangan htmlFor/id kaitannya cuma visual —
    // getByLabel tidak akan resolve. Ini repro langsung ketiga critical tadi.
    await expect(page.getByLabel('Keterangan')).toBeVisible();
    await expect(page.getByLabel('Akun Debit')).toBeVisible();
    await expect(page.getByLabel('Akun Kredit')).toBeVisible();
    await expect(page.getByLabel('Jumlah (Rp)')).toBeVisible();

    // axe DENGAN dialog terbuka — keadaan yang sebelumnya mustahil dipindai.
    await scanAndAssert(page, 'dialog jurnal baru');

    // Escape pada form BERSIH menutup langsung.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    // Form KOTOR: Escape TIDAK menutup — muncul konfirmasi buang-perubahan.
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.getByLabel('Keterangan').fill('Uji penjaga perubahan');
    await page.keyboard.press('Escape');
    await expect(page.getByText('Ada perubahan yang belum tersimpan', { exact: false })).toBeVisible();

    // "Kembali menyunting" mengembalikan form dengan isian UTUH.
    await page.getByRole('button', { name: 'Kembali menyunting' }).click();
    await expect(page.getByLabel('Keterangan')).toHaveValue('Uji penjaga perubahan');

    // "Buang perubahan" menutup semuanya dan MEMULIHKAN fokus ke pemicu.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Buang perubahan' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  // Modul `orgchart` (Struktur Organisasi). Sampai 2026-08-21 simpul bagan
  // adalah <span onClick> dan kartu anggota tab "Divisi" <div onClick>: SELURUH
  // interaksi modul — memilih orang untuk melihat detailnya — mustahil tanpa
  // tetikus, dan keduanya menggagalkan axe. Uji ini memaku bentuk NATIVE-nya
  // dan membuktikan Enter benar-benar berdampak (aria-pressed + panel detail).
  test('smoke keyboard: simpul bagan organisasi <button>, Enter memilih orangnya', async ({ page }) => {
    await login(page, USERS.manager);
    await gotoModule(page, 'orgchart');

    const node = page.locator('.org-node').nth(1);   // seorang bawahan, bukan puncak
    await expect(node).toBeVisible();
    await expect(node).toHaveJSProperty('tagName', 'BUTTON');

    const nama = ((await node.getAttribute('title')) || '').replace(/^Pilih /, '').split(' \u2014 ')[0];
    expect(nama.length, 'simpul bagan tanpa judul yang menyebut orangnya').toBeGreaterThan(0);

    // Hadir di pohon aksesibilitas dengan nama orangnya — persis yang dulu gagal.
    const byRole = page.getByRole('button', { name: new RegExp(nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    await expect(byRole.first()).toBeVisible();

    await node.focus();
    await expect(node).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(node).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.view-pad')).toContainText(nama);

    await scanAndAssert(page, 'struktur organisasi (bagan)');
  });

  // Tab "Divisi" dulu menurunkan daftar divisi dari `Object.keys(DEPT_HEAD)`
  // (4 kepala divisi) alih-alih dari nilai `dept` pada ORG (5 divisi), sehingga
  // Managing Partner — satu-satunya anggota 'Kepemimpinan Firma' — TIDAK PERNAH
  // muncul, tanpa satu pun tanda bahwa ada yang tidak terhitung.
  test('tab Divisi: divisi tanpa kepala tetap tampil & kartunya dapat dipilih keyboard', async ({ page }) => {
    await login(page, USERS.manager);
    await gotoModule(page, 'orgchart');
    await page.getByRole('button', { name: 'Divisi', exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('.view-pad')).toContainText('Kepemimpinan Firma');
    await expect(page.locator('.view-pad')).toContainText('kepala divisi belum ditetapkan');

    const kartu = page.locator('.org-member').first();
    await expect(kartu).toHaveJSProperty('tagName', 'BUTTON');
    await kartu.focus();
    await expect(kartu).toBeFocused();
    await kartu.press('Enter');
    await expect(kartu).toHaveAttribute('aria-pressed', 'true');

    await scanAndAssert(page, 'struktur organisasi (divisi)');
  });

  // Modul `succession` (Suksesi & Karier). Sampai 2026-08-21 memilih peran kunci
  // — satu-satunya interaksi utama modul — hanya mungkin lewat <tr onClick>:
  // baris tabel tidak fokusable dan tidak menanggapi Enter/Space.
  // Modul butuh CAP.HR_MODULE_VIEW → login sebagai Partner.
  test('smoke keyboard: peran kunci dipilih lewat <button>, Enter mengubah panel kandidat', async ({ page }) => {
    await login(page, USERS.partner);
    await gotoModule(page, 'succession');

    const baris = page.locator('.pc-rowbtn').nth(1);   // bukan peran yang sudah terpilih
    await expect(baris).toBeVisible();
    await expect(baris).toHaveJSProperty('tagName', 'BUTTON');

    const nama = ((await baris.getAttribute('title')) || '').replace(/^Pilih peran /, '');
    expect(nama.length, 'tombol peran tanpa judul yang menyebut perannya').toBeGreaterThan(0);

    await baris.focus();
    await expect(baris).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(baris).toHaveAttribute('aria-pressed', 'true');
    // panel kandidat di kanan benar-benar berpindah ke peran itu
    await expect(page.locator('.view-pad')).toContainText(nama);

    await scanAndAssert(page, 'suksesi & karier (peta suksesi)');
  });

  // Kontradiksi klaim-vs-bukti dulu disampaikan lewat satu glyph "⚠" tanpa nama
  // aksesibel, dengan penjelasan yang hanya hidup di atribut `title` pada <span>
  // non-fokusabel. Sekarang ia teks: klaim, turunan, dan pemblokir ter-enumerasi.
  test('kontradiksi kesiapan disampaikan sebagai teks, bukan glyph', async ({ page }) => {
    await login(page, USERS.partner);
    await gotoModule(page, 'succession');

    const pad = page.locator('.view-pad');
    await expect(pad).toContainText('Klaim Dibantah Bukti');            // KPI
    await expect(pad).toContainText('Klaim kesiapan yang dibantah bukti'); // daftar
    await expect(pad).toContainText('Data mengklaim');
    await expect(pad).toContainText('bukti menurunkan');
    await expect(pad, 'makna tidak boleh dibawa glyph telanjang').not.toContainText('⚠');

    await scanAndAssert(page, 'suksesi & karier (kontradiksi)');
  });
});
