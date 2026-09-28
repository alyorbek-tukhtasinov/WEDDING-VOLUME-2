// Varaq aylantirish mexanizmi: har bir varaq (leaf) — old va orqa yuzli qog'oz,
// umurtqa (spine) atrofida rotateY bilan buriladi. Telefonda bitta sahifa, kompyuterda
// ochiq kitob (ikki sahifa yonma-yon). Barmoq bilan tortib, bosib yoki klaviatura bilan varaqlanadi.
// Tinch holatdagi joriy varaq tekis (transform yo'q) — iOS'da forma maydonlari to'g'ri ishlaydi.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------ Qog'oz shitirlashi (WebAudio) ------------------------------ */
let actx = null;
let noise = null;
export function unlockSound() {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    if (!noise) {
      noise = actx.createBuffer(1, actx.sampleRate * 0.6, actx.sampleRate);
      const ch = noise.getChannelData(0);
      let b = 0;
      for (let i = 0; i < ch.length; i++) {
        // Jigarrang shovqin — qog'oz shitirlashiga yaqin
        b = (b + 0.04 * (Math.random() * 2 - 1)) / 1.04;
        ch[i] = b * 3.2;
      }
    }
  } catch {
    actx = null;
  }
}
function paperSound(strength = 1) {
  if (!actx || !noise || actx.state !== 'running') return;
  const t = actx.currentTime;
  const src = actx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.9 + Math.random() * 0.3;
  const bp = actx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(900, t);
  bp.frequency.exponentialRampToValueAtTime(3200, t + 0.18);
  bp.frequency.exponentialRampToValueAtTime(1400, t + 0.42);
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22 * strength, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.08 * strength, t + 0.22);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  src.connect(bp).connect(g).connect(actx.destination);
  src.start(t);
  src.stop(t + 0.55);
}

/* ------------------------------ Kitob ------------------------------ */
/**
 * @param {HTMLElement} el     .book elementi (ichi bo'sh bo'ladi)
 * @param {object} o
 * @param {HTMLElement[]} o.pages  [muqova, 1-sahifa, 2-sahifa, ...] — DOM tugunlari (qayta ishlatiladi)
 * @param {() => HTMLElement} o.endpaper  bezakli ichki qog'oz yasaydi
 * @param {boolean} o.spread  true — ikki sahifali ochiq kitob
 * @param {number} o.start  boshlang'ich sahifa (pages indeksi)
 * @param {boolean} o.reduced  harakatsiz rejim
 * @param {(info) => void} o.onChange  sahifa almashganda
 * @param {(page) => boolean} o.canLeave  false — bu sahifadan oldinga o'tib bo'lmaydi (muqova)
 * @param {boolean} o.backCover  true — pages'ning oxirgisi orqa muqova: oxirgi varaq aylantirilganda
 *                               kitob yopiladi va orqa muqova ko'rinadi
 * @param {boolean} o.vbook  telefon rejimi: bitta sahifa o'qiladi, lekin kitob to'liq ko'rinadi —
 *                           o'qilgan varaqlar chap tomonda qiya tik turadi (qo'lda ushlangan kitobdek)
 * @param {() => HTMLElement} o.paperBack  varaqning orqa yuzi (telefon rejimida)
 */
