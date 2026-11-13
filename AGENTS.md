# AGENTS.md

Catatan kerja untuk repo ini (memori sesi berikutnya).

## Isi repo

Dua bagian yang saling terhubung:

1. **Landing page** (`warung-go-digital/`) — promosi program PKM-K.
2. **Panel Mitra** (`warung-go-digital/app/`) — aplikasi pengelolaan usaha.

Sumber konten: `Proposal_PKM-K_Warung_Go_Digital.pdf`.

```
/workspace/project/
├── Proposal_PKM-K_Warung_Go_Digital.pdf
├── index.html                    # redirect ke /warung-go-digital/
├── buat-paket.py                 # pembuat ZIP siap-pakai
├── jalankan.sh                   # jalankan situs langsung di sesi ini
├── vercel.json                   # setelan deploy Vercel (dist/ = isi situs)
├── .vercelignore
├── netlify.toml                  # setelan Netlify (publish = warung-go-digital)
├── dorong.sh                     # skrip bantu push ke GitHub
├── .github/workflows/deploy-pages.yml   # deploy otomatis ke GitHub Pages
├── warung-go-digital-siap-pakai.zip     # paket siap deploy (diabaikan git)
├── warung-go-digital-repo.bundle        # seluruh repo + riwayat (diabaikan git)
├── uji/                          # skrip uji Playwright + QR
└── warung-go-digital/
    ├── index.html                # landing page  → tombol "Panel Mitra" ke app/
    ├── styles.css
    ├── app.js
    └── app/                      # ── PANEL MITRA ──
        ├── index.html            # kerangka SPA
        ├── menu.html             # halaman menu publik (tujuan QR menu)
        ├── styles.css            # sistem desain aplikasi
        ├── qr.js                 # encoder QR asli (ISO/IEC 18004)
        ├── store.js              # lapisan data + localStorage + seed
        ├── ui.js                 # ikon, modal, drawer, grafik, toast, tabelResponsif
        ├── app.js                # router + Dasbor + modul Warung
        ├── modul-transaksi.js    # pembayaran, kuitansi, CSV
        ├── modul-rating.js       # pantauan Maps, QR ulasan, balas ulasan
        ├── modul-katalog.js      # katalog WhatsApp Business
        ├── modul-promosi.js      # promo menu, poster, siaran WA
        ├── modul-foto.js         # foto produk + pengecilan gambar
        └── modul-laporan.js      # laporan bulanan + cetak
```

**Penting:** situs ini dipakai di bawah path apa pun (akar domain atau subfolder seperti
`/<repo>/`), karena seluruh tautan bersifat relatif. QR dibangun dari
`location.origin + location.pathname` di `app/app.js`, jadi tetap benar di kedua kasus.
Uji penyajian dari akar: `python3 uji/uji-akar.py` (menyalin isi situs ke folder
sementara, menyajikannya sebagai akar, lalu memeriksa rute dan tautan).

## Menjalankan lokal

Cara termudah — pakai skrip yang sudah disiapkan:

```bash
bash jalankan.sh            # port bawaan 12001
bash jalankan.sh 12002      # port lain bila perlu
bash jalankan.sh --stop     # hentikan
```

Skrip menulis log ke `.jalankan.log` dan pid ke `.jalankan.pid` (keduanya diabaikan git).
Saat berjalan, situs langsung bisa dibuka lewat URL publik:

- landing → `https://work-2-mfkngpvvghxksiwd.prod-runtime.all-hands.dev/warung-go-digital/`
- panel   → `.../warung-go-digital/app/`

Atau manual:

```bash
cd /workspace/project && python3 -m http.server 12000
# landing  → http://localhost:12000/warung-go-digital/
# panel    → http://localhost:12000/warung-go-digital/app/
```

Wajib lewat server HTTP. Membuka `index.html` langsung sebagai berkas akan
menggagalkan pemuatan `store.js` karena batasan `file://`.

Catatan: server `http.server` mati begitu sesi selesai. Untuk permanen, lihat
bagian Deploy.

## Ketentuan konten yang HARUS dijaga

| Hal | Nilai |
|---|---|
| Paket Gratis | Rp 0 |
| Paket Hemat | Rp 35.000 sekali bayar |
| Paket Plus | Rp 100.000 sekali bayar |
| Langganan bulanan | Rp 15.000 / bulan |
| Paket Hemat mencakup | QR menu digital **dan** katalog WhatsApp Business |
| Nomor WhatsApp | 081563324546 → link `wa.me/6281563324546` |

Harga menu di mockup ponsel (Nasi Goreng Rp 15.000, Es Teh Rp 5.000, Ayam Bakar
Rp 22.000) adalah contoh daftar menu warung, **bukan** harga layanan — jangan diubah.

## Desain

Arah: hero gelap atmosferik → isi terang krem, berselang-seling terang/gelap.

- Font: **Bricolage Grotesque** (display), **Instrument Serif** (aksen italic),
  **JetBrains Mono** (label). Dimuat dari Google Fonts.
- Palet: tinta `#0d1a12`, amber `#f5a524`, krem `#f6f0e2`, leaf `#3ba55d`, WA `#25d366`.
- Token warna/radius/shadow ada di `:root` di `styles.css`.
- Lapisan futuristik memakai kelas berawalan `fx-` dan `maskot*` (aurora, kaca,
  HUD, teks bergradasi, cincin berputar, butir halus) — tetap memakai palet merek.
- **Lapisan gerak** ada di `bersama/animasi.css` + `bersama/animasi.js`, memakai
  kelas berawalan `ax-`. Dipasang di `index.html`, `unduh.html`, dan
  `privasi.html`. Berisi bilah kemajuan gulir, sorotan kursor, kemunculan
  berjenjang, kilau gradasi, denyut, kemiringan 3D, buka-tutup bagian
  (`<details>`), sapuan pemindai pada kotak QR, parallax saat menggulir,
  kanvas partikel waktu nyata, kedalaman 3D mengikuti kursor, claymorphism,
  dan sorotan teks dinamis.

  Catatan: yang diminta sebagai "3D/AR/VR" dikerjakan sebagai **kedalaman
  3D** (perspective + lapisan translateZ). AR/VR penuh butuh kamera dan
  kacamata, tidak layak untuk situs publik UMKM yang harus ringan dan
  terbuka lebar — dan tidak menambah apa pun bagi pengunjung warung.
