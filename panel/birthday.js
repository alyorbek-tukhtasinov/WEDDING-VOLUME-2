// Boshqaruv paneli: tug'ilgan kun saytlari (tort, sevgi, plastinka) uchun yordamchilar —
// shablon maydonlari, boshlang'ich config, jonli ko'rinish uchun to'ldirish va saqlashdan oldin tozalash.
import { findTemplate } from '../src/lib/templates.js';
import { isValidDate, ageOf } from '../src/lib/config.js';
import { tortTexts, ROMANTIC_WISHES } from '../templates/tort/texts.js';
import { sevgiTexts } from '../templates/sevgi/texts.js';
import { plastinkaTexts, PARTY_PROGRAM } from '../templates/plastinka/texts.js';

export { ROMANTIC_WISHES };
export const isBday = (c) => findTemplate(c?.template)?.kind === 'birthday';
/** Bazmga taklifnoma (manzil, dastur, javob) — romantik tabrik emas */
export const isParty = (c) => isBday(c) && !!findTemplate(c?.template)?.party;

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// [kalit, sarlavha, qatorlar soni]
export const BDAY = {
  tort: {
    photos: [
      ['letter', 'Maktubdagi surat (polaroid)'],
      ['gift', 'Sovg‘a ochilganda chiqadigan surat'],
    ],
    texts: [
      ['letter', 'Maktub matni', 6],
      ['letterTitle', 'Maktub sarlavhasi', 1],
      ['blowHint', 'Shamlar oldidagi yozuv', 2],
      ['heroCaption', 'Shamlar o‘chgach chiqadigan tabrik', 1],
      ['finaleTitle', 'Yakuniy sarlavha', 1],
      ['finaleText', 'Yakuniy so‘z', 1],
      ['memoriesTitle', 'Suratlar bo‘limi sarlavhasi', 1],
      ['wishesTitle', 'Tilaklar bo‘limi sarlavhasi', 1],
    ],
    memoriesHint: 'Polaroid suratlar ipga osilib turadi, bosilsa kattalashadi. Izoh va yil ixtiyoriy.',
    maxMemories: 12,
  },
  sevgi: {
    photos: [
      ['cover', '1. Muqova (eng chiroyli surat)'],
      ['first', '2. Ilk kunlar'],
      ['funny', '3. Kulgili lahza'],
      ['gratitude', '4. Mehr (quchoqlashgan)'],
      ['wishes', '6. Tilaklar foni'],
      ['gift', '7. Sovg‘a foni'],
    ],
    texts: [
      ['badge', 'Ism ostidagi yozuv', 1],
      ['coverText', 'Muqovadagi tabrik', 2],
      ['firstTitle', '2-sahifa sarlavhasi', 1],
      ['firstText', '2-sahifa matni', 4],
      ['firstSign', '2-sahifa imzosi', 1],
      ['funnyTitle', '3-sahifa sarlavhasi', 1],
      ['funnyText', '3-sahifa matni', 4],
      ['funnySign', '3-sahifa imzosi', 1],
      ['gratitudeTitle', '4-sahifa sarlavhasi', 1],
      ['gratitudeText', '4-sahifa matni', 4],
      ['gratitudeSign', '4-sahifa imzosi', 1],
      ['wishesTitle', 'Tilaklar sarlavhasi', 1],
      ['finaleTitle', 'Yakuniy sarlavha', 1],
      ['finaleText', 'Yakuniy so‘z', 1],
    ],
    memoriesHint: '5-sahifa — “Bizning yo‘limiz”: har bir qadam surat, sarlavha va qisqa matn bilan (2–6 ta).',
    maxMemories: 8,
  },
  plastinka: {
    photos: [
      ['cover', 'Albom muqovasi (tug‘ilgan kun egasining surati)'],
      ['venue', 'Bazm joyi surati (chipta ustida)'],
    ],
    photosHint: 'Muqova surati yuklanmasa — tilla nurli muqovada katta raqam bilan yoshi chiqadi.',
    texts: [
      ['inviteTitle', 'Taklif sarlavhasi', 1],
      ['invitation', 'Taklif matni (tug‘ilgan kun egasi nomidan)', 4],
    ],
  },
};

const dOf = (c) => ({ name: c.person?.name?.trim() || 'Ism', age: ageOf(c), party: !!c.venue?.name?.trim() });
/** Panelda placeholder sifatida ko'rsatiladigan standart matnlar (config.texts yozilmagan holda). */
export function defaultTexts(c) {
  const base = { ...c, texts: {} };
  if (c.template === 'plastinka') return plastinkaTexts(base, { ...dOf(c), year: Number(String(c.event?.date || '').slice(0, 4)) || new Date().getFullYear() });
  return c.template === 'sevgi' ? sevgiTexts(base, dOf(c)) : tortTexts(base, dOf(c));
}

