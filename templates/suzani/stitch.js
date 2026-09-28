// Tikish dvigateli: naqsh SVG sifatida chiziladi va "igna" uni ipma-ip tikib chiqadi.
// Har bir qism uchun: soya ipi + asosiy ip + yaltiroq ip (chok ko'rinishi), ochilish esa niqob
// (mask) orqali — pathLength=1 bilan uzunlikni hisoblamasdan boshqariladi.
import { PALETTE } from './motifs.js';

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  parent?.append(n);
  return n;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Chok turlari: [dasharray, qalinlik koeffitsienti]
const STITCH = {
  chain: (w) => `${f(w * 1.5)} ${f(w * 0.75)}`,
  run: (w) => `${f(w * 2.6)} ${f(w * 2)}`,
  dots: (w) => `0.01 ${f(w * 1.9)}`,
};
function f(n) {
  return Math.round(n * 100) / 100;
}

/** Umumiy ta'riflar (atlas naqshlari, soya) — sahifaga bir marta qo'shiladi. */
export function installDefs() {
  if (document.getElementById('suzani-defs')) return;
  const svg = el('svg', { id: 'suzani-defs', width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute' });
  const defs = el('defs', {}, svg);
  const fills = { red: PALETTE.red, rose: PALETTE.rose, indigo: PALETTE.indigo, gold: PALETTE.gold, green: PALETTE.green, white: PALETTE.white, cream: PALETTE.cream };
  for (const [name, color] of Object.entries(fills)) {
    // Atlas choki: rang ustida ingichka yaltiroq iplar
    const p = el('pattern', { id: `satin-${name}`, width: 3.2, height: 3.2, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(38)' }, defs);
    el('rect', { width: 3.2, height: 3.2, fill: color }, p);
    el('rect', { width: 1.1, height: 3.2, fill: 'rgba(255,255,255,0.16)' }, p);
    el('rect', { x: 2.2, width: 0.5, height: 3.2, fill: 'rgba(0,0,0,0.12)' }, p);
  }
  const lg = el('linearGradient', { id: 'spool-shine', x1: 0, x2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': 'rgba(0,0,0,.28)' }, lg);
  el('stop', { offset: 0.35, 'stop-color': 'rgba(255,255,255,.22)' }, lg);
  el('stop', { offset: 1, 'stop-color': 'rgba(0,0,0,.3)' }, lg);
  document.body.prepend(svg);
}

/**
 * Naqshni SVG ga aylantirish. Qaytaradi: { svg, setProgress(p), tip() } — p: 0..1.
 */
export function renderMotif(motif, { className = '', title = '' } = {}) {
  const id = `m${++uid}`;
  const [vx, vy, vw, vh] = motif.viewBox.split(/\s+/).map(Number);
  const svg = el('svg', { viewBox: motif.viewBox, class: `motif ${className}`, role: title ? 'img' : null, 'aria-hidden': title ? null : 'true' });
  if (title) el('title', {}, svg).textContent = title;
  const defs = el('defs', {}, svg);
  const parts = [];

  motif.parts.forEach((p, i) => {
    const g = el('g', { class: 'part' }, svg);
    const mid = `${id}-${i}`;
    const mask = el('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: vx - 10, y: vy - 10, width: vw + 20, height: vh + 20 }, defs);

    if (p.text != null) {
      // Matn (ismlar) — tilla ip bilan: atlas to'ldirish + kontur choki, chapdan o'ngga ochiladi
      const t = el('text', {
        x: p.x, y: p.y, 'text-anchor': 'middle', 'font-size': p.size, 'font-family': p.font || '"Great Vibes", cursive',
        fill: `url(#satin-${p.fill || 'gold'})`, stroke: p.color || PALETTE.goldDark, 'stroke-width': p.w || 0.9,
        'stroke-dasharray': STITCH.run(1.1), 'paint-order': 'stroke', mask: `url(#${mid})`,
      }, g);
      t.textContent = p.text;
      const rect = el('rect', { x: vx, y: vy, width: 0, height: vh, fill: 'white' }, mask);
      parts.push({ kind: 'text', node: t, rect, len: 60 + p.text.length * p.size * 0.5, local: -1 });
      return;
    }

    const dash = STITCH[p.stitch || 'chain'](p.w || 2);
    let fill = null;
    if (p.fill) fill = el('path', { d: p.d, fill: `url(#satin-${p.fill})`, class: 'fill', opacity: 0 }, g);
    const strokes = el('g', { mask: `url(#${mid})` }, g);
    const common = { d: p.d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': dash };
    el('path', { ...common, stroke: 'rgba(40,20,10,.32)', 'stroke-width': p.w || 2, transform: 'translate(.55,.75)' }, strokes);
    const main = el('path', { ...common, stroke: p.color, 'stroke-width': p.w || 2 }, strokes);
    el('path', { ...common, stroke: 'rgba(255,255,255,.32)', 'stroke-width': (p.w || 2) * 0.32, transform: 'translate(-.35,-.45)' }, strokes);
    const m = el('path', { d: p.d, fill: 'none', stroke: 'white', 'stroke-width': (p.w || 2) + 8, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, mask);
    parts.push({ kind: 'path', main, maskPath: m, fill, len: 0, local: -1 });
  });

  let measured = false;
  let total = 0;
  function measure() {
    if (measured) return;
    measured = true;
    total = 0;
    for (const p of parts) {
      if (p.kind === 'path') {
        try {
          p.len = Math.max(4, p.main.getTotalLength());
        } catch {
          p.len = 60;
        }
      }
      p.start = total;
      total += p.len;
    }
    if (!total) total = 1;
  }

  let progress = 0;
  let active = null; // hozir tikilayotgan qism
  function setProgress(v) {
    measure();
    progress = clamp(v, 0, 1);
    const at = progress * total;
    active = null;
    for (const p of parts) {
      const local = clamp((at - p.start) / p.len, 0, 1);
      if (local > 0 && local < 1) active = p;
      if (local === p.local) continue;
      p.local = local;
      if (p.kind === 'path') {
        p.maskPath.setAttribute('stroke-dashoffset', f(1 - local));
        if (p.fill) p.fill.classList.toggle('is-on', local >= 1);
      } else {
        const [bx, , bw] = [vx, 0, vw];
        p.rect.setAttribute('width', f(bw * local));
        p.rect.setAttribute('x', bx);
      }
    }
  }

  /** Igna uchi ekranda (px) — hozir tikilayotgan joy. */
  function tip() {
    if (!active) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    let x;
    let y;
    if (active.kind === 'path') {
      const pt = active.main.getPointAtLength(active.local * active.len);
      x = pt.x;
      y = pt.y;
    } else {
      const bb = active.node.getBBox();
      x = bb.x + bb.width * active.local;
      y = bb.y + bb.height * (0.45 + 0.25 * Math.sin(active.local * 60));
    }
    return { x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f };
  }

  setProgress(0);
  return { svg, setProgress, tip, get progress() { return progress; }, measure: () => { measured = false; measure(); } };
}

/* ------------------------------------------------------------------ */
/*  Aylantirish bilan tikish + igna                                     */
/* ------------------------------------------------------------------ */
const items = [];
let needle = null;
let raf = 0;
let last = 0;
let reduced = false;

function makeNeedle() {
  const n = document.createElement('div');
  n.className = 'needle';
  n.setAttribute('aria-hidden', 'true');
  n.innerHTML = `<svg viewBox="0 0 16 90"><defs><linearGradient id="needle-g" x1="0" x2="1"><stop offset="0" stop-color="#7d858f"/><stop offset=".45" stop-color="#f4f6f8"/><stop offset="1" stop-color="#6b737c"/></linearGradient></defs>
    <path d="M8,88L5.6,20C5.4,12 6,5 8,2C10,5 10.6,12 10.4,20Z" fill="url(#needle-g)" stroke="#565d66" stroke-width=".5"/>
    <ellipse cx="8" cy="12" rx="1.1" ry="4" fill="#f6ecd6"/>
    <path d="M8,10C2,-6 -14,6 -6,28C-2,40 -12,52 -4,70" stroke="#a3192e" stroke-width="1.4" fill="none" opacity=".85"/></svg>`;
  document.body.append(n);
  return n;
}

/**
 * Elementni ro'yxatga olish. mode: 'scroll' — aylantirish bilan; 'auto' — start() chaqirilganda o'zi tikiladi.
 * speed — sekundiga progress (1 = 1 soniyada to'liq).
 */
export function track(stitcher, { trigger = stitcher.svg, mode = 'scroll', speed = 0.42, onDone } = {}) {
  const item = { s: stitcher, trigger, mode, speed, p: 0, target: 0, onDone, started: mode === 'scroll', done: false };
  if (reduced) {
    item.p = 1;
    stitcher.setProgress(1);
    item.done = true;
    onDone?.();
  }
  items.push(item);
  loop();
  return {
    start() {
      item.started = true;
      item.target = 1;
      loop();
    },
    complete() {
      item.p = 1;
      stitcher.setProgress(1);
    },
  };
}

export function setReduced(v) {
  reduced = v;
}

/** Sahifa qayta chizilganda (panel ko'rinishi) eski kuzatuvlarni tozalash. */
export function resetTracks() {
  items.length = 0;
  needle?.classList.remove('is-on');
}

function loop() {
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(step);
  }
}

function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const vh = window.innerHeight;
  let busy = false;
  let needleAt = null;
  for (const it of items) {
    if (it.done) continue;
    if (it.mode === 'scroll') {
      const r = it.trigger.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) {
        busy = busy || it.p > 0;
        continue;
      }
      // Yuqori qirrasi ekran pastidan 55% gacha ko'tarilganda — to'liq tikilgan bo'ladi
      it.target = Math.max(it.target, clamp((vh - r.top) / (vh * 0.55 + Math.min(r.height, vh) * 0.35), 0, 1));
    } else if (!it.started) continue;
    if (it.p < it.target) {
      it.p = Math.min(it.target, it.p + it.speed * dt);
      it.s.setProgress(it.p);
      const t = it.s.tip();
      if (t && t.y > 0 && t.y < vh) needleAt = t;
      busy = true;
    }
    if (it.p >= 1 && !it.done) {
      it.done = true;
      it.onDone?.();
    }
    if (!it.done) busy = true;
  }
  needle ||= makeNeedle();
  if (needleAt) {
    const bob = Math.sin(now / 55) * 3.5;
    needle.style.transform = `translate(${needleAt.x - 6}px, ${needleAt.y - 84 + bob}px) rotate(18deg)`;
    needle.classList.add('is-on');
  } else {
    needle.classList.remove('is-on');
  }
  raf = 0;
  if (busy || items.some((i) => !i.done)) {
    // Kutayotgan elementlar bo'lsa ham aylantirishni kuzatamiz — lekin yengil
    raf = requestAnimationFrame(step);
  }
}
