# Pekerjaan tertunda

## Sebelum website dipasang di internet (wajib)
- [ ] Pakai **HTTPS** (hosting seperti Railway/Render/VPS + domain). Sekarang password & kode rahasia lewat `http://`.
- [ ] Jalankan hasil `npm run build` + backend, **bukan** server pengembangan (`npm run dev` / `dev:hp`).
- [ ] Atur `app.set('trust proxy', …)` sesuai hosting agar pembatas percobaan login membaca IP pengunjung yang benar.
- [ ] Tambahkan **header keamanan** (mis. `helmet`: CSP, `X-Frame-Options`/`frame-ancestors`).
- [ ] Batasi **CORS** hanya untuk domain website sendiri.
- [ ] Buat `JWT_SECRET` dan `ADMIN_ACCESS_CODE` baru khusus server produksi.
- [ ] Siapkan cadangan rutin untuk `backend/data.json` dan `backend/uploads/`.

## Keamanan & kerapian
- [ ] Hapus tulisan **"Demo: admin / admin123"** di halaman login dan bagian "Akun Admin Demo" di README.
- [ ] Validasi isian lokasi (`POST/PUT /api/lokasi`): hanya terima kolom yang dikenal, cek nomor WhatsApp & link peta.
- [ ] Pertimbangkan memperbarui `exceljs` saat versi tanpa celah `uuid` tersedia (`npm audit`).

## Konten
- [ ] Ganti foto hero Unsplash dengan **foto asli kos** (simpan di server sendiri agar intro portal cepat tampil).
- [ ] Ganti foto contoh kamar dengan foto asli lewat dashboard admin.
- [ ] Ganti nomor WhatsApp, alamat, dan peta contoh dengan data asli.
