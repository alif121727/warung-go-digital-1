#!/usr/bin/env python3
"""siapkan-izin-ios.py — menambahkan alasan izin lokasi ke Info.plist iOS.

Aplikasi Pemilik memakai `navigator.geolocation` untuk tombol "Ambil titik
lokasi". Di iOS, meminta lokasi tanpa kunci `NSLocationWhenInUseUsageDescription`
membuat sistem menutup aplikasi seketika. Kunci ini ditambahkan di sini karena
folder `apk/ios/` diabaikan git (hasil `npx cap add ios`).

Pemakaian:
    python3 apk/siapkan-izin-ios.py [jalur-Info.plist]
"""

import plistlib
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
BAWAAN = AKAR / "apk" / "ios" / "App" / "App" / "Info.plist"
KUNCI = "NSLocationWhenInUseUsageDescription"
ALASAN = (
    'Dipakai untuk menyimpan titik lokasi warung saat Anda menekan '
    '"Ambil titik lokasi". Data tetap di perangkat Anda.'
)


def tambah_alasan_lokasi(isi: dict) -> bool:
    """Menambahkan kunci alasan lokasi bila belum ada. True bila berubah."""
    if KUNCI in isi:
        return False
    isi[KUNCI] = ALASAN
    return True


def main() -> int:
    jalur = Path(sys.argv[1]) if len(sys.argv) > 1 else BAWAAN
    if not jalur.exists():
        print(f"Info.plist tidak ditemukan: {jalur} — dilewati.")
        return 0

    with jalur.open("rb") as f:
        isi = plistlib.load(f)

    if not tambah_alasan_lokasi(isi):
        print("Kunci lokasi sudah ada, tidak diubah.")
        return 0

    with jalur.open("wb") as f:
        plistlib.dump(isi, f)
    print(f"{KUNCI} ditambahkan ke Info.plist.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
