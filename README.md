# Onlayn to'y taklifnomasi

Bitta shablon asosida har bir mijoz uchun alohida sayt yaratib, **Vercel**'ga
alohida deploy qilinadigan to'y taklifnomasi.

**Imkoniyatlar:**
- ochiladigan konvert, muhrda kelin-kuyovning bosh harflari;
- animatsiyali bosh sahifa;
- taklif matni;
- taqvim va to'ygacha qolgan vaqt hisoblagichi;
- manzil va xarita tugmalari;
- to'y dasturi, dress-kod va galereya;
- fon musiqasi;
- RSVP: mehmonlar javobi to'g'ridan-to'g'ri **Telegram**'ga keladi;
- "Taqvimga qo'shish" tugmasi;
- Telegram va Instagram'da havola chiroyli ko'rinishi uchun OG teglar.

Sahifa juda yengil: JS ~22 KB, CSS ~18 KB. Telefon uchun moslangan.

---

## Tuzilma

```
clients/
  demo/                 ← namunaviy mijoz
    config.js           ← BARCHA ma'lumotlar shu yerda
    media/              ← shu mijozning rasmlari, musiqasi
  jasur-madina/         ← har bir yangi mijoz uchun alohida papka
    config.js
    media/
brand.config.js         ← sizning brendingiz (sayt pastidagi havola)
public/images/          ← dizayn rasmlari (barcha mijozlar uchun umumiy)
api/rsvp.js             ← RSVP javoblarini Telegram'ga yuboruvchi funksiya
src/                    ← sahifa kodi
```

Qaysi mijoz yig'ilishini **`WEDDING`** muhit o'zgaruvchisi belgilaydi. Masalan,
`WEDDING=jasur-madina` bo'lsa `clients/jasur-madina/` ishlatiladi.

Bitta repozitoriy va ko'p Vercel loyihasi bo'ladi. Shablonni yaxshilasangiz,
barcha mijozlar saytlari keyingi deploy'da yangilanadi.

---

## Kompyuterda ishga tushirish

Node.js 20.19 yoki undan yangi versiya kerak.

```bash
npm install
npm run dev              # http://localhost:5173 — demo mijoz
```

Boshqa mijozni ko'rish uchun loyiha papkasida `.env` fayl yarating
(`.env.example` dan nusxa oling) va ichiga yozing:

```
WEDDING=jasur-madina
```

Windows PowerShell'da buni to'g'ridan-to'g'ri ham berish mumkin:
`$env:WEDDING="jasur-madina"; npm run dev`

---

## Yangi mijoz qo'shish (5 daqiqa)

1. **Papka yarating:**
   ```bash
   npm run new -- jasur-madina
   ```
   Nom faqat kichik lotin harflari, raqam va `-` dan iborat bo'lishi kerak.

2. **`clients/jasur-madina/config.js` ni to'ldiring:**
   - ismlar, sana, vaqt;
   - to'yxona nomi va manzili;
   - xarita havolalari;
   - to'y dasturi;
   - aloqa raqamlari.

   Har bir maydon yonida izoh bor.

3. **Media fayllarni** `clients/jasur-madina/media/` ga qo'ying. Config'da
   faqat fayl nomini yozasiz:
   ```js
   music: 'music.mp3',
   gallery: ['1.jpg', '2.jpg', '3.jpg'],
   seo: { ogImage: 'og.jpg' },   // 1200x630 rasm tavsiya etiladi
   venue: { image: 'toyxona.jpg', ... },
   ```

4. **Tekshiring.** Xato bo'lsa, qaysi maydon noto'g'ri ekanini aniq aytadi:
   ```bash
   npm run check -- jasur-madina
   ```

5. **Ko'rib chiqing** (`WEDDING=jasur-madina` bilan `npm run dev`), keyin
   `git push` qiling.

> **Xarita havolasini olish.** Google Maps'da joyni toping, **Ulashish →
> Havolani nusxalash** ni bosing. Yandex'da ham xuddi shunday.

---

## Vercel'ga deploy qilish (har bir mijoz uchun)

