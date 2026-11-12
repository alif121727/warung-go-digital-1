#!/usr/bin/env python3
"""uji-playstore.py — menguji aset & skrip untuk Google Play Store.

Memeriksa:
  1. Skrip penyunting AndroidManifest.xml menambah izin lokasi dengan benar
     (termasuk aman dijalankan dua kali dan tidak merusak berkas lain).
  2. Aset Play Store yang wajib ada: ikon 512, feature graphic 1024x500,
     dan tangkapan layar berukuran tepat 1080x1920.

Jalankan:
    python3 uji/uji-playstore.py
"""

import importlib.util
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent

from PIL import Image  # noqa: E402


def _muat_skrip(nama: str):
    """Memuat modul dari berkas berpola tanda hubung (mis. siapkan-manifest-android.py)."""
    jalur = AKAR / "apk" / f"{nama}.py"
    spec = importlib.util.spec_from_file_location(nama.replace("-", "_"), jalur)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


tambah_izin_lokasi = _muat_skrip("siapkan-manifest-android").tambah_izin_lokasi
tambah_alasan_lokasi = _muat_skrip("siapkan-izin-ios").tambah_alasan_lokasi

MANIFEST_CONTOH = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="@string/app_name" />

    <!-- Permissions -->

    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
"""

MANIFEST_TANPA_INTERNET = """<manifest>
    <application />
</manifest>
"""


class Uji:
    def __init__(self):
        self.lulus = 0
        self.gagal = 0

    def periksa(self, nama, syarat, pesan=""):
        if syarat:
            self.lulus += 1
            print(f"  ✓ {nama}")
        else:
            self.gagal += 1
            print(f"  ✗ {nama}" + (f" — {pesan}" if pesan else ""))

    def ringkas(self):
        print(f"\n{self.lulus} lulus, {self.gagal} gagal")
        return 1 if self.gagal else 0


def uji_manifest(u: Uji):
    print("\nAndroidManifest.xml")
    hasil = tambah_izin_lokasi(MANIFEST_CONTOH)
    u.periksa("izin lokasi ditambahkan", "ACCESS_COARSE_LOCATION" in hasil)
    u.periksa("izin INTERNET tetap ada", 'android.permission.INTERNET' in hasil)
    u.periksa("penutup manifest utuh", hasil.rstrip().endswith("</manifest>"))
    u.periksa("hanya satu izin lokasi", hasil.count("ACCESS_COARSE_LOCATION") == 1)

    ulang = tambah_izin_lokasi(hasil)
    u.periksa("aman dijalankan dua kali", ulang == hasil)
    u.periksa("tetap satu izin lokasi setelah dua kali", ulang.count("ACCESS_COARSE_LOCATION") == 1)

    try:
        tambah_izin_lokasi(MANIFEST_TANPA_INTERNET)
        u.periksa("manifest tak terduga ditolak", False, "seharusnya melempar ValueError")
    except ValueError:
        u.periksa("manifest tak terduga ditolak", True)


def uji_izin_ios(u: Uji):
    print("\nInfo.plist iOS")
    isi = {"CFBundleName": "App", "UILaunchStoryboardName": "LaunchScreen"}
    u.periksa("alasan lokasi ditambahkan", tambah_alasan_lokasi(isi) is True)
    u.periksa("kunci NSLocationWhenInUseUsageDescription ada",
              "NSLocationWhenInUseUsageDescription" in isi)
    u.periksa("kunci lama tidak hilang", isi.get("CFBundleName") == "App")
    u.periksa("aman dijalankan dua kali", tambah_alasan_lokasi(isi) is False)
    u.periksa("alasan cukup panjang untuk Apple (>= 10 karakter)",
              len(isi["NSLocationWhenInUseUsageDescription"]) >= 10)


def uji_aset(u: Uji):
    print("\nAset Play Store")
    ikon = AKAR / "playstore" / "ikon-512.png"
    u.periksa("ikon 512 ada", ikon.exists())
    if ikon.exists():
        u.periksa("ikon berukuran 512x512", Image.open(ikon).size == (512, 512))

    fg = AKAR / "playstore" / "feature-graphic-1024x500.png"
    u.periksa("feature graphic ada", fg.exists())
    if fg.exists():
        u.periksa("feature graphic 1024x500", Image.open(fg).size == (1024, 500))

    folder = AKAR / "playstore" / "tangkapan"
    tangkapan = sorted(folder.glob("*.png")) if folder.exists() else []
    u.periksa("minimal 2 tangkapan layar (syarat Play)", len(tangkapan) >= 2,
              f"ada {len(tangkapan)}")
    for t in tangkapan:
        u.periksa(f"{t.name} berukuran 1080x1920", Image.open(t).size == (1080, 1920))


def uji_tautan(u: Uji):
    print("\nTautan pendukung")
    privasi = AKAR / "warung-go-digital" / "privasi.html"
    u.periksa("halaman kebijakan privasi ada", privasi.exists())
    if privasi.exists():
        isi = privasi.read_text(encoding="utf-8")
        u.periksa("menyebut tidak ada iklan/pelacakan",
                  "tidak" in isi.lower() and "iklan" in isi.lower())
        u.periksa("menjelaskan izin lokasi", "Lokasi" in isi)

    landing = (AKAR / "warung-go-digital" / "index.html").read_text(encoding="utf-8")
    u.periksa("beranda menautkan kebijakan privasi", "privasi.html" in landing)

    teks = AKAR / "playstore" / "teks-listing.md"
    u.periksa("teks listing ada", teks.exists())


def main() -> int:
    print("Uji aset & skrip Google Play Store")
    u = Uji()
    uji_manifest(u)
    uji_izin_ios(u)
    uji_aset(u)
    uji_tautan(u)
    return u.ringkas()


if __name__ == "__main__":
    sys.exit(main())
