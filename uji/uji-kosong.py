"""Uji kondisi awal aplikasi tanpa data (pemilik warung baru belum punya pelanggan).

Memeriksa:
  - kunjungan pertama dimulai dengan data kosong
  - semua modul tampil rapi (empty state, tanpa NaN/undefined, tanpa error)
  - tombol "Muat data contoh" mengisi data, tombol hapus mengosongkan lagi
  - halaman menu warung tak dikenal ditangani dengan pesan ramah
  - ikon pencarian berukuran wajar (tidak membengkak)

Jalankan: python3 uji/uji-kosong.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:12000/warung-go-digital/app/"
MODUL = ["dasbor", "warung", "transaksi", "rating", "katalog", "promosi", "foto", "laporan"]
hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:46} {info}")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1280, "height": 950})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    # 404 dari percobaan berkas menu terbit memang disengaja (ada cadangan).
    pg.on("console", lambda m: errs.append(m.text)
          if m.type == "error" and "Failed to load resource" not in m.text else None)

    # Bersihkan penyimpanan supaya benar-benar seperti kunjungan pertama.
    pg.goto(BASE, wait_until="load")
    pg.evaluate("()=>localStorage.clear()")
    pg.reload(wait_until="load")
    pg.wait_for_timeout(1200)

    n = pg.evaluate(
        "()=>({w:Store.all('warung').length,t:Store.all('transaksi').length,r:Store.all('rating').length})"
    )
    cek("kunjungan pertama: data kosong", n == {"w": 0, "t": 0, "r": 0}, str(n))
    cek("dasbor: ajakan 'Muat data contoh' tampil",
        pg.eval_on_selector_all("#muatContoh", "e=>e.length") == 1, "")

    # ── Setiap modul harus rapi saat kosong ──
    for m in MODUL:
        pg.evaluate(f"location.hash='#/{m}'")
        pg.wait_for_timeout(650)
        teks = pg.inner_text("#view")
        cek(f"#{m}: tanpa NaN/undefined", "NaN" not in teks and "undefined" not in teks, "")
        ada_empty = pg.eval_on_selector_all(".empty", "e=>e.length") > 0
        cek(f"#{m}: tampil empty state", ada_empty, "")

    # ── Ikon pencarian harus berukuran wajar ──
    pg.evaluate("location.hash='#/warung'")
    pg.wait_for_timeout(700)
    ikon = pg.evaluate(
        """()=>{const s=document.querySelector('.toolbar .search svg');
           if(!s) return null;const r=s.getBoundingClientRect();
           return {w:Math.round(r.width),h:Math.round(r.height)}}"""
    )
    cek("ikon pencarian berukuran wajar (<=24px)",
        ikon and ikon["w"] <= 24 and ikon["h"] <= 24, str(ikon))

    # ── Muat data contoh ──
    pg.evaluate("location.hash='#/dasbor'")
    pg.wait_for_timeout(700)
    pg.click("#muatContoh")
    pg.wait_for_timeout(1000)
    n2 = pg.evaluate("()=>({w:Store.all('warung').length,t:Store.all('transaksi').length})")
    cek("'Muat data contoh': data terisi", n2["w"] == 8 and n2["t"] > 0, str(n2))
    cek("'Muat data contoh': kartu statistik muncul",
        pg.eval_on_selector_all(".stat", "e=>e.length") >= 4, "")

    # ── Kosongkan lagi ──
    pg.click("#btnKosongkan")
    pg.wait_for_timeout(600)
    pg.click("[data-ya]")
    pg.wait_for_timeout(1000)
    n3 = pg.evaluate("()=>({w:Store.all('warung').length,t:Store.all('transaksi').length})")
    cek("'Hapus semua': data kosong lagi", n3 == {"w": 0, "t": 0}, str(n3))
    cek("'Hapus semua': kembali ke ajakan mulai",
        pg.eval_on_selector_all("#muatContoh", "e=>e.length") == 1, "")

    # ── Menu warung tak dikenal ──
    pg.goto(BASE + "menu.html?w=tidak-ada", wait_until="load")
    pg.wait_for_timeout(1000)
    teks = pg.inner_text("body").lower()
    cek("menu warung tak dikenal: pesan ramah",
        "tidak ditemukan" in teks or "belum" in teks, "")

    cek("tanpa error konsol", not errs, str(errs[:3]))
    ctx.close()
    b.close()

print("\n" + "=" * 62)
lulus = sum(1 for _, ok, _ in hasil if ok)
print(f"HASIL KOSONG: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(0 if lulus == len(hasil) else 1)
