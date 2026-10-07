// "Tug'ilgan kun: sehrli tort" shabloni.
// Qorong'i xona → mehmon shamlarni yoqadi (musiqa shu bilan boshlanadi) → tilak tilab, tugmani bosib
// turib shamlarni puflaydi (ruxsat bo'lsa — mikrofonga puflab) → chiroqlar yonadi, konfetti va sharlar.
// So'ng: yashalgan kunlar hisoblagichi, maktub, polaroid xotiralar, yoriladigan tilak sharlari, sovg'a qutisi,
// bazm ma'lumotlari va javob (venue bo'lsa), mehmonlar tilaklari "osmoni", salyutli yakun.
// mountTort() saytda (main.js) ishlatiladi; preview: true — darhol ochiq holda (jonli ko'rinish uchun).
import './fonts/fonts.css';
import '../osmon/fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, MONTHS, isValidDate, mediaUrl } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import { parseMapInput, googleLink, yandexLink } from '../../src/lib/maps.js';
import { initAutoScroll } from '../../src/lib/autoscroll.js';
import brand from '@brand-config';
import { cakeSvg } from './cake.js';
import { tortTexts, senOf } from './texts.js';
import { cannons, burst, firework, releaseBalloons, pop, setReducedFx, setHearts, BALLOON_COLORS } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
setReducedFx(reduced);
const pad = (n) => String(n).padStart(2, '0');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// 1234567 → "1 234 567" (ingichka bo'sh joy bilan)
const num = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function hashStr(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/* ---------------------------- Qayta chizish uchun tozalash ---------------------------- */
let scope = null;
function newScope() {
  scope?.abort();
  const ac = new AbortController();
  const timers = new Set();
  const observers = new Set();
  const rafs = new Set();
  scope = {
    signal: ac.signal,
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
    raf(fn) {
      const id = requestAnimationFrame((t) => {
        rafs.delete(id);
        fn(t);
      });
      rafs.add(id);
      return id;
    },
    abort() {
      ac.abort();
      timers.forEach((id) => {
        clearInterval(id);
        clearTimeout(id);
      });
      observers.forEach((o) => o.disconnect());
      rafs.forEach((id) => cancelAnimationFrame(id));
    },
  };
  return scope;
}

/* ------------------------------------ Belgilar ------------------------------------ */
const ICON = {
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  match: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 15.5 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17.5 3.5c1.8 1.4 2.6 3 1.6 4.7-.8 1.3-2.6 1.6-3.8.6-1.3-1-1.1-2.7-.2-3.6.5.9 1.3 1.1 1.8.6.6-.6.4-1.5.6-2.3z" fill="currentColor"/></svg>',
  gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="9" width="17" height="11.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 9h19M12 9v11.5M12 9c-2-4-6-4.5-6-2 0 1.5 3 2 6 2zm0 0c2-4 6-4.5 6-2 0 1.5-3 2-6 2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
};

/* ------------------------------------ Hisob-kitob ------------------------------------ */
function venueLinks(v) {
  let google = (v?.googleMaps || '').trim();
  let yandex = (v?.yandexMaps || '').trim();
  for (const link of [google, yandex]) {
    const p = parseMapInput(link);
    if (p.lat != null) {
      google ||= googleLink(p.lat, p.lng);
      yandex ||= yandexLink(p.lat, p.lng);
      break;
    }
  }
  return { google, yandex };
}

/** Tug'ilgan sanadan hozirgacha: to'liq yil/oy/kun va jami kunlar (vaqt zonasi — bayram zonasi). */
function lifeOf(birth, tz, now = new Date()) {
  const born = new Date(`${birth}T00:00:00${tz}`);
  const ms = Math.max(0, now - born);
  const [by, bm, bd] = birth.split('-').map(Number);
  // Mahalliy sana (bayram vaqt zonasi bo'yicha)
  const off = (() => {
    const m = /^([+-])(\d{2}):(\d{2})$/.exec(tz);
    return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : 300;
  })();
  const local = new Date(now.getTime() + off * 60000);
  let y = local.getUTCFullYear() - by;
  let mo = local.getUTCMonth() + 1 - bm;
  let dd = local.getUTCDate() - bd;
  if (dd < 0) {
    mo -= 1;
    dd += new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 0)).getUTCDate();
  }
  if (mo < 0) {
    y -= 1;
    mo += 12;
  }
  // Oxirgi tug'ilgan kundan beri yilning qancha qismi o'tdi (Yer orbitasidagi joyi)
  const lastBd = new Date(`${by + y}-${pad(bm)}-${pad(bd)}T00:00:00${tz}`);
  const nextBd = new Date(`${by + y + 1}-${pad(bm)}-${pad(bd)}T00:00:00${tz}`);
  const orbit = Math.min(1, Math.max(0, (now - lastBd) / (nextBd - lastBd)));
  const toNext = Math.ceil((nextBd - now) / 86400000);
  return { ms, y, mo, dd, days: ms / 86400000, orbit, toNext, born };
}

/* ------------------------------------ Bo'laklar ------------------------------------ */
function brandLink() {
  if (!brand?.enabled) return '';
  return html`<a class="brand" href="${brand.url}" target="_blank" rel="noopener">
    ${brand.logo
      ? html`<img src="${brand.logo}" alt="" width="30" height="30" loading="lazy" />`
      : raw('<svg class="brand__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" /></svg>')}
    <span>${brand.text}<b>${brand.name}</b></span>
  </a>`;
}

const head = (eyebrow, title, extra = '') => html`<header class="head"><p class="eyebrow">${eyebrow}</p><h2 class="title">${title}</h2>${extra}</header>`;

