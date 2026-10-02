// "To'y kechasining osmoni" shabloni: sahifa ortida to'y kechasining haqiqiy osmoni,
// ismlar — yulduz turkumi, har bir tilak — osmonda yangi yulduz.
// mountOsmon() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import './fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, mediaUrl } from '../../src/lib/config.js';
import { parseMapInput } from '../../src/lib/maps.js';
import { html, raw, esc } from '../../src/lib/dom.js';
import brand from '@brand-config';
import { nightMoment } from './sky/astro.js';
import { STR, LANGS, siteLangs, localize, phaseName, dirName, brandText, textsFor } from './i18n.js';
import { introHtml, initIntro } from '../../src/lib/intro.js';
import { fixScriptGlyphs, scriptSafe } from '../../src/lib/i18n.js';
import { createSky } from './sky/scene.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const pad = (n) => String(n).padStart(2, '0');
const TASHKENT = { lat: 41.3111, lng: 69.2797 };
// Joriy til matnlari (mountOsmon'da o'rnatiladi)
let T = STR.uz;

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


/** Buyurtma uchun: taklifnoma muallifining Instagram manzili (brand.config.js). */
function brandLink() {
  if (!brand?.enabled) return '';
  return html`<a class="brand" href="${brand.url}" target="_blank" rel="noopener">
    ${brand.logo
      ? html`<img src="${brand.logo}" alt="" width="30" height="30" loading="lazy" />`
      : raw('<svg class="brand__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" /></svg>')}
    <span>${brandText(T, brand.text)}<b>${brand.name}</b></span>
  </a>`;
}

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
      ${[T.moon, T.planets, T.stars].map((t, i) => html`<li><span class="facts__icon">${raw([ICON.moon, ICON.planet, ICON.stars][i])}</span><div><b>${t}</b><p class="muted">${T.computing}</p></div></li>`)}
    </ul>`;
  }
  const moonFact = info.moon.alt > 0
    ? html`${phaseName(T, info.moon.illumination, info.moon.waxing)} · ${T.moonLit(Math.round(info.moon.illumination * 100))}<br /><span class="muted">${T.moonWhere(dirName(T, info.moon.az), Math.round(info.moon.alt))}</span>`
    : html`${T.moonDown}<br /><span class="muted">${T.moonDownNote}</span>`;
  const pname = (p) => T.planetNames[p.id] || p.name;
  const planetsFact = info.planets.length
    ? html`${info.planets.map(pname).join(', ')}<br /><span class="muted">${info.planets.map((p) => T.planetWhere(pname(p), dirName(T, p.az))).join(' · ')}</span>`
    : html`${T.planetsDown}<br /><span class="muted">${T.planetsDownNote}</span>`;
  return html`<ul class="facts">
    <li><span class="facts__icon">${raw(ICON.moon)}</span><div><b>${T.moon}</b><p>${moonFact}</p></div></li>
    <li><span class="facts__icon">${raw(ICON.planet)}</span><div><b>${T.planets}</b><p>${planetsFact}</p></div></li>
    <li><span class="facts__icon">${raw(ICON.stars)}</span><div><b>${T.stars}</b><p>${T.starsCount(num(info.visibleStars))}<br /><span class="muted">${T.starsNote}</span></p></div></li>
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
  const dateLine = T.dateLine(d.day, T.months[d.month - 1], d.year);
  const wd = T.weekdays[new Date(`${c.event.date}T12:00:00Z`).getUTCDay()];
  const weekday = wd.charAt(0).toUpperCase() + wd.slice(1);
  const langs = siteLangs(c);
  const langBtn = (cls) => (langs.length > 1 ? html`<div class="lang ${cls}" role="group" aria-label="${T.langSwitch}">${langs.map((l) => html`<button type="button" data-lang="${l}" aria-pressed="${String(LANGS[l].html === document.documentElement.lang)}" lang="${LANGS[l].html}">${LANGS[l].label}</button>`)}</div>` : '');
  const words = (s) => raw(esc(s).split(/(\s+)/).map((w) => (/\S/.test(w) ? `<span class="w">${w}</span>` : w)).join(''));
  const sectionHead = (eyebrow, title) => html`<p class="eyebrow">${eyebrow}</p><h2 class="title">${title}</h2>`;
  // Islomiy matnlar (ixtiyoriy): Bismilloh, oyat, duo. Berilmasa sahifa avvalgidek
  const isl = c.islamic || {};
  const bismillah = isl.bismillah?.trim() || '';
  const hasQuote = (q) => !!(q?.arabic?.trim() || q?.text?.trim());
  const verse = hasQuote(isl.verse) ? isl.verse : null;
  const skyVerse = hasQuote(isl.skyVerse) ? isl.skyVerse : null;
  const dua = hasQuote(isl.dua) ? isl.dua : null;
  const quote = (q, { big = false } = {}) => html`<figure class="ayah ${big ? 'ayah--big' : ''}">
    ${q.arabic?.trim() ? html`<p class="ayah__ar" lang="ar" dir="rtl" data-type>${q.arabic}</p>` : ''}
    ${q.reading?.trim() ? html`<p class="ayah__read" data-type>${q.reading}</p>` : ''}
    ${q.text?.trim() ? html`<blockquote class="ayah__text" data-type>${q.text}</blockquote>` : ''}
    ${q.source?.trim() ? html`<figcaption class="ayah__src" data-type>${q.source}</figcaption>` : ''}
  </figure>`;
  const ornament = raw(`<p class="ornament" aria-hidden="true"><i></i>${ICON.star}<i></i></p>`);

  return html`
    <div class="sky" id="sky"></div>
    <div class="veil" aria-hidden="true"></div>

    <div class="gate" id="gate">
      <div class="gate__inner">
        ${bismillah ? html`<p class="bismillah gate__bismillah" data-type>${bismillah}</p>` : ''}
        <span class="gate__star">${raw(ICON.star)}</span>
        <p class="eyebrow">${t.heroCaption || T.heroCaption}</p>
        <p class="gate__lead">${raw(T.gateLead)}</p>
        <p class="gate__date">${dateLine}</p>
        <button class="gate__btn" id="gate-open" type="button"><span>${T.gateBtn}</span></button>
        <p class="gate__hint">${raw(ICON.music)} ${T.gateHint}</p>
      </div>
      ${langBtn('lang--gate')}
    </div>

    ${c.introVideo ? raw(introHtml(mediaUrl(c.introVideo), T.skip)) : ''}

    <button class="fab fab--music" id="music-toggle" type="button" aria-label="${T.musicOn}" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <button class="fab fab--explore" id="explore-open" type="button" aria-label="${T.explore}" hidden>${raw(ICON.compass)}</button>
    ${langs.length > 1 ? html`<button class="fab fab--lang" id="lang-next" type="button" aria-label="${T.langSwitch}" hidden>${LANGS[langs[(langs.findIndex((l) => LANGS[l].html === document.documentElement.lang) + 1) % langs.length]].short}</button>` : ''}

    <main class="story" id="story">
      <section class="scene scene--hero" data-view="hero" aria-label="${T.invitationLabel}">
        <h1 class="sr-only">${d.names}</h1>
        <p class="eyebrow hero__eyebrow">${t.heroCaption || T.heroCaption}</p>
        <div class="hero__foot">
          <p class="hero__date"><span>${weekday}</span><b>${pad(d.day)} · ${pad(d.month)} · ${d.year}</b><span>${T.at(c.event.time)}</span></p>
          <p class="hero__scroll" aria-hidden="true"><i></i>${T.scroll}</p>
        </div>
      </section>

      ${verse ? html`
      <section class="scene" data-view="verse">
        <div class="card card--verse reveal">
          <span class="card__star">${raw(ICON.star)}</span>
          ${bismillah ? html`<p class="bismillah" data-type>${bismillah}</p><hr class="rule" />` : ''}
          ${quote(verse, { big: true })}
        </div>
      </section>` : ''}

      <section class="scene" data-view="invite">
        <div class="card reveal">
          <span class="card__star">${raw(ICON.star)}</span>
          <p class="eyebrow">${t.greeting || T.greeting}</p>
          ${t.inviteTitle ? html`<h2 class="title">${t.inviteTitle}</h2>` : ''}
          <p class="invite__text words">${words(t.invitation || T.invitation(d.groom, d.bride))}</p>
          ${t.namesCaption ? html`${ornament}<p class="eyebrow invite__caption">${t.namesCaption}</p>` : ''}
          <div class="invite__names">
            <span>${d.groom}</span><em>&amp;</em><span>${d.bride}</span>
          </div>
          ${t.namesNote ? html`<p class="invite__note" data-type>${t.namesNote}</p>` : ''}
          <p class="invite__meta">${weekday}, ${dateLine} · ${T.at(c.event.time)}</p>
          ${c.hosts ? html`<p class="invite__hosts"><span>${T.respectfully}</span>${c.hosts}</p>` : ''}
        </div>
      </section>

      <section class="scene scene--low" data-view="sky">
        <div class="card reveal">
          ${sectionHead(T.skyEyebrow, `${dateLine}, ${T.at(when.shifted ? when.time : c.event.time)}`)}
          <p class="lead">${T.skyLead(place.city ? T.skyWhereCity(place.city) : T.skyWhereVenue(venue.name))}</p>
          ${skyVerse ? quote(skyVerse) : ''}
          <div id="sky-facts">${factsHtml(null)}</div>
          ${when.shifted ? html`<p class="note">${T.skyShifted(when.time)}</p>` : ''}
          <button class="btn btn--ghost" type="button" data-explore hidden>${raw(ICON.compass)}<span>${T.skyExplore}</span></button>
        </div>
      </section>

      <section class="scene" data-view="countdown">
        <div class="card card--clear reveal">
          ${sectionHead(T.countdownEyebrow, t.countdownTitle || T.countdownTitle)}
          <div class="countdown" id="countdown" role="timer" aria-live="off">
            ${['kun', 'soat', 'daqiqa', 'soniya'].map((u) => html`<div class="countdown__cell"><b data-unit="${u}">00</b><span>${T.unitNames[u]}</span></div>`)}
          </div>
          <p class="countdown__done" id="countdown-done" hidden>${T.countdownDone}</p>
          <div class="btn-row">
            <a class="btn btn--ghost" id="gcal" target="_blank" rel="noopener">${raw(ICON.calendar)}<span>${T.gcal}</span></a>
            <button class="btn btn--ghost" id="ics" type="button">${raw(ICON.calendar)}<span>${T.ics}</span></button>
          </div>
        </div>
      </section>

      ${program.length ? html`
      <section class="scene" data-view="program">
        <div class="card reveal">
          ${sectionHead(T.programEyebrow, T.programTitle)}
          <ol class="timeline">
            ${program.map((p, i) => html`<li style="--i:${i}"><time>${p.time}</time><span class="timeline__dot" aria-hidden="true"></span><p>${p.title}</p></li>`)}
          </ol>
        </div>
      </section>` : ''}

      <section class="scene" data-view="venue">
        <div class="card reveal">
          ${t.detailsTitle ? html`${sectionHead(T.detailsEyebrow, t.detailsTitle)}
          <ul class="details">
            <li><span class="details__dot" aria-hidden="true"></span><p class="eyebrow">${T.date}</p><b>${dateLine}</b><span>${T.weekdayOn(weekday)}</span></li>
            <li><span class="details__dot" aria-hidden="true"></span><p class="eyebrow">${T.time}</p><b>${T.At(c.event.time)}</b>${t.timeNote ? html`<span>${t.timeNote}</span>` : ''}</li>
            <li><span class="details__dot" aria-hidden="true"></span><p class="eyebrow">${T.place}</p><b>${venue.name}</b><span>${venue.address}</span></li>
          </ul>` : html`${sectionHead(T.place, venue.name)}
          <p class="venue__address">${raw(ICON.pin)}<span>${venue.address}</span></p>`}
          ${gmap || ymap ? html`<div class="btn-row">
            ${gmap ? html`<a class="btn" href="${gmap}" target="_blank" rel="noopener">${T.gmap}</a>` : ''}
            ${ymap ? html`<a class="btn" href="${ymap}" target="_blank" rel="noopener">${T.ymap}</a>` : ''}
          </div>` : ''}
          ${dress ? html`<div class="dress">
            <p class="eyebrow">${T.dress}</p>
            ${dress.text ? html`<p class="dress__text">${dress.text}</p>` : ''}
            ${dress.colors?.length ? html`<div class="dress__colors">${dress.colors.map((col) => html`<span style="--c:${col}" title="${col}"></span>`)}</div>` : ''}
          </div>` : ''}
        </div>
      </section>

      ${c.rsvp?.enabled ? html`
      <section class="scene scene--low" data-view="wishes" id="wishes">
        <div class="card reveal">
          ${sectionHead(T.wishesEyebrow, T.wishesTitle)}
          <p class="lead">${T.wishesLead}</p>
          <form class="form" id="rsvp-form" novalidate>
            <label class="field"><span>${T.yourName}</span><input name="name" autocomplete="name" maxlength="80" required placeholder="${T.namePh}" /></label>
            <fieldset class="choice">
              <legend>${T.canCome}</legend>
              <label><input type="radio" name="attending" value="yes" /><span>${T.yes}</span></label>
              <label><input type="radio" name="attending" value="no" /><span>${T.no}</span></label>
            </fieldset>
            <label class="field" id="guests-field" hidden><span>${T.howMany}</span>
              <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${T.persons(i + 1)}</option>`)}</select>
            </label>
            <label class="field"><span>${T.wish} <em>${T.optional}</em></span><textarea name="message" rows="3" maxlength="500" placeholder="${T.wishPh}"></textarea></label>
            <label class="hp" aria-hidden="true">${T.website}<input name="website" tabindex="-1" autocomplete="off" /></label>
            <button class="btn btn--gold" type="submit"><span>${T.send}</span></button>
            <p class="form__status" id="rsvp-status" role="status" aria-live="polite"></p>
            ${d.rsvpClosesAt ? html`<p class="form__deadline">${T.deadline(Number(c.rsvp.deadline.slice(8)), T.months[Number(c.rsvp.deadline.slice(5, 7)) - 1])}</p>` : ''}
          </form>
          <div class="done" id="rsvp-done" hidden></div>
          <div class="wishes" id="wish-list" hidden>
            <p class="eyebrow" id="wish-count"></p>
            <ul></ul>
          </div>
        </div>
      </section>` : ''}

      ${dua ? html`
      <section class="scene" data-view="dua">
        <div class="card card--verse reveal">
          <span class="card__star">${raw(ICON.star)}</span>
          ${sectionHead(dua.eyebrow || 'Duo', dua.title || 'Duo va ezgu tilaklar')}
          <hr class="rule" />
          ${quote(dua, { big: true })}
          ${dua.note?.trim() ? html`<hr class="rule" /><p class="lead dua__note" data-type>${dua.note}</p>` : ''}
          <p class="dua__sign"><span>${d.groom}</span><em>♡</em><span>${d.bride}</span></p>
        </div>
      </section>` : ''}

      <section class="scene scene--final" data-view="final">
        <p class="final__lead">${t.closing || T.closing}</p>
        <div class="final__foot">
          ${c.hosts ? html`<p class="final__hosts"><span>${T.respectfully}</span>${c.hosts}</p>` : ''}
          ${contacts.length ? html`<div class="contacts">${contacts.map((ct) => html`<a href="tel:${ct.phone.replace(/[^\d+]/g, '')}">${raw(ICON.phone)}<span><b>${ct.name}</b>${ct.phone}</span></a>`)}</div>` : ''}
          ${brandLink()}
          <p class="credit">${T.credit}</p>
        </div>
      </section>
    </main>

    <div class="explore" id="explore" hidden>
      <p class="explore__hint">${T.exploreHint}</p>
      <div class="explore__bar">
        <button class="chip" id="toggle-lines" type="button" aria-pressed="false">${raw(ICON.stars)}<span>${T.constellations}</span></button>
        <button class="chip chip--close" id="explore-close" type="button">${raw(ICON.close)}<span>${T.close}</span></button>
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
  const title = T.calTitle(d.names);
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
  if (audio.getAttribute('src') !== src) audio.src = src;
  audio.volume = 0.55;
  const sync = () => {
    const on = !audio.paused;
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? T.musicOff : T.musicOn);
  };
  const play = () => audio.play().catch(() => {}).finally(sync);
  sync();
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  btn.addEventListener('click', () => (audio.paused ? play() : audio.pause()));
  // iOS: ovozni faqat bosish paytida yoqish mumkin. Video tugagach musiqa chalinishi uchun
  // audio bosish paytida jimgina "ochib" qo'yiladi
  const prime = () => {
    audio.muted = true;
    audio.play().then(() => audio.pause()).catch(() => {}).finally(() => {
      audio.currentTime = 0;
      audio.muted = false;
    });
  };
  scope.on(document, 'visibilitychange', () => {
    if (document.hidden && !audio.paused) {
      audio.pause();
      audio.dataset.resume = '1';
    } else if (!document.hidden && audio.dataset.resume) {
      delete audio.dataset.resume;
      play();
    }
  });
  return { play, prime };
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

