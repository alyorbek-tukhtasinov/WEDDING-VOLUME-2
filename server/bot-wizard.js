// Botda oddiy suhbat orqali taklifnoma yaratish (Mini App o'rniga): savollar birma-bir, tanlovlar — tugmalar.
// Oxirida — xulosa, "NAMUNA" belgili ko'rinish havolasi, "✏️ O'zgartirish" va "💳 To'lov qilish".
// Saqlash Mini App bilan bir xil qoidalar bo'yicha (app-api.js save) — to'lov, chek va yig'ish o'zgarmagan.
//
// Holat: <DATA_DIR>/wizard.json — { [userId]: { slug, step, data, edit } } (bot qayta ishga tushsa ham saqlanadi).
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, readSite, STATUS } from './data.js';
import { tg, previewUrl, siteUrlOf, siteDomain, fmtSum, PRICE } from './telegram.js';
import { save, APP_TEMPLATES } from './app-api.js';
import { EVENTS, findEvent } from '../src/lib/events.js';
import { parseMapInput, googleLink, yandexLink } from '../src/lib/maps.js';
import { MONTHS, validateConfig, isValidDate } from '../src/lib/config.js';
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
const designTitle = (id) => DESIGNS.find(([d]) => d === id)?.[1] || id;

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
    ask: () => ['📅 <b>Sana</b>\n\nKun.oy.yil ko‘rinishida yozing, masalan: <code>16.11.2026</code>'],
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
    ask: (w) => [`🏛 <b>${w.data.eventType === 'qiz-uzatish' || w.data.eventType === 'kelin-salom' ? 'Marosim joyi' : 'To‘yxona nomi'}</b>\n\nMasalan: <i>Bahor to‘yxonasi</i> yoki <i>Kelin xonadoni</i>`],
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

const ORDER = ['template', 'eventType', 'groom', 'bride', 'date', 'time', 'venue', 'address', 'map', 'voice', 'hosts'];

/* ------------------------------------ Config ↔ javoblar ------------------------------------ */
function dataOf(c) {
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
  };
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
  };
}

/* ------------------------------------ Oqim ------------------------------------ */
async function ask(chatId, w) {
  const [text, extra = {}] = STEPS[w.step].ask(w);
  await send(chatId, text, extra);
}
function nextStep(w, from) {
  for (let i = ORDER.indexOf(from) + 1; i < ORDER.length; i++) if (!STEPS[ORDER[i]].skip?.(w)) return ORDER[i];
  return null;
}

/** Yangi taklifnoma (tanlangan dizayn bilan — reklamadan kelganda) */
export async function startWizard(chatId, user, template = '') {
  const w = { slug: null, step: 'template', data: {}, edit: false };
  if (DESIGNS.some(([id]) => id === template)) {
    w.data.template = template;
    w.step = 'eventType';
    await send(chatId, `✨ Ajoyib! Dizayn: <b>${esc(designTitle(template))}</b>\nBir necha savolga javob bering — taklifnomangiz tayyor bo‘ladi (2–3 daqiqa).`);
  } else {
    await send(chatId, '✨ Bir necha savolga javob bering — taklifnomangiz tayyor bo‘ladi (2–3 daqiqa).\nIstalgan payt keyinroq o‘zgartirish mumkin.');
  }
  setW(user.id, w);
  await ask(chatId, w);
}

async function advance(chatId, user, w, res) {
  if (res !== true) return send(chatId, res);
  // Bitta maydonni o'zgartirish — darhol saqlanadi
  const next = w.edit ? (w.step === 'voice' && w.data.voice === 'parents' ? 'hosts' : null) : nextStep(w, w.step);
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
    r = await save(user, { ...(w.slug ? { slug: w.slug } : {}), config: inputOf(w.data) });
  } catch (err) {
    setW(user.id, null);
    return send(chatId, `⚠️ ${esc(err.message)}`);
  }
  setW(user.id, null);
  return showSummary(chatId, user, r.slug, w.slug ? '✅ Saqlandi.' : '🎉 Taklifnomangiz tayyor! Ko‘rib chiqing:');
}

/** Xulosa: ma'lumotlar, ko'rish havolasi va tugmalar */
export async function showSummary(chatId, user, slug, title = '') {
  const s = readSite(slug);
  if (!s || String(s.meta.owner?.id) !== String(user.id)) return send(chatId, 'Taklifnoma topilmadi.');
  const c = s.config;
  const d = dataOf(c);
  const paid = s.meta.status === STATUS.paid;
  const ev = findEvent(c.eventType);
  const lines = [
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
  ].filter((x) => x !== undefined);
  const errors = validateConfig(c);
  if (errors.length && !paid) lines.push('', `⚠️ To‘ldirilmagan: ${esc(errors[0])}`);
  if (!paid) lines.push('', `💰 Narxi: <b>${fmtSum(s.meta.price || PRICE())}</b> — avval ko‘rib chiqing, yoqsa to‘lov qilasiz.`);
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
];
async function editMenu(chatId, user, slug) {
  const s = readSite(slug);
  if (!s || String(s.meta.owner?.id) !== String(user.id)) return;
  const paid = s.meta.status === STATUS.paid;
  // To'langan saytda dizayn va marosim turi o'zgarmaydi (sayt boshidan qayta tuziladi)
  const items = EDITABLE.filter(([, , draftOnly]) => !(draftOnly && paid));
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
    setW(user.id, w);
    await ask(chatId, w);
    return true;
  }
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

export const cancelWizard = (userId) => setW(userId, null);
export { prettyDate };
