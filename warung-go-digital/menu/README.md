# Folder menu terbit

Berkas di sini adalah **menu publik** yang dibaca halaman `app/menu.html?w=<id>`
saat pelanggan memindai QR. Berkat berkas ini, menu bisa dibuka dari HP mana pun
— tidak bergantung pada data di perangkat pemilik.

## Cara menerbitkan menu warung

1. Buka Panel Mitra, pilih warung, lalu tekan **QR Menu Digital**.
2. Tekan **Terbitkan menu**. Berkas `menu-<id>.json` akan terunduh.
3. Unggah berkas itu ke folder ini (`warung-go-digital/menu/`) dengan nama
   `menu-<id>.json`. Di GitHub: **Add file → Upload files**.
4. Tunggu ±1 menit sampai GitHub Pages terbit, lalu pindai ulang QR-nya.

Berkas contoh (`wr-001.json` … `wr-005.json`) disediakan supaya QR contoh
langsung bisa dicoba. Ganti dengan berkas asli milik mitra Anda.

## Isi berkas

```json
{
  "wgd": 2,
  "jenis": "menu-publik",
  "warung": { "id": "wr-001", "nama": "...", "wa": "628...", "alamat": "...", "rating": 4.6 },
  "menu": [ { "nama": "Nasi Goreng", "harga": 15000, "kategori": "Makanan" } ]
}
```

Berkas ini **hanya** memuat data etalase: nama warung, nomor WhatsApp, alamat,
dan daftar menu. Tidak ada transaksi, catatan harian, atau data lain.

## Bila belum ada berkas

Halaman menu tetap bekerja: ia mencoba berkas terbit, lalu server sinkron
(`/api/menu`), lalu data lokal di perangkat. Jadi tidak ada yang rusak bila
sebuah warung belum diterbitkan — hanya belum bisa dibuka dari HP lain.
