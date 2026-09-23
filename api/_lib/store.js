// Mehmon javoblarini Redis'da saqlash (Vercel -> Storage -> Upstash for Redis).
// Quyidagilardan istalgan biri bo'lsa ishlaydi:
//   REDIS_URL yoki KV_URL                              — rediss://default:PAROL@xxx.upstash.io:6379
//   KV_REST_API_URL + KV_REST_API_TOKEN                — Upstash REST
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  — Upstash REST
// Har bir mijoz javoblari alohida kalitda saqlanadi, bitta bazani bir nechta sayt ishlatishi mumkin.
import { createClient } from 'redis';
import { weddingSlug } from './http.js';

const MAX_ENTRIES = 3000;
const TIMEOUT = 8000;

function backend() {
  const restUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const restToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  if (restUrl && restToken) return { type: 'rest', url: restUrl.replace(/\/+$/, ''), token: restToken };

  // Qo'shtirnoq yoki bo'sh joy bilan nusxalangan bo'lsa ham qabul qilamiz
  const redisUrl = (process.env.REDIS_URL || process.env.KV_URL || '').trim().replace(/^["']|["']$/g, '');
  if (/^rediss?:\/\//.test(redisUrl)) return { type: 'tcp', url: redisUrl };
  return null;
}

export const storeReady = () => Boolean(backend());

// Issiq (warm) funksiya chaqiruvlari orasida ulanish qayta ishlatiladi
let tcpClient = null;

async function getTcpClient(url) {
  if (tcpClient?.isReady) return tcpClient;
  const client = createClient({
    url,
    socket: { connectTimeout: TIMEOUT, reconnectStrategy: false },
  });
  client.on('error', () => {
    /* xato buyruq natijasida qaytariladi; bu yerda jarayon yiqilmasligi uchun */
  });
  await client.connect();
  tcpClient = client;
  return client;
}

function describe(err) {
  const code = err?.cause?.code || err?.code;
  const msg = err?.message || String(err);
  if (/WRONGPASS|NOAUTH|invalid password|invalid username/i.test(msg)) return "parol noto'g'ri";
  if (code === 'ENOTFOUND' || /ENOTFOUND/.test(msg)) return 'server topilmadi (manzilni tekshiring)';
  if (/timeout/i.test(msg)) return 'ulanish vaqti tugadi';
  return code ? `${code}: ${msg}` : msg;
}

async function redis(...command) {
  const be = backend();
  if (!be) throw new Error('store_not_configured');
  try {
    if (be.type === 'tcp') {
      const client = await getTcpClient(be.url);
      return await client.sendCommand(command.map(String));
    }
    const res = await fetch(be.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${be.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
    return json.result;
  } catch (err) {
    if (be.type === 'tcp') {
      tcpClient?.destroy?.();
      tcpClient = null;
    }
    throw new Error(describe(err));
  }
}

const key = () => `taklifnoma:${weddingSlug()}:rsvp`;

/** Javobni saqlaydi. Bir mehmon (id) qayta yuborsa — eski javobi yangilanadi. */
export async function saveEntry(entry) {
  const exists = Number(await redis('HEXISTS', key(), entry.id));
  if (!exists && Number(await redis('HLEN', key())) >= MAX_ENTRIES) throw new Error('store_full');
  await redis('HSET', key(), entry.id, JSON.stringify(entry));
}

export async function listEntries() {
  const raw = (await redis('HGETALL', key())) || [];
  // RESP2 tekis massiv qaytaradi, RESP3 esa obyekt/Map
  const values = Array.isArray(raw)
    ? raw.filter((_, i) => i % 2 === 1)
    : raw instanceof Map
      ? [...raw.values()]
      : Object.values(raw);
  const out = [];
  for (const v of values) {
    try {
      out.push(JSON.parse(String(v)));
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
