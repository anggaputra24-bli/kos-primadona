# Kos Primadona — catatan untuk Claude

Website kos bulanan di Jember: katalog kamar untuk pengunjung + dashboard admin (kamar, lokasi, peraturan,
penghuni, pembayaran, riwayat status, ekspor Excel). Detail desain di [DESIGN.md](DESIGN.md),
pekerjaan tertunda di [TODO.md](TODO.md), panduan lengkap untuk manusia di [README.md](README.md).

## Aturan kerja
- **Selalu jawab dalam Bahasa Indonesia.** Kode, nama file, dan istilah teknis boleh tetap apa adanya.
- **Redesign = hanya tampilan.** Saat diminta mengubah desain/animasi, jangan ubah fitur, alur, teks fungsional, atau data.
- **Commit / push hanya bila diminta.** Pesan commit dalam Bahasa Indonesia.
- **Jangan pernah** menampilkan isi `.env`, meng-commit `.env` / `backend/data.json` / `backend/uploads/`,
  atau memakai kredensial admin asli. Tes memakai data contoh terpisah.
- Setiap perbaikan bug / fitur baru → tambahkan tes (API atau E2E), lalu jalankan **semua** tes sebelum bilang selesai.
- Perubahan tampilan → periksa dengan screenshot Playwright di ukuran laptop (1440×900) **dan** HP (402×874).
  File spec sementara beri awalan `zz-` dan hapus setelah selesai.

## Perintah
| Perintah | Kegunaan |
|---|---|
| `npm run dev` | backend :3001 + frontend :5173 (hanya laptop) |
| `npm run dev:hp` | sama, tapi bisa dibuka dari HP di Wi-Fi yang sama (alamat `Network` di terminal) |
| `npm run build` | build frontend ke `frontend/dist/` (wajib lolos setelah mengubah frontend) |
| `npm test` | tes API (`node:test`, server tes di port 3102) |
| `npm run test:e2e` | tes Playwright: proyek `laptop` (Chrome), `iPhone 17`, `iPhone 17 Pro Max` (WebKit); server tes :3101/:5180 |
| `npm run test:all` | keduanya |

Perubahan di `backend/index.js` perlu restart server (`Ctrl+C` lalu jalankan lagi).

## Struktur
- `backend/index.js` — Express API satu file; data di `backend/data.json` (dibuat dari seed bila belum ada),
  foto di `backend/uploads/`. Env wajib: `JWT_SECRET` (≥32), `ADMIN_ACCESS_CODE` (≥16) — lihat `.env.example`.
- `frontend/src/main.jsx` — SPA React 19 satu file (semua halaman & komponen), router `react-router-dom`.
- `frontend/src/lodge.css` — tema utama (token warna, website publik, admin, intro, animasi).
- `frontend/src/site.css` — dasar bersama, jendela kode rahasia, tata letak dashboard & laci menu.
- `frontend/src/styles.css` — halaman login admin (maskot).
- `tests/api/` — tes API · `tests/e2e/` — spec Playwright + `fixtures.mjs` (foto/peta/font ditiru) + `helpers.mjs`.

## Hal yang mudah rusak — jaga perilakunya
- **Akses admin:** Ctrl+Z (laptop) atau ketuk logo header 5× dalam <1 detik/ketukan (HP) → kode rahasia →
  tiket 10 menit sekali pakai → login → JWT 12 jam (`token_version` mencabut sesi lama saat ganti password).
  Percobaan gagal dikunci 5×/15 menit per IP.
- **Data penghuni** (`tenant`, `tenant_phone`, `due_day`) tidak boleh muncul di API publik (`publicRoom`).
- **Status kamar** hanya `tersedia` / `sudah_dipakai`, lewat `applyStatus` (kamar terisi lagi → `tenant_since` = bulan ini,
  agar bulan kosong tidak jadi tunggakan).
- **Intro pembuka** sekali per sesi (`sessionStorage.kp_intro_seen`); tes biasa melewatinya lewat `fixtures.mjs`.
- Website selalu dibuka dari atas beranda (hash `#kamar` sisa kunjungan lama dibuang).
- Semua animasi harus mati dengan `prefers-reduced-motion: reduce`.
