# Panduan Deploy — Warung Go Digital

Paket ini berisi **tiga bagian** yang saling terhubung:

| Bagian | Alamat setelah deploy | Isi |
|---|---|---|
| Landing page | `/` | Promosi program PKM-K, daftar paket, formulir pendaftaran |
| Panel Mitra | `/app/` | Aplikasi pengelolaan: transaksi, rating, katalog, promosi, foto, laporan |
| Menu publik | `/app/menu.html?w=<id>` | Halaman menu yang dibuka pelanggan setelah memindai QR |

Tombol **Panel Mitra** di bilah atas landing page mengarah ke `/app/`.

---

## Berkas yang perlu diunggah

Unggah **seluruh isi folder** `warung-go-digital/`, dengan susunan persis seperti ini:

```
warung-go-digital/
├── index.html          ← landing page (halaman pembuka)
├── styles.css
├── app.js
└── app/                ← Panel Mitra, harus tetap di dalam subfolder "app"
    ├── index.html
    ├── menu.html
    ├── styles.css
    ├── qr.js
    ├── store.js
    ├── ui.js
    ├── app.js
    └── modul-*.js
```

Jangan mengubah nama folder `app` — tautan dari landing page dan seluruh tautan internal
aplikasi mengacu ke sana.

**Tidak perlu server, tidak perlu database.** Seluruh data aplikasi disimpan di
`localStorage` browser pengunjung.

---

## Cara 1 — Netlify Drop (paling cepat, tanpa akun)

1. Buka https://app.netlify.com/drop
2. Seret **folder** `warung-go-digital` (folder, bukan berkas ZIP) ke halaman itu.
3. Tunggu proses selesai — Anda langsung mendapat alamat `https://<nama>.netlify.app`.
4. Situs langsung permanen. Untuk memperbarui isi, seret ulang foldernya.

Cara ini sudah pernah dipakai dan berhasil:
https://glistening-cannoli-c65d29.netlify.app/

---

## Cara 2 — Netlify dengan akun (agar bisa perbarui berkali-kali)

1. Masuk ke https://app.netlify.com
2. **Add new site** → **Deploy manually**
3. Seret folder `warung-go-digital` ke kotak unggahan.
4. Buka **Site configuration → Change site name** untuk memilih nama yang rapi,
   misal `warung-go-digital` → `https://warung-go-digital.netlify.app`.

---

## Cara 3 — GitHub Pages

Hasil: `https://<username>.github.io/warung-go-digital/`

1. Buat repositori publik baru, misal `warung-go-digital`.
2. Unggah **isi** folder `warung-go-digital/` ke akar repositori
   (`index.html` harus di akar, dan folder `app/` di sampingnya).
3. Buka **Settings → Pages**.
4. Pada **Source**, pilih branch `main` dan folder `/ (root)`, lalu **Save**.
5. Tunggu 1–2 menit, lalu buka alamatnya.

### Lewat terminal

```bash
cd warung-go-digital
git init -b main
git add .
git commit -m "Warung Go Digital: landing page + panel mitra"
git remote add origin https://github.com/<username>/warung-go-digital.git
git push -u origin main
```

Mengubah isi nanti cukup dengan mengunggah ulang berkas yang berubah — alamatnya tetap.

---

## Cara 4 — Vercel

```bash
npm i -g vercel
cd warung-go-digital
vercel --prod
```

Saat ditanya, pilih **Other** sebagai framework dan biarkan setelan build kosong.

---

## Setelah deploy — periksa ini

1. Buka `/` → landing page tampil, harga benar (Hemat Rp 35.000, Plus Rp 100.000,
   langganan Rp 15.000/bulan).
2. Klik **Panel Mitra** → halaman `/app/` terbuka.
3. Di Panel Mitra, buka modul **Warung** → klik ikon QR pada salah satu baris →
   QR muncul.
4. Pindai QR itu dengan kamera ponsel → halaman menu warung terbuka.
5. Buka modul **Laporan Bulanan** → klik **Cetak Laporan** → pratinjau cetak muncul.

---

## Catatan penting

- **Data tersimpan per-browser.** Data yang Anda tambahkan di satu komputer tidak otomatis
  muncul di komputer lain, karena disimpan di `localStorage`. Untuk memindahkannya,
  pakai tombol **Cadangan** (unduh JSON) lalu **Pulihkan** di perangkat tujuan.
- **HTTPS diperlukan** agar tombol *Salin* dan akses kamera berfungsi. Netlify, Vercel,
  dan GitHub Pages sudah HTTPS otomatis.
- **Akses kamera** hanya muncul di perangkat yang mendukung. Kalau tidak ada, tombol
  unggah berkas tetap berfungsi.
- **QR dibuat di sisi klien** memakai `qr.js` tanpa layanan pihak ketiga, jadi tetap
  berfungsi meski internet lambat.
- **Jangan mengunggah PDF proposal** ke repo publik kalau isinya belum ingin dipublikasi.
  Situs tidak membutuhkannya.

---

## Kalau ingin domain sendiri

Contoh: `warunggodigital.id`

1. Beli domain di registrar (Namecheap, Cloudflare, Niagahoster, dsb).
   Perkiraan biaya Rp 150.000–200.000 per tahun untuk `.id`.
2. Di Netlify: **Domain management → Add custom domain**.
3. Ikuti petunjuk DNS yang ditampilkan Netlify (biasanya `CNAME` untuk `www` dan
   `ALIAS`/`A` untuk akar domain).
4. Tunggu propagasi DNS (biasanya di bawah 24 jam).
