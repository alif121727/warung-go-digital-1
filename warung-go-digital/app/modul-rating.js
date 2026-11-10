/* ══════════════════════════════════════════════════════════
   modul-rating.js — Rating & Reputasi
   Pantauan rating Google Maps, QR ulasan per warung,
   pengelolaan ulasan (balas), dan bahan promosi reputasi.
   ══════════════════════════════════════════════════════════ */

(() => {
  let tab = 'pantau';
  let saring = { warungId: '', sumber: '', balas: '' };

  App.register('rating', {
    label: 'Rating & Ulasan', judul: 'Rating & Reputasi', ic: 'star', grup: 'Reputasi',
    badge: () => Store.where('rating', (r) => !r.balas).length,
    cari: (v) => { saring.cari = v; if (App.state.view === 'rating') App.gambar(); },

    render(root) {
      const r = Store.ringkas();
      const warung = Store.all('warung').filter((w) => w.status === 'aktif');
      const perluBalas = Store.where('rating', (x) => !x.balas);

      root.innerHTML = `
        <div class="grid grid--4" style="margin-bottom:15px">
          ${UI.stat({ ikon: 'star', warna: 'amber', label: 'Rating Google Maps', nilai: r.ratingRata.toFixed(2), sub: 'Rata-rata ' + warung.length + ' warung aktif' })}
          ${UI.stat({ ikon: 'users', warna: 'biru', label: 'Total Ulasan Maps', nilai: Store.angka(warung.reduce((s, w) => s + w.jumlahUlasan, 0)), sub: 'Terkumpul dari Google' })}
          ${UI.stat({ ikon: 'qr', warna: 'hijau', label: 'QR Ulasan Diakses', nilai: Store.angka(r.qrDiakses), sub: 'Total pemindaian' })}
          ${UI.stat({ ikon: 'alert', warna: 'merah', label: 'Belum Dibalas', nilai: Store.angka(perluBalas.length), sub: perluBalas.length ? 'Perlu perhatian' : 'Semua terbalas' })}
        </div>

        <div class="toolbar">
          <div class="seg" id="segTab">
            <button data-tab="pantau" class="${tab === 'pantau' ? 'on' : ''}">Pantauan Rating</button>
            <button data-tab="qr" class="${tab === 'qr' ? 'on' : ''}">QR Ulasan</button>
            <button data-tab="ulasan" class="${tab === 'ulasan' ? 'on' : ''}">Daftar Ulasan</button>
          </div>
          <div class="toolbar__spacer"></div>
          ${tab === 'ulasan' ? `
            <select class="sel" id="fWarung" style="width:auto">
              <option value="">Semua warung</option>
              ${Store.all('warung').map((w) => `<option value="${w.id}" ${saring.warungId === w.id ? 'selected' : ''}>${UI.esc(w.nama)}</option>`).join('')}
            </select>
            <div class="chips">
              ${[['', 'Semua'], ['maps', 'Google Maps'], ['internal', 'Internal']].map(([v, l]) =>
                `<button class="chip ${saring.sumber === v ? 'on' : ''}" data-sum="${v}">${l}</button>`).join('')}
              <button class="chip ${saring.balas === 'belum' ? 'on' : ''}" data-saringbalas="belum">Belum dibalas</button>
            </div>` : ''}
        </div>

        <div id="isiTab"></div>`;

      UI.qa('#segTab button', root).forEach((b) =>
        b.addEventListener('click', () => { tab = b.dataset.tab; App.gambar(); })
      );
      const fw = UI.q('#fWarung', root);
      if (fw) fw.addEventListener('change', (e) => { saring.warungId = e.target.value; App.gambar(); });
      UI.qa('[data-sum]', root).forEach((b) => b.addEventListener('click', () => { saring.sumber = b.dataset.sum; App.gambar(); }));
      UI.qa('[data-saringbalas]', root).forEach((b) => b.addEventListener('click', () => { saring.balas = saring.balas === 'belum' ? '' : 'belum'; App.gambar(); }));

      const isi = UI.q('#isiTab', root);
      if (tab === 'pantau') gambarPantau(isi);
      else if (tab === 'qr') gambarQR(isi);
      else gambarUlasan(isi);
    },
  });

  /* ═══ TAB 1: PANTAUAN RATING ═══ */
  const gambarPantau = (root) => {
    const warung = Store.all('warung');
    const pantau = Store.all('pantau');

    /* Ringkasan perubahan rating 90 hari */
    const ringkasW = warung.map((w) => {
      const riwayat = pantau.filter((p) => p.warungId === w.id).sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
      const awal = riwayat[0] ? riwayat[0].ratingMaps : w.ratingMaps;
      const akhir = riwayat.length ? riwayat[riwayat.length - 1].ratingMaps : w.ratingMaps;
      const ulasanBaru = (riwayat.length ? riwayat[riwayat.length - 1].jumlahUlasan : w.jumlahUlasan) - (riwayat[0] ? riwayat[0].jumlahUlasan : w.jumlahUlasan);
      return { ...w, awal, akhir, delta: akhir - awal, ulasanBaru, riwayat };
    }).sort((a, b) => b.akhir - a.akhir);

    const naik = ringkasW.filter((w) => w.delta > 0.02).length;
    const turun = ringkasW.filter((w) => w.delta < -0.02).length;

    root.innerHTML = `
      <div class="grid grid--2-1" style="margin-bottom:15px">
        <div class="card">
          <div class="card__head">
            <h3>Peringkat Rating Warung</h3>
            <div class="card__spacer"></div>
            <div class="legend">
              <span class="legend__it"><span class="dot dot--hijau"></span>${naik} naik</span>
              <span class="legend__it"><span class="dot dot--merah"></span>${turun} turun</span>
            </div>
          </div>
          <div class="card__body" style="display:grid;gap:14px">
            ${ringkasW.map((w) => `
              <div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:13px">${UI.esc(w.nama)}</div>
                    <div class="dim" style="font-size:11.5px">${Store.angka(w.jumlahUlasan)} ulasan · ${w.ulasanBaru >= 0 ? '+' : ''}${w.ulasanBaru} dalam 90 hari</div>
                  </div>
                  <div style="text-align:right">
                    <div style="display:flex;align-items:center;gap:7px;justify-content:flex-end">
                      ${UI.bintang(w.akhir)}
                      <span class="mono" style="font-weight:700;font-size:13px">${w.akhir.toFixed(1)}</span>
                    </div>
                    <div class="mono" style="font-size:11px;color:${w.delta > 0.02 ? '#1d7a3f' : w.delta < -0.02 ? 'var(--merah)' : 'var(--t3)'}">
                      ${w.delta > 0.02 ? '▲' : w.delta < -0.02 ? '▼' : '●'} ${Math.abs(w.delta).toFixed(2)} (90 hari)
                    </div>
                  </div>
                </div>
                <div class="bar"><div class="bar__fill" style="width:${(w.akhir / 5) * 100}%;background:${w.akhir >= 4.5 ? 'var(--leaf)' : w.akhir >= 4 ? 'var(--amber)' : 'var(--merah)'}"></div></div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card__head"><h3>Perlu Tindakan</h3></div>
          <div class="card__body" style="display:grid;gap:10px">
            ${(() => {
              const perlu = [];
              for (const w of ringkasW) {
                if (w.akhir < 4.2) perlu.push({ jenis: 'merah', teks: `<b>${UI.esc(w.nama)}</b> rating ${w.akhir.toFixed(1)} — di bawah target 4,2` });
                else if (w.delta < -0.05) perlu.push({ jenis: 'kuning', teks: `<b>${UI.esc(w.nama)}</b> turun ${Math.abs(w.delta).toFixed(2)} dalam 90 hari` });
                if (w.jumlahUlasan < 20) perlu.push({ jenis: 'biru', teks: `<b>${UI.esc(w.nama)}</b> baru ${w.jumlahUlasan} ulasan — dorong QR ulasan` });
              }
              const belum = Store.where('rating', (x) => !x.balas).length;
              if (belum) perlu.push({ jenis: 'kuning', teks: `<b>${belum} ulasan</b> belum dibalas` });
              return perlu.length ? perlu.slice(0, 7).map((p) => `
                <div class="note note--${p.jenis}" style="font-size:12px">${UI.icon('info')}<span>${p.teks}</span></div>`).join('')
                : `<div class="note note--ok">${UI.icon('check')}<span>Semua warung dalam kondisi baik.</span></div>`;
            })()}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__head">
          <h3>Grafik Pantauan Rating 90 Hari</h3>
          <div class="card__spacer"></div>
          <select class="sel" id="pilihWarungGrafik" style="width:auto">
            ${warung.map((w) => `<option value="${w.id}">${UI.esc(w.nama)}</option>`).join('')}
          </select>
        </div>
        <div class="card__body">
          <div id="grafikRating"></div>
          <div class="note note--info" style="margin-top:14px">${UI.icon('info')}
            <span>Data pantauan disinkronkan dari Google Maps. Untuk data langsung, hubungkan Place ID warung dengan Google Places API — panel ini sudah menyiapkan tempatnya.</span>
          </div>
        </div>
      </div>`;

    const gambarGrafik = (id) => {
      const riwayat = pantau.filter((p) => p.warungId === id).sort((a, b) => new Date(a.tgl) - new Date(b.tgl));
      const titik = riwayat.map((p) => ({ v: p.ratingMaps, tgl: p.tgl }));
      const w = Store.find('warung', id);
      const el = UI.q('#grafikRating', root);
      if (!titik.length) { el.innerHTML = UI.kosong({ ikon: 'chart', judul: 'Belum ada data pantauan', pesan: 'Pantauan akan muncul setelah data terkumpul.' }); return; }
      el.innerHTML = `
        <div class="grid grid--2" style="margin-bottom:12px">
          <div><div class="stat__label">Rating terkini</div><div style="font-family:var(--f-display);font-size:24px;font-weight:700">${titik[titik.length - 1].v.toFixed(2)}</div></div>
          <div><div class="stat__label">Jumlah ulasan</div><div style="font-family:var(--f-display);font-size:24px;font-weight:700">${Store.angka(riwayat[riwayat.length - 1].jumlahUlasan)}</div></div>
        </div>
        ${UI.grafikGaris(titik, { warna: '#f5a524', format: (v) => v.toFixed(1), tinggi: 170 })}
        <p class="dim" style="font-size:11.5px;margin:8px 0 0">${Store.tglID(titik[0].tgl)} — ${Store.tglID(titik[titik.length - 1].tgl)} · ${titik.length} titik pantauan</p>`;
    };

    const sel = UI.q('#pilihWarungGrafik', root);
    sel.value = ringkasW.length ? ringkasW[0].id : '';
    sel.addEventListener('change', () => gambarGrafik(sel.value));
    if (ringkasW.length) gambarGrafik(sel.value);
  };

  /* ═══ TAB 2: QR ULASAN ═══ */
  const gambarQR = (root) => {
    const warung = Store.all('warung').filter((w) => w.status !== 'nonaktif');
    const dataQR = Store.all('ulasanQR');

    root.innerHTML = `
      <div class="note note--ok" style="margin-bottom:15px">${UI.icon('check')}
        <span><b>QR ulasan</b> mengarahkan pelanggan langsung ke formulir ulasan Google Maps warung Anda. Cetak, tempel di meja, dan jumlah ulasan akan naik dengan sendirinya.</span>
      </div>

      <div class="grid grid--3" style="margin-bottom:15px">
        ${warung.map((w) => {
          const d = dataQR.find((x) => x.warungId === w.id);
          const konversi = d && d.diakses ? (d.konversi / d.diakses) * 100 : 0;
          return `
            <div class="card">
              <div class="card__body" style="text-align:center">
                <div class="qrbox" style="padding:10px;margin-bottom:12px">
                  <canvas data-qr="${w.id}" style="width:150px;height:150px"></canvas>
                </div>
                <div style="font-weight:700;font-family:var(--f-display);font-size:14.5px">${UI.esc(w.nama)}</div>
                <div class="dim" style="font-size:11.5px;margin-bottom:10px">${UI.esc(w.kategori)}</div>
                <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:11px">
                  <span class="badge badge--biru">${Store.angka(d ? d.diakses : 0)} pindai</span>
                  <span class="badge badge--hijau">${konversi.toFixed(0)}% konversi</span>
                </div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn--sm" data-qrdetail="${w.id}" style="flex:1">${UI.icon('eye')} Detail</button>
                  <button class="btn btn--sm btn--pri" data-qrcetak="${w.id}" style="flex:1">${UI.icon('printer')} Cetak</button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>

      <div class="card">
        <div class="card__head"><h3>Performa QR Ulasan</h3><div class="card__spacer"></div><span class="dim mono" style="font-size:11px">${Store.angka(dataQR.reduce((s, d) => s + d.diakses, 0))} total pindai</span></div>
        <div class="tablewrap" style="border:none">
          <table class="tbl">
            <thead><tr><th>Warung</th><th>Kode</th><th class="num">Dipindai</th><th class="num">Ulasan Masuk</th><th class="num">Konversi</th><th>Efektivitas</th></tr></thead>
            <tbody>
              ${warung.map((w) => {
                const d = dataQR.find((x) => x.warungId === w.id) || { diakses: 0, konversi: 0, kode: '-' };
                const k = d.diakses ? (d.konversi / d.diakses) * 100 : 0;
                return `<tr>
                  <td>${UI.who(w.nama, w.kategori)}</td>
                  <td class="mono dim" style="font-size:11.5px">${UI.esc(d.kode)}</td>
                  <td class="num mono">${Store.angka(d.diakses)}</td>
                  <td class="num mono">${Store.angka(d.konversi)}</td>
                  <td class="num mono" style="font-weight:600">${k.toFixed(1)}%</td>
                  <td style="width:130px">
                    <div class="bar"><div class="bar__fill" style="width:${Math.min(100, k * 2)}%;background:${k > 15 ? 'var(--leaf)' : k > 8 ? 'var(--amber)' : 'var(--merah)'}"></div></div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    /* Gambar semua QR */
    UI.qa('[data-qr]', root).forEach((c) => {
      const w = Store.find('warung', c.dataset.qr);
      try { QR.draw(c, urlUlasan(w), { size: 150, ecc: 'M' }); }
      catch (e) { c.parentElement.innerHTML = `<span class="badge badge--merah">QR gagal</span>`; }
    });

    UI.qa('[data-qrcetak]', root).forEach((b) => b.addEventListener('click', () => {
      const w = Store.find('warung', b.dataset.qrcetak);
      cetakQRUlasan(w, true);
    }));
    UI.qa('[data-qrdetail]', root).forEach((b) => b.addEventListener('click', () => {
      const w = Store.find('warung', b.dataset.qrdetail);
      const d = dataQR.find((x) => x.warungId === w.id) || { diakses: 0, konversi: 0, kode: '-' };
      const canvas = UI.q(`[data-qr="${w.id}"]`, root);
      UI.modal({
        judul: 'QR Ulasan — ' + w.nama,
        lebar: true,
        isi: `
          <div class="grid grid--2" style="align-items:start">
            <div style="text-align:center">
              <div class="qrbox" style="display:block;padding:16px"><img src="${canvas.toDataURL()}" alt="QR ulasan" style="width:220px;height:220px"></div>
              <div style="margin-top:12px">${UI.bintang(w.ratingMaps, true)}</div>
              <div class="mono" style="font-weight:700;font-size:19px;margin-top:4px">${w.ratingMaps.toFixed(1)} <span class="dim" style="font-size:12px;font-weight:400">/ 5 · ${w.jumlahUlasan} ulasan</span></div>
            </div>
            <div>
              <div class="kv"><span class="kv__k">Kode QR</span><span class="kv__v mono">${UI.esc(d.kode)}</span></div>
              <div class="kv"><span class="kv__k">Total dipindai</span><span class="kv__v">${Store.angka(d.diakses)}</span></div>
              <div class="kv"><span class="kv__k">Ulasan masuk</span><span class="kv__v">${Store.angka(d.konversi)}</span></div>
              <div class="kv"><span class="kv__k">Konversi</span><span class="kv__v">${d.diakses ? ((d.konversi / d.diakses) * 100).toFixed(1) : '0'}%</span></div>
              <div class="field" style="margin-top:14px"><label>Tautan ulasan</label><input class="inp mono" id="urlUlasan" value="${UI.esc(urlUlasan(w))}" readonly style="font-size:11px"></div>
              <div style="display:grid;gap:8px;margin-top:14px">
                <button class="btn btn--pri" id="cetakQR2">${UI.icon('printer')} Cetak kartu meja</button>
                <button class="btn" id="unduhQR2">${UI.icon('download')} Unduh PNG</button>
                <button class="btn" id="salinURL2">${UI.icon('link')} Salin tautan ulasan</button>
                <button class="btn btn--wa" id="kirimWA">${UI.icon('whatsapp')} Kirim ke pemilik via WA</button>
              </div>
            </div>
          </div>`,
        onBuka: (box) => {
          const url = urlUlasan(w);
          UI.q('#cetakQR2', box).addEventListener('click', () => cetakQRUlasan(w, true));
          UI.q('#unduhQR2', box).addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = 'qr-ulasan-' + w.nama.toLowerCase().replace(/\s+/g, '-') + '.png';
            a.click();
            UI.toast('QR diunduh', 'ok');
          });
          UI.q('#salinURL2', box).addEventListener('click', () => UI.salin(url, 'Tautan ulasan disalin'));
          UI.q('#kirimWA', box).addEventListener('click', () => {
            const pesan = `Halo ${w.pemilik}, ini tautan ulasan Google Maps untuk ${w.nama}:\n${url}\n\nTempel di status WhatsApp atau bagikan ke pelanggan agar rating warung naik.`;
            window.open(`https://wa.me/${w.wa}?text=${encodeURIComponent(pesan)}`, '_blank', 'noopener');
          });
        },
      });
    }));
  };

  const urlUlasan = (w) =>
    w.placeId
      ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(w.placeId)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.nama + ' ' + w.alamat)}`;

  const cetakQRUlasan = (w, denganQR) => {
    const win = window.open('', '_blank');
    if (!win) return UI.toast('Popup diblokir browser', 'err');
    const tmp = document.createElement('canvas');
    let dataUrl = '';
    try { QR.draw(tmp, urlUlasan(w), { size: 420, ecc: 'M' }); dataUrl = tmp.toDataURL(); } catch { /* tanpa QR */ }

    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
      <title>QR Ulasan — ${UI.esc(w.nama)}</title>
      <style>
        @page { size: A5; margin: 10mm; }
        body { font-family: system-ui, sans-serif; margin: 0; display: grid; place-items: center; min-height: 100vh; background: #fff; }
        .kartu { width: 100%; max-width: 400px; border: 3px solid #0d1a12; border-radius: 24px; overflow: hidden; text-align: center; }
        .atas { background: #0d1a12; color: #fff; padding: 22px 24px 26px; position: relative; }
        .atas::after { content:''; position:absolute; inset:0; background: radial-gradient(240px 140px at 50% 0%, rgba(245,165,36,.3), transparent 70%); }
        .brand { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #f5a524; font-weight: 700; position: relative; }
        h1 { font-size: 23px; margin: 8px 0 5px; position: relative; letter-spacing: -.02em; }
        .ket { font-size: 12.5px; color: #b6c6bc; position: relative; }
        .bawah { padding: 24px; }
        img { width: 215px; height: 215px; }
        .bintang { font-size: 27px; color: #f5a524; letter-spacing: 3px; margin: 14px 0 4px; }
        .ajak { font-size: 15.5px; font-weight: 700; }
        .kecil { font-size: 11.5px; color: #666; margin-top: 5px; }
        .foot { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #ddd; font-size: 10.5px; color: #888; }
      </style></head><body>
      <div class="kartu">
        <div class="atas">
          <div class="brand">Warung Go Digital</div>
          <h1>${UI.esc(w.nama)}</h1>
          <div class="ket">${UI.esc(w.kategori)} · ${UI.esc(w.alamat)}</div>
        </div>
        <div class="bawah">
          ${denganQR && dataUrl ? `<img src="${dataUrl}" alt="QR ulasan">` : ''}
          <div class="bintang">★★★★★</div>
          <div class="ajak">Bagaimana pengalaman Anda?</div>
          <div class="kecil">Pindai kode di atas untuk memberi ulasan di Google Maps.<br>Ulasan Anda sangat membantu warung kami.</div>
          <div class="foot">Terima kasih telah berkunjung · ${UI.esc(w.wa)}</div>
        </div>
      </div>
      <script>setTimeout(()=>window.print(),500)<\/script>
      </body></html>`);
    win.document.close();
  };

  /* ═══ TAB 3: DAFTAR ULASAN ═══ */
  const gambarUlasan = (root) => {
    const semua = Store.all('rating').sort((a, b) => new Date(b.tgl) - new Date(a.tgl));
    const data = semua.filter((u) => {
      if (saring.warungId && u.warungId !== saring.warungId) return false;
      if (saring.sumber && u.sumber !== saring.sumber) return false;
      if (saring.balas === 'belum' && u.balas) return false;
      if (saring.cari) {
        const w = Store.find('warung', u.warungId);
        if (!((u.ulasan + ' ' + u.nama + ' ' + (w ? w.nama : '')).toLowerCase().includes(saring.cari))) return false;
      }
      return true;
    });

    const distribusi = [5, 4, 3, 2, 1].map((n) => ({ n, c: data.filter((u) => u.skor === n).length }));
    const rata = data.length ? data.reduce((s, u) => s + u.skor, 0) / data.length : 0;

    root.innerHTML = `
      <div class="grid grid--1-2" style="margin-bottom:15px">
        <div class="card">
          <div class="card__body" style="text-align:center">
            <div style="font-family:var(--f-display);font-size:52px;font-weight:800;line-height:1">${rata.toFixed(1)}</div>
            <div style="margin:7px 0">${UI.bintang(rata, true)}</div>
            <div class="muted" style="font-size:12.5px">${data.length} ulasan</div>
          </div>
        </div>
        <div class="card">
          <div class="card__head"><h3>Distribusi Bintang</h3></div>
          <div class="card__body" style="display:grid;gap:8px">
            ${distribusi.map((d) => `
              <div style="display:flex;align-items:center;gap:11px">
                <span class="mono" style="font-size:12px;width:26px;font-weight:600">${d.n}★</span>
                <div class="bar" style="flex:1"><div class="bar__fill" style="width:${data.length ? (d.c / data.length) * 100 : 0}%;background:${d.n >= 4 ? 'var(--amber)' : 'var(--merah)'}"></div></div>
                <span class="mono dim" style="font-size:11.5px;width:38px;text-align:right">${d.c}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid;gap:12px">
        ${data.length ? data.slice(0, 40).map((u) => {
          const w = Store.find('warung', u.warungId);
          return `
            <div class="card">
              <div class="card__body" style="padding:15px 18px">
                <div style="display:flex;align-items:flex-start;gap:12px">
                  <div class="who__ava" style="background:${UI.warnaDari(u.nama)}">${UI.esc(UI.inisial(u.nama))}</div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:4px">
                      <span style="font-weight:600;font-size:13px">${UI.esc(u.nama)}</span>
                      ${UI.bintang(u.skor)}
                      <span class="badge badge--${u.sumber === 'maps' ? 'biru' : 'abu'}">${u.sumber === 'maps' ? 'Google Maps' : 'Internal'}</span>
                      ${!u.balas ? '<span class="badge badge--kuning">Belum dibalas</span>' : ''}
                    </div>
                    <p style="margin:0 0 7px;font-size:13px;line-height:1.55">${UI.esc(u.ulasan)}</p>
                    <div class="dim mono" style="font-size:11px">${UI.esc(w ? w.nama : '—')} · ${Store.tglID(u.tgl)}</div>
                    ${u.balas ? `
                      <div style="margin-top:10px;padding:10px 12px;background:#faf8f3;border-left:3px solid var(--leaf);border-radius:0 var(--r-xs) var(--r-xs) 0">
                        <div class="dim mono" style="font-size:10.5px;margin-bottom:3px">Balasan pengelola</div>
                        <div style="font-size:12.5px">${UI.esc(u.balas)}</div>
                      </div>` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;gap:6px">
                    ${!u.balas ? `<button class="btn btn--sm btn--pri" data-balas="${u.id}">${UI.icon('send')} Balas</button>` : ''}
                    <button class="btn btn--sm btn--dgr" data-hapus="${u.id}">${UI.icon('trash')}</button>
                  </div>
                </div>
              </div>
            </div>`;
        }).join('') : `<div class="card"><div class="card__body">${UI.kosong({ ikon: 'star', judul: 'Tidak ada ulasan', pesan: 'Ubah saringan atau tunggu ulasan masuk.' })}</div></div>`}
      </div>`;

    UI.qa('[data-balas]', root).forEach((b) => b.addEventListener('click', () => formBalas(b.dataset.balas)));
    UI.qa('[data-hapus]', root).forEach((b) => b.addEventListener('click', async () => {
      const ya = await UI.konfirmasi({ judul: 'Hapus ulasan?', pesan: 'Catatan ulasan ini akan dihapus dari panel.', labelYa: 'Ya, hapus', bahaya: true });
      if (!ya) return;
      Store.remove('rating', b.dataset.hapus);
      UI.toast('Ulasan dihapus', 'ok');
      App.gambar();
    }));
  };

  const formBalas = (id) => {
    const u = Store.find('rating', id);
    const w = Store.find('warung', u.warungId);
    const contoh = u.skor >= 4
      ? `Terima kasih banyak, ${u.nama}! Senang sekali ${u.ulasan.toLowerCase().includes('cepat') ? 'pelayanannya memuaskan' : 'Anda puas dengan masakan kami'}. Kami tunggu kunjungan berikutnya.`
      : `Terima kasih atas masukannya, ${u.nama}. Kami minta maaf atas ketidaknyamanannya dan akan segera memperbaiki. Semoga bisa melayani Anda lebih baik lain kali.`;

    UI.modal({
      judul: 'Balas Ulasan — ' + (w ? w.nama : ''),
      isi: `
        <div style="padding:13px 15px;background:#faf8f3;border-radius:var(--r);margin-bottom:15px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-weight:600;font-size:13px">${UI.esc(u.nama)}</span>${UI.bintang(u.skor)}
          </div>
          <p style="margin:0;font-size:12.5px">${UI.esc(u.ulasan)}</p>
        </div>
        <div class="field">
          <label>Balasan Anda</label>
          <textarea class="ta" id="b-teks" rows="5">${UI.esc(u.balas || contoh)}</textarea>
        </div>
        <div style="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap">
          <button class="btn btn--sm" id="pakaiContoh">${UI.icon('refresh')} Pakai contoh balasan</button>
          <button class="btn btn--sm" id="salinBalas">${UI.icon('link')} Salin teks</button>
        </div>`,
      kaki: `<button class="btn" data-tutup>Batal</button><div class="spacer"></div><button class="btn btn--pri" id="b-simpan">${UI.icon('save')} Simpan Balasan</button>`,
      onBuka: (box) => {
        UI.q('#pakaiContoh', box).addEventListener('click', () => { UI.q('#b-teks', box).value = contoh; });
        UI.q('#salinBalas', box).addEventListener('click', () => UI.salin(UI.q('#b-teks', box).value));
        UI.q('#b-simpan', box).addEventListener('click', () => {
          const teks = UI.q('#b-teks', box).value.trim();
          if (!teks) return UI.toast('Balasan tidak boleh kosong', 'err');
          Store.update('rating', id, { balas: teks });
          UI.tutupModal();
          UI.toast('Balasan disimpan', 'ok');
          App.gambar();
        });
      },
    });
  };
})();
