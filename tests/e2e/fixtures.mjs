// `test` khusus E2E: foto Unsplash, peta Google, dan font Google diganti tiruan lokal
// supaya hasil tes tidak bergantung pada kecepatan internet.
import { test as base, expect } from '@playwright/test';

const PHOTO = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="#2b3e45"/></svg>';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/images\.unsplash\.com|placehold\.co/, route =>
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: PHOTO }));
    await page.route(/google\.com\/maps|maps\.google/, route =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>peta</title>' }));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    // Intro pembuka dilewati di tes biasa (diuji tersendiri di 01-public: hapus tanda ini dengan addInitScript).
    await page.addInitScript(() => { try { sessionStorage.setItem('kp_intro_seen', '1'); } catch {} });
    await use(page);
  },
});

export { expect };
