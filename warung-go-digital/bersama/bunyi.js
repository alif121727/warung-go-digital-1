/* ══════════════════════════════════════════════════════════
   bunyi.js — bunyi notifikasi khas Warung Go Digital.

   Polanya: kicauan burung, lalu diakhiri ucapan
   "Pembayaran diterima sejumlah <jumlah> rupiah".

   Kicauan dibuat dengan Web Audio (osilator), jadi tidak perlu
   berkas suara dan tidak ada urusan hak cipta. Ucapan memakai
   suara bawaan HP (speechSynthesis).

   Catatan penting: peramban hanya mengizinkan bunyi setelah
   pengguna berinteraksi dengan halaman. Karena itu `bukaKunci()`
   dipanggil pada sentuhan pertama, supaya notifikasi berikutnya
   tidak diblokir. Bila aplikasi benar-benar tertutup, tidak ada
   web yang bisa membunyikan suara — aplikasi perlu terbuka.
   ══════════════════════════════════════════════════════════ */
const Bunyi = (() => {
  'use strict';

  let konteks = null;
  let terbuka = false;

  const konteksBaru = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      if (!konteks) konteks = new AC();
      if (konteks.state === 'suspended') konteks.resume();
    } catch (e) {
      return null;
    }
    return konteks;
  };

  // Satu kicauan: nada menanjak lalu menurun cepat, seperti burung.
  const kicau = (ac, mulai, frekAwal, frekAkhir, durasi, kuat = 0.22) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frekAwal, mulai);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, frekAkhir), mulai + durasi);
    gain.gain.setValueAtTime(0.0001, mulai);
    gain.gain.exponentialRampToValueAtTime(kuat, mulai + durasi * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, mulai + durasi);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(mulai);
    osc.stop(mulai + durasi + 0.03);
  };

  // Empat kicauan berselang — pola khas burung pagi.
  const kicauanBurung = () => {
    const ac = konteksBaru();
    if (!ac) return 0;
    const t = ac.currentTime + 0.03;
    kicau(ac, t, 2400, 3400, 0.09);
    kicau(ac, t + 0.13, 2900, 2100, 0.08);
    kicau(ac, t + 0.28, 2600, 3600, 0.10);
    kicau(ac, t + 0.43, 3100, 2300, 0.09);
    return 0.6;
  };

  const ucap = (teks) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(teks);
      u.lang = 'id-ID';
      u.rate = 0.98;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* abaikan: sebagian peramban tidak punya suara */
    }
  };

  const rupiahUcap = (n) => Number(n || 0).toLocaleString('id-ID');

  // Notifikasi pembayaran: kicauan burung, lalu ucapan jumlahnya.
  const pembayaran = (jumlah) => {
    const lama = kicauanBurung();
    const teks = 'Pembayaran diterima sejumlah ' + rupiahUcap(jumlah) + ' rupiah';
    setTimeout(() => ucap(teks), Math.max(300, lama * 1000 + 200));
  };

  const pesananBaru = () => {
    kicauanBurung();
    setTimeout(() => ucap('Pesanan baru masuk'), 800);
  };

  const belumBayar = () => {
    const ac = konteksBaru();
    if (!ac) return 0;
    const t = ac.currentTime + 0.03;
    kicau(ac, t, 1800, 1200, 0.12, 0.18);
    kicau(ac, t + 0.20, 1800, 1200, 0.12, 0.18);
    return 0.5;
  };

  // Membuka kunci audio pada sentuhan pertama pengguna.
  const bukaKunci = () => {
    if (terbuka) return;
    terbuka = true;
    konteksBaru();
    document.removeEventListener('pointerdown', bukaKunci);
    document.removeEventListener('keydown', bukaKunci);
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', bukaKunci, { once: true });
    document.addEventListener('keydown', bukaKunci, { once: true });
  }

  return { kicauanBurung, ucap, pembayaran, pesananBaru, belumBayar, bukaKunci, siap: () => !!konteks };
})();

if (typeof window !== 'undefined') window.Bunyi = Bunyi;
