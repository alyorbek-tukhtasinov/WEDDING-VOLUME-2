// Yangi sayt uchun boshlang'ich sozlamalar (shablon + marosim turi). Boshqaruv paneli va Telegram bot
// (Mini App) bir xil boshlanishi uchun umumiy. Brauzerda ham, Node'da ham ishlaydi.
import { findEvent, eventTexts } from './events.js';
import { buildProgram, findDressPreset, DRESS_PRESETS } from './presets.js';

export const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function defaultConfig(template, eventId = 'nikoh') {
  // Yangi saytlar ochilganda o'zi aylana boshlaydi (eski saytlarda — yo'q, ya'ni "off")
  return { ...withEvent(baseConfig(template), eventId), autoScroll: 'auto' };
}

/** Marosim turining boshlang'ich qiymatlari: vaqt, davomiylik, dastur, dress-kod, taklif matnlari. */
export function withEvent(c, eventId) {
  const e = findEvent(eventId);
  c.eventType = e.id;
  c.event = { ...c.event, time: e.time, durationHours: e.durationHours };
  if (c.template === 'yz') return c;
  c.texts = { ...c.texts, ...eventTexts(e.id, '', '') };
  if (Array.isArray(c.program)) c.program = buildProgram(e.program, e.time);
  const dress = findDressPreset(e.dress);
  if (c.dressCode && dress) c.dressCode = { text: dress.text, colors: [...dress.colors] };
  return c;
}

export function baseConfig(template) {
  const date = addDays(todayIso(), 45);
  if (template === 'yz') {
    return {
      template: 'yz',
      couple: { groom: '', bride: '', initials: '' },
      event: { date, time: '16:00', timezone: '+05:00', durationHours: 5 },
      venue: { name: '', address: '', googleMaps: '', yandexMaps: '', mapEmbed: '' },
      photos: {},
      musicTrack: 'musiqa-4',
      rsvp: { enabled: true, deadline: addDays(date, -1), maxGuests: 5 },
      ru: {},
      texts: { uz: {}, ru: {} },
      seo: { title: '', description: '', ogImage: '' },
    };
  }
  const kechki = DRESS_PRESETS.find((p) => p.id === 'kechki');
  if (template === 'volume5') {
    return {
      template,
      couple: { groom: '', bride: '', initials: '' },
      event: { date, time: '18:00', timezone: '+05:00', durationHours: 5 },
      hosts: '',
      texts: {
        heroCaption: 'Nikoh to‘yiga taklifnoma',
        greeting: 'Aziz mehmonlar!',
        invitation: eventTexts('nikoh', '', '').invitation,
        closing: 'Tashrifingiz biz uchun katta sharaf!',
      },
      venue: { name: '', address: '', googleMaps: '', yandexMaps: '' },
      program: buildProgram('kechki', '18:00'),
      // Maketdagi zaytun-ko'k palitra
      dressCode: { text: 'To‘yimiz ranglarini qo‘llab-quvvatlasangiz, biz uchun katta quvonch bo‘ladi.', colors: ['#73806f', '#9caa99', '#8799a7', '#c4d1e2', '#f5f2ed'] },
      giftNote: { title: '', text: 'Iliq so‘z va tilaklaringizni qalbingizda olib keling — biz uchun eng qimmatli sovg‘a sizning tashrifingiz.' },
      photos: {},
      musicTrack: 'musiqa-5',
      rsvp: { enabled: true, deadline: addDays(date, -1), maxGuests: 5, showWishes: true },
      contacts: [],
      seo: { title: '', description: '', ogImage: '' },
      effects: { countdown: true },
    };
  }
  if (['suzani', 'kitob', 'bulut', 'volume3', 'volume4'].includes(template)) {
    return {
      template,
      couple: { groom: '', bride: '', initials: '' },
      event: { date, time: '18:00', timezone: '+05:00', durationHours: 5 },
      hosts: '',
      texts: {
        heroCaption: 'Nikoh to‘yiga taklifnoma',
        greeting: 'Hurmatli mehmonimiz!',
        invitation: eventTexts('nikoh', '', '').invitation,
        closing: 'Tashrifingiz biz uchun katta sharaf!',
      },
      venue: { name: '', address: '', googleMaps: '', yandexMaps: '' },
      program: buildProgram('kechki', '18:00'),
      dressCode: { text: kechki.text, colors: [...kechki.colors] },
      musicTrack: 'musiqa-5',
      rsvp: { enabled: true, deadline: addDays(date, -1), maxGuests: 5, showWishes: true },
      contacts: [],
      seo: { title: '', description: '', ogImage: '' },
      effects: { countdown: true },
    };
  }
  if (template === 'osmon') {
    return {
      template: 'osmon',
      couple: { groom: '', bride: '', initials: '' },
      event: { date, time: '19:00', timezone: '+05:00', durationHours: 5 },
      hosts: '',
      texts: {
        heroCaption: 'Nikoh to‘yiga taklifnoma',
        greeting: 'Hurmatli mehmonimiz!',
        invitation: eventTexts('nikoh', '', '').invitation,
        closing: 'Tashrifingiz biz uchun katta sharaf!',
      },
      venue: { name: '', address: '', googleMaps: '', yandexMaps: '' },
      sky: { city: '', lat: '', lng: '' },
      program: buildProgram('kechki', '19:00'),
      dressCode: { text: kechki.text, colors: [...kechki.colors] },
      musicTrack: 'musiqa-3',
      rsvp: { enabled: true, deadline: addDays(date, -1), maxGuests: 5, showWishes: true },
      contacts: [],
      seo: { title: '', description: '', ogImage: '' },
    };
  }
  return {
    template: 'volume2',
    couple: { groom: '', bride: '', initials: '' },
    event: { date, time: '18:00', timezone: '+05:00', durationHours: 5 },
    hosts: '',
    texts: {
      heroCaption: 'Nikoh to‘yiga taklifnoma',
      greeting: 'Hurmatli mehmonimiz!',
      invitation: eventTexts('nikoh', '', '').invitation,
      closing: 'Tashrifingiz biz uchun katta sharaf!',
    },
    venue: { name: '', address: '', googleMaps: '', yandexMaps: '', image: '' },
    program: buildProgram('kechki', '18:00'),
    dressCode: { text: kechki.text, colors: [...kechki.colors] },
    gallery: [],
    musicTrack: 'musiqa-1',
    rsvp: { enabled: true, deadline: addDays(date, -1), maxGuests: 5, showWishes: true },
    contacts: [],
    seo: { title: '', description: '', ogImage: '' },
    theme: {},
    effects: { envelope: true, petals: true, typing: true },
  };
}

