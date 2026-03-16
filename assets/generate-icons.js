#!/usr/bin/env node
// Generate 22x22 template tray icons (black on transparent) as PNG files
// No external dependencies - uses raw PNG encoding with zlib

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 22, H = 22;

function createPNG(pixels) {
  // pixels is a Uint8Array of W*H*4 (RGBA)
  // Build raw image data with filter byte per row
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: None
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 4;
      const di = y * (1 + W * 4) + 1 + x * 4;
      raw[di] = pixels[si];
      raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2];
      raw[di + 3] = pixels[si + 3];
    }
  }

  const deflated = zlib.deflateSync(raw);

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(crc32(crcData));
    return Buffer.concat([len, typeB, data, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

function setPixel(pixels, x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  // Alpha blend
  const srcA = a / 255;
  const dstA = pixels[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA > 0) {
    pixels[i] = Math.round((r * srcA + pixels[i] * dstA * (1 - srcA)) / outA);
    pixels[i + 1] = Math.round((g * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA);
    pixels[i + 2] = Math.round((b * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA);
    pixels[i + 3] = Math.round(outA * 255);
  }
}

function setPixelOpaque(pixels, x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

// Draw a filled circle
function fillCircle(pixels, cx, cy, r, color) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r + 0.5) {
        const alpha = dist <= r - 0.5 ? 1.0 : Math.max(0, r + 0.5 - dist);
        setPixel(pixels, x, y, color[0], color[1], color[2], Math.round(alpha * color[3]));
      }
    }
  }
}

// Draw a filled rectangle
function fillRect(pixels, x1, y1, x2, y2, color) {
  for (let y = Math.max(0, Math.floor(y1)); y <= Math.min(H - 1, Math.floor(y2)); y++) {
    for (let x = Math.max(0, Math.floor(x1)); x <= Math.min(W - 1, Math.floor(x2)); x++) {
      setPixel(pixels, x, y, color[0], color[1], color[2], color[3]);
    }
  }
}

// Draw an arc (ring segment) for sound waves
function drawArc(pixels, cx, cy, innerR, outerR, startAngle, endAngle, color) {
  const minX = Math.floor(cx - outerR - 1);
  const maxX = Math.ceil(cx + outerR + 1);
  const minY = Math.floor(cy - outerR - 1);
  const maxY = Math.ceil(cy + outerR + 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if within the ring
      if (dist < innerR - 0.7 || dist > outerR + 0.7) continue;

      // Check angle
      let angle = Math.atan2(dy, dx);
      if (angle < startAngle) angle += 2 * Math.PI;
      if (angle > endAngle) continue;

      // Anti-alias inner and outer edges
      let alpha = 1.0;
      if (dist < innerR + 0.5) {
        alpha = Math.max(0, dist - innerR + 0.5);
      } else if (dist > outerR - 0.5) {
        alpha = Math.max(0, outerR + 0.5 - dist);
      }

      // Anti-alias angle edges
      const angleDist1 = angle - startAngle;
      const angleDist2 = endAngle - angle;
      const pixelAngle = 1.0 / dist; // approx angle per pixel
      if (angleDist1 < pixelAngle) {
        alpha *= angleDist1 / pixelAngle;
      }
      if (angleDist2 < pixelAngle) {
        alpha *= angleDist2 / pixelAngle;
      }

      if (alpha > 0) {
        setPixel(pixels, x, y, color[0], color[1], color[2], Math.round(alpha * color[3]));
      }
    }
  }
}

// Draw a filled triangle
function fillTriangle(pixels, x1, y1, x2, y2, x3, y3, color) {
  const minX = Math.max(0, Math.floor(Math.min(x1, x2, x3)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x1, x2, x3)));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2, y3)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y1, y2, y3)));

  function sign(px, py, ax, ay, bx, by) {
    return (px - bx) * (ay - by) - (ax - bx) * (py - by);
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d1 = sign(px, py, x1, y1, x2, y2);
      const d2 = sign(px, py, x2, y2, x3, y3);
      const d3 = sign(px, py, x3, y3, x1, y1);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      if (!(hasNeg && hasPos)) {
        setPixel(pixels, x, y, color[0], color[1], color[2], color[3]);
      }
    }
  }
}

