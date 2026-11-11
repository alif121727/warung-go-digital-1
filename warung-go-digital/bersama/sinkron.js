/* ══════════════════════════════════════════════════════════
   sinkron.js — sinkronisasi otomatis (Cara 1)
   Dipakai aplikasi Pemilik dan Pengelola.

   Cara kerja:
     • Pemilik  → POST laporan ke server sinkron tiap kali ada
                  catatan baru (dan saat aplikasi dibuka).
     • Pengelola → GET semua laporan dari server secara berkala.

   Alamat server dan kunci disimpan di perangkat masing-masing.
   Bila alamat belum diisi, seluruh berkas ini diam saja —
   aplikasi tetap berjalan seperti biasa (mode berkas/WhatsApp).
   ══════════════════════════════════════════════════════════ */
const Sinkron = (() => {
  'use strict';

  const KUNCI_SETELAN = 'wgd-sinkron-v1';
  const JEDA_KIRIM = 4000;   // tunda sebelum mengirim (agar tidak terlalu sering)
  const JEDA_TARIK = 30000;  // selang penarikan otomatis

  // Peran menentukan kunci mana yang dipakai: pemilik memakai kunci tulis
  // (hanya bisa mengirim), pengelola memakai kunci baca.
  let peran = 'pemilik';

  const bacasetelan = () => {
    try {
      const isi = JSON.parse(localStorage.getItem(KUNCI_SETELAN) || '{}');
      return {
        alamat: String(isi.alamat || ''),
        kunci: String(isi.kunci || ''),
        kunciBaca: String(isi.kunciBaca || ''),
      };
    } catch (e) {
      return { alamat: '', kunci: '', kunciBaca: '' };
    }
  };

  let setelan = bacasetelan();

  const simpanSetelan = (s) => {
    setelan = {
      alamat: String(s.alamat || '').trim().replace(/\/+$/, ''),
      kunci: String(s.kunci || '').trim(),
      kunciBaca: String(s.kunciBaca ?? s.kunci ?? '').trim(),
    };
    try { localStorage.setItem(KUNCI_SETELAN, JSON.stringify(setelan)); } catch (e) { /* abaikan */ }
    return setelan;
  };

  const aturPeran = (p) => { peran = p === 'pengelola' ? 'pengelola' : 'pemilik'; };

  const aktif = () => Boolean(setelan.alamat);

  const alamatApi = (jalur) => setelan.alamat.replace(/\/+$/, '') + jalur;

  const kunciDipakai = () => (peran === 'pengelola' ? setelan.kunciBaca : setelan.kunci);

  const panggil = async (jalur, opsi = {}) => {
    if (!aktif()) throw new Error('Alamat server sinkron belum diisi.');
    const kepala = { ...(opsi.headers || {}) };
    const k = kunciDipakai();
    if (k) kepala['x-kunci-sinkron'] = k;
    let res;
    try {
      res = await fetch(alamatApi(jalur), { ...opsi, headers: kepala });
    } catch (e) {
      throw new Error('Tidak dapat menghubungi server sinkron. Periksa alamat dan jaringan.');
    }
    let isi = null;
    try { isi = await res.json(); } catch (e) { /* biarkan null */ }
    if (!res.ok) throw new Error((isi && isi.pesan) || `Server menolak (${res.status}).`);
    return isi;
  };

  const uji = () => panggil('/api/status');

  const kirimLaporan = (laporan) =>
    panggil('/api/laporan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(laporan),
    });

  const tarikLaporan = async () => {
    const isi = await panggil('/api/laporan');
    return (isi && isi.laporan) || [];
  };

  /* ── Pengiriman otomatis (aplikasi Pemilik) ───────────── */
  // ambilLaporan() harus mengembalikan objek laporan atau null bila belum ada.
  const pasangAutoKirim = (ambilLaporan, { saatAda = null } = {}) => {
    let timer = null;
    let sibuk = false;
    let terakhir = null;

    const jalankan = async () => {
      if (!aktif() || sibuk) return;
      const laporan = ambilLaporan();
      if (!laporan) return;
      const cap = JSON.stringify(laporan.catatan || []);
      if (cap === terakhir) return; // tidak ada perubahan
      sibuk = true;
      try {
        const hasil = await kirimLaporan(laporan);
        terakhir = cap;
        if (saatAda) saatAda({ ok: true, hasil });
      } catch (e) {
        if (saatAda) saatAda({ ok: false, pesan: e.message });
      } finally {
        sibuk = false;
      }
    };

    const jadwalkan = () => {
      if (!aktif()) return;
      clearTimeout(timer);
      timer = setTimeout(jalankan, JEDA_KIRIM);
    };

    document.addEventListener('visibilitychange', () => { if (!document.hidden) jalankan(); });
    window.addEventListener('online', jadwalkan);
    jadwalkan();
    return { jadwalkan, jalankan };
  };

  /* ── Penarikan otomatis (Panel Pengelola) ─────────────── */
  const pasangAutoTarik = (saatDapat, { ulang = JEDA_TARIK } = {}) => {
    let timer = null;
    let sibuk = false;

    const jalankan = async () => {
      if (!aktif() || sibuk) return;
      sibuk = true;
      try {
        const daftar = await tarikLaporan();
        if (saatDapat) saatDapat({ ok: true, daftar });
      } catch (e) {
        if (saatDapat) saatDapat({ ok: false, pesan: e.message });
      } finally {
        sibuk = false;
      }
    };

    const putar = () => {
      clearInterval(timer);
      if (!aktif()) return;
      timer = setInterval(() => { if (!document.hidden) jalankan(); }, ulang);
    };

    document.addEventListener('visibilitychange', () => { if (!document.hidden) jalankan(); });
    window.addEventListener('online', jalankan);
    jalankan();
    putar();
    return { jalankan, putar };
  };

  return {
    setelan: () => ({ ...setelan }),
    simpanSetelan, aturPeran, aktif, uji,
    kirimLaporan, tarikLaporan,
    pasangAutoKirim, pasangAutoTarik,
  };
})();

if (typeof window !== 'undefined') window.Sinkron = Sinkron;
