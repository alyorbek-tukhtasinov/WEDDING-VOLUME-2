// Marosim turlari: nikoh to'yi (kechki/kunduzgi), qiz uzatish, nahorgi osh, fotiha to'yi, kelin salom.
// Har bir tur: boshlanish vaqti, to'y dasturi va dress-kod shabloni, taklif matnlari (uz/ru) va
// shablonlarda ishlatiladigan qisqa iboralar ("To‘yimizgacha" → "Marosimgacha" va h.k.).
// config.eventType bilan tanlanadi; yozilmagan bo'lsa — nikoh to'yi (eski saytlar avvalgidek qoladi).
// Brauzerda ham, Node'da ham ishlaydi — DOM ishlatmang.

const NIKOH_UZ = {
  heroCaption: 'Nikoh to‘yiga taklifnoma',
  greeting: 'Hurmatli mehmonimiz!',
  invitation: (g, b) =>
    `Ikki qalbni bir taqdirga bog‘lagan Yaratganga hamdlar bo‘lsin! Farzandlarimiz ${g} va ${b}ning nikoh to‘yi — hayotimizdagi eng nurli kunlardan biri. Shu quvonchli kunda sizni davramizda ko‘rish va duolaringizni olish biz uchun katta baxt.`,
  closing: 'Tashrifingiz — to‘yimizning eng go‘zal bezagi!',
  badge: 'Nikoh to‘yi',
  noun: 'to‘y',
  until: 'To‘yimizgacha',
  untilLong: 'To‘ygacha qolgan vaqt',
  came: 'To‘y kuni keldi — biz bilan bo‘lganingiz uchun rahmat!',
  programTitle: 'To‘y dasturi',
  programLead: 'Kecha qanday o‘tadi',
  calTitle: (names) => `${names} — to‘y`,
  thanksAt: 'to‘yimizda',
};

const NIKOH_RU = {
  heroCaption: 'Приглашение на свадьбу',
  greeting: 'Дорогие гости!',
  invitation: (g, b) =>
    `С радостью сообщаем: наши дети ${g} и ${b} вступают в брак. Этот день — один из самых светлых в нашей жизни, и мы будем счастливы разделить его с вами.`,
  closing: 'Ваше присутствие — лучшее украшение нашего праздника!',
  badge: 'Свадьба',
  noun: 'свадьба',
  until: 'До свадьбы',
  untilLong: 'До свадьбы осталось',
  came: 'Этот день настал — спасибо, что вы с нами!',
  programTitle: 'Программа свадьбы',
  programLead: 'Как пройдёт вечер',
  calTitle: (names) => `${names} — свадьба`,
  thanksAt: 'на свадьбе',
};

