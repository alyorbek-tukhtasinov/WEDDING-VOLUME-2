// "Bulutlar ustida" shabloni: taklifnoma — parvoz. Kirishda samolyot chiptasi (boarding pass),
// "Parvozni boshlash" bosilganda bulutlar orasidan uchib chiqasiz va samolyotlar safi osmonga
// tutun bilan kelin-kuyov ismlarini yozadi. Sanoq — aeroport tablosi (split-flap), dastur —
// havo sharlarida, manzil — parashyutda tushadi, tilaklar — qog'oz samolyotchalar.
// mountBulut() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import '../osmon/fonts/fonts.css';
import '../kitob/fonts/caveat.css';
import './styles.css';
import { deriveConfig, musicUrlOf, MONTHS } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import brand from '@brand-config';
import { createSky } from './sky.js';
import { createSkywriter } from './skywrite.js';
import { balloonSvg, BALLOON_SETS, parachuteSvg, PAPER_PLANE, BIRD, barcodeSvg } from './art.js';
import { celebrate, setReducedFx } from '../suzani/fx.js';
import { phrases } from '../../src/lib/events.js';
import { initAutoScroll } from '../../src/lib/autoscroll.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const pad = (n) => String(n).padStart(2, '0');
setReducedFx(reduced);

const FLY_EMOJI = ['✈️', '🎈', '☁️', '💍', '❤️', '🎉', '🕊️'];

