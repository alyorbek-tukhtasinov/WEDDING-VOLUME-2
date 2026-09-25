// Mijoz papkasini topish, config'ni yuklash va tekshirish (faqat Node uchun).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateConfig, deriveConfig } from '../src/lib/config.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLIENTS_DIR = path.join(ROOT, 'clients');
import { resolveSlug, SLUG_RE } from '../api/_lib/slug.js';
export { SLUG_RE };

export function configFile(dir) {
  for (const name of ['config.json', 'config.js']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function listClients() {
  return fs
    .readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && configFile(path.join(CLIENTS_DIR, d.name)))
    .map((d) => d.name);
}

export async function loadClient(slugInput) {
  const resolved = slugInput != null ? { slug: String(slugInput).trim().toLowerCase(), source: 'WEDDING' } : resolveSlug();
  if (!resolved.slug) {
    throw new Error(
      "\n\n✖ Taklifnoma nomi aniqlanmadi.\n" +
        "  Vercel → Settings → Environment Variables → WEDDING = clients/ dagi mijoz papkasi nomi (masalan: jasur-madina)\n" +
        `  Mavjud mijozlar: ${listClients().join(', ')}\n`,
    );
  }
  const slug = resolved.slug;
  const fail = (msg) => {
    throw new Error(`\n\n✖ Taklifnoma "${slug}": ${msg}\n`);
  };

  if (!SLUG_RE.test(slug)) fail('WEDDING nomi faqat kichik lotin harflari, raqam va "-" dan iborat bo\'lishi kerak');
  if (slug === 'boshqaruv') fail('"boshqaruv" nomi boshqaruv paneli uchun band');
  const dir = path.join(CLIENTS_DIR, slug);
  // Panel config.json yozadi, qo'lda yozilganlari — config.js. Ikkalasi bo'lsa config.json ustun.
  const configPath = configFile(dir);
  if (!configPath) {
    fail(
      `clients/${slug}/config.js (yoki config.json) topilmadi (nom ${resolved.source} dan olindi). ` +
        `Mavjud mijozlar: ${listClients().join(', ') || "(yo'q)"}. ` +
        `Vercel'da WEDDING ga shulardan birini yozing.`,
    );
  }

  const mediaDir = path.join(dir, 'media');
  const mediaFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [];
  let config;
  if (configPath.endsWith('.json')) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      fail(`config.json o'qilmadi: ${err.message}`);
    }
  } else {
    // ?t= — dev rejimida qayta yuklanganda eski nusxa keshdan olinmasligi uchun
    const mod = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
    config = mod.default;
  }

  const errors = validateConfig(config, mediaFiles);
  if (errors.length) fail(`config.js da xatolar bor:\n  - ${errors.join('\n  - ')}`);

  return { slug, slugSource: resolved.source, dir, configPath, mediaDir, mediaFiles, config, derived: deriveConfig(config) };
}

/** Saytning to'liq manzili (og:image uchun absolyut URL kerak). */
export function siteUrl() {
  const raw =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    '';
  return raw.replace(/\/+$/, '');
}

export function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
