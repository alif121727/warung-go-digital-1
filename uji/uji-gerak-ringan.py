#!/usr/bin/env python3
"""uji-gerak-ringan.py — menjaga agar gerak di beranda tetap ringan.

Kenapa uji ini ada
──────────────────
Halaman pernah terasa tersendat walau animasinya "cuma" transform dan
opacity. Penyebabnya dua hal yang tidak kelihatan saat membaca kode:

  1. Animasi yang menggerakkan properti yang TIDAK bisa di-composite
     (`background-position`, `--var` terdaftar, `width`, `filter` pada
     lapisan besar). Properti seperti itu memaksa peramban menghitung ulang
     gaya dan menggambar ulang tiap bingkai, terus-menerus.
  2. Loop gambar (kanvas, pengejar kursor) yang berjalan selamanya walau
     tidak ada yang berubah di layar.

Keduanya tidak terlihat dari FPS saja, dan tidak akan tertangkap uji biasa.
Karena itu uji ini mengukur dua hal yang langsung berhubungan dengan
"ngelag":

  - berapa banyak animasi berjalan yang tidak bisa di-composite
  - berapa banyak waktu CPU yang dipakai saat halaman benar-benar diam

Ambangnya sengaja longgar supaya tidak gagal karena derau mesin, tetapi
cukup ketat untuk menangkap bila beban kembali seperti semula.
"""
import statistics
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

AKAR = Path(__file__).resolve().parent.parent
BERANDA = (AKAR / "warung-go-digital" / "index.html").as_uri()
CHROME = "/usr/bin/chromium"

lulus = 0
gagal = 0


def cek(nama, benar, info=""):
    global lulus, gagal
    if benar:
        lulus += 1
        print(f"LULUS {nama}")
    else:
        gagal += 1
        print(f"GAGAL {nama}  {info}")


# Properti yang bisa dijalankan penggabung gambar tanpa menyentuh main-thread.
BISA_COMPOSITE = {
    "transform", "opacity", "translate", "scale", "rotate",
    "filter", "backdropFilter", "backdrop-filter",
}
# Kunci meta pada keyframes yang bukan properti.
BUKAN_PROPERTI = {"offset", "computedOffset", "easing", "composite"}

# Animasi non-composite yang DIBENARKAN, beserta alasannya.
#
# `ax-sheen` menggerakkan `background-position` pada satu baris teks
# bergradasi. Itu memang tidak bisa di-composite. Tetapi diukur: mematikannya
# hanya mengubah recalc dari 67 menjadi 68 dalam 2 detik, dan CPU-nya masuk
# derau mesin (318 vs 339 ms/detik). Jadi biayanya tidak terukur, sedangkan
# efek matanya adalah ciri khas halaman. Karena itu dipertahankan — tetap
# denga catatan, supaya tidak diam-diam bertambah.
DIBENARKAN = {"ax-sheen"}


def buka(p, lewati_pembuka=True):
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    ctx = b.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2, is_mobile=True, has_touch=True,
    )
    if lewati_pembuka:
        # Pengunjung yang sudah menutup video pembuka. Tanpa ini seluruh
        # animasi dibekukan oleh `.pembuka-aktif`, sehingga yang terukur
        # justru videonya, bukan animasinya.
        ctx.add_init_script(
            "try{sessionStorage.setItem('wgd-pembuka','1')}catch(e){}")
    pg = ctx.new_page()
    pg.goto(BERANDA, wait_until="load")
    pg.wait_for_timeout(2500)
    return b, ctx, pg


