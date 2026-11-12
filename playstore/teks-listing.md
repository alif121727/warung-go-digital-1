# Teks & Jawaban untuk Google Play Console

Semua isian di bawah bisa disalin-tempel ke Play Console. Panjang sudah
disesuaikan dengan batas Google Play.

- [1. Identitas aplikasi](#1-identitas-aplikasi)
- [2. Store listing](#2-store-listing)
- [3. Data safety (keamanan data)](#3-data-safety-keamanan-data)
- [4. App content (isi aplikasi)](#4-app-content-isi-aplikasi)
- [5. Konten & peringkat](#5-konten--peringkat)
- [6. Catatan rilis](#6-catatan-rilis)

---

## 1. Identitas aplikasi

| Kolom | Isi |
| --- | --- |
| App name | `Warung Go Digital` |
| Package name | `id.warunggodigital.app` |
| Default language | `Bahasa Indonesia (id-ID)` |
| App or game | `App` |
| Free or paid | `Free` |
| Category | `Business` |
| Tags | `Business`, `Finance`, `Productivity` |
| Contact email | *(isi email aktif Anda)* |
| Website | `https://alif121727.github.io/warung-go-digital-1/` |
| Privacy policy URL | `https://alif121727.github.io/warung-go-digital-1/privasi.html` |

---

## 2. Store listing

### Nama aplikasi (maks. 30 karakter)

```
Warung Go Digital
```

### Deskripsi singkat (maks. 80 karakter)

```
Catat penjualan warung harian & kirim laporan ke pengelola. Tanpa internet.
```
*(78 karakter — sudah masuk batas.)*

### Deskripsi lengkap (maks. 4000 karakter)

```
Warung Go Digital adalah aplikasi pencatatan sederhana untuk pemilik warung, toko kelontong, dan UMKM. Catat pendapatan dan pengeluaran setiap hari dalam hitungan detik, lalu kirim laporannya ke pengelola Warung Go Digital — semuanya tetap berjalan tanpa internet.

Aplikasi ini dibuat untuk pemilik usaha yang tidak punya waktu mengurus pembukuan rumit. Tidak perlu daftar akun, tidak perlu login, dan tidak ada iklan.

UNTUK PEMILIK WARUNG

• Catat penjualan harian — isi pendapatan, pengeluaran, dan jumlah transaksi; laba dihitung otomatis.
• Rincian barang — catat barang yang paling laku supaya tahu apa yang perlu ditambah stoknya.
• Riwayat & grafik — lihat tren 14 hari terakhir dan barang terlaris dalam satu layar.
• Kirim laporan ke pengelola — lewat berkas atau pesan WhatsApp, pilih periode 7 hari, 30 hari, atau semua.
• Ekspor CSV — buka di Excel atau Google Sheets bila ingin diolah sendiri.
• Cadangan & pulihkan — simpan seluruh data ke satu berkas, aman bila ganti HP.

UNTUK PENGELOLA / PENDAMPING UMKM

• Panel pengelola — pantau semua warung mitra dalam satu layar.
• Rekap otomatis — total pendapatan hari ini, bulan ini, dan total keseluruhan.
• Daftar mitra & lokasi — lihat sebaran warung mitra beserta titik petanya.
• Impor laporan — masukkan berkas laporan dari pemilik, data tergabung otomatis.
• Sinkron opsional — sambungkan ke server sendiri bila ingin laporan masuk otomatis.

KENAPA MEMILIH APLIKASI INI

• Berjalan penuh tanpa internet. Data tersimpan di HP Anda sendiri.
• Tanpa iklan, tanpa pelacakan, tanpa langganan.
• Ukuran kecil dan ringan, cocok untuk HP sederhana.
• Tampilan berbahasa Indonesia yang mudah dipahami.
• Bisa dipasang juga sebagai aplikasi web (PWA) dari peramban.

PRIVASI

Kami tidak memiliki server yang menyimpan data warung Anda. Semua catatan tersimpan di perangkat Anda. Data hanya keluar bila Anda sendiri yang mengirim atau membagikannya. Baca kebijakan privasi lengkap di https://alif121727.github.io/warung-go-digital-1/privasi.html

TENTANG KAMI

Warung Go Digital dikembangkan oleh mahasiswa Program Studi Bisnis Digital, Universitas Amikom Purwokerto, sebagai program pendampingan digitalisasi warung dan UMKM. Punya pertanyaan atau ingin warung Anda didampingi? Hubungi kami lewat WhatsApp 0815-6332-4546.
```

### Aset grafis

| Aset | Berkas | Ukuran |
| --- | --- | --- |
| App icon | `playstore/ikon-512.png` | 512×512 |
| Feature graphic | `playstore/feature-graphic-1024x500.png` | 1024×500 |
| Phone screenshots | `playstore/tangkapan/*.png` | 1080×1920 (5 berkas) |

Unggah minimal 2 tangkapan layar; kami menyediakan 5. Urutan yang disarankan:
`01-catat-penjualan`, `02-riwayat-penjualan`, `03-kirim-laporan`,
`04-ringkasan-pengelola`, `05-daftar-mitra`.

---

## 3. Data safety (keamanan data)

Bagian ini wajib diisi dan harus jujur. Jawaban di bawah sesuai perilaku
aplikasi yang sebenarnya.

**Apakah aplikasi Anda mengumpulkan atau membagikan data pengguna yang wajib diungkapkan?**

> **Tidak.**

Alasannya: aplikasi tidak mengirim data apa pun ke pengembang. Data warung
(nama warung, catatan penjualan, titik lokasi) disimpan **di dalam perangkat**.
Lokasi hanya diambil bila pengguna menekan tombol "Ambil titik lokasi", dan
hasilnya tetap di perangkat.

| Pertanyaan | Jawaban |
| --- | --- |
| Data dikumpulkan? | No |
| Data dibagikan ke pihak ketiga? | No |
| Data dienkripsi saat transit? | Tidak berlaku (tidak ada pengiriman ke kami) |
| Pengguna bisa minta data dihapus? | Yes — lewat menu "Hapus semua" di aplikasi |
| Komitmen Play Families | Tidak berlaku (aplikasi untuk 18+) |
| Memakai iklan? | No |
| Memakai analitik/pelacak? | No |

Catatan penting untuk Anda saat mengisi formulir: bila Anda mengisi **alamat
server sinkron** (tab Sinkron) di aplikasi, barulah catatan dikirim ke server
tersebut. Server itu milik pengelola, bukan milik pengembang aplikasi, dan
fitur ini nonaktif bila alamatnya dikosongkan. Karena pengiriman baru terjadi
atas tindakan pengguna sendiri, ini termasuk "user-initiated action" dan tidak
wajib diungkapkan sebagai pengumpulan data otomatis.

**Izin yang diminta aplikasi** (agar cocok dengan formulir Data safety):

| Izin | Alasan | Boleh ditolak? |
| --- | --- | --- |
| `ACCESS_COARSE_LOCATION` | Menyimpan titik lokasi warung saat tombol "Ambil titik lokasi" ditekan | Ya, fitur lain tetap jalan |
| `INTERNET` | Hanya untuk fitur Sinkron opsional | Ya |

---

## 4. App content (isi aplikasi)

| Bagian | Jawaban |
| --- | --- |
| Privacy policy | `https://alif121727.github.io/warung-go-digital-1/privasi.html` |
| App access | `All functionality is available without special access` — tidak ada login |
| Ads | `No, my app does not contain ads` |
| Content rating | Isi kuesioner; jawab **Tidak** untuk semua kategori sensitif. Hasil: semua umur |
| Target audience | `18 and over` (aplikasi untuk pemilik usaha dewasa) |
| News app | No |
| COVID-19 contact tracing | No |
| Data safety | Lihat bagian 3 di atas |
| Government app | No |
| Financial features | **No** — aplikasi hanya mencatat, tidak memproses pembayaran atau pinjaman |
| Health | No |
| Advertising ID | Tidak dipakai |

> Catatan: karena aplikasi ini mencatat keuangan usaha (bukan keuangan pribadi
> dan tidak menyediakan transaksi), biasanya **tidak** dikategorikan sebagai
> aplikasi keuangan yang butuh deklarasi tambahan. Bila Play Console tetap
> menampilkan formulir "Financial features", jawab hanya pada bagian
> *"Other financial features"* atau nyatakan tidak ada layanan keuangan.

---

## 5. Konten & peringkat

- Kuesioner peringkat konten: jawab **Tidak** pada semua pertanyaan
  (kekerasan, seksualitas, bahasa kasar, narkoba, judi, horor, senjata).
- Perkiraan hasil: **Rated for 3+ / Semua umur**.

---

## 6. Catatan rilis

### Versi 1.2.0 (versionCode 10200)

```
Pembaruan pertama di Play Store.

• Catat penjualan harian: pendapatan, pengeluaran, jumlah transaksi, dan rincian barang.
• Riwayat 14 hari dengan grafik tren dan daftar barang terlaris.
• Kirim laporan ke pengelola lewat berkas atau WhatsApp, untuk periode 7 hari, 30 hari, atau semua.
• Ekspor CSV untuk diolah di Excel atau Google Sheets.
• Panel pengelola: rekap semua mitra, daftar warung, dan peta lokasi.
• Cadangan & pulihkan seluruh data dalam satu berkas.
• Berjalan penuh tanpa internet. Tanpa iklan dan tanpa pelacakan.
• Tombol kembali perangkat, bilah status bermerek, serta ikon dan splash screen baru.
```
