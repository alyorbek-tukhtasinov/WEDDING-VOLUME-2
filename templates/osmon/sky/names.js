// Kelin-kuyov ismlaridan yulduz turkumi: ism husnixat shriftida chiziladi, undan teng tarqalgan
// nuqtalar (yulduzlar) tanlanadi va eng qisqa bog'lovchi daraxt (MST) bilan tutashtiriladi —
// haqiqiy yulduz turkumlaridagidek. Chiziqlar harflar tartibida chapdan o'ngga chiziladi.

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashStr(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/**
 * @returns {{ width, height, stars: {x,y,s,t}[], edges: {a,b,t0,t1}[], lines: {text,x,y,size}[], font }}
 * Koordinatalar — mahalliy birliklarda (canvas piksellari), t — paydo bo'lish vaqti (0..1).
 */
export function buildNameConstellation(groom, bride, font = 'Great Vibes', row = false) {
  // row — keng ekranlar uchun bir qatorda: "Ism & Ism"; aks holda uch qatorda
  const W = row ? 2400 : 1400;
  const H = row ? 420 : 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Uzun ismlar ham sig'ishi uchun shrift o'lchami moslanadi
  const fit = (text, size) => {
    ctx.font = `${size}px "${font}"`;
    const w = ctx.measureText(text).width;
    return w > W * 0.9 ? Math.floor((size * W * 0.9) / w) : size;
  };
  let lines;
  if (row) {
    let size = 230;
    const widths = (sz) => {
      ctx.font = `${sz}px "${font}"`;
      const wg = ctx.measureText(groom).width;
      const wb = ctx.measureText(bride).width;
      ctx.font = `${Math.round(sz * 0.55)}px "${font}"`;
      const wa = ctx.measureText('&').width;
      return { wg, wb, wa, gap: sz * 0.28 };
    };
    let m = widths(size);
    const total = (q) => q.wg + q.wb + q.wa + q.gap * 2;
    if (total(m) > W * 0.92) {
      size = Math.floor((size * W * 0.92) / total(m));
      m = widths(size);
    }
    let x = (W - total(m)) / 2;
    const y = 290;
    lines = [
      { text: groom, x: x + m.wg / 2, y, size },
      { text: '&', x: x + m.wg + m.gap + m.wa / 2, y: y - size * 0.05, size: Math.round(size * 0.55) },
      { text: bride, x: x + m.wg + m.gap * 2 + m.wa + m.wb / 2, y, size },
    ];
  } else {
    const size = Math.min(fit(groom, 220), fit(bride, 220));
    lines = [
      { text: groom, x: W / 2, y: 250, size },
      { text: '&', x: W / 2, y: 372, size: Math.round(size * 0.55) },
      { text: bride, x: W / 2, y: 548, size },
    ];
  }
  for (const l of lines) {
    ctx.font = `${l.size}px "${font}"`;
    ctx.fillText(l.text, l.x, l.y);
  }

  // Bo'yalgan piksellar
  const img = ctx.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      if (img[(y * W + x) * 4 + 3] > 150) pts.push([x, y]);
    }
  }
  if (pts.length < 10) return null;

  // Uzoqdagi nuqtani tanlash (farthest point sampling) — yulduzlar bir tekis tarqaladi
  const rand = rng(hashStr(groom + '&' + bride));
  const letters = [...(groom + bride)].filter((ch) => ch.trim()).length;
  const N = Math.min(row ? 190 : 170, Math.max(40, Math.round(letters * (row ? 10.5 : 9.5) + 14)));
  const chosen = [];
  const dist = new Float32Array(pts.length).fill(Infinity);
  let idx = Math.floor(rand() * pts.length);
  for (let k = 0; k < N; k++) {
    chosen.push(pts[idx]);
    const [cx, cy] = pts[idx];
    let best = -1;
    let bestD = -1;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i][0] - cx;
      const dy = pts[i][1] - cy;
      const d = dx * dx + dy * dy;
      if (d < dist[i]) dist[i] = d;
      if (dist[i] > bestD) {
        bestD = dist[i];
        best = i;
      }
    }
    idx = best;
  }

  // Eng qisqa bog'lovchi daraxt (Prim)
  const n = chosen.length;
  const inTree = new Uint8Array(n);
  const minD = new Float32Array(n).fill(Infinity);
  const parent = new Int32Array(n).fill(-1);
  minD[0] = 0;
  const mst = [];
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || minD[i] < minD[u])) u = i;
    inTree[u] = 1;
    if (parent[u] >= 0) mst.push([parent[u], u, Math.sqrt(minD[u])]);
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const dx = chosen[u][0] - chosen[v][0];
      const dy = chosen[u][1] - chosen[v][1];
      const d = dx * dx + dy * dy;
      if (d < minD[v]) {
        minD[v] = d;
        parent[v] = u;
      }
    }
  }
  // Harflar orasidagi uzun "ko'priklar" olib tashlanadi — so'zlar alohida turkumlar bo'ladi
  const lens = mst.map((e) => e[2]).sort((a, b) => a - b);
  const median = lens[Math.floor(lens.length / 2)] || 1;
  const edges = mst.filter((e) => e[2] <= median * 2.3);

  // Chiziqlar tartibi: har bir bo'lak chapdagi nuqtasidan boshlab kenglik bo'yicha (BFS)
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const order = new Float32Array(n).fill(-1);
  const edgeOrder = [];
  const byX = [...chosen.keys()].sort((a, b) => chosen[a][0] - chosen[b][0] || chosen[a][1] - chosen[b][1]);
  let step = 0;
  for (const start of byX) {
    if (order[start] >= 0) continue;
    const queue = [start];
    order[start] = step++;
    while (queue.length) {
      const u = queue.shift();
      for (const v of adj[u]) {
        if (order[v] >= 0) continue;
        order[v] = step++;
        edgeOrder.push([u, v, order[v]]);
        queue.push(v);
      }
    }
  }
  const total = Math.max(1, step - 1);
  const stars = chosen.map(([x, y], i) => ({
    x,
    y,
    s: rand() < 0.14 ? 1.5 + rand() * 0.5 : 0.7 + rand() * 0.45,
    t: order[i] / total,
    ph: rand() * Math.PI * 2,
  }));
  const segs = edgeOrder.map(([a, b, o]) => ({ a, b, t0: Math.max(0, (o - 1.5) / total), t1: o / total }));

  // Bo'sh chetlarni kesish: markazga nisbatan koordinatalar
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of stars) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  }
  const ox = (minX + maxX) / 2;
  const oy = (minY + maxY) / 2;
  for (const s of stars) {
    s.x -= ox;
    s.y -= oy;
  }
  for (const l of lines) {
    l.x -= ox;
    l.y -= oy;
  }
  return { width: maxX - minX, height: maxY - minY, stars, edges: segs, lines, font };
}
