// Instagram yozishmalaridan o'rganish (bir martalik, serverda qo'lda ishga tushiriladi):
//   cd /opt/taklifnoma/current && sudo node server/instagram-learn.js [suhbatlar soni, standart 300]
// 1) Instagram Direct'dagi oxirgi suhbatlarni yuklaydi (har biridan oxirgi 25 xabar),
//    telefon/karta raqamlarini yashiradi va <DATA_DIR>/instagram-learn/chats.txt ga yozadi;
// 2) Claude shu suhbatlarni tahlil qilib, sotuv rejasini yozadi: <DATA_DIR>/instagram-learn/playbook.md
// Kalitlar /etc/taklifnoma/env dan o'qiladi (servis bilan bir xil).
import fs from "node:fs";
import path from "node:path";

// /etc/taklifnoma/env → process.env (servis EnvironmentFile bilan bir xil format: KEY=qiymat)
try {
  for (const line of fs
    .readFileSync(process.env.ENV_FILE || "/etc/taklifnoma/env", "utf8")
    .split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined)
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
} catch {
  /* env fayli yo'q — tashqaridan berilgan qiymatlar ishlatiladi */
}
process.env.DATA_DIR ||= "/opt/taklifnoma/data";

const { default: Anthropic } = await import("@anthropic-ai/sdk");
const { graphGet, MSG_FIELDS } = await import("./instagram.js");
const { DATA_DIR } = await import("./data.js");

const LIMIT = Number(process.argv[2]) || 300;
const OUT = path.join(DATA_DIR(), "instagram-learn");
fs.mkdirSync(OUT, { recursive: true });

// Telefon va karta raqamlari tahlilga kerak emas
const hide = (s) => s.replace(/\+?\d[\d\s\-()]{6,}\d/g, "[raqam]");

console.log(`Suhbatlar yuklanmoqda (ko‘pi bilan ${LIMIT} ta)…`);
const convs = [];
let next = `me/conversations?platform=instagram&limit=25&fields=${encodeURIComponent(`updated_time,participants,${MSG_FIELDS}`)}`;
while (next && convs.length < LIMIT) {
  const page = await graphGet(next);
  convs.push(...(page.data || []));
  next = page.paging?.next || null;
  process.stdout.write(`\r  ${convs.length} ta suhbat`);
}
console.log("");

// Biznes akkaunt — hamma suhbatda qatnashadigan yagona ishtirokchi
const freq = new Map();
for (const c of convs)
  for (const p of c.participants?.data || [])
    freq.set(p.id, (freq.get(p.id) || 0) + 1);
const business = [...freq].sort((a, b) => b[1] - a[1])[0]?.[0];

const blocks = [];
for (const c of convs.slice(0, LIMIT)) {
  const msgs = [...(c.messages?.data || [])].reverse();
  if (!msgs.some((m) => m.from?.id !== business)) continue;
  const lines = msgs.map((m) => {
    const who = m.from?.id === business ? "BIZ" : "MIJOZ";
    const text =
      hide((m.message || "").trim().replace(/\s*\n\s*/g, " / ")) ||
      "[rasm/ovoz/post]";
    return `${m.created_time?.slice(0, 16).replace("T", " ")} ${who}: ${text}`;
  });
  blocks.push(`### Suhbat ${blocks.length + 1}\n${lines.join("\n")}`);
}
const chats = blocks.join("\n\n");
fs.writeFileSync(path.join(OUT, "chats.txt"), chats);
console.log(`${blocks.length} ta suhbat → ${path.join(OUT, "chats.txt")}`);
if (!blocks.length) process.exit(0);

console.log("Claude tahlil qilmoqda (1–3 daqiqa)…");
const client = new Anthropic();
const stream = client.messages.stream({
  model: process.env.IG_LEARN_MODEL || "claude-opus-5-5",
  max_tokens: 16000,
  output_config: { effort: "high" },
  system:
    "Siz savdo bo‘yicha tajribali maslahatchisiz. Biznes: onlayn to‘y taklifnomalari (veb-sayt), Instagram reklamasi orqali mijoz topadi. " +
    'Reklamada mijoz "Narxi qancha?" tugmasini bosadi va avtomatik javob boradi (narx, 30 000 so‘m oldindan to‘lov, "Ha" deb yozing). ' +
    "Undan keyin egasi o‘zi yozishadi. Endi bu ishni AI yordamchiga topshirmoqchi. Javobni o‘zbek tilida (lotin) yozing.",
  messages: [
    {
      role: "user",
      content:
        `Quyida egasining (BIZ) mijozlar (MIJOZ) bilan haqiqiy yozishmalari:\n\n<chats>\n${chats}\n</chats>\n\n` +
        "Shularni o‘rganib, AI yordamchi uchun sotuv qo‘llanmasini yozing (markdown):\n" +
        '1. Raqamlar: nechta suhbat, nechtasi "Ha" dan keyin ma’lumot yubordi, nechtasi to‘ladi (taxminan), qayerda ko‘p tushib qoladi.\n' +
        "2. Egasining sotuv uslubi: qanday so‘zlar, ohang, xabar uzunligi, emoji — 5–10 ta haqiqiy namuna iqtibos bilan.\n" +
        '3. Bosqichma-bosqich sotuv oqimi: "Ha" → ma’lumot yig‘ish → shablon tanlash → oldindan to‘lov → tayyor havola. Har bosqichda nima yoziladi (tayyor matnlar).\n' +
        '4. Ko‘p beriladigan savollar va e’tirozlar ("qimmat", "keyinroq", "o‘ylab ko‘raman", "namunasini ko‘rsating"...) va egasining eng yaxshi ishlagan javoblari.\n' +
        "5. Javob bermay qo‘ygan mijozga qachon va qanday eslatma yozish.\n" +
        "6. AI nimani qilmasligi va qachon egasiga topshirishi kerak.\n" +
        'Faqat yozishmalarda ko‘ringan faktlarga tayaning; ishonchsiz joyni "(tekshiring)" deb belgilang. Mijozlarning ismi yoki shaxsiy ma’lumotini yozmang.',
    },
  ],
});
const msg = await stream.finalMessage();
const playbook = msg.content
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("\n")
  .trim();
fs.writeFileSync(path.join(OUT, "playbook.md"), playbook);
console.log(
  `\n${playbook}\n\n→ ${path.join(OUT, "playbook.md")}  (sarflandi: ${msg.usage.input_tokens} kirish, ${msg.usage.output_tokens} chiqish token)`,
);
