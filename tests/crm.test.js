// Mijozlar bilan ishlash: to'lanmagan taklifnomalarga eslatmalar (chegirma bilan), /mijozlar, shaxsiy va ommaviy xabar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const calls = [];
const blockedIds = new Set();
let srv;
let upd = 0;
const ADMIN = { id: 900, first_name: 'Admin' };
const A = { id: 801, first_name: 'Dilnoza', username: 'dilnoza' };
const B = { id: 802, first_name: 'Sardor' };
const C = { id: 803, first_name: 'Kamola' };

before(async () => {
  srv = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      const method = req.url.split('/').pop();
      let body = {};
      try {
        body = b ? JSON.parse(b) : {};
      } catch {
        body = { multipart: true, chat_id: /name="chat_id"\r\n\r\n(\d+)/.exec(b)?.[1] }; // fayl yuklash (sendAudio)
      }
      calls.push({ method, body });
      res.setHeader('Content-Type', 'application/json');
      if (blockedIds.has(Number(body.chat_id))) return res.end(JSON.stringify({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }));
      if (method === 'getChatMember') return res.end(JSON.stringify({ ok: true, result: { status: 'left' } }));
      if (method === 'sendAudio') return res.end(JSON.stringify({ ok: true, result: { message_id: calls.length, audio: { file_id: 'AUD-1' } } }));
      res.end(JSON.stringify({ ok: true, result: { message_id: calls.length } }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  Object.assign(process.env, {
    DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'crm-data-')),
    TELEGRAM_API: `http://127.0.0.1:${srv.address().port}`,
    BOT_TOKEN: '123:TEST',
    ADMIN_TG_IDS: '900',
    SITE_DOMAIN: 'documen.uz',
    REQUIRE_SUB: '0',
    BROADCAST_DELAY_MS: '0',
    PRICE: '70000',
  });
});
after(() => srv?.close());

const msg = (from, text, extra = {}) => ({ update_id: ++upd, message: { message_id: 1000 + upd, chat: { id: from.id, type: 'private' }, from, text, ...extra } });
const cb = (from, data) => ({ update_id: ++upd, callback_query: { id: String(upd), from, data, message: { message_id: 5, chat: { id: from.id } } } });
const sentTo = (id) => calls.filter((c) => ['sendMessage', 'copyMessage'].includes(c.method) && String(c.body.chat_id) === String(id));
const lastTo = (id) => sentTo(id).at(-1)?.body;
const editsOrSends = () => calls.filter((c) => ['sendMessage', 'editMessageText'].includes(c.method) && String(c.body.chat_id) === String(ADMIN.id)).at(-1)?.body;
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
// Toshkentda kunduzi (soat 12:00) — eslatmalar faqat 9:00–21:00 da
const noonTashkent = () => {
  const d = new Date();
  d.setUTCHours(7, 0, 0, 0);
  return d.getTime();
};

