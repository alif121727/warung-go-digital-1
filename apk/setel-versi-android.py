#!/usr/bin/env python3
"""setel-versi-android.py — menyamakan versi Android dengan apk/package.json.

Google Play menolak unggahan yang nomor versinya (versionCode) tidak naik.
Skrip ini menurunkannya dari versi di package.json:
    mayor.minor.patch  ->  versionCode = mayor*10000 + minor*100 + patch
sehingga versi 1.2.0 menjadi 10200.

Jalankan setelah `npx cap add android` dan sebelum Gradle membangun:
    python3 apk/setel-versi-android.py
"""

import json
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
GRADLE = AKAR / "apk" / "android" / "app" / "build.gradle"
PAKET = AKAR / "apk" / "package.json"


def main() -> int:
    if not GRADLE.exists():
        raise SystemExit(
            f"build.gradle tidak ditemukan: {GRADLE}\n"
            "Jalankan `npx cap add android` (dari folder apk/) lebih dulu."
        )

    versi = json.loads(PAKET.read_text(encoding="utf-8"))["version"]
    mayor, minor, patch = (int(x) for x in versi.split("."))
    kode = mayor * 10000 + minor * 100 + patch

    isi = GRADLE.read_text(encoding="utf-8")
    baru, n1 = re.subn(r"versionCode \d+", f"versionCode {kode}", isi, count=1)
    baru, n2 = re.subn(r'versionName "[^"]*"', f'versionName "{versi}"', baru, count=1)
    if not (n1 and n2):
        raise SystemExit("Baris versionCode/versionName tidak ditemukan di build.gradle.")

    GRADLE.write_text(baru, encoding="utf-8")
    print(f"versi Android disetel: {versi} (versionCode {kode})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
