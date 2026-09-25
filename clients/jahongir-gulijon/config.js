// ============================================================================
//  TO'Y TAKLIFNOMASI SOZLAMALARI — Jahongir & Gulijon
//  Media fayllar (rasm, musiqa) shu papkadagi media/ ichiga qo'yiladi va
//  bu yerda faqat fayl nomi yoziladi, masalan: music: 'music.mp3'
// ============================================================================

export default {
  // Kelin va kuyov
  couple: {
    groom: 'Jahongir',
    bride: 'Gulijon',
    // Konvert muhridagi bosh harflar. Bo'sh qoldirilsa ismlardan olinadi (J&G).
    initials: '',
  },

  // To'y sanasi va vaqti (Toshkent vaqti: +05:00)
  event: {
    date: '2026-11-07', // YYYY-MM-DD
    time: '19:00', // HH:MM
    timezone: '+05:00',
    durationHours: 5, // taqvimga qo'shish uchun
  },

  // Taklif qiluvchilar — mijoz xohishiga ko'ra sulola nomi yozilmaydi
  hosts: '',

  texts: {
    heroCaption: 'Nikoh to‘yiga taklifnoma',
    greeting: 'Hurmatli mehmonimiz!',
    invitation:
      'Sizni farzandlarimiz Jahongir va Gulijonning hayotlaridagi eng quvonchli kun — nikoh to‘yi marosimiga taklif etamiz. Ushbu baxtli kunimizni siz bilan birga nishonlashdan mamnun bo‘lamiz.',
    closing: 'Tashrifingiz biz uchun katta sharaf!',
  },

  venue: {
    name: '“Vazi Nur” to‘yxonasi',
    address: 'Buxoro viloyati, Buxoro shahri',
    // Mijoz yuborgan Yandex xarita: to'yxonaning o'z sahifasi (aniq joy)
    yandexMaps: 'https://yandex.uz/maps/org/vazi_nur/67423394555/',
    googleMaps: 'https://www.google.com/maps/search/?api=1&query=39.811352%2C64.430728',
    image: '',
  },

  // To'y dasturi (demo bilan bir xil)
  program: [
    { time: '19:00', title: 'Mehmonlarni kutib olish' },
    { time: '19:30', title: 'Kelin-kuyovning kirib kelishi' },
    { time: '20:00', title: 'Tantanali ziyofat' },
    { time: '22:30', title: 'To‘y tortini kesish' },
  ],

  // Dress-kod (demo bilan bir xil)
  dressCode: {
    text: 'Kechki libos. Iltimos, oq rangdagi liboslardan saqlaning.',
    colors: ['#0b2545', '#c9a96e', '#f4efe6', '#7a1f3d'],
  },

  // Galereya: media/ dagi rasmlar nomlari (bo'sh bo'lsa ko'rsatilmaydi)
  gallery: [],

  // Fon musiqasi (demo bilan bir xil)
  music: 'music.m4a',

  // Qatnashishni tasdiqlash (RSVP)
  rsvp: {
    enabled: true,
    deadline: '2026-11-06', // to'ydan bir kun oldin forma yopiladi
    maxGuests: 5,
    showWishes: true,
  },

  // Bog'lanish uchun
  contacts: [{ name: 'Aloqa uchun', phone: '+998 97 300 37 03' }],

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
