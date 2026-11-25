require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const storage = require('./storage');

const app = express();
// Di Vercel alamat IP pengunjung ada di header X-Forwarded-For (dipakai pembatas percobaan gagal per IP).
if (process.env.VERCEL) app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error('JWT_SECRET wajib diatur di file .env dan minimal 32 karakter acak');
}
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;
if (!ADMIN_ACCESS_CODE || ADMIN_ACCESS_CODE.length < 16) {
  throw new Error('ADMIN_ACCESS_CODE wajib diatur di file .env dan minimal 16 karakter');
}
const DEFAULT_PASSWORD = 'admin123';
// DATA_FILE / UPLOADS_DIR bisa diarahkan ke folder lain (dipakai tes agar data asli tidak tersentuh).
const dataFile = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(__dirname, 'data.json');
const uploadsDir = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(__dirname, 'uploads');
let adminAccessTickets = new Map();
// Di Vercel folder proyek hanya-baca: foto wajib disimpan di Vercel Blob.
if (!storage.useBlob && !process.env.VERCEL) fs.mkdirSync(uploadsDir, { recursive: true });

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));
if (storage.useBlob) {
  // Mode online: foto diambil dari Vercel Blob, tetap lewat alamat /uploads/<nama-file>.
  app.get('/uploads/:name', async (req, res) => {
    if (!/^[\w.-]+$/.test(req.params.name)) return res.status(404).end();
    try {
      const photo = await storage.getPhoto(req.params.name);
      if (!photo) return res.status(404).end();
      res.setHeader('Content-Type', photo.blob.contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable'); // nama file selalu unik
      res.setHeader('X-Content-Type-Options', 'nosniff');
      require('stream').Readable.fromWeb(photo.stream).pipe(res);
    } catch (err) {
      console.error('Gagal mengambil foto', err);
      res.status(502).end();
    }
  });
} else {
  app.use('/uploads', express.static(uploadsDir, {
    // File unggahan hanya boleh tampil sebagai gambar, bukan dijalankan sebagai halaman.
    setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }));
}

// Hanya terima foto (JPG/PNG/WebP/GIF) maksimal 5 MB; nama file dibuat acak oleh server.
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const photoName = file => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`;
const upload = multer({
  storage: storage.useBlob || process.env.VERCEL ? multer.memoryStorage() : multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => cb(null, photoName(file))
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => cb(IMAGE_TYPES[file.mimetype] ? null : new Error('Foto harus berupa JPG, PNG, WebP, atau GIF'), Boolean(IMAGE_TYPES[file.mimetype]))
});
// Mode online: foto yang diterima (masih di memori) dikirim ke Vercel Blob.
async function storeUploads(req, res, next) {
  if (!storage.useBlob) return next();
  if (!(req.files || []).length) return next();
  try {
    for (const f of req.files || []) {
      f.filename = photoName(f);
      await storage.putPhoto(f.filename, f.buffer, f.mimetype);
    }
    next();
  } catch (err) {
    console.error('Gagal menyimpan foto', err);
    res.status(502).json({ message: 'Foto gagal disimpan. Coba lagi sebentar lagi.' });
  }
}

// Pembatas percobaan gagal: 5 kali salah dalam 15 menit → dikunci 15 menit (per alamat IP).
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
let failedAttempts = new Map();
function attemptGuard(scope) {
  return (req, res, next) => {
    const key = `${scope}:${req.ip}`;
    const entry = failedAttempts.get(key);
    if (entry?.lockedUntil > Date.now()) {
      const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({ message: `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.` });
    }
    req.attemptKey = key;
    next();
  };
}
function recordFailure(req) {
  const now = Date.now();
  let entry = failedAttempts.get(req.attemptKey);
  if (!entry || now - entry.first > LOCK_MS) entry = { count: 0, first: now, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILS) entry.lockedUntil = now + LOCK_MS;
  failedAttempts.set(req.attemptKey, entry);
  return MAX_FAILS - entry.count;
}
function rejectAttempt(req, res, base) {
  const left = recordFailure(req);
  if (left > 0) return res.status(401).json({ message: `${base}. Sisa ${left} percobaan.` });
  return res.status(429).json({ message: 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.' });
}

// Foto tambahan (isi kamar, kasur, sudut belajar, kamar mandi) untuk kamar contoh, berdasarkan foto sampulnya.
const SAMPLE_GALLERY = {
  '1522708323590-d24dbb6b0267': ['https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80'],
  '1598928506311-c55ded91a20c': ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'],
  '1560185007-c5ca9d2c014d': ['https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'],
  '1505693416388-ac5ce068fe85': ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'],
  '1566665797739-1674de7a421a': ['https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'],
  '1560448204-e02f11c3d0e2': ['https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80'],
};
const sampleGallery = cover => {
  const key = Object.keys(SAMPLE_GALLERY).find(k => String(cover || '').includes(k));
  return key ? [cover, ...SAMPLE_GALLERY[key]] : null;
};
const MAX_PHOTOS = 8;

const seed = {
  admin: { id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10), nama_lengkap: 'Pengelola Primadona' },
  locations: [
    {
      id: 1, nama_lokasi: 'Kos Primadona 1',
      alamat: 'Jl. Raya Sumbersari No. 18, Jember',
      nomor_whatsapp: '6281234567890',
      peta_embed: 'https://www.google.com/maps?q=Jember&output=embed',
      info_lingkungan: '5 menit ke kampus, dekat Indomaret, warung makan, dan halte umum.',
      peraturan: ['Tidak boleh membawa hewan peliharaan.', 'Jam malam pukul 23.00 WIB.', 'Tamu boleh berkunjung maksimal sampai pukul 22.00.', 'Dilarang merokok di dalam kamar.']
    },
    {
      id: 2, nama_lokasi: 'Kos Primadona 2',
      alamat: 'Jl. Kalimantan No. 42, Jember',
      nomor_whatsapp: '6289876543210',
      peta_embed: 'https://www.google.com/maps?q=Universitas+Jember&output=embed',
      info_lingkungan: 'Berada di pusat kota, 3 menit ke universitas, minimarket, ATM, dan area kuliner.',
      peraturan: ['Menjaga kebersihan area bersama.', 'Tidak boleh membuat keributan.', 'Tamu wajib lapor pengelola.', 'Pembayaran paling lambat tanggal 5 setiap bulan.']
    }
  ],
  rooms: [
    { id: 1, lokasi_id: 1, nama_kamar: 'Kamar A1', luas: '3 x 4 meter', harga_sewa: 800000, fasilitas: ['Kasur', 'Lemari', 'AC', 'Kamar mandi dalam', 'WiFi'], status: 'tersedia', foto: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=85', tenant: '', due_day: null },
    { id: 2, lokasi_id: 1, nama_kamar: 'Kamar A2', luas: '3 x 3 meter', harga_sewa: 750000, fasilitas: ['Kasur', 'Meja belajar', 'Lemari', 'WiFi'], status: 'tersedia', foto: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=900&q=85', tenant: '', due_day: null },
    { id: 3, lokasi_id: 1, nama_kamar: 'Kamar A3', luas: '4 x 4 meter', harga_sewa: 950000, fasilitas: ['Kasur', 'AC', 'Lemari', 'Kamar mandi dalam'], status: 'sudah_dipakai', foto: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=900&q=85', tenant: 'Dimas Pratama', due_day: 5 },
    { id: 4, lokasi_id: 2, nama_kamar: 'Kamar B1', luas: '3 x 4 meter', harga_sewa: 850000, fasilitas: ['Kasur', 'AC', 'Lemari', 'WiFi'], status: 'tersedia', foto: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85', tenant: '', due_day: null },
    { id: 5, lokasi_id: 2, nama_kamar: 'Kamar B2', luas: '3 x 3 meter', harga_sewa: 700000, fasilitas: ['Kasur', 'Meja belajar', 'Lemari'], status: 'tersedia', foto: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=85', tenant: '', due_day: null },
    { id: 6, lokasi_id: 2, nama_kamar: 'Kamar B3', luas: '4 x 4 meter', harga_sewa: 1000000, fasilitas: ['Kasur', 'AC', 'Kamar mandi dalam', 'Lemari'], status: 'sudah_dipakai', foto: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=85', tenant: 'Nadia Putri', due_day: 10 }
  ]
  , status_history: [
    { id: 1, kamar_id: 3, status: 'sudah_dipakai', waktu: new Date().toISOString(), admin: 'admin' },
    { id: 2, kamar_id: 6, status: 'sudah_dipakai', waktu: new Date().toISOString(), admin: 'admin' }
  ]
};

seed.rooms.forEach(r => { r.photos = sampleGallery(r.foto) || [r.foto]; });

// Lengkapi / perbaiki data lama. Mengembalikan true bila ada yang perlu disimpan.
function prepare(d) {
  let changed = false;
  if (!d.status_history) d.status_history = [];
  if (!d.payments) d.payments = [];
  if (!d.admin.token_version) d.admin.token_version = 0;
  // Link peta lama yang tersimpan dalam bentuk lain (mis. kode <iframe> lengkap) → ubah ke link embed.
  d.locations.forEach(l => {
    const embed = normalizeMapEmbed(l.peta_embed);
    if (embed && embed !== l.peta_embed) { l.peta_embed = embed; changed = true; }
  });
  // Kamar contoh lama yang baru punya 1 foto → beri galeri foto contoh (foto unggahan admin tidak disentuh).
  d.rooms.forEach(r => {
    const g = (r.photos || []).length <= 1 && sampleGallery(r.foto);
    if (g) { r.photos = g; changed = true; }
  });
  return changed;
}

let db = !storage.shared && fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : structuredClone(seed);
// Mode file: ditulis ke file sementara lalu diganti, supaya data.json tidak rusak bila server mati saat menyimpan.
// Mode online: penyimpanan ke database dilakukan otomatis sebelum jawaban dikirim (lihat middleware di bawah).
const save = () => {
  if (storage.shared) return;
  const tmp = `${dataFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, dataFile);
};
if (prepare(db) && !storage.shared && fs.existsSync(dataFile)) save();

