import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig, deriveConfig, ageOf } from '../src/lib/config.js';
import { findTemplate, isBirthday } from '../src/lib/templates.js';
import { cakeSvg } from '../templates/tort/cake.js';
import { tortTexts } from '../templates/tort/texts.js';
import { sevgiTexts } from '../templates/sevgi/texts.js';
import { yulduzTexts } from '../templates/yulduz/texts.js';
import { burjOf, muchalOf, birthMoon, birthFacts, bigKm } from '../templates/yulduz/facts.js';
import { birthdayConfig, cleanBirthday, birthdayPreview } from '../panel/birthday.js';

const read = (slug) => JSON.parse(fs.readFileSync(new URL(`../clients/${slug}/config.json`, import.meta.url), 'utf8'));
const media = (slug) => fs.readdirSync(new URL(`../clients/${slug}/media`, import.meta.url));

test('tug‘ilgan kun: shablonlar ro‘yxatda, demo config‘lar to‘g‘ri', () => {
  for (const id of ['tort', 'sevgi', 'yulduz']) {
    assert.equal(findTemplate(id)?.kind, 'birthday');
    assert.ok(isBirthday({ template: id }));
  }
  assert.ok(!isBirthday({ template: 'suzani' }));
  for (const slug of ['demo-tort', 'demo-sevgi', 'demo-yulduz']) assert.deepEqual(validateConfig(read(slug), media(slug)), [], slug);
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
  for (const t of ['sevgi', 'yulduz']) assert.deepEqual(validateConfig(birthdayPreview(birthdayConfig(t))), [], t);
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

test('yulduz: tug‘ilgan kechaning haqiqiy faktlari', () => {
  // Burjlar chegaralari
  assert.equal(burjOf(1, 5).name, 'Jaddiy');
  assert.equal(burjOf(1, 20).name, 'Dalv');
  assert.equal(burjOf(3, 21).name, 'Hamal');
  assert.equal(burjOf(10, 12).name, 'Mezon');
  assert.equal(burjOf(12, 21).name, 'Qavs');
  assert.equal(burjOf(12, 25).name, 'Jaddiy');
  // Muchal: 2008 — Sichqon; Navro'zgacha — oldingi yil (To'ng'iz)
  assert.equal(muchalOf(2008, 10, 12).name, 'Sichqon');
  assert.equal(muchalOf(2008, 3, 1).name, 'To‘ng‘iz');
  assert.equal(muchalOf(2026, 6, 1).name, 'Ot');
  // Oy: 2008-yil 14-oktabr — to'lin oy, 12-oktabr kechasi ~94%, o'sib bormoqda
  const m = birthMoon('2008-10-12');
  assert.ok(m.percent > 88 && m.percent < 99, String(m.percent));
  assert.equal(m.waxing, true);
  // 2024-yil 1-aprel atrofida — kamayib borayotgan (oxirgi chorak 2-aprel)
  assert.equal(birthMoon('2024-04-01').waxing, false);
  const f = birthFacts({ person: { birthDate: '2008-10-12' }, event: {} });
  assert.equal(f.weekday, 'Yakshanba');
  assert.ok(f.days > 6500);
  assert.match(bigKm(f.km), /milliard/);
  assert.equal(birthFacts({ person: {}, event: {} }), null);
  const T = yulduzTexts({}, { name: 'Madina', age: 18 }, f);
  assert.equal(T.gateAsk, 'Sen — Madinamisan?');
  assert.match(T.intro, /kun oldin/);
  assert.match(T.moonText, /%/);
});
