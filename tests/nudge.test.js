// Voronka bo'yicha o'zgarishlar: salomlashish tugmalari, boshlamagan / savollarda qolganlarga bitta eslatma,
// «▶️ Davom ettirish», yangilanishdan oldin boshlangan suhbat (olib tashlangan savolda) to'g'ri yakunlanishi.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const calls = [];
let tgServer;
const ADMIN = 900;
const BLOCKED = 777;
let upd = 0;

before(async () => {
  tgServer = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const method = req.url.split('/').pop();
      const body = b ? JSON.parse(b) : {};
      calls.push({ method, body });
      res.setHeader('Content-Type', 'application/json');
      if (method === 'sendMessage' && String(body.chat_id) === String(BLOCKED)) {
        return res.end(JSON.stringify({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }));
      }
      res.end(JSON.stringify({ ok: true, result: method === 'getMe' ? { username: 'taklifimuz_bot' } : { message_id: calls.length } }));
    });
  });
  await new Promise((r) => tgServer.listen(0, '127.0.0.1', r));
  Object.assign(process.env, {
    DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'nudge-data-')),
    PANEL_WORK_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'nudge-work-')),
    TELEGRAM_API: `http://127.0.0.1:${tgServer.address().port}`,
    BOT_TOKEN: '123:TEST',
    ADMIN_TG_IDS: String(ADMIN),
    SITE_DOMAIN: 'documen.uz',
    REQUIRE_SUB: '0',
    CHANNEL_DISCOUNT: '0',
  });
});
after(() => tgServer?.close());

const sentTo = (chat) => calls.filter((c) => c.method === 'sendMessage' && String(c.body.chat_id) === String(chat)).map((c) => c.body);
const lastTo = (chat) => sentTo(chat).at(-1);
const user = (id, first_name = `U${id}`) => ({ id, first_name });
const msg = (from, text, extra = {}) => ({ update_id: ++upd, message: { message_id: upd, chat: { id: from.id, type: 'private' }, from, text, ...extra } });
const cb = (from, data) => ({ update_id: ++upd, callback_query: { id: String(upd), from, data, message: { message_id: 1, chat: { id: from.id }, text: 'x' } } });
const buttons = (m) => (m?.reply_markup?.inline_keyboard || []).flat();

test('/start: xabar ostida «Bepul yaratib ko‘rish» va «Namunalar»; reklamadagi dizayn bilan — menyu + dizayn', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const A = user(201);
  await onUpdate(msg(A, '/start'));
  const w = lastTo(A.id);
  assert.match(w.text, /Assalomu alaykum, U201/);
  assert.match(w.text, /bepul ko‘rasiz/);
  assert.match(w.text, /70 000 so‘m/);
  assert.deepEqual(buttons(w).map((b) => b.callback_data), ['new:', 'demos']);

  // Namunalar tugmasi
  await onUpdate(cb(A, 'demos'));
  assert.match(lastTo(A.id).text, /Namunalar/);
  assert.ok(buttons(lastTo(A.id)).some((b) => b.url?.includes('demo-osmon.documen.uz')));

  // «Bepul yaratib ko‘rish» → savollar; pastdagi menyu ham o'rnatiladi
  await onUpdate(cb(A, 'new:'));
  const intro = sentTo(A.id).at(-2);
  assert.match(intro.text, /Bir necha savolga/);
  assert.ok(intro.reply_markup.keyboard, 'menyu klaviaturasi');
  assert.match(lastTo(A.id).text, /Qanday taklifnoma kerak/);

  // Reklama havolasi dizayn bilan: salomlashishda menyu, keyingi xabarda shu dizayn tugmasi
  const B = user(202);
  await onUpdate(msg(B, '/start ig_osmon'));
  const [hello, design] = sentTo(B.id);
  assert.ok(hello.reply_markup.keyboard);
  assert.ok(buttons(design).some((b) => b.callback_data === 'new:osmon'));
});

