/* ══════════════════════════════════════════════════════════
   pembuka.js — video pembuka (intro) beranda.

   Kelas `pembuka-aktif` dipasang oleh skrip kecil di <head> SEBELUM halaman
   digambar, supaya beranda tidak berkelip lebih dulu. Berkas ini hanya
   menjalankan videonya dan menyediakan jalan keluar.

   Yang dijaga di sini:

   - **Selalu ada jalan keluar.** Tombol "Lewati" di kanan bawah, tombol Esc,
     dan penutupan otomatis saat video habis. Bila video gagal dimuat, lapisan
     langsung dilewati — jangan sampai beranda tertutup selamanya.
   - **Mulai tanpa suara.** Peramban menolak pemutaran bersuara yang tidak
     diminta pengunjung; tombol pengeras menyalakan suara bila dikehendaki.
   - **Sekali per sesi.** Setelah dilewati, penanda disimpan di sessionStorage
     supaya tidak muncul lagi di penjelajahan berikutnya pada sesi yang sama.
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var akar = document.documentElement;
  if (!akar.classList.contains("pembuka-aktif")) return;

  var lapisan = document.getElementById("pembuka");
  var video = document.getElementById("pembukaVideo");
  if (!lapisan || !video) {
    akar.classList.remove("pembuka-aktif");
    return;
  }

  var tombolLewati = document.getElementById("pembukaLewati");
  var tombolSuara = document.getElementById("pembukaSuara");
  var bilah = document.getElementById("pembukaBilah");
  var KUNCI = "wgd-pembuka";
  var ditutup = false;

  window.__wgdPembukaSiap = true;

  function tandaiSelesai() {
    try {
      sessionStorage.setItem(KUNCI, "1");
    } catch (e) {
      /* mode privat: abaikan */
    }
  }

  function tutup() {
    if (ditutup) return;
    ditutup = true;
    tandaiSelesai();
    try {
      video.pause();
    } catch (e) {
      /* abaikan */
    }
    lapisan.classList.add("pembuka--tutup");
    var buang = function () {
      akar.classList.remove("pembuka-aktif");
    };
    lapisan.addEventListener("transitionend", buang, { once: true });
    // Jaring pengaman: bila `transitionend` tidak datang (mis. transisi
    // dimatikan), tetap buang lapisan supaya beranda tidak tertutup.
    setTimeout(buang, 700);
  }

  tombolLewati.addEventListener("click", tutup);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") tutup();
  });

  tombolSuara.addEventListener("click", function () {
    video.muted = !video.muted;
    tombolSuara.setAttribute("aria-pressed", String(!video.muted));
    tombolSuara.setAttribute(
      "aria-label",
      video.muted ? "Nyalakan suara video" : "Matikan suara video"
    );
    if (!video.muted) {
      var janji = video.play();
      if (janji && janji.catch) janji.catch(function () {});
    }
  });

  video.addEventListener("timeupdate", function () {
    if (!bilah || !video.duration) return;
    bilah.style.width = ((video.currentTime / video.duration) * 100).toFixed(2) + "%";
  });

  video.addEventListener("ended", tutup);

  // ── Dua versi video, dipilih menurut koneksi ─────────────
  // Versi ringan 3,9 MB (SSIM 0,991) dan versi HD 7,0 MB (SSIM 0,995).
  // Diukur pada jaringan 700 kb/s selama 22 detik: versi ringan tersendat
  // 2 kali, versi HD 5 kali. Karena itu HD hanya dipakai bila koneksi
  // memang lapang — pengunjung dengan koneksi cepat mendapat gambar
  // terbaik, yang lambat tidak dipaksa menunggu.
  var SUMBER_RINGAN = "video/pembuka.mp4";
  var SUMBER_HD = "video/pembuka-hd.mp4";
  var pakaiCadangan = false;

  function pilihSumber() {
    var koneksi = navigator.connection || navigator.mozConnection ||
                  navigator.webkitConnection;
    // Tidak diketahui: pilih yang ringan. Salah pilih ke arah ringan hanya
    // sedikit mengurangi ketajaman; salah ke arah HD membuat video tersendat.
    if (!koneksi) return SUMBER_RINGAN;
    if (koneksi.saveData) return SUMBER_RINGAN;
    if (/^(slow-)?2g$|^3g$/.test(koneksi.effectiveType || "")) {
      return SUMBER_RINGAN;
    }
    var unduh = koneksi.downlink; // megabit/detik
    if (typeof unduh === "number" && unduh > 0 && unduh < 1.5) {
      return SUMBER_RINGAN;
    }
    return SUMBER_HD;
  }

  function mainkan() {
    // Autoplay bersuara ditolak peramban, jadi mulai tanpa suara. Bila tetap
    // ditolak (mode hemat daya), poster tetap tampil dan pengunjung bisa
    // memilih sendiri lewat tombol.
    var janji = video.play();
    if (janji && janji.catch) janji.catch(function () {});
  }

  function keRingan() {
    if (pakaiCadangan) return false;
    pakaiCadangan = true;
    video.src = SUMBER_RINGAN;
    mainkan();
    return true;
  }

  // Video gagal dimuat (berkas hilang, offline, atau format ditolak). Bila
  // yang gagal versi HD, coba versi ringan dulu; baru menyerah bila itu pun
  // gagal. Jangan biarkan lapisan menutupi beranda.
  video.addEventListener("error", function () {
    if (!keRingan()) tutup();
  });
  var sumber = video.querySelector("source");
  if (sumber) sumber.addEventListener("error", function () {
    if (!keRingan()) tutup();
  });

  video.src = pilihSumber();
  mainkan();
})();
