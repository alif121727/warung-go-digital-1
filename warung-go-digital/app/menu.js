/* ══════════════════════════════════════════════════════════
   menu.js — halaman menu publik (dibuka pelanggan lewat QR).

   Satu pindai membuka tiga hal:
     1. Menu      — semua makanan & minuman, paling laris di atas.
     2. Nilai     — beri bintang per hidangan + peta warung.
     3. Bayar     — keranjang, total, tujuan bayar, lalu kirim pesanan.

   Sumber data, berurutan: berkas terbit menu/<id>.json, server sinkron,
   lalu data lokal (untuk pengembangan di satu HP).
   ══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
  const q = new URLSearchParams(location.search);
  const id = q.get('w');

  const elNama = document.getElementById('nama');
  const elMeta = document.getElementById('meta');
  const elBadges = document.getElementById('badges');
  const elIsi = document.getElementById('isiMenu');
  const elNilai = document.getElementById('tabNilai');
  const elBayar = document.getElementById('tabBayar');
  const btnPesan = document.getElementById('waPesan');
  const btnMaps = document.getElementById('waMaps');
  const btnFloat = document.getElementById('waFloat');
  const elTabMenu = document.getElementById('tabMenu');
  const elTabbar = document.getElementById('tabbar');
  const elKeranjangbar = document.getElementById('keranjangbar');
  const elKbJumlah = document.getElementById('kbJumlah');
  const elKbTotal = document.getElementById('kbTotal');
  const elNKeranjang = document.getElementById('nKeranjang');

  const KUNCI_NILAI = 'wgd-nilai-v1';
  const KUNCI_BAYAR = 'wgd-bayar-v1';

  let data = null;
  let keranjang = {}; // { namaMenu: jumlah }
  let tabAktif = 'menu';

  const bacaJSON = (k, cadangan) => {
    try { return JSON.parse(localStorage.getItem(k) || 'null') || cadangan; }
    catch (e) { return cadangan; }
  };
  const tulisJSON = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ }
  };

  const sembunyikanTombol = () => {
    btnPesan.style.display = 'none';
    btnMaps.style.display = 'none';
    btnFloat.style.display = 'none';
  };

  const pesanKosong = (judul, teks) => {
    elNama.textContent = judul;
    elMeta.textContent = teks;
    elIsi.innerHTML = `
      <div class="kosong">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11a1 1 0 001 1h14a1 1 0 001-1V9"/></svg>
        <h3>Menu tidak tersedia</h3>
        <p>${esc(teks)}</p>
      </div>`;
    sembunyikanTombol();
    elTabbar.hidden = true;
    elKeranjangbar.hidden = true;
  };

  /* ── Sumber data menu ─────────────────────────────────── */
  const muatBerkasTerbit = async () => {
    const url = new URL('../menu/' + encodeURIComponent(id) + '.json', location.href);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  };

  const muatServerSinkron = async () => {
    const meta = document.querySelector('meta[name="wgd-menu-server"]');
    const alamat = ((meta && meta.content.trim()) ||
      localStorage.getItem('wgd-menu-server') || '').replace(/\/+$/, '');
    if (!alamat) throw new Error('server belum diatur');
    const r = await fetch(alamat + '/api/menu?id=' + encodeURIComponent(id), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  };

  const muatLokal = () => {
    if (typeof Store === 'undefined') throw new Error('tidak ada data lokal');
    Store.load();
    const w = Store.find('warung', id);
    if (!w) throw new Error('warung tidak ada di perangkat ini');
    return {
      wgd: 2, jenis: 'menu-publik',
      warung: {
        id: w.id, nama: w.nama, pemilik: w.pemilik, wa: w.wa, alamat: w.alamat,
        kategori: w.kategori, placeId: w.placeId, rating: w.ratingMaps, ulasan: w.jumlahUlasan,
      },
      menu: w.menu.map((m) => ({ nama: m.nama, harga: m.harga, kategori: m.kategori, ket: m.ket || '', foto: m.foto || null })),
    };
  };

  /* ── Nilai (penilaian) ────────────────────────────────── */
  // Penilaian pelanggan disimpan di HP ini. Bila berkas terbit memuat
  // ringkasan penilaian, ringkasan itu ditampilkan sebagai nilai umum.
  const nilaiSaya = () => bacaJSON(KUNCI_NILAI, {})[id] || {};
  const simpanNilai = (namaMenu, bintang) => {
    const semua = bacaJSON(KUNCI_NILAI, {});
    semua[id] = semua[id] || {};
    semua[id][namaMenu] = { bintang, waktu: new Date().toISOString() };
    tulisJSON(KUNCI_NILAI, semua);
  };
  const nilaiUmum = (namaMenu) => {
    const daftar = (data && data.nilai && data.nilai[namaMenu]) || null;
    return daftar && daftar.rata ? daftar : null;
  };

  /* ── Tab ──────────────────────────────────────────────── */
  const pindahTab = (t) => {
    tabAktif = t;
    // Tab yang isinya bergantung keadaan (keranjang, nilai) harus digambar
    // ulang saat dibuka — kalau tidak, ia menampilkan versi lama.
    if (t === 'bayar') gambarBayar();
    else if (t === 'nilai') gambarNilai();
    elTabMenu.hidden = t !== 'menu';
    elNilai.hidden = t !== 'nilai';
    elBayar.hidden = t !== 'bayar';
    Array.from(elTabbar.querySelectorAll('[data-tab]')).forEach((b) =>
      b.classList.toggle('on', b.dataset.tab === t)
    );
    btnFloat.style.display = t === 'menu' ? '' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Keranjang ────────────────────────────────────────── */
  const jumlahKeranjang = () => Object.values(keranjang).reduce((s, n) => s + n, 0);
  const totalKeranjang = () => {
    const harga = new Map((data.menu || []).map((m) => [m.nama, Number(m.harga) || 0]));
    return Object.entries(keranjang).reduce((s, [nama, n]) => s + (harga.get(nama) || 0) * n, 0);
  };

  const segarkanKeranjang = () => {
    const n = jumlahKeranjang();
    elKeranjangbar.hidden = n === 0;
    elNKeranjang.hidden = n === 0;
    elNKeranjang.textContent = n;
    elKbJumlah.textContent = n + ' item';
    elKbTotal.textContent = rupiah(totalKeranjang());
  };

  const ubahJumlah = (nama, delta) => {
    const n = (keranjang[nama] || 0) + delta;
    if (n <= 0) delete keranjang[nama]; else keranjang[nama] = n;
    segarkanKeranjang();
    gambarMenu();
    if (tabAktif === 'bayar') gambarBayar();
  };

  /* ── Gambar: daftar menu ──────────────────────────────── */
  const ikonGambar = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>`;

  const larisDari = (m) => Number(m.laris) || 0;

  const tombolTambah = (m) => {
    const n = keranjang[m.nama] || 0;
    if (!n) return `<button class="tambah" data-tambah="${esc(m.nama)}" aria-label="Tambah ${esc(m.nama)}">+</button>`;
    return `<div class="atur">
        <button data-kurang="${esc(m.nama)}" aria-label="Kurangi">−</button>
        <span>${n}</span>
        <button data-tambah="${esc(m.nama)}" aria-label="Tambah">+</button>
      </div>`;
  };

  const gambarMenu = () => {
    const w = data.warung || {};
    const daftar = data.menu || [];
    const waBase = w.wa ? 'https://wa.me/' + w.wa : '';

    // Semua item diurutkan: paling laris di atas.
    const urut = [...daftar].sort((a, b) => larisDari(b) - larisDari(a));
    const terlaris = urut.filter((m) => larisDari(m) > 0).slice(0, 5);

    const kartuLaris = (m, i) => `
      <div class="laris__kartu ${i === 0 ? 'laris__kartu--juara' : ''}">
        ${i === 0 ? '<span class="laris__pita">PALING LARIS</span>' : ''}
        <div class="laris__gambar">${m.foto ? `<img src="${esc(m.foto)}" alt="${esc(m.nama)}" loading="lazy">` : ikonGambar}</div>
        <div class="laris__nama">${esc(m.nama)}</div>
        <div class="laris__kaki">
          <span class="laris__harga">${rupiah(m.harga)}</span>
          ${larisDari(m) ? `<span class="laris__jual">${larisDari(m)}× terjual</span>` : ''}
        </div>
        ${tombolTambah(m)}
      </div>`;

    const kelompok = {};
    for (const m of urut) (kelompok[m.kategori || 'Menu'] = kelompok[m.kategori || 'Menu'] || []).push(m);

    let n = 0;
    elIsi.innerHTML = `
      ${terlaris.length ? `
        <div class="judul"><h2>Paling Laris</h2><span>${terlaris.length} favorit</span></div>
        <div class="laris">${terlaris.map(kartuLaris).join('')}</div>` : ''}
      ${Object.entries(kelompok).map(([kategori, items]) => `
        <div class="judul"><h2>${esc(kategori)}</h2><span>${items.length} item</span></div>
        ${items.map((m) => {
          const pesan = waBase
            ? encodeURIComponent(`Halo ${w.pemilik || w.nama}, saya mau pesan *${m.nama}* (${rupiah(m.harga)}) dari ${w.nama}.`)
            : '';
          const geser = (n++ * 40);
          const nb = nilaiSaya()[m.nama];
          return `
            <div class="item" style="animation-delay:${geser}ms">
              <div class="item__gambar">${m.foto ? `<img src="${esc(m.foto)}" alt="${esc(m.nama)}" loading="lazy">` : ikonGambar}</div>
              <div class="item__isi">
                <div class="item__nama">${esc(m.nama)} ${larisDari(m) ? `<span class="laris__jual">· ${larisDari(m)}× terjual</span>` : ''}</div>
                <div class="item__ket">${esc(m.ket || 'Dibuat segar saat dipesan')}</div>
                ${nb ? `<div class="laris__jual">Nilai Anda: ${'★'.repeat(nb.bintang)}</div>` : ''}
              </div>
              <div class="item__kanan">
                <div class="item__harga">${rupiah(m.harga)}</div>
                <div style="display:flex;align-items:center;gap:7px;margin-top:7px">
                  ${tombolTambah(m)}
                  ${waBase ? `<a class="item__pesan" href="${waBase}?text=${pesan}" target="_blank" rel="noopener">WA</a>` : ''}
                </div>
              </div>
            </div>`;
        }).join('')}
      `).join('')}`;

    elIsi.querySelectorAll('[data-tambah]').forEach((b) =>
      b.addEventListener('click', () => ubahJumlah(b.dataset.tambah, 1)));
    elIsi.querySelectorAll('[data-kurang]').forEach((b) =>
      b.addEventListener('click', () => ubahJumlah(b.dataset.kurang, -1)));
    segarkanKeranjang();
  };

  /* ── Gambar: tab Nilai ────────────────────────────────── */
  const gambarNilai = () => {
    const w = data.warung || {};
    const daftar = data.menu || [];
    const saya = nilaiSaya();

    const petaAlamat = w.placeId
      ? 'https://www.google.com/maps/place/?q=place_id:' + encodeURIComponent(w.placeId)
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([w.nama, w.alamat].filter(Boolean).join(' '));

    const bintangKartu = (m) => {
      const nb = saya[m.nama] ? saya[m.nama].bintang : 0;
      const umum = nilaiUmum(m.nama);
      return `
        <div class="nilai__kartu">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
            <div>
              <div class="item__nama">${esc(m.nama)}</div>
              <div class="item__ket">${umum ? `Nilai umum ${umum.rata.toFixed(1)} dari ${umum.jumlah} penilaian` : 'Belum ada penilaian umum'}</div>
            </div>
            <div class="bintang" data-bintang="${esc(m.nama)}">
              ${[1, 2, 3, 4, 5].map((i) => `<button data-n="${i}" class="${i <= nb ? 'on' : ''}" aria-label="Beri ${i} bintang">★</button>`).join('')}
            </div>
          </div>
        </div>`;
    };

    elNilai.innerHTML = `
      <div class="kartu" style="margin-top:22px">
        <div style="display:flex;gap:16px;align-items:center">
          <div>
            <div class="rata">${Number(w.rating || 0).toFixed(1)}</div>
            <div class="laris__jual">${w.ulasan || 0} ulasan Google</div>
          </div>
          <div style="flex:1">
            <div class="item__nama">${esc(w.nama || 'Warung')}</div>
            <div class="item__ket">${esc(w.alamat || '')}</div>
            <a class="btn btn--ink" style="margin-top:10px;min-width:0" href="${petaAlamat}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
              Buka di Google Maps
            </a>
          </div>
        </div>
      </div>
      <div class="judul"><h2>Nilai makanan &amp; minuman</h2><span>${daftar.length} item</span></div>
      <div class="notis notis--biru">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
        <span>Beri bintang untuk hidangan yang Anda coba. Penilaian Anda tersimpan di HP ini.</span>
      </div>
      ${daftar.map(bintangKartu).join('')}`;

    elNilai.querySelectorAll('[data-bintang]').forEach((wadah) => {
      const namaMenu = wadah.dataset.bintang;
      wadah.querySelectorAll('button').forEach((b) =>
        b.addEventListener('click', () => {
          simpanNilai(namaMenu, Number(b.dataset.n));
          gambarNilai();
          gambarMenu();
        }));
    });
  };

  /* ── Gambar: tab Bayar ────────────────────────────────── */
  const tujuanBayar = () => {
    const b = (data.warung && data.warung.bayar) || null;
    return b && (b.nomor || b.qris || b.tautan) ? b : null;
  };

  const gambarBayar = () => {
    const w = data.warung || {};
    const isiKeranjang = Object.entries(keranjang);

    if (!isiKeranjang.length) {
      elBayar.innerHTML = `
        <div class="kartu" style="margin-top:22px">
          <div class="kosong" style="padding:34px 10px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a1.6 1.6 0 001.6 1.3h8.6a1.6 1.6 0 001.6-1.3L21 7H6"/></svg>
            <h3>Keranjang masih kosong</h3>
            <p>Pilih makanan atau minuman di tab Menu, lalu tekan tombol +.</p>
          </div>
          <button class="btn btn--ink" style="width:100%" id="keMenu">Lihat menu</button>
        </div>`;
      const km = document.getElementById('keMenu');
      if (km) km.addEventListener('click', () => pindahTab('menu'));
      return;
    }

    const harga = new Map((data.menu || []).map((m) => [m.nama, Number(m.harga) || 0]));
    const total = totalKeranjang();
    const t = tujuanBayar();
    const tersimpan = bacaJSON(KUNCI_BAYAR, {})[id] || null;

    elBayar.innerHTML = `
      <div class="kartu" style="margin-top:22px">
        <div class="judul" style="margin-top:0"><h2>Pesanan Anda</h2><span>${jumlahKeranjang()} item</span></div>
        ${isiKeranjang.map(([nama, n]) => `
          <div class="kbaris">
            <div class="kbaris__isi">
              <div class="kbaris__nama">${esc(nama)}</div>
              <div class="kbaris__sub">${rupiah(harga.get(nama) || 0)} × ${n}</div>
            </div>
            <div class="atur">
              <button data-kurang="${esc(nama)}" aria-label="Kurangi">−</button>
              <span>${n}</span>
              <button data-tambah="${esc(nama)}" aria-label="Tambah">+</button>
            </div>
            <div class="mono" style="font-weight:700;min-width:74px;text-align:right">${rupiah((harga.get(nama) || 0) * n)}</div>
          </div>`).join('')}
        <div class="total">
          <span class="total__label">Total</span>
          <span class="total__nilai">${rupiah(total)}</span>
        </div>

        <div class="bidang" style="margin-top:16px">
          <label for="namaPelanggan">Nama Anda (untuk pesanan)</label>
          <input id="namaPelanggan" placeholder="mis. Rina" maxlength="40" autocomplete="name">
        </div>
        <div class="bidang">
          <label for="mejaPelanggan">Nomor meja / keterangan</label>
          <input id="mejaPelanggan" placeholder="mis. Meja 3" maxlength="20">
        </div>
        <div class="bidang">
          <label for="catatanPelanggan">Catatan (opsional)</label>
          <input id="catatanPelanggan" placeholder="mis. tidak pakai pedas" maxlength="200">
        </div>

        ${t ? `
          <div class="bayar__tujuan">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px">Bayar ke</div>
            ${t.bank ? `<div class="baris"><span>${esc(t.bank)}</span><b>${esc(t.nomor || '')}</b></div>` : ''}
            ${!t.bank && t.nomor ? `<div class="baris"><span>Nomor</span><b>${esc(t.nomor)}</b></div>` : ''}
            ${t.atasNama ? `<div class="baris"><span>Atas nama</span><b>${esc(t.atasNama)}</b></div>` : ''}
            ${t.qris ? `<div style="margin-top:10px;text-align:center"><img src="${esc(t.qris)}" alt="QRIS" style="max-width:210px;width:100%;border-radius:12px"></div>` : ''}
            ${t.tautan ? `<div style="margin-top:10px"><a class="btn btn--ink" style="width:100%" href="${esc(t.tautan)}" target="_blank" rel="noopener">Buka tautan pembayaran</a></div>` : ''}
          </div>` : `
          <div class="notis notis--kuning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>
            <span>Warung belum mencantumkan nomor pembayaran. Bayar langsung di kasir, lalu tekan tombol di bawah supaya pemilik tahu pesanan Anda sudah dibayar.</span>
          </div>`}

        <button class="btn btn--wa" style="width:100%;margin-top:4px" id="btnPesan">Kirim pesanan &amp; saya sudah bayar</button>
        ${tersimpan ? `<div class="notis notis--hijau" style="margin-top:14px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          <span>Pesanan terakhir Anda dikirim ${new Date(tersimpan.waktu).toLocaleString('id-ID')} — total ${rupiah(tersimpan.total)}. Batas bayar 30 menit.</span>
        </div>` : ''}
      </div>`;

    elBayar.querySelectorAll('[data-tambah]').forEach((b) =>
      b.addEventListener('click', () => ubahJumlah(b.dataset.tambah, 1)));
    elBayar.querySelectorAll('[data-kurang]').forEach((b) =>
      b.addEventListener('click', () => ubahJumlah(b.dataset.kurang, -1)));
    document.getElementById('btnPesan').addEventListener('click', kirimPesanan);
  };

  const kirimPesanan = async () => {
    const nama = (document.getElementById('namaPelanggan').value || '').trim();
    if (!nama) { document.getElementById('namaPelanggan').focus(); return; }
    const item = Object.entries(keranjang).map(([nm, n]) => {
      const m = (data.menu || []).find((x) => x.nama === nm) || {};
      return { nama: nm, harga: Number(m.harga) || 0, jumlah: n };
    });
    const p = Pesanan.buat({
      warungId: id, item, nama,
      meja: document.getElementById('mejaPelanggan').value,
      catatan: document.getElementById('catatanPelanggan').value,
      // Tombol ini sekaligus menyatakan pelanggan sudah membayar, sehingga
      // pemilik mendengar notifikasi pembayaran (bukan pesanan biasa).
      klaimBayar: true,
    });

    const tombol = document.getElementById('btnPesan');
    tombol.disabled = true;
    tombol.textContent = 'Mengirim…';
    const hasil = await Pesanan.kirim(p);

    const simpan = bacaJSON(KUNCI_BAYAR, {});
    simpan[id] = { waktu: new Date().toISOString(), total: p.total, terkirim: hasil.terkirim };
    tulisJSON(KUNCI_BAYAR, simpan);

    keranjang = {};
    segarkanKeranjang();
    pindahTab('bayar');
    gambarBayar();

    elBayar.insertAdjacentHTML('afterbegin', hasil.terkirim ? `
      <div class="notis notis--hijau" style="margin-top:22px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        <span>Pesanan terkirim ke ${esc(data.warung.nama)}. Pemilik sudah menerima notifikasi.</span>
      </div>` : `
      <div class="notis notis--kuning" style="margin-top:22px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>
        <span>Pesanan tersimpan di HP ini, tetapi belum sampai ke pemilik (server belum tersambung). Tunjukkan pesanan ini ke kasir, atau hubungi warung lewat WhatsApp.</span>
      </div>`);
  };

  /* ── Susun seluruh halaman ────────────────────────────── */
  const gambar = (d) => {
    data = d;
    const w = d.warung || {};
    const daftarMenu = Array.isArray(d.menu) ? d.menu : [];

    // Bila berkas menu memuat alamat server, simpan di perangkat ini supaya
    // pesanan bisa langsung dikirim ke pemilik tanpa pelanggan mengisi apa pun.
    if (d.server) {
      try { localStorage.setItem('wgd-menu-server', String(d.server).replace(/\/+$/, '')); } catch (e) { /* abaikan */ }
    }

    document.title = 'Menu ' + w.nama + ' — Warung Go Digital';
    elNama.textContent = w.nama || 'Warung';
    elMeta.textContent = [w.kategori, w.alamat].filter(Boolean).join(' · ');

    const rating = Number(w.rating || 0);
    const bintang = rating ? '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating)) : '';
    elBadges.innerHTML = [
      rating ? `<span class="pill pill--amber">${bintang} ${rating.toFixed(1)}</span>` : '',
      w.ulasan ? `<span class="pill">${w.ulasan} ulasan Google</span>` : '',
      `<span class="pill">${daftarMenu.length} menu tersedia</span>`,
    ].filter(Boolean).join('');

    if (!daftarMenu.length) {
      pesanKosong('Menu belum diisi', 'Pemilik warung belum menambahkan daftar menu.');
      elNama.textContent = w.nama || 'Warung';
      return;
    }

    const waBase = w.wa ? 'https://wa.me/' + w.wa : '';
    const pesanUmum = encodeURIComponent('Halo ' + (w.pemilik || w.nama) + ', saya mau pesan dari menu ' + w.nama + '.');
    if (waBase) {
      btnPesan.href = waBase + '?text=' + pesanUmum;
      btnFloat.href = waBase + '?text=' + pesanUmum;
    } else {
      btnPesan.style.display = 'none';
      btnFloat.style.display = 'none';
    }
    btnMaps.href = w.placeId
      ? 'https://www.google.com/maps/place/?q=place_id:' + encodeURIComponent(w.placeId)
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([w.nama, w.alamat].filter(Boolean).join(' '));

    elTabbar.hidden = false;
    gambarMenu();
    gambarNilai();
    gambarBayar();
    pindahTab('menu');
  };

  elTabbar.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => pindahTab(b.dataset.tab)));
  document.getElementById('kbBayar').addEventListener('click', () => pindahTab('bayar'));

  (async () => {
    if (!id) return pesanKosong('Menu tidak ditemukan', 'Kode warung tidak ada pada tautan ini.');
    Pesanan.kirimAntrean().catch(() => {});
    try { return gambar(await muatBerkasTerbit()); } catch (e1) {
      try { return gambar(await muatServerSinkron()); } catch (e2) {
        try { return gambar(muatLokal()); } catch (e3) {
          return pesanKosong('Warung tidak ditemukan', 'Kode warung pada tautan tidak dikenali.');
        }
      }
    }
  })();
})();
