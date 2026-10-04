import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'taklifnoma-data-'));
const { verifyInitData, signInitData } = await import('../server/telegram.js');
const { applyInput, toSlug } = await import('../server/app-api.js');
const { writeSite, readSite, sitesOf, enqueue, takeQueue, listSites, slugTaken, STATUS } = await import('../server/data.js');
const { defaultConfig } = await import('../src/lib/starter.js');
const { validateConfig } = await import('../src/lib/config.js');

const TOKEN = '123456:TEST';

test('Telegram imzosi: to‘g‘ri, soxta va eskirgan', () => {
  const ok = verifyInitData(signInitData({ id: 42, first_name: 'Ali' }, TOKEN), TOKEN);
  assert.equal(ok.user.id, 42);
  assert.equal(verifyInitData(signInitData({ id: 42 }, 'boshqa:token'), TOKEN), null);
  assert.equal(verifyInitData(signInitData({ id: 42 }, TOKEN, Math.floor(Date.now() / 1000) - 8 * 86400), TOKEN), null);
  const tampered = signInitData({ id: 42 }, TOKEN).replace('42', '43');
  assert.equal(verifyInitData(tampered, TOKEN), null);
  assert.equal(verifyInitData('', TOKEN), null);
});

test('Mini App: faqat ruxsat etilgan maydonlar, xavfli havolalar olib tashlanadi', () => {
  const base = defaultConfig('volume3', 'nikoh');
  const c = applyInput(base, {
    demo: true,
    paused: true,
    musicUrl: 'https://x',
    couple: { groom: '  Sardor ', bride: 'Malika' },
    event: { date: '2027-05-20', time: '17:30' },
    venue: { name: 'Navro‘z', address: 'Toshkent', googleMaps: 'javascript:alert(1)', yandexMaps: 'https://yandex.uz/maps/?pt=69,41' },
    texts: { invitation: 'a'.repeat(5000) },
    musicTrack: 'yo‘q-qo‘shiq',
  }, { isNew: true });
  assert.equal(c.demo, undefined);
  assert.equal(c.paused, undefined);
  assert.equal(c.musicUrl, undefined);
  assert.equal(c.couple.groom, 'Sardor');
  assert.equal(c.venue.googleMaps, '');
  assert.ok(c.venue.yandexMaps.startsWith('https://'));
  assert.equal(c.texts.invitation.length, 1200);
  assert.equal(c.musicTrack, base.musicTrack);
  assert.equal(c.rsvp.deadline, '2027-05-19');
  assert.equal(c.program[0].time, '17:30');
  assert.deepEqual(validateConfig(c), []);
});

test('Mini App: avtomatik taklif matni ismlar bilan; qiz uzatishda kuyovsiz', () => {
  const c = applyInput(defaultConfig('osmon', 'qiz-uzatish'), { couple: { groom: '', bride: 'Gulasal' } }, { isNew: true });
  assert.equal(c.couple.showGroom, false);
  assert.match(c.texts.invitation, /Qizimiz Gulasalni/);
  assert.doesNotMatch(c.texts.invitation, /Kuyov|Kelin/);
  const n = applyInput(defaultConfig('volume2', 'nikoh'), { couple: { groom: 'Ali', bride: 'Vali' }, invitedBy: 'couple' }, { isNew: true });
  assert.match(n.texts.invitation, /Biz — Ali va Vali/);
});

test('Sayt manzili: kirill ismlar ham lotinda', () => {
  assert.equal(toSlug('Жаҳонгиршоҳ', 'Гуласал'), 'jahongirshoh-gulasal');
  assert.equal(toSlug('O‘tkir', 'Ra’no'), 'otkir-rano');
});

test('Ma’lumotlar: egasi bo‘yicha, band nomlar, navbat tartibi', () => {
  writeSite('ali-vali', { config: defaultConfig('volume2'), meta: { owner: { id: 1 }, status: STATUS.draft } });
  writeSite('bek-gul', { config: defaultConfig('volume2'), meta: { owner: { id: 2 }, status: STATUS.paid } });
  assert.equal(readSite('ali-vali').meta.status, 'draft');
  assert.deepEqual(sitesOf(1).map((s) => s.slug), ['ali-vali']);
  assert.equal(listSites().length, 2);
  assert.equal(slugTaken('ali-vali', { clientsDirs: [] }), 'mavjud sayt');
  assert.equal(slugTaken('yangi-nom', { clientsDirs: [] }), '');
  assert.equal(readSite('../etc'), null);
  for (let i = 0; i < 20; i++) enqueue({ type: 'notify', n: i });
  assert.deepEqual(takeQueue().map((e) => e.n), [...Array(20).keys()]);
  assert.deepEqual(takeQueue(), []);
});

test('Rasm joylari: shablon bo‘yicha, ishlatilgan fayllar', async () => {
  const { slotsFor, findSlot, usedMedia, setField } = await import('../src/lib/photo-slots.js');
  assert.ok(findSlot('volume2', 'gallery').multi);
  assert.equal(findSlot('osmon', 'gallery'), null);
  assert.ok(findSlot('osmon', 'seo.ogImage'));
  assert.equal(slotsFor('yz').filter((s) => s.field.startsWith('photos.')).length, 5);
  const c = { template: 'volume2', gallery: ['a.jpg', 'b.jpg'], seo: {} };
  setField(c, 'seo.ogImage', 'c.jpg');
  setField(c, 'backgroundImage', 'd.jpg');
  assert.deepEqual([...usedMedia(c)].sort(), ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
  setField(c, 'backgroundImage', undefined);
  assert.equal(c.backgroundImage, undefined);
});
