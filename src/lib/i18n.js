// Taklifnoma tillari (osmon va volume2 shablonlari uchun umumiy): o'zbek (lotin), o'zbek (kirill), rus.
// config.languages — saytdagi tillar va tartibi (birinchisi — asosiy), masalan ["uzc", "ru"].
// Berilmasa — faqat o'zbek lotin (avvalgidek). Kirillcha matnlar lotinchadan avtomatik o'giriladi,
// config.i18n.uzc da qo'lda to'g'rilash mumkin. Ruscha matnlar — config.i18n.ru dan
// (yo'q bo'lsa: shablonning tayyor ruscha matni yoki kirillcha o'girma).
// Interfeys matnlari (tugmalar, sarlavhalar) — har bir shablonning o'z lug'atida.
import { latinToCyrillic } from './translit.js';
import { isNikoh, voiceOf, voiceTexts } from './events.js';

export const LANGS = {
  uz: { label: 'O‘zbekcha', short: 'UZ', html: 'uz' },
  uzc: { label: 'Ўзбекча', short: 'ЎЗ', html: 'uz-Cyrl' },
  ru: { label: 'Русский', short: 'РУ', html: 'ru' },
};

export function siteLangs(c) {
  const list = (Array.isArray(c.languages) ? c.languages : []).filter((l) => LANGS[l]);
  return list.length ? [...new Set(list)] : ['uz'];
}

const LANG_KEY = 'osmon:lang';
/** Til: ?lang= → mehmonning oldingi tanlovi → config.languages dagi birinchi til. */
export function pickLang(langs) {
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
export function rememberLang(l) {
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* localStorage yo'q */
  }
}

export const ruPlural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

/** Lotin → kirill: satr, funksiya (natijasi), massiv va obyekt ichidagi hamma satrlar. */
export const cyr = (v) => {
  if (typeof v === 'string') return latinToCyrillic(v).replace(/<бр \/>/g, '<br />');
  if (typeof v === 'function') return (...a) => cyr(v(...a));
  if (Array.isArray(v)) return v.map(cyr);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cyr(x)]));
  return v;
};

/** Sayt pastidagi buyurtma havolasi matni (brand.config.js — lotinda). */
export const brandText = (lang, text) => (lang === 'ru' ? 'Онлайн-приглашения на заказ' : lang === 'uzc' ? latinToCyrillic(text) : text);

/* ------------------------------ Mijoz ma'lumotlari ------------------------------ */
// Faqat odam o'qiydigan matnlar o'giriladi (havolalar, fayl nomlari, sanalar — yo'q)
function cyrContent(c) {
  const t = latinToCyrillic;
  const out = structuredClone(c);
  if (out.couple) {
    out.couple.groom = t(out.couple.groom);
    out.couple.bride = t(out.couple.bride);
    // Muhrdagi harflar ismlardan qayta olinadi
    if (out.couple.initials) out.couple.initials = t(out.couple.initials);
  }
  if (out.hosts) out.hosts = t(out.hosts);
  if (out.texts) out.texts = cyr(out.texts);
  if (out.venue) {
    out.venue.name = t(out.venue.name);
    out.venue.address = t(out.venue.address);
  }
  if (out.sky?.city) out.sky.city = t(out.sky.city);
  if (Array.isArray(out.program)) {
    out.program = out.program.map((p) => ({ ...p, title: t(p.title), ...(p.description ? { description: t(p.description) } : {}) }));
  }
  if (out.dressCode?.text) out.dressCode.text = t(out.dressCode.text);
  if (Array.isArray(out.contacts)) out.contacts = out.contacts.map((x) => ({ ...x, name: t(x.name) }));
  for (const k of ['islamic', 'giftNote', 'specialGuest', 'notices']) if (out[k]) out[k] = cyr(out[k]);
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
  'Dasturxon atrofida suhbat': 'Беседа за дастарханом',
  'Kuyov va uning yaqinlarining kirib kelishi': 'Приезд жениха и его близких',
  'Kelinni kuyov xonadoniga kuzatish': 'Проводы невесты в дом жениха',
  'Nahorgi osh tortilishi': 'Подача утреннего плова',
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

/**
 * Config'ning shu tildagi nusxasi.
 * ruDefaults — shablonning ruscha tayyor matnlari: { heroCaption, greeting, invitation(g, b), closing }.
 */
export function localize(c, lang, ruDefaults = {}) {
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
    for (const k of ['texts', 'hosts', 'islamic', 'giftNote', 'specialGuest']) if (out[k]) out[k] = swap(out[k]);
    return out;
  }
  if (lang !== 'ru') return c;
  // Nikoh to'yidan boshqa marosim — ruscha tayyor matnlar shu marosimniki
  if (!isNikoh(c)) {
    const e = voiceTexts(c, 'ru');
    ruDefaults = { ...ruDefaults, heroCaption: e.heroCaption, greeting: e.greeting, invitation: e.invitation, closing: e.closing };
  } else if (voiceOf(c) === 'couple') {
    // Nikoh to'yi, kelin-kuyov nomidan — ruscha taklif matni ham "мы, … и …"
    ruDefaults = { ...ruDefaults, invitation: voiceTexts(c, 'ru').invitation };
  }
  const r = c.i18n?.ru || {};
  const base = cyrContent(c);
  // Ruscha matn berilmagan bo'lsa — tayyor ruscha matn (o'zbekcha kirill emas)
  base.texts = {
    heroCaption: ruDefaults.heroCaption,
    greeting: ruDefaults.greeting,
    invitation: ruDefaults.invitation?.(base.couple.groom, base.couple.bride),
    closing: ruDefaults.closing,
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

/* ------------------------- Qo'lyozma shrift (Great Vibes) ------------------------- */
// Great Vibes'da o'zbek kirillining қ, ҳ, ғ harflari yo'q — boshqa shriftda chiqib, uslubni buzadi.
// Faqat shu shriftdagi yozuvlarda ular к, х, г bilan almashtiriladi (oddiy matnda imlo o'zgarmaydi).
const SCRIPT_MAP = { Қ: 'К', қ: 'к', Ҳ: 'Х', ҳ: 'х', Ғ: 'Г', ғ: 'г' };
const SCRIPT_RE = /[ҚқҲҳҒғ]/g;
export const scriptSafe = (s) => String(s ?? '').replace(SCRIPT_RE, (ch) => SCRIPT_MAP[ch]);

export function fixScriptGlyphs(root, family = 'Great Vibes') {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Map();
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (!/[ҚқҲҳҒғ]/.test(n.data)) continue;
    const el = n.parentElement;
    if (!seen.has(el)) seen.set(el, getComputedStyle(el).fontFamily.includes(family));
    if (seen.get(el)) n.data = scriptSafe(n.data);
  }
}
