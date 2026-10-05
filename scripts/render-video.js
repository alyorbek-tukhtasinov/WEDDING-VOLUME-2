// Taklifnoma saytidan Instagram uchun video (MP4, 1080×1920, 30 kadr/s, saytning musiqasi bilan).
//
//   node scripts/render-video.js <nom> [--out video.mp4] [--site <yig'ilgan sayt papkasi>]
//
// Sayt sahifasining vaqti to'xtatiladi va har kadr alohida, to'liq sifatda chiziladi (Chromium "virtual vaqt"):
// server kuchsiz bo'lsa ham video silliq chiqadi — faqat tayyorlash uzoqroq davom etadi.
// Ssenariy: kirish (konvert/eshik) → ochiladi → sayt oxirigacha aylanadi (kitob — varaqlanadi, yz — bo'limlar
// almashadi) → oxirida biroz to'xtaydi. Video uzunligi — sayt oxiriga yetguncha ketgan vaqt (ko'pi bilan MAX_SECONDS).
//
// Kerak: playwright-core + Chromium (PLAYWRIGHT_BROWSERS_PATH), ffmpeg (serverda install.sh o'rnatadi).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { musicUrlOf } from '../src/lib/config.js';
import { readSite } from '../server/data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITES_DIR = () => path.resolve(process.env.SITES_DIR || path.join(ROOT, 'sites'));
const MAX_SECONDS = () => Number(process.env.VIDEO_MAX_SECONDS) || 150;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.ico': 'image/x-icon',
};

/** Sayt sozlamalari: bot sayti (DATA_DIR) yoki repo'dagi clients/<nom> */
async function configOf(slug) {
  const bot = readSite(slug);
  if (bot) return bot.config;
  for (const name of ['config.json', 'config.js']) {
    const p = path.join(ROOT, 'clients', slug, name);
    if (!fs.existsSync(p)) continue;
    if (name.endsWith('.json')) return JSON.parse(fs.readFileSync(p, 'utf8'));
    return (await import(pathToFileURL(p).href)).default;
  }
  return {};
}

function serve(dir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        return res.end('{"ok":true,"wishes":[],"settings":null,"enabled":false}');
      }
      if (p === '/') p = '/index.html';
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.statusCode = 404;
        return res.end();
      }
      res.setHeader('Content-Type', TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function run(cmd, args, timeoutMs = 20 * 60e3) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err = (err + d).slice(-3000)));
    const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    p.on('error', reject);
    p.on('close', (code) => {
      clearTimeout(t);
      code === 0 ? resolve() : reject(new Error(`${cmd}: ${err.trim().split('\n').slice(-3).join(' | ')}`));
    });
  });
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * @returns {Promise<{ file: string, seconds: number, frames: number }>}
 */
