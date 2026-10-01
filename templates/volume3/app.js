// "Volume 3" shabloni: to'q ko'k konvert va tilla muhr, ko'k kartush ichida ismlar, haftalik taqvim,
// sana va vaqt, saroy surati bilan manzil, sanoq va uzuklar, ishtirokni tasdiqlash, mehmonlar kitobi.
// Ma'lumotlar — config.json (panel), javob va tilaklar — /api/rsvp, /api/wishes, brend — brand.config.js.
// mountVolume3() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import '../osmon/fonts/fonts.css';
import './fonts/fonts.css';
import './styles.css';
import './extra.css';
import { deriveConfig, musicUrlOf, MONTHS } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import { LANGS, siteLangs, pickLang, rememberLang, localize, scriptSafe, cyr } from '../../src/lib/i18n.js';
import brand from '@brand-config';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/* ------------------------------------ Matnlar ------------------------------------ */
const RU_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const RU_MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const UZ_WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const RU_WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const T = {
  uz: {
    top: 'SIZ',
    middle: 'TO‘YIMIZGA',
    script: 'taklif etilgansiz',
    withLove: 'muhabbat ila,',
    open: 'ochish',
    amp: 'va',
    blessing: 'Alloh ularni qalbini sevgi ila birlashtirdi<br/>(Anfol surasi, 63-oyat)',
    welcome: 'Aziz&nbsp;va&nbsp;qadrdon<br/><span class="no-break">insonimiz!</span>',
    lead: 'Sizni nikoh to‘yimiz munosabati bilan bo‘lib o‘tadigan "Visol oqshomi"ga taklif etamiz.',
    scroll: 'Pastga suring',
    weekdays: ['DU', 'SE', 'CHOR', 'PAY', 'JU', 'SHA', 'YA'],
    dateTime: 'Sana va vaqt',
    dateLabel: 'Sana',
    timeLabel: 'Vaqt',
    starts: 'Marosim boshlanishi',
    location: 'To‘y manzili',
    yandex: 'Yandex xaritasi',
    google: 'Google Maps',
    countdown: 'Har lahzani sanayapmiz',
    units: ['Kun', 'Soat', 'Daqiqa', 'Soniya'],
    waiting: 'Sizni intiqlik bilan kutamiz.',
    today: 'Bugun aynan o‘sha kun. Sizni kutamiz.',
    program: 'To‘y dasturi',
    dress: 'Kiyim uslubi',
    rsvp: 'Iltimos, ishtirokingizni tasdiqlang',
    yourName: 'Ismingiz',
    namePh: 'Ism va familiya',
    yes: 'Albatta boraman',
    no: 'Kela olmayman',
    guests: 'Necha kishi bo‘lasiz?',
    person: 'kishi',
    confirm: 'Tasdiqlash',
    deadline: (d, m) => `Javob muddati: ${d}-${MONTHS[m - 1]}gacha`,
    guestbook: 'Mehmonlar Kitobi',
    gbName: 'Ismingizni kiriting',
    gbMsg: 'Xabaringizni yozing',
    gbSend: 'Xabar yuborish',
    sending: 'Yuborilmoqda…',
    needName: 'Iltimos, ismingizni kiriting.',
    needAnswer: 'Iltimos, kela olishingizni belgilang.',
    needMsg: 'Iltimos, xabaringizni yozing.',
    gbFirst: 'Xabaringiz saqlandi — uni yuborish uchun yuqorida ishtirokingizni tasdiqlang.',
    gbThanks: 'Rahmat! Tilagingiz kitobga yozildi.',
    thanksYes: (n) => `Rahmat, ${n}! Sizni to‘yda intiqlik bilan kutamiz.`,
    thanksNo: (n) => `Rahmat, ${n}! Xabar berganingiz uchun minnatdormiz.`,
    change: 'Javobni o‘zgartirish',
    closed: 'Javoblar qabul qilish muddati tugagan. Rahmat!',
    error: 'Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.',
    offline: 'Internet aloqasini tekshirib, qayta urinib ko‘ring.',
    preview: 'Ko‘rinish rejimi — javob yuborilmaydi.',
    ctaTitle: 'To‘y taklifnomangizni buyurtma bering',
    ctaSub: 'O‘zingizning go‘zal to‘y veb-saytingizni yarating',
    musicOn: 'Musiqani yoqish',
    musicOff: 'Musiqani o‘chirish',
  },
  ru: {
    top: 'ВЫ',
    middle: 'ПРИГЛАШЕНЫ',
    script: 'на свадьбу',
    withLove: 'с любовью,',
    open: 'нажмите',
    amp: 'и',
    blessing: 'Аллах объединил их сердца любовью<br/>(сура «Аль-Анфаль», аят 63)',
    welcome: 'Дорогие&nbsp;наши<br/>родные&nbsp;и&nbsp;<span class="no-break">близкие!</span>',
    lead: 'По случаю нашего бракосочетания приглашаем Вас на торжественный свадебный вечер.',
    scroll: 'Листайте вниз',
    weekdays: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'],
    dateTime: 'Дата и время',
    dateLabel: 'Дата',
    timeLabel: 'Время',
    starts: 'Начало торжества',
    location: 'Место проведения',
    yandex: 'Яндекс Карты',
    google: 'Google Maps',
    countdown: 'Считаем каждое мгновение',
    units: ['Дней', 'Часов', 'Минут', 'Секунд'],
    waiting: 'Мы ждём вас.',
    today: 'Этот день настал. Мы ждём вас.',
    program: 'Программа вечера',
    dress: 'Дресс-код',
    rsvp: 'Пожалуйста, подтвердите присутствие',
    yourName: 'Ваше имя',
    namePh: 'Имя и фамилия',
    yes: 'Обязательно приду',
    no: 'Не смогу прийти',
    guests: 'Сколько вас будет?',
    person: 'чел.',
    confirm: 'Подтвердить',
    deadline: (d, m) => `Ответ до ${d} ${RU_MONTHS_GEN[m - 1]}`,
    guestbook: 'Книга гостей',
    gbName: 'Введите ваше имя',
    gbMsg: 'Напишите пожелание',
    gbSend: 'Отправить',
    sending: 'Отправка…',
    needName: 'Пожалуйста, введите имя.',
    needAnswer: 'Пожалуйста, отметьте, сможете ли прийти.',
    needMsg: 'Пожалуйста, напишите пожелание.',
    gbFirst: 'Пожелание сохранено — подтвердите присутствие выше, и оно будет отправлено.',
    gbThanks: 'Спасибо! Пожелание добавлено в книгу.',
    thanksYes: (n) => `Спасибо, ${n}! Ждём вас на торжестве.`,
    thanksNo: (n) => `Спасибо, ${n}, что сообщили!`,
    change: 'Изменить ответ',
    closed: 'Приём ответов завершён. Спасибо!',
    error: 'Произошла ошибка. Попробуйте ещё раз.',
    offline: 'Проверьте интернет и попробуйте ещё раз.',
    preview: 'Режим просмотра — ответ не отправляется.',
    ctaTitle: 'Закажите свадебное приглашение',
    ctaSub: 'Создайте свой красивый свадебный сайт',
    musicOn: 'Включить музыку',
    musicOff: 'Выключить музыку',
  },
};
// O'zbek kirill: interfeys matnlari lotinchadan o'giriladi
const texts = (lang) => {
  if (lang === 'ru') return T.ru;
  if (lang !== 'uzc') return T.uz;
  return { ...cyr(T.uz), weekdays: ['ДУ', 'СЕ', 'ЧОР', 'ПАЙ', 'ЖУ', 'ШАН', 'ЯК'], google: 'Google Maps' };
};