/* ---------------------------- Qayta chizish uchun tozalash ---------------------------- */
let scope = null;
function newScope() {
  scope?.abort();
  const ac = new AbortController();
  const timers = new Set();
  const observers = new Set();
  const disposers = new Set();
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
    dispose(fn) {
      disposers.add(fn);
    },
    abort() {
      ac.abort();
      timers.forEach((id) => {
        clearInterval(id);
        clearTimeout(id);
      });
      observers.forEach((o) => o.disconnect());
      disposers.forEach((fn) => fn());
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
  plane: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15.5v-2l-8-5V3.8a1.5 1.5 0 0 0-3 0v4.7l-8 5v2l8-2.5v4.6l-2 1.5V21l3.5-1 3.5 1v-1.4l-2-1.5V13z" fill="currentColor"/></svg>',
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

// Chiptadagi aeroport kodi: ismning birinchi 3 harfi (lotin, katta)
const code3 = (name) => (name.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3) || name.slice(0, 3)).toUpperCase();

/** Taklifnoma havolasida ?mehmon=Ism bo'lsa — chiptada o'sha ism yoziladi. */
function guestName() {
  try {
    const v = new URLSearchParams(location.search).get('mehmon')?.trim();
    return v && v.length <= 40 ? v : '';
  } catch {
    return '';
  }
}

/* ------------------------------------ Sahifa ------------------------------------ */
function renderPage(c, d) {
  const t = c.texts || {};
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const dress = c.dressCode?.text?.trim() || c.dressCode?.colors?.length ? c.dressCode : null;
  const contacts = (c.contacts || []).filter((x) => x?.name && x?.phone);
  const v = c.venue;
  const weekday = d.weekdayName.charAt(0).toUpperCase() + d.weekdayName.slice(1);
  const flight = `${d.initials.replace(/[^A-Za-zА-Яа-я]/g, '').slice(0, 2).toUpperCase() || 'TY'} ${pad(d.day)}${pad(d.month)}`;
  const head = (eyebrow, title) => html`<p class="eyebrow">${eyebrow}</p><h2 class="title">${title}</h2>`;
  const guest = guestName();
  const wishes = c.rsvp?.enabled && c.rsvp?.showWishes !== false;

  return html`
    <div class="sky-bg" aria-hidden="true"><div class="sun"><i></i></div></div>
    <canvas class="sky-canvas" id="sky" aria-hidden="true"></canvas>
    <div class="birds" aria-hidden="true">${[0, 1, 2].map((i) => html`<span class="bird" style="--i:${i}">${raw(BIRD)}</span>`)}</div>

    <div class="gate" id="gate">
      <div class="pass" id="pass">
        <div class="pass__main">
          <div class="pass__head"><span>${raw(ICON.plane)} Taklifnoma Airlines</span><span>Boarding pass</span></div>
          <div class="pass__route">
            ${d.groom
              ? html`<div><b>${code3(d.groom)}</b><small>${d.groom}</small></div>
            <div class="pass__fly" aria-hidden="true"><i></i>${raw(ICON.plane)}<i></i></div>
            <div><b>${code3(d.bride)}</b><small>${d.bride}</small></div>`
              : html`<div><b>${code3(d.bride)}</b><small>${d.bride}</small></div>
            <div class="pass__fly" aria-hidden="true"><i></i>${raw(ICON.plane)}<i></i></div>
            <div><b>NEW</b><small>Yangi hayot</small></div>`}
          </div>
          <dl class="pass__grid">
            <div class="pass__wide"><dt>Yo‘lovchi</dt><dd>${guest || 'Aziz mehmonimiz'}</dd></div>
            <div><dt>Reys</dt><dd>${flight}</dd></div>
            <div><dt>Sana</dt><dd>${pad(d.day)}.${pad(d.month)}.${d.year}</dd></div>
            <div><dt>Uchish</dt><dd>${c.event.time}</dd></div>
            <div><dt>Yo‘nalish</dt><dd>Baxt ✦</dd></div>
            <div><dt>O‘rin</dt><dd>Faxriy</dd></div>
            <div><dt>Sinf</dt><dd>VIP ✦</dd></div>
          </dl>
        </div>
        <div class="pass__stub">
          <div class="pass__barcode">${raw(barcodeSvg(d.names))}</div>
          <p>${t.heroCaption || phrases(c)('heroCaption', 'Nikoh to‘yiga taklifnoma')}</p>
        </div>
      </div>
      <button class="btn btn--coral gate__btn" id="gate-open" type="button">✈️ Parvozni boshlash</button>
      <p class="gate__hint">${raw(ICON.music)} ovoz bilan oching</p>
    </div>

    <button class="fab" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>

    <main class="page" id="page">
      <section class="hero" aria-label="Taklifnoma">
        <p class="eyebrow hero__eyebrow">${t.heroCaption || phrases(c)('heroCaption', 'Nikoh to‘yiga taklifnoma')}</p>
        <h1 class="sr-only">${d.names}</h1>
        <div class="hero__sky"><canvas id="skywrite" aria-hidden="true"></canvas></div>
        <p class="hero__date"><span>${weekday}</span><b>${pad(d.day)} · ${pad(d.month)} · ${d.year}</b><span>soat ${c.event.time}</span></p>
        <p class="hero__hint" aria-hidden="true">Pastga suring — parvoz davom etadi ✈️</p>
      </section>

      <section class="section invite reveal">
        <div class="card cloudy">
          <p class="eyebrow">${t.greeting || 'Hurmatli mehmonimiz!'}</p>
          <p class="invite__text">${t.invitation || phrases(c)('invitation', `Sizni farzandlarimiz ${d.groom} va ${d.bride}ning nikoh to‘yi marosimiga taklif etamiz.`, d.groom, d.bride)}</p>
          ${c.hosts ? html`<p class="invite__hosts"><span>Hurmat bilan,</span>${c.hosts}</p>` : ''}
        </div>
      </section>

      <section class="section when reveal">
        ${head('Jo‘nash tablosi', `${weekday}, ${d.day}-${MONTHS[d.month - 1]}`)}
        <div class="board">
          <div class="board__head"><span>${raw(ICON.plane)} Jo‘nash · Departures</span><span>${flight}</span></div>
          ${c.effects?.countdown === false ? '' : html`
          <div class="board__row" id="countdown">
            ${['kun', 'soat', 'daqiqa', 'soniya'].map((u) => html`<div class="board__unit"><div class="flaps" data-unit="${u}"></div><span>${u}</span></div>`)}
          </div>
          <p class="board__done" id="countdown-done" hidden>🛬 Qo‘ndik! ${phrases(c)('came', 'To‘y kuni keldi')} 🎉</p>`}
          <div class="board__info">
            <span>Uchish: <b>${c.event.time}</b></span>
            <span>Sana: <b>${pad(d.day)}.${pad(d.month)}.${d.year}</b></span>
            <span>Holati: <b class="ok">O‘z vaqtida ✓</b></span>
          </div>
        </div>
        <div class="btn-row">
          <a class="btn" id="gcal" target="_blank" rel="noopener">${raw(ICON.calendar)}<span>Google taqvim</span></a>
          <button class="btn" id="ics" type="button">${raw(ICON.calendar)}<span>Telefon taqvimi</span></button>
        </div>
      </section>

      ${program.length ? html`
      <section class="section program reveal">
        ${head('Parvoz dasturi', 'Kecha qanday o‘tadi')}
        <ol class="balloons">
          ${program.map((p, i) => {
            const [c1, c2] = BALLOON_SETS[i % BALLOON_SETS.length];
            return html`<li class="balloons__item${i % 2 ? ' is-right' : ''}" style="--i:${i}">
              <div class="balloon">${raw(balloonSvg(c1, c2, `bl${i}`))}</div>
              <div class="balloons__card"><time>${p.time}</time><p>${p.title}</p></div>
            </li>`;
          })}
        </ol>
      </section>` : ''}

      <section class="section venue reveal">
        <div class="parachute" aria-hidden="true">${raw(parachuteSvg())}</div>
        <div class="card cloudy">
          ${head('Qo‘nish joyi', v.name)}
          <p class="venue__address">${raw(ICON.pin)}<span>${v.address}</span></p>
          ${v.googleMaps || v.yandexMaps ? html`<div class="btn-row">
            ${v.googleMaps ? html`<a class="btn btn--blue" href="${v.googleMaps}" target="_blank" rel="noopener">📍 Google xarita</a>` : ''}
            ${v.yandexMaps ? html`<a class="btn btn--blue" href="${v.yandexMaps}" target="_blank" rel="noopener">🗺️ Yandex xarita</a>` : ''}
          </div>` : ''}
        </div>
      </section>

      ${dress ? html`
      <section class="section dress reveal">
        ${head('Dress-kod', 'Kiyim ranglari')}
        ${dress.text ? html`<p class="lead">${dress.text}</p>` : ''}
        ${dress.colors?.length ? html`
          <div class="bunch" id="bunch">
            ${dress.colors.map((col, i) => html`<button class="bunch__b" type="button" style="--c:${col};--i:${i};--n:${dress.colors.length}" aria-label="Rang ${col}"><i></i></button>`)}
          </div>
          <p class="hint">Sharni bosing — osmonga uchadi 🎈</p>` : ''}
      </section>` : ''}

      ${c.rsvp?.enabled ? html`
      <section class="section rsvp reveal" id="rsvp">
        <div class="card cloudy">
          ${head('Ro‘yxatdan o‘tish', 'Parvozga qo‘shilasizmi?')}
          <form class="form" id="rsvp-form" novalidate>
            <label class="field"><span>Ismingiz</span><input name="name" autocomplete="name" maxlength="80" required placeholder="Ism va familiya" value="${guest}" /></label>
            <fieldset class="choice">
              <legend class="sr-only">Kela olasizmi?</legend>
              <label><input type="radio" name="attending" value="yes" /><span>✅ Albatta boraman</span></label>
              <label><input type="radio" name="attending" value="no" /><span>😔 Bora olmayman</span></label>
            </fieldset>
            <label class="field" id="guests-field" hidden><span>Necha kishi bo‘lasiz?</span>
              <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} kishi</option>`)}</select>
            </label>
            <label class="field"><span>Tilagingiz <em>(ixtiyoriy)</em></span><textarea name="message" rows="3" maxlength="500" placeholder="Yosh oilaga eng ezgu tilaklaringiz…"></textarea></label>
            <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
            <button class="btn btn--coral btn--wide" type="submit"><span>✈️ Yuborish</span></button>
            <p class="form__status" id="rsvp-status" role="status" aria-live="polite"></p>
            ${d.rsvpClosesAt ? html`<p class="hint">Ro‘yxatdan o‘tish: ${Number(c.rsvp.deadline.slice(8))}-${MONTHS[Number(c.rsvp.deadline.slice(5, 7)) - 1]}gacha</p>` : ''}
          </form>
          <div class="done" id="rsvp-done" hidden></div>
        </div>
      </section>` : ''}

      ${wishes ? html`
      <section class="section wishes reveal" id="wishes">
        <div class="wishes__planes" aria-hidden="true">${[0, 1, 2].map((i) => html`<span style="--i:${i}">${raw(PAPER_PLANE)}</span>`)}</div>
        ${head('Osmondagi tilaklar', 'Qog‘oz samolyotchalar')}
        <p class="wishes__count"><b id="wish-count">0</b> ta tilak uchib keldi</p>
        <div class="postcards" id="postcards"></div>
        <p class="wishes__empty" id="wishes-empty">Birinchi samolyotchani siz uchiring! ✍️</p>
      </section>` : ''}

      <section class="final reveal">
        <p class="final__lead">${t.closing || 'Tashrifingiz biz uchun katta sharaf!'}</p>
        <p class="final__names">${d.groom ? html`${d.groom} <span>&amp;</span> ` : ''}${d.bride}</p>
        ${c.hosts ? html`<p class="final__hosts">${c.hosts}</p>` : ''}
        <p class="final__fly">Baxtli parvoz! ✈️</p>
        <button class="btn btn--coral" id="congrats" type="button">🎉 Tabriklash</button>
        ${contacts.length ? html`<div class="contacts">${contacts.map((ct) => html`<a class="btn" href="tel:${ct.phone.replace(/[^\d+]/g, '')}">${raw(ICON.phone)}<span>${ct.name}: ${ct.phone}</span></a>`)}</div>` : ''}
        ${brandLink()}
      </section>
    </main>
    <audio id="music" loop preload="none"></audio>
  `.value;
}

/* ------------------------------------ Aeroport tablosi (split-flap) ------------------------------------ */
function flapCell() {
  const el = document.createElement('span');
  el.className = 'flap';
  el.innerHTML = '<span class="flap__h flap__t"><i>0</i></span><span class="flap__h flap__b"><i>0</i></span><span class="flap__h flap__ft"><i>0</i></span><span class="flap__h flap__fb"><i>0</i></span>';
  el.dataset.v = '0';
  return el;
}
function setFlap(el, ch, animate) {
  if (el.dataset.v === ch) return;
  const [t, b, ft, fb] = el.children;
  const old = el.dataset.v;
  el.dataset.v = ch;
  if (!animate || reduced) {
    for (const h of el.children) h.firstChild.textContent = ch;
    return;
  }
  // Orqadagi tepa yarmi — yangi raqam; oldingi tepa yarmi eski raqam bilan pastga yiqiladi,
  // so'ng yangi raqamning pastki yarmi ochiladi
  t.firstChild.textContent = ch;
  b.firstChild.textContent = old;
  ft.firstChild.textContent = old;
  fb.firstChild.textContent = ch;
  el.classList.remove('is-flip');
  void el.offsetWidth;
  el.classList.add('is-flip');
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    b.firstChild.textContent = ch;
    el.classList.remove('is-flip');
  }, 620);
}

function initCountdown(d) {
  const rows = Object.fromEntries($$('.flaps[data-unit]').map((n) => [n.dataset.unit, n]));
  if (!rows.kun) return;
  const daysLen = Math.max(2, String(Math.max(0, Math.floor((d.start.getTime() - Date.now()) / 86400000))).length);
  for (const [u, n] of Object.entries(rows)) {
    const len = u === 'kun' ? daysLen : 2;
    for (let i = 0; i < len; i++) n.append(flapCell());
  }
  let first = true;
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
      const cells = [...rows[k].children];
      const txt = String(val).padStart(cells.length, '0').slice(-cells.length);
      cells.forEach((cell, i) => setFlap(cell, txt[i], !first));
    }
    first = false;
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
  const title = phrases(c)('calTitle', `${d.names} — to‘y`, d.names);
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

/* ------------------------------------ Paydo bo'lish ------------------------------------ */
function initReveal() {
  const els = $$('.reveal, .balloons__item');
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = scope.observe(new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { threshold: 0.18 },
  ));
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------ Sharlar (dress-kod) ------------------------------------ */
function initBunch() {
  $$('.bunch__b').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.classList.contains('is-away')) return;
      b.classList.add('is-away');
      const r = b.getBoundingClientRect();
      celebrate({ emojis: ['🎈', '✨'], count: 14, x: r.left + r.width / 2, y: r.top + r.height / 3, spread: 0.6 });
      setTimeout(() => b.classList.remove('is-away'), reduced ? 600 : 3200);
    }),
  );
}

/* ------------------------------------ Qog'oz samolyotcha uchirish ------------------------------------ */
function launchPlane(from, to) {
  if (reduced || !from || !to) return Promise.resolve();
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'flying-plane';
  el.innerHTML = PAPER_PLANE;
  document.body.append(el);
  const x0 = a.left + a.width / 2 - 24;
  const y0 = a.top;
  const x1 = b.left + b.width / 2 - 24;
  const y1 = Math.min(b.top + 40, innerHeight * 0.6);
  const anim = el.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) rotate(-20deg) scale(.6)`, opacity: 0 },
      { transform: `translate(${x0 + 60}px, ${y0 - 160}px) rotate(-35deg) scale(1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${(x0 + x1) / 2 + 120}px, ${Math.min(y0, y1) - 220}px) rotate(10deg) scale(1.1)`, offset: 0.6 },
      { transform: `translate(${x1}px, ${y1}px) rotate(25deg) scale(.8)`, opacity: 0.9 },
    ],
    { duration: 2200, easing: 'cubic-bezier(.45,.05,.3,1)' },
  );
  return anim.finished.catch(() => {}).then(() => el.remove());
}