- **Maskot**: 4 ilustrasi SVG di `warung-go-digital/ilustrasi/` (Pak Warung,
  Si QR, Mbak Es Teh, Si Meong). Buatan sendiri, duotone, berpelat gelap agar
  terbaca di latar gelap maupun krem. Bebas dipakai untuk poster/stand QR.

### Halaman unduh aplikasi

`warung-go-digital/unduh.html` (+ `unduh.js`, gaya di `bersama/gaya-unduh.css`)
khusus untuk mengunduh aplikasi:

- Android: APK `v1.3.0` dari rilis resmi GitHub.
- iOS: **tidak memakai berkas**, melainkan menambahkan situs ke layar utama
  lewat Safari (lihat bagian berikut). Berkas IPA `ios-v1.3.0` tetap tersedia
  sebagai jalur alternatif di dalam kartu yang sama.
- `unduh.js` menandai kartu yang cocok dengan perangkat ("HP Anda") tanpa
  menghilangkan pilihan lain; tidak pernah memaksa.
- Kode QR berisi alamat halaman ini, dibuat oleh `app/qr.js` (sudah terbukti
  bisa dipindai lewat `uji/decode-qr.js`).
- Berisi rincian berkas (ukuran + SHA-256). **Perbarui angka ini setiap kali
  rilis naik versi**, jika tidak halaman akan berbohong.

### Pemasangan di iPhone/iPad

Panduannya **menyatu di `unduh.html`** sebagai bagian `<section id="pasang-ios">`,
dengan logika di `warung-go-digital/pasang-ios.js`. Sengaja tidak dipisah ke
halaman sendiri: dari beranda, pengguna iPhone cukup sekali ketuk untuk sampai
ke panduan, tanpa berpindah halaman.

`warung-go-digital/pasang-ios.html` kini hanya **pengalih** ke
`unduh.html#pasang-ios` (tautan lama tetap hidup). Jangan diisi ulang;
berkas itu tidak didaftarkan di `sw.js`.

**Batasan yang tidak bisa dilanggar:** berkas IPA dibangun dengan
`CODE_SIGNING_ALLOWED=NO`, jadi **tidak ditandatangani Apple**. iOS menolak
memasang IPA tanpa tanda tangan, dan tidak ada cara memasang berkas aplikasi
langsung di iPhone tanpa akun pengembang berbayar (atau AltStore/Sideloadly
lewat komputer). Karena itu "unduh langsung di iPhone" tidak mungkin lewat
berkas. Jalan yang benar dan tetap bisa dipakai tanpa komputer adalah
menambahkan situs ke layar utama:

1. Buka di **Safari** — hanya Safari yang bisa memasang ke layar utama di iOS.
2. Ketuk **Bagikan** → **Tambahkan ke Layar Utama** → **Tambah**.

Bagian panduan menyesuaikan diri: sudah terpasang → ucapan + langkah
disembunyikan; iPhone lewat Chrome/Firefox → diarahkan ke Safari + tombol salin
tautan; bukan iOS → diarahkan ke langkah pemasangan APK. Deteksi iOS **wajib** menyertakan iPad modern
(`navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1`), sebab
iPadOS 13+ melaporkan dirinya sebagai macOS dan akan luput bila hanya memakai
agen pengguna. Uji: `python3 uji/uji-ios.py`.

### Cache: perubahan harus langsung terlihat

GitHub Pages mengirim `cache-control: max-age=600`. Bila `sw.js` ikut diambil
lewat cache HTTP, menaikkan `VERSI` pun tidak langsung berlaku, dan aset
stale-while-revalidate membuat tampilan baru baru muncul pada muat ulang
**kedua**. Ini pernah membuat perubahan dianggap "tidak ada".

Aturan yang berlaku sekarang (`sw.js` + `pasang.js`):
- Registrasi memakai `updateViaCache: 'none'` — `sw.js` selalu dicek ke jaringan.
- **HTML, CSS, dan JS: network-first** dengan `fetch(..., { cache: 'reload' })`.
  Cache hanya dipakai saat offline. Jangan ubah ini menjadi stale-while-revalidate;
  tampilan akan tertinggal satu muat ulang.
- Gambar/ikon boleh tetap stale-while-revalidate (jarang berubah).
- Menaikkan `VERSI` tetap wajib saat berkas berubah banyak, agar cache lama dibuang.

Penting saat menambah seksi yang memakai `.fx-aurora`: seksi induk **wajib**
`position: relative` (atau `overflow: hidden`). Bila tidak, elemen absolut
memakai viewport sebagai acuan, lolos dari klip, dan halaman jadi bisa
digeser samping. Uji anti-geser samping: `uji/uji-landing.py`.

### Aturan lapisan gerak (`ax-`)

Sepuluh aturan yang gampang dilanggar dan akibatnya tidak kelihatan sampai
seseorang mengeluh. Uji semuanya ada di `uji/uji-animasi.py`.

1. **Pakai `translate`/`scale`, jangan `transform`, untuk kemunculan.**
   Banyak kartu memakai `transform` untuk animasi sorotnya sendiri. Dua
   aturan yang menulis properti sama akan saling menghapus — yang menang
   membunuh yang kalah. Properti `translate`/`scale` berdiri sendiri dan
   otomatis digabung dengan `transform`.
2. **Kemunculan memakai `animation`, bukan `transition`.** Kartu-kartu di
   situs ini sudah memakai `transition` untuk animasi sorotnya. Dua aturan
   yang menulis `transition` saling menghapus — yang belakangan di kaskade
   membunuh yang lain. Akibatnya kartu muncul seketika tanpa pudar dan
   sorot hovemya ikut mati. `animation` dan `transition` adalah dua mesin
   terpisah yang bisa hidup bersamaan. Kemunculan ditahan dengan
   `animation-play-state: paused` sampai kelas `ax-in` dipasang.
