// Bot suhbati orqali taklifnoma yaratish (Mini App o'rniga) — soxta Telegram server bilan to'liq oqim.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const calls = [];
let tgServer;
const ADMIN = 900;
const USER = { id: 555, first_name: 'Dilnoza', username: 'dilnoza' };
let upd = 0;

before(async () => {
  tgServer = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const method = req.url.split('/').pop();
      calls.push({ method, body: b ? JSON.parse(b) : {} });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, result: method === 'getMe' ? { username: 'taklifimuz_bot' } : { message_id: calls.length } }));
    });
  });
  await new Promise((r) => tgServer.listen(0, '127.0.0.1', r));
  Object.assign(process.env, {
    DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-data-')),
    PANEL_WORK_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-work-')),
    TELEGRAM_API: `http://127.0.0.1:${tgServer.address().port}`,
    BOT_TOKEN: '123:TEST',
    ADMIN_TG_IDS: String(ADMIN),
    SITE_DOMAIN: 'documen.uz',
  });
});
after(() => tgServer?.close());

const last = (method = 'sendMessage') => calls.filter((c) => c.method === method).at(-1)?.body;
const msg = (text, extra = {}) => ({ update_id: ++upd, message: { message_id: upd, chat: { id: USER.id, type: 'private' }, from: USER, text, ...extra } });
const cb = (data, from = USER) => ({ update_id: ++upd, callback_query: { id: String(upd), from, data, message: { message_id: 1, chat: { id: from.id }, text: 'x' } } });

