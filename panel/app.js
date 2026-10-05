// Telegram Mini App: mijoz o'z taklifnomasini qadamma-qadam yaratadi (boshqaruv.<domen>/app).
// Ma'lumot — /api/panel/app/* (server/app-api.js), kirish — Telegram imzosi. Jonli ko'rinish — panelning
// preview-*.html sahifalari (saytning haqiqiy kodi bilan).
import './app.css';
import { html, raw } from '../src/lib/dom.js';
import { EVENTS, findEvent, eventTexts } from '../src/lib/events.js';
import { parseMapInput } from '../src/lib/maps.js';
import { MONTHS, isValidDate, TIME_RE, validateConfig } from '../src/lib/config.js';
import { defaultConfig, addDays, todayIso } from '../src/lib/starter.js';
import { slotsFor, getField, usedMedia } from '../src/lib/photo-slots.js';

const tg = window.Telegram?.WebApp;
const root = document.getElementById('app');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clone = (x) => JSON.parse(JSON.stringify(x));

/* ------------------------------------ Shablonlar ------------------------------------ */
const DESIGNS = {
  volume5: { title: 'Our Story', note: 'Konvert ochiladi, raqsdagi juftlik videosi, zaytun ranglar', img: '/images/og-volume5.jpg', demo: 'demo-volume5', preview: 'volume5' },
  volume3: { title: 'Yashil bog‘', note: 'Akvarel gullar, nafis va yorug‘', img: '/images/og-volume3.jpg', demo: 'demo-volume3', preview: 'volume3' },
  volume4: { title: 'Pushti bog‘', note: 'Pushti gullar, mayin va romantik', img: '/images/og-volume4.jpg', demo: 'demo-volume4', preview: 'volume3' },
  osmon: { title: 'To‘y kechasining osmoni', note: 'Haqiqiy yulduzli osmon, ismlar — yulduz turkumi', img: '/images/og-osmon.jpg', demo: 'demo-osmon', preview: 'osmon' },
  volume2: { title: 'Klassik', note: 'Oq-oltin konvert, muhr, gul barglari', img: '/images/hero-arch.webp', demo: 'demo', preview: 'v2' },
  suzani: { title: 'Tirik suzani', note: 'O‘zbek suzanisi o‘zi tikiladi', img: '/images/og-suzani.jpg', demo: 'demo-suzani', preview: 'suzani' },
  bulut: { title: 'Bulutlar ustida', note: 'Samolyot chiptasi, osmonda ismlar', img: '/images/og-bulut.jpg', demo: 'demo-bulut', preview: 'bulut' },
  kitob: { title: '3D sehrli kitob', note: 'Varaqlanadigan kitob, pop-up sahifalar', img: '/images/og-kitob.jpg', demo: 'demo-kitob', preview: 'kitob' },
  yz: { title: 'Kino uslubida', note: 'Qora-tilla, katta suratlar', img: '/images/yz/wedding1.jpg', demo: 'demo-yz', preview: 'yz' },
};
const STATUS = {
  draft: ['📝', 'Tayyorlanmoqda'],
  awaiting: ['💳', 'To‘lov kutilmoqda'],
  receipt: ['🧾', 'Chek tekshirilmoqda'],
  paid: ['✅', 'Faol'],
  rejected: ['⚠️', 'Chek tasdiqlanmadi'],
};

/* ------------------------------------ Holat ------------------------------------ */
const state = {
  me: null,
  mediaUrls: {}, // fayl nomi → ko'rsatish uchun blob: URL (qoralama rasmlari ochiq emas)
  ed: null, // { slug, config, status, step, textTouched, saving }
};

