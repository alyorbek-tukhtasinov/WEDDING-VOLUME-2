// ============================================================================
//  TO'Y TAKLIFNOMASI SOZLAMALARI — Sanjar & Dilnoza
//  Media fayllar (rasm, musiqa) shu papkadagi media/ ichiga qo'yiladi va
//  bu yerda faqat fayl nomi yoziladi, masalan: music: 'music.mp3'
// ============================================================================

export default {
  // Kelin va kuyov
  couple: {
    groom: 'Sanjar',
    bride: 'Dilnoza',
    // Konvert muhridagi bosh harflar. Bo'sh qoldirilsa ismlardan olinadi (S&D).
    initials: '',
  },

  // To'y sanasi va vaqti (Toshkent vaqti: +05:00)
  event: {
    date: '2026-10-18', // YYYY-MM-DD
    time: '18:30', // HH:MM
    timezone: '+05:00',
    durationHours: 5, // taqvimga qo'shish uchun
  },

  // Taklif qiluvchilar
  hosts: 'To‘rayevlar va Qurbonovlar oilasi',

  texts: {
    heroCaption: 'Nikoh to‘yiga taklifnoma',
    greeting: 'Hurmatli mehmonimiz!',
    invitation:
      'Sizni farzandlarimiz Sanjar va Dilnozaning hayotlaridagi eng quvonchli kun — nikoh to‘yi marosimiga taklif etamiz. Ushbu baxtli kunimizni siz bilan birga nishonlashdan mamnun bo‘lamiz.',
    closing: 'Tashrifingiz biz uchun katta sharaf!',
  },

  venue: {
    name: '“Zumrad” to‘yxonasi',
    address: 'Navoiy viloyati, Qiziltepa tumani, Toshrabot qo‘rg‘oni',
    // Mijoz yuborgan Google xarita (Toshrabot MFY, 40.146117, 65.194907)
    googleMaps: 'https://www.google.com/maps/search/?api=1&query=40.146117%2C65.194907',
    yandexMaps: 'https://yandex.uz/maps/?pt=65.194907,40.146117&z=15&l=map',
    image: '',
  },

  // Butun sayt ortidagi fon rasmi (media/ dagi fayl). Asliga qaytarish uchun shu 2 qatorni o'chiring.
  backgroundImage: 'bg.jpg',
  backgroundOverlay: 0.84, // 0..1 — rasm ustidagi krem parda (katta = xiraroq)

  // To'y dasturi (18:30 ga moslangan)
  program: [
    { time: '18:30', title: 'Mehmonlarni kutib olish' },
    { time: '19:00', title: 'Kelin-kuyovning kirib kelishi' },
    { time: '19:30', title: 'Tantanali ziyofat' },
    { time: '22:00', title: 'To‘y tortini kesish' },
  ],

  // Dress-kod (demo bilan bir xil)
  dressCode: {
    text: 'O‘zingizga qulay va ma’qul bo‘lgan bayramona libosda tashrif buyuring — biz uchun eng muhimi, siz bilan birga bo‘lish.',
    colors: ['#0b2545', '#c9a96e', '#f4efe6', '#7a1f3d'],
  },

  // Galereya: media/ dagi rasmlar nomlari (bo'sh bo'lsa ko'rsatilmaydi)
  gallery: [],

  // Fon musiqasi (demo bilan bir xil)
  music: 'music.m4a',

  // Qatnashishni tasdiqlash (RSVP)
  rsvp: {
    enabled: true,
    deadline: '2026-10-17', // to'ydan bir kun oldin forma yopiladi
    maxGuests: 5,
    showWishes: true,
  },

  // Bog'lanish uchun — mijoz xohishiga ko'ra raqam ko'rsatilmaydi
  contacts: [],

  seo: {
    title: '',
    description: '',
    ogImage: '',
  },

  theme: {},

  effects: {
    envelope: true,
    petals: true,
  },
};
