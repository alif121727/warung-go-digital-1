"""Uji PWA: agar situs bisa dipasang di HP dan tetap terbuka saat offline.

Memeriksa:
  - manifest terpasang dan isinya benar (display, start_url, ikon maskable)
  - service worker terdaftar dan aktif di ketiga halaman
  - ikon benar-benar bisa diunduh dan berdimensi tepat
  - situs tetap terbuka saat offline setelah kunjungan pertama
  - tidak ada error konsol

Jalankan: python3 uji/uji-pwa.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/"
hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:46} {info}")


def pasang_pengintip_error(pg):
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on(
        "console",
        lambda m: errs.append(m.text) if m.type == "error" else None,
    )
    return errs


def sw_aktif(pg):
    return pg.evaluate(
        """async()=>{try{const r=await navigator.serviceWorker.ready;
           return r?{scope:r.scope,aktif:!!r.active}:null}catch(e){return null}}"""
    )


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ═══ 1. Ketiga halaman: manifest + service worker + tanpa error ═══
    halaman = [
        ("landing", BASE, ""),
        ("panel", BASE + "app/", "../"),
        ("menu", BASE + "app/menu.html?w=wr-001", "../"),
    ]
    for label, url, _ in halaman:
        ctx = b.new_context(viewport={"width": 390, "height": 844})
        pg = ctx.new_page()
        errs = pasang_pengintip_error(pg)
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(2200)

        man = pg.evaluate(
            "()=>{const l=document.querySelector('link[rel=manifest]');return l?l.href:null}"
        )
        cek(f"{label}: manifest terpasang", bool(man), (man or "")[-40:])

        reg = sw_aktif(pg)
        cek(f"{label}: service worker aktif", bool(reg and reg.get("aktif")), str(reg))
        cek(f"{label}: tanpa error konsol", not errs, str(errs[:2]))
        ctx.close()

    # ═══ 2. Isi manifest ═══
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE + "app/", wait_until="load")
    pg.wait_for_timeout(800)
    m = pg.evaluate(
        "async()=>{const r=await fetch('../manifest.webmanifest');return await r.json()}"
    )
    cek("manifest: display standalone", m.get("display") == "standalone", str(m.get("display")))
    cek("manifest: start_url ./app/", m.get("start_url") == "./app/", str(m.get("start_url")))
    cek("manifest: scope ./", m.get("scope") == "./", str(m.get("scope")))
    cek("manifest: ada ikon maskable",
        any("maskable" in (i.get("purpose", "")) for i in m.get("icons", [])), "")
    cek("manifest: ikon 192 dan 512 ada",
        {"192x192", "512x512"}.issubset({i.get("sizes") for i in m.get("icons", [])}), "")

    # ═══ 3. Ikon benar-benar terunduh & dimensinya tepat ═══
    for src, dim in [
        ("../ikon/ikon-192.png", "192x192"),
        ("../ikon/ikon-512.png", "512x512"),
        ("../ikon/ikon-maskable-512.png", "512x512"),
        ("../ikon/apple-touch-icon.png", "180x180"),
    ]:
        info = pg.evaluate(
            """async(src)=>{const r=await fetch(src);const bl=await r.blob();
               const bmp=await createImageBitmap(bl);
               return {status:r.status,w:bmp.width,h:bmp.height}}""",
            src,
        )
        cek(f"ikon {src.split('/')[-1]} {dim}",
            info["status"] == 200 and f"{info['w']}x{info['h']}" == dim, str(info))
    ctx.close()

    # ═══ 4. Offline: situs tetap terbuka setelah kunjungan pertama ═══
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(2500)
    # Uji offline memeriksa modul yang terisi, jadi muat data contoh dulu.
    pg.goto(BASE + "app/", wait_until="load")
    pg.wait_for_timeout(1500)
    pg.evaluate("()=>Store.muatContoh()")
    pg.wait_for_timeout(400)
    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(1500)
    jumlah = pg.evaluate(
        """async()=>{const ks=await caches.keys();let n=0;
           for(const k of ks){const c=await caches.open(k);n+=(await c.keys()).length}
           return n}"""
    )
    cek("cache terisi setelah kunjungan pertama", jumlah >= 15, f"{jumlah} berkas")

    ctx.set_offline(True)
    pg.goto(BASE + "app/", wait_until="domcontentloaded")
    pg.wait_for_timeout(1200)
    cek("offline: panel tetap terbuka",
        "404" not in pg.title() and len(pg.title()) > 0, pg.title())
    cek("offline: modul tetap dirender",
        pg.eval_on_selector_all(".stat", "e=>e.length") >= 4, "")

    pg.goto(BASE + "app/menu.html?w=wr-001", wait_until="domcontentloaded")
    pg.wait_for_timeout(1200)
    cek("offline: menu publik tetap terbuka",
        pg.eval_on_selector_all(".item", "e=>e.length") >= 4,
        f"{pg.eval_on_selector_all('.item', 'e=>e.length')} item")
    ctx.set_offline(False)
    ctx.close()

    b.close()

print("\n" + "=" * 62)
lulus = sum(1 for _, ok, _ in hasil if ok)
print(f"HASIL PWA: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(0 if lulus == len(hasil) else 1)
