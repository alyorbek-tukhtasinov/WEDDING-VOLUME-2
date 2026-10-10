// Mijozlar bilan ishlash (admin) va to'lanmagan taklifnomalar uchun avtomatik eslatmalar.
//
//   • /mijozlar — mijozlar ro'yxati holat bo'yicha (qoralama, to'lov kutilmoqda, chek, to'lagan, faqat kirganlar);
//     har bir mijoz kartasi: xabar yozish, eslatma yuborish, 24 soatlik chegirma, to'lov ma'lumotini yuborish.
//   • /xabar — ommaviy xabar (matn, rasm, video…) tanlangan guruhga; avval ko'rib, keyin tasdiqlanadi.
//   • Eslatmalar (FOLLOWUP=0 — o'chirish): to'lanmagan taklifnoma egasiga 3 bosqichda, Toshkent 9:00–21:00 da:
//       1) oxirgi o'zgarishdan ~2 soat keyin — "taklifnomangiz tayyor, bir qadam qoldi";
//       2) yana ~22 soatdan keyin — 24 soatlik maxsus chegirma (FOLLOWUP_DISCOUNT, standart 10 000);
//       3) yana ~46 soatdan keyin — oxirgi, yordam taklifi bilan.
//     To'lagan (yoki chek yuborgan) mijozga eslatma ketmaydi; bir egasining faqat oxirgi qoralamasi eslatiladi.
//
// Holat: <DATA_DIR>/crm.json — adminning joriy amali (kimga yozyapti / qaysi guruhga xabar). Eslatma bosqichi — meta.followup.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, listSites, readSite, updateMeta, readLeads, markLeadBlocked, promoAmount, STATUS } from './data.js';
import { tg, adminIds, isAdmin, previewUrl, siteUrlOf, fmtSum } from './telegram.js';
import { validateConfig, MONTHS } from '../src/lib/config.js';
import { findEvent } from '../src/lib/events.js';

const env = (k, d = '') => (process.env[k] || d).trim();
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const FOLLOWUP = () => env('FOLLOWUP', '1') !== '0';
const PROMO = () => Math.max(0, Number(env('FOLLOWUP_DISCOUNT', '10000').replace(/\D/g, '')) || 0);
const PAGE = 10;
const HOUR = 3600e3;
const STAGE_AFTER = [2 * HOUR, 22 * HOUR, 46 * HOUR]; // 1-bosqich — oxirgi o'zgarishdan, keyingilari — oldingi eslatmadan

// bot.js dan: send, siteTotal, payInstructions, namesOf, log (aylana import bo'lmasligi uchun)
let D = null;
export const setupCrm = (deps) => (D = deps);

/* ------------------------------------ Yordamchilar ------------------------------------ */
const tashkentHour = (t = Date.now()) => (new Date(t).getUTCHours() + 5) % 24;
const fmtWhen = (t) => {
  const d = new Date(t + 5 * HOUR); // Toshkent vaqti
  return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}, soat ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
const firstName = (owner) => String(owner?.name || '').split(/\s+/)[0] || '';
const evOf = (c) => (c.person ? { icon: '🎂', title: 'Tug‘ilgan kun' } : findEvent(c.eventType));
const prettyDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  return y ? `${d}-${MONTHS[m - 1]} ${y}` : '';
};
const daysLeft = (c) => {
  const t = Date.parse(`${c.event?.date || ''}T00:00:00+05:00`);
  return Number.isFinite(t) ? Math.ceil((t - Date.now()) / 86400e3) : null;
};
const urgency = (c) => {
  const n = daysLeft(c);
  if (!n || n < 1) return '';
  const what = c.person ? 'Bayramingizga' : 'To‘yingizga';
  if (n <= 21) return `\n⏳ ${what} <b>${n} kun</b> qoldi — mehmonlar rejalarini oldindan tuzishadi, taklifnomani ertaroq yuborgan ma’qul.`;
  return `\n📅 ${what} ${n} kun qoldi — taklifnomani erta yuborsangiz, mehmonlar o‘sha kunni band qilib qo‘yishadi.`;
};
const STATUS_ICON = { draft: '📝', awaiting: '💳', receipt: '🧾', paid: '✅', rejected: '⚠️' };
const isUnpaid = (s) => [STATUS.draft, STATUS.awaiting].includes(s.meta.status);

