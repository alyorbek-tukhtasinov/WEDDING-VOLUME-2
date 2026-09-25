// Barcha mijozlarni o'z serverimiz uchun yig'ish: har biri <out>/<nom>/ papkasiga.
// Foydalanish: node scripts/build-all.js --out sites [--domain documen.uz]
//   --domain (yoki SITE_DOMAIN) — og:image/og:url uchun to'liq manzil: https://<nom>.<domen>
// Bitta mijoz ham yig'ilmasa — butun jarayon xato bilan tugaydi (yarim-yig'ilgan versiya chiqmaydi).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, listClients } from './client.js';

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

for (const slug of clients) {
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
const [first, ...rest] = clients;
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

console.log(`✔ ${clients.length - 1} ta taklifnoma va boshqaruv paneli yig'ildi → ${out} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
