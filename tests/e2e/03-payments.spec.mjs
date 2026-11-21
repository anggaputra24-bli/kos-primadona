import { test, expect } from './fixtures.mjs';
import { API, loginByApi, openTab } from './helpers.mjs';

test.describe('Pembayaran & WhatsApp', () => {
  test('penghuni tanpa nomor HP diarahkan untuk mengisi nomor', async ({ page, request }) => {
    await loginByApi(page, request);
    await openTab(page, 'Pembayaran');
    const row = page.locator('.bill', { hasText: 'Nadia Putri' });
    await row.getByRole('button', { name: 'Isi no. HP' }).click();
    await expect(page.getByRole('heading', { name: 'Ubah Kamar B3' })).toBeVisible();
  });

  test('catat bayar, kirim bukti via WhatsApp, lalu batalkan', async ({ page, request }) => {
    const token = await loginByApi(page, request);
    await request.put(`${API}/api/kamar/3/penghuni`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tenant: 'Dimas Pratama', tenant_phone: '081234567890', due_day: 5 },
    });

    await openTab(page, 'Pembayaran');
    const row = page.locator('.bill', { hasText: 'Dimas Pratama' });
    await expect(row).toBeVisible();

    // Tombol pengingat membuka WhatsApp ke nomor penghuni dengan pesan yang sesuai.
    const remind = row.getByRole('link', { name: 'Ingatkan' });
    const remindUrl = new URL(await remind.getAttribute('href'));
    expect(remindUrl.origin + remindUrl.pathname).toBe('https://wa.me/6281234567890');
    const remindText = remindUrl.searchParams.get('text');
    expect(remindText).toContain('Halo Dimas Pratama');
    expect(remindText).toContain('Kamar A3');
    expect(remindText).toContain('Rp950.000');

    // Catat pembayaran.
    await row.getByRole('button', { name: 'Catat bayar' }).click();
    await expect(row.getByLabel('Jumlah (Rp)')).toHaveValue('950000');
    await row.getByLabel('Metode').selectOption('transfer');
    await row.getByRole('button', { name: 'Simpan pembayaran' }).click();

    await expect(page.locator('.adm-toast')).toContainText('Pembayaran Kamar A3');
    await expect(row.locator('.chip')).toHaveText('Lunas');
    await expect(row).toContainText('Transfer');

    // Setelah lunas, tombol WhatsApp berubah jadi kirim bukti pembayaran.
    const proofText = new URL(await row.getByRole('link', { name: 'Kirim bukti' }).getAttribute('href')).searchParams.get('text');
    expect(proofText).toContain('sudah kami terima');

    // Batalkan catatan pembayaran.
    page.once('dialog', dialog => dialog.accept());
    await row.getByRole('button', { name: 'Batalkan pembayaran' }).click();
    await expect(page.locator('.adm-toast')).toContainText('dibatalkan');
    await expect(row.locator('.chip')).not.toHaveText('Lunas');
  });

  test('ringkasan di dashboard ikut berubah setelah pembayaran', async ({ page, request }) => {
    await loginByApi(page, request);
    const received = page.locator('.adm-stats > div', { hasText: 'Diterima bulan ini' });
    await expect(received.locator('dd')).toHaveText('Rp0');

    await openTab(page, 'Pembayaran');
    const row = page.locator('.bill', { hasText: 'Nadia Putri' });
    await row.getByRole('button', { name: 'Catat bayar' }).click();
    await row.getByRole('button', { name: 'Simpan pembayaran' }).click();
    await expect(row.locator('.chip')).toHaveText('Lunas');

    await openTab(page, 'Ringkasan');
    await expect(received.locator('dd')).toHaveText('Rp1.000.000');
  });
});
