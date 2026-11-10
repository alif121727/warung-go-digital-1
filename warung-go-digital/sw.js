/* Service worker — Warung Go Digital
 *
 * Tujuan:
 *   1. Membuat situs bisa "dipasang" (installable) di HP.
 *   2. Halaman tetap terbuka saat sinyal jelek / offline setelah kunjungan pertama.
 *
 * Strategi:
 *   - Navigasi (halaman HTML): network-first. Selalu coba versi terbaru dulu,
 *     supaya perubahan langsung terlihat; cache hanya dipakai saat offline.
 *   - Aset statis (CSS, JS, gambar): stale-while-revalidate. Sajikan dari cache
 *     agar cepat, sekaligus perbarui cache di latar belakang.
 *
 * Naikkan VERSI setiap kali berkas situs berubah besar-besaran; cache lama
 * otomatis dibuang saat aktivasi.
 */

const VERSI = 'wgd-v2';
const CACHE_INTI = `${VERSI}-inti`;
const CACHE_ASET = `${VERSI}-aset`;

// Kerangka aplikasi. Semua jalur relatif terhadap lokasi sw.js, sehingga
// tetap benar baik saat diuji di /warung-go-digital/ maupun di akar domain.
const KERANGKA = [
  './',
  './index.html',
  './styles.css',
  './app/',
  './app/index.html',
  './app/app.js',
  './app/store.js',
  './app/ui.js',
  './app/qr.js',
  './app/styles.css',
  './app/menu.html',
  './app/modul-transaksi.js',
  './app/modul-rating.js',
  './app/modul-katalog.js',
  './app/modul-promosi.js',
  './app/modul-foto.js',
  './app/modul-laporan.js',
  './manifest.webmanifest',
  './ikon/ikon-192.png',
  './ikon/ikon-512.png',
  './ikon/ikon-maskable-512.png',
  './ikon/apple-touch-icon.png',
];

self.addEventListener('install', (peristiwa) => {
  peristiwa.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_INTI);
      // addAll gagal total bila satu berkas meleset; tambahkan satu per satu
      // supaya satu kegagalan tidak membatalkan seluruh instalasi.
      await Promise.all(
        KERANGKA.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (peristiwa) => {
  peristiwa.waitUntil(
    (async () => {
      const kunci = await caches.keys();
      await Promise.all(
        kunci.filter((k) => !k.startsWith(VERSI)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (peristiwa) => {
  const permintaan = peristiwa.request;

  // Hanya tangani GET pada origin sendiri. Sisanya (WhatsApp, Google Fonts,
  // Maps) diteruskan langsung ke jaringan.
  if (permintaan.method !== 'GET') return;
  const url = new URL(permintaan.url);
  if (url.origin !== self.location.origin) return;

  // Navigasi halaman -> network-first.
  if (permintaan.mode === 'navigate') {
    peristiwa.respondWith(
      (async () => {
        try {
          const segar = await fetch(permintaan);
          const cache = await caches.open(CACHE_INTI);
          cache.put(permintaan, segar.clone());
          return segar;
        } catch (e) {
          // ignoreSearch: halaman menu dipanggil dengan ?w=... sehingga URL-nya
          // berbeda dari yang tersimpan; bandingkan tanpa query agar cocok.
          const tersimpan = await caches.match(permintaan, { ignoreSearch: true });
          if (tersimpan) return tersimpan;
          // Terakhir: halaman utama yang tersimpan.
          const utama =
            (await caches.match(new URL('./app/', self.location.href), { ignoreSearch: true })) ||
            (await caches.match(new URL('./', self.location.href), { ignoreSearch: true }));
          if (utama) return utama;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
              '<body style="font-family:system-ui;padding:2rem;background:#f7f5f0;color:#0d1a12">' +
              '<h1>Sedang offline</h1><p>Sambungkan internet lalu muat ulang halaman.</p></body>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // Aset statis -> stale-while-revalidate.
  peristiwa.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_ASET);
      const tersimpan = await cache.match(permintaan);
      const dariJaringan = fetch(permintaan)
        .then((jawaban) => {
          if (jawaban && jawaban.status === 200 && jawaban.type === 'basic') {
            cache.put(permintaan, jawaban.clone());
          }
          return jawaban;
        })
        .catch(() => tersimpan);
      return tersimpan || dariJaringan;
    })()
  );
});
