# Skrip uji

Semua uji memakai Chromium di `/usr/bin/chromium` lewat Playwright Python.

```bash
pip install playwright
cd /workspace/project && python3 -m http.server 12000 &
python3 uji/uji-fungsional.py     # 33 uji fungsional semua modul + navigasi menu
python3 uji/uji-tata-letak.py     # 88 kombinasi lebar layar x modul
python3 uji/uji-hp.py             # 190 uji dukungan HP (320-768 px, sentuh)
python3 uji/uji-akar.py           # 8 uji situs saat disajikan dari akar domain
```

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

`uji-akar.py` menyalin isi `warung-go-digital/` ke folder sementara, menyajikannya
sebagai akar domain (seperti GitHub Pages / Vercel), lalu memeriksa bahwa landing,
Panel Mitra, navigasi, URL QR, dan menu publik tetap benar.
