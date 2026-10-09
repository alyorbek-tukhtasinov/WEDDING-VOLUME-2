// Telegram bot (@taklifim): mijoz o'z taklifnomasini Mini App'da yaratadi, karta orqali to'laydi, chek yuboradi;
// admin bir tugma bilan tasdiqlaydi → sayt yig'iladi va mijozga havola yuboriladi.
//
// Alohida xizmat: taklifnoma-bot.service (node server/bot.js). Telegram'ga o'zi ulanadi (long polling) —
// webhook/nginx sozlamasi kerak emas. API bilan DATA_DIR orqali gaplashadi (server/data.js navbati).
//
// Muhit o'zgaruvchilari (/etc/taklifnoma/env): BOT_TOKEN, ADMIN_TG_IDS, PAY_CARD, PAY_CARD_HOLDER, PRICE,
// SUPPORT_CONTACT, (ixtiyoriy) PAY_NOTE, BOT_APP_URL, DRAFT_DAYS, MAIN_CHANNEL, REVIEWS_CHANNEL.
//
// Reklama havolalari: t.me/<bot>?start=<manba> — masalan ?start=ig_volume2 (manba + dizayn). Manba /admin'da
// statistikada ko'rinadi; oxiri shablon nomi bo'lsa (…_volume2), mijozga darhol shu dizayn ko'rsatiladi.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tg, tgUpload, BOT_TOKEN, adminIds, isAdmin, appUrl, siteUrlOf, siteDomain, PRICE, VIDEO_PRICE, fmtSum } from './telegram.js';
import { DATA_DIR, ensureDirs, listSites, readSite, writeSite, updateMeta, removeSite, takeQueue, sitesOf, STATUS, enqueue, recordLead, readLeads } from './data.js';
import { startWizard, onWizardCallback, onWizardMessage, cancelWizard, showSummary } from './bot-wizard.js';
import { validateConfig } from '../src/lib/config.js';
import { channelMenu, onChannelCallback, maybeAutoDraft, setBotName } from './channel.js';
import { requestContext } from '../api/_lib/context.js';
import { storeConfigured, storeReady, getFinance, setFinance, listEntries } from '../api/_lib/store.js';
import { findEvent } from '../src/lib/events.js';
import { MONTHS } from '../src/lib/config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (k, d = '') => (process.env[k] || d).trim();
const SITES_DIR = () => path.resolve(env('SITES_DIR', path.join(ROOT, 'sites')));
const STATE_FILE = () => path.join(DATA_DIR(), 'bot-state.json');
const DRAFT_DAYS = () => Number(env('DRAFT_DAYS', '10')) || 10;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/* ------------------------------------ Matnlar ------------------------------------ */
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const prettyDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  return y ? `${d}-${MONTHS[m - 1]} ${y}` : '';
};
const namesOf = (c) =>
  c.person?.name ? `${c.person.name} — tug‘ilgan kun` : c.couple?.showGroom === false || !c.couple?.groom ? c.couple?.bride || '' : `${c.couple.groom} & ${c.couple.bride}`;
const STATUS_TEXT = {
  draft: '📝 Tayyorlanmoqda',
  awaiting: '💳 To‘lov kutilmoqda',
  receipt: '🧾 Chek tekshirilmoqda',
  paid: '✅ Faol',
  rejected: '⚠️ Chek tasdiqlanmadi',
};

const VIDEO_TEXT = {
  'with-site': 'sayt bilan birga buyurtma qilingan',
  awaiting: 'to‘lov kutilmoqda',
  receipt: 'chek tekshirilmoqda',
  paid: 'navbatda',
  rendering: 'tayyorlanmoqda ⏳',
  done: 'tayyor ✅',
  failed: 'tayyorlashda muammo — admin tekshiryapti',
  rejected: 'chek tasdiqlanmadi',
};

// Telegram kanallar: asosiy va otzivlar (bot ikkalasida ham admin bo'lishi kerak — otzivlarni o'zi joylaydi)
const MAIN_CHANNEL = () => env('MAIN_CHANNEL', '@Taklifim_rasmiy');
const REVIEWS_CHANNEL = () => env('REVIEWS_CHANNEL', '@taklifimuzotziv');
const channelUrl = (c) => `https://t.me/${String(c).replace(/^@/, '')}`;
let BOT_USERNAME = '';

const BTN = {
  create: '✨ Taklifnoma yaratish',
  mine: '📂 Mening taklifnomalarim',
  demos: '👀 Namunalar',
  help: '💬 Yordam',
};
const mainKeyboard = () => ({
  // Taklifnoma oddiy suhbat orqali yaratiladi (Mini App mijozlarga tushunarsiz edi) — server/bot-wizard.js
  keyboard: [[{ text: BTN.create }], [{ text: BTN.mine }, { text: BTN.demos }], [{ text: BTN.help }]],
  resize_keyboard: true,
  is_persistent: true,
});

const DEMOS = [
  ['volume5', '💃 Our Story (raqsdagi juftlik)', 'demo-volume5'],
  ['volume3', '🌿 Yashil bog‘', 'demo-volume3'],
  ['volume4', '🌸 Pushti bog‘', 'demo-volume4'],
  ['osmon', '🌌 To‘y kechasining osmoni', 'demo-osmon'],
  ['volume2', '🕊 Klassik (oq-oltin)', 'demo'],
  ['suzani', '🪡 Suzani', 'demo-suzani'],
  ['bulut', '✈️ Bulutlar ustida', 'demo-bulut'],
  ['kitob', '📖 3D sehrli kitob', 'demo-kitob'],
  ['yz', '🎬 Kino uslubida', 'demo-yz'],
  ['klassik', '🎩 Tug‘ilgan kun: klassik bazm', 'demo-klassik'],
  ['tort', '🎂 Tug‘ilgan kun: sehrli tort', 'demo-tort'],
  ['yulduz', '✨ Tug‘ilgan kun: yulduzlardan', 'demo-yulduz'],
  ['sevgi', '💌 Tug‘ilgan kun: sevgi kundaligi', 'demo-sevgi'],
];

/* ------------------------------------ Holat ------------------------------------ */
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8'));
  } catch {
    return { offset: 0, lastCleanup: 0 };
  }
}
function saveState(st) {
  fs.writeFileSync(`${STATE_FILE()}.tmp`, JSON.stringify(st));
  fs.renameSync(`${STATE_FILE()}.tmp`, STATE_FILE());
}

async function send(chatId, text, extra = {}) {
  try {
    return await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
  } catch (err) {
    log(`! xabar yuborilmadi (${chatId}): ${err.message}`);
    return null;
  }
}
const toAdmins = (text, extra) => Promise.all(adminIds().map((id) => send(id, text, extra)));

/* ------------------------------------ Bo'limlar ------------------------------------ */
// "/start ig_volume2" → manba yoziladi; oxiri shablon nomi bo'lsa — o'sha dizayn
function templateOfPayload(p) {
  if (!p) return null;
  const ids = DEMOS.map(([id]) => id);
  return ids.find((id) => p === id || p.endsWith(`_${id}`) || p.endsWith(`-${id}`)) || null;
}

/* ------------------------------------ Majburiy obuna ------------------------------------ */
// Yangi foydalanuvchi (hali taklifnomasi yo'q) botdan foydalanishdan oldin MAIN_CHANNEL ga obuna bo'ladi.
// Mijozlar (taklifnomasi bor) va adminlar tekshirilmaydi; tekshirib bo'lmasa (bot kanalda admin emas) — o'tkaziladi.
const REQUIRE_SUB = () => env('REQUIRE_SUB', '1') !== '0';
const subOk = new Map(); // userId → shu vaqtgacha obuna deb hisoblanadi (har xabarda Telegram'dan so'ramaslik uchun)
const pendingStart = new Map(); // obunagacha bosilgan /start <manba> — obunadan keyin davom ettiriladi