// Apakah admin masih memakai password bawaan (dihitung ulang hanya bila password berubah).
let defaultPasswordCheck = { hash: null, value: false };
const usingDefaultPassword = () => {
  if (defaultPasswordCheck.hash !== db.admin.password) {
    defaultPasswordCheck = { hash: db.admin.password, value: bcrypt.compareSync(DEFAULT_PASSWORD, db.admin.password) };
  }
  return defaultPasswordCheck.value;
};

// Di Vercel tanpa database, data tidak bisa disimpan → beri tahu cara menyambungkannya.
if (process.env.VERCEL && !storage.shared) {
  app.use('/api', (req, res) => res.status(503).json({ message: 'Database belum disambungkan. Di dashboard Vercel buka tab Storage → tambahkan Neon (Postgres), lalu Redeploy.' }));
}
if (process.env.VERCEL && !storage.useBlob) {
  app.use(['/api/kamar', '/api/kamar/:id'], (req, res, next) => {
    if (!/multipart\/form-data/.test(req.headers['content-type'] || '')) return next();
    res.status(503).json({ message: 'Penyimpanan foto belum disambungkan. Di dashboard Vercel buka tab Storage → tambahkan Blob, lalu Redeploy.' });
  });
}
// Mode online: setiap permintaan API membaca data terbaru dari database; permintaan yang mengubah data
// (POST/PUT/PATCH/DELETE) menyimpannya kembali — termasuk tiket akses & kunci percobaan gagal —
// sebelum jawabannya dikirim ke browser.
if (storage.shared) {
  app.use('/api', async (req, res, next) => {
    try {
      const state = await storage.readShared();
      const fresh = !state.db;
      db = fresh ? structuredClone(seed) : state.db;
      adminAccessTickets = new Map(Object.entries(state.runtime?.tickets || {}));
      failedAttempts = new Map(Object.entries(state.runtime?.fails || {}));
      const changed = prepare(db) || fresh;
      const writes = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (changed && !writes) await storage.writeShared({ db });
      if (writes) {
        const sendJson = res.json.bind(res);
        res.json = body => {
          const runtime = { tickets: Object.fromEntries(adminAccessTickets), fails: Object.fromEntries(failedAttempts) };
          storage.writeShared({ db, runtime }).then(() => sendJson(body), err => {
            console.error('Gagal menyimpan ke database', err);
            res.status(503);
            sendJson({ message: 'Data gagal disimpan. Coba lagi sebentar lagi.' });
          });
          return res;
        };
      }
      next();
    } catch (err) {
      console.error('Database tidak bisa dihubungi', err);
      res.status(503).json({ message: 'Database sedang tidak bisa dihubungi. Coba lagi sebentar lagi.' });
    }
  });
}

