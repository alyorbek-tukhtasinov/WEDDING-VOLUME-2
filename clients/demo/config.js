// ============================================================================
//  TO'Y TAKLIFNOMASI SOZLAMALARI
//  Yangi mijoz uchun faqat shu faylni va shu papkadagi media/ ni o'zgartiring.
//  Media fayllar (rasm, musiqa) shu papkadagi media/ ichiga qo'yiladi va
//  bu yerda faqat fayl nomi yoziladi, masalan: music: 'music.mp3'
// ============================================================================

export default {
  // Kelin va kuyov
  couple: {
    groom: 'Jasur',
    bride: 'Madina',
    // Konvert muhridagi bosh harflar. Bo'sh qoldirilsa ismlardan olinadi.
    initials: '',
  },

  // To'y sanasi va vaqti (Toshkent vaqti: +05:00)
  event: {
    date: '2026-10-10', // YYYY-MM-DD
    time: '19:00', // HH:MM
    timezone: '+05:00',
    durationHours: 5, // taqvimga qo'shish uchun
  },

  // Taklif qiluvchilar
  hosts: 'Karimovlar va Rahimovlar oilasi',

  texts: {
    heroCaption: 'Nikoh to‘yiga taklifnoma',
    greeting: 'Hurmatli mehmonimiz!',
    invitation:
      'Sizni farzandlarimiz Jasur va Madinaning hayotlaridagi eng quvonchli kun — nikoh to‘yi marosimiga taklif etamiz. Ushbu baxtli kunimizni siz bilan birga nishonlashdan mamnun bo‘lamiz.',
    closing: 'Tashrifingiz biz uchun katta sharaf!',
  },

  venue: {
    name: '“Navro‘z” to‘yxonasi',
    address: 'Toshkent sh., Yunusobod tumani, Amir Temur ko‘chasi, 100',
    // Xarita havolalari (ixtiyoriy). Bittasi bo'lsa ham yetarli.
    googleMaps: 'https://maps.google.com/?q=41.3385,69.2850',
    yandexMaps: 'https://yandex.uz/maps/?pt=69.2850,41.3385&z=17',
    // To'yxona rasmi: media/ dagi fayl nomi. Bo'sh bo'lsa standart chizma ko'rsatiladi.
    image: '',
  },

  // To'y dasturi (bo'sh massiv bo'lsa bo'lim ko'rsatilmaydi)
  program: [
    { time: '19:00', title: 'Mehmonlarni kutib olish' },
    { time: '19:30', title: 'Kelin-kuyovning kirib kelishi' },
    { time: '20:00', title: 'Tantanali ziyofat' },
    { time: '22:30', title: 'To‘y tortini kesish' },
  ],

  // Dress-kod (ixtiyoriy). text: '' bo'lsa bo'lim ko'rsatilmaydi
  dressCode: {
    text: 'Kechki libos. Iltimos, oq rangdagi liboslardan saqlaning.',
    colors: ['#0b2545', '#c9a96e', '#f4efe6', '#7a1f3d'],
  },

  // Galereya: media/ dagi rasmlar nomlari (bo'sh bo'lsa ko'rsatilmaydi)
  gallery: [],

  // Fon musiqasi: media/ dagi fayl nomi (mp3). Bo'sh bo'lsa tugma chiqmaydi.
  music: '',

  // Qatnashishni tasdiqlash (RSVP)
  rsvp: {
    enabled: true,
    deadline: '2026-10-01', // shu sanadan keyin forma yopiladi (bo'sh = cheklovsiz)
    maxGuests: 5,
    // Telegram bot sozlanmagan bo'lsa, shu havola ko'rsatiladi (masalan Google Forms)
    fallbackUrl: '',
  },

  // Bog'lanish uchun (ixtiyoriy)
  contacts: [
    { name: 'Kuyov tomoni', phone: '+998901234567' },
    { name: 'Kelin tomoni', phone: '+998907654321' },
  ],

  // Havola ulashilganda (Telegram, Instagram) ko'rinadigan ma'lumotlar
  seo: {
    title: '', // bo'sh bo'lsa: "Jasur & Madina — Taklifnoma"
    description: '', // bo'sh bo'lsa avtomatik yoziladi
    ogImage: '', // media/ dagi rasm (1200x630 tavsiya). Bo'sh bo'lsa standart rasm
  },

  // Rang mavzusi (ixtiyoriy — faqat o'zgartirmoqchi bo'lganingizni yozing)
  theme: {
    // navy: '#0b2545',
    // gold: '#c9a96e',
    // cream: '#f7f3ec',
    // wine: '#7a1f3d',
  },

  effects: {
    envelope: true, // ochiladigan konvert
    petals: true, // tushayotgan gul barglari
  },
};
