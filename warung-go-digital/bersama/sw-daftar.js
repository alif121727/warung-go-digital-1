/* sw-daftar.js — mendaftarkan service worker untuk aplikasi Pemilik & Pengelola.
 *
 * Berkas ini berada di folder bersama/, sedangkan sw.js ada di akar situs.
 * Akar situs dihitung dari lokasi skrip ini, sehingga tetap benar baik
 * saat diuji di /warung-go-digital/ maupun setelah dipasang sebagai aplikasi.
 */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  const akar = document.currentScript
    ? new URL('../', document.currentScript.src).href
    : new URL('./', location.href).href;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(akar + 'sw.js', { scope: akar }).catch(() => {});
  });
})();
