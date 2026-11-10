"""Uji dukungan HP: overflow, target sentuh, zoom iOS, tabel, modal, navigasi menu.

Jalankan: python3 uji/uji-hp.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import sys
from playwright.sync_api import sync_playwright

LANDING = "http://localhost:12000/warung-go-digital/"
APP = "http://localhost:12000/warung-go-digital/app/"
MENU = APP + "menu.html?w=wr-001"

UKURAN = [
    ("SE 320", {"width": 320, "height": 568}),
    ("Galaxy 360", {"width": 360, "height": 740}),
    ("iPhone 14 390", {"width": 390, "height": 844}),
    ("HP besar 430", {"width": 430, "height": 932}),
    ("tablet 768", {"width": 768, "height": 1024}),
]
MODUL = ["dasbor", "warung", "transaksi", "rating", "katalog", "promosi", "foto", "laporan"]

hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    if not ok:
        print(f"GAGAL  {nama:46} {info}")


def periksa_halaman(pg, label):
    """Overflow, target sentuh, dan input pemicu zoom pada halaman yang sedang terbuka."""
    r = pg.evaluate(
        """()=>{
          const kecil=[];
          document.querySelectorAll('button,a,input:not([type=file]),select').forEach(e=>{
            const b=e.getBoundingClientRect();
            if(b.width===0||b.height===0||e.offsetParent===null) return;
            if(b.height<40) kecil.push((e.textContent||'').trim().slice(0,20)||e.tagName);
          });
          const zoom=[];
          document.querySelectorAll('input:not([type=file]),select,textarea').forEach(e=>{
            const b=e.getBoundingClientRect();
            if(b.width===0||b.height===0) return;
            if(parseFloat(getComputedStyle(e).fontSize)<16) zoom.push(e.id||e.className);
          });
          return {sw:document.documentElement.scrollWidth, iw:window.innerWidth, kecil, zoom};
        }"""
    )
    cek(f"{label} tanpa overflow", r["sw"] <= r["iw"] + 1, f"{r['sw']}>{r['iw']}")
    cek(f"{label} target sentuh >=40px", not r["kecil"], str(r["kecil"][:3]))
    cek(f"{label} input tidak memicu zoom", not r["zoom"], str(r["zoom"][:3]))


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    for nama, vp in UKURAN:
        ctx = b.new_context(viewport=vp, is_mobile=True, has_touch=True)
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

        # ── Landing ──
        pg.goto(LANDING, wait_until="load")
        pg.wait_for_timeout(900)
        periksa_halaman(pg, f"{nama} landing")
        pg.tap("#burger")
        pg.wait_for_timeout(400)
        cek(f"{nama} menu burger terbuka",
            pg.evaluate("()=>getComputedStyle(document.querySelector('.menu-panel')).display") == "flex")
        pg.tap("#burger")
        pg.wait_for_timeout(250)

        # ── Panel Mitra: tiap modul ──
        for m in MODUL:
            pg.goto(APP, wait_until="load")
            pg.wait_for_timeout(300)
            pg.evaluate(f"location.hash='#/{m}'")
            pg.wait_for_timeout(650)
            periksa_halaman(pg, f"{nama} #{m}")
            # Di ponsel (<=620px) tabel berubah jadi kartu: tidak boleh ada geser
            # samping. Di tablet, tabel boleh digeser di dalam wadahnya sendiri.
            r = pg.evaluate(
                """()=>{const t=document.querySelector('table.tbl');
                   const tw=document.querySelector('.tablewrap');
                   if(!t||!tw) return {ada:false};
                   return {ada:true, geser:tw.scrollWidth > tw.clientWidth+2,
                           kartu:getComputedStyle(t).display==='block',
                           wadahBisaGeser:getComputedStyle(tw).overflowX!=='visible'};}"""
            )
            if not r["ada"]:
                pass  # modul ini tidak memakai tabel
            elif vp["width"] <= 620:
                cek(f"{nama} #{m} tabel jadi kartu tanpa geser",
                    r["kartu"] and not r["geser"], str(r))
            else:
                cek(f"{nama} #{m} tabel aman (kartu atau bisa digeser)",
                    r["kartu"] or r["wadahBisaGeser"], str(r))

        # ── Navigasi lewat menu geser (satu-satunya cara di HP) ──
        pg.goto(APP, wait_until="load")
        pg.wait_for_timeout(700)
        pg.tap("#burger")
        pg.wait_for_timeout(450)
        pg.tap('[data-go="transaksi"]')
        pg.wait_for_timeout(700)
        cek(f"{nama} navigasi menu geser",
            pg.evaluate("()=>location.hash") == "#/transaksi")

        # ── Modal catat transaksi ──
        pg.tap("#catat")
        pg.wait_for_timeout(800)
        r = pg.evaluate(
            """()=>{const m=document.querySelector('.modal__box');
               if(!m) return {ada:false};
               const b=m.getBoundingClientRect();
               const inp=[...m.querySelectorAll('input,select,textarea')];
               return {ada:true, bawah:Math.round(b.bottom), winH:window.innerHeight,
                       lebar:Math.round(b.width),
                       kecil:inp.filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).length};}"""
        )
        cek(f"{nama} modal terbuka", r["ada"])
        if r["ada"]:
            cek(f"{nama} modal dalam layar", r["bawah"] <= r["winH"] + 1, f"{r['bawah']}>{r['winH']}")
            cek(f"{nama} modal tidak meluber", r["lebar"] <= vp["width"] + 1, str(r["lebar"]))
            cek(f"{nama} input modal 16px", r["kecil"] == 0, str(r["kecil"]))

        cek(f"{nama} tanpa error konsol", not errs, str(errs[:2]))
        ctx.close()

    # ── Halaman menu publik (tujuan pemindaian QR) ──
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.goto(MENU, wait_until="load")
    pg.wait_for_timeout(900)
    periksa_halaman(pg, "menu publik")
    cek("menu publik item tampil", pg.eval_on_selector_all(".item", "e=>e.length") >= 4)
    r = pg.evaluate(
        """()=>{const w=document.querySelector('.wafloat').getBoundingClientRect();
           return {bawah:Math.round(w.bottom), winH:window.innerHeight};}"""
    )
    cek("menu publik tombol WA dalam layar", r["bawah"] <= r["winH"] + 1, f"{r['bawah']}>{r['winH']}")
    ctx.close()
    b.close()

print("\n" + "=" * 62)
lulus = sum(1 for _, ok, _ in hasil if ok)
print(f"HASIL HP: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(0 if lulus == len(hasil) else 1)