/* ------------------------------------ API ------------------------------------ */
async function api(name, { method = 'GET', body, query = '' } = {}) {
  const res = await fetch(`/api/panel/app/${name}${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg?.initData || '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false, message: 'Server javob bermadi' }));
  return json;
}

/* ------------------------------------ Yordamchilar ------------------------------------ */
function toast(text) {
  $('.tg-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'tg-toast';
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.classList.add('is-on'));
  setTimeout(() => el.remove(), 3800);
}
const haptic = (kind = 'light') => tg?.HapticFeedback?.impactOccurred?.(kind);
const prettyDate = (iso) => {
  if (!isValidDate(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}-${MONTHS[m - 1]} ${y}`;
};
const fmtSum = (n) => `${String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`;
const solo = (c) => c.couple?.showGroom === false;
const namesOf = (c) => (solo(c) || !c.couple?.groom ? c.couple?.bride || '' : `${c.couple.groom} & ${c.couple.bride}`);
const autoText = (c) =>
  eventTexts(c.eventType, solo(c) ? false : c.couple?.groom, c.couple?.bride, 'uz', c.invitedBy === 'couple' ? 'couple' : 'parents').invitation;

/* ------------------------------------ Qadamlar ------------------------------------ */
const STEPS = [
  { id: 'design', title: 'Dizayn', newOnly: true },
  { id: 'event', title: 'Marosim', newOnly: true },
  { id: 'names', title: 'Ismlar' },
  { id: 'date', title: 'Sana va vaqt' },
  { id: 'venue', title: 'To‘yxona' },
  { id: 'music', title: 'Musiqa' },
  { id: 'photos', title: 'Rasmlar' },
  { id: 'text', title: 'Taklif matni', skip: (c) => c.template === 'yz' },
  { id: 'preview', title: 'Ko‘rinish' },
];
// To'langan saytda dizayn va marosim turi o'zgarmaydi (qoralamada — o'zgaradi)
const stepsFor = (ed) => STEPS.filter((s) => !(s.newOnly && ed.status === 'paid') && !s.skip?.(ed.config));

/* ------------------------------------ Bosh sahifa ------------------------------------ */
function showHome() {
  state.ed = null;
  tg?.BackButton?.hide?.();
  const me = state.me;
  const sites = me.sites || [];
  root.innerHTML = String(html`
    <main class="tg-page">
      <header class="tg-hero">
        <p class="tg-eyebrow">Onlayn taklifnoma</p>
        <h1>Assalomu alaykum${me.user?.name ? `, ${me.user.name}` : ''}! 🌸</h1>
        <p class="tg-lead">Taklifnomangizni 5 daqiqada o‘zingiz yarating — natijani darhol ko‘rasiz. Yoqsa, to‘lov qilasiz.</p>
      </header>
      <button class="tg-btn tg-btn--primary tg-btn--big" type="button" data-act="new">✨ Yangi taklifnoma yaratish</button>
      ${sites.length
        ? html`<h2 class="tg-h2">Mening taklifnomalarim</h2>
            <div class="tg-list">
              ${sites.map((s) => {
                const [icon, label] = STATUS[s.status] || ['', s.status];
                const ev = findEvent(s.eventType);
                return html`<article class="tg-card">
                  <div class="tg-card__top">
                    <span class="tg-badge tg-badge--${s.status}">${icon} ${label}${s.paused ? ' · to‘xtatilgan' : ''}</span>
                    <span class="tg-muted">${DESIGNS[s.template]?.title || s.template}</span>
                  </div>
                  <p class="tg-card__names">${s.groom ? `${s.groom} & ${s.bride}` : s.bride || 'Ismsiz'}</p>
                  <p class="tg-muted">${ev.icon} ${ev.title} · ${prettyDate(s.date)}</p>
                  <div class="tg-row">
                    <button class="tg-btn" type="button" data-act="edit" data-slug="${s.slug}">✏️ ${s.status === 'paid' ? 'Tahrirlash' : 'Davom ettirish'}</button>
                    ${s.url ? html`<a class="tg-btn" href="${s.url}" target="_blank" rel="noopener" data-open="${s.url}">🌐 Ochish</a>` : ''}
                    ${s.status !== 'paid' ? html`<button class="tg-btn tg-btn--ghost" type="button" data-act="remove" data-slug="${s.slug}">🗑</button>` : ''}
                  </div>
                  ${s.status === 'paid' && !s.paused ? videoRow(s) : ''}
                </article>`;
              })}
            </div>`
        : html`<p class="tg-muted tg-center">Narxi: <b>${fmtSum(me.price)}</b> · namunalarni bot menyusidagi «👀 Namunalar»da ko‘ring</p>`}
    </main>`);
}

/** To'langan sayt kartasida: Instagram video (buyurtma / holat / olish) */
const VIDEO_STATE = { awaiting: '💳 Video: to‘lov kutilmoqda', receipt: '🧾 Video: chek tekshirilmoqda', paid: '⏳ Video navbatda', rendering: '⏳ Video tayyorlanmoqda', 'with-site': '⏳ Video navbatda', failed: '⚠️ Video: admin tekshiryapti' };
function videoRow(s) {
  if (s.video === 'done') return html`<div class="tg-row"><button class="tg-btn" type="button" data-act="video" data-slug="${s.slug}">🎬 Videoni olish</button></div>`;
  if (['receipt', 'paid', 'rendering', 'with-site', 'failed'].includes(s.video)) return html`<p class="tg-muted">${VIDEO_STATE[s.video]}</p>`;
  return html`<div class="tg-row"><button class="tg-btn" type="button" data-act="video" data-slug="${s.slug}">🎬 Instagram uchun video — ${fmtSum(state.me.videoPrice)}</button></div>`;
}

async function orderVideo(slug) {
  const r = await api('video', { method: 'POST', body: { slug } });
  if (!r.ok) return toast(r.message || 'Bo‘lmadi');
  haptic('heavy');
  const done = r.video === 'done';
  root.innerHTML = String(html`
    <main class="tg-page tg-done">
      <p class="tg-done__icon">🎬</p>
      <h1>${done ? 'Video bot chatiga yuborildi' : r.video === 'awaiting' ? 'Video buyurtmasi qabul qilindi' : 'Video tayyorlanmoqda'}</h1>
      <p class="tg-lead">${done
        ? 'Bot chatini oching — video o‘sha yerda.'
        : r.video === 'awaiting'
          ? html`To‘lov ma’lumotlari (${fmtSum(state.me.videoPrice)}) <b>bot chatiga</b> yuborildi. Chekni o‘sha chatga yuboring — tasdiqlangach video 10–20 daqiqada tayyor bo‘ladi.`
          : 'Tayyor bo‘lishi bilan bot chatiga yuboramiz.'}</p>
      <button class="tg-btn tg-btn--primary tg-btn--big" type="button" data-act="close">Bot chatiga qaytish</button>
    </main>`);
}

async function removeDraft(slug) {
  const ok = await confirmBox('Bu qoralamani o‘chiraymi?');
  if (!ok) return;
  const r = await api('remove', { method: 'POST', body: { slug } });
  if (!r.ok) return toast(r.message || 'O‘chirib bo‘lmadi');
  state.me.sites = state.me.sites.filter((s) => s.slug !== slug);
  showHome();
}

function confirmBox(text) {
  return new Promise((resolve) => {
    if (tg?.showConfirm) tg.showConfirm(text, (ok) => resolve(!!ok));
    else resolve(window.confirm(text));
  });
}

/* ------------------------------------ Tahrirlash ------------------------------------ */
function startNew() {
  state.ed = { slug: null, config: defaultConfig('volume3', 'nikoh'), status: 'draft', step: 0, textTouched: false };
  state.ed.config.couple = { groom: '', bride: '', initials: '' };
  renderStep();
}

async function openSite(slug) {
  root.innerHTML = '<p class="tg-loading">Yuklanmoqda…</p>';
  const r = await api('site', { query: `?slug=${encodeURIComponent(slug)}` });
  if (!r.ok) {
    toast(r.message || 'Topilmadi');
    return showHome();
  }
  await loadMediaUrls(r.config, slug);
  // Qoralama — ismlardan davom etadi (dizayn/marosim orqaga qaytib o'zgartiriladi)
  state.ed = { slug, video: r.video === 'with-site', config: r.config, status: r.status, url: r.url, step: r.status === 'paid' ? 0 : 2, textTouched: r.config.texts?.invitation && r.config.texts.invitation !== autoText(r.config) };
  renderStep();
}

function stepHtml(id, c) {
  const ed = state.ed;
  if (id === 'design') {
    return html`<p class="tg-lead">Taklifnoma dizaynini tanlang. «Namuna» — tayyor saytni ochib ko‘rish.</p>
      <div class="tg-designs">
        ${state.me.templates.filter((t) => DESIGNS[t]).map((t) => {
          const d = DESIGNS[t];
          return html`<label class="tg-design ${c.template === t ? 'is-on' : ''}">
            <input type="radio" name="design" value="${t}" ${c.template === t ? 'checked' : ''} />
            <span class="tg-design__img" style="background-image:url('${d.img}')"></span>
            <span class="tg-design__title">${d.title}</span>
            <span class="tg-design__note">${d.note}</span>
            ${state.me.domain ? html`<a class="tg-link" href="https://${d.demo}.${state.me.domain}" target="_blank" rel="noopener" data-open="https://${d.demo}.${state.me.domain}">Namuna ↗</a>` : ''}
          </label>`;
        })}
      </div>`;
  }
  if (id === 'event') {
    return html`<p class="tg-lead">Qanday marosim? Matnlar va to‘y dasturi shunga moslanadi.</p>
      <div class="tg-options">
        ${EVENTS.map((e) => html`<label class="tg-option ${c.eventType === e.id ? 'is-on' : ''}">
          <input type="radio" name="event" value="${e.id}" ${c.eventType === e.id ? 'checked' : ''} />
          <span class="tg-option__icon">${e.icon}</span>
          <span><b>${e.title}</b><small>${e.hint}</small></span>
        </label>`)}
      </div>`;
  }
  if (id === 'names') {
    const qiz = c.eventType === 'qiz-uzatish';
    return html`<p class="tg-lead">Ismlarni saytda qanday chiqishi kerak bo‘lsa, shunday yozing.</p>
      <label class="tg-field ${solo(c) ? 'is-off' : ''}"><span>Kuyov ismi</span>
        <input data-path="couple.groom" value="${solo(c) ? '' : c.couple.groom || ''}" placeholder="${solo(c) ? 'Saytda ko‘rsatilmaydi' : 'Masalan: Sardor'}" maxlength="40" autocomplete="off" ${solo(c) ? 'disabled' : ''} /></label>
      <label class="tg-field"><span>Kelin ismi</span>
        <input data-path="couple.bride" value="${c.couple.bride || ''}" placeholder="Masalan: Malika" maxlength="40" autocomplete="off" /></label>
      ${qiz ? html`<label class="tg-check"><input type="checkbox" data-solo ${solo(c) ? 'checked' : ''} /> Kuyov ismini saytda ko‘rsatmaslik</label>` : ''}
      <p class="tg-label">Taklif kimning nomidan?</p>
      <div class="tg-chips">
        <label class="tg-chip ${c.invitedBy !== 'couple' ? 'is-on' : ''}"><input type="radio" name="voice" value="parents" ${c.invitedBy !== 'couple' ? 'checked' : ''} />👨‍👩‍👧 Ota-ona nomidan</label>
        <label class="tg-chip ${c.invitedBy === 'couple' ? 'is-on' : ''}"><input type="radio" name="voice" value="couple" ${c.invitedBy === 'couple' ? 'checked' : ''} />💑 Kelin-kuyov nomidan</label>
      </div>
      ${['volume3', 'volume4'].includes(c.template)
        ? html`<p class="tg-label">Rang</p>
          <div class="tg-chips">
            ${[['green', '🌿 Yashil'], ['pink', '🌸 Pushti']].map(([v, t]) => {
              const on = (c.palette || (c.template === 'volume4' ? 'pink' : 'green')) === v;
              return html`<label class="tg-chip ${on ? 'is-on' : ''}"><input type="radio" name="palette" value="${v}" ${on ? 'checked' : ''} />${t}</label>`;
            })}
          </div>`
        : ''}`;
  }
  if (id === 'date') {
    return html`<p class="tg-lead">${findEvent(c.eventType).title} qachon?</p>
      <label class="tg-field"><span>Sana</span><input type="date" data-path="event.date" value="${c.event.date}" min="${todayIso()}" /></label>
      <label class="tg-field"><span>Boshlanish vaqti</span><input type="time" data-path="event.time" value="${c.event.time}" /></label>
      <p class="tg-muted">To‘y dasturi shu vaqtdan boshlab avtomatik tuziladi.</p>`;
  }
  if (id === 'venue') {
    return html`<p class="tg-lead">Mehmonlar qayerga keladi?</p>
      <label class="tg-field"><span>To‘yxona nomi</span><input data-path="venue.name" value="${c.venue?.name || ''}" placeholder="Masalan: “Navro‘z” to‘yxonasi" maxlength="120" /></label>
      <label class="tg-field"><span>Manzil</span><input data-path="venue.address" value="${c.venue?.address || ''}" placeholder="Shahar, tuman, ko‘cha" maxlength="200" /></label>
      <label class="tg-field"><span>Xaritadagi joylashuv (ixtiyoriy)</span>
        <textarea id="map-input" rows="2" placeholder="Google yoki Yandex xaritadan “Ulashish” havolasini shu yerga qo‘ying">${c.venue?.googleMaps || c.venue?.yandexMaps || ''}</textarea>
        <small class="tg-muted" id="map-note">${c.venue?.googleMaps || c.venue?.yandexMaps ? '✓ Xarita havolasi qo‘shilgan' : 'Xaritada to‘yxonani toping → “Ulashish” → havolani nusxalab shu yerga qo‘ying'}</small>
      </label>`;
  }
  if (id === 'music') {
    return html`<p class="tg-lead">Sayt ochilganda qaysi musiqa yangrasin? ▶ — tinglab ko‘rish.</p>
      <div class="tg-options">
        ${state.me.music.map((t) => html`<label class="tg-option tg-option--music ${c.musicTrack === t.id ? 'is-on' : ''}">
          <input type="radio" name="music" value="${t.id}" ${c.musicTrack === t.id ? 'checked' : ''} />
          <button class="tg-play" type="button" data-play="${t.file}" aria-label="Tinglash">▶</button>
          <span><b>${t.title}</b></span>
        </label>`)}
        <label class="tg-option ${c.musicTrack === 'none' ? 'is-on' : ''}"><input type="radio" name="music" value="none" ${c.musicTrack === 'none' ? 'checked' : ''} /><span class="tg-option__icon">🔇</span><span><b>Musiqasiz</b></span></label>
      </div>`;
  }
  if (id === 'photos') {
    return html`<p class="tg-lead">Xohlasangiz, o‘z suratlaringizni qo‘shing — hammasi ixtiyoriy. Rasm avtomatik kichraytiriladi.</p>
      ${slotsFor(c.template).map((s) => {
        const v = getField(c, s.field);
        const list = (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
        const canAdd = s.multi ? list.length < s.multi : !list.length;
        return html`<section class="tg-slot" data-slot="${s.field}">
          <p class="tg-slot__title">${s.title}${s.multi ? html` <small>${list.length}/${s.multi}</small>` : ''}</p>
          ${s.hint ? html`<p class="tg-muted">${s.hint}</p>` : ''}
          <div class="tg-thumbs">
            ${list.map((n) => html`<figure class="tg-thumb">
              <img src="${state.mediaUrls[n] || ''}" alt="" />
              <button type="button" class="tg-thumb__del" data-unmedia="${s.field}" data-name="${n}" aria-label="O‘chirish">✕</button>
            </figure>`)}
            ${canAdd
              ? html`<label class="tg-thumb tg-thumb--add">
                  <input type="file" accept="image/*" data-upload="${s.field}" ${s.multi ? 'multiple' : ''} />
                  <span>＋<small>${list.length && !s.multi ? 'Almashtirish' : 'Rasm qo‘shish'}</small></span>
                </label>`
              : !s.multi
                ? html`<label class="tg-thumb tg-thumb--add"><input type="file" accept="image/*" data-upload="${s.field}" /><span>↻<small>Almashtirish</small></span></label>`
                : ''}
          </div>
          <p class="tg-muted tg-slot__status" data-status="${s.field}"></p>
        </section>`;
      })}`;
  }
  if (id === 'text') {
    return html`<p class="tg-lead">Taklif matni ismlaringiz bilan tayyor. Xohlasangiz, o‘zgartiring.</p>
      <label class="tg-field"><span>Taklif matni</span><textarea data-path="texts.invitation" rows="8" maxlength="1200">${c.texts?.invitation || autoText(c)}</textarea></label>
      <button class="tg-btn tg-btn--ghost" type="button" data-act="reset-text">↺ Tayyor matnga qaytarish</button>
      <label class="tg-field"><span>Yakuniy so‘z</span><input data-path="texts.closing" value="${c.texts?.closing || ''}" maxlength="200" /></label>
      <label class="tg-field"><span>Taklif qiluvchilar (ixtiyoriy)</span><input data-path="hosts" value="${c.hosts || ''}" placeholder="Masalan: Karimovlar oilasi" maxlength="120" /></label>`;
  }
  if (id === 'preview') {
    const errs = validateConfig(c, [...usedMedia(c)]);
    const paid = ed.status === 'paid';
    return html`<div class="tg-phone"><iframe id="preview-frame" title="Ko‘rinish" src="/preview-${DESIGNS[c.template]?.preview || 'v2'}.html"></iframe></div>
      <div class="tg-summary">
        <p><b>${namesOf(c) || 'Ismlar kiritilmagan'}</b></p>
        <p class="tg-muted">${findEvent(c.eventType).icon} ${findEvent(c.eventType).title} · ${prettyDate(c.event.date)}, ${c.event.time}</p>
        <p class="tg-muted">📍 ${c.venue?.name || 'To‘yxona kiritilmagan'}</p>
        ${errs.length ? html`<p class="tg-warn">⚠ ${errs.length} ta maydon to‘ldirilmagan — orqaga qaytib to‘ldiring</p>` : ''}
        ${paid
          ? html`<p class="tg-muted">Saqlasangiz, o‘zgarishlar ~1 daqiqada saytda paydo bo‘ladi.</p>`
          : html`<label class="tg-addon ${ed.video ? 'is-on' : ''}">
                <input type="checkbox" data-video-addon ${ed.video ? 'checked' : ''} />
                <span><b>🎬 Instagram uchun video ham kerak</b><small>Saytingiz musiqa bilan o‘zi aylanadigan video (Reels/Stories) — +${fmtSum(state.me.videoPrice)}</small></span>
              </label>
              <p class="tg-price">Jami: <b>${fmtSum(state.me.price + (ed.video ? state.me.videoPrice : 0))}</b></p>
              <p class="tg-muted">To‘lov ma’lumotlari bot chatiga keladi. Chekni yuborganingizdan keyin sayt havolasi${ed.video ? ' (va keyin video)' : ''} shu yerga keladi.</p>`}
      </div>`;
  }
  return '';
}

function renderStep() {
  const ed = state.ed;
  const steps = stepsFor(ed);
  ed.step = Math.max(0, Math.min(ed.step, steps.length - 1));
  const step = steps[ed.step];
  const last = ed.step === steps.length - 1;
  const paid = ed.status === 'paid';
  tg?.BackButton?.show?.();
  root.innerHTML = String(html`
    <main class="tg-page tg-page--step">
      <div class="tg-progress"><i style="width:${((ed.step + 1) / steps.length) * 100}%"></i></div>
      <p class="tg-eyebrow">${ed.step + 1}/${steps.length} · ${step.title}</p>
      <form id="step" class="tg-step" autocomplete="off" onsubmit="return false">${raw(String(stepHtml(step.id, ed.config)))}</form>
    </main>
    <nav class="tg-bar">
      <button class="tg-btn" type="button" data-act="back">${ed.step === 0 ? '✕' : '←'}</button>
      ${last
        ? html`<button class="tg-btn tg-btn--primary" type="button" data-act="${paid ? 'save' : 'pay'}" ${ed.saving ? 'disabled' : ''}>${paid ? '💾 Saqlash' : '💳 To‘lovga o‘tish'}</button>`
        : html`<button class="tg-btn tg-btn--primary" type="button" data-act="next" ${ed.saving ? 'disabled' : ''}>Keyingi →</button>`}
    </nav>`);
  window.scrollTo(0, 0);
  if (step.id === 'preview') setTimeout(sendPreview, 50);
}

/* ------------------------------------ Kiritish ------------------------------------ */
function setPath(obj, p, v) {
  const keys = p.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ||= {};
  o[keys.at(-1)] = v;
}

function onInput(e) {
  const t = e.target;
  const ed = state.ed;
  if (!ed) return;
  const c = ed.config;
  if (t.dataset.path) {
    const wasAuto = !ed.textTouched;
    setPath(c, t.dataset.path, t.value);
    if (t.dataset.path === 'texts.invitation') ed.textTouched = t.value.trim() !== autoText(c);
    if (/^couple\./.test(t.dataset.path) && wasAuto && c.texts) c.texts.invitation = autoText(c);
    if (t.dataset.path === 'event.time' && Array.isArray(c.program)) ed.timeChanged = true;
    return;
  }
  if (t.id === 'map-input') {
    const r = parseMapInput(t.value);
    const note = $('#map-note');
    c.venue ||= {};
    if (!t.value.trim()) {
      c.venue.googleMaps = '';
      c.venue.yandexMaps = '';
      delete c.venue.lat;
      delete c.venue.lng;
      note.textContent = 'Xaritada to‘yxonani toping → “Ulashish” → havolani nusxalab shu yerga qo‘ying';
    } else if (r.ok) {
      c.venue.googleMaps = r.googleMaps || '';
      c.venue.yandexMaps = r.yandexMaps || '';
      if (r.lat != null) Object.assign(c.venue, { lat: r.lat, lng: r.lng });
      note.textContent = '✓ Xarita havolasi qo‘shildi';
    } else {
      note.textContent = r.note || 'Havola tushunarsiz — Google yoki Yandex xarita havolasini qo‘ying';
    }
  }
}

function onChange(e) {
  const t = e.target;
  const ed = state.ed;
  if (!ed) return;
  const c = ed.config;
  if (t.name === 'design') {
    // Yangi dizayn — shu marosimning boshlang'ich sozlamalari; mijoz kiritganlari saqlanadi
    ed.config = carryOver(c, defaultConfig(t.value, c.eventType), { keepTime: true });
    haptic();
    return renderStep();
  }
  if (t.name === 'event') {
    // Marosim turi — vaqt, dastur va matnlar shu marosimniki; ismlar, sana, to'yxona saqlanadi
    ed.config = carryOver(c, defaultConfig(c.template, t.value), { keepTime: false });
    if (t.value !== 'qiz-uzatish') delete ed.config.couple.showGroom;
    if (ed.config.texts) ed.config.texts.invitation = autoText(ed.config);
    ed.textTouched = false;
    haptic();
    return renderStep();
  }
  if (t.name === 'voice') {
    c.invitedBy = t.value;
    if (!ed.textTouched && c.texts) c.texts.invitation = autoText(c);
    return renderStep();
  }
  if (t.name === 'palette') {
    c.palette = t.value;
    return renderStep();
  }
  if (t.name === 'music') {
    c.musicTrack = t.value;
    $$('.tg-option--music, .tg-option').forEach((x) => x.classList.toggle('is-on', !!x.querySelector('input:checked')));
    return;
  }
  if (t.matches('[data-video-addon]')) {
    ed.video = t.checked;
    haptic();
    return renderStep();
  }
  if (t.matches('[data-upload]')) {
    const files = [...(t.files || [])];
    if (files.length) uploadFiles(t.dataset.upload, files);
    return;
  }
  if (t.matches('[data-solo]')) {
    c.couple = { ...c.couple };
    if (t.checked) c.couple.showGroom = false;
    else delete c.couple.showGroom;
    if (!ed.textTouched && c.texts) c.texts.invitation = autoText(c);
    return renderStep();
  }
}

/** Dizayn/marosim almashtirilganda mijoz kiritgan ma'lumotlar yangi boshlang'ich sozlamaga ko'chiriladi. */
function carryOver(from, to, { keepTime }) {
  to.couple = { ...from.couple };
  to.event = { ...to.event, date: from.event.date, ...(keepTime ? { time: from.event.time } : {}) };
  to.venue = { ...to.venue, ...from.venue };
  if (from.invitedBy) to.invitedBy = from.invitedBy;
  if (from.palette && ['volume3', 'volume4'].includes(to.template)) to.palette = from.palette;
  if (from.hosts && 'hosts' in to) to.hosts = from.hosts;
  if (to.texts && from.texts && to.template !== 'yz') {
    to.texts = { ...to.texts };
    // Qo'lda yozilgan taklif matni saqlanadi; avtomatik matn yangi ismlar bilan qayta tuziladi
    to.texts.invitation = state.ed?.textTouched && from.texts.invitation ? from.texts.invitation : autoText(to);
    if (from.texts.closing) to.texts.closing = from.texts.closing;
  }
  return to;
}

/* ------------------------------------ Ko'rinish ------------------------------------ */
function previewConfig(c) {
  const p = clone(c);
  p.couple = { ...p.couple };
  if (p.eventType === 'qiz-uzatish' && !p.couple.groom?.trim()) p.couple.showGroom = false;
  p.couple.groom = p.couple.groom?.trim() || 'Kuyov';
  p.couple.bride = p.couple.bride?.trim() || 'Kelin';
  p.venue = { ...p.venue, name: p.venue?.name?.trim() || 'To‘yxona nomi', address: p.venue?.address?.trim() || 'Manzil' };
  if (!isValidDate(p.event?.date)) p.event.date = addDays(todayIso(), 45);
  if (!TIME_RE.test(p.event?.time || '')) p.event.time = '18:00';
  if (p.texts && !p.texts.invitation) p.texts.invitation = autoText(p);
  delete p.paused;
  return p;
}
function sendPreview() {
  const frame = $('#preview-frame');
  if (!frame?.contentWindow || !state.ed) return;
  frame.contentWindow.postMessage({ config: previewConfig(state.ed.config), media: { ...state.mediaUrls }, mediaBase: '/media/' }, location.origin);
}
window.addEventListener('message', (e) => {
  if (e.origin === location.origin && e.data?.previewReady) sendPreview();
});

/* ------------------------------------ Rasmlar ------------------------------------ */
// Telefondagi katta rasm brauzerda kichraytiriladi (1600 px, JPEG) — tez yuklanadi, sayt tez ochiladi
async function compressImage(file, maxSide = 1600, quality = 0.84) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  const b64 = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1]);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
  return { b64, url: URL.createObjectURL(blob) };
}