def main():
    with sync_playwright() as p:
        # ── 1. Tidak ada animasi berat yang berjalan terus ──────
        b, ctx, pg = buka(p)
        berat = pg.evaluate(
            """([bukan, dibenarkan])=>{
              const hasil=[];
              for(const a of document.getAnimations()){
                const t=a.effect&&a.effect.target;
                // Animasi pada elemen tersembunyi tidak menggambar apa pun.
                if(t && t.getClientRects().length===0) continue;
                let kunci=[];
                try{
                  kunci=[...a.effect.getKeyframes()]
                    .flatMap(k=>Object.keys(k))
                    .filter(k=>!bukan.includes(k));
                }catch(e){ continue; }
                const unik=[...new Set(kunci)];
                if(!unik.length) continue;
                const ringan=unik.every(k=>['transform','opacity','translate',
                  'scale','rotate','filter','backdropFilter'].includes(k));
                const namaAnim=a.animationName||'(transisi)';
                if(!ringan && !dibenarkan.includes(namaAnim)) hasil.push({
                  nama:namaAnim,
                  el:t?(t.className||t.tagName).toString().slice(0,60):'-',
                  properti:unik.join(','),
                });
              }
              return hasil;
            }""",
            [list(BUKAN_PROPERTI), sorted(DIBENARKAN)],
        )
        cek("gerak: tidak ada animasi non-composite yang berjalan",
            len(berat) == 0, berat[:3])

        # ── 2. Halaman diam benar-benar berhenti ────────────────
        # Diukur setelah semua animasi masuk selesai, saat pengunjung
        # hanya membaca.
        cdp = ctx.new_cdp_session(pg)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        pg.wait_for_timeout(1200)
        contoh = []
        for _ in range(3):
            cdp.send("Performance.enable")
            a = {m["name"]: m["value"]
                 for m in cdp.send("Performance.getMetrics")["metrics"]}
            pg.wait_for_timeout(2000)
            z = {m["name"]: m["value"]
                 for m in cdp.send("Performance.getMetrics")["metrics"]}
            contoh.append((z["TaskDuration"] - a["TaskDuration"]) * 1000 / 2)
        cpu = statistics.median(contoh)
        print(f"      CPU saat diam: {[round(x) for x in contoh]} "
              f"median {cpu:.0f} ms/detik")
        # Sebelum diperbaiki angkanya 351-360 ms/detik; sesudahnya 297-322.
        # Ambang 340 duduk di antara keduanya: cukup longgar untuk derau
        # mesin, cukup ketat untuk menangkap bila beban kembali naik.
        cek("gerak: CPU saat diam di bawah 340 ms/detik", cpu < 340,
            f"{cpu:.0f} ms/detik")

        # ── 3. Tidak ada animasi non-composite yang berjalan ───
        # Sudah diperiksa di bagian 1, tetapi diulang setelah halaman
        # menganggur: animasi yang muncul belakangan (mis. setelah
        # pengamat kemunculan menyala) juga harus ringan.
        berat2 = pg.evaluate(
            """([bukan, dibenarkan])=>{
              const hasil=[];
              for(const a of document.getAnimations()){
                const t=a.effect&&a.effect.target;
                if(t && t.getClientRects().length===0) continue;
                let kunci=[];
                try{
                  kunci=[...a.effect.getKeyframes()]
                    .flatMap(k=>Object.keys(k))
                    .filter(k=>!bukan.includes(k));
                }catch(e){ continue; }
                const unik=[...new Set(kunci)];
                if(!unik.length) continue;
                const ringan=unik.every(k=>['transform','opacity','translate',
                  'scale','rotate','filter','backdropFilter'].includes(k));
                const namaAnim=a.animationName||'(transisi)';
                if(!ringan && !dibenarkan.includes(namaAnim)) hasil.push({
                  nama:namaAnim,
                  properti:unik.join(','),
                });
              }
              return hasil;
            }""",
            [list(BUKAN_PROPERTI), sorted(DIBENARKAN)],
        )
        cek("gerak: setelah menganggur tetap tidak ada animasi berat",
            len(berat2) == 0, berat2[:3])

        # ── 4. Kanvas berhenti saat tab disembunyikan ──────────
        # Hiasan tidak boleh memakai baterai saat tidak dilihat.
        pg.evaluate("""()=>{
          Object.defineProperty(document,'hidden',{value:true,configurable:true});
          document.dispatchEvent(new Event('visibilitychange'));
        }""")
        pg.wait_for_timeout(400)
        diam = pg.evaluate("""async ()=>{
          const c=document.querySelector('.ax-kanvas');
          if(!c) return true;
          const ctx=c.getContext('2d');
          const a=ctx.getImageData(0,0,c.width,c.height).data.join('');
          await new Promise(r=>setTimeout(r,400));
          return ctx.getImageData(0,0,c.width,c.height).data.join('')===a;
        }""")
        cek("gerak: kanvas berhenti saat tab disembunyikan", diam, diam)
        ctx.close()

        # ── 5. Kurangi gerak mematikan semuanya ────────────────
        b2 = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx2 = b2.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2, is_mobile=True, has_touch=True,
            reduced_motion="reduce",
        )
        ctx2.add_init_script(
            "try{sessionStorage.setItem('wgd-pembuka','1')}catch(e){}")
        pg2 = ctx2.new_page()
        pg2.goto(BERANDA, wait_until="load")
        pg2.wait_for_timeout(2000)
        r = pg2.evaluate("""()=>({
          kanvas:!!document.querySelector('.ax-kanvas'),
          sorot:!!document.querySelector('.ax-spot'),
          tilt:document.querySelectorAll('.ax-tilt').length,
          ikonTersembunyi:[...document.querySelectorAll('.ax-putar')]
            .filter(e=>parseFloat(getComputedStyle(e).opacity)<0.9).length,
        })""")
        cek("kurangi gerak: kanvas tidak dipasang", not r["kanvas"], r["kanvas"])
        cek("kurangi gerak: sorot kursor tidak dipasang", not r["sorot"],
            r["sorot"])
        cek("kurangi gerak: kemiringan 3D tidak dipasang", r["tilt"] == 0,
            r["tilt"])
        cek("kurangi gerak: tidak ada ikon yang ikut tersembunyi",
            r["ikonTersembunyi"] == 0, r["ikonTersembunyi"])
        ctx2.close()

    print()
    print("=" * 64)
    print(f"HASIL GERAK RINGAN: {lulus} lulus, {gagal} gagal, "
          f"dari {lulus + gagal} uji")
    print("=" * 64)
    return 1 if gagal else 0


if __name__ == "__main__":
    sys.exit(main())
