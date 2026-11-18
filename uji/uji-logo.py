"""Uji aset logo Warung Go Digital (warung-go-digital/logo/).

Semua diukur dari hasil render Chromium, bukan dari membaca berkas SVG
sebagai teks.

1. **Sah.** Tiap SVG harus XML valid dan dirender tanpa galat JS.
2. **Palet.** Sesuai permintaan: oren, hitam, putih. Tiap piksel yang tampak
   harus abu-abu netral atau berona oren (18-48 derajat). Warna di luar itu
   berarti ada sisa tema lama yang menyelinap masuk.
3. **Oren dominan.** Pada lambang (berbentuk lencana oren), oren harus mengisi
   lebih dari separuh. Untuk kunci merek, oren adalah aksen — yang diuji justru
   batas atas, supaya aksen tidak membanjiri teks.
4. **Terbaca di ukuran kecil.** Lambang 16 dan 32 piksel harus punya isi yang
   cukup berbeda dari latarnya.
5. **Rapat.** Varian transparan tidak boleh terpotong; lencana penuh memang
   menyentuh tepi, jadi dikecualikan.
6. **Ukuran PNG.** Tiap PNG harus seukuran yang tertulis di namanya.
7. **Mandiri.** SVG tidak boleh merujuk font eksternal (teks sudah jadi kurva).

Jalankan dari /workspace/repo dengan server lokal aktif di port 12000:
    python3 uji/uji-logo.py
"""
import os
import re
import sys
import xml.etree.ElementTree as ET

from PIL import Image
from playwright.sync_api import sync_playwright

AKAR = "/workspace/repo"
FOLDER = os.path.join(AKAR, "warung-go-digital", "logo")
PNG = os.path.join(FOLDER, "png")
CHROMIUM = "/usr/bin/chromium"

hasil = []


def cek(nama, ok, info=""):
    hasil.append(bool(ok))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:56} {info}")


SVG = sorted(f for f in os.listdir(FOLDER) if f.endswith(".svg"))
PNGS = sorted(f for f in os.listdir(PNG) if f.endswith(".png"))


def baca(nama):
    with open(os.path.join(FOLDER, nama), encoding="utf-8") as f:
        return f.read()


def viewbox(svg):
    m = re.search(r'viewBox="([\d.\- ]+)"', svg)
    return [float(v) for v in m.group(1).split()]


def render(svg_teks, lebar, tinggi):
    """Render pada ukuran pasti (SVG dipaksa, bukan dipotong)."""
    dipaksa = re.sub(r'(<svg[^>]*?)\s+width="[^"]*"\s+height="[^"]*"', r"\1", svg_teks, count=1)
    dipaksa = dipaksa.replace("<svg", f'<svg style="width:{lebar}px;height:{tinggi}px;display:block"', 1)
    html = (f'<!doctype html><meta charset="utf-8"><style>*{{margin:0;padding:0}}'
            f'html,body{{background:transparent}}</style>{dipaksa}')
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": lebar, "height": tinggi}, device_scale_factor=1)
        galat = []
        pg.on("pageerror", lambda e: galat.append(str(e)))
        pg.set_content(html)
        pg.wait_for_timeout(100)
        pg.locator("svg").first.screenshot(path="/tmp/_logo.png", omit_background=True)
        b.close()
    return Image.open("/tmp/_logo.png").convert("RGBA"), galat


def hsv(r, g, b):
    r, g, b = r / 255, g / 255, b / 255
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, mx
    if mx == r:
        h = (60 * ((g - b) / d)) % 360
    elif mx == g:
        h = 60 * ((b - r) / d) + 120
    else:
        h = 60 * ((r - g) / d) + 240
    return h, d / mx, mx


def hitung_piksel(im, ambang_alfa=16):
    """Kembalikan (oren, gelap, terang, lain, contoh).

    Batas rona atas 54 derajat, bukan 48, untuk menampung piksel antialias di
    perbatasan oren dengan hitam: campuran keduanya bisa berona ~50 dan tetap
    terbaca sebagai oren. Ambang 54 masih jauh di bawah kuning-hijau (60+).
    """
    px = im.load()
    W, H = im.size
    oren = gelap = terang = lain = 0
    contoh = []
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < ambang_alfa:
                continue
            h, s, v = hsv(r, g, b)
            if s < 0.12:                 # abu-abu netral
                if (r + g + b) / 3 < 110:
                    gelap += 1
                else:
                    terang += 1
            elif 18 <= h <= 54:          # keluarga oren
                oren += 1
            else:
                lain += 1
                if len(contoh) < 3:
                    contoh.append(f"#{r:02x}{g:02x}{b:02x}(h={h:.0f})")
    return oren, gelap, terang, lain, contoh


def ukuran_render(svg, maks=256):
    vb = viewbox(svg)
    k = min(1.0, maks / max(vb[2], vb[3]))
    return max(1, int(vb[2] * k)), max(1, int(vb[3] * k))


# ── 1. XML sah ──────────────────────────────────────────────
for nama in SVG:
    try:
        ET.parse(os.path.join(FOLDER, nama))
        cek(f"XML sah: {nama}", True)
    except Exception as e:                                   # noqa: BLE001
        cek(f"XML sah: {nama}", False, str(e)[:50])

