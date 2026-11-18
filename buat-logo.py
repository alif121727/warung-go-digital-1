#!/usr/bin/env python3
"""Membuat logo Warung Go Digital — oren dominan, dengan hitam dan putih.

Gagasan lambang: **warung yang jendelanya memindai**. Bentuknya mengikuti ikon
`warung` di `warung-go-digital/bersama/inti.js` (tenda bergaris + badan), tetapi
jendelanya digambar sebagai pola temukan QR (kotak-cincin-inti, rasio 1:1:3:1:1).
Jadi satu bentuk membawa dua arti: warung, dan digital.

Hasil (di `warung-go-digital/logo/`):

    logo-lambang.svg            lambang utama, lencana oren
    logo-lambang-hitam.svg      lencana hitam
    logo-lambang-putih.svg      lencana putih
    lambang-oren.svg            warung oren tanpa lencana (latar terang)
    lambang-putih.svg           warung putih tanpa lencana (latar gelap)
    lambang-hitam.svg           warung hitam tanpa lencana (latar terang)
    logo-utama.svg              kunci horizontal, latar terang
    logo-utama-gelap.svg        kunci horizontal, latar gelap
    logo-utama-putih.svg        kunci horizontal, latar putih
    logo-tumpuk.svg             kunci bertumpuk, latar terang
    logo-tumpuk-gelap.svg       kunci bertumpuk, latar gelap
    logo-mono-hitam.svg         satu warna, hitam (cetak/watermark)
    logo-mono-putih.svg         satu warna, putih
    favicon.svg, favicon.ico
    png/…                       ekspor PNG untuk app icon, Play Store, dokumen

Semua teks diubah jadi kurva memakai font merek (Bricolage Grotesque untuk
"Warung", JetBrains Mono untuk "GO DIGITAL"), jadi SVG-nya mandiri — tidak
bergantung pada font yang terpasang di perangkat pembaca.

Jalankan:  python3 buat-logo.py
Perlu:     pip install fonttools pillow playwright
           Chromium di /usr/bin/chromium (dipakai untuk meraster PNG)
"""

from __future__ import annotations

import pathlib
import re
import shutil
import sys
import urllib.request

try:
    from PIL import Image
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.pens.svgPathPen import SVGPathPen
    from playwright.sync_api import sync_playwright
except ImportError as e:  # pragma: no cover
    sys.exit(f"Kurang pustaka: {e}. Jalankan: pip install fonttools pillow playwright")

AKAR = pathlib.Path(__file__).resolve().parent
KELUARAN = AKAR / "warung-go-digital" / "logo"
PNG = KELUARAN / "png"
FONT_CACHE = AKAR / ".cache" / "font-logo"
CHROMIUM = "/usr/bin/chromium"

# ── palet: oren (utama), hitam, putih ───────────────────────
OREN_TERANG = "#ffc061"
OREN = "#f7871b"
OREN_TUA = "#d95c07"
HITAM = "#111111"          # netral; bukan #0e100f yang berona hijau
PUTIH = "#ffffff"

GRADIEN = (
    '<linearGradient id="oren" x1="0" y1="0" x2="0.35" y2="1">'
    f'<stop offset="0" stop-color="{OREN_TERANG}"/>'
    f'<stop offset="0.45" stop-color="{OREN}"/>'
    f'<stop offset="1" stop-color="{OREN_TUA}"/></linearGradient>'
)

# ── geometri lambang dalam petak 24 (mengikuti ikon `warung`) ──
KIRI, KANAN, ATAS, BAWAH = 1.6, 22.4, 4.2, 19.6
LEBAR, TINGGI = KANAN - KIRI, BAWAH - ATAS
TENDA = "M5.2 4.2 H18.8 L22.4 9.6 H1.6 Z"
BADAN = "M4.2 9.6 H19.8 V19.6 H4.2 Z"
JW_X, JW_Y, JW_S = 8.6, 11.6, 6.8      # jendela QR

FONT_BRICOLAGE = ("https://github.com/google/fonts/raw/main/ofl/bricolagegrotesque/"
                  "BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf")
FONT_JETBRAINS = ("https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/"
                  "JetBrainsMono%5Bwght%5D.ttf")


