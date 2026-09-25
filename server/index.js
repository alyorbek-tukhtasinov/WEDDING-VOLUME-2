// O'z serverimizda (VPS) barcha taklifnomalar uchun bitta API jarayoni.
// Statik saytlarni nginx o'zi beradi; /api/* so'rovlarini esa shu yerga yo'naltiradi va
// taklifnoma nomini X-Wedding-Slug sarlavhasida yuboradi (manzildan: <nom>.<domen>).
// Jarayon faqat 127.0.0.1 da tinglaydi — sarlavhani tashqaridan soxtalashtirib bo'lmaydi.
//
// Muhit o'zgaruvchilari (/etc/taklifnoma/env):
//   REDIS_URL (yoki Upstash REST o'zgaruvchilari) — api/_lib/store.js ga qarang
//   ADMIN_PASSWORD__<NOM> — har mijozning admin paroli, masalan ADMIN_PASSWORD__SALIMBOY_JASMINAXON
//   SITES_DIR — yig'ilgan saytlar papkasi (sites/<nom>/index.html), PORT — standart 3190
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestContext } from '../api/_lib/context.js';
import { SLUG_RE } from '../api/_lib/slug.js';
import rsvp from '../api/rsvp.js';
import wishes from '../api/wishes.js';
import settings from '../api/settings.js';
import admin from '../api/admin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITES_DIR = path.resolve(process.env.SITES_DIR || path.join(ROOT, 'sites'));
const PORT = Number(process.env.PORT) || 3190;
const HANDLERS = { rsvp, wishes, settings, admin };

export const passwordVar = (slug) => `ADMIN_PASSWORD__${slug.toUpperCase().replace(/-/g, '_')}`;

const siteExists = (slug) => fs.existsSync(path.join(SITES_DIR, slug, 'index.html'));

function fail(res, status, error) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ ok: false, error }));
}

export const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const name = pathname.replace(/^\/api\/|\/+$/g, '');
  const handler = Object.hasOwn(HANDLERS, name) ? HANDLERS[name] : null;
  if (!pathname.startsWith('/api/') || !handler) return fail(res, 404, 'not_found');

  const slug = String(req.headers['x-wedding-slug'] || '').trim().toLowerCase();
  if (!SLUG_RE.test(slug) || !siteExists(slug)) return fail(res, 404, 'unknown_wedding');

  // Parol faqat shu mijozniki: umumiy ADMIN_PASSWORD ataylab ishlatilmaydi,
  // aks holda bir mijoz paroli bilan boshqasining javoblarini ko'rish mumkin bo'lardi.
  const ctx = { slug, adminPassword: process.env[passwordVar(slug)] || '' };
  requestContext.run(ctx, async () => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`[${slug}] /api/${name} xatosi:`, err);
      if (!res.headersSent) fail(res, 500, 'server_error');
      else res.end();
    }
  });
});

server.requestTimeout = 20_000;
server.headersTimeout = 10_000;

// Test paytida import qilinsa — o'zi ishga tushmaydi
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, '127.0.0.1', () => {
    const sites = fs.existsSync(SITES_DIR) ? fs.readdirSync(SITES_DIR).filter(siteExists) : [];
    console.log(`Taklifnoma API: http://127.0.0.1:${PORT} — ${sites.length} ta sayt (${SITES_DIR})`);
    for (const slug of sites) {
      if (!process.env[passwordVar(slug)]) console.log(`  ! ${slug}: ${passwordVar(slug)} berilmagan — /admin ochilmaydi`);
    }
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
