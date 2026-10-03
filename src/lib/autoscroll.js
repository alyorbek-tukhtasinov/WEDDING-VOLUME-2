// Avto-aylantirish: mehmon ▶ ni bossa, taklifnoma o'zi asta pastga suriladi (musiqa bilan "tomosha").
// Barcha shablonlar uchun umumiy (DOM'ga bog'liq, framework'siz).
//
// config.autoScroll: 'off' (yoki yo'q — eski saytlar) | 'button' — tugma | 'auto' — ochilgach o'zi boshlanadi.
//
// Ikki xil harakat:
//   flow — sahifa (window yoki element) silliq suriladi; muhim bo'limlarda (slow) sekinlashadi,
//          javob formasiga (stopAt) yetganda to'xtaydi, oxirida ↑ "Boshiga qaytish" ga aylanadi.
//   step — kitob/slayd: har bir necha soniyada keyingi varaq (next), oxirida ↑.
// Mehmon ekranga tegsa, g'ildirak/klaviatura bilan aylantirsa — darhol to'xtaydi; ▶ shu joydan davom ettiradi.

export const AUTOSCROLL_MODES = ['off', 'button', 'auto'];
export const autoScrollMode = (c) => (c?.autoScroll === 'button' || c?.autoScroll === 'auto' ? c.autoScroll : 'off');

const TEXT = {
  uz: { play: 'Avtomatik aylantirish', pause: 'To‘xtatish', top: 'Boshiga qaytish' },
  uzc: { play: 'Автоматик айлантириш', pause: 'Тўхтатиш', top: 'Бошига қайтиш' },
  ru: { play: 'Автопрокрутка', pause: 'Пауза', top: 'В начало' },
};
const text = () => {
  const l = document.documentElement.lang || 'uz';
  return l.startsWith('ru') ? TEXT.ru : /cyrl/i.test(l) ? TEXT.uzc : TEXT.uz;
};