const signToken = () => jwt.sign(
  { id: db.admin.id, username: db.admin.username, tv: db.admin.token_version },
  SECRET, { expiresIn: '12h' }
);
const readToken = req => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, SECRET);
    // Token lama otomatis tidak berlaku setelah password diganti.
    return payload.tv === db.admin.token_version ? payload : null;
  } catch { return null; }
};
function auth(req, res, next) {
  req.user = readToken(req);
  if (!req.user) return res.status(401).json({ message: 'Sesi berakhir, silakan login lagi' });
  next();
}

// Data penghuni (nama, nomor HP, tanggal bayar) hanya untuk admin, tidak tampil di website publik.
const PRIVATE_ROOM_FIELDS = ['tenant', 'tenant_phone', 'due_day'];
const publicRoom = (room, req) => {
  if (readToken(req)) return room;
  const copy = { ...room };
  PRIVATE_ROOM_FIELDS.forEach(k => delete copy[k]);
  return copy;
};
// Kolom peta menerima berbagai isian dari admin lalu diubah menjadi link embed Google Maps yang aman:
// kode <iframe> lengkap, link embed, link Google Maps biasa (place / koordinat / ?q=), atau alamat biasa.
// Hanya Google Maps yang diizinkan agar website lain tidak bisa disisipkan. Mengembalikan null bila tidak bisa dipakai.
function normalizeMapEmbed(value) {
  let v = String(value || '').trim();
  if (!v) return '';
  const src = v.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  if (src) v = src[1].replace(/&amp;/g, '&');
  if (/^https?:\/\//i.test(v)) {
    let url;
    try { url = new URL(v); } catch { return null; }
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'maps.app.goo.gl' || host === 'goo.gl') return null; // link pendek tidak bisa disematkan
    if (!/^(google\.[a-z.]+|maps\.google\.[a-z.]+)$/.test(host)) return null;
    if (url.pathname.startsWith('/maps/embed')) return `https://www.google.com${url.pathname}${url.search}`;
    if (url.searchParams.get('output') === 'embed') return `https://www.google.com/maps?${url.searchParams}`;
    const at = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
    const q = url.searchParams.get('q') || url.searchParams.get('query')
      || (place && decodeURIComponent(place[1].replace(/\+/g, ' '))) || (at && `${at[1]},${at[2]}`);
    return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed` : null;
  }
  if (/[<>]/.test(v)) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(v.slice(0, 200))}&output=embed`; // alamat biasa
}
const MAP_ERROR = 'Link peta tidak bisa dipakai. Di Google Maps pilih Bagikan → Sematkan peta → Salin HTML, lalu tempel di sini (atau ketik alamat lengkapnya saja).';

