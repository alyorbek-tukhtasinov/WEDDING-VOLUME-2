// Umumiy musiqa to'plami — mijoz admin panelda shu ro'yxatdan tanlaydi.
// Yangi qo'shiq qo'shish: faylni public/music/ ga qo'ying va pastga bitta qator yozing.
// id — faqat kichik lotin harflari, raqam va "-" (saqlangan tanlov shu id bilan bog'lanadi, o'zgartirmang).
export const MUSIC_LIBRARY = [
  { id: 'musiqa-1', title: 'Benom — Yoningdaman', file: '/music/musiqa-1.m4a' },
  { id: 'musiqa-2', title: 'Shohruhxon — Men seni sevaman', file: '/music/musiqa-2.mp3' },
  { id: 'musiqa-3', title: 'Wedding Nasheed', file: '/music/musiqa-3.mp3' },
  { id: 'musiqa-4', title: 'Yusuf & Zulayho shabloni musiqasi', file: '/music/musiqa-4.mp3' },
  { id: 'musiqa-5', title: 'Ozod Shukrulloyev — Yonimda bo‘l', file: '/music/musiqa-5.m4a' },
  { id: 'musiqa-6', title: 'Benom guruhi — Olib ketaman', file: '/music/musiqa-6.m4a' },
  { id: 'musiqa-7', title: "Shaxriyor — Meni sev", file: '/music/musiqa-7.m4a' },
  { id: 'musiqa-8', title: "A Thousand Years — Jada Facer", file: '/music/musiqa-8.mp3' },
  { id: 'musiqa-9', title: "Aytekin Ataş — Çalıkuşu Jenerik", file: '/music/musiqa-9.m4a' },
  { id: 'musiqa-10', title: "Ziyoda - Kelibdi", file: '/music/musiqa-10.mp3' },
  { id: 'musiqa-11', title: "Izzat Shukurov — Vafodorim", file: '/music/musiqa-11.m4a' },
  { id: 'musiqa-12', title: "Ed Sheeran — Perfect", file: '/music/musiqa-12.mp3' },
  { id: 'musiqa-13', title: "Alex Warren — Ordinary", file: '/music/musiqa-13.mp3' },
  { id: 'musiqa-14', title: "Bolalar — Kel yashaylik biz birga", file: '/music/musiqa-14.m4a' },
];

export const findTrack = (id) => MUSIC_LIBRARY.find((t) => t.id === id) || null;
