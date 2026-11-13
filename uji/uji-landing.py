"""Uji laman pembuka (landing) setelah penyegaran tampilan futuristik.

Yang dijaga di sini adalah hal-hal yang mudah rusak tanpa terlihat:

1. Tidak ada geser samping (overflow) di segala ukuran layar. Aurora
   `.fx-aurora` memakai `position: absolute`; bila seksi induknya bukan
   "positioned", aurora memakai viewport sebagai acuan, lolos dari
   `overflow: hidden`, dan halaman jadi bisa digeser ke samping.
2. Keempat maskot benar-benar termuat (bukan ikon rusak).
3. Kelas gaya baru (`.fx-*`, `.maskot*`) terpasang, bukan hanya ada di CSS.
4. Target sentuh kartu maskot tetap cukup besar untuk jari.
5. Tanpa error console.

Jalankan: python3 uji/uji-landing.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import base64
import os
import subprocess
import sys
import tempfile
from playwright.sync_api import sync_playwright

LANDING = "http://localhost:12000/warung-go-digital/"
UNDUH = LANDING + "unduh.html"
DIR_UJI = os.path.dirname(os.path.abspath(__file__))
APK = ("https://github.com/alif121727/warung-go-digital-1/releases/download/"
       "v1.3.0/warung-go-digital.apk")
IPA = ("https://github.com/alif121727/warung-go-digital-1/releases/download/"
       "ios-v1.3.0/warung-go-digital.ipa")
QR_DIHARAP = "https://alif121727.github.io/warung-go-digital-1/unduh.html"
UKURAN = [320, 360, 390, 430, 600, 768, 1024, 1440, 1920]
MASKOT = ["ilustrasi/pak-warung.svg", "ilustrasi/si-qr.svg",
          "ilustrasi/es-teh.svg", "ilustrasi/kucing-warung.svg"]

hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    if not ok:
        print(f"GAGAL  {nama:52} {info}")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    for w in UKURAN:
        pg = b.new_page(viewport={"width": w, "height": 900},
                        is_mobile=w < 800, has_touch=w < 800)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(LANDING, wait_until="load")
        pg.wait_for_timeout(1100)

        r = pg.evaluate("()=>({sw:document.documentElement.scrollWidth, iw:window.innerWidth})")
        cek(f"{w}px tanpa geser samping", r["sw"] <= r["iw"] + 1, f"{r['sw']}>{r['iw']}")

        # Geser paksa: bila ada elemen yang lolos klip, scrollX akan > 0.
        pg.evaluate("()=>window.scrollTo(4000,0)")
        pg.wait_for_timeout(150)
        sx = pg.evaluate("()=>window.scrollX")
        cek(f"{w}px tidak bisa digeser ke samping", sx == 0, f"scrollX={sx}")

        if w == 1440:
            cek("tanpa error console", not errs, str(errs[:3]))
        pg.close()

    # Pemeriksaan isi pada satu ukuran saja
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1000)
    # Maskot memakai loading="lazy", jadi harus digulir ke tampilan dulu.
    pg.evaluate("()=>document.querySelector('#maskot').scrollIntoView()")
    pg.wait_for_timeout(1200)
    pg.wait_for_function(
        """()=>[...document.querySelectorAll('.maskot__img')]
             .every(i=>i.complete && i.naturalWidth>0)""",
        timeout=8000,
    )

    dimuat = pg.evaluate(
        """()=>[...document.querySelectorAll('.maskot__img')].map(i=>({
             src:i.getAttribute('src'), w:i.naturalWidth, h:i.naturalHeight}))"""
    )
    for jalur in MASKOT:
        cocok = [d for d in dimuat if d["src"] == jalur]
        cek(f"maskot termuat: {jalur.split('/')[-1]}",
            bool(cocok) and cocok[0]["w"] > 0 and cocok[0]["h"] > 0,
            str(cocok))

    ada = pg.evaluate(
        """()=>({
             seksi: !!document.querySelector('#maskot'),
             kartu: document.querySelectorAll('.maskot__card').length,
             aurora: document.querySelectorAll('.fx-aurora').length,
             grain: !!document.querySelector('.fx-grain'),
             grad: !!document.querySelector('.hero__title .fx-grad'),
             hud: !!document.querySelector('.glowcard.fx-hud'),
             ring: !!document.querySelector('.price--feature.fx-ring'),
             tag: document.querySelectorAll('.fx-tag').length,
           })"""
    )
    cek("seksi #maskot ada", ada["seksi"], str(ada))
    cek("4 kartu maskot", ada["kartu"] == 4, str(ada["kartu"]))
    cek("aurora terpasang (hero + maskot)", ada["aurora"] >= 2, str(ada["aurora"]))
    cek("lapisan butir (grain) ada", ada["grain"], str(ada))
    cek("judul hero bergradasi", ada["grad"], str(ada))
    cek("kartu hero ber-HUD", ada["hud"], str(ada))
    cek("kartu unggulan bercincin", ada["ring"], str(ada))
    cek("label fx-tag ada (4)", ada["tag"] == 4, str(ada["tag"]))

    # Target sentuh kartu maskot >= 44px
    kecil = pg.evaluate(
        """()=>[...document.querySelectorAll('.maskot__card')]
             .filter(e=>e.getBoundingClientRect().height < 44).length"""
    )
    cek("kartu maskot tinggi >= 44px", kecil == 0, f"{kecil} kartu terlalu pendek")

    # Maskot boleh disembunyikan di HP kecil, tetapi harus tampil di desktop
    tampil = pg.evaluate(
        """()=>{const i=document.querySelector('.maskot__img');
             return i.getBoundingClientRect().width > 40;}"""
    )
    cek("maskot tampil di desktop", tampil, "lebar <= 40px")
    pg.close()

    # ── Halaman unduh ──────────────────────────────────────
    for w in UKURAN:
        pg = b.new_page(viewport={"width": w, "height": 900},
                        is_mobile=w < 800, has_touch=w < 800)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(UNDUH, wait_until="load")
        pg.wait_for_timeout(900)
        r = pg.evaluate("()=>({sw:document.documentElement.scrollWidth, iw:window.innerWidth})")
        cek(f"unduh {w}px tanpa geser samping", r["sw"] <= r["iw"] + 1, f"{r['sw']}>{r['iw']}")
        if w == 1280:
            cek("unduh tanpa error console", not errs, str(errs[:3]))
        pg.close()

    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(UNDUH, wait_until="load")
    pg.wait_for_timeout(1400)

    tautan = pg.evaluate(
        """()=>({a:document.getElementById('tombolAndroid')?.href,
                 i:document.getElementById('tombolIos')?.href,
                 ipa:document.getElementById('tombolIpa')?.href})"""
    )
    cek("tautan APK tepat", tautan["a"] == APK, str(tautan["a"]))
    # Kartu iPhone sengaja mengarah ke panduan, bukan ke berkas IPA: memasang
    # berkas IPA di iPhone tidak bisa langsung dari HP. Berkasnya tetap
    # tersedia sebagai jalur alternatif di dalam kartu yang sama.
    cek("tombol iPhone menuju panduan di halaman unduh",
        tautan["i"] == UNDUH + "#pasang-ios", str(tautan["i"]))
    cek("berkas IPA tetap tersedia", tautan["ipa"] == IPA, str(tautan["ipa"]))

    # Unduhan berkas harus ditandai agar dibuka sebagai berkas, bukan halaman.
    unduh_attr = pg.evaluate(
        """()=>[...document.querySelectorAll('#tombolAndroid,#tombolIpa')]
             .every(e=>e.hasAttribute('download'))"""
    )
    cek("tombol berkas bertanda unduh", unduh_attr, "atribut download hilang")

    # Halaman unduh harus terjangkau dari laman utama
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(900)
    dari_beranda = pg.evaluate(
        """()=>[...document.querySelectorAll('a[href]')]
             .some(a=>a.getAttribute('href')==='unduh.html')"""
    )
    cek("beranda menautkan unduh.html", dari_beranda, "tautan tidak ditemukan")

    # QR harus bisa dipindai dan berisi alamat yang benar
    pg.goto(UNDUH, wait_until="load")
    pg.wait_for_timeout(1400)
    data = pg.evaluate("()=>document.getElementById('qrUnduh').toDataURL()")
    pg.close()
    tmp = tempfile.mkdtemp(prefix="qr-unduh-")
    jalur = os.path.join(tmp, "qr_unduh.png")
    with open(jalur, "wb") as f:
        f.write(base64.b64decode(data.split(",")[1]))
    hasil_qr = subprocess.run(
        ["node", os.path.join(DIR_UJI, "decode-qr.js"), jalur],
        capture_output=True, text=True)
    cek("QR unduh terdekode ke alamat benar",
        QR_DIHARAP in hasil_qr.stdout, hasil_qr.stdout.strip()[:120])

    b.close()

lulus = sum(1 for _, ok, _ in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 62)
print(f"HASIL LANDING: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
sys.exit(1 if gagal else 0)
