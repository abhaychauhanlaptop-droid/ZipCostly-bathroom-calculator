// Generates the brand files in /public from one source of truth.
// Run with: npm run brand
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';

const TEAL = '#0E6E6E';
const ORANGE = '#F28C28';
const INK = '#15201F';
const WHITE = '#FFFFFF';

// 64×64 icon: teal rounded tile, white map pin, teal house with an orange door.
const iconBody = `
  <rect width="64" height="64" rx="14" fill="${TEAL}"/>
  <path d="M32 57C32 57 13 39.6 13 26.5a19 19 0 0 1 38 0C51 39.6 32 57 32 57Z" fill="${WHITE}"/>
  <path d="M32 14.5 20.5 24.6a1.6 1.6 0 0 0 2.1 2.4l1.4-1.2V36.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V25.8l1.4 1.2a1.6 1.6 0 0 0 2.1-2.4Z" fill="${TEAL}"/>
  <rect x="29" y="28.5" width="6" height="9.5" rx="1" fill="${ORANGE}"/>`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${iconBody}
</svg>
`;

// Wordmark: "zip" teal + "costly" ink, Plus Jakarta Sans 800, converted to paths so the
// logo renders identically everywhere without the font installed.
const fontFile = new URL(
  '../node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff',
  import.meta.url,
);
const buf = readFileSync(fontFile);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const size = 44;
const baseline = 46;
const x0 = 76;
// Lay glyphs out by hand (cmap + kerning); opentype.js's shaper chokes on this font's GSUB.
function textPath(text, x) {
  const scale = size / font.unitsPerEm;
  const path = new opentype.Path();
  let prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) x += font.getKerningValue(prev, g) * scale;
    path.extend(g.getPath(x, baseline, size));
    x += g.advanceWidth * scale;
    prev = g;
  }
  return { path, end: x };
}
const zip = textPath('zip', x0).path;
const zipEnd = textPath('zip', x0).end;
const costlyText = textPath('costly', zipEnd);
const costly = costlyText.path;
const width = Math.ceil(costlyText.end + 2);

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 64" width="${width}" height="64" role="img" aria-label="ZipCostly">
  <g>${iconBody}
  </g>
  <path d="${zip.toPathData(2)}" fill="${TEAL}"/>
  <path d="${costly.toPathData(2)}" fill="${INK}"/>
</svg>
`;

// White-text variant for dark backgrounds.
const logoOnDark = logo.replace(`fill="${INK}"`, `fill="${WHITE}"`).replace(`fill="${TEAL}"/>\n  <path`, `fill="#7FD6D0"/>\n  <path`);

writeFileSync('public/icon.svg', icon);
writeFileSync('public/favicon.svg', icon);
writeFileSync('public/logo.svg', logo);
writeFileSync('src/assets/logo.svg', logo);
writeFileSync('src/assets/logo-on-dark.svg', logoOnDark);

const png = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng();

writeFileSync('public/apple-touch-icon.png', png(icon, 180));
writeFileSync('public/icon-192.png', png(icon, 192));
writeFileSync('public/icon-512.png', png(icon, 512));

// favicon.ico containing one 32×32 PNG (all modern browsers accept PNG-in-ICO).
const ico32 = png(icon, 32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico32.length, 14);
header.writeUInt32LE(22, 18); // offset
writeFileSync('public/favicon.ico', Buffer.concat([header, ico32]));

console.log(`Brand files written (logo ${width}×64).`);