async function isSubscribed(userId) {
  if ((subOk.get(String(userId)) || 0) > Date.now()) return true;
  try {
    const m = await tg('getChatMember', { chat_id: MAIN_CHANNEL(), user_id: userId });
    const ok = ['member', 'administrator', 'creator'].includes(m?.status) || (m?.status === 'restricted' && m.is_member);
    if (ok) subOk.set(String(userId), Date.now() + 30 * 60e3);
    return ok;
  } catch (err) {
    log(`! obunani tekshirib bo'lmadi (${MAIN_CHANNEL()}): ${err.message}`);
    return true;
  }
}
async function needsSub(user) {
  if (!REQUIRE_SUB() || !user?.id || isAdmin(user.id) || sitesOf(user.id).length) return false;
  return !(await isSubscribed(user.id));
}
async function askSub(chatId) {
  await send(
    chatId,
    `👋 Assalomu alaykum!\n\nBotdan foydalanish uchun avval kanalimizga obuna bo‘ling — u yerda barcha dizaynlar, namunalar va mijozlarimiz fikrlari bor 💌\n\n` +
      `Obuna bo‘lgach, <b>«✅ Obuna bo‘ldim»</b> tugmasini bosing.`,
    { reply_markup: { inline_keyboard: [[{ text: '📢 Kanalga o‘tish', url: channelUrl(MAIN_CHANNEL()) }], [{ text: '✅ Obuna bo‘ldim', callback_data: 'sub:check' }]] } },
  );
}

async function start(msg) {
  const payload = String(msg.text || '').split(/\s+/)[1] || '';
  if (recordLead(msg.from.id, payload) && payload) log(`➕ yangi mijoz: ${msg.from.id} (${payload})`);
  const name = esc(msg.from?.first_name || '');
  await send(
    msg.chat.id,
    `Assalomu alaykum${name ? `, ${name}` : ''}! 🌸\n\n` +
      `Bu yerda <b>to‘y taklifnomangizni o‘zingiz 5 daqiqada</b> yaratasiz — chiroyli sayt ko‘rinishida, musiqa, sana, xarita va mehmonlar javobi bilan.\n\n` +
      `1️⃣ <b>«${BTN.create}»</b> tugmasini bosing\n` +
      `2️⃣ Savollarga javob bering: dizayn, ismlar, sana, to‘yxona — <b>bepul ko‘rib chiqasiz</b>\n` +
      `3️⃣ Yoqsa, to‘lov qilib chekni yuborasiz — sayt havolasi shu yerga keladi\n\n` +
      `💰 Narxi: <b>${fmtSum(PRICE())}</b>\n\n` +
      `Avval ${BTN.demos.toLowerCase()} bilan tanishib chiqishingiz mumkin 👇\n\n` +
      `📢 Kanalimiz: ${MAIN_CHANNEL()}\n⭐ Mijozlar fikri: ${REVIEWS_CHANNEL()}`,
    { reply_markup: mainKeyboard() },
  );
  const t = templateOfPayload(payload.toLowerCase());
  if (t) await showDesign(msg.chat.id, t);
}

/** Reklamada ko'rgan dizayn: namunani ochish va shu dizaynda bepul yaratish */
async function showDesign(chatId, id) {
  const demo = DEMOS.find(([d]) => d === id);
  const d = siteDomain();
  if (!demo) return;
  const rows = [[{ text: '👀 Namunani ochish', url: d ? `https://${demo[2]}.${d}` : 'https://t.me' }]];
  rows.push([{ text: '✨ Shu dizaynda bepul yaratish', callback_data: `new:${id}` }]);
  await send(chatId, `Siz ko‘rgan dizayn: <b>${esc(demo[1])}</b>\n\nAvval namunani ochib ko‘ring. Ismlar, sana va to‘yxonangizni kiritsangiz — o‘z taklifnomangizni <b>bepul ko‘rib chiqasiz</b>, yoqsa to‘laysiz.`, {
    reply_markup: { inline_keyboard: rows },
  });
}

async function demos(msg) {
  const d = siteDomain();
  await send(msg.chat.id, '👀 <b>Namunalar</b> — ochib ko‘ring, yoqqanini tanlaysiz:', {
    reply_markup: {
      inline_keyboard: [
        ...DEMOS.map(([, title, slug]) => [{ text: title, url: d ? `https://${slug}.${d}` : 'https://t.me' }]),
        [{ text: BTN.create, callback_data: 'new:' }],
      ],
    },
  });
}

async function help(msg) {
  const contact = env('SUPPORT_CONTACT');
  await send(
    msg.chat.id,
    `💬 <b>Yordam</b>\n\n` +
      `• Taklifnoma yaratish: «${BTN.create}» tugmasi\n` +
      `• Tayyor taklifnomani o‘zgartirish: «${BTN.mine}» → «✏️ O‘zgartirish» — o‘zgarishlar 1 daqiqada saytda bo‘ladi\n` +
      `• Mehmonlar javoblari: «${BTN.mine}» → «📊 Javoblar»\n\n` +
      (contact ? `Savol bo‘lsa, yozing: ${esc(contact)}` : 'Savol bo‘lsa, shu yerga yozing — javob beramiz.'),
    { reply_markup: mainKeyboard() },
  );
}

function siteButtons(s) {
  const rows = [];
  if (s.meta.status === STATUS.paid) {
    rows.push([{ text: '🌐 Ochish', url: siteUrlOf(s.slug) }, { text: '✏️ O‘zgartirish', callback_data: `wz:menu:${s.slug}` }]);
    rows.push([{ text: '📊 Javoblar', callback_data: `rsvp:${s.slug}` }]);
    const v = s.meta.video?.status;
    if (v === 'done') rows.push([{ text: '🎬 Videoni olish', callback_data: `vget:${s.slug}` }]);
    else if (!['paid', 'rendering', 'receipt'].includes(v) && !s.config.paused) rows.push([{ text: `🎬 Instagram uchun video — ${fmtSum(VIDEO_PRICE())}`, callback_data: `vbuy:${s.slug}` }]);
  } else {
    rows.push([{ text: '👀 Ko‘rish / ✏️ Davom ettirish', callback_data: `wz:show:${s.slug}` }]);
    if (s.meta.status !== STATUS.receipt) rows.push([{ text: '💳 To‘lov qilish', callback_data: `pay:${s.slug}` }]);
  }
  return { inline_keyboard: rows };
}

async function mine(msg) {
  const list = sitesOf(msg.from.id).sort((a, b) => (a.meta.createdAt < b.meta.createdAt ? 1 : -1));
  if (!list.length) {
    return send(msg.chat.id, 'Sizda hali taklifnoma yo‘q. Keling, birinchisini yaratamiz! 👇', {
      reply_markup: { inline_keyboard: [[{ text: BTN.create, callback_data: 'new:' }]] },
    });
  }
  for (const s of list) {
    const ev = s.config.person ? { icon: '🎂', title: 'Tug‘ilgan kun' } : findEvent(s.config.eventType);
    await send(
      msg.chat.id,
      `${ev.icon} <b>${esc(namesOf(s.config))}</b>\n${esc(ev.title)} · ${prettyDate(s.config.event?.date)}${s.config.event?.time ? `, ${s.config.event.time}` : ''}\n` +
        `Holat: ${STATUS_TEXT[s.meta.status] || s.meta.status}${s.config.paused ? ' (to‘xtatilgan)' : ''}` +
        (s.meta.status === STATUS.paid ? `\n🔗 ${siteUrlOf(s.slug)}` : '') +
        (VIDEO_TEXT[s.meta.video?.status] ? `\n🎬 Video: ${VIDEO_TEXT[s.meta.video.status]}` : ''),
      { reply_markup: siteButtons(s) },
    );
  }
}

