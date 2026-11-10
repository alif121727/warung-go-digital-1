/* ══════════════════════════════════════════════════════════
   qr.js — Encoder QR Code asli (mode byte, versi 1–10, ECC L/M)
   Implementasi inti ISO/IEC 18004: Reed-Solomon atas GF(256),
   interleaving blok, pemilihan mask berdasarkan skor penalti.
   Hasilnya QR yang benar-benar bisa dipindai, bukan hiasan.
   ══════════════════════════════════════════════════════════ */

const QR = (() => {
  /* ── Aritmetika GF(256), polinomial primitif 0x11D ─────── */
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  }
  const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

  /* Polinomial generator derajat n: hasil kali (x - alpha^i) */
  const genPoly = (n) => {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = next;
    }
    return g;
  };

  /* Sisa pembagian polinomial -> n codeword koreksi */
  const rsEncode = (data, n) => {
    const g = genPoly(n);
    const buf = new Uint8Array(data.length + n);
    buf.set(data, 0);
    for (let i = 0; i < data.length; i++) {
      const coef = buf[i];
      if (coef === 0) continue;
      for (let j = 0; j < g.length; j++) buf[i + j] ^= mul(g[j], coef);
    }
    return buf.slice(data.length);
  };

  /* ── Tabel spesifikasi ─────────────────────────────────── */
  const ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  };

  /* [eccPerBlok, blokGrup1, dataGrup1, blokGrup2, dataGrup2] */
  const BLOCKS = {
    L: {
      1: [7, 1, 19, 0, 0], 2: [10, 1, 34, 0, 0], 3: [15, 1, 55, 0, 0],
      4: [20, 1, 80, 0, 0], 5: [26, 1, 108, 0, 0], 6: [18, 2, 68, 0, 0],
      7: [20, 2, 78, 0, 0], 8: [24, 2, 97, 0, 0], 9: [30, 2, 116, 0, 0],
      10: [18, 2, 68, 2, 69],
    },
    M: {
      1: [10, 1, 16, 0, 0], 2: [16, 1, 28, 0, 0], 3: [26, 1, 44, 0, 0],
      4: [18, 2, 32, 0, 0], 5: [24, 2, 43, 0, 0], 6: [16, 4, 27, 0, 0],
      7: [18, 4, 31, 0, 0], 8: [22, 2, 38, 2, 39], 9: [22, 3, 36, 2, 37],
      10: [26, 4, 43, 1, 44],
    },
  };

  const ECC_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  const dataCodewords = (v, ecc) => {
    const [, b1, d1, b2, d2] = BLOCKS[ecc][v];
    return b1 * d1 + b2 * d2;
  };

  /* ── Bit stream ────────────────────────────────────────── */
  class BitBuf {
    constructor() { this.bits = []; }
    push(value, len) {
      for (let i = len - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
    }
    get length() { return this.bits.length; }
  }

  const utf8 = (str) => {
    const out = [];
    for (const ch of unescape(encodeURIComponent(str))) out.push(ch.charCodeAt(0));
    return out;
  };

  /* ── Bangun urutan codeword final ──────────────────────── */
  const buildCodewords = (bytes, version, ecc) => {
    const totalData = dataCodewords(version, ecc);
    const countBits = version <= 9 ? 8 : 16;

    const bb = new BitBuf();
    bb.push(0b0100, 4);            // mode byte
    bb.push(bytes.length, countBits);
    for (const b of bytes) bb.push(b, 8);

    // terminator + padding ke batas byte
    const capacityBits = totalData * 8;
    for (let i = 0; i < 4 && bb.length < capacityBits; i++) bb.push(0, 1);
    while (bb.length % 8 !== 0) bb.push(0, 1);

    // byte pad bergantian 0xEC / 0x11
    const dataBytes = [];
    for (let i = 0; i < bb.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | bb.bits[i + j];
      dataBytes.push(byte);
    }
    const pads = [0xec, 0x11];
    let p = 0;
    while (dataBytes.length < totalData) dataBytes.push(pads[p++ % 2]);

    // pecah blok, hitung ECC tiap blok
    const [eccLen, b1, d1, b2, d2] = BLOCKS[ecc][version];
    const blocks = [];
    let off = 0;
    for (let i = 0; i < b1; i++) { blocks.push(dataBytes.slice(off, off + d1)); off += d1; }
    for (let i = 0; i < b2; i++) { blocks.push(dataBytes.slice(off, off + d2)); off += d2; }

    const eccs = blocks.map((b) => rsEncode(Uint8Array.from(b), eccLen));

    // interleaving data lalu ECC
    const out = [];
    const maxData = Math.max(d1, d2);
    for (let i = 0; i < maxData; i++)
      for (const blk of blocks) if (i < blk.length) out.push(blk[i]);
    for (let i = 0; i < eccLen; i++)
      for (const e of eccs) out.push(e[i]);

    return out;
  };

  /* ── Matriks ───────────────────────────────────────────── */
  const newMatrix = (size) => Array.from({ length: size }, () => new Array(size).fill(null));

  const drawFinder = (m, size, cx, cy) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        m[y][x] = d !== 2 && d !== 4;
      }
  };

  const drawAlignment = (m, cx, cy) => {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        m[cy + dy][cx + dx] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
  };

  const reserveFormat = (m, size) => {
    for (let i = 0; i <= 5; i++) m[i][8] = false;
    m[7][8] = false; m[8][8] = false; m[8][7] = false;
    for (let i = 9; i < 15; i++) m[8][14 - i] = false;
    for (let i = 0; i < 8; i++) m[8][size - 1 - i] = false;
    for (let i = 8; i < 15; i++) m[size - 15 + i][8] = false;
    m[size - 8][8] = true;   // modul gelap
  };

  const bchVersion = (v) => {
    let d = v << 12;
    for (let i = 17; i >= 12; i--) if (d & (1 << i)) d ^= 0x1f25 << (i - 12);
    return (v << 12) | d;
  };

  const drawVersion = (m, size, version) => {
    const bits = bchVersion(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      m[b][a] = bit;
      m[a][b] = bit;
    }
  };

  const drawFunctionPatterns = (m, size, version) => {
    drawFinder(m, size, 3, 3);
    drawFinder(m, size, size - 4, 3);
    drawFinder(m, size, 3, size - 4);

    for (let i = 0; i < size; i++) {
      if (m[6][i] === null) m[6][i] = i % 2 === 0;
      if (m[i][6] === null) m[i][6] = i % 2 === 0;
    }

    const pos = ALIGN[version];
    for (const cy of pos)
      for (const cx of pos) {
        if (m[cy][cx] !== null) continue;   // lewati area pola pencari
        drawAlignment(m, cx, cy);
      }

    reserveFormat(m, size);
    if (version >= 7) drawVersion(m, size, version);
  };

  const bchFormat = (ecc, mask) => {
    const data = (ECC_BITS[ecc] << 3) | mask;
    let d = data << 10;
    for (let i = 14; i >= 10; i--) if (d & (1 << i)) d ^= 0x537 << (i - 10);
    return ((data << 10) | d) ^ 0x5412;
  };

  const drawFormat = (m, size, ecc, mask) => {
    const bits = bchFormat(ecc, mask);
    const bit = (i) => ((bits >>> i) & 1) === 1;

    for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
    m[7][8] = bit(6);
    m[8][8] = bit(7);
    m[8][7] = bit(8);
    for (let i = 9; i < 15; i++) m[8][14 - i] = bit(i);

    for (let i = 0; i < 8; i++) m[8][size - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) m[size - 15 + i][8] = bit(i);

    m[size - 8][8] = true;
  };

  /* ── Penempatan data (zigzag kolom) ────────────────────── */
  const placeData = (m, size, codewords) => {
    const bits = [];
    for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);

    const cols = [];
    for (let c = size - 1; c >= 0; c--) if (c !== 6) cols.push(c);

    let idx = 0, up = true;
    for (let p = 0; p < cols.length; p += 2) {
      const c0 = cols[p], c1 = cols[p + 1];
      for (let i = 0; i < size; i++) {
        const row = up ? size - 1 - i : i;
        for (const col of [c0, c1]) {
          if (m[row][col] !== null) continue;
          m[row][col] = idx < bits.length ? bits[idx] === 1 : false;
          idx++;
        }
      }
      up = !up;
    }
  };

  /* ── Mask ──────────────────────────────────────────────── */
  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  const isFunction = (version, size, r, c) => {
    if (r === 6 || c === 6) return true;                       // pola waktu
    if (r < 9 && c < 9) return true;                           // pencari + format kiri-atas
    if (r < 9 && c >= size - 8) return true;                   // pencari kanan-atas
    if (r >= size - 8 && c < 9) return true;                   // pencari kiri-bawah
    const pos = ALIGN[version];
    for (const cy of pos)
      for (const cx of pos)
        if (Math.abs(r - cy) <= 2 && Math.abs(c - cx) <= 2) return true;
    return false;
  };

  const applyMask = (m, version, size, mask) => {
    const fn = MASKS[mask];
    const out = m.map((row) => row.slice());
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        if (isFunction(version, size, r, c)) continue;
        if (fn(r, c)) out[r][c] = !out[r][c];
      }
    return out;
  };

  /* ── Skor penalti (empat aturan standar) ───────────────── */
  const penalty = (m, size) => {
    let score = 0;

    const runPenalty = (get) => {
      for (let a = 0; a < size; a++) {
        let run = 1;
        for (let b = 1; b < size; b++) {
          if (get(a, b) === get(a, b - 1)) run++;
          else {
            if (run >= 5) score += 3 + (run - 5);
            run = 1;
          }
        }
        if (run >= 5) score += 3 + (run - 5);
      }
    };
    runPenalty((a, b) => m[a][b]);
    runPenalty((a, b) => m[b][a]);

    for (let r = 0; r < size - 1; r++)
      for (let c = 0; c < size - 1; c++) {
        const v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }

    const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
    const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
    const match = (a, b, pat, transpose) => {
      for (let i = 0; i < 11; i++) {
        const v = transpose ? m[b + i][a] : m[a][b + i];
        if (v !== pat[i]) return false;
      }
      return true;
    };
    for (let a = 0; a < size; a++)
      for (let b = 0; b + 11 <= size; b++) {
        if (match(a, b, pat1, false)) score += 40;
        if (match(a, b, pat2, false)) score += 40;
        if (match(a, b, pat1, true)) score += 40;
        if (match(a, b, pat2, true)) score += 40;
      }

    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c]) dark++;
    const pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;

    return score;
  };

  /* ── API utama ─────────────────────────────────────────── */
  const encode = (text, ecc = 'M') => {
    const bytes = utf8(text);
    const countBitsOf = (v) => (v <= 9 ? 8 : 16);

    let version = 0;
    for (let v = 1; v <= 10; v++) {
      const capBits = dataCodewords(v, ecc) * 8;
      if (4 + countBitsOf(v) + bytes.length * 8 <= capBits) { version = v; break; }
    }
    if (!version) throw new Error('Teks terlalu panjang untuk versi 1-10 (maks sekitar 271 byte)');

    const size = 17 + version * 4;
    const codewords = buildCodewords(bytes, version, ecc);

    const base = newMatrix(size);
    drawFunctionPatterns(base, size, version);
    placeData(base, size, codewords);

    let best = null, bestScore = Infinity, bestMask = 0;
    for (let mask = 0; mask < 8; mask++) {
      const cand = applyMask(base, version, size, mask);
      drawFormat(cand, size, ecc, mask);
      const s = penalty(cand, size);
      if (s < bestScore) { bestScore = s; best = cand; bestMask = mask; }
    }
    drawFormat(best, size, ecc, bestMask);
    return best;
  };

  /* ── Render ke canvas ──────────────────────────────────── */
  const draw = (canvas, text, opts = {}) => {
    const ecc = opts.ecc || 'M';
    const quiet = opts.quiet ?? 4;
    const dark = opts.dark || '#0d1a12';
    const light = opts.light || '#ffffff';

    const matrix = encode(text, ecc);
    const n = matrix.length;
    const total = n + quiet * 2;
    const scale = Math.max(1, Math.floor((opts.size || 240) / total));
    const px = total * scale;

    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = dark;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (matrix[r][c])
          ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);

    return { matrix, version: (n - 17) / 4, modules: n };
  };

  return { encode, draw };
})();

if (typeof window !== 'undefined') window.QR = QR;
