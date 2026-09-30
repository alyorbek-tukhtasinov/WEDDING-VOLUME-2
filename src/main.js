import './styles.css';
import config from '@wedding-config';
import brand from '@brand-config';
import { deriveConfig, applyOverrides } from './lib/config.js';
import { LANGS, siteLangs, pickLang, rememberLang, localize, fixScriptGlyphs } from './lib/i18n.js';
import { T, setLang } from './strings.js';
import { renderPage } from './render.js';
import {
  initEnvelope,
  initCountdown,
  initCalendar,
  initMusic,
  initReveal,
  initPetals,
  prepareTyping,
  startTyping,
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

let base = null; // admin o'zgarishlari qo'shilgan asl (lotin) config

/**
 * Sahifani shu tilda chizish. resume — til almashtirilganda: konvert allaqachon ochilgan,
 * musiqa uzilmaydi, sahifa joyida qoladi.
 */
function mount(lang, resume = false) {
  const langs = siteLangs(base);
  const L = langs.includes(lang) ? lang : pickLang(langs);
  setLang(L);
  document.documentElement.lang = LANGS[L].html;
  const c = localize(base, L, T);
  const derived = deriveConfig(c);
  if (langs.length > 1) document.title = `${derived.names} · ${c.texts?.heroCaption || T.heroCaption}`;
  const baseNames = `${base.couple.groom.trim()} & ${base.couple.bride.trim()}`;

  const app = document.getElementById('app');
  const y = window.scrollY;
  const oldAudio = resume ? document.getElementById('music') : null;
  const shown = resume ? { ...c, effects: { ...(c.effects || {}), envelope: false } } : c;
  app.innerHTML = renderPage(shown, derived, brand);
  if (oldAudio) document.getElementById('music')?.replaceWith(oldAudio);
  fixScriptGlyphs(app);
  // Til tugmalari (konvertda va sahifada)
  document.querySelectorAll('[data-lang]').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation(); // konvertni ochib yubormasin
      const l = b.dataset.lang;
      if (l === L) return;
      rememberLang(l);
      mount(l, !document.getElementById('envelope'));
    }),
  );

  const typing = !resume && c.effects?.typing !== false;
  prepareTyping(typing);
  initCountdown(derived);
  initCalendar(c, derived);
  initGallery();
  initRsvp(c, derived, { onSaved: loadWishes, baseNames });
  loadWishes();
  const music = initMusic();

  if (resume) {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
    document.querySelector('.hero')?.classList.add('is-in');
    document.documentElement.classList.remove('is-locked');
    initPetals(c.effects?.petals !== false);
    window.scrollTo(0, y);
    return;
  }
  initReveal();
  initEnvelope({
    onGesture: () => music.prime(),
    onOpen({ gesture }) {
      initPetals(c.effects?.petals !== false);
      // Konvert ochilish animatsiyasi tugagach yozish boshlanadi
      setTimeout(startTyping, gesture ? 1500 : 300);
      if (gesture) {
        music.play();
      } else {
        // Konvert o'chirilgan bo'lsa, musiqa birinchi bosishda boshlanadi (brauzer talabi)
        const startMusic = (e) => {
          if (e.target.closest?.('#music-toggle, [data-lang]')) return;
          music.play();
        };
        document.addEventListener('pointerdown', startMusic, { once: true });
      }
      if (!document.getElementById('envelope')) document.querySelector('.hero')?.classList.add('is-in');
    },
  });
}

async function start() {
  base = applyOverrides(config, await loadOverrides());
  mount(null);
}

start();