3. **Jangan pernah menulis kelas `ax-reveal` di HTML.** Kelas itu dipasang
   oleh `animasi.js`, yang juga menambahkan `ax-in`. Kalau ditulis di HTML,
   tanpa JavaScript tidak ada yang menambahkan `ax-in`, dan seluruh isi
   halaman jadi tak terlihat. Hal yang sama berlaku untuk animasi hero:
   keadaan awal ditaruh di dalam `@keyframes`, bukan di luar.
4. **Jangan animasikan `transform` pada `.fab`.** Tombol WhatsApp mengambang
   disembunyikan dengan `transform: translateY(120%)` dan muncul lewat kelas
   `.show`. Animasi yang menulis `transform` mengalahkan aturan itu dan
   membuat tombol muncul terus — area tak terlihat yang masih bisa diklik.
5. **Kurangi gerak harus benar-benar mengurangi.** Saat
   `prefers-reduced-motion: reduce`, semua gerak mati tetapi tidak ada isi
   yang boleh tersembunyi. Karena kemunculan memakai `animation`, blok
   kurangi-gerak **wajib** mematikan `animation` sekaligus memaksa
   `opacity`/`translate` ke keadaan akhir. Gerak yang bergantung kursor juga
   tidak boleh dipasang di perangkat sentuh.
6. **Animasi isi `<details>` memakai selektor `[open]`.** Tanpa itu,
   animasinya berjalan saat halaman dimuat di dalam kotak yang masih
   tertutup, lalu habis sebelum pengunjung sempat membukanya. Tinggi kotak
   dianimasikan murni lewat CSS (`::details-content` + `interpolate-size`),
   jadi tetap bekerja tanpa JavaScript; peramban lama hanya kehilangan
   geraknya, bukan isinya.
7. **Parallax dan kedalaman 3D juga tidak boleh menulis `transform`.**
   Parallax memakai `translate`, kedalaman 3D memakai `translate: x y z` pada
   lapisan dan `transform` HANYA pada wadah `.hero__visual` — satu-satunya
   elemen di situ yang belum memakai `transform` untuk apa pun. Menulisnya di
   chip, kotak QR, atau glowcard akan menghapus kemiringan dan sorot hovemya.
8. **Claymorphism tidak boleh menimpa `background`.** Percobaan pertama
   menggantinya dengan krem, dan lencana hijau jadi putih dengan teks putih di
   atasnya — tak terbaca. Clay hanya menambah bayangan dalam, memakai putih
   dan hitam tembus pandang, sehingga resep yang sama bekerja di latar amber,
   hijau, maupun tinta gelap.
9. **Kanvas waktu nyata wajib berhenti.** Saat tab tidak aktif, saat kanvas
   di luar layar, dan saat "kurangi gerak" aktif. Tanpa itu halaman memakai
   baterai walau tidak dilihat. Jumlah titik juga dibatasi oleh luas layar,
   dan baru mulai digambar setelah halaman tenang — ini hiasan, bukan isi.
10. **Sorotan teks tidak boleh menyentuh elemen bergradasi.** Keduanya
    memakai `background`; sorotan akan menang dan menghapus gradasinya.
    Judul hero (`em.fx-grad`) karena itu dikecualikan.

Jaring pengaman berlapis: bila `IntersectionObserver` tidak ada atau sesuatu
menghalangi, `animasi.js` menampilkan semua setelah 4 detik. Jangan dihapus.

## Panel Mitra (aplikasi)

Aplikasi klien-sisi murni: **tanpa server, tanpa basis data**. Seluruh data disimpan di
`localStorage` browser, jadi bisa dideploy ke hosting statis apa pun (Netlify, Vercel,
GitHub Pages). Saat pertama dibuka, `store.js` memulai dengan **data kosong** — pemilik
warung baru belum punya pelanggan. Dasbor menampilkan ajakan **Daftarkan Warung** dan
**Muat data contoh**; tombol tong sampah di bar atas mengosongkan semuanya kembali.

### Enam modul wajib

| Modul | Isi |
|---|---|
| **Transaksi & Pembayaran** | Tagihan paket/langganan, pencatatan pembayaran (QRIS, transfer, tunai, e-wallet), kuitansi cetak, ekspor CSV |
| **Rating & Reputasi** | Pantauan rating Google Maps 90 hari, QR ulasan per warung, balas ulasan, bahan cetak kartu meja |
| **Katalog WhatsApp** | Produk format WhatsApp Business Catalog, pratinjau tampilan chat, bagikan via wa.me |
| **Promosi Digital** | Tiga jenis: promo menu, poster digital (4 tema, cetak A4/SVG), siaran WhatsApp + ukuran hasil |
| **Foto Produk** | Unggah/kamera, pengecilan otomatis ke 900px & ≤260 KB, status draf/siap/terbit |
| **Laporan Bulanan** | Pendapatan, transaksi, warung, rating, promosi, konten — narasi otomatis + cetak A4 & unduh teks |

### Arsitektur

- **Router berbasis hash**: `#/dasbor`, `#/warung`, `#/transaksi`, `#/rating`,
  `#/katalog`, `#/promosi`, `#/foto`, `#/laporan`.
- **Pola modul**: setiap `modul-*.js` memanggil
  `App.register(id, { label, judul, ic, grup, badge, cari, render(root) })`.
  Menambah modul = tambah satu berkas + satu `<script>` di `index.html`.
- **`store.js`** menyediakan `all/find/where/add/update/remove/uid` plus hitungan
  turunan: `ringkas()`, `trenPendapatan(n)`, `topWarung(n)`, `perMetode()`,
  `laporanBulanan(periode)`, `daftarPeriode()`, `ekspor()`, `impor()`.
- **`ui.js`** berisi ikon SVG, `modal`, `drawer`, `toast`, `konfirmasi`, `salin`,
  `unduh`, `grafikTren` (batang bertumpuk), `grafikGaris` (SVG), `stat`, `bintang`.
- **`qr.js`** encoder QR asli (mode byte, ECC L/M/Q/H, versi 1–40, mask 0–7).
  `QR.draw(canvas, teks, { size, ecc, dark })` dan `QR.encode(teks, ecc)`.