/** Yangi tug'ilgan kun sayti. */
export function birthdayConfig(template) {
  if (findTemplate(template)?.party) {
    const date = addDays(todayIso(), 14);
    return {
      template,
      watermark: true,
      autoScroll: 'auto',
      person: { name: '', birthDate: '' },
      event: { date, time: '19:00', timezone: '+05:00', durationHours: 5 },
      texts: {},
      photos: {},
      venue: { name: '', address: '', googleMaps: '', yandexMaps: '' },
      program: PARTY_PROGRAM.map((p) => ({ ...p })),
      dressCode: { text: 'Black & Gold: qora va tilla ranglar, klassik yoki smart-casual.', colors: ['#111111', '#d4a24c', '#f2ece1', '#6b4a2b'] },
      musicTrack: 'musiqa-16',
      rsvp: { enabled: true, deadline: addDays(date, -2), maxGuests: 4, showWishes: true },
      contacts: [],
      effects: { countdown: true },
    };
  }
  return {
    template,
    watermark: true,
    autoScroll: 'button',
    person: { name: '', birthDate: '' },
    from: 'Sevgilingdan',
    together: '',
    event: { date: addDays(todayIso(), 7), timezone: '+05:00' },
    texts: {},
    photos: {},
    memories: [],
    wishes: [...ROMANTIC_WISHES],
    gift: { title: '', text: '' },
    musicTrack: template === 'sevgi' ? 'musiqa-11' : 'musiqa-16',
    rsvp: { enabled: true },
  };
}

/** Jonli ko'rinish: bo'sh maydonlar namuna bilan. */
export function birthdayPreview(c0) {
  const c = JSON.parse(JSON.stringify(c0));
  c.person = { ...c.person, name: c.person?.name?.trim() || 'Ism' };
  if (isParty(c)) {
    // Bazm joyi yozilmagan bo'lsa ham ko'rinishda chipta va javob kartasi chiqsin
    c.venue = { ...c.venue, name: c.venue?.name?.trim() || 'Bazm joyi' };
    if (Array.isArray(c.program)) c.program = c.program.filter((p) => p.time && p.title?.trim());
    if (Array.isArray(c.contacts)) c.contacts = c.contacts.filter((p) => p.phone?.trim());
  }
  if (!isValidDate(c.person.birthDate)) delete c.person.birthDate;
  c.event = { ...c.event };
  if (!isValidDate(c.event.date)) c.event.date = addDays(todayIso(), 7);
  if (!isValidDate(c.together)) delete c.together;
  if (Array.isArray(c.wishes)) c.wishes = c.wishes.filter((w) => String(w).trim());
  if (Array.isArray(c.memories)) c.memories = c.memories.filter((m) => m.photo || m.title?.trim() || m.text?.trim());
  if (c.gift && !c.gift.title?.trim() && !c.gift.text?.trim() && !c.gift.card && !c.gift.link) delete c.gift;
  return c;
}

/** Saqlashdan oldin: bo'sh ixtiyoriy maydonlar olib tashlanadi. */
export function cleanBirthday(c) {
  c.person = { ...c.person, name: (c.person?.name || '').trim() };
  if (!isValidDate(c.person.birthDate)) delete c.person.birthDate;
  if (!isValidDate(c.together)) delete c.together;
  if (typeof c.from === 'string') c.from = c.from.trim();
  if (!c.from) delete c.from;
  for (const [k, v] of Object.entries(c.texts || {})) if (!String(v).trim()) delete c.texts[k];
  c.wishes = (c.wishes || []).map((w) => String(w).trim()).filter(Boolean);
  c.memories = (c.memories || [])
    .map((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, String(v ?? '').trim()]).filter(([, v]) => v)))
    .filter((m) => Object.keys(m).length);
  for (const [k, v] of Object.entries(c.photos || {})) if (!v) delete c.photos[k];
  if (c.gift) {
    for (const k of Object.keys(c.gift)) {
      c.gift[k] = String(c.gift[k] ?? '').trim();
      if (!c.gift[k]) delete c.gift[k];
    }
    if (c.gift.card) c.gift.card = c.gift.card.replace(/\D/g, '');
    if (!Object.keys(c.gift).length) delete c.gift;
  }
  if (c.voice !== 'siz') delete c.voice;
  if (isParty(c)) {
    // Bazm: manzil, dastur, kontaktlar va javob muddati saqlanadi (bo'sh qatorlar tozalanadi)
    if (Array.isArray(c.program)) c.program = c.program.filter((p) => p.time || p.title?.trim());
    if (Array.isArray(c.contacts)) c.contacts = c.contacts.filter((p) => p.name?.trim() || p.phone?.trim());
    if (c.venue && !Object.values(c.venue).some((v) => String(v || '').trim())) delete c.venue;
    if (c.rsvp && !c.rsvp.deadline) delete c.rsvp.deadline;
    return c;
  }
  if (c.rsvp) delete c.rsvp.deadline;
  delete c.venue;
  return c;
}
