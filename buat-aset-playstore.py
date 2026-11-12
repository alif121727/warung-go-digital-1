#!/usr/bin/env python3
"""buat-aset-playstore.py — menyiapkan bahan unggah Google Play Store.

Menghasilkan ke folder `playstore/`:

- `feature-graphic-1024x500.png` — gambar utama wajib Play Store.
- `ikon-512.png` — salinan ikon aplikasi (Play meminta 512x512).
- `tangkapan/*.png` — tangkapan layar aplikasi pada ukuran HP (1080x1920).

Tangkapan layar diambil dari situs yang sedang berjalan (pratinjau lokal) dengan
Playwright, jadi tidak perlu perangkat Android. Data contoh diisi lebih dulu
lewat `localStorage` agar layar tidak kosong.

Pemakaian:
    python3 buat-aset-playstore.py [http://localhost:12001]

Syarat: Pillow, Playwright + Chromium
    python3 -m pip install pillow playwright && python3 -m playwright install chromium
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AKAR = Path(__file__).resolve().parent
KELUAR = AKAR / "playstore"
IKON = AKAR / "warung-go-digital" / "ikon" / "ikon-512.png"

INK = (13, 26, 18)
AMBER = (245, 165, 36)
AMBER_2 = (255, 198, 92)
CREAM = (246, 240, 226)
ON_DARK = (219, 229, 220)

# Ukuran tangkapan layar yang diterima Play Store (rasio 9:16).
HP = {"width": 1080, "height": 1920}
HP_SKALA = 2.25  # 480x853 CSS px * 2.25 = 1080x1920


def font(ukuran: int, tebal: bool = False) -> ImageFont.FreeTypeFont:
    kandidat = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if tebal
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if tebal
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for jalur in kandidat:
        if Path(jalur).exists():
            return ImageFont.truetype(jalur, ukuran)
    return ImageFont.load_default()


def pusat(d: ImageDraw.ImageDraw, teks: str, y: int, f: ImageFont.FreeTypeFont, isi) -> int:
    lebar = d.textlength(teks, font=f)
    d.text(((1024 - lebar) / 2, y), teks, font=f, fill=isi)
    return y + f.size


def gradien(ukuran, atas, bawah) -> Image.Image:
    """Gradien vertikal sederhana (tanpa numpy)."""
    w, h = ukuran
    g = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        g.putpixel((0, y), tuple(round(atas[i] + (bawah[i] - atas[i]) * t) for i in range(3)))
    return g.resize((w, h))


def feature_graphic() -> Path:
    """Gambar utama 1024x500: latar gelap merek, judul, dan ikon aplikasi."""
    lebar, tinggi = 1024, 500
    kanvas = gradien((lebar, tinggi), (16, 34, 24), INK).convert("RGBA")

    # Lingkaran cahaya hangat di kanan.
    glow = Image.new("RGBA", (lebar, tinggi), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((lebar - 460, -180, lebar + 180, 460), fill=(245, 165, 36, 46))
    kanvas.alpha_composite(glow)

    # Ikon aplikasi di kiri.
    if IKON.exists():
        ikon = Image.open(IKON).convert("RGBA").resize((196, 196), Image.LANCZOS)
        kanvas.alpha_composite(ikon, (78, (tinggi - 196) // 2))

    d = ImageDraw.Draw(kanvas)
    kiri = 320
    d.text((kiri, 118), "Warung Go Digital", font=font(58, True), fill=CREAM)
    d.text((kiri, 196), "Catat penjualan warung, kirim laporan", font=font(30), fill=ON_DARK)
    d.text((kiri, 236), "ke pengelola. Tanpa internet.", font=font(30), fill=ON_DARK)

    # Label kecil.
    d.rounded_rectangle((kiri, 306, kiri + 470, 362), radius=28, fill=AMBER)
    d.text((kiri + 26, 320), "QR menu · Katalog WhatsApp · UMKM", font=font(23, True), fill=INK)

    jalur = KELUAR / "feature-graphic-1024x500.png"
    kanvas.convert("RGB").save(jalur, "PNG", optimize=True)
    return jalur


def _tepat_hp(jalur: Path) -> None:
    """Pangkas ke tepat 1080x1920 (Play Store menuntut rasio 9:16)."""
    im = Image.open(jalur).convert("RGB")
    if im.size != (HP["width"], HP["height"]):
        im = im.resize((HP["width"], HP["height"]), Image.LANCZOS)
    im.save(jalur, "PNG", optimize=True)


def ambil_tangkapan(alamat: str) -> list[Path]:
    """Tangkapan layar dari aplikasi Pemilik & Panel Pengelola."""
    from playwright.sync_api import sync_playwright

    # Data contoh ditanam langsung ke localStorage supaya layar terisi.
    # Tanggal dihitung dari hari ini agar tab "Catat" menampilkan hari berjalan.
    from datetime import date, timedelta

    hari_ini = date.today()
    hari = [(hari_ini - timedelta(days=6 - i)).isoformat() for i in range(7)]
    omzet = [780000, 910000, 655000, 1020000, 880000, 745000, 960000]
    peng = [310000, 355000, 280000, 420000, 330000, 295000, 360000]
    trx = [42, 51, 37, 58, 49, 44, 55]
    barang = [
        ("Beras 5 kg", 4, 62000), ("Minyak 2 L", 6, 34000), ("Gula 1 kg", 9, 15000),
        ("Telur 1 kg", 11, 28000), ("Kopi sachet", 24, 2500),
    ]
    warung = {
        "id": "wr-001", "nama": "Warung Bu Sari", "pemilik": "Sari Wulandari",
        "wa": "6281563324546", "waPengelola": "6281563324546",
        "alamat": "Jl. Raya Pahlawan No. 12, Purwokerto", "jenis": "Sembako",
        "lat": -7.4216, "lng": 109.2345,
    }
    catatan = [
        {
            "id": f"ct-{i}", "tgl": hari[i], "omzet": omzet[i], "pengeluaran": peng[i],
            "jumlahTransaksi": trx[i],
            "item": [{"nama": n, "jumlah": j, "harga": h} for n, j, h in barang],
            "catatan": "Ramai karena ada hajatan" if i % 3 == 0 else "",
        }
        for i in range(len(hari))
    ]
    db_pemilik = {"meta": {"versi": 1, "dibuat": "2026-11-10T02:00:00.000Z"}, "warung": warung, "catatan": catatan}
    db_admin = {
        "meta": {"versi": 1, "dibuat": "2026-11-10T02:00:00.000Z"},
        "mitra": {"wr-001": {"warung": warung, "catatan": catatan, "diimpor": "2026-11-10T02:05:00.000Z"}},
    }

    hasil: list[Path] = []
    folder = KELUAR / "tangkapan"
    folder.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        b = p.chromium.launch()
        konteks = b.new_context(
            viewport={"width": int(HP["width"] / HP_SKALA), "height": int(HP["height"] / HP_SKALA)},
            device_scale_factor=HP_SKALA,
            is_mobile=True,
            has_touch=True,
        )
        halaman = konteks.new_page()
        halaman.goto(f"{alamat}/pemilik/", wait_until="load")
        halaman.evaluate("(d) => localStorage.setItem('wgd-pemilik-v1', JSON.stringify(d))", db_pemilik)
        halaman.evaluate("(d) => localStorage.setItem('wgd-admin-v1', JSON.stringify(d))", db_admin)

        for nama, tab, judul in [
            ("01-catat-penjualan", "catat", "Catat penjualan harian"),
            ("02-riwayat-penjualan", "riwayat", "Riwayat & grafik omzet"),
            ("03-kirim-laporan", "kirim", "Kirim laporan ke pengelola"),
        ]:
            halaman.goto(f"{alamat}/pemilik/", wait_until="load")
            halaman.click(f'[data-tab="{tab}"]')
            if tab == "catat":
                # Isi draf hari ini supaya formulir tidak tampak kosong.
                halaman.fill("#omzet", "960000")
                halaman.fill("#pengeluaran", "360000")
                halaman.fill("#trx", "55")
                halaman.fill("#catatanHari", "Ramai karena ada hajatan")
                halaman.wait_for_timeout(300)
            halaman.wait_for_timeout(700)
            jalur = folder / f"{nama}.png"
            halaman.screenshot(path=str(jalur))
            _tepat_hp(jalur)
            hasil.append(jalur)
            print(f"  {jalur.name} — {judul}")

        for nama, tab, judul in [
            ("04-ringkasan-pengelola", "ringkasan", "Rekap semua mitra"),
            ("05-daftar-mitra", "mitra", "Daftar mitra warung"),
        ]:
            halaman.goto(f"{alamat}/admin/", wait_until="load")
            halaman.click(f'[data-tab="{tab}"]')
            halaman.wait_for_timeout(700)
            jalur = folder / f"{nama}.png"
            halaman.screenshot(path=str(jalur))
            _tepat_hp(jalur)
            hasil.append(jalur)
            print(f"  {jalur.name} — {judul}")

        konteks.close()
        b.close()

    return hasil


def main() -> int:
    alamat = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:12001"
    KELUAR.mkdir(parents=True, exist_ok=True)

    fg = feature_graphic()
    print(f"feature graphic: {fg.relative_to(AKAR)} ({fg.stat().st_size // 1024} KB)")

    if IKON.exists():
        tujuan = KELUAR / "ikon-512.png"
        Image.open(IKON).convert("RGBA").save(tujuan, "PNG", optimize=True)
        print(f"ikon: {tujuan.relative_to(AKAR)}")

    try:
        tangkapan = ambil_tangkapan(alamat)
    except Exception as e:  # server belum jalan / Playwright tidak ada
        print(f"! Tangkapan layar dilewati: {e}")
        print("  Jalankan situs dulu (bash jalankan.sh), lalu ulangi.")
        return 0

    print(f"selesai: {len(tangkapan)} tangkapan layar di {KELUAR.relative_to(AKAR)}/tangkapan/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
