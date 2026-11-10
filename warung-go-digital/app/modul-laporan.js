/* ══════════════════════════════════════════════════════════
   modul-laporan.js — Laporan Bulanan
   Laporan lengkap per bulan: pendapatan, transaksi, warung,
   rating, promosi, foto, katalog. Bisa dicetak dan diekspor.
   ══════════════════════════════════════════════════════════ */

(() => {
  let periode = null;

  App.register('laporan', {
    label: 'Laporan Bulanan', judul: 'Laporan Bulanan', ic: 'chart', grup: 'Keuangan',

    render(root) {
      const daftar = Store.daftarPeriode();
      if (!periode || !daftar.includes(periode)) periode = daftar[0];

      if (!Store.all('transaksi').length) {
        root.innerHTML = `<div class="card"><div class="card__body">${UI.kosong({
          ikon: 'chart',
          judul: 'Belum ada data laporan',
          pesan: 'Laporan bulanan disusun otomatis setelah ada transaksi tercatat.',
          aksi: `<button class="btn btn--pri" data-aksi="transaksi">${UI.icon('plus')} Catat Transaksi</button>`,
        })}</div></div>`;
        UI.qa('[data-aksi]', root).forEach((b) =>
          b.addEventListener('click', () => App.pergi(b.dataset.aksi))
        );
        return;
      }

      const lap = Store.laporanBulanan(periode);
      const tren = Store.trenPendapatan(6);
      const idx = daftar.indexOf(periode);
      const periodeLalu = daftar[idx + 1];
      const lapLalu = periodeLalu ? Store.laporanBulanan(periodeLalu) : null;
      const tumbuh = lapLalu && lapLalu.pendapatan.total
        ? ((lap.pendapatan.total - lapLalu.pendapatan.total) / lapLalu.pendapatan.total) * 100 : 0;

      const topW = Store.topWarung(10).map((w) => ({
        ...w,
        bulanIni: Store.where('transaksi', (t) => t.warungId === w.id && Store.periodeDari(t.tgl) === periode && t.status === 'lunas')
          .reduce((s, t) => s + t.jumlah, 0),
      })).filter((w) => w.bulanIni > 0).sort((a, b) => b.bulanIni - a.bulanIni);

      root.innerHTML = `
        <div class="sect">
          <div>
            <h2>Laporan ${lap.label}</h2>
            <p class="muted" style="margin:2px 0 0;font-size:12.5px">Disusun otomatis dari seluruh data transaksi, rating, dan promosi.</p>
          </div>
          <div class="sect__spacer"></div>
          <select class="sel" id="pilihPeriode" style="width:auto">
            ${daftar.map((p) => `<option value="${p}" ${p === periode ? 'selected' : ''}>${Store.labelPeriode(p)}</option>`).join('')}
          </select>
          <button class="btn" id="unduhLap">${UI.icon('download')} Unduh Teks</button>
          <button class="btn btn--pri" id="cetakLap">${UI.icon('printer')} Cetak Laporan</button>
        </div>

        <div class="grid grid--4" style="margin-bottom:15px">
          ${UI.stat({ ikon: 'wallet', warna: 'amber', label: 'Pendapatan', nilai: Store.rupiah(lap.pendapatan.total), tren: lapLalu ? tumbuh : null })}
          ${UI.stat({ ikon: 'chart', warna: 'biru', label: 'Transaksi Lunas', nilai: Store.angka(lap.transaksi.lunas), sub: lap.transaksi.pending + ' menunggu · ' + lap.transaksi.batal + ' batal' })}
          ${UI.stat({ ikon: 'store', warna: 'hijau', label: 'Warung Aktif', nilai: Store.angka(lap.warung.aktif), sub: '+' + lap.warung.baru + ' warung baru' })}
          ${UI.stat({ ikon: 'star', warna: 'ungu', label: 'Rating Maps', nilai: lap.rating.rataMaps.toFixed(2), sub: lap.rating.ulasanBaru + ' ulasan baru' })}
        </div>

        <div class="grid grid--2-1" style="margin-bottom:15px">
          <div class="card">
            <div class="card__head"><h3>Tren Pendapatan</h3><div class="card__spacer"></div>
              <div class="legend">
                <span class="legend__it"><span class="legend__sw" style="background:var(--amber)"></span>Paket</span>
                <span class="legend__it"><span class="legend__sw" style="background:var(--leaf)"></span>Langganan</span>
              </div>
            </div>
            <div class="card__body">${UI.grafikTren(tren)}</div>
          </div>

          <div class="card">
            <div class="card__head"><h3>Rincian Pendapatan</h3></div>
            <div class="card__body">
              <div class="kv"><span class="kv__k">Paket (sekali bayar)</span><span class="kv__v">${Store.rupiah(lap.pendapatan.paket)}</span></div>
              <div class="kv"><span class="kv__k"><span class="dim">${lap.pendapatan.transaksiPaket} transaksi</span></span><span class="kv__v"></span></div>
              <div class="kv"><span class="kv__k">Langganan bulanan</span><span class="kv__v">${Store.rupiah(lap.pendapatan.langganan)}</span></div>
              <div class="kv"><span class="kv__k"><span class="dim">${lap.pendapatan.transaksiLangganan} transaksi</span></span><span class="kv__v"></span></div>
              <div class="kv" style="border-top:2px solid var(--line);margin-top:7px;padding-top:12px">
                <span class="kv__k" style="font-weight:700;color:var(--t1)">Total diterima</span>
                <span class="kv__v" style="font-size:16px;color:var(--leaf)">${Store.rupiah(lap.pendapatan.total)}</span>
              </div>
              <div class="kv"><span class="kv__k">Masih menunggu</span><span class="kv__v" style="color:var(--amber)">${Store.rupiah(lap.transaksi.nilaiPending)}</span></div>
            </div>
          </div>
        </div>

        <div class="grid grid--3" style="margin-bottom:15px">
          <div class="card">
            <div class="card__head"><h3>Metode Pembayaran</h3></div>
            <div class="card__body">
              ${lap.metode.length ? lap.metode.map((m, i) => {
                const total = lap.metode.reduce((s, x) => s + x.jumlah, 0);
                const warna = ['var(--amber)', 'var(--leaf)', 'var(--biru)', 'var(--ungu)'][i % 4];
                return `<div class="kv">
                  <span class="kv__k" style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:${warna}"></span>${UI.esc(m.metode)}</span>
                  <span class="kv__v">${Store.rupiah(m.jumlah)} <span class="dim">${((m.jumlah / total) * 100).toFixed(0)}%</span></span>
                </div>`;
              }).join('') : '<p class="dim" style="margin:0;font-size:12.5px">Belum ada pembayaran bulan ini.</p>'}
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h3>Reputasi &amp; Ulasan</h3></div>
            <div class="card__body">
              <div class="kv"><span class="kv__k">Rating rata-rata Maps</span><span class="kv__v">${lap.rating.rataMaps.toFixed(2)} / 5</span></div>
              <div class="kv"><span class="kv__k">Ulasan baru</span><span class="kv__v">${Store.angka(lap.rating.ulasanBaru)}</span></div>
              <div class="kv"><span class="kv__k">Rata-rata skor baru</span><span class="kv__v">${lap.rating.rataUlasanBaru.toFixed(2)} / 5</span></div>
              <div class="kv"><span class="kv__k">Dari Google Maps</span><span class="kv__v">${lap.rating.sumberMaps}</span></div>
              <div class="kv"><span class="kv__k">Dari panel internal</span><span class="kv__v">${lap.rating.sumberInternal}</span></div>
              <div class="kv"><span class="kv__k">Belum dibalas</span><span class="kv__v" style="color:var(--merah)">${lap.rating.perluBalas}</span></div>
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h3>Promosi &amp; Konten</h3></div>
            <div class="card__body">
              <div class="kv"><span class="kv__k">Promosi dibuat</span><span class="kv__v">${lap.promo.jumlah}</span></div>
              <div class="kv"><span class="kv__k">Promosi aktif</span><span class="kv__v">${lap.promo.aktif}</span></div>
              <div class="kv"><span class="kv__k">Pesan siaran terkirim</span><span class="kv__v">${Store.angka(lap.promo.terkirim)}</span></div>
              <div class="kv"><span class="kv__k">Dibaca</span><span class="kv__v">${Store.angka(lap.promo.dibaca)}</span></div>
              <div class="kv"><span class="kv__k">Klik tautan</span><span class="kv__v">${Store.angka(lap.promo.klik)}</span></div>
              <div class="kv"><span class="kv__k">Foto terbit</span><span class="kv__v">${lap.foto.terbit} / ${lap.foto.jumlah}</span></div>
              <div class="kv"><span class="kv__k">Produk katalog aktif</span><span class="kv__v">${lap.katalog.aktif} / ${lap.katalog.total}</span></div>
            </div>
          </div>
        </div>

        <div class="grid grid--2" style="margin-bottom:15px">
          <div class="card">
            <div class="card__head"><h3>Warung Baru Bulan Ini</h3><div class="card__spacer"></div><span class="badge badge--hijau">${lap.warung.baru}</span></div>
            <div class="card__body">
              ${lap.warung.baruDaftar.length ? lap.warung.baruDaftar.map((w) => `
                <div class="kv">
                  <span class="kv__k">${UI.esc(w.nama)}</span>
                  <span class="kv__v"><span class="badge badge--${w.paket === 'Plus' ? 'ungu' : w.paket === 'Hemat' ? 'biru' : 'abu'}">${w.paket}</span> <span class="dim mono" style="font-size:11px">${Store.tglID(w.tgl)}</span></span>
                </div>`).join('') : '<p class="dim" style="margin:0;font-size:12.5px">Tidak ada warung baru bulan ini.</p>'}
            </div>
          </div>

          <div class="card">
            <div class="card__head"><h3>Kontribusi Warung</h3><div class="card__spacer"></div><span class="dim mono" style="font-size:11px">${lap.label}</span></div>
            <div class="card__body" style="display:grid;gap:11px">
              ${topW.length ? topW.slice(0, 6).map((w) => `
                <div>
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600;font-size:12.5px">${UI.esc(w.nama)}</div>
                      <div class="dim" style="font-size:11px">${w.paket} · ${Store.angka(w.jumlahUlasan)} ulasan</div>
                    </div>
                    <span class="mono" style="font-weight:700;font-size:12.5px">${Store.rupiah(w.bulanIni)}</span>
                  </div>
                  <div class="bar"><div class="bar__fill" style="width:${(w.bulanIni / Math.max(1, topW[0].bulanIni)) * 100}%;background:linear-gradient(90deg,var(--amber),var(--leaf))"></div></div>
                </div>`).join('') : '<p class="dim" style="margin:0;font-size:12.5px">Belum ada pendapatan bulan ini.</p>'}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__head"><h3>Ringkasan &amp; Catatan</h3></div>
          <div class="card__body">
            <p style="margin:0 0 14px;font-size:13.5px;line-height:1.75">${ringkasanTeks(lap, tumbuh, lapLalu)}</p>
            <div class="grid grid--3">
              <div class="note note--ok">${UI.icon('check')}<span><b>Kekuatan:</b> ${kekuatan(lap)}</span></div>
              <div class="note note--warn">${UI.icon('alert')}<span><b>Perhatian:</b> ${perhatian(lap)}</span></div>
              <div class="note note--info">${UI.icon('info')}<span><b>Saran bulan depan:</b> ${saran(lap)}</span></div>
            </div>
          </div>
        </div>

        <p class="dim center" style="font-size:11.5px;margin-top:20px">
          Laporan dibuat ${Store.tglID(lap.dibuat, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · Warung Go Digital
        </p>`;

      UI.q('#pilihPeriode', root).addEventListener('change', (e) => { periode = e.target.value; App.gambar(); });
      UI.q('#unduhLap', root).addEventListener('click', () => {
        UI.unduh(`laporan-warung-go-digital-${periode}.txt`, teksLaporan(lap, topW), 'text/plain;charset=utf-8');
        UI.toast('Laporan diunduh', 'ok');
      });
      UI.q('#cetakLap', root).addEventListener('click', () => cetakLaporan(lap, topW, tren));
    },
  });

  /* ── Narasi laporan ────────────────────────────────────── */
  const ringkasanTeks = (lap, tumbuh, lapLalu) => {
    const arah = !lapLalu ? '' : tumbuh >= 0
      ? ` Pendapatan naik <b>${tumbuh.toFixed(1)}%</b> dibanding ${lapLalu.label}.`
      : ` Pendapatan turun <b>${Math.abs(tumbuh).toFixed(1)}%</b> dibanding ${lapLalu.label}.`;
    return `Pada <b>${lap.label}</b>, Warung Go Digital menerima pendapatan <b>${Store.rupiah(lap.pendapatan.total)}</b> dari <b>${lap.transaksi.lunas} transaksi</b> lunas — terdiri dari ${lap.pendapatan.transaksiPaket} pembelian paket dan ${lap.pendapatan.transaksiLangganan} pembayaran langganan.${arah} Jumlah warung aktif <b>${lap.warung.aktif}</b> dari total ${lap.warung.total} warung terdaftar, dengan rating Google Maps rata-rata <b>${lap.rating.rataMaps.toFixed(2)}</b> dari ${lap.rating.ulasanBaru} ulasan baru.`;
  };

  const kekuatan = (lap) => {
    const kandidat = [
      [lap.pendapatan.langganan, 'pendapatan langganan rutin berjalan stabil'],
      [lap.promo.terkirim * 0.001, `${Store.angka(lap.promo.terkirim)} pesan siaran terjangkau pelanggan`],
      [lap.foto.terbit, `${lap.foto.terbit} foto produk sudah tayang`],
      [lap.rating.rataMaps * 4, `rating Maps ${lap.rating.rataMaps.toFixed(2)} terjaga di atas rata-rata`],
      [lap.warung.aktif, `${lap.warung.aktif} warung aktif beroperasi`],
    ].sort((a, b) => b[0] - a[0]);
    return kandidat[0][1];
  };

  const perhatian = (lap) => {
    if (lap.transaksi.pending > 0) return `${lap.transaksi.pending} tagihan senilai ${Store.rupiah(lap.transaksi.nilaiPending)} belum dibayar.`;
    if (lap.rating.perluBalas > 0) return `${lap.rating.perluBalas} ulasan pelanggan belum dibalas.`;
    if (lap.rating.rataMaps < 4.2) return `rating rata-rata ${lap.rating.rataMaps.toFixed(2)} masih di bawah target 4,2.`;
    if (lap.warung.baru === 0) return 'belum ada warung baru yang bergabung bulan ini.';
    return 'tidak ada masalah mendesak.';
  };

  const saran = (lap) => {
    if (lap.transaksi.pending > 0) return 'kirim pengingat pembayaran via WhatsApp ke warung yang menunggak.';
    if (lap.rating.perluBalas > 0) return 'balas semua ulasan agar pelanggan merasa dihargai.';
    if (lap.promo.jumlah < 3) return 'tambah minimal 3 kampanye promosi agar penjualan warung terdorong.';
    if (lap.foto.jumlah < 6) return 'unggah lebih banyak foto produk untuk memperkuat katalog WhatsApp.';
    if (lap.warung.baru < 2) return 'giatkan penawaran ke warung sekitar untuk menambah mitra baru.';
    return 'pertahankan ritme promosi dan jaga kecepatan balas ulasan.';
  };

  /* ── Teks laporan (unduhan) ────────────────────────────── */
  const teksLaporan = (lap, topW) => {
    const garis = '='.repeat(58);
    const sub = '-'.repeat(58);
    const rp = (n) => Store.rupiah(n);
    return [
      garis,
      '  LAPORAN BULANAN WARUNG GO DIGITAL',
      '  ' + lap.label,
      garis,
      '',
      'RINGKASAN PENDAPATAN',
      sub,
      'Paket (sekali bayar)     : ' + rp(lap.pendapatan.paket) + '  (' + lap.pendapatan.transaksiPaket + ' transaksi)',
      'Langganan bulanan        : ' + rp(lap.pendapatan.langganan) + '  (' + lap.pendapatan.transaksiLangganan + ' transaksi)',
      'TOTAL DITERIMA           : ' + rp(lap.pendapatan.total),
      'Masih menunggu           : ' + rp(lap.transaksi.nilaiPending),
      '',
      'TRANSAKSI',
      sub,
      'Total transaksi          : ' + lap.transaksi.total,
      'Lunas                    : ' + lap.transaksi.lunas,
      'Menunggu                 : ' + lap.transaksi.pending,
      'Batal                    : ' + lap.transaksi.batal,
      '',
      'METODE PEMBAYARAN',
      sub,
      ...(lap.metode.length ? lap.metode.map((m) => m.metode.padEnd(25) + ': ' + rp(m.jumlah)) : ['(belum ada)']),
      '',
      'WARUNG',
      sub,
      'Total terdaftar          : ' + lap.warung.total,
      'Aktif                    : ' + lap.warung.aktif,
      'Baru bulan ini           : ' + lap.warung.baru,
      ...(lap.warung.baruDaftar.length ? lap.warung.baruDaftar.map((w) => '  - ' + w.nama + ' (' + w.paket + ')') : []),
      '',
      'RATING & ULASAN',
      sub,
      'Rating rata-rata Maps    : ' + lap.rating.rataMaps.toFixed(2) + ' / 5',
      'Ulasan baru              : ' + lap.rating.ulasanBaru,
      'Rata-rata skor baru      : ' + lap.rating.rataUlasanBaru.toFixed(2) + ' / 5',
      'Dari Google Maps         : ' + lap.rating.sumberMaps,
      'Dari panel internal      : ' + lap.rating.sumberInternal,
      'Belum dibalas            : ' + lap.rating.perluBalas,
      '',
      'PROMOSI & KONTEN',
      sub,
      'Promosi dibuat           : ' + lap.promo.jumlah,
      'Promosi aktif            : ' + lap.promo.aktif,
      'Pesan siaran terkirim    : ' + lap.promo.terkirim,
      'Pesan dibaca             : ' + lap.promo.dibaca,
      'Klik tautan              : ' + lap.promo.klik,
      'Foto terbit              : ' + lap.foto.terbit + ' / ' + lap.foto.jumlah,
      'Produk katalog aktif     : ' + lap.katalog.aktif + ' / ' + lap.katalog.total,
      '',
      'KONTRIBUSI WARUNG TERATAS',
      sub,
      ...(topW.length ? topW.slice(0, 10).map((w, i) =>
        String(i + 1).padStart(2) + '. ' + w.nama.padEnd(28) + rp(w.bulanIni)) : ['(belum ada)']),
      '',
      'CATATAN',
      sub,
      'Kekuatan  : ' + kekuatan(lap),
      'Perhatian : ' + perhatian(lap),
      'Saran     : ' + saran(lap),
      '',
      garis,
      'Dibuat otomatis oleh Panel Mitra Warung Go Digital',
      Store.tglID(lap.dibuat, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      garis,
    ].join('\n');
  };

  /* ── Cetak laporan ─────────────────────────────────────── */
  const cetakLaporan = (lap, topW, tren) => {
    const win = window.open('', '_blank');
    if (!win) return UI.toast('Popup diblokir browser', 'err');
    const rp = (n) => Store.rupiah(n);
    const maxTren = Math.max(1, ...tren.map((t) => t.total));

    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
      <title>Laporan ${lap.label} — Warung Go Digital</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: system-ui, sans-serif; color: #0d1a12; margin: 0; font-size: 12.5px; line-height: 1.6; }
        .head { display: flex; align-items: center; gap: 14px; border-bottom: 4px solid #f5a524; padding-bottom: 16px; margin-bottom: 22px; }
        .logo { width: 50px; height: 50px; border-radius: 13px; background: #f5a524; display: grid; place-items: center; font-size: 24px; font-weight: 800; }
        h1 { font-size: 21px; margin: 0; }
        .sub { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #888; }
        .periode { margin-left: auto; text-align: right; font-size: 12px; color: #666; }
        h2 { font-size: 14px; margin: 26px 0 11px; padding-bottom: 6px; border-bottom: 1px solid #e6e2d8; text-transform: uppercase; letter-spacing: .07em; color: #4a574f; }
        .kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
        .kpi > div { border: 1px solid #e6e2d8; border-radius: 11px; padding: 13px; }
        .kpi b { display: block; font-size: 9.5px; color: #888; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; }
        .kpi span { font-size: 19px; font-weight: 800; letter-spacing: -.02em; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
        th { text-align: left; background: #faf8f3; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #666; }
        td { padding: 8px 10px; border-bottom: 1px solid #f0ece2; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .chart { display: flex; align-items: flex-end; gap: 9px; height: 130px; margin-top: 10px; }
        .chart > div { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 5px; height: 100%; }
        .bar { width: 100%; max-width: 46px; background: linear-gradient(180deg, #f5a524, #dd8b09); border-radius: 4px 4px 0 0; }
        .lbl { font-size: 10px; color: #666; }
        .catatan { border-left: 3px solid #3ba55d; background: #f4faf6; padding: 11px 14px; border-radius: 0 8px 8px 0; margin-top: 8px; }
        .catatan.warn { border-color: #f5a524; background: #fdf8ee; }
        .catatan.info { border-color: #3b82f6; background: #f2f7ff; }
        .foot { margin-top: 34px; padding-top: 12px; border-top: 1px dashed #ddd; font-size: 10.5px; color: #888; display: flex; justify-content: space-between; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
      </style></head><body>
      <div class="head">
        <div class="logo">W</div>
        <div><h1>Warung Go Digital</h1><div class="sub">Laporan Bulanan</div></div>
        <div class="periode"><b style="font-size:15px">${lap.label}</b><br>Dibuat ${Store.tglID(lap.dibuat, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      <div class="kpi">
        <div><b>Pendapatan</b><span>${rp(lap.pendapatan.total)}</span></div>
        <div><b>Transaksi Lunas</b><span>${lap.transaksi.lunas}</span></div>
        <div><b>Warung Aktif</b><span>${lap.warung.aktif}</span></div>
        <div><b>Rating Maps</b><span>${lap.rating.rataMaps.toFixed(2)}</span></div>
      </div>

      <h2>Pendapatan</h2>
      <table>
        <tr><th>Komponen</th><th class="num">Jumlah</th><th class="num">Transaksi</th></tr>
        <tr><td>Paket (sekali bayar)</td><td class="num">${rp(lap.pendapatan.paket)}</td><td class="num">${lap.pendapatan.transaksiPaket}</td></tr>
        <tr><td>Langganan bulanan</td><td class="num">${rp(lap.pendapatan.langganan)}</td><td class="num">${lap.pendapatan.transaksiLangganan}</td></tr>
        <tr><td><b>Total diterima</b></td><td class="num"><b>${rp(lap.pendapatan.total)}</b></td><td class="num"><b>${lap.transaksi.lunas}</b></td></tr>
        <tr><td>Masih menunggu</td><td class="num">${rp(lap.transaksi.nilaiPending)}</td><td class="num">${lap.transaksi.pending}</td></tr>
      </table>

      <h2>Tren Pendapatan 6 Bulan</h2>
      <div class="chart">
        ${tren.map((t) => `<div><div class="bar" style="height:${(t.total / maxTren) * 100}%"></div><div class="lbl">${t.label}</div></div>`).join('')}
      </div>

      <div class="two">
        <div>
          <h2>Metode Pembayaran</h2>
          <table>
            <tr><th>Metode</th><th class="num">Jumlah</th></tr>
            ${lap.metode.length ? lap.metode.map((m) => `<tr><td>${UI.esc(m.metode)}</td><td class="num">${rp(m.jumlah)}</td></tr>`).join('') : '<tr><td colspan="2">Belum ada</td></tr>'}
          </table>
        </div>
        <div>
          <h2>Rating &amp; Ulasan</h2>
          <table>
            <tr><th>Butir</th><th class="num">Nilai</th></tr>
            <tr><td>Rating rata-rata Maps</td><td class="num">${lap.rating.rataMaps.toFixed(2)} / 5</td></tr>
            <tr><td>Ulasan baru</td><td class="num">${lap.rating.ulasanBaru}</td></tr>
            <tr><td>Dari Google Maps</td><td class="num">${lap.rating.sumberMaps}</td></tr>
            <tr><td>Belum dibalas</td><td class="num">${lap.rating.perluBalas}</td></tr>
          </table>
        </div>
      </div>

      <h2>Promosi &amp; Konten</h2>
      <table>
        <tr><th>Butir</th><th class="num">Nilai</th></tr>
        <tr><td>Promosi dibuat / aktif</td><td class="num">${lap.promo.jumlah} / ${lap.promo.aktif}</td></tr>
        <tr><td>Pesan siaran terkirim</td><td class="num">${lap.promo.terkirim}</td></tr>
        <tr><td>Dibaca / diklik</td><td class="num">${lap.promo.dibaca} / ${lap.promo.klik}</td></tr>
        <tr><td>Foto terbit</td><td class="num">${lap.foto.terbit} / ${lap.foto.jumlah}</td></tr>
        <tr><td>Produk katalog aktif</td><td class="num">${lap.katalog.aktif} / ${lap.katalog.total}</td></tr>
      </table>

      <h2>Kontribusi Warung Teratas</h2>
      <table>
        <tr><th>#</th><th>Warung</th><th>Paket</th><th class="num">Pendapatan</th></tr>
        ${topW.length ? topW.slice(0, 10).map((w, i) => `<tr><td>${i + 1}</td><td>${UI.esc(w.nama)}</td><td>${w.paket}</td><td class="num">${rp(w.bulanIni)}</td></tr>`).join('') : '<tr><td colspan="4">Belum ada</td></tr>'}
      </table>

      <h2>Catatan &amp; Rekomendasi</h2>
      <div class="catatan"><b>Kekuatan:</b> ${kekuatan(lap)}</div>
      <div class="catatan warn"><b>Perhatian:</b> ${perhatian(lap)}</div>
      <div class="catatan info"><b>Saran:</b> ${saran(lap)}</div>

      <div class="foot">
        <span>Warung Go Digital — Etalase Digital untuk Warung &amp; UMKM</span>
        <span>Laporan ${lap.label}</span>
      </div>
      <script>setTimeout(()=>window.print(),600)<\/script>
      </body></html>`);
    win.document.close();
  };
})();
