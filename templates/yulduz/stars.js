// Yulduz-zarralar dvigateli: 9–18 ming yorug' nuqta bir shakldan boshqasiga oqib o'tadi
// (surat, ism, Oy, galaktika, yurak…). Fizika — CPU'da (prujina + girdob + barmoq bilan itarish),
// chizish — WebGL (gl.POINTS, qo'shiluvchi yorug'lik). WebGL bo'lmasa — Canvas 2D, kamroq nuqta bilan.
//
// Shakl: { pts: Float32Array [x, y, r, g, b, o'lcham] × n, n, spin?, pulse? } — koordinatalar CSS pikselda.
// Shaklga kirmagan zarralar — fondagi xira yulduzlar.

const VERT = `
attribute vec2 aPos;
attribute vec3 aCol;
attribute float aSize;
attribute float aSeed;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
varying vec3 vCol;
varying float vTw;
void main() {
  vec2 p = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  float tw = 0.78 + 0.22 * sin(uTime * (0.9 + aSeed * 2.6) + aSeed * 37.0);
  vTw = tw;
  vCol = aCol;
  gl_PointSize = max(1.0, aSize * uDpr * (0.88 + 0.24 * tw));
}`;

const FRAG = `
precision mediump float;
varying vec3 vCol;
varying float vTw;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  if (r2 > 1.0) discard;
  float a = exp(-r2 * 3.0);
  gl_FragColor = vec4(vCol * a * vTw, a);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

function makeGL(canvas) {
  let gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: 'high-performance' });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.bindAttribLocation(prog, 1, 'aCol');
    gl.bindAttribLocation(prog, 2, 'aSize');
    gl.bindAttribLocation(prog, 3, 'aSeed');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  gl.useProgram(prog);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  return {
    gl,
    uRes: gl.getUniformLocation(prog, 'uRes'),
    uDpr: gl.getUniformLocation(prog, 'uDpr'),
    uTime: gl.getUniformLocation(prog, 'uTime'),
    dyn: gl.createBuffer(),
    seed: gl.createBuffer(),
  };
}

export function createStars(canvas, { reduced = false } = {}) {
  let W = innerWidth;
  let H = innerHeight;
  const G = makeGL(canvas);
  const ctx = G ? null : canvas.getContext('2d');
  // Zarralar soni: ekran maydoniga qarab (telefon ~15 ming), WebGL bo'lmasa — 2500
  // Kuchsiz qurilmalarda (≤4 yadro) — kamroq, silliq ishlashi uchun
  const weak = (navigator.hardwareConcurrency || 8) <= 4;
  const N = G ? Math.round(Math.min(weak ? 11000 : 18000, Math.max(weak ? 7000 : 9000, (W * H) / (weak ? 30 : 21)))) : 2500;

  const px = new Float32Array(N);
  const py = new Float32Array(N);
  const vx = new Float32Array(N);
  const vy = new Float32Array(N);
  const bx = new Float32Array(N); // asosiy nishon (shakl nuqtasi)
  const by = new Float32Array(N);
  const tr = new Float32Array(N); // nishon rangi va o'lchami
  const tg = new Float32Array(N);
  const tb = new Float32Array(N);
  const ts = new Float32Array(N);
  const cr = new Float32Array(N); // hozirgi rang va o'lcham
  const cg = new Float32Array(N);
  const cb = new Float32Array(N);
  const cs = new Float32Array(N);
  const nx = new Float32Array(N); // keyingi shakl (navbat bilan o'tadi)
  const ny = new Float32Array(N);
  const nr = new Float32Array(N);
  const ng = new Float32Array(N);
  const nb = new Float32Array(N);
  const ns = new Float32Array(N);
  const inShape = new Uint8Array(N);
  const nextIn = new Uint8Array(N);
  const switched = new Uint8Array(N);
  const delay = new Float32Array(N);
  const seed = new Float32Array(N);
  const homeX = new Float32Array(N);
  const homeY = new Float32Array(N);
  const homeB = new Float32Array(N);
  const homeS = new Float32Array(N);
  const buf = new Float32Array(N * 6);

  for (let i = 0; i < N; i++) {
    seed[i] = Math.random();
    delay[i] = Math.random();
    homeB[i] = 0.18 + Math.pow(Math.random(), 3) * 0.75;
    homeS[i] = 1 + Math.pow(Math.random(), 2.5) * 2.2;
  }
  function placeHomes() {
    for (let i = 0; i < N; i++) {
      homeX[i] = Math.random() * W;
      homeY[i] = Math.random() * H;
    }
  }
  placeHomes();
  for (let i = 0; i < N; i++) {
    px[i] = bx[i] = homeX[i];
    py[i] = by[i] = homeY[i];
    // Boshida qorong'i: yulduzlar asta paydo bo'ladi
    cr[i] = cg[i] = cb[i] = 0;
    cs[i] = homeS[i];
    tr[i] = homeB[i] * 0.85;
    tg[i] = homeB[i] * 0.9;
    tb[i] = homeB[i];
    ts[i] = homeS[i];
  }

  let shape = null;
  let morphAt = -1e9;
  let boomAt = -1e9;
  let stagger = 0.9;
  let swirl = 1;
  let now = 0;
  let raf = 0;
  let running = false;
  const pointer = { x: -1e4, y: -1e4, on: false, last: 0 };

  function resize() {
    const ow = W;
    const oh = H;
    W = innerWidth;
    H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    if (ow !== W || oh !== H) {
      for (let i = 0; i < N; i++) {
        homeX[i] = (homeX[i] / ow) * W;
        homeY[i] = (homeY[i] / oh) * H;
      }
    }
    if (G) G.gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();

  if (G) {
    const { gl } = G;
    gl.bindBuffer(gl.ARRAY_BUFFER, G.seed);
    gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.dyn);
    gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
  }

  /** Yangi shakl: zarralar navbat bilan (stagger soniya ichida) uchib o'tadi. */
  function setShape(s, o = {}) {
    shape = s || { n: 0, pts: new Float32Array(0) };
    stagger = reduced ? 0 : o.stagger ?? 1.1;
    swirl = reduced ? 0 : o.swirl ?? 1;
    const n = Math.min(shape.n, N);
    const p = shape.pts;
    for (let i = 0; i < N; i++) {
      if (i < n) {
        const k = i * 6;
        nx[i] = p[k];
        ny[i] = p[k + 1];
        nr[i] = p[k + 2];
        ng[i] = p[k + 3];
        nb[i] = p[k + 4];
        ns[i] = p[k + 5];
        nextIn[i] = 1;
      } else {
        nx[i] = homeX[i];
        ny[i] = homeY[i];
        nr[i] = homeB[i] * 0.85;
        ng[i] = homeB[i] * 0.9;
        nb[i] = homeB[i];
        ns[i] = homeS[i];
        nextIn[i] = 0;
      }
      switched[i] = 0;
    }
    morphAt = now;
    if (reduced) {
      apply(true);
      for (let i = 0; i < N; i++) {
        px[i] = bx[i];
        py[i] = by[i];
      }
    }
    kick();
  }

  function apply(all) {
    const t = now - morphAt;
    for (let i = 0; i < N; i++) {
      if (switched[i] || (!all && t < delay[i] * stagger)) continue;
      switched[i] = 1;
      bx[i] = nx[i];
      by[i] = ny[i];
      tr[i] = nr[i];
      tg[i] = ng[i];
      tb[i] = nb[i];
      ts[i] = ns[i];
      inShape[i] = nextIn[i];
    }
  }

  /** Hamma yulduz bir zumda portlaydi va qaytib shaklga yig'iladi. */
  function explode(cx = W / 2, cy = H / 2, power = 1) {
    if (reduced) return;
    for (let i = 0; i < N; i++) {
      if (!inShape[i]) continue;
      const dx = px[i] - cx;
      const dy = py[i] - cy;
      const d = Math.hypot(dx, dy) || 1;
      const f = (10 + seed[i] * 26) * power;
      vx[i] += (dx / d) * f + (Math.random() - 0.5) * 6;
      vy[i] += (dy / d) * f + (Math.random() - 0.5) * 6;
    }
    boomAt = now;
    kick();
  }

  function onPointer(e) {
    const t = e.touches?.[0] || e;
    pointer.x = t.clientX;
    pointer.y = t.clientY;
    pointer.on = true;
    pointer.last = now;
    kick();
  }
  const offPointer = () => (pointer.on = false);
  addEventListener('pointerdown', onPointer, { passive: true });
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('touchmove', onPointer, { passive: true });
  addEventListener('pointerup', offPointer, { passive: true });
  addEventListener('touchend', offPointer, { passive: true });
  addEventListener('pointerleave', offPointer, { passive: true });
  const onResize = () => resize();
  addEventListener('resize', onResize);

  function step(dt) {
    apply(false);
    const t = now - morphAt;
    const sw = swirl * Math.max(0, 1 - t / (stagger + 1.4)) * 0.9;
    // Portlashdan keyin ~1,5 soniya: yulduzlar erkin uchadi, so'ng prujina ularni joyiga qaytaradi
    const boom = Math.max(0, 1 - (now - boomAt) / 1.9);
    const k = 0.032 * (1 - Math.min(1, boom * 1.25) * 0.93);
    const damp = 0.86 + boom * 0.1;
    // Aylanish (galaktika) va yurak urishi
    const spin = shape?.spin;
    const pulse = shape?.pulse;
    let ca = 1;
    let sa = 0;
    if (spin) {
      const a = now * spin.speed;
      ca = Math.cos(a);
      sa = Math.sin(a);
    }
    let ps = 1;
    if (pulse) {
      const ph = (now * 1.15) % 1;
      ps = 1 + 0.06 * Math.pow(Math.max(0, Math.sin(ph * Math.PI * 2)), 6) + 0.03 * Math.pow(Math.max(0, Math.sin((ph - 0.18) * Math.PI * 2)), 6);
    }
    const touchAge = now - pointer.last;
    const touching = pointer.on || touchAge < 0.12;
    const R = 78;
    const ambientDrift = reduced ? 0 : 1;
    for (let i = 0; i < N; i++) {
      let gx = bx[i];
      let gy = by[i];
      if (inShape[i] && switched[i]) {
        if (spin) {
          const ox = gx - spin.cx;
          const oy = gy - spin.cy;
          gx = spin.cx + ox * ca - oy * sa;
          gy = spin.cy + (ox * sa + oy * ca) * spin.squash;
        }
        if (pulse) {
          gx = pulse.cx + (gx - pulse.cx) * ps;
          gy = pulse.cy + (gy - pulse.cy) * ps;
        }
      } else if (!inShape[i]) {
        // Fondagi yulduzlar sekin suzadi
        gx += Math.sin(now * 0.05 + seed[i] * 50) * 6 * ambientDrift;
        gy += Math.cos(now * 0.04 + seed[i] * 70) * 6 * ambientDrift;
      }
      let ax = (gx - px[i]) * k;
      let ay = (gy - py[i]) * k;
      if (sw > 0 && switched[i]) {
        ax += Math.sin(py[i] * 0.012 + now * 1.7 + seed[i] * 6.28) * sw;
        ay += Math.cos(px[i] * 0.012 + now * 1.3 + seed[i] * 6.28) * sw;
      }
      if (touching) {
        const dx = px[i] - pointer.x;
        const dy = py[i] - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / R) * (1 - d / R) * 5.5;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
      }
      vx[i] = (vx[i] + ax) * damp;
      vy[i] = (vy[i] + ay) * damp;
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;
      const c = 0.06 * dt;
      cr[i] += (tr[i] - cr[i]) * c;
      cg[i] += (tg[i] - cg[i]) * c;
      cb[i] += (tb[i] - cb[i]) * c;
      cs[i] += (ts[i] - cs[i]) * c;
    }
  }

  function draw() {
    if (G) {
      const { gl } = G;
      for (let i = 0, k = 0; i < N; i++, k += 6) {
        buf[k] = px[i];
        buf[k + 1] = py[i];
        buf[k + 2] = cr[i];
        buf[k + 3] = cg[i];
        buf[k + 4] = cb[i];
        buf[k + 5] = cs[i];
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(G.uRes, W, H);
      gl.uniform1f(G.uDpr, Math.min(devicePixelRatio || 1, 2));
      gl.uniform1f(G.uTime, now);
      gl.bindBuffer(gl.ARRAY_BUFFER, G.dyn);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 8);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 24, 20);
      gl.bindBuffer(gl.ARRAY_BUFFER, G.seed);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 4, 0);
      gl.drawArrays(gl.POINTS, 0, N);
      return;
    }
    const dpr = canvas.width / W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const s = cs[i];
      ctx.fillStyle = `rgb(${(cr[i] * 255) | 0},${(cg[i] * 255) | 0},${(cb[i] * 255) | 0})`;
      ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s);
    }
  }

  let last = 0;
  function frame(ts) {
    raf = 0;
    if (document.hidden) {
      running = false;
      return;
    }
    const dt = last ? Math.min(2.5, (ts - last) / 16.67) : 1;
    last = ts;
    now = ts / 1000;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  const onVis = () => !document.hidden && kick();
  document.addEventListener('visibilitychange', onVis);

  return {
    count: N,
    webgl: !!G,
    setShape,
    explode,
    start: kick,
    size: () => ({ w: W, h: H }),
    destroy() {
      cancelAnimationFrame(raf);
      running = false;
      removeEventListener('pointerdown', onPointer);
      removeEventListener('pointermove', onPointer);
      removeEventListener('touchmove', onPointer);
      removeEventListener('pointerup', offPointer);
      removeEventListener('touchend', offPointer);
      removeEventListener('pointerleave', offPointer);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      // Panel jonli ko'rinishi har tahrirda qayta chiziladi — eski WebGL konteksti darhol bo'shatiladi
      G?.gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

/* ====================================== Shakllar ====================================== */
// Har biri { pts, n } qaytaradi (nuqtalar aralashtirilgan — zarralar har safar boshqa yo'ldan uchadi).

function pack(list, extra = {}) {
  // Fisher–Yates: nuqtalar tartibi tasodifiy
  for (let i = list.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [list[i], list[j]] = [list[j], list[i]];
  }
  const pts = new Float32Array(list.length * 6);
  list.forEach((p, i) => pts.set(p, i * 6));
  return { pts, n: list.length, ...extra };
}

function offscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return { c, g: c.getContext('2d', { willReadFrequently: true }) };
}

/**
 * Chizilgan narsadan nuqtalar: draw(g, w, h) offscreen canvas'ga chizadi (shaffof fonda),
 * keyin to'r bo'yicha olinadi. color — berilsa, hamma nuqta shu rangda (aks holda piksel rangi).
 */
export function drawnPoints(draw, box, { max = 6000, color = null, size = null, jitter = 0.35, lift = 1 } = {}) {
  // Avval to'liq o'lchamda chizib, to'ldirilgan maydonni o'lchaymiz
  const scale = 1;
  const { c, g } = offscreen(box.w * scale, box.h * scale);
  draw(g, c.width, c.height);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  let filled = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 110) filled++;
  filled *= 4;
  const stepPx = Math.max(1.6, Math.sqrt(filled / max));
  const list = [];
  for (let y = stepPx / 2; y < c.height; y += stepPx) {
    for (let x = stepPx / 2; x < c.width; x += stepPx) {
      const k = ((y | 0) * c.width + (x | 0)) * 4;
      const a = data[k + 3];
      if (a < 110) continue;
      const col = color || [Math.min(1, (data[k] / 255) * lift), Math.min(1, (data[k + 1] / 255) * lift), Math.min(1, (data[k + 2] / 255) * lift)];
      const v = 0.82 + Math.random() * 0.36;
      list.push([box.x + x + (Math.random() - 0.5) * stepPx * jitter, box.y + y + (Math.random() - 0.5) * stepPx * jitter, col[0] * v, col[1] * v, col[2] * v, size || stepPx * 1.15 + Math.random() * 0.8]);
    }
  }
  return pack(list);
}

/** Matn (ism, yosh, "Seni sevaman") — berilgan shriftda, maydonga sig'adigan qilib. */
export function textPoints(text, box, { font = '"Great Vibes", cursive', weight = '400', color = [1, 0.86, 0.6], max = 6000, size = null, stroke = 0 } = {}) {
  const lines = String(text).split('\n');
  return drawnPoints(
    (g, w, h) => {
      // Qatorlar (\n) ustma-ust; shrift maydonga sig'adigan eng katta o'lchamda
      const lh = 1.05;
      let fs = (h * 0.86) / (lines.length * lh);
      g.font = `${weight} ${fs}px ${font}`;
      const mw = Math.max(...lines.map((l) => g.measureText(l).width));
      if (mw > w * 0.94) fs *= (w * 0.94) / mw;
      g.font = `${weight} ${fs}px ${font}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.strokeStyle = '#fff';
      g.lineJoin = 'round';
      g.lineWidth = fs * stroke;
      const top = h / 2 - ((lines.length - 1) * fs * lh) / 2 + fs * 0.04;
      lines.forEach((l, i) => {
        g.fillText(l, w / 2, top + i * fs * lh);
        if (stroke) g.strokeText(l, w / 2, top + i * fs * lh);
      });
    },
    box,
    { max, color, size, jitter: 0.25 },
  );
}

