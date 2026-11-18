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

PETAK = 100.0
TENDA_X0, TENDA_X1 = 20.0, 80.0      # tepi kiri/kanan tenda
TENDA_ATAS, TENDA_BAWAH = 20.0, 33.0  # puncak atap dan garis dasar tenda
SCALLOP_N = 5                          # jumlah gelombang
PILAR_X = (27.0, 68.0)
PILAR_W, PILAR_ATAS, PILAR_BAWAH = 5.0, 36.0, 74.0
KONTER_Y, KONTER_H = 72.0, 10.0
PONSEL_W, PONSEL_H, PONSEL_Y = 31.0, 35.0, 38.5
LINGKARAN_R = 38.0
GARIS = 3.0                            # tebal garis dalam petak 100

def _busur_gelombang(x0: float, x1: float, n: int, r: float) -> str:
    """Busur bergelombang (scallop) dari x0 ke x1, menggantung ke bawah.

    Dipanggil sebagai (kanan, kiri, …), jadi `lebar` bernilai negatif dan
    busurnya berjalan ke kiri. Sweep 1 membuatnya melengkung ke bawah.
    """
    lebar = (x1 - x0) / n
    return "".join(f" a{r:.2f} {r:.2f} 0 0 1 {lebar:.2f} 0" for _ in range(n))


def _penanda_qr(x: float, y: float, sisi: float, warna: str = OREN) -> str:
    """Tiga pola temukan QR di dalam kotak `sisi`, bersudut `warna`.

    Tiap penanda tiga lapis: kotak (3p) → cincin (2p) → inti (p). Pola inilah
    yang membuat sebuah kotak terbaca sebagai QR, bukan sekadar kotak kecil.
    """
    p = sisi / 7.0
    keluar = ""
    for dx, dy in ((0, 0), (sisi - 3 * p, 0), (0, sisi - 3 * p)):
        bx, by = x + dx, y + dy
        keluar += (
            f'<rect x="{bx:.2f}" y="{by:.2f}" width="{3 * p:.2f}" height="{3 * p:.2f}" fill="{warna}"/>'
            f'<rect x="{bx + p:.2f}" y="{by + p:.2f}" width="{2 * p:.2f}" height="{2 * p:.2f}" fill="{PUTIH}"/>'
            f'<rect x="{bx + 2 * p:.2f}" y="{by + 2 * p:.2f}" width="{p:.2f}" height="{p:.2f}" fill="{warna}"/>')
    return keluar


def _ikon_wifi(cx: float, cy: float, skala: float, warna: str, tebal: float) -> str:
    """Ikon sinyal wifi: dua busur dan satu titik, di atas layar ponsel."""
    keluar = ""
    for jari in (skala * 0.55, skala * 1.05):
        keluar += (f'<path d="M{cx - jari:.2f} {cy + jari * 0.36:.2f} A{jari:.2f} {jari:.2f} '
                   f'0 0 1 {cx + jari:.2f} {cy + jari * 0.36:.2f}" fill="none" stroke="{warna}" '
                   f'stroke-width="{tebal:.2f}" stroke-linecap="round"/>')
    keluar += (f'<circle cx="{cx:.2f}" cy="{cy + skala * 0.52:.2f}" r="{skala * 0.20:.2f}" '
               f'fill="{warna}"/>')
    return keluar


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


