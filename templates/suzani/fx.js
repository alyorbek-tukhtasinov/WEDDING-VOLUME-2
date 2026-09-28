// Effektlar: anor donalari, tilla payetkalar, gulbarglar va emoji yomg'iri (bitta canvas'da),
// hamda popuklarning aylantirishga qarab tebranishi.

let canvas = null;
let ctx = null;
let parts = [];
let raf = 0;
let last = 0;
let dpr = 1;
let reduced = false;

export function setReducedFx(v) {
  reduced = v;
}

function ensure() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  ctx = canvas.getContext('2d');
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  };
  size();
  window.addEventListener('resize', size);
}

const rnd = (a, b) => a + Math.random() * (b - a);
const SEQUIN = ['#d19a2e', '#f1c65a', '#e8b64a', '#fff1c4'];
const PETAL = ['#d4566b', '#a3192e', '#f08a9b', '#fbd3da'];

/** Anor donalari: (x, y) nuqtadan otiladi. */
export function burstSeeds(x, y, n = 22) {
  if (reduced) n = 8;
  ensure();
  for (let i = 0; i < n; i++) {
    const a = rnd(-Math.PI, 0) + rnd(-0.3, 0.3);
    const v = rnd(180, 520);
    parts.push({ kind: 'seed', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, r: rnd(3.5, 6), rot: rnd(0, 6.28), vr: rnd(-8, 8), life: rnd(1.6, 2.4), t: 0 });
  }
  play();
}

/** Bayram yomg'iri: payetkalar, gulbarglar va emoji. */
export function celebrate({ emojis = ['💍', '🕊️', '❤️', '🌷', '✨', '🎉'], count = 90, x = innerWidth / 2, y = innerHeight * 0.35, spread = 1 } = {}) {
  ensure();
  if (reduced) count = Math.round(count / 3);
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    const a = -Math.PI / 2 + rnd(-1.1, 1.1) * spread;
    const v = rnd(260, 720);
    const base = { x: x + rnd(-20, 20), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rnd(0, 6.28), vr: rnd(-6, 6), life: rnd(2.4, 3.6), t: 0 };
    if (r < 0.45) parts.push({ ...base, kind: 'sequin', r: rnd(3, 5.5), color: SEQUIN[i % SEQUIN.length], flip: rnd(0, 6.28) });
    else if (r < 0.75) parts.push({ ...base, kind: 'petal', r: rnd(5, 9), color: PETAL[i % PETAL.length], flip: rnd(0, 6.28) });
    else parts.push({ ...base, kind: 'emoji', ch: emojis[i % emojis.length], size: rnd(20, 32) });
  }
  play();
}

/** Yuqoridan tushadigan yengil yomg'ir (sahifa ochilganda). */
export function drizzle(count = 40) {
  ensure();
  for (let i = 0; i < (reduced ? 10 : count); i++) {
    const r = Math.random();
    parts.push({
      kind: r < 0.5 ? 'sequin' : 'petal', x: rnd(0, innerWidth), y: rnd(-innerHeight * 0.6, -10), vx: rnd(-30, 30), vy: rnd(40, 120),
      r: r < 0.5 ? rnd(2.5, 4.5) : rnd(5, 8), color: r < 0.5 ? SEQUIN[i % 4] : PETAL[i % 4], rot: rnd(0, 6.28), vr: rnd(-3, 3), flip: rnd(0, 6.28), life: rnd(4, 7), t: 0, gentle: true,
    });
  }
  play();
}

function play() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

function frame(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.t < p.life && p.y < innerHeight + 60);
  for (const p of parts) {
    p.t += dt;
    const g = p.gentle ? 60 : p.kind === 'seed' ? 900 : 520;
    const drag = p.kind === 'sequin' || p.kind === 'petal' ? 2.2 : 0.6;
    p.vy += g * dt;
    p.vx -= p.vx * drag * dt;
    if (p.kind !== 'seed') p.vy -= p.vy * (p.gentle ? 0.4 : 1.6) * dt;
    if (p.gentle) p.vx += Math.sin(now / 600 + p.flip) * 12 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    const fade = Math.min(1, (p.life - p.t) / 0.6);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === 'seed') {
      // Anor donasi: yaltiroq qizil tomchi
      const gr = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.4, 0, 0, 0, p.r * 1.3);
      gr.addColorStop(0, '#ffd0d6');
      gr.addColorStop(0.35, '#e0304d');
      gr.addColorStop(1, '#7d0c1d');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 0.8, p.r * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'sequin') {
      const s = Math.abs(Math.cos(p.t * 6 + p.flip));
      ctx.scale(1, 0.25 + s * 0.75);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'petal') {
      const s = Math.abs(Math.cos(p.t * 3 + p.flip));
      ctx.scale(0.4 + s * 0.6, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r * 0.9, -p.r * 0.4, p.r * 0.6, p.r * 0.8, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.6, p.r * 0.8, -p.r * 0.9, -p.r * 0.4, 0, -p.r);
      ctx.fill();
    } else {
      ctx.font = `${p.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.ch, 0, 0);
    }
    ctx.restore();
  }
  if (parts.length) raf = requestAnimationFrame(frame);
  else {
    raf = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* ------------------------------ Popuklar ------------------------------ */
// Aylantirish tezligiga qarab tebranadi (prujina fizikasi)
export function swingTassels() {
  const els = () => document.querySelectorAll('.tassels');
  let angle = 0;
  let vel = 0;
  let lastY = window.scrollY;
  let lastT = performance.now();
  let id = 0;
  const tick = (now) => {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    vel += -dy * 0.9 * (reduced ? 0.2 : 1);
    vel += -angle * 60 * dt;
    vel *= Math.exp(-3.2 * dt);
    angle += vel * dt;
    angle = Math.max(-28, Math.min(28, angle));
    const s = angle.toFixed(2);
    els().forEach((e) => e.style.setProperty('--swing', `${s}deg`));
    if (Math.abs(angle) > 0.05 || Math.abs(vel) > 0.05) id = requestAnimationFrame(tick);
    else id = 0;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!id) {
        lastT = performance.now();
        id = requestAnimationFrame(tick);
      }
    },
    { passive: true },
  );
}

/** Popuklar qatori (HTML). */
export function tasselsHtml(n = 9, colors = ['#a3192e', '#233f7a', '#d19a2e', '#2f6b4f']) {
  return `<div class="tassels" aria-hidden="true">${Array.from({ length: n }, (_, i) => {
    const c = colors[i % colors.length];
    return `<span class="tassel" style="--c:${c};--i:${i}"><i class="tassel__cord"></i><i class="tassel__bead"></i><i class="tassel__fringe"></i></span>`;
  }).join('')}</div>`;
}
