import React, { createContext, useContext, useMemo, useState } from 'react';
import { wedding } from '../wedding';

export type Lang = 'uz' | 'ru';

// Asl shablon matnlari. Ismlar, sana, manzil va karta egasi — mijoz config'idan (buildTranslations).
const base = {
  uz: {
    langOther: 'RU',
    heroBride: '',
    heroGroom: '',
    heroAnd: '&',
    heroSubtitle: "To'yimizga taklif etamiz",
    heroDate: '',
    scrollHint: "Pastga suring",

    envelopeInvite: "Taklifnoma",
    envelopeHint: "Ochish uchun suring",

    invTitle: "Hurmatli va aziz mehmon!",
    invText: "Sizni hayotimizdagi eng quvonchli ayyom — nikoh to'yimizga lutfan taklif etamiz. Ushbu baxtli va unutilmas kunimizda sizdek aziz insonlarni yonimizda ko'rish biz uchun ulkan baxt. Tashrifingiz bilan davramizga fayz, quvonchimizga quvonch qo'shasiz degan umiddamiz.",
    invClosing: "",

    detailsTitle: "To'y tafsilotlari",
    detailsDateLabel: "Sana",
    detailsDateVal: "",
    detailsTimeLabel: "Vaqt",
    detailsTimeVal: "",
    detailsVenueLabel: "Manzil",
    detailsVenueVal: "",
    detailsAddress: "",

    countdownTitle: "To'yga qadar",
    countdownDays: "Kun",
    countdownHours: "Soat",
    countdownMins: "Daqiqa",
    countdownSecs: "Soniya",

    mapTitle: "Manzil",
    mapVenue: "",
    mapAddress: "",
    mapOpen: "Xaritada ko'rish",
    mapOpenYandex: "Yandex xarita",

    giftTitle: "Sovg'a",
    giftSubtitle: "Muborakbod uchun",
    giftCardLabel: "Karta raqami",
    giftHolder: "",
    giftBank: "",
    giftCopy: "Nusxa olish",
    giftCopied: "Nusxalandi ✓",
    giftNote: "Tabrikingiz uchun raxmat!",
    giftBack: "Muborak bo'lsin!",
    giftRsvp: "Kelaman ♡",
    giftRsvpToast: "Rahmat! Sizni kutamiz ♡",
    rsvpTitle: "Sizni kutamiz",
    rsvpSubtitle: "Tashrifingizni tasdiqlang",
    rsvpName: "Ismingiz",
    rsvpNameError: "Iltimos, ismingizni yozing",
    rsvpGuests: "Necha kishi bo‘lasiz?",
    rsvpDecline: "Afsuski, kela olmayman",
    rsvpDeclineToast: "Xabar berganingiz uchun rahmat ♡",
    rsvpDone: "Javobingiz qabul qilindi ♡",
    rsvpDoneNo: "Javobingiz uchun rahmat",
    rsvpChange: "Javobni o‘zgartirish",
    rsvpError: "Yuborilmadi. Internetni tekshirib, qayta urinib ko‘ring",

    addToCalendar: "Kalendarga qo'shish",

    navHero: "Bosh sahifa",
    navInvitation: "Taklifnoma",
    navDetails: "Tafsilotlar",
    navCountdown: "Sanoq",
    navMap: "Manzil",
    navGift: "Sovg'a",

    musicPlaying: "Musiqa ijro etilmoqda",
    musicTap: "Musiqani yoqish uchun bosing",
  },
  ru: {
    langOther: 'UZ',
    heroBride: '',
    heroGroom: '',
    heroAnd: '&',
    heroSubtitle: "Приглашаем вас на нашу свадьбу",
    heroDate: '',
    scrollHint: "Листайте вниз",

    envelopeInvite: "Приглашение",
    envelopeHint: "Проведите, чтобы открыть",

    invTitle: "Уважаемый и дорогой гость!",
    invText: "От всей души приглашаем вас на самое радостное событие в нашей жизни — нашу свадьбу. Для нас огромное счастье видеть таких дорогих сердцу людей рядом в этот незабываемый день. Надеемся, что своим присутствием вы украсите наш праздник и разделите нашу радость.",
    invClosing: "",

    detailsTitle: "Детали торжества",
    detailsDateLabel: "Дата",
    detailsDateVal: "",
    detailsTimeLabel: "Время",
    detailsTimeVal: "",
    detailsVenueLabel: "Место",
    detailsVenueVal: "",
    detailsAddress: "",

    countdownTitle: "До свадьбы",
    countdownDays: "Дней",
    countdownHours: "Часов",
    countdownMins: "Минут",
    countdownSecs: "Секунд",

    mapTitle: "Место проведения",
    mapVenue: "",
    mapAddress: "",
    mapOpen: "Google Maps",
    mapOpenYandex: "Яндекс Карты",

    giftTitle: "Подарок",
    giftSubtitle: "Для поздравления",
    giftCardLabel: "Номер карты",
    giftHolder: "",
    giftBank: "",
    giftCopy: "Скопировать",
    giftCopied: "Скопировано ✓",
    giftNote: "Благодарим за поздравление!",
    giftBack: "Поздравляем!",
    giftRsvp: "Я приду ♡",
    giftRsvpToast: "Спасибо! Ждём вас ♡",
    rsvpTitle: "Ждём вас",
    rsvpSubtitle: "Подтвердите своё присутствие",
    rsvpName: "Ваше имя",
    rsvpNameError: "Пожалуйста, укажите имя",
    rsvpGuests: "Сколько вас будет?",
    rsvpDecline: "К сожалению, не смогу прийти",
    rsvpDeclineToast: "Спасибо, что сообщили ♡",
    rsvpDone: "Ваш ответ получен ♡",
    rsvpDoneNo: "Спасибо за ответ",
    rsvpChange: "Изменить ответ",
    rsvpError: "Не отправилось. Проверьте интернет и попробуйте ещё раз",

    addToCalendar: "Добавить в календарь",

    navHero: "Главная",
    navInvitation: "Приглашение",
    navDetails: "Детали",
    navCountdown: "Отсчёт",
    navMap: "Место",
    navGift: "Подарок",

    musicPlaying: "Музыка играет",
    musicTap: "Нажмите для воспроизведения",
  },
};

