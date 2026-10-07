// Bayram effektlari: konfetti to'plari, salyut, uchib ketadigan sharlar va shar yorilishi.
// Konfetti va salyut — canvas-confetti (bitta umumiy canvas, sahifa ustida, bosishlarga xalaqit bermaydi).
import confetti from 'canvas-confetti';

export const COLORS = ['#ff7aa8', '#ffd166', '#7ee0c3', '#8fb7ff', '#b79cff', '#ffb38a', '#ffffff'];
export const BALLOON_COLORS = ['#ff5d8f', '#ffc53d', '#3ccfa8', '#5b8cff', '#a77bff', '#ff8a4d', '#f3c969'];

let reduced = false;
let shoot = null;
let hearts = false;
export function setReducedFx(v) {
  reduced = v;
}
/** Romantik rejim: konfetti orasida yurakchalar ham uchadi. */
export function setHearts(v) {
  hearts = v;
}
let heartShape = null;
const shapes = () => {
  if (!hearts) return undefined;
  heartShape ||= confetti.shapeFromPath?.({ path: 'M12 21s-7.5-4.6-10-9.3C0.3 8.3 2.3 4 6.4 4c2.3 0 3.9 1.3 5.6 3.4C13.7 5.3 15.3 4 17.6 4 21.7 4 23.7 8.3 22 11.7 19.5 16.4 12 21 12 21z' });
  return heartShape ? ['square', 'circle', heartShape, heartShape] : undefined;
};

function fire(opts) {
  if (reduced) return;
  if (!shoot) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    shoot = confetti.create(canvas, { resize: true, useWorker: true });
  }
  const sh = opts.shapes ? undefined : shapes();
  shoot({ colors: COLORS, disableForReducedMotion: true, ...(sh ? { shapes: sh } : {}), ...opts });
}

/** Ikki chetdan konfetti to'plari (shamlar o'chganda). */
export function cannons() {
  const base = { particleCount: 70, spread: 62, startVelocity: 62, ticks: 260, gravity: 0.9, scalar: 1.05 };
  fire({ ...base, angle: 60, origin: { x: 0, y: 0.92 } });
  fire({ ...base, angle: 120, origin: { x: 1, y: 0.92 } });
  setTimeout(() => {
    fire({ ...base, particleCount: 45, angle: 75, origin: { x: 0.1, y: 1 } });
    fire({ ...base, particleCount: 45, angle: 105, origin: { x: 0.9, y: 1 } });
  }, 380);
}

/** Bir nuqtadan konfetti (piksellarda). */
export function burst(x, y, count = 60, extra = {}) {
  fire({ particleCount: count, spread: 80, startVelocity: 32, ticks: 160, origin: { x: x / innerWidth, y: y / innerHeight }, ...extra });
}

/** Salyut: osmonda aylana bo'lib sochiladigan uchqunlar. */
export function firework(x = 0.2 + Math.random() * 0.6, y = 0.15 + Math.random() * 0.3) {
  const hue = COLORS[Math.floor(Math.random() * (COLORS.length - 1))];
  fire({ particleCount: 70, spread: 360, startVelocity: 26, gravity: 0.55, decay: 0.92, ticks: 110, scalar: 0.8, shapes: ['circle'], colors: [hue, '#ffffff', '#ffd166'], origin: { x, y } });
}

/** Ekran pastidan sharlar uchib chiqadi (DOM, CSS animatsiya). */
export function releaseBalloons(n = 14) {
  if (reduced) return;
  const box = document.createElement('div');
  box.className = 'sky-balloons';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i');
    const c = BALLOON_COLORS[i % BALLOON_COLORS.length];
    b.style.cssText = `--c:${c};--x:${(4 + Math.random() * 88).toFixed(1)}vw;--s:${(0.7 + Math.random() * 0.6).toFixed(2)};--t:${(5.5 + Math.random() * 3.5).toFixed(2)}s;--d:${(Math.random() * 1.4).toFixed(2)}s;--sw:${(Math.random() * 40 - 20).toFixed(0)}px`;
    box.append(b);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 11000);
}

/** Shar yorilishi: bo'laklar har tomonga sochiladi (shar o'rnida). */
export function pop(el, color) {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height * 0.4;
  if (reduced) return;
  const box = document.createElement('div');
  box.className = 'pop-bits';
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
    const d = 40 + Math.random() * 50;
    const s = document.createElement('i');
    s.style.cssText = `--c:${color};--tx:${(Math.cos(a) * d).toFixed(0)}px;--ty:${(Math.sin(a) * d).toFixed(0)}px;--r:${Math.round(Math.random() * 360)}deg`;
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 900);
  fire({ particleCount: 26, spread: 360, startVelocity: 14, ticks: 70, gravity: 0.7, scalar: 0.7, origin: { x: x / innerWidth, y: y / innerHeight } });
}