/** Surat: "contain" bo'yicha joylanadi; har bir nuqta — suratning bitta pikseli, o'z rangida. */
export function imagePoints(img, box, { max = 9000 } = {}) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return null;
  const s = Math.min(box.w / iw, box.h / ih);
  const fw = iw * s;
  const fh = ih * s;
  const fx = box.x + (box.w - fw) / 2;
  const fy = box.y + (box.h - fh) / 2;
  const cols = Math.max(8, Math.round(Math.sqrt((max * fw) / fh)));
  const rows = Math.max(8, Math.round(max / cols));
  const { c, g } = offscreen(cols, rows);
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, cols, rows);
  let data;
  try {
    data = g.getImageData(0, 0, cols, rows).data;
  } catch {
    return null; // boshqa domendagi surat (CORS) — o'qib bo'lmaydi
  }
  const cw = fw / cols;
  const ch = fh / rows;
  const list = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Oval niqob: surat chetlari to'rtburchak emas — asta siyraklashib, yulduzlarga "eriydi"
      const ex = ((x + 0.5) / cols - 0.5) * 2;
      const ey = ((y + 0.5) / rows - 0.5) * 2;
      const e = Math.sqrt(ex * ex * 0.92 + ey * ey);
      const keep = e < 0.62 ? 1 : Math.max(0, 1 - (e - 0.62) / 0.46);
      if (keep <= 0 || Math.random() > keep * keep * 1.1) continue;
      const k = (y * cols + x) * 4;
      // Qorong'i joylar — yulduzsiz (zarralar fonga ketadi), o'rta tonlar yorug'roq
      const r = Math.pow(data[k] / 255, 0.78);
      const gg = Math.pow(data[k + 1] / 255, 0.78);
      const b = Math.pow(data[k + 2] / 255, 0.78);
      const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
      if (lum < 0.08) continue;
      // Biroz to'yinganroq rang va chetga qarab xiralik
      const sat = 1.18;
      const v = 0.95 * (0.55 + 0.45 * keep);
      const R = Math.min(1.15, lum + (r - lum) * sat) * v;
      const Gc = Math.min(1.15, lum + (gg - lum) * sat) * v;
      const B = Math.min(1.15, lum + (b - lum) * sat) * v;
      list.push([fx + (x + 0.5) * cw + (Math.random() - 0.5) * cw * 0.45, fy + (y + 0.5) * ch + (Math.random() - 0.5) * ch * 0.45, R, Gc, B, Math.max(1.7, cw * 1.3) * (0.85 + Math.random() * 0.3)]);
    }
  }
  return pack(list);
}