test('Eslatmalar: 3 bosqich, chegirma muddati, to‘lov summasi; to‘laganlarga va tunda yuborilmaydi', async () => {
  const { onUpdate, runFollowups } = await import('../server/bot.js');
  const { writeSite, readSite, updateMeta, recordLead, STATUS } = await import('../server/data.js');
  const { defaultConfig } = await import('../src/lib/starter.js');

  for (const u of [A, B, C]) recordLead(u.id, 'ig_volume2', u);
  const base = defaultConfig('volume2');
  const cfg = { ...base, couple: { ...base.couple, groom: 'Sardor', bride: 'Dilnoza' }, venue: { ...base.venue, name: 'Bahor', address: 'Toshkent' }, event: { ...base.event, date: '2099-05-20' } };
  writeSite('dil-sar', { config: cfg, meta: { owner: { id: A.id, name: 'Dilnoza Karimova', username: 'dilnoza' }, status: STATUS.draft, price: 70000, createdAt: ago(5) } });
  writeSite('paid-one', { config: cfg, meta: { owner: { id: B.id, name: 'Sardor' }, status: STATUS.paid, price: 70000, createdAt: ago(50), paidAt: ago(40) } });
  writeSite('b-draft', { config: cfg, meta: { owner: { id: B.id, name: 'Sardor' }, status: STATUS.draft, price: 70000, createdAt: ago(30) } });
  // updatedAt — writeSite hozirgi vaqtni qo'yadi; 3 soat oldin o'zgartirilgandek qilamiz
  const back = (slug, h) => {
    const f = path.join(process.env.DATA_DIR, 'sites', slug, 'meta.json');
    fs.writeFileSync(f, JSON.stringify({ ...JSON.parse(fs.readFileSync(f, 'utf8')), updatedAt: ago(h) }));
  };
  back('dil-sar', 3);
  back('b-draft', 30);

  // Tunda (Toshkent 02:00) — hech narsa
  const night = noonTashkent() - 10 * 3600e3;
  await runFollowups({}, { now: night });
  assert.equal(sentTo(A.id).length, 0, 'tunda eslatma yo‘q');

  // 1-bosqich (force — soatdan qat'i nazar)
  calls.length = 0;
  await runFollowups({}, { force: true });
  const m1 = lastTo(A.id);
  assert.ok(m1, '1-eslatma yuborildi');
  assert.match(m1.text, /Dilnoza, taklifnomangiz tayyor turibdi/);
  assert.ok(JSON.stringify(m1.reply_markup).includes('pay:dil-sar'));
  assert.equal(sentTo(B.id).length, 0, 'to‘lagan mijozga eslatma yo‘q');
  assert.ok(lastTo(ADMIN.id).text.includes('Eslatmalar yuborildi (1)'));
  assert.equal(readSite('dil-sar').meta.followup.stage, 1);

  // Darhol qayta — vaqti kelmagan
  calls.length = 0;
  await runFollowups({}, { force: true });
  assert.equal(sentTo(A.id).length, 0);

  // 2-bosqich: 23 soat o'tdi → 10 000 chegirma, 24 soat
  updateMeta('dil-sar', (m) => ({ ...m, followup: { ...m.followup, at: ago(23) } }));
  await runFollowups({}, { force: true });
  const m2 = lastTo(A.id);
  assert.match(m2.text, /maxsus sovg‘a/);
  assert.match(m2.text, /70 000 so‘m<\/s> → <b>60 000 so‘m/);
  assert.equal(readSite('dil-sar').meta.promo.amount, 10000);

  // To'lov sahifasi chegirmani ko'rsatadi va muddatni "qulflaydi"
  calls.length = 0;
  await onUpdate(cb(A, 'pay:dil-sar'));
  const pay = sentTo(A.id).find((c) => /To‘lov/.test(c.body.text || ''))?.body;
  assert.match(pay.text, /Maxsus chegirma: <b>−10 000 so‘m/);
  assert.match(pay.text, /Summa: <b>60 000 so‘m/);
  assert.equal(readSite('dil-sar').meta.promo.locked, true);
  // Muddat o'tsa ham — qulflangan chegirma qoladi
  updateMeta('dil-sar', (m) => ({ ...m, promo: { ...m.promo, until: ago(1) } }));
  await onUpdate(msg(A, '', { photo: [{ file_id: 'chek1' }] }));
  const receipt = calls.find((c) => c.method === 'sendPhoto' && String(c.body.chat_id) === '900');
  assert.match(receipt.body.caption, /💰 60 000 so‘m/);
  assert.match(receipt.body.caption, /Maxsus chegirma <b>10 000 so‘m/);

  // Chek yuborilgach — eslatma yo'q
  calls.length = 0;
  updateMeta('dil-sar', (m) => ({ ...m, followup: { ...m.followup, at: ago(100) } }));
  await runFollowups({}, { force: true });
  assert.equal(sentTo(A.id).length, 0, 'chek yuborgan mijozga eslatma yo‘q');
});

