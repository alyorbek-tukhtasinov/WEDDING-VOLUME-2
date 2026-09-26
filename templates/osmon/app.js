// "To'y kechasining osmoni" shabloni: sahifa ortida to'y kechasining haqiqiy osmoni,
// ismlar — yulduz turkumi, har bir tilak — osmonda yangi yulduz.
// mountOsmon() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import './fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, MONTHS } from '../../src/lib/config.js';
import { parseMapInput } from '../../src/lib/maps.js';
import { html, raw, esc } from '../../src/lib/dom.js';
import { nightMoment, directionName } from './sky/astro.js';
import { createSky } from './sky/scene.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const pad = (n) => String(n).padStart(2, '0');
const TASHKENT = { lat: 41.3111, lng: 69.2797 };

/* ---------------------------- Qayta chizish uchun tozalash ---------------------------- */
// Panel ko'rinishida sahifa har o'zgarishda qayta chiziladi: eski hodisalar, taymerlar va
// kuzatuvchilar shu yerda yig'ilib, keyingi chizishdan oldin o'chiriladi.
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
    observe(obs) {
      observers.add(obs);
      return obs;
    },
    abort() {
      ac.abort();
      timers.forEach((id) => clearInterval(id));
      observers.forEach((o) => o.disconnect());
    },
  };
  return scope;
}

/** Osmon qaysi nuqtadan ko'rsatiladi: config.sky → to'yxona xaritasi → Toshkent. */
function skyPlace(c) {
  const lat = Number(c.sky?.lat);
  const lng = Number(c.sky?.lng);
  if (c.sky?.lat != null && c.sky.lat !== '' && Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, city: c.sky?.city || '' };
  for (const src of [c.venue?.googleMaps, c.venue?.yandexMaps, c.venue?.mapEmbed]) {
    const p = parseMapInput(src || '');
    if (p.ok && Number.isFinite(p.lat)) return { lat: p.lat, lng: p.lng, city: c.sky?.city || '' };
  }
  return { ...TASHKENT, city: c.sky?.city || '' };
}

