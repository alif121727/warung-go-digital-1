"""Uji gerbang masuk aplikasi Pemilik & Pengelola.

Yang dijaga di sini bukan sekadar "tombolnya bisa diklik", melainkan janji
keamanannya:

1. Aplikasi tidak terbuka sebelum masuk.
2. Cara masuk pertama lewat Google; setelah itu boleh pakai nama pengguna +
   kata sandi sendiri.
3. Kata sandi TIDAK PERNAH tersimpan apa adanya.
4. Sesi bertahan saat halaman dimuat ulang, dan hilang setelah keluar.
5. Kata sandi lemah / tidak sama ditolak, nama pengguna ngawur ditolak.
6. Akun Pemilik dan Pengelola terpisah — satu tidak bisa membuka yang lain.
7. Berkas masuk.js & masuk.css benar-benar dimuat.

Jalankan: python3 uji/uji-masuk.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import sys, os
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module
bantu = import_module("bantu-masuk")

B = "http://localhost:12000/warung-go-digital/"
hasil = []


def cek(nama, ok, info=""):
    hasil.append((nama, bool(ok), info))
    if not ok:
        print(f"GAGAL  {nama:58} {info}")


def buka(br, peran):
    ctx = br.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(B + ("pemilik/" if peran == "pemilik" else "admin/"), wait_until="load")
    pg.wait_for_timeout(1100)
    return ctx, pg, errs


def utama():
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

        # ═══ 1. Gerbang menutup aplikasi ═══
        ctx, pg, errs = buka(br, "pemilik")
        cek("gerbang tampil", pg.eval_on_selector_all(".gerbang", "e=>e.length") == 1)
        cek("aplikasi belum terbuka", pg.eval_on_selector_all("#view .card", "e=>e.length") == 0)
        cek("halaman tidak bisa digulir di belakang gerbang",
            pg.evaluate("()=>document.body.style.overflow") == "hidden")
        cek("masuk.js termuat", pg.evaluate("()=>typeof window.Masuk === 'object'"))
        cek("masuk.css termuat",
            pg.evaluate("""()=>[...document.styleSheets].some(s=>(s.href||'').includes('masuk.css'))"""))
        cek("tanpa error konsol saat gerbang", not errs, errs[:2])

        # ═══ 2. Mode contoh ditandai terang-terangan ═══
        pg.click("#gbGoogle")
        pg.wait_for_timeout(500)
        cek("mode contoh ditandai jelas",
            "Mode contoh" in pg.inner_text("#gbKartu"),
            pg.inner_text("#gbKartu")[:60].replace("\n", " "))

        # ═══ 3. Buat nama pengguna & kata sandi ═══
        pg.click("#gbContoh")
        pg.wait_for_timeout(600)
        cek("layar buat cara masuk muncul", "Buat cara masuk" in pg.inner_text("#gbKartu"))

        # kata sandi belum sama -> ditolak
        pg.fill("#gbBaruNama", "bu-tini")
        pg.fill("#gbBaruSandi", "warungku123")
        pg.fill("#gbUlangSandi", "warungku124")
        pg.click("#gbBuat button[type=submit]")
        pg.wait_for_timeout(600)
        cek("kata sandi tidak sama ditolak", "belum sama" in pg.inner_text("#gbKartu"))

        # kata sandi lemah -> ditolak
        pg.fill("#gbBaruSandi", "abcdefgh")
        pg.fill("#gbUlangSandi", "abcdefgh")
        pg.click("#gbBuat button[type=submit]")
        pg.wait_for_timeout(600)
        cek("kata sandi lemah ditolak", "Campurkan huruf dan angka" in pg.inner_text("#gbKartu"))

        # nama pengguna ngawur -> ditolak
        pg.fill("#gbBaruNama", "Bu Tini!")
        pg.fill("#gbBaruSandi", "warungku123")
        pg.fill("#gbUlangSandi", "warungku123")
        pg.click("#gbBuat button[type=submit]")
        pg.wait_for_timeout(600)
        cek("nama pengguna ngawur ditolak", "3–24 huruf" in pg.inner_text("#gbKartu"))

        # yang benar
        pg.fill("#gbBaruNama", "bu-tini")
        pg.fill("#gbBaruSandi", "warungku123")
        pg.fill("#gbUlangSandi", "warungku123")
        pg.click("#gbBuat button[type=submit]")
        pg.wait_for_timeout(1400)
        cek("gerbang hilang setelah berhasil", pg.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        cek("aplikasi terbuka", pg.eval_on_selector_all("#view .card", "e=>e.length") > 0)

        # ═══ 4. Kata sandi tidak disimpan apa adanya ═══
        mentah = pg.evaluate("()=>localStorage.getItem('wgd-pemilik-akun-v1')")
        cek("kata sandi tidak tersimpan apa adanya", "warungku123" not in mentah)
        akun = pg.evaluate("()=>JSON.parse(localStorage.getItem('wgd-pemilik-akun-v1')).akun")
        cek("nama pengguna tersimpan", akun.get("username") == "bu-tini", akun.get("username"))
        cek("ada garam acak", len(akun.get("sandiGaram") or "") >= 20)
        cek("ada sidik kata sandi", len(akun.get("sandiSidik") or "") >= 40)
        cek("sidik bukan kata sandinya", akun.get("sandiSidik") != "warungku123")

        # Dua kata sandi sama dengan garam berbeda harus menghasilkan sidik
        # berbeda. Diperiksa di konteks terpisah supaya akun di atas tidak
        # ikut berubah.
        ctx_h = br.new_context(viewport={"width": 390, "height": 844})
        pg_h = ctx_h.new_page()
        pg_h.goto(B + "pemilik/", wait_until="load")
        pg_h.wait_for_timeout(900)
        beda = pg_h.evaluate("""async ()=>{
          const baca = ()=>JSON.parse(localStorage.getItem('wgd-pemilik-akun-v1')).akun.sandiSidik;
          await Masuk.setelNamaSandi('pemilik','uji-banding','warungku123');
          const satu = baca();
          await Masuk.setelNamaSandi('pemilik','uji-banding','warungku123');
          const dua = baca();
          return satu !== dua;
        }""")
        cek("kata sandi sama, garam beda => sidik beda", beda)
        ctx_h.close()

        # ═══ 5. Sesi bertahan saat dimuat ulang ═══
        pg.reload(wait_until="load")
        pg.wait_for_timeout(1200)
        cek("muat ulang: gerbang tidak muncul lagi",
            pg.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        cek("muat ulang: aplikasi tetap terbuka",
            pg.eval_on_selector_all("#view .card", "e=>e.length") > 0)

        # ═══ 6. Keluar lalu masuk lagi dengan kata sandi ═══
        pg.click("#btnAkun")
        pg.wait_for_timeout(700)
        cek("panel akun terbuka", "Akun saya" in pg.inner_text("#modal"))
        cek("panel akun menampilkan nama pengguna", "bu-tini" in pg.inner_text("#modal"))
        pg.click("#akKeluar")
        pg.wait_for_timeout(600)
        pg.click("#modal [data-ya]")
        pg.wait_for_timeout(1500)
        cek("keluar: gerbang muncul kembali", pg.eval_on_selector_all(".gerbang", "e=>e.length") == 1)
        cek("keluar: sesi terhapus",
            pg.evaluate("()=>!localStorage.getItem('wgd-pemilik-sesi-v1')"))

        cek("form nama pengguna tampil setelah keluar",
            pg.eval_on_selector_all("#gbForm", "e=>e.length") == 1)

        pg.fill("#gbNamaPengguna", "bu-tini")
        pg.fill("#gbSandi", "salah-banget")
        pg.click("#gbForm button[type=submit]")
        pg.wait_for_timeout(1300)
        cek("kata sandi salah ditolak", "tidak cocok" in pg.inner_text("#gbKartu"))
        cek("masih di gerbang setelah salah",
            pg.eval_on_selector_all(".gerbang", "e=>e.length") == 1)

        pg.fill("#gbNamaPengguna", "bu-tini")
        pg.fill("#gbSandi", "warungku123")
        pg.click("#gbForm button[type=submit]")
        pg.wait_for_timeout(1500)
        cek("kata sandi benar diterima", pg.eval_on_selector_all(".gerbang", "e=>e.length") == 0)

        # ═══ 7. Lupa kata sandi mengarahkan ke Google ═══
        bantu.masuk_cepat(pg, "pemilik")  # tidak mengubah akun, hanya sesi
        pg.evaluate("()=>localStorage.removeItem('wgd-pemilik-sesi-v1')")
        pg.reload(wait_until="load")
        pg.wait_for_timeout(1000)
        pg.click("#gbLupa")
        pg.wait_for_timeout(500)
        teks_lupa = pg.inner_text("#gbKartu")
        cek("lupa sandi: dijelaskan lewat Google",
            "Google" in teks_lupa and "tidak bisa dikirim ulang" in teks_lupa,
            teks_lupa[:70].replace("\n", " "))
        cek("lupa sandi: tidak ada error konsol", not errs, errs[:2])
        ctx.close()

        # ═══ 8. Akun Pengelola terpisah dari Pemilik ═══
        ctx2, pg2, errs2 = buka(br, "pengelola")
        cek("pengelola: gerbang tampil", pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 1)
        pg2.click("#gbGoogle"); pg2.wait_for_timeout(400)
        pg2.click("#gbContoh"); pg2.wait_for_timeout(500)
        pg2.fill("#gbBaruNama", "pengelola-utama")
        pg2.fill("#gbBaruSandi", "panelku12345")
        pg2.fill("#gbUlangSandi", "panelku12345")
        pg2.click("#gbBuat button[type=submit]")
        pg2.wait_for_timeout(1400)
        cek("pengelola: masuk berhasil", pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        kunci2 = pg2.evaluate("()=>Object.keys(localStorage)")
        cek("pengelola: hanya memakai kunci admin",
            all(k.startswith("wgd-admin") for k in kunci2), str(kunci2))
        cek("pengelola: akun tersimpan terpisah",
            pg2.evaluate("""()=>JSON.parse(localStorage.getItem('wgd-admin-akun-v1'))
                .akun.username""") == "pengelola-utama")
        cek("pengelola: tanpa error konsol", not errs2, errs2[:2])
        ctx2.close()

        # ═══ 9. Sesi Pemilik tidak membuka Pengelola ═══
        ctx3 = br.new_context(viewport={"width": 390, "height": 844})
        pg3 = ctx3.new_page()
        pg3.goto(B + "pemilik/", wait_until="load")
        pg3.wait_for_timeout(1000)
        bantu.masuk_cepat(pg3, "pemilik")
        pg3.goto(B + "admin/", wait_until="load")
        pg3.wait_for_timeout(1200)
        cek("sesi Pemilik tidak membuka Pengelola",
            pg3.eval_on_selector_all(".gerbang", "e=>e.length") == 1)
        ctx3.close()

        # ═══ 10. Tanpa kripto (file://) tetap ada jalan masuk ═══
        ctx4 = br.new_context(viewport={"width": 390, "height": 844})
        pg4 = ctx4.new_page()
        pg4.add_init_script(
            "Object.defineProperty(window, 'crypto', { value: { getRandomValues: (a)=>a } });")
        pg4.goto(B + "pemilik/", wait_until="load")
        pg4.wait_for_timeout(1000)
        pg4.click("#gbGoogle"); pg4.wait_for_timeout(400)
        pg4.click("#gbContoh"); pg4.wait_for_timeout(600)
        cek("tanpa kripto: dijelaskan, tidak gagal diam-diam",
            "Tidak bisa membuat kata sandi" in pg4.inner_text("#gbKartu"),
            pg4.inner_text("#gbKartu")[:60].replace("\n", " "))
        cek("tanpa kripto: form kata sandi disembunyikan",
            pg4.eval_on_selector_all("#gbBuat", "e=>e.length") == 0)
        pg4.click("#gbMasukLangsung")
        pg4.wait_for_timeout(1000)
        cek("tanpa kripto: tetap bisa masuk", pg4.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        ctx4.close()

        br.close()


utama()
lulus = sum(1 for _, ok, _ in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 64)
print(f"HASIL MASUK: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
print("=" * 64)
if gagal:
    raise SystemExit(1)
