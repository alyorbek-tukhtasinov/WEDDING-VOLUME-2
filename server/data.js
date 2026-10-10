// Bot (mijozlarning o'zi) yaratgan saytlar — GitHub'da emas, serverdagi ma'lumotlar papkasida:
//
//   <DATA_DIR>/sites/<nom>/config.json   — sayt sozlamalari (repo'dagi clients/<nom>/config.json bilan bir xil)
//   <DATA_DIR>/sites/<nom>/meta.json     — egasi (Telegram), holati, to'lov, sanalar
//   <DATA_DIR>/sites/<nom>/media/        — mijoz yuklagan fayllar
//   <DATA_DIR>/built/<nom>/              — yig'ilgan sayt (sites/<nom> shu yerga symlink)
//   <DATA_DIR>/shared/                   — yig'ilgan saytlardagi bir xil fayllar (rasm, musiqa) — bir nusxada
//   <DATA_DIR>/queue/*.json              — API → bot xabarlari (yig'ish, to'lov ko'rsatmasi, …)
//
// DATA_DIR: muhit o'zgaruvchisi; bo'lmasa serverda /opt/taklifnoma/data, kompyuterda <repo>/.data.
// Fayllar atomik yoziladi (vaqtinchalik fayl → rename): API va bot bir vaqtda yozsa ham buzilmaydi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SLUG_RE } from '../api/_lib/slug.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_DATA = '/opt/taklifnoma/data';

export const DATA_DIR = () =>
  path.resolve(process.env.DATA_DIR || (fs.existsSync(SERVER_DATA) ? SERVER_DATA : path.join(ROOT, '.data')));
export const sitesRoot = () => path.join(DATA_DIR(), 'sites');
export const builtRoot = () => path.join(DATA_DIR(), 'built');
export const siteDir = (slug) => path.join(sitesRoot(), slug);
export const builtDir = (slug) => path.join(builtRoot(), slug);
const queueDir = () => path.join(DATA_DIR(), 'queue');

/** Sayt holati */
export const STATUS = {
  draft: 'draft', // mijoz tayyorlayapti
  awaiting: 'awaiting', // to'lov ma'lumotlari yuborildi, chek kutilmoqda
  receipt: 'receipt', // chek yuborildi, admin tasdig'i kutilmoqda
  paid: 'paid', // to'langan — sayt ochiq
  rejected: 'rejected', // chek rad etildi (mijoz qayta yuborishi mumkin)
};

export function ensureDirs() {
  for (const d of [sitesRoot(), builtRoot(), queueDir(), path.join(DATA_DIR(), 'shared')]) fs.mkdirSync(d, { recursive: true });
  // nginx yig'ilgan saytlarni (built, shared — hardlinklar) o'qishi kerak; mijoz ma'lumotlari va navbat — faqat bizga
  try {
    fs.chmodSync(builtRoot(), 0o755);
    fs.chmodSync(path.join(DATA_DIR(), 'shared'), 0o755);
    fs.chmodSync(sitesRoot(), 0o700);
    fs.chmodSync(queueDir(), 0o700);
  } catch {
    /* boshqa egasi — o'zgartirib bo'lmaydi */
  }
}

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}
const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

export const isSlug = (slug) => typeof slug === 'string' && SLUG_RE.test(slug) && slug.length <= 60;

export function readSite(slug) {
  if (!isSlug(slug)) return null;
  const config = readJson(path.join(siteDir(slug), 'config.json'));
  const meta = readJson(path.join(siteDir(slug), 'meta.json'));
  return config && meta ? { slug, config, meta } : null;
}

export function listSites() {
  if (!fs.existsSync(sitesRoot())) return [];
  return fs
    .readdirSync(sitesRoot())
    .filter(isSlug)
    .map(readSite)
    .filter(Boolean);
}

export const sitesOf = (ownerId) => listSites().filter((s) => String(s.meta.owner?.id) === String(ownerId));

export function writeSite(slug, { config, meta }) {
  if (!isSlug(slug)) throw new Error(`noto'g'ri nom: ${slug}`);
  const now = new Date().toISOString();
  if (config) writeAtomic(path.join(siteDir(slug), 'config.json'), JSON.stringify(config, null, 2) + '\n');
  if (meta) writeAtomic(path.join(siteDir(slug), 'meta.json'), JSON.stringify({ ...meta, slug, updatedAt: now }, null, 2) + '\n');
}

/** meta'ni o'zgartirish: fn(meta) → yangi meta (yoki o'sha obyektni o'zgartiradi). */
export function updateMeta(slug, fn) {
  const s = readSite(slug);
  if (!s) return null;
  const next = fn(s.meta) || s.meta;
  writeSite(slug, { meta: next });
  return next;
}

export function removeSite(slug) {
  if (!isSlug(slug)) return;
  fs.rmSync(siteDir(slug), { recursive: true, force: true });
  fs.rmSync(builtDir(slug), { recursive: true, force: true });
}

export const mediaFiles = (slug) => {
  const d = path.join(siteDir(slug), 'media');
  return fs.existsSync(d) ? fs.readdirSync(d).filter((n) => !n.startsWith('.')) : [];
};