/** Yurak: chekkasi yorqin, ichi yumshoq pushti (urib turadi). */
export function heartPoints(box, n = 5000) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const R = Math.min(box.w, box.h) / 2.4;
  const list = [];
  const edge = Math.round(n * 0.32);
  for (let i = 0; i < edge; i++) {
    const t = Math.random() * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const j = 1 + (Math.random() - 0.5) * 0.05;
    list.push([cx + (x / 17) * R * j, cy - (y / 17) * R * j - R * 0.08, 1, 0.42 + Math.random() * 0.2, 0.6 + Math.random() * 0.15, 2 + Math.random() * 1.4]);
  }
  while (list.length < n) {
    const x = (Math.random() * 2 - 1) * 1.2;
    const y = (Math.random() * 2 - 1) * 1.25;
    const q = x * x + y * y - 1;
    if (q * q * q - x * x * y * y * y > 0) continue;
    const v = 0.45 + Math.random() * 0.35;
    list.push([cx + x * R * 0.92, cy - y * R * 0.92 - R * 0.12, v, v * 0.32, v * 0.48, 1.4 + Math.random() * 1.2]);
  }
  return pack(list, { pulse: { cx, cy } });
}

/** Tug'ilgan kechaning Oyi: yoritilgan qismi yorqin, qolgani xira ("yer nuri"), dog'lar bilan. */
export function moonPoints(box, illumination, waxing, n = 5200) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const R = Math.min(box.w, box.h) * 0.45;
  const maria = [
    [-0.32, -0.22, 0.2],
    [0.18, -0.38, 0.14],
    [0.3, 0.12, 0.17],
    [-0.12, 0.32, 0.13],
    [-0.5, 0.2, 0.1],
  ];
  const k = 1 - 2 * illumination; // terminator: x = k·√(1−y²)
  const list = [];
  const disk = Math.round(n * 0.88);
  for (let i = 0; i < disk; i++) {
    // Tekis tasodifiy taqsimot (to'r/spiral naqshi ko'rinmasin)
    const r = Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    const u = Math.cos(a) * r;
    const v = Math.sin(a) * r;
    const edge = k * Math.sqrt(Math.max(0, 1 - v * v));
    const lit = waxing ? u > edge : -u > edge;
    let b = 1;
    for (const [mx, my, mr] of maria) if ((u - mx) ** 2 + (v - my) ** 2 < mr * mr) b = 0.68;
    const limb = 0.82 + 0.18 * Math.sqrt(Math.max(0, 1 - r * r));
    if (lit) list.push([cx + u * R, cy + v * R, 1.25 * b * limb, 1.18 * b * limb, 1 * b * limb, 2.8 + Math.random() * 1.2]);
    else list.push([cx + u * R, cy + v * R, 0.05, 0.06, 0.11, 1.4]);
  }
  // Atrofidagi nur
  const glow = n - disk;
  for (let i = 0; i < glow; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = R * (1.04 + Math.pow(Math.random(), 2) * 0.5);
    const f = (0.35 + illumination * 0.45) * (1 - (r / R - 1) / 0.55);
    list.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, f, f * 0.95, f * 0.85, 1.6 + Math.random()]);
  }
  return pack(list);
}

