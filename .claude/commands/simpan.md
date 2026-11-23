---
description: Jalankan semua tes lalu simpan (commit + push) perubahan ke GitHub
---

Simpan perubahan proyek ke GitHub.

1. `git status` — pastikan tidak ada `.env`, `backend/data.json`, `backend/uploads/`, video, atau file `zz-*`
   yang ikut. Kalau ada file mencurigakan, berhenti dan tanyakan.
2. Jalankan `npm run build` dan `npm run test:all`. Kalau ada yang gagal, laporkan dan **jangan** commit.
3. Commit semua perubahan dengan pesan Bahasa Indonesia: satu baris judul + daftar poin singkat apa yang berubah
   (sudut pandang pemilik kos, bukan istilah teknis berlebihan). $ARGUMENTS
4. `git push`, lalu laporkan hash commit dan ringkasan isinya.
