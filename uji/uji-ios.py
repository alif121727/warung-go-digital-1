"""Uji bagian panduan pasang iPhone (menyatu di unduh.html).

Halaman ini menyesuaikan diri dengan perangkat pengunjung, dan justru di situ
letak risiko yang mudah luput:

1. Pengunjung iPhone lewat Safari harus melihat panduan, bukan pesan galat.
2. Pengunjung iPhone lewat Chrome/Firefox harus diarahkan ke Safari, sebab
   hanya Safari yang bisa memasang ke layar utama.
3. Pengunjung Android/desktop tidak boleh melihat panduan iPhone; mereka
   diarahkan ke halaman unduh.
4. Pengunjung yang sudah memasang aplikasi (standalone) tidak perlu panduan.
5. Tautan di halaman unduh harus benar-benar menuju halaman ini, dan berkas
   IPA tetap dapat dijangkau sebagai jalur alternatif.
6. Tanpa geser samping dan tanpa error console.

Jalankan: python3 uji/uji-ios.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import re
from playwright.sync_api import sync_playwright

LANDING = "http://localhost:12000/warung-go-digital/"
PANDUAN = LANDING + "unduh.html"  # panduan menyatu di halaman ini
UNDUH = LANDING + "unduh.html"

UA_IPHONE_SAFARI = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 "
                    "Mobile/15E148 Safari/604.1")
UA_IPHONE_CHROME = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 "
                    "Mobile/15E148 Safari/604.1")
UA_IPAD_MODERN = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 "
                  "Safari/605.1.15")
UA_ANDROID = ("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
UKURAN = [320, 360, 390, 430, 768, 1024, 1440]

hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    if not ok:
        print(f"GAGAL  {nama:54} {info}")


def buka(b, ua=None, lebar=390, tinggi=844, sentuh=True, standalone=False,
         init=None):
    """Buka satu halaman dengan perangkat tiruan. Bila `standalone`, situs
    dibuka sebagai aplikasi terpasang (bukan dari peramban). `init` menyuntik
    skrip sebelum halaman berjalan, untuk meniru ciri perangkat tertentu."""
    ctx = b.new_context(viewport={"width": lebar, "height": tinggi},
                        is_mobile=sentuh, has_touch=sentuh, user_agent=ua)
    if standalone:
        # display-mode: standalone tidak bisa ditiru lewat CSS; pilihannya
        # adalah menyuntikkan `navigator.standalone` sebelum skrip halaman jalan.
        ctx.add_init_script("Object.defineProperty(navigator,'standalone',"
                            "{get:()=>true});")
    if init:
        ctx.add_init_script(init)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    return ctx, pg, errs


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ── 1. iPhone Safari: panduan tampil ─────────────────────
    ctx, pg, errs = buka(b, UA_IPHONE_SAFARI)
    pg.goto(PANDUAN, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate("""()=>({
      panduan: !!document.getElementById('pasang-ios'),
      sudah: !document.getElementById('ios-sudah')?.hidden,
      bukanSafari: !document.getElementById('ios-bukan-safari')?.hidden,
      bukanIos: !document.getElementById('ios-bukan-ios')?.hidden,
      langkah: document.querySelectorAll('#pasang-ios .panduan__langkah').length,
      sw: document.documentElement.scrollWidth, iw: window.innerWidth
    })""")
    cek("iPhone Safari: bagian panduan ada", r["panduan"])
    cek("iPhone Safari: pesan 'sudah terpasang' tersembunyi", not r["sudah"])
    cek("iPhone Safari: pesan 'bukan Safari' tersembunyi", not r["bukanSafari"])
    cek("iPhone Safari: pesan 'bukan iOS' tersembunyi", not r["bukanIos"])
    cek("iPhone Safari: empat langkah tergambar", r["langkah"] == 4, r["langkah"])
    cek("iPhone Safari: tanpa geser samping", r["sw"] <= r["iw"] + 1,
        f"{r['sw']}>{r['iw']}")
    cek("iPhone Safari: tanpa error console", not errs, errs[:2])
    ctx.close()

    # ── 2. iPhone Chrome: diarahkan ke Safari ────────────────
    ctx, pg, errs = buka(b, UA_IPHONE_CHROME)
    pg.goto(PANDUAN, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate("""()=>({
      bukanSafari: !document.getElementById('ios-bukan-safari')?.hidden,
      tombolSalin: !!document.getElementById('iosTombolSalin'),
      teksSalin: document.getElementById('iosTautanSalin').textContent.trim()
    })""")
    cek("iPhone Chrome: diarahkan ke Safari", r["bukanSafari"])
    cek("iPhone Chrome: tombol salin tautan tersedia", r["tombolSalin"])
    cek("iPhone Chrome: tautan salin menunjuk halaman ini",
        r["teksSalin"].endswith("/unduh.html"), r["teksSalin"])
    cek("iPhone Chrome: tanpa error console", not errs, errs[:2])
    ctx.close()

    # ── 3. iPad modern (menyamar sebagai macOS) ──────────────
    # maxTouchPoints disuntik di tingkat konteks supaya berlaku sejak skrip
    # pertama halaman berjalan, sama seperti iPad sungguhan.
    # `navigator.platform` tidak mengikuti agen pengguna, jadi kedua ciri iPad
    # harus disuntik: platform "MacIntel" DAN layar sentuh lebih dari satu.
    ctx, pg, errs = buka(b, UA_IPAD_MODERN, lebar=820, tinggi=1180,
                         init="Object.defineProperty(navigator,'platform',"
                              "{get:()=>'MacIntel'});"
                              "Object.defineProperty(navigator,'maxTouchPoints',"
                              "{get:()=>5});")
    pg.goto(PANDUAN, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate("""()=>({
      panduan: !!document.getElementById('pasang-ios'),
      bukanIos: !document.getElementById('ios-bukan-ios')?.hidden
    })""")
    cek("iPad modern: bagian panduan ada (bukan dianggap desktop)", r["panduan"])
    cek("iPad modern: pesan 'bukan iOS' tersembunyi", not r["bukanIos"])
    cek("iPad modern: tanpa error console", not errs, errs[:2])
    ctx.close()

    # ── 4. Android: diarahkan ke halaman unduh ───────────────
    ctx, pg, errs = buka(b, UA_ANDROID)
    pg.goto(PANDUAN, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate("""()=>({
      bukanIos: !document.getElementById('ios-bukan-ios')?.hidden,
      tujuan: document.querySelector('#ios-bukan-ios a')?.getAttribute('href')
    })""")
    cek("Android: diarahkan ke halaman unduh", r["bukanIos"])
    cek("Android: tautan menuju pemasangan APK", r["tujuan"] == "#unduh", r["tujuan"])
    cek("Android: tanpa error console", not errs, errs[:2])
    ctx.close()

    # ── 5. Sudah terpasang (standalone) ──────────────────────
    ctx, pg, errs = buka(b, UA_IPHONE_SAFARI, standalone=True)
    pg.goto(PANDUAN, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate("""()=>({
      sudah: !document.getElementById('ios-sudah')?.hidden,
      langkah: !document.querySelector('#pasang-ios .panduan')?.hidden
    })""")
    cek("Sudah terpasang: ucapan tampil", r["sudah"])
    cek("Sudah terpasang: langkah panduan disembunyikan", not r["langkah"])
    ctx.close()

    # ── 6. Tanpa geser samping di segala ukuran ──────────────
    for w in UKURAN:
        ctx, pg, errs = buka(b, UA_IPHONE_SAFARI, lebar=w, tinggi=900)
        pg.goto(PANDUAN, wait_until="load")
        pg.wait_for_timeout(800)
        r = pg.evaluate("""()=>({sw:document.documentElement.scrollWidth,
                               iw:window.innerWidth})""")
        cek(f"{w}px panduan tanpa geser samping", r["sw"] <= r["iw"] + 1,
            f"{r['sw']}>{r['iw']}")
        # Geser paksa: elemen yang lolos klip akan membuat scrollX > 0.
        pg.evaluate("window.scrollTo(9000, 0)")
        pg.wait_for_timeout(120)
        sx = pg.evaluate("()=>window.scrollX")
        cek(f"{w}px panduan tidak bisa digeser paksa", sx <= 1, f"scrollX={sx}")
        ctx.close()

    # ── 7. Target sentuh langkah cukup besar ─────────────────
    ctx, pg, errs = buka(b, UA_IPHONE_SAFARI)
    pg.goto(PANDUAN, wait_until="load")
    pg.wait_for_timeout(800)
    tinggi_min = pg.evaluate("""()=>Math.min(
      ...[...document.querySelectorAll('#pasang-ios .panduan__langkah')]
        .map(e=>e.getBoundingClientRect().height))""")
    cek("Langkah panduan tinggi >= 64px", tinggi_min >= 64, round(tinggi_min))
    ctx.close()

    # ── 8. Tautan dari halaman unduh ─────────────────────────
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(UNDUH, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate("""()=>({
      tombolIos: document.getElementById('tombolIos')?.getAttribute('href'),
      teksTombol: document.getElementById('tombolIos')?.textContent.trim(),
      tombolIpa: document.getElementById('tombolIpa')?.getAttribute('href'),
      anchorPanduan: !!document.getElementById('pasang-ios'),
      tautanDalam: document.querySelectorAll('a[href="#pasang-ios"]').length,
      sw: document.documentElement.scrollWidth, iw: window.innerWidth
    })""")
    cek("Unduh: tombol iPhone menggulir ke panduan", r["tombolIos"] == "#pasang-ios",
        r["tombolIos"])
    cek("Unduh: tombol iPhone menyebut 'iPhone'",
        "iPhone" in r["teksTombol"], r["teksTombol"])
    cek("Unduh: bagian panduan ada di halaman ini", r["anchorPanduan"])
    cek("Unduh: berkas IPA tetap tersedia", bool(r["tombolIpa"]) and
        r["tombolIpa"].endswith("warung-go-digital.ipa"), r["tombolIpa"])
    cek("Unduh: panduan tertaut dari lebih dari satu tempat",
        r["tautanDalam"] >= 2, r["tautanDalam"])
    cek("Unduh: tanpa geser samping", r["sw"] <= r["iw"] + 1, f"{r['sw']}>{r['iw']}")
    cek("Unduh: tanpa error console", not errs, errs[:2])
    pg.close()

    # ── 9. Service worker mendaftarkan berkas panduan ────────
    pg = b.new_page()
    sw = pg.goto(LANDING + "sw.js").text()
    cek("sw.js memuat pasang-ios.js", "'./pasang-ios.js'" in sw)
    cek("sw.js memuat unduh.html", "'./unduh.html'" in sw)
    # Yang penting bukan nomor persisnya, melainkan bahwa versi cache sudah
    # dinaikkan minimal ke angka saat berkas panduan mulai didaftarkan.
    # Mengunci nomor persis membuat uji ini gagal setiap kali cache
    # dinaikkan, padahal justru itu yang diinginkan.
    v = re.search(r"VERSI = 'wgd-v(\d+)'", sw)
    cek("sw.js versi cache minimal v12", bool(v) and int(v.group(1)) >= 12,
        v.group(0) if v else "tidak ditemukan")
    pg.close()

    b.close()

lulus = sum(1 for _, ok, _ in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 62)
print(f"HASIL IOS: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
print("=" * 62)
if gagal:
    raise SystemExit(1)
