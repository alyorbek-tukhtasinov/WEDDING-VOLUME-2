import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function ensureScrollTrigger() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

/**
 * Resolves the actual scroll container element rather than relying on
 * ScrollTrigger's string-selector scroller default, which resolves lazily
 * and unreliably against the id lookup in this app's phone-frame layout.
 */
export function getScroller(): HTMLElement | Window {
  return document.getElementById('wedding-scroll') || window;
}

export { gsap, ScrollTrigger };
