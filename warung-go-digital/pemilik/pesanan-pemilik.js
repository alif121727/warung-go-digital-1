/* ══════════════════════════════════════════════════════════
   pesanan-pemilik.js — tab Pesanan di aplikasi Pemilik.

   Tugasnya: memberi tahu pemilik saat pelanggan memesan dan membayar.
     • Menarik pesanan dari server sinkron secara berkala.
     • Pesanan baru → kicauan burung + "Pesanan baru masuk".
     • Pelanggan bilang sudah bayar → kicauan burung +
       "Pembayaran diterima sejumlah <jumlah> rupiah".
     • Pesanan lewat 30 menit tanpa pembayaran ditandai merah.

   Bila alamat server belum diisi, tab ini menjelaskan apa yang kurang —
   bukan menampilkan layar kosong.
   ══════════════════════════════════════════════════════════ */
const PesananPemilik = (() => {
  'use strict';

  const KUNCI_PESANAN = 'wgd-pesanan-pemilik-v1';
  const JEDA_TARIK = 20000; // selang penarikan (ms)

  let daftar = [];
  let timer = null;
  let sibuk = false;
  let dipanggilSaatAdaBaru = null;
  let yangDibunyikan = new Set();

  const baca = () => {
    try { return JSON.parse(localStorage.getItem(KUNCI_PESANAN) || '[]') || []; }
    catch (e) { return []; }
  };
  const tulis = (a) => {
    try { localStorage.setItem(KUNCI_PESANAN, JSON.stringify(a.slice(-200))); } catch (e) { /* abaikan */ }
  };

  const warungId = () => {
    const d = Data.buatPenyimpanan('wgd-pemilik-v1').load();
    return (d.warung && d.warung.id) || '';
  };

  /* ── Tarik pesanan dari server ────────────────────────── */
  const tarik = async () => {
    const id = warungId();
    if (!id) return { ok: false, pesan: 'Data warung belum diisi.' };
    if (!Sinkron.aktif()) return { ok: false, pesan: 'Server belum diatur.' };
    const setelan = Sinkron.setelan();
    const kunci = setelan.kunciBaca || setelan.kunci || '';
    try {
      const baru = await Pesanan.tarik(id, kunci);
      // Pesanan yang sudah ada di perangkat tetap dipakai bila server belum
      // memuatnya (mis. server baru dinyalakan).
      const peta = new Map(baca().map((p) => [p.id, p]));
      for (const p of baru) peta.set(p.id, p);
      daftar = [...peta.values()].sort((a, b) => (a.diterima < b.diterima ? 1 : -1));
      tulis(daftar);
      // Bunyikan di sini juga supaya menekan "Periksa pesanan baru" berbunyi
      // sama seperti penarikan otomatis. Id yang sudah dibunyikan dicatat,
      // jadi tidak akan berbunyi dua kali.
      bunyikanYangBaru();
      return { ok: true, daftar };
    } catch (e) {
      return { ok: false, pesan: e.message };
    }
  };

  /* ── Bunyikan notifikasi untuk pesanan yang belum dibunyikan ── */
  const bunyikanYangBaru = () => {
    if (typeof Bunyi === 'undefined') return;
    for (const p of daftar) {
      if (yangDibunyikan.has(p.id)) continue;
      yangDibunyikan.add(p.id);
      // Hanya bunyikan pesanan yang benar-benar baru (bukan dari muat awal).
      if (Date.now() - new Date(p.diterima || p.dibuat).getTime() > 5 * 60000) continue;

      if (p.status === 'dibayar-klaim') {
        Bunyi.pembayaran(p.total);
        if (dipanggilSaatAdaBaru) dipanggilSaatAdaBaru({ jenis: 'bayar', pesanan: p });
      } else if (p.status === 'menunggu') {
        Bunyi.pesananBaru();
        if (dipanggilSaatAdaBaru) dipanggilSaatAdaBaru({ jenis: 'pesanan', pesanan: p });
      }
    }
  };

  /* ── Penarikan berkala ────────────────────────────────── */
  const mulai = (saatAdaBaru) => {
    dipanggilSaatAdaBaru = saatAdaBaru || null;
    // Pesanan yang sudah ada sebelumnya jangan dibunyikan ulang.
    for (const p of baca()) yangDibunyikan.add(p.id);

    const jalankan = async () => {
      if (sibuk || document.hidden) return;
      sibuk = true;
      const h = await tarik();
      sibuk = false;
      if (h.ok) bunyikanYangBaru();
      return h;
    };

    clearInterval(timer);
    timer = setInterval(jalankan, JEDA_TARIK);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) jalankan(); });
    window.addEventListener('online', jalankan);
    jalankan();
    return { jalankan, tarik };
  };

  const hentikan = () => { clearInterval(timer); timer = null; };

  /* ── Tandai lunas / batal ─────────────────────────────── */
  const ubahStatus = async (idPesanan, status) => {
    const setelan = Sinkron.setelan();
    const kunci = setelan.kunciBaca || setelan.kunci || '';
    const p = daftar.find((x) => x.id === idPesanan);
    if (!p) return { ok: false, pesan: 'Pesanan tidak ada.' };
    try {
      await Pesanan.ubahStatus(idPesanan, p.warungId, status, kunci);
      p.status = status;
      tulis(daftar);
      return { ok: true };
    } catch (e) {
      return { ok: false, pesan: e.message };
    }
  };

  /* ── Ringkasan untuk lencana tab ──────────────────────── */
  const perluPerhatian = () =>
    daftar.filter((p) => p.status === 'menunggu' || p.status === 'dibayar-klaim').length;

  const belumBayarLewatBatas = () =>
    daftar.filter((p) => Pesanan.lewatBatas(p)).length;

  const semua = () => daftar;
  const setDaftar = (a) => { daftar = a; tulis(daftar); };

  return {
    mulai, hentikan, tarik, ubahStatus,
    semua, setDaftar, perluPerhatian, belumBayarLewatBatas,
    JEDA_TARIK, KUNCI_PESANAN,
  };
})();

if (typeof window !== 'undefined') window.PesananPemilik = PesananPemilik;
