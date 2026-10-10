// Botda oddiy suhbat orqali taklifnoma yaratish (Mini App o'rniga): savollar birma-bir, tanlovlar — tugmalar.
// Oxirida — xulosa, "NAMUNA" belgili ko'rinish havolasi, "✏️ O'zgartirish" va "💳 To'lov qilish".
// Saqlash Mini App bilan bir xil qoidalar bo'yicha (app-api.js save) — to'lov, chek va yig'ish o'zgarmagan.
//
// Holat: <DATA_DIR>/wizard.json — { [userId]: { slug, step, data, edit } } (bot qayta ishga tushsa ham saqlanadi).
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, ROOT, readSite, STATUS, promoAmount } from './data.js';
import { MUSIC_LIBRARY, findTrack } from '../src/lib/music.js';
import { tg, tgUpload, tgDownload, previewUrl, siteUrlOf, siteDomain, fmtSum, PRICE } from './telegram.js';
import { save, saveBirthday, saveBotPhoto, APP_TEMPLATES, BDAY_TEMPLATES, BDAY_SLOTS, MAX_BDAY_PHOTOS } from './app-api.js';
import { EVENTS, findEvent } from '../src/lib/events.js';
import { parseMapInput, googleLink, yandexLink } from '../src/lib/maps.js';
import { MONTHS, validateConfig, isValidDate, ageOf } from '../src/lib/config.js';
import { todayIso } from '../src/lib/starter.js';

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// Dizaynlar (bot ko'rsatadigan tartibda) va namunalari
export const DESIGNS = [
  ['volume5', '💃 Our Story', 'demo-volume5'],
  ['volume3', '🌿 Yashil bog‘', 'demo-volume3'],
  ['volume4', '🌸 Pushti bog‘', 'demo-volume4'],
  ['osmon', '🌌 Yulduzli osmon', 'demo-osmon'],
  ['volume2', '🕊 Klassik (oq-oltin konvert)', 'demo'],
  ['suzani', '🪡 Suzani', 'demo-suzani'],
  ['bulut', '✈️ Bulutlar ustida', 'demo-bulut'],
  ['kitob', '📖 3D sehrli kitob', 'demo-kitob'],
  ['yz', '🎬 Kino uslubida', 'demo-yz'],
].filter(([id]) => APP_TEMPLATES.includes(id));
// Tug'ilgan kun: klassik — bazmga taklif (erkaklar uchun ham); qolganlari — sevgan insonga suratli tabrik
export const BDESIGNS = [
  ['klassik', '🎩 Klassik bazm — tug‘ilgan kunga taklif', 'demo-klassik'],
  ['tort', '🎂 Sehrli tort — suratli tabrik', 'demo-tort'],
  ['yulduz', '✨ Yulduzlardan yaralgan — qizga tabrik', 'demo-yulduz'],
  ['sevgi', '💌 Sevgi kundaligi — sevgilingizga', 'demo-sevgi'],
].filter(([id]) => BDAY_TEMPLATES.includes(id));
const designTitle = (id) => [...DESIGNS, ...BDESIGNS].find(([d]) => d === id)?.[1] || id;
const isBdayT = (id) => BDAY_TEMPLATES.includes(id);
const isParty = (w) => w.data.template === 'klassik';
const demoLinks = (list) => list.map(([, t, demo]) => (siteDomain() ? `<a href="https://${demo}.${siteDomain()}">${esc(t.split(' — ')[0])}</a>` : esc(t))).join(' · ');

/* ------------------------------------ Holat ------------------------------------ */
const file = () => path.join(DATA_DIR(), 'wizard.json');
function load() {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8'));
  } catch {
    return {};
  }
}
function store(all) {
  fs.mkdirSync(DATA_DIR(), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(all));
  fs.renameSync(`${file()}.tmp`, file());
}
const getW = (id) => load()[String(id)] || null;
function setW(id, w) {
  const all = load();
  if (w) all[String(id)] = { ...w, at: Date.now() };
  else delete all[String(id)];
  store(all);
}

async function send(chatId, text, extra = {}) {
  try {
    return await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
  } catch (err) {
    console.log(`! wizard xabar (${chatId}): ${err.message}`);
    return null;
  }
}
const kb = (rows) => ({ reply_markup: { inline_keyboard: rows } });

/* ------------------------------------ Tekshiruvlar ------------------------------------ */
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function parseName(t) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 40 || /[0-9@#/\\<>{}[\]]/.test(s)) return null;
  return s.split(' ').map(cap).join(' ');
}
export function parseDate(t) {
  const s = String(t || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  let y, mo, d;
  if (m) [, y, mo, d] = m.map(Number);
  else {
    m = /^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{2}|\d{4})$/.exec(s);
    if (!m) return null;
    [, d, mo, y] = m.map(Number);
    if (y < 100) y += 2000;
  }
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (!isValidDate(iso) || iso < todayIso() || y > new Date().getFullYear() + 3) return null;
  return iso;
}
export function parseTime(t) {
  const m = /^(\d{1,2})(?:[:.\s](\d{2}))?$/.exec(String(t || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2] || 0);
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}
const prettyDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  return y ? `${d}-${MONTHS[m - 1]} ${y}` : '—';
};

