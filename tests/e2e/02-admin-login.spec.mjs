import { test, expect } from './fixtures.mjs';
import { ADMIN } from '../support/test-env.mjs';
import { openLoginPage } from './helpers.mjs';

test.describe('Login admin', () => {
  test('kode rahasia salah menampilkan pesan dan sisa percobaan', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Control+z');
    await page.getByLabel('Kode rahasia').fill('kode-yang-salah');
    await page.getByRole('button', { name: 'Lanjutkan' }).click();
    await expect(page.locator('.access-error')).toContainText(/Kode rahasia salah\. Sisa \d percobaan/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.access-card')).toBeHidden();
  });

  test('ikon mata menampilkan dan menyembunyikan kode rahasia', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Control+z');
    const input = page.getByLabel('Kode rahasia');
    await input.fill('rahasia-123');
    await expect(input).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: 'Tampilkan kode' }).click();
    await expect(input).toHaveAttribute('type', 'text');
    await expect(input).toHaveValue('rahasia-123');
    await expect(input).toBeFocused(); // fokus tetap di kolom, bisa lanjut mengetik

    await page.getByRole('button', { name: 'Sembunyikan kode' }).click();
    await expect(input).toHaveAttribute('type', 'password');

    // Dibuka ulang → kode kembali tersembunyi.
    await page.getByRole('button', { name: 'Tampilkan kode' }).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+z');
    await expect(page.getByLabel('Kode rahasia')).toHaveAttribute('type', 'password');
  });

  test('Ctrl+Z → kode rahasia → login → dashboard', async ({ page }) => {
    await openLoginPage(page);
    await page.getByPlaceholder('Masukkan username').fill(ADMIN.username);
    await page.getByPlaceholder('Masukkan password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Masuk Dashboard' }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Ringkasan' })).toBeVisible();
    // Masih memakai password bawaan → peringatan keamanan muncul.
    await expect(page.locator('.adm-alert')).toContainText('password bawaan');
  });

  test('password salah ditolak', async ({ page }) => {
    await openLoginPage(page);
    await page.getByPlaceholder('Masukkan username').fill(ADMIN.username);
    await page.getByPlaceholder('Masukkan password').fill('bukan-password');
    await page.getByRole('button', { name: 'Masuk Dashboard' }).click();
    await expect(page.locator('.auth-error')).toContainText('Username atau password salah');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('dashboard tanpa login dialihkan ke login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).not.toHaveURL(/\/admin\/dashboard$/);
  });
});
