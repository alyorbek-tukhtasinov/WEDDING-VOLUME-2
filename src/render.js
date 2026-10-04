import { html, raw } from './lib/dom.js';
import { mediaUrl, musicUrlOf } from './lib/config.js';
import { LANGS, siteLangs, brandText } from './lib/i18n.js';
import { introHtml } from './lib/intro.js';
import { T, LANG } from './strings.js';

const pad = (n) => String(n).padStart(2, '0');
const img = (name) => `/images/${name}`;

function envelope(c, d) {
  if (c.effects?.envelope === false) return '';
  return html`
    <div class="envelope" id="envelope" role="dialog" aria-modal="true" aria-label="${T.envelopeOpen}">
      <div class="envelope__half envelope__half--left" aria-hidden="true"></div>
      <div class="envelope__half envelope__half--right" aria-hidden="true"></div>
      <div class="envelope__top">
        <p class="envelope__to">${T.envelopeTo}</p>
        <p class="envelope__names">${d.groom ? html`${d.groom} <span>&amp;</span> ` : ''}${d.bride}</p>
      </div>
      <button class="envelope__seal" type="button" id="envelope-open" aria-label="${T.envelopeOpen}">
        <span class="envelope__initials">${d.initials}</span>
      </button>
      <p class="envelope__hint">${T.envelopeHint}</p>
      ${langPicker(c)}
    </div>
  `;
}

function hero(c, d) {
  return html`
    <header class="hero" id="top">
      <img class="hero__bg" src="${img('hero-arch.webp')}" alt="" fetchpriority="high" />
      <div class="hero__content">
        <p class="hero__caption" data-type>${c.texts?.heroCaption || T.heroCaption}</p>
        <h1 class="hero__names">
          ${d.groom ? html`<span>${d.groom}</span>
          <span class="hero__amp">&amp;</span>` : ''}
          <span>${d.bride}</span>
        </h1>
        <p class="hero__date">${pad(d.day)} <i>·</i> ${pad(d.month)} <i>·</i> ${d.year}</p>
      </div>
      <a class="hero__scroll" href="#invite" aria-label="${T.down}">
        <span></span>
      </a>
    </header>
  `;
}

function invite(c, d) {
  return html`
    <section class="invite" id="invite">
      <div class="paper paper--a" data-reveal>
        <img class="frame frame--top" src="${img('frame-top.webp')}" alt="" loading="lazy" />
        <p class="invite__greeting" data-type>${c.texts?.greeting || T.greeting}</p>
        <p class="invite__text" data-type>${c.texts?.invitation || T.invitation(d.groom, d.bride)}</p>
        ${c.hosts ? html`<p class="invite__hosts" data-type><span>${T.respectfully}</span>${c.hosts}</p>` : ''}
        <img class="frame frame--bottom" src="${img('frame-bottom.webp')}" alt="" loading="lazy" />
      </div>
    </section>
  `;
}

