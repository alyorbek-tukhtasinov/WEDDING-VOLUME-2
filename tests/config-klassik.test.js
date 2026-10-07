import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateConfig, deriveConfig, ageOf } from '../src/lib/config.js';
import { findTemplate, isBirthday } from '../src/lib/templates.js';
import { klassikTexts, ruProgramTitle, PARTY_PROGRAM } from '../templates/klassik/texts.js';
import { birthdayConfig, cleanBirthday, birthdayPreview, isParty } from '../panel/birthday.js';

const demo = () => JSON.parse(fs.readFileSync(new URL('../clients/demo-klassik/config.json', import.meta.url), 'utf8'));

test('klassik: tug‘ilgan kun (bazm) shabloni, demo config to‘g‘ri', () => {
  const c = demo();
  assert.equal(findTemplate('klassik')?.kind, 'birthday');
  assert.ok(findTemplate('klassik')?.party);
  assert.ok(isBirthday(c) && isParty(c));
  assert.deepEqual(validateConfig(c), []);
  const d = deriveConfig(c);
  assert.equal(d.name, 'Jasur');
  assert.equal(ageOf(c), 30);
  assert.ok(d.party && d.rsvpOpen && d.rsvpClosesAt);
});

test('klassik: yangi sayt (panel) — ism va manzil bilan tekshiruvdan o‘tadi, saqlashda manzil qoladi', () => {
  const c = birthdayConfig('klassik');
  c.person.name = 'Sardor';
  c.person.birthDate = '2000-01-05';
  c.venue.name = 'Lounge';
  c.contacts = [{ name: '', phone: '' }];
  const saved = cleanBirthday(structuredClone(c));
  assert.equal(saved.venue.name, 'Lounge');
  assert.equal(saved.contacts.length, 0);
  assert.ok(saved.rsvp.deadline);
  assert.equal(saved.program.length, PARTY_PROGRAM.length);
  assert.deepEqual(validateConfig(saved), []);
  // Jonli ko'rinish: bo'sh manzil bo'lsa ham bazm rejimi
  const p = birthdayPreview({ ...c, venue: { name: '' } });
  assert.ok(deriveConfig(p).party);
});

test('klassik: faqat muqova va manzil suratlari', () => {
  const c = demo();
  c.photos = { cover: 'm-1.jpg', letter: 'm-2.jpg' };
  const errs = validateConfig(c, ['m-1.jpg', 'm-2.jpg']);
  assert.ok(errs.some((e) => e.includes('photos.letter')));
  assert.ok(!errs.some((e) => e.includes('photos.cover')));
});

test('klassik: matnlar — yosh, ruscha dastur tarjimasi, egasining matni ustun', () => {
  const uz = klassikTexts({ texts: {} }, { name: 'Jasur', age: 30, year: 2026 });
  assert.match(uz.invitation, /30 yoshga/);
  const own = klassikTexts({ texts: { invitation: 'Keling!' } }, { name: 'J', age: null, year: 2026 });
  assert.equal(own.invitation, 'Keling!');
  const ru = klassikTexts({ texts: {} }, { name: 'Жасур', age: 30, year: 2026 }, 'ru');
  assert.match(ru.invitation, /исполняется 30/);
  assert.equal(ruProgramTitle('Tort va shamlar'), 'Торт и свечи');
});

test('klassik: shriftlar va kod fayllari joyida', () => {
  const css = fs.readFileSync(new URL('../templates/klassik/fonts/fonts.css', import.meta.url), 'utf8');
  for (const m of css.matchAll(/url\(\.\/([\w.-]+)\)/g)) assert.ok(fs.existsSync(new URL(`../templates/klassik/fonts/${m[1]}`, import.meta.url)), m[1]);
  assert.ok(fs.existsSync(new URL('../public/images/og-klassik.jpg', import.meta.url)), 'og-klassik.jpg');
});
