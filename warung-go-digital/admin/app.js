/* ══════════════════════════════════════════════════════════
   app.js — Panel Pengelola (Admin Pusat)
   Menerima laporan dari para pemilik warung (lewat berkas
   yang mereka kirim di WhatsApp), lalu menampilkan rekap:
   penjualan harian, pendapatan, dan lokasi tiap warung.

   Hanya pengelola yang memakai panel ini. Pemilik tidak
   dapat melihat data pengelola.
   ══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const S = Data.buatPenyimpanan('wgd-admin-v1');

  const state = {
    tab: 'ringkasan',
    cari: '',
    mitraId: null,
    periode: 14,
  };

  const db = () => S.load();
  const semua = () => Object.values(db().mitra || {});
  const cariMitra = (id) => (db().mitra || {})[id] || null;

  /* ── Impor laporan ────────────────────────────────────── */
  const simpanLaporan = (hasil) => {
    const d = db();
    d.mitra = d.mitra || {};
    const lama = d.mitra[hasil.warung.id];
    const sebelum = lama ? (lama.catatan || []).length : 0;
    const digabung = Data.gabungCatatan(lama ? lama.catatan : [], hasil.catatan);
    d.mitra[hasil.warung.id] = {
      warung: hasil.warung,
      catatan: digabung,
      diimpor: new Date().toISOString(),
    };
    S.simpanSegera();
    return {
      baru: !lama,
      tambah: digabung.length - sebelum,
      total: digabung.length,
    };
  };

  const imporBerkas = (berkas) =>
    new Promise((selesai) => {
      const hasil = { berhasil: [], gagal: [] };
      let sisa = berkas.length;
      if (!sisa) return selesai(hasil);
      for (const f of berkas) {
        const rd = new FileReader();
        rd.onload = () => {
          try {
            hasil.berhasil.push({ nama: f.name, ...simpanLaporan(Data.bacaLaporan(rd.result)) });
          } catch (e) {
            hasil.gagal.push({ nama: f.name, pesan: e.message });
          }
          if (--sisa === 0) selesai(hasil);
        };
        rd.onerror = () => {
          hasil.gagal.push({ nama: f.name, pesan: 'Berkas tidak terbaca' });
          if (--sisa === 0) selesai(hasil);
        };
        rd.readAsText(f);
      }
    });

  /* ── Rekap gabungan ───────────────────────────────────── */
  const rekapGabungan = () => {
    const mitra = semua();
    const hariIni = Inti.hariIni();
    const bulanIni = hariIni.slice(0, 7);
    let omzetHariIni = 0, omzetBulanIni = 0, omzetTotal = 0, trxHariIni = 0, adaHariIni = 0;
    const semuaCatatan = [];

    for (const m of mitra) {
      for (const c of m.catatan || []) {
        const omzet = Number(c.omzet) || 0;
        omzetTotal += omzet;
        semuaCatatan.push({ ...c, warungId: m.warung.id, warung: m.warung.nama });
        if (c.tgl === hariIni) { omzetHariIni += omzet; trxHariIni += Number(c.jumlahTransaksi) || 0; adaHariIni++; }
        if (String(c.tgl).slice(0, 7) === bulanIni) omzetBulanIni += omzet;
      }
    }
    return { jumlahMitra: mitra.length, omzetHariIni, omzetBulanIni, omzetTotal, trxHariIni, adaHariIni, semuaCatatan };
  };

  const grafikGabungan = (hariTerakhir = 14) => {
    const peta = new Map();
    for (const m of semua()) {
      for (const c of m.catatan || []) {
        peta.set(c.tgl, (peta.get(c.tgl) || 0) + (Number(c.omzet) || 0));
      }
    }
    const akhir = [...peta.keys()].sort().pop() || Inti.hariIni();
    const hasil = [];
    for (let i = hariTerakhir - 1; i >= 0; i--) {
      const tgl = Inti.geserHari(akhir, -i);
      hasil.push({ label: String(Number(tgl.slice(8, 10))), nilai: peta.get(tgl) || 0, tgl });
    }
    return hasil;
  };

  const peringkatMitra = () => {
    const hariIni = Inti.hariIni();
    return semua().map((m) => {
      const r = Data.ringkas(m.catatan || []);
      const hari = (m.catatan || []).find((c) => c.tgl === hariIni);
      return {
        ...m,
        ringkas: r,
        omzetHariIni: hari ? Number(hari.omzet) || 0 : 0,
        adaHariIni: !!hari,
        hariSejak: r.terakhir ? Math.round((new Date(hariIni) - new Date(r.terakhir)) / 864e5) : null,
      };
    }).sort((a, b) => b.ringkas.totalOmzet - a.ringkas.totalOmzet);
  };

  /* ═══════════════ TAB: RINGKASAN ═══════════════ */
  const renderRingkasan = (root) => {
    const mitra = semua();
    if (!mitra.length) {
      root.innerHTML = `
        <div class="card"><div class="card__body">${Inti.kosong({
          ikon: 'upload', judul: 'Belum ada laporan masuk',
          pesan: 'Minta pemilik warung mengirim laporan dari aplikasi mereka, lalu impor berkasnya di sini.',
          aksi: '<button class="btn btn--pri" data-pindah="impor">Impor Laporan Pemilik</button>',
        })}</div></div>`;
      Inti.qa('[data-pindah]', root).forEach((b) =>
        b.addEventListener('click', () => pindah(b.dataset.pindah))
      );
      return;
    }

    const r = rekapGabungan();
    const grafik = grafikGabungan(state.periode);
    const peringkat = peringkatMitra();

    root.innerHTML = `
      <div class="hero">
        <div class="hero__label">Pendapatan hari ini (semua mitra)</div>
        <div class="hero__val">${Inti.rupiah(r.omzetHariIni)}</div>
        <div class="hero__sub">${r.adaHariIni} dari ${r.jumlahMitra} mitra sudah mengirim · ${Inti.angka(r.trxHariIni)} transaksi</div>
        <div class="hero__baris">
          <div><div class="hero__k">Bulan ini</div><div class="hero__v">${Inti.rupiah(r.omzetBulanIni)}</div></div>
          <div><div class="hero__k">Total</div><div class="hero__v">${Inti.rupiah(r.omzetTotal)}</div></div>
        </div>
      </div>

      <div class="grid grid--2" style="margin-bottom:15px">
        ${Inti.kartuStat({ ikon: 'store', warna: 'amber', label: 'Mitra terdaftar', nilai: Inti.angka(r.jumlahMitra), sub: 'Warung aktif' })}
        ${Inti.kartuStat({ ikon: 'clock', warna: r.jumlahMitra - r.adaHariIni > 0 ? 'merah' : 'hijau', label: 'Belum kirim hari ini', nilai: Inti.angka(r.jumlahMitra - r.adaHariIni), sub: 'Perlu diingatkan' })}
      </div>

      <div class="card">
        <div class="card__head">
          <h3>Tren pendapatan gabungan</h3>
          <div class="card__spacer"></div>
          <div class="seg" id="segPeriode">
            <button data-p="7" class="${state.periode === 7 ? 'on' : ''}">7 hari</button>
            <button data-p="14" class="${state.periode === 14 ? 'on' : ''}">14 hari</button>
            <button data-p="30" class="${state.periode === 30 ? 'on' : ''}">30 hari</button>
          </div>
        </div>
        <div class="card__body">
          ${Inti.grafikBatang(grafik, { tinggi: 150, format: (n) => Inti.angka(n / 1000) + 'rb' })}
        </div>
      </div>

      <div class="sect"><h2>Warung teratas</h2></div>
      <div class="card">
        <div class="tablewrap">
          <table class="tbl">
            <thead><tr><th>Warung</th><th class="num">Hari ini</th><th class="num">Total</th></tr></thead>
            <tbody>
              ${peringkat.slice(0, 8).map((m) => `
                <tr class="clickable" data-mitra="${Inti.esc(m.warung.id)}">
                  <td>${Inti.avatar(m.warung.nama, m.warung.alamat || 'Tanpa lokasi')}</td>
                  <td class="num">${m.adaHariIni ? Inti.rupiah(m.omzetHariIni) : '<span class="dim">belum kirim</span>'}</td>
                  <td class="num">${Inti.rupiah(m.ringkas.totalOmzet)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    Inti.tabelResponsif(root);

    Inti.qa('#segPeriode button', root).forEach((b) =>
      b.addEventListener('click', () => { state.periode = Number(b.dataset.p); render(); })
    );
    Inti.qa('[data-mitra]', root).forEach((tr) =>
      tr.addEventListener('click', () => bukaMitra(tr.dataset.mitra))
    );
  };

  /* ═══════════════ TAB: MITRA ═══════════════ */
  const renderMitra = (root) => {
    const mitra = semua();
    if (!mitra.length) {
      root.innerHTML = `<div class="card"><div class="card__body">${Inti.kosong({
        ikon: 'store', judul: 'Belum ada mitra',
        pesan: 'Daftar warung mitra akan muncul setelah Anda mengimpor laporan pertama.',
        aksi: '<button class="btn btn--pri" data-pindah="impor">Impor Laporan</button>',
      })}</div></div>`;
      Inti.qa('[data-pindah]', root).forEach((b) =>
        b.addEventListener('click', () => pindah(b.dataset.pindah))
      );
      return;
    }

    const kunci = state.cari.toLowerCase();
    const daftar = peringkatMitra().filter((m) =>
      !kunci || m.warung.nama.toLowerCase().includes(kunci) ||
      (m.warung.pemilik || '').toLowerCase().includes(kunci) ||
      (m.warung.alamat || '').toLowerCase().includes(kunci)
    );

    root.innerHTML = `
      <div class="toolbar">
        <input class="inp" id="cari" placeholder="Cari warung, pemilik, atau lokasi..." value="${Inti.esc(state.cari)}" style="flex:1;min-width:200px">
      </div>
      ${daftar.length ? daftar.map((m) => `
        <div class="card clickable" data-mitra="${Inti.esc(m.warung.id)}" style="cursor:pointer">
          <div class="card__body">
            <div style="display:flex;align-items:center;gap:12px">
              ${Inti.avatar(m.warung.nama, m.warung.jenis || 'Warung')}
              <div style="flex:1;min-width:0;text-align:right">
                <div style="font-weight:800;font-size:16px">${Inti.rupiah(m.ringkas.totalOmzet)}</div>
                <div class="dim kecil">total pendapatan</div>
              </div>
            </div>
            <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:11px">
              ${m.adaHariIni
                ? Inti.lencana('Hari ini ' + Inti.rupiah(m.omzetHariIni), 'hijau')
                : Inti.lencana(m.hariSejak === null ? 'Belum ada catatan' : `Terakhir ${m.hariSejak} hari lalu`, m.hariSejak !== null && m.hariSejak > 3 ? 'merah' : 'kuning')}
              ${Inti.lencana(m.ringkas.hariTercatat + ' hari tercatat')}
            </div>
            ${m.warung.alamat ? `<div class="dim kecil" style="margin-top:9px;display:flex;gap:5px;align-items:flex-start">${Inti.ikon('pin', '', 13)}<span>${Inti.esc(m.warung.alamat)}</span></div>` : ''}
          </div>
        </div>`).join('') : `<div class="card"><div class="card__body">${Inti.kosong({
          ikon: 'filter', judul: 'Tidak ada warung cocok', pesan: 'Ubah kata kunci pencarian Anda.',
        })}</div></div>`}
    `;

    const inp = Inti.q('#cari', root);
    inp.addEventListener('input', () => {
      state.cari = inp.value;
      const pos = inp.selectionStart;
      render();
      const baru = Inti.q('#cari');
      baru.focus();
      baru.setSelectionRange(pos, pos);
    });
    Inti.qa('[data-mitra]', root).forEach((c) =>
      c.addEventListener('click', () => bukaMitra(c.dataset.mitra))
    );
  };

  /* ── Detail satu mitra ────────────────────────────────── */
  const bukaMitra = (id) => {
    state.mitraId = id;
    const m = cariMitra(id);
    if (!m) return;
    const r = Data.ringkas(m.catatan || []);
    const hari = Data.perHari(m.catatan || [], 14);
    const terlaris = Data.itemTerlaris(m.catatan || [], 6);
    const daftar = Data.urut(m.catatan || []);
    const peta = m.warung.lat
      ? `https://www.google.com/maps/search/?api=1&query=${m.warung.lat},${m.warung.lng}`
      : m.warung.alamat
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.warung.nama + ' ' + m.warung.alamat)}`
        : null;

    const mod = Inti.modal({
      judul: m.warung.nama,
      lebar: '680px',
      isi: `
        <div class="hero" style="margin-bottom:15px">
          <div class="hero__label">Total pendapatan</div>
          <div class="hero__val">${Inti.rupiah(r.totalOmzet)}</div>
          <div class="hero__sub">${r.hariTercatat} hari tercatat · rata-rata ${Inti.rupiah(r.rataOmzet)}/hari</div>
          <div class="hero__baris">
            <div><div class="hero__k">Laba</div><div class="hero__v">${Inti.rupiah(r.laba)}</div></div>
            <div><div class="hero__k">Transaksi</div><div class="hero__v">${Inti.angka(r.totalTransaksi)}</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card__head"><h3>Profil warung</h3></div>
          <div class="card__body">
            <div class="kv"><span class="kv__k">Pemilik</span><span class="kv__v">${Inti.esc(m.warung.pemilik || '—')}</span></div>
            <div class="kv"><span class="kv__k">Jenis usaha</span><span class="kv__v">${Inti.esc(m.warung.jenis || '—')}</span></div>
            <div class="kv"><span class="kv__k">Lokasi jualan</span><span class="kv__v">${Inti.esc(m.warung.alamat || '—')}</span></div>
            <div class="kv"><span class="kv__k">WhatsApp</span><span class="kv__v">${Inti.esc(m.warung.wa || '—')}</span></div>
            <div class="kv"><span class="kv__k">Kode warung</span><span class="kv__v mono kecil">${Inti.esc(m.warung.id)}</span></div>
            <div class="kv"><span class="kv__k">Laporan terakhir masuk</span><span class="kv__v">${Inti.esc(Inti.waktuID(m.diimpor))}</span></div>
          </div>
          ${peta ? `<div class="card__foot"><div class="baris-tombol">
            <a class="btn btn--sm" href="${peta}" target="_blank" rel="noopener">${Inti.ikon('maps', '', 14)} Buka di Google Maps</a>
            ${m.warung.wa ? `<button class="btn btn--sm btn--wa" data-wa="${Inti.esc(m.warung.wa)}">${Inti.ikon('whatsapp', '', 14)} Chat pemilik</button>` : ''}
          </div></div>` : ''}
        </div>

        <div class="card">
          <div class="card__head"><h3>14 hari terakhir</h3></div>
          <div class="card__body">
            ${Inti.grafikBatang(hari.map((h) => ({ label: String(Number(h.tgl.slice(8, 10))), nilai: h.omzet })), { tinggi: 130, format: (n) => Inti.angka(n / 1000) + 'rb' })}
          </div>
        </div>

        ${terlaris.length ? `
        <div class="card">
          <div class="card__head"><h3>Barang terlaris</h3></div>
          <div class="card__body"><div class="tumpuk">
            ${terlaris.map((t) => `<div class="kv"><span class="kv__k">${Inti.esc(t.nama)}</span><span class="kv__v">${Inti.angka(t.jumlah)} terjual</span></div>`).join('')}
          </div></div>
        </div>` : ''}

        <div class="card">
          <div class="card__head"><h3>Catatan harian</h3>
            <div class="card__spacer"></div>
            <button class="btn btn--sm" id="unduhMitra">${Inti.ikon('download', '', 14)} CSV</button>
          </div>
          <div class="tablewrap">
            <table class="tbl" id="tblMitra">
              <thead><tr><th>Tanggal</th><th class="num">Pendapatan</th><th class="num">Laba</th><th class="num">Trx</th></tr></thead>
              <tbody>
                ${daftar.map((c) => `
                  <tr>
                    <td>${Inti.esc(Inti.labelHari(c.tgl))}${c.catatan ? `<div class="dim" style="font-size:11.5px">${Inti.esc(c.catatan)}</div>` : ''}</td>
                    <td class="num">${Inti.rupiah(c.omzet)}</td>
                    <td class="num">${Inti.rupiah((c.omzet || 0) - (c.pengeluaran || 0))}</td>
                    <td class="num">${Inti.angka(c.jumlahTransaksi)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="baris-tombol" style="justify-content:flex-end">
          <button class="btn btn--sm btn--dgr" id="hapusMitra">${Inti.ikon('trash', '', 14)} Hapus mitra ini</button>
        </div>
      `,
      aksi: '<button class="btn" data-tutup>Tutup</button>',
    });
    Inti.tabelResponsif(mod);

    const wa = Inti.q('[data-wa]', mod);
    if (wa) wa.addEventListener('click', () =>
      Inti.bukaWA(wa.dataset.wa, `Halo, ini pengelola Warung Go Digital. Terima kasih sudah mengirim laporan.`)
    );

    Inti.q('#unduhMitra', mod).addEventListener('click', () => {
      const baris = ['Tanggal,Pendapatan,Pengeluaran,Laba,JumlahTransaksi'];
      for (const c of daftar) baris.push([c.tgl, c.omzet || 0, c.pengeluaran || 0, (c.omzet || 0) - (c.pengeluaran || 0), c.jumlahTransaksi || 0].join(','));
      Inti.unduh(`laporan-${m.warung.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, baris.join('\n'), 'text/csv');
      Inti.toast('CSV diunduh', 'ok');
    });

    Inti.q('#hapusMitra', mod).addEventListener('click', async () => {
      const ya = await Inti.konfirmasi({
        judul: 'Hapus mitra ini?',
        pesan: 'Seluruh catatan dari ' + m.warung.nama + ' akan dihapus dari panel Anda.',
        labelYa: 'Hapus', bahaya: true,
      });
      if (!ya) return;
      const d = db();
      delete d.mitra[m.warung.id];
      S.simpanSegera();
      Inti.tutupModal();
      Inti.toast('Mitra dihapus', 'ok');
      render();
    });
  };

  /* ═══════════════ TAB: PETA ═══════════════ */
  const renderPeta = (root) => {
    const mitra = semua();
    if (!mitra.length) {
      root.innerHTML = `<div class="card"><div class="card__body">${Inti.kosong({
        ikon: 'pin', judul: 'Belum ada lokasi',
        pesan: 'Lokasi warung muncul setelah pemilik mengirim laporan pertamanya.',
      })}</div></div>`;
      return;
    }

    root.innerHTML = `
      <div class="notis notis--biru">${Inti.ikon('info', '', 18)}<span>Daftar lokasi jualan para mitra. Tekan "Buka peta" untuk melihat titiknya di Google Maps.</span></div>
      ${peringkatMitra().map((m) => {
        const peta = m.warung.lat
          ? `https://www.google.com/maps/search/?api=1&query=${m.warung.lat},${m.warung.lng}`
          : m.warung.alamat
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.warung.nama + ' ' + m.warung.alamat)}`
            : null;
        return `
        <div class="card">
          <div class="card__body">
            <div style="display:flex;align-items:flex-start;gap:11px">
              <div class="stat__ic" style="background:var(--amber-dim);color:#b3730a">${Inti.ikon('pin', '', 17)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:700">${Inti.esc(m.warung.nama)}</div>
                <div class="dim kecil">${Inti.esc(m.warung.alamat || 'Alamat belum diisi')}</div>
                ${m.warung.lat ? `<div class="mono kecil dim" style="margin-top:3px">${Number(m.warung.lat).toFixed(5)}, ${Number(m.warung.lng).toFixed(5)}</div>` : ''}
              </div>
            </div>
            ${peta ? `<div class="baris-tombol" style="margin-top:11px">
              <a class="btn btn--sm" href="${peta}" target="_blank" rel="noopener">${Inti.ikon('maps', '', 14)} Buka peta</a>
              <button class="btn btn--sm" data-mitra="${Inti.esc(m.warung.id)}">${Inti.ikon('eye', '', 14)} Lihat data</button>
            </div>` : ''}
          </div>
        </div>`;
      }).join('')}
    `;
    Inti.qa('[data-mitra]', root).forEach((b) =>
      b.addEventListener('click', () => bukaMitra(b.dataset.mitra))
    );
  };

  /* ═══════════════ TAB: IMPOR ═══════════════ */
  const renderImpor = (root) => {
    const mitra = semua();
    const riwayat = db().meta && db().meta.riwayatImpor ? db().meta.riwayatImpor.slice(0, 8) : [];

    root.innerHTML = `
      <div class="card">
        <div class="card__head"><h3>Cara memasukkan laporan pemilik</h3></div>
        <div class="card__body">
          <ol class="aturan">
            <li>Pemilik membuka aplikasi <b>Warung Go</b> di HP-nya, lalu tab <b>Kirim</b> → <b>Unduh berkas laporan</b>.</li>
            <li>Pemilik mengirim berkas itu ke WhatsApp Anda.</li>
            <li>Di panel ini, tekan <b>Impor laporan</b> dan pilih berkas tersebut. Boleh sekaligus banyak.</li>
          </ol>
          <div class="notis notis--hijau" style="margin-top:14px">${Inti.ikon('check', '', 18)}<span>Catatan dari warung yang sama akan digabung. Tanggal yang sama dipakai yang paling baru.</span></div>
        </div>
        <div class="card__foot">
          <div class="baris-tombol">
            <button class="btn btn--pri" id="pilihBerkas">${Inti.ikon('upload')} Impor laporan</button>
            <button class="btn" id="eksporSemua" ${mitra.length ? '' : 'disabled'}>${Inti.ikon('download')} Cadangkan panel</button>
          </div>
        </div>
      </div>

      <div class="grid grid--2" style="margin-bottom:15px">
        ${Inti.kartuStat({ ikon: 'store', warna: 'amber', label: 'Mitra di panel', nilai: Inti.angka(mitra.length) })}
        ${Inti.kartuStat({ ikon: 'chart', warna: 'hijau', label: 'Total catatan', nilai: Inti.angka(mitra.reduce((s, m) => s + (m.catatan || []).length, 0)) })}
      </div>

      ${riwayat.length ? `
      <div class="card">
        <div class="card__head"><h3>Impor terakhir</h3></div>
        <div class="card__body"><div class="tumpuk">
          ${riwayat.map((x) => `<div class="kv">
            <span class="kv__k">${Inti.esc(x.nama)}<div class="dim" style="font-size:11.5px">${Inti.esc(Inti.waktuID(x.waktu))}</div></span>
            <span class="kv__v">${Inti.esc(x.ringkas)}</span>
          </div>`).join('')}
        </div></div>
      </div>` : ''}

      <div class="card">
        <div class="card__head"><h3>Catatan penting</h3></div>
        <div class="card__body">
          <div class="notis notis--kuning">${Inti.ikon('alert', '', 18)}<span>Panel ini menyimpan data di perangkat Anda. Cadangkan secara berkala lewat tombol <b>Cadangkan panel</b> agar data aman.</span></div>
          <div class="notis notis--biru">${Inti.ikon('shield', '', 18)}<span>Pemilik warung tidak dapat membuka panel ini. Hanya Anda yang melihat data seluruh mitra.</span></div>
        </div>
      </div>
    `;

    Inti.q('#pilihBerkas', root).addEventListener('click', () => Inti.q('#fileImpor').click());
    Inti.q('#eksporSemua', root).addEventListener('click', () => {
      Inti.unduh('cadangan-pengelola-' + Inti.hariIni() + '.json', JSON.stringify(db(), null, 2), 'application/json');
      Inti.toast('Cadangan panel diunduh', 'ok');
    });
  };

  /* ═══════════════ Kerangka ═══════════════ */
  const TAB = [
    { id: 'ringkasan', label: 'Ringkasan', ic: 'dashboard', judul: 'Ringkasan Mitra', sub: 'Semua warung dalam satu layar' },
    { id: 'mitra', label: 'Mitra', ic: 'store', judul: 'Daftar Mitra', sub: 'Pemilik warung terdaftar' },
    { id: 'peta', label: 'Lokasi', ic: 'pin', judul: 'Lokasi Warung', sub: 'Tempat jualan mitra' },
    { id: 'impor', label: 'Impor', ic: 'upload', judul: 'Impor Laporan', sub: 'Masukkan data dari pemilik' },
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
    state.tab = TAB.some((t) => t.id === tab) ? tab : 'ringkasan';
    render();
  };

  const render = () => {
    const t = TAB.find((x) => x.id === state.tab) || TAB[0];
    Inti.q('#judul').textContent = t.judul;
    Inti.q('#sub').textContent = t.sub;
    document.title = t.judul + ' — Warung Go Pengelola';
    const view = Inti.q('#view');
    view.innerHTML = '';
    try {
      if (t.id === 'ringkasan') renderRingkasan(view);
      else if (t.id === 'mitra') renderMitra(view);
      else if (t.id === 'peta') renderPeta(view);
      else renderImpor(view);
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

  const mulai = () => {
    S.load();

    const inp = Inti.q('#fileImpor');
    Inti.q('#btnImpor').addEventListener('click', () => inp.click());
    inp.addEventListener('change', async () => {
      const berkas = Array.from(inp.files || []);
      inp.value = '';
      if (!berkas.length) return;
      const hasil = await imporBerkas(berkas);
      const d = db();
      const riwayat = (d.meta && d.meta.riwayatImpor) || [];
      for (const b of hasil.berhasil) {
        riwayat.unshift({
          nama: b.nama,
          waktu: new Date().toISOString(),
          ringkas: b.baru ? 'Mitra baru' : 'Digabung',
        });
      }
      for (const g of hasil.gagal) {
        riwayat.unshift({ nama: g.nama, waktu: new Date().toISOString(), ringkas: 'Gagal: ' + g.pesan });
      }
      d.meta = { ...(d.meta || {}), riwayatImpor: riwayat.slice(0, 20) };
      S.simpanSegera();

      if (hasil.berhasil.length) {
        Inti.toast(`${hasil.berhasil.length} laporan berhasil diimpor`, 'ok');
      }
      if (hasil.gagal.length) {
        Inti.toast(`${hasil.gagal.length} berkas gagal: ${hasil.gagal[0].pesan}`, 'err');
      }
      if (!hasil.berhasil.length && !hasil.gagal.length) Inti.toast('Tidak ada berkas dipilih', 'info');
      render();
    });

    render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
