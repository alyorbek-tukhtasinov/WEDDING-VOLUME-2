// Pop-up manzaralar: har biri qog'ozdan kesilgan qatlamlar (orqadan oldinga).
// Sahifa ochilganda qatlamlar birin-ketin "tik turadi" (rotateX), xuddi pop-up kitobdagidek.
// Hamma rasm kod bilan chiziladi (viewBox 0 0 300 180) — istalgan ekranda tiniq.

export const C = {
  blush: '#f2c4c0',
  rose: '#d9828a',
  wine: '#8e2c43',
  peach: '#f6d3b3',
  gold: '#d6a84b',
  goldDark: '#9c7424',
  sage: '#9dbb97',
  green: '#5f8a64',
  sky: '#cfe1ef',
  navy: '#2f3a5c',
  cream: '#fffaf0',
  ink: '#3a2e2a',
  lilac: '#d8cbe6',
};

// Qog'oz qirqimi: oq ichki chiziq (kesilgan qirra) + to'q kontur
const cut = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" stroke="rgba(60,40,30,.35)" stroke-width="1.2" stroke-linejoin="round" ${extra}/>`;
const svg = (body, vb = '0 0 300 180') => `<svg viewBox="${vb}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${body}</svg>`;
const heart = (x, y, s, fill) => cut(`M${x},${y + s * 0.9}C${x - s * 1.4},${y - s * 0.1} ${x - s * 0.7},${y - s * 1.1} ${x},${y - s * 0.35}C${x + s * 0.7},${y - s * 1.1} ${x + s * 1.4},${y - s * 0.1} ${x},${y + s * 0.9}Z`, fill);
const bush = (x, y, r, fill) => cut(`M${x - r * 2},${y}C${x - r * 2.2},${y - r * 1.2} ${x - r},${y - r * 1.8} ${x - r * 0.4},${y - r * 1.1}C${x},${y - r * 2} ${x + r * 1.4},${y - r * 1.8} ${x + r * 1.1},${y - r * 0.9}C${x + r * 2.2},${y - r * 1.1} ${x + r * 2.4},${y - r * 0.2} ${x + r * 2},${y}Z`, fill);
const star = (x, y, r, fill) => cut(`M${x},${y - r}L${x + r * 0.28},${y - r * 0.28}L${x + r},${y}L${x + r * 0.28},${y + r * 0.28}L${x},${y + r}L${x - r * 0.28},${y + r * 0.28}L${x - r},${y}L${x - r * 0.28},${y - r * 0.28}Z`, fill);

