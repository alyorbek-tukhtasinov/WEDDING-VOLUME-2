// SVG tort: ikki qavatli, oqib tushgan glazur, sepilgan shirinliklar va shamlar.
// Yosh ma'lum bo'lsa — raqamli shamlar ("1" va "8"), bo'lmasa — beshta ingichka yo'l-yo'l sham.
// Olov, nur va tutun ham SVG ichida: CSS bilan miltillaydi, puflanganda egiladi va o'chadi.
// Bu fayl DOM'ga bog'liq emas (faqat satr qaytaradi) — testlarda ham ishlatiladi.

const W = 300;
const H = 300;
const CX = W / 2;

// Bir xil ism/yosh — har safar bir xil bezak (tasodifiy, lekin barqaror)
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const f = (n) => Math.round(n * 10) / 10;

/** Glazur oqimlari: ellips qirrasidan pastga tushadigan tomchilar. */
function dripPath(cx, cy, rx, ry, depth, rand) {
  const n = 14;
  let d = `M${f(cx - rx)} ${f(cy)}`;
  // Yuqori qirra (oldingi yarim ellips) bo'ylab tomchilar
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI - t * Math.PI;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i > 0) {
      const px = cx + Math.cos(Math.PI - ((i - 0.5) / n) * Math.PI) * rx;
      const len = depth * (0.35 + rand() * 0.9) * (0.55 + 0.45 * Math.sin(t * Math.PI));
      const w = (rx * 2) / n / 2.6;
      const baseY = cy + Math.sin(Math.PI - ((i - 0.5) / n) * Math.PI) * ry;
      d += ` L${f(px - w)} ${f(baseY)} C${f(px - w)} ${f(baseY + len)} ${f(px + w)} ${f(baseY + len)} ${f(px + w)} ${f(baseY)}`;
    }
    d += ` L${f(x)} ${f(y)}`;
  }
  // Orqa qirra — ellips ustidan qaytish
  d += ` A${rx} ${ry} 0 0 0 ${f(cx - rx)} ${f(cy)} Z`;
  return d;
}

function sprinkles(cx, cy, rx, ry, count, rand, colors) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.86;
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    const rot = Math.round(rand() * 180);
    const c = colors[i % colors.length];
    out += `<rect x="${f(x - 3)}" y="${f(y - 0.9)}" width="6" height="1.8" rx=".9" fill="${c}" transform="rotate(${rot} ${f(x)} ${f(y)})"/>`;
  }
  return out;
}

function pearls(cx, cy, rx, ry, count, r, fill) {
  let out = '';
  for (let i = 0; i <= count; i++) {
    const a = Math.PI - (i / count) * Math.PI;
    out += `<circle cx="${f(cx + Math.cos(a) * rx)}" cy="${f(cy + Math.sin(a) * ry)}" r="${r}" fill="${fill}"/>`;
  }
  return out;
}

/** Bitta olov: nur (glow), olov tili va ko'k o'zak. (x, y) — pilik uchi. */
function flame(x, y, i) {
  return `<g class="cake__flame" data-i="${i}" style="--d:${(i * 0.37) % 1.3}s">
      <circle class="cake__halo" cx="${f(x)}" cy="${f(y - 14)}" r="46" fill="url(#ck-halo)"/>
      <g class="cake__tongue" style="transform-origin:${f(x)}px ${f(y + 1)}px"><g transform="translate(${f(x)} ${f(y + 1)}) scale(1.55) translate(${f(-x)} ${f(-y - 1)})">
        <path d="M${f(x)} ${f(y - 22)} C${f(x + 7)} ${f(y - 12)} ${f(x + 6.5)} ${f(y - 2)} ${f(x)} ${f(y + 1)} C${f(x - 6.5)} ${f(y - 2)} ${f(x - 7)} ${f(y - 12)} ${f(x)} ${f(y - 22)}Z" fill="url(#ck-flame)"/>
        <path d="M${f(x)} ${f(y - 9)} C${f(x + 2.6)} ${f(y - 5)} ${f(x + 2.4)} ${f(y - 1)} ${f(x)} ${f(y + 0.5)} C${f(x - 2.4)} ${f(y - 1)} ${f(x - 2.6)} ${f(y - 5)} ${f(x)} ${f(y - 9)}Z" fill="#7fb4ff" opacity=".85"/>
      </g></g>
      <path class="cake__smoke" d="M${f(x)} ${f(y - 2)} c-6 -10 6 -16 0 -26 c-6 -10 6 -16 0 -26 c-5 -9 5 -13 0 -22" fill="none" stroke="#d9d2e6" stroke-width="2.4" stroke-linecap="round"/>
      <circle class="cake__spark" cx="${f(x)}" cy="${f(y - 4)}" r="5" fill="#fff6c8"/>
    </g>`;
}

