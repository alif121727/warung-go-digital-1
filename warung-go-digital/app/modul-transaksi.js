/* ══════════════════════════════════════════════════════════
   modul-transaksi.js — Transaksi & Pembayaran
   Tagihan paket sekali bayar dan langganan bulanan, pencatatan
   pembayaran (QRIS, transfer, tunai), serta kuitansi.
   ══════════════════════════════════════════════════════════ */

(() => {
  let saring = { status: '', jenis: '', periode: '', cari: '' };

  App.register('transaksi', {
    label: 'Transaksi', judul: 'Transaksi & Pembayaran', ic: 'wallet', grup: 'Utama',
    badge: () => Store.all('transaksi').length,
    cari: (v) => { saring.cari = v; if (App.state.view === 'transaksi') App.gambar(); },

    render(root) {
      const semua = Store.all('transaksi').sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
      const periode = Store.daftarPeriode();

      const data = semua.filter((t) => {
        if (saring.status && t.status !== saring.status) return false;
        if (saring.jenis && t.jenis !== saring.jenis) return false;
        if (saring.periode && Store.periodeDari(t.tgl) !== saring.periode) return false;
        if (saring.cari) {
          const w = Store.find('warung', t.warungId);
          const s = (t.item + ' ' + t.ref + ' ' + (w ? w.nama : '')).toLowerCase();
          if (!s.includes(saring.cari)) return false;
        }
        return true;
      });

      const lunas = data.filter((t) => t.status === 'lunas');
      const totalLunas = lunas.reduce((s, t) => s + t.jumlah, 0);
      const pending = data.filter((t) => t.status === 'pending');
      const totalPending = pending.reduce((s, t) => s + t.jumlah, 0);
      const metode = Store.perMetode(saring.periode || null);

      root.innerHTML = `
        <div class="grid grid--4" style="margin-bottom:15px">
          ${UI.stat({ ikon: 'wallet', warna: 'hijau', label: 'Diterima', nilai: Store.rupiah(totalLunas), sub: lunas.length + ' transaksi lunas' })}
          ${UI.stat({ ikon: 'clock', warna: 'kuning', label: 'Menunggu Bayar', nilai: Store.rupiah(totalPending), sub: pending.length + ' tagihan terbuka' })}
          ${UI.stat({ ikon: 'chart', warna: 'biru', label: 'Rata-rata Transaksi', nilai: Store.rupiah(lunas.length ? totalLunas / lunas.length : 0), sub: 'Dari transaksi lunas' })}
          ${UI.stat({ ikon: 'store', warna: 'ungu', label: 'Warung Berlangganan', nilai: Store.angka(Store.ringkas().langgananAktif), sub: 'Langganan masih aktif' })}
        </div>

        <div class="grid grid--2-1" style="margin-bottom:15px">
          <div class="card">
            <div class="card__head"><h3>Metode Pembayaran</h3><div class="card__spacer"></div><span class="dim mono" style="font-size:11px">${saring.periode ? Store.labelPeriode(saring.periode) : 'Semua periode'}</span></div>
            <div class="card__body">
              ${metode.length ? `
                <div class="stack" style="margin-bottom:14px">
                  ${metode.map((m, i) => {
                    const total = metode.reduce((s, x) => s + x.jumlah, 0);
                    const warna = ['var(--amber)', 'var(--leaf)', 'var(--biru)', 'var(--ungu)'][i % 4];
                    return `<div class="stack__seg" style="width:${(m.jumlah / total) * 100}%;background:${warna}" title="${m.metode}: ${Store.rupiah(m.jumlah)}"></div>`;
                  }).join('')}
                </div>
                ${metode.map((m, i) => {
                  const total = metode.reduce((s, x) => s + x.jumlah, 0);
                  const warna = ['var(--amber)', 'var(--leaf)', 'var(--biru)', 'var(--ungu)'][i % 4];
                  return `<div class="kv">
                    <span class="kv__k" style="display:flex;align-items:center;gap:8px">
                      <span class="dot" style="background:${warna}"></span>${UI.esc(m.metode)}
                    </span>
                    <span class="kv__v">${Store.rupiah(m.jumlah)} <span class="dim">(${((m.jumlah / total) * 100).toFixed(0)}%)</span></span>
                  </div>`;
                }).join('')}` : UI.kosong({ ikon: 'wallet', judul: 'Belum ada pembayaran', pesan: 'Pembayaran yang tercatat akan tampil di sini.' })}
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h3>Tagihan Terbuka</h3><div class="card__spacer"></div>${pending.length ? `<span class="badge badge--kuning">${pending.length}</span>` : ''}</div>
            <div class="card__body" style="display:grid;gap:11px;max-height:290px;overflow-y:auto">
              ${pending.length ? pending.slice(0, 6).map((t) => {
                const w = Store.find('warung', t.warungId);
                return `<div style="display:flex;align-items:center;gap:11px">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(w ? w.nama : '—')}</div>
                    <div class="dim" style="font-size:11.5px">${UI.esc(t.item)}</div>
                  </div>
                  <div style="text-align:right">
                    <div class="mono" style="font-weight:600;font-size:12.5px">${Store.rupiah(t.jumlah)}</div>
                    <button class="btn btn--sm btn--wa" data-lunasi="${t.id}" style="margin-top:3px">Tandai Lunas</button>
                  </div>
                </div>`;
              }).join('') : `<p class="dim" style="font-size:12.5px;margin:0">Semua tagihan sudah lunas.</p>`}
            </div>
          </div>
        </div>

        <div class="sect">
          <div>
            <h2>Riwayat Transaksi</h2>
            <p class="muted" style="margin:2px 0 0;font-size:12.5px">${data.length} transaksi · total ${Store.rupiah(data.reduce((s, t) => s + t.jumlah, 0))}</p>
          </div>
          <div class="sect__spacer"></div>
          <button class="btn" id="unduhCSV">${UI.icon('download')} Ekspor CSV</button>
          <button class="btn btn--pri" id="catat">${UI.icon('plus')} Catat Transaksi</button>
        </div>

        <div class="toolbar">
          <div class="search" style="width:220px">${UI.icon('search')}<input id="cariTr" placeholder="Cari item, referensi..." value="${UI.esc(saring.cari)}"></div>
          <div class="chips">
            ${[['', 'Semua'], ['lunas', 'Lunas'], ['pending', 'Menunggu'], ['batal', 'Batal']].map(([v, l]) =>
              `<button class="chip ${saring.status === v ? 'on' : ''}" data-st="${v}">${l}</button>`).join('')}
          </div>
          <div class="toolbar__spacer"></div>
          <select class="sel" id="fJenis" style="width:auto">
            <option value="">Semua jenis</option>
            <option value="paket" ${saring.jenis === 'paket' ? 'selected' : ''}>Paket (sekali bayar)</option>
            <option value="langganan" ${saring.jenis === 'langganan' ? 'selected' : ''}>Langganan bulanan</option>
          </select>
          <select class="sel" id="fPeriode" style="width:auto">
            <option value="">Semua periode</option>
            ${periode.map((p) => `<option value="${p}" ${saring.periode === p ? 'selected' : ''}>${Store.labelPeriode(p)}</option>`).join('')}
          </select>
        </div>

        <div class="tablewrap">
          <table class="tbl">
            <thead><tr><th>Referensi</th><th>Warung</th><th>Item</th><th>Tanggal</th><th>Metode</th><th class="num">Jumlah</th><th>Status</th><th class="aksi">Aksi</th></tr></thead>
            <tbody>
              ${data.length ? data.map((t) => {
                const w = Store.find('warung', t.warungId);
                return `<tr>
                  <td class="mono" style="font-size:11.5px">${UI.esc(t.ref)}</td>
                  <td>${w ? UI.who(w.nama, w.paket + ' · ' + w.kategori) : '—'}</td>
                  <td><span class="badge badge--${t.jenis === 'paket' ? 'ungu' : 'biru'}">${t.jenis === 'paket' ? 'Paket' : 'Langganan'}</span> <span class="muted" style="font-size:12px">${UI.esc(t.item)}</span></td>
                  <td class="mono dim nowrap">${Store.tglID(t.tgl)}</td>
                  <td class="muted">${UI.esc(t.metode)}</td>
                  <td class="num mono" style="font-weight:600">${Store.rupiah(t.jumlah)}</td>
                  <td>${UI.lencanaStatus(t.status)}</td>
                  <td class="aksi">
                    ${t.status === 'pending' ? `<button class="btn btn--sm btn--wa" data-lunasi="${t.id}">${UI.icon('check')}</button>` : ''}
                    <button class="btn btn--sm" data-kuitansi="${t.id}" title="Kuitansi">${UI.icon('printer')}</button>
                    <button class="btn btn--sm" data-ubah="${t.id}" title="Ubah">${UI.icon('edit')}</button>
                    <button class="btn btn--sm btn--dgr" data-hapus="${t.id}" title="Hapus">${UI.icon('trash')}</button>
                  </td>
                </tr>`;
              }).join('') : `<tr><td colspan="8">${UI.kosong({ ikon: 'wallet', judul: 'Tidak ada transaksi', pesan: 'Ubah saringan atau catat transaksi baru.' })}</td></tr>`}
            </tbody>
          </table>
        </div>`;

      /* ── Kejadian ── */
      const inp = UI.q('#cariTr', root);
      inp.addEventListener('input', () => {
        saring.cari = inp.value.trim().toLowerCase();
        const pos = inp.selectionStart;
        App.gambar();
        const b = UI.q('#cariTr');
        if (b) { b.focus(); b.setSelectionRange(pos, pos); }
      });

      UI.qa('[data-st]', root).forEach((c) => c.addEventListener('click', () => { saring.status = c.dataset.st; App.gambar(); }));
      UI.q('#fJenis', root).addEventListener('change', (e) => { saring.jenis = e.target.value; App.gambar(); });
      UI.q('#fPeriode', root).addEventListener('change', (e) => { saring.periode = e.target.value; App.gambar(); });

      UI.q('#catat', root).addEventListener('click', () => formTransaksi(null));
      UI.qa('[data-ubah]', root).forEach((b) => b.addEventListener('click', () => formTransaksi(b.dataset.ubah)));
      UI.qa('[data-kuitansi]', root).forEach((b) => b.addEventListener('click', () => kuitansi(b.dataset.kuitansi)));
      UI.qa('[data-lunasi]', root).forEach((b) => b.addEventListener('click', () => {
        Store.update('transaksi', b.dataset.lunasi, { status: 'lunas' });
        UI.toast('Pembayaran ditandai lunas', 'ok');
        App.gambar();
      }));
      UI.qa('[data-hapus]', root).forEach((b) => b.addEventListener('click', async () => {
        const ya = await UI.konfirmasi({ judul: 'Hapus transaksi?', pesan: 'Catatan transaksi ini akan dihapus permanen.', labelYa: 'Ya, hapus', bahaya: true });
        if (!ya) return;
        Store.remove('transaksi', b.dataset.hapus);
        UI.toast('Transaksi dihapus', 'ok');
        App.gambar();
      }));
      UI.q('#unduhCSV', root).addEventListener('click', () => eksporCSV(data));
    },
  });

  /* ── Formulir transaksi ────────────────────────────────── */
  const formTransaksi = (id) => {
    const t = id ? Store.find('transaksi', id) : null;
    const warung = Store.all('warung');
    const n = t || { warungId: warung[0] ? warung[0].id : '', jenis: 'langganan', item: '', jumlah: Store.LANGGANAN, metode: 'QRIS', status: 'lunas', tgl: new Date().toISOString() };

    UI.modal({
      judul: t ? 'Ubah Transaksi' : 'Catat Transaksi Baru',
      isi: `
        <div class="form-grid">
          <div class="field full"><label>Warung</label>
            <select class="sel" id="t-warung">${warung.map((w) => `<option value="${w.id}" ${n.warungId === w.id ? 'selected' : ''}>${UI.esc(w.nama)} — ${w.paket}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Jenis</label>
            <select class="sel" id="t-jenis">
              <option value="paket" ${n.jenis === 'paket' ? 'selected' : ''}>Paket (sekali bayar)</option>
              <option value="langganan" ${n.jenis === 'langganan' ? 'selected' : ''}>Langganan bulanan</option>
            </select>
          </div>
          <div class="field"><label>Jumlah (Rp)</label><input class="inp" id="t-jumlah" type="number" value="${n.jumlah}"></div>
          <div class="field full"><label>Keterangan</label><input class="inp" id="t-item" value="${UI.esc(n.item)}" placeholder="Langganan bulanan November 2026"></div>
          <div class="field"><label>Metode</label>
            <select class="sel" id="t-metode">${['QRIS', 'Transfer', 'Tunai', 'E-Wallet'].map((m) => `<option ${n.metode === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Status</label>
            <select class="sel" id="t-status">${['lunas', 'pending', 'batal'].map((s) => `<option value="${s}" ${n.status === s ? 'selected' : ''}>${s === 'lunas' ? 'Lunas' : s === 'pending' ? 'Menunggu' : 'Batal'}</option>`).join('')}</select>
          </div>
          <div class="field full"><label>Tanggal</label><input class="inp" id="t-tgl" type="date" value="${new Date(n.tgl).toISOString().slice(0, 10)}"></div>
        </div>
        <div class="note note--info" style="margin-top:14px">${UI.icon('info')}
          <span>Jumlah otomatis mengikuti paket warung: Hemat Rp 35.000 / Plus Rp 100.000 (sekali bayar), langganan Rp 15.000 per bulan.</span>
        </div>`,
      kaki: `<button class="btn" data-tutup>Batal</button><div class="spacer"></div><button class="btn btn--pri" id="t-simpan">${UI.icon('save')} Simpan</button>`,
      onBuka: (box) => {
        const pilihWarung = () => {
          const w = Store.find('warung', UI.q('#t-warung', box).value);
          const jenis = UI.q('#t-jenis', box).value;
          if (!w) return;
          const h = Store.HARGA[w.paket] || { sekali: 0, bulanan: 0 };
          UI.q('#t-jumlah', box).value = jenis === 'paket' ? h.sekali : h.bulanan;
          UI.q('#t-item', box).value = jenis === 'paket'
            ? `Paket ${w.paket} (sekali bayar)`
            : `Langganan bulanan ${Store.labelPeriode(Store.periodeDari(new Date()))}`;
        };
        UI.q('#t-warung', box).addEventListener('change', pilihWarung);
        UI.q('#t-jenis', box).addEventListener('change', pilihWarung);

        UI.q('#t-simpan', box).addEventListener('click', () => {
          const v = (s) => UI.q(s, box).value;
          const data = {
            warungId: v('#t-warung'), jenis: v('#t-jenis'),
            item: v('#t-item').trim() || 'Transaksi',
            jumlah: +v('#t-jumlah') || 0, metode: v('#t-metode'),
            status: v('#t-status'), tgl: new Date(v('#t-tgl')).toISOString(),
          };
          if (t) { Store.update('transaksi', t.id, data); UI.toast('Transaksi diperbarui', 'ok'); }
          else {
            Store.add('transaksi', { ...data, ref: 'INV-' + Math.floor(Math.random() * 90000 + 10000) });
            UI.toast('Transaksi dicatat', 'ok');
          }
          UI.tutupModal();
          App.gambar();
        });
      },
    });
  };

  /* ── Kuitansi cetak ────────────────────────────────────── */
  const kuitansi = (id) => {
    const t = Store.find('transaksi', id);
    const w = Store.find('warung', t.warungId);
    const win = window.open('', '_blank');
    if (!win) return UI.toast('Popup diblokir browser', 'err');
    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
      <title>Kuitansi ${UI.esc(t.ref)}</title>
      <style>
        @page { size: A5; margin: 14mm; }
        body { font-family: system-ui, sans-serif; color: #0d1a12; margin: 0; }
        .head { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #f5a524; padding-bottom: 14px; }
        .logo { width: 46px; height: 46px; border-radius: 12px; background: #f5a524; display: grid; place-items: center; font-weight: 800; font-size: 22px; }
        h1 { font-size: 20px; margin: 0; }
        .sub { font-size: 11px; color: #666; letter-spacing: .1em; text-transform: uppercase; }
        .meta { display: flex; justify-content: space-between; margin: 22px 0; font-size: 13px; }
        .meta b { display: block; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; background: #faf8f3; padding: 9px 11px; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #666; }
        td { padding: 11px; border-bottom: 1px solid #eee; }
        .num { text-align: right; }
        .total { margin-top: 18px; display: flex; justify-content: flex-end; }
        .total div { background: #0d1a12; color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 18px; font-weight: 700; }
        .foot { margin-top: 34px; font-size: 11px; color: #888; border-top: 1px dashed #ddd; padding-top: 12px; display: flex; justify-content: space-between; }
        .lunas { display: inline-block; border: 2px solid ${t.status === 'lunas' ? '#3ba55d' : '#e5484d'}; color: ${t.status === 'lunas' ? '#3ba55d' : '#e5484d'}; padding: 5px 14px; border-radius: 8px; font-weight: 800; letter-spacing: .1em; font-size: 12px; transform: rotate(-4deg); }
      </style></head><body>
      <div class="head">
        <div class="logo">W</div>
        <div><h1>Warung Go Digital</h1><div class="sub">Kuitansi Pembayaran</div></div>
      </div>
      <div class="meta">
        <div><b>No. Referensi</b>${UI.esc(t.ref)}</div>
        <div><b>Tanggal</b>${Store.tglID(t.tgl, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div><b>Status</b><span class="lunas">${t.status === 'lunas' ? 'LUNAS' : t.status === 'pending' ? 'MENUNGGU' : 'BATAL'}</span></div>
      </div>
      <table>
        <thead><tr><th>Diterima dari</th><th>Metode</th></tr></thead>
        <tbody><tr><td>${UI.esc(w ? w.nama : '—')}<br><span style="color:#666;font-size:12px">${UI.esc(w ? w.alamat : '')}</span></td><td>${UI.esc(t.metode)}</td></tr></tbody>
      </table>
      <table style="margin-top:22px">
        <thead><tr><th>Keterangan</th><th class="num">Jumlah</th></tr></thead>
        <tbody><tr><td>${UI.esc(t.item)}</td><td class="num">${Store.rupiah(t.jumlah)}</td></tr></tbody>
      </table>
      <div class="total"><div>Total ${Store.rupiah(t.jumlah)}</div></div>
      <div class="foot"><span>Warung Go Digital — Etalase Digital untuk Warung &amp; UMKM</span><span>${UI.esc(t.ref)}</span></div>
      <script>setTimeout(()=>window.print(),400)<\/script>
      </body></html>`);
    win.document.close();
  };

  /* ── Ekspor CSV ────────────────────────────────────────── */
  const eksporCSV = (data) => {
    const baris = [['Referensi', 'Warung', 'Jenis', 'Keterangan', 'Tanggal', 'Metode', 'Jumlah', 'Status']];
    for (const t of data) {
      const w = Store.find('warung', t.warungId);
      baris.push([t.ref, w ? w.nama : '-', t.jenis, t.item,
        Store.tglID(t.tgl, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        t.metode, t.jumlah, t.status]);
    }
    const csv = baris.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    UI.unduh('transaksi-warung-go-digital.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
    UI.toast('CSV diunduh', 'ok');
  };
})();
