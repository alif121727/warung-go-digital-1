# Warung Go Digital — Baca Dulu

Paket ini berisi seluruh situs dan aplikasinya. Ikuti langkah di bawah, selesai dalam
sekitar 2 menit.

---

## Cara tercepat (tanpa akun, tanpa perintah terminal)

1. Buka https://app.netlify.com/drop di peramban.
2. Seret folder **`warung-go-digital`** (bukan berkas ZIP-nya, dan bukan folder induk
   yang memuat dokumen ini) ke halaman itu.
3. Tunggu beberapa detik. Anda langsung dapat alamat seperti
   `https://nama-acak.netlify.app`.
4. Buka alamat itu — situs sudah jadi dan langsung bisa dibagikan.

Untuk memperbarui isi nanti: seret ulang foldernya ke halaman yang sama.

> **Penting:** kalau Anda menyeret tanpa login ke Netlify, alamatnya bersifat sementara
> dan bisa hilang sendiri setelah beberapa lama (pernah terjadi: alamat lama kini balas
> "Not Found"). Agar permanen, buat akun Netlify gratis dulu (login), baru seret
> foldernya. Dengan akun, alamat Anda tidak akan kedaluwarsa.

---

## Cara mencoba di komputer sendiri lebih dulu

Jangan klik ganda `index.html` — sebagian fitur tidak jalan kalau dibuka begitu
(batasan keamanan peramban pada berkas lokal).

Jalankan server kecil dari terminal, di dalam folder `warung-go-digital`:

```bash
cd warung-go-digital
python3 -m http.server 8000
```

Lalu buka:

- Landing page → http://localhost:8000/
- Panel Mitra → http://localhost:8000/app/

Hentikan server dengan `Ctrl + C`.

---

## Isi paket

Setelah ZIP diekstrak, Anda akan melihat susunan seperti ini:

```
├── BACA-DULU.md                  ← berkas yang sedang Anda baca
├── PANDUAN-DEPLOY.md             ← panduan lengkap (GitHub Pages, Vercel, domain)
├── Proposal_PKM-K_Warung_Go_Digital.pdf
└── warung-go-digital/            ← INI yang diunggah ke hosting
    ├── index.html                ← landing page (halaman pembuka)
    ├── styles.css
    ├── app.js
    └── app/                      ← Panel Mitra (aplikasi pengelolaan)
        ├── index.html
        ├── menu.html             ← halaman menu publik (tujuan QR)
        ├── styles.css
        ├── qr.js                 ← pembuat QR, berjalan sendiri tanpa layanan luar
        ├── store.js              ← penyimpanan data (localStorage)
        ├── ui.js
        ├── app.js
        └── modul-*.js            ← enam modul: transaksi, rating, katalog,
                                     promosi, foto, laporan
```

Saat mengunggah, **hanya seret folder `warung-go-digital`**. Berkas `BACA-DULU.md`,
`PANDUAN-DEPLOY.md`, dan proposal PDF cukup untuk Anda sendiri — jangan diunggah.

Yang penting: **jangan mengubah nama folder `app`**. Landing page dan semua tautan
internal mengarah ke sana.

---

## Beberapa hal yang perlu Anda tahu

- **Tidak butuh server atau database.** Semua data aplikasi disimpan di peramban
  pengunjung (`localStorage`). Jadi bisa diunggah ke hosting statis apa pun.
- **Data tidak tersinkron antar perangkat.** Yang Anda isi di laptop tidak muncul di HP.
  Untuk memindahkannya, pakai tombol **Cadangan** (unduh berkas JSON) di Panel Mitra,
  lalu **Pulihkan** di perangkat tujuan.
- **Gunakan alamat HTTPS** (Netlify/Vercel/GitHub Pages sudah otomatis). Tombol *Salin*
  dan akses kamera memerlukannya.
- **Isi awal kosong.** Aplikasi dimulai tanpa data karena Anda belum punya pelanggan.
  Isi sendiri lewat **Daftarkan Warung**, atau tekan **Muat data contoh** di dasbor bila
  ingin mencoba semua fitur lebih dulu. Tombol tong sampah di bar atas menghapus semua
  data dan kembali ke kondisi kosong.
- **QR benar-benar bisa dipindai.** Buka modul Warung atau Rating, klik ikon QR, lalu
  pindai dengan kamera ponsel.
- **Sudah rapi di HP.** Tampilan menyesuaikan layar ponsel: menu geser, tabel berubah
  jadi kartu (tanpa geser ke samping), tombol cukup besar untuk disentuh, dan tidak ada
  zoom otomatis saat mengetik. Sudah diuji dari layar 320 px sampai tablet.

---

## Alamat resmi di situs

- Paket Gratis — Rp 0
- Paket Hemat — Rp 35.000 (sekali bayar)
- Paket Plus — Rp 100.000 (sekali bayar)
- Langganan bulanan — Rp 15.000 / bulan
- WhatsApp — 081563324546 (tautan `wa.me/6281563324546`)

Angka-angka ini sudah tertulis di halaman. Kalau ingin mengubahnya, sunting
`index.html` dan cari angka yang dimaksud.
