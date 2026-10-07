// "Klassik" matnlari — yigitning tug'ilgan kun bazmiga taklifnoma (yorug', sokin klassik uslubda).
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
export const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
export const RU_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/**
 * @param {object} c config
 * @param {{ name: string, age: number|null }} d
 * @param {'uz'|'ru'} lang (o'zbek kirili — uz matnidan o'giriladi)
 */
export function klassikTexts(c, d, lang = 'uz') {
  const age = d.age;
  const t = c.texts || {};
  if (lang === 'ru') {
    return {
      gateEyebrow: 'Приглашение',
      gateTitle: 'на день рождения',
      gateBtn: 'Открыть приглашение',
      heroEyebrow: 'Приглашение на день рождения',
      ageLine: age ? `${age} лет` : 'День рождения',
      musicOn: 'Включить музыку',
      musicOff: 'Пауза',
      inviteTitle: t.ruInviteTitle || 'Дорогой гость!',
      invitation:
        t.ruInvitation ||
        (age
          ? `Мне исполняется ${age}! Этот вечер я хочу провести в кругу самых близких и дорогих мне людей. Буду искренне рад видеть вас на моём празднике.`
          : 'Этот вечер я хочу провести в кругу самых близких и дорогих мне людей. Буду искренне рад видеть вас на моём празднике.'),
      when: 'Когда',
      at: 'Начало в',
      months: RU_MONTHS,
      weekShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
      countdown: 'До праздника осталось',
      units: ['дней', 'часов', 'минут', 'секунд'],
      live: 'Праздник уже сегодня!',
      program: 'Программа вечера',
      venue: 'Место проведения',
      google: 'Google Maps',
      yandex: 'Яндекс Карты',
      dress: 'Дресс-код',
      gift: 'Подарок',
      copy: 'Копировать',
      copied: 'Скопировано ✓',
      rsvpTitle: 'Подтвердите участие',
      rsvpSub: 'Пожалуйста, сообщите, сможете ли вы прийти',
      deadline: (dd, m) => `Ответ до ${dd} ${RU_MONTHS_GEN[m - 1]}`,
      yourName: 'Ваше имя',
      namePh: 'Имя Фамилия',
      canCome: 'Придёте?',
      yes: 'Да, с удовольствием',
      no: 'К сожалению, не смогу',
      guests: 'Сколько вас будет?',
      person: 'чел.',
      wish: 'Пожелание имениннику',
      wishPh: 'Пару тёплых слов…',
      send: 'Отправить ответ',
      sending: 'Отправка…',
      thanksYes: (x) => `Спасибо, ${x}! Буду рад видеть вас на празднике.`,
      thanksNo: (x) => `Спасибо, ${x}, что сообщили! Нам будет вас не хватать.`,
      change: 'Изменить ответ',
      closed: 'Приём ответов завершён. Спасибо!',
      needName: 'Пожалуйста, введите имя.',
      needAnswer: 'Отметьте, сможете ли прийти.',
      error: 'Ошибка. Попробуйте ещё раз.',
      offline: 'Проверьте интернет и попробуйте ещё раз.',
      preview: 'Режим просмотра — ответ не отправляется.',
      wishes: 'Пожелания гостей',
      contacts: 'Остались вопросы?',
      call: 'Позвонить',
      thanks: 'С уважением и любовью',
      cta: 'Закажите онлайн-приглашение',
    };
  }
  return {
    gateEyebrow: 'Taklifnoma',
    gateTitle: 'tug‘ilgan kun bazmiga',
    gateBtn: 'Taklifnomani ochish',
    heroEyebrow: 'Tug‘ilgan kun bazmiga taklifnoma',
    ageLine: age ? `${age} yosh` : 'Tug‘ilgan kun',
    musicOn: 'Musiqani yoqish',
    musicOff: 'To‘xtatish',
    inviteTitle: t.inviteTitle || 'Aziz mehmonim!',
    invitation:
      t.invitation ||
      (age
        ? `${age} yoshga to‘lyapman! Shu quvonchli kunni eng yaqin va qadrli insonlarim davrasida nishonlamoqchiman. Bazmimga tashrif buyurishingizdan chin dildan xursand bo‘laman.`
        : 'Shu quvonchli kunni eng yaqin va qadrli insonlarim davrasida nishonlamoqchiman. Bazmimga tashrif buyurishingizdan chin dildan xursand bo‘laman.'),
    when: 'Sana',
    at: 'Boshlanishi',
    months: UZ_MONTHS,
    weekShort: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
    countdown: 'Bazmgacha qoldi',
    units: ['kun', 'soat', 'daqiqa', 'soniya'],
    live: 'Bazm bugun!',
    program: 'Kecha dasturi',
    venue: 'Bazm manzili',
    google: 'Google Maps',
    yandex: 'Yandex xarita',
    dress: 'Kiyinish uslubi',
    gift: 'Sovg‘a',
    copy: 'Nusxa olish',
    copied: 'Nusxa olindi ✓',
    rsvpTitle: 'Ishtirokingizni tasdiqlang',
    rsvpSub: 'Iltimos, kela olishingizni bildiring',
    deadline: (dd, m) => `Javob muddati: ${dd}-${UZ_MONTHS_GEN[m - 1]}gacha`,
    yourName: 'Ismingiz',
    namePh: 'Ism Familiya',
    canCome: 'Kela olasizmi?',
    yes: 'Ha, albatta boraman',
    no: 'Afsuski, kela olmayman',
    guests: 'Necha kishi bo‘lasiz?',
    person: 'kishi',
    wish: 'Tug‘ilgan kun egasiga tilak',
    wishPh: 'Bir-ikki iliq so‘z…',
    send: 'Javobni yuborish',
    sending: 'Yuborilmoqda…',
    thanksYes: (x) => `Rahmat, ${x}! Sizni bazmda kutib qolaman.`,
    thanksNo: (x) => `Rahmat, ${x}, xabar berganingiz uchun! Sizni sog‘inamiz.`,
    change: 'Javobni o‘zgartirish',
    closed: 'Javoblar qabul qilish muddati tugagan. Rahmat!',
    needName: 'Iltimos, ismingizni kiriting.',
    needAnswer: 'Iltimos, kela olishingizni belgilang.',
    error: 'Xatolik yuz berdi. Qayta urinib ko‘ring.',
    offline: 'Internet aloqasini tekshirib, qayta urinib ko‘ring.',
    preview: 'Ko‘rinish rejimi — javob yuborilmaydi.',
    wishes: 'Mehmonlar tilaklari',
    contacts: 'Savollar bo‘lsa',
    call: 'Qo‘ng‘iroq qilish',
    thanks: 'Hurmat va ehtirom bilan',
    cta: 'Taklifnomangizni buyurtma bering',
  };
}
