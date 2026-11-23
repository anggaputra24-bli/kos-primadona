---
description: Cari bug di website (jalankan tes, jelajahi halaman, baca kode rawan) lalu laporkan
---

Cari bug di website Kos Primadona. Jangan mengubah kode dulu — laporkan temuan, lalu tanya apakah mau diperbaiki.

1. Jalankan `npm run build`, `npm test`, dan `npm run test:e2e`. Catat yang gagal beserta pesan errornya.
2. Buat spec Playwright sementara `tests/e2e/zz-bug.spec.mjs` yang membuka beranda (gulir sampai bawah), filter,
   bandingkan kamar, detail kamar, `/kamar/99999`, alamat ngawur, dan semua menu admin (pakai `loginByApi` + `openTab`)
   di ukuran laptop dan HP. Catat error konsol, `pageerror`, respons HTTP ≥ 400, dan gulir ke samping.
   Hapus file itu setelah selesai.
3. Baca bagian rawan: `backend/index.js` (validasi input, pembayaran/tunggakan, status kamar) dan aksi admin di
   `frontend/src/main.jsx` (penanganan error, data kosong, id yang tidak ada).
4. Laporkan dalam tabel: bug, akibatnya bagi pengguna, tingkat penting (tinggi/sedang/rendah). Bedakan yang
   sudah terbukti (dicoba) dan yang hanya dari membaca kode.

$ARGUMENTS
