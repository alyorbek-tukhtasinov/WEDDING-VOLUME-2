// "Oltin plastinka" matnlari — yigitning tug'ilgan kun bazmiga taklifnoma (albom/plastinka uslubida).
// config.texts.<kalit> — istalgan asosiy matnni almashtiradi (panel shu matnlarni namuna sifatida ko'rsatadi).
// DOM ishlatmang: fayl panelda ham, testlarda ham yuklanadi.

// Panel/bot tavsiya qiladigan dastur (ruscha tarjimasi bilan)
export const PARTY_PROGRAM = [
  { time: '19:00', title: 'Mehmonlarni kutib olish' },
  { time: '19:30', title: 'Bayram dasturxoni' },
  { time: '20:30', title: 'Tilaklar va qadahlar' },
  { time: '21:30', title: 'Tort va shamlar' },
  { time: '22:00', title: 'Raqslar va jonli musiqa' },
];
const RU_PROGRAM = {
  'Mehmonlarni kutib olish': 'Встреча гостей',
  'Bayram dasturxoni': 'Праздничный ужин',
  'Tilaklar va qadahlar': 'Тосты и пожелания',
  'Tort va shamlar': 'Торт и свечи',
  'Raqslar va jonli musiqa': 'Танцы и живая музыка',
  'Raqslar': 'Танцы',
  'Kechki ziyofat': 'Вечерний банкет',
  'Tantanali ziyofat': 'Праздничный банкет',
};
export const ruProgramTitle = (t) => RU_PROGRAM[String(t || '').replace(/'/g, '‘')] || null;

const UZ_MONTHS_GEN = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const RU_MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/**
 * @param {object} c config
 * @param {{ name: string, age: number|null }} d
 * @param {'uz'|'ru'} lang (o'zbek kirili — uz matnidan o'giriladi)
 */
export function plastinkaTexts(c, d, lang = 'uz') {
  const n = d.name;
  const age = d.age;
  const t = c.texts || {};
  if (lang === 'ru') {
    return {
      gateEyebrow: 'Новый релиз',
      gateHint: 'Нажмите на обложку — достаньте пластинку',
      label: 'Birthday Records',
      vol: age ? `Vol. ${age}` : 'Limited edition',
      heroEyebrow: 'Приглашение на день рождения',
      ageLine: age ? `${age} лет` : 'День рождения',
      musicOn: 'Включить музыку',
      musicOff: 'Пауза',
      sideA: 'Сторона A',
      inviteTitle: t.ruInviteTitle || 'Дорогой гость!',
      invitation:
        t.ruInvitation ||
        (age
          ? `Начинается новый трек моей жизни — мне ${age}! Этот вечер я хочу провести с самыми близкими людьми. Приходите — сделаем его незабываемым!`
          : 'Начинается новый трек моей жизни! Этот вечер я хочу провести с самыми близкими людьми. Приходите — сделаем его незабываемым!'),
      release: 'Дата релиза',
      at: 'Начало',
      countdown: 'До вечеринки осталось',
      units: ['дней', 'часов', 'минут', 'секунд'],
      live: 'Сегодня!',
      tracklist: 'Треклист',
      tracklistSub: 'Программа вечера',
      sideAShort: 'A',
      sideBShort: 'B',
      venue: 'Живой концерт',
      venueTitle: 'Место',
      google: 'Google Maps',
      yandex: 'Яндекс Карты',
      dress: 'Дресс-код',
      bonus: 'Бонус-трек',
      gift: 'Подарок',
      copy: 'Копировать',
      copied: 'Скопировано ✓',
      guestList: 'Гостевой список',
      rsvpTitle: 'Подтвердите участие',
      pass: 'All access',
      passSub: 'Backstage · Гость',
      deadline: (dd, m) => `Ответ до ${dd} ${RU_MONTHS_GEN[m - 1]}`,
      yourName: 'Ваше имя',
      namePh: 'Имя Фамилия',
      canCome: 'Придёте?',
      yes: 'Да, буду!',
      no: 'Не получится',
      guests: 'Сколько вас будет?',
      person: 'чел.',
      wish: 'Пожелание имениннику',
      wishPh: 'Пару тёплых слов…',
      send: 'Попасть в список',
      sending: 'Отправка…',
      approved: 'В списке',
      declined: 'Жаль!',
      thanksYes: (x) => `${x}, вы в гостевом списке! До встречи на вечеринке 🎉`,
      thanksNo: (x) => `Спасибо, ${x}, что сообщили! Будем скучать.`,
      change: 'Изменить ответ',
      closed: 'Приём ответов завершён. Спасибо!',
      needName: 'Пожалуйста, введите имя.',
      needAnswer: 'Отметьте, сможете ли прийти.',
      error: 'Ошибка. Попробуйте ещё раз.',
      offline: 'Проверьте интернет и попробуйте ещё раз.',
      preview: 'Режим просмотра — ответ не отправляется.',
      wishes: 'Пожелания',
      wishesSub: 'Shout-outs',
      contacts: 'Остались вопросы?',
      call: 'Позвонить',
      rights: `℗ ${d.year} ${n} Records · Все права защищены 😉`,
      cta: 'Закажите онлайн-приглашение',
    };
  }
  return {
    gateEyebrow: 'Yangi albom chiqdi',
    gateHint: 'Muqovani bosing — plastinkani chiqaring',
    label: 'Birthday Records',
    vol: age ? `Vol. ${age}` : 'Limited edition',
    heroEyebrow: 'Tug‘ilgan kun bazmiga taklifnoma',
    ageLine: age ? `${age} yosh` : 'Tug‘ilgan kun',
    musicOn: 'Musiqani yoqish',
    musicOff: 'To‘xtatish',
    sideA: 'A tomon',
    inviteTitle: t.inviteTitle || 'Aziz mehmonim!',
    invitation:
      t.invitation ||
      (age
        ? `Hayotimning yangi treki boshlanmoqda — ${age} yoshga to‘ldim! Shu kechani eng yaqin insonlarim bilan birga nishonlamoqchiman. Bazmimga keling — kechani birgalikda unutilmas qilamiz!`
        : 'Hayotimning yangi treki boshlanmoqda! Shu kechani eng yaqin insonlarim bilan birga nishonlamoqchiman. Bazmimga keling — kechani birgalikda unutilmas qilamiz!'),
    release: 'Reliz sanasi',
    at: 'Boshlanishi',
    countdown: 'Bazmgacha qoldi',
    units: ['kun', 'soat', 'daqiqa', 'soniya'],
    live: 'Bugun!',
    tracklist: 'Treklar ro‘yxati',
    tracklistSub: 'Kecha dasturi',
    sideAShort: 'A',
    sideBShort: 'B',
    venue: 'Jonli ijroda',
    venueTitle: 'Manzil',
    google: 'Google Maps',
    yandex: 'Yandex xarita',
    dress: 'Kiyinish uslubi',
    bonus: 'Bonus trek',
    gift: 'Sovg‘a',
    copy: 'Nusxa olish',
    copied: 'Nusxa olindi ✓',
    guestList: 'Mehmonlar ro‘yxati',
    rsvpTitle: 'Ishtirokingizni tasdiqlang',
    pass: 'All access',
    passSub: 'Backstage · Mehmon',
    deadline: (dd, m) => `Javob muddati: ${dd}-${UZ_MONTHS_GEN[m - 1]}gacha`,
    yourName: 'Ismingiz',
    namePh: 'Ism Familiya',
    canCome: 'Kela olasizmi?',
    yes: 'Ha, albatta boraman!',
    no: 'Afsuski, kela olmayman',
    guests: 'Necha kishi bo‘lasiz?',
    person: 'kishi',
    wish: 'Tug‘ilgan kun egasiga tilak',
    wishPh: 'Bir-ikki iliq so‘z…',
    send: 'Ro‘yxatga yozilish',
    sending: 'Yuborilmoqda…',
    approved: 'Ro‘yxatda',
    declined: 'Afsus!',
    thanksYes: (x) => `${x}, siz mehmonlar ro‘yxatidasiz! Bazmda ko‘rishguncha 🎉`,
    thanksNo: (x) => `Rahmat, ${x}, xabar berganingiz uchun! Sizni sog‘inamiz.`,
    change: 'Javobni o‘zgartirish',
    closed: 'Javoblar qabul qilish muddati tugagan. Rahmat!',
    needName: 'Iltimos, ismingizni kiriting.',
    needAnswer: 'Iltimos, kela olishingizni belgilang.',
    error: 'Xatolik yuz berdi. Qayta urinib ko‘ring.',
    offline: 'Internet aloqasini tekshirib, qayta urinib ko‘ring.',
    preview: 'Ko‘rinish rejimi — javob yuborilmaydi.',
    wishes: 'Tilaklar',
    wishesSub: 'Shout-outs',
    contacts: 'Savollar bo‘lsa',
    call: 'Qo‘ng‘iroq qilish',
    rights: `℗ ${d.year} ${n} Records · Barcha huquqlar himoyalangan 😉`,
    cta: 'Taklifnomangizni buyurtma bering',
  };
}