/** Saytdagi rasmlarni ko'rsatish uchun yuklab olish (qoralama rasmlari faqat egasiga ochiq) */
async function loadMediaUrls(c, slug) {
  await Promise.all(
    [...usedMedia(c)].filter((n) => !state.mediaUrls[n]).map(async (n) => {
      try {
        const r = await fetch(`/api/panel/app/media?slug=${encodeURIComponent(slug)}&name=${encodeURIComponent(n)}`, { headers: { 'X-Telegram-Init-Data': tg?.initData || '' } });
        if (r.ok) state.mediaUrls[n] = URL.createObjectURL(await r.blob());
      } catch {
        /* ko'rinishda rasm chiqmaydi, xolos */
      }
    }),
  );
}

async function uploadFiles(field, files) {
  const ed = state.ed;
  const status = $(`[data-status="${field}"]`);
  for (const [i, file] of files.entries()) {
    if (status) status.textContent = files.length > 1 ? `Yuklanmoqda… ${i + 1}/${files.length}` : 'Yuklanmoqda…';
    try {
      const { b64, url } = await compressImage(file);
      const r = await api('upload', { method: 'POST', body: { slug: ed.slug, field, data: b64 } });
      if (!r.ok) {
        toast(r.message || 'Rasm yuklanmadi');
        break;
      }
      state.mediaUrls[r.name] = url;
      setPathValue(ed.config, field, r.value);
      if (field === 'backgroundImage' && ed.config.template === 'volume2') ed.config.backgroundOverlay ??= 0.84;
    } catch {
      toast('Bu faylni o‘qib bo‘lmadi — boshqa rasm tanlang');
      break;
    }
  }
  haptic();
  renderStep();
}

