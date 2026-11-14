# Panduan Google Play Store — Warung Go Digital

Dokumen ini menjelaskan cara menghasilkan berkas **AAB** (Android App Bundle) dan
mengunggahnya ke Google Play Console. Semua langkah otomatis sudah dipasang di
`.github/workflows/bangun-apk.yml`; Anda hanya perlu menyiapkan kunci dan
mengisi halaman Play Console.

---

## 1. Identitas aplikasi

| Hal | Nilai |
| --- | --- |
| Nama aplikasi | Warung Go Digital |
| Package name (unik, permanen) | `id.warunggodigital.app` |
| Versi | 1.4.0 (`versionCode` 10400) |
| Android minimum | 7.0 (API 24) |
| Android target | 16 (API 36) — syarat Play sejak Agustus 2026 |

> **Package name tidak bisa diubah setelah dirilis.** Pastikan
> `id.warunggodigital.app` memang yang Anda inginkan.

Versi diambil dari `apk/package.json`. Naikkan `version` di berkas itu
(mis. `1.2.0` → `1.3.0`), lalu skrip `apk/setel-versi-android.py` menghitung
`versionCode`-nya otomatis:

```
versionCode = mayor × 10000 + minor × 100 + patch
```

Play menolak unggahan bila `versionCode` tidak lebih besar dari rilis sebelumnya.

---

## 2. Membuat kunci penandatangan (sekali saja)

Aplikasi Play Store wajib bertanda tangan kunci rilis, bukan kunci debug.

```bash
bash apk/buat-kunci.sh
```

Perintah ini membuat berkas `warung-go-digital.jks` dan mencetak nilai
base64-nya. Simpan berkas `.jks` dan sandinya di tempat aman — **jika hilang,
Anda tidak bisa lagi memperbarui aplikasi** (kecuali memakai Play App Signing).

Lalu buka GitHub → repo → **Settings → Secrets and variables → Actions**, dan
tambahkan 4 rahasia:

| Nama rahasia | Isi |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | keluaran base64 dari skrip di atas |
| `ANDROID_KEYSTORE_PASS` | sandi keystore |
| `ANDROID_KEY_ALIAS` | alias kunci (bawaan: `warung-go-digital`) |
| `ANDROID_KEY_PASS` | sandi kunci (biasanya sama dengan keystore) |

---

## 3. Membangun AAB & APK

Jalankan alur kerja dari GitHub → **Actions → Bangun APK Android → Run workflow**.
Setelah selesai, buka halaman run tersebut dan unduh artefak
`warung-go-digital-apk`. Di dalamnya ada:

- `warung-go-digital.apk` — untuk dibagikan langsung / dipasang manual.
- `warung-go-digital.aab` — untuk diunggah ke Google Play Console.

Bila rahasia kunci belum diisi, alur kerja tetap berjalan tetapi hanya
menghasilkan APK bertanda tangan debug, dan AAB **tidak** dibuat (Play
mewajibkan kunci rilis).

Untuk mencoba membangun di komputer sendiri, lihat `AGENTS.md` bagian
"Pembungkus APK".

---

## 4. Mengunggah ke Google Play Console

Semua berkas dan teks yang diminta Play Console **sudah disiapkan** di repo ini:

| Kebutuhan Play Console | Berkas siap pakai |
| --- | --- |
| Ikon aplikasi 512×512 | `playstore/ikon-512.png` |
| Feature graphic 1024×500 | `playstore/feature-graphic-1024x500.png` |
| Tangkapan layar HP (min. 2) | `playstore/tangkapan/` — 5 berkas 1080×1920 |
| Deskripsi singkat & panjang | `playstore/teks-listing.md` §2 |
| Jawaban Data safety | `playstore/teks-listing.md` §3 |
| Jawaban App content | `playstore/teks-listing.md` §4 |
| Catatan rilis | `playstore/teks-listing.md` §6 |
| Kebijakan privasi (URL wajib) | `https://alif121727.github.io/warung-go-digital-1/privasi.html` |

Bila ingin menyegarkan tangkapan layar (mis. setelah tampilan berubah):

