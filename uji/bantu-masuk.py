"""Bantuan uji: membuka gerbang masuk aplikasi Pemilik & Pengelola.

Sejak aplikasi memakai nama pengguna + kata sandi sebagai cara masuk utama
(Google hanya tambahan), uji yang menguji isi aplikasi harus melewatinya dulu.
Ada dua cara:

* masuk_cepat(pg, peran)  — menulis akun lalu sesi, memuat ulang halaman.
  Cepat dan tidak bergantung pada kata sandi. Dipakai oleh uji yang hanya
  perlu sampai ke dalam aplikasi.
* masuk(pg, peran, ...)   — menempuh alurnya seperti manusia: isi nama
  pengguna & kata sandi di formulir. Dipakai oleh uji yang memang ingin
  memastikan gerbangnya bekerja.
"""

PERAN = ("pemilik", "pengelola")

# Tidak ada lagi akun bawaan berkata-sandi tetap (kata sandi tetap di kode
# publik sama saja dengan tidak terkunci). Uji menulis akunnya sendiri.
AKUN_UJI = {"pengelola": {"username": "uji-admin", "sandi": "warungku123"}}


def _awalan(peran):
    return "admin" if peran == "pengelola" else "pemilik"


def _tulis_akun(pg, peran, username, sandi, id_akun="uji-akun"):
    """Tulis akun ke daftar `wgd-akun-v1` beserta sidik kata sandinya.

    Sidik dibuat dengan PBKDF2-SHA256 (150.000 putaran) persis seperti aplikasi,
    sehingga masukNamaSandi() benar-benar cocok.
    """
    pg.evaluate(
        """async ({peran, username, sandi, id_akun}) => {
            const garam = crypto.getRandomValues(new Uint8Array(16));
            const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
            const kunci = await crypto.subtle.importKey(
              'raw', new TextEncoder().encode(sandi), 'PBKDF2', false, ['deriveBits']);
            const bit = await crypto.subtle.deriveBits(
              { name: 'PBKDF2', salt: garam, iterations: 150000, hash: 'SHA-256' }, kunci, 256);
            const d = JSON.parse(localStorage.getItem('wgd-akun-v1') || '{"meta":{},"akun":[]}');
            if (!Array.isArray(d.akun)) d.akun = [];
            d.akun = d.akun.filter((a) => a.peran !== peran);
            d.akun.push({
              id: id_akun, peran, username, nama: '',
              sandiGaram: b64(garam), sandiSidik: b64(bit),
              sandiDiubah: new Date().toISOString(), harusGanti: false,
            });
            localStorage.setItem('wgd-akun-v1', JSON.stringify(d));
        }""",
        {"peran": peran, "username": username, "sandi": sandi, "id_akun": id_akun},
    )


def masuk_cepat(pg, peran="pemilik", username=None, sandi="warungku123"):
    """Buka aplikasi tanpa menempuh formulir, lalu muat ulang.

    Membuat akun + sesi yang cocok, sehingga pemeriksaan sesi di masuk.js
    (yang menolak sesi milik akun terhapus) tetap lolos.
    """
    if username is None:
        username = AKUN_UJI["pengelola"]["username"] if peran == "pengelola" else "uji-wgd"
    _tulis_akun(pg, peran, username, sandi)
    pg.evaluate(
        """({peran, username}) => {
            const awalan = peran === 'pengelola' ? 'admin' : 'pemilik';
            localStorage.setItem('wgd-' + awalan + '-sesi-v1', JSON.stringify({
              peran,
              username,
              sejak: new Date().toISOString(),
              kedaluwarsa: Date.now() + 3600 * 1000,
            }));
        }""",
        {"peran": peran, "username": username},
    )
    pg.reload(wait_until="load")
    pg.wait_for_timeout(500)


def masuk(pg, peran="pemilik", username=None, sandi="warungku123"):
    """Tempuh alur gerbang seperti manusia: isi nama pengguna & kata sandi.

    Akun ditulis lebih dulu (aplikasi tidak lagi punya akun bawaan), lalu
    formulir diisi dan dikirim.
    """
    if username is None:
        username = AKUN_UJI["pengelola"]["username"] if peran == "pengelola" else "uji-wgd"
    _tulis_akun(pg, peran, username, sandi)
    pg.wait_for_selector(".gerbang", timeout=8000)
    pg.fill("#gbNamaPengguna", username)
    pg.fill("#gbSandi", sandi)
    pg.click("#gbForm button[type=submit]")
    pg.wait_for_timeout(1200)
    pg.wait_for_selector(".gerbang", state="detached", timeout=8000)


# Nama lama dipertahankan agar uji lama tetap jalan.
lewati_gerbang = masuk
