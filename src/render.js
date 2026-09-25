import { html } from './lib/dom.js';
import { MONTHS, WEEKDAYS_SHORT, mediaUrl } from './lib/config.js';

const pad = (n) => String(n).padStart(2, '0');
const img = (name) => `/images/${name}`;

function envelope(c, d) {
  if (c.effects?.envelope === false) return '';
  return html`
    <div class="envelope" id="envelope" role="dialog" aria-modal="true" aria-label="Taklifnomani ochish">
      <div class="envelope__half envelope__half--left" aria-hidden="true"></div>
      <div class="envelope__half envelope__half--right" aria-hidden="true"></div>
      <div class="envelope__top">
        <p class="envelope__to">Taklifnoma</p>
        <p class="envelope__names">${d.groom} <span>&amp;</span> ${d.bride}</p>
      </div>
      <button class="envelope__seal" type="button" id="envelope-open" aria-label="Taklifnomani ochish">
        <span class="envelope__initials">${d.initials}</span>
      </button>
      <p class="envelope__hint">Ochish uchun muhrni bosing</p>
    </div>
  `;
}

function hero(c, d) {
  return html`
    <header class="hero" id="top">
      <img class="hero__bg" src="${img('hero-arch.webp')}" alt="" fetchpriority="high" />
      <div class="hero__content">
        <p class="hero__caption" data-type>${c.texts?.heroCaption || 'To‘yga taklifnoma'}</p>
        <h1 class="hero__names">
          <span>${d.groom}</span>
          <span class="hero__amp">&amp;</span>
          <span>${d.bride}</span>
        </h1>
        <p class="hero__date">${pad(d.day)} <i>·</i> ${pad(d.month)} <i>·</i> ${d.year}</p>
      </div>
      <a class="hero__scroll" href="#invite" aria-label="Pastga">
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
        <p class="invite__greeting" data-type>${c.texts?.greeting}</p>
        <p class="invite__text" data-type>${c.texts?.invitation}</p>
        ${c.hosts ? html`<p class="invite__hosts" data-type><span>Hurmat bilan,</span>${c.hosts}</p>` : ''}
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
      <p class="cal__title">${d.monthName} ${d.year}</p>
      <div class="cal__grid cal__grid--head">${WEEKDAYS_SHORT.map((w) => html`<span>${w}</span>`)}</div>
      <div class="cal__grid">${cells}</div>
    </div>
  `;
}

function dateSection(c, d) {
  return html`
    <section class="section date" id="date">
      <h2 class="title" data-reveal>Qachon?</h2>
      <div class="badge" data-reveal>
        <span class="badge__weekday">${d.weekdayName}</span>
        <span class="badge__day">${d.day}</span>
        <span class="badge__month">${d.monthName}</span>
        <span class="badge__year">${d.year}</span>
        <span class="badge__time">soat ${c.event.time}</span>
      </div>
      ${calendarGrid(d)}
      <div class="actions" data-reveal>
        <a class="btn btn--ghost" id="gcal" target="_blank" rel="noopener">Google Taqvimga qo‘shish</a>
        <button class="btn btn--ghost" id="ics" type="button">Taqvimga saqlash (.ics)</button>
      </div>
    </section>
  `;
}

function countdown() {
  return html`
    <section class="countdown" aria-live="off">
      <h2 class="countdown__title" data-reveal>To‘yimizgacha qoldi</h2>
      <div class="countdown__grid" id="countdown" data-reveal>
        ${[
          ['days', 'kun'],
          ['hours', 'soat'],
          ['minutes', 'daqiqa'],
          ['seconds', 'soniya'],
        ].map(
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
      <h2 class="title" data-reveal>Qayerda?</h2>
      ${c.giftNote?.title
        ? giftNote(c.giftNote)
        : html`<img class="venue__img ${v.image ? 'venue__img--photo' : ''}" src="${image}" alt="${v.name}" loading="lazy" data-reveal />`}
      <p class="venue__name" data-reveal>${v.name}</p>
      <p class="venue__address" data-reveal>${v.address}</p>
      <div class="actions" data-reveal>
        ${v.googleMaps ? html`<a class="btn" href="${v.googleMaps}" target="_blank" rel="noopener">Google Maps</a>` : ''}
        ${v.yandexMaps ? html`<a class="btn" href="${v.yandexMaps}" target="_blank" rel="noopener">Yandex Xarita</a>` : ''}
      </div>
    </section>
  `;
}

function program(c) {
  if (!c.program?.length) return '';
  return html`
    <section class="section program torn" id="program">
      <img class="program__rings" src="${img('rings.webp')}" alt="" loading="lazy" data-reveal />
      <h2 class="title" data-reveal>To‘y dasturi</h2>
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
      <h2 class="title" data-reveal>Dress-kod</h2>
      <p class="dress__text" data-reveal data-type>${c.dressCode.text}</p>
      ${c.dressCode.colors?.length
        ? html`<div class="dress__colors" data-reveal>
            ${c.dressCode.colors.map((col) => html`<span style="background:${col}" title="${col}"></span>`)}
          </div>`
        : ''}
    </section>
  `;
}

