// Umumiy musiqa to'plami — mijoz admin panelda shu ro'yxatdan tanlaydi.
// Yangi qo'shiq qo'shish: faylni public/music/ ga qo'ying va pastga bitta qator yozing.
// id — faqat kichik lotin harflari, raqam va "-" (saqlangan tanlov shu id bilan bog'lanadi, o'zgartirmang).
export const MUSIC_LIBRARY = [
  { id: 'musiqa-1', title: '1-musiqa', file: '/music/musiqa-1.m4a' },
  { id: 'musiqa-2', title: 'Shohruhxon — Men seni sevaman', file: '/music/musiqa-2.mp3' },
];

export const findTrack = (id) => MUSIC_LIBRARY.find((t) => t.id === id) || null;
