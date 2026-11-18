# Sistem Katalog Kos Primadona

Website katalog kamar Kos Primadona yang menyediakan informasi dua lokasi kos, filter kamar berdasarkan lokasi dan ketersediaan, detail kamar, integrasi WhatsApp, serta dashboard pengelolaan admin.

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
- Melihat foto, luas, fasilitas, harga, dan status kamar
- Membuka halaman detail kamar
- Melihat peraturan kos dan lokasi lingkungan
- Menghubungi pengelola melalui WhatsApp
- Tampilan responsif untuk HP dan laptop

### Admin

- Login dengan JWT
- Melihat ringkasan jumlah kamar dan status ketersediaan
- Mengelola data lokasi
- Menambah, mengubah, menghapus, dan mengunggah foto kamar
- Mengubah status kamar secara cepat
- Mengelola peraturan kos per lokasi

## Persyaratan

- Node.js versi 18 atau lebih baru
- npm

## Instalasi

1. Masuk ke folder proyek.

```bash
cd D:\ProjectMPPL
```

2. Instal seluruh dependensi.

```bash
npm install
```

## Menjalankan Aplikasi

### Menjalankan frontend dan backend sekaligus

```bash
npm run dev
```

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

```text
Username: admin
Password: admin123
```

Halaman login admin:

```text
http://localhost:5173/admin/login
```

## Build Produksi

```bash
npm run build
```

Hasil build frontend tersimpan pada folder `dist/`.

## Struktur Proyek

```text
kos-primadona/
├── src/
│   ├── main.jsx
│   └── styles.css
├── server/
│   ├── index.js
│   ├── uploads/
│   └── data.json
├── dist/
├── index.html
├── vite.config.js
└── package.json
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

## Penyimpanan Data

Untuk pengembangan lokal, data disimpan pada `server/data.json`. Upload foto disimpan pada `server/uploads/`.

Untuk penggunaan produksi, bagian penyimpanan dapat diganti dengan MySQL atau PostgreSQL beserta Cloudinary atau penyimpanan objek lain.

## Lingkup Sistem

Sistem tidak mencakup login penyewa, pembayaran atau payment gateway, pengingat jatuh tempo tagihan, rating atau ulasan, keluhan penghuni, serta aplikasi mobile native.
