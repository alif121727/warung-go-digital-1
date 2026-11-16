/* server.mjs — server sinkron Warung Go Digital (Cara 1).
 *
 * Server kecil tanpa dependensi apa pun. Tugasnya hanya satu: menerima
 * laporan dari aplikasi Pemilik, lalu menyimpannya agar Panel Pengelola
 * bisa menariknya. Pemilik tidak pernah bisa membaca isi server ini.
 *
 * Jalankan di komputer/HP Anda:
 *     node sinkron/server.mjs
 * Lalu isi alamat server pada tab "Sinkron" di kedua aplikasi.
 *
 * Setelan lewat variabel lingkungan (semua opsional):
 *     PORT=8787                 port yang dipakai
 *     KUNCI_TULIS=rahasia-1     kunci untuk PEMILIK (hanya boleh mengirim)
 *     KUNCI_BACA=rahasia-2      kunci untuk PENGELOLA (boleh membaca)
 *     KUNCI=rahasia             kunci tunggal; dipakai untuk keduanya
 *     ASAL=*                    asal yang diizinkan (CORS)
 *
 * Kunci tulis dan kunci baca sengaja dipisah: pemilik hanya memegang
 * kunci tulis, sehingga ia tidak punya cara membaca data mitra lain.
 *
 * Data disimpan di sinkron/data/laporan.json. Cadangkan berkas itu.
 */

import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = path.dirname(fileURLToPath(import.meta.url));
const BERKAS = process.env.DATA || path.join(AKAR, 'data', 'laporan.json');

const PORT = Number(process.env.PORT || 8787);
const KUNCI = String(process.env.KUNCI || '');
const KUNCI_TULIS = String(process.env.KUNCI_TULIS || KUNCI);
const KUNCI_BACA = String(process.env.KUNCI_BACA || KUNCI);
const ASAL = String(process.env.ASAL || '*');
const BATAS = 5000; // batas jumlah laporan tersimpan
const BATAS_PESANAN = 400; // batas pesanan tersimpan (yang lama dibuang)

let data = []; // [{ diterima, warung, catatan }]
let pesanan = []; // [{ id, warungId, dibuat, batas, item, total, status, ... }]

const BERKAS_PESANAN = BERKAS.replace(/\.json$/, '') + '-pesanan.json';

const muat = async () => {
  try {
    if (!existsSync(BERKAS)) return;
    const isi = JSON.parse(await readFile(BERKAS, 'utf8'));
    if (Array.isArray(isi)) data = isi;
  } catch (e) {
    console.warn('Berkas data tidak terbaca, mulai kosong:', e.message);
  }
};

const muatPesanan = async () => {
  try {
    if (!existsSync(BERKAS_PESANAN)) return;
    const isi = JSON.parse(await readFile(BERKAS_PESANAN, 'utf8'));
    if (Array.isArray(isi)) pesanan = isi;
  } catch (e) {
    console.warn('Berkas pesanan tidak terbaca, mulai kosong:', e.message);
  }
};

// Tulis lewat berkas sementara agar tidak rusak bila proses berhenti di tengah.
const simpan = async () => {
  await mkdir(path.dirname(BERKAS), { recursive: true });
  const sementara = BERKAS + '.tmp';
  await writeFile(sementara, JSON.stringify(data), 'utf8');
  await rename(sementara, BERKAS);
};

const simpanPesanan = async () => {
  await mkdir(path.dirname(BERKAS_PESANAN), { recursive: true });
  const sementara = BERKAS_PESANAN + '.tmp';
  await writeFile(sementara, JSON.stringify(pesanan), 'utf8');
  await rename(sementara, BERKAS_PESANAN);
};

// Tujuan pembayaran warung. Hanya data ini yang boleh keluar ke pelanggan.
const bersihkanBayar = (b) => {
  if (!b || typeof b !== 'object') return null;
  const bersih = {
    bank: String(b.bank || '').slice(0, 40),
    nomor: String(b.nomor || '').slice(0, 40),
    atasNama: String(b.atasNama || '').slice(0, 60),
    tautan: String(b.tautan || '').slice(0, 300),
    qris: typeof b.qris === 'string' && b.qris.startsWith('data:image/') ? b.qris.slice(0, 400_000) : '',
  };
  return (bersih.nomor || bersih.qris || bersih.tautan) ? bersih : null;
};

