// Boshqaruv paneli API (boshqaruv.<domen>/api/panel/*) — faqat egasining paroli (OWNER_PASSWORD) bilan.
//
//   GET  /api/panel/clients            — mijozlar ro'yxati (+ javoblar soni)
//   GET  /api/panel/client?slug=...    — bitta mijoz config'i va media fayllari
//   POST /api/panel/save               — { slug, isNew, config, media: {nom: base64}, deleteMedia: [nom] }
//   GET  /api/panel/status             — serverdagi versiya va oxirgi deploy holati
//   POST /api/panel/password           — { slug } → mijozning /admin paroli (bir marta ko'rsatiladi)
//   GET  /api/panel/slugs              — band sayt nomlari va sababi (yangi sayt uchun)
//   POST /api/panel/paid               — { slug, paid } → ro'yxatdagi "To'langan" belgisi (daromad yozuvida)
//   POST /api/panel/musicdelete        — { id } → to'plamdan qo'shiqni o'chirish (ishlatilayotgan bo'lsa — rad etiladi)
//   POST /api/panel/pause              — { slug, paused } → saytni vaqtincha to'xtatish / qayta yoqish
//                                         (to'xtatilgan sayt "To'langan" belgilansa — o'zi yoqiladi)
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
import { storeReady, listEntries, setAdminHash, storeConfigured, getFinance, setFinance, slugsWithData, getSettings } from '../api/_lib/store.js';
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

// Demo (namuna) sayt: config'da demo: true/false aniq yozilgan bo'lsa — shu; aks holda nomi "demo" bilan boshlansa
export const isDemo = (slug, c) => (typeof c?.demo === 'boolean' ? c.demo : /^demo(-|$)/.test(slug));

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
      eventType: typeof c.eventType === 'string' ? c.eventType : 'nikoh',
      demo: isDemo(slug, c),
      paused: c.paused === true,
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
// MPEG audio (MP3) kadr sarlavhasi: 11 bit sinxron, Layer III, ruxsat etilgan bitreyt va chastota.
// MPEG 1, 2 va 2.5 (ffe2/ffe3 — kam uchraydi, eski tekshiruv tanimasdi).
function mp3Header(buf, i) {
  if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) return false;
  const version = (buf[i + 1] >> 3) & 3;
  const layer = (buf[i + 1] >> 1) & 3;
  const bitrate = buf[i + 2] >> 4;
  const rate = (buf[i + 2] >> 2) & 3;
  return version !== 1 && layer === 1 && bitrate !== 0 && bitrate !== 15 && rate !== 3;
}

/** Musiqa fayli turi: 'mp3' | 'm4a', aks holda { unknown: tushunarli nom } — xato xabari uchun. */
function sniffAudio(buf) {
  const k = sniff(buf);
  if (k === 'mp3' || k === 'm4a') return k;
  // Boshida bo'sh (0x00) baytlar bo'lgan MP3: birinchi haqiqiy kadr sarlavhasigacha o'tkazib yuboriladi
  let i = 0;
  while (i < Math.min(buf.length, 65536) && buf[i] === 0) i++;
  if (i < buf.length - 4 && mp3Header(buf, i)) return 'mp3';
  const head = buf.subarray(0, 12);
  const hex = head.toString('hex');
  if (head.subarray(0, 4).toString() === 'OggS') return { unknown: 'OGG/Opus' };
  if (hex.startsWith('1a45dfa3')) return { unknown: 'WebM (odatda YouTube/Instagram yuklagichlaridan)' };
  if (head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WAVE') return { unknown: 'WAV' };
  if (head.subarray(0, 4).toString() === 'fLaC') return { unknown: 'FLAC' };
  if (hex.startsWith('3026b275')) return { unknown: 'WMA' };
  return { unknown: null };
}

// mp4 (kirish videosi) ham m4a kabi "ftyp" konteyneri
const EXT_KIND = { jpg: 'jpg', jpeg: 'jpg', png: 'png', webp: 'webp', mp3: 'mp3', m4a: 'm4a', mp4: 'm4a' };

function checkSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug) || slug.length > 60) {
    throw new UserError('bad_slug', "Manzil nomi faqat kichik lotin harflari, raqam va \"-\" dan iborat bo'lishi kerak");
  }
  if (RESERVED.has(slug)) throw new UserError('bad_slug', `"${slug}" nomi band — boshqa nom tanlang`);
}

/**
 * Band sayt nomlari va sababi. Yangi sayt shu nomlardan birini ololmaydi: ishlab turgan sayt, avval
 * o'chirilgan sayt (git tarixi, daromad yozuvi), bazada boshqa (masalan, Vercel'dagi eski) loyihaning
 * javoblari/paroli bor nom, tizim nomlari. Bitta domen ostida ikki loyiha bo'lib qolmasligi uchun.
 */
