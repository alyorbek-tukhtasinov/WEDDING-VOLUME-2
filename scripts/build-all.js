// Barcha mijozlarni o'z serverimiz uchun yig'ish: har biri <out>/<nom>/ papkasiga.
// Foydalanish: node scripts/build-all.js --out sites [--domain documen.uz]
//   --domain (yoki SITE_DOMAIN) — og:image/og:url uchun to'liq manzil: https://<nom>.<domen>
// Bitta mijoz ham yig'ilmasa — butun jarayon xato bilan tugaydi (yarim-yig'ilgan versiya chiqmaydi).
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, listClients, loadClient } from './client.js';
import { pausedPage } from './paused-page.js';
import { buildOne } from './build-one.js';
import { listSites, builtDir, STATUS, DATA_DIR } from '../server/data.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const out = path.resolve(arg('out') || path.join(ROOT, 'sites'));
const domain = (arg('domain') || process.env.SITE_DOMAIN || '').trim().toLowerCase();
const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

if (!fs.existsSync(vite)) {
  console.error('✖ vite topilmadi — avval "npm ci" ni ishga tushiring.');
  process.exit(1);
}

const clients = listClients();
fs.mkdirSync(out, { recursive: true });
const started = Date.now();
const paused = [];

// Kesh: o'zgarmagan sayt qayta yig'ilmaydi — oldingi versiyadagi papka hardlink bilan olinadi
// (nusxa emas, joy ham olmaydi). Sayt o'zgargan hisoblanadi, agar clients/<nom> yoki umumiy kod
// (src, templates, public, vite sozlamasi, paketlar, domen) o'zgargan bo'lsa.
//   --cache <oldingi sites papkasi>  (deploy.sh beradi). Kalitlar: <papka>/../.build-cache.json
// deploy.sh eski nusxasi --cache bermaydi: /opt/taklifnoma/releases/<v>.tmp/sites → /opt/taklifnoma/current/sites
const autoCache = path.basename(path.dirname(path.dirname(out))) === 'releases' ? path.join(path.dirname(path.dirname(path.dirname(out))), 'current', 'sites') : '';
const cacheDir = arg('cache') ? path.resolve(arg('cache')) : autoCache && fs.existsSync(autoCache) ? autoCache : '';
const manifestOf = (sitesDir) => path.join(path.dirname(sitesDir), '.build-cache.json');
let prevManifest = {};
try {
  if (cacheDir) prevManifest = JSON.parse(fs.readFileSync(manifestOf(cacheDir), 'utf8'));
} catch {
  prevManifest = {};
}

function hashTree(hash, dir, skip = new Set()) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).sort()) {
    if (skip.has(name) || name === '.DS_Store' || name === 'Thumbs.db') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) hashTree(hash, p);
    else if (st.isFile()) hash.update(`${path.relative(ROOT, p)}\0${st.size}\0`).update(fs.readFileSync(p));
  }
}
// Sayt yig'ilishiga ta'sir qilmaydigan papkalar (server, testlar, deploy, panel) kalitga kirmaydi
const NOT_SITE = new Set(['node_modules', 'clients', 'sites', 'dist', 'server', 'tests', 'e2e', 'deploy', 'panel', 'api', '.git', '.data', '.build-cache.json', 'README.md']);
const codeHash = (() => {
  const h = crypto.createHash('sha256');
  h.update(`${process.version}\0${domain}\0`);
  for (const [k, v] of Object.entries(process.env).sort()) if (k.startsWith('VITE_')) h.update(`${k}=${v}\0`);
  hashTree(h, ROOT, NOT_SITE);
  return h.digest('hex');
})();
const keyOf = (slug) => {
  const h = crypto.createHash('sha256').update(codeHash);
  hashTree(h, path.join(ROOT, 'clients', slug));
  return h.digest('hex');
};
const manifest = {};
const reused = [];
const fresh = [];