export function createBook(el, o) {
  const { pages, endpaper, spread, reduced, onChange } = o;
  const vbook = !spread && !!o.vbook;
  // Aylantirilgan varaq qaysi burchakda yotadi: ochiq kitobda tekis (-180), telefonda qiya tik
  const TILT = vbook ? -106 : -180;
  const ac = new AbortController();
  const on = (t, ty, fn, opts = {}) => t.addEventListener(ty, fn, { ...opts, signal: ac.signal });

  // Varaqlar ro'yxati. Orqa muqova oxirgi varaqning orqa yuzi bo'ladi: u aylantirilganda
  // chap tomonga yotadi va kitob o'sha tomonga suriladi — kitob yopilgandek ko'rinadi.
  const back = o.backCover ? pages[pages.length - 1] : null;
  const body = back ? pages.slice(0, -1) : pages;
  const defs = [];
  if (spread) {
    defs.push({ front: body[0], back: endpaper() });
    const rest = body.slice(1);
    for (let i = 0; i < rest.length; i += 2) defs.push({ front: rest[i], back: rest[i + 1] || back || endpaper() });
    if (back && rest.length % 2 === 0) defs.push({ front: endpaper(), back });
  } else {
    body.forEach((p, i) => defs.push({ front: p, back: back && i === body.length - 1 ? back : i > 0 && o.paperBack ? o.paperBack() : endpaper() }));
  }
  const n = defs.length;
  const maxCur = back ? n : n - 1;

  el.innerHTML = '';
  el.classList.toggle('book--spread', spread || vbook);
  el.classList.toggle('book--single', !spread && !vbook);
  el.classList.toggle('book--v', vbook);
  if (spread) {
    const ul = endpaper();
    ul.classList.add('book__under', 'book__under--l');
    const ur = endpaper();
    ur.classList.add('book__under', 'book__under--r');
    el.append(ul, ur);
  }
  const leaves = defs.map((d, i) => {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.dataset.leaf = String(i);
    const f = document.createElement('div');
    f.className = 'face face--front';
    f.append(d.front);
    const b = document.createElement('div');
    b.className = 'face face--back';
    b.append(d.back);
    const sf = document.createElement('i');
    sf.className = 'shade';
    const sb = document.createElement('i');
    sb.className = 'shade';
    f.append(sf);
    b.append(sb);
    leaf.append(f, b);
    el.append(leaf);
    return { el: leaf, front: d.front, back: d.back, angle: 0, sf, sb };
  });

  let cur = clamp(pageToCur(o.start || 0), 0, maxCur);
  let busy = false;
  let peekId = 0;
  let peeking = false;

  function pageToCur(p) {
    if (back && p >= pages.length - 1) return maxCur;
    if (!spread) return p;
    // 1-varaq old yuzi = 1-sahifa; k-varaq orqasi (2k) va (k+1)-varaq old yuzi (2k+1) bir yoyilmada
    return p === 0 ? 0 : Math.floor(p / 2) + 1;
  }
  function visiblePages(c = cur) {
    if (!spread) return [c < n ? defs[c].front : defs[n - 1].back];
    return [defs[c - 1]?.back, defs[c]?.front].filter((p) => p && pages.includes(p));
  }

  // c holatda i-varaqning tinch burchagi. Kitob oxirida yopilganda hamma varaq tekis yotadi.
  function restAngle(i, c = cur) {
    if (i >= c) return 0;
    return vbook && c < n ? TILT : -180;
  }

  function setAngle(l, a) {
    l.angle = a;
    l.el.style.transform = a === 0 ? '' : `rotateY(${a.toFixed(2)}deg)`;
    const p = -a / 180; // 0..1
    const s = Math.sin(p * Math.PI);
    l.sf.style.opacity = (p < 0.5 ? s * 0.55 : 0).toFixed(3);
    l.sb.style.opacity = (p >= 0.5 ? s * 0.45 : 0).toFixed(3);
  }

  // Joriy holatga ko'ra varaqlarning burchagi, qatlami va ko'rinishi
  function layout(turning = -1) {
    leaves.forEach((l, i) => {
      const flipped = i < cur;
      if (i !== turning) setAngle(l, restAngle(i));
      l.el.style.zIndex = String(i === turning ? 1000 : flipped ? i + 1 : n - i + 1);
      let vis;
      if (spread || vbook) vis = i >= cur - 2 && i <= cur + 1;
      else vis = i === cur || i === cur + 1 || (cur === n && i === n - 1) || (turning >= 0 && (i === turning || i === turning + 1));
      if (i === turning) vis = true;
      l.el.style.visibility = vis ? '' : 'hidden';
      l.el.classList.toggle('is-flat', i === cur && i !== turning && !flipped);
      l.el.classList.toggle('is-turning', i === turning);
    });
    el.classList.toggle('is-closed', cur === 0);
    // Muqova (yoki orqa muqova) aylanayotganda uning ostidagi ichki qog'oz hali ko'rinmasin
    el.classList.toggle('is-cover-turning', turning === 0);
    el.classList.toggle('is-back-turning', !!back && turning === n - 1);
    el.classList.toggle('is-end', !!back && cur === n);
    el.style.setProperty('--progress', String(cur / Math.max(1, maxCur)));
  }

  function markOpen(extra = []) {
    const vis = new Set([...visiblePages(), ...extra]);
    pages.forEach((p) => {
      const want = vis.has(p);
      if (want && !p.classList.contains('is-open')) p.classList.add('is-open');
      if (!want) p.classList.remove('is-open');
    });
  }

  function emit() {
    onChange?.({ cur, max: maxCur, pages: visiblePages(), spread, end: !!back && cur === n });
  }

  // Burchakni silliq o'zgartirish
  function tween(l, from, to, ms, cancelled = () => false) {
    return new Promise((res) => {
      if (ms <= 0 || reduced) {
        setAngle(l, to);
        return res();
      }
      const t0 = performance.now();
      const step = (now) => {
        if (cancelled()) return res();
        const t = clamp((now - t0) / ms, 0, 1);
        setAngle(l, from + (to - from) * ease(t));
        if (t < 1 && !ac.signal.aborted) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });
  }

  async function turn(dir, { from, ms = 900, silent = false } = {}) {
    if (peeking) {
      // Ishora harakatini to'xtatib, varaqni shu holatidan davom ettiramiz
      peekId++;
      peeking = false;
      busy = false;
    }
    if (busy) return false;
    const target = cur + dir;
    if (target < 0 || target > maxCur) return false;
    if (dir > 0 && o.canLeave && !o.canLeave(cur)) return false;
    busy = true;
    const idx = dir > 0 ? cur : cur - 1;
    const l = leaves[idx];
    layout(idx);
    // Ochilayotgan sahifalarning pop-up rasmlari varaq ochilishi bilan tik turadi
    markOpen(visiblePages(target));
    o.onTurn?.({ cur: target, max: maxCur, end: !!back && target === n });
    if (!silent) paperSound(1);
    if (reduced) {
      el.classList.add('is-fade');
      setTimeout(() => el.classList.remove('is-fade'), 320);
    }
    const start = from ?? l.angle;
    const to = restAngle(idx, target);
    // Telefonda kitob yopilayotganda (yoki qayta ochilayotganda) tik turgan varaqlar ham yotadi/turadi
    const others = vbook && (target === n || cur === n)
      ? leaves.slice(0, idx).map((o2, i) => tween(o2, o2.angle, restAngle(i, target), ms))
      : [];
    const span = Math.abs(to - restAngle(idx, cur)) || 180;
    await Promise.all([tween(l, start, to, ms * Math.max(0.35, Math.abs(to - start) / span)), ...others]);
    cur = target;
    busy = false;
    if (ac.signal.aborted) return false;
    layout();
    markOpen();
    emit();
    return true;
  }

  async function go(target) {
    target = clamp(target, 0, maxCur);
    if (target === cur) return;
    const dir = target > cur ? 1 : -1;
    const steps = Math.abs(target - cur);
    for (let i = 0; i < steps; i++) {
      if (!(await turn(dir, { ms: steps > 1 ? 420 : 900, silent: i > 0 && i < steps - 1 }))) break;
    }
  }

  // Varaq burchagi biroz ko'tarilib "meni varaqla" deb ishora qiladi
  async function peek() {
    if (busy || reduced || cur >= maxCur) return;
    const l = leaves[cur];
    const id = ++peekId;
    const stop = () => id !== peekId || ac.signal.aborted;
    busy = true;
    peeking = true;
    layout(cur);
    await tween(l, 0, -26, 520, stop);
    if (!stop()) await tween(l, -26, 0, 620, stop);
    if (stop()) return;
    peeking = false;
    busy = false;
    layout();
  }

  /* ---------------- Barmoq bilan tortish ---------------- */
  let drag = null;
  const pageW = () => el.querySelector('.leaf')?.getBoundingClientRect().width || 300;
  on(el, 'pointerdown', (e) => {
    if (peeking && !e.target.closest('input, textarea, select, .no-drag')) {
      peekId++;
      peeking = false;
      busy = false;
      layout();
    }
    if (busy || e.button > 0) return;
    if (e.target.closest('input, textarea, select, .no-drag')) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false, t: performance.now(), lastX: e.clientX, v: 0 };
  });
  on(el, 'pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) {
        if (Math.abs(dy) > 14) drag = null; // vertikal — sahifa ichini aylantirish
        return;
      }
      const dir = dx < 0 ? 1 : -1;
      if (cur + dir < 0 || cur + dir > maxCur || (dir > 0 && o.canLeave && !o.canLeave(cur))) {
        drag = null;
        return;
      }
      drag.active = true;
      drag.dir = dir;
      drag.idx = dir > 0 ? cur : cur - 1;
      // Varaq qaysi burchakdan qaysi burchakka boradi
      drag.from = restAngle(drag.idx, cur);
      drag.to = restAngle(drag.idx, cur + dir);
      busy = true;
      layout(drag.idx);
      markOpen(visiblePages(cur + dir));
      paperSound(0.7);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
    const now = performance.now();
    drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.t);
    drag.lastX = e.clientX;
    drag.t = now;
    const w = pageW() * (spread ? 1.6 : vbook ? 1.2 : 1.1);
    const k = clamp(Math.abs(dx) / w, 0, 1);
    setAngle(leaves[drag.idx], drag.from + (drag.to - drag.from) * k);
    e.preventDefault();
  });
  const endDrag = async (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.active) return;
    el.dataset.dragged = '1';
    setTimeout(() => delete el.dataset.dragged, 60);
    const l = leaves[d.idx];
    const k = (l.angle - d.from) / (d.to - d.from || 1);
    const fling = d.dir > 0 ? d.v < -0.45 : d.v > 0.45;
    busy = false;
    if (k > 0.28 || fling) {
      busy = false;
      await turn(d.dir, { from: l.angle, ms: 700, silent: true });
    } else {
      busy = true;
      await tween(l, l.angle, d.from, 360);
      busy = false;
      if (!ac.signal.aborted) {
        layout();
        markOpen();
      }
    }
  };
  on(el, 'pointerup', endDrag);
  on(el, 'pointercancel', endDrag);
  // Tortishdan keyingi "click" tugmani bosib yubormasin
  on(el, 'click', (e) => {
    if (el.dataset.dragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });

  layout();
  markOpen();
  emit();

  return {
    next: () => turn(1),
    prev: () => turn(-1),
    go,
    peek,
    get cur() {
      return cur;
    },
    get max() {
      return maxCur;
    },
    get busy() {
      return busy;
    },
    /** cur (varaq) → pages indeksi */
    pageOf(c = cur) {
      return pages.indexOf(visiblePages(c)[0]);
    },
    curOf: pageToCur,
    visiblePages,
    destroy() {
      ac.abort();
      // Sahifalar keyingi kitob uchun saqlanadi
      pages.forEach((p) => p.remove());
      el.innerHTML = '';
    },
  };
}
