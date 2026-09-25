import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../src/lib/config.js';

const base = {
  template: 'yz',
  couple: { groom: 'Yusuf', bride: 'Zulayho' },
  event: { date: '2026-12-12', time: '16:00' },
  venue: { name: 'Tarona', address: 'Manzil' },
  rsvp: { enabled: true },
};

test('To‘g‘ri yz config — xatosiz', () => {
  const c = {
    ...base,
    venue: { ...base.venue, mapEmbed: 'https://yandex.uz/map-widget/v1/?ll=70.76%2C40.36&z=19' },
    giftCard: { number: '5614 0000 0000 0000', holder: 'Yusuf', bank: 'Uzcard' },
    photos: { hero: 'hero.jpg' },
    texts: { uz: { invTitle: 'Aziz mehmon!' }, ru: {} },
    ru: { groom: 'Юсуф' },
  };
  assert.deepEqual(validateConfig(c, ['hero.jpg']), []);
  const g = { ...base, venue: { ...base.venue, mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18' } };
  assert.deepEqual(validateConfig(g), []);
});

test('Xatolar aniqlanadi', () => {
  const errs = validateConfig({
    ...base,
    venue: { ...base.venue, mapEmbed: 'https://evil.example/map-widget/x' },
    giftCard: { number: '1234' },
    photos: { hero: 'yoq.jpg', fon: 'a.jpg' },
    texts: { uz: { invTitle: 5 } },
  }, []);
  assert.ok(errs.some((e) => e.includes('mapEmbed')), errs.join('\n'));
  assert.ok(errs.some((e) => e.includes('giftCard.number')));
  assert.ok(errs.some((e) => e.includes('photos.hero') && e.includes('topilmadi')));
  assert.ok(errs.some((e) => e.includes('photos.fon')));
  assert.ok(errs.some((e) => e.includes('texts.uz.invTitle')));
});

test('javascript: yoki http xarita rad etiladi', () => {
  for (const u of ['javascript:alert(1)', 'http://yandex.uz/map-widget/v1/', 'https://yandex.uz.evil.com/map-widget/']) {
    assert.ok(validateConfig({ ...base, venue: { ...base.venue, mapEmbed: u } }).some((e) => e.includes('mapEmbed')), u);
  }
});
