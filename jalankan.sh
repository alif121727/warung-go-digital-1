#!/usr/bin/env bash
# Jalankan situs Warung Go Digital langsung di lingkungan ini.
# Tidak perlu push ke GitHub — situs langsung bisa dibuka lewat URL publik.
#
# Pakai:  bash jalankan.sh [port]        (bawaan: 12001)
#         bash jalankan.sh --stop         hentikan server yang berjalan
set -euo pipefail

AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-12001}"
LOG="$AKAR/.jalankan.log"
PID="$AKAR/.jalankan.pid"
URL_PUBLIK="https://work-2-mfkngpvvghxksiwd.prod-runtime.all-hands.dev/"

berhenti() {
  if [ -f "$PID" ]; then
    lama="$(cat "$PID")"
    if kill -0 "$lama" 2>/dev/null; then
      kill "$lama" 2>/dev/null || true
      sleep 1
      echo "Server lama (pid $lama) dihentikan."
    fi
    rm -f "$PID"
  fi
}

if [ "$PORT" = "--stop" ]; then
  berhenti
  echo "Situs dihentikan."
  exit 0
fi

berhenti

if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":$PORT "; then
  echo "GALAT: port $PORT sedang dipakai proses lain. Coba port lain."
  exit 1
fi

cd "$AKAR"
nohup python3 -m http.server "$PORT" --bind 0.0.0.0 >"$LOG" 2>&1 &
echo $! >"$PID"
sleep 1

if ! kill -0 "$(cat "$PID")" 2>/dev/null; then
  echo "GALAT: server gagal dijalankan. Isi log:"
  cat "$LOG"
  exit 1
fi

# Pastikan benar-benar menjawab
if ! curl -fsS -o /dev/null "http://127.0.0.1:$PORT/warung-go-digital/"; then
  echo "GALAT: server hidup tetapi tidak menjawab. Isi log:"
  cat "$LOG"
  exit 1
fi

cat <<INFO
Situs berjalan.
  pid      : $(cat "$PID")
  port     : $PORT
  log      : $LOG

Alamat:
  Landing page   : ${URL_PUBLIK}warung-go-digital/
  Panel Mitra    : ${URL_PUBLIK}warung-go-digital/app/
  Menu publik    : ${URL_PUBLIK}warung-go-digital/app/menu.html?w=wr-001
  Unduh paket ZIP: ${URL_PUBLIK}warung-go-digital-siap-pakai.zip

Hentikan dengan:  bash jalankan.sh --stop
INFO
