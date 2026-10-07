// Qiz tug'ilgan kechaning haqiqiy ma'lumotlari: Oy fazasi (astronomik hisob — osmon shablonining astro.js),
// burj, muchal yili, hafta kuni, yashalgan kunlar va Yer uni Quyosh atrofida qancha yo'l olib yurgani.
// DOM ishlatmang: fayl testlarda ham yuklanadi.
import { julianDay, moonPosition, moonPhaseName } from '../osmon/sky/astro.js';
import { MONTHS, WEEKDAYS, isValidDate } from '../../src/lib/config.js';

// [nom, belgi, boshlanish oyi, kuni] — an'anaviy o'zbekcha burj nomlari, yil tartibida
const BURJ = [
  ['Dalv', '♒', 1, 20],
  ['Hut', '♓', 2, 19],
  ['Hamal', '♈', 3, 21],
  ['Savr', '♉', 4, 20],
  ['Javzo', '♊', 5, 21],
  ['Saraton', '♋', 6, 21],
  ['Asad', '♌', 7, 23],
  ['Sunbula', '♍', 8, 23],
  ['Mezon', '♎', 9, 23],
  ['Aqrab', '♏', 10, 23],
  ['Qavs', '♐', 11, 22],
  ['Jaddiy', '♑', 12, 22],
];

export function burjOf(month, day) {
  // 20-yanvargacha — o'tgan yilning Jaddiysi
  let found = BURJ[BURJ.length - 1];
  for (const b of BURJ) if (month > b[2] || (month === b[2] && day >= b[3])) found = b;
  return { name: found[0], sign: found[1] };
}

// Muchal: 12 yillik davr; o'zbek an'anasida yangi muchal yili Navro'zdan (21-mart) boshlanadi
const MUCHAL = [
  ['Sichqon', '🐭'],
  ['Sigir', '🐮'],
  ['Yo‘lbars', '🐯'],
  ['Quyon', '🐰'],
  ['Baliq', '🐟'],
  ['Ilon', '🐍'],
  ['Ot', '🐴'],
  ['Qo‘y', '🐑'],
  ['Maymun', '🐵'],
  ['Tovuq', '🐔'],
  ['It', '🐶'],
  ['To‘ng‘iz', '🐷'],
];

export function muchalOf(year, month, day) {
  const y = month < 3 || (month === 3 && day < 21) ? year - 1 : year;
  const [name, emoji] = MUCHAL[(((y - 2008) % 12) + 12) % 12];
  return { name, emoji };
}

/** Tug'ilgan kecha (soat 21:00, mahalliy vaqt) Oyining holati. */
export function birthMoon(birthDate, tz = '+05:00') {
  const m = moonPosition(julianDay(new Date(`${birthDate}T21:00:00${tz}`)));
  return { illumination: m.illumination, waxing: m.waxing, name: moonPhaseName(m.illumination, m.waxing), percent: Math.round(m.illumination * 100) };
}

// Yer orbitasining uzunligi (~940 mln km) — bir yilda Quyosh atrofida bosib o'tiladigan yo'l
const ORBIT_KM_PER_DAY = 940e6 / 365.256;

/** Hozirgacha: yashalgan kunlar, soatlar va Yer bilan birga Quyosh atrofida bosib o'tilgan yo'l. */
export function lifeNumbers(birthDate, tz = '+05:00', now = Date.now()) {
  const ms = Math.max(0, now - new Date(`${birthDate}T00:00:00${tz}`).getTime());
  const days = ms / 86400000;
  return { days: Math.floor(days), hours: Math.floor(ms / 3600000), km: days * ORBIT_KM_PER_DAY };
}

/** "16,9 milliard" / "940 million" — katta sonni o'qiladigan qilib. */
export function bigKm(km) {
  if (km >= 1e9) return `${(km / 1e9).toFixed(1).replace('.', ',')} milliard`;
  return `${Math.round(km / 1e6)} million`;
}

/** Barcha faktlar (tug'ilgan sana bo'lmasa — null). */
export function birthFacts(c) {
  const b = c.person?.birthDate;
  if (!isValidDate(b)) return null;
  const [y, m, d] = b.split('-').map(Number);
  const tz = c.event?.timezone || '+05:00';
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return {
    year: y,
    month: m,
    day: d,
    dateText: `${d}-${MONTHS[m - 1]}, ${y}`,
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    moon: birthMoon(b, tz),
    burj: burjOf(m, d),
    muchal: muchalOf(y, m, d),
    ...lifeNumbers(b, tz),
  };
}
