#!/usr/bin/env python3
"""siapkan-aset-android.py — menyiapkan ikon & splash Android.

Dijalankan SETELAH `npx cap add android` (folder res/ harus sudah ada) dan
SEBELUM Gradle membangun. Skrip ini menimpa ikon bawaan Capacitor dengan
identitas Warung Go Digital, lalu menyiapkan layar pembuka (splash).

Pemakaian:
    python3 apk/siapkan-aset-android.py

Syarat: Pillow  (python3 -m pip install pillow)
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

AKAR = Path(__file__).resolve().parent.parent
RES = AKAR / "apk" / "android" / "app" / "src" / "main" / "res"
SUMBER = AKAR / "warung-go-digital" / "ikon" / "ikon-maskable-512.png"

# Warna merek (sama dengan --ink dan --amber di gaya.css).
INK = (13, 26, 18, 255)      # hijau gelap
AMBER = (245, 165, 36, 255)  # kuning merek

# Ukuran ikon per kerapatan layar (mengikuti template Capacitor).
DENSITAS = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
# Kanvas ikon adaptif (108dp) dan splash per kerapatan.
KANVAS_ADAPTIF = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
KANVAS_ADAPTIF_MAKS = max(KANVAS_ADAPTIF.values())
SPLASH_TEGAK = {
    "mdpi": (320, 480), "hdpi": (480, 800), "xhdpi": (720, 1280),
    "xxhdpi": (960, 1600), "xxxhdpi": (1280, 1920),
}
SPLASH_LAND = {k: (t[1], t[0]) for k, t in SPLASH_TEGAK.items()}


def ambil_logo(dasar: Image.Image) -> Image.Image:
    """Memisahkan huruf 'W' dari latar kuning menjadi gambar transparan."""
    rgba = dasar.convert("RGBA")
    px = rgba.load()
    lebar, tinggi = rgba.size
    for y in range(tinggi):
        for x in range(lebar):
            r, g, b, _ = px[x, y]
            if not (r < 120 and g < 120 and b < 120):
                px[x, y] = (r, g, b, 0)
    kotak = rgba.getbbox()
    if not kotak:
        raise SystemExit("Tidak menemukan huruf W pada ikon sumber.")
    return rgba.crop(kotak)


def tempel_di_tengah(kanvas: Image.Image, gambar: Image.Image, skala: float) -> Image.Image:
    """Menempelkan gambar di tengah kanvas pada ukuran tertentu."""
    sisi = max(1, int(round(kanvas.width * skala)))
    rasio = sisi / max(gambar.width, gambar.height)
    ukuran = (max(1, round(gambar.width * rasio)), max(1, round(gambar.height * rasio)))
    kecil = gambar.resize(ukuran, Image.LANCZOS)
    x = (kanvas.width - kecil.width) // 2
    y = (kanvas.height - kecil.height) // 2
    kanvas.alpha_composite(kecil, (x, y))
    return kanvas


def bulat(logo: Image.Image, warna: tuple) -> Image.Image:
    """Ikon bulat: lingkaran warna merek dengan huruf W di tengahnya."""
    sisi = KANVAS_ADAPTIF_MAKS
    kanvas = Image.new("RGBA", (sisi, sisi), (0, 0, 0, 0))
    ImageDraw.Draw(kanvas).ellipse((0, 0, sisi - 1, sisi - 1), fill=warna)
    return tempel_di_tengah(kanvas, logo, 0.50)


def splash(warna_latar: tuple, logo: Image.Image, ukuran: tuple) -> Image.Image:
    """Layar pembuka: latar gelap dengan logo kuning di tengah."""
    kanvas = Image.new("RGBA", ukuran, warna_latar)
    # Logo di dalam kotak kuning membulat agar tetap terlihat di latar gelap.
    sisi = int(min(ukuran) * 0.26)
    kotak = Image.new("RGBA", (sisi, sisi), AMBER)
    kotak = tempel_di_tengah(kotak, logo, 0.62)
    topeng = Image.new("L", (sisi, sisi), 0)
    ImageDraw.Draw(topeng).rounded_rectangle((0, 0, sisi - 1, sisi - 1), radius=sisi // 5, fill=255)
    kanvas.alpha_composite(Image.composite(kotak, Image.new("RGBA", (sisi, sisi), (0, 0, 0, 0)), topeng),
                           ((ukuran[0] - sisi) // 2, (ukuran[1] - sisi) // 2))
    return kanvas


def main() -> int:
    if not SUMBER.exists():
        raise SystemExit(f"Ikon sumber tidak ditemukan: {SUMBER}")
    if not RES.exists():
        raise SystemExit(
            f"Folder resource Android tidak ditemukan: {RES}\n"
            "Jalankan `npx cap add android` (dari folder apk/) lebih dulu."
        )

    dasar = Image.open(SUMBER).convert("RGBA")
    logo = ambil_logo(dasar)
    jumlah = 0

    for nama, px in DENSITAS.items():
        folder = RES / f"mipmap-{nama}"
        folder.mkdir(parents=True, exist_ok=True)

        persegi = dasar.resize((px, px), Image.LANCZOS)
        persegi.save(folder / "ic_launcher.png", "PNG", optimize=True)
        bulat(logo, AMBER).resize((px, px), Image.LANCZOS).save(
            folder / "ic_launcher_round.png", "PNG", optimize=True
        )

        # Lapisan depan ikon adaptif: huruf W saja, di dalam zona aman.
        kanvas = Image.new("RGBA", (KANVAS_ADAPTIF[nama],) * 2, (0, 0, 0, 0))
        tempel_di_tengah(kanvas, logo, 0.46)
        kanvas.save(folder / "ic_launcher_foreground.png", "PNG", optimize=True)
        jumlah += 3

    # Ikon adaptif memakai latar kuning merek, bukan putih bawaan.
    (RES / "values" / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        '    <color name="ic_launcher_background">#F5A524</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )

    # Warna layar pembuka sekaligus warna merek (menimpa bawaan Capacitor
    # yang berwarna biru/merah muda).
    (RES / "values" / "colors.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        '    <color name="splash_bg">#0D1A12</color>\n'
        '    <color name="colorPrimary">#0D1A12</color>\n'
        '    <color name="colorPrimaryDark">#0D1A12</color>\n'
        '    <color name="colorAccent">#F5A524</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )

    # Layar pembuka (cara lama) untuk semua orientasi & kerapatan.
    for nama, ukuran in SPLASH_TEGAK.items():
        (RES / f"drawable-port-{nama}").mkdir(parents=True, exist_ok=True)
        splash(INK, logo, ukuran).convert("RGB").save(
            RES / f"drawable-port-{nama}" / "splash.png", "PNG", optimize=True
        )
        jumlah += 1
    for nama, ukuran in SPLASH_LAND.items():
        (RES / f"drawable-land-{nama}").mkdir(parents=True, exist_ok=True)
        splash(INK, logo, ukuran).convert("RGB").save(
            RES / f"drawable-land-{nama}" / "splash.png", "PNG", optimize=True
        )
        jumlah += 1
    (RES / "drawable").mkdir(parents=True, exist_ok=True)
    splash(INK, logo, (480, 320)).convert("RGB").save(
        RES / "drawable" / "splash.png", "PNG", optimize=True
    )

    # Ikon layar pembuka Android 12+ (dipangkas sistem menjadi bulat).
    ikon_splash = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    tempel_di_tengah(ikon_splash, dasar, 0.68)
    ikon_splash.save(RES / "drawable" / "splash_icon.png", "PNG", optimize=True)
    jumlah += 3

    # Tema: layar pembuka Android 12+ memakai warna & ikon di atas, sedangkan
    # Android lama tetap memakai gambar splash.png. Tema dasar memakai latar
    # merek agar tidak ada kedipan putih saat aplikasi dibuka.
    (RES / "values" / "styles.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n\n"
        '    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">\n'
        '        <item name="colorPrimary">@color/colorPrimary</item>\n'
        '        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>\n'
        '        <item name="colorAccent">@color/colorAccent</item>\n'
        "    </style>\n\n"
        '    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">\n'
        '        <item name="windowActionBar">false</item>\n'
        '        <item name="windowNoTitle">true</item>\n'
        '        <item name="android:background">@color/splash_bg</item>\n'
        "    </style>\n\n"
        '    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n'
        '        <item name="android:background">@drawable/splash</item>\n'
        '        <item name="windowSplashScreenBackground">@color/splash_bg</item>\n'
        '        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>\n'
        '        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>\n'
        "    </style>\n"
        "</resources>\n",
        encoding="utf-8",
    )

    print(f"aset Android disiapkan: {jumlah} berkas ikon/splash")
    return 0


if __name__ == "__main__":
    sys.exit(main())
