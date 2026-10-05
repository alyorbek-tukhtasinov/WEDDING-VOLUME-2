// Telegram Mini App API (boshqaruv.<domen>/api/panel/app/*): mijoz o'z taklifnomasini yaratadi va tahrirlaydi.
// Kirish — Telegram imzosi (X-Telegram-Init-Data); mijoz faqat o'z saytlarini ko'radi va o'zgartiradi.
//
//   GET  /api/panel/app/me            — foydalanuvchi, uning saytlari, narx, shablonlar
//   GET  /api/panel/app/site?slug=…   — bitta sayt sozlamalari (faqat egasi)
//   POST /api/panel/app/save          — { slug?, config } → yangi qoralama yoki tahrir (to'langan bo'lsa — qayta yig'iladi)
//   POST /api/panel/app/pay           — { slug } → bot to'lov ma'lumotlarini yuboradi, chek kutiladi
//   POST /api/panel/app/remove        — { slug } → to'lanmagan qoralamani o'chirish
//   POST /api/panel/app/video         — { slug } → Instagram uchun video (to'langan saytga; tayyor bo'lsa — qayta yuboradi)
//   POST /api/panel/app/upload        — { slug, field, data: base64 } → rasm (src/lib/photo-slots.js dagi joylarga)
//   POST /api/panel/app/unmedia       — { slug, field, name } → rasmni olib tashlash
//   GET  /api/panel/app/media?slug=&name= — qoralama rasmini ko'rish (faqat egasi; sayt hali ochiq emas)
//
// Mijozdan kelgan sozlamalar ruxsat etilgan maydonlar bo'yicha qabul qilinadi (demo, paused, musicUrl kabi
// ichki maydonlarni o'zgartira olmaydi).
import { validateConfig, isValidDate, TIME_RE } from '../src/lib/config.js';
import { EVENT_IDS, eventTexts } from '../src/lib/events.js';
import { MUSIC_LIBRARY, findTrack } from '../src/lib/music.js';
import { suggestProgramPreset, buildProgram } from '../src/lib/presets.js';
import { defaultConfig, addDays } from '../src/lib/starter.js';
import { verifyInitData, BOT_TOKEN, PRICE, VIDEO_PRICE, siteUrlOf, siteDomain } from './telegram.js';
import { readSite, writeSite, sitesOf, removeSite, enqueue, STATUS, mediaFiles, isSlug } from './data.js';
import { takenSlugs } from './panel.js';
import { findSlot, getField, setField, usedMedia } from '../src/lib/photo-slots.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { siteDir } from './data.js';

export const APP_TEMPLATES = ['volume5', 'volume3', 'volume4', 'osmon', 'volume2', 'suzani', 'bulut', 'kitob', 'yz'];
const MAX_DRAFTS = 3;
const MAX_BODY = 256 * 1024;
const MAX_UPLOAD = 8 * 1024 * 1024; // brauzerda siqilgan rasm odatda 200–600 KB

class UserError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readJson(req, limit = MAX_BODY) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new UserError('too_large', 'Rasm juda katta — boshqa rasm tanlang');
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new UserError('bad_request', 'So‘rov noto‘g‘ri');
  }
}

/* ------------------------------- Matnlarni tozalash ------------------------------- */
const clean = (v, max = 200) =>
  String(v ?? '')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
const cleanUrl = (v) => {
  const s = clean(v, 600);
  if (!s) return '';
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? s : '';
  } catch {
    return '';
  }
};

/**
 * Mijozdan kelgan sozlamalarni joriy config ustiga qo'llash (faqat ruxsat etilgan maydonlar).
 * isNew — shablon va marosim turini tanlash faqat yangi saytda.
 */
