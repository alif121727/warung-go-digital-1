#!/usr/bin/env python3
"""siapkan-manifest-android.py — menyesuaikan AndroidManifest.xml.

Dijalankan SETELAH `npx cap add android` dan SEBELUM Gradle membangun.
Folder `apk/android/` diabaikan git, jadi penyesuaian manifest harus lewat
skrip ini, bukan dengan mengedit berkas hasil generate.

Yang dilakukan:
- Menambah izin lokasi (ACCESS_COARSE_LOCATION). Aplikasi Pemilik memakai
  `navigator.geolocation` untuk tombol "Ambil titik peta"; tanpa izin ini
  jembatan Capacitor membalas "ditolak" dan tombol itu diam saja.

Pemakaian:
    python3 apk/siapkan-manifest-android.py [jalur-AndroidManifest.xml]
"""

import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
BAWAAN = AKAR / "apk" / "android" / "app" / "src" / "main" / "AndroidManifest.xml"

IZIN_LOKASI = '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n'
PENANDA = '    <uses-permission android:name="android.permission.INTERNET" />\n'


def tambah_izin_lokasi(teks: str) -> str:
    """Menyisipkan izin lokasi setelah izin INTERNET. Aman dijalankan berkali-kali."""
    if "ACCESS_COARSE_LOCATION" in teks:
        return teks
    if PENANDA not in teks:
        raise ValueError("Penanda izin INTERNET tidak ditemukan; manifest tak terduga.")
    return teks.replace(PENANDA, PENANDA + IZIN_LOKASI, 1)


def main() -> int:
    jalur = Path(sys.argv[1]) if len(sys.argv) > 1 else BAWAAN
    if not jalur.exists():
        raise SystemExit(
            f"AndroidManifest.xml tidak ditemukan: {jalur}\n"
            "Jalankan `npx cap add android` (dari folder apk/) lebih dulu."
        )

    isi = jalur.read_text(encoding="utf-8")
    baru = tambah_izin_lokasi(isi)
    if baru == isi:
        print("Izin lokasi sudah ada, tidak diubah.")
        return 0

    jalur.write_text(baru, encoding="utf-8")
    print("Izin ACCESS_COARSE_LOCATION ditambahkan ke AndroidManifest.xml.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