### Halaman publik

`app/menu.html?w=<id-warung>` — halaman menu yang dibuka pelanggan setelah memindai QR
menu. Setiap item punya tombol pesan WhatsApp dengan teks terisi otomatis. Membaca data
dari `localStorage` yang sama, jadi foto produk yang diterbitkan otomatis muncul.

### Data kosong & data contoh

Kondisi awal **kosong** (`Store.kosongkan()` / `kosong()` di `store.js`): semua koleksi
berisi array kosong. `Store.muatContoh()` mengisi data contoh untuk uji coba/demo:
8 warung (6 aktif), 35 transaksi, 47 produk katalog, 14 promosi, 11 foto, 8 QR ulasan,
dan 248 titik pantauan rating 90 hari.

Setiap modul punya **empty state** (`UI.kosong`) yang ramah, dan harus tahan data kosong
tanpa `NaN`/`undefined`. Tombol **Cadangan** mengunduh JSON; **Pulihkan** memuatnya kembali.

⚠️ **Batas penting:** halaman publik `app/menu.html` membaca data dari `localStorage`
perangkat **pemilik**. Jadi QR hanya menampilkan menu di perangkat yang sudah punya data
tersebut (mis. saat demo). Pelanggan yang memindai dari HP-nya sendiri akan melihat
"Warung tidak ditemukan", karena perangkat mereka tidak punya data itu. Agar menu bisa
dibuka pelanggan mana pun, data menu harus disajikan dari server (mis. berkas JSON per
warung di hosting), bukan dari `localStorage`. Lihat bagian "Yang belum dikerjakan".

### Ikon SVG wajib punya ukuran

`UI.icon()` selalu menyetel `width`/`height` (bawaan 18). Tanpa itu, SVG tanpa aturan CSS
akan membengkak memenuhi wadahnya — ikon kaca pembesar di kotak pencarian pernah
membengkak jadi 218×218 px. Setiap kelas ikon baru (`.toolbar .search svg`, dst.) juga
harus punya `width`/`height` sebagai jaring pengaman.

## Verifikasi (wajib sebelum menyatakan selesai)

Uji dengan Chromium di `/usr/bin/chromium` lewat Playwright. Pasang dulu:

```bash
pip install playwright pillow numpy
```

**Landing page + halaman unduh** — jalankan `python3 uji/uji-landing.py`
(server di `http://localhost:12000/warung-go-digital/`). Mencakup anti-geser
samping 9 lebar, maskot termuat, tautan unduh tepat, dan QR terdekode.

**Lapisan gerak** — jalankan `python3 uji/uji-animasi.py`. Menjaga sepuluh
aturan di atas: halaman terbaca tanpa JavaScript, kurangi-gerak tidak
menyembunyikan isi, tidak ada animasi ganda dengan `app.js`, tidak ada geser
samping di 8 lebar layar, tombol WhatsApp tetap tersembunyi di puncak,
kemunculan benar-benar memudar (bukan seketika), bagian bisa dibuka dengan
animasi dan tetap jalan tanpa JavaScript, parallax bergeser beda kecepatan,
kanvas benar-benar berubah antar bingkai, kedalaman 3D tidak menghapus
kemiringan chip, clay tidak menimpa warna latar, dan sorotan teks tidak
menyentuh judul bergradasi.

**Panduan pasang iPhone** (bagian di `unduh.html`) — jalankan
`python3 uji/uji-ios.py`. Mencakup penyesuaian perangkat (Safari, Chrome iOS,
iPad modern, Android, sudah terpasang), tautan silang, dan anti-geser samping
7 lebar.

**Landing page** — `http://localhost:12000/warung-go-digital/`:
1. Tidak ada error console / pageerror.
2. `document.documentElement.scrollWidth <= window.innerWidth` di 320, 360, 390, 414,
   600, 768, 900, 1024, 1280, 1440, 1920 px.
3. Font termuat (`document.fonts`).
4. Harga di kartu, blok langganan, dan dropdown formulir sesuai tabel di atas.
5. Formulir mengirim pesan ke `wa.me/6281563324546`.

**Panel Mitra** — `http://localhost:12000/warung-go-digital/app/`:
1. Kedelapan modul terbuka tanpa error (`#/dasbor` … `#/laporan`).
2. Overflow bersih di 11 lebar layar × 8 modul = 88 kombinasi.
3. Data bertahan setelah `location.reload()`.
4. QR bisa dipindai: render QR ke PNG, lalu dekode ulang dan bandingkan teksnya.
   ```bash
   cd /tmp/qrtest && npm install jsqr pngjs
   node harness.js        # 9/9 kasus harus lulus
   ```
5. Halaman `app/menu.html?w=<id>` menampilkan menu dan tombol pesan per item.

### Jebakan CSS yang sudah pernah kena

- Grid dengan anak berisi `<select>` beropsi panjang bisa meledak melebihi viewport.
  Obatnya: `.contact__grid > * { min-width: 0; }` (landing) dan `.grid > * { min-width: 0 }`
  (panel). Selalu uji 320px.
- `.sect` (kepala halaman + tombol aksi) dan `.toolbar` harus `flex-wrap: wrap`, dan
  di bawah 620px tombolnya dibuat melebar. Tanpa itu, 320px meluber.
- `.card__head .sel` (saringan panjang) perlu `width: 100% !important` di bawah 620px.
- Bilah atas: judul perlu `flex: 1; min-width: 0` + `text-overflow: ellipsis`; label
  teks tombol Cadangan/Pulihkan disembunyikan di layar sempit.
- `.qr-card` / `.qrfloat` dan chip posisinya absolut — di layar sempit perlu
  dirapatkan ke tepi (lihat `@media (max-width: 620px)`).

### Jebakan kode yang sudah pernah kena

- **Jangan pakai satu nama atribut `data-*` untuk dua hal berbeda** (mis. chip saringan
  dan tombol aksi). Kejadian nyata: `data-balas` dipakai chip saringan sekaligus tombol
  balas ulasan → klik chip ikut membuka modal. Pakai nama berbeda: `data-saringbalas`
  untuk saringan, `data-balas` untuk aksi.