/** Kelin-kuyov gul ravoq ostida (taklif sahifasi). */
export function sceneCouple() {
  const flowers = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI * (i / 12);
    const x = 150 - Math.cos(a) * 92;
    const y = 168 - Math.sin(a) * 138;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 2 ? 9 : 12}" fill="${i % 3 === 0 ? C.rose : i % 3 === 1 ? C.blush : C.cream}" stroke="rgba(60,40,30,.3)"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${C.gold}"/>`;
  }).join('');
  return [
    svg(`${cut('M52,178L52,86C52,20 248,20 248,86L248,178L232,178L232,88C232,40 68,40 68,88L68,178Z', C.sage)}${flowers}`),
    svg(
      // Kuyov
      cut('M118,178L121,118C121,104 129,98 136,98C143,98 150,104 150,118L152,178Z', C.navy) +
        '<circle cx="136" cy="86" r="11" fill="' + C.peach + '" stroke="rgba(60,40,30,.35)"/>' +
        cut('M125,84C125,74 147,72 147,84C143,79 131,79 125,84Z', C.ink) +
        cut('M133,102L136,112L139,102Z', C.cream) +
        // Kelin (fata bilan)
        cut('M150,178L160,120C160,108 167,102 172,102C178,102 184,108 185,120L200,178Z', C.cream) +
        cut('M158,84C152,110 150,150 146,176L160,176C162,140 166,110 170,90Z', 'rgba(255,255,255,.75)') +
        '<circle cx="172" cy="89" r="10.5" fill="' + C.peach + '" stroke="rgba(60,40,30,.35)"/>' +
        cut('M161,88C160,74 184,72 183,88C179,81 166,80 161,88Z', '#6b4a3a') +
        '<circle cx="166" cy="80" r="4" fill="' + C.rose + '"/>' +
        cut('M160,128C166,122 172,124 170,132C166,136 160,134 160,128Z', C.rose),
    ),
    svg(`${heart(150, 38, 12, C.wine)}${heart(110, 58, 7, C.rose)}${heart(192, 54, 8, C.rose)}${bush(62, 180, 14, C.green)}${bush(238, 180, 16, C.green)}`),
  ];
}

/** Taqvim varag'i va uzuklar (sana sahifasi). */
export function sceneCalendar(day, month) {
  return [
    svg(
      cut('M80,178L80,40L220,40L220,178Z', C.cream) +
        cut('M80,40L220,40L220,74L80,74Z', C.wine) +
        [104, 150, 196].map((x) => `<rect x="${x - 3}" y="30" width="6" height="18" rx="3" fill="${C.goldDark}"/>`).join('') +
        `<text x="150" y="64" text-anchor="middle" font-family="Cinzel, serif" font-size="15" letter-spacing="3" fill="${C.cream}">${month}</text>` +
        `<text x="150" y="140" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="700" font-size="62" fill="${C.wine}">${day}</text>`,
    ),
    svg(
      `<circle cx="226" cy="160" r="16" fill="none" stroke="${C.goldDark}" stroke-width="6"/><circle cx="226" cy="160" r="16" fill="none" stroke="${C.gold}" stroke-width="3.4"/>` +
        `<circle cx="252" cy="160" r="16" fill="none" stroke="${C.goldDark}" stroke-width="6"/><circle cx="252" cy="160" r="16" fill="none" stroke="#f2d27d" stroke-width="3.4"/>` +
        cut('M252,138L258,144L252,150L246,144Z', C.sky),
    ),
    svg(`${star(58, 64, 9, C.gold)}${star(246, 58, 11, C.gold)}${star(250, 110, 6, C.gold)}${heart(56, 140, 9, C.rose)}`),
  ];
}

/** Karnay, surnay va doira (dastur sahifasi). */
export function sceneMusic() {
  const note = (x, y, f) => `<g fill="${f}"><ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" transform="rotate(-20 ${x} ${y})"/><rect x="${x + 4.5}" y="${y - 26}" width="2.4" height="26"/></g>`;
  return [
    svg(`<path d="M20,70C70,40 110,100 160,60C210,20 250,80 290,50" fill="none" stroke="${C.sage}" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>${note(60, 70, C.wine)}${note(150, 58, C.navy)}${note(236, 52, C.wine)}`),
    svg(
      // Karnay (uzun tilla karnay) — chapga egilgan
      cut('M40,176L150,82L156,88L50,178Z', C.gold) +
        cut('M140,70C160,58 176,62 172,80C168,96 150,98 142,90Z', '#e7bf62') +
        // Surnay — o'ngda
        cut('M252,176L186,96L192,92L260,172Z', '#b8863a') +
        cut('M180,80L196,98L186,104L172,88Z', C.goldDark) +
        // Doira
        `<circle cx="150" cy="140" r="34" fill="${C.cream}" stroke="${C.goldDark}" stroke-width="6"/>` +
        `<circle cx="150" cy="140" r="26" fill="none" stroke="${C.rose}" stroke-width="1.5" stroke-dasharray="3 3"/>` +
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return `<circle cx="${(150 + Math.cos(a) * 34).toFixed(1)}" cy="${(140 + Math.sin(a) * 34).toFixed(1)}" r="3" fill="#f2d27d"/>`;
        }).join(''),
    ),
    svg(`${star(40, 40, 7, C.gold)}${star(270, 100, 8, C.gold)}${heart(250, 30, 7, C.rose)}`),
  ];
}

/** To'yxona: gumbaz, ravoqlar, chiroqlar (manzil sahifasi). */
export function sceneVenue() {
  const arches = [96, 128, 172, 204].map((x) => cut(`M${x - 11},170L${x - 11},138C${x - 11},124 ${x + 11},124 ${x + 11},138L${x + 11},170Z`, '#f6d77f')).join('');
  return [
    svg(cut('M0,178C40,130 90,120 130,140C170,110 230,112 300,150L300,178Z', C.sage) + cut('M0,178C60,150 120,160 170,152C220,146 260,158 300,170L300,178Z', C.green)),
    svg(
      cut('M70,178L70,112L230,112L230,178Z', C.cream) +
        cut('M112,112C112,72 188,72 188,112Z', C.sky) +
        cut('M147,62L153,62L152,74L148,74Z', C.goldDark) +
        `<circle cx="150" cy="60" r="4" fill="${C.gold}"/>` +
        cut('M62,112L238,112L230,100L70,100Z', C.rose) +
        arches +
        cut('M138,178L138,142C138,130 162,130 162,142L162,178Z', C.wine),
    ),
    svg(
      bush(40, 180, 12, C.green) +
        bush(262, 180, 13, C.green) +
        // Xarita belgisi (pin)
        cut('M150,58C136,58 128,68 128,79C128,94 150,112 150,112C150,112 172,94 172,79C172,68 164,58 150,58Z', C.wine, 'class="pin"') +
        `<circle cx="150" cy="79" r="7" fill="${C.cream}" class="pin"/>`,
    ),
  ];
}

