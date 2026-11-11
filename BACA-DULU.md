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
- **Aplikasi Warung (pemilik)** → http://localhost:8000/pemilik/
- **Panel Pengelola (Anda)** → http://localhost:8000/admin/
- Panel Mitra lama → http://localhost:8000/app/

Hentikan server dengan `Ctrl + C`.

---

## Isi paket

Setelah ZIP diekstrak, Anda akan melihat susunan seperti ini:

```
├── BACA-DULU.md                  ← berkas yang sedang Anda baca
├── PANDUAN-DEPLOY.md             ← panduan lengkap (GitHub Pages, Vercel, domain)
├── Proposal_PKM-K_Warung_Go_Digital.pdf
├── sinkron/                      ← server sinkron otomatis (opsional)
│   └── server.mjs
├── apk/                          ← pembungkus aplikasi Android & iPhone
│   ├── buat-kunci.sh             ← pembuat kunci penandatangan APK
│   ├── siapkan.mjs
│   └── capacitor.config.json
├── uji/                          ← berkas pengujian otomatis
└── warung-go-digital/            ← INI yang diunggah ke hosting
    ├── index.html                ← landing page (halaman pembuka)
    ├── styles.css
    ├── sw.js                     ← dukungan luring (offline)
    ├── pemilik/                  ← APLIKASI PEMILIK WARUNG
    │   ├── index.html
    │   └── app.js
    ├── admin/                    ← PANEL PENGELOLA (untuk Anda)
    │   ├── index.html
    │   └── app.js
    ├── bersama/                  ← kode & gaya yang dipakai kedua aplikasi
    │   ├── gaya.css
    │   ├── inti.js
    │   ├── data.js
    │   └── sinkron.js
    └── app/                      ← Panel Mitra (versi lama, tetap ada)
        ├── index.html
        ├── menu.html             ← halaman menu publik (tujuan QR)
        └── modul-*.js            ← enam modul: transaksi, rating, katalog,
                                     promosi, foto, laporan
```

Saat mengunggah ke hosting, **hanya seret folder `warung-go-digital`**. Berkas
`BACA-DULU.md`, `PANDUAN-DEPLOY.md`, dan proposal PDF cukup untuk Anda sendiri —
jangan diunggah. Folder `sinkron/` hanya dipakai bila Anda ingin sinkron otomatis.

Yang penting: **jangan mengubah nama folder `pemilik`, `admin`, `bersama`, dan `app`**.
Landing page dan semua tautan internal mengarah ke sana.

---

## Aplikasi Android (APK) — cara memasang

Bila pemilik warung ingin aplikasi yang berdiri sendiri (tidak lewat peramban),
unduh berkas APK-nya:

**https://github.com/alif121727/warung-go-digital-1/releases/latest/download/warung-go-digital.apk**

Langkah pemasangan di HP Android:

1. Buka tautan di atas dari HP Android, lalu unduh berkasnya.
2. Buka berkas APK dari folder Unduhan. Android akan meminta izin
   **"Instal aplikasi tidak dikenal"** — izinkan.
3. Setelah terpasang, buka aplikasi **Warung Go Digital** di layar utama.
4. Di dalamnya ada dua pilihan: **Aplikasi Warung** (untuk pemilik) dan
   **Panel Pengelola** (untuk Anda).

Satu berkas APK memuat kedua aplikasi, dan keduanya tetap berjalan tanpa internet.
APK dibuat otomatis oleh GitHub Actions setiap kali berkas aplikasi berubah.

### Menghilangkan peringatan saat pemasangan (opsional)

Selama kunci rilis belum diatur, Android menampilkan peringatan bahwa aplikasi
berasal dari sumber tidak dikenal. Peringatan itu normal, tetapi bisa dihilangkan
dengan menandatangani APK memakai kunci Anda sendiri. Cukup dilakukan sekali:

1. Di komputer, jalankan:

   ```bash
   bash apk/buat-kunci.sh
   ```

   Ikuti pertanyaannya, lalu **catat sandinya** di tempat aman. Skrip akan
   menampilkan satu baris panjang (nilai `ANDROID_KEYSTORE_BASE64`).

2. Buka GitHub → repo → **Settings** → **Secrets and variables** → **Actions**,
   lalu tambahkan empat *Repository secrets*:

   | Nama rahasia | Isinya |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | baris panjang dari skrip di atas |
   | `ANDROID_KEYSTORE_PASS` | sandi keystore yang Anda isi |
   | `ANDROID_KEY_ALIAS` | `warung-go-digital` |
   | `ANDROID_KEY_PASS` | sandi kunci (biasanya sama) |

3. Buka tab **Actions** → workflow **Bangun APK Android** → **Run workflow**.

