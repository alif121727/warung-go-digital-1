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
| Versi | 1.2.0 (`versionCode` 10200) |
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

1. Buka <https://play.google.com/console> dan buat akun pengembang
   (sekali bayar ±25 USD).
2. **Create app** → isi nama "Warung Go Digital", bahasa Indonesia,
   jenis **App**, kategori **Business**.
3. Isi **App content** (wajib sebelum bisa dirilis):
   - Privacy policy — gunakan tautan ke halaman kebijakan privasi Anda.
   - Data safety — data tersimpan **lokal di perangkat**; laporan hanya
     dikirim bila pengguna mengisi alamat server sinkron. Nyatakan bahwa
     aplikasi tidak mengumpulkan data pribadi tanpa tindakan pengguna.
   - Ads — pilih "No ads".
   - Target audience — dewasa (18+), bukan untuk anak.
4. **Store listing**: unggah ikon 512×512, feature graphic 1024×500,
   minimal 2 tangkapan layar HP, dan deskripsi singkat + panjang.
   Ikon 512×512 sudah tersedia di `warung-go-digital/ikon/ikon-512.png`.
5. **Production → Create new release** → unggah
   `warung-go-digital.aab` → isi catatan rilis → **Review release** → **Start
   rollout**.

### Play App Signing (disarankan)

Saat mengunggah AAB pertama kali, Play menawarkan **Play App Signing**.
Aktifkan: Google menyimpan kunci penandatangan aplikasi, sehingga kunci
unggah Anda bisa direset bila hilang. Kunci dari `buat-kunci.sh` berperan
sebagai "upload key".

---

## 5. Yang perlu Anda siapkan untuk halaman listing

- Deskripsi singkat (maks. 80 karakter), mis.
  *"Catat penjualan warung & kirim laporan ke pengelola, tanpa internet."*
- Deskripsi panjang (maks. 4000 karakter).
- Tangkapan layar dari aplikasi Pemilik (tab Catat, Riwayat, Kirim) dan
  Panel Pengelola.
- Feature graphic 1024×500 px.
- Alamat kebijakan privasi (bisa halaman statis di GitHub Pages repo ini).

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
