# Sistem Katalog Kos Primadona

Website katalog kamar Kos Primadona yang menyediakan informasi dua lokasi kos, filter kamar berdasarkan lokasi dan ketersediaan, detail kamar, integrasi WhatsApp, serta dashboard pengelolaan admin. Kode frontend dan backend dikelompokkan dalam folder terpisah.

## Teknologi

- React.js
- Vite
- React Router
- Express.js
- JWT
- Multer
- Penyimpanan data JSON untuk pengembangan lokal

## Fitur

### Pengunjung

- Memilih dua lokasi kos melalui tab lokasi
- Memfilter kamar: Semua, Tersedia, atau Sudah Dipakai
- Menampilkan jumlah kamar tersedia dan sudah dipakai
- Memfilter kamar berdasarkan harga maksimal dan fasilitas
- Membandingkan hingga tiga kamar
- Melihat foto, luas, fasilitas, harga, dan status kamar
- Membuka halaman detail kamar
- Melihat galeri foto kamar
- Melihat breadcrumb dan kembali ke katalog
- Melihat peraturan kos dan lokasi lingkungan
- Menghubungi pengelola melalui WhatsApp
- Tampilan responsif untuk HP dan laptop
- Menampilkan animasi loading dan gambar pengganti

### Admin

- Login dengan JWT
- Melihat ringkasan jumlah kamar dan status ketersediaan
- Mengelola data lokasi
- Menambah, mengubah, menghapus, dan mengunggah foto kamar
- Mengubah status kamar secara cepat
- Melihat riwayat perubahan status kamar
- Mengelola nama penghuni, nomor HP, dan tanggal jatuh tempo pembayaran
- Mencatat pembayaran sewa per bulan (lunas, terlambat, tunggakan) dan membatalkannya
- Mengirim pengingat tagihan atau bukti pembayaran lewat WhatsApp
- Mengunduh seluruh data ke file Excel
- Mengubah nama lengkap dan password profil admin
- Mengelola peraturan kos per lokasi

### Keamanan

- Halaman login hanya terbuka setelah kode rahasia benar (`Ctrl+Z`)
- Kode rahasia dan login dikunci 15 menit setelah 5 kali salah
- Data penghuni tidak dikirim ke website publik
- Password baru wajib kuat; menggantinya mengeluarkan sesi di perangkat lain
- Unggahan hanya menerima gambar (maks. 5 MB)

## Persyaratan

- Node.js versi 22 atau lebih baru
- npm
- Google Chrome (hanya untuk tes E2E)

## Instalasi

1. Masuk ke folder proyek.

```bash
cd D:\ProjectMPPL
```

2. Instal seluruh dependensi.

```bash
npm install
```

3. Salin `.env.example` menjadi `.env`, lalu isi:
   - `ADMIN_ACCESS_CODE`: kode rahasia minimal 16 karakter
   - `JWT_SECRET`: teks acak minimal 32 karakter (cara membuatnya ada di `.env.example`)

   Jangan bagikan atau commit file `.env`.

## Menjalankan Aplikasi

Untuk membuka login admin:

- **Laptop/komputer:** tekan `Ctrl+Z` di halaman website (di luar kolom isian).
- **HP/tablet:** ketuk logo **Kos Primadona** di bagian atas **5 kali dengan cepat**.

Setelah itu masukkan kode rahasia, lalu login seperti biasa. Kode rahasia diverifikasi backend dan tiket aksesnya hanya berlaku 10 menit.

### Membuka dari HP di Wi-Fi yang sama

1. Pastikan laptop dan HP tersambung ke **Wi-Fi yang sama**.
2. Di laptop, jalankan:

   ```bash
   npm run dev:hp
   ```

3. Di terminal akan muncul alamat `Network`, misalnya `http://192.168.1.180:5173`. Ketik alamat itu di browser HP (Safari/Chrome).

Kalau HP tidak bisa membuka alamatnya:

- Saat pertama kali dijalankan, Windows biasanya menampilkan jendela **Windows Defender Firewall** untuk Node.js. Pilih **Izinkan (Allow access)** untuk jaringan **Private**.
- Pastikan jaringan Wi-Fi di laptop berjenis **Private**, bukan Public (Settings → Network & internet → Wi-Fi → nama Wi-Fi).
- Alamat IP laptop bisa berubah kalau pindah Wi-Fi. Selalu pakai alamat `Network` yang muncul di terminal.
- Wi-Fi umum (kampus, kafe) kadang memblokir koneksi antarperangkat. Kalau begitu, pakai hotspot dari HP.

