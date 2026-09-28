// Suzani naqshlari: har bir naqsh — tikiladigan qismlar ro'yxati (tartib bilan).
// Qism: { d, color, stitch: 'chain' | 'run' | 'dots' | 'satin', w, fill } yoki matn { text, ... }.
// Hammasi kod bilan chiziladi — istalgan ekranda tiniq, fayl hajmi kichik.

export const PALETTE = {
  red: '#a3192e',
  redDark: '#6b0f1f',
  rose: '#d4566b',
  indigo: '#233f7a',
  indigoDark: '#15264d',
  gold: '#d19a2e',
  goldDark: '#8a5a12',
  green: '#2f6b4f',
  greenLight: '#5b9a6b',
  cream: '#f6ecd6',
  ink: '#2b1a14',
  white: '#fbf6ea',
};

const RAD = Math.PI / 180;
const f = (n) => Math.round(n * 100) / 100;
/** Qutb koordinatasi: a — gradus, 0° tepada, soat yo'nalishida. */
export const polar = (r, a, cx = 0, cy = 0) => [cx + r * Math.sin(a * RAD), cy - r * Math.cos(a * RAD)];
const P = ([x, y]) => `${f(x)},${f(y)}`;

export const circle = (r, cx = 0, cy = 0) => `M${f(cx - r)},${f(cy)}a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0`;

/** Olov shaklidagi gulbarg (suzanining asosiy elementi). */
function petal(r0, r1, a, w, cx = 0, cy = 0) {
  const k = r0 + (r1 - r0) * 0.32;
  return (
    `M${P(polar(r0, a, cx, cy))}` +
    `C${P(polar(k, a - w, cx, cy))} ${P(polar(r1 * 0.94, a - w * 0.55, cx, cy))} ${P(polar(r1, a, cx, cy))}` +
    `C${P(polar(r1 * 0.94, a + w * 0.55, cx, cy))} ${P(polar(k, a + w, cx, cy))} ${P(polar(r0, a, cx, cy))}Z`
  );
}

/**
 * Markaziy medalyon ("oy" / quyosh): ichida ismlar uchun bo'sh joy.
 * viewBox: -200 -200 400 400
 */
export function medallion() {
  const parts = [];
  // Ichki nozik halqalar (ismlar atrofida)
  parts.push({ d: circle(98), color: PALETTE.gold, stitch: 'dots', w: 3.4 });
  parts.push({ d: circle(106), color: PALETTE.indigo, stitch: 'chain', w: 2.6 });
  // Tashqi gulbarglar — qizil va pushti navbatma-navbat
  for (let i = 0; i < 12; i++) {
    const a = i * 30;
    const red = i % 2 === 0;
    parts.push({ d: petal(112, 172, a, 13.5), color: red ? PALETTE.redDark : '#8f2c3c', stitch: 'chain', w: 2.4, fill: red ? 'red' : 'rose' });
    // Gulbarg ichidagi tomir
    parts.push({ d: `M${P(polar(124, a))}L${P(polar(158, a))}`, color: PALETTE.gold, stitch: 'run', w: 1.6 });
  }
  // Gulbarglar orasidagi yashil barglar va nuqtalar
  for (let i = 0; i < 12; i++) {
    const a = i * 30 + 15;
    parts.push({ d: petal(118, 150, a, 7), color: PALETTE.green, stitch: 'chain', w: 2, fill: 'green' });
    parts.push({ d: circle(4, ...polar(162, a)), color: PALETTE.gold, stitch: 'chain', w: 2, fill: 'gold' });
  }
  // Tashqi halqalar
  parts.push({ d: circle(180), color: PALETTE.indigo, stitch: 'chain', w: 2.8 });
  parts.push({ d: circle(188), color: PALETTE.gold, stitch: 'dots', w: 3.2 });
  return { viewBox: '-200 -200 400 400', parts };
}

/** Kichik rozetka (burchaklar, tilak gullari uchun). viewBox -50 -50 100 100 */
export function rosette({ petals = 8, color = 'red', inner = 'gold', leaf = true } = {}) {
  const parts = [];
  const col = PALETTE[color] || color;
  parts.push({ d: circle(9), color: PALETTE.goldDark, stitch: 'chain', w: 1.8, fill: inner });
  const step = 360 / petals;
  for (let i = 0; i < petals; i++) {
    parts.push({ d: petal(12, 40, i * step, 110 / petals + 3), color: shade(col), stitch: 'chain', w: 1.8, fill: color });
  }
  if (leaf) {
    for (let i = 0; i < petals; i++) parts.push({ d: circle(2.4, ...polar(44, i * step + step / 2)), color: PALETTE.green, stitch: 'chain', w: 1.6, fill: 'green' });
  }
  return { viewBox: '-50 -50 100 100', parts };
}

// To'q rang (kontur uchun)
function shade(hex) {
  const map = { [PALETTE.red]: PALETTE.redDark, [PALETTE.rose]: '#8f2c3c', [PALETTE.indigo]: PALETTE.indigoDark, [PALETTE.gold]: PALETTE.goldDark, [PALETTE.green]: '#1d4533' };
  return map[hex] || PALETTE.ink;
}

