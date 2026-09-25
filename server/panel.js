// Boshqaruv paneli API (boshqaruv.<domen>/api/panel/*) — faqat egasining paroli (OWNER_PASSWORD) bilan.
//
//   GET  /api/panel/clients            — mijozlar ro'yxati (+ javoblar soni)
//   GET  /api/panel/client?slug=...    — bitta mijoz config'i va media fayllari
//   POST /api/panel/save               — { slug, isNew, config, media: {nom: base64}, deleteMedia: [nom] }
//   GET  /api/panel/status             — serverdagi versiya va oxirgi deploy holati
//   POST /api/panel/password           — { slug } → mijozning /admin paroli (bir marta ko'rsatiladi)
//
// Saqlash: serverdagi alohida git nusxada (PANEL_WORK_DIR) clients/<nom>/ yoziladi → commit →
// GitHub'ga push → deploy darhol boshlanadi (DEPLOY_TRIGGER fayli). GitHub — yagona manba:
// har o'zgarish tarixda qoladi va istalgan paytda orqaga qaytarish mumkin.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { requestContext } from '../api/_lib/context.js';
import { safeEqual, hashPassword } from '../api/_lib/http.js';
import { storeReady, listEntries, setAdminHash } from '../api/_lib/store.js';
import { SLUG_RE } from '../api/_lib/slug.js';
import { validateConfig } from '../src/lib/config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PANEL_SLUG = 'boshqaruv';
// Mijoz papkasi uchun ishlatib bo'lmaydigan nomlar (subdomen sifatida band)
export const RESERVED = new Set([PANEL_SLUG, 'www', 'api', 'admin', 'mail', 'ftp', 'static']);

const MEDIA_NAME = /^[\w.\-]{1,80}$/;
const MAX_BODY = 40 * 1024 * 1024;
const MAX_FILE = 12 * 1024 * 1024;

const env = (k, d = '') => process.env[k] || d;
const WORK = () => env('PANEL_WORK_DIR', '/opt/taklifnoma/panel-work');
const REPO_URL = () => env('PANEL_REPO_URL', 'https://github.com/alyorbek-tukhtasinov/WEDDING-VOLUME-2.git');
const BRANCH = () => env('PANEL_BRANCH', 'main');
const TRIGGER = () => env('DEPLOY_TRIGGER', '/opt/taklifnoma/trigger/deploy');
const STATUS = () => env('DEPLOY_STATUS', '/opt/taklifnoma/status.json');

class UserError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/* ------------------------------------------------------------------ */
/*  HTTP yordamchilari                                                 */
/* ------------------------------------------------------------------ */
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new UserError('too_large', "Yuborilgan ma'lumot juda katta (40 MB dan oshmasin)");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new UserError('bad_request', "So'rov noto'g'ri");
  }
}

// Parolni taxmin qilishga qarshi: bir IP dan 10 daqiqada 8 ta xato → vaqtincha blok
const fails = new Map();
function limited(ip) {
  const f = fails.get(ip);
  return f && f.count >= 8 && Date.now() - f.first < 10 * 60e3;
}
function noteFail(ip) {
  const f = fails.get(ip);
  if (!f || Date.now() - f.first > 10 * 60e3) fails.set(ip, { count: 1, first: Date.now() });
  else f.count++;
}

/* ------------------------------------------------------------------ */
/*  Git                                                                */
/* ------------------------------------------------------------------ */
function git(args, cwd = WORK()) {
  const pre = [];
  const token = env('GITHUB_TOKEN');
  if (token) {
    const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
    pre.push('-c', `http.extraHeader=Authorization: Basic ${basic}`);
  }
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      [...pre, ...args],
      { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, maxBuffer: 20e6, timeout: 120e3 },
      (err, stdout, stderr) => {
        // Xato matnida buyruq qatori (token bilan) bo'lmasligi uchun faqat stderr qaytariladi
        if (err) reject(new Error((stderr || '').trim().split('\n').slice(-3).join(' ') || `git ${args[0]} bajarilmadi`));
        else resolve(stdout.trim());
      },
    );
  });
}

let lastFetch = 0;
async function syncWork(force = false) {
  if (!fs.existsSync(path.join(WORK(), '.git'))) {
    fs.mkdirSync(path.dirname(WORK()), { recursive: true });
    await git(['clone', '-q', '--branch', BRANCH(), REPO_URL(), WORK()], path.dirname(WORK()));
    lastFetch = Date.now();
    return;
  }
  if (!force && Date.now() - lastFetch < 15e3) return;
  await git(['fetch', '-q', 'origin', BRANCH()]);
  await git(['reset', '-q', '--hard', `origin/${BRANCH()}`]);
  await git(['clean', '-qfd']);
  lastFetch = Date.now();
}