async function removeMedia(field, name) {
  const ed = state.ed;
  const r = await api('unmedia', { method: 'POST', body: { slug: ed.slug, field, name } });
  if (!r.ok) return toast(r.message || 'O‘chirib bo‘lmadi');
  setPathValue(ed.config, field, r.value ?? undefined);
  if (field === 'backgroundImage') delete ed.config.backgroundOverlay;
  renderStep();
}

function setPathValue(c, field, value) {
  const keys = field.split('.');
  let o = c;
  for (const k of keys.slice(0, -1)) o = o[k] && typeof o[k] === 'object' ? o[k] : (o[k] = {});
  if (value == null || value === '') delete o[keys.at(-1)];
  else o[keys.at(-1)] = value;
}

/* ------------------------------------ Saqlash / to'lov ------------------------------------ */
function payload(c) {
  return {
    template: c.template,
    eventType: c.eventType,
    couple: { groom: solo(c) ? '' : c.couple.groom, bride: c.couple.bride, showGroom: solo(c) ? false : undefined },
    invitedBy: c.invitedBy,
    palette: c.palette,
    event: { date: c.event.date, time: c.event.time },
    venue: c.venue,
    hosts: c.hosts,
    texts: c.texts,
    musicTrack: c.musicTrack,
    autoScroll: c.autoScroll,
  };
}

