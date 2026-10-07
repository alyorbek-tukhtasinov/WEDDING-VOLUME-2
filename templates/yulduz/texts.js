// "Yulduzlardan yaralgan" matnlari — yigitning sevgan qiziga tug'ilgan kun tabrigi ("sen" bilan).
// config.texts.<kalit> — istalgan matnni almashtiradi. Panel ham shu matnlarni namuna sifatida ko'rsatadi.
// DOM ishlatmang: fayl panelda ham, testlarda ham yuklanadi.

const num = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function yulduzTexts(c, d, f = null) {
  const n = d.name;
  const base = {
    gateNote: 'Bu sayt faqat bitta inson uchun yaratilgan.',
    gateAsk: `Sen — ${n}misan?`,
    gateYes: 'Ha, menman ✨',
    gateNo: 'Yo‘q',
    gateNoText: `Unda bu — sir 🤫 Faqat ${n}ga aytma…`,
    gateNoButton: 'Baribir ko‘raman 👀',
    intro: f ? `Bundan ${num(f.days)} kun oldin…` : 'Bir paytlar…',
    introText: '…koinotda kichik bir mo‘jiza ro‘y berdi.',
    moonText: f ? `O‘sha kechasi osmonda Oy ${f.moon.percent}% yoritilgan edi — ${f.moon.name.toLowerCase()}.` : '',
    galaxy: 'Koinot 13,8 milliard yil kutdi…',
    portrait: '…aynan seni yaratish uchun.',
    touchHint: 'Yulduzlarga barmog‘ing bilan tegin ✨',
    nameText: 'Sening isming — osmonga yozilgan',
    togetherLabel: 'Biz birgamiz',
    togetherText: 'kun — va har biri osmondagi bitta yulduz',
    memoriesTitle: 'Bizning yulduzli lahzalarimiz',
    wishesTitle: 'Yulduz uchganda tilak tilashadi…',
    wishesHint: 'Osmonga bos — har bir uchar yulduz senga bitta tilagimni olib keladi',
    wishesDone: 'Hammasi ushalsin, yulduzim ✨',
    letterTitle: 'Senga maktub',
    letter:
      'Bilasanmi, men har kecha osmonga qarab, eng yorug‘ yulduzni qidiraman. Keyin tushunaman: eng yorug‘ yulduz — sensan. Kulging hech qachon so‘nmasin, orzularing birin-ketin ushalsin. Sen borsan — mening osmonim yorug‘. Tug‘ilgan kuning muborak, jonim!',
    giftTitle: 'Senga kichik sovg‘a',
    giftText: 'Yulduzni sovg‘a qilib bo‘lmaydi — lekin men harakat qildim 🙂',
    giftButton: 'Ochish 🎁',
    rsvpTitle: 'Menga bir so‘z yoz 💌',
    rsvpText: 'Yozganing faqat menga yetib boradi — hech kim ko‘rmaydi.',
    replyDone: 'Rahmat, jonim! 💌 Maktubing yulduzlar orqali menga yetib keldi.',
    finale: 'Seni sevaman',
    finaleText: 'Tug‘ilgan kuning muborak, mening yulduzim!',
    finaleHint: 'Osmonga bos — yulduzlar portlaydi',
  };
  const out = { ...base };
  for (const [k, val] of Object.entries(c.texts || {})) if (typeof val === 'string' && val.trim()) out[k] = val.trim();
  return out;
}
