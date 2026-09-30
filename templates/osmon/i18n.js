// "To'y kechasining osmoni" shablonining tillari: o'zbek (lotin), o'zbek (kirill), rus.
// config.languages — saytdagi tillar va tartibi (birinchisi — asosiy), masalan ["uzc", "ru"].
// Berilmasa — faqat o'zbek lotin (avvalgidek). Kirillcha matnlar lotinchadan avtomatik o'giriladi,
// config.i18n.uzc da qo'lda to'g'rilash mumkin. Ruscha matnlar — config.i18n.ru dan
// (yo'q bo'lsa: tayyor ruscha matn yoki kirillcha o'girma).
import { latinToCyrillic } from '../../src/lib/translit.js';

export const LANGS = {
  uz: { label: 'O‘zbekcha', short: 'UZ', html: 'uz' },
  uzc: { label: 'Ўзбекча', short: 'ЎЗ', html: 'uz-Cyrl' },
  ru: { label: 'Русский', short: 'РУ', html: 'ru' },
};

export function siteLangs(c) {
  const list = (Array.isArray(c.languages) ? c.languages : []).filter((l) => LANGS[l]);
  return list.length ? [...new Set(list)] : ['uz'];
}

/* ------------------------------- Interfeys matnlari ------------------------------- */
const ruPlural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const UZ = {
  months: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
  weekdays: ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'],
  dateLine: (d, m, y) => `${d}-${m}, ${y}`,
  weekdayOn: (w) => `${w} kuni`,
  at: (t) => `soat ${t}`,
  At: (t) => `Soat ${t}`,
  heroCaption: 'Nikoh to‘yiga taklifnoma',
  greeting: 'Hurmatli mehmonimiz!',
  invitation: (g, b) => `Sizni farzandlarimiz ${g} va ${b}ning nikoh to‘yi marosimiga taklif etamiz.`,
  closing: 'Tashrifingiz biz uchun katta sharaf!',
  gateLead: 'Sizni bir kechaga<br />taklif qilamiz',
  gateBtn: 'Osmonni ochish',
  gateHint: 'ovoz bilan tomosha qiling',
  musicOn: 'Musiqani yoqish',
  musicOff: 'Musiqani o‘chirish',
  explore: 'Osmonni tomosha qilish',
  langSwitch: 'Tilni almashtirish',
  scroll: 'Pastga suring',
  invitationLabel: 'Taklifnoma',
  respectfully: 'Hurmat bilan,',
  skyEyebrow: 'Shu kechaning osmoni',
  skyLead: (where) => `Bu osmon — bezak emas. Yulduzlar, Oy va sayyoralar to‘y kechasi ${where} qanday joylashsa, aynan shunday chizilgan.`,
  skyWhereCity: (city) => `${city} osmonida`,
  skyWhereVenue: (venue) => `${venue} ustida`,
  skyShifted: (t) => `To‘y yorug‘ paytda boshlanadi — shuning uchun osmon o‘sha oqshom yulduzlar to‘liq chiqqan paytdagidek (soat ${t}) ko‘rsatilgan.`,
  skyExplore: 'Osmonni aylantirib ko‘rish',
  moon: 'Oy',
  planets: 'Sayyoralar',
  stars: 'Yulduzlar',
  computing: 'osmon hisoblanmoqda…',
  moonLit: (p) => `${p}% yoritilgan`,
  moonWhere: (dir, alt) => `${dir} tomonda, ufqdan ${alt}° balandda`,
  moonDown: 'Oy bu kecha ufq ostida',
  moonDownNote: 'shuning uchun yulduzlar yanada yorqin',
  planetWhere: (name, dir) => `${name} — ${dir}da`,
  planetsDown: 'Bu kecha sayyoralar ufq ostida',
  planetsDownNote: 'osmonda faqat yulduzlar',
  starsCount: (n) => `Oddiy ko‘z bilan ${n} ta yulduz`,
  starsNote: 'shahar chiroqlari bo‘lmasa, albatta',
  phases: ['Yangi oy', 'O‘suvchi hilol', 'Birinchi chorak', 'To‘lib borayotgan Oy', 'To‘lin oy', 'Kamayib borayotgan Oy', 'Oxirgi chorak', 'Kamayuvchi hilol'],
  dirs: ['shimol', 'shimoli-sharq', 'sharq', 'janubi-sharq', 'janub', 'janubi-g‘arb', 'g‘arb', 'shimoli-g‘arb'],
  planetNames: { venus: 'Venera', jupiter: 'Yupiter', mars: 'Mars', saturn: 'Saturn', mercury: 'Merkuriy' },
  countdownEyebrow: 'To‘yga qadar',
  countdownTitle: 'Har bir yulduz — kutilgan bir lahza',
  units: { kun: 'kun', soat: 'soat', daqiqa: 'daqiqa', soniya: 'soniya' },
  countdownDone: 'To‘y kechasi keldi — biz bilan bo‘lganingiz uchun rahmat!',
  gcal: 'Google taqvim',
  ics: 'Telefon taqvimi',
  calTitle: (names) => `${names} — to‘y`,
  programEyebrow: 'Kecha dasturi',
  programTitle: 'Yulduzlar yo‘li',
  detailsEyebrow: 'To‘y kechasi',
  date: 'Sana',
  time: 'Vaqt',
  place: 'Manzil',
  gmap: 'Google xarita',
  ymap: 'Yandex xarita',
  dress: 'Dress-kod',
  wishesEyebrow: 'Tilaklar osmoni',
  wishesTitle: 'Tilagingizni osmonga yo‘llang',
  wishesLead: 'Javobingizni qoldiring. Yozgan tilagingiz fonar bo‘lib ko‘tariladi va shu osmonda yangi yulduz bo‘lib yonadi.',
  yourName: 'Ismingiz',
  namePh: 'Ism va familiya',
  canCome: 'Kela olasizmi?',
  yes: 'Albatta boraman',
  no: 'Afsuski, bora olmayman',
  howMany: 'Necha kishi bo‘lasiz?',
  persons: (n) => `${n} kishi`,
  wish: 'Tilagingiz',
  optional: '(ixtiyoriy)',
  wishPh: 'Yosh oilaga eng ezgu tilaklaringiz…',
  website: 'Veb-sayt',
  send: 'Yuborish',
  sendAnswer: 'Javobni yuborish',
  sendLantern: 'Fonarni osmonga uchirish',
  deadline: (d, m) => `Javob muddati: ${d}-${m}gacha`,
  wishCount: (n) => `${n} ta tilak — osmonda yulduz bo‘lib yonmoqda`,
  thanksYes: (n) => `Rahmat, ${n}! Sizni to‘y kechasida intizorlik bilan kutamiz.`,
  thanksNo: (n) => `Rahmat, ${n}! Xabar berganingiz uchun minnatdormiz — duolaringiz biz bilan.`,
  change: 'Javobni o‘zgartirish',
  closed: 'Javoblar qabul qilish muddati tugagan. Tilaklaringiz uchun rahmat!',
  previewNoSend: 'Ko‘rinish rejimi — javob yuborilmaydi.',
  errName: 'Iltimos, ismingizni kiriting.',
  errAttending: 'Iltimos, kela olishingizni belgilang.',
  sending: 'Yuborilmoqda…',
  errConfig: 'Hozircha javobni qabul qilib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.',
  errGeneric: 'Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.',
  errNetwork: 'Internet aloqasini tekshirib, qayta urinib ko‘ring.',
  exploreHint: 'Barmoq bilan suring — osmon aylanadi. Ikki barmoq — yaqinlashtirish.',
  constellations: 'Yulduz turkumlari',
  close: 'Yopish',
  skip: 'O‘tkazib yuborish',
  credit: 'Osmon to‘y kechasi uchun astronomik hisoblangan · Yulduzlar katalogi: Yale BSC',
  sampleWishes: [
    { name: 'Mehmon', message: 'Baxtingiz shu osmondagi yulduzlardek abadiy bo‘lsin!' },
    { name: 'Do‘stingiz', message: 'Oilangiz mustahkam, xonadoningiz nurga to‘la bo‘lsin.' },
    { name: 'Qarindoshingiz', message: 'Qo‘sha qaringlar!' },
  ],
};

