// Instagram Direct uchun AI yordamchi (rasmiy "Instagram API with Instagram Login" + Claude).
//
// Oqim: mijoz Instagram'da yozadi → Meta webhook'i shu yerga keladi (boshqaruv.<domen>/api/panel/instagram)
// → Claude javob yozadi → sahifa nomidan yuboriladi. Buyurtma ma'lumotlari yig'ilsa yoki savolga
// egasi javob berishi kerak bo'lsa — egasiga Telegram'da xabar (notify_owner).
// Egasi suhbatga o'zi yozsa (Instagram ilovasidan) — bot o'sha mijoz bilan IG_PAUSE_HOURS soat jim turadi.
//
// Muhit o'zgaruvchilari (/etc/taklifnoma/env):
//   ANTHROPIC_API_KEY  — Claude API kaliti
//   IG_APP_SECRET      — Meta ilovasining "Instagram app secret" (webhook imzosini tekshirish)
//   IG_VERIFY_TOKEN    — webhook'ni ulashda o'zingiz o'ylab topgan so'z (Meta'ga ham shuni yozasiz)
//   IG_ACCESS_TOKEN    — Instagram akkaunt tokeni (60 kunlik; server o'zi yangilab turadi)
//   IG_MODEL           — (ixtiyoriy) Claude modeli, standart claude-opus-5-5
//   IG_PAUSE_HOURS     — (ixtiyoriy) egasi yozgandan keyin bot necha soat jim turadi, standart 12
//   IG_ENABLED         — (ixtiyoriy) "0" bo'lsa bot faqat tinglaydi, javob yozmaydi
//   BOT_TOKEN, ADMIN_TG_IDS — mavjud Telegram bot: egasiga xabarlar shu orqali keladi
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { DATA_DIR, ROOT } from './data.js';
import { tg, adminIds, PRICE, VIDEO_PRICE, fmtSum, siteDomain } from './telegram.js';
import { TEMPLATES, isBirthday } from '../src/lib/templates.js';

const env = (k, d = '') => (process.env[k] || d).trim();
// IG_GRAPH_URL — faqat sinov uchun (soxta server)
const GRAPH_BASE = () => env('IG_GRAPH_URL', 'https://graph.instagram.com');
const GRAPH = () => `${GRAPH_BASE()}/v23.0`;
const MODEL = () => env('IG_MODEL', 'claude-opus-5-5');
const PAUSE_MS = () => (Number(env('IG_PAUSE_HOURS', '12')) || 12) * 3600e3;
const HISTORY_MAX = 30; // har suhbatda saqlanadigan oxirgi xabarlar
const DEBOUNCE_MS = 6000; // mijoz ketma-ket bir nechta xabar yozsa — hammasiga bitta javob
const IG_TEXT_MAX = 990; // Instagram bitta xabar chegarasi ~1000 belgi

