/* Dekode berkas PNG hasil aplikasi memakai jsQR.
   Pemakaian: node decode-qr.js <berkas1.png> <berkas2.png> ... */
const fs = require('fs');
const path = require('path');
const akar = path.resolve(__dirname, '..');
const jsQR = require(path.join(akar, 'node_modules', 'jsqr'));
const { PNG } = require(path.join(akar, 'node_modules', 'pngjs'));

const berkas = process.argv.slice(2);
if (!berkas.length) {
  console.log('Tidak ada berkas yang diberikan.');
  process.exit(1);
}

let gagal = 0;
for (const file of berkas) {
  const nama = path.basename(file, '.png');
  if (!fs.existsSync(file)) { console.log(`LEWAT ${nama}: berkas tidak ada`); gagal++; continue; }

  const png = PNG.sync.read(fs.readFileSync(file));
  const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (res) {
    console.log(`LULUS ${nama.padEnd(10)} ${png.width}x${png.height} -> "${res.data}"`);
  } else {
    console.log(`GAGAL ${nama.padEnd(10)} tidak terdekode (${png.width}x${png.height})`);
    gagal++;
  }
}
process.exit(gagal ? 1 : 0);
