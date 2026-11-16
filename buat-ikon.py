#!/usr/bin/env python3
"""Membuat ikon aplikasi (PWA) untuk Warung Go Digital.

Menghasilkan berkas PNG di warung-go-digital/ikon/:

    ikon-192.png            ikon biasa 192x192
    ikon-512.png            ikon biasa 512x512
    ikon-maskable-512.png   untuk Android (latar penuh, isi di zona aman)
    apple-touch-icon.png    180x180 untuk iOS (tanpa sudut membulat)

Jalankan:  python3 buat-ikon.py
Perlu:     pip install pillow
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow belum terpasang. Jalankan: pip install pillow")

AKAR = Path(__file__).resolve().parent
KELUARAN = AKAR / "warung-go-digital" / "ikon"

TINTA = (13, 26, 18)  # #0d1a12 — hijau sangat gelap
AMBER_ATAS = (255, 207, 112)  # #ffcf70
AMBER_BAWAH = (179, 115, 10)  # #b3730a


def _gradien_amber(ukuran: int) -> Image.Image:
    """Latar gradien amber, digambar per baris."""
    img = Image.new("RGB", (ukuran, ukuran))
    d = ImageDraw.Draw(img)
    for y in range(ukuran):
        t = y / max(ukuran - 1, 1)
        warna = tuple(
            round(AMBER_ATAS[i] + (AMBER_BAWAH[i] - AMBER_ATAS[i]) * t) for i in range(3)
        )
        d.line([(0, y), (ukuran, y)], fill=warna)
    return img


def _lambang_warung(ukuran: int, tinggi_relatif: float) -> Image.Image:
    """Lambang warung gelap (tenda + badan + konter) sebagai gambar transparan.

    Bentuknya mengikuti ikon `warung` di bersama/inti.js, digambar dengan
    kanvas 24x24 lalu diperbesar, supaya ikon aplikasi dan lambang di situs
    tampak sama.
    """
    img = Image.new("RGBA", (ukuran, ukuran), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    sisi = ukuran * tinggi_relatif
    tebal = max(2, int(round(sisi * 0.085)))
    skala = sisi / 24.0

    def titik(x, y):
        return (ukuran / 2 + (x - 12) * skala, ukuran / 2 + (y - 12) * skala)

    def garis(pts):
        d.line([titik(x, y) for x, y in pts], fill=TINTA + (255,), width=tebal, joint="curve")
        for x, y in (pts[0], pts[-1]):
            px, py = titik(x, y)
            r = tebal / 2
            d.ellipse([px - r, py - r, px + r, py + r], fill=TINTA + (255,))

    def poligon(pts):
        d.polygon([titik(x, y) for x, y in pts], fill=TINTA + (255,))

    poligon([(5, 4), (19, 4), (22.5, 9.5), (1.5, 9.5)])   # tenda
    garis([(4, 9.5), (4, 19.5), (20, 19.5), (20, 9.5)])    # badan
    garis([(8.5, 19.5), (8.5, 15), (15.5, 15), (15.5, 19.5)])  # konter
    return img


def _sudut_membulat(img: Image.Image, radius: int) -> Image.Image:
    """Potong gambar jadi persegi bersudut membulat."""
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255
    )
    hasil = img.convert("RGBA")
    hasil.putalpha(mask)
    return hasil


def ikon_biasa(ukuran: int) -> Image.Image:
    dasar = _gradien_amber(ukuran).convert("RGBA")
    dasar.alpha_composite(_lambang_warung(ukuran, 0.52))
    return _sudut_membulat(dasar, round(ukuran * 0.22))


def ikon_maskable(ukuran: int) -> Image.Image:
    """Latar penuh tanpa sudut membulat; lambang kecil agar aman saat dipotong OS."""
    dasar = _gradien_amber(ukuran).convert("RGBA")
    dasar.alpha_composite(_lambang_warung(ukuran, 0.34))
    return dasar


def main() -> None:
    KELUARAN.mkdir(parents=True, exist_ok=True)
    rencana = [
        ("ikon-192.png", ikon_biasa(192)),
        ("ikon-512.png", ikon_biasa(512)),
        ("ikon-maskable-512.png", ikon_maskable(512)),
        ("apple-touch-icon.png", ikon_maskable(180)),
    ]
    for nama, img in rencana:
        tujuan = KELUARAN / nama
        img.save(tujuan, "PNG", optimize=True)
        print(f"  {tujuan.relative_to(AKAR)}  {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
