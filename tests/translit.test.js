import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latinToCyrillic as t } from '../src/lib/translit.js';

test('Asl Yusuf-Zulayho shablonidagi juftliklar', () => {
  assert.equal(t('Yusuf'), 'Юсуф');
  assert.equal(t('Zulayho'), 'Зулайҳо');
  assert.equal(t("O'zbekiston tumani, Ziyo-Nursux MFY"), 'Ўзбекистон тумани, Зиё-Нурсух МФЙ');
});

test('Mijozlar ismlari', () => {
  assert.equal(t('Salimboy'), 'Салимбой');
  assert.equal(t('Jasminaxon'), 'Жасминахон');
  assert.equal(t('Shoxruxbek'), 'Шохрухбек');
  assert.equal(t('Sanjar'), 'Санжар');
  assert.equal(t('Dilnoza'), 'Дилноза');
  assert.equal(t('Begzodxoja'), 'Бегзодхожа');
  assert.equal(t('Gulijon'), 'Гулижон');
  assert.equal(t('To‘rayevlar'), 'Тўраевлар');
});

test('Maxsus holatlar: o‘/g‘, e, tutuq belgisi, ch', () => {
  assert.equal(t("G'ayrat"), 'Ғайрат');
  assert.equal(t('Erkin'), 'Эркин');
  assert.equal(t('Yelena'), 'Елена');
  assert.equal(t("Mas'uda"), 'Масъуда');
  assert.equal(t('Chilonzor'), 'Чилонзор');
  assert.equal(t('“Navro‘z” to‘yxonasi'), '“Наврўз” тўйхонаси');
  assert.equal(t(''), '');
});