def lambang(cx, cy, sisi, warna_tenda, warna_ponsel, warna_layar,
            garis=HITAM, cincin=True, uid="L", warna_konter=None,
            wifi=True, warna_penanda=None) -> str:
    """Warung berponsel QR, digambar dalam petak 100 lalu dipusatkan di (cx, cy).

    `sisi` adalah panjang sisi kotak 100 yang dipetakan; jadi satu angka mengatur
    besar-kecilnya tanpa membuat bentuknya gepeng.
    """
    s = sisi / PETAK
    ox, oy = cx - PETAK * s / 2, cy - PETAK * s / 2
    tr = f"translate({ox:.2f} {oy:.2f}) scale({s:.5f})"
    W = (f'stroke="{garis}" stroke-width="{GARIS}" stroke-linejoin="round" '
         f'stroke-linecap="round"')
    isi = ""
    if cincin:
        isi += (f'<circle cx="50" cy="50" r="{LINGKARAN_R}" fill="{warna_tenda}" {W}/>')
    tenda = (f'M{TENDA_X0:g} {TENDA_BAWAH:g} V{TENDA_ATAS:g} H{TENDA_X1:g} V{TENDA_BAWAH:g}'
             + _busur_gelombang(TENDA_X1, TENDA_X0, SCALLOP_N,
                                (TENDA_X1 - TENDA_X0) / (2 * SCALLOP_N)) + ' Z')
    isi += f'<path d="{tenda}" fill="{warna_tenda}" {W}/>'
    for x in PILAR_X:
        isi += (f'<rect x="{x:g}" y="{PILAR_ATAS:g}" width="{PILAR_W:g}" '
                f'height="{PILAR_BAWAH - PILAR_ATAS:g}" fill="{warna_layar}" {W}/>')
    isi += (f'<rect x="{TENDA_X0:g}" y="{KONTER_Y:g}" width="{TENDA_X1 - TENDA_X0:g}" '
            f'height="{KONTER_H:g}" rx="1.4" fill="{warna_konter or warna_tenda}" {W}/>')
    px = 50 - PONSEL_W / 2
    isi += (f'<rect x="{px:.2f}" y="{PONSEL_Y:g}" width="{PONSEL_W:g}" height="{PONSEL_H:g}" '
            f'rx="3" fill="{warna_ponsel}" {W}/>')
    layar_x, layar_y = px + 2.6, PONSEL_Y + 2.6
    layar_w, layar_h = PONSEL_W - 5.2, PONSEL_H - 5.2
    isi += (f'<rect x="{layar_x:.2f}" y="{layar_y:.2f}" width="{layar_w:g}" height="{layar_h:g}" '
            f'rx="1.4" fill="{warna_layar}"/>')
    if wifi:
        isi += _ikon_wifi(50, layar_y + 3.0, 3.8, warna_penanda or OREN, 1.35)
    # Penanda QR selebar layar: inilah gagasan "digital", jadi harus terbaca
    # bahkan di 16 px — bukan kotak kecil yang tenggelam di tengah layar.
    isi += _penanda_qr(layar_x + 0.7, layar_y + 8.2, layar_w - 1.4, warna_penanda or OREN)
    return f'<g transform="{tr}">{isi}</g>'


def bungkus(w: float, h: float, isi: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
            f'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="Warung Go Digital">'
            f'{isi}</svg>')


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


def lencana_lambang(ukuran=512, sudut=112, latar=OREN, rel=0.88, uid="L",
                    warna_tenda=PUTIH, warna_ponsel=HITAM, warna_layar=PUTIH,
                    garis=HITAM, cincin=True, **warna) -> str:
    """Lambang dalam lencana bersudut membulat — untuk ikon dan avatar."""
    isi = f'<rect width="{ukuran}" height="{ukuran}" rx="{sudut}" fill="{latar}"/>'
    isi += lambang(ukuran / 2, ukuran / 2, ukuran * rel, warna_tenda, warna_ponsel,
                   warna_layar, garis, cincin, uid, **warna)
    return bungkus(ukuran, ukuran, isi)


def lambang_telanjang(warna_tenda, warna_ponsel, warna_layar=PUTIH, garis=HITAM,
                      cincin=True, uid="T", **warna) -> str:
    """Lambang tanpa lencana, dipangkas rapat — untuk latar apa pun."""
    kanvas = 512
    isi = lambang(kanvas / 2, kanvas / 2, kanvas * 0.94, warna_tenda, warna_ponsel,
                  warna_layar, garis, cincin, uid, **warna)
    return rapatkan(isi, kanvas, kanvas)


