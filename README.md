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
- RSVP: mehmonlar javoblari saytda saqlanadi, yopiq **`/admin`** sahifasida ko'rinadi;
- mehmonlar tilaklari devori ("Tilaklar" bo'limi);
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
api/                    ← javoblarni saqlash (rsvp), tilaklar (wishes), admin
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
   | `ADMIN_PASSWORD` | o'zingiz o'ylagan parol | `/admin` sahifasi uchun |
   | `SITE_URL` | `https://jasur-madina.uz` | ixtiyoriy, faqat o'z domeningiz bo'lsa |

4. **Deploy** tugmasini bosing. Framework, build buyrug'i va papka
   `vercel.json` da allaqachon sozlangan.
5. Javoblar saqlanishi uchun bazani ulang: pastdagi "Javoblarni saqlash" bo'limiga qarang.

Keyingi mijoz uchun 1–4-qadamlarni yangi nom bilan takrorlang. Hammasi bitta
repozitoriydan ishlaydi.

> **Muhim:** Vercel'da muhit o'zgaruvchisini o'zgartirgandan keyin
> **Redeploy** qiling, aks holda o'zgarish kuchga kirmaydi.

---

## Javoblarni saqlash (RSVP)

Mehmon javoblari **Upstash Redis** bazasida saqlanadi. Baza bepul va Vercel ichidan
ulanadi.

**Birinchi marta (bir martalik):**
1. Vercel → yuqori menyuda **Storage** → **Create Database** → **Upstash for Redis**.
2. Istalgan nom bering, region sifatida **Frankfurt (eu-central-1)** ni tanlang,
   rejani **Free** qoldirib yarating.

**Har bir mijoz loyihasi uchun:**
1. **Storage** → bazangiz → **Connect Project** → mijoz loyihasini tanlang.
   Kerakli o'zgaruvchilar (`KV_REST_API_URL`, `REDIS_URL` va boshqalar) loyihaga
   o'zi qo'shiladi.
2. Loyiha → **Settings → Environment Variables** ga `ADMIN_PASSWORD` qo'shing.
   Bu `/admin` sahifasining paroli bo'ladi.
3. **Deployments → ⋯ → Redeploy**.

### Ko'p mijoz: ma'lumotlar aralashmasligi

Bitta Upstash bazasini barcha mijozlar uchun ishlatavering. Har bir sayt javoblari
alohida kalitda saqlanadi:

```
taklifnoma:yusuf-zulayho:rsvp   ← faqat yusuf-zulayho sayti o'qiydi va yozadi
taklifnoma:jasur-madina:rsvp    ← faqat jasur-madina sayti o'qiydi va yozadi
```

- **Kalit serverda aniqlanadi.** Kalit Vercel'dagi `WEDDING` sozlamasidan
  olinadi, mehmon yoki brauzer uni o'zgartira olmaydi. Bir saytning `/admin`
  sahifasi boshqa sayt javoblarini ko'ra ham, o'chira ham olmaydi.
- **`WEDDING` esdan chiqsa, xato darhol ko'rinadi.** Vercel'da `WEDDING`
  o'rnatilmagan bo'lsa, deploy xato bilan to'xtaydi. Sayt jimgina "demo" bo'lib
  qolmaydi.
- **Admin sahifasida ham ko'rsatiladi.** `/admin` tepasida qaysi taklifnoma
  ekani yozilgan, `/api/rsvp` da esa `malumotlarKaliti` ko'rinadi.

**Har bir yangi mijoz uchun tekshiruv ro'yxati:**
1. `WEDDING` = shu mijozning **o'z** papka nomi (`clients/<nom>`). Ikki
   loyihaga bir xil nom qo'ymang.
2. `UPSTASH_REDIS_REST_URL` va `UPSTASH_REDIS_REST_TOKEN` = umumiy baza
   qiymatlari, hamma loyihada bir xil.
3. `ADMIN_PASSWORD` = har bir mijoz uchun **alohida** parol. Kelin-kuyovga
   berasiz.
4. Deploy tugagach `/api/rsvp` ni oching. `wedding` va `malumotlarKaliti`
   to'g'ri mijoz nomini ko'rsatishi kerak.

**Hajm.** Upstash'ning bepul rejasi o'nlab to'y uchun yetadi, har bir to'yga
3000 tagacha javob sig'adi. Aniq limitlarni Upstash panelidagi **Usage**
bo'limida kuzatib boring.

**Tekshirish:** saytingizda `/api/rsvp` sahifasini oching (masalan
`https://yusuf-zulayho.vercel.app/api/rsvp`). `"baza": "ulangan ✅"` va
`"adminParol": "bor ✅"` bo'lsa, hammasi tayyor.

**Javoblarni ko'rish:** `https://sayt-manzili/admin` sahifasini oching va parolni
kiriting. Sahifada quyidagilar bor:
- statistika: jami javob, keladi, kelmaydi, jami mehmon;
- filtr va qidiruv;
- **Excel (CSV)** ga yuklab olish;
- keraksiz javobni o'chirish.

Admin sahifa manzilini mijozga (kelin-kuyovga) ham parol bilan berishingiz mumkin.

**Saytdagi "Tilaklar" bo'limi.** Mehmonlar yozgan tilaklar taklifnomaning o'zida
ko'rinadi: faqat ism va tilak chiqadi, telefon raqami ko'rsatilmaydi. O'chirish
uchun config'da `rsvp.showWishes: false` qiling. Admin sahifada o'chirilgan javob
tilaklar ro'yxatidan ham yo'qoladi.

> Baza paroli (`REDIS_URL`) maxfiy. Uni hech kimga yubormang va kodga yozmang,
> u faqat Vercel sozlamalarida turadi.

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
  "Rahmat" xabarini ko'radi va xohlasa javobini o'zgartira oladi. O'zgartirilgan
  javob yangi yozuv sifatida qo'shilmaydi, eskisi yangilanadi.
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
