const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

class Raw {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

/** Escapesiz qo'yiladigan HTML (faqat ishonchli qiymatlar uchun). */
export const raw = (value) => new Raw(value);

const toHtml = (v) => {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(toHtml).join('');
  return esc(v);
};

/** Xavfsiz HTML shablon: barcha qiymatlar avtomatik escape qilinadi. */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += toHtml(v) + strings[i + 1];
  });
  return raw(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