// Saqlashlar navbat bilan bajariladi (bir vaqtda ikki commit bo'lmasin)
let queue = Promise.resolve();
function serial(fn) {
  const p = queue.then(fn, fn);
  queue = p.catch(() => {});
  return p;
}

/* ------------------------------------------------------------------ */
/*  Mijozlar                                                           */
/* ------------------------------------------------------------------ */
const clientDir = (slug) => path.join(WORK(), 'clients', slug);

async function readConfig(slug) {
  const dir = clientDir(slug);
  const json = path.join(dir, 'config.json');
  const js = path.join(dir, 'config.js');
  if (fs.existsSync(json)) return { source: 'json', config: JSON.parse(fs.readFileSync(json, 'utf8')) };
  if (fs.existsSync(js)) {
    const mod = await import(`${pathToFileURL(js).href}?v=${fs.statSync(js).mtimeMs}`);
    return { source: 'js', config: structuredClone(mod.default) };
  }
  return null;
}

const mediaFiles = (slug) => {
  const dir = path.join(clientDir(slug), 'media');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => !n.startsWith('.')).sort() : [];
};

async function rsvpSummary(slug) {
  return requestContext.run({ slug, adminPassword: '' }, async () => {
    if (!storeReady()) return null;
    try {
      const entries = await listEntries();
      const yes = entries.filter((e) => e.attending === 'yes');
      return { total: entries.length, attending: yes.length, guests: yes.reduce((s, e) => s + (e.guests || 1), 0) };
    } catch {
      return null;
    }
  });
}

async function listClients() {
  await syncWork();
  const dir = path.join(WORK(), 'clients');
  const out = [];
  for (const slug of fs.readdirSync(dir).filter((n) => SLUG_RE.test(n)).sort()) {
    const r = await readConfig(slug).catch(() => null);
    if (!r) continue;
    const c = r.config;
    out.push({
      slug,
      template: c.template || 'volume2',
      groom: c.couple?.groom || '',
      bride: c.couple?.bride || '',
      date: c.event?.date || '',
      time: c.event?.time || '',
      venue: c.venue?.name || '',
      rsvp: await rsvpSummary(slug),
    });
  }
  return out;
}

// Fayl turi nomiga emas, mazmuniga qarab tekshiriladi
function sniff(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return 'jpg';
  if (hex.startsWith('89504e47')) return 'png';
  if (hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (hex.startsWith('494433') || /^fff[23ab]/.test(hex)) return 'mp3';
  if (buf.subarray(4, 8).toString() === 'ftyp') return 'm4a';
  return null;
}
const EXT_KIND = { jpg: 'jpg', jpeg: 'jpg', png: 'png', webp: 'webp', mp3: 'mp3', m4a: 'm4a' };

function checkSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug) || slug.length > 60) {
    throw new UserError('bad_slug', "Manzil nomi faqat kichik lotin harflari, raqam va \"-\" dan iborat bo'lishi kerak");
  }
  if (RESERVED.has(slug)) throw new UserError('bad_slug', `"${slug}" nomi band — boshqa nom tanlang`);
}

async function save(body) {
  const { slug, isNew } = body;
  const config = body.config;
  checkSlug(slug);
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new UserError('bad_request', "Ma'lumot noto'g'ri");
  if (JSON.stringify(config).length > 200e3) throw new UserError('too_large', "Sozlamalar juda katta");

  // Yangi fayllarni oldindan tekshiramiz (git'ga tegmasdan)
  const incoming = new Map();
  for (const [name, b64] of Object.entries(body.media || {})) {
    const ext = name.split('.').pop().toLowerCase();
    if (!MEDIA_NAME.test(name) || !EXT_KIND[ext]) throw new UserError('bad_media', `Fayl nomi noto'g'ri: ${name}`);
    const buf = Buffer.from(String(b64), 'base64');
    if (!buf.length || buf.length > MAX_FILE) throw new UserError('bad_media', `${name}: fayl bo'sh yoki 12 MB dan katta`);
    if (sniff(buf) !== EXT_KIND[ext]) throw new UserError('bad_media', `${name}: fayl turi kengaytmasiga mos emas`);
    incoming.set(name, buf);
  }

  return serial(async () => {
    await syncWork(true);
    const dir = clientDir(slug);
    const exists = fs.existsSync(dir);
    if (isNew && exists) throw new UserError('exists', `"${slug}" nomli mijoz allaqachon bor — boshqa nom tanlang`);
    if (!isNew && !exists) throw new UserError('not_found', `"${slug}" topilmadi`);

    const current = exists ? mediaFiles(slug) : [];
    const del = (body.deleteMedia || []).filter((n) => typeof n === 'string' && current.includes(n) && !incoming.has(n));
    const finalMedia = [...new Set([...current.filter((n) => !del.includes(n)), ...incoming.keys()])];
    const errors = validateConfig(config, finalMedia);
    if (errors.length) throw new UserError('validation', "Ma'lumotlarda xato bor", errors);

    const mediaDir = path.join(dir, 'media');
    fs.mkdirSync(mediaDir, { recursive: true });
    for (const n of del) fs.unlinkSync(path.join(mediaDir, n));
    for (const [n, buf] of incoming) fs.writeFileSync(path.join(mediaDir, n), buf);
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n');
    // Panel orqali saqlangan mijoz endi config.json dan o'qiladi
    if (fs.existsSync(path.join(dir, 'config.js'))) fs.unlinkSync(path.join(dir, 'config.js'));

    await git(['add', '-A', '--', `clients/${slug}`]);
    if (!(await git(['status', '--porcelain', '--', `clients/${slug}`]))) {
      return { sha: await git(['rev-parse', 'HEAD']), unchanged: true };
    }
    const names = `${config.couple?.groom || ''} & ${config.couple?.bride || ''}`;
    await git([
      '-c', 'user.name=Taklifnoma panel',
      '-c', 'user.email=panel@taklifnoma.local',
      'commit', '-q', '-m', `Panel: ${isNew ? 'yangi to‘y' : 'tahrir'} — ${slug} (${names})`,
    ]);
    try {
      await git(['push', '-q', 'origin', `HEAD:${BRANCH()}`]);
    } catch (err) {
      // Push bo'lmasa, mahalliy commit bekor qilinadi — keyingi urinish toza holatdan boshlanadi
      lastFetch = 0;
      await git(['reset', '-q', '--hard', `origin/${BRANCH()}`]).catch(() => {});
      throw new UserError('push_failed', `GitHub'ga yozib bo'lmadi: ${err.message}`);
    }
    const sha = await git(['rev-parse', 'HEAD']);
    triggerDeploy();
    return { sha };
  });
}

