// "Tirik suzani" shabloni: sahifa — o'zbek suzanisi. Pastga surilganda igna naqshlarni
// ipma-ip tikib boradi, ismlar tilla ipda tikiladi, anorlar bosilsa donalari sachraydi,
// har bir tilak suzaniga yangi gul bo'lib tikiladi.
// mountSuzani() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import '../osmon/fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, MONTHS } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import brand from '@brand-config';
import { PALETTE, medallion, rosette, pomegranate, tulip, heart, rings, DOVE, spoolSvg, wishFlower } from './motifs.js';
import { installDefs, renderMotif, track, setReduced, resetTracks } from './stitch.js';
import { burstSeeds, celebrate, drizzle, swingTassels, tasselsHtml, setReducedFx } from './fx.js';
import { phrases } from '../../src/lib/events.js';
import { initAutoScroll } from '../../src/lib/autoscroll.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const pad = (n) => String(n).padStart(2, '0');
setReduced(reduced);
setReducedFx(reduced);

function hashStr(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

/* ---------------------------- Qayta chizish uchun tozalash ---------------------------- */
let scope = null;
function newScope() {
  scope?.abort();
  resetTracks();
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

/* ------------------------------------ Belgilar ------------------------------------ */
const ICON = {
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
};

const BLESSINGS = ['Baxt! 💛', 'Baraka! 🌾', 'Farovonlik! 🏡', 'Mehr-oqibat! 🤝', 'Farzandlar! 👶', 'Totuvlik! 🕊️', 'Uzoq umr! 🌳', 'Muhabbat! ❤️'];


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

/* ------------------------------------ Sahifa ------------------------------------ */
function renderPage(c, d) {
  const t = c.texts || {};
  const ph = phrases(c);
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const dress = c.dressCode?.text?.trim() || c.dressCode?.colors?.length ? c.dressCode : null;
  const contacts = (c.contacts || []).filter((x) => x?.name && x?.phone);
  const v = c.venue;
  const weekday = d.weekdayName.charAt(0).toUpperCase() + d.weekdayName.slice(1);
  const dateLine = `${d.day}-${MONTHS[d.month - 1]}, ${d.year}`;
  const head = (eyebrow, title) => html`<p class="eyebrow">${eyebrow}</p><h2 class="title">${title}</h2>`;

  return html`
    <div class="gate" id="gate">
      <div class="gate__rod" aria-hidden="true"><i></i></div>
      <div class="gate__cloth">
        ${[1, 2, 3, 4].map((i) => html`<div class="gate__corner gate__corner--${i}" aria-hidden="true"></div>`)}
        <div class="gate__inner">
          <p class="eyebrow">${t.heroCaption || ph('heroCaption', 'Nikoh to‘yiga taklifnoma')}</p>
          <p class="gate__names">${d.groom} <span>&amp;</span> ${d.bride}</p>
          <p class="gate__date">${dateLine}</p>
          <button class="btn btn--gold gate__btn" id="gate-open" type="button">🪡 Suzanini ochish</button>
          <p class="gate__hint">${raw(ICON.music)} ovoz bilan oching</p>
        </div>
        ${raw(tasselsHtml(11))}
      </div>
    </div>

    <button class="fab" id="music-toggle" type="button" aria-label="Musiqani yoqish" aria-pressed="false" hidden>${raw(ICON.music)}<span class="fab__bars" aria-hidden="true"><i></i><i></i><i></i></span></button>

    <main class="page" id="page">
      <section class="hero" aria-label="Taklifnoma">
        <h1 class="sr-only">${d.names}</h1>
        <p class="eyebrow hero__eyebrow">${t.heroCaption || ph('heroCaption', 'Nikoh to‘yiga taklifnoma')}</p>
        <div class="medallion" id="medallion"></div>
        <p class="hero__date"><span>${weekday}</span><b>${pad(d.day)} · ${pad(d.month)} · ${d.year}</b><span>soat ${c.event.time}</span></p>
        <div class="patch patch--round patch--a" style="--rot:-10deg">💍</div>
        <div class="patch patch--ribbon patch--b" style="--rot:6deg">${ph('badge', 'Nikoh to‘yi')}</div>
        <div class="hero__garden" aria-hidden="true"><div id="hg-1"></div><div id="hg-2"></div><div id="hg-3"></div></div>
        <p class="hero__hint" aria-hidden="true">✨ Suzaniga bosing — gul tikiladi</p>
        ${raw(tasselsHtml(9))}
      </section>

      <div class="band" aria-hidden="true"></div>

      <section class="section invite">
        <div class="doves" id="doves" aria-hidden="true"></div>
        <div class="card framed">
          <p class="eyebrow">${t.greeting || 'Hurmatli mehmonimiz!'}</p>
          <p class="invite__text">${t.invitation || ph('invitation', `Sizni farzandlarimiz ${d.groom} va ${d.bride}ning nikoh to‘yi marosimiga taklif etamiz.`, d.groom, d.bride)}</p>
          ${c.hosts ? html`<p class="invite__hosts"><span>Hurmat bilan,</span>${c.hosts}</p>` : ''}
          <div class="patch patch--oval patch--c" style="--rot:-7deg">Baxtli bo‘ling! 🌷</div>
        </div>
      </section>

      ${c.effects?.countdown === false
        ? ''
        : html`
      <section class="section when">
        ${head(ph('until', 'To‘yimizgacha'), 'Har bir chok — kutilgan bir lahza')}
        <div class="hoops" id="countdown">
          ${['kun', 'soat', 'daqiqa', 'soniya'].map((u) => html`<div class="hoop"><div class="hoop__cloth"><b data-unit="${u}">00</b></div><span>${u}</span></div>`)}
        </div>
        <p class="when__done" id="countdown-done" hidden>🎉 ${ph('came', 'To‘y kuni keldi — biz bilan bo‘lganingiz uchun rahmat!')}</p>
        <div class="motif-rings" id="rings"></div>
        <div class="btn-row">
          <a class="btn" id="gcal" target="_blank" rel="noopener">${raw(ICON.calendar)}<span>Google taqvim</span></a>
          <button class="btn" id="ics" type="button">${raw(ICON.calendar)}<span>Telefon taqvimi</span></button>
        </div>
      </section>`}

      ${program.length ? html`
      <section class="section program">
        ${head(ph('programTitle', 'To‘y dasturi'), ph('programLead', 'Kecha qanday o‘tadi'))}
        <ol class="vine" id="vine">
          ${program.map((p, i) => html`<li class="vine__item" style="--i:${i}"><span class="vine__flower" data-flower="${i}"></span><time>${p.time}</time><p>${p.title}</p></li>`)}
        </ol>
      </section>` : ''}

      <section class="section anor">
        ${head('Baraka anorlari', 'Anorni bosing 👆')}
        <p class="lead">Anor — to‘kinlik va baraka ramzi. Har bir donasi yosh oilaga tilak.</p>
        <div class="anor__row" id="anors">
          ${[0, 1, 2].map((i) => html`<button class="anor__fruit" type="button" data-anor="${i}" aria-label="Anorni ochish"></button>`)}
        </div>
        <p class="anor__word" id="anor-word" aria-live="polite"></p>
      </section>

      <section class="section venue">
        <div class="tulip tulip--l" id="tulip-l" aria-hidden="true"></div>
        <div class="tulip tulip--r" id="tulip-r" aria-hidden="true"></div>
        <div class="card framed">
          ${head('Manzil', v.name)}
          <p class="venue__address">${raw(ICON.pin)}<span>${v.address}</span></p>
          ${v.googleMaps || v.yandexMaps ? html`<div class="btn-row">
            ${v.googleMaps ? html`<a class="btn btn--red" href="${v.googleMaps}" target="_blank" rel="noopener">📍 Google xarita</a>` : ''}
            ${v.yandexMaps ? html`<a class="btn btn--red" href="${v.yandexMaps}" target="_blank" rel="noopener">🗺️ Yandex xarita</a>` : ''}
          </div>` : ''}
          <div class="patch patch--round patch--d" style="--rot:9deg">🏛️</div>
        </div>
      </section>

      ${dress ? html`
      <section class="section dress">
        ${head('Dress-kod', 'Kiyim ranglari')}
        ${dress.text ? html`<p class="lead">${dress.text}</p>` : ''}
        ${dress.colors?.length ? html`
          <div class="spools" id="spools">
            ${dress.colors.map((col, i) => html`<button class="spool" type="button" style="--c:${col};--i:${i}" data-spool="${col}" aria-label="Rang ${col}">${raw(spoolSvg(col))}</button>`)}
          </div>
          <p class="hint">G‘altakni bosing — ip yoyiladi 🧵</p>
          <div class="threads" id="threads" aria-hidden="true"></div>` : ''}
      </section>` : ''}

      ${c.rsvp?.enabled ? html`
      <section class="section rsvp" id="rsvp">
        <div class="card framed">
          ${head('Javobingiz', 'Kela olasizmi?')}
          <p class="lead">Javob qoldiring. Yozgan tilagingiz shu suzaniga yangi gul bo‘lib tikiladi 🌸</p>
          <form class="form" id="rsvp-form" novalidate>
            <label class="field"><span>Ismingiz</span><input name="name" autocomplete="name" maxlength="80" required placeholder="Ism va familiya" /></label>
            <fieldset class="choice">
              <legend>Kela olasizmi?</legend>
              <label><input type="radio" name="attending" value="yes" /><span>✅ Albatta boraman</span></label>
              <label><input type="radio" name="attending" value="no" /><span>😔 Afsuski, bora olmayman</span></label>
            </fieldset>
            <label class="field" id="guests-field" hidden><span>Necha kishi bo‘lasiz?</span>
              <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} kishi</option>`)}</select>
            </label>
            <label class="field"><span>Tilagingiz <em>(ixtiyoriy)</em></span><textarea name="message" rows="3" maxlength="500" placeholder="Yosh oilaga eng ezgu tilaklaringiz…"></textarea></label>
            <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
            <button class="btn btn--gold" type="submit"><span>Yuborish</span></button>
            <p class="form__status" id="rsvp-status" role="status" aria-live="polite"></p>
            ${d.rsvpClosesAt ? html`<p class="hint">Javob muddati: ${Number(c.rsvp.deadline.slice(8))}-${MONTHS[Number(c.rsvp.deadline.slice(5, 7)) - 1]}gacha</p>` : ''}
          </form>
          <div class="done" id="rsvp-done" hidden></div>
        </div>
        <div class="garden card framed" id="garden" hidden>
          <p class="eyebrow">Tilaklar suzanisi</p>
          <p class="garden__count"><b id="wish-count">0</b> ta tilak — har biri bitta gul 🌸 <small>(gulni bosing)</small></p>
          <div class="garden__grid" id="garden-grid"></div>
        </div>
      </section>` : ''}

      <section class="final">
        <div class="final__doves" id="final-heart" aria-hidden="true"></div>
        <p class="final__lead">${t.closing || 'Tashrifingiz biz uchun katta sharaf!'}</p>
        <p class="final__names">${d.groom} <span>&amp;</span> ${d.bride}</p>
        ${c.hosts ? html`<p class="final__hosts">${c.hosts}</p>` : ''}
        <button class="btn btn--gold final__btn" id="congrats" type="button">🎉 Tabriklash</button>
        ${contacts.length ? html`<div class="contacts">${contacts.map((ct) => html`<a class="btn" href="tel:${ct.phone.replace(/[^\d+]/g, '')}">${raw(ICON.phone)}<span>${ct.name}: ${ct.phone}</span></a>`)}</div>` : ''}
        ${brandLink()}
        ${raw(tasselsHtml(11))}
      </section>
    </main>
    <div class="tip" id="tip" hidden></div>
    <audio id="music" loop preload="none"></audio>
  `.value;
}

/* ------------------------------------ Tikiladigan naqshlar ------------------------------------ */
function fitNames(groom, bride) {
  // Ismlar medalyonning ichki doirasiga (diametri ~170 birlik) sig'ishi kerak
  const cv = document.createElement('canvas').getContext('2d');
  const size = (name, max) => {
    cv.font = '100px "Great Vibes"';
    const w = cv.measureText(name).width / 100;
    return Math.min(max, 158 / Math.max(w, 0.1));
  };
  const s = Math.min(size(groom, 50), size(bride, 50));
  return [
    { text: groom, x: 0, y: -18, size: s, fill: 'gold', color: PALETTE.goldDark },
    { text: '&', x: 0, y: 14, size: s * 0.62, fill: 'red', color: PALETTE.redDark },
    { text: bride, x: 0, y: 14 + s * 0.95, size: s, fill: 'gold', color: PALETTE.goldDark },
  ];
}

function mountMotif(host, motif, opts = {}) {
  if (!host) return null;
  const m = renderMotif(motif, opts);
  host.append(m.svg);
  return m;
}

function buildStitches(c, d, { preview }) {
  const auto = [];
  // 1) Medalyon + ismlar (ochilganda avtomatik tikiladi)
  const med = medallion();
  med.parts = [...fitNames(d.groom, d.bride), ...med.parts];
  const hero = mountMotif($('#medallion'), med, { title: d.names });
  // Medalyondan keyin pastdagi lola–anor–lola birin-ketin tikiladi
  const garden = [
    [$('#hg-1'), tulip('red')],
    [$('#hg-2'), pomegranate()],
    [$('#hg-3'), tulip('rose')],
  ]
    .map(([host, motif]) => mountMotif(host, motif))
    .filter(Boolean)
    .map((m) => track(m, { mode: 'auto', speed: preview ? 50 : 0.9 }));
  const chain = (i) => {
    if (!garden[i]) return;
    garden[i].start();
    setTimeout(() => chain(i + 1), preview ? 0 : 1100);
  };
  auto.push(track(hero, { mode: 'auto', speed: preview ? 50 : 0.16, onDone: () => chain(0) }));

  // Kirish oynasi burchaklaridagi tayyor (tikilgan) gullar
  $$('.gate__corner').forEach((host, i) => {
    const m = mountMotif(host, rosette({ petals: 8, color: i % 2 ? 'indigo' : 'red', inner: 'gold' }));
    m?.setProgress(1);
  });

  // 2) Kaptarlar va yurak
  const doves = $('#doves');
  if (doves) {
    doves.innerHTML = `
      <svg viewBox="0 0 240 120" class="doves__svg">
        <g class="dove dove--l"><g transform="translate(120,0) scale(-1,1)"><g transform="translate(6,10)">${doveSvg()}</g></g></g>
        <g class="dove dove--r"><g transform="translate(114,10)">${doveSvg()}</g></g>
      </svg>`;
    const h = mountMotif(doves, heart('red'), { className: 'doves__heart' });
    track(h, { trigger: doves, speed: 0.9 });
    const io = scope.observe(new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && doves.classList.add('is-in')), { threshold: 0.4 }));
    io.observe(doves);
  }

  // 3) Uzuklar
  const r = mountMotif($('#rings'), rings());
  if (r) track(r, { speed: 0.8 });

  // 4) Dastur: har bandga gul
  $$('[data-flower]').forEach((host, i) => {
    const m = mountMotif(host, rosette({ petals: 6 + (i % 3), color: ['red', 'indigo', 'rose', 'gold'][i % 4], inner: i % 4 === 3 ? 'red' : 'gold' }));
    track(m, { trigger: host, speed: 1.1 });
  });

  // 5) Anorlar
  $$('[data-anor]').forEach((host) => {
    const m = mountMotif(host, pomegranate());
    track(m, { trigger: host, speed: 0.75 });
  });

  // 6) Lolalar (manzil yonida)
  for (const [id, col] of [['#tulip-l', 'red'], ['#tulip-r', 'rose']]) {
    const m = mountMotif($(id), tulip(col));
    if (m) track(m, { speed: 0.7 });
  }

  // 7) Yakun: yurak
  const fh = mountMotif($('#final-heart'), heart('red'));
  if (fh) track(fh, { speed: 0.9 });
  return auto;
}

function doveSvg() {
  return `<path d="${DOVE.tail}" class="dove__tail"/><path d="${DOVE.body}" class="dove__body"/><g class="dove__wing"><path d="${DOVE.wing}"/></g><path d="${DOVE.eye}" class="dove__eye"/><path d="M96,37L104,37L96,40Z" class="dove__beak"/>`;
}

/* ------------------------------------ Ekranga bosganda — gul ------------------------------------ */
function initTapFlowers() {
  const page = $('#page');
  const placed = [];
  scope.on(page, 'pointerdown', (e) => {
    if (e.target.closest('a, button, input, textarea, select, label, .card, .garden, .hoop, .spool, .anor__fruit')) return;
    const r = page.getBoundingClientRect();
    const host = document.createElement('div');
    host.className = 'tapflower';
    host.style.left = `${e.clientX - r.left}px`;
    host.style.top = `${e.clientY - r.top}px`;
    page.append(host);
    const seed = Math.floor(Math.random() * 1e9);
    const m = mountMotif(host, wishFlower(seed));
    track(m, { mode: 'auto', speed: 1.6 }).start();
    placed.push(host);
    if (placed.length > 14) placed.shift().remove();
    $('.hero__hint')?.classList.add('is-used');
  });
}

/* ------------------------------------ Sanoq (gardishlar) ------------------------------------ */
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
        // Raqam qaytadan tikiladi
        n.classList.remove('is-stitch');
        void n.offsetWidth;
        n.classList.add('is-stitch');
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
  // Bosh qismdagi yamoqlar suzani ochilgandan keyin tikiladi (openHero)
  const els = $$('.section, .patch, .final, .vine__item').filter((el) => !el.closest('.hero'));
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
    { threshold: 0.2 },
  ));
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------ Anorlar ------------------------------------ */
function initAnors() {
  const word = $('#anor-word');
  let n = 0;
  $$('[data-anor]').forEach((b) =>
    b.addEventListener('click', () => {
      const r = b.getBoundingClientRect();
      b.classList.remove('is-pop');
      void b.offsetWidth;
      b.classList.add('is-pop');
      burstSeeds(r.left + r.width / 2, r.top + r.height * 0.45, 26);
      word.textContent = BLESSINGS[n++ % BLESSINGS.length];
      word.classList.remove('is-in');
      void word.offsetWidth;
      word.classList.add('is-in');
    }),
  );
}

/* ------------------------------------ G'altaklar ------------------------------------ */
function initSpools() {
  const host = $('#threads');
  if (!host) return;
  $$('[data-spool]').forEach((b, i) =>
    b.addEventListener('click', () => {
      b.classList.remove('is-spin');
      void b.offsetWidth;
      b.classList.add('is-spin');
      // Ip to'lqin bo'lib yoyiladi
      const y = 10 + (i % 4) * 9;
      const amp = 6 + (i % 3) * 2;
      let d = `M0,${y}`;
      for (let x = 0; x <= 300; x += 20) d += ` Q${x + 10},${y + ((x / 20) % 2 ? amp : -amp)} ${x + 20},${y}`;
      const m = renderMotif({ viewBox: '0 0 320 50', parts: [{ d, color: b.dataset.spool, stitch: 'chain', w: 2.6 }] }, { className: 'thread' });
      host.prepend(m.svg);
      track(m, { mode: 'auto', speed: 1.2 }).start();
      while (host.children.length > 5) host.lastElementChild.remove();
    }),
  );
}

/* ------------------------------------ Javob va tilaklar bog'i ------------------------------------ */
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
  const thanks = (a, name) => (a === 'yes' ? `Rahmat, ${name}! 🥰 Sizni ${phrases(c)('thanksAt', 'to‘yda')} intizorlik bilan kutamiz.` : `Rahmat, ${name}! 🤍 Xabar berganingiz uchun minnatdormiz.`);
  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<p class="done__icon">🪡</p><p>${text}</p>${withChange ? html`<button class="link" type="button" id="rsvp-change">Javobni o‘zgartirish</button>` : ''}`.value;
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
  if ((d.rsvpClosesAt && now > d.rsvpClosesAt.getTime()) || now >= d.start.getTime()) showDone('Javoblar qabul qilish muddati tugagan. Tilaklaringiz uchun rahmat! 🌷', false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));

  const submitLabel = $('button[type="submit"] span', form);
  function sync() {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
    submitLabel.textContent = form.elements.namedItem('message').value.trim() ? '🌸 Tilakni tikib yuborish' : 'Yuborish';
  }
  form.addEventListener('change', sync);
  form.addEventListener('input', sync);
  sync();
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };

  // Tilaklar bog'i
  const garden = $('#garden');
  const grid = $('#garden-grid');
  const known = new Set();
  const tip = $('#tip');
  function addFlower(w, { fresh = false } = {}) {
    const key = `${w.name}|${w.message}`;
    if (known.has(key)) return;
    known.add(key);
    garden.hidden = false;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'garden__flower';
    b.setAttribute('aria-label', `${w.name} tilagi`);
    b.dataset.name = w.name;
    b.dataset.msg = w.message;
    fresh ? grid.prepend(b) : grid.append(b);
    const m = mountMotif(b, wishFlower(hashStr(key)));
    const tr = track(m, { mode: fresh ? 'auto' : 'scroll', trigger: b, speed: fresh ? 0.9 : 1.4 });
    if (fresh) tr.start();
    $('#wish-count').textContent = String(known.size);
  }
  scope.on(document, 'click', (e) => {
    const f = e.target.closest('.garden__flower');
    if (!f) {
      if (!e.target.closest('.tip')) tip.hidden = true;
      return;
    }
    tip.innerHTML = html`<b>${f.dataset.name}</b><p>${f.dataset.msg}</p>`.value;
    tip.hidden = false;
    const r = f.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    const x = Math.min(Math.max(12, r.left + r.width / 2 - tr.width / 2), innerWidth - tr.width - 12);
    const y = r.top - tr.height - 10 < 10 ? r.bottom + 10 : r.top - tr.height - 10;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  });

  async function loadWishes() {
    if (preview) {
      [
        { name: 'Mehmon', message: 'Baxtingiz suzanidagi naqshlardek rang-barang bo‘lsin!' },
        { name: 'Do‘stingiz', message: 'Oilangiz mustahkam, xonadoningiz nurga to‘la bo‘lsin.' },
        { name: 'Qarindoshingiz', message: 'Qo‘sha qaringlar!' },
      ].forEach((w) => addFlower(w));
      return;
    }
    try {
      const json = await (await fetch('/api/wishes', { cache: 'no-store' })).json();
      if (json?.ok && Array.isArray(json.wishes)) json.wishes.slice(0, 60).forEach((w) => addFlower(w));
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
      showDone(thanks(data.attending, data.name));
      const r = btn.getBoundingClientRect();
      celebrate({ x: r.left + r.width / 2, y: Math.max(80, r.top), count: 70 });
      if (data.message) {
        addFlower({ name: data.name, message: data.message }, { fresh: true });
        setTimeout(() => garden.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 600);
      }
    } catch {
      setStatus('Internet aloqasini tekshirib, qayta urinib ko‘ring.', true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountSuzani(c, { preview = false } = {}) {
  newScope();
  installDefs();
  const d = deriveConfig(c);
  const app = $('#app');
  // Ismlar tilla ipda tikilishi uchun shrift oldin yuklanadi (ko'pi bilan 2.5 soniya)
  try {
    await Promise.race([document.fonts.load('60px "Great Vibes"'), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  const y = window.scrollY;
  app.innerHTML = renderPage(c, d);
  const auto = buildStitches(c, d, { preview });
  initCountdown(d);
  initCalendar(c, d);
  initReveal();
  initAnors();
  initSpools();
  initTapFlowers();
  initRsvp(c, d, preview);
  swingTassels();
  $('#congrats').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    celebrate({ x: r.left + r.width / 2, y: r.top, count: 110 });
  });

  const gate = $('#gate');
  const music = preview ? { play() {} } : initMusic(musicUrlOf(c));
  const ascroll = preview ? { ready() {} } : initAutoScroll(c, { slow: '.section.invite, .section.when' });
  const startAll = () => {
    auto.forEach((a) => a.start());
    // Bosh qismdagi yamoqlar birin-ketin "tikib qo'yiladi"
    $$('.hero .patch').forEach((p, i) => setTimeout(() => p.classList.add('is-in'), preview ? 0 : 2600 + i * 700));
  };
  if (preview) {
    gate.remove();
    $('#music-toggle')?.remove();
    document.body.classList.add('is-open');
    startAll();
    window.scrollTo(0, y);
    return;
  }
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  const btn = $('#gate-open');
  btn.focus({ preventScroll: true });
  btn.addEventListener('click', () => {
    window.scrollTo(0, 0);
    music.play();
    gate.classList.add('is-opening');
    setTimeout(() => {
      startAll();
      drizzle(46);
    }, reduced ? 0 : 900);
    setTimeout(() => {
      gate.remove();
      document.documentElement.classList.remove('is-locked');
      document.body.classList.add('is-open');
      $('#music-toggle').hidden = false;
      ascroll.ready();
    }, reduced ? 100 : 1500);
  });
}
