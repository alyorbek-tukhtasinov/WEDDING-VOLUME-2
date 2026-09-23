// Mijoz papkasini topish, config'ni yuklash va tekshirish (faqat Node uchun).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateConfig, deriveConfig } from '../src/lib/config.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLIENTS_DIR = path.join(ROOT, 'clients');
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function listClients() {
  return fs
    .readdirSync(CLIENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(CLIENTS_DIR, d.name, 'config.js')))
    .map((d) => d.name);
}

export async function loadClient(slugInput) {
  const slug = (slugInput || 'demo').trim();
  const fail = (msg) => {
    throw new Error(`\n\n✖ Taklifnoma "${slug}": ${msg}\n`);
  };

  if (!SLUG_RE.test(slug)) fail('WEDDING nomi faqat kichik lotin harflari, raqam va "-" dan iborat bo\'lishi kerak');
  const dir = path.join(CLIENTS_DIR, slug);
  const configPath = path.join(dir, 'config.js');
  if (!fs.existsSync(configPath)) {
    fail(`clients/${slug}/config.js topilmadi. Mavjud mijozlar: ${listClients().join(', ') || '(yo\'q)'}`);
  }

  const mediaDir = path.join(dir, 'media');
  const mediaFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [];
  // ?t= — dev rejimida qayta yuklanganda eski nusxa keshdan olinmasligi uchun
  const mod = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
  const config = mod.default;

  const errors = validateConfig(config, mediaFiles);
  if (errors.length) fail(`config.js da xatolar bor:\n  - ${errors.join('\n  - ')}`);

  return { slug, dir, configPath, mediaDir, mediaFiles, config, derived: deriveConfig(config) };
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
