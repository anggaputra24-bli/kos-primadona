# Panduan desain Kos Primadona

Gaya **editorial** (terinspirasi sekolahimpian.com): latar putih tulang berpola "+", huruf besar yang tipis & rapat,
foto penuh, judul bagian bernomor, kapsul kaca, dan animasi yang mengikuti gulir. Semua token ada di `.lodge { … }`
di `frontend/src/lodge.css` — pakai variabelnya, jangan menulis warna baru langsung.

## Warna — sengaja sedikit
| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--bg` | `#faf7f3` | latar halaman (+ pola `--plus`) |
| `--surface` | `#ffffff` | kartu, panel, kolom isian |
| `--sand` / `--sand-2` | `#f3ece6` / `#e9dfd6` | latar foto saat memuat, saklar mati |
| `--text` / `--text-2` / `--muted` | `#1f1718` / `#4d4446` / `#8b8183` | judul / isi / keterangan |
| `--line` | `rgba(31,23,24,.11)` | semua garis tipis |
| `--night` | `#1d1113` | bagian gelap ("Cara menyewa", footer) |
| `--clay` / `--clay-2` / `--clay-soft` | `#CE4F2F` / `#b4401f` / `#fbe9df` | **satu-satunya aksen**: tombol utama, titik, ikon aktif |
| `--ok`, `--danger` | hijau / merah | **hanya** status pembayaran admin (lunas / terlambat) |

Jangan menambah warna aksen kedua. `--brand*`, `--peach`, `--blush` hanyalah nama lama yang dipetakan ke palet ini.

## Huruf
- Font: **Plus Jakarta Sans** (Google Fonts).
- Judul besar: berat 500, `letter-spacing:-.045em` s/d `-.055em`, `line-height` < 1, ukuran `clamp(...)`.
- Label kecil: 11–12px, `font-weight:600`, huruf kapital, `letter-spacing:.16–.2em`.
- Judul bagian bernomor memakai komponen `SecIndex`: `● 01 — Daftar kamar`.

## Komponen
- **Tombol** berbentuk kapsul (`border-radius:999px`) dengan titik kecil di depan dan ikon `›` (`Icon.chevron`):
  utama terakota (`.lx-btn-accent`), kedua putih bergaris tipis (`.lx-btn-dark`). Tombol utama berkilau berkala.
- **Navbar**: tiga kapsul kaca (logo · menu · tombol), gelap di atas foto hero, terang setelahnya,
  bersembunyi saat gulir ke bawah.
- **Kartu / panel**: putih, garis tipis `--line`, sudut `--r-md` / `--r-lg`, bayangan sangat halus atau tanpa bayangan.
- **Angka statistik**: besar & tipis (berat 400), dipisah garis tegak, tanpa kotak.
- **Admin** memakai gaya yang sama: judul besar tipis, tanggal sebagai label bertitik, laci menu tanpa panel.

## Gerak
- Kurva utama `--ease: cubic-bezier(.16,1,.3,1)`; durasi 0.4–1.2 dtk.
- Animasi yang mengikuti gulir memakai `useScrollProgress` (nilai `--p`/`--e` 0→1 yang **dihaluskan**).
  Gerakkan hanya `transform`, `translate`, `scale`, `opacity`, `clip-path` — jangan lebar/tinggi (patah-patah).
- Elemen bertanda `data-reveal` muncul naik + memudar saat masuk layar.
- Semua animasi dimatikan di dalam `@media (prefers-reduced-motion:reduce)`.

## Tata letak & responsif
- Lebar isi maks 1320px, jarak tepi `--pad: max(4vw, 20px)`.
- Titik patah: 1100, 960, 760, 640px. Selalu periksa di HP (402×874) — tidak boleh ada gulir ke samping,
  tombol sentuh minimal ±44px.
