/* pasang-ios.js — bagian "Pasang di iPhone & iPad" (menyatu di unduh.html)
 *
 * Bagian ini menyesuaikan diri dengan situasi pengunjung:
 *   1. Sudah terpasang  -> tampilkan ucapan, sembunyikan langkahnya.
 *   2. Bukan Safari iOS -> arahkan membuka di Safari + sediakan tombol salin.
 *   3. Bukan perangkat iOS -> arahkan ke pemasangan Android.
 *   4. Safari iOS       -> tampilkan panduan langkah demi langkah.
 *
 * Semua bagian tahan gagal: bila satu elemen tidak ada, sisanya tetap jalan.
 * Langkah-langkah tetap terlihat sebagai bawaan bila JavaScript mati, karena
 * itu bagian yang paling penting justru tidak disembunyikan oleh skrip.
 */
(() => {
  'use strict';

  const ua = navigator.userAgent || '';

  // iPadOS 13+ menyamar sebagai macOS ("MacIntel") tetapi punya layar sentuh.
  const iPadModern = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const iOS = /iPad|iPhone|iPod/.test(ua) || iPadModern;

  // Peramban iOS: semua memakai WebKit, jadi dibedakan lewat penanda tambahan.
  // Safari iOS tidak punya penanda CriOS/FxiOS/EdgiOS/OPiOS.
  const bukanSafari = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA/.test(ua);
  const safariIOS = iOS && !bukanSafari;

  // "Sudah terpasang" = dibuka dari ikon layar utama, bukan dari peramban.
  const terpasang =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const tampilkan = (id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  };

  // ── 1. Sudah terpasang ───────────────────────────────────
  if (terpasang) {
    tampilkan('ios-sudah');
    // Langkah-langkah tidak lagi berguna, jadi disembunyikan agar tidak
    // membingungkan. Bila JavaScript mati, panduan tetap terlihat.
    const langkah = document.querySelector('#pasang-ios .panduan');
    if (langkah) langkah.hidden = true;
    return;
  }

  // ── 2. Bukan perangkat iOS ───────────────────────────────
  if (!iOS) {
    tampilkan('ios-bukan-ios');
    return;
  }

  // ── 3. iPhone/iPad, tetapi bukan Safari ──────────────────
  if (!safariIOS) {
    tampilkan('ios-bukan-safari');
  }

  // ── 4. Tombol salin tautan ───────────────────────────────
  const tombolSalin = document.getElementById('iosTombolSalin');
  if (tombolSalin) {
    tombolSalin.addEventListener('click', async () => {
      const teks = document.getElementById('iosTeksSalin');
      const alamat = location.href.split('#')[0];
      const berhasil = () => {
        if (teks) {
          teks.textContent = 'Tautan disalin';
          setTimeout(() => { teks.textContent = 'Salin tautan'; }, 2200);
        }
      };
      try {
        await navigator.clipboard.writeText(alamat);
        berhasil();
      } catch (e) {
        // Sebagian peramban menolak clipboard tanpa HTTPS atau izin; pilih
        // cara lama sebagai cadangan agar tombol tidak pernah mati.
        try {
          const sementara = document.createElement('textarea');
          sementara.value = alamat;
          sementara.setAttribute('readonly', '');
          sementara.style.cssText = 'position:absolute;left:-9999px';
          document.body.appendChild(sementara);
          sementara.select();
          document.execCommand('copy');
          sementara.remove();
          berhasil();
        } catch (e2) {
          /* biarkan: pengguna masih bisa menyalin manual dari kode di atas */
        }
      }
    });
  }

  // ── 5. Tahun berjalan ────────────────────────────────────
  const tahun = document.getElementById('tahun');
  if (tahun) tahun.textContent = String(new Date().getFullYear());
})();