async function takenSlugs() {
  const taken = {};
  const add = (slug, why) => {
    if (SLUG_RE.test(slug) && !taken[slug]) taken[slug] = why;
  };
  for (const s of RESERVED) add(s, 'tizim nomi');
  const dir = path.join(WORK(), 'clients');
  for (const s of fs.existsSync(dir) ? fs.readdirSync(dir) : []) add(s, 'mavjud sayt');
  try {
    const out = await git(['log', '--diff-filter=D', '--name-only', '--pretty=format:', '--', 'clients/']);
    for (const line of out.split('\n')) {
      const m = /^clients\/([a-z0-9-]+)\//.exec(line.trim());
      if (m) add(m[1], 'avval o‘chirilgan sayt');
    }
  } catch {
    /* git tarixi qisqa bo'lsa ham davom etamiz */
  }
  if (storeConfigured()) {
    try {
      const fin = await withFinanceStore(() => getFinance());
      for (const s of Object.keys(fin.items || {})) add(s, 'avval ishlatilgan nom (daromad yozuvi bor)');
      const data = await withFinanceStore(() => slugsWithData());
      for (const s of data) if (s !== PANEL_SLUG) add(s, 'bazada boshqa loyihaning javoblari bor');
    } catch (err) {
      console.error('Band nomlarni bazadan o‘qib bo‘lmadi:', err.message);
    }
  }
  return taken;
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
    if (isNew) {
      const why = (await takenSlugs())[slug];
      if (why) throw new UserError('exists', `"${slug}" nomi band (${why}) — boshqa nom tanlang`);
    }
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

/* ------------------------------------------------------------------ */
/*  Musiqa to'plami (faqat egasi — boshqaruv paneli orqali)             */
/* ------------------------------------------------------------------ */
const MAX_MUSIC = 15 * 1024 * 1024;
const MUSIC_JS = () => path.join(WORK(), 'src', 'lib', 'music.js');

// Qo'shiq nomi: oddiy matn, boshqaruv belgilarisiz
function cleanTitle(t) {
  return String(t || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function addMusic(body) {
  const title = cleanTitle(body?.title);
  if (title.length < 2 || title.length > 80) throw new UserError('bad_title', 'Qo‘shiq nomi 2–80 belgidan iborat bo‘lsin');
  const buf = Buffer.from(String(body?.file || ''), 'base64');
  if (!buf.length) throw new UserError('bad_media', 'Fayl tanlanmagan');
  if (buf.length > MAX_MUSIC) throw new UserError('bad_media', 'Fayl 15 MB dan katta — qisqaroq yoki siqilgan versiyasini yuklang');
  // Kengaytma nomdan emas, fayl mazmunidan aniqlanadi (".mp3" nomli M4A fayllar ham to'g'ri saqlanadi)
  const ext = sniffAudio(buf);
  if (typeof ext !== 'string') {
    throw new UserError(
      'bad_media',
      ext.unknown
        ? `Fayl nomi .mp3 bo‘lsa ham, ichida ${ext.unknown} audio bor. Uni MP3 ga o‘girib (masalan, onlayn “convert to mp3” xizmati bilan) qayta yuklang.`
        : 'Faqat MP3 yoki M4A audio fayl yuklash mumkin — bu fayl turi tanilmadi. MP3 ga o‘girib qayta yuklang.',
    );
  }

  return serial(async () => {
    await syncWork(true);
    const src = fs.readFileSync(MUSIC_JS(), 'utf8');
    const titles = [...src.matchAll(/title:\s*(['"])(.*?)\1/g)].map((m) => m[2].toLowerCase());
    if (titles.includes(title.toLowerCase())) throw new UserError('exists', `"${title}" allaqachon ro‘yxatda bor`);
    const nums = [...src.matchAll(/id:\s*'musiqa-(\d+)'/g)].map((m) => Number(m[1]));
    // O'chirilgan qo'shiq raqami qayta berilmaydi (brauzer keshida eski fayl qolgan bo'lishi mumkin)
    const gone = await git(['log', '--diff-filter=D', '--name-only', '--pretty=format:', '--', 'public/music/']).catch(() => '');
    for (const m of gone.matchAll(/musiqa-(\d+)\./g)) nums.push(Number(m[1]));
    const id = `musiqa-${Math.max(0, ...nums) + 1}`;
    const end = src.indexOf('\n];', src.indexOf('export const MUSIC_LIBRARY'));
    if (end < 0) throw new Error('music.js tuzilishi kutilganidek emas');
    const line = `\n  { id: '${id}', title: ${JSON.stringify(title)}, file: '/music/${id}.${ext}' },`;
    fs.writeFileSync(MUSIC_JS(), src.slice(0, end) + line + src.slice(end));
    fs.mkdirSync(path.join(WORK(), 'public', 'music'), { recursive: true });
    fs.writeFileSync(path.join(WORK(), 'public', 'music', `${id}.${ext}`), buf);

    await git(['add', '--', 'src/lib/music.js', `public/music/${id}.${ext}`]);
    await git(['-c', 'user.name=Taklifnoma panel', '-c', 'user.email=panel@taklifnoma.local', 'commit', '-q', '-m', `Panel: musiqa qo‘shildi — ${title}`]);
    try {
      await git(['push', '-q', 'origin', `HEAD:${BRANCH()}`]);
    } catch (err) {
      lastFetch = 0;
      await git(['reset', '-q', '--hard', `origin/${BRANCH()}`]).catch(() => {});
      throw new UserError('push_failed', `GitHub'ga yozib bo'lmadi: ${err.message}`);
    }
    triggerDeploy();
    return { id, title, file: `/music/${id}.${ext}`, sha: await git(['rev-parse', 'HEAD']) };
  });
}

// Qo'shiqni to'plamdan o'chirish. Biror to'y config'ida (musicTrack) yoki mijozning /admin tanlovida turgan
// bo'lsa — o'chirilmaydi: aks holda o'sha sayt yig'ilmay qoladi yoki musiqasi almashib ketadi.
async function removeMusic(body) {
  const id = String(body?.id || '');
  if (!/^[a-z0-9-]{1,40}$/.test(id)) throw new UserError('bad_request', 'Qo‘shiq tanlanmagan');
  return serial(async () => {
    await syncWork(true);
    const src = fs.readFileSync(MUSIC_JS(), 'utf8');
    const lineRe = new RegExp(`\\n[ \\t]*\\{[^\\n]*id:\\s*'${id}'[^\\n]*\\},?[ \\t]*(?=\\n)`);
    const line = lineRe.exec(src);
    if (!line) throw new UserError('not_found', 'Bu qo‘shiq to‘plamda topilmadi (ro‘yxatni yangilang)');
    const file = /file:\s*'\/music\/([\w.-]+)'/.exec(line[0])?.[1];
    const title = /title:\s*(['"])(.*?)\1/.exec(line[0])?.[2] || id;

    const users = [];
    const dir = path.join(WORK(), 'clients');
    for (const slug of fs.readdirSync(dir).filter((n) => SLUG_RE.test(n))) {
      const r = await readConfig(slug).catch(() => null);
      if (r?.config?.musicTrack === id) users.push(slug);
    }
    if (storeConfigured()) {
      for (const slug of fs.readdirSync(dir).filter((n) => SLUG_RE.test(n) && !users.includes(n))) {
        const st = await requestContext.run({ slug, adminPassword: '' }, () => getSettings()).catch(() => null);
        if (st?.music === id) users.push(`${slug} (mijoz /admin’da tanlagan)`);
      }
    }
    // Shablon/panelning standart qo'shig'i (kodda id bilan yozilgan) — o'chirilsa yangi saytlar yig'ilmaydi
    const codeFiles = (d) =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? codeFiles(path.join(d, e.name)) : /\.(js|ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : [],
      );
    const inCode = ['panel', 'templates', 'src']
      .flatMap((d) => codeFiles(path.join(WORK(), d)))
      .some((f) => f !== MUSIC_JS() && fs.readFileSync(f, 'utf8').includes(`'${id}'`));
    if (inCode) throw new UserError('in_use', `“${title}” — shablonning standart musiqasi, uni o‘chirib bo‘lmaydi.`);
    if (users.length) {
      throw new UserError('in_use', `“${title}” ishlatilmoqda: ${users.join(', ')}. Avval o‘sha saytlarda boshqa musiqa tanlang.`);
    }

    fs.writeFileSync(MUSIC_JS(), src.slice(0, line.index) + src.slice(line.index + line[0].length));
    await git(['add', '--', 'src/lib/music.js']);
    if (file && fs.existsSync(path.join(WORK(), 'public', 'music', file))) await git(['rm', '-q', '--', `public/music/${file}`]);
    await git(['-c', 'user.name=Taklifnoma panel', '-c', 'user.email=panel@taklifnoma.local', 'commit', '-q', '-m', `Panel: musiqa o‘chirildi — ${title}`]);
    try {
      await git(['push', '-q', 'origin', `HEAD:${BRANCH()}`]);
    } catch (err) {
      lastFetch = 0;
      await git(['reset', '-q', '--hard', `origin/${BRANCH()}`]).catch(() => {});
      throw new UserError('push_failed', `GitHub'ga yozib bo'lmadi: ${err.message}`);
    }
    triggerDeploy();
    return { id, title, sha: await git(['rev-parse', 'HEAD']) };
  });
}

/* ------------------------------------------------------------------ */
/*  Saytni o'chirish                                                    */
/* ------------------------------------------------------------------ */
// clients/<nom> GitHub'dan o'chiriladi → deploy'dan keyin sayt ochilmaydi. Tasodifan bosilmasligi
// uchun nomni qo'lda yozib tasdiqlash shart. Mehmon javoblari (Redis) o'chirilmaydi — xuddi shu nom
// bilan qayta yaratilsa, ular qaytadi.
async function removeClient(body) {
  const { slug, confirm } = body || {};
  checkSlug(slug);
  if (confirm !== slug) throw new UserError('confirm', 'Tasdiqlash uchun sayt nomini aynan yozing');
  return serial(async () => {
    await syncWork(true);
    if (!fs.existsSync(clientDir(slug))) throw new UserError('not_found', `"${slug}" topilmadi`);
    await git(['rm', '-r', '-q', '--', `clients/${slug}`]);
    // git rm kuzatilmagan fayllarni qoldirishi mumkin
    fs.rmSync(clientDir(slug), { recursive: true, force: true });
    await git(['-c', 'user.name=Taklifnoma panel', '-c', 'user.email=panel@taklifnoma.local', 'commit', '-q', '-m', `Panel: sayt o‘chirildi — ${slug}`]);
    try {
      await git(['push', '-q', 'origin', `HEAD:${BRANCH()}`]);
    } catch (err) {
      lastFetch = 0;
      await git(['reset', '-q', '--hard', `origin/${BRANCH()}`]).catch(() => {});
      throw new UserError('push_failed', `GitHub'ga yozib bo'lmadi: ${err.message}`);
    }
    triggerDeploy();
    return { slug, sha: await git(['rev-parse', 'HEAD']) };
  });
}

/* ------------------------------------------------------------------ */
/*  Vaqtincha to'xtatish (to'lov kutilmoqda)                            */
/* ------------------------------------------------------------------ */
// config.paused = true → deploy'da taklifnoma o'rniga "to'lov kutilmoqda" sahifasi chiqadi
// (scripts/build-all.js). Mehmon javoblari bazada qoladi — qayta yoqilganda hammasi joyida.
// changed: false — sayt allaqachon shu holatda edi (commit/deploy qilinmaydi).
async function setPausedFlag(slug, paused, why = '') {
  checkSlug(slug);
  return serial(async () => {
    await syncWork(true);
    const r = await readConfig(slug);
    if (!r) throw new UserError('not_found', `"${slug}" topilmadi`);
    if ((r.config.paused === true) === paused) return { slug, paused, changed: false };
    const config = { ...r.config };
    if (paused) config.paused = true;
    else delete config.paused;
    const dir = clientDir(slug);
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n');
    if (fs.existsSync(path.join(dir, 'config.js'))) fs.unlinkSync(path.join(dir, 'config.js'));
    await git(['add', '-A', '--', `clients/${slug}`]);
    const msg = `Panel: sayt ${paused ? 'to‘xtatildi' : 'yoqildi'}${why ? ` (${why})` : ''} — ${slug}`;
    await git(['-c', 'user.name=Taklifnoma panel', '-c', 'user.email=panel@taklifnoma.local', 'commit', '-q', '-m', msg]);
    try {
      await git(['push', '-q', 'origin', `HEAD:${BRANCH()}`]);
    } catch (err) {
      lastFetch = 0;
      await git(['reset', '-q', '--hard', `origin/${BRANCH()}`]).catch(() => {});
      throw new UserError('push_failed', `GitHub'ga yozib bo'lmadi: ${err.message}`);
    }
    triggerDeploy();
    return { slug, paused, changed: true, sha: await git(['rev-parse', 'HEAD']) };
  });
}

const setPause = (body) => setPausedFlag(String(body?.slug || ''), body?.paused === true);

// "To'langan" bo'lgan saytlar to'xtatilgan bo'lsa — avtomatik yoqiladi. Xato bo'lsa to'lov belgisi
// baribir saqlangan bo'ladi; panel foydalanuvchiga qo'lda yoqishni aytadi.
async function resumePaid(slugs) {
  const resumed = [];
  const failed = [];
  for (const slug of slugs) {
    if (!fs.existsSync(clientDir(slug))) continue;
    try {
      if ((await setPausedFlag(slug, false, 'to‘lov qilindi')).changed) resumed.push(slug);
    } catch (err) {
      console.error(`[${slug}] avtomatik yoqilmadi:`, err.message);
      failed.push(slug);
    }
  }
  return { resumed, resumeFailed: failed };
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
/*  Daromad (faqat egasi): qaysi sayt qanchaga sotilgan                 */
/* ------------------------------------------------------------------ */
// Ma'lumot Redis'da (GitHub'ga yozilmaydi — repo ochiq). Kalit "boshqaruv" nomi ostida.
function withFinanceStore(fn) {
  return requestContext.run({ slug: PANEL_SLUG, adminPassword: '' }, async () => {
    if (!storeConfigured()) throw new UserError('store', 'Baza ulanmagan — daromad ma’lumotlarini saqlab bo‘lmaydi');
    return fn();
  });
}

const MAX_AMOUNT = 1e12;
function cleanFinance(items) {
  if (!items || typeof items !== 'object' || Array.isArray(items)) throw new UserError('bad_request', "Ma'lumot noto'g'ri");
  const entries = Object.entries(items);
  if (entries.length > 2000) throw new UserError('too_large', 'Yozuvlar juda ko‘p');
  const out = {};
  for (const [slug, v] of entries) {
    if (!SLUG_RE.test(slug) || slug.length > 60) throw new UserError('bad_slug', `Noto'g'ri sayt nomi: ${slug}`);
    const amount = v?.amount === '' || v?.amount == null ? null : Number(v.amount);
    if (amount !== null && (!Number.isInteger(amount) || amount < 0 || amount > MAX_AMOUNT)) {
      throw new UserError('bad_amount', `${slug}: summa butun musbat son bo'lishi kerak`);
    }
    const note = String(v?.note ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
    const paid = v?.paid === true;
    if (amount === null && !note && !paid) continue; // bo'sh qator saqlanmaydi
    out[slug] = { ...(amount !== null ? { amount } : {}), ...(note ? { note } : {}), ...(paid ? { paid } : {}) };
  }
  return out;
}

const loadFinance = () => withFinanceStore(() => getFinance());
// Ro'yxatdagi "To'langan / To'lanmagan" tugmasi: faqat shu saytning belgisi o'zgaradi (boshqa yozuvlar joyida)
const setPaid = (body) =>
  withFinanceStore(async () => {
    const slug = String(body?.slug || '');
    if (!SLUG_RE.test(slug) || slug.length > 60) throw new UserError('bad_slug', `Noto'g'ri sayt nomi: ${slug}`);
    const cur = (await getFinance())?.items || {};
    const items = cleanFinance({ ...cur, [slug]: { ...(cur[slug] || {}), paid: body?.paid === true } });
    const data = { items, updatedAt: new Date().toISOString() };
    await setFinance(data);
    return { ...data, ...(await resumePaid(items[slug]?.paid ? [slug] : [])) };
  });
const saveFinance = (body) =>
  withFinanceStore(async () => {
    const before = (await getFinance())?.items || {};
    const items = cleanFinance(body?.items);
    const data = { items, updatedAt: new Date().toISOString() };
    await setFinance(data);
    // Faqat endi "To'langan" bo'lganlar (oldin to'langan bo'lib, qo'lda to'xtatilganlar tegilmaydi)
    const newlyPaid = Object.keys(items).filter((s) => items[s].paid && !before[s]?.paid);
    return { ...data, ...(await resumePaid(newlyPaid)) };
  });

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
    if (req.method === 'GET' && name === 'slugs') return send(res, 200, { ok: true, taken: await takenSlugs() });
    if (req.method === 'GET' && name === 'finance') return send(res, 200, { ok: true, ...(await loadFinance()) });
    if (req.method === 'POST' && name === 'finance') return send(res, 200, { ok: true, ...(await saveFinance(await readJson(req))) });
    if (req.method === 'POST' && name === 'paid') return send(res, 200, { ok: true, ...(await setPaid(await readJson(req))) });
    if (req.method === 'POST' && name === 'pause') return send(res, 200, { ok: true, ...(await setPause(await readJson(req))) });
    if (req.method === 'POST' && name === 'delete') return send(res, 200, { ok: true, ...(await removeClient(await readJson(req))) });
    if (req.method === 'POST' && name === 'musicdelete') return send(res, 200, { ok: true, ...(await removeMusic(await readJson(req))) });
    if (req.method === 'POST' && name === 'music') return send(res, 200, { ok: true, ...(await addMusic(await readJson(req))) });
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
