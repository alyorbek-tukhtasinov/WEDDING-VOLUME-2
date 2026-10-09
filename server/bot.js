// Telegram bot (@taklifim): mijoz o'z taklifnomasini Mini App'da yaratadi, karta orqali to'laydi, chek yuboradi;
// admin bir tugma bilan tasdiqlaydi → sayt yig'iladi va mijozga havola yuboriladi.
//
// Alohida xizmat: taklifnoma-bot.service (node server/bot.js). Telegram'ga o'zi ulanadi (long polling) —
// webhook/nginx sozlamasi kerak emas. API bilan DATA_DIR orqali gaplashadi (server/data.js navbati).
//
// Muhit o'zgaruvchilari (/etc/taklifnoma/env): BOT_TOKEN, ADMIN_TG_IDS, PAY_CARD, PAY_CARD_HOLDER, PRICE,
// SUPPORT_CONTACT, (ixtiyoriy) PAY_NOTE, BOT_APP_URL, DRAFT_DAYS.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tg, tgUpload, BOT_TOKEN, adminIds, isAdmin, appUrl, siteUrlOf, siteDomain, PRICE, VIDEO_PRICE, fmtSum } from './telegram.js';
import { DATA_DIR, ensureDirs, listSites, readSite, writeSite, updateMeta, removeSite, takeQueue, sitesOf, STATUS, enqueue } from './data.js';
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
const namesOf = (c) => (c.couple?.showGroom === false || !c.couple?.groom ? c.couple?.bride || '' : `${c.couple.groom} & ${c.couple.bride}`);
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

const BTN = {
  create: '✨ Taklifnoma yaratish',
  mine: '📂 Mening taklifnomalarim',
  demos: '👀 Namunalar',
  help: '💬 Yordam',
};
const mainKeyboard = () => ({
  keyboard: [[appUrl() ? { text: BTN.create, web_app: { url: appUrl() } } : { text: BTN.create }], [{ text: BTN.mine }, { text: BTN.demos }], [{ text: BTN.help }]],
  resize_keyboard: true,
  is_persistent: true,
});
const appButton = (text, query = '') => ({ text, web_app: { url: `${appUrl()}${query}` } });

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
async function start(msg) {
  const name = esc(msg.from?.first_name || '');
  await send(
    msg.chat.id,
    `Assalomu alaykum${name ? `, ${name}` : ''}! 🌸\n\n` +
      `Bu yerda <b>to‘y taklifnomangizni o‘zingiz 5 daqiqada</b> yaratasiz — chiroyli sayt ko‘rinishida, musiqa, sana, xarita va mehmonlar javobi bilan.\n\n` +
      `1️⃣ <b>«${BTN.create}»</b> tugmasini bosing\n` +
      `2️⃣ Dizayn, ismlar, sana va to‘yxonani kiriting — natijani darhol ko‘rasiz\n` +
      `3️⃣ Yoqsa, to‘lov qilib chekni yuborasiz — sayt havolasi shu yerga keladi\n\n` +
      `💰 Narxi: <b>${fmtSum(PRICE())}</b>\n\n` +
      `Avval ${BTN.demos.toLowerCase()} bilan tanishib chiqishingiz mumkin 👇`,
    { reply_markup: mainKeyboard() },
  );
}

