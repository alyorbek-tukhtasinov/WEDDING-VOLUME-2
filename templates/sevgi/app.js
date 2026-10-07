// "Sevgi kundaligi" — yigitning sevgan qiziga tug'ilgan kun tabrigi (b-day loyihasining professional versiyasi).
// Har bir sahifa — kundalik varag'i: to'liq ekranli birgalikdagi surat ustida romantik matn.
// Kirish: muhrli maktub → muqova (ism, yosh, yaproqlar) → ilk uchrashuv → kulgili lahza → minnatdorlik →
// bizning yo'limiz (suratli xotiralar) → tilaklar → sovg'a qutisi → javob maktubi → "Seni sevaman".
// mountSevgi() saytda (main.js) va panelning jonli ko'rinishida (preview: true) ishlatiladi.
import '../osmon/fonts/fonts.css';
import '../volume5/fonts/fonts.css';
import './fonts/fonts.css';
import './styles.css';
import confetti from 'canvas-confetti';
import { deriveConfig, musicUrlOf, MONTHS, isValidDate, mediaUrl } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import { initAutoScroll } from '../../src/lib/autoscroll.js';
import brand from '@brand-config';
import { sevgiTexts } from './texts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const pad = (n) => String(n).padStart(2, '0');
const num = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const GOLD = ['#C9A96E', '#F8F0E3', '#E8B4B8', '#f3d9a4'];

/* ---------------------------- Qayta chizish uchun tozalash ---------------------------- */
let scope = null;
function newScope() {
  scope?.abort();
  const ac = new AbortController();
  const timers = new Set();
  const observers = new Set();
  scope = {
    on(target, type, fn, opts = {}) {
      target.addEventListener(type, fn, { ...opts, signal: ac.signal });
    },
    every(fn, ms) {
      const id = setInterval(fn, ms);
      timers.add(id);
      return id;
    },
    later(fn, ms) {
      const id = setTimeout(fn, ms);
      timers.add(id);
      return id;
    },
    observe(obs) {
      observers.add(obs);
      return obs;
    },
    abort() {
      ac.abort();
      timers.forEach((id) => {
        clearInterval(id);
        clearTimeout(id);
      });
      observers.forEach((o) => o.disconnect());
    },
  };
  return scope;
}

const ICON = {
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  chevron: '<svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden="true"><path d="M1 1L7 7L13 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

/* ------------------------------------ Konfetti ------------------------------------ */
let shoot = null;
let heart = null;
function fire(opts) {
  if (reduced) return;
  if (!shoot) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    shoot = confetti.create(canvas, { resize: true, useWorker: true });
  }
  heart ||= confetti.shapeFromPath?.({ path: 'M12 21s-7.5-4.6-10-9.3C0.3 8.3 2.3 4 6.4 4c2.3 0 3.9 1.3 5.6 3.4C13.7 5.3 15.3 4 17.6 4 21.7 4 23.7 8.3 22 11.7 19.5 16.4 12 21 12 21z' });
  shoot({ colors: GOLD, disableForReducedMotion: true, ...(heart ? { shapes: ['circle', heart, heart] } : {}), ...opts });
}
function burstAt(el, count = 120) {
  const r = el.getBoundingClientRect();
  fire({ particleCount: count, spread: 80, startVelocity: 38, ticks: 220, origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight } });
}

/* ------------------------------------ Sahifa ------------------------------------ */
function brandLink() {
  if (!brand?.enabled) return '';
  return html`<a class="brand" href="${brand.url}" target="_blank" rel="noopener">
    ${brand.logo
      ? html`<img src="${brand.logo}" alt="" width="30" height="30" loading="lazy" />`
      : raw('<svg class="brand__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" /></svg>')}
    <span>${brand.text}<b>${brand.name}</b></span>
  </a>`;
}

const divider = (glyph = '✦') => html`<div class="divider" aria-hidden="true"><i></i><span>${glyph}</span><i></i></div>`;
const hearts = () => html`<div class="hearts" aria-hidden="true"><span>♥</span><span>♥</span><span>♥</span></div>`;

