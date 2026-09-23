// Yangi mijoz papkasini demo asosida yaratadi.
// Foydalanish: npm run new -- jasur-madina
import fs from 'node:fs';
import path from 'node:path';
import { CLIENTS_DIR, SLUG_RE } from './client.js';

const slug = (process.argv[2] || '').trim().toLowerCase();

if (!slug || !SLUG_RE.test(slug)) {
  console.error('Foydalanish: npm run new -- <nom>   (masalan: npm run new -- jasur-madina)');
  console.error('Nom faqat kichik lotin harflari, raqam va "-" dan iborat bo\'lishi kerak.');
  process.exit(1);
}

const target = path.join(CLIENTS_DIR, slug);
if (fs.existsSync(target)) {
  console.error(`clients/${slug} allaqachon mavjud.`);
  process.exit(1);
}

fs.mkdirSync(path.join(target, 'media'), { recursive: true });
fs.copyFileSync(path.join(CLIENTS_DIR, 'demo', 'config.js'), path.join(target, 'config.js'));
// Demo media (masalan, standart musiqa) ham nusxalanadi — keyin o'zingiznikiga almashtiring
fs.cpSync(path.join(CLIENTS_DIR, 'demo', 'media'), path.join(target, 'media'), { recursive: true });

console.log(`✔ clients/${slug} yaratildi.

Keyingi qadamlar:
  1. clients/${slug}/config.js ni tahrirlang (ismlar, sana, manzil...)
  2. Rasm va musiqani clients/${slug}/media/ ga qo'ying
  3. Tekshiring:   npm run check -- ${slug}
  4. Ko'ring:      WEDDING=${slug} npm run dev
  5. Vercel'da yangi loyiha oching va WEDDING=${slug} o'zgaruvchisini qo'shing (README ga qarang)`);
