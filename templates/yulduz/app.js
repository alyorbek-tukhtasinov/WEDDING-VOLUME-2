// "Yulduzlardan yaralgan" — yigitning sevgan qiziga tug'ilgan kun tabrigi.
// Butun sahifa ortida 9–18 ming yulduz-zarra yashaydi (stars.js). Qiz pastga surgan sari ular bir shakldan
// boshqasiga oqib o'tadi: u tug'ilgan kechaning haqiqiy Oyi (astronomik hisob) → aylanayotgan galaktika →
// QIZNING O'Z SURATI yulduzlardan yig'iladi (barmoq tekkizilsa tarqaladi) → ismi → yoshi → yurak →
// xotira suratlari → uchar yulduzlar-tilaklar → maktub → sovg'a → "Seni sevaman" (bosilsa portlaydi).
// mountYulduz() saytda (main.js) va panelning jonli ko'rinishida (preview: true) ishlatiladi.
import '../osmon/fonts/fonts.css';
import '../tort/fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, mediaUrl, isValidDate } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import { initAutoScroll } from '../../src/lib/autoscroll.js';
import brand from '@brand-config';
import { createStars, textPoints, imagePoints, heartPoints, moonPoints, galaxyPoints, giftPoints, envelopePoints } from './stars.js';
import { birthFacts, bigKm } from './facts.js';
import { yulduzTexts } from './texts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const num = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const ICON = {
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};

/* ---------------------------- Qayta chizish uchun tozalash ---------------------------- */
let scope = null;
function newScope() {
  scope?.abort();
  const ac = new AbortController();
  const timers = new Set();
  const cleanups = new Set();
  scope = {
    on(target, type, fn, opts = {}) {
      target.addEventListener(type, fn, { ...opts, signal: ac.signal });
    },
    later(fn, ms) {
      const id = setTimeout(fn, ms);
      timers.add(id);
      return id;
    },
    every(fn, ms) {
      const id = setInterval(fn, ms);
      timers.add(id);
      return id;
    },
    add(fn) {
      cleanups.add(fn);
    },
    abort() {
      ac.abort();
      timers.forEach((id) => {
        clearTimeout(id);
        clearInterval(id);
      });
      cleanups.forEach((fn) => fn());
    },
  };
  return scope;
}

function brandLink() {
  if (!brand?.enabled) return '';
  return html`<a class="brand" href="${brand.url}" target="_blank" rel="noopener">
    ${brand.logo
      ? html`<img src="${brand.logo}" alt="" width="30" height="30" loading="lazy" />`
      : raw('<svg class="brand__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" /></svg>')}
    <span>${brand.text}<b>${brand.name}</b></span>
  </a>`;
}

/** Matnni so'zma-so'z paydo bo'ladigan qilish. */
const words = (text, cls = '') =>
  html`<span class="words ${cls}">${String(text)
    .split(/\s+/)
    .map((w, i) => html`<span style="--w:${i}">${w}</span> `)}</span>`;

