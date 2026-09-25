// Admin sahifasidan o'zgartirilgan sana/vaqt — taklifnoma sahifasi ochilganda o'qiladi.
// Baza ulanmagan yoki hech narsa o'zgartirilmagan bo'lsa: settings = null (config'dagi qiymatlar ishlaydi).
import { send } from './_lib/http.js';
import { storeReady, getSettings } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (!storeReady()) return send(res, 200, { ok: true, settings: null });
  try {
    return send(res, 200, { ok: true, settings: await getSettings() });
  } catch (err) {
    console.error('Sozlamalarni o\'qish xatosi:', err);
    return send(res, 200, { ok: true, settings: null });
  }
}
