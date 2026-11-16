"""Uji video pembuka (intro) beranda — `bersama/pembuka.js` + `pembuka.css`.

Pembuka adalah lapisan penutup layar, jadi kesalahan kecil bisa berakibat
fatal: beranda tertutup selamanya. Yang dijaga di sini:

1. Lapisan muncul di kunjungan pertama, memutar video 1280x720, dan tidak
   membuat geser samping di lebar layar mana pun.
2. Tombol "Lewati" ada di KANAN BAWAH, cukup besar untuk jari (>= 44px).
3. Menekan "Lewati" (atau Esc) benar-benar menutup lapisan, dan penanda
   sesi membuatnya tidak muncul lagi pada muat ulang di sesi yang sama.
4. Tanpa JavaScript, atau saat "kurangi gerak", lapisan TIDAK pernah tampil —
   isi beranda tetap terbaca. Ini yang paling penting: beranda tidak boleh
   bergantung pada skrip untuk bisa dilihat.
5. Video gagal dimuat (berkas hilang) -> lapisan otomatis dilewati.
6. Tanpa error console.

Jalankan: python3 uji/uji-pembuka.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import sys
from playwright.sync_api import sync_playwright

LANDING = "http://localhost:12000/warung-go-digital/"
VIDEO = LANDING + "video/pembuka.mp4"
UKURAN = [320, 390, 768, 1440]

hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:52} {info}")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ── 1. Muncul dan memutar video HD, tanpa geser samping ──
    for w in UKURAN:
        ctx = b.new_context(viewport={"width": w, "height": 900}, service_workers="block")
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(LANDING, wait_until="load")
        pg.wait_for_timeout(1500)
        r = pg.evaluate(
            """()=>{
              const s=document.getElementById('pembuka');
              const v=document.getElementById('pembukaVideo');
              const b=document.getElementById('pembukaLewati');
              const k=b.getBoundingClientRect();
              return {
                aktif: document.documentElement.classList.contains('pembuka-aktif'),
                tampil: getComputedStyle(s).display!=='none',
                tinggiLapisan: Math.round(s.getBoundingClientRect().height),
                vw: v.videoWidth, vh: v.videoHeight,
                berputar: !v.paused,
                kanan: Math.round(window.innerWidth-k.right),
                bawah: Math.round(window.innerHeight-k.bottom),
                tinggiTombol: Math.round(k.height),
                sw: document.documentElement.scrollWidth,
                iw: window.innerWidth,
              };
            }"""
        )
        cek(f"{w}px: lapisan pembuka tampil", r["aktif"] and r["tampil"], str(r["tampil"]))
        cek(f"{w}px: tanpa geser samping", r["sw"] <= r["iw"] + 1, f"{r['sw']}>{r['iw']}")
        if w == 1440:
            cek("video pembuka HD (1280x720)",
                r["vw"] == 1280 and r["vh"] == 720, f"{r['vw']}x{r['vh']}")
            cek("video benar-benar berputar", r["berputar"], r["berputar"])
            cek("lapisan menutupi seluruh layar", r["tinggiLapisan"] >= 880,
                r["tinggiLapisan"])
            cek("tombol Lewati di kanan", r["kanan"] < r["iw"] / 2, r["kanan"])
            cek("tombol Lewati di bawah", r["bawah"] < 120, r["bawah"])
            cek("tombol Lewati cukup besar", r["tinggiTombol"] >= 44, r["tinggiTombol"])
            cek("tanpa error console", not errs, str(errs[:3]))
        ctx.close()

    # ── 2. Berkas video dan poster benar-benar tersedia ──────
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(400)
    ada = pg.evaluate(
        """async()=>{
          const cek=async(u)=>{try{const r=await fetch(u);return r.status}catch(e){return 0}};
          return {mp4: await cek('video/pembuka.mp4'),
                  jpg: await cek('video/pembuka.jpg')};
        }"""
    )
    cek("berkas video pembuka tersedia", ada["mp4"] == 200, str(ada["mp4"]))
    cek("poster pembuka tersedia", ada["jpg"] == 200, str(ada["jpg"]))
    pg.close()

    # ── 3. "Lewati" menutup lapisan, dan menetap untuk sesi ───
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1200)
    pg.click("#pembukaLewati")
    pg.wait_for_timeout(1000)
    r = pg.evaluate(
        """()=>({
             aktif: document.documentElement.classList.contains('pembuka-aktif'),
             display: getComputedStyle(document.getElementById('pembuka')).display,
             penanda: sessionStorage.getItem('wgd-pembuka'),
             fab: document.getElementById('fab').classList.contains('show'),
           })"""
    )
    cek("setelah Lewati: lapisan hilang", not r["aktif"] and r["display"] == "none",
        str(r))
    cek("setelah Lewati: penanda sesi tersimpan", r["penanda"] == "1", str(r["penanda"]))
    cek("setelah Lewati: tanpa error", not errs, str(errs[:3]))

    pg.reload(wait_until="load")
    pg.wait_for_timeout(700)
    lagi = pg.evaluate(
        "()=>document.documentElement.classList.contains('pembuka-aktif')"
    )
    cek("muat ulang di sesi sama: lapisan tidak muncul lagi", not lagi, str(lagi))
    ctx.close()

    # ── 4. Esc juga menutup ──────────────────────────────────
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")
    pg = ctx.new_page()
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1000)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(900)
    r = pg.evaluate(
        "()=>document.documentElement.classList.contains('pembuka-aktif')"
    )
    cek("tombol Esc menutup lapisan", not r, str(r))
    ctx.close()

    # ── 5. Tanpa JavaScript: beranda tetap terbaca, tanpa lapisan ─
    ctx = b.new_context(viewport={"width": 1280, "height": 900},
                        service_workers="block", java_script_enabled=False)
    pg = ctx.new_page()
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate(
        """()=>({
             tampil: getComputedStyle(document.getElementById('pembuka')).display!=='none',
             teks: document.body.innerText.trim().length,
           })"""
    )
    cek("tanpa JS: lapisan tidak tampil", not r["tampil"], str(r["tampil"]))
    cek("tanpa JS: isi beranda tetap ada", r["teks"] > 400, r["teks"])
    ctx.close()

    # ── 6. "Kurangi gerak": lapisan tidak tampil ─────────────
    ctx = b.new_context(viewport={"width": 1280, "height": 900},
                        service_workers="block", reduced_motion="reduce")
    pg = ctx.new_page()
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate(
        """()=>({
             aktif: document.documentElement.classList.contains('pembuka-aktif'),
             tampil: getComputedStyle(document.getElementById('pembuka')).display!=='none',
             teks: document.body.innerText.trim().length,
           })"""
    )
    cek("kurangi gerak: lapisan tidak tampil", not r["tampil"], str(r))
    cek("kurangi gerak: isi beranda tetap ada", r["teks"] > 400, r["teks"])
    ctx.close()

    # ── 7. Video gagal dimuat -> lapisan otomatis dilewati ────
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")
    pg = ctx.new_page()
    pg.route("**/video/pembuka.mp4", lambda route: route.abort())
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1600)
    r = pg.evaluate(
        "()=>document.documentElement.classList.contains('pembuka-aktif')"
    )
    cek("video gagal: lapisan otomatis dilewati", not r, str(r))
    ctx.close()

    # ── 8. Skrip pembuka gagal dimuat -> jaring pengaman melepas lapisan ─
    # Ini yang paling berbahaya: kelas `pembuka-aktif` sudah dipasang skrip
    # <head>, tetapi `pembuka.js` tidak pernah jalan, sehingga tidak ada yang
    # melepasnya. Jaring pengaman 3 detik harus menyelamatkan beranda.
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")
    pg = ctx.new_page()
    pg.route("**/bersama/pembuka.js", lambda route: route.abort())
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1000)
    r = pg.evaluate(
        """()=>({
             aktif: document.documentElement.classList.contains('pembuka-aktif'),
             tampil: getComputedStyle(document.getElementById('pembuka')).display!=='none',
           })"""
    )
    cek("skrip gagal: lapisan sempat tampil", r["tampil"], str(r))
    pg.wait_for_timeout(3000)
    r2 = pg.evaluate(
        "()=>document.documentElement.classList.contains('pembuka-aktif')"
    )
    cek("skrip gagal: jaring pengaman melepas lapisan", not r2, str(r2))
    ctx.close()

    b.close()

lulus = sum(1 for _, ok, _ in hasil if ok)
print("\n" + "=" * 62)
print(f"HASIL PEMBUKA: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(1 if lulus != len(hasil) else 0)
