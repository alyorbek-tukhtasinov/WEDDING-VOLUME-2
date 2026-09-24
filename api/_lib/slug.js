// Taklifnoma nomini (WEDDING) aniqlash — build (Node) va API funksiyalarida bir xil ishlaydi.
//   1) WEDDING o'zgaruvchisi berilgan bo'lsa — o'sha
//   2) Vercel'da berilmagan bo'lsa — Vercel loyihasi nomidan (VERCEL_BRANCH_URL: "<loyiha>-git-<branch>-...")
//      Loyiha nomlari akkauntda takrorlanmaydi, shuning uchun ma'lumotlar aralashmaydi.
//   3) Kompyuterda — "demo"
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function resolveSlug(env = process.env) {
  const explicit = (env.WEDDING || '').trim().toLowerCase();
  if (explicit) return { slug: explicit, source: 'WEDDING' };
  if (env.VERCEL) {
    const m = /^([a-z0-9][a-z0-9-]*?)-git-/.exec((env.VERCEL_BRANCH_URL || '').toLowerCase());
    return m ? { slug: m[1], source: 'loyiha nomi' } : { slug: null, source: null };
  }
  return { slug: 'demo', source: 'standart' };
}
