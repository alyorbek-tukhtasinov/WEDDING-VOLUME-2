// Mehmon javoblarini Upstash Redis'da saqlash (Vercel -> Storage -> Upstash for Redis).
// Quyidagilardan istalgan biri bo'lsa ishlaydi (Vercel integratsiyasi o'zi qo'shadi):
//   KV_REST_API_URL + KV_REST_API_TOKEN
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   REDIS_URL yoki KV_URL  (rediss://default:PAROL@xxx.upstash.io:6379)
// Har bir mijoz javoblari alohida kalitda saqlanadi, bitta bazani bir nechta sayt ishlatishi mumkin.
import { weddingSlug } from './http.js';

const MAX_ENTRIES = 3000;

function credentials() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  if (url && token) return { url: url.replace(/\/+$/, ''), token };

  // Upstash'da REST manzili — https://<host>, REST kaliti — baza paroli
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL || '';
  try {
    const u = new URL(redisUrl);
    if (/^rediss?:$/.test(u.protocol) && u.hostname.endsWith('.upstash.io') && u.password) {
      return { url: `https://${u.hostname}`, token: decodeURIComponent(u.password) };
    }
  } catch {
    /* noto'g'ri yoki bo'sh */
  }
  return null;
}

export const storeReady = () => Boolean(credentials());

async function redis(...command) {
  const cred = credentials();
  if (!cred) throw new Error('store_not_configured');
  const res = await fetch(cred.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cred.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`redis: ${json.error || res.status}`);
  return json.result;
}

const key = () => `taklifnoma:${weddingSlug()}:rsvp`;

/** Javobni saqlaydi. Bir mehmon (id) qayta yuborsa — eski javobi yangilanadi. */
export async function saveEntry(entry) {
  const exists = await redis('HEXISTS', key(), entry.id);
  if (!exists && (await redis('HLEN', key())) >= MAX_ENTRIES) throw new Error('store_full');
  await redis('HSET', key(), entry.id, JSON.stringify(entry));
}

export async function listEntries() {
  const flat = (await redis('HGETALL', key())) || [];
  const out = [];
  for (let i = 1; i < flat.length; i += 2) {
    try {
      out.push(JSON.parse(flat[i]));
    } catch {
      /* buzilgan yozuv — o'tkazib yuboramiz */
    }
  }
  return out.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

/** Ulanishni tekshirish: true yoki xato matni. */
export async function ping() {
  try {
    return (await redis('PING')) === 'PONG' ? true : 'javob kutilganidek emas';
  } catch (err) {
    return err.message;
  }
}

export async function deleteEntry(id) {
  return redis('HDEL', key(), id);
}
