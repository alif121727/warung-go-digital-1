/* ══════════════════════════════════════════════════════════
   app.js — Kerangka aplikasi, router, Dasbor, modul Warung
   ══════════════════════════════════════════════════════════ */

const App = (() => {
  const MODUL = [];
  const daftar = {};
  const state = { view: 'dasbor', cari: '', peran: 'admin' };

  const register = (id, def) => {
    daftar[id] = def;
    MODUL.push({ id, ...def });
  };

  /* ── Navigasi ──────────────────────────────────────────── */
  const GRUP = [
    ['Utama', ['dasbor', 'warung', 'transaksi']],
    ['Reputasi', ['rating']],
    ['Pemasaran', ['katalog', 'promosi', 'foto']],
    ['Keuangan', ['laporan']],
  ];

  const bangunNav = () => {
    const nav = UI.q('#nav');
    let html = '';
    for (const [namaGrup, ids] of GRUP) {
      const items = ids.filter((id) => daftar[id]).map((id) => ({ id, ...daftar[id] }));
      if (!items.length) continue;
      html += `<div class="side__label">${namaGrup}</div>`;
      for (const m of items) {
        const badge = m.badge ? `<span class="navitem__badge">${m.badge()}</span>` : '';
        html += `<button class="navitem" data-go="${m.id}">${UI.icon(m.ic, 'navitem__ic')}<span>${m.label}</span>${badge}</button>`;
      }
    }
    nav.innerHTML = html;
    UI.qa('[data-go]', nav).forEach((b) =>
      b.addEventListener('click', () => { location.hash = '#/' + b.dataset.go; })
    );
  };

  const tandaiNav = () => {
    UI.qa('.navitem').forEach((b) => b.classList.toggle('on', b.dataset.go === state.view));
    const m = daftar[state.view];
    if (!m) return;
    UI.q('#crumb').textContent = m.grup ? m.grup + ' / ' + m.label : m.label;
    UI.q('#judul').textContent = m.judul || m.label;
    document.title = (m.judul || m.label) + ' — Warung Go Digital';
  };

  /* ── Render ────────────────────────────────────────────── */
  const gambar = () => {
    const m = daftar[state.view] || daftar.dasbor;
    state.view = daftar[state.view] ? state.view : 'dasbor';
    tandaiNav();
    const view = UI.q('#view');
    view.innerHTML = '';
    try {
      m.render(view, state);
      UI.tabelResponsif(view);
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="card"><div class="card__body">${UI.kosong({
        ikon: 'alert', judul: 'Terjadi kesalahan saat menggambar halaman',
        pesan: e.message, aksi: '<button class="btn btn--pri" onclick="location.reload()">Muat ulang</button>',
      })}</div></div>`;
    }
    view.scrollTop = 0;
    window.scrollTo(0, 0);
    UI.tutupDrawer();
    bangunNav();
    tandaiNav();
  };

  const pergi = (id) => { location.hash = '#/' + id; };

  /* ── Pencarian global ──────────────────────────────────── */
  const pasangCari = () => {
    const inp = UI.q('#cari');
    inp.addEventListener('input', () => {
      state.cari = inp.value.trim().toLowerCase();
      if (state.view !== 'dasbor' && daftar[state.view] && daftar[state.view].cari) {
        daftar[state.view].cari(state.cari);
      }
    });
  };

  /* ── Menu seluler ──────────────────────────────────────── */
  const pasangMenu = () => {
    const side = UI.q('.side');
    const scrim = UI.q('#scrim');
    UI.q('#burger').addEventListener('click', () => {
      side.classList.add('open'); scrim.classList.add('open');
    });
    scrim.addEventListener('click', () => {
      side.classList.remove('open'); scrim.classList.remove('open');
    });
    UI.q('#nav').addEventListener('click', () => {
      side.classList.remove('open'); scrim.classList.remove('open');
    });
  };

  /* ── Mulai ─────────────────────────────────────────────── */
  const mulai = () => {
    Store.load();
    bangunNav();

    UI.q('#btnKosongkan').addEventListener('click', async () => {
      const ya = await UI.konfirmasi({
        judul: 'Hapus semua data?',
        pesan: 'Seluruh data warung, transaksi, ulasan, dan lainnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
        labelYa: 'Ya, hapus semua', bahaya: true,
      });
      if (ya) { Store.kosongkan(); UI.toast('Semua data dihapus', 'ok'); gambar(); }
    });

    UI.q('#btnEkspor').addEventListener('click', () => {
      UI.unduh('warung-go-digital-data-' + new Date().toISOString().slice(0, 10) + '.json', Store.ekspor(), 'application/json');
      UI.toast('Cadangan diunduh', 'ok');
    });

    const inpImpor = UI.q('#fileImpor');
    UI.q('#btnImpor').addEventListener('click', () => inpImpor.click());
    inpImpor.addEventListener('change', () => {
      const f = inpImpor.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          Store.impor(r.result);
          UI.toast('Cadangan dipulihkan', 'ok');
          gambar();
        } catch (e) {
          UI.toast('Berkas tidak dikenali: ' + e.message, 'err');
        }
      };
      r.readAsText(f);
      inpImpor.value = '';
    });

    pasangCari();
    pasangMenu();

    const route = () => {
      const id = (location.hash.replace(/^#\/?/, '') || 'dasbor').split('?')[0];
      state.view = daftar[id] ? id : 'dasbor';
      gambar();
    };
    window.addEventListener('hashchange', route);
    route();
  };

  /* ═══════════════ MODUL: DASBOR ═══════════════ */
  register('dasbor', {
    label: 'Dasbor', judul: 'Ringkasan Usaha', ic: 'dashboard', grup: 'Utama',
    render(root) {
      const r = Store.ringkas();
      const tren = Store.trenPendapatan(6);
      const top = Store.topWarung(5);
      const trBaru = Store.all('transaksi').slice(0, 6);

      const peringatan = [];
      const besok = new Date(Date.now() + 7 * 864e5);
      for (const w of Store.all('warung')) {
        if (w.status !== 'aktif') continue;
        if (new Date(w.tglLanggananSampai) < besok)
          peringatan.push({ jenis: 'kuning', ikon: 'clock', teks: `<b>${UI.esc(w.nama)}</b> langganannya berakhir ${Store.tglID(w.tglLanggananSampai)}`, aksi: 'transaksi' });
      }
      const perluBalas = Store.where('rating', (x) => !x.balas).length;
      if (perluBalas)
        peringatan.push({ jenis: 'biru', ikon: 'star', teks: `<b>${perluBalas} ulasan</b> belum dibalas`, aksi: 'rating' });
      if (r.belumBayar)
        peringatan.push({ jenis: 'merah', ikon: 'wallet', teks: `<b>${r.belumBayar} transaksi</b> menunggu pembayaran`, aksi: 'transaksi' });

      // Belum ada data sama sekali: tampilkan ajakan mulai, bukan grafik kosong.
      if (!r.totalWarung) {
        root.innerHTML = `
          <div class="card">
            <div class="card__body">
              ${UI.kosong({
                ikon: 'store',
                judul: 'Belum ada warung terdaftar',
                pesan: 'Mulai dengan mendaftarkan warung pertama Anda. Data contoh juga tersedia bila ingin mencoba semua fitur lebih dulu.',
                aksi: `
                  <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
                    <button class="btn btn--pri" data-aksi="warung">${UI.icon('plus')} Daftarkan Warung</button>
                    <button class="btn" id="muatContoh">${UI.icon('refresh')} Muat data contoh</button>
                  </div>`,
              })}
            </div>
          </div>`;
        UI.qa('[data-aksi]', root).forEach((b) =>
          b.addEventListener('click', () => pergi(b.dataset.aksi))
        );
        const mc = UI.q('#muatContoh', root);
        if (mc)
          mc.addEventListener('click', () => {
            Store.muatContoh();
            UI.toast('Data contoh dimuat', 'ok');
            gambar();
          });
        return;
      }

      root.innerHTML = `
        <div class="grid grid--4" style="margin-bottom:15px">
          ${UI.stat({ ikon: 'wallet', warna: 'amber', label: 'Pendapatan ' + Store.labelPeriode(r.periode).split(' ')[0], nilai: Store.rupiah(r.pendapatanBulan), tren: r.pertumbuhan })}
          ${UI.stat({ ikon: 'store', warna: 'hijau', label: 'Warung Aktif', nilai: Store.angka(r.aktif) + '<span class="dim" style="font-size:15px"> / ' + r.totalWarung + '</span>', sub: r.pending ? `<span class="badge badge--kuning">${r.pending} menunggu verifikasi</span>` : 'Semua terverifikasi' })}
          ${UI.stat({ ikon: 'star', warna: 'ungu', label: 'Rating Google Maps', nilai: r.ratingRata.toFixed(2) + '<span class="dim" style="font-size:15px"> / 5</span>', sub: 'Rata-rata warung aktif' })}
          ${UI.stat({ ikon: 'book', warna: 'biru', label: 'Katalog & Promo Aktif', nilai: Store.angka(r.katalogAktif) + ' <span class="dim" style="font-size:15px">produk</span>', sub: r.promoAktif + ' promosi berjalan' })}
        </div>

        ${peringatan.length ? `
        <div class="card" style="margin-bottom:15px">
          <div class="card__head"><h3>Perlu Tindakan</h3><div class="card__spacer"></div><span class="badge badge--abu">${peringatan.length}</span></div>
          <div class="card__body" style="display:grid;gap:9px">
            ${peringatan.slice(0, 5).map((p) => `
              <div class="note note--${p.jenis}" style="align-items:center">
                ${UI.icon(p.ikon)}
                <span style="flex:1">${p.teks}</span>
                <button class="btn btn--sm" data-aksi="${p.aksi}">Buka</button>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <div class="grid grid--2-1" style="margin-bottom:15px">
          <div class="card">
            <div class="card__head">
              <h3>Tren Pendapatan 6 Bulan</h3>
              <div class="card__spacer"></div>
              <div class="legend">
                <span class="legend__it"><span class="legend__sw" style="background:var(--amber)"></span>Paket</span>
                <span class="legend__it"><span class="legend__sw" style="background:var(--leaf)"></span>Langganan</span>
              </div>
            </div>
            <div class="card__body">
              ${UI.grafikTren(tren)}
              <div class="kv" style="margin-top:14px">
                <span class="kv__k">Total 6 bulan</span>
                <span class="kv__v">${Store.rupiah(tren.reduce((s, t) => s + t.total, 0))}</span>
              </div>
              <div class="kv">
                <span class="kv__k">Rata-rata per bulan</span>
                <span class="kv__v">${Store.rupiah(tren.reduce((s, t) => s + t.total, 0) / tren.length)}</span>
              </div>
              <div class="kv">
                <span class="kv__k">Transaksi bulan ini</span>
                <span class="kv__v">${Store.angka(tren[tren.length - 1].jumlah)}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h3>Warung Teratas</h3></div>
            <div class="card__body" style="display:grid;gap:13px">
              ${top.map((w, i) => `
                <div>
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                    <span class="mono dim" style="font-size:11px;width:14px">${i + 1}</span>
                    ${UI.who(w.nama, w.kategori)}
                  </div>
                  <div style="display:flex;align-items:center;gap:9px">
                    <div class="bar" style="flex:1"><div class="bar__fill" style="width:${(w.pendapatan / Math.max(1, top[0].pendapatan)) * 100}%;background:linear-gradient(90deg,var(--amber),var(--leaf))"></div></div>
                    <span class="mono" style="font-size:11.5px;font-weight:600">${Store.rupiah(w.pendapatan).replace('Rp ', '')}</span>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <div class="grid grid--2-1">
          <div class="card">
            <div class="card__head">
              <h3>Transaksi Terbaru</h3>
              <div class="card__spacer"></div>
              <button class="btn btn--sm" data-aksi="transaksi">Lihat semua</button>
            </div>
            <div class="tablewrap" style="border:none;border-radius:0">
              <table class="tbl" style="min-width:520px">
                <thead><tr><th>Warung</th><th>Item</th><th>Tanggal</th><th class="num">Jumlah</th><th>Status</th></tr></thead>
                <tbody>
                  ${trBaru.map((t) => {
                    const w = Store.find('warung', t.warungId);
                    return `<tr>
                      <td>${UI.esc(w ? w.nama : '—')}</td>
                      <td class="muted">${UI.esc(t.item)}</td>
                      <td class="mono dim nowrap">${Store.tglID(t.tgl)}</td>
                      <td class="num mono">${Store.rupiah(t.jumlah)}</td>
                      <td>${UI.lencanaStatus(t.status)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h3>Aktivitas</h3></div>
            <div class="card__body" style="display:grid;gap:12px;max-height:330px;overflow-y:auto">
              ${Store.load().log.slice(0, 8).map((l) => `
                <div style="display:flex;gap:10px;font-size:12.5px">
                  <span class="dot dot--hijau" style="margin-top:6px"></span>
                  <div>
                    <div style="font-weight:600">${UI.esc(l.aksi)}</div>
                    <div class="dim">${UI.esc(l.detail || '')} · ${Store.tglID(l.tgl, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>`;

      UI.qa('[data-aksi]', root).forEach((b) =>
        b.addEventListener('click', () => pergi(b.dataset.aksi))
      );
    },
  });

  /* ═══════════════ MODUL: WARUNG ═══════════════ */
  let saringWarung = { status: '', paket: '', cari: '' };

  register('warung', {
    label: 'Warung', judul: 'Data Warung Mitra', ic: 'store', grup: 'Utama',
    badge: () => Store.all('warung').length,
    cari: (v) => { saringWarung.cari = v; if (state.view === 'warung') gambar(); },
    render(root) {
      const daftarW = Store.all('warung').filter((w) => {
        if (saringWarung.status && w.status !== saringWarung.status) return false;
        if (saringWarung.paket && w.paket !== saringWarung.paket) return false;
        if (saringWarung.cari) {
          const s = (w.nama + ' ' + w.pemilik + ' ' + w.alamat + ' ' + w.wa).toLowerCase();
          if (!s.includes(saringWarung.cari)) return false;
        }
        return true;
      });

      root.innerHTML = `
        <div class="sect">
          <div>
            <h2>${daftarW.length} warung terdaftar</h2>
            <p class="muted" style="margin:2px 0 0;font-size:12.5px">Kelola profil, paket langganan, dan menu digital mitra.</p>
          </div>
          <div class="sect__spacer"></div>
          <button class="btn btn--pri" id="tambahWarung">${UI.icon('plus')} Daftarkan Warung</button>
        </div>

        <div class="toolbar">
          <div class="search" style="width:230px">
            ${UI.icon('search')}
            <input id="cariWarung" placeholder="Cari nama, pemilik, alamat..." value="${UI.esc(saringWarung.cari)}">
          </div>
          <div class="chips" id="chipStatus">
            ${['', 'aktif', 'pending', 'nonaktif'].map((s) => `
              <button class="chip ${saringWarung.status === s ? 'on' : ''}" data-status="${s}">${s ? s[0].toUpperCase() + s.slice(1) : 'Semua status'}</button>`).join('')}
          </div>
          <div class="toolbar__spacer"></div>
          <select class="sel" id="fPaket" style="width:auto">
            <option value="">Semua paket</option>
            ${['Gratis', 'Hemat', 'Plus'].map((p) => `<option ${saringWarung.paket === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>

        <div class="tablewrap">
          <table class="tbl">
            <thead>
              <tr><th>Warung</th><th>Paket</th><th>Kategori</th><th class="num">Rating Maps</th><th class="num">Menu</th><th>Langganan s/d</th><th>Status</th><th class="aksi">Aksi</th></tr>
            </thead>
            <tbody>
              ${daftarW.length ? daftarW.map((w) => {
                const lewat = new Date(w.tglLanggananSampai) < new Date();
                return `<tr class="clickable" data-lihat="${w.id}">
                  <td>${UI.who(w.nama, w.pemilik + ' · ' + w.wa)}</td>
                  <td><span class="badge badge--${w.paket === 'Plus' ? 'ungu' : w.paket === 'Hemat' ? 'biru' : 'abu'}">${w.paket}</span></td>
                  <td class="muted">${UI.esc(w.kategori)}</td>
                  <td class="num"><span class="mono" style="font-weight:600">${w.ratingMaps.toFixed(1)}</span> <span class="dim">(${w.jumlahUlasan})</span></td>
                  <td class="num mono">${w.menu.length}</td>
                  <td class="mono nowrap ${lewat && w.paket !== 'Gratis' ? '' : 'dim'}" ${lewat && w.paket !== 'Gratis' ? 'style="color:var(--merah);font-weight:600"' : ''}>${Store.tglID(w.tglLanggananSampai)}</td>
                  <td>${UI.lencanaStatus(w.status)}</td>
                  <td class="aksi">
                    <button class="btn btn--sm" data-qr="${w.id}" title="QR menu">${UI.icon('qr')}</button>
                    <button class="btn btn--sm" data-ubah="${w.id}" title="Ubah">${UI.icon('edit')}</button>
                    <button class="btn btn--sm btn--dgr" data-hapus="${w.id}" title="Hapus">${UI.icon('trash')}</button>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="8">${UI.kosong({ ikon: 'store', judul: 'Tidak ada warung cocok', pesan: 'Ubah kata kunci atau saringan Anda.' })}</td></tr>`}
            </tbody>
          </table>
        </div>`;

      const cariInp = UI.q('#cariWarung', root);
      cariInp.addEventListener('input', () => {
        saringWarung.cari = cariInp.value.trim().toLowerCase();
        const pos = cariInp.selectionStart;
        gambar();
        const baru = UI.q('#cariWarung');
        if (baru) { baru.focus(); baru.setSelectionRange(pos, pos); }
      });

      UI.qa('#chipStatus .chip', root).forEach((c) =>
        c.addEventListener('click', () => { saringWarung.status = c.dataset.status; gambar(); })
      );
      UI.q('#fPaket', root).addEventListener('change', (e) => { saringWarung.paket = e.target.value; gambar(); });

      UI.q('#tambahWarung', root).addEventListener('click', () => formWarung(null));
      UI.qa('[data-lihat]', root).forEach((tr) =>
        tr.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          detailWarung(tr.dataset.lihat);
        })
      );
      UI.qa('[data-ubah]', root).forEach((b) => b.addEventListener('click', () => formWarung(b.dataset.ubah)));
      UI.qa('[data-hapus]', root).forEach((b) => b.addEventListener('click', async () => {
        const w = Store.find('warung', b.dataset.hapus);
        const ya = await UI.konfirmasi({
          judul: 'Hapus warung?',
          pesan: `<b>${UI.esc(w.nama)}</b> beserta transaksi dan ulasannya akan dihapus permanen.`,
          labelYa: 'Ya, hapus', bahaya: true,
        });
        if (!ya) return;
        Store.remove('warung', w.id);
        Store.where('transaksi', (t) => t.warungId === w.id).forEach((t) => Store.remove('transaksi', t.id));
        UI.toast('Warung dihapus', 'ok');
        gambar();
      }));
      UI.qa('[data-qr]', root).forEach((b) => b.addEventListener('click', () => qrMenu(b.dataset.qr)));
    },
  });

  /* ── Formulir warung ───────────────────────────────────── */
  const formWarung = (id) => {
    const w = id ? Store.find('warung', id) : null;
    const nilai = w || {
      nama: '', pemilik: '', wa: '628', alamat: '', kategori: 'Makanan',
      paket: 'Hemat', lat: -7.7162, lng: 110.3554, placeId: '', status: 'pending',
    };

    UI.modal({
      judul: w ? 'Ubah Warung' : 'Daftarkan Warung Baru',
      isi: `
        <div class="form-grid">
          <div class="field"><label>Nama warung</label><input class="inp" id="w-nama" value="${UI.esc(nilai.nama)}" placeholder="Warung Bu Sari"></div>
          <div class="field"><label>Nama pemilik</label><input class="inp" id="w-pemilik" value="${UI.esc(nilai.pemilik)}" placeholder="Sari Wulandari"></div>
          <div class="field"><label>Nomor WhatsApp</label><input class="inp" id="w-wa" value="${UI.esc(nilai.wa)}" placeholder="6281234567890"></div>
          <div class="field"><label>Kategori</label>
            <select class="sel" id="w-kategori">${['Makanan', 'Minuman', 'Sembako', 'Jasa', 'Lainnya'].map((k) => `<option ${nilai.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
          </div>
          <div class="field full"><label>Alamat</label><input class="inp" id="w-alamat" value="${UI.esc(nilai.alamat)}" placeholder="Jl. Melati No. 12, Sleman"></div>
          <div class="field"><label>Paket</label>
            <select class="sel" id="w-paket">
              <option value="Gratis" ${nilai.paket === 'Gratis' ? 'selected' : ''}>Gratis — Rp 0</option>
              <option value="Hemat" ${nilai.paket === 'Hemat' ? 'selected' : ''}>Hemat — Rp 35.000</option>
              <option value="Plus" ${nilai.paket === 'Plus' ? 'selected' : ''}>Plus — Rp 100.000</option>
            </select>
          </div>
          <div class="field"><label>Status</label>
            <select class="sel" id="w-status">
              <option value="aktif" ${nilai.status === 'aktif' ? 'selected' : ''}>Aktif</option>
              <option value="pending" ${nilai.status === 'pending' ? 'selected' : ''}>Menunggu verifikasi</option>
              <option value="nonaktif" ${nilai.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
            </select>
          </div>
          <div class="field"><label>Place ID Google Maps</label><input class="inp" id="w-place" value="${UI.esc(nilai.placeId)}" placeholder="ChIJ..."></div>
          <div class="field"><label>Koordinat</label><input class="inp" id="w-koord" value="${nilai.lat}, ${nilai.lng}" placeholder="-7.7162, 110.3554"></div>
        </div>
        <div class="note note--info" style="margin-top:14px">${UI.icon('info')}
          <span>Place ID dipakai untuk membuat tautan ulasan Google Maps yang langsung membuka formulir ulasan warung ini. Ambil dari Google Place ID Finder.</span>
        </div>`,
      kaki: `
        <button class="btn" data-tutup>Batal</button>
        <div class="spacer"></div>
        <button class="btn btn--pri" id="simpanWarung">${UI.icon('save')} ${w ? 'Simpan Perubahan' : 'Daftarkan'}</button>`,
      onBuka: (box) => {
        UI.q('#simpanWarung', box).addEventListener('click', () => {
          const v = (sel) => UI.q(sel, box).value.trim();
          const nama = v('#w-nama');
          if (!nama) return UI.toast('Nama warung wajib diisi', 'err');
          const wa = v('#w-wa').replace(/\D/g, '');
          const koord = v('#w-koord').split(',').map((x) => parseFloat(x.trim()));
          const data = {
            nama, pemilik: v('#w-pemilik'), wa, alamat: v('#w-alamat'),
            kategori: v('#w-kategori'), paket: v('#w-paket'), status: v('#w-status'),
            placeId: v('#w-place'),
            lat: isNaN(koord[0]) ? -7.7162 : koord[0],
            lng: isNaN(koord[1]) ? 110.3554 : koord[1],
          };
          if (w) {
            Store.update('warung', w.id, data);
            UI.toast('Perubahan disimpan', 'ok');
          } else {
            Store.add('warung', {
              ...data, ratingMaps: 0, jumlahUlasan: 0, ratingInternal: 0,
              tglDaftar: new Date().toISOString(),
              tglLanggananSampai: new Date(Date.now() + 30 * 864e5).toISOString(),
              menu: [], galeri: [],
              kodeQR: 'WGD-' + String(Store.all('warung').length + 1).padStart(3, '0'),
            });
            UI.toast('Warung didaftarkan', 'ok');
          }
          UI.tutupModal();
          gambar();
        });
      },
    });
  };

  /* ── Detail warung ─────────────────────────────────────── */
  const detailWarung = (id) => {
    const w = Store.find('warung', id);
    if (!w) return;
    const tr = Store.where('transaksi', (t) => t.warungId === id);
    const pendapatan = tr.filter((t) => t.status === 'lunas').reduce((s, t) => s + t.jumlah, 0);
    const ulasan = Store.where('rating', (r) => r.warungId === id);
    const urlUlasan = w.placeId
      ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(w.placeId)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.nama + ' ' + w.alamat)}`;

    UI.drawer({
      judul: w.nama,
      isi: `
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
          <div class="who__ava" style="width:56px;height:56px;font-size:19px;background:${UI.warnaDari(w.nama)}">${UI.esc(UI.inisial(w.nama))}</div>
          <div>
            <div style="font-family:var(--f-display);font-size:19px;font-weight:700">${UI.esc(w.nama)}</div>
            <div class="muted" style="font-size:12.5px">${UI.esc(w.pemilik)} · ${UI.esc(w.kategori)}</div>
            <div style="margin-top:6px">${UI.lencanaStatus(w.status)} <span class="badge badge--biru">${w.paket}</span></div>
          </div>
        </div>

        <div class="grid grid--2" style="gap:10px;margin-bottom:18px">
          <div class="stat" style="padding:13px 14px"><div class="stat__label">Pendapatan</div><div class="stat__val" style="font-size:18px">${Store.rupiah(pendapatan)}</div></div>
          <div class="stat" style="padding:13px 14px"><div class="stat__label">Rating Maps</div><div class="stat__val" style="font-size:18px">${w.ratingMaps.toFixed(1)} ${UI.bintang(w.ratingMaps)}</div></div>
        </div>

        <h4 style="font-size:13px;margin-bottom:10px">Informasi</h4>
        <div class="dl" style="margin-bottom:20px">
          <dt>WhatsApp</dt><dd class="mono">${UI.esc(w.wa)}</dd>
          <dt>Alamat</dt><dd style="font-weight:500;text-align:right">${UI.esc(w.alamat)}</dd>
          <dt>Place ID</dt><dd class="mono" style="font-size:11.5px">${UI.esc(w.placeId || '—')}</dd>
          <dt>Terdaftar</dt><dd>${Store.tglID(w.tglDaftar)}</dd>
          <dt>Langganan sampai</dt><dd>${Store.tglID(w.tglLanggananSampai)}</dd>
          <dt>Kode QR</dt><dd class="mono">${UI.esc(w.kodeQR)}</dd>
        </div>

        <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px">
          <h4 style="font-size:13px">Menu (${w.menu.length})</h4>
          <div style="flex:1"></div>
          <button class="btn btn--sm" id="tambahMenu">${UI.icon('plus')} Tambah</button>
        </div>
        <div id="daftarMenu" style="margin-bottom:20px">
          ${w.menu.length ? w.menu.map((m) => `
            <div class="kv">
              <span class="kv__k">${UI.esc(m.nama)} <span class="dim">· ${UI.esc(m.kategori)}</span></span>
              <span style="display:flex;align-items:center;gap:8px">
                <span class="kv__v">${Store.rupiah(m.harga)}</span>
                <button class="btn btn--sm btn--dgr" data-hapusmenu="${m.id}">${UI.icon('trash')}</button>
              </span>
            </div>`).join('') : '<p class="dim" style="font-size:12.5px">Belum ada menu.</p>'}
        </div>

        <h4 style="font-size:13px;margin-bottom:10px">Ulasan Terbaru</h4>
        <div style="display:grid;gap:11px;margin-bottom:20px">
          ${ulasan.slice(0, 4).map((u) => `
            <div style="padding:11px 13px;background:#faf8f3;border-radius:var(--r-sm)">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                ${UI.bintang(u.skor)}
                <span class="badge badge--${u.sumber === 'maps' ? 'biru' : 'abu'}">${u.sumber === 'maps' ? 'Google Maps' : 'Internal'}</span>
                <span class="dim mono" style="font-size:11px;margin-left:auto">${Store.tglID(u.tgl)}</span>
              </div>
              <p style="margin:0;font-size:12.5px">${UI.esc(u.ulasan)}</p>
            </div>`).join('') || '<p class="dim" style="font-size:12.5px">Belum ada ulasan.</p>'}
        </div>

        <h4 style="font-size:13px;margin-bottom:10px">Tautan Cepat</h4>
        <div style="display:grid;gap:8px">
          <button class="btn" id="bukaMaps">${UI.icon('maps')} Buka di Google Maps</button>
          <a class="btn btn--wa" href="https://wa.me/${UI.esc(w.wa)}?text=${encodeURIComponent('Halo ' + w.pemilik + ', dari Warung Go Digital.')}" target="_blank" rel="noopener">${UI.icon('whatsapp')} Chat WhatsApp</a>
          <button class="btn" id="qrMenuBtn">${UI.icon('qr')} QR Menu Digital</button>
        </div>`,
      onBuka: (d) => {
        UI.q('#bukaMaps', d).addEventListener('click', () => window.open(urlUlasan, '_blank', 'noopener'));
        UI.q('#qrMenuBtn', d).addEventListener('click', () => qrMenu(w.id));
        UI.q('#tambahMenu', d).addEventListener('click', () => {
          UI.modal({
            judul: 'Tambah Menu',
            isi: `<div class="form-grid">
              <div class="field full"><label>Nama menu</label><input class="inp" id="m-nama" placeholder="Nasi Goreng Spesial"></div>
              <div class="field"><label>Harga (Rp)</label><input class="inp" id="m-harga" type="number" value="15000"></div>
              <div class="field"><label>Kategori</label><select class="sel" id="m-kat">${['Makanan', 'Minuman', 'Tambahan'].map((k) => `<option>${k}</option>`).join('')}</select></div>
            </div>`,
            kaki: `<button class="btn" data-tutup>Batal</button><div class="spacer"></div><button class="btn btn--pri" id="m-simpan">Tambah</button>`,
            onBuka: (box) => {
              UI.q('#m-simpan', box).addEventListener('click', () => {
                const nama = UI.q('#m-nama', box).value.trim();
                if (!nama) return UI.toast('Nama menu wajib diisi', 'err');
                const menu = [...w.menu, { id: Store.uid('mn'), nama, harga: +UI.q('#m-harga', box).value || 0, kategori: UI.q('#m-kat', box).value, foto: null }];
                Store.update('warung', w.id, { menu });
                UI.tutupModal();
                UI.toast('Menu ditambahkan', 'ok');
                detailWarung(w.id);
              });
            },
          });
        });
        UI.qa('[data-hapusmenu]', d).forEach((b) => b.addEventListener('click', () => {
          Store.update('warung', w.id, { menu: w.menu.filter((m) => m.id !== b.dataset.hapusmenu) });
          UI.toast('Menu dihapus', 'ok');
          detailWarung(w.id);
        }));
      },
    });
  };

  /* ── Situs publik & berkas menu terbit ─────────────────────
     Di dalam APK, halaman dimuat dari https://localhost. Bila QR dibangun
     dari location.origin, kode yang dicetak menunjuk ke alamat itu dan
     TIDAK BISA dibuka HP pelanggan. Jadi alamat situs publik dipisahkan
     dan bisa ditimpa lewat <meta name="wgd-situs-publik">. */
  const SITUS_BAWAAN = 'https://alif121727.github.io/warung-go-digital-1/';
  const situsPublik = () => {
    const meta = document.querySelector('meta[name="wgd-situs-publik"]');
    const nilai = (meta && meta.content.trim()) || SITUS_BAWAAN;
    return nilai.endsWith('/') ? nilai : nilai + '/';
  };

  const urlMenu = (w) => situsPublik() + 'app/menu.html?w=' + encodeURIComponent(w.id);

  /* Isi berkas menu terbit. Memuat nama, WA, dan menu — tanpa data pribadi
     lain (tanpa transaksi, tanpa catatan harian). */
  const berkasMenu = (w) => {
    const foto = {};
    for (const f of Store.where('foto', (x) => x.warungId === w.id && x.dataUrl)) {
      const kunci = f.nama.toLowerCase().replace(/\s*—\s*foto\s*\d+$/, '').trim();
      if (!foto[kunci]) foto[kunci] = f.dataUrl;
    }
    return {
      wgd: 2,
      jenis: 'menu-publik',
      dibuat: new Date().toISOString(),
      warung: {
        id: w.id, nama: w.nama, pemilik: w.pemilik, wa: w.wa, alamat: w.alamat,
        kategori: w.kategori, placeId: w.placeId,
        rating: w.ratingMaps, ulasan: w.jumlahUlasan,
      },
      menu: w.menu.map((m) => ({
        nama: m.nama, harga: m.harga, kategori: m.kategori, ket: m.ket || '',
        foto: foto[m.nama.toLowerCase().trim()] || null,
      })),
    };
  };

  const namaBerkasMenu = (w) => 'menu-' + w.id + '.json';

  /* ── QR menu digital ───────────────────────────────────── */
  const qrMenu = (id) => {
    const w = Store.find('warung', id);
    if (!w) return;
    const url = urlMenu(w);

    UI.modal({
      judul: 'QR Menu Digital — ' + w.nama,
      lebar: true,
      isi: `
        <div class="grid grid--2" style="align-items:start">
          <div style="text-align:center">
            <div class="qrbox" style="display:block;padding:16px">
              <canvas id="qrMenuCanvas"></canvas>
            </div>
            <p class="dim" style="font-size:11.5px;margin:10px 0 0">Pindai dengan kamera ponsel</p>
          </div>
          <div>
            <div class="field" style="margin-bottom:12px">
              <label>Tautan menu</label>
              <input class="inp mono" id="urlMenu" value="${UI.esc(url)}" readonly style="font-size:11.5px">
            </div>
            <div class="note note--ok" style="margin-bottom:12px">${UI.icon('check')}
              <span>QR ini bisa dipindai sungguhan. Cetak dan tempel di meja atau depan warung.</span>
            </div>
            <div class="note note--info" style="margin-bottom:12px">${UI.icon('info')}
              <span>Supaya menu terbuka di HP <b>pelanggan</b> (bukan hanya HP ini), tekan
              <b>Terbitkan menu</b> lalu unggah berkasnya ke folder <span class="mono">menu/</span> situs.
              Petunjuk lengkap ada di <span class="mono">PANDUAN-MENU-PUBLIK.md</span>.</span>
            </div>
            <div style="display:grid;gap:8px">
              <button class="btn" id="unduhQR">${UI.icon('download')} Unduh QR (PNG)</button>
              <button class="btn" id="salinURL">${UI.icon('link')} Salin tautan menu</button>
              <button class="btn" id="cetakKartu">${UI.icon('printer')} Cetak kartu meja</button>
              <button class="btn btn--pri" id="terbitMenu">${UI.icon('upload')} Terbitkan menu (agar bisa dibuka pelanggan)</button>
            </div>
            <p class="dim" style="font-size:11.5px;margin-top:12px">Halaman menu: <span class="mono">menu.html</span> — bisa dibuka tanpa aplikasi.</p>
          </div>
        </div>`,
      onBuka: (box) => {
        const canvas = UI.q('#qrMenuCanvas', box);
        try {
          QR.draw(canvas, url, { size: 260, ecc: 'M', dark: '#0d1a12' });
        } catch (e) {
          UI.q('#qrMenuCanvas', box).outerHTML = `<p class="badge badge--merah">QR gagal dibuat: ${UI.esc(e.message)}</p>`;
        }
        UI.q('#unduhQR', box).addEventListener('click', () => {
          canvas.toBlob((b) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = 'qr-menu-' + w.nama.toLowerCase().replace(/\s+/g, '-') + '.png';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1500);
            UI.toast('QR diunduh', 'ok');
          });
        });
        UI.q('#salinURL', box).addEventListener('click', () => UI.salin(url, 'Tautan menu disalin'));
        UI.q('#cetakKartu', box).addEventListener('click', () => cetakKartuQR(w, canvas.toDataURL()));
        UI.q('#terbitMenu', box).addEventListener('click', () => terbitkanMenu(w));
      },
    });
  };

  /* Unduh berkas menu terbit + salin jalur unggah. Pemilik mengunggah berkas
     ini ke folder `menu/` situs; setelah itu QR bisa dibuka HP mana pun. */
  const terbitkanMenu = (w) => {
    const isi = JSON.stringify(berkasMenu(w), null, 2);
    UI.unduh(namaBerkasMenu(w), isi, 'application/json');

    const tujuan = situsPublik() + 'menu/' + namaBerkasMenu(w);
    UI.modal({
      judul: 'Terbitkan menu — ' + w.nama,
      isi: `
        <div class="note note--ok" style="margin-bottom:12px">${UI.icon('check')}
          <span>Berkas <span class="mono">${UI.esc(namaBerkasMenu(w))}</span> sudah diunduh.</span>
        </div>
        <p style="margin:0 0 10px;font-size:13px">Agar menu terbuka di HP pelanggan, unggah berkas itu
        ke folder <span class="mono">menu/</span> di situs, dengan nama <b>${UI.esc(namaBerkasMenu(w))}</b>.</p>
        <div class="field" style="margin-bottom:12px">
          <label>Alamat berkas setelah diunggah</label>
          <input class="inp mono" readonly value="${UI.esc(tujuan)}" style="font-size:11.5px">
        </div>
        <div class="note note--info">${UI.icon('info')}
          <span>Bila situs memakai GitHub, cukup unggah berkas ini ke folder
          <span class="mono">warung-go-digital/menu/</span> di repositori. Langkah lengkap ada di
          <span class="mono">PANDUAN-MENU-PUBLIK.md</span>.</span>
        </div>`,
      onBuka: (box) => {
        const inp = UI.q('input', box);
        const b = document.createElement('button');
        b.className = 'btn';
        b.style.marginTop = '12px';
        b.innerHTML = UI.icon('link') + ' Salin alamat berkas';
        b.addEventListener('click', () => UI.salin(tujuan, 'Alamat berkas disalin'));
        box.querySelector('.note--info').after(b);
      },
    });
  };

  const cetakKartuQR = (w, dataUrl) => {
    const win = window.open('', '_blank');
    if (!win) return UI.toast('Popup diblokir browser', 'err');
    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
      <title>Kartu QR — ${UI.esc(w.nama)}</title>
      <style>
        @page { size: A5; margin: 12mm; }
        body { font-family: system-ui, sans-serif; margin: 0; display: grid; place-items: center; min-height: 100vh; }
        .kartu { border: 3px solid #0d1a12; border-radius: 22px; padding: 30px 34px; text-align: center; max-width: 420px; }
        .brand { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #b3730a; font-weight: 700; }
        h1 { font-size: 27px; margin: 9px 0 4px; letter-spacing: -.02em; }
        .sub { color: #4a574f; font-size: 13px; margin-bottom: 20px; }
        img { width: 230px; height: 230px; }
        .ajak { font-size: 15px; font-weight: 700; margin-top: 18px; }
        .ket { font-size: 12px; color: #4a574f; margin-top: 5px; }
        .foot { margin-top: 20px; padding-top: 14px; border-top: 1px dashed #ccc; font-size: 11px; color: #666; }
      </style></head><body>
      <div class="kartu">
        <div class="brand">Warung Go Digital</div>
        <h1>${UI.esc(w.nama)}</h1>
        <div class="sub">${UI.esc(w.kategori)} · ${UI.esc(w.alamat)}</div>
        <img src="${dataUrl}" alt="QR menu">
        <div class="ajak">Pindai untuk lihat menu</div>
        <div class="ket">Buka kamera ponsel, arahkan ke kode di atas.</div>
        <div class="foot">Pesan langsung via WhatsApp · ${UI.esc(w.wa)}</div>
      </div>
      <script>setTimeout(()=>window.print(),400)<\/script>
      </body></html>`);
    win.document.close();
  };

  return { register, mulai, gambar, pergi, state, MODUL };
})();

document.addEventListener('DOMContentLoaded', App.mulai);
