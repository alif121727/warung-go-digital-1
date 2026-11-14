"""Uji menu publik: berkas terbit, tombol Terbitkan, dan isi QR.

Yang dibuktikan:
  1. menu.html?w=<id> membuka menu dari berkas terbit (bukan data lokal),
     dibuka dari konteks peramban yang benar-benar kosong.
  2. Tombol "Terbitkan menu" mengunduh berkas JSON yang sah untuk warung itu.
  3. QR yang dicetak mengodekan alamat SITUS PUBLIK, bukan localhost —
     supaya bisa dipindai HP pelanggan.
"""
import base64, json, os, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/"
DIR_UJI = os.path.dirname(os.path.abspath(__file__))
hasil = []


def cek(nama, ok, ket=""):
    hasil.append((nama, bool(ok), ket))
    print(("  OK  " if ok else " GAGAL") + f"  {nama}" + (f"   [{ket}]" if ket and not ok else ""))


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ═══ 1. Menu publik dari berkas terbit, konteks kosong ═══
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text)
          if m.type == "error" and "Failed to load resource" not in m.text else None)

    diambil = []
    pg.on("request", lambda r: diambil.append(r.url) if "menu/wr-001.json" in r.url else None)

    pg.goto(BASE + "app/menu.html?w=wr-001", wait_until="load")
    pg.wait_for_timeout(1500)
    cek("Menu publik memuat berkas terbit", len(diambil) >= 1, str(diambil))
    cek("Menu publik: nama warung benar", pg.text_content("#nama") == "Warung Bu Sari",
        pg.text_content("#nama"))
    cek("Menu publik: item tampil", pg.eval_on_selector_all(".item", "e=>e.length") >= 4,
        str(pg.eval_on_selector_all(".item", "e=>e.length")))
    cek("Menu publik: tombol pesan per item",
        pg.eval_on_selector_all(".item__pesan", "e=>e.length") >= 4)
    cek("Menu publik: tanpa localStorage (memang dari berkas)",
        pg.evaluate("()=>localStorage.length") == 0)
    ov = pg.evaluate("()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth})")
    cek("Menu publik: tanpa luber", ov["sw"] <= ov["iw"] + 1, str(ov))

    # Warung tanpa berkas terbit harus tetap ditangani dengan ramah.
    pg.goto(BASE + "app/menu.html?w=wr-tidak-ada", wait_until="load")
    pg.wait_for_timeout(1200)
    teks = pg.inner_text("body").lower()
    cek("Warung tanpa berkas: pesan ramah", "tidak ditemukan" in teks or "belum" in teks)
    cek("Menu publik: tanpa error konsol", not errs, str(errs[:2]))
    ctx.close()

    # ═══ 2. Tombol Terbitkan mengunduh berkas sah ═══
    ctx2 = b.new_context(viewport={"width": 1440, "height": 950}, accept_downloads=True)
    pg2 = ctx2.new_page()
    pg2.goto(BASE + "app/", wait_until="load")
    pg2.wait_for_timeout(1200)
    pg2.evaluate("()=>Store.muatContoh()")
    pg2.wait_for_timeout(400)
    pg2.evaluate("location.hash='#/warung'")
    pg2.wait_for_timeout(800)
    pg2.click("[data-qr]")
    pg2.wait_for_timeout(900)

    url_qr = pg2.input_value("#urlMenu")
    cek("QR menunjuk situs publik (bukan localhost)",
        url_qr.startswith("https://") and "localhost" not in url_qr
        and "/app/menu.html?w=wr-001" in url_qr, url_qr)

    # Ambil QR lebih dulu: modal "Terbitkan" menggantikan modal QR.
    png = pg2.evaluate("()=>document.querySelector('#qrMenuCanvas').toDataURL()")

    with pg2.expect_download() as info:
        pg2.click("#terbitMenu")
    unduhan = info.value
    jalur = unduhan.path()
    isi = json.load(open(jalur, encoding="utf-8"))
    cek("Berkas terbit: jenis benar", isi.get("jenis") == "menu-publik")
    cek("Berkas terbit: warung benar", isi.get("warung", {}).get("id") == "wr-001",
        str(isi.get("warung", {}).get("id")))
    cek("Berkas terbit: ada daftar menu", isinstance(isi.get("menu"), list) and len(isi["menu"]) > 0)
    cek("Berkas terbit: menu punya nama & harga",
        all(m.get("nama") and "harga" in m for m in isi.get("menu", [])))
    cek("Berkas terbit: tanpa data transaksi/catatan",
        "transaksi" not in isi and "catatan" not in isi)

    # ═══ 3. QR yang tercetak benar-benar mengodekan situs publik ═══
    tmp = tempfile.mkdtemp(prefix="qr-publik-")
    berkas = os.path.join(tmp, "qr_menu.png")
    with open(berkas, "wb") as f:
        f.write(base64.b64decode(png.split(",")[1]))
    b.close()

    keluaran = subprocess.run(["node", os.path.join(DIR_UJI, "decode-qr.js"), berkas],
                              capture_output=True, text=True)
    baris = keluaran.stdout.strip()
    print("  " + baris.replace("\n", "\n  "))
    cek("QR bisa didekode ulang", baris.startswith("LULUS"), baris)
    cek("Isi QR = alamat situs publik", "github.io" in baris and "localhost" not in baris, baris)

print("\n" + "=" * 62)
lulus = sum(1 for _, ok, _ in hasil if ok)
print(f"HASIL MENU PUBLIK: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(0 if lulus == len(hasil) else 1)