/* ------------------------------------ Boblar ------------------------------------ */
// Har bob: { id, cls, body (HTML), shape: (ctx) => shakl | null }
function chaptersOf(c, d, T, f) {
  const n = d.name;
  const memories = (c.memories || []).filter((m) => m?.photo).slice(0, 6);
  const portrait = c.photos?.portrait || memories[0]?.photo || '';
  const wishes = (c.wishes || []).map((w) => String(w).trim()).filter(Boolean);
  const gift = c.gift && (c.gift.title || c.gift.text || c.gift.card || c.gift.link) ? c.gift : null;
  const reply = c.rsvp?.enabled !== false;
  const together = isValidDate(c.together) ? Math.max(0, Math.floor((Date.now() - new Date(`${c.together}T00:00:00${c.event.timezone || '+05:00'}`)) / 86400000)) : null;
  const ch = [];

  ch.push({
    id: 'intro',
    body: html`<p class="big">${words(T.intro)}</p><p class="lead">${words(T.introText, 'words--late')}</p><p class="cue" aria-hidden="true">pastga sur</p>`,
    shape: () => null,
  });
  if (f) {
    ch.push({
      id: 'moon',
      body: html`<p class="kicker">${f.weekday} · ${f.dateText}</p>
        <p class="lead">${T.moonText}</p>
        <p class="chips"><span>${f.burj.sign} ${f.burj.name} burji</span><span>${f.muchal.emoji} ${f.muchal.name} yili</span></p>`,
      shape: (x) => moonPoints(x.box(0.1, 0.58), f.moon.illumination, f.moon.waxing, Math.round(x.N * 0.62)),
    });
  }
  ch.push({
    id: 'galaxy',
    body: html`<p class="big">${words(T.galaxy)}</p>${portrait ? '' : html`<p class="lead">${words(T.portrait, 'words--late')}</p>`}`,
    shape: (x) => galaxyPoints(x.box(0.06, 0.66), Math.round(x.N * 0.8)),
    opts: { stagger: 1.4, swirl: 1.4 },
  });
  if (portrait) {
    ch.push({
      id: 'portrait',
      cls: 'ch--long',
      body: html`<p class="big">${words(T.portrait)}</p><p class="hint">${T.touchHint}</p>`,
      shape: (x) => x.image(portrait, x.box(0.07, 0.66), 0.86),
      opts: { stagger: 1.6, swirl: 1.2 },
    });
  }
  ch.push({
    id: 'name',
    body: html`<h1 class="sr-only">${n}</h1><p class="lead">${T.nameText}</p>`,
    shape: (x) => textPoints(n, x.box(0.16, 0.54), { font: '"Great Vibes", cursive', color: [1, 0.88, 0.66], max: Math.round(x.N * 0.65), stroke: 0.02 }),
  });
  if (d.age) {
    ch.push({
      id: 'age',
      body: html`<p class="kicker">${d.age} yosh</p>
        ${f ? html`<p class="lead">${num(f.days)} kun · ${num(f.hours)} soat yorug‘lik</p>
          <p class="small">Shu yillar ichida Yer seni Quyosh atrofida <b>${bigKm(f.km)} km</b> olib yurdi 🌍</p>` : ''}`,
      shape: (x) => textPoints(String(d.age), x.box(0.12, 0.56), { font: 'Cinzel, serif', weight: '600', color: [1, 0.9, 0.72], max: Math.round(x.N * 0.55) }),
    });
  }
  if (together != null) {
    ch.push({
      id: 'together',
      body: html`<p class="kicker">${T.togetherLabel}</p><p class="huge">${num(together)}</p><p class="lead">${T.togetherText}</p>`,
      shape: (x) => heartPoints(x.box(0.08, 0.5), Math.round(x.N * 0.55)),
    });
  }
  memories.forEach((m, i) => {
    ch.push({
      id: `mem-${i}`,
      cls: 'ch--mem',
      body: html`${i === 0 ? html`<p class="kicker">${T.memoriesTitle}</p>` : ''}
        ${m.year ? html`<p class="year">${m.year}</p>` : ''}
        ${m.title ? html`<p class="title">${m.title}</p>` : ''}
        ${m.text ? html`<p class="small">${m.text}</p>` : ''}`,
      shape: (x) => x.image(m.photo, x.box(0.08, 0.64), 0.8),
      opts: { stagger: 1.2, swirl: 0.8 },
    });
  });
  if (wishes.length) {
    ch.push({
      id: 'wishes',
      cls: 'ch--wishes',
      body: html`<p class="kicker">${T.wishesTitle}</p>
        <p class="wish" id="wish" aria-live="polite"></p>
        <p class="hint" id="wish-hint">${T.wishesHint}</p>
        <p class="count" id="wish-count">0 / ${wishes.length}</p>
        <button type="button" class="sr-only" id="wish-next">Keyingi tilak</button>`,
      shape: () => null,
      wishes,
    });
  }
  ch.push({
    id: 'letter',
    cls: 'ch--card',
    body: html`<article class="card">
      <p class="kicker">${T.letterTitle}</p>
      <p class="letter">${T.letter}</p>
      ${c.from ? html`<p class="sign">${c.from}</p>` : ''}
    </article>`,
    shape: (x) => envelopePoints(x.box(0.06, 0.32), Math.round(x.N * 0.32)),
  });
  if (gift) {
    const card = String(gift.card || '').replace(/\D/g, '');
    ch.push({
      id: 'gift',
      cls: 'ch--card',
      body: html`<article class="card">
        <p class="kicker">${gift.title || T.giftTitle}</p>
        <p class="letter">${gift.text || T.giftText}</p>
        <button type="button" class="btn" id="gift-open">${T.giftButton}</button>
        <div class="gift-in" id="gift-in" hidden>
          ${card
            ? html`<div class="gcard"><span class="gcard__bank">${gift.bank || ''}</span><span class="gcard__num">${card.replace(/(\d{4})(?=\d)/g, '$1 ')}</span><span class="gcard__holder">${gift.holder || ''}</span></div>
              <button type="button" class="btn btn--ghost" id="copy-card" data-card="${card}">${raw(ICON.copy)}<span>Karta raqamini nusxalash</span></button>`
            : ''}
          ${gift.link ? html`<a class="btn" href="${gift.link}" target="_blank" rel="noopener">🎁 <span>${gift.linkLabel || 'Sovg‘ani olish'}</span></a>` : ''}
          ${!card && !gift.link ? html`<p class="sign">Tug‘ilgan kuning muborak! 🎂</p>` : ''}
        </div>
      </article>`,
      shape: (x) => giftPoints(x.box(0.05, 0.33), Math.round(x.N * 0.4)),
    });
  }
  if (reply) {
    ch.push({
      id: 'reply',
      cls: 'ch--card',
      body: html`<form class="card" id="rsvp-form" novalidate>
        <p class="kicker">${T.rsvpTitle}</p>
        <p class="small">${T.rsvpText}</p>
        <input type="hidden" name="name" value="${n}" />
        <input type="hidden" name="attending" value="wish" />
        <label class="sr-only" for="reply-msg">Maktubing</label>
        <textarea id="reply-msg" name="message" rows="5" maxlength="500" placeholder="Yuragingdagi gaplarni yoz…"></textarea>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <button class="btn" type="submit">💌 Yuborish</button>
        <p class="status" id="rsvp-status" role="status"></p>
      </form>
      <div class="card" id="rsvp-done" hidden></div>`,
      shape: (x) => heartPoints(x.box(0.06, 0.3), Math.round(x.N * 0.3)),
    });
  }
  ch.push({
    id: 'finale',
    cls: 'ch--finale',
    body: html`<p class="lead">${T.finaleText}</p>
      ${c.from ? html`<p class="sign">— ${c.from}</p>` : ''}
      <p class="hint">${T.finaleHint}</p>
      <div class="foot">${brandLink()}</div>`,
    // Ikki so'zli bo'lsa — ikki qatorda (kattaroq va yorqinroq)
    shape: (x) => textPoints(T.finale.trim().split(/\s+/).length === 2 ? T.finale.trim().replace(/\s+/, '\n') : T.finale, x.box(0.1, 0.56), { font: '"Great Vibes", cursive', color: [1, 0.68, 0.8], max: Math.round(x.N * 0.7), stroke: 0.025 }),
  });
  return ch;
}