// Kirill: lotinchadan o'giriladi, faqat avtomatik o'girib bo'lmaydigan joylar qo'lda
const cyr = (v) => {
  if (typeof v === 'string') return latinToCyrillic(v).replace(/<бр \/>/g, '<br />');
  if (typeof v === 'function') return (...a) => cyr(v(...a));
  if (Array.isArray(v)) return v.map(cyr);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cyr(x)]));
  return v;
};
const UZC = {
  ...cyr(UZ),
  months: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  units: UZ.units, // kalitlar; ko'rinadigan nomlari quyida
  unitNames: { kun: 'кун', soat: 'соат', daqiqa: 'дақиқа', soniya: 'сония' },
  gcal: 'Google тақвим',
  gmap: 'Google харита',
  ymap: 'Yandex харита',
  credit: 'Осмон тўй кечаси учун астрономик ҳисобланган · Юлдузлар каталоги: Yale BSC',
};

const RU = {
  months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  weekdays: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  dateLine: (d, m, y) => `${d} ${m} ${y}`,
  weekdayOn: (w) => w,
  at: (t) => `в ${t}`,
  At: (t) => `В ${t}`,
  heroCaption: 'Приглашение на свадьбу',
  greeting: 'Дорогой гость!',
  invitation: (g, b) => `Приглашаем вас на свадьбу наших детей — ${g} и ${b}.`,
  closing: 'Ваше присутствие — большая честь для нас!',
  gateLead: 'Приглашаем вас<br />в одну особенную ночь',
  gateBtn: 'Открыть небо',
  gateHint: 'смотрите со звуком',
  musicOn: 'Включить музыку',
  musicOff: 'Выключить музыку',
  explore: 'Смотреть на небо',
  langSwitch: 'Сменить язык',
  scroll: 'Листайте вниз',
  invitationLabel: 'Приглашение',
  respectfully: 'С уважением,',
  skyEyebrow: 'Небо этой ночи',
  skyLead: (where) => `Это небо — не украшение. Звёзды, Луна и планеты нарисованы именно так, как они будут расположены ${where} в ночь свадьбы.`,
  skyWhereCity: (city) => `над городом ${city}`,
  skyWhereVenue: (venue) => `над «${venue.replace(/^[«“"']+|[»”"']+$/g, '')}»`,
  skyShifted: (t) => `Свадьба начинается засветло — поэтому небо показано таким, каким оно будет в тот вечер, когда взойдут все звёзды (в ${t}).`,
  skyExplore: 'Покрутить небо',
  moon: 'Луна',
  planets: 'Планеты',
  stars: 'Звёзды',
  computing: 'небо рассчитывается…',
  moonLit: (p) => `освещена на ${p}%`,
  moonWhere: (dir, alt) => `на ${dir}е, ${alt}° над горизонтом`,
  moonDown: 'Этой ночью Луна за горизонтом',
  moonDownNote: 'поэтому звёзды ещё ярче',
  planetWhere: (name, dir) => `${name} — на ${dir}е`,
  planetsDown: 'Этой ночью планеты за горизонтом',
  planetsDownNote: 'на небе только звёзды',
  starsCount: (n) => `Невооружённым глазом видно звёзд: ${n}`,
  starsNote: 'если, конечно, не мешают огни города',
  phases: ['Новолуние', 'Растущий серп', 'Первая четверть', 'Растущая Луна', 'Полнолуние', 'Убывающая Луна', 'Последняя четверть', 'Убывающий серп'],
  dirs: ['север', 'северо-восток', 'восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад'],
  planetNames: { venus: 'Венера', jupiter: 'Юпитер', mars: 'Марс', saturn: 'Сатурн', mercury: 'Меркурий' },
  countdownEyebrow: 'До свадьбы',
  countdownTitle: 'Каждая звезда — долгожданное мгновение',
  units: UZ.units,
  unitNames: { kun: 'дней', soat: 'часов', daqiqa: 'минут', soniya: 'секунд' },
  countdownDone: 'Свадебная ночь настала — спасибо, что вы с нами!',
  gcal: 'Google Календарь',
  ics: 'Календарь телефона',
  calTitle: (names) => `${names} — свадьба`,
  programEyebrow: 'Программа вечера',
  programTitle: 'Звёздный путь',
  detailsEyebrow: 'Свадебная ночь',
  date: 'Дата',
  time: 'Время',
  place: 'Место',
  gmap: 'Google Карты',
  ymap: 'Яндекс Карты',
  dress: 'Дресс-код',
  wishesEyebrow: 'Небо пожеланий',
  wishesTitle: 'Отправьте пожелание в небо',
  wishesLead: 'Оставьте ответ. Ваше пожелание поднимется фонариком и загорится в этом небе новой звездой.',
  yourName: 'Ваше имя',
  namePh: 'Имя и фамилия',
  canCome: 'Сможете прийти?',
  yes: 'Обязательно приду',
  no: 'К сожалению, не смогу',
  howMany: 'Сколько вас будет?',
  persons: (n) => `${n} ${ruPlural(n, 'человек', 'человека', 'человек')}`,
  wish: 'Ваше пожелание',
  optional: '(необязательно)',
  wishPh: 'Самые тёплые пожелания молодой семье…',
  website: 'Сайт',
  send: 'Отправить',
  sendAnswer: 'Отправить ответ',
  sendLantern: 'Запустить фонарик в небо',
  deadline: (d, m) => `Ответить до ${d} ${m}`,
  wishCount: (n) => `${n} ${ruPlural(n, 'пожелание', 'пожелания', 'пожеланий')} — ${n % 10 === 1 && n % 100 !== 11 ? 'горит звездой' : 'горят звёздами'} в небе`,
  thanksYes: (n) => `Спасибо, ${n}! С нетерпением ждём вас на свадьбе.`,
  thanksNo: (n) => `Спасибо, ${n}, что сообщили! Ваши добрые пожелания — с нами.`,
  change: 'Изменить ответ',
  closed: 'Приём ответов завершён. Спасибо за ваши пожелания!',
  previewNoSend: 'Режим просмотра — ответ не отправляется.',
  errName: 'Пожалуйста, введите имя.',
  errAttending: 'Пожалуйста, отметьте, сможете ли прийти.',
  sending: 'Отправляем…',
  errConfig: 'Сейчас не получается принять ответ. Попробуйте чуть позже.',
  errGeneric: 'Произошла ошибка. Пожалуйста, попробуйте ещё раз.',
  errNetwork: 'Проверьте подключение к интернету и попробуйте ещё раз.',
  exploreHint: 'Ведите пальцем — небо вращается. Двумя пальцами — приближение.',
  constellations: 'Созвездия',
  close: 'Закрыть',
  skip: 'Пропустить',
  credit: 'Небо рассчитано астрономически для ночи свадьбы · Каталог звёзд: Yale BSC',
  sampleWishes: [
    { name: 'Гость', message: 'Пусть ваше счастье будет вечным, как звёзды в этом небе!' },
    { name: 'Ваш друг', message: 'Крепкой семьи и светлого дома!' },
    { name: 'Родные', message: 'Совет да любовь!' },
  ],
};
UZ.unitNames = UZ.units;

