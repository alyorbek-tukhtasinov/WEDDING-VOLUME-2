// Jonli ko'rinishda "NAMUNA" belgisi (config.watermark) — barcha shablonlar uchun umumiy.
import { setWatermark } from '../src/lib/watermark.js';

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data?.config) return;
  setWatermark(e.data.config.watermark === true);
});