async function demos(msg) {
  const d = siteDomain();
  await send(msg.chat.id, '👀 <b>Namunalar</b> — ochib ko‘ring, yoqqanini tanlaysiz:', {
    reply_markup: {
      inline_keyboard: [
        ...DEMOS.map(([, title, slug]) => [{ text: title, url: d ? `https://${slug}.${d}` : 'https://t.me' }]),
        ...(appUrl() ? [[appButton(BTN.create)]] : []),
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
      `• Tayyor taklifnomani o‘zgartirish: «${BTN.mine}» → «✏️ Tahrirlash» — o‘zgarishlar 1 daqiqada saytda bo‘ladi\n` +
      `• Mehmonlar javoblari: «${BTN.mine}» → «📊 Javoblar»\n\n` +
      (contact ? `Savol bo‘lsa, yozing: ${esc(contact)}` : 'Savol bo‘lsa, shu yerga yozing — javob beramiz.'),
    { reply_markup: mainKeyboard() },
  );
}

function siteButtons(s) {
  const rows = [];
  if (s.meta.status === STATUS.paid) {
    rows.push([{ text: '🌐 Ochish', url: siteUrlOf(s.slug) }, ...(appUrl() ? [appButton('✏️ Tahrirlash', `?slug=${s.slug}`)] : [])]);
    rows.push([{ text: '📊 Javoblar', callback_data: `rsvp:${s.slug}` }]);
    const v = s.meta.video?.status;
    if (v === 'done') rows.push([{ text: '🎬 Videoni olish', callback_data: `vget:${s.slug}` }]);
    else if (!['paid', 'rendering', 'receipt'].includes(v) && !s.config.paused) rows.push([{ text: `🎬 Instagram uchun video — ${fmtSum(VIDEO_PRICE())}`, callback_data: `vbuy:${s.slug}` }]);
  } else {
    if (appUrl()) rows.push([appButton('✏️ Davom ettirish', `?slug=${s.slug}`)]);
    if (s.meta.status !== STATUS.receipt) rows.push([{ text: '💳 To‘lov qilish', callback_data: `pay:${s.slug}` }]);
  }
  return { inline_keyboard: rows };
}

async function mine(msg) {
  const list = sitesOf(msg.from.id).sort((a, b) => (a.meta.createdAt < b.meta.createdAt ? 1 : -1));
  if (!list.length) {
    return send(msg.chat.id, 'Sizda hali taklifnoma yo‘q. Keling, birinchisini yaratamiz! 👇', {
      reply_markup: appUrl() ? { inline_keyboard: [[appButton(BTN.create)]] } : mainKeyboard(),
    });
  }
  for (const s of list) {
    const ev = findEvent(s.config.eventType);
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

  const ev = findEvent(s.config.eventType);
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

/** Sayt HTTPS'da ochilguncha kutish (sertifikat 1–3 daqiqa) — ko'pi bilan ~5 daqiqa. */
async function waitLive(url) {
  if (env('BOT_SKIP_WAIT') === '1') return true; // sinovlar uchun
  for (let i = 0; i < 20; i++) {
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
    // Sertifikat kutilayotganda boshqa xabarlar to'xtab qolmasin
    waitLive(url).then(() =>
      send(
        s.meta.owner.id,
        `🎉 <b>Taklifnomangiz tayyor!</b>\n\n🔗 ${url}\n\nHavolani mehmonlaringizga Telegram yoki WhatsApp orqali yuboring.\n` +
          `O‘zgartirish kerak bo‘lsa — «✏️ Tahrirlash» tugmasi. Mehmonlar javoblari — «📊 Javoblar».`,
        { reply_markup: siteButtons(readSite(evt.slug) || s) },
      ),
    );
    await toAdmins(`🎉 ${esc(evt.slug)} faollashtirildi: ${url}`);
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
    p.stdout.on('data', (d) => (outText = (outText + d).slice(-2000)));
    p.stderr.on('data', (d) => (outText = (outText + d).slice(-2000)));
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
        log(`✖ ${evt.slug} video: ${r.out.slice(-400)}`);
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
      for (const chat of targets) await sendVideoTo(chat, evt.slug, { admin: !!evt.admin, file: out });
    }
  } finally {
    videoBusy = false;
  }
}

/** Tayyor videoni yuborish: avval yuborilgan bo'lsa — Telegram'dagi nusxasi (file_id), aks holda fayl */
async function sendVideoTo(chatId, slug, { admin = false, file = path.join(VIDEOS_DIR(), `${slug}.mp4`) } = {}) {
  const site = readSite(slug);
  const names = site ? namesOf(site.config) : slug;
  const caption = admin
    ? `🎬 ${esc(names)} — video tayyor (${slug})`
    : `🎬 <b>${esc(names)}</b> — taklifnomangiz videosi tayyor!\n\nInstagram Reels/Stories, Telegram yoki WhatsApp’da ulashing. Havola: ${siteUrlOf(slug)}`;
  const fileId = admin ? '' : site?.meta.video?.fileId;
  try {
    if (fileId) {
      await tg('sendVideo', { chat_id: chatId, video: fileId, caption, parse_mode: 'HTML', supports_streaming: true });
      return;
    }
    if (!fs.existsSync(file)) {
      if (site && !admin) queueVideo({ type: 'video', slug, notify: true });
      return send(chatId, '🎬 Video qayta tayyorlanmoqda — biroz kuting.');
    }
    const r = await tgUpload(
      'sendVideo',
      { chat_id: chatId, caption, parse_mode: 'HTML', supports_streaming: true, width: 1080, height: 1920, duration: admin ? undefined : Math.round(site?.meta.video?.seconds || 0) || undefined },
      { field: 'video', path: file, name: `${slug}.mp4` },
    );
    if (site && !admin && r?.video?.file_id) updateMeta(slug, (m) => ({ ...m, video: { ...m.video, fileId: r.video.file_id } }));
  } catch (err) {
    log(`! video yuborilmadi (${chatId}): ${err.message}`);
    await send(chatId, 'Videoni yuborishda xato bo‘ldi — admin tekshiryapti 🙏');
  }
}

/* ------------------------------------ Tozalash ------------------------------------ */
function cleanup(st) {
  if (Date.now() - (st.lastCleanup || 0) < 3600e3) return;
  st.lastCleanup = Date.now();
  // Video fayllari 30 kundan keyin o'chadi (Telegram'dagi nusxasi orqali qayta yuborish mumkin)
  try {
    for (const f of fs.existsSync(VIDEOS_DIR()) ? fs.readdirSync(VIDEOS_DIR()) : []) {
      const p = path.join(VIDEOS_DIR(), f);
      const stat = fs.statSync(p);
      if (stat.isFile() && Date.now() - stat.mtimeMs > 30 * 86400e3) fs.rmSync(p, { force: true });
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
    const [kind, slug] = String(cb.data || '').split(':');
    if ((kind === 'ok' || kind === 'no') && isAdmin(cb.from.id)) return onAdminDecision(cb, kind === 'ok', slug);
    if ((kind === 'vok' || kind === 'vno') && isAdmin(cb.from.id)) return onVideoDecision(cb, kind === 'vok', slug);
    if (kind === 'vbuy' || kind === 'vget') {
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      const s = readSite(slug);
      if (!s || String(s.meta.owner?.id) !== String(cb.from.id)) return;
      return kind === 'vget' ? sendVideoTo(cb.from.id, slug) : videoPayInstructions(cb.from.id, slug);
    }
    if (kind === 'pay') {
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});
      const s = readSite(slug);
      if (s && String(s.meta.owner?.id) === String(cb.from.id)) return payInstructions(cb.from.id, slug);
      return;
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
  if (text === '/start' || text.startsWith('/start ')) return start(msg);
  if (text === BTN.mine || text === '/mine') return mine(msg);
  if (text === BTN.demos || text === '/demos') return demos(msg);
  if (text === BTN.help || text === '/help') return help(msg);
  if (text === '/admin' && isAdmin(msg.from.id)) return adminStats(msg);
  if (text === BTN.create && !appUrl()) return send(msg.chat.id, 'Mini App manzili sozlanmagan (BOT_APP_URL).');
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
  log(`Bot: @${me.username} · ma'lumotlar: ${DATA_DIR()} · Mini App: ${appUrl() || '(yo‘q)'} · adminlar: ${adminIds().join(', ') || '(yo‘q!)'}`);
  await tg('deleteWebhook', {}).catch(() => {});
  await tg('setMyCommands', {
    commands: [
      { command: 'start', description: 'Bosh menyu' },
      { command: 'mine', description: 'Mening taklifnomalarim' },
      { command: 'demos', description: 'Namunalar' },
      { command: 'help', description: 'Yordam' },
    ],
  }).catch(() => {});
  if (appUrl()) await tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Taklifnoma', web_app: { url: appUrl() } } }).catch((e) => log('! menu tugmasi:', e.message));

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

export { onUpdate, processQueue };