function gallery(c) {
  if (!c.gallery?.length) return '';
  return html`
    <section class="section gallery" id="gallery">
      <h2 class="title" data-reveal>Lahzalarimiz</h2>
      <div class="gallery__grid">
        ${c.gallery.map(
          (g, i) => html`
            <button class="gallery__item" type="button" data-index="${i}" data-reveal aria-label="Rasmni kattalashtirish">
              <img src="${mediaUrl(g)}" alt="" loading="lazy" />
            </button>
          `,
        )}
      </div>
      <dialog class="lightbox" id="lightbox">
        <img alt="" />
        <button class="lightbox__close" type="button" aria-label="Yopish">×</button>
      </dialog>
    </section>
  `;
}

function rsvp(c, d) {
  if (!c.rsvp?.enabled) return '';
  const deadline = c.rsvp.deadline
    ? (() => {
        const [, m, day] = c.rsvp.deadline.split('-').map(Number);
        return html`<p class="rsvp__deadline">Iltimos, ${day}-${MONTHS[m - 1]}gacha javob bering</p>`;
      })()
    : '';
  const options = Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1}</option>`);

  return html`
    <section class="section rsvp" id="rsvp">
      <div class="paper paper--b" data-reveal>
        <h2 class="title">Tashrifingizni tasdiqlang</h2>
        ${deadline}
        <form class="form" id="rsvp-form" novalidate>
          <label class="field">
            <span>Ismingiz *</span>
            <input name="name" type="text" autocomplete="name" required minlength="2" maxlength="80" />
          </label>
          <label class="field">
            <span>Telefon raqamingiz</span>
            <input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="+998" />
          </label>
          <fieldset class="choice">
            <legend>Kela olasizmi? *</legend>
            <label><input type="radio" name="attending" value="yes" required /> <span>Albatta kelaman</span></label>
            <label><input type="radio" name="attending" value="no" /> <span>Afsuski, kela olmayman</span></label>
          </fieldset>
          <label class="field" id="guests-field" hidden>
            <span>Necha kishi bo‘lasiz?</span>
            <select name="guests">${options}</select>
          </label>
          <label class="field">
            <span>Tilaklaringiz</span>
            <textarea name="message" rows="3" maxlength="500"></textarea>
          </label>
          <input class="hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <p class="form__status" id="rsvp-status" role="status"></p>
          <button class="btn btn--solid" type="submit">Javobni yuborish</button>
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
      <h2 class="title">Tilaklar</h2>
      <ul class="wishes__list" id="wishes-list"></ul>
    </section>
  `;
}

function contacts(c) {
  if (!c.contacts?.length) return '';
  return html`
    <section class="section contacts">
      <h2 class="title" data-reveal>Savollar bo‘lsa</h2>
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
      <p class="footer__closing" data-reveal>${c.texts?.closing}</p>
      <p class="footer__names" data-reveal>${d.groom} <span>&amp;</span> ${d.bride}</p>
      ${brand?.enabled
        ? html`<a class="brand" href="${brand.url}" target="_blank" rel="noopener">
            ${brand.logo
              ? html`<img src="${brand.logo}" alt="" width="28" height="28" loading="lazy" />`
              : html`<svg class="brand__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" /></svg>`}
            <span>${brand.text}<b>${brand.name}</b></span>
          </a>`
        : ''}
    </footer>
  `;
}

function musicButton(c) {
  // musicUrl — admin paneldan tanlangan to'plamdagi qo'shiq; bo'lmasa config'dagi media fayl
  const src = c.musicUrl || mediaUrl(c.music);
  if (!src) return '';
  return html`
    <audio id="music" src="${src}" loop preload="none"></audio>
    <button class="music" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
    </button>
  `;
}

// Fon rasmi ustidagi krem pardaning quyuqligi (0..1). Katta — rasm xiraroq, matn aniqroq.
function bgVeil(c) {
  const v = Number(c.backgroundOverlay);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.84;
}

export function renderPage(c, d, brand) {
  return html`
    ${envelope(c, d)}
    <div class="petals" id="petals" aria-hidden="true"></div>
    ${c.backgroundImage
      ? html`<div class="page-bg" aria-hidden="true" style="background-image:url('${mediaUrl(c.backgroundImage)}');--bg-veil:${bgVeil(c)}"></div>`
      : ''}
    <div class="page${c.backgroundImage ? ' page--photo' : ''}">
      ${hero(c, d)}
      <main>
        ${invite(c, d)}
        ${dateSection(c, d)}
        ${countdown()}
        <div class="band" aria-hidden="true"></div>
        ${venue(c)}
        ${program(c)}
        ${dressCode(c)}
        ${gallery(c)}
        ${rsvp(c, d)}
        ${wishes(c)}
        ${contacts(c)}
      </main>
      ${footer(c, d, brand)}
    </div>
    ${musicButton(c)}
  `.value;
}
