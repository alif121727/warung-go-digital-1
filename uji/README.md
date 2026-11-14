# Skrip uji

Semua uji memakai Chromium di `/usr/bin/chromium` lewat Playwright Python.

```bash
pip install playwright
cd /workspace/project && python3 -m http.server 12000 &
python3 uji/uji-fungsional.py     # 33 uji fungsional semua modul + navigasi menu
python3 uji/uji-kosong.py         # 25 uji kondisi awal tanpa data + ikon pencarian
python3 uji/uji-tata-letak.py     # 88 kombinasi lebar layar x modul
python3 uji/uji-hp.py             # 190 uji dukungan HP (320-768 px, sentuh)
python3 uji/uji-akar.py           # 13 uji situs saat disajikan dari akar domain
python3 uji/uji-pwa.py            # 22 uji PWA (manifest, service worker, ikon, offline)
python3 uji/uji-dua-aplikasi.py   # 38 uji alur Pemilik -> laporan -> Pengelola
python3 uji/uji-sinkron.py        # 23 uji sinkron otomatis (menjalankan server asli)
python3 uji/uji-cerita.py         # 40 uji bagian "Cerita Bu Tini" (video + panggung)
python3 uji/uji-menu-publik.py    # 16 uji halaman menu publik + terbitkan menu
python3 uji/uji-client-id.py      # 8 uji pembaca Client ID Google
python3 uji/uji-terbit-otomatis.py # 14 uji penerbitan menu otomatis
python3 uji/uji-google.py         # 57 uji kesiapan mesin pencari (SEO)
```

Uji yang memeriksa data terisi memanggil `Store.muatContoh()` lebih dulu, karena
aplikasi kini dimulai dengan data kosong. Perhatikan bahwa `b.new_page()` dan
`new_context()` membuat penyimpanan baru, jadi tiap konteks perlu memuat data contoh
sendiri.

Uji QR membutuhkan Node + jsqr + pngjs:

```bash
cd /workspace/project && npm install    # memasang jsqr dan pngjs
python3 uji/uji-qr.py                   # render QR dari aplikasi, dekode ulang
```

`uji-qr.py` menyimpan PNG di folder sementara lalu mengoper jalurnya ke
`uji/decode-qr.js`. (Dulu skrip menulis ke `./` tetapi dekode membaca `/tmp`, sehingga
dekode memakai berkas basi dan melaporkan lulus palsu.)

`uji-hp.py` menguji: overflow, target sentuh minimal 40px, input tidak memicu zoom iOS,
tabel berubah jadi kartu di lebar <=620px, modal dalam layar, navigasi lewat menu geser,
dan halaman menu publik.

`uji-dua-aplikasi.py` menguji alur dua aplikasi baru secara utuh di dalam peramban:
pemilik mengisi data warung, mencatat penjualan, mengunduh berkas laporan, lalu panel
pengelola mengimpor berkas itu dan menampilkannya (pendapatan harian, laba, lokasi).
Juga memeriksa: kunci penyimpanan terpisah (`wgd-pemilik-v1` vs `wgd-admin-v1`),
impor berulang tidak menggandakan catatan, mode "lewat pesan" (salin rincian ke papan
klip), service worker aktif, dan aplikasi tetap terbuka saat offline.

`uji-sinkron.py` menjalankan `sinkron/server.mjs` sungguhan di port 8791 dengan dua
kunci berbeda, lalu menguji alur lengkap: pemilik mengisi data dan mengirim, server
menerima, pengelola menarik lewat tab Sinkron dan melihat omzet mitra. Termasuk uji
keamanan penting — kunci tulis milik pemilik harus DITOLAK saat dipakai membaca data
mitra — serta uji bahwa tanggal yang sama ditimpa, bukan digandakan.

`uji-akar.py` menyalin isi `warung-go-digital/` ke folder sementara, menyajikannya
sebagai akar domain (seperti GitHub Pages / Vercel), lalu memeriksa bahwa landing,
Panel Mitra, navigasi, URL QR, dan menu publik tetap benar.
