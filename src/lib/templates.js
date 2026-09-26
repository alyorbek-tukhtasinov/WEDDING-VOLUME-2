// Taklifnoma shablonlari. Har bir mijoz config'ida `template` maydoni bilan tanlanadi
// (yozilmagan bo'lsa — volume2). Panel yangi to'y yaratishda shu ro'yxatni ko'rsatadi.

export const TEMPLATES = [
  {
    id: 'volume2',
    title: 'Volume 2',
    description: 'Krem-tilla, ochiladigan konvert, to‘y dasturi, dress-kod, onlayn javob va tilaklar',
    // Panelda ochiladigan bo'limlar
    features: ['program', 'dressCode', 'contacts', 'gallery', 'giftNote', 'background', 'rsvp', 'wishes'],
  },
  {
    id: 'yz',
    title: 'Yusuf & Zulayho',
    description: 'Qora-tilla kinematik uslub, o‘zbek/rus tillari, 6 ta suratli bo‘lim, sovg‘a kartasi',
    features: ['ru', 'photos', 'giftCard', 'mapEmbed', 'rsvp'],
  },
  {
    id: 'osmon',
    title: 'To‘y kechasining osmoni',
    description: 'To‘y kechasining haqiqiy yulduzli osmoni, ismlar — yulduz turkumi, tilaklar — osmondagi yulduzlar',
    features: ['program', 'dressCode', 'contacts', 'sky', 'rsvp', 'wishes'],
  },
];

export const DEFAULT_TEMPLATE = 'volume2';
export const findTemplate = (id) => TEMPLATES.find((t) => t.id === (id || DEFAULT_TEMPLATE)) || null;
export const templateOf = (config) => config?.template || DEFAULT_TEMPLATE;
