// "Yusuf & Zulayho" shablonining jonli ko'rinishi: shablonning haqiqiy React kodi bilan.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../templates/yz/styles.css';
import { setConfig } from '../templates/yz/wedding';
import App from '../templates/yz/App';

const root = createRoot(document.getElementById('root')!);
let version = 0;

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.config) return;
  const { config, media, mediaBase } = e.data;
  (globalThis as any).__TAKLIFNOMA_MEDIA__ = (name: string) => media?.[name] || `${mediaBase || '/media/'}${name}`;
  const scroller = document.getElementById('wedding-scroll');
  const top = scroller?.scrollTop || 0;
  try {
    setConfig(config);
  } catch {
    return;
  }
  version += 1;
  root.render(<App key={version} preview />);
  // Qayta chizilgandan keyin foydalanuvchi turgan bo'lim saqlanadi
  requestAnimationFrame(() => {
    const el = document.getElementById('wedding-scroll');
    if (el) {
      el.style.scrollBehavior = 'auto';
      el.scrollTop = top;
      el.style.scrollBehavior = '';
    }
  });
});
parent.postMessage({ previewReady: 'yz' }, location.origin);