export const STR = { uz: UZ, uzc: UZC, ru: RU };

/** Sayt pastidagi buyurtma havolasi matni (brand.config.js — lotinda). */
export const brandText = (t, text) => (t === RU ? 'Онлайн-приглашения на заказ' : t === UZC ? latinToCyrillic(text) : text);

/** Oy fazasi nomi (astro.js dagi moonPhaseName bilan bir xil chegaralar). */
export function phaseName(t, illumination, waxing) {
  const p = t.phases;
  if (illumination < 0.03) return p[0];
  if (illumination > 0.97) return p[4];
  if (Math.abs(illumination - 0.5) < 0.07) return waxing ? p[2] : p[6];
  if (illumination < 0.5) return waxing ? p[1] : p[7];
  return waxing ? p[3] : p[5];
}
export const dirName = (t, az) => t.dirs[Math.round((((az % 360) + 360) % 360) / 45) % 8];

/* ------------------------------ Mijoz ma'lumotlari ------------------------------ */
// Faqat odam o'qiydigan matnlar o'giriladi (havolalar, fayl nomlari, sanalar — yo'q)
function cyrContent(c) {
  const t = latinToCyrillic;
  const out = structuredClone(c);
  if (out.couple) {
    out.couple.groom = t(out.couple.groom);
    out.couple.bride = t(out.couple.bride);
  }
  if (out.hosts) out.hosts = t(out.hosts);
  if (out.texts) out.texts = cyr(out.texts);
  if (out.venue) {
    out.venue.name = t(out.venue.name);
    out.venue.address = t(out.venue.address);
  }
  if (out.sky?.city) out.sky.city = t(out.sky.city);
  if (Array.isArray(out.program)) out.program = out.program.map((p) => ({ ...p, title: t(p.title) }));
  if (out.dressCode?.text) out.dressCode.text = t(out.dressCode.text);
  if (Array.isArray(out.contacts)) out.contacts = out.contacts.map((x) => ({ ...x, name: t(x.name) }));
  if (out.islamic) out.islamic = cyr(out.islamic);
  return out;
}

