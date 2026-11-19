require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || 'kos-primadona-dev-secret';
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;
if (!ADMIN_ACCESS_CODE || ADMIN_ACCESS_CODE.length < 16) {
  throw new Error('ADMIN_ACCESS_CODE wajib diatur di file .env dan minimal 16 karakter');
}
const dataFile = path.join(__dirname, 'data.json');
const uploadsDir = path.join(__dirname, 'uploads');
const adminAccessTickets = new Map();
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
  })
});

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

let db = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : seed;
if (!db.status_history) db.status_history = [];
const save = () => fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token diperlukan' });
  try { req.user = jwt.verify(token, SECRET); next(); } catch { res.status(401).json({ message: 'Token tidak valid' }); }
}

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

app.post('/api/auth/admin-access', (req, res) => {
  const submittedCode = typeof req.body.code === 'string' ? req.body.code : '';
  const expectedHash = crypto.createHash('sha256').update(ADMIN_ACCESS_CODE).digest();
  const submittedHash = crypto.createHash('sha256').update(submittedCode).digest();
  if (!crypto.timingSafeEqual(submittedHash, expectedHash)) {
    return res.status(401).json({ message: 'Kode rahasia salah' });
  }
  for (const [ticket, expiresAt] of adminAccessTickets) {
    if (expiresAt <= Date.now()) adminAccessTickets.delete(ticket);
  }
  const token = crypto.randomBytes(32).toString('hex');
  adminAccessTickets.set(token, Date.now() + 10 * 60 * 1000);
  res.json({ token });
});

app.post('/api/auth/login', adminAccess, (req, res) => {
  const { username, password } = req.body;
  if (username !== db.admin.username || !bcrypt.compareSync(password || '', db.admin.password)) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }
  adminAccessTickets.delete(req.adminAccessTicket);
  const token = jwt.sign({ id: db.admin.id, username: db.admin.username }, SECRET, { expiresIn: '12h' });
  res.json({ token, admin: { username: db.admin.username, nama_lengkap: db.admin.nama_lengkap } });
});

app.get('/api/lokasi', (req, res) => res.json(db.locations));
app.get('/api/kamar', (req, res) => res.json(db.rooms));
app.get('/api/kamar/:id', (req, res) => {
  const room = db.rooms.find(r => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  res.json({ ...room, lokasi: db.locations.find(l => l.id === room.lokasi_id) });
});

app.post('/api/lokasi', auth, (req, res) => {
  const item = { id: Date.now(), peraturan: [], ...req.body };
  db.locations.push(item); save(); res.status(201).json(item);
});
app.put('/api/lokasi/:id', auth, (req, res) => {
  const i = db.locations.findIndex(l => l.id === Number(req.params.id));
  if (i < 0) return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
  db.locations[i] = { ...db.locations[i], ...req.body }; save(); res.json(db.locations[i]);
});
app.delete('/api/lokasi/:id', auth, (req, res) => {
  db.locations = db.locations.filter(l => l.id !== Number(req.params.id));
  db.rooms = db.rooms.filter(r => r.lokasi_id !== Number(req.params.id)); save(); res.json({ success: true });
});

app.post('/api/kamar', auth, upload.array('foto', 6), (req, res) => {
  const b = req.body;
  const files = (req.files || []).map(f => `/uploads/${f.filename}`);
  const item = {
    id: Date.now(), lokasi_id: Number(b.lokasi_id), nama_kamar: b.nama_kamar, luas: b.luas,
    harga_sewa: Number(b.harga_sewa), fasilitas: String(b.fasilitas || '').split(',').map(x => x.trim()).filter(Boolean),
    status: b.status || 'tersedia', foto: files[0] || b.foto || '',
    photos: files.length ? files : (b.foto ? [b.foto] : []),
    tenant: '', due_day: null
  };
  db.rooms.push(item); save(); res.status(201).json(item);
});
app.put('/api/kamar/:id', auth, upload.array('foto', 6), (req, res) => {
  const i = db.rooms.findIndex(r => r.id === Number(req.params.id));
  if (i < 0) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  const b = req.body;
  const files = (req.files || []).map(f => `/uploads/${f.filename}`);
  db.rooms[i] = {
    ...db.rooms[i], ...b,
    lokasi_id: b.lokasi_id ? Number(b.lokasi_id) : db.rooms[i].lokasi_id,
    harga_sewa: b.harga_sewa ? Number(b.harga_sewa) : db.rooms[i].harga_sewa,
    fasilitas: b.fasilitas ? String(b.fasilitas).split(',').map(x => x.trim()).filter(Boolean) : db.rooms[i].fasilitas,
    foto: files[0] || db.rooms[i].foto,
    photos: files.length ? files : (db.rooms[i].photos || [db.rooms[i].foto])
  };
  save(); res.json(db.rooms[i]);
});
app.patch('/api/kamar/:id/status', auth, (req, res) => {
  const room = db.rooms.find(r => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  room.status = req.body.status;
  db.status_history.push({
    id: Date.now(), kamar_id: room.id, status: room.status,
    waktu: new Date().toISOString(), admin: db.admin.username
  });
  save(); res.json(room);
});
app.put('/api/kamar/:id/penghuni', auth, (req, res) => {
  const room = db.rooms.find(r => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  room.tenant = req.body.tenant || '';
  room.due_day = req.body.due_day ? Number(req.body.due_day) : null;
  save(); res.json(room);
});
app.get('/api/riwayat-status', auth, (req, res) => res.json(db.status_history.slice().reverse()));
app.get('/api/pengingat-bayar', auth, (req, res) => {
  const today = new Date();
  const reminders = db.rooms
    .filter(r => r.status === 'sudah_dipakai' && r.tenant && r.due_day)
    .map(r => {
      let due = new Date(today.getFullYear(), today.getMonth(), r.due_day);
      if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, r.due_day);
      const daysLeft = Math.ceil((due - today) / 86400000);
      return { ...r, daysLeft, reminder: daysLeft <= 3 ? 'Segera jatuh tempo' : 'Belum jatuh tempo' };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
  res.json(reminders);
});
app.put('/api/auth/profil', auth, (req, res) => {
  if (req.body.nama_lengkap) db.admin.nama_lengkap = req.body.nama_lengkap;
  if (req.body.password) db.admin.password = bcrypt.hashSync(req.body.password, 10);
  save();
  res.json({ username: db.admin.username, nama_lengkap: db.admin.nama_lengkap });
});
app.delete('/api/kamar/:id', auth, (req, res) => {
  db.rooms = db.rooms.filter(r => r.id !== Number(req.params.id)); save(); res.json({ success: true });
});

app.put('/api/lokasi/:id/peraturan', auth, (req, res) => {
  const location = db.locations.find(l => l.id === Number(req.params.id));
  if (!location) return res.status(404).json({ message: 'Lokasi tidak ditemukan' });
  location.peraturan = req.body.peraturan;
  save(); res.json(location);
});

app.listen(PORT, () => console.log(`Kos Primadona server berjalan di http://localhost:${PORT}`));