/* ------------------------------------ Savollar ------------------------------------ */
// Har qadam: so'rash (ask) va javobni qabul qilish (text — matn, cb — tugma). Qaytaradi: true (keyingi qadam) yoki xato matni.
const SKIP = '⏭ O‘tkazib yuborish';
const STEPS = {
  template: {
    ask: (w) => [
      `🎨 <b>Dizaynni tanlang</b>\n\nNamunalarni ochib ko‘rishingiz mumkin: ${DESIGNS.map(([, t, demo]) => (siteDomain() ? `<a href="https://${demo}.${siteDomain()}">${esc(t)}</a>` : esc(t))).join(' · ')}`,
      kb(DESIGNS.map(([id, t]) => [{ text: (w.data.template === id ? '✅ ' : '') + t, callback_data: `wz:template:${id}` }])),
    ],
    cb: (w, v) => (DESIGNS.some(([id]) => id === v) ? ((w.data.template = v), true) : 'Dizaynni tugmadan tanlang'),
  },
  eventType: {
    ask: () => ['🎉 <b>Qanday marosim?</b>', kb(EVENTS.map((e) => [{ text: `${e.icon} ${e.title}`, callback_data: `wz:eventType:${e.id}` }]))],
    cb: (w, v) => (EVENTS.some((e) => e.id === v) ? ((w.data.eventType = v), true) : 'Tugmadan tanlang'),
  },
  groom: {
    ask: (w) =>
      w.data.eventType === 'qiz-uzatish'
        ? ['🤵 <b>Kuyovning ismi</b>\n\nQiz uzatishda kuyov ismi yozilmasligi ham mumkin.', kb([[{ text: SKIP, callback_data: 'wz:groom:-' }]])]
        : ['🤵 <b>Kuyovning ismini yozing</b>\n\nMasalan: <i>Jasur</i>'],
    text: (w, t) => {
      const n = parseName(t);
      if (!n) return 'Ism 2–40 harf bo‘lsin, raqamsiz. Qaytadan yozing:';
      w.data.groom = n;
      return true;
    },
    cb: (w, v) => (v === '-' && w.data.eventType === 'qiz-uzatish' ? ((w.data.groom = ''), true) : 'Ismni yozing'),
  },
  bride: {
    ask: () => ['👰 <b>Kelinning ismini yozing</b>\n\nMasalan: <i>Madina</i>'],
    text: (w, t) => {
      const n = parseName(t);
      if (!n) return 'Ism 2–40 harf bo‘lsin, raqamsiz. Qaytadan yozing:';
      w.data.bride = n;
      return true;
    },
  },
  date: {
    ask: (w) => [
      `📅 <b>${w.data.kind === 'bday' ? (isParty(w) ? 'Bazm sanasi' : 'Tug‘ilgan kun sanasi (yaqinlashayotgan)') : 'Sana'}</b>\n\nKun.oy.yil ko‘rinishida yozing, masalan: <code>16.11.2026</code>`,
    ],
    text: (w, t) => {
      const d = parseDate(t);
      if (!d) return 'Sana tushunarsiz yoki o‘tib ketgan. Masalan: <code>16.11.2026</code>';
      w.data.date = d;
      return true;
    },
  },
  time: {
    ask: (w) => {
      const def = findEvent(w.data.eventType).time;
      const opts = [...new Set([def, '11:00', '12:00', '16:00', '17:00', '18:00', '19:00'])].slice(0, 6);
      return ['🕰 <b>Boshlanish vaqti</b>\n\nTugmani bosing yoki o‘zingiz yozing (masalan <code>17:30</code>):', kb([opts.slice(0, 3), opts.slice(3)].filter((r) => r.length).map((r) => r.map((t) => ({ text: t, callback_data: `wz:time:${t.replace(':', '')}` }))))];
    },
    text: (w, t) => {
      const v = parseTime(t);
      if (!v) return 'Vaqtni <code>18:00</code> ko‘rinishida yozing:';
      w.data.time = v;
      return true;
    },
    cb: (w, v) => ((w.data.time = parseTime(`${v.slice(0, 2)}:${v.slice(2)}`) || '18:00'), true),
  },
  venue: {
    ask: (w) =>
      w.data.kind === 'bday'
        ? ['🏛 <b>Bazm joyi</b>\n\nMasalan: <i>Grand Classic restorani</i>']
        : [`🏛 <b>${w.data.eventType === 'qiz-uzatish' || w.data.eventType === 'kelin-salom' ? 'Marosim joyi' : 'To‘yxona nomi'}</b>\n\nMasalan: <i>Bahor to‘yxonasi</i> yoki <i>Kelin xonadoni</i>`],
    text: (w, t) => {
      const s = String(t || '').trim();
      if (s.length < 2 || s.length > 120) return 'Nomni qisqaroq yozing (2–120 belgi):';
      w.data.venue = s;
      return true;
    },
  },
  address: {
    ask: () => ['📍 <b>Manzil</b>\n\nMasalan: <i>Toshkent shahri, Chilonzor tumani, Bunyodkor ko‘chasi 5</i>'],
    text: (w, t) => {
      const s = String(t || '').trim();
      if (s.length < 3 || s.length > 200) return 'Manzilni 3–200 belgi bilan yozing:';
      w.data.address = s;
      return true;
    },
  },
  map: {
    ask: () => [
      '🗺 <b>Xaritadagi joy</b>\n\n📎 → <b>Joylashuv (Location)</b> orqali nuqtani yuboring yoki Google/Yandex xarita havolasini tashlang.\nBilmasangiz — o‘tkazib yuboring, manzil bo‘yicha qidiruv havolasi qo‘yiladi.',
      kb([[{ text: SKIP, callback_data: 'wz:map:-' }]]),
    ],
    text: (w, t) => {
      const r = parseMapInput(t);
      if (!r.ok && !r.googleMaps && !r.yandexMaps) return 'Havola tushunarsiz. 📎 → Joylashuv yuboring yoki o‘tkazib yuboring.';
      w.data.map = { googleMaps: r.googleMaps, yandexMaps: r.yandexMaps, lat: r.lat, lng: r.lng };
      return true;
    },
    location: (w, loc) => {
      const lat = Number(loc.latitude.toFixed(6));
      const lng = Number(loc.longitude.toFixed(6));
      w.data.map = { googleMaps: googleLink(lat, lng), yandexMaps: yandexLink(lat, lng), lat, lng };
      return true;
    },
    cb: (w) => ((w.data.map = null), true),
  },
  voice: {
    ask: () => ['💌 <b>Taklif kimning nomidan?</b>', kb([[{ text: '👨‍👩‍👧 Ota-ona nomidan', callback_data: 'wz:voice:parents' }], [{ text: '💑 Kelin-kuyov nomidan', callback_data: 'wz:voice:couple' }]])],
    cb: (w, v) => (['parents', 'couple'].includes(v) ? ((w.data.voice = v), true) : 'Tugmadan tanlang'),
  },
  hosts: {
    skip: (w) => w.data.voice === 'couple',
    ask: () => ['👨‍👩‍👧 <b>Qaysi oila nomidan?</b>\n\nTaklif matni ostida chiqadi. Masalan: <i>Karimovlar oilasi</i>', kb([[{ text: SKIP, callback_data: 'wz:hosts:-' }]])],
    text: (w, t) => {
      const s = String(t || '').trim();
      if (s.length < 2 || s.length > 120) return 'Qisqaroq yozing (2–120 belgi):';
      w.data.hosts = s;
      return true;
    },
    cb: (w) => ((w.data.hosts = ''), true),
  },
};
// Faqat "✏️ O'zgartirish" orqali (yaratishda so'ralmaydi — standart qiymat qo'yiladi)
Object.assign(STEPS, {
  dress: {
    ask: (w) => {
      const cur = w.data.dressText;
      return [
        `👗 <b>Kiyinish uslubi</b>\n\nHozir: ${cur ? `<i>${esc(cur)}</i>` : '— (ko‘rsatilmaydi)'}\n\nYangi matnni yozing yoki tugmani tanlang:`,
        kb([[{ text: '❌ Olib tashlash', callback_data: 'wz:dress:-' }], [{ text: '↩️ Standart matn', callback_data: 'wz:dress:def' }]]),
      ];
    },
    text: (w, t) => {
      const v = String(t || '').trim();
      if (v.length < 3 || v.length > 300) return 'Matn 3–300 belgi bo‘lsin:';
      w.data.dress = { text: v };
      return true;
    },
    cb: (w, v) => ((w.data.dress = v === '-' ? null : 'default'), true),
  },
  program: {
    ask: (w) => {
      const cur = w.data.programList || [];
      return [
        `🗓 <b>To‘y dasturi</b>\n\nHozir:\n${cur.length ? cur.map((p) => `${p.time} — ${esc(p.title)}`).join('\n') : '— (ko‘rsatilmaydi)'}\n\n` +
          `Yangi dasturni yuboring — <b>har qatorda vaqt va nima bo‘lishi</b>:\n<code>18:00 Mehmonlarni kutib olish\n18:30 Kelin-kuyovning kirib kelishi\n19:00 Tantanali ziyofat</code>\n\nYoki tugmani tanlang:`,
        kb([[{ text: '❌ Dasturni olib tashlash', callback_data: 'wz:program:-' }], [{ text: '↩️ Standart dastur', callback_data: 'wz:program:def' }]]),
      ];
    },
    text: (w, t) => {
      const items = [];
      const bad = [];
      for (const line of String(t || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
        const m = /^(\d{1,2})[:.](\d{2})\s*[-—–:.)]?\s*(.{2,100})$/.exec(line);
        const time = m && parseTime(`${m[1]}:${m[2]}`);
        if (time) items.push({ time, title: m[3].trim() });
        else bad.push(line);
      }
      if (!items.length || bad.length) {
        return `Tushunmadim${bad.length ? `: <i>${esc(bad[0].slice(0, 60))}</i>` : ''}\nHar qatorni vaqt bilan boshlang, masalan:\n<code>18:00 Mehmonlarni kutib olish</code>`;
      }
      w.data.program = items.sort((a, b) => (a.time < b.time ? -1 : 1));
      return true;
    },
    cb: (w, v) => ((w.data.program = v === '-' ? [] : 'default'), true),
  },
});

