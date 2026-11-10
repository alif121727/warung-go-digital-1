# Panduan Deploy — Warung Go Digital

Paket ini berisi **tiga bagian** yang saling terhubung:

| Bagian | Alamat setelah deploy | Isi |
|---|---|---|
| Landing page | `/` | Promosi program PKM-K, daftar paket, formulir pendaftaran |
| Panel Mitra | `/app/` | Aplikasi pengelolaan: transaksi, rating, katalog, promosi, foto, laporan |
| Menu publik | `/app/menu.html?w=<id>` | Halaman menu yang dibuka pelanggan setelah memindai QR |

Tombol **Panel Mitra** di bilah atas landing page mengarah ke `/app/`.

> **Belum punya repo di GitHub?** Berkas `warung-go-digital-repo.bundle` (bila ada di
> paket ini) adalah seluruh repositori beserta riwayat commit-nya. Lihat
> **Lampiran — memulihkan repo dari bundle** di bagian bawah berkas ini.

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
4. Untuk memperbarui isi, seret ulang foldernya.

> **Penting:** kalau Anda **tidak login**, alamatnya bersifat sementara dan bisa hilang
> sendiri. Alamat yang dulu dipakai untuk proyek ini kini sudah mati ("Not Found").
> Agar permanen, login dulu ke Netlify (akun gratis), baru seret foldernya.

---

## Cara 2 — Netlify dengan akun (agar bisa perbarui berkali-kali)

**Cara cepat (seret folder):**

1. Masuk ke https://app.netlify.com
2. **Add new site** → **Deploy manually**
3. Seret folder `warung-go-digital` ke kotak unggahan.
4. Buka **Site configuration → Change site name** untuk memilih nama yang rapi,
   misal `warung-go-digital` → `https://warung-go-digital.netlify.app`.

**Cara otomatis (hubungkan ke GitHub):**

1. Dorong repo ini ke GitHub (lihat **Cara 3**).
2. Di Netlify: **Add new site → Import an existing project → GitHub**.
3. Pilih repositori ini. Netlify membaca berkas `netlify.toml` yang sudah disiapkan:
   folder publiknya `warung-go-digital`, tanpa perintah build.
4. Klik **Deploy**. Setiap push berikutnya otomatis ter-deploy ulang.

---

## Cara 3 — GitHub Pages

Hasil: `https://<username>.github.io/<repo>/`

Ada dua pilihan. **Pilihan B (disarankan)** memakai workflow yang sudah disiapkan,
sehingga setiap push ter-deploy otomatis.

### Pilihan A — tanpa workflow (paling sederhana)

1. Buat repositori publik baru, misal `warung-go-digital`.
2. Unggah **isi** folder `warung-go-digital/` ke akar repositori
   (`index.html` harus di akar, dan folder `app/` di sampingnya).
3. Buka **Settings → Pages**.
4. Pada **Source**, pilih branch `main` dan folder `/ (root)`, lalu **Save**.
5. Tunggu 1–2 menit, lalu buka alamatnya.

### Pilihan B — dengan workflow (otomatis, disarankan)

Repo ini sudah memuat `.github/workflows/deploy-pages.yml`. Cukup dorong **seluruh isi
repo** (bukan hanya folder situs) ke GitHub, lalu:

1. Buka **Settings → Pages**.
2. Pada **Source**, pilih **GitHub Actions** (bukan "Deploy from a branch").
3. Selesai. Setiap push ke cabang `main` otomatis membangun dan menerbitkan
   situs. Workflow menyalin isi `warung-go-digital/` ke akar situs.

> **Wajib langkah 2.** Langkah itu hanya sekali. Selama Pages belum dinyalakan,
> workflow gagal di langkah `configure-pages` dengan pesan "Get Pages site failed".
> Tidak bisa dinyalakan otomatis: opsi `enablement` pada aksi itu menuntut token
> selain `GITHUB_TOKEN`, jadi lebih mudah menyalakannya dari halaman Settings.

Workflow memakai versi aksi terbaru (semuanya Node 24):
`checkout@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`.
Pada `upload-pages-artifact` disertakan `include-hidden-files: true` supaya
`.nojekyll` ikut terunggah — tanpa itu berkas berawalan titik dilewati.

### Lewat terminal (untuk Pilihan B)

Dari **akar repo ini** (folder yang memuat `warung-go-digital/`):

```bash
git remote add origin https://github.com/<username>/warung-go-digital.git
git push -u origin main
```

Atau pakai skrip yang sudah disiapkan:

```bash
bash dorong.sh <username> warung-go-digital publik
```