def kunci(latar=None, tumpuk=False, uid="L", tinta=HITAM, aksen=OREN_TUA,
          warna_tenda=OREN, warna_ponsel=HITAM, warna_layar=PUTIH, garis=HITAM,
          cincin=True, **warna) -> str:
    """Kunci merek: lambang + "Warung" + "GO DIGITAL".

    Lambangnya persegi (petak 100), jadi satu ukuran `TL` cukup untuk lebar dan
    tinggi — tidak ada lagi perkalian rasio yang membuat bentuknya gepeng.
    """
    if not tumpuk:
        TL, U1, U2, BL = 150, 132, 40, 52
        x1 = 60 + TL + 52
        lt1 = lebar_teks(FONT_B, "Warung") / 1000 * U1
        lt2 = lebar_teks(FONT_M, "GO DIGITAL") / 1000 * U2 + 9 * 5
        tt = U1 * 0.72 + BL + U2 * 0.28
        tengah = 60 + max(TL, tt) / 2
        b1 = tengah + tt / 2 - (BL + U2 * 0.28)
        isi = lambang(60 + TL / 2, tengah, TL, warna_tenda, warna_ponsel,
                      warna_layar, garis, cincin, uid, **warna)
        isi += teks_ke_kurva(FONT_B, U1, x1, b1, "Warung", tinta)
        isi += teks_ke_kurva(FONT_M, U2, x1 + 3, b1 + BL, "GO DIGITAL", aksen, spasi=5)
        return rapatkan(isi, 1500, 1500, latar)
    TL, U1, U2, BL = 200, 150, 44, 58
    lt1 = lebar_teks(FONT_B, "Warung") / 1000 * U1
    lt2 = lebar_teks(FONT_M, "GO DIGITAL") / 1000 * U2 + 9 * 5
    pusat = 60 + max(TL, lt1, lt2) / 2
    b1 = 60 + TL + 72 + U1 * 0.72
    isi = lambang(pusat, 60 + TL / 2, TL, warna_tenda, warna_ponsel,
                  warna_layar, garis, cincin, uid, **warna)
    isi += teks_ke_kurva(FONT_B, U1, pusat - lt1 / 2, b1, "Warung", tinta)
    isi += teks_ke_kurva(FONT_M, U2, pusat - lt2 / 2, b1 + BL, "GO DIGITAL", aksen, spasi=5)
    return rapatkan(isi, 1500, 1400, latar)


def mono(warna, latar=None, ukuran=512, rel=0.78, uid="mono") -> str:
    """Satu warna: siluet warung utuh, layar QR dilubangi.

    Dipakai untuk cetak satu warna, cap, bordir, dan tanda air — tempat warna
    kedua tidak tersedia. Bentuknya tetap bentuk merek, bukan bentuk lain.
    """
    sisi = ukuran * rel
    s = sisi / PETAK
    ox, oy = ukuran / 2 - sisi / 2, ukuran / 2 - sisi / 2
    tr = f"translate({ox:.2f} {oy:.2f}) scale({s:.5f})"
    tenda = (f'M{TENDA_X0:g} {TENDA_BAWAH:g} V{TENDA_ATAS:g} H{TENDA_X1:g} V{TENDA_BAWAH:g}'
             + _busur_gelombang(TENDA_X1, TENDA_X0, SCALLOP_N,
                                (TENDA_X1 - TENDA_X0) / (2 * SCALLOP_N)) + ' Z')
    px = 50 - PONSEL_W / 2
    layar_x, layar_y = px + 3, PONSEL_Y + 3.5
    layar_w = PONSEL_W - 6
    # Lubang: layar jadi kosong, lalu penanda QR diisi kembali.
    lubang = (f'<rect x="{layar_x:.2f}" y="{layar_y:.2f}" width="{layar_w:g}" '
              f'height="{PONSEL_H - 7:g}" rx="1.6" fill="#000"/>')
    p7 = layar_w / 7.0
    qy = layar_y + 7.5
    for dx, dy in ((0, 0), (layar_w - 3 * p7, 0), (0, layar_w - 3 * p7)):
        lubang += (f'<rect x="{layar_x + dx:.2f}" y="{qy + dy:.2f}" width="{3 * p7:.2f}" '
                   f'height="{3 * p7:.2f}" fill="#fff"/>')
    isi = f'<rect width="{ukuran}" height="{ukuran}" rx="112" fill="{latar}"/>' if latar else ""
    isi += (f'<mask id="lubang-{uid}"><rect width="{ukuran}" height="{ukuran}" fill="#fff"/>{lubang}</mask>'
            f'<g transform="{tr}" mask="url(#lubang-{uid})">'
            f'<path d="{tenda}" fill="{warna}"/>'
            f'<rect x="{PILAR_X[0]:g}" y="{PILAR_ATAS:g}" width="{PILAR_W:g}" '
            f'height="{PILAR_BAWAH - PILAR_ATAS:g}" fill="{warna}"/>'
            f'<rect x="{PILAR_X[1]:g}" y="{PILAR_ATAS:g}" width="{PILAR_W:g}" '
            f'height="{PILAR_BAWAH - PILAR_ATAS:g}" fill="{warna}"/>'
            f'<rect x="{TENDA_X0:g}" y="{KONTER_Y:g}" width="{TENDA_X1 - TENDA_X0:g}" '
            f'height="{KONTER_H:g}" fill="{warna}"/>'
            f'<rect x="{px:.2f}" y="{PONSEL_Y:g}" width="{PONSEL_W:g}" height="{PONSEL_H:g}" '
            f'rx="3" fill="{warna}"/></g>')
    return bungkus(ukuran, ukuran, isi)