export async function renderVideo(slug, { out, siteDir, onProgress = () => {}, fps = 30, log = () => {} } = {}) {
  const dir = fs.realpathSync(siteDir || path.join(SITES_DIR(), slug));
  if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error(`"${slug}" sayti topilmadi (${dir})`);
  if (fs.existsSync(path.join(dir, '.paused'))) throw new Error(`"${slug}" to'xtatilgan — video tayyorlab bo'lmaydi`);
  const c = await configOf(slug);
  const template = c.template || 'volume2';
  const speedK = Number(c.autoScrollSpeed) > 0 ? Math.min(3, Math.max(0.5, Number(c.autoScrollSpeed))) : 1;
  const musicRel = musicUrlOf(template === 'yz' && !c.musicTrack && !c.music && c.musicUrl === undefined ? { ...c, musicTrack: 'musiqa-4' } : c);
  const musicFile = musicRel && fs.existsSync(path.join(dir, musicRel)) ? path.join(dir, musicRel) : '';

  const tmpRoot = process.env.VIDEO_TMP || os.tmpdir();
  fs.mkdirSync(tmpRoot, { recursive: true });
  const work = fs.mkdtempSync(path.join(tmpRoot, `video-${slug}-`));
  const target = path.resolve(out || path.join(work, `${slug}.mp4`));
  // Kadrlar diskka yozilmaydi — to'g'ridan-to'g'ri ffmpeg'ga (150 s video ham ~20–45 MB, vaqtinchalik fayl yo'q)
  const silent = path.join(work, 'silent.mp4');
  const enc = spawn(process.env.FFMPEG || 'ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', process.env.VIDEO_PRESET || 'veryfast', '-crf', '21', '-maxrate', '4500k', '-bufsize', '9000k',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(fps), '-an', silent,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  let encErr = '';
  enc.stderr.on('data', (d) => (encErr = (encErr + d).slice(-2000)));
  const encDone = new Promise((resolve, reject) => {
    enc.on('error', reject);
    enc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg: ${encErr.trim().split('\n').slice(-2).join(' | ') || code}`))));
  });
  const writeFrame = (buf) => new Promise((r) => (enc.stdin.write(buf) ? r() : enc.stdin.once('drain', r)));
  const srv = await serve(dir);
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ chromiumSandbox: false, args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
  let frames = 0;
  try {
    const W = 405;
    const H = 720;
    const DPR = 1080 / W;
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
    await page.addInitScript(() => {
      globalThis.__TAKLIFNOMA_VIDEO__ = true;
      const st = document.createElement('style');
      st.textContent = '.ascroll,#music-toggle,.fab--music{display:none!important}html{scroll-behavior:auto!important}';
      document.addEventListener('DOMContentLoaded', () => document.head.append(st));
      // Sahifada hech qanday CSS animatsiya ishlamay qolsa (masalan, harakatsiz bo'limlar), vaqt to'xtatilgan
      // headless brauzer yangi kadr chizmaydi va captureScreenshot qaytmaydi. Shu 1 pikselli, deyarli
      // ko'rinmas nuqtaning doimiy animatsiyasi kadrlarni uzluksiz ushlab turadi.
      document.addEventListener('DOMContentLoaded', () => {
        const dot = document.createElement('div');
        dot.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;background:#000;opacity:.01;pointer-events:none;z-index:2147483647;animation:__vt_tick 1s linear infinite';
        const kf = document.createElement('style');
        kf.textContent = '@keyframes __vt_tick{50%{opacity:.02}}';
        document.head.append(kf);
        document.body.append(dot);
      });
    });
    await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: 'load', timeout: 60e3 });
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(2500); // rasmlar, osmon (WebGL) va shriftlar tayyor bo'lsin

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: true });
    await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
    const frameMs = 1000 / fps;
    const maxFrames = Math.round(MAX_SECONDS() * fps);
    const tick = async () => {
      await new Promise((r) => {
        cdp.once('Emulation.virtualTimeBudgetExpired', r);
        cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: frameMs });
      });
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
      await writeFrame(Buffer.from(shot.data, 'base64'));
      frames++;
      if (frames % fps === 0) onProgress(frames / fps);
      return frames < maxFrames;
    };
    const hold = async (sec) => {
      for (let i = 0; i < Math.round(sec * fps); i++) if (!(await tick())) return false;
      return true;
    };

    // 1) Kirish ekrani → ochish
    await hold(1.2);
    const opened = await page.evaluate(() => {
      const b = document.querySelector('#gate-open, #envelope-open, #open-book');
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    if (!opened && template === 'yz') {
      // yz: konvertning o'zini bosish (vaqt to'xtatilganda sichqoncha hodisalari javob kutib qotadi —
      // shuning uchun sahifa ichidan .click())
      await page.evaluate(() => {
        for (const y of [0.5, 0.45, 0.55, 0.4]) {
          const el = document.elementFromPoint(innerWidth / 2, innerHeight * y);
          if (el) {
            el.click();
            break;
          }
        }
      });
    }
    await hold(template === 'yz' ? 3.2 : 2.6);

    // 2) Sayt bo'ylab harakat
    if (template === 'kitob') {
      for (let n = 0; n < 40; n++) {
        const more = await page.evaluate(() => {
          const b = document.querySelector('#next');
          if (!b || b.disabled) return false;
          b.click();
          return true;
        });
        if (!more || !(await hold(3.2 / speedK))) break;
      }
    } else if (template === 'yz') {
      await page.evaluate(() => {
        const box = document.getElementById('wedding-scroll');
        if (box) box.style.scrollSnapType = 'none';
      });
      for (let n = 0; n < 12; n++) {
        const st = await page.evaluate(() => {
          const b = document.getElementById('wedding-scroll');
          return b ? { top: b.scrollTop, h: b.clientHeight, max: b.scrollHeight - b.clientHeight } : null;
        });
        if (!st || st.top >= st.max - 2) break;
        if (!(await hold((n === 1 ? 4.6 : 3) / speedK))) break;
        const from = st.top;
        const to = Math.min(st.max, from + st.h);
        const steps = Math.round(0.9 * fps);
        for (let i = 1; i <= steps; i++) {
          await page.evaluate((y) => (document.getElementById('wedding-scroll').scrollTop = y), from + (to - from) * ease(i / steps));
          if (!(await tick())) break;
        }
      }
    } else {
      // Silliq aylantirish: saytdagi avto-aylantirish tezligi (config.autoScrollSpeed bilan)
      const v = Math.min(115, Math.max(62, H * 0.11)) * speedK;
      let y = await page.evaluate(() => scrollY);
      let max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      // Boshlanishi va oxiri yumshoq: 0.8 s da tezlashadi, oxirgi ~0.8 s yo'lda sekinlashadi
      let t = 0;
      while (y < max - 1) {
        t += 1 / fps;
        const left = max - y;
        const k = Math.min(1, t / 0.8) * Math.min(1, Math.max(0.25, left / (v * 0.8)));
        y = Math.min(max, y + (v * k) / fps);
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        if (!(await tick())) break;
        if (frames % fps === 0) max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      }
    }
    await hold(2.5);
  } catch (err) {
    enc.kill('SIGKILL');
    fs.rmSync(work, { recursive: true, force: true });
    throw err;
  } finally {
    await browser.close().catch(() => {});
    srv.close();
  }
  enc.stdin.end();
  await encDone;

  // 3) Musiqa qo'shiladi (oxirida sekin pasayadi); video qayta kodlanmaydi
  const seconds = frames / fps;
  const fadeAt = Math.max(0, seconds - 2.5).toFixed(2);
  const mux = (videoArgs) => {
    const args = ['-y', '-loglevel', 'error', '-i', silent];
    if (musicFile) args.push('-stream_loop', '-1', '-i', musicFile);
    else args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
    args.push(
      '-filter_complex', `[1:a]atrim=0:${seconds.toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${fadeAt}:d=2.5[a]`,
      '-map', '0:v', '-map', '[a]', '-t', seconds.toFixed(2), ...videoArgs, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', target,
    );
    return run(process.env.FFMPEG || 'ffmpeg', args);
  };
  log(`ffmpeg: ${frames} kadr (${seconds.toFixed(1)} s)`);
  await mux(['-c:v', 'copy']);
  // Telegram bot orqali 50 MB gacha yuboriladi — kattaroq bo'lsa, bitreyt kamaytiriladi
  const LIMIT = 48 * 1024 * 1024;
  if (fs.statSync(target).size > LIMIT) {
    const kbps = Math.floor((LIMIT * 8 * 0.92) / seconds / 1000) - 128;
    log(`hajm katta — ${kbps} kbit/s bilan qayta kodlanadi`);
    await mux(['-c:v', 'libx264', '-preset', process.env.VIDEO_PRESET || 'veryfast', '-b:v', `${kbps}k`, '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`, '-pix_fmt', 'yuv420p']);
  }
  fs.rmSync(silent, { force: true });
  if (!out) return { file: target, seconds, frames, work };
  fs.rmSync(work, { recursive: true, force: true });
  return { file: target, seconds, frames };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  const arg = (n) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > -1 ? process.argv[i + 1] : undefined;
  };
  const t0 = Date.now();
  renderVideo(slug, { out: arg('out'), siteDir: arg('site'), onProgress: (s) => process.stdout.write(`\r  ${s} s yozildi…`), log: (m) => console.log(`\n  ${m}`) })
    .then((r) => console.log(`\n✔ ${r.file} — ${r.seconds.toFixed(1)} s video, ${((Date.now() - t0) / 1000).toFixed(0)} s da tayyorlandi`))
    .catch((err) => {
      console.error(`\n✖ ${err.message}`);
      process.exit(1);
    });
}
