#!/usr/bin/env python3
"""Buat video pembuka (intro) HD dari video sumber beresolusi rendah.

Jalankan:  python3 buat-video-pembuka.py [video-sumber.mp4]
Hasil:     warung-go-digital/video/pembuka.mp4 (+ poster pembuka.jpg)

Video sumber rekaman layar situs ini sendiri (640x360, 60 detik). Berkas ini
menaikkannya ke 1280x720 (HD) dengan penapis Lanczos + penajam ringan supaya
tajam di layar besar, lalu mengodekannya H.264 High dengan `faststart` agar
bisa mulai diputar sambil masih diunduh.

Butuh ffmpeg. Bila belum ada:  pip install imageio-ffmpeg
"""

import os
import shutil
import subprocess
import sys

AKAR = os.path.dirname(os.path.abspath(__file__))
KELUARAN = os.path.join(AKAR, "warung-go-digital", "video")
SUMBER_BAWAAN = os.path.join(AKAR, "video-sumber-pembuka.mp4")

LEBAR, TINGGI = 1280, 720
FPS = 30
CRF = "26"
PRESET = "slow"
AUDIO_KBPS = "128k"
DETIK_POSTER = 12.0  # kerangka dengan bagian hero yang sudah terbaca


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


def main():
    sumber = sys.argv[1] if len(sys.argv) > 1 else SUMBER_BAWAAN
    if not os.path.exists(sumber):
        raise SystemExit(f"video sumber tidak ditemukan: {sumber}")

    exe = ffmpeg()
    os.makedirs(KELUARAN, exist_ok=True)
    mp4 = os.path.join(KELUARAN, "pembuka.mp4")
    jpg = os.path.join(KELUARAN, "pembuka.jpg")

    # Lanczos menjaga tepi tulisan tetap tajam saat dinaikkan; penajamnya
    # ringan saja supaya derau perekaman tidak ikut diperkuat.
    tapis = (
        f"scale={LEBAR}:{TINGGI}:flags=lanczos,"
        f"unsharp=5:5:0.5:5:5:0.0,fps={FPS}"
    )
    jalankan(
        [exe, "-y", "-i", sumber,
         "-vf", tapis,
         "-c:v", "libx264", "-preset", PRESET, "-crf", CRF,
         "-profile:v", "high", "-level", "4.0",
         "-pix_fmt", "yuv420p", "-g", "60",
         "-movflags", "+faststart",
         "-map", "0:v:0", "-map", "0:a?",
         "-c:a", "aac", "-b:a", AUDIO_KBPS,
         mp4]
    )
    jalankan(
        [exe, "-y", "-ss", f"{DETIK_POSTER}", "-i", mp4,
         "-frames:v", "1", "-q:v", "4", jpg]
    )

    print(f"pembuka.mp4: {os.path.getsize(mp4) / 1024:.0f} KB")
    print(f"pembuka.jpg: {os.path.getsize(jpg) / 1024:.0f} KB")
    print(f"Hasil di {KELUARAN}")


if __name__ == "__main__":
    main()