/** Ism — folga shar harflari (har biri o'z ipida tebranadi). */
function foilName(name) {
  const chars = [...name];
  return html`<h1 class="foil-name" style="--n:${Math.max(4, chars.length)}" aria-label="${name}">
    ${chars.map((ch, i) =>
      ch === ' '
        ? html`<span class="foil-name__gap" aria-hidden="true"></span>`
        : html`<span class="foil" aria-hidden="true" style="--i:${i};--r:${((hashStr(name + i) % 13) - 6) / 2}deg"><b>${ch}</b></span>`,
    )}
  </h1>`;
}

function bunting() {
  const flags = 13;
  const cols = BALLOON_COLORS;
  let path = 'M0 8 Q50 46 100 8';
  let tris = '';
  for (let i = 0; i < flags; i++) {
    const t = (i + 0.5) / flags;
    const x = t * 100;
    // Kvadratik egri chiziq ustidagi nuqta
    const y = (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * 46 + t * t * 8;
    tris += `<path d="M${(x - 3.2).toFixed(2)} ${(y - 0.6).toFixed(2)} L${(x + 3.2).toFixed(2)} ${(y - 0.6).toFixed(2)} L${x.toFixed(2)} ${(y + 9).toFixed(2)}Z" fill="${cols[i % cols.length]}"/><circle cx="${x.toFixed(2)}" cy="${(y + 2.6).toFixed(2)}" r=".9" fill="#fff" opacity=".7"/>`;
  }
  return raw(`<svg class="bunting" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" fill="none" stroke="#f3c969" stroke-width=".5"/>${tris}</svg>`);
}

function renderPage(c, d, T) {
  const memories = (c.memories || []).filter((m) => m && (m.photo || m.title || m.text));
  const wishes = (c.wishes || []).map((w) => String(w).trim()).filter(Boolean);
  const gift = c.gift && (c.gift.title || c.gift.text || c.gift.card || c.gift.link) ? c.gift : null;
  const v = c.venue || {};
  const links = venueLinks(v);
  const life = isValidDate(c.person?.birthDate);
  const together = !d.party && isValidDate(c.together);
  const weekday = cap(d.weekdayName);
  const dateLine = `${d.day}-${MONTHS[d.month - 1]}, ${d.year}`;
  const photo = (k) => (c.photos?.[k] ? mediaUrl(c.photos[k]) : '');
  const { svg } = cakeSvg({ age: d.age, seed: hashStr(d.name) });
  const rsvp = !!c.rsvp?.enabled;
  const showWishes = c.rsvp?.showWishes !== false;
  const sen = senOf(c);

  return html`
    <div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div class="gate__glow" aria-hidden="true"></div>
      <div class="gate__inner">
        <p class="eyebrow">${T.gateEyebrow}</p>
        <p class="gate__title" id="gate-title">${T.gateTitle}</p>
        <p class="gate__text">${T.gateText}</p>
        <button class="btn btn--gold gate__btn" id="gate-open" type="button">${raw(ICON.match)}<span>${T.gateButton}</span></button>
        <p class="gate__hint">${raw(ICON.music)} ovoz bilan oching</p>
      </div>
    </div>

    <div class="room" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>${d.party ? '' : raw('<b>❤</b><b>❤</b><b>❤</b><b>❤</b><b>❤</b><b>❤</b><b>❤</b><b>❤</b>')}</div>
    <button class="fab" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>

    <main class="page" id="page">
      <section class="hero" id="hero">
        ${bunting()}
        <div class="hero__top">
          <p class="eyebrow hero__eyebrow">${T.heroEyebrow}</p>
          ${foilName(d.name)}
          <p class="hero__caption"><span class="hero__wish">${T.blowHint}</span><span class="hero__done">${T.heroCaption}</span></p>
          ${d.age ? html`<p class="age-pill"><b>${d.age}</b> yosh</p>` : ''}
        </div>
        <div class="hero__cake" id="cake">${raw(svg)}<div class="hero__dark" aria-hidden="true"></div></div>
        <div class="blow" id="blow">
          <button class="blow__btn" id="blow-btn" type="button" aria-describedby="blow-hint">
            <svg class="blow__ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" /><circle class="blow__bar" cx="50" cy="50" r="46" pathLength="100" /></svg>
            <span class="blow__icon" aria-hidden="true">💨</span>
          </button>
          <p class="blow__hint" id="blow-hint">${T.blowButton}</p>
          <button class="blow__mic" id="blow-mic" type="button" hidden>${raw(ICON.mic)} mikrofonga puflash</button>
        </div>
        <p class="hero__blown" id="blown" aria-live="polite"></p>
        <p class="hero__date">${weekday} · ${dateLine}</p>
        <a class="scroll-cue" href="#after" aria-label="Pastga">
          <span></span>
        </a>
      </section>

      <div id="after"></div>

      ${life
        ? html`
      <section class="section life reveal" aria-labelledby="life-title">
        <header class="head">
          <p class="eyebrow">${T.statsEyebrow}</p>
          <h2 class="title" id="life-title">${d.party ? `${d.name} bu dunyoni` : sen ? 'Sen bu dunyoni' : 'Siz bu dunyoni'} <span class="script">${d.party ? 'yoritib kelayotganiga' : sen ? 'yoritib kelayotganingga' : 'yoritib kelayotganingizga'}</span></h2>
        </header>
        <div class="life__big"><b id="life-days">0</b><span>kun bo‘ldi</span></div>
        <p class="life__ymd" id="life-ymd"></p>
        <div class="life__grid">
          <div class="tile"><b id="life-hours">0</b><span>soat</span></div>
          <div class="tile"><b id="life-mins">0</b><span>daqiqa</span></div>
          <div class="tile tile--beat"><b id="life-beats">0</b><span>yurak urishi <i aria-hidden="true">♥</i></span></div>
          <div class="tile"><b id="life-breaths">0</b><span>nafas</span></div>
        </div>
        ${together
          ? html`<div class="together">
              <span class="together__heart" aria-hidden="true">❤</span>
              <p class="together__label">${T.togetherLabel}</p>
              <p class="together__num"><b id="together-days">0</b></p>
              <p class="together__text">${T.togetherText}</p>
            </div>`
          : ''}
        <div class="orbit">
          <div class="orbit__sky" aria-hidden="true">
            <div class="orbit__sun"></div>
            <div class="orbit__ring"></div>
            <div class="orbit__arm" id="orbit-arm"><i class="orbit__earth"></i></div>
          </div>
          <p class="orbit__text" id="orbit-text"></p>
        </div>
      </section>`
        : ''}

      <section class="section letter reveal" aria-labelledby="letter-title">
        <div class="envelope" id="envelope">
          <div class="envelope__back"></div>
          <div class="envelope__card card-paper">
            ${photo('letter') ? html`<figure class="envelope__photo"><img src="${photo('letter')}" alt="${d.name}" loading="lazy" /></figure>` : ''}
            <p class="eyebrow">${T.letterEyebrow}</p>
            <h2 class="paper__title" id="letter-title">${T.letterTitle}</h2>
            <p class="paper__text">${T.letter}</p>
            ${c.from ? html`<p class="paper__sign">${c.from}</p>` : ''}
          </div>
          <div class="envelope__front"></div>
          <div class="envelope__flap"></div>
          <div class="envelope__seal" aria-hidden="true">${d.party ? d.initials : '❤'}</div>
        </div>
      </section>

      ${memories.length
        ? html`
      <section class="section memories reveal" aria-labelledby="mem-title">
        ${head(T.memoriesEyebrow, T.memoriesTitle)}
        <p class="hint">${T.memoriesHint}</p>
        <div class="line" id="line">
          <svg class="line__rope" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 2 Q50 9 100 2" /></svg>
          <ul class="line__track" id="line-track">
            ${memories.map(
              (m, i) => html`<li class="polaroid" style="--tilt:${((hashStr(String(i) + (m.title || '')) % 9) - 4) * 1.4}deg;--i:${i}">
                <i class="polaroid__peg" aria-hidden="true"></i>
                <button type="button" class="polaroid__btn" data-mem="${i}" aria-label="${m.title || `Surat ${i + 1}`}">
                  <span class="polaroid__img">${m.photo ? html`<img src="${mediaUrl(m.photo)}" alt="" loading="lazy" decoding="async" />` : html`<span class="polaroid__emoji">🎈</span>`}</span>
                  <span class="polaroid__cap">${m.year ? html`<b>${m.year}</b>` : ''}${m.title || ''}</span>
                </button>
              </li>`,
            )}
          </ul>
        </div>
      </section>`
        : ''}

      ${wishes.length
        ? html`
      <section class="section wishes reveal" aria-labelledby="wishes-title">
        ${head(T.wishesEyebrow, T.wishesTitle)}
        <p class="hint">${T.wishesHint}</p>
        <ul class="bunch" id="bunch">
          ${wishes.map(
            (w, i) => html`<li class="bunch__item" style="--c:${BALLOON_COLORS[i % BALLOON_COLORS.length]};--i:${i}">
              <button type="button" class="balloon" data-wish="${i}" aria-label="${i + 1}-tilakni ochish"><span class="balloon__shine"></span><span class="balloon__knot"></span></button>
              <span class="balloon__string" aria-hidden="true"></span>
              <p class="wish-card" hidden>${w}</p>
            </li>`,
          )}
        </ul>
        <p class="bunch__count" id="bunch-count" aria-live="polite">0 / ${wishes.length}</p>
      </section>`
        : ''}

      ${gift
        ? html`
      <section class="section gift reveal" aria-labelledby="gift-title">
        ${head(T.giftEyebrow, T.giftTitle)}
        <button type="button" class="giftbox" id="giftbox" aria-expanded="false" aria-controls="gift-body">
          <span class="giftbox__rays" aria-hidden="true"></span>
          <span class="giftbox__lid" aria-hidden="true"><i class="giftbox__bow"></i></span>
          <span class="giftbox__base" aria-hidden="true"></span>
          <span class="sr-only">${T.giftHint}</span>
        </button>
        <p class="hint gift__hint">${T.giftHint} 🎁</p>
        <div class="gift__body card-glass" id="gift-body" hidden>
          ${photo('gift') ? html`<img class="gift__photo" src="${photo('gift')}" alt="" loading="lazy" />` : ''}
          ${gift.title ? html`<h3 class="gift__title">${gift.title}</h3>` : ''}
          ${gift.text ? html`<p class="gift__text">${gift.text}</p>` : ''}
          ${gift.card
            ? html`<div class="bankcard">
                <span class="bankcard__chip" aria-hidden="true"></span>
                <span class="bankcard__bank">${gift.bank || ''}</span>
                <span class="bankcard__num">${String(gift.card).replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
                <span class="bankcard__holder">${gift.holder || ''}</span>
              </div>
              <button type="button" class="btn btn--ghost" id="copy-card" data-card="${String(gift.card).replace(/\D/g, '')}">${raw(ICON.copy)}<span>Karta raqamini nusxalash</span></button>`
            : ''}
          ${gift.link ? html`<a class="btn btn--gold" href="${gift.link}" target="_blank" rel="noopener">${raw(ICON.gift)}<span>${gift.linkLabel || 'Sovg‘ani olish'}</span></a>` : ''}
        </div>
      </section>`
        : ''}

      ${d.party
        ? html`
      <section class="section party reveal" aria-labelledby="party-title">
        ${head(T.partyEyebrow, T.partyTitle)}
        <article class="ticket">
          <div class="ticket__main">
            <p class="ticket__label">${raw(ICON.calendar)} ${weekday}</p>
            <p class="ticket__date"><b>${d.day}</b><span>${MONTHS[d.month - 1]}<br />${d.year}</span></p>
            ${c.event.time ? html`<p class="ticket__time">${raw(ICON.clock)} soat <b>${c.event.time}</b></p>` : ''}
          </div>
          <div class="ticket__stub">
            <p class="ticket__label">${raw(ICON.pin)} Manzil</p>
            <p class="ticket__venue">${v.name}</p>
            ${v.address ? html`<p class="ticket__addr">${v.address}</p>` : ''}
          </div>
        </article>
        ${links.google || links.yandex
          ? html`<div class="row">
              ${links.google ? html`<a class="btn btn--ghost" href="${links.google}" target="_blank" rel="noopener">${raw(ICON.pin)}<span>Google xarita</span></a>` : ''}
              ${links.yandex ? html`<a class="btn btn--ghost" href="${links.yandex}" target="_blank" rel="noopener">${raw(ICON.pin)}<span>Yandex xarita</span></a>` : ''}
            </div>`
          : ''}
        <div class="countdown" id="countdown" aria-label="${T.countdownTitle}">
          <p class="countdown__title">${T.countdownTitle}</p>
          <div class="countdown__grid">
            <div><b data-cd="d">0</b><span>kun</span></div>
            <div><b data-cd="h">00</b><span>soat</span></div>
            <div><b data-cd="m">00</b><span>daqiqa</span></div>
            <div><b data-cd="s">00</b><span>soniya</span></div>
          </div>
        </div>
        ${c.event.time ? html`<button type="button" class="btn btn--ghost" id="add-cal">${raw(ICON.calendar)}<span>Taqvimga qo‘shish</span></button>` : ''}
      </section>`
        : ''}

      ${rsvp
        ? html`
      <section class="section rsvp reveal" aria-labelledby="rsvp-title">
        ${head(T.rsvpEyebrow, T.rsvpTitle)}
        <p class="hint">${T.rsvpText}</p>
        <form class="form card-glass" id="rsvp-form" novalidate>
          ${d.party
            ? html`<label class="field"><span>Ismingiz</span><input name="name" autocomplete="name" maxlength="80" required placeholder="Ism va familiya" /></label>`
            : html`<input type="hidden" name="name" value="${d.name}" />`}
          ${d.party
            ? html`<fieldset class="choice">
                <legend class="sr-only">Kela olasizmi?</legend>
                <label><input type="radio" name="attending" value="yes" /><span>🎉 Albatta kelaman</span></label>
                <label><input type="radio" name="attending" value="no" /><span>😔 Afsuski, kela olmayman</span></label>
              </fieldset>
              <label class="field" id="guests-field" hidden><span>Necha kishi bo‘lasiz?</span>
                <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1}</option>`)}</select>
              </label>`
            : html`<input type="hidden" name="attending" value="wish" />`}
          <label class="field"><span>${d.party ? 'Tilagingiz (ixtiyoriy)' : 'Maktubing'}</span><textarea name="message" rows="${d.party ? 3 : 5}" maxlength="500" placeholder="${d.party ? `${d.name}ga iliq so‘zlar…` : sen ? 'Yuragingdagi gaplarni yoz…' : 'Yuragingizdagi gaplarni yozing…'}"></textarea></label>
          <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <button class="btn btn--gold btn--wide" type="submit"><span>${d.party ? 'Javob yuborish' : T.replyButton}</span></button>
          <p class="form__status" id="rsvp-status" role="status"></p>
        </form>
        <div class="done card-glass" id="rsvp-done" hidden></div>
      </section>`
        : ''}

      ${rsvp && showWishes && d.party
        ? html`
      <section class="section sky reveal" id="sky-section" hidden aria-labelledby="sky-title">
        ${head(T.skyEyebrow, T.skyTitle, html`<p class="hint">${T.skyHint} · <b id="sky-count">0</b> ta tilak</p>`)}
        <div class="sky__field" id="sky"></div>
        <div class="tip" id="tip" role="tooltip" hidden></div>
      </section>`
        : ''}

      <section class="section finale" id="finale">
        <div class="finale__inner">
          <p class="finale__cake" aria-hidden="true">🎂</p>
          <h2 class="finale__title">${T.finaleTitle}</h2>
          ${T.finaleText ? html`<p class="finale__text">${T.finaleText}</p>` : ''}
          ${c.from ? html`<p class="finale__sign">${c.from}</p>` : ''}
          <p class="hint">${T.finaleHint}</p>
        </div>
        <footer class="foot">${brandLink()}</footer>
      </section>
    </main>

    <div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Surat">
      <button type="button" class="lightbox__close" id="lb-close" aria-label="Yopish">×</button>
      <button type="button" class="lightbox__nav lightbox__nav--prev" id="lb-prev" aria-label="Oldingi">‹</button>
      <figure class="lightbox__fig"><img id="lb-img" alt="" /><figcaption id="lb-cap"></figcaption></figure>
      <button type="button" class="lightbox__nav lightbox__nav--next" id="lb-next" aria-label="Keyingi">›</button>
    </div>

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

