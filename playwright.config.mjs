// Konfigurasi tes E2E (browser). Jalankan: npm run test:e2e
// Backend tes (port 3101) dan frontend tes (port 5180) dijalankan otomatis dengan data contoh baru,
// terpisah dari server dev (3001/5173) dan dari backend/data.json milik Anda.
import { defineConfig, devices } from '@playwright/test';

const API_PORT = 3101;
const WEB_PORT = 5180;
// Default memakai Google Chrome yang sudah terpasang. Kalau tidak ada Chrome:
//   npx playwright install chromium   lalu jalankan dengan PW_CHANNEL=chromium
const channel = process.env.PW_CHANNEL === 'chromium' ? undefined : (process.env.PW_CHANNEL || 'chrome');

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1, // semua tes memakai satu server & data yang sama, jadi dijalankan berurutan
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/.tmp/playwright-report' }]],
  outputDir: 'tests/.tmp/test-results',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // Laptop: semua alur (login, pembayaran, WhatsApp) di Google Chrome.
      name: 'laptop',
      testIgnore: /mobile\.spec/,
      use: { channel, viewport: { width: 1280, height: 900 } },
    },
    // iPhone: memakai WebKit (mesin Safari) dengan ukuran layar, layar sentuh, dan retina iPhone.
    // Butuh sekali pasang: npx playwright install webkit
    {
      name: 'iPhone 17',
      testMatch: /(public|mobile)\.spec/,
      use: { ...devices['iPhone 17'] },
    },
    {
      name: 'iPhone 17 Pro Max',
      testMatch: /(public|mobile)\.spec/,
      use: { ...devices['iPhone 17 Pro Max'] },
    },
  ],
  webServer: [
    {
      command: `node tests/support/start-server.mjs e2e ${API_PORT}`,
      url: `http://localhost:${API_PORT}/api/lokasi`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npx vite frontend --config frontend/vite.config.mjs --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