async function saveDraft({ quiet = false } = {}) {
  const ed = state.ed;
  ed.saving = true;
  try {
    const r = await api('save', { method: 'POST', body: { slug: ed.slug || undefined, config: payload(ed.config) } });
    if (!r.ok) {
      toast(r.message || 'Saqlab bo‘lmadi');
      return false;
    }
    if (!ed.slug) {
      ed.slug = r.slug;
      state.me.sites = [{ slug: r.slug, template: ed.config.template, eventType: ed.config.eventType, groom: ed.config.couple.groom, bride: ed.config.couple.bride, date: ed.config.event.date, status: r.status }, ...state.me.sites];
    }
    ed.status = r.status;
    if (!quiet) toast(r.status === 'paid' ? '✓ Saqlandi — saytda 1 daqiqada yangilanadi' : '✓ Saqlandi');
    return r;
  } catch {
    toast('Internet aloqasini tekshiring');
    return false;
  } finally {
    ed.saving = false;
  }
}

function stepErrors(id, c) {
  if (id === 'names') {
    if (!c.couple.bride?.trim()) return 'Kelin ismini yozing';
    if (!solo(c) && !c.couple.groom?.trim()) return c.eventType === 'qiz-uzatish' ? 'Kuyov ismini yozing yoki «ko‘rsatmaslik»ni belgilang' : 'Kuyov ismini yozing';
  }
  if (id === 'date') {
    if (!isValidDate(c.event.date)) return 'Sanani tanlang';
    if (c.event.date < todayIso()) return 'Sana o‘tib ketgan — kelgusidagi sanani tanlang';
    if (!TIME_RE.test(c.event.time || '')) return 'Vaqtni tanlang';
  }
  if (id === 'venue' && !c.venue?.name?.trim()) return 'To‘yxona nomini yozing';
  return '';
}

