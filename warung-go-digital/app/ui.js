/* ══════════════════════════════════════════════════════════
   ui.js — Pustaka antarmuka
   Ikon, notifikasi, modal, panel samping, grafik, dan
   pembantu render kecil yang dipakai seluruh modul.
   ══════════════════════════════════════════════════════════ */

const UI = (() => {
  /* ── Ikon (gaya Lucide, garis 2px) ─────────────────────── */
  const PATHS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11a1 1 0 001 1h14a1 1 0 001-1V9"/><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.4"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    book: '<path d="M4 4a2 2 0 012-2h13v18H6a2 2 0 01-2-2z"/><path d="M8 7h7M8 11h7"/>',
    megaphone: '<path d="M3 11v2a1 1 0 001 1h2l3 4V6L6 10H4a1 1 0 00-1 1z"/><path d="M13 8.5a4 4 0 010 7"/><path d="M16.5 6a8 8 0 010 12"/>',
    camera: '<path d="M3 8a2 2 0 012-2h1.5l1.2-2h6.6l1.2 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><circle cx="12" cy="12.5" r="3.4"/>',
    chart: '<path d="M3 20h18"/><path d="M6 20V11M11 20V5M16 20v-6M21 20v-9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    edit: '<path d="M17 3l4 4L8 20l-5 1 1-5z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    upload: '<path d="M12 21V9M7 13l5-5 5 5"/><path d="M4 4h16"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 19h2v2h-2M14 21h2M21 14h-2"/>',
    whatsapp: '<path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3.5 20.5l1.7-4.8A8.5 8.5 0 1121 11.5z"/><path d="M8.5 8.2c.3-.7 1.5-.6 1.8.1l.6 1.4c.2.4 0 .8-.3 1.1l-.6.5c.5 1.1 1.4 2 2.5 2.5l.5-.6c.3-.3.7-.5 1.1-.3l1.4.6c.7.3.8 1.5.1 1.8-1.9.9-4.5-.6-6-2.1-1.5-1.5-3-4.1-2.1-6z"/>',
    maps: '<path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    refresh: '<path d="M21 12a9 9 0 01-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0115.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<path d="M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="3.6"/><path d="M22 20v-2a4 4 0 00-3-3.9"/><path d="M16.5 3.6a4 4 0 010 6.9"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 17h12v4H6z"/>',
    send: '<path d="M21 3L3 10l7 3 3 7z"/><path d="M21 3l-9 9"/>',
    eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.8"/><path d="M21 16l-5-5-8 8"/>',
    link: '<path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    save: '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M8 3v6h7M8 21v-7h8v7"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  };

  // Ikon selalu diberi lebar/tinggi bawaan. Tanpa ini, SVG tanpa aturan CSS
  // akan membengkak memenuhi wadahnya (ikon kaca pembesar pernah jadi 218px).
  // Aturan CSS seperti `.btn svg` tetap menimpa nilai ini bila perlu.
  const icon = (name, cls = '', ukuran = 18) => {
    const p = PATHS[name] || PATHS.info;
    return `<svg class="${cls}" width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  };

  /* ── Teks aman ─────────────────────────────────────────── */
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  /* ── Warna avatar dari nama ────────────────────────────── */
  const PALET = ['#2f7d4f', '#b3730a', '#1e5fbf', '#6d3fd6', '#b32a2f', '#0f766e', '#9a3412', '#4f46e5'];
  const warnaDari = (s) => {
    let h = 0;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return PALET[h % PALET.length];
  };

  const inisial = (nama) =>
    String(nama || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  /* ── Bintang ───────────────────────────────────────────── */
  const bintang = (skor, besar = false) => {
    const n = Math.round(Number(skor) || 0);
    let out = `<span class="stars${besar ? ' stars--lg' : ''}" title="${Number(skor).toFixed(1)} dari 5">`;
    for (let i = 1; i <= 5; i++)
      out += icon('star', i <= n ? 'star--on' : 'star--off');
    return out + '</span>';
  };

  /* ── Notifikasi ────────────────────────────────────────── */
  const toast = (pesan, jenis = 'ok') => {
    const box = q('#toasts');
    if (!box) return;
    const ic = jenis === 'ok' ? 'check' : jenis === 'err' ? 'alert' : 'info';
    const t = el(`<div class="toast toast--${jenis}">${icon(ic)}<span>${esc(pesan)}</span></div>`);
    box.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 240);
    }, 3200);
  };

  /* ── Modal ─────────────────────────────────────────────── */
  let modalBuka = null;

  const modal = ({ judul, isi, kaki, lebar = false, onBuka }) => {
    tutupModal();
    const box = q('#modal');
    box.innerHTML = `
      <div class="modal__bg" data-tutup></div>
      <div class="modal__box${lebar ? ' modal__box--wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal__head">
          <h3>${esc(judul)}</h3>
          <div class="modal__spacer"></div>
          <button class="modal__x" data-tutup aria-label="Tutup">${icon('x')}</button>
        </div>
        <div class="modal__body">${isi}</div>
        ${kaki ? `<div class="modal__foot">${kaki}</div>` : ''}
      </div>`;
    box.classList.add('open');
    modalBuka = box;

    qa('[data-tutup]', box).forEach((b) => b.addEventListener('click', tutupModal));
    document.addEventListener('keydown', escKey);
    if (onBuka) onBuka(box);
    return box;
  };

  const tutupModal = () => {
    const box = q('#modal');
    if (box) { box.classList.remove('open'); box.innerHTML = ''; }
    modalBuka = null;
    document.removeEventListener('keydown', escKey);
  };

  const escKey = (e) => { if (e.key === 'Escape') tutupModal(); };

  const konfirmasi = ({ judul, pesan, labelYa = 'Ya, lanjutkan', bahaya = false }) =>
    new Promise((res) => {
      modal({
        judul,
        isi: `<p style="margin:0;color:var(--t2)">${pesan}</p>`,
        kaki: `
          <div class="spacer"></div>
          <button class="btn" data-batal>Batal</button>
          <button class="btn ${bahaya ? 'btn--dgr' : 'btn--pri'}" data-ya>${esc(labelYa)}</button>`,
        onBuka: (box) => {
          q('[data-batal]', box).onclick = () => { tutupModal(); res(false); };
          q('[data-ya]', box).onclick = () => { tutupModal(); res(true); };
        },
      });
    });

  /* ── Panel samping ─────────────────────────────────────── */
  const drawer = ({ judul, isi, kaki }) => {
    const d = q('#drawer');
    d.innerHTML = `
      <div class="drawer__head">
        <h3 style="font-size:15px">${esc(judul)}</h3>
        <div class="modal__spacer"></div>
        <button class="modal__x" data-dtutup aria-label="Tutup">${icon('x')}</button>
      </div>
      <div class="drawer__body">${isi}</div>
      ${kaki ? `<div class="modal__foot">${kaki}</div>` : ''}`;
    d.classList.add('open');
    qa('[data-dtutup]', d).forEach((b) => b.addEventListener('click', tutupDrawer));
    return d;
  };

  const tutupDrawer = () => {
    const d = q('#drawer');
    if (d) { d.classList.remove('open'); d.innerHTML = ''; }
  };

  /* ── Grafik batang bertumpuk ───────────────────────────── */
  const grafikTren = (data) => {
    const max = Math.max(1, ...data.map((d) => d.total));
    const cols = data.map((d) => {
      const hp = (d.paket / max) * 100;
      const hl = (d.langganan / max) * 100;
      return `
        <div class="chart__col">
          <span class="chart__tip">${Store.rupiah(d.total).replace('Rp ', '')}</span>
          <div class="chart__stack" title="${Store.labelPeriode(d.periode)}: ${Store.rupiah(d.total)}">
            <div class="chart__bar chart__bar--lang" style="height:${hl}%"></div>
            <div class="chart__bar chart__bar--paket" style="height:${hp}%"></div>
          </div>
          <span class="chart__lbl">${d.label}</span>
        </div>`;
    }).join('');
    return `<div class="chart">${cols}</div>`;
  };

  /* ── Grafik garis sederhana (SVG) ──────────────────────── */
  const grafikGaris = (titik, { min, max, tinggi = 150, warna = '#3b82f6', format = (v) => v }) => {
    if (!titik.length) return '';
    const w = 600, h = tinggi, pad = 26;
    const lo = min ?? Math.min(...titik.map((t) => t.v));
    const hi = max ?? Math.max(...titik.map((t) => t.v));
    const span = hi - lo || 1;
    const X = (i) => pad + (i / Math.max(1, titik.length - 1)) * (w - pad * 2);
    const Y = (v) => h - pad - ((v - lo) / span) * (h - pad * 2);
    const d = titik.map((t, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(t.v).toFixed(1)}`).join(' ');
    const area = `${d} L${X(titik.length - 1).toFixed(1)},${h - pad} L${X(0).toFixed(1)},${h - pad} Z`;
    const id = 'g' + Math.random().toString(36).slice(2, 7);
    const akhir = titik[titik.length - 1];
    return `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${tinggi}px;overflow:visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${warna}" stop-opacity="0.26"/>
            <stop offset="100%" stop-color="${warna}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#${id})"/>
        <path d="${d}" fill="none" stroke="${warna}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${X(titik.length - 1).toFixed(1)}" cy="${Y(akhir.v).toFixed(1)}" r="4.5" fill="${warna}" stroke="#fff" stroke-width="2"/>
        <text x="${pad}" y="${h - 6}" font-size="11" fill="#8a948d" font-family="JetBrains Mono, monospace">${format(lo)}</text>
        <text x="${w - pad}" y="${h - 6}" font-size="11" fill="#8a948d" text-anchor="end" font-family="JetBrains Mono, monospace">${format(hi)}</text>
      </svg>`;
  };

  /* ── Unduh berkas ──────────────────────────────────────── */
  const unduh = (nama, isi, tipe = 'text/plain;charset=utf-8') => {
    const blob = new Blob([isi], { type: tipe });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  /* ── Salin ─────────────────────────────────────────────── */
  const salin = async (teks, pesan = 'Disalin ke papan klip') => {
    try {
      await navigator.clipboard.writeText(teks);
      toast(pesan, 'ok');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = teks;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(pesan, 'ok'); }
      catch { toast('Gagal menyalin', 'err'); }
      ta.remove();
    }
  };

  /* ── Komponen kecil ────────────────────────────────────── */
  const stat = ({ ikon, warna = 'amber', label, nilai, sub, tren }) => {
    let subHtml = sub || '';
    if (tren !== undefined && tren !== null) {
      const naik = tren >= 0;
      subHtml = `<span class="trend trend--${naik ? 'naik' : 'turun'}">${naik ? '▲' : '▼'} ${Math.abs(tren).toFixed(1)}%</span> <span class="dim">vs bulan lalu</span>`;
    }
    return `
      <div class="stat">
        <div class="stat__top">
          <span class="stat__ic stat__ic--${warna}">${icon(ikon)}</span>
          <span class="stat__label">${esc(label)}</span>
        </div>
        <div class="stat__val">${nilai}</div>
        ${subHtml ? `<div class="stat__sub">${subHtml}</div>` : ''}
      </div>`;
  };

  const kosong = ({ ikon = 'info', judul, pesan, aksi = '' }) => `
    <div class="empty">
      ${icon(ikon)}
      <h3>${esc(judul)}</h3>
      <p>${esc(pesan)}</p>
      ${aksi}
    </div>`;

  const lencanaStatus = (s) => {
    const map = {
      aktif: ['hijau', 'Aktif'], pending: ['kuning', 'Menunggu'], nonaktif: ['abu', 'Nonaktif'],
      lunas: ['hijau', 'Lunas'], batal: ['merah', 'Batal'],
      draf: ['abu', 'Draf'], siap: ['biru', 'Siap'], terbit: ['hijau', 'Terbit'],
    };
    const [w, t] = map[s] || ['abu', s];
    return `<span class="badge badge--${w}"><span class="dot dot--${w}"></span>${esc(t)}</span>`;
  };

  const who = (nama, meta = '') => `
    <div class="who">
      <div class="who__ava" style="background:${warnaDari(nama)}">${esc(inisial(nama))}</div>
      <div>
        <div class="who__name">${esc(nama)}</div>
        ${meta ? `<div class="who__meta">${esc(meta)}</div>` : ''}
      </div>
    </div>`;

  /* Salin judul kolom ke tiap sel sebagai data-label. Dipakai CSS untuk
     menumpuk tabel jadi kartu di layar ponsel, tanpa mengubah tiap modul. */
  const tabelResponsif = (root = document) => {
    qa('table.tbl', root).forEach((tb) => {
      const judul = [...tb.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      tb.querySelectorAll('tbody tr').forEach((tr) => {
        [...tr.children].forEach((td, i) => {
          if (td.tagName !== 'TD') return;
          const label = judul[i] || '';
          if (label && !td.hasAttribute('data-label')) td.setAttribute('data-label', label);
        });
      });
      tb.setAttribute('data-responsif', '1');
    });
  };

  return {
    icon, esc, q, qa, el, warnaDari, inisial, bintang,
    toast, modal, tutupModal, konfirmasi, drawer, tutupDrawer,
    grafikTren, grafikGaris, unduh, salin, stat, kosong, lencanaStatus, who,
    tabelResponsif,
  };
})();

if (typeof window !== 'undefined') window.UI = UI;
