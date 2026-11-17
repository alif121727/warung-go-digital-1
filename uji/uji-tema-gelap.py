"""Uji tema gelap aplikasi: apakah benar gelap, dan apakah tetap terbaca.

Dua hal yang diuji, keduanya diukur dari halaman yang benar-benar dirender
(Chromium), bukan dari membaca berkas CSS:

1. **Gelap.** Latar halaman dan kartu harus lebih gelap daripada teksnya.
   Tanpa uji ini, "tema gelap" bisa diam-diam kembali terang karena satu
   perubahan token.

2. **Terbaca.** Setiap teks kecil (<= 18,66 px) harus mencapai rasio kontras
   WCAG AA 4,5:1 terhadap latar di belakangnya. Ini bagian yang paling mudah
   rusak saat tema digelapkan: warna aksen mentah (#f5a524, #3ba55d) di atas
   permukaan gelap hanya mencapai ~2-3:1. Karena itu tiap aksen punya versi
   terang khusus teks (--on-amber, --on-leaf, …), dan uji ini menjaga janji itu.

Halaman yang diperiksa: aplikasi Pemilik, aplikasi Pengelola, dan halaman menu
pelanggan (publik). Beranda pemasaran tidak diperiksa karena arah desainnya
memang "hero gelap → isi krem", sesuai rancangan awal.

Jalankan dari /workspace/repo dengan:
    python3 uji/uji-tema-gelap.py
"""
import os
import sys

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

bantu = import_module('bantu-masuk')

B = "http://localhost:12000/warung-go-digital/"
hasil = []


def cek(nama, ok, info=""):
    hasil.append(bool(ok))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:58} {info}")


# Menghitung rasio kontras WCAG di dalam peramban. Warna latar dicari dengan
# menelusuri elemen induk sampai menemukan latar yang tidak transparan, karena
# sebagian besar teks berada di atas kartu, bukan langsung di atas <body>.
SKRIP_UKUR = """
() => {
  const rgb = (c) => {
    const m = String(c).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const v = m[1].split(',').map((t) => parseFloat(t.trim()));
    return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1];
  };
  const campur = (atas, bawah) => {
    const a = atas[3];
    return [atas[0] * a + bawah[0] * (1 - a),
            atas[1] * a + bawah[1] * (1 - a),
            atas[2] * a + bawah[2] * (1 - a), 1];
  };
  const lum = (p) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
  };
  const rasio = (a, b) => {
    let l1 = lum(a), l2 = lum(b);
    if (l1 < l2) { const t = l1; l1 = l2; l2 = t; }
    return (l1 + 0.05) / (l2 + 0.05);
  };

  // Latar efektif: tumpuk lapisan dari <body> turun ke elemen, hormati alfa.
  const latarEfektif = (el) => {
    const lapis = [];
    let n = el;
    while (n && n.nodeType === 1) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0) lapis.push(c);
      if (c && c[3] === 1) break;
      n = n.parentElement;
    }
    if (!lapis.length) return [255, 255, 255, 1];
    let hasil = lapis[lapis.length - 1];
    for (let i = lapis.length - 2; i >= 0; i--) hasil = campur(lapis[i], hasil);
    return hasil;
  };

  const terlihat = (el) => {
    const g = getComputedStyle(el);
    if (g.display === 'none' || g.visibility === 'hidden' || Number(g.opacity) < 0.35) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const teksGagal = [];
  const latarGagal = [];
  let diperiksa = 0;

  const SEMUA = document.querySelectorAll('body *');
  for (const el of SEMUA) {
    // Hanya elemen yang memuat teks langsung.
    const punyaTeks = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!punyaTeks || !terlihat(el)) continue;

    const g = getComputedStyle(el);
    const fg = rgb(g.color);
    if (!fg || fg[3] < 0.35) continue;

    // Lewati elemen hias yang tidak bisa dibaca siapa pun.
    if (el.closest('.sr, [aria-hidden="true"]')) continue;

    const px = parseFloat(g.fontSize);
    const tebal = Number(g.fontWeight) >= 700;
    // Ambang WCAG: 3:1 hanya untuk teks besar (>=24px, atau >=18,66px tebal).
    const besar = px >= 24 || (tebal && px >= 18.66);
    const minimum = besar ? 3 : 4.5;

    const bg = latarEfektif(el);
    const k = rasio([fg[0], fg[1], fg[2]], [bg[0], bg[1], bg[2]]);
    diperiksa++;
    if (k < minimum) {
      teksGagal.push({
        teks: (el.textContent || '').trim().slice(0, 26),
        sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
        px: px, k: Math.round(k * 100) / 100, min: minimum,
      });
    }
  }

  // Permukaan gelap: <body> harus lebih gelap daripada teks utamanya.
  const bgBody = rgb(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
  const tBody = rgb(getComputedStyle(document.body).color) || [0, 0, 0, 1];
  const gelap = lum([bgBody[0], bgBody[1], bgBody[2]]) < lum([tBody[0], tBody[1], tBody[2]]);

  return {
    gelap: gelap,
    skemaGelap: getComputedStyle(document.documentElement).colorScheme.includes('dark'),
    bg: [Math.round(bgBody[0]), Math.round(bgBody[1]), Math.round(bgBody[2])],
    diperiksa: diperiksa,
    teksGagal: teksGagal.slice(0, 6),
    jumlahTeksGagal: teksGagal.length,
  };
}
"""


