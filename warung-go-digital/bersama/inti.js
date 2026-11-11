/* ══════════════════════════════════════════════════════════
   inti.js — bantuan DOM, format, dan komponen tampilan
   Dipakai aplikasi Pemilik (pemilik/) dan Admin (admin/).
   Tidak bergantung pada berkas lain.
   ══════════════════════════════════════════════════════════ */
const Inti = (() => {
  'use strict';

  const IKON = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11a1 1 0 001 1h14a1 1 0 001-1V9"/><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.4"/>',
    cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.6 12.4a2 2 0 002 1.6h8.2a2 2 0 002-1.6L21.5 7H6"/>',
    chart: '<path d="M3 20h18"/><path d="M6 20V11M11 20V5M16 20v-6M21 20v-9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    edit: '<path d="M17 3l4 4L8 20l-5 1 1-5z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    upload: '<path d="M12 21V9M7 13l5-5 5 5"/><path d="M4 4h16"/>',
    whatsapp: '<path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3.5 20.5l1.7-4.8A8.5 8.5 0 1121 11.5z"/><path d="M8.5 8.2c.3-.7 1.5-.6 1.8.1l.6 1.4c.2.4 0 .8-.3 1.1l-.6.5c.5 1.1 1.4 2 2.5 2.5l.5-.6c.3-.3.7-.5 1.1-.3l1.4.6c.7.3.8 1.5.1 1.8-1.9.9-4.5-.6-6-2.1-1.5-1.5-3-4.1-2.1-6z"/>',
    maps: '<path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    refresh: '<path d="M21 12a9 9 0 01-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0115.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<path d="M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="3.6"/><path d="M22 20v-2a4 4 0 00-3-3.9"/><path d="M16.5 3.6a4 4 0 010 6.9"/>',
    send: '<path d="M21 3L3 10l7 3 3 7z"/><path d="M21 3l-9 9"/>',
    eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    link: '<path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"/>',
    save: '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M8 3v6h7M8 21v-7h8v7"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    pin: '<path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    phone: '<path d="M5 3h3l2 5-2 1a12 12 0 006 6l1-2 5 2v3a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    kiri: '<path d="M15 18l-6-6 6-6"/>',
    kanan: '<path d="M9 6l6 6-6 6"/>',
    naik: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    turun: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  };

  /* ── DOM ──────────────────────────────────────────────── */
  const q = (s, akar = document) => akar.querySelector(s);
  const qa = (s, akar = document) => Array.from(akar.querySelectorAll(s));

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const el = (tag, atr = {}, isi = '') => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(atr)) {
      if (k === 'class') n.className = v;
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else n.setAttribute(k, v);
    }
    if (isi) n.innerHTML = isi;
    return n;
  };

  // Ikon selalu punya lebar/tinggi; tanpa itu SVG membengkak memenuhi wadah.
  const ikon = (nama, cls = '', ukuran = 18) => {
    const p = IKON[nama] || IKON.info;
    return `<svg class="${cls}" width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  };

  /* ── Format angka & tanggal ───────────────────────────── */
  const rupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const angka = (n) => (Number(n) || 0).toLocaleString('id-ID');

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BULAN_P = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Tanggal lokal (bukan UTC) dalam bentuk YYYY-MM-DD.
  const hariIni = (d = new Date()) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  };

  const geserHari = (tglStr, delta) => {
    const [y, m, d] = String(tglStr).slice(0, 10).split('-').map(Number);
    return hariIni(new Date(y, m - 1, d + delta));
  };

  const bagian = (t) => {
    const [y, m, d] = String(t || '').slice(0, 10).split('-').map(Number);
    return { y, m, d, sah: !!(y && m && d) };
  };

  const tglID = (t) => {
    const { y, m, d, sah } = bagian(t);
    return sah ? `${d} ${BULAN[m - 1]} ${y}` : '—';
  };

  const tglPendek = (t) => {
    const { y, m, d, sah } = bagian(t);
    return sah ? `${d} ${BULAN_P[m - 1]} ${y}` : '—';
  };

  const namaHari = (t) => {
    const { y, m, d, sah } = bagian(t);
    return sah ? HARI[new Date(y, m - 1, d).getDay()] : '';
  };

  const labelHari = (t) => {
    const ini = hariIni();
    if (t === ini) return 'Hari ini';
    if (t === geserHari(ini, -1)) return 'Kemarin';
    return namaHari(t) + ', ' + tglPendek(t);
  };

  const waktuID = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return `${d.getDate()} ${BULAN_P[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const inisial = (nama) =>
    String(nama || '?').trim().split(/\s+/).slice(0, 2)
      .map((k) => k[0] || '').join('').toUpperCase() || '?';

  const warnaDari = (teks) => {
    let h = 0;
    for (const c of String(teks || '')) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 42% 42%)`;
  };

  /* ── Toast ────────────────────────────────────────────── */
  const toast = (pesan, jenis = 'ok') => {
    let wadah = q('#toasts');
    if (!wadah) {
      wadah = el('div', { class: 'toasts', id: 'toasts' });
      document.body.appendChild(wadah);
    }
    const t = el('div', { class: 'toast toast--' + jenis });
    const ik = jenis === 'err' ? 'alert' : jenis === 'info' ? 'info' : 'check';
    t.innerHTML = `${ikon(ik, 'toast__ic', 16)}<span>${esc(pesan)}</span>`;
    wadah.appendChild(t);
    requestAnimationFrame(() => t.classList.add('tampil'));
    setTimeout(() => {
      t.classList.remove('tampil');
      setTimeout(() => t.remove(), 300);
    }, 2800);
  };

  /* ── Modal & konfirmasi ───────────────────────────────── */
  const modal = ({ judul, isi, aksi = '', lebar = '' }) => {
    const m = q('#modal');
    m.innerHTML = `
      <div class="modal__box" ${lebar ? `style="max-width:${lebar}"` : ''} role="dialog" aria-modal="true">
        <div class="modal__head">
          <h2>${esc(judul)}</h2>
          <button class="modal__x" data-tutup aria-label="Tutup">${ikon('x', '', 18)}</button>
        </div>
        <div class="modal__body">${isi}</div>
        ${aksi ? `<div class="modal__foot">${aksi}</div>` : ''}
      </div>`;
    m.classList.add('open');
    qa('[data-tutup]', m).forEach((b) => b.addEventListener('click', tutupModal));
    m.addEventListener('click', (e) => { if (e.target === m) tutupModal(); });
    const fokus = q('input,select,textarea,button', m);
    if (fokus) setTimeout(() => fokus.focus(), 60);
    return m;
  };

  const tutupModal = () => {
    const m = q('#modal');
    if (m) { m.classList.remove('open'); m.innerHTML = ''; }
  };

  const konfirmasi = ({ judul, pesan, labelYa = 'Ya', bahaya = false }) =>
    new Promise((selesai) => {
      const m = modal({
        judul,
        isi: `<p class="teks-biasa">${esc(pesan)}</p>`,
        aksi: `
          <button class="btn" data-tutup>Batal</button>
          <button class="btn ${bahaya ? 'btn--dgr' : 'btn--pri'}" data-ya>${esc(labelYa)}</button>`,
      });
      q('[data-ya]', m).addEventListener('click', () => { tutupModal(); selesai(true); });
      qa('[data-tutup]', m).forEach((b) => b.addEventListener('click', () => selesai(false)));
    });

  /* ── Unduh, salin, WhatsApp ───────────────────────────── */
  const unduh = (nama, isi, tipe = 'text/plain') => {
    const blob = new Blob([isi], { type: tipe });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: nama });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const salin = async (teks) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(teks);
        return true;
      }
      const ta = el('textarea');
      ta.value = teks;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  };

  const bukaWA = (nomor, teks) => {
    const n = String(nomor || '').replace(/[^0-9]/g, '');
    const url = n
      ? `https://wa.me/${n}?text=${encodeURIComponent(teks)}`
      : `https://wa.me/?text=${encodeURIComponent(teks)}`;
    window.open(url, '_blank', 'noopener');
  };

  /* ── Komponen tampilan ────────────────────────────────── */
  const kartuStat = ({ ikon: ic = 'info', warna = 'amber', label, nilai, sub = '' }) => `
    <div class="stat stat--${warna}">
      <div class="stat__ic">${ikon(ic, '', 16)}</div>
      <div class="stat__isi">
        <span class="stat__label">${esc(label)}</span>
        <div class="stat__val">${nilai}</div>
        ${sub ? `<div class="stat__sub">${sub}</div>` : ''}
      </div>
    </div>`;

  const kosong = ({ ikon: ic = 'info', judul, pesan, aksi = '' }) => `
    <div class="empty">
      ${ikon(ic, 'empty__ic', 30)}
      <h3>${esc(judul)}</h3>
      <p>${esc(pesan)}</p>
      ${aksi}
    </div>`;

  const lencana = (teks, warna = 'abu') =>
    `<span class="badge badge--${warna}"><span class="dot dot--${warna}"></span>${esc(teks)}</span>`;

  const avatar = (nama, meta = '') => `
    <div class="who">
      <div class="who__ava" style="background:${warnaDari(nama)}">${esc(inisial(nama))}</div>
      <div style="min-width:0">
        <div class="who__name">${esc(nama)}</div>
        ${meta ? `<div class="who__meta">${esc(meta)}</div>` : ''}
      </div>
    </div>`;

  // Grafik batang sederhana: [{ label, nilai }]
  const grafikBatang = (titik, { tinggi = 150, format = angka } = {}) => {
    if (!titik.length) return '';
    const maks = Math.max(...titik.map((t) => t.nilai), 1);
    return `
      <div class="chart" style="height:${tinggi}px">
        ${titik.map((t) => {
          const h = Math.max(2, Math.round((t.nilai / maks) * 100));
          return `<div class="chart__col" title="${esc(t.label)}: ${esc(format(t.nilai))}">
            <span class="chart__val">${t.nilai ? esc(format(t.nilai)) : ''}</span>
            <div class="chart__bar" style="height:${h}%"></div>
            <span class="chart__lbl">${esc(t.label)}</span>
          </div>`;
        }).join('')}
      </div>`;
  };

  const tabelResponsif = (akar) => {
    qa('table.tbl', akar).forEach((tb) => {
      const tr = q('thead tr', tb);
      if (!tr) return;
      const judul = Array.from(tr.children).map((th) => th.textContent.trim());
      qa('tbody tr', tb).forEach((row) => {
        Array.from(row.children).forEach((td, i) => {
          if (td.tagName !== 'TD') return;
          const label = judul[i] || '';
          if (label && !td.hasAttribute('data-label')) td.setAttribute('data-label', label);
        });
      });
      tb.setAttribute('data-responsif', '1');
    });
  };

  return {
    q, qa, esc, el, ikon, IKON,
    rupiah, angka, BULAN, BULAN_P, HARI,
    hariIni, geserHari, tglID, tglPendek, namaHari, labelHari, waktuID,
    inisial, warnaDari,
    toast, modal, tutupModal, konfirmasi, unduh, salin, bukaWA,
    kartuStat, kosong, lencana, avatar, grafikBatang, tabelResponsif,
  };
})();

if (typeof window !== 'undefined') window.Inti = Inti;
