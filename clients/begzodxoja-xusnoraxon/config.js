// ============================================================================
//  TO'Y TAKLIFNOMASI SOZLAMALARI — Begzodxoja & Xusnoraxon
//  Media fayllar (rasm, musiqa) shu papkadagi media/ ichiga qo'yiladi va
//  bu yerda faqat fayl nomi yoziladi, masalan: music: 'music.mp3'
// ============================================================================

export default {
  // Kelin va kuyov
  couple: {
    groom: 'Begzodxoja',
    bride: 'Xusnoraxon',
    // Konvert muhridagi bosh harflar. Bo'sh qoldirilsa ismlardan olinadi (B&X).
    initials: '',
  },

  // To'y sanasi va vaqti (Toshkent vaqti: +05:00)
  event: {
    date: '2026-10-07', // YYYY-MM-DD
    time: '19:00', // HH:MM
    timezone: '+05:00',
    durationHours: 5, // taqvimga qo'shish uchun
  },

  // Taklif qiluvchilar (bo'sh — ko'rsatilmaydi)
  hosts: '',

  texts: {
    heroCaption: 'Nikoh to‘yiga taklifnoma',
    greeting: 'Hurmatli mehmonimiz!',
    invitation:
      'Sizni farzandlarimiz Begzodxoja va Xusnoraxonning hayotlaridagi eng quvonchli kun — nikoh to‘yi marosimiga taklif etamiz. Ushbu baxtli kunimizni siz bilan birga nishonlashdan mamnun bo‘lamiz.',
    closing: 'Tashrifingiz biz uchun katta sharaf!',
  },

  venue: {
    name: '“Shirin hayot” to‘yxonasi',
    address: 'Toshkent viloyati',
    // Mijoz yuborgan Yandex xarita: to'yxonaning o'z sahifasi (aniq joy)
    yandexMaps: 'https://yandex.uz/maps/org/shirin_hayot/132226274815/',
    googleMaps: 'https://www.google.com/maps/search/?api=1&query=41.134079%2C69.340102',
    image: '',
  },

  // To'yxona bo'limida rasm o'rniga chiqadigan katta yozuv
  giftNote: {
    eyebrow: 'Eng qimmatli sovg‘a',
    title: 'Sizning tashrifingiz',
    text: 'Kelishingizning o‘zi biz uchun eng katta sovg‘a. Quvonchimizga sherik bo‘lib, duolaringiz bilan qutlasangiz — shuning o‘zi kifoya.',
  },

  // To'y dasturi
  program: [
    { time: '19:00', title: 'Mehmonlarni kutib olish' },
    { time: '19:30', title: 'Kelin-kuyovning kirib kelishi' },
    { time: '20:00', title: 'Tantanali ziyofat' },
    { time: '22:30', title: 'To‘y tortini kesish' },
  ],

  // Dress-kod
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
    deadline: '2026-10-06', // to'ydan bir kun oldin forma yopiladi
    maxGuests: 5,
    showWishes: true,
  },

  // Bog'lanish uchun (raqam berilmagan)
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