const kirim = (res, kode, isi) => {
  res.writeHead(kode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ASAL,
    'Access-Control-Allow-Headers': 'content-type, x-kunci-sinkron',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(isi));
};

const bacaBadan = (req) =>
  new Promise((selesai, gagal) => {
    let teks = '';
    req.on('data', (c) => {
      teks += c;
      if (teks.length > 2_000_000) { gagal(new Error('Badan permintaan terlalu besar')); req.destroy(); }
    });
    req.on('end', () => {
      try { selesai(teks ? JSON.parse(teks) : {}); }
      catch (e) { gagal(new Error('JSON tidak sah')); }
    });
    req.on('error', gagal);
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const jalur = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') return kirim(res, 204, {});

  const kunciKirim = String(req.headers['x-kunci-sinkron'] || '');

  // Periksa status: tidak pernah membocorkan isi laporan.
  if (jalur === '/' || jalur === '/api/status') {
    return kirim(res, 200, {
      ok: true,
      layanan: 'Warung Go Digital — server sinkron',
      jumlahLaporan: data.length,
      butuhKunci: Boolean(KUNCI_TULIS || KUNCI_BACA),
      waktu: new Date().toISOString(),
    });
  }

  // Pemilik mengirim laporan ke sini (butuh kunci tulis).
  if (req.method === 'POST' && jalur === '/api/laporan') {
    if (KUNCI_TULIS && kunciKirim !== KUNCI_TULIS) {
      return kirim(res, 401, { ok: false, pesan: 'Kunci sinkron salah atau kosong.' });
    }
    let isi;
    try { isi = await bacaBadan(req); }
    catch (e) { return kirim(res, 400, { ok: false, pesan: e.message }); }

    if (!isi || isi.wgd !== 1 || !isi.warung || !isi.warung.id || !Array.isArray(isi.catatan)) {
      return kirim(res, 400, { ok: false, pesan: 'Ini bukan laporan Warung Go Digital.' });
    }
    // Bila pemilik mengirim catatan kosong tetapi menyertakan menu, ini
    // berarti pembaruan menu saja — tetap sah. Lihat berkas menu publik.

    const warung = {
      id: String(isi.warung.id),
      nama: String(isi.warung.nama || 'Warung tanpa nama').slice(0, 60),
      pemilik: String(isi.warung.pemilik || '').slice(0, 60),
      wa: String(isi.warung.wa || '').replace(/[^0-9]/g, '').slice(0, 18),
      alamat: String(isi.warung.alamat || '').slice(0, 120),
      jenis: String(isi.warung.jenis || '').slice(0, 40),
      lat: isi.warung.lat ?? null,
      lng: isi.warung.lng ?? null,
      placeId: isi.warung.placeId ? String(isi.warung.placeId).slice(0, 80) : null,
      rating: Number.isFinite(+isi.warung.rating) ? +isi.warung.rating : null,
      ulasan: Number.isFinite(+isi.warung.ulasan) ? +isi.warung.ulasan : null,
      bayar: bersihkanBayar(isi.warung.bayar),
      // Daftar menu untuk halaman publik. Dibatasi agar berkas tidak membengkak.
      menu: Array.isArray(isi.warung.menu)
        ? isi.warung.menu.slice(0, 200).map((m) => ({
            nama: String(m && m.nama || '').slice(0, 80),
            harga: Number(m && m.harga) || 0,
            kategori: String(m && m.kategori || 'Menu').slice(0, 40),
            ket: String(m && m.ket || '').slice(0, 120),
          })).filter((m) => m.nama)
        : [],
    };

    // Simpan per warung, bukan per kiriman: kiriman baru menimpa catatan
    // tanggal yang sama, sehingga riwayat tidak menumpuk.
    const lama = data.find((d) => d.warung.id === warung.id);
    const peta = new Map((lama ? lama.catatan : []).map((c) => [c.tgl, c]));
    for (const c of isi.catatan) {
      if (c && /^\d{4}-\d{2}-\d{2}$/.test(String(c.tgl || ''))) peta.set(String(c.tgl).slice(0, 10), c);
    }
    const catatan = [...peta.values()].sort((a, b) => (a.tgl < b.tgl ? 1 : -1));

    if (lama) { lama.warung = warung; lama.catatan = catatan; lama.diterima = new Date().toISOString(); }
    else data.push({ warung, catatan, diterima: new Date().toISOString() });

    if (data.length > BATAS) data = data.slice(-BATAS);
    await simpan();
    return kirim(res, 200, { ok: true, jumlahHari: catatan.length, jumlahMitra: data.length });
  }

  // Terima berkas menu publik dari Panel Mitra (penerbitan otomatis).
  // Berbeda dari /api/laporan: yang dikirim di sini HANYA data etalase, dan
  // pengirimnya pengelola (memegang kunci baca). Karena itu kunci yang
  // diterima adalah kunci baca ATAU kunci tulis.
  if (req.method === 'POST' && jalur === '/api/menu-publik') {
    if ((KUNCI_BACA || KUNCI_TULIS) && kunciKirim !== KUNCI_BACA && kunciKirim !== KUNCI_TULIS) {
      return kirim(res, 401, { ok: false, pesan: 'Kunci salah atau kosong.' });
    }
    let isi;
    try { isi = await bacaBadan(req); }
    catch (e) { return kirim(res, 400, { ok: false, pesan: e.message }); }

    if (!isi || isi.jenis !== 'menu-publik' || !isi.warung || !isi.warung.id) {
      return kirim(res, 400, { ok: false, pesan: 'Ini bukan berkas menu publik.' });
    }

    const warung = {
      id: String(isi.warung.id).slice(0, 40),
      nama: String(isi.warung.nama || 'Warung tanpa nama').slice(0, 60),
      pemilik: String(isi.warung.pemilik || '').slice(0, 60),
      wa: String(isi.warung.wa || '').replace(/[^0-9]/g, '').slice(0, 18),
      alamat: String(isi.warung.alamat || '').slice(0, 120),
      jenis: String(isi.warung.kategori || isi.warung.jenis || '').slice(0, 40),
      placeId: isi.warung.placeId ? String(isi.warung.placeId).slice(0, 80) : null,
      rating: Number.isFinite(+isi.warung.rating) ? +isi.warung.rating : null,
      ulasan: Number.isFinite(+isi.warung.ulasan) ? +isi.warung.ulasan : null,
      bayar: bersihkanBayar(isi.warung.bayar),
      menu: Array.isArray(isi.menu)
        ? isi.menu.slice(0, 200).map((m) => ({
            nama: String(m && m.nama || '').slice(0, 80),
            harga: Number(m && m.harga) || 0,
            kategori: String(m && m.kategori || 'Menu').slice(0, 40),
            ket: String(m && m.ket || '').slice(0, 120),
            foto: m && typeof m.foto === 'string' && m.foto.startsWith('data:image/')
              ? m.foto.slice(0, 400_000) : null,
          })).filter((m) => m.nama)
        : [],
    };

    // Menu saja yang diperbarui; catatan harian yang sudah ada dibiarkan.
    const lama = data.find((d) => d.warung.id === warung.id);
    if (lama) { lama.warung = { ...lama.warung, ...warung }; lama.diterima = new Date().toISOString(); }
    else data.push({ warung, catatan: [], diterima: new Date().toISOString() });

    await simpan();
    return kirim(res, 200, { ok: true, id: warung.id, jumlahMenu: warung.menu.length });
  }

  // Menu publik sebuah warung, supaya halaman menu.html bisa dibuka dari HP
  // mana pun saat server sinkron dipakai. Sengaja TIDAK butuh kunci: isinya
  // memang untuk pelanggan. Yang keluar hanya data etalase (nama, WA, alamat,
  // daftar menu) — bukan catatan harian atau transaksi.
  if (req.method === 'GET' && jalur === '/api/menu') {
    const id = String(url.searchParams.get('id') || '');
    const d = data.find((x) => x.warung.id === id);
    if (!d) return kirim(res, 404, { ok: false, pesan: 'Menu warung tidak ditemukan.' });

    // Hitung jumlah terjual per nama menu dari catatan harian pemilik.
    // Inilah yang membuat menu terlaris muncul paling atas di HP pelanggan.
    const terjual = new Map();
    for (const c of d.catatan || []) {
      for (const it of (c && c.item) || []) {
        const nama = String((it && it.nama) || '').trim().toLowerCase();
        if (!nama) continue;
        terjual.set(nama, (terjual.get(nama) || 0) + (Number(it.jumlah) || 0));
      }
    }

    return kirim(res, 200, {
      wgd: 2, jenis: 'menu-publik', dibuat: d.diterima || new Date().toISOString(),
      warung: {
        id: d.warung.id, nama: d.warung.nama, pemilik: d.warung.pemilik,
        wa: d.warung.wa, alamat: d.warung.alamat, kategori: d.warung.jenis,
        placeId: d.warung.placeId || null, rating: d.warung.rating ?? null,
        ulasan: d.warung.ulasan ?? null,
        bayar: d.warung.bayar || null,
      },
      menu: Array.isArray(d.warung.menu)
        ? d.warung.menu.map((m) => ({
            nama: m.nama, harga: m.harga, kategori: m.kategori, ket: m.ket || '',
            foto: m.foto || null,
            laris: terjual.get(String(m.nama || '').trim().toLowerCase()) || 0,
          }))
        : [],
    });
  }

  // Pengelola menarik semua laporan yang tersimpan (butuh kunci baca).
  if (req.method === 'GET' && jalur === '/api/laporan') {
    if (KUNCI_BACA && kunciKirim !== KUNCI_BACA) {
      return kirim(res, 401, { ok: false, pesan: 'Kunci baca salah atau kosong.' });
    }
    const sejak = url.searchParams.get('sejak');
    const daftar = sejak
      ? data.filter((d) => String(d.diterima) > String(sejak))
      : data;
    return kirim(res, 200, {
      ok: true,
      waktu: new Date().toISOString(),
      jumlah: daftar.length,
      laporan: daftar.map((d) => ({
        wgd: 1, jenis: 'laporan-harian', dibuat: d.diterima, warung: d.warung, catatan: d.catatan,
      })),
    });
  }

  /* ── Pesanan dari pelanggan ──────────────────────────────
     Pelanggan tidak memegang kunci apa pun, jadi POST di sini
     TERBUKA. Yang dijaga: bentuknya harus pesanan yang sah, dan
     jumlahnya dibatasi supaya tidak bisa dipakai membanjiri server. */
  if (req.method === 'POST' && jalur === '/api/pesanan') {
    let isi;
    try { isi = await bacaBadan(req); }
    catch (e) { return kirim(res, 400, { ok: false, pesan: e.message }); }

    if (!isi || isi.jenis !== 'pesanan' || !isi.warungId || !Array.isArray(isi.item) || !isi.item.length) {
      return kirim(res, 400, { ok: false, pesan: 'Ini bukan pesanan yang sah.' });
    }

    const item = isi.item.slice(0, 60).map((i) => ({
      nama: String((i && i.nama) || '').slice(0, 80),
      harga: Number(i && i.harga) || 0,
      jumlah: Math.max(1, Math.min(999, Number(i && i.jumlah) || 1)),
    })).filter((i) => i.nama);

    if (!item.length) return kirim(res, 400, { ok: false, pesan: 'Pesanan tanpa item.' });

    const total = item.reduce((s, i) => s + i.harga * i.jumlah, 0);
    const idPesanan = String(isi.id || '').slice(0, 60) || 'ps-' + Date.now().toString(36);
    const dibuat = isi.dibuat && !Number.isNaN(Date.parse(isi.dibuat)) ? isi.dibuat : new Date().toISOString();

    const catat = {
      id: idPesanan,
      warungId: String(isi.warungId).slice(0, 40),
      dibuat,
      batas: new Date(Date.parse(dibuat) + 30 * 60000).toISOString(),
      nama: String(isi.nama || '').slice(0, 40),
      meja: String(isi.meja || '').slice(0, 20),
      catatan: String(isi.catatan || '').slice(0, 200),
      item,
      total,
      // 'menunggu' = belum bayar; 'dibayar-klaim' = pelanggan bilang sudah bayar;
      // 'lunas' = pemilik sudah memastikan uangnya masuk.
      // Endpoint ini TERBUKA untuk pelanggan, jadi pelanggan hanya boleh
      // menyetel dua status pertama. 'lunas'/'batal' hanya lewat
      // /api/pesanan-ubah yang memerlukan kunci — kalau tidak, pelanggan bisa
      // menandai pesanannya lunas sendiri.
      status: ['menunggu', 'dibayar-klaim'].includes(isi.status) ? isi.status : 'menunggu',
      diklaim: isi.diklaim ? String(isi.diklaim).slice(0, 40) : null,
      diterima: new Date().toISOString(),
    };

    // Pesanan dengan id sama ditimpa — ini yang membuat pelanggan bisa
    // mengubah "menunggu" menjadi "sudah bayar" dengan id yang sama.
    // Tetapi status akhir milik pemilik tidak boleh diturunkan oleh kiriman
    // pelanggan: pesanan yang sudah 'lunas'/'batal' tetap begitu.
    const lama = pesanan.findIndex((p) => p.id === catat.id);
    if (lama >= 0) {
      const akhir = ['lunas', 'batal'].includes(pesanan[lama].status);
      pesanan[lama] = { ...pesanan[lama], ...catat, status: akhir ? pesanan[lama].status : catat.status };
    } else {
      pesanan.push(catat);
    }

    if (pesanan.length > BATAS_PESANAN) pesanan = pesanan.slice(-BATAS_PESANAN);
    await simpanPesanan();
    return kirim(res, 200, { ok: true, id: catat.id, total: catat.total });
  }

  // Pemilik menarik pesanan warungnya (butuh kunci baca atau tulis).
  if (req.method === 'GET' && jalur === '/api/pesanan') {
    if ((KUNCI_BACA || KUNCI_TULIS) && kunciKirim !== KUNCI_BACA && kunciKirim !== KUNCI_TULIS) {
      return kirim(res, 401, { ok: false, pesan: 'Kunci salah atau kosong.' });
    }
    const w = String(url.searchParams.get('w') || '');
    if (!w) return kirim(res, 400, { ok: false, pesan: 'Kode warung tidak ada.' });
    const sejak = url.searchParams.get('sejak');
    const daftar = pesanan
      .filter((p) => p.warungId === w)
      .filter((p) => (sejak ? String(p.diterima) > String(sejak) : true))
      .sort((a, b) => (a.diterima < b.diterima ? 1 : -1));
    return kirim(res, 200, { ok: true, waktu: new Date().toISOString(), jumlah: daftar.length, pesanan: daftar });
  }

  // Pemilik mengubah status pesanan (mis. menandai lunas).
  if (req.method === 'POST' && jalur === '/api/pesanan-ubah') {
    if ((KUNCI_BACA || KUNCI_TULIS) && kunciKirim !== KUNCI_BACA && kunciKirim !== KUNCI_TULIS) {
      return kirim(res, 401, { ok: false, pesan: 'Kunci salah atau kosong.' });
    }
    let isi;
    try { isi = await bacaBadan(req); }
    catch (e) { return kirim(res, 400, { ok: false, pesan: e.message }); }

    const idPesanan = String((isi && isi.id) || '');
    const p = pesanan.find((x) => x.id === idPesanan);
    if (!p) return kirim(res, 404, { ok: false, pesan: 'Pesanan tidak ditemukan.' });
    if (isi.warungId && p.warungId !== String(isi.warungId)) {
      return kirim(res, 403, { ok: false, pesan: 'Pesanan ini bukan milik warung Anda.' });
    }
    const sah = ['menunggu', 'dibayar-klaim', 'lunas', 'batal'];
    if (!sah.includes(isi.status)) return kirim(res, 400, { ok: false, pesan: 'Status tidak dikenali.' });
    p.status = isi.status;
    p.diubah = new Date().toISOString();
    await simpanPesanan();
    return kirim(res, 200, { ok: true, id: p.id, status: p.status });
  }

  return kirim(res, 404, { ok: false, pesan: 'Jalur tidak dikenali.' });
});

await muat();
await muatPesanan();
server.listen(PORT, () => {
  console.log(`Server sinkron Warung Go Digital berjalan di http://localhost:${PORT}`);
  console.log(KUNCI ? 'Kunci sinkron: aktif' : 'Kunci sinkron: tidak dipakai (terbuka)');
  console.log(`Laporan tersimpan: ${data.length}`);
  console.log(`Pesanan tersimpan: ${pesanan.length}`);
});