function reuse(slug) {
  const key = manifest[slug];
  const src = cacheDir && path.join(cacheDir, slug);
  if (!src || prevManifest[slug] !== key) return false;
  if (!fs.existsSync(path.join(src, 'index.html')) || fs.lstatSync(src).isSymbolicLink()) return false;
  const target = path.join(out, slug);
  fs.rmSync(target, { recursive: true, force: true });
  const r = spawnSync('cp', ['-al', src, target], { stdio: 'inherit' });
  if (r.status !== 0) {
    fs.rmSync(target, { recursive: true, force: true });
    return false;
  }
  return true;
}

function viteBuild(slug) {
  const env = { ...process.env, WEDDING: slug, SITE_URL: domain ? `https://${slug}.${domain}` : '' };
  // Vercel o'zgaruvchilari tasodifan qolgan bo'lsa, nom/manzil aniqlashga aralashmasin
  for (const k of Object.keys(env)) if (k.startsWith('VERCEL')) delete env[k];
  const target = path.join(out, slug);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [vite, 'build', '--outDir', target, '--emptyOutDir', '--logLevel', 'warn'], {
      cwd: ROOT,
      env,
      stdio: 'inherit',
    });
    running.add(child);
    child.on('close', (code) => {
      running.delete(child);
      resolve(code === 0 && fs.existsSync(path.join(target, 'index.html')));
    });
    child.on('error', () => resolve(false));
  });
}
const running = new Set();

const toBuild = [];
for (const slug of clients) {
  // To'xtatilgan sayt (panel: "To'xtatish"): taklifnoma yig'ilmaydi — faqat "to'lov kutilmoqda" sahifasi.
  // Ism, rasm, musiqa diskda umuman bo'lmaydi; .paused belgisi bo'yicha server API'ni ham yopadi.
  if ((await loadClient(slug)).config.paused === true) {
    const target = path.join(out, slug);
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'index.html'), pausedPage());
    fs.copyFileSync(path.join(ROOT, 'public', 'favicon.ico'), path.join(target, 'favicon.ico'));
    fs.writeFileSync(path.join(target, '.paused'), '');
    paused.push(slug);
    continue;
  }
  manifest[slug] = keyOf(slug);
  if (reuse(slug)) reused.push(slug);
  else toBuild.push(slug);
}

// Bir xil fayllar diskda bir marta turadi (hardlink). Har sayt yig'ilishi bilan darhol bajariladi —
// aks holda 35+ sayt × ~45 MB musiqa vaqtincha diskni to'ldirib qo'yadi.
//  1) o'sha saytning oldingi versiyasi bilan (--cache) — o'zgarmagan rasm/musiqa qayta joy olmaydi
//  2) umumiy fayllar (dizayn rasmlari, musiqa) — bitta namuna sayt bilan
let saved = 0;
let refDir = '';
function pickRef() {
  const r = reused.find((s) => fs.existsSync(path.join(out, s, 'music')));
  if (r) return path.join(out, r);
  if (cacheDir && fs.existsSync(cacheDir)) {
    for (const s of fs.readdirSync(cacheDir)) {
      const d = path.join(cacheDir, s);
      if (!fs.lstatSync(d).isSymbolicLink() && fs.existsSync(path.join(d, 'music')) && !fs.existsSync(path.join(d, '.paused'))) return d;
    }
  }
  return '';
}
function linkSame(dir, ref, sub = '') {
  if (!ref || !fs.existsSync(path.join(ref, sub))) return;
  for (const name of fs.readdirSync(path.join(dir, sub))) {
    const rel = path.join(sub, name);
    const dst = path.join(dir, rel);
    const src = path.join(ref, rel);
    const ds = fs.lstatSync(dst);
    if (ds.isDirectory()) {
      linkSame(dir, ref, rel);
      continue;
    }
    if (!ds.isFile() || !fs.existsSync(src)) continue;
    const st = fs.lstatSync(src);
    if (!st.isFile() || st.ino === ds.ino || st.size !== ds.size) continue;
    if (!fs.readFileSync(src).equals(fs.readFileSync(dst))) continue;
    const tmp = `${dst}.link-${process.pid}`;
    fs.linkSync(src, tmp);
    fs.renameSync(tmp, dst);
    saved += ds.size;
  }
}
function dedupeFresh(slug) {
  const dir = path.join(out, slug);
  if (cacheDir) linkSame(dir, path.join(cacheDir, slug));
  refDir ||= pickRef();
  if (!refDir) {
    refDir = dir;
    return;
  }
  for (const sub of ['images', 'music']) if (fs.existsSync(path.join(dir, sub))) linkSame(dir, refDir, sub);
}

