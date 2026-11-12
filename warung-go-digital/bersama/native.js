/* ══════════════════════════════════════════════════════════
   native.js — penyesuaian saat situs dibungkus jadi aplikasi
   Android/iPhone memakai Capacitor.

   Di peramban biasa berkas ini tidak melakukan apa pun, sehingga
   perilaku situs tidak berubah sedikit pun.

   Yang disesuaikan:
     1. Unduh berkas  → disimpan ke perangkat lalu dibuka menu
        "Bagikan" Android (unduhan lewat blob tidak jalan di WebView).
     2. Tombol kembali → menutup dialog dulu, lalu pindah ke tab
        pertama, baru keluar dari aplikasi.
     3. Warna bilah status → mengikuti warna merek.
   ══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const Cap = window.Capacitor;
  if (!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform()) return;

  const Plugins = Cap.Plugins || {};
  const FS = Plugins.Filesystem;
  const Share = Plugins.Share;
  const App = Plugins.App;
  const StatusBar = Plugins.StatusBar;

  document.documentElement.classList.add('native');

  /* ── 1. Unduh berkas: simpan ke perangkat, lalu bagikan ── */
  const unduhAsli = window.Inti && Inti.unduh;

  if (window.Inti && FS) {
    Inti.unduh = async (nama, isi, tipe = 'text/plain') => {
      try {
        const hasil = await FS.writeFile({
          path: nama,
          data: isi,
          directory: 'CACHE',
          encoding: 'utf8',
        });
        if (Share && (await Share.canShare()).value) {
          await Share.share({
            title: nama,
            url: hasil.uri,
            dialogTitle: 'Simpan atau kirim berkas',
          });
          return;
        }
        Inti.toast(`Berkas disimpan: ${nama}`, 'ok');
      } catch (e) {
        if (unduhAsli) unduhAsli(nama, isi, tipe);
        else Inti.toast('Gagal menyimpan berkas.', 'dgr');
      }
    };
  }

  /* ── 2. Tombol kembali perangkat ── */
  if (App && typeof App.addListener === 'function') {
    App.addListener('backButton', ({ canGoBack }) => {
      if (document.querySelector('#modal.open')) {
        Inti.tutupModal();
        return;
      }
      const aktif = document.querySelector('.tabbar__item.on');
      const pertama = document.querySelector('.tabbar__item');
      if (aktif && pertama && aktif !== pertama) {
        pertama.click();
        return;
      }
      if (canGoBack) {
        history.back();
        return;
      }
      App.exitApp();
    });
  }

  /* ── 3. Bilah status mengikuti warna merek ── */
  if (StatusBar) {
    StatusBar.setBackgroundColor({ color: '#0d1a12' }).catch(() => {});
    StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
  }
})();
