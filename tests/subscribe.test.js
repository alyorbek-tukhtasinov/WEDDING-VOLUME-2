// Majburiy obuna: yangi foydalanuvchi asosiy kanalga obuna bo'lmaguncha botdan foydalana olmaydi.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const calls = [];
const members = new Set();
let srv;
let upd = 0;
const U = { id: 701, first_name: 'Nodira' };

before(async () => {
  srv = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const method = req.url.split('/').pop();
      const body = b ? JSON.parse(b) : {};
      calls.push({ method, body });
      res.setHeader('Content-Type', 'application/json');
      if (method === 'getChatMember') return res.end(JSON.stringify({ ok: true, result: { status: members.has(body.user_id) ? 'member' : 'left' } }));
      res.end(JSON.stringify({ ok: true, result: { message_id: calls.length } }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  Object.assign(process.env, {
    DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'sub-data-')),
    TELEGRAM_API: `http://127.0.0.1:${srv.address().port}`,
    BOT_TOKEN: '123:TEST',
    ADMIN_TG_IDS: '900',
    SITE_DOMAIN: 'documen.uz',
    REQUIRE_SUB: '1', // ixtiyoriy rejim (standart — o'chiq)
  });
});
after(() => srv?.close());

const msg = (from, text) => ({ update_id: ++upd, message: { message_id: upd, chat: { id: from.id, type: 'private' }, from, text } });
const cb = (from, data) => ({ update_id: ++upd, callback_query: { id: String(upd), from, data, message: { message_id: 5, chat: { id: from.id } } } });
const lastTo = (id) => calls.filter((c) => c.method === 'sendMessage' && String(c.body.chat_id) === String(id)).at(-1)?.body;

test('Majburiy obuna: avval kanal, keyin reklamadagi dizayn; manba yo‘qolmaydi; admin va mijozlar o‘tadi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { readLeads, writeSite, STATUS } = await import('../server/data.js');

  await onUpdate(msg(U, '/start ig_volume2'));
  assert.match(lastTo(U.id).text, /obuna bo‘ling/);
  assert.ok(JSON.stringify(lastTo(U.id).reply_markup).includes('https://t.me/Taklifim_rasmiy'));
  assert.equal(readLeads()[String(U.id)].src, 'ig_volume2', 'manba obunadan oldin yozildi');

  // Boshqa tugmalar ham to'xtatiladi
  await onUpdate(msg(U, '✨ Taklifnoma yaratish'));
  assert.match(lastTo(U.id).text, /obuna bo‘ling/);

  // Obuna bo'lmay "Obuna bo'ldim" — ogohlantirish
  await onUpdate(cb(U, 'sub:check'));
  assert.equal(calls.at(-1).method, 'answerCallbackQuery');
  assert.equal(calls.at(-1).body.show_alert, true);

  // Obuna bo'ldi → salom va reklamadagi dizayn
  members.add(U.id);
  await onUpdate(cb(U, 'sub:check'));
  const sent = calls.filter((c) => c.method === 'sendMessage' && c.body.chat_id === U.id).slice(-2).map((c) => c.body.text);
  assert.match(sent[0], /Assalomu alaykum/);
  assert.match(sent[1], /Siz ko‘rgan dizayn: <b>🕊 Klassik/);

  // Endi bemalol ishlaydi (Telegram'dan qayta so'ralmaydi — kesh)
  const asked = calls.filter((c) => c.method === 'getChatMember').length;
  await onUpdate(msg(U, '/demos'));
  assert.match(lastTo(U.id).text, /Namunalar/);
  assert.equal(calls.filter((c) => c.method === 'getChatMember').length, asked);

  // Admin va taklifnomasi bor mijoz tekshirilmaydi
  await onUpdate(msg({ id: 900, first_name: 'Admin' }, '/admin'));
  assert.match(lastTo(900).text, /Bot saytlari/);
  const client = { id: 702, first_name: 'Ali' };
  writeSite('ali-vali-x', { config: { template: 'volume2' }, meta: { owner: { id: 702 }, status: STATUS.paid } });
  await onUpdate(msg(client, '/demos'));
  assert.match(lastTo(702).text, /Namunalar/);
});

test('To‘lov: kanalga obuna — 5 000 so‘m chegirma; chek adminga chegirma izohi bilan boradi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { writeSite, readSite, STATUS } = await import('../server/data.js');
  const { defaultConfig } = await import('../src/lib/starter.js');
  const P = { id: 901, first_name: 'Shahzoda', username: 'shahzoda' };
  const c = defaultConfig('volume2', 'nikoh');
  Object.assign(c, { couple: { groom: 'Bek', bride: 'Gul', initials: '' }, event: { ...c.event, date: '2027-11-20', time: '18:00' }, venue: { name: 'Bahor', address: 'Toshkent' } });
  writeSite('bek-gul', { config: c, meta: { owner: { id: P.id, name: 'Shahzoda', username: 'shahzoda' }, status: STATUS.draft, price: 70000 } });

  // Obuna emas: to'liq narx + chegirma taklifi
  await onUpdate(cb(P, 'pay:bek-gul'));
  let m = lastTo(P.id);
  assert.match(m.text, /Summa: <b>70 000 so‘m<\/b>/);
  assert.match(m.text, /5 000 so‘m chegirma oling/);
  assert.match(m.text, /65 000 so‘m/);
  assert.ok(JSON.stringify(m.reply_markup).includes('paysub:bek-gul'));
  assert.equal(readSite('bek-gul').meta.status, STATUS.awaiting);

  // Obuna bo'lmay "Obuna bo'ldim"
  await onUpdate(cb(P, 'paysub:bek-gul'));
  assert.equal(calls.at(-1).body.show_alert, true);
  assert.equal(readSite('bek-gul').meta.discount, undefined);

  // Obuna bo'ldi → 65 000
  members.add(P.id);
  await onUpdate(cb(P, 'paysub:bek-gul'));
  m = lastTo(P.id);
  assert.match(m.text, /chegirma: <b>−5 000 so‘m<\/b>/);
  assert.match(m.text, /Summa: <b>65 000 so‘m<\/b>/);
  assert.equal(readSite('bek-gul').meta.discount.amount, 5000);

  // Chek → adminga 65 000 va izoh
  await onUpdate({ update_id: ++upd, message: { message_id: 77, chat: { id: P.id, type: 'private' }, from: P, photo: [{ file_id: 'chek1' }] } });
  const toAdmin = calls.filter((x) => x.method === 'sendPhoto' && String(x.body.chat_id) === '900').at(-1).body;
  assert.match(toAdmin.caption, /💰 65 000 so‘m/);
  assert.match(toAdmin.caption, /Kanalga obuna bo‘lgani uchun <b>5 000 so‘m<\/b> chegirma berilgan \(to‘liq narx: 70 000 so‘m\)/);

  // Admin tasdiqlaydi
  await onUpdate(cb({ id: 900, first_name: 'Admin' }, 'ok:bek-gul'));
  assert.equal(readSite('bek-gul').meta.status, STATUS.paid);
});
