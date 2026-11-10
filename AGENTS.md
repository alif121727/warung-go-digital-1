# AGENTS.md

Catatan kerja untuk repo ini (memori sesi berikutnya).

## Isi repo

Dua bagian yang saling terhubung:

1. **Landing page** (`warung-go-digital/`) — promosi program PKM-K.
2. **Panel Mitra** (`warung-go-digital/app/`) — aplikasi pengelolaan usaha.

Sumber konten: `Proposal_PKM-K_Warung_Go_Digital.pdf`.

```
/workspace/project/
├── Proposal_PKM-K_Warung_Go_Digital.pdf
├── index.html                    # redirect ke /warung-go-digital/
├── warung-go-digital.zip         # paket siap deploy (landing + app)
└── warung-go-digital/
    ├── index.html                # landing page  → tombol "Panel Mitra" ke app/
    ├── styles.css
    ├── app.js
    └── app/                      # ── PANEL MITRA ──
        ├── index.html            # kerangka SPA
        ├── menu.html             # halaman menu publik (tujuan QR menu)
        ├── styles.css            # sistem desain aplikasi
        ├── qr.js                 # encoder QR asli (ISO/IEC 18004)
        ├── store.js              # lapisan data + localStorage + seed
        ├── ui.js                 # ikon, modal, drawer, grafik, toast
        ├── app.js                # router + Dasbor + modul Warung
        ├── modul-transaksi.js    # pembayaran, kuitansi, CSV
        ├── modul-rating.js       # pantauan Maps, QR ulasan, balas ulasan
        ├── modul-katalog.js      # katalog WhatsApp Business
        ├── modul-promosi.js      # promo menu, poster, siaran WA
        ├── modul-foto.js         # foto produk + pengecilan gambar
        └── modul-laporan.js      # laporan bulanan + cetak
```

## Menjalankan lokal

```bash
cd /workspace/project && python3 -m http.server 12000
# landing  → http://localhost:12000/warung-go-digital/
# panel    → http://localhost:12000/warung-go-digital/app/
```

Wajib lewat server HTTP. Membuka `index.html` langsung sebagai berkas akan
menggagalkan pemuatan `store.js` karena batasan `file://`.

Catatan: server `http.server` mati begitu sesi selesai. Untuk permanen, lihat
bagian Deploy.

## Ketentuan konten yang HARUS dijaga

| Hal | Nilai |
|---|---|
| Paket Gratis | Rp 0 |
| Paket Hemat | Rp 35.000 sekali bayar |
| Paket Plus | Rp 100.000 sekali bayar |
| Langganan bulanan | Rp 15.000 / bulan |
| Paket Hemat mencakup | QR menu digital **dan** katalog WhatsApp Business |
| Nomor WhatsApp | 081563324546 → link `wa.me/6281563324546` |

Harga menu di mockup ponsel (Nasi Goreng Rp 15.000, Es Teh Rp 5.000, Ayam Bakar
Rp 22.000) adalah contoh daftar menu warung, **bukan** harga layanan — jangan diubah.

## Desain

Arah: hero gelap atmosferik → isi terang krem, berselang-seling terang/gelap.

- Font: **Bricolage Grotesque** (display), **Instrument Serif** (aksen italic),
  **JetBrains Mono** (label). Dimuat dari Google Fonts.
- Palet: tinta `#0d1a12`, amber `#f5a524`, krem `#f6f0e2`, leaf `#3ba55d`, WA `#25d366`.
- Token warna/radius/shadow ada di `:root` di `styles.css`.

## Panel Mitra (aplikasi)

Aplikasi klien-sisi murni: **tanpa server, tanpa basis data**. Seluruh data disimpan di
`localStorage` browser, jadi bisa dideploy ke hosting statis apa pun (Netlify, Vercel,
GitHub Pages). Saat pertama dibuka, `store.js` mengisi data contoh.

### Enam modul wajib

| Modul | Isi |
|---|---|
| **Transaksi & Pembayaran** | Tagihan paket/langganan, pencatatan pembayaran (QRIS, transfer, tunai, e-wallet), kuitansi cetak, ekspor CSV |
| **Rating & Reputasi** | Pantauan rating Google Maps 90 hari, QR ulasan per warung, balas ulasan, bahan cetak kartu meja |
| **Katalog WhatsApp** | Produk format WhatsApp Business Catalog, pratinjau tampilan chat, bagikan via wa.me |
| **Promosi Digital** | Tiga jenis: promo menu, poster digital (4 tema, cetak A4/SVG), siaran WhatsApp + ukuran hasil |
| **Foto Produk** | Unggah/kamera, pengecilan otomatis ke 900px & ≤260 KB, status draf/siap/terbit |
| **Laporan Bulanan** | Pendapatan, transaksi, warung, rating, promosi, konten — narasi otomatis + cetak A4 & unduh teks |

### Arsitektur

- **Router berbasis hash**: `#/dasbor`, `#/warung`, `#/transaksi`, `#/rating`,
  `#/katalog`, `#/promosi`, `#/foto`, `#/laporan`.
- **Pola modul**: setiap `modul-*.js` memanggil
  `App.register(id, { label, judul, ic, grup, badge, cari, render(root) })`.
  Menambah modul = tambah satu berkas + satu `<script>` di `index.html`.
- **`store.js`** menyediakan `all/find/where/add/update/remove/uid` plus hitungan
  turunan: `ringkas()`, `trenPendapatan(n)`, `topWarung(n)`, `perMetode()`,
  `laporanBulanan(periode)`, `daftarPeriode()`, `ekspor()`, `impor()`.