### Menjalankan frontend dan backend sekaligus

```bash
npm run dev
```

Jalankan perintah dari folder utama project `D:\ProjectMPPL`.

### Menjalankan frontend saja

```bash
npm run client
```

Alamat frontend:

```text
http://localhost:5173
```

### Menjalankan backend saja

```bash
npm run server
```

Alamat backend:

```text
http://localhost:3001
```

Vite sudah dikonfigurasi untuk meneruskan request `/api` dan `/uploads` ke backend.

## Akun Admin Demo

Untuk membuka login, tekan `Ctrl+Z` di halaman website (di luar kolom isian), masukkan kode rahasia, lalu login menggunakan akun berikut:

```text
Username: admin
Password: admin123
```

Alamat halaman login setelah kode rahasia berhasil diverifikasi:

```text
http://localhost:5173/admin/login
```

Segera ganti password bawaan ini lewat menu **Profil admin**.

## Pengujian

Tes berjalan dengan server dan data contoh tersendiri, jadi `backend/data.json`, `.env`, dan server dev Anda tidak tersentuh.

| Perintah | Isi | Waktu |
|---|---|---|
| `npm test` | Tes API: privasi data penghuni, login & pembatasan percobaan, pembayaran, ganti password, unggah foto, unduh Excel | ±10 detik |
| `npm run test:e2e` | Tes E2E di browser: alur Ctrl+Z → login → dashboard, catat bayar & WhatsApp, tampilan iPhone | ±1 menit |
| `npm run test:all` | Keduanya | |

Tes E2E berjalan di tiga perangkat:

| Perangkat | Browser | Isi |
|---|---|---|
| `laptop` (1280×900) | Google Chrome | semua alur |
| `iPhone 17` (402×874) | WebKit, mesin Safari, layar sentuh | website publik & tampilan HP |
| `iPhone 17 Pro Max` (440×956) | WebKit, mesin Safari, layar sentuh | website publik & tampilan HP |

Persiapan sekali saja sebelum menjalankan tes iPhone:

```bash
npx playwright install webkit
```

Menjalankan satu perangkat saja, misalnya iPhone: `npx playwright test --project "iPhone 17"`.
Screenshot setiap layar iPhone tersimpan di `tests/.tmp/screens/`.

Jika Google Chrome tidak terpasang, gunakan Chromium bawaan Playwright:

```bash
npx playwright install chromium
PW_CHANNEL=chromium npm run test:e2e
```

Jika ada tes E2E yang gagal, buka laporannya (berisi screenshot dan rekaman langkah):

```bash
npx playwright show-report tests/.tmp/playwright-report
```

Lokasi file tes:

```text
tests/
├── api/api.test.mjs          # tes API (node:test)
├── e2e/*.spec.mjs            # tes browser (Playwright)
└── support/                  # server & pengaturan khusus tes
playwright.config.mjs
```

## Build Produksi

```bash
npm run build
```

Hasil build frontend tersimpan pada folder `frontend/dist/`.

## Online di Vercel

Proyek ini siap di-deploy ke Vercel (pengaturan di `vercel.json`, backend lewat `api/index.js`).

