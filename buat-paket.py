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
    entri = kumpulkan()
    with zipfile.ZipFile(KELUARAN, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for src, arc in entri:
            z.write(src, arc)
    with zipfile.ZipFile(KELUARAN) as z:
        if z.testzip():
            raise SystemExit("Paket rusak — ada berkas yang tidak utuh.")
        print(f"{KELUARAN}\n{len(z.infolist())} berkas, "
              f"{os.path.getsize(KELUARAN) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
