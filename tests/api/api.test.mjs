// Tes API backend. Jalankan: npm test
// Backend dijalankan di port 3102 dengan data contoh baru, jadi data asli tidak berubah.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT, ACCESS_CODE, ADMIN } from '../support/test-env.mjs';

const PORT = 3102;
const BASE = `http://localhost:${PORT}`;
let server;

const call = async (method, url, { body, token } = {}) => {
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + url, {
    method,
    headers: { ...(isForm || !body ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
};
const accessTicket = async () => (await call('POST', '/api/auth/admin-access', { body: { code: ACCESS_CODE } })).body.token;
const login = async (password = ADMIN.password) =>
  call('POST', '/api/auth/login', { body: { username: ADMIN.username, password }, token: await accessTicket() });
const thisPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

before(async () => {
  server = spawn(process.execPath, [path.join(ROOT, 'tests/support/start-server.mjs'), 'api', String(PORT)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
  for (let i = 0; i < 80; i++) {
    try { await fetch(`${BASE}/api/lokasi`); return; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error('Server tes tidak berhasil dijalankan');
});
after(() => server?.kill());

describe('Website publik', () => {
  test('daftar kamar tidak membocorkan data penghuni', async () => {
    const { status, body } = await call('GET', '/api/kamar');
    assert.equal(status, 200);
    assert.ok(body.length > 0);
    for (const room of body) {
      assert.ok(!('tenant' in room) && !('tenant_phone' in room) && !('due_day' in room), `${room.nama_kamar} membocorkan data penghuni`);
    }
  });

  test('detail kamar tidak membocorkan data penghuni', async () => {
    const { body } = await call('GET', '/api/kamar/3');
    assert.equal(body.nama_kamar, 'Kamar A3');
    assert.ok(!('tenant' in body));
  });

  test('endpoint admin menolak tanpa login', async () => {
    for (const url of ['/api/pembayaran', '/api/riwayat-status', '/api/auth/me', '/api/export/excel']) {
      assert.equal((await call('GET', url)).status, 401, url);
    }
  });
});

describe('Login admin', () => {
  test('kode rahasia salah ditolak dan menyebut sisa percobaan', async () => {
    const { status, body } = await call('POST', '/api/auth/admin-access', { body: { code: 'salah' } });
    assert.equal(status, 401);
    assert.match(body.message, /Sisa \d percobaan/);
  });

  test('login tanpa tiket kode rahasia ditolak', async () => {
    const { status } = await call('POST', '/api/auth/login', { body: ADMIN });
    assert.equal(status, 401);
  });

  test('tiket hanya bisa dipakai sekali', async () => {
    const ticket = await accessTicket();
    assert.equal((await call('POST', '/api/auth/login', { body: ADMIN, token: ticket })).status, 200);
    assert.equal((await call('POST', '/api/auth/login', { body: ADMIN, token: ticket })).status, 401);
  });

  test('login berhasil dan menandai password bawaan', async () => {
    const { status, body } = await login();
    assert.equal(status, 200);
    const me = await call('GET', '/api/auth/me', { token: body.token });
    assert.equal(me.body.default_password, true);
  });

  test('admin bisa melihat data penghuni', async () => {
    const { body: { token } } = await login();
    const { body } = await call('GET', '/api/kamar', { token });
    assert.ok(body.some(r => r.tenant === 'Dimas Pratama'));
  });
});

describe('Data penghuni', () => {
  test('nomor HP dinormalkan ke format 62', async () => {
    const { body: { token } } = await login();
    const { status, body } = await call('PUT', '/api/kamar/3/penghuni', { token, body: { tenant: 'Dimas Pratama', tenant_phone: '0812-3456-7890', due_day: 5 } });
    assert.equal(status, 200);
    assert.equal(body.tenant_phone, '6281234567890');
  });

  test('nomor HP tidak valid ditolak', async () => {
    const { body: { token } } = await login();
    const { status } = await call('PUT', '/api/kamar/3/penghuni', { token, body: { tenant: 'Dimas Pratama', tenant_phone: '12', due_day: 5 } });
    assert.equal(status, 400);
  });

  test('unggahan selain gambar ditolak', async () => {
    const { body: { token } } = await login();
    const form = new FormData();
    form.append('nama_kamar', 'Kamar A1');
    form.append('foto', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'jahat.html');
    const { status, body } = await call('PUT', '/api/kamar/1', { token, body: form });
    assert.equal(status, 400);
    assert.match(body.message, /JPG, PNG/);
  });
});

describe('Pembayaran', () => {
  test('catat, cegah dobel, lalu batalkan pembayaran', async () => {
    const { body: { token } } = await login();
    const periode = thisPeriod();

    let { body } = await call('GET', `/api/pembayaran?periode=${periode}`, { token });
    const before = body.tagihan.find(t => t.kamar_id === 3);
    assert.notEqual(before.status, 'lunas');

    const paid = await call('POST', '/api/pembayaran', { token, body: { kamar_id: 3, periode, jumlah: 950000, tanggal: `${periode}-03`, metode: 'transfer' } });
    assert.equal(paid.status, 201);

    const dup = await call('POST', '/api/pembayaran', { token, body: { kamar_id: 3, periode, jumlah: 950000 } });
    assert.equal(dup.status, 409);

    ({ body } = await call('GET', `/api/pembayaran?periode=${periode}`, { token }));
    assert.equal(body.tagihan.find(t => t.kamar_id === 3).status, 'lunas');
    assert.equal(body.ringkasan.diterima, 950000);
    assert.equal(body.tagihan.at(-1).status, 'lunas', 'yang lunas diurutkan paling bawah');

    assert.equal((await call('DELETE', `/api/pembayaran/${paid.body.id}`, { token })).status, 200);
    ({ body } = await call('GET', `/api/pembayaran?periode=${periode}`, { token }));
    assert.notEqual(body.tagihan.find(t => t.kamar_id === 3).status, 'lunas');
  });

  test('jumlah nol dan periode tidak valid ditolak', async () => {
    const { body: { token } } = await login();
    assert.equal((await call('POST', '/api/pembayaran', { token, body: { kamar_id: 6, periode: thisPeriod(), jumlah: 0 } })).status, 400);
    assert.equal((await call('POST', '/api/pembayaran', { token, body: { kamar_id: 6, periode: '2026-13', jumlah: 1000 } })).status, 400);
  });

  test('bulan lampau yang belum dibayar berstatus terlambat', async () => {
    const { body: { token } } = await login();
    const d = new Date();
    const lastMonth = `${new Date(d.getFullYear(), d.getMonth() - 1, 1).getFullYear()}-${String(new Date(d.getFullYear(), d.getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`;
    const { body } = await call('GET', `/api/pembayaran?periode=${lastMonth}`, { token });
    assert.ok(body.tagihan.length > 0);
    assert.ok(body.tagihan.every(t => t.status === 'terlambat'));
  });

  test('unduh Excel menghasilkan file xlsx', async () => {
    const { body: { token } } = await login();
    const res = await fetch(`${BASE}/api/export/excel`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /spreadsheetml/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.equal(String.fromCharCode(bytes[0], bytes[1]), 'PK', 'file xlsx adalah arsip zip');
  });
});

describe('Ganti password', () => {
  test('aturan password dan pencabutan sesi lama', async () => {
    const { body: { token } } = await login();
    const change = body => call('PUT', '/api/auth/profil', { token, body });

    assert.equal((await change({ password: 'abc', password_lama: ADMIN.password })).status, 400, 'terlalu pendek');
    assert.equal((await change({ password: 'Primadona2026', password_lama: 'salah' })).status, 400, 'password lama salah');
    assert.equal((await change({ password: 'admin12345', password_lama: ADMIN.password })).status, 400, 'mengandung nama pengguna');

    const ok = await change({ password: 'Primadona2026', password_lama: ADMIN.password });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.default_password, false);
    assert.ok(ok.body.token);

    assert.equal((await call('GET', '/api/auth/me', { token })).status, 401, 'token lama dicabut');
    assert.equal((await call('GET', '/api/auth/me', { token: ok.body.token })).status, 200, 'token baru berlaku');
    assert.equal((await login(ADMIN.password)).status, 401, 'password lama tidak berlaku');
    assert.equal((await login('Primadona2026')).status, 200, 'password baru berlaku');
  });
});

// Dijalankan paling akhir karena mengunci alamat IP tes selama 15 menit.
describe('Pembatasan percobaan', () => {
  test('kode rahasia dikunci setelah 5 kali salah', async () => {
    let last;
    for (let i = 0; i < 5; i++) last = await call('POST', '/api/auth/admin-access', { body: { code: `salah-${i}` } });
    assert.equal(last.status, 429);
    assert.equal((await call('POST', '/api/auth/admin-access', { body: { code: ACCESS_CODE } })).status, 429, 'kode benar pun ditolak saat terkunci');
  });
});