/** Anor. viewBox 0 0 120 132 */
export function pomegranate() {
  return {
    viewBox: '0 0 120 132',
    parts: [
      { d: 'M72,27C84,11 100,8 110,13C101,24 87,31 72,27Z', color: '#1d4533', stitch: 'chain', w: 1.8, fill: 'green' },
      { d: 'M60,30C92,30 112,54 110,82C108,110 86,126 60,126C34,126 12,110 10,82C8,54 28,30 60,30Z', color: PALETTE.redDark, stitch: 'chain', w: 2.4, fill: 'red' },
      { d: 'M47,32L43,15L53,23L60,8L67,23L77,15L73,32', color: PALETTE.redDark, stitch: 'chain', w: 2.2, fill: 'red' },
      { d: 'M28,64C32,52 42,44 54,42', color: PALETTE.white, stitch: 'run', w: 1.8 },
      { d: 'M88,98C84,108 76,114 66,116', color: '#e7a0a9', stitch: 'run', w: 1.6 },
    ],
  };
}

/** Lola. viewBox 0 0 80 140 */
export function tulip(color = 'red') {
  const c = PALETTE[color];
  return {
    viewBox: '0 0 80 140',
    parts: [
      { d: 'M40,70C40,95 42,115 40,138', color: PALETTE.green, stitch: 'chain', w: 2.4 },
      { d: 'M40,112C24,102 16,88 13,72C28,80 38,93 40,112Z', color: '#1d4533', stitch: 'chain', w: 1.8, fill: 'green' },
      { d: 'M41,100C56,92 63,80 67,66C53,73 44,84 41,100Z', color: '#1d4533', stitch: 'chain', w: 1.8, fill: 'green' },
      { d: 'M40,70C22,66 14,48 18,28C26,38 34,48 40,70Z', color: shade(c), stitch: 'chain', w: 2, fill: color },
      { d: 'M40,70C58,66 66,48 62,28C54,38 46,48 40,70Z', color: shade(c), stitch: 'chain', w: 2, fill: color },
      { d: 'M40,18C53,33 53,57 40,70C27,57 27,33 40,18Z', color: shade(c), stitch: 'chain', w: 2, fill: color === 'red' ? 'rose' : 'red' },
    ],
  };
}

/** Yurak. viewBox 0 0 120 110 */
export function heart(color = 'red') {
  return {
    viewBox: '0 0 120 110',
    parts: [
      { d: 'M60,100C20,70 8,46 20,28C32,10 54,14 60,32C66,14 88,10 100,28C112,46 100,70 60,100Z', color: shade(PALETTE[color]), stitch: 'chain', w: 2.6, fill: color },
      { d: 'M34,34C40,26 48,26 52,32', color: PALETTE.white, stitch: 'run', w: 1.8 },
    ],
  };
}

/** Nikoh uzuklari. viewBox 0 0 130 96 */
export function rings() {
  return {
    viewBox: '0 0 130 96',
    parts: [
      { d: circle(27, 48, 62), color: PALETTE.goldDark, stitch: 'chain', w: 4.2 },
      { d: circle(27, 80, 62), color: PALETTE.gold, stitch: 'chain', w: 4.2 },
      { d: 'M80,21L89,30L80,39L71,30Z', color: PALETTE.indigo, stitch: 'chain', w: 1.8, fill: 'white' },
      { d: 'M80,10L80,15M95,22L91,25M65,22L69,25', color: PALETTE.gold, stitch: 'run', w: 1.6 },
    ],
  };
}

/**
 * Qo'sh kaptar (o'ng tomonga qaragan kaptar; chap tomondagisi aks ettiriladi).
 * Qaytaradi: tana, qanot va ko'z uchun path'lar (uchib kelish animatsiyasi uchun alohida).
 */
export const DOVE = {
  body: 'M22,46C30,32 52,28 68,33C76,35 82,34 86,30C91,25 98,28 97,34L104,37L96,40C93,47 85,52 73,54C57,58 37,56 22,46Z',
  tail: 'M24,45L4,36L9,47L2,56L24,51Z',
  wing: 'M42,38C45,19 59,8 78,9C68,18 64,28 60,39Z',
  eye: circle(1.6, 91, 33),
};

/** Tikuv g'altagi (dress-kod rangi). viewBox 0 0 70 96 */
export function spoolSvg(color) {
  const lines = Array.from({ length: 9 }, (_, i) => `<path d="M14,${24 + i * 6}Q35,${27 + i * 6} 56,${24 + i * 6}" stroke="rgba(255,255,255,.18)" stroke-width="1.2" fill="none"/>`).join('');
  return `<svg viewBox="0 0 70 96" aria-hidden="true">
    <ellipse cx="35" cy="86" rx="31" ry="8" fill="#6d4526"/><rect x="4" y="80" width="62" height="6" fill="#8a5a33"/><ellipse cx="35" cy="80" rx="31" ry="8" fill="#b07b4a"/>
    <rect x="12" y="18" width="46" height="62" rx="4" fill="${color}"/>
    ${lines}
    <rect x="12" y="18" width="46" height="62" rx="4" fill="url(#spool-shine)"/>
    <ellipse cx="35" cy="18" rx="31" ry="8" fill="#b07b4a"/><ellipse cx="35" cy="16" rx="31" ry="8" fill="#c9965f"/><ellipse cx="35" cy="16" rx="6" ry="2" fill="#6d4526"/>
  </svg>`;
}

/** Deterministik gul (tilak uchun): nomdan rang va shakl. */
export function wishFlower(seed) {
  const colors = ['red', 'rose', 'indigo', 'gold', 'green'];
  const r = (n) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * n;
  };
  const color = colors[Math.floor(r(4))];
  const petals = 5 + Math.floor(r(4));
  return rosette({ petals, color, inner: color === 'gold' ? 'red' : 'gold', leaf: r(1) > 0.4 });
}