const ROOM_STATUSES = ['tersedia', 'sudah_dipakai'];
// Ubah status kamar. Bila kamar kembali terisi, tagihan dihitung mulai bulan ini — bulan-bulan saat kamar
// kosong tidak boleh ikut terhitung sebagai tunggakan. Data penghuni tetap disimpan.
function applyStatus(room, status) {
  if (room.status !== 'sudah_dipakai' && status === 'sudah_dipakai' && room.tenant) room.tenant_since = periodOf(new Date());
  room.status = status;
}
const normalizePhone = value => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  return digits;
};

function adminAccess(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const expiresAt = adminAccessTickets.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    adminAccessTickets.delete(token);
    return res.status(401).json({ message: 'Verifikasi kode admin tidak valid atau kedaluwarsa' });
  }
  req.adminAccessTicket = token;
  next();
}

app.post('/api/auth/admin-access', attemptGuard('access'), (req, res) => {
  const submittedCode = typeof req.body.code === 'string' ? req.body.code : '';
  const expectedHash = crypto.createHash('sha256').update(ADMIN_ACCESS_CODE).digest();
  const submittedHash = crypto.createHash('sha256').update(submittedCode).digest();
  if (!crypto.timingSafeEqual(submittedHash, expectedHash)) {
    return rejectAttempt(req, res, 'Kode rahasia salah');
  }
  failedAttempts.delete(req.attemptKey);
  for (const [ticket, expiresAt] of adminAccessTickets) {
    if (expiresAt <= Date.now()) adminAccessTickets.delete(ticket);
  }
  const token = crypto.randomBytes(32).toString('hex');
  adminAccessTickets.set(token, Date.now() + 10 * 60 * 1000);
  res.json({ token });
});

app.post('/api/auth/login', attemptGuard('login'), adminAccess, (req, res) => {
  const { username, password } = req.body;
  if (username !== db.admin.username || !bcrypt.compareSync(String(password || ''), db.admin.password)) {
    return rejectAttempt(req, res, 'Username atau password salah');
  }
  failedAttempts.delete(req.attemptKey);
  adminAccessTickets.delete(req.adminAccessTicket);
  res.json({ token: signToken(), admin: { username: db.admin.username, nama_lengkap: db.admin.nama_lengkap } });
});
app.get('/api/auth/me', auth, (req, res) => res.json({
  username: db.admin.username, nama_lengkap: db.admin.nama_lengkap, default_password: usingDefaultPassword(),
}));