// Draw a rounded rectangle
function fillRoundedRect(pixels, x1, y1, x2, y2, r, color) {
  for (let y = Math.max(0, Math.floor(y1)); y <= Math.min(H - 1, Math.ceil(y2)); y++) {
    for (let x = Math.max(0, Math.floor(x1)); x <= Math.min(W - 1, Math.ceil(x2)); x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = true;
      let dist = 0;

      // Check corners
      if (px < x1 + r && py < y1 + r) {
        dist = Math.sqrt((px - x1 - r) ** 2 + (py - y1 - r) ** 2) - r;
      } else if (px > x2 - r && py < y1 + r) {
        dist = Math.sqrt((px - x2 + r) ** 2 + (py - y1 - r) ** 2) - r;
      } else if (px < x1 + r && py > y2 - r) {
        dist = Math.sqrt((px - x1 - r) ** 2 + (py - y2 + r) ** 2) - r;
      } else if (px > x2 - r && py > y2 - r) {
        dist = Math.sqrt((px - x2 + r) ** 2 + (py - y2 + r) ** 2) - r;
      } else {
        dist = -1; // fully inside
      }

      if (dist < 0.5) {
        const alpha = dist < -0.5 ? 1.0 : (0.5 - dist);
        setPixel(pixels, x, y, color[0], color[1], color[2], Math.round(alpha * color[3]));
      }
    }
  }
}

function drawSpeaker(pixels) {
  const black = [0, 0, 0, 255];

  // Speaker body - a rectangle for the speaker cabinet
  // Position speaker on the left side to leave room for waves
  // Speaker body: small rounded rectangle
  fillRoundedRect(pixels, 2, 7, 7, 15, 1, black);

  // Speaker cone - triangle pointing right
  fillTriangle(pixels, 7, 5, 13, 11, 7, 17, black);

  // Clean up: fill the connection between rect and triangle
  fillRect(pixels, 6, 7, 8, 15, black);
}

function drawSpeakerForPlaying(pixels) {
  const black = [0, 0, 0, 255];

  // Speaker body - same as static but slightly more left
  fillRoundedRect(pixels, 1, 7, 6, 15, 1, black);

  // Speaker cone - triangle pointing right
  fillTriangle(pixels, 6, 5, 12, 11, 6, 17, black);

  // Clean up connection
  fillRect(pixels, 5, 7, 7, 15, black);
}

// === Generate tray-icon.png (speaker only) ===
{
  const pixels = new Uint8Array(W * H * 4); // all zeros = transparent

  drawSpeaker(pixels);

  const png = createPNG(pixels);
  fs.writeFileSync(path.join(__dirname, 'tray-icon.png'), png);
  console.log('Created tray-icon.png');
}

// === Generate tray-icon-playing.png (speaker + sound waves) ===
{
  const pixels = new Uint8Array(W * H * 4);
  const black = [0, 0, 0, 255];

  drawSpeakerForPlaying(pixels);

  // Sound waves - arcs emanating from the speaker cone
  // Center the arcs on the speaker output point
  const cx = 12;
  const cy = 11;
  const startAngle = -Math.PI / 4;  // -45 degrees
  const endAngle = Math.PI / 4;     // +45 degrees

  // First wave (small)
  drawArc(pixels, cx, cy, 3, 4.2, startAngle, endAngle, black);

  // Second wave (medium)
  drawArc(pixels, cx, cy, 6, 7.2, startAngle, endAngle, black);

  // Third wave (large)
  drawArc(pixels, cx, cy, 9, 10.2, startAngle, endAngle, black);

  const png = createPNG(pixels);
  fs.writeFileSync(path.join(__dirname, 'tray-icon-playing.png'), png);
  console.log('Created tray-icon-playing.png');
}

console.log('Done! Both icons generated.');
