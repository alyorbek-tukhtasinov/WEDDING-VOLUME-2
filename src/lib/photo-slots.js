// Mijoz (Telegram Mini App) yuklay oladigan rasmlar — shablon bo'yicha. Server ham shu ro'yxat bo'yicha
// tekshiradi: boshqa maydonga fayl yozib bo'lmaydi. Brauzerda ham, Node'da ham ishlaydi.
//   field — config'dagi joy ("venue.image", "photos.hero" …), multi — bir nechta rasm (massiv) va chegara.
const BACKGROUND = { field: 'backgroundImage', title: 'Orqa fon surati', hint: 'Butun sahifa ortida turadi (masalan, ikkingizning suratingiz)' };

export const PHOTO_SLOTS = {
  volume2: [
    { ...BACKGROUND, hint: 'Butun sahifa ortida, ustida och parda bilan — matn o‘qilishi uchun' },
    { field: 'venue.image', title: 'To‘yxona surati', hint: 'Manzil bo‘limida chiqadi' },
    { field: 'gallery', title: 'Galereya', hint: 'Sizning suratlaringiz (6 tagacha)', multi: 6 },
  ],
  volume3: [{ ...BACKGROUND, hint: 'Gullar o‘rnida sizning suratingiz yoki fon rasmingiz' }],
  volume4: [{ ...BACKGROUND, hint: 'Gullar o‘rnida sizning suratingiz yoki fon rasmingiz' }],
  yz: [
    { field: 'photos.hero', title: '1. Bosh surat', hint: 'Sayt ochilganda birinchi ko‘rinadi' },
    { field: 'photos.invitation', title: '2. Taklif bo‘limi' },
    { field: 'photos.details', title: '3. Tafsilotlar bo‘limi' },
    { field: 'photos.countdown', title: '4. Sanoq bo‘limi' },
    { field: 'photos.map', title: '5. Manzil bo‘limi' },
  ],
};
export const SHARE_SLOT = {
  field: 'seo.ogImage',
  title: 'Ulashish surati',
  hint: 'Havola Telegram yoki WhatsApp’da yuborilganda chiqadigan kichik rasm',
};

export const slotsFor = (template) => [...(PHOTO_SLOTS[template || 'volume2'] || []), SHARE_SLOT];
export const findSlot = (template, field) => slotsFor(template).find((s) => s.field === field) || null;

/** config'dan qiymat: "venue.image" → c.venue.image */
export const getField = (c, field) => field.split('.').reduce((o, k) => (o == null ? o : o[k]), c);
export function setField(c, field, value) {
  const keys = field.split('.');
  let o = c;
  for (const k of keys.slice(0, -1)) o = o[k] && typeof o[k] === 'object' ? o[k] : (o[k] = {});
  if (value === undefined || value === '') delete o[keys.at(-1)];
  else o[keys.at(-1)] = value;
}

/** Sozlamada ishlatilayotgan barcha fayl nomlari (shu ro'yxatdagi joylar bo'yicha) */
export function usedMedia(c) {
  const out = new Set();
  for (const s of slotsFor(c.template)) {
    const v = getField(c, s.field);
    for (const n of Array.isArray(v) ? v : [v]) if (typeof n === 'string' && n) out.add(n);
  }
  return out;
}
