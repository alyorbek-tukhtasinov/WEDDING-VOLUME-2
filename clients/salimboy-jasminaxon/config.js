// ============================================================================
//  TO'Y TAKLIFNOMASI SOZLAMALARI — Salimboy & Jasminaxon
//  Media fayllar (rasm, musiqa) shu papkadagi media/ ichiga qo'yiladi va
//  bu yerda faqat fayl nomi yoziladi, masalan: music: 'music.mp3'
// ============================================================================

export default {
  // Kelin va kuyov
  couple: {
    groom: 'Salimboy',
    bride: 'Jasminaxon',
    // Konvert muhridagi bosh harflar. Bo'sh qoldirilsa ismlardan olinadi (S&J).
    initials: '',
  },

  // To'y sanasi va vaqti (Toshkent vaqti: +05:00)
  event: {
    date: '2026-10-10', // YYYY-MM-DD
    time: '18:00', // HH:MM
    timezone: '+05:00',
    durationHours: 5, // taqvimga qo'shish uchun
  },

  // Taklif qiluvchilar — mijoz xohishiga ko'ra oila nomi yozilmaydi
  hosts: '',

  texts: {
    heroCaption: 'Nikoh to‘yiga taklifnoma',
    greeting: 'Hurmatli mehmonimiz!',
    invitation:
      'Sizni farzandlarimiz Salimboy va Jasminaxonning hayotlaridagi eng quvonchli kun — nikoh to‘yi marosimiga taklif etamiz. Ushbu baxtli kunimizni siz bilan birga nishonlashdan mamnun bo‘lamiz.',
    closing: 'Tashrifingiz biz uchun katta sharaf!',
  },

  venue: {
    name: '“Dilshod Ota” to‘yxonasi',
    address: 'Toshkent viloyati, Parkent shahri',
    // Mijoz yuborgan Yandex xarita: to'yxonaning o'z sahifasi (aniq joy)
    yandexMaps: 'https://yandex.uz/maps/org/dilshod_ota/35087950302/',
    googleMaps: 'https://www.google.com/maps/search/?api=1&query=41.293440%2C69.642441',
    image: '',
  },

  // Butun sayt ortidagi fon rasmi (media/ dagi fayl). Asliga qaytarish uchun shu 2 qatorni o'chiring.
  backgroundImage: 'photo-4.jpg', // kelinning qo'li kuyov ko'ksida
  backgroundOverlay: 0.84, // 0..1 — rasm ustidagi krem parda (katta = xiraroq)

  // To'y dasturi (18:00 ga moslangan)
  program: [
    { time: '18:00', title: 'Mehmonlarni kutib olish' },
    { time: '18:30', title: 'Kelin-kuyovning kirib kelishi' },
    { time: '19:00', title: 'Tantanali ziyofat' },
    { time: '21:30', title: 'To‘y tortini kesish' },
  ],

  // Dress-kod (demo bilan bir xil)
  dressCode: {
    text: 'Kechki libos. Iltimos, oq rangdagi liboslardan saqlaning.',
    colors: ['#0b2545', '#c9a96e', '#f4efe6', '#7a1f3d'],
  },

  // Galereya: media/ dagi rasmlar nomlari (bo'sh bo'lsa ko'rsatilmaydi)
  gallery: ['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg', 'photo-4.jpg'],
  // 'garland' — ipga osilgan, suriladigan rasmlar (b-day uslubi). Asliga qaytarish: shu qatorni o'chiring.
  galleryStyle: 'garland',

  // Fon musiqasi (demo bilan bir xil)
  music: 'music.m4a',

  // Qatnashishni tasdiqlash (RSVP)
  rsvp: {
    enabled: true,
    deadline: '2026-10-09', // to'ydan bir kun oldin forma yopiladi
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
