#!/usr/bin/env bash
# Dorong repo ini ke GitHub, lalu tunjukkan cara mengaktifkan deploy otomatis.
#
# Pakai:  bash dorong.sh <username-github> [nama-repo] [publik|privat]
# Contoh: bash dorong.sh alif121727 warung-go-digital publik
#
# Perlu: git, dan (opsional) gh CLI yang sudah login supaya repo dibuat otomatis.
set -euo pipefail

PENGGUNA="${1:-}"
REPO="${2:-warung-go-digital}"
AKSES="${3:-publik}"

if [ -z "$PENGGUNA" ]; then
  echo "Pakai: bash dorong.sh <username-github> [nama-repo] [publik|privat]"
  echo "Contoh: bash dorong.sh alif121727 warung-go-digital publik"
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "GALAT: folder ini bukan repositori git."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Masih ada perubahan yang belum di-commit:"
  git status --short
  echo
  echo "Commit dulu (git add -A && git commit -m \"...\"), lalu jalankan ulang skrip ini."
  exit 1
fi

CABANG="$(git branch --show-current)"
echo "Cabang aktif : $CABANG"
echo "Tujuan       : https://github.com/$PENGGUNA/$REPO ($AKSES)"
echo

if [ "$AKSES" = "privat" ]; then
  VIS="--private"
  echo "CATATAN: repo privat TIDAK bisa memakai GitHub Pages gratis."
  echo "         Pakai Vercel atau Netlify untuk repo privat."
else
  VIS="--public"
  echo "PERHATIAN: repo publik berarti Proposal_PKM-K_Warung_Go_Digital.pdf"
  echo "           di akar repo ini ikut terlihat siapa pun. Kalau tidak ingin,"
  echo "           jalankan ulang dengan argumen ketiga: privat"
  echo
  echo "           (Isi situs sendiri tidak memuat PDF itu — hanya berkas di repo.)"
fi
echo

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if gh repo view "$PENGGUNA/$REPO" >/dev/null 2>&1; then
    echo "Repositori $PENGGUNA/$REPO sudah ada. Menambah remote origin bila perlu."
    git remote get-url origin >/dev/null 2>&1 || \
      git remote add origin "https://github.com/$PENGGUNA/$REPO.git"
  else
    echo "Membuat repositori $PENGGUNA/$REPO ..."
    if ! gh repo create "$PENGGUNA/$REPO" "$VIS" --source=. --remote=origin; then
      echo
      echo "Gagal membuat repositori otomatis (izin token kurang)."
      echo "Buat manual di https://github.com/new, lalu jalankan:"
      echo "  git remote add origin https://github.com/$PENGGUNA/$REPO.git"
      echo "  git push -u origin $CABANG"
      exit 1
    fi
  fi
else
  echo "gh CLI tidak ada atau belum login. Tambahkan remote secara manual:"
  echo "  git remote add origin https://github.com/$PENGGUNA/$REPO.git"
fi

echo
echo "Mendorong ke origin/$CABANG ..."
git push -u origin "$CABANG"

echo
echo "==================================================================="
echo "Selesai. Langkah berikutnya (sekali saja):"
echo
echo "  Deploy otomatis ke GitHub Pages:"
echo "    1. Buka https://github.com/$PENGGUNA/$REPO/settings/pages"
echo "    2. Pada Source, pilih GitHub Actions"
echo "    Situs terbit di: https://$PENGGUNA.github.io/$REPO/"
echo
echo "  Atau deploy ke Vercel (repo privat pun bisa):"
echo "    https://vercel.com/new  → pilih repo ini → Deploy"
echo "==================================================================="