/* ----------------------------------- Navbat (API → bot) ----------------------------------- */
/** Hodisa: { type: 'build' | 'pay' | 'notify' | …, slug, … } */
let seq = 0;
/* ----------------------------------- Mijoz qayerdan keldi (reklama manbasi) ----------------------------------- */
// <DATA_DIR>/leads.json: { [telegramId]: { src, at } } — birinchi kelgan manba saqlanadi (keyingi /start uni almashtirmaydi)
const leadsFile = () => path.join(DATA_DIR(), 'leads.json');
export function readLeads() {
  return readJson(leadsFile()) || {};
}
/** Manba: "/start <payload>" dagi qiymat (faqat a-z, 0-9, _ -). Yangi foydalanuvchi bo'lsa — true. */
export function recordLead(userId, src = '', user = null) {
  const leads = readLeads();
  const id = String(userId);
  if (leads[id]) return false;
  leads[id] = { src: String(src || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'organik', at: new Date().toISOString(), ...leadUser(user) };
  fs.mkdirSync(DATA_DIR(), { recursive: true });
  writeAtomic(leadsFile(), JSON.stringify(leads));
  return true;
}
const leadUser = (u) => (u ? { name: [u.first_name, u.last_name].filter(Boolean).join(' ').slice(0, 80), username: u.username || '' } : {});
/** Mijoz ismi va oxirgi faolligi (ro'yxat va ommaviy xabarlar uchun); faylga kamdan-kam yoziladi */
export function touchLead(user) {
  if (!user?.id) return;
  const leads = readLeads();
  const id = String(user.id);
  const cur = leads[id];
  if (!cur) return;
  const u = leadUser(user);
  if (cur.name === u.name && cur.username === u.username && !cur.blocked && Date.now() - Date.parse(cur.lastAt || 0) < 3600e3) return;
  leads[id] = { ...cur, ...u, lastAt: new Date().toISOString(), blocked: undefined };
  writeAtomic(leadsFile(), JSON.stringify(leads));
}
/** Botni bloklaganlar — ommaviy xabarlardan chiqariladi */
export function markLeadBlocked(userId) {
  const leads = readLeads();
  const id = String(userId);
  leads[id] = { ...(leads[id] || { src: 'organik', at: new Date().toISOString() }), blocked: true };
  writeAtomic(leadsFile(), JSON.stringify(leads));
}
/** Vaqtinchalik chegirma (eslatma yoki admin bergan): muddati ichida yoki to'lov sahifasi shu muddatda ochilgan bo'lsa (locked) */
export const promoAmount = (meta) => {
  const p = meta?.promo;
  if (!p?.amount) return 0;
  return p.locked || Date.now() < Date.parse(p.until) ? p.amount : 0;
};
export const leadSource = (userId) => readLeads()[String(userId)]?.src || '';

export function enqueue(event) {
  fs.mkdirSync(queueDir(), { recursive: true });
  // Bir millisekundda bir nechta hodisa bo'lsa ham tartib saqlanadi (vaqt + tartib raqami)
  const name = `${Date.now()}-${String(seq++ % 1e6).padStart(6, '0')}-${crypto.randomBytes(3).toString('hex')}.json`;
  writeAtomic(path.join(queueDir(), name), JSON.stringify({ ...event, at: new Date().toISOString() }));
}

/** Navbatdagi barcha hodisalar (eski → yangi); o'qilganlari o'chiriladi. */
export function takeQueue() {
  if (!fs.existsSync(queueDir())) return [];
  const out = [];
  for (const name of fs.readdirSync(queueDir()).filter((n) => n.endsWith('.json')).sort()) {
    const file = path.join(queueDir(), name);
    const evt = readJson(file);
    fs.rmSync(file, { force: true });
    if (evt) out.push(evt);
  }
  return out;
}

/* ----------------------------------- Sayt nomi (manzil) ----------------------------------- */
/**
 * Nom bandmi: tizim nomlari, repo'dagi mijozlar (clientsDirs) va bot saytlari.
 * Eski Vercel loyihalari/daromad yozuvlari server/panel.js takenSlugs() da qo'shimcha tekshiriladi.
 */
export function slugTaken(slug, { clientsDirs = [path.join(ROOT, 'clients')], reserved = [] } = {}) {
  if (!isSlug(slug)) return 'noto‘g‘ri nom';
  if (reserved.includes(slug)) return 'tizim nomi';
  for (const d of clientsDirs) if (d && fs.existsSync(path.join(d, slug))) return 'mavjud sayt';
  if (fs.existsSync(siteDir(slug))) return 'mavjud sayt';
  return '';
}

/* ------------------------------ Bir xil fayllarni birlashtirish ------------------------------ */
/**
 * Yig'ilgan saytdagi umumiy fayllar (images/, music/) DATA_DIR/shared ga hardlink qilinadi:
 * har bir bot sayti diskda ~1–2 MB joy oladi (40 MB emas).
 */
export function dedupe(dir) {
  const shared = path.join(DATA_DIR(), 'shared');
  fs.mkdirSync(shared, { recursive: true });
  let saved = 0;
  for (const sub of ['images', 'music', 'assets']) {
    const base = path.join(dir, sub);
    if (!fs.existsSync(base)) continue;
    for (const rel of fs.readdirSync(base, { recursive: true })) {
      const file = path.join(base, rel);
      const st = fs.statSync(file);
      if (!st.isFile() || st.size < 4096) continue;
      const hash = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
      const store = path.join(shared, `${hash}${path.extname(file)}`);
      if (fs.existsSync(store)) {
        if (fs.statSync(store).ino === st.ino) continue;
        fs.unlinkSync(file);
        fs.linkSync(store, file);
        saved += st.size;
      } else {
        fs.linkSync(file, store);
      }
    }
  }
  return saved;
}
