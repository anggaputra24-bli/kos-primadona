const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || 'kos-primadona-dev-secret';
const dataFile = path.join(__dirname, 'data.json');
const uploadsDir = path.join(__dirname, 'uploads');
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
    { id: 1, lokasi_id: 1, nama_kamar: 'Kamar A1', luas: '3 x 4 meter', harga_sewa: 800000, fasilitas: ['Kasur', 'Lemari', 'AC', 'Kamar mandi dalam', 'WiFi'], status: 'tersedia', foto: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=85' },
    { id: 2, lokasi_id: 1, nama_kamar: 'Kamar A2', luas: '3 x 3 meter', harga_sewa: 750000, fasilitas: ['Kasur', 'Meja belajar', 'Lemari', 'WiFi'], status: 'tersedia', foto: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=900&q=85' },
    { id: 3, lokasi_id: 1, nama_kamar: 'Kamar A3', luas: '4 x 4 meter', harga_sewa: 950000, fasilitas: ['Kasur', 'AC', 'Lemari', 'Kamar mandi dalam'], status: 'sudah_dipakai', foto: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=900&q=85' },
    { id: 4, lokasi_id: 2, nama_kamar: 'Kamar B1', luas: '3 x 4 meter', harga_sewa: 850000, fasilitas: ['Kasur', 'AC', 'Lemari', 'WiFi'], status: 'tersedia', foto: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85' },
    { id: 5, lokasi_id: 2, nama_kamar: 'Kamar B2', luas: '3 x 3 meter', harga_sewa: 700000, fasilitas: ['Kasur', 'Meja belajar', 'Lemari'], status: 'tersedia', foto: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=85' },
    { id: 6, lokasi_id: 2, nama_kamar: 'Kamar B3', luas: '4 x 4 meter', harga_sewa: 1000000, fasilitas: ['Kasur', 'AC', 'Kamar mandi dalam', 'Lemari'], status: 'sudah_dipakai', foto: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=85' }
  ]
};

let db = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : seed;
const save = () => fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token diperlukan' });
  try { req.user = jwt.verify(token, SECRET); next(); } catch { res.status(401).json({ message: 'Token tidak valid' }); }
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== db.admin.username || !bcrypt.compareSync(password || '', db.admin.password)) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }
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
    status: b.status || 'tersedia', foto: files[0] || b.foto || ''
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
    foto: files[0] || db.rooms[i].foto
  };
  save(); res.json(db.rooms[i]);
});
app.patch('/api/kamar/:id/status', auth, (req, res) => {
  const room = db.rooms.find(r => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: 'Kamar tidak ditemukan' });
  room.status = req.body.status;
  save(); res.json(room);
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
