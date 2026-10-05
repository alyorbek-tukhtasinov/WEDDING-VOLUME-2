import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig } from '../src/lib/config.js';
import { findTemplate } from '../src/lib/templates.js';
import { defaultConfig } from '../src/lib/starter.js';
import { slotsFor } from '../src/lib/photo-slots.js';

test('volume5: shablon ro‘yxatda, demo config to‘g‘ri', () => {
  const demo = JSON.parse(fs.readFileSync(new URL('../clients/demo-volume5/config.json', import.meta.url), 'utf8'));
  assert.equal(findTemplate('volume5')?.id, 'volume5');
  assert.equal(demo.template, 'volume5');
  assert.deepEqual(validateConfig(demo), []);
});

test('volume5: yangi sayt sozlamalari to‘liq ismlar bilan tekshiruvdan o‘tadi', () => {
  const c = defaultConfig('volume5', 'nikoh');
  c.couple = { groom: 'Doniyor', bride: 'Anora', initials: '' };
  c.venue.name = 'To‘yxona';
  c.venue.address = 'Toshkent';
  assert.deepEqual(validateConfig(c), []);
  assert.ok(c.giftNote?.text, 'eslatma matni bor');
});

test('volume5: faqat ruxsat etilgan bo‘lim suratlari', () => {
  const c = defaultConfig('volume5', 'nikoh');
  c.couple = { groom: 'A', bride: 'B', initials: '' };
  c.venue.name = 'X';
  c.venue.address = 'Y';
  c.photos = { hero: 'm-1.jpg' };
  assert.ok(validateConfig(c, ['m-1.jpg']).some((e) => e.includes('photos.hero')));
  assert.deepEqual(slotsFor('volume5').map((s) => s.field).slice(0, 3), ['photos.venue', 'photos.details', 'photos.countdown']);
});

test('volume5: kod va uslublardagi barcha rasm/videolar mavjud', () => {
  const src = fs.readFileSync(new URL('../templates/volume5/styles.css', import.meta.url), 'utf8') + fs.readFileSync(new URL('../templates/volume5/app.js', import.meta.url), 'utf8');
  const urls = new Set([...src.matchAll(/(\/images\/[\w./-]+\.(?:webp|png|jpg|svg|mp4|webm))/g)].map((m) => m[1]));
  // app.js'da IMG = '/images/volume5' va `${IMG}/fayl` ko'rinishida
  for (const m of src.matchAll(/\$\{IMG\}\/([\w.-]+\.(?:webp|png|jpg|svg|mp4|webm))/g)) urls.add(`/images/volume5/${m[1]}`);
  for (const m of src.matchAll(/photo\([^,]+, '([\w.-]+\.webp)'/g)) urls.add(`/images/volume5/${m[1]}`);
  assert.ok(urls.size >= 10, `${urls.size}`);
  for (const u of urls) assert.ok(fs.existsSync(new URL(`../public${u}`, import.meta.url)), u);
});