def ambil_font(url: str, nama: str) -> pathlib.Path:
    FONT_CACHE.mkdir(parents=True, exist_ok=True)
    tujuan = FONT_CACHE / nama
    if not tujuan.exists():
        print(f"  mengunduh {nama} …")
        with urllib.request.urlopen(url) as r, open(tujuan, "wb") as f:
            shutil.copyfileobj(r, f)
    return tujuan


def muat_font(path: pathlib.Path, lokasi: dict):
    f = TTFont(path)
    return instancer.instantiateVariableFont(f, lokasi) if "fvar" in f else f


def lebar_teks(font, teks: str) -> float:
    cmap, hmtx = font.getBestCmap(), font["hmtx"]
    return sum(hmtx[cmap[ord(c)]][0] for c in teks if ord(c) in cmap)


def teks_ke_kurva(font, ukuran: float, x: float, baseline: float, isi: str,
                  warna: str, spasi: float = 0) -> str:
    """Ubah teks jadi kurva SVG (tanpa ketergantungan font)."""
    upem = font["head"].unitsPerEm
    s = ukuran / upem
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    bagian, pos = [], 0.0
    for c in isi:
        g = cmap.get(ord(c))
        if g is None:
            pos += ukuran * 0.3 + spasi
            continue
        pen = SVGPathPen(gs)
        gs[g].draw(pen)
        d = pen.getCommands()
        if d:
            bagian.append(f'<path transform="translate({x + pos * s:.2f} {baseline:.2f}) '
                          f'scale({s:.5f} {-s:.5f})" d="{d}"/>')
        pos += hmtx[g][0] + spasi / s
    return f'<g fill="{warna}">{"".join(bagian)}</g>'


def lambang(cx, cy, tinggi, badan, tenda, jendela, garis, cincin, uid="L") -> str:
    """Warung berpusat di (cx, cy) setinggi `tinggi`.

    Garis tenda digambar di dalam klip yang ikut ter-transform, supaya tidak
    menonjol keluar tepi tenda.
    """
    s = tinggi / TINGGI
    ox, oy = cx - LEBAR * s / 2 - KIRI * s, cy - tinggi / 2 - ATAS * s
    tr = f"translate({ox:.2f} {oy:.2f}) scale({s:.5f})"
    jx, jy, jw = ox + JW_X * s, oy + JW_Y * s, JW_S * s
    p = jw / 7.0
    jendela_isi = (
        f'<rect x="{jx:.2f}" y="{jy:.2f}" width="{jw:.2f}" height="{jw:.2f}" '
        f'rx="{jw * 0.14:.2f}" fill="{jendela}"/>'
        f'<rect x="{jx + p:.2f}" y="{jy + p:.2f}" width="{jw - 2 * p:.2f}" height="{jw - 2 * p:.2f}" '
        f'rx="{jw * 0.08:.2f}" fill="{cincin}"/>'
        f'<rect x="{jx + 3 * p:.2f}" y="{jy + 3 * p:.2f}" width="{jw - 6 * p:.2f}" height="{jw - 6 * p:.2f}" '
        f'rx="{jw * 0.04:.2f}" fill="{jendela}"/>'
    )
    garis_isi = "".join(
        f'<rect x="{(KIRI + (i + 1) * (20.8 / 5) - 0.675) * s + ox:.2f}" '
        f'y="{3.4 * s + oy:.2f}" width="{1.35 * s:.2f}" height="{6.2 * s:.2f}" fill="{garis}"/>'
        for i in range(4))
    return (f'<clipPath id="tenda-{uid}"><path d="{TENDA}" transform="{tr}"/></clipPath>'
            f'<g clip-path="url(#tenda-{uid})">'
            f'<path d="{BADAN}" transform="{tr}" fill="{badan}"/>'
            f'<path d="{TENDA}" transform="{tr}" fill="{tenda}"/>{garis_isi}</g>{jendela_isi}')


def bungkus(w: float, h: float, isi: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
            f'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="Warung Go Digital">'
            f'<defs>{GRADIEN}</defs>{isi}</svg>')


