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
  //
  // Dipilih dengan sengaja, bukan semua `<strong>`: halaman ini memakai
  // `<strong>` juga untuk label pendek di dalam daftar langkah ("Unduh APK",
  // "Setelan"), dan menyorot semua itu membuat halamannya terasa penuh
  // stabilo. Yang disorot hanya kalimat penentu di dalam paragraf.
  document.querySelectorAll(
    '.hero__lead strong, .pengantar strong, .blok p strong, .legal p strong'
  ).forEach((el) => {
    // Hanya sorot yang berada di tengah kalimat. Label pendek seperti
    // "Unduh APK" atau "Lokasi (perkiraan)" berdiri di awal paragraf dan
    // sengaja dilewati — menyorot semuanya membuat halaman terasa penuh.
    const sebelum = el.previousSibling;
    if (!sebelum || !sebelum.textContent.trim()) return;
    if (el.parentElement && el.parentElement.textContent.trim().length < 40) return;
    if (el.closest('.ax-reveal, .ax-stagger')) return;
    el.classList.add('ax-sorot');
    penanda.push(el);
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

  // ── 6. Parallax: lapisan bergeser beda kecepatan ─────────
  // Berlaku di seluruh halaman, bukan hanya hero. Angka `--ax-depth`
  // menentukan seberapa jauh lapisan bergeser; makin besar, makin terasa
  // dekat ke pengunjung.
  //
  // PENTING: gerak di sini memakai properti `translate`, BUKAN `transform`.
  // Elemen-elemen ini sudah dianimasikan oleh styles.css memakai `transform`
  // (aurora bergerak, kartu miring). Kalau parallax menulis `transform` juga,
  // salah satu akan menghapus yang lain.
  //
  // Elemen yang punya animasi kemunculan SENDIRI sengaja DILEWATI: animasi
  // itu juga memakai `translate`, dan yang belakangan menang — parallax-nya
  // akan mati begitu saja. Yang dilewati hanya elemen ber-`ax-reveal` dan
  // anak langsung wadah berjenjang (`ax-stagger`), sebab keduanya yang
  // benar-benar dianimasikan. Anak dari wadah ber-`ax-reveal` tetap boleh:
  // `translate` anak menambah di atas `translate` induk, jadi keduanya
  // hidup bersama.
  if (!kurangi) {
    const LAPISAN = [
      // Hero
      ['.hero__glow', -46], ['.hero__lines', -18], ['.hero__visual', 22],
      ['.ticker', 10],
      // Dekorasi antarbagian
      ['.fx-aurora', -30], ['.fx-scan', -12], ['.fx-grain', 0],
      // Kepala bagian dan wadah isi, di seluruh halaman
      ['.head', 14], ['.pilihan', 10], ['.maskot__grid', 16],
      ['.bento', 12], ['.plans', 10], ['.flow', 12], ['.target__stats', 14],
      ['.contact', 12], ['.kaki', 8],
      // Halaman unduh & privasi
      ['.blok > h2', 10], ['.blok > .pengantar', 8],
    ];
    // Catatan: halaman privasi sengaja TIDAK diberi parallax pada isinya.
    // Seluruh blok di sana adalah elemen kemunculan, dan yang tersisa hanya
    // paragraf bacaan — menggeser teks yang sedang dibaca lebih mengganggu
    // daripada indah. Di halaman itu efeknya cukup kanvas, clay, dan sorotan.
    const parallax = [];
    LAPISAN.forEach(([sel, depth]) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.classList.contains('ax-reveal') ||
            (el.parentElement &&
             el.parentElement.classList.contains('ax-stagger'))) return;
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
      const tinggi = window.innerHeight;
      const tengah = tinggi / 2;
      for (const el of parallax) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > tinggi + 200) continue;
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

  // ── 7. Rendering waktu nyata: kanvas partikel ────────────
  // Satu kanvas tetap untuk seluruh halaman, digambar ulang setiap bingkai.
  // Titik-titik melayang pelan dan menyala redup.
  //
  // Warnanya ikut bagian yang sedang dilihat: bagian gelap memakai titik
  // muda yang bercahaya, bagian terang memakai titik amber tua yang terbaca.
  // Warna dibaca dari latar bagian di belakang titik itu, jadi transisinya
  // terjadi sendiri saat pengunjung menggulir dari bagian terang ke gelap.
  //
  // Penghematan yang disengaja: berhenti saat tab tidak aktif, jumlah titik
  // dibatasi luas layar, dan gambar baru mulai setelah halaman tenang —
  // ini hiasan, bukan isi.
  const kanvas = document.createElement('canvas');
  kanvas.className = 'ax-kanvas';
  kanvas.setAttribute('aria-hidden', 'true');
  const ctx = !kurangi && kanvas.getContext && kanvas.getContext('2d');
  if (ctx) {
    document.body.prepend(kanvas);
    let lebar = 0, tinggi = 0;
    let titik = [];
    let jalan = false, halus = false, bagianGelap = true;

    const ukur = () => {
      const rasio = Math.min(window.devicePixelRatio || 1, 2);
      lebar = window.innerWidth;
      tinggi = window.innerHeight;
      kanvas.width = Math.round(lebar * rasio);
      kanvas.height = Math.round(tinggi * rasio);
      ctx.setTransform(rasio, 0, 0, rasio, 0, 0);
      const jumlah = Math.max(20, Math.min(60,
        Math.round(lebar * tinggi / 16000)));
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

    // Bagian mana yang sedang berada di tengah layar? Warnanya menentukan
    // warna titik. Hanya dihitung saat menggulir, bukan tiap bingkai.
    const bagianGelapSekarang = () => {
      const tengah = window.innerHeight / 2;
      let hasil = bagianGelap;
      document.querySelectorAll('section.sec, .hero, .foot, .blok, .legal')
        .forEach((w) => {
          const r = w.getBoundingClientRect();
          if (r.top <= tengah && r.bottom >= tengah) {
            hasil = w.classList.contains('sec--dark') ||
                    w.classList.contains('hero') ||
                    w.classList.contains('foot') ||
                    w.classList.contains('blok--gelap');
          }
        });
      return hasil;
    };

    const gambar = () => {
      ctx.clearRect(0, 0, lebar, tinggi);
      const warna = bagianGelap ? '245 214 150' : '196 118 42';
      const dasar = bagianGelap ? 0.30 : 0.24;
      const puncak = bagianGelap ? 0.42 : 0.34;
      for (const t of titik) {
        t.x += t.vx; t.y += t.vy; t.f += 0.012 * t.d;
        if (t.y < -8) { t.y = tinggi + 8; t.x = Math.random() * lebar; }
        if (t.x < -8) t.x = lebar + 8;
        if (t.x > lebar + 8) t.x = -8;
        const nyala = dasar + puncak * (0.5 + 0.5 * Math.sin(t.f));
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${warna} / ${nyala.toFixed(3)})`;
        ctx.fill();
      }
      if (jalan) requestAnimationFrame(gambar);
    };

    const mulai = () => {
      if (jalan || !halus || document.hidden) return;
      jalan = true;
      requestAnimationFrame(gambar);
    };
    const henti = () => { jalan = false; };

    ukur();
    // Warna bagian dihitung ulang saat menggulir, dengan penahan bingkai.
    let menungguW = false;
    window.addEventListener('scroll', () => {
      if (menungguW) return;
      menungguW = true;
      requestAnimationFrame(() => {
        menungguW = false;
        bagianGelap = bagianGelapSekarang();
      });
    }, { passive: true });

    // Baru mulai setelah halaman tenang; ini hiasan, bukan isi.
    const tenang = () => { halus = true; mulai(); };
    if (document.readyState === 'complete') setTimeout(tenang, 700);
    else window.addEventListener('load', () => setTimeout(tenang, 700), { once: true });
    document.addEventListener('visibilitychange', () => {
      document.hidden ? henti() : mulai();
    });

    // Ukur ulang saat lebar benar-benar berubah — bukan saat tinggi berubah,
    // karena bilah alamat ponsel yang menyembunyikan diri memicu itu terus.
    let menungguU = false;
    window.addEventListener('resize', () => {
      if (menungguU) return;
      menungguU = true;
      setTimeout(() => { menungguU = false; ukur(); }, 200);
    }, { passive: true });
  }

  // ── 8. Kedalaman 3D pada kartu yang menonjol ─────────────
  // Selain kartu hero, bagian isi juga diberi kedalaman: saat kursor bergerak
  // di atasnya, seluruh bagiannya miring sedikit dan isinya bergeser pada
  // kedalaman berbeda. Sudutnya sengaja lebih kecil daripada kartu hero
  // (lihat `.ax-3d--halus` di animasi.css) supaya bacaan tetap nyaman.
  //
  // Ini dikerjakan sebagai kedalaman 3D, bukan AR/VR penuh: AR/VR butuh
  // kamera dan kacamata, memberatkan situs publik UMKM, dan tidak menambah
  // apa pun bagi pengunjung warung yang membuka dari HP.
  if (!kurangi && presisi) {
    // Elemen yang memang sudah dipakai kursor untuk hal lain dilewati:
    // tombol dan tautan harus tetap bisa diklik tanpa bidang yang bergerak.
    const LEWATI = 'a, button, input, textarea, select, summary';

    const pasangPanggung = (wadah, lapis, halus) => {
      if (!wadah) return;
      wadah.classList.add('ax-3d');
      if (halus) wadah.classList.add('ax-3d--halus');
      // Kartu yang punya lapisan di dalamnya perlu `preserve-3d`, kalau tidak
      // isinya menempel datar pada kartunya dan kedalamannya hilang.
      wadah.querySelector('.glowcard')?.classList.add('ax-3d__dalam');
      lapis.forEach(([sel, z]) => {
        wadah.querySelectorAll(sel).forEach((el) => {
          if (el.closest(LEWATI)) return;
          // Anak wadah berjenjang dianimasikan kemunculannya memakai
          // `translate`, dan animasi itu menang atas nilai dari sini —
          // kedalamannya tidak akan terlihat. Panggungnya tetap miring,
          // jadi efeknya tidak hilang seluruhnya.
          if (el.parentElement &&
              el.parentElement.classList.contains('ax-stagger')) return;
          el.classList.add('ax-3d__lapis');
          el.style.setProperty('--ax-z', z);
        });
      });

      let tx = 0, ty = 0, tx2 = 0, ty2 = 0, hidup = false;
      const jalan = () => {
        tx2 += (tx - tx2) * 0.14;
        ty2 += (ty - ty2) * 0.14;
        wadah.style.setProperty('--ax-tx', tx2.toFixed(2));
        wadah.style.setProperty('--ax-ty', ty2.toFixed(2));
        if (hidup || Math.abs(tx - tx2) > 0.01) requestAnimationFrame(jalan);
        else hidup = false;
      };
      const bangun = () => { if (!hidup) { hidup = true; requestAnimationFrame(jalan); } };
      wadah.addEventListener('mousemove', (e) => {
        const r = wadah.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        bangun();
      }, { passive: true });
      wadah.addEventListener('mouseleave', () => { tx = 0; ty = 0; bangun(); });
    };

    // Kartu hero: kedalaman penuh, beberapa lapisan menonjol.
    pasangPanggung(
      document.querySelector('.hero__visual'),
      [['.qrfloat', 46], ['.chip--a', 60], ['.chip--b', 52],
       ['.hero__maskot', 26], ['.glowcard', 10],
       ['.glowcard__banner', 14], ['.glowcard__items', 8]],
      false
    );
    // Kartu isi di seluruh halaman: kedalaman lebih tipis, hanya isinya yang
    // bergeser supaya tidak ada bidang yang terasa berputar.
    document.querySelectorAll('.bento, .plans, .pilihan, .maskot__grid, .inno__grid')
      .forEach((w) => {
        pasangPanggung(w, [['article', 22], ['figure', 16], ['li', 14]], true);
      });
    // Kartu ringkasan di halaman privasi: hanya kartunya yang miring, tanpa
    // lapisan di dalamnya. Isinya daftar kalimat, dan menggeser tiap baris
    // membuat bacaan tidak nyaman.
    pasangPanggung(document.querySelector('.legal .card'), [], true);
  }

  // ── 9. Claymorphism ──────────────────────────────────────
  // Semua elemen kecil yang empuk dipandang, di seluruh halaman.
  //
  // `ax-clay` hanya menambah bayangan dalam dan tidak pernah menimpa warna
  // latar — lihat catatan di animasi.css. Karena itu hanya elemen yang SUDAH
  // punya latar sendiri yang boleh diberi kelas ini; pada elemen tanpa latar
  // bayangannya tidak akan terlihat.
  const clay = (sel, kelas) => document.querySelectorAll(sel)
    .forEach((el) => el.classList.add('ax-clay', ...kelas));

  // Elemen yang sudah punya latar sendiri.
  clay('.pill', ['ax-clay--bulat']);
  clay('.chip', ['ax-clay--bulat']);
  clay('.fx-tag', ['ax-clay--bulat', 'ax-clay--gelap']);
  clay('.price__badge', ['ax-clay--bulat']);
  clay('.market__tags span', ['ax-clay--bulat', 'ax-clay--gelap']);
  clay('.report__row', ['ax-clay--gelap']);
  clay('.panduan__nomor', ['ax-clay--bulat', 'ax-clay--gelap']);
  clay('.flow__n', ['ax-clay--bulat', 'ax-clay--gelap']);
  clay('.kartu__ico', ['ax-clay--gelap']);
  clay('.inno__no', ['ax-clay--bulat', 'ax-clay--gelap']);
  // Kotak ikon di halaman unduh sudah punya latar dan ukuran tetap, jadi
  // aman diberi bayangan clay tanpa varian `--latar`. Varian itu justru
  // berbahaya di sini: kotak tombolnya berlatar tinta gelap, dan menimpanya
  // dengan latar krem membuat ikon amber di atasnya nyaris tak terbaca
  // (kontras 1.96:1).
  //
  // Ikon emoji di beranda sengaja TIDAK disentuh sama sekali: menambah latar
  // dan jarak dalam di sana menambah tinggi kartu, dan tata letak beranda
  // ikut bergeser — efek yang tidak sepadan.
  clay('.panduan__gambar', []);
  // Kartu ringkasan dan ikon di halaman privasi sudah punya latar sendiri.
  clay('.legal .card', []);
  clay('.legal .logo__mark', []);

  // ── 10. Tombol WhatsApp mengambang diberi gerak melayang ──
  // Perhatikan: gerak ini memakai properti `translate`, bukan `transform`,
  // karena tombol itu menyembunyikan dirinya lewat `transform`. Lihat
  // catatan di animasi.css — menulis `transform` di sini akan membuatnya
  // muncul terus sejak halaman dibuka.
  const fab = document.getElementById('fab');
  if (fab && !kurangi) fab.classList.add('ax-float');
})();
