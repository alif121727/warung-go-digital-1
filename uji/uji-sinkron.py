"""Uji sinkron otomatis (Cara 1): pemilik mengirim -> pengelola menarik.

Menjalankan server sinkron sungguhan (sinkron/server.mjs) di port 8791,
lalu memakai Chromium untuk kedua aplikasi.

Fokus keamanan: pemilik hanya memegang kunci TULIS. Dengan kunci itu ia
harus tetap TIDAK bisa membaca data mitra lain.
"""
import json, os, subprocess, sys, time, urllib.error, urllib.request

from playwright.sync_api import sync_playwright
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module
bantu = import_module('bantu-masuk')

B = "http://localhost:12000/warung-go-digital/"
PORT = 8791
ALAMAT = f"http://127.0.0.1:{PORT}"
KUNCI_TULIS = "tulis-uji-111"
KUNCI_BACA = "baca-uji-222"
DATA = "/tmp/wgd-uji-sinkron.json"

hasil = []
def cek(nama, ok, info=""):
    hasil.append(bool(ok))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:56} {info}")

def ambil(kunci):
    """GET /api/laporan langsung; mengembalikan (kode, isi)."""
    req = urllib.request.Request(f"{ALAMAT}/api/laporan", headers={"x-kunci-sinkron": kunci})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, {}

env = dict(os.environ, PORT=str(PORT), DATA=DATA,
           KUNCI_TULIS=KUNCI_TULIS, KUNCI_BACA=KUNCI_BACA)
if os.path.exists(DATA):
    os.remove(DATA)
