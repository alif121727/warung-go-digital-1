#!/usr/bin/env python3
"""Buat ulang klip video bagian "Cerita Bu Tini" dari satu video sumber.

Jalankan:  python3 buat-video-cerita.py [video-sumber.mp4]
Hasil:     warung-go-digital/video/cerita-1..6.{mp4,jpg}

Empat hal yang dijaga berkas ini
--------------------------------
1. **Watermark dibuang.** Video sumber membawa watermark "Kling AI" di sudut
   kanan bawah. Kotaknya ditimpa penapis `delogo` (diisi dari piksel
   sekelilingnya), jadi tidak terlihat lagi.

2. **Tiap klip hanya memakai adegannya sendiri.** Video sumber punya enam
   adegan yang dipisahkan potongan gambar. Tiap klip memotong DI DALAM batas
   adegannya — bukan jendela yang melintasi batas. Inilah yang membuat isi
   klip cocok dengan teksnya; jendela yang tumpang-tindih membuat adegan
   tetangga ikut tampil.

3. **Tiap klip pas dengan ceritanya.** Tiap adegan di sumber panjangnya beda
   (0,29-1,38 detik). Gerak lambatnya diatur supaya satu siklus bolak-balik
   berlangsung ~2,5 detik, lalu klip dibuat sekitar lima siklus. Hasilnya klip
   pendek untuk adegan pendek (12-26 detik), jadi tidak ada video yang berlebih.

4. **Penutup bermerek.** Adegan terakhir disusul kartu penutup singkat yang
   menampilkan lambang dan nama "Warung Go Digital", jadi cerita berakhir
   dengan jelas, bukan terpotong.

Butuh ffmpeg. Bila belum ada:  pip install imageio-ffmpeg
"""

import os
import re
import shutil
import subprocess
import sys

AKAR = os.path.dirname(os.path.abspath(__file__))
SITUS = os.path.join(AKAR, "warung-go-digital")
KELUARAN = os.path.join(SITUS, "video")
SUMBER_BAWAAN = os.path.join(AKAR, "video-sumber-cerita.mp4")
FONT_TEBAL = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_BIASA = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# Kotak watermark "Kling AI" (video 1280x720). Diberi kelonggaran, tetapi tetap
# di dalam bingkai — `delogo` menolak kotak yang menyentuh tepi gambar.
WM = dict(x=940, y=640, w=330, h=70)

# Batas potongan adegan di video sumber (detik), hasil deteksi pergantian
# gambar. Tiap klip memotong di dalam satu rentang saja.
BATAS = [0.0, 0.833, 1.375, 1.667, 2.375, 3.75, 5.04]

SISI = 0.05          # jarak aman dari batas adegan (detik)
MIN_JENDELA = 0.24   # jendela terpendek agar gerakannya masih terbaca
LAMBAT_DASAR = 1.4   # gerak lambat terendah (adegan panjang)
LAMBAT_MAKS = 4.0    # gerak lambat tertinggi (adegan sangat pendek)
SIKLUS_TARGET = 2.5  # lama satu siklus bolak-balik (detik)
SIKLUS = 5           # jumlah siklus per klip
LEBAR = 854          # lebar keluaran (480p)
TINGGI = 480
FPS = 25
ZUM = 0.06           # tambahan zum sepanjang klip
DURASI_MIN, DURASI_MAKS = 12, 26
DURASI_PENUTUP = 2.0  # kartu penutup bermerek (detik)

# Warna merek, sepadan dengan styles.css.
INK, AMBER, CLAY, CREAM = "#0d1a12", "#f5a524", "#e06b3c", "#f6f0e2"


def ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        raise SystemExit("ffmpeg tidak ditemukan. Pasang ffmpeg atau imageio-ffmpeg.")


def jalankan(perintah):
    hasil = subprocess.run(perintah, capture_output=True, text=True)
    if hasil.returncode:
        sys.stderr.write(hasil.stderr[-2000:])
        raise SystemExit("gagal: " + " ".join(perintah[:6]) + " ...")


