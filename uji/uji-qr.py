"""Ambil QR dari aplikasi lalu dekode ulang untuk membuktikan bisa dipindai."""
import base64, json, subprocess, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/app/"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1440, "height": 950})
    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(1200)

    # QR menu dari modul Warung
    pg.evaluate("location.hash='#/warung'")
    pg.wait_for_timeout(800)
    pg.click("[data-qr]")
    pg.wait_for_timeout(1000)
    qr_menu = pg.evaluate("()=>document.querySelector('#qrMenuCanvas').toDataURL()")
    url_menu = pg.input_value("#urlMenu")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(500)

    # QR ulasan dari modul Rating
    pg.evaluate("location.hash='#/rating'")
    pg.wait_for_timeout(800)
    pg.eval_on_selector_all("#segTab button", "e=>e.forEach(x=>{if(x.dataset.tab==='qr')x.click()})")
    pg.wait_for_timeout(1000)
    qr_ulasan = pg.eval_on_selector("canvas[data-qr]", "e=>e.toDataURL()")

    b.close()

for nama, data in [("qr_menu", qr_menu), ("qr_ulasan", qr_ulasan)]:
    with open(f"./{nama}.png", "wb") as f:
        f.write(base64.b64decode(data.split(",")[1]))

print("URL menu yang dikodekan:", url_menu)
print("Berkas QR disimpan.")

hasil = subprocess.run(["node", "./qrtest/decode.js"], capture_output=True, text=True)
print(hasil.stdout)
if hasil.stderr:
    print("stderr:", hasil.stderr[:400])
sys.exit(hasil.returncode)