- **Jangan buang `id` saat menyusun daftar modul.** Kejadian nyata: `bangunNav` memakai
  `ids.map(id => daftar[id]).filter(Boolean)`, sehingga objeknya kehilangan `id` dan
  semua tombol menu jadi `data-go="undefined"` — navigasi Panel Mitra mati total, dan
  di HP (yang hanya punya menu geser) pengguna terkunci di satu halaman. Selalu bawa
  `id` bersama definisi: `ids.filter(id => daftar[id]).map(id => ({ id, ...daftar[id] }))`.
  Uji ini tidak terdeteksi kalau uji hanya menyetel `location.hash` langsung; klik
  tombol menu secara nyata.
- Encoder QR: `isFunction()` tidak boleh menandai blok 9×9 kanan-bawah sebagai modul
  fungsi. QR hanya punya tiga pola pencari (kiri-atas, kanan-atas, kiri-bawah). Salah
  menandai → modul tidak ikut di-mask → QR versi 1–2 gagal dipindai.
- **Berkas uji harus menulis dan membaca berkas yang sama.** Kejadian nyata:
  `uji-qr.py` menulis PNG ke `./` tetapi `decode-qr.js` membaca `/tmp/<nama>.png`,
  sehingga dekode memakai berkas basi dan melaporkan "LULUS" palsu (hasil dekode
  memuat port 12040 dari uji lama, padahal server aktif 12000). Sekarang skrip menulis
  ke `tempfile.mkdtemp()` dan mengoper jalur berkasnya ke `decode-qr.js`.
- **Ikon SVG tanpa `width`/`height` membengkak.** Kejadian nyata: `UI.icon()` menyusun
  `<svg viewBox="0 0 24 24">` tanpa ukuran. Ikon tombol selamat karena ada aturan
  `.btn svg { width: 15px }`, tetapi ikon kaca pembesar di kotak pencarian modul tidak
  punya aturan CSS serupa, sehingga SVG-nya membengkak mengikuti wadah: **218×218 px**
  di modul Warung, Transaksi, Katalog, dan Foto — tampak seperti logo raksasa yang
  "tidak sinkron". Perbaikan: `UI.icon()` selalu menyetel `width`/`height` (bawaan 18),
  dan `.search svg` diberi ukuran 15px sebagai jaring pengaman.
- **Uji yang butuh data contoh harus memuatnya sendiri.** Kondisi awal aplikasi kini
  kosong. Uji yang memeriksa tabel terisi atau halaman menu harus memanggil
  `Store.muatContoh()` lebih dulu. Perhatikan juga: `b.new_page()` / `new_context()`
  membuat penyimpanan baru, jadi setiap konteks perlu memuat data contoh sendiri.

### Dukungan HP (ponsel)

Tampilan harus layak di HP karena QR dibuka dari kamera ponsel. Yang sudah diterapkan:

- `viewport-fit=cover` pada ketiga HTML + `env(safe-area-inset-*)` sebagai variabel
  (`--safe-t/b/l/r` di `app/styles.css`, `--safe-*` di `styles.css` landing).
- Tinggi layout memakai `100dvh` (bukan `100vh`) agar tidak terpotong bilah alamat
  peramban ponsel. Berlaku pada `.app`, `.side`, dan `.modal__box`.
- Input wajib `font-size: 16px` pada perangkat sentuh; di bawah itu iOS Safari
  melakukan zoom otomatis saat mengetik.
- Target sentuh minimal 40px (`@media (pointer: coarse)`): burger, logo, `.navitem`,
  tombol ikon bilah atas, tombol "Pesan" di menu publik.
- Tabel berubah jadi kartu di layar sempit lewat `UI.tabelResponsif()` (`app/ui.js`),
  dipanggil di akhir render (`app/app.js`). Sel label diisi dari `<th>` menjadi
  `data-label`, `thead` disembunyikan, sehingga tidak perlu geser ke samping.
- Bilah atas, sidebar, drawer, toast, dan tombol mengambang WhatsApp diberi padding
  area aman agar tidak tertutup poni/bilah bawah iPhone.

Uji HP: `python3 uji/uji-hp.py` (jika ada) atau skrip Playwright dengan
`is_mobile=True, has_touch=True` pada lebar 320/360/390/430 dan tablet 768.

## Membuat paket ZIP siap-pakai

```bash
python3 buat-paket.py
```

Menghasilkan `warung-go-digital-siap-pakai.zip` (diabaikan git) berisi:

- `BACA-DULU.md` — petunjuk singkat, ditulis untuk pengguna non-teknis
- `PANDUAN-DEPLOY.md` — disalin dari `DEPLOY.md`
- `Proposal_PKM-K_Warung_Go_Digital.pdf`
- `warung-go-digital/` — situs yang diunggah ke hosting

Dokumen diletakkan **di samping** folder situs, bukan di dalamnya, supaya tidak ikut
terunggah saat pengguna menyeret folder ke Netlify. Jalankan `buat-paket.py` setiap kali
berkas situs berubah.

## Deploy / hosting

- **GitHub Pages (LIVE, permanen)**: `https://alif121727.github.io/warung-go-digital-1/`
  (landing) dan `.../app/` (Panel Mitra). Repo: `alif121727/warung-go-digital-1`,
  cabang `main`. Terbit lewat `.github/workflows/deploy-pages.yml`.
- **Pratinjau sesi (sementara)**: `bash jalankan.sh` → server statis di port 12001,
  publik lewat `https://work-2-mfkngpvvghxksiwd.prod-runtime.all-hands.dev/warung-go-digital/`.
  Mati saat sesi berakhir.
- **Situs Netlify lama SUDAH MATI**: `https://glistening-cannoli-c65d29.netlify.app/`
  balas HTTP 404. Drop anonim Netlify kedaluwarsa.
- Panduan hosting lengkap (GitHub Pages, Netlify, Vercel, domain sendiri): `DEPLOY.md`.

### Pelajaran penting soal GitHub Pages

Tiga jebakan ini pernah membuat deploy gagal berulang kali — jangan terulang:

