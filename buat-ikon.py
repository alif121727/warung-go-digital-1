#!/usr/bin/env python3
"""Menyiapkan ikon aplikasi (PWA) untuk Warung Go Digital.

Ikon aplikasi memakai lambang yang sama dengan logo merek, jadi bentuknya tidak
digambar ulang di sini — berkasnya diambil dari hasil `buat-logo.py` lalu
disalin ke `warung-go-digital/ikon/` dengan nama yang dipakai manifest:

    ikon-192.png            ikon biasa 192x192
    ikon-512.png            ikon biasa 512x512
    ikon-maskable-512.png   untuk Android (latar penuh, isi di zona aman)
    apple-touch-icon.png    180x180 untuk iOS (tanpa sudut membulat)

Jalankan:  python3 buat-logo.py   (lebih dulu, bila aset belum ada)
           python3 buat-ikon.py
Perlu:     pip install pillow
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow belum terpasang. Jalankan: pip install pillow")

AKAR = Path(__file__).resolve().parent
SUMBER = AKAR / "warung-go-digital" / "logo" / "png"
KELUARAN = AKAR / "warung-go-digital" / "ikon"

# (berkas sumber di logo/png/, nama tujuan di ikon/, ukuran wajib)
RENCANA = [
    ("logo-lambang-192.png", "ikon-192.png", (192, 192)),
    ("logo-lambang-512.png", "ikon-512.png", (512, 512)),
    ("ikon-maskable-512.png", "ikon-maskable-512.png", (512, 512)),
    ("apple-touch-icon.png", "apple-touch-icon.png", (180, 180)),
]


def main() -> int:
    if not SUMBER.is_dir():
        raise SystemExit(
            f"Aset logo belum ada di {SUMBER.relative_to(AKAR)}/.\n"
            "Jalankan `python3 buat-logo.py` lebih dulu."
        )
    KELUARAN.mkdir(parents=True, exist_ok=True)
    for asal, tujuan, ukuran in RENCANA:
        sumber = SUMBER / asal
        if not sumber.exists():
            raise SystemExit(f"Aset tidak ditemukan: {sumber.relative_to(AKAR)}")
        im = Image.open(sumber).convert("RGBA")
        if im.size != ukuran:
            raise SystemExit(f"{asal} berukuran {im.size}, seharusnya {ukuran}")
        im.save(KELUARAN / tujuan, "PNG", optimize=True)
        print(f"  ikon/{tujuan}  {ukuran[0]}x{ukuran[1]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
