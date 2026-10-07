// "Oltin plastinka" (yigitning tug'ilgan kun bazmi) shablonining jonli ko'rinishi: saytning o'z kodi bilan chiziladi.
import { mountPlastinka } from '../templates/plastinka/app.js';

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
      await mountPlastinka(config, { preview: true });
    } catch {
      document.getElementById('app').innerHTML =
        '<p style="padding:2rem;font-family:serif;text-align:center">Ko‘rinish uchun ism va sanani kiriting.</p>';
    }
  }
  busy = false;
}

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.config) return;
  render(e.data);
});
parent.postMessage({ previewReady: 'plastinka' }, location.origin);
