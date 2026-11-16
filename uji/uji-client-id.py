"""Uji Client ID Google: pembacaan lewat meta.

Google kini BONUS, bukan jalan masuk utama. Yang dibuktikan:

  1. <meta name="google-client-id"> benar-benar DIBACA ke window.
  2. Saat terisi, tombol Google MUNCUL di gerbang masuk.
  3. Saat kosong, tombol Google TIDAK muncul — dan gerbang tetap bisa dipakai
     lewat nama pengguna + kata sandi (inilah yang membuat APK bisa dipakai).
  4. window.WGD_GOOGLE_CLIENT_ID yang diisi lebih dulu tidak ditimpa meta.
  5. Halaman pengelola juga membaca meta yang sama.

Jalankan: python3 uji/uji-client-id.py
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/"
SITUS = Path(__file__).resolve().parent.parent / "warung-go-digital"
hasil = []


def cek(nama, ok, ket=""):
    hasil.append((nama, bool(ok), ket))
    print(("  OK  " if ok else " GAGAL") + f"  {nama}" + (f"   [{ket}]" if ket and not ok else ""))


def halaman(berkas, client_id):
    return (SITUS / berkas / "index.html").read_text(encoding="utf-8").replace(
        'name="google-client-id" content=""',
        f'name="google-client-id" content="{client_id}"',
    )


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ═══ 1. Meta terisi -> dibaca ke window, tombol Google muncul ═══
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.route("**/pemilik/", lambda r: r.fulfill(
        status=200, content_type="text/html; charset=utf-8",
        body=halaman("pemilik", "123456789012-contoh.apps.googleusercontent.com")))
    pg.goto(BASE + "pemilik/", wait_until="load")
    pg.wait_for_timeout(1200)
    nilai = pg.evaluate("()=>window.WGD_GOOGLE_CLIENT_ID || ''")
    cek("meta google-client-id dibaca ke window",
        nilai == "123456789012-contoh.apps.googleusercontent.com", nilai)
    cek("client id terisi: tombol Google muncul",
        pg.eval_on_selector_all("#gbGoogle", "e=>e.length") == 1)
    cek("client id terisi: form kata sandi tetap ada (Google hanya bonus)",
        pg.eval_on_selector_all("#gbForm", "e=>e.length") == 1)
    ctx.close()

    # ═══ 2. Meta kosong -> tombol Google tidak muncul, gerbang tetap jalan ═══
    ctx2 = b.new_context(viewport={"width": 390, "height": 844})
    pg2 = ctx2.new_page()
    pg2.goto(BASE + "pemilik/", wait_until="load")
    pg2.wait_for_timeout(1200)
    cek("meta kosong: window kosong",
        not pg2.evaluate("()=>window.WGD_GOOGLE_CLIENT_ID || ''"))
    cek("meta kosong: tombol Google tidak muncul",
        pg2.eval_on_selector_all("#gbGoogle", "e=>e.length") == 0)
    cek("meta kosong: form kata sandi tetap tersedia",
        pg2.eval_on_selector_all("#gbForm", "e=>e.length") == 1)
    ctx2.close()

    # ═══ 3. window yang diisi lebih dulu menang atas meta ═══
    ctx3 = b.new_context(viewport={"width": 390, "height": 844})
    pg3 = ctx3.new_page()
    pg3.add_init_script("window.WGD_GOOGLE_CLIENT_ID='999-dari-window.apps.googleusercontent.com'")
    pg3.route("**/pemilik/", lambda r: r.fulfill(
        status=200, content_type="text/html; charset=utf-8",
        body=halaman("pemilik", "123-dari-meta.apps.googleusercontent.com")))
    pg3.goto(BASE + "pemilik/", wait_until="load")
    pg3.wait_for_timeout(1200)
    cek("window diisi lebih dulu tidak ditimpa meta",
        pg3.evaluate("()=>window.WGD_GOOGLE_CLIENT_ID") == "999-dari-window.apps.googleusercontent.com")
    ctx3.close()

    # ═══ 4. Halaman pengelola juga membaca meta yang sama ═══
    ctx4 = b.new_context(viewport={"width": 390, "height": 844})
    pg4 = ctx4.new_page()
    pg4.route("**/admin/", lambda r: r.fulfill(
        status=200, content_type="text/html; charset=utf-8",
        body=halaman("admin", "777-pengelola.apps.googleusercontent.com")))
    pg4.goto(BASE + "admin/", wait_until="load")
    pg4.wait_for_timeout(1200)
    cek("halaman pengelola juga membaca meta",
        pg4.evaluate("()=>window.WGD_GOOGLE_CLIENT_ID || ''") == "777-pengelola.apps.googleusercontent.com")
    ctx4.close()

    b.close()

print("\n" + "=" * 62)
lulus = sum(1 for _, ok, _ in hasil if ok)
print(f"HASIL CLIENT ID: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(0 if lulus == len(hasil) else 1)
