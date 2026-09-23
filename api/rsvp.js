// Mehmon javobini qabul qilib, bazaga saqlaydi. Javoblar saytning /admin sahifasida,
// tilaklar esa taklifnomaning "Tilaklar" bo'limida ko'rinadi.
//
// Muhit o'zgaruvchilari (Vercel -> Settings -> Environment Variables):
//   Upstash Redis (Vercel -> Storage orqali ulansa o'zi qo'shiladi) — _lib/store.js ga qarang
//   ADMIN_PASSWORD — /admin sahifasi paroli
//
// GET /api/rsvp — baza ulanganini tekshiradi (maxfiy qiymatlarsiz).
import crypto from 'node:crypto';
import { send, readBody, clean, weddingSlug } from './_lib/http.js';
import { storeReady, storeHost, saveEntry, ping } from './_lib/store.js';

const LIMITS = { name: 80, phone: 30, message: 500 };
const ID_RE = /^[a-z0-9-]{8,64}$/i;

export default async function handler(req, res) {
  const store = storeReady();

  if (req.method === 'GET') {
    const slug = weddingSlug();
    const connection = !slug
      ? "WEDDING o'rnatilmagan — javoblar saqlanmaydi"
      : store
        ? await ping()
        : "o'zgaruvchi topilmadi";
    return send(res, 200, {
      ok: true,
      wedding: slug || "YO'Q ❌",
      malumotlarKaliti: slug ? `taklifnoma:${slug}:rsvp` : null,
      baza: connection === true ? 'ulangan ✅' : `ulanmagan ❌ (${connection})`,
      server: storeHost(),
      adminParol: process.env.ADMIN_PASSWORD ? 'bor ✅' : "YO'Q ❌",
      ready: connection === true,
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (!store) {
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

  const entry = {
    id: ID_RE.test(body.id || '') ? body.id : crypto.randomUUID(),
    name: clean(body.name, LIMITS.name),
    phone: clean(body.phone, LIMITS.phone),
    message: clean(body.message, LIMITS.message),
    attending: body.attending === 'yes' ? 'yes' : body.attending === 'no' ? 'no' : '',
    guests: 0,
    updatedAt: new Date().toISOString(),
  };
  entry.guests = entry.attending === 'yes' ? Math.min(Math.max(parseInt(body.guests, 10) || 1, 1), 20) : 0;

  if (entry.name.length < 2 || !entry.attending) {
    return send(res, 422, { ok: false, error: 'validation' });
  }
  if (entry.phone && !/^\+?[\d\s()-]{7,}$/.test(entry.phone)) {
    return send(res, 422, { ok: false, error: 'validation' });
  }

  try {
    await saveEntry(entry);
  } catch (err) {
    console.error('Bazaga saqlash xatosi:', err);
    return send(res, 502, { ok: false, error: 'store_failed' });
  }
  return send(res, 200, { ok: true, id: entry.id });
}