/** Aylanayotgan galaktika (spiral qo'llar). */
export function galaxyPoints(box, n = 9000) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const R = Math.min(box.w, box.h * 1.6) * 0.5;
  const arms = 3;
  const list = [];
  for (let i = 0; i < n; i++) {
    const t = Math.pow(Math.random(), 0.75);
    const arm = i % arms;
    const ang = t * 5.2 + (arm * Math.PI * 2) / arms + (Math.random() - 0.5) * (0.5 + (1 - t) * 0.9);
    const rr = t * R + (Math.random() - 0.5) * 10;
    const x = Math.cos(ang) * rr;
    const y = Math.sin(ang) * rr;
    // Markaz — iliq oq-tilla, chekkalar — ko'k va binafsha
    const w = 1 - t;
    const r = 0.55 + 0.45 * w;
    const g = 0.5 + 0.4 * w;
    const b = 0.85 + 0.15 * (1 - w);
    const v = (0.45 + Math.random() * 0.55) * (0.6 + 0.4 * w);
    list.push([cx + x, cy + y, r * v, g * v, b * v, 1.2 + Math.random() * (1.6 + w * 1.4)]);
  }
  return pack(list, { spin: { cx, cy, speed: 0.12, squash: 0.48 } });
}

/** Sovg'a qutisi (lentasi va bantigi bilan) — yulduzlardan. */
export function giftPoints(box, max = 5000) {
  return drawnPoints(
    (g, w, h) => {
      const s = Math.min(w, h * 1.1);
      const x0 = (w - s * 0.7) / 2;
      const y0 = h * 0.38;
      const bw = s * 0.7;
      const bh = h * 0.5;
      g.fillStyle = '#ff7aa8';
      g.fillRect(x0, y0 + bh * 0.22, bw, bh * 0.78);
      g.fillStyle = '#ff9fc0';
      g.fillRect(x0 - bw * 0.05, y0, bw * 1.1, bh * 0.24);
      g.fillStyle = '#ffd98a';
      g.fillRect(w / 2 - bw * 0.07, y0, bw * 0.14, bh);
      g.lineWidth = bw * 0.07;
      g.strokeStyle = '#ffd98a';
      g.beginPath();
      g.ellipse(w / 2 - bw * 0.18, y0 - bh * 0.12, bw * 0.17, bh * 0.12, -0.35, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.ellipse(w / 2 + bw * 0.18, y0 - bh * 0.12, bw * 0.17, bh * 0.12, 0.35, 0, Math.PI * 2);
      g.stroke();
    },
    box,
    { max, lift: 0.95 },
  );
}

/** Maktub (konvert) — yulduzlardan. */
export function envelopePoints(box, max = 4500) {
  return drawnPoints(
    (g, w, h) => {
      const ew = Math.min(w * 0.7, h * 1.2);
      const eh = ew * 0.64;
      const x0 = (w - ew) / 2;
      const y0 = (h - eh) / 2;
      g.lineJoin = 'round';
      g.lineWidth = Math.max(4, ew * 0.035);
      g.strokeStyle = '#ffe2b0';
      g.strokeRect(x0, y0, ew, eh);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(w / 2, y0 + eh * 0.58);
      g.lineTo(x0 + ew, y0);
      g.stroke();
      g.fillStyle = '#ff5d8f';
      g.beginPath();
      const hx = w / 2;
      const hy = y0 + eh * 0.6;
      const r = ew * 0.07;
      g.moveTo(hx, hy + r * 1.2);
      g.bezierCurveTo(hx - r * 2, hy - r * 0.2, hx - r * 0.9, hy - r * 1.6, hx, hy - r * 0.5);
      g.bezierCurveTo(hx + r * 0.9, hy - r * 1.6, hx + r * 2, hy - r * 0.2, hx, hy + r * 1.2);
      g.fill();
    },
    box,
    { max, lift: 1 },
  );
}
