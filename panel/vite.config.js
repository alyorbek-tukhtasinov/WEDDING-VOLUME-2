// Boshqaruv panelini yig'ish (boshqaruv.<domen>): node_modules/.bin/vite build --config panel/vite.config.js
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  root,
  publicDir: path.join(root, 'public'),
  resolve: {
    alias: {
      '@wedding-config': path.join(root, 'panel', 'preview-config.js'),
      '@brand-config': path.join(root, 'brand.config.js'),
    },
  },
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      input: {
        panel: path.join(root, 'panel', 'index.html'),
        'preview-v2': path.join(root, 'panel', 'preview-v2.html'),
        'preview-yz': path.join(root, 'panel', 'preview-yz.html'),
      },
    },
  },
  plugins: [
    (() => {
      let out = path.join(root, 'dist');
      return {
      name: 'panel-html-to-root',
      configResolved(resolved) {
        out = path.resolve(resolved.root, resolved.build.outDir);
      },
      // panel/*.html → natijaning ildiziga (index.html, preview-v2.html, preview-yz.html)
      closeBundle() {
        const dir = path.join(out, 'panel');
        if (!fs.existsSync(dir)) return;
        for (const f of fs.readdirSync(dir)) fs.renameSync(path.join(dir, f), path.join(out, f));
        fs.rmSync(dir, { recursive: true, force: true });
      },
      };
    })(),
  ],
});
