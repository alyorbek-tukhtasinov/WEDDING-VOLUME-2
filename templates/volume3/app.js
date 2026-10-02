// "Volume 3" shabloni — gulli bog' (akvarel gullar foni, xira oynali kartochkalar, yashil ranglar).
// Kirish: yurak belgisi, ismlar, sana va "Ochish" tugmasi gul guldastalari orasida; keyin marosim haqida,
// aziz mehmonlar, sanoq va oy taqvimi, manzil va xarita, ishtirokni tasdiqlash, mehmonlar kitobi, yakun.
// Ma'lumotlar — config.json (panel), javob va tilaklar — /api/rsvp, /api/wishes, brend — brand.config.js.
// mountVolume3() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import './fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, mediaUrl, MONTHS } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import { LANGS, siteLangs, pickLang, rememberLang, localize, cyr } from '../../src/lib/i18n.js';
import brand from '@brand-config';
import { isNikoh, phrases } from '../../src/lib/events.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');

/* ------------------------------------ Matnlar ------------------------------------ */
const RU_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const RU_MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const RU_WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

const T = {
  uz: {
    gateInvite: 'BIZNING BAXTLI KUNIMIZNI SIZ BILAN BIRGA NISHONLASH VA QUVONCHIMIZGA SHERIK BO‘LISHINGIZ UCHUN SIZNI NIKOH TO‘YIMIZGA SAMIMIY TAKLIF ETAMIZ',
    open: 'Ochish',
    ceremonyLabel: 'Marosim haqida',
    ceremonyInvite: 'SIZNI FARZANDLARIMIZ NIKOH TO‘YI MUNOSABATI BILAN O‘TKAZILADIGAN TANTANAGA CHIN QALBDAN TAKLIF ETAMIZ',
    willHold: 'NIKOH MAROSIMI BO‘LIB O‘TADI',
    at: 'Soat',
    dearGuests: 'Aziz Mehmonimiz',
    dearText: ['Sizni nikoh to‘yimiz munosabati bilan', 'bo‘lib o‘tadigan “Visol oqshomi”ga', 'taklif etamiz'],
    withRespect: 'Hurmat bilan,',
    timeRemaining: 'To‘ygacha qolgan vaqt',
    units: ['KUN', 'SOAT', 'DAQIQA', 'SONIYA'],
    today: 'Bugun aynan o‘sha kun!',
    weekdays: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
    program: 'To‘y dasturi',
    dress: 'Kiyim uslubi',
    locationLabel: 'Manzil',
    yandex: 'Yandex xarita',
    google: 'Google Maps',
    rsvpLabel: 'R.S.V.P.',
    rsvpTitle: 'Iltimos, ishtirokingizni tasdiqlang',
    yourName: 'Ismingiz',
    namePh: 'Ism va familiya',
    yes: 'Albatta boraman',
    no: 'Kela olmayman',
    guests: 'Necha kishi bo‘lasiz?',
    person: 'kishi',
    confirm: 'Tasdiqlash',
    deadline: (d, m) => `Javob muddati: ${d}-${MONTHS[m - 1]}gacha`,
    gbLabel: 'Mehmonlar Kitobi',
    gbTitle: 'Mehmonlar Kitobi',
    gbName: 'Ismingizni kiriting',
    gbMsg: 'Xabaringizni yozing',
    gbSend: 'Xabar yuborish',
    closingLabel: 'Sizni kutamiz',
    seeYou: 'Ko‘rishguncha',
    withLove: 'Sevgi bilan',
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
    gateInvite: 'ОТ ВСЕЙ ДУШИ ПРИГЛАШАЕМ ВАС РАЗДЕЛИТЬ С НАМИ РАДОСТЬ НАШЕГО СЧАСТЛИВОГО ДНЯ И ПОЧТИТЬ СВОИМ ПРИСУТСТВИЕМ НАШЕ БРАКОСОЧЕТАНИЕ',
    open: 'Открыть',
    ceremonyLabel: 'О церемонии',
    ceremonyInvite: 'С РАДОСТЬЮ ПРИГЛАШАЕМ ВАС НА СВАДЕБНОЕ ТОРЖЕСТВО ПО СЛУЧАЮ БРАКОСОЧЕТАНИЯ НАШИХ ДЕТЕЙ',
    willHold: 'ЦЕРЕМОНИЯ БРАКОСОЧЕТАНИЯ СОСТОИТСЯ',
    at: 'в',
    dearGuests: 'Дорогие гости',
    dearText: ['По случаю нашего бракосочетания', 'приглашаем Вас на торжественный', 'свадебный вечер'],
    withRespect: 'С уважением,',
    timeRemaining: 'Время до свадьбы',
    units: ['ДНИ', 'ЧАСЫ', 'МИНУТЫ', 'СЕКУНДЫ'],
    today: 'Этот день настал!',
    weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    program: 'Программа вечера',
    dress: 'Дресс-код',
    locationLabel: 'Место проведения',
    yandex: 'Яндекс Карты',
    google: 'Google Maps',
    rsvpLabel: 'R.S.V.P.',
    rsvpTitle: 'Пожалуйста, подтвердите своё присутствие',
    yourName: 'Ваше имя',
    namePh: 'Имя и фамилия',
    yes: 'Обязательно приду',
    no: 'Не смогу прийти',
    guests: 'Сколько вас будет?',
    person: 'чел.',
    confirm: 'Подтвердить',
    deadline: (d, m) => `Ответ до ${d} ${RU_MONTHS_GEN[m - 1]}`,
    gbLabel: 'Гостевая книга',
    gbTitle: 'Гостевая книга',
    gbName: 'Введите ваше имя',
    gbMsg: 'Напишите пожелание',
    gbSend: 'Отправить',
    closingLabel: 'Мы ждём вас',
    seeYou: 'До встречи',
    withLove: 'С любовью',
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
// Marosim turi (config.eventType, src/lib/events.js): nikoh to'yida asosiy matnlar, boshqalarida — quyidagilar
const EVENTS = {
  'qiz-uzatish': {
    uz: {
      gateInvite: 'QIZIMIZNI OQ YO‘LGA KUZATAR EKANMIZ, SHU QUVONCHLI VA HAYAJONLI KUNDA SIZNI YONIMIZDA KO‘RISHNI ISTAYMIZ',
      ceremonyInvite: 'SIZNI QIZIMIZNI UZATISH TO‘YIGA CHIN QALBDAN TAKLIF ETAMIZ',
      willHold: 'QIZ UZATISH TO‘YI BO‘LIB O‘TADI',
      dearText: ['Qizimizni yangi hayotga', 'kuzatish kunida duolaringiz', 'bizga hamroh bo‘lsin'],
    },
    ru: {
      gateInvite: 'МЫ ПРОВОЖАЕМ НАШУ ДОЧЬ В НОВУЮ ЖИЗНЬ И БУДЕМ СЧАСТЛИВЫ ВИДЕТЬ ВАС РЯДОМ В ЭТОТ ТРОГАТЕЛЬНЫЙ ДЕНЬ',
      ceremonyInvite: 'С РАДОСТЬЮ ПРИГЛАШАЕМ ВАС НА ПРОВОДЫ НАШЕЙ ДОЧЕРИ',
      willHold: 'ПРОВОДЫ НЕВЕСТЫ СОСТОЯТСЯ',
      dearText: ['В день, когда наша дочь', 'начинает новую жизнь,', 'нам важны ваши благословения'],
    },
  },
  'nahorgi-osh': {
    uz: {
      gateInvite: 'TONG SAHARDA DAMLANGAN OSHIMIZGA, DUO VA DASTURXONIMIZ BARAKASIGA SIZNI SAMIMIY TAKLIF ETAMIZ',
      ceremonyInvite: 'SIZNI FARZANDLARIMIZ TO‘YI MUNOSABATI BILAN BERILADIGAN NAHORGI OSHGA TAKLIF ETAMIZ',
      willHold: 'NAHORGI OSH TORTILADI',
      dearText: ['Tong saharda dasturxonimiz', 'atrofida jam bo‘lib,', 'duo qilib ketishingizni so‘raymiz'],
    },
    ru: {
      gateInvite: 'НА РАССВЕТЕ НАШ ДОМ ЖДЁТ ВАС К ПРАЗДНИЧНОМУ ПЛОВУ И ДОБРЫМ МОЛИТВАМ',
      ceremonyInvite: 'ПРИГЛАШАЕМ ВАС НА УТРЕННИЙ ПЛОВ В ЧЕСТЬ СВАДЬБЫ НАШИХ ДЕТЕЙ',
      willHold: 'УТРЕННИЙ ПЛОВ СОСТОИТСЯ',
      dearText: ['Будем рады видеть вас', 'за утренним дастарханом', 'и услышать ваши благословения'],
    },
  },
  fotiha: {
    uz: {
      gateInvite: 'IKKI XONADONNI YAQINLASHTIRADIGAN MUBORAK KUNDA OQ FOTIHANGIZ BILAN BIZGA HAMROH BO‘LISHINGIZNI SO‘RAYMIZ',
      ceremonyInvite: 'SIZNI FARZANDLARIMIZNING FOTIHA TO‘YIGA CHIN QALBDAN TAKLIF ETAMIZ',
      willHold: 'FOTIHA TO‘YI BO‘LIB O‘TADI',
      dearText: ['Ikki yoshning baxtiga', 'poydevor bo‘ladigan kunda', 'oq fotihangizni kutamiz'],
    },
    ru: {
      gateInvite: 'В БЛАГОСЛОВЕННЫЙ ДЕНЬ, СБЛИЖАЮЩИЙ ДВЕ СЕМЬИ, ПРОСИМ ВАС РАЗДЕЛИТЬ С НАМИ РАДОСТЬ И БЛАГОСЛОВЕНИЕ',
      ceremonyInvite: 'С РАДОСТЬЮ ПРИГЛАШАЕМ ВАС НА ФОТИХА-ТОЙ НАШИХ ДЕТЕЙ',
      willHold: 'ФОТИХА-ТОЙ СОСТОИТСЯ',
      dearText: ['В день, когда две семьи', 'становятся ближе,', 'ждём ваших благословений'],
    },
  },
  'kelin-salom': {
    uz: {
      gateInvite: 'QUVONCHLI KUNIMIZDA SIZNI DAVRAMIZDA KO‘RISHNI ISTAYMIZ VA KELINIMIZNING “KELIN SALOM” MAROSIMIGA SAMIMIY TAKLIF ETAMIZ',
      ceremonyInvite: 'SIZNI KELINIMIZNING “KELIN SALOM” MAROSIMIGA CHIN QALBDAN TAKLIF ETAMIZ',
      willHold: 'KELIN SALOM MAROSIMI BO‘LIB O‘TADI',
      dearText: ['Sizni kelinimizning', '“Kelin salom” marosimiga', 'taklif etamiz'],
    },
    ru: {
      gateInvite: 'ОТ ВСЕЙ ДУШИ ПРИГЛАШАЕМ ВАС РАЗДЕЛИТЬ С НАМИ РАДОСТЬ И ПОЧТИТЬ СВОИМ ПРИСУТСТВИЕМ ЦЕРЕМОНИЮ «КЕЛИН САЛОМ» НАШЕЙ НЕВЕСТКИ',
      ceremonyInvite: 'С РАДОСТЬЮ ПРИГЛАШАЕМ ВАС НА ЦЕРЕМОНИЮ «КЕЛИН САЛОМ» НАШЕЙ НЕВЕСТКИ',
      willHold: 'ЦЕРЕМОНИЯ «КЕЛИН САЛОМ» СОСТОИТСЯ',
      dearText: ['Приглашаем Вас', 'на церемонию «Келин салом»', 'нашей невестки'],
    },
  },
};
const texts = (lang, c) => {
  // Umumiy iboralar (sanoq, dastur sarlavhasi) — src/lib/events.js; nikoh to'yida asl matnlar
  const ph = phrases(c, lang === 'ru' ? 'ru' : 'uz');
  const ev = isNikoh(c) ? {} : EVENTS[c.eventType] || {};
  const common = (base) => ({
    timeRemaining: ph('untilLong', base.timeRemaining),
    program: ph('programTitle', base.program),
    ...(isNikoh(c)
      ? {}
      : lang === 'ru'
        ? { ctaTitle: 'Закажите онлайн-приглашение', ctaSub: 'Создайте свой красивый сайт-приглашение' }
        : { ctaTitle: 'Taklifnomangizni buyurtma bering', ctaSub: 'O‘zingizning go‘zal taklifnoma saytingizni yarating' }),
  });
  if (lang === 'ru') return { ...T.ru, ...common(T.ru), ...ev.ru };
  const uz = { ...T.uz, ...common(T.uz), ...ev.uz };
  return lang === 'uzc' ? { ...cyr(uz), google: 'Google Maps', rsvpLabel: 'R.S.V.P.' } : uz;
};
const RU_DEFAULTS = { heroCaption: '', greeting: '', invitation: () => '', closing: '' };

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
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.2 1.7-2 3.2-3.2 5.3-3.2 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
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
  // Oy taqvimi (dushanbadan): bo'sh kataklar null
  const first = (new Date(Date.UTC(d.year, d.month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(d.year, d.month, 0)).getUTCDate();
  const cells = Array(first).fill(null);
  for (let n = 1; n <= days; n++) cells.push(n);
  while (cells.length % 7) cells.push(null);
  return {
    full: ru ? `${d.day} ${RU_MONTHS_GEN[d.month - 1]} ${d.year}` : `${d.day} ${d.monthName} ${d.year}`,
    weekday: (ru ? RU_WEEKDAYS : UZ_WEEKDAYS)[d.weekday],
    month: ru ? RU_MONTHS_GEN[d.month - 1] : d.monthName,
    monthYear: ru ? `${RU_MONTHS[d.month - 1]} ${d.year}` : `${d.monthName} ${d.year}`,
    cells,
  };
}

/* ------------------------------------ Bo'laklar ------------------------------------ */
const divider = (cls = '') => html`<div class="gdn-divider ${cls}" aria-hidden="true"><span></span><b>❦</b><span></span></div>`;
const names = (d, size) => html`
  <div class="gdn-names gdn-names--${size}">
    <span>${d.groom}</span><i>&amp;</i><span>${d.bride}</span>
  </div>`;
const card = (inner, cls = '') => html`<div class="gdn-card reveal ${cls}">${inner}</div>`;

/* ------------------------------------ Sahifa ------------------------------------ */
function renderPage(c, d, L, lang, langs) {
  const dt = dates(d, lang);
  const t = c.texts || {};
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const dress = c.dressCode?.text?.trim() ? c.dressCode : null;
  const v = c.venue;
  const on = (k) => (c.sections || {})[k] !== false;

  return html`
    <div class="gdn-root" id="gdn">
      <div class="gdn-canvas" aria-hidden="true"></div>
      <button class="gdn-music" id="music-toggle" type="button" aria-label="${L.musicOn}" aria-pressed="false" hidden>${raw(ICON.play)}</button>
      ${langs.length > 1 ? html`
      <div class="gdn-langs">
        ${langs.map((l) => html`<button type="button" class="${l === lang ? 'is-active' : ''}" data-lang="${l}" aria-pressed="${l === lang}">${{ uz: 'UZ', uzc: 'ЎЗ', ru: 'RU' }[l]}</button>`)}
      </div>` : ''}

      <div class="gdn-gate" id="gate">
        <div class="gdn-canvas" aria-hidden="true"></div>
        <div class="gdn-gate__box">
          <img class="gdn-deco-top" src="/images/garden/flower2-decoration.webp" alt="" aria-hidden="true" draggable="false" />
          <div class="gdn-card gdn-gate__card">
            <div class="gdn-heart">${raw(ICON.heart)}</div>
            ${names(d, 'gate')}
            ${divider('gdn-my6')}
            <p class="gdn-date">${dt.full}</p>
            <p class="gdn-label gdn-gate__invite">${L.gateInvite}</p>
            <button class="gdn-btn gdn-label" id="gate-open" type="button">${L.open} ${raw(ICON.arrow)}</button>
          </div>
          <img class="gdn-deco-bottom" src="/images/garden/flower5-bottom.webp" alt="" aria-hidden="true" draggable="false" />
        </div>
      </div>

      <main class="gdn-main">
        <section class="gdn-hero">
          <div class="gdn-card reveal gdn-hero__card">
            <p class="gdn-label gdn-accent gdn-mb6">${L.ceremonyLabel}</p>
            <p class="gdn-label gdn-mb9">${L.ceremonyInvite}</p>
            ${names(d, 'hero')}
            ${divider('gdn-my9')}
            <p class="gdn-label">${L.willHold}</p>
            <p class="gdn-venue">${v.name}</p>
            ${v.address ? html`<p class="gdn-small">${v.address}</p>` : ''}
            <div class="gdn-dayrow">
              <span class="gdn-label gdn-dayrow__side gdn-right">${dt.weekday}</span>
              <span class="gdn-vline"></span>
              <span class="gdn-dayrow__num">${pad(d.day)}</span>
              <span class="gdn-vline"></span>
              <span class="gdn-label gdn-dayrow__side gdn-left">${dt.month}</span>
            </div>
            <p class="gdn-year">${d.year}</p>
            <p class="gdn-label gdn-accent gdn-mt6">${L.at} ${c.event.time}</p>
          </div>
        </section>

        ${on('dearGuests') ? html`
        <section class="gdn-sec">
          ${card(html`
            <p class="gdn-label gdn-accent gdn-mb6">${t.greeting || L.dearGuests}</p>
            ${t.invitation
              ? html`<p class="gdn-text gdn-pre">${t.invitation}</p>`
              : html`<div class="gdn-text">${L.dearText.map((x) => html`<p>${x}</p>`)}</div>`}
            ${divider('gdn-my8')}
            <p class="gdn-label gdn-accent gdn-xs gdn-mb3">${L.withRespect}</p>
            <p class="gdn-couple">${d.groom} <i>&amp;</i> ${d.bride}</p>
            ${c.hosts ? html`<p class="gdn-small gdn-mt3">${c.hosts}</p>` : ''}
          `, 'gdn-card--xl')}
        </section>` : ''}

        ${c.effects?.countdown === false || !on('countdown') ? '' : html`
        <section class="gdn-sec" id="details">
          ${card(html`
            <p class="gdn-label gdn-accent gdn-mb6">${L.timeRemaining}</p>
            <div class="gdn-count" role="timer">
              ${L.units.map((u, i) => html`<div class="gdn-count__cell"><div class="gdn-count__num" data-unit="${i}">00</div><div class="gdn-label gdn-count__unit">${u}</div></div>`)}
            </div>
            <p class="gdn-text gdn-mt6" id="countdown-done" hidden>${L.today}</p>
            <div class="gdn-mt12">
              <p class="gdn-label gdn-mb5 gdn-xs">${dt.monthYear}</p>
              <table class="gdn-cal">
                <thead><tr>${L.weekdays.map((w) => html`<th>${w}</th>`)}</tr></thead>
                <tbody>
                  ${Array.from({ length: dt.cells.length / 7 }, (_, r) => html`<tr>${dt.cells.slice(r * 7, r * 7 + 7).map((n) => html`<td>${n ? (n === d.day ? html`<span class="on">${n}</span>` : n) : ''}</td>`)}</tr>`)}
                </tbody>
              </table>
            </div>
          `, 'gdn-card--xl')}
        </section>`}

        ${program.length ? html`
        <section class="gdn-sec">
          ${card(html`
            <h2 class="gdn-h2">${L.program}</h2>
            ${divider('gdn-mt5 gdn-mb8')}
            <ol class="gdn-program">${program.map((p) => html`<li><time>${p.time}</time><i aria-hidden="true"></i><span>${p.title}</span></li>`)}</ol>
          `, 'gdn-card--xl')}
        </section>` : ''}

        ${on('location') ? html`
        <section class="gdn-sec" id="location">
          ${card(html`
            <p class="gdn-label gdn-accent gdn-mb3">${L.locationLabel}</p>
            <h2 class="gdn-h2">${v.name}</h2>
            ${v.address ? html`<p class="gdn-small gdn-mt4 gdn-pinline">${raw(ICON.pin)} ${v.address}</p>` : ''}
            ${divider('gdn-mt6 gdn-mb8')}
            ${v.mapEmbed ? html`<div class="gdn-map"><iframe title="map" src="${v.mapEmbed}" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : ''}
            ${v.googleMaps || v.yandexMaps ? html`
            <div class="gdn-pills">
              ${v.yandexMaps ? html`<a class="gdn-pill gdn-label" href="${v.yandexMaps}" target="_blank" rel="noopener">${raw(ICON.pin)} ${L.yandex}</a>` : ''}
              ${v.googleMaps ? html`<a class="gdn-pill gdn-label" href="${v.googleMaps}" target="_blank" rel="noopener">${raw(ICON.pin)} ${L.google} ${raw(ICON.arrow)}</a>` : ''}
            </div>` : ''}
          `, 'gdn-card--2xl')}
        </section>` : ''}

        ${dress ? html`
        <section class="gdn-sec">
          ${card(html`
            <h2 class="gdn-h2">${L.dress}</h2>
            ${divider('gdn-mt5 gdn-mb6')}
            <p class="gdn-text">${dress.text}</p>
            ${dress.colors?.length ? html`<div class="gdn-swatches">${dress.colors.map((col) => html`<span style="--c:${col}"></span>`)}</div>` : ''}
          `, 'gdn-card--xl')}
        </section>` : ''}

        ${c.rsvp?.enabled ? html`
        <section class="gdn-sec" id="rsvp">
          ${card(html`
            <div class="gdn-center gdn-mb8">
              <p class="gdn-label gdn-accent gdn-mb3">${L.rsvpLabel}</p>
              <h2 class="gdn-h2">${L.rsvpTitle}</h2>
            </div>
            <form class="gdn-form" id="rsvp-form" novalidate>
              <div class="gdn-choice" role="radiogroup">
                <label><input type="radio" name="attending" value="yes" /><span>${L.yes}</span></label>
                <label><input type="radio" name="attending" value="no" /><span>${L.no}</span></label>
              </div>
              <label class="gdn-field"><span class="gdn-flabel">${L.yourName}</span><span class="gdn-input">${raw(ICON.user)}<input name="name" autocomplete="name" maxlength="80" required placeholder="${L.namePh}" /></span></label>
              <label class="gdn-field" id="guests-field" hidden><span class="gdn-flabel">${L.guests}</span>
                <span class="gdn-input"><select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} ${L.person}</option>`)}</select></span>
              </label>
              <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
              <button class="gdn-btn gdn-label gdn-btn--wide" type="submit">${L.confirm}</button>
              <p class="gdn-status" id="rsvp-status" role="status" aria-live="polite"></p>
              ${d.rsvpClosesAt ? html`<p class="gdn-small gdn-center">${L.deadline(Number(c.rsvp.deadline.slice(8)), Number(c.rsvp.deadline.slice(5, 7)))}</p>` : ''}
            </form>
            <div class="gdn-done" id="rsvp-done" hidden></div>
          `, 'gdn-card--xl gdn-left-text')}
        </section>

        ${c.rsvp.showWishes === false ? '' : html`
        <section class="gdn-sec" id="guestbook">
          <div class="gdn-wrap-2xl">
            ${card(html`
              <div class="gdn-center gdn-mb8">
                <p class="gdn-label gdn-accent gdn-mb3">${L.gbLabel}</p>
                <h2 class="gdn-h2 gdn-h2--sm">${L.gbTitle}</h2>
              </div>
              <form class="gdn-form" id="gb-form" novalidate>
                <label class="gdn-input">${raw(ICON.user)}<input name="name" maxlength="80" placeholder="${L.gbName}" aria-label="${L.gbName}" /></label>
                <label class="gdn-input gdn-input--area">${raw(ICON.msg)}<textarea name="message" rows="5" maxlength="500" placeholder="${L.gbMsg}" aria-label="${L.gbMsg}"></textarea></label>
                <button class="gdn-btn gdn-label gdn-btn--wide" type="submit">${L.gbSend} ${raw(ICON.send)}</button>
                <p class="gdn-status" id="gb-status" role="status" aria-live="polite"></p>
              </form>
            `, 'gdn-card--flat gdn-left-text')}
            <div class="gdn-wishes" id="wishes" hidden></div>
          </div>
        </section>`}` : ''}

        <section class="gdn-closing">
          ${card(html`
            <p class="gdn-label gdn-accent gdn-mb5">${t.closing ? t.closing : L.closingLabel}</p>
            <p class="gdn-script">${L.seeYou}</p>
            <div class="gdn-float">${raw(ICON.heart)}</div>
          `, 'gdn-closing__card')}
        </section>

        <footer class="gdn-footer">
          ${brand?.enabled ? html`
          <div class="gdn-card reveal gdn-cta">
            <p class="gdn-cta__title">${L.ctaTitle}</p>
            <p class="gdn-label gdn-cta__sub">${L.ctaSub}</p>
            <a class="gdn-cta__btn" href="${brand.url}" target="_blank" rel="noopener">${raw(ICON.insta)}<span>${brand.name}</span></a>
          </div>` : ''}
          <div class="gdn-card reveal gdn-sign">
            ${divider('gdn-mb5')}
            <p class="gdn-couple gdn-couple--sm">${d.groom} <i>&amp;</i> ${d.bride}</p>
            <p class="gdn-label gdn-accent gdn-xs">${L.withLove}</p>
            <p class="gdn-floral">— Floral —</p>
          </div>
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
    doneBox.innerHTML = html`<span class="gdn-done__heart">${raw(ICON.heart)}</span><p>${text}</p>${withChange ? html`<button class="gdn-link" type="button" id="rsvp-change">${L.change}</button>` : ''}`.value;
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
    const el = document.createElement('div');
    el.className = 'gdn-card gdn-wish';
    el.innerHTML = html`<p class="gdn-wish__msg">“${w.message}”</p><p class="gdn-label gdn-accent gdn-wish__name">— ${w.name}</p>`.value;
    fresh ? wishes.prepend(el) : wishes.append(el);
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
        $('#gb-form')?.reset();
        if ($('#gb-status')) setStatus($('#gb-status'), L.gbThanks);
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
  const L = texts(lang, config);
  const d = deriveConfig(c);
  document.documentElement.lang = LANGS[lang]?.html || 'uz';
  // Rang va fon: config.palette ("pink" — pushti), config.backgroundImage (media/ dagi fon rasmi).
  // Volume 4 — shu shablonning pushti ko'rinishi: asli pushti rang va gulli fon (config'da almashtirsa bo'ladi).
  const v4 = config.template === 'volume4';
  const rootEl = document.documentElement;
  if ((c.palette || (v4 ? 'pink' : 'green')) === 'pink') rootEl.dataset.palette = 'pink';
  else delete rootEl.dataset.palette;
  const bg = c.backgroundImage ? mediaUrl(c.backgroundImage) : v4 ? '/images/volume4/fon.webp' : '';
  if (bg) {
    rootEl.dataset.bg = 'custom';
    rootEl.style.setProperty('--g-bg-image', `url("${bg}")`);
  } else {
    delete rootEl.dataset.bg;
    rootEl.style.removeProperty('--g-bg-image');
  }
  try {
    await Promise.race([
      Promise.all([document.fonts.load('48px "Playfair Display"'), document.fonts.load('20px "V3 Cormorant"')]),
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

  $$('[data-lang]').forEach((b) =>
    scope.on(b, 'click', () => {
      if (b.dataset.lang === lang) return;
      rememberLang(b.dataset.lang);
      const u = new URL(location.href);
      u.searchParams.set('lang', b.dataset.lang);
      history.replaceState(null, '', u);
      mountVolume3(config, { preview });
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
  if ($('#music-toggle')) $('#music-toggle').hidden = false;
  // Til almashtirilganda kirish oynasi qayta ko'rsatilmaydi
  if (session.get('v3:opened')) {
    opened();
    window.scrollTo(0, y);
    return;
  }
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  scope.on($('#gate-open'), 'click', () => {
    window.scrollTo(0, 0);
    music.play();
    session.set('v3:opened', '1');
    gate.classList.add('is-leaving');
    scope.later(opened, 800);
  }, { once: true });
}
