// Vercel "Ignored Build Step": shu loyihaga tegishli o'zgarish bo'lmasa, build qilinmaydi.
// Masalan, faqat clients/sanjar-dilnoza/ o'zgargan bo'lsa, boshqa mijozlar loyihalari qayta yig'ilmaydi.
// Vercel qoidasi: exit 0 — o'tkazib yuborish, exit 1 — build qilish.
// Biror narsa aniq bo'lmasa (nom topilmadi, git tarixi yo'q) — har doim build qilinadi.
import { execFileSync } from 'node:child_process';
import { resolveSlug } from '../api/_lib/slug.js';

const BUILD = 1;
const SKIP = 0;

function decide() {
  const { slug } = resolveSlug();
  const prev = process.env.VERCEL_GIT_PREVIOUS_SHA;
  if (!slug || !prev) return BUILD;

  let files;
  try {
    files = execFileSync('git', ['diff', '--name-only', prev, 'HEAD'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return BUILD; // oldingi commit shallow clone'da yo'q
  }
  if (!files.length) return BUILD;

  // Boshqa mijozlarning papkalari, hujjatlar (.md) va faqat o'z serverimizga oid fayllar
  // (deploy/, server/, build-all) Vercel'dagi bu loyihaga ta'sir qilmaydi
  const serverOnly = (f) => f.startsWith('deploy/') || f.startsWith('server/') || f === 'scripts/build-all.js';
  const unrelated = (f) =>
    (f.startsWith('clients/') && !f.startsWith(`clients/${slug}/`)) || f.endsWith('.md') || serverOnly(f);
  const relevant = files.filter((f) => !unrelated(f));
  console.log(
    relevant.length
      ? `"${slug}" uchun o'zgarishlar bor (${relevant.length} ta fayl) — build qilinadi.`
      : `"${slug}" ga tegishli o'zgarish yo'q — build o'tkazib yuboriladi.`,
  );
  return relevant.length ? BUILD : SKIP;
}

process.exit(decide());