async function next() {
  const ed = state.ed;
  const steps = stepsFor(ed);
  const step = steps[ed.step];
  const err = stepErrors(step.id, ed.config);
  if (err) {
    haptic('medium');
    return toast(err);
  }
  // Dizayn va marosim tanlangach — ismlardan boshlab har qadamda saqlanadi (to'xtab qolsa ham yo'qolmaydi)
  if (!['design', 'event'].includes(step.id)) {
    const r = await saveDraft({ quiet: true });
    if (!r) return;
  }
  ed.step += 1;
  haptic();
  renderStep();
}

async function pay() {
  const ed = state.ed;
  const r = await saveDraft({ quiet: true });
  if (!r) return;
  const errs = validateConfig(ed.config, [...usedMedia(ed.config)]);
  if (errs.length) return toast('Barcha maydonlarni to‘ldiring');
  const p = await api('pay', { method: 'POST', body: { slug: ed.slug, video: !!ed.video } });
  if (!p.ok) return toast(p.message || 'Xato');
  haptic('heavy');
  root.innerHTML = String(html`
    <main class="tg-page tg-done">
      <p class="tg-done__icon">💳</p>
      <h1>Ajoyib! Taklifnomangiz tayyor</h1>
      <p class="tg-lead">To‘lov ma’lumotlari <b>bot chatiga</b> yuborildi. To‘lov qilib, chek rasmini o‘sha chatga yuboring — tasdiqlangach, sayt havolasi darhol keladi.</p>
      <button class="tg-btn tg-btn--primary tg-btn--big" type="button" data-act="close">Bot chatiga qaytish</button>
    </main>`);
}

