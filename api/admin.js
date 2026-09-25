// /admin sahifasi uchun: barcha javoblar (parol bilan himoyalangan).
//   GET  /api/admin                         — ro'yxat va statistika
//   POST /api/admin { action: 'delete', id } — javobni o'chirish
//   POST /api/admin { action: 'settings', date, time }   — to'y sanasi/vaqti (null — asliga qaytarish)
//   POST /api/admin { action: 'settings', music }        — fon musiqasi: to'plamdagi id, 'none' yoki null (asli)
//   POST /api/admin { action: 'resetSettings' }          — barcha o'zgarishlarni bekor qilish
import { send, readBody, checkAdmin, weddingSlug } from './_lib/http.js';
import { storeReady, listEntries, deleteEntry, getSettings, saveSettings, getAdminHash } from './_lib/store.js';
import { isValidDate, TIME_RE } from '../src/lib/config.js';
import { findTrack } from '../src/lib/music.js';

export default async function handler(req, res) {
  const auth = await checkAdmin(req, storeReady() ? getAdminHash : null);
  if (auth === 'no_password') return send(res, 503, { ok: false, error: 'no_password' });
  if (auth !== 'ok') {
    // Parolni taxmin qilishni sekinlashtirish
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { ok: false, error: 'unauthorized' });
  }
  if (!storeReady()) return send(res, 503, { ok: false, error: 'store_not_configured' });

  try {
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (body.action === 'delete' && typeof body.id === 'string') {
        await deleteEntry(body.id);
        return send(res, 200, { ok: true });
      }
      if (body.action === 'settings') {
        // Faqat yuborilgan maydonlar o'zgaradi, qolganlari saqlanib qoladi
        const next = { ...((await getSettings()) || {}) };
        if ('date' in body || 'time' in body) {
          if (body.date == null && body.time == null) {
            delete next.date;
            delete next.time;
          } else if (isValidDate(body.date) && TIME_RE.test(body.time || '')) {
            next.date = body.date;
            next.time = body.time;
          } else {
            return send(res, 422, { ok: false, error: 'validation' });
          }
        }
        if ('music' in body) {
          if (body.music == null || body.music === '') delete next.music;
          else if (body.music === 'none' || findTrack(body.music)) next.music = body.music;
          else return send(res, 422, { ok: false, error: 'validation' });
        }
        delete next.updatedAt;
        const settings = Object.keys(next).length ? { ...next, updatedAt: new Date().toISOString() } : null;
        await saveSettings(settings);
        return send(res, 200, { ok: true, settings });
      }
      if (body.action === 'resetSettings') {
        await saveSettings(null);
        return send(res, 200, { ok: true, settings: null });
      }
      return send(res, 400, { ok: false, error: 'bad_request' });
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST');
      return send(res, 405, { ok: false, error: 'method_not_allowed' });
    }

    const [entries, settings] = await Promise.all([listEntries(), getSettings()]);
    const yes = entries.filter((e) => e.attending === 'yes');
    return send(res, 200, {
      ok: true,
      wedding: weddingSlug(),
      settings,
      stats: {
        total: entries.length,
        attending: yes.length,
        declined: entries.length - yes.length,
        guests: yes.reduce((sum, e) => sum + (e.guests || 1), 0),
      },
      entries,
    });
  } catch (err) {
    console.error('Admin xatosi:', err);
    return send(res, 502, { ok: false, error: 'store_failed' });
  }
}