// Ruscha tarjima berilmagan to'y dasturi bandlari uchun (paneldagi tayyor shablonlar)
const RU_PROGRAM = {
  'Mehmonlarni kutib olish': 'Встреча гостей',
  'Kelin-kuyovning kirib kelishi': 'Выход жениха и невесты',
  'Tantanali ziyofat': 'Праздничный банкет',
  'Kechki ziyofat': 'Вечерний банкет',
  'To‘y tortini kesish': 'Свадебный торт',
  'Dasturxon atrofida ziyofat': 'Праздничное застолье',
  'Kelin salom marosimi': 'Обряд «Келин салом»',
  'Qur’on tilovati va duo': 'Чтение Корана и дуа',
  'Fotiha marosimi': 'Обряд фатиха',
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, over) {
  if (!isObj(over)) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v == null || v === '') continue;
    out[k] = isObj(v) && isObj(base?.[k]) ? merge(base[k], v) : v;
  }
  return out;
}

/** Config'ning shu tildagi nusxasi. */
export function localize(c, lang) {
  if (lang === 'uzc') {
    const auto = cyrContent(c);
    const out = merge(auto, c.i18n?.uzc);
    // Ism qo'lda to'g'rilangan bo'lsa (masalan Муҳаммад → Мухаммад) — matnlar ichida ham
    const fix = ['groom', 'bride']
      .map((k) => [auto.couple?.[k], out.couple?.[k]])
      .filter(([a, b]) => a && b && a !== b);
    if (!fix.length) return out;
    const swap = (v) => {
      if (typeof v === 'string') return fix.reduce((x, [a, b]) => x.split(a).join(b), v);
      if (Array.isArray(v)) return v.map(swap);
      if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
      return v;
    };
    for (const k of ['texts', 'hosts', 'islamic']) if (out[k]) out[k] = swap(out[k]);
    return out;
  }
  if (lang !== 'ru') return c;
  const r = c.i18n?.ru || {};
  const base = cyrContent(c);
  // Ruscha matn berilmagan bo'lsa — tayyor ruscha matn (o'zbekcha kirill emas)
  base.texts = {
    heroCaption: RU.heroCaption,
    greeting: RU.greeting,
    invitation: RU.invitation(base.couple.groom, base.couple.bride),
    closing: RU.closing,
  };
  base.program = (c.program || []).map((p, i) => ({
    ...p,
    title: r.program?.[i] || RU_PROGRAM[p.title?.replace(/'/g, '‘')] || latinToCyrillic(p.title),
  }));
  if (c.dressCode?.text) base.dressCode = { ...base.dressCode, text: 'Вечерний праздничный наряд.' };
  delete base.islamic;
  const { program, ...rest } = r;
  return merge(base, rest);
}
