#!/usr/bin/env python3
"""Buat ulang paket ZIP siap-pakai di akar repo.

Jalankan dari mana saja:  python3 buat-paket.py
Menghasilkan: warung-go-digital-siap-pakai.zip
"""
import os
import zipfile

AKAR = os.path.dirname(os.path.abspath(__file__))
KELUARAN = os.path.join(AKAR, "warung-go-digital-siap-pakai.zip")
SITUS = "warung-go-digital"
# (berkas sumber di repo, nama di dalam ZIP)
DOKUMEN = [
    ("BACA-DULU.md", "BACA-DULU.md"),
    ("DEPLOY.md", "PANDUAN-DEPLOY.md"),
    ("Proposal_PKM-K_Warung_Go_Digital.pdf", "Proposal_PKM-K_Warung_Go_Digital.pdf"),
    ("warung-go-digital-repo.bundle", "warung-go-digital-repo.bundle"),
]
# Konfigurasi deploy otomatis, diletakkan di akar ZIP
KONFIG = [
    ("vercel.json", "vercel.json"),
    (".vercelignore", ".vercelignore"),
    ("netlify.toml", "netlify.toml"),
    ("dorong.sh", "dorong.sh"),
    (".github/workflows/deploy-pages.yml", ".github/workflows/deploy-pages.yml"),
]


def kumpulkan():
    entri = []
    for daftar in (DOKUMEN, KONFIG):
        for src, arc in daftar:
            p = os.path.join(AKAR, src)
            if os.path.exists(p):
                entri.append((p, arc))
            else:
                print(f"peringatan: {src} tidak ditemukan, dilewati")
    for akar, _, berkas in os.walk(os.path.join(AKAR, SITUS)):
        for f in sorted(berkas):
            p = os.path.join(akar, f)
            entri.append((p, os.path.relpath(p, AKAR)))
    return entri


def main():
    # Bundle dibuat lebih dulu: isinya dimasukkan ke ZIP, jadi harus sudah segar.
    buat_bundle()
    entri = kumpulkan()
    with zipfile.ZipFile(KELUARAN, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for src, arc in entri:
            z.write(src, arc)
    with zipfile.ZipFile(KELUARAN) as z:
        if z.testzip():
            raise SystemExit("Paket rusak — ada berkas yang tidak utuh.")
        print(f"{KELUARAN}\n{len(z.infolist())} berkas, "
              f"{os.path.getsize(KELUARAN) / 1024:.0f} KB")


def buat_bundle():
    """Bungkus seluruh repo (dengan riwayat commit) untuk diunggah ke GitHub."""
    import subprocess

    berkas = os.path.join(AKAR, "warung-go-digital-repo.bundle")
    coba = subprocess.run(
        ["git", "-C", AKAR, "bundle", "create", berkas, "--all"],
        capture_output=True, text=True,
    )
    if coba.returncode != 0:
        print(f"peringatan: gagal membuat bundle: {coba.stderr.strip()}")
        return
    print(f"{berkas}\n{os.path.getsize(berkas) / 1024:.0f} KB "
          f"(berisi seluruh riwayat commit)")


if __name__ == "__main__":
    main()
