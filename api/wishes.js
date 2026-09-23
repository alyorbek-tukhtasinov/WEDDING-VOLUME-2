// Ochiq "Tilaklar" devori: faqat ism va tilak (telefon raqamlari ko'rsatilmaydi).
import { send } from './_lib/http.js';
import { storeReady, listEntries } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (!storeReady()) return send(res, 200, { ok: true, enabled: false, wishes: [] });

  try {
    const wishes = (await listEntries())
      .filter((e) => e.message)
      .slice(0, 100)
      .map((e) => ({ name: e.name, message: e.message, attending: e.attending, at: e.updatedAt }));
    return send(res, 200, { ok: true, enabled: true, wishes });
  } catch (err) {
    console.error('Tilaklarni o\'qish xatosi:', err);
    return send(res, 502, { ok: false, error: 'store_failed' });
  }
}
