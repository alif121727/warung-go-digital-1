/* ══════════════════════════════════════════════════════════
   masuk.js — gerbang masuk untuk Pemilik Warung & Pengelola.

   ATURAN UTAMA
   1. Cara masuk pertama adalah akun Google. Itu sekaligus bukti bahwa
      orangnya benar-benar pemilik akun itu.
   2. Setelah masuk sekali, pengguna boleh membuat nama pengguna dan kata
      sandi sendiri untuk masuk berikutnya — tanpa perlu Google lagi.
   3. Kata sandi tidak pernah disimpan apa adanya. Yang disimpan hanya
      sidik jarinya (PBKDF2-SHA256 + garam acak per akun).
   4. Lupa kata sandi hanya bisa dipulihkan lewat Google. Tanpa itu,
      tidak ada cara masuk kembali — sebab tidak ada surel pemulihan.

   CATATAN JUJUR SOAL KEAMANAN
   Seluruh pemeriksaan di berkas ini berjalan di peramban pengguna. Artinya
   ini penjaga pintu, bukan brankas: orang yang menguasai perangkat bisa
   membuka data yang tersimpan di perangkat itu juga. Tujuannya mencegah
   orang lain memakai aplikasi tanpa izin, dan mencegah kata sandi yang
   sama bocor antar-layanan — bukan melindungi dari penyerang yang sudah
   memegang perangkat.

   Akun Google benar-benar diverifikasi bila `window.WGD_GOOGLE_CLIENT_ID`
   diisi di halaman. Bila belum diisi, tombol Google berjalan dalam MODE
   CONTOH: jelas-jelas ditandai, tidak mengaku sebagai Google asli.
   ══════════════════════════════════════════════════════════ */
