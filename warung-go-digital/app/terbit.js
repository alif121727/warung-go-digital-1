/* ══════════════════════════════════════════════════════════
   terbit.js — penerbitan berkas menu ke situs, otomatis.

   Tanpa berkas ini, pengelola harus mengunduh menu-<id>.json lalu
   mengunggahnya dengan tangan ke folder `menu/`. Dengan berkas ini,
   berkas itu terunggah sendiri setiap kali data warung atau menunya
   berubah, sehingga QR yang dipindai pelanggan selalu menampilkan
   menu terbaru.

   Dua cara, pilih salah satu di pengaturan:

   1. GitHub (disarankan) — berkas ditulis ke repositori situs lewat
      GitHub Contents API. Butuh token halus (fine-grained) dengan izin
      "Contents: Read and write" pada repositori itu saja. Token
      disimpan di perangkat ini saja (localStorage), tidak pernah ikut
      terkirim ke mana pun selain api.github.com.

   2. Server sinkron — berkas dikirim ke server yang menjalankan
      `sinkron/server.mjs`. Halaman menu lalu membacanya lewat
      /api/menu?id=<id> (isi <meta name="wgd-menu-server">).

   Bila belum diatur, modul ini diam saja dan pengelola tetap bisa
   memakai tombol "Terbitkan menu" yang mengunduh berkas.
   ══════════════════════════════════════════════════════════ */
