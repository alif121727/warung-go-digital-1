"""Uji gerbang masuk aplikasi Pemilik & Pengelola.

Yang dijaga di sini bukan sekadar "tombolnya bisa diklik", melainkan janji
keamanannya:

1. Aplikasi tidak terbuka sebelum masuk.
2. Cara masuk UTAMA adalah nama pengguna + kata sandi — tanpa perlu Google.
   Ini yang membuat APK (WebView Android) bisa dipakai: Google menolak
   menampilkan layar masuknya di dalam WebView.
3. Kata sandi TIDAK PERNAH tersimpan apa adanya.
4. Sesi bertahan saat halaman dimuat ulang, dan hilang setelah keluar.
5. Kata sandi lemah / tidak sama ditolak, nama pengguna ngawur ditolak.
6. Akun bawaan pengelola (admin/admin123) dibuat otomatis dan ditandai wajib
   diganti sampai kata sandinya benar-benar diganti.
7. Pengelola bisa MEMBUAT dan MENGHAPUS akun, serta mengganti kata sandinya.
8. Akun yang dihapus tidak bisa lagi masuk, termasuk lewat sesi lamanya.
9. Data usaha Pemilik dan Pengelola tetap terpisah (hanya daftar akun dibagi).
10. Berkas masuk.js & masuk.css benar-benar dimuat.

Jalankan: python3 uji/uji-masuk.py
Perlu server aktif di http://localhost:12000/warung-go-digital/
"""
import sys
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

        # ═══ 2. Nama pengguna + kata sandi tersedia LANGSUNG (tanpa Google) ═══
        cek("form nama pengguna langsung tampil",
            pg.eval_on_selector_all("#gbForm", "e=>e.length") == 1)
        cek("tombol Google tidak dipaksa tampil tanpa client id",
            pg.eval_on_selector_all("#gbGoogle", "e=>e.length") == 0)

        # ═══ 3. Pemilik membuat akun sendiri ═══
        pg.click("#gbKeBuat")
        pg.wait_for_timeout(600)
        cek("layar buat cara masuk muncul", "Buat cara masuk" in pg.inner_text("#gbKartu"))

        pg.fill("#gbBaruNama", "bu-tini")
        pg.fill("#gbBaruSandi", "warungku123")
        pg.fill("#gbUlangSandi", "warungku124")
        pg.click("#gbBuat button[type=submit]")
        pg.wait_for_timeout(600)
        cek("kata sandi tidak sama ditolak", "belum sama" in pg.inner_text("#gbKartu"))

        pg.fill("#gbBaruSandi", "abcdefgh")
        pg.fill("#gbUlangSandi", "abcdefgh")
        pg.click("#gbBuat button[type=submit]")
        pg.wait_for_timeout(600)
        cek("kata sandi lemah ditolak", "Campurkan huruf dan angka" in pg.inner_text("#gbKartu"))

        pg.fill("#gbBaruNama", "Bu Tini!")
        pg.fill("#gbBaruSandi", "warungku123")
        pg.fill("#gbUlangSandi", "warungku123")
        pg.click("#gbBuat button[type=submit]")
        pg.wait_for_timeout(600)
        cek("nama pengguna ngawur ditolak", "3–24 huruf" in pg.inner_text("#gbKartu"))

        pg.fill("#gbBaruNama", "bu-tini")
        pg.fill("#gbBaruSandi", "warungku123")
        pg.fill("#gbUlangSandi", "warungku123")
        pg.click("#gbBuat button[type=submit]")
        pg.wait_for_timeout(1600)
        cek("gerbang hilang setelah berhasil", pg.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        cek("aplikasi terbuka", pg.eval_on_selector_all("#view .card", "e=>e.length") > 0)

        # ═══ 4. Kata sandi tidak disimpan apa adanya ═══
        mentah = pg.evaluate("()=>localStorage.getItem('wgd-akun-v1')")
        cek("kata sandi tidak tersimpan apa adanya", "warungku123" not in mentah)
        akun = pg.evaluate("""()=>JSON.parse(localStorage.getItem('wgd-akun-v1'))
            .akun.find(a=>a.peran==='pemilik')""")
        cek("nama pengguna tersimpan", akun.get("username") == "bu-tini", akun.get("username"))
        cek("ada garam acak", len(akun.get("sandiGaram") or "") >= 20)
        cek("ada sidik kata sandi", len(akun.get("sandiSidik") or "") >= 40)
        cek("sidik bukan kata sandinya", akun.get("sandiSidik") != "warungku123")

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

        # ═══ 7. Lupa kata sandi dijelaskan (tanpa janji surel) ═══
        pg.evaluate("()=>localStorage.removeItem('wgd-pemilik-sesi-v1')")
        pg.reload(wait_until="load")
        pg.wait_for_timeout(1000)
        pg.click("#gbLupa")
        pg.wait_for_timeout(500)
        teks_lupa = pg.inner_text("#gbKartu")
        cek("lupa sandi: dijelaskan, tidak menjanjikan surel",
            "tidak bisa dikirim ulang" in teks_lupa,
            teks_lupa[:70].replace("\n", " "))
        cek("lupa sandi: tidak ada error konsol", not errs, errs[:2])
        ctx.close()

        # ═══ 8. Akun bawaan pengelola dibuat otomatis ═══
        ctx2, pg2, errs2 = buka(br, "pengelola")
        cek("pengelola: gerbang tampil", pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 1)
        cek("pengelola: akun bawaan diumumkan di gerbang",
            "admin123" in pg2.inner_text("#gbKartu"), pg2.inner_text("#gbKartu")[:80])
        cek("pengelola: form nama pengguna langsung tampil",
            pg2.eval_on_selector_all("#gbForm", "e=>e.length") == 1)

        pg2.fill("#gbNamaPengguna", "admin")
        pg2.fill("#gbSandi", "admin123")
        pg2.click("#gbForm button[type=submit]")
        pg2.wait_for_timeout(1600)
        cek("pengelola: masuk dengan admin/admin123",
            pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        cek("pengelola: aplikasi terbuka", pg2.eval_on_selector_all("#view .card", "e=>e.length") > 0)
        cek("pengelola: akun tersimpan di daftar akun",
            pg2.evaluate("""()=>JSON.parse(localStorage.getItem('wgd-akun-v1'))
                .akun.find(a=>a.peran==='pengelola').username""") == "admin")
        cek("pengelola: tanpa error konsol", not errs2, errs2[:2])

        # ═══ 9. Pengelola: ganti kata sandi sendiri ═══
        pg2.click("#btnAkun")
        pg2.wait_for_timeout(700)
        modal = pg2.inner_text("#modal").lower()
        cek("panel akun: ada bagian ganti kata sandi", "ganti kata sandi" in modal)
        cek("panel akun: memperingatkan sandi bawaan", "bawaan" in modal)
        cek("panel akun: ada bagian kelola akun", "kelola akun" in modal)

        pg2.fill("#akLama", "admin123")
        pg2.fill("#akBaru", "warungku123")
        pg2.fill("#akUlang", "warungku123")
        pg2.click("#akGanti button[type=submit]")
        pg2.wait_for_timeout(1700)
        cek("ganti sandi: berhasil (tidak ada galat)",
            pg2.eval_on_selector_all("#akGalat .gb-notis--salah", "e=>e.length") == 0)

        # Masuk lagi memakai kata sandi baru.
        pg2.evaluate("()=>localStorage.removeItem('wgd-admin-sesi-v1')")
        pg2.reload(wait_until="load")
        pg2.wait_for_timeout(1200)
        pg2.fill("#gbNamaPengguna", "admin")
        pg2.fill("#gbSandi", "warungku123")
        pg2.click("#gbForm button[type=submit]")
        pg2.wait_for_timeout(1600)
        cek("pengelola: masuk dengan kata sandi baru",
            pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        cek("pengelola: akun bawaan tidak ditandai lagi",
            "kata sandi bawaan" not in pg2.inner_text("body"))

        # Kata sandi lama tidak boleh lagi berlaku.
        pg2.evaluate("()=>localStorage.removeItem('wgd-admin-sesi-v1')")
        pg2.reload(wait_until="load")
        pg2.wait_for_timeout(1200)
        pg2.fill("#gbNamaPengguna", "admin")
        pg2.fill("#gbSandi", "admin123")
        pg2.click("#gbForm button[type=submit]")
        pg2.wait_for_timeout(1300)
        cek("pengelola: kata sandi lama tidak berlaku lagi",
            pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 1)

        # Masuk kembali untuk uji kelola akun.
        pg2.fill("#gbNamaPengguna", "admin")
        pg2.fill("#gbSandi", "warungku123")
        pg2.click("#gbForm button[type=submit]")
        pg2.wait_for_timeout(1600)
        cek("pengelola: masuk kembali untuk uji kelola akun",
            pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 0)

        # ═══ 10. Pengelola membuat akun Pemilik, lalu akun itu bisa masuk ═══
        pg2.click("#btnAkun")
        pg2.wait_for_timeout(700)
        pg2.fill("#akBaruNama", "bu-sari")
        pg2.fill("#akBaruSandi", "sari12345")
        pg2.click("#akTambah button[type=submit]")
        pg2.wait_for_timeout(1500)
        daftar = pg2.evaluate("""()=>JSON.parse(localStorage.getItem('wgd-akun-v1'))
            .akun.map(a=>a.peran+':'+a.username)""")
        cek("pengelola: akun pemilik dibuat", "pemilik:bu-sari" in daftar, str(daftar))
        cek("pengelola: sandi akun baru tidak tersimpan apa adanya",
            "sari12345" not in pg2.evaluate("()=>localStorage.getItem('wgd-akun-v1')"))

        # Pemilik masuk dengan akun buatan pengelola (konteks yang sama).
        pg2.goto(B + "pemilik/", wait_until="load")
        pg2.wait_for_timeout(1200)
        pg2.fill("#gbNamaPengguna", "bu-sari")
        pg2.fill("#gbSandi", "sari12345")
        pg2.click("#gbForm button[type=submit]")
        pg2.wait_for_timeout(1600)
        cek("pemilik: masuk dengan akun buatan pengelola",
            pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        cek("pemilik: aplikasi terbuka", pg2.eval_on_selector_all("#view .card", "e=>e.length") > 0)

        # ═══ 11. Pengelola menghapus akun Pemilik ═══
        pg2.goto(B + "admin/", wait_until="load")
        pg2.wait_for_timeout(1300)
        pg2.click("#btnAkun")
        pg2.wait_for_timeout(700)
        pg2.evaluate("""()=>{
            const b=[...document.querySelectorAll('[data-hapus]')].find(x=>
              x.closest('[data-akun]').innerText.includes('bu-sari'));
            b.click();
        }""")
        pg2.wait_for_timeout(500)
        pg2.click("#modal [data-ya]")
        pg2.wait_for_timeout(1600)
        daftar2 = pg2.evaluate("""()=>JSON.parse(localStorage.getItem('wgd-akun-v1'))
            .akun.map(a=>a.peran+':'+a.username)""")
        cek("pengelola: akun pemilik terhapus", "pemilik:bu-sari" not in daftar2, str(daftar2))
        cek("pengelola: akun pengelola tetap ada", "pengelola:admin" in daftar2, str(daftar2))

        # Akun terhapus tidak bisa masuk lagi, meski sesinya masih tersimpan.
        pg2.goto(B + "pemilik/", wait_until="load")
        pg2.wait_for_timeout(1300)
        cek("akun terhapus: sesi lama tidak lagi membuka aplikasi",
            pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 1)
        pg2.fill("#gbNamaPengguna", "bu-sari")
        pg2.fill("#gbSandi", "sari12345")
        pg2.click("#gbForm button[type=submit]")
        pg2.wait_for_timeout(1400)
        cek("akun terhapus: tidak bisa masuk lagi",
            pg2.eval_on_selector_all(".gerbang", "e=>e.length") == 1)

        # ═══ 12. Akun pengelola terakhir tidak boleh dihapus ═══
        pg2.goto(B + "admin/", wait_until="load")
        pg2.wait_for_timeout(1300)
        pg2.click("#btnAkun")
        pg2.wait_for_timeout(700)
        pg2.evaluate("""()=>{
            const b=[...document.querySelectorAll('[data-hapus]')].find(x=>
              x.closest('[data-akun]').innerText.includes('admin'));
            b.click();
        }""")
        pg2.wait_for_timeout(500)
        pg2.click("#modal [data-ya]")
        pg2.wait_for_timeout(1400)
        daftar3 = pg2.evaluate("""()=>JSON.parse(localStorage.getItem('wgd-akun-v1'))
            .akun.map(a=>a.peran+':'+a.username)""")
        cek("akun pengelola terakhir tidak terhapus", "pengelola:admin" in daftar3, str(daftar3))
        cek("pengelola: tanpa error konsol 2", not errs2, errs2[:3])
        ctx2.close()

        # ═══ 13. Data usaha tetap terpisah ═══
        ctx3 = br.new_context(viewport={"width": 390, "height": 844})
        pg3 = ctx3.new_page()
        pg3.goto(B + "pemilik/", wait_until="load")
        pg3.wait_for_timeout(1000)
        bantu.masuk_cepat(pg3, "pemilik")
        kunci = pg3.evaluate("()=>Object.keys(localStorage)")
        cek("pemilik: data usaha tetap di kunci pemilik",
            all(k == "wgd-akun-v1" or k.startswith("wgd-pemilik") for k in kunci), str(kunci))
        ctx3.close()

        # ═══ 14. Sesi Pemilik tidak membuka Pengelola ═══
        ctx4 = br.new_context(viewport={"width": 390, "height": 844})
        pg4 = ctx4.new_page()
        pg4.goto(B + "pemilik/", wait_until="load")
        pg4.wait_for_timeout(1000)
        bantu.masuk_cepat(pg4, "pemilik")
        pg4.goto(B + "admin/", wait_until="load")
        pg4.wait_for_timeout(1300)
        cek("sesi Pemilik tidak membuka Pengelola",
            pg4.eval_on_selector_all(".gerbang", "e=>e.length") == 1)
        ctx4.close()

        # ═══ 15. Tanpa kripto (file://) gerbang menjelaskan, tidak gagal diam ═══
        ctx5 = br.new_context(viewport={"width": 390, "height": 844})
        pg5 = ctx5.new_page()
        pg5.add_init_script(
            "Object.defineProperty(window, 'crypto', { value: { getRandomValues: (a)=>a } });")
        pg5.goto(B + "pemilik/", wait_until="load")
        pg5.wait_for_timeout(1200)
        cek("tanpa kripto: dijelaskan, tidak gagal diam-diam",
            "tidak mengizinkan pengamanan kata sandi" in pg5.inner_text("#gbKartu").lower(),
            pg5.inner_text("#gbKartu")[:80].replace("\n", " "))
        cek("tanpa kripto: tombol masuk dinonaktifkan",
            pg5.eval_on_selector("#gbForm button[type=submit]", "e=>e.disabled") is True)
        ctx5.close()

        # ═══ 16. Panel menampilkan akun yang SEDANG dipakai ═══
        # Pengelola boleh membuat banyak akun Pemilik. Panel "Akun saya" harus
        # menampilkan akun yang sedang dipakai, bukan akun pertama seperan.
        ctx6 = br.new_context(viewport={"width": 390, "height": 844})
        pg6 = ctx6.new_page()
        pg6.goto(B + "pemilik/", wait_until="load")
        pg6.wait_for_timeout(1000)
        pg6.evaluate("""async () => {
            const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
            const sidik = async (sandi, garam) => {
              const k = await crypto.subtle.importKey('raw',
                new TextEncoder().encode(sandi), 'PBKDF2', false, ['deriveBits']);
              const bit = await crypto.subtle.deriveBits(
                { name:'PBKDF2', salt:garam, iterations:150000, hash:'SHA-256' }, k, 256);
              return b64(bit);
            };
            const buat = async (username, sandi) => {
              const garam = crypto.getRandomValues(new Uint8Array(16));
              return { id:'x-'+username, peran:'pemilik', username, nama:'',
                sandiGaram:b64(garam), sandiSidik:await sidik(sandi, garam) };
            };
            localStorage.setItem('wgd-akun-v1', JSON.stringify({ meta:{}, akun:[
              await buat('pemilik-satu','sandi12345'),
              await buat('pemilik-dua','sandi67890'),
            ]}));
            localStorage.setItem('wgd-pemilik-sesi-v1', JSON.stringify({
              peran:'pemilik', username:'pemilik-dua',
              sejak:new Date().toISOString(), kedaluwarsa:Date.now()+3600*1000 }));
        }""")
        pg6.reload(wait_until="load")
        pg6.wait_for_timeout(1300)
        dua = pg6.evaluate("""()=>JSON.parse(localStorage.getItem('wgd-akun-v1'))
            .akun.filter(a=>a.peran==='pemilik').length""")
        cek("dua akun pemilik bisa berdampingan", dua == 2, dua)
        cek("sesi akun kedua membuka aplikasi",
            pg6.eval_on_selector_all(".gerbang", "e=>e.length") == 0)
        pg6.click("#btnAkun")
        pg6.wait_for_timeout(700)
        panel = pg6.inner_text("#modal")
        cek("panel menampilkan akun yang sedang dipakai (bukan yang pertama)",
            "pemilik-dua" in panel and "pemilik-satu" not in panel,
            panel[:90].replace("\n", " "))
        ctx6.close()

        br.close()


utama()
lulus = sum(1 for _, ok, _ in hasil if ok)
gagal = len(hasil) - lulus
print("\n" + "=" * 64)
print(f"HASIL MASUK: {lulus} lulus, {gagal} gagal, dari {len(hasil)} uji")
print("=" * 64)
if gagal:
    raise SystemExit(1)
