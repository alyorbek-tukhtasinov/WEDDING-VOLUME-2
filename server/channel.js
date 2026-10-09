// Asosiy Telegram kanal (MAIN_CHANNEL) uchun postlar: bot qoralama tayyorlaydi → adminga "✅ Joylash" tugmasi bilan
// keladi → bitta bosish bilan kanalga chiqadi. Hech narsa admin tasdig'isiz joylanmaydi.
//   • Boshlang'ich postlar (SEED) — bo'sh kanalni to'ldirish uchun tayyor matnlar: /kanal
//   • Muntazam postlar — har CHANNEL_EVERY_DAYS kunda (standart 2) soat ~11:00 da yangi qoralama; matnni Claude
//     yozadi (ANTHROPIC_API_KEY bo'lsa), bo'lmasa — tayyor matn. Qo'lda: /post
// Holat: <DATA_DIR>/channel.json — { drafts: { id: {...} }, posted: [seedId], lastAuto, rotation }
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR, ROOT } from './data.js';
import { tg, tgUpload, adminIds, siteDomain, PRICE, fmtSum } from './telegram.js';

const env = (k, d = '') => (process.env[k] || d).trim();
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
export const MAIN_CHANNEL = () => env('MAIN_CHANNEL', '@Taklifim_rasmiy');
const REVIEWS_CHANNEL = () => env('REVIEWS_CHANNEL', '@taklifimuzotziv');
const EVERY_DAYS = () => Math.max(1, Number(env('CHANNEL_EVERY_DAYS', '2')) || 2);
const MODEL = () => env('CHANNEL_MODEL', 'claude-haiku-5-5');
let botName = '';
export const setBotName = (n) => (botName = n || '');

/* ------------------------------------ Dizaynlar ------------------------------------ */
// [id, nomi, namuna (subdomen), rasm (public/ ichida), qisqa tavsif — AI uchun asos]
export const SHOWCASE = [
  ['volume2', 'Klassik (oq-oltin konvert)', 'demo', 'images/og-default.jpg', 'oq-oltin konvert, qizil muhr bosiladi va ochiladi, gul barglari yog‘iladi; nafis va an’anaviy'],
  ['volume5', 'Our Story', 'demo-volume5', 'images/og-volume5.jpg', 'konvert ochiladi, raqsga tushayotgan juftlik videosi, zaytun ranglar; zamonaviy va romantik'],
  ['volume3', 'Yashil bog‘', 'demo-volume3', 'images/og-volume3.jpg', 'akvarel gullar, yashil bog‘ kayfiyati, yorug‘ va nafis'],
  ['volume4', 'Pushti bog‘', 'demo-volume4', 'images/og-volume4.jpg', 'pushti gullar, mayin va romantik'],
  ['osmon', 'To‘y kechasining osmoni', 'demo-osmon', 'images/og-osmon.jpg', 'to‘y kechasi va shahringiz ustidagi haqiqiy yulduzli osmon, kelin-kuyov ismlari yulduz turkumiga aylanadi'],
  ['suzani', 'Tirik suzani', 'demo-suzani', 'images/og-suzani.jpg', 'o‘zbek suzanisi ko‘z oldingizda o‘zi tikiladi; milliy va betakror'],
  ['bulut', 'Bulutlar ustida', 'demo-bulut', 'images/og-bulut.jpg', 'samolyot chiptasi ko‘rinishidagi taklifnoma, osmonda ismlar, aeroport tablosidagi sanoq'],
  ['kitob', '3D sehrli kitob', 'demo-kitob', 'images/og-kitob.jpg', 'varaqlanadigan 3D kitob, pop-up sahifalar — sevgi hikoyangiz ertakdek'],
  ['yz', 'Kino uslubida', 'demo-yz', 'images/yz/wedding1.jpg', 'qora-tilla, katta suratlar, kino afishasi uslubi'],
  ['klassik', 'Tug‘ilgan kun: klassik bazm', 'demo-klassik', 'images/og-klassik.jpg', 'tug‘ilgan kun bazmiga taklifnoma: sana, taqvim, dastur, manzil, mehmonlar javobi; sokin klassik uslub'],
  ['tort', 'Tug‘ilgan kun: sehrli tort', 'demo-tort', 'images/og-tort.jpg', 'yaqin insonga suratli tabrik: shamlar puflanadi, sharlar, maktub, tilaklar'],
  ['yulduz', 'Yulduzlardan yaralgan', 'demo-yulduz', 'images/og-yulduz.jpg', 'qizga tabrik: surati minglab yulduzlardan yig‘iladi, yulduzli xotiralar'],
  ['sevgi', 'Sevgi kundaligi', 'demo-sevgi', 'images/og-sevgi.jpg', 'sevgilingizga kinematik kundalik: birgalikdagi suratlar, xotiralar va tilaklar'],
];
const findDesign = (id) => SHOWCASE.find(([d]) => d === id);
const demoUrl = (sub) => (siteDomain() ? `https://${sub}.${siteDomain()}` : '');
const botUrl = (start) => (botName ? `https://t.me/${botName}${start ? `?start=${start}` : ''}` : '');