1. **Pages harus dinyalakan sekali** lewat Settings → Pages → Source: **GitHub Actions**.
   Tanpa itu, workflow gagal di `configure-pages` ("Get Pages site failed").
2. **Opsi `enablement: true` BUKAN solusinya.** Opsi itu menuntut token selain
   `GITHUB_TOKEN` (PAT atau GitHub App dengan `pages:write`). Dengan `GITHUB_TOKEN`
   biasa ia justru gagal: "Resource not accessible by integration". Jadi jangan dipakai;
   minta pengguna menyalakan Pages dari halaman Settings.
3. **`upload-pages-artifact@v3+` melewati berkas berawalan titik secara bawaan**,
   sehingga `touch _site/.nojekyll` sia-sia. Wajib `include-hidden-files: true`.

Versi aksi yang dipakai (semua Node 24; v-Node20 sudah usang dan memunculkan
peringatan deprecation): `checkout@v7`, `configure-pages@v6`,
`upload-pages-artifact@v5`, `deploy-pages@v5`.

### PWA (agar bisa dipasang di HP)

Situs memenuhi syarat PWA, jadi bisa dipasang ke layar utama HP dan dibuka offline:

- `manifest.webmanifest` — `start_url: "./app/"`, `display: "standalone"`,
  ikon 192/512 + maskable.
- `sw.js` — strategi: **network-first untuk navigasi** (halaman selalu terbaru,
  cache hanya saat offline), **stale-while-revalidate untuk aset**. Naikkan
  `VERSI` bila berkas situs berubah besar-besaran.
- `pasang.js` — daftarkan service worker + tampilkan bilah "Pasang di layar utama"
  (prompt bawaan di Android; petunjuk manual untuk iOS/Safari).
- `ikon/` — dibuat oleh `buat-ikon.py` (butuh `pillow`).

Tiga jebakan yang pernah membuat PWA gagal — jangan terulang:

1. **`document.currentScript` bernilai `null` di dalam callback `window.load`.**
   Hitung akar situs di luar callback, saat skrip masih dieksekusi.
2. **Akar situs = direktori `pasang.js`, bukan `../`.** `pasang.js` sebaris dengan
   `sw.js`, jadi pakai `new URL('.', document.currentScript.src)`. Memakai `../`
   akan naik satu tingkat terlalu jauh (ke akar domain) dan SW balas 404.
3. **`caches.match` harus `{ ignoreSearch: true }` untuk navigasi.** Halaman menu
   dipanggil dengan `?w=wr-001`; tanpa opsi itu, saat offline URL tidak cocok dan
   permintaan jatuh ke halaman cadangan yang salah.

Pemasangan hanya bekerja lewat HTTPS (atau localhost). Panduan pengguna untuk
Android & iPhone ada di `DEPLOY.md` → "Cara memasang situs sebagai aplikasi di HP".

Catatan izin: aplikasi OpenHands harus dipasang di akun (izinya: contents, actions,
issues, pull_requests, workflows, statuses, repository_hooks — **tidak ada `pages`**).
Setelah terpasang, push jalan; sebelum itu `git push` balas 403. Token kredensial git
(`$OH_GIT_CREDENTIAL_ACCESS_TOKEN_GITHUB`) berumur pendek (~12 jam) dan bisa kedaluwarsa
di tengah sesi panjang.

Catatan lain: `playwright`, `pillow`, `numpy` sering hilang antar sesi — pasang ulang
dengan `pip install playwright pillow numpy` sebelum menjalankan uji.

## Dua aplikasi: Pemilik & Pengelola

Situs ini punya **tiga** aplikasi:

| Folder | Untuk | Isi |
|---|---|---|
| `app/` | Panel Mitra lama | Menu QR, katalog, rating, promosi, foto, laporan (data contoh) |
| `pemilik/` | Pemilik warung | Catat penjualan/pendapatan/lokasi harian, kirim laporan |
| `admin/` | Pengelola (Anda) | Rekap penjualan/pendapatan/lokasi semua mitra |

Berkas bersama ada di `bersama/`: `inti.js` (DOM, format, komponen), `data.js`
(penyimpanan + perhitungan laporan), `gaya.css` (sistem desain mobile-first).

### Cara data mengalir (Cara 2 — tanpa server)

Tidak ada backend. Penyimpanan memakai `localStorage` dengan kunci terpisah
(`wgd-pemilik-v1`, `wgd-admin-v1`), sehingga data pemilik dan pengelola tidak
pernah tercampur.

```
Pemilik catat harian  ->  tab Kirim  ->  berkas JSON  ->  WhatsApp  ->  Pengelola impor
```

Berkas laporan ditandai `{ wgd: 1, jenis: 'laporan-harian' }`. `Data.bacaLaporan()`
memvalidasi isinya; `Data.gabungCatatan()` menggabungkan impor berulang tanpa
menggandakan tanggal yang sama.

**Dua cara kirim di aplikasi pemilik** (penting untuk APK):
- **Lewat berkas** — unduh JSON lalu lampirkan di WhatsApp. Paling rapi, tapi
  `a.download` sering tidak jalan di dalam WebView Android.
- **Lewat pesan** — ringkasan + rincian disalin ke papan klip, ditempel di obrolan.
  Ini jalur yang andal di dalam APK.

### Batas peran (disengaja)

Pemilik **tidak bisa** melihat data pengelola — panel pengelola ada di folder
berbeda dengan kunci penyimpanan berbeda, dan tidak ada tautan dari aplikasi
pemilik ke panel pengelola. Pengelola melihat semua data pemilik (hasil impor).

Batas ini juga dijaga di server sinkron: pemilik hanya memegang kunci **tulis**,
sehingga tidak punya cara membaca data mitra lain. Uji `uji/uji-sinkron.py`
memeriksa hal ini secara khusus.

### Cara data mengalir (Cara 1 — sinkron otomatis, opsional)

