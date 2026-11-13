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

  // ── 3. Tandai elemen yang punya gerak sendiri ────────────
  // Dilakukan lebih dulu, sebelum elemennya dikumpulkan di bagian berikut,
  // supaya kelas yang baru dipasang di sini ikut terbaca.
  //
  // Kepala halaman diberi sambutan masuk berurutan. Beranda sudah menandai
  // sendiri di HTML; halaman unduh belum. Isi kepala tetap terbaca tanpa
  // JavaScript karena `ax-hero` hanya memicu animasi, bukan menyembunyikan.
  document.querySelectorAll('.kepala__isi:not(.ax-hero)')
    .forEach((el) => el.classList.add('ax-hero'));

  // Kotak kode QR diberi sapuan pemindai sekali jalan.
  const qr = document.querySelector('.qrkotak__gambar');
  if (qr && !kurangi) qr.classList.add('ax-scan');

  // Nomor langkah kunci di panduan iPhone diberi denyut halus, supaya mata
  // langsung tertuju ke langkah yang paling menentukan.
  const nomorKunci = document.querySelector('.panduan__langkah--kunci .panduan__nomor');
  if (nomorKunci && !kurangi) nomorKunci.classList.add('ax-pulse-nomor');

  // ── 4. Kemunculan saat digulir ───────────────────────────
  // Dua tingkat, bukan satu. Blok besar muncul sebagai satu kesatuan;
  // isinya menyusul berjenjang lewat wadah `ax-stagger`. Bila keduanya
  // ditumpuk pada elemen yang sama, tampilan jadi keruh — jadi elemen di
  // dalam wadah berjenjang sengaja tidak diberi animasi sendiri.
  //
  // Beranda sudah punya animasi kemunculan dari app.js (kelas `reveal`).
  // Elemen itu dilewati agar tidak dua kali bekerja. Lapisan ini yang
  // mengurus halaman yang belum punya: unduh.html dan privasi.html.

  // Setiap kelompok punya gaya kemunculan sendiri. Blok besar masuk pelan
  // tanpa blur (blur pada elemen seluas seksi membuat gulir terasa berat);
  // elemen kecil boleh lebih hidup dengan blur dan geseran lebih jauh.
  const VARIAN = [
    ['.ax-up',    'section.blok, section.sec > .head, .legal .card, .legal__head, ' +
                  '.maskot__card, .inno__card, .tile, .price, .unduh, .contact, ' +
                  '.target, .market'],
    ['.ax-soft',  '.legal > h1'],
    ['.ax-focus', '.legal > .meta'],
  ];
  const REVEAL = VARIAN.map(([, sel]) => sel).join(', ');
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

  penanda.forEach((el) => {
    el.classList.add('ax-reveal');
    // Tandai variannya sesuai kelompok. Urutan pemeriksaan dari yang paling
    // khusus, supaya elemen yang cocok di dua kelompok tidak salah gaya.
    for (const [penanda, sel] of VARIAN) {
      if (el.matches(sel)) { el.classList.add('ax-reveal--' + penanda.slice(4)); break; }
    }
  });
  berjenjang.forEach((el) => el.classList.add('ax-stagger'));

  // Kalimat penentu diberi sapuan stabilo yang tumbuh saat masuk layar.
  // Ditambahkan ke `penanda` supaya ikut diamati pengamat irisan yang sama.
  //
  // Sengaja HANYA pada elemen yang berdiri sendiri. Menyorot elemen yang
  // sudah bergradasi (seperti `em` di judul hero) akan menghapus gradasinya
  // karena keduanya memakai `background` — sorotan akan menang dan teksnya
  // jadi pudar di atas latar terang.
  document.querySelectorAll('.hero__lead strong, .pengantar strong')
    .forEach((el) => {
      if (!el.closest('.ax-reveal, .ax-stagger')) {
        el.classList.add('ax-sorot');
        penanda.push(el);
      }
    });

  // Judul seksi diberi garis aksen yang memanjang saat masuk layar.
  // Beberapa judul seksi tidak berada di dalam `.head`, jadi pemilihnya
  // harus menyebut wadahnya satu per satu. Menyebut `main h2` saja akan
  // ikut mengenai judul di dalam kartu, yang tidak seharusnya bergaris.
  const judul = document.querySelectorAll(
    '.head h2, .blok > h2, .legal h1, .legal h2, ' +
    '.target__copy > h2, .contact__head > h2, .kepala h1'
  );
  judul.forEach((el) => el.classList.add('ax-underline'));

  // Elemen yang hanya butuh `ax-in` untuk memulai geraknya sendiri.
  const pemicu = [...document.querySelectorAll('.ax-scan, .ax-pulse-nomor')];

  const tampilkanSemua = () => {
    [...penanda, ...berjenjang, ...judul, ...pemicu]
      .forEach((el) => el.classList.add('ax-in'));
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
    [...penanda, ...berjenjang, ...judul, ...pemicu]
      .forEach((el) => pengamat.observe(el));

    // Tautan dalam halaman (`unduh.html#pasang-ios`) dan posisi gulir yang
    // dipulihkan peramban membuka halaman di tengah. Seksi yang berada di
    // ATAS titik itu tidak akan pernah masuk layar, jadi pengamat tidak akan
    // pernah menyala untuknya dan seksi itu tinggal tak terlihat. Karena
    // pengunjung sudah "melewatinya", tampilkan sekalian di awal.
    const sudahTerlewati = () => {
      [...penanda, ...berjenjang].forEach((el) => {
        if (!el.classList.contains('ax-in') &&
            el.getBoundingClientRect().bottom <= 0) {
          el.classList.add('ax-in');
          pengamat.unobserve(el);
        }
      });
    };
    sudahTerlewati();
    window.addEventListener('scroll', sudahTerlewati, { passive: true });

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
      document.querySelectorAll(
        '.ax-reveal:not(.ax-in), .ax-stagger:not(.ax-in), .ax-scan:not(.ax-in)')
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

  // ── 5. Kemiringan 3D + kilau kursor ──────────────────────
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

  // ── 6. Parallax: lapisan dekoratif bergeser beda kecepatan ─
  // Angka `--ax-depth` menentukan seberapa jauh lapisan bergeser. Yang
  // bernilai besar terasa lebih dekat ke pengunjung.
  if (!kurangi) {
    const LAPISAN = [
      ['.hero__glow', -46], ['.fx-aurora', -30], ['.hero__lines', -18],
      ['.fx-scan', -12], ['.hero__visual', 22], ['.ticker', 10],
      ['.head', 14], ['.maskot__card', 18],
    ];
    const parallax = [];
    LAPISAN.forEach(([sel, depth]) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.add('ax-parallax');
        el.style.setProperty('--ax-depth', depth + 'px');
        parallax.push(el);
      });
    });

    // Ditulis ke CSS variable, bukan class, supaya tidak memicu perhitungan
    // ulang tata letak di setiap geseran.
    let menungguP = false;
    const geserParallax = () => {
      menungguP = false;
      const tengah = window.innerHeight / 2;
      for (const el of parallax) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
        // -1 saat elemen masih di bawah layar, 1 saat sudah lewat di atas.
        const p = (tengah - (r.top + r.height / 2)) / tengah;
        el.style.setProperty('--ax-p', Math.max(-1, Math.min(1, p)).toFixed(3));
      }
    };
    window.addEventListener('scroll', () => {
      if (menungguP) return;
      menungguP = true;
      requestAnimationFrame(geserParallax);
    }, { passive: true });
    window.addEventListener('resize', geserParallax, { passive: true });
    geserParallax();
  }

  // ── 7. Rendering waktu nyata: kanvas titik cahaya ────────
  // Digambar ulang setiap bingkai. Titik-titik melayang pelan dan berkelip
  // redup, memberi kesan panggung yang hidup.
  //
  // Dua penghematan yang disengaja: berhenti saat tab tidak aktif, dan
  // berhenti saat kanvas di luar layar. Tanpa keduanya, halaman ini terus
  // memakai baterai walau tidak dilihat. Jumlah titik dibatasi oleh luas
  // layar supaya ponsel kecil tidak keberatan.
  const kanvas = document.querySelector('.ax-kanvas');
  if (kanvas && !kurangi && kanvas.getContext) {
    const ctx = kanvas.getContext('2d');
    let titik = [];
    let lebar = 0, tinggi = 0;
    let jalan = false, terlihat = true, halus = false;

    const ukur = () => {
      const r = kanvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const rasio = Math.min(window.devicePixelRatio || 1, 2);
      lebar = r.width; tinggi = r.height;
      kanvas.width = Math.round(lebar * rasio);
      kanvas.height = Math.round(tinggi * rasio);
      ctx.setTransform(rasio, 0, 0, rasio, 0, 0);
      const jumlah = Math.max(18, Math.min(58, Math.round(lebar * tinggi / 15000)));
      titik = Array.from({ length: jumlah }, () => ({
        x: Math.random() * lebar,
        y: Math.random() * tinggi,
        r: 0.7 + Math.random() * 1.9,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -0.10 - Math.random() * 0.28,
        f: Math.random() * Math.PI * 2,
        d: 0.4 + Math.random() * 0.7,
      }));
    };

    const gambar = () => {
      ctx.clearRect(0, 0, lebar, tinggi);
      for (const t of titik) {
        t.x += t.vx; t.y += t.vy; t.f += 0.012 * t.d;
        if (t.y < -8) { t.y = tinggi + 8; t.x = Math.random() * lebar; }
        if (t.x < -8) t.x = lebar + 8;
        if (t.x > lebar + 8) t.x = -8;
        const nyala = 0.30 + 0.42 * (0.5 + 0.5 * Math.sin(t.f));
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 214, 150, ${nyala.toFixed(3)})`;
        ctx.fill();
      }
      if (jalan) requestAnimationFrame(gambar);
    };

    const mulai = () => {
      if (jalan || !terlihat || !halus || document.hidden) return;
      jalan = true;
      requestAnimationFrame(gambar);
    };
    const henti = () => { jalan = false; };

    ukur();
    // Jangan menggambar sebelum elemennya benar-benar terlihat.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        terlihat = es.some((e) => e.isIntersecting);
        terlihat ? mulai() : henti();
      }, { threshold: 0 }).observe(kanvas);
    }
    // Baru mulai setelah halaman tenang; ini hiasan, bukan isi.
    const tenang = () => { halus = true; mulai(); };
    if (document.readyState === 'complete') setTimeout(tenang, 600);
    else window.addEventListener('load', () => setTimeout(tenang, 600), { once: true });
    document.addEventListener('visibilitychange', () => {
      document.hidden ? henti() : mulai();
    });
    let menungguU = false;
    window.addEventListener('resize', () => {
      if (menungguU) return;
      menungguU = true;
      setTimeout(() => { menungguU = false; ukur(); }, 180);
    }, { passive: true });
  }

  // ── 8. Kedalaman 3D pada visual hero ─────────────────────
  // Panggung ber-`perspective`, lapisan pada kedalaman berbeda, bergeser
  // mengikuti kursor. Ini memberi kedalaman sungguhan yang bisa dipakai
  // di situs biasa — berbeda dari AR/VR yang butuh kamera dan kacamata.
  if (!kurangi && presisi) {
    const wadah3d = document.querySelector('.hero__visual');
    if (wadah3d) {
      wadah3d.classList.add('ax-3d');
      // Kartunya sendiri perlu `preserve-3d` supaya isinya tidak menempel
      // datar — tanpa itu, lapisan di dalamnya kehilangan kedalamannya.
      wadah3d.querySelector('.glowcard')?.classList.add('ax-3d__dalam');
      // Lapisan diberi kedalaman berbeda: chip paling dekat, QR menonjol,
      // maskot agak mundur.
      const lapis = [
        ['.qrfloat', 46], ['.chip--a', 60], ['.chip--b', 52],
        ['.hero__maskot', 26], ['.glowcard', 10],
        ['.glowcard__banner', 14], ['.glowcard__items', 8],
      ];
      lapis.forEach(([sel, z]) => {
        const el = wadah3d.querySelector(sel);
        if (!el) return;
        el.classList.add('ax-3d__lapis');
        el.style.setProperty('--ax-z', z);
      });

      let tx = 0, ty = 0, tx2 = 0, ty2 = 0, hidup3d = false;
      const panggung = () => {
        tx2 += (tx - tx2) * 0.14;
        ty2 += (ty - ty2) * 0.14;
        wadah3d.style.setProperty('--ax-tx', tx2.toFixed(2));
        wadah3d.style.setProperty('--ax-ty', ty2.toFixed(2));
        if (hidup3d || Math.abs(tx - tx2) > 0.01) requestAnimationFrame(panggung);
        else hidup3d = false;
      };
      wadah3d.addEventListener('mousemove', (e) => {
        const r = wadah3d.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;   // -1 .. 1
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (!hidup3d) { hidup3d = true; requestAnimationFrame(panggung); }
      }, { passive: true });
      wadah3d.addEventListener('mouseleave', () => {
        tx = 0; ty = 0;
        if (!hidup3d) { hidup3d = true; requestAnimationFrame(panggung); }
      });
    }
  }

  // ── 9. Claymorphism ──────────────────────────────────────
  // Elemen kecil yang empuk dipandang: lencana, nomor langkah, ikon kartu.
  // Sengaja tidak menyentuh kartu besar maupun angka statistik — di sana
  // efek ini justru membuat tata letak terasa berat, dan sudut bulat penuh
  // pada angka besar terlihat aneh.
  document.querySelectorAll('.pill').forEach((el) => el.classList.add('ax-clay', 'ax-clay--bulat'));
  document.querySelectorAll('.chip').forEach((el) => el.classList.add('ax-clay', 'ax-clay--bulat'));
  document.querySelectorAll('.panduan__nomor').forEach((el) => el.classList.add('ax-clay', 'ax-clay--bulat', 'ax-clay--gelap'));
  document.querySelectorAll('.kartu__ico').forEach((el) => el.classList.add('ax-clay', 'ax-clay--gelap'));

  // ── 10. Tombol WhatsApp mengambang diberi gerak melayang ──
  // Perhatikan: gerak ini memakai properti `translate`, bukan `transform`,
  // karena tombol itu menyembunyikan dirinya lewat `transform`. Lihat
  // catatan di animasi.css — menulis `transform` di sini akan membuatnya
  // muncul terus sejak halaman dibuka.
  const fab = document.getElementById('fab');
  if (fab && !kurangi) fab.classList.add('ax-float');
})();
