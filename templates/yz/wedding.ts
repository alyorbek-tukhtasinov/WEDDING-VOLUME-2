// "Yusuf & Zulayho" shabloni uchun barcha ma'lumotlar mijoz config'idan olinadi
// (clients/<nom>/config.json yoki config.js, template: 'yz').
// Asl shablonda qattiq yozilgan qiymatlar (ismlar, sana, xarita, karta, rasmlar, musiqa) shu yerdan keladi.
import config from '@wedding-config';
import { applyOverrides, mediaUrl, musicUrlOf, isValidDate } from '../../src/lib/config.js';
import { parseMapInput, yandexEmbed, googleLink, yandexLink } from '../../src/lib/maps.js';
import { latinToCyrillic } from '../../src/lib/translit.js';

const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

// Rasm yuklanmagan bo'limlar uchun shablonning o'z suratlari
const DEFAULT_PHOTOS = {
  hero: '/images/yz/wedding1.jpg',
  invitation: '/images/yz/wedding2.jpg',
  details: '/images/yz/wedding3.jpg',
  countdown: '/images/yz/wedding4.jpg',
  map: '/images/yz/wedding5.jpg',
  gift: '/images/yz/wedding6.jpg',
};
export type PhotoKey = keyof typeof DEFAULT_PHOTOS;
export const DEFAULT_MUSIC_TRACK = 'musiqa-4';