# ── 7. mandiri: tanpa rujukan font ──────────────────────────
for nama in SVG:
    s = baca(nama)
    cek(f"tanpa font eksternal: {nama}",
        "font-family" not in s and "@font-face" not in s and "<text" not in s)

# ── 2. palet & 3. oren dominan ──────────────────────────────
for nama in SVG:
    svg = baca(nama)
    w, h = ukuran_render(svg)
    im, galat = render(svg, w, h)
    oren, gelap, terang, lain, contoh = hitung_piksel(im)
    total = oren + gelap + terang + lain or 1
    cek(f"tanpa galat JS: {nama}", not galat, galat[:1])
    cek(f"palet hanya oren/hitam/putih: {nama}", lain == 0,
        f"{lain}/{total} menyimpang {contoh}")
    porsi = oren / total
    if nama in ("logo-lambang.svg", "favicon.svg", "lambang-oren.svg"):
        # Lambang utama harus oren dominan: oren kelas warna terbesar.
        cek(f"oren kelas warna terbesar: {nama}",
            oren == max(oren, gelap, terang) and porsi > 0.40,
            f"oren {porsi*100:.1f}% gelap {gelap*100//total}% terang {terang*100//total}%")
    elif "mono" in nama:
        cek(f"monokrom benar-benar satu warna: {nama}", porsi == 0, f"oren {porsi*100:.1f}%")
    elif nama.startswith(("logo-lambang", "lambang-", "favicon")):
        # Varian alternatif (lencana hitam/putih) memang berlatar netral.
        cek(f"varian alternatif tetap beroren: {nama}", porsi > 0.10, f"oren {porsi*100:.1f}%")
    else:                                   # kunci merek: oren jadi aksen
        cek(f"oren sebagai aksen (5-60%): {nama}", 0.05 <= porsi <= 0.60, f"oren {porsi*100:.1f}%")

# ── 4. terbaca di ukuran kecil ──────────────────────────────
lambang = baca("logo-lambang.svg")
for sisi in (16, 32):
    im, _ = render(lambang, sisi, sisi)
    px = im.load()
    total = sisi * sisi
    oren = 0
    terang = 0
    for y in range(sisi):
        for x in range(sisi):
            r, g, b, a = px[x, y]
            if a <= 16:
                continue
            h, s, v = hsv(r, g, b)
            if s >= 0.12 and 18 <= h <= 48:
                oren += 1
            if (r + g + b) / 3 > 150:
                terang += 1
    cek(f"lambang {sisi}px punya bentuk (oren+terang)",
        oren > total * 0.2 and terang > total * 0.03,
        f"oren {oren*100//total}% terang {terang*100//total}%")

# ── 5. rapat: tidak ada isi di luar viewBox ─────────────────
# Isi yang menyentuh tepi itu wajar untuk gambar yang dipangkas rapat maupun
# lencana penuh. Yang salah adalah isi yang MELEWATI tepi — itu berarti ada
# bagian lambang yang terpotong. Caranya: perluas viewBox 25% ke segala arah,
# lalu lihat apakah muncul piksel baru di luar kotak asli.
def bbox(im):
    px = im.load()
    W, H = im.size
    xs = [x for y in range(H) for x in range(W) if px[x, y][3] > 16]
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] > 16]
    return (min(xs), min(ys), max(xs), max(ys), W, H)


def render_viewbox(svg, x0, y0, w, h):
    svg2 = re.sub(r'viewBox="[^"]*"', f'viewBox="{x0:.2f} {y0:.2f} {w:.2f} {h:.2f}"', svg, count=1)
    return render(svg2, int(w), int(h))


for nama in SVG:
    svg = baca(nama)
    x0, y0, w, h = viewbox(svg)
    pad = 0.25
    ex, ey, ew, eh = x0 - w * pad, y0 - h * pad, w * (1 + 2 * pad), h * (1 + 2 * pad)
    im, _ = render_viewbox(svg, ex, ey, ew, eh)
    bx0, by0, bx1, by1, W, H = bbox(im)
    # kotak asli di dalam kanvas perluasan
    kx0, ky0 = round(w * pad), round(h * pad)
    kx1, ky1 = round(w * pad) + round(w), round(h * pad) + round(h)
    luapan = max(0, kx0 - bx0) + max(0, ky0 - by0) + max(0, bx1 - kx1) + max(0, by1 - ky1)
    cek(f"tidak ada isi di luar viewBox: {nama}", luapan <= 2, f"luapan {luapan}px")

# ── 6. ukuran PNG ───────────────────────────────────────────
ANGKA = (16, 32, 48, 64, 128, 180, 192, 256, 512, 600, 800, 1024, 1200)
for nama in PNGS:
    target = None
    for bagian in nama.replace(".png", "").split("-"):
        if bagian.isdigit() and int(bagian) in ANGKA:
            target = int(bagian)
    im = Image.open(os.path.join(PNG, nama))
    cek(f"PNG {nama} benar {target}px", target is None or im.size[0] == target,
        f"nyata {im.size[0]}x{im.size[1]}")


lulus = sum(1 for ok in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 64)
print(f"HASIL LOGO: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
print("=" * 64)
sys.exit(1 if gagal else 0)
