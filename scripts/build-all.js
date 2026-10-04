// Barcha mijozlarni o'z serverimiz uchun yig'ish: har biri <out>/<nom>/ papkasiga.
// Foydalanish: node scripts/build-all.js --out sites [--domain documen.uz]
//   --domain (yoki SITE_DOMAIN) — og:image/og:url uchun to'liq manzil: https://<nom>.<domen>
// Bitta mijoz ham yig'ilmasa — butun jarayon xato bilan tugaydi (yarim-yig'ilgan versiya chiqmaydi).
import { spawnSync } from 'node:child_process';
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
  const env = { ...process.env, WEDDING: slug, SITE_URL: domain ? `https://${slug}.${domain}` : '' };
  // Vercel o'zgaruvchilari tasodifan qolgan bo'lsa, nom/manzil aniqlashga aralashmasin
  for (const k of Object.keys(env)) if (k.startsWith('VERCEL')) delete env[k];

  const target = path.join(out, slug);
  const r = spawnSync(process.execPath, [vite, 'build', '--outDir', target, '--emptyOutDir', '--logLevel', 'warn'], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  });
  if (r.status !== 0 || !fs.existsSync(path.join(target, 'index.html'))) {
    console.error(`\n✖ "${slug}" yig'ilmadi — hech narsa almashtirilmaydi.`);
    process.exit(1);
  }
}

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
}

// Umumiy fayllar (musiqa, dizayn rasmlari) har saytda bir xil — diskda bir marta turishi uchun hardlink
let saved = 0;
const [first, ...rest] = clients.filter((s) => !paused.includes(s));
for (const dir of ['images', 'music']) {
  const base = path.join(out, first, dir);
  if (!fs.existsSync(base)) continue;
  for (const file of fs.readdirSync(base, { recursive: true })) {
    const src = path.join(base, file);
    if (!fs.statSync(src).isFile()) continue;
    const data = fs.readFileSync(src);
    for (const slug of rest) {
      const dst = path.join(out, slug, dir, file);
      if (!fs.existsSync(dst) || fs.statSync(dst).ino === fs.statSync(src).ino) continue;
      if (!data.equals(fs.readFileSync(dst))) continue;
      fs.unlinkSync(dst);
      fs.linkSync(src, dst);
      saved += data.length;
    }
  }
}
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

if (paused.length) console.log(`  to'xtatilgan (to'lov kutilmoqda): ${paused.join(', ')}`);
console.log(`✔ ${clients.length - 1} ta taklifnoma va boshqaruv paneli yig'ildi → ${out} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
