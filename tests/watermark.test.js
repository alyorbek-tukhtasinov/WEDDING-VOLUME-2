import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../src/lib/config.js';
import { watermarkHtml, WATERMARK_ID, WATERMARK_NOTE } from '../src/lib/watermark.js';

const base = {
  couple: { groom: 'Aziz', bride: 'Malika' },
  event: { date: '2026-11-20', time: '18:00' },
  venue: { name: 'To‘yxona', address: 'Manzil' },
};

test('“NAMUNA” belgisi: watermark faqat true/false', () => {
  assert.deepEqual(validateConfig({ ...base, watermark: true }), []);
  assert.deepEqual(validateConfig({ ...base, watermark: false }), []);
  assert.ok(validateConfig({ ...base, watermark: 'ha' }).some((e) => e.startsWith('watermark')));
});

test('“NAMUNA” belgisi: HTML izoh bilan, bosishlarga xalaqit bermaydi', () => {
  const h = watermarkHtml();
  assert.ok(h.startsWith(`<div id="${WATERMARK_ID}"`));
  assert.ok(h.includes('NAMUNA'));
  assert.ok(h.includes(WATERMARK_NOTE));
  assert.match(WATERMARK_NOTE, /to‘lov amalga oshirilgach avtomatik olib tashlanadi/);
  assert.match(h, /pointer-events:none/);
});
