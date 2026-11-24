// Voronka: foydalanuvchilar botda qayergacha yetib keladi va qayerda to'xtab qoladi.
//
//   • track(userId, e, extra) — qadamni <DATA_DIR>/funnel.jsonl ga yozadi (har qatorda bitta hodisa, faqat qo'shiladi).
//     Hodisalar: start, demos, mine, help, wz_start, wz_step (savol berildi), wz_err (javob qabul qilinmadi),
//     wz_reset (/start bilan to'xtatildi), wz_stale (2 kundan keyin unutildi), wz_done (qoralama tayyor),
//     wz_fail, pay (to'lov oynasi ochildi), receipt (chek yuborildi), paid, rejected,
//     nudge (boshlamagan / savollarda qolganga eslatma), resume (eslatmadan «Davom ettirish»).
//   • buildFunnel({ days }) — hisobot: leads.json + wizard.json + saytlar meta.json + funnel.jsonl dan.
//     Jurnal bo'lmagan davr uchun ham ishlaydi (hozirgi holat bo'yicha), jurnal bo'lsa — aniqroq.
//   • funnelText(stats) — Telegram uchun matn (/voronka). Buyruq satridan: node server/funnel.js [kun]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR, listSites, readLeads, STATUS } from './data.js';
import { isAdmin } from './telegram.js';

const logFile = () => path.join(DATA_DIR(), 'funnel.jsonl');
const wizardFile = () => path.join(DATA_DIR(), 'wizard.json');
const DAY = 86400e3;

/** Hodisani yozish. Hech qachon xato tashlamaydi — bot ishiga xalaqit bermasin. Adminlar yozilmaydi (sinovlar). */
export function track(userId, e, extra = {}) {
  try {
    if (!userId || isAdmin(userId)) return;
    fs.mkdirSync(DATA_DIR(), { recursive: true });
    fs.appendFileSync(logFile(), JSON.stringify({ t: new Date().toISOString(), u: String(userId), e, ...extra }) + '\n');
  } catch {
    /* jurnal yozilmasa ham bot ishlayveradi */
  }
}

export function readEvents() {
  let text = '';
  try {
    text = fs.readFileSync(logFile(), 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* chala yozilgan qator */
    }
  }
  return out;
}

function readWizard() {
  try {
    return JSON.parse(fs.readFileSync(wizardFile(), 'utf8'));
  } catch {
    return {};
  }
}

/* ------------------------------------ Nomlar ------------------------------------ */
// [kalit, sarlavha, qisqa nom]
export const STAGES = [
  ['start', '👋 Botga kirdi (/start)', '/start'],
  ['wizard', '✨ «Taklifnoma yaratish»ni bosdi', 'yaratishni boshlash'],
  ['draft', '📝 Savollarni tugatdi (qoralama tayyor)', 'savollarni tugatish'],
  ['pay', '💳 «To‘lov qilish»ni bosdi', 'to‘lov tugmasi'],
  ['receipt', '🧾 Chek yubordi', 'chek yuborish'],
  ['paid', '✅ To‘ladi (tasdiqlandi)', 'to‘lov tasdig‘i'],
];

export const STEP_TITLES = {
  kind: 'To‘y yoki tug‘ilgan kun tanlash',
  template: 'Dizayn tanlash',
  btemplate: 'Tug‘ilgan kun dizayni',
  eventType: 'Marosim turi',
  groom: 'Kuyov ismi',
  bride: 'Kelin ismi',
  name: 'Ism (tug‘ilgan kun)',
  birthDate: 'Tug‘ilgan sana',
  date: 'Sana',
  time: 'Boshlanish vaqti',
  venue: 'To‘yxona / joy nomi',
  address: 'Manzil',
  map: 'Xaritadagi joy',
  voice: 'Kim nomidan taklif',
  hosts: 'Qaysi oila nomidan',
  from: 'Kimdan (tabrik)',
  photos: 'Suratlar yuborish',
};
// Savollar tartibi (server/bot-wizard.js dagi ORDER bilan bir xil): avval to'y, keyin tug'ilgan kun
const STEP_ORDER = ['kind', 'template', 'eventType', 'groom', 'bride', 'btemplate', 'name', 'birthDate', 'date', 'time', 'venue', 'address', 'map', 'voice', 'hosts', 'from', 'photos'];
const stepRank = (s) => (STEP_ORDER.includes(s) ? STEP_ORDER.indexOf(s) : 99);