function triggerDeploy() {
  try {
    fs.mkdirSync(path.dirname(TRIGGER()), { recursive: true });
    fs.writeFileSync(TRIGGER(), `${Date.now()}\n`);
  } catch (err) {
    // Trigger ishlamasa ham taymer 2 daqiqa ichida o'zi yangilaydi
    console.error('Deploy trigger yozilmadi:', err.message);
  }
}

function status() {
  const read = (p) => {
    try {
      return fs.readFileSync(p, 'utf8');
    } catch {
      return '';
    }
  };
  let deploy = null;
  try {
    deploy = JSON.parse(read(STATUS()) || 'null');
  } catch {
    deploy = null;
  }
  return { deployed: read(path.join(ROOT, 'REVISION')).trim(), deploy };
}

// O'qish oson parol: o'xshash harflarsiz (0/O, 1/l/I)
function newPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

async function createPassword(slug) {
  checkSlug(slug);
  await syncWork();
  if (!fs.existsSync(clientDir(slug))) throw new UserError('not_found', `"${slug}" topilmadi`);
  const password = newPassword();
  await requestContext.run({ slug, adminPassword: '' }, async () => {
    if (!storeReady()) throw new UserError('store', 'Baza ulanmagan — parolni saqlab bo‘lmaydi');
    await setAdminHash(hashPassword(password));
  });
  return password;
}

/* ------------------------------------------------------------------ */
/*  Kirish nuqtasi                                                     */
/* ------------------------------------------------------------------ */
export async function panelHandler(req, res, name) {
  const expected = env('OWNER_PASSWORD').trim();
  if (!expected) return send(res, 503, { ok: false, error: 'no_password' });
  const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress || '');
  if (limited(ip)) return send(res, 429, { ok: false, error: 'too_many_attempts' });
  const header = req.headers.authorization || '';
  const given = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!given || !safeEqual(given, expected)) {
    noteFail(ip);
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { ok: false, error: 'unauthorized' });
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && name === 'clients') return send(res, 200, { ok: true, clients: await listClients(), ...status() });
    if (req.method === 'GET' && name === 'client') {
      const slug = url.searchParams.get('slug') || '';
      checkSlug(slug);
      await syncWork();
      const r = await readConfig(slug);
      if (!r) throw new UserError('not_found', `"${slug}" topilmadi`);
      return send(res, 200, { ok: true, slug, ...r, media: mediaFiles(slug) });
    }
    if (req.method === 'GET' && name === 'status') return send(res, 200, { ok: true, ...status() });
    if (req.method === 'POST' && name === 'save') return send(res, 200, { ok: true, ...(await save(await readJson(req))) });
    if (req.method === 'POST' && name === 'password') {
      const { slug } = await readJson(req);
      return send(res, 200, { ok: true, password: await createPassword(slug) });
    }
    return send(res, 404, { ok: false, error: 'not_found' });
  } catch (err) {
    if (err instanceof UserError) {
      return send(res, 422, { ok: false, error: err.code, message: err.message, details: err.details });
    }
    console.error('Panel xatosi:', err);
    return send(res, 500, { ok: false, error: 'server_error', message: err.message });
  }
}