/** Sahifa foni: o'z surati → birgalikdagi suratlardan biri → faqat rang. */
function photoPicker(c) {
  const pool = (c.memories || []).map((m) => m?.photo).filter(Boolean);
  let i = 0;
  return (key) => {
    const own = c.photos?.[key];
    if (own) return mediaUrl(own);
    if (!pool.length) return '';
    return mediaUrl(pool[i++ % pool.length]);
  };
}

function bg(src, alt) {
  return src
    ? html`<div class="pg__bg"><img src="${src}" alt="${alt}" loading="lazy" decoding="async" /></div><div class="pg__veil" aria-hidden="true"></div>`
    : html`<div class="pg__bg pg__bg--plain" aria-hidden="true"></div><div class="pg__veil" aria-hidden="true"></div>`;
}

function storyPage(id, src, alt, glyph, title, text, sign) {
  return html`<section class="pg pg--story" id="${id}" aria-label="${title}">
    ${bg(src, alt)}
    <div class="pg__body">
      <span class="fx glyph" style="--d:0">${glyph}</span>
      <h2 class="fx h2" style="--d:1">${title}</h2>
      <div class="fx" style="--d:2">${divider()}</div>
      <p class="fx story" style="--d:3">${text}</p>
      <div class="fx" style="--d:4">${divider()}</div>
      ${sign ? html`<p class="fx sign" style="--d:5">${sign}</p>` : ''}
      <div class="fx" style="--d:6">${hearts()}</div>
    </div>
  </section>`;
}

