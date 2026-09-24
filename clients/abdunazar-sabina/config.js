// ============================================================================
//  TO'Y TAKLIFNOMASI SOZLAMALARI — Abdunazar & Sabina
//  Media fayllar (rasm, musiqa) shu papkadagi media/ ichiga qo'yiladi va
//  bu yerda faqat fayl nomi yoziladi, masalan: music: 'music.mp3'
// ============================================================================

export default {
  // Kelin va kuyov
  couple: {
    groom: 'Abdunazar',
    bride: 'Sabina',
    // Konvert muhridagi bosh harflar. Bo'sh qoldirilsa ismlardan olinadi (A&S).
    initials: '',
  },

  // To'y sanasi va vaqti (Toshkent vaqti: +05:00)
  event: {
    date: '2026-10-03', // YYYY-MM-DD
    time: '19:00', // HH:MM
    timezone: '+05:00',
    durationHours: 5, // taqvimga qo'shish uchun
  },

  // Taklif qiluvchilar
  hosts: 'Bozorovlar va Safarovlar oilasi',

  texts: {
    heroCaption: 'Nikoh to‘yiga taklifnoma',
    greeting: 'Hurmatli mehmonimiz!',
    invitation:
      'Sizni farzandlarimiz Abdunazar va Sabinaning hayotlaridagi eng quvonchli kun — nikoh to‘yi marosimiga taklif etamiz. Ushbu baxtli kunimizni siz bilan birga nishonlashdan mamnun bo‘lamiz.',
    closing: 'Tashrifingiz biz uchun katta sharaf!',
  },

  venue: {
    name: '“Fayz Baraka” to‘yxonasi',
    address: 'Buxoro viloyati, Peshku tumani',
    // Mijoz yuborgan Google xarita lokatsiyasi (40.0465148, 64.3266856)
    googleMaps: 'https://www.google.com/maps/search/?api=1&query=40.0465148%2C64.3266856',
    yandexMaps: 'https://yandex.uz/maps/?pt=64.3266856,40.0465148&z=17&l=map',
    // To'yxona rasmi: media/ dagi fayl nomi. Bo'sh bo'lsa standart chizma ko'rsatiladi.
    image: '',
  },

  // To'y dasturi (bo'sh — bo'lim ko'rsatilmaydi)
  program: [],

  // Dress-kod (bo'sh — bo'lim ko'rsatilmaydi)
  dressCode: {
    text: '',
    colors: [],
  },

  // Galereya: media/ dagi rasmlar nomlari (bo'sh bo'lsa ko'rsatilmaydi)
  gallery: [],

  // Fon musiqasi: media/ dagi fayl nomi (mp3 yoki m4a). Bo'sh bo'lsa tugma chiqmaydi.
  music: 'music.m4a',

  // Qatnashishni tasdiqlash (RSVP)
  rsvp: {
    enabled: true,
    deadline: '2026-10-02', // to'ydan bir kun oldin forma yopiladi
    maxGuests: 5,
    // Mehmonlar tilaklarini saytda "Tilaklar" bo'limida ko'rsatish (ism + tilak, telefonsiz)
    showWishes: true,
  },

  // Bog'lanish uchun
  contacts: [{ name: 'Aloqa uchun', phone: '+998 94 753 11 01' }],

  // Havola ulashilganda (Telegram, Instagram) ko'rinadigan ma'lumotlar
  seo: {
    title: '', // bo'sh — "Abdunazar & Sabina — Taklifnoma"
    description: '', // bo'sh — avtomatik yoziladi
    ogImage: '', // media/ dagi rasm (1200x630 tavsiya). Bo'sh bo'lsa standart rasm
  },

  // Rang mavzusi (standart: to'q ko'k + oltin)
  theme: {},

  effects: {
    envelope: true, // ochiladigan konvert
    petals: true, // tushayotgan gul barglari
  },
};
