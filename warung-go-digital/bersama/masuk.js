/* ══════════════════════════════════════════════════════════
   masuk.js — gerbang masuk untuk Pemilik Warung & Pengelola.

   ATURAN UTAMA
   1. Cara masuk yang selalu tersedia adalah NAMA PENGGUNA + KATA SANDI.
      Tidak perlu Google. Ini penting karena di dalam APK (WebView Android)
      Google menolak menampilkan layar masuknya, sehingga gerbang yang
      bergantung pada Google membuat aplikasi tidak bisa dibuka sama sekali.
   2. Google hanya BONUS. Bila `WGD_GOOGLE_CLIENT_ID` diisi, tombol Google
      muncul sebagai jalan pintas di peramban biasa. Bila tidak, ia tidak
      ditampilkan dan tidak ada yang hilang.
   3. Kata sandi tidak pernah disimpan apa adanya. Yang disimpan hanya
      sidik jarinya (PBKDF2-SHA256 + garam acak per akun).
   4. Pengelola mengelola akun: membuat dan menghapus akun Pemilik maupun
      Pengelola, serta mengganti kata sandinya sendiri.
   5. Setiap pengguna bisa mengganti kata sandinya sendiri.

   AKUN BAWAAN
   Saat Panel Pengelola pertama kali dibuka dan belum ada akun pengelola,
   dibuatkan satu akun bawaan: nama pengguna `admin`, kata sandi `admin123`.
   Akun itu ditandai "wajib ganti" sampai kata sandinya diganti.

   SATU DAFTAR AKUN UNTUK DUA APLIKASI
   Akun disimpan di kunci `wgd-akun-v1` yang dibaca kedua aplikasi. Ini
   disengaja: pengelola harus bisa membuat dan menghapus akun pemilik, dan
   itu mustahil bila keduanya memakai daftar yang terpisah. Yang dibagi
   hanya nama pengguna dan sidik kata sandi. Data usaha (laporan, mitra,
   catatan penjualan) tetap TERPISAH di kunci masing-masing aplikasi —
   `wgd-pemilik-v1` dan `wgd-admin-v1`.

   CATATAN JUJUR SOAL KEAMANAN
   Seluruh pemeriksaan di berkas ini berjalan di peramban pengguna. Artinya
   ini penjaga pintu, bukan brankas: orang yang menguasai perangkat bisa
   membuka data yang tersimpan di perangkat itu juga. Tujuannya mencegah
   orang lain memakai aplikasi tanpa izin, dan mencegah kata sandi yang
   sama bocor antar-layanan — bukan melindungi dari penyerang yang sudah
   memegang perangkat.
   ══════════════════════════════════════════════════════════ */