const Terbit = (() => {
  'use strict';

  const KUNCI = 'wgd-terbit-v1';
  const JEDA = 2500; // tunda agar beberapa perubahan cepat jadi satu kiriman

  const kosong = () => ({
    metode: 'github', // 'github' | 'server' | 'mati'
    token: '',
    repo: 'alif121727/warung-go-digital-1',
    cabang: 'main',
    folder: 'warung-go-digital/menu',
    server: '',
    kunciServer: '',
    terakhir: null, // { waktu, id, ok, pesan }
  });

  const baca = () => {
    try {
      const isi = JSON.parse(localStorage.getItem(KUNCI) || 'null');
      return { ...kosong(), ...(isi || {}) };
    } catch (e) {
      return kosong();
    }
  };

  const simpan = (s) => {
    const bersih = { ...kosong(), ...s };
    try { localStorage.setItem(KUNCI, JSON.stringify(bersih)); } catch (e) { /* abaikan */ }
    return bersih;
  };

  const aktif = () => {
    const s = baca();
    if (s.metode === 'github') return Boolean(s.token && s.repo && s.folder);
    if (s.metode === 'server') return Boolean(s.server);
    return false;
  };

  /* Isi berkas menu terbit — sama bentuknya dengan yang diunduh tangan.
     Hanya data etalase; tanpa transaksi dan tanpa catatan harian. */
  const isiBerkas = (w, fotoDari) => {
    const foto = {};
    for (const f of fotoDari || []) {
      if (!f.dataUrl) continue;
      const kunci = String(f.nama || '').toLowerCase().replace(/\s*—\s*foto\s*\d+$/, '').trim();
      if (kunci && !foto[kunci]) foto[kunci] = f.dataUrl;
    }
    return {
      wgd: 2,
      jenis: 'menu-publik',
      dibuat: new Date().toISOString(),
      warung: {
        id: w.id, nama: w.nama, pemilik: w.pemilik, wa: w.wa, alamat: w.alamat,
        kategori: w.kategori, placeId: w.placeId || null,
        rating: w.ratingMaps ?? null, ulasan: w.jumlahUlasan ?? null,
      },
      menu: (w.menu || []).map((m) => ({
        nama: m.nama, harga: m.harga, kategori: m.kategori, ket: m.ket || '',
        foto: foto[String(m.nama || '').toLowerCase().trim()] || null,
      })),
    };
  };

  const namaBerkas = (w) => 'menu-' + w.id + '.json';

  // base64 untuk isi berkas (Content API menuntut base64, bukan teks biasa).
  const keBase64 = (teks) => {
    const bita = new TextEncoder().encode(teks);
    let biner = '';
    for (const b of bita) biner += String.fromCharCode(b);
    return btoa(biner);
  };

  /* ── Cara 1: GitHub Contents API ──────────────────────── */
  const kirimGithub = async (s, w, isi) => {
    const jalur = `${s.folder.replace(/^\/+|\/+$/g, '')}/${namaBerkas(w)}`;
    const dasar = `https://api.github.com/repos/${s.repo}/contents/${jalur}`;
    const kepala = {
      Authorization: 'Bearer ' + s.token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Perlu sha berkas lama agar ini jadi pembaruan, bukan bentrokan.
    let sha = null;
    const lihat = await fetch(`${dasar}?ref=${encodeURIComponent(s.cabang)}`, { headers: kepala });
    if (lihat.ok) sha = (await lihat.json()).sha;
    else if (lihat.status !== 404) {
      throw new Error(lihat.status === 401 || lihat.status === 403
        ? 'Token ditolak GitHub. Periksa izin "Contents: Read and write".'
        : `GitHub menolak permintaan (${lihat.status}).`);
    }

    const badan = {
      message: `Perbarui menu publik ${w.nama} (${w.id})`,
      content: keBase64(JSON.stringify(isi, null, 2)),
      branch: s.cabang,
    };
    if (sha) badan.sha = sha;

    const kirim = await fetch(dasar, {
      method: 'PUT',
      headers: { ...kepala, 'Content-Type': 'application/json' },
      body: JSON.stringify(badan),
    });
    if (!kirim.ok) {
      const pesan = await kirim.text();
      throw new Error(`GitHub menolak (${kirim.status}). ${pesan.slice(0, 160)}`);
    }
    return { ok: true, jalur, url: `${dasar}` };
  };

  /* ── Cara 2: server sinkron ───────────────────────────── */
  const kirimServer = async (s, w, isi) => {
    const alamat = s.server.replace(/\/+$/, '');
    const kepala = { 'Content-Type': 'application/json' };
    if (s.kunciServer) kepala['x-kunci-sinkron'] = s.kunciServer;
    const res = await fetch(alamat + '/api/menu-publik', {
      method: 'POST', headers: kepala, body: JSON.stringify(isi),
    });
    if (!res.ok) {
      const pesan = await res.text();
      throw new Error(`Server menolak (${res.status}). ${pesan.slice(0, 160)}`);
    }
    return { ok: true, jalur: '/api/menu?id=' + w.id, url: alamat + '/api/menu?id=' + w.id };
  };

  /* Terbitkan satu warung sekarang. Mengembalikan { ok, pesan }. */
  const terbitkan = async (w, { fotoDari = [] } = {}) => {
    const s = baca();
    if (s.metode === 'mati' || !aktif()) {
      return { ok: false, pesan: 'Penerbitan otomatis belum diatur.' };
    }
    if (!w || !w.id) return { ok: false, pesan: 'Warung tidak sah.' };

    const isi = isiBerkas(w, fotoDari);
    try {
      const hasil = s.metode === 'github'
        ? await kirimGithub(s, w, isi)
        : await kirimServer(s, w, isi);
      simpan({ ...s, terakhir: { waktu: new Date().toISOString(), id: w.id, ok: true, pesan: hasil.jalur } });
      return { ok: true, pesan: hasil.jalur, url: hasil.url };
    } catch (e) {
      simpan({ ...s, terakhir: { waktu: new Date().toISOString(), id: w.id, ok: false, pesan: e.message } });
      return { ok: false, pesan: e.message };
    }
  };

  /* ── Antrean: kumpulkan perubahan cepat jadi satu kiriman ──
     Dipanggil setiap kali data warung atau menunya berubah. Bila
     pengguna mengubah lima menu berturut-turut, yang terkirim tetap
     satu berkas berisi keadaan terakhir. */
  let timer = null;
  let tertunda = null;

  const antre = (ambilWarung, { fotoDari = () => [], saatSelesai = null } = {}) => {
    if (!aktif()) return;
    tertunda = ambilWarung;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const w = tertunda && tertunda();
      tertunda = null;
      if (!w) return;
      const hasil = await terbitkan(w, { fotoDari: fotoDari() });
      if (saatSelesai) saatSelesai(hasil);
    }, JEDA);
  };

  const status = () => {
    const s = baca();
    return {
      aktif: aktif(), metode: s.metode, repo: s.repo, folder: s.folder,
      cabang: s.cabang, server: s.server, terakhir: s.terakhir,
      // Token tidak pernah dikembalikan utuh; hanya penanda ada/tidak.
      adaToken: Boolean(s.token),
    };
  };

  return { KUNCI, baca, simpan, aktif, antre, terbitkan, isiBerkas, namaBerkas, status };
})();

if (typeof window !== 'undefined') window.Terbit = Terbit;
