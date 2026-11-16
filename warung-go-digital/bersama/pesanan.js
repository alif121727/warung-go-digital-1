/* ══════════════════════════════════════════════════════════
   pesanan.js — pesanan dari pelanggan ke pemilik warung.

   Dipakai dua sisi:
     • Halaman menu (pelanggan)  → buat pesanan, tandai "sudah bayar".
     • Aplikasi Pemilik          → tarik pesanan baru, tandai lunas.

   Jalur server (sinkron/server.mjs):
     POST /api/pesanan          buat pesanan      (terbuka, pelanggan tak punya kunci)
     GET  /api/pesanan?w=<id>   daftar pesanan    (butuh kunci)
     POST /api/pesanan-ubah     ubah status       (butuh kunci)

   Bila alamat server belum diisi, pesanan tetap dicatat di HP pelanggan
   dan ditampilkan sebagai "menunggu dikirim" — tidak ada yang hilang,
   hanya belum sampai ke pemilik sampai server dinyalakan.
   ══════════════════════════════════════════════════════════ */
const Pesanan = (() => {
  'use strict';

  const KUNCI_ANTREAN = 'wgd-antrean-pesanan-v1';
  const MENIT_BATAS = 30;

  const uid = () => 'ps-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  const bacaAntrean = () => {
    try {
      const a = JSON.parse(localStorage.getItem(KUNCI_ANTREAN) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  };

  const tulisAntrean = (a) => {
    try { localStorage.setItem(KUNCI_ANTREAN, JSON.stringify(a.slice(-50))); } catch (e) { /* abaikan */ }
  };

  // Alamat server bisa datang dari tiga tempat, berurutan: meta halaman
  // (paling diutamakan, agar bisa dikunci saat dipasang), penyimpanan
  // halaman menu, lalu setelan Sinkron milik aplikasi Pemilik/Pengelola.
  const alamatServer = () => {
    const meta = document.querySelector('meta[name="wgd-menu-server"]');
    const dariMeta = meta && meta.content ? meta.content.trim() : '';
    const dariSetelan = (typeof localStorage !== 'undefined' && localStorage.getItem('wgd-menu-server')) || '';
    if (dariMeta || dariSetelan) return (dariMeta || dariSetelan).replace(/\/+$/, '');
    try {
      if (typeof Sinkron !== 'undefined' && Sinkron.aktif()) {
        return String(Sinkron.setelan().alamat || '').replace(/\/+$/, '');
      }
    } catch (e) { /* abaikan */ }
    return '';
  };

  const panggil = async (jalur, opsi = {}) => {
    const alamat = alamatServer();
    if (!alamat) throw new Error('Server belum diatur.');
    const res = await fetch(alamat + jalur, opsi);
    let isi = null;
    try { isi = await res.json(); } catch (e) { /* biarkan null */ }
    if (!res.ok) throw new Error((isi && isi.pesan) || 'Server menolak (' + res.status + ').');
    return isi;
  };

  /* ── Bentuk pesanan ───────────────────────────────────── */
  const buat = ({ warungId, item, nama, meja, catatan, klaimBayar }) => {
    const dibuat = new Date();
    return {
      wgd: 3,
      jenis: 'pesanan',
      id: uid(),
      warungId: String(warungId || ''),
      dibuat: dibuat.toISOString(),
      batas: new Date(dibuat.getTime() + MENIT_BATAS * 60000).toISOString(),
      nama: String(nama || '').slice(0, 40),
      meja: String(meja || '').slice(0, 20),
      catatan: String(catatan || '').slice(0, 200),
      item: (item || []).map((i) => ({
        nama: String(i.nama || '').slice(0, 80),
        harga: Number(i.harga) || 0,
        jumlah: Math.max(1, Number(i.jumlah) || 1),
      })),
      total: (item || []).reduce((s, i) => s + (Number(i.harga) || 0) * Math.max(1, Number(i.jumlah) || 1), 0),
      // Pelanggan menekan satu tombol: pesan sekaligus menyatakan sudah bayar.
      // Statusnya harus 'dibayar-klaim' sejak awal supaya pemilik mendengar
      // notifikasi pembayaran (kicauan burung + jumlahnya), bukan notifikasi
      // pesanan biasa.
      status: klaimBayar ? 'dibayar-klaim' : 'menunggu',
      diklaim: klaimBayar ? dibuat.toISOString() : null,
      dibayar: null,
    };
  };

  /* ── Sisa waktu sebelum batas 30 menit ────────────────── */
  const sisaMenit = (p) => {
    const batas = new Date(p.batas || new Date(new Date(p.dibuat).getTime() + MENIT_BATAS * 60000));
    return Math.floor((batas.getTime() - Date.now()) / 60000);
  };

  const lewatBatas = (p) => p.status === 'menunggu' && sisaMenit(p) < 0;

  const labelSisa = (p) => {
    if (p.status === 'dibayar') return 'Sudah dibayar';
    if (p.status === 'batal') return 'Dibatalkan';
    const m = sisaMenit(p);
    if (m < 0) return 'Belum bayar · lewat ' + Math.abs(m) + ' menit';
    if (m === 0) return 'Belum bayar · kurang dari 1 menit';
    return 'Belum bayar · sisa ' + m + ' menit';
  };

  /* ── Kirim pesanan (pelanggan) ────────────────────────── */
  const kirim = async (p) => {
    try {
      await panggil('/api/pesanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      return { ok: true, terkirim: true };
    } catch (e) {
      const a = bacaAntrean();
      a.push(p);
      tulisAntrean(a);
      return { ok: true, terkirim: false, pesan: e.message };
    }
  };

  /* ── Kirim ulang antrean yang tertinggal ──────────────── */
  const kirimAntrean = async () => {
    const a = bacaAntrean();
    if (!a.length) return { terkirim: 0 };
    const sisa = [];
    let terkirim = 0;
    for (const p of a) {
      try {
        await panggil('/api/pesanan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
        terkirim++;
      } catch (e) {
        sisa.push(p);
      }
    }
    tulisAntrean(sisa);
    return { terkirim };
  };

  /* ── Pelanggan menandai "saya sudah bayar" ────────────── */
  const tandaiDibayarPelanggan = async (p) => {
    const kabar = { ...p, status: 'dibayar-klaim', diklaim: new Date().toISOString() };
    try {
      await panggil('/api/pesanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kabar),
      });
      return { ok: true, terkirim: true };
    } catch (e) {
      const a = bacaAntrean();
      a.push(kabar);
      tulisAntrean(a);
      return { ok: true, terkirim: false, pesan: e.message };
    }
  };

  /* ── Pemilik: tarik pesanan ───────────────────────────── */
  const tarik = async (warungId, kunci) => {
    const kepala = kunci ? { 'x-kunci-sinkron': kunci } : {};
    const isi = await panggil('/api/pesanan?w=' + encodeURIComponent(warungId), { headers: kepala });
    return (isi && isi.pesanan) || [];
  };

  /* ── Pemilik: ubah status ─────────────────────────────── */
  const ubahStatus = async (id, warungId, status, kunci) => {
    const kepala = { 'Content-Type': 'application/json' };
    if (kunci) kepala['x-kunci-sinkron'] = kunci;
    return panggil('/api/pesanan-ubah', {
      method: 'POST',
      headers: kepala,
      body: JSON.stringify({ id, warungId, status, waktu: new Date().toISOString() }),
    });
  };

  return {
    MENIT_BATAS,
    buat, kirim, kirimAntrean, tandaiDibayarPelanggan,
    tarik, ubahStatus,
    sisaMenit, lewatBatas, labelSisa,
    antrean: bacaAntrean,
    alamatServer,
  };
})();

if (typeof window !== 'undefined') window.Pesanan = Pesanan;