export interface Wedding {
  groom: string;
  bride: string;
  groomRu: string;
  initials: string;
  brideRu: string;
  start: Date;
  end: Date;
  dateUz: string;
  dateRu: string;
  time: string;
  venueName: string;
  venueNameRu: string;
  address: string;
  addressRu: string;
  googleMaps: string;
  yandexMaps: string;
  mapEmbed: string;
  photos: Record<PhotoKey, string>;
  musicUrl: string;
  giftCard: { number: string; raw: string; holder: string; holderRu: string; bank: string; expiry: string } | null;
  rsvp: { enabled: boolean; closesAt: Date | null; maxGuests: number };
  storageKey: string;
  texts: { uz: Record<string, string>; ru: Record<string, string> };
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function formatCard(raw: string) {
  return raw.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function build(c: any): Wedding {
  const [y, m, d] = c.event.date.split('-').map(Number);
  const tz = c.event.timezone || '+05:00';
  const start = new Date(`${c.event.date}T${c.event.time}:00${tz}`);
  const hours = Number(c.event.durationHours) > 0 ? Number(c.event.durationHours) : 5;
  const ru = c.ru || {};

  // Xarita: config'dagi embed → Google/Yandex havolasidagi koordinata → Yandex vidjet.
  // Havolalardan biri berilmagan bo'lsa, koordinatadan ikkinchisi ham yasaladi (ikkala tugma chiqsin).
  const venue = c.venue || {};
  let mapEmbed = str(venue.mapEmbed);
  let googleMaps = str(venue.googleMaps);
  let yandexMaps = str(venue.yandexMaps);
  for (const link of [googleMaps, yandexMaps]) {
    const parsed = parseMapInput(link);
    if (parsed.lat != null) {
      mapEmbed ||= yandexEmbed(parsed.lat, parsed.lng);
      googleMaps ||= googleLink(parsed.lat, parsed.lng);
      yandexMaps ||= yandexLink(parsed.lat, parsed.lng);
      break;
    }
    if (parsed.embedUrl) mapEmbed ||= parsed.embedUrl;
  }

  const photos = { ...DEFAULT_PHOTOS };
  for (const key of Object.keys(DEFAULT_PHOTOS) as PhotoKey[]) {
    const file = str(c.photos?.[key]);
    if (file) photos[key] = mediaUrl(file);
  }

  const cardRaw = String(c.giftCard?.number || '').replace(/\D/g, '');
  const holder = str(c.giftCard?.holder) || c.couple.groom.trim();
  const giftCard = cardRaw
    ? { number: formatCard(cardRaw), raw: cardRaw, holder, holderRu: str(c.giftCard?.holderRu) || latinToCyrillic(holder), bank: str(c.giftCard?.bank), expiry: str(c.giftCard?.expiry) }
    : null;

  // Shablon uchun standart musiqa — config'da hech narsa tanlanmagan bo'lsa
  const withMusic = c.musicUrl === undefined && !c.musicTrack && !c.music ? { ...c, musicTrack: DEFAULT_MUSIC_TRACK } : c;

  const rsvpEnabled = c.rsvp?.enabled !== false;
  const deadline = c.rsvp?.deadline;

  return {
    groom: c.couple.groom.trim(),
    bride: c.couple.bride.trim(),
    groomRu: str(ru.groom) || latinToCyrillic(c.couple.groom.trim()),
    initials: str(c.couple.initials) || `${c.couple.groom.trim().charAt(0).toUpperCase()}&${c.couple.bride.trim().charAt(0).toUpperCase()}`,
    brideRu: str(ru.bride) || latinToCyrillic(c.couple.bride.trim()),
    start,
    end: new Date(start.getTime() + hours * 3600e3),
    dateUz: `${d} ${MONTHS_UZ[m - 1]} ${y}`,
    dateRu: `${d} ${MONTHS_RU[m - 1]} ${y}`,
    time: c.event.time,
    venueName: venue.name.trim(),
    venueNameRu: str(ru.venueName) || venue.name.trim(),
    address: venue.address.trim(),
    addressRu: str(ru.address) || latinToCyrillic(venue.address.trim()),
    googleMaps,
    yandexMaps,
    mapEmbed,
    photos,
    musicUrl: musicUrlOf(withMusic),
    giftCard,
    rsvp: {
      enabled: rsvpEnabled,
      closesAt: rsvpEnabled && isValidDate(deadline) ? new Date(`${deadline}T23:59:59${tz}`) : null,
      maxGuests: c.rsvp?.maxGuests ?? 5,
    },
    storageKey: `rsvp:${c.couple.groom.trim()} & ${c.couple.bride.trim()}:${c.event.originalDate || c.event.date}`,
    texts: { uz: { ...(c.texts?.uz || {}) }, ru: { ...(c.texts?.ru || {}) } },
  };
}

let current: Wedding | null = null;

/** Admin sahifasidagi sana/vaqt/musiqa o'zgarishlarini qo'llab, ma'lumotni tayyorlaydi. */
export function initWedding(settings: unknown) {
  current = build(applyOverrides(config, settings));
  return current;
}

/** Boshqaruv panelidagi jonli ko'rinish: istalgan config bilan qayta hisoblash. */
export function setConfig(cfg: unknown) {
  current = build(cfg);
  return current;
}

export function wedding(): Wedding {
  if (!current) current = build(config);
  return current;
}

/** Taqvimga qo'shish (.ics) — asl shablondagi qattiq sana o'rniga config'dagisi. */
export function downloadICS() {
  const w = wedding();
  const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const esc = (s: string) => s.replace(/[\\;,]/g, (ch) => `\\${ch}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${esc(w.groom)} & ${esc(w.bride)}//Taklifnoma//UZ`,
    'BEGIN:VEVENT',
    `UID:${w.start.getTime()}-${encodeURIComponent(w.groom + w.bride)}@taklifnoma`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(w.start)}`,
    `DTEND:${fmt(w.end)}`,
    `SUMMARY:${esc(`${w.groom} & ${w.bride} — To‘y marosimi`)}`,
    `LOCATION:${esc(`${w.venueName}, ${w.address}`)}`,
    `DESCRIPTION:${esc(`${w.groom} va ${w.bride}ning to‘y marosimiga taklif etamiz.`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${w.groom}-${w.bride}-Toy.ics`.replace(/[^\p{L}\p{N}.-]+/gu, '-');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
