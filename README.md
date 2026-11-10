# Warung Go Digital

Etalase digital untuk warung & UMKM: halaman promosi, Panel Mitra untuk mengelola
usaha, dan menu publik yang dibuka pelanggan lewat QR.

Proyek PKM-K. Situs statis — tanpa server, tanpa basis data, tanpa biaya hosting.

## Tiga bagian

| Bagian | Alamat | Isi |
|---|---|---|
| Landing page | `/` | Promosi program, daftar paket, formulir pendaftaran |
| Panel Mitra | `/app/` | Dasbor, warung, transaksi, rating, katalog, promosi, foto, laporan |
| Menu publik | `/app/menu.html?w=<id>` | Halaman menu untuk pelanggan, dibuka lewat QR |

## Coba sekarang

Situs sudah berjalan di sesi ini:

```bash
bash jalankan.sh          # nyalakan (port bawaan 12001)
bash jalankan.sh --stop   # hentikan
```

## Jalankan di komputer sendiri

```bash
cd warung-go-digital
python3 -m http.server 8000
```

Lalu buka http://localhost:8000/ (landing) atau http://localhost:8000/app/ (panel).

Wajib lewat server HTTP. Membuka `index.html` langsung sebagai berkas akan
menggagalkan pemuatan `store.js` karena batasan `file://`.

## Deploy

Tiga jalur, semuanya sudah dikonfigurasi:

- **GitHub Pages** — otomatis lewat `.github/workflows/deploy-pages.yml` saat push ke `main`.
- **Vercel** — `vercel.json` sudah mengarah ke isi situs.
- **Netlify** — `netlify.toml` sudah mengatur folder publik.

Rincian tiap jalur ada di [DEPLOY.md](DEPLOY.md).

## Paket siap-pakai

```bash
python3 buat-paket.py
```

Menghasilkan `warung-go-digital-siap-pakai.zip` (situs + konfigurasi deploy + panduan)
dan `warung-go-digital-repo.bundle` (seluruh repositori beserta riwayat commit).

## Uji

```bash
python3 uji/uji-fungsional.py   # alur utama Panel Mitra
python3 uji/uji-hp.py           # tampilan di berbagai ukuran layar HP
python3 uji/uji-tata-letak.py   # tidak ada elemen meluber
python3 uji/uji-akar.py         # situs disajikan dari akar domain
python3 uji/uji-qr.py           # QR terbaca kembali
```

Semua uji memakai Playwright + Chromium dan server statis sementara.