export type T = typeof base['uz'];

/** Mijoz ma'lumotlari bilan to'ldirilgan lug'at; config.texts.uz / texts.ru istalgan matnni almashtiradi. */
export function buildTranslations(): Record<Lang, T> {
  const w = wedding();
  const uz: T = {
    ...base.uz,
    heroGroom: w.groom,
    heroBride: w.bride,
    heroDate: w.dateUz,
    invClosing: `${w.groom} & ${w.bride}`,
    detailsDateVal: w.dateUz,
    detailsTimeVal: w.time,
    detailsVenueVal: w.venueName,
    detailsAddress: w.address,
    mapVenue: w.venueName,
    mapAddress: w.address,
    giftHolder: w.giftCard?.holder || '',
    giftBank: w.giftCard?.bank || '',
  };
  const ru: T = {
    ...base.ru,
    heroGroom: w.groomRu,
    heroBride: w.brideRu,
    heroDate: w.dateRu,
    invClosing: `${w.groomRu} & ${w.brideRu}`,
    detailsDateVal: w.dateRu,
    detailsTimeVal: w.time,
    detailsVenueVal: w.venueNameRu,
    detailsAddress: w.addressRu,
    mapVenue: w.venueNameRu,
    mapAddress: w.addressRu,
    giftHolder: w.giftCard?.holderRu || '',
    giftBank: w.giftCard?.bank || '',
  };
  const pick = (over: Record<string, string>) =>
    Object.fromEntries(Object.entries(over).filter(([k, v]) => k in base.uz && typeof v === 'string' && v.trim()));
  return { uz: { ...uz, ...pick(w.texts.uz) }, ru: { ...ru, ...pick(w.texts.ru) } };
}

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'uz',
  setLang: () => {},
  t: base.uz,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('uz');
  const translations = useMemo(buildTranslations, []);
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};