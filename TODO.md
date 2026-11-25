# Pekerjaan tertunda

## Sebelum website dipasang di internet (wajib)
- [x] Pakai **HTTPS** — otomatis di Vercel (lihat bagian "Online di Vercel" di README).
- [x] Jalankan hasil `npm run build` + backend, bukan server pengembangan — Vercel memakai build otomatis.
- [x] `trust proxy` aktif di Vercel (`process.env.VERCEL`) agar pembatas percobaan login membaca IP pengunjung.
- [ ] Tambahkan **CSP** (`X-Frame-Options`, `nosniff`, `Referrer-Policy` sudah di `vercel.json`).
- [ ] Batasi **CORS** hanya untuk domain website sendiri.
- [ ] Buat `JWT_SECRET` dan `ADMIN_ACCESS_CODE` baru khusus server produksi.
- [ ] Cadangan rutin: jalankan `npm run data:ekspor` berkala (mengunduh data & foto online ke laptop).

## Keamanan & kerapian
- [ ] Hapus tulisan **"Demo: admin / admin123"** di halaman login dan bagian "Akun Admin Demo" di README.
- [ ] Validasi isian lokasi (`POST/PUT /api/lokasi`): hanya terima kolom yang dikenal, cek nomor WhatsApp & link peta.
- [ ] Pertimbangkan memperbarui `exceljs` saat versi tanpa celah `uuid` tersedia (`npm audit`).

## Konten
- [ ] Ganti foto hero Unsplash dengan **foto asli kos** (simpan di server sendiri agar intro portal cepat tampil).
- [ ] Ganti foto contoh kamar dengan foto asli lewat dashboard admin.
- [ ] Ganti nomor WhatsApp, alamat, dan peta contoh dengan data asli.