/* ------------------------- Yozuv effekti (oyat va duolar) ------------------------- */
// Lotin matni harfma-harf yoziladi: har harf tilla nur bo'lib chaqnab, so'ng tinchiydi.
// Arabcha matn harflarga bo'linmaydi (bog'lanishi buzilmasin) — har so'z o'ngdan chapga
// siyoh bilan chizilgandek ochiladi. Kartadagi matnlar ketma-ket yoziladi.
const TYPE_LATIN = { step: 0.022, tail: 0.9 };
const TYPE_ARABIC = { step: 0.2, tail: 0.8 };

function prepType(el) {
  const text = el.textContent.trim();
  const ar = el.getAttribute('lang') === 'ar';
  const vis = document.createElement('span');
  vis.setAttribute('aria-hidden', 'true');
  let n = 0;
  for (const tok of text.split(/(\s+)/)) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) {
      vis.append(' ');
      continue;
    }
    const w = document.createElement('span');
    w.className = ar ? 'tw tw--ink' : 'tw';
    if (ar) {
      w.textContent = tok;
      w.style.setProperty('--d', n++);
    } else {
      for (const ch of tok) {
        const c = document.createElement('span');
        c.className = 'tc';
        c.textContent = ch;
        c.style.setProperty('--d', n++);
        w.append(c);
      }
    }
    vis.append(w);
  }
  const sr = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: text });
  el.replaceChildren(sr, vis);
  el.classList.add('type');
  const { step, tail } = ar ? TYPE_ARABIC : TYPE_LATIN;
  el.style.setProperty('--step', `${step}s`);
  return Math.max(0, n - 1) * step + tail;
}