export const EVENTS = [
  {
    id: 'nikoh',
    title: 'Nikoh to‘yi (kechki)',
    hint: 'To‘yxonada, odatda 17:00–19:00 da boshlanadi',
    icon: '💍',
    time: '18:00',
    durationHours: 5,
    program: 'kechki',
    dress: 'kechki',
    uz: NIKOH_UZ,
    ru: NIKOH_RU,
  },
  {
    id: 'nikoh-kunduzgi',
    title: 'Nikoh to‘yi (kunduzgi)',
    hint: 'Tushlik paytida, odatda 11:00–14:00 da',
    icon: '☀️',
    time: '12:00',
    durationHours: 4,
    program: 'kunduzgi',
    dress: 'bayramona',
    uz: { ...NIKOH_UZ, programLead: 'Kun qanday o‘tadi' },
    ru: { ...NIKOH_RU, programLead: 'Как пройдёт день' },
  },
  {
    id: 'qiz-uzatish',
    title: 'Qiz uzatish (kelin xonadonida)',
    hint: 'Kelin tomon to‘yi — kuyov kelib kelinni olib ketadi',
    icon: '🌸',
    time: '15:00',
    durationHours: 4,
    program: 'kelin-uyida',
    dress: 'bayramona',
    uz: {
      heroCaption: 'Qiz uzatish to‘yiga taklifnoma',
      greeting: 'Aziz mehmonimiz!',
      invitation: (g, b) =>
        `Qizimiz ${b}ni oq yo‘lga kuzatar ekanmiz, qalbimiz ham quvonch, ham hayajonga to‘la. ${g} bilan boshlanayotgan yangi hayotlari uchun duolaringizni olib, shu kunda yonimizda bo‘lishingizni chin dildan so‘raymiz.`,
      closing: 'Duolaringiz — qizimizga eng qimmatli sep!',
      badge: 'Qiz uzatish',
      noun: 'to‘y',
      until: 'To‘yimizgacha',
      untilLong: 'To‘ygacha qolgan vaqt',
      came: 'Qizimizni uzatish kuni keldi — yonimizda bo‘lganingiz uchun rahmat!',
      programTitle: 'To‘y dasturi',
      programLead: 'Kun qanday o‘tadi',
      calTitle: (names) => `${names} — qiz uzatish`,
      thanksAt: 'to‘yimizda',
    },
    ru: {
      heroCaption: 'Приглашение на проводы невесты',
      greeting: 'Дорогие гости!',
      invitation: (g, b) =>
        `Мы провожаем нашу дочь ${b} в новую жизнь рядом с ${g}. В этот трогательный день нам очень важно, чтобы рядом были родные и близкие — с добрыми словами и благословением.`,
      closing: 'Ваше благословение — лучшее приданое для нашей дочери!',
      badge: 'Проводы невесты',
      noun: 'праздник',
      until: 'До праздника',
      untilLong: 'До праздника осталось',
      came: 'Этот день настал — спасибо, что вы рядом!',
      programTitle: 'Программа праздника',
      programLead: 'Как пройдёт день',
      calTitle: (names) => `${names} — проводы невесты`,
      thanksAt: 'на празднике',
    },
  },
  {
    id: 'nahorgi-osh',
    title: 'Nahorgi osh',
    hint: 'Erta tongda, odatda 05:30–07:00',
    icon: '🍚',
    time: '06:00',
    durationHours: 2,
    program: 'nahorgi-osh',
    dress: 'qulay',
    uz: {
      heroCaption: 'Nahorgi oshga taklifnoma',
      greeting: 'Assalomu alaykum, aziz mehmonimiz!',
      invitation: (g, b) =>
        `Tong saharda damlangan osh — xonadonimiz quvonchining ilk dasturxoni. Farzandlarimiz ${g} va ${b}ning to‘ylari munosabati bilan beriladigan nahorgi oshga sizni chin dildan taklif etamiz. Kelib, duo qilib, oshimizdan tatib keting.`,
      closing: 'Tashrifingiz — dasturxonimizga baraka!',
      badge: 'Nahorgi osh',
      noun: 'osh',
      until: 'Nahorgi oshgacha',
      untilLong: 'Nahorgi oshgacha qolgan vaqt',
      came: 'Osh tayyor — tashrifingiz uchun rahmat!',
      programTitle: 'Osh tartibi',
      programLead: 'Tong qanday o‘tadi',
      calTitle: (names) => `${names} — nahorgi osh`,
      thanksAt: 'oshimizda',
    },
    ru: {
      heroCaption: 'Приглашение на утренний плов',
      greeting: 'Дорогие гости!',
      invitation: (g, b) =>
        `На рассвете в нашем доме будет готов праздничный плов — в честь свадьбы ${g} и ${b}. Приглашаем вас разделить с нами утреннее угощение и благословить молодых.`,
      closing: 'Ваш приход — благословение нашему дастархану!',
      badge: 'Утренний плов',
      noun: 'плов',
      until: 'До утреннего плова',
      untilLong: 'До утреннего плова осталось',
      came: 'Плов готов — спасибо, что пришли!',
      programTitle: 'Порядок утра',
      programLead: 'Как пройдёт утро',
      calTitle: (names) => `${names} — утренний плов`,
      thanksAt: 'на утреннем плове',
    },
  },
  {
    id: 'fotiha',
    title: 'Fotiha to‘yi',
    hint: 'Unashtiruv — ikki xonadonning oq fotihasi',
    icon: '🤲',
    time: '17:00',
    durationHours: 4,
    program: 'fotiha',
    dress: 'bayramona',
    uz: {
      heroCaption: 'Fotiha to‘yiga taklifnoma',
      greeting: 'Hurmatli mehmonimiz!',
      invitation: (g, b) =>
        `Ikki xonadonni yaqinlashtirgan, ikki yoshning baxtiga poydevor bo‘ladigan muborak kun yetib keldi. ${g} va ${b}ning fotiha to‘yida duo va oq fotihangiz bilan bizga hamroh bo‘lishingizni so‘raymiz.`,
      closing: 'Oq fotihangiz — ularning baxtiga kalit!',
      badge: 'Fotiha to‘yi',
      noun: 'fotiha to‘yi',
      until: 'Fotiha to‘yigacha',
      untilLong: 'Fotiha to‘yigacha qolgan vaqt',
      came: 'Muborak kun keldi — duolaringiz uchun rahmat!',
      programTitle: 'Marosim dasturi',
      programLead: 'Kecha qanday o‘tadi',
      calTitle: (names) => `${names} — fotiha to‘yi`,
      thanksAt: 'fotiha to‘yida',
    },
    ru: {
      heroCaption: 'Приглашение на фотиха-той',
      greeting: 'Дорогие гости!',
      invitation: (g, b) =>
        `Настал благословенный день, который сближает две семьи. Просим вас разделить с нами фотиха-той ${g} и ${b} и благословить их будущее.`,
      closing: 'Ваше благословение — ключ к их счастью!',
      badge: 'Фотиха-той',
      noun: 'фотиха-той',
      until: 'До фотиха-тоя',
      untilLong: 'До фотиха-тоя осталось',
      came: 'Благословенный день настал — спасибо за ваши молитвы!',
      programTitle: 'Программа',
      programLead: 'Как пройдёт вечер',
      calTitle: (names) => `${names} — фотиха-той`,
      thanksAt: 'на фотиха-тое',
    },
  },
  {
    id: 'kelin-salom',
    title: 'Kelin salom',
    hint: 'Kelin qarindoshlarga salom beradigan iliq marosim',
    icon: '🌷',
    time: '16:00',
    durationHours: 3,
    program: 'kelin-salom',
    dress: 'bayramona',
    uz: {
      heroCaption: 'Kelin salomga taklifnoma',
      greeting: 'Aziz mehmonimiz!',
      invitation: (g, b) =>
        `Xonadonimizga nur bo‘lib kirgan kelinimiz ${b} endi sizga salom berishga shay. Uning ilk ta’zimini qabul qilib, ${g} va ${b}ning yangi oilasiga baraka tilashingizni istaymiz. Shu iliq marosimda bizga hamroh bo‘ling.`,
      closing: 'Duolaringiz — kelinimiz uchun eng aziz sovg‘a!',
      badge: 'Kelin salom',
      noun: 'marosim',
      until: 'Marosimgacha',
      untilLong: 'Marosimgacha qolgan vaqt',
      came: 'Marosim kuni keldi — biz bilan bo‘lganingiz uchun rahmat!',
      programTitle: 'Marosim dasturi',
      programLead: 'Marosim qanday o‘tadi',
      calTitle: (names) => `${names} — kelin salom`,
      thanksAt: 'marosimimizda',
    },
    ru: {
      heroCaption: 'Приглашение на «Келин салом»',
      greeting: 'Дорогие гости!',
      invitation: (g, b) =>
        `Наша невестка ${b} готова поприветствовать вас по доброй традиции «Келин салом». Приходите принять её первый поклон и пожелать семье ${g} и ${b} счастья и благополучия.`,
      closing: 'Ваши пожелания — самый дорогой подарок для нашей невестки!',
      badge: 'Келин салом',
      noun: 'церемония',
      until: 'До церемонии',
      untilLong: 'До церемонии осталось',
      came: 'Этот день настал — спасибо, что вы с нами!',
      programTitle: 'Программа',
      programLead: 'Как пройдёт церемония',
      calTitle: (names) => `${names} — келин салом`,
      thanksAt: 'на церемонии',
    },
  },
];

