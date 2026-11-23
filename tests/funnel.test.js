// Voronka (/voronka): kim qayergacha yetdi va qayerda to'xtadi — jurnal + hozirgi holat bo'yicha.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const calls = [];
let tgServer;
const ADMIN = 900;
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
    DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'funnel-data-')),
    PANEL_WORK_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'funnel-work-')),
    TELEGRAM_API: `http://127.0.0.1:${tgServer.address().port}`,
    BOT_TOKEN: '123:TEST',
    ADMIN_TG_IDS: String(ADMIN),
    SITE_DOMAIN: 'documen.uz',
    REQUIRE_SUB: '0',
    CHANNEL_DISCOUNT: '0',
  });
});
after(() => tgServer?.close());

const lastTo = (chat) => calls.filter((c) => c.method === 'sendMessage' && String(c.body.chat_id) === String(chat)).map((c) => c.body.text);
const user = (id) => ({ id, first_name: `U${id}` });
const msg = (from, text, extra = {}) => ({ update_id: ++upd, message: { message_id: upd, chat: { id: from.id, type: 'private' }, from, text, ...extra } });
const cb = (from, data) => ({ update_id: ++upd, callback_query: { id: String(upd), from, data, message: { message_id: 1, chat: { id: from.id }, text: 'x' } } });

test('buildFunnel: bosqichlar, to‘xtagan savol, manbalar (sintetik ma’lumot)', async () => {
  const { buildFunnel, funnelText, splitText } = await import('../server/funnel.js');
  const now = Date.parse('2026-11-23T12:00:00Z');
  const ago = (h) => new Date(now - h * 3600e3).toISOString();
  const data = {
    leads: {
      1: { src: 'ig_volume2', at: ago(50) }, // faqat /start
      2: { src: 'ig_volume2', at: ago(40) }, // sanada to'xtagan
      3: { src: 'organik', at: ago(30) }, // qoralama
      4: { src: 'organik', at: ago(20) }, // to'lov oynasi
      5: { src: 'ig_osmon', at: ago(10) }, // to'lagan
      6: { src: 'organik', at: ago(24 * 60) }, // davrdan tashqarida (60 kun oldin)
      7: { src: 'organik', at: ago(1), blocked: true }, // hozir yozyapti
    },
    wizard: {
      2: { step: 'date', at: now - 39 * 3600e3, edit: false },
      5: { step: 'time', at: now - 3600e3, edit: true }, // tahrirlash — hisobga olinmaydi
      7: { step: 'groom', at: now - 5 * 60e3, edit: false },
    },
    sites: [
      { slug: 'a', meta: { owner: { id: 3 }, status: 'draft', createdAt: ago(29) } },
      { slug: 'b', meta: { owner: { id: 4 }, status: 'awaiting', createdAt: ago(19), awaitingAt: ago(18) } },
      { slug: 'c', meta: { owner: { id: 5 }, status: 'paid', createdAt: ago(9), paidAt: ago(8) } },
    ],
    events: [],
  };
  const r = buildFunnel({ days: 30, now, data });
  assert.equal(r.total, 6, '60 kun oldingi foydalanuvchi kirmaydi');
  assert.deepEqual(r.funnel.map((f) => f.count), [6, 5, 3, 2, 1, 1]);
  assert.equal(r.after.onlyStart, 1);
  assert.equal(r.activeNow, 1);
  assert.deepEqual(r.stuck.map((s) => [s.step, s.count]), [['date', 1]]);
  assert.equal(r.after.draftNoPay, 1);
  assert.equal(r.after.payNoReceipt, 1);
  assert.equal(r.after.blocked, 1);
  assert.deepEqual(r.sources[0], { src: 'organik', start: 3, wizard: 3, draft: 2, paid: 0 });
  assert.equal(r.hasLog, false);

  const text = funnelText(r);
  assert.match(text, /Sana: <b>1<\/b>/);
  assert.match(text, /jurnali hali bo‘sh/);
  assert.ok(text.length < 4096);
  assert.deepEqual(splitText('a\n\nb\n\nc', 4), ['a\n\nb', 'c']);

  // Hammasi (0) — eski foydalanuvchi ham kiradi
  assert.equal(buildFunnel({ days: 0, now, data }).total, 7);
});