Skrip itu memeriksa perubahan yang belum di-commit, menambah remote, membuat repo
(bila `gh` CLI tersedia), lalu mendorong.

> **Catatan repo publik:** berkas `Proposal_PKM-K_Warung_Go_Digital.pdf` ikut terlihat
> siapa pun bila repo bersifat publik. Situs tidak memerlukannya. Kalau tidak ingin,
> pakai repo privat — tetapi GitHub Pages gratis tidak melayani repo privat, jadi
> pakailah Vercel atau Netlify untuk repo privat.

---

## Cara 4 — Vercel

**Lewat situs (tanpa terminal):**

1. Masuk ke https://vercel.com dan hubungkan akun GitHub Anda.
2. **Add New → Project**, pilih repositori ini.
3. Vercel membaca `vercel.json` yang sudah disiapkan: perintah build menyalin isi
   folder `warung-go-digital/` ke `dist/`, lalu `dist/` disajikan sebagai akar situs.
4. Klik **Deploy**. Setiap push berikutnya akan otomatis ter-deploy ulang.

**Lewat terminal:**

```bash
npm i -g vercel
cd ..            # kembali ke folder induk yang memuat warung-go-digital/
vercel --prod
```

Saat ditanya framework, pilih **Other**. Kalau folder induk belum punya `vercel.json`,
pilih setelan berikut saat ditanya: **Output Directory** = `warung-go-digital`
(tidak perlu perintah build).

---

## Cara 5 — Deploy otomatis lewat GitHub Actions (GitHub Pages)

Berkas `.github/workflows/deploy-pages.yml` sudah disiapkan. Setelah repositori ini
di-push ke GitHub:

1. Buka **Settings → Pages**.
2. Pada **Source**, pilih **GitHub Actions** (bukan "Deploy from a branch").
3. Selesai. Setiap push ke cabang `main` akan otomatis membangun dan
   menerbitkan situs ke `https://<username>.github.io/<repo>/`.

Workflow ini menyalin isi folder `warung-go-digital/` ke akar situs dan menambahkan
berkas `.nojekyll` (supaya GitHub tidak memproses situs dengan Jekyll). Bisa juga
dijalankan manual lewat tab **Actions → Deploy ke GitHub Pages → Run workflow**.

---

## Berkas konfigurasi yang ikut dalam paket ini

Selain folder situs, paket ini memuat beberapa berkas kecil untuk deploy otomatis:

| Berkas | Gunanya |
|---|---|
| `vercel.json` | Setelan Vercel: menyalin isi `warung-go-digital/` lalu menyajikannya sebagai akar situs |
| `.vercelignore` | Daftar berkas yang tidak perlu diunggah ke Vercel (ZIP, PDF, folder uji) |
| `netlify.toml` | Setelan Netlify: folder publik `warung-go-digital`, tanpa perintah build |
| `.github/workflows/deploy-pages.yml` | Deploy otomatis ke GitHub Pages setiap kali Anda push |
| `dorong.sh` | Skrip bantu untuk mendorong repo ini ke GitHub |

Berkas-berkas ini **opsional**. Kalau Anda memakai Netlify Drop, cukup seret folder
`warung-go-digital` dan abaikan semuanya.

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

---

## Lampiran — memulihkan repo dari bundle

Berkas `warung-go-digital-repo.bundle` adalah seluruh repositori (semua commit) dalam
satu berkas. Pakai ini kalau Anda ingin mengunggah proyek ke GitHub lengkap dengan
riwayatnya, tanpa perlu meng-clone dari tempat lain.

**Langkah 1 — Buat repositori kosong di GitHub**

Buka https://github.com/new, beri nama misal `warung-go-digital`, **jangan** centang
"Add a README". Klik **Create repository**.

**Langkah 2 — Pulihkan repo dari bundle**

```bash
git clone warung-go-digital-repo.bundle warung-go-digital-repo
cd warung-go-digital-repo

git remote set-url origin https://github.com/<username>/warung-go-digital.git
git push -u origin main
```

Ganti `<username>` dengan nama akun GitHub Anda. Setelah itu, isi repo sama persis
dengan aslinya, lengkap dengan 10 commit.

**Langkah 3 — Nyalakan hosting**

Lihat **Cara 3** (GitHub Pages), **Cara 4** (Vercel), atau **Cara 2** (Netlify) di atas.

> **Repo privat?** Bundle juga bisa dipakai untuk repo privat. Ingat bahwa GitHub Pages
> gratis tidak melayani repo privat, jadi pakai Vercel atau Netlify untuk repo privat.