Bila pengelola ingin data masuk sendiri, jalankan `sinkron/server.mjs` (Node,
tanpa dependensi). Pemilik membuka tab **Sinkron**, mengisi alamat server +
**kunci tulis**; catatan terkirim sendiri 4 detik setelah perubahan. Pengelola
mengisi alamat + **kunci baca**; laporan ditarik tiap 30 detik.

- Kunci dipisah: `KUNCI_TULIS` (untuk pemilik) dan `KUNCI_BACA` (untuk pengelola).
  `KUNCI` tunggal masih didukung dan dipakai untuk keduanya.
- Upsert per tanggal: mengirim ulang tanggal yang sama menimpa, tidak menggandakan.
- Data di `sinkron/data/laporan.json` (di-`.gitignore`). Aplikasi tetap bekerja
  penuh tanpa server — sinkron murni tambahan.
- Klien ada di `bersama/sinkron.js`; `Sinkron.aturPeran('pemilik'|'pengelola')`
  menentukan kunci mana yang dipakai.

## Kemasan APK & IPA (Capacitor)

Folder `apk/` berisi pembungkus Capacitor. Lingkungan kerja lokal **tidak** punya
Java/Android SDK; APK dibangun di GitHub Actions (`.github/workflows/bangun-apk.yml`,
runner `ubuntu-latest` sudah punya Java + Android SDK) lalu dilampirkan ke
GitHub Release sebagai tautan unduh.

- `node apk/siapkan.mjs` menyalin `pemilik/`, `admin/`, `bersama/`, `ikon/` ke
  `apk/www/`, **melepas** pendaftaran service worker (berkas sudah di perangkat),
  dan membuat halaman pembuka pemilih aplikasi.
- Capacitor dipakai, **bukan** TWA/Bubblewrap — TWA justru membuka Chrome Custom
  Tab, yang persis tidak diinginkan pemilik.