/* ------------------------------------ Hisob ------------------------------------ */
const ts = (x) => {
  const n = Date.parse(x || '');
  return Number.isFinite(n) ? n : 0;
};
const median = (arr) => {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
};

/**
 * @param {object} o
 * @param {number} [o.days] — oxirgi necha kunda botga KELGANLAR (0 — hammasi)
 * @param {number} [o.now]
 * @param {object} [o.data] — sinov uchun: { leads, wizard, sites, events }
 */
export function buildFunnel({ days = 30, now = Date.now(), data = null } = {}) {
  const leads = data?.leads ?? readLeads();
  const wizard = data?.wizard ?? readWizard();
  const sites = data?.sites ?? listSites();
  const events = data?.events ?? readEvents();
  const since = days > 0 ? now - days * DAY : 0;

  // Har bir foydalanuvchi bo'yicha yig'ma ma'lumot
  const users = new Map();
  const U = (id) => {
    id = String(id);
    if (!users.has(id)) users.set(id, { id, first: Infinity, src: '', stage: -1, lastStep: '', lastStepAt: 0, errSteps: new Set(), demos: false, blocked: false, resets: 0, wizard: null, nudgedAt: 0, back: false });
    return users.get(id);
  };
  const reach = (u, stage) => (u.stage = Math.max(u.stage, STAGES.findIndex(([k]) => k === stage)));
  const seen = (u, t, src) => {
    if (t && t < u.first) u.first = t;
    if (src && !u.src) u.src = src;
  };

  for (const [id, l] of Object.entries(leads)) {
    const u = U(id);
    seen(u, ts(l.at), l.src);
    u.src = l.src || u.src;
    u.blocked = !!l.blocked;
    reach(u, 'start');
  }
  for (const [id, w] of Object.entries(wizard)) {
    if (!w || w.edit) continue; // tayyor taklifnomani o'zgartirish — voronkaga kirmaydi
    const u = U(id);
    seen(u, w.at);
    reach(u, 'start');
    reach(u, 'wizard');
    u.wizard = { step: w.step, at: w.at || 0 };
  }
  for (const s of sites) {
    const m = s.meta || {};
    if (!m.owner?.id) continue;
    const u = U(m.owner.id);
    seen(u, ts(m.createdAt), m.source);
    reach(u, 'start');
    reach(u, 'wizard');
    reach(u, 'draft');
    if (m.awaitingAt || [STATUS.awaiting, STATUS.receipt, STATUS.paid, STATUS.rejected].includes(m.status)) reach(u, 'pay');
    if (m.receipt || [STATUS.receipt, STATUS.rejected].includes(m.status)) reach(u, 'receipt');
    if (m.status === STATUS.paid) {
      // Panel orqali (chek yubormasdan) tasdiqlangan bo'lsa ham — oldingi bosqichlar o'tilgan hisoblanadi
      reach(u, 'pay');
      reach(u, 'receipt');
      reach(u, 'paid');
    }
  }

  // Jurnal
  let logFrom = Infinity;
  const stepUsers = {}; // qadam → shu savolga yetgan foydalanuvchilar
  const errUsers = {}; // qadam → javobi qabul qilinmagan foydalanuvchilar
  const startedAt = new Map();
  const doneAt = new Map();
  for (const ev of events) {
    const t = ts(ev.t);
    if (!ev.u || !t) continue;
    logFrom = Math.min(logFrom, t);
    const u = U(ev.u);
    seen(u, t, ev.src);
    reach(u, 'start');
    // Eslatmadan keyin qaytib, savollarga javob bergan / yaratishni boshlagan
    if (u.nudgedAt && t > u.nudgedAt && ['wz_start', 'wz_step', 'wz_done', 'pay'].includes(ev.e)) u.back = true;
    switch (ev.e) {
      case 'demos':
        u.demos = true;
        break;
      case 'nudge':
        if (!u.nudgedAt) u.nudgedAt = t;
        break;
      case 'wz_start':
        reach(u, 'wizard');
        if (!startedAt.has(u.id)) startedAt.set(u.id, t);
        break;
      case 'wz_step':
        reach(u, 'wizard');
        if (t >= u.lastStepAt) {
          u.lastStep = ev.s;
          u.lastStepAt = t;
        }
        (stepUsers[ev.s] ||= new Set()).add(u.id);
        break;
      case 'wz_err':
        u.errSteps.add(ev.s);
        (errUsers[ev.s] ||= new Set()).add(u.id);
        break;
      case 'wz_reset':
        u.resets++;
        break;
      case 'wz_done':
        reach(u, 'draft');
        if (!doneAt.has(u.id)) doneAt.set(u.id, t);
        break;
      case 'pay':
        reach(u, 'pay');
        break;
      case 'receipt':
        reach(u, 'receipt');
        break;
      case 'paid':
        reach(u, 'paid');
        break;
      default:
    }
  }

  // Davr: shu kunlarda botga birinchi marta kelganlar
  const cohort = [...users.values()].filter((u) => u.stage >= 0 && (since === 0 || (u.first !== Infinity && u.first >= since)));

  const counts = STAGES.map((_, i) => cohort.filter((u) => u.stage >= i).length);
  const funnel = STAGES.map(([key, title, short], i) => ({
    key,
    title,
    short,
    count: counts[i],
    ofPrev: i && counts[i - 1] ? counts[i] / counts[i - 1] : null,
    ofAll: counts[0] ? counts[i] / counts[0] : null,
    lost: i < STAGES.length - 1 ? counts[i] - counts[i + 1] : 0,
  }));

  // Savollarning qaysi birida to'xtagan: «yaratish»ni bosgan, lekin qoralamagacha yetmaganlar
  const ACTIVE = 30 * 60e3; // so'nggi 30 daqiqada yozayotganlar — hali to'xtamagan bo'lishi mumkin
  const stuck = {};
  let activeNow = 0;
  for (const u of cohort.filter((x) => x.stage === 1)) {
    // wizard.json da yozuvi bor — savollar hali ochiq; yo'q bo'lsa (/start bosgan, eskirgan) — jurnaldagi oxirgi savol
    if (u.wizard?.step && now - u.wizard.at < ACTIVE) {
      activeNow++;
      continue;
    }
    const step = u.wizard?.step || u.lastStep || '?';
    const row = (stuck[step] ||= { step, title: STEP_TITLES[step] || (step === '?' ? 'noma’lum (jurnal boshlanishidan oldin)' : step), count: 0, withErr: 0 });
    row.count++;
    if (u.errSteps.has(step)) row.withErr++;
  }
  const stuckList = Object.values(stuck).sort((a, b) => b.count - a.count || stepRank(a.step) - stepRank(b.step));

  // Har bir savolga yetganlar (faqat jurnal bo'yicha, shu davrda kelganlar)
  const inCohort = new Set(cohort.map((u) => u.id));
  const steps = Object.keys(stepUsers)
    .sort((a, b) => stepRank(a) - stepRank(b))
    .map((s) => ({ step: s, title: STEP_TITLES[s] || s, reached: [...stepUsers[s]].filter((id) => inCohort.has(id)).length, errors: [...(errUsers[s] || [])].filter((id) => inCohort.has(id)).length }))
    .filter((r) => r.reached);

  // Qoralamadan keyin to'xtaganlar
  const after = {
    onlyStart: cohort.filter((u) => u.stage === 0).length,
    onlyStartDemos: cohort.filter((u) => u.stage === 0 && u.demos).length,
    draftNoPay: cohort.filter((u) => u.stage === 2).length,
    payNoReceipt: cohort.filter((u) => u.stage === 3).length,
    receiptWaiting: cohort.filter((u) => u.stage === 4).length,
    blocked: cohort.filter((u) => u.blocked).length,
    nudged: cohort.filter((u) => u.nudgedAt).length,
    nudgedBack: cohort.filter((u) => u.nudgedAt && u.back).length,
  };

  // Manbalar (reklama havolalari)
  const bySrc = {};
  for (const u of cohort) {
    const r = (bySrc[u.src || 'organik'] ||= { src: u.src || 'organik', start: 0, wizard: 0, draft: 0, paid: 0 });
    r.start++;
    if (u.stage >= 1) r.wizard++;
    if (u.stage >= 2) r.draft++;
    if (u.stage >= 5) r.paid++;
  }
  const sources = Object.values(bySrc).sort((a, b) => b.start - a.start || b.paid - a.paid);

  const wizMinutes = [...doneAt].filter(([id]) => startedAt.has(id) && inCohort.has(id)).map(([id, t]) => (t - startedAt.get(id)) / 60e3);

  return {
    days,
    since,
    now,
    total: cohort.length,
    funnel,
    stuck: stuckList,
    activeNow,
    steps,
    after,
    sources,
    wizardMedianMin: median(wizMinutes),
    logFrom: logFrom === Infinity ? 0 : logFrom,
    hasLog: logFrom !== Infinity,
  };
}

