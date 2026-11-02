import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0;
    pixels.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundRect(x, y, left, top, right, bottom, radius) {
  if (x < left || y < top || x > right || y > bottom) return false;
  if (x >= left + radius && x <= right - radius) return true;
  if (y >= top + radius && y <= bottom - radius) return true;
  const corners = [
    [left + radius, top + radius],
    [right - radius, top + radius],
    [left + radius, bottom - radius],
    [right - radius, bottom - radius],
  ];
  return corners.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2);
}

function starPoints(cx, cy, outer, inner) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

function pointInPoly(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function render(size, inset) {
  const pixels = Buffer.alloc(size * size * 4);
  const bg = [20, 72, 51];
  const card = [255, 248, 238];
  const band = [240, 180, 41];
  const star = [226, 91, 69];
  const pad = size * inset;
  const left = pad;
  const top = pad * 1.02;
  const right = size - pad;
  const bottom = size - pad * 0.92;
  const radius = (right - left) * 0.12;
  const bandBottom = top + (bottom - top) * 0.2;
  const cx = size / 2;
  const cy = bandBottom + (bottom - bandBottom) * 0.46;
  const outer = (right - left) * 0.22;
  const points = starPoints(cx, cy, outer, outer * 0.42);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < 2; sy += 1) {
        for (let sx = 0; sx < 2; sx += 1) {
          const px = x + (sx + 0.5) / 2;
          const py = y + (sy + 0.5) / 2;
          let color = bg;
          if (inRoundRect(px, py, left, top, right, bottom, radius)) {
            color = py < bandBottom ? band : card;
            if (pointInPoly(px, py, points)) color = star;
          }
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      const index = (y * size + x) * 4;
      pixels[index] = Math.round(r / 4);
      pixels[index + 1] = Math.round(g / 4);
      pixels[index + 2] = Math.round(b / 4);
      pixels[index + 3] = 255;
    }
  }
  return encodePng(size, pixels);
}

const outDir = path.resolve('public/icons');
fs.mkdirSync(outDir, { recursive: true });
const files = [
  ['icon-192.png', 192, 0.16],
  ['icon-512.png', 512, 0.16],
  ['apple-touch-icon.png', 180, 0.14],
  ['icon-maskable-512.png', 512, 0.28],
];
for (const [name, size, inset] of files) {
  fs.writeFileSync(path.join(outDir, name), render(size, inset));
  console.log('wrote', name);
}