/* ------------------------------------ Shamlar ------------------------------------ */
function initCandles({ onBlown }) {
  const cake = $('#cake');
  const svg = $('svg.cake', cake);
  const flames = $$('.cake__flame', svg);
  const btn = $('#blow-btn');
  const bar = $('.blow__bar', btn);
  const n = flames.length;
  let lit = 0;
  let out = 0;
  let blow = 0; // 0..1 — puflash kuchi (bosib turilgan vaqt)
  let holding = false;
  let micLevel = 0;
  let done = false;
  let last = 0;
  let running = false;

  function light(i) {
    flames[i]?.classList.add('is-lit');
    lit = Math.max(lit, i + 1);
  }
  function lightAll(stagger = 420) {
    return new Promise((resolve) => {
      if (stagger === 0) {
        flames.forEach((_, i) => light(i));
        cake.classList.add('is-lit');
        return resolve();
      }
      flames.forEach((_, i) =>
        scope.later(() => {
          light(i);
          if (i === n - 1) {
            cake.classList.add('is-lit');
            scope.later(resolve, 500);
          }
        }, 300 + i * stagger),
      );
    });
  }

  function extinguish(f) {
    if (!f.classList.contains('is-lit') || f.classList.contains('is-out')) return;
    f.classList.add('is-out');
    out++;
    if (navigator.vibrate) navigator.vibrate(12);
    if (out >= n) finish();
  }

  function finish() {
    if (done) return;
    done = true;
    holding = false;
    svg.style.setProperty('--blow', '0');
    cake.classList.add('is-out');
    btn.disabled = true;
    stopMic();
    onBlown();
  }

  function tick(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    const force = Math.max(holding ? 1 : 0, micLevel);
    blow = force > 0 ? Math.min(1, blow + dt * (0.55 + force * 0.25)) : Math.max(0, blow - dt * 0.9);
    svg.style.setProperty('--blow', (Math.min(1, blow * 1.3) * (force > 0 ? 1 : 0.6)).toFixed(3));
    bar.style.strokeDashoffset = String(100 - blow * 100);
    // Kuch oshgani sari olovlar birin-ketin o'chadi
    const target = Math.floor(blow * (n + 0.6));
    const alive = flames.filter((f) => !f.classList.contains('is-out'));
    if (n - alive.length < target && alive.length) extinguish(alive[Math.floor(alive.length / 2)]);
    if (!done && (blow > 0 || force > 0)) scope.raf(tick);
    else running = false;
  }
  function kick() {
    if (running || done) return;
    running = true;
    last = performance.now();
    scope.raf(tick);
  }

  const start = (e) => {
    if (done || lit < n) return;
    e?.preventDefault?.();
    if (reduced) {
      flames.forEach(extinguish);
      return;
    }
    holding = true;
    btn.classList.add('is-holding');
    kick();
  };
  const stop = () => {
    holding = false;
    btn.classList.remove('is-holding');
  };
  scope.on(btn, 'pointerdown', start);
  scope.on(window, 'pointerup', stop);
  scope.on(window, 'pointercancel', stop);
  scope.on(btn, 'contextmenu', (e) => e.preventDefault());
  scope.on(btn, 'keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e);
  });
  scope.on(btn, 'keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') stop();
  });
  // Olovning o'ziga bosilsa — o'sha sham o'chadi
  scope.on(svg, 'click', (e) => {
    const f = e.target.closest('.cake__flame');
    if (f && lit >= n) extinguish(f);
  });

  // Mikrofon (brauzer va sayt ruxsat bergan bo'lsa): puflash ovozi kuchi → olovlar egiladi
  const mic = $('#blow-mic');
  let stream = null;
  let actx = null;
  const policy = document.permissionsPolicy || document.featurePolicy;
  const micAllowed = !!navigator.mediaDevices?.getUserMedia && (!policy?.allowsFeature || policy.allowsFeature('microphone'));
  if (micAllowed && !reduced) mic.hidden = false;
  function stopMic() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    actx?.close().catch(() => {});
    actx = null;
    micLevel = 0;
  }
  scope.on(mic, 'click', async () => {
    if (stream || done) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    } catch {
      mic.textContent = 'Mikrofon ruxsat berilmadi — tugmani bosib turing';
      mic.disabled = true;
      return;
    }
    mic.classList.add('is-on');
    mic.innerHTML = `${ICON.mic} tinglayapman… puflang!`;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const an = actx.createAnalyser();
    an.fftSize = 512;
    actx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const listen = () => {
      if (!stream) return;
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const b of buf) sum += (b - 128) * (b - 128);
      const rms = Math.sqrt(sum / buf.length) / 128;
      micLevel = rms > 0.12 ? Math.min(1, (rms - 0.12) * 4) : 0;
      if (micLevel > 0) kick();
      scope.raf(listen);
    };
    listen();
  });
  scope.on(document, 'visibilitychange', () => document.hidden && stopMic());

  return { lightAll, blowAll: () => flames.forEach(extinguish), isDone: () => done };
}

