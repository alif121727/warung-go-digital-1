/* ══════════════════════════════════════════════════════════
   animasi.js — penggerak lapisan gerak `ax-`.

   Prinsip: semua efek di sini adalah tambahan. Bila skrip ini gagal dimuat
   atau JavaScript dimatikan, halaman harus tetap terbaca utuh. Karena itu
   kelas `ax-reveal` sengaja TIDAK ditulis di HTML — kelas itu dipasang dari
   sini. Dengan begitu, tanpa JavaScript tidak ada elemen yang tersembunyi.

   Gerak yang bergantung kursor (sorotan, kemiringan) hanya dipasang di
   perangkat berpenunjuk presisi, dan tidak pernah saat "kurangi gerak" aktif.
   ══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const kurangi = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const presisi = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const akar = document.documentElement;

  // ── 1. Bilah kemajuan gulir ──────────────────────────────
  // Ditulis langsung ke CSS variable/transform, bukan lewat class, agar
  // tidak memicu perhitungan ulang tata letak di setiap geseran.
  if (!kurangi) {
    const bilah = document.createElement('div');
    bilah.className = 'ax-progress';
    bilah.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bilah);

    let menunggu = false;
    const perbarui = () => {
      const tinggi = akar.scrollHeight - window.innerHeight;
      const maju = tinggi > 0 ? Math.min(window.scrollY / tinggi, 1) : 0;
      bilah.style.transform = `scaleX(${maju})`;
      menunggu = false;
    };
    window.addEventListener('scroll', () => {
      if (menunggu) return;
      menunggu = true;
      requestAnimationFrame(perbarui);
    }, { passive: true });
    window.addEventListener('resize', perbarui, { passive: true });
    perbarui();
  }

  // ── 2. Sorotan mengikuti kursor ──────────────────────────
  if (!kurangi && presisi) {
    const sorot = document.createElement('div');
    sorot.className = 'ax-spot';
    sorot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sorot);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let mx2 = mx;
    let my2 = my;
    let hidup = false;

    // Posisi asli disimpan, lalu dikejar perlahan di loop gambar. Ini
    // membuat sorotan tertinggal sedikit dari kursor — terasa lebih halus
    // daripada menempel kaku.
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!hidup) { hidup = true; sorot.classList.add('is-on'); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => {
      hidup = false;
      sorot.classList.remove('is-on');
    });

    const ikuti = () => {
      mx2 += (mx - mx2) * 0.12;
      my2 += (my - my2) * 0.12;
      sorot.style.setProperty('--ax-x', `${mx2.toFixed(1)}px`);
      sorot.style.setProperty('--ax-y', `${my2.toFixed(1)}px`);
      requestAnimationFrame(ikuti);
    };
    requestAnimationFrame(ikuti);
  }

  // ── 3. Kemunculan saat digulir ───────────────────────────
  // Dua tingkat, bukan satu. Blok besar muncul sebagai satu kesatuan;
  // isinya menyusul berjenjang lewat wadah `ax-stagger`. Bila keduanya
  // ditumpuk pada elemen yang sama, tampilan jadi keruh — jadi elemen di
  // dalam wadah berjenjang sengaja tidak diberi animasi sendiri.
  //
  // Beranda sudah punya animasi kemunculan dari app.js (kelas `reveal`).
  // Elemen itu dilewati agar tidak dua kali bekerja. Lapisan ini yang
  // mengurus halaman yang belum punya: unduh.html dan privasi.html.

  const REVEAL = [
    'section.blok', 'section.sec > .head', '.legal .card', '.legal__head',
    '.legal > h1', '.legal > .meta', '.maskot__card', '.inno__card',
    '.tile', '.price', '.unduh', '.contact', '.target', '.market',
  ].join(', ');
  const STAGGER = '.pilihan, .maskot__grid, .inno__grid, ol.panduan';

  const berjenjang = [...document.querySelectorAll(STAGGER)];

  // Tiga penjagaan agar tidak ada elemen yang dianimasikan dua kali:
  //   a. cukup induk terluar — anak yang di dalam penanda lain dilewati;
  //   b. apa pun di dalam wadah berjenjang sudah diurus oleh wadah itu;
  //   c. elemen berkelas `reveal` sudah diurus app.js (beranda).
  const penanda = [...document.querySelectorAll(REVEAL)].filter((el) =>
    !el.parentElement?.closest(REVEAL) &&
    !el.closest(STAGGER) &&
    !el.classList.contains('reveal') &&
    !el.closest('.reveal')
  );

  penanda.forEach((el) => el.classList.add('ax-reveal', 'ax-reveal--soft'));
  berjenjang.forEach((el) => el.classList.add('ax-stagger'));

  // Judul seksi diberi garis aksen yang memanjang saat masuk layar.
  // Beberapa judul seksi tidak berada di dalam `.head`, jadi pemilihnya
  // harus menyebut wadahnya satu per satu. Menyebut `main h2` saja akan
  // ikut mengenai judul di dalam kartu, yang tidak seharusnya bergaris.
  const judul = document.querySelectorAll(
    '.head h2, .blok > h2, .legal h1, .legal h2, ' +
    '.target__copy > h2, .contact__head > h2, .kepala h1'
  );
  judul.forEach((el) => el.classList.add('ax-underline'));

  const tampilkanSemua = () => {
    penanda.forEach((el) => el.classList.add('ax-in'));
    berjenjang.forEach((el) => el.classList.add('ax-in'));
    judul.forEach((el) => el.classList.add('ax-in'));
  };

  if (kurangi || typeof IntersectionObserver !== 'function') {
    // Tanpa gerak, atau peramban tanpa pengamat irisan: tampilkan semuanya
    // sekaligus. Jangan pernah biarkan isi halaman tersembunyi hanya karena
    // sebuah efek tidak bisa dijalankan.
    tampilkanSemua();
  } else {
    // Apakah pengamat benar-benar bekerja? Penanda ini yang membedakan
    // "belum sampai" dari "tidak berfungsi" — hanya yang kedua perlu
    // ditolong, sebab menolong yang pertama akan merusak waktunya.
    let pengamatHidup = false;
    const pengamat = new IntersectionObserver((entri) => {
      entri.forEach((e) => {
        if (!e.isIntersecting) return;
        pengamatHidup = true;
        e.target.classList.add('ax-in');
        pengamat.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    [...penanda, ...berjenjang, ...judul].forEach((el) => pengamat.observe(el));

    // Jaring pengaman. Bila pengamat irisan mati — galat tak terduga, tata
    // letak ganjil, atau apa pun — isi halaman tetap harus terbaca,
    // termasuk bagian bawah yang baru terlihat saat digulir.
    //
    // Sengaja hanya menampilkan elemen yang SEDANG terlihat layar, dan
    // hanya setelah pengamat terbukti tidak pernah menyala. Tanpa syarat
    // itu, jaring ini justru akan menampilkan isi lebih awal daripada
    // pengamat, dan efek kemunculannya hilang.
    const periksaTerlihat = () => {
      if (pengamatHidup) return false;
      let ada = false;
      document.querySelectorAll('.ax-reveal:not(.ax-in), .ax-stagger:not(.ax-in)')
        .forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) {
            el.classList.add('ax-in');
            ada = true;
          }
        });
      return ada;
    };
    let sisaPemeriksaan = 30;
    const pengawas = setInterval(() => {
      if (pengamatHidup || --sisaPemeriksaan <= 0) clearInterval(pengawas);
      periksaTerlihat();
    }, 1000);
    // Juga saat digulir — kalau pengamat benar-benar mati, ini yang
    // menyelamatkan bagian bawah halaman.
    window.addEventListener('scroll', periksaTerlihat, { passive: true });
  }

  // ── 4. Kemiringan 3D + kilau kursor ──────────────────────
  if (!kurangi && presisi) {
    // Sudut sengaja kecil (maks 6°) agar teks tetap tajam dan tidak ada
    // elemen yang melampaui tepi layar.
    const MAKS = 6;
    document.querySelectorAll('.kartu, .maskot__card, .inno__card, .price')
      .forEach((el) => {
        el.classList.add('ax-tilt', 'ax-glide');
        el.addEventListener('mousemove', (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.setProperty('--ax-rx', (px * MAKS * 2).toFixed(2));
          el.style.setProperty('--ax-ry', (py * MAKS * 2).toFixed(2));
          el.classList.add('is-tilting');
        });
        el.addEventListener('mouseleave', () => {
          el.classList.remove('is-tilting');
          el.style.removeProperty('--ax-rx');
          el.style.removeProperty('--ax-ry');
        });
      });
  }

  // ── 5. Tombol WhatsApp mengambang diberi gerak melayang ──
  // Perhatikan: gerak ini memakai properti `translate`, bukan `transform`,
  // karena tombol itu menyembunyikan dirinya lewat `transform`. Lihat
  // catatan di animasi.css — menulis `transform` di sini akan membuatnya
  // muncul terus sejak halaman dibuka.
  const fab = document.getElementById('fab');
  if (fab && !kurangi) fab.classList.add('ax-float');
})();
