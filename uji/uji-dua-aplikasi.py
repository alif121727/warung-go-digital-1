"""Uji alur dua aplikasi: Pemilik mencatat -> kirim laporan -> Pengelola mengimpor."""
import json, os, tempfile
from playwright.sync_api import sync_playwright

B = "http://localhost:12000/warung-go-digital/"
hasil = []
def cek(nama, ok, info=""):
    hasil.append(bool(ok))
    print(f"{'LULUS' if ok else 'GAGAL'}  {nama:52} {info}")

tmp = tempfile.mkdtemp()

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])

    # ═══ APLIKASI PEMILIK ═══
    ctx = br.new_context(viewport={"width":390,"height":844}, accept_downloads=True, permissions=["clipboard-read","clipboard-write"])
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

    pg.goto(B + "pemilik/", wait_until="load")
    pg.wait_for_timeout(1200)
    cek("pemilik: halaman terbuka", pg.eval_on_selector_all("#view .card", "e=>e.length") > 0)
    cek("pemilik: kunjungan pertama arahkan ke data warung",
        pg.inner_text("#judul").lower().startswith("data warung"), pg.inner_text("#judul"))
    cek("pemilik: tab bawah lengkap 5 (termasuk Sinkron)", pg.eval_on_selector_all(".tabbar__item", "e=>e.length") == 5)

    # isi data warung
    pg.fill("#nama", "Warung Bu Sari")
    pg.fill("#pemilik", "Bu Sari")
    pg.fill("#jenis", "Makanan")
    pg.fill("#wa", "6281200000011")
    pg.fill("#waPengelola", "6289900000022")
    pg.fill("#alamat", "Jl. Melati No. 12, Sleman")
    pg.click("#simpanWarung")
    pg.wait_for_timeout(700)
    w = pg.evaluate("()=>JSON.parse(localStorage.getItem('wgd-pemilik-v1')).warung")
    cek("pemilik: data warung tersimpan", w["nama"] == "Warung Bu Sari", w["nama"])

    # catat penjualan hari ini
    pg.click('[data-tab="catat"]'); pg.wait_for_timeout(700)
    pg.fill("#omzet", "750000")
    pg.fill("#pengeluaran", "200000")
    pg.fill("#trx", "42")
    pg.click("#tambahItem"); pg.wait_for_timeout(300)
    baris = pg.locator("[data-item]").first
    baris.locator('[data-f="nama"]').fill("Nasi Goreng")
    baris.locator('[data-f="jumlah"]').fill("18")
    baris.locator('[data-f="harga"]').fill("15000")
    pg.click("#simpan")
    pg.wait_for_timeout(800)
    ct = pg.evaluate("()=>JSON.parse(localStorage.getItem('wgd-pemilik-v1')).catatan")
    cek("pemilik: catatan tersimpan", len(ct) == 1 and ct[0]["omzet"] == 750000, json.dumps(ct[0] if ct else {})[:70])
    cek("pemilik: rincian barang ikut tersimpan", ct and ct[0]["item"] and ct[0]["item"][0]["nama"] == "Nasi Goreng")
    cek("pemilik: format ribuan pada input", pg.eval_on_selector("#omzet", "e=>e.value") == "750.000", pg.eval_on_selector("#omzet","e=>e.value"))


    # riwayat
    pg.click('[data-tab="riwayat"]'); pg.wait_for_timeout(800)
    teks = pg.inner_text("#view")
    cek("riwayat: menampilkan total", "750.000" in teks)
    cek("riwayat: menampilkan barang terlaris", "Nasi Goreng" in teks)
    cek("riwayat: tanpa NaN/undefined", "NaN" not in teks and "undefined" not in teks)

    # kirim -> unduh berkas
    pg.click('[data-tab="kirim"]'); pg.wait_for_timeout(800)
    with pg.expect_download() as dl:
        pg.click("#unduh")
    unduhan = dl.value
    berkas = os.path.join(tmp, "laporan.json")
    unduhan.save_as(berkas)
    laporan = json.load(open(berkas))
    cek("kirim: berkas laporan diunduh", os.path.getsize(berkas) > 100, f"{os.path.getsize(berkas)} bita")
    cek("kirim: penanda & jenis benar", laporan.get("wgd") == 1 and laporan.get("jenis") == "laporan-harian")
    cek("kirim: memuat warung & catatan", laporan["warung"]["nama"] == "Warung Bu Sari" and len(laporan["catatan"]) == 1)
    cek("kirim: catatan tanpa data pengelola",
        "wgd-admin-v1" not in json.dumps(laporan))
    cek("pemilik: tanpa error konsol", not errs, str(errs[:2]))

    # kunci penyimpanan terpisah
    kunci_pemilik = pg.evaluate("()=>Object.keys(localStorage)")
    cek("pemilik: hanya memakai kunci pemilik",
        all(k.startswith("wgd-pemilik") for k in kunci_pemilik), str(kunci_pemilik))
    # Mode "lewat pesan" (andal di dalam APK)
    pg.click('[data-cara="pesan"]'); pg.wait_for_timeout(600)
    teks_pesan = pg.inner_text("#caraIsi")
    cek("kirim: mode lewat pesan tersedia", "WhatsApp" in teks_pesan or "pesan" in teks_pesan.lower())
    cek("kirim: tombol salin rincian ada", pg.eval_on_selector_all("#salinRinci", "e=>e.length")==1)
    pg.click("#salinRinci"); pg.wait_for_timeout(500)
    cek("kirim: rincian tersalin ke papan klip", "Rincian harian" in pg.evaluate("()=>navigator.clipboard.readText()"))
    cek("kirim: rincian memuat angka benar", "750.000" in pg.evaluate("()=>navigator.clipboard.readText()"))
    pg.click('[data-cara="berkas"]'); pg.wait_for_timeout(500)
    cek("kirim: bisa kembali ke mode berkas", pg.eval_on_selector_all("#unduh", "e=>e.length")==1)


    # ═══ APLIKASI PENGELOLA ═══
    ctx2 = br.new_context(viewport={"width":390,"height":844})
    pa = ctx2.new_page()
    errs2 = []
    pa.on("pageerror", lambda e: errs2.append(str(e)))
    pa.on("console", lambda m: errs2.append(m.text) if m.type == "error" else None)

    pa.goto(B + "admin/", wait_until="load")
    pa.wait_for_timeout(1200)
    cek("pengelola: keadaan kosong ditampilkan", "Belum ada laporan" in pa.inner_text("#view"))

    pa.set_input_files("#fileImpor", berkas)
    pa.wait_for_timeout(1500)
    teks_a = pa.inner_text("#view")
    cek("pengelola: impor berhasil (mitra muncul)", "Warung Bu Sari" in teks_a, "")
    cek("pengelola: pendapatan hari ini tampil", "750.000" in teks_a)
    cek("pengelola: jumlah mitra benar", "1" in teks_a)

    pa.click('[data-tab="mitra"]'); pa.wait_for_timeout(800)
    teks_m = pa.inner_text("#view")
    cek("pengelola: daftar mitra memuat warung", "Warung Bu Sari" in teks_m)
    cek("pengelola: alamat/lokasi tampil", "Jl. Melati" in teks_m)

    pa.click('[data-tab="peta"]'); pa.wait_for_timeout(800)
    teks_p = pa.inner_text("#view")
    cek("pengelola: tab lokasi memuat alamat", "Jl. Melati" in teks_p)

    # detail mitra
    pa.click('[data-tab="mitra"]'); pa.wait_for_timeout(700)
    pa.click("[data-mitra]"); pa.wait_for_timeout(900)
    teks_d = pa.inner_text("#modal")
    cek("pengelola: detail memuat profil", "Bu Sari" in teks_d and "Jl. Melati" in teks_d)
    cek("pengelola: detail memuat laba", "550.000" in teks_d, "")
    cek("pengelola: tombol peta & chat ada",
        pa.eval_on_selector_all("#modal .btn", "e=>e.length") >= 2)
    pa.click("#modal [data-tutup]"); pa.wait_for_timeout(400)

    # impor ulang (gabung, tidak dobel)
    pa.set_input_files("#fileImpor", berkas)
    pa.wait_for_timeout(1400)
    n_cat = pa.evaluate("()=>Object.values(JSON.parse(localStorage.getItem('wgd-admin-v1')).mitra)[0].catatan.length")
    cek("pengelola: impor ulang tidak menggandakan catatan", n_cat == 1, f"{n_cat} catatan")

    cek("pengelola: kunci terpisah dari pemilik",
        pa.evaluate("()=>Object.keys(localStorage).every(k=>k.startsWith('wgd-admin'))"),
        str(pa.evaluate("()=>Object.keys(localStorage)")))
    cek("pengelola: tanpa error konsol", not errs2, str(errs2[:2]))

    # ═══ KEDUA APLIKASI: muat ulang & offline ═══
    pa.reload(wait_until="load"); pa.wait_for_timeout(1200)
    cek("pengelola: data bertahan setelah muat ulang", "Warung Bu Sari" in pa.inner_text("#view"))

    # ═══ OFFLINE: muat ulang halaman setelah service worker terpasang ═══
    # Tunggu SW aktif lebih dulu.
    pa.wait_for_timeout(2500)
    sw_aktif = pa.evaluate("async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)}")
    cek("pengelola: service worker aktif", sw_aktif)

    # Konteks pemilik: pasang SW, lalu muat ulang halaman tanpa jaringan.
    ctx4 = br.new_context(viewport={"width":390,"height":844})
    p4 = ctx4.new_page()
    p4.goto(B + "pemilik/", wait_until="load")
    p4.wait_for_timeout(2500)
    sw4 = p4.evaluate("async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)}")
    cek("pemilik: service worker aktif", sw4)

    ctx4.set_offline(True)
    p4.reload(wait_until="domcontentloaded")
    p4.wait_for_timeout(1800)
    cek("pemilik: tetap terbuka saat offline", p4.eval_on_selector_all("#view .card", "e=>e.length") > 0,
        p4.inner_text("#judul")[:30])

    ctx4.set_offline(False)
    ctx4.close()

    br.close()

print("\n" + "=" * 66)
print(f"HASIL DUA APLIKASI: {sum(hasil)} lulus, {len(hasil)-sum(hasil)} gagal, dari {len(hasil)} uji")
