// O'zbek lotin yozuvidan kirillga o'girish (ismlar, manzillar uchun).
// Rus tilidagi sahifada "Yusuf & Zulayho" → "Юсуф & Зулайҳо" ko'rinishi uchun.
// Aniq bo'lmagan holatlarda (ts, sh ajratilishi va h.k.) panelda qo'lda to'g'rilash mumkin.

const APOS = "'‘’ʻʼ`";
const isApos = (ch) => ch != null && APOS.includes(ch);
const VOWELS = 'aeiouAEIOU';

const SINGLE = {
  a: 'а', b: 'б', c: 'ц', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к',
  l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в',
  w: 'в', x: 'х', y: 'й', z: 'з',
};
const DIGRAPH = { sh: 'ш', ch: 'ч', yo: 'ё', yu: 'ю', ya: 'я', ye: 'е' };

const upper = (s) => s.toUpperCase();
const isUpper = (ch) => ch !== ch.toLowerCase();
const isLetter = (ch) => ch != null && /\p{L}/u.test(ch);

export function latinToCyrillic(input) {
  const s = String(input ?? '');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const lo = ch.toLowerCase();
    const next = s[i + 1];
    const prev = s[i - 1];

    // o' → ў, g' → ғ
    if ((lo === 'o' || lo === 'g') && isApos(next)) {
      const c = lo === 'o' ? 'ў' : 'ғ';
      out += isUpper(ch) ? upper(c) : c;
      i++;
      continue;
    }
    // Ikki harfli tovushlar (sh, ch, yo, yu, ya, ye)
    const pair = next != null ? lo + next.toLowerCase() : '';
    if (DIGRAPH[pair]) {
      const c = DIGRAPH[pair];
      out += isUpper(ch) ? upper(c) : c;
      i++;
      continue;
    }
    // e — so'z boshida yoki unlidan keyin "э", aks holda "е"
    if (lo === 'e') {
      const atStart = !isLetter(prev) && !isApos(prev);
      const c = atStart || VOWELS.includes(prev) ? 'э' : 'е';
      out += isUpper(ch) ? upper(c) : c;
      continue;
    }
    // Tutuq belgisi (ma'no, Mas'uda) → ъ; so'zdan tashqaridagi qo'shtirnoq o'zgarmaydi
    if (isApos(ch)) {
      out += isLetter(prev) && isLetter(next) ? 'ъ' : ch;
      continue;
    }
    if (SINGLE[lo]) {
      out += isUpper(ch) ? upper(SINGLE[lo]) : SINGLE[lo];
      continue;
    }
    out += ch;
  }
  return out;
}
