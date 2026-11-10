/* ══════════════════════════════════════════════════════════
   modul-katalog.js — Katalog WhatsApp Business
   Menyusun produk warung menjadi katalog siap kirim,
   pratinjau tampilan di WhatsApp, dan ekspor berkas.
   ══════════════════════════════════════════════════════════ */

(() => {
  let saring = { warungId: '', aktif: '', cari: '' };

  App.register('katalog', {
    label: 'Katalog WhatsApp', judul: 'Katalog WhatsApp Business', ic: 'book', grup: 'Pemasaran',
    badge: () => Store.all('katalog').length,
    cari: (v) => { saring.cari = v; if (App.state.view === 'katalog') App.gambar(); },

    render(root) {
      const semua = Store.all('katalog');
      const data = semua.filter((k) => {
        if (saring.warungId && k.warungId !== saring.warungId) return false;
        if (saring.aktif === 'aktif' && !k.aktif) return false;
        if (saring.aktif === 'nonaktif' && k.aktif) return false;
        if (saring.cari) {
          const w = Store.find('warung', k.warungId);
          if (!((k.nama + ' ' + k.deskripsi + ' ' + (w ? w.nama : '')).toLowerCase().includes(saring.cari))) return false;
        }
        return true;
      });

      const aktif = data.filter((k) => k.aktif);
      const warung = Store.all('warung');

      root.innerHTML = `
        <div class="grid grid--4" style="margin-bottom:15px">
          ${UI.stat({ ikon: 'book', warna: 'hijau', label: 'Produk di Katalog', nilai: Store.angka(aktif.length), sub: 'Dari ' + data.length + ' produk' })}
          ${UI.stat({ ikon: 'store', warna: 'biru', label: 'Warung Berpartisipasi', nilai: Store.angka(new Set(aktif.map((k) => k.warungId)).size), sub: 'Warung aktif' })}
          ${UI.stat({ ikon: 'wallet', warna: 'amber', label: 'Nilai Katalog', nilai: Store.rupiah(aktif.reduce((s, k) => s + k.harga, 0)), sub: 'Total harga produk' })}
          ${UI.stat({ ikon: 'chart', warna: 'ungu', label: 'Harga Rata-rata', nilai: Store.rupiah(aktif.length ? aktif.reduce((s, k) => s + k.harga, 0) / aktif.length : 0), sub: 'Per produk' })}
        </div>

        <div class="note note--info" style="margin-bottom:15px">${UI.icon('info')}
          <span>Produk di sini tersusun mengikuti format <b>WhatsApp Business Catalog</b> — nama, harga, deskripsi, dan tautan pemesanan. Gunakan tombol <b>Bagikan</b> untuk mengirim katalog ke pemilik warung.</span>
        </div>

        <div class="sect">
          <div><h2>Produk Katalog</h2><p class="muted" style="margin:2px 0 0;font-size:12.5px">${data.length} produk</p></div>
          <div class="sect__spacer"></div>
          <button class="btn" id="imporMenu">${UI.icon('refresh')} Tarik dari Menu Warung</button>
          <button class="btn btn--pri" id="tambahKatalog">${UI.icon('plus')} Tambah Produk</button>
        </div>

        <div class="toolbar">
          <div class="search" style="width:220px">${UI.icon('search')}<input id="cariKat" placeholder="Cari produk..." value="${UI.esc(saring.cari)}"></div>
          <div class="chips">
            ${[['', 'Semua'], ['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']].map(([v, l]) =>
              `<button class="chip ${saring.aktif === v ? 'on' : ''}" data-akt="${v}">${l}</button>`).join('')}
          </div>
          <div class="toolbar__spacer"></div>
          <select class="sel" id="fWarungKat" style="width:auto">
            <option value="">Semua warung</option>
            ${warung.map((w) => `<option value="${w.id}" ${saring.warungId === w.id ? 'selected' : ''}>${UI.esc(w.nama)}</option>`).join('')}
          </select>
        </div>

        <div class="grid grid--3">
          ${data.length ? data.slice(0, 60).map((k) => {
            const w = Store.find('warung', k.warungId);
            return `
              <div class="card">
                <div class="card__body" style="padding:16px">
                  <div style="display:flex;align-items:flex-start;gap:11px;margin-bottom:11px">
                    <div class="who__ava" style="background:${UI.warnaDari(k.nama)};border-radius:10px">${UI.icon(k.kategori === 'Minuman' ? 'whatsapp' : 'store')}</div>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600;font-size:13.5px;line-height:1.35">${UI.esc(k.nama)}</div>
                      <div class="dim" style="font-size:11.5px">${UI.esc(w ? w.nama : '—')}</div>
                    </div>
                    ${k.aktif ? '<span class="dot dot--hijau" title="Aktif"></span>' : '<span class="dot dot--abu" title="Nonaktif"></span>'}
                  </div>
                  <p class="muted" style="font-size:12px;margin:0 0 11px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${UI.esc(k.deskripsi)}</p>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                    <span class="badge badge--abu">${UI.esc(k.kategori)}</span>
                    <div style="flex:1"></div>
                    <span class="mono" style="font-weight:700;font-size:14px">${Store.rupiah(k.harga)}</span>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn--sm btn--wa" data-bagikan="${k.id}" style="flex:1">${UI.icon('send')} Bagikan</button>
                    <button class="btn btn--sm" data-toggle="${k.id}" title="${k.aktif ? 'Nonaktifkan' : 'Aktifkan'}">${UI.icon(k.aktif ? 'eye' : 'check')}</button>
                    <button class="btn btn--sm" data-ubah="${k.id}">${UI.icon('edit')}</button>
                    <button class="btn btn--sm btn--dgr" data-hapus="${k.id}">${UI.icon('trash')}</button>
                  </div>
                </div>
              </div>`;
          }).join('') : `<div class="card" style="grid-column:1/-1"><div class="card__body">${UI.kosong({ ikon: 'book', judul: 'Katalog kosong', pesan: 'Tarik dari menu warung atau tambah produk baru.', aksi: '<button class="btn btn--pri" id="kosongTambah">Tambah Produk</button>' })}</div></div>`}
        </div>`;

      const inp = UI.q('#cariKat', root);
      inp.addEventListener('input', () => {
        saring.cari = inp.value.trim().toLowerCase();
        const pos = inp.selectionStart;
        App.gambar();
        const b = UI.q('#cariKat');
        if (b) { b.focus(); b.setSelectionRange(pos, pos); }
      });
      UI.qa('[data-akt]', root).forEach((c) => c.addEventListener('click', () => { saring.aktif = c.dataset.akt; App.gambar(); }));
      UI.q('#fWarungKat', root).addEventListener('change', (e) => { saring.warungId = e.target.value; App.gambar(); });

      UI.q('#tambahKatalog', root).addEventListener('click', () => formKatalog(null));
      const kt = UI.q('#kosongTambah', root);
      if (kt) kt.addEventListener('click', () => formKatalog(null));

      UI.q('#imporMenu', root).addEventListener('click', () => tarikDariMenu());

      UI.qa('[data-ubah]', root).forEach((b) => b.addEventListener('click', () => formKatalog(b.dataset.ubah)));
      UI.qa('[data-toggle]', root).forEach((b) => b.addEventListener('click', () => {
        const k = Store.find('katalog', b.dataset.toggle);
        Store.update('katalog', k.id, { aktif: !k.aktif });
        UI.toast(k.aktif ? 'Produk dinonaktifkan' : 'Produk diaktifkan', 'ok');
        App.gambar();
      }));
      UI.qa('[data-hapus]', root).forEach((b) => b.addEventListener('click', async () => {
        const ya = await UI.konfirmasi({ judul: 'Hapus produk?', pesan: 'Produk ini akan dihapus dari katalog.', labelYa: 'Ya, hapus', bahaya: true });
        if (!ya) return;
        Store.remove('katalog', b.dataset.hapus);
        UI.toast('Produk dihapus', 'ok');
        App.gambar();
      }));
      UI.qa('[data-bagikan]', root).forEach((b) => b.addEventListener('click', () => bagikan(b.dataset.bagikan)));
    },
  });

  /* ── Formulir produk ───────────────────────────────────── */
  const formKatalog = (id) => {
    const k = id ? Store.find('katalog', id) : null;
    const warung = Store.all('warung');
    const n = k || { warungId: warung[0] ? warung[0].id : '', nama: '', kategori: 'Makanan', harga: 15000, deskripsi: '', aktif: true };

    UI.modal({
      judul: k ? 'Ubah Produk Katalog' : 'Tambah Produk Katalog',
      isi: `
        <div class="form-grid">
          <div class="field full"><label>Warung</label>
            <select class="sel" id="k-warung">${warung.map((w) => `<option value="${w.id}" ${n.warungId === w.id ? 'selected' : ''}>${UI.esc(w.nama)}</option>`).join('')}</select>
          </div>
          <div class="field full"><label>Nama produk</label><input class="inp" id="k-nama" value="${UI.esc(n.nama)}" placeholder="Nasi Goreng Spesial"></div>
          <div class="field"><label>Harga (Rp)</label><input class="inp" id="k-harga" type="number" value="${n.harga}"></div>
          <div class="field"><label>Kategori</label>
            <select class="sel" id="k-kat">${['Makanan', 'Minuman', 'Tambahan', 'Sembako', 'Jasa'].map((x) => `<option ${n.kategori === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
          </div>
          <div class="field full"><label>Deskripsi</label><textarea class="ta" id="k-desk" rows="3" placeholder="Deskripsi singkat produk...">${UI.esc(n.deskripsi)}</textarea></div>
          <div class="field full">
            <label>Status</label>
            <select class="sel" id="k-aktif"><option value="1" ${n.aktif ? 'selected' : ''}>Aktif — tampil di katalog</option><option value="0" ${!n.aktif ? 'selected' : ''}>Nonaktif</option></select>
          </div>
        </div>`,
      kaki: `<button class="btn" data-tutup>Batal</button><div class="spacer"></div><button class="btn btn--pri" id="k-simpan">${UI.icon('save')} Simpan</button>`,
      onBuka: (box) => {
        UI.q('#k-simpan', box).addEventListener('click', () => {
          const v = (s) => UI.q(s, box).value;
          const nama = v('#k-nama').trim();
          if (!nama) return UI.toast('Nama produk wajib diisi', 'err');
          const data = {
            warungId: v('#k-warung'), nama, harga: +v('#k-harga') || 0,
            kategori: v('#k-kat'), deskripsi: v('#k-desk').trim(),
            aktif: v('#k-aktif') === '1',
          };
          if (k) { Store.update('katalog', k.id, data); UI.toast('Produk diperbarui', 'ok'); }
          else { Store.add('katalog', { ...data, wa: (Store.find('warung', data.warungId) || {}).wa || '', tgl: new Date().toISOString() }); UI.toast('Produk ditambahkan', 'ok'); }
          UI.tutupModal();
          App.gambar();
        });
      },
    });
  };

  /* ── Tarik seluruh menu warung ke katalog ──────────────── */
  const tarikDariMenu = async () => {
    const warung = Store.all('warung');
    const katalog = Store.all('katalog');
    const ada = new Set(katalog.map((k) => k.warungId + '|' + k.nama.toLowerCase()));
    let jumlah = 0;
    for (const w of warung) {
      for (const m of w.menu) {
        const kunci = w.id + '|' + m.nama.toLowerCase();
        if (ada.has(kunci)) continue;
        Store.add('katalog', {
          warungId: w.id, nama: m.nama, kategori: m.kategori, harga: m.harga,
          deskripsi: `${m.nama} buatan ${w.nama}. Pesan langsung via WhatsApp.`,
          wa: w.wa, aktif: true, tgl: new Date().toISOString(),
        });
        ada.add(kunci);
        jumlah++;
      }
    }
    UI.toast(jumlah ? `${jumlah} produk baru ditarik dari menu warung` : 'Semua menu sudah ada di katalog', jumlah ? 'ok' : 'info');
    App.gambar();
  };

  /* ── Bagikan katalog via WhatsApp ──────────────────────── */
  const bagikan = (id) => {
    const k = Store.find('katalog', id);
    const w = Store.find('warung', k.warungId);
    const teks = `*${w.nama}* — Katalog Produk\n\n` +
      `📦 *${k.nama}*\n` +
      `💰 ${Store.rupiah(k.harga)}\n` +
      `📝 ${k.deskripsi}\n\n` +
      `Pesan sekarang:\nhttps://wa.me/${k.wa || w.wa}?text=${encodeURIComponent('Halo, saya mau pesan ' + k.nama)}`;

    UI.modal({
      judul: 'Bagikan Produk — ' + k.nama,
      isi: `
        <div class="grid grid--2" style="align-items:start">
          <div>
            <div class="wa">
              <div class="wa__bubble">${UI.esc(teks)}<div class="wa__time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div></div>
            </div>
            <p class="dim" style="font-size:11.5px;margin:9px 0 0">Pratinjau tampilan di WhatsApp</p>
          </div>
          <div>
            <div style="display:grid;gap:8px">
              <button class="btn btn--wa" id="kirimKePemilik">${UI.icon('whatsapp')} Kirim ke pemilik warung</button>
              <button class="btn" id="salinTeks">${UI.icon('link')} Salin teks katalog</button>
              <button class="btn" id="unduhTeks">${UI.icon('download')} Unduh sebagai .txt</button>
            </div>
            <div class="field" style="margin-top:14px">
              <label>Kirim ke nomor lain</label>
              <div style="display:flex;gap:7px">
                <input class="inp mono" id="nomorLain" placeholder="6281234567890" style="font-size:12.5px">
                <button class="btn btn--wa" id="kirimLain">${UI.icon('send')}</button>
              </div>
            </div>
          </div>
        </div>`,
      onBuka: (box) => {
        UI.q('#kirimKePemilik', box).addEventListener('click', () => {
          window.open(`https://wa.me/${w.wa}?text=${encodeURIComponent(teks)}`, '_blank', 'noopener');
        });
        UI.q('#salinTeks', box).addEventListener('click', () => UI.salin(teks, 'Teks katalog disalin'));
        UI.q('#unduhTeks', box).addEventListener('click', () => UI.unduh(k.nama.toLowerCase().replace(/\s+/g, '-') + '.txt', teks));
        UI.q('#kirimLain', box).addEventListener('click', () => {
          const nomor = UI.q('#nomorLain', box).value.replace(/\D/g, '');
          if (!nomor) return UI.toast('Masukkan nomor tujuan', 'err');
          window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(teks)}`, '_blank', 'noopener');
        });
      },
    });
  };
})();
