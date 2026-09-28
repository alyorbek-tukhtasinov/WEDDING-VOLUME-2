import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig } from '../src/lib/config.js';
import { findTemplate } from '../src/lib/templates.js';
import { medallion, rosette, pomegranate, tulip, heart, rings, wishFlower } from '../templates/suzani/motifs.js';

const demo = JSON.parse(fs.readFileSync(new URL('../clients/demo-suzani/config.json', import.meta.url), 'utf8'));

test('suzani: shablon ro‘yxatda, demo config to‘g‘ri', () => {
  assert.equal(findTemplate('suzani')?.id, 'suzani');
  assert.deepEqual(validateConfig(demo), []);
});

test('suzani: naqshlar to‘g‘ri tuzilgan (bo‘sh yoki NaN yo‘q)', () => {
  for (const m of [medallion(), rosette(), pomegranate(), tulip('red'), heart('red'), rings(), wishFlower(12345)]) {
    assert.match(m.viewBox, /^-?\d+ -?\d+ \d+ \d+$/);
    assert.ok(m.parts.length > 0);
    for (const p of m.parts) {
      assert.ok(p.d && !/NaN|undefined/.test(p.d), p.d);
      assert.ok(p.color);
    }
  }
  // Bir xil ism — bir xil gul (tilak gullari barqaror)
  assert.deepEqual(wishFlower(42), wishFlower(42));
});
