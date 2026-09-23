// API funksiyalari uchun umumiy yordamchilar.
// "_" bilan boshlangan papka Vercel'da alohida funksiya bo'lmaydi.
import crypto from 'node:crypto';

const MAX_BODY = 8 * 1024;

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export async function readBody(req) {
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

export const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

// Har bir sayt ma'lumotlari shu nom bo'yicha alohida saqlanadi. Nom faqat serverdagi
// sozlamadan olinadi — mehmon yoki brauzer uni o'zgartira olmaydi.
// Vercel'da WEDDING yo'q bo'lsa — null: hech narsa saqlanmaydi (aralashib ketmasligi uchun).
export function weddingSlug() {
  const slug = (process.env.WEDDING || '').trim().toLowerCase();
  if (slug) return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
  return process.env.VERCEL ? null : 'demo';
}

/** Admin parolini tekshirish (vaqt bo'yicha hujumlarga chidamli). */
export function checkAdmin(req) {
  const expected = (process.env.ADMIN_PASSWORD || '').trim();
  if (!expected) return 'no_password';
  const header = req.headers.authorization || '';
  const given = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return given && crypto.timingSafeEqual(a, b) ? 'ok' : 'denied';
}
