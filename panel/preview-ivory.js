// "Fil suyagi" va "Qirollik" shablonlarining jonli ko'rinishi: saytning o'z kodi bilan chiziladi.
import { mountIvory } from '../templates/ivory/app.js';

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
      await mountIvory(config, { preview: true, theme: config.template === 'royal' ? 'royal' : 'ivory' });
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
parent.postMessage({ previewReady: 'ivory' }, location.origin);
