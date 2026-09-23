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

// Nusxalashdagi odatiy xatolarni tozalash: bo'sh joy, qo'shtirnoq, "KALIT=" prefiksi
function envValue(...names) {
  for (const name of names) {
    const raw = process.env[name];
    if (!raw) continue;
    const v = raw
      .replace(/\s+/g, '')
      .replace(/^[A-Z0-9_]+=/, '')
      .replace(/^["'`]+|["'`;,]+$/g, '');
    if (v) return v;
  }
  return '';
}

function backend() {
  const restUrl = envValue('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
  let restToken = envValue('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
  // Token o'rniga butun rediss://default:TOKEN@host:6379 qatori qo'yilgan bo'lsa — tokenni ajratamiz
  if (/^rediss?:\/\//i.test(restToken)) {
    try {
      restToken = decodeURIComponent(new URL(restToken).password) || restToken;
    } catch {
      /* o'zgarishsiz qoldiramiz */
    }
  }
  if (restUrl && restToken) {
    const url = (/^https?:\/\//i.test(restUrl) ? restUrl : `https://${restUrl}`).replace(/\/+$/, '');
    return { type: 'rest', url, token: restToken };
  }

  const redisUrl = envValue('REDIS_URL', 'KV_URL');
  // Upstash faqat TLS qabul qiladi: redis:// bilan nusxalangan bo'lsa rediss:// ga o'tkazamiz
  if (/^redis:\/\/[^/]*\.upstash\.io/i.test(redisUrl)) return { type: 'tcp', url: redisUrl.replace(/^redis:/i, 'rediss:') };
  if (/^rediss?:\/\//.test(redisUrl)) return { type: 'tcp', url: redisUrl };
  return null;
}

export const storeReady = () => Boolean(backend()) && Boolean(weddingSlug());

/** Qaysi serverga ulanilayotgani (parolsiz) — tekshiruv sahifasi uchun. */
export function storeHost() {
  const be = backend();
  if (!be) return null;
  try {
    const u = new URL(be.url);
    const host = `${u.hostname}${u.port ? ':' + u.port : ''}`;
    if (be.type === 'tcp') return `REDIS_URL → ${host}`;
    // Tokenning o'zi emas, faqat uzunligi va oxirgi 4 belgisi — Upstash'dagi bilan solishtirish uchun
    return `REST → ${host} | token: …${be.token.slice(-4)} (${be.token.length} belgi)`;
  } catch {
    return "manzilni o'qib bo'lmadi";
  }
}

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
  if (!weddingSlug()) throw new Error("WEDDING o'rnatilmagan");
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

// Har bir mijoz — alohida kalit: taklifnoma:<WEDDING>:rsvp
const key = () => {
  const slug = weddingSlug();
  if (!slug) throw new Error("WEDDING o'rnatilmagan");
  return `taklifnoma:${slug}:rsvp`;
};

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