/* ------------------------------ Holat (diskda) ------------------------------ */
// Suhbatlar tarixi va to'xtatilgan suhbatlar: <DATA_DIR>/instagram.json (Redis kerak emas)
const stateFile = () => path.join(DATA_DIR(), 'instagram.json');
let state = null;
function load() {
  if (state) return state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    state = {};
  }
  state.threads ||= {};
  return state;
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR(), { recursive: true });
      const tmp = `${stateFile()}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(state));
      fs.renameSync(tmp, stateFile());
    } catch (err) {
      console.error('Instagram: holatni saqlab bo‘lmadi:', err.message);
    }
  }, 500);
}
const thread = (id) => {
  const s = load();
  s.threads[id] ||= { history: [], pausedUntil: 0 };
  return s.threads[id];
};
function remember(t, role, text) {
  t.history.push({ role, text, at: Date.now() });
  if (t.history.length > HISTORY_MAX) t.history.splice(0, t.history.length - HISTORY_MAX);
  t.updatedAt = Date.now();
  save();
}

// Takroriy webhook'lar (Meta qayta yuboradi) va botning o'z xabarlari "aks-sadosi"
const seen = new Map(); // mid → vaqt
const botSent = new Map(); // mid yoki "matn" → vaqt
const fresh = (map, key, ttl = 3600e3) => {
  const now = Date.now();
  for (const [k, t] of map) if (now - t > ttl) map.delete(k);
  return map.has(key);
};

/* ------------------------------ Webhook ------------------------------ */
async function readRaw(req, max = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > max) throw new Error('too_large');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

function validSignature(raw, header) {
  const secret = env('IG_APP_SECRET');
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest();
  const got = Buffer.from(header.slice(7), 'hex');
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

export async function instagramHandler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  // 1) Meta webhook'ni ulaganda tekshiradi: hub.verify_token bizniki bilan bir xil bo'lsa — challenge qaytariladi
  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && env('IG_VERIFY_TOKEN') && url.searchParams.get('hub.verify_token') === env('IG_VERIFY_TOKEN');
    res.statusCode = ok ? 200 : 403;
    res.setHeader('Content-Type', 'text/plain');
    return res.end(ok ? url.searchParams.get('hub.challenge') || '' : 'forbidden');
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end();
  }
  // 2) Xabarlar: imzo tekshiriladi, Meta'ga darhol 200 qaytariladi, ishlov keyin
  const raw = await readRaw(req);
  if (!validSignature(raw, req.headers['x-hub-signature-256'])) {
    res.statusCode = 401;
    return res.end();
  }
  res.statusCode = 200;
  res.end('ok');
  let body;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    return;
  }
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      try {
        onEvent(ev, entry.id);
      } catch (err) {
        console.error('Instagram: hodisa xatosi:', err);
      }
    }
  }
}

function onEvent(ev, accountId) {
  const msg = ev.message;
  if (!msg || msg.is_deleted || msg.is_unsupported) return;
  if (msg.mid && fresh(seen, msg.mid)) return;
  if (msg.mid) seen.set(msg.mid, Date.now());
  const text = (msg.text || '').trim();

  // Sahifa nomidan ketgan xabar (aks-sado): botniki bo'lsa — e'tiborsiz; egasi qo'lda yozgan bo'lsa — bot jim turadi
  if (msg.is_echo) {
    const customer = ev.recipient?.id;
    if (!customer) return;
    if (fresh(botSent, msg.mid, 600e3) || fresh(botSent, `t:${customer}:${text}`, 600e3)) return;
    const t = thread(customer);
    t.pausedUntil = Date.now() + PAUSE_MS();
    if (text) remember(t, 'assistant', text);
    else save();
    return;
  }

  const customer = ev.sender?.id;
  if (!customer || customer === accountId) return;
  const t = thread(customer);
  const attachments = (msg.attachments || []).map((a) => a.type).filter(Boolean);
  const content = [text, attachments.length ? `[mijoz ${attachments.join(', ')} yubordi — buni ko‘ra olmaysiz]` : ''].filter(Boolean).join('\n');
  if (!content) return;
  remember(t, 'user', content);
  if (Date.now() < t.pausedUntil || env('IG_ENABLED', '1') === '0') return;
  schedule(customer);
}

// Mijoz bir necha xabarni ketma-ket yozsa — oxirgisidan keyin bir oz kutib, bitta javob
const timers = new Map();
const busy = new Set();
function schedule(customer) {
  clearTimeout(timers.get(customer));
  timers.set(
    customer,
    setTimeout(() => {
      timers.delete(customer);
      reply(customer).catch((err) => console.error('Instagram: javob xatosi:', err));
    }, DEBOUNCE_MS),
  );
}

/* ------------------------------ Claude ------------------------------ */
let client = null;
const claude = () => (client ||= new Anthropic());

const TOOLS = [
  {
    name: 'notify_owner',
    description:
      'Biznes egasiga Telegram orqali xabar yuborish. Quyidagi hollarda chaqiring: (1) buyurtma uchun ma’lumotlar to‘liq yig‘ilganda; ' +
      '(2) mijoz egasi bilan gaplashmoqchi bo‘lsa yoki siz bilmaydigan savol (chegirma, to‘lov, muddat, maxsus talab) bo‘lsa; ' +
      '(3) mijoz norozi bo‘lsa. Bir suhbatda bir xil sabab bilan qayta-qayta chaqirmang.',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['order', 'question', 'complaint'], description: 'order — buyurtma tayyor; question — egasi javob berishi kerak; complaint — norozilik' },
        summary: { type: 'string', description: 'Egasi uchun qisqa xulosa (o‘zbekcha): ismlar, sana/soat, to‘yxona, tadbir turi, shablon, til, qo‘shimchalar yoki savolning mohiyati' },
      },
      required: ['kind', 'summary'],
      additionalProperties: false,
    },
    strict: true,
  },
];

function knowledge() {
  let md = '';
  try {
    md = fs.readFileSync(path.join(ROOT, 'server', 'instagram-knowledge.md'), 'utf8');
  } catch {
    /* fayl yo'q — faqat umumiy ko'rsatma */
  }
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  const domain = siteDomain();
  const sitesDir = path.resolve(process.env.SITES_DIR || path.join(ROOT, 'sites'));
  let built = [];
  try {
    built = fs.readdirSync(sitesDir);
  } catch {
    /* yig'ilgan saytlar yo'q */
  }
  // Har shablonning demo sayti: demo-<shablon> (volume2 uchun — "demo")
  const demos = TEMPLATES.map((t) => {
    const slug = t.id === 'volume2' ? 'demo' : `demo-${t.id}`;
    if (!built.includes(slug) || !domain) return null;
    return `- ${t.title}${isBirthday(t.id) ? ' (tug‘ilgan kun)' : ''}: ${t.description} — https://${slug}.${domain}`;
  }).filter(Boolean);
  return md
    .replace('{{PRICE}}', fmtSum(PRICE()))
    .replace('{{VIDEO_PRICE}}', fmtSum(VIDEO_PRICE()))
    .replace('{{DEMOS}}', demos.join('\n') || '- (demo havolalar hozircha yo‘q — shablon nomlarini ayting)')
    .replace('{{TELEGRAM_BOT}}', botUsername ? `- Mijoz xohlasa, taklifnomani o‘zi Telegram bot orqali ham yaratishi mumkin: https://t.me/${botUsername}` : '')
    .trim();
}

