import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig } from '../src/lib/config.js';
import { findTemplate } from '../src/lib/templates.js';
import { sceneCouple, sceneCalendar, sceneMusic, sceneVenue, sceneDress, sceneLetter, sceneCake } from '../templates/kitob/art.js';

const demo = JSON.parse(fs.readFileSync(new URL('../clients/demo-kitob/config.json', import.meta.url), 'utf8'));

test('kitob: shablon ro‘yxatda, demo config to‘g‘ri', () => {
  assert.equal(findTemplate('kitob')?.id, 'kitob');
  assert.deepEqual(validateConfig(demo), []);
});

test('kitob: pop-up manzaralar 3 qatlamli va buzuq qiymatsiz', () => {
  const scenes = [sceneCouple(), sceneCalendar(12, 'DEKABR'), sceneMusic(), sceneVenue(), sceneDress(['#8e2c43', '#2f3a5c']), sceneDress(), sceneLetter(), sceneCake()];
  for (const layers of scenes) {
    assert.equal(layers.length, 3);
    for (const svg of layers) {
      assert.match(svg, /^<svg viewBox="0 0 300 180"/);
      assert.ok(!/NaN|undefined/.test(svg), svg.slice(0, 120));
    }
  }
});