/** Kanaldagi post tugmalari: namuna va botda shu dizaynda yaratish (manba: kanal_<dizayn>) */
function postButtons(designId) {
  const d = findDesign(designId);
  const rows = [];
  if (d && demoUrl(d[2])) rows.push([{ text: '👀 Namunani ochish', url: demoUrl(d[2]) }]);
  const create = botUrl(d ? `kanal_${d[0]}` : 'kanal');
  if (create) rows.push([{ text: '✨ Bepul ko‘rib chiqish', url: create }]);
  return rows.length ? { inline_keyboard: rows } : undefined;
}

/* ------------------------------------ Boshlang'ich postlar ------------------------------------ */
// Bo'sh kanal uchun: tanishtiruv, qanday ishlaydi, har dizayn, tug'ilgan kun, otzivlar
function seedPosts() {
  const price = fmtSum(PRICE());
  const bot = botName ? `@${botName}` : 'botimiz';
  const design = (id, text) => ({ id: `seed-${id}`, design: id, photo: findDesign(id)[3], caption: text });
  return [
    // Salomlashuv — birinchi post, joylanganda kanal tepasiga qadaladi
    {
      id: 'seed-welcome',
      design: 'volume5',
      photo: 'images/og-volume5.jpg',
      caption:
        `👋 <b>Xush kelibsiz!</b>\n\n` +
        `To‘y — umrda bir marta. Taklifnomangiz ham shunday esda qolsin 💍\n\n` +
        `Mehmoningiz havolani ochadi — musiqa yangraydi, konvert ochiladi, ismlaringiz chiroyli yozuvda paydo bo‘ladi. ` +
        `Sana, to‘y dasturi va xarita — bitta sahifada. «Kelaman» degan har bir mehmonni esa siz telefoningizda ko‘rib turasiz.\n\n` +
        `✨ <b>Nega aynan onlayn taklifnoma?</b>\n` +
        `• Bosmaxona, navbat va tarqatish yo‘q — <b>3 daqiqada tayyor</b>\n` +
        `• Yuzlab nusxa emas — bitta havola, Telegram va WhatsApp’da hammaga\n` +
        `• Sana yoki to‘yxona o‘zgarsa — bir zumda tuzatasiz, qayta chop etish shart emas\n` +
        `• Avval o‘z ismlaringiz bilan <b>bepul ko‘rasiz</b> — yoqsagina to‘laysiz\n\n` +
        `Qog‘oz taklifnoma stol ustida qoladi. Bizniki — har bir mehmonning cho‘ntagida 📲\n\n` +
        `👇 <b>Hoziroq sinab ko‘ring</b> — o‘z taklifnomangizni 3 daqiqada yarating, bu bepul.`,
    },
    {
      id: 'seed-intro',
      design: 'volume2',
      photo: 'images/og-default.jpg',
      caption:
        `💌 <b>Taklifim.uz — onlayn taklifnomalar</b>\n\n` +
        `To‘y, fotiha, nahorgi osh, qiz uzatish, kelin salom va tug‘ilgan kun uchun — <b>chiroyli sayt ko‘rinishidagi taklifnoma</b>.\n\n` +
        `🎵 Musiqa bilan ochiladi\n📅 Sana, vaqt va to‘y dasturi\n📍 Bir bosishda xarita (Google / Yandex)\n✅ Mehmonlar «Kelaman» deb javob beradi — siz ro‘yxatni botda ko‘rasiz\n💬 Tilaklar bo‘limi\n\n` +
        `Bir havola — Telegram, WhatsApp va Instagram’da hammaga yuborasiz.\n\n👉 ${bot}`,
    },
    {
      id: 'seed-how',
      design: 'volume5',
      photo: 'images/og-volume5.jpg',
      caption:
        `⚡ <b>Qanday ishlaydi?</b>\n\n` +
        `1️⃣ ${bot} ga kiring va «✨ Taklifnoma yaratish»ni bosing\n` +
        `2️⃣ Dizaynni tanlang, ismlar, sana va to‘yxonani yozing — 3 daqiqa\n` +
        `3️⃣ Tayyor taklifnomangizni <b>bepul ko‘rib chiqasiz</b>\n` +
        `4️⃣ Yoqsa — to‘lov qilasiz va sayt havolasi darhol keladi\n\n` +
        `💰 Narxi: <b>${price}</b>\n✏️ Keyin ham istalgancha o‘zgartirish mumkin — ism, sana, dastur, manzil.\n\nYoqmasa — hech narsa to‘lamaysiz 🙂`,
    },
    design('volume2', `🕊 <b>Klassik — oq-oltin konvert</b>\n\nMehmoningiz qizil muhrni bosadi — konvert ochiladi, musiqa yangraydi, gul barglari yog‘iladi. An’anaviy, nafis va hamma yoshdagilarga tushunarli.\n\nTaklif matni ota-ona yoki kelin-kuyov nomidan, o‘zbek (lotin/kirill) va rus tillarida.`),
    design('volume5', `💃 <b>Our Story</b>\n\nKonvert ochiladi — raqsga tushayotgan juftlik, zaytun ranglar va yumshoq musiqa. Zamonaviy juftliklar uchun eng sevimli dizaynimiz.`),
    design('osmon', `🌌 <b>To‘y kechasining osmoni</b>\n\nTo‘y kechasi shahringiz ustida qanday yulduzlar porlashini ko‘rsatamiz — haqiqiy osmon xaritasi asosida. Kelin va kuyov ismlari esa yulduz turkumiga aylanadi ✨`),
    design('suzani', `🪡 <b>Tirik suzani</b>\n\nO‘zbek suzanisi ko‘z oldingizda o‘zi tikiladi — naqshlar birma-bir paydo bo‘ladi. Milliy ruhdagi to‘ylar uchun betakror taklifnoma.`),
    design('kitob', `📖 <b>3D sehrli kitob</b>\n\nTaklifnoma — varaqlanadigan kitob: har sahifada pop-up bezaklar, sana, dastur va manzil. Sevgi hikoyangiz ertakdek boshlanadi.`),
    design('bulut', `✈️ <b>Bulutlar ustida</b>\n\nTaklifnoma — samolyot chiptasi: «yo‘nalish — baxt», reys sanasi — to‘y kuni. Ismlar osmonda, sanoq esa aeroport tablosida.`),
    design('volume3', `🌿 <b>Yashil bog‘ va 🌸 Pushti bog‘</b>\n\nAkvarel gullar orasida nafis taklifnoma — yorug‘, mayin va romantik. Ikki rang: yashil va pushti.`),
    design('klassik', `🎩 <b>Tug‘ilgan kun bazmiga taklifnoma</b>\n\nYubiley yoki tug‘ilgan kun bazmiga mehmon chaqirasizmi? Sana, taqvim, sanoq, bazm dasturi, manzil va mehmonlar javobi — hammasi bitta havolada. Sokin klassik uslub.`),
    design('tort', `🎂 <b>Yaqin insoningizga suratli tabrik</b>\n\n«Sehrli tort» — shamlarni puflaydi, sharlar uchadi, maktubingizni o‘qiydi.\n✨ «Yulduzlardan yaralgan» — uning surati minglab yulduzdan yig‘iladi.\n💌 «Sevgi kundaligi» — birgalikdagi suratlaringiz kino kabi.\n\nSuratlarni botga yuborasiz — qolganini o‘zimiz qilamiz.`),
    {
      id: 'seed-reviews',
      design: '',
      photo: 'images/og-volume4.jpg',
      caption:
        `⭐ <b>Mijozlarimiz fikri</b>\n\nTaklifnomalarimiz bilan to‘y qilgan oilalarning fikrlari — ${esc(REVIEWS_CHANNEL())} kanalida.\n\nO‘z taklifnomangizni hoziroq yarating: avval ko‘rasiz, yoqsa to‘laysiz 👉 ${bot}`,
    },
  ];
}