/* ------------------------------------ To'lov ------------------------------------ */
async function payInstructions(chatId, slug) {
  const s = readSite(slug);
  if (!s) return;
  if (s.meta.status === STATUS.paid) return send(chatId, `Bu taklifnoma allaqachon faol ✅\n🔗 ${siteUrlOf(slug)}`);
  if (s.meta.status !== STATUS.receipt) updateMeta(slug, (m) => ({ ...m, status: STATUS.awaiting, awaitingAt: new Date().toISOString() }));
  const card = env('PAY_CARD');
  const holder = env('PAY_CARD_HOLDER');
  const note = env('PAY_NOTE');
  const price = s.meta.price || PRICE();
  const withVideo = s.meta.video?.status === 'with-site';
  const total = price + (withVideo ? s.meta.video.price || VIDEO_PRICE() : 0);
  await send(
    chatId,
    `💳 <b>To‘lov</b> — ${esc(namesOf(s.config))}\n\n` +
      (withVideo ? `Taklifnoma: ${fmtSum(price)}\n🎬 Instagram video: ${fmtSum(s.meta.video.price || VIDEO_PRICE())}\n` : '') +
      `Summa: <b>${fmtSum(total)}</b>\n` +
      (card ? `Karta: <code>${esc(card)}</code>\n` : '') +
      (holder ? `Egasi: ${esc(holder)}\n` : '') +
      (note ? `\n${esc(note)}\n` : '') +
      `\nTo‘lov qilganingizdan keyin <b>chek rasmini (skrinshot) shu chatga yuboring</b> 📸\n` +
      `Tasdiqlangach, saytingiz havolasi darhol shu yerga keladi.`,
    { reply_markup: mainKeyboard() },
  );
}

/** Instagram video (to'langan saytga alohida xizmat) — to'lov ko'rsatmasi */
async function videoPayInstructions(chatId, slug) {
  const s = readSite(slug);
  if (!s || s.meta.status !== STATUS.paid) return;
  const v = s.meta.video || {};
  if (['paid', 'rendering'].includes(v.status)) return send(chatId, '🎬 Videongiz tayyorlanmoqda — tayyor bo‘lishi bilan shu yerga yuboramiz.');
  if (v.status === 'done') return sendVideoTo(chatId, slug);
  updateMeta(slug, (m) => ({ ...m, video: { ...(m.video || {}), status: 'awaiting', price: m.video?.price || VIDEO_PRICE(), orderedAt: m.video?.orderedAt || new Date().toISOString(), awaitingAt: new Date().toISOString() } }));
  const card = env('PAY_CARD');
  const holder = env('PAY_CARD_HOLDER');
  await send(
    chatId,
    `🎬 <b>Instagram uchun video</b> — ${esc(namesOf(s.config))}\n\n` +
      `Saytingiz musiqa bilan boshidan oxirigacha o‘zi aylanadigan video (1080×1920, Reels/Stories uchun tayyor).\n\n` +
      `Summa: <b>${fmtSum(VIDEO_PRICE())}</b>\n` +
      (card ? `Karta: <code>${esc(card)}</code>\n` : '') +
      (holder ? `Egasi: ${esc(holder)}\n` : '') +
      `\nTo‘lov qilib, <b>chek rasmini shu chatga yuboring</b> 📸 — tasdiqlangach video 10–20 daqiqada tayyor bo‘ladi.`,
    { reply_markup: mainKeyboard() },
  );
}

async function onReceipt(msg) {
  const userId = msg.from.id;
  // Kutilayotgan to'lovlar: sayt yoki video — eng oxirgi so'ralgani
  const waiting = [];
  for (const s of sitesOf(userId)) {
    if ([STATUS.awaiting, STATUS.rejected, STATUS.receipt].includes(s.meta.status)) waiting.push({ s, kind: 'site', at: s.meta.awaitingAt || s.meta.updatedAt });
    if (['awaiting', 'rejected', 'receipt'].includes(s.meta.video?.status) && s.meta.status === STATUS.paid) waiting.push({ s, kind: 'video', at: s.meta.video.awaitingAt || s.meta.video.orderedAt });
  }
  waiting.sort((a, b) => (a.at < b.at ? 1 : -1));
  if (!waiting.length) {
    return send(msg.chat.id, 'Hozir to‘lov kutilayotgan taklifnoma yo‘q. Avval taklifnomani yarating va «💳 To‘lov qilish»ni bosing 🙂', { reply_markup: mainKeyboard() });
  }
  const { s, kind } = waiting[0];
  const photo = msg.photo?.at(-1)?.file_id;
  const doc = msg.document?.file_id;
  const receipt = { fileId: photo || doc, kind: photo ? 'photo' : 'document', at: new Date().toISOString(), messageId: msg.message_id };
  if (kind === 'video') return onVideoReceipt(msg, s, receipt);
  updateMeta(s.slug, (m) => ({ ...m, status: STATUS.receipt, receipt }));
  await send(msg.chat.id, '🧾 Chek qabul qilindi! Tekshirib, tez orada tasdiqlaymiz. Odatda bu bir necha daqiqa oladi ⏳', { reply_markup: mainKeyboard() });

  const ev = s.config.person ? { icon: '🎂', title: 'Tug‘ilgan kun' } : findEvent(s.config.eventType);
  const owner = s.meta.owner || {};
  const caption =
    `🧾 <b>Yangi to‘lov cheki</b>\n\n` +
    `${ev.icon} ${esc(namesOf(s.config))} — ${esc(ev.title)}\n` +
    `📅 ${prettyDate(s.config.event?.date)} · ${esc(s.config.venue?.name || '')}\n` +
    `💰 ${fmtSum((s.meta.price || PRICE()) + (s.meta.video?.status === 'with-site' ? s.meta.video.price || VIDEO_PRICE() : 0))}` +
    (s.meta.video?.status === 'with-site' ? ' (sayt + 🎬 video)' : '') +
    `\n👤 ${esc(owner.name || '')}${owner.username ? ` (@${esc(owner.username)})` : ''} · ID <code>${owner.id}</code>\n` +
    `🔗 ${s.slug}.${siteDomain()}`;
  const keyboard = { inline_keyboard: [[{ text: '✅ Tasdiqlash', callback_data: `ok:${s.slug}` }, { text: '❌ Rad etish', callback_data: `no:${s.slug}` }]] };
  for (const id of adminIds()) {
    try {
      if (receipt.kind === 'photo') await tg('sendPhoto', { chat_id: id, photo: receipt.fileId, caption, parse_mode: 'HTML', reply_markup: keyboard });
      else await tg('sendDocument', { chat_id: id, document: receipt.fileId, caption, parse_mode: 'HTML', reply_markup: keyboard });
    } catch (err) {
      log(`! adminga chek yuborilmadi (${id}): ${err.message}`);
    }
  }
}

async function onVideoReceipt(msg, s, receipt) {
  updateMeta(s.slug, (m) => ({ ...m, video: { ...m.video, status: 'receipt', receipt } }));
  await send(msg.chat.id, '🧾 Video uchun chek qabul qilindi! Tasdiqlangach, video tayyorlanadi ⏳', { reply_markup: mainKeyboard() });
  const owner = s.meta.owner || {};
  const caption =
    `🧾 <b>🎬 Video uchun chek</b>\n\n${esc(namesOf(s.config))}\n💰 ${fmtSum(s.meta.video?.price || VIDEO_PRICE())}\n` +
    `👤 ${esc(owner.name || '')}${owner.username ? ` (@${esc(owner.username)})` : ''} · ID <code>${owner.id}</code>\n🔗 ${siteUrlOf(s.slug)}`;
  const keyboard = { inline_keyboard: [[{ text: '✅ Tasdiqlash', callback_data: `vok:${s.slug}` }, { text: '❌ Rad etish', callback_data: `vno:${s.slug}` }]] };
  for (const id of adminIds()) {
    try {
      if (receipt.kind === 'photo') await tg('sendPhoto', { chat_id: id, photo: receipt.fileId, caption, parse_mode: 'HTML', reply_markup: keyboard });
      else await tg('sendDocument', { chat_id: id, document: receipt.fileId, caption, parse_mode: 'HTML', reply_markup: keyboard });
    } catch (err) {
      log(`! adminga video cheki yuborilmadi (${id}): ${err.message}`);
    }
  }
}