// Bir vaqtda bir nechta sayt (standart: 2 ta, xotira 2 GB dan kam bo'lsa — 1 ta; BUILD_JOBS bilan o'zgartiriladi)
const jobs = Math.max(1, Math.min(Number(process.env.BUILD_JOBS) || (os.totalmem() < 2 * 1024 ** 3 ? 1 : Math.min(2, os.cpus().length)), 8));
let next = 0;
async function worker() {
  while (next < toBuild.length) {
    const slug = toBuild[next++];
    if (!(await viteBuild(slug))) {
      console.error(`\n✖ "${slug}" yig'ilmadi — hech narsa almashtirilmaydi.`);
      for (const c of running) c.kill();
      process.exit(1);
    }
    fresh.push(slug);
    dedupeFresh(slug);
  }
}
await Promise.all(Array.from({ length: Math.min(jobs, toBuild.length) }, worker));

// Boshqaruv paneli (boshqaruv.<domen>) — mijozlar bilan birga yig'iladi
{
  const target = path.join(out, 'boshqaruv');
  const r = spawnSync(process.execPath, [vite, 'build', '--config', path.join(ROOT, 'panel', 'vite.config.js'), '--outDir', target, '--emptyOutDir', '--logLevel', 'warn'], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
  if (r.status !== 0 || !fs.existsSync(path.join(target, 'index.html'))) {
    console.error('\n✖ Boshqaruv paneli yig\'ilmadi — hech narsa almashtirilmaydi.');
    process.exit(1);
  }
  clients.push('boshqaruv');
  fresh.push('boshqaruv');
  dedupeFresh('boshqaruv');
}

// Umumiy fayllar (musiqa, dizayn rasmlari) har saytda bir xil — diskda bir marta turishi uchun hardlink
if (saved) console.log(`  umumiy fayllar birlashtirildi: ${(saved / 1048576).toFixed(0)} MB tejaldi`);

// Bot orqali yaratilgan (to'langan) saytlar: DATA_DIR/built/<nom> ga symlink — har deploy'da qayta
// yig'ilmaydi (bot o'zgarishda faqat o'sha saytni yig'adi). Bitta bot sayti xato bersa — boshqalariga ta'sir qilmaydi.
let linked = 0;
for (const site of listSites().filter((s) => s.meta.status === STATUS.paid)) {
  const { slug } = site;
  if (clients.includes(slug)) {
    console.warn(`  ! "${slug}" repo'da ham bor — bot sayti o'tkazib yuborildi`);
    continue;
  }
  try {
    if (!fs.existsSync(path.join(builtDir(slug), 'index.html'))) buildOne(slug, { domain });
    fs.rmSync(path.join(out, slug), { recursive: true, force: true });
    fs.symlinkSync(builtDir(slug), path.join(out, slug));
    linked++;
  } catch (err) {
    console.warn(`  ! bot sayti "${slug}": ${err.message}`);
  }
}
if (linked) console.log(`  bot saytlari ulandi: ${linked} ta (${DATA_DIR()})`);

// Keyingi deploy uchun kalitlar (sites papkasining yonida — saytlar ichida emas)
fs.writeFileSync(manifestOf(out), JSON.stringify(manifest));
if (reused.length) console.log(`  o'zgarmagan, qayta yig'ilmadi: ${reused.length} ta`);
if (paused.length) console.log(`  to'xtatilgan (to'lov kutilmoqda): ${paused.join(', ')}`);
console.log(`✔ ${clients.length - 1} ta taklifnoma va boshqaruv paneli yig'ildi → ${out} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