function calendarGrid(d) {
  const first = new Date(Date.UTC(d.year, d.month - 1, 1)).getUTCDay();
  const offset = (first + 6) % 7; // dushanbadan boshlanadi
  const days = new Date(Date.UTC(d.year, d.month, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(html`<span></span>`);
  for (let day = 1; day <= days; day++) {
    cells.push(
      day === d.day
        ? html`<span class="cal__day cal__day--active" aria-current="date"><b>${day}</b></span>`
        : html`<span class="cal__day">${day}</span>`,
    );
  }
  return html`
    <div class="cal" data-reveal>
      <p class="cal__title">${T.monthsNom[d.month - 1]} ${d.year}</p>
      <div class="cal__grid cal__grid--head">${T.weekdaysShort.map((w) => html`<span>${w}</span>`)}</div>
      <div class="cal__grid">${cells}</div>
    </div>
  `;
}

function dateSection(c, d) {
  return html`
    <section class="section date" id="date">
      <h2 class="title" data-reveal>${T.when}</h2>
      <div class="badge" data-reveal>
        <span class="badge__weekday">${T.weekdays[d.weekday]}</span>
        <span class="badge__day">${d.day}</span>
        <span class="badge__month">${T.months[d.month - 1]}</span>
        <span class="badge__year">${d.year}</span>
        <span class="badge__time">${T.at(c.event.time)}</span>
      </div>
      ${calendarGrid(d)}
      <div class="actions" data-reveal>
        <a class="btn btn--ghost" id="gcal" target="_blank" rel="noopener">${T.gcal}</a>
        <button class="btn btn--ghost" id="ics" type="button">${T.ics}</button>
      </div>
    </section>
  `;
}

function countdown() {
  return html`
    <section class="countdown" aria-live="off">
      <h2 class="countdown__title" data-reveal>${T.countdownTitle}</h2>
      <div class="countdown__grid" id="countdown" data-reveal>
        ${Object.entries(T.units).map(
          ([k, label]) => html`
            <div class="countdown__cell">
              <span class="countdown__num" data-unit="${k}">00</span>
              <span class="countdown__label">${label}</span>
            </div>
          `,
        )}
      </div>
      <p class="countdown__done" id="countdown-done" hidden></p>
    </section>
  `;
}

// "Sovg'a" yozuvi: berilsa, to'yxona bo'limida rasm o'rniga katta bezakli matn chiqadi
function giftNote(g) {
  return html`
    <div class="gift" data-reveal>
      <img class="gift__frame" src="${img('frame-top.webp')}" alt="" loading="lazy" />
      ${g.eyebrow ? html`<p class="gift__eyebrow" data-type>${g.eyebrow}</p>` : ''}
      <p class="gift__title" data-type>${g.title}</p>
      ${g.text ? html`<p class="gift__text" data-type>${g.text}</p>` : ''}
      <img class="gift__heart" src="${img('heart.webp')}" alt="" loading="lazy" />
      <img class="gift__frame gift__frame--bottom" src="${img('frame-bottom.webp')}" alt="" loading="lazy" />
    </div>
  `;
}

function venue(c) {
  const v = c.venue;
  const image = v.image ? mediaUrl(v.image) : img('building.webp');
  return html`
    <section class="section venue" id="venue">
      <h2 class="title" data-reveal>${T.where}</h2>
      ${c.giftNote?.title
        ? giftNote(c.giftNote)
        : html`<img class="venue__img ${v.image ? 'venue__img--photo' : ''}" src="${image}" alt="${v.name}" loading="lazy" data-reveal />`}
      <p class="venue__name" data-reveal>${v.name}</p>
      <p class="venue__address" data-reveal>${v.address}</p>
      <div class="actions" data-reveal>
        ${v.googleMaps ? html`<a class="btn" href="${v.googleMaps}" target="_blank" rel="noopener">${T.gmap}</a>` : ''}
        ${v.yandexMaps ? html`<a class="btn" href="${v.yandexMaps}" target="_blank" rel="noopener">${T.ymap}</a>` : ''}
      </div>
    </section>
  `;
}

// Ixtiyoriy: to'y kechasining maxsus mehmoni (xonanda, shou guruh) — faqat config'da yozilsa chiqadi
function specialGuest(c) {
  const g = c.specialGuest;
  if (!g?.name) return '';
  return html`
    <section class="section guest">
      <p class="guest__eyebrow" data-reveal>${g.eyebrow || T.guestEyebrow}</p>
      <p class="guest__name" data-reveal>${g.name}</p>
      ${g.text ? html`<p class="guest__text" data-reveal data-type>${g.text}</p>` : ''}
      <img class="guest__heart" src="${img('heart.webp')}" alt="" loading="lazy" data-reveal />
    </section>
  `;
}

const NOTICE_ICONS = {
  'no-alcohol':
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M16 7h16l-1.6 12.5a6.5 6.5 0 0 1-12.8 0z" /><path d="M24 26v12M17 41h14" /><path d="M8 40L40 8" class="notice__slash" /></svg>',
  'no-camera':
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 16.5A2.5 2.5 0 0 1 9.5 14H15l3-4h12l3 4h5.5a2.5 2.5 0 0 1 2.5 2.5v18a2.5 2.5 0 0 1-2.5 2.5h-29A2.5 2.5 0 0 1 7 34.5z" /><circle cx="24" cy="25" r="6.5" /><path d="M8 40L40 8" class="notice__slash" /></svg>',
  heart:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 39S8 29.5 8 18.5A8 8 0 0 1 24 14a8 8 0 0 1 16 4.5C40 29.5 24 39 24 39z" /></svg>',
};

// Ixtiyoriy: mehmonlarga muhim iltimoslar (dastur/dress-kod o'rnida ham bo'lishi mumkin)
function notices(c) {
  const n = c.notices;
  if (!n?.items?.length) return '';
  return html`
    <section class="section notices torn" id="notices">
      <h2 class="title" data-reveal>${n.title || T.noticesTitle}</h2>
      ${n.intro ? html`<p class="notices__intro" data-reveal>${n.intro}</p>` : ''}
      <div class="notices__list">
        ${n.items.map(
          (it) => html`
            <article class="notice" data-reveal>
              ${NOTICE_ICONS[it.icon] ? html`<span class="notice__icon">${raw(NOTICE_ICONS[it.icon])}</span>` : ''}
              <h3 class="notice__title">${it.title}</h3>
              <p class="notice__text" data-type>${it.text}</p>
            </article>
          `,
        )}
      </div>
    </section>
  `;
}

function program(c) {
  if (!c.program?.length) return '';
  return html`
    <section class="section program torn" id="program">
      <img class="program__rings" src="${img('rings.webp')}" alt="" loading="lazy" data-reveal />
      <h2 class="title" data-reveal>${T.program}</h2>
      <ol class="timeline">
        ${c.program.map(
          (p) => html`
            <li class="timeline__item" data-reveal>
              <span class="timeline__time">${p.time}</span>
              <span class="timeline__dot" aria-hidden="true"></span>
              <span class="timeline__body">
                <span class="timeline__title">${p.title}</span>
                ${p.description ? html`<span class="timeline__desc">${p.description}</span>` : ''}
              </span>
            </li>
          `,
        )}
      </ol>
    </section>
  `;
}

function dressCode(c) {
  if (!c.dressCode?.text) return '';
  return html`
    <section class="section dress">
      <h2 class="title" data-reveal>${T.dress}</h2>
      <p class="dress__text" data-reveal data-type>${c.dressCode.text}</p>
      ${c.dressCode.colors?.length
        ? html`<div class="dress__colors" data-reveal>
            ${c.dressCode.colors.map((col) => html`<span style="background:${col}" title="${col}"></span>`)}
          </div>`
        : ''}
    </section>
  `;
}

// b-day loyihasidagi "ipga osilgan rasmlar" uslubi: gorizontal suriladigan polaroidlar
function garland(c) {
  const tilts = [-5, 4, -3, 5, -4, 3];
  return html`
    <div class="garland" data-reveal>
      <div class="garland__track">
        <span class="garland__wire" aria-hidden="true"></span>
        ${c.gallery.map(
          (g, i) => html`
            <div class="garland__item" style="--i:${i};--r:${tilts[i % tilts.length]}deg">
              <span class="garland__pin" aria-hidden="true"></span>
              <button class="garland__photo" type="button" aria-label="${T.zoom}">
                <img src="${mediaUrl(g)}" alt="" loading="lazy" />
              </button>
            </div>
          `,
        )}
      </div>
    </div>
    <p class="garland__hint" data-reveal>${T.swipe}</p>
  `;
}

function gallery(c) {
  if (!c.gallery?.length) return '';
  if (c.galleryStyle === 'garland') {
    return html`
      <section class="section gallery gallery--garland" id="gallery">
        <h2 class="title" data-reveal>Lahzalarimiz</h2>
        ${garland(c)}
        <dialog class="lightbox" id="lightbox">
          <img alt="" />
          <button class="lightbox__close" type="button" aria-label="${T.close}">×</button>
        </dialog>
      </section>
    `;
  }
  return html`
    <section class="section gallery" id="gallery">
      <h2 class="title" data-reveal>Lahzalarimiz</h2>
      <div class="gallery__grid">
        ${c.gallery.map(
          (g, i) => html`
            <button class="gallery__item" type="button" data-index="${i}" data-reveal aria-label="${T.zoom}">
              <img src="${mediaUrl(g)}" alt="" loading="lazy" />
            </button>
          `,
        )}
      </div>
      <dialog class="lightbox" id="lightbox">
        <img alt="" />
        <button class="lightbox__close" type="button" aria-label="${T.close}">×</button>
      </dialog>
    </section>
  `;
}

function rsvp(c, d) {
  if (!c.rsvp?.enabled) return '';
  const deadline = c.rsvp.deadline
    ? (() => {
        const [, m, day] = c.rsvp.deadline.split('-').map(Number);
        return html`<p class="rsvp__deadline">${T.deadline(day, T.months[m - 1])}</p>`;
      })()
    : '';
  const options = Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1}</option>`);

  return html`
    <section class="section rsvp" id="rsvp">
      <div class="paper paper--b" data-reveal>
        <h2 class="title">${T.rsvpTitle}</h2>
        ${deadline}
        <form class="form" id="rsvp-form" novalidate>
          <label class="field">
            <span>${T.name}</span>
            <input name="name" type="text" autocomplete="name" required minlength="2" maxlength="80" />
          </label>
          <label class="field">
            <span>${T.phone}</span>
            <input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="+998" />
          </label>
          <fieldset class="choice">
            <legend>${T.canCome}</legend>
            <label><input type="radio" name="attending" value="yes" required /> <span>${T.yes}</span></label>
            <label><input type="radio" name="attending" value="no" /> <span>${T.no}</span></label>
          </fieldset>
          <label class="field" id="guests-field" hidden>
            <span>${T.howMany}</span>
            <select name="guests">${options}</select>
          </label>
          <label class="field">
            <span>${T.wishes}</span>
            <textarea name="message" rows="3" maxlength="500"></textarea>
          </label>
          <input class="hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <p class="form__status" id="rsvp-status" role="status"></p>
          <button class="btn btn--solid" type="submit">${T.send}</button>
        </form>
        <div class="rsvp__done" id="rsvp-done" hidden></div>
      </div>
    </section>
  `;
}

function wishes(c) {
  if (!c.rsvp?.enabled || c.rsvp.showWishes === false) return '';
  // Tilaklar serverdan yuklanadi; bo'lmasa bo'lim yashirin qoladi
  return html`
    <section class="section wishes" id="wishes" hidden>
      <h2 class="title">${T.wishesTitle}</h2>
      <ul class="wishes__list" id="wishes-list"></ul>
    </section>
  `;
}

function contacts(c) {
  if (!c.contacts?.length) return '';
  return html`
    <section class="section contacts">
      <h2 class="title" data-reveal>${T.contacts}</h2>
      <ul class="contacts__list">
        ${c.contacts.map(
          (ct) => html`
            <li data-reveal>
              <span>${ct.name}</span>
              <a href="tel:${ct.phone.replace(/[^\d+]/g, '')}">${ct.phone}</a>
            </li>
          `,
        )}
      </ul>
    </section>
  `;
}

function footer(c, d, brand) {
  return html`
    <footer class="footer">
      <img class="footer__flower" src="${img('peony.webp')}" alt="" loading="lazy" />
      <p class="footer__closing" data-reveal>${c.texts?.closing || T.closing}</p>
      <p class="footer__names" data-reveal>${d.groom ? html`${d.groom} <span>&amp;</span> ` : ''}${d.bride}</p>
      ${brand?.enabled
        ? html`<a class="brand" href="${brand.url}" target="_blank" rel="noopener">
            ${brand.logo
              ? html`<img src="${brand.logo}" alt="" width="28" height="28" loading="lazy" />`
              : html`<svg class="brand__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" /></svg>`}
            <span>${brandText(LANG, brand.text)}<b>${brand.name}</b></span>
          </a>`
        : ''}
    </footer>
  `;
}

function musicButton(c) {
  const src = musicUrlOf(c);
  if (!src) return '';
  return html`
    <audio id="music" src="${src}" loop preload="none"></audio>
    <button class="music" id="music-toggle" type="button" aria-label="${T.musicOn}" aria-pressed="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
    </button>
  `;
}

// Fon rasmi ustidagi krem pardaning quyuqligi (0..1). Katta — rasm xiraroq, matn aniqroq.
function bgVeil(c) {
  const v = Number(c.backgroundOverlay);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.84;
}

// Til tanlash: konvertda (ochishdan oldin) — tugmalar; sahifada — keyingi tilga o'tish tugmasi
function langPicker(c) {
  const langs = siteLangs(c);
  if (langs.length < 2) return '';
  return html`<div class="lang" role="group" aria-label="${T.langSwitch}">
    ${langs.map((l) => html`<button type="button" data-lang="${l}" lang="${LANGS[l].html}" aria-pressed="${String(l === LANG)}">${LANGS[l].label}</button>`)}
  </div>`;
}
function langButton(c) {
  const langs = siteLangs(c);
  if (langs.length < 2) return '';
  const next = langs[(langs.indexOf(LANG) + 1) % langs.length];
  return html`<button class="lang-fab" id="lang-next" type="button" data-lang="${next}" lang="${LANGS[next].html}" aria-label="${T.langSwitch}">${LANGS[next].short}</button>`;
}

// Kirish videosi bo'lsa — konvertdan oldin minimalistik ekran: o'z-o'zidan chiziladigan tilla halqa
// ichida monogramma. Bosilganda halqa butun ekranga kengayadi, qorong'ilikdan video boshlanadi;
// video tugagach konvert paydo bo'ladi.
function prelude(c, d) {
  return html`
    <div class="prelude" id="prelude">
      ${langPicker(c)}
      <button class="prelude__ring" id="prelude-play" type="button" aria-label="${T.preludeBtn}">
        <svg class="prelude__circle" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="96" pathLength="1" /></svg>
        <span class="prelude__mono">${d.initials}</span>
        <span class="prelude__play">${T.preludeBtn}</span>
      </button>
      <p class="prelude__names">${d.groom ? html`${d.groom} <span>&amp;</span> ` : ''}${d.bride}</p>
      <p class="prelude__date">${pad(d.day)} · ${pad(d.month)} · ${d.year}</p>
      <p class="prelude__hint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>${T.preludeHint}</p>
    </div>
  `;
}

export function renderPage(c, d, brand) {
  const intro = c.introVideo && c.effects?.envelope !== false;
  return html`
    ${intro ? prelude(c, d) : ''}
    ${envelope(c, d)}
    ${intro ? raw(introHtml(mediaUrl(c.introVideo), T.skip)) : ''}
    <div class="petals" id="petals" aria-hidden="true"></div>
    ${c.backgroundImage
      ? html`<div class="page-bg" aria-hidden="true" style="background-image:url('${mediaUrl(c.backgroundImage)}');--bg-veil:${bgVeil(c)}"></div>`
      : ''}
    <div class="page${c.backgroundImage ? ' page--photo' : ''}">
      ${hero(c, d)}
      <main>
        ${invite(c, d)}
        ${dateSection(c, d)}
        ${c.effects?.countdown === false ? '' : countdown()}
        <div class="band" aria-hidden="true"></div>
        ${venue(c)}
        ${specialGuest(c)}
        ${program(c)}
        ${dressCode(c)}
        ${notices(c)}
        ${gallery(c)}
        ${rsvp(c, d)}
        ${wishes(c)}
        ${contacts(c)}
      </main>
      ${footer(c, d, brand)}
    </div>
    ${musicButton(c)}
    ${langButton(c)}
  `.value;
}