const RU_DEFAULTS = {
  heroCaption: '',
  greeting: '',
  invitation: () => T.ru.lead,
  closing: '',
};

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

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  msg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  insta: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
};

/* ------------------------------------ Sana ------------------------------------ */
function dates(d, lang) {
  const ru = lang === 'ru';
  const month = ru ? RU_MONTHS[d.month - 1] : d.monthName;
  // Taqvim: to'y kuni joylashgan hafta (dushanbadan)
  const base = Date.UTC(d.year, d.month - 1, d.day);
  const shift = (d.weekday + 6) % 7;
  return {
    head: `${cap(month)}, ${d.year}`,
    full: ru ? `${d.day} ${RU_MONTHS_GEN[d.month - 1]} ${d.year}` : `${d.day}-${month}, ${d.year}-yil`,
    weekday: (ru ? RU_WEEKDAYS : UZ_WEEKDAYS)[d.weekday],
    week: Array.from({ length: 7 }, (_, i) => new Date(base + (i - shift) * 86400000).getUTCDate()),
  };
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

/* ------------------------------------ Sahifa ------------------------------------ */
function renderPage(c, d, L, lang, langs) {
  const t = c.texts || {};
  // Qo'lyozma shriftda қ/ҳ/ғ yo'q — kirill ismlarda к/х/г bilan chiqadi
  const first = scriptSafe(d.groom);
  const second = scriptSafe(d.bride);
  const dt = dates(d, lang);
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const dress = c.dressCode?.text?.trim() ? c.dressCode : null;
  const v = c.venue;
  const amp = L.amp;
  const sec = c.sections || {};
  const on = (k) => sec[k] !== false;
  const blessing = c.texts?.blessing != null ? html`${c.texts.blessing}` : raw(L.blessing);

  return html`
    <div class="rylx" id="rylx">
      <button class="v3-music" id="music-toggle" type="button" aria-label="${L.musicOn}" aria-pressed="false" hidden>${raw(ICON.play)}</button>
      ${langs.length > 1 ? html`
      <nav class="language-switcher" aria-label="Language">
        ${langs.map((l) => html`<button type="button" class="language-option ${l === lang ? 'is-active' : ''}" data-lang="${l}" aria-pressed="${l === lang}">${{ uz: 'UZ', uzc: 'ЎЗ', ru: 'RU' }[l]}</button>`)}
      </nav>` : ''}

      <section class="intro" id="intro">
        <div class="envelope-stage">
          <div class="flap flap-top">
            <p class="flap-note">
              <span class="flap-note-top">${L.top}</span>
              <span class="flap-note-middle">${L.middle}</span>
              <span class="flap-note-script">${L.script}</span>
            </p>
          </div>
          <div class="flap flap-left"></div>
          <div class="flap flap-right"></div>
          <div class="flap flap-bottom">
            <p class="flap-signature"><span>${L.withLove}</span><br /><strong>${first} ${amp} ${second}</strong></p>
          </div>
          <button class="seal-button" id="seal" type="button" aria-label="${L.open}"><span>${L.open}</span></button>
        </div>
      </section>

      <main class="invitation">
        <section class="letter-hero reveal" id="letterHero">
          <article class="ornament-hero" role="img" aria-label="${first} ${amp} ${second}">
            <div class="ornament-content">
              <p class="ornament-names">
                <span class="ornament-name-line">${first}</span>
                <span class="ornament-name-amp">${amp}</span>
                <span class="ornament-name-line">${second}</span>
              </p>
              <p class="ornament-message">${blessing}</p>
              <div class="ornament-date" aria-hidden="true"><span>${pad(d.day)}</span><i></i><span>${pad(d.month)}</span><i></i><span>${String(d.year).slice(2)}</span></div>
            </div>
          </article>
          <div class="scroll-indicator" aria-hidden="true"><span class="scroll-indicator__text">${L.scroll}</span><span class="scroll-indicator__arrow">↓</span></div>
        </section>

        <section class="letter-card reveal" id="letterCard">
          <h1 class="hero-title">${t.greeting ? t.greeting : raw(L.welcome)}</h1>
          <p class="lead" style="white-space: pre-wrap">${t.invitation || L.lead}</p>
        </section>

        <section class="calendar-section reveal" aria-label="${dt.head}">
          <div class="calendar" role="img" aria-label="${dt.head}">
            <div class="calendar-head"><span>${dt.head}</span></div>
            <div class="calendar-grid week-days">${L.weekdays.map((w) => html`<span>${w}</span>`)}</div>
            <div class="calendar-grid days">
              ${dt.week.map((n) => (n === d.day ? html`<div class="heart-cell"><span class="heart-day"><span>${n}</span></span></div>` : html`<span>${n}</span>`))}
            </div>
          </div>
        </section>

        ${on('details') ? html`
        <section class="datetime-section reveal" aria-label="${L.dateTime}">
          <h2 class="datetime-title">${L.dateTime}</h2>
          <div class="datetime-panel">
            <div class="datetime-item"><span class="datetime-label">${L.dateLabel}</span><span class="datetime-value">${dt.full}</span><span class="datetime-note">${dt.weekday}</span></div>
            <span class="datetime-rule" aria-hidden="true"></span>
            <div class="datetime-item"><span class="datetime-label">${L.timeLabel}</span><span class="datetime-value">${c.event.time}</span><span class="datetime-note">${L.starts}</span></div>
          </div>
        </section>` : ''}

        ${program.length ? html`
        <section class="rylx-extra reveal" aria-label="${L.program}">
          <h2 class="rylx-extra-title">${L.program}</h2>
          <div class="rylx-card"><ol class="v3-program">${program.map((p) => html`<li><time>${p.time}</time><i aria-hidden="true"></i><span>${p.title}</span></li>`)}</ol></div>
        </section>` : ''}

        ${on('location') ? html`
        <section class="location-section reveal" aria-label="${L.location}">
          <h2 class="location-title">${L.location}</h2>
          <p class="venue-name">${v.name}</p>
          ${v.address ? html`<p class="venue-address">${v.address}</p>` : ''}
          ${v.googleMaps || v.yandexMaps ? html`
          <div class="map-links">
            ${v.yandexMaps ? html`<a class="map-link" href="${v.yandexMaps}" target="_blank" rel="noopener noreferrer"><span>${L.yandex}</span></a>` : ''}
            ${v.googleMaps ? html`<a class="map-link" href="${v.googleMaps}" target="_blank" rel="noopener noreferrer"><span>${L.google}</span></a>` : ''}
          </div>` : ''}
        </section>` : ''}

        ${c.effects?.countdown === false || !on('countdown') ? '' : html`
        <section class="countdown-section reveal" aria-label="${L.countdown}">
          <h2>${L.countdown}</h2>
          <div class="countdown" role="timer" aria-live="off">
            ${L.units.map((u, i) => html`<div class="time-unit"><span data-unit="${i}">00</span><small>${u}</small></div>`)}
          </div>
          <p class="countdown-message" id="countdown-message">${L.waiting}</p>
        </section>`}

        ${dress ? html`
        <section class="rylx-extra reveal" aria-label="${L.dress}">
          <h2 class="rylx-extra-title">${L.dress}</h2>
          <p class="rylx-extra-sub">${dress.text}</p>
          ${dress.colors?.length ? html`<div class="v3-swatches">${dress.colors.map((col) => html`<span style="--c:${col}"></span>`)}</div>` : ''}
        </section>` : ''}

        ${c.rsvp?.enabled ? html`
        <section class="rylx-extra reveal" id="rsvp">
          <h2 class="rylx-extra-title">${L.rsvp}</h2>
          <div class="rylx-card">
            <form class="v3-form" id="rsvp-form" novalidate>
              <div class="v3-choice" role="radiogroup">
                <label><input type="radio" name="attending" value="yes" /><span>${L.yes}</span></label>
                <label><input type="radio" name="attending" value="no" /><span>${L.no}</span></label>
              </div>
              <label class="v3-field"><span class="v3-label">${L.yourName}</span><span class="v3-input">${raw(ICON.user)}<input name="name" autocomplete="name" maxlength="80" required placeholder="${L.namePh}" /></span></label>
              <label class="v3-field" id="guests-field" hidden><span class="v3-label">${L.guests}</span>
                <span class="v3-input"><select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} ${L.person}</option>`)}</select></span>
              </label>
              <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
              <button class="v3-btn" type="submit"><span>${L.confirm}</span></button>
              <p class="v3-status" id="rsvp-status" role="status" aria-live="polite"></p>
              ${d.rsvpClosesAt ? html`<p class="v3-hint">${L.deadline(Number(c.rsvp.deadline.slice(8)), Number(c.rsvp.deadline.slice(5, 7)))}</p>` : ''}
            </form>
            <div class="v3-done" id="rsvp-done" hidden></div>
          </div>
        </section>

        ${c.rsvp.showWishes === false ? '' : html`
        <section class="rylx-extra reveal" id="guestbook">
          <h2 class="rylx-extra-title">${L.guestbook}</h2>
          <div class="rylx-card">
            <form class="v3-form" id="gb-form" novalidate>
              <label class="v3-input">${raw(ICON.user)}<input name="name" maxlength="80" placeholder="${L.gbName}" aria-label="${L.gbName}" /></label>
              <label class="v3-input v3-input--area">${raw(ICON.msg)}<textarea name="message" rows="5" maxlength="500" placeholder="${L.gbMsg}" aria-label="${L.gbMsg}"></textarea></label>
              <button class="v3-btn v3-btn--gradient" type="submit"><span>${L.gbSend}</span>${raw(ICON.send)}</button>
              <p class="v3-status" id="gb-status" role="status" aria-live="polite"></p>
            </form>
          </div>
          <div class="rylx-grid" id="wishes" hidden></div>
        </section>`}` : ''}

        <footer class="invite-credit">
          ${brand?.enabled ? html`
          <div class="v3-cta rylx-cta">
            <p class="v3-cta__title">${L.ctaTitle}</p>
            <p class="v3-cta__sub">${L.ctaSub}</p>
            <a class="v3-cta__btn" href="${brand.url}" target="_blank" rel="noopener">${raw(ICON.insta)}<span>${brand.name}</span></a>
          </div>` : ''}
        </footer>
      </main>
      <audio id="music" loop preload="none"></audio>
    </div>
  `.value;
}

/* ------------------------------------ Ismlarni sig'dirish ------------------------------------ */
function fitNames() {
  for (const line of $$('.ornament-name-line')) {
    line.style.setProperty('--line-fit-scale', '1');
    const over = line.scrollWidth / Math.max(1, line.clientWidth);
    if (over > 1) line.style.setProperty('--line-fit-scale', String(Math.max(0.5, 0.98 / over)));
  }
}

/* ------------------------------------ Sanoq ------------------------------------ */
function initCountdown(d, L) {
  const cells = $$('[data-unit]');
  if (!cells.length) return;
  const tick = () => {
    const diff = Math.max(0, d.start.getTime() - Date.now());
    const s = Math.floor(diff / 1000);
    const vals = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
    vals.forEach((val, i) => {
      const txt = pad(val);
      if (cells[i].textContent !== txt) cells[i].textContent = txt;
    });
    if (diff <= 0) $('#countdown-message').textContent = L.today;
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
    els.forEach((el) => el.classList.add('visible'));
    return;
  }
  const io = scope.observe(new IntersectionObserver(
    (entries, obs) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      obs.unobserve(e.target);
    }),
    { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
  ));
  els.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 90, 360)}ms`;
    io.observe(el);
  });
}

