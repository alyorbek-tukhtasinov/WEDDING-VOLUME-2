// Osmon sahnasi: to'y kechasining haqiqiy osmoni (yulduzlar, Somon yo'li, Oy, sayyoralar),
// ufqdagi shahar silueti, ismlardan yasalgan yulduz turkumi va mehmonlar tilaklari — yulduzlar.
// Uch qatlam: fon gradienti (2D) → yulduzlar (WebGL) → Oy, ismlar, siluet (2D).

import starsUrl from '../data/stars.json?url';
import mwUrl from '../data/milkyway.json?url';
import linesUrl from '../data/constellations.json?url';
import { skySnapshot, galacticToEq } from './astro.js';
import { makeCamera, project, unproject, dirVec, localFrame, frameToVec, frameTransform, normalize, dot } from './projection.js';
import { createGL, bvColor } from './gl.js';
import { buildSkyline } from './skyline.js';
import { buildNameConstellation } from './names.js';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const mix3 = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const rgb = (c, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function hashStr(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

// Yulduz tasviri (sprite) — bir marta chiziladi, keyin drawImage bilan tez ko'chiriladi
function starSprite(color, spikes) {
  const n = 64;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.1, rgb(color, 0.95));
  g.addColorStop(0.28, rgb(color, 0.32));
  g.addColorStop(0.6, rgb(color, 0.06));
  g.addColorStop(1, rgb(color, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, n, n);
  if (spikes) {
    x.globalCompositeOperation = 'lighter';
    for (const [w, h] of [[n, 1.6], [1.6, n]]) {
      const lg = w > h ? x.createLinearGradient(0, 0, n, 0) : x.createLinearGradient(0, 0, 0, n);
      lg.addColorStop(0, rgb(color, 0));
      lg.addColorStop(0.5, rgb(color, 0.7));
      lg.addColorStop(1, rgb(color, 0));
      x.fillStyle = lg;
      x.fillRect((n - w) / 2, (n - h) / 2, w, h);
    }
  }
  return c;
}

// Osmon ranglari: kechqurun (shafaq) → tun
const SKY = {
  dusk: { zenith: [22, 34, 78], mid: [68, 74, 132], low: [168, 112, 128], horizon: [246, 168, 118] },
  night: { zenith: [2, 4, 11], mid: [5, 9, 24], low: [10, 17, 38], horizon: [26, 32, 56] },
};

/**
 * @param {object} o
 *  root — sahna joylashadigan element (position: fixed, inset: 0)
 *  date, lat, lng — qaysi payt va joy osmoni
 *  groom, bride — ismlar yulduz turkumi uchun
 *  reduced — prefers-reduced-motion
 */
export async function createSky(o) {
  const { root, date, lat, lng, reduced = false } = o;

  const [stars, mw, lines] = await Promise.all(
    [starsUrl, mwUrl, linesUrl].map((u) => fetch(u).then((r) => {
      if (!r.ok) throw new Error(`${u}: ${r.status}`);
      return r.json();
    })),
  );

  const snap = skySnapshot(date, lat, lng);
  const toVec = (ra, dec) => {
    const h = snap.toHorizontal(ra, dec);
    return dirVec(h.alt, h.az);
  };

  /* ----------------------------- Ma'lumotlar ----------------------------- */
  const rand = rng(hashStr(`${date.toISOString()}|${lat}|${lng}`));
  const starVecs = stars.map(([ra, dec, mag, bv]) => ({ v: toVec(ra, dec), mag, bv }));

  // Katalog yulduzlari (≈5000, 6.5 kattalikkacha)
  const starBuf = new Float32Array(starVecs.length * 8);
  starVecs.forEach((s, i) => {
    const c = bvColor(s.bv ?? 0.6);
    starBuf.set([s.v[0], s.v[1], s.v[2], c[0], c[1], c[2], s.mag, rand()], i * 8);
  });

  // Mayda "chang" yulduzlar — Somon yo'li bo'ylab zichroq (ko'z ilg'amaydigan fon)
  const FAINT = 12000;
  const faintBuf = new Float32Array(FAINT * 8);
  for (let i = 0; i < FAINT; i++) {
    let l;
    let b;
    if (rand() < 0.58) {
      // Galaktika tekisligi yaqinida, markaz tomonga zichroq
      l = rand() < 0.45 ? (rand() - 0.5) * 120 : rand() * 360;
      const g = (rand() + rand() + rand() - 1.5) * 9;
      b = g;
    } else {
      l = rand() * 360;
      b = Math.asin(rand() * 2 - 1) * DEG;
    }
    const eq = galacticToEq(((l % 360) + 360) % 360, b);
    const v = toVec(eq.ra, eq.dec);
    const c = bvColor(rand() * 1.5 - 0.1);
    faintBuf.set([v[0], v[1], v[2], c[0], c[1], c[2], 5.9 + rand() * 1.1, rand()], i * 8);
  }

  // Somon yo'li katakchalari
  const mwBuf = new Float32Array(mw.length * 8);
  mw.forEach(([ra, dec, k], i) => {
    const v = toVec(ra, dec);
    const t = clamp(k, 0, 1);
    const col = [lerp(0.62, 1.0, t), lerp(0.7, 0.9, t), lerp(1.0, 0.78, t)];
    mwBuf.set([v[0], v[1], v[2], col[0], col[1], col[2], k, 0], i * 8);
  });

  // Haqiqiy yulduz turkumlari chiziqlari (tomosha rejimida)
  const conLines = lines.map((line) => line.map(([ra, dec]) => toVec(ra, dec)));

  const moonVec = dirVec(snap.moon.alt, snap.moon.az);
  const sunVec = dirVec(snap.sun.alt, snap.sun.az);
  const planets = snap.planets
    .filter((p) => p.alt > -2)
    .map((p) => ({ ...p, v: dirVec(p.alt, p.az), sprite: starSprite(p.color.map((c) => Math.round(c * 255)), false) }));

  /* ----------------------- Boshlang'ich yo'nalish ----------------------- */
  // Eng chiroyli tomon: ufqdan 10–60° balandlikda yorqin yulduzlar va Somon yo'li ko'p bo'lgan
  // yo'nalish. Oy ismlar ustiga tushmasligi kerak.
  const brightList = starVecs.filter((s) => s.mag < 3.5);
  let az0 = 180;
  let bestScore = -Infinity;
  for (let az = 0; az < 360; az += 5) {
    const f = dirVec(30, az);
    let score = 0;
    for (const s of brightList) {
      const alt = Math.asin(s.v[2]) * DEG;
      if (alt < 8 || alt > 62) continue;
      const d = dot(s.v, f);
      if (d > 0.8) score += Math.pow(10, -0.4 * (s.mag - 1)) * (d - 0.8) * 5;
    }
    for (let i = 0; i < mw.length; i += 3) {
      const v = [mwBuf[i * 8], mwBuf[i * 8 + 1], mwBuf[i * 8 + 2]];
      if (v[2] < 0.1) continue;
      if (dot(v, f) > 0.82) score += mw[i][2] * 0.05;
    }
    if (snap.moon.alt > 0 && dot(moonVec, f) > 0.9) score -= 40;
    if (score > bestScore) {
      bestScore = score;
      az0 = az;
    }
  }

  /* ------------------------------- Kanvaslar ------------------------------ */
  const mk = (cls) => {
    const c = document.createElement('canvas');
    c.className = `sky__layer ${cls}`;
    c.setAttribute('aria-hidden', 'true');
    root.append(c);
    return c;
  };
  const bgCanvas = mk('sky__bg');
  const glCanvas = mk('sky__gl');
  const frontCanvas = mk('sky__front');
  const bg = bgCanvas.getContext('2d');
  const fx = frontCanvas.getContext('2d');
  const G = createGL(glCanvas);
  if (G) {
    G.setLayer('stars', starBuf);
    G.setLayer('faint', faintBuf);
    G.setLayer('mw', mwBuf);
  } else {
    glCanvas.remove();
  }

  const warmSprite = starSprite([255, 214, 150], true);
  const coolSprite = starSprite([200, 218, 255], true);
  const softSprite = starSprite([214, 226, 255], false);

  /* ------------------------------- Holat ------------------------------- */
  let W = 0;
  let H = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let glDpr = Math.min(dpr, 1.75);
  let portrait = true;
  const layout = { heroAlt: 30, heroS: 78, namesAlt: 42, namesDeg: 50, skyScale: 2 };
  const cur = { alt: 20, az: az0, S: 80 };
  const target = { ...cur };
  let night = 0; // 0 — shafaq, 1 — to'liq tun
  let nightTarget = 0;
  let labels = 0;
  let labelsTarget = 0;
  let conAlpha = 0;
  let conTarget = 0;
  let explore = false;
  let skyline = null;
  let names = null;
  let namesGhost = null;
  let namesStart = -1;
  let namesAlpha = 1;
  let namesAlphaTarget = 1;
  const namesDur = reduced ? 0.01 : 5.2;
  const wishes = [];
  const wishKeys = new Set();
  let wishFrame = null;
  let meteor = null;
  let nextMeteor = 9 + Math.random() * 8;
  let time = 0;

  const camOf = (c) => {
    const short = Math.min(W, H) || 1;
    const fov = 4 * Math.atan(Math.tan((c.S * RAD) / 4) * (H / short)) * DEG;
    return makeCamera({ alt: c.alt, az: c.az, fov: Math.min(fov, 170) }, W, H);
  };

  function computeLayout() {
    portrait = W < H;
    const S = portrait ? 76 : 66;
    const cam = camOf({ alt: 0, az: az0, S });
    // Ufq ekranning pastki qismida (portretda 79%, kengda 83%)
    const hf = portrait ? 0.79 : 0.83;
    const heroAlt = 2 * Math.atan((hf * H - H / 2) / (2 * cam.scale)) * DEG;
    const nf = portrait ? 0.35 : 0.37;
    const namesAlt = heroAlt + 2 * Math.atan((H / 2 - nf * H) / (2 * cam.scale)) * DEG;
    Object.assign(layout, { heroAlt, heroS: S, namesAlt, scale: cam.scale, skyScale: portrait ? 2.25 : 1.65, pxDeg: cam.scale * RAD });
  }

  function resize() {
    const r = root.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (!w || !h) return;
    const changedW = w !== W;
    W = w;
    H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    frontCanvas.width = Math.round(W * dpr);
    frontCanvas.height = Math.round(H * dpr);
    bgCanvas.width = Math.max(1, Math.round(W / 2));
    bgCanvas.height = Math.max(1, Math.round(H / 2));
    setGlDpr(glDpr);
    // Mobil brauzerlarda manzil paneli yashiringanda faqat balandlik o'zgaradi — manzara qayta chizilmaydi
    if (changedW || !skyline) {
      computeLayout();
      const px = Math.min(18, layout.pxDeg * dpr * 1.15);
      skyline = buildSkyline({ px, seed: 11, scale: layout.skyScale });
      if (names) {
        const row = !portrait && W / H > 1.15;
        if (row !== names.row) prepareNames(o.groom, o.bride);
        else placeNames();
      }
    }
  }

  function setGlDpr(v) {
    glDpr = v;
    if (!G) return;
    glCanvas.width = Math.round(W * glDpr);
    glCanvas.height = Math.round(H * glDpr);
  }

  /* ---------------------------- Ismlar turkumi ---------------------------- */
  function placeNames() {
    names.frame = localFrame(dirVec(layout.namesAlt, az0));
    // Kenglik ham, balandlik ham sig'sin: ismlar minoralar va yozuvlar ustiga chiqmasin
    const maxW = names.row ? 0.74 * W : portrait ? 0.92 * W : 0.6 * W;
    const maxH = names.row ? 0.3 * H : portrait ? 0.46 * H : 0.4 * H;
    const widthPx = Math.min(maxW, (maxH * names.width) / Math.max(names.height, 1));
    const namesDeg = 4 * Math.atan(widthPx / (4 * layout.scale)) * DEG;
    names.k = namesDeg / Math.max(names.width, 1);
  }

  async function prepareNames(groom, bride) {
    try {
      await Promise.race([document.fonts.load('120px "Great Vibes"'), new Promise((r) => setTimeout(r, 2500))]);
    } catch {
      /* shrift yuklanmasa ham davom etamiz */
    }
    const row = !portrait && W / H > 1.15;
    const nc = buildNameConstellation(groom, bride, 'Great Vibes', row);
    nc.row = row;
    if (!nc) return;
    names = nc;
    // Ismlarning xira "arvoh" yozuvi — bir marta, porlash bilan chiziladi
    const pad = 60;
    const g = document.createElement('canvas');
    g.width = Math.ceil(nc.width + pad * 2 + 200);
    g.height = Math.ceil(nc.height + pad * 2 + 200);
    const x = g.getContext('2d');
    x.translate(g.width / 2, g.height / 2);
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.shadowColor = 'rgba(170, 190, 255, 0.9)';
    x.shadowBlur = 24;
    x.fillStyle = 'rgba(236, 232, 255, 1)';
    for (const l of nc.lines) {
      x.font = `${l.size}px "${nc.font}"`;
      x.fillText(l.text, l.x, l.y);
    }
    namesGhost = { canvas: g, ox: g.width / 2, oy: g.height / 2 };
    placeNames();
  }

  function drawNames(cam) {
    if (!names || namesStart < 0 || namesAlpha < 0.01) return;
    const T = frameTransform(cam, names.frame);
    if (!T) return;
    const P = clamp((time - namesStart) / namesDur, 0, 1);
    const k = names.k;
    const [a, b, c, d, e, f] = T;
    const sx = (x, y) => a * x * k + c * y * k + e;
    const sy = (x, y) => b * x * k + d * y * k + f;
    // Ekrandan butunlay chiqib ketgan bo'lsa chizmaymiz
    const R = Math.hypot(a, b) * k * names.width;
    if (e < -R || e > W + R || f < -R || f > H + R) return;

    fx.save();
    // 1) Arvoh yozuv
    const ghostA = smooth(clamp((P - 0.45) / 0.55, 0, 1)) * 0.2 * namesAlpha;
    if (ghostA > 0.002 && namesGhost) {
      fx.globalAlpha = ghostA;
      fx.setTransform(a * k * dpr, b * k * dpr, c * k * dpr, d * k * dpr, e * dpr, f * dpr);
      fx.drawImage(namesGhost.canvas, -namesGhost.ox, -namesGhost.oy);
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // 2) Chiziqlar
    fx.globalAlpha = namesAlpha;
    fx.lineCap = 'round';
    const pts = names.stars.map((s) => [sx(s.x, s.y), sy(s.x, s.y)]);
    for (const pass of [0, 1]) {
      fx.strokeStyle = pass ? 'rgba(206, 220, 255, 0.55)' : 'rgba(150, 175, 255, 0.10)';
      fx.lineWidth = pass ? 0.9 : 3.2;
      fx.beginPath();
      for (const ed of names.edges) {
        if (P <= ed.t0) continue;
        const q = clamp((P - ed.t0) / Math.max(1e-3, ed.t1 - ed.t0), 0, 1);
        const [x0, y0] = pts[ed.a];
        const [x1, y1] = pts[ed.b];
        fx.moveTo(x0, y0);
        fx.lineTo(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q);
      }
      fx.stroke();
    }
    // 3) Yulduzlar
    fx.globalCompositeOperation = 'lighter';
    names.stars.forEach((s, i) => {
      if (P < s.t) return;
      const age = (P - s.t) * namesDur;
      const flash = reduced ? 0 : Math.exp(-age * 5) * 1.8;
      const tw = reduced ? 1 : 0.85 + 0.15 * Math.sin(time * 1.7 + s.ph * 6);
      const size = (7 + s.s * 9) * (1 + flash) * tw;
      fx.globalAlpha = (reduced ? 1 : clamp(age * 4, 0, 1)) * namesAlpha;
      fx.drawImage(s.s > 1.4 ? coolSprite : softSprite, pts[i][0] - size / 2, pts[i][1] - size / 2, size, size);
    });
    fx.restore();
  }

  /* ---------------------------------- Oy ---------------------------------- */
  function drawMoon(cam, pxd) {
    if (snap.moon.alt < -1.5) return;
    const p = project(cam, moonVec);
    if (!p || p[2] < 0) return;
    const R = clamp(pxd * 1.6, 10, 26);
    if (p[0] < -R * 8 || p[0] > W + R * 8 || p[1] < -R * 8 || p[1] > H + R * 8) return;
    const k = snap.moon.illumination;
    // Yoritilgan tomon — Quyosh yo'nalishi
    const t = normalize(sunVec.map((v, i) => v - moonVec[i] * dot(moonVec, sunVec)));
    const q = project(cam, normalize(moonVec.map((v, i) => v + t[i] * 0.02)));
    const ang = q ? Math.atan2(q[1] - p[1], q[0] - p[0]) : 0;
    const vis = smooth(clamp((snap.moon.alt + 1.5) / 3, 0, 1));

    fx.save();
    fx.globalAlpha = vis;
    fx.translate(p[0], p[1]);
    // Porlash
    const glow = fx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 7);
    glow.addColorStop(0, `rgba(255, 244, 222, ${0.1 + 0.2 * k})`);
    glow.addColorStop(0.35, `rgba(200, 210, 255, ${0.03 + 0.07 * k})`);
    glow.addColorStop(1, 'rgba(200, 210, 255, 0)');
    fx.fillStyle = glow;
    fx.beginPath();
    fx.arc(0, 0, R * 7, 0, Math.PI * 2);
    fx.fill();
    fx.rotate(ang);
    // Qorong'i qism (Yer nuri)
    fx.fillStyle = 'rgba(58, 66, 96, 0.55)';
    fx.beginPath();
    fx.arc(0, 0, R, 0, Math.PI * 2);
    fx.fill();
    // Yoritilgan qism: yarim doira + terminator ellipsi
    const rx = R * Math.abs(1 - 2 * k);
    const lit = new Path2D();
    lit.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);
    if (1 - 2 * k > 0) lit.ellipse(0, 0, Math.max(rx, 0.01), R, 0, Math.PI / 2, -Math.PI / 2, true);
    else lit.ellipse(0, 0, Math.max(rx, 0.01), R, 0, Math.PI / 2, (Math.PI * 3) / 2, false);
    lit.closePath();
    const lg = fx.createRadialGradient(-R * 0.2, -R * 0.2, 0, 0, 0, R);
    lg.addColorStop(0, '#fffaf0');
    lg.addColorStop(1, '#e6dcc6');
    fx.fillStyle = lg;
    fx.fill(lit);
    // Oy dengizlari (xira dog'lar)
    fx.save();
    fx.clip(lit);
    fx.rotate(-ang);
    fx.fillStyle = 'rgba(120, 118, 130, 0.22)';
    for (const [mx, my, mr] of [[-0.25, -0.3, 0.28], [0.18, -0.12, 0.22], [0.05, 0.3, 0.2], [-0.38, 0.12, 0.16], [0.35, 0.28, 0.12]]) {
      fx.beginPath();
      fx.arc(mx * R, my * R, mr * R, 0, Math.PI * 2);
      fx.fill();
    }
    fx.restore();
    fx.restore();

    if (labels > 0.01) {
      label(p[0], p[1], R + 8, 'Oy', `${Math.round(k * 100)}%`);
    }
  }

  function label(x, y, off, title, sub) {
    fx.save();
    fx.globalAlpha = labels;
    fx.strokeStyle = 'rgba(214, 196, 150, 0.45)';
    fx.lineWidth = 1;
    fx.beginPath();
    fx.moveTo(x + off * 0.7, y - off * 0.7);
    fx.lineTo(x + off * 0.7 + 14, y - off * 0.7 - 14);
    fx.lineTo(x + off * 0.7 + 30, y - off * 0.7 - 14);
    fx.stroke();
    fx.font = '600 10px Cinzel, serif';
    fx.fillStyle = 'rgba(240, 226, 190, 0.95)';
    fx.textBaseline = 'middle';
    const tx = x + off * 0.7 + 34;
    const ty = y - off * 0.7 - 14;
    fx.fillText(title.toUpperCase(), tx, ty);
    if (sub) {
      fx.font = 'italic 12px "Cormorant Garamond", serif';
      fx.fillStyle = 'rgba(220, 224, 240, 0.75)';
      fx.fillText(sub, tx, ty + 13);
    }
    fx.restore();
  }

  /* ------------------------------- Sayyoralar ------------------------------ */
  function drawPlanets(cam) {
    for (const pl of planets) {
      const p = project(cam, pl.v);
      if (!p || p[0] < -40 || p[0] > W + 40 || p[1] < -40 || p[1] > H + 40) continue;
      const vis = smooth(clamp((pl.alt + 1) / 4, 0, 1)) * night;
      if (vis < 0.01) continue;
      const col = pl.color.map((c) => Math.round(c * 255));
      const size = clamp(15 - pl.mag * 3.4, 12, 30);
      fx.save();
      fx.globalAlpha = vis;
      fx.globalCompositeOperation = 'lighter';
      fx.drawImage(pl.sprite, p[0] - size / 2, p[1] - size / 2, size, size);
      fx.fillStyle = rgb(col, 1);
      fx.beginPath();
      fx.arc(p[0], p[1], 1.6, 0, Math.PI * 2);
      fx.fill();
      fx.restore();
      if (labels > 0.01) label(p[0], p[1], 6, pl.name, '');
    }
  }

  /* ------------------------------ Tilaklar ------------------------------ */
  function wishAnchor() {
    return { alt: 50, az: az0 + 140 };
  }
  function placeWish(w) {
    if (!wishFrame) {
      const a = wishAnchor();
      wishFrame = localFrame(dirVec(a.alt, a.az));
    }
    const r = rng(hashStr(w.key));
    let best = null;
    for (let tries = 0; tries < 24; tries++) {
      const du = (r() - 0.5) * 34;
      const dv = (r() - 0.5) * 20;
      const v = frameToVec(wishFrame, du, dv);
      const minD = wishes.reduce((m, o) => Math.min(m, Math.acos(clamp(dot(o.v, v), -1, 1)) * DEG), 99);
      if (!best || minD > best.minD) best = { v, minD };
      if (minD > 3.4) break;
    }
    w.v = best.v;
    w.ph = r() * Math.PI * 2;
  }

  function drawWishes(cam) {
    if (!wishes.length) return;
    fx.save();
    fx.globalCompositeOperation = 'lighter';
    for (const w of wishes) {
      const p = project(cam, w.v);
      w.sx = null;
      if (!p || p[0] < -20 || p[0] > W + 20 || p[1] < -20 || p[1] > H + 20) continue;
      if (w.v[2] < 0) continue;
      const born = w.born != null ? time - w.born : 99;
      if (born < 0) continue;
      const flash = reduced ? 0 : Math.exp(-born * 2.2) * 3;
      const pulse = reduced ? 1 : 0.82 + 0.18 * Math.sin(time * 1.3 + w.ph);
      const size = (w.self ? 26 : 19) * pulse * (1 + flash);
      fx.globalAlpha = clamp(born * 2, 0, 1) * night;
      fx.drawImage(warmSprite, p[0] - size / 2, p[1] - size / 2, size, size);
      w.sx = p[0];
      w.sy = p[1];
    }
    fx.restore();
  }

  /* ---------------------------- Yulduz turkumlari ---------------------------- */
  function drawConstellations(cam) {
    if (conAlpha < 0.01) return;
    fx.save();
    fx.globalAlpha = conAlpha;
    fx.strokeStyle = 'rgba(150, 180, 255, 0.34)';
    fx.lineWidth = 0.8;
    fx.beginPath();
    for (const line of conLines) {
      let prev = null;
      for (const v of line) {
        const p = v[2] > -0.02 ? project(cam, v) : null;
        if (p && prev && Math.abs(p[0] - prev[0]) < W && Math.abs(p[1] - prev[1]) < H) {
          fx.moveTo(prev[0], prev[1]);
          fx.lineTo(p[0], p[1]);
        }
        prev = p;
      }
    }
    fx.stroke();
    fx.restore();
  }

  /* ----------------------------- Uchar yulduz ----------------------------- */
  function drawMeteor(dt) {
    if (reduced || explore) return;
    nextMeteor -= dt;
    if (!meteor && nextMeteor <= 0 && night > 0.9) {
      const th = (18 + Math.random() * 30) * RAD;
      const sg = Math.random() < 0.5 ? -1 : 1;
      meteor = { x: W * (0.2 + Math.random() * 0.6), y: H * (0.06 + Math.random() * 0.28), dx: Math.cos(th) * sg, dy: Math.sin(th), t: 0, len: 90 + Math.random() * 80, dur: 0.9 };
      nextMeteor = 14 + Math.random() * 16;
    }
    if (!meteor) return;
    meteor.t += dt;
    const q = meteor.t / meteor.dur;
    if (q >= 1) {
      meteor = null;
      return;
    }
    const dist = q * 260;
    const hx = meteor.x + meteor.dx * dist;
    const hy = meteor.y + meteor.dy * dist;
    const tl = meteor.len * Math.min(1, q * 3);
    const g = fx.createLinearGradient(hx, hy, hx - meteor.dx * tl, hy - meteor.dy * tl);
    const a = Math.sin(q * Math.PI);
    g.addColorStop(0, `rgba(255, 255, 255, ${0.9 * a})`);
    g.addColorStop(1, 'rgba(180, 200, 255, 0)');
    fx.save();
    fx.strokeStyle = g;
    fx.lineWidth = 1.4;
    fx.lineCap = 'round';
    fx.beginPath();
    fx.moveTo(hx, hy);
    fx.lineTo(hx - meteor.dx * tl, hy - meteor.dy * tl);
    fx.stroke();
    fx.restore();
  }

  /* ------------------------------ Ufq va yer ------------------------------ */
  // Stereografik proyeksiyada ufq — aylana (yoki to'g'ri chiziq). Yer — Nadir tushgan tomoni.
  function rawProject(cam, v) {
    const z = Math.max(-0.999, dot(v, cam.f));
    const k = 2 / (1 + z);
    return [cam.cx + dot(v, cam.r) * k * cam.scale, cam.cy - dot(v, cam.u) * k * cam.scale];
  }
  function fillGround(cam) {
    const pts = [0, 50, -50].map((d) => rawProject(cam, dirVec(-0.25, cam.az + d)));
    const nadir = rawProject(cam, [0, 0, -1]);
    const [[x1, y1], [x2, y2], [x3, y3]] = pts;
    const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    fx.fillStyle = '#020309';
    fx.beginPath();
    if (Math.abs(D) < 1e-6) {
      // Deyarli to'g'ri chiziq (kamera ufqqa tik qaragan) — ekran pastini to'ldiramiz
      const y = (y1 + y2 + y3) / 3;
      fx.rect(-10, y, W + 20, H - y + 10);
      fx.fill();
      return;
    }
    const s1 = x1 * x1 + y1 * y1;
    const s2 = x2 * x2 + y2 * y2;
    const s3 = x3 * x3 + y3 * y3;
    const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / D;
    const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / D;
    const R = Math.hypot(x1 - cx, y1 - cy);
    if (R > 1e6) {
      fx.rect(-10, y1, W + 20, H - y1 + 10);
      fx.fill();
      return;
    }
    const inside = Math.hypot(nadir[0] - cx, nadir[1] - cy) < R;
    if (inside) {
      fx.arc(cx, cy, R, 0, Math.PI * 2);
      fx.fill();
    } else {
      fx.rect(-10, -10, W + 20, H + 20);
      fx.arc(cx, cy, R, 0, Math.PI * 2);
      fx.fill('evenodd');
    }
  }

  function drawHorizon(cam) {
    if (!skyline) return;
    const sk = skyline;
    const px = sk.px;
    const step = 2;
    // Qaysi bo'laklar ko'rinadi
    const strips = [];
    for (let d = 0; d < 360; d += step) {
      const az = az0 - 180 + d;
      const A = project(cam, dirVec(0, az));
      if (!A) continue;
      if (A[0] < -W * 0.6 || A[0] > W * 1.6) continue;
      const topAlt = sk.above;
      const Tp = project(cam, dirVec(topAlt, az));
      if (Tp && Math.min(A[1], Tp[1]) > H + 4 && A[1] > H + 4) continue;
      if (A[1] < -H) continue;
      strips.push({ d, az, A });
    }
    fx.save();
    fillGround(cam);
    if (!strips.length) {
      fx.restore();
      return;
    }

    // Panorama bo'laklari
    fx.imageSmoothingEnabled = true;
    for (const s of strips) {
      const A = s.A;
      const B = project(cam, dirVec(0, s.az + step));
      const C = project(cam, dirVec(step, s.az));
      if (!B || !C) continue;
      const a = ((B[0] - A[0]) / (step * px)) * dpr;
      const b = ((B[1] - A[1]) / (step * px)) * dpr;
      const c = ((A[0] - C[0]) / (step * px)) * dpr;
      const d = ((A[1] - C[1]) / (step * px)) * dpr;
      const sxp = s.d * px;
      const e = A[0] * dpr - a * sxp - c * sk.baseY;
      const f = A[1] * dpr - b * sxp - d * sk.baseY;
      fx.setTransform(a, b, c, d, e, f);
      const wpx = Math.min(step * px + 1.5, sk.W - sxp);
      fx.drawImage(sk.canvas, sxp, 0, wpx, sk.H, sxp, 0, wpx, sk.H);
    }
    fx.restore();
  }

  /* ------------------------------- Fon ------------------------------- */
  function drawBackground(cam) {
    const w = bgCanvas.width;
    const h = bgCanvas.height;
    const sc = h / H;
    // Markaziy vertikal chiziq bo'ylab balandlik → ekran y
    const yOf = (alt) => {
      const dA = clamp(alt - cam.alt, -170, 170);
      return (cam.cy - 2 * cam.scale * Math.tan((dA * RAD) / 2)) * sc;
    };
    const n = smooth(night);
    const col = (k) => mix3(SKY.dusk[k], SKY.night[k], n);
    const yH = yOf(0);
    const yL = yOf(7);
    const yM = yOf(24);
    const yZ = yOf(75);
    const top = Math.min(yZ, yM - 1, 0);
    const bottom = Math.max(yH, h);
    const g = bg.createLinearGradient(0, top, 0, bottom);
    const span = bottom - top || 1;
    const stop = (y, c) => g.addColorStop(clamp((y - top) / span, 0, 1), rgb(c));
    stop(yZ, col('zenith'));
    stop(yM, col('mid'));
    stop(yL, col('low'));
    stop(yH, col('horizon'));
    bg.fillStyle = g;
    bg.fillRect(0, 0, w, h);
    // Oy nuri osmonni biroz yoritadi
    if (snap.moon.alt > 0) {
      const p = project(cam, moonVec);
      if (p) {
        const k = snap.moon.illumination * smooth(clamp(snap.moon.alt / 10, 0, 1));
        const r = Math.max(w, h) * 0.7;
        const mg = bg.createRadialGradient(p[0] * sc, p[1] * sc, 0, p[0] * sc, p[1] * sc, r);
        mg.addColorStop(0, `rgba(70, 86, 140, ${0.22 * k})`);
        mg.addColorStop(1, 'rgba(70, 86, 140, 0)');
        bg.fillStyle = mg;
        bg.fillRect(0, 0, w, h);
      }
    }
  }

  /* ------------------------------ Kadr ------------------------------ */
  let last = performance.now();
  let raf = 0;
  const perf = { acc: 0, n: 0, lowered: 0 };
  const vel = { az: 0, alt: 0 };
  let dragging = false;

  function step(now) {
    raf = requestAnimationFrame(step);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;

    // Kamera inersiyasi
    if (explore) {
      if (!dragging) {
        target.az += vel.az * dt;
        target.alt = clamp(target.alt + vel.alt * dt, -4, 89);
        const damp = Math.exp(-dt * 3.2);
        vel.az *= damp;
        vel.alt *= damp;
      }
    }
    const kc = reduced ? 1 - Math.exp(-dt * 6) : 1 - Math.exp(-dt * (explore ? 9 : 2.4));
    cur.alt += (target.alt - cur.alt) * kc;
    cur.az += wrap180(target.az - cur.az) * kc;
    cur.S += (target.S - cur.S) * kc;
    const kn = 1 - Math.exp(-dt * (reduced ? 8 : 0.75));
    night += (nightTarget - night) * kn;
    labels += (labelsTarget - labels) * (1 - Math.exp(-dt * 4));
    namesAlpha += (namesAlphaTarget - namesAlpha) * (1 - Math.exp(-dt * 2.5));
    conAlpha += (conTarget - conAlpha) * (1 - Math.exp(-dt * 4));

    const cam = camOf(cur);
    const pxd = cam.scale * RAD;
    drawBackground(cam);

    const n = smooth(night);
    if (G) {
      G.render({
        cam,
        dpr: glDpr,
        time,
        twinkle: reduced ? 0 : 1,
        limit: lerp(1.2, 6.6, n),
        mw: n * n * 0.085,
        cellDeg: 1.1,
        bright: lerp(0.8, 1, n),
      });
    }

    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.clearRect(0, 0, W, H);
    if (!G) drawFallbackStars(cam, n);
    drawConstellations(cam);
    drawPlanets(cam);
    drawMoon(cam, pxd);
    drawNames(cam);
    drawWishes(cam);
    drawMeteor(dt);
    drawHorizon(cam);
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Sekin qurilmalarda WebGL o'lchami kichraytiriladi
    perf.acc += dt;
    perf.n++;
    if (perf.n >= 90) {
      const avg = perf.acc / perf.n;
      if (avg > 0.024 && glDpr > 1 && perf.lowered < 3) {
        setGlDpr(Math.max(1, glDpr - 0.35));
        perf.lowered++;
      }
      perf.acc = 0;
      perf.n = 0;
    }
  }

  function drawFallbackStars(cam, n) {
    const limit = lerp(1.2, 5.2, n);
    fx.save();
    for (const s of starVecs) {
      if (s.mag > limit || s.v[2] < 0) continue;
      const p = project(cam, s.v);
      if (!p || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue;
      const r = clamp(2.4 - s.mag * 0.35, 0.5, 2.6);
      fx.globalAlpha = clamp(1.1 - s.mag * 0.16, 0.25, 1);
      fx.fillStyle = '#e8eeff';
      fx.fillRect(p[0] - r / 2, p[1] - r / 2, r, r);
    }
    fx.restore();
  }

  /* ---------------------------- Tomosha rejimi ---------------------------- */
  const pointers = new Map();
  let pinch = null;
  let tapStart = null;
  let onPick = null;

  function pick(x, y) {
    let best = null;
    let bestD = 26;
    for (const w of wishes) {
      if (w.sx == null) continue;
      const d = Math.hypot(w.sx - x, w.sy - y);
      if (d < bestD) {
        bestD = d;
        best = { type: 'wish', wish: w, x: w.sx, y: w.sy };
      }
    }
    return best;
  }

  frontCanvas.addEventListener('pointerdown', (e) => {
    tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (!explore) return;
    frontCanvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragging = true;
    vel.az = 0;
    vel.alt = 0;
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), S: target.S };
    }
  });
  frontCanvas.addEventListener('pointermove', (e) => {
    if (!explore || !pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const cur2 = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur2);
    if (pointers.size >= 2 && pinch) {
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      target.S = clamp((pinch.S * pinch.d) / Math.max(d, 10), 28, 115);
      return;
    }
    const cam = camOf(target);
    const pxd = cam.scale * RAD;
    const dAz = -(cur2.x - prev.x) / pxd / Math.max(0.25, Math.cos(target.alt * RAD));
    const dAlt = (cur2.y - prev.y) / pxd;
    target.az += dAz;
    target.alt = clamp(target.alt + dAlt, -4, 89);
    cur.az = target.az;
    cur.alt = target.alt;
    const dtm = Math.max(0.008, (e.timeStamp - (prev.ts || e.timeStamp - 16)) / 1000);
    vel.az = lerp(vel.az, dAz / dtm, 0.35);
    vel.alt = lerp(vel.alt, dAlt / dtm, 0.35);
    cur2.ts = e.timeStamp;
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) dragging = false;
    if (tapStart && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 8 && performance.now() - tapStart.t < 500) {
      const r = frontCanvas.getBoundingClientRect();
      const hit = pick(e.clientX - r.left, e.clientY - r.top);
      onPick?.(hit);
      vel.az = 0;
      vel.alt = 0;
    }
    tapStart = null;
  };
  frontCanvas.addEventListener('pointerup', up);
  frontCanvas.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    dragging = pointers.size > 0;
    pinch = null;
    tapStart = null;
  });
  frontCanvas.addEventListener(
    'wheel',
    (e) => {
      if (!explore) return;
      e.preventDefault();
      target.S = clamp(target.S * Math.exp(e.deltaY * 0.0012), 28, 115);
    },
    { passive: false },
  );

  /* ---------------------------------- API ---------------------------------- */
  const ro = new ResizeObserver(() => resize());
  ro.observe(root);
  resize();
  await prepareNames(o.groom, o.bride);
  // Birinchi kadr — qahramon ko'rinishida
  Object.assign(cur, views().hero);
  Object.assign(target, cur);
  raf = requestAnimationFrame(step);

  /** Kamera: `focus` nuqtasi ekran balandligining `frac` qismida (yuqoridan) turadi. */
  function frame(focus, frac, S) {
    const cam = camOf({ alt: 0, az: focus.az, S });
    const off = 2 * Math.atan(((0.5 - frac) * H) / (2 * cam.scale)) * DEG;
    return { alt: clamp(focus.alt - off, -30, 84), az: focus.az, S };
  }

  function views() {
    const P = portrait;
    const hero = { alt: layout.heroAlt, az: az0, S: layout.heroS };
    // Oy (ko'rinsa) yoki eng yorqin sayyora — "Shu kechaning osmoni" bo'limi
    let focus = null;
    if (snap.moon.alt > 3) focus = { alt: snap.moon.alt, az: snap.moon.az };
    else {
      const pl = planets.filter((p) => p.alt > 6).sort((a, b) => a.mag - b.mag)[0];
      if (pl) focus = { alt: pl.alt, az: pl.az };
    }
    if (!focus) focus = { alt: 45, az: az0 + 100 };
    const wa = wishAnchor();
    return {
      hero,
      invite: { alt: layout.heroAlt + 22, az: az0 + 12, S: P ? 70 : 64 },
      sky: frame(focus, P ? 0.2 : 0.3, P ? 58 : 56),
      countdown: { alt: 72, az: az0 - 60, S: P ? 66 : 70 },
      program: { alt: 56, az: az0 - 115, S: P ? 64 : 66 },
      venue: { alt: 26, az: az0 - 170, S: P ? 64 : 62 },
      wishes: frame(wa, P ? 0.22 : 0.3, P ? 66 : 64),
      final: hero,
    };
  }

  const moonDir = { alt: snap.moon.alt, az: snap.moon.az };
  let visibleStars = 0;
  for (const s of starVecs) if (s.mag <= 6 && s.v[2] > 0) visibleStars++;

  return {
    snap,
    az0,
    stats: {
      visibleStars,
      moon: { ...moonDir, illumination: snap.moon.illumination, phase: snap.moon.phase, waxing: snap.moon.waxing },
      planets: planets.filter((p) => p.alt > 3).sort((a, b) => a.mag - b.mag).map((p) => ({ id: p.id, name: p.name, alt: p.alt, az: p.az })),
    },
    views,
    setView(v, immediate = false) {
      if (explore) return;
      target.alt = v.alt;
      target.az = cur.az + wrap180(v.az - cur.az);
      target.S = v.S;
      if (immediate) Object.assign(cur, target);
    },
    /** Ikki ko'rinish orasida (t = 0..1) — aylanish qisqa yo'l bilan. */
    blend(a, b, t) {
      return { alt: lerp(a.alt, b.alt, t), az: a.az + wrap180(b.az - a.az) * t, S: lerp(a.S, b.S, t) };
    },
    setNight(v, immediate = false) {
      nightTarget = v;
      if (immediate) night = v;
    },
    startNames() {
      if (namesStart < 0) namesStart = time;
    },
    setNamesAlpha(v) {
      namesAlphaTarget = v;
    },
    showLabels(on) {
      labelsTarget = on ? 1 : 0;
    },
    showConstellations(on) {
      conTarget = on ? 1 : 0;
    },
    setExplore(on) {
      explore = on;
      frontCanvas.classList.toggle('is-explore', on);
      if (on) {
        target.S = Math.max(target.S, 80);
      }
      vel.az = 0;
      vel.alt = 0;
    },
    onPick(fn) {
      onPick = fn;
    },
    setWishes(list) {
      for (const w of list) {
        const key = w.key || `${w.name}|${w.at || ''}|${(w.message || '').slice(0, 24)}`;
        if (wishKeys.has(key)) continue;
        wishKeys.add(key);
        const item = { ...w, key, born: w.animate ? time + (w.delay || 0) : null };
        placeWish(item);
        wishes.push(item);
      }
    },
    /** Tilak yulduzining ekrandagi joyi (fonar shu yerga uchadi). */
    wishPoint(key) {
      const w = wishes.find((x) => x.key === key);
      if (!w) return null;
      const p = project(camOf(cur), w.v);
      return p ? { x: p[0], y: p[1] } : null;
    },
    ignite(key) {
      const w = wishes.find((x) => x.key === key);
      if (w) w.born = time;
    },
    wishCount: () => wishes.length,
    screenOf(alt, az) {
      const p = project(camOf(cur), dirVec(alt, az));
      return p ? { x: p[0], y: p[1] } : null;
    },
    unproject(x, y) {
      const v = unproject(camOf(cur), x, y);
      return { alt: Math.asin(v[2]) * DEG, az: Math.atan2(v[0], v[1]) * DEG };
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.innerHTML = '';
    },
  };
}