1. [vercel.com/new](https://vercel.com/new) sahifasida shu GitHub repozitoriyni
   **Import** qiling.
2. **Project Name** ga mijoz nomini yozing, masalan `jasur-madina`. Sayt
   manzili `jasur-madina.vercel.app` bo'ladi.
3. **Environment Variables** bo'limiga qo'shing:

   | Nomi | Qiymati | Izoh |
   |---|---|---|
   | `WEDDING` | `jasur-madina` | **majburiy.** `clients/` dagi papka nomi |
   | `TELEGRAM_BOT_TOKEN` | `123456:ABC...` | RSVP uchun |
   | `TELEGRAM_CHAT_ID` | `-1001234567890` | javoblar keladigan chat. Bir nechta bo'lsa vergul bilan |
   | `SITE_URL` | `https://jasur-madina.uz` | ixtiyoriy, faqat o'z domeningiz bo'lsa |

4. **Deploy** tugmasini bosing. Framework, build buyrug'i va papka
   `vercel.json` da allaqachon sozlangan.

Keyingi mijoz uchun 1–4-qadamlarni yangi nom bilan takrorlang. Hammasi bitta
repozitoriydan ishlaydi.

> **Muhim:** Vercel'da muhit o'zgaruvchisini o'zgartirgandan keyin
> **Redeploy** qiling, aks holda o'zgarish kuchga kirmaydi.

---

## Telegram bot sozlash (RSVP uchun)

1. Telegram'da [@BotFather](https://t.me/BotFather) → `/newbot` → bot nomini
   bering. Berilgan **token** `TELEGRAM_BOT_TOKEN` bo'ladi.
2. Javoblar qayerga kelishini tanlang:
   - **O'zingizga yoki mijozga:** botga `/start` yozing.
   - **Guruhga:** botni guruhga qo'shing va guruhda biror xabar yozing.
3. Brauzerda `https://api.telegram.org/bot<TOKEN>/getUpdates` ni oching.
   `"chat":{"id": ...}` dagi raqam `TELEGRAM_CHAT_ID` bo'ladi. Guruh ID'si
   odatda `-100` bilan boshlanadi.

Bitta botni barcha mijozlar uchun ishlatish mumkin. Har bir loyihaga faqat
boshqa `TELEGRAM_CHAT_ID` qo'yasiz. Xabar oxirida qaysi saytdan kelgani
ko'rsatiladi.

**Bot ulanganini tekshirish:** saytingizda `/api/rsvp` sahifasini oching
(masalan `https://yusuf-zulayho.vercel.app/api/rsvp`). `"ready": true` bo'lsa,
bot ulangan. `"YO'Q"` ko'rsatilsa, Vercel'da o'sha o'zgaruvchi yo'q yoki
qo'shilgandan keyin **Redeploy** qilinmagan.

**Bot ulanmagan bo'lsa ham forma ishlaydi.** Mehmon formani to'ldirgach,
"WhatsApp orqali yuborish" va "Telegram orqali yuborish" tugmalari chiqadi. Javob
tayyor matn ko'rinishida yuboriladi. WhatsApp xabari `rsvp.whatsapp` raqamiga
boradi, u bo'sh bo'lsa `contacts` dagi birinchi raqamga. Agar
`rsvp.fallbackUrl` berilgan bo'lsa (masalan, Google Forms), o'sha havola chiqadi.

---

## Brendingiz va dizayn

- **`brand.config.js`**: sayt pastidagi "Onlayn taklifnoma buyurtma qilish"
  havolasi. O'chirish uchun `enabled: false`.
- **Ranglar**: har bir mijoz o'z `config.js` idagi `theme` orqali
  `navy`, `gold`, `cream`, `wine` ranglarini o'zgartira oladi.
- **Umumiy dizayn rasmlari** `public/images/` da joylashgan (konvert, ramkalar,
  naqshlar). Ularni almashtirsangiz, barcha mijozlar saytiga ta'sir qiladi.
- **Konvert va gul barglari** effektlari `effects` orqali o'chiriladi.

---

## Qanday ishlaydi

- **Vaqt zonasi.** Sana va vaqt `event.timezone` (standart `+05:00`, Toshkent)
  bo'yicha hisoblanadi. Mehmon boshqa davlatda bo'lsa ham hisoblagich to'g'ri
  ishlaydi.
- **To'y o'tgandan keyin.** Hisoblagich o'rniga "To'y bo'lib o'tdi" yozuvi
  chiqadi, RSVP forma avtomatik yopiladi. `rsvp.deadline` dan keyin ham forma
  yopiladi.
- **Mehmon javobi eslab qolinadi.** Javob bergan mehmon sahifani qayta ochsa,
  "Rahmat" xabarini ko'radi va xohlasa javobini o'zgartira oladi.
- **Qidiruv tizimlari.** Taklifnomalar shaxsiy bo'lgani uchun Google'da
  indekslanmaydi (`noindex`).
- **Config tekshiruvi.** Build paytida config tekshiriladi. Xato bo'lsa, deploy
  to'xtaydi va buzuq sayt chiqib ketmaydi.

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | lokal server |
| `npm run build` | `dist/` ga yig'ish |
| `npm run preview` | yig'ilgan saytni ko'rish |
| `npm run check` | barcha mijozlar config'ini tekshirish |
| `npm run new -- <nom>` | yangi mijoz papkasini yaratish |