/* ------------------------------------ Hayot hisoblagichi ------------------------------------ */
function initLife(c, d) {
  const days = $('#life-days');
  if (!days) return;
  const tz = c.event.timezone || '+05:00';
  const birth = c.person.birthDate;
  const sen = senOf(c);
  const set = (id, v) => {
    const el = $(id);
    if (el && el.textContent !== v) el.textContent = v;
  };
  let shown = false;
  let startAt = 0;
  const render = () => {
    const L = lifeOf(birth, tz);
    // Ko'ringanda raqamlar 0 dan "yugurib" chiqadi
    const k = reduced || !shown ? (shown ? 1 : 0) : Math.min(1, (performance.now() - startAt) / 1800);
    const e = 1 - Math.pow(1 - k, 3);
    const secs = L.ms / 1000;
    set('#life-days', num(L.days * e));
    set('#life-hours', num((secs / 3600) * e));
    set('#life-mins', num((secs / 60) * e));
    set('#life-beats', num(secs * (80 / 60) * e));
    set('#life-breaths', num(secs * (16 / 60) * e));
    set('#life-ymd', [L.y && `${L.y} yil`, L.mo && `${L.mo} oy`, L.dd && `${L.dd} kun`].filter(Boolean).join(' · '));
    if (isValidDate(c.together)) set('#together-days', num((Math.max(0, Date.now() - new Date(`${c.together}T00:00:00${tz}`)) / 86400000) * e));
    const arm = $('#orbit-arm');
    if (arm) arm.style.transform = `rotate(${(L.orbit * 360).toFixed(1)}deg)`;
    set(
      '#orbit-text',
      `${d.party ? d.name : sen ? 'Sen' : 'Siz'} bilan birga Yer Quyosh atrofida ${L.y} marta to‘liq aylanib chiqdi. ${
        L.toNext >= 365 || L.toNext === 0 ? 'Bugun yangi aylana boshlandi! 🌍' : `Keyingi tug‘ilgan kungacha — ${L.toNext} kun.`
      }`,
    );
  };
  render();
  const io = scope.observe(
    new IntersectionObserver(
      (es) => {
        if (es.some((x) => x.isIntersecting) && !shown) {
          shown = true;
          startAt = performance.now();
          const loop = () => {
            render();
            if (performance.now() - startAt < 1900) scope.raf(loop);
          };
          loop();
        }
      },
      { threshold: 0.3 },
    ),
  );
  io.observe($('.life'));
  scope.every(() => shown && !document.hidden && render(), 1000);
}

