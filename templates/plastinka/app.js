// "Oltin plastinka" — yigitning tug'ilgan kun bazmiga taklifnoma, musiqa albomi uslubida.
// Kirish: albom muqovasi (surat yoki yoshi yozilgan oltin muqova) — bosilganda plastinka muqovadan chiqib,
// proigryvatelga tushadi, igna qo'yiladi va musiqa boshlanadi. Keyin: "A tomon" — taklif matni, reliz sanasi va
// kuchaytirgich ko'rinishidagi sanoq (VU-o'lchagichlar bilan), treklar ro'yxati (kecha dasturi), "Jonli ijroda"
// (manzil), kiyinish uslubi (rangli kichik plastinkalar), bonus trek (sovg'a), "backstage" kartasi ko'rinishidagi
// javob formasi, mehmonlar tilaklari, bog'lanish va "℗ ... Records" yakuni.
// Ma'lumotlar — config.json (person, event, venue, program, dressCode, gift, rsvp, contacts, photos.cover/venue).
// mountPlastinka() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import './fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, mediaUrl } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import { LANGS, siteLangs, pickLang, rememberLang, localize, cyr } from '../../src/lib/i18n.js';
import { latinToCyrillic } from '../../src/lib/translit.js';
import brand from '@brand-config';
import { initAutoScroll } from '../../src/lib/autoscroll.js';
import { plastinkaTexts, ruProgramTitle } from './texts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
// Instagram video yozilayotgani (scripts/render-video.js)
const STILL = () => !!globalThis.__TAKLIFNOMA_VIDEO__;

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
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="currentColor"/></svg>',
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
const disc = (d, L, cls = '') => html`
  <div class="pl-disc ${cls}" aria-hidden="true">
    <div class="pl-disc__shine"></div>
    <div class="pl-disc__label">
      <span class="pl-disc__brand">${L.label}</span>
      <b class="pl-disc__name" style="--len:${lenOf(d.name)}">${d.name}</b>
      <span class="pl-disc__vol">${L.vol}</span>
      <i class="pl-disc__hole"></i>
    </div>
  </div>`;

// Albom muqovasi: yuklangan surat yoki oltin nurli muqova (katta yosh raqami bilan)
const cover = (c, d, L) => {
  const photo = c.photos?.cover;
  return html`
    <div class="pl-cover ${photo ? 'pl-cover--photo' : ''}" ${photo ? raw(`style="--img:url('${mediaUrl(photo)}')"`) : ''}>
      ${photo ? '' : html`<div class="pl-cover__rays"></div><b class="pl-cover__age">${d.age || '★'}</b>`}
      <div class="pl-cover__text">
        <span class="pl-cover__label">${L.label}</span>
        <b class="pl-cover__name" style="--len:${lenOf(d.name)}">${d.name}</b>
        <span class="pl-cover__vol">${L.vol}</span>
      </div>
      <i class="pl-cover__wear" aria-hidden="true"></i>
    </div>`;
};

const head = (eyebrow, title, light = false) => html`
  <header class="pl-head ${light ? 'pl-head--light' : ''} reveal">
    <span class="pl-eyebrow">${eyebrow}</span>
    <h2 class="pl-h2">${title}</h2>
  </header>`;