// Musiqa (faqat "✏️ O'zgartirish" orqali): qo‘shiqni bossa — eshitib ko'radi, «✅ Tanlash» — saqlanadi
const trackTitle = (id) => (id === 'none' ? '🔇 Musiqasiz' : findTrack(id)?.title || '—');
Object.assign(STEPS, {
  music: {
    ask: (w) => [
      `🎵 <b>Fon musiqasi</b>\n\nHozir: <i>${esc(trackTitle(w.data.musicTrack))}</i>\n\nQo‘shiqni bosing — <b>eshitib ko‘rasiz</b>, yoqsa «✅ Tanlash» ni bosing:`,
      kb([
        ...MUSIC_LIBRARY.map((t) => [{ text: `${w.data.musicTrack === t.id ? '✅' : '▶️'} ${t.title}`.slice(0, 60), callback_data: `wz:music:p:${t.id}` }]),
        [{ text: `${w.data.musicTrack === 'none' ? '✅ ' : ''}🔇 Musiqasiz`, callback_data: 'wz:music:none' }],
      ]),
    ],
    cb: (w, v) => (v === 'none' || findTrack(v) ? ((w.data.musicTrack = v), true) : 'Qo‘shiqni ro‘yxatdan tanlang'),
  },
});

// Qo'shiqni eshittirish: fayl serverdan bir marta yuklanadi, keyin Telegram'dagi nusxasi (file_id) ishlatiladi
const musicIdsFile = () => path.join(DATA_DIR(), 'music-ids.json');
async function sendTrackPreview(chatId, id) {
  const t = findTrack(id);
  if (!t) return;
  let ids = {};
  try {
    ids = JSON.parse(fs.readFileSync(musicIdsFile(), 'utf8'));
  } catch {
    /* birinchi marta */
  }
  const caption = `🎵 <b>${esc(t.title)}</b>`;
  const markup = kb([[{ text: '✅ Shu qo‘shiqni tanlash', callback_data: `wz:music:${t.id}` }]]).reply_markup;
  try {
    if (ids[t.id]) return await tg('sendAudio', { chat_id: chatId, audio: ids[t.id], caption, parse_mode: 'HTML', reply_markup: markup });
    const file = path.join(ROOT, 'public', t.file);
    const r = await tgUpload('sendAudio', { chat_id: chatId, caption, parse_mode: 'HTML', title: t.title.split(' — ').at(-1), performer: t.title.includes(' — ') ? t.title.split(' — ')[0] : '', reply_markup: markup }, { field: 'audio', path: file, name: path.basename(file) });
    const fid = r?.audio?.file_id || r?.document?.file_id;
    if (fid) {
      ids[t.id] = fid;
      fs.mkdirSync(DATA_DIR(), { recursive: true });
      fs.writeFileSync(musicIdsFile(), JSON.stringify(ids));
    }
  } catch (err) {
    await send(chatId, `${caption}\n\n(Qo‘shiqni yuborib bo‘lmadi — baribir tanlashingiz mumkin)`, kb([[{ text: '✅ Shu qo‘shiqni tanlash', callback_data: `wz:music:${t.id}` }]]));
  }
}

