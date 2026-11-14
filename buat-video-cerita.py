#!/usr/bin/env python3
"""Buat ulang klip video bagian "Cerita Bu Tini" dari satu video sumber.

Jalankan:  python3 buat-video-cerita.py <video-sumber.mp4>
Hasil:     warung-go-digital/video/cerita-1..6.{mp4,jpg}

Kenapa begini
-------------
Video sumber (Kling) hanya sekitar 5 detik dan di dalamnya sudah terkandung
enam adegan yang dipisahkan potongan gambar. Enam adegan itu dipotong menurut
batas yang terdeteksi, lalu tiap potongan:

  1. diperlambat 1,5x          -> gerakannya tidak tergesa;
  2. dijadikan bolak-balik     -> pangkal dan ujungnya sama, sehingga mulus
     saat diulang (tanpa lompatan);
  3. diulang sampai 9 detik    -> cukup panjang untuk dibaca bersama teksnya.

Tanpa langkah 2, pengulangan video akan terasa patah setiap 9 detik.

Butuh ffmpeg. Bila belum ada, pakai imageio-ffmpeg:  pip install imageio-ffmpeg
"""
import os
import shutil
import subprocess
import sys

AKAR = os.path.dirname(os.path.abspath(__file__))
KELUARAN = os.path.join(AKAR, "warung-go-digital", "video")

# Batas adegan di video sumber (detik). Tiga batas pertama mengikuti potongan
# gambar yang terdeteksi; batas 3,20 ditambahkan agar durasinya lebih rata.
BATAS = [0.0, 0.85, 1.67, 2.38, 3.20, 3.80, 5.04]
DURASI = 9.0   # durasi akhir tiap adegan (detik)
LAMBAT = 1.5   # faktor gerak lambat
LEBAR = 854    # 480p, cukup tajam dan ringan


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
        raise SystemExit(f"gagal: {' '.join(perintah[:6])} ...")


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    sumber = sys.argv[1]
    if not os.path.exists(sumber):
        raise SystemExit(f"video sumber tidak ditemukan: {sumber}")

    exe = ffmpeg()
    os.makedirs(KELUARAN, exist_ok=True)
    tmp = os.path.join(AKAR, ".video-tmp")
    os.makedirs(tmp, exist_ok=True)

    for i in range(len(BATAS) - 1):
        a, b = BATAS[i], BATAS[i + 1]
        potong = os.path.join(tmp, f"potong-{i + 1}.mp4")
        bolak = os.path.join(tmp, f"bolak-{i + 1}.mp4")
        akhir = os.path.join(KELUARAN, f"cerita-{i + 1}.mp4")

        # 1) potong + gerak lambat + perkecil
        jalankan([exe, "-y", "-ss", f"{a}", "-to", f"{b}", "-i", sumber, "-an",
                  "-vf", f"setpts={LAMBAT}*PTS,scale={LEBAR}:-2,fps=24",
                  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                  "-pix_fmt", "yuv420p", potong])

        # 2) bolak-balik (boomerang): maju lalu mundur
        jalankan([exe, "-y", "-i", potong, "-filter_complex",
                  "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[out]",
                  "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "medium",
                  "-crf", "18", "-pix_fmt", "yuv420p", bolak])

        # 3) poster (kerangka pertama) + ulang sampai durasi target
        jalankan([exe, "-y", "-i", potong, "-frames:v", "1", "-q:v", "6",
                  os.path.join(KELUARAN, f"cerita-{i + 1}.jpg")])
        jalankan([exe, "-y", "-stream_loop", "40", "-i", bolak, "-t", f"{DURASI}",
                  "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
                  "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-g", "48", akhir])

        print(f"cerita-{i + 1}: {a:.2f}-{b:.2f}s -> "
              f"{os.path.getsize(akhir) / 1024:.0f} KB")

    shutil.rmtree(tmp, ignore_errors=True)
    print(f"\nSelesai. Hasil di {KELUARAN}")


if __name__ == "__main__":
    main()
