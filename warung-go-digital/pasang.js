/* Pemasangan aplikasi (PWA) — Warung Go Digital
 *
 * Menyediakan:
 *   1. Pendaftaran service worker (agar situs bisa dipasang + offline).
 *   2. Tombol "Pasang aplikasi" saat browser mendukung (Android/Chrome/Edge).
 *   3. Petunjuk manual untuk iOS/Safari, yang tidak punya prompt pemasangan.
 *
 * Berkas ini dipakai di ketiga halaman: landing, Panel Mitra, dan menu publik.
 * Elemen tombol dibuat oleh skrip ini, jadi HTML tidak perlu diubah.
 */
(() => {
  'use strict';

  // ── 1. Service worker ─────────────────────────────────────
  // Akar situs dihitung SEKARANG (masih di dalam eksekusi skrip), karena
  // document.currentScript menjadi null di dalam callback 'load' nanti.
  // pasang.js berada sebaris dengan sw.js, jadi direktori skrip inilah akarnya.
  const akarSitus = document.currentScript
    ? new URL('.', document.currentScript.src).href
    : new URL('./', location.href).href;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Daftarkan relatif terhadap akar situs, jadi bekerja baik di
      // /warung-go-digital/ maupun di akar domain.
      // updateViaCache:'none' -> berkas sw.js tidak pernah diambil dari cache
      // HTTP. Tanpa ini, GitHub Pages (max-age=600) membuat versi baru
      // tertahan sampai 10 menit sehingga perubahan tidak terlihat.
      navigator.serviceWorker
        .register(akarSitus + 'sw.js', {
          scope: akarSitus,
          updateViaCache: 'none',
        })
        .then((daftar) => {
          // Saat ada versi baru, service worker baru mengambil alih. Muat ulang
          // sekali supaya pengunjung langsung melihat tampilan terbaru, tanpa
          // perlu membersihkan cache sendiri.
          daftar.addEventListener('updatefound', () => {
            const baru = daftar.installing;
            if (!baru) return;
            baru.addEventListener('statechange', () => {
              // Hanya bila sudah ada halaman yang terkendali sebelumnya;
              // pada kunjungan pertama tidak perlu memuat ulang.
              if (baru.state === 'activated' && navigator.serviceWorker.controller) {
                location.reload();
              }
            });
          });
        })
        .catch(() => {});
    });
  }

  // Jangan tampilkan UI di dalam iframe (mis. pratinjau).
  if (window.top !== window.self) return;

  const pesanSudahTerpasang =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (pesanSudahTerpasang) return; // sudah dibuka sebagai aplikasi

  const adalahIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const adalahSafariIOS = adalahIOS && !/crios|fxios|edgios/i.test(navigator.userAgent);
  let promptTertunda = null;

  // ── 2. Gaya (disuntik sekali) ──────────────────────────────
  function suntikGaya() {
    if (document.getElementById('wgd-pasang-gaya')) return;
    const g = document.createElement('style');
    g.id = 'wgd-pasang-gaya';
    g.textContent = `
      .wgd-pasang{position:fixed;z-index:9999;left:50%;transform:translateX(-50%);
        bottom:calc(16px + env(safe-area-inset-bottom,0px));
        display:flex;align-items:center;gap:10px;max-width:calc(100vw - 24px);
        padding:10px 12px 10px 14px;border-radius:14px;border:1px solid #24412f;
        background:#0d1a12;color:#f6f0e2;font:500 14px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;
        box-shadow:0 12px 30px rgba(13,26,18,.32);opacity:0;transform:translateX(-50%) translateY(12px);
        transition:opacity .28s ease,transform .28s ease}
      .wgd-pasang.tampil{opacity:1;transform:translateX(-50%) translateY(0)}
      .wgd-pasang__ikon{width:30px;height:30px;border-radius:8px;flex:0 0 auto;background:#f5a524;
        color:#0d1a12;display:grid;place-items:center;font-weight:800}
      .wgd-pasang__teks{min-width:0}
      .wgd-pasang__judul{font-weight:700;font-size:13.5px}
      .wgd-pasang__sub{font-size:11.5px;opacity:.72;margin-top:1px}
      .wgd-pasang__aksi{display:flex;gap:6px;margin-left:auto}
      .wgd-pasang button{font:inherit;font-size:13px;border-radius:9px;cursor:pointer;
        padding:8px 12px;border:1px solid transparent;min-height:38px}
      .wgd-pasang__ya{background:#f5a524;color:#0d1a12;font-weight:700}
      .wgd-pasang__ya:hover{background:#ffbe4d}
      .wgd-pasang__nanti{background:transparent;color:#f6f0e2;border-color:#3a5344}
      .wgd-pasang__nanti:hover{background:#16241b}
      .wgd-tutup{background:transparent;color:#f6f0e2;border:none;font-size:18px;
        line-height:1;padding:4px 6px;cursor:pointer;opacity:.6}
      .wgd-tutup:hover{opacity:1}
      @media (max-width:430px){
        .wgd-pasang__sub{display:none}
      }`;
    document.head.appendChild(g);
  }

  function sudahDitolak() {
    try {
      return localStorage.getItem('wgd-pasang-ditolak') === '1';
    } catch (e) {
      return false;
    }
  }

  function tandaiDitolak() {
    try {
      localStorage.setItem('wgd-pasang-ditolak', '1');
    } catch (e) {
      /* mode privat: abaikan */
    }
  }

  // ── 3. Bilah ajakan pasang ─────────────────────────────────
  function tampilkanBilah(teksSub, aksiTombol) {
    if (document.querySelector('.wgd-pasang')) return;
    suntikGaya();
    const bilah = document.createElement('div');
    bilah.className = 'wgd-pasang';
    bilah.setAttribute('role', 'dialog');
    bilah.setAttribute('aria-label', 'Pasang aplikasi');
    bilah.innerHTML = `
      <span class="wgd-pasang__ikon" aria-hidden="true">W</span>
      <span class="wgd-pasang__teks">
        <span class="wgd-pasang__judul">Pasang di layar utama</span>
        <span class="wgd-pasang__sub"></span>
      </span>
      <span class="wgd-pasang__aksi"></span>
      <button class="wgd-tutup" type="button" aria-label="Tutup">×</button>`;
    bilah.querySelector('.wgd-pasang__sub').textContent = teksSub;
    const aksi = bilah.querySelector('.wgd-pasang__aksi');
    aksi.appendChild(aksiTombol);
    const tombolTutup = document.createElement('button');
    tombolTutup.type = 'button';
    tombolTutup.className = 'wgd-pasang__nanti';
    tombolTutup.textContent = 'Nanti';
    aksi.appendChild(tombolTutup);

    const tutup = () => {
      bilah.classList.remove('tampil');
      setTimeout(() => bilah.remove(), 300);
    };
    tombolTutup.addEventListener('click', () => {
      tandaiDitolak();
      tutup();
    });
    bilah.querySelector('.wgd-tutup').addEventListener('click', () => {
      tandaiDitolak();
      tutup();
    });

    document.body.appendChild(bilah);
    requestAnimationFrame(() => bilah.classList.add('tampil'));
  }

  // ── 4. Android / Chrome / Edge: pakai prompt bawaan ────────
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptTertunda = e;
    if (sudahDitolak()) return;
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'wgd-pasang__ya';
    tombol.textContent = 'Pasang';
    tombol.addEventListener('click', async () => {
      const p = promptTertunda;
      promptTertunda = null;
      const bilah = tombol.closest('.wgd-pasang');
      if (!p) return;
      p.prompt();
      const { outcome } = await p.userChoice;
      if (outcome === 'accepted' && bilah) {
        bilah.classList.remove('tampil');
        setTimeout(() => bilah.remove(), 300);
      }
    });
    tampilkanBilah('Akses cepat dari layar utama, bisa dibuka tanpa buka browser.', tombol);
  });

  window.addEventListener('appinstalled', () => {
    const bilah = document.querySelector('.wgd-pasang');
    if (bilah) {
      bilah.classList.remove('tampil');
      setTimeout(() => bilah.remove(), 300);
    }
  });

  // ── 5. iOS/Safari: petunjuk manual ─────────────────────────
  if (adalahSafariIOS && !sudahDitolak()) {
    // Hanya di perangkat sentuh, dan setelah pengguna agak lama membaca.
    setTimeout(() => {
      const tombol = document.createElement('button');
      tombol.type = 'button';
      tombol.className = 'wgd-pasang__ya';
      tombol.textContent = 'Caranya';
      tombol.addEventListener('click', () => {
        alert(
          'Pasang di iPhone/iPad:\n\n' +
            '1. Ketuk tombol Bagikan (kotak dengan panah ke atas) di Safari.\n' +
            '2. Gulir ke bawah, pilih "Tambahkan ke Layar Utama".\n' +
            '3. Ketuk "Tambah".\n\n' +
            'Ikon aplikasi akan muncul di layar utama.'
        );
      });
      tampilkanBilah('Ketuk Bagikan, lalu "Tambahkan ke Layar Utama".', tombol);
    }, 12000);
  }
})();