// Taklif kimning nomidan (config.invitedBy): 'parents' — ota-ona ("farzandlarimiz…"), 'couple' — kelin-kuyov
// ("biz, … va …"). Yozilmagan bo'lsa — shablonning asl matnlari (eski saytlar o'zgarmaydi).
// Bu yerda faqat kelin-kuyov tilidagi farqli iboralar; qolganlari marosimning o'z matnlaridan olinadi.
const NIKOH_COUPLE = {
  uz: {
    invitation: (g, b) =>
      `Ikki qalbni bir taqdirga bog‘lagan Yaratganga hamdlar bo‘lsin! Biz — ${g} va ${b} — hayotimizdagi eng nurli kunda, nikoh to‘yimizda sizni davramizda ko‘rishni chin dildan istaymiz. Duolaringiz va tabassumingiz bu kunni yanada go‘zal qiladi.`,
  },
  ru: {
    invitation: (g, b) =>
      `Мы, ${g} и ${b}, с радостью приглашаем вас на нашу свадьбу. Этот день — один из самых светлых в нашей жизни, и мы будем счастливы разделить его с вами.`,
  },
};
export const INVITED_BY = ['parents', 'couple'];
const COUPLE = {
  nikoh: NIKOH_COUPLE,
  'nikoh-kunduzgi': NIKOH_COUPLE,
  'qiz-uzatish': {
    uz: {
      invitation: (g, b) =>
        `Hayotimizda yangi sahifa ochilmoqda. Biz — ${g} va ${b} — birgalikdagi yo‘limizning ilk qadamini qo‘yayotgan shu hayajonli kunda duolaringiz bilan yonimizda bo‘lishingizni chin dildan so‘raymiz.`,
      closing: 'Duolaringiz — yangi hayotimizga eng qimmatli tuhfa!',
      came: 'Muborak kun keldi — yonimizda bo‘lganingiz uchun rahmat!',
    },
    ru: {
      invitation: (g, b) =>
        `Мы, ${g} и ${b}, делаем первый шаг в новую жизнь. Будем счастливы, если в этот трогательный день вы будете рядом — с добрыми словами и благословением.`,
      closing: 'Ваше благословение — лучший подарок нашей новой семье!',
    },
  },
  'nahorgi-osh': {
    uz: {
      invitation: (g, b) =>
        `Tong saharda damlangan osh — to‘yimizning ilk dasturxoni. Biz, ${g} va ${b}, to‘yimiz munosabati bilan beriladigan nahorgi oshga sizni chin dildan taklif etamiz. Kelib, duo qilib, oshimizdan tatib keting.`,
    },
    ru: {
      invitation: (g, b) =>
        `На рассвете будет готов праздничный плов в честь нашей свадьбы. Мы, ${g} и ${b}, приглашаем вас разделить с нами утреннее угощение и благословить нас.`,
    },
  },
  fotiha: {
    uz: {
      invitation: (g, b) =>
        `Hayotimizdagi muborak kun yetib keldi. Biz — ${g} va ${b} — fotiha to‘yimizda duo va oq fotihangiz bilan yonimizda bo‘lishingizni so‘raymiz.`,
      closing: 'Oq fotihangiz — baxtimizga kalit!',
    },
    ru: {
      invitation: (g, b) =>
        `Настал благословенный для нас день. Мы, ${g} и ${b}, просим вас разделить с нами фотиха-той и благословить наше будущее.`,
      closing: 'Ваше благословение — ключ к нашему счастью!',
    },
  },
  'kelin-salom': {
    uz: {
      invitation: (g, b) =>
        `Yangi oilamizning ilk iliq marosimi — kelin salom. Biz, ${g} va ${b}, shu kunda sizni davramizda ko‘rishni, salomimizni qabul qilib, oilamizga baraka tilashingizni istaymiz.`,
      closing: 'Duolaringiz — oilamiz uchun eng aziz sovg‘a!',
    },
    ru: {
      invitation: (g, b) =>
        `Мы, ${g} и ${b}, приглашаем вас на «Келин салом» — первую тёплую церемонию нашей молодой семьи. Примите наш поклон и пожелайте нам счастья.`,
      closing: 'Ваши пожелания — самый дорогой подарок нашей семье!',
    },
  },
};