async function tryTg(method, body) {
  try {
    return { ok: true, res: await tg(method, body) };
  } catch (err) {
    const blocked = /blocked|deactivated|chat not found|user is deactivated/i.test(err.message) || err.code === 403;
    return { ok: false, blocked, err };
  }
}

/* ------------------------------------ Eslatmalar ------------------------------------ */
function followupMessage(s, stage) {
  const c = s.config;
  const name = firstName(s.meta.owner);
  const hi = name ? `${esc(name)}, ` : '';
  const ready = !validateConfig(c).length;
  const ev = evOf(c);
  const names = D.namesOf(c).replace(/^\s*&\s*|\s*&\s*$/g, '').trim();
  const what = `${ev.icon} ${names ? `<b>${esc(names)}</b> — ` : ''}${esc(ev.title)}${c.event?.date ? ` · ${prettyDate(c.event.date)}` : ''}`;
  const view = previewUrl(s.slug);
  const btnView = view ? [{ text: '👀 Taklifnomani ko‘rish', url: view }] : null;
  const btnPay = [{ text: stage === 2 && promoAmount(s.meta) ? `💳 ${fmtSum(D.siteTotal(s))} ga to‘lash` : '💳 To‘lov qilish', callback_data: `pay:${s.slug}` }];
  const btnGo = [{ text: '✏️ Davom ettirish', callback_data: `wz:show:${s.slug}` }];
  const kb = (...rows) => ({ reply_markup: { inline_keyboard: rows.filter(Boolean) } });

  if (stage === 1) {
    if (!ready) {
      const miss = [...new Set(validateConfig(c).map((e) => /\(([^)]+)\)/.exec(e)?.[1] || ''))].filter(Boolean).slice(0, 3).join(', ');
      return [
        `✍️ <b>${hi}taklifnomangiz deyarli tayyor!</b>\n\n${what}\n\nFaqat bir nechta ma’lumot qoldi${miss ? `: <b>${esc(miss)}</b>` : ''}. ` +
          `1 daqiqada tugatamiz — keyin tayyor taklifnomangizni darhol ko‘rasiz 👇`,
        kb(btnGo),
      ];
    }
    return [
      `💌 <b>${hi}taklifnomangiz tayyor turibdi!</b>\n\n${what}\n\n` +
        `Mehmonlaringiz havolani ochishi bilan taklifnoma jonlanadi — bunday taklifni ular uzoq eslab qolishadi ✨\n\n` +
        `Faqat <b>bitta qadam</b> qoldi: to‘lovdan keyin sayt havolasi <b>1 daqiqada</b> keladi va uni darhol Telegram yoki WhatsApp orqali yuborasiz.` +
        urgency(c),
      kb(btnView, btnPay),
    ];
  }
  if (stage === 2) {
    const promo = promoAmount(s.meta);
    if (!promo) return followupMessage(s, 3);
    const full = D.siteTotal(s) + promo;
    return [
      `🎁 <b>${hi}siz uchun maxsus sovg‘a!</b>\n\n${what}\n\n` +
        `Taklifnomangizga <b>${fmtSum(promo)} chegirma</b> — faqat 24 soat:\n<s>${fmtSum(full)}</s> → <b>${fmtSum(full - promo)}</b>\n\n` +
        `⏰ Taklif <b>${fmtWhen(Date.parse(s.meta.promo.until))}</b> gacha amal qiladi.` +
        urgency(c),
      kb(btnView, ready ? btnPay : btnGo),
    ];
  }
  const proof = listSites().filter((x) => x.meta.status === STATUS.paid && Date.now() - Date.parse(x.meta.paidAt || 0) < 30 * 86400e3).length;
  return [
    `🤍 <b>${hi}taklifnomangiz hali ham sizni kutyapti</b>\n\n${what}\n\n` +
      `Biror narsa yoqmadimi yoki savolingiz bormi? <b>Shu yerga yozing</b> — admin shaxsan javob beradi va istagingizga moslab beradi.` +
      (proof >= 5 ? `\n\n💍 Shu oyda <b>${proof} ta</b> oila taklifnomasini biz bilan yaratdi.` : '') +
      urgency(c),
    kb(btnView, ready ? btnPay : btnGo),
  ];
}

