// siapkan.mjs — menyiapkan berkas web untuk dibungkus jadi APK.
//
// Menyalin berkas yang dibutuhkan KEDUA aplikasi ke apk/www/:
//   www/pemilik/  -> aplikasi pemilik warung
//   www/admin/    -> panel pengelola
//   www/bersama/  -> kode & gaya yang dipakai keduanya
//   www/ikon/     -> ikon aplikasi
//
// Panel Mitra lama (app/) sengaja tidak disertakan karena ini bukan bagian
// dari permintaan APK, dan berkas menu.html-nya besar.

import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sumber = path.join(akar, 'warung-go-digital');
const tujuan = path.join(akar, 'apk', 'www');

const BAGIAN = ['pemilik', 'admin', 'bersama', 'ikon'];

await rm(tujuan, { recursive: true, force: true });
await mkdir(tujuan, { recursive: true });

for (const nama of BAGIAN) {
  const dari = path.join(sumber, nama);
  if (!existsSync(dari)) {
    console.error(`LEWATI: ${dari} tidak ditemukan`);
    continue;
  }
  await cp(dari, path.join(tujuan, nama), { recursive: true });
  console.log(`disalin: ${nama}/`);
}

// Di dalam APK, berkas sudah tersimpan di perangkat sehingga tidak perlu
// service worker. Pendaftarannya dilepas agar tidak menghasilkan 404.
for (const app of ['pemilik', 'admin']) {
  const berkas = path.join(tujuan, app, 'index.html');
  if (!existsSync(berkas)) continue;
  const isi = await readFile(berkas, 'utf8');
  await writeFile(
    berkas,
    isi.replace(/<script src="\.\.\/bersama\/sw-daftar\.js"><\/script>\s*/g, ''),
    'utf8'
  );
  console.log(`service worker dilepas: ${app}/index.html`);
}

// Halaman pembuka: memilih aplikasi mana yang dibuka.
await writeFile(
  path.join(tujuan, 'index.html'),
  `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Warung Go Digital</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:28px;
         font-family:system-ui,-apple-system,"Segoe UI",sans-serif; background:#f7f5f0; color:#0d1a12; }
  .kartu { width:100%; max-width:380px; text-align:center; }
  .logo { width:64px; height:64px; border-radius:18px; background:#f5a524; color:#0d1a12;
          display:grid; place-items:center; font-weight:800; font-size:32px; margin:0 auto 18px; }
  h1 { font-size:21px; margin:0 0 6px; }
  p { color:#4a574f; font-size:14px; margin:0 0 26px; }
  a { display:flex; align-items:center; justify-content:center; gap:9px; min-height:52px;
      margin-bottom:12px; border-radius:13px; text-decoration:none; font-weight:700; font-size:15px; }
  .p1 { background:#0d1a12; color:#fff; }
  .p2 { background:#fff; color:#0d1a12; border:1px solid #e6e2d8; }
  small { color:#8a948d; font-size:11.5px; display:block; margin-top:18px; }
</style>
</head>
<body>
  <div class="kartu">
    <div class="logo">W</div>
    <h1>Warung Go Digital</h1>
    <p>Pilih aplikasi yang ingin dibuka.</p>
    <a class="p1" href="pemilik/">Aplikasi Warung (Pemilik)</a>
    <a class="p2" href="admin/">Panel Pengelola</a>
    <small>Kedua aplikasi tetap berfungsi tanpa internet.</small>
  </div>
</body>
</html>
`,
  'utf8'
);
console.log('disalin: index.html (pembuka)');

// Berkas ini dipakai Android WebView untuk memuat aplikasi.
await writeFile(
  path.join(tujuan, '..', '.gitignore'),
  'www/\nandroid/\nnode_modules/\n',
  'utf8'
);

console.log('\nSelesai. Isi apk/www/ siap dibungkus.');