const Masuk = (() => {
  'use strict';

  // Client ID Google boleh diisi lewat <meta name="google-client-id"> pada
  // halaman. Cara ini dipilih supaya ID bisa diganti tanpa menyentuh kode.
  // window.WGD_GOOGLE_CLIENT_ID (bila diisi lebih dulu) tetap diutamakan.
  (() => {
    if (String(window.WGD_GOOGLE_CLIENT_ID || '').trim()) return;
    const meta = document.querySelector('meta[name="google-client-id"]');
    const nilai = meta && String(meta.content || '').trim();
    if (nilai) window.WGD_GOOGLE_CLIENT_ID = nilai;
  })();

  const AWALAN = { pemilik: 'pemilik', pengelola: 'admin' };
  const kunciSesi = (peran) => 'wgd-' + AWALAN[peran] + '-sesi-v1';
  const KUNCI_AKUN = 'wgd-akun-v1';
  const LAMA_SESI_JAM = 12;
  const PBKDF2_ULANGAN = 150000;

  const ADMIN_BAWAAN = { username: 'admin', sandi: 'admin123', nama: 'Pengelola' };

  const S = Data.buatPenyimpanan(KUNCI_AKUN);

  /* ── Utilitas kripto ──────────────────────────────────── */
  // `crypto.subtle` hanya ada di konteks aman (https, localhost, atau APK
  // Capacitor yang memakai https://localhost). Dibuka lewat file:// ia tidak
  // ada. Dalam keadaan itu kata sandi tidak bisa dibuat — dan tidak boleh
  // dibuat dengan cara yang lemah.
  const adaKripto = () => !!(window.crypto && window.crypto.subtle);

  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const acakBita = (n) => crypto.getRandomValues(new Uint8Array(n));

  const hashSandi = async (sandi, garamB64) => {
    const garam = Uint8Array.from(atob(garamB64), (c) => c.charCodeAt(0));
    const kunci = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(sandi), 'PBKDF2', false, ['deriveBits']
    );
    const bit = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: garam, iterations: PBKDF2_ULANGAN, hash: 'SHA-256' },
      kunci, 256
    );
    return b64(bit);
  };

  // Waktu dibuat tetap agar penyerang tidak bisa menebak dari kecepatan.
  const samakanWaktu = (a, b) => {
    if (a.length !== b.length) return false;
    let beda = 0;
    for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return beda === 0;
  };

  /* ── Daftar akun ──────────────────────────────────────── */
  const daftar = () => {
    const d = S.load();
    if (!Array.isArray(d.akun)) d.akun = [];
    return d.akun;
  };

  const simpanDaftar = (isi) => {
    const d = S.load();
    d.akun = isi;
    S.simpanSegera();
    return isi;
  };

  const akunPeran = (peran) => daftar().find((a) => a.peran === peran) || null;
  const semuaAkun = () => daftar();
  const cariUsername = (peran, username) => {
    const v = String(username || '').trim().toLowerCase();
    return daftar().find((a) => a.peran === peran && a.username === v) || null;
  };

  const uid = () =>
    'a-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const tulisAkun = (akun) => {
    const isi = daftar();
    const idx = isi.findIndex((a) => a.id === akun.id);
    if (idx >= 0) isi[idx] = akun;
    else isi.push(akun);
    simpanDaftar(isi);
    return akun;
  };

  const buangAkun = (id) => simpanDaftar(daftar().filter((a) => a.id !== id));

  /* ── Nama pengguna & kata sandi ───────────────────────── */
  const NAMA_PENGGUNA = /^[a-z][a-z0-9._-]{2,23}$/;

  const periksaNamaPengguna = (u) => {
    const v = String(u || '').trim().toLowerCase();
    if (!v) return { sah: false, pesan: 'Nama pengguna belum diisi.' };
    if (!NAMA_PENGGUNA.test(v)) {
      return {
        sah: false,
        pesan: '3–24 huruf kecil, angka, titik, garis bawah, atau tanda hubung. Harus diawali huruf.',
      };
    }
    return { sah: true, nilai: v };
  };

  const ukurKekuatan = (sandi) => {
    const s = String(sandi || '');
    let n = 0;
    if (s.length >= 8) n++;
    if (/[a-zA-Z]/.test(s) && /[0-9]/.test(s)) n++;
    if (s.length >= 12 || /[^a-zA-Z0-9]/.test(s)) n++;
    return Math.min(n, 3);
  };

  const periksaSandi = (sandi) => {
    const s = String(sandi || '');
    if (s.length < 8) return { sah: false, pesan: 'Minimal 8 karakter.' };
    if (ukurKekuatan(s) < 2) {
      return { sah: false, pesan: 'Campurkan huruf dan angka agar lebih kuat.' };
    }
    return { sah: true };
  };

  // Simpan kata sandi baru ke sebuah akun (sidik + garam baru).
  const pasangSandi = async (akun, sandi) => {
    const garam = b64(acakBita(16));
    const sidik = await hashSandi(sandi, garam);
    akun.sandiGaram = garam;
    akun.sandiSidik = sidik;
    akun.sandiDiubah = new Date().toISOString();
    akun.harusGanti = false;
    return tulisAkun(akun);
  };

  // Buat akun baru. Dipakai pengelola, dan dipakai pemilik saat mendaftar
  // sendiri di perangkatnya.
  const buatAkun = async ({ peran, username, sandi, nama = '', harusGanti = false }) => {
    if (!adaKripto()) {
      return { ok: false, pesan: 'Perangkat ini tidak mengizinkan pengamanan kata sandi.' };
    }
    const cekU = periksaNamaPengguna(username);
    if (!cekU.sah) return { ok: false, pesan: cekU.pesan };
    const cekS = periksaSandi(sandi);
    if (!cekS.sah) return { ok: false, pesan: cekS.pesan };
    if (cariUsername(peran, cekU.nilai)) {
      return { ok: false, pesan: 'Nama pengguna itu sudah dipakai. Pilih yang lain.' };
    }
    const akun = {
      id: uid(),
      peran,
      username: cekU.nilai,
      nama: String(nama || '').trim(),
      dibuat: new Date().toISOString(),
    };
    await pasangSandi(akun, sandi);
    if (harusGanti) { akun.harusGanti = true; tulisAkun(akun); }
    return { ok: true, akun };
  };

  // Kompatibilitas: menyetel (membuat atau memperbarui) akun sebuah peran.
  const setelNamaSandi = async (peran, username, sandi) => {
    const cekU = periksaNamaPengguna(username);
    if (!cekU.sah) return { ok: false, pesan: cekU.pesan };
    const cekS = periksaSandi(sandi);
    if (!cekS.sah) return { ok: false, pesan: cekS.pesan };
    let akun = cariUsername(peran, cekU.nilai) || akunPeran(peran);
    if (!akun) {
      return buatAkun({ peran, username: cekU.nilai, sandi });
    }
    akun.username = cekU.nilai;
    await pasangSandi(akun, sandi);
    return { ok: true, akun };
  };

  const masukNamaSandi = async (peran, username, sandi) => {
    const akun = cariUsername(peran, username);
    if (!akun) {
      return { ok: false, pesan: 'Nama pengguna atau kata sandi tidak cocok.' };
    }
    const sidik = await hashSandi(String(sandi || ''), akun.sandiGaram);
    if (!samakanWaktu(sidik, akun.sandiSidik)) {
      return { ok: false, pesan: 'Nama pengguna atau kata sandi tidak cocok.' };
    }
    return { ok: true, akun };
  };

  // Ganti kata sandi milik sendiri: wajib membuktikan kata sandi lama.
  const gantiSandi = async (peran, username, sandiLama, sandiBaru) => {
    const akun = cariUsername(peran, username);
    if (!akun) return { ok: false, pesan: 'Akun tidak ditemukan.' };
    const sidik = await hashSandi(String(sandiLama || ''), akun.sandiGaram);
    if (!samakanWaktu(sidik, akun.sandiSidik)) {
      return { ok: false, pesan: 'Kata sandi lama tidak cocok.' };
    }
    const cekS = periksaSandi(sandiBaru);
    if (!cekS.sah) return { ok: false, pesan: cekS.pesan };
    await pasangSandi(akun, sandiBaru);
    return { ok: true, akun };
  };

  // Pengelola menghapus akun. Akun pengelola terakhir tidak boleh dihapus,
  // supaya tidak ada yang bisa mengunci dirinya sendiri dari panel.
  const hapusAkun = (id) => {
    const akun = daftar().find((a) => a.id === id);
    if (!akun) return { ok: false, pesan: 'Akun tidak ditemukan.' };
    if (akun.peran === 'pengelola') {
      const n = daftar().filter((a) => a.peran === 'pengelola').length;
      if (n <= 1) {
        return { ok: false, pesan: 'Akun pengelola terakhir tidak boleh dihapus.' };
      }
    }
    buangAkun(id);
    return { ok: true };
  };

  const adminBawaanBelumAda = () => !daftar().some((a) => a.peran === 'pengelola');

  const pastikanAdminBawaan = async () => {
    if (adminBawaanBelumAda() && adaKripto()) {
      await buatAkun({
        peran: 'pengelola',
        username: ADMIN_BAWAAN.username,
        sandi: ADMIN_BAWAAN.sandi,
        nama: ADMIN_BAWAAN.nama,
        harusGanti: true,
      });
    }
  };

  /* ── Sesi ─────────────────────────────────────────────── */
  const bukaSesi = (peran, username) => {
    const sesi = {
      peran,
      username,
      sejak: new Date().toISOString(),
      kedaluwarsa: Date.now() + LAMA_SESI_JAM * 3600 * 1000,
    };
    localStorage.setItem(kunciSesi(peran), JSON.stringify(sesi));
    return sesi;
  };

  const sesiAktif = (peran) => {
    try {
      const s = JSON.parse(localStorage.getItem(kunciSesi(peran)) || 'null');
      if (!s || s.peran !== peran) return null;
      if (!s.kedaluwarsa || s.kedaluwarsa < Date.now()) {
        localStorage.removeItem(kunciSesi(peran));
        return null;
      }
      return s;
    } catch { return null; }
  };

  const keluar = (peran) => {
    if (peran) localStorage.removeItem(kunciSesi(peran));
    location.reload();
  };

  /* ── Akun Google (opsional) ───────────────────────────── */
  const adaClientId = () => !!String(window.WGD_GOOGLE_CLIENT_ID || '').trim();

  const isiToken = (jwt) => {
    try {
      const b = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const t = decodeURIComponent(
        atob(b).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(t);
    } catch { return null; }
  };

  const muatSkripGoogle = () =>
    new Promise((selesai, gagal) => {
      if (window.google && window.google.accounts) return selesai();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => selesai();
      s.onerror = () => gagal(new Error('Gagal memuat skrip Google.'));
      document.head.appendChild(s);
    });

  /* ── Antarmuka gerbang ────────────────────────────────── */
  const PERAN = {
    pemilik: { nama: 'Pemilik Warung', sapaan: 'Catatan warung Anda' },
    pengelola: { nama: 'Pengelola', sapaan: 'Panel pengelola mitra' },
  };

  const bersih = (s) => Inti.esc(s);

  const kartuMerek = (peran) => `
    <div class="gerbang__merek">
      <div class="gerbang__lambang">W</div>
      <div>
        <b>Warung Go Digital</b>
        <span>${bersih(PERAN[peran].nama)}</span>
      </div>
    </div>`;

  const notis = (jenis, ikon, isi) =>
    `<div class="gb-notis gb-notis--${jenis}"><span>${Inti.ikon(ikon, '', 16)}</span><span>${isi}</span></div>`;

  function tampilkanGerbang({ peran, setelahMasuk }) {
    const info = PERAN[peran];

    const gerbang = document.createElement('div');
    gerbang.className = 'gerbang';
    gerbang.setAttribute('role', 'dialog');
    gerbang.setAttribute('aria-modal', 'true');
    gerbang.setAttribute('aria-label', 'Masuk ' + info.nama);
    gerbang.innerHTML = '<div class="gerbang__kartu" id="gbKartu"></div>';
    document.body.appendChild(gerbang);
    document.body.style.overflow = 'hidden';

    const kartu = gerbang.querySelector('#gbKartu');

    const tutup = () => {
      document.body.style.overflow = '';
      gerbang.remove();
    };

    const beres = (akun) => {
      tutup();
      bukaSesi(peran, akun.username);
      setelahMasuk(akun);
    };

    const tunjukGalat = (id, pesan) => {
      const el = kartu.querySelector(id);
      if (el) el.innerHTML = notis('salah', 'alert', bersih(pesan));
    };

    /* Layar: masuk dengan nama pengguna & kata sandi */
    const layarMasuk = () => {
      const adaPengelola = daftar().some((a) => a.peran === 'pengelola');
      const akunBawaan = peran === 'pengelola'
        ? daftar().find((a) => a.username === ADMIN_BAWAAN.username && a.peran === 'pengelola')
        : null;
      const pakaiBawaan = !!(akunBawaan && akunBawaan.harusGanti);

      kartu.innerHTML = `
        ${kartuMerek(peran)}
        <h2>Masuk ke aplikasi</h2>
        <p class="gerbang__ket">${bersih(info.sapaan)}. Masuk dulu agar catatan Anda tidak terbuka untuk siapa pun yang memegang HP ini.</p>
        ${pakaiBawaan ? notis('awas', 'alert',
          'Panel Pengelola memakai akun bawaan: nama pengguna <b>admin</b>, kata sandi <b>admin123</b>. ' +
          'Segera ganti kata sandi lewat menu <b>Akun saya</b> setelah masuk.') : ''}
        <form id="gbForm" novalidate>
          <div class="gb-field">
            <label for="gbNamaPengguna">Nama pengguna</label>
            <input id="gbNamaPengguna" name="username" autocomplete="username"
                   autocapitalize="none" spellcheck="false"
                   placeholder="${pakaiBawaan ? 'admin' : 'mis. bu-tini'}" />
          </div>
          <div class="gb-field">
            <label for="gbSandi">Kata sandi</label>
            <input id="gbSandi" name="password" type="password" autocomplete="current-password"
                   placeholder="Kata sandi Anda" />
          </div>
          <div id="gbGalat"></div>
          <button class="gb-btn gb-btn--utama" type="submit">Masuk</button>
        </form>
        ${peran === 'pemilik' && !daftar().some((a) => a.peran === 'pemilik') ? `
          <div class="gerbang__kaki">
            Belum punya akun? <button class="gerbang__tautan" id="gbKeBuat">Buat akun</button>
          </div>` : ''}
        ${peran === 'pemilik' ? `
          <div class="gerbang__kaki">
            <button class="gerbang__tautan" id="gbLupa">Lupa kata sandi?</button>
          </div>` : ''}
        ${adaClientId() ? `
          <div class="gerbang__pisah">atau</div>
          <button class="btn-google" id="gbGoogle">
            <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.4 5.9 2.5 13.7l7.8 6.1C12.2 13.7 17.6 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
              <path fill="#FBBC05" d="M10.3 28.2c-.5-1.4-.8-2.9-.8-4.2s.3-2.8.8-4.2l-7.8-6.1C.9 16.7 0 20.2 0 24s.9 7.3 2.5 10.3l7.8-6.1z"/>
              <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.3-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.7 2.3-6.4 0-11.8-4.2-13.7-10.2l-7.8 6.1C6.4 42.1 14.6 47.5 24 47.5z"/>
            </svg>
            Lanjut dengan Google
          </button>` : ''}
        ${!adaKripto() ? notis('awas', 'alert',
          'Perangkat ini tidak mengizinkan pengamanan kata sandi. Buka lewat alamat https atau pasang aplikasinya di HP.') : ''}`;

      const form = kartu.querySelector('#gbForm');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const b = form.querySelector('button[type=submit]');
        b.disabled = true; b.textContent = 'Memeriksa…';
        const r = await masukNamaSandi(peran, kartu.querySelector('#gbNamaPengguna').value,
          kartu.querySelector('#gbSandi').value);
        if (r.ok) return beres(r.akun);
        tunjukGalat('#gbGalat', r.pesan);
        b.disabled = false; b.textContent = 'Masuk';
        kartu.querySelector('#gbSandi').select();
      });

      const keBuat = kartu.querySelector('#gbKeBuat');
      if (keBuat) keBuat.addEventListener('click', layarBuat);
      const lupa = kartu.querySelector('#gbLupa');
      if (lupa) lupa.addEventListener('click', layarLupa);
      const g = kartu.querySelector('#gbGoogle');
      if (g) g.addEventListener('click', layarGoogle);

      if (!adaKripto()) {
        form.querySelector('button[type=submit]').disabled = true;
      }
    };

    /* Layar: buat akun sendiri (pemilik) */
    const layarBuat = () => {
      kartu.innerHTML = `
        ${kartuMerek(peran)}
        <h2>Buat cara masuk Anda</h2>
        <p class="gerbang__ket">Pilih nama pengguna dan kata sandi yang mudah Anda ingat. Setelah ini, Anda masuk tanpa perlu Google.</p>
        <form id="gbBuat" novalidate>
          <div class="gb-field">
            <label for="gbBaruNama">Nama pengguna</label>
            <input id="gbBaruNama" autocomplete="username" autocapitalize="none"
                   spellcheck="false" placeholder="mis. bu-tini" />
            <div class="gb-field__bantu">3–24 karakter: huruf kecil, angka, titik, garis bawah, tanda hubung.</div>
          </div>
          <div class="gb-field">
            <label for="gbBaruSandi">Kata sandi</label>
            <input id="gbBaruSandi" type="password" autocomplete="new-password"
                   placeholder="Minimal 8 karakter" />
            <div class="akun__kekuatan" id="gbKuat"><i></i><i></i><i></i></div>
          </div>
          <div class="gb-field">
            <label for="gbUlangSandi">Ulangi kata sandi</label>
            <input id="gbUlangSandi" type="password" autocomplete="new-password"
                   placeholder="Ketik ulang" />
          </div>
          <div id="gbGalat2"></div>
          <button class="gb-btn gb-btn--utama" type="submit">Simpan &amp; masuk</button>
        </form>
        <div class="gerbang__kaki">
          <button class="gerbang__tautan" id="gbBalik">Sudah punya akun? Masuk</button>
        </div>`;

      const kuat = kartu.querySelector('#gbKuat');
      kartu.querySelector('#gbBaruSandi').addEventListener('input', (e) => {
        const n = ukurKekuatan(e.target.value);
        [...kuat.children].forEach((i, idx) => { i.className = idx < n ? 'on-' + n : ''; });
      });

      kartu.querySelector('#gbBuat').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const s = kartu.querySelector('#gbBaruSandi').value;
        const s2 = kartu.querySelector('#gbUlangSandi').value;
        if (s !== s2) return tunjukGalat('#gbGalat2', 'Kedua kata sandi belum sama.');
        const b = ev.target.querySelector('button[type=submit]');
        b.disabled = true; b.textContent = 'Menyimpan…';
        const r = await buatAkun({
          peran,
          username: kartu.querySelector('#gbBaruNama').value,
          sandi: s,
        });
        if (!r.ok) {
          tunjukGalat('#gbGalat2', r.pesan);
          b.disabled = false; b.textContent = 'Simpan & masuk';
          return;
        }
        beres(r.akun);
      });
      kartu.querySelector('#gbBalik').addEventListener('click', layarMasuk);
    };

    /* Layar: lupa kata sandi */
    const layarLupa = () => {
      kartu.innerHTML = `
        ${kartuMerek(peran)}
        <h2>Lupa kata sandi</h2>
        <p class="gerbang__ket">Kata sandi tidak bisa dikirim ulang, sebab kami tidak menyimpan surel pemulihan.</p>
        ${notis('info', 'shield',
          peran === 'pengelola'
            ? 'Bila Anda pengelola, mintalah pemilik akun membuat ulang lewat Panel Pengelola. Bila tidak ada lagi yang bisa masuk, hapus data aplikasi lalu masuk dengan akun bawaan <b>admin</b> / <b>admin123</b>.'
            : 'Mintalah <b>Pengelola</b> membuat ulang akun Anda, atau membuat akun baru. Bila ini perangkat Anda sendiri dan belum ada akun pengelola, Anda bisa membuat akun baru di layar awal.')}
        <div class="gerbang__tindak">
          <button class="gb-btn gb-btn--halus" id="gbBalik">Kembali</button>
        </div>`;
      kartu.querySelector('#gbBalik').addEventListener('click', layarMasuk);
    };

    /* Layar: masuk dengan Google (opsional) */
    const layarGoogle = async () => {
      kartu.innerHTML = `
        ${kartuMerek(peran)}
        <h2>Masuk dengan Google</h2>
        <p class="gerbang__ket">Kami hanya memakai nama dan alamat surel Anda untuk mengenali akun. Tidak ada yang dikirim ke mana pun.</p>
        <div id="gbGoogleArea"></div>
        <div class="gerbang__kaki">
          <button class="gerbang__tautan" id="gbKembali">Kembali</button>
        </div>`;
      kartu.querySelector('#gbKembali').addEventListener('click', layarMasuk);
      const area = kartu.querySelector('#gbGoogleArea');
      area.innerHTML = notis('info', 'clock', 'Memuat Google…');
      try {
        await muatSkripGoogle();
        window.google.accounts.id.initialize({
          client_id: String(window.WGD_GOOGLE_CLIENT_ID).trim(),
          callback: async (res) => {
            const p = isiToken(res.credential);
            if (!p) return;
            const email = String(p.email || '').toLowerCase();
            // Google hanya jalan pintas: bila nama penggunanya belum ada,
            // dibuatkan akun tanpa kata sandi (kata sandi tetap bisa
            // ditambahkan nanti lewat menu Akun saya).
            let akun = cariUsername(peran, email.split('@')[0]) || akunPeran(peran);
            if (!akun) {
              akun = { id: uid(), peran, username: email.split('@')[0], nama: p.name || email, dibuat: new Date().toISOString() };
              tulisAkun(akun);
            }
            akun.nama = p.name || akun.nama;
            akun.google = { sub: p.sub, email, nama: p.name || email, foto: p.picture || '' };
            tulisAkun(akun);
            beres(akun);
          },
        });
        area.innerHTML = '<div id="gbTombol" style="display:flex;justify-content:center"></div>';
        window.google.accounts.id.renderButton(area.querySelector('#gbTombol'), {
          theme: 'filled_black', size: 'large', shape: 'pill',
          text: 'continue_with', locale: 'id', width: 300,
        });
      } catch (e) {
        area.innerHTML = notis('salah', 'alert',
          bersih(e.message) + ' Periksa sambungan internet Anda.');
      }
    };

    layarMasuk();
  }

  /* ── Panel kelola akun (dipakai dari dalam aplikasi) ──── */
  function panelAkun(peran, saatBerubah) {
    // Pengelola boleh membuat banyak akun Pemilik, jadi akun yang ditampilkan
    // harus akun yang sedang dipakai (dari sesi), bukan akun pertama seperan.
    const akunSesi = sesiAktif(peran);
    const username = (akunSesi && akunSesi.username) || '';
    const akun = cariUsername(peran, username) || akunPeran(peran) || {};
    const g = akun.google || {};
    const pengelola = peran === 'pengelola';

    const barisAkun = (a) => `
      <div class="akun__baris" data-akun="${bersih(a.id)}">
        <div>
          <b>${bersih(a.username)}</b>
          <span>${a.peran === 'pengelola' ? 'Pengelola' : 'Pemilik Warung'}${a.nama ? ' · ' + bersih(a.nama) : ''}</span>
        </div>
        <button class="btn btn--sm btn--dgr" data-hapus="${bersih(a.id)}" title="Hapus akun">
          ${Inti.ikon('trash', '', 15)}
        </button>
      </div>`;

    const bagianKelola = pengelola ? `
      <div class="akun__bagian">
        <div class="akun__judul">Kelola akun</div>
        ${semuaAkun().map(barisAkun).join('') || '<p class="teks-biasa">Belum ada akun.</p>'}
        <form id="akTambah" novalidate style="margin-top:12px">
          <div class="gb-field">
            <label for="akBaruPeran">Jenis akun</label>
            <select id="akBaruPeran">
              <option value="pemilik">Pemilik Warung</option>
              <option value="pengelola">Pengelola</option>
            </select>
          </div>
          <div class="gb-field">
            <label for="akBaruNama">Nama pengguna</label>
            <input id="akBaruNama" autocapitalize="none" spellcheck="false" placeholder="mis. bu-tini" />
          </div>
          <div class="gb-field">
            <label for="akBaruSandi">Kata sandi</label>
            <input id="akBaruSandi" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter" />
          </div>
          <div id="akTambahGalat"></div>
          <button class="btn btn--pri" type="submit" style="width:100%">
            ${Inti.ikon('plus', '', 16)} Buat akun
          </button>
        </form>
      </div>` : '';

    const m = Inti.modal({
      judul: 'Akun saya',
      isi: `
        <div class="akun__bagian">
          <div class="gb-akun">
            ${g.foto
              ? `<img class="gb-akun__foto" src="${bersih(g.foto)}" alt="" referrerpolicy="no-referrer" />`
              : `<div class="gb-akun__foto">${bersih((username || '?').trim().charAt(0).toUpperCase())}</div>`}
            <div class="gb-akun__isi">
              <b>${bersih(akun.nama || username || 'Akun')}</b>
              <span>${bersih(username || '—')}${g.email ? ' · ' + bersih(g.email) : ''}</span>
            </div>
          </div>
          <div class="akun__baris">
            <div><b>Kata sandi</b><br /><span>${akun.sandiDiubah ? 'Diubah ' + Inti.tglPendek(akun.sandiDiubah) : 'Belum dibuat'}</span></div>
          </div>
          ${akun.harusGanti ? notis('awas', 'alert',
            'Anda masih memakai kata sandi bawaan. Ganti sekarang.') : ''}
        </div>

        <div class="akun__bagian">
          <div class="akun__judul">Ganti kata sandi</div>
          <form id="akGanti" novalidate>
            <div class="gb-field">
              <label for="akLama">Kata sandi sekarang</label>
              <input id="akLama" type="password" autocomplete="current-password" />
            </div>
            <div class="gb-field">
              <label for="akBaru">Kata sandi baru</label>
              <input id="akBaru" type="password" autocomplete="new-password"
                     placeholder="Minimal 8 karakter" />
              <div class="akun__kekuatan" id="akKuat"><i></i><i></i><i></i></div>
            </div>
            <div class="gb-field">
              <label for="akUlang">Ulangi kata sandi baru</label>
              <input id="akUlang" type="password" autocomplete="new-password" />
            </div>
            <div id="akGalat"></div>
            <button class="btn btn--pri" type="submit" style="width:100%">
              ${Inti.ikon('save', '', 16)} Simpan kata sandi baru
            </button>
          </form>
        </div>

        ${bagianKelola}

        <div class="akun__bagian">
          <div class="akun__judul">Keamanan</div>
          ${notis('awas', 'alert',
            'Penjaga ini berjalan di HP Anda sendiri. Siapa pun yang bisa membuka HP ini juga bisa membuka data yang tersimpan di dalamnya. Kuncinya bukan kata sandi ini, melainkan kunci layar HP Anda.')}
          <button class="btn btn--dgr" id="akKeluar" style="width:100%">
            ${Inti.ikon('logout', '', 16)} Keluar dari akun
          </button>
        </div>`,
      aksi: '<button class="btn" data-tutup>Tutup</button>',
    });

    Inti.qa('[data-tutup]', m).forEach((b) => b.addEventListener('click', Inti.tutupModal));

    const kuat = Inti.q('#akKuat', m);
    Inti.q('#akBaru', m).addEventListener('input', (e) => {
      const n = ukurKekuatan(e.target.value);
      [...kuat.children].forEach((i, idx) => { i.className = idx < n ? 'on-' + n : ''; });
    });

    const galat = (id, p) => {
      const el = Inti.q(id, m);
      if (el) el.innerHTML = `<div class="gb-notis gb-notis--salah" style="margin-bottom:10px"><span>${Inti.ikon('alert', '', 16)}</span><span>${bersih(p)}</span></div>`;
    };

    Inti.q('#akGanti', m).addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const lama = Inti.q('#akLama', m).value;
      const baru = Inti.q('#akBaru', m).value;
      const ulang = Inti.q('#akUlang', m).value;
      if (baru !== ulang) return galat('#akGalat', 'Kedua kata sandi belum sama.');
      const b = ev.target.querySelector('button[type=submit]');
      b.disabled = true;
      const r = await gantiSandi(peran, username, lama, baru);
      b.disabled = false;
      if (!r.ok) return galat('#akGalat', r.pesan);
      Inti.toast('Kata sandi berhasil diganti.');
      Inti.tutupModal();
      if (saatBerubah) saatBerubah(r.akun);
    });

    const formTambah = Inti.q('#akTambah', m);
    if (formTambah) {
      formTambah.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const b = ev.target.querySelector('button[type=submit]');
        b.disabled = true;
        const r = await buatAkun({
          peran: Inti.q('#akBaruPeran', m).value,
          username: Inti.q('#akBaruNama', m).value,
          sandi: Inti.q('#akBaruSandi', m).value,
        });
        b.disabled = false;
        if (!r.ok) return galat('#akTambahGalat', r.pesan);
        Inti.toast('Akun ' + r.akun.username + ' dibuat.');
        Inti.tutupModal();
        panelAkun(peran, saatBerubah);
      });

      Inti.qa('[data-hapus]', m).forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.hapus;
          const a = semuaAkun().find((x) => x.id === id);
          const ya = await Inti.konfirmasi({
            judul: 'Hapus akun?',
            pesan: `Akun "${a ? a.username : ''}" tidak akan bisa masuk lagi. Data usaha yang sudah tercatat tidak dihapus.`,
            labelYa: 'Hapus',
            bahaya: true,
          });
          if (!ya) return;
          const r = hapusAkun(id);
          if (!r.ok) return Inti.toast(r.pesan, 'err');
          Inti.toast('Akun dihapus.');
          Inti.tutupModal();
          panelAkun(peran, saatBerubah);
        });
      });
    }

    Inti.q('#akKeluar', m).addEventListener('click', async () => {
      const ya = await Inti.konfirmasi({
        judul: 'Keluar dari akun?',
        pesan: 'Anda perlu masuk lagi untuk membuka aplikasi. Data di HP ini tidak dihapus.',
        labelYa: 'Keluar',
        bahaya: true,
      });
      if (ya) keluar(peran);
    });
  }

  /* ── Pasang gerbang pada sebuah aplikasi ──────────────── */
  async function pasang({ peran, setelahMasuk }) {
    if (peran === 'pengelola') await pastikanAdminBawaan();

    const sesi = sesiAktif(peran);
    if (sesi) {
      const akun = cariUsername(peran, sesi.username);
      // Akun yang sudah dihapus tidak boleh lanjut memakai sesinya.
      if (akun) { setelahMasuk(akun); return; }
      localStorage.removeItem(kunciSesi(peran));
    }
    tampilkanGerbang({ peran, setelahMasuk });
  }

  return {
    pasang, panelAkun, keluar, sesiAktif,
    akunPeran, semuaAkun, buatAkun, hapusAkun, gantiSandi,
    setelNamaSandi, masukNamaSandi, periksaSandi, ukurKekuatan,
    adaClientId, ADMIN_BAWAAN,
  };
})();

if (typeof window !== 'undefined') window.Masuk = Masuk;