let botUsername = '';
let systemPrompt = '';
async function system() {
  if (systemPrompt) return systemPrompt;
  if (env('BOT_TOKEN')) {
    try {
      botUsername = (await tg('getMe', {}, { timeoutMs: 8e3 })).username || '';
    } catch {
      /* bot ishlamasa — havolasiz */
    }
  }
  systemPrompt = `Siz onlayn to‘y taklifnomalari biznesining Instagram sahifasida mijozlar bilan yozishadigan yordamchisiz. Sahifa nomidan, "biz" deb yozasiz.

Uslub:
- Mijoz qaysi tilda va yozuvda yozsa (o‘zbek lotin, o‘zbek kirill, rus), shunda javob bering.
- Instagram'dagidek qisqa, iliq va samimiy yozing: odatda 1–4 gap. Ro‘yxat yoki markdown (**, #) ishlatmang.
- Har bir xabarda faqat 1 ta savol bering, mijozni so‘roqqa tutmang.

Qoidalar:
- Faqat quyidagi ma’lumotga tayaning. Unda yo‘q narsani (narx, muddat, chegirma, imkoniyat) o‘ylab topmang —
  "Bu haqida aniq javobni hozir o‘zim yozaman" deb ayting va notify_owner chaqiring.
- Maqsad: mijozga mos shablonni topishga yordam berish va buyurtma uchun kerakli ma’lumotlarni bosqichma-bosqich yig‘ish.
  Hammasi yig‘ilgach, ma’lumotlarni mijozga qisqa takrorlab tasdiqlating, keyin notify_owner (kind: order) chaqiring
  va mijozga tez orada bog‘lanishimizni ayting.
- To‘lov rekvizitlarini (karta raqami) o‘zingiz bermang — buni egasi yuboradi.
- Siz AI ekaningizni yashirmang: to‘g‘ridan-to‘g‘ri so‘rashsa, "men sahifaning yordamchisiman, kerak bo‘lsa egasi o‘zi yozadi" deng.

${knowledge()}`;
  return systemPrompt;
}