test('/mijozlar: ro‘yxat, karta, shaxsiy xabar, mijoz javobi adminga tugma bilan', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { writeSite, STATUS } = await import('../server/data.js');
  const { defaultConfig } = await import('../src/lib/starter.js');
  writeSite('kam-new', { config: defaultConfig('volume3') /* to'ldirilmagan */, meta: { owner: { id: C.id, name: 'Kamola' }, status: STATUS.draft, price: 70000, createdAt: ago(1) } });

  // Mijoz uchun buyruq ishlamaydi
  calls.length = 0;
  await onUpdate(msg(C, '/mijozlar'));
  assert.ok(!(lastTo(C.id)?.text || '').includes('Mijozlar'));

  calls.length = 0;
  await onUpdate(msg(ADMIN, '/mijozlar'));
  const ov = lastTo(ADMIN.id);
  assert.match(ov.text, /👥 <b>Mijozlar<\/b>/);
  assert.match(ov.text, /Qoralamalar: <b>2<\/b>/); // kam-new, b-draft (dil-sar — chek tekshiruvda)
  assert.match(ov.text, /Chek tekshiruvda: <b>1<\/b>/);
  assert.ok(JSON.stringify(ov.reply_markup).includes('m:s:draft:0'));

  await onUpdate(cb(ADMIN, 'm:s:draft:0'));
  const list = editsOrSends();
  assert.ok(JSON.stringify(list.reply_markup).includes('m:c:kam-new'));

  await onUpdate(cb(ADMIN, 'm:c:kam-new'));
  const card = editsOrSends();
  assert.match(card.text, /Kamola/);
  assert.ok(JSON.stringify(card.reply_markup).includes(`m:w:${C.id}`));
  assert.ok(JSON.stringify(card.reply_markup).includes('m:p:kam-new'));

  // Shaxsiy xabar
  await onUpdate(cb(ADMIN, `m:w:${C.id}`));
  calls.length = 0;
  await onUpdate(msg(ADMIN, 'Salom! Yordam kerakmi?'));
  assert.equal(lastTo(C.id).text, '💬 <b>Admin:</b> Salom! Yordam kerakmi?');
  assert.match(lastTo(ADMIN.id).text, /Yuborildi/);
  // Keyingi admin xabari — oddiy (amal tugagan)
  calls.length = 0;
  await onUpdate(msg(ADMIN, 'boshqa matn'));
  assert.equal(sentTo(C.id).length, 0);

  // Mijoz javobi → adminga "Javob yozish" tugmasi bilan
  calls.length = 0;
  await onUpdate(msg(C, 'Rahmat, narxi qancha?'));
  const q = lastTo(ADMIN.id);
  assert.match(q.text, /narxi qancha/);
  assert.ok(JSON.stringify(q.reply_markup).includes(`m:w:${C.id}`));
  assert.ok(JSON.stringify(q.reply_markup).includes('m:c:kam-new'));

  // Admin chegirma beradi → mijozga sovg'a xabari
  calls.length = 0;
  await onUpdate(cb(ADMIN, 'm:p:kam-new'));
  assert.match(lastTo(C.id).text, /maxsus sovg‘a/);
});

test('/xabar: guruh tanlash, ko‘rib tasdiqlash, bloklaganlar hisobga olinadi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { readLeads, recordLead } = await import('../server/data.js');
  const D = { id: 804, first_name: 'Jasur' };
  recordLead(D.id, 'organik', D);
  blockedIds.add(D.id);

  await onUpdate(msg(ADMIN, '/xabar'));
  const menu = lastTo(ADMIN.id);
  assert.ok(JSON.stringify(menu.reply_markup).includes('m:bs:all'));
  await onUpdate(cb(ADMIN, 'm:bs:all'));
  calls.length = 0;
  await onUpdate(msg(ADMIN, 'Yangi dizayn chiqdi! 🎉'));
  const confirm = lastTo(ADMIN.id);
  assert.match(confirm.text, /4 kishiga/); // A, B, C, D (admin yo'q)
  assert.ok(JSON.stringify(confirm.reply_markup).includes('m:go'));
  calls.length = 0;
  await onUpdate(cb(ADMIN, 'm:go'));
  for (let i = 0; i < 50 && !calls.some((c) => /Yuborildi:/.test(c.body.text || '')); i++) await new Promise((r) => setTimeout(r, 20));
  const copies = calls.filter((c) => c.method === 'copyMessage');
  assert.equal(copies.length, 4);
  assert.ok(copies.every((c) => c.body.from_chat_id === ADMIN.id));
  assert.match(lastTo(ADMIN.id).text, /Yuborildi:<\/b> 3 ta[\s\S]*1 tasi botni bloklagan/);
  assert.equal(readLeads()[String(D.id)].blocked, true);

  // Keyingi safar bloklagan hisobga olinmaydi
  await onUpdate(cb(ADMIN, 'm:bs:all'));
  await onUpdate(msg(ADMIN, 'Ikkinchi xabar'));
  assert.match(lastTo(ADMIN.id).text, /3 kishiga/);
  await onUpdate(msg(ADMIN, '/bekor'));
  assert.match(lastTo(ADMIN.id).text, /Bekor qilindi/);
});