// Boshlanish: to'y yoki tug'ilgan kun
Object.assign(STEPS, {
  kind: {
    ask: () => ['✨ <b>Qanday taklifnoma kerak?</b>', kb([[{ text: '💍 To‘y va marosimlar', callback_data: 'wz:kind:wedding' }], [{ text: '🎂 Tug‘ilgan kun', callback_data: 'wz:kind:bday' }]])],
    cb: (w, v) => {
      if (!['wedding', 'bday'].includes(v)) return 'Tugmadan tanlang';
      w.data.kind = v;
      return true;
    },
  },
  btemplate: {
    ask: () => [
      `🎂 <b>Tug‘ilgan kun dizaynini tanlang</b>\n\nNamunalar: ${demoLinks(BDESIGNS)}\n\n🎩 <b>Klassik</b> — mehmonlarni bazmga chaqirish uchun (joy, vaqt, dastur, javob).\n🎂✨💌 — yaqin insoningizni <b>suratlar bilan tabriklash</b> uchun.`,
      kb(BDESIGNS.map(([id, t]) => [{ text: t, callback_data: `wz:btemplate:${id}` }])),
    ],
    cb: (w, v) => (BDESIGNS.some(([id]) => id === v) ? ((w.data.template = v), true) : 'Tugmadan tanlang'),
  },
  name: {
    ask: (w) => [isParty(w) ? '🎉 <b>Tug‘ilgan kun egasining ismi</b>\n\nMasalan: <i>Jasur</i>' : '💝 <b>Kimni tabriklaymiz?</b> Ismini yozing\n\nMasalan: <i>Madina</i>'],
    text: (w, t) => {
      const n = parseName(t);
      if (!n) return 'Ism 2–40 harf bo‘lsin, raqamsiz. Qaytadan yozing:';
      w.data.name = n;
      return true;
    },
  },
  birthDate: {
    ask: () => ['🎈 <b>Tug‘ilgan sanasi</b> (yoshini ko‘rsatish uchun)\n\nMasalan: <code>14.11.1996</code>', kb([[{ text: SKIP, callback_data: 'wz:birthDate:-' }]])],
    text: (w, t) => {
      const s = String(t || '').trim();
      const m = /^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{4})$/.exec(s);
      const iso = m && `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      if (!iso || !isValidDate(iso) || iso >= todayIso() || Number(m[3]) < 1900) return 'Sana tushunarsiz. Masalan: <code>14.11.1996</code> (yoki o‘tkazib yuboring)';
      w.data.birthDate = iso;
      return true;
    },
    cb: (w) => ((w.data.birthDate = ''), true),
  },
  from: {
    ask: () => ['✍️ <b>Kimdan?</b> Tabrik ostida chiqadi\n\nMasalan: <i>Sevgilingdan</i> yoki <i>Doim yoningdagi Jasur</i>', kb([[{ text: SKIP, callback_data: 'wz:from:-' }]])],
    text: (w, t) => {
      const v = String(t || '').trim();
      if (v.length < 2 || v.length > 60) return '2–60 belgi bilan yozing:';
      w.data.from = v;
      return true;
    },
    cb: (w) => ((w.data.from = ''), true),
  },
  photos: {
    ask: (w) => [
      `📷 <b>Suratlarni yuboring</b> (1–${MAX_BDAY_PHOTOS} ta)\n\nBirinchisi — asosiy surat${w.data.template === 'yulduz' ? ' (yulduzlardan yig‘iladi — yuzi aniq, yorug‘ surat tanlang)' : ''}. Bir nechtasini birdan (albom) ham yuborsa bo‘ladi.\nTugatgach — «✅ Tayyor».`,
      kb([[{ text: '✅ Tayyor', callback_data: 'wz:photos:done' }]]),
    ],
    text: () => 'Surat yuboring (📎 → Galereya) yoki «✅ Tayyor» tugmasini bosing.',
    cb: (w) => ((w.data.photos || []).length ? true : 'Kamida 1 ta surat yuboring 📷'),
  },
});

// Savollar tartibi: to'y; tug'ilgan kun — bazm (klassik) yoki suratli tabrik
const ORDER = ['template', 'eventType', 'groom', 'bride', 'date', 'time', 'venue', 'address', 'map', 'voice', 'hosts'];
const BORDER_PARTY = ['btemplate', 'name', 'birthDate', 'date', 'time', 'venue', 'address', 'map'];
const BORDER_GIFT = ['btemplate', 'name', 'birthDate', 'date', 'from', 'photos'];
const orderOf = (w) => (w.data.kind === 'bday' ? (isParty(w) ? BORDER_PARTY : BORDER_GIFT) : ORDER);

/* ------------------------------------ Config ↔ javoblar ------------------------------------ */
function dataOf(c) {
  if (isBdayT(c.template)) return bdataOf(c);
  const map = c.venue?.googleMaps || c.venue?.yandexMaps ? { googleMaps: c.venue.googleMaps || '', yandexMaps: c.venue.yandexMaps || '' } : null;
  return {
    template: c.template,
    eventType: c.eventType || 'nikoh',
    groom: c.couple?.showGroom === false ? '' : c.couple?.groom || '',
    bride: c.couple?.bride || '',
    date: c.event?.date || '',
    time: c.event?.time || '',
    venue: c.venue?.name || '',
    address: c.venue?.address || '',
    map,
    voice: c.invitedBy === 'couple' ? 'couple' : 'parents',
    hosts: c.hosts || '',
    dressText: c.dressCode?.text || '',
    programList: (c.program || []).map((p) => ({ time: p.time, title: p.title })),
    musicTrack: c.musicTrack || '',
  };
}
function bdataOf(c) {
  const map = c.venue?.googleMaps || c.venue?.yandexMaps ? { googleMaps: c.venue.googleMaps || '', yandexMaps: c.venue.yandexMaps || '' } : null;
  const slots = BDAY_SLOTS[c.template] || [];
  return {
    kind: 'bday',
    template: c.template,
    name: c.person?.name || '',
    birthDate: c.person?.birthDate || '',
    date: c.event?.date || '',
    time: c.event?.time || '',
    venue: c.venue?.name || '',
    address: c.venue?.address || '',
    map,
    from: c.from || '',
    photos: [...slots.map((k) => c.photos?.[k]).filter(Boolean), ...(c.memories || []).map((m) => m.photo).filter(Boolean)],
    dressText: c.dressCode?.text || '',
    programList: (c.program || []).map((p) => ({ time: p.time, title: p.title })),
    musicTrack: c.musicTrack || '',
  };
}
function binputOf(d) {
  const input = { template: d.template, name: d.name, birthDate: d.birthDate || '', date: d.date };
  if (d.template === 'klassik') {
    const q = encodeURIComponent([d.venue, d.address].filter(Boolean).join(', '));
    const map = d.map || { googleMaps: `https://www.google.com/maps/search/?api=1&query=${q}`, yandexMaps: `https://yandex.uz/maps/?text=${q}` };
    Object.assign(input, { time: d.time, venue: { name: d.venue, address: d.address, googleMaps: map.googleMaps || '', yandexMaps: map.yandexMaps || '' } });
    if (d.dress !== undefined) input.dressCode = d.dress;
    if (d.program !== undefined) input.program = d.program;
  } else {
    input.from = d.from || '';
  }
  if (Array.isArray(d.photos)) input.photos = d.photos;
  if (d.musicTrack) input.musicTrack = d.musicTrack;
  return input;
}

function inputOf(d) {
  const q = encodeURIComponent([d.venue, d.address].filter(Boolean).join(', '));
  const map = d.map || { googleMaps: `https://www.google.com/maps/search/?api=1&query=${q}`, yandexMaps: `https://yandex.uz/maps/?text=${q}` };
  return {
    template: d.template,
    eventType: d.eventType,
    couple: { groom: d.groom || '', bride: d.bride || '', ...(d.eventType === 'qiz-uzatish' && !d.groom ? { showGroom: false } : {}) },
    event: { date: d.date, time: d.time },
    venue: { name: d.venue, address: d.address, googleMaps: map.googleMaps || '', yandexMaps: map.yandexMaps || '', ...(map.lat != null ? { lat: map.lat, lng: map.lng } : {}) },
    invitedBy: d.voice,
    hosts: d.voice === 'couple' ? [d.groom, d.bride].filter(Boolean).join(' va ') : d.hosts || '',
    // Faqat shu bandlar o'zgartirilganda yuboriladi
    ...(d.dress !== undefined ? { dressCode: d.dress } : {}),
    ...(d.program !== undefined ? { program: d.program } : {}),
    ...(d.musicTrack ? { musicTrack: d.musicTrack } : {}),
  };
}

/* ------------------------------------ Oqim ------------------------------------ */
async function ask(chatId, w) {
  const [text, extra = {}] = STEPS[w.step].ask(w);
  await send(chatId, text, extra);
}
function nextStep(w, from) {
  const order = orderOf(w);
  for (let i = order.indexOf(from) + 1; i < order.length; i++) if (!STEPS[order[i]].skip?.(w)) return order[i];
  return null;
}

/** Yangi taklifnoma (tanlangan dizayn bilan — reklamadan kelganda) */
export async function startWizard(chatId, user, template = '') {
  const w = { slug: null, step: 'template', data: {}, edit: false };
  if (DESIGNS.some(([id]) => id === template) || BDESIGNS.some(([id]) => id === template)) {
    w.data.template = template;
    w.data.kind = isBdayT(template) ? 'bday' : 'wedding';
    w.step = w.data.kind === 'bday' ? 'name' : 'eventType';
    await send(chatId, `✨ Ajoyib! Dizayn: <b>${esc(designTitle(template))}</b>\nBir necha savolga javob bering — taklifnomangiz tayyor bo‘ladi (2–3 daqiqa).`);
  } else {
    w.step = 'kind';
    await send(chatId, '✨ Bir necha savolga javob bering — taklifnomangiz tayyor bo‘ladi (2–3 daqiqa).\nIstalgan payt keyinroq o‘zgartirish mumkin.');
  }
  setW(user.id, w);
  await ask(chatId, w);
}

async function advance(chatId, user, w, res) {
  if (res !== true) return send(chatId, res);
  // Bitta maydonni o'zgartirish — darhol saqlanadi
  let next;
  if (w.step === 'kind') next = w.data.kind === 'bday' ? 'btemplate' : 'template';
  else next = w.edit ? (w.step === 'voice' && w.data.voice === 'parents' ? 'hosts' : null) : nextStep(w, w.step);
  // Suratlar sayt papkasiga yoziladi — undan oldin qoralama yaratiladi
  if (next === 'photos' && !w.slug) {
    try {
      const r = await saveBirthday(user, { input: binputOf({ ...w.data, photos: undefined }) });
      w.slug = r.slug;
    } catch (err) {
      setW(user.id, null);
      return send(chatId, `⚠️ ${esc(err.message)}`);
    }
  }
  if (next === 'photos') w.data.photos = [];
  if (next) {
    w.step = next;
    setW(user.id, w);
    return ask(chatId, w);
  }
  return finish(chatId, user, w);
}

async function finish(chatId, user, w) {
  let r;
  try {
    r =
      w.data.kind === 'bday'
        ? await saveBirthday(user, { ...(w.slug ? { slug: w.slug } : {}), input: binputOf(w.data) })
        : await save(user, { ...(w.slug ? { slug: w.slug } : {}), config: inputOf(w.data) });
  } catch (err) {
    setW(user.id, null);
    return send(chatId, `⚠️ ${esc(err.message)}`);
  }
  setW(user.id, null);
  return showSummary(chatId, user, r.slug, w.edit ? '✅ Saqlandi.' : '🎉 Taklifnomangiz tayyor! Ko‘rib chiqing:');
}

/** Xulosa: ma'lumotlar, ko'rish havolasi va tugmalar */
export async function showSummary(chatId, user, slug, title = '') {
  const s = readSite(slug);
  if (!s || String(s.meta.owner?.id) !== String(user.id)) return send(chatId, 'Taklifnoma topilmadi.');
  const c = s.config;
  const d = dataOf(c);
  const paid = s.meta.status === STATUS.paid;
  const ev = findEvent(c.eventType);
  const age = isBdayT(c.template) ? ageOf(c) : null;
  const lines = isBdayT(c.template)
    ? [
        title,
        '',
        `🎨 Dizayn: <b>${esc(designTitle(c.template))}</b>`,
        `🎂 ${esc(d.name)}${age ? ` — ${age} yosh` : ''}`,
        `📅 ${prettyDate(d.date)}${d.time && c.template === 'klassik' ? `, soat ${esc(d.time)}` : ''}`,
        ...(c.template === 'klassik'
          ? [
              `🏛 ${esc(d.venue)}`,
              `📍 ${esc(d.address)}`,
              `👗 Kiyinish uslubi: ${d.dressText ? esc(d.dressText.length > 60 ? `${d.dressText.slice(0, 60)}…` : d.dressText) : 'yo‘q'}`,
              `🗓 Dastur: ${d.programList.length ? d.programList.map((p) => `${p.time} ${esc(p.title)}`).join(' · ') : 'yo‘q'}`,
            ]
          : [`✍️ Kimdan: ${d.from ? esc(d.from) : '—'}`]),
        `📷 Suratlar: ${d.photos.length || 'yo‘q'}`,
      ]
    : [
    title,
    '',
    `🎨 Dizayn: <b>${esc(designTitle(c.template))}</b>`,
    `${ev.icon} Marosim: ${esc(ev.title)}`,
    `💑 ${d.groom ? `${esc(d.groom)} & ` : ''}${esc(d.bride)}`,
    `📅 ${prettyDate(d.date)}, soat ${esc(d.time)}`,
    `🏛 ${esc(d.venue)}`,
    `📍 ${esc(d.address)}`,
    `💌 ${d.voice === 'couple' ? 'Kelin-kuyov nomidan' : `Ota-ona nomidan${c.hosts ? ` — ${esc(c.hosts)}` : ''}`}`,
    `👗 Kiyinish uslubi: ${d.dressText ? esc(d.dressText.length > 60 ? `${d.dressText.slice(0, 60)}…` : d.dressText) : 'yo‘q'}`,
    `🗓 Dastur: ${d.programList.length ? d.programList.map((p) => `${p.time} ${esc(p.title)}`).join(' · ') : 'yo‘q'}`,
      ];
  if (c.musicTrack) lines.push(`🎵 Musiqa: ${esc(trackTitle(c.musicTrack))}`);
  const errors = validateConfig(c);
  if (errors.length && !paid) lines.push('', `⚠️ To‘ldirilmagan: ${esc(errors[0])}`);
  const disc = Math.max(0, Number(String(process.env.CHANNEL_DISCOUNT ?? '5000').replace(/\D/g, '')) || 0);
  if (!paid) {
    lines.push('', `💰 Narxi: <b>${fmtSum(s.meta.price || PRICE())}</b> — avval ko‘rib chiqing, yoqsa to‘lov qilasiz.`);
    if (disc) lines.push(`🎁 Kanalimizga obuna bo‘lsangiz — <b>${fmtSum((s.meta.price || PRICE()) - disc)}</b>`);
    const promo = promoAmount(s.meta);
    if (promo) lines.push(`🔥 Sizga maxsus chegirma: <b>−${fmtSum(promo)}</b>${s.meta.promo.locked ? '' : ' (24 soat)'}`);
  }
  const view = paid ? siteUrlOf(slug) : previewUrl(slug);
  const rows = [];
  if (view) rows.push([{ text: paid ? '🌐 Saytni ochish' : '👀 Ko‘rib chiqish', url: view }]);
  rows.push([{ text: '✏️ O‘zgartirish', callback_data: `wz:menu:${slug}` }]);
  if (!paid && s.meta.status !== STATUS.receipt) rows.push([{ text: '💳 To‘lov qilish', callback_data: `pay:${slug}` }]);
  return send(chatId, lines.join('\n').trim(), kb(rows));
}

const EDITABLE = [
  ['template', '🎨 Dizayn', true],
  ['eventType', '🎉 Marosim', true],
  ['groom', '🤵 Kuyov ismi'],
  ['bride', '👰 Kelin ismi'],
  ['date', '📅 Sana'],
  ['time', '🕰 Vaqt'],
  ['venue', '🏛 To‘yxona'],
  ['address', '📍 Manzil'],
  ['map', '🗺 Xarita'],
  ['voice', '💌 Kimning nomidan'],
  ['program', '🗓 To‘y dasturi'],
  ['dress', '👗 Kiyinish uslubi'],
  ['music', '🎵 Musiqa'],
];
const BEDITABLE = {
  klassik: [
    ['btemplate', '🎨 Dizayn', true],
    ['name', '🎉 Ism'],
    ['birthDate', '🎈 Tug‘ilgan sana'],
    ['date', '📅 Sana'],
    ['time', '🕰 Vaqt'],
    ['venue', '🏛 Bazm joyi'],
    ['address', '📍 Manzil'],
    ['map', '🗺 Xarita'],
    ['program', '🗓 Bazm dasturi'],
    ['dress', '👗 Kiyinish uslubi'],
    ['photos', '📷 Surat'],
    ['music', '🎵 Musiqa'],
  ],
  gift: [
    ['btemplate', '🎨 Dizayn', true],
    ['name', '💝 Ism'],
    ['birthDate', '🎈 Tug‘ilgan sana'],
    ['date', '📅 Sana'],
    ['from', '✍️ Kimdan'],
    ['photos', '📷 Suratlar'],
    ['music', '🎵 Musiqa'],
  ],
};
async function editMenu(chatId, user, slug) {
  const s = readSite(slug);
  if (!s || String(s.meta.owner?.id) !== String(user.id)) return;
  const paid = s.meta.status === STATUS.paid;
  const list = isBdayT(s.config.template) ? BEDITABLE[s.config.template === 'klassik' ? 'klassik' : 'gift'] : EDITABLE;
  // To'langan saytda dizayn va marosim turi o'zgarmaydi (sayt boshidan qayta tuziladi)
  const items = list.filter(([, , draftOnly]) => !(draftOnly && paid));
  const rows = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2).map(([f, t]) => ({ text: t, callback_data: `wz:edit:${slug}:${f}` })));
  rows.push([{ text: '⬅️ Orqaga', callback_data: `wz:show:${slug}` }]);
  return send(chatId, '✏️ <b>Nimani o‘zgartiramiz?</b>', kb(rows));
}

