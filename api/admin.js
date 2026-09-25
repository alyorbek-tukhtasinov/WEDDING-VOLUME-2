// /admin sahifasi uchun: barcha javoblar (parol bilan himoyalangan).
//   GET  /api/admin                         — ro'yxat va statistika
//   POST /api/admin { action: 'delete', id } — javobni o'chirish
//   POST /api/admin { action: 'settings', date: 'YYYY-MM-DD', time: 'HH:MM' } — to'y sanasi/vaqtini o'zgartirish
//   POST /api/admin { action: 'resetSettings' } — config'dagi asl sana/vaqtga qaytarish
import { send, readBody, checkAdmin, weddingSlug } from './_lib/http.js';
import { storeReady, listEntries, deleteEntry, getSettings, saveSettings } from './_lib/store.js';
import { isValidDate, TIME_RE } from '../src/lib/config.js';

export default async function handler(req, res) {
  const auth = checkAdmin(req);
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
        if (!isValidDate(body.date) || !TIME_RE.test(body.time || '')) {
          return send(res, 422, { ok: false, error: 'validation' });
        }
        const settings = { date: body.date, time: body.time, updatedAt: new Date().toISOString() };
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