function renderPage(c, d, T, chapters) {
  return html`
    <canvas class="sky" id="sky" aria-hidden="true"></canvas>
    <div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-ask">
      <div class="gate__inner">
        <p class="gate__note">${T.gateNote}</p>
        <p class="gate__ask" id="gate-ask">${T.gateAsk}</p>
        <div class="gate__btns" id="gate-btns">
          <button class="btn" type="button" id="gate-yes">${T.gateYes}</button>
          <button class="btn btn--ghost" type="button" id="gate-no">${T.gateNo}</button>
        </div>
        <div class="gate__no" id="gate-no-box" hidden>
          <p>${T.gateNoText}</p>
          <button class="btn" type="button" id="gate-anyway">${T.gateNoButton}</button>
        </div>
        <p class="gate__hint">${raw(ICON.music)} ovoz bilan oching</p>
      </div>
    </div>
    <button class="fab" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <main class="story" id="story">
      ${chapters.map((ch) => html`<section class="ch ch--${ch.id} ${ch.cls || ''}" data-ch="${ch.id}"><div class="ch__text">${ch.body}</div></section>`)}
    </main>
    <audio id="music" loop preload="none"></audio>
  `.value;
}

/* ------------------------------------ Musiqa ------------------------------------ */
function initMusic(src) {
  const audio = $('#music');
  const btn = $('#music-toggle');
  if (!src) {
    btn.remove();
    return { play() {} };
  }
  audio.src = src;
  audio.volume = 0.6;
  const sync = () => {
    const on = !audio.paused;
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Musiqani o‘chirish' : 'Musiqani yoqish');
  };
  const play = () => audio.play().catch(() => {}).finally(sync);
  scope.on(audio, 'play', sync);
  scope.on(audio, 'pause', sync);
  scope.on(btn, 'click', () => (audio.paused ? play() : audio.pause()));
  scope.on(document, 'visibilitychange', () => {
    if (document.hidden && !audio.paused) {
      audio.pause();
      audio.dataset.resume = '1';
    } else if (!document.hidden && audio.dataset.resume) {
      delete audio.dataset.resume;
      play();
    }
  });
  return { play };
}