/* ------------------------------------ Paydo bo'lish ------------------------------------ */
function initReveal(preview) {
  const els = $$('.reveal');
  if (preview || reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    $('#envelope')?.classList.add('is-open');
    return;
  }
  const io = scope.observe(
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
          if (e.target.classList.contains('letter')) scope.later(() => $('#envelope')?.classList.add('is-open'), 450);
        }),
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    ),
  );
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------ Xotiralar ------------------------------------ */
function initMemories(c) {
  const track = $('#line-track');
  if (!track) return;
  const items = (c.memories || []).filter((m) => m && (m.photo || m.title || m.text));
  const lb = $('#lightbox');
  const img = $('#lb-img');
  const capEl = $('#lb-cap');
  let cur = 0;
  let lastFocus = null;
  const show = (i) => {
    cur = (i + items.length) % items.length;
    const m = items[cur];
    img.src = m.photo ? mediaUrl(m.photo) : '';
    img.alt = m.title || '';
    img.hidden = !m.photo;
    capEl.innerHTML = html`${m.year ? html`<b>${m.year}</b>` : ''}${m.title ? html`<strong>${m.title}</strong>` : ''}${m.text ? html`<span>${m.text}</span>` : ''}`.value;
  };
  const open = (i) => {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('is-open'));
    document.documentElement.classList.add('is-locked');
    $('#lb-close').focus();
  };
  const close = () => {
    lb.classList.remove('is-open');
    document.documentElement.classList.remove('is-locked');
    scope.later(() => (lb.hidden = true), 250);
    lastFocus?.focus?.({ preventScroll: true });
  };
  scope.on(track, 'click', (e) => {
    const b = e.target.closest('[data-mem]');
    if (b) open(Number(b.dataset.mem));
  });
  scope.on($('#lb-close'), 'click', close);
  scope.on($('#lb-prev'), 'click', () => show(cur - 1));
  scope.on($('#lb-next'), 'click', () => show(cur + 1));
  scope.on(lb, 'click', (e) => e.target === lb && close());
  scope.on(document, 'keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  // Barmoq bilan surish
  let sx = null;
  scope.on(lb, 'touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  scope.on(lb, 'touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 45) show(cur + (dx < 0 ? 1 : -1));
    sx = null;
  });
  if (items.length < 2) $$('.lightbox__nav').forEach((b) => (b.hidden = true));

  // Polaroidlar ekranga chiqqanda "chiqib keladi" (xira → rangli)
  const io = scope.observe(
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-dev');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.5, root: null },
    ),
  );
  $$('.polaroid', track).forEach((p) => io.observe(p));
}

