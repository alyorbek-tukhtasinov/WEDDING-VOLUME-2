import './styles.css';
import config from '@wedding-config';
import brand from '@brand-config';
import { deriveConfig } from './lib/config.js';
import { renderPage } from './render.js';
import {
  initEnvelope,
  initCountdown,
  initCalendar,
  initMusic,
  initReveal,
  initPetals,
  initGallery,
  initRsvp,
} from './features.js';

const derived = deriveConfig(config);
const app = document.getElementById('app');
app.innerHTML = renderPage(config, derived, brand);

initCountdown(derived);
initCalendar(config, derived);
initReveal();
initGallery();
initRsvp(config, derived);

const music = initMusic();
initEnvelope({
  onOpen({ gesture }) {
    initPetals(config.effects?.petals !== false);
    if (gesture) {
      music.play();
    } else {
      // Konvert o'chirilgan bo'lsa, musiqa birinchi bosishda boshlanadi (brauzer talabi)
      const start = (e) => {
        if (e.target.closest?.('#music-toggle')) return;
        music.play();
      };
      document.addEventListener('pointerdown', start, { once: true });
    }
    if (!document.getElementById('envelope')) document.querySelector('.hero')?.classList.add('is-in');
  },
});