1. Di [vercel.com](https://vercel.com): **Add New → Project** → import repo GitHub ini → **Deploy**
   (pengaturan build sudah otomatis dari `vercel.json`, tidak perlu diubah).
2. Buka proyek → tab **Storage**:
   - **Create Database → Neon (Postgres)** → sambungkan ke proyek ini (mengisi `DATABASE_URL`).
   - **Create → Blob** → sambungkan ke proyek ini (mengisi `BLOB_READ_WRITE_TOKEN`).
3. **Settings → Environment Variables**, tambahkan (pakai nilai acak baru, jangan sama dengan laptop):
   - `JWT_SECRET` — minimal 32 karakter
   - `ADMIN_ACCESS_CODE` — minimal 16 karakter (kode rahasia untuk membuka login admin)
4. Tab **Deployments** → titik tiga pada deployment terakhir → **Redeploy**.
5. Buka website → ketuk logo 5× → masukkan `ADMIN_ACCESS_CODE` → login `admin` / `admin123`
   → **segera ganti password** di menu Profil admin.

Setelah itu setiap `git push` ke GitHub otomatis membuat website online ikut diperbarui.

**Memindah data laptop ↔ online** (butuh `npx vercel link` lalu `npx vercel env pull .env.local` sekali):

```bash
npm run data:ekspor               # unduh data & foto online → backend/data.json + backend/uploads/ (backup)
npm run data:impor                # kirim data.json & foto laptop ke website online (database masih kosong)
npm run data:impor -- --timpa     # sama, tapi mengganti data online yang sudah ada
```

## Mengirim Perubahan ke GitHub

Jalankan perintah berikut dari folder utama project (`D:\ProjectMPPL`) di terminal:

1. Periksa file yang berubah:

```bash
git status
```

2. Siapkan perubahan project untuk commit. File rahasia (`.env`), data lokal, foto unggahan, `node_modules`, dan hasil tes sudah dikecualikan lewat `.gitignore`:

```bash
git add -A
```

3. Periksa kembali file yang akan dikirim:

```bash
git status
```

4. Simpan perubahan sebagai commit:

```bash
git commit -m "Jelaskan perubahan Anda di sini"
```

5. Kirim commit ke GitHub:

```bash
git push -u origin main
```

Untuk perubahan berikutnya, ulangi langkah tersebut dan gunakan pesan commit yang menjelaskan perubahan, misalnya `git commit -m "Perbarui tampilan katalog"`. Jangan memasukkan file rahasia seperti `.env`, atau data lokal dan upload pengguna.

## Struktur Proyek

```text
kos-primadona/
├── backend/
│   ├── index.js
│   ├── uploads/
│   └── data.json
├── frontend/
│   ├── public/
│   │   └── primadona-mark.svg
│   ├── src/
│   │   ├── main.jsx       # semua halaman (React)
│   │   ├── lodge.css      # tema tampilan (website & dashboard admin)
│   │   ├── site.css       # tata letak dasar, dashboard, jendela kode rahasia
│   │   └── styles.css     # halaman login admin
│   ├── index.html
│   └── vite.config.mjs
├── tests/
│   ├── api/               # tes API
│   ├── e2e/               # tes browser (laptop & iPhone)
│   └── support/           # server khusus tes
├── playwright.config.mjs
├── .env.example
├── package.json
├── package-lock.json
└── README.md
```

## Endpoint API Utama

### Publik

| Metode | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/auth/login` | Login admin |
| GET | `/api/lokasi` | Daftar lokasi |
| GET | `/api/kamar` | Daftar kamar |
| GET | `/api/kamar/:id` | Detail kamar |

### Dilindungi JWT

| Metode | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/lokasi` | Menambah lokasi |
| PUT | `/api/lokasi/:id` | Mengubah lokasi |
| DELETE | `/api/lokasi/:id` | Menghapus lokasi |
| POST | `/api/kamar` | Menambah kamar |
| PUT | `/api/kamar/:id` | Mengubah kamar |
| PATCH | `/api/kamar/:id/status` | Mengubah status kamar |
| DELETE | `/api/kamar/:id` | Menghapus kamar |
| PUT | `/api/lokasi/:id/peraturan` | Mengubah peraturan lokasi |
| PUT | `/api/kamar/:id/penghuni` | Mengubah nama, nomor HP, dan tanggal bayar penghuni |
| GET | `/api/pembayaran?periode=YYYY-MM` | Tagihan & pembayaran satu bulan |
| POST | `/api/pembayaran` | Mencatat pembayaran |
| DELETE | `/api/pembayaran/:id` | Membatalkan catatan pembayaran |
| GET | `/api/export/excel` | Mengunduh semua data dalam file Excel |
| GET | `/api/auth/me` | Profil admin yang sedang login |
| PUT | `/api/auth/profil` | Mengubah nama atau password admin |

## Penyimpanan Data

Untuk pengembangan lokal, data disimpan pada `backend/data.json`. Upload foto disimpan pada `backend/uploads/`.

Di Vercel (bila `DATABASE_URL` diisi), data yang sama disimpan di Neon Postgres sebagai satu dokumen JSON (tabel `kos_store`)
dan foto di Vercel Blob (bila `BLOB_READ_WRITE_TOKEN` diisi). Foto tetap dipanggil lewat `/uploads/<nama-file>`,
jadi data bisa dipindah bolak-balik dengan `npm run data:ekspor` / `npm run data:impor`. Lihat `backend/storage.js`.

## Lingkup Sistem

Sistem tidak mencakup login penyewa, pembayaran online atau payment gateway (pembayaran hanya dicatat manual oleh admin), pengiriman WhatsApp otomatis (admin menekan tombol untuk mengirim), rating atau ulasan, keluhan penghuni, serta aplikasi mobile native.