app.get('/api/lokasi', (req, res) => res.json(db.locations));
app.get('/api/kamar', (req, res) => res.json(db.rooms.map(r => publicRoom(r, req))));
app.get('/api/kamar/:id', (req, res) => {
  const room = db.rooms.find(r => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  res.json({ ...publicRoom(room, req), lokasi: db.locations.find(l => l.id === room.lokasi_id) });
});

app.post('/api/lokasi', auth, (req, res) => {
  const item = { id: Date.now(), peraturan: [], ...req.body };
  if ('peta_embed' in item) {
    const embed = normalizeMapEmbed(item.peta_embed);
    if (embed === null) return res.status(400).json({ message: MAP_ERROR });
    item.peta_embed = embed;
  }
  db.locations.push(item); save(); res.status(201).json(item);
});
app.put('/api/lokasi/:id', auth, (req, res) => {
  const i = db.locations.findIndex(l => l.id === Number(req.params.id));
  if (i < 0) return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
  const b = { ...req.body };
  delete b.id;
  if ('peta_embed' in b) {
    const embed = normalizeMapEmbed(b.peta_embed);
    if (embed === null) return res.status(400).json({ message: MAP_ERROR });
    b.peta_embed = embed;
  }
  db.locations[i] = { ...db.locations[i], ...b }; save(); res.json(db.locations[i]);
});
app.delete('/api/lokasi/:id', auth, (req, res) => {
  db.locations = db.locations.filter(l => l.id !== Number(req.params.id));
  db.rooms = db.rooms.filter(r => r.lokasi_id !== Number(req.params.id)); save(); res.json({ success: true });
});

app.post('/api/kamar', auth, upload.array('foto', MAX_PHOTOS), storeUploads, (req, res) => {
  const b = req.body;
  const files = (req.files || []).map(f => `/uploads/${f.filename}`);
  const item = {
    id: Date.now(), lokasi_id: Number(b.lokasi_id), nama_kamar: b.nama_kamar, luas: b.luas,
    harga_sewa: Number(b.harga_sewa), fasilitas: String(b.fasilitas || '').split(',').map(x => x.trim()).filter(Boolean),
    status: ROOM_STATUSES.includes(b.status) ? b.status : 'tersedia', foto: files[0] || b.foto || '',
    photos: files.length ? files : (b.foto ? [b.foto] : []),
    tenant: '', due_day: null
  };
  db.rooms.push(item); save(); res.status(201).json(item);
});
app.put('/api/kamar/:id', auth, upload.array('foto', MAX_PHOTOS), storeUploads, (req, res) => {
  const i = db.rooms.findIndex(r => r.id === Number(req.params.id));
  if (i < 0) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  const b = { ...req.body };
  PRIVATE_ROOM_FIELDS.forEach(k => delete b[k]); // data penghuni diubah lewat /penghuni
  delete b.tenant_since;
  // Galeri: foto lama yang dipertahankan (keep_photos, urutan dari admin) + foto baru yang diunggah.
  const current = db.rooms[i].photos?.length ? db.rooms[i].photos : [db.rooms[i].foto].filter(Boolean);
  let keep = current;
  if (b.keep_photos !== undefined) {
    let list = [];
    try { list = JSON.parse(b.keep_photos); } catch { return res.status(400).json({ message: 'Daftar foto tidak valid' }); }
    keep = Array.isArray(list) ? list.filter(u => current.includes(u)) : [];
  }
  delete b.keep_photos; delete b.photos; delete b.foto;
  if (b.status !== undefined && !ROOM_STATUSES.includes(b.status)) return res.status(400).json({ message: 'Status kamar tidak valid' });
  if (b.status) applyStatus(db.rooms[i], b.status);
  delete b.status;
  const files = (req.files || []).map(f => `/uploads/${f.filename}`);
  db.rooms[i] = {
    ...db.rooms[i], ...b,
    lokasi_id: b.lokasi_id ? Number(b.lokasi_id) : db.rooms[i].lokasi_id,
    harga_sewa: b.harga_sewa ? Number(b.harga_sewa) : db.rooms[i].harga_sewa,
    fasilitas: b.fasilitas ? String(b.fasilitas).split(',').map(x => x.trim()).filter(Boolean) : db.rooms[i].fasilitas,
  };
  const photos = [...keep, ...files].slice(0, MAX_PHOTOS);
  db.rooms[i].photos = photos;
  db.rooms[i].foto = photos[0] || '';
  save(); res.json(db.rooms[i]);
});
app.patch('/api/kamar/:id/status', auth, (req, res) => {
  const room = db.rooms.find(r => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  if (!ROOM_STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Status kamar tidak valid' });
  if (room.status === req.body.status) return res.json(room);
  applyStatus(room, req.body.status);
  db.status_history.push({
    id: Date.now(), kamar_id: room.id, status: room.status,
    waktu: new Date().toISOString(), admin: db.admin.username
  });
  save(); res.json(room);
});
app.put('/api/kamar/:id/penghuni', auth, (req, res) => {
  const room = db.rooms.find(r => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  const tenant = String(req.body.tenant || '').trim();
  const dueDay = Number(req.body.due_day);
  if (req.body.due_day && !(Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31)) {
    return res.status(400).json({ message: 'Tanggal jatuh tempo harus 1–31' });
  }
  const phone = normalizePhone(req.body.tenant_phone);
  if (req.body.tenant_phone && !/^62\d{8,13}$/.test(phone)) {
    return res.status(400).json({ message: 'Nomor HP penghuni tidak valid. Contoh: 081234567890' });
  }
  // Penghuni baru mulai ditagih dari bulan ini, jadi tidak dianggap menunggak bulan-bulan sebelumnya.
  if (tenant !== (room.tenant || '')) room.tenant_since = tenant ? periodOf(new Date()) : null;
  room.tenant = tenant;
  room.tenant_phone = tenant ? phone : '';
  room.due_day = tenant && dueDay ? dueDay : null;
  save(); res.json(room);
});
app.get('/api/riwayat-status', auth, (req, res) => res.json(db.status_history.slice().reverse()));

// ===== Pembayaran sewa =====
const pad = n => String(n).padStart(2, '0');
const periodOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const isPeriod = p => /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
const shiftPeriod = (p, months) => { const [y, m] = p.split('-').map(Number); return periodOf(new Date(y, m - 1 + months, 1)); };
const dueDateOf = (periode, day) => {
  const [y, m] = periode.split('-').map(Number);
  return new Date(y, m - 1, Math.min(day, new Date(y, m, 0).getDate())); // tgl 31 → akhir bulan
};
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const locationName = id => db.locations.find(l => l.id === id)?.nama_lokasi || '';
const STATUS_ORDER = { terlambat: 0, segera: 1, belum: 2, lunas: 3 };

// Tagihan setiap kamar terisi untuk satu periode (bulan), lengkap dengan status dan tunggakan.
function billsFor(periode) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const current = periodOf(today);
  return db.rooms
    .filter(r => r.status === 'sudah_dipakai' && r.tenant && r.due_day)
    .map(r => {
      const due = dueDateOf(periode, r.due_day);
      const payment = db.payments.find(p => p.kamar_id === r.id && p.periode === periode) || null;
      const daysLeft = Math.round((due - today) / 86400000);
      const status = payment ? 'lunas' : daysLeft < 0 ? 'terlambat' : daysLeft <= 3 ? 'segera' : 'belum';
      // Bulan-bulan sebelumnya (sejak penghuni masuk) yang belum dibayar.
      const arrears = [];
      for (let p = shiftPeriod(current, -1); p >= (r.tenant_since || current) && arrears.length < 12; p = shiftPeriod(p, -1)) {
        if (!db.payments.some(x => x.kamar_id === r.id && x.periode === p)) arrears.push(p);
      }
      return {
        kamar_id: r.id, nama_kamar: r.nama_kamar, lokasi_id: r.lokasi_id, lokasi: locationName(r.lokasi_id),
        tenant: r.tenant, tenant_phone: r.tenant_phone || '', due_day: r.due_day, harga_sewa: Number(r.harga_sewa) || 0,
        periode, jatuh_tempo: ymd(due), daysLeft, status, payment, tunggakan: arrears.reverse(),
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.daysLeft - b.daysLeft);
}

app.get('/api/pengingat-bayar', auth, (req, res) => res.json(billsFor(periodOf(new Date()))));
app.get('/api/pembayaran', auth, (req, res) => {
  const periode = isPeriod(req.query.periode) ? req.query.periode : periodOf(new Date());
  const tagihan = billsFor(periode);
  const pembayaran = db.payments.filter(p => p.periode === periode).sort((a, b) => b.dicatat_pada.localeCompare(a.dicatat_pada));
  res.json({
    periode, tagihan, pembayaran,
    ringkasan: {
      ditagih: tagihan.reduce((s, t) => s + t.harga_sewa, 0),
      diterima: pembayaran.reduce((s, p) => s + p.jumlah, 0),
      lunas: tagihan.filter(t => t.status === 'lunas').length,
      belum: tagihan.filter(t => t.status !== 'lunas').length,
      terlambat: tagihan.filter(t => t.status === 'terlambat').length,
    },
  });
});
app.post('/api/pembayaran', auth, (req, res) => {
  const b = req.body;
  const room = db.rooms.find(r => r.id === Number(b.kamar_id));
  if (!room) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  if (!isPeriod(b.periode)) return res.status(400).json({ message: 'Periode tidak valid' });
  const jumlah = Math.round(Number(b.jumlah));
  if (!(jumlah > 0)) return res.status(400).json({ message: 'Jumlah pembayaran harus lebih dari 0' });
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal) ? b.tanggal : ymd(new Date());
  if (db.payments.some(p => p.kamar_id === room.id && p.periode === b.periode)) {
    return res.status(409).json({ message: `${room.nama_kamar} sudah tercatat lunas untuk periode ini` });
  }
  const item = {
    id: Date.now(), kamar_id: room.id, nama_kamar: room.nama_kamar, penghuni: room.tenant || '',
    periode: b.periode, jumlah, tanggal, metode: b.metode === 'transfer' ? 'transfer' : 'tunai',
    catatan: String(b.catatan || '').slice(0, 200), dicatat_oleh: db.admin.username, dicatat_pada: new Date().toISOString(),
  };
  db.payments.push(item); save(); res.status(201).json(item);
});
app.delete('/api/pembayaran/:id', auth, (req, res) => {
  const before = db.payments.length;
  db.payments = db.payments.filter(p => p.id !== Number(req.params.id));
  if (db.payments.length === before) return res.status(404).json({ message: 'Pembayaran tidak ditemukan' });
  save(); res.json({ success: true });
});
// Unduh seluruh data kos sebagai file Excel (satu sheet per jenis data).
app.get('/api/export/excel', auth, async (req, res) => {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kos Primadona';
  wb.created = new Date();
  const locName = id => db.locations.find(l => l.id === id)?.nama_lokasi || `Lokasi ${id}`;
  const statusLabel = s => (s === 'tersedia' ? 'Tersedia' : 'Terisi');

  const addSheet = (name, columns, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = columns;
    ws.addRows(rows);
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B2622' } };
    head.alignment = { vertical: 'middle' };
    head.height = 22;
    ws.eachRow((row, n) => { if (n > 1) row.alignment = { vertical: 'top', wrapText: true }; });
    if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    return ws;
  };

  const kamar = addSheet('Kamar', [
    { header: 'ID', key: 'id', width: 6 },
    { header: 'Nama kamar', key: 'nama_kamar', width: 18 },
    { header: 'Lokasi', key: 'lokasi', width: 22 },
    { header: 'Luas', key: 'luas', width: 14 },
    { header: 'Harga sewa / bulan', key: 'harga_sewa', width: 18 },
    { header: 'Status', key: 'status', width: 11 },
    { header: 'Penghuni', key: 'tenant', width: 20 },
    { header: 'No. HP penghuni', key: 'tenant_phone', width: 16 },
    { header: 'Tanggal bayar', key: 'due_day', width: 13 },
    { header: 'Fasilitas', key: 'fasilitas', width: 40 },
  ], db.rooms.map(r => ({
    id: r.id, nama_kamar: r.nama_kamar, lokasi: locName(r.lokasi_id), luas: r.luas,
    harga_sewa: Number(r.harga_sewa) || 0, status: statusLabel(r.status),
    tenant: r.tenant || '', tenant_phone: r.tenant_phone || '', due_day: r.due_day || '', fasilitas: (r.fasilitas || []).join(', '),
  })));
  kamar.getColumn('harga_sewa').numFmt = '"Rp"#,##0';

  addSheet('Lokasi', [
    { header: 'ID', key: 'id', width: 6 },
    { header: 'Nama lokasi', key: 'nama_lokasi', width: 22 },
    { header: 'Alamat', key: 'alamat', width: 36 },
    { header: 'WhatsApp', key: 'nomor_whatsapp', width: 16 },
    { header: 'Jumlah kamar', key: 'jumlah', width: 13 },
    { header: 'Kamar tersedia', key: 'tersedia', width: 14 },
    { header: 'Info lingkungan', key: 'info_lingkungan', width: 40 },
    { header: 'Peraturan', key: 'peraturan', width: 50 },
  ], db.locations.map(l => {
    const rooms = db.rooms.filter(r => r.lokasi_id === l.id);
    return {
      id: l.id, nama_lokasi: l.nama_lokasi, alamat: l.alamat, nomor_whatsapp: l.nomor_whatsapp,
      jumlah: rooms.length, tersedia: rooms.filter(r => r.status === 'tersedia').length,
      info_lingkungan: l.info_lingkungan || '',
      peraturan: (l.peraturan || []).map((p, i) => `${i + 1}. ${p}`).join('\n'),
    };
  }));

  const bayar = addSheet('Pembayaran', [
    { header: 'Periode', key: 'periode', width: 16 },
    { header: 'Tanggal bayar', key: 'tanggal', width: 14 },
    { header: 'Kamar', key: 'kamar', width: 16 },
    { header: 'Penghuni', key: 'penghuni', width: 20 },
    { header: 'Jumlah', key: 'jumlah', width: 14 },
    { header: 'Metode', key: 'metode', width: 10 },
    { header: 'Catatan', key: 'catatan', width: 30 },
    { header: 'Dicatat oleh', key: 'oleh', width: 12 },
  ], db.payments.slice().sort((a, b) => b.periode.localeCompare(a.periode) || a.nama_kamar.localeCompare(b.nama_kamar)).map(p => {
    const [y, m] = p.periode.split('-').map(Number);
    const [ty, tm, td] = p.tanggal.split('-').map(Number);
    return {
      periode: new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      tanggal: new Date(Date.UTC(ty, tm - 1, td)), kamar: p.nama_kamar, penghuni: p.penghuni,
      jumlah: p.jumlah, metode: p.metode === 'transfer' ? 'Transfer' : 'Tunai', catatan: p.catatan, oleh: p.dicatat_oleh,
    };
  }));
  bayar.getColumn('tanggal').numFmt = 'dd/mm/yyyy';
  bayar.getColumn('jumlah').numFmt = '"Rp"#,##0';

  const riwayat = addSheet('Riwayat status', [
    { header: 'Waktu', key: 'waktu', width: 20 },
    { header: 'Kamar', key: 'kamar', width: 18 },
    { header: 'Status baru', key: 'status', width: 12 },
    { header: 'Oleh', key: 'admin', width: 12 },
  ], db.status_history.slice().reverse().map(h => ({
    // Excel tidak menyimpan zona waktu: geser ke jam lokal server agar tampil sesuai WIB.
    waktu: new Date(new Date(h.waktu).getTime() - new Date(h.waktu).getTimezoneOffset() * 60000), kamar: db.rooms.find(r => r.id === h.kamar_id)?.nama_kamar || `Kamar ${h.kamar_id} (dihapus)`,
    status: statusLabel(h.status), admin: h.admin,
  })));
  riwayat.getColumn('waktu').numFmt = 'dd/mm/yyyy hh:mm';

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="data-kos-primadona-${stamp}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});
app.put('/api/auth/profil', auth, (req, res) => {
  const { nama_lengkap, password, password_lama } = req.body;
  let token;
  if (password) {
    if (!bcrypt.compareSync(String(password_lama || ''), db.admin.password)) {
      return res.status(400).json({ message: 'Password lama salah' });
    }
    const next = String(password);
    if (next.length < 8 || !/[a-zA-Z]/.test(next) || !/\d/.test(next)) {
      return res.status(400).json({ message: 'Password baru minimal 8 karakter dan berisi huruf serta angka' });
    }
    if (next === DEFAULT_PASSWORD || next.toLowerCase().includes(db.admin.username.toLowerCase())) {
      return res.status(400).json({ message: 'Password baru terlalu mudah ditebak' });
    }
    db.admin.password = bcrypt.hashSync(next, 10);
    db.admin.token_version += 1; // keluarkan sesi lain yang memakai password lama
    token = signToken();
  }
  if (typeof nama_lengkap === 'string' && nama_lengkap.trim()) db.admin.nama_lengkap = nama_lengkap.trim().slice(0, 80);
  save();
  res.json({ username: db.admin.username, nama_lengkap: db.admin.nama_lengkap, default_password: usingDefaultPassword(), token });
});

// Pesan error yang rapi untuk unggahan foto yang ditolak.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran foto maksimal 5 MB' : 'Unggahan foto tidak valid';
    return res.status(400).json({ message });
  }
  if (err) return res.status(400).json({ message: err.message || 'Permintaan tidak valid' });
  next();
});
app.delete('/api/kamar/:id', auth, (req, res) => {
  db.rooms = db.rooms.filter(r => r.id !== Number(req.params.id)); save(); res.json({ success: true });
});

app.put('/api/lokasi/:id/peraturan', auth, (req, res) => {
  const location = db.locations.find(l => l.id === Number(req.params.id));
  if (!location) return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
  if (!Array.isArray(req.body.peraturan)) return res.status(400).json({ message: 'Daftar peraturan tidak valid' });
  location.peraturan = req.body.peraturan.map(x => String(x).trim()).filter(Boolean).slice(0, 50);
  save(); res.json(location);
});

// Di Vercel server tidak perlu dinyalakan sendiri: file api/index.js memakai `app` ini sebagai fungsi.
if (!process.env.VERCEL) app.listen(PORT, () => console.log(`Kos Primadona server berjalan di http://localhost:${PORT} (penyimpanan: ${storage.mode})`));
module.exports = app;
