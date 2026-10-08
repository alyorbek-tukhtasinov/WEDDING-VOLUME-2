// Instagram yozishmalaridan o'rganish (bir martalik, serverda qo'lda ishga tushiriladi).
//   A) Instagram'dan yuklab olingan arxivdan (barcha eski yozishmalar):
//        cd /opt/taklifnoma/current && sudo node server/instagram-learn.js /root/ig-export
//      (/root/ig-export — "Download your information" ZIP'i ochilgan papka, JSON format)
//   B) Instagram API orqali (oxirgi 300 suhbat, har biridan oxirgi ~20 xabar; ilova Live bo'lgach):
//        cd /opt/taklifnoma/current && sudo node server/instagram-learn.js
// Telefon/karta raqamlari yashiriladi → <DATA_DIR>/instagram-learn/chats.txt,
// so'ng Claude sotuv qo'llanmasini yozadi → <DATA_DIR>/instagram-learn/playbook.md
// Kalitlar /etc/taklifnoma/env dan o'qiladi (servis bilan bir xil).
import fs from 'node:fs';
import path from 'node:path';

// /etc/taklifnoma/env → process.env (servis EnvironmentFile bilan bir xil format: KEY=qiymat)
try {
  for (const line of fs.readFileSync(process.env.ENV_FILE || '/etc/taklifnoma/env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {
  /* env fayli yo'q — tashqaridan berilgan qiymatlar ishlatiladi */
}
process.env.DATA_DIR ||= '/opt/taklifnoma/data';

const { default: Anthropic } = await import('@anthropic-ai/sdk');
const { DATA_DIR } = await import('./data.js');

const OUT = path.join(DATA_DIR(), 'instagram-learn');
fs.mkdirSync(OUT, { recursive: true });
const PER_CHAT = 60; // bitta suhbatdan oxirgi N xabar
const MAX_CHARS = 1_200_000; // Claude'ga yuboriladigan matn chegarasi (~400 ming token) — eng yangi suhbatlar qoladi

// Telefon va karta raqamlari tahlilga kerak emas
const hide = (s) => s.replace(/\+?\d[\d\s\-()]{6,}\d/g, '[raqam]');
const stamp = (ms) => new Date(ms + 5 * 3600e3).toISOString().slice(0, 16).replace('T', ' '); // Toshkent vaqti

/** Suhbat: { at: oxirgi xabar vaqti, msgs: [{ at, biz, text }] (eskisi birinchi) } */
async function fromApi() {
  const { graphGet, MSG_FIELDS } = await import('./instagram.js');
  console.log('Instagram API orqali suhbatlar yuklanmoqda…');
  const convs = [];
  let next = `me/conversations?platform=instagram&limit=25&fields=${encodeURIComponent(`updated_time,participants,${MSG_FIELDS}`)}`;
  while (next && convs.length < 300) {
    const page = await graphGet(next);
    convs.push(...(page.data || []));
    next = page.paging?.next || null;
    process.stdout.write(`\r  ${convs.length} ta suhbat`);
  }
  console.log('');
  // Biznes akkaunt — eng ko'p suhbatda qatnashgan ishtirokchi
  const freq = new Map();
  for (const c of convs) for (const p of c.participants?.data || []) freq.set(p.id, (freq.get(p.id) || 0) + 1);
  const business = [...freq].sort((a, b) => b[1] - a[1])[0]?.[0];
  return convs.map((c) => {
    const msgs = [...(c.messages?.data || [])].reverse().map((m) => ({ at: Date.parse(m.created_time), biz: m.from?.id === business, text: (m.message || '').trim() }));
    return { at: msgs.at(-1)?.at || 0, msgs };
  });
}

// Instagram arxivida matnlar buzilgan kodlashda (UTF-8 baytlari latin1 sifatida) — tiklaymiz
const fixText = (s) => (typeof s === 'string' ? Buffer.from(s, 'latin1').toString('utf8') : '');

function fromExport(dir) {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/^message_\d+\.json$/.test(e.name) && p.includes(`${path.sep}inbox${path.sep}`)) files.push(p);
    }
  };
  walk(dir);
  if (!files.length) throw new Error(`${dir} ichida messages/inbox/*/message_1.json topilmadi. Arxiv JSON formatida va ochilganmi?`);
  // Bitta suhbat bir nechta faylga bo'lingan bo'lishi mumkin (message_1, message_2…)
  const byChat = new Map();
  for (const f of files) {
    const json = JSON.parse(fs.readFileSync(f, 'utf8'));
    const key = path.dirname(f);
    const chat = byChat.get(key) || { names: (json.participants || []).map((p) => fixText(p.name)), raw: [] };
    chat.raw.push(...(json.messages || []));
    byChat.set(key, chat);
  }
  // Biznes akkaunt — eng ko'p suhbatda qatnashgan ishtirokchi
  const freq = new Map();
  for (const c of byChat.values()) for (const n of new Set(c.names)) freq.set(n, (freq.get(n) || 0) + 1);
  const business = [...freq].sort((a, b) => b[1] - a[1])[0]?.[0];
  console.log(`Arxivda ${byChat.size} ta suhbat (biznes akkaunt: ${business})`);
  return [...byChat.values()].map((c) => {
    const msgs = c.raw
      .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
      .map((m) => {
        let text = fixText(m.content).trim();
        if (!text && m.share) text = '[post/reels ulashildi]';
        if (!text && (m.photos || m.videos || m.audio_files)) text = m.audio_files ? '[ovozli xabar]' : '[rasm/video]';
        return { at: m.timestamp_ms, biz: fixText(m.sender_name) === business, text };
      });
    return { at: msgs.at(-1)?.at || 0, msgs };
  });
}