/* ------------------------------------ Hodisalar ------------------------------------ */
let audio = null;
root.addEventListener('input', onInput);
root.addEventListener('change', onChange);
root.addEventListener('click', async (e) => {
  const open = e.target.closest('[data-open]');
  if (open && tg?.openLink) {
    e.preventDefault();
    return tg.openLink(open.dataset.open);
  }
  const play = e.target.closest('[data-play]');
  if (play) {
    e.preventDefault();
    if (audio && !audio.paused && audio.dataset.src === play.dataset.play) {
      audio.pause();
      play.textContent = '▶';
      return;
    }
    audio?.pause();
    $$('[data-play]').forEach((b) => (b.textContent = '▶'));
    audio = new Audio(play.dataset.play);
    audio.dataset.src = play.dataset.play;
    audio.play().catch(() => toast('Ijro etib bo‘lmadi'));
    play.textContent = '⏸';
    audio.onended = () => (play.textContent = '▶');
    return;
  }
  const del = e.target.closest('[data-unmedia]');
  if (del) {
    e.preventDefault();
    if (await confirmBox('Bu rasmni olib tashlaymi?')) removeMedia(del.dataset.unmedia, del.dataset.name);
    return;
  }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'new') return startNew();
  if (act === 'edit') return openSite(b.dataset.slug);
  if (act === 'remove') return removeDraft(b.dataset.slug);
  if (act === 'next') return next();
  if (act === 'back') return back();
  if (act === 'pay') return pay();
  if (act === 'video') return orderVideo(b.dataset.slug);
  if (act === 'close') return tg?.close ? tg.close() : showHome();
  if (act === 'save') {
    const r = await saveDraft();
    if (r) {
      await loadMe();
      showHome();
    }
  }
  if (act === 'reset-text') {
    const c = state.ed.config;
    c.texts.invitation = autoText(c);
    state.ed.textTouched = false;
    $('[data-path="texts.invitation"]').value = c.texts.invitation;
  }
});