```bash
python3 -m pip install pillow playwright
python3 -m playwright install chromium
bash jalankan.sh 12001                    # jalankan situs
python3 buat-aset-playstore.py http://localhost:12001
```

Lalu ikuti langkah berikut:

1. Buka <https://play.google.com/console> dan buat akun pengembang
   (sekali bayar ±25 USD).
2. **Create app** → isi nama "Warung Go Digital", bahasa Indonesia,
   jenis **App**, kategori **Business**.
3. Isi **App content** (wajib sebelum bisa dirilis):
   - Privacy policy — pakai tautan di tabel atas.
   - Data safety — salin jawaban dari `playstore/teks-listing.md` §3.
   - Ads — pilih "No ads".
   - Target audience — dewasa (18+), bukan untuk anak.
4. **Store listing**: unggah ikon 512×512, feature graphic 1024×500,
   minimal 2 tangkapan layar HP, dan deskripsi singkat + panjang dari
   `playstore/teks-listing.md` §2.
5. **Production → Create new release** → unggah
   `warung-go-digital.aab` → isi catatan rilis → **Review release** → **Start
   rollout**.

> **Langkah yang hanya bisa Anda lakukan:** membuat akun, membayar biaya
> pendaftaran, menerima perjanjian Google Play, dan menekan tombol rilis.
> Semua bahan teknis lainnya sudah siap di repo.

### Play App Signing (disarankan)

Saat mengunggah AAB pertama kali, Play menawarkan **Play App Signing**.
Aktifkan: Google menyimpan kunci penandatangan aplikasi, sehingga kunci
unggah Anda bisa direset bila hilang. Kunci dari `buat-kunci.sh` berperan
sebagai "upload key".

---

## 5. Yang perlu Anda siapkan untuk halaman listing

Semuanya **sudah dibuat**; Anda tinggal mengunggah:

- Deskripsi singkat (78 karakter) dan deskripsi panjang → `playstore/teks-listing.md` §2.
- Tangkapan layar aplikasi Pemilik (Catat, Riwayat, Kirim) dan Panel Pengelola
  → `playstore/tangkapan/` (5 berkas, 1080×1920).
- Feature graphic 1024×500 → `playstore/feature-graphic-1024x500.png`.
- Ikon 512×512 → `playstore/ikon-512.png`.
- Alamat kebijakan privasi →
  `https://alif121727.github.io/warung-go-digital-1/privasi.html`.

Yang masih perlu Anda isi sendiri: **email kontak pengembang** di Play Console
(Play menolak alamat contoh seperti `contoh@email.com`).

---

## 6. Hal teknis yang sudah disiapkan

- **Ikon adaptif** (latar kuning merek + huruf W), ikon bulat, dan ikon
  semua kerapatan — dibuat oleh `apk/siapkan-aset-android.py`.
- **Splash screen**: latar hijau merek `#0d1a12` dengan logo, untuk Android
  lama maupun Android 12+ (memakai `windowSplashScreenAnimatedIcon`).
- **Bilah status** mengikuti warna merek dan tidak menimpa konten
  (`overlaysWebView: false`).
- **Tombol kembali perangkat**: menutup dialog → pindah ke tab pertama →
  keluar dari aplikasi (lihat `warung-go-digital/bersama/native.js`).
- **Unduh berkas** (CSV, JSON cadangan, poster): di dalam aplikasi disimpan
  ke perangkat lalu dibuka menu Bagikan Android, karena unduhan lewat
  `blob:` tidak berjalan di WebView.
- Aplikasi berjalan penuh **tanpa internet**; tab Sinkron opsional.
- **Izin lokasi** (`ACCESS_COARSE_LOCATION`) ditambahkan lewat
  `apk/siapkan-manifest-android.py` agar tombol "Ambil titik lokasi" berfungsi
  di dalam aplikasi. Folder `apk/android/` diabaikan git, jadi penyesuaian
  manifest harus lewat skrip, bukan mengedit hasil generate.
- **Kebijakan privasi** tersedia di `warung-go-digital/privasi.html`
  (dibutuhkan Play Store) dan tertaut dari footer beranda.
