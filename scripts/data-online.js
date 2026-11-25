// Pindahkan data antara laptop (backend/data.json + backend/uploads/) dan website online (Neon + Vercel Blob).
//
//   npm run data:ekspor   → unduh data & foto dari website online ke laptop (sekaligus jadi backup)
//   npm run data:impor    → kirim data.json & foto di laptop ke website online
//
// Kunci database dibaca dari file .env.local, yang dibuat dengan: npx vercel env pull .env.local
// (file itu rahasia dan tidak ikut ke GitHub).
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), quiet: true });

const ROOT = path.join(__dirname, '..');
const dataFile = path.join(ROOT, 'backend', 'data.json');
const uploadsDir = path.join(ROOT, 'backend', 'uploads');
const [command, ...flags] = process.argv.slice(2);

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.KV_FILE) {
  console.error('DATABASE_URL belum ada. Jalankan dulu: npx vercel env pull .env.local');
  process.exit(1);
}
const storage = require('../backend/storage');

const photoNames = db => [...new Set(db.rooms.flatMap(r => [r.foto, ...(r.photos || [])])
  .filter(u => typeof u === 'string' && u.startsWith('/uploads/'))
  .map(u => u.slice('/uploads/'.length)))];

async function exportData() {
  const state = await storage.readShared();
  if (!state.db) { console.log('Database online masih kosong, tidak ada yang diunduh.'); return; }
  if (fs.existsSync(dataFile)) {
    const backup = dataFile.replace(/\.json$/, `.backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.copyFileSync(dataFile, backup);
    console.log(`data.json lama disimpan sebagai ${path.basename(backup)}`);
  }
  fs.writeFileSync(dataFile, JSON.stringify(state.db, null, 2));
  console.log(`Data tersimpan di backend/data.json (${state.db.rooms.length} kamar, ${state.db.locations.length} lokasi).`);
  if (!storage.useBlob) { console.log('BLOB_READ_WRITE_TOKEN tidak ada, foto tidak diunduh.'); return; }
  fs.mkdirSync(uploadsDir, { recursive: true });
  let count = 0;
  for (const name of photoNames(state.db)) {
    const photo = await storage.getPhoto(name);
    if (!photo) { console.warn(`  foto ${name} tidak ditemukan di Blob, dilewati`); continue; }
    fs.writeFileSync(path.join(uploadsDir, name), Buffer.from(await new Response(photo.stream).arrayBuffer()));
    count++;
  }
  console.log(`${count} foto tersimpan di backend/uploads/.`);
}

async function importData() {
  if (!fs.existsSync(dataFile)) { console.error('backend/data.json tidak ada.'); process.exit(1); }
  const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const state = await storage.readShared();
  if (state.db && !flags.includes('--timpa')) {
    console.error('Database online sudah berisi data. Data itu akan DIGANTI dengan data.json dari laptop.');
    console.error('Sebaiknya jalankan "npm run data:ekspor" dulu sebagai backup, lalu ulangi dengan: npm run data:impor -- --timpa');
    process.exit(1);
  }
  const names = photoNames(db);
  if (names.length && !storage.useBlob) { console.error('BLOB_READ_WRITE_TOKEN tidak ada, foto tidak bisa dikirim.'); process.exit(1); }
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  let count = 0;
  for (const name of names) {
    const file = path.join(uploadsDir, name);
    if (!fs.existsSync(file)) { console.warn(`  foto ${name} tidak ada di backend/uploads/, dilewati`); continue; }
    await storage.putPhoto(name, fs.readFileSync(file), types[path.extname(name).toLowerCase()] || 'application/octet-stream');
    count++;
  }
  await storage.writeShared({ db });
  console.log(`Selesai: ${db.rooms.length} kamar, ${db.locations.length} lokasi, dan ${count} foto terkirim ke website online.`);
}

const run = { ekspor: exportData, impor: importData }[command];
if (!run) { console.error('Pakai: node scripts/data-online.js ekspor | impor [--timpa]'); process.exit(1); }
run().catch(err => { console.error('Gagal:', err.message); process.exit(1); });
