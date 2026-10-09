// Bot suhbati orqali taklifnoma yaratish (Mini App o'rniga) — soxta Telegram server bilan to'liq oqim.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

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
      // Mijoz yuborgan suratni yuklab olish (getFile → /file/bot<token>/<path>)
      if (req.url.includes('/file/')) {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.end(Buffer.concat([Buffer.from('ffd8ffe000104a464946', 'hex'), Buffer.alloc(300, 7)]));
      }
      const method = req.url.split('/').pop();
      if (method === 'getFile') {
        calls.push({ method, body: JSON.parse(b) });
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ ok: true, result: { file_path: `photos/${JSON.parse(b).file_id}.jpg`, file_size: 310 } }));
      }
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
    REQUIRE_SUB: '0', // majburiy obuna — tests/subscribe.test.js da
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

  // 4b) Kiyinish uslubini olib tashlash, o'z dasturini yozish; vaqt o'zgarsa — o'z dasturi suriladi
  await onUpdate(cb(`wz:edit:${s.slug}:dress`));
  assert.match(last().text, /Kiyinish uslubi/);
  await onUpdate(cb('wz:dress:-'));
  assert.equal(readSite(s.slug).config.dressCode.text, '');
  assert.match(last().text, /Kiyinish uslubi: yo‘q/);
  await onUpdate(cb(`wz:edit:${s.slug}:program`));
  await onUpdate(msg('salom'));
  assert.match(last().text, /Tushunmadim/);
  await onUpdate(msg('17:30 Kutib olish\n18.00 - Kelin-kuyov kirib kelishi\n21:00 Tort'));
  assert.deepEqual(readSite(s.slug).config.program, [
    { time: '17:30', title: 'Kutib olish' },
    { time: '18:00', title: 'Kelin-kuyov kirib kelishi' },
    { time: '21:00', title: 'Tort' },
  ]);
  await onUpdate(cb(`wz:edit:${s.slug}:time`));
  await onUpdate(msg('18:00'));
  assert.deepEqual(readSite(s.slug).config.program.map((p) => p.time), ['18:00', '18:30', '21:30']);
  assert.equal(readSite(s.slug).config.program[2].title, 'Tort', 'o‘z dasturi o‘chmaydi');
  await onUpdate(cb(`wz:edit:${s.slug}:dress`));
  await onUpdate(cb('wz:dress:def'));
  assert.ok(readSite(s.slug).config.dressCode.text.length > 5, 'standart matn qaytdi');
  await onUpdate(cb(`wz:edit:${s.slug}:program`));
  await onUpdate(cb('wz:program:-'));
  assert.deepEqual(readSite(s.slug).config.program, []);
  assert.deepEqual(validateConfig(readSite(s.slug).config), []);

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

test('Tug‘ilgan kun: klassik bazm (ism, yosh, joy, vaqt — dastur shu vaqtga)', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { sitesOf } = await import('../server/data.js');
  const { validateConfig, ageOf } = await import('../src/lib/config.js');
  const U = { id: 601, first_name: 'Sardor' };
  const m = (text, extra = {}) => ({ update_id: ++upd, message: { message_id: upd, chat: { id: U.id, type: 'private' }, from: U, text, ...extra } });
  await onUpdate(m('✨ Taklifnoma yaratish'));
  assert.match(last().text, /Qanday taklifnoma/);
  await onUpdate(cb('wz:kind:bday', U));
  assert.match(last().text, /Tug‘ilgan kun dizaynini/);
  await onUpdate(cb('wz:btemplate:klassik', U));
  await onUpdate(m('sardor'));
  await onUpdate(m('14.11.1996'));
  await onUpdate(m('14.11.2027'));
  assert.match(last().text, /Boshlanish vaqti/);
  await onUpdate(cb('wz:time:2000', U));
  assert.match(last().text, /Bazm joyi/);
  await onUpdate(m('Grand Classic restorani'));
  await onUpdate(m('Toshkent, Yunusobod'));
  await onUpdate(cb('wz:map:-', U));
  const [s] = sitesOf(U.id);
  assert.equal(s.config.template, 'klassik');
  assert.equal(s.config.person.name, 'Sardor');
  assert.equal(ageOf(s.config), 31);
  assert.equal(s.config.event.time, '20:00');
  assert.equal(s.config.program[0].time, '20:00', 'dastur bazm vaqtidan boshlanadi');
  assert.equal(s.config.venue.name, 'Grand Classic restorani');
  assert.match(s.config.venue.googleMaps, /Grand%20Classic/);
  assert.deepEqual(validateConfig(s.config), []);
  assert.match(last().text, /Sardor — 31 yosh/);
});