def jumlah_kata_adegan():
    """Jumlah kata tiap adegan, dibaca dari teks `.cerita__isi` di index.html."""
    try:
        isi = open(os.path.join(SITUS, "index.html"), encoding="utf-8").read()
    except OSError:
        return None
    bagian = isi.split('class="cerita__daftar"')
    if len(bagian) < 2:
        return None
    bagian = bagian[1].split('class="cerita__penggulung"')[0]
    adegan = re.findall(r'<article class="cerita__adegan">(.*?)</article>', bagian, re.S)
    if len(adegan) != len(BATAS) - 1:
        return None
    hasil = []
    for a in adegan:
        m = re.search(r'<div class="cerita__isi">(.*?)</div>', a, re.S)
        teks = re.sub(r'<[^>]+>', ' ', m.group(1) if m else a)
        teks = re.sub(r'&[a-z]+;', ' ', teks)
        hasil.append(len([w for w in teks.split() if len(w) > 1]))
    return hasil


def jendela_adegan():
    """Jendela potong yang benar-benar berada DI DALAM tiap adegan.

    Jendela yang lebih lebar dari adegannya akan melintasi batas dan ikut
    menampilkan adegan tetangga. Karena itu jendela dijepit ke rentang adegan
    dikurangi `SISI`, dan bila adegannya terlalu pendek, seluruh rentangnya
    yang dipakai.
    """
    hasil = []
    for i in range(len(BATAS) - 1):
        lo, hi = BATAS[i] + SISI, BATAS[i + 1] - SISI
        if hi - lo < MIN_JENDELA:          # adegan pendek: pakai seluruhnya
            lo, hi = BATAS[i], BATAS[i + 1]
        hasil.append((lo, hi))
    return hasil