/* ------------------------------------ Tilak sharlari ------------------------------------ */
function initWishBalloons() {
  const bunch = $('#bunch');
  if (!bunch) return;
  const total = $$('.balloon', bunch).length;
  let opened = 0;
  scope.on(bunch, 'click', (e) => {
    const b = e.target.closest('.balloon');
    if (!b || b.classList.contains('is-popped')) return;
    const li = b.closest('.bunch__item');
    pop(b, getComputedStyle(li).getPropertyValue('--c').trim() || '#ff7aa8');
    b.classList.add('is-popped');
    b.setAttribute('aria-expanded', 'true');
    const card = $('.wish-card', li);
    card.hidden = false;
    requestAnimationFrame(() => li.classList.add('is-open'));
    opened++;
    $('#bunch-count').textContent = `${opened} / ${total}`;
    if (navigator.vibrate) navigator.vibrate(20);
    if (opened === total) {
      $('#bunch-count').textContent = 'Hammasi ochildi — barchasi ushalsin! ✨';
      const r = bunch.getBoundingClientRect();
      scope.later(() => burst(r.left + r.width / 2, r.top + r.height / 3, 110), 300);
    }
  });
}

/* ------------------------------------ Sovg'a ------------------------------------ */
function initGift() {
  const box = $('#giftbox');
  if (!box) return;
  const body = $('#gift-body');
  scope.on(box, 'click', () => {
    if (box.classList.contains('is-open')) return;
    box.classList.add('is-shaking');
    scope.later(
      () => {
        box.classList.remove('is-shaking');
        box.classList.add('is-open');
        box.setAttribute('aria-expanded', 'true');
        const r = box.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height * 0.3, 120, { spread: 100, startVelocity: 40 });
        body.hidden = false;
        requestAnimationFrame(() => body.classList.add('is-in'));
        $('.gift__hint')?.remove();
      },
      reduced ? 0 : 750,
    );
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

/* ------------------------------------ Sanoq va taqvim ------------------------------------ */
function initCountdown(d) {
  const box = $('#countdown');
  if (!box) return;
  const cells = Object.fromEntries($$('[data-cd]', box).map((el) => [el.dataset.cd, el]));
  const tickCd = () => {
    const ms = d.start.getTime() - Date.now();
    if (ms <= 0) {
      const today = Date.now() < d.end.getTime();
      box.innerHTML = html`<p class="countdown__title">${today ? 'Bazm boshlandi! 🎉' : 'Bazm bo‘lib o‘tdi. Kelganingiz uchun rahmat! 💛'}</p>`.value;
      return false;
    }
    const s = Math.floor(ms / 1000);
    const vals = { d: String(Math.floor(s / 86400)), h: pad(Math.floor((s % 86400) / 3600)), m: pad(Math.floor((s % 3600) / 60)), s: pad(s % 60) };
    for (const [k, v] of Object.entries(vals)) if (cells[k].textContent !== v) cells[k].textContent = v;
    return true;
  };
  if (tickCd()) scope.every(tickCd, 1000);
}

function initCalendar(c, d) {
  const btn = $('#add-cal');
  if (!btn) return;
  scope.on(btn, 'click', () => {
    const fmt = (dt) => dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const esc = (s) => s.replace(/[\\;,]/g, (ch) => `\\${ch}`).replace(/\n/g, '\\n');
    const where = [c.venue?.name, c.venue?.address].filter(Boolean).join(', ');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Taklifnoma//Tugilgan kun//UZ',
      'BEGIN:VEVENT',
      `UID:${d.start.getTime()}-${hashStr(d.name)}@taklifnoma`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(d.start)}`,
      `DTEND:${fmt(d.end)}`,
      `SUMMARY:${esc(`${d.name} — tug‘ilgan kun bazmi`)}`,
      `LOCATION:${esc(where)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'tugilgan-kun.ics' });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

/* ------------------------------------ Javob va tilaklar osmoni ------------------------------------ */
function initRsvp(c, d, preview, T) {
  const form = $('#rsvp-form');
  if (!form) return;
  const status = $('#rsvp-status');
  const doneBox = $('#rsvp-done');
  const guestsField = $('#guests-field');
  const storageKey = `rsvp:bday:${d.name}:${c.event.originalDate || c.event.date}`;
  const store = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || 'null');
      } catch {
        return null;
      }
    },
    set(v) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(v));
      } catch {
        /* localStorage mavjud emas */
      }
    },
  };
  let saved = preview ? null : store.get();
  const guestId = saved?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
  const thanks = (a, name) =>
    a === 'yes' ? `Rahmat, ${name}! 🥳 Sizni bazmda intizorlik bilan kutamiz.` : a === 'wish' ? T.replyDone : `Rahmat, ${name}! 💛 Xabar berganingiz uchun minnatdormiz.`;
  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<p class="done__icon">${d.party ? '🎈' : '💌'}</p><p>${text}</p>${withChange ? html`<button class="link" type="button" id="rsvp-change">${d.party ? 'Javobni o‘zgartirish' : 'Yana yozish'}</button>` : ''}`.value;
    $('#rsvp-change')?.addEventListener('click', () => {
      doneBox.hidden = true;
      form.hidden = false;
      if (saved) {
        form.elements.namedItem('name').value = saved.name || '';
        for (const r of form.querySelectorAll('[name="attending"][type="radio"]')) r.checked = r.value === saved.attending;
        if (form.elements.namedItem('guests')) form.elements.namedItem('guests').value = saved.guests || '1';
        form.elements.namedItem('message').value = d.party ? saved.message || '' : '';
        sync();
      }
    });
  };
  const now = Date.now();
  if (d.party && ((d.rsvpClosesAt && now > d.rsvpClosesAt.getTime()) || now >= d.start.getTime())) showDone('Javoblar qabul qilish muddati tugagan. Tilaklaringiz uchun rahmat! 💛', false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));

  function sync() {
    if (guestsField) guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
  }
  scope.on(form, 'change', sync);
  sync();
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  // Tilaklar osmoni: har bir tilak — osmonda suzib yurgan shar
  const skySec = $('#sky-section');
  const sky = $('#sky');
  const tip = $('#tip');
  const known = new Set();
  function addBalloon(w, { fresh = false } = {}) {
    if (!sky) return;
    const key = `${w.name}|${w.message}`;
    if (known.has(key)) return;
    known.add(key);
    skySec.hidden = false;
    const h = hashStr(key);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'skyb' + (fresh ? ' is-fresh' : '');
    b.style.cssText = `--c:${BALLOON_COLORS[h % BALLOON_COLORS.length]};--x:${6 + (h % 83)}%;--y:${8 + ((h >>> 8) % 62)}%;--s:${(0.8 + ((h >>> 16) % 40) / 100).toFixed(2)};--d:${((h >>> 4) % 50) / 10}s`;
    b.setAttribute('aria-label', `${w.name} tilagi`);
    b.dataset.name = w.name;
    b.dataset.msg = w.message;
    b.innerHTML = `<span>${[...(w.name || '?')][0].toUpperCase().replace(/[<>&"]/g, '')}</span>`;
    sky.append(b);
    $('#sky-count').textContent = String(known.size);
  }
  scope.on(document, 'click', (e) => {
    if (!tip) return;
    const b = e.target.closest('.skyb');
    if (!b) {
      if (!e.target.closest('.tip')) tip.hidden = true;
      return;
    }
    tip.innerHTML = html`<b>${b.dataset.name}</b><p>${b.dataset.msg}</p>`.value;
    tip.hidden = false;
    const r = b.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    const x = Math.min(Math.max(12, r.left + r.width / 2 - tr.width / 2), innerWidth - tr.width - 12);
    const y = r.top - tr.height - 10 < 10 ? r.bottom + 10 : r.top - tr.height - 10;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  });
  scope.on(window, 'scroll', () => tip && (tip.hidden = true), { passive: true });

  async function loadWishes() {
    if (!sky) return;
    if (preview) {
      [
        { name: 'Dilnoza opa', message: 'Baxtli, sog‘lom va doimo kulib yuring!' },
        { name: 'Jasur', message: 'Orzularingizning hammasi ushalsin! 🎉' },
        { name: 'Buvijon', message: 'Umringiz uzoq, yo‘lingiz ochiq bo‘lsin.' },
      ].forEach((w) => addBalloon(w));
      return;
    }
    try {
      const json = await (await fetch('/api/wishes', { cache: 'no-store' })).json();
      if (json?.ok && Array.isArray(json.wishes)) json.wishes.slice(0, 60).forEach((w) => addBalloon(w));
    } catch {
      /* tarmoq yo'q */
    }
  }
  loadWishes();
  if (!preview && sky) scope.every(() => !document.hidden && loadWishes(), 45000);

  scope.on(form, 'submit', async (e) => {
    e.preventDefault();
    if (preview) return setStatus('Ko‘rinish rejimi — javob yuborilmaydi.');
    const data = Object.fromEntries(new FormData(form));
    data.name = (data.name || '').trim();
    data.message = (data.message || '').trim();
    if (data.name.length < 2) return setStatus('Iltimos, ismingizni kiriting.', true);
    if (!data.attending) return setStatus('Iltimos, kela olishingizni belgilang.', true);
    if (data.attending === 'wish' && data.message.length < 2) return setStatus('Iltimos, tabrigingizni yozing.', true);
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    setStatus('Yuborilmoqda…');
    try {
      // Javob maktubi: har bir maktub alohida saqlanadi (oldingisi ustidan yozilmaydi)
      const id = d.party ? guestId : crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id, couple: d.names }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setStatus(json.error === 'not_configured' ? 'Hozircha qabul qilib bo‘lmadi. Birozdan so‘ng urinib ko‘ring.' : 'Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.', true);
        return;
      }
      const { website, ...answer } = data;
      saved = { ...answer, id: guestId };
      store.set(saved);
      setStatus('');
      const r = btn.getBoundingClientRect();
      showDone(thanks(data.attending, data.name));
      burst(r.left + r.width / 2, Math.max(80, r.top), 80);
      if (data.message && sky) {
        addBalloon({ name: data.name, message: data.message }, { fresh: true });
        scope.later(() => skySec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 700);
      }
    } catch {
      setStatus('Internet aloqasini tekshirib, qayta urinib ko‘ring.', true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------------ Yakun: salyut ------------------------------------ */
function initFinale() {
  const sec = $('#finale');
  let fired = false;
  const io = scope.observe(
    new IntersectionObserver(
      (es) => {
        if (fired || !es.some((e) => e.isIntersecting)) return;
        fired = true;
        [0, 500, 1100, 1700].forEach((t) => scope.later(() => firework(), t));
      },
      { threshold: 0.45 },
    ),
  );
  io.observe(sec);
  scope.on(sec, 'click', (e) => {
    if (e.target.closest('a,button')) return;
    firework(e.clientX / innerWidth, e.clientY / innerHeight);
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountTort(c, { preview = false } = {}) {
  newScope();
  const d = deriveConfig(c);
  const T = tortTexts(c, d);
  setHearts(!d.party);
  const app = $('#app');
  // Ism harflari va raqamli shamlar Fredoka shriftida chizilishi uchun (ko'pi bilan 2 soniya kutiladi)
  try {
    await Promise.race([Promise.all([document.fonts.load('700 60px Fredoka'), document.fonts.load('italic 40px "Cormorant Garamond"')]), new Promise((r) => setTimeout(r, 2000))]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  app.innerHTML = renderPage(c, d, T);
  document.title = d.title;

  const blownEl = $('#blown');
  const candles = initCandles({
    onBlown() {
      const body = document.body;
      body.classList.add('is-blown');
      blownEl.textContent = T.blown;
      // Qisqa qorong'ilik → chiroqlar yonadi
      scope.later(
        () => {
          body.classList.add('is-party');
          cannons();
          releaseBalloons(16);
          scope.later(() => ascroll.ready(), 2600);
        },
        reduced ? 0 : 650,
      );
    },
  });
  initLife(c, d);
  initReveal(preview);
  initMemories(c);
  initWishBalloons();
  initGift();
  initCountdown(d);
  initCalendar(c, d);
  initRsvp(c, d, preview, T);
  initFinale();

  const gate = $('#gate');
  const music = preview ? { play() {} } : initMusic(musicUrlOf(c));
  const ascroll = preview ? { ready() {} } : initAutoScroll(c, { slow: '.letter, .party, .life', stopAt: '#rsvp-form' });

  if (preview) {
    gate.remove();
    $('#music-toggle')?.remove();
    document.body.classList.add('is-open', 'is-lit', 'is-blown', 'is-party');
    candles.lightAll(0);
    return;
  }

  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  const btn = $('#gate-open');
  btn.focus({ preventScroll: true });
  scope.on(
    btn,
    'click',
    async () => {
      window.scrollTo(0, 0);
      music.play();
      gate.classList.add('is-opening');
      document.body.classList.add('is-open');
      scope.later(
        () => {
          gate.remove();
          document.documentElement.classList.remove('is-locked');
          $('#music-toggle').hidden = false;
        },
        reduced ? 50 : 900,
      );
      await new Promise((r) => scope.later(r, reduced ? 0 : 700));
      await candles.lightAll(reduced ? 0 : 420);
      document.body.classList.add('is-lit');
      $('#blow-btn').focus({ preventScroll: true });
      // Mehmon puflamasdan pastga tushib ketsa — avto-aylantirish baribir ishlasin
      scope.later(() => !candles.isDone() && ascroll.ready(), 20000);
    },
    { once: true },
  );
}
