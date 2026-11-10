# AGENTS.md

Catatan kerja untuk repo ini (memori sesi berikutnya).

## Isi repo

Situs statis satu halaman: landing page **Warung Go Digital** (etalase digital untuk
warung & UMKM). Sumber kontennya: `Proposal_PKM-K_Warung_Go_Digital.pdf`.

```
/workspace/project/
├── Proposal_PKM-K_Warung_Go_Digital.pdf   # sumber isi
├── index.html                             # redirect ke /warung-go-digital/
├── warung-go-digital/                     # situs sebenarnya
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── warung-go-digital.zip                  # paket siap deploy
```

## Menjalankan lokal

```bash
cd /workspace/project && python3 -m http.server 12000
# → http://localhost:12000/  (redirect ke /warung-go-digital/)
```

Catatan: server `http.server` mati begitu sesi selesai. Untuk pratinjau, nyalakan ulang
dengan perintah di atas. Untuk permanen, lihat bagian Deploy.

## Ketentuan konten yang HARUS dijaga

| Hal | Nilai |
|---|---|
| Paket Gratis | Rp 0 |
| Paket Hemat | Rp 35.000 sekali bayar |
| Paket Plus | Rp 100.000 sekali bayar |
| Langganan bulanan | Rp 15.000 / bulan |
| Paket Hemat mencakup | QR menu digital **dan** katalog WhatsApp Business |
| Nomor WhatsApp | 081563324546 → link `wa.me/6281563324546` |

Harga menu di mockup ponsel (Nasi Goreng Rp 15.000, Es Teh Rp 5.000, Ayam Bakar
Rp 22.000) adalah contoh daftar menu warung, **bukan** harga layanan — jangan diubah.

## Desain

Arah: hero gelap atmosferik → isi terang krem, berselang-seling terang/gelap.

- Font: **Bricolage Grotesque** (display), **Instrument Serif** (aksen italic),
  **JetBrains Mono** (label). Dimuat dari Google Fonts.
- Palet: tinta `#0d1a12`, amber `#f5a524`, krem `#f6f0e2`, leaf `#3ba55d`, WA `#25d366`.
- Token warna/radius/shadow ada di `:root` di `styles.css`.

### Jebakan CSS yang sudah pernah kena

- Grid dengan anak berisi `<select>` beropsi panjang bisa meledak melebihi viewport.
  Obatnya: `.contact__grid > * { min-width: 0; }`. Selalu uji 320px.
- `.qr-card` / `.qrfloat` dan chip posisinya absolut — di layar sempit perlu
  dirapatkan ke tepi (lihat `@media (max-width: 620px)`).

## Verifikasi (wajib sebelum menyatakan selesai)

Uji dengan Chromium di `/usr/bin/chromium` lewat Playwright (paket `playwright` Python
sudah terpasang; kalau hilang, `pip install playwright pillow numpy`).

Yang dicek:
1. Tidak ada error console / pageerror.
2. `document.documentElement.scrollWidth <= window.innerWidth` di 320, 360, 390, 414,
   600, 768, 900, 1024, 1280, 1440, 1920 px.
3. Font termuat (`document.fonts`).
4. Harga di kartu, blok langganan, dan dropdown formulir sesuai tabel di atas.
5. Formulir mengirim pesan ke `wa.me/6281563324546`.
6. Animasi angka, QR canvas, dan menu seluler berfungsi.

## Deploy / hosting

- **Pratinjau sesi**: `http://localhost:12000/` — sementara, mati saat sesi berakhir.
- **Permanen (GitHub Pages)**: lihat `DEPLOY.md`.

Catatan izin: `$GITHUB_TOKEN` di lingkungan ini **tidak bisa membuat repo baru**
(error 403 "Resource not accessible by integration"), dan akun `alif121727` belum
punya repo apa pun. Jadi pembuatan repo harus dilakukan pengguna, atau perlu token
dengan scope `repo` + `workflow`.