def ukur_isi(isi: str, cw: int, ch: int):
    """Ukur kotak isi dengan merender, supaya viewBox bisa dirapatkan."""
    html = (f'<!doctype html><meta charset="utf-8"><style>*{{margin:0;padding:0}}'
            f'html,body{{background:transparent}}</style>{bungkus(cw, ch, isi)}')
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": cw, "height": ch})
        pg.set_content(html)
        pg.locator("svg").first.screenshot(path="/tmp/_ukur.png", omit_background=True)
        b.close()
    im = Image.open("/tmp/_ukur.png").convert("RGBA")
    px = im.load()
    W, H = im.size
    xs = [x for y in range(H) for x in range(W) if px[x, y][3] > 12]
    ys = [y for y in range(H) for x in range(W) if px[x, y][3] > 12]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def rapatkan(isi: str, cw: int, ch: int, latar: str | None = None, pad: int = 8) -> str:
    x0, y0, x1, y1 = ukur_isi(isi, cw, ch)
    w, h = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    dalam = f'<g transform="translate({pad - x0:.2f} {pad - y0:.2f})">{isi}</g>'
    if latar:
        dalam = f'<rect width="{w:.0f}" height="{h:.0f}" fill="{latar}"/>' + dalam
    return bungkus(w, h, dalam)


def lencana_lambang(ukuran=512, sudut=112, latar=f"url(#oren)", warung=PUTIH,
                    jendela=HITAM, cincin=PUTIH, rel=0.66, uid="L") -> str:
    """Lambang dalam lencana bersudut membulat — untuk ikon dan avatar."""
    isi = (f'<rect width="{ukuran}" height="{ukuran}" rx="{sudut}" fill="{latar}"/>'
           + lambang(ukuran / 2, ukuran / 2, ukuran * rel, warung, warung, jendela, jendela, cincin, uid))
    return bungkus(ukuran, ukuran, isi)


def lambang_telanjang(warna_warung, warna_jendela, uid="T") -> str:
    """Warung tanpa lencana, dipangkas rapat — untuk latar apa pun.

    Tinggi dibatasi oleh lebar: lambang ini 1,35 kali lebih lebar daripada
    tingginya, jadi menetapkan tinggi saja akan memotong sisi kiri-kanan.
    """
    kanvas = 512
    tinggi = min(kanvas * 0.86, kanvas * 0.86 / (LEBAR / TINGGI))
    isi = lambang(kanvas / 2, kanvas / 2, tinggi, warna_warung, warna_warung,
                  warna_jendela, warna_jendela, PUTIH, uid)
    return rapatkan(isi, kanvas, kanvas)


def kunci(latar=None, tumpuk=False, uid="L", warung=PUTIH, jendela=HITAM,
          cincin=PUTIH, tinta=PUTIH, aksen=OREN_TERANG, lencana="url(#oren)") -> str:
    """Kunci merek: lambang + "Warung" + "GO DIGITAL"."""
    if not tumpuk:
        TL, U1, U2, BL = 150, 132, 40, 52
        lb = LEBAR / TINGGI * TL
        x1 = 60 + lb + 52
        lt1 = lebar_teks(FONT_B, "Warung") / 1000 * U1
        lt2 = lebar_teks(FONT_M, "GO DIGITAL") / 1000 * U2 + 9 * 5
        tt = U1 * 0.72 + BL + U2 * 0.28
        tengah = 60 + max(TL, tt) / 2
        b1 = tengah + tt / 2 - (BL + U2 * 0.28)
        isi = (f'<rect x="60" y="{tengah - TL / 2:.2f}" width="{lb:.2f}" height="{TL}" '
               f'rx="{TL * 0.22:.2f}" fill="{lencana}"/>'
               + lambang(60 + lb / 2, tengah, TL * 0.62, warung, warung, jendela, jendela, cincin, uid))
        isi += teks_ke_kurva(FONT_B, U1, x1, b1, "Warung", tinta)
        isi += teks_ke_kurva(FONT_M, U2, x1 + 3, b1 + BL, "GO DIGITAL", aksen, spasi=5)
        return rapatkan(isi, 1500, 1500, latar)
    TL, U1, U2, BL = 190, 150, 44, 58
    lt1 = lebar_teks(FONT_B, "Warung") / 1000 * U1
    lt2 = lebar_teks(FONT_M, "GO DIGITAL") / 1000 * U2 + 9 * 5
    lt = max(lt1, lt2)
    lb = LEBAR / TINGGI * TL
    pusat = 60 + max(lb, lt) / 2
    b1 = 60 + TL + 72 + U1 * 0.72
    isi = (f'<rect x="{pusat - lb / 2:.2f}" y="60" width="{lb:.2f}" height="{TL}" '
           f'rx="{TL * 0.22:.2f}" fill="{lencana}"/>'
           + lambang(pusat, 60 + TL / 2, TL * 0.62, warung, warung, jendela, jendela, cincin, uid))
    isi += teks_ke_kurva(FONT_B, U1, pusat - lt1 / 2, b1, "Warung", tinta)
    isi += teks_ke_kurva(FONT_M, U2, pusat - lt2 / 2, b1 + BL, "GO DIGITAL", aksen, spasi=5)
    return rapatkan(isi, 1500, 1200, latar)