function back() {
  audio?.pause();
  const ed = state.ed;
  if (!ed) return tg?.close?.();
  if (ed.step === 0) return loadMe().then(showHome);
  ed.step -= 1;
  renderStep();
}
tg?.BackButton?.onClick?.(back);

/* ------------------------------------ Ishga tushirish ------------------------------------ */
function applyTheme() {
  const p = tg?.themeParams || {};
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries({ bg: p.bg_color, text: p.text_color, hint: p.hint_color, link: p.link_color, btn: p.button_color, 'btn-text': p.button_text_color, card: p.secondary_bg_color })) {
    if (v) r.setProperty(`--tg-${k}`, v);
  }
  if (tg?.colorScheme) document.documentElement.dataset.scheme = tg.colorScheme;
}

async function loadMe() {
  const r = await api('me');
  if (!r.ok) throw Object.assign(new Error(r.message || 'Kirish xatosi'), { code: r.error });
  state.me = r;
  return r;
}

async function boot() {
  tg?.ready?.();
  tg?.expand?.();
  applyTheme();
  tg?.onEvent?.('themeChanged', applyTheme);
  try {
    await loadMe();
  } catch (err) {
    root.innerHTML = String(html`<main class="tg-page tg-done"><p class="tg-done__icon">🤖</p><h1>Telegram orqali oching</h1>
      <p class="tg-lead">${err.message}. Taklifnomani bot menyusidagi «✨ Taklifnoma yaratish» tugmasi orqali oching.</p></main>`);
    return;
  }
  const slug = new URLSearchParams(location.search).get('slug');
  if (slug && state.me.sites.some((s) => s.slug === slug)) return openSite(slug);
  showHome();
}
boot();
