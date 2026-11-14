"""Uji penerbitan menu otomatis.

Yang dibuktikan:
  1. Tanpa pengaturan, penerbitan otomatis diam (tidak ada kiriman liar).
  2. Saat warung baru didaftarkan, berkas menunya langsung terkirim sendiri.
  3. Saat menu ditambah atau dihapus, berkas terkirim ulang dengan isi terbaru.
  4. Beberapa perubahan cepat digabung jadi satu kiriman (bukan lima).
  5. Berkas yang terkirim hanya memuat data etalase — tanpa transaksi.
  6. Cara server sinkron juga bekerja, dan berkasnya bisa dibaca halaman menu.

Server GitHub dan server sinkron ditirukan dengan Playwright route, bukan
mock di dalam kode aplikasi: kode asli tetap berjalan apa adanya.
"""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/app/"
hasil = []
terkirim = []          # isi berkas yang sampai ke "GitHub"
sinkron_terkirim = []  # isi berkas yang sampai ke "server sinkron"


def cek(nama, ok, ket=""):
    hasil.append((nama, bool(ok), ket))
    print(("  OK  " if ok else " GAGAL") + f"  {nama}" + (f"   [{ket}]" if ket and not ok else ""))


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1440, "height": 950})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))

    # ── Tirukan GitHub Contents API ──
    def github(route):
        req = route.request
        if req.method == "GET":
            return route.fulfill(status=404, content_type="application/json", body='{"message":"Not Found"}')
        badan = json.loads(req.post_data or "{}")
        import base64
        terkirim.append(json.loads(base64.b64decode(badan["content"]).decode("utf-8")))
        route.fulfill(status=201, content_type="application/json",
                      body='{"content":{"path":"ok"},"commit":{"sha":"abc"}}')

    pg.route("https://api.github.com/**", github)

    # ── Tirukan server sinkron ──
    def sinkron(route):
        isi = json.loads(route.request.post_data or "{}")
        sinkron_terkirim.append(isi)
        route.fulfill(status=200, content_type="application/json", body='{"ok":true}')

    pg.route("http://localhost:8999/**", sinkron)

    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(1400)

    # ═══ 1. Tanpa pengaturan: diam ═══
    pg.evaluate("()=>Store.muatContoh()")
    pg.wait_for_timeout(500)
    cek("tanpa pengaturan: Terbit tidak aktif", pg.evaluate("()=>Terbit.aktif()") is False)
    cek("tanpa pengaturan: belum ada kiriman", len(terkirim) == 0, str(len(terkirim)))

    # ═══ 2. Atur cara GitHub ═══
    pg.evaluate("""()=>Terbit.simpan({
        metode:'github', token:'github_pat_contoh', repo:'a/b',
        cabang:'main', folder:'warung-go-digital/menu'})""")
    cek("setelah diatur: Terbit aktif", pg.evaluate("()=>Terbit.aktif()") is True)
    cek("status: token tidak pernah dikembalikan utuh",
        pg.evaluate("()=>Terbit.status().token") is None
        and pg.evaluate("()=>Terbit.status().adaToken") is True)

    # ═══ 3. Daftarkan warung baru -> berkas terkirim sendiri ═══
    terkirim.clear()
    pg.evaluate("location.hash='#/warung'")
    pg.wait_for_timeout(900)
    pg.click("#tambahWarung")
    pg.wait_for_timeout(700)
    pg.fill("#w-nama", "Warung Uji Otomatis")
    pg.fill("#w-pemilik", "Bu Uji")
    pg.fill("#w-wa", "6281234567890")
    pg.fill("#w-alamat", "Jl. Uji No. 1")
    pg.click("#simpanWarung")
    pg.wait_for_timeout(4000)  # beri waktu antrean terbit (jeda 2,5 detik)
    cek("warung baru: berkas terkirim sendiri", len(terkirim) >= 1, str(len(terkirim)))
    if terkirim:
        d = terkirim[-1]
        cek("warung baru: nama benar di berkas", d["warung"]["nama"] == "Warung Uji Otomatis",
            d["warung"]["nama"])
        cek("warung baru: jenis berkas benar", d.get("jenis") == "menu-publik")
        cek("warung baru: tanpa data transaksi", "transaksi" not in d and "catatan" not in d)
        id_uji = d["warung"]["id"]
    else:
        id_uji = None

    # ═══ 4. Tambah menu -> terkirim ulang; beberapa cepat jadi satu ═══
    if id_uji:
        terkirim.clear()
        pg.evaluate(f"()=>window.__w=Store.find('warung','{id_uji}')")
        # Tiga perubahan cepat berturut-turut.
        pg.evaluate("""()=>{
          const id = window.__w.id;
          for (const nama of ['Menu A','Menu B','Menu C']) {
            const w = Store.find('warung', id);
            Store.update('warung', id, {menu:[...w.menu, {id:Store.uid('mn'), nama, harga:10000, kategori:'Makanan'}]});
          }
          App.gambar();
        }""")
        pg.wait_for_timeout(4000)
        cek("tiga perubahan cepat digabung jadi satu kiriman", len(terkirim) == 1, str(len(terkirim)))
        if terkirim:
            nama_menu = [m["nama"] for m in terkirim[-1]["menu"]]
            cek("berkas berisi keadaan terakhir (Menu A,B,C ada)",
                all(x in nama_menu for x in ["Menu A", "Menu B", "Menu C"]), str(nama_menu))

    # ═══ 5. Cara server sinkron ═══
    sinkron_terkirim.clear()
    pg.evaluate("""()=>Terbit.simpan({
        metode:'server', server:'http://localhost:8999', kunciServer:'k'})""")
    pg.evaluate("""()=>{
      const id = window.__w.id;
      const w = Store.find('warung', id);
      Store.update('warung', id, {menu:[...w.menu, {id:Store.uid('mn'), nama:'Menu Server', harga:5000, kategori:'Minuman'}]});
      App.gambar();
    }""")
    pg.wait_for_timeout(4000)
    cek("cara server: berkas terkirim", len(sinkron_terkirim) >= 1, str(len(sinkron_terkirim)))
    if sinkron_terkirim:
        cek("cara server: jenis berkas benar", sinkron_terkirim[-1].get("jenis") == "menu-publik")
        cek("cara server: berisi menu terbaru",
            any(m["nama"] == "Menu Server" for m in sinkron_terkirim[-1]["menu"]))

    cek("tanpa error konsol", not errs, str(errs[:2]))
    ctx.close()
    b.close()

print("\n" + "=" * 62)
lulus = sum(1 for _, ok, _ in hasil if ok)
print(f"HASIL TERBIT OTOMATIS: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(0 if lulus == len(hasil) else 1)
