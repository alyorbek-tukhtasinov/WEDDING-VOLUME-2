// "Bulutlar ustida" shablonining jonli ko'rinishi: saytning o'z kodi bilan chiziladi.
import { mountBulut } from '../templates/bulut/app.js';

let pending = null;
let busy = false;

async function render(data) {
  pending = data;
  if (busy) return;
  busy = true;
  while (pending) {
    const { config, media, mediaBase } = pending;
    pending = null;
    globalThis.__TAKLIFNOMA_MEDIA__ = (name) => media?.[name] || `${mediaBase || '/media/'}${name}`;
    try {
      await mountBulut(config, { preview: true });
    } catch {
      document.getElementById('app').innerHTML =
        '<p style="padding:2rem;font-family:serif;text-align:center">Ko‘rinish uchun ismlar, sana va vaqtni kiriting.</p>';
    }
  }
  busy = false;
}

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.config) return;
  render(e.data);
});
parent.postMessage({ previewReady: 'bulut' }, location.origin);