/* ------------------------------------ Musiqa ------------------------------------ */
function initMusic(src, L) {
  const audio = $('#music');
  const btn = $('#music-toggle');
  if (!src) {
    btn.remove();
    return { play() {} };
  }
  audio.src = src;
  audio.volume = 0.55;
  const sync = () => {
    const playing = !audio.paused;
    btn.classList.toggle('is-playing', playing);
    btn.innerHTML = playing ? ICON.pause : ICON.play;
    btn.setAttribute('aria-pressed', String(playing));
    btn.setAttribute('aria-label', playing ? L.musicOff : L.musicOn);
  };
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

/* ------------------------------------ Javob va mehmonlar kitobi ------------------------------------ */
function initRsvp(c, d, L, preview) {
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
    set(val) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(val));
      } catch {
        /* localStorage yo'q */
      }
    },
  };
  let saved = preview ? null : store.get();
  let pendingWish = '';
  const guestId = saved?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
  const setStatus = (el, text, isError = false) => {
    el.textContent = text;
    el.classList.toggle('is-error', isError);
  };
  const closed = (d.rsvpClosesAt && Date.now() > d.rsvpClosesAt.getTime()) || Date.now() >= d.start.getTime();

  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<span class="v3-done__heart" aria-hidden="true"></span><p>${text}</p>${withChange ? html`<button class="v3-link" type="button" id="rsvp-change">${L.change}</button>` : ''}`.value;
    $('#rsvp-change')?.addEventListener('click', () => {
      doneBox.hidden = true;
      form.hidden = false;
      if (saved) {
        form.elements.namedItem('name').value = saved.name || '';
        for (const r of form.querySelectorAll('[name="attending"]')) r.checked = r.value === saved.attending;
        form.elements.namedItem('guests').value = saved.guests || '1';
        sync();
      }
    });
  };
  const thanks = (a, name) => (a === 'yes' ? L.thanksYes(name) : L.thanksNo(name));
  if (closed) showDone(L.closed, false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));

  function sync() {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
  }
  scope.on(form, 'change', sync);
  sync();

  async function post(data) {
    const res = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id: guestId, couple: d.names }) });
    const json = await res.json().catch(() => ({}));
    return res.ok && json.ok;
  }

  // Mehmonlar kitobi (tilaklar)
  const wishes = $('#wishes');
  const known = new Set();
  function addWish(w, fresh = false) {
    if (!wishes || !w?.name || !w?.message) return;
    const key = `${w.name}|${w.message}`;
    if (known.has(key)) return;
    known.add(key);
    wishes.hidden = false;
    const card = document.createElement('div');
    card.className = 'rylx-card v3-wish';
    card.innerHTML = html`<p class="v3-wish__msg">“${w.message}”</p><p class="v3-wish__name">— ${w.name}</p>`.value;
    fresh ? wishes.prepend(card) : wishes.append(card);
  }
  async function loadWishes() {
    if (!wishes) return;
    if (preview) {
      addWish({ name: 'Mehmon', message: 'Baxtingiz abadiy, oilangiz mustahkam bo‘lsin!' });
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
  if (!preview && wishes) scope.every(() => !document.hidden && loadWishes(), 45000);

  scope.on(form, 'submit', async (e) => {
    e.preventDefault();
    if (preview) return setStatus(status, L.preview);
    const data = Object.fromEntries(new FormData(form));
    data.name = (data.name || '').trim();
    if (!data.attending) return setStatus(status, L.needAnswer, true);
    if (data.name.length < 2) return setStatus(status, L.needName, true);
    data.message = pendingWish || saved?.message || '';
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    setStatus(status, L.sending);
    try {
      if (!(await post(data))) return setStatus(status, L.error, true);
      const { website, ...answer } = data;
      saved = { ...answer, id: guestId };
      store.set(saved);
      setStatus(status, '');
      showDone(thanks(data.attending, data.name));
      if (pendingWish) {
        addWish({ name: data.name, message: pendingWish }, true);
        pendingWish = '';
        $('#gb-form').reset();
        setStatus($('#gb-status'), L.gbThanks);
      }
    } catch {
      setStatus(status, L.offline, true);
    } finally {
      btn.disabled = false;
    }
  });

  const gb = $('#gb-form');
  if (!gb) return;
  const gbStatus = $('#gb-status');
  scope.on(gb, 'submit', async (e) => {
    e.preventDefault();
    if (preview) return setStatus(gbStatus, L.preview);
    const name = gb.elements.namedItem('name').value.trim();
    const message = gb.elements.namedItem('message').value.trim();
    if (name.length < 2) return setStatus(gbStatus, L.needName, true);
    if (!message) return setStatus(gbStatus, L.needMsg, true);
    // Tilak javob bilan birga saqlanadi: javob berilmagan bo'lsa, avval tasdiqlash so'raladi
    if (!saved?.attending) {
      pendingWish = message;
      if (!form.elements.namedItem('name').value) form.elements.namedItem('name').value = name;
      setStatus(gbStatus, closed ? L.closed : L.gbFirst, closed);
      if (!closed) $('#rsvp').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const btn = $('button[type="submit"]', gb);
    btn.disabled = true;
    setStatus(gbStatus, L.sending);
    try {
      const data = { name: saved.name, attending: saved.attending, guests: saved.guests, message };
      if (!(await post(data))) return setStatus(gbStatus, L.error, true);
      saved = { ...saved, message };
      store.set(saved);
      addWish({ name: saved.name, message }, true);
      gb.reset();
      setStatus(gbStatus, L.gbThanks);
    } catch {
      setStatus(gbStatus, L.offline, true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountVolume3(config, { preview = false } = {}) {
  newScope();
  const langs = siteLangs(config);
  const lang = preview ? langs[0] : pickLang(langs);
  const c = localize(config, lang, RU_DEFAULTS);
  const L = texts(lang);
  const d = deriveConfig(c);
  document.documentElement.lang = LANGS[lang]?.html || 'uz';
  try {
    await Promise.race([
      Promise.all([document.fonts.load('48px "Corinthia"'), document.fonts.load('20px "Cormorant Garamond"')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  const y = window.scrollY;
  const app = $('#app');
  app.innerHTML = renderPage(c, d, L, lang, langs);
  const root = $('#rylx');
  fitNames();
  scope.on(window, 'resize', fitNames);
  initCountdown(d, L);
  initReveal();
  initRsvp(c, d, L, preview);

  $$('[data-lang]').forEach((b) =>
    scope.on(b, 'click', () => {
      if (b.dataset.lang === lang) return;
      rememberLang(b.dataset.lang);
      const u = new URL(location.href);
      u.searchParams.set('lang', b.dataset.lang);
      history.replaceState(null, '', u);
      session.set('v3:opened', '1');
      mountVolume3(config, { preview });
    }),
  );

  const intro = $('#intro');
  const reveal = () => {
    intro.remove();
    root.classList.add('invitation-visible');
    document.documentElement.classList.remove('is-locked');
  };
  if (preview) {
    reveal();
    $('#music-toggle')?.remove();
    window.scrollTo(0, y);
    return;
  }
  const music = initMusic(musicUrlOf(c), L);
  // Til almashtirilganda konvert qayta ko'rsatilmaydi
  if (session.get('v3:opened')) {
    reveal();
    $('#music-toggle').hidden = false;
    window.scrollTo(0, y);
    return;
  }
  document.documentElement.classList.add('is-locked');
  const seal = $('#seal');
  scope.on(seal, 'click', () => {
    window.scrollTo(0, 0);
    music.play();
    intro.classList.add('opened');
    scope.later(() => {
      intro.classList.add('fade-out');
      root.classList.add('invitation-visible');
      $('#music-toggle').hidden = false;
    }, 1000);
    scope.later(() => {
      session.set('v3:opened', '1');
      reveal();
    }, 1900);
  }, { once: true });
}