const ICON = {
  // ⌄⌄ — "pastga o'zi suriladi" (▶ ishlatilmaydi: ba'zi shablonlarda musiqa tugmasi ham ▶)
  play: '<path d="M7.5 7.5 12 12l4.5-4.5M7.5 12.5 12 17l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  pause: '<rect x="8" y="7" width="2.6" height="10" rx=".8" fill="currentColor"/><rect x="13.4" y="7" width="2.6" height="10" rx=".8" fill="currentColor"/>',
  top: '<path d="M12 17.5V7M7.5 11 12 6.5l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};

const CSS = `
.ascroll{position:fixed;z-index:95;width:46px;height:46px;padding:0;border:0;border-radius:50%;cursor:pointer;display:grid;place-items:center;
  color:var(--ascroll-ink,#fff);background:var(--ascroll-bg,rgba(20,20,24,.55));-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  box-shadow:0 4px 16px rgba(0,0,0,.18);-webkit-tap-highlight-color:transparent;opacity:0;transform:scale(.85);transition:opacity .4s,transform .4s,background .3s}
.ascroll.is-on{opacity:1;transform:none}
.ascroll[hidden]{display:none}
.ascroll:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.ascroll svg{grid-area:1/1;width:100%;height:100%}
.ascroll .ascroll__ring{transform:rotate(-90deg);transform-origin:50% 50%}
.ascroll .ascroll__track{stroke:currentColor;opacity:.22}
.ascroll .ascroll__bar{stroke:currentColor;transition:stroke-dashoffset .25s linear}
.ascroll .ascroll__icon{width:24px;height:24px}
.ascroll.is-playing{background:var(--ascroll-bg-on,rgba(20,20,24,.7))}
@media (prefers-reduced-motion:reduce){.ascroll,.ascroll .ascroll__bar{transition:none}}
`;

function ensureStyle() {
  if (document.getElementById('ascroll-css')) return;
  const s = document.createElement('style');
  s.id = 'ascroll-css';
  s.textContent = CSS;
  document.head.append(s);
}

const R = 21;
const LEN = 2 * Math.PI * R;
// Tugmani bosish / musiqa tugmasi — mehmonning "to'xtatish" harakati hisoblanmaydi
const OWN = '.ascroll, #music-toggle';

let current = null;

/**
 * @param {object} c config
 * @param {object} o
 *   scroller   — window (standart) yoki aylanadigan element (flow)
 *   slow       — sekinlashadigan bo'limlar selektori (taklif matni, sana)
 *   stopAt     — shu elementga yetganda to'xtaydi (standart: javob formasi)
 *   step       — { next(), atEnd(), atStop(), progress(), restart(), dwell() } — varaqlash rejimi
 *   anchor     — tugma yoniga qo'yiladigan element (standart: #music-toggle, pastda bo'lsa)
 *   above      — pastdagi doimiy panel selektori: tugma undan yuqorida turadi
 *   theme      — { bg, ink } tugma ranglari
 * @returns {{ ready(start?: boolean): void, destroy(): void }}
 *   ready(false) — til almashtirilganda/qayta chizilganda: tugma chiqadi, lekin o'zi boshlanmaydi
 */
export function initAutoScroll(c, o = {}) {
  current?.destroy();
  const mode = autoScrollMode(c);
  if (mode === 'off') return (current = { ready() {}, destroy() {} });
  ensureStyle();

  const scroller = o.scroller || window;
  const isWin = scroller === window;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ascroll';
  btn.hidden = true;
  if (o.theme?.bg) btn.style.setProperty('--ascroll-bg', o.theme.bg), btn.style.setProperty('--ascroll-bg-on', o.theme.bgOn || o.theme.bg);
  if (o.theme?.ink) btn.style.setProperty('--ascroll-ink', o.theme.ink);
  btn.innerHTML = `<svg class="ascroll__ring" viewBox="0 0 46 46" aria-hidden="true"><circle class="ascroll__track" cx="23" cy="23" r="${R}" fill="none" stroke-width="1.6"/><circle class="ascroll__bar" cx="23" cy="23" r="${R}" fill="none" stroke-width="2" stroke-linecap="round" stroke-dasharray="${LEN}" stroke-dashoffset="${LEN}"/></svg><svg class="ascroll__icon" viewBox="0 0 24 24" aria-hidden="true"></svg>`;
  document.body.append(btn);
  const bar = btn.querySelector('.ascroll__bar');
  const icon = btn.querySelector('.ascroll__icon');

  let state = 'idle'; // idle | playing | end
  let raf = 0;
  let timer = 0;
  let autoTimer = 0;
  let pos = 0;
  let last = 0;
  let passedStop = false;
  let alive = true;
  const off = [];
  const on = (t, ev, fn, opt) => {
    t.addEventListener(ev, fn, opt);
    off.push(() => t.removeEventListener(ev, fn, opt));
  };

  const top = () => (isWin ? window.scrollY : scroller.scrollTop);
  const max = () => (isWin ? document.documentElement.scrollHeight - window.innerHeight : scroller.scrollHeight - scroller.clientHeight);
  const viewH = () => (isWin ? window.innerHeight : scroller.clientHeight);
  // behavior: 'instant' eski Safari'da xato beradi — oddiy shakl + CSS scroll-behavior vaqtincha "auto"
  const setTop = (y) => (isWin ? window.scrollTo(0, y) : (scroller.scrollTop = y));
  const smoothEl = isWin ? document.documentElement : scroller;
  let savedBehavior = null;
  const instantScroll = (onOff) => {
    if (onOff && savedBehavior === null) {
      savedBehavior = smoothEl.style.scrollBehavior;
      smoothEl.style.scrollBehavior = 'auto';
    } else if (!onOff && savedBehavior !== null) {
      smoothEl.style.scrollBehavior = savedBehavior;
      savedBehavior = null;
    }
  };

  const progress = () => (o.step ? o.step.progress() : max() > 0 ? Math.min(1, top() / max()) : 0);
  const atEnd = () => (o.step ? o.step.atEnd() : top() >= max() - 2);

  function render() {
    const t = text();
    const kind = state === 'playing' ? 'pause' : state === 'end' ? 'top' : 'play';
    if (btn.dataset.kind !== kind) {
      btn.dataset.kind = kind;
      icon.innerHTML = ICON[kind];
    }
    btn.classList.toggle('is-playing', state === 'playing');
    btn.setAttribute('aria-label', t[kind]);
    btn.title = t[kind];
    bar.style.strokeDashoffset = String(LEN * (1 - progress()));
  }

  // Tugma joyi: musiqa tugmasi pastki o'ngda bo'lsa — uning chap yonida, aks holda pastki o'ng burchakda
  function place() {
    const a = o.anchor || document.getElementById('music-toggle');
    // offsetParent fixed elementlarda doim null — shuning uchun o'lcham bo'yicha tekshiramiz
    const r = a && !a.hidden ? a.getBoundingClientRect() : null;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    if (r && r.width && r.top > vh / 2 && r.left > vw / 2) {
      btn.style.right = `${Math.round(vw - r.left + 10)}px`;
      btn.style.bottom = `${Math.round(vh - r.top - r.height / 2 - 23)}px`;
    } else {
      // Pastda doimiy panel bo'lsa (kitob: varaqlash tugmalari) — undan yuqorida
      const bar = o.above && document.querySelector(o.above);
      const b = bar && !bar.hidden ? bar.getBoundingClientRect() : null;
      btn.style.right = '16px';
      btn.style.bottom = b?.height ? `${Math.round(vh - b.top + 12)}px` : 'calc(16px + env(safe-area-inset-bottom))';
    }
  }

  /* ---------------------------- flow ---------------------------- */
  function speed() {
    const base = Math.min(90, Math.max(48, viewH() * 0.085));
    if (!o.slow) return base;
    const mid = viewH() * 0.5;
    const box = isWin ? null : scroller.getBoundingClientRect();
    for (const el of document.querySelectorAll(o.slow)) {
      const r = el.getBoundingClientRect();
      const t = box ? r.top - box.top : r.top;
      if (t < mid && t + r.height > mid * 0.6) return base * 0.6;
    }
    return base;
  }

  function reachedStop() {
    if (passedStop) return false;
    const el = document.querySelector(o.stopAt || '#rsvp-form');
    if (!el || el.offsetParent === null) return false;
    const r = el.getBoundingClientRect();
    const t = isWin ? r.top : r.top - scroller.getBoundingClientRect().top;
    return t < viewH() * 0.3;
  }

  function frame(now) {
    if (state !== 'playing') return;
    try {
      step(now);
    } catch (err) {
      console.error('autoscroll:', err);
      stop();
    }
  }
  function step(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    // Mehmon (yoki boshqa narsa) sahifani surgan bo'lsa — to'xtaymiz
    if (Math.abs(top() - Math.floor(pos)) > 4) return stop();
    if (reachedStop()) {
      passedStop = true;
      return stop();
    }
    if (atEnd()) return finish();
    pos = Math.min(max(), pos + speed() * dt);
    setTop(Math.floor(pos));
    render();
    raf = requestAnimationFrame(frame);
  }

  /* ---------------------------- step ---------------------------- */
  async function tick() {
    if (state !== 'playing') return;
    if (o.step.atEnd()) return finish();
    if (!passedStop && o.step.atStop()) {
      passedStop = true;
      return stop();
    }
    await o.step.next();
    render();
    if (state !== 'playing') return;
    if (o.step.atEnd()) return finish();
    timer = setTimeout(tick, o.step.dwell?.() ?? 5000);
  }

  function play() {
    if (state === 'playing') return;
    if (atEnd()) return finish();
    state = 'playing';
    render();
    if (o.step) {
      timer = setTimeout(tick, 900);
    } else {
      instantScroll(true);
      pos = top();
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function stop() {
    instantScroll(false);
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    if (state === 'playing') state = 'idle';
    render();
  }
  function finish() {
    instantScroll(false);
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    state = 'end';
    render();
  }
  function restart() {
    state = 'idle';
    passedStop = false;
    if (o.step) o.step.restart();
    else if (reduced) setTop(0);
    else if (isWin) window.scrollTo({ top: 0, behavior: 'smooth' });
    else scroller.scrollTo({ top: 0, behavior: 'smooth' });
    render();
  }

  on(btn, 'click', () => {
    if (state === 'playing') stop();
    else if (state === 'end') restart();
    else play();
  });

  // Mehmonning o'z harakati — to'xtatadi
  const interrupt = (e) => {
    if (e.target?.closest?.(OWN)) return;
    clearTimeout(autoTimer); // o'zi boshlanishini kutayotganda mehmon o'zi aylantirsa — boshlamaymiz
    if (state === 'playing') stop();
  };
  on(document, 'pointerdown', interrupt, { capture: true, passive: true });
  on(document, 'wheel', interrupt, { capture: true, passive: true });
  on(document, 'keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) interrupt(e);
  }, { capture: true });
  on(document, 'visibilitychange', () => document.hidden && stop());

  // Halqa va ↑ holati qo'lda aylantirganda ham yangilanadi
  const onScroll = () => {
    if (state !== 'playing') {
      if (atEnd()) state = 'end';
      else if (state === 'end') state = 'idle';
    }
    render();
  };
  if (!o.step || o.scroller) on(scroller, 'scroll', onScroll, { passive: true });
  on(window, 'resize', place);

  let shown = false;
  const api = {
    ready(start = true) {
      if (!alive || shown) return;
      shown = true;
      btn.hidden = false;
      place();
      render();
      requestAnimationFrame(() => btn.classList.add('is-on'));
      // Musiqa tugmasi kechroq ko'rinsa ham yonida turishi uchun
      setTimeout(place, 400);
      setTimeout(place, 1600);
      // Ochilish (muhr/eshik) animatsiyasi tugashi bilan — mehmon tegsa to'xtaydi
      // Telefonda "animatsiyalarni kamaytirish" yoqilgan bo'lsa ham boshlanadi: harakat sekin va tegilsa to'xtaydi
      if (mode === 'auto' && start) autoTimer = setTimeout(play, 1200);
    },
    /** Varaq/sahifa o'zgarganda (step) halqani yangilash */
    update: () => {
      if (state !== 'playing') state = atEnd() ? 'end' : state === 'end' ? 'idle' : state;
      render();
    },
    destroy() {
      alive = false;
      clearTimeout(autoTimer);
      stop();
      off.forEach((f) => f());
      btn.remove();
      if (current === api) current = null;
    },
  };
  current = api;
  return api;
}
