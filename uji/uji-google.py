"""Uji kesiapan mesin pencari (SEO) — Warung Go Digital.

Yang dijaga di sini adalah hal-hal yang mudah hilang tanpa terlihat:

1. Kata kunci "Warung Go Digital" benar-benar ada sebagai teks di halaman,
   bukan hanya di dalam meta. Google mengutamakan isi yang terbaca.
2. Tiap halaman publik punya judul, deskripsi, dan canonical yang benar.
   Canonical yang salah membuat Google memilih alamat lain.
3. Data terstruktur (JSON-LD) sah dan berisi Organization + FAQPage. Bila
   salah ketik satu tanda, Google membuang seluruh blok tanpa peringatan.
4. robots.txt dan sitemap.xml dapat dibaca dan saling menunjuk.
5. Panel dalam (pemilik/admin/app) tidak masuk mesin pencari.
6. Pertanyaan umum benar-benar bisa dibuka, bukan sekadar ada di HTML.

Jalankan: python3 uji/uji-google.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import json
import sys
import urllib.request
from playwright.sync_api import sync_playwright

AKAR = "http://localhost:12000/warung-go-digital/"
BERANDA = AKAR
UNDUH = AKAR + "unduh.html"
PRIVASI = AKAR + "privasi.html"
ROBOTS = AKAR + "robots.txt"
SITEMAP = AKAR + "sitemap.xml"

PUBLIK = {
    "": "https://alif121727.github.io/warung-go-digital-1/",
    "unduh.html": "https://alif121727.github.io/warung-go-digital-1/unduh.html",
    "privasi.html": "https://alif121727.github.io/warung-go-digital-1/privasi.html",
}
DALAM = ["pemilik/", "admin/", "app/"]

hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    if not ok:
        print(f"GAGAL  {nama:56} {info}")


def ambil(url):
    with urllib.request.urlopen(url, timeout=10) as r:
        return r.read().decode("utf-8", "replace")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BERANDA, wait_until="load")
    pg.wait_for_timeout(900)

    # ── 1. Judul, deskripsi, canonical, robots ──────────────
    judul = pg.title()
    cek("judul memuat nama merek", "Warung Go Digital" in judul, judul)
    cek("judul cukup panjang untuk Google", 25 <= len(judul) <= 70, f"{len(judul)} huruf")

    def meta(nama_attr, nilai):
        return pg.get_attribute(f'meta[{nama_attr}="{nilai}"]', "content")

    desc = meta("name", "description")
    cek("ada meta description", bool(desc), str(desc)[:60])
    cek("deskripsi 70-165 huruf", 70 <= len(desc or "") <= 165, f"{len(desc or '')} huruf")

    kw = meta("name", "keywords") or ""
    cek("meta keywords memuat 'Warung Go Digital'",
        "warung go digital" in kw.lower(), kw[:60])

    canon = pg.get_attribute('link[rel="canonical"]', "href")
    cek("canonical beranda tepat", canon == PUBLIK[""], str(canon))
    cek("robots beranda mengizinkan",
        "index" in (meta("name", "robots") or "") and
        "noindex" not in (meta("name", "robots") or ""), str(meta("name", "robots")))

    # Tag bukti kepemilikan Google Search Console. Bila hilang, Google
    # mencabut verifikasi properti dan berhenti melaporkan status situs.
    verifikasi = meta("name", "google-site-verification")
    cek("ada tag verifikasi Google Search Console", bool(verifikasi), str(verifikasi))
    cek("tag verifikasi berisi token yang benar",
        verifikasi == "E9eIyzcierTj09FZhgLNiSXr5jbi8cmDcpRHYjacCfQ", str(verifikasi))

    # ── 2. Kata kunci tampil sebagai teks ───────────────────
    teks = pg.inner_text("body").lower()
    jumlah = teks.count("warung go digital")
    cek("kata kunci muncul >= 5x sebagai teks", jumlah >= 5, f"{jumlah}x")

    tentang = pg.query_selector("#tentang")
    cek("ada bagian #tentang", tentang is not None)
    if tentang:
        t = tentang.inner_text().lower()
        cek("bagian #tentang menjelaskan 'apa itu warung go digital'",
            "apa itu" in t and "warung go digital" in t, t[:70])
        for kata in ["qr menu", "whatsapp", "google maps", "umkm"]:
            cek(f"#tentang menyebut '{kata}'", kata in t)

    # ── 3. Data terstruktur JSON-LD ─────────────────────────
    blok = pg.eval_on_selector_all(
        'script[type="application/ld+json"]', "els=>els.map(e=>e.textContent)")
    cek("ada tepat satu blok JSON-LD", len(blok) == 1, f"{len(blok)} blok")

    data = None
    if len(blok) == 1:
        try:
            data = json.loads(blok[0])
            cek("JSON-LD dapat diurai", True)
        except json.JSONDecodeError as e:
            cek("JSON-LD dapat diurai", False, str(e))

    if data:
        cek("JSON-LD memakai @context schema.org",
            data.get("@context") == "https://schema.org", str(data.get("@context")))
        jenis = {n.get("@type") for n in data.get("@graph", [])}
        for wajib in ["Organization", "WebSite", "FAQPage"]:
            cek(f"JSON-LD memuat {wajib}", wajib in jenis, str(jenis))

        org = next((n for n in data["@graph"] if n.get("@type") == "Organization"), {})
        cek("Organization bernama 'Warung Go Digital'",
            org.get("name") == "Warung Go Digital", str(org.get("name")))
        cek("Organization punya logo", bool(org.get("logo")), str(org.get("logo"))[:60])
        cek("Organization punya url", bool(org.get("url")), str(org.get("url")))

        faq = next((n for n in data["@graph"] if n.get("@type") == "FAQPage"), {})
        soal = faq.get("mainEntity", [])
        cek("FAQPage punya >= 4 pertanyaan", len(soal) >= 4, f"{len(soal)} soal")
        lengkap = all(
            s.get("@type") == "Question" and s.get("name") and
            s.get("acceptedAnswer", {}).get("text") for s in soal)
        cek("tiap pertanyaan punya nama dan jawaban", lengkap)

        # Teks jawaban JSON-LD harus sama dengan yang terlihat di halaman.
        # Google menolak data terstruktur yang tidak cocok dengan isinya.
        # Dipakai textContent, bukan innerText: innerText pada <details> yang
        # masih tertutup hanya mengembalikan judulnya, bukan jawabannya.
        def rapat(t):
            return " ".join(t.split()).lower()

        peta = {rapat(s["name"]): rapat(s["acceptedAnswer"]["text"]) for s in soal}
        daftar = pg.eval_on_selector_all(
            "#tentang details.soal",
            "els=>els.map(e=>({q:e.querySelector('summary').textContent, a:e.textContent}))")
        cocok = 0
        for d in daftar:
            kunci = rapat(d["q"])
            if kunci in peta and peta[kunci] in rapat(d["a"]):
                cocok += 1
        cek("jawaban JSON-LD cocok dengan isi halaman", cocok == len(soal),
            f"{cocok}/{len(soal)}")

    # ── 4. Pertanyaan umum benar-benar bisa dibuka ──────────
    daftar_soal = pg.query_selector_all("#tentang details.soal")
    cek("ada >= 4 kotak tanya-jawab", len(daftar_soal) >= 4, f"{len(daftar_soal)}")
    if daftar_soal:
        pg.eval_on_selector("#tentang details.soal summary", "e=>e.click()")
        pg.wait_for_timeout(600)
        terbuka = pg.eval_on_selector("#tentang details.soal", "e=>e.open")
        tinggi = pg.eval_on_selector("#tentang details.soal p", "e=>e.getBoundingClientRect().height")
        cek("tanya-jawab dapat dibuka", terbuka, f"open={terbuka}")
        cek("jawaban terlihat setelah dibuka", tinggi > 8, f"{tinggi:.0f}px")

    cek("tanpa error console di beranda", not errs, str(errs[:3]))
    pg.close()

    # ── 5. Tiap halaman publik: judul, deskripsi, canonical ─
    for jalur, alamat in PUBLIK.items():
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        pg.goto(AKAR + jalur, wait_until="load")
        pg.wait_for_timeout(500)
        nama = jalur or "(beranda)"
        cek(f"{nama}: judul memuat merek", "Warung Go Digital" in pg.title(), pg.title())
        cek(f"{nama}: ada deskripsi",
            bool(pg.get_attribute('meta[name="description"]', "content")))
        cek(f"{nama}: canonical tepat",
            pg.get_attribute('link[rel="canonical"]', "href") == alamat,
            str(pg.get_attribute('link[rel="canonical"]', "href")))
        rb = pg.get_attribute('meta[name="robots"]', "content") or ""
        cek(f"{nama}: boleh diindeks", "noindex" not in rb, rb)
        pg.close()

    # ── 6. Panel dalam tidak boleh diindeks ─────────────────
    for jalur in DALAM:
        pg = b.new_page(viewport={"width": 1280, "height": 800})
        pg.goto(AKAR + jalur, wait_until="load")
        pg.wait_for_timeout(400)
        rb = pg.get_attribute('meta[name="robots"]', "content") or ""
        cek(f"{jalur}: noindex terpasang", "noindex" in rb, rb or "(kosong)")
        pg.close()

    b.close()

# ── 7. robots.txt ───────────────────────────────────────────
robots = ambil(ROBOTS)
cek("robots.txt: ada baris User-agent", "User-agent: *" in robots)
cek("robots.txt: tunjuk sitemap",
    "Sitemap: https://alif121727.github.io/warung-go-digital-1/sitemap.xml" in robots)
for jalur in ["/pemilik/", "/admin/"]:
    cek(f"robots.txt: tutup {jalur}", f"Disallow: {jalur}" in robots)
cek("robots.txt: menu QR publik tetap terbuka", "Allow: /app/menu.html" in robots)

# ── 8. sitemap.xml ──────────────────────────────────────────
sitemap = ambil(SITEMAP)
cek("sitemap.xml: berkas XML", sitemap.lstrip().startswith("<?xml"))
for alamat in PUBLIK.values():
    cek(f"sitemap.xml: memuat {alamat.split('/')[-1] or 'beranda'}",
        f"<loc>{alamat}</loc>" in sitemap)
cek("sitemap.xml: tidak memuat panel dalam",
    "/pemilik/" not in sitemap and "/admin/" not in sitemap)

lulus = sum(1 for _, ok, _ in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 66)
print(f"HASIL GOOGLE: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
sys.exit(1 if gagal else 0)