def lambang_bilah(ukuran=512, rel=0.98, uid="bilah") -> str:
    """Lambang untuk bilah atas situs, satu warna memakai `currentColor`.

    Sengaja tanpa kotak: kotaknya sudah disediakan `.logo__mark` di gaya.css
    (gelap di header, oren di footer). Jadi lambangnya mengikuti warna teks dan
    otomatis benar di tema terang maupun gelap. Layar ponsel dilubangi dan
    penanda QR digambar sebagai cincin, supaya tetap terbaca di 20 px.
    """
    return mono("currentColor", ukuran=ukuran, rel=rel, uid=uid)


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
        # lambang berlencana — konter selalu oren seperti acuan
        "logo-lambang.svg": lencana_lambang(uid="1", warna_konter=OREN,
                                            warna_penanda=OREN),
        "logo-lambang-hitam.svg": lencana_lambang(
            uid="2", latar=HITAM, warna_tenda=OREN, warna_ponsel=HITAM,
            warna_layar=PUTIH, warna_konter=OREN, warna_penanda=OREN),
        "logo-lambang-putih.svg": lencana_lambang(
            uid="3", latar=PUTIH, warna_tenda=OREN, warna_ponsel=HITAM,
            warna_layar=PUTIH, warna_konter=OREN, warna_penanda=OREN),
        # lambang telanjang
        "lambang-oren.svg": lambang_telanjang(OREN, HITAM, PUTIH, HITAM, True, "T1",
                                              warna_konter=OREN, warna_penanda=OREN),
        "lambang-putih.svg": lambang_telanjang(PUTIH, HITAM, PUTIH, HITAM, False, "T2",
                                               warna_konter=OREN, warna_penanda=OREN),
        "lambang-hitam.svg": lambang_telanjang(HITAM, OREN, PUTIH, HITAM, False, "T3",
                                               warna_konter=OREN, warna_penanda=OREN),
        # kunci merek
        "logo-utama.svg": kunci(uid="H1", warna_konter=OREN, warna_penanda=OREN),
        "logo-utama-gelap.svg": kunci(HITAM, uid="H2", tinta=PUTIH, aksen=OREN_TERANG,
                                      warna_tenda=OREN, warna_konter=OREN,
                                      warna_penanda=OREN),
        "logo-utama-putih.svg": kunci(PUTIH, uid="H3", warna_konter=OREN,
                                      warna_penanda=OREN),
        "logo-tumpuk.svg": kunci(tumpuk=True, uid="V1", warna_konter=OREN,
                                 warna_penanda=OREN),
        "logo-tumpuk-gelap.svg": kunci(HITAM, tumpuk=True, uid="V2", tinta=PUTIH,
                                       aksen=OREN_TERANG, warna_tenda=OREN,
                                       warna_konter=OREN, warna_penanda=OREN),
        # untuk bilah atas situs (menggantikan ikon inline 24x24)
        "lambang-bilah.svg": lambang_bilah(),
        # monokrom
        "logo-mono-hitam.svg": mono(HITAM),
        "logo-mono-putih.svg": mono(PUTIH, HITAM),
    }
    for nama, isi in svg.items():
        (KELUARAN / nama).write_text(isi)
        print(f"  svg/{nama}")

    # favicon: lambang penuh untuk 32 px ke atas, versi ringkas untuk 16 px
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
    maskable = lencana_lambang(ukuran=512, sudut=0, rel=0.60, uid="M1")
    raster(maskable, PNG / "ikon-maskable-512.png", 512)
    raster(maskable, PNG / "apple-touch-icon.png", 180)
    print("  png/ikon-maskable-512.png, png/apple-touch-icon.png")

    print(f"\nSelesai. Aset di {KELUARAN.relative_to(AKAR)}/")


if __name__ == "__main__":
    main()
