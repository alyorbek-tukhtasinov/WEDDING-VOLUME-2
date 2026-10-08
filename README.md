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
   | `WEDDING` | `jasur-madina` | `clients/` dagi papka nomi. Vercel loyihasi nomi papka nomi bilan bir xil bo'lsa, qo'ymasa ham bo'ladi: nom loyihadan o'zi olinadi |
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

### Deploy'lar sonini tejash

Vercel bepul tarifida kuniga 100 ta deploy limiti bor, barcha mijoz loyihalari
esa bitta repodan yig'iladi. Shuning uchun `vercel.json` da:

- `git.deploymentEnabled` — `claude/*` ish branch'lari deploy qilinmaydi, faqat `main`.
- `ignoreCommand` (`scripts/ignore-build.js`) — loyiha faqat o'ziga tegishli o'zgarishda
  yig'iladi: boshqa mijozning `clients/<nom>/` papkasi yoki `.md` fayllar o'zgarsa,
  build o'tkazib yuboriladi. Umumiy kod (`src/`, `api/`, `public/`...) o'zgarsa —
  hamma loyiha yig'iladi. Aniqlab bo'lmasa — har doim yig'iladi.

## O'z serveringizda (VPS) — Vercel o'rniga

Barcha taklifnomalar bitta serverda ishlaydi: deploy limiti yo'q, har mijozga alohida
loyiha ochish shart emas. Manzil: `https://<mijoz-papkasi>.<domen>` (masalan
`salimboy-jasminaxon.documen.uz`). Serverdagi boshqa saytlar va botlarga tegmaydi.

**Qanday ishlaydi**
- nginx har bir subdomenni `clients/` dagi papkaga bog'laydi, `/api/*` ni esa
  `server/index.js` ga (bitta Node jarayoni, faqat `127.0.0.1:3190`) yo'naltiradi.
- `taklifnoma-deploy.timer` har 2 daqiqada GitHub'dagi `main` ni tekshiradi. Yangi commit
  bo'lsa: hamma mijozni yig'adi → almashtiradi → API'ni tekshiradi. Nimadir yig'ilmasa
  yoki API javob bermasa — saytlar eski versiyada qoladi.
