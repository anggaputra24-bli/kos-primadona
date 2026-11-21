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
const adminAccessTickets = new Map();
fs.mkdirSync(uploadsDir, { recursive: true });

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(uploadsDir, {
  // File unggahan hanya boleh tampil sebagai gambar, bukan dijalankan sebagai halaman.
  setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

// Hanya terima foto (JPG/PNG/WebP/GIF) maksimal 5 MB; nama file dibuat acak oleh server.
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => cb(IMAGE_TYPES[file.mimetype] ? null : new Error('Foto harus berupa JPG, PNG, WebP, atau GIF'), Boolean(IMAGE_TYPES[file.mimetype]))
});

// Pembatas percobaan gagal: 5 kali salah dalam 15 menit → dikunci 15 menit (per alamat IP).
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const failedAttempts = new Map();
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
if (!db.payments) db.payments = [];
if (!db.admin.token_version) db.admin.token_version = 0;
// Ditulis ke file sementara lalu diganti, supaya data.json tidak rusak bila server mati saat menyimpan.
const save = () => {
  const tmp = `${dataFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, dataFile);
};
let usingDefaultPassword = bcrypt.compareSync(DEFAULT_PASSWORD, db.admin.password);

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
  username: db.admin.username, nama_lengkap: db.admin.nama_lengkap, default_password: usingDefaultPassword,
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
  const b = { ...req.body };
  PRIVATE_ROOM_FIELDS.forEach(k => delete b[k]); // data penghuni diubah lewat /penghuni
  delete b.tenant_since;
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
    usingDefaultPassword = false;
    token = signToken();
  }
  if (typeof nama_lengkap === 'string' && nama_lengkap.trim()) db.admin.nama_lengkap = nama_lengkap.trim().slice(0, 80);
  save();
  res.json({ username: db.admin.username, nama_lengkap: db.admin.nama_lengkap, default_password: usingDefaultPassword, token });
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
  location.peraturan = req.body.peraturan;
  save(); res.json(location);
});

app.listen(PORT, () => console.log(`Kos Primadona server berjalan di http://localhost:${PORT}`));