async function onVideoDecision(cb, ok, slug) {
  const s = readSite(slug);
  const answer = (text, alert = false) => tg('answerCallbackQuery', { callback_query_id: cb.id, text, show_alert: alert }).catch(() => {});
  if (!s) return answer('Sayt topilmadi', true);
  const caption = `${cb.message?.caption || cb.message?.text || ''}\n\n${ok ? '✅ Tasdiqlandi' : '❌ Rad etildi'} — ${esc(cb.from.first_name || 'admin')}`;
  const mark = () =>
    (cb.message?.caption != null
      ? tg('editMessageCaption', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, caption, parse_mode: 'HTML' })
      : tg('editMessageText', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: caption, parse_mode: 'HTML' })
    ).catch(() => {});
  if (ok) {
    if (['paid', 'rendering', 'done'].includes(s.meta.video?.status)) return answer('Allaqachon tasdiqlangan');
    updateMeta(slug, (m) => ({ ...m, video: { ...m.video, status: 'paid', paidAt: new Date().toISOString() } }));
    await recordFinance(slug, (s.meta.price || PRICE()) + (s.meta.video?.price || VIDEO_PRICE()), '+ video');
    enqueue({ type: 'video', slug, notify: true });
    await mark();
    await answer('Tasdiqlandi — video tayyorlanmoqda');
    await send(s.meta.owner.id, '✅ To‘lov tasdiqlandi! 🎬 Videongiz tayyorlanmoqda — odatda 10–20 daqiqa. Tayyor bo‘lishi bilan shu yerga yuboramiz.');
  } else {
    updateMeta(slug, (m) => ({ ...m, video: { ...m.video, status: 'rejected' } }));
    await mark();
    await answer('Rad etildi');
    await send(s.meta.owner.id, '⚠️ Video uchun chekni tasdiqlay olmadik. Summa va kartani tekshirib, <b>to‘g‘ri chekni qayta yuboring</b>.');
  }
}

async function recordFinance(slug, amount, noteExtra = '') {
  if (!storeConfigured()) return;
  try {
    await requestContext.run({ slug: 'boshqaruv', adminPassword: '' }, async () => {
      const cur = (await getFinance())?.items || {};
      const note = cur[slug]?.note || 'Telegram bot';
      const items = { ...cur, [slug]: { ...(cur[slug] || {}), amount, paid: true, note: noteExtra && !note.includes(noteExtra) ? `${note} ${noteExtra}` : note } };
      await setFinance({ items, updatedAt: new Date().toISOString() });
    });
  } catch (err) {
    log(`! daromad yozilmadi: ${err.message}`);
  }
}

async function onAdminDecision(cb, ok, slug) {
  const s = readSite(slug);
  const who = esc(cb.from.first_name || 'admin');
  const mark = async (line) => {
    const caption = `${cb.message?.caption || cb.message?.text || ''}\n\n${line}`;
    try {
      if (cb.message?.caption != null) await tg('editMessageCaption', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, caption, parse_mode: 'HTML' });
      else await tg('editMessageText', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: caption, parse_mode: 'HTML' });
    } catch {
      /* xabar o'zgarmagan bo'lishi mumkin */
    }
  };
  if (!s) {
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Sayt topilmadi (o‘chirilgan bo‘lishi mumkin)', show_alert: true });
    return;
  }
  if (ok) {
    if (s.meta.status === STATUS.paid) {
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Allaqachon tasdiqlangan' });
      return;
    }
    const withVideo = s.meta.video?.status === 'with-site';
    updateMeta(slug, (m) => ({
      ...m,
      status: STATUS.paid,
      paidAt: new Date().toISOString(),
      approvedBy: cb.from.id,
      ...(withVideo ? { video: { ...m.video, status: 'paid', paidAt: new Date().toISOString() } } : {}),
    }));
    await recordFinance(slug, (s.meta.price || PRICE()) + (withVideo ? s.meta.video.price || VIDEO_PRICE() : 0), withVideo ? '+ video' : '');
    enqueue({ type: 'build', slug, reason: 'paid', notify: true });
    await mark(`✅ Tasdiqlandi — ${who}`);
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Tasdiqlandi — sayt yig‘ilmoqda' });
    await send(s.meta.owner.id, '✅ To‘lovingiz tasdiqlandi! Saytingiz tayyorlanmoqda — 1–2 daqiqada havolani yuboramiz 🎉');
  } else {
    updateMeta(slug, (m) => ({ ...m, status: STATUS.rejected, rejectedAt: new Date().toISOString() }));
    await mark(`❌ Rad etildi — ${who}`);
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Rad etildi' });
    const contact = env('SUPPORT_CONTACT');
    await send(
      s.meta.owner.id,
      '⚠️ Afsuski, chekni tasdiqlay olmadik. Iltimos, to‘lov summasi va kartani tekshirib, <b>to‘g‘ri chekni qayta yuboring</b>.' +
        (contact ? `\nSavol bo‘lsa: ${esc(contact)}` : ''),
    );
  }
}

/* ------------------------------------ Javoblar (RSVP) ------------------------------------ */
async function rsvpSummary(chatId, slug, userId) {
  const s = readSite(slug);
  if (!s || (String(s.meta.owner?.id) !== String(userId) && !isAdmin(userId))) return send(chatId, 'Sayt topilmadi');
  if (!storeConfigured()) return send(chatId, 'Javoblar bazasi ulanmagan.');
  const entries = await requestContext.run({ slug, adminPassword: '' }, async () => (storeReady() ? listEntries() : [])).catch(() => []);
  const yes = entries.filter((e) => e.attending === 'yes');
  const no = entries.filter((e) => e.attending === 'no');
  const guests = yes.reduce((n, e) => n + (e.guests || 1), 0);
  const wishes = entries.filter((e) => e.message?.trim()).slice(-8).reverse();
  await send(
    chatId,
    `📊 <b>${esc(namesOf(s.config))}</b> — mehmonlar javoblari\n\n` +
      `✅ Keladi: <b>${yes.length}</b> ta javob (${guests} kishi)\n` +
      `❌ Kela olmaydi: <b>${no.length}</b>\n` +
      (yes.length ? `\n<b>Keladiganlar:</b>\n${yes.slice(-30).map((e) => `• ${esc(e.name)}${e.guests > 1 ? ` (+${e.guests - 1})` : ''}`).join('\n')}\n` : '') +
      (wishes.length ? `\n💌 <b>Oxirgi tilaklar:</b>\n${wishes.map((e) => `— <i>${esc(e.message.slice(0, 200))}</i> (${esc(e.name)})`).join('\n')}` : ''),
  );
}

/* ------------------------------------ Yig'ish navbati ------------------------------------ */
function runBuild(slug) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(ROOT, 'scripts', 'build-one.js'), slug], {
      cwd: ROOT,
      env: { ...process.env, SITE_DOMAIN: siteDomain(), NODE_OPTIONS: '--max-old-space-size=512' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => p.kill('SIGKILL'), 240e3);
    p.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, out: out.trim().slice(-1500) });
    });
  });
}

/** Ishlab turgan versiyadagi sites/<nom> → yig'ilgan bot sayti (yangi sayt darhol ochilishi uchun). */
function linkLive(slug) {
  const link = path.join(SITES_DIR(), slug);
  try {
    if (fs.existsSync(path.join(link, 'index.html'))) return;
    fs.rmSync(link, { recursive: true, force: true });
    fs.symlinkSync(path.join(DATA_DIR(), 'built', slug), link);
    // HTTPS sertifikati yangi manzilga ham olinsin (deploy taymeri web.sh ni darhol ishga tushiradi)
    const trigger = env('DEPLOY_TRIGGER');
    if (trigger) fs.writeFileSync(trigger, `${Date.now()}\n`);
  } catch (err) {
    log(`! sites/${slug} ulanmadi: ${err.message}`);
  }
}

/**
 * Sayt HTTPS'da haqiqatan ochilguncha kutish (sertifikat 1–3 daqiqa, deploy ketayotgan bo'lsa ko'proq) —
 * ko'pi bilan ~12 daqiqa. Har urinishda havola qayta tekshiriladi: shu payt deploy yangi versiyaga
 * o'tgan bo'lsa, sayt yangi versiya papkasiga qayta ulanadi (aks holda nginx 404 beradi).
 */
async function waitLive(url, slug) {
  if (env('BOT_SKIP_WAIT') === '1') return true; // sinovlar uchun
  for (let i = 0; i < 48; i++) {
    if (slug) linkLive(slug);
    try {
      const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
      if (r.ok) return true;
    } catch {
      /* hali tayyor emas */
    }
    await new Promise((r) => setTimeout(r, 15e3));
  }
  return false;
}

