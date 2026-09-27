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

test('Osmon shabloni: sky bilan saqlanadi, noto‘g‘ri koordinata rad etiladi', async () => {
  const ok = await api('save', {
    method: 'POST',
    body: { slug: 'test-osmon', isNew: true, config: newConfig({ template: 'osmon', sky: { city: 'Samarqand', lat: 39.6542, lng: 66.9597 } }) },
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  const saved = JSON.parse(git(['show', 'main:clients/test-osmon/config.json'], origin));
  assert.equal(saved.template, 'osmon');
  assert.deepEqual(saved.sky, { city: 'Samarqand', lat: 39.6542, lng: 66.9597 });
  const bad = await api('save', {
    method: 'POST',
    body: { slug: 'test-osmon-2', isNew: true, config: newConfig({ template: 'osmon', sky: { lat: 123, lng: 66 } }) },
  });
  assert.equal(bad.status, 422);
});

test('Musiqa qo‘shish: fayl va ro‘yxat GitHub’ga yoziladi, noto‘g‘ri fayl va takroriy nom rad etiladi', async () => {
  const mp3 = Buffer.concat([Buffer.from('ID3', 'latin1'), Buffer.alloc(4000, 7)]).toString('base64');
  const before = git(['show', 'main:src/lib/music.js'], origin);
  const next = Math.max(...[...before.matchAll(/musiqa-(\d+)/g)].map((m) => Number(m[1]))) + 1;
  const ok = await api('music', { method: 'POST', body: { title: 'Sinov Ijrochi — Sinov qo‘shig‘i', file: mp3 } });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(ok.json.id, `musiqa-${next}`);
  assert.equal(ok.json.file, `/music/musiqa-${next}.mp3`);
  const after = git(['show', 'main:src/lib/music.js'], origin);
  assert.ok(after.includes(`{ id: 'musiqa-${next}', title: "Sinov Ijrochi — Sinov qo‘shig‘i", file: '/music/musiqa-${next}.mp3' },`));
  assert.ok(git(['ls-tree', '--name-only', 'main', `public/music/musiqa-${next}.mp3`], origin));
  // Yangi ro'yxat JavaScript sifatida to'g'ri o'qiladi
  const mod = await import(`data:text/javascript,${encodeURIComponent(after)}`);
  assert.equal(mod.MUSIC_LIBRARY.at(-1).title, 'Sinov Ijrochi — Sinov qo‘shig‘i');

  const dup = await api('music', { method: 'POST', body: { title: 'sinov ijrochi — sinov qo‘shig‘i', file: mp3 } });
  assert.equal(dup.json.error, 'exists');
  const fake = await api('music', { method: 'POST', body: { title: 'Rasm', file: Buffer.from('<html>').toString('base64') } });
  assert.equal(fake.json.error, 'bad_media');
  const noTitle = await api('music', { method: 'POST', body: { title: ' ', file: mp3 } });
  assert.equal(noTitle.json.error, 'bad_title');
  const anon = await api('music', { method: 'POST', token: '', body: { title: 'X y', file: mp3 } });
  assert.equal(anon.status, 401);
});

test('Demo belgisi va saytni o‘chirish', async () => {
  const mk = await api('save', { method: 'POST', body: { slug: 'test-ochir', isNew: true, config: newConfig({ demo: true }) } });
  assert.equal(mk.status, 200, JSON.stringify(mk.json));
  const list = (await api('clients')).json.clients;
  assert.equal(list.find((c) => c.slug === 'test-ochir').demo, true);
  assert.equal(list.find((c) => c.slug === 'test-sinov').demo, false);
  const bad = await api('save', { method: 'POST', body: { slug: 'test-x', isNew: true, config: newConfig({ demo: 'ha' }) } });
  assert.equal(bad.status, 422);

  const wrong = await api('delete', { method: 'POST', body: { slug: 'test-ochir', confirm: 'test' } });
  assert.equal(wrong.json.error, 'confirm');
  assert.ok(git(['ls-tree', '--name-only', 'main', 'clients/test-ochir'], origin));
  const missing = await api('delete', { method: 'POST', body: { slug: 'yoq-sayt', confirm: 'yoq-sayt' } });
  assert.equal(missing.json.error, 'not_found');
  const anon = await api('delete', { method: 'POST', token: '', body: { slug: 'test-ochir', confirm: 'test-ochir' } });
  assert.equal(anon.status, 401);

  const ok = await api('delete', { method: 'POST', body: { slug: 'test-ochir', confirm: 'test-ochir' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal(git(['ls-tree', '--name-only', 'main', 'clients/test-ochir'], origin), '');
  assert.ok(git(['log', '-1', '--format=%s', 'main'], origin).includes('o‘chirildi — test-ochir'));
  assert.ok(git(['ls-tree', '--name-only', 'main', 'clients/test-sinov'], origin), 'boshqa saytlarga tegilmaydi');
  assert.ok(!(await api('clients')).json.clients.some((c) => c.slug === 'test-ochir'));
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

test('Daromad: faqat egasi saqlaydi va o‘qiydi, noto‘g‘ri summa rad etiladi, GitHub’ga yozilmaydi', async () => {
  // Upstash REST'ga o'xshash soxta baza (xotirada)
  const http = await import('node:http');
  const mem = new Map();
  const fake = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const [cmd, key, val] = JSON.parse(b);
      let result = null;
      if (cmd === 'GET') result = mem.get(key) ?? null;
      if (cmd === 'SET') {
        mem.set(key, val);
        result = 'OK';
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ result }));
    });
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  process.env.KV_REST_API_URL = `http://127.0.0.1:${fake.address().port}`;
  process.env.KV_REST_API_TOKEN = 'soxta-token';
  const headBefore = git(['rev-parse', 'main'], origin);
  try {
    const empty = await api('finance');
    assert.equal(empty.status, 200, JSON.stringify(empty.json));
    assert.deepEqual(empty.json.items, {});

    const saved = await api('finance', {
      method: 'POST',
      body: { items: { 'test-sinov': { amount: 350000, note: ' to‘landi ' }, 'test-osmon': { amount: '', note: '' }, boshqa: { amount: 1200000 } } },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    assert.deepEqual(saved.json.items, { 'test-sinov': { amount: 350000, note: 'to‘landi' }, boshqa: { amount: 1200000 } });
    assert.ok([...mem.keys()].includes('taklifnoma:boshqaruv:finance'));

    const again = await api('finance');
    assert.deepEqual(again.json.items, saved.json.items);
    assert.ok(again.json.updatedAt);

    for (const amount of [-5, 1.5, 'abc', 1e13]) {
      const bad = await api('finance', { method: 'POST', body: { items: { 'test-sinov': { amount } } } });
      assert.equal(bad.json.error, 'bad_amount', String(amount));
    }
    const badSlug = await api('finance', { method: 'POST', body: { items: { '../x': { amount: 1 } } } });
    assert.equal(badSlug.json.error, 'bad_slug');
    const anon = await api('finance', { token: '' });
    assert.equal(anon.status, 401);
    // Narxlar GitHub'ga (ochiq repo) yozilmaydi
    assert.equal(git(['rev-parse', 'main'], origin), headBefore);
  } finally {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    fake.close();
  }
  const noStore = await api('finance');
  assert.equal(noStore.json.error, 'store');
});
