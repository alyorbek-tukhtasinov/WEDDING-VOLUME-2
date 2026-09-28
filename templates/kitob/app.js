// "3D sehrli kitob" shabloni: taklifnoma — charm muqovali kitob. Muqova ochiladi, varaqlar
// barmoq bilan 3D aylantiriladi (qog'oz shitirlashi bilan), har sahifada qog'ozdan kesilgan
// pop-up manzara tik turadi, emoji-stikerlar "yopishtiriladi", mehmonlar tilagi stikerli
// xatcha bo'lib devorga ilinadi.
// mountKitob() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import '../osmon/fonts/fonts.css';
import './fonts/caveat.css';
import './styles.css';
import { deriveConfig, musicUrlOf, MONTHS } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import brand from '@brand-config';
import { createBook, unlockSound } from './book.js';
import { celebrate, drizzle, setReducedFx } from '../suzani/fx.js';
import { sceneCouple, sceneCalendar, sceneMusic, sceneVenue, sceneDress, sceneLetter, sceneCake } from './art.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const pad = (n) => String(n).padStart(2, '0');
setReducedFx(reduced);

// Mehmon tilagiga tanlaydigan stikerlar (xabar boshiga qo'shiladi)
export const STICKERS = ['🥰', '💍', '🌷', '🕊️', '🎉', '💐', '✨', '❤️', '🤲', '🥂'];
const NOTE_COLORS = ['#fff4c9', '#ffe1e6', '#e3f1e0', '#e2ecfa', '#f3e6fb', '#ffe9d6'];

function hashStr(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/** Xabar boshidagi stikerni ajratadi: { sticker, text }. */
export function splitSticker(message = '', seed = '') {
  const m = String(message).trim();
  for (const s of STICKERS) {
    if (m.startsWith(s)) return { sticker: s, text: m.slice(s.length).trim() };
  }
  return { sticker: STICKERS[hashStr(seed || m) % STICKERS.length], text: m };
}

/* ---------------------------- Qayta chizish uchun tozalash ---------------------------- */
let scope = null;
let book = null;
let lastPage = 1; // panel ko'rinishida qayta chizilganda shu sahifada qoladi
function newScope() {
  scope?.abort();
  const ac = new AbortController();
  const timers = new Set();
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
    abort() {
      ac.abort();
      timers.forEach((id) => {
        clearInterval(id);
        clearTimeout(id);
      });
      book?.destroy();
      book = null;
    },
  };
  return scope;
}