test('Tug‘ilgan kun: sehrli tort — suratlar chatga yuboriladi, ko‘rinishda chiqadi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { sitesOf, readSite } = await import('../server/data.js');
  const { validateConfig } = await import('../src/lib/config.js');
  const { appHandler } = await import('../server/app-api.js');
  const U = { id: 602, first_name: 'Jasur' };
  const m = (text, extra = {}) => ({ update_id: ++upd, message: { message_id: upd, chat: { id: U.id, type: 'private' }, from: U, text, ...extra } });
  await onUpdate(cb('new:tort', U));
  assert.match(last().text, /Kimni tabriklaymiz/);
  await onUpdate(m('madina'));
  await onUpdate(cb('wz:birthDate:-', U));
  await onUpdate(m('20.03.2027'));
  await onUpdate(m('Sevgilingdan'));
  assert.match(last().text, /Suratlarni yuboring/);
  await onUpdate(cb('wz:photos:done', U));
  assert.match(last().text, /Kamida 1 ta/);
  // Albom: 3 ta surat — bitta javob
  const before = calls.filter((c) => c.method === 'sendMessage').length;
  for (const id of ['p1', 'p2', 'p3']) await onUpdate(m(undefined, { photo: [{ file_id: `${id}-small` }, { file_id: id }], media_group_id: 'g1' }));
  assert.equal(calls.filter((c) => c.method === 'sendMessage').length - before, 1, 'albomga bitta javob');
  assert.deepEqual(calls.filter((c) => c.method === 'getFile').slice(-3).map((c) => c.body.file_id), ['p1', 'p2', 'p3'], 'eng katta o‘lcham');
  await onUpdate(cb('wz:photos:done', U));
  const [s] = sitesOf(U.id);
  assert.equal(s.config.template, 'tort');
  assert.equal(s.config.person.name, 'Madina');
  assert.equal(s.config.from, 'Sevgilingdan');
  assert.deepEqual(Object.keys(s.config.photos), ['hero', 'letter', 'gift']);
  assert.deepEqual(validateConfig(s.config, (await import('../server/data.js')).mediaFiles(s.slug)), []);
  assert.match(last().text, /Suratlar: 3/);

  // Ko'rinish sahifasi suratni imzo bilan oladi
  const view = last().reply_markup.inline_keyboard.flat().find((b) => b.url).url;
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } };
  await appHandler({ method: 'GET', url: `/api/panel/app/draft${new URL(view).search}`, headers: {} }, res, 'draft');
  assert.ok(res.body.mediaBase.includes('dmedia'));
  const img = await new Promise((resolve) => {
    const chunks = [];
    const r = new (require('node:stream').Writable)({ write(c, e, cb2) { chunks.push(c); cb2(); } });
    r.headers = {};
    r.setHeader = (k, v) => (r.headers[k] = v);
    r.on('finish', () => resolve({ status: r.statusCode, buf: Buffer.concat(chunks), type: r.headers['Content-Type'] }));
    appHandler({ method: 'GET', url: `${res.body.mediaBase}${s.config.photos.hero}`, headers: {} }, r, 'dmedia');
  });
  assert.equal(img.status, 200);
  assert.equal(img.type, 'image/jpeg');

  // Suratlarni almashtirish: eskilari o'chadi
  const old = s.config.photos.hero;
  await onUpdate(cb(`wz:edit:${s.slug}:photos`, U));
  await onUpdate(m(undefined, { photo: [{ file_id: 'p9' }] }));
  await onUpdate(cb('wz:photos:done', U));
  assert.deepEqual(Object.keys(readSite(s.slug).config.photos), ['hero']);
  assert.ok(!(await import('../server/data.js')).mediaFiles(s.slug).includes(old), 'eski surat o‘chirildi');
});
