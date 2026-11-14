"""Uji Client ID Google: pembacaan lewat meta, dan perilaku mode contoh.

Yang dibuktikan:
  1. <meta name="google-client-id"> benar-benar DIBACA (dulu tidak ada kode
     pembacanya, jadi mengisinya tidak berpengaruh sama sekali).
  2. Saat terisi, gerbang masuk berhenti memakai mode contoh.
  3. Saat kosong, mode contoh tetap ditandai terang-terangan (jangan pernah
     menyamarkan bahwa Google belum tersambung).
  4. window.WGD_GOOGLE_CLIENT_ID yang diisi lebih dulu tidak ditimpa meta.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/"
hasil = []


def cek(nama, ok, ket=""):
    hasil.append((nama, bool(ok), ket))
    print(("  OK  " if ok else " GAGAL") + f"  {nama}" + (f"   [{ket}]" if ket and not ok else ""))


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ═══ 1. Meta terisi -> dibaca ke window ═══
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.route("**/pemilik/", lambda r: r.fulfill(
        status=200, content_type="text/html; charset=utf-8",
        body=open("/workspace/project/warung-go-digital/pemilik/index.html", encoding="utf-8")
        .read().replace('name="google-client-id" content=""',
                        'name="google-client-id" content="123456789012-contoh.apps.googleusercontent.com"')))
    pg.goto(BASE + "pemilik/", wait_until="load")
    pg.wait_for_timeout(1200)
    nilai = pg.evaluate("()=>window.WGD_GOOGLE_CLIENT_ID || ''")
    cek("meta google-client-id dibaca ke window",
        nilai == "123456789012-contoh.apps.googleusercontent.com", nilai)

    # Dengan Client ID terisi, gerbang masuk TIDAK boleh menampilkan mode contoh.
    pg.click("#gbGoogle")
    pg.wait_for_timeout(1500)
    teks = pg.inner_text("body")
    cek("client id terisi: mode contoh tidak muncul", "Mode contoh" not in teks)
    cek("client id terisi: tidak ada peringatan client id kosong",
        "WGD_GOOGLE_CLIENT_ID" not in teks)
    ctx.close()

    # ═══ 2. Meta kosong -> mode contoh, ditandai jelas ═══
    ctx2 = b.new_context(viewport={"width": 390, "height": 844})
    pg2 = ctx2.new_page()
    pg2.goto(BASE + "pemilik/", wait_until="load")
    pg2.wait_for_timeout(1200)
    cek("meta kosong: window kosong",
        not pg2.evaluate("()=>window.WGD_GOOGLE_CLIENT_ID || ''"))
    pg2.click("#gbGoogle")
    pg2.wait_for_timeout(1200)
    teks2 = pg2.inner_text("body")
    cek("meta kosong: mode contoh ditandai terang-terangan", "Mode contoh" in teks2)
    cek("meta kosong: menyebut WGD_GOOGLE_CLIENT_ID", "WGD_GOOGLE_CLIENT_ID" in teks2)
    ctx2.close()

    # ═══ 3. window yang diisi lebih dulu menang atas meta ═══
    ctx3 = b.new_context(viewport={"width": 390, "height": 844})
    pg3 = ctx3.new_page()
    pg3.add_init_script("window.WGD_GOOGLE_CLIENT_ID='999-dari-window.apps.googleusercontent.com'")
    pg3.route("**/pemilik/", lambda r: r.fulfill(
        status=200, content_type="text/html; charset=utf-8",
        body=open("/workspace/project/warung-go-digital/pemilik/index.html", encoding="utf-8")
        .read().replace('name="google-client-id" content=""',
                        'name="google-client-id" content="123-dari-meta.apps.googleusercontent.com"')))
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
        body=open("/workspace/project/warung-go-digital/admin/index.html", encoding="utf-8")
        .read().replace('name="google-client-id" content=""',
                        'name="google-client-id" content="777-pengelola.apps.googleusercontent.com"')))
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
