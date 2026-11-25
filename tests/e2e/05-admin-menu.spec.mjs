import { test, expect } from './fixtures.mjs';
import { loginByApi, openTab } from './helpers.mjs';
import { statSync } from 'node:fs';
import path from 'node:path';
import { TMP_DIR } from '../support/test-env.mjs';

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

  test('saat digulir ke bawah, tombol menu tetap ada di bilah atas', async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await loginByApi(page, request);
    const bar = page.locator('.adm-stickybar');
    await expect(bar).toBeHidden(); // di atas halaman cukup tombol menu biasa

    await page.mouse.wheel(0, 2000);
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('Ringkasan');
    const y = await page.evaluate(() => scrollY);
    expect(y).toBeGreaterThan(0);

    // Dibuka dari bilah atas tanpa perlu menggulir ke atas.
    await bar.getByRole('button', { name: 'Buka menu' }).click();
    await expect(page.locator('.adm-side')).toHaveClass(/is-open/);
    expect(await page.evaluate(() => scrollY)).toBe(y);

    // Pindah menu: halaman baru dimulai dari atas.
    await page.locator('.adm-nav').getByRole('button', { name: 'Pembayaran' }).click();
    await expect(page.getByRole('heading', { name: 'Pembayaran', level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await expect(bar).toBeHidden();
  });

  test('tombol status kamar memberi tahu bila gagal tersimpan', async ({ page, request }) => {
    await loginByApi(page, request);
    await page.route('**/api/kamar/*/status', route => route.fulfill({ status: 500, contentType: 'text/html', body: '<h1>Bad gateway</h1>' }));
    await page.locator('.adm-switch').first().click();
    await expect(page.locator('.adm-toast')).toContainText('Gagal: Server sedang bermasalah');
  });

  test('angka ringkasan pembayaran yang panjang tidak menabrak kolom sebelahnya', async ({ page, request }) => {
    await loginByApi(page, request);
    await openTab(page, 'Pembayaran');
    await expect(page.locator('.adm-stats dd').first()).toContainText('Rp');
    const over = await page.evaluate(() => [...document.querySelectorAll('.adm-stats > div')].map(c => {
      const dd = c.querySelector('dd');
      dd.textContent = 'Rp12.500.000';
      const r = document.createRange(); r.selectNodeContents(dd);
      return r.getBoundingClientRect().right - (c.getBoundingClientRect().right - parseFloat(getComputedStyle(c).paddingRight));
    }));
    for (const px of over) expect(px).toBeLessThanOrEqual(1);
  });

  test('tab lokasi yang dipilih di halaman Peraturan tetap terbaca', async ({ page, request }) => {
    await loginByApi(page, request);
    await openTab(page, 'Peraturan');
    const tabs = page.locator('.adm-rule-tabs button');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveClass(/is-active/);
    // tunggu animasi warna selesai: tulisan putih di atas latar gelap
    const look = () => tabs.nth(1).evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
    await expect.poll(async () => (await look()).color).toBe('rgb(255, 255, 255)');
    await expect.poll(async () => { const [r, g, b] = (await look()).bg.match(/\d+/g).map(Number); return r + g + b; }).toBeLessThan(200);
  });

  test('foto besar dari kamera diperkecil sebelum diunggah', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'laptop', 'cukup sekali');
    await loginByApi(page, request);
    // Buat foto PNG besar (3000×2000, berisi noise agar ukurannya besar seperti foto kamera).
    const base64 = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
      const ctx = c.getContext('2d'); const img = ctx.createImageData(3000, 2000);
      for (let i = 0; i < img.data.length; i++) img.data[i] = (i % 4 === 3) ? 255 : (Math.random() * 255) | 0;
      ctx.putImageData(img, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    });
    const original = Buffer.from(base64, 'base64');
    expect(original.length).toBeGreaterThan(4 * 1024 * 1024);
    await page.locator('.adm-table tbody tr').filter({ hasText: 'Kamar B1' }).getByRole('button', { name: /Ubah|Edit/ }).first().click();
    await page.locator('.adm-photo-add input[type=file]').setInputFiles({ name: 'kamera.png', mimeType: 'image/png', buffer: original });
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.locator('.adm-toast')).toContainText('berhasil disimpan');
    const room = await (await request.get('http://localhost:3101/api/kamar/4')).json();
    const uploaded = room.photos.at(-1);
    expect(uploaded).toMatch(/^\/uploads\/.+\.jpg$/);
    const size = statSync(path.join(TMP_DIR, 'e2e-uploads', path.basename(uploaded))).size;
    expect(size).toBeLessThan(1.5 * 1024 * 1024);
  });

  test('form kamar: foto bisa dihapus dan dijadikan sampul', async ({ page, request }) => {
    await loginByApi(page, request);
    await page.locator('.adm-table tbody tr').filter({ hasText: 'Kamar B2' }).getByRole('button', { name: /Ubah|Edit/ }).first().click();
    const list = page.locator('.adm-photo-list li');
    const n = await list.count();
    expect(n).toBeGreaterThanOrEqual(2);
    const second = await list.nth(1).locator('img').getAttribute('src');
    await list.nth(1).getByRole('button', { name: 'Jadikan sampul' }).click();
    await expect(list.first().locator('img')).toHaveAttribute('src', second);
    await page.getByRole('button', { name: `Hapus foto ${n}` }).click();
    await expect(list).toHaveCount(n - 1);
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.locator('.adm-toast')).toContainText('berhasil disimpan');
    const room = await (await request.get('http://localhost:3101/api/kamar/5')).json();
    expect(room.photos.length).toBe(n - 1);
    expect(room.foto).toBe(second);
  });
});
