/* ══════════════════════════════════════════════════════════
   app.js — Aplikasi Pemilik Warung
   Catat penjualan & pendapatan harian, lihat riwayat,
   lalu kirim laporan ke pengelola (lewat WhatsApp/berkas).

   Data disimpan di perangkat ini saja (localStorage).
   Pemilik TIDAK bisa melihat data pengelola.
   ══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const S = Data.buatPenyimpanan('wgd-pemilik-v1');

  const state = {
    tab: 'catat',
    tgl: Inti.hariIni(),
    draf: null,
    adaCatatan: false,
    periodeKirim: 'semua',
    caraKirim: 'berkas',
  };

  /* ── Bantuan data ─────────────────────────────────────── */
  const db = () => S.load();
  const warung = () => db().warung || null;
  const catatan = () => db().catatan || [];

  const simpanWarung = (w) => { const d = db(); d.warung = w; S.simpanSegera(); };

  // Simpan catatan satu hari; tanggal yang sama ditimpa.
  const simpanCatatan = (rek) => {
    const d = db();
    const lain = (d.catatan || []).filter((c) => c.tgl !== rek.tgl);
    d.catatan = Data.urut([...lain, rek]);
    S.simpanSegera();
  };

  const hapusCatatan = (tgl) => {
    const d = db();
    d.catatan = (d.catatan || []).filter((c) => c.tgl !== tgl);
    S.simpanSegera();
  };

  const cariCatatan = (tgl) => catatan().find((c) => c.tgl === tgl) || null;

  /* ── Input uang dengan pemisah ribuan ─────────────────── */
  const formatUang = (n) => (Number(n) ? Number(n).toLocaleString('id-ID') : '');
  const bacaUang = (inp) => Number(String(inp.value).replace(/[^0-9]/g, '')) || 0;
  const pasangUang = (inp) => {
    inp.addEventListener('input', () => {
      const digit = inp.value.replace(/[^0-9]/g, '');
      inp.value = digit ? Number(digit).toLocaleString('id-ID') : '';
    });
  };

  /* ── Draft formulir ───────────────────────────────────── */
  const muatDraf = (tgl) => {
    const ada = cariCatatan(tgl);
    state.adaCatatan = !!ada;
    state.draf = ada
      ? {
          omzet: ada.omzet, pengeluaran: ada.pengeluaran,
          jumlahTransaksi: ada.jumlahTransaksi,
          item: (ada.item || []).map((i) => ({ ...i })),
          catatan: ada.catatan || '',
        }
      : { omzet: 0, pengeluaran: 0, jumlahTransaksi: 0, item: [], catatan: '' };
  };

  /* ═══════════════ TAB: CATAT ═══════════════ */
  const renderCatat = (root) => {
    const w = warung();
    if (!w) {
      root.innerHTML = `<div class="card"><div class="card__body">${Inti.kosong({
        ikon: 'store', judul: 'Isi data warung dulu',
        pesan: 'Sebelum mencatat penjualan, isi nama dan lokasi warung Anda.',
        aksi: '<button class="btn btn--pri" data-pindah="warung">Isi Data Warung</button>',
      })}</div></div>`;
      Inti.qa('[data-pindah]', root).forEach((b) =>
        b.addEventListener('click', () => pindah(b.dataset.pindah))
      );
      return;
    }

    if (!state.draf || state.draf._tgl !== state.tgl) {
      muatDraf(state.tgl);
      state.draf._tgl = state.tgl;
    }
    const d = state.draf;

    root.innerHTML = `
      <div class="card">
        <div class="card__body" style="padding-bottom:12px">
          <div class="toolbar" style="margin-bottom:0">
            <button class="btn btn--sm btn--icon" id="hariLalu" aria-label="Hari sebelumnya">${Inti.ikon('kiri', '', 15)}</button>
            <div style="flex:1;text-align:center;min-width:0">
              <div style="font-weight:700" id="labelTgl">${Inti.esc(Inti.labelHari(state.tgl))}</div>
              <input type="date" class="inp" id="tgl" value="${state.tgl}" style="margin-top:5px;padding:7px 10px">
            </div>
            <button class="btn btn--sm btn--icon" id="hariDepan" aria-label="Hari berikutnya">${Inti.ikon('kanan', '', 15)}</button>
          </div>
          ${state.adaCatatan ? `<div class="notis notis--hijau" style="margin:12px 0 0">${Inti.ikon('check', '', 18)}<span>Catatan untuk hari ini sudah ada. Mengubah lalu menyimpan akan menimpa yang lama.</span></div>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card__head"><h3>Pendapatan & Pengeluaran</h3></div>
        <div class="card__body">
          <div class="field">
            <label for="omzet">Pendapatan hari ini (omzet)</label>
            <div class="inp--gabung inp"><span>Rp</span><input class="inp" id="omzet" inputmode="numeric" placeholder="0" value="${formatUang(d.omzet)}"></div>
          </div>
          <div class="field">
            <label for="pengeluaran">Pengeluaran (belanja, dll.)</label>
            <div class="inp--gabung inp"><span>Rp</span><input class="inp" id="pengeluaran" inputmode="numeric" placeholder="0" value="${formatUang(d.pengeluaran)}"></div>
            <span class="hint">Kosongkan bila tidak ada. Laba dihitung dari pendapatan dikurangi pengeluaran.</span>
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="trx">Jumlah transaksi (pembeli)</label>
            <input class="inp" id="trx" inputmode="numeric" placeholder="0" value="${d.jumlahTransaksi || ''}">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__head">
          <h3>Rincian barang (opsional)</h3>
          <div class="card__spacer"></div>
          <button class="btn btn--sm" id="tambahItem">${Inti.ikon('plus', '', 14)} Tambah</button>
        </div>
        <div class="card__body" id="daftarItem"></div>
      </div>

      <div class="card">
        <div class="card__body">
          <div class="field" style="margin-bottom:0">
            <label for="catatanHari">Catatan (opsional)</label>
            <textarea class="inp" id="catatanHari" rows="2" placeholder="Mis. ramai karena ada hajatan">${Inti.esc(d.catatan)}</textarea>
          </div>
        </div>
      </div>

      <button class="btn btn--pri btn--blok" id="simpan" style="margin-bottom:15px">
        ${Inti.ikon('save')} Simpan Catatan ${Inti.esc(Inti.labelHari(state.tgl))}
      </button>
    `;

    pasangUang(Inti.q('#omzet', root));
    pasangUang(Inti.q('#pengeluaran', root));

    const gambarItem = () => {
      const wadah = Inti.q('#daftarItem', root);
      if (!state.draf.item.length) {
        wadah.innerHTML = `<p class="dim kecil" style="margin:0">Belum ada rincian. Tekan "Tambah" bila ingin mencatat barang yang terjual (berguna untuk melihat barang terlaris).</p>`;
        return;
      }
      wadah.innerHTML = state.draf.item.map((it, i) => `
        <div class="tumpuk" data-item="${i}" style="margin-bottom:11px;padding-bottom:11px;border-bottom:1px solid var(--line-2)">
          <input class="inp" data-f="nama" placeholder="Nama barang" value="${Inti.esc(it.nama || '')}">
          <div style="display:flex;gap:8px">
            <div class="inp inp--gabung" style="flex:1"><span>Jml</span><input class="inp" data-f="jumlah" inputmode="numeric" placeholder="0" value="${it.jumlah || ''}"></div>
            <div class="inp inp--gabung" style="flex:1.4"><span>Rp</span><input class="inp" data-f="harga" inputmode="numeric" placeholder="0" value="${formatUang(it.harga)}"></div>
            <button class="btn btn--sm btn--icon btn--dgr" data-hapus-item="${i}" aria-label="Hapus baris">${Inti.ikon('trash', '', 14)}</button>
          </div>
        </div>`).join('');

      Inti.qa('[data-item]', wadah).forEach((baris) => {
        const i = Number(baris.dataset.item);
        Inti.qa('[data-f]', baris).forEach((inp) => {
          inp.addEventListener('input', () => {
            const f = inp.dataset.f;
            state.draf.item[i][f] = f === 'nama' ? inp.value : (f === 'jumlah' ? Number(inp.value.replace(/[^0-9]/g, '')) || 0 : bacaUang(inp));
          });
        });
        const harga = Inti.q('[data-f="harga"]', baris);
        if (harga) pasangUang(harga);
      });
      Inti.qa('[data-hapus-item]', wadah).forEach((b) =>
        b.addEventListener('click', () => {
          state.draf.item.splice(Number(b.dataset.hapusItem), 1);
          gambarItem();
        })
      );
    };
    gambarItem();

    Inti.q('#tambahItem', root).addEventListener('click', () => {
      state.draf.item.push({ nama: '', jumlah: 0, harga: 0 });
      gambarItem();
      const baris = Inti.qa('[data-item]', root).pop();
      const nama = baris && Inti.q('[data-f="nama"]', baris);
      if (nama) nama.focus();
    });

    const gantiTgl = (tgl) => {
      state.tgl = tgl;
      state.draf = null;
      render();
    };
    Inti.q('#tgl', root).addEventListener('change', (e) => gantiTgl(e.target.value || Inti.hariIni()));
    Inti.q('#hariLalu', root).addEventListener('click', () => gantiTgl(Inti.geserHari(state.tgl, -1)));
    Inti.q('#hariDepan', root).addEventListener('click', () => {
      const besok = Inti.geserHari(state.tgl, 1);
      if (besok <= Inti.hariIni()) gantiTgl(besok);
      else Inti.toast('Tidak bisa mencatat tanggal yang belum tiba', 'info');
    });

    Inti.q('#simpan', root).addEventListener('click', () => {
      const omzet = bacaUang(Inti.q('#omzet', root));
      const pengeluaran = bacaUang(Inti.q('#pengeluaran', root));
      const jumlahTransaksi = Number(Inti.q('#trx', root).value.replace(/[^0-9]/g, '')) || 0;
      const catatanHari = Inti.q('#catatanHari', root).value.trim();

      if (!omzet && !pengeluaran && !jumlahTransaksi && !state.draf.item.length) {
        Inti.toast('Isi minimal pendapatan atau pengeluaran', 'err');
        return;
      }

      simpanCatatan({
        id: (cariCatatan(state.tgl) || {}).id || Data.uid('ct'),
        tgl: state.tgl,
        omzet, pengeluaran, jumlahTransaksi,
        item: state.draf.item.filter((i) => i.nama && i.jumlah),
        catatan: catatanHari,
        dicatat: new Date().toISOString(),
      });
      state.draf = null;
      Inti.toast('Catatan ' + Inti.labelHari(state.tgl).toLowerCase() + ' tersimpan', 'ok');
      render();
    });
  };

  /* ═══════════════ TAB: RIWAYAT ═══════════════ */
  const renderRiwayat = (root) => {
    const daftar = Data.urut(catatan());
    if (!daftar.length) {
      root.innerHTML = `<div class="card"><div class="card__body">${Inti.kosong({
        ikon: 'chart', judul: 'Belum ada catatan',
        pesan: 'Catatan penjualan harian Anda akan tampil di sini setelah disimpan.',
        aksi: '<button class="btn btn--pri" data-pindah="catat">Catat Sekarang</button>',
      })}</div></div>`;
      Inti.qa('[data-pindah]', root).forEach((b) =>
        b.addEventListener('click', () => pindah(b.dataset.pindah))
      );
      return;
    }

    const r = Data.ringkas(daftar);
    const hari = Data.perHari(daftar, 14);
    const terlaris = Data.itemTerlaris(daftar, 6);

    root.innerHTML = `
      <div class="hero">
        <div class="hero__label">Total pendapatan tercatat</div>
        <div class="hero__val">${Inti.rupiah(r.totalOmzet)}</div>
        <div class="hero__sub">${r.hariTercatat} hari tercatat · rata-rata ${Inti.rupiah(r.rataOmzet)}/hari</div>
        <div class="hero__baris">
          <div><div class="hero__k">Laba</div><div class="hero__v">${Inti.rupiah(r.laba)}</div></div>
          <div><div class="hero__k">Pengeluaran</div><div class="hero__v">${Inti.rupiah(r.totalPengeluaran)}</div></div>
          <div><div class="hero__k">Transaksi</div><div class="hero__v">${Inti.angka(r.totalTransaksi)}</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card__head"><h3>14 hari terakhir</h3></div>
        <div class="card__body">
          ${Inti.grafikBatang(hari.map((h) => ({ label: String(Number(h.tgl.slice(8, 10))), nilai: h.omzet })), { tinggi: 140, format: (n) => Inti.angka(n / 1000) + 'rb' })}
        </div>
      </div>

      ${terlaris.length ? `
      <div class="card">
        <div class="card__head"><h3>Barang terlaris</h3></div>
        <div class="card__body">
          <div class="tumpuk">
            ${terlaris.map((t) => `
              <div class="kv"><span class="kv__k">${Inti.esc(t.nama)}</span>
              <span class="kv__v">${Inti.angka(t.jumlah)} terjual</span></div>`).join('')}
          </div>
        </div>
      </div>` : ''}

      <div class="sect">
        <h2>Daftar catatan</h2>
        <div class="sect__spacer"></div>
        <button class="btn btn--sm" id="unduhCsv">${Inti.ikon('download', '', 14)} CSV</button>
      </div>

      <div class="card">
        <div class="tablewrap">
          <table class="tbl" id="tblRiwayat">
            <thead><tr><th>Tanggal</th><th class="num">Pendapatan</th><th class="num">Laba</th><th class="aksi">Aksi</th></tr></thead>
            <tbody>
              ${daftar.map((c) => `
                <tr>
                  <td><b>${Inti.esc(Inti.labelHari(c.tgl))}</b>${c.catatan ? `<div class="dim" style="font-size:11.5px">${Inti.esc(c.catatan)}</div>` : ''}</td>
                  <td class="num">${Inti.rupiah(c.omzet)}<div class="dim" style="font-size:11.5px">${Inti.angka(c.jumlahTransaksi)} transaksi</div></td>
                  <td class="num">${Inti.rupiah((c.omzet || 0) - (c.pengeluaran || 0))}</td>
                  <td class="aksi">
                    <button class="btn btn--sm btn--icon" data-ubah="${c.tgl}" title="Ubah">${Inti.ikon('edit', '', 14)}</button>
                    <button class="btn btn--sm btn--icon btn--dgr" data-hapus="${c.tgl}" title="Hapus">${Inti.ikon('trash', '', 14)}</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    Inti.tabelResponsif(root);

    Inti.qa('[data-ubah]', root).forEach((b) =>
      b.addEventListener('click', () => {
        state.tgl = b.dataset.ubah;
        state.draf = null;
        pindah('catat');
      })
    );
    Inti.qa('[data-hapus]', root).forEach((b) =>
      b.addEventListener('click', async () => {
        const tgl = b.dataset.hapus;
        const ya = await Inti.konfirmasi({
          judul: 'Hapus catatan ini?',
          pesan: 'Catatan tanggal ' + Inti.tglID(tgl) + ' akan dihapus permanen.',
          labelYa: 'Hapus', bahaya: true,
        });
        if (ya) { hapusCatatan(tgl); Inti.toast('Catatan dihapus', 'ok'); render(); }
      })
    );
    Inti.q('#unduhCsv', root).addEventListener('click', () => {
      const baris = ['Tanggal,Pendapatan,Pengeluaran,Laba,JumlahTransaksi'];
      for (const c of daftar) {
        baris.push([c.tgl, c.omzet || 0, c.pengeluaran || 0, (c.omzet || 0) - (c.pengeluaran || 0), c.jumlahTransaksi || 0].join(','));
      }
      Inti.unduh(`penjualan-${warung() ? warung().nama.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'warung'}.csv`, baris.join('\n'), 'text/csv');
      Inti.toast('CSV diunduh', 'ok');
    });
  };

  /* ═══════════════ TAB: KIRIM ═══════════════ */
  const rentang = () => {
    const daftar = Data.urut(catatan());
    if (state.periodeKirim === 'semua') return daftar;
    const hari = state.periodeKirim === '7' ? 7 : 30;
    const batas = Inti.geserHari(Inti.hariIni(), -(hari - 1));
    return daftar.filter((c) => c.tgl >= batas);
  };

  const renderKirim = (root) => {
    const w = warung();
    if (!w) {
      root.innerHTML = `<div class="card"><div class="card__body">${Inti.kosong({
        ikon: 'store', judul: 'Isi data warung dulu',
        pesan: 'Laporan perlu memuat nama dan lokasi warung Anda.',
        aksi: '<button class="btn btn--pri" data-pindah="warung">Isi Data Warung</button>',
      })}</div></div>`;
      Inti.qa('[data-pindah]', root).forEach((b) =>
        b.addEventListener('click', () => pindah(b.dataset.pindah))
      );
      return;
    }

    const pakai = rentang();
    const r = Data.ringkas(pakai);
    const terkirim = db().meta && db().meta.terkirim;

    root.innerHTML = `
      <div class="card">
        <div class="card__head">
          <h3>Periode laporan</h3>
          <div class="card__spacer"></div>
          <div class="seg" id="segPeriode">
            <button data-p="semua" class="${state.periodeKirim === 'semua' ? 'on' : ''}">Semua</button>
            <button data-p="30" class="${state.periodeKirim === '30' ? 'on' : ''}">30 hari</button>
            <button data-p="7" class="${state.periodeKirim === '7' ? 'on' : ''}">7 hari</button>
          </div>
        </div>
        <div class="card__body">
          ${pakai.length ? `
            <div class="kv"><span class="kv__k">Jumlah hari</span><span class="kv__v">${r.hariTercatat} hari</span></div>
            <div class="kv"><span class="kv__k">Total pendapatan</span><span class="kv__v">${Inti.rupiah(r.totalOmzet)}</span></div>
            <div class="kv"><span class="kv__k">Total pengeluaran</span><span class="kv__v">${Inti.rupiah(r.totalPengeluaran)}</span></div>
            <div class="kv"><span class="kv__k">Laba</span><span class="kv__v">${Inti.rupiah(r.laba)}</span></div>
            <div class="kv"><span class="kv__k">Jumlah transaksi</span><span class="kv__v">${Inti.angka(r.totalTransaksi)}</span></div>
            <div class="kv"><span class="kv__k">Rentang</span><span class="kv__v">${Inti.tglPendek(r.pertama)} – ${Inti.tglPendek(r.terakhir)}</span></div>
          ` : Inti.kosong({
            ikon: 'chart', judul: 'Belum ada catatan',
            pesan: 'Catat penjualan harian dulu, lalu kembali ke sini untuk mengirim laporan.',
          })}
        </div>
        ${terkirim ? `<div class="card__foot"><span class="dim kecil">Terakhir dikirim: ${Inti.esc(Inti.waktuID(terkirim))}</span></div>` : ''}
      </div>

      <div class="card">
        <div class="card__head"><h3>Cara mengirim ke pengelola</h3></div>
        <div class="card__body">
          <div class="seg" id="segCara" style="margin-bottom:13px">
            <button data-cara="berkas" class="${state.caraKirim === 'berkas' ? 'on' : ''}">Lewat berkas</button>
            <button data-cara="pesan" class="${state.caraKirim === 'pesan' ? 'on' : ''}">Lewat pesan</button>
          </div>
          <div id="caraIsi"></div>
        </div>
      </div>

      <div class="card">
        <div class="card__head"><h3>Ringkasan siap kirim</h3>
          <div class="card__spacer"></div>
          <button class="btn btn--sm" id="salin">${Inti.ikon('copy', '', 14)} Salin</button>
        </div>
        <div class="card__body">
          <pre class="mono kecil" id="teksRingkas" style="white-space:pre-wrap;margin:0;color:var(--t2)">${Inti.esc(teksRingkasan(w, pakai, r))}</pre>
        </div>
      </div>

      <div class="baris-tombol" style="margin-bottom:15px" id="aksiKirim"></div>
    `;

    // Dua cara mengirim: lewat berkas (paling rapi) atau lewat pesan
    // (salin-tempel, andal di dalam APK karena tidak butuh unduh berkas).
    const gambarCara = () => {
      const isi = Inti.q('#caraIsi', root);
      const aksi = Inti.q('#aksiKirim', root);
      const ada = pakai.length > 0;
      if (state.caraKirim === 'berkas') {
        isi.innerHTML = `
          <ol class="aturan">
            <li>Tekan <b>Unduh berkas laporan</b>. Berkas tersimpan di folder Unduhan HP Anda.</li>
            <li>Tekan <b>Kirim lewat WhatsApp</b>, lalu <b>lampirkan berkas</b> tadi pada obrolan.</li>
          </ol>
          <p class="dim kecil" style="margin:12px 0 0">Cara ini paling rapi karena pengelola bisa mengimpor berkasnya langsung.</p>`;
        aksi.innerHTML = `
          <button class="btn btn--pri" id="unduh" style="flex:1" ${ada ? '' : 'disabled'}>${Inti.ikon('download')} Unduh berkas laporan</button>
          <button class="btn btn--wa" id="wa" style="flex:1" ${ada ? '' : 'disabled'}>${Inti.ikon('whatsapp')} Kirim lewat WhatsApp</button>`;
        const unduh = Inti.q('#unduh', root);
        if (unduh) unduh.addEventListener('click', () => {
          Inti.unduh(Data.namaBerkasLaporan(w), Data.teksLaporan(w, pakai), 'application/json');
          const d = db();
          d.meta = { ...(d.meta || {}), terkirim: new Date().toISOString() };
          S.simpanSegera();
          Inti.toast('Berkas laporan diunduh', 'ok');
          setTimeout(render, 400);
        });
        const wa = Inti.q('#wa', root);
        if (wa) wa.addEventListener('click', () => {
          Inti.bukaWA(w.waPengelola || '', teksRingkasan(w, pakai, r));
          Inti.toast('Lampirkan berkas laporan pada obrolan', 'info');
        });
      } else {
        isi.innerHTML = `
          <ol class="aturan">
            <li>Tekan <b>Kirim lewat WhatsApp</b>. Ringkasan terisi otomatis.</li>
            <li>Bila pengelola ingin data harian lengkap, tekan <b>Salin rincian</b> lalu tempelkan di obrolan.</li>
          </ol>
          <p class="dim kecil" style="margin:12px 0 0">Cara ini cocok dipakai dari dalam aplikasi karena tidak perlu mengunduh berkas.</p>`;
        aksi.innerHTML = `
          <button class="btn btn--wa" id="wa2" style="flex:1" ${ada ? '' : 'disabled'}>${Inti.ikon('whatsapp')} Kirim lewat WhatsApp</button>
          <button class="btn" id="salinRinci" style="flex:1" ${ada ? '' : 'disabled'}>${Inti.ikon('copy')} Salin rincian</button>`;
        const wa2 = Inti.q('#wa2', root);
        if (wa2) wa2.addEventListener('click', () => {
          Inti.bukaWA(w.waPengelola || '', teksRingkasan(w, pakai, r));
          const d = db();
          d.meta = { ...(d.meta || {}), terkirim: new Date().toISOString() };
          S.simpanSegera();
        });
        const sr = Inti.q('#salinRinci', root);
        if (sr) sr.addEventListener('click', async () => {
          const ok = await Inti.salin(teksRincian(w, pakai, r));
          Inti.toast(ok ? 'Rincian disalin, tempel di obrolan' : 'Gagal menyalin', ok ? 'ok' : 'err');
        });
      }
    };
    gambarCara();

    Inti.qa('#segPeriode button', root).forEach((b) =>
      b.addEventListener('click', () => { state.periodeKirim = b.dataset.p; render(); })
    );
    Inti.qa('#segCara button', root).forEach((b) =>
      b.addEventListener('click', () => { state.caraKirim = b.dataset.cara; render(); })
    );
    Inti.q('#salin', root).addEventListener('click', async () => {
      const ok = await Inti.salin(teksRingkasan(w, pakai, r));
      Inti.toast(ok ? 'Ringkasan disalin' : 'Gagal menyalin', ok ? 'ok' : 'err');
    });
  };

  // Rincian per hari dalam bentuk teks, untuk ditempel di obrolan WhatsApp.
  const teksRincian = (w, pakai, r) => {
    const baris = [
      `Rincian harian — ${w.nama}`,
      `Rentang: ${Inti.tglID(r.pertama)} – ${Inti.tglID(r.terakhir)}`,
      '',
      'Tanggal | Pendapatan | Pengeluaran | Laba | Trx',
    ];
    for (const c of pakai) {
      baris.push([
        Inti.tglPendek(c.tgl),
        Inti.rupiah(c.omzet),
        Inti.rupiah(c.pengeluaran),
        Inti.rupiah((c.omzet || 0) - (c.pengeluaran || 0)),
        Inti.angka(c.jumlahTransaksi),
      ].join(' | '));
    }
    baris.push('');
    baris.push(`TOTAL: ${Inti.rupiah(r.totalOmzet)} | Laba ${Inti.rupiah(r.laba)} | ${Inti.angka(r.totalTransaksi)} trx`);
    return baris.join('\n');
  };

  const teksRingkasan = (w, pakai, r) => {
    const baris = [
      `*Laporan Warung Go Digital*`,
      `Warung: ${w.nama}`,
      w.pemilik ? `Pemilik: ${w.pemilik}` : '',
      w.alamat ? `Lokasi: ${w.alamat}` : '',
      '',
      `Hari tercatat: ${r.hariTercatat}`,
      `Total pendapatan: ${Inti.rupiah(r.totalOmzet)}`,
      `Total pengeluaran: ${Inti.rupiah(r.totalPengeluaran)}`,
      `Laba: ${Inti.rupiah(r.laba)}`,
      `Jumlah transaksi: ${Inti.angka(r.totalTransaksi)}`,
      r.pertama ? `Rentang: ${Inti.tglID(r.pertama)} – ${Inti.tglID(r.terakhir)}` : '',
      '',
      `Dikirim: ${Inti.waktuID(new Date().toISOString())}`,
    ];
    return baris.filter((b) => b !== '').join('\n');
  };

  /* ═══════════════ TAB: WARUNG ═══════════════ */
  const renderWarung = (root) => {
    const w = warung() || { id: '', nama: '', pemilik: '', wa: '', waPengelola: '', alamat: '', jenis: '', lat: null, lng: null };
    const jumlahCatatan = catatan().length;

    root.innerHTML = `
      <div class="card">
        <div class="card__head"><h3>Data warung</h3></div>
        <div class="card__body">
          <div class="field">
            <label for="nama">Nama warung</label>
            <input class="inp" id="nama" value="${Inti.esc(w.nama)}" placeholder="Mis. Warung Bu Sari">
          </div>
          <div class="field">
            <label for="pemilik">Nama pemilik</label>
            <input class="inp" id="pemilik" value="${Inti.esc(w.pemilik)}" placeholder="Nama Anda">
          </div>
          <div class="field">
            <label for="jenis">Jenis usaha</label>
            <input class="inp" id="jenis" value="${Inti.esc(w.jenis)}" placeholder="Mis. Makanan, Minuman, Kelontong">
          </div>
          <div class="field">
            <label for="wa">Nomor WhatsApp warung</label>
            <input class="inp" id="wa" inputmode="tel" value="${Inti.esc(w.wa)}" placeholder="62812xxxxxxx">
            <span class="hint">Diawali 62, tanpa tanda + atau spasi.</span>
          </div>
          <div class="field">
            <label for="waPengelola">Nomor WhatsApp pengelola</label>
            <input class="inp" id="waPengelola" inputmode="tel" value="${Inti.esc(w.waPengelola || '')}" placeholder="62812xxxxxxx">
            <span class="hint">Nomor tujuan kirim laporan. Tanyakan ke pengelola Warung Go Digital bila belum tahu.</span>
          </div>
          <div class="field">
            <label for="alamat">Alamat / lokasi jualan</label>
            <textarea class="inp" id="alamat" rows="2" placeholder="Mis. Jl. Melati No. 12, Sleman">${Inti.esc(w.alamat)}</textarea>
          </div>
          <div class="baris-tombol" style="margin-bottom:13px">
            <button class="btn btn--sm" id="ambilLokasi">${Inti.ikon('pin', '', 14)} Ambil titik lokasi</button>
            ${w.lat ? `<span class="pill pill--hijau">Titik tersimpan</span>` : ''}
          </div>
          ${w.lat ? `<div class="kv"><span class="kv__k">Titik peta</span><span class="kv__v mono kecil">${Number(w.lat).toFixed(5)}, ${Number(w.lng).toFixed(5)}</span></div>` : ''}
        </div>
        <div class="card__foot">
          <button class="btn btn--pri btn--blok" id="simpanWarung">${Inti.ikon('save')} Simpan Data Warung</button>
        </div>
      </div>

      <div class="card">
        <div class="card__head"><h3>Data di perangkat ini</h3></div>
        <div class="card__body">
          <p class="dim kecil" style="margin-top:0">Semua catatan tersimpan di HP ini saja. Pengelola tidak dapat membuka HP Anda; Anda yang mengirim laporan lewat tab <b>Kirim</b>.</p>
          <div class="kv"><span class="kv__k">Catatan tersimpan</span><span class="kv__v">${jumlahCatatan} hari</span></div>
          <div class="kv"><span class="kv__k">Kode warung</span><span class="kv__v mono kecil">${Inti.esc(w.id || '—')}</span></div>
        </div>
        <div class="card__foot">
          <div class="baris-tombol">
            <button class="btn btn--sm" id="ekspor">${Inti.ikon('download', '', 14)} Cadangkan semua</button>
            <button class="btn btn--sm" id="impor">${Inti.ikon('upload', '', 14)} Pulihkan cadangan</button>
            <button class="btn btn--sm btn--dgr" id="hapusSemua">${Inti.ikon('trash', '', 14)} Hapus semua</button>
          </div>
          <input type="file" id="fileImpor" accept="application/json" hidden>
        </div>
      </div>
    `;

    Inti.q('#ambilLokasi', root).addEventListener('click', () => {
      if (!navigator.geolocation) { Inti.toast('Perangkat tidak mendukung lokasi', 'err'); return; }
      Inti.toast('Mengambil lokasi...', 'info');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const w2 = warung() || { id: Data.uid('wr'), nama: '', pemilik: '', wa: '', alamat: '', jenis: '', lat: null, lng: null };
          w2.lat = pos.coords.latitude;
          w2.lng = pos.coords.longitude;
          simpanWarung(w2);
          Inti.toast('Titik lokasi tersimpan', 'ok');
          render();
        },
        () => Inti.toast('Gagal mengambil lokasi. Isi alamat manual saja.', 'err'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    Inti.q('#simpanWarung', root).addEventListener('click', () => {
      const nama = Inti.q('#nama', root).value.trim();
      if (!nama) { Inti.toast('Nama warung wajib diisi', 'err'); return; }
      const lama = warung() || {};
      simpanWarung({
        id: lama.id || Data.uid('wr'),
        nama,
        pemilik: Inti.q('#pemilik', root).value.trim(),
        jenis: Inti.q('#jenis', root).value.trim(),
        wa: Inti.q('#wa', root).value.replace(/[^0-9]/g, ''),
        waPengelola: Inti.q('#waPengelola', root).value.replace(/[^0-9]/g, ''),
        alamat: Inti.q('#alamat', root).value.trim(),
        lat: lama.lat ?? null,
        lng: lama.lng ?? null,
      });
      Inti.toast('Data warung tersimpan', 'ok');
      render();
    });

    Inti.q('#ekspor', root).addEventListener('click', () => {
      Inti.unduh('cadangan-warung-' + Inti.hariIni() + '.json', JSON.stringify(db(), null, 2), 'application/json');
      Inti.toast('Cadangan diunduh', 'ok');
    });

    const inpImpor = Inti.q('#fileImpor', root);
    Inti.q('#impor', root).addEventListener('click', () => inpImpor.click());
    inpImpor.addEventListener('change', () => {
      const f = inpImpor.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const isi = JSON.parse(rd.result);
          if (!isi || !isi.meta) throw new Error('bukan berkas cadangan');
          S.ganti(isi);
          Inti.toast('Cadangan dipulihkan', 'ok');
          render();
        } catch (e) {
          Inti.toast('Berkas tidak dikenali', 'err');
        }
      };
      rd.readAsText(f);
      inpImpor.value = '';
    });

    Inti.q('#hapusSemua', root).addEventListener('click', async () => {
      const ya = await Inti.konfirmasi({
        judul: 'Hapus semua data?',
        pesan: 'Seluruh catatan penjualan dan data warung di HP ini akan dihapus permanen.',
        labelYa: 'Ya, hapus semua', bahaya: true,
      });
      if (ya) { S.hapusSemua(); state.draf = null; Inti.toast('Semua data dihapus', 'ok'); render(); }
    });
  };

  /* ═══════════════ Kerangka ═══════════════ */
  const TAB = [
    { id: 'catat', label: 'Catat', ic: 'plus', judul: 'Catat Penjualan', sub: 'Pendapatan harian warung' },
    { id: 'riwayat', label: 'Riwayat', ic: 'chart', judul: 'Riwayat', sub: 'Rekap penjualan Anda' },
    { id: 'kirim', label: 'Kirim', ic: 'send', judul: 'Kirim Laporan', sub: 'Ke pengelola Warung Go' },
    { id: 'warung', label: 'Warung', ic: 'store', judul: 'Data Warung', sub: 'Profil & pengaturan' },
  ];

  const bangunTabbar = () => {
    const tb = Inti.q('#tabbar');
    tb.innerHTML = TAB.map((t) => `
      <button class="tabbar__item ${state.tab === t.id ? 'on' : ''}" data-tab="${t.id}">
        ${Inti.ikon(t.ic, '', 21)}<span>${t.label}</span>
      </button>`).join('');
    Inti.qa('[data-tab]', tb).forEach((b) =>
      b.addEventListener('click', () => pindah(b.dataset.tab))
    );
  };

  const pindah = (tab) => {
    state.tab = TAB.some((t) => t.id === tab) ? tab : 'catat';
    if (state.tab === 'catat' && !state.draf) { muatDraf(state.tgl); state.draf._tgl = state.tgl; }
    render();
  };

  const render = () => {
    const t = TAB.find((x) => x.id === state.tab) || TAB[0];
    Inti.q('#judul').textContent = t.judul;
    Inti.q('#sub').textContent = t.sub;
    document.title = t.judul + ' — Warung Go';
    const view = Inti.q('#view');
    view.innerHTML = '';
    try {
      if (t.id === 'catat') renderCatat(view);
      else if (t.id === 'riwayat') renderRiwayat(view);
      else if (t.id === 'kirim') renderKirim(view);
      else renderWarung(view);
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="card"><div class="card__body">${Inti.kosong({
        ikon: 'alert', judul: 'Terjadi kesalahan', pesan: e.message,
        aksi: '<button class="btn btn--pri" onclick="location.reload()">Muat ulang</button>',
      })}</div></div>`;
    }
    bangunTabbar();
    window.scrollTo(0, 0);
  };

  const bantuan = () => {
    const m = Inti.modal({
      judul: 'Cara pakai aplikasi ini',
      isi: `
        <ol class="aturan">
          <li><b>Catat</b> — isi pendapatan, pengeluaran, dan jumlah transaksi tiap hari.</li>
          <li><b>Riwayat</b> — lihat rekap dan barang terlaris Anda.</li>
          <li><b>Kirim</b> — unduh berkas laporan lalu kirim ke pengelola lewat WhatsApp.</li>
          <li><b>Warung</b> — lengkapi nama dan lokasi warung Anda.</li>
        </ol>
        <div class="notis notis--biru" style="margin-top:14px">${Inti.ikon('info', '', 18)}<span>Catatan Anda tersimpan di HP ini saja. Pengelola hanya menerima laporan yang Anda kirim, dan tidak dapat membuka catatan Anda yang lain.</span></div>
        <div class="notis notis--kuning">${Inti.ikon('alert', '', 18)}<span>Ingat mencadangkan data secara berkala lewat tab Warung, agar aman bila berganti HP.</span></div>`,
      aksi: '<button class="btn btn--pri" data-tutup>Mengerti</button>',
    });
    Inti.qa('[data-tutup]', m).forEach((b) => b.addEventListener('click', Inti.tutupModal));
  };

  const mulai = () => {
    S.load();
    Inti.q('#btnBantuan').innerHTML = Inti.ikon('info', '', 16);
    Inti.q('#btnBantuan').addEventListener('click', bantuan);
    muatDraf(state.tgl);
    state.draf._tgl = state.tgl;
    // Kunjungan pertama: arahkan ke pengisian data warung.
    if (!warung()) state.tab = 'warung';
    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