/** To'langan bot saytlari joriy versiyada ulanganmi — deploy'dan keyin tushib qolganlari qayta ulanadi (har daqiqada). */
function relinkAll(st) {
  if (Date.now() - (st.lastRelink || 0) < 60e3) return;
  st.lastRelink = Date.now();
  for (const s of listSites()) {
    if (s.meta.status !== STATUS.paid) continue;
    if (!fs.existsSync(path.join(DATA_DIR(), 'built', s.slug, 'index.html'))) continue;
    if (fs.existsSync(path.join(SITES_DIR(), s.slug, 'index.html'))) continue;
    linkLive(s.slug);
    log(`↺ ${s.slug} joriy versiyaga qayta ulandi`);
  }
}

let busy = false;
const pending = [];
async function processQueue() {
  pending.push(...takeQueue());
  if (busy) return;
  busy = true;
  try {
    while (pending.length) {
      const evt = pending.shift();
      try {
        if (evt.type === 'pay') await payInstructions(evt.chatId, evt.slug);
        else if (evt.type === 'videopay') await videoPayInstructions(evt.chatId, evt.slug);
        else if (evt.type === 'videosend') await sendVideoTo(evt.chatId, evt.slug);
        else if (evt.type === 'video') queueVideo(evt);
        else if (evt.type === 'build') await handleBuild(evt);
        else if (evt.type === 'notify' && evt.chatId) await send(evt.chatId, evt.text);
      } catch (err) {
        log(`! navbat (${evt.type} ${evt.slug || ''}): ${err.message}`);
      }
    }
  } finally {
    busy = false;
  }
}

async function handleBuild(evt) {
  // Bir sayt uchun ketma-ket kelgan yig'ish so'rovlari bittaga qisqaradi
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].type === 'build' && pending[i].slug === evt.slug) {
      evt.notify ||= pending[i].notify;
      pending.splice(i, 1);
    }
  }
  const s = readSite(evt.slug);
  if (!s || s.meta.status !== STATUS.paid) return;
  const t0 = Date.now();
  const r = await runBuild(evt.slug);
  if (!r.ok) {
    log(`✖ ${evt.slug} yig'ilmadi: ${r.out}`);
    await toAdmins(`⚠️ <b>${esc(evt.slug)}</b> yig‘ilmadi:\n<code>${esc(r.out.slice(-800))}</code>`);
    if (evt.notify) await send(s.meta.owner.id, 'Saytni tayyorlashda kichik muammo chiqdi — admin tekshiryapti, tez orada havolani yuboramiz 🙏');
    return;
  }
  log(`✔ ${evt.slug} yig'ildi (${((Date.now() - t0) / 1000).toFixed(1)} s, ${evt.reason || ''})`);
  linkLive(evt.slug);
  // Sayt bilan birga buyurtma qilingan video — sayt tayyor bo'lgach
  if (readSite(evt.slug)?.meta.video?.status === 'paid') queueVideo({ type: 'video', slug: evt.slug, notify: true });
  if (evt.notify) {
    const url = siteUrlOf(evt.slug);
    // Havola faqat sayt haqiqatan ochilgandan keyin yuboriladi (mijozga ham, adminga ham).
    // Sertifikat kutilayotganda boshqa xabarlar to'xtab qolmasin — alohida kutiladi.
    await toAdmins(`⏳ ${esc(evt.slug)} yig‘ildi — sayt ochilishi tekshirilmoqda…`);
    waitLive(url, evt.slug).then(async (live) => {
      if (!live) {
        await toAdmins(`⚠️ ${esc(evt.slug)} 12 daqiqada ham ochilmadi: ${url}\nTekshiring: <code>journalctl -u taklifnoma-deploy -n 50</code>`);
        await send(s.meta.owner.id, 'Saytingiz deyarli tayyor — texnik tekshiruv ketmoqda, havolani tez orada yuboramiz 🙏');
        return;
      }
      await send(
        s.meta.owner.id,
        `🎉 <b>Taklifnomangiz tayyor!</b>\n\n🔗 ${url}\n\nHavolani mehmonlaringizga Telegram yoki WhatsApp orqali yuboring.\n` +
          `O‘zgartirish kerak bo‘lsa — «${BTN.mine}» → «✏️ O‘zgartirish». Mehmonlar javoblari — «📊 Javoblar».`,
        { reply_markup: siteButtons(readSite(evt.slug) || s) },
      );
      await toAdmins(`🎉 ${esc(evt.slug)} ochildi: ${url}`);
    });
  }
}

/* ------------------------------------ Video (Instagram) ------------------------------------ */
// Alohida navbat: video uzoq (10–20 daqiqa) tayyorlanadi — sayt yig'ish va boshqa xabarlar kutib qolmaydi.
const VIDEOS_DIR = () => path.join(DATA_DIR(), 'videos');
const videoQueue = [];
let videoBusy = false;

// Panel (admin) so'rovlari diskda ham saqlanadi: deploy paytida bot qayta ishga tushsa, video yo'qolmaydi
const ADMIN_PENDING = () => path.join(VIDEOS_DIR(), 'admin-pending');
const adminPendingFile = (slug) => path.join(ADMIN_PENDING(), `${slug}.json`);

function queueVideo(evt) {
  if (evt.admin && /^[a-z0-9-]+$/.test(evt.slug || '')) {
    fs.mkdirSync(ADMIN_PENDING(), { recursive: true });
    fs.writeFileSync(adminPendingFile(evt.slug), JSON.stringify({ slug: evt.slug, at: evt.at || new Date().toISOString() }));
  }
  if (videoQueue.some((e) => e.slug === evt.slug && !!e.admin === !!evt.admin)) return;
  videoQueue.push(evt);
  processVideos();
}

function runRender(slug, out) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(ROOT, 'scripts', 'render-video.js'), slug, '--out', out], {
      cwd: ROOT,
      env: { ...process.env, VIDEO_TMP: path.join(DATA_DIR(), 'tmp') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let outText = '';
    p.stdout.on('data', (d) => (outText = (outText + d).slice(-8000)));
    p.stderr.on('data', (d) => (outText = (outText + d).slice(-8000)));
    const timer = setTimeout(() => p.kill('SIGKILL'), 60 * 60e3);
    p.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, out: outText.trim() });
    });
  });
}

async function processVideos() {
  if (videoBusy) return;
  videoBusy = true;
  try {
    while (videoQueue.length) {
      const evt = videoQueue.shift();
      // Admin (panel) so'rovi mijozning video holatiga tegmaydi — alohida fayl, faqat adminlarga
      const site = evt.admin ? null : readSite(evt.slug);
      fs.mkdirSync(VIDEOS_DIR(), { recursive: true });
      const out = path.join(VIDEOS_DIR(), evt.admin ? `admin-${evt.slug}.mp4` : `${evt.slug}.mp4`);
      if (site) updateMeta(evt.slug, (m) => ({ ...m, video: { ...(m.video || {}), status: 'rendering', startedAt: new Date().toISOString() } }));
      const t0 = Date.now();
      log(`🎬 ${evt.slug}: video tayyorlanmoqda…`);
      if (evt.admin) await toAdmins(`🎬 <b>${esc(evt.slug)}</b>: video tayyorlanmoqda (odatda 10–20 daqiqa), tayyor bo‘lgach shu yerga yuboriladi.`).catch(() => {});
      const r = await runRender(evt.slug, out);
      if (evt.admin) fs.rmSync(adminPendingFile(evt.slug), { force: true });
      if (!r.ok || !fs.existsSync(out)) {
        // Xato matnining o'zi (stack izi emas) — "✖ ..." qatoridan boshlab
        const i = r.out.lastIndexOf('✖');
        const why = (i > -1 ? r.out.slice(i) : r.out.slice(-600)).slice(0, 600);
        r.out = why;
        log(`✖ ${evt.slug} video: ${why}`);
        if (site) updateMeta(evt.slug, (m) => ({ ...m, video: { ...m.video, status: 'failed' } }));
        await toAdmins(`⚠️ <b>${esc(evt.slug)}</b> videosi tayyorlanmadi:\n<code>${esc(r.out.slice(-600))}</code>`);
        if (site && evt.notify) await send(site.meta.owner.id, 'Videoni tayyorlashda muammo chiqdi — admin tekshiryapti, tez orada yuboramiz 🙏');
        if (evt.admin) await toAdmins(`(panel so‘rovi: ${esc(evt.slug)})`);
        continue;
      }
      const seconds = Number((/— ([\d.]+) s video/.exec(r.out) || [])[1]) || 0;
      log(`✔ ${evt.slug} video tayyor (${seconds} s, ${((Date.now() - t0) / 60e3).toFixed(1)} daqiqada)`);
      if (site) updateMeta(evt.slug, (m) => ({ ...m, video: { ...m.video, status: 'done', seconds, doneAt: new Date().toISOString(), fileId: '' } }));
      // Panel'dan (admin) so'ralgan — adminlarga; mijoz buyurtmasi — mijozga
      const targets = evt.admin ? adminIds() : site ? [site.meta.owner.id] : adminIds();
      // Fayl bir marta yuklanadi, qolganlarga Telegram'dagi nusxasi; yuborilgach serverdan o'chiriladi (joy tejash)
      let sentId = '';
      for (const chat of targets) sentId = (await sendVideoTo(chat, evt.slug, { admin: !!evt.admin, file: out, fileId: sentId })) || sentId;
      if (sentId) fs.rmSync(out, { force: true });
    }
  } finally {
    videoBusy = false;
  }
}

