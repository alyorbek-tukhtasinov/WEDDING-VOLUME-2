// "Sehrli tort" matnlari. Asosiy holat — yigit sevgan qiziga yuboradigan romantik tabrik ("sen" bilan).
// config.voice: 'siz' — hurmat bilan; config.venue bo'lsa — bazmga taklif rejimi.
// config.texts.<kalit> — istalgan matnni almashtiradi. Panel ham shu matnlarni namuna sifatida ko'rsatadi.
// DOM ishlatmang: fayl panelda ham, testlarda ham yuklanadi.

export const senOf = (c) => c?.voice !== 'siz';

export function tortTexts(c, d) {
  const sen = senOf(c);
  const v = (a, b) => (sen ? a : b);
  const n = d.name;
  const party = d.party;
  const ageText = d.age ? `${d.age} yoshga to‘lishi` : 'tug‘ilgan kuni';
  const base = {
    gateEyebrow: 'Pss… bugun alohida kun 🤫',
    gateTitle: party ? `${n}ning tug‘ilgan kuni` : `${n} uchun`,
    gateText: party ? 'Chiroqlarni o‘chirdik. Shamlarni yoqish — sizga qoldi.' : v('Chiroqlarni o‘chirdim. Shamlarni yoqish — senga qoldi.', 'Chiroqlarni o‘chirdim. Shamlarni yoqish — sizga qoldi.'),
    gateButton: 'Shamlarni yoqish',
    heroEyebrow: party ? 'Tug‘ilgan kun bazmiga taklifnoma' : v('Bugun — sening kuning', 'Bugun — sizning kuningiz'),
    heroCaption: party ? 'Tug‘ilgan kun muborak!' : v('Tug‘ilgan kuning muborak!', 'Tug‘ilgan kuningiz muborak!'),
    blowHint: party ? `${n} uchun tilak tilang — va shamlarni puflang!` : v('Ko‘zingni yum, tilak tila — va shamlarni puflab o‘chir!', 'Ko‘zingizni yuming, tilak tilang — va shamlarni puflang!'),
    blowButton: v('Bosib tur — pufla', 'Bosib turing — puflang'),
    blown: party ? 'Tilaklar albatta ushalsin! ✨' : v('Tilaging albatta ushalsin! ✨', 'Tilagingiz albatta ushalsin! ✨'),
    statsEyebrow: 'Hayot — raqamlarda',
    togetherLabel: 'Biz birgamiz',
    togetherText: 'kundan beri — va har biri sen bilan go‘zal',
    letterEyebrow: party ? 'Taklifnoma' : 'Maktub',
    letterTitle: party ? 'Aziz mehmonimiz!' : v(`Azizim ${n}!`, `Aziz ${n}!`),
    letter: party
      ? `Sizni ${n}ning ${ageText} munosabati bilan o‘tkaziladigan bayram bazmiga taklif etamiz. Shu quvonchli kunni biz bilan birga nishonlang!`
      : v(
          'Bugun — sen dunyoga kelgan kun. O‘sha kuni dunyo biroz yorug‘roq bo‘lgan, chunki unga sen kelgansan. Tabassuming hech qachon so‘nmasin, orzularing birin-ketin ushalsin. Sen mening hayotimdagi eng chiroyli voqeasan — sen borsan, men baxtliman. Tug‘ilgan kuning muborak, jonim!',
          'Bugun — siz dunyoga kelgan kun. O‘sha kuni dunyo biroz yorug‘roq bo‘lgan, chunki unga siz kelgansiz. Tabassumingiz hech qachon so‘nmasin, orzularingiz birin-ketin ushalsin. Siz mening hayotimdagi eng chiroyli voqeasiz. Tug‘ilgan kuningiz muborak!',
        ),
    memoriesEyebrow: party ? 'Xotiralar' : 'Bizning xotiralar',
    memoriesTitle: party ? 'Esdalik suratlar' : 'Birga o‘tgan lahzalar',
    memoriesHint: 'Suratni bosing — kattaroq ko‘rinadi',
    wishesEyebrow: 'Tilaklar',
    wishesTitle: party ? `${n}ga tilaklarimiz` : v('Senga tilaklarim', 'Sizga tilaklarim'),
    wishesHint: party ? 'Sharlarni bosing — har birining ichida bitta tilak 🎈' : v('Sharlarni bosib yor — har birida senga bitta tilagim bor 🎈', 'Sharlarni bosing — har birida sizga bitta tilagim bor 🎈'),
    giftEyebrow: 'Sovg‘a',
    giftTitle: party ? 'Sovg‘a haqida' : v('Senga kichik sovg‘a', 'Sizga kichik sovg‘a'),
    giftHint: v('Qutini bos', 'Qutini bosing'),
    partyEyebrow: 'Bazm',
    partyTitle: 'Qachon va qayerda?',
    countdownTitle: 'Bazmgacha qoldi',
    rsvpEyebrow: party ? 'Javob' : 'Javob maktubi',
    rsvpTitle: party ? 'Kela olasizmi?' : v('Menga bir so‘z yoz 💌', 'Menga bir so‘z yozing 💌'),
    rsvpText: party ? 'Iltimos, javobingizni bildiring — tayyorgarlik uchun juda muhim.' : v('Yozganing faqat menga yetib boradi — hech kim ko‘rmaydi.', 'Yozganingiz faqat menga yetib boradi — hech kim ko‘rmaydi.'),
    replyButton: '💌 Yuborish',
    replyDone: v('Rahmat, jonim! 💌 Maktubing menga yetib keldi.', 'Rahmat! 💌 Maktubingiz menga yetib keldi.'),
    skyEyebrow: 'Mehmonlar',
    skyTitle: 'Tilaklar osmoni',
    skyHint: 'Sharni bosing — tilakni o‘qing',
    finaleTitle: party ? 'Sizni intizorlik bilan kutamiz!' : v('Tug‘ilgan kuning muborak, jonim!', 'Tug‘ilgan kuningiz muborak!'),
    finaleText: party ? '' : v('Seni sevaman ❤', ''),
    finaleHint: v('Osmonga bos — salyut! 🎆', 'Osmonga bosing — salyut! 🎆'),
  };
  const out = { ...base };
  for (const [k, val] of Object.entries(c.texts || {})) if (typeof val === 'string' && val.trim()) out[k] = val.trim();
  return out;
}

/** Panel uchun: tayyor romantik tilaklar. */
export const ROMANTIC_WISHES = [
  'Yuzingdan tabassum hech qachon arimasin',
  'Yuragingdagi eng shirin orzularing hammasi ushalsin',
  'Sog‘liging mustahkam, ko‘ngling doim tinch bo‘lsin',
  'Yoningda bo‘lmasam ham, sevgim seni doim o‘rab tursin',
  'Bu yil hayotingdagi eng baxtli yil bo‘lsin',
];
