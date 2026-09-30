// Kunduzgi osmon: butun ekran bo'ylab 3D bulutlar. Sahifa pastga surilganda kamera oldinga
// "uchadi" — bulutlar yaqinlashib, yon tomondan o'tib ketadi (haqiqiy perspektiva).
// Bulutlar oldindan canvas'da chizilgan sprite'lar: har kadrda faqat drawImage — telefonda ham yengil.

const rnd = (a, b) => a + Math.random() * (b - a);

/** Bitta bulut sprite'i: ko'p yumshoq doiralar, tepasi oppoq, osti havorang soyali. */
function cloudSprite(seed, w = 360, h = 190) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  let s = seed;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const puffs = [];
  const n = 9 + Math.floor(r() * 6);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = w * (0.16 + 0.68 * t) + (r() - 0.5) * w * 0.08;
    // O'rtada baland, chetlarda past — bulut shakli
    const hump = Math.sin(t * Math.PI);
    const rad = h * (0.2 + 0.2 * hump + r() * 0.08);
    const y = h * 0.72 - rad * (0.55 + 0.35 * hump) + (r() - 0.5) * 8;
    puffs.push({ x, y, rad });
  }
  // 1) Soya qatlami (pastki qism havorang)
  for (const p of puffs) {
    const gr = g.createRadialGradient(p.x, p.y + p.rad * 0.35, p.rad * 0.2, p.x, p.y + p.rad * 0.2, p.rad * 1.05);
    gr.addColorStop(0, 'rgba(196,218,240,0.95)');
    gr.addColorStop(0.75, 'rgba(206,226,245,0.8)');
    gr.addColorStop(1, 'rgba(206,226,245,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(p.x, p.y + p.rad * 0.12, p.rad * 1.05, 0, Math.PI * 2);
    g.fill();
  }
  // 2) Yorug' qatlam (tepadan quyosh)
  for (const p of puffs) {
    const gr = g.createRadialGradient(p.x - p.rad * 0.25, p.y - p.rad * 0.35, p.rad * 0.1, p.x, p.y, p.rad);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.92)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(p.x, p.y, p.rad, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/**
 * @param {HTMLCanvasElement} canvas  fixed, butun ekran
 * @param {{reduced?: boolean}} opts
 */
export function createSky(canvas, { reduced = false } = {}) {
  const g = canvas.getContext('2d');
  const sprites = Array.from({ length: 6 }, (_, i) => cloudSprite(1234 + i * 977));
  const DEPTH = 60; // bulutlar joylashgan chuqurlik (dunyo birligi)
  const NEAR = 0.9;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let camZ = 0;
  let scrollZ = 0;
  let speed = 0; // qo'shimcha tezlik (uchish paytida)
  let scrollPx = 0;
  let raf = 0;
  let last = 0;
  let running = true;

  // Bulutlar: x, y — ekran markaziga nisbatan (birlik ~ ekran eni), z — kameragacha masofa
  const clouds = Array.from({ length: reduced ? 16 : 30 }, (_, i) => spawn(rnd(NEAR + 1, DEPTH), i));
  function spawn(z, i = Math.random() * 99) {
    // Markaz (ko'rish yo'li) biroz ochiq qolsin — bulutlar asosan chetlarda va pastda
    let x = rnd(-2.4, 2.4);
    if (Math.abs(x) < 0.45) x += Math.sign(x || 1) * 0.5;
    return { x, y: rnd(-0.9, 1.3), z, s: sprites[Math.floor(i) % sprites.length], w: rnd(1.2, 2.4), drift: rnd(-0.015, 0.015) };
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  size();

  function draw(dt) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const target = scrollZ;
    // Kamera silliq ergashadi + asta o'zi ham uchib boradi
    camZ += (target - camZ) * Math.min(1, dt * 3.2) + (reduced ? 0 : (0.25 + speed) * dt);
    speed *= Math.exp(-dt * 1.6);
    const f = Math.min(W, H * 0.9) * 0.9; // fokus masofasi
    const cx = W / 2;
    const cy = H * 0.42;
    // Uzoqdagilar birinchi chiziladi
    const list = clouds.map((c) => {
      let dz = c.z - camZ;
      if (dz < NEAR) {
        // Kameradan o'tib ketdi — orqaga, uzoqqa qaytadi
        c.z += DEPTH;
        Object.assign(c, spawn(c.z));
        dz = c.z - camZ;
      }
      if (dz > DEPTH + NEAR) {
        c.z -= DEPTH;
        dz = c.z - camZ;
      }
      c.x += c.drift * dt;
      return [c, dz];
    });
    list.sort((a, b) => b[1] - a[1]);
    // Bosh qismda osmondagi yozuv o'qilishi uchun o'rtadagi bulutlar xiralashadi
    const hero = Math.max(0, 1 - scrollPx / (H * 0.8));
    const zx0 = W * 0.06;
    const zx1 = W * 0.94;
    const zy0 = H * 0.1;
    const zy1 = H * 0.66;
    for (const [c, dz] of list) {
      const k = f / dz;
      const w = c.w * k;
      const h = w * (c.s.height / c.s.width);
      const x = cx + c.x * k * 1.1 - w / 2;
      const y = cy + c.y * k * 0.9 - h / 2;
      if (x > W || x + w < 0 || y > H || y + h < 0) continue;
      // Uzoqda xira (havo pardasi), juda yaqinda shaffof (ichidan o'tib ketamiz)
      const far = Math.min(1, (DEPTH - dz) / (DEPTH * 0.35));
      const near = Math.min(1, (dz - NEAR) / 1.6);
      let a = Math.max(0, Math.min(far, near));
      if (hero > 0) {
        const ox = Math.max(0, Math.min(x + w, zx1) - Math.max(x, zx0)) / w;
        const oy = Math.max(0, Math.min(y + h, zy1) - Math.max(y, zy0)) / h;
        a *= 1 - hero * Math.min(1, ox * oy * 2.2);
      }
      if (a <= 0.01) continue;
      g.globalAlpha = a;
      g.drawImage(c.s, x, y, w, h);
    }
    g.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(dt);
    raf = running && !reduced ? requestAnimationFrame(frame) : 0;
  }
  const start = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  start();

  const onResize = () => {
    size();
    if (reduced) draw(0.016);
  };
  const onVis = () => {
    running = !document.hidden;
    if (running) start();
  };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);

  return {
    /** Sahifa necha px surilgani — kamera chuqurligi */
    setScroll(px) {
      scrollPx = px;
      scrollZ = px / Math.max(1, H) * 6;
      if (reduced) draw(0.016);
    },
    /** Uchish: bulutlar orasidan tez o'tib ketish */
    boost(v = 9) {
      speed = v;
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}