/** Tayyor videoni yuborish: avval yuborilgan bo'lsa — Telegram'dagi nusxasi (file_id), aks holda fayl */
/** Muvaffaqiyatli yuborilsa — Telegram'dagi file_id (keyingi yuborishlar uchun), aks holda '' */
async function sendVideoTo(chatId, slug, { admin = false, file = path.join(VIDEOS_DIR(), `${slug}.mp4`), fileId: knownId = '' } = {}) {
  const site = readSite(slug);
  const names = site ? namesOf(site.config) : slug;
  const caption = admin
    ? `🎬 ${esc(names)} — video tayyor (${slug})`
    : `🎬 <b>${esc(names)}</b> — taklifnomangiz videosi tayyor!\n\nInstagram Reels/Stories, Telegram yoki WhatsApp’da ulashing. Havola: ${siteUrlOf(slug)}`;
  const fileId = knownId || (admin ? '' : site?.meta.video?.fileId);
  try {
    if (fileId) {
      await tg('sendVideo', { chat_id: chatId, video: fileId, caption, parse_mode: 'HTML', supports_streaming: true });
      return fileId;
    }
    if (!fs.existsSync(file)) {
      if (site && !admin) queueVideo({ type: 'video', slug, notify: true });
      await send(chatId, '🎬 Video qayta tayyorlanmoqda — biroz kuting.');
      return '';
    }
    const r = await tgUpload(
      'sendVideo',
      { chat_id: chatId, caption, parse_mode: 'HTML', supports_streaming: true, width: 1080, height: 1920, duration: admin ? undefined : Math.round(site?.meta.video?.seconds || 0) || undefined },
      { field: 'video', path: file, name: `${slug}.mp4` },
    );
    if (site && !admin && r?.video?.file_id) updateMeta(slug, (m) => ({ ...m, video: { ...m.video, fileId: r.video.file_id } }));
    return r?.video?.file_id || '';
  } catch (err) {
    log(`! video yuborilmadi (${chatId}): ${err.message}`);
    await send(chatId, 'Videoni yuborishda xato bo‘ldi — admin tekshiryapti 🙏');
    return '';
  }
}

/* ------------------------------------ Otzivlar ------------------------------------ */
// To'ydan 1–7 kun o'tib (soat 10–20 da) egasidan baho va fikr so'raladi → admin ✅ bosadi → otzivlar kanaliga.
const tashkentHour = () => (new Date().getUTCHours() + 5) % 24;
const daysSince = (iso) => Math.floor((Date.now() - new Date(`${iso}T00:00:00+05:00`).getTime()) / 86400e3);

async function askReviews(st, { anyHour = false } = {}) {
  if (Date.now() - (st.lastReviewAsk || 0) < 3600e3) return;
  st.lastReviewAsk = Date.now();
  const h = tashkentHour();
  if (!anyHour && (h < 10 || h >= 20)) return;
  for (const s of listSites()) {
    if (s.meta.status !== STATUS.paid || s.meta.review || !s.meta.owner?.id) continue;
    const days = daysSince(s.config.event?.date || '');
    if (!(days >= 1 && days <= 7)) continue;
    updateMeta(s.slug, (m) => ({ ...m, review: { status: 'asked', askedAt: new Date().toISOString() } }));
    await send(
      s.meta.owner.id,
      `🎉 <b>${esc(namesOf(s.config))}</b> — muborak bo‘lsin! Baxtli bo‘ling 🤍\n\nTaklifnomamiz sizga yoqdimi? Iltimos, baholang:`,
      { reply_markup: { inline_keyboard: [[1, 2, 3, 4, 5].map((n) => ({ text: `${n}⭐`, callback_data: `rv:${s.slug}:${n}` }))] } },
    );
  }
}

async function onReviewRating(cb, slug, n) {
  await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Rahmat!' }).catch(() => {});
  const s = readSite(slug);
  const rating = Math.min(5, Math.max(1, Number(n) || 0));
  if (!s || String(s.meta.owner?.id) !== String(cb.from.id) || !rating || !['asked', 'rated'].includes(s.meta.review?.status)) return;
  updateMeta(slug, (m) => ({ ...m, review: { ...m.review, status: 'rated', rating } }));
  if (cb.message) await tg('editMessageReplyMarkup', { chat_id: cb.from.id, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
  await send(
    cb.from.id,
    `${'⭐'.repeat(rating)} — rahmat!\n\nBir-ikki so‘z bilan fikringizni yozing: mehmonlarga yoqdimi, nimasi esda qoldi? ` +
      (rating >= 4 ? 'Fikringiz ismingiz bilan otzivlar kanalimizda chiqishi mumkin.' : 'Nimani yaxshilashimiz kerak — shuni ham yozing, albatta inobatga olamiz.'),
    { reply_markup: { inline_keyboard: [[{ text: '⏭ Yozmayman', callback_data: `rvskip:${slug}` }]] } },
  );
}

/** Egasi fikr yozdi (yoki o'tkazib yubordi) → adminlarga tasdiqlash uchun */
async function submitReview(userId, slug, text = '') {
  const s = readSite(slug);
  if (!s || s.meta.review?.status !== 'rated') return;
  const r = { ...s.meta.review, text: String(text).slice(0, 700), status: 'pending', at: new Date().toISOString() };
  updateMeta(slug, (m) => ({ ...m, review: r }));
  await send(userId, 'Rahmat! Fikringiz biz uchun juda qadrli 🌸', { reply_markup: mainKeyboard() });
  const head = `⭐ <b>Otziv</b> — ${esc(namesOf(s.config))} (${esc(s.meta.owner?.name || '')})\n${'⭐'.repeat(r.rating)}${r.text ? `\n\n«${esc(r.text)}»` : ''}`;
  if (r.rating >= 4) {
    await toAdmins(head, { reply_markup: { inline_keyboard: [[{ text: '✅ Kanalga joylash', callback_data: `rvok:${slug}` }, { text: '❌ Joylamaslik', callback_data: `rvno:${slug}` }]] } });
  } else {
    updateMeta(slug, (m) => ({ ...m, review: { ...m.review, status: 'private' } }));
    await toAdmins(`${head}\n\n⚠️ Past baho — kanalga chiqmaydi. Mijoz bilan bog‘laning: <code>${s.meta.owner?.id}</code>`);
  }
}

async function onReviewDecision(cb, ok, slug) {
  const s = readSite(slug);
  const r = s?.meta.review;
  if (!r || r.status !== 'pending') return tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Allaqachon hal qilingan' }).catch(() => {});
  let note = '❌ Joylanmadi';
  if (ok) {
    const owner = String(s.meta.owner?.name || '').split(' ')[0] || 'Mijozimiz';
    const ev = s.config.person ? { icon: '🎂', title: 'Tug‘ilgan kun' } : findEvent(s.config.eventType);
    const text =
      `${'⭐'.repeat(r.rating)}\n\n` +
      (r.text ? `«${esc(r.text)}»\n\n` : '') +
      `— <b>${esc(owner)}</b>, ${esc(ev.title.replace(/\s*\(.*\)/, '').toLowerCase())} taklifnomasi\n\n` +
      `✨ O‘zingiz uchun: ${BOT_USERNAME ? `@${BOT_USERNAME}` : ''}`;
    try {
      await tg('sendMessage', { chat_id: REVIEWS_CHANNEL(), text, parse_mode: 'HTML', disable_web_page_preview: true });
      note = `✅ Kanalga joylandi (${REVIEWS_CHANNEL()})`;
    } catch (err) {
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: `Joylanmadi: bot ${REVIEWS_CHANNEL()} kanalida admin emas`, show_alert: true }).catch(() => {});
      return;
    }
  }
  updateMeta(slug, (m) => ({ ...m, review: { ...m.review, status: ok ? 'posted' : 'rejected', decidedAt: new Date().toISOString() } }));
  await tg('answerCallbackQuery', { callback_query_id: cb.id, text: note }).catch(() => {});
  if (cb.message) {
    await tg('editMessageText', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: `${cb.message.text}\n\n${note}` }).catch(() => {});
  }
}

