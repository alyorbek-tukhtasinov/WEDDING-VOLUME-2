// Osmonga tutun bilan yozish ("skytyping"): bir safda uchayotgan kichik samolyotlar
// chapdan o'ngga o'tib, har biri o'z qatoridagi nuqtalarga tutun chiqaradi — nuqtalar
// kengayib qo'shiladi va osmonda ismlar paydo bo'ladi (haqiqiy sky-typing aynan shunday).

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function puffSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 30, 2, 32, 32, 32);
  // Yumshoq qirra — qo'shni nuqtalar qo'shilib, yaxlit tutun chizig'i bo'ladi
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.7, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Yon tomondan ko'rinadigan kichik samolyot (o'ngga qaragan), uzunligi ~ 1 birlik. */
function drawPlane(g, x, y, L, tilt, prop) {
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.scale(L / 40, L / 40);
  g.translate(-20, 0);
  g.lineJoin = 'round';
  // Soya
  g.fillStyle = 'rgba(40,70,110,0.18)';
  g.beginPath();
  g.ellipse(20, 7, 18, 2.2, 0, 0, Math.PI * 2);
  g.fill();
  // Dum
  g.fillStyle = '#ff7a5c';
  g.beginPath();
  g.moveTo(2, -1);
  g.lineTo(-1, -10);
  g.lineTo(5, -10);
  g.lineTo(11, -1);
  g.closePath();
  g.fill();
  // Fyuzelyaj
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#27456e';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(1, -2);
  g.quadraticCurveTo(14, -6, 30, -4.5);
  g.quadraticCurveTo(38, -3.5, 38, 0);
  g.quadraticCurveTo(38, 3.5, 30, 4);
  g.quadraticCurveTo(14, 4.5, 1, 1.5);
  g.closePath();
  g.fill();
  g.stroke();
  // Chiziq va kabina
  g.fillStyle = '#ff7a5c';
  g.fillRect(8, -1, 22, 1.6);
  g.fillStyle = '#9fd3ff';
  g.beginPath();
  g.moveTo(24, -4.6);
  g.quadraticCurveTo(28, -8.5, 32, -4.2);
  g.closePath();
  g.fill();
  // Qanot
  g.fillStyle = '#f2b441';
  g.beginPath();
  g.moveTo(16, 0.5);
  g.lineTo(27, 0.5);
  g.lineTo(22, 5.5);
  g.lineTo(13, 5.5);
  g.closePath();
  g.fill();
  // Parrak (aylanib turgan xira disk)
  g.fillStyle = `rgba(39,69,110,${0.25 + 0.2 * Math.sin(prop)})`;
  g.beginPath();
  g.ellipse(39.5, 0, 1.2, 6.5, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/**
 * @param {HTMLCanvasElement} canvas  qahramon (hero) ichidagi canvas
 * @param {object} o
 * @param {{text?: string, heart?: boolean, scale?: number}[]} o.lines  yoziladigan qatorlar (heart — yurakcha)
 * @param {string} o.font  CSS shrift nomi
 * @param {boolean} o.reduced
 */
export function createSkywriter(canvas, o) {
  const g = canvas.getContext('2d');
  const puff = puffSprite();
  let W = 0;
  let H = 0;
  let dpr = 1;
  let dots = [];
  let planes = [];
  let step = 5;
  let t0 = 0;
  let raf = 0;
  let state = 'idle'; // idle → writing → done
  let resolveDone = () => {};
  const done = new Promise((r) => (resolveDone = r));
  let dur = 5;
  let x0 = 0;
  let x1 = 0;

  function layout() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // Matnni yashirin canvas'ga chizib, nuqtalar to'rini olamiz
    const m = document.createElement('canvas');
    m.width = Math.round(W);
    m.height = Math.round(H);
    const mg = m.getContext('2d');
    const scales = o.lines.map((l) => l.scale || 1);
    const measure = (s) => {
      mg.font = `${s}px "${o.font}"`;
      // Kursiv shriftning dumlari harf enidan chiqib ketadi — haqiqiy siyoh chegarasi bo'yicha o'lchaymiz
      return Math.max(...o.lines.map((l, i) => {
        if (l.heart) return 0;
        const m2 = mg.measureText(l.text);
        const ink = (m2.actualBoundingBoxLeft || 0) + (m2.actualBoundingBoxRight || 0);
        return Math.max(m2.width, ink) / scales[i];
      }));
    };
    const totalScale = scales.reduce((a, b) => a + b, 0);
    let S = Math.min((W * 0.86) / (measure(100) / 100), (H * 0.9) / (totalScale * 0.95));
    S = clamp(S, 28, 150);
    const lh = S * 0.95;
    const blockH = lh * totalScale;
    let y = (H - blockH) / 2;
    mg.fillStyle = '#000';
    mg.textAlign = 'center';
    mg.textBaseline = 'middle';
    o.lines.forEach((l, i) => {
      const s = S * scales[i];
      mg.font = `${s}px "${o.font}"`;
      if (l.heart) {
        // Yurakcha — shriftga bog'liq emas, o'zimiz chizamiz
        const cx = W / 2;
        const cy = y + (lh * scales[i]) / 2;
        const r = s * 0.34;
        mg.beginPath();
        mg.moveTo(cx, cy + r * 0.95);
        mg.bezierCurveTo(cx - r * 1.5, cy - r * 0.05, cx - r * 0.8, cy - r * 1.2, cx, cy - r * 0.4);
        mg.bezierCurveTo(cx + r * 0.8, cy - r * 1.2, cx + r * 1.5, cy - r * 0.05, cx, cy + r * 0.95);
        mg.fill();
        y += lh * scales[i];
        return;
      }
      // Siyohni markazlash (dumli harflar bir tomonga og'ib ketmasin)
      const m2 = mg.measureText(l.text);
      const shift = ((m2.actualBoundingBoxLeft || 0) - (m2.actualBoundingBoxRight || 0)) / 2;
      mg.fillText(l.text, W / 2 + shift, y + (lh * scales[i]) / 2);
      y += lh * scales[i];
    });
    const img = mg.getImageData(0, 0, m.width, m.height).data;
    step = clamp(Math.round(S / 20), 3, 7);
    dots = [];
    let minX = W;
    let maxX = 0;
    let minY = H;
    let maxY = 0;
    for (let yy = step / 2; yy < m.height; yy += step) {
      for (let xx = step / 2; xx < m.width; xx += step) {
        const a = img[(Math.floor(yy) * m.width + Math.floor(xx)) * 4 + 3];
        if (a > 110) {
          dots.push({ x: xx, y: yy, t: Infinity, j: Math.random() });
          minX = Math.min(minX, xx);
          maxX = Math.max(maxX, xx);
          minY = Math.min(minY, yy);
          maxY = Math.max(maxY, yy);
        }
      }
    }
    // Samolyotlar safi: har biri o'z qatorlar bandini yozadi
    const n = clamp(Math.round((maxY - minY) / (S * 0.42)), 3, 6);
    const band = (maxY - minY + step) / n;
    const L = clamp(S * 0.42, 26, 46);
    planes = Array.from({ length: n }, (_, i) => ({
      y: minY + band * (i + 0.5),
      lead: Math.abs(i - (n - 1) / 2) * -L * 0.55, // "V" saf: o'rtadagisi oldinda
      L,
      bob: Math.random() * 6,
    }));
    for (const d of dots) d.p = clamp(Math.floor((d.y - minY) / band), 0, n - 1);
    x0 = -L * 2.5;
    x1 = W + L * 3;
    dur = clamp((x1 - x0) / (W * 0.2), 3.8, 6.5);
  }

  // Samolyotning dum qismi qayerda (vaqt bo'yicha)
  const tailX = (t, p) => x0 + (x1 - x0) * (t / dur) + p.lead;

  function render(now) {
    const t = (now - t0) / 1000;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // Tutun nuqtalari
    for (const d of dots) {
      if (d.t === Infinity) {
        const p = planes[d.p];
        if (state === 'done' || tailX(t, p) - p.L * 0.05 >= d.x) d.t = state === 'done' ? -9 : t + d.j * 0.05;
        else continue;
      }
      const age = t - d.t;
      if (age < 0) continue;
      const k = easeOut(clamp(age / 1.3, 0, 1));
      const r = step * (0.5 + 0.85 * k);
      // Shamol: tutun juda sekin suriladi
      const dx = Math.min(age, 6) * 0.6;
      const dy = -Math.min(age, 6) * 0.25;
      g.globalAlpha = clamp(age * 5, 0, 1) * 0.95;
      g.drawImage(puff, d.x - r + dx, d.y - r + dy, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    // Samolyotlar
    if (state === 'writing') {
      for (const p of planes) {
        const x = tailX(t, p) + p.L * 0.5;
        if (x < -p.L * 2 || x > W + p.L * 2) continue;
        const bob = Math.sin(t * 3 + p.bob) * 1.5;
        drawPlane(g, x, p.y + bob, p.L, Math.cos(t * 3 + p.bob) * 0.03, t * 60);
      }
    }
    const allOut = state === 'writing' && t > dur + 0.2;
    if (allOut) {
      state = 'settling';
    }
    if (state === 'settling' && t > dur + 1.8) {
      state = 'done';
      resolveDone();
      return; // oxirgi kadr chizildi — to'xtaymiz
    }
    if (state !== 'done') raf = requestAnimationFrame(render);
  }

  return {
    done,
    /** Yozishni boshlash (reduced — darhol tayyor holat) */
    start() {
      layout();
      if (o.reduced) {
        state = 'done';
        t0 = performance.now() - 20000;
        render(performance.now());
        resolveDone();
        return done;
      }
      state = 'writing';
      t0 = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(render);
      return done;
    },
    /** Ekran o'lchami o'zgarganda — yozuv tayyor holatda qayta chiziladi */
    resize() {
      if (state === 'idle') return;
      cancelAnimationFrame(raf);
      layout();
      state = 'done';
      t0 = performance.now() - 20000;
      const now = performance.now();
      for (const d of dots) d.t = -9;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(now);
      resolveDone();
    },
    destroy() {
      cancelAnimationFrame(raf);
    },
  };
}