/* ------------------------------------ Suratlar ------------------------------------ */
const imgCache = new Map();
function loadImage(name) {
  if (imgCache.has(name)) return imgCache.get(name);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = mediaUrl(name);
  });
  imgCache.set(name, p);
  return p;
}

/* ------------------------------------ Bob almashinuvi ------------------------------------ */
function initChapters(chapters, stars) {
  const sections = $$('.ch');
  const shapes = new Map();
  let current = -1;
  let token = 0;

  const ctx = {
    N: stars.count,
    box(y0, y1) {
      const { w, h } = stars.size();
      const cw = Math.min(w, 560);
      const x0 = (w - cw) / 2;
      return { x: x0 + cw * 0.05, y: h * y0, w: cw * 0.9, h: h * (y1 - y0) };
    },
    async image(name, box, part) {
      const img = await loadImage(name);
      return (img && imagePoints(img, box, { max: Math.round(stars.count * part) })) || heartPoints(box, Math.round(stars.count * 0.5));
    },
  };

  async function activate(i) {
    if (i === current) return;
    current = i;
    const my = ++token;
    sections.forEach((s, k) => s.classList.toggle('is-active', k === i));
    sections[i]?.classList.add('is-in');
    const ch = chapters[i];
    if (!shapes.has(ch.id)) shapes.set(ch.id, Promise.resolve(ch.shape(ctx)));
    const shape = await shapes.get(ch.id);
    if (my !== token) return;
    stars.setShape(shape, ch.opts);
  }

  function pick() {
    const mid = innerHeight * 0.5;
    for (let i = 0; i < sections.length; i++) {
      const r = sections[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) return i;
    }
    return sections.length - 1;
  }
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      activate(pick());
    });
  };
  scope.on(window, 'scroll', onScroll, { passive: true });
  // O'lcham o'zgarsa — shakllar qayta hisoblanadi
  let rt = 0;
  scope.on(window, 'resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      shapes.clear();
      const i = current;
      current = -1;
      activate(i < 0 ? 0 : i);
    }, 250);
  });
  return { start: () => activate(pick()), current: () => chapters[current]?.id };
}

/* ------------------------------------ Uchar yulduzlar va tilaklar ------------------------------------ */
function shootingStar() {
  if (reduced) return;
  const s = document.createElement('i');
  s.className = 'shoot';
  s.style.left = `${30 + Math.random() * 70}vw`;
  s.style.top = `${Math.random() * 35}vh`;
  s.style.setProperty('--len', `${120 + Math.random() * 120}px`);
  document.body.append(s);
  setTimeout(() => s.remove(), 1300);
}

function initWishes(chapters, nav) {
  const ch = chapters.find((x) => x.id === 'wishes');
  const sec = $('.ch--wishes');
  if (!ch || !sec) return;
  const box = $('#wish');
  const count = $('#wish-count');
  let i = 0;
  const next = () => {
    shootingStar();
    if (i >= ch.wishes.length) return;
    const w = ch.wishes[i++];
    box.classList.remove('is-in');
    scope.later(() => {
      box.textContent = w;
      box.classList.add('is-in');
      count.textContent = i === ch.wishes.length ? '✨' : `${i} / ${ch.wishes.length}`;
      if (i === ch.wishes.length) $('#wish-hint').textContent = 'Hammasi ushalsin, yulduzim ✨';
    }, reduced ? 0 : 650);
  };
  scope.on(sec, 'click', (e) => {
    if (e.target.closest('a,button:not(#wish-next)')) return;
    next();
  });
  scope.on($('#wish-next'), 'click', next);
  // Bob ochiq turganda vaqti-vaqti bilan o'zi ham yulduz uchadi
  scope.every(() => nav.current() === 'wishes' && !document.hidden && Math.random() < 0.6 && shootingStar(), 2600);
}

function initGift(stars) {
  const btn = $('#gift-open');
  if (!btn) return;
  scope.on(btn, 'click', () => {
    const r = btn.getBoundingClientRect();
    stars.explode(r.left + r.width / 2, r.top - 60, 0.8);
    btn.remove();
    const box = $('#gift-in');
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('is-in'));
  });
  const copy = $('#copy-card');
  if (copy)
    scope.on(copy, 'click', async () => {
      const label = $('span', copy);
      try {
        await navigator.clipboard.writeText(copy.dataset.card);
        label.textContent = 'Nusxalandi ✓';
      } catch {
        label.textContent = copy.dataset.card;
      }
      scope.later(() => (label.textContent = 'Karta raqamini nusxalash'), 2200);
    });
}