/** 'couple' | 'parents' | null (yozilmagan — shablonning asl matni). */
export const voiceOf = (c) => (INVITED_BY.includes(c?.invitedBy) ? c.invitedBy : null);
const coupleOver = (id, lang) => COUPLE[id]?.[lang === 'ru' ? 'ru' : 'uz'] || {};
/** Marosim matnlari shu tilda va ovozda (kelin-kuyov — farqli iboralar ustiga yoziladi). */
function textsOf(e, lang, voice) {
  const t = lang === 'ru' ? e.ru : e.uz;
  return voice === 'couple' ? { ...t, ...coupleOver(e.id, lang) } : t;
}

/** Saytning marosim + ovoz bo'yicha matnlari (heroCaption, invitation(g,b), closing, …). */
export const voiceTexts = (c, lang = 'uz') => textsOf(findEvent(c?.eventType), lang, voiceOf(c));

export const DEFAULT_EVENT = 'nikoh';
export const EVENT_IDS = EVENTS.map((e) => e.id);
export const findEvent = (id) => EVENTS.find((e) => e.id === id) || EVENTS[0];
export const eventOf = (c) => findEvent(c?.eventType);

/** Taklif matnlari (config.texts uchun): heroCaption, greeting, invitation, closing. */
export function eventTexts(eventId, groom, bride, lang = 'uz', voice = 'parents') {
  const e = findEvent(eventId);
  const t = textsOf(e, lang, voice);
  return {
    heroCaption: t.heroCaption,
    greeting: t.greeting,
    invitation: t.invitation(groom?.trim() || 'Kuyov', bride?.trim() || 'Kelin'),
    closing: t.closing,
  };
}