/* ------------------------------------ Kirish nuqtalari (bot.js) ------------------------------------ */
/** Tugma (callback "wz:…") — true qaytarsa, ishlov berildi */
export async function onWizardCallback(cb) {
  const parts = String(cb.data || '').split(':');
  if (parts[0] !== 'wz') return false;
  const user = cb.from;
  const chatId = cb.message?.chat?.id || user.id;
  await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
  const [, kind, a, b] = parts;
  if (kind === 'menu') return (await editMenu(chatId, user, a), true);
  if (kind === 'show') return (await showSummary(chatId, user, a), true);
  if (kind === 'edit') {
    const s = readSite(a);
    if (!s || String(s.meta.owner?.id) !== String(user.id) || !STEPS[b]) return true;
    const w = { slug: a, step: b, data: dataOf(s.config), edit: true };
    if (b === 'photos') w.data.photos = [];
    setW(user.id, w);
    await ask(chatId, w);
    return true;
  }
  // Qo'shiqni eshitib ko'rish (ro'yxat tugmalari o'z joyida qoladi)
  if (kind === 'music' && a === 'p') return (await sendTrackPreview(chatId, b), true);
  // Savolga tugma bilan javob
  const w = getW(user.id);
  if (!w || w.step !== kind || !STEPS[kind]?.cb) return true;
  // Tanlangan tugmalar yana bosilmasin — tugmalar olib tashlanadi
  if (cb.message) tg('editMessageReplyMarkup', { chat_id: chatId, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
  await advance(chatId, user, w, STEPS[kind].cb(w, a || ''));
  return true;
}

/** Matn yoki joylashuv — suhbat davom etayotgan bo'lsa ishlov beradi (true) */
export async function onWizardMessage(msg) {
  const w = getW(msg.from.id);
  if (!w || !STEPS[w.step]) return false;
  // Eskirgan suhbat (2 kundan ortiq) — unutiladi
  if (Date.now() - (w.at || 0) > 2 * 86400e3) {
    setW(msg.from.id, null);
    return false;
  }
  const step = STEPS[w.step];
  if (msg.photo || (msg.document && /^image\//.test(msg.document.mime_type || ''))) {
    if (w.step !== 'photos') return false; // boshqa paytda — to'lov cheki bo'lishi mumkin
    return (await addPhoto(msg, w), true);
  }
  if (msg.location && step.location) return (await advance(msg.chat.id, msg.from, w, step.location(w, msg.location)), true);
  const text = String(msg.text || '').trim();
  if (!text) return false;
  if (!step.text) {
    await send(msg.chat.id, 'Iltimos, yuqoridagi tugmalardan birini tanlang 👆');
    return true;
  }
  await advance(msg.chat.id, msg.from, w, step.text(w, text));
  return true;
}

/** Suhbatga yuborilgan surat → sayt media papkasiga */
async function addPhoto(msg, w) {
  if ((w.data.photos || []).length >= MAX_BDAY_PHOTOS) {
    if (!msg.media_group_id || msg.media_group_id !== w.lastGroup) await send(msg.chat.id, `Ko‘pi bilan ${MAX_BDAY_PHOTOS} ta surat. «✅ Tayyor» tugmasini bosing.`, kb([[{ text: '✅ Tayyor', callback_data: 'wz:photos:done' }]]));
    w.lastGroup = msg.media_group_id || '';
    setW(msg.from.id, w);
    return;
  }
  try {
    const id = msg.photo ? msg.photo.at(-1).file_id : msg.document.file_id;
    const name = saveBotPhoto(w.slug, await tgDownload(id));
    // Albomdagi suratlar ketma-ket keladi — holat har safar yangidan o'qiladi
    const cur = getW(msg.from.id) || w;
    cur.data.photos = [...(cur.data.photos || []), name];
    const n = cur.data.photos.length;
    const sameGroup = msg.media_group_id && msg.media_group_id === cur.lastGroup;
    cur.lastGroup = msg.media_group_id || '';
    setW(msg.from.id, cur);
    if (!sameGroup) await send(msg.chat.id, `✅ Surat qabul qilindi. Yana yuboring yoki «✅ Tayyor».`, kb([[{ text: '✅ Tayyor', callback_data: 'wz:photos:done' }]]));
    else if (n) {
      /* albom — bitta javob yetarli */
    }
  } catch (err) {
    await send(msg.chat.id, `⚠️ Suratni saqlab bo‘lmadi: ${esc(err.message)}. Boshqa surat yuboring.`);
  }
}

export const cancelWizard = (userId) => setW(userId, null);
export { prettyDate };
