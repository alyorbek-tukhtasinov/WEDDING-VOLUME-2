// "Klassik" — yigitning tug'ilgan kun bazmiga taklifnoma: yorug' fil suyagi rangidagi qog'oz, to'q ko'k siyoh va
// sokin tilla chiziqlar. Kirish: monogramma va ism yozilgan klassik karta ("Taklifnomani ochish"). Keyin: ism va yosh,
// taklif matni, sana bloki + kichik taqvim va sanoq, dastur (ingichka chiziqli vaqt jadvali), manzil kartasi,
// kiyinish uslubi, sovg'a, javob formasi, mehmonlar tilaklari, bog'lanish va yakun.
// Ma'lumotlar — config.json (person, event, venue, program, dressCode, gift, rsvp, contacts, photos.cover/venue).
// mountKlassik() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import './fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, mediaUrl } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import { LANGS, siteLangs, pickLang, rememberLang, localize, cyr } from '../../src/lib/i18n.js';
import { latinToCyrillic } from '../../src/lib/translit.js';
import brand from '@brand-config';
import { initAutoScroll } from '../../src/lib/autoscroll.js';
import { klassikTexts, ruProgramTitle } from './texts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');

const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const RU_WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

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

const session = {
  get(k) {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* sessionStorage yo'q */
    }
  },
};

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h3l1.5 4.2-2 1.4a12 12 0 0 0 5.8 5.8l1.4-2 4.2 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="9" width="17" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 9h19M12 9v11M12 9c-1.5-3.5-6-4.5-6-1.6C6 9 12 9 12 9zm0 0c1.5-3.5 6-4.5 6-1.6C18 9 12 9 12 9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  insta: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
};

/* ------------------------------------ Til ------------------------------------ */
// Ma'lumotlarni tanlangan tilga keltirish: o'zbek kirili — avtomatik o'girish; rus — ismlar kirillda,
// dastur bandlari tayyor tarjima bilan (bo'lmasa — kirillda)
function localized(config, lang) {
  if (lang === 'uz') return config;
  const c = localize(config, 'uzc');
  c.person = { ...c.person, name: latinToCyrillic(config.person?.name || '') };
  if (c.gift) c.gift = cyr(c.gift);
  if (lang === 'ru') {
    c.program = (config.program || []).map((p, i) => ({ ...c.program[i], title: ruProgramTitle(p.title) || c.program[i].title }));
  }
  return c;
}

/* ------------------------------------ Bo'laklar ------------------------------------ */
// Ismning eng uzun so'zi (harflar soni) — CSS uni so'z o'rtasidan bo'lmasdan sig'diradi (--len)
const lenOf = (name) => Math.max(4, ...String(name || '').split(/\s+/).map((w) => [...w].length));
const initial = (name) => [...String(name || '').trim()][0]?.toUpperCase() || '★';

// Monogramma: ikki qavatli ingichka tilla doira ichida ismning bosh harfi
const mono = (d, cls = '') => html`
  <div class="kl-mono ${cls}" aria-hidden="true">
    <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="57" /><circle cx="60" cy="60" r="51" /><path d="M60 3v6M60 111v6M3 60h6M111 60h6" /></svg>
    <b>${initial(d.name)}</b>
  </div>`;

// Bezak ajratgich: ikki chiziq orasida kichik romb
const rule = (cls = '') => html`<div class="kl-rule ${cls}" aria-hidden="true"><i></i><span>◆</span><i></i></div>`;

const head = (title, sub = '') => html`
  <header class="kl-head reveal">
    <h2 class="kl-h2">${title}</h2>
    ${rule()}
    ${sub ? html`<p class="kl-sub">${sub}</p>` : ''}
  </header>`;

// Oy taqvimi (dushanbadan): bazm kuni doira bilan belgilanadi
function calendar(d, L) {
  const first = (new Date(d.year, d.month - 1, 1).getDay() + 6) % 7;
  const days = new Date(d.year, d.month, 0).getDate();
  const cells = [...Array(first).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)];
  return html`
    <div class="kl-cal reveal" aria-hidden="true">
      <p class="kl-cal__title">${L.months[d.month - 1]} ${d.year}</p>
      <div class="kl-cal__grid">
        ${L.weekShort.map((w) => html`<span class="kl-cal__wd">${w}</span>`)}
        ${cells.map((n) => (n ? html`<span class="${n === d.day ? 'is-day' : ''}">${n}</span>` : html`<span></span>`))}
      </div>
    </div>`;
}