def mono(warna, latar=None, ukuran=512, rel=0.68) -> str:
    """Satu warna: siluet warung utuh, jendela QR dilubangi."""
    tinggi = ukuran * rel
    s = tinggi / TINGGI
    ox, oy = ukuran / 2 - LEBAR * s / 2 - KIRI * s, ukuran / 2 - tinggi / 2 - ATAS * s
    tr = f"translate({ox:.2f} {oy:.2f}) scale({s:.5f})"
    jx, jy, jw = ox + JW_X * s, oy + JW_Y * s, JW_S * s
    p = jw / 7.0
    lubang = (f'<rect x="{jx + p:.2f}" y="{jy + p:.2f}" width="{jw - 2 * p:.2f}" height="{jw - 2 * p:.2f}" fill="#000"/>'
              f'<rect x="{jx + 3 * p:.2f}" y="{jy + 3 * p:.2f}" width="{jw - 6 * p:.2f}" height="{jw - 6 * p:.2f}" fill="#fff"/>')
    isi = f'<rect width="{ukuran}" height="{ukuran}" rx="112" fill="{latar}"/>' if latar else ""
    isi += (f'<mask id="lubang"><rect width="{ukuran}" height="{ukuran}" fill="#fff"/>{lubang}</mask>'
            f'<g mask="url(#lubang)"><path d="{TENDA}" transform="{tr}" fill="{warna}"/>'
            f'<path d="{BADAN}" transform="{tr}" fill="{warna}"/></g>')
    return bungkus(ukuran, ukuran, isi)


# ── raster ──────────────────────────────────────────────────
def ukuran_viewbox(svg: str):
    v = re.search(r'viewBox="([\d.\- ]+)"', svg).group(1).split()
    return float(v[2]), float(v[3])


def raster(svg: str, tujuan: pathlib.Path, lebar: int, tinggi: int | None = None):
    w, h = ukuran_viewbox(svg)
    tinggi = tinggi or max(1, round(lebar * h / w))
    dipaksa = re.sub(r'(<svg[^>]*?)\s+width="[^"]*"\s+height="[^"]*"', r"\1", svg, count=1)
    dipaksa = dipaksa.replace("<svg", f'<svg style="width:{lebar}px;height:{tinggi}px;display:block"', 1)
    html = (f'<!doctype html><meta charset="utf-8"><style>*{{margin:0;padding:0}}'
            f'html,body{{background:transparent}}</style>{dipaksa}')
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": lebar, "height": tinggi})
        pg.set_content(html)
        pg.wait_for_timeout(60)
        pg.locator("svg").first.screenshot(path=str(tujuan), omit_background=True)
        b.close()
    im = Image.open(tujuan)
    if im.size != (lebar, tinggi):
        raise RuntimeError(f"{tujuan.name}: {im.size} != {(lebar, tinggi)}")