export function applyInput(base, input, { isNew }) {
  const c = structuredClone(base);
  const i = input && typeof input === 'object' ? input : {};
  const prevTime = c.event?.time;
  // Avtomatik taklif matni (ismlar bilan) — mijoz o'zi yozmagan bo'lsa, ismlar o'zgarganda yangilanadi
  const autoOf = (x) =>
    eventTexts(x.eventType, x.couple?.showGroom === false ? false : x.couple?.groom, x.couple?.bride, 'uz', x.invitedBy === 'couple' ? 'couple' : 'parents').invitation;
  const wasAuto = !c.texts?.invitation || c.texts.invitation === autoOf(c) || c.texts.invitation === eventTexts(c.eventType, '', '').invitation;

  c.couple = { ...c.couple };
  if ('groom' in (i.couple || {})) c.couple.groom = clean(i.couple.groom, 40);
  if ('bride' in (i.couple || {})) c.couple.bride = clean(i.couple.bride, 40);
  // Qiz uzatishda kuyov ismi ko'rsatilmasligi mumkin (ism bo'sh qoldirilsa ham shunday)
  if (c.eventType !== 'qiz-uzatish') delete c.couple.showGroom;
  else if (i.couple && typeof i.couple === 'object') {
    if (i.couple.showGroom === false || !c.couple.groom) c.couple.showGroom = false;
    else delete c.couple.showGroom;
  }
  c.couple.initials = '';

  if (i.invitedBy === 'couple' || i.invitedBy === 'parents') c.invitedBy = i.invitedBy;
  if (['volume3', 'volume4'].includes(c.template) && ['green', 'pink'].includes(i.palette)) c.palette = i.palette;

  c.event = { ...c.event };
  if (isValidDate(i.event?.date)) c.event.date = i.event.date;
  if (TIME_RE.test(i.event?.time || '')) c.event.time = i.event.time;

  if (i.venue && typeof i.venue === 'object') {
    c.venue = { ...c.venue, name: clean(i.venue.name, 120), address: clean(i.venue.address, 200) };
    if ('googleMaps' in i.venue) c.venue.googleMaps = cleanUrl(i.venue.googleMaps);
    if ('yandexMaps' in i.venue) c.venue.yandexMaps = cleanUrl(i.venue.yandexMaps);
    if (c.template === 'osmon' && Number.isFinite(Number(i.venue.lat)) && Number.isFinite(Number(i.venue.lng)) && i.venue.lat !== '' && i.venue.lng !== '') {
      c.sky = { ...(c.sky || {}), lat: Number(i.venue.lat), lng: Number(i.venue.lng) };
    }
  }
  if ('hosts' in i && c.template !== 'yz') c.hosts = clean(i.hosts, 120);

  if (i.texts && typeof i.texts === 'object' && c.template !== 'yz') {
    c.texts = { ...c.texts };
    for (const [k, max] of [['heroCaption', 80], ['greeting', 80], ['invitation', 1200], ['closing', 200]]) {
      if (k in i.texts) c.texts[k] = clean(i.texts[k], max);
    }
  }

  if (c.texts && c.template !== 'yz' && wasAuto && !String(i.texts?.invitation || '').trim()) c.texts.invitation = autoOf(c);

  if (i.musicTrack === 'none' || findTrack(i.musicTrack)) c.musicTrack = i.musicTrack;
  if (['off', 'button', 'auto'].includes(i.autoScroll)) c.autoScroll = i.autoScroll;

  if (i.rsvp && typeof i.rsvp === 'object') {
    c.rsvp = { ...c.rsvp, enabled: i.rsvp.enabled !== false };
    if ('showWishes' in i.rsvp && c.template !== 'yz') c.rsvp.showWishes = i.rsvp.showWishes !== false;
  }
  // Javob muddati — to'ydan bir kun oldin
  if (c.rsvp && isValidDate(c.event.date)) c.rsvp.deadline = addDays(c.event.date, -1);

  // Vaqt o'zgarsa — dastur ham shu vaqtdan boshlanadi
  if (Array.isArray(c.program) && c.program.length && c.event.time !== prevTime && TIME_RE.test(c.event.time)) {
    c.program = buildProgram(suggestProgramPreset(c.event.time, c.eventType), c.event.time);
  }
  if (isNew) c.autoScroll ||= 'auto';
  return c;
}

