// Bot sayti (DATA_DIR/sites/<nom>) ni yig'ish → DATA_DIR/built/<nom>. Faqat shu bitta sayt — bir necha soniya.
//   node scripts/build-one.js <nom> [--domain documen.uz]
// Yig'ilmasa — eski versiya joyida qoladi. To'lanmagan sayt yig'ilmaydi; to'xtatilgan (paused) —
// faqat "to'lov kutilmoqda" sahifasi.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './client.js';
import { pausedPage } from './paused-page.js';
import { readSite, siteDir, builtDir, builtRoot, dedupe, STATUS, DATA_DIR } from '../server/data.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

export function buildOne(slug, { domain = (arg('domain') || process.env.SITE_DOMAIN || '').trim().toLowerCase(), log = console.log } = {}) {
  const site = readSite(slug);
  if (!site) throw new Error(`"${slug}" topilmadi (${DATA_DIR()})`);
  if (site.meta.status !== STATUS.paid) throw new Error(`"${slug}" hali to'lanmagan — yig'ilmaydi`);
  fs.mkdirSync(builtRoot(), { recursive: true });
  const target = builtDir(slug);
  const tmp = `${target}.tmp-${process.pid}`;
  fs.rmSync(tmp, { recursive: true, force: true });

  if (site.config.paused === true) {
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'index.html'), pausedPage());
    fs.copyFileSync(path.join(ROOT, 'public', 'favicon.ico'), path.join(tmp, 'favicon.ico'));
    fs.writeFileSync(path.join(tmp, '.paused'), '');
  } else {
    const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    const env = { ...process.env, WEDDING: slug, CLIENT_DIR: siteDir(slug), SITE_URL: domain ? `https://${slug}.${domain}` : '' };
    for (const k of Object.keys(env)) if (k.startsWith('VERCEL')) delete env[k];
    const r = spawnSync(process.execPath, [vite, 'build', '--outDir', tmp, '--emptyOutDir', '--logLevel', 'warn'], {
      cwd: ROOT,
      env,
      encoding: 'utf8',
      maxBuffer: 20e6,
      timeout: 180e3,
    });
    if (r.status !== 0 || !fs.existsSync(path.join(tmp, 'index.html'))) {
      fs.rmSync(tmp, { recursive: true, force: true });
      const lines = `${r.stderr || ''}\n${r.stdout || ''}\n${r.error?.message || ''}`.split('\n').filter((l) => l.trim() && !/^\s+at /.test(l));
      throw new Error(`"${slug}" yig'ilmadi: ${lines.slice(0, 8).join(' | ')}`);
    }
    // Mijoz /admin paneli bot saytlarida yo'q (javoblarni bot ko'rsatadi)
    fs.rmSync(path.join(tmp, 'admin.html'), { force: true });
    const saved = dedupe(tmp);
    if (saved) log(`  umumiy fayllar: ${(saved / 1048576).toFixed(0)} MB tejaldi`);
  }

  // Almashtirish: avval eskisi chetga, yangisi o'rniga, keyin eskisi o'chiriladi
  const old = `${target}.old-${process.pid}`;
  if (fs.existsSync(target)) fs.renameSync(target, old);
  fs.renameSync(tmp, target);
  fs.rmSync(old, { recursive: true, force: true });
  return target;
}

// To'g'ridan-to'g'ri ishga tushirilganda
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const slug = process.argv[2];
  try {
    const t0 = Date.now();
    buildOne(slug);
    console.log(`✔ "${slug}" yig'ildi (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (err) {
    console.error(`✖ ${err.message}`);
    process.exit(1);
  }
}