srv = subprocess.Popen(["node", "sinkron/server.mjs"], env=env,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tunggu_server(n=40):
    for _ in range(n):
        try:
            with urllib.request.urlopen(f"{ALAMAT}/api/status", timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False

try:
    cek("server sinkron hidup", tunggu_server())

    with sync_playwright() as p:
        br = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

        # ═══════════ PEMILIK ═══════════
        ctx = br.new_context(viewport={"width": 390, "height": 844})
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(B + "pemilik/", wait_until="load")
        pg.wait_for_timeout(900)
        bantu.masuk_cepat(pg, "pemilik")

        pg.fill("#nama", "Warung Bu Sari")
        pg.fill("#pemilik", "Bu Sari")
        pg.fill("#jenis", "Makanan")
        pg.fill("#wa", "6281200000011")
        pg.fill("#alamat", "Jl. Melati No. 12, Sleman")
        pg.click("#simpanWarung")
        pg.wait_for_timeout(600)

        pg.click('[data-tab="catat"]')
        pg.wait_for_timeout(500)
        pg.fill("#omzet", "750000")
        pg.fill("#pengeluaran", "200000")
        pg.fill("#trx", "42")
        pg.click("#simpan")
        pg.wait_for_timeout(800)

        pg.click('[data-tab="sinkron"]')
        pg.wait_for_timeout(600)
        cek("pemilik: ada tab Sinkron", pg.eval_on_selector_all('[data-tab="sinkron"]', "e=>e.length") == 1)
        cek("pemilik: tidak ada tombol tarik/baca", pg.eval_on_selector_all("#tarikSekarang", "e=>e.length") == 0)

        pg.fill("#alamatSinkron", ALAMAT)
        pg.fill("#kunciSinkron", KUNCI_TULIS)
        pg.click("#simpanSinkron")
        pg.wait_for_timeout(600)
        st = pg.evaluate("()=>JSON.parse(localStorage.getItem('wgd-sinkron-v1'))")
        cek("pemilik: menyimpan alamat + kunci tulis", st["alamat"] == ALAMAT and st["kunci"] == KUNCI_TULIS)

        pg.click("#kirimSekarang")
        pg.wait_for_timeout(2500)
        status = pg.inner_text("#statusSinkron")
        cek("pemilik: kirim manual berhasil", "Terkirim" in status, status.replace("\n", " ")[:64])
        cek("pemilik: tanpa error konsol", not errs, str(errs[:2]))

        # ═══════════ Server: isi & batas akses ═══════════
        kode, isi = ambil(KUNCI_BACA)
        cek("server: pengelola membaca 1 laporan", kode == 200 and isi["jumlah"] == 1, f"kode={kode}")
        cek("server: nama warung tersimpan", isi["laporan"][0]["warung"]["nama"] == "Warung Bu Sari")
        cek("server: catatan harian tersimpan",
            len(isi["laporan"][0]["catatan"]) == 1 and isi["laporan"][0]["catatan"][0]["omzet"] == 750000)

        kode_t, isi_t = ambil(KUNCI_TULIS)
        cek("PENTING: kunci tulis TIDAK bisa membaca data mitra",
            kode_t == 401 and not isi_t.get("laporan"), f"kode={kode_t}")

        kode_s, _ = ambil("kunci-ngawur")
        cek("kunci ngawur ditolak", kode_s == 401, f"kode={kode_s}")

        # ═══════════ PENGELOLA ═══════════
        ctx2 = br.new_context(viewport={"width": 390, "height": 844})
        pg2 = ctx2.new_page()
        errs2 = []
        pg2.on("pageerror", lambda e: errs2.append(str(e)))
        pg2.goto(B + "admin/", wait_until="load")
        pg2.wait_for_timeout(900)
        bantu.masuk_cepat(pg2, "pengelola")

        pg2.click('[data-tab="sinkron"]')
        pg2.wait_for_timeout(600)
        cek("pengelola: ada tab Sinkron", pg2.eval_on_selector_all('[data-tab="sinkron"]', "e=>e.length") == 1)
        cek("pengelola: tidak ada tombol kirim", pg2.eval_on_selector_all("#kirimSekarang", "e=>e.length") == 0)

        pg2.fill("#alamatSinkron", ALAMAT)
        pg2.fill("#kunciSinkron", KUNCI_BACA)
        pg2.click("#simpanSinkron")
        pg2.wait_for_timeout(600)

        # Kunci tulis (milik pemilik) harus ditolak saat menarik.
        pg2.fill("#kunciSinkron", KUNCI_TULIS)
        pg2.click("#simpanSinkron")
        pg2.wait_for_timeout(400)
        pg2.click("#tarikSekarang")
        pg2.wait_for_timeout(1800)
        cek("pengelola: ditolak saat memakai kunci tulis", "Kunci" in pg2.inner_text("#statusSinkron"),
            pg2.inner_text("#statusSinkron").replace("\n", " ")[:60])

        pg2.fill("#kunciSinkron", KUNCI_BACA)
        pg2.click("#simpanSinkron")
        pg2.wait_for_timeout(400)
        pg2.click("#tarikSekarang")
        pg2.wait_for_timeout(2500)

        d = pg2.evaluate("()=>JSON.parse(localStorage.getItem('wgd-admin-v1'))")
        m = list((d.get("mitra") or {}).values())[0] if d.get("mitra") else {}
        cek("pengelola: mitra masuk dari server", len(d.get("mitra") or {}) == 1)
        cek("pengelola: melihat nama warung pemilik", (m.get("warung") or {}).get("nama") == "Warung Bu Sari")
        cek("pengelola: melihat omzet harian pemilik", (m.get("catatan") or [{}])[0].get("omzet") == 750000)
        cek("pengelola: melihat tempat jualan", (m.get("warung") or {}).get("alamat") == "Jl. Melati No. 12, Sleman")

        pg2.click('[data-tab="ringkasan"]')
        pg2.wait_for_timeout(900)
        teks = pg2.inner_text("#view")
        cek("pengelola: ringkasan memuat omzet", "750.000" in teks)
        cek("pengelola: tanpa NaN/undefined", "NaN" not in teks and "undefined" not in teks)
        cek("pengelola: tanpa error konsol", not errs2, str(errs2[:2]))
        ctx2.close()

        # ═══════════ Pemilik (perangkat yang sama) mengubah tanggal yang sama ═══════════
        pg.click('[data-tab="catat"]')
        pg.wait_for_timeout(500)
        pg.fill("#omzet", "900000")
        pg.click("#simpan")
        pg.wait_for_timeout(900)
        pg.click('[data-tab="sinkron"]')
        pg.wait_for_timeout(400)
        pg.click("#kirimSekarang")
        pg.wait_for_timeout(2500)
        cek("pemilik: kirim ulang berhasil", "Terkirim" in pg.inner_text("#statusSinkron"))
        ctx.close()
        br.close()

    kode, isi2 = ambil(KUNCI_BACA)
    cat = isi2["laporan"][0]["catatan"] if isi2.get("laporan") else []
    cek("server: tanggal sama ditimpa, tidak menumpuk",
        len(isi2.get("laporan", [])) == 1 and len(cat) == 1 and cat[0]["omzet"] == 900000,
        f"mitra={len(isi2.get('laporan', []))} hari={len(cat)}")

finally:
    srv.terminate()
    try:
        srv.wait(timeout=5)
    except Exception:
        srv.kill()

print("=" * 66)
lulus = sum(hasil)
print(f"HASIL SINKRON: {lulus} lulus, {len(hasil)-lulus} gagal, dari {len(hasil)} uji")
sys.exit(0 if lulus == len(hasil) else 1)
