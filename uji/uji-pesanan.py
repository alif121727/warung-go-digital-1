"""Uji fitur QR 3-in-1: menu (terlaris di atas) + penilaian + pesanan/pembayaran.

Menjalankan server sinkron asli (sinkron/server.mjs) supaya alurnya nyata:
pelanggan memesan di satu konteks peramban, pemilik menerimanya di konteks lain.

Jalankan dari /workspace/repo dengan:
    python3 uji/uji-pesanan.py
"""
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

bantu = import_module('bantu-masuk')

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = "http://localhost:12000/warung-go-digital/"
ID = "wr-uji-9"  # kode warung khusus uji
BERKAS_MENU = os.path.join(AKAR, "warung-go-digital", "menu", ID + ".json")
hasil = []


def cek(nama, ok, info=""):
    hasil.append(bool(ok))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:56} {info}")


def port_bebas():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def tunggu_server(port, batas=15):
    for _ in range(batas * 10):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/status", timeout=2) as r:
                if json.loads(r.read().decode()).get("ok"):
                    return True
        except Exception:
            time.sleep(0.1)
    return False


def api(port, jalur, data=None, kunci=None):
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{jalur}",
        method="POST" if data is not None else "GET",
    )
    if data is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(data).encode()
    if kunci:
        req.add_header("x-kunci-sinkron", kunci)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


