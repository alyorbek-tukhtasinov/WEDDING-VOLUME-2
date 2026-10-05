// Ismlar uchun muqobil shrift (config.nameFont). Standart Great Vibes'da ba'zi bosh harflar
// (masalan "A") kichik harfga o'xshab qoladi, ayrim mijozlarga esa ingichka ko'rinadi — shunda boshqasi tanlanadi.
// Faqat volume2 (src/styles.css): .envelope__names, .envelope__initials (muhr), .hero__names, .footer__names → --f-names
//   q      — Google Fonts so'rovi (kerakli qalinlik/kursiv bilan)
//   scale  — kengroq shriftlar uzun ismlarda ekranga sig'ishi uchun kichraytiriladi
//   stroke — bitta (ingichka) qalinlikdagi shrift chiziq bilan qalinlashtiriladi (em — o'lchamga mos)
//   cyr    — kirill harflari bor (kirillcha ismlar uchun)
export const NAME_FONT_LIST = {
  parisienne: { family: 'Parisienne', q: 'Parisienne', cyr: false },
  'alex-brush': { family: 'Alex Brush', q: 'Alex+Brush', cyr: false },
  'bad-script': { family: 'Bad Script', q: 'Bad+Script', scale: 0.8, stroke: '0.03em', cyr: true },
  lobster: { family: 'Lobster', q: 'Lobster', scale: 0.82, cyr: true },
  playfair: { family: 'Playfair Display', q: 'Playfair+Display:ital,wght@1,700', weight: 700, style: 'italic', scale: 0.8, cyr: true },
  yeseva: { family: 'Yeseva One', q: 'Yeseva+One', scale: 0.7, cyr: true },
};
/** id → shrift nomi (panel va tekshiruv uchun) */
export const NAME_FONTS = Object.fromEntries(Object.entries(NAME_FONT_LIST).map(([id, f]) => [id, f.family]));

const NAME_SELECTORS = '.envelope__names,.envelope__initials,.hero__names,.footer__names';

/** Google Fonts havolasi — bir yoki bir nechta shrift uchun. */
export function nameFontsHref(ids = Object.keys(NAME_FONT_LIST)) {
  const fams = ids.map((id) => NAME_FONT_LIST[id]).filter(Boolean).map((f) => `family=${f.q}`);
  return `https://fonts.googleapis.com/css2?${fams.join('&')}&display=swap`;
}

/** Panelda namuna ko'rsatish uchun inline uslub (id yo'q — standart Great Vibes). */
export function nameFontStyle(id) {
  const f = NAME_FONT_LIST[id];
  if (!f) return "font-family:'Great Vibes',cursive";
  return (
    `font-family:'${f.family}',cursive;font-weight:${f.weight || 400};font-style:${f.style || 'normal'}` +
    (f.stroke ? `;-webkit-text-stroke:${f.stroke} currentColor` : '')
  );
}

/** <head> uchun: shrift havolasi + --f-names. nameFont yo'q bo'lsa — bo'sh (sayt o'zgarmaydi). */
export function nameFontHead(id) {
  const f = NAME_FONT_LIST[id];
  if (!f) return '';
  const rules = [
    f.stroke ? `-webkit-text-stroke:${f.stroke} currentColor` : '',
    f.weight ? `font-weight:${f.weight}` : '',
    f.style ? `font-style:${f.style}` : '',
  ].filter(Boolean);
  return (
    `<link rel="stylesheet" href="${nameFontsHref([id])}" />\n    ` +
    `<style>:root{--f-names:'${f.family}',var(--f-script)${f.scale ? `;--f-names-scale:${f.scale}` : ''}}` +
    (rules.length ? `${NAME_SELECTORS}{${rules.join(';')}}` : '') +
    `</style>`
  );
}
