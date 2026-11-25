// Tes mode online (Vercel): dua server berbagi satu penyimpanan, seperti fungsi Vercel yang bisa
// dilayani server berbeda di setiap permintaan. Penyimpanan bersama ditiru dengan KV_FILE (tanpa database sungguhan).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, TMP_DIR, ACCESS_CODE, ADMIN, serverEnv } from '../support/test-env.mjs';

const KV_FILE = path.join(TMP_DIR, 'online-kv.json');
const PORTS = [3103, 3104];
const servers = [];

const call = async (port, method, url, { body, token } = {}) => {
  const res = await fetch(`http://localhost:${port}${url}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

before(async () => {
  rmSync(KV_FILE, { force: true });
  for (const port of PORTS) {
    const env = { ...process.env, ...serverEnv(`online-${port}`, port), KV_FILE };
    rmSync(env.DATA_FILE, { force: true });
    servers.push(spawn(process.execPath, [path.join(ROOT, 'backend/index.js')], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'inherit'] }));
  }
  for (const port of PORTS) {
    for (let i = 0; i < 80; i++) {
      try { await fetch(`http://localhost:${port}/api/lokasi`); break; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
  }
});
after(() => servers.forEach(s => s.kill()));

test('data contoh dibuat sekali di penyimpanan bersama, bukan di data.json', async () => {
  const { status, body } = await call(PORTS[0], 'GET', '/api/kamar');
  assert.equal(status, 200);
  assert.ok(body.length > 0);
  assert.ok(existsSync(KV_FILE));
  assert.ok(JSON.parse(readFileSync(KV_FILE, 'utf8')).db.rooms.length > 0);
  assert.ok(!existsSync(serverEnv(`online-${PORTS[0]}`, PORTS[0]).DATA_FILE), 'data.json tidak boleh dibuat di mode online');
});

test('tiket kode rahasia dari server A bisa dipakai login di server B', async () => {
  const ticket = (await call(PORTS[0], 'POST', '/api/auth/admin-access', { body: { code: ACCESS_CODE } })).body.token;
  const res = await call(PORTS[1], 'POST', '/api/auth/login', { body: ADMIN, token: ticket });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  // tiket sekali pakai juga berlaku lintas server
  assert.equal((await call(PORTS[0], 'POST', '/api/auth/login', { body: ADMIN, token: ticket })).status, 401);
});

test('perubahan di server B langsung terlihat di server A', async () => {
  const ticket = (await call(PORTS[1], 'POST', '/api/auth/admin-access', { body: { code: ACCESS_CODE } })).body.token;
  const token = (await call(PORTS[0], 'POST', '/api/auth/login', { body: ADMIN, token: ticket })).body.token;
  const res = await call(PORTS[1], 'PATCH', '/api/kamar/1/status', { body: { status: 'sudah_dipakai' }, token });
  assert.equal(res.status, 200);
  const room = (await call(PORTS[0], 'GET', '/api/kamar/1')).body;
  assert.equal(room.status, 'sudah_dipakai');
});

test('kunci 5x salah kode berlaku di semua server', async () => {
  for (let i = 0; i < 5; i++) {
    await call(PORTS[i % 2], 'POST', '/api/auth/admin-access', { body: { code: 'salah' } });
  }
  const res = await call(PORTS[0], 'POST', '/api/auth/admin-access', { body: { code: ACCESS_CODE } });
  assert.equal(res.status, 429);
});