def buat_kartu_penutup(tmp):
    """Gambar kartu penutup bermerek: lambang warung + nama "Warung Go Digital".

    Digambar dengan PIL, bukan drawtext, supaya hurufnya pasti ada (drawtext
    menuntut font khusus yang tidak selalu tersedia) dan tata letaknya tepat.
    """
    from PIL import Image, ImageDraw, ImageFont

    def font(ukuran):
        for jalur in (FONT_TEBAL, FONT_BIASA):
            if os.path.exists(jalur):
                return ImageFont.truetype(jalur, ukuran)
        return ImageFont.load_default()

    im = Image.new("RGB", (LEBAR, TINGGI), INK)
    d = ImageDraw.Draw(im, "RGBA")
    # lingkaran cahaya amber di belakang lambang
    d.ellipse([LEBAR // 2 - 150, 46, LEBAR // 2 + 150, 346], fill=(245, 165, 36, 24))

    # lambang atap warung (sama seperti .logo__mark di situs)
    cx, cy = LEBAR // 2, 170
    d.line([(cx - 78, cy + 34), (cx, cy - 30), (cx + 78, cy + 34)],
           fill=AMBER, width=14, joint="curve")
    d.rectangle([cx - 52, cy + 34, cx + 52, cy + 108], outline=AMBER, width=12)
    d.rectangle([cx - 18, cy + 62, cx + 18, cy + 108], outline=AMBER, width=10)

    # nama merek: "Warung" krem + "Go" tanah liat + "Digital" krem
    f = font(56)
    potong = [("Warung", CREAM), ("Go", CLAY), ("Digital", CREAM)]
    lebar_total = sum(d.textlength(t, font=f) for t, _ in potong)
    x = (LEBAR - lebar_total) / 2
    for t, warna in potong:
        d.text((x, 296), t, font=f, fill=warna)
        x += d.textlength(t, font=f)

    # semboyan
    fb = font(20)
    semboyan = "Warung digital untuk UMKM Indonesia"
    d.text(((LEBAR - d.textlength(semboyan, font=fb)) / 2, 372),
           semboyan, font=fb, fill="#9fb0a6")

    jalur = os.path.join(tmp, "penutup.png")
    im.save(jalur)
    return jalur


def main():
    sumber = sys.argv[1] if len(sys.argv) > 1 else SUMBER_BAWAAN
    if not os.path.exists(sumber):
        raise SystemExit(f"video sumber tidak ditemukan: {sumber}")

    exe = ffmpeg()
    os.makedirs(KELUARAN, exist_ok=True)
    tmp = os.path.join(AKAR, ".video-tmp")
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp, exist_ok=True)

    kata = jumlah_kata_adegan() or [120] * (len(BATAS) - 1)
    jendela = jendela_adegan()
    delogo = f"delogo=x={WM['x']}:y={WM['y']}:w={WM['w']}:h={WM['h']}"

    for i, ((a, b), k) in enumerate(zip(jendela, kata), 1):
        panjang = b - a
        # Gerak lambat dipilih agar satu siklus bolak-balik berlangsung sekitar
        # SIKLUS_TARGET detik. Adegan pendek diperlambat lebih banyak.
        lambat = SIKLUS_TARGET / (2 * panjang)
        lambat = min(LAMBAT_MAKS, max(LAMBAT_DASAR, lambat))
        dur = max(DURASI_MIN, min(DURASI_MAKS, round(SIKLUS * 2 * panjang * lambat)))

        potong = os.path.join(tmp, f"potong-{i}.mp4")
        bolak = os.path.join(tmp, f"bolak-{i}.mp4")
        badan = os.path.join(tmp, f"badan-{i}.mp4")
        akhir = os.path.join(KELUARAN, f"cerita-{i}.mp4")

        # 1) buang watermark, potong jendela adegan, perlambat, perkecil
        jalankan([exe, "-y", "-ss", f"{a:.3f}", "-t", f"{panjang:.3f}", "-i", sumber, "-an",
                  "-vf", f"{delogo},setpts={lambat:.3f}*PTS,scale={LEBAR}:-2,fps={FPS}",
                  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                  "-pix_fmt", "yuv420p", potong])

        # 2) bolak-balik: maju lalu mundur, sehingga ujung bertemu pangkal
        jalankan([exe, "-y", "-i", potong, "-filter_complex",
                  "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[out]",
                  "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "medium",
                  "-crf", "18", "-pix_fmt", "yuv420p", bolak])

        # 3) poster (kerangka bersih pertama) + ulang sampai durasi pas + zum lambat
        jalankan([exe, "-y", "-i", potong, "-frames:v", "1", "-q:v", "6",
                  os.path.join(KELUARAN, f"cerita-{i}.jpg")])
        bingkai = int(FPS * dur)
        zum = (f"zoompan=z='1+{ZUM}*on/{bingkai}':d=1:"
               f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
               f"s={LEBAR}x{TINGGI}:fps={FPS}")
        jalankan([exe, "-y", "-stream_loop", "60", "-i", bolak, "-t", f"{dur}",
                  "-an", "-vf", zum, "-c:v", "libx264", "-preset", "slow",
                  "-crf", "29", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                  "-g", "48", badan])

        # 4) Adegan terakhir disambung kartu penutup bermerek, sehingga cerita
        #    berakhir dengan gambar "Warung Go Digital" — bukan terpotong.
        if i == len(jendela):
            kartu = buat_kartu_penutup(tmp)
            klip_kartu = os.path.join(tmp, "kartu.mp4")
            jalankan([exe, "-y", "-loop", "1", "-i", kartu, "-t", f"{DURASI_PENUTUP}",
                      "-vf", f"fade=t=in:st=0:d=0.7,format=yuv420p,fps={FPS}",
                      "-c:v", "libx264", "-preset", "slow", "-crf", "26",
                      "-pix_fmt", "yuv420p", klip_kartu])
            daftar = os.path.join(tmp, "gabung.txt")
            with open(daftar, "w", encoding="utf-8") as f:
                f.write(f"file '{badan}'\nfile '{klip_kartu}'\n")
            jalankan([exe, "-y", "-f", "concat", "-safe", "0", "-i", daftar,
                      "-c", "copy", "-movflags", "+faststart", akhir])
        else:
            shutil.move(badan, akhir)

        total = dur + (DURASI_PENUTUP if i == len(jendela) else 0)
        ulang = dur / (panjang * lambat * 2)
        print(f"cerita-{i}: {kata[i - 1]:3d} kata -> {total:4.0f}s "
              f"(potong {a:.2f}-{b:.2f}s, lambat {lambat:.1f}x, ulang {ulang:.1f}x)  "
              f"{os.path.getsize(akhir) / 1024:.0f} KB")

    shutil.rmtree(tmp, ignore_errors=True)
    print(f"\nSelesai. Hasil di {KELUARAN}")


if __name__ == "__main__":
    main()
