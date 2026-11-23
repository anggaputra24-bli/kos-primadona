import { test, expect } from './fixtures.mjs';

test.describe('Website publik', () => {
  test('beranda menampilkan katalog kamar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
  });

  test('nama penghuni tidak tampil di website publik', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Dimas Pratama');

    await page.goto('/kamar/3');
    await expect(page.getByRole('heading', { name: 'Kamar A3' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Dimas Pratama');
  });

  test('halaman login admin tidak bisa dibuka tanpa kode rahasia', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page).not.toHaveURL(/\/admin\/login$/);
  });

  test('navbar menghilang ke atas saat digulir ke bawah dan muncul lagi saat digulir ke atas', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
    const header = page.locator('.site-header');
    const logo = header.locator('.site-logo');
    await expect(header).not.toHaveClass(/is-hidden/);

    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(header).toHaveClass(/is-hidden/);
    await expect.poll(async () => (await logo.boundingBox()).y + (await logo.boundingBox()).height).toBeLessThanOrEqual(0);

    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(header).not.toHaveClass(/is-hidden/);
    await expect.poll(async () => (await logo.boundingBox()).y).toBeGreaterThan(0);
  });

  test('intro pembuka: logo besar lalu tirai terangkat ke website, hanya sekali per sesi', async ({ page }) => {
    await page.addInitScript(() => { if (!sessionStorage.getItem('intro-test')) { sessionStorage.removeItem('kp_intro_seen'); sessionStorage.setItem('intro-test', '1'); } });
    await page.goto('/');
    const intro = page.locator('.lx-intro');
    await expect(intro).toBeVisible();
    await expect(intro.locator('.lx-intro-mark')).toBeVisible();
    await expect(intro.locator('.lx-intro-name')).toHaveText('Kos Primadona');
    await expect(intro).toBeHidden({ timeout: 5000 }); // tirai terangkat sendiri
    await expect(page.getByText('Kamar A1').first()).toBeVisible();

    // Dibuka lagi di sesi yang sama: langsung ke website.
    await page.reload();
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
    await expect(intro).toHaveCount(0);
  });

  test('membuka website selalu mulai dari halaman utama, bukan dari Daftar kamar', async ({ page }) => {
    // Alamat lama berakhiran #kamar (mis. dari bookmark / riwayat): tetap mulai dari atas.
    await page.goto('/#kamar');
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page).toHaveURL(/\/$/);

    // Refresh setelah menggulir: tetap mulai dari atas.
    await page.evaluate(() => window.scrollTo(0, 2500));
    await page.reload();
    await expect(page.getByText('Kamar A1').first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // Link "Kembali ke daftar kamar" di halaman detail tetap membawa ke Daftar kamar.
    await page.goto('/kamar/1');
    await page.getByRole('link', { name: 'Kembali ke daftar kamar' }).click();
    await expect.poll(() => page.evaluate(() => document.querySelector('#kamar')?.getBoundingClientRect().top ?? 9999)).toBeLessThan(200);
  });

  test('intro pembuka bisa dilewati dengan sekali ketuk', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem('kp_intro_seen'));
    await page.goto('/');
    const intro = page.locator('.lx-intro');
    await expect(intro).toBeVisible();
    await expect(intro).not.toHaveClass(/is-out/);
    await intro.click({ position: { x: 20, y: 20 } });
    await expect(intro).toHaveClass(/is-out/, { timeout: 500 }); // tirai langsung terangkat
    await expect(intro).toBeHidden();
  });
});
