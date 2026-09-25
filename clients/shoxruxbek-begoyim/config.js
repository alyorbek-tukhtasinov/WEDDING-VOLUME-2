// ============================================================================
//  TO'Y TAKLIFNOMASI SOZLAMALARI — Shoxruxbek & Begoyim
//  Media fayllar (rasm, musiqa) shu papkadagi media/ ichiga qo'yiladi va
//  bu yerda faqat fayl nomi yoziladi, masalan: music: 'music.mp3'
// ============================================================================

export default {
  // Kelin va kuyov
  couple: {
    groom: 'Shoxruxbek',
    bride: 'Begoyim',
    // Konvert muhridagi bosh harflar. Bo'sh qoldirilsa ismlardan olinadi (S&B).
    initials: '',
  },

  // To'y sanasi va vaqti (Toshkent vaqti: +05:00)
  event: {
    date: '2026-09-29', // YYYY-MM-DD
    time: '11:00', // HH:MM
    timezone: '+05:00',
    durationHours: 5, // taqvimga qo'shish uchun
  },

  // Taklif qiluvchilar (bo'sh — ko'rsatilmaydi; xonadon nomi manzilda turibdi)
  hosts: '',

  texts: {
    heroCaption: 'Nikoh to‘yiga taklifnoma',
    greeting: 'Hurmatli mehmonimiz!',
    invitation:
      'Sizni farzandlarimiz Shoxruxbek va Begoyimning hayotlaridagi eng quvonchli kun — nikoh to‘yi marosimiga taklif etamiz. Ushbu baxtli kunimizni siz bilan birga nishonlashdan mamnun bo‘lamiz.',
    closing: 'Tashrifingiz biz uchun katta sharaf!',
  },

  venue: {
    name: 'Ismoilovlar xonadoni',
    address: 'Andijon viloyati, Oltinko‘l tumani, Qo‘shtepasaroy QFY, Toptiq MFY, Do‘stlik ko‘chasi, 10-xonadon',
    // Mijoz yuborgan Yandex xaritadagi manzil nuqtasi (40.833666, 72.014127)
    yandexMaps: 'https://yandex.uz/maps/?pt=72.014127,40.833666&z=18&l=map',
    googleMaps: 'https://www.google.com/maps/search/?api=1&query=40.833666%2C72.014127',
    image: '',
  },

  // Butun sayt ortidagi fon rasmi (media/ dagi fayl). Asliga qaytarish uchun shu 2 qatorni o'chiring.
  backgroundImage: 'bg.jpg',
  backgroundOverlay: 0.84, // 0..1 — rasm ustidagi krem parda (katta = xiraroq)

  // To'y dasturi (kelin tomon — qiz uzatish, kelinning uyida)
  program: [
    { time: '11:00', title: 'Mehmonlarni kutib olish' },
    { time: '11:30', title: 'Dasturxon atrofida ziyofat' },
    { time: '13:00', title: 'Kuyov va uning yaqinlarining kirib kelishi' },
    { time: '13:30', title: 'Kelinni kuyov xonadoniga kuzatish' },
  ],

  // Dress-kod (kunduzgi tadbirga moslangan)
  dressCode: {
    text: 'Bayramona libos. Iltimos, oq rangdagi liboslardan saqlaning.',
    colors: ['#0b2545', '#c9a96e', '#f4efe6', '#7a1f3d'],
  },

  // Galereya: media/ dagi rasmlar nomlari (bo'sh bo'lsa ko'rsatilmaydi)
  gallery: [],

  // Fon musiqasi (demo bilan bir xil)
  music: 'music.m4a',

  // Qatnashishni tasdiqlash (RSVP)
  rsvp: {
    enabled: true,
    deadline: '2026-09-28', // to'ydan bir kun oldin forma yopiladi
    maxGuests: 5,
    showWishes: true,
  },

  // Bog'lanish uchun — mijoz xohishiga ko'ra raqam qo'yilmagan
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