test('Eslatma: boshlamagan va savollarda qolganlarga bir marta (2–24 soat), boshqalarga yo‘q', async () => {
  const { onUpdate, runFollowups } = await import('../server/bot.js');
  const { readLeads, writeSite, DATA_DIR } = await import('../server/data.js');
  const { readEvents, buildFunnel, funnelText } = await import('../server/funnel.js');
  const now = Date.parse('2026-11-23T08:00:00Z'); // Toshkentda 13:00
  const ago = (h) => new Date(now - h * 3600e3).toISOString();

  const leads = {
    301: { src: 'ig_bio', at: ago(3), name: 'Dilnoza Karimova' }, // boshlamagan → eslatma
    302: { src: 'ig_bio', at: ago(4), name: 'Jasur' }, // savollarda qolgan → «Davom ettirish»
    303: { src: 'organik', at: ago(1) }, // hali 2 soat o'tmagan
    304: { src: 'organik', at: ago(30) }, // 24 soatdan eski — eslatilmaydi
    305: { src: 'organik', at: ago(3) }, // qoralamasi bor — uning eslatmalari boshqa
    306: { src: 'organik', at: ago(3), nudgedAt: ago(1) }, // allaqachon eslatilgan
    [BLOCKED]: { src: 'organik', at: ago(5) }, // botni bloklagan → belgilanadi
    [ADMIN]: { src: 'organik', at: ago(3) },
    307: { src: 'organik', at: ago(40), lastAt: ago(3) }, // eski, lekin yaqinda faol bo'lgan
    309: { src: 'ig_osmon', at: ago(3) }, // reklamadagi dizayn bilan kelgan → shu dizaynda boshlash
  };
  fs.writeFileSync(path.join(DATA_DIR(), 'leads.json'), JSON.stringify(leads));
  fs.writeFileSync(
    path.join(DATA_DIR(), 'wizard.json'),
    JSON.stringify({ 302: { slug: null, step: 'bride', data: { kind: 'wedding', template: 'volume2', eventType: 'nikoh', groom: 'Jasur' }, edit: false, at: now - 4 * 3600e3 } }),
  );
  writeSite('a-b', { config: { template: 'volume2', couple: { groom: 'A', bride: 'B' } }, meta: { owner: { id: 305 }, status: 'draft', createdAt: ago(3) } });

  calls.length = 0;
  await runFollowups({}, { now });
  const got = (id) => sentTo(id).map((m) => m.text);

  assert.equal(got(301).length, 1);
  assert.match(got(301)[0], /Dilnoza, o‘z taklifnomangizni ko‘rib chiqdingizmi/);
  assert.deepEqual(buttons(lastTo(301)).map((b) => b.callback_data), ['new:', 'demos']);

  assert.equal(got(302).length, 1);
  assert.match(got(302)[0], /Jasur, taklifnomangiz yarim yo‘lda qoldi[\s\S]*Yana <b>5 ta<\/b>/);
  assert.deepEqual(buttons(lastTo(302)).map((b) => b.callback_data), ['wz:resume']);

  assert.equal(got(307).length, 1, 'oxirgi faollik hisobga olinadi');
  assert.equal(buttons(lastTo(309))[0].callback_data, 'new:osmon');
  for (const id of [303, 304, 306, ADMIN]) assert.equal(got(id).length, 0, `${id} ga yuborilmasligi kerak`);
  assert.ok(!got(305).some((t) => /ko‘rib chiqdingizmi|yarim yo‘lda/.test(t)), 'qoralamasi borga bu eslatma ketmaydi');

  const after = readLeads();
  assert.ok(after[301].nudgedAt && after[302].nudgedAt && after[BLOCKED].nudgedAt);
  assert.equal(after[BLOCKED].blocked, true);
  assert.equal(after[301].src, 'ig_bio', 'boshqa maydonlar saqlanadi');

  // Ikkinchi marta yuborilmaydi
  calls.length = 0;
  await runFollowups({}, { now: now + 15 * 60e3 });
  assert.equal(got(301).length + got(302).length + got(307).length + got(309).length, 0);

  // Kechasi (Toshkent 21:00 dan keyin) yuborilmaydi
  fs.writeFileSync(path.join(DATA_DIR(), 'leads.json'), JSON.stringify({ ...readLeads(), 308: { src: 'organik', at: ago(-14) } }));
  calls.length = 0;
  await runFollowups({}, { now: now + 17 * 3600e3 }); // Toshkentda 06:00
  assert.equal(got(308).length, 0);

  // «▶️ Davom ettirish» → to'xtagan savol (kelin ismi) qayta beriladi va suhbat davom etadi
  const J = user(302, 'Jasur');
  await onUpdate(cb(J, 'wz:resume'));
  assert.match(lastTo(302).text, /Kelinning ismini/);
  assert.match(lastTo(302).text, /Savol 4\/8/);
  await onUpdate(msg(J, 'Madina'));
  assert.match(lastTo(302).text, /Sana/);

  // Suhbati yo'q odam «Davom ettirish»ni bossa — boshidan
  const D = user(301, 'Dilnoza');
  await onUpdate(cb(D, 'wz:resume'));
  assert.match(lastTo(301).text, /Qanday taklifnoma kerak/);

  // Voronkada: eslatma yuborilgan → qaytib davom ettirgan
  const ev = readEvents().filter((e) => e.e === 'nudge');
  assert.deepEqual(ev.map((e) => [e.u, e.k]).sort(), [['301', 'start'], ['302', 'wizard'], ['307', 'start'], ['309', 'start']]);
  const r = buildFunnel({ days: 0 });
  assert.equal(r.after.nudged, 4);
  assert.equal(r.after.nudgedBack, 2);
  assert.match(funnelText(r), /Eslatma yuborilgan: 4 → qaytib davom ettirgan: <b>2<\/b>/);
});

test('Yangilanishdan oldin boshlangan suhbat (olib tashlangan «kimning nomidan» savolida) — javobdan keyin yakunlanadi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { sitesOf, DATA_DIR } = await import('../server/data.js');
  const U = user(401, 'Aziz');
  const file = path.join(DATA_DIR(), 'wizard.json');
  const all = JSON.parse(fs.readFileSync(file, 'utf8'));
  all[U.id] = {
    slug: null,
    step: 'voice',
    edit: false,
    at: Date.now(),
    data: { kind: 'wedding', template: 'volume3', eventType: 'nikoh', groom: 'Aziz', bride: 'Lola', date: '2027-05-20', time: '18:00', venue: 'Navro‘z to‘yxonasi', address: 'Samarqand', map: null },
  };
  fs.writeFileSync(file, JSON.stringify(all));
  await onUpdate(cb(U, 'wz:voice:couple'));
  const [s] = sitesOf(U.id);
  assert.ok(s, 'qoralama yaratildi (savollar boshidan boshlanmadi)');
  assert.equal(s.config.invitedBy, 'couple');
  assert.match(lastTo(U.id).text, /Taklifnomangiz tayyor/);
});