test('Bot: qadamlar jurnalga yoziladi, /voronka admin uchun ishlaydi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { readEvents } = await import('../server/funnel.js');
  const A = user(101);
  const B = user(102);
  const C = user(103);

  // A: reklamadan keldi, namunalarni ko'rdi, boshqa hech narsa qilmadi
  await onUpdate(msg(A, '/start ig_volume2'));
  await onUpdate(msg(A, '👀 Namunalar'));

  // B: savollarni boshladi, sanani xato yozdi, keyin /start bosib chiqib ketdi
  await onUpdate(msg(B, '/start'));
  await onUpdate(msg(B, '✨ Taklifnoma yaratish'));
  await onUpdate(cb(B, 'wz:kind:wedding'));
  await onUpdate(cb(B, 'wz:template:volume2'));
  await onUpdate(cb(B, 'wz:eventType:nikoh'));
  await onUpdate(msg(B, 'Jasur'));
  await onUpdate(msg(B, 'Madina'));
  await onUpdate(msg(B, '45.45.2020'));
  await onUpdate(msg(B, '/start'));

  // C: hammasini to'ldirdi va to'lov oynasini ochdi
  await onUpdate(msg(C, '/start fb'));
  await onUpdate(cb(C, 'new:volume2'));
  await onUpdate(cb(C, 'wz:eventType:nikoh'));
  await onUpdate(msg(C, 'Sardor'));
  await onUpdate(msg(C, 'Laylo'));
  await onUpdate(msg(C, '16.11.2027'));
  await onUpdate(cb(C, 'wz:time:1800'));
  await onUpdate(msg(C, 'Bahor to‘yxonasi'));
  await onUpdate(msg(C, 'Toshkent, Chilonzor'));
  await onUpdate(cb(C, 'wz:map:-'));
  await onUpdate(cb(C, 'wz:voice:couple'));
  const { sitesOf } = await import('../server/data.js');
  const [site] = sitesOf(C.id);
  assert.ok(site, 'C qoralama yaratdi');
  await onUpdate(cb(C, `pay:${site.slug}`));

  const ev = readEvents();
  const of = (u) => ev.filter((e) => e.u === String(u.id)).map((e) => (e.s ? `${e.e}:${e.s}` : e.e));
  assert.deepEqual(of(A), ['start', 'demos']);
  assert.deepEqual(of(B), ['start', 'wz_start', 'wz_step:kind', 'wz_step:template', 'wz_step:eventType', 'wz_step:groom', 'wz_step:bride', 'wz_step:date', 'wz_err:date', 'start', 'wz_reset:date']);
  assert.ok(of(C).includes('wz_done') && of(C).at(-1) === 'pay');
  assert.equal(ev.find((e) => e.u === String(A.id)).src, 'ig_volume2');

  // Admin harakatlari jurnalga yozilmaydi
  const before = ev.length;
  await onUpdate(msg(user(ADMIN), '/voronka 7'));
  assert.equal(readEvents().length, before);

  const report = lastTo(ADMIN).join('\n\n');
  assert.match(report, /Voronka — oxirgi 7 kun/);
  assert.match(report, /botga kelgan 3 kishi/);
  assert.match(report, /Faqat \/start bosib, yaratishni boshlamagan: <b>1<\/b> \(shundan namunalarni ko‘rgan: 1\)/);
  assert.match(report, /Savollar o‘rtasida qolgan: <b>1<\/b>\n/);
  assert.match(report, /Sana: <b>1<\/b> \(1 tasida javob xato/);
  assert.match(report, /Eng ko‘p yo‘qotish:<\/b> \/start → yaratishni boshlash/);
  assert.match(report, /To‘lov oynasini ochgan, chek yubormagan: <b>1<\/b>/);
  assert.match(report, /fb: 1 → 1 → 1 → <b>0<\/b>/);

  // Oddiy foydalanuvchi /voronka ni ishlata olmaydi (adminga savol sifatida ketadi)
  calls.length = 0;
  await onUpdate(msg(A, '/voronka'));
  assert.ok(!lastTo(A).some((t) => /Voronka/.test(t)));
});