/** Eslatma yuborish (stage: 1–3). Chegirma bosqichida chegirma shu yerda beriladi. */
async function sendFollowup(s, stage, { manual = false } = {}) {
  if (stage === 2 && PROMO() && !promoAmount(s.meta)) {
    updateMeta(s.slug, (m) => ({ ...m, promo: { amount: PROMO(), until: new Date(Date.now() + 24 * HOUR).toISOString(), by: manual ? 'admin' : 'eslatma' } }));
    s = readSite(s.slug);
  }
  const [text, extra] = followupMessage(s, stage);
  const r = await tryTg('sendMessage', { chat_id: s.meta.owner.id, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
  updateMeta(s.slug, (m) => ({
    ...m,
    followup: { ...(m.followup || {}), stage: Math.max(m.followup?.stage || 0, stage), at: new Date().toISOString(), ...(r.blocked ? { blocked: true } : {}) },
  }));
  if (r.blocked) markLeadBlocked(s.meta.owner.id);
  return r;
}

/** Har 10 daqiqada chaqiriladi (bot.js asosiy sikli) */
export async function runFollowups(st, { now = Date.now(), force = false } = {}) {
  if (!FOLLOWUP() || !D) return;
  if (!force && now - (st.lastFollowup || 0) < 10 * 60e3) return;
  st.lastFollowup = now;
  const h = tashkentHour(now);
  if (!force && (h < 9 || h >= 21)) return;
  const all = listSites();
  const paidOwners = new Set(all.filter((s) => [STATUS.paid, STATUS.receipt].includes(s.meta.status)).map((s) => String(s.meta.owner?.id)));
  // Har bir egasining eng oxirgi to'lanmagan taklifnomasi
  const latest = new Map();
  for (const s of all) {
    const id = String(s.meta.owner?.id || '');
    if (!id || !isUnpaid(s) || paidOwners.has(id) || isAdmin(id)) continue;
    const prev = latest.get(id);
    if (!prev || String(s.meta.createdAt) > String(prev.meta.createdAt)) latest.set(id, s);
  }
  const sent = [];
  for (const s of latest.values()) {
    const f = s.meta.followup || {};
    if (f.blocked || (f.stage || 0) >= 3) continue;
    const stage = (f.stage || 0) + 1;
    const since = Date.parse(stage === 1 ? s.meta.updatedAt || s.meta.createdAt : f.at);
    if (!(now - since >= STAGE_AFTER[stage - 1])) continue;
    const r = await sendFollowup(s, stage);
    if (r.ok) sent.push(`${stage}) ${esc(D.namesOf(s.config))}`);
    else D.log(`! eslatma yuborilmadi (${s.slug}): ${r.err?.message}`);
  }
  if (sent.length) {
    for (const id of adminIds()) {
      await tryTg('sendMessage', { chat_id: id, text: `📨 <b>Eslatmalar yuborildi (${sent.length})</b>\n${sent.join('\n')}\n\nBatafsil: /mijozlar`, parse_mode: 'HTML' });
    }
  }
}

/* ------------------------------------ Admin holati ------------------------------------ */
const crmFile = () => path.join(DATA_DIR(), 'crm.json');
function loadCrm() {
  try {
    return JSON.parse(fs.readFileSync(crmFile(), 'utf8'));
  } catch {
    return {};
  }
}
function setMode(adminId, mode) {
  const all = loadCrm();
  if (mode) all[String(adminId)] = { ...mode, at: Date.now() };
  else delete all[String(adminId)];
  fs.mkdirSync(DATA_DIR(), { recursive: true });
  fs.writeFileSync(`${crmFile()}.tmp`, JSON.stringify(all));
  fs.renameSync(`${crmFile()}.tmp`, crmFile());
}
const getMode = (adminId) => {
  const m = loadCrm()[String(adminId)];
  return m && Date.now() - m.at < 6 * HOUR ? m : null;
};

/* ------------------------------------ Guruhlar ------------------------------------ */
const SEGMENTS = {
  draft: '📝 Qoralamalar',
  awaiting: '💳 To‘lov kutilmoqda',
  receipt: '🧾 Chek tekshiruvda',
  paid: '✅ To‘laganlar',
  lead: '👤 Faqat kirganlar',
};
function data() {
  const sites = listSites().filter((s) => s.meta.owner?.id && !isAdmin(s.meta.owner.id));
  const leads = readLeads();
  const owners = new Set(sites.map((s) => String(s.meta.owner.id)));
  return { sites, leads, owners };
}
function segmentItems(seg, d = data()) {
  if (seg === 'lead') {
    return Object.entries(d.leads)
      .filter(([id]) => !d.owners.has(id) && !isAdmin(id))
      .sort((a, b) => (String(a[1].at) < String(b[1].at) ? 1 : -1))
      .map(([id, l]) => ({ kind: 'lead', id, l }));
  }
  const want = seg === 'awaiting' ? [STATUS.awaiting, STATUS.rejected] : [seg];
  return d.sites
    .filter((s) => want.includes(s.meta.status))
    .sort((a, b) => (String(a.meta.createdAt) < String(b.meta.createdAt) ? 1 : -1))
    .map((s) => ({ kind: 'site', s }));
}
/** Ommaviy xabar oluvchilari (bloklaganlarsiz) */
function audience(seg) {
  const d = data();
  const blocked = (id) => d.leads[id]?.blocked;
  let ids = [];
  if (seg === 'all') ids = [...new Set([...Object.keys(d.leads), ...d.owners])];
  else if (seg === 'lead') ids = Object.keys(d.leads).filter((id) => !d.owners.has(id));
  else {
    const paid = new Set(d.sites.filter((s) => s.meta.status === STATUS.paid).map((s) => String(s.meta.owner.id)));
    if (seg === 'paid') ids = [...paid];
    if (seg === 'unpaid') ids = [...new Set(d.sites.filter((s) => s.meta.status !== STATUS.paid && !paid.has(String(s.meta.owner.id))).map((s) => String(s.meta.owner.id)))];
  }
  return ids.filter((id) => !isAdmin(id) && !blocked(id));
}
const BC_SEGMENTS = { all: '👥 Hammaga', unpaid: '📝 To‘lamaganlarga (taklifnoma boshlagan)', paid: '✅ To‘laganlarga', lead: '👤 Faqat kirganlarga' };

/* ------------------------------------ Ekranlar ------------------------------------ */
async function show(cb, chatId, text, keyboard) {
  const extra = { parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: keyboard } };
  if (cb?.message) {
    const r = await tryTg('editMessageText', { chat_id: chatId, message_id: cb.message.message_id, text, ...extra });
    if (r.ok || /not modified/.test(r.err?.message || '')) return;
  }
  await tryTg('sendMessage', { chat_id: chatId, text, ...extra });
}

export async function crmOverview(chatId, cb = null) {
  const d = data();
  const n = (seg) => segmentItems(seg, d).length;
  const leads = Object.values(d.leads);
  const since = (days) => leads.filter((l) => Date.now() - Date.parse(l.at) < days * 86400e3).length;
  const text =
    `👥 <b>Mijozlar</b>\n\n` +
    `Botga kelganlar: <b>${leads.length}</b> (bugun ${since(1)}, 7 kunda ${since(7)})\n` +
    Object.entries(SEGMENTS)
      .map(([k, t]) => `${t}: <b>${n(k)}</b>`)
      .join('\n') +
    `\n🚫 Botni bloklagan: ${leads.filter((l) => l.blocked).length}\n\n` +
    `Eslatmalar: ${FOLLOWUP() ? `yoqiq ✅ (2-bosqichda ${fmtSum(PROMO())} chegirma)` : 'o‘chiq'}`;
  await show(cb, chatId, text, [
    [{ text: `${SEGMENTS.draft} (${n('draft')})`, callback_data: 'm:s:draft:0' }, { text: `${SEGMENTS.awaiting.split(' ')[0]} Kutilmoqda (${n('awaiting')})`, callback_data: 'm:s:awaiting:0' }],
    [{ text: `${SEGMENTS.receipt.split(' ')[0]} Chek (${n('receipt')})`, callback_data: 'm:s:receipt:0' }, { text: `${SEGMENTS.paid} (${n('paid')})`, callback_data: 'm:s:paid:0' }],
    [{ text: `${SEGMENTS.lead} (${n('lead')})`, callback_data: 'm:s:lead:0' }],
    [{ text: '📣 Ommaviy xabar', callback_data: 'm:b' }],
  ]);
}

async function crmList(chatId, seg, page, cb) {
  const items = segmentItems(seg);
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  page = Math.min(Math.max(0, page), pages - 1);
  const slice = items.slice(page * PAGE, page * PAGE + PAGE);
  const rows = slice.map((it) => {
    if (it.kind === 'lead') {
      const who = it.l.name || (it.l.username ? `@${it.l.username}` : `ID ${it.id}`);
      return [{ text: `👤 ${who} · ${it.l.src} · ${String(it.l.at).slice(5, 10)}`.slice(0, 60), callback_data: `m:l:${it.id}` }];
    }
    const s = it.s;
    const f = s.meta.followup?.stage ? ` · 📨${s.meta.followup.stage}` : '';
    return [{ text: `${STATUS_ICON[s.meta.status] || ''} ${D.namesOf(s.config)} · ${firstName(s.meta.owner)}${f}`.slice(0, 60), callback_data: `m:c:${s.slug}` }];
  });
  const nav = [];
  if (page > 0) nav.push({ text: '◀️', callback_data: `m:s:${seg}:${page - 1}` });
  nav.push({ text: '🔙 Orqaga', callback_data: 'm:o' });
  if (page < pages - 1) nav.push({ text: '▶️', callback_data: `m:s:${seg}:${page + 1}` });
  const text =
    `${SEGMENTS[seg]} — <b>${items.length}</b>${pages > 1 ? ` (${page + 1}/${pages})` : ''}\n` +
    (items.length ? 'Mijozni tanlang 👇' : 'Hozircha hech kim yo‘q.') +
    (seg === 'draft' || seg === 'awaiting' ? '\n<i>📨N — nechanchi eslatma yuborilgan</i>' : '');
  await show(cb, chatId, text, [...rows, nav]);
}

async function crmCard(chatId, slug, cb) {
  const s = readSite(slug);
  if (!s) return show(cb, chatId, 'Taklifnoma topilmadi (o‘chirilgan bo‘lishi mumkin).', [[{ text: '🔙 Orqaga', callback_data: 'm:o' }]]);
  const c = s.config;
  const o = s.meta.owner || {};
  const lead = readLeads()[String(o.id)] || {};
  const ev = evOf(c);
  const errors = validateConfig(c);
  const f = s.meta.followup || {};
  const promo = promoAmount(s.meta);
  const text =
    `${ev.icon} <b>${esc(D.namesOf(c))}</b> — ${esc(ev.title)}\n` +
    `📅 ${prettyDate(c.event?.date)}${c.event?.time ? `, ${esc(c.event.time)}` : ''} · ${esc(c.venue?.name || '')}\n` +
    `Holat: ${STATUS_ICON[s.meta.status] || ''} ${esc(s.meta.status)}${errors.length && s.meta.status !== STATUS.paid ? ` · ⚠️ to‘ldirilmagan: ${esc(errors[0])}` : ''}\n` +
    `💰 ${fmtSum(D.siteTotal(s))}${promo ? ` (🎁 −${fmtSum(promo)}${s.meta.promo.locked ? '' : `, ${fmtWhen(Date.parse(s.meta.promo.until))} gacha`})` : ''}\n\n` +
    `👤 ${esc(o.name || '')}${o.username ? ` (@${esc(o.username)})` : ''} · ID <code>${o.id}</code>\n` +
    `📈 Manba: ${esc(s.meta.source || lead.src || 'organik')} · yaratilgan: ${String(s.meta.createdAt || '').slice(0, 10)}\n` +
    `📨 Eslatmalar: ${f.stage ? `${f.stage}/3 (oxirgisi ${String(f.at).slice(0, 16).replace('T', ' ')})` : 'hali yo‘q'}${f.blocked ? ' · 🚫 botni bloklagan' : ''}` +
    (s.meta.status === STATUS.paid ? `\n🔗 ${siteUrlOf(slug)}` : '');
  const view = s.meta.status === STATUS.paid ? siteUrlOf(slug) : previewUrl(slug);
  const rows = [[{ text: '✍️ Xabar yozish', callback_data: `m:w:${o.id}` }]];
  if (s.meta.status !== STATUS.paid && s.meta.status !== STATUS.receipt) {
    rows[0].push({ text: '⏰ Eslatma yuborish', callback_data: `m:r:${slug}` });
    rows.push([
      { text: promo ? '🎁 Chegirma bor' : `🎁 ${fmtSum(PROMO() || 10000)} chegirma (24 soat)`, callback_data: `m:p:${slug}` },
      { text: '💳 To‘lov ma’lumoti', callback_data: `m:y:${slug}` },
    ]);
  }
  if (view) rows.push([{ text: '👀 Ko‘rish', url: view }]);
  rows.push([{ text: '🔙 Orqaga', callback_data: `m:s:${s.meta.status === STATUS.rejected ? 'awaiting' : s.meta.status}:0` }]);
  await show(cb, chatId, text, rows);
}

async function leadCard(chatId, id, cb) {
  const l = readLeads()[String(id)];
  if (!l) return show(cb, chatId, 'Topilmadi.', [[{ text: '🔙 Orqaga', callback_data: 'm:o' }]]);
  await show(
    cb,
    chatId,
    `👤 <b>${esc(l.name || 'Ismi noma’lum')}</b>${l.username ? ` (@${esc(l.username)})` : ''}\nID <code>${id}</code>\n` +
      `📈 Manba: ${esc(l.src)} · keldi: ${String(l.at).slice(0, 16).replace('T', ' ')}` +
      (l.lastAt ? `\n🕐 Oxirgi faollik: ${String(l.lastAt).slice(0, 16).replace('T', ' ')}` : '') +
      (l.blocked ? '\n🚫 Botni bloklagan' : '') +
      `\n\nTaklifnoma boshlamagan. Yozib, nima to‘xtatganini so‘rang yoki namunalarni yuboring.`,
    [[{ text: '✍️ Xabar yozish', callback_data: `m:w:${id}` }], [{ text: '🔙 Orqaga', callback_data: 'm:s:lead:0' }]],
  );
}

async function broadcastMenu(chatId, cb) {
  const rows = Object.entries(BC_SEGMENTS).map(([k, t]) => [{ text: `${t} — ${audience(k).length}`, callback_data: `m:bs:${k}` }]);
  rows.push([{ text: '🔙 Orqaga', callback_data: 'm:o' }]);
  await show(cb, chatId, '📣 <b>Ommaviy xabar</b>\n\nKimga yuboramiz? (botni bloklaganlar hisobga olinmaydi)', rows);
}

/* ------------------------------------ Ommaviy yuborish ------------------------------------ */
let broadcasting = false;
async function runBroadcast(adminId, mode) {
  const ids = audience(mode.seg);
  broadcasting = true;
  let ok = 0;
  let fail = 0;
  let blocked = 0;
  try {
    for (const id of ids) {
      const r = await tryTg('copyMessage', { chat_id: id, from_chat_id: mode.from, message_id: mode.msgId });
      if (r.ok) ok++;
      else {
        fail++;
        if (r.blocked) {
          blocked++;
          markLeadBlocked(id);
        }
        if (r.err?.retryAfter) await new Promise((res) => setTimeout(res, r.err.retryAfter * 1000));
      }
      await new Promise((res) => setTimeout(res, Number(env('BROADCAST_DELAY_MS', '60'))));
    }
  } finally {
    broadcasting = false;
  }
  await tryTg('sendMessage', {
    chat_id: adminId,
    text: `📣 <b>Yuborildi:</b> ${ok} ta${fail ? `\n❌ Yetib bormadi: ${fail} ta${blocked ? ` (${blocked} tasi botni bloklagan)` : ''}` : ''}`,
    parse_mode: 'HTML',
  });
}

/* ------------------------------------ Hodisalar ------------------------------------ */
/** "m:…" tugmalari (faqat admin). Ishlansa — true */
export async function onCrmCallback(cb) {
  const data = String(cb.data || '');
  if (!data.startsWith('m:')) return false;
  const answer = (text = '', alert = false) => tryTg('answerCallbackQuery', { callback_query_id: cb.id, ...(text ? { text, show_alert: alert } : {}) });
  if (!isAdmin(cb.from.id)) return (await answer()), true;
  const chatId = cb.from.id;
  const [, act, a, b] = data.split(':');
  if (act === 'o') return (await answer(), await crmOverview(chatId, cb)), true;
  if (act === 's') return (await answer(), await crmList(chatId, a, Number(b) || 0, cb)), true;
  if (act === 'c') return (await answer(), await crmCard(chatId, a, cb)), true;
  if (act === 'l') return (await answer(), await leadCard(chatId, a, cb)), true;
  if (act === 'w') {
    await answer();
    const l = readLeads()[a] || {};
    const owner = listSites().find((s) => String(s.meta.owner?.id) === a)?.meta.owner || {};
    setMode(chatId, { mode: 'write', to: a });
    await tryTg('sendMessage', {
      chat_id: chatId,
      text: `✍️ <b>${esc(owner.name || l.name || `ID ${a}`)}</b> ga xabaringizni yozing — matn, rasm, video yoki ovozli xabar. U bot nomidan boradi.\n\nBekor qilish: /bekor`,
      parse_mode: 'HTML',
    });
    return true;
  }
  if (act === 'r' || act === 'p') {
    const s = readSite(a);
    if (!s || !isUnpaid(s)) return (await answer('Bu taklifnomaga eslatma kerak emas', true)), true;
    if (act === 'p' && promoAmount(s.meta)) return (await answer('Chegirma allaqachon berilgan', true)), true;
    const stage = act === 'p' ? 2 : Math.min(3, (s.meta.followup?.stage || 0) + 1);
    if (act === 'p' && !PROMO()) updateMeta(a, (m) => ({ ...m, promo: { amount: 10000, until: new Date(Date.now() + 24 * HOUR).toISOString(), by: 'admin' } }));
    const r = await sendFollowup(readSite(a), stage, { manual: true });
    await answer(r.ok ? 'Yuborildi ✓' : r.blocked ? 'Mijoz botni bloklagan' : `Xato: ${r.err?.message}`, !r.ok);
    await crmCard(chatId, a, cb);
    return true;
  }
  if (act === 'y') {
    const s = readSite(a);
    if (!s || !isUnpaid(s)) return (await answer('To‘lov kutilmaydi', true)), true;
    await D.payInstructions(s.meta.owner.id, a);
    await answer('To‘lov ma’lumoti mijozga yuborildi ✓');
    return true;
  }
  if (act === 'b') return (await answer(), await broadcastMenu(chatId, cb)), true;
  if (act === 'bs') {
    await answer();
    setMode(chatId, { mode: 'bc', seg: a });
    await show(
      cb,
      chatId,
      `📣 ${BC_SEGMENTS[a]} — <b>${audience(a).length}</b> kishi\n\nEndi xabarni yuboring: matn, rasm (izohi bilan), video yoki ovozli. Avval sizga ko‘rsatamiz, keyin tasdiqlaysiz.\n\nBekor qilish: /bekor`,
      [[{ text: '🔙 Orqaga', callback_data: 'm:b' }]],
    );
    return true;
  }
  if (act === 'go') {
    const mode = getMode(chatId);
    if (!mode || mode.mode !== 'bcready') return (await answer('Xabar topilmadi — qaytadan /xabar', true)), true;
    if (broadcasting) return (await answer('Oldingi xabar hali yuborilmoqda ⏳', true)), true;
    setMode(chatId, null);
    await answer('Yuborilmoqda…');
    if (cb.message) await tryTg('editMessageReplyMarkup', { chat_id: chatId, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
    await tryTg('sendMessage', { chat_id: chatId, text: `⏳ ${audience(mode.seg).length} kishiga yuborilmoqda…` });
    runBroadcast(chatId, mode).catch((e) => D.log('! ommaviy xabar:', e.message));
    return true;
  }
  if (act === 'x') {
    setMode(chatId, null);
    await answer('Bekor qilindi');
    if (cb.message) await tryTg('editMessageReplyMarkup', { chat_id: chatId, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
    return true;
  }
  await answer();
  return true;
}

/** Admin xabari: /mijozlar, /xabar, /bekor yoki joriy amal (kimgadir yozish / ommaviy xabar matni). Ishlansa — true */
export async function onCrmAdminMessage(msg) {
  if (!isAdmin(msg.from.id)) return false;
  const text = (msg.text || '').trim();
  const chatId = msg.chat.id;
  if (text === '/mijozlar') return setMode(chatId, null), await crmOverview(chatId), true;
  if (text === '/xabar') return setMode(chatId, null), await broadcastMenu(chatId), true;
  if (text === '/eslatma') return await runFollowups({}, { force: true }), await tryTg('sendMessage', { chat_id: chatId, text: '✓ Eslatmalar tekshirildi' }), true;
  const mode = getMode(chatId);
  if (text === '/bekor') {
    setMode(chatId, null);
    await tryTg('sendMessage', { chat_id: chatId, text: mode ? 'Bekor qilindi.' : 'Bekor qiladigan amal yo‘q.' });
    return true;
  }
  if (!mode) return false;
  if (text.startsWith('/')) {
    setMode(chatId, null); // boshqa buyruq — amal bekor
    return false;
  }
  if (mode.mode === 'write') {
    const r = msg.text
      ? await tryTg('sendMessage', { chat_id: mode.to, text: `💬 <b>Admin:</b> ${esc(msg.text)}`, parse_mode: 'HTML' })
      : await tryTg('copyMessage', { chat_id: mode.to, from_chat_id: chatId, message_id: msg.message_id });
    setMode(chatId, null);
    if (r.blocked) markLeadBlocked(mode.to);
    await tryTg('sendMessage', {
      chat_id: chatId,
      text: r.ok ? '✓ Yuborildi. Mijoz javob yozsa, shu yerga keladi.' : r.blocked ? '🚫 Yuborilmadi — mijoz botni bloklagan.' : `❌ Yuborilmadi: ${r.err?.message}`,
      reply_markup: { inline_keyboard: [[{ text: '✍️ Yana yozish', callback_data: `m:w:${mode.to}` }]] },
    });
    return true;
  }
  if (mode.mode === 'bc' || mode.mode === 'bcready') {
    const n = audience(mode.seg).length;
    setMode(chatId, { mode: 'bcready', seg: mode.seg, from: chatId, msgId: msg.message_id });
    await tryTg('sendMessage', {
      chat_id: chatId,
      text: `☝️ Shu xabar <b>${n} kishiga</b> (${BC_SEGMENTS[mode.seg]}) yuboriladi. Tasdiqlaysizmi?\n<i>O‘zgartirmoqchi bo‘lsangiz — yangi xabarni yuboring.</i>`,
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id,
      reply_markup: { inline_keyboard: [[{ text: `✅ Yuborish (${n})`, callback_data: 'm:go' }, { text: '❌ Bekor', callback_data: 'm:x' }]] },
    });
    return true;
  }
  return false;
}
