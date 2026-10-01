import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig } from '../src/lib/config.js';
import { findTemplate } from '../src/lib/templates.js';

test('volume3: shablon ro‘yxatda, demo config to‘g‘ri', () => {
  const demo = JSON.parse(fs.readFileSync(new URL('../clients/demo-volume3/config.json', import.meta.url), 'utf8'));
  assert.equal(findTemplate('volume3')?.id, 'volume3');
  assert.equal(demo.template, 'volume3');
  assert.deepEqual(validateConfig(demo), []);
});

test('volume3: uslublardagi barcha rasmlar mavjud', () => {
  const css = fs.readFileSync(new URL('../templates/volume3/styles.css', import.meta.url), 'utf8') + fs.readFileSync(new URL('../templates/volume3/extra.css', import.meta.url), 'utf8');
  const urls = [...css.matchAll(/url\((\/images\/[^)]+)\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 5);
  for (const u of urls) assert.ok(fs.existsSync(new URL(`../public${u}`, import.meta.url)), u);
});