const source = process.argv[2];
const chats = (source ? fromExport(path.resolve(source)) : await fromApi())
  .filter((c) => c.msgs.some((m) => !m.biz)) // mijoz yozgan suhbatlar
  .sort((a, b) => b.at - a.at); // eng yangisi birinchi

const blocks = [];
let size = 0;
for (const c of chats) {
  const lines = c.msgs.slice(-PER_CHAT).map((m) => `${stamp(m.at)} ${m.biz ? 'BIZ' : 'MIJOZ'}: ${hide(m.text.replace(/\s*\n\s*/g, ' / ')) || '[boshqa]'}`);
  const block = `### Suhbat ${blocks.length + 1}\n${lines.join('\n')}`;
  if (size + block.length > MAX_CHARS) break;
  blocks.push(block);
  size += block.length;
}
const text = blocks.join('\n\n');
fs.writeFileSync(path.join(OUT, 'chats.txt'), text);
console.log(`${blocks.length} ta suhbat (${chats.length} tadan) → ${path.join(OUT, 'chats.txt')}`);
if (!blocks.length) process.exit(0);

console.log('Claude tahlil qilmoqda (2–5 daqiqa)…');
const client = new Anthropic();
const stream = client.messages.stream({
  model: process.env.IG_LEARN_MODEL || 'claude-opus-5-5',
  max_tokens: 32000,
  output_config: { effort: 'high' },
  system:
    'Siz savdo bo‘yicha tajribali maslahatchisiz. Biznes: onlayn to‘y taklifnomalari (veb-sayt), Instagram reklamasi orqali mijoz topadi. ' +
    'Hozirgi reklamada mijoz "Narxi qancha?" tugmasini bosadi va avtomatik javob boradi: "Atigi 70 000 so‘m 💌 30 000 so‘m oldindan to‘laysiz, ' +
    'qolganini esa taklifnoma tayyor bo‘lgach to‘laysiz. Sizga ham shunday tayyorlab beraylikmi? "Ha" deb yozing 👇". ' +
    'Undan keyin egasi o‘zi yozishadi. Endi bu ishni AI yordamchiga topshirmoqchi. Eski suhbatlarda narx boshqacha bo‘lishi mumkin — joriy narx 70 000 so‘m. ' +
    'Javobni o‘zbek tilida (lotin) yozing.',
  messages: [
    {
      role: 'user',
      content:
        `Quyida egasining (BIZ) mijozlar (MIJOZ) bilan haqiqiy yozishmalari (vaqt — Toshkent):\n\n<chats>\n${text}\n</chats>\n\n` +
        'Shularni o‘rganib, AI yordamchi uchun sotuv qo‘llanmasini yozing (markdown):\n' +
        '1. Raqamlar: nechta suhbat, nechtasi "Ha" dan keyin ma’lumot yubordi, nechtasi to‘ladi (taxminan), qayerda ko‘p tushib qoladi.\n' +
        '2. Egasining sotuv uslubi: qanday so‘zlar, ohang, xabar uzunligi, emoji — 5–10 ta haqiqiy namuna iqtibos bilan.\n' +
        '3. Bosqichma-bosqich sotuv oqimi: "Ha" → ma’lumot yig‘ish → shablon tanlash → oldindan to‘lov → tayyor havola. Har bosqichda nima yoziladi (egasi ishlatgan tayyor matnlar).\n' +
        '4. Ko‘p beriladigan savollar va e’tirozlar ("qimmat", "keyinroq", "o‘ylab ko‘raman", "namunasini ko‘rsating"...) va egasining eng yaxshi ishlagan javoblari.\n' +
        '5. Javob bermay qo‘ygan mijozga qachon va qanday eslatma yozish (egasi qanday qilgan va bu ishlaganmi).\n' +
        '6. AI nimani qilmasligi va qachon egasiga topshirishi kerak.\n' +
        'Faqat yozishmalarda ko‘ringan faktlarga tayaning; ishonchsiz joyni "(tekshiring)" deb belgilang. Mijozlarning ismi yoki shaxsiy ma’lumotini yozmang.',
    },
  ],
});
const msg = await stream.finalMessage();
const playbook = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
fs.writeFileSync(path.join(OUT, 'playbook.md'), playbook);
console.log(`\n${playbook}\n\n→ ${path.join(OUT, 'playbook.md')}  (sarflandi: ${msg.usage.input_tokens} kirish, ${msg.usage.output_tokens} chiqish token)`);
