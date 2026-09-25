import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgram, suggestProgramPreset, shiftProgram, PROGRAM_PRESETS, DRESS_PRESETS } from '../src/lib/presets.js';
import { validateConfig } from '../src/lib/config.js';

const times = (p) => p.map((x) => x.time);

test('Kechki to‘y 19:00 — mavjud mijozlardagi dastur bilan bir xil', () => {
  assert.deepEqual(times(buildProgram('kechki', '19:00')), ['19:00', '19:30', '20:00', '22:30']);
  assert.deepEqual(times(buildProgram('kechki', '18:30')), ['18:30', '19:00', '19:30', '22:00']);
});

test('Kelin tomoni 11:00 — Shoxruxbek dasturi bilan bir xil', () => {
  const p = buildProgram('kelin-uyida', '11:00');
  assert.deepEqual(times(p), ['11:00', '11:30', '13:00', '13:30']);
  assert.equal(p[2].title, 'Kuyov va uning yaqinlarining kirib kelishi');
});

test('Kech boshlangan to‘y yarim tundan o‘tmaydi va tartib buzilmaydi', () => {
  const p = times(buildProgram('kechki', '21:00'));
  assert.equal(p[0], '21:00');
  assert.ok(p[p.length - 1] <= '23:30', p.join());
  for (let i = 1; i < p.length; i++) assert.ok(p[i] > p[i - 1], p.join());
});

test('Vaqtga qarab avtomatik shablon', () => {
  assert.equal(suggestProgramPreset('06:00'), 'nahorgi-osh');
  assert.equal(suggestProgramPreset('12:00'), 'kunduzgi');
  assert.equal(suggestProgramPreset('18:30'), 'kechki');
  assert.equal(suggestProgramPreset('xato'), 'kechki');
});

test('Dasturni yangi vaqtga surish', () => {
  const p = buildProgram('kechki', '19:00');
  assert.deepEqual(times(shiftProgram(p, '19:00', '18:00')), ['18:00', '18:30', '19:00', '21:30']);
});

test('Noma‘lum shablon yoki vaqt — bo‘sh dastur', () => {
  assert.deepEqual(buildProgram('yoq', '19:00'), []);
  assert.deepEqual(buildProgram('kechki', '25:00'), []);
});

test('Barcha shablonlardan tuzilgan dastur config tekshiruvidan o‘tadi', () => {
  const base = {
    couple: { groom: 'A', bride: 'B' },
    event: { date: '2026-10-10', time: '19:00' },
    venue: { name: 'X', address: 'Y' },
    rsvp: { enabled: false },
  };
  for (const pr of PROGRAM_PRESETS) {
    for (const t of ['05:30', '11:00', '16:00', '19:00', '22:00']) {
      const errs = validateConfig({ ...base, program: buildProgram(pr.id, t) });
      assert.deepEqual(errs, [], `${pr.id} ${t}`);
    }
  }
  for (const d of DRESS_PRESETS) {
    assert.deepEqual(validateConfig({ ...base, dressCode: { text: d.text, colors: d.colors } }), [], d.id);
  }
});
