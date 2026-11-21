// Menjalankan backend dengan data baru (data contoh bawaan) untuk keperluan tes.
// usage: node tests/support/start-server.mjs <nama> <port>
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ROOT, serverEnv } from './test-env.mjs';

const [name = 'e2e', port = '3101'] = process.argv.slice(2);
const env = serverEnv(name, port);
rmSync(env.DATA_FILE, { force: true });
rmSync(`${env.DATA_FILE}.tmp`, { force: true });
rmSync(env.UPLOADS_DIR, { recursive: true, force: true });
Object.assign(process.env, env);

createRequire(import.meta.url)(path.join(ROOT, 'backend', 'index.js'));
