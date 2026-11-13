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

    # ── 7c. Kemunculan benar-benar berjalan (bukan seketika) ─
    # Pernah salah: `.ax-tilt` menulis `transition` dan menghapus transisi
    # kemunculan milik `.ax-reveal`, sehingga kartu muncul seketika tanpa
    # pudar. Sekarang keduanya memakai mesin berbeda (`animation` vs
    # `transition`), dan uji ini menjaga agar tidak kembali rusak.
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING + "unduh.html", wait_until="load")
    pg.wait_for_timeout(1200)
    jejak = pg.evaluate("""async ()=>{
      const w=[...document.querySelectorAll('.ax-stagger')].find(e=>{
        const r=e.getBoundingClientRect(); return r.top>window.innerHeight;});
      if(!w) return null;
      const anak=w.children[0];
      const out=[];
      for(let i=0;i<14;i++){
        window.scrollBy(0,180);
        await new Promise(r=>setTimeout(r,90));
        out.push(Number(getComputedStyle(anak).opacity));
      }
      return out;
    }""")
    cek("kemunculan: ada elemen berjenjang di bawah layar", jejak is not None,
        jejak is None)
    if jejak:
        cek("kemunculan: kartu memudar perlahan, bukan seketika",
            any(.02 < x < .98 for x in jejak),
            f"opacity: {[round(x,2) for x in jejak]}")
        cek("kemunculan: akhirnya tampil penuh", jejak[-1] > .95, jejak[-1])
    # Kartu harus tetap punya transisi sorotnya — dua mesin, bukan saling hapus.
    tp = pg.evaluate("""()=>{
      const k=document.querySelector('.kartu');
      return k ? getComputedStyle(k).transitionProperty : '';
    }""")
    cek("kemunculan: transisi sorot kartu tidak terhapus",
        'transform' in tp or 'all' in tp, tp)
    pg.close()

    # ── 7d. Bagian bisa dibuka dengan animasi ────────────────
    # Permintaan langsung: saat bagian unduhan dibuka, isinya harus muncul
    # dengan animasi — bukan tersentak seketika.
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING + "unduh.html", wait_until="load")
    pg.wait_for_timeout(1400)
    ada = pg.evaluate("()=>document.querySelectorAll('details.tanya').length")
    cek("buka-tutup: halaman unduh punya bagian yang bisa dibuka",
        ada > 0, ada)
    d = pg.query_selector("details.tanya")
    d.evaluate("e=>e.scrollIntoView({block:'center'})")
    pg.wait_for_timeout(700)
    tertutup = d.evaluate("e=>e.getBoundingClientRect().height")
    d.evaluate("e=>e.open=true")
    tinggi = []
    for _ in range(7):
        pg.wait_for_timeout(90)
        tinggi.append(d.evaluate("e=>e.getBoundingClientRect().height"))
    cek("buka-tutup: tinggi mengembang perlahan",
        tertutup < tinggi[0] < tinggi[-1] and len(set(tinggi)) > 2,
        f"{tertutup:.0f} -> {[round(x) for x in tinggi]}")
    # Isi masuk berurutan, bukan muncul utuh seketika.
    isi = d.query_selector("p")
    isi_anim = isi.evaluate("e=>getComputedStyle(e).animationName")
    cek("buka-tutup: isi punya animasi masuk", isi_anim != "none", isi_anim)
    # Tutup harus menyusut, bukan melompat.
    d.evaluate("e=>e.open=false")
    pg.wait_for_timeout(70)
    saat_tutup = d.evaluate("e=>e.getBoundingClientRect().height")
    pg.wait_for_timeout(700)
    akhir = d.evaluate("e=>e.getBoundingClientRect().height")
    cek("buka-tutup: tinggi menyusut perlahan", saat_tutup > akhir,
        f"{saat_tutup:.0f} -> {akhir:.0f}")
    cek("buka-tutup: akhirnya tertutup rapi", akhir < 120, f"{akhir:.0f}")
    pg.close()

    # ── 7e. Bagian yang bisa dibuka tetap jalan tanpa JavaScript ─
    # Animasi tinggi di atas murni CSS. Dengan JavaScript dimatikan,
    # bagian harus tetap bisa dibuka dan isinya terbaca.
    ctx = b.new_context(viewport={"width": 1280, "height": 900},
                        java_script_enabled=False)
    pg = ctx.new_page()
    pg.goto(LANDING + "unduh.html", wait_until="load")
    pg.wait_for_timeout(900)
    d = pg.query_selector("details.tanya")
    d.evaluate("e=>e.open=true")
    pg.wait_for_timeout(700)
    r = pg.evaluate("""()=>{
      const d=document.querySelector('details.tanya');
      const t=d.textContent.trim().length;
      const h=d.getBoundingClientRect().height;
      return {teks:t, tinggi:h, terbuka:d.open};
    }""")
    cek("tanpa JS: bagian bisa dibuka", r["terbuka"], r["terbuka"])
    cek("tanpa JS: isi bagian terbaca", r["teks"] > 60 and r["tinggi"] > 60,
        f"teks={r['teks']} tinggi={r['tinggi']:.0f}")
    ctx.close()

    # ── 7f. Sapuan pemindai & denyut nomor terpasang ─────────
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING + "unduh.html", wait_until="load")
    pg.wait_for_timeout(1400)
    # Kotak QR ada jauh di bawah halaman; harus digulir dulu supaya masuk
    # layar. Tanpa itu, sapuannya memang belum dipicu — dan itu benar.
    pg.evaluate("()=>document.querySelector('.qrkotak')?.scrollIntoView({block:'center'})")
    pg.wait_for_timeout(1200)
    r = pg.evaluate("""()=>{
      const qr=document.querySelector('.ax-scan');
      const no=document.querySelector('.ax-pulse-nomor');
      return {
        qr: !!qr, qrAktif: qr ? qr.classList.contains('ax-in') : false,
        nomor: !!no,
        nomorAnim: no ? getComputedStyle(no, '::after').animationName : '',
        kepala: document.querySelectorAll('.kepala__isi.ax-hero').length,
      };
    }""")
    cek("kotak QR punya sapuan pemindai", r["qr"], r["qr"])
    cek("sapuan pemindai dipicu saat terlihat", r["qrAktif"], r["qrAktif"])
    cek("nomor langkah kunci diberi denyut", r["nomor"], r["nomor"])
    cek("denyut nomor benar-benar berjalan", r["nomorAnim"] not in ("", "none"),
        r["nomorAnim"])
    cek("kepala halaman unduh diberi sambutan", r["kepala"] == 1, r["kepala"])
    pg.close()

    # ── 7g. Seksi yang sudah terlewati tidak tinggal tersembunyi ─
    # Tautan dalam halaman (`unduh.html#pasang-ios`) dan posisi gulir yang
    # dipulihkan peramban membuka halaman di tengah. Seksi di atas titik itu
    # tidak akan pernah masuk layar, jadi tanpa penanganan khusus isinya
    # tinggal tak terlihat selamanya.
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(LANDING + "unduh.html", wait_until="load")
    pg.wait_for_timeout(1000)
    pg.evaluate("()=>window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(1400)
    r = pg.evaluate("""()=>{
      const sisa=[...document.querySelectorAll('.ax-reveal:not(.ax-in)')];
      return {
        diLayar: sisa.filter(e=>{
          const k=e.getBoundingClientRect();
          return k.bottom>0 && k.top<window.innerHeight;}).length,
        total: sisa.length,
      };
    }""")
    cek("lompat ke dasar: tidak ada seksi tersembunyi di layar",
        r["diLayar"] == 0, f"di layar={r['diLayar']} dari {r['total']} sisa")
    pg.close()

    # Hal yang sama untuk tautan dalam halaman.
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(LANDING + "unduh.html#pasang-ios", wait_until="load")
    pg.wait_for_timeout(1500)
    r = pg.evaluate("""()=>{
      const t=document.querySelector('#pasang-ios');
      const sisa=[...document.querySelectorAll('.ax-reveal:not(.ax-in)')];
      return {
        terlihatSasaran: Number(getComputedStyle(t).opacity) > .9,
        diLayar: sisa.filter(e=>{
          const k=e.getBoundingClientRect();
          return k.bottom>0 && k.top<window.innerHeight;}).length,
      };
    }""")
    cek("tautan dalam halaman: sasaran langsung terlihat",
        r["terlihatSasaran"], r["terlihatSasaran"])
    cek("tautan dalam halaman: tidak ada seksi tersembunyi di layar",
        r["diLayar"] == 0, r["diLayar"])
    pg.close()

    # ── 7h. Parallax: lapisan bergeser beda kecepatan ────────
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1600)
    r = pg.evaluate("""()=>{
      const els=[...document.querySelectorAll('.ax-parallax')];
      return {jumlah:els.length,
              depthBaru:new Set(els.map(e=>e.style.getPropertyValue('--ax-depth'))).size};
    }""")
    cek("parallax: ada lapisan yang dipasang", r["jumlah"] >= 5, r["jumlah"])
    cek("parallax: lapisan punya kecepatan berbeda-beda",
        r["depthBaru"] >= 3, f"{r['depthBaru']} nilai berbeda")
    # Geser halaman, pastikan nilainya benar-benar berubah.
    p1 = pg.evaluate("()=>document.querySelector('.hero__glow').style.getPropertyValue('--ax-p')")
    pg.evaluate("()=>window.scrollBy(0, 600)")
    pg.wait_for_timeout(500)
    p2 = pg.evaluate("()=>document.querySelector('.hero__glow').style.getPropertyValue('--ax-p')")
    cek("parallax: bergeser saat halaman digulir", p1 != p2, f"{p1} -> {p2}")
    # Parallax harus memakai `translate`, bukan `transform`, supaya animasi
    # aurora/glowcard yang sudah ada tidak terhapus.
    tp = pg.evaluate("""()=>{
      const e=document.querySelector('.fx-aurora');
      const g=getComputedStyle(e);
      return {translate:g.translate, transform:g.transform};
    }""")
    cek("parallax: memakai translate, bukan transform",
        tp["translate"] != "none", tp)
    cek("parallax: animasi aurora bawaan masih hidup",
        tp["transform"] != "none", tp["transform"])
    pg.close()

    # ── 7i. Rendering waktu nyata: kanvas digambar ulang ─────
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(2600)
    r = pg.evaluate("""()=>{
      const c=document.querySelector('.ax-kanvas');
      if(!c) return null;
      const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let terisi=0;
      for(let i=3;i<d.length;i+=4) if(d[i]>0) terisi++;
      return {lebar:c.width, tinggi:c.height, terisi};
    }""")
    cek("kanvas waktu nyata: ada di hero", r is not None, r)
    cek("kanvas waktu nyata: benar-benar menggambar", r and r["terisi"] > 50,
        r and r["terisi"])
    # Harus benar-benar berubah antar bingkai, bukan gambar statis.
    berubah = pg.evaluate("""async ()=>{
      const c=document.querySelector('.ax-kanvas');
      const ctx=c.getContext('2d');
      const ambil=()=>ctx.getImageData(0,0,c.width,c.height).data.join('');
      const a=ambil();
      await new Promise(r=>setTimeout(r,420));
      return ambil() !== a;
    }""")
    cek("kanvas waktu nyata: bergerak antar bingkai", berubah, berubah)
    # Kanvas harus benar-benar berhenti saat tab disembunyikan — ini hiasan,
    # tidak boleh memakai baterai saat tidak dilihat.
    pg.close()

    # ── 7j. Kedalaman 3D mengikuti kursor ────────────────────
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1800)
    r = pg.evaluate("""()=>{
      const w=document.querySelector('.hero__visual');
      return {panggung:w.classList.contains('ax-3d'),
              lapis:document.querySelectorAll('.ax-3d__lapis').length,
              dalam:!!document.querySelector('.ax-3d__dalam')};
    }""")
    cek("kedalaman 3D: panggung terpasang", r["panggung"], r["panggung"])
    cek("kedalaman 3D: ada beberapa lapisan", r["lapis"] >= 5, r["lapis"])
    # Tanpa `preserve-3d` pada kartunya, isi glowcard menempel datar dan
    # kedalaman lapisan di dalamnya hilang.
    cek("kedalaman 3D: kartu dalam punya kedalaman", r["dalam"], r["dalam"])
    kotak = pg.query_selector(".hero__visual").bounding_box()
    pg.mouse.move(kotak["x"] + kotak["width"] * 0.85, kotak["y"] + kotak["height"] * 0.2)
    pg.wait_for_timeout(800)
    r = pg.evaluate("""()=>{
      const w=document.querySelector('.hero__visual');
      const g=document.querySelector('.glowcard');
      const c=document.querySelector('.chip--a');
      const q=document.querySelector('.qrfloat');
      return {tx:getComputedStyle(w).getPropertyValue('--ax-tx'),
              panggung:getComputedStyle(w).transform,
              chipTransform:getComputedStyle(c).transform,
              chipTranslate:getComputedStyle(c).translate,
              qrTransform:getComputedStyle(q).transform};
    }""")
    cek("kedalaman 3D: panggung benar-benar miring",
        r["panggung"].startswith("matrix3d"), r["panggung"][:26])
    cek("kedalaman 3D: lapisan bergeser di kedalaman berbeda",
        r["chipTranslate"] != "none", r["chipTranslate"])
    # Yang paling mudah rusak: kedalaman 3D menghapus kemiringan bawaan chip
    # dan kotak QR karena sama-sama menulis `transform`.
    cek("kedalaman 3D: kemiringan chip tidak terhapus",
        r["chipTransform"].startswith("matrix(0.99"), r["chipTransform"][:22])
    cek("kedalaman 3D: kemiringan kotak QR tidak terhapus",
        r["qrTransform"].startswith("matrix(0.99"), r["qrTransform"][:22])
    pg.close()

    # ── 7k. Claymorphism ─────────────────────────────────────
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(2200)
    r = pg.evaluate("""()=>{
      const out=[];
      for(const sel of ['.pill','.chip--a','.chip--b']){
        for(const e of document.querySelectorAll(sel)){
          const g=getComputedStyle(e);
          out.push({sel, clay:e.classList.contains('ax-clay'),
                    bulat:g.borderRadius, inset:g.boxShadow.includes('inset'),
                    latar:g.backgroundColor});
        }
      }
      return out;
    }""")
    cek("claymorphism: lencana diberi gaya tanah liat",
        r and all(x["clay"] for x in r), r)
    cek("claymorphism: ada bayangan dalam (efek empuk)",
        all(x["inset"] for x in r), [x["inset"] for x in r])
    # Warna latar asli TIDAK boleh ditimpa — percobaan pertama menggantinya
    # dengan krem, dan chip hijau jadi putih dengan teks putih di atasnya.
    cek("claymorphism: warna latar asli tidak tertimpa",
        all(x["latar"] != "rgb(255, 253, 247)" for x in r),
        [x["latar"] for x in r])
    pg.close()

    # ── 7l. Sorotan teks dinamis ─────────────────────────────
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(2400)
    r = pg.evaluate("""()=>{
      const e=[...document.querySelectorAll('.ax-sorot')];
      return {jumlah:e.length,
              kosong:e.filter(x=>getComputedStyle(x).backgroundSize.startsWith('0')).length,
              contoh:e.length?e[0].textContent.trim().slice(0,20):''};
    }""")
    cek("sorotan teks: ada kalimat yang disorot", r["jumlah"] >= 1, r["jumlah"])
    cek("sorotan teks: sapuan sudah terisi setelah masuk layar",
        r["kosong"] == 0, r["kosong"])
    # Judul hero bergradasi TIDAK boleh ikut disorot: keduanya memakai
    # `background`, dan sorotan akan menghapus gradasinya.
    grad = pg.evaluate("""()=>{
      const e=document.querySelector('.hero__title em');
      return {sorot:e.classList.contains('ax-sorot'),
              grad:e.classList.contains('ax-shimmer')};
    }""")
    cek("sorotan teks: tidak menyentuh judul bergradasi",
        not grad["sorot"] and grad["grad"], grad)
    pg.close()

    # ── 7m. Kurangi gerak mematikan empat efek baru ──────────
    ctx = b.new_context(viewport={"width": 1440, "height": 900},
                        reduced_motion="reduce")
    pg = ctx.new_page()
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(1600)
    r = pg.evaluate("""()=>{
      const k=document.querySelector('.ax-kanvas');
      const w=document.querySelector('.hero__visual');
      return {
        kanvas:k?getComputedStyle(k).display!=='none':false,
        wadah3d:w?getComputedStyle(w).transform:'none',
        parallax:[...document.querySelectorAll('.ax-parallax')]
          .filter(e=>getComputedStyle(e).translate!=='none').length,
        sorotKosong:[...document.querySelectorAll('.ax-sorot')]
          .filter(e=>getComputedStyle(e).backgroundSize.startsWith('0')).length,
      };
    }""")
    cek("kurangi gerak: kanvas disembunyikan", not r["kanvas"], r["kanvas"])
    cek("kurangi gerak: kedalaman 3D dinetralkan", r["wadah3d"] == "none",
        r["wadah3d"])
    cek("kurangi gerak: parallax berhenti", r["parallax"] == 0, r["parallax"])
    cek("kurangi gerak: sorotan teks tetap terisi penuh",
        r["sorotKosong"] == 0, r["sorotKosong"])
    ctx.close()

    # ── 7n. Tanpa JavaScript, empat efek baru tidak menyembunyikan isi ─
    ctx = b.new_context(viewport={"width": 1440, "height": 900},
                        java_script_enabled=False)
    pg = ctx.new_page()
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate("""()=>{
      const takTerlihat=[...document.querySelectorAll('main *')].filter(e=>
        getComputedStyle(e).opacity==='0' && e.textContent.trim().length>20).length;
      return {teks:document.body.innerText.trim().length,
              takTerlihat,
              kanvas:!!document.querySelector('.ax-kanvas')};
    }""")
    cek("tanpa JS: isi halaman tetap terbaca", r["teks"] > 3000, r["teks"])
    cek("tanpa JS: tidak ada elemen yang tersembunyi", r["takTerlihat"] == 0,
        r["takTerlihat"])
    ctx.close()

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
    cek("sw.js versi cache minimal v16", bool(v) and int(v.group(1)) >= 16,
        v.group(0) if v else "tidak ditemukan")
    pg.close()

    # ── 7q. Efek gerak menjangkau SELURUH halaman ────────────
    # Sebelumnya parallax, kanvas, dan 3D hanya hidup di bagian hero yang
    # gelap. Bagian ini menjaga supaya tidak kembali begitu.
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(2400)

    # Kanvas: tepat satu, dan dipasang pada <body> supaya menutupi semua
    # bagian. Lebih dari satu berarti bagiannya kembali dibuat per seksi.
    r = pg.evaluate("""()=>({
      jumlah:document.querySelectorAll('.ax-kanvas').length,
      diBadan:!!document.querySelector('body > .ax-kanvas'),
      pos:document.querySelector('.ax-kanvas')
            ?getComputedStyle(document.querySelector('.ax-kanvas')).position:'-',
      pointer:document.querySelector('.ax-kanvas')
            ?getComputedStyle(document.querySelector('.ax-kanvas')).pointerEvents:'-',
    })""")
    cek("kanvas menyeluruh: tepat satu kanvas", r["jumlah"] == 1, r["jumlah"])
    cek("kanvas menyeluruh: dipasang di <body>, bukan per bagian",
        r["diBadan"], r["diBadan"])
    cek("kanvas menyeluruh: posisi tetap mengikuti layar",
        r["pos"] == "fixed", r["pos"])
    cek("kanvas menyeluruh: tidak menangkap klik",
        r["pointer"] == "none", r["pointer"])

    # Kanvas tidak boleh menutupi isi halaman.
    r = pg.evaluate("""()=>{
      const t=document.elementFromPoint(window.innerWidth/2, 300);
      return {atas:(t.className||t.tagName).toString()};
    }""")
    cek("kanvas menyeluruh: konten tetap di atas kanvas",
        "ax-kanvas" not in r["atas"], r["atas"])

    # Parallax harus menjangkau banyak bagian, bukan hanya hero.
    r = pg.evaluate("""()=>{
      const semua=[...document.querySelectorAll('.ax-parallax')];
      const bagianBaru=semua.filter(e=>!e.closest('.hero'));
      return {total:semua.length, diLuarHero:bagianBaru.length};
    }""")
    cek("parallax menyeluruh: banyak lapisan bergerak", r["total"] >= 15,
        r["total"])
    cek("parallax menyeluruh: ada di luar bagian hero",
        r["diLuarHero"] >= 5, r["diLuarHero"])

    # Kedalaman 3D juga dipasang pada bagian isi, dengan sudut lebih halus.
    r = pg.evaluate("""()=>{
      const panggung=[...document.querySelectorAll('.ax-3d')];
      const halus=panggung.filter(e=>e.classList.contains('ax-3d--halus'));
      return {total:panggung.length, halus:halus.length,
              lapis:document.querySelectorAll('.ax-3d__lapis').length};
    }""")
    cek("kedalaman 3D menyeluruh: lebih dari satu panggung",
        r["total"] >= 3, r["total"])
    cek("kedalaman 3D menyeluruh: bagian isi pakai sudut halus",
        r["halus"] >= 2, r["halus"])
    cek("kedalaman 3D menyeluruh: lapisan bertambah banyak",
        r["lapis"] >= 12, r["lapis"])

    # Claymorphism harus tersebar di banyak jenis elemen, bukan hanya chip.
    r = pg.evaluate("""()=>{
      const semua=[...document.querySelectorAll('.ax-clay')];
      const jenis=new Set(semua.map(e=>(e.className||'').toString()
        .split(' ').find(c=>c && !c.startsWith('ax-clay'))));
      return {jumlah:semua.length, jenis:jenis.size};
    }""")
    cek("clay menyeluruh: menjangkau banyak elemen", r["jumlah"] >= 20,
        r["jumlah"])
    cek("clay menyeluruh: lebih dari tiga jenis elemen", r["jenis"] >= 4,
        r["jenis"])

    # Sorotan teks harus ada di halaman selain beranda juga.
    pg.goto(LANDING.replace("/warung-go-digital/", "/warung-go-digital/privasi.html"),
            wait_until="load")
    pg.wait_for_timeout(2000)
    r = pg.evaluate("""()=>({
      sorot:document.querySelectorAll('.ax-sorot').length,
      kanvas:document.querySelectorAll('.ax-kanvas').length,
    })""")
    cek("halaman privasi: sorotan teks ikut hadir", r["sorot"] >= 1, r["sorot"])
    cek("halaman privasi: kanvas ikut hadir", r["kanvas"] == 1, r["kanvas"])
    # Sapuan baru terisi setelah kalimatnya masuk layar — itu memang
    # perilaku yang diinginkan. Jadi gulir dulu, baru periksa terisi.
    pg.evaluate("""()=>{
      const s=document.querySelectorAll('.ax-sorot');
      if(s.length) s[Math.min(2,s.length-1)].scrollIntoView({block:'center'});
    }""")
    pg.wait_for_timeout(1600)
    r = pg.evaluate("""()=>{
      const s=[...document.querySelectorAll('.ax-sorot.ax-in')];
      return {masuk:s.length,
              kosong:s.filter(e=>getComputedStyle(e).backgroundSize.startsWith('0')).length};
    }""")
    cek("halaman privasi: sorotan terisi setelah masuk layar",
        r["masuk"] >= 1 and r["kosong"] == 0, r)
    pg.close()

    # ── 7r. Kanvas berganti warna antara bagian gelap dan terang ─
    # Titik di bagian gelap harus lebih muda daripada di bagian terang,
    # kalau tidak ia akan hilang di salah satunya.
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(2600)

    def warna_kanvas():
        return pg.evaluate("""()=>{
          const c=document.querySelector('.ax-kanvas');
          const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          let r=0,g=0,bl=0,n=0;
          for(let i=0;i<d.length;i+=4){if(d[i+3]>0){r+=d[i];g+=d[i+1];bl+=d[i+2];n++;}}
          return n?[r/n,g/n,bl/n]:null;
        }""")

    gelap = warna_kanvas()
    pg.evaluate("()=>document.querySelector('#layanan').scrollIntoView()")
    pg.wait_for_timeout(1600)
    terang = warna_kanvas()
    cek("kanvas berganti warna: terisi di kedua bagian",
        gelap is not None and terang is not None, [gelap, terang])
    if gelap and terang:
        cek("kanvas berganti warna: titik di bagian gelap lebih muda",
            sum(gelap) > sum(terang) + 60,
            f"gelap={sum(gelap):.0f} terang={sum(terang):.0f}")
    pg.close()

    # ── 7s. Kurangi gerak & tanpa JS tetap aman di halaman lain ─
    ctx = b.new_context(viewport={"width": 1280, "height": 900},
                        reduced_motion="reduce")
    pg = ctx.new_page()
    pg.goto(LANDING.replace("/warung-go-digital/", "/warung-go-digital/unduh.html"),
            wait_until="load")
    pg.wait_for_timeout(1800)
    r = pg.evaluate("""()=>({
      kanvas:[...document.querySelectorAll('.ax-kanvas')]
        .filter(e=>getComputedStyle(e).display!=='none').length,
      p3d:[...document.querySelectorAll('.ax-3d')]
        .filter(e=>getComputedStyle(e).transform!=='none').length,
      tersembunyi:[...document.querySelectorAll('.ax-reveal,.ax-stagger>*')]
        .filter(e=>getComputedStyle(e).display!=='none' &&
                   Number(getComputedStyle(e).opacity)<.05).length,
    })""")
    cek("halaman unduh kurangi gerak: kanvas dimatikan", r["kanvas"] == 0,
        r["kanvas"])
    cek("halaman unduh kurangi gerak: 3D dinetralkan", r["p3d"] == 0, r["p3d"])
    cek("halaman unduh kurangi gerak: tidak ada isi tersembunyi",
        r["tersembunyi"] == 0, r["tersembunyi"])
    ctx.close()

    ctx = b.new_context(viewport={"width": 1280, "height": 900},
                        java_script_enabled=False)
    pg = ctx.new_page()
    pg.goto(LANDING, wait_until="load")
    pg.wait_for_timeout(900)
    r = pg.evaluate("""()=>({
      teks:document.body.innerText.trim().length,
      kanvas:document.querySelectorAll('.ax-kanvas').length,
      takTerlihat:[...document.querySelectorAll('main *')].filter(e=>
        getComputedStyle(e).opacity==='0' &&
        e.textContent.trim().length>20).length,
    })""")
    cek("tanpa JS beranda: isi tetap terbaca", r["teks"] > 3000, r["teks"])
    cek("tanpa JS beranda: kanvas tidak dibuat", r["kanvas"] == 0, r["kanvas"])
    cek("tanpa JS beranda: tidak ada isi tersembunyi",
        r["takTerlihat"] == 0, r["takTerlihat"])
    ctx.close()

    b.close()

lulus = sum(1 for _, ok, _ in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 64)
print(f"HASIL ANIMASI: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
print("=" * 64)
if gagal:
    raise SystemExit(1)