/** Elementlarni ketma-ket yozish; delay — birinchisi boshlanguncha (soniya). */
function typeSeq(els, delay = 0) {
  let t = delay;
  for (const el of els) {
    const dur = prepType(el);
    el.style.setProperty('--start', `${t.toFixed(2)}s`);
    // Keyingi matn oldingisi deyarli tugaganda boshlanadi
    t += Math.max(0.3, dur - 0.45);
  }
  requestAnimationFrame(() => els.forEach((el) => el.classList.add('is-typing')));
}

function initTyping() {
  const groups = $$('.card').filter((card) => $('[data-type]', card));
  if (reduced || !('IntersectionObserver' in window)) return;
  const io = scope.observe(new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        typeSeq($$('[data-type]', e.target), 0.55);
      }
    },
    { threshold: 0.2 },
  ));
  groups.forEach((g) => io.observe(g));
  const gateText = $$('#gate [data-type]');
  if (gateText.length) typeSeq(gateText, 0.9);
}

/* ----------------------------------- Ishga tushirish ----------------------------------- */
// Oldingi chizishdagi osmon: sana, joy va ismlar o'zgarmasa qayta hisoblanmaydi (panel ko'rinishi)
let kept = null;

const LANG_KEY = 'osmon:lang';
const skyLabels = () => ({ moon: T.moon, ...T.planetNames });
/** Til: ?lang= → mehmonning oldingi tanlovi → config.languages dagi birinchi til. */
function pickLang(langs) {
  const q = new URLSearchParams(location.search).get('lang');
  if (langs.includes(q)) return q;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (langs.includes(saved)) return saved;
  } catch {
    /* localStorage yo'q */
  }
  return langs[0];
}

