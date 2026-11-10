/* ══════════════════════════════════════════════════════════
   modul-promosi.js — Promosi Digital
   Tiga jenis promosi: promo di menu, poster digital, dan
   siaran WhatsApp. Termasuk pembuat poster dan pengukur hasil.
   ══════════════════════════════════════════════════════════ */

(() => {
  let tab = 'semua';
  let saring = { warungId: '', aktif: '', cari: '' };

  const JENIS = {
    menu: { label: 'Promo Menu', ikon: 'wallet', warna: 'amber' },
    poster: { label: 'Poster Digital', ikon: 'image', warna: 'ungu' },
    siaran: { label: 'Siaran WhatsApp', ikon: 'whatsapp', warna: 'hijau' },
  };

  App.register('promosi', {
    label: 'Promosi Digital', judul: 'Promosi Digital', ic: 'megaphone', grup: 'Pemasaran',
    badge: () => Store.where('promo', (p) => p.aktif).length,
    cari: (v) => { saring.cari = v; if (App.state.view === 'promosi') App.gambar(); },

    render(root) {
      const semua = Store.all('promo');
      const data = semua.filter((p) => {
        if (tab !== 'semua' && p.jenis !== tab) return false;
        if (saring.warungId && p.warungId !== saring.warungId) return false;
        if (saring.aktif === 'aktif' && !p.aktif) return false;
        if (saring.aktif === 'selesai' && p.aktif) return false;
        if (saring.cari) {
          const w = Store.find('warung', p.warungId);
          if (!((p.nama + ' ' + (w ? w.nama : '')).toLowerCase().includes(saring.cari))) return false;
        }
        return true;
      });

      const aktif = semua.filter((p) => p.aktif);
      const terkirim = semua.reduce((s, p) => s + (p.terkirim || 0), 0);
      const dibaca = semua.reduce((s, p) => s + (p.dibaca || 0), 0);
      const klik = semua.reduce((s, p) => s + (p.klik || 0), 0);

      root.innerHTML = `
        <div class="grid grid--4" style="margin-bottom:15px">
          ${UI.stat({ ikon: 'megaphone', warna: 'amber', label: 'Promosi Berjalan', nilai: Store.angka(aktif.length), sub: 'Dari ' + semua.length + ' kampanye' })}
          ${UI.stat({ ikon: 'send', warna: 'hijau', label: 'Pesan Terkirim', nilai: Store.angka(terkirim), sub: 'Total siaran WA' })}
          ${UI.stat({ ikon: 'eye', warna: 'biru', label: 'Tingkat Dibaca', nilai: (terkirim ? (dibaca / terkirim) * 100 : 0).toFixed(0) + '%', sub: Store.angka(dibaca) + ' pesan dibaca' })}
          ${UI.stat({ ikon: 'chart', warna: 'ungu', label: 'Tingkat Klik', nilai: (terkirim ? (klik / terkirim) * 100 : 0).toFixed(1) + '%', sub: Store.angka(klik) + ' klik tautan' })}
        </div>

        <div class="toolbar">
          <div class="seg" id="segJenis">
            <button data-t="${'semua'}" class="${tab === 'semua' ? 'on' : ''}">Semua</button>
            ${Object.entries(JENIS).map(([k, v]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${v.label}</button>`).join('')}
          </div>
          <div class="toolbar__spacer"></div>
          <select class="sel" id="fWarungPr" style="width:auto">
            <option value="">Semua warung</option>
            ${Store.all('warung').map((w) => `<option value="${w.id}" ${saring.warungId === w.id ? 'selected' : ''}>${UI.esc(w.nama)}</option>`).join('')}
          </select>
          <div class="chips">
            ${[['', 'Semua'], ['aktif', 'Berjalan'], ['selesai', 'Selesai']].map(([v, l]) =>
              `<button class="chip ${saring.aktif === v ? 'on' : ''}" data-akt="${v}">${l}</button>`).join('')}
          </div>
          <button class="btn btn--pri" id="buatPromo">${UI.icon('plus')} Buat Promosi</button>
        </div>

        ${data.length ? `
          <div class="grid grid--2">
            ${data.slice(0, 40).map((p) => kartuPromo(p)).join('')}
          </div>` : `<div class="card"><div class="card__body">${UI.kosong({ ikon: 'megaphone', judul: 'Belum ada promosi', pesan: 'Buat promo menu, poster digital, atau siaran WhatsApp.', aksi: '<button class="btn btn--pri" id="kosongPromo">Buat Promosi</button>' })}</div></div>`}`;

      UI.qa('#segJenis button', root).forEach((b) => b.addEventListener('click', () => { tab = b.dataset.t; App.gambar(); }));
      UI.q('#fWarungPr', root).addEventListener('change', (e) => { saring.warungId = e.target.value; App.gambar(); });
      UI.qa('[data-akt]', root).forEach((c) => c.addEventListener('click', () => { saring.aktif = c.dataset.akt; App.gambar(); }));
      UI.q('#buatPromo', root).addEventListener('click', () => formPromo(null));
      const kp = UI.q('#kosongPromo', root);
      if (kp) kp.addEventListener('click', () => formPromo(null));

      UI.qa('[data-ubah]', root).forEach((b) => b.addEventListener('click', () => formPromo(b.dataset.ubah)));
      UI.qa('[data-hapus]', root).forEach((b) => b.addEventListener('click', async () => {
        const ya = await UI.konfirmasi({ judul: 'Hapus promosi?', pesan: 'Kampanye promosi ini akan dihapus.', labelYa: 'Ya, hapus', bahaya: true });
        if (!ya) return;
        Store.remove('promo', b.dataset.hapus);
        UI.toast('Promosi dihapus', 'ok');
        App.gambar();
      }));
      UI.qa('[data-toggle]', root).forEach((b) => b.addEventListener('click', () => {
        const p = Store.find('promo', b.dataset.toggle);
        Store.update('promo', p.id, { aktif: !p.aktif });
        UI.toast(p.aktif ? 'Promosi dihentikan' : 'Promosi dijalankan', 'ok');
        App.gambar();
      }));
      UI.qa('[data-poster]', root).forEach((b) => b.addEventListener('click', () => lihatPoster(b.dataset.poster)));
      UI.qa('[data-siaran]', root).forEach((b) => b.addEventListener('click', () => lihatSiaran(b.dataset.siaran)));
    },
  });

  /* ── Kartu promosi ─────────────────────────────────────── */
  const kartuPromo = (p) => {
    const w = Store.find('warung', p.warungId);
    const j = JENIS[p.jenis] || JENIS.menu;
    const selesai = new Date(p.selesai) < new Date();
    const persen = p.terkirim ? (p.klik / p.terkirim) * 100 : 0;

    return `
      <div class="card">
        <div class="card__head">
          <span class="stat__ic stat__ic--${j.warna}" style="width:30px;height:30px">${UI.icon(j.ikon)}</span>
          <div style="min-width:0">
            <h3 style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(p.nama)}</h3>
            <div class="dim" style="font-size:11.5px">${UI.esc(w ? w.nama : '—')}</div>
          </div>
          <div class="card__spacer"></div>
          ${p.aktif && !selesai ? '<span class="badge badge--hijau"><span class="dot dot--hijau"></span>Berjalan</span>' : '<span class="badge badge--abu">Selesai</span>'}
        </div>
        <div class="card__body" style="padding:15px 18px">
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:13px">
            <span class="badge badge--${j.warna}">${j.label}</span>
            ${p.diskon ? `<span class="badge badge--merah">Diskon ${p.diskon}%</span>` : ''}
            <span class="badge badge--abu">${Store.tglID(p.mulai)} — ${Store.tglID(p.selesai)}</span>
          </div>

          ${p.jenis === 'siaran' ? `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:13px">
              <div><div class="stat__label" style="font-size:9.5px">Terkirim</div><div class="mono" style="font-weight:700;font-size:15px">${Store.angka(p.terkirim)}</div></div>
              <div><div class="stat__label" style="font-size:9.5px">Dibaca</div><div class="mono" style="font-weight:700;font-size:15px">${Store.angka(p.dibaca)}</div></div>
              <div><div class="stat__label" style="font-size:9.5px">Klik</div><div class="mono" style="font-weight:700;font-size:15px">${Store.angka(p.klik)}</div></div>
            </div>
            <div class="bar" style="margin-bottom:13px"><div class="bar__fill" style="width:${Math.min(100, persen * 4)}%;background:linear-gradient(90deg,var(--leaf),var(--amber))"></div></div>` : ''}

          ${p.jenis === 'poster' ? `
            <div style="height:120px;border-radius:var(--r);overflow:hidden;margin-bottom:13px;background:linear-gradient(160deg,#14512c,#2f8a4e 60%,#58b877);display:grid;place-items:center;color:#fff">
              <div style="text-align:center;padding:12px">
                <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">Warung Go Digital</div>
                <div style="font-family:var(--f-display);font-weight:800;font-size:19px;margin-top:5px">${UI.esc(p.nama)}</div>
              </div>
            </div>` : ''}

          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${p.jenis === 'poster' ? `<button class="btn btn--sm btn--pri" data-poster="${p.id}">${UI.icon('image')} Lihat Poster</button>` : ''}
            ${p.jenis === 'siaran' ? `<button class="btn btn--sm btn--wa" data-siaran="${p.id}">${UI.icon('send')} Pratinjau Siaran</button>` : ''}
            <button class="btn btn--sm" data-toggle="${p.id}">${UI.icon(p.aktif ? 'eye' : 'check')} ${p.aktif ? 'Hentikan' : 'Jalankan'}</button>
            <button class="btn btn--sm" data-ubah="${p.id}">${UI.icon('edit')}</button>
            <button class="btn btn--sm btn--dgr" data-hapus="${p.id}">${UI.icon('trash')}</button>
          </div>
        </div>
      </div>`;
  };

  /* ── Formulir promosi ──────────────────────────────────── */
  const formPromo = (id) => {
    const p = id ? Store.find('promo', id) : null;
    const warung = Store.all('warung');
    const n = p || {
      warungId: warung[0] ? warung[0].id : '', nama: '', jenis: tab === 'semua' ? 'menu' : tab,
      mulai: new Date().toISOString(), selesai: new Date(Date.now() + 14 * 864e5).toISOString(),
      diskon: 10, aktif: true, target: 100, terkirim: 0, dibaca: 0, klik: 0,
    };

    UI.modal({
      judul: p ? 'Ubah Promosi' : 'Buat Promosi Baru',
      isi: `
        <div class="form-grid">
          <div class="field full"><label>Warung</label>
            <select class="sel" id="p-warung">${warung.map((w) => `<option value="${w.id}" ${n.warungId === w.id ? 'selected' : ''}>${UI.esc(w.nama)}</option>`).join('')}</select>
          </div>
          <div class="field full"><label>Jenis promosi</label>
            <select class="sel" id="p-jenis">
              ${Object.entries(JENIS).map(([k, v]) => `<option value="${k}" ${n.jenis === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
          </div>
          <div class="field full"><label>Nama kampanye</label><input class="inp" id="p-nama" value="${UI.esc(n.nama)}" placeholder="Diskon 10% menu utama"></div>
          <div class="field" id="wrapDiskon"><label>Diskon (%)</label><input class="inp" id="p-diskon" type="number" value="${n.diskon || 0}" min="0" max="100"></div>
          <div class="field"><label>Target penerima</label><input class="inp" id="p-target" type="number" value="${n.target || 100}"></div>
          <div class="field"><label>Mulai</label><input class="inp" id="p-mulai" type="date" value="${new Date(n.mulai).toISOString().slice(0, 10)}"></div>
          <div class="field"><label>Selesai</label><input class="inp" id="p-selesai" type="date" value="${new Date(n.selesai).toISOString().slice(0, 10)}"></div>
          <div class="field full"><label>Status</label>
            <select class="sel" id="p-aktif"><option value="1" ${n.aktif ? 'selected' : ''}>Berjalan</option><option value="0" ${!n.aktif ? 'selected' : ''}>Dijeda</option></select>
          </div>
        </div>
        <div class="note note--info" style="margin-top:14px">${UI.icon('info')}
          <span>Untuk <b>siaran WhatsApp</b>, pesan dikirim melalui tautan wa.me ke nomor pelanggan. Untuk <b>poster</b>, poster dibuat otomatis dan bisa diunduh lalu dicetak.</span>
        </div>`,
      kaki: `<button class="btn" data-tutup>Batal</button><div class="spacer"></div><button class="btn btn--pri" id="p-simpan">${UI.icon('save')} Simpan</button>`,
      onBuka: (box) => {
        const aturJenis = () => {
          const j = UI.q('#p-jenis', box).value;
          UI.q('#wrapDiskon', box).style.display = j === 'siaran' ? 'none' : '';
        };
        UI.q('#p-jenis', box).addEventListener('change', aturJenis);
        aturJenis();

        UI.q('#p-simpan', box).addEventListener('click', () => {
          const v = (s) => UI.q(s, box).value;
          const nama = v('#p-nama').trim();
          if (!nama) return UI.toast('Nama kampanye wajib diisi', 'err');
          const jenis = v('#p-jenis');
          const data = {
            warungId: v('#p-warung'), nama, jenis,
            diskon: jenis === 'siaran' ? 0 : (+v('#p-diskon') || 0),
            target: +v('#p-target') || 0,
            mulai: new Date(v('#p-mulai')).toISOString(),
            selesai: new Date(v('#p-selesai')).toISOString(),
            aktif: v('#p-aktif') === '1',
          };
          if (p) { Store.update('promo', p.id, data); UI.toast('Promosi diperbarui', 'ok'); }
          else {
            const target = data.target;
            Store.add('promo', {
              ...data,
              terkirim: jenis === 'siaran' ? 0 : 0,
              dibaca: 0, klik: 0,
            });
            UI.toast('Promosi dibuat', 'ok');
          }
          UI.tutupModal();
          App.gambar();
        });
      },
    });
  };

  /* ── Pembuat poster ────────────────────────────────────── */
  const TEMA = ['hijau', 'amber', 'tinta', 'merah'];

  const lihatPoster = (id) => {
    const p = Store.find('promo', id);
    const w = Store.find('warung', p.warungId);
    let tema = TEMA[0];

    const isiPoster = () => `
      <div class="poster poster--${tema}" id="posterBox">
        <div>
          <div class="poster__brand">Warung Go Digital</div>
          <div class="poster__title" style="margin-top:14px">${UI.esc(w.nama)}</div>
          <div class="poster__sub">${UI.esc(w.alamat)}</div>
        </div>
        <div>
          ${p.diskon ? `<div class="poster__big">${p.diskon}%</div><div class="poster__sub" style="font-weight:600;font-size:15px">${UI.esc(p.nama)}</div>` : `<div class="poster__title" style="font-size:22px">${UI.esc(p.nama)}</div>`}
        </div>
        <div>
          <div style="height:1px;background:currentColor;opacity:.25;margin-bottom:12px"></div>
          <div class="poster__sub" style="font-weight:600">Berlaku ${Store.tglID(p.mulai)} — ${Store.tglID(p.selesai)}</div>
          <div class="poster__foot" style="margin-top:8px">Pesan: wa.me/${UI.esc(w.wa)}</div>
        </div>
      </div>`;

    const gambar = () => {
      const el = UI.q('#posterWrap');
      if (el) el.innerHTML = isiPoster();
    };

    UI.modal({
      judul: 'Poster Digital — ' + w.nama,
      lebar: true,
      isi: `
        <div class="grid grid--2" style="align-items:start">
          <div id="posterWrap" style="max-width:340px">${isiPoster()}</div>
          <div>
            <div class="field" style="margin-bottom:14px">
              <label>Tema warna</label>
              <div class="chips" id="pilihTema">
                ${TEMA.map((t) => `<button class="chip ${t === tema ? 'on' : ''}" data-tema="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
              </div>
            </div>
            <div class="note note--info" style="margin-bottom:14px">${UI.icon('info')}
              <span>Poster berukuran rasio 3:4, siap dicetak A4 atau dibagikan di status WhatsApp dan media sosial.</span>
            </div>
            <div style="display:grid;gap:8px">
              <button class="btn btn--pri" id="cetakPoster">${UI.icon('printer')} Cetak / Simpan PDF</button>
              <button class="btn btn--wa" id="kirimPosterWA">${UI.icon('whatsapp')} Kirim teks ke pemilik</button>
              <button class="btn" id="unduhSVG">${UI.icon('download')} Unduh SVG</button>
            </div>
          </div>
        </div>`,
      onBuka: (box) => {
        UI.qa('[data-tema]', box).forEach((b) => b.addEventListener('click', () => {
          tema = b.dataset.tema;
          UI.qa('[data-tema]', box).forEach((x) => x.classList.toggle('on', x === b));
          gambar();
        }));

        UI.q('#cetakPoster', box).addEventListener('click', () => cetakPoster(p, w, tema));
        UI.q('#kirimPosterWA', box).addEventListener('click', () => {
          const teks = `*${w.nama}*\n${p.nama}${p.diskon ? ` — diskon ${p.diskon}%` : ''}\nBerlaku ${Store.tglID(p.mulai)} sampai ${Store.tglID(p.selesai)}.\n\nPesan: https://wa.me/${w.wa}`;
          window.open(`https://wa.me/${w.wa}?text=${encodeURIComponent(teks)}`, '_blank', 'noopener');
        });
        UI.q('#unduhSVG', box).addEventListener('click', () => {
          UI.unduh('poster-' + p.nama.toLowerCase().replace(/\s+/g, '-') + '.svg', svgPoster(p, w, tema), 'image/svg+xml');
          UI.toast('SVG poster diunduh', 'ok');
        });
      },
    });
  };

  const svgPoster = (p, w, tema) => {
    const warna = {
      hijau: ['#14512c', '#58b877'], amber: ['#b3730a', '#ffcf70'],
      tinta: ['#0d1a12', '#356247'], merah: ['#8c1f22', '#f07277'],
    }[tema] || ['#14512c', '#58b877'];

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${warna[0]}"/><stop offset="100%" stop-color="${warna[1]}"/>
  </linearGradient></defs>
  <rect width="600" height="800" fill="url(#g)"/>
  <text x="48" y="72" font-family="monospace" font-size="14" fill="#ffffff" opacity="0.8" letter-spacing="3">WARUNG GO DIGITAL</text>
  <text x="48" y="150" font-family="sans-serif" font-size="42" font-weight="800" fill="#ffffff">${UI.esc(w.nama)}</text>
  <text x="48" y="186" font-family="sans-serif" font-size="17" fill="#ffffff" opacity="0.85">${UI.esc(w.alamat)}</text>
  ${p.diskon
    ? `<text x="48" y="420" font-family="sans-serif" font-size="150" font-weight="800" fill="#f5a524">${p.diskon}%</text>
       <text x="48" y="470" font-family="sans-serif" font-size="30" font-weight="700" fill="#ffffff">${UI.esc(p.nama)}</text>`
    : `<text x="48" y="400" font-family="sans-serif" font-size="44" font-weight="800" fill="#f5a524">${UI.esc(p.nama)}</text>`}
  <line x1="48" y1="640" x2="552" y2="640" stroke="#ffffff" opacity="0.3"/>
  <text x="48" y="680" font-family="sans-serif" font-size="19" font-weight="600" fill="#ffffff">Berlaku ${UI.esc(Store.tglID(p.mulai))} — ${UI.esc(Store.tglID(p.selesai))}</text>
  <text x="48" y="726" font-family="monospace" font-size="15" fill="#ffffff" opacity="0.8">Pesan: wa.me/${UI.esc(w.wa)}</text>
</svg>`;
  };

  const cetakPoster = (p, w, tema) => {
    const win = window.open('', '_blank');
    if (!win) return UI.toast('Popup diblokir browser', 'err');
    const warna = {
      hijau: ['#14512c', '#58b877'], amber: ['#b3730a', '#ffcf70'],
      tinta: ['#0d1a12', '#356247'], merah: ['#8c1f22', '#f07277'],
    }[tema] || ['#14512c', '#58b877'];

    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Poster — ${UI.esc(p.nama)}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; font-family: system-ui, sans-serif; }
        .poster { width: 210mm; height: 297mm; background: linear-gradient(160deg, ${warna[0]}, ${warna[1]}); color: #fff; padding: 22mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
        .brand { font-size: 11pt; letter-spacing: .2em; text-transform: uppercase; opacity: .85; }
        h1 { font-size: 40pt; margin: 8mm 0 2mm; letter-spacing: -.03em; line-height: 1; }
        .alamat { font-size: 13pt; opacity: .85; }
        .big { font-size: 110pt; font-weight: 800; color: #f5a524; line-height: 1; letter-spacing: -.05em; }
        .nama { font-size: 26pt; font-weight: 700; margin-top: 4mm; }
        .garis { height: 1px; background: rgba(255,255,255,.3); margin-bottom: 6mm; }
        .masa { font-size: 15pt; font-weight: 600; }
        .wa { font-family: monospace; font-size: 12pt; opacity: .85; margin-top: 3mm; }
      </style></head><body>
      <div class="poster">
        <div><div class="brand">Warung Go Digital</div><h1>${UI.esc(w.nama)}</h1><div class="alamat">${UI.esc(w.alamat)}</div></div>
        <div>${p.diskon ? `<div class="big">${p.diskon}%</div><div class="nama">${UI.esc(p.nama)}</div>` : `<div class="nama" style="font-size:34pt">${UI.esc(p.nama)}</div>`}</div>
        <div><div class="garis"></div><div class="masa">Berlaku ${UI.esc(Store.tglID(p.mulai))} — ${UI.esc(Store.tglID(p.selesai))}</div><div class="wa">Pesan: wa.me/${UI.esc(w.wa)}</div></div>
      </div>
      <script>setTimeout(()=>window.print(),500)<\/script>
      </body></html>`);
    win.document.close();
  };

  /* ── Pratinjau siaran ──────────────────────────────────── */
  const lihatSiaran = (id) => {
    const p = Store.find('promo', id);
    const w = Store.find('warung', p.warungId);
    const katalog = Store.where('katalog', (k) => k.warungId === w.id && k.aktif).slice(0, 3);

    const teks = `Halo! 👋\n\n*${w.nama}* punya kabar baik:\n\n` +
      `🎉 *${p.nama}*\n` +
      `📅 Berlaku ${Store.tglID(p.mulai)} — ${Store.tglID(p.selesai)}\n\n` +
      (katalog.length ? `Menu andalan:\n${katalog.map((k) => `• ${k.nama} — ${Store.rupiah(k.harga)}`).join('\n')}\n\n` : '') +
      `Pesan sekarang, balas chat ini ya!\nhttps://wa.me/${w.wa}`;

    UI.modal({
      judul: 'Pratinjau Siaran WhatsApp',
      isi: `
        <div class="grid grid--2" style="align-items:start">
          <div>
            <div class="wa" style="min-height:280px">
              <div class="wa__bubble">${UI.esc(teks)}<div class="wa__time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ✓✓</div></div>
            </div>
            <p class="dim" style="font-size:11.5px;margin:9px 0 0">Pratinjau pesan siaran</p>
          </div>
          <div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px">
              <div class="stat" style="padding:11px 12px"><div class="stat__label" style="font-size:9.5px">Target</div><div class="mono" style="font-weight:700;font-size:16px">${Store.angka(p.target)}</div></div>
              <div class="stat" style="padding:11px 12px"><div class="stat__label" style="font-size:9.5px">Terkirim</div><div class="mono" style="font-weight:700;font-size:16px">${Store.angka(p.terkirim)}</div></div>
              <div class="stat" style="padding:11px 12px"><div class="stat__label" style="font-size:9.5px">Dibaca</div><div class="mono" style="font-weight:700;font-size:16px">${Store.angka(p.dibaca)}</div></div>
            </div>
            <div class="field" style="margin-bottom:12px">
              <label>Nomor tujuan siaran</label>
              <input class="inp mono" id="siaranNomor" placeholder="6281234567890" style="font-size:12.5px">
            </div>
            <div style="display:grid;gap:8px">
              <button class="btn btn--wa" id="kirimSiaran">${UI.icon('send')} Buka WhatsApp &amp; kirim</button>
              <button class="btn" id="salinSiaran">${UI.icon('link')} Salin teks siaran</button>
              <button class="btn" id="catatSiaran">${UI.icon('check')} Tandai terkirim ke ${Store.angka(p.target)}</button>
            </div>
          </div>
        </div>`,
      onBuka: (box) => {
        UI.q('#kirimSiaran', box).addEventListener('click', () => {
          const nomor = UI.q('#siaranNomor', box).value.replace(/\D/g, '');
          if (!nomor) return UI.toast('Masukkan nomor tujuan', 'err');
          window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(teks)}`, '_blank', 'noopener');
        });
        UI.q('#salinSiaran', box).addEventListener('click', () => UI.salin(teks, 'Teks siaran disalin'));
        UI.q('#catatSiaran', box).addEventListener('click', () => {
          const t = p.target;
          Store.update('promo', p.id, {
            terkirim: t, dibaca: Math.floor(t * 0.72), klik: Math.floor(t * 0.18),
          });
          UI.tutupModal();
          UI.toast('Hasil siaran dicatat', 'ok');
          App.gambar();
        });
      },
    });
  };
})();
