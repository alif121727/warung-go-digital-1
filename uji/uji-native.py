"""Uji lapisan native: penyesuaian saat situs dibungkus jadi aplikasi.

Memakai tiruan jembatan Capacitor (tanpa Android) untuk memastikan:
  - di peramban biasa tidak ada yang berubah (tanpa efek samping)
  - di dalam aplikasi: unduh berkas memakai Filesystem+Share, tombol
    kembali perangkat berperilaku benar, dan warna merek dipasang

Jalankan: python3 uji/uji-native.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/"
hasil = []

# Tiruan jembatan Capacitor: mencatat panggilan agar bisa diperiksa.
TIRUAN = """
window.__catatan = { fs: [], share: [], status: [], keluar: 0 };
window.Capacitor = {
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  Plugins: {
    Filesystem: {
      writeFile: async (o) => { window.__catatan.fs.push(o); return { uri: 'file:///cache/' + o.path }; },
    },
    Share: {
      canShare: async () => ({ value: true }),
      share: async (o) => { window.__catatan.share.push(o); return {}; },
    },
    App: {
      addListener: async (nama, cb) => { window.__catatan.backButton = cb; return { remove() {} }; },
      exitApp: async () => { window.__catatan.keluar += 1; },
    },
    StatusBar: {
      setBackgroundColor: async (o) => { window.__catatan.status.push(['warna', o.color]); },
      setStyle: async (o) => { window.__catatan.status.push(['gaya', o.style]); },
    },
  },
};
"""


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:48} {info}")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ═══ 1. Peramban biasa: tanpa perubahan perilaku ═══
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "pemilik/", wait_until="load")
    pg.wait_for_timeout(900)
    cek("peramban: tanpa error konsol", not errs, str(errs[:2]))
    cek("peramban: tanpa kelas native",
        not pg.evaluate("()=>document.documentElement.classList.contains('native')"))
    cek("peramban: Inti.unduh tetap memakai tautan unduhan",
        pg.evaluate("()=>Inti.unduh.toString().includes('URL.createObjectURL')"))
    ctx.close()

    # ═══ 2. Dalam aplikasi (Capacitor tiruan) ═══
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.add_init_script(TIRUAN)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "pemilik/", wait_until="load")
    pg.wait_for_timeout(900)

    cek("aplikasi: tanpa error konsol", not errs, str(errs[:2]))
    cek("aplikasi: kelas native dipasang",
        pg.evaluate("()=>document.documentElement.classList.contains('native')"))
    cek("aplikasi: pendengar tombol kembali terpasang",
        pg.evaluate("()=>typeof window.__catatan.backButton === 'function'"))
    cek("aplikasi: warna bilah status disetel",
        pg.evaluate("()=>window.__catatan.status.some(s=>s[0]==='warna'&&s[1]==='#0d1a12')"))
    cek("aplikasi: gaya bilah status gelap",
        pg.evaluate("()=>window.__catatan.status.some(s=>s[0]==='gaya'&&s[1]==='DARK')"))

    # Unduh berkas harus lewat Filesystem lalu dibagikan.
    pg.evaluate("()=>Inti.unduh('uji.csv', 'a,b\\n1,2', 'text/csv')")
    pg.wait_for_timeout(500)
    fs = pg.evaluate("()=>window.__catatan.fs")
    cek("aplikasi: berkas ditulis ke perangkat",
        len(fs) == 1 and fs[0]["path"] == "uji.csv" and fs[0]["encoding"] == "utf8", str(fs))
    bagikan = pg.evaluate("()=>window.__catatan.share")
    cek("aplikasi: menu bagikan dibuka dengan berkas",
        len(bagikan) == 1 and bagikan[0]["url"].startswith("file://"), str(bagikan))

    # Tombol kembali: pindah ke tab pertama lebih dulu, baru keluar.
    pg.evaluate("()=>{document.querySelectorAll('.tabbar__item')[3].click()}")
    pg.wait_for_timeout(400)
    aktif = pg.evaluate("()=>document.querySelector('.tabbar__item.on').dataset.tab")
    cek("prasyarat: tab bukan tab pertama", aktif != "catat", aktif)
    pg.evaluate("()=>window.__catatan.backButton({ canGoBack: false })")
    pg.wait_for_timeout(400)
    cek("kembali: berpindah ke tab pertama",
        pg.evaluate("()=>document.querySelector('.tabbar__item.on').dataset.tab") == "catat")
    cek("kembali: belum keluar dari aplikasi",
        pg.evaluate("()=>window.__catatan.keluar") == 0)

    # Di tab pertama: menekan kembali harus keluar dari aplikasi.
    pg.evaluate("()=>window.__catatan.backButton({ canGoBack: false })")
    pg.wait_for_timeout(300)
    cek("kembali: keluar dari aplikasi", pg.evaluate("()=>window.__catatan.keluar") == 1)

    # Dialog terbuka: kembali harus menutup dialog, bukan keluar.
    pg.evaluate("()=>Inti.modal({ judul: 'Uji', isi: '<p>halo</p>' })")
    pg.wait_for_timeout(300)
    cek("prasyarat: dialog terbuka",
        pg.evaluate("()=>document.querySelector('#modal').classList.contains('open')"))
    pg.evaluate("()=>window.__catatan.backButton({ canGoBack: false })")
    pg.wait_for_timeout(300)
    cek("kembali: dialog ditutup lebih dulu",
        not pg.evaluate("()=>document.querySelector('#modal').classList.contains('open')"))
    cek("kembali: tetap tidak keluar saat dialog ditutup",
        pg.evaluate("()=>window.__catatan.keluar") == 1)

    ctx.close()

    # ═══ 3. Panel pengelola juga memuat lapisan native ═══
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.add_init_script(TIRUAN)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "admin/", wait_until="load")
    pg.wait_for_timeout(900)
    cek("panel: tanpa error konsol", not errs, str(errs[:2]))
    cek("panel: kelas native dipasang",
        pg.evaluate("()=>document.documentElement.classList.contains('native')"))
    ctx.close()

    b.close()

print("\n" + "=" * 62)
lulus = sum(1 for _, ok, _ in hasil if ok)
print(f"HASIL NATIVE: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(0 if lulus == len(hasil) else 1)
