import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig } from '../src/lib/config.js';
import { findTemplate } from '../src/lib/templates.js';

const demo = JSON.parse(fs.readFileSync(new URL('../clients/demo-osmon/config.json', import.meta.url), 'utf8'));

test('osmon: shablon ro‘yxatda, demo config to‘g‘ri', () => {
  assert.equal(findTemplate('osmon')?.id, 'osmon');
  assert.deepEqual(validateConfig(demo), []);
});

test('osmon: sky koordinatalari tekshiriladi', () => {
  assert.deepEqual(validateConfig({ ...demo, sky: { city: 'Buxoro' } }), []);
  assert.ok(validateConfig({ ...demo, sky: { lat: 95, lng: 64 } }).some((e) => e.includes('sky.lat')));
  assert.ok(validateConfig({ ...demo, sky: { lat: 39.7 } }).some((e) => e.includes('birga')));
  assert.ok(validateConfig({ ...demo, sky: { lat: 39.7, lng: 'abc' } }).some((e) => e.includes('sky.lng')));
});
