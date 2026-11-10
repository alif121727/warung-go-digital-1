/* Dekode berkas PNG hasil aplikasi memakai jsQR. */
const fs = require('fs');
const jsQR = require('./node_modules/jsqr');
const { PNG } = require('./node_modules/pngjs');

let gagal = 0;
for (const nama of ['qr_menu', 'qr_ulasan']) {
  const file = `/tmp/${nama}.png`;
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
