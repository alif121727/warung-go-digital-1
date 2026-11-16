#!/usr/bin/env python3
"""Buat video pembuka (intro) HD dari video sumber beresolusi rendah.

Jalankan:  python3 buat-video-pembuka.py [video-sumber.mp4]
Hasil:     warung-go-digital/video/pembuka.mp4 (+ poster pembuka.jpg)

Video sumber adalah rekaman layar situs ini sendiri (640x360, 60 detik, 362
kb/s). Berkas ini menaikkannya ke 1280x720 (HD) dengan penapis Lanczos, lalu
mengodekannya H.264 High dengan `faststart` agar bisa mulai diputar sambil
masih diunduh.

Kenapa ada batas puncak bitrate (`-maxrate`): naik ke 1280x720 membuat bitrate
melompat ke 941 kb/s. Terukur, pada sambungan 500-700 kb/s video itu tersendat
berulang (5 kali berhenti dalam 18 detik) — inilah "ngelag" yang dikeluhkan.
Batas 480 kb/s menurunkan berkas ke 3,3 MB (dari 7,1 MB) dan menghilangkan
tersendatnya, dengan SSIM frame terburuk masih 0,983 terhadap hasil tanpa batas
(nyaris tak terbedakan). `-bufsize` dua kali `-maxrate` memberi perayap ruang
cukup untuk adegan ramai tanpa melampaui batas rata-rata.

Kenapa tanpa penajam (unsharp): percobaan menunjukkan penajam justru menambah
halo di tepi tulisan dan memperkuat derau rekaman, sehingga hasilnya terlihat
lebih buruk daripada tanpa penajam. Lanczos sudah cukup tajam.

Kenapa CRF 28: CRF 23 nyaris tak terbedakan dari CRF 18, tetapi berkasnya jauh
lebih ringan. CRF 28 masih ber-SSIM 0,995 terhadap CRF 23 — dan yang lebih
penting, berkasnya cukup ringan untuk diputar lancar di HP kelas bawah.

Kenapa audio 48 kb/s mono: sumbernya hanya mono 31 kb/s, jadi 48 kb/s sudah
cukup; menaikkannya hanya menambah berat tanpa menambah mutu.

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
CRF = "28"
PRESET = "slow"
MAKS_KBPS = "480k"  # puncak bitrate video
BUF_KBPS = "960k"   # ukuran perayap (2x maks)
AUDIO_KBPS = "48k"
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

    # Lanczos saja: cukup tajam, tanpa halo yang ditinggalkan penajam.
    tapis = f"scale={LEBAR}:{TINGGI}:flags=lanczos,fps={FPS}"
    # Tanpa `-g`: pembuka diputar lurus dari awal sampai habis, tidak ada
    # lompatan waktu sama sekali. Memaksa kerangka kunci tiap 2 detik
    # (`-g 60`) hanya berguna untuk melompat, dan terukur menambah 876 KB
    # (13%) tanpa satu pun perubahan mutu (SSIM sama persis). Berkas yang
    # lebih ringan lebih cepat mulai diputar.
    jalankan(
        [exe, "-y", "-i", sumber,
         "-vf", tapis,
         "-c:v", "libx264", "-preset", PRESET, "-crf", CRF,
         "-profile:v", "high", "-level", "4.0",
         "-maxrate", MAKS_KBPS, "-bufsize", BUF_KBPS,
         "-pix_fmt", "yuv420p",
         "-movflags", "+faststart",
         "-map", "0:v:0", "-map", "0:a?",
         "-c:a", "aac", "-b:a", AUDIO_KBPS, "-ac", "1",
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
