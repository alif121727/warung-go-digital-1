/* unduh.js — perilaku halaman unduh (unduh.html)
 *
 * Tugasnya kecil dan tahan gagal:
 *   1. Menyesuaikan diri: bila dibuka dari Android, tombol APK dinaikkan
 *      peringkatnya; dari iPhone/iPad, tombol IPA. Tidak pernah memaksa —
 *      kedua tautan selalu tersedia.
 *   2. Menampilkan kode QR berisi tautan halaman ini, supaya mudah dibuka
 *      dari HP saat sedang dilihat di komputer.
 *   3. Menuliskan tahun berjalan di kaki halaman.
 *
 * Bila salah satu bagian gagal (mis. QR tidak termuat), bagian lain tetap
 * berjalan dan halaman tidak menampilkan galat.
 */
(() => {
  'use strict';

  // ── 1. Sesuaikan dengan perangkat ────────────────────────
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);

  const kartuAndroid = document.getElementById('android');
  const kartuIos = document.getElementById('ios');

  if (android && kartuAndroid && kartuIos) {
    kartuAndroid.classList.add('kartu--utama');
    // Tandai sebagai paling sesuai tanpa menghilangkan pilihan lain
    kartuAndroid.querySelector('h3').insertAdjacentHTML(
      'beforeend', ' <span class="chip chip--ok">HP Anda</span>');
  } else if (iOS && kartuAndroid && kartuIos) {
    kartuIos.classList.add('kartu--utama');
    kartuIos.querySelector('h3').insertAdjacentHTML(
      'beforeend', ' <span class="chip chip--ok">HP Anda</span>');
  }

  // ── 2. Kode QR halaman unduh ─────────────────────────────
  try {
    const kanvas = document.getElementById('qrUnduh');
    if (kanvas && window.QR && typeof window.QR.draw === 'function') {
      // Alamat publik tetap dipakai agar QR berguna walau halaman dibuka lokal
      const alamat = /^https?:/.test(location.protocol) &&
        !/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)
        ? location.href.split('#')[0]
        : 'https://alif121727.github.io/warung-go-digital-1/unduh.html';
      window.QR.draw(kanvas, alamat, { size: 320, quiet: 4, ecc: 'M' });
    }
  } catch (e) {
    /* QR hanya pelengkap; abaikan bila gagal */
  }

  // ── 3. Tahun berjalan ────────────────────────────────────
  const tahun = document.getElementById('tahun');
  if (tahun) tahun.textContent = String(new Date().getFullYear());
})();
