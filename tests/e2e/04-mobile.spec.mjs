// Tes tampilan HP. Dijalankan pada proyek "iPhone 17" dan "iPhone 17 Pro Max" (WebKit/Safari, layar sentuh).
// Screenshot setiap layar disimpan ke tests/.tmp/screens/ dan dilampirkan di laporan HTML.
import { test, expect } from './fixtures.mjs';
import path from 'node:path';
import { TMP_DIR, ACCESS_CODE, ADMIN } from '../support/test-env.mjs';
import { loginByApi, openTab } from './helpers.mjs';

const noHorizontalScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function capture(page, testInfo, name) {
  const file = path.join(TMP_DIR, 'screens', `${testInfo.project.name.replace(/\s+/g, '-')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}

async function expectInsideScreen(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const { width } = page.viewportSize();
  expect(box.x, 'tidak terpotong di kiri').toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, 'tidak terpotong di kanan').toBeLessThanOrEqual(width);
}

test.describe('Login admin dari HP', () => {
  // Seperti jari sungguhan: ketuk berulang di titik logo tanpa menunggu animasi apa pun.
  const tapLogo = async (page, times) => {
    const logo = page.locator('.site-header .site-logo');
    await expect(logo).toBeVisible();
    await page.locator('.lx-intro').waitFor({ state: 'detached' }).catch(() => {});
    const box = await logo.boundingBox();
    for (let i = 0; i < times; i++) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  };

  test('4 kali ketuk logo belum membuka akses (pengunjung biasa aman)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
    await tapLogo(page, 4);
    await expect(page.locator('.access-card')).toBeHidden();
  });

  test('ketukan ke-6 yang agak pelan tidak menutup jendela kode rahasia', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
    const logo = page.locator('.site-header .site-logo');
    const box = await logo.boundingBox();
    const tap = () => page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    // Jam dibuat tetap agar jeda antar ketukan pasti, walau komputer tes sedang sibuk.
    const t0 = Date.now();
    for (let i = 0; i < 5; i++) { await page.clock.setFixedTime(t0 + i * 250); await tap(); }
    await expect(page.locator('.access-card')).toBeVisible();
    // jari yang lambat: ketukan ke-6 datang 0,8 detik setelah jendela terbuka (dulu menutup jendela)
    await page.clock.setFixedTime(t0 + 4 * 250 + 800);
    await tap();
    await page.waitForTimeout(300);
    await expect(page.locator('.access-card')).toBeVisible();
    // ketukan di luar jendela setelah >1 detik tetap menutupnya seperti biasa
    await page.clock.setFixedTime(t0 + 4 * 250 + 2500);
    await tap();
    await expect(page.locator('.access-card')).toBeHidden();
  });

  test('ketuk logo 5 kali → kode rahasia → login → dashboard', async ({ page }, testInfo) => {
    await page.goto('/kamar/1'); // bisa dari halaman mana pun yang punya header
    await expect(page.getByRole('heading', { name: 'Kamar A1' })).toBeVisible();
    await page.locator('.site-header .site-logo').tap(); // ketukan pertama membawa ke beranda
    await expect(page.locator('.lx-hero')).toBeVisible();
    await tapLogo(page, 5);
    await expect(page.locator('.access-card')).toBeVisible();
    await capture(page, testInfo, '0-akses-dari-logo');

    await page.getByLabel('Kode rahasia').fill(ACCESS_CODE);
    await page.getByRole('button', { name: 'Lanjutkan' }).tap();
    await expect(page).toHaveURL(/\/admin\/login$/);

    await page.getByPlaceholder('Masukkan username').fill(ADMIN.username);
    await page.getByPlaceholder('Masukkan password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Masuk Dashboard' }).tap();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Ringkasan' })).toBeVisible();
  });
});

test.describe('Tampilan HP', () => {
  test('beranda pas di layar dan kartu kamar bisa disentuh', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await capture(page, testInfo, '1-beranda');

    await page.getByText('Kamar A1').first().tap();
    await expect(page.getByRole('heading', { name: 'Kamar A1' })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await capture(page, testInfo, '2-detail-kamar');
  });

  test('dashboard admin bisa dipakai dengan sentuhan', async ({ page, request }, testInfo) => {
    await loginByApi(page, request);
    expect(await noHorizontalScroll(page)).toBe(true);
    await capture(page, testInfo, '3-dashboard');

    // Menu dashboard berupa laci yang dibuka dengan tombol menu (bisa disentuh).
    await openTab(page, 'Pembayaran', { tap: true });
    await expect(page.getByRole('heading', { name: 'Pembayaran' })).toBeVisible();
    await expect(page.locator('.bill').first()).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await expectInsideScreen(page, page.locator('.bill').first().locator('.bill-actions .btn').last());
    await capture(page, testInfo, '4-pembayaran');

    // Form catat bayar tersusun satu kolom dan tombolnya terjangkau.
    await page.locator('.bill').first().getByRole('button', { name: 'Catat bayar' }).tap();
    const form = page.locator('.bill-form');
    await expect(form).toBeVisible();
    await expectInsideScreen(page, form.getByRole('button', { name: 'Simpan pembayaran' }));
    await capture(page, testInfo, '5-form-catat-bayar');
    await form.getByRole('button', { name: 'Batal' }).tap();

    await openTab(page, 'Profil admin');
    await expect(page.getByRole('heading', { name: 'Profil admin' })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await capture(page, testInfo, '6-profil');
  });
});
