import { expect } from '@playwright/test';
import { ACCESS_CODE, ADMIN } from '../support/test-env.mjs';

export const API = 'http://localhost:3101';

/** Buka jendela kode rahasia dengan Ctrl+Z dan masuk ke halaman login. */
export async function openLoginPage(page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Control+z');
  await page.getByLabel('Kode rahasia').fill(ACCESS_CODE);
  await page.getByRole('button', { name: 'Lanjutkan' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
}

/** Login lewat API (lebih cepat) lalu buka dashboard dengan token tersebut. */
export async function loginByApi(page, request) {
  const ticket = (await (await request.post(`${API}/api/auth/admin-access`, { data: { code: ACCESS_CODE } })).json()).token;
  const { token } = await (await request.post(`${API}/api/auth/login`, { data: ADMIN, headers: { Authorization: `Bearer ${ticket}` } })).json();
  await page.goto('/');
  await page.evaluate(t => localStorage.setItem('kp_token', t), token);
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: 'Ringkasan' })).toBeVisible();
  return token;
}

/** Buka laci menu admin (tombol menu), pilih menu, lalu tunggu laci tertutup lagi. */
export async function openTab(page, name, { tap = false } = {}) {
  // Kalau halaman sudah digulir, tombol menu yang terjangkau ada di bilah atas yang menempel.
  const sticky = page.locator('.adm-stickybar.is-shown').getByRole('button', { name: 'Buka menu' });
  const menuBtn = (await sticky.count()) ? sticky : page.locator('.adm-head').getByRole('button', { name: 'Buka menu' });
  await (tap ? menuBtn.tap() : menuBtn.click());
  const item = page.locator('.adm-side.is-open .adm-nav').getByRole('button', { name });
  await (tap ? item.tap() : item.click());
  await expect(page.locator('.adm-side')).not.toHaveClass(/is-open/);
}
