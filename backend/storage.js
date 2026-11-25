// Penyimpanan data & foto. Ada dua mode, dipilih otomatis dari pengaturan (environment variable):
//
// 1. Mode file (default, dipakai di laptop & tes):
//    data di backend/data.json, foto di backend/uploads/ — sama seperti sebelumnya.
//
// 2. Mode online (Vercel): aktif bila DATABASE_URL (atau POSTGRES_URL) diisi.
//    Data disimpan di Neon Postgres sebagai satu dokumen JSON (bentuknya persis sama dengan data.json),
//    foto disimpan di Vercel Blob bila BLOB_READ_WRITE_TOKEN diisi.
//    Di Vercel, tiap permintaan bisa dilayani server yang berbeda, jadi data dibaca ulang dari database
//    di awal setiap permintaan dan ditulis kembali sebelum jawaban dikirim.
//
// KV_FILE (khusus tes) meniru mode online memakai satu file bersama, tanpa perlu database sungguhan.

const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const KV_FILE = process.env.KV_FILE ? path.resolve(process.env.KV_FILE) : '';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';

const shared = Boolean(DATABASE_URL || KV_FILE);

// ---------- Data (mode online) ----------
// Tabel sederhana: key → value (JSONB). Dipakai 2 baris: 'db' (data website) dan 'runtime' (tiket akses & kunci percobaan gagal).
let sqlClient = null;
let tableReady = null;
function sql() {
  if (!sqlClient) sqlClient = require('@neondatabase/serverless').neon(DATABASE_URL);
  return sqlClient;
}
async function ensureTable() {
  if (!tableReady) {
    tableReady = sql()`CREATE TABLE IF NOT EXISTS kos_store (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`
      .catch(err => { tableReady = null; throw err; });
  }
  return tableReady;
}

async function readShared() {
  if (KV_FILE) {
    if (!fs.existsSync(KV_FILE)) return {};
    return JSON.parse(fs.readFileSync(KV_FILE, 'utf8'));
  }
  await ensureTable();
  const rows = await sql()`SELECT key, value FROM kos_store WHERE key IN ('db', 'runtime')`;
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function writeShared(values) {
  if (KV_FILE) {
    const current = fs.existsSync(KV_FILE) ? JSON.parse(fs.readFileSync(KV_FILE, 'utf8')) : {};
    const tmp = `${KV_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ ...current, ...values }));
    fs.renameSync(tmp, KV_FILE);
    return;
  }
  await ensureTable();
  // Nilai dikirim sebagai parameter (bukan disambung ke teks SQL) → aman dari SQL injection.
  for (const [key, value] of Object.entries(values)) {
    await sql()`INSERT INTO kos_store (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  }
}

// ---------- Foto (Vercel Blob) ----------
// Foto tetap dipanggil lewat alamat /uploads/<nama-file> seperti di laptop; server mengambilnya dari Blob.
// Jadi data di database dan data.json bentuknya sama, dan bisa dipindah bolak-balik.
const useBlob = Boolean(BLOB_TOKEN);
let blobAccess = process.env.BLOB_ACCESS === 'private' ? 'private' : 'public';
const blobPath = name => `uploads/${name}`;
const otherAccess = a => (a === 'public' ? 'private' : 'public');

async function putPhoto(name, buffer, contentType) {
  const { put } = await import('@vercel/blob');
  const opts = access => ({ access, contentType, addRandomSuffix: false, allowOverwrite: true, token: BLOB_TOKEN });
  try {
    await put(blobPath(name), buffer, opts(blobAccess));
  } catch (err) {
    // Store Blob bisa dibuat "Public" atau "Private" di dashboard — coba jenis yang lain sekali.
    if (!/access|private|public/i.test(String(err?.message))) throw err;
    blobAccess = otherAccess(blobAccess);
    await put(blobPath(name), buffer, opts(blobAccess));
  }
}

async function getPhoto(name) {
  const { get } = await import('@vercel/blob');
  for (const access of [blobAccess, otherAccess(blobAccess)]) {
    try {
      const result = await get(blobPath(name), { access, token: BLOB_TOKEN });
      if (result?.statusCode === 200) { blobAccess = access; return result; }
      if (result === null) return null;
    } catch (err) {
      if (err?.name === 'BlobNotFoundError') return null;
      if (!/access|private|public/i.test(String(err?.message))) throw err;
    }
  }
  return null;
}

module.exports = { shared, useBlob, readShared, writeShared, putPhoto, getPhoto, mode: DATABASE_URL ? 'neon' : KV_FILE ? 'kv-file' : 'file' };
