// "Fil suyagi" (ivory) va "Qirollik" (royal) shablonlari — bitta kod, ikki ko'rinish.
//   ivory — fil suyagi rangli konvert va qizil mumli muhr, oqqushli kemer, pion gullar, yirtiq qog'oz
//   royal — to'q ko'k va tilla: tilla muhr, ko'k kartush ichida ismlar, uzuklar, saroy surati
// mountIvory() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import '../osmon/fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, MONTHS, WEEKDAYS_SHORT } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import brand from '@brand-config';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const pad = (n) => String(n).padStart(2, '0');

export const THEMES = ['ivory', 'royal'];

/* ---------------------------- Qayta chizish uchun tozalash ---------------------------- */
let scope = null;
function newScope() {
  scope?.abort();
  const ac = new AbortController();
  const timers = new Set();
  const observers = new Set();
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

/* ------------------------------------ Belgilar ------------------------------------ */
const ICON = {
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
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

/** Sarlavha: tepada va pastda tilla naqsh. */
const head = (eyebrow, title) => html`
  <header class="head">
    <img class="head__flourish" src="/images/frame-top.webp" alt="" width="500" height="112" loading="lazy" />
    <p class="eyebrow">${eyebrow}</p>
    <h2 class="title">${title}</h2>
  </header>`;

/** To'y oyining taqvimi (dushanbadan boshlanadi), to'y kuni yurak ichida. */
function calendarHtml(d) {
  const first = new Date(Date.UTC(d.year, d.month - 1, 1)).getUTCDay(); // 0 — yakshanba
  const offset = (first + 6) % 7;
  const days = new Date(Date.UTC(d.year, d.month, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(html`<span class="cal__cell cal__cell--empty"></span>`);
  for (let n = 1; n <= days; n++) {
    cells.push(
      n === d.day
        ? html`<span class="cal__cell cal__cell--day" aria-label="To‘y kuni"><img src="/images/heart.webp" alt="" width="260" height="236" /><b>${n}</b></span>`
        : html`<span class="cal__cell">${n}</span>`,
    );
  }
  return html`
    <div class="cal" aria-label="${d.monthName} ${d.year}">
      <p class="cal__month">${d.monthName} <span>${d.year}</span></p>
      <div class="cal__grid">
        ${WEEKDAYS_SHORT.map((w) => html`<span class="cal__wd">${w}</span>`)}
        ${cells}
      </div>
    </div>`;
}

/* ------------------------------------ Sahifa ------------------------------------ */
function renderPage(c, d, theme) {
  const t = c.texts || {};
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const dress = c.dressCode?.text?.trim() || c.dressCode?.colors?.length ? c.dressCode : null;
  const contacts = (c.contacts || []).filter((x) => x?.name && x?.phone);
  const v = c.venue;
  const weekday = d.weekdayName.charAt(0).toUpperCase() + d.weekdayName.slice(1);
  const caption = t.heroCaption || 'Nikoh to‘yiga taklifnoma';
  const royal = theme === 'royal';

  const gate = royal
    ? html`
    <div class="gate gate--royal" id="gate">
      <div class="gate__card">
        <p class="eyebrow eyebrow--light">${caption}</p>
        <div class="cartouche">
          <img src="/images/ornament.webp" alt="" width="520" height="780" />
          <div class="cartouche__text">
            <span class="cartouche__name">${d.groom}</span>
            <span class="cartouche__amp">&amp;</span>
            <span class="cartouche__name">${d.bride}</span>
            <span class="cartouche__date">${pad(d.day)} · ${pad(d.month)} · ${d.year}</span>
          </div>
        </div>
        <button class="seal seal--gold" id="gate-open" type="button" aria-label="Taklifnomani ochish">
          <img src="/images/wax-seal.webp" alt="" width="420" height="486" />
          <span class="seal__initials">${d.initials}</span>
        </button>
        <p class="gate__hint">${raw(ICON.music)} Muhrni bosing — taklifnoma ochiladi</p>
      </div>
    </div>`
    : html`
    <div class="gate gate--ivory" id="gate">
      <div class="envelope">
        <img class="envelope__paper" src="/images/ivory-envelope.webp" alt="" width="720" height="1280" />
        <p class="envelope__to">${caption}</p>
        <button class="seal seal--red" id="gate-open" type="button" aria-label="Taklifnomani ochish"><span class="seal__initials">${d.initials}</span></button>
        <div class="envelope__names"><span>${d.groom}</span> <i>&amp;</i> <span>${d.bride}</span></div>
        <p class="gate__hint">${raw(ICON.music)} Muhrni bosing — taklifnoma ochiladi</p>
      </div>
    </div>`;

  const hero = royal
    ? html`
      <section class="hero hero--royal" aria-label="Taklifnoma">
        <h1 class="sr-only">${d.names}</h1>
        <p class="eyebrow">${caption}</p>
        <img class="hero__rings" src="/images/rings.webp" alt="" width="432" height="325" />
        <div class="cartouche cartouche--hero">
          <img src="/images/ornament.webp" alt="" width="520" height="780" />
          <div class="cartouche__text">
            <span class="cartouche__name">${d.groom}</span>
            <span class="cartouche__amp">&amp;</span>
            <span class="cartouche__name">${d.bride}</span>
          </div>
        </div>
        <p class="hero__date"><span>${weekday}</span><b>${pad(d.day)} · ${pad(d.month)} · ${d.year}</b><span>soat ${c.event.time}</span></p>
      </section>`
    : html`
      <section class="hero hero--ivory" aria-label="Taklifnoma">
        <h1 class="sr-only">${d.names}</h1>
        <div class="arch">
          <img class="arch__img" src="/images/hero-arch.webp" alt="" width="540" height="960" />
          <div class="arch__text">
            <p class="eyebrow">${caption}</p>
            <p class="arch__names">${d.groom}<i>&amp;</i>${d.bride}</p>
          </div>
        </div>
        <p class="hero__date"><span>${weekday}</span><b>${pad(d.day)} · ${pad(d.month)} · ${d.year}</b><span>soat ${c.event.time}</span></p>
        <img class="hero__peony" src="/images/peony.webp" alt="" width="260" height="239" />
      </section>`;

  return html`
    ${gate}

    <button class="fab" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <div class="petals" id="petals" aria-hidden="true"></div>

    <main class="page" id="page">
      ${hero}

      <section class="section invite">
        <div class="paper">
          <p class="eyebrow">${t.greeting || 'Hurmatli mehmonimiz!'}</p>
          <p class="invite__text">${t.invitation || `Sizni farzandlarimiz ${d.groom} va ${d.bride}ning nikoh to‘yi marosimiga taklif etamiz.`}</p>
          ${c.hosts ? html`<p class="invite__hosts"><span>Hurmat bilan,</span>${c.hosts}</p>` : ''}
          <img class="paper__flourish" src="/images/frame-bottom.webp" alt="" width="500" height="112" loading="lazy" />
        </div>
      </section>

      <section class="section when">
        ${head('Sana', `${d.day}-${d.monthName}, ${weekday.toLowerCase()}`)}
        ${calendarHtml(d)}
        <p class="when__time">${raw(ICON.clock)}<span>Soat <b>${c.event.time}</b> da</span></p>
        ${c.effects?.countdown === false
          ? ''
          : html`
        <div class="countdown" id="countdown">
          ${['kun', 'soat', 'daqiqa', 'soniya'].map((u) => html`<div class="countdown__cell"><b data-unit="${u}">00</b><span>${u}</span></div>`)}
        </div>
        <p class="when__done" id="countdown-done" hidden>🎉 To‘y kuni keldi — biz bilan bo‘lganingiz uchun rahmat!</p>`}
        <div class="btn-row">
          <a class="btn" id="gcal" target="_blank" rel="noopener">${raw(ICON.calendar)}<span>Google taqvim</span></a>
          <button class="btn" id="ics" type="button">${raw(ICON.calendar)}<span>Telefon taqvimi</span></button>
        </div>
      </section>

      ${program.length ? html`
      <section class="section program">
        ${head('To‘y dasturi', 'Kecha qanday o‘tadi')}
        <ol class="timeline">
          ${program.map((p, i) => html`<li class="timeline__item reveal" style="--i:${i}"><time>${p.time}</time><span class="timeline__dot" aria-hidden="true"></span><p>${p.title}</p></li>`)}
        </ol>
      </section>` : ''}

      <section class="section venue">
        ${head('Manzil', v.name)}
        ${royal ? html`<img class="venue__building" src="/images/building.webp" alt="" width="731" height="255" loading="lazy" />` : ''}
        <p class="venue__address">${raw(ICON.pin)}<span>${v.address}</span></p>
        ${v.googleMaps || v.yandexMaps ? html`<div class="btn-row">
          ${v.googleMaps ? html`<a class="btn btn--solid" href="${v.googleMaps}" target="_blank" rel="noopener">${raw(ICON.pin)}<span>Google xarita</span></a>` : ''}
          ${v.yandexMaps ? html`<a class="btn btn--solid" href="${v.yandexMaps}" target="_blank" rel="noopener">${raw(ICON.pin)}<span>Yandex xarita</span></a>` : ''}
        </div>` : ''}
      </section>

      ${dress ? html`
      <section class="section dress">
        ${head('Dress-kod', 'Kiyim ranglari')}
        ${dress.text ? html`<p class="lead">${dress.text}</p>` : ''}
        ${dress.colors?.length ? html`<div class="swatches">${dress.colors.map((col, i) => html`<span class="swatch reveal" style="--c:${col};--i:${i}" title="${col}"></span>`)}</div>` : ''}
      </section>` : ''}

      ${c.rsvp?.enabled ? html`
      <section class="section rsvp" id="rsvp">
        <div class="paper">
          ${head('Javobingiz', 'Kela olasizmi?')}
          <p class="lead">Iltimos, javobingizni qoldiring — bu biz uchun juda muhim.</p>
          <form class="form" id="rsvp-form" novalidate>
            <label class="field"><span>Ismingiz</span><input name="name" autocomplete="name" maxlength="80" required placeholder="Ism va familiya" /></label>
            <fieldset class="choice">
              <legend>Kela olasizmi?</legend>
              <label><input type="radio" name="attending" value="yes" /><span>Albatta boraman</span></label>
              <label><input type="radio" name="attending" value="no" /><span>Afsuski, bora olmayman</span></label>
            </fieldset>
            <label class="field" id="guests-field" hidden><span>Necha kishi bo‘lasiz?</span>
              <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} kishi</option>`)}</select>
            </label>
            <label class="field"><span>Tilagingiz <em>(ixtiyoriy)</em></span><textarea name="message" rows="3" maxlength="500" placeholder="Yosh oilaga eng ezgu tilaklaringiz…"></textarea></label>
            <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
            <button class="btn btn--solid btn--wide" type="submit"><span>Yuborish</span></button>
            <p class="form__status" id="rsvp-status" role="status" aria-live="polite"></p>
            ${d.rsvpClosesAt ? html`<p class="hint">Javob muddati: ${Number(c.rsvp.deadline.slice(8))}-${MONTHS[Number(c.rsvp.deadline.slice(5, 7)) - 1]}gacha</p>` : ''}
          </form>
          <div class="done" id="rsvp-done" hidden></div>
        </div>
        ${c.rsvp.showWishes === false ? '' : html`
        <div class="wishes" id="wishes" hidden>
          ${head('Tilaklar', 'Mehmonlarimiz tilaklari')}
          <ul class="wishes__list" id="wishes-list"></ul>
        </div>`}
      </section>` : ''}

      <section class="final">
        <img class="final__heart" src="/images/heart.webp" alt="" width="260" height="236" loading="lazy" />
        <p class="final__lead">${t.closing || 'Tashrifingiz biz uchun katta sharaf!'}</p>
        <p class="final__names">${d.groom} <i>&amp;</i> ${d.bride}</p>
        ${c.hosts ? html`<p class="final__hosts">${c.hosts}</p>` : ''}
        ${contacts.length ? html`<div class="contacts">${contacts.map((ct) => html`<a class="btn" href="tel:${ct.phone.replace(/[^\d+]/g, '')}">${raw(ICON.phone)}<span>${ct.name}: ${ct.phone}</span></a>`)}</div>` : ''}
        ${brandLink()}
      </section>
    </main>
    <audio id="music" loop preload="none"></audio>
  `.value;
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
      if (cells[k].textContent !== txt) cells[k].textContent = txt;
    }
    return true;
  };
  if (tick()) {
    const id = scope.every(() => {
      if (!tick()) clearInterval(id);
    }, 1000);
  }
}

/* ------------------------------------ Taqvimga qo'shish ------------------------------------ */
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

/* ------------------------------------ Paydo bo'lish ------------------------------------ */
function initReveal() {
  const els = $$('.section, .reveal, .final');
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
    { threshold: 0.15 },
  ));
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------ To'kilayotgan gulbarglar ------------------------------------ */
function startPetals(theme) {
  const host = $('#petals');
  if (!host || reduced) return;
  const make = () => {
    if (document.hidden || host.childElementCount > 14) return;
    const p = document.createElement('i');
    p.className = theme === 'royal' ? 'petal petal--gold' : 'petal';
    const size = theme === 'royal' ? 4 + Math.random() * 5 : 14 + Math.random() * 14;
    p.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;--dur:${9 + Math.random() * 8}s;--drift:${Math.round(Math.random() * 120 - 60)}px;--spin:${Math.round(Math.random() * 540 - 270)}deg`;
    host.append(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  };
  for (let i = 0; i < 5; i++) scope.later(make, i * 500);
  scope.every(make, 1400);
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
  const thanks = (a, name) => (a === 'yes' ? `Rahmat, ${name}! Sizni to‘yda intizorlik bilan kutamiz.` : `Rahmat, ${name}! Xabar berganingiz uchun minnatdormiz.`);
  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<img class="done__icon" src="/images/heart.webp" alt="" width="260" height="236" /><p>${text}</p>${withChange ? html`<button class="link" type="button" id="rsvp-change">Javobni o‘zgartirish</button>` : ''}`.value;
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
  if ((d.rsvpClosesAt && now > d.rsvpClosesAt.getTime()) || now >= d.start.getTime()) showDone('Javoblar qabul qilish muddati tugagan. Tilaklaringiz uchun rahmat!', false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));

  function sync() {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
  }
  form.addEventListener('change', sync);
  sync();
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  // Mehmonlar tilaklari
  const box = $('#wishes');
  const list = $('#wishes-list');
  const known = new Set();
  function addWish(w, { fresh = false } = {}) {
    if (!box || !w?.name || !w?.message) return;
    const key = `${w.name}|${w.message}`;
    if (known.has(key)) return;
    known.add(key);
    box.hidden = false;
    const li = document.createElement('li');
    li.className = 'wish';
    li.innerHTML = html`<p>${w.message}</p><b>— ${w.name}</b>`.value;
    fresh ? list.prepend(li) : list.append(li);
  }
  async function loadWishes() {
    if (!box) return;
    if (preview) {
      [
        { name: 'Mehmon', message: 'Baxtingiz abadiy, oilangiz mustahkam bo‘lsin!' },
        { name: 'Do‘stingiz', message: 'Xonadoningiz nurga, qalbingiz mehrga to‘la bo‘lsin.' },
      ].forEach((w) => addWish(w));
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
  if (!preview && box) scope.every(() => !document.hidden && loadWishes(), 45000);

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
      showDone(thanks(data.attending, data.name));
      if (data.message) addWish({ name: data.name, message: data.message }, { fresh: true });
    } catch {
      setStatus('Internet aloqasini tekshirib, qayta urinib ko‘ring.', true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountIvory(c, { preview = false, theme = 'ivory' } = {}) {
  newScope();
  if (!THEMES.includes(theme)) theme = 'ivory';
  document.documentElement.dataset.theme = theme;
  const d = deriveConfig(c);
  const app = $('#app');
  try {
    await Promise.race([document.fonts.load('48px "Great Vibes"'), new Promise((r) => setTimeout(r, 2000))]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  const y = window.scrollY;
  app.innerHTML = renderPage(c, d, theme);
  initCountdown(d);
  initCalendar(c, d);
  initReveal();
  initRsvp(c, d, preview);

  const gate = $('#gate');
  if (preview) {
    gate.remove();
    $('#music-toggle')?.remove();
    document.body.classList.add('is-open');
    window.scrollTo(0, y);
    return;
  }
  const music = initMusic(musicUrlOf(c));
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  const btn = $('#gate-open');
  btn.focus({ preventScroll: true });
  btn.addEventListener('click', () => {
    window.scrollTo(0, 0);
    music.play();
    gate.classList.add('is-opening');
    scope.later(() => {
      gate.remove();
      document.documentElement.classList.remove('is-locked');
      document.body.classList.add('is-open');
      $('#music-toggle').hidden = false;
      startPetals(theme);
    }, reduced ? 100 : 1400);
  }, { once: true });
}