/**
 * Tort SVG. age — raqamli shamlar uchun (null bo'lsa — oddiy shamlar).
 * Qaytaradi: { svg, candles } — candles: olovlar soni.
 */
export function cakeSvg({ age = null, seed = 7 } = {}) {
  const rand = rng(seed * 9973 + 17);
  const SPR = ['#ff7aa8', '#7ee0c3', '#ffd166', '#8fb7ff', '#b79cff', '#ffffff'];

  // Qavatlar: pastki (keng) va ustki
  const b = { cy: 196, rx: 118, ry: 20, h: 66 };
  const t = { cy: 132, rx: 80, ry: 14, h: 64 };

  const digits = Number.isInteger(age) && age > 0 ? String(age).slice(0, 3).split('') : null;
  let candles = '';
  let flames = '';
  let count = 0;

  if (digits) {
    // Raqamli shamlar: katta, yo'l-yo'l, tilla qirrali
    const size = digits.length === 1 ? 96 : digits.length === 2 ? 84 : 66;
    const gap = size * 0.6;
    const base = t.cy - 2;
    const x0 = CX - ((digits.length - 1) * gap) / 2;
    digits.forEach((ch, i) => {
      const x = x0 + i * gap;
      const top = base - size * 0.74;
      candles += `<g class="cake__num">
          <text x="${f(x)}" y="${f(base)}" text-anchor="middle" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="${size}" fill="url(#ck-stripe)" stroke="#f3c969" stroke-width="2.2" paint-order="stroke" stroke-linejoin="round">${ch}</text>
          <text x="${f(x)}" y="${f(base)}" text-anchor="middle" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="${size}" fill="url(#ck-gloss)" opacity=".55">${ch}</text>
          <rect x="${f(x - 1)}" y="${f(top - 9)}" width="2" height="10" rx="1" fill="#3a2a2a"/>
        </g>`;
      flames += flame(x, top - 9, count++);
    });
  } else {
    // Oddiy shamlar (5 ta)
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = CX - 48 + i * 24;
      const lift = Math.abs(i - 2) * 3;
      const top = t.cy - 50 + lift;
      candles += `<g class="cake__stick">
          <rect x="${f(x - 4)}" y="${f(top)}" width="8" height="${f(t.cy - 4 - top)}" rx="3" fill="url(#ck-stick)"/>
          <rect x="${f(x - 4)}" y="${f(top)}" width="3" height="${f(t.cy - 4 - top)}" rx="1.5" fill="#fff" opacity=".35"/>
          <rect x="${f(x - 0.8)}" y="${f(top - 7)}" width="1.6" height="8" rx=".8" fill="#3a2a2a"/>
        </g>`;
      flames += flame(x, top - 7, count++);
    }
  }

  const svg = `<svg class="cake" viewBox="0 0 ${W} ${H}" role="img" aria-label="Shamli tug‘ilgan kun torti">
    <defs>
      <radialGradient id="ck-halo"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset=".45" stop-color="#ff9d4d" stop-opacity=".16"/><stop offset="1" stop-color="#ff9d4d" stop-opacity="0"/></radialGradient>
      <linearGradient id="ck-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff7d6"/><stop offset=".35" stop-color="#ffd166"/><stop offset=".75" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff5e3a" stop-opacity=".9"/></linearGradient>
      <linearGradient id="ck-bottom" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e98fb0"/><stop offset=".3" stop-color="#ffc4d8"/><stop offset=".55" stop-color="#ffd9e6"/><stop offset="1" stop-color="#d9789e"/></linearGradient>
      <linearGradient id="ck-top" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a98ce8"/><stop offset=".35" stop-color="#d7c8ff"/><stop offset=".6" stop-color="#e8deff"/><stop offset="1" stop-color="#9478d8"/></linearGradient>
      <linearGradient id="ck-glaze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff2df"/><stop offset=".5" stop-color="#fffaf2"/><stop offset="1" stop-color="#f3dcc0"/></linearGradient>
      <linearGradient id="ck-glaze2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff5d8f"/><stop offset=".5" stop-color="#ff86ab"/><stop offset="1" stop-color="#e2457a"/></linearGradient>
      <linearGradient id="ck-plate" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8892f"/><stop offset=".45" stop-color="#ffe7a3"/><stop offset=".6" stop-color="#f3c969"/><stop offset="1" stop-color="#9c7124"/></linearGradient>
      <linearGradient id="ck-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <pattern id="ck-stripe" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="14" height="14" fill="#ff7aa8"/><rect width="6" height="14" fill="#fff4f8"/></pattern>
      <pattern id="ck-stick" width="8" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="8" height="10" fill="#8fb7ff"/><rect width="8" height="4" fill="#fff"/></pattern>
    </defs>

    <ellipse cx="${CX}" cy="${b.cy + b.h + 14}" rx="142" ry="20" fill="#000" opacity=".35"/>
    <ellipse cx="${CX}" cy="${b.cy + b.h + 6}" rx="140" ry="20" fill="url(#ck-plate)"/>
    <ellipse cx="${CX}" cy="${b.cy + b.h + 2}" rx="128" ry="15" fill="#fff4d6" opacity=".35"/>

    <path d="M${CX - b.rx} ${b.cy} V${b.cy + b.h} A${b.rx} ${b.ry} 0 0 0 ${CX + b.rx} ${b.cy + b.h} V${b.cy}Z" fill="url(#ck-bottom)"/>
    <path d="M${CX - b.rx} ${b.cy + b.h * 0.55} A${b.rx} ${b.ry} 0 0 0 ${CX + b.rx} ${b.cy + b.h * 0.55}" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round" opacity=".85"/>
    ${pearls(CX, b.cy + b.h, b.rx, b.ry, 22, 4.2, '#fff6ea')}
    <ellipse cx="${CX}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="url(#ck-glaze2)"/>
    <path d="${dripPath(CX, b.cy, b.rx, b.ry, 30, rand)}" fill="url(#ck-glaze2)"/>
    ${sprinkles(CX, b.cy, b.rx - 6, b.ry - 3, 34, rand, SPR)}

    <path d="M${CX - t.rx} ${t.cy} V${t.cy + t.h} A${t.rx} ${t.ry} 0 0 0 ${CX + t.rx} ${t.cy + t.h} V${t.cy}Z" fill="url(#ck-top)"/>
    <path d="M${CX - t.rx} ${t.cy + t.h * 0.62} A${t.rx} ${t.ry} 0 0 0 ${CX + t.rx} ${t.cy + t.h * 0.62}" fill="none" stroke="#ffd166" stroke-width="3" opacity=".9"/>
    ${pearls(CX, t.cy + t.h, t.rx, t.ry, 16, 3.6, '#fff6ea')}
    <ellipse cx="${CX}" cy="${t.cy}" rx="${t.rx}" ry="${t.ry}" fill="url(#ck-glaze)"/>
    <path d="${dripPath(CX, t.cy, t.rx, t.ry, 26, rand)}" fill="url(#ck-glaze)"/>
    ${sprinkles(CX, t.cy, t.rx - 4, t.ry - 2, 18, rand, SPR)}

    ${candles}
    <g class="cake__flames">${flames}</g>
  </svg>`;

  return { svg, candles: count };
}
