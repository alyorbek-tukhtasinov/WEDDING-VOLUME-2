// Asosiy kanal postlari: boshlang'ich postlar, admin tasdig'i, AI qoralama (soxta Telegram va Claude serverlari bilan).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const calls = [];
const claudeReqs = [];
let srv;
const ADMIN = { id: 900, first_name: 'Admin' };
let upd = 0;

before(async () => {
  srv = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      res.setHeader('Content-Type', 'application/json');
      // Soxta Claude API
      if (req.url.startsWith('/v1/messages')) {
        claudeReqs.push({ headers: req.headers, body: JSON.parse(raw) });
        return res.end(JSON.stringify({
          id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_sequence: null,
          content: [{ type: 'text', text: '🌌 <b>Yulduzli osmon</b>\n\nTo‘y kechangiz osmoni — <a href="x">havola</a> taklifnomada. Mehmonlar ismlaringizni yulduzlar orasida ko‘radi, sana va manzil bir bosishda. Avval bepul ko‘ring ✨' }],
          usage: { input_tokens: 10, output_tokens: 10 },
        }));
      }
      const method = req.url.split('/').pop();
      const multipart = (req.headers['content-type'] || '').startsWith('multipart/');
      const body = multipart ? { chat_id: /name="chat_id"\r\n\r\n([^\r]+)/.exec(raw)?.[1], caption: /name="caption"\r\n\r\n([\s\S]*?)\r\n--/.exec(raw)?.[1], reply_markup: /name="reply_markup"\r\n\r\n([^\r]+)/.exec(raw)?.[1], hasPhoto: raw.includes('name="photo"') } : raw ? JSON.parse(raw) : {};
      calls.push({ method, body });
      res.end(JSON.stringify({ ok: true, result: method === 'getMe' ? { username: 'taklifimuz_bot' } : { message_id: calls.length } }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  Object.assign(process.env, {
    DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'channel-data-')),
    TELEGRAM_API: base,
    ANTHROPIC_BASE_URL: base,
    BOT_TOKEN: '123:TEST',
    ADMIN_TG_IDS: String(ADMIN.id),
    SITE_DOMAIN: 'documen.uz',
    CHANNEL_POST_DELAY_MS: '0',
  });
  delete process.env.ANTHROPIC_API_KEY;
});
after(() => srv?.close());

const cb = (data) => ({ update_id: ++upd, callback_query: { id: String(upd), from: ADMIN, data, message: { message_id: 1, chat: { id: ADMIN.id }, caption: 'x' } } });
const toChannel = () => calls.filter((c) => c.body?.chat_id === '@Taklifim_rasmiy' && ['sendPhoto', 'sendMessage'].includes(c.method));

test('Kanal: boshlang‘ich postlar admin tasdig‘i bilan joylanadi, tugmalar namuna va botga olib boradi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { setBotName, seedPosts } = await import('../server/channel.js');
  setBotName('taklifimuz_bot');
  const total = seedPosts().length;
  assert.ok(total >= 10);

  // Oddiy foydalanuvchi /kanal ni ishlata olmaydi
  await onUpdate({ update_id: ++upd, message: { message_id: 1, chat: { id: 5, type: 'private' }, from: { id: 5 }, text: '/kanal' } });
  assert.ok(!calls.some((c) => c.body?.chat_id === 5 && /Kanal:/.test(c.body.text || '')));

  await onUpdate({ update_id: ++upd, message: { message_id: 2, chat: { id: ADMIN.id, type: 'private' }, from: ADMIN, text: '/kanal' } });
  assert.match(calls.at(-1).body.text, new RegExp(`Boshlang‘ich postlar: <b>${total}</b>`));

  // Bittalab: har biri adminga rasm + tugmalar bilan, kanalga hali hech narsa yo'q
  await onUpdate(cb('ch:seed:review'));
  const offers = calls.filter((c) => c.method === 'sendPhoto' && c.body.chat_id === String(ADMIN.id));
  assert.equal(offers.length, total);
  assert.ok(offers.every((o) => o.body.hasPhoto && /ch:ok:seed-/.test(o.body.reply_markup)));
  assert.equal(toChannel().length, 0);

  await onUpdate(cb('ch:ok:seed-osmon'));
  const post = toChannel().at(-1).body;
  assert.match(post.caption, /osmoni/);
  assert.ok(post.reply_markup.includes('https://demo-osmon.documen.uz'));
  assert.ok(post.reply_markup.includes('https://t.me/taklifimuz_bot?start=kanal_osmon'));
  await onUpdate(cb('ch:ok:seed-osmon'));
  assert.equal(toChannel().length, 1, 'ikki marta joylanmaydi');
  await onUpdate(cb('ch:no:seed-kitob'));

  // Qolganlarini birdan
  await onUpdate(cb('ch:seed:all'));
  assert.equal(toChannel().length, total, 'barchasi bir martadan');
  // Salomlashuv — "hammasini joylash"da birinchi bo'lib chiqadi va tepaga qadaladi
  assert.match(toChannel()[1].body.caption, /Xush kelibsiz/);
  assert.ok(calls.some((c) => c.method === 'pinChatMessage' && c.body.chat_id === '@Taklifim_rasmiy'));
  assert.match(calls.at(-1).body.text, new RegExp(`${total - 1} ta post`));
});

test('Kanal: AI qoralama — Claude yozadi (fallback bilan), ruxsat etilmagan teglar olib tashlanadi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { makeDraft } = await import('../server/channel.js');
  // Kalitsiz — tayyor matn
  const plain = await makeDraft({ designId: 'suzani' });
  assert.match(plain.caption, /suzani/i);
  assert.equal(claudeReqs.length, 0);

  process.env.ANTHROPIC_API_KEY = 'test-key';
  await onUpdate({ update_id: ++upd, message: { message_id: 3, chat: { id: ADMIN.id, type: 'private' }, from: ADMIN, text: '/post' } });
  assert.equal(claudeReqs.length, 1);
  const req = claudeReqs[0];
  assert.equal(req.body.model, 'claude-opus-5-5');
  assert.equal(req.body.fallbacks, 'default');
  assert.match(req.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.match(req.body.system, /o‘zbek tilida/);
  const offer = calls.filter((c) => c.method === 'sendPhoto' && c.body.chat_id === String(ADMIN.id)).at(-1).body;
  assert.match(offer.caption, /Yulduzli osmon/);
  assert.doesNotMatch(offer.caption, /<a /, 'havola tegi olib tashlandi');
  assert.match(offer.reply_markup, /ch:re:ai-/);

  // "Boshqa matn" — yangi qoralama
  const id = /ch:re:(ai-[\w]+)/.exec(offer.reply_markup)[1];
  await onUpdate(cb(`ch:re:${id}`));
  assert.equal(claudeReqs.length, 2);
  delete process.env.ANTHROPIC_API_KEY;
});