/* ------------------------------------ Javob va tilaklar ------------------------------------ */
function initRsvp(c, d, preview) {
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
  const thanks = (a, name) => (a === 'yes' ? `Rahmat, ${name}! Chiptangiz tasdiqlandi — sizni ${phrases(c)('thanksAt', 'to‘yda')} intizorlik bilan kutamiz.` : `Rahmat, ${name}! 🤍 Xabar berganingiz uchun minnatdormiz.`);
  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<p class="done__icon">🎫</p><p>${text}</p>${withChange ? html`<button class="link" type="button" id="rsvp-change">Javobni o‘zgartirish</button>` : ''}`.value;
    $('#rsvp-change')?.addEventListener('click', () => {
      doneBox.hidden = true;
      form.hidden = false;
      if (saved) {
        form.elements.namedItem('name').value = saved.name || '';
        for (const r of form.querySelectorAll('[name="attending"]')) r.checked = r.value === saved.attending;
        form.elements.namedItem('guests').value = saved.guests || '1';
        form.elements.namedItem('message').value = saved.message || '';
        sync();
      }
    });
  };
  const now = Date.now();
  if ((d.rsvpClosesAt && now > d.rsvpClosesAt.getTime()) || now >= d.start.getTime()) showDone('Ro‘yxatdan o‘tish yakunlangan. Tilaklaringiz uchun rahmat! 🌷', false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));

  const submitLabel = $('button[type="submit"] span', form);
  function sync() {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
    submitLabel.textContent = form.elements.namedItem('message').value.trim() ? '✈️ Tilakni uchirish' : '✈️ Yuborish';
  }
  form.addEventListener('change', sync);
  form.addEventListener('input', sync);
  sync();
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  // Tilaklar: pochta kartochkalari
  const box = $('#postcards');
  const known = new Set();
  function addCard(w, { fresh = false } = {}) {
    if (!box || !w.message) return;
    const key = `${w.name}|${w.message}`;
    if (known.has(key)) return;
    known.add(key);
    $('#wishes-empty').hidden = true;
    const el = document.createElement('article');
    el.className = `postcard${fresh ? ' is-fresh' : ''}`;
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.codePointAt(0)) | 0;
    el.style.setProperty('--r', `${((Math.abs(h) % 7) - 3) * 0.8}deg`);
    el.innerHTML = html`<span class="postcard__plane" aria-hidden="true">${raw(PAPER_PLANE)}</span><p>${w.message}</p><b>— ${w.name}</b>`.value;
    fresh ? box.prepend(el) : box.append(el);
    $('#wish-count').textContent = String(known.size);
  }
  async function loadWishes() {
    if (preview) {
      [
        { name: 'Mehmon', message: 'Baxtingiz osmondek cheksiz, muhabbatingiz quyoshdek iliq bo‘lsin!' },
        { name: 'Do‘stingiz', message: 'Oilaviy parvozingiz doim tinch va baxtli bo‘lsin ✈️' },
        { name: 'Qarindoshingiz', message: 'Qo‘sha qaringlar!' },
      ].forEach((w) => addCard(w));
      return;
    }
    try {
      const json = await (await fetch('/api/wishes', { cache: 'no-store' })).json();
      if (json?.ok && Array.isArray(json.wishes)) json.wishes.slice(0, 60).forEach((w) => addCard(w));
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
    data.message = (data.message || '').trim();
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
      const r = btn.getBoundingClientRect();
      const planeFrom = { getBoundingClientRect: () => r };
      showDone(thanks(data.attending, data.name));
      celebrate({ x: r.left + r.width / 2, y: Math.max(80, r.top), count: 60, emojis: FLY_EMOJI });
      if (data.message && box) {
        await launchPlane(planeFrom, $('#wishes'));
        addCard({ name: data.name, message: data.message }, { fresh: true });
        $('#wishes').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
    } catch {
      setStatus('Internet aloqasini tekshirib, qayta urinib ko‘ring.', true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountBulut(c, { preview = false } = {}) {
  newScope();
  const d = deriveConfig(c);
  const app = $('#app');
  try {
    await Promise.race([document.fonts.load('80px "Great Vibes"'), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  const y = window.scrollY;
  app.innerHTML = renderPage(c, d);

  const sky = createSky($('#sky'), { reduced });
  scope.dispose(() => sky.destroy());
  scope.on(window, 'scroll', () => sky.setScroll(window.scrollY), { passive: true });

  const writer = createSkywriter($('#skywrite'), {
    lines: d.groom ? [{ text: d.groom }, { heart: true, scale: 0.62 }, { text: d.bride }] : [{ heart: true, scale: 0.62 }, { text: d.bride }],
    font: 'Great Vibes',
    reduced,
  });
  scope.dispose(() => writer.destroy());
  let rw = 0;
  scope.on(window, 'resize', () => {
    clearTimeout(rw);
    rw = setTimeout(() => writer.resize(), 200);
  });

  initCountdown(d);
  initCalendar(c, d);
  initReveal();
  initBunch();
  initRsvp(c, d, preview);
  $('#congrats').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    celebrate({ x: r.left + r.width / 2, y: r.top, count: 110, emojis: FLY_EMOJI });
  });

  const gate = $('#gate');
  const writeNames = () => writer.start().then(() => $('.hero')?.classList.add('is-written'));
  if (preview) {
    gate.remove();
    $('#music-toggle')?.remove();
    document.body.classList.add('is-open');
    writeNames();
    window.scrollTo(0, y);
    return;
  }

  const music = initMusic(musicUrlOf(c));
  const ascroll = initAutoScroll(c, { slow: '.section.invite, .section.when' });
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  const btn = $('#gate-open');
  btn.focus({ preventScroll: true });
  btn.addEventListener('click', () => {
    window.scrollTo(0, 0);
    music.play();
    gate.classList.add('is-opening');
    sky.boost(reduced ? 0 : 14);
    setTimeout(() => {
      gate.remove();
      document.documentElement.classList.remove('is-locked');
      document.body.classList.add('is-open');
      const fab = $('#music-toggle');
      if (fab) fab.hidden = false;
      writeNames();
      ascroll.ready();
    }, reduced ? 100 : 1500);
  }, { once: true });
}
