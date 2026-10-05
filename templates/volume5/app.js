// "Volume 5" shabloni — click2invite "Our Story" maketi asosida (zaytun-bej ranglar, qo'lyozma sarlavhalar).
// Kirish: yashil konvert va tilla muhr — bosilganda konvert ochilish videosi, so'ng raqsga tushayotgan juftlik
// videosi ustida ismlar va sana. Keyin: musiqa doirasi, taklif matni, 3 kunlik taqvim, to'lqinli to'y dasturi,
// manzil, dress-kod, eslatma (sovg'a), anketa va tilaklar, bog'lanish, sanoq, yakun.
// Ma'lumotlar — config.json (panel/bot), javob va tilaklar — /api/rsvp, /api/wishes, brend — brand.config.js.
// mountVolume5() ham saytda (main.js), ham boshqaruv panelining jonli ko'rinishida ishlatiladi.
import './fonts/fonts.css';
import './styles.css';
import { deriveConfig, musicUrlOf, mediaUrl } from '../../src/lib/config.js';
import { html, raw } from '../../src/lib/dom.js';
import { LANGS, siteLangs, pickLang, rememberLang, localize, cyr, scriptSafe } from '../../src/lib/i18n.js';
import brand from '@brand-config';
import { isNikoh, phrases } from '../../src/lib/events.js';
import { initAutoScroll } from '../../src/lib/autoscroll.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const IMG = '/images/volume5';
// Instagram video yozilayotganda (scripts/render-video.js) sahifa vaqti to'xtatib-yuritiladi — <video> o'ynasa,
// vaqt oldinga siljimay qotib qoladi. Shu rejimda videolar o'rniga ularning kadrlari (frames/*.webp) ketma-ket
// almashtiriladi: konvert ochilishi — 33 kadr (15 kadr/s), juftlik — 85 kadr (12 kadr/s, takrorlanadi).
const STILL = () => !!globalThis.__TAKLIFNOMA_VIDEO__;
const SEQ = {
  env: { n: 33, fps: 15 },
  hero: { n: 85, fps: 12 },
};
const frameUrl = (name, i) => `${IMG}/frames/${name}-${pad(i + 1)}.webp`;
// Barcha kadrlar oldindan yuklanadi (yozish boshlangunicha)
function preloadFrames() {
  const all = Object.entries(SEQ).flatMap(([name, { n }]) => Array.from({ length: n }, (_, i) => frameUrl(name, i)));
  return Promise.all(all.map((u) => new Promise((r) => {
    const im = new Image();
    im.onload = im.onerror = () => (im.decode ? im.decode().catch(() => {}).finally(r) : r());
    im.src = u;
  })));
}
// Kadrlarni <img> da o'ynatish; loop bo'lmasa, oxirida onEnd
function playFrames(img, name, { loop = false, onEnd } = {}) {
  const { n, fps } = SEQ[name];
  const t0 = performance.now();
  let shown = -1;
  const step = () => {
    if (!img.isConnected) return;
    let i = Math.floor(((performance.now() - t0) / 1000) * fps);
    if (!loop && i >= n) {
      onEnd?.();
      return;
    }
    i %= n;
    if (i !== shown) {
      shown = i;
      img.src = frameUrl(name, i);
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ------------------------------------ Matnlar ------------------------------------ */
const UZ_MONTHS_GEN = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const RU_MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const RU_WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

const T = {
  uz: {
    tapToOpen: 'Taklifnomani ochish uchun bosing',
    musicRing: 'MUSIQANI YOQISH UCHUN BOSING • ',
    musicOn: 'Musiqani yoqish',
    musicOff: 'Musiqani o‘chirish',
    dearGuests: 'Aziz mehmonlar!',
    program: 'To‘y dasturi',
    location: 'Manzil',
    route: 'Yo‘l xaritasi',
    route2: 'Yandex xaritada ochish',
    dress: 'Dress-kod',
    details: 'Eslatma',
    rsvp: 'Anketa',
    deadline: (d, m) => `Iltimos, ${d}-${UZ_MONTHS_GEN[m - 1]}gacha ishtirokingizni tasdiqlang.`,
    rsvpNoDeadline: 'Iltimos, ishtirokingizni tasdiqlang.',
    yourName: 'Ismingiz va familiyangiz',
    namePh: 'Ism Familiya',
    canCome: 'To‘yga kela olasizmi?',
    yes: 'Ha, albatta kelaman',
    no: 'Afsuski, kela olmayman',
    guests: 'Necha kishi bo‘lasiz?',
    person: 'kishi',
    wish: 'Tilaklaringiz',
    wishPh: 'Kelin-kuyovga tilaklaringiz…',
    send: 'Yuborish',
    wishesTitle: 'Tilaklar',
    contacts: 'Bog‘lanish',
    contactsText: 'Savollaringiz bo‘lsa yoki bizga syurpriz tayyorlamoqchi bo‘lsangiz, bemalol qo‘ng‘iroq qiling.',
    call: 'Qo‘ng‘iroq qilish',
    until: 'Ko‘rishguncha:',
    units: ['kun', 'soat', 'daqiqa', 'soniya'],
    today: 'Bugun aynan o‘sha kun!',
    withLove: 'Sevgi bilan',
    sending: 'Yuborilmoqda…',
    needName: 'Iltimos, ismingizni kiriting.',
    needAnswer: 'Iltimos, kela olishingizni belgilang.',
    thanksYes: (n) => `Rahmat, ${n}! Sizni to‘yda intiqlik bilan kutamiz.`,
    thanksNo: (n) => `Rahmat, ${n}! Xabar berganingiz uchun minnatdormiz.`,
    change: 'Javobni o‘zgartirish',
    closed: 'Javoblar qabul qilish muddati tugagan. Rahmat!',
    error: 'Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.',
    offline: 'Internet aloqasini tekshirib, qayta urinib ko‘ring.',
    preview: 'Ko‘rinish rejimi — javob yuborilmaydi.',
    ctaTitle: 'To‘y taklifnomangizni buyurtma bering',
  },
  ru: {
    tapToOpen: 'Нажмите, чтобы открыть приглашение',
    musicRing: 'НАЖМИТЕ, ЧТОБЫ ВКЛЮЧИТЬ МУЗЫКУ • ',
    musicOn: 'Включить музыку',
    musicOff: 'Выключить музыку',
    dearGuests: 'Дорогие гости!',
    program: 'Программа дня',
    location: 'Место проведения',
    route: 'Построить маршрут',
    route2: 'Открыть в Яндекс Картах',
    dress: 'Дресс-код',
    details: 'Детали',
    rsvp: 'Анкета',
    deadline: (d, m) => `Подтвердите своё присутствие до ${d} ${RU_MONTHS_GEN[m - 1]}.`,
    rsvpNoDeadline: 'Пожалуйста, подтвердите своё присутствие.',
    yourName: 'Ваше имя и фамилия',
    namePh: 'Иван Иванов',
    canCome: 'Получится ли у вас присутствовать?',
    yes: 'Да, обязательно приду',
    no: 'К сожалению, не смогу',
    guests: 'Сколько вас будет?',
    person: 'чел.',
    wish: 'Ваши пожелания',
    wishPh: 'Пожелания молодым…',
    send: 'Отправить',
    wishesTitle: 'Пожелания',
    contacts: 'Контакты',
    contactsText: 'Если вы хотите сделать для нас сюрприз или уточнить детали торжества, свяжитесь с нами.',
    call: 'Позвонить',
    until: 'До встречи через:',
    units: ['дней', 'часов', 'минут', 'секунд'],
    today: 'Этот день настал!',
    withLove: 'С любовью',
    sending: 'Отправка…',
    needName: 'Пожалуйста, введите имя.',
    needAnswer: 'Пожалуйста, отметьте, сможете ли прийти.',
    thanksYes: (n) => `Спасибо, ${n}! Ждём вас на торжестве.`,
    thanksNo: (n) => `Спасибо, ${n}, что сообщили!`,
    change: 'Изменить ответ',
    closed: 'Приём ответов завершён. Спасибо!',
    error: 'Произошла ошибка. Попробуйте ещё раз.',
    offline: 'Проверьте интернет и попробуйте ещё раз.',
    preview: 'Режим просмотра — ответ не отправляется.',
    ctaTitle: 'Закажите свадебное приглашение',
  },
};

const texts = (lang, c) => {
  // Sanoq va dastur sarlavhasi — marosim turiga qarab (src/lib/events.js); nikoh to'yida asl matn
  const ph = phrases(c, lang === 'ru' ? 'ru' : 'uz');
  const base = lang === 'ru' ? T.ru : T.uz;
  const out = {
    ...base,
    program: ph('programTitle', base.program),
    ...(isNikoh(c) ? {} : { ctaTitle: lang === 'ru' ? 'Закажите онлайн-приглашение' : 'Taklifnomangizni buyurtma bering' }),
  };
  return lang === 'uzc' ? cyr(out) : out;
};
// Rus tilida matn berilmagan bo'lsa — maketdagi asl matnlar
const RU_DEFAULTS = {
  heroCaption: '',
  greeting: 'Дорогие гости!',
  invitation: () => 'Мы очень хотим сделать этот день особенным, поэтому приглашаем Вас разделить с нами торжество, посвящённое дню нашей свадьбы!',
  closing: 'Ваше присутствие — большая честь для нас!',
};
// Eslatmaning standart matni (starter.js) — rus tilida tarjimasi bilan
const GIFT_DEFAULT_UZ = 'Iliq so‘z va tilaklaringizni qalbingizda olib keling — biz uchun eng qimmatli sovg‘a sizning tashrifingiz.';
const GIFT_DEFAULT_RU = 'Свои тёплые слова и пожелания приносите в сердцах — самый ценный подарок для нас ваше присутствие.';

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
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5v11l9-5.5z" fill="currentColor"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7.5" y="7.5" width="9" height="9" rx="1.2" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.2 1.7-2 3.2-3.2 5.3-3.2 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>',
  insta: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
};

/* ------------------------------------ Sana ------------------------------------ */
// Taqvim: to'y kuni va uning oldingi/keyingi kunlari (oy chegarasidan o'tsa ham to'g'ri)
function threeDays(d, lang) {
  const wd = lang === 'ru' ? RU_WEEKDAYS : UZ_WEEKDAYS;
  const mg = lang === 'ru' ? RU_MONTHS_GEN : UZ_MONTHS_GEN;
  return [-1, 0, 1].map((k) => {
    const x = new Date(Date.UTC(d.year, d.month - 1, d.day + k));
    return { day: x.getUTCDate(), weekday: wd[x.getUTCDay()], month: mg[x.getUTCMonth()], on: k === 0 };
  });
}

/* ------------------------------------ To'lqinli dastur ------------------------------------ */
// Tadbirlar egri chiziqning navbatdagi burilishlarida, matn chiziqning qarama-qarshi tomonida.
// Bitta yurakcha sahifa surilgani sari chiziq bo'ylab pastga tushadi (initWave).
const STEP = 170;
function programWave(items) {
  const n = items.length;
  const h = n * STEP + 60;
  const xs = items.map((_, i) => (i % 2 ? 72 : 28));
  const ys = items.map((_, i) => 90 + i * STEP);
  // Silliq egri chiziq: tepadan birinchi nuqtaga, so'ng nuqtalar orasida S-burilishlar
  let d = `M50 0 C50 ${ys[0] * 0.5} ${xs[0]} ${ys[0] * 0.5} ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < n; i++) {
    const my = (ys[i - 1] + ys[i]) / 2;
    d += ` C${xs[i - 1]} ${my} ${xs[i]} ${my} ${xs[i]} ${ys[i]}`;
  }
  d += ` C${xs[n - 1]} ${ys[n - 1] + 40} 50 ${h - 30} 50 ${h}`;
  return html`
    <div class="v5-wave" style="height:${h}px">
      <svg class="v5-wave__line" viewBox="0 0 100 ${h}" preserveAspectRatio="none" aria-hidden="true"><path id="wave-path" d="${d}" vector-effect="non-scaling-stroke"/></svg>
      <img class="v5-wave__heart" id="wave-heart" src="${IMG}/heart.svg" alt="" aria-hidden="true" style="left:50%;top:0" />
      ${items.map(
        (p, i) => html`
          <div class="v5-wave__item ${xs[i] < 50 ? 'is-left' : 'is-right'} reveal" style="top:${ys[i]}px;--x:${xs[i]}%">
            <div class="v5-wave__text">
              <p class="v5-script v5-wave__title">${p.title}</p>
              <p class="v5-wave__time">${p.time}</p>
            </div>
          </div>`,
      )}
    </div>`;
}

/* ------------------------------------ Sahifa ------------------------------------ */
const torn = (cls) => html`<img class="v5-torn ${cls}" src="${IMG}/torn.webp" alt="" aria-hidden="true" draggable="false" />`;
// Panel/botda yuklangan surat; bo'lmasa maketdagi surat (chetlari yirtilgan holda)
const photo = (file, fallback, cls) =>
  file
    ? html`<div class="v5-photo v5-photo--custom ${cls}" style="--img:url('${mediaUrl(file)}')">${torn('v5-torn--top')}${torn('v5-torn--bottom')}</div>`
    : html`<div class="v5-photo ${cls}" style="--img:url('${IMG}/${fallback}')"></div>`;

function renderPage(c, d, L, lang, langs, config0) {
  const t = c.texts || {};
  const program = (c.program || []).filter((p) => p?.time && p?.title);
  const dress = c.dressCode?.text?.trim() ? c.dressCode : null;
  const v = c.venue || {};
  const on = (k) => (c.sections || {})[k] !== false;
  // Qo'lyozma shriftda o'zbek kirillining Қ Ғ Ҳ harflari yo'q — К Г Х bilan (ruscha matnda ham uchrashi mumkin)
  const S = (s) => (lang === 'uz' ? s : scriptSafe(s));
  const route = v.googleMaps || v.yandexMaps;
  const gift = c.giftNote?.text?.trim() || c.giftNote?.title?.trim() ? { ...c.giftNote } : null;
  if (gift && lang === 'ru' && config0.giftNote?.text === GIFT_DEFAULT_UZ && !config0.i18n?.ru?.giftNote?.text) gift.text = GIFT_DEFAULT_RU;
  const contacts = (c.contacts || []).filter((x) => x?.phone);
  const photos = c.photos || {};
  const deadline = c.rsvp?.deadline && d.rsvpClosesAt ? L.deadline(Number(c.rsvp.deadline.slice(8)), Number(c.rsvp.deadline.slice(5, 7))) : L.rsvpNoDeadline;

  return html`
    <div class="v5-root" id="v5">
      ${langs.length > 1 ? html`
      <div class="v5-langs">
        ${langs.map((l) => html`<button type="button" class="${l === lang ? 'is-active' : ''}" data-lang="${l}" aria-pressed="${l === lang}">${{ uz: 'UZ', uzc: 'ЎЗ', ru: 'RU' }[l]}</button>`)}
      </div>` : ''}

      <div class="v5-gate" id="gate">
        ${STILL() ? html`<img class="v5-gate__video" id="gate-still" src="${frameUrl('env', 0)}" alt="" />` : html`
        <video class="v5-gate__video" id="gate-video" muted playsinline webkit-playsinline preload="auto" poster="${IMG}/gate.webp">
          <source src="${IMG}/envelope.mp4" type="video/mp4" />
          <source src="${IMG}/envelope.webm" type="video/webm" />
        </video>`}
        <button class="v5-gate__btn" id="gate-open" type="button" aria-label="${L.tapToOpen}">
          <span class="v5-gate__hint">${L.tapToOpen}</span>
        </button>
      </div>

      <main class="v5-main">
        <section class="v5-hero">
          ${STILL()
            ? html`<img class="v5-hero__video" id="hero-still" src="${frameUrl('hero', 0)}" alt="" />`
            : html`
          <video class="v5-hero__video" id="hero-video" muted loop playsinline webkit-playsinline autoplay preload="auto" poster="${IMG}/hero-poster.webp">
            <source src="${IMG}/hero.mp4" type="video/mp4" />
            <source src="${IMG}/hero.webm" type="video/webm" />
          </video>`}
          <div class="v5-hero__shade" aria-hidden="true"></div>
          <div class="v5-hero__text">
            <h1 class="v5-script v5-hero__names v5-names">${d.groom ? html`<span>${S(d.groom)}</span> <i>&amp;</i> ` : ''}<span>${S(d.bride)}</span></h1>
            <p class="v5-script v5-hero__date">${pad(d.day)}/${pad(d.month)}</p>
          </div>
          ${torn('v5-torn--bottom')}
        </section>

        <div class="v5-music" id="music-wrap" hidden>
          <svg class="v5-music__ring" viewBox="0 0 120 120" aria-hidden="true">
            <defs><path id="v5-ring" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
            <text><textPath href="#v5-ring" textLength="286" lengthAdjust="spacing">${L.musicRing}</textPath></text>
          </svg>
          <button class="v5-music__btn" id="music-toggle" type="button" aria-label="${L.musicOn}" aria-pressed="false">${raw(ICON.play)}</button>
        </div>

        ${on('dearGuests') ? html`
        <section class="v5-sec v5-invite reveal">
          <h2 class="v5-script v5-h2">${S(t.greeting || L.dearGuests)}</h2>
          ${t.invitation ? html`<p class="v5-text v5-pre">${t.invitation}</p>` : ''}
          ${c.hosts ? html`<p class="v5-hosts">${c.hosts}</p>` : ''}
        </section>` : ''}

        <section class="v5-sec v5-cal reveal" aria-label="${d.dateText}">
          <div class="v5-cal__row">
            ${threeDays(d, lang).map(
              (x) => html`
                <div class="v5-cal__cell ${x.on ? 'is-on' : ''}">
                  <span class="v5-cal__wd">${x.weekday}</span>
                  <span class="v5-cal__mon">${x.month}</span>
                  <span class="v5-cal__num">${x.day}</span>
                  ${x.on ? html`<img class="v5-cal__oval" src="${IMG}/oval.svg" alt="" aria-hidden="true" />` : ''}
                </div>`,
            )}
          </div>
          <p class="v5-cal__time">${c.event.time}</p>
        </section>

        ${program.length ? html`
        <section class="v5-sec v5-program">
          <h2 class="v5-script v5-h2 reveal">${S(L.program)}</h2>
          ${programWave(program.map((p) => ({ ...p, title: S(p.title) })))}
        </section>` : ''}

        ${on('location') && (v.name || v.address) ? html`
        <section class="v5-sec v5-venue" id="location">
          <div class="reveal">
            <h2 class="v5-script v5-h2">${S(L.location)}</h2>
            ${v.name ? html`<p class="v5-venue__name">${v.name}</p>` : ''}
            ${v.address ? html`<p class="v5-text">${v.address}</p>` : ''}
            ${route ? html`<a class="v5-round" href="${route}" target="_blank" rel="noopener">${L.route}</a>` : ''}
            ${v.googleMaps && v.yandexMaps ? html`<a class="v5-link" href="${v.yandexMaps}" target="_blank" rel="noopener">${L.route2}</a>` : ''}
          </div>
          ${photo(photos.venue || v.image, 'venue.webp', 'v5-photo--venue reveal')}
        </section>` : ''}

        ${dress ? html`
        <section class="v5-sec v5-dress reveal">
          <h2 class="v5-script v5-h2">${S(L.dress)}</h2>
          <p class="v5-text">${dress.text}</p>
          ${dress.colors?.length ? html`<div class="v5-swatches">${dress.colors.map((col) => html`<span style="--c:${col}"></span>`)}</div>` : ''}
        </section>` : ''}

        ${gift && on('details') ? html`
        <section class="v5-details">
          ${photo(photos.details, 'details.webp', 'v5-photo--details')}
          <div class="v5-details__text reveal">
            <h2 class="v5-script v5-h2 v5-h2--light">${S(gift.title || L.details)}</h2>
            ${gift.text ? html`<p class="v5-details__note">${gift.text}</p>` : ''}
          </div>
        </section>` : ''}

        ${c.rsvp?.enabled ? html`
        <section class="v5-sec v5-rsvp" id="rsvp">
          <div class="reveal">
            <h2 class="v5-script v5-h2">${S(L.rsvp)}</h2>
            <p class="v5-text v5-rsvp__deadline">${deadline}</p>
          </div>
          <form class="v5-form reveal" id="rsvp-form" novalidate>
            <label class="v5-field"><span>${L.yourName}</span><input name="name" autocomplete="name" maxlength="80" required placeholder="${L.namePh}" /></label>
            <fieldset class="v5-choice">
              <legend>${L.canCome}</legend>
              <label><input type="radio" name="attending" value="yes" /><span>${L.yes}</span></label>
              <label><input type="radio" name="attending" value="no" /><span>${L.no}</span></label>
            </fieldset>
            <label class="v5-field" id="guests-field" hidden><span>${L.guests}</span>
              <select name="guests">${Array.from({ length: d.maxGuests }, (_, i) => html`<option value="${i + 1}">${i + 1} ${L.person}</option>`)}</select>
            </label>
            ${c.rsvp.showWishes === false ? '' : html`<label class="v5-field"><span>${L.wish}</span><textarea name="message" rows="3" maxlength="500" placeholder="${L.wishPh}"></textarea></label>`}
            <label class="hp" aria-hidden="true">Veb-sayt<input name="website" tabindex="-1" autocomplete="off" /></label>
            <button class="v5-btn" type="submit">${L.send}</button>
            <p class="v5-status" id="rsvp-status" role="status" aria-live="polite"></p>
          </form>
          <div class="v5-done" id="rsvp-done" hidden></div>
        </section>
        ${c.rsvp.showWishes === false ? '' : html`
        <section class="v5-sec v5-wishes" id="wishes-sec" hidden>
          <h2 class="v5-script v5-h2 reveal">${S(L.wishesTitle)}</h2>
          <div class="v5-wishes__list" id="wishes"></div>
        </section>`}` : ''}

        ${contacts.length ? html`
        <section class="v5-sec v5-contacts reveal">
          <h2 class="v5-script v5-h2">${S(L.contacts)}</h2>
          <p class="v5-text">${L.contactsText}</p>
          <div class="v5-contacts__row">
            ${contacts.map((x) => html`
              <div class="v5-contact">
                <a class="v5-round" href="tel:${x.phone.replace(/[^\d+]/g, '')}">${L.call}</a>
                ${x.name ? html`<span class="v5-contact__name">${x.name}</span>` : ''}
              </div>`)}
          </div>
        </section>` : ''}

        ${c.effects?.countdown === false || !on('countdown') ? '' : html`
        <section class="v5-count" id="details">
          ${photo(photos.countdown, 'countdown.webp', 'v5-photo--count')}
          <div class="v5-count__box">
            <p class="v5-script v5-count__title">${S(L.until)}</p>
            <div class="v5-count__row" role="timer">
              ${L.units.map((u, i) => html`<div class="v5-count__cell"><span class="v5-count__num" data-unit="${i}">00</span><span class="v5-count__unit">${u}</span></div>`)}
            </div>
            <p class="v5-count__done" id="countdown-done" hidden>${L.today}</p>
          </div>
        </section>`}

        <footer class="v5-footer">
          ${t.closing ? html`<p class="v5-text v5-closing reveal">${t.closing}</p>` : ''}
          <p class="v5-script v5-footer__names v5-names reveal">${d.groom ? html`${S(d.groom)} <i>&amp;</i> ` : ''}${S(d.bride)}</p>
          <p class="v5-footer__love">${L.withLove}</p>
          ${brand?.enabled ? html`
          <a class="v5-cta" href="${brand.url}" target="_blank" rel="noopener">${raw(ICON.insta)}<span><b>${L.ctaTitle}</b><small>${brand.name}</small></span></a>` : ''}
        </footer>
      </main>
      <audio id="music" loop preload="none"></audio>
    </div>
  `.value;
}

/* ------------------------------------ Yurakcha chiziq bo'ylab ------------------------------------ */
// Yurak ekranning o'rtasi balandligida turadi: egri chiziqda shu balandlikdagi nuqtani topamiz
// (chiziq tepadan pastga faqat pastlaydi — y bo'yicha ikkiga bo'lib qidirish yetarli).
function initWave() {
  const path = $('#wave-path');
  const heart = $('#wave-heart');
  if (!path || !heart) return;
  const wave = heart.parentElement;
  const total = path.getTotalLength();
  const h = path.viewportElement.viewBox.baseVal.height;
  const pointAtY = (y) => {
    let lo = 0;
    let hi = total;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).y < y) lo = mid;
      else hi = mid;
    }
    return path.getPointAtLength(lo);
  };
  let raf = 0;
  let last = -1;
  const place = () => {
    raf = 0;
    const top = wave.getBoundingClientRect().top;
    const y = Math.min(h, Math.max(0, window.innerHeight * 0.55 - top));
    if (Math.abs(y - last) < 0.5) return;
    last = y;
    const p = pointAtY(y);
    heart.style.left = `${p.x}%`;
    heart.style.top = `${p.y}px`;
  };
  const queue = () => {
    if (!raf) raf = requestAnimationFrame(place);
  };
  scope.on(window, 'scroll', queue, { passive: true });
  scope.on(window, 'resize', queue);
  place();
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
  const wrap = $('#music-wrap');
  const btn = $('#music-toggle');
  if (!src) {
    wrap.remove();
    return { play() {} };
  }
  wrap.hidden = false;
  audio.src = src;
  audio.volume = 0.55;
  const sync = () => {
    const playing = !audio.paused;
    wrap.classList.toggle('is-playing', playing);
    btn.innerHTML = playing ? ICON.stop : ICON.play;
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

/* ------------------------------------ Anketa va tilaklar ------------------------------------ */
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
  const guestId = saved?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
  const setStatus = (text, isError = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  };
  const closed = (d.rsvpClosesAt && Date.now() > d.rsvpClosesAt.getTime()) || Date.now() >= d.start.getTime();
  const thanks = (a, name) => (a === 'yes' ? L.thanksYes(name) : L.thanksNo(name));

  function sync() {
    guestsField.hidden = form.elements.namedItem('attending').value !== 'yes';
  }
  const showDone = (text, withChange = true) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.innerHTML = html`<span class="v5-done__heart">${raw(ICON.heart)}</span><p>${text}</p>${withChange ? html`<button class="v5-link" type="button" id="rsvp-change">${L.change}</button>` : ''}`.value;
    $('#rsvp-change')?.addEventListener('click', () => {
      doneBox.hidden = true;
      form.hidden = false;
      if (saved) {
        form.elements.namedItem('name').value = saved.name || '';
        for (const r of form.querySelectorAll('[name="attending"]')) r.checked = r.value === saved.attending;
        form.elements.namedItem('guests').value = saved.guests || '1';
        if (form.elements.namedItem('message')) form.elements.namedItem('message').value = saved.message || '';
        sync();
      }
    });
  };
  if (closed) showDone(L.closed, false);
  else if (saved?.name && saved?.attending) showDone(thanks(saved.attending, saved.name));
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
    const el = document.createElement('div');
    el.className = 'v5-wish';
    el.innerHTML = html`<p class="v5-wish__msg">${w.message}</p><p class="v5-wish__name">— ${w.name}</p>`.value;
    fresh ? list.prepend(el) : list.append(el);
  }
  async function loadWishes() {
    if (!list) return;
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
      showDone(thanks(data.attending, data.name));
      if (data.message) addWish({ name: data.name, message: data.message }, true);
    } catch {
      setStatus(L.offline, true);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------------ Ishga tushirish ------------------------------------ */
export async function mountVolume5(config, { preview = false } = {}) {
  newScope();
  const langs = siteLangs(config);
  const lang = preview ? langs[0] : pickLang(langs);
  const c = localize(config, lang, RU_DEFAULTS);
  const L = texts(lang, config);
  const d = deriveConfig(c);
  document.documentElement.lang = LANGS[lang]?.html || 'uz';
  document.documentElement.classList.toggle('v5-still', STILL());
  try {
    await Promise.race([
      Promise.all([document.fonts.load('48px "V5 Script"'), document.fonts.load('500 18px "V5 Cormorant"')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch {
    /* shriftsiz ham davom etamiz */
  }
  if (STILL()) await Promise.race([preloadFrames(), new Promise((r) => setTimeout(r, 8000))]);
  const y = window.scrollY;
  $('#app').innerHTML = renderPage(c, d, L, lang, langs, config);
  initCountdown(d);
  initReveal();
  initWave();
  initRsvp(c, d, L, preview);

  $$('[data-lang]').forEach((b) =>
    scope.on(b, 'click', () => {
      if (b.dataset.lang === lang) return;
      rememberLang(b.dataset.lang);
      const u = new URL(location.href);
      u.searchParams.set('lang', b.dataset.lang);
      history.replaceState(null, '', u);
      mountVolume5(config, { preview });
    }),
  );

  const gate = $('#gate');
  const hero = $('#hero-video');
  let heroOn = false;
  const startHero = () => {
    if (STILL()) {
      if (!heroOn && $('#hero-still')) playFrames($('#hero-still'), 'hero', { loop: true });
      heroOn = true;
      return;
    }
    hero?.play().catch(() => {});
  };
  const opened = () => {
    gate.remove();
    document.documentElement.classList.remove('is-locked');
    startHero();
  };
  if (preview) {
    opened();
    $('#music-wrap')?.remove();
    window.scrollTo(0, y);
    return;
  }
  // Konvert ochilguncha juftlik videosi kutib turadi (birinchi kadrdan boshlanishi uchun)
  hero?.pause();
  const music = initMusic(musicUrlOf(c), L);
  const ascroll = initAutoScroll(config, {
    slow: '.v5-invite, .v5-cal',
    theme: { bg: '#777b56', ink: '#f5ecdd' },
  });
  // Til almashtirilganda kirish oynasi qayta ko'rsatilmaydi
  if (session.get('v5:opened')) {
    opened();
    window.scrollTo(0, y);
    ascroll.ready(false);
    return;
  }
  document.documentElement.classList.add('is-locked');
  requestAnimationFrame(() => gate.classList.add('is-ready'));
  scope.on($('#gate-open'), 'click', () => {
    window.scrollTo(0, 0);
    // Video yozishda musiqa keyin alohida qo'shiladi (render-video.js) — sahifada o'ynatilmaydi
    if (!STILL()) music.play();
    session.set('v5:opened', '1');
    gate.classList.add('is-opening');
    const video = $('#gate-video');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      gate.classList.add('is-leaving');
      startHero();
      scope.later(() => {
        opened();
        ascroll.ready();
      }, 700);
    };
    // Konvert ochilish videosi (~2 soniya); o'ynamasa yoki osilib qolsa — baribir ochiladi
    if (STILL()) return playFrames($('#gate-still'), 'env', { onEnd: finish });
    if (!video) return finish();
    scope.on(video, 'ended', finish, { once: true });
    scope.later(finish, 2600);
    video.play().catch(finish);
  }, { once: true });
}