- HTTPS sertifikati (Let's Encrypt) DNS'i serverga yo'naltirilgan subdomenlarga o'zi olinadi.
- Baza — Vercel'dagi Upstash'ning o'zi: javoblar ko'chirishda yo'qolmaydi.

**O'rnatish (bir marta, serverda)**

```bash
git clone https://github.com/alyorbek-tukhtasinov/WEDDING-VOLUME-2.git /tmp/taklifnoma
sudo bash /tmp/taklifnoma/deploy/install.sh documen.uz 138.68.110.106 siz@email.uz
sudo nano /etc/taklifnoma/env        # REDIS_URL va har mijozning admin paroli
sudo systemctl restart taklifnoma
```

Admin parol nomi: `ADMIN_PASSWORD__` + papka nomi katta harflarda, `-` o'rniga `_`
(masalan `ADMIN_PASSWORD__SALIMBOY_JASMINAXON=...`). Bir mijoz paroli boshqasiga ishlamaydi.

**Mijozni ko'chirish / yangi mijoz**: DNS'da `<papka>.documen.uz` uchun `A` yozuv →
`138.68.110.106` (yoki bir marta `*.documen.uz` → shu IP — keyin yangi mijozlar uchun DNS
ham kerak emas). 2–4 daqiqada sayt HTTPS bilan ochiladi.

**Kundalik buyruqlar**

| Nima | Buyruq |
|---|---|
| Holat | `systemctl status taklifnoma` |
| Loglar | `journalctl -u taklifnoma -u taklifnoma-deploy -n 50` |
| Hozir yangilash | `sudo /usr/local/lib/taklifnoma/deploy.sh --force` |
| Oldingi versiyaga qaytish | `sudo /usr/local/lib/taklifnoma/deploy.sh --rollback` |
| `deploy/` o'zgarganda | `install.sh` ni yana bir marta ishga tushiring (xavfsiz) |

## Boshqaruv paneli (boshqaruv.documen.uz)

Yangi to'y yaratish va tahrirlash kod yozmasdan, brauzerda. Faqat egasining paroli bilan.

- **Ikki shablon**: *Volume 2* (krem-tilla, dastur, dress-kod, tilaklar) va *Yusuf & Zulayho*
  (qora-tilla, o'zbek/rus, 6 suratli bo'lim, sovg'a kartasi). Yangi to'y shablon tanlashdan boshlanadi.
- **Jonli ko'rinish**: o'ng tomonda saytning telefon ko'rinishi — shablonning haqiqiy kodi bilan.
- **To'y dasturi**: tayyor shablonlar (kechki, kunduzgi, kelin tomon, nahorgi osh, fotiha) va
  "✨ Vaqtga qarab avtomatik". To'y vaqti o'zgarsa, dastur ham o'zi suriladi.
- **Dress-kod**: yoqish/o'chirish va tayyor matnlar (kechki, qulay, milliy, pastel, klassik).
- **Xarita**: mijoz yuborgan Google/Yandex havolasi, `<iframe>` kodi yoki koordinatani joylang —
  ikkala havola va sahifadagi xarita o'zi tuziladi.
- **Rasmlar**: telefondan tanlanadi, brauzerda siqiladi (galereya, fon, Yusuf & Zulayho bo'limlari).
- **Saqlash va chiqarish**: GitHub'ga commit (tarix saqlanadi) → server darhol yig'adi (~15–30 s).
  Xato bo'lsa, saytlar oldingi holatda qoladi va panel sababini ko'rsatadi.
- **Mijoz paroli**: "🔑 Mijoz uchun /admin parol" — yangi parol yaratadi (bazada faqat xeshi turadi).
- **Nusxa olish**: mavjud to'yni andoza qilib yangisini yaratish (rasmlar qayta yuklanadi).

**Sozlash (bir marta)**

1. `/etc/taklifnoma/env` ga:
   - `OWNER_PASSWORD=` — panel paroli (uzun va murakkab);
   - `GITHUB_TOKEN=` — github.com → Settings → Developer settings → Personal access tokens →
     *Fine-grained tokens* → faqat shu repo, **Contents: Read and write**.
2. `sudo bash deploy/install.sh ...` ni qayta ishga tushiring (nginx panel bloki va darhol-deploy).
3. DNS: `boshqaruv` → A → server IP.

Panel `config.json` yozadi; qo'lda yozilgan `config.js` mijozlar panelda birinchi saqlanganda
`config.json` ga o'tadi. Ikkalasi ham ishlaydi.

## Telegram bot — mijoz taklifnomasini o‘zi yaratadi

Mijoz botda **«✨ Taklifnoma yaratish»** tugmasini bosadi → Telegram ichida forma (Mini App, `boshqaruv.<domen>/app`)
ochiladi: dizayn → marosim turi → ismlar → sana → to‘yxona → musiqa → taklif matni → jonli ko‘rinish →
**«To‘lovga o‘tish»**. Bot karta raqamini yuboradi, mijoz chekni (rasm yoki fayl) botga tashlaydi, admin(lar)ga chek
**[✅ Tasdiqlash] [❌ Rad etish]** tugmalari bilan keladi. Tasdiqlansa — sayt bir necha soniyada yig‘iladi va mijozga
havola boradi. Keyin mijoz botda «📂 Mening taklifnomalarim» → «✏️ Tahrirlash» / «📊 Javoblar».

Qanday ishlaydi:

- Bot saytlari **GitHub’da emas**, serverda: `/opt/taklifnoma/data` (`server/data.js`). Har o‘zgarishda faqat o‘sha
  sayt yig‘iladi (`scripts/build-one.js`, ~1–3 s); umumiy rasm/musiqa diskda bir nusxada (sayt boshiga ~1–2 MB).
  Deploy (`build-all.js`) ularni qayta yig‘maydi — faqat ulaydi.
- `server/app-api.js` — Mini App API (`/api/panel/app/*`), kirish Telegram imzosi bilan; mijoz faqat o‘z saytlarini
  ko‘radi, sozlamalar ruxsat etilgan maydonlar bo‘yicha qabul qilinadi; bir vaqtda ko‘pi bilan 3 ta qoralama.
- `server/bot.js` — bot (`taklifnoma-bot` xizmati, long polling — webhook/nginx kerak emas). Mijoz yozgan boshqa
  xabarlar adminga boradi; admin o‘sha xabarga **reply** qilsa — javob mijozga yetadi. `/admin` — statistika.
- Boshqaruv panelida bot saytlari **🤖** belgisi bilan: tahrirlash, to‘xtatish, o‘chirish va **«✅ To‘lovni tasdiqlash»**.
- To‘lanmagan qoralamalar `DRAFT_DAYS` (10) kundan keyin o‘chadi.
- **Rasmlar** (Mini App’ning «Rasmlar» qadami, `src/lib/photo-slots.js`): Klassik (volume2) — orqa fon, to‘yxona
  surati, galereya (6 tagacha); Yashil/Pushti bog‘ — orqa fon; Kino uslubi (yz) — 5 ta bo‘lim surati; hamma
  shablonda — havola ulashilganda chiqadigan rasm. Rasm telefonda 1600 px JPEG ga kichraytiriladi, faqat
  JPG/PNG/WEBP qabul qilinadi, to‘lovgacha rasmlarni faqat egasi ko‘radi.

### Instagram video (qo‘shimcha xizmat, `VIDEO_PRICE`, standart 15 000 so‘m)

`scripts/render-video.js` saytni Chromium’da ochib, **sayt oxirigacha** aylantirib yozadi (1080×1920, 30 kadr/s,
saytning musiqasi bilan; uzunligi — sayt oxirigacha ketgan vaqt, ko‘pi bilan `VIDEO_MAX_SECONDS`=150). Sahifa vaqti
to‘xtatilib, har kadr alohida chiziladi — server kuchsiz bo‘lsa ham video silliq (60 s video ≈ 6–15 daqiqada).
Kitob — varaqlanadi, kino uslubi (yz) — bo‘limlar almashadi. Telegram chegarasi uchun 48 MB dan oshmaydi.

- Mijoz: Mini App’da to‘lovdan oldin «🎬 Instagram uchun video ham kerak» (jami narxga qo‘shiladi) yoki keyin —
  botda «📂 Mening taklifnomalarim» → «🎬 Instagram uchun video». Alohida chek → admin ✅ → video tayyorlanib,
  botga yuboriladi; «🎬 Videoni olish» — qayta yuborish.
- Admin: panelda har kartada «🎬 Video» — tayyor video sizga Telegram’da keladi (mijoz holatiga ta’sir qilmaydi).
- Qo‘lda: `node scripts/render-video.js <nom> --out video.mp4`.

### Botni ishga tushirish (bir marta)

1. Telegram’da @BotFather → `/newbot` → token oling. @userinfobot’dan o‘z Telegram ID’ingizni oling.
2. Serverda: `sudo nano /etc/taklifnoma/env` — `deploy/env.example` dagi bot qatorlarini qo‘shing va to‘ldiring
   (`BOT_TOKEN`, `ADMIN_TG_IDS`, `PAY_CARD`, `PAY_CARD_HOLDER`, `PRICE`, ixtiyoriy `SUPPORT_CONTACT`).
3. O‘rnatish skriptini **qayta** ishga tushiring (yangi xizmat, ma’lumotlar papkasi va nginx sozlamasi uchun;
   mavjud saytlarga tegmaydi):
   ```bash
   rm -rf /tmp/taklifnoma && git clone https://github.com/alyorbek-tukhtasinov/WEDDING-VOLUME-2.git /tmp/taklifnoma
   sudo bash /tmp/taklifnoma/deploy/install.sh documen.uz <server-ip> <email>
   ```
4. Tekshirish: `systemctl status taklifnoma-bot`, `journalctl -u taklifnoma-bot -n 30`. Botga `/start` yozing.

**Zaxira:** `/opt/taklifnoma/data` faqat serverda — muntazam nusxa oling (masalan, kuniga bir marta
`tar czf /root/taklifnoma-data-$(date +%F).tgz -C /opt/taklifnoma data`).

**HTTPS:** hozir barcha subdomenlar bitta Let’s Encrypt sertifikatida — u 100 ta nomgacha. Saytlar soni 100 ga
yaqinlashganda wildcard sertifikatga (`*.documen.uz`, DNS orqali tasdiqlash) o‘tish kerak.

## "To‘y kechasining osmoni" shabloni (osmon)

Sahifa ortida — to‘y kechasi to‘yxona ustidagi haqiqiy osmon: ~5000 yulduz, Somon yo‘li,
Oy (fazasi bilan) va sayyoralar astronomik hisoblanadi (`templates/osmon/sky/astro.js`,
testlar: `tests/astro.test.js`). Kelin-kuyov ismlari yulduz turkumi bo‘lib chiziladi,
mehmonlar tilaklari fonar bo‘lib ko‘tarilib, osmonda yulduzga aylanadi.

`config.json` da `"template": "osmon"`. Qo‘shimcha maydon (ixtiyoriy):

```json
"sky": { "city": "Samarqand", "lat": 39.6542, "lng": 66.9597 }
```

Yozilmasa, koordinata to‘yxona xaritasi havolasidan olinadi, u ham bo‘lmasa — Toshkent.
To‘y yorug‘ paytda boshlansa, osmon o‘sha oqshom yulduzlar to‘liq chiqqan paytdagidek ko‘rsatiladi.
Namuna: `clients/demo-osmon`. Panelda: "Yangi to‘y" → "To‘y kechasining osmoni" (koordinata xarita havolasidan o‘zi olinadi).

**Islomiy matnlar (ixtiyoriy).** `"islamic"` bloki yozilsa: kirish sahifasida va oyat tepasida
Bismilloh, taklifdan oldin oyat (arabcha + ma’nosi + manba), "Shu kechaning osmoni" bo‘limida
osmon haqidagi oyat (`skyVerse`), oxirida nikoh duosi (`dua`). Arab yozuvi — Amiri shrifti (SIL OFL),
saytning o‘zida. Qo‘shimcha sarlavhalar: `texts.inviteTitle`, `namesCaption`, `namesNote`,
`countdownTitle`, `detailsTitle` (manzil bo‘limi Sana · Vaqt · Manzil ko‘rinishida), `timeNote`.
Panelda: "Islomiy matnlar (oyat va duo)" → yoqilsa tayyor matnlar qo‘yiladi. Namuna: `clients/baxtiyor-shaxrizoda`.

**Kirish videosi (ixtiyoriy).** `"introVideo": "intro-xxx.mp4"` (media/ dagi fayl). “Osmonni ochish”
bosilganda video ovozi bilan to‘liq ekranda qo‘yiladi, 1.5 s dan keyin “O‘tkazib yuborish” chiqadi;
video tugagach taklifnoma ochiladi, fon musiqasi shundan keyin boshlanadi. Panelda: "Kirish videosi"
bo‘limi — faqat MP4, 12 MB gacha (720p, H.264 tavsiya etiladi).

**Tillar (ixtiyoriy).** `"languages": ["uzc", "ru"]` — saytdagi tillar, birinchisi asosiy (`uz` — lotin,
`uzc` — o‘zbek kirill, `ru` — rus). Bir nechta til bo‘lsa, kirish pardasida va sahifada til almashtirish
tugmasi chiqadi, tanlov mehmon brauzerida eslab qolinadi (`?lang=ru` havolasi ham ishlaydi).
Kirillcha matnlar config'dagi lotinchadan avtomatik o‘giriladi (`i18n.uzc` — to‘g‘rilash uchun),
ruscha matnlar `i18n.ru` da (`couple`, `texts`, `venue`, `hosts`, `sky.city`, `dressCode.text`,
`program` — bandlar tartibida). Interfeys matnlari: `templates/osmon/i18n.js`. Panelda: "Tillar" bo‘limi.
Namuna: `clients/muhammaddiyor-robiyaxon`.

**Volume 2 shablonida ham** tillar (`languages`, `i18n`) va kirish videosi (`introVideo`) xuddi shunday
ishlaydi: til tanlash konvertda va sahifada (musiqa tugmasi ustida), video — muhr bosilganda
(konvert o‘chirilgan bo‘lsa video qo‘yilmaydi). Umumiy kod: `src/lib/i18n.js`, `src/lib/intro.js`;
Volume 2 interfeys matnlari — `src/strings.js`. Namuna: `clients/muhammaddiyor-robiyaxon-v2`.

Ma’lumotlar manbasi: yulduzlar — Yale Bright Star Catalogue, yulduz turkumlari chiziqlari —
[d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3, © Olaf Frohn); qayta yaratish:
`scripts/build-sky-data.js`. Shriftlar (Cinzel, Cormorant Garamond, Great Vibes) — SIL OFL,
`templates/osmon/fonts` da saytning o‘zida.

### "Bulutlar ustida" shabloni (bulut)

Yorug', kunduzgi osmon (`templates/bulut/`). Kirishda samolyot chiptasi (boarding pass):
"Parvozni boshlash" bosilganda musiqa yoqiladi, bulutlar orasidan uchib chiqiladi va samolyotlar
safi osmonga tutun bilan kelin-kuyov ismlarini yozadi (`skywrite.js`). Bulutlar — 3D, sahifa
surilganda kamera oldinga uchadi (`sky.js`). Sanoq — aeroport tablosi (split-flap), dastur —
havo sharlarida, manzil — parashyutda, dress-kod ranglari — bosilsa uchib ketadigan sharlar,
tilaklar — qog'oz samolyotcha bo'lib keladigan pochta kartochkalari.
Havolaga `?mehmon=Ism` qo'shilsa, chiptada va javob formasida o'sha mehmonning ismi chiqadi.
Namuna: `clients/demo-bulut`.

### "Volume 3" shabloni (volume3)

Gulli bog' (`templates/volume3/`): akvarel gullar foni, xira oynali kartochkalar, yashil ranglar.
Kirishda yurak belgisi, ismlar, sana va "Ochish" tugmasi gul guldastalari orasida (musiqa shu tugma bilan
yoqiladi). So'ng: marosim haqida (to'yxona, hafta kuni · sana · oy), aziz mehmonlar, sanoq va oy taqvimi,
manzil va xarita tugmalari, R.S.V.P., mehmonlar kitobi (tilak javob bilan birga saqlanadi), yakun.
Dastur va dress-kod — ixtiyoriy. Tillar: `"languages": ["uz", "ru"]` (yoki `uzc`) — chap yuqorida tugmalar.
Rasmlar: `public/images/garden/` (floral-background, flower2-decoration, flower5-bottom).
Rang: `"palette": "pink"` — pushti ohang (panelda "Rang"). O'z fon rasmi: `"backgroundImage": "fon.webp"` (media/ da;
telefonda qoplaydi, kompyuterda balandligi bo'yicha yonma-yon takrorlanadi).
Marosim turi: `"eventType": "kelin-salom"` — matnlar "Kelin salom" marosimiga moslashadi (panelda "Marosim turi").
Namuna: `clients/faxriddin-feruza-kelin-salom`.
Shrift: Playfair Display (SIL OFL) — `templates/volume3/fonts`. Namuna: `clients/demo-volume3`.

### "Volume 4" shabloni (volume4)

Volume 3 ning pushti ko‘rinishi (kod umumiy: `templates/volume3/app.js`): gulli fon (`public/images/volume4/fon.webp`)
va pushti ranglar o‘zi qo‘yiladi; `palette` va `backgroundImage` bilan almashtirsa bo‘ladi. Namuna: `clients/demo-volume4`.

### Marosim turlari (eventType)

`src/lib/events.js`: nikoh to‘yi (kechki / kunduzgi), qiz uzatish, nahorgi osh, fotiha to‘yi, kelin salom.
Panelda "Yangi to‘y" → shablon → **marosim turi**: vaqt, to‘y dasturi, dress-kod va taklif matnlari shunga moslab
tayyorlanadi. Tahrirlashda "Marosim turi" almashtirilsa, qo‘lda o‘zgartirilmagan matnlar, vaqt va dastur moslanadi.
Barcha shablonlardagi "To‘yimizgacha", "To‘y dasturi" kabi iboralar marosimga qarab o‘zgaradi; `eventType`
yozilmagan (eski) saytlar — nikoh to‘yi, matnlari avvalgidek.

### Ro‘yxat filtrlari va to‘lov

Panel ro‘yxatida: muddat (1 hafta ichida, 1 oy ichida, 1 oydan keyin, o‘tib ketgan), shablon, marosim turi va
to‘lov (to‘langan / to‘lanmagan). Kartadagi "⏳ To‘lanmagan / ✅ To‘langan" tugmasi bir bosishda almashadi
(`POST /api/panel/paid`, daromad yozuvida `paid`); "Daromad" sahifasida ham ustun bor.

### Taklif kimning nomidan

`config.invitedBy`: `parents` — ota-ona nomidan ("farzandlarimiz…"), `couple` — kelin-kuyov nomidan ("biz, … va …").
Panelda "Asosiy ma’lumotlar" → "Taklif kimning nomidan"; almashtirilsa taklif matni (va yakuniy so‘z) shunga moslanadi.
Har marosim uchun kelin-kuyov tilidagi matnlar — `src/lib/events.js` (COUPLE), volume3 eshik/marosim iboralari —
`templates/volume3/app.js`. Yozilmagan bo‘lsa — shablonning asl matnlari (eski saytlar o‘zgarmaydi).

### Avto-aylantirish

`config.autoScroll`: `off` (yoki yo‘q — eski saytlar) | `button` | `auto` — panelda "Avto-aylantirish".
Mehmon ⌄⌄ tugmasini bossa, sayt musiqa bilan asta o‘zi pastga suriladi (`src/lib/autoscroll.js`, barcha shablonlar):
taklif matni va sanada sekinlashadi, javob formasida to‘xtaydi, ekranga tegilsa to‘xtaydi, oxirida ↑ "Boshiga
qaytish". Kitobda varaqlar o‘zi ochiladi, yz’da bo‘limlar birin-ketin almashadi. `auto` — muhr/eshik ochilishi bilan
o‘zi boshlanadi, mehmon tegsa to‘xtaydi. Yangi saytlar `auto` bilan yaratiladi.

### Saytni vaqtincha to‘xtatish (to‘lov kutilmoqda)

Kartadagi "⏸ To‘xtatish" — mijozga ko‘rsatib bo‘lingach, to‘lovgacha havolani yopish (`POST /api/panel/pause`,
config'da `"paused": true`). Deploy'da bunday sayt o‘rniga faqat "Saytning ishlashi uchun to‘lov amalga
oshirilishi kutilmoqda" sahifasi yig‘iladi (`scripts/paused-page.js`): ism, rasm, musiqa diskda bo‘lmaydi,
`/api/*` ham yopiq (`.paused` belgisi). "▶️ Yoqish" yoki "To‘langan" belgilash (kartada yoki "Daromad"da)
saytni qayta yoqadi — mehmon javoblari joyida qoladi. Ro‘yxatda "Holat" filtri bor.

### “NAMUNA” belgisi (to‘lovgacha)

Tahrirda "Asosiy ma’lumotlar"ning eng boshidagi **“NAMUNA” belgisini qo‘shish** galochkasi (config'da
`"watermark": true`). Sayt ishlaydi, lekin butun yuzasi bo‘ylab qiya “NAMUNA” yozuvlari va pastda "Ushbu belgi
to‘lov amalga oshirilgach avtomatik olib tashlanadi!" izohi chiqadi (`src/lib/watermark.js`, barcha shablonlar;
build'da HTML'ga qo‘shiladi, `/admin`da yo‘q). Belgi bosishlarga xalaqit bermaydi. Jonli ko‘rinishda ham
ko‘rinadi, ro‘yxatdagi kartada "Namuna belgisi" yorlig‘i turadi. To‘lovdan keyin galochkani olib tashlab saqlang.

### "3D sehrli kitob" shabloni (kitob)

Taklifnoma — charm muqovali kitob (`templates/kitob/`). Muqova bosilganda musiqa yoqiladi va
kitob ochiladi; varaqlar barmoq bilan tortib, sahifa chetini bosib, pastdagi tugmalar yoki
klaviatura (← →) bilan 3D aylantiriladi. Telefonda bitta sahifa, kompyuterda ochiq kitob (ikki sahifa).
Har sahifada qog'ozdan kesilgan pop-up manzara tik turadi (`art.js`), emoji-stikerlar bosilsa sachraydi.
Javob sahifasida mehmon tilagiga stiker tanlaydi (xabar boshiga qo'shiladi), tilaklar "Mehmonlar devori"
sahifasida rangli xatcha bo'lib ko'rinadi. Namuna: `clients/demo-kitob`.

## Tug‘ilgan kun saytlari — yigitdan sevgan qiziga tabrik

Uchta shablon (`kind: 'birthday'`, `src/lib/templates.js`). Bu — taklifnoma emas: yigit sevgan qiziga
(odatda 16–25 yosh) tug‘ilgan kuni uchun yuboradigan romantik sayt. Kelin-kuyov va to‘yxona o‘rniga
`person` (qizning ismi va tug‘ilgan sanasi); birgalikdagi suratlar panelda yuklanadi.

| Shablon | Nima bor | Namuna |
|---|---|---|
| **Sehrli tort** (`tort`) | Qorong‘i xona → “Shamlarni yoqish” (musiqa shu bilan) → yosh raqamli shamlar yonadi → qiz tilak tilab, tugmani bosib turib (yoki mikrofonga) puflaydi → chiroqlar yonadi, yurakchali konfetti, sharlar uchadi. So‘ng: folga sharlardagi ism, “bu dunyoni N kundan beri yoritib kelyapsan” jonli hisoblagichi, “Biz birgamiz — N kun”, muhrli konvertdagi maktub, ipga osilgan polaroid suratlar, ichida tilak bor sharlar (bosilsa yoriladi), sovg‘a qutisi (karta yoki Payme/Click havolasi), javob maktubi, salyutli yakun | `clients/demo-tort` |
| **Yulduzlardan yaralgan** (`yulduz`) | Sahifa ortida 9–18 ming jonli yulduz (WebGL, `templates/yulduz/stars.js`). Kirish: *“Bu sayt faqat bitta inson uchun. Sen — Madinamisan?”* → “Ha, menman”. Pastga surilgan sari yulduzlar bir shakldan boshqasiga oqadi: *“Bundan 6 569 kun oldin…”* → qiz tug‘ilgan kechaning **haqiqiy Oyi** (faza astronomik hisoblanadi, `osmon/sky/astro.js`) + burji va muchal yili → aylanayotgan galaktika *“Koinot 13,8 milliard yil kutdi…”* → **qizning o‘z surati yulduzlardan yig‘iladi** *“…aynan seni yaratish uchun”* (barmoq tekkizilsa yulduzlar tarqaladi) → ismi (yozma harflar) → yoshi + “Yer seni Quyosh atrofida 16,9 milliard km olib yurdi” → yurak “Biz birgamiz N kun” → xotira suratlari (har biri yulduzlardan) → uchar yulduz-tilaklar → konvert va maktub → sovg‘a → javob maktubi → “Seni sevaman” (bosilsa portlab, qayta yig‘iladi) | `clients/demo-yulduz` |
| **Sevgi kundaligi** (`sevgi`) | b-day loyihasining professional versiyasi: muhrli maktub → har bir sahifa to‘liq ekranli birgalikdagi surat ustida (Ken Burns harakati): muqova (ism, “18 bahorni qarshi olgan farishtam”, gul yaproqlari), ilk uchrashuv, kulgili lahza, minnatdorlik, “Bizning yo‘limiz” (suratli xotiralar), tilaklar, sovg‘a qutisi, javob maktubi, “Seni sevaman” | `clients/demo-sevgi` |

**Panelda:** “Yangi sayt” → “Yulduzlardan yaralgan”, “Tug‘ilgan kun: sehrli tort” yoki “Sevgi kundaligi” → qizning ismi, tug‘ilgan
sanasi, tabrik kuni, tanishgan kuningiz (ixtiyoriy), kimdan (“Sevgilingdan”) → **Birgalikdagi suratlar**
(bir nechta suratni birdaniga tanlash mumkin; har biriga sarlavha, yil va izoh) → tilaklar (“✨ Tayyor
romantik tilaklar”) → matnlar (bo‘sh qolsa — namunadagi romantik matn) → sovg‘a → musiqa. O‘ngda jonli ko‘rinish.
Sayt manzili ismdan tuziladi: `madina.documen.uz`.

**Javob maktubi:** qiz sayt oxirida yigitga maktub yozishi mumkin (`attending: 'wish'`). Maktublar ochiq
`/api/wishes` da chiqmaydi — faqat `/admin` sahifasida (parol bilan) “Tabrik” belgisi bilan ko‘rinadi.

**Havola ulashilganda** (Telegram, Instagram) juftlikning o‘z surati chiqadi (muqova / maktub surati yoki
birinchi xotira); surat bo‘lmasa — `public/images/og-tort.jpg` / `og-sevgi.jpg`.

Config maydonlari (`config.json`):

```json
{
  "template": "tort",
  "person": { "name": "Madina", "birthDate": "2008-10-12" },
  "event": { "date": "2026-10-12", "timezone": "+05:00" },
  "from": "Sevgilingdan",
  "together": "2024-03-08",
  "voice": "siz",
  "texts": { "letter": "…", "finaleTitle": "…" },
  "photos": { "letter": "gullar.webp", "gift": "qalb.webp" },
  "memories": [{ "photo": "kecha.webp", "title": "Ilk ko‘rishuv", "year": "2024", "text": "…" }],
  "wishes": ["…", "…"],
  "gift": { "title": "…", "text": "…", "card": "8600…", "holder": "…", "bank": "Uzcard", "link": "https://payme.uz/…", "linkLabel": "Sovg‘ani olish" },
  "musicTrack": "musiqa-16",
  "rsvp": { "enabled": true }
}
```

- `voice` — faqat `tort`: yozilmasa “sen” (romantik), `"siz"` — hurmat bilan.
- `photos` kalitlari: `yulduz` — `portrait` (yuklanmasa — birinchi xotira surati); `tort` — `letter`, `gift`; `sevgi` — `cover`, `first`, `funny`, `gratitude`, `journey`,
  `wishes`, `gift` (yuklanmagan sahifaga birgalikdagi suratlardan biri qo‘yiladi).
- `texts` kalitlari — `templates/tort/texts.js`, `templates/sevgi/texts.js`, `templates/yulduz/texts.js` (panel ham shu ro‘yxatni ko‘rsatadi).
- Yosh `person.birthDate` va `event.date` dan hisoblanadi (raqamli shamlar, “18 bahor”).
- `musiqa-16` — “Happy Birthday” musiqa qutisi (kuy jamoat mulki, sintez qilingan).

### Demo saytlar va o‘chirish

Nomi `demo` bilan boshlanadigan saytlar (yoki tahrirda “Demo (namuna) sayt” belgilanganlar) ro‘yxatda
alohida guruhda turadi va daromad hisobiga kirmaydi (config: `"demo": true`). Kartadagi **O‘chirish**
tugmasi saytni nomini yozib tasdiqlagandan keyin GitHub’dan o‘chiradi; mehmon javoblari (Redis) va
daromad yozuvi saqlanib qoladi.

### Musiqa to‘plami

Panelda **🎵 Musiqalar** → MP3/M4A faylni tanlang, nomini yozing → **Qo‘shish**. Fayl
`public/music/` ga, nomi `src/lib/music.js` ro‘yxatiga yoziladi (GitHub commit), 2–3 daqiqada
hamma to‘ylarning "Fon musiqasi" ro‘yxatida va mijozlarning /admin sahifasida tanlash uchun chiqadi.
Qo‘shish faqat panel egasiga mumkin — mijozlar faqat tanlaydi.

### Daromad

Panelda **💰 Daromad** — barcha saytlar ro‘yxati; har biriga qanchaga sotilganini (va izoh) yozib
**Saqlash** bosiladi. Tepada: jami daromad, sotilgan saytlar soni, o‘rtacha narx va to‘y oylari bo‘yicha
summalar. Ma’lumot Redis’da `taklifnoma:boshqaruv:finance` kalitida saqlanadi — GitHub’ga (ochiq repo)
va mijoz saytlariga chiqmaydi.

### Instagram Direct AI yordamchi

Instagram'ga yozgan mijozlarga Claude sahifa nomidan javob beradi (rasmiy Instagram API, `server/instagram.js`).
Bot nimani biladi — `server/instagram-knowledge.md` (narxlar `PRICE`/`VIDEO_PRICE` dan, demo havolalar
avtomatik). Buyurtma ma'lumotlari yig'ilsa yoki savolga egasi javob berishi kerak bo'lsa — egasiga Telegram'da
xabar keladi (mavjud `BOT_TOKEN`/`ADMIN_TG_IDS`). Egasi Instagram'da o'zi yozsa, bot o'sha mijoz bilan
`IG_PAUSE_HOURS` soat jim turadi. Sozlash: `deploy/env.example` dagi `ANTHROPIC_API_KEY`, `IG_*` o'zgaruvchilari,
Meta webhook manzili — `https://boshqaruv.<domen>/api/panel/instagram`, maydon: `messages`.
Suhbatlar `<DATA_DIR>/instagram.json` da saqlanadi.

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

## Qo'shimcha sozlamalar

**"Sovg'a" yozuvi (`giftNote`).** Mijoz config'iga qo'shilsa, "Qayerda?" bo'limida
bino rasmi o'rniga katta bezakli yozuv chiqadi. Xarita tugmalari joyida qoladi:

```js
giftNote: {
  eyebrow: 'Eng qimmatli sovg‘a',
  title: 'Sizning tashrifingiz',
  text: 'Kelishingizning o‘zi biz uchun eng katta sovg‘a.',
},
```

Berilmasa, bo'lim avvalgidek rasm bilan chiqadi. Namuna uchun
`clients/begzodxoja-xusnoraxon` ga qarang.

**Fon rasmi (`backgroundImage`).** Butun sayt ortiga kelin-kuyov rasmi qo'yiladi.
Rasm ekranga mahkamlanadi, ustida krem parda bo'ladi:

```js
backgroundImage: 'bg.jpg',   // media/ dagi fayl (vertikal rasm yaxshi)
backgroundOverlay: 0.84,     // 0..1 — katta bo'lsa rasm xiraroq, matn aniqroq
```

Asliga qaytarish uchun shu ikki qatorni o'chirish kifoya.

**Sana va vaqtni admin sahifasidan o'zgartirish.** `/admin` → "To'y sanasi va vaqti".
Saqlangan sana bazada turadi, qayta deploy kerak emas. Sayt ochilganda bosh sahifa,
taqvim, hisoblagich va "Taqvimga qo'shish" yangi sanani oladi. Javob berish muddati
ham shuncha kunga suriladi. "Asl holiga qaytarish" config'dagi sanaga qaytaradi.

> Telegram'da havola ulashilganda chiqadigan tavsifdagi sana esa config'dan
> olinadi. Sana butunlay o'zgargan bo'lsa, `config.js` ni ham yangilab deploy
> qiling.

**Fon musiqasini admin paneldan tanlash.** `/admin` → "Fon musiqasi". Mijoz umumiy
to'plamdan qo'shiq tanlaydi, ▶ bilan eshitib ko'radi va saqlaydi. Qayta deploy kerak emas.
"Standart" varianti config'dagi musiqaga qaytaradi, "Musiqasiz" esa musiqani o'chiradi.

To'plamga yangi qo'shiq qo'shish:
1. Faylni `public/music/` ga qo'ying (mp3 yoki m4a, 3–5 MB gacha).
2. `src/lib/music.js` dagi ro'yxatga bitta qator yozing:
   ```js
   { id: 'musiqa-2', title: 'Qo‘shiq nomi', file: '/music/musiqa-2.mp3' },
   ```
3. Push qiling. Qo'shiq barcha mijozlarning admin panelida paydo bo'ladi.

---

## Brendingiz va dizayn

- **`brand.config.js`**: sayt pastidagi "Onlayn taklifnoma buyurtma qilish"
  havolasi. O'chirish uchun `enabled: false`.
- **Ranglar**: har bir mijoz o'z `config.js` idagi `theme` orqali
  `navy`, `gold`, `cream`, `wine` ranglarini o'zgartira oladi.
- **Umumiy dizayn rasmlari** `public/images/` da joylashgan (konvert, ramkalar,
  naqshlar). Ularni almashtirsangiz, barcha mijozlar saytiga ta'sir qiladi.
- **Konvert va gul barglari** effektlari `effects` orqali o'chiriladi.
- **Galereya uslubi**: `gallery` ga rasmlar qo'yilsa, standart ko'rinish — to'r (grid).
  `galleryStyle: 'garland'` — rasmlar tilla ipga osilgan polaroidlardek bir qatorda
  turadi va barmoq bilan suriladi.
- **Yozuv (typing) effekti**: taklif matni, sarlavha, sovg'a va dress-kod matnlari
  ekranga chiqqanda harfma-harf yoziladi. Biror mijozda o'chirish uchun
  `effects: { typing: false }`.

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