/** Saqlangan tarix → Claude xabarlari (birinchisi user bo'lishi shart). */
function toMessages(history) {
  const msgs = history.map((h) => ({ role: h.role, content: h.text }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

async function reply(customer) {
  if (busy.has(customer)) return schedule(customer); // oldingi javob hali yozilmoqda
  const t = thread(customer);
  if (Date.now() < t.pausedUntil) return;
  const messages = toMessages(t.history);
  if (!messages.length || messages.at(-1).role !== 'user') return;
  busy.add(customer);
  try {
    const sys = await system();
    const today = new Date().toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', year: 'numeric' });
    // Bugungi sana — tarix oxirida operator xabari sifatida (tizim prompti keshda o'zgarmasdan qoladi)
    messages.push({ role: 'system', content: `Bugungi sana (Toshkent): ${today}.` });
    let text = '';
    for (let step = 0; step < 4; step++) {
      // Xavfsizlik filtri rad etsa — server o'zi mos zaxira modelda qayta urinadi (Haiku'da bu imkoniyat yo'q)
      const fallback = /opus-5|fable-5|sonnet-5-5/.test(MODEL()) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {};
      const res = await claude().beta.messages.create({
        model: MODEL(),
        max_tokens: 8000,
        ...fallback,
        output_config: { effort: 'low' }, // oddiy suhbat — tez va arzon
        system: [{ type: 'text', text: sys, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages,
      });
      if (res.stop_reason === 'refusal') break;
      text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      const calls = res.content.filter((b) => b.type === 'tool_use');
      if (res.stop_reason !== 'tool_use' || !calls.length) break;
      messages.push({ role: 'assistant', content: res.content });
      const results = [];
      for (const call of calls) results.push({ type: 'tool_result', tool_use_id: call.id, content: await notifyOwner(customer, call.input) });
      messages.push({ role: 'user', content: results });
    }
    // Javob yozilayotganda egasi o'zi yozib qo'ygan bo'lsa — yubormaymiz
    if (!text || Date.now() < thread(customer).pausedUntil) return;
    await sendText(customer, text);
    remember(t, 'assistant', text);
  } finally {
    busy.delete(customer);
  }
}

async function notifyOwner(customer, input) {
  const kind = { order: '🆕 Buyurtma', question: '❓ Savol', complaint: '⚠️ Norozilik' }[input?.kind] || '📩 Xabar';
  const lastUser = [...thread(customer).history].reverse().find((h) => h.role === 'user')?.text || '';
  const msg = `${kind} — Instagram\n\n${String(input?.summary || '').slice(0, 3000)}\n\nMijozning oxirgi xabari: “${lastUser.slice(0, 500)}”\n\nJavob berish: Instagram → Direct. Siz yozsangiz, bot bu mijoz bilan ${Math.round(PAUSE_MS() / 3600e3)} soat jim turadi.`;
  const ids = adminIds();
  if (!env('BOT_TOKEN') || !ids.length) return 'Egasiga xabar yuborib bo‘lmadi (Telegram sozlanmagan). Mijozga egasi tez orada yozishini ayting.';
  let sent = 0;
  for (const id of ids) {
    try {
      await tg('sendMessage', { chat_id: id, text: msg, disable_web_page_preview: true }, { timeoutMs: 10e3 });
      sent++;
    } catch (err) {
      console.error('Instagram: Telegram xabari ketmadi:', err.message);
    }
  }
  return sent ? 'Egasiga xabar yuborildi.' : 'Egasiga xabar yuborib bo‘lmadi. Mijozga egasi tez orada yozishini ayting.';
}

/* ------------------------------ Instagram yuborish ------------------------------ */
// Token: avval yangilangani (diskda), bo'lmasa /etc/taklifnoma/env dagisi
const token = () => load().token || env('IG_ACCESS_TOKEN');

function chunks(text) {
  const out = [];
  let rest = text;
  while (rest.length > IG_TEXT_MAX) {
    let cut = rest.lastIndexOf('\n', IG_TEXT_MAX);
    if (cut < IG_TEXT_MAX / 2) cut = rest.lastIndexOf(' ', IG_TEXT_MAX);
    if (cut < IG_TEXT_MAX / 2) cut = IG_TEXT_MAX;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

async function sendText(customer, text) {
  for (const part of chunks(text)) {
    botSent.set(`t:${customer}:${part}`, Date.now());
    const res = await fetch(`${GRAPH()}/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: customer }, message: { text: part } }),
      signal: AbortSignal.timeout(15e3),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Instagram yuborish: HTTP ${res.status} ${JSON.stringify(json.error || json).slice(0, 300)}`);
    if (json.message_id) botSent.set(json.message_id, Date.now());
  }
}

// Uzoq muddatli token 60 kun amal qiladi — har kuni tekshirib, 7 kundan ko'p o'tgan bo'lsa yangilanadi
async function refreshToken() {
  const s = load();
  if (!token() || (s.tokenRefreshedAt && Date.now() - s.tokenRefreshedAt < 7 * 86400e3)) return;
  try {
    const res = await fetch(`${GRAPH_BASE()}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token())}`, { signal: AbortSignal.timeout(15e3) });
    const json = await res.json().catch(() => ({}));
    if (!json.access_token) throw new Error(JSON.stringify(json.error || json).slice(0, 200));
    s.token = json.access_token;
    s.tokenRefreshedAt = Date.now();
    save();
    console.log('Instagram: token yangilandi');
  } catch (err) {
    console.error('Instagram: tokenni yangilab bo‘lmadi:', err.message);
  }
}

export function startInstagram() {
  if (!env('IG_ACCESS_TOKEN')) return;
  if (!env('ANTHROPIC_API_KEY')) console.log('  ! Instagram: ANTHROPIC_API_KEY berilmagan — bot javob yoza olmaydi');
  if (!env('IG_APP_SECRET')) console.log('  ! Instagram: IG_APP_SECRET berilmagan — webhook xabarlari rad etiladi');
  refreshToken();
  setInterval(refreshToken, 86400e3).unref();
  console.log(`Instagram AI yordamchi: yoqilgan (${MODEL()})`);
}
