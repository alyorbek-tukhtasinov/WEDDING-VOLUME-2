import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClient, htmlEscape, siteUrl } from './scripts/client.js';

const root = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
};

export default defineConfig(async ({ mode }) => {
  // .env faylidagi qiymatlar (WEDDING, TELEGRAM_*) — mavjud muhit o'zgaruvchilari ustun turadi
  for (const [k, v] of Object.entries(loadEnv(mode, root, ''))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  // Qaysi mijoz yig'iladi: WEDDING muhit o'zgaruvchisi (Vercel -> Settings -> Environment Variables)
  const client = await loadClient(process.env.WEDDING);

  return {
    resolve: {
      alias: {
        '@wedding-config': client.configPath,
        '@brand-config': path.join(root, 'brand.config.js'),
      },
    },
    build: {
      target: 'es2019',
      assetsInlineLimit: 0,
    },
    plugins: [weddingPlugin(client)],
  };
});

function weddingPlugin(client) {
  let outDir = 'dist';
  const { config, derived, mediaDir } = client;

  return {
    name: 'wedding-client',

    configResolved(resolved) {
      outDir = path.resolve(resolved.root, resolved.build.outDir);
    },

    // Meta teglar HTML ichiga statik yoziladi — Telegram/Instagram JS ishlatmaydi.
    transformIndexHtml(html) {
      const base = siteUrl();
      const abs = (p) => (base ? base + p : p);
      const ogImage = config.seo?.ogImage ? `/media/${config.seo.ogImage}` : '/images/og-default.jpg';
      const themeVars = Object.entries(config.theme || {})
        .map(([k, v]) => `--${k}:${v};`)
        .join('');

      const values = {
        TITLE: derived.title,
        DESCRIPTION: derived.description,
        OG_IMAGE: abs(ogImage),
        OG_URL: base ? base + '/' : '',
        THEME_STYLE: themeVars ? `<style>:root{${themeVars}}</style>` : '',
      };
      return html
        .replace(/%%(\w+)%%/g, (m, key) => {
          if (!(key in values)) return m;
          return key === 'THEME_STYLE' ? values[key] : htmlEscape(values[key]);
        })
        .replace(/\s*<meta property="og:url" content="">/, '');
    },

    // Dev rejimida /media/* va /api/rsvp ni xizmat qilish
    configureServer(server) {
      server.middlewares.use('/media', (req, res, next) => {
        const file = path.join(mediaDir, decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(mediaDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return next();
        }
        const type = MIME[path.extname(file).toLowerCase()];
        if (type) res.setHeader('Content-Type', type);
        fs.createReadStream(file).pipe(res);
      });
      server.middlewares.use('/api/rsvp', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/rsvp.js');
        handler(req, res);
      });
    },

    // Build oxirida mijozning media/ papkasini dist/media ga ko'chirish
    closeBundle() {
      if (fs.existsSync(mediaDir)) {
        fs.cpSync(mediaDir, path.join(outDir, 'media'), {
          recursive: true,
          filter: (src) => !path.basename(src).startsWith('.'),
        });
      }
      console.log(`\n✔ "${client.slug}" taklifnomasi yig'ildi: ${derived.names}, ${derived.dateText}\n`);
    },
  };
}