const Masuk = (() => {
  'use strict';

  // Akun Pemilik dan Pengelola disimpan di kunci yang BERBEDA, dan sesinya pun
  // terpisah. Alasannya: ada uji yang memastikan aplikasi Pemilik tidak pernah
  // menyentuh data Pengelola (dan sebaliknya). Kalau keduanya menulis di satu
  // kunci, batas itu hilang.
  // Awalan kunci disamakan dengan penyimpanan tiap aplikasi, sehingga aturan
  // "aplikasi Pemilik hanya menyentuh kunci wgd-pemilik*" tetap berlaku.
  const AWALAN = { pemilik: 'pemilik', pengelola: 'admin' };
  const kunciAkun = (peran) => 'wgd-' + AWALAN[peran] + '-akun-v1';
  const kunciSesi = (peran) => 'wgd-' + AWALAN[peran] + '-sesi-v1';
  const LAMA_SESI_JAM = 12;
  const PBKDF2_ULANGAN = 150000;

  const simpanan = {};
  const S = (peran) => {
    if (!simpanan[peran]) simpanan[peran] = Data.buatPenyimpanan(kunciAkun(peran));
    return simpanan[peran];
  };

  /* ── Utilitas kripto ──────────────────────────────────── */
  // `crypto.subtle` hanya ada di konteks aman (https, localhost, atau APK
  // Capacitor yang memakai https://localhost). Dibuka lewat file:// ia tidak
  // ada. Dalam keadaan itu kata sandi tidak bisa dibuat — dan tidak boleh
  // dibuat dengan cara yang lemah. Pengguna tetap bisa masuk lewat Google.
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

  /* ── Simpanan akun ────────────────────────────────────── */
  const akunPeran = (peran) => {
    const d = S(peran).load();
    return d.akun || null;
  };

  const tulisAkun = (peran, data) => {
    const d = S(peran).load();
    d.akun = data;
    S(peran).simpanSegera();
    return data;
  };

  const akunDariGoogle = (profil) => {
    const lama = akunPeran(profil.peran) || {};
    // Akun Google yang berbeda berarti orang yang berbeda. Mulai dari kosong
    // supaya nama pengguna & kata sandi milik orang sebelumnya tidak ikut.
    const bedaOrang = !!(lama.google && lama.google.sub && lama.google.sub !== profil.sub);
    const dasar = bedaOrang ? {} : lama;
    return tulisAkun(profil.peran, {
      ...dasar,
      google: {
        sub: profil.sub,
        email: profil.email,
        nama: profil.nama,
        foto: profil.foto || '',
        sejak: lama.google ? lama.google.sejak : new Date().toISOString(),
      },
      dibuat: lama.dibuat || new Date().toISOString(),
    });
  };

  /* ── Sesi ─────────────────────────────────────────────── */
  const bukaSesi = (peran) => {
    const sesi = {
      peran,
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

  const setelNamaSandi = async (peran, namaPengguna, sandi) => {
    const cekU = periksaNamaPengguna(namaPengguna);
    if (!cekU.sah) return { ok: false, pesan: cekU.pesan };
    const cekS = periksaSandi(sandi);
    if (!cekS.sah) return { ok: false, pesan: cekS.pesan };

    const garam = b64(acakBita(16));
    const sidik = await hashSandi(sandi, garam);
    const lama = akunPeran(peran) || {};
    tulisAkun(peran, {
      ...lama,
      username: cekU.nilai,
      sandiGaram: garam,
      sandiSidik: sidik,
      sandiDiubah: new Date().toISOString(),
    });
    return { ok: true };
  };

  const masukNamaSandi = async (peran, namaPengguna, sandi) => {
    const akun = akunPeran(peran);
    if (!akun || !akun.username) {
      return { ok: false, pesan: 'Akun ini belum punya nama pengguna. Masuk dengan Google dulu.' };
    }
    const cekU = periksaNamaPengguna(namaPengguna);
    if (!cekU.sah || cekU.nilai !== akun.username) {
      return { ok: false, pesan: 'Nama pengguna atau kata sandi tidak cocok.' };
    }
    const sidik = await hashSandi(String(sandi || ''), akun.sandiGaram);
    if (!samakanWaktu(sidik, akun.sandiSidik)) {
      return { ok: false, pesan: 'Nama pengguna atau kata sandi tidak cocok.' };
    }
    return { ok: true };
  };

  /* ── Akun Google ──────────────────────────────────────── */
  const adaClientId = () => !!String(window.WGD_GOOGLE_CLIENT_ID || '').trim();

  // Membaca isi token Google. Dipakai hanya untuk menampilkan nama & surel;
  // keasliannya yang menjamin adalah Google, bukan kode ini.
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

  function tampilkanGerbang({ peran, setelahMasuk }) {
    const info = PERAN[peran];
    const akun = akunPeran(peran);

    const gerbang = document.createElement('div');
    gerbang.className = 'gerbang';
    gerbang.setAttribute('role', 'dialog');
    gerbang.setAttribute('aria-modal', 'true');
    gerbang.setAttribute('aria-label', 'Masuk ' + info.nama);
    gerbang.innerHTML = `<div class="gerbang__kartu" id="gbKartu"></div>`;
    document.body.appendChild(gerbang);
    document.body.style.overflow = 'hidden';

    const kartu = gerbang.querySelector('#gbKartu');

    const tutup = () => {
      document.body.style.overflow = '';
      gerbang.remove();
    };

    const beres = () => {
      tutup();
      bukaSesi(peran);
      setelahMasuk(akunPeran(peran) || {});
    };

    /* Layar: pilih cara masuk */
    const layarPilih = () => {
      const punyaNamaSandi = !!(akun && akun.username) && adaKripto();
      kartu.innerHTML = `
        ${kartuMerek(peran)}
        <h2>Masuk ke aplikasi</h2>
        <p class="gerbang__ket">${bersih(info.sapaan)}. Masuk dulu agar catatan Anda tidak terbuka untuk siapa pun yang memegang HP ini.</p>
        <div class="gerbang__tindak">
          <button class="btn-google" id="gbGoogle">
            <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.4 5.9 2.5 13.7l7.8 6.1C12.2 13.7 17.6 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/>
              <path fill="#FBBC05" d="M10.3 28.2c-.5-1.4-.8-2.9-.8-4.2s.3-2.8.8-4.2l-7.8-6.1C.9 16.7 0 20.2 0 24s.9 7.3 2.5 10.3l7.8-6.1z"/>
              <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.3-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.7 2.3-6.4 0-11.8-4.2-13.7-10.2l-7.8 6.1C6.4 42.1 14.6 47.5 24 47.5z"/>
            </svg>
            Lanjut dengan Google
          </button>
          ${punyaNamaSandi ? `
            <div class="gerbang__pisah">atau</div>
            <form id="gbForm" novalidate>
              <div class="gb-field">
                <label for="gbNamaPengguna">Nama pengguna</label>
                <input id="gbNamaPengguna" name="username" autocomplete="username"
                       autocapitalize="none" spellcheck="false" placeholder="mis. bu-tini" />
              </div>
              <div class="gb-field">
                <label for="gbSandi">Kata sandi</label>
                <input id="gbSandi" name="password" type="password" autocomplete="current-password"
                       placeholder="Kata sandi Anda" />
              </div>
              <div id="gbGalat"></div>
              <button class="gb-btn gb-btn--utama" type="submit">Masuk</button>
            </form>
            <div class="gerbang__kaki">
              <button class="gerbang__tautan" id="gbLupa">Lupa kata sandi?</button>
            </div>
          ` : `
            <div class="gb-notis gb-notis--info">
              <span>${Inti.ikon('info', '', 16)}</span>
              <span>Ini masuk pertama Anda. Setelah masuk dengan Google, Anda boleh membuat
                <b>nama pengguna dan kata sandi sendiri</b> untuk masuk berikutnya.</span>
            </div>
          `}
        </div>`;
      kartu.querySelector('#gbGoogle').addEventListener('click', layarGoogle);
      const form = kartu.querySelector('#gbForm');
      if (form) {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const b = form.querySelector('button[type=submit]');
          b.disabled = true; b.textContent = 'Memeriksa…';
          const u = kartu.querySelector('#gbNamaPengguna').value;
          const s = kartu.querySelector('#gbSandi').value;
          const r = await masukNamaSandi(peran, u, s);
          if (r.ok) return beres();
          kartu.querySelector('#gbGalat').innerHTML =
            `<div class="gb-notis gb-notis--salah"><span>${Inti.ikon('alert', '', 16)}</span><span>${bersih(r.pesan)}</span></div>`;
          b.disabled = false; b.textContent = 'Masuk';
          kartu.querySelector('#gbSandi').select();
        });
      }
      const lupa = kartu.querySelector('#gbLupa');
      if (lupa) lupa.addEventListener('click', layarLupa);
    };

    /* Layar: masuk dengan Google */
    const layarGoogle = async () => {
      kartu.innerHTML = `
        ${kartuMerek(peran)}
        <h2>Masuk dengan Google</h2>
        <p class="gerbang__ket">Kami hanya memakai nama dan alamat surel Anda untuk mengenali akun. Tidak ada yang dikirim ke mana pun.</p>
        <div id="gbGoogleArea"></div>
        <div class="gerbang__kaki">
          <button class="gerbang__tautan" id="gbKembali">Kembali</button>
        </div>`;
      kartu.querySelector('#gbKembali').addEventListener('click', layarPilih);
      const area = kartu.querySelector('#gbGoogleArea');

      if (!adaClientId()) {
        // MODE CONTOH — ditandai terang-terangan supaya tidak disangka Google asli.
        const contoh = akun && akun.google ? akun.google : null;
        area.innerHTML = `
          <div class="gb-notis gb-notis--awas">
            <span>${Inti.ikon('alert', '', 16)}</span>
            <span><b>Mode contoh.</b> Halaman ini belum diisi <code>WGD_GOOGLE_CLIENT_ID</code>,
              jadi Google asli belum tersambung. Tombol di bawah masuk memakai akun contoh,
              hanya untuk mencoba alur aplikasi.</span>
          </div>
          <div class="gerbang__tindak">
            <button class="gb-btn gb-btn--utama" id="gbContoh">
              ${contoh ? 'Lanjut sebagai ' + bersih(contoh.nama) : 'Masuk dengan akun contoh'}
            </button>
          </div>`;
        area.querySelector('#gbContoh').addEventListener('click', () => {
          const profil = contoh || {
            sub: 'contoh-' + peran,
            email: peran === 'pengelola'
              ? 'pengelola@warunggodigital.id'
              : 'pemilik@contoh.id',
            nama: peran === 'pengelola' ? 'Pengelola Warung Go' : 'Pemilik Warung',
            foto: '',
          };
          akunDariGoogle({ ...profil, peran });
          lanjutSetelahGoogle();
        });
        return;
      }

      area.innerHTML = `<div class="gb-notis gb-notis--info"><span>${Inti.ikon('clock', '', 16)}</span><span>Memuat Google…</span></div>`;
      try {
        await muatSkripGoogle();
        window.google.accounts.id.initialize({
          client_id: String(window.WGD_GOOGLE_CLIENT_ID).trim(),
          callback: (res) => {
            const p = isiToken(res.credential);
            if (!p) return;
            akunDariGoogle({
              peran,
              sub: p.sub,
              email: p.email,
              nama: p.name || p.email,
              foto: p.picture || '',
            });
            lanjutSetelahGoogle();
          },
        });
        area.innerHTML = `<div id="gbTombol" style="display:flex;justify-content:center"></div>`;
        window.google.accounts.id.renderButton(area.querySelector('#gbTombol'), {
          theme: 'filled_black', size: 'large', shape: 'pill',
          text: 'continue_with', locale: 'id', width: 300,
        });
      } catch (e) {
        area.innerHTML = `<div class="gb-notis gb-notis--salah"><span>${Inti.ikon('alert', '', 16)}</span><span>${bersih(e.message)} Periksa sambungan internet Anda.</span></div>`;
      }
    };

    /* Setelah Google berhasil: buat kata sandi (sekali) atau langsung masuk */
    const lanjutSetelahGoogle = () => {
      const a = akunPeran(peran);
      if (a && a.username) {
        // Sudah punya nama pengguna: tawarkan langsung masuk, atau ganti.
        kartu.innerHTML = `
          ${kartuMerek(peran)}
          <h2>Halo, ${bersih(a.google.nama)}</h2>
          <p class="gerbang__ket">Akun ini sudah punya nama pengguna dan kata sandi. Masuk sekarang, atau atur ulang bila lupa.</p>
          ${blokAkunGoogle(a)}
          <div class="gerbang__tindak">
            <button class="gb-btn gb-btn--utama" id="gbMasukSekarang">Masuk sekarang</button>
            <button class="gb-btn gb-btn--halus" id="gbAturUlang">Atur nama pengguna &amp; kata sandi baru</button>
          </div>`;
        kartu.querySelector('#gbMasukSekarang').addEventListener('click', beres);
        kartu.querySelector('#gbAturUlang').addEventListener('click', layarBuat);
        return;
      }
      layarBuat();
    };

    const blokAkunGoogle = (a) => a.google ? `
      <div class="gb-akun">
        ${a.google.foto
          ? `<img class="gb-akun__foto" src="${bersih(a.google.foto)}" alt="" referrerpolicy="no-referrer" />`
          : `<div class="gb-akun__foto">${bersih((a.google.nama || '?').trim().charAt(0).toUpperCase())}</div>`}
        <div class="gb-akun__isi">
          <b>${bersih(a.google.nama)}</b>
          <span>${bersih(a.google.email)}</span>
        </div>
      </div>` : '';

    /* Layar: buat nama pengguna & kata sandi */
    const layarBuat = () => {
      const a = akunPeran(peran);
      if (!adaKripto()) {
        kartu.innerHTML = `
          ${kartuMerek(peran)}
          <h2>Tidak bisa membuat kata sandi di sini</h2>
          <p class="gerbang__ket">Halaman ini dibuka lewat alamat yang tidak aman, sehingga peramban tidak mengizinkan pengamanan kata sandi. Buka lewat alamat https, atau pasang aplikasinya di HP.</p>
          <div class="gb-notis gb-notis--awas">
            <span>${Inti.ikon('alert', '', 16)}</span>
            <span>Anda tetap bisa memakai aplikasi ini dengan masuk lewat Google.</span>
          </div>
          <div class="gerbang__tindak">
            <button class="gb-btn gb-btn--utama" id="gbMasukLangsung">Lanjut masuk</button>
          </div>`;
        kartu.querySelector('#gbMasukLangsung').addEventListener('click', beres);
        return;
      }
      kartu.innerHTML = `
        ${kartuMerek(peran)}
        <h2>Buat cara masuk Anda</h2>
        <p class="gerbang__ket">Sekarang Anda bisa masuk tanpa Google. Pilih nama pengguna dan kata sandi yang mudah Anda ingat — bebas, tidak ada aturan dari kami selain panjangnya.</p>
        ${blokAkunGoogle(a)}
        <form id="gbBuat" novalidate>
          <div class="gb-field">
            <label for="gbBaruNama">Nama pengguna</label>
            <input id="gbBaruNama" autocomplete="username" autocapitalize="none"
                   spellcheck="false" placeholder="mis. bu-tini"
                   value="${bersih((a && a.username) || '')}" />
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
        </form>`;

      const kuat = kartu.querySelector('#gbKuat');
      kartu.querySelector('#gbBaruSandi').addEventListener('input', (e) => {
        const n = ukurKekuatan(e.target.value);
        [...kuat.children].forEach((i, idx) => {
          i.className = idx < n ? 'on-' + n : '';
        });
      });

      kartu.querySelector('#gbBuat').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const u = kartu.querySelector('#gbBaruNama').value;
        const s = kartu.querySelector('#gbBaruSandi').value;
        const s2 = kartu.querySelector('#gbUlangSandi').value;
        const galat = kartu.querySelector('#gbGalat2');
        const tunjuk = (pesan) => {
          galat.innerHTML = `<div class="gb-notis gb-notis--salah"><span>${Inti.ikon('alert', '', 16)}</span><span>${bersih(pesan)}</span></div>`;
        };
        if (s !== s2) return tunjuk('Kedua kata sandi belum sama.');
        const b = ev.target.querySelector('button[type=submit]');
        b.disabled = true; b.textContent = 'Menyimpan…';
        const r = await setelNamaSandi(peran, u, s);
        if (!r.ok) { tunjuk(r.pesan); b.disabled = false; b.textContent = 'Simpan & masuk'; return; }
        beres();
      });
    };

    /* Layar: lupa kata sandi */
    const layarLupa = () => {
      kartu.innerHTML = `
        ${kartuMerek(peran)}
        <h2>Lupa kata sandi</h2>
        <p class="gerbang__ket">Kata sandi tidak bisa dikirim ulang, sebab kami tidak menyimpan surel pemulihan. Yang bisa dilakukan: masuk lagi dengan Google, lalu buat kata sandi baru.</p>
        <div class="gb-notis gb-notis--info">
          <span>${Inti.ikon('shield', '', 16)}</span>
          <span>Ini disengaja. Tanpa surel pemulihan, satu-satunya kunci cadangan adalah akun Google Anda sendiri — tidak ada pihak lain yang bisa membuka akun ini.</span>
        </div>
        <div class="gerbang__tindak">
          <button class="gb-btn gb-btn--utama" id="gbKeGoogle">Masuk dengan Google</button>
          <button class="gb-btn gb-btn--halus" id="gbBalik">Kembali</button>
        </div>`;
      kartu.querySelector('#gbKeGoogle').addEventListener('click', layarGoogle);
      kartu.querySelector('#gbBalik').addEventListener('click', layarPilih);
    };

    layarPilih();
  }

  /* ── Panel kelola akun (dipakai dari dalam aplikasi) ──── */
  function panelAkun(peran, saatBerubah) {
    const a = akunPeran(peran) || {};
    const g = a.google || {};
    const m = Inti.modal({
      judul: 'Akun saya',
      isi: `
        <div class="akun__bagian">
          <div class="gb-akun">
            ${g.foto
              ? `<img class="gb-akun__foto" src="${bersih(g.foto)}" alt="" referrerpolicy="no-referrer" />`
              : `<div class="gb-akun__foto">${bersih((g.nama || '?').trim().charAt(0).toUpperCase())}</div>`}
            <div class="gb-akun__isi">
              <b>${bersih(g.nama || 'Belum tersambung Google')}</b>
              <span>${bersih(g.email || '—')}</span>
            </div>
          </div>
          <div class="akun__baris">
            <div><b>Nama pengguna</b><br /><span>${a.username ? bersih(a.username) : 'Belum dibuat'}</span></div>
          </div>
          <div class="akun__baris">
            <div><b>Kata sandi</b><br /><span>${a.sandiDiubah ? 'Diubah ' + Inti.tglPendek(a.sandiDiubah) : 'Belum dibuat'}</span></div>
          </div>
        </div>

        <div class="akun__bagian">
          <div class="akun__judul">${a.username ? 'Ganti cara masuk' : 'Buat cara masuk'}</div>
          <form id="akBuat" novalidate>
            <div class="gb-field">
              <label for="akNama">Nama pengguna</label>
              <input id="akNama" autocapitalize="none" spellcheck="false"
                     value="${bersih(a.username || '')}" placeholder="mis. bu-tini" />
            </div>
            <div class="gb-field">
              <label for="akSandi">Kata sandi baru</label>
              <input id="akSandi" type="password" autocomplete="new-password"
                     placeholder="Minimal 8 karakter" />
              <div class="akun__kekuatan" id="akKuat"><i></i><i></i><i></i></div>
            </div>
            <div class="gb-field">
              <label for="akUlang">Ulangi kata sandi</label>
              <input id="akUlang" type="password" autocomplete="new-password" />
            </div>
            <div id="akGalat"></div>
            <button class="btn btn--pri" type="submit" style="width:100%">${Inti.ikon('save', '', 16)} Simpan</button>
          </form>
        </div>

        <div class="akun__bagian">
          <div class="akun__judul">Keamanan</div>
          <div class="gb-notis gb-notis--awas">
            <span>${Inti.ikon('alert', '', 16)}</span>
            <span>Penjaga ini berjalan di HP Anda sendiri. Siapa pun yang bisa membuka HP ini
              juga bisa membuka data yang tersimpan di dalamnya. Kuncinya bukan kata sandi ini,
              melainkan kunci layar HP Anda.</span>
          </div>
          <button class="btn btn--dgr" id="akKeluar" style="width:100%">
            ${Inti.ikon('logout', '', 16)} Keluar dari akun
          </button>
        </div>`,
      aksi: '<button class="btn" data-tutup>Tutup</button>',
    });

    Inti.qa('[data-tutup]', m).forEach((b) => b.addEventListener('click', Inti.tutupModal));

    const kuat = Inti.q('#akKuat', m);
    Inti.q('#akSandi', m).addEventListener('input', (e) => {
      const n = ukurKekuatan(e.target.value);
      [...kuat.children].forEach((i, idx) => { i.className = idx < n ? 'on-' + n : ''; });
    });

    Inti.q('#akBuat', m).addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const u = Inti.q('#akNama', m).value;
      const s = Inti.q('#akSandi', m).value;
      const s2 = Inti.q('#akUlang', m).value;
      const galat = Inti.q('#akGalat', m);
      const tunjuk = (p) => {
        galat.innerHTML = `<div class="gb-notis gb-notis--salah" style="margin-bottom:10px"><span>${Inti.ikon('alert', '', 16)}</span><span>${bersih(p)}</span></div>`;
      };
      if (s !== s2) return tunjuk('Kedua kata sandi belum sama.');
      const r = await setelNamaSandi(peran, u, s);
      if (!r.ok) return tunjuk(r.pesan);
      Inti.toast('Cara masuk disimpan. Lain kali bisa masuk tanpa Google.');
      Inti.tutupModal();
      if (saatBerubah) saatBerubah(akunPeran(peran));
    });

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
  function pasang({ peran, setelahMasuk }) {
    const sesi = sesiAktif(peran);
    if (sesi) {
      setelahMasuk(akunPeran(peran) || {});
      return;
    }
    tampilkanGerbang({ peran, setelahMasuk });
  }

  return {
    pasang, panelAkun, keluar, sesiAktif,
    akunPeran, setelNamaSandi, masukNamaSandi, periksaSandi, ukurKekuatan,
    adaClientId,
  };
})();

if (typeof window !== 'undefined') window.Masuk = Masuk;
