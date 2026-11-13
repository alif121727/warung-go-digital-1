"""Bantuan uji: membuka gerbang masuk aplikasi Pemilik & Pengelola.

Sejak aplikasi diberi gerbang masuk, uji yang menguji isi aplikasi harus
melewatinya dulu. Ada dua cara:

* masuk_cepat(pg, peran)  — menulis sesi lalu memuat ulang halaman. Cepat dan
  tidak bergantung pada kata sandi. Dipakai oleh uji yang hanya perlu sampai
  ke dalam aplikasi.
* lewati_gerbang(pg)      — menempuh alurnya seperti manusia: tombol Google
  (mode contoh), lalu membuat nama pengguna & kata sandi. Dipakai oleh uji
  yang memang ingin memastikan gerbangnya bekerja.
"""

PERAN = ("pemilik", "pengelola")


def masuk_cepat(pg, peran="pemilik"):
    """Buka sesi tanpa menempuh formulir, lalu muat ulang."""
    pg.evaluate(
        """(peran) => {
            const awalan = peran === 'pengelola' ? 'admin' : 'pemilik';
            localStorage.setItem('wgd-' + awalan + '-sesi-v1', JSON.stringify({
              peran: peran,
              sejak: new Date().toISOString(),
              kedaluwarsa: Date.now() + 3600 * 1000,
            }));
        }""",
        peran,
    )
    pg.reload(wait_until="load")
    pg.wait_for_timeout(500)


def lewati_gerbang(pg, nama_pengguna="uji-wgd", sandi="warungku123"):
    """Tempuh alur gerbang: Google (mode contoh) -> buat nama pengguna & sandi."""
    pg.wait_for_selector(".gerbang", timeout=8000)
    pg.click("#gbGoogle")
    pg.wait_for_timeout(400)
    if pg.eval_on_selector_all("#gbContoh", "e=>e.length"):
        pg.click("#gbContoh")
        pg.wait_for_timeout(500)
    if pg.eval_on_selector_all("#gbBuat", "e=>e.length"):
        pg.fill("#gbBaruNama", nama_pengguna)
        pg.fill("#gbBaruSandi", sandi)
        pg.fill("#gbUlangSandi", sandi)
        pg.click("#gbBuat button[type=submit]")
    elif pg.eval_on_selector_all("#gbMasukSekarang", "e=>e.length"):
        pg.click("#gbMasukSekarang")
    pg.wait_for_timeout(900)
    pg.wait_for_selector(".gerbang", state="detached", timeout=8000)
