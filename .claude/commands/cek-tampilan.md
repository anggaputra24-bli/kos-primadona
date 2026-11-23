---
description: Ambil screenshot halaman di ukuran laptop & HP lalu periksa tampilannya
argument-hint: [halaman atau bagian yang mau dicek, mis. "beranda", "admin pembayaran"]
---

Periksa tampilan: $ARGUMENTS (bila kosong: beranda, detail kamar, login, dan dashboard admin).

1. `npm run build` harus lolos.
2. Buat spec sementara `tests/e2e/zz-shot.spec.mjs` yang mengambil screenshot di **1440×900** dan **402×874**
   (dan 375×667 bila soal ruang di HP). Untuk beranda, pakai foto asli: `page.route(/unsplash|placehold/, r => r.continue())`,
   dan gulir ke beberapa titik agar animasi gulir ikut terlihat. Simpan ke folder scratchpad, bukan ke proyek.
3. Lihat setiap screenshot: teks terpotong/tertutup, ruang kosong berlebihan, gulir ke samping, kontras rendah,
   elemen tidak rata tengah, warna di luar palet [DESIGN.md](../../DESIGN.md).
4. Hapus spec sementara, lalu laporkan temuan + usulan perbaikan. Jangan mengubah fitur.