- **`ui.js`** berisi ikon SVG, `modal`, `drawer`, `toast`, `konfirmasi`, `salin`,
  `unduh`, `grafikTren` (batang bertumpuk), `grafikGaris` (SVG), `stat`, `bintang`.
- **`qr.js`** encoder QR asli (mode byte, ECC L/M/Q/H, versi 1–40, mask 0–7).
  `QR.draw(canvas, teks, { size, ecc, dark })` dan `QR.encode(teks, ecc)`.

### Halaman publik

`app/menu.html?w=<id-warung>` — halaman menu yang dibuka pelanggan setelah memindai QR
menu. Setiap item punya tombol pesan WhatsApp dengan teks terisi otomatis. Membaca data
dari `localStorage` yang sama, jadi foto produk yang diterbitkan otomatis muncul.

### Data contoh

`store.js` mengisi: 8 warung (6 aktif), 35 transaksi, 47 produk katalog, 14 promosi,
11 foto, 8 QR ulasan, dan 248 titik pantauan rating 90 hari. Tombol **Cadangan**
mengunduh JSON; **Pulihkan** memuatnya kembali; tombol muat-ulang data contoh
mengembalikan kondisi awal.

## Verifikasi (wajib sebelum menyatakan selesai)

Uji dengan Chromium di `/usr/bin/chromium` lewat Playwright. Pasang dulu:

```bash
pip install playwright pillow numpy
```

**Landing page** — `http://localhost:12000/warung-go-digital/`:
1. Tidak ada error console / pageerror.
2. `document.documentElement.scrollWidth <= window.innerWidth` di 320, 360, 390, 414,
   600, 768, 900, 1024, 1280, 1440, 1920 px.
3. Font termuat (`document.fonts`).
4. Harga di kartu, blok langganan, dan dropdown formulir sesuai tabel di atas.
5. Formulir mengirim pesan ke `wa.me/6281563324546`.

**Panel Mitra** — `http://localhost:12000/warung-go-digital/app/`:
1. Kedelapan modul terbuka tanpa error (`#/dasbor` … `#/laporan`).
2. Overflow bersih di 11 lebar layar × 8 modul = 88 kombinasi.
3. Data bertahan setelah `location.reload()`.
4. QR bisa dipindai: render QR ke PNG, lalu dekode ulang dan bandingkan teksnya.
   ```bash
   cd /tmp/qrtest && npm install jsqr pngjs
   node harness.js        # 9/9 kasus harus lulus
   ```
5. Halaman `app/menu.html?w=<id>` menampilkan menu dan tombol pesan per item.

### Jebakan CSS yang sudah pernah kena

- Grid dengan anak berisi `<select>` beropsi panjang bisa meledak melebihi viewport.
  Obatnya: `.contact__grid > * { min-width: 0; }` (landing) dan `.grid > * { min-width: 0 }`
  (panel). Selalu uji 320px.
- `.sect` (kepala halaman + tombol aksi) dan `.toolbar` harus `flex-wrap: wrap`, dan
  di bawah 620px tombolnya dibuat melebar. Tanpa itu, 320px meluber.
- `.card__head .sel` (saringan panjang) perlu `width: 100% !important` di bawah 620px.
- Bilah atas: judul perlu `flex: 1; min-width: 0` + `text-overflow: ellipsis`; label
  teks tombol Cadangan/Pulihkan disembunyikan di layar sempit.
- `.qr-card` / `.qrfloat` dan chip posisinya absolut — di layar sempit perlu
  dirapatkan ke tepi (lihat `@media (max-width: 620px)`).

### Jebakan kode yang sudah pernah kena

- **Jangan pakai satu nama atribut `data-*` untuk dua hal berbeda** (mis. chip saringan
  dan tombol aksi). Kejadian nyata: `data-balas` dipakai chip saringan sekaligus tombol
  balas ulasan → klik chip ikut membuka modal. Pakai nama berbeda: `data-saringbalas`
  untuk saringan, `data-balas` untuk aksi.
- Encoder QR: `isFunction()` tidak boleh menandai blok 9×9 kanan-bawah sebagai modul
  fungsi. QR hanya punya tiga pola pencari (kiri-atas, kanan-atas, kiri-bawah). Salah
  menandai → modul tidak ikut di-mask → QR versi 1–2 gagal dipindai.

## Deploy / hosting

- **LIVE (permanen)**: https://glistening-cannoli-c65d29.netlify.app/ — Netlify Drop,
  dibuat pengguna. Isi yang diunggah: `index.html`, `styles.css`, `app.js`.
- **Pratinjau sesi**: `http://localhost:12000/` — sementara, mati saat sesi berakhir.
- Panduan hosting lengkap (GitHub Pages, Netlify, Vercel, domain sendiri): `DEPLOY.md`.

Catatan izin: `$GITHUB_TOKEN` di lingkungan ini **tidak bisa membuat repo baru**
(error 403 "Resource not accessible by integration"), dan akun `alif121727` belum
punya repo apa pun. Jadi pembuatan repo harus dilakukan pengguna, atau perlu token
dengan scope `repo` + `workflow`.

Catatan lain: `playwright`, `pillow`, `numpy` sering hilang antar sesi — pasang ulang
dengan `pip install playwright pillow numpy` sebelum menjalankan uji.