/** Liboslar ilgichlarda (dress-kod sahifasi). */
export function sceneDress(colors = []) {
  const [c1 = C.cream, c2 = C.navy] = colors;
  const hook = (x) => `<path d="M${x},30C${x},22 ${x + 8},22 ${x + 8},30C${x + 8},36 ${x},36 ${x},42" fill="none" stroke="${C.goldDark}" stroke-width="2.4" stroke-linecap="round"/>`;
  return [
    svg(`<path d="M20,32L280,32" stroke="${C.goldDark}" stroke-width="4" stroke-linecap="round"/>` + cut('M10,20L50,20L60,178L0,178Z', C.rose) + cut('M290,20L250,20L240,178L300,178Z', C.rose)),
    svg(
      hook(104) +
        cut('M104,42L78,52L86,66L98,60L90,178L140,178L122,60L132,66L140,52Z', c1) +
        cut('M98,60C104,72 116,72 122,60', 'none') +
        hook(188) +
        cut('M188,42L160,54L166,112L178,112L178,178L200,178L200,112L212,112L216,54Z', c2) +
        cut('M188,44L180,70L188,80L196,70Z', C.cream) +
        cut('M186,58L190,58L189,66L187,66Z', C.wine),
    ),
    svg(`${heart(150, 52, 8, C.wine)}${star(60, 80, 6, C.gold)}${star(246, 86, 7, C.gold)}`),
  ];
}

/** Maktub: konvert, xat va yurak muhr (javob sahifasi). */
export function sceneLetter() {
  return [
    svg(cut('M70,178L70,92L230,92L230,178Z', C.rose)),
    svg(cut('M86,160L86,50L214,50L214,160Z', C.cream) + [72, 86, 100, 114].map((y) => `<path d="M104,${y}L196,${y}" stroke="${C.sage}" stroke-width="2" stroke-dasharray="${y === 72 ? '0' : '4 3'}"/>`).join('') + heart(150, 132, 9, C.rose), '0 0 300 180'),
    svg(cut('M70,178L70,110L150,150L230,110L230,178Z', C.blush) + `<circle cx="150" cy="150" r="13" fill="${C.wine}" stroke="rgba(60,40,30,.4)"/>` + heart(150, 150, 5, '#f7d9d6')),
  ];
}

/** To'y torti va kaptarlar (yakun). */
export function sceneCake() {
  const dove = (x, flip) => `<g transform="translate(${x},0) scale(${flip ? -1 : 1},1)">${cut('M0,58C8,48 26,46 36,50C42,52 46,50 48,46C51,42 56,44 55,49L60,51L55,53C53,58 47,61 39,62C26,64 10,63 0,58Z', C.cream)}${cut('M14,52C16,40 26,32 38,33C31,39 29,45 27,53Z', '#eef2fb')}</g>`;
  return [
    svg(`${star(40, 40, 8, C.gold)}${star(262, 34, 9, C.gold)}${star(220, 80, 5, C.gold)}${star(76, 92, 5, C.gold)}`),
    svg(
      cut('M92,178L92,142L208,142L208,178Z', C.cream) +
        cut('M108,142L108,112L192,112L192,142Z', C.blush) +
        cut('M124,112L124,86L176,86L176,112Z', C.cream) +
        [150, 128, 104].map((y, i) => `<path d="M${92 + i * 16},${y + 30}Q${150},${y + 38} ${208 - i * 16},${y + 30}" fill="none" stroke="${C.rose}" stroke-width="2.4" stroke-dasharray="1 5" stroke-linecap="round"/>`).join('') +
        heart(150, 74, 9, C.wine),
    ),
    svg(`<g transform="translate(66,0)">${dove(0, false)}</g><g transform="translate(234,0)">${dove(0, true)}</g>`),
  ];
}