/* ------------------------------------ Holat ------------------------------------ */
const stateFile = () => path.join(DATA_DIR(), 'channel.json');
function load() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return { drafts: {}, posted: [], lastAuto: 0, rotation: 0 };
  }
}
function store(st) {
  fs.mkdirSync(DATA_DIR(), { recursive: true });
  fs.writeFileSync(`${stateFile()}.tmp`, JSON.stringify(st));
  fs.renameSync(`${stateFile()}.tmp`, stateFile());
}

/* ------------------------------------ Yuborish ------------------------------------ */
const photoPath = (p) => path.join(ROOT, 'public', p);
async function sendPost(chatId, d, replyMarkup) {
  const file = photoPath(d.photo || '');
  if (d.photo && fs.existsSync(file)) {
    return tgUpload('sendPhoto', { chat_id: chatId, caption: d.caption, parse_mode: 'HTML', reply_markup: replyMarkup }, { field: 'photo', path: file, name: path.basename(file) });
  }
  return tg('sendMessage', { chat_id: chatId, text: d.caption, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: replyMarkup });
}

/** Qoralamani adminlarga tasdiqlash uchun yuborish */
async function offer(d, note = '') {
  const st = load();
  st.drafts[d.id] = { ...d, status: 'pending', at: new Date().toISOString() };
  store(st);
  const kb = {
    inline_keyboard: [
      [{ text: `✅ ${MAIN_CHANNEL()} ga joylash`, callback_data: `ch:ok:${d.id}` }],
      [...(d.ai ? [{ text: '🔄 Boshqa matn', callback_data: `ch:re:${d.id}` }] : []), { text: '❌ Kerak emas', callback_data: `ch:no:${d.id}` }],
    ],
  };
  for (const id of adminIds()) {
    if (note) await tg('sendMessage', { chat_id: id, text: note, parse_mode: 'HTML' }).catch(() => {});
    await sendPost(id, d, kb).catch((e) => console.log(`! kanal qoralamasi (${id}): ${e.message}`));
  }
}

