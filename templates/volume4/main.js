// "Volume 4" — Volume 3 shablonining pushti ko'rinishi (gulli fon, pushti ranglar). Kod umumiy: ../volume3/app.js
import config from '@wedding-config';
import { applyOverrides } from '../../src/lib/config.js';
import { mountVolume3 } from '../volume3/app.js';

async function loadOverrides() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('/api/settings', { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    return (await res.json())?.settings || null;
  } catch {
    return null;
  }
}

loadOverrides().then((s) => mountVolume3(applyOverrides(config, s)));
