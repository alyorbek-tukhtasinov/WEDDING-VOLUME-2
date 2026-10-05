// Ismlar uchun muqobil yozma shrift (config.nameFont). Standart Great Vibes'da ba'zi bosh harflar
// (masalan "A") kichik harfga o'xshab qoladi — shunday ismlar uchun boshqa shrift tanlanadi.
// Faqat volume2 (src/styles.css): .envelope__names, .envelope__initials (muhr), .hero__names, .footer__names → --f-names
// Parisienne va Alex Brush — faqat lotin; kirillcha ismlar uchun Bad Script
export const NAME_FONTS = {
  parisienne: 'Parisienne',
  'alex-brush': 'Alex Brush',
  'bad-script': 'Bad Script',
};
// Kengroq shriftlar uzun ismlarda ekranga sig'ishi uchun biroz kichraytiriladi
const NAME_SCALE = { 'bad-script': 0.8 };

/** <head> uchun: shrift havolasi + --f-names. nameFont yo'q bo'lsa — bo'sh (sayt o'zgarmaydi). */
export function nameFontHead(id) {
  const family = NAME_FONTS[id];
  if (!family) return '';
  const q = family.replace(/ /g, '+');
  return (
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${q}&display=swap" />\n    ` +
    `<style>:root{--f-names:'${family}',var(--f-script)${NAME_SCALE[id] ? `;--f-names-scale:${NAME_SCALE[id]}` : ''}}</style>`
  );
}
