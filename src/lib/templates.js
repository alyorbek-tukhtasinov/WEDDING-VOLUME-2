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
  {
    id: 'suzani',
    title: 'Tirik suzani',
    description: 'O‘zbek suzanisi: igna naqshlarni ko‘z oldingizda tikadi, anorlar yoriladi, tilaklar gul bo‘lib tikiladi',
    features: ['program', 'dressCode', 'contacts', 'rsvp', 'wishes'],
  },
  {
    id: 'kitob',
    title: '3D sehrli kitob',
    description: 'Charm muqovali kitob: varaqlar 3D aylanadi, har sahifada pop-up manzara, emoji-stikerlar, mehmonlar tilaklari devori',
    features: ['program', 'dressCode', 'contacts', 'rsvp', 'wishes'],
  },
  {
    id: 'bulut',
    title: 'Bulutlar ustida',
    description: 'Yorug‘ kunduzgi osmon: samolyot chiptasi, bulutlar orasidan parvoz, samolyotlar ismlarni osmonga tutun bilan yozadi, havo sharlari va qog‘oz samolyotcha-tilaklar',
    features: ['program', 'dressCode', 'contacts', 'rsvp', 'wishes'],
  },
  {
    id: 'volume3',
    title: 'Volume 3',
    description: 'To‘q ko‘k konvert va tilla muhr, ko‘k kartush ichida ismlar, haftalik taqvim, saroy surati, sanoq, javob va mehmonlar kitobi (o‘zbek/rus)',
    features: ['program', 'dressCode', 'rsvp', 'wishes'],
  },
  {
    id: 'volume4',
    title: 'Volume 4',
    description: 'Volume 3 ning pushti ko‘rinishi: gulli fon, pushti ranglar, xira oynali kartochkalar, sanoq, javob va mehmonlar kitobi (o‘zbek/rus)',
    features: ['program', 'dressCode', 'rsvp', 'wishes'],
  },
  {
    id: 'volume5',
    title: 'Volume 5',
    description: 'Zaytun-bej “Our Story”: konvert ochilish videosi, raqsga tushayotgan juftlik, to‘lqinli to‘y dasturi, 3 kunlik taqvim, anketa va tilaklar',
    features: ['program', 'dressCode', 'contacts', 'giftNote', 'photos', 'rsvp', 'wishes'],
  },
];

export const DEFAULT_TEMPLATE = 'volume2';
export const findTemplate = (id) => TEMPLATES.find((t) => t.id === (id || DEFAULT_TEMPLATE)) || null;
export const templateOf = (config) => config?.template || DEFAULT_TEMPLATE;