/* ------------------------------------ Matn ------------------------------------ */
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const pct = (x) => (x == null ? '' : `${Math.round(x * 100)}%`);
const day = (t) => new Date(t + 5 * 3600e3).toISOString().slice(0, 10); // Toshkent

/** Telegram HTML matni (4096 belgidan oshsa — bo'lib yuboriladi, splitText ga qarang) */
export function funnelText(r) {
  const L = [];
  L.push(`📊 <b>Voronka — ${r.days ? `oxirgi ${r.days} kun` : 'butun davr'}</b>`);
  L.push(`<i>${r.days ? `${day(r.since)} dan beri` : 'Hamma vaqt'} botga kelgan ${r.total} kishi qayergacha yetdi:</i>`);
  L.push('');
  if (!r.total) {
    L.push('Bu davrda botga hech kim kelmagan.');
    return L.join('\n');
  }
  r.funnel.forEach((f, i) => {
    const bar = '▇'.repeat(Math.max(f.count ? 1 : 0, Math.round((f.ofAll || 0) * 10)));
    L.push(`${f.title}\n   <b>${f.count}</b> ${bar} ${i ? `${pct(f.ofAll)}${f.ofPrev != null ? ` · oldingisidan ${pct(f.ofPrev)}` : ''}` : ''}`.trimEnd());
  });

  // Eng katta yo'qotish
  const drops = r.funnel.slice(0, -1).map((f, i) => ({ from: f, to: r.funnel[i + 1], lost: f.lost })).filter((d) => d.from.count);
  const worst = drops.sort((a, b) => b.lost - a.lost)[0];
  if (worst?.lost) {
    L.push('');
    L.push(`🔻 <b>Eng ko‘p yo‘qotish:</b> ${esc(worst.from.short)} → ${esc(worst.to.short)}: ${worst.lost} kishi (${pct(worst.lost / worst.from.count)}) keyingi qadamga o‘tmagan.`);
  }

  L.push('');
  L.push('<b>Qayerda to‘xtab qolishgan:</b>');
  L.push(`• Faqat /start bosib, yaratishni boshlamagan: <b>${r.after.onlyStart}</b>${r.hasLog ? ` (shundan namunalarni ko‘rgan: ${r.after.onlyStartDemos})` : ''}`);
  const inWizard = r.stuck.reduce((a, x) => a + x.count, 0);
  L.push(`• Savollar o‘rtasida qolgan: <b>${inWizard}</b>${r.activeNow ? ` (+${r.activeNow} hozir yozyapti)` : ''}`);
  L.push(`• Qoralama tayyor, «To‘lov qilish»ni bosmagan: <b>${r.after.draftNoPay}</b>`);
  L.push(`• To‘lov oynasini ochgan, chek yubormagan: <b>${r.after.payNoReceipt}</b>`);
  if (r.after.receiptWaiting) L.push(`• Chek yuborgan, tasdiq kutilmoqda / rad etilgan: <b>${r.after.receiptWaiting}</b>`);
  if (r.after.blocked) L.push(`• Botni bloklagan: ${r.after.blocked}`);
  if (r.after.nudged) L.push(`📨 Eslatma yuborilgan: ${r.after.nudged} → qaytib davom ettirgan: <b>${r.after.nudgedBack}</b>`);

  if (r.stuck.length) {
    L.push('');
    L.push('<b>Savollarning qaysi birida chiqib ketishgan:</b>');
    for (const s of r.stuck.slice(0, 12)) L.push(`• ${esc(s.title)}: <b>${s.count}</b>${s.withErr ? ` (${s.withErr} tasida javob xato deb qaytarilgan)` : ''}`);
  }

  if (r.steps.length) {
    L.push('');
    L.push('<b>Har bir savolga yetganlar</b> (jurnal bo‘yicha):');
    for (const s of r.steps) L.push(`• ${esc(s.title)}: ${s.reached}${s.errors ? ` · ❗ xato javob: ${s.errors}` : ''}`);
    if (r.wizardMedianMin != null) L.push(`<i>Savollarni tugatish uchun o‘rtacha ${Math.max(1, Math.round(r.wizardMedianMin))} daqiqa ketgan.</i>`);
  }

  if (r.sources.length > 1 || r.sources[0]?.src !== 'organik') {
    L.push('');
    L.push('<b>Manbalar</b> — keldi → boshladi → qoralama → to‘ladi:');
    for (const s of r.sources.slice(0, 10)) L.push(`• ${esc(s.src)}: ${s.start} → ${s.wizard} → ${s.draft} → <b>${s.paid}</b>`);
  }

  L.push('');
  if (!r.hasLog) {
    L.push('ℹ️ <i>Qadamlar jurnali hali bo‘sh — hisobot hozirgi holat bo‘yicha. Kimdir savollar o‘rtasida /start bossa yoki qoralamasi 10 kundan keyin o‘chirilsa, u «faqat /start bosgan» bo‘lib ko‘rinadi. Bir necha kundan keyin raqamlar aniqlashadi.</i>');
  } else if (r.since < r.logFrom) {
    L.push(`ℹ️ <i>Qadamlar jurnali ${day(r.logFrom)} dan yozilmoqda; undan oldingi qism hozirgi holat bo‘yicha (to‘liq emas). Aniq raqam uchun: /voronka ${Math.max(1, Math.ceil((r.now - r.logFrom) / DAY))}</i>`);
  }
  L.push('<i>Boshqa davr: /voronka 7 · /voronka 90 · /voronka 0 (hammasi)</i>');
  return L.join('\n');
}

/** Uzun matnni Telegram chegarasi (4096) ichida bo'laklarga bo'lish — bo'limlar bo'yicha */
export function splitText(text, max = 3900) {
  const parts = [];
  let cur = '';
  for (const block of text.split('\n\n')) {
    const add = cur ? `${cur}\n\n${block}` : block;
    if (add.length <= max) cur = add;
    else {
      if (cur) parts.push(cur);
      cur = block.slice(0, max);
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

/* ------------------------------------ Buyruq satri ------------------------------------ */
// Serverda: cd /opt/taklifnoma/current && sudo -u taklifnoma node server/funnel.js 30
const isMain = () => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};
if (process.argv[1] && isMain()) {
  const days = Number(process.argv[2] ?? 30);
  const text = funnelText(buildFunnel({ days: Number.isFinite(days) ? days : 30 }));
  console.log(text.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}