- **Android**: `assembleDebug` bila rahasia kunci belum ada; `assembleRelease` +
  `zipalign` + `apksigner` (bukan konfigurasi signingConfig Gradle, supaya pasti)
  bila `ANDROID_KEYSTORE_BASE64` tersedia. Pembuat kunci: `apk/buat-kunci.sh`.
  Rahasia: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASS`, `ANDROID_KEY_ALIAS`,
  `ANDROID_KEY_PASS`.
- **iOS**: `.github/workflows/bangun-ipa.yml` (runner `macos-latest`, gratis karena repo
  publik) membangun IPA **tanpa tanda tangan** (`CODE_SIGNING_ALLOWED=NO`), lalu
  membungkusnya jadi `.ipa`. Dipasang lewat Sideloadly/AltStore dengan Apple ID
  pengguna. Rilis IPA memakai tag terpisah `ios-v1.0.0` agar tidak menimpa rilis APK.
  Runner macOS memakai Python "externally managed" (PEP 668), sehingga
  `python3 -m pip install pillow` ditolak — pasang lewat `actions/setup-python`.
- **Versi Android**: diambil dari `apk/package.json`. Jalankan
  `python3 apk/setel-versi-android.py` **setelah** `npx cap sync android` untuk
  menulis `versionCode`/`versionName`. Rumus `versionCode = mayor×10000 + minor×100 +
  patch` (1.2.0 → 10200), karena Play menolak unggahan yang nomornya tidak naik.
- **AAB untuk Play Store**: `bundleRelease` lalu ditandatangani dengan `jarsigner`
  (AAB berbentuk arsip; `apksigner` hanya untuk APK). Hanya dibuat bila rahasia kunci
  rilis tersedia. Panduan unggah: `PANDUAN-PLAY-STORE.md`.

### Jebakan Capacitor 8 (jangan terulang)

1. **Java 21, bukan 17.** `capacitor.build.gradle` yang dibuat `cap add android`
   menetapkan `sourceCompatibility VERSION_21`; runner dengan Java 17 gagal dengan
   "invalid source release: 21". Gradle 8.14.3 + AGP 8.13.0.
2. **Folder `apk/android/` dan `apk/www/` diabaikan git** (`apk/.gitignore`). Proyek
   Android tidak di-commit; ia dibuat ulang di CI dengan `npx cap add android`. Jadi
   **jangan** mengedit berkas di dalam `apk/android/` — perubahan akan hilang. Semua
   penyesuaian native harus lewat `apk/capacitor.config.json`, `apk/siapkan-aset-android.py`,
   atau skrip lain yang dijalankan CI.
3. **`npx cap sync android` menimpa `capacitor.build.gradle`** (daftar plugin +
   `capacitor.plugins.json`). Tambah plugin = `npm install` lalu sync; jangan
   mengedit berkas hasil generate.
4. **Unduhan `blob:`/`a.download` tidak berjalan di WebView Android.** Karena itu
   `bersama/native.js` mengganti `Inti.unduh` menjadi Filesystem `writeFile` +
   Share saat berjalan di dalam aplikasi. Di peramban, berkas ini tidak melakukan
   apa pun (no-op) — perilaku situs tidak berubah.
5. **Tombol kembali perangkat** ditangani plugin `@capacitor/app` (`backButton`).
   Urutannya: tutup dialog → pindah ke tab pertama → keluar. Logika ini juga di
   `bersama/native.js`.
6. **Uji tanpa perangkat Android**: `uji/uji-native.py` menirukan jembatan Capacitor
   (`window.Capacitor` + `Plugins`) lewat `add_init_script`, lalu memeriksa penulisan
   berkas, menu bagikan, dan urutan tombol kembali. Jalan di Chromium biasa.
7. **Ikon bulat & splash jangan menempelkan gambar persegi penuh** ke latar warna —
   tepinya terlihat sebagai garis. `apk/siapkan-aset-android.py` menempelkan hanya
   huruf W (latar transparan) ke lingkaran/kotak warna merek.

### Jebakan Capacitor 8 di iOS (jangan terulang)

Capacitor 8 memasang plugin lewat **Swift Package Manager**, bukan CocoaPods.
Akibatnya `npx cap add ios` hanya menghasilkan `App.xcodeproj` — **tidak ada
`App.xcworkspace`** — sehingga `xcodebuild -workspace App.xcworkspace` gagal dengan
"App.xcworkspace does not exist". Alur kerja memilih otomatis: pakai workspace bila
ada, selain itu `-project App.xcodeproj`.

Dua hal lain yang wajib diperhatikan saat membangun IPA di Xcode 26:

1. **Jangan menimpa `CONFIGURATION_BUILD_DIR`.** Menimpanya membuat Xcode menaruh
   hasil tiap paket SPM di folder terpisah, sehingga `FilesystemPlugin` gagal
   menemukan `IONFilesystemLib` ("no such module 'IONFilesystemLib'"). Pakai lokasi
   bawaan Xcode, lalu ambil berkas `.app` dari
   `build/Build/Products/Release-iphoneos` untuk dibungkus jadi IPA.
2. **`SWIFT_ENABLE_EXPLICIT_MODULES=NO`.** Pada Xcode 26 "explicit module build"
   kadang gagal menemukan modul dari paket SPM tidak langsung (mis.
   `ion-ios-filesystem` yang dipakai plugin filesystem) dengan pesan
   "unable to resolve module dependency". Mematikannya membuat pencarian modul
   kembali memakai jalur `-I` biasa.

- Token GitHub yang tersedia **tidak punya izin menulis Secrets** (403), jadi kunci
  tanda tangan dan sertifikat iOS harus diisi pengguna lewat UI GitHub.

### Izin lokasi (Android & iOS)

Aplikasi Pemilik memakai `navigator.geolocation` untuk tombol "Ambil titik
lokasi". Jembatan Capacitor hanya meneruskan permintaan itu bila izinnya
**dideklarasikan di berkas asli aplikasi** — kalau tidak, jembatan membalas
"ditolak" dan tombolnya diam saja tanpa pesan apa pun.

Karena `apk/android/` dan `apk/ios/` diabaikan git (hasil generate), penyesuaian
harus lewat skrip yang dijalankan alur kerja setelah `npx cap add`:

- `apk/siapkan-manifest-android.py` — menambah `ACCESS_COARSE_LOCATION` ke
  `AndroidManifest.xml`.
- `apk/siapkan-izin-ios.py` — menambah `NSLocationWhenInUseUsageDescription` ke
  `Info.plist`. Tanpa kunci ini iOS langsung menutup aplikasi saat lokasi diminta.

### Tautan ke folder tidak berfungsi di dalam aplikasi (APK/IPA)

Halaman pembuka `apk/www/index.html` menampilkan dua tombol. Bila tautannya
`href="pemilik/"` (berakhir garis miring), tombolnya **tampak mati**: layar tidak
berubah dan tidak ada pesan galat.

Sebabnya, di dalam aplikasi Capacitor tidak melayani direktori. Kedua platform
memakai aturan yang sama:

- Android `WebViewLocalServer.handleLocalRequest`: bila segmen terakhir URL tidak
  mengandung titik, yang dikirim adalah `<akar>/index.html`.
- iOS `CapacitorRouter.route`: bila `pathExtension` kosong, hasilnya
  `basePath + "/index.html"`.

Jadi `pemilik/` mengembalikan `index.html` akar — halaman pembuka itu sendiri.
Perbaikannya: tautan harus menunjuk berkas, mis. `pemilik/index.html`.

`apk/siapkan.mjs` kini punya penjaga yang menghentikan build (exit 1) bila ada
`href`/`src` internal berakhir garis miring, dan `uji/uji-pembuka-apk.py`
menjalankan server yang meniru aturan Capacitor itu lalu benar-benar mengklik
kedua tombol. Catatan: tautan ke folder tetap **sah** di GitHub Pages, karena
server statis biasa melayani `index.html` di dalam folder — jadi masalah ini
hanya muncul di dalam aplikasi.

### Bahan Google Play Store

`buat-aset-playstore.py` menghasilkan `playstore/` (ikon 512, feature graphic
1024×500, dan tangkapan layar 1080×1920) dengan menyuntikkan data contoh ke
`localStorage` lalu memotret lewat Playwright pada viewport 480×853 dengan
`device_scale_factor` 2.25. Tangkapan Play Store wajib **tepat 1080×1920**
(rasio 9:16), jadi hasilnya dinormalkan ke ukuran itu. Teks listing, jawaban
Data safety, dan catatan rilis ada di `playstore/teks-listing.md`.

## Yang belum dikerjakan (butuh keputusan pemilik)

- **Menu publik belum bisa dibuka pelanggan dari HP lain.** `app/menu.html` membaca
  `localStorage` perangkat pemilik, sehingga QR hanya menampilkan menu di perangkat
  yang sudah punya datanya. Perbaikan sebenarnya: terbitkan berkas JSON menu per warung
  saat pemilik menekan "Terbitkan" (mis. `menu/<id>.json`), lalu `menu.html` mengambil
  dari sana. Ini butuh backend/penyimpanan berkas dan keputusan produk.

- **Cara 1 (sinkron) sudah ada tetapi belum dipakai.** `sinkron/server.mjs` dan tab
  Sinkron siap; pengelola masih perlu menjalankan servernya dan membagi kunci.
  Bila nanti ingin hosting permanen, pindah ke Supabase/Firebase — jangan buang
  struktur `Data`, cukup ganti lapisan penyimpanannya.

- **Penandatanganan APK & IPA menunggu rahasia dari pengguna.** Kode dan alur sudah
  siap; yang kurang hanya 4 rahasia Android (atau akun Apple Developer untuk IPA
  bertanda tangan). Agen tidak bisa menulis Secrets karena tokennya 403.

- **Unggahan ke Google Play butuh akun pengembang milik pengguna.** Semua bahan
  teknis sudah siap (`playstore/`, `PANDUAN-PLAY-STORE.md`, AAB). Yang tersisa:
  membuat akun Play Console (±25 USD, sekali bayar), menerima perjanjian Google,
  mengisi email kontak pengembang, lalu mengunggah AAB dan menekan "Start rollout".
  Ini hanya bisa dilakukan pemilik akun — agen tidak punya akses ke pembayaran atau
  akun Google.

- **Menu publik Panel Mitra lama masih membaca `localStorage`.** Belum diperbaiki;
  lihat butir di atas.