/* ------------------------------------ Claude: post matni ------------------------------------ */
const ANGLES = [
  'dizayn taqdimoti: bu dizaynni ko‘rgan mehmon nimani his qiladi, nimasi bilan esda qoladi',
  'foydali maslahat (masalan: taklifnomani qachon yuborish, mehmonlar javobini qanday yig‘ish, xaritaning qulayligi) va shu dizaynni misol qilib keltirish',
  'qog‘oz taklifnomaga solishtirish: vaqt, pul, yetkazib berish, o‘zgartirish oson — shu dizayn misolida',
  'mijozning kichik hikoyasi uslubida (o‘ylab topilgan ism, raqam yoki otzivsiz!): bir oila taklifnomani qanday tayyorladi',
];
let client;
async function claude() {
  if (!client) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
  }
  return client;
}

/** Claude yozgan kanal posti (Telegram HTML). API kaliti yo'q yoki xato bo'lsa — null. */
async function writeCaption(designId, angle) {
  if (!env('ANTHROPIC_API_KEY')) return null;
  const d = findDesign(designId);
  const system =
    `Sen Taklifim.uz onlayn taklifnoma xizmatining Telegram kanali uchun post yozasan. Kanal o‘quvchilari — to‘y yoki tug‘ilgan kun tayyorlayotgan o‘zbek oilalari.\n` +
    `Xizmat: to‘y, fotiha, nahorgi osh, qiz uzatish, kelin salom va tug‘ilgan kun uchun sayt ko‘rinishidagi taklifnoma — musiqa, sana va dastur, xarita, mehmonlar javobi va tilaklar. ` +
    `Telegram bot orqali 3 daqiqada yaratiladi, avval bepul ko‘riladi, yoqsa to‘lanadi. Narxi: ${fmtSum(PRICE())}. Keyin ham o‘zgartirish mumkin.\n\n` +
    `Qoidalar:\n- Faqat o‘zbek tilida, lotin yozuvida, to‘g‘ri imlo bilan (o‘, g‘ — ‘ belgisi bilan).\n` +
    `- Telegram HTML: faqat <b> va <i> teglari. Markdown ishlatma.\n- 450–850 belgi. Qisqa xatboshilar, 3–6 ta mos emoji.\n` +
    `- O‘ylab topilgan raqamlar, foizlar, mijoz ismlari yoki otzivlar YO‘Q. Berilgan narxdan boshqa narx yozma.\n` +
    `- Havola yoki @username yozma — post ostida tugmalar bo‘ladi («Namunani ochish», «Bepul ko‘rib chiqish»).\n` +
    `- Oxirida bitta qisqa chaqiriq jumlasi (masalan: avval bepul ko‘ring).\n- Faqat post matnini qaytar, boshqa hech narsa yozma.`;
  const user = `Dizayn: «${d[1]}» — ${d[4]}.\nPost yo‘nalishi: ${angle}.`;
  try {
    const big = /opus-5|fable-5|sonnet-5-5/.test(MODEL());
    const res = await (await claude()).beta.messages.create({
      model: MODEL(),
      max_tokens: 4000,
      ...(big ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
      output_config: { effort: 'low' },
      system,
      messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'refusal') return null;
    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    // Telegram rasm izohi 1024 belgigacha; ruxsat etilmagan teglar olib tashlanadi
    const clean = text.replace(/<(?!\/?(b|i)>)[^>]*>/g, '').slice(0, 1000);
    return clean.length > 80 ? clean : null;
  } catch (err) {
    console.log(`! kanal posti (Claude): ${err.message}`);
    return null;
  }
}

/** Yangi qoralama: navbatdagi dizayn, navbatdagi yo'nalish; Claude yozmasa — boshlang'ich matn */
export async function makeDraft({ designId } = {}) {
  const st = load();
  const d = designId ? findDesign(designId) : SHOWCASE[(st.rotation || 0) % SHOWCASE.length];
  if (!designId) {
    st.rotation = (st.rotation || 0) + 1;
    store(st);
  }
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
  const caption = (await writeCaption(d[0], angle)) || seedPosts().find((p) => p.design === d[0])?.caption || seedPosts()[0].caption;
  return { id: `ai-${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`, design: d[0], photo: d[3], caption, ai: true, angle };
}

/* ------------------------------------ Admin buyruqlari ------------------------------------ */
/** /kanal — boshlang'ich postlar ro'yxati */
export async function channelMenu(chatId) {
  const st = load();
  const left = seedPosts().filter((p) => !st.posted.includes(p.id));
  await tg('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text:
      `📢 <b>Kanal: ${esc(MAIN_CHANNEL())}</b>\n\n` +
      `Boshlang‘ich postlar: <b>${left.length}</b> ta joylanmagan (jami ${seedPosts().length}).\n` +
      `Har ${EVERY_DAYS()} kunda bot yangi post qoralamasini yuboradi${env('ANTHROPIC_API_KEY') ? ' (matnni AI yozadi)' : ''} — siz tasdiqlasangiz joylanadi.\n\n` +
      `Bot kanalda admin bo‘lishi kerak («Post messages» huquqi bilan).`,
    reply_markup: {
      inline_keyboard: [
        ...(left.length ? [[{ text: `👀 Bittalab ko‘rib chiqish (${left.length})`, callback_data: 'ch:seed:review' }], [{ text: `🚀 Hammasini joylash (${left.length})`, callback_data: 'ch:seed:all' }]] : []),
        [{ text: '✍️ Yangi post (AI)', callback_data: 'ch:new:-' }],
      ],
    },
  });
}

async function publish(d) {
  const msg = await sendPost(MAIN_CHANNEL(), d, postButtons(d.design));
  // Salomlashuv kanal tepasiga qadaladi (botda "Pin messages" huquqi bo'lmasa — jim o'tkazib yuboriladi)
  if (d.id === 'seed-welcome' && msg?.message_id) {
    await tg('pinChatMessage', { chat_id: MAIN_CHANNEL(), message_id: msg.message_id, disable_notification: true }).catch((e) => console.log(`! salomlashuv qadalmadi: ${e.message}`));
  }
  const st = load();
  if (d.id.startsWith('seed-') && !st.posted.includes(d.id)) st.posted.push(d.id);
  if (st.drafts[d.id]) st.drafts[d.id].status = 'posted';
  store(st);
}

/** Kanal tugmalari (callback "ch:…") — true qaytarsa, ishlov berildi */
export async function onChannelCallback(cb) {
  const [kind, action, id] = String(cb.data || '').split(':');
  if (kind !== 'ch') return false;
  const answer = (text, alert = false) => tg('answerCallbackQuery', { callback_query_id: cb.id, ...(text ? { text, show_alert: alert } : {}) }).catch(() => {});
  if (!adminIds().includes(String(cb.from.id))) return (await answer(), true);
  const chatId = cb.message?.chat?.id || cb.from.id;
  const mark = (suffix) =>
    cb.message &&
    tg(cb.message.caption != null ? 'editMessageCaption' : 'editMessageText', {
      chat_id: chatId,
      message_id: cb.message.message_id,
      ...(cb.message.caption != null ? { caption: `${cb.message.caption}\n\n${suffix}` } : { text: `${cb.message.text}\n\n${suffix}` }),
    }).catch(() => {});

  if (action === 'seed') {
    await answer();
    const st = load();
    const left = seedPosts().filter((p) => !st.posted.includes(p.id));
    if (id === 'all') {
      let ok = 0;
      for (const p of left) {
        try {
          await publish(p);
          ok++;
          await new Promise((r) => setTimeout(r, Number(env('CHANNEL_POST_DELAY_MS', '1500')))); // Telegram cheklovlari uchun
        } catch (err) {
          await tg('sendMessage', { chat_id: chatId, text: `⚠️ Joylanmadi: ${err.message}\nBot ${MAIN_CHANNEL()} kanalida admin ekanini tekshiring.` });
          break;
        }
      }
      return (await tg('sendMessage', { chat_id: chatId, text: `✅ ${ok} ta post ${MAIN_CHANNEL()} ga joylandi.` }), true);
    }
    for (const p of left) await offer(p);
    return true;
  }
  if (action === 'new') {
    await answer('Yozilmoqda…');
    await offer(await makeDraft(), '✍️ Yangi post qoralamasi:');
    return true;
  }
  const st = load();
  const d = st.drafts[id];
  if (!d || d.status !== 'pending') return (await answer('Allaqachon hal qilingan'), true);
  if (action === 'ok') {
    try {
      await publish(d);
    } catch (err) {
      return (await answer(`Joylanmadi: bot ${MAIN_CHANNEL()} kanalida admin emasmi? (${err.message})`, true), true);
    }
    await answer('Joylandi ✅');
    await mark(`✅ ${MAIN_CHANNEL()} ga joylandi`);
    return true;
  }
  if (action === 'no') {
    st.drafts[id].status = 'rejected';
    store(st);
    await answer('Bekor qilindi');
    await mark('❌ Joylanmadi');
    return true;
  }
  if (action === 're') {
    st.drafts[id].status = 'replaced';
    store(st);
    await answer('Yangi matn yozilmoqda…');
    await mark('🔄 Almashtirildi');
    await offer(await makeDraft({ designId: d.design }));
    return true;
  }
  return (await answer(), true);
}

/** Har soatda chaqiriladi: vaqti kelsa (har N kunda, Toshkent 10–13) — yangi qoralama adminlarga */
export async function maybeAutoDraft() {
  if (env('CHANNEL_AUTO', '1') === '0' || !adminIds().length) return;
  const st = load();
  const h = (new Date().getUTCHours() + 5) % 24;
  if (h < 10 || h >= 13) return;
  if (Date.now() - (st.lastAuto || 0) < EVERY_DAYS() * 86400e3 - 3 * 3600e3) return;
  st.lastAuto = Date.now();
  store(st);
  await offer(await makeDraft(), `🗓 Kanal uchun navbatdagi post (har ${EVERY_DAYS()} kunda):`);
}

export { seedPosts, postButtons };
