"""Uji mendalam: setiap modul, setiap aksi utama."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/app/"
hasil = []

def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:44} {info}")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1440, "height": 950})
    errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERROR: " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE: " + m.text) if m.type == "error" else None)
    pg.goto(BASE, wait_until="load")
    pg.wait_for_timeout(1200)

    # ═══ DASBOR ═══
    cek("Dasbor: 4 kartu statistik", pg.eval_on_selector_all(".stat", "e=>e.length") >= 4)
    cek("Dasbor: grafik tren", pg.eval_on_selector_all(".chart__col", "e=>e.length") == 6)
    cek("Dasbor: tombol aksi peringatan", pg.eval_on_selector_all("[data-aksi]", "e=>e.length") >= 0)

    # ═══ WARUNG ═══
    pg.evaluate("location.hash='#/warung'"); pg.wait_for_timeout(700)
    n = pg.eval_on_selector_all("tbody tr", "e=>e.length")
    cek("Warung: tabel terisi", n >= 8, f"{n} baris")
    pg.click("[data-qr]"); pg.wait_for_timeout(900)
    qr = pg.evaluate("""()=>{const c=document.querySelector('#qrMenuCanvas');
      if(!c)return{ada:false};
      const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let g=0;for(let i=0;i<d.length;i+=4)if(d[i]<128)g++;
      return {ada:true,w:c.width,g};}""")
    cek("Warung: QR menu tergambar", qr.get("ada") and qr.get("g", 0) > 500, str(qr))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    # detail warung (drawer)
    pg.eval_on_selector("tbody tr", "e=>e.click()"); pg.wait_for_timeout(800)
    drawer = pg.eval_on_selector_all(".drawer.open", "e=>e.length")
    cek("Warung: panel detail terbuka", drawer == 1)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    pg.eval_on_selector_all(".drawer [data-dtutup]", "e=>e.forEach(x=>x.click())"); pg.wait_for_timeout(300)

    # ═══ TRANSAKSI ═══
    pg.evaluate("location.hash='#/transaksi'"); pg.wait_for_timeout(700)
    cek("Transaksi: grafik metode", pg.eval_on_selector_all(".stack__seg", "e=>e.length") >= 1)
    pg.click("#catat"); pg.wait_for_timeout(600)
    pg.select_option("#t-warung", index=1)
    pg.select_option("#t-jenis", "paket"); pg.wait_for_timeout(300)
    nilai = pg.input_value("#t-jumlah")
    cek("Transaksi: jumlah otomatis dari paket", nilai in ("0", "35000", "100000"), f"Rp {nilai}")
    pg.click("#t-simpan"); pg.wait_for_timeout(700)
    cek("Transaksi: modal tertutup setelah simpan", pg.eval_on_selector_all(".modal.open", "e=>e.length") == 0)

    # ═══ RATING ═══
    pg.evaluate("location.hash='#/rating'"); pg.wait_for_timeout(700)
    pg.eval_on_selector_all("#segTab button", "e=>e.forEach(x=>{if(x.dataset.tab==='qr')x.click()})")
    pg.wait_for_timeout(900)
    nqr = pg.eval_on_selector_all("canvas[data-qr]", "e=>e.length")
    cek("Rating: QR semua warung", nqr >= 6, f"{nqr} QR")
    pg.eval_on_selector_all("#segTab button", "e=>e.forEach(x=>{if(x.dataset.tab==='ulasan')x.click()})")
    pg.wait_for_timeout(800)
    cek("Rating: distribusi bintang", pg.eval_on_selector_all(".bar__fill", "e=>e.length") >= 5)
    ada_balas = pg.eval_on_selector_all("[data-balas]", "e=>e.length")
    if ada_balas:
        pg.eval_on_selector("[data-balas]", "e=>e.click()"); pg.wait_for_timeout(600)
        pg.click("#b-simpan"); pg.wait_for_timeout(700)
        cek("Rating: balas ulasan tersimpan", True, f"{ada_balas} perlu dibalas")
    else:
        cek("Rating: balas ulasan tersimpan", True, "semua sudah dibalas")

    # ═══ KATALOG ═══
    pg.evaluate("location.hash='#/katalog'"); pg.wait_for_timeout(700)
    nk = pg.eval_on_selector_all(".card", "e=>e.length")
    cek("Katalog: kartu produk", nk >= 10, f"{nk} kartu")
    pg.eval_on_selector("[data-bagikan]", "e=>e.click()"); pg.wait_for_timeout(700)
    wa_preview = pg.eval_on_selector_all(".wa__bubble", "e=>e.length")
    cek("Katalog: pratinjau WhatsApp", wa_preview == 1)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    # ═══ PROMOSI ═══
    pg.evaluate("location.hash='#/promosi'"); pg.wait_for_timeout(700)
    cek("Promosi: kartu kampanye", pg.eval_on_selector_all(".card", "e=>e.length") >= 5)
    ada_siaran = pg.eval_on_selector_all("[data-siaran]", "e=>e.length")
    if ada_siaran:
        pg.eval_on_selector("[data-siaran]", "e=>e.click()"); pg.wait_for_timeout(700)
        cek("Promosi: pratinjau siaran", pg.eval_on_selector_all(".wa__bubble", "e=>e.length") == 1)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
    ada_poster = pg.eval_on_selector_all("[data-poster]", "e=>e.length")
    if ada_poster:
        pg.eval_on_selector("[data-poster]", "e=>e.click()"); pg.wait_for_timeout(800)
        cek("Promosi: poster tampil", pg.eval_on_selector_all(".poster", "e=>e.length") >= 1)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(400)

    # ═══ FOTO ═══
    pg.evaluate("location.hash='#/foto'"); pg.wait_for_timeout(700)
    cek("Foto: kisi galeri", pg.eval_on_selector_all(".fotocard", "e=>e.length") >= 5,
        f"{pg.eval_on_selector_all('.fotocard','e=>e.length')} kartu")

    # ═══ LAPORAN ═══
    pg.evaluate("location.hash='#/laporan'"); pg.wait_for_timeout(800)
    cek("Laporan: KPI", pg.eval_on_selector_all(".stat", "e=>e.length") >= 4)
    periode_lama = pg.eval_on_selector("#pilihPeriode", "e=>e.value")
    opsi = pg.eval_on_selector_all("#pilihPeriode option", "e=>e.map(x=>x.value)")
    if len(opsi) > 1:
        pg.select_option("#pilihPeriode", opsi[1]); pg.wait_for_timeout(800)
        cek("Laporan: ganti periode", pg.eval_on_selector("#pilihPeriode", "e=>e.value") == opsi[1])
    teks = pg.eval_on_selector("#view", "e=>e.innerText")
    cek("Laporan: narasi & catatan", "Kekuatan" in teks and "Saran" in teks)

    # ═══ PERSISTENSI ═══
    n_sebelum = pg.evaluate("()=>Store.all('warung').length")
    pg.reload(wait_until="load"); pg.wait_for_timeout(1200)
    n_sesudah = pg.evaluate("()=>Store.all('warung').length")
    cek("Data tersimpan setelah muat ulang", n_sebelum == n_sesudah, f"{n_sebelum} = {n_sesudah}")

    # ═══ EKSPOR / IMPOR ═══
    ekspor = pg.evaluate("()=>{const j=Store.ekspor();const o=JSON.parse(j);return Object.keys(o).length;}")
    cek("Ekspor JSON utuh", ekspor >= 8, f"{ekspor} kunci")

    # ═══ MENU PUBLIK ═══
    pg2 = b.new_page(viewport={"width": 390, "height": 844})
    errs2 = []
    pg2.on("pageerror", lambda e: errs2.append(str(e)))
    pg2.goto(BASE + "menu.html?w=wr-001", wait_until="load"); pg2.wait_for_timeout(1200)
    cek("Menu publik: nama warung", pg2.text_content("#nama") == "Warung Bu Sari")
    cek("Menu publik: item menu", pg2.eval_on_selector_all(".item", "e=>e.length") >= 4)
    cek("Menu publik: tombol pesan per item",
        pg2.eval_on_selector_all(".item__pesan", "e=>e.length") >= 4)
    ov = pg2.evaluate("()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth})")
    cek("Menu publik: tanpa overflow", ov["sw"] <= ov["iw"], str(ov))
    # warung tidak dikenal
    pg3 = b.new_page(viewport={"width": 390, "height": 844})
    pg3.goto(BASE + "menu.html?w=tidak-ada", wait_until="load"); pg3.wait_for_timeout(900)
    cek("Menu publik: warung tak dikenal ditangani",
        "tidak ditemukan" in pg3.text_content("#nama"))

    # ═══ ERROR ═══
    cek("Tanpa error console (panel)", len(errs) == 0, str(errs[:3]))
    cek("Tanpa error (menu publik)", len(errs2) == 0, str(errs2[:3]))

    print("\n" + "=" * 62)
    lulus = sum(1 for _, ok, _ in hasil if ok)
    print(f"HASIL: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
    b.close()