test('Reklama havolasi → dizayn → savollar → ko‘rinish → to‘lov → o‘zgartirish → otziv', async () => {
  const { onUpdate, askReviews } = await import('../server/bot.js');
  const { readSite, sitesOf, readLeads, updateMeta, STATUS } = await import('../server/data.js');
  const { validateConfig } = await import('../src/lib/config.js');
  const { appHandler } = await import('../server/app-api.js');

  // 1) Reklamadan: manba yoziladi, o'sha dizayn taklif qilinadi
  await onUpdate(msg('/start ig_volume2'));
  assert.equal(readLeads()[String(USER.id)].src, 'ig_volume2');
  assert.match(last().text, /Klassik/);
  assert.ok(JSON.stringify(last().reply_markup).includes('new:volume2'));
  await onUpdate(msg('/start boshqa'));
  assert.equal(readLeads()[String(USER.id)].src, 'ig_volume2', 'birinchi manba saqlanadi');

  // 2) Savollar
  await onUpdate(cb('new:volume2'));
  assert.match(last().text, /Qanday marosim/);
  await onUpdate(cb('wz:eventType:nikoh'));
  await onUpdate(msg('j'));
  assert.match(last().text, /2–40/);
  await onUpdate(msg('jasur'));
  await onUpdate(msg('madina'));
  await onUpdate(msg('32.13.2027'));
  assert.match(last().text, /tushunarsiz/);
  await onUpdate(msg('16.11.2027'));
  assert.match(last().text, /Boshlanish vaqti/);
  await onUpdate(cb('wz:time:1800'));
  await onUpdate(msg('Bahor to‘yxonasi'));
  await onUpdate(msg('Toshkent, Chilonzor'));
  await onUpdate(msg('', { text: undefined, location: { latitude: 41.2856781, longitude: 69.2034417 } }));
  assert.match(last().text, /kimning nomidan/);
  await onUpdate(cb('wz:voice:parents'));
  await onUpdate(msg('Karimovlar oilasi'));

  const [s] = sitesOf(USER.id);
  assert.ok(s, 'sayt yaratildi');
  assert.equal(s.config.template, 'volume2');
  assert.equal(s.config.couple.groom, 'Jasur');
  assert.equal(s.config.couple.bride, 'Madina');
  assert.equal(s.config.event.date, '2027-11-16');
  assert.equal(s.config.event.time, '18:00');
  assert.equal(s.config.hosts, 'Karimovlar oilasi');
  assert.match(s.config.venue.googleMaps, /41\.285678/);
  assert.equal(s.meta.source, 'ig_volume2');
  assert.equal(s.meta.status, STATUS.draft);
  assert.deepEqual(validateConfig(s.config), []);
  const summary = last();
  assert.match(summary.text, /tayyor/);
  const view = summary.reply_markup.inline_keyboard.flat().find((b) => b.url)?.url;
  assert.match(view, /^https:\/\/boshqaruv\.documen\.uz\/korinish\.html\?s=jasur-madina&k=[0-9a-f]{20}$/);

  // 3) Ko'rinish havolasi: imzo to'g'ri bo'lsa — config (NAMUNA bilan), aks holda 404
  const call = async (u) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } };
    await appHandler({ method: 'GET', url: u, headers: {} }, res, 'draft');
    return res;
  };
  const ok = await call(`/api/panel/app/draft${new URL(view).search}`);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.config.watermark, true);
  assert.equal((await call('/api/panel/app/draft?s=jasur-madina&k=00000000000000000000')).statusCode, 404);

  // 4) Bitta maydonni o'zgartirish
  await onUpdate(cb(`wz:edit:${s.slug}:time`));
  await onUpdate(msg('17.30'));
  assert.equal(readSite(s.slug).config.event.time, '17:30');
  assert.equal(readSite(s.slug).config.program[0].time, '17:30');
  assert.match(last().text, /Saqlandi/);

  // 5) To'lov
  await onUpdate(cb(`pay:${s.slug}`));
  assert.match(last().text, /To‘lov/);
  assert.equal(readSite(s.slug).meta.status, STATUS.awaiting);

  // 6) Otziv: to'ydan keyin so'raladi → baho → matn → admin tasdiqlaydi → kanalga
  updateMeta(s.slug, (m) => ({ ...m, status: STATUS.paid }));
  const s2 = readSite(s.slug);
  const yesterday = new Date(Date.now() + 5 * 3600e3 - 86400e3).toISOString().slice(0, 10);
  fs.writeFileSync(path.join(process.env.DATA_DIR, 'sites', s.slug, 'config.json'), JSON.stringify({ ...s2.config, event: { ...s2.config.event, date: yesterday } }));
  await askReviews({}, { anyHour: true });
  assert.match(last().text, /baholang/);
  await onUpdate(cb(`rv:${s.slug}:5`));
  await onUpdate(msg('Mehmonlarga juda yoqdi!'));
  const toAdmin = calls.filter((c) => c.method === 'sendMessage' && c.body.chat_id === String(ADMIN)).at(-1).body;
  assert.match(toAdmin.text, /juda yoqdi/);
  await onUpdate(cb(`rvok:${s.slug}`, { id: ADMIN, first_name: 'Admin' }));
  const post = calls.filter((c) => c.method === 'sendMessage' && c.body.chat_id === '@taklifimuzotziv').at(-1)?.body;
  assert.ok(post, 'otzivlar kanaliga joylandi');
  assert.match(post.text, /⭐⭐⭐⭐⭐/);
  assert.match(post.text, /Dilnoza/);
  assert.equal(readSite(s.slug).meta.review.status, 'posted');
});

test('Sana va vaqtni tushunish', async () => {
  const { parseDate, parseTime } = await import('../server/bot-wizard.js');
  assert.equal(parseDate('5.6.2028'), '2028-06-05');
  assert.equal(parseDate('05/06/28'), '2028-06-05');
  assert.equal(parseDate('2028-06-05'), '2028-06-05');
  assert.equal(parseDate('01.01.2020'), null);
  assert.equal(parseDate('31.02.2028'), null);
  assert.equal(parseTime('18'), '18:00');
  assert.equal(parseTime('17.30'), '17:30');
  assert.equal(parseTime('25:00'), null);
});