def periksa(pg, nama):
    """Ukur satu halaman: apakah gelap, dan apakah teksnya terbaca."""
    r = pg.evaluate(SKRIP_UKUR)
    cek(f"{nama}: latar gelap (bukan tema terang)",
        r["gelap"], f"rgb{tuple(r['bg'])}")
    cek(f"{nama}: color-scheme gelap (kontrol peramban ikut gelap)",
        r["skemaGelap"], "")
    cek(f"{nama}: teks kecil lolos kontras WCAG AA",
        r["jumlahTeksGagal"] == 0,
        f"{r['jumlahTeksGagal']} gagal dari {r['diperiksa']} diperiksa "
        f"{r['teksGagal'][:2] if r['teksGagal'] else ''}")


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ── 1. Aplikasi Pemilik ──────────────────────────────────
    ctx = b.new_context(viewport={"width": 412, "height": 900})
    pg = ctx.new_page()
    galat = []
    pg.on("pageerror", lambda e: galat.append(str(e)))
    pg.goto(B + "pemilik/", wait_until="load")
    pg.wait_for_timeout(600)
    bantu.masuk_cepat(pg, "pemilik")
    pg.wait_for_timeout(1400)
    periksa(pg, "pemilik")
    cek("pemilik: tanpa galat JS", not galat, galat[:2])
    ctx.close()

    # ── 2. Aplikasi Pengelola ────────────────────────────────
    ctx = b.new_context(viewport={"width": 412, "height": 900})
    pg = ctx.new_page()
    galat = []
    pg.on("pageerror", lambda e: galat.append(str(e)))
    pg.goto(B + "admin/", wait_until="load")
    pg.wait_for_timeout(600)
    bantu.masuk_cepat(pg, "pengelola")
    pg.wait_for_timeout(1400)
    periksa(pg, "panel pengelola (admin)")
    cek("panel pengelola: tanpa galat JS", not galat, galat[:2])
    ctx.close()

    # ── 2b. Panel Mitra (app/) — memakai app/styles.css, punya kotak QR ──
    ctx = b.new_context(viewport={"width": 412, "height": 900})
    pg = ctx.new_page()
    galat = []
    pg.on("pageerror", lambda e: galat.append(str(e)))
    pg.goto(B + "app/", wait_until="load")
    pg.wait_for_timeout(2200)
    periksa(pg, "panel mitra")
    cek("panel mitra: tanpa galat JS", not galat, galat[:2])
    # Kotak QR dibaca dari aturan CSS-nya di halaman nyata. Elemennya sengaja
    # tetap putih: kode QR butuh bidang terang agar bisa dipindai.
    qr = pg.evaluate("""() => {
        const k = document.createElement('div');
        k.className = 'qrbox';
        document.body.appendChild(k);
        const w = getComputedStyle(k).backgroundColor;
        k.remove();
        const v = w.replace(/[^0-9.,]/g, '').split(',').map(Number);
        if (v.length < 3 || v.some((x) => Number.isNaN(x))) return { mentah: w };
        return { r: v[0], g: v[1], b: v[2] };
    }""")
    cek("kotak QR tetap terang agar bisa dipindai",
        qr is not None and qr["r"] > 200 and qr["g"] > 200 and qr["b"] > 200, qr)
    ctx.close()

    # ── 3. Halaman menu pelanggan (publik) ───────────────────
    ctx = b.new_context(viewport={"width": 412, "height": 900})
    pg = ctx.new_page()
    galat = []
    pg.on("pageerror", lambda e: galat.append(str(e)))
    pg.goto(B + "app/menu.html?w=wr-001", wait_until="load")
    pg.wait_for_timeout(1600)
    periksa(pg, "menu pelanggan")
    # Tab Nilai dan Bayar punya gaya sendiri; periksa juga.
    for tab, nama in [("nilai", "tab Nilai"), ("bayar", "tab Bayar")]:
        pg.click(f".tabbtn[data-tab='{tab}']")
        pg.wait_for_timeout(900)
        r = pg.evaluate(SKRIP_UKUR)
        cek(f"menu pelanggan: {nama} lolos kontras",
            r["jumlahTeksGagal"] == 0,
            f"{r['jumlahTeksGagal']} gagal {r['teksGagal'][:2] if r['teksGagal'] else ''}")
    cek("menu pelanggan: tanpa galat JS", not galat, galat[:2])
    ctx.close()

    b.close()

lulus = sum(1 for ok in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 64)
print(f"HASIL TEMA GELAP: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
print("=" * 64)
sys.exit(1 if gagal else 0)
