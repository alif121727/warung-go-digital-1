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
6. Video "Cerita Bu Tini" tidak ikut berputar selama pembuka tampil, supaya
   tidak berebut bandwidth dan membuat pembuka tersendat di sambungan lambat.
7. Tanpa error console.

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
    # Kedua versi diblokir: pembuka.js mencoba HD, lalu versi ringan, dan
    # baru menyerah setelah keduanya gagal.
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")
    pg = ctx.new_page()
    pg.route("**/video/pembuka-hd.mp4", lambda route: route.abort())
    pg.route("**/video/pembuka.mp4", lambda route: route.abort())
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1600)
    r = pg.evaluate(
        "()=>document.documentElement.classList.contains('pembuka-aktif')"
    )
    cek("video gagal: lapisan otomatis dilewati", not r, str(r))
    ctx.close()

    # ── 7b. Versi HD dipilih menurut koneksi ─────────────────
    # Versi HD lebih tajam (SSIM 0,995 lawan 0,991) tetapi lebih berat.
    # Diukur pada 700 kb/s: versi ringan tersendat 2 kali, HD 5 kali. Jadi
    # HD hanya untuk koneksi lapang. Bila salah pilih, pengunjung lambat
    # yang menanggung akibatnya — karena itu perilakunya diuji.
    def sumber_terpilih(koneksi_js, blokir_hd=False):
        c = b.new_context(viewport={"width": 390, "height": 844},
                          service_workers="block")
        c.add_init_script(
            "Object.defineProperty(navigator,'connection',{configurable:true,"
            f"value:{koneksi_js}}});"
        )
        if blokir_hd:
            c.route("**/video/pembuka-hd.mp4", lambda r: r.abort())
        h = c.new_page()
        h.goto(LANDING, wait_until="load")
        h.wait_for_timeout(2200)
        nama = h.evaluate(
            """()=>{const v=document.getElementById('pembukaVideo');
                 return (v.currentSrc||v.src||'').split('/').pop();}"""
        )
        c.close()
        return nama

    kasus = [
        ("koneksi cepat -> HD",
         "{effectiveType:'4g',downlink:10,saveData:false}", False, "pembuka-hd.mp4"),
        ("koneksi sedang -> HD",
         "{effectiveType:'4g',downlink:2,saveData:false}", False, "pembuka-hd.mp4"),
        ("koneksi 3g -> versi ringan",
         "{effectiveType:'3g',downlink:0.8,saveData:false}", False, "pembuka.mp4"),
        ("koneksi 2g -> versi ringan",
         "{effectiveType:'2g',downlink:0.2,saveData:false}", False, "pembuka.mp4"),
        ("hemat data -> versi ringan",
         "{effectiveType:'4g',downlink:10,saveData:true}", False, "pembuka.mp4"),
        ("HD gagal -> cadangan versi ringan",
         "{effectiveType:'4g',downlink:10,saveData:false}", True, "pembuka.mp4"),
    ]
    for nama, koneksi, blokir, harap in kasus:
        dapat = sumber_terpilih(koneksi, blokir)
        cek(f"pilih video: {nama}", dapat == harap, f"{dapat} (harap {harap})")

    # Tanpa Network Information API: harus memilih yang ringan, sebab salah
    # pilih ke arah HD membuat video tersendat di koneksi tak dikenal.
    c = b.new_context(viewport={"width": 390, "height": 844},
                      service_workers="block")
    c.add_init_script(
        "Object.defineProperty(navigator,'connection',"
        "{configurable:true,value:undefined});")
    h = c.new_page()
    h.goto(LANDING, wait_until="load")
    h.wait_for_timeout(2200)
    dapat = h.evaluate(
        """()=>{const v=document.getElementById('pembukaVideo');
             return (v.currentSrc||v.src||'').split('/').pop();}"""
    )
    cek("pilih video: tanpa info koneksi -> versi ringan",
        dapat == "pembuka.mp4", dapat)
    c.close()

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

    # ── 9. Video cerita tidak berebut bandwidth dengan pembuka ─────
    # Enam video "Cerita Bu Tini" berada jauh di bawah layar, tetapi satu di
    # antaranya (adegan pertama) ikut diputar begitu halaman dimuat. Pada
    # sambungan 500-700 kb/s ia merebut bandwidth dengan video pembuka dan
    # membuat pembuka tersendat. Terukur: tanpa penjagaan ini, pada 700 kb/s
    # video pembuka berhenti 4 kali dalam 16 detik; dengan penjagaan, nol.
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block")
    pg = ctx.new_page()
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(2000)
    r = pg.evaluate(
        "()=>[...document.querySelectorAll('.cerita__video')].map(v=>v.paused)"
    )
    cek("saat pembuka tampil: semua video cerita dijeda", all(r), str(r))
    pg.click("#pembukaLewati")
    pg.wait_for_timeout(1500)
    r2 = pg.evaluate(
        """()=>{
             const v=document.querySelector('.cerita__video');
             return {aktif: v.classList.contains('aktif'), jeda: v.paused};
           }"""
    )
    cek("setelah Lewati: video cerita aktif kembali berjalan",
        r2["aktif"] and not r2["jeda"], str(r2))
    ctx.close()

    b.close()

lulus = sum(1 for _, ok, _ in hasil if ok)
print("\n" + "=" * 62)
print(f"HASIL PEMBUKA: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
sys.exit(1 if lulus != len(hasil) else 0)