/* ------------------------------------ Sahifa ------------------------------------ */
function renderPage(c, d, L, lang, langs) {
  const wd = (lang === 'ru' ? RU_WEEKDAYS : UZ_WEEKDAYS)[d.weekday];
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const half = Math.ceil(program.length / 2);
  const v = c.venue || {};
  const dress = c.dressCode?.text?.trim() || c.dressCode?.colors?.length ? c.dressCode : null;
  const gift = c.gift && (c.gift.title || c.gift.text || c.gift.card || c.gift.link) ? c.gift : null;
  const contacts = (c.contacts || []).filter((x) => x?.phone);
  const rsvp = d.party && !!c.rsvp?.enabled;
  const showWishes = rsvp && c.rsvp?.showWishes !== false;
  const on = (k) => (c.sections || {})[k] !== false;
  const time = c.event?.time || '';
  const card = gift?.card ? String(gift.card).replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : '';

  return html`
    <div class="pl-root" id="pl">
      <div class="pl-grain" aria-hidden="true"></div>
      ${langs.length > 1 ? html`
      <div class="pl-langs">
        ${langs.map((l) => html`<button type="button" class="${l === lang ? 'is-active' : ''}" data-lang="${l}" aria-pressed="${l === lang}">${{ uz: 'UZ', uzc: 'ЎЗ', ru: 'RU' }[l]}</button>`)}
      </div>` : ''}

      <div class="pl-gate" id="gate">
        <div class="pl-gate__spot" aria-hidden="true"></div>
        <p class="pl-gate__eyebrow">${L.gateEyebrow}</p>
        <div class="pl-sleeve" id="sleeve">
          ${disc(d, L, 'pl-disc--gate')}
          ${cover(c, d, L)}
          <button class="pl-sleeve__btn" id="gate-open" type="button" aria-label="${L.gateHint}"></button>
        </div>
        <p class="pl-gate__hint">${L.gateHint}</p>
      </div>

      <main class="pl-main">
        <section class="pl-hero">
          <p class="pl-eyebrow pl-hero__eyebrow">${L.heroEyebrow}</p>
          <h1 class="pl-hero__name" style="--len:${lenOf(d.name)}">${d.name}</h1>
          <p class="pl-hero__age"><span>${L.ageLine}</span></p>
          <div class="pl-deck" id="deck">
            <div class="pl-deck__plinth">
              <div class="pl-deck__platter">${disc(d, L, 'pl-disc--deck')}</div>
              <div class="pl-arm" aria-hidden="true">
                <svg viewBox="0 0 60 220"><circle cx="30" cy="22" r="17" fill="#2a2a2e" stroke="#b9975a" stroke-width="2"/><circle cx="30" cy="22" r="7" fill="#b9975a"/><path d="M30 22 L30 168 L44 196" fill="none" stroke="#d9d4c8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="36" y="190" width="16" height="24" rx="3" transform="rotate(-28 44 202)" fill="#1b1b1e" stroke="#b9975a" stroke-width="1.5"/></svg>
              </div>
              <button class="pl-deck__btn" id="music-toggle" type="button" aria-label="${L.musicOn}" aria-pressed="false" hidden>${raw(ICON.play)}</button>
              <span class="pl-deck__led" aria-hidden="true"></span>
              <span class="pl-deck__rpm" aria-hidden="true">33⅓</span>
            </div>
          </div>
          <p class="pl-hero__date">${pad(d.day)}.${pad(d.month)}.${d.year} <i>·</i> ${wd}${time ? html` <i>·</i> ${time}` : ''}</p>
        </section>

        ${on('invitation') ? html`
        <section class="pl-sec pl-invite">
          ${head(L.sideA, L.inviteTitle)}
          <p class="pl-quote reveal">${L.invitation}</p>
          <p class="pl-sign reveal">— ${d.name}</p>
        </section>` : ''}

        <section class="pl-sec pl-release">
          ${head(L.release, html`${pad(d.day)}<i>.</i>${pad(d.month)}`)}
          <p class="pl-release__meta reveal"><span>${wd}</span>${time ? html`<span>${L.at}: <b>${time}</b></span>` : ''}<span>${d.year}</span></p>
          ${c.effects?.countdown === false || !on('countdown') ? '' : html`
          <div class="pl-amp reveal" role="timer" aria-label="${L.countdown}">
            <div class="pl-amp__top">
              <span class="pl-amp__brand">${L.label} · ${L.countdown}</span>
              <span class="pl-amp__power"></span>
            </div>
            <div class="pl-amp__meters" aria-hidden="true">
              <div class="pl-vu"><i class="pl-vu__needle"></i><span>L</span></div>
              <div class="pl-vu"><i class="pl-vu__needle pl-vu__needle--r"></i><span>R</span></div>
            </div>
            <div class="pl-amp__digits">
              ${L.units.map((u, i) => html`<div class="pl-amp__cell"><b data-unit="${i}">00</b><span>${u}</span></div>`)}
            </div>
            <p class="pl-amp__live" id="countdown-done" hidden>${L.live}</p>
          </div>`}
        </section>

        ${program.length ? html`
        <section class="pl-sec pl-tracks">
          ${head(L.tracklistSub, L.tracklist)}
          <div class="pl-back reveal">
            ${[program.slice(0, half), program.slice(half)].filter((x) => x.length).map(
              (part, s) => html`
                <div class="pl-back__side">
                  <span class="pl-back__tag">${s ? L.sideBShort : L.sideAShort}</span>
                  <ol class="pl-back__list">
                    ${part.map((p, i) => html`<li><span class="pl-back__no">${s ? L.sideBShort : L.sideAShort}${i + 1}</span><span class="pl-back__title">${p.title}</span><span class="pl-back__dots"></span><time>${p.time}</time></li>`)}
                  </ol>
                </div>`,
            )}
          </div>
        </section>` : ''}

        ${d.party && on('location') ? html`
        <section class="pl-sec pl-venue" id="location">
          ${head(L.venue, L.venueTitle)}
          <div class="pl-ticket reveal">
            ${c.photos?.venue ? html`<div class="pl-ticket__photo" style="--img:url('${mediaUrl(c.photos.venue)}')"></div>` : ''}
            <div class="pl-ticket__body">
              <span class="pl-ticket__kicker">${L.venue}</span>
              <b class="pl-ticket__name">${v.name}</b>
              ${v.address ? html`<span class="pl-ticket__addr">${raw(ICON.pin)} ${v.address}</span>` : ''}
              <div class="pl-ticket__meta">
                <span><small>${L.release}</small><b>${pad(d.day)}.${pad(d.month)}</b></span>
                ${time ? html`<span><small>${L.at}</small><b>${time}</b></span>` : ''}
                <span><small>Vol.</small><b>${d.age || '★'}</b></span>
              </div>
            </div>
            <div class="pl-ticket__stub" aria-hidden="true"><span>Admit one</span></div>
          </div>
          ${v.googleMaps || v.yandexMaps ? html`
          <div class="pl-btns reveal">
            ${v.googleMaps ? html`<a class="pl-btn" href="${v.googleMaps}" target="_blank" rel="noopener">${raw(ICON.pin)} ${L.google}</a>` : ''}
            ${v.yandexMaps ? html`<a class="pl-btn pl-btn--ghost" href="${v.yandexMaps}" target="_blank" rel="noopener">${raw(ICON.pin)} ${L.yandex}</a>` : ''}
          </div>` : ''}
        </section>` : ''}

        ${dress ? html`
        <section class="pl-sec pl-dress">
          ${head('Dress code', L.dress)}
          ${dress.text ? html`<p class="pl-text reveal">${dress.text}</p>` : ''}
          ${dress.colors?.length ? html`
          <div class="pl-swatches reveal">${dress.colors.map((col, i) => html`<span class="pl-mini" style="--c:${col};--i:${i}"><i></i></span>`)}</div>` : ''}
        </section>` : ''}

        ${gift ? html`
        <section class="pl-sec pl-gift">
          ${head(L.bonus, gift.title || L.gift)}
          <div class="pl-gift__card reveal">
            <span class="pl-gift__icon">${raw(ICON.gift)}</span>
            ${gift.text ? html`<p class="pl-text">${gift.text}</p>` : ''}
            ${card ? html`
            <div class="pl-gift__num">
              <b id="gift-card">${card}</b>
              ${gift.holder || gift.bank ? html`<small>${[gift.holder, gift.bank].filter(Boolean).join(' · ')}</small>` : ''}
              <button class="pl-btn pl-btn--small" type="button" id="gift-copy" data-copy="${card.replace(/\s/g, '')}">${L.copy}</button>
            </div>` : ''}
            ${gift.link ? html`<a class="pl-btn" href="${gift.link}" target="_blank" rel="noopener">${gift.linkLabel || L.gift}</a>` : ''}
          </div>
        </section>` : ''}

        ${rsvp ? html`
        <section class="pl-sec pl-rsvp" id="rsvp">
          ${head(L.guestList, L.rsvpTitle)}
          <div class="pl-pass reveal" id="pass">
            <div class="pl-pass__lanyard" aria-hidden="true"></div>
            <div class="pl-pass__card">
              <div class="pl-pass__top">
                <span class="pl-pass__slot" aria-hidden="true"></span>
                <span class="pl-pass__all">${L.pass}</span>
                <span class="pl-pass__sub">${L.passSub}</span>
                <b class="pl-pass__who">${d.name} · ${L.vol}</b>
              </div>
              <form class="pl-form" id="rsvp-form" novalidate>
                <label class="pl-field"><span>${L.yourName}</span><input name="name" autocomplete="name" maxlength="80" required placeholder="${L.namePh}" /></label>
                <fieldset class="pl-choice">
                  <legend>${L.canCome}</legend>
                  <label><input type="radio" name="attending" value="yes" /><span>${L.yes}</span></label>
                  <label><input type="radio" name="attending" value="no" /><span>${L.no}</span></label>
                </fieldset>
                <label class="pl-field" id="guests-field" hidden><span>${L.guests}</span>
                  <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} ${L.person}</option>`)}</select>
                </label>
                ${showWishes ? html`<label class="pl-field"><span>${L.wish}</span><textarea name="message" rows="3" maxlength="500" placeholder="${L.wishPh}"></textarea></label>` : ''}
                <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
                <button class="pl-btn pl-btn--wide" type="submit">${L.send}</button>
                <p class="pl-status" id="rsvp-status" role="status" aria-live="polite"></p>
                ${d.rsvpClosesAt ? html`<p class="pl-pass__deadline">${L.deadline(Number(c.rsvp.deadline.slice(8)), Number(c.rsvp.deadline.slice(5, 7)))}</p>` : ''}
              </form>
              <div class="pl-done" id="rsvp-done" hidden></div>
              <div class="pl-pass__holo" aria-hidden="true"></div>
            </div>
          </div>
        </section>
        ${showWishes ? html`
        <section class="pl-sec pl-wishes" id="wishes-sec" hidden>
          ${head(L.wishesSub, L.wishes)}
          <div class="pl-wishes__list" id="wishes"></div>
        </section>` : ''}` : ''}

        ${contacts.length ? html`
        <section class="pl-sec pl-contacts">
          ${head('Backstage', L.contacts)}
          <div class="pl-btns reveal">
            ${contacts.map((x) => html`<a class="pl-btn pl-btn--ghost" href="tel:${x.phone.replace(/[^\d+]/g, '')}">${raw(ICON.phone)} ${x.name || L.call}</a>`)}
          </div>
        </section>` : ''}

        <footer class="pl-footer">
          ${disc(d, L, 'pl-disc--footer')}
          <p class="pl-footer__name" style="--len:${lenOf(d.name)}">${d.name}</p>
          <p class="pl-footer__rights">${L.rights}</p>
          ${brand?.enabled ? html`
          <a class="pl-cta" href="${brand.url}" target="_blank" rel="noopener">${raw(ICON.insta)}<span><b>${L.cta}</b><small>${brand.name}</small></span></a>` : ''}
        </footer>
      </main>
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