/* ------------------------------------ Sahifa ------------------------------------ */
function renderPage(c, d, L, lang, langs) {
  const wd = (lang === 'ru' ? RU_WEEKDAYS : UZ_WEEKDAYS)[d.weekday];
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const v = c.venue || {};
  const dress = c.dressCode?.text?.trim() || c.dressCode?.colors?.length ? c.dressCode : null;
  const gift = c.gift && (c.gift.title || c.gift.text || c.gift.card || c.gift.link) ? c.gift : null;
  const contacts = (c.contacts || []).filter((x) => x?.phone);
  const rsvp = d.party && !!c.rsvp?.enabled;
  const showWishes = rsvp && c.rsvp?.showWishes !== false;
  const on = (k) => (c.sections || {})[k] !== false;
  const time = c.event?.time || '';
  const card = gift?.card ? String(gift.card).replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : '';
  const photo = c.photos?.cover;

  return html`
    <div class="kl-root" id="kl">
      ${langs.length > 1 ? html`
      <div class="kl-langs">
        ${langs.map((l) => html`<button type="button" class="${l === lang ? 'is-active' : ''}" data-lang="${l}" aria-pressed="${l === lang}">${{ uz: 'UZ', uzc: 'ЎЗ', ru: 'RU' }[l]}</button>`)}
      </div>` : ''}

      <div class="kl-gate" id="gate">
        <div class="kl-gate__card">
          <div class="kl-frame" aria-hidden="true"></div>
          ${mono(d)}
          <p class="kl-gate__eyebrow">${L.gateEyebrow}</p>
          <p class="kl-gate__title">${L.gateTitle}</p>
          <b class="kl-gate__name" style="--len:${lenOf(d.name)}">${d.name}</b>
          ${rule()}
          <p class="kl-gate__date">${pad(d.day)} · ${pad(d.month)} · ${d.year}</p>
          <button class="kl-btn" id="gate-open" type="button">${L.gateBtn}</button>
        </div>
      </div>

      <main class="kl-main">
        <section class="kl-hero">
          <div class="kl-frame" aria-hidden="true"></div>
          ${photo ? html`<div class="kl-hero__photo reveal"><div style="--img:url('${mediaUrl(photo)}')"></div></div>` : mono(d, 'kl-mono--hero reveal')}
          <p class="kl-eyebrow reveal">${L.heroEyebrow}</p>
          <h1 class="kl-hero__name reveal" style="--len:${lenOf(d.name)}">${d.name}</h1>
          <p class="kl-hero__age reveal"><i></i><span>${L.ageLine}</span><i></i></p>
          <p class="kl-hero__date reveal">${pad(d.day)}.${pad(d.month)}.${d.year}${time ? html` <em>·</em> ${time}` : ''}</p>
          <span class="kl-hero__scroll" aria-hidden="true"></span>
        </section>

        ${on('invitation') ? html`
        <section class="kl-sec kl-invite">
          ${head(L.inviteTitle)}
          <p class="kl-quote reveal">${L.invitation}</p>
          <p class="kl-sign reveal">${d.name}</p>
        </section>` : ''}

        <section class="kl-sec kl-when">
          ${head(L.when)}
          <div class="kl-date reveal">
            <span class="kl-date__side">${wd}</span>
            <b class="kl-date__day">${d.day}</b>
            <span class="kl-date__side">${L.months[d.month - 1]}</span>
          </div>
          <p class="kl-date__meta reveal">${d.year}${time ? html` <em>·</em> ${L.at} <b>${time}</b>` : ''}</p>
          ${calendar(d, L)}
          ${c.effects?.countdown === false || !on('countdown') ? '' : html`
          <div class="kl-count reveal" role="timer" aria-label="${L.countdown}">
            <p class="kl-count__title">${L.countdown}</p>
            <div class="kl-count__row">
              ${L.units.map((u, i) => html`<div class="kl-count__cell"><b data-unit="${i}">00</b><span>${u}</span></div>`)}
            </div>
            <p class="kl-count__live" id="countdown-done" hidden>${L.live}</p>
          </div>`}
        </section>

        ${program.length ? html`
        <section class="kl-sec kl-program">
          ${head(L.program)}
          <ol class="kl-timeline">
            ${program.map((p) => html`<li class="reveal"><time>${p.time}</time><i aria-hidden="true"></i><span>${p.title}</span></li>`)}
          </ol>
        </section>` : ''}

        ${d.party && on('location') ? html`
        <section class="kl-sec kl-venue" id="location">
          ${head(L.venue)}
          <div class="kl-card reveal">
            ${c.photos?.venue ? html`<div class="kl-card__photo" style="--img:url('${mediaUrl(c.photos.venue)}')"></div>` : ''}
            <b class="kl-card__name">${v.name}</b>
            ${v.address ? html`<p class="kl-card__addr">${raw(ICON.pin)} <span>${v.address}</span></p>` : ''}
            ${v.googleMaps || v.yandexMaps ? html`
            <div class="kl-btns">
              ${v.googleMaps ? html`<a class="kl-btn" href="${v.googleMaps}" target="_blank" rel="noopener">${L.google}</a>` : ''}
              ${v.yandexMaps ? html`<a class="kl-btn kl-btn--ghost" href="${v.yandexMaps}" target="_blank" rel="noopener">${L.yandex}</a>` : ''}
            </div>` : ''}
          </div>
        </section>` : ''}

        ${dress ? html`
        <section class="kl-sec kl-dress">
          ${head(L.dress)}
          ${dress.text ? html`<p class="kl-text reveal">${dress.text}</p>` : ''}
          ${dress.colors?.length ? html`
          <div class="kl-swatches reveal">${dress.colors.map((col) => html`<span style="--c:${col}"></span>`)}</div>` : ''}
        </section>` : ''}

        ${gift ? html`
        <section class="kl-sec kl-gift">
          ${head(gift.title || L.gift)}
          <div class="kl-card reveal">
            <span class="kl-card__icon">${raw(ICON.gift)}</span>
            ${gift.text ? html`<p class="kl-text">${gift.text}</p>` : ''}
            ${card ? html`
            <div class="kl-gift__num">
              <b id="gift-card">${card}</b>
              ${gift.holder || gift.bank ? html`<small>${[gift.holder, gift.bank].filter(Boolean).join(' · ')}</small>` : ''}
              <button class="kl-btn kl-btn--small" type="button" id="gift-copy" data-copy="${card.replace(/\s/g, '')}">${L.copy}</button>
            </div>` : ''}
            ${gift.link ? html`<a class="kl-btn" href="${gift.link}" target="_blank" rel="noopener">${gift.linkLabel || L.gift}</a>` : ''}
          </div>
        </section>` : ''}

        ${rsvp ? html`
        <section class="kl-sec kl-rsvp" id="rsvp">
          ${head(L.rsvpTitle, L.rsvpSub)}
          <div class="kl-card kl-card--form reveal" id="pass">
            <form class="kl-form" id="rsvp-form" novalidate>
              <label class="kl-field"><span>${L.yourName}</span><input name="name" autocomplete="name" maxlength="80" required placeholder="${L.namePh}" /></label>
              <fieldset class="kl-choice">
                <legend>${L.canCome}</legend>
                <label><input type="radio" name="attending" value="yes" /><span>${L.yes}</span></label>
                <label><input type="radio" name="attending" value="no" /><span>${L.no}</span></label>
              </fieldset>
              <label class="kl-field" id="guests-field" hidden><span>${L.guests}</span>
                <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} ${L.person}</option>`)}</select>
              </label>
              ${showWishes ? html`<label class="kl-field"><span>${L.wish}</span><textarea name="message" rows="3" maxlength="500" placeholder="${L.wishPh}"></textarea></label>` : ''}
              <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
              <button class="kl-btn kl-btn--wide" type="submit">${L.send}</button>
              <p class="kl-status" id="rsvp-status" role="status" aria-live="polite"></p>
              ${d.rsvpClosesAt ? html`<p class="kl-deadline">${L.deadline(Number(c.rsvp.deadline.slice(8)), Number(c.rsvp.deadline.slice(5, 7)))}</p>` : ''}
            </form>
            <div class="kl-done" id="rsvp-done" hidden></div>
          </div>
        </section>
        ${showWishes ? html`
        <section class="kl-sec kl-wishes" id="wishes-sec" hidden>
          ${head(L.wishes)}
          <div class="kl-wishes__list" id="wishes"></div>
        </section>` : ''}` : ''}

        ${contacts.length ? html`
        <section class="kl-sec kl-contacts">
          ${head(L.contacts)}
          <div class="kl-btns reveal">
            ${contacts.map((x) => html`<a class="kl-btn kl-btn--ghost" href="tel:${x.phone.replace(/[^\d+]/g, '')}">${raw(ICON.phone)} ${x.name || L.call}</a>`)}
          </div>
        </section>` : ''}

        <footer class="kl-footer">
          ${rule()}
          <p class="kl-footer__thanks">${L.thanks}</p>
          <p class="kl-footer__name" style="--len:${lenOf(d.name)}">${d.name}</p>
          ${brand?.enabled ? html`
          <a class="kl-cta" href="${brand.url}" target="_blank" rel="noopener">${raw(ICON.insta)}<span><b>${L.cta}</b><small>${brand.name}</small></span></a>` : ''}
        </footer>
      </main>
      <button class="kl-music" id="music-toggle" type="button" aria-label="${L.musicOn}" aria-pressed="false" hidden>${raw(ICON.play)}</button>
      <audio id="music" loop preload="none"></audio>
    </div>
  `.value;
}

/* ------------------------------------ Sanoq ------------------------------------ */
function initCountdown(d) {
  const cells = $$('[data-unit]');
  if (!cells.length) return;
  const tick = () => {
    const diff = Math.max(0, d.start.getTime() - Date.now());
    const s = Math.floor(diff / 1000);
    [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].forEach((val, i) => {
      const txt = pad(val);
      if (cells[i].textContent !== txt) cells[i].textContent = txt;
    });
    if (diff <= 0) $('#countdown-done').hidden = false;
    return diff > 0;
  };
  if (tick()) {
    const id = scope.every(() => {
      if (!tick()) clearInterval(id);
    }, 1000);
  }
}

/* ------------------------------------ Paydo bo'lish ------------------------------------ */
function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = scope.observe(new IntersectionObserver(
    (entries, obs) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      obs.unobserve(e.target);
    }),
    { threshold: 0.12 },
  ));
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------ Musiqa ------------------------------------ */
function initMusic(src, L) {
  const audio = $('#music');
  const btn = $('#music-toggle');
  if (!src) {
    btn.remove();
    return { play: () => {} };
  }
  const setPlaying = (on) => {
    btn.classList.toggle('is-playing', on);
    btn.innerHTML = on ? ICON.pause : ICON.play;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? L.musicOff : L.musicOn);
  };
  btn.hidden = false;
  audio.src = src;
  audio.volume = 0.6;
  const sync = () => setPlaying(!audio.paused);
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

/* ------------------------------------ Javob ------------------------------------ */
function initRsvp(c, d, L, preview) {
  const form = $('#rsvp-form');
  if (!form) return;
  const status = $('#rsvp-status');
  const doneBox = $('#rsvp-done');
  const pass = $('#pass');
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
    set(val) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(val));
      } catch {
        /* localStorage yo'q */
      }
    },
  };
  let saved = preview ? null : store.get();
  const guestId = saved?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };
  const closed = (d.rsvpClosesAt && Date.now() > d.rsvpClosesAt.getTime()) || Date.now() >= d.start.getTime();
  const sync = () => {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
  };
  const showDone = (text, who, attending, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    pass.classList.toggle('is-yes', attending === 'yes');
    pass.classList.toggle('is-no', attending === 'no');
    doneBox.innerHTML = html`
      ${attending ? html`<span class="kl-done__mark">${attending === 'yes' ? '✓' : '—'}</span>` : ''}
      ${who ? html`<b class="kl-done__who">${who}</b>` : ''}
      <p>${text}</p>
      ${withChange ? html`<button class="kl-link" type="button" id="rsvp-change">${L.change}</button>` : ''}`.value;
    $('#rsvp-change')?.addEventListener('click', () => {
      doneBox.hidden = true;
      form.hidden = false;
      pass.classList.remove('is-yes', 'is-no');
      if (saved) {
        form.elements.namedItem('name').value = saved.name || '';
        for (const r of form.querySelectorAll('[name="attending"]')) r.checked = r.value === saved.attending;
        form.elements.namedItem('guests').value = saved.guests || '1';
        if (form.elements.namedItem('message')) form.elements.namedItem('message').value = saved.message || '';
        sync();
      }
    });
  };
  const thanks = (a, name) => (a === 'yes' ? L.thanksYes(name) : L.thanksNo(name));
  if (closed) showDone(L.closed, '', '', false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name), saved.name, saved.attending);
  scope.on(form, 'change', sync);
  sync();

  // Mehmonlar tilaklari
  const list = $('#wishes');
  const known = new Set();
  function addWish(w, fresh = false) {
    if (!list || !w?.name || !w?.message) return;
    const key = `${w.name}|${w.message}`;
    if (known.has(key)) return;
    known.add(key);
    $('#wishes-sec').hidden = false;
    const el = document.createElement('figure');
    el.className = 'kl-wish';
    el.innerHTML = html`<blockquote>${w.message}</blockquote><figcaption>— ${w.name}</figcaption>`.value;
    fresh ? list.prepend(el) : list.append(el);
  }
  async function loadWishes() {
    if (!list) return;
    if (preview) {
      addWish({ name: 'Do‘stingiz', message: 'Tug‘ilgan kuningiz muborak! Sog‘lik, baxt va omad hamisha yoringiz bo‘lsin!' });
      return;
    }
    try {
      const json = await (await fetch('/api/wishes', { cache: 'no-store' })).json();
      if (json?.ok && Array.isArray(json.wishes)) json.wishes.slice(0, 60).forEach((w) => addWish(w));
    } catch {
      /* tarmoq yo'q */
    }
  }
  loadWishes();
  if (!preview && list) scope.every(() => !document.hidden && loadWishes(), 45000);

  scope.on(form, 'submit', async (e) => {
    e.preventDefault();
    if (preview) return setStatus(L.preview);
    const data = Object.fromEntries(new FormData(form));
    data.name = (data.name || '').trim();
    data.message = (data.message || '').trim();
    if (data.name.length < 2) return setStatus(L.needName, true);
    if (!data.attending) return setStatus(L.needAnswer, true);
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    setStatus(L.sending);
    try {
      const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id: guestId, couple: d.names }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) return setStatus(L.error, true);
      const { website, ...answer } = data;
      saved = { ...answer, id: guestId };
      store.set(saved);
      setStatus('');
      showDone(thanks(data.attending, data.name), data.name, data.attending);
      if (data.message) addWish({ name: data.name, message: data.message }, true);
    } catch {
      setStatus(L.offline, true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------------ Sovg'a: karta raqamidan nusxa ------------------------------------ */
function initGift(L) {
  const b = $('#gift-copy');
  if (!b) return;
  scope.on(b, 'click', async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
    } catch {
      const r = document.createRange();
      r.selectNodeContents($('#gift-card'));
      getSelection().removeAllRanges();
      getSelection().addRange(r);
      document.execCommand?.('copy');
    }
    b.textContent = L.copied;
    scope.later(() => (b.textContent = L.copy), 2200);
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountKlassik(config, { preview = false } = {}) {
  newScope();
  const langs = siteLangs(config);
  const lang = preview ? langs[0] : pickLang(langs);
  const c = localized(config, lang);
  const d0 = deriveConfig(c);
  const d = { ...d0, name: c.person?.name?.trim() || d0.name };
  const base = klassikTexts(c, d, lang === 'ru' ? 'ru' : 'uz');
  const L = lang === 'uzc' ? { ...cyr(base), google: base.google } : base;
  document.documentElement.lang = LANGS[lang]?.html || 'uz';
  try {
    await Promise.race([
      Promise.all([document.fonts.load('500 48px "K Serif"'), document.fonts.load('italic 500 24px "K Serif"'), document.fonts.load('400 16px "K Sans"')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  const y = window.scrollY;
  $('#app').innerHTML = renderPage(c, d, L, lang, langs);
  initCountdown(d);
  initReveal();
  initRsvp(c, d, L, preview);
  initGift(L);

  $$('[data-lang]').forEach((b) =>
    scope.on(b, 'click', () => {
      if (b.dataset.lang === lang) return;
      rememberLang(b.dataset.lang);
      const u = new URL(location.href);
      u.searchParams.set('lang', b.dataset.lang);
      history.replaceState(null, '', u);
      mountKlassik(config, { preview });
    }),
  );

  const gate = $('#gate');
  const opened = () => {
    gate.remove();
    document.documentElement.classList.remove('is-locked');
  };
  if (preview) {
    opened();
    $('#music-toggle')?.remove();
    window.scrollTo(0, y);
    return;
  }
  const music = initMusic(musicUrlOf(c), L);
  const ascroll = initAutoScroll(config, {
    slow: '.kl-invite, .kl-when',
    theme: { bg: '#1f2a37', ink: '#f7f3ec' },
  });
  // Til almashtirilganda kirish oynasi qayta ko'rsatilmaydi
  if (session.get('kl:opened')) {
    opened();
    window.scrollTo(0, y);
    ascroll.ready(false);
    return;
  }
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  scope.on($('#gate-open'), 'click', () => {
    window.scrollTo(0, 0);
    session.set('kl:opened', '1');
    music.play();
    gate.classList.add('is-out');
    scope.later(() => {
      opened();
      ascroll.ready();
    }, 900);
  }, { once: true });
}
