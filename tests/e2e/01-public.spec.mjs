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
});