Setelah itu APK yang dihasilkan sudah bertanda tangan rilis.

> Penting: simpan berkas kunci (`warung-go-digital.jks`) dan sandinya. Versi
> berikutnya harus memakai kunci yang sama. Bila kuncinya hilang, aplikasi
> terpasang tidak bisa diperbarui tanpa menghapusnya lebih dulu.

---

## Aplikasi iPhone (IPA) — cara memasang

Berkas IPA disiapkan untuk iPhone, tetapi **belum ditandatangani Apple**. Artinya
berkas ini belum bisa langsung dibuka seperti APK. Ada dua pilihan:

**A. Memasang sendiri dengan Apple ID (gratis, tanpa akun developer berbayar)**

1. Unduh berkas IPA:
   **https://github.com/alif121727/warung-go-digital-1/releases/download/ios-v1.0.0/warung-go-digital.ipa**
2. Di komputer, pasang **Sideloadly** (Windows/macOS) atau **AltStore**.
3. Sambungkan iPhone dengan kabel, lalu masukkan IPA tadi ke Sideloadly.
4. Masuk dengan Apple ID Anda saat diminta. Sideloadly akan memasang aplikasi ke iPhone.
5. Di iPhone, buka **Pengaturan → Umum → VPN & Manajemen Perangkat**, lalu
   percayai profil developer dengan Apple ID Anda.

> Catatan: dengan Apple ID gratis, aplikasi perlu dipasang ulang setiap 7 hari.
> Bila Anda punya **Apple Developer Program** (US$99/tahun), sertifikatnya berlaku
> setahun dan aplikasi bisa dibagikan lewat TestFlight.

**B. Memakai akun Apple Developer (berbayar)**

Beri tahu saya bila Anda sudah punya akunnya. Saya sambungkan penandatanganan
otomatis di GitHub Actions sehingga IPA bisa langsung dipasang tanpa Sideloadly.

---

## Sinkron otomatis (Cara 1) — data masuk sendiri

Cara bawaan adalah kirim manual: pemilik mengunduh berkas laporan lalu mengirimnya
lewat WhatsApp. Bila Anda ingin data masuk sendiri tanpa menekan apa pun, pakai
**server sinkron**. Server ini kecil, tanpa biaya, dan berjalan di komputer Anda.

### Menyalakan server

1. Pastikan **Node.js** terpasang di komputer Anda (versi 18 atau lebih baru).
2. Di folder repo ini, jalankan:

   ```bash
   KUNCI_TULIS=sandi-untuk-pemilik KUNCI_BACA=sandi-untuk-anda node sinkron/server.mjs
   ```

   Ganti kedua sandi dengan pilihan Anda sendiri. Sandi tulis diberikan kepada
   pemilik warung; sandi baca **hanya untuk Anda**.
3. Server menampilkan alamatnya, misalnya `http://localhost:8787`.

### Menyambungkan aplikasi

- **Pemilik** membuka tab **Sinkron**, mengisi alamat server dan **kunci tulis**.
  Setelah itu setiap catatan baru terkirim sendiri.
- **Anda** membuka tab **Sinkron** di Panel Pengelola, mengisi alamat server dan
  **kunci baca**. Laporan mitra masuk sendiri setiap 30 detik.

### Kalau HP dan komputer beda jaringan

Bila server jalan di komputer, HP perlu berada di Wi-Fi yang sama. Cari alamat IP
komputer Anda (mis. `192.168.1.10`), lalu pakai `http://192.168.1.10:8787` di kedua
aplikasi. Untuk pemakaian sehari-hari, server sebaiknya dijalankan di hosting kecil
dengan alamat HTTPS agar bisa diakses dari mana saja.

### Satu arah, seperti yang diminta

Server memakai **dua kunci berbeda**:

- Pemilik hanya memegang kunci **tulis** — ia bisa mengirim, tetapi tidak punya
  cara membaca data warung lain.
- Anda memegang kunci **baca** — hanya Anda yang bisa menarik seluruh laporan.

Data server disimpan di `sinkron/data/laporan.json`. Cadangkan berkas itu berkala.

---

## Beberapa hal yang perlu Anda tahu

- **Tidak butuh server atau database.** Aplikasi Pemilik, Panel Pengelola, dan landing
  page berjalan sendiri di peramban. Data disimpan di perangkat (`localStorage`), jadi
  situs bisa diunggah ke hosting statis apa pun. Sinkron otomatis bersifat pilihan.
- **Data tidak tersinkron antar perangkat.** Yang Anda isi di laptop tidak muncul di HP.
  Untuk memindahkannya, pakai tombol **Cadangkan** (unduh berkas JSON), lalu
  **Pulihkan** di perangkat tujuan. Untuk sinkron otomatis, lihat bagian di atas.
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