/** Nikoh to'yi (yoki marosim turi yozilmagan eski sayt)? */
export const isNikoh = (c) => !c?.eventType || c.eventType === 'nikoh' || c.eventType === 'nikoh-kunduzgi';

/**
 * Shablonlardagi iboralar uchun: nikoh to'yida shablonning asl matni (eski saytlar o'zgarmaydi),
 * boshqa marosimda — shu marosimning iborasi.
 *   const ph = phrases(c);  ph('until', 'To‘yimizgacha')  ph('calTitle', `${names} — to‘y`, names)
 */
export function phrases(c, lang = 'uz') {
  const nikoh = isNikoh(c);
  const e = eventOf(c);
  const voice = voiceOf(c);
  const t = textsOf(e, lang, voice);
  const over = voice === 'couple' ? coupleOver(e.id, lang) : {};
  return (key, original, ...args) => {
    // Nikoh to'yida asl matn; faqat "kelin-kuyov nomidan" tanlansa — shu iboralar almashadi
    if (nikoh && !(key in over)) return original;
    const v = t[key];
    return typeof v === 'function' ? v(...args) : v ?? original;
  };
}

/**
 * Shablon interfeys matnlariga (T) marosim turini qo'llash. map — { kalit: (iboralar, asl qiymat) => yangi qiymat }.
 * Nikoh to'yida T o'zgarmaydi. lang: 'uz' | 'uzc' | 'ru' (kirill — o'zbekcha iboralardan o'giriladi, cyr bilan).
 */
export function applyEvent(T, c, lang, map, cyr = (x) => x) {
  const nikoh = isNikoh(c);
  const voice = voiceOf(c);
  if (nikoh && voice !== 'couple') return T;
  const e = eventOf(c);
  const base = textsOf(e, lang === 'ru' ? 'ru' : 'uz', voice);
  const p = lang === 'uzc' ? cyr(base) : base;
  // Nikoh to'yi + kelin-kuyov nomidan: faqat taklif matni almashadi, qolgani shablonniki
  const keys = nikoh ? Object.keys(map).filter((k) => k in coupleOver(e.id, lang)) : Object.keys(map);
  const out = { ...T };
  for (const k of keys) {
    if (k in T) out[k] = map[k](p, T[k]);
  }
  return out;
}