/* ------------------------------------ Tozalash ------------------------------------ */
function cleanup(st) {
  if (Date.now() - (st.lastCleanup || 0) < 3600e3) return;
  st.lastCleanup = Date.now();
  // Video yuborilgach darhol o'chiriladi; yuborilmay qolgan fayllar 1 kundan keyin (qayta yuborish — Telegram'dagi nusxasi orqali)
  try {
    for (const f of fs.existsSync(VIDEOS_DIR()) ? fs.readdirSync(VIDEOS_DIR()) : []) {
      const p = path.join(VIDEOS_DIR(), f);
      const stat = fs.statSync(p);
      if (stat.isFile() && Date.now() - stat.mtimeMs > 86400e3) fs.rmSync(p, { force: true });
    }
  } catch {
    /* keyingi safar */
  }
  const limit = Date.now() - DRAFT_DAYS() * 86400e3;
  for (const s of listSites()) {
    if ([STATUS.paid, STATUS.receipt].includes(s.meta.status)) continue;
    if (new Date(s.meta.updatedAt || s.meta.createdAt).getTime() < limit) {
      removeSite(s.slug);
      log(`tozalandi: ${s.slug} (${DRAFT_DAYS()} kundan beri to'lanmagan qoralama)`);
    }
  }
}

/* ------------------------------------ Admin ------------------------------------ */
/** Reklama manbalari (oxirgi 30 kun): botga kelganlar → taklifnoma boshlaganlar → to'laganlar */
function sourceStats(all) {
  const since = Date.now() - 30 * 86400e3;
  const rows = {};
  const row = (k) => (rows[k] ||= { leads: 0, sites: 0, paid: 0 });
  for (const l of Object.values(readLeads())) if (new Date(l.at).getTime() >= since) row(l.src).leads++;
  for (const s of all) {
    if (new Date(s.meta.createdAt || 0).getTime() < since) continue;
    const r = row(s.meta.source || 'organik');
    r.sites++;
    if (s.meta.status === STATUS.paid) r.paid++;
  }
  const list = Object.entries(rows).sort((a, b) => b[1].leads - a[1].leads || b[1].paid - a[1].paid);
  if (!list.length) return '';
  return (
    `📈 <b>Manbalar (30 kun)</b> — keldi → boshladi → to‘ladi:\n` +
    list.slice(0, 12).map(([k, r]) => `• ${esc(k)}: ${r.leads} → ${r.sites} → <b>${r.paid}</b>`).join('\n') +
    `\n<i>Reklama havolasi: t.me/${BOT_USERNAME || 'bot'}?start=ig_volume2</i>\n\n`
  );
}

async function adminStats(msg) {
  const all = listSites();
  const by = (st) => all.filter((s) => s.meta.status === st);
  const receipts = by(STATUS.receipt);
  const vReceipts = all.filter((s) => s.meta.video?.status === 'receipt');
  const vWork = all.filter((s) => ['paid', 'rendering'].includes(s.meta.video?.status)).length;
  await send(
    msg.chat.id,
    `🛠 <b>Bot saytlari</b>\n\n` +
      `✅ Faol: ${by(STATUS.paid).length}\n🧾 Chek tekshiruvda: ${receipts.length}\n💳 To‘lov kutilmoqda: ${by(STATUS.awaiting).length}\n` +
      `📝 Qoralama: ${by(STATUS.draft).length}\n⚠️ Rad etilgan: ${by(STATUS.rejected).length}\n` +
      `🎬 Video: ${all.filter((s) => s.meta.video?.status === 'done').length} tayyor, ${vWork} navbatda, ${vReceipts.length} chek tekshiruvda\n\n` +
      sourceStats(all) +
      `Barcha imkoniyatlar — boshqaruv panelida: https://boshqaruv.${siteDomain()}`,
    receipts.length || vReceipts.length
      ? {
          reply_markup: {
            inline_keyboard: [
              ...receipts.slice(0, 10).map((s) => [{ text: `✅ ${namesOf(s.config)}`, callback_data: `ok:${s.slug}` }, { text: '❌', callback_data: `no:${s.slug}` }]),
              ...vReceipts.slice(0, 10).map((s) => [{ text: `✅ 🎬 ${namesOf(s.config)}`, callback_data: `vok:${s.slug}` }, { text: '❌', callback_data: `vno:${s.slug}` }]),
            ],
          },
        }
      : {},
  );
}

