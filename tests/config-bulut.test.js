import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig } from '../src/lib/config.js';
import { findTemplate } from '../src/lib/templates.js';
import { balloonSvg, BALLOON_SETS, parachuteSvg, barcodeSvg } from '../templates/bulut/art.js';

const demo = JSON.parse(fs.readFileSync(new URL('../clients/demo-bulut/config.json', import.meta.url), 'utf8'));

test('bulut: shablon ro‘yxatda, demo config to‘g‘ri', () => {
  assert.equal(findTemplate('bulut')?.id, 'bulut');
  assert.deepEqual(validateConfig(demo), []);
});

test('bulut: rasmlar buzuq qiymatsiz, shtrix-kod barqaror', () => {
  const svgs = [...BALLOON_SETS.map(([a, b], i) => balloonSvg(a, b, `t${i}`)), parachuteSvg(), barcodeSvg('Sardor & Malika')];
  for (const s of svgs) {
    assert.match(s, /^<svg /);
    assert.ok(!/NaN|undefined/.test(s), s.slice(0, 120));
  }
  assert.equal(barcodeSvg('A & B'), barcodeSvg('A & B'));
  assert.notEqual(barcodeSvg('A & B'), barcodeSvg('C & D'));
});
