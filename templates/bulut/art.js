// "Bulutlar ustida" rasmlari: havo shari, parashyut, qog'oz samolyotcha, qushlar, shtrix-kod.
// Hammasi kod bilan chiziladi (SVG) — istalgan ekranda tiniq.

export const SKY = {
  navy: '#1d3557',
  blue: '#2f6fb4',
  sky: '#8cc8f5',
  coral: '#ff7a5c',
  sun: '#f2b441',
  mint: '#6cc4a4',
  rose: '#f59ab0',
  lilac: '#a99bef',
  cream: '#fffaf0',
};

/** Havo shari ranglari (dastur bandlari navbat bilan oladi). */
export const BALLOON_SETS = [
  [SKY.coral, SKY.sun],
  [SKY.blue, '#ffffff'],
  [SKY.mint, SKY.cream],
  [SKY.rose, '#ffffff'],
  [SKY.lilac, SKY.sun],
];

/** Havo shari: gumbaz (tasmali), arqonlar, savat va olov. viewBox 0 0 100 150 */
export function balloonSvg(c1 = SKY.coral, c2 = SKY.sun, id = 'b') {
  const env = 'M50,4C80,4 96,26 96,52C96,78 70,95 61,108L39,108C30,95 4,78 4,52C4,26 20,4 50,4Z';
  const gore = (k) => `M50,4C${50 + k * 1.55},24 ${50 + k * 1.5},78 ${50 + k * 0.22},108`;
  return `<svg viewBox="0 0 100 150" aria-hidden="true">
    <defs><clipPath id="${id}-c"><path d="${env}"/></clipPath>
      <radialGradient id="${id}-h" cx="35%" cy="28%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient></defs>
    <path d="${env}" fill="${c1}"/>
    <g clip-path="url(#${id}-c)">
      <path d="${gore(-11)}L${50 + 11 * 0.22},108C${50 + 11 * 1.5},78 ${50 + 11 * 1.55},24 50,4Z" fill="${c2}"/>
      <path d="${gore(-34)}L${50 - 22 * 0.22},108C${50 - 22 * 1.5},78 ${50 - 22 * 1.55},24 50,4Z" fill="${c2}"/>
      <path d="${gore(34)}L${50 + 22 * 0.22},108C${50 + 22 * 1.5},78 ${50 + 22 * 1.55},24 50,4Z" fill="${c2}"/>
      ${[-34, -22, -11, 11, 22, 34].map((k) => `<path d="${gore(k)}" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="1"/>`).join('')}
      <rect x="0" y="0" width="100" height="110" fill="url(#${id}-h)"/>
    </g>
    <path d="M39,108L42,121M61,108L58,121M46,108L46.5,121M54,108L53.5,121" stroke="#6b4a2f" stroke-width="1.1"/>
    <ellipse class="flame" cx="50" cy="116" rx="3" ry="5" fill="#ffb347"/>
    <path d="M40,121L60,121L58,136L42,136Z" fill="#b07a45" stroke="#6b4a2f" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M41,126L59,126M41.6,131L58.4,131" stroke="#8a5a31" stroke-width="1"/>
  </svg>`;
}

/** Parashyutda tushayotgan manzil belgisi. viewBox 0 0 120 150 */
export function parachuteSvg() {
  const cols = [SKY.coral, '#ffffff', SKY.sun, '#ffffff', SKY.blue, '#ffffff'];
  const segs = cols.map((c, i) => {
    const a0 = Math.PI + (i / 6) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    const p = (a) => `${(60 + Math.cos(a) * 54).toFixed(1)},${(58 + Math.sin(a) * 50).toFixed(1)}`;
    const m = (a0 + a1) / 2;
    const q = `${(60 + Math.cos(m) * 40).toFixed(1)},${(58 + Math.sin(m) * 30 + 14).toFixed(1)}`;
    return `<path d="M60,58L${p(a0)}A54,50 0 0 1 ${p(a1)}Z" fill="${c}"/><path d="M${p(a0)}Q${q} ${p(a1)}" fill="none" stroke="rgba(0,0,0,.08)"/>`;
  });
  const cordX = [8, 30, 60, 90, 112];
  return `<svg viewBox="0 0 120 150" aria-hidden="true">
    <g stroke="rgba(29,53,87,.25)" stroke-width="1.3">${segs.join('')}</g>
    <path d="M6,58Q60,70 114,58" fill="none" stroke="rgba(29,53,87,.2)" stroke-width="1.5"/>
    ${cordX.map((x) => `<path d="M${x},58L60,112" stroke="#6b7fa0" stroke-width="0.9"/>`).join('')}
    <path d="M60,146C60,146 44,128 44,118C44,108 51,102 60,102C69,102 76,108 76,118C76,128 60,146 60,146Z" fill="${SKY.coral}" stroke="#c9523a" stroke-width="1.5"/>
    <circle cx="60" cy="118" r="6.5" fill="#fff"/>
  </svg>`;
}

/** Qog'oz samolyotcha (o'ngga uchadi). viewBox 0 0 48 32 */
export const PAPER_PLANE = `<svg viewBox="0 0 48 32" aria-hidden="true"><path d="M2,14L46,2L20,20Z" fill="#fff" stroke="#9fb3cf" stroke-width="1" stroke-linejoin="round"/><path d="M20,20L46,2L26,30Z" fill="#e6eef8" stroke="#9fb3cf" stroke-width="1" stroke-linejoin="round"/><path d="M20,20L22,27L26,30" fill="#cdd9ea" stroke="#9fb3cf" stroke-width="1" stroke-linejoin="round"/></svg>`;

/** Qush (qanot qoqadi — CSS bilan). */
export const BIRD = `<svg viewBox="0 0 40 16" aria-hidden="true"><path class="wing" d="M1,9C8,1 14,2 20,10C26,2 32,1 39,9" fill="none" stroke="#2d4a70" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Chipta uchun shtrix-kod (ismlardan barqaror). */
export function barcodeSvg(seedText = '') {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  let x = 0;
  const bars = [];
  for (let i = 0; i < 46; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const w = 1 + (h % 3);
    if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="40"/>`);
    x += w;
  }
  return `<svg viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true"><g fill="#1d3557">${bars.join('')}</g></svg>`;
}
