/* ══════════════════════════════════════════════════════════
   modul-foto.js — Foto Produk Profesional
   Unggah foto, pengubahan ukuran otomatis, penyuntingan
   sederhana, dan pengelolaan status terbit per warung.
   ══════════════════════════════════════════════════════════ */

(() => {
  let saring = { warungId: '', status: '', cari: '' };

  App.register('foto', {
    label: 'Foto Produk', judul: 'Foto Produk Profesional', ic: 'camera', grup: 'Pemasaran',
    badge: () => Store.all('foto').length,
    cari: (v) => { saring.cari = v; if (App.state.view === 'foto') App.gambar(); },

    render(root) {
      const semua = Store.all('foto');
      const data = semua.filter((f) => {
        if (saring.warungId && f.warungId !== saring.warungId) return false;
        if (saring.status && f.status !== saring.status) return false;
        if (saring.cari) {
          const w = Store.find('warung', f.warungId);
          if (!((f.nama + ' ' + (w ? w.nama : '')).toLowerCase().includes(saring.cari))) return false;
        }
        return true;
      });

      const terbit = semua.filter((f) => f.status === 'terbit').length;
      const berfoto = semua.filter((f) => f.dataUrl).length;

      root.innerHTML = `
        <div class="grid grid--4" style="margin-bottom:15px">
          ${UI.stat({ ikon: 'camera', warna: 'ungu', label: 'Total Foto', nilai: Store.angka(semua.length), sub: 'Untuk ' + new Set(semua.map((f) => f.warungId)).size + ' warung' })}
          ${UI.stat({ ikon: 'check', warna: 'hijau', label: 'Sudah Terbit', nilai: Store.angka(terbit), sub: 'Tampil di katalog & menu' })}
          ${UI.stat({ ikon: 'image', warna: 'biru', label: 'Foto Terunggah', nilai: Store.angka(berfoto), sub: (semua.length - berfoto) + ' masih menunggu' })}
          ${UI.stat({ ikon: 'clock', warna: 'kuning', label: 'Perlu Diterbitkan', nilai: Store.angka(semua.filter((f) => f.status === 'siap').length), sub: 'Foto siap tayang' })}
        </div>

        <div class="sect">
          <div><h2>Galeri Foto Produk</h2><p class="muted" style="margin:2px 0 0;font-size:12.5px">Unggah foto, sistem otomatis menyesuaikan ukuran agar hemat penyimpanan.</p></div>
          <div class="sect__spacer"></div>
          <button class="btn" id="ambilFoto">${UI.icon('camera')} Ambil dari Kamera</button>
          <button class="btn btn--pri" id="unggahFoto">${UI.icon('upload')} Unggah Foto</button>
          <input type="file" id="inputFoto" accept="image/*" hidden multiple>
          <input type="file" id="inputKamera" accept="image/*" capture="environment" hidden>
        </div>

        <div class="toolbar">
          <div class="search" style="width:220px">${UI.icon('search')}<input id="cariFoto" placeholder="Cari foto..." value="${UI.esc(saring.cari)}"></div>
          <div class="chips">
            ${[['', 'Semua'], ['draf', 'Draf'], ['siap', 'Siap'], ['terbit', 'Terbit']].map(([v, l]) =>
              `<button class="chip ${saring.status === v ? 'on' : ''}" data-stat="${v}">${l}</button>`).join('')}
          </div>
          <div class="toolbar__spacer"></div>
          <select class="sel" id="fWarungFoto" style="width:auto">
            <option value="">Semua warung</option>
            ${Store.all('warung').map((w) => `<option value="${w.id}" ${saring.warungId === w.id ? 'selected' : ''}>${UI.esc(w.nama)}</option>`).join('')}
          </select>
        </div>

        ${data.length ? `
          <div class="fotogrid">
            ${data.map((f) => {
              const w = Store.find('warung', f.warungId);
              return `
                <div class="fotocard">
                  <div class="fotocard__img" data-drop="${f.id}">
                    ${f.dataUrl ? `<img src="${f.dataUrl}" alt="${UI.esc(f.nama)}" loading="lazy">` : UI.icon('image')}
                    <div class="fotocard__drop">${UI.icon('upload')}<div style="margin-top:5px">${f.dataUrl ? 'Ganti foto' : 'Unggah foto'}</div></div>
                  </div>
                  <div class="fotocard__meta">
                    <div class="fotocard__name">${UI.esc(f.nama)}</div>
                    <div class="dim" style="font-size:11px;margin-bottom:7px">${UI.esc(w ? w.nama : '—')}</div>
                    <div class="fotocard__row" style="margin-bottom:9px">
                      ${UI.lencanaStatus(f.status)}
                      ${f.ukuran ? `<span class="badge badge--abu">${f.ukuran} KB</span>` : ''}
                    </div>
                    <div style="display:flex;gap:5px">
                      <button class="btn btn--sm" data-ubah="${f.id}" style="flex:1">${UI.icon('edit')} Ubah</button>
                      ${f.status !== 'terbit' ? `<button class="btn btn--sm btn--pri" data-terbit="${f.id}" title="Terbitkan">${UI.icon('check')}</button>` : ''}
                      <button class="btn btn--sm btn--dgr" data-hapus="${f.id}" title="Hapus">${UI.icon('trash')}</button>
                    </div>
                  </div>
                </div>`;
            }).join('')}
          </div>` : `<div class="card"><div class="card__body">${UI.kosong({
            ikon: 'camera', judul: 'Belum ada foto produk',
            pesan: 'Unggah foto agar produk warung tampil menarik di katalog WhatsApp.',
            aksi: '<button class="btn btn--pri" id="kosongFoto">Unggah Foto Pertama</button>',
          })}</div></div>`}`;

      const inp = UI.q('#cariFoto', root);
      inp.addEventListener('input', () => {
        saring.cari = inp.value.trim().toLowerCase();
        const pos = inp.selectionStart;
        App.gambar();
        const b = UI.q('#cariFoto');
        if (b) { b.focus(); b.setSelectionRange(pos, pos); }
      });
      UI.qa('[data-stat]', root).forEach((c) => c.addEventListener('click', () => { saring.status = c.dataset.stat; App.gambar(); }));
      UI.q('#fWarungFoto', root).addEventListener('change', (e) => { saring.warungId = e.target.value; App.gambar(); });

      const pilihWarungDulu = async () => {
        const warung = Store.all('warung');
        if (!warung.length) { UI.toast('Daftarkan warung terlebih dahulu', 'err'); return null; }
        return new Promise((res) => {
          UI.modal({
            judul: 'Pilih Warung',
            isi: `<div class="field"><label>Foto ini untuk warung</label>
              <select class="sel" id="pilihW">${warung.map((w) => `<option value="${w.id}">${UI.esc(w.nama)}</option>`).join('')}</select></div>`,
            kaki: `<button class="btn" data-tutup>Batal</button><div class="spacer"></div><button class="btn btn--pri" id="lanjut">Lanjut Unggah</button>`,
            onBuka: (box) => {
              UI.q('#lanjut', box).addEventListener('click', () => {
                const id = UI.q('#pilihW', box).value;
                UI.tutupModal();
                res(id);
              });
            },
          });
        });
      };

      const input = UI.q('#inputFoto', root);
      UI.q('#unggahFoto', root).addEventListener('click', async () => {
        const wid = await pilihWarungDulu();
        if (!wid) return;
        input.dataset.warung = wid;
        input.click();
      });
      const kp = UI.q('#kosongFoto', root);
      if (kp) kp.addEventListener('click', () => UI.q('#unggahFoto', root).click());

      const kamera = UI.q('#inputKamera', root);
      UI.q('#ambilFoto', root).addEventListener('click', async () => {
        const wid = await pilihWarungDulu();
        if (!wid) return;
        kamera.dataset.warung = wid;
        kamera.click();
      });

      const prosesBerkas = (files, warungId) => {
        [...files].forEach((file) => {
          if (!file.type.startsWith('image/')) return;
          perkecilGambar(file, (dataUrl, kb) => {
            Store.add('foto', {
              warungId, nama: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
              dataUrl, kategori: 'Makanan', status: 'siap', ukuran: kb,
              tgl: new Date().toISOString(),
            });
            UI.toast(`Foto "${file.name}" ditambahkan (${kb} KB)`, 'ok');
            App.gambar();
          });
        });
      };

      input.addEventListener('change', () => { prosesBerkas(input.files, input.dataset.warung); input.value = ''; });
      kamera.addEventListener('change', () => { prosesBerkas(kamera.files, kamera.dataset.warung); kamera.value = ''; });

      UI.qa('[data-drop]', root).forEach((d) => d.addEventListener('click', () => {
        const f = Store.find('foto', d.dataset.drop);
        const tmp = document.createElement('input');
        tmp.type = 'file';
        tmp.accept = 'image/*';
        tmp.addEventListener('change', () => {
          const file = tmp.files[0];
          if (!file) return;
          perkecilGambar(file, (dataUrl, kb) => {
            Store.update('foto', f.id, { dataUrl, ukuran: kb, status: 'siap' });
            UI.toast('Foto diperbarui (' + kb + ' KB)', 'ok');
            App.gambar();
          });
        });
        tmp.click();
      }));

      UI.qa('[data-ubah]', root).forEach((b) => b.addEventListener('click', () => formFoto(b.dataset.ubah)));
      UI.qa('[data-terbit]', root).forEach((b) => b.addEventListener('click', () => {
        Store.update('foto', b.dataset.terbit, { status: 'terbit' });
        UI.toast('Foto diterbitkan', 'ok');
        App.gambar();
      }));
      UI.qa('[data-hapus]', root).forEach((b) => b.addEventListener('click', async () => {
        const ya = await UI.konfirmasi({ judul: 'Hapus foto?', pesan: 'Foto ini akan dihapus dari galeri.', labelYa: 'Ya, hapus', bahaya: true });
        if (!ya) return;
        Store.remove('foto', b.dataset.hapus);
        UI.toast('Foto dihapus', 'ok');
        App.gambar();
      }));
    },
  });

  /* ── Perkecil gambar agar hemat penyimpanan ────────────── */
  const perkecilGambar = (file, cb, maks = 900) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > h && w > maks) { h = Math.round((h * maks) / w); w = maks; }
        else if (h >= w && h > maks) { w = Math.round((w * maks) / h); h = maks; }

        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        let hasil = c.toDataURL('image/jpeg', 0.82);
        /* Turunkan mutu bila masih terlalu besar */
        let mutu = 0.82;
        while (hasil.length > 260000 && mutu > 0.4) {
          mutu -= 0.12;
          hasil = c.toDataURL('image/jpeg', mutu);
        }
        const kb = Math.round((hasil.length * 0.75) / 1024);
        cb(hasil, kb);
      };
      img.onerror = () => UI.toast('Berkas gambar tidak terbaca', 'err');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  /* ── Formulir foto ─────────────────────────────────────── */
  const formFoto = (id) => {
    const f = Store.find('foto', id);
    const warung = Store.all('warung');

    UI.modal({
      judul: 'Ubah Foto',
      isi: `
        <div style="text-align:center;margin-bottom:16px">
          <div class="fotocard__img" style="max-width:280px;margin:0 auto;border-radius:var(--r);border:1px solid var(--line)">
            ${f.dataUrl ? `<img src="${f.dataUrl}" alt="">` : UI.icon('image')}
          </div>
        </div>
        <div class="form-grid">
          <div class="field full"><label>Nama foto / produk</label><input class="inp" id="f-nama" value="${UI.esc(f.nama)}"></div>
          <div class="field full"><label>Warung</label>
            <select class="sel" id="f-warung">${warung.map((w) => `<option value="${w.id}" ${f.warungId === w.id ? 'selected' : ''}>${UI.esc(w.nama)}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Kategori</label>
            <select class="sel" id="f-kat">${['Makanan', 'Minuman', 'Tambahan', 'Suasana', 'Lainnya'].map((k) => `<option ${f.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Status</label>
            <select class="sel" id="f-status">
              <option value="draf" ${f.status === 'draf' ? 'selected' : ''}>Draf</option>
              <option value="siap" ${f.status === 'siap' ? 'selected' : ''}>Siap</option>
              <option value="terbit" ${f.status === 'terbit' ? 'selected' : ''}>Terbit</option>
            </select>
          </div>
          <div class="field full">
            <label>Ganti foto</label>
            <input class="inp" type="file" id="f-ganti" accept="image/*">
          </div>
        </div>
        <div class="note note--info" style="margin-top:14px">${UI.icon('info')}
          <span>Foto otomatis diperkecil ke sisi terpanjang 900 px dan dimampatkan agar tidak menghabiskan penyimpanan browser.</span>
        </div>`,
      kaki: `<button class="btn" data-tutup>Batal</button><div class="spacer"></div><button class="btn btn--pri" id="f-simpan">${UI.icon('save')} Simpan</button>`,
      onBuka: (box) => {
        UI.q('#f-simpan', box).addEventListener('click', () => {
          const v = (s) => UI.q(s, box).value;
          const file = UI.q('#f-ganti', box).files[0];
          const simpan = (tambahan = {}) => {
            Store.update('foto', id, {
              nama: v('#f-nama').trim() || f.nama, warungId: v('#f-warung'),
              kategori: v('#f-kat'), status: v('#f-status'), ...tambahan,
            });
            UI.tutupModal();
            UI.toast('Foto diperbarui', 'ok');
            App.gambar();
          };
          if (file) perkecilGambar(file, (dataUrl, kb) => simpan({ dataUrl, ukuran: kb }));
          else simpan();
        });
      },
    });
  };
})();