/**
 * Sahifani chizish. preview — boshqaruv paneli ko'rinishi: kirish pardasisiz, musiqasiz,
 * ismlar darhol chiziladi, javob formasi yuborilmaydi.
 * lang — shu tilda chizish; resume — til almashtirilganda: taklifnoma allaqachon ochilgan.
 */
export async function mountOsmon(c0, { preview = false, lang = null, resume = false } = {}) {
  const sc = newScope();
  const langs = siteLangs(c0);
  const L = langs.includes(lang) ? lang : pickLang(langs);
  T = textsFor(L, c0);
  document.documentElement.lang = LANGS[L].html;
  const c = localize(c0, L);
  const d = deriveConfig(c);
  // Mehmon javobi tildan qat'i nazar bitta kalitda (asl ismlar bilan)
  const baseNames = `${c0.couple.groom} & ${c0.couple.bride}`;
  if (langs.length > 1 && !preview) document.title = `${d.names} · ${c.texts?.heroCaption || T.heroCaption}`;
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
  const shown = preview || resume;
  if (!shown) document.documentElement.classList.add('is-locked');
  // Til almashtirilganda musiqa uzilmasin — eski audio element saqlanadi
  const oldAudio = resume ? $('#music') : null;
  app.innerHTML = renderPage(c, d, place, { shifted: moment.shifted, time: fmtTime(moment.date, tz) });
  if (reuse) $('#sky').replaceWith(reuse.root);
  if (oldAudio) $('#music').replaceWith(oldAudio);
  fixScriptGlyphs(app);

  let sky = null;
  let opened = shown;
  const switchLang = (l) => {
    if (l === L) return;
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* localStorage yo'q */
    }
    mountOsmon(c0, { preview, lang: l, resume: opened });
  };
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => switchLang(b.dataset.lang)));
  $('#lang-next')?.addEventListener('click', () => switchLang(langs[(langs.indexOf(L) + 1) % langs.length]));
  initCountdown(d);
  initCalendar(c, d);
  initReveal();
  // Panel ko'rinishida har tahrirda qayta yozilmasin — matn darhol ko'rinadi
  if (!preview) initTyping();
  const music = preview ? { play() {} } : initMusic(musicUrlOf(c));
  const scroller = initScroll(() => sky);
  const wishes = c.rsvp?.enabled ? initWishes(c, d, () => sky, preview, baseNames) : null;

  const gate = $('#gate');
  if (shown) {
    gate.remove();
    $('#intro')?.remove();
    if (preview) $('#music-toggle')?.remove();
    document.documentElement.classList.remove('is-locked');
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
    const intro = initIntro(open);
    openBtn.addEventListener('click', () => {
      if (!intro || intro.broken || opened) return open();
      music.prime?.();
      intro.play();
    });
  }

  try {
    const s = reuse?.sky || (await createSky({ labels: skyLabels(), root: $('#sky'), date: moment.date, lat: place.lat, lng: place.lng, groom: scriptSafe(d.groom), bride: scriptSafe(d.bride), reduced, instant: preview }));
    if (sc !== scope) {
      // Osmon hisoblanayotganda sahifa qayta chizildi — bu natija endi kerak emas
      if (!reuse) s.destroy();
      return;
    }
    sky = s;
    s.setLabels?.(skyLabels());
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
      sky.setNamesAlpha(name === 'hero' || name === 'final' ? 1 : name === 'invite' || name === 'dua' ? 0.3 : 0.08);
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
function initWishes(c, d, getSky, preview = false, baseNames = d.names) {
  const form = $('#rsvp-form');
  const status = $('#rsvp-status');
  const doneBox = $('#rsvp-done');
  const guestsField = $('#guests-field');
  const listBox = $('#wish-list');
  const storageKey = `rsvp:${baseNames}:${c.event.originalDate || c.event.date}`;
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

  const thanks = (a, name) => (a === 'yes' ? T.thanksYes(name) : T.thanksNo(name));
  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<span class="done__star">${raw(ICON.star)}</span><p>${text}</p>${withChange ? html`<button class="link" type="button" id="rsvp-change">${T.change}</button>` : ''}`.value;
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
  if (closed) showDone(T.closed, false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));

  const submitLabel = $('button[type="submit"] span', form);
  function syncForm() {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
    submitLabel.textContent = form.elements.namedItem('message').value.trim() ? T.sendLantern : T.sendAnswer;
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
    if (preview) return setStatus(T.previewNoSend);
    const data = Object.fromEntries(new FormData(form));
    data.name = (data.name || '').trim();
    data.message = (data.message || '').trim();
    if (data.name.length < 2) return setStatus(T.errName, true, form.elements.namedItem('name'));
    if (!data.attending) return setStatus(T.errAttending, true);
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    setStatus(T.sending);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: guestId, couple: baseNames }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setStatus(json.error === 'not_configured' ? T.errConfig : T.errGeneric, true);
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
      setStatus(T.errNetwork, true);
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
    $('#wish-count').textContent = T.wishCount(all.length + (mine && ![...known.values()].some((w) => w.message === mine.message && w.name === mine.name) ? 1 : 0));
    $('ul', listBox).innerHTML = all
      .slice(0, 40)
      .map((w) => html`<li><p>“${w.message}”</p><b>${w.name}</b></li>`.value)
      .join('');
  }

  async function refresh() {
    try {
      const json = preview ? { ok: true, wishes: T.sampleWishes } : await (await fetch('/api/wishes', { cache: 'no-store' })).json();
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