/* ------------------------------------ Musiqa (proigryvatel) ------------------------------------ */
// Plastinka aylanishi va igna holati musiqa bilan bog'liq: o'ynasa — igna plastinka ustida
function initMusic(src, L) {
  const audio = $('#music');
  const btn = $('#music-toggle');
  const deck = $('#deck');
  const setPlaying = (on) => {
    deck.classList.toggle('is-playing', on);
    btn.innerHTML = on ? ICON.pause : ICON.play;
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? L.musicOff : L.musicOn);
  };
  if (!src) {
    // Musiqasiz ham plastinka aylanadi (bezak sifatida)
    btn.remove();
    return { play: () => setPlaying(true) };
  }
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

/* ------------------------------------ Javob (backstage karta) ------------------------------------ */
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
  // Tasdiqlangach: kartada mehmonning ismi va muhr ("Ro'yxatda" / "Afsus!")
  const showDone = (text, who, attending, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    pass.classList.toggle('is-yes', attending === 'yes');
    pass.classList.toggle('is-no', attending === 'no');
    doneBox.innerHTML = html`
      ${who ? html`<b class="pl-done__who">${who}</b>` : ''}
      ${attending ? html`<span class="pl-stamp">${attending === 'yes' ? L.approved : L.declined}</span>` : ''}
      <p>${text}</p>
      ${withChange ? html`<button class="pl-link" type="button" id="rsvp-change">${L.change}</button>` : ''}`.value;
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
    el.className = 'pl-wish';
    el.style.setProperty('--r', `${((known.size * 37) % 7) - 3}deg`);
    el.innerHTML = html`<blockquote>${w.message}</blockquote><figcaption>— ${w.name}</figcaption>`.value;
    fresh ? list.prepend(el) : list.append(el);
  }
  async function loadWishes() {
    if (!list) return;
    if (preview) {
      addWish({ name: 'Do‘stingiz', message: 'Tug‘ilgan kuning muborak, uka! Har bir yangi treking xit bo‘lsin! 🎧' });
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
export async function mountPlastinka(config, { preview = false } = {}) {
  newScope();
  const langs = siteLangs(config);
  const lang = preview ? langs[0] : pickLang(langs);
  const c = localized(config, lang);
  const d0 = deriveConfig(c);
  const d = { ...d0, name: c.person?.name?.trim() || d0.name };
  const base = plastinkaTexts(c, d, lang === 'ru' ? 'ru' : 'uz');
  const L = lang === 'uzc' ? { ...cyr(base), label: base.label, vol: base.vol, pass: base.pass, google: base.google, wishesSub: base.wishesSub } : base;
  document.documentElement.lang = LANGS[lang]?.html || 'uz';
  document.documentElement.classList.toggle('pl-still', STILL());
  try {
    await Promise.race([
      Promise.all([document.fonts.load('700 48px "P Display"'), document.fonts.load('400 16px "P Sans"'), document.fonts.load('italic 400 24px "P Serif"')]),
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
      mountPlastinka(config, { preview });
    }),
  );

  const gate = $('#gate');
  const deck = $('#deck');
  const opened = () => {
    gate.remove();
    document.documentElement.classList.remove('is-locked');
    // Plastinka proigryvatelga "tushadi"
    deck.classList.add('is-loaded');
  };
  if (preview) {
    opened();
    deck.classList.add('is-playing');
    $('#music-toggle')?.remove();
    window.scrollTo(0, y);
    return;
  }
  const music = initMusic(musicUrlOf(c), L);
  const ascroll = initAutoScroll(config, {
    slow: '.pl-invite, .pl-release',
    theme: { bg: '#d4a24c', ink: '#141416' },
  });
  // Til almashtirilganda kirish oynasi qayta ko'rsatilmaydi
  if (session.get('pl:opened')) {
    opened();
    deck.classList.add('is-playing');
    window.scrollTo(0, y);
    ascroll.ready(false);
    return;
  }
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  scope.on($('#gate-open'), 'click', () => {
    window.scrollTo(0, 0);
    session.set('pl:opened', '1');
    // 1) plastinka muqovadan chiqadi, 2) muqova va sahna so'nadi, 3) proigryvatelga tushib, igna qo'yiladi
    gate.classList.add('is-out');
    scope.later(() => gate.classList.add('is-leaving'), 1100);
    scope.later(() => {
      opened();
      if (!STILL()) music.play();
      else deck.classList.add('is-playing');
      ascroll.ready();
    }, 1800);
  }, { once: true });
}
