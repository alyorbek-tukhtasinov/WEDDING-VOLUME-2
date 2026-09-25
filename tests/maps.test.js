import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMapInput } from '../src/lib/maps.js';

test('Google embed iframe (Sanjar & Dilnoza) — markaz koordinatasi va joy nomi', () => {
  const r = parseMapInput(
    '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d17358.4874978689!2d65.1949072006879!3d40.146117172582656!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f5aa15a6fea9429%3A0x264505e518b21be3!2sToshrabot%20M.F.Y!5e1!3m2!1sen!2s!4v1790350915311!5m2!1sen!2s" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>',
  );
  assert.equal(r.ok, true);
  assert.equal(r.lat, 40.146117);
  assert.equal(r.lng, 65.194907);
  assert.equal(r.placeName, 'Toshrabot M.F.Y');
  assert.match(r.googleMaps, /query=40\.146117%2C65\.194907/);
  assert.match(r.yandexMaps, /pt=65\.194907,40\.146117/);
  assert.match(r.embedUrl, /^https:\/\/www\.google\.com\/maps\/embed\?pb=/);
});

test('Yandex vidjet (Yusuf-Zulayho) — ll=lng,lat tartibi', () => {
  const r = parseMapInput('https://yandex.uz/map-widget/v1/?l=sat&ll=70.766612%2C40.368446&mode=search&oid=239106477257&ol=biz&z=19');
  assert.equal(r.ok, true);
  assert.equal(r.lat, 40.368446);
  assert.equal(r.lng, 70.766612);
  assert.match(r.embedUrl, /map-widget/);
});

test('Yandex tashkilot sahifasi (Salimboy) — koordinatasiz, lekin havola saqlanadi', () => {
  const r = parseMapInput('https://yandex.uz/maps/org/dilshod_ota/35087950302/');
  assert.equal(r.ok, true);
  assert.equal(r.lat, undefined);
  assert.equal(r.yandexMaps, 'https://yandex.uz/maps/org/dilshod_ota/35087950302/');
  assert.equal(r.googleMaps, '');
  assert.ok(r.note);
});

test('Qisqa Google havola — saqlanadi, izoh bilan', () => {
  const r = parseMapInput('https://maps.app.goo.gl/qn6PFwWLDo7gizwb7');
  assert.equal(r.ok, true);
  assert.equal(r.googleMaps, 'https://maps.app.goo.gl/qn6PFwWLDo7gizwb7');
  assert.ok(r.note);
});

test('Google @lat,lng va ?q= havolalari', () => {
  assert.equal(parseMapInput('https://www.google.com/maps/place/X/@41.2995,69.2401,17z').lat, 41.2995);
  const q = parseMapInput('https://maps.google.com/?q=41.3385,69.2850');
  assert.equal(q.lat, 41.3385);
  assert.equal(q.lng, 69.285);
});

test('Google joy havolasi !3d!4d (eng aniq nuqta)', () => {
  const r = parseMapInput('https://www.google.com/maps/place/Toyxona/@40.1,65.1,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d40.0465148!4d64.3266856');
  assert.equal(r.lat, 40.046515);
  assert.equal(r.lng, 64.326686);
});

test('Faqat koordinata, vergulli o‘nlik bilan ham', () => {
  assert.equal(parseMapInput('40.146117, 65.194907').lat, 40.146117);
  assert.equal(parseMapInput('40,146117 65,194907').lng, 65.194907);
});

test('Noto‘g‘ri kiritma', () => {
  assert.equal(parseMapInput('').ok, false);
  assert.equal(parseMapInput('salom').ok, false);
  assert.equal(parseMapInput('https://example.com/x').ok, false);
  assert.equal(parseMapInput('<iframe src="javascript:alert(1)"></iframe>').ok, false);
});
