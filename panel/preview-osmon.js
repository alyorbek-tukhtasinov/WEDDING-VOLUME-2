// "To'y kechasining osmoni" shablonining jonli ko'rinishi: saytning o'z kodi bilan chiziladi.
// Sana, joy va ismlar o'zgarmasa osmon qayta hisoblanmaydi — faqat matnlar yangilanadi.
import { mountOsmon } from '../templates/osmon/app.js';

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
      await mountOsmon(config, { preview: true });
    } catch {
      document.getElementById('app').innerHTML =
        '<p style="padding:2rem;font-family:serif;text-align:center;color:#eee">Ko‘rinish uchun ismlar, sana va vaqtni kiriting.</p>';
    }
  }
  busy = false;
}

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.config) return;
  render(e.data);
});
parent.postMessage({ previewReady: 'osmon' }, location.origin);
