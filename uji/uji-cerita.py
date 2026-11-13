"""Uji bagian "Cerita Bu Tini" di halaman pertama.

Bagian ini mengganti cara penyajian isinya saat JavaScript hidup — gambar dan
teks dipindahkan ke panggung lengket. Pemindahan DOM adalah sumber kerusakan
yang paling senyap: bila salah, isinya bisa hilang tanpa satu pun error
muncul. Karena itu yang dijaga di sini:

1. Isi cerita tidak pernah bergantung pada JavaScript. Enam adegan, enam
   gambar, dan teksnya harus ada dan terlihat tanpa JS.
2. "Kurangi gerak" tidak mengurangi isi. Yang hilang hanya animasinya.
3. Panggung benar-benar lengket, dan adegan berganti tepat saat digulir.
4. Bongkar-pasang saat ukuran layar berubah tidak menyisakan penumpukan.
5. Tidak ada geser mendatar, tidak ada error konsol.
6. Berkas gambarnya benar-benar termuat (menangkap SVG yang rusak).

Jalankan: python3 uji/uji-cerita.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
from playwright.sync_api import sync_playwright

LANDING = "http://localhost:12000/warung-go-digital/"
JUMLAH = 6

hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, ok, info))
    if not ok:
        print(f"GAGAL  {nama:60} {info}")


UKUR = """()=>{
  const s=document.querySelector('#cerita');
  if(!s) return {ada:false};
  const artikel=[...s.querySelectorAll('.cerita__adegan')];
  const isi=[...s.querySelectorAll('.cerita__isi')];
  return {ada:true,
    panggung:s.classList.contains('cerita--panggung'),
    artikel:artikel.length,
    isi:isi.length,
    isiDalamArtikel:artikel.filter(a=>a.querySelector('.cerita__isi')).length,
    isiDiPanggung:s.querySelectorAll('.cerita__teks .cerita__isi').length,
    gambarDalamArtikel:s.querySelectorAll('.cerita__adegan img').length,
    gambarDiPanggung:s.querySelectorAll('.cerita__gambar img').length,
    nampak:isi.filter(e=>Number(getComputedStyle(e).opacity)>.5).length,
    judul:artikel.map(a=>{const h=a.querySelector('h3');return h?h.textContent.trim():'';}),
    titik:s.querySelectorAll('.cerita__titik').length,
    langkah:s.querySelectorAll('.cerita__langkah button').length,
    gambarRusak:[...s.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0)
                 .map(i=>i.getAttribute('src')),
    gambarBelum:[...s.querySelectorAll('img')].filter(i=>!i.complete).length};}"""


def utama():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/chromium",
                              args=["--no-sandbox"])

        # ── 1. Tanpa JavaScript: isi wajib utuh ───────────────────────
        ctx = b.new_context(viewport={"width": 1280, "height": 900},
                            java_script_enabled=False)
        pg = ctx.new_page()
        pg.goto(LANDING, wait_until="load")
        pg.wait_for_timeout(1000)
        r = pg.evaluate(UKUR)
        cek("tanpa JS: bagian cerita ada", r.get("ada"), r)
        cek(f"tanpa JS: {JUMLAH} adegan ada", r.get("artikel") == JUMLAH, r.get("artikel"))
        cek(f"tanpa JS: {JUMLAH} gambar ada", r.get("gambarDalamArtikel") == JUMLAH,
            r.get("gambarDalamArtikel"))
        cek("tanpa JS: semua adegan terlihat", r.get("nampak") == JUMLAH, r.get("nampak"))
        cek("tanpa JS: tanpa panggung", not r.get("panggung"), r.get("panggung"))
        cek("tanpa JS: tanpa penanda gulir", r.get("titik") == 0, r.get("titik"))
        teks = pg.evaluate("()=>document.querySelector('#cerita').innerText.trim().length")
        cek("tanpa JS: teks cerita cukup panjang", teks > 2000, teks)
        cek("tanpa JS: tiap adegan punya judul",
            all(j for j in r.get("judul", [])), r.get("judul"))
        ctx.close()

        # ── 2. Kurangi gerak: isi tetap utuh ──────────────────────────
        pg = b.new_page(viewport={"width": 1280, "height": 900})
        pg.emulate_media(reduced_motion="reduce")
        pg.goto(LANDING, wait_until="load")
        pg.wait_for_timeout(1200)
        r = pg.evaluate(UKUR)
        cek("kurangi gerak: tanpa panggung", not r.get("panggung"), r.get("panggung"))
        cek("kurangi gerak: semua adegan terlihat", r.get("nampak") == JUMLAH, r.get("nampak"))
        cek("kurangi gerak: tanpa penanda gulir", r.get("titik") == 0, r.get("titik"))
        cek("kurangi gerak: tanpa penunjuk langkah", r.get("langkah") == 0, r.get("langkah"))
        cek("kurangi gerak: gambar tetap ada",
            r.get("gambarDalamArtikel") == JUMLAH, r.get("gambarDalamArtikel"))
        pg.close()

        # ── 3. Desktop: panggung & pergantian adegan ──────────────────
        pg = b.new_page(viewport={"width": 1280, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(LANDING, wait_until="load")
        pg.wait_for_timeout(1500)
        r = pg.evaluate(UKUR)
        cek("desktop: panggung dipasang", r.get("panggung"), r.get("panggung"))
        cek("desktop: satu adegan tampil", r.get("nampak") == 1, r.get("nampak"))
        cek("desktop: gambar dipindah ke panggung",
            r.get("gambarDiPanggung") == JUMLAH and r.get("gambarDalamArtikel") == 0, r)
        cek("desktop: teks dipindah ke panggung",
            r.get("isiDiPanggung") == JUMLAH and r.get("isiDalamArtikel") == 0, r)
        cek("desktop: penanda gulir sejumlah adegan", r.get("titik") == JUMLAH, r.get("titik"))
        cek("desktop: penunjuk langkah sejumlah adegan", r.get("langkah") == JUMLAH, r.get("langkah"))
        cek("desktop: gambar ilustrasi termuat", not r.get("gambarRusak"), r.get("gambarRusak"))
        cek("desktop: tidak ada error konsol", not errs, errs[:2])

        # Gulir instan supaya pengukuran tidak tertipu `scroll-behavior: smooth`.
        pg.add_style_tag(content="html{scroll-behavior:auto !important;}")
        benar = True
        for i in range(JUMLAH):
            pg.evaluate("""(i)=>{const t=document.querySelectorAll('.cerita__titik')[i];
                const r=t.getBoundingClientRect();
                window.scrollTo(0, window.scrollY + r.top + r.height/2 - window.innerHeight/2);}""", i)
            pg.wait_for_timeout(700)
            r = pg.evaluate("""()=>{
              const s=document.querySelector('#cerita');
              return {aktif:[...s.querySelectorAll('.cerita__isi')]
                        .findIndex(e=>e.classList.contains('aktif')),
                      nampak:[...s.querySelectorAll('.cerita__isi')]
                        .filter(e=>Number(getComputedStyle(e).opacity)>.5).length,
                      gambarAktif:[...s.querySelectorAll('.cerita__gambar img')]
                        .filter(e=>e.classList.contains('aktif')).length,
                      aria:s.querySelectorAll('.cerita__langkah button[aria-current="true"]').length};}""")
            if not (r["aktif"] == i and r["nampak"] == 1
                    and r["gambarAktif"] == 1 and r["aria"] == 1):
                benar = False
                cek(f"desktop: titik {i} menampilkan adegan {i}", False, r)
        cek("desktop: adegan berganti tepat mengikuti gulir", benar)

        # Panggung benar-benar menempel di layar saat adegan berganti.
        pg.evaluate("""()=>{const t=document.querySelectorAll('.cerita__titik')[3];
            const r=t.getBoundingClientRect();
            window.scrollTo(0, window.scrollY + r.top + r.height/2 - window.innerHeight/2);}""")
        pg.wait_for_timeout(700)
        r = pg.evaluate("""()=>{const p=document.querySelector('.cerita__panggung');
            const r=p.getBoundingClientRect();
            return {pos:getComputedStyle(p).position,
                    diLayar:r.top<window.innerHeight&&r.bottom>0,
                    atas:Math.round(r.top)};}""")
        cek("desktop: panggung memakai position sticky", r["pos"] == "sticky", r["pos"])
        cek("desktop: panggung terlihat di layar", r["diLayar"], r)

        # Penunjuk langkah benar-benar melompat ke adegan yang dituju.
        pg.evaluate("()=>document.querySelector('#cerita').scrollIntoView({block:'start'})")
        pg.wait_for_timeout(700)
        pg.click(".cerita__langkah button:nth-child(5)")
        pg.wait_for_timeout(1800)
        aktif = pg.evaluate("""()=>[...document.querySelectorAll('.cerita__isi')]
            .findIndex(e=>e.classList.contains('aktif'))""")
        cek("desktop: klik penunjuk melompat ke adegan 5", aktif == 4, aktif)

        # ── 4. Bongkar-pasang saat ukuran layar berubah ───────────────
        pg.set_viewport_size({"width": 420, "height": 800})
        pg.wait_for_timeout(900)
        r = pg.evaluate(UKUR)
        cek("layar sempit: kembali ke daftar", not r.get("panggung"), r.get("panggung"))
        cek("layar sempit: semua adegan terlihat", r.get("nampak") == JUMLAH, r.get("nampak"))
        cek("layar sempit: isi kembali ke artikel",
            r.get("isiDalamArtikel") == JUMLAH and r.get("gambarDalamArtikel") == JUMLAH, r)

        for _ in range(3):
            pg.set_viewport_size({"width": 1280, "height": 900})
            pg.wait_for_timeout(400)
            pg.set_viewport_size({"width": 420, "height": 800})
            pg.wait_for_timeout(400)
        pg.set_viewport_size({"width": 1280, "height": 900})
        pg.wait_for_timeout(900)
        r = pg.evaluate(UKUR)
        cek("bolak-balik: panggung pulih utuh",
            r.get("panggung") and r.get("isiDiPanggung") == JUMLAH
            and r.get("gambarDiPanggung") == JUMLAH, r)
        cek("bolak-balik: tanpa adegan berganda", r.get("artikel") == JUMLAH, r.get("artikel"))
        cek("bolak-balik: tanpa penanda berganda", r.get("titik") == JUMLAH, r.get("titik"))
        cek("bolak-balik: tanpa error", not errs, errs[:2])

        # ── 5. Tanpa geser mendatar ───────────────────────────────────
        for w in [390, 430, 768, 900, 1024, 1440, 1920]:
            pg.set_viewport_size({"width": w, "height": 820})
            pg.wait_for_timeout(500)
            luber = pg.evaluate(
                "()=>document.documentElement.scrollWidth>window.innerWidth+1")
            cek(f"cerita {w}px: tanpa geser mendatar", not luber, luber)
        pg.close()

        b.close()


utama()

lulus = sum(1 for _, ok, _ in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 64)
print(f"HASIL CERITA: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
print("=" * 64)
if gagal:
    raise SystemExit(1)
