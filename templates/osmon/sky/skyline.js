// Ufqdagi shahar silueti: 360° panorama (tomosha rejimida aylanib ko'rish uchun).
// Hammasi kod bilan chiziladi — istalgan ekranda tiniq. Asosiy ansambl (peshtoq, minoralar,
// qovurg'ali gumbaz) kamera boshlang'ich yo'nalishida turadi.

const SKY_DARK = '#04060d';
const RIM = 'rgba(120, 150, 215, 0.32)';

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/**
 * Panorama canvas: kengligi 360° (1° = px), balandligi `above`° ufqdan yuqori + `below`° pastda.
 * Qaytaradi: { canvas, px, baseY } — baseY — ufq chizig'ining canvas'dagi y koordinatasi.
 */
export function buildSkyline({ px, seed = 7, scale = 1, below = 4 }) {
  px = Math.max(3, Math.min(px, 20));
  // scale — ansamblning kattaligi (yaqinroqda turgandek); daraxtlar va tog'lar kamroq kattalashadi
  const above = Math.ceil(9.6 * scale + 1.5);
  const W = Math.round(360 * px);
  const H = Math.round((above + below) * px);
  const baseY = Math.round(above * px);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const rand = rng(seed);
  const X = (deg) => ((deg % 360) + 360) % 360 * px; // 0° — ansambl markazi (W/2 emas: 180°da)
  const cx = 180 * px; // ansambl markazi panoramaning o'rtasida
  const u = px * scale; // ansambl birligi
  const ut = px * (1 + (scale - 1) * 0.4); // daraxt, uy, tog' birligi

  // Chizishni 0/360 chegarasida ham uzluksiz qilish uchun har shakl ikki marta (±W) chiziladi
  const wrap = (fn) => {
    fn(0);
    ctx.save();
    ctx.translate(-W, 0);
    fn(-W);
    ctx.restore();
    ctx.save();
    ctx.translate(W, 0);
    fn(W);
    ctx.restore();
  };

  // 1) Uzoq tog'lar — davriy (uzluksiz) sinuslar yig'indisi
  const ridge = (x) => {
    const t = (x / W) * Math.PI * 2;
    return 1.4 + 0.9 * Math.sin(t * 3 + 1.1) + 0.6 * Math.sin(t * 7 + 0.4) + 0.35 * Math.sin(t * 13 + 2.2) + 0.18 * Math.sin(t * 29 + 0.7);
  };
  const mGrad = ctx.createLinearGradient(0, baseY - 4.5 * ut, 0, baseY);
  mGrad.addColorStop(0, '#0d1730');
  mGrad.addColorStop(1, '#070b18');
  ctx.fillStyle = mGrad;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= W; x += 2) ctx.lineTo(x, baseY - Math.max(0.3, ridge(x)) * ut);
  ctx.lineTo(W, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = SKY_DARK;

  // 2) Daraxtlar va pastak uylar — butun panorama bo'ylab (parametrlar oldindan: uch nusxa bir xil bo'lsin)
  const items = [];
  for (let d = 0; d < 360; d += 0.7 + rand() * 1.6) {
    if (Math.abs(d - 180) < 14 && rand() < 0.7) continue;
    items.push({ d, kind: rand(), a: rand(), b: rand(), c: rand(), lit: rand() < 0.45 });
  }
  wrap(() => {
    for (const it of items) {
      const x = it.d * px;
      if (it.kind < 0.42) {
        // Terak — baland, ingichka
        const h = (2.4 + it.a * 2.2) * ut;
        const w = (0.28 + it.b * 0.18) * ut;
        ctx.beginPath();
        ctx.ellipse(x, baseY - h / 2, w, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.kind < 0.78) {
        // Dumaloq daraxt
        const r = (0.55 + it.a * 0.6) * ut;
        ctx.beginPath();
        ctx.arc(x, baseY - r * 0.9, r, 0, Math.PI * 2);
        ctx.arc(x + r * 0.7, baseY - r * 0.6, r * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 0.06 * ut, baseY - r * 0.5, 0.12 * ut, r * 0.5);
      } else {
        // Pastak uy, ba'zida derazada chiroq
        const w = (1.2 + it.a * 1.8) * ut;
        const h = (0.6 + it.b * 0.6) * ut;
        ctx.fillRect(x, baseY - h, w, h);
        if (it.lit) {
          ctx.fillStyle = 'rgba(255, 196, 120, 0.75)';
          ctx.fillRect(x + w * (0.25 + it.c * 0.5), baseY - h * 0.62, 0.14 * ut, 0.2 * ut);
          ctx.fillStyle = SKY_DARK;
        }
      }
    }
  });

  // 3) Asosiy ansambl (kamera boshlang'ich yo'nalishida)
  const rim = (path) => {
    ctx.save();
    ctx.strokeStyle = RIM;
    ctx.lineWidth = Math.max(1, u * 0.07);
    ctx.stroke(path);
    ctx.restore();
  };

  function dome(x, w, h, drumH, ribs = true) {
    const top = baseY - drumH - h;
    // Baraban
    ctx.fillRect(x - w * 0.52, baseY - drumH, w * 1.04, drumH);
    // Qovurg'ali, biroz piyozsimon gumbaz
    const p = new Path2D();
    p.moveTo(x - w * 0.55, baseY - drumH);
    p.bezierCurveTo(x - w * 0.62, baseY - drumH - h * 0.55, x - w * 0.28, top + h * 0.08, x, top);
    p.bezierCurveTo(x + w * 0.28, top + h * 0.08, x + w * 0.62, baseY - drumH - h * 0.55, x + w * 0.55, baseY - drumH);
    p.closePath();
    ctx.fill(p);
    rim(p);
    if (ribs) {
      ctx.save();
      ctx.clip(p);
      ctx.strokeStyle = 'rgba(120, 150, 215, 0.12)';
      ctx.lineWidth = Math.max(1, u * 0.05);
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * w * 0.16, baseY - drumH);
        ctx.quadraticCurveTo(x + i * w * 0.12, top + h * 0.35, x, top);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Uchidagi nayza (alam)
    ctx.fillRect(x - u * 0.04, top - u * 0.55, u * 0.08, u * 0.55);
    ctx.beginPath();
    ctx.arc(x, top - u * 0.62, u * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function minaret(x, h, w) {
    const p = new Path2D();
    p.moveTo(x - w / 2, baseY);
    p.lineTo(x - w * 0.38, baseY - h);
    p.lineTo(x + w * 0.38, baseY - h);
    p.lineTo(x + w / 2, baseY);
    p.closePath();
    ctx.fill(p);
    rim(p);
    // Fonus (sharafa) va gumbazcha
    const bw = w * 1.15;
    ctx.fillRect(x - bw / 2, baseY - h - u * 0.35, bw, u * 0.35);
    ctx.beginPath();
    ctx.ellipse(x, baseY - h - u * 0.35, w * 0.42, u * 0.45, 0, Math.PI, 0);
    ctx.fill();
    // Kichik iliq tuynuklar
    ctx.fillStyle = 'rgba(255, 196, 120, 0.8)';
    ctx.fillRect(x - u * 0.05, baseY - h - u * 0.27, u * 0.1, u * 0.16);
    ctx.fillStyle = SKY_DARK;
  }

  function portal(x, w, h) {
    // Peshtoq — to'rtburchak, ichida o'tkir ravoq, ravoq ichida iliq yorug'lik
    const p = new Path2D();
    p.rect(x - w / 2, baseY - h, w, h);
    ctx.fill(p);
    rim(p);
    const aw = w * 0.52;
    const ah = h * 0.72;
    const ax = x;
    const ay = baseY;
    const arch = new Path2D();
    arch.moveTo(ax - aw / 2, ay);
    arch.lineTo(ax - aw / 2, ay - ah * 0.62);
    arch.quadraticCurveTo(ax - aw / 2, ay - ah * 0.94, ax, ay - ah);
    arch.quadraticCurveTo(ax + aw / 2, ay - ah * 0.94, ax + aw / 2, ay - ah * 0.62);
    arch.lineTo(ax + aw / 2, ay);
    arch.closePath();
    const g = ctx.createLinearGradient(0, ay - ah, 0, ay);
    g.addColorStop(0, 'rgba(255, 170, 90, 0.20)');
    g.addColorStop(0.6, 'rgba(255, 190, 110, 0.55)');
    g.addColorStop(1, 'rgba(255, 214, 150, 0.85)');
    ctx.fillStyle = g;
    ctx.fill(arch);
    // Ravoq ichidagi eshik va panjara (mashrabiya) izlari
    ctx.fillStyle = 'rgba(20, 14, 10, 0.55)';
    ctx.fillRect(ax - aw * 0.18, ay - ah * 0.34, aw * 0.36, ah * 0.34);
    ctx.strokeStyle = 'rgba(40, 22, 10, 0.35)';
    ctx.lineWidth = Math.max(1, u * 0.04);
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(ax - aw / 2, ay - ah * (0.62 * i) / 6);
      ctx.lineTo(ax + aw / 2, ay - ah * (0.62 * i) / 6);
      ctx.stroke();
    }
    ctx.fillStyle = SKY_DARK;
    // Yon tomondagi ikki qavat kichik ravoqlar (hujralar)
    for (const side of [-1, 1]) {
      for (let row = 0; row < 2; row++) {
        const sx = x + side * w * 0.38;
        const sy = baseY - h * (0.18 + row * 0.36);
        ctx.fillStyle = row === 0 ? 'rgba(255, 190, 110, 0.35)' : 'rgba(255, 190, 110, 0.18)';
        ctx.beginPath();
        ctx.moveTo(sx - w * 0.05, sy);
        ctx.lineTo(sx - w * 0.05, sy - h * 0.14);
        ctx.quadraticCurveTo(sx, sy - h * 0.21, sx + w * 0.05, sy - h * 0.14);
        ctx.lineTo(sx + w * 0.05, sy);
        ctx.fill();
      }
    }
    ctx.fillStyle = SKY_DARK;
  }

  function mausoleum(x, s) {
    ctx.fillRect(x - 1.6 * s, baseY - 1.3 * s, 3.2 * s, 1.3 * s);
    dome(x, 2.1 * s, 1.6 * s, 0.5 * s, true);
    minaret(x + 2.6 * s, 3.6 * s, 0.42 * s);
  }

  wrap(() => {
    // Orqa qator: yon gumbazlar
    dome(cx - 7.2 * u, 2.2 * u, 1.7 * u, 1.9 * u);
    dome(cx + 7.6 * u, 1.8 * u, 1.3 * u, 1.6 * u);
    // Katta qovurg'ali gumbaz (peshtoq ortida)
    dome(cx + 2.2 * u, 4.2 * u, 3.4 * u, 2.6 * u);
    // Yon devorlar
    ctx.fillRect(cx - 9.5 * u, baseY - 1.5 * u, 19 * u, 1.5 * u);
    for (let i = -9; i <= 9; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255, 190, 110, 0.22)' : 'rgba(255, 190, 110, 0.12)';
      ctx.fillRect(cx + i * u - u * 0.12, baseY - 1.05 * u, u * 0.24, u * 0.5);
    }
    ctx.fillStyle = SKY_DARK;
    // Minoralar va peshtoq
    minaret(cx - 4.3 * u, 8.6 * u, 0.62 * u);
    minaret(cx + 4.3 * u, 8.6 * u, 0.62 * u);
    portal(cx, 6.6 * u, 6.2 * u);
    // Boshqa tomonlarda — kichik maqbaralar (tomosha rejimida ko'rinadi)
    mausoleum(X(40), u * 1.1);
    mausoleum(X(310), u * 0.9);
  });

  // 4) Ufq ostidagi yer
  const gGround = ctx.createLinearGradient(0, baseY, 0, H);
  gGround.addColorStop(0, SKY_DARK);
  gGround.addColorStop(1, '#020309');
  ctx.fillStyle = gGround;
  ctx.fillRect(0, baseY - 1, W, H - baseY + 1);

  // Mayda iliq nuqtalar — uzoqdagi shahar chiroqlari
  for (let i = 0; i < 260; i++) {
    const x = rand() * W;
    const y = baseY + rand() * ut * 0.8;
    ctx.fillStyle = `rgba(255, ${170 + Math.round(rand() * 60)}, ${90 + Math.round(rand() * 60)}, ${0.25 + rand() * 0.5})`;
    ctx.fillRect(x, y, Math.max(1, ut * 0.08), Math.max(1, ut * 0.08));
  }

  return { canvas, px, baseY, W, H, above, below };
}
