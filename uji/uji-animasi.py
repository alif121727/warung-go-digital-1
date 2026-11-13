"""Uji lapisan gerak `ax-` (bersama/animasi.css + bersama/animasi.js).

Lapisan gerak paling mudah rusak diam-diam: bila salah, halaman bisa jadi
kosong melompong (semua elemen tersembunyi) tanpa satu pun error muncul.
Karena itu yang dijaga di sini bukan "apakah ada animasi", melainkan:

1. Halaman tetap terbaca bila JavaScript dimatikan. Kelas `ax-reveal`
   sengaja tidak ditulis di HTML; kalau suatu saat ada yang menuliskannya,
   uji ini gagal — sebab tanpa JS tidak ada yang menambahkan `ax-in` dan
   seluruh halaman akan tak terlihat.
2. Tidak ada geser samping di segala ukuran layar. Gerak mendatar adalah
   sumber paling umum masalah ini, jadi diuji di banyak lebar.
3. "Kurangi gerak" benar-benar mematikan gerak dan tidak menyembunyikan
   apa pun. Pengguna yang memilih ini justru paling mudah dirugikan.
4. Tidak ada elemen yang dianimasikan dua kali. Beranda sudah punya
   animasi sendiri (kelas `reveal` dari app.js); lapisan ini harus
   melewatinya, bukan menimpanya.
5. Layar sentuh tidak mendapat gerak yang bergantung kursor.
6. Tanpa error console.

Jalankan: python3 uji/uji-animasi.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import re
from playwright.sync_api import sync_playwright

LANDING = "http://localhost:12000/warung-go-digital/"
HALAMAN = [
    ("beranda", LANDING),
    ("unduh", LANDING + "unduh.html"),
    ("privasi", LANDING + "privasi.html"),
]
UKURAN = [320, 360, 390, 430, 768, 1024, 1440, 1920]

hasil = []

# Tombol WhatsApp mengambang (`.fab`) memang sengaja tersembunyi sampai
# pengunjung melewati hero — itu perilaku app.js yang sudah ada sebelum
# lapisan ini, bukan akibat animasi. Dikecualikan agar uji ini mengukur
# hal yang benar.
HITUNG_TERSEMBUNYI = """()=>{
  let kosong=0;
  const daftar=[];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.textContent.trim()) continue;
    if (el.closest('.fab')) continue;
    const g=getComputedStyle(el);
    if (g.display==='none' || g.visibility==='hidden') continue;
    if (Number(g.opacity) < .05) { kosong++; daftar.push(el.className||el.tagName); }
  }
  return {kosong, daftar, teks: document.body.innerText.trim().length};
}"""


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    if not ok:
        print(f"GAGAL  {nama:56} {info}")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ── 1. Lapisan gerak aktif di tiap halaman ───────────────
    for nama, url in HALAMAN:
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(1400)

        r = pg.evaluate("""()=>({
          gaya: [...document.styleSheets].some(s =>
                  (s.href||'').includes('animasi.css')),
          skrip: typeof window.IntersectionObserver === 'function',
          bilah: !!document.querySelector('.ax-progress'),
          sorot: !!document.querySelector('.ax-spot'),
          reveal: document.querySelectorAll('.ax-reveal').length,
          stagger: document.querySelectorAll('.ax-stagger').length,
          garis: document.querySelectorAll('.ax-underline').length,
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth
        })""")
        cek(f"{nama}: gaya animasi.css termuat", r["gaya"])
        cek(f"{nama}: bilah kemajuan ada", r["bilah"])
        cek(f"{nama}: sorot kursor ada (desktop)", r["sorot"])
        cek(f"{nama}: ada elemen kemunculan", r["reveal"] > 0, r["reveal"])
        cek(f"{nama}: garis aksen judul ada", r["garis"] > 0, r["garis"])
        cek(f"{nama}: tanpa geser samping", r["sw"] <= r["iw"] + 1,
            f"{r['sw']}>{r['iw']}")
        cek(f"{nama}: tanpa error console", not errs, errs[:2])
        pg.close()

    # ── 2. Tanpa JavaScript halaman tetap terbaca ────────────
    # Ini uji paling penting: bila `ax-reveal` sampai tertulis di HTML,
    # halaman akan kosong tanpa JS karena `ax-in` tidak pernah dipasang.
    for nama, url in HALAMAN:
        ctx = b.new_context(viewport={"width": 1280, "height": 900},
                            java_script_enabled=False)
        pg = ctx.new_page()
        pg.goto(url, wait_until="load")
        # Sambutan hero adalah animasi CSS murni; tunggu sampai selesai
        # sebelum menilai. Menilai di tengah animasi akan salah membaca.
        pg.wait_for_timeout(2600)
        r = pg.evaluate("(kode)=>eval(kode)()", HITUNG_TERSEMBUNYI)
        cek(f"{nama} tanpa JS: tidak ada teks tersembunyi", r["kosong"] == 0,
            f"{r['kosong']} elemen {r['daftar'][:3]}")
        cek(f"{nama} tanpa JS: isi halaman ada", r["teks"] > 400, r["teks"])
        ctx.close()

    # ── 3. "Kurangi gerak": semua tampil, gerak mati ─────────
    for nama, url in HALAMAN:
        ctx = b.new_context(viewport={"width": 1280, "height": 900},
                            reduced_motion="reduce")
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(1500)
        r = pg.evaluate("""(kode)=>{
          const d = eval(kode)();
          return {
            bilah: !!document.querySelector('.ax-progress'),
            sorot: !!document.querySelector('.ax-spot'),
            kosong: d.kosong,
            daftar: d.daftar,
            teks: d.teks
          };
        }""", HITUNG_TERSEMBUNYI)
        cek(f"{nama} kurangi-gerak: tanpa teks tersembunyi", r["kosong"] == 0,
            f"{r['kosong']} elemen {r['daftar'][:3]}")
        cek(f"{nama} kurangi-gerak: bilah gulir disembunyikan", not r["bilah"])
        cek(f"{nama} kurangi-gerak: sorot kursor disembunyikan", not r["sorot"])
        cek(f"{nama} kurangi-gerak: isi tetap ada", r["teks"] > 400, r["teks"])
        cek(f"{nama} kurangi-gerak: tanpa error", not errs, errs[:2])
        ctx.close()

    # ── 4. Tidak ada animasi ganda dengan app.js ─────────────
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1400)
    r = pg.evaluate("""()=>{
      // Elemen yang dipegang app.js berkelas `reveal`. Lapisan ax- tidak
      // boleh menambahkan `ax-reveal` pada elemen itu atau isinya.
      const bertumpuk=[...document.querySelectorAll('.ax-reveal')]
        .filter(e => e.classList.contains('reveal') || e.closest('.reveal'));
      return {bertumpuk: bertumpuk.length};
    }""")
    cek("beranda: tidak ada elemen dianimasikan dua kali",
        r["bertumpuk"] == 0, r["bertumpuk"])
    pg.close()

    # ── 5. Gerak mendatar: geser paksa di banyak lebar ───────
    for nama, url in HALAMAN:
        for w in UKURAN:
            pg = b.new_page(viewport={"width": w, "height": 900},
                            is_mobile=w < 800, has_touch=w < 800)
            pg.goto(url, wait_until="load")
            pg.wait_for_timeout(700)
            r = pg.evaluate("""()=>({sw:document.documentElement.scrollWidth,
                                   iw:window.innerWidth})""")
            cek(f"{nama} {w}px tanpa geser samping", r["sw"] <= r["iw"] + 1,
                f"{r['sw']}>{r['iw']}")
            pg.evaluate("window.scrollTo(9000, 0)")
            pg.wait_for_timeout(90)
            sx = pg.evaluate("()=>window.scrollX")
            cek(f"{nama} {w}px tidak bisa digeser paksa", sx <= 1, f"scrollX={sx}")
            pg.close()

    # ── 6. Layar sentuh: tanpa gerak bergantung kursor ───────
    ctx = b.new_context(viewport={"width": 390, "height": 844},
                        is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1400)
    r = pg.evaluate("""()=>({
      sorot: !!document.querySelector('.ax-spot'),
      kemiringan: document.querySelectorAll('.ax-tilt').length,
      bilah: !!document.querySelector('.ax-progress'),
      reveal: document.querySelectorAll('.ax-reveal').length,
      sw: document.documentElement.scrollWidth, iw: window.innerWidth
    })""")
    cek("HP: sorot kursor tidak dipasang", not r["sorot"])
    cek("HP: kemiringan 3D tidak dipasang", r["kemiringan"] == 0, r["kemiringan"])
    cek("HP: bilah gulir tetap ada", r["bilah"])
    cek("HP: kemunculan tetap berjalan", r["reveal"] > 0, r["reveal"])
    cek("HP: tanpa geser samping", r["sw"] <= r["iw"] + 1, f"{r['sw']}>{r['iw']}")
    cek("HP: tanpa error", not errs, errs[:2])
    ctx.close()

    # ── 7. Kartu tidak kehilangan animasi sorotnya ───────────
    # Gerak reveal memakai translate/scale, bukan transform, supaya animasi
    # sorot bawaan kartu (yang memakai transform) tidak terhapus.
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1600)
    pg.evaluate("()=>document.querySelector('#maskot')?.scrollIntoView()")
    pg.wait_for_timeout(1200)
    kartu = pg.query_selector(".maskot__card")
    sebelum = kartu.evaluate("e=>getComputedStyle(e).transform")
    kartu.hover()
    pg.wait_for_timeout(700)
    sesudah = kartu.evaluate("e=>getComputedStyle(e).transform")
    cek("kartu: animasi sorot bawaan masih bekerja",
        sebelum != sesudah, f"{sebelum} -> {sesudah}")
    pg.close()

    # ── 7b. Tombol WhatsApp tetap tersembunyi di puncak halaman ─
    # Tombol itu disembunyikan dengan `transform: translateY(120%)` dan
    # muncul lewat kelas `.show` dari app.js. Animasi melayang apa pun yang
    # menulis `transform` akan mengalahkan aturan itu di kaskade, sehingga
    # tombol muncul terus sejak halaman dibuka. Karena itu uji ini ada.
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(2600)
    # Ukuran "tersembunyi" yang sah adalah opacity nol — bukan posisi
    # kotaknya. Tombol ini digeser turun sekaligus dibuat tembus pandang,
    # jadi tepinya masih bisa menyentuh layar walau tak terlihat sama sekali.
    r = pg.evaluate("""()=>{
      const f=document.getElementById('fab');
      const g=getComputedStyle(f);
      return {tampil:f.classList.contains('show'), opacity:g.opacity,
              transform:g.transform, translate:g.translate};
    }""")
    cek("puncak halaman: tombol WhatsApp belum tampil", not r["tampil"],
        r["tampil"])
    cek("puncak halaman: tombol WhatsApp tembus pandang",
        float(r["opacity"]) < .05, r["opacity"])
    # Geseran sembunyi harus tetap utuh: `translate` dari animasi melayang
    # tidak boleh menelan `transform: translateY(120%)` milik tombol.
    cek("puncak halaman: geseran sembunyi tidak tertimpa animasi",
        r["transform"] not in ("none", ""), r["transform"])
    # Setelah menggulir melewati hero, tombol harus muncul seperti biasa.
    pg.evaluate("()=>window.scrollTo(0, 2000)")
    pg.wait_for_timeout(900)
    r2 = pg.evaluate("""()=>{
      const f=document.getElementById('fab');
      return {tampil:f.classList.contains('show'),
              opacity:getComputedStyle(f).opacity};
    }""")
    cek("setelah digulir: tombol WhatsApp muncul", r2["tampil"], r2["tampil"])
    cek("setelah digulir: tombol WhatsApp terlihat", float(r2["opacity"]) > .9,
        r2["opacity"])
    pg.close()

    # ── 8. Bilah gulir benar-benar bergerak ──────────────────
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1200)
    awal = pg.evaluate("""()=>document.querySelector('.ax-progress')
                              .style.transform""")
    pg.evaluate("()=>window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(500)
    akhir = pg.evaluate("""()=>document.querySelector('.ax-progress')
                               .style.transform""")
    cek("bilah gulir bergerak saat halaman digulir", awal != akhir,
        f"{awal} -> {akhir}")
    pg.close()

    # ── 8b. Jaring pengaman: isi tetap terbaca bila pengamat mati ─
    # Inilah alasan jaring pengaman itu ada. Pengamat irisan dimatikan
    # sebelum halaman dimuat, meniru peramban atau keadaan yang tidak
    # mendukungnya. Seluruh isi halaman tetap harus bisa dibaca.
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    ctx.add_init_script("delete window.IntersectionObserver;")
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(LANDING + "unduh.html", wait_until="load")
    pg.wait_for_timeout(1500)
    # Pengamat tidak ada, jadi animasi.js harus langsung menampilkan semua.
    r = pg.evaluate("""()=>{
      const semua=[...document.querySelectorAll('.ax-reveal')];
      return {total:semua.length,
              terlihat:semua.filter(e=>e.classList.contains('ax-in')).length,
              teks:document.body.innerText.trim().length};
    }""")
    cek("tanpa pengamat: ada elemen kemunculan", r["total"] > 0, r["total"])
    cek("tanpa pengamat: semuanya langsung tampil",
        r["terlihat"] == r["total"], f"{r['terlihat']}/{r['total']}")
    cek("tanpa pengamat: isi halaman terbaca", r["teks"] > 400, r["teks"])
    cek("tanpa pengamat: tanpa error", not errs, errs[:2])
    ctx.close()

    # ── 8c. Jaring pengaman: pengamat rusak di tengah jalan ──
    # Pengamat ada tapi tidak pernah menyala (dimatikan setelah dipasang).
    # Halaman harus tetap terbaca saat digulir, bukan tinggal kosong.
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    ctx.add_init_script("""
      const Asli = window.IntersectionObserver;
      window.IntersectionObserver = class {
        constructor() {}
        observe() {}   // sengaja tidak pernah memanggil balik
        unobserve() {}
        disconnect() {}
      };
    """)
    pg = ctx.new_page()
    pg.goto(LANDING + "unduh.html", wait_until="load")
    pg.wait_for_timeout(1600)
    awal = pg.evaluate("""()=>({
      total:document.querySelectorAll('.ax-reveal').length,
      terlihat:document.querySelectorAll('.ax-reveal.ax-in').length})""")
    cek("pengamat rusak: awalnya belum semua tampil",
        awal["terlihat"] < awal["total"],
        f"{awal['terlihat']}/{awal['total']}")
    # Gulir ke bawah: jaring pengaman harus menampilkan yang terlihat layar.
    pg.evaluate("()=>window.scrollTo(0, 1400)")
    pg.wait_for_timeout(1300)
    akhir = pg.evaluate("""()=>{
      let kosong=0;
      for (const el of document.querySelectorAll('.ax-reveal')) {
        const r=el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0 &&
            !el.classList.contains('ax-in')) kosong++;
      }
      return {terlihatDiLayarTapiKosong:kosong};
    }""")
    cek("pengamat rusak: yang terlihat layar tetap tampil",
        akhir["terlihatDiLayarTapiKosong"] == 0,
        akhir["terlihatDiLayarTapiKosong"])
    ctx.close()

    # ── 9. Service worker mendaftarkan berkas animasi ────────
    pg = b.new_page()
    sw = pg.goto(LANDING + "sw.js").text()
    cek("sw.js memuat animasi.css", "'./bersama/animasi.css'" in sw)
    cek("sw.js memuat animasi.js", "'./bersama/animasi.js'" in sw)
    # Cukup pastikan versi sudah dinaikkan minimal ke angka saat berkas
    # animasi didaftarkan, bukan nomor persisnya.
    v = re.search(r"VERSI = 'wgd-v(\d+)'", sw)
    cek("sw.js versi cache minimal v13", bool(v) and int(v.group(1)) >= 13,
        v.group(0) if v else "tidak ditemukan")
    pg.close()

    b.close()

lulus = sum(1 for _, ok, _ in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 64)
print(f"HASIL ANIMASI: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
print("=" * 64)
if gagal:
    raise SystemExit(1)
