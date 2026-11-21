// Pengaturan bersama untuk tes: kode rahasia & secret khusus tes, serta folder data sementara.
// Tes tidak pernah membaca .env atau menyentuh backend/data.json milik Anda.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TMP_DIR = path.join(ROOT, 'tests', '.tmp');

export const ACCESS_CODE = 'kode-rahasia-khusus-tes-123';
export const ADMIN = { username: 'admin', password: 'admin123' };

export function serverEnv(name, port) {
  return {
    PORT: String(port),
    DATA_FILE: path.join(TMP_DIR, `${name}-data.json`),
    UPLOADS_DIR: path.join(TMP_DIR, `${name}-uploads`),
    ADMIN_ACCESS_CODE: ACCESS_CODE,
    JWT_SECRET: 'secret-khusus-tes-yang-panjangnya-lebih-dari-32-karakter',
  };
}
