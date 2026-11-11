/* ══════════════════════════════════════════════════════════
   data.js — penyimpanan lokal + perhitungan laporan
   Dipakai aplikasi Pemilik (pemilik/) dan Admin (admin/).

   Aplikasi Pemilik menyimpan catatan warungnya sendiri.
   Aplikasi Admin menyimpan kumpulan laporan yang diimpor
   dari para pemilik. Keduanya memakai berkas ini, dengan
   kunci penyimpanan (kunci) berbeda.

   Bentuk berkas laporan (format 1):
   {
     "wgd": 1,                       // penanda berkas
     "jenis": "laporan-harian",
     "dibuat": "2026-11-10T...",     // waktu ekspor
     "warung": { id, nama, pemilik, wa, alamat, lat, lng },
     "catatan": [
       { id, tgl, omzet, pengeluaran, jumlahTransaksi,
         item: [{ nama, jumlah, harga }], catatan }
     ]
   }
   ══════════════════════════════════════════════════════════ */
const Data = (() => {
  'use strict';

  const VERSI = 1;
  const PENANDA = 'wgd';

  const uid = (awalan = 'id') =>
    awalan + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ── Penyimpanan ──────────────────────────────────────── */
  const buatPenyimpanan = (kunci) => {
    let db = null;

    const bentukKosong = () => ({ meta: { versi: VERSI, dibuat: new Date().toISOString() } });

    const load = () => {
      if (db) return db;
      try {
        const mentah = localStorage.getItem(kunci);
        if (mentah) {
          const isi = JSON.parse(mentah);
          if (isi && isi.meta) { db = isi; return db; }
        }
      } catch (e) {
        console.warn('Data tersimpan tidak terbaca, mulai kosong.', e);
      }
      db = bentukKosong();
      simpanSegera();
      return db;
    };

    let timer = null;
    const simpanSegera = () => {
      clearTimeout(timer);
      try { localStorage.setItem(kunci, JSON.stringify(db)); } catch (e) { /* penuh: abaikan */ }
    };

    const simpan = () => {
      clearTimeout(timer);
      timer = setTimeout(simpanSegera, 250);
    };

    const ganti = (isi) => { db = isi; simpanSegera(); return db; };

    const hapusSemua = () => {
      try { localStorage.removeItem(kunci); } catch (e) { /* abaikan */ }
      db = bentukKosong();
      simpanSegera();
      return db;
    };

    return { kunci, load, simpan, simpanSegera, ganti, hapusSemua, bentukKosong };
  };

  /* ── Perhitungan ──────────────────────────────────────── */
  // Catatan diurutkan dari terbaru ke terlama.
  const urut = (catatan) =>
    [...catatan].sort((a, b) => (a.tgl < b.tgl ? 1 : a.tgl > b.tgl ? -1 : 0));

  const ringkas = (catatan) => {
    const daftar = urut(catatan);
    const totalOmzet = daftar.reduce((s, c) => s + (Number(c.omzet) || 0), 0);
    const totalPengeluaran = daftar.reduce((s, c) => s + (Number(c.pengeluaran) || 0), 0);
    const totalTransaksi = daftar.reduce((s, c) => s + (Number(c.jumlahTransaksi) || 0), 0);
    const totalItem = daftar.reduce(
      (s, c) => s + (c.item || []).reduce((a, i) => a + (Number(i.jumlah) || 0), 0), 0
    );
    const hariTercatat = daftar.length;
    return {
      totalOmzet,
      totalPengeluaran,
      laba: totalOmzet - totalPengeluaran,
      totalTransaksi,
      totalItem,
      hariTercatat,
      rataOmzet: hariTercatat ? totalOmzet / hariTercatat : 0,
      pertama: daftar.length ? daftar[daftar.length - 1].tgl : null,
      terakhir: daftar.length ? daftar[0].tgl : null,
    };
  };

  const perHari = (catatan, hariTerakhir = 14) => {
    const peta = new Map(catatan.map((c) => [c.tgl, c]));
    const hasil = [];
    const akhir = catatan.length ? urut(catatan)[0].tgl : Inti.hariIni();
    for (let i = hariTerakhir - 1; i >= 0; i--) {
      const tgl = Inti.geserHari(akhir, -i);
      const c = peta.get(tgl);
      hasil.push({ tgl, omzet: c ? Number(c.omzet) || 0 : 0, ada: !!c });
    }
    return hasil;
  };

  const perBulan = (catatan, bulanTerakhir = 6) => {
    const peta = new Map();
    for (const c of catatan) {
      const k = String(c.tgl).slice(0, 7);
      peta.set(k, (peta.get(k) || 0) + (Number(c.omzet) || 0));
    }
    const dasar = catatan.length ? urut(catatan)[0].tgl : Inti.hariIni();
    const [ty, tm] = dasar.split('-').map(Number);
    const hasil = [];
    for (let i = bulanTerakhir - 1; i >= 0; i--) {
      const d = new Date(ty, tm - 1 - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      hasil.push({ kunci: k, label: Inti.BULAN_P[d.getMonth()], omzet: peta.get(k) || 0 });
    }
    return hasil;
  };

  // Item terlaris dari seluruh catatan.
  const itemTerlaris = (catatan, batas = 8) => {
    const peta = new Map();
    for (const c of catatan) {
      for (const it of c.item || []) {
        const nama = String(it.nama || '').trim();
        if (!nama) continue;
        const k = nama.toLowerCase();
        const t = peta.get(k) || { nama, jumlah: 0, omzet: 0 };
        t.jumlah += Number(it.jumlah) || 0;
        t.omzet += (Number(it.jumlah) || 0) * (Number(it.harga) || 0);
        peta.set(k, t);
      }
    }
    return [...peta.values()].sort((a, b) => b.jumlah - a.jumlah).slice(0, batas);
  };

  /* ── Berkas laporan (ekspor/impor) ────────────────────── */
  const buatLaporan = (warung, catatan) => ({
    [PENANDA]: VERSI,
    jenis: 'laporan-harian',
    dibuat: new Date().toISOString(),
    warung,
    catatan: urut(catatan),
  });

  const teksLaporan = (warung, catatan) =>
    JSON.stringify(buatLaporan(warung, catatan), null, 2);

  const namaBerkasLaporan = (warung, tanggal = Inti.hariIni()) => {
    const slug = String(warung.nama || 'warung')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
    return `laporan-${slug || 'warung'}-${tanggal}.json`;
  };

  // Membaca berkas laporan. Melempar Error dengan pesan yang bisa dibaca pengguna.
  const bacaLaporan = (teks) => {
    let isi;
    try {
      isi = JSON.parse(teks);
    } catch (e) {
      throw new Error('Berkas bukan JSON yang sah.');
    }
    if (!isi || typeof isi !== 'object') throw new Error('Isi berkas tidak dikenali.');
    if (isi[PENANDA] !== VERSI) throw new Error('Berkas ini bukan laporan Warung Go Digital.');
    if (!isi.warung || !isi.warung.id) throw new Error('Laporan tidak memuat data warung.');
    if (!Array.isArray(isi.catatan)) throw new Error('Laporan tidak memuat catatan harian.');

    const catatan = isi.catatan
      .filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(String(c.tgl || '')))
      .map((c) => ({
        id: c.id || uid('ct'),
        tgl: String(c.tgl).slice(0, 10),
        omzet: Math.max(0, Number(c.omzet) || 0),
        pengeluaran: Math.max(0, Number(c.pengeluaran) || 0),
        jumlahTransaksi: Math.max(0, Math.round(Number(c.jumlahTransaksi) || 0)),
        item: Array.isArray(c.item)
          ? c.item.filter((i) => i && i.nama).map((i) => ({
              nama: String(i.nama).slice(0, 60),
              jumlah: Math.max(0, Number(i.jumlah) || 0),
              harga: Math.max(0, Number(i.harga) || 0),
            }))
          : [],
        catatan: String(c.catatan || '').slice(0, 240),
      }));

    return {
      warung: {
        id: String(isi.warung.id),
        nama: String(isi.warung.nama || 'Warung tanpa nama').slice(0, 60),
        pemilik: String(isi.warung.pemilik || '').slice(0, 60),
        wa: String(isi.warung.wa || '').replace(/[^0-9]/g, '').slice(0, 18),
        alamat: String(isi.warung.alamat || '').slice(0, 120),
        lat: isi.warung.lat ?? null,
        lng: isi.warung.lng ?? null,
        jenis: String(isi.warung.jenis || '').slice(0, 40),
      },
      catatan,
      dibuat: isi.dibuat || null,
    };
  };

  /* ── Gabungkan catatan dari beberapa laporan ──────────── */
  // Satu warung bisa mengirim berkas berkali-kali; catatan digabung,
  // tanggal yang sama dipakai yang terbaru (berdasarkan waktu impor).
  const gabungCatatan = (lama = [], baru = []) => {
    const peta = new Map(lama.map((c) => [c.tgl, c]));
    for (const c of baru) peta.set(c.tgl, c);
    return urut([...peta.values()]);
  };

  return {
    VERSI, PENANDA, uid,
    buatPenyimpanan,
    urut, ringkas, perHari, perBulan, itemTerlaris,
    buatLaporan, teksLaporan, namaBerkasLaporan, bacaLaporan, gabungCatatan,
  };
})();

if (typeof window !== 'undefined') window.Data = Data;