/* ------------------------------------ Yangilanishlar ------------------------------------ */
async function onUpdate(u) {
  if (u.callback_query) {
    const cb = u.callback_query;
    if (await onWizardCallback(cb)) return;
    if (await onChannelCallback(cb)) return;
    if (cb.data === 'sub:check') {
      subOk.delete(String(cb.from.id));
      if (!(await isSubscribed(cb.from.id))) {
        return tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Hali obuna bo‘lmagansiz — avval «📢 Kanalga o‘tish» ni bosing 🙂', show_alert: true }).catch(() => {});
      }
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Rahmat! 🌸' }).catch(() => {});
      if (cb.message) await tg('deleteMessage', { chat_id: cb.from.id, message_id: cb.message.message_id }).catch(() => {});
      const text = pendingStart.get(String(cb.from.id)) || '/start';
      pendingStart.delete(String(cb.from.id));
      return start({ chat: { id: cb.from.id }, from: cb.from, text });
    }
    if (await needsSub(cb.from)) {
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      return askSub(cb.from.id);
    }
    const [kind, slug] = String(cb.data || '').split(':');
    if (kind === 'new') {
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      return startWizard(cb.from.id, cb.from, slug || '');
    }
    if ((kind === 'ok' || kind === 'no') && isAdmin(cb.from.id)) return onAdminDecision(cb, kind === 'ok', slug);
    if ((kind === 'vok' || kind === 'vno') && isAdmin(cb.from.id)) return onVideoDecision(cb, kind === 'vok', slug);
    if (kind === 'rv') return onReviewRating(cb, slug, String(cb.data).split(':')[2]);
    if (kind === 'rvskip') {
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      const s = readSite(slug);
      if (s && String(s.meta.owner?.id) === String(cb.from.id)) return submitReview(cb.from.id, slug, '');
      return;
    }
    if ((kind === 'rvok' || kind === 'rvno') && isAdmin(cb.from.id)) return onReviewDecision(cb, kind === 'rvok', slug);
    if (kind === 'vbuy' || kind === 'vget') {
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      const s = readSite(slug);
      if (!s || String(s.meta.owner?.id) !== String(cb.from.id)) return;
      return kind === 'vget' ? sendVideoTo(cb.from.id, slug) : videoPayInstructions(cb.from.id, slug);
    }
    if (kind === 'pay') {
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      const s = readSite(slug);
      if (!s || String(s.meta.owner?.id) !== String(cb.from.id)) return;
      const errors = s.meta.status === STATUS.paid ? [] : validateConfig(s.config);
      if (errors.length) return send(cb.from.id, `⚠️ Avval to‘ldiring: ${esc(errors[0])}\n«✏️ O‘zgartirish» tugmasidan foydalaning.`);
      return payInstructions(cb.from.id, slug);
    }
    if (kind === 'rsvp') {
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      return rsvpSummary(cb.from.id, slug, cb.from.id);
    }
    return tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
  }
  const msg = u.message;
  if (!msg || msg.chat?.type !== 'private') return;
  const text = (msg.text || '').trim();
  // Reklama manbasi obunadan oldin ham yoziladi (keyin yo'qolmasin)
  if (text === '/start' || text.startsWith('/start ')) recordLead(msg.from.id, text.split(/\s+/)[1] || '');
  if (await needsSub(msg.from)) {
    if (text.startsWith('/start')) pendingStart.set(String(msg.from.id), text);
    return askSub(msg.chat.id);
  }
  // Tug'ilgan kun suratlari (suhbat "suratlar" bosqichida) — aks holda to'lov cheki
  if ((msg.photo || msg.document) && (await onWizardMessage(msg))) return;
  if (msg.photo || msg.document) return onReceipt(msg);
  // Mini App'dan to'lovga o'tish (Telegram.WebApp.sendData) — zaxira yo'l
  if (msg.web_app_data?.data) {
    try {
      const d = JSON.parse(msg.web_app_data.data);
      if (d.pay) return payInstructions(msg.chat.id, d.pay);
    } catch {
      /* noma'lum */
    }
    return;
  }
  if (text === '/start' || text.startsWith('/start ')) {
    cancelWizard(msg.from.id);
    return start(msg);
  }
  if (text === BTN.mine || text === '/mine') return mine(msg);
  if (text === BTN.demos || text === '/demos') return demos(msg);
  if (text === BTN.help || text === '/help') return help(msg);
  if (text === '/admin' && isAdmin(msg.from.id)) return adminStats(msg);
  // Asosiy kanal: boshlang'ich postlar va yangi post qoralamasi (faqat admin)
  if (text === '/kanal' && isAdmin(msg.from.id)) return channelMenu(msg.chat.id);
  if (text === '/post' && isAdmin(msg.from.id)) return onChannelCallback({ id: '', from: msg.from, data: 'ch:new:-', message: null });
  if (text === BTN.create || text === '/new') return startWizard(msg.chat.id, msg.from);
  // Savollarga javob (taklifnoma yaratish/o'zgartirish suhbati)
  if (await onWizardMessage(msg)) return;
  // Otziv matni (baho qo'yilgandan keyin)
  if (text) {
    const rv = sitesOf(msg.from.id).find((s) => s.meta.review?.status === 'rated');
    if (rv) return submitReview(msg.chat.id, rv.slug, text);
  }
  // Boshqa matn — adminlarga yuboriladi (mijoz savoli)
  if (text && !isAdmin(msg.from.id)) {
    await toAdmins(`💬 <b>${esc(msg.from.first_name || '')}</b>${msg.from.username ? ` (@${esc(msg.from.username)})` : ''} · <code>${msg.from.id}</code>:\n${esc(text.slice(0, 1500))}`);
    return send(msg.chat.id, 'Xabaringiz adminga yetkazildi — tez orada javob beramiz 🙂', { reply_markup: mainKeyboard() });
  }
  // Admin javobi: xabarga "reply" qilib yozsa — mijozga yetkaziladi
  if (text && isAdmin(msg.from.id) && msg.reply_to_message) {
    // Telegram "reply"da HTML'siz matn keladi: "… · 555:" (savol) yoki "ID 555" (chek)
    const m = /ID (?:<code>)?(\d+)|· (?:<code>)?(\d+)(?:<\/code>)?:/.exec(msg.reply_to_message.text || msg.reply_to_message.caption || '');
    const target = m?.[1] || m?.[2];
    if (target) {
      await send(target, `💬 <b>Admin:</b> ${esc(text)}`);
      return send(msg.chat.id, '✓ Yuborildi');
    }
  }
}

/* ------------------------------------ Asosiy sikl ------------------------------------ */
async function main() {
  if (!BOT_TOKEN()) {
    console.error('BOT_TOKEN berilmagan — /etc/taklifnoma/env ga yozing va: sudo systemctl restart taklifnoma-bot');
    process.exit(0);
  }
  ensureDirs();
  // Yangilanish (deploy) paytida to'xtab qolgan yig'ishlar — qaytadan
  for (const s of listSites()) {
    if (s.meta.status === STATUS.paid && !fs.existsSync(path.join(DATA_DIR(), 'built', s.slug, 'index.html'))) enqueue({ type: 'build', slug: s.slug, reason: 'restart' });
    else if (s.meta.status === STATUS.paid && ['paid', 'rendering'].includes(s.meta.video?.status)) enqueue({ type: 'video', slug: s.slug, notify: true });
  }
  // Panel'dan so'ralgan, lekin qayta ishga tushish sabab tugamay qolgan videolar — qaytadan
  if (fs.existsSync(ADMIN_PENDING())) {
    for (const f of fs.readdirSync(ADMIN_PENDING()).filter((n) => n.endsWith('.json'))) enqueue({ type: 'video', slug: f.slice(0, -5), admin: true });
  }
  fs.rmSync(path.join(DATA_DIR(), 'tmp'), { recursive: true, force: true }); // to'xtab qolgan video qoldiqlari
  const st = loadState();
  const me = await tg('getMe');
  BOT_USERNAME = me.username || '';
  setBotName(BOT_USERNAME);
  log(`Bot: @${me.username} · ma'lumotlar: ${DATA_DIR()} · adminlar: ${adminIds().join(', ') || '(yo‘q!)'}`);
  await tg('deleteWebhook', {}).catch(() => {});
  await tg('setMyCommands', {
    commands: [
      { command: 'start', description: 'Bosh menyu' },
      { command: 'new', description: 'Taklifnoma yaratish' },
      { command: 'mine', description: 'Mening taklifnomalarim' },
      { command: 'demos', description: 'Namunalar' },
      { command: 'help', description: 'Yordam' },
    ],
  }).catch(() => {});
  // Menyu tugmasi — buyruqlar ro'yxati (Mini App ishlatilmaydi)
  await tg('setChatMenuButton', { menu_button: { type: 'commands' } }).catch((e) => log('! menu tugmasi:', e.message));

  // Navbat: API yozgan hodisalar (har 2 soniyada)
  setInterval(() => processQueue().catch((e) => log('! navbat:', e.message)), 2000);

  let stop = false;
  const quit = () => {
    stop = true;
    setTimeout(() => process.exit(0), 1500);
  };
  process.on('SIGTERM', quit);
  process.on('SIGINT', quit);

  let backoff = 1000;
  while (!stop) {
    try {
      const updates = await tg('getUpdates', { offset: st.offset, timeout: 50, allowed_updates: ['message', 'callback_query'] }, { timeoutMs: 65e3 });
      backoff = 1000;
      for (const u of updates) {
        st.offset = u.update_id + 1;
        await onUpdate(u).catch((e) => log('! xabar:', e.message));
      }
      if (updates.length) saveState(st);
      cleanup(st);
      relinkAll(st);
      if (Date.now() - (st.lastChannelCheck || 0) > 3600e3) {
        st.lastChannelCheck = Date.now();
        await maybeAutoDraft().catch((e) => log('! kanal:', e.message));
      }
      await askReviews(st).catch((e) => log('! otziv:', e.message));
    } catch (err) {
      if (stop) break;
      log(`! getUpdates: ${err.message}`);
      await new Promise((r) => setTimeout(r, err.retryAfter ? err.retryAfter * 1000 : backoff));
      backoff = Math.min(backoff * 2, 30e3);
    }
  }
}

const isMain = () => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};
if (process.argv[1] && isMain()) main();

export { onUpdate, processQueue, askReviews };
