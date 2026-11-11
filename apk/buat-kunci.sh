#!/usr/bin/env bash
# buat-kunci.sh — membuat kunci penandatangan APK (sekali saja).
#
# Kunci ini menentukan identitas aplikasi Anda di HP. Setelah APK bertanda
# tangan dipasang, versi berikutnya HARUS memakai kunci yang sama agar bisa
# diperbarui tanpa menghapus aplikasi lebih dulu.
#
# Simpan berkas kunci ini di tempat aman dan jangan dibagikan.
#
# Pemakaian:
#     bash apk/buat-kunci.sh
#
# Syarat: keytool (bagian dari JDK). Cek dengan: keytool -help

set -u

NAMA_BERKAS="${1:-warung-go-digital.jks}"
ALIAS="${ALIAS:-warung-go-digital}"

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool tidak ditemukan. Pasang JDK 17 lebih dulu, misalnya:"
  echo "  Ubuntu/Debian : sudo apt install openjdk-17-jdk-headless"
  echo "  macOS         : brew install openjdk@17"
  echo "  Windows       : unduh Temurin 17 dari https://adoptium.net"
  exit 1
fi

echo "Membuat kunci penandatangan: $NAMA_BERKAS"
echo "Anda akan diminta mengisi sandi dan beberapa keterangan. Isi apa saja"
echo "yang mudah Anda ingat, lalu CATAT sandinya di tempat aman."
echo

keytool -genkeypair \
  -v \
  -keystore "$NAMA_BERKAS" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10950 \
  -storetype PKCS12

echo
echo "Kunci dibuat: $NAMA_BERKAS"
echo
echo "── Langkah berikutnya ──────────────────────────────────────────────"
echo "Buka: GitHub → repo → Settings → Secrets and variables → Actions"
echo "Tambahkan 4 rahasia (Repository secrets) berikut:"
echo
echo "  ANDROID_KEYSTORE_BASE64  ← hasil perintah di bawah"
echo "  ANDROID_KEYSTORE_PASS    ← sandi keystore yang Anda isi tadi"
echo "  ANDROID_KEY_ALIAS        ← $ALIAS"
echo "  ANDROID_KEY_PASS         ← sandi kunci (biasanya sama)"
echo
echo "Salin nilai untuk ANDROID_KEYSTORE_BASE64:"
echo
base64 -w0 "$NAMA_BERKAS" 2>/dev/null || base64 "$NAMA_BERKAS" | tr -d '\n'
echo
echo
echo "Setelah keempat rahasia tersimpan, jalankan ulang workflow"
echo "\"Bangun APK Android\" dari tab Actions. APK yang dihasilkan akan"
echo "bertanda tangan rilis, sehingga peringatan saat pemasangan hilang."