const fmtTime = (date, tz) => {
  // To'y vaqt zonasidagi soat (mehmon qayerda bo'lishidan qat'i nazar)
  const [, sign, hh, mm] = /([+-])(\d\d):(\d\d)/.exec(tz) || [0, '+', '05', '00'];
  const off = (sign === '-' ? -1 : 1) * (Number(hh) * 60 + Number(mm));
  const t = new Date(date.getTime() + off * 60e3);
  return `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
};
const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

/* --------------------------------- Sahifa --------------------------------- */
const ICON = {
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-2.8z" fill="currentColor"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  planet: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/><ellipse cx="12" cy="12" rx="10.5" ry="3.6" transform="rotate(-20 12 12)" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  stars: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3l1 3.5L12.5 8 9 9 8 12.5 7 9 3.5 8 7 6.5zM17 11l.8 2.7 2.7.8-2.7.8L17 18l-.8-2.7-2.7-.8 2.7-.8zM10 16l.6 1.9 1.9.6-1.9.6L10 21l-.6-1.9-1.9-.6 1.9-.6z" fill="currentColor"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
};

/** "Shu kechaning osmoni" faktlari (osmon hisoblangach to'ldiriladi). */
function factsHtml(info) {
  if (!info) {
    return html`<ul class="facts facts--loading" aria-busy="true">
      ${['Oy', 'Sayyoralar', 'Yulduzlar'].map((t, i) => html`<li><span class="facts__icon">${raw([ICON.moon, ICON.planet, ICON.stars][i])}</span><div><b>${t}</b><p class="muted">osmon hisoblanmoqda…</p></div></li>`)}
    </ul>`;
  }
  const moonFact = info.moon.alt > 0
    ? html`${info.moon.phase} · ${Math.round(info.moon.illumination * 100)}% yoritilgan<br /><span class="muted">${directionName(info.moon.az)} tomonda, ufqdan ${Math.round(info.moon.alt)}° balandda</span>`
    : html`Oy bu kecha ufq ostida<br /><span class="muted">shuning uchun yulduzlar yanada yorqin</span>`;
  const planetsFact = info.planets.length
    ? html`${info.planets.map((p) => p.name).join(', ')}<br /><span class="muted">${info.planets.map((p) => `${p.name} — ${directionName(p.az)}da`).join(' · ')}</span>`
    : html`Bu kecha sayyoralar ufq ostida<br /><span class="muted">osmonda faqat yulduzlar</span>`;
  return html`<ul class="facts">
    <li><span class="facts__icon">${raw(ICON.moon)}</span><div><b>Oy</b><p>${moonFact}</p></div></li>
    <li><span class="facts__icon">${raw(ICON.planet)}</span><div><b>Sayyoralar</b><p>${planetsFact}</p></div></li>
    <li><span class="facts__icon">${raw(ICON.stars)}</span><div><b>Yulduzlar</b><p>Oddiy ko‘z bilan ${num(info.visibleStars)} ta yulduz<br /><span class="muted">shahar chiroqlari bo‘lmasa, albatta</span></p></div></li>
  </ul>`;
}

/** when — { shifted, time }: osmon qaysi payt uchun ko'rsatiladi (osmondan oldin ma'lum). */
function renderPage(c, d, place, when) {
  const t = c.texts || {};
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const dress = c.dressCode?.text?.trim() || c.dressCode?.colors?.length ? c.dressCode : null;
  const contacts = (c.contacts || []).filter((x) => x?.name && x?.phone);
  const venue = c.venue;
  const gmap = venue.googleMaps || '';
  const ymap = venue.yandexMaps || '';
  const dateLine = `${d.day}-${MONTHS[d.month - 1]}, ${d.year}`;
  const weekday = d.weekdayName.charAt(0).toUpperCase() + d.weekdayName.slice(1);
  const words = (s) => raw(esc(s).split(/(\s+)/).map((w) => (/\S/.test(w) ? `<span class="w">${w}</span>` : w)).join(''));
  const sectionHead = (eyebrow, title) => html`<p class="eyebrow">${eyebrow}</p><h2 class="title">${title}</h2>`;

  return html`
    <div class="sky" id="sky"></div>
    <div class="veil" aria-hidden="true"></div>

    <div class="gate" id="gate">
      <div class="gate__inner">
        <span class="gate__star">${raw(ICON.star)}</span>
        <p class="eyebrow">${t.heroCaption || 'Nikoh to‘yiga taklifnoma'}</p>
        <p class="gate__lead">Sizni bir kechaga<br />taklif qilamiz</p>
        <p class="gate__date">${dateLine}</p>
        <button class="gate__btn" id="gate-open" type="button"><span>Osmonni ochish</span></button>
        <p class="gate__hint">${raw(ICON.music)} ovoz bilan tomosha qiling</p>
      </div>
    </div>

    <button class="fab fab--music" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <button class="fab fab--explore" id="explore-open" type="button" aria-label="Osmonni tomosha qilish" hidden>${raw(ICON.compass)}</button>

    <main class="story" id="story">
      <section class="scene scene--hero" data-view="hero" aria-label="Taklifnoma">
        <h1 class="sr-only">${d.names}</h1>
        <p class="eyebrow hero__eyebrow">${t.heroCaption || 'Nikoh to‘yiga taklifnoma'}</p>
        <div class="hero__foot">
          <p class="hero__date"><span>${weekday}</span><b>${pad(d.day)} · ${pad(d.month)} · ${d.year}</b><span>soat ${c.event.time}</span></p>
          <p class="hero__scroll" aria-hidden="true"><i></i>Pastga suring</p>
        </div>
      </section>

      <section class="scene" data-view="invite">
        <div class="card reveal">
          <span class="card__star">${raw(ICON.star)}</span>
          <p class="eyebrow">${t.greeting || 'Hurmatli mehmonimiz!'}</p>
          <p class="invite__text words">${words(t.invitation || `Sizni farzandlarimiz ${d.groom} va ${d.bride}ning nikoh to‘yi marosimiga taklif etamiz.`)}</p>
          <div class="invite__names">
            <span>${d.groom}</span><em>&amp;</em><span>${d.bride}</span>
          </div>
          <p class="invite__meta">${weekday}, ${dateLine} · soat ${c.event.time}</p>
          ${c.hosts ? html`<p class="invite__hosts"><span>Hurmat bilan,</span>${c.hosts}</p>` : ''}
        </div>
      </section>

      <section class="scene scene--low" data-view="sky">
        <div class="card reveal">
          ${sectionHead('Shu kechaning osmoni', when.shifted ? `${dateLine}, soat ${when.time}` : `${dateLine}, soat ${c.event.time}`)}
          <p class="lead">Bu osmon — bezak emas. Yulduzlar, Oy va sayyoralar to‘y kechasi ${place.city ? `${place.city} osmonida` : `${venue.name} ustida`} qanday joylashsa, aynan shunday chizilgan.</p>
          <div id="sky-facts">${factsHtml(null)}</div>
          ${when.shifted ? html`<p class="note">To‘y yorug‘ paytda boshlanadi — shuning uchun osmon o‘sha oqshom yulduzlar to‘liq chiqqan paytdagidek (soat ${when.time}) ko‘rsatilgan.</p>` : ''}
          <button class="btn btn--ghost" type="button" data-explore hidden>${raw(ICON.compass)}<span>Osmonni aylantirib ko‘rish</span></button>
        </div>
      </section>

      <section class="scene" data-view="countdown">
        <div class="card card--clear reveal">
          ${sectionHead('To‘yga qadar', 'Har bir yulduz — kutilgan bir lahza')}
          <div class="countdown" id="countdown" role="timer" aria-live="off">
            ${['kun', 'soat', 'daqiqa', 'soniya'].map((u) => html`<div class="countdown__cell"><b data-unit="${u}">00</b><span>${u}</span></div>`)}
          </div>
          <p class="countdown__done" id="countdown-done" hidden>To‘y kechasi keldi — biz bilan bo‘lganingiz uchun rahmat!</p>
          <div class="btn-row">
            <a class="btn btn--ghost" id="gcal" target="_blank" rel="noopener">${raw(ICON.calendar)}<span>Google taqvim</span></a>
            <button class="btn btn--ghost" id="ics" type="button">${raw(ICON.calendar)}<span>Telefon taqvimi</span></button>
          </div>
        </div>
      </section>

      ${program.length ? html`
      <section class="scene" data-view="program">
        <div class="card reveal">
          ${sectionHead('Kecha dasturi', 'Yulduzlar yo‘li')}
          <ol class="timeline">
            ${program.map((p, i) => html`<li style="--i:${i}"><time>${p.time}</time><span class="timeline__dot" aria-hidden="true"></span><p>${p.title}</p></li>`)}
          </ol>
        </div>
      </section>` : ''}

      <section class="scene" data-view="venue">
        <div class="card reveal">
          ${sectionHead('Manzil', venue.name)}
          <p class="venue__address">${raw(ICON.pin)}<span>${venue.address}</span></p>
          ${gmap || ymap ? html`<div class="btn-row">
            ${gmap ? html`<a class="btn" href="${gmap}" target="_blank" rel="noopener">Google xarita</a>` : ''}
            ${ymap ? html`<a class="btn" href="${ymap}" target="_blank" rel="noopener">Yandex xarita</a>` : ''}
          </div>` : ''}
          ${dress ? html`<div class="dress">
            <p class="eyebrow">Dress-kod</p>
            ${dress.text ? html`<p class="dress__text">${dress.text}</p>` : ''}
            ${dress.colors?.length ? html`<div class="dress__colors">${dress.colors.map((col) => html`<span style="--c:${col}" title="${col}"></span>`)}</div>` : ''}
          </div>` : ''}
        </div>
      </section>

      ${c.rsvp?.enabled ? html`
      <section class="scene scene--low" data-view="wishes" id="wishes">
        <div class="card reveal">
          ${sectionHead('Tilaklar osmoni', 'Tilagingizni osmonga yo‘llang')}
          <p class="lead">Javobingizni qoldiring. Yozgan tilagingiz fonar bo‘lib ko‘tariladi va shu osmonda yangi yulduz bo‘lib yonadi.</p>
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
            <button class="btn btn--gold" type="submit"><span>Yuborish</span></button>
            <p class="form__status" id="rsvp-status" role="status" aria-live="polite"></p>
            ${d.rsvpClosesAt ? html`<p class="form__deadline">Javob muddati: ${Number(c.rsvp.deadline.slice(8))}-${MONTHS[Number(c.rsvp.deadline.slice(5, 7)) - 1]}gacha</p>` : ''}
          </form>
          <div class="done" id="rsvp-done" hidden></div>
          <div class="wishes" id="wish-list" hidden>
            <p class="eyebrow"><span id="wish-count">0</span> ta tilak — osmonda yulduz bo‘lib yonmoqda</p>
            <ul></ul>
          </div>
        </div>
      </section>` : ''}

      <section class="scene scene--final" data-view="final">
        <p class="final__lead">${t.closing || 'Tashrifingiz biz uchun katta sharaf!'}</p>
        <div class="final__foot">
          ${c.hosts ? html`<p class="final__hosts"><span>Hurmat bilan,</span>${c.hosts}</p>` : ''}
          ${contacts.length ? html`<div class="contacts">${contacts.map((ct) => html`<a href="tel:${ct.phone.replace(/[^\d+]/g, '')}">${raw(ICON.phone)}<span><b>${ct.name}</b>${ct.phone}</span></a>`)}</div>` : ''}
          <p class="credit">Osmon to‘y kechasi uchun astronomik hisoblangan · Yulduzlar katalogi: Yale BSC</p>
        </div>
      </section>
    </main>

    <div class="explore" id="explore" hidden>
      <p class="explore__hint">Barmoq bilan suring — osmon aylanadi. Ikki barmoq — yaqinlashtirish.</p>
      <div class="explore__bar">
        <button class="chip" id="toggle-lines" type="button" aria-pressed="false">${raw(ICON.stars)}<span>Yulduz turkumlari</span></button>
        <button class="chip chip--close" id="explore-close" type="button">${raw(ICON.close)}<span>Yopish</span></button>
      </div>
    </div>
    <div class="tip" id="tip" role="dialog" aria-live="polite" hidden></div>
    <audio id="music" loop preload="none"></audio>
  `.value;
}

/* ------------------------------ Hisoblagich ------------------------------ */
function initCountdown(d) {
  const cells = Object.fromEntries($$('[data-unit]').map((el) => [el.dataset.unit, el]));
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
    for (const [k, v] of Object.entries(vals)) {
      const txt = k === 'kun' ? String(v) : pad(v);
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

const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function initCalendar(c, d) {
  const title = `${d.names} — to‘y`;
  const where = `${c.venue.name}, ${c.venue.address}`;
  const details = `${c.texts?.invitation || ''}\n\n${location.href}`;
  const gcal = $('#gcal');
  if (gcal) {
    gcal.href = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${utcStamp(d.start)}/${utcStamp(d.end)}`, details, location: where })}`;
  }
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

/* --------------------------------- Musiqa --------------------------------- */
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

/* ------------------------------ Paydo bo'lish ------------------------------ */
function initReveal() {
  const els = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = scope.observe(new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        // So'zlar yulduzdek birin-ketin yonadi
        $$('.w', e.target).forEach((w, i) => (w.style.transitionDelay = `${0.25 + i * 0.045}s`));
        io.unobserve(e.target);
      }
    },
    { threshold: 0.18 },
  ));
  els.forEach((el) => io.observe(el));
}

/* ----------------------------------- Ishga tushirish ----------------------------------- */
// Oldingi chizishdagi osmon: sana, joy va ismlar o'zgarmasa qayta hisoblanmaydi (panel ko'rinishi)
let kept = null;

const SAMPLE_WISHES = [
  { name: 'Mehmon', message: 'Baxtingiz shu osmondagi yulduzlardek abadiy bo‘lsin!' },
  { name: 'Do‘stingiz', message: 'Oilangiz mustahkam, xonadoningiz nurga to‘la bo‘lsin.' },
  { name: 'Qarindoshingiz', message: 'Qo‘sha qaringlar!' },
];

/**
 * Sahifani chizish. preview — boshqaruv paneli ko'rinishi: kirish pardasisiz, musiqasiz,
 * ismlar darhol chiziladi, javob formasi yuborilmaydi.
 */
export async function mountOsmon(c, { preview = false } = {}) {
  const sc = newScope();
  const d = deriveConfig(c);
  const place = skyPlace(c);
  const tz = c.event.timezone || '+05:00';
  const moment = nightMoment(d.start, place.lat, place.lng);
  const key = JSON.stringify([moment.date.getTime(), place.lat, place.lng, d.groom, d.bride]);

  // Sahifa va kirish pardasi darhol chiziladi; osmon (yulduzlar ma'lumoti ~300 KB) orqada yuklanadi —
  // sekin mobil internetda ham ekran bo'sh turmaydi
  const app = $('#app');
  const y = window.scrollY;
  const reuse = kept && kept.key === key ? kept : null;
  if (kept && !reuse) {
    kept.sky?.destroy();
    kept = null;
  }
  reuse?.root.remove();
  if (!preview) document.documentElement.classList.add('is-locked');
  app.innerHTML = renderPage(c, d, place, { shifted: moment.shifted, time: fmtTime(moment.date, tz) });
  if (reuse) $('#sky').replaceWith(reuse.root);

  let sky = null;
  let opened = preview;
  initCountdown(d);
  initCalendar(c, d);
  initReveal();
  const music = preview ? { play() {} } : initMusic(musicUrlOf(c));
  const scroller = initScroll(() => sky);
  const wishes = c.rsvp?.enabled ? initWishes(c, d, () => sky, preview) : null;

  const gate = $('#gate');
  if (preview) {
    gate.remove();
    $('#music-toggle')?.remove();
    document.body.classList.add('is-open');
    $$('.fab').forEach((b) => (b.hidden = false));
    window.scrollTo(0, y);
  } else {
    const openBtn = $('#gate-open');
    requestAnimationFrame(() => gate.classList.add('is-ready'));
    openBtn.focus({ preventScroll: true });
    const open = () => {
      if (opened) return;
      opened = true;
      window.scrollTo(0, 0);
      music.play();
      gate.classList.add('is-leaving');
      sky?.setNight(1);
      setTimeout(() => sky?.startNames(), reduced ? 0 : 900);
      setTimeout(() => {
        gate.remove();
        document.documentElement.classList.remove('is-locked');
        document.body.classList.add('is-open');
        $$('.fab').forEach((b) => (b.hidden = false));
        scroller.refresh();
      }, reduced ? 200 : 1400);
    };
    openBtn.addEventListener('click', open);
  }

  try {
    const s = reuse?.sky || (await createSky({ root: $('#sky'), date: moment.date, lat: place.lat, lng: place.lng, groom: d.groom, bride: d.bride, reduced, instant: preview }));
    if (sc !== scope) {
      // Osmon hisoblanayotganda sahifa qayta chizildi — bu natija endi kerak emas
      if (!reuse) s.destroy();
      return;
    }
    sky = s;
    kept = { key, sky: s, root: $('#sky') };
    if (new URLSearchParams(location.search).has('debug')) window.__sky = s;
    $('#sky-facts').innerHTML = factsHtml({ ...s.stats }).value;
    s.setExplore(false);
    if (!reuse) s.setNight(opened ? 1 : 0, true);
    if (opened) s.startNames();
    initExplore(s, scroller);
    scroller.refresh();
    wishes?.skyReady();
    document.documentElement.classList.add('sky-ready');
  } catch (err) {
    if (sc !== scope) return;
    console.error('Osmonni chizib bo‘lmadi:', err);
    $('#sky-facts').innerHTML = '';
    initExplore(null, scroller);
    document.documentElement.classList.add('no-sky');
  }
}

/* -------------------------- Kamera — sahifa aylantirilishi bilan -------------------------- */
function initScroll(getSky) {
  const sections = $$('[data-view]');
  let anchors = [];
  let enabled = true;
  const measure = () => {
    const vh = window.innerHeight;
    // Sahifa qulflangan (kirish pardasi) paytda ham to'g'ri: balandlik hikoya elementidan olinadi
    const maxY = Math.max(0, $('#story').getBoundingClientRect().bottom + window.scrollY - vh);
    anchors = sections.map((s, i) => {
      if (i === 0) return 0;
      if (s.dataset.view === 'final') return Math.min(maxY, s.getBoundingClientRect().top + window.scrollY);
      const el = $('.card', s) || s;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      // "Past" bo'limlar: karta ekranning 42% idan boshlanadi — tepada osmondagi obyekt ko'rinadi
      if (s.classList.contains('scene--low')) return Math.min(maxY, Math.max(0, top - vh * 0.42));
      return Math.min(maxY, Math.max(0, top + r.height / 2 - vh * 0.5));
    });
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  };
  let current = '';
  let lastSky = null;
  const update = () => {
    const sky = getSky();
    if (!sky || !enabled) return;
    if (sky !== lastSky) {
      lastSky = sky;
      current = '';
    }
    const views = sky.views();
    const y = window.scrollY;
    let i = 0;
    while (i < anchors.length - 1 && y >= anchors[i + 1]) i++;
    let view;
    if (i >= anchors.length - 1) view = views[sections[i].dataset.view];
    else {
      const t = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
      const e = smooth(clamp((t - 0.12) / 0.76, 0, 1));
      view = sky.blend(views[sections[i].dataset.view], views[sections[i + 1].dataset.view], e);
    }
    sky.setView(view);
    // Faol bo'lim: "osmon" bo'limida Oy va sayyoralar nomlari ko'rinadi
    const near = y - anchors[i] < (anchors[i + 1] ?? Infinity) - y ? i : i + 1;
    const name = sections[Math.min(near, sections.length - 1)].dataset.view;
    if (name !== current) {
      current = name;
      sky.showLabels(name === 'sky');
      sky.setNamesAlpha(name === 'hero' || name === 'final' ? 1 : name === 'invite' ? 0.3 : 0.08);
      document.body.dataset.active = name;
    }
  };
  measure();
  update();
  scope.on(window, 'scroll', update, { passive: true });
  // Osmon sahnasi o'z o'lchamini ResizeObserver'da yangilaydi — undan keyin (keyingi kadrda) hisoblaymiz
  scope.on(window, 'resize', () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      measure();
      update();
    }));
  });
  // Shriftlar yuklanib, balandliklar o'zgarganda
  document.fonts?.ready.then(() => {
    measure();
    update();
  });
  scope.observe(new ResizeObserver(() => {
    measure();
    update();
  })).observe($('#story'));
  return {
    refresh() {
      measure();
      update();
    },
    pause() {
      enabled = false;
    },
    resume() {
      enabled = true;
      update();
    },
  };
}

/* ------------------------------- Tomosha rejimi ------------------------------- */
function initExplore(sky, scroller) {
  const panel = $('#explore');
  const tip = $('#tip');
  const lines = $('#toggle-lines');
  if (!sky) {
    $('#explore-open')?.remove();
    $$('[data-explore]').forEach((b) => b.remove());
    return;
  }
  $$('[data-explore]').forEach((b) => (b.hidden = false));
  let active = false;
  let hintTimer = 0;
  const open = () => {
    active = true;
    scroller.pause();
    document.body.classList.add('is-exploring');
    document.documentElement.classList.add('is-locked');
    panel.hidden = false;
    sky.setExplore(true);
    sky.showLabels(true);
    sky.setNamesAlpha(1);
    panel.classList.remove('hint-off');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => panel.classList.add('hint-off'), 4500);
    $('#explore-close').focus({ preventScroll: true });
  };
  const close = () => {
    active = false;
    sky.setExplore(false);
    sky.showConstellations(false);
    sky.setNamesAlpha(document.body.dataset.active === 'hero' || document.body.dataset.active === 'final' ? 1 : 0.08);
    lines.setAttribute('aria-pressed', 'false');
    document.body.classList.remove('is-exploring');
    document.documentElement.classList.remove('is-locked');
    panel.hidden = true;
    hideTip();
    scroller.resume();
  };
  $('#explore-open').addEventListener('click', open);
  $$('[data-explore]').forEach((b) => b.addEventListener('click', open));
  $('#explore-close').addEventListener('click', close);
  scope.on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      if (!tip.hidden) hideTip();
      else if (active) close();
    }
  });
  lines.addEventListener('click', () => {
    const on = lines.getAttribute('aria-pressed') !== 'true';
    lines.setAttribute('aria-pressed', String(on));
    sky.showConstellations(on);
  });

  // Tilak yulduzini bosish — kim yozgani va tilak matni
  function hideTip() {
    tip.hidden = true;
    tip.classList.remove('is-in');
  }
  sky.onPick((hit) => {
    if (!hit) return hideTip();
    const w = hit.wish;
    tip.innerHTML = html`<b>${w.name}</b><p>${w.message}</p>`.value;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    const x = clamp(hit.x - r.width / 2, 12, window.innerWidth - r.width - 12);
    const below = hit.y - r.height - 18 < 12;
    const y = below ? hit.y + 18 : hit.y - r.height - 18;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    requestAnimationFrame(() => tip.classList.add('is-in'));
  });
  scope.on(window, 'scroll', () => !tip.hidden && hideTip(), { passive: true });
}

/* ------------------------------ Javob va tilaklar ------------------------------ */
function initWishes(c, d, getSky, preview = false) {
  const form = $('#rsvp-form');
  const status = $('#rsvp-status');
  const doneBox = $('#rsvp-done');
  const guestsField = $('#guests-field');
  const listBox = $('#wish-list');
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
  const known = new Map();
  let mine = null;

  const thanks = (a, name) =>
    a === 'yes'
      ? `Rahmat, ${name}! Sizni to‘y kechasida intizorlik bilan kutamiz.`
      : `Rahmat, ${name}! Xabar berganingiz uchun minnatdormiz — duolaringiz biz bilan.`;
  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<span class="done__star">${raw(ICON.star)}</span><p>${text}</p>${withChange ? html`<button class="link" type="button" id="rsvp-change">Javobni o‘zgartirish</button>` : ''}`.value;
    $('#rsvp-change')?.addEventListener('click', () => {
      doneBox.hidden = true;
      form.hidden = false;
      if (saved) {
        form.elements.namedItem('name').value = saved.name || '';
        for (const r of form.querySelectorAll('[name="attending"]')) r.checked = r.value === saved.attending;
        form.elements.namedItem('guests').value = saved.guests || '1';
        form.elements.namedItem('message').value = saved.message || '';
        syncForm();
      }
      form.elements.namedItem('name').focus();
    });
  };

  const now = Date.now();
  const closed = (d.rsvpClosesAt && now > d.rsvpClosesAt.getTime()) || now >= d.start.getTime();
  if (closed) showDone('Javoblar qabul qilish muddati tugagan. Tilaklaringiz uchun rahmat!', false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));

  const submitLabel = $('button[type="submit"] span', form);
  function syncForm() {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
    submitLabel.textContent = form.elements.namedItem('message').value.trim() ? 'Fonarni osmonga uchirish' : 'Javobni yuborish';
  }
  form.addEventListener('change', syncForm);
  form.addEventListener('input', syncForm);
  syncForm();

  const setStatus = (text, isError = false, focusEl) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
    focusEl?.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (preview) return setStatus('Ko‘rinish rejimi — javob yuborilmaydi.');
    const data = Object.fromEntries(new FormData(form));
    data.name = (data.name || '').trim();
    data.message = (data.message || '').trim();
    if (data.name.length < 2) return setStatus('Iltimos, ismingizni kiriting.', true, form.elements.namedItem('name'));
    if (!data.attending) return setStatus('Iltimos, kela olishingizni belgilang.', true);
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    setStatus('Yuborilmoqda…');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: guestId, couple: d.names }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setStatus(json.error === 'not_configured' ? 'Hozircha javobni qabul qilib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.' : 'Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.', true);
        return;
      }
      const { website, ...answer } = data;
      saved = { ...answer, id: guestId };
      store.set(saved);
      setStatus('');
      if (data.message && getSky()) {
        await releaseLantern(btn, { name: data.name, message: data.message });
      }
      showDone(thanks(data.attending, data.name));
      refresh();
    } catch {
      setStatus('Internet aloqasini tekshirib, qayta urinib ko‘ring.', true);
    } finally {
      btn.disabled = false;
    }
  });

  /** Fonar tugmadan ko'tarilib, osmondagi yangi yulduz joyiga uchadi va yulduzga aylanadi. */
  function releaseLantern(fromEl, wish) {
    const key = `mine|${guestId}|${wish.message.slice(0, 24)}`;
    mine = { ...wish, key };
    const sky = getSky();
    sky.setWishes([{ ...wish, key, self: true, animate: true, delay: 999 }]);
    const r = fromEl.getBoundingClientRect();
    // Sahifa osmon ochiladigan joyga suriladi: tilak yulduzlari karta ustida ko'rinadi
    const card = fromEl.closest('.card');
    if (card) {
      const top = card.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.42;
      window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
    }
    const lantern = document.createElement('div');
    lantern.className = 'lantern';
    lantern.innerHTML = '<i></i>';
    document.body.append(lantern);
    const x0 = r.left + r.width / 2;
    const y0 = r.top;
    const dur = reduced ? 400 : 3600;
    const t0 = performance.now();
    const sway = (Math.random() < 0.5 ? -1 : 1) * 28;
    return new Promise((resolve) => {
      const frame = (now) => {
        const q = clamp((now - t0) / dur, 0, 1);
        const target = sky.wishPoint(key) || { x: x0, y: -40 };
        const e = 1 - Math.pow(1 - q, 2.2);
        // Egri yo'l: avval tik ko'tariladi, keyin yulduz tomon buriladi
        const cx = x0 + sway;
        const cy = y0 - (y0 - target.y) * 0.55;
        const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * target.x + Math.sin(q * 9) * 6 * (1 - q);
        const y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * target.y;
        const s = 1 - 0.78 * e;
        lantern.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
        lantern.style.opacity = String(q > 0.86 ? 1 - (q - 0.86) / 0.14 : clamp(q * 6, 0, 1));
        if (q < 1) requestAnimationFrame(frame);
        else {
          lantern.remove();
          sky.ignite(key);
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  function renderList() {
    const all = [...known.values()];
    listBox.hidden = !all.length;
    $('#wish-count').textContent = String(all.length + (mine && ![...known.values()].some((w) => w.message === mine.message && w.name === mine.name) ? 1 : 0));
    $('ul', listBox).innerHTML = all
      .slice(0, 40)
      .map((w) => html`<li><p>“${w.message}”</p><b>${w.name}</b></li>`.value)
      .join('');
  }

  async function refresh() {
    try {
      const json = preview ? { ok: true, wishes: SAMPLE_WISHES } : await (await fetch('/api/wishes', { cache: 'no-store' })).json();
      if (!json?.ok || !Array.isArray(json.wishes)) return;
      const fresh = [];
      for (const w of json.wishes) {
        const k = `${w.name}|${w.message}`;
        if (known.has(k)) continue;
        known.set(k, w);
        // O'zimizning tilak allaqachon fonar bilan qo'shilgan
        if (mine && mine.name === w.name && mine.message === w.message) continue;
        fresh.push({ name: w.name, message: w.message, at: w.at, key: k });
      }
      allFresh.push(...fresh);
      getSky()?.setWishes(fresh);
      renderList();
    } catch {
      /* tarmoq yo'q — keyingi safar */
    }
  }
  const allFresh = [];
  refresh();
  // Yangi tilaklar — sahifa ochiq turganda ham osmonda paydo bo'ladi
  if (!preview) scope.every(() => !document.hidden && refresh(), 45000);
  return {
    // Osmon keyinroq tayyor bo'lsa — oldin yuklangan tilaklar ham yulduz bo'ladi
    skyReady() {
      getSky()?.setWishes(allFresh);
    },
  };
}

