import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { initWedding } from './wedding';

// Admin sahifasida o'zgartirilgan sana/vaqt/musiqa (bo'lsa). Server javob bermasa, ko'pi bilan 2.5 soniya kutiladi.
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
  initWedding(await loadOverrides());
  // App ma'lumot tayyor bo'lgandan keyin yuklanadi — komponentlar to'g'ri sana/musiqani oladi
  const { default: App } = await import('./App');
  createRoot(document.getElementById('root')!).render(<App />);
}

start();
