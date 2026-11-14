/* ══════════════════════════════════════════════════════════
   store.js — Lapisan data aplikasi
   Semua data disimpan di localStorage sehingga tetap ada
   setelah halaman ditutup. Menyediakan CRUD, data contoh,
   agregasi dasbor, dan penyusun laporan bulanan.
   ══════════════════════════════════════════════════════════ */

const Store = (() => {
  const KEY = 'wgd-app-v1';

  /* ── Utilitas ──────────────────────────────────────────── */
  const uid = (p = 'id') =>
    p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  const rupiah = (n) =>
    'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

  const angka = (n) => Number(n || 0).toLocaleString('id-ID');

  const tglID = (iso, opts) =>
    new Date(iso).toLocaleDateString('id-ID', opts || { day: 'numeric', month: 'short', year: 'numeric' });

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const periodeDari = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
  };

  const labelPeriode = (p) => {
    const [y, m] = p.split('-').map(Number);
    return `${BULAN[m - 1]} ${y}`;
  };

  const hariLalu = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  /* PRNG deterministik supaya data contoh stabil */
  const prng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ── Harga (sesuai ketentuan PKM-K) ────────────────────── */
  const HARGA = {
    Gratis: { sekali: 0, bulanan: 0 },
    Hemat: { sekali: 35000, bulanan: 15000 },
    Plus: { sekali: 100000, bulanan: 15000 },
  };
  const LANGGANAN = 15000;

  /* ── Data kosong (kondisi awal) ────────────────────────── */
  // Pemilik warung baru belum punya pelanggan, jadi aplikasi dimulai
  // tanpa data. Semua modul menampilkan keadaan kosong sampai data diisi.
  const kosong = () => ({
    meta: { versi: 1, dibuat: new Date().toISOString() },
    warung: [], transaksi: [], rating: [], pantau: [],
    katalog: [], promo: [], foto: [], ulasanQR: [],
    log: [],
  });

  /* ── Data contoh (opsional, untuk uji coba) ────────────── */
  const contoh = () => {
    const rnd = prng(20261110);
    const now = new Date();

    const daftarWarung = [
      ['Warung Bu Sari', 'Sari Wulandari', '6281563324546', 'Jl. Melati No. 12, Sleman', 'Makanan', 'Hemat', -7.7162, 110.3554, 'ChIJ0001'],
      ['Kopi Pakde Jum', 'Jumadi', '6281234567890', 'Jl. Kaliurang KM 5, Sleman', 'Minuman', 'Plus', -7.7053, 110.3702, 'ChIJ0002'],
      ['Bakso Mas Gendut', 'Agus Priyanto', '6281298765432', 'Jl. Godean No. 88, Sleman', 'Makanan', 'Hemat', -7.7699, 110.3245, 'ChIJ0003'],
      ['Sate Ayam Pak Karyo', 'Karyono', '6281355512345', 'Jl. Monjali No. 3, Sleman', 'Makanan', 'Gratis', -7.7562, 110.3688, 'ChIJ0004'],
      ['Es Dawet Bu Tinah', 'Tinah', '6281377788899', 'Jl. Magelang KM 6, Sleman', 'Minuman', 'Gratis', -7.7285, 110.3480, 'ChIJ0005'],
      ['Nasi Goreng Mbak Rini', 'Rini Astuti', '6281122233344', 'Jl. Palagan KM 8, Sleman', 'Makanan', 'Plus', -7.6948, 110.3629, 'ChIJ0006'],
      ['Warung Sembako Pak Slamet', 'Slamet Riyadi', '6281400011122', 'Jl. Wates KM 4, Yogyakarta', 'Sembako', 'Hemat', -7.7862, 110.3401, 'ChIJ0007'],
      ['Angkringan Mas Budi', 'Budi Santoso', '6281555566677', 'Jl. Gejayan No. 21, Sleman', 'Makanan', 'Plus', -7.7767, 110.3831, 'ChIJ0008'],
    ];

    const menuUmum = [
      ['Nasi Goreng Spesial', 15000, 'Makanan'],
      ['Mie Goreng Jawa', 13000, 'Makanan'],
      ['Ayam Bakar Madu', 22000, 'Makanan'],
      ['Sate Ayam (10 tusuk)', 20000, 'Makanan'],
      ['Es Teh Manis', 5000, 'Minuman'],
      ['Es Jeruk Peras', 7000, 'Minuman'],
      ['Kopi Hitam', 6000, 'Minuman'],
      ['Es Dawet', 8000, 'Minuman'],
      ['Air Mineral', 4000, 'Minuman'],
      ['Nasi Putih', 5000, 'Tambahan'],
      ['Kerupuk', 2000, 'Tambahan'],
      ['Tempe Goreng', 3000, 'Tambahan'],
    ];

    const warung = daftarWarung.map((w, i) => {
      const [nama, pemilik, wa, alamat, kategori, paket, lat, lng, placeId] = w;
      const tglDaftar = hariLalu(Math.floor(rnd() * 300) + 30).toISOString();
      const menu = menuUmum
        .filter(() => rnd() > 0.25)
        .slice(0, Math.max(4, Math.floor(rnd() * 8) + 4))
        .map((m) => ({ id: uid('mn'), nama: m[0], harga: m[1], kategori: m[2], foto: null }));
      return {
        id: 'wr-' + String(i + 1).padStart(3, '0'),
        nama, pemilik, wa, alamat, kategori, paket, lat, lng, placeId,
        ratingMaps: +(3.8 + rnd() * 1.1).toFixed(1),
        jumlahUlasan: Math.floor(rnd() * 180) + 12,
        ratingInternal: +(4.0 + rnd() * 0.9).toFixed(1),
        status: i === 4 ? 'nonaktif' : i === 3 ? 'pending' : 'aktif',
        tglDaftar,
        tglLanggananSampai: new Date(new Date(tglDaftar).getTime() + 30 * 864e5).toISOString(),
        menu,
        galeri: [],
        kodeQR: 'WGD-' + String(i + 1).padStart(3, '0'),
      };
    });

    /* Transaksi 6 bulan terakhir */
    const transaksi = [];
    const metode = ['QRIS', 'Transfer', 'Tunai'];
    for (let m = 5; m >= 0; m--) {
      const bulan = new Date(now.getFullYear(), now.getMonth() - m, 1);
      for (const w of warung) {
        const tglDaftarW = new Date(w.tglDaftar);
        if (tglDaftarW > new Date(bulan.getFullYear(), bulan.getMonth() + 1, 0)) continue;
        const h = HARGA[w.paket];
        const hari = Math.min(27, Math.floor(rnd() * 27) + 1);
        const tgl = new Date(bulan.getFullYear(), bulan.getMonth(), hari);

        if (m === 5 || (rnd() > 0.85 && h.sekali > 0)) {
          if (h.sekali > 0) {
            transaksi.push({
              id: uid('tr'), warungId: w.id, tgl: tgl.toISOString(),
              jenis: 'paket', item: `Paket ${w.paket} (sekali bayar)`,
              jumlah: h.sekali, metode: metode[Math.floor(rnd() * 3)],
              status: 'lunas', ref: 'INV-' + Math.floor(rnd() * 90000 + 10000),
            });
          }
        }
        if (h.bulanan > 0) {
          transaksi.push({
            id: uid('tr'), warungId: w.id, tgl: tgl.toISOString(),
            jenis: 'langganan', item: `Langganan bulanan ${labelPeriode(periodeDari(bulan))}`,
            jumlah: h.bulanan, metode: metode[Math.floor(rnd() * 3)],
            status: rnd() > 0.12 ? 'lunas' : 'pending',
            ref: 'INV-' + Math.floor(rnd() * 90000 + 10000),
          });
        }
      }
    }
    transaksi.sort((a, b) => new Date(b.tgl) - new Date(a.tgl));

    /* Ulasan */
    const komentar = [
      ['Makanannya enak, harganya ramah kantong. Pesan lewat QR gampang banget.', 5],
      ['Porsi mantap, pelayanan cepat. Recommended!', 5],
      ['Rasanya lumayan, tempatnya bersih.', 4],
      ['Enak tapi agak lama nunggunya pas ramai.', 4],
      ['Sambalnya juara. Pasti balik lagi.', 5],
      ['Standar, tidak ada yang istimewa.', 3],
      ['Harga naik tapi porsi tetap. Oke lah.', 3],
      ['Pesanan lewat WhatsApp diproses cepat, mantap.', 5],
    ];
    const rating = [];
    for (const w of warung) {
      const n = Math.floor(rnd() * 5) + 2;
      for (let i = 0; i < n; i++) {
        const k = komentar[Math.floor(rnd() * komentar.length)];
        rating.push({
          id: uid('rt'), warungId: w.id,
          tgl: hariLalu(Math.floor(rnd() * 120) + 1).toISOString(),
          sumber: rnd() > 0.4 ? 'maps' : 'internal',
          skor: k[1], ulasan: k[0],
          nama: ['Andi', 'Siti', 'Budi', 'Dewi', 'Rizky', 'Putri', 'Hendra', 'Lina'][Math.floor(rnd() * 8)],
          balas: rnd() > 0.6 ? 'Terima kasih atas ulasannya!' : '',
        });
      }
    }

    /* Snapshot pantauan rating harian 90 hari */
    const pantau = [];
    for (const w of warung) {
      let r = w.ratingMaps - 0.3;
      let c = w.jumlahUlasan - 20;
      for (let d = 90; d >= 0; d -= 3) {
        r = Math.min(5, Math.max(3.5, r + (rnd() - 0.45) * 0.12));
        c += Math.floor(rnd() * 3);
        pantau.push({
          id: uid('pt'), warungId: w.id,
          tgl: hariLalu(d).toISOString(),
          ratingMaps: +r.toFixed(2), jumlahUlasan: c,
        });
      }
    }

    /* Katalog WhatsApp Business */
    const katalog = [];
    for (const w of warung)
      for (const mn of w.menu.slice(0, 6))
        katalog.push({
          id: uid('kt'), warungId: w.id, nama: mn.nama, kategori: mn.kategori,
          harga: mn.harga,
          deskripsi: `${mn.nama} buatan ${w.nama}. Pesan langsung via WhatsApp.`,
          wa: w.wa, aktif: rnd() > 0.15,
          tgl: hariLalu(Math.floor(rnd() * 90)).toISOString(),
        });

    /* Promosi digital */
    const promo = [];
    const jenisPromo = [
      ['Diskon 10% menu utama', 'menu'],
      ['Paket hemat sarapan Rp 12.000', 'menu'],
      ['Poster promo buka puasa', 'poster'],
      ['Poster grand opening cabang 2', 'poster'],
      ['Siaran WhatsApp menu baru', 'siaran'],
      ['Siaran promo akhir bulan', 'siaran'],
      ['Promo gratis es teh min. Rp 25.000', 'menu'],
      ['Poster QR ulasan Google', 'poster'],
    ];
    for (const w of warung) {
      const n = Math.floor(rnd() * 3) + 1;
      for (let i = 0; i < n; i++) {
        const p = jenisPromo[Math.floor(rnd() * jenisPromo.length)];
        const mulai = hariLalu(Math.floor(rnd() * 100) + 5);
        const target = Math.floor(rnd() * 400) + 60;
        const terkirim = p[1] === 'siaran' ? Math.floor(target * (0.7 + rnd() * 0.3)) : 0;
        promo.push({
          id: uid('pr'), warungId: w.id, nama: p[0], jenis: p[1],
          mulai: mulai.toISOString(),
          selesai: new Date(mulai.getTime() + (Math.floor(rnd() * 20) + 7) * 864e5).toISOString(),
          diskon: p[1] === 'menu' ? [10, 15, 20][Math.floor(rnd() * 3)] : 0,
          aktif: rnd() > 0.3, target,
          terkirim, dibaca: Math.floor(terkirim * (0.5 + rnd() * 0.4)),
          klik: Math.floor(terkirim * (0.1 + rnd() * 0.25)),
        });
      }
    }

    /* Foto produk */
    const foto = [];
    for (const w of warung) {
      const n = Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const mn = w.menu[Math.floor(rnd() * w.menu.length)];
        foto.push({
          id: uid('ft'), warungId: w.id,
          nama: (mn ? mn.nama : 'Produk') + ' — foto ' + (i + 1),
          dataUrl: null, kategori: mn ? mn.kategori : 'Makanan',
          status: ['draf', 'siap', 'terbit'][Math.floor(rnd() * 3)],
          ukuran: Math.floor(rnd() * 900) + 180,
          tgl: hariLalu(Math.floor(rnd() * 120) + 1).toISOString(),
        });
      }
    }

    /* Kode QR ulasan */
    const ulasanQR = warung.map((w) => ({
      id: uid('uq'), warungId: w.id,
      tgl: w.tglDaftar, kode: `REV-${w.kodeQR}`,
      diakses: Math.floor(rnd() * 300) + 20,
      konversi: Math.floor(rnd() * 40) + 3,
    }));

    return {
      meta: { versi: 1, dibuat: new Date().toISOString() },
      warung, transaksi, rating, pantau, katalog, promo, foto, ulasanQR,
      log: [{ id: uid('lg'), tgl: new Date().toISOString(), aksi: 'Data contoh dimuat', detail: `${warung.length} warung` }],
    };
  };

  /* ── Muat / simpan ─────────────────────────────────────── */
  let db = null;

  const load = () => {
    if (db) return db;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        db = JSON.parse(raw);
        if (db && db.meta && db.meta.versi === 1) return db;
      }
    } catch (e) {
      console.warn('Data tersimpan tidak terbaca, memuat data kosong.', e);
    }
    db = kosong();
    save();
    return db;
  };

  let saveTimer = null;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(db));
      } catch (e) {
        console.error('Gagal menyimpan (penyimpanan penuh?)', e);
      }
    }, 120);
  };

  const saveNow = () => {
    clearTimeout(saveTimer);
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* diabaikan */ }
  };

  // Hapus semua data (kembali ke kondisi awal yang kosong).
  const kosongkan = () => {
    localStorage.removeItem(KEY);
    db = kosong();
    saveNow();
    return db;
  };

  // Isi dengan data contoh untuk uji coba/demo.
  const muatContoh = () => {
    db = contoh();
    saveNow();
    return db;
  };

  /* ── CRUD ──────────────────────────────────────────────── */
  const all = (c) => (load()[c] || []).slice();
  const find = (c, id) => (load()[c] || []).find((x) => x.id === id) || null;
  const where = (c, fn) => (load()[c] || []).filter(fn);

  /* ── Langganan perubahan ──────────────────────────────────
     Dipakai pemicu penerbitan menu otomatis. Setiap add/update/remove
     memberi tahu pendengar, sehingga perubahan dari mana pun tertangkap. */
  const pendengar = [];
  const padaUbah = (cb) => { pendengar.push(cb); return cb; };
  const beritahu = (koleksi, aksi, rec) => {
    for (const cb of pendengar) {
      try { cb(koleksi, aksi, rec); } catch (e) { console.warn('pendengar gagal', e); }
    }
  };

  const add = (c, obj) => {
    const rec = { id: obj.id || uid(c.slice(0, 2)), ...obj };
    load()[c].unshift(rec);
    log('Tambah ' + c, rec.nama || rec.item || rec.id);
    save();
    beritahu(c, 'tambah', rec);
    return rec;
  };

  const update = (c, id, patch) => {
    const rec = find(c, id);
    if (!rec) return null;
    Object.assign(rec, patch);
    log('Ubah ' + c, rec.nama || rec.item || id);
    save();
    beritahu(c, 'ubah', rec);
    return rec;
  };

  const remove = (c, id) => {
    const list = load()[c];
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return false;
    const [rec] = list.splice(i, 1);
    log('Hapus ' + c, rec.nama || rec.item || id);
    save();
    beritahu(c, 'hapus', rec);
    return true;
  };

  const log = (aksi, detail) => {
    const d = load();
    d.log.unshift({ id: uid('lg'), tgl: new Date().toISOString(), aksi, detail });
    d.log = d.log.slice(0, 200);
  };

  /* ── Agregasi ──────────────────────────────────────────── */
  const ringkas = () => {
    const d = load();
    const p = periodeDari(new Date());
    const tr = d.transaksi;
    const bulanIni = tr.filter((t) => periodeDari(t.tgl) === p && t.status === 'lunas');
    const bulanLaluD = new Date();
    bulanLaluD.setMonth(bulanLaluD.getMonth() - 1);
    const pLalu = periodeDari(bulanLaluD);
    const lalu = tr.filter((t) => periodeDari(t.tgl) === pLalu && t.status === 'lunas');

    const jumlah = (a) => a.reduce((s, t) => s + t.jumlah, 0);
    const pendapatanBulan = jumlah(bulanIni);
    const pendapatanLalu = jumlah(lalu);

    const aktif = d.warung.filter((w) => w.status === 'aktif').length;
    const rata = d.warung.filter((w) => w.status === 'aktif');
    const ratingRata = rata.length ? rata.reduce((s, w) => s + w.ratingMaps, 0) / rata.length : 0;

    const belumBayar = tr.filter((t) => t.status === 'pending').length;
    const langgananAktif = d.warung.filter((w) => w.tglLanggananSampai && new Date(w.tglLanggananSampai) > new Date()).length;

    return {
      periode: p,
      pendapatanBulan, pendapatanLalu,
      pertumbuhan: pendapatanLalu ? ((pendapatanBulan - pendapatanLalu) / pendapatanLalu) * 100 : 0,
      totalWarung: d.warung.length, aktif, pending: d.warung.filter((w) => w.status === 'pending').length,
      nonaktif: d.warung.filter((w) => w.status === 'nonaktif').length,
      ratingRata, belumBayar, langgananAktif,
      totalTransaksi: tr.length,
      promoAktif: d.promo.filter((x) => x.aktif).length,
      katalogAktif: d.katalog.filter((x) => x.aktif).length,
      fotoTerbit: d.foto.filter((x) => x.status === 'terbit').length,
      qrDiakses: d.ulasanQR.reduce((s, x) => s + x.diakses, 0),
    };
  };

  /* Pendapatan per bulan untuk grafik tren */
  const trenPendapatan = (nBulan = 6) => {
    const d = load();
    const out = [];
    const now = new Date();
    for (let i = nBulan - 1; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const p = periodeDari(dt);
      const items = d.transaksi.filter((t) => periodeDari(t.tgl) === p && t.status === 'lunas');
      out.push({
        periode: p,
        label: BULAN[dt.getMonth()].slice(0, 3),
        paket: items.filter((t) => t.jenis === 'paket').reduce((s, t) => s + t.jumlah, 0),
        langganan: items.filter((t) => t.jenis === 'langganan').reduce((s, t) => s + t.jumlah, 0),
        total: items.reduce((s, t) => s + t.jumlah, 0),
        jumlah: items.length,
      });
    }
    return out;
  };

  const perMetode = (periode) => {
    const d = load();
    const items = d.transaksi.filter(
      (t) => (!periode || periodeDari(t.tgl) === periode) && t.status === 'lunas'
    );
    const out = {};
    for (const t of items) out[t.metode] = (out[t.metode] || 0) + t.jumlah;
    return Object.entries(out).map(([metode, jumlah]) => ({ metode, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  };

  const perPaket = () => {
    const d = load();
    const out = { Gratis: 0, Hemat: 0, Plus: 0 };
    for (const w of d.warung) out[w.paket] = (out[w.paket] || 0) + 1;
    return Object.entries(out).map(([paket, jumlah]) => ({ paket, jumlah }));
  };

  const topWarung = (n = 5) => {
    const d = load();
    return d.warung
      .map((w) => ({
        ...w,
        pendapatan: d.transaksi
          .filter((t) => t.warungId === w.id && t.status === 'lunas')
          .reduce((s, t) => s + t.jumlah, 0),
      }))
      .sort((a, b) => b.pendapatan - a.pendapatan)
      .slice(0, n);
  };

  /* ── Laporan bulanan ───────────────────────────────────── */
  const laporanBulanan = (periode) => {
    const d = load();
    const items = d.transaksi.filter((t) => periodeDari(t.tgl) === periode);
    const lunas = items.filter((t) => t.status === 'lunas');
    const jumlah = (a) => a.reduce((s, t) => s + t.jumlah, 0);

    const paket = lunas.filter((t) => t.jenis === 'paket');
    const langganan = lunas.filter((t) => t.jenis === 'langganan');

    const daftarBaru = d.warung.filter((w) => periodeDari(w.tglDaftar) === periode);
    const ratingBulan = d.rating.filter((r) => periodeDari(r.tgl) === periode);
    const promoBulan = d.promo.filter((p) => periodeDari(p.mulai) === periode);
    const fotoBulan = d.foto.filter((f) => periodeDari(f.tgl) === periode);

    const aktif = d.warung.filter((w) => w.status === 'aktif');

    return {
      periode, label: labelPeriode(periode),
      pendapatan: {
        total: jumlah(lunas),
        paket: jumlah(paket),
        langganan: jumlah(langganan),
        transaksiPaket: paket.length,
        transaksiLangganan: langganan.length,
      },
      transaksi: {
        total: items.length,
        lunas: lunas.length,
        pending: items.filter((t) => t.status === 'pending').length,
        batal: items.filter((t) => t.status === 'batal').length,
        nilaiPending: jumlah(items.filter((t) => t.status === 'pending')),
      },
      metode: perMetode(periode),
      warung: {
        total: d.warung.length,
        aktif: aktif.length,
        baru: daftarBaru.length,
        baruDaftar: daftarBaru.map((w) => ({ nama: w.nama, paket: w.paket, tgl: w.tglDaftar })),
      },
      rating: {
        rataMaps: aktif.length ? +(aktif.reduce((s, w) => s + w.ratingMaps, 0) / aktif.length).toFixed(2) : 0,
        ulasanBaru: ratingBulan.length,
        rataUlasanBaru: ratingBulan.length
          ? +(ratingBulan.reduce((s, r) => s + r.skor, 0) / ratingBulan.length).toFixed(2) : 0,
        sumberMaps: ratingBulan.filter((r) => r.sumber === 'maps').length,
        sumberInternal: ratingBulan.filter((r) => r.sumber === 'internal').length,
        perluBalas: d.rating.filter((r) => !r.balas).length,
      },
      promo: {
        jumlah: promoBulan.length,
        aktif: promoBulan.filter((p) => p.aktif).length,
        terkirim: promoBulan.reduce((s, p) => s + (p.terkirim || 0), 0),
        dibaca: promoBulan.reduce((s, p) => s + (p.dibaca || 0), 0),
        klik: promoBulan.reduce((s, p) => s + (p.klik || 0), 0),
      },
      foto: { jumlah: fotoBulan.length, terbit: fotoBulan.filter((f) => f.status === 'terbit').length },
      katalog: { aktif: d.katalog.filter((k) => k.aktif).length, total: d.katalog.length },
      dibuat: new Date().toISOString(),
    };
  };

  const daftarPeriode = () => {
    const d = load();
    const set = new Set(d.transaksi.map((t) => periodeDari(t.tgl)));
    set.add(periodeDari(new Date()));
    return [...set].sort().reverse();
  };

  /* ── Ekspor / impor ────────────────────────────────────── */
  const ekspor = () => JSON.stringify(load(), null, 2);

  const impor = (json) => {
    const obj = JSON.parse(json);
    if (!obj || !obj.warung) throw new Error('Berkas tidak dikenali');
    db = obj;
    saveNow();
    return db;
  };

  return {
    uid, rupiah, angka, tglID, BULAN, HARGA, LANGGANAN,
    periodeDari, labelPeriode, hariLalu,
    load, save, saveNow, kosongkan, muatContoh,
    all, find, where, add, update, remove, log,
    padaUbah,
    ringkas, trenPendapatan, perMetode, perPaket, topWarung,
    laporanBulanan, daftarPeriode, ekspor, impor,
  };
})();

if (typeof window !== 'undefined') window.Store = Store;