/* ------------------------------- Sayt manzili ------------------------------- */
const CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
export const toSlug = (...parts) =>
  parts
    .join('-')
    .toLowerCase()
    .replace(/[а-яёўқғҳ]/g, (ch) => CYR[ch] ?? '')
    .replace(/[‘’ʻʼ'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

async function newSlug(c) {
  const taken = await takenSlugs();
  const base =
    (c.couple.showGroom === false ? toSlug(c.couple.bride, 'qiz-uzatish') : toSlug(c.couple.groom, c.couple.bride)) || 'taklifnoma';
  const ev = { 'nikoh-kunduzgi': 'nikoh', 'qiz-uzatish': 'qiz-uzatish', 'nahorgi-osh': 'osh', fotiha: 'fotiha', 'kelin-salom': 'kelin-salom' }[c.eventType] || 'nikoh';
  const cands = [base, `${base}-${ev}`, `${base}-${c.event.date.slice(0, 4)}`].map((x) => toSlug(x));
  for (const s of cands) if (s && !taken[s]) return s;
  for (let n = 2; n < 200; n++) if (!taken[`${base}-${n}`]) return `${base}-${n}`;
  return `${base}-${Date.now().toString(36)}`;
}

/* ------------------------------- Javoblar ------------------------------- */
const summary = (s) => ({
  slug: s.slug,
  template: s.config.template || 'volume2',
  eventType: s.config.eventType || 'nikoh',
  groom: s.config.couple?.showGroom === false ? '' : s.config.couple?.groom || '',
  bride: s.config.couple?.bride || '',
  date: s.config.event?.date || '',
  status: s.meta.status,
  paused: s.config.paused === true,
  url: s.meta.status === STATUS.paid ? siteUrlOf(s.slug) : '',
  video: s.meta.video?.status || '',
});

function ownSite(user, slug) {
  if (!isSlug(slug)) throw new UserError('not_found', 'Sayt topilmadi');
  const s = readSite(slug);
  if (!s || String(s.meta.owner?.id) !== String(user.id)) throw new UserError('not_found', 'Sayt topilmadi');
  return s;
}

async function save(user, body) {
  const input = body?.config;
  if (!input || typeof input !== 'object') throw new UserError('bad_request', 'Ma’lumot yo‘q');
  let slug = body.slug;
  let current;
  let isNew = false;
  if (slug) {
    current = ownSite(user, slug);
    // To'lanmagan qoralamada dizayn yoki marosim turini almashtirish mumkin — boshlang'ich sozlamalar yangilanadi
    const tpl = APP_TEMPLATES.includes(input.template) ? input.template : current.config.template;
    const ev = EVENT_IDS.includes(input.eventType) ? input.eventType : current.config.eventType;
    if (current.meta.status !== STATUS.paid && (tpl !== current.config.template || ev !== current.config.eventType)) {
      current = { ...current, config: defaultConfig(tpl, ev) };
    }
  } else {
    isNew = true;
    const open = sitesOf(user.id).filter((s) => s.meta.status !== STATUS.paid);
    if (open.length >= MAX_DRAFTS) throw new UserError('limit', `Bir vaqtda ${MAX_DRAFTS} tadan ortiq tugallanmagan taklifnoma ochib bo‘lmaydi. Avvalgilarini yakunlang yoki o‘chiring.`);
    const template = APP_TEMPLATES.includes(input.template) ? input.template : 'volume3';
    const eventType = EVENT_IDS.includes(input.eventType) ? input.eventType : 'nikoh';
    current = { config: defaultConfig(template, eventType), meta: null };
  }
  const config = applyInput(current.config, input, { isNew });
  const errors = validateConfig(config, slug ? mediaFiles(slug) : []);
  // To'lovga yuborilgan yoki to'langan sayt chala holatga tushmasin
  if (!isNew && current.meta?.status !== STATUS.draft && errors.length) {
    throw new UserError('incomplete', `Saqlab bo‘lmadi — avval to‘ldiring: ${errors[0]}`);
  }
  // Qoralama to'liq bo'lmasa ham saqlanadi — faqat to'lovga o'tishda hammasi to'liq bo'lishi shart
  if (isNew) slug = await newSlug(config);
  const now = new Date().toISOString();
  const meta = current.meta || {
    owner: { id: user.id, name: [user.first_name, user.last_name].filter(Boolean).join(' '), username: user.username || '' },
    status: STATUS.draft,
    createdAt: now,
    price: PRICE(),
  };
  writeSite(slug, { config, meta });
  pruneMedia(slug, config);
  if (meta.status === STATUS.paid) enqueue({ type: 'build', slug, reason: 'edit' });
  return { slug, status: meta.status, errors, url: meta.status === STATUS.paid ? siteUrlOf(slug) : '' };
}

function pay(user, body) {
  const s = ownSite(user, body?.slug);
  if (s.meta.status === STATUS.paid) return { status: s.meta.status, url: siteUrlOf(s.slug) };
  const errors = validateConfig(s.config, mediaFiles(s.slug));
  if (errors.length) throw new UserError('incomplete', `Avval barcha maydonlarni to‘ldiring: ${errors[0]}`);
  const meta = { ...s.meta };
  if (meta.status !== STATUS.receipt) meta.status = STATUS.awaiting;
  meta.price ||= PRICE();
  // Instagram uchun video — sayt bilan birga buyurtma (narxga qo'shiladi, sayt tasdiqlangach tayyorlanadi)
  if (body?.video === true && !['paid', 'rendering', 'done'].includes(meta.video?.status)) {
    meta.video = { status: 'with-site', price: VIDEO_PRICE(), orderedAt: new Date().toISOString() };
  } else if (body?.video === false && meta.video?.status === 'with-site') {
    delete meta.video;
  }
  writeSite(s.slug, { meta });
  enqueue({ type: 'pay', slug: s.slug, chatId: user.id });
  return { status: meta.status };
}

/** To'langan saytga video buyurtma: to'lov ko'rsatmasi botda; tayyor bo'lsa — qayta yuboriladi. */
function orderVideo(user, body) {
  const s = ownSite(user, body?.slug);
  if (s.meta.status !== STATUS.paid) throw new UserError('not_paid', 'Video sayt to‘lovi tasdiqlangandan keyin tayyorlanadi');
  if (s.config.paused) throw new UserError('paused', 'Sayt to‘xtatilgan — video tayyorlab bo‘lmaydi');
  const v = s.meta.video;
  if (v?.status === 'done') {
    enqueue({ type: 'videosend', slug: s.slug, chatId: user.id });
    return { video: 'done' };
  }
  if (['paid', 'rendering', 'receipt'].includes(v?.status)) return { video: v.status };
  writeSite(s.slug, { meta: { ...s.meta, video: { status: 'awaiting', price: VIDEO_PRICE(), orderedAt: new Date().toISOString() } } });
  enqueue({ type: 'videopay', slug: s.slug, chatId: user.id });
  return { video: 'awaiting' };
}

/* ------------------------------- Rasmlar ------------------------------- */
const mediaDirOf = (slug) => path.join(siteDir(slug), 'media');
const IMG = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
function sniffImage(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return 'jpg';
  if (hex.startsWith('89504e47')) return 'png';
  if (hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
/** Sozlamada ishlatilmay qolgan fayllarni o'chirish (dizayn almashganda, rasm almashtirilganda) */
function pruneMedia(slug, config) {
  const dir = mediaDirOf(slug);
  if (!fs.existsSync(dir)) return;
  const used = usedMedia(config);
  // Mijoz yuklamagan (masalan, admin panel orqali qo'shilgan) fayllar — tegilmaydi: faqat "m-" bilan boshlanganlar
  for (const n of fs.readdirSync(dir)) if (n.startsWith('m-') && !used.has(n)) fs.rmSync(path.join(dir, n), { force: true });
}

function upload(user, body) {
  const s = ownSite(user, body?.slug);
  const slot = findSlot(s.config.template, String(body?.field || ''));
  if (!slot) throw new UserError('bad_field', 'Bu shablonda bunday rasm joyi yo‘q');
  const buf = Buffer.from(String(body?.data || ''), 'base64');
  const ext = sniffImage(buf);
  if (!buf.length || !ext) throw new UserError('bad_media', 'Faqat JPG, PNG yoki WEBP rasm yuklash mumkin');
  if (buf.length > MAX_UPLOAD) throw new UserError('too_large', 'Rasm juda katta');
  const config = structuredClone(s.config);
  const cur = getField(config, slot.field);
  if (slot.multi && Array.isArray(cur) && cur.length >= slot.multi) throw new UserError('limit', `Ko‘pi bilan ${slot.multi} ta rasm`);
  const name = `m-${slot.field.replace(/\W+/g, '-')}-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}.${ext}`;
  fs.mkdirSync(mediaDirOf(s.slug), { recursive: true });
  fs.writeFileSync(path.join(mediaDirOf(s.slug), name), buf);
  if (slot.multi) setField(config, slot.field, [...(Array.isArray(cur) ? cur : []), name]);
  else setField(config, slot.field, name);
  // Volume 2: suratli fon ustida matn o'qilishi uchun och parda
  if (slot.field === 'backgroundImage' && (config.template || 'volume2') === 'volume2') config.backgroundOverlay ??= 0.84;
  writeSite(s.slug, { config });
  pruneMedia(s.slug, config);
  if (s.meta.status === STATUS.paid) enqueue({ type: 'build', slug: s.slug, reason: 'photo' });
  return { name, field: slot.field, value: getField(config, slot.field) };
}

function unmedia(user, body) {
  const s = ownSite(user, body?.slug);
  const slot = findSlot(s.config.template, String(body?.field || ''));
  if (!slot) throw new UserError('bad_field', 'Bu shablonda bunday rasm joyi yo‘q');
  const config = structuredClone(s.config);
  const cur = getField(config, slot.field);
  if (slot.multi) setField(config, slot.field, (Array.isArray(cur) ? cur : []).filter((n) => n !== body?.name));
  else setField(config, slot.field, undefined);
  if (slot.field === 'backgroundImage') delete config.backgroundOverlay;
  writeSite(s.slug, { config });
  pruneMedia(s.slug, config);
  if (s.meta.status === STATUS.paid) enqueue({ type: 'build', slug: s.slug, reason: 'photo' });
  return { field: slot.field, value: getField(config, slot.field) ?? null };
}

function sendMedia(user, url, res) {
  const s = ownSite(user, url.searchParams.get('slug') || '');
  const name = url.searchParams.get('name') || '';
  if (!/^[\w.-]{1,120}$/.test(name)) throw new UserError('not_found', 'Rasm topilmadi');
  const file = path.join(mediaDirOf(s.slug), name);
  if (!fs.existsSync(file)) throw new UserError('not_found', 'Rasm topilmadi');
  res.statusCode = 200;
  res.setHeader('Content-Type', IMG[path.extname(name).slice(1)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(file).pipe(res);
}

function remove(user, body) {
  const s = ownSite(user, body?.slug);
  if (s.meta.status === STATUS.paid) throw new UserError('paid', 'To‘langan saytni o‘chirib bo‘lmaydi — yordam uchun adminga yozing.');
  removeSite(s.slug);
  return { slug: s.slug };
}

export async function appHandler(req, res, name) {
  if (!BOT_TOKEN()) return send(res, 503, { ok: false, error: 'no_bot', message: 'Bot sozlanmagan' });
  const auth = verifyInitData(String(req.headers['x-telegram-init-data'] || ''));
  if (!auth) return send(res, 401, { ok: false, error: 'unauthorized', message: 'Iltimos, taklifnomani Telegram bot orqali oching' });
  const { user } = auth;
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && name === 'me') {
      return send(res, 200, {
        ok: true,
        user: { id: user.id, name: user.first_name || '' },
        sites: sitesOf(user.id).map(summary).sort((a, b) => (a.date < b.date ? 1 : -1)),
        price: PRICE(),
        videoPrice: VIDEO_PRICE(),
        domain: siteDomain(),
        templates: APP_TEMPLATES,
        music: MUSIC_LIBRARY.map((t) => ({ id: t.id, title: t.title, file: t.file })),
        maxDrafts: MAX_DRAFTS,
      });
    }
    if (req.method === 'GET' && name === 'site') {
      const s = ownSite(user, url.searchParams.get('slug') || '');
      return send(res, 200, { ok: true, slug: s.slug, config: s.config, status: s.meta.status, url: s.meta.status === STATUS.paid ? siteUrlOf(s.slug) : '', video: s.meta.video?.status || '' });
    }
    if (req.method === 'POST' && name === 'save') return send(res, 200, { ok: true, ...(await save(user, await readJson(req))) });
    if (req.method === 'POST' && name === 'pay') return send(res, 200, { ok: true, ...pay(user, await readJson(req)) });
    if (req.method === 'POST' && name === 'video') return send(res, 200, { ok: true, ...orderVideo(user, await readJson(req)) });
    if (req.method === 'POST' && name === 'upload') return send(res, 200, { ok: true, ...upload(user, await readJson(req, MAX_UPLOAD * 1.4)) });
    if (req.method === 'POST' && name === 'unmedia') return send(res, 200, { ok: true, ...unmedia(user, await readJson(req)) });
    if (req.method === 'GET' && name === 'media') return sendMedia(user, url, res);
    if (req.method === 'POST' && name === 'remove') return send(res, 200, { ok: true, ...remove(user, await readJson(req)) });
    return send(res, 404, { ok: false, error: 'not_found' });
  } catch (err) {
    if (err instanceof UserError) return send(res, 422, { ok: false, error: err.code, message: err.message });
    console.error('Mini App xatosi:', err);
    return send(res, 500, { ok: false, error: 'server_error', message: 'Serverda xato — birozdan keyin urinib ko‘ring' });
  }
}
