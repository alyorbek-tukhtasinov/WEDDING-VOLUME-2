// Telegram: Mini App imzosini tekshirish va Bot API chaqiruvlari (tashqi kutubxonasiz).
import crypto from 'node:crypto';
import fs from 'node:fs';

const env = (k, d = '') => (process.env[k] || d).trim();
export const BOT_TOKEN = () => env('BOT_TOKEN');
// Sinov uchun boshqa manzil berish mumkin (TELEGRAM_API=http://127.0.0.1:…)
const API_BASE = () => env('TELEGRAM_API', 'https://api.telegram.org');

/**
 * Mini App'dan kelgan initData'ni tekshirish (core.telegram.org/bots/webapps#validating-data).
 * To'g'ri bo'lsa — { user, authDate }, aks holda null.
 */
export function verifyInitData(initData, token = BOT_TOKEN(), maxAgeSec = 7 * 86400) {
  if (!initData || !token) return null;
  let params;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }
  const hash = params.get('hash') || '';
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');
  const check = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = crypto.createHmac('sha256', secret).update(check).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null;
  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;
  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return null;
  }
  if (!user?.id) return null;
  return { user, authDate };
}

/** Sinov uchun: initData yasash (faqat testlarda). */
export function signInitData(user, token = BOT_TOKEN(), authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: 'test', user: JSON.stringify(user) });
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

/** Bot API chaqiruvi. Xato bo'lsa — Error (description bilan). */
export async function tg(method, body = {}, { timeoutMs = 70e3 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE()}/bot${BOT_TOKEN()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) {
      const err = new Error(json.description || `Telegram ${method}: HTTP ${res.status}`);
      err.code = json.error_code;
      err.retryAfter = json.parameters?.retry_after;
      throw err;
    }
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

/** Fayl yuborish (sendVideo, sendDocument …): multipart. fields — oddiy maydonlar, file — { field, path, name }. */
export async function tgUpload(method, fields, file, { timeoutMs = 300e3 } = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  form.append(file.field, new Blob([fs.readFileSync(file.path)]), file.name || 'file');
  const res = await fetch(`${API_BASE()}/bot${BOT_TOKEN()}/${method}`, { method: 'POST', body: form, signal: AbortSignal.timeout(timeoutMs) });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(json.description || `Telegram ${method}: HTTP ${res.status}`);
  return json.result;
}

export const VIDEO_PRICE = () => Number(env('VIDEO_PRICE', '15000').replace(/\D/g, '')) || 15000;

/** Sayt domeni: SITE_DOMAIN yoki /etc/taklifnoma/deploy.conf dan. */
export function siteDomain() {
  if (env('SITE_DOMAIN')) return env('SITE_DOMAIN').toLowerCase();
  try {
    const m = /^SITE_DOMAIN=(.+)$/m.exec(fs.readFileSync('/etc/taklifnoma/deploy.conf', 'utf8'));
    return m ? m[1].trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

export const siteUrlOf = (slug) => (siteDomain() ? `https://${slug}.${siteDomain()}` : `/${slug}`);
export const appUrl = () => env('BOT_APP_URL') || (siteDomain() ? `https://boshqaruv.${siteDomain()}/app` : '');

/** Admin(lar) Telegram ID'lari: ADMIN_TG_IDS=123,456 */
export const adminIds = () =>
  env('ADMIN_TG_IDS')
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter((x) => /^-?\d+$/.test(x));
export const isAdmin = (id) => adminIds().includes(String(id));

export const PRICE = () => Number(env('PRICE', '70000').replace(/\D/g, '')) || 70000;
export const fmtSum = (n) => `${String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`;

/** Qoralama (to'lanmagan) taklifnomani ko'rish havolasi — imzo bilan, boshqalar sayt nomini taxmin qilib ocholmaydi */
export const draftKey = (slug) => crypto.createHmac('sha256', BOT_TOKEN() || 'x').update(`draft:${slug}`).digest('hex').slice(0, 20);
export const previewUrl = (slug) => (siteDomain() ? `https://boshqaruv.${siteDomain()}/korinish.html?s=${encodeURIComponent(slug)}&k=${draftKey(slug)}` : '');
