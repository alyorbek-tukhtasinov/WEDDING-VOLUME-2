// "Volume 2" shablonining jonli ko'rinishi: saytning haqiqiy render/uslub kodi bilan chiziladi.
import '../src/styles.css';
import brand from '@brand-config';
import { deriveConfig } from '../src/lib/config.js';
import { renderPage } from '../src/render.js';
import { initCountdown, initCalendar, initGallery } from '../src/features.js';

// Qayta chizishda eski taymerlar (hisoblagich) to'planib qolmasligi uchun
const timers = new Set();
const origSetInterval = window.setInterval.bind(window);
window.setInterval = (fn, ms, ...args) => {
  const id = origSetInterval(fn, ms, ...args);
  timers.add(id);
  return id;
};

const app = document.getElementById('app');

function render({ config, media, mediaBase }) {
  globalThis.__TAKLIFNOMA_MEDIA__ = (name) => media?.[name] || `${mediaBase || '/media/'}${name}`;
  const c = { ...config, effects: { ...(config.effects || {}), envelope: false, typing: false } };
  const y = window.scrollY;
  timers.forEach((id) => clearInterval(id));
  timers.clear();
  let d;
  try {
    d = deriveConfig(c);
    app.innerHTML = renderPage(c, d, brand);
  } catch (err) {
    app.innerHTML = `<p style="padding:2rem;font-family:serif;text-align:center">Ko‘rinish uchun ismlar, sana va vaqtni kiriting.</p>`;
    return;
  }
  // Animatsiyasiz: hamma bo'limlar darhol ko'rinadi
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
  document.querySelector('.hero')?.classList.add('is-in');
  initCountdown(d);
  initCalendar(c, d);
  initGallery();
  window.scrollTo(0, y);
}

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.config) return;
  render(e.data);
});
parent.postMessage({ previewReady: 'volume2' }, location.origin);
