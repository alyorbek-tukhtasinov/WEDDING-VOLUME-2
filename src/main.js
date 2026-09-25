import './styles.css';
import config from '@wedding-config';
import brand from '@brand-config';
import { deriveConfig, applyOverrides } from './lib/config.js';
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
  loadWishes,
} from './features.js';

// Admin sahifasidan o'zgartirilgan sana/vaqt (bo'lsa). Server javob bermasa, ko'pi bilan 2.5 soniya kutiladi.
async function loadOverrides() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('/api/settings', { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json();
    return json?.settings || null;
  } catch {
    return null;
  }
}

async function start() {
  const c = applyOverrides(config, await loadOverrides());
  const derived = deriveConfig(c);
  const app = document.getElementById('app');
  app.innerHTML = renderPage(c, derived, brand);

  initCountdown(derived);
  initCalendar(c, derived);
  initReveal();
  initGallery();
  initRsvp(c, derived, { onSaved: loadWishes });
  loadWishes();

  const music = initMusic();
  initEnvelope({
    onOpen({ gesture }) {
      initPetals(c.effects?.petals !== false);
      if (gesture) {
        music.play();
      } else {
        // Konvert o'chirilgan bo'lsa, musiqa birinchi bosishda boshlanadi (brauzer talabi)
        const startMusic = (e) => {
          if (e.target.closest?.('#music-toggle')) return;
          music.play();
        };
        document.addEventListener('pointerdown', startMusic, { once: true });
      }
      if (!document.getElementById('envelope')) document.querySelector('.hero')?.classList.add('is-in');
    },
  });
}

start();
