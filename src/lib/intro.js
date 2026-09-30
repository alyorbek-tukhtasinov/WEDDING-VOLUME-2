// Kirish videosi (osmon va volume2 shablonlari uchun umumiy): config.introVideo — media/ dagi MP4.
// Mehmon kirish tugmasini bosganda video ovozi bilan to'liq ekranda qo'yiladi; tugagach
// (yoki "O'tkazib yuborish") video so'nib, taklifnoma ochiladi. Ko'rinishi — shablonning CSS'ida (.intro).
import { html, raw } from './dom.js';

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Video bloki (yashirin; initIntro().play() ochadi). */
export function introHtml(src, skipLabel) {
  return html`<div class="intro" id="intro" hidden>
    <video class="intro__video" src="${src}" playsinline preload="auto"></video>
    <span class="intro__load" aria-hidden="true"></span>
    <button class="intro__skip" type="button" hidden><span>${skipLabel}</span>${raw(CHEVRON)}</button>
  </div>`.value;
}

/** openSite — video tugagach (yoki o'tkazib yuborilganda) taklifnomani ochadi. */
export function initIntro(openSite) {
  const box = document.querySelector('#intro');
  if (!box) return null;
  const v = box.querySelector('video');
  const skip = box.querySelector('.intro__skip');
  let done = false;
  let started = false;
  let broken = false;
  const finish = () => {
    if (done || !started) return;
    done = true;
    box.classList.add('is-leaving');
    v.pause();
    openSite();
    setTimeout(() => {
      v.removeAttribute('src');
      v.load();
      box.remove();
    }, 1300);
  };
  v.addEventListener('ended', finish);
  // Video bosishdan oldin yuklanmasa — parda o'zi ochilib ketmasin: tugma saytni to'g'ridan-to'g'ri ochadi
  v.addEventListener('error', () => (started ? finish() : (broken = true)));
  v.addEventListener('waiting', () => box.classList.add('is-loading'));
  v.addEventListener('playing', () => box.classList.remove('is-loading'));
  skip.addEventListener('click', finish);
  return {
    get broken() {
      return broken;
    },
    play() {
      started = true;
      box.hidden = false;
      box.classList.add('is-loading');
      requestAnimationFrame(() => box.classList.add('is-in'));
      // Ovoz bilan qo'yib bo'lmasa — ovozsiz, u ham bo'lmasa — to'g'ridan-to'g'ri saytga
      v.play()
        .catch(() => {
          v.muted = true;
          return v.play();
        })
        .catch(finish);
      setTimeout(() => (skip.hidden = false), 1500);
    },
  };
}
