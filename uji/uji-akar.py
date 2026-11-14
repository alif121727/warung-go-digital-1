"""Uji situs saat disajikan dari AKAR domain (seperti GitHub Pages / Vercel).

Situs asli berada di folder warung-go-digital/, tetapi hosting menyajikannya sebagai
akar. Uji ini menyalin isi folder itu ke folder sementara, menyajikannya dengan
http.server, lalu memeriksa bahwa semua rute dan tautan relatif tetap benar.

Jalankan: python3 uji/uji-akar.py
"""
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

AKAR = Path(__file__).resolve().parent.parent
SITUS = AKAR / "warung-go-digital"

hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    if not ok:
        print(f"GAGAL  {nama:44} {info}")


def port_bebas():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main():
    tmp = Path(tempfile.mkdtemp(prefix="uji-akar-"))
    shutil.copytree(SITUS, tmp / "situs")
    (tmp / "situs" / ".nojekyll").touch()

    port = port_bebas()
    srv = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        cwd=tmp / "situs",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    dasar = f"http://127.0.0.1:{port}/"
    for _ in range(50):
        try:
            with socket.create_connection(("127.0.0.1", port), 0.2):
                break
        except OSError:
            time.sleep(0.1)

    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
            ctx = b.new_context(
                viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True
            )
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

            # ── Landing di akar ──
            pg.goto(dasar, wait_until="load")
            pg.wait_for_timeout(1400)
            cek("landing tampil", pg.eval_on_selector_all("h1, h2", "e=>e.length") > 0)
            cek("landing tanpa overflow",
                pg.evaluate("()=>document.documentElement.scrollWidth<=window.innerWidth+1"))
            cek("tombol aplikasi pemilik ada", pg.eval_on_selector_all('a[href="pemilik/"]', "e=>e.length") > 0)
            cek("tombol panel pengelola ada", pg.eval_on_selector_all('a[href="admin/"]', "e=>e.length") > 0)
            cek("tautan Panel Mitra lama masih ada", pg.eval_on_selector_all('a[href="app/"]', "e=>e.length") > 0)
            apk = pg.eval_on_selector_all('a[href$=".apk"]', "e=>e.map(x=>x.href)")
            cek("tautan unduh APK ada", len(apk) > 0, apk[0] if apk else "")
            cek("tautan APK mengarah ke rilis GitHub",
                any('releases/' in u and 'warung-go-digital.apk' in u for u in apk))
            cek("tautan APK tidak relatif (bisa diklik dari mana saja)",
                all(u.startswith('https://') for u in apk))

            # ── Panel Mitra di /app/ ──
            pg.goto(dasar + "app/", wait_until="load")
            pg.wait_for_timeout(900)
            # Menu publik diuji lewat wr-001, jadi muat data contoh lebih dulu.
            pg.evaluate("()=>Store.muatContoh()")
            pg.wait_for_timeout(300)
            ids = pg.eval_on_selector_all("#nav .navitem", "e=>e.map(x=>x.dataset.go)")
            cek("menu navigasi terisi", len(ids) >= 8 and all(i and i != "undefined" for i in ids),
                str(ids[:3]))
            pg.tap("#burger")
            pg.wait_for_timeout(400)
            pg.tap('[data-go="laporan"]')
            pg.wait_for_timeout(800)
            cek("navigasi lewat menu geser", pg.evaluate("()=>location.hash") == "#/laporan")

            # ── URL QR harus menunjuk SITUS PUBLIK, bukan alamat lokal ──
            # Bila QR dibangun dari location.origin, di dalam APK ia menunjuk
            # https://localhost dan tidak bisa dibuka HP pelanggan.
            pg.evaluate("location.hash='#/warung'")
            pg.wait_for_timeout(800)
            pg.click("[data-qr]")
            pg.wait_for_timeout(900)
            url_qr = pg.input_value("#urlMenu")
            pg.keyboard.press("Escape")
            pg.wait_for_timeout(300)
            cek("URL QR menunjuk situs publik",
                url_qr.startswith("https://") and "localhost" not in url_qr
                and "/app/menu.html?w=wr-001" in url_qr, url_qr)

            # ── Halaman menu publik ──
            pg.goto(dasar + "app/menu.html?w=wr-001", wait_until="load")
            pg.wait_for_timeout(1200)
            cek("menu publik tampil", pg.eval_on_selector_all(".item", "e=>e.length") >= 4)
            cek("tanpa error konsol", not errs, str(errs[:2]))

            ctx.close()
            b.close()
    finally:
        srv.terminate()
        srv.wait(timeout=10)
        shutil.rmtree(tmp, ignore_errors=True)

    print("\n" + "=" * 62)
    lulus = sum(1 for _, ok, _ in hasil if ok)
    print(f"HASIL AKAR: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
    return 0 if lulus == len(hasil) else 1


if __name__ == "__main__":
    sys.exit(main())