/* ------------------------------------ Belgilar ------------------------------------ */
const ICON = {
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/** Buyurtma uchun: taklifnoma muallifining Instagram manzili (brand.config.js). */
function brandLink() {
  if (!brand?.enabled) return '';
  return html`<a class="brand" href="${brand.url}" target="_blank" rel="noopener">
    ${brand.logo
      ? html`<img src="${brand.logo}" alt="" width="30" height="30" loading="lazy" />`
      : raw('<svg class="brand__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" /></svg>')}
    <span>${brand.text}<b>${brand.name}</b></span>
  </a>`;
}

/* ------------------------------------ Sahifalar ------------------------------------ */
const scene = (layers, cls = '') => html`<div class="pg__scene ${cls}" aria-hidden="true"><div class="pop">${layers.map((s, i) => html`<div class="pop__l" style="--i:${i}">${raw(s)}</div>`)}</div></div>`;
const stk = (emoji, pos, rot, delay = 0) => html`<button class="stk no-drag" type="button" style="${pos};--r:${rot}deg;--d:${delay}s" aria-label="Stiker ${emoji}">${emoji}</button>`;
const head = (eyebrow, title) => html`<p class="eyebrow">${eyebrow}</p><h2 class="title">${title}</h2>`;

function renderPages(c, d) {
  const t = c.texts || {};
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const dress = c.dressCode?.text?.trim() || c.dressCode?.colors?.length ? c.dressCode : null;
  const contacts = (c.contacts || []).filter((x) => x?.name && x?.phone);
  const v = c.venue;
  const weekday = d.weekdayName.charAt(0).toUpperCase() + d.weekdayName.slice(1);
  const rsvp = !!c.rsvp?.enabled;
  const wall = rsvp && c.rsvp?.showWishes !== false;
  const pages = [];
  const add = (id, icon, title, body) => pages.push({ id, icon, title, body });

  add('cover', '📖', 'Muqova', html`
    <article class="pg cover" data-page="cover">
      <div class="cover__frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <p class="cover__eyebrow">${t.heroCaption || 'Nikoh to‘yiga taklifnoma'}</p>
      <div class="cover__mono" aria-hidden="true"><span>${d.initials}</span></div>
      <h1 class="cover__names"><span>${d.groom}</span><em>&amp;</em><span>${d.bride}</span></h1>
      <p class="cover__date">${pad(d.day)} · ${pad(d.month)} · ${d.year}</p>
      <button class="cover__btn no-drag" id="open-book" type="button">📖 Kitobni ochish</button>
      <p class="cover__hint">${raw(ICON.music)} ovoz bilan oching</p>
    </article>`);

  add('invite', '💌', 'Taklif', html`
    <article class="pg" data-page="invite">
      <div class="pg__scroll">
        ${scene(sceneCouple())}
        <div class="pg__body">
          <p class="eyebrow">${t.greeting || 'Hurmatli mehmonimiz!'}</p>
          <p class="invite__text">${t.invitation || `Sizni farzandlarimiz ${d.groom} va ${d.bride}ning nikoh to‘yi marosimiga taklif etamiz.`}</p>
          ${c.hosts ? html`<p class="invite__hosts"><span>Hurmat bilan,</span>${c.hosts}</p>` : ''}
        </div>
      </div>
      ${stk('💍', 'right:6%;top:4%', 14, 0.5)}${stk('🌷', 'left:5%;bottom:9%', -12, 0.8)}
    </article>`);

  add('date', '📅', 'Sana', html`
    <article class="pg" data-page="date">
      <div class="pg__scroll">
        ${scene(sceneCalendar(d.day, MONTHS[d.month - 1].toUpperCase()))}
        <div class="pg__body">
          ${head('To‘y kuni', `${weekday}, ${d.day}-${MONTHS[d.month - 1]}`)}
          <p class="date__line">${d.year}-yil · soat <b>${c.event.time}</b></p>
          ${c.effects?.countdown === false ? '' : html`
          <div class="count" id="countdown" aria-label="To‘ygacha qolgan vaqt">
            ${['kun', 'soat', 'daqiqa', 'soniya'].map((u) => html`<div class="count__cell"><b data-unit="${u}">00</b><span>${u}</span></div>`)}
          </div>
          <p class="count__done" id="countdown-done" hidden>🎉 To‘y kuni keldi!</p>`}
          <div class="btn-row">
            <a class="btn no-drag" id="gcal" target="_blank" rel="noopener">${raw(ICON.calendar)}<span>Google taqvim</span></a>
            <button class="btn no-drag" id="ics" type="button">${raw(ICON.calendar)}<span>Telefon taqvimi</span></button>
          </div>
        </div>
      </div>
      ${stk('🎉', 'left:5%;top:5%', -14, 0.5)}${stk('💐', 'right:5%;bottom:10%', 10, 0.8)}
    </article>`);

  if (program.length) {
    add('program', '🎶', 'Dastur', html`
    <article class="pg" data-page="program">
      <div class="pg__scroll">
        ${scene(sceneMusic())}
        <div class="pg__body">
          ${head('To‘y dasturi', 'Kecha qanday o‘tadi')}
          <ol class="prog">
            ${program.map((p, i) => html`<li style="--i:${i}"><time>${p.time}</time><p>${p.title}</p></li>`)}
          </ol>
        </div>
      </div>
      ${stk('🥂', 'right:5%;top:5%', 12, 0.5)}${stk('🎶', 'left:6%;top:30%', -10, 0.8)}
    </article>`);
  }

  add('venue', '📍', 'Manzil', html`
    <article class="pg" data-page="venue">
      <div class="pg__scroll">
        ${scene(sceneVenue())}
        <div class="pg__body">
          ${head('Manzil', v.name)}
          <p class="venue__address">${raw(ICON.pin)}<span>${v.address}</span></p>
          ${v.googleMaps || v.yandexMaps ? html`<div class="btn-row">
            ${v.googleMaps ? html`<a class="btn btn--wine no-drag" href="${v.googleMaps}" target="_blank" rel="noopener">📍 Google xarita</a>` : ''}
            ${v.yandexMaps ? html`<a class="btn btn--wine no-drag" href="${v.yandexMaps}" target="_blank" rel="noopener">🗺️ Yandex xarita</a>` : ''}
          </div>` : ''}
        </div>
      </div>
      ${stk('🚗', 'left:5%;top:6%', -8, 0.5)}${stk('🏛️', 'right:6%;bottom:9%', 12, 0.8)}
    </article>`);

  if (dress) {
    add('dress', '👗', 'Dress-kod', html`
    <article class="pg" data-page="dress">
      <div class="pg__scroll">
        ${scene(sceneDress(dress.colors || []))}
        <div class="pg__body">
          ${head('Dress-kod', 'Kiyim ranglari')}
          ${dress.text ? html`<p class="lead">${dress.text}</p>` : ''}
          ${dress.colors?.length ? html`<div class="swatches">${dress.colors.map((col, i) => html`<span class="swatch" style="--c:${col};--i:${i}" title="${col}"></span>`)}</div>` : ''}
        </div>
      </div>
      ${stk('👗', 'left:5%;top:5%', -12, 0.5)}${stk('🤵', 'right:5%;top:5%', 10, 0.7)}
    </article>`);
  }

  if (rsvp) {
    add('rsvp', '✉️', 'Javob', html`
    <article class="pg pg--compact" data-page="rsvp">
      <div class="pg__scroll">
        ${scene(sceneLetter())}
        <div class="pg__body">
          ${head('Javobingiz', 'Kela olasizmi?')}
          <form class="form" id="rsvp-form" novalidate>
            <label class="field"><span>Ismingiz</span><input name="name" autocomplete="name" maxlength="80" required placeholder="Ism va familiya" /></label>
            <fieldset class="choice">
              <legend class="sr-only">Kela olasizmi?</legend>
              <label><input type="radio" name="attending" value="yes" /><span>✅ Boraman</span></label>
              <label><input type="radio" name="attending" value="no" /><span>😔 Bora olmayman</span></label>
            </fieldset>
            <label class="field" id="guests-field" hidden><span>Necha kishi bo‘lasiz?</span>
              <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} kishi</option>`)}</select>
            </label>
            <fieldset class="stickers">
              <legend>Tilagingizga stiker tanlang</legend>
              <div class="stickers__row">
                ${STICKERS.map((s, i) => html`<label><input type="radio" name="sticker" value="${s}" ${i === 0 ? raw('checked') : ''} /><span>${s}</span></label>`)}
              </div>
            </fieldset>
            <label class="field"><span>Tilagingiz <em>(ixtiyoriy)</em></span><textarea name="message" rows="3" maxlength="480" placeholder="Yosh oilaga eng ezgu tilaklaringiz…"></textarea></label>
            <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
            <button class="btn btn--wine btn--wide" type="submit"><span>Yuborish</span></button>
            <p class="form__status" id="rsvp-status" role="status" aria-live="polite"></p>
            ${d.rsvpClosesAt ? html`<p class="hint">Javob muddati: ${Number(c.rsvp.deadline.slice(8))}-${MONTHS[Number(c.rsvp.deadline.slice(5, 7)) - 1]}gacha</p>` : ''}
          </form>
          <div class="done" id="rsvp-done" hidden></div>
        </div>
      </div>
      ${stk('💌', 'right:5%;top:4%', 12, 0.5)}
    </article>`);
  }

  if (wall) {
    add('wall', '🖼️', 'Tilaklar', html`
    <article class="pg" data-page="wall">
      <div class="pg__scroll">
        <div class="pg__body pg__body--wall">
          ${head('Mehmonlar devori', 'Tilaklar kitobi')}
          <p class="wall__count"><b id="wish-count">0</b> ta tilak · xatchani bosing</p>
          <div class="wall" id="wall"></div>
          <div class="wall__empty" id="wall-empty">
            <p>Hali tilak yo‘q. Birinchi tilakni siz yozing! ✍️</p>
            <button class="btn no-drag" type="button" data-goto="rsvp">✉️ Tilak yozish</button>
          </div>
        </div>
      </div>
      ${stk('📸', 'right:5%;top:3%', 10, 0.5)}
    </article>`);
  }

  add('final', '🎂', 'Yakun', html`
    <article class="pg" data-page="final">
      <div class="pg__scroll">
        ${scene(sceneCake())}
        <div class="pg__body">
          <p class="final__lead">${t.closing || 'Tashrifingiz biz uchun katta sharaf!'}</p>
          <p class="final__names">${d.groom} <span>&amp;</span> ${d.bride}</p>
          ${c.hosts ? html`<p class="final__hosts">${c.hosts}</p>` : ''}
          <button class="btn btn--gold no-drag" id="congrats" type="button">🎉 Tabriklash</button>
          ${contacts.length ? html`<div class="contacts">${contacts.map((ct) => html`<a class="btn no-drag" href="tel:${ct.phone.replace(/[^\d+]/g, '')}">${raw(ICON.phone)}<span>${ct.name}: ${ct.phone}</span></a>`)}</div>` : ''}
          ${brandLink()}
        </div>
      </div>
      ${stk('🎊', 'left:5%;top:5%', -12, 0.5)}${stk('🕊️', 'right:5%;top:8%', 12, 0.7)}
    </article>`);

  // Sahifa raqamlari (muqovadan tashqari)
  return pages.map((p, i) => {
    const tpl = document.createElement('template');
    tpl.innerHTML = p.body.value.trim();
    const el = tpl.content.firstElementChild;
    if (i > 0) (el.querySelector('.pg__scroll') || el).insertAdjacentHTML('beforeend', `<span class="pg__num" aria-hidden="true">— ${i} —</span>`);
    return { ...p, el };
  });
}

function renderShell(c, d) {
  return html`
    <div class="bokeh" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => html`<i style="--i:${i}"></i>`)}</div>
    <button class="fab" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <main class="stage" id="stage">
      <p class="sr-only">${d.names} — ${d.dateText}, soat ${c.event.time}. ${c.venue.name}, ${c.venue.address}</p>
      <div class="book-wrap" id="book-wrap">
        <div class="book" id="book"></div>
        <div class="book__ribbon" aria-hidden="true"></div>
      </div>
      <p class="swipe-hint" id="swipe-hint" aria-hidden="true">👉 Varaqni suring</p>
    </main>
    <nav class="nav" id="nav" aria-label="Sahifalar" hidden>
      <button class="nav__btn" id="prev" type="button" aria-label="Oldingi sahifa">${raw(ICON.prev)}</button>
      <div class="nav__mid">
        <span class="nav__title" id="nav-title"></span>
        <span class="nav__tabs" id="nav-tabs"></span>
      </div>
      <button class="nav__btn" id="next" type="button" aria-label="Keyingi sahifa">${raw(ICON.next)}</button>
    </nav>
    <audio id="music" loop preload="none"></audio>
  `.value;
}

/* ------------------------------------ O'lcham ------------------------------------ */
function measure() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const spread = W >= 900 && W / H > 1.2;
  const navH = 78;
  let pw;
  let ph;
  let top = 0;
  if (spread) {
    ph = Math.min(H - navH - 48, 760);
    pw = Math.min(ph * 0.72, (W - 120) / 2, 540);
    ph = Math.min(ph, pw / 0.66);
  } else {
    // Past ekranlarda musiqa tugmasi sahifa ustiga tushmasin
    top = H < 780 ? 48 : 0;
    const availH = H - navH - 26 - top;
    pw = Math.min(W - 28, 480);
    ph = Math.min(availH, pw * 1.72);
    pw = Math.min(pw, ph / 1.3);
  }
  const root = document.documentElement.style;
  root.setProperty('--pw', `${Math.round(pw)}px`);
  root.setProperty('--ph', `${Math.round(ph)}px`);
  root.setProperty('--top', `${top}px`);
  return spread;
}

/* ------------------------------------ Sanoq ------------------------------------ */
function initCountdown(d) {
  const cells = Object.fromEntries($$('[data-unit]').map((n) => [n.dataset.unit, n]));
  if (!cells.kun) return;
  const tick = () => {
    const diff = d.start.getTime() - Date.now();
    if (diff <= 0) {
      $('#countdown').hidden = true;
      $('#countdown-done').hidden = false;
      return false;
    }
    const s = Math.floor(diff / 1000);
    const vals = { kun: Math.floor(s / 86400), soat: Math.floor((s % 86400) / 3600), daqiqa: Math.floor((s % 3600) / 60), soniya: s % 60 };
    for (const [k, val] of Object.entries(vals)) {
      const txt = k === 'kun' ? String(val) : pad(val);
      const n = cells[k];
      if (n.textContent !== txt) {
        n.textContent = txt;
        n.classList.remove('is-tick');
        void n.offsetWidth;
        n.classList.add('is-tick');
      }
    }
    return true;
  };
  if (tick()) {
    const id = scope.every(() => {
      if (!tick()) clearInterval(id);
    }, 1000);
  }
}

const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function initCalendar(c, d) {
  const title = `${d.names} — to‘y`;
  const where = `${c.venue.name}, ${c.venue.address}`;
  const details = `${c.texts?.invitation || ''}\n\n${location.href}`;
  const gcal = $('#gcal');
  if (gcal) gcal.href = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${utcStamp(d.start)}/${utcStamp(d.end)}`, details, location: where })}`;
  $('#ics')?.addEventListener('click', () => {
    const e = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taklifnoma//UZ', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${utcStamp(d.start)}-${encodeURIComponent(d.names)}@taklifnoma`, `DTSTAMP:${utcStamp(new Date())}`,
      `DTSTART:${utcStamp(d.start)}`, `DTEND:${utcStamp(d.end)}`, `SUMMARY:${e(title)}`, `LOCATION:${e(where)}`, `DESCRIPTION:${e(details)}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${e(title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'toy-taklifnoma.ics' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
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
  audio.volume = 0.55;
  const sync = () => {
    const on = !audio.paused;
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Musiqani o‘chirish' : 'Musiqani yoqish');
  };
  const play = () => audio.play().catch(() => {}).finally(sync);
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  btn.addEventListener('click', () => (audio.paused ? play() : audio.pause()));
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

/* ------------------------------------ Stikerlar ------------------------------------ */
function initStickers() {
  scope.on(document, 'click', (e) => {
    const s = e.target.closest('.stk');
    if (!s) return;
    s.classList.remove('is-jiggle');
    void s.offsetWidth;
    s.classList.add('is-jiggle');
    const r = s.getBoundingClientRect();
    celebrate({ emojis: [s.textContent.trim()], count: 16, x: r.left + r.width / 2, y: r.top + r.height / 2, spread: 0.7 });
  });
}

/* ------------------------------------ Javob va tilaklar devori ------------------------------------ */
function initRsvp(c, d, preview, goTo) {
  const form = $('#rsvp-form');
  if (!form) return;
  const status = $('#rsvp-status');
  const doneBox = $('#rsvp-done');
  const guestsField = $('#guests-field');
  const storageKey = `rsvp:${d.names}:${c.event.originalDate || c.event.date}`;
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
  const thanks = (a, name) => (a === 'yes' ? `Rahmat, ${name}! 🥰 Sizni to‘yda intizorlik bilan kutamiz.` : `Rahmat, ${name}! 🤍 Xabar berganingiz uchun minnatdormiz.`);
  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<p class="done__icon">💌</p><p>${text}</p>${withChange ? html`<button class="link no-drag" type="button" id="rsvp-change">Javobni o‘zgartirish</button>` : ''}`.value;
    $('#rsvp-change')?.addEventListener('click', () => {
      doneBox.hidden = true;
      form.hidden = false;
      if (saved) {
        form.elements.namedItem('name').value = saved.name || '';
        for (const r of form.querySelectorAll('[name="attending"]')) r.checked = r.value === saved.attending;
        form.elements.namedItem('guests').value = saved.guests || '1';
        const { sticker, text } = splitSticker(saved.message || '');
        form.elements.namedItem('message').value = saved.message ? text : '';
        for (const r of form.querySelectorAll('[name="sticker"]')) r.checked = r.value === sticker;
        sync();
      }
    });
  };
  const now = Date.now();
  if ((d.rsvpClosesAt && now > d.rsvpClosesAt.getTime()) || now >= d.start.getTime()) showDone('Javoblar qabul qilish muddati tugagan. Tilaklaringiz uchun rahmat! 🌷', false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));

  const submitLabel = $('button[type="submit"] span', form);
  function sync() {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
    const msg = form.elements.namedItem('message').value.trim();
    submitLabel.textContent = msg ? `${form.elements.namedItem('sticker').value || '💌'} Tilakni yopishtirish` : 'Yuborish';
  }
  form.addEventListener('change', sync);
  form.addEventListener('input', sync);
  sync();
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  // Tilaklar devori
  const wall = $('#wall');
  const known = new Set();
  function addNote(w, { fresh = false } = {}) {
    if (!wall) return;
    const key = `${w.name}|${w.message}`;
    if (known.has(key) || !w.message) return;
    known.add(key);
    $('#wall-empty').hidden = true;
    const h = hashStr(key);
    const { sticker, text } = splitSticker(w.message, key);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `note no-drag${fresh ? ' is-fresh' : ''}`;
    b.style.setProperty('--r', `${((h % 9) - 4) * 1.2}deg`);
    b.style.setProperty('--c', NOTE_COLORS[h % NOTE_COLORS.length]);
    b.innerHTML = html`<span class="note__tape" aria-hidden="true"></span><span class="note__stk" aria-hidden="true">${sticker}</span><p>${text}</p><b>— ${w.name}</b>`.value;
    b.setAttribute('aria-label', `${w.name} tilagi`);
    b.addEventListener('click', () => b.classList.toggle('is-open'));
    fresh ? wall.prepend(b) : wall.append(b);
    $('#wish-count').textContent = String(known.size);
  }

  async function loadWishes() {
    if (preview) {
      [
        { name: 'Mehmon', message: '🥰 Baxtingiz shu kitob sahifalaridek go‘zal va uzun bo‘lsin!' },
        { name: 'Do‘stingiz', message: '🕊️ Oilangiz mustahkam, xonadoningiz nurga to‘la bo‘lsin.' },
        { name: 'Qarindoshingiz', message: '💐 Qo‘sha qaringlar!' },
        { name: 'Hamkasbingiz', message: '🎉 Tabriklaymiz! Muhabbatingiz abadiy bo‘lsin.' },
      ].forEach((w) => addNote(w));
      return;
    }
    try {
      const json = await (await fetch('/api/wishes', { cache: 'no-store' })).json();
      if (json?.ok && Array.isArray(json.wishes)) json.wishes.slice(0, 60).forEach((w) => addNote(w));
    } catch {
      /* tarmoq yo'q */
    }
  }
  loadWishes();
  if (!preview) scope.every(() => !document.hidden && loadWishes(), 45000);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (preview) return setStatus('Ko‘rinish rejimi — javob yuborilmaydi.');
    const data = Object.fromEntries(new FormData(form));
    data.name = (data.name || '').trim();
    const text = (data.message || '').trim();
    data.message = text ? `${data.sticker || ''} ${text}`.trim() : '';
    delete data.sticker;
    if (data.name.length < 2) return setStatus('Iltimos, ismingizni kiriting.', true);
    if (!data.attending) return setStatus('Iltimos, kela olishingizni belgilang.', true);
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    setStatus('Yuborilmoqda…');
    try {
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id: guestId, couple: d.names }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setStatus(json.error === 'not_configured' ? 'Hozircha javobni qabul qilib bo‘lmadi. Birozdan so‘ng urinib ko‘ring.' : 'Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.', true);
        return;
      }
      const { website, ...answer } = data;
      saved = { ...answer, id: guestId };
      store.set(saved);
      setStatus('');
      showDone(thanks(data.attending, data.name));
      const r = btn.getBoundingClientRect();
      celebrate({ x: r.left + r.width / 2, y: Math.max(80, r.top), count: 70 });
      if (data.message && wall) {
        addNote({ name: data.name, message: data.message }, { fresh: true });
        scope.later(() => goTo('wall'), 1400);
      }
    } catch {
      setStatus('Internet aloqasini tekshirib, qayta urinib ko‘ring.', true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountKitob(c, { preview = false } = {}) {
  const prevPage = book ? book.pageOf() : lastPage;
  newScope();
  const d = deriveConfig(c);
  const app = $('#app');
  try {
    await Promise.race([Promise.all([document.fonts.load('60px "Great Vibes"'), document.fonts.load('20px "Cormorant Garamond"')]), new Promise((r) => setTimeout(r, 1800))]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  app.innerHTML = renderShell(c, d);
  const pages = renderPages(c, d);
  const pageEls = pages.map((p) => p.el);
  const bookEl = $('#book');
  const nav = $('#nav');
  const tabs = $('#nav-tabs');
  let opened = preview;
  let turnedOnce = false;

  const endpaper = () => {
    const e = document.createElement('div');
    e.className = 'endpaper';
    e.innerHTML = html`<span class="endpaper__mono">${d.initials}</span>`.value;
    return e;
  };

  function updateNav(info) {
    const vis = info.pages.map((p) => pageEls.indexOf(p));
    const first = vis[0] ?? 0;
    const titles = vis.filter((i) => i > 0).map((i) => pages[i].title);
    $('#nav-title').textContent = titles.length ? titles.join(' · ') : 'Muqova';
    $('#prev').disabled = info.cur <= 0;
    $('#next').disabled = info.cur >= info.max;
    $$('button', tabs).forEach((b) => b.classList.toggle('is-on', vis.includes(Number(b.dataset.page))));
    $('#book-wrap').classList.toggle('is-closed', info.cur === 0);
    $('#book-wrap').classList.toggle('is-end', info.spread && info.cur === info.max && info.pages.length === 1 && info.cur > 0);
    if (first >= 0) lastPage = Math.max(...vis);
    if (info.cur > 0 && !opened) onOpened();
    if (info.cur > 0) {
      turnedOnce ||= opened && info.cur > 1;
      $('#swipe-hint').classList.remove('is-on');
    }
  }

  function build(spread, startPage) {
    book?.destroy();
    book = createBook(bookEl, {
      pages: pageEls,
      endpaper,
      spread,
      reduced,
      start: startPage,
      onChange: updateNav,
    });
    document.body.classList.toggle('is-spread', spread);
  }

  tabs.innerHTML = pages.map((p, i) => html`<button type="button" data-page="${i}" aria-label="${p.title}" title="${p.title}">${p.icon}</button>`.value).join('');
  const goTo = (id) => {
    const i = pages.findIndex((p) => p.id === id);
    if (i >= 0) book.go(book.curOf(i));
  };
  scope.on(tabs, 'click', (e) => {
    const b = e.target.closest('button[data-page]');
    if (b) book.go(book.curOf(Number(b.dataset.page)));
  });
  scope.on(document, 'click', (e) => {
    const g = e.target.closest('[data-goto]');
    if (g) goTo(g.dataset.goto);
  });
  $('#prev').addEventListener('click', () => book.prev());
  $('#next').addEventListener('click', () => book.next());
  let openCover = () => book.next();
  scope.on(document, 'keydown', (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    if (book.cur === 0 && !opened && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
      e.preventDefault();
      openCover();
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown') book.next();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') book.prev();
  });

  // Sahifa chetini bosish — varaqlash (telefonda qulay)
  scope.on(bookEl, 'click', (e) => {
    if (!opened || book.busy || e.target.closest('a, button, input, textarea, select, label, .note')) return;
    const leaf = e.target.closest('.leaf');
    if (!leaf) return;
    const r = bookEl.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x > 0.8) book.next();
    else if (x < 0.2) book.prev();
  });

  let spread = measure();
  build(spread, preview ? Math.min(prevPage, pageEls.length - 1) : 0);
  scope.on(window, 'resize', () => {
    const s = measure();
    if (s !== spread) {
      const p = book.pageOf();
      spread = s;
      build(spread, p);
    }
  });

  initCountdown(d);
  initCalendar(c, d);
  initStickers();
  initRsvp(c, d, preview, goTo);
  $('#congrats').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    celebrate({ x: r.left + r.width / 2, y: r.top, count: 120, emojis: ['💍', '🎉', '❤️', '🌷', '🕊️', '🎂', '✨'] });
  });

  const music = preview ? { play() {} } : initMusic(musicUrlOf(c));

  function onOpened() {
    opened = true;
    document.body.classList.add('is-open');
    nav.hidden = false;
    const fab = $('#music-toggle');
    if (fab) fab.hidden = false;
    drizzle(40);
    // Hali varaqlamagan bo'lsa — varaq chetini ko'tarib ishora qilamiz
    let hints = 0;
    const hint = () => {
      if (turnedOnce || hints++ > 2 || !book) return;
      $('#swipe-hint').classList.add('is-on');
      book.peek();
      scope.later(hint, 7000);
    };
    scope.later(hint, 2600);
  }

  if (preview) {
    $('#music-toggle')?.remove();
    document.body.classList.add('is-open', 'is-preview');
    nav.hidden = false;
    return;
  }

  // Muqova — kirish eshigi: bosilganda musiqa yoqiladi va kitob ochiladi
  const gesture = () => {
    unlockSound();
    if (!opened) music.play();
  };
  openCover = () => {
    gesture();
    book.next();
  };
  scope.on(bookEl, 'pointerup', () => book.cur === 0 && gesture());
  $('#open-book').addEventListener('click', (e) => {
    e.stopPropagation();
    gesture();
    book.next();
  });
  scope.on(bookEl, 'click', (e) => {
    if (book.cur === 0 && !book.busy && e.target.closest('.cover')) {
      gesture();
      book.next();
    }
  });
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
  $('#open-book').focus({ preventScroll: true });
}
