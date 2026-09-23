// Vercel serverless funksiyasi: mehmon javobini Telegram'ga yuboradi.
// Kerakli muhit o'zgaruvchilari (Vercel -> Settings -> Environment Variables):
//   TELEGRAM_BOT_TOKEN — @BotFather bergan token
//   TELEGRAM_CHAT_ID   — javoblar keladigan chat/guruh ID si (bir nechta bo'lsa vergul bilan)

const MAX_BODY = 8 * 1024;
const LIMITS = { name: 80, phone: 30, message: 500 };

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  // Vercel body'ni o'zi parse qiladi; dev serverda esa oqimdan o'qiymiz.
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new Error('too_large');
  }
  return JSON.parse(raw || '{}');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export default async function handler(req, res) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatIds = (process.env.TELEGRAM_CHAT_ID || '').split(',').map((s) => s.trim()).filter(Boolean);

  // Brauzerda /api/rsvp ni ochib, bot ulanganini tekshirish mumkin (maxfiy qiymatlar ko'rsatilmaydi)
  if (req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      wedding: process.env.WEDDING || 'demo',
      telegramBotToken: token ? 'bor' : "YO'Q",
      telegramChatId: chatIds.length ? `bor (${chatIds.length} ta)` : "YO'Q",
      ready: Boolean(token && chatIds.length),
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  if (!token || !chatIds.length) {
    return send(res, 503, { ok: false, error: 'not_configured' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { ok: false, error: 'bad_request' });
  }

  // Botlarga qarshi yashirin maydon: to'ldirilgan bo'lsa jimgina "muvaffaqiyat" qaytaramiz
  if (body.website) return send(res, 200, { ok: true });

  const name = clean(body.name, LIMITS.name);
  const phone = clean(body.phone, LIMITS.phone);
  const message = clean(body.message, LIMITS.message);
  const attending = body.attending === 'yes' ? 'yes' : body.attending === 'no' ? 'no' : '';
  const guests = attending === 'yes' ? Math.min(Math.max(parseInt(body.guests, 10) || 1, 1), 20) : 0;
  const couple = clean(body.couple, 120);

  if (name.length < 2 || !attending) {
    return send(res, 422, { ok: false, error: 'validation' });
  }
  if (phone && !/^\+?[\d\s()-]{7,}$/.test(phone)) {
    return send(res, 422, { ok: false, error: 'validation' });
  }

  const site = process.env.WEDDING || 'demo';
  const host = clean(req.headers['x-forwarded-host'] || req.headers.host || '', 120);
  const details = [`👤 <b>Ism:</b> ${esc(name)}`];
  if (phone) details.push(`📞 <b>Telefon:</b> ${esc(phone)}`);
  if (attending === 'yes') details.push(`👥 <b>Mehmonlar soni:</b> ${guests}`);
  if (message) details.push(`💬 <b>Tilak:</b> ${esc(message)}`);

  const text = [
    attending === 'yes' ? '✅ <b>Keladi</b>' : '❌ <b>Kela olmaydi</b>',
    details.join('\n'),
    `💍 ${esc(couple || site)}${host ? ` · ${esc(host)}` : ''}`,
  ].join('\n\n');

  try {
    const results = await Promise.all(
      chatIds.map((chat_id) =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
          signal: AbortSignal.timeout(8000),
        }),
      ),
    );
    if (results.some((r) => !r.ok)) {
      const detail = await Promise.all(results.filter((r) => !r.ok).map((r) => r.text()));
      console.error('Telegram xatosi:', detail.join(' | '));
      return send(res, 502, { ok: false, error: 'telegram_failed' });
    }
  } catch (err) {
    console.error('Telegram bilan aloqa xatosi:', err);
    return send(res, 502, { ok: false, error: 'telegram_failed' });
  }

  return send(res, 200, { ok: true });
}
