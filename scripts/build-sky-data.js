// "Osmon" shabloni uchun ma'lumotlarni tayyorlash (bir marta, qo'lda ishga tushiriladi):
//   npm pack d3-celestial && tar -xzf d3-celestial-*.tgz
//   node scripts/build-sky-data.js <package/data papkasi>
// Manba: d3-celestial (BSD-3, Olaf Frohn) — Yale Bright Star Catalogue (ochiq), Somon yo'li chegaralari.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const out = path.resolve(import.meta.dirname, '..', 'templates', 'osmon', 'data');
if (!src || !fs.existsSync(path.join(src, 'stars.6.json'))) {
  console.error('Foydalanish: node scripts/build-sky-data.js <d3-celestial/data>');
  process.exit(1);
}
const read = (f) => JSON.parse(fs.readFileSync(path.join(src, f), 'utf8'));
const r = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const ra360 = (lon) => (lon + 360) % 360;

// 1) Yulduzlar: [RA°, Dec°, kattalik, B−V] — yorqinlik bo'yicha tartiblangan
const stars = read('stars.6.json')
  .features.map((f) => {
    const [lon, lat] = f.geometry.coordinates;
    const bv = parseFloat(f.properties.bv);
    return [r(ra360(lon), 3), r(lat, 3), r(f.properties.mag, 2), Number.isFinite(bv) ? r(bv, 2) : 0.6];
  })
  .sort((a, b) => a[2] - b[2]);
fs.writeFileSync(path.join(out, 'stars.json'), JSON.stringify(stars));

// 2) Somon yo'li — galaktika koordinatalarida (l, b) quriladi: u osmonni to'liq aylanib chiqadigan
//    halqa, shuning uchun tekis xaritadagi poligonlardan emas, galaktika tekisligidan hisoblanadi.
//    Tuzilishi: markaz (Qavs) yorqin, qarama-qarshi tomon xira, markaziy bo'rtiq,
//    Buyuk rift (qorong'i chang), "Ko'mir qopi" va bulutsimon notekislik.
const RAD = Math.PI / 180;
function galToEq(l, b) {
  const ra0 = 192.85948, dec0 = 27.12825, l0 = 122.93192;
  const s = Math.sin, c = Math.cos;
  const dec = Math.asin(s(b * RAD) * s(dec0 * RAD) + c(b * RAD) * c(dec0 * RAD) * c((l0 - l) * RAD)) / RAD;
  const ra = ra0 + Math.atan2(c(b * RAD) * s((l0 - l) * RAD), s(b * RAD) * c(dec0 * RAD) - c(b * RAD) * s(dec0 * RAD) * c((l0 - l) * RAD)) / RAD;
  return [(ra + 360) % 360, dec];
}
// Takrorlanuvchi (seed'li) shovqin — har build'da bir xil natija
function hash(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => 0.55 * noise(x, y) + 0.3 * noise(x * 2.1, y * 2.1) + 0.15 * noise(x * 4.3, y * 4.3);
const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));
const dl = (a, b) => ((a - b + 540) % 360) - 180;
const cells = [];
for (let l = 0; l < 360; l += 1.1) {
  const toCenter = Math.abs(dl(l, 0));
  const width = 5 + 7 * gauss(toCenter, 50); // markaz atrofida kengroq
  const amp = 0.28 + 0.72 * Math.pow(Math.cos((toCenter * RAD) / 2), 1.6);
  for (let b = -26; b <= 26; b += 1.1) {
    let v = amp * gauss(b, width);
    v += 0.45 * gauss(toCenter, 14) * gauss(b, 9); // markaziy bo'rtiq
    const rift = gauss(dl(l, 35), 28) * gauss(b - 1.5, 2.2); // Buyuk rift (Burgut – Oqqush)
    v *= 1 - 0.75 * rift;
    v *= 1 - 0.8 * gauss(Math.hypot(dl(l, 301), b + 1), 2.8); // Ko'mir qopi
    v *= 0.45 + 0.9 * fbm(l / 9, b / 5);
    if (v < 0.06) continue;
    const [ra, dec] = galToEq(l, b);
    cells.push([r(ra, 1), r(dec, 1), r(Math.min(1, v), 2)]);
  }
}
fs.writeFileSync(path.join(out, 'milkyway.json'), JSON.stringify(cells));

// 3) Yulduz turkumlari chiziqlari (tomosha rejimi uchun): [[RA,Dec],...] segmentlar
const lines = read('constellations.lines.json').features.flatMap((f) =>
  f.geometry.coordinates.map((line) => line.map(([lon, lat]) => [r(ra360(lon), 2), r(lat, 2)])),
);
fs.writeFileSync(path.join(out, 'constellations.json'), JSON.stringify(lines));

const size = (f) => (fs.statSync(path.join(out, f)).size / 1024).toFixed(0) + ' KB';
console.log(`✔ yulduzlar: ${stars.length} (${size('stars.json')}), Somon yo'li kataklari: ${cells.length} (${size('milkyway.json')}), turkum chiziqlari: ${lines.length} (${size('constellations.json')})`);
