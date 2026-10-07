// "Sevgi kundaligi" matnlari — yigitning sevgan qiziga tug'ilgan kun tabrigi ("sen" bilan).
// config.texts.<kalit> — istalgan matnni almashtiradi. Panel ham shu matnlarni namuna sifatida ko'rsatadi.
// DOM ishlatmang: fayl panelda ham, testlarda ham yuklanadi.

export function sevgiTexts(c, d) {
  const base = {
    badge: d.age ? `${d.age} bahorni qarshi olgan farishtam` : 'Mening farishtam',
    coverText: 'Dunyoga kelgan kuning muborak bo‘lsin, ko‘zimning nuri, qalbimning quyoshi.',
    firstTitle: 'Bizning taqdir yo‘limiz boshlangan lahza',
    firstText:
      'O‘sha birinchi uchrashuv hamon ko‘z oldimda. Ilk kulishingdan vaqt to‘xtab, olam sukunatga cho‘mgandi. Oddiygina tabassuming butun hayotimni o‘zgartirib yuborishini o‘shanda qalbim his qilgandi.',
    firstSign: 'Va o‘sha kundan boshlab… hayotim faqat sen bilan go‘zal.',
    funnyTitle: 'Baxtdan sarmast lahzalarimiz',
    funnyText:
      'Kulganingda burningning o‘sha birgina jiyirilishi — men uchun dunyodagi eng go‘zal manzara. Atrofdagilarning ajablangan nigohlariga qaramay, baxtdan beg‘ubor kulgan onlarimiz abadiyatga muhrlangan.',
    funnySign: 'Sen bilan har lahza — bayram',
    gratitudeTitle: 'Hayotimni quvonchga to‘ldirganing uchun rahmat',
    gratitudeText:
      'Chaqirimlar qanchalik uzoq bo‘lmasin, sen hamisha yuragimning tubida, eng yaqinimdasan. Sehrli ovozing eng og‘ir damlarda qalbimga orom berib, yashashga kuch bag‘ishlaydi.',
    gratitudeSign: 'Qayerda bo‘lmay, har nafasimda yoningdaman',
    journeyTitle: 'Bizning yo‘limiz',
    journeySubtitle: 'Har bir qadam — bitta xotira',
    togetherLabel: 'Biz birgamiz',
    wishesTitle: 'Bugun senga tilayman…',
    giftTitle: 'Sovg‘ang tayyor 🎁',
    giftText: 'Uzoqda bo‘lsam ham, senga kichik bir sovg‘a tayyorladim.',
    giftButton: 'Ochish 🎁',
    rsvpTitle: 'Menga bir so‘z yoz 💌',
    rsvpText: 'Yozganing faqat menga yetib boradi — hech kim ko‘rmaydi.',
    replyDone: 'Rahmat, jonim! 💌 Maktubing menga yetib keldi.',
    finaleTitle: 'Seni sevaman',
    finaleText: 'Tug‘ilgan kuning muborak, jonim!',
  };
  const out = { ...base };
  for (const [k, val] of Object.entries(c.texts || {})) if (typeof val === 'string' && val.trim()) out[k] = val.trim();
  return out;
}
