import { findTrack } from './music.js';
import { TEMPLATES } from './templates.js';

// Konfiguratsiyani tekshirish va undan hosila qiymatlarni hisoblash.
// Bu fayl ham brauzerda, ham build vaqtida (Node) ishlatiladi — DOM ishlatmang.

export const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];
export const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export const WEEKDAYS_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TZ_RE = /^[+-](0\d|1[0-4]):[0-5]\d$/;
const MEDIA_RE = /^[\w.\-]+$/;

export function isValidDate(str) {
  const m = DATE_RE.exec(str || '');
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function isUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Xatolar ro'yxatini qaytaradi (bo'sh bo'lsa hammasi joyida). */
export function validateConfig(c, mediaFiles = null) {
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };
  const checkMedia = (name, field) => {
    if (!name) return;
    if (!MEDIA_RE.test(name)) {
      errors.push(`${field}: "${name}" — faqat fayl nomi yozing (lotin harflari, raqam, - _ .), papka yo'lisiz`);
    } else if (mediaFiles && !mediaFiles.includes(name)) {
      errors.push(`${field}: "${name}" fayli media/ papkasida topilmadi`);
    }
  };

  need(c && typeof c === 'object', 'config obyekt emas');
  if (!c || typeof c !== 'object') return errors;

  need(!c.template || TEMPLATES.some((t) => t.id === c.template), `template noma'lum: "${c.template}" (${TEMPLATES.map((t) => t.id).join(', ')})`);
  need(c.couple?.groom?.trim(), 'couple.groom (kuyov ismi) kiritilmagan');
  need(c.couple?.bride?.trim(), 'couple.bride (kelin ismi) kiritilmagan');
  need(isValidDate(c.event?.date), `event.date noto'g'ri: "${c.event?.date}" (format: YYYY-MM-DD)`);
  need(TIME_RE.test(c.event?.time || ''), `event.time noto'g'ri: "${c.event?.time}" (format: HH:MM)`);
  need(!c.event?.timezone || TZ_RE.test(c.event.timezone), `event.timezone noto'g'ri: "${c.event?.timezone}" (masalan: +05:00)`);
  need(c.venue?.name?.trim(), 'venue.name (to\'yxona nomi) kiritilmagan');
  need(c.venue?.address?.trim(), 'venue.address (manzil) kiritilmagan');
  for (const key of ['googleMaps', 'yandexMaps']) {
    const v = c.venue?.[key];
    need(!v || isUrl(v), `venue.${key} to'g'ri havola emas: "${v}"`);
  }
  checkMedia(c.venue?.image, 'venue.image');
  checkMedia(c.music, 'music');
  need(!c.musicTrack || c.musicTrack === 'none' || findTrack(c.musicTrack), `musicTrack: to'plamda "${c.musicTrack}" qo'shig'i yo'q`);
  checkMedia(c.backgroundImage, 'backgroundImage');
  if (c.backgroundOverlay != null) {
    const o = Number(c.backgroundOverlay);
    need(Number.isFinite(o) && o >= 0 && o <= 1, 'backgroundOverlay 0 dan 1 gacha son bo\'lishi kerak (masalan 0.84)');
  }
  need(!c.music || /\.(mp3|m4a|aac|ogg)$/i.test(c.music), 'music: faqat .mp3, .m4a, .aac yoki .ogg fayl bo\'lishi mumkin');
  checkMedia(c.seo?.ogImage, 'seo.ogImage');
  (c.gallery || []).forEach((g, i) => checkMedia(g, `gallery[${i}]`));
  need(!c.galleryStyle || ['grid', 'garland'].includes(c.galleryStyle), `galleryStyle faqat 'grid' yoki 'garland' bo'lishi mumkin: "${c.galleryStyle}"`);

  (c.program || []).forEach((p, i) => {
    need(TIME_RE.test(p?.time || ''), `program[${i}].time noto'g'ri: "${p?.time}"`);
    need(p?.title?.trim(), `program[${i}].title kiritilmagan`);
  });

  if (c.rsvp?.enabled) {
    need(!c.rsvp.deadline || isValidDate(c.rsvp.deadline), `rsvp.deadline noto'g'ri: "${c.rsvp.deadline}"`);
    if (c.rsvp.deadline && isValidDate(c.rsvp.deadline) && isValidDate(c.event?.date)) {
      need(c.rsvp.deadline <= c.event.date, 'rsvp.deadline to\'y sanasidan keyin bo\'lishi mumkin emas');
    }
    const mg = c.rsvp.maxGuests ?? 5;
    need(Number.isInteger(mg) && mg >= 1 && mg <= 20, 'rsvp.maxGuests 1 dan 20 gacha butun son bo\'lishi kerak');
  }

  if (c.giftNote) {
    need(typeof c.giftNote === 'object', 'giftNote obyekt bo\'lishi kerak: { eyebrow, title, text }');
    for (const k of ['eyebrow', 'title', 'text']) {
      const v = c.giftNote?.[k];
      need(v == null || typeof v === 'string', `giftNote.${k} matn bo'lishi kerak`);
    }
  }

  // "Yusuf & Zulayho" (yz) shabloni maydonlari
  if (c.template === 'yz') {
    const PHOTO_KEYS = ['hero', 'invitation', 'details', 'countdown', 'map', 'gift'];
    for (const [k, v] of Object.entries(c.photos || {})) {
      need(PHOTO_KEYS.includes(k), `photos.${k} — noma'lum bo'lim (${PHOTO_KEYS.join(', ')})`);
      checkMedia(v, `photos.${k}`);
    }
    if (c.giftCard?.number) {
      need(/^\d{16}$/.test(String(c.giftCard.number).replace(/[\s-]/g, '')), `giftCard.number 16 xonali karta raqami bo'lishi kerak: "${c.giftCard.number}"`);
    }
    for (const k of ['holder', 'holderRu', 'bank', 'expiry']) {
      need(c.giftCard?.[k] == null || typeof c.giftCard[k] === 'string', `giftCard.${k} matn bo'lishi kerak`);
    }
    for (const lang of ['uz', 'ru']) {
      for (const [k, v] of Object.entries(c.texts?.[lang] || {})) need(typeof v === 'string', `texts.${lang}.${k} matn bo'lishi kerak`);
    }
    for (const k of ['groom', 'bride', 'venueName', 'address']) {
      need(c.ru?.[k] == null || typeof c.ru[k] === 'string', `ru.${k} matn bo'lishi kerak`);
    }
  }
  // "To'y kechasining osmoni" (osmon): osmon qaysi joydan ko'rsatiladi (yozilmasa — to'yxona xaritasidan)
  if (c.sky != null) {
    need(typeof c.sky === 'object', 'sky obyekt bo\'lishi kerak: { city, lat, lng }');
    const hasLat = c.sky?.lat != null && c.sky.lat !== '';
    const hasLng = c.sky?.lng != null && c.sky.lng !== '';
    need(hasLat === hasLng, 'sky.lat va sky.lng birga yozilishi kerak');
    if (hasLat) need(Number.isFinite(Number(c.sky.lat)) && Math.abs(Number(c.sky.lat)) <= 90, `sky.lat noto'g'ri: "${c.sky.lat}"`);
    if (hasLng) need(Number.isFinite(Number(c.sky.lng)) && Math.abs(Number(c.sky.lng)) <= 180, `sky.lng noto'g'ri: "${c.sky.lng}"`);
    need(c.sky?.city == null || typeof c.sky.city === 'string', 'sky.city matn bo\'lishi kerak');
  }
  // Sahifaga joylanadigan xarita — faqat Google yoki Yandex manzili (boshqa saytni iframe'ga qo'yib bo'lmaydi)
  if (c.venue?.mapEmbed) {
    let ok = false;
    try {
      const u = new URL(c.venue.mapEmbed);
      ok = u.protocol === 'https:' && (/(^|\.)google\.com$/.test(u.hostname) && u.pathname.startsWith('/maps/embed') || /(^|\.)yandex\.(uz|ru|com)$/.test(u.hostname) && u.pathname.startsWith('/map-widget/'));
    } catch {
      ok = false;
    }
    need(ok, `venue.mapEmbed faqat Google (maps/embed) yoki Yandex (map-widget) manzili bo'lishi mumkin`);
  }

  (c.contacts || []).forEach((ct, i) => {
    need(ct?.name?.trim(), `contacts[${i}].name kiritilmagan`);
    need(/^\+?\d[\d\s()-]{6,}$/.test(ct?.phone || ''), `contacts[${i}].phone noto'g'ri: "${ct?.phone}"`);
  });

  (c.dressCode?.colors || []).forEach((col, i) => {
    need(/^#[0-9a-f]{3,8}$/i.test(col), `dressCode.colors[${i}] rang kodi noto'g'ri: "${col}"`);
  });
  for (const [k, v] of Object.entries(c.theme || {})) {
    need(['navy', 'gold', 'cream', 'wine'].includes(k), `theme.${k} — noma'lum kalit (navy, gold, cream, wine)`);
    need(/^#[0-9a-f]{3,8}$/i.test(v), `theme.${k} rang kodi noto'g'ri: "${v}" (masalan: #0b2545)`);
  }

  return errors;
}

function initialsOf(name) {
  return (name || '').trim().charAt(0).toUpperCase();
}

const dayNum = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};
const fromDayNum = (n) => new Date(n * 86400000).toISOString().slice(0, 10);

/**
 * Admin sahifasidan o'zgartirilgan sozlamalarni config ustiga qo'yadi:
 *   date/time — to'y sanasi va vaqti (javob muddati ham shuncha kunga suriladi)
 *   music     — to'plamdagi qo'shiq id si yoki 'none' (musiqasiz)
 */
export function applyOverrides(c, s) {
  if (!s || typeof s !== 'object') return c;
  let out = c;

  if (s.music === 'none') {
    out = { ...out, music: '', musicUrl: '' };
  } else if (s.music) {
    const track = findTrack(s.music);
    if (track) out = { ...out, musicUrl: track.file };
  }

  const date = isValidDate(s.date) ? s.date : c.event.date;
  const time = TIME_RE.test(s.time || '') ? s.time : c.event.time;
  if (date !== c.event.date || time !== c.event.time) {
    let rsvp = c.rsvp;
    if (rsvp?.deadline && isValidDate(rsvp.deadline) && date !== c.event.date) {
      rsvp = { ...rsvp, deadline: fromDayNum(dayNum(rsvp.deadline) + dayNum(date) - dayNum(c.event.date)) };
    }
    // originalDate — mehmonning brauzerdagi javobi sana o'zgarganda yo'qolmasligi uchun
    out = { ...out, event: { ...c.event, date, time, originalDate: c.event.date }, rsvp };
  }
  return out;
}

// Boshqaruv panelidagi jonli ko'rinish yuklangan (hali saqlanmagan) rasmlarni shu ilgak orqali ko'rsatadi
export const mediaUrl = (name) => {
  if (!name) return '';
  const hook = globalThis.__TAKLIFNOMA_MEDIA__;
  return typeof hook === 'function' ? hook(name) : `/media/${name}`;
};

/**
 * Fon musiqasi manzili. Ustunlik tartibi: admin sahifasidagi tanlov (musicUrl, '' — musiqasiz)
 * → config'dagi to'plam qo'shig'i (musicTrack) → mijozning o'z fayli (music).
 */
export function musicUrlOf(c) {
  if (c.musicUrl !== undefined) return c.musicUrl;
  if (c.musicTrack === 'none') return '';
  const track = c.musicTrack ? findTrack(c.musicTrack) : null;
  return track ? track.file : mediaUrl(c.music);
}

/** Konfiguratsiyadan sahifa uchun kerakli barcha qiymatlarni hisoblaydi. */
export function deriveConfig(c) {
  const [y, m, d] = c.event.date.split('-').map(Number);
  const tz = c.event.timezone || '+05:00';
  const start = new Date(`${c.event.date}T${c.event.time}:00${tz}`);
  const durationH = Number(c.event.durationHours) > 0 ? Number(c.event.durationHours) : 5;
  const end = new Date(start.getTime() + durationH * 3600e3);
  // Hafta kuni UTC bo'yicha hisoblanadi — foydalanuvchi vaqt zonasi ta'sir qilmaydi.
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  const groom = c.couple.groom.trim();
  const bride = c.couple.bride.trim();
  const names = `${groom} & ${bride}`;
  const dateText = `${y}-yil ${d}-${MONTHS[m - 1]}`;
  const title = c.seo?.title?.trim() || `${names} — Taklifnoma`;
  const description =
    c.seo?.description?.trim() ||
    `${groom} va ${bride}ning to‘y taklifnomasi. ${dateText}, soat ${c.event.time} da ${c.venue.name.trim()}da sizni kutamiz.`;

  const rsvpOpen = !!c.rsvp?.enabled;
  let rsvpClosesAt = null;
  if (rsvpOpen && c.rsvp.deadline) {
    // Muddat kuni oxirigacha (mahalliy vaqt bo'yicha) ochiq
    rsvpClosesAt = new Date(`${c.rsvp.deadline}T23:59:59${tz}`);
  }

  return {
    groom,
    bride,
    names,
    initials: c.couple.initials?.trim() || `${initialsOf(groom)}&${initialsOf(bride)}`,
    start,
    end,
    year: y,
    month: m,
    day: d,
    weekday,
    weekdayName: WEEKDAYS[weekday],
    monthName: MONTHS[m - 1],
    dateText,
    title,
    description,
    rsvpOpen,
    rsvpClosesAt,
    maxGuests: c.rsvp?.maxGuests ?? 5,
  };
}
