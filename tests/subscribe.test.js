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
    REQUIRE_SUB: '1',
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
