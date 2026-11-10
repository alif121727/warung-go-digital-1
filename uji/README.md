# Skrip uji

Semua uji memakai Chromium di `/usr/bin/chromium` lewat Playwright Python.

```bash
pip install playwright
cd /workspace/project && python3 -m http.server 12000 &
python3 uji/uji-fungsional.py     # 30 uji fungsional semua modul
python3 uji/uji-tata-letak.py     # 88 kombinasi lebar layar × modul
```

Uji QR membutuhkan Node + jsqr + pngjs:

```bash
cd uji && npm install jsqr pngjs
python3 uji/uji-qr.py             # render QR dari aplikasi, dekode ulang
node uji/decode-qr.js
```

`uji-qr.py` menyimpan `qr_menu.png` dan `qr_ulasan.png` di folder ini.
