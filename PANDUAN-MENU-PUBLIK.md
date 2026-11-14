# Panduan Menu Publik (agar QR bisa dibuka pelanggan)

Panduan ini menjelaskan cara membuat menu warung terbuka di HP **pelanggan**,
bukan hanya di HP pemilik. Ikuti bagian "Langkah singkat" bila Anda hanya ingin
menu segera jalan.

## Kenapa perlu langkah ini

Data warung di Panel Mitra disimpan di perangkat (`localStorage`). Artinya,
menu hanya ada di HP yang mengisinya. Kalau QR hanya menunjuk ke data itu,
pelanggan yang memindai dari HP lain akan melihat pesan "menu tidak tersedia".

Solusinya: menu **diterbitkan** sebagai satu berkas kecil di situs, sehingga
siapa pun yang punya tautan bisa membukanya. Tanpa perlu server dan tanpa biaya.

## Langkah singkat

1. Buka **Panel Mitra** di
   <https://alif121727.github.io/warung-go-digital-1/app/>
   (atau alamat situs Anda) → menu **Warung** → tekan tombol **QR** pada warung.

   Catatan: Panel Mitra hanya ada di situs, **tidak** di dalam APK. Aplikasi
   APK berisi dua hal: aplikasi Pemilik (catat penjualan) dan panel Pengelola
   (pantau mitra). Jadi penerbitan menu dikerjakan dari peramban.
2. Pada jendela QR, tekan **Terbitkan menu**.
   Berkas `menu-<id>.json` (misal `menu-wr-001.json`) akan terunduh.
3. Unggah berkas itu ke folder `warung-go-digital/menu/` di repositori situs.
   Di GitHub: buka folder `menu/` → **Add file** → **Upload files** → pilih
   berkasnya → **Commit changes**.
4. Tunggu sekitar satu menit sampai GitHub Pages selesai menerbitkan.
5. Cetak QR (tombol **Cetak kartu meja**) lalu pindai dengan kamera HP lain
   untuk memastikan menu terbuka.

Bila nama menu atau harga berubah, ulangi langkah 2–4. Berkas lama ditimpa
sehingga tidak menumpuk.

## Bila situs dipasang di alamat lain

Alamat situs publik ada di `warung-go-digital/app/index.html`:

```html
<meta name="wgd-situs-publik" content="https://alif121727.github.io/warung-go-digital-1/">
```

Ganti isinya dengan alamat situs Anda (harus diakhiri `/`). Alamat ini yang
dikodekan ke dalam QR, jadi harus alamat yang bisa dibuka siapa saja — bukan
`localhost` dan bukan alamat di dalam aplikasi.

## Urutan sumber data halaman menu

Halaman `app/menu.html?w=<id>` mencoba tiga sumber secara berurutan:

1. **Berkas terbit** `menu/<id>.json` — cara utama, bisa dibuka HP mana pun.
2. **Server sinkron** `/api/menu?id=<id>` — dipakai bila Anda menjalankan
   `sinkron/server.mjs`. Tidak perlu kunci karena isinya memang untuk pelanggan.
   Isi alamatnya di `app/menu.html` pada
   `<meta name="wgd-menu-server" content="https://...">` agar berlaku untuk
   semua pelanggan (bukan hanya perangkat yang menyetelnya).
3. **Data lokal** perangkat — hanya untuk mengembangkan di satu HP.

Jadi tidak ada yang rusak bila sebuah warung belum diterbitkan; ia hanya belum
bisa dibuka dari HP lain.

## Isi berkas terbit

Berkas ini **hanya** memuat data etalase:

```json
{
  "wgd": 2,
  "jenis": "menu-publik",
  "dibuat": "2026-11-10T00:00:00.000Z",
  "warung": {
    "id": "wr-001",
    "nama": "Warung Bu Sari",
    "pemilik": "Bu Sari",
    "wa": "6281234567890",
    "alamat": "Jl. Raya Kampus No. 12, Purwokerto",
    "kategori": "Warung makan",
    "placeId": "ChIJ...",
    "rating": 4.6,
    "ulasan": 128
  },
  "menu": [
    { "nama": "Nasi Goreng Spesial", "harga": 15000, "kategori": "Makanan", "ket": "" }
  ]
}
```

Tidak ada transaksi, catatan harian, atau data pribadi lain. Berkas ini memang
untuk dibaca publik, jadi jangan menambahkan data yang tidak ingin dibaca orang.

## Berkas contoh

Folder `menu/` sudah memuat contoh `wr-001.json` … `wr-005.json` agar QR contoh
langsung bisa dicoba. Ganti dengan berkas asli milik mitra Anda.

## Penerbitan otomatis (disarankan)

Mengunggah berkas dengan tangan hanya perlu dilakukan sekali per warung. Setelah
itu, biarkan Panel Mitra yang mengunggah sendiri: buka jendela **QR Menu Digital**
lalu tekan **Penerbitan otomatis**. Setiap kali data warung atau menunya berubah,
`menu-<id>.json` langsung naik ke situs — tanpa unduh dan unggah manual.

Dua cara, pilih salah satu:

### 1. GitHub (disarankan)

Buat **token halus** (fine-grained personal access token) di GitHub →
Settings → Developer settings → Personal access tokens → Fine-grained tokens.
Beri izin **Contents: Read and write** hanya pada repositori situs Anda. Tempel
token itu di panel **Penerbitan otomatis**.

- Token disimpan di perangkat pengelola saja (`localStorage`), tidak pernah
  dikirim ke mana pun selain `api.github.com`.
- Jangan bagikan token ini. Bila bocor, hapus dan buat yang baru.
- Isian bawaan: repositori `alif121727/warung-go-digital-1`, cabang `main`,
  folder `warung-go-digital/menu`.

### 2. Server sinkron

Jalankan `sinkron/server.mjs`, lalu isi alamat server dan kunci di panel
**Penerbitan otomatis**. Berkas menu dikirim ke `POST /api/menu-publik`.
Agar halaman menu membacanya, isi juga `<meta name="wgd-menu-server">` di
`app/menu.html` dengan alamat server itu — dengan begitu seluruh pelanggan
membaca dari server, bukan hanya perangkat yang menyimpan di `localStorage`.

Tekan **Uji sambungan** untuk memastikan pengaturan bekerja sebelum dipakai
sehari-hari. Bila belum diatur, tombol **Terbitkan menu** tetap bisa dipakai
seperti biasa (unduh lalu unggah sendiri).

## Bila menu tampak tidak berubah

- Pastikan nama berkasnya tepat: `menu-<id>.json` (huruf kecil semua).
- Pastikan diunggah ke folder `menu/`, bukan ke akar situs.
- Muat ulang halaman di HP (tarik ke bawah). Service worker selalu mengambil
  JSON menu dari jaringan lebih dulu, jadi harga tidak akan basi.
