# Cara Membuat Link Permanen

Pratinjau `http://localhost:12000/` hanya hidup selama sesi berjalan. Ikuti salah satu
cara di bawah agar linknya permanen.

Berkas yang perlu diunggah ada tiga:

```
index.html
styles.css
app.js
```

Ketiganya harus berada dalam **satu folder yang sama**. Tidak perlu server, tidak perlu
database.

---

## Cara 1 — GitHub Pages (rekomendasi)

Hasil: `https://alif121727.github.io/warung-go-digital/`

### Langkah

1. Buka https://github.com/new dan login sebagai `alif121727`.
2. Isi:
   - **Repository name**: `warung-go-digital`
   - **Visibility**: **Public** (wajib untuk akun gratis)
   - Jangan centang "Add a README file"
3. Klik **Create repository**.
4. Di halaman repo baru, klik **uploading an existing file**.
5. Seret ketiga berkas (`index.html`, `styles.css`, `app.js`) ke halaman itu.
6. Klik **Commit changes**.
7. Buka **Settings → Pages**.
8. Di bagian **Branch**, pilih `main`, folder `/ (root)`, lalu klik **Save**.
9. Tunggu 1–2 menit. Muat ulang halaman itu — akan muncul kotak hijau berisi link.

Link itu **permanen**. Tidak akan hilang kecuali repo dihapus.

### Mengubah isi nanti

Unggah ulang berkas yang berubah lewat tombol **Add file → Upload files**. Link tetap
sama. Tidak perlu mengatur Pages lagi.

---

## Cara 2 — GitHub Pages lewat terminal

Cara ini hanya bisa kalau Anda punya token GitHub dengan izin membuat repo. Token di
lingkungan ini belum punya izin tersebut.

```bash
# di dalam folder yang berisi index.html, styles.css, app.js
git init -b main
git add -A
git commit -m "Warung Go Digital — landing page"
git remote add origin https://github.com/alif121727/warung-go-digital.git
git push -u origin main

# aktifkan Pages
gh api -X POST repos/alif121727/warung-go-digital/pages \
  -f source[branch]=main -f source[path]=/
```

---

## Cara 3 — Netlify Drop (paling cepat, tanpa Git)

Hasil: `https://<nama-acak>.netlify.app`

1. Buka https://app.netlify.com/drop
2. Seret **folder** yang berisi ketiga berkas ke area drop.
3. Selesai. Netlify langsung memberi link.
4. Untuk nama yang rapi: **Site settings → Change site name** → isi `warung-go-digital`.
   Hasilnya `https://warung-go-digital.netlify.app`.
5. Agar permanen jangka panjang, buat akun gratis dulu sebelum drop (kalau tidak,
   situsnya bisa kedaluwarsa).

Tidak perlu akun GitHub. Cocok kalau tidak mau repo publik.

---

## Cara 4 — Vercel

Hasil: `https://warung-go-digital.vercel.app`

1. Buka https://vercel.com dan daftar (bisa pakai akun GitHub).
2. Klik **Add New → Project**.
3. Kalau berkas ada di GitHub, pilih repo-nya → **Deploy**.
4. Kalau tidak pakai Git: pasang CLI lalu jalankan:

```bash
npm i -g vercel
cd /path/ke/folder-situs
vercel --prod
```

---

## Perbandingan

| Cara | Perlu akun | Repo publik | Nama link | Kesulitan |
|---|---|---|---|---|
| GitHub Pages | GitHub (sudah ada) | Ya | `alif121727.github.io/warung-go-digital` | Mudah |
| Netlify Drop | Opsional | Tidak | `warung-go-digital.netlify.app` | Paling mudah |
| Vercel | Ya | Tidak | `warung-go-digital.vercel.app` | Sedang |

---

## Kalau ingin domain sendiri

Contoh: `warunggodigital.id`

1. Beli domain di registrar (Namecheap, Cloudflare, Niagahoster, dsb).
   Perkiraan biaya: Rp 150.000–200.000 per tahun untuk `.id`.
2. Di GitHub Pages: **Settings → Pages → Custom domain** → isi domain → Save.
3. Di pengaturan DNS registrar, tambahkan:
   - `A` ke `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` untuk `www` ke `alif121727.github.io`
4. Centang **Enforce HTTPS**.

Tunggu sampai 24 jam untuk propagasi DNS.

---

## Yang perlu diperhatikan

- **Repo publik berarti kode bisa dilihat siapa saja.** Untuk landing page seperti ini
  tidak masalah — tidak ada data rahasia. Nomor WhatsApp memang sudah tampil di halaman.
- **Jangan mengunggah PDF proposal** ke repo publik kalau isinya belum ingin dipublikasi.
  Situs tidak membutuhkannya.
- **Link tidak akan hilang** selama repo tidak dihapus dan Pages tetap aktif.
