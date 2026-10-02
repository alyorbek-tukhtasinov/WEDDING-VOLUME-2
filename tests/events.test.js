import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EVENTS, findEvent, eventTexts, isNikoh, phrases, applyEvent } from '../src/lib/events.js';
import { PROGRAM_PRESETS, buildProgram, suggestProgramPreset, findDressPreset } from '../src/lib/presets.js';
import { validateConfig, deriveConfig } from '../src/lib/config.js';
import { findTemplate } from '../src/lib/templates.js';

test('marosim turlari: matnlar, dastur va dress-kod to‘liq', () => {
  for (const e of EVENTS) {
    for (const lang of ['uz', 'ru']) {
      const t = eventTexts(e.id, 'Aziz', 'Malika', lang);
      for (const k of ['heroCaption', 'greeting', 'invitation', 'closing']) assert.ok(t[k]?.length > 5, `${e.id}.${lang}.${k}`);
      assert.ok(t.invitation.includes('Malika'), `${e.id}.${lang}: kelin ismi matnda`);
      for (const k of ['badge', 'until', 'untilLong', 'came', 'programTitle', 'programLead', 'thanksAt']) assert.ok(e[lang][k], `${e.id}.${lang}.${k}`);
      assert.match(e[lang].calTitle('A & B'), /A & B/);
    }
    assert.ok(PROGRAM_PRESETS.some((p) => p.id === e.program), `${e.id}: dastur shabloni`);
    assert.ok(findDressPreset(e.dress), `${e.id}: dress-kod`);
    assert.ok(buildProgram(e.program, e.time).length >= 3);
  }
});

test('nikoh to‘yi (va eski saytlar) — shablon matnlari o‘zgarmaydi', () => {
  assert.equal(isNikoh({}), true);
  assert.equal(isNikoh({ eventType: 'nikoh-kunduzgi' }), true);
  assert.equal(phrases({})('until', 'To‘yimizgacha'), 'To‘yimizgacha');
  const T = { countdownTitle: 'X' };
  assert.equal(applyEvent(T, {}, 'uz', { countdownTitle: (p) => p.untilLong }), T);
  assert.equal(phrases({ eventType: 'kelin-salom' })('until', 'To‘yimizgacha'), 'Marosimgacha');
  assert.equal(applyEvent(T, { eventType: 'fotiha' }, 'uz', { countdownTitle: (p) => p.untilLong }).countdownTitle, 'Fotiha to‘yigacha qolgan vaqt');
});

test('dastur shabloni marosim turiga qarab', () => {
  assert.equal(suggestProgramPreset('16:00', 'kelin-salom'), 'kelin-salom');
  assert.equal(suggestProgramPreset('06:00', 'fotiha'), 'fotiha');
  assert.equal(suggestProgramPreset('12:00', 'nikoh'), 'kunduzgi');
  assert.equal(suggestProgramPreset('18:00'), 'kechki');
});

test('config: eventType tekshiruvi va tavsif', () => {
  const c = JSON.parse(fs.readFileSync(new URL('../clients/demo-volume4/config.json', import.meta.url), 'utf8'));
  assert.equal(findTemplate('volume4')?.id, 'volume4');
  assert.deepEqual(validateConfig(c), []);
  assert.deepEqual(validateConfig({ ...c, eventType: 'nahorgi-osh' }), []);
  assert.equal(validateConfig({ ...c, eventType: 'xato' }).length, 1);
  assert.match(deriveConfig({ ...c, eventType: 'nahorgi-osh' }).description, /^Nahorgi oshga taklifnoma/);
  assert.match(deriveConfig(c).description, /to‘y taklifnomasi/);
  assert.equal(findEvent('yo‘q').id, 'nikoh');
});