test('Admin yuborilgan eslatma matnini ko‘radi; mijoz musiqani eshitib tanlaydi', async () => {
  const { onUpdate } = await import('../server/bot.js');
  const { writeSite, readSite, STATUS } = await import('../server/data.js');
  const { defaultConfig } = await import('../src/lib/starter.js');

  // dil-sar ga 1- va 2-eslatma yuborilgan (1-testda)
  calls.length = 0;
  await onUpdate(cb(ADMIN, 'm:t:dil-sar'));
  const shown = lastTo(ADMIN.id);
  assert.match(shown.text, /2-eslatma/);
  assert.match(shown.text, /maxsus sovg‘a/);
  assert.match(shown.text, /Tugmalari: .*to‘lash/);

  // Musiqa
  const base = defaultConfig('volume3');
  const cfg = { ...base, couple: { ...base.couple, groom: 'Aziz', bride: 'Kamola' }, venue: { ...base.venue, name: 'Navruz', address: 'Toshkent' }, event: { ...base.event, date: '2099-06-01' } };
  writeSite('aziz-kamola', { config: cfg, meta: { owner: { id: C.id, name: 'Kamola' }, status: STATUS.draft, price: 70000, createdAt: ago(1) } });
  calls.length = 0;
  await onUpdate(cb(C, 'wz:menu:aziz-kamola'));
  assert.ok(JSON.stringify(lastTo(C.id).reply_markup).includes('wz:edit:aziz-kamola:music'));
  await onUpdate(cb(C, 'wz:edit:aziz-kamola:music'));
  const list = lastTo(C.id);
  assert.match(list.text, /Fon musiqasi/);
  assert.ok(JSON.stringify(list.reply_markup).includes('wz:music:p:musiqa-2'));
  // Eshitib ko'rish — audio yuklanadi, keyingi safar file_id bilan
  await onUpdate(cb(C, 'wz:music:p:musiqa-2'));
  assert.ok(calls.some((c) => c.method === 'sendAudio' && c.body.multipart && c.body.chat_id === String(C.id)));
  calls.length = 0;
  await onUpdate(cb(C, 'wz:music:p:musiqa-2'));
  assert.equal(calls.find((c) => c.method === 'sendAudio').body.audio, 'AUD-1');
  // Tanlash — saqlanadi
  await onUpdate(cb(C, 'wz:music:musiqa-2'));
  assert.equal(readSite('aziz-kamola').config.musicTrack, 'musiqa-2');
  assert.match(lastTo(C.id).text, /🎵 Musiqa: Shohruhxon — Men seni sevaman/);
});

test('Bezakli Telegram ismlari eslatmada oddiy ko‘rinishda', async () => {
  const { runFollowups } = await import('../server/bot.js');
  const { writeSite, recordLead, STATUS } = await import('../server/data.js');
  const { defaultConfig } = await import('../src/lib/starter.js');
  const base = defaultConfig('volume2');
  const cfg = { ...base, couple: { ...base.couple, groom: 'Ruslan', bride: 'Shahnoza' }, venue: { ...base.venue, name: 'Navruz', address: 'Toshkent' }, event: { ...base.event, date: '2099-07-01' } };
  const cases = [
    [811, '𝓫𝓪𝓴𝓱𝓪𝓭𝓲𝓻𝓸𝓿𝓷𝓪_𝓼𝓱𝓪𝓴𝓱𝓷𝓸𝔃𝓪', /^💌 <b>Bakhadirovna, taklifnomangiz/],
    [812, '‘°ºø•❤️•.¸Ollaberganova ¸.•❤️•øº°‘', /^💌 <b>Ollaberganova, taklifnomangiz/],
    [813, 'ص🤍', /^💌 <b>Taklifnomangiz/],
  ];
  for (const [id, name] of cases) {
    recordLead(id, 'organik', { id, first_name: name });
    writeSite(`fancy-${id}`, { config: cfg, meta: { owner: { id, name }, status: STATUS.draft, price: 70000, createdAt: ago(5) } });
    const f = path.join(process.env.DATA_DIR, 'sites', `fancy-${id}`, 'meta.json');
    fs.writeFileSync(f, JSON.stringify({ ...JSON.parse(fs.readFileSync(f, 'utf8')), updatedAt: ago(3) }));
  }
  calls.length = 0;
  await runFollowups({}, { force: true });
  for (const [id, , re] of cases) assert.match(lastTo(id).text, re);
});