def main() -> None:
    global FONT_B, FONT_M
    KELUARAN.mkdir(parents=True, exist_ok=True)
    PNG.mkdir(parents=True, exist_ok=True)
    FONT_B = muat_font(ambil_font(FONT_BRICOLAGE, "bricolage.ttf"),
                       {"wght": 800, "opsz": 96, "wdth": 100})
    FONT_M = muat_font(ambil_font(FONT_JETBRAINS, "jetbrains.ttf"), {"wght": 700})

    svg = {
        # lambang berlencana
        "logo-lambang.svg": lencana_lambang(uid="1"),
        "logo-lambang-hitam.svg": lencana_lambang(uid="2", latar=HITAM, warung=f"url(#oren)",
                                                  jendela=PUTIH, cincin=HITAM),
        "logo-lambang-putih.svg": lencana_lambang(uid="3", latar=PUTIH, warung=f"url(#oren)",
                                                  jendela=HITAM, cincin=PUTIH),
        # lambang telanjang
        "lambang-oren.svg": lambang_telanjang(f"url(#oren)", HITAM, uid="T1"),
        "lambang-putih.svg": lambang_telanjang(PUTIH, OREN_TUA, uid="T2"),
        "lambang-hitam.svg": lambang_telanjang(HITAM, OREN, uid="T3"),
        # kunci merek
        "logo-utama.svg": kunci(uid="H1", warung=PUTIH, jendela=HITAM, cincin=PUTIH, tinta=HITAM, aksen=OREN_TUA),
        "logo-utama-gelap.svg": kunci(HITAM, uid="H2"),
        "logo-utama-putih.svg": kunci(PUTIH, uid="H3", warung=PUTIH, jendela=HITAM, cincin=PUTIH,
                                       tinta=HITAM, aksen=OREN_TUA),
        "logo-tumpuk.svg": kunci(tumpuk=True, uid="V1", warung=PUTIH, jendela=HITAM, cincin=PUTIH,
                                 tinta=HITAM, aksen=OREN_TUA),
        "logo-tumpuk-gelap.svg": kunci(HITAM, tumpuk=True, uid="V2"),
        # monokrom
        "logo-mono-hitam.svg": mono(HITAM),
        "logo-mono-putih.svg": mono(PUTIH, HITAM),
    }
    for nama, isi in svg.items():
        (KELUARAN / nama).write_text(isi)
        print(f"  svg/{nama}")

    # favicon
    (KELUARAN / "favicon.svg").write_text(svg["logo-lambang.svg"])
    for sisi in (16, 32, 48):
        raster(svg["logo-lambang.svg"], PNG / f"_fav{sisi}.png", sisi)
    Image.open(PNG / "_fav48.png").convert("RGBA").save(
        KELUARAN / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    for sisi in (16, 32, 48):
        (PNG / f"_fav{sisi}.png").unlink()
    print("  favicon.svg, favicon.ico")

    # PNG
    rencana = [
        ("logo-lambang.svg", "logo-lambang-{n}.png", [1024, 512, 192, 128, 64, 32, 16]),
        ("logo-lambang-hitam.svg", "logo-lambang-hitam-512.png", [512]),
        ("logo-lambang-putih.svg", "logo-lambang-putih-512.png", [512]),
        ("lambang-oren.svg", "lambang-oren-{n}.png", [1024, 512, 256]),
        ("lambang-putih.svg", "lambang-putih-{n}.png", [512]),
        ("logo-utama.svg", "logo-utama-{n}.png", [1200, 600]),
        ("logo-utama-gelap.svg", "logo-utama-gelap-1200.png", [1200]),
        ("logo-utama-putih.svg", "logo-utama-putih-1200.png", [1200]),
        ("logo-tumpuk.svg", "logo-tumpuk-800.png", [800]),
        ("logo-tumpuk-gelap.svg", "logo-tumpuk-gelap-800.png", [800]),
        ("logo-mono-hitam.svg", "logo-mono-hitam-512.png", [512]),
        ("logo-mono-putih.svg", "logo-mono-putih-512.png", [512]),
    ]
    for sumber, pola, lebar_list in rencana:
        for n in lebar_list:
            nama = pola.format(n=n)
            raster(svg[sumber], PNG / nama, n)
            print(f"  png/{nama}")

    # ikon Android/iOS: latar penuh, isi diperkecil ke zona aman
    maskable = lencana_lambang(ukuran=512, sudut=0, rel=0.46, uid="M1")
    raster(maskable, PNG / "ikon-maskable-512.png", 512)
    raster(maskable, PNG / "apple-touch-icon.png", 180)
    print("  png/ikon-maskable-512.png, png/apple-touch-icon.png")

    print(f"\nSelesai. Aset di {KELUARAN.relative_to(AKAR)}/")


if __name__ == "__main__":
    main()
