import { test, expect } from './fixtures.mjs';
import { loginByApi } from './helpers.mjs';

test.describe('Menu samping admin (laci)', () => {
  test('tersembunyi di awal, keluar saat tombol menu ditekan, lalu bisa ditutup', async ({ page, request }) => {
    await loginByApi(page, request);
    const drawer = page.locator('.adm-side');
    const menuBtn = page.getByRole('button', { name: 'Buka menu' });

    // Awal: laci tersembunyi, tombol menu terlihat.
    await expect(drawer).not.toHaveClass(/is-open/);
    await expect(page.locator('.adm-nav').getByRole('button', { name: 'Kamar' })).toBeHidden();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    // Ditekan: laci keluar beserta semua menunya.
    await menuBtn.click();
    await expect(drawer).toHaveClass(/is-open/);
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['Ringkasan', 'Kamar', 'Lokasi', 'Peraturan', 'Pembayaran', 'Riwayat status', 'Profil admin']) {
      await expect(page.locator('.adm-nav').getByRole('button', { name })).toBeVisible();
    }
    await expect(drawer.getByRole('button', { name: 'Keluar' })).toBeVisible();

    // Esc menutup.
    await page.keyboard.press('Escape');
    await expect(drawer).not.toHaveClass(/is-open/);

    // Area gelap menutup.
    await menuBtn.click();
    await expect(drawer).toHaveClass(/is-open/);
    await page.mouse.click(page.viewportSize().width - 20, 400);
    await expect(drawer).not.toHaveClass(/is-open/);

    // Tombol × menutup, dan memilih menu langsung pindah halaman + menutup laci.
    await menuBtn.click();
    await drawer.getByRole('button', { name: 'Tutup menu' }).click();
    await expect(drawer).not.toHaveClass(/is-open/);
    await menuBtn.click();
    await page.locator('.adm-nav').getByRole('button', { name: 'Lokasi' }).click();
    await expect(page.getByRole('heading', { name: 'Lokasi', level: 1 })).toBeVisible();
    await expect(drawer).not.toHaveClass(/is-open/);
  });
});
