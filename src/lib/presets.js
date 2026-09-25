// Tayyor shablonlar: to'y dasturi va dress-kod.
// Boshqaruv panelida "Shablondan" / "Avtomatik tuzish" tugmalari shularni ishlatadi.
// Brauzerda ham, Node'da ham ishlaydi — DOM ishlatmang.

import { TIME_RE } from './config.js';

/* ------------------------------------------------------------------ */
/*  To'y dasturi                                                       */
/*  at — boshlanish vaqtidan necha daqiqa keyin                         */
/* ------------------------------------------------------------------ */
export const PROGRAM_PRESETS = [
  {
    id: 'kechki',
    title: 'Kechki to‘y (to‘yxonada)',
    hint: '16:00 dan keyin boshlanadigan odatiy nikoh to‘yi',
    items: [
      { at: 0, title: 'Mehmonlarni kutib olish' },
      { at: 30, title: 'Kelin-kuyovning kirib kelishi' },
      { at: 60, title: 'Tantanali ziyofat' },
      { at: 210, title: 'To‘y tortini kesish' },
    ],
  },
  {
    id: 'kunduzgi',
    title: 'Kunduzgi to‘y (to‘yxonada)',
    hint: 'Tushlik vaqtida boshlanadigan to‘y',
    items: [
      { at: 0, title: 'Mehmonlarni kutib olish' },
      { at: 30, title: 'Kelin-kuyovning kirib kelishi' },
      { at: 60, title: 'Tantanali ziyofat' },
      { at: 180, title: 'To‘y tortini kesish' },
    ],
  },
  {
    id: 'kelin-uyida',
    title: 'Kelin tomon (kelinning uyida)',
    hint: 'Kuyov kelib kelinni olib ketadi — to‘y torti bo‘lmaydi',
    items: [
      { at: 0, title: 'Mehmonlarni kutib olish' },
      { at: 30, title: 'Dasturxon atrofida ziyofat' },
      { at: 120, title: 'Kuyov va uning yaqinlarining kirib kelishi' },
      { at: 150, title: 'Kelinni kuyov xonadoniga kuzatish' },
    ],
  },
  {
    id: 'nahorgi-osh',
    title: 'Nahorgi osh',
    hint: 'Erta tongda, odatda 05:30–07:00',
    items: [
      { at: 0, title: 'Mehmonlarni kutib olish' },
      { at: 20, title: 'Qur’on tilovati va duo' },
      { at: 40, title: 'Nahorgi osh tortilishi' },
    ],
  },
  {
    id: 'fotiha',
    title: 'Fotiha to‘yi',
    hint: 'Unashtiruv / fotiha marosimi',
    items: [
      { at: 0, title: 'Mehmonlarni kutib olish' },
      { at: 30, title: 'Fotiha marosimi' },
      { at: 60, title: 'Dasturxon atrofida ziyofat' },
    ],
  },
];

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const toTime = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const round5 = (n) => Math.round(n / 5) * 5;

/** Vaqtga qarab eng mos shablon: tong — nahorgi osh, kunduz — kunduzgi, kech — kechki. */
export function suggestProgramPreset(time) {
  if (!TIME_RE.test(time || '')) return 'kechki';
  const m = toMin(time);
  if (m < 9 * 60) return 'nahorgi-osh';
  if (m < 16 * 60) return 'kunduzgi';
  return 'kechki';
}

/**
 * Shablon va boshlanish vaqtidan to'y dasturini tuzadi.
 * Kech boshlangan to'yda oxirgi tadbir yarim tundan o'tib ketmasligi uchun oraliqlar
 * mutanosib qisqartiriladi (23:30 dan kechiktirilmaydi), vaqtlar 5 daqiqaga yaxlitlanadi.
 */
export function buildProgram(presetId, startTime) {
  const preset = PROGRAM_PRESETS.find((p) => p.id === presetId);
  if (!preset || !TIME_RE.test(startTime || '')) return [];
  const start = toMin(startTime);
  const last = preset.items[preset.items.length - 1].at;
  const latest = 23 * 60 + 30;
  const scale = last > 0 && start + last > latest && start < latest ? Math.max(0.5, (latest - start) / last) : 1;
  let prev = -Infinity;
  return preset.items.map(({ at, title }) => {
    // Qisqartirilganda ham har tadbir oldingisidan kamida 15 daqiqa keyin bo'lsin
    const offset = Math.max(round5(at * scale), prev + (prev === -Infinity ? 0 : 15));
    prev = offset;
    return { time: toTime(start + offset), title };
  });
}

/** Mavjud dasturni yangi boshlanish vaqtiga suradi (tadbirlar orasidagi oraliq saqlanadi). */
export function shiftProgram(program, fromTime, toTimeStr) {
  if (!TIME_RE.test(fromTime || '') || !TIME_RE.test(toTimeStr || '')) return program;
  const delta = toMin(toTimeStr) - toMin(fromTime);
  return (program || []).map((p) => (TIME_RE.test(p.time || '') ? { ...p, time: toTime(toMin(p.time) + delta) } : p));
}

/* ------------------------------------------------------------------ */
/*  Dress-kod                                                          */
/* ------------------------------------------------------------------ */
const CLASSIC = ['#0b2545', '#c9a96e', '#f4efe6', '#7a1f3d'];

export const DRESS_PRESETS = [
  { id: 'none', title: 'Dress-kod yo‘q', text: '', colors: [] },
  {
    id: 'kechki',
    title: 'Kechki libos',
    text: 'Kechki libos. Iltimos, oq rangdagi liboslardan saqlaning.',
    colors: CLASSIC,
  },
  {
    id: 'qulay',
    title: 'O‘zingizga qulay',
    text: 'O‘zingizga qulay va ma’qul bo‘lgan bayramona libosda tashrif buyuring — biz uchun eng muhimi, siz bilan birga bo‘lish.',
    colors: CLASSIC,
  },
  {
    id: 'bayramona',
    title: 'Bayramona libos',
    text: 'Bayramona libos. Iltimos, oq rangdagi liboslardan saqlaning.',
    colors: CLASSIC,
  },
  {
    id: 'milliy',
    title: 'Milliy libos',
    text: 'Milliy liboslarda tashrif buyurishingizni so‘raymiz — bayramimiz yanada go‘zal bo‘ladi.',
    colors: ['#7a1f3d', '#c9a96e', '#1f5f4a', '#f4efe6'],
  },
  {
    id: 'pastel',
    title: 'Och (pastel) ranglar',
    text: 'Och, yumshoq (pastel) ranglardagi liboslarda kelishingizni so‘raymiz.',
    colors: ['#e8d5c4', '#d8c3d9', '#c9dccf', '#f3e7c9'],
  },
  {
    id: 'klassik',
    title: 'Klassik: qora va oq',
    text: 'Klassik uslub: erkaklar uchun qora kostyum, ayollar uchun kechki libos.',
    colors: ['#111111', '#f5f5f5', '#c9a96e'],
  },
];

export const findDressPreset = (id) => DRESS_PRESETS.find((p) => p.id === id) || null;
