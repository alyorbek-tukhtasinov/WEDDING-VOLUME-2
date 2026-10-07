import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig, deriveConfig, ageOf } from '../src/lib/config.js';
import { findTemplate, isBirthday } from '../src/lib/templates.js';
import { cakeSvg } from '../templates/tort/cake.js';
import { tortTexts } from '../templates/tort/texts.js';
import { sevgiTexts } from '../templates/sevgi/texts.js';
import { birthdayConfig, cleanBirthday, birthdayPreview } from '../panel/birthday.js';

const read = (slug) => JSON.parse(fs.readFileSync(new URL(`../clients/${slug}/config.json`, import.meta.url), 'utf8'));
const media = (slug) => fs.readdirSync(new URL(`../clients/${slug}/media`, import.meta.url));

test('tug‘ilgan kun: shablonlar ro‘yxatda, demo config‘lar to‘g‘ri', () => {
  for (const id of ['tort', 'sevgi']) {
    assert.equal(findTemplate(id)?.kind, 'birthday');
    assert.ok(isBirthday({ template: id }));
  }
  assert.ok(!isBirthday({ template: 'suzani' }));
  for (const slug of ['demo-tort', 'demo-sevgi']) assert.deepEqual(validateConfig(read(slug), media(slug)), [], slug);
});

test('tug‘ilgan kun: kelin-kuyov va to‘yxona shart emas, ism shart', () => {
  const c = { template: 'tort', person: { name: 'Madina', birthDate: '2008-10-12' }, event: { date: '2026-10-12' } };
  assert.deepEqual(validateConfig(c), []);
  const d = deriveConfig(c);
  assert.equal(d.name, 'Madina');
  assert.equal(d.age, 18);
  assert.equal(d.party, false);
  assert.match(d.title, /Madina/);
  assert.ok(validateConfig({ ...c, person: { name: '' } }).some((e) => e.includes('person.name')));
  assert.ok(validateConfig({ ...c, person: { name: 'A', birthDate: '2030-01-01' } }).some((e) => e.includes('birthDate')));
  assert.ok(validateConfig({ ...c, voice: 'u' }).some((e) => e.includes('voice')));
  assert.ok(validateConfig({ ...c, gift: { card: '123' } }).some((e) => e.includes('gift.card')));
  assert.ok(validateConfig({ ...c, photos: { nima: 'a.jpg' } }).some((e) => e.includes('photos.nima')));
  // To'y shablonlari avvalgidek: kelin-kuyov ismi shart
  assert.ok(validateConfig({ template: 'suzani', event: { date: '2026-10-12', time: '18:00' } }).some((e) => e.includes('couple')));
});

test('yosh: tug‘ilgan kundan oldin va keyin', () => {
  assert.equal(ageOf({ person: { birthDate: '2005-11-20' }, event: { date: '2026-11-20' } }), 21);
  assert.equal(ageOf({ person: { birthDate: '2005-11-20' }, event: { date: '2026-11-19' } }), 20);
  assert.equal(ageOf({ person: { age: 19 }, event: { date: '2026-01-01' } }), 19);
  assert.equal(ageOf({ person: {}, event: { date: '2026-01-01' } }), null);
});

test('tort: SVG to‘g‘ri (raqamli va oddiy shamlar)', () => {
  for (const age of [7, 18, 25, 100, null]) {
    const { svg, candles } = cakeSvg({ age, seed: 42 });
    assert.ok(!/NaN|undefined/.test(svg), String(age));
    assert.equal(candles, age ? String(age).length : 5);
    assert.equal((svg.match(/class="cake__flame"/g) || []).length, candles);
  }
});

test('matnlar: romantik "sen" standart, config.texts ustun', () => {
  const d = { name: 'Madina', age: 18, party: false };
  assert.match(tortTexts({}, d).heroCaption, /kuning muborak/);
  assert.match(tortTexts({ voice: 'siz' }, d).heroCaption, /kuningiz/);
  assert.equal(tortTexts({ texts: { letter: 'Salom' } }, d).letter, 'Salom');
  assert.match(sevgiTexts({}, d).badge, /18/);
});

test('panel: yangi sayt, ko‘rinish va saqlashdan oldin tozalash', () => {
  const c = birthdayConfig('tort');
  assert.ok(isBirthday(c));
  assert.ok(validateConfig(birthdayPreview(c)).length === 0, validateConfig(birthdayPreview(c)).join('; '));
  c.person.name = '  Dilnoza ';
  c.memories = [{ photo: '', title: ' ', text: '' }, { photo: 'a.jpg', title: 'Ilk', text: '' }];
  c.wishes.push('  ');
  const out = cleanBirthday(structuredClone(c));
  assert.equal(out.person.name, 'Dilnoza');
  assert.deepEqual(out.memories, [{ photo: 'a.jpg', title: 'Ilk' }]);
  assert.ok(out.wishes.every((w) => w.trim()));
  assert.equal(out.gift, undefined);
  assert.equal(out.together, undefined);
  assert.deepEqual(validateConfig(out, ['a.jpg']), []);
});
