// Boshqaruv paneli API: vaqtinchalik "GitHub" (mahalliy bare repo) bilan to'liq sinov.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-test-'));
const origin = path.join(tmp, 'origin.git');
const sites = path.join(tmp, 'sites');
const OWNER = 'egasi-paroli-123';
let base;
let server;

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
// Kichik, lekin haqiqiy JPEG boshi (fayl turi mazmunidan tekshiriladi)
const JPG = Buffer.concat([Buffer.from('ffd8ffe000104a464946', 'hex'), Buffer.alloc(200, 1)]).toString('base64');

const api = (name, { method = 'GET', body, token = OWNER, query = '' } = {}) =>
  fetch(`${base}/api/panel/${name}${query}`, {
    method,
    headers: {
      'X-Wedding-Slug': 'boshqaruv',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

const newConfig = (over = {}) => ({
  template: 'volume2',
  couple: { groom: 'Test', bride: 'Sinov' },
  event: { date: '2026-11-20', time: '18:00' },
  venue: { name: 'To‘yxona', address: 'Manzil' },
  program: [{ time: '18:00', title: 'Kutib olish' }],
  rsvp: { enabled: true, deadline: '2026-11-19' },
  ...over,
});

before(async () => {
  // "GitHub": joriy kodning nusxasi, main branch bilan
  git(['init', '-q', '--bare', origin]);
  git(['push', '-q', origin, 'HEAD:refs/heads/main'], ROOT);
  fs.mkdirSync(path.join(sites, 'boshqaruv'), { recursive: true });
  fs.writeFileSync(path.join(sites, 'boshqaruv', 'index.html'), 'panel');
  Object.assign(process.env, {
    SITES_DIR: sites,
    OWNER_PASSWORD: OWNER,
    PANEL_WORK_DIR: path.join(tmp, 'work'),
    PANEL_REPO_URL: origin,
    PANEL_BRANCH: 'main',
    DEPLOY_TRIGGER: path.join(tmp, 'trigger', 'deploy'),
    DEPLOY_STATUS: path.join(tmp, 'status.json'),
    GITHUB_TOKEN: 'maxfiy-token-xyz',
  });
  delete process.env.REDIS_URL;
  delete process.env.KV_URL;
  ({ server } = await import('../server/index.js'));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Parolsiz yoki noto‘g‘ri parol bilan kirib bo‘lmaydi', async () => {
  assert.equal((await api('clients', { token: '' })).status, 401);
  assert.equal((await api('clients', { token: 'xato' })).status, 401);
});

test('Mijozlar ro‘yxati (config.js va config.json)', async () => {
  const { status, json } = await api('clients');
  assert.equal(status, 200);
  const slugs = json.clients.map((c) => c.slug);
  assert.ok(slugs.includes('demo') && slugs.includes('demo-yz'), slugs.join());
  const yz = json.clients.find((c) => c.slug === 'demo-yz');
  assert.equal(yz.template, 'yz');
  assert.equal(yz.rsvp, null); // baza ulanmagan
});

test('Bitta mijozni o‘qish', async () => {
  const { json } = await api('client', { query: '?slug=salimboy-jasminaxon' });
  assert.equal(json.source, 'js');
  assert.equal(json.config.couple.groom, 'Salimboy');
  assert.ok(json.media.includes('photo-4.jpg'));
  assert.equal((await api('client', { query: '?slug=../etc' })).status, 422);
});

test('Yangi mijoz: saqlash → GitHub’ga commit → deploy trigger', async () => {
  const { status, json } = await api('save', {
    method: 'POST',
    body: { slug: 'test-sinov', isNew: true, config: newConfig({ backgroundImage: 'fon.jpg' }), media: { 'fon.jpg': JPG } },
  });
  assert.equal(status, 200, JSON.stringify(json));
  assert.match(json.sha, /^[0-9a-f]{40}$/);
  assert.equal(git(['rev-parse', 'main'], origin), json.sha);
  const files = git(['ls-tree', '-r', '--name-only', 'main', 'clients/test-sinov'], origin).split('\n');
  assert.deepEqual(files.sort(), ['clients/test-sinov/config.json', 'clients/test-sinov/media/fon.jpg']);
  const saved = JSON.parse(git(['show', 'main:clients/test-sinov/config.json'], origin));
  assert.equal(saved.couple.groom, 'Test');
  assert.ok(git(['log', '-1', '--format=%s', 'main'], origin).includes('test-sinov'));
  assert.ok(fs.existsSync(process.env.DEPLOY_TRIGGER));
});

test('Takroriy nom, band nom va noto‘g‘ri ma’lumot rad etiladi', async () => {
  const dup = await api('save', { method: 'POST', body: { slug: 'test-sinov', isNew: true, config: newConfig() } });
  assert.equal(dup.json.error, 'exists');
  const reserved = await api('save', { method: 'POST', body: { slug: 'boshqaruv', isNew: true, config: newConfig() } });
  assert.equal(reserved.json.error, 'bad_slug');
  const invalid = await api('save', {
    method: 'POST',
    body: { slug: 'test-xato', isNew: true, config: newConfig({ event: { date: '2026-13-45', time: '25:00' } }) },
  });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.json.error, 'validation');
  assert.ok(invalid.json.details.length >= 2);
  const fake = await api('save', {
    method: 'POST',
    body: { slug: 'test-xato', isNew: true, config: newConfig(), media: { 'rasm.jpg': Buffer.from('<script>').toString('base64') } },
  });
  assert.equal(fake.json.error, 'bad_media');
  // Hech biri GitHub'ga yozilmagan
  assert.equal(git(['ls-tree', '--name-only', 'main', 'clients/test-xato'], origin), '');
});

test('config.js mijozini tahrirlash → config.json ga o‘tadi, media o‘chiriladi', async () => {
  const { json: cur } = await api('client', { query: '?slug=salimboy-jasminaxon' });
  const config = { ...cur.config, hosts: 'Yangi oila nomi', gallery: cur.config.gallery.filter((g) => g !== 'photo-1.jpg') };
  const { status, json } = await api('save', {
    method: 'POST',
    body: { slug: 'salimboy-jasminaxon', config, deleteMedia: ['photo-1.jpg'] },
  });
  assert.equal(status, 200, JSON.stringify(json));
  const files = git(['ls-tree', '-r', '--name-only', 'main', 'clients/salimboy-jasminaxon'], origin);
  assert.ok(files.includes('config.json') && !files.includes('config.js\n') && !files.endsWith('config.js'));
  assert.ok(!files.includes('photo-1.jpg'));
  assert.equal(JSON.parse(git(['show', 'main:clients/salimboy-jasminaxon/config.json'], origin)).hosts, 'Yangi oila nomi');
});

test('O‘zgarishsiz saqlash yangi commit yaratmaydi', async () => {
  const before = git(['rev-parse', 'main'], origin);
  const { json: cur } = await api('client', { query: '?slug=test-sinov' });
  const { json } = await api('save', { method: 'POST', body: { slug: 'test-sinov', config: cur.config } });
  assert.equal(json.unchanged, true);
  assert.equal(git(['rev-parse', 'main'], origin), before);
});

test('Holat va parol: baza yo‘q bo‘lsa aniq xato, token hech qayerda chiqmaydi', async () => {
  const st = await api('status');
  assert.equal(st.status, 200);
  const pw = await api('password', { method: 'POST', body: { slug: 'test-sinov' } });
  assert.equal(pw.status, 422);
  assert.equal(pw.json.error, 'store');
  for (const r of [st, pw]) assert.ok(!JSON.stringify(r.json).includes('maxfiy-token-xyz'));
});

test('Panel yo‘li oddiy mijoz saytlarida ishlamaydi va aksincha', async () => {
  const r = await fetch(`${base}/api/panel/clients`, { headers: { 'X-Wedding-Slug': 'demo', Authorization: `Bearer ${OWNER}` } });
  assert.equal(r.status, 404);
  const r2 = await fetch(`${base}/api/rsvp`, { headers: { 'X-Wedding-Slug': 'boshqaruv' } });
  assert.equal(r2.status, 404);
});