function initReply(d, T, preview) {
  const form = $('#rsvp-form');
  if (!form) return;
  const status = $('#rsvp-status');
  const done = $('#rsvp-done');
  scope.on(form, 'submit', async (e) => {
    e.preventDefault();
    if (preview) return (status.textContent = 'Ko‘rinish rejimi — maktub yuborilmaydi.');
    const data = Object.fromEntries(new FormData(form));
    data.message = (data.message || '').trim();
    if (data.message.length < 2) return (status.textContent = 'Avval maktubingni yoz 🙂');
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    status.textContent = 'Yuborilmoqda…';
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id, couple: d.names }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        status.textContent = 'Yuborib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘r.';
        return;
      }
      form.hidden = true;
      done.hidden = false;
      done.innerHTML = html`<p class="kicker">💌</p><p class="letter">${T.replyDone}</p><button class="link" type="button" id="reply-again">Yana yozish</button>`.value;
      shootingStar();
      $('#reply-again').addEventListener('click', () => {
        done.hidden = true;
        form.hidden = false;
        form.elements.namedItem('message').value = '';
        status.textContent = '';
      });
    } catch {
      status.textContent = 'Internet aloqasini tekshirib, qayta urinib ko‘r.';
    } finally {
      btn.disabled = false;
    }
  });
}

function initFinale(stars) {
  const sec = $('.ch--finale');
  scope.on(sec, 'click', (e) => {
    if (e.target.closest('a,button')) return;
    stars.explode(e.clientX, e.clientY, 1);
    shootingStar();
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
let stars = null;
export async function mountYulduz(c, { preview = false } = {}) {
  newScope();
  const d = deriveConfig(c);
  const f = birthFacts(c);
  const T = yulduzTexts(c, d, f);
  // Ism yulduzlardan yozilishi uchun shriftlar oldin yuklanadi (ko'pi bilan 2.5 soniya)
  try {
    await Promise.race([
      Promise.all([document.fonts.load('60px "Great Vibes"'), document.fonts.load('600 60px Cinzel'), document.fonts.load('italic 30px "Cormorant Garamond"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  const chapters = chaptersOf(c, d, T, f);
  stars?.destroy();
  $('#app').innerHTML = renderPage(c, d, T, chapters);
  document.title = d.title;
  stars = createStars($('#sky'), { reduced });
  scope.add(() => stars?.destroy());
  stars.start();
  // Suratlar oldindan yuklanib turadi
  const photos = [c.photos?.portrait, ...(c.memories || []).map((m) => m?.photo)].filter(Boolean);
  photos.forEach((p) => loadImage(p));

  const nav = initChapters(chapters, stars);
  initWishes(chapters, nav);
  initGift(stars);
  initReply(d, T, preview);
  initFinale(stars);

  const gate = $('#gate');
  if (preview) {
    gate.remove();
    $('#music-toggle')?.remove();
    document.body.classList.add('is-open');
    nav.start();
    return;
  }
  const music = initMusic(musicUrlOf(c));
  const ascroll = initAutoScroll(c, { slow: '.ch', stopAt: '#rsvp-form', theme: { bg: 'rgba(6,4,16,.6)', bgOn: 'rgba(6,4,16,.8)', ink: '#f3d9a4' } });
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  $('#gate-yes').focus({ preventScroll: true });

  const open = () => {
    window.scrollTo(0, 0);
    music.play();
    gate.classList.add('is-opening');
    document.body.classList.add('is-open');
    scope.later(
      () => {
        gate.remove();
        document.documentElement.classList.remove('is-locked');
        $('#music-toggle').hidden = false;
        nav.start();
        scope.later(() => ascroll.ready(), 2500);
      },
      reduced ? 50 : 1100,
    );
  };
  scope.on($('#gate-yes'), 'click', open, { once: true });
  scope.on($('#gate-anyway'), 'click', open, { once: true });
  scope.on($('#gate-no'), 'click', () => {
    $('#gate-btns').hidden = true;
    $('#gate-no-box').hidden = false;
    $('#gate-anyway').focus({ preventScroll: true });
  });
}