function renderPage(c, d, T) {
  const pick = photoPicker(c);
  const n = d.name;
  const memories = (c.memories || []).filter((m) => m && (m.photo || m.title || m.text)).slice(0, 8);
  const wishes = (c.wishes || []).map((w) => String(w).trim()).filter(Boolean);
  const gift = c.gift && (c.gift.title || c.gift.text || c.gift.card || c.gift.link) ? c.gift : null;
  const reply = c.rsvp?.enabled !== false;
  const kicker = `${d.day} ${MONTHS[d.month - 1]}`;
  const together = isValidDate(c.together) ? Math.max(0, Math.floor((Date.now() - new Date(`${c.together}T00:00:00${c.event.timezone || '+05:00'}`)) / 86400000)) : null;

  // Fon suratlari tartibda tanlanadi (bir surat ikki sahifada takrorlanmasin)
  const src = {
    cover: pick('cover'),
    first: pick('first'),
    funny: pick('funny'),
    gratitude: pick('gratitude'),
    journey: pick('journey'),
    wishes: pick('wishes'),
    gift: pick('gift'),
  };

  const pages = [];
  pages.push(html`<section class="pg pg--cover" id="pg-cover" aria-label="${n}">
    ${bg(src.cover, `${n}`)}
    <div class="petals" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => html`<i style="--i:${i}"></i>`)}</div>
    <div class="pg__body pg__body--cover">
      <p class="fx kicker" style="--d:0">♡ ${kicker} ♡</p>
      <h1 class="fx name" style="--d:1">${n}</h1>
      <p class="fx badge" style="--d:2"><span>${T.badge}</span></p>
      <div class="fx" style="--d:3">${divider()}</div>
      <p class="fx lead" style="--d:4">${T.coverText}</p>
      ${c.from ? html`<p class="fx sign sign--big" style="--d:5">${c.from}</p>` : ''}
    </div>
    <div class="cue" aria-hidden="true"><span>Pastga suring</span>${raw(ICON.chevron)}</div>
  </section>`);
  pages.push(storyPage('pg-first', src.first, `${n} bilan ilk kunlarimiz`, '✦', T.firstTitle, T.firstText, T.firstSign));
  pages.push(storyPage('pg-funny', src.funny, 'Kulgili xotiramiz', '✨', T.funnyTitle, T.funnyText, T.funnySign));
  pages.push(storyPage('pg-gratitude', src.gratitude, 'Birgalikdagi suratimiz', '🤍', T.gratitudeTitle, T.gratitudeText, T.gratitudeSign));

  if (memories.length || together != null) {
    pages.push(html`<section class="pg pg--journey" id="pg-journey" aria-labelledby="journey-title">
      ${bg(src.journey, 'Bizning yo‘limiz')}
      <div class="pg__body pg__body--wide">
        <h2 class="fx h2" id="journey-title" style="--d:0">${T.journeyTitle}</h2>
        <p class="fx label" style="--d:1">${T.journeySubtitle}</p>
        ${together != null ? html`<p class="fx together" style="--d:2"><span>${T.togetherLabel}</span><b>${num(together)}</b><span>kun ♥</span></p>` : ''}
        ${memories.length
          ? html`<ol class="timeline">
              ${memories.map(
                (m, i) => html`<li class="fx stop" style="--d:${i + 3}">
                  <i class="stop__node" aria-hidden="true"></i>
                  <div class="stop__card">
                    ${m.photo ? html`<button type="button" class="stop__photo" data-zoom="${mediaUrl(m.photo)}" aria-label="${m.title || 'Surat'} — kattalashtirish"><img src="${mediaUrl(m.photo)}" alt="" loading="lazy" /></button>` : ''}
                    <div class="stop__text">
                      <p class="stop__idx">${pad(i + 1)}${m.year ? html` · ${m.year}` : ''}</p>
                      ${m.title ? html`<p class="stop__title">${m.title}</p>` : ''}
                      ${m.text ? html`<p class="stop__desc">${m.text}</p>` : ''}
                    </div>
                  </div>
                </li>`,
              )}
            </ol>`
          : ''}
      </div>
    </section>`);
  }

  if (wishes.length) {
    pages.push(html`<section class="pg pg--wishes" id="pg-wishes" aria-labelledby="wishes-title">
      ${bg(src.wishes, 'Baxtli suratimiz')}
      <div class="pg__body">
        <span class="fx glyph" style="--d:0">♡</span>
        <h2 class="fx h2" id="wishes-title" style="--d:1">${T.wishesTitle}</h2>
        <div class="fx" style="--d:2">${divider()}</div>
        <ul class="wishes">
          ${wishes.map((w, i) => html`<li class="fx" style="--d:${i + 3}"><span class="beat" aria-hidden="true">♡</span><span>${w}</span></li>`)}
        </ul>
      </div>
    </section>`);
  }

  if (gift) {
    const card = String(gift.card || '').replace(/\D/g, '');
    pages.push(html`<section class="pg pg--gift" id="pg-gift" aria-labelledby="gift-title">
      ${bg(src.gift, 'Sovg‘a')}
      <div class="pg__body">
        <h2 class="fx h2" id="gift-title" style="--d:0">${gift.title || T.giftTitle}</h2>
        <p class="fx story" style="--d:1">${gift.text || T.giftText}</p>
        <div class="fx giftwrap" style="--d:2">
          <button type="button" class="present" id="present" aria-expanded="false" aria-controls="gift-open">
            <span class="present__lid" aria-hidden="true"></span>
            <span class="present__box" aria-hidden="true"></span>
            <span class="present__label">${T.giftButton}</span>
          </button>
          <div class="gift-open" id="gift-open" hidden>
            <p class="sign">Tug‘ilgan kuning muborak, jonim! 🎂</p>
            ${card
              ? html`<div class="gcard">
                  <span class="gcard__bank">${gift.bank || ''}</span>
                  <span class="gcard__chip" aria-hidden="true"></span>
                  <span class="gcard__num">${card.replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
                  <span class="gcard__holder">${gift.holder || ''}</span>
                </div>
                <button type="button" class="gbtn" id="copy-card" data-card="${card}">${raw(ICON.copy)}<span>Karta raqamini nusxalash</span></button>`
              : ''}
            ${gift.link ? html`<a class="gbtn" href="${gift.link}" target="_blank" rel="noopener">🎁 <span>${gift.linkLabel || 'Sovg‘ani olish'}</span></a>` : ''}
          </div>
        </div>
      </div>
    </section>`);
  }

  if (reply) {
    pages.push(html`<section class="pg pg--reply" id="pg-reply" aria-labelledby="reply-title">
      ${bg('', '')}
      <div class="pg__body">
        <span class="fx glyph" style="--d:0">💌</span>
        <h2 class="fx h2" id="reply-title" style="--d:1">${T.rsvpTitle}</h2>
        <p class="fx label label--soft" style="--d:2">${T.rsvpText}</p>
        <form class="fx letter" id="rsvp-form" style="--d:3" novalidate>
          <input type="hidden" name="name" value="${n}" />
          <input type="hidden" name="attending" value="wish" />
          <label class="sr-only" for="reply-msg">Maktubing</label>
          <textarea id="reply-msg" name="message" rows="6" maxlength="500" placeholder="Yuragingdagi gaplarni yoz…"></textarea>
          <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <button class="gbtn gbtn--solid" type="submit"><span>💌 Yuborish</span></button>
          <p class="letter__status" id="rsvp-status" role="status"></p>
        </form>
        <div class="letter letter--done" id="rsvp-done" hidden></div>
      </div>
    </section>`);
  }

  pages.push(html`<section class="pg pg--finale" id="pg-finale" aria-labelledby="finale-title">
    ${bg('', '')}
    <div class="pg__body">
      <p class="fx kicker" style="--d:0">♡ ${n} ♡</p>
      <h2 class="fx love" id="finale-title" style="--d:1">${T.finaleTitle}</h2>
      <p class="fx lead" style="--d:2">${T.finaleText}</p>
      ${c.from ? html`<p class="fx sign sign--big" style="--d:3">— ${c.from}</p>` : ''}
      <div class="fx" style="--d:4">${hearts()}</div>
      <p class="fx tap" style="--d:5">Ekranga bos — yuraklar uchadi</p>
      <div class="fx" style="--d:6">${brandLink()}</div>
    </div>
  </section>`);

  return html`
    <div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-name">
      ${src.cover ? html`<img class="gate__bg" src="${src.cover}" alt="" />` : ''}
      <div class="gate__inner">
        <p class="kicker">Senga maktub bor</p>
        <div class="seal" aria-hidden="true"><span>${d.initials}</span></div>
        <p class="gate__name" id="gate-name">${n}</p>
        <button class="gbtn gbtn--solid gate__btn" id="gate-open" type="button">💌 Maktubni ochish</button>
        <p class="gate__hint">${raw(ICON.music)} ovoz bilan oching</p>
      </div>
    </div>

    <button class="fab" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <nav class="dots" id="dots" aria-label="Sahifalar">${pages.map((_, i) => html`<button type="button" data-dot="${i}" aria-label="${i + 1}-sahifa"></button>`)}</nav>

    <main class="book" id="book">${pages}</main>

    <div class="zoom" id="zoom" hidden role="dialog" aria-modal="true" aria-label="Surat"><img alt="" /><button type="button" aria-label="Yopish">×</button></div>
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

/* ------------------------------------ Sahifalar ------------------------------------ */
function initPages(preview) {
  const pages = $$('.pg');
  const dots = $$('[data-dot]');
  const io = scope.observe(
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in', 'is-active');
            const i = pages.indexOf(e.target);
            dots.forEach((dot, k) => dot.setAttribute('aria-current', String(k === i)));
          } else e.target.classList.remove('is-active');
        }),
      { threshold: 0.55 },
    ),
  );
  pages.forEach((p) => io.observe(p));
  if (preview || reduced) pages.forEach((p) => p.classList.add('is-in'));
  dots.forEach((dot, i) => scope.on(dot, 'click', () => pages[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })));
}

function initZoom() {
  const z = $('#zoom');
  const img = $('img', z);
  const close = () => {
    z.classList.remove('is-open');
    scope.later(() => (z.hidden = true), 220);
  };
  scope.on(document, 'click', (e) => {
    const b = e.target.closest('[data-zoom]');
    if (b) {
      img.src = b.dataset.zoom;
      z.hidden = false;
      requestAnimationFrame(() => z.classList.add('is-open'));
      return;
    }
    if (!z.hidden && (e.target === z || e.target.closest('#zoom button'))) close();
  });
  scope.on(document, 'keydown', (e) => e.key === 'Escape' && !z.hidden && close());
}

function initGift() {
  const btn = $('#present');
  if (!btn) return;
  const body = $('#gift-open');
  scope.on(btn, 'click', () => {
    if (btn.classList.contains('is-open')) return;
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    burstAt(btn, 150);
    scope.later(() => fire({ particleCount: 80, spread: 120, startVelocity: 30, origin: { x: 0.5, y: 0.3 } }), 350);
    body.hidden = false;
    requestAnimationFrame(() => body.classList.add('is-in'));
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

function initReply(c, d, T, preview) {
  const form = $('#rsvp-form');
  if (!form) return;
  const status = $('#rsvp-status');
  const done = $('#rsvp-done');
  const showDone = () => {
    form.hidden = true;
    done.hidden = false;
    done.innerHTML = html`<p class="glyph">💌</p><p class="story">${T.replyDone}</p><button class="link" type="button" id="reply-again">Yana yozish</button>`.value;
    $('#reply-again').addEventListener('click', () => {
      done.hidden = true;
      form.hidden = false;
      form.elements.namedItem('message').value = '';
    });
  };
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
      status.textContent = '';
      burstAt(btn, 90);
      showDone();
    } catch {
      status.textContent = 'Internet aloqasini tekshirib, qayta urinib ko‘r.';
    } finally {
      btn.disabled = false;
    }
  });
}

function initFinale() {
  const sec = $('#pg-finale');
  let fired = false;
  const io = scope.observe(
    new IntersectionObserver((es) => {
      if (fired || !es.some((e) => e.isIntersecting)) return;
      fired = true;
      scope.later(() => fire({ particleCount: 90, spread: 100, startVelocity: 34, origin: { x: 0.5, y: 0.45 } }), 600);
    }, { threshold: 0.6 }),
  );
  io.observe(sec);
  scope.on(sec, 'click', (e) => {
    if (e.target.closest('a,button')) return;
    fire({ particleCount: 40, spread: 70, startVelocity: 26, ticks: 160, origin: { x: e.clientX / innerWidth, y: e.clientY / innerHeight } });
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountSevgi(c, { preview = false } = {}) {
  newScope();
  const d = deriveConfig(c);
  const T = sevgiTexts(c, d);
  try {
    await Promise.race([Promise.all([document.fonts.load('italic 300 40px "Cormorant Garamond"'), document.fonts.load('600 30px "Dancing Script"')]), new Promise((r) => setTimeout(r, 2000))]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  const y = window.scrollY;
  $('#app').innerHTML = renderPage(c, d, T);
  document.title = d.title;
  initPages(preview);
  initZoom();
  initGift();
  initReply(c, d, T, preview);
  initFinale();

  const gate = $('#gate');
  if (preview) {
    gate.remove();
    $('#music-toggle')?.remove();
    document.body.classList.add('is-open');
    window.scrollTo(0, y);
    return;
  }
  const music = initMusic(musicUrlOf(c));
  const ascroll = initAutoScroll(c, { slow: '.pg--story, .pg--journey, .pg--wishes', stopAt: '#rsvp-form', theme: { bg: 'rgba(10,4,8,.7)', bgOn: 'rgba(10,4,8,.85)', ink: '#C9A96E' } });
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  const btn = $('#gate-open');
  btn.focus({ preventScroll: true });
  scope.on(
    btn,
    'click',
    () => {
      window.scrollTo(0, 0);
      music.play();
      gate.classList.add('is-opening');
      document.body.classList.add('is-open');
      fire({ particleCount: 60, spread: 90, startVelocity: 28, origin: { x: 0.5, y: 0.55 } });
      scope.later(
        () => {
          gate.remove();
          document.documentElement.classList.remove('is-locked');
          $('#music-toggle').hidden = false;
          ascroll.ready();
        },
        reduced ? 50 : 1300,
      );
    },
    { once: true },
  );
}
