/* ══════════════════════════════════════════════════════════
   cerita.js — memutar enam adegan "Cerita Bu Tini".

   Isi cerita ada di HTML sebagai daftar biasa. Berkas ini hanya mengubah
   cara penyajiannya bila memang pantas:

   - hanya bila JavaScript hidup,
   - hanya di layar lebar (> 900px),
   - hanya bila pengunjung tidak memilih "kurangi gerak".

   Bila salah satu tidak terpenuhi, berkas ini tidak melakukan apa pun dan
   daftar biasa yang tampil. Itu sebabnya tidak ada isi yang bisa hilang.

   Cara kerjanya: gambar dan teks tiap adegan dipindahkan ke dalam panggung
   lengket, lalu sejumlah penanda gulir ditaruh setelahnya. Panggungnya tetap
   di tempat; yang berganti isinya.

   Karena pemindahan itu mengubah DOM, semuanya dikembalikan seperti semula
   begitu layar menyempit atau pengguna mengubah pilihan gerak. Tanpa
   pembongkaran itu, daftar akan tampak kosong saat kembali ke layar kecil.
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var sec = document.querySelector(".cerita");
  if (!sec) return;

  var daftar = sec.querySelector(".cerita__daftar");
  var gudang = sec.querySelector(".cerita__penggulung");
  if (!daftar || !gudang) return;

  var adegan = Array.prototype.slice.call(
    daftar.querySelectorAll(".cerita__adegan")
  );
  if (adegan.length < 2) return;

  var kurangGerak = window.matchMedia("(prefers-reduced-motion: reduce)");
  var layarSempit = window.matchMedia("(max-width: 900px)");

  var panggung = null;
  var titik = [];
  var gambar = [];
  var teks = [];
  var langkah = null;
  var jalur = null;
  var aktif = -1;
  var mintaGambar = false;
  var dipasang = false;

  function bangun() {
    if (dipasang) return;
    dipasang = true;

    panggung = document.createElement("div");
    panggung.className = "cerita__panggung";
    var kotakGambar = document.createElement("div");
    kotakGambar.className = "cerita__gambar";
    var kotakTeks = document.createElement("div");
    kotakTeks.className = "cerita__teks";
    panggung.appendChild(kotakGambar);
    panggung.appendChild(kotakTeks);

    // Panggung HARUS berada sebelum titik-titik gulir. Kalau ia ditaruh
    // sesudahnya, ia baru lengket setelah semua titik lewat — dan selama
    // pengunjung menggulir melewati titik, panggungnya sudah hilang dari
    // layar. Urutan inilah yang membuat "menonton" itu bekerja.
    gudang.appendChild(panggung);

    adegan.forEach(function (art, i) {
      // Video lebih diutamakan; <img> tetap didukung bila suatu saat
      // ilustrasi statis dipakai lagi.
      var img = art.querySelector("video, img");
      var isi = art.querySelector(":scope > .cerita__isi");
      if (img) {
        kotakGambar.appendChild(img);
        gambar.push(img);
      }
      if (isi) {
        kotakTeks.appendChild(isi);
        teks.push(isi);
      }
      var t = document.createElement("div");
      t.className = "cerita__titik";
      t.dataset.adegan = String(i);
      // Penanda ini murni alat bantu gulir — tidak ada isinya. Ia diberi
      // `aria-hidden` supaya pembaca layar tidak mengumumkan enam wadah
      // kosong di tengah cerita.
      t.setAttribute("aria-hidden", "true");
      gudang.appendChild(t);
      titik.push(t);
    });

    // Penunjuk langkah dan bilah kemajuan dibuat di sini supaya keduanya
    // berada di dalam kolom teks panggung, bukan di luar tata letaknya.
    var kaki = document.createElement("div");
    kaki.className = "cerita__kaki";
    langkah = document.createElement("div");
    langkah.className = "cerita__langkah";
    // Sengaja bukan `role="tablist"`: ini tombol lompat, bukan kumpulan tab
    // dengan panel. Peran tab yang tidak lengkap justru membingungkan
    // pembaca layar, jadi cukup tombol berlabel.
    langkah.setAttribute("aria-label", "Lompat ke adegan");
    jalur = document.createElement("div");
    jalur.className = "cerita__jalur";
    jalur.appendChild(document.createElement("i"));
    kaki.appendChild(langkah);
    kaki.appendChild(jalur);
    kotakTeks.appendChild(kaki);

    adegan.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Lompat ke adegan " + (i + 1));
      b.addEventListener("click", function () {
        titik[i].scrollIntoView({
          block: "center",
          behavior: kurangGerak.matches ? "auto" : "smooth",
        });
      });
      langkah.appendChild(b);
    });

    sec.classList.add("cerita--panggung");
    window.addEventListener("scroll", saatGulir, { passive: true });
    window.addEventListener("resize", saatGulir, { passive: true });
    saatGulir();
  }

  function bongkar() {
    if (!dipasang) return;
    dipasang = false;
    window.removeEventListener("scroll", saatGulir);
    window.removeEventListener("resize", saatGulir);

    // Kembalikan gambar dan teks ke artikelnya semula, urut seperti semula.
    adegan.forEach(function (art, i) {
      if (gambar[i]) art.insertBefore(gambar[i], art.firstChild);
      if (teks[i]) {
        teks[i].classList.remove("aktif");
        art.appendChild(teks[i]);
      }
    });
    titik.forEach(function (t) {
      if (t.parentNode) t.parentNode.removeChild(t);
    });
    if (panggung && panggung.parentNode) {
      panggung.parentNode.removeChild(panggung);
    }

    titik = [];
    gambar = [];
    teks = [];
    panggung = null;
    langkah = null;
    jalur = null;
    aktif = -1;
    sec.classList.remove("cerita--panggung");
  }

  function tampilkan(i) {
    if (i === aktif) return;
    aktif = i;
    gambar.forEach(function (el, n) {
      el.classList.toggle("aktif", n === i);
      // Hanya video adegan aktif yang berjalan; sisanya dijeda supaya
      // tidak ada enam video berputar sekaligus di belakang layar.
      if (el.tagName === "VIDEO") {
        if (n === i) { var pr = el.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else el.pause();
      }
    });
    teks.forEach(function (el, n) {
      el.classList.toggle("aktif", n === i);
    });
    if (langkah) {
      Array.prototype.forEach.call(langkah.children, function (b, n) {
        if (n === i) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
    }
    if (jalur) {
      jalur.firstChild.style.width = ((i + 1) / adegan.length) * 100 + "%";
    }
  }

  function saatGulir() {
    if (mintaGambar) return;
    mintaGambar = true;
    window.requestAnimationFrame(function () {
      mintaGambar = false;
      var tengah = window.innerHeight / 2;
      var dekat = 0;
      var jarak = Infinity;
      titik.forEach(function (t, i) {
        var r = t.getBoundingClientRect();
        var d = Math.abs((r.top + r.bottom) / 2 - tengah);
        if (d < jarak) {
          jarak = d;
          dekat = i;
        }
      });
      tampilkan(dekat);
    });
  }

  var pengamat = null;

  function pasangPengamat() {
    if (pengamat) return;
    if (!("IntersectionObserver" in window)) return;
    var video = adegan
      .map(function (art) { return art.querySelector("video"); })
      .filter(Boolean);
    if (!video.length) return;
    pengamat = new IntersectionObserver(
      function (entri) {
        entri.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            var pr = v.play();
            if (pr && pr.catch) pr.catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { rootMargin: "10% 0px", threshold: 0.25 }
    );
    video.forEach(function (v) { pengamat.observe(v); });
  }

  function lepasPengamat() {
    if (!pengamat) return;
    pengamat.disconnect();
    pengamat = null;
    adegan.forEach(function (art) {
      var v = art.querySelector("video");
      if (v) v.pause();
    });
  }

  function sesuaikan() {
    if (!kurangGerak.matches && !layarSempit.matches) {
      // Panggung menangani putar/jeda sendiri; pengamat dilepas agar keduanya
      // tidak saling menimpa.
      lepasPengamat();
      bangun();
    } else {
      bongkar();
      pasangPengamat();
    }
  }

  // Penyajian diubah hanya saat melintasi ambang, bukan tiap piksel.
  [kurangGerak, layarSempit].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener("change", sesuaikan);
    else if (mq.addListener) mq.addListener(sesuaikan);
  });

  sesuaikan();
})();
