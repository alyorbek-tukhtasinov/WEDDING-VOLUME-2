import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig } from '../src/lib/config.js';
import { findTemplate } from '../src/lib/templates.js';

for (const id of ['ivory', 'royal']) {
  test(`${id}: shablon ro‘yxatda, demo config to‘g‘ri`, () => {
    const demo = JSON.parse(fs.readFileSync(new URL(`../clients/demo-${id}/config.json`, import.meta.url), 'utf8'));
    assert.equal(findTemplate(id)?.id, id);
    assert.equal(demo.template, id);
    assert.deepEqual(validateConfig(demo), []);
    assert.ok(fs.existsSync(new URL(`../templates/${id}/index.html`, import.meta.url)));
    assert.ok(fs.existsSync(new URL(`../public/images/og-${id}.jpg`, import.meta.url)));
  });
}
