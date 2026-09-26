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
  // .env faylidagi qiymatlar (WEDDING, REDIS_URL, ADMIN_PASSWORD) — mavjud muhit o'zgaruvchilari ustun turadi
  for (const [k, v] of Object.entries(loadEnv(mode, root, ''))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  // Qaysi mijoz yig'iladi: WEDDING muhit o'zgaruvchisi (Vercel -> Settings -> Environment Variables)
  let client;
  try {
    client = await loadClient();
  } catch (err) {
    // stdout ga ham yozamiz — Vercel logida albatta ko'rinsin
    console.log(err.message);
    throw err;
  }

  // Shablon: volume2 — ildizdagi index.html (vanilla JS), boshqalari — templates/<id>/index.html
  const template = client.config.template || 'volume2';
  const mainHtml = template === 'volume2' ? path.join(root, 'index.html') : path.join(root, 'templates', template, 'index.html');

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
      rollupOptions: {
        // motion (React) kutubxonasidagi "use client" izohlari — brauzer uchun ahamiyatsiz
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          warn(warning);
        },
        input: {
          main: mainHtml,
          admin: path.join(root, 'admin.html'),
        },
      },
    },
    plugins: [weddingPlugin(client, template)],
  };
});

function weddingPlugin(client, template) {
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
      // yz shablonida alohida rasm tanlanmagan bo'lsa — bosh sahifadagi surat
      const ogImage = config.seo?.ogImage
        ? `/media/${config.seo.ogImage}`
        : template === 'yz'
          ? config.photos?.hero ? `/media/${config.photos.hero}` : '/images/yz/wedding1.jpg'
          : template === 'osmon'
            ? '/images/og-osmon.jpg'
            : '/images/og-default.jpg';
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

    // Dev rejimida /media/* va /api/* ni xizmat qilish
    configureServer(server) {
      if (template !== 'volume2') {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html') req.url = `/templates/${template}/index.html`;
          next();
        });
      }
      server.middlewares.use('/media', (req, res, next) => {
        const file = path.join(mediaDir, decodeURIComponent(req.url.split('?')[0]));
        if (!file.startsWith(mediaDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return next();
        }
        const type = MIME[path.extname(file).toLowerCase()];
        if (type) res.setHeader('Content-Type', type);
        fs.createReadStream(file).pipe(res);
      });
      // /api/<nom> -> api/<nom>.js (Vercel'dagidek)
      server.middlewares.use('/api', async (req, res, next) => {
        const name = req.url.split('?')[0].replace(/^\/+|\/+$/g, '');
        if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(path.join(root, 'api', `${name}.js`))) return next();
        try {
          const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`);
          await handler(req, res);
        } catch (err) {
          console.error(err);
          res.statusCode = 500;
          res.end('{"ok":false,"error":"server_error"}');
        }
      });
    },

    // Build oxirida mijozning media/ papkasini dist/media ga ko'chirish
    closeBundle() {
      // templates/<id>/index.html saytning bosh sahifasi (index.html) bo'lishi kerak
      const nested = path.join(outDir, 'templates', template, 'index.html');
      if (fs.existsSync(nested)) {
        fs.renameSync(nested, path.join(outDir, 'index.html'));
        fs.rmSync(path.join(outDir, 'templates'), { recursive: true, force: true });
      }
      if (fs.existsSync(mediaDir)) {
        fs.cpSync(mediaDir, path.join(outDir, 'media'), {
          recursive: true,
          filter: (src) => !path.basename(src).startsWith('.'),
        });
      }
      console.log(`\n✔ "${client.slug}" taklifnomasi yig'ildi (nom: ${client.slugSource}): ${derived.names}, ${derived.dateText}\n`);
    },
  };
}
