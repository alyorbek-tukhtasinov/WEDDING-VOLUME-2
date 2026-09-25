// API funksiyalari uchun umumiy yordamchilar.
// "_" bilan boshlangan papka Vercel'da alohida funksiya bo'lmaydi.
import crypto from 'node:crypto';
import { resolveSlug, SLUG_RE } from './slug.js';
import { requestContext } from './context.js';

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
// Aniqlab bo'lmasa — null: hech narsa saqlanmaydi (aralashib ketmasligi uchun).
export function weddingSlug() {
  const ctx = requestContext.getStore();
  const slug = ctx ? ctx.slug : resolveSlug().slug;
  return slug && SLUG_RE.test(slug) ? slug : null;
}

export const weddingSlugSource = () => (requestContext.getStore() ? 'server' : resolveSlug().source);

/** Shu taklifnomaning admin paroli: serverda — har mijozga alohida, Vercel'da — ADMIN_PASSWORD. */
export function adminPassword() {
  const ctx = requestContext.getStore();
  return ((ctx ? ctx.adminPassword : process.env.ADMIN_PASSWORD) || '').trim();
}

/** Admin parolini tekshirish (vaqt bo'yicha hujumlarga chidamli). */
export function checkAdmin(req) {
  const expected = adminPassword();
  if (!expected) return 'no_password';
  const header = req.headers.authorization || '';
  const given = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return given && crypto.timingSafeEqual(a, b) ? 'ok' : 'denied';
}
