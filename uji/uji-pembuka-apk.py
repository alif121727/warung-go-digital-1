#!/usr/bin/env python3
"""uji-pembuka-apk.py — menguji halaman pembuka di dalam APK.

Halaman pembuka (`apk/www/index.html`) menampilkan dua pilihan: Aplikasi Warung
(Pemilik) dan Panel Pengelola. Di dalam APK, WebView Capacitor **tidak** melayani
`pemilik/` sebagai direktori. Aturan `WebViewLocalServer.handleLocalRequest`
(Capacitor 8.6.0, `html5mode` bawaan true) berbunyi:

    path == "/" atau segmen-terakhir-tanpa-titik  ->  kirim <akar>/index.html
    selain itu                                    ->  kirim berkas apa adanya

Jadi tautan `href="pemilik/"` mengembalikan `index.html` yang **sama** dengan
halaman pembuka: layar tidak berubah, seolah tombolnya mati. Uji ini menjalankan
server yang meniru aturan itu, lalu benar-benar mengklik kedua tombol.

Jalankan: python3 uji/uji-pembuka-apk.py
"""

import functools
import http.server
import subprocess
import sys
import threading
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module
bantu = import_module('bantu-masuk')

AKAR = Path(__file__).resolve().parent.parent
WWW = AKAR / "apk" / "www"
PORT = 12089
hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:52} {info}")


def segmen_terakhir(path: str):
    """Meniru Uri.getLastPathSegment(): 'pemilik/' -> 'pemilik', '/' -> None."""
    bagian = [s for s in path.split("/") if s != ""]
    return bagian[-1] if bagian else None


class WebViewCapacitor(http.server.SimpleHTTPRequestHandler):
    """Server statis yang meniru cara Capacitor menyajikan berkas di dalam APK."""

    def do_GET(self):  # noqa: N802
        jalur = unquote(urlparse(self.path).path)
        akhir = segmen_terakhir(jalur)

        if jalur == "/" or (akhir is not None and "." not in akhir):
            return self._kirim(WWW / "index.html")

        return self._kirim(WWW / jalur.lstrip("/"))

    def _kirim(self, berkas: Path):
        if not berkas.is_file():
            self.send_error(404, f"tidak ada: {berkas}")
            return
        data = berkas.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(str(berkas)))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


def jalankan_server():
    handler = functools.partial(WebViewCapacitor, directory=str(WWW))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main() -> int:
    # Bangun apk/www dari sumber, supaya yang diuji adalah berkas sungguhan.
    r = subprocess.run(
        ["node", "siapkan.mjs"], cwd=AKAR / "apk", capture_output=True, text=True
    )
    cek("siapkan.mjs berhasil", r.returncode == 0, r.stderr.strip()[:60])
    if r.returncode != 0:
        return 1

    pembuka = (WWW / "index.html").read_text(encoding="utf-8")
    cek("pembuka punya tautan Pemilik", 'href="pemilik/' in pembuka)
    cek("pembuka punya tautan Pengelola", 'href="admin/' in pembuka)

    srv = jalankan_server()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 390, "height": 844})

            pg.goto(f"http://127.0.0.1:{PORT}/", wait_until="load")
            cek("halaman pembuka tampil", "Pilih aplikasi" in pg.inner_text("body"))
            tautan = pg.locator("a")
            cek("ada dua pilihan", tautan.count() == 2, f"ada {tautan.count()}")

            # Tautan tidak boleh menunjuk ke folder: WebView Capacitor akan
            # mengembalikannya sebagai halaman pembuka lagi.
            href = [tautan.nth(i).get_attribute("href") for i in range(tautan.count())]
            cek("tautan menunjuk berkas, bukan folder",
                all(h and h.endswith(".html") for h in href), str(href))

            # Tombol 1 — harus membuka aplikasi Pemilik, bukan halaman pembuka lagi.
            tautan.nth(0).click()
            pg.wait_for_timeout(1200)
            bantu.masuk_cepat(pg, "pemilik")
            cek(
                "pilihan 1 membuka aplikasi Pemilik",
                pg.url.endswith("/pemilik/index.html"),
                pg.url.rsplit("/", 2)[-2:],
            )
            cek(
                "pilihan 1 memuat kerangka aplikasi Pemilik",
                pg.locator("#judul").count() == 1
                and pg.locator("[data-tab]").count() >= 4,
                f"judul={pg.inner_text('#judul')!r}",
            )
            cek(
                "pilihan 1 tidak kembali ke halaman pembuka",
                "Pilih aplikasi" not in pg.inner_text("body"),
            )

            # Tombol 2 — harus membuka Panel Pengelola.
            pg.goto(f"http://127.0.0.1:{PORT}/", wait_until="load")
            pg.locator("a").nth(1).click()
            pg.wait_for_timeout(1200)
            bantu.masuk_cepat(pg, "pengelola")
            cek(
                "pilihan 2 membuka Panel Pengelola",
                pg.url.endswith("/admin/index.html"),
                pg.url.rsplit("/", 2)[-2:],
            )
            cek(
                "pilihan 2 memuat kerangka Panel Pengelola",
                pg.locator("#judul").count() == 1
                and "Mitra" in pg.inner_text("#judul"),
                f"judul={pg.inner_text('#judul')!r}",
            )

            b.close()
    finally:
        srv.shutdown()

    lulus = sum(1 for _, ok, _ in hasil if ok)
    print(f"\nHASIL PEMBUKA APK: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
    return 0 if lulus == len(hasil) else 1


if __name__ == "__main__":
    sys.exit(main())