PORT = port_bebas()
DIR = tempfile.mkdtemp()
KUNCI_TULIS, KUNCI_BACA = "uji-tulis", "uji-baca"
server = subprocess.Popen(
    ["node", "sinkron/server.mjs"],
    cwd=AKAR,
    env={
        **os.environ,
        "PORT": str(PORT),
        "DATA": os.path.join(DIR, "laporan.json"),
        "KUNCI_TULIS": KUNCI_TULIS,
        "KUNCI_BACA": KUNCI_BACA,
    },
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

WARUNG = {
    "id": ID, "nama": "Warung Bu Sari", "pemilik": "Bu Sari",
    "wa": "628123456789", "waPengelola": "628999999999",
    "alamat": "Jl. Melati 12", "jenis": "Makanan",
    "menu": [
        {"id": "m1", "nama": "Nasi Goreng Spesial", "harga": 15000, "kategori": "Makanan", "ket": ""},
        {"id": "m2", "nama": "Es Teh Manis", "harga": 5000, "kategori": "Minuman", "ket": ""},
    ],
    "bayar": {"bank": "BCA", "nomor": "1234567890", "atasNama": "Sari Wulandari"},
    # Catatan harian: Nasi Goreng terjual 40, Es Teh 10 → urutan laris dari sini.
    "catatan": [{
        "tgl": "2026-11-15", "omzet": 650000, "pengeluaran": 100000, "jumlahTransaksi": 30,
        "item": [
            {"nama": "Nasi Goreng Spesial", "jumlah": 40, "harga": 15000},
            {"nama": "Es Teh Manis", "jumlah": 10, "harga": 5000},
        ],
    }],
}

try:
    if not tunggu_server(PORT):
        print("GAGAL: server sinkron tidak menyala")
        sys.exit(1)

    # ═══ Uji server langsung ═══
    kode, h = api(PORT, "/api/pesanan", {
        "wgd": 3, "jenis": "pesanan", "id": "ps-server-1", "warungId": ID,
        "nama": "Uji", "item": [{"nama": "Nasi Goreng Spesial", "harga": 15000, "jumlah": 2}],
    })
    cek("server: pesanan dari pelanggan diterima tanpa kunci", kode == 200 and h["total"] == 30000)

    kode, _ = api(PORT, "/api/pesanan", {"jenis": "salah"})
    cek("server: bentuk pesanan tidak sah ditolak", kode == 400)

    kode, _ = api(PORT, f"/api/pesanan?w={ID}")
    cek("server: daftar pesanan butuh kunci", kode == 401)

    kode, h = api(PORT, f"/api/pesanan?w={ID}", kunci=KUNCI_BACA)
    p0 = h["pesanan"][0]
    fmt = "%Y-%m-%dT%H:%M:%S"
    selisih = (time.mktime(time.strptime(p0["batas"][:19], fmt))
               - time.mktime(time.strptime(p0["dibuat"][:19], fmt)))
    cek("server: batas bayar tepat 30 menit", abs(selisih - 1800) < 2, f"{selisih:.0f}s")

    # Pelanggan memakai endpoint terbuka — status 'lunas' tidak boleh diterima.
    kode, h = api(PORT, "/api/pesanan", {
        "wgd": 3, "jenis": "pesanan", "id": "ps-curang", "warungId": ID,
        "nama": "Curang", "status": "lunas",
        "item": [{"nama": "Es Teh Manis", "harga": 5000, "jumlah": 1}],
    })
    cek("server: pelanggan tidak bisa menandai lunas sendiri", kode == 200 and h.get("status") != "lunas")

    # Pesanan yang sudah lunas tidak boleh diturunkan oleh kiriman pelanggan.
    api(PORT, "/api/pesanan-ubah", {"id": "ps-server-1", "warungId": ID, "status": "lunas"}, kunci=KUNCI_BACA)
    api(PORT, "/api/pesanan", {
        "wgd": 3, "jenis": "pesanan", "id": "ps-server-1", "warungId": ID,
        "nama": "Uji", "status": "menunggu",
        "item": [{"nama": "Nasi Goreng Spesial", "harga": 15000, "jumlah": 2}],
    })
    kode, h = api(PORT, f"/api/pesanan?w={ID}", kunci=KUNCI_BACA)
    st = next(x["status"] for x in h["pesanan"] if x["id"] == "ps-server-1")
    cek("server: status lunas tidak bisa diturunkan pelanggan", st == "lunas", st)

    kode, _ = api(PORT, "/api/pesanan-ubah",
                  {"id": "ps-server-1", "warungId": "wr-999", "status": "lunas"}, kunci=KUNCI_BACA)
    cek("server: warung lain tidak bisa ubah pesanan", kode == 403)

    kode, h = api(PORT, "/api/pesanan-ubah",
                  {"id": "ps-server-1", "warungId": ID, "status": "lunas"}, kunci=KUNCI_BACA)
    cek("server: pemilik bisa menandai lunas", kode == 200 and h["status"] == "lunas")

    kode, _ = api(PORT, "/api/laporan", {
        "wgd": 1, "jenis": "laporan-harian", "dibuat": "2026-11-15T10:00:00.000Z",
        "warung": WARUNG, "catatan": WARUNG["catatan"],
    }, kunci=KUNCI_TULIS)
    cek("server: laporan pemilik diterima", kode == 200)

    kode, h = api(PORT, f"/api/menu?id={ID}")
    laris = {m["nama"]: m.get("laris") for m in h["menu"]}
    cek("server: /api/menu menghitung terjual per item",
        laris.get("Nasi Goreng Spesial") == 40 and laris.get("Es Teh Manis") == 10, str(laris))
    cek("server: tujuan bayar ikut keluar",
        (h["warung"].get("bayar") or {}).get("nomor") == "1234567890")

    # Berkas menu terbit: inilah yang dibaca HP pelanggan. Memuat alamat server
    # supaya pesanan bisa dikirim tanpa pelanggan mengisi apa pun.
    os.makedirs(os.path.dirname(BERKAS_MENU), exist_ok=True)
    with open(BERKAS_MENU, "w", encoding="utf-8") as f:
        json.dump({
            "wgd": 2, "jenis": "menu-publik",
            "server": f"http://127.0.0.1:{PORT}",
            "warung": {
                "id": ID, "nama": WARUNG["nama"], "pemilik": WARUNG["pemilik"],
                "wa": WARUNG["wa"], "alamat": WARUNG["alamat"], "kategori": WARUNG["jenis"],
                "bayar": WARUNG["bayar"],
            },
            "menu": [dict(m, foto=None) for m in WARUNG["menu"]],
        }, f, ensure_ascii=False)

    with sync_playwright() as p:
        br = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

        # ═══ Halaman menu (pembeli) ═══
        pgB = br.new_context(viewport={"width": 390, "height": 844}).new_page()
        errB = []
        pgB.on("pageerror", lambda e: errB.append(str(e)))
        pgB.on("console", lambda m: errB.append(m.text) if m.type == "error" else None)
        pgB.goto(B + f"app/menu.html?w={ID}", wait_until="load")
        pgB.wait_for_timeout(1500)

        cek("pembeli: tiga tab tersedia",
            pgB.eval_on_selector_all(".tabbtn", "e=>e.length") == 3,
            str(pgB.eval_on_selector_all(".tabbtn", "e=>e.map(x=>x.textContent.trim())")))
        cek("pembeli: daftar menu tampil",
            pgB.eval_on_selector_all("#isiMenu .item", "e=>e.length") >= 2)
        cek("pembeli: alamat server dari berkas menu tersimpan",
            pgB.evaluate("()=>localStorage.getItem('wgd-menu-server')") == f"http://127.0.0.1:{PORT}")

        tb = pgB.locator("#isiMenu .item [data-tambah]")
        tb.nth(0).click(); pgB.wait_for_timeout(200)
        tb.nth(0).click(); pgB.wait_for_timeout(200)
        tb.nth(1).click(); pgB.wait_for_timeout(250)
        cek("pembeli: lencana keranjang menghitung item", pgB.text_content("#nKeranjang") == "3")
        pgB.click("#kbBayar"); pgB.wait_for_timeout(400)
        cek("pembeli: total keranjang benar", pgB.text_content(".total__nilai") == "Rp 35.000",
            pgB.text_content(".total__nilai"))
        cek("pembeli: baris pesanan tampil",
            pgB.eval_on_selector_all("#tabBayar .kbaris", "e=>e.length") == 2)

        pgB.click("#btnPesan"); pgB.wait_for_timeout(600)
        cek("pembeli: pesanan tanpa nama ditolak",
            pgB.eval_on_selector_all("#tabBayar .notis--hijau", "e=>e.length") == 0)

        pgB.fill("#namaPelanggan", "Rina")
        pgB.fill("#mejaPelanggan", "Meja 3")
        pgB.click("#btnPesan"); pgB.wait_for_timeout(2000)
        cek("pembeli: pesanan terkirim ke pemilik", "Pesanan terkirim" in pgB.content())

        pgB.click(".tabbtn[data-tab='nilai']"); pgB.wait_for_timeout(400)
        cek("pembeli: kartu penilaian per hidangan",
            pgB.eval_on_selector_all(".nilai__kartu", "e=>e.length") >= 2)
        cek("pembeli: peta warung tersedia",
            "google.com/maps" in (pgB.get_attribute("#tabNilai a.btn", "href") or ""))
        pgB.locator(".nilai__kartu .bintang button").nth(3).click()
        pgB.wait_for_timeout(400)
        bintang = pgB.evaluate(
            "()=>{const s=JSON.parse(localStorage.getItem('wgd-nilai-v1'))['" + ID + "'];"
            "const k=Object.keys(s)[0];return s[k].bintang;}")
        cek("pembeli: bintang tersimpan di perangkat", bintang == 4, str(bintang))

        # ═══ Aplikasi pemilik ═══
        pgP = br.new_context(viewport={"width": 390, "height": 844}).new_page()
        errP = []
        pgP.on("pageerror", lambda e: errP.append(str(e)))
        pgP.on("console", lambda m: errP.append(m.text) if m.type == "error" else None)
        pgP.goto(B + "pemilik/", wait_until="load")
        pgP.wait_for_timeout(1200)
        bantu.masuk_cepat(pgP, "pemilik")
        pgP.wait_for_timeout(800)

        cek("pemilik: tab Pesanan ada",
            pgP.eval_on_selector_all(".tabbar__item[data-tab='pesanan']", "e=>e.length") == 1)
        cek("pemilik: tab Menu ada",
            pgP.eval_on_selector_all(".tabbar__item[data-tab='menu']", "e=>e.length") == 1)

        pgP.evaluate(
            """(w) => {
                const d = JSON.parse(localStorage.getItem('wgd-pemilik-v1') || '{}');
                d.warung = w;
                localStorage.setItem('wgd-pemilik-v1', JSON.stringify(d));
            }""", WARUNG)
        pgP.evaluate(
            """(s) => localStorage.setItem('wgd-sinkron-v1', JSON.stringify(s))""",
            {"alamat": f"http://127.0.0.1:{PORT}", "kunci": KUNCI_TULIS, "kunciBaca": KUNCI_BACA})
        pgP.reload(wait_until="load"); pgP.wait_for_timeout(1200)

        pgP.click(".tabbar__item[data-tab='pesanan']"); pgP.wait_for_timeout(600)
        pgP.click("#tarikPesanan"); pgP.wait_for_timeout(1500)
        isi = pgP.text_content("#view")
        cek("pemilik: melihat pesanan Rina", "Rina" in isi)
        cek("pemilik: pesanan pelanggan berstatus sudah-bayar",
            pgP.evaluate("""() => {
                const d = JSON.parse(localStorage.getItem('wgd-pesanan-pemilik-v1') || '[]');
                const p = d.find(x => x.nama === 'Rina');
                return p ? p.status : null;
            }""") == 'dibayar-klaim')
        cek("pemilik: melihat total pesanan", "35.000" in isi)
        cek("pemilik: lencana tabbar muncul",
            pgP.eval_on_selector_all(".tabbar__badge", "e=>e.length") >= 1)

        bunyi = pgP.evaluate(
            """async () => {
                let osilator = 0;
                const AC = window.AudioContext || window.webkitAudioContext;
                const asli = AC.prototype.createOscillator;
                AC.prototype.createOscillator = function () { osilator++; return asli.call(this); };
                const ucapan = [];
                const speak = window.speechSynthesis.speak.bind(window.speechSynthesis);
                window.speechSynthesis.speak = (u) => { ucapan.push(u.text); return speak(u); };
                Bunyi.pembayaran(35000);
                await new Promise(r => setTimeout(r, 1500));
                return { osilator, ucapan };
            }""")
        cek("notifikasi: kicauan burung dibuat (4 nada)", bunyi["osilator"] == 4, str(bunyi["osilator"]))
        cek("notifikasi: ucapan menyebut jumlahnya",
            bool(bunyi["ucapan"]) and "Pembayaran diterima sejumlah 35.000 rupiah" in bunyi["ucapan"][0],
            str(bunyi["ucapan"]))
        cek("pemilik: tombol uji bunyi tersedia",
            pgP.eval_on_selector_all("#ujiBunyi", "e=>e.length") == 1)

        pgP.locator("[data-lunas]").first.click(); pgP.wait_for_timeout(1800)
        cek("pemilik: bisa menandai uang sudah masuk",
            "Sudah lunas" in pgP.text_content("#view"))

        # ═══ Editor menu & cara pembayaran ═══
        pgP.click(".tabbar__item[data-tab='menu']"); pgP.wait_for_timeout(700)
        cek("pemilik: editor menu tampil",
            pgP.eval_on_selector_all("#daftarMenu [data-baris]", "e=>e.length") == 2)
        cek("pemilik: isian cara pembayaran tampil", pgP.input_value("#bNomor") == "1234567890")
        pgP.click("#tambahMenu"); pgP.wait_for_timeout(500)
        cek("pemilik: bisa menambah item menu",
            pgP.eval_on_selector_all("#daftarMenu [data-baris]", "e=>e.length") == 3)

        # ═══ Pesanan lewat 30 menit terdeteksi ═══
        pgP.evaluate(
            """async (srv) => {
                const lama = new Date(Date.now() - 40 * 60000).toISOString();
                await fetch(srv + '/api/pesanan', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wgd: 3, jenis: 'pesanan', id: 'ps-lewat',
                        warungId: '""" + ID + """', dibuat: lama, nama: 'Tamu Lama',
                        item: [{ nama: 'Es Teh Manis', harga: 5000, jumlah: 1 }] }),
                });
            }""", f"http://127.0.0.1:{PORT}")
        pgP.click(".tabbar__item[data-tab='pesanan']"); pgP.wait_for_timeout(400)
        pgP.click("#tarikPesanan"); pgP.wait_for_timeout(1800)
        isi = pgP.text_content("#view")
        cek("pemilik: pesanan lewat 30 menit ditandai",
            "lewat batas 30 menit" in isi or "Belum bayar · lewat" in isi,
            isi[:110].replace("\n", " "))
        cek("pemilik: penghitung 'Lewat 30 menit' naik",
            pgP.evaluate("""() => {
                const s = [...document.querySelectorAll('#view .stat')];
                const t = s.find(x => x.textContent.includes('Lewat 30 menit'));
                return t ? parseInt(t.querySelector('.stat__val').textContent, 10) : -1;
            }""") >= 1)

        # ═══ Notifikasi pembayaran dari alur nyata ═══
        pgP.evaluate("""() => {
            window.__bunyi = [];
            const asli = Bunyi.pembayaran;
            Bunyi.pembayaran = (n) => { window.__bunyi.push(n); return asli(n); };
            const asli2 = Bunyi.pesananBaru;
            Bunyi.pesananBaru = () => { window.__bunyi.push('pesanan-biasa'); return asli2(); };
        }""")
        # Pembeli baru memesan (klaim bayar) → pemilik harus mendengar
        # notifikasi pembayaran, bukan notifikasi pesanan biasa.
        pgB.click(".tabbtn[data-tab='menu']"); pgB.wait_for_timeout(500)
        tb2 = pgB.locator("#isiMenu .item [data-tambah]")
        tb2.nth(0).click(); pgB.wait_for_timeout(250)
        pgB.click("#kbBayar"); pgB.wait_for_timeout(400)
        pgB.fill("#namaPelanggan", "Sinta")
        pgB.click("#btnPesan"); pgB.wait_for_timeout(1500)
        pgP.click(".tabbar__item[data-tab='pesanan']"); pgP.wait_for_timeout(400)
        pgP.click("#tarikPesanan"); pgP.wait_for_timeout(1800)
        dipanggil = pgP.evaluate("() => window.__bunyi")
        cek("notifikasi: alur nyata memicu bunyi pembayaran",
            dipanggil == [15000], str(dipanggil))

        cek("tanpa error konsol (pembeli)", not errB, str(errB[:2]))
        cek("tanpa error konsol (pemilik)", not errP, str(errP[:2]))
        br.close()

finally:
    try:
        os.remove(BERKAS_MENU)
    except OSError:
        pass
    server.terminate()
    try:
        server.wait(timeout=5)
    except Exception:
        server.kill()
    shutil.rmtree(DIR, ignore_errors=True)

lulus = sum(hasil)
print("\n" + "=" * 62)
print(f"HASIL PESANAN: {lulus} lulus, {len(hasil) - lulus} gagal, dari {len(hasil)} uji")
print("=" * 62)
sys.exit(0 if lulus == len(hasil) else 1)
