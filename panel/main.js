// Boshqaruv paneli: mijozlar ro'yxati, yangi to'y yaratish, tahrirlash, jonli ko'rinish, saqlash.
import './panel.css';
import { html, raw, esc } from '../src/lib/dom.js';
import { TEMPLATES, findTemplate } from '../src/lib/templates.js';
import { PROGRAM_PRESETS, buildProgram, suggestProgramPreset, shiftProgram, DRESS_PRESETS } from '../src/lib/presets.js';
import { parseMapInput } from '../src/lib/maps.js';
import { MUSIC_LIBRARY, findTrack } from '../src/lib/music.js';
import { validateConfig, isValidDate, TIME_RE, MONTHS } from '../src/lib/config.js';
import { latinToCyrillic } from '../src/lib/translit.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const root = document.getElementById('panel');

// Panel boshqaruv.<domen> da ochiladi; mijoz saytlari <nom>.<domen>
const DOMAIN = location.hostname.startsWith('boshqaruv.') ? location.hostname.slice('boshqaruv.'.length) : 'documen.uz';
const siteUrl = (slug) => `https://${slug}.${DOMAIN}`;

/* ------------------------------------------------------------------ */
/*  API                                                                */
/* ------------------------------------------------------------------ */
const TOKEN_KEY = 'boshqaruv-token';
const token = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },
  set: (v) => {
    try {
      if (v) sessionStorage.setItem(TOKEN_KEY, v);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* sessionStorage yo'q */
    }
  },
};

async function api(name, { method = 'GET', body, query = '' } = {}) {
  const res = await fetch(`/api/panel/${name}${query}`, {
    method,
    headers: { Authorization: `Bearer ${token.get()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'bad_response' }));
  if (res.status === 401) {
    token.set('');
    showLogin('Parol noto‘g‘ri yoki sessiya tugadi');
    throw new Error('unauthorized');
  }
  return { status: res.status, ...json };
}

/* ------------------------------------------------------------------ */
/*  Yordamchilar                                                       */
/* ------------------------------------------------------------------ */
const clone = (v) => JSON.parse(JSON.stringify(v));

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function set(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  }
  o[keys[keys.length - 1]] = value;
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function prettyDate(iso) {
  if (!isValidDate(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}-${MONTHS[m - 1]} ${y}`;
}

// "Sanjar", "Dilnoza" → "sanjar-dilnoza"
function toSlug(...parts) {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function autoInvitation(c) {
  const g = c.couple?.groom?.trim() || 'Kuyov';
  const b = c.couple?.bride?.trim() || 'Kelin';
  return `Sizni farzandlarimiz ${g} va ${b}ning hayotlaridagi eng quvonchli kun — nikoh to‘yi marosimiga taklif etamiz. Ushbu baxtli kunimizni siz bilan birga nishonlashdan mamnun bo‘lamiz.`;
}

// Config'dagi barcha matn qiymatlari (qaysi media fayllar ishlatilayotganini aniqlash uchun)
function strings(v, out = new Set()) {
  if (typeof v === 'string') out.add(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

/* ------------------------------------------------------------------ */
/*  Rasm siqish (brauzerda) va yuklash                                  */
/* ------------------------------------------------------------------ */
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
  return { b64, url: URL.createObjectURL(blob), size: blob.size };
}

function pickFiles({ multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.onchange = () => resolve([...(input.files || [])]);
    input.click();
  });
}

/* ------------------------------------------------------------------ */
/*  Holat                                                              */
/* ------------------------------------------------------------------ */
const state = {
  clients: [],
  deploy: null,
  deployed: '',
  ed: null, // tahrirlanayotgan to'y
};

function newEditor({ slug = '', isNew, config, media = [], source = 'json' }) {
  return {
    slug,
    isNew,
    source,
    config,
    media, // serverdagi mavjud fayllar
    uploads: {}, // nom → { b64, url } (hali saqlanmagan)
    slugTouched: !isNew,
    invitationTouched: !isNew,
    dirty: false,
    saving: false,
  };
}

function mediaSrc(name) {
  const ed = state.ed;
  if (!name) return '';
  if (ed.uploads[name]) return ed.uploads[name].url;
  return ed.isNew ? '' : `${siteUrl(ed.slug)}/media/${name}`;
}

function uploadName(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}.jpg`;
}

async function addUpload(prefix, file, maxSide) {
  const { b64, url } = await compressImage(file, maxSide);
  const name = uploadName(prefix);
  state.ed.uploads[name] = { b64, url };
  return name;
}

/* ------------------------------------------------------------------ */
/*  Boshlang'ich config'lar                                             */
/* ------------------------------------------------------------------ */
function defaultConfig(template) {
  const date = addDays(todayIso(), 45);
  if (template === 'yz') {
    return {
      template: 'yz',
      couple: { groom: '', bride: '', initials: '' },
      event: { date, time: '16:00', timezone: '+05:00', durationHours: 5 },
      venue: { name: '', address: '', googleMaps: '', yandexMaps: '', mapEmbed: '' },
      photos: {},
      musicTrack: 'musiqa-4',
      rsvp: { enabled: true, deadline: addDays(date, -1), maxGuests: 5 },
      ru: {},
      texts: { uz: {}, ru: {} },
      seo: { title: '', description: '', ogImage: '' },
    };
  }
  const kechki = DRESS_PRESETS.find((p) => p.id === 'kechki');
  if (template === 'osmon') {
    return {
      template: 'osmon',
      couple: { groom: '', bride: '', initials: '' },
      event: { date, time: '19:00', timezone: '+05:00', durationHours: 5 },
      hosts: '',
      texts: {
        heroCaption: 'Nikoh to‘yiga taklifnoma',
        greeting: 'Hurmatli mehmonimiz!',
        invitation: autoInvitation({}),
        closing: 'Tashrifingiz biz uchun katta sharaf!',
      },
      venue: { name: '', address: '', googleMaps: '', yandexMaps: '' },
      sky: { city: '', lat: '', lng: '' },
      program: buildProgram('kechki', '19:00'),
      dressCode: { text: kechki.text, colors: [...kechki.colors] },
      musicTrack: 'musiqa-3',
      rsvp: { enabled: true, deadline: addDays(date, -1), maxGuests: 5, showWishes: true },
      contacts: [],
      seo: { title: '', description: '', ogImage: '' },
    };
  }
  return {
    template: 'volume2',
    couple: { groom: '', bride: '', initials: '' },
    event: { date, time: '18:00', timezone: '+05:00', durationHours: 5 },
    hosts: '',
    texts: {
      heroCaption: 'Nikoh to‘yiga taklifnoma',
      greeting: 'Hurmatli mehmonimiz!',
      invitation: autoInvitation({}),
      closing: 'Tashrifingiz biz uchun katta sharaf!',
    },
    venue: { name: '', address: '', googleMaps: '', yandexMaps: '', image: '' },
    program: buildProgram('kechki', '18:00'),
    dressCode: { text: kechki.text, colors: [...kechki.colors] },
    gallery: [],
    musicTrack: 'musiqa-1',
    rsvp: { enabled: true, deadline: addDays(date, -1), maxGuests: 5, showWishes: true },
    contacts: [],
    seo: { title: '', description: '', ogImage: '' },
    theme: {},
    effects: { envelope: true, petals: true, typing: true },
  };
}

// Jonli ko'rinish uchun: bo'sh maydonlar vaqtincha namuna qiymat bilan to'ldiriladi
function previewConfig(c) {
  const p = clone(c);
  p.couple = { ...p.couple, groom: p.couple?.groom?.trim() || 'Kuyov', bride: p.couple?.bride?.trim() || 'Kelin' };
  p.event = { ...p.event };
  if (!isValidDate(p.event.date)) p.event.date = addDays(todayIso(), 45);
  if (!TIME_RE.test(p.event.time || '')) p.event.time = '18:00';
  p.venue = { ...p.venue, name: p.venue?.name?.trim() || 'To‘yxona nomi', address: p.venue?.address?.trim() || 'Manzil' };
  if (Array.isArray(p.program)) p.program = p.program.filter((x) => TIME_RE.test(x.time || '') && x.title?.trim());
  if (p.template !== 'yz' && p.texts && !p.texts.invitation) p.texts.invitation = autoInvitation(p);
  return p;
}

/* ------------------------------------------------------------------ */
/*  Kirish                                                             */
/* ------------------------------------------------------------------ */
function showLogin(message = '') {
  root.innerHTML = html`
    <div class="login">
      <form id="login-form">
        <p class="brand">Boshqaruv <small>Taklifnomalar paneli</small></p>
        <label class="f"><span>Parol</span><input type="password" name="password" autocomplete="current-password" required autofocus /></label>
        ${message ? html`<p class="hint" style="color:var(--red)">${message}</p>` : ''}
        <button class="btn btn--primary" type="submit">Kirish</button>
      </form>
    </div>
  `;
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button', e.target);
    btn.disabled = true;
    token.set(e.target.password.value.trim());
    try {
      const r = await api('clients');
      if (r.ok) {
        state.clients = r.clients;
        state.deploy = r.deploy;
        state.deployed = r.deployed;
        route();
      } else if (r.error === 'no_password') showLogin('Serverda OWNER_PASSWORD o‘rnatilmagan');
      else if (r.error === 'too_many_attempts') showLogin('Juda ko‘p urinish — 10 daqiqadan keyin qayta urining');
      else showLogin(r.message || 'Xatolik');
    } catch {
      /* showLogin allaqachon chaqirilgan */
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Ustki panel va deploy holati                                        */
/* ------------------------------------------------------------------ */
function deployPill() {
  const d = state.deploy;
  if (d?.state === 'building') return html`<span class="deploy-pill"><i class="dot dot--busy"></i>Saytlar yig‘ilmoqda…</span>`;
  if (d?.state === 'failed' && d.sha !== state.deployed) {
    return html`<span class="deploy-pill"><i class="dot dot--fail"></i>Oxirgi yig‘ish xato bilan tugadi</span>`;
  }
  return html`<span class="deploy-pill"><i class="dot"></i>Server: ${state.deployed ? state.deployed.slice(0, 7) : '—'}</span>`;
}

function topbar(extra = '') {
  return html`
    <header class="top">
      <a class="brand" href="#/" style="text-decoration:none">Boshqaruv</a>
      ${extra}
      <span class="top__spacer"></span>
      <span id="deploy-pill">${deployPill()}</span>
      <button class="btn btn--ghost btn--small" data-action="logout" type="button">Chiqish</button>
    </header>
  `;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-action="logout"]')) {
    token.set('');
    showLogin();
  }
});

async function refreshStatus() {
  try {
    const r = await api('status');
    if (r.ok) {
      state.deploy = r.deploy;
      state.deployed = r.deployed;
      const pill = $('#deploy-pill');
      if (pill) pill.innerHTML = deployPill();
    }
    return r;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Ro'yxat                                                            */
/* ------------------------------------------------------------------ */
async function showList() {
  state.ed = null;
  root.innerHTML = html`${topbar()}<div class="wrap"><p class="empty">Yuklanmoqda…</p></div>`;
  const r = await api('clients').catch(() => null);
  if (!r?.ok) return;
  state.clients = r.clients;
  state.deploy = r.deploy;
  state.deployed = r.deployed;
  renderList('');
}

function renderList(filter) {
  const today = todayIso();
  const q = filter.trim().toLowerCase();
  const items = state.clients
    .filter((c) => !q || `${c.slug} ${c.groom} ${c.bride} ${c.venue}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const pa = a.date < today;
      const pb = b.date < today;
      if (pa !== pb) return pa ? 1 : -1;
      return pa ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    });

  root.innerHTML = html`
    ${topbar()}
    <div class="wrap">
      <div class="list-head">
        <h1>To‘ylar (${state.clients.length})</h1>
        <input class="search" id="search" type="search" placeholder="Qidirish: ism, manzil…" value="${filter}" />
        <a class="btn btn--primary" href="#/yangi">+ Yangi to‘y</a>
      </div>
      <div class="cards">
        ${items.length
          ? items.map((c) => {
              const past = c.date && c.date < today;
              const soon = !past && c.date && c.date <= addDays(today, 7);
              const tpl = findTemplate(c.template);
              return html`
                <article class="card ${past ? 'card--past' : ''}">
                  <div class="actions-row">
                    <span class="badge ${c.template === 'yz' ? 'badge--yz' : c.template === 'osmon' ? 'badge--osmon' : ''}">${tpl?.title || c.template}</span>
                    ${soon ? html`<span class="badge badge--soon">Yaqinda</span>` : ''}
                    ${past ? html`<span class="badge">O‘tgan</span>` : ''}
                  </div>
                  <p class="card__names">${c.groom} & ${c.bride}</p>
                  <p class="card__meta">${prettyDate(c.date)}${c.time ? `, soat ${c.time}` : ''} · ${c.venue}</p>
                  <p class="card__meta">${c.rsvp ? `Javoblar: ${c.rsvp.total} · keladi: ${c.rsvp.attending} (${c.rsvp.guests} kishi)` : 'Javoblar: baza ulanmagan'}</p>
                  <div class="card__actions">
                    <a class="btn btn--small btn--primary" href="#/tahrir/${c.slug}">Tahrirlash</a>
                    <a class="btn btn--small" href="#/nusxa/${c.slug}">Nusxa olish</a>
                    <a class="btn btn--small btn--ghost" href="${siteUrl(c.slug)}" target="_blank" rel="noopener">Saytni ochish ↗</a>
                  </div>
                </article>
              `;
            })
          : html`<p class="empty">Hech narsa topilmadi</p>`}
      </div>
    </div>
  `;
  const search = $('#search');
  search.addEventListener('input', () => {
    renderList(search.value);
    const s = $('#search');
    s.focus();
    s.setSelectionRange(s.value.length, s.value.length);
  });
}

/* ------------------------------------------------------------------ */
/*  Shablon tanlash                                                     */
/* ------------------------------------------------------------------ */
const TEMPLATE_IMAGES = { volume2: '/images/hero-arch.webp', yz: '/images/yz/wedding1.jpg', osmon: '/images/og-osmon.jpg' };

function showTemplatePicker() {
  root.innerHTML = html`
    ${topbar()}
    <div class="wrap">
      <div class="list-head"><h1>Yangi to‘y — shablonni tanlang</h1></div>
      <div class="templates">
        ${TEMPLATES.filter((t) => t.panel !== false).map(
          (t) => html`
            <button class="tpl" type="button" data-template="${t.id}">
              <img src="${TEMPLATE_IMAGES[t.id]}" alt="" loading="lazy" />
              <div class="tpl__body">
                <p class="tpl__title">${t.title}</p>
                <p class="tpl__desc">${t.description}</p>
              </div>
            </button>
          `,
        )}
      </div>
      <p class="hint" style="margin-top:1rem">Namunalar: <a href="${siteUrl('demo')}" target="_blank" rel="noopener">Volume 2</a> · <a href="${siteUrl('demo-yz')}" target="_blank" rel="noopener">Yusuf & Zulayho</a></p>
    </div>
  `;
  $$('[data-template]').forEach((b) =>
    b.addEventListener('click', () => {
      state.ed = newEditor({ isNew: true, config: defaultConfig(b.dataset.template) });
      showEditor();
    }),
  );
}

/* ------------------------------------------------------------------ */
/*  Tahrirlash: forma bo'laklari                                        */
/* ------------------------------------------------------------------ */
function field(label, path, { type = 'text', placeholder = '', hint = '', attrs = '' } = {}) {
  const v = get(state.ed.config, path) ?? '';
  return html`
    <label class="f" data-field="${path}">
      <span>${label}</span>
      <input type="${type}" data-path="${path}" value="${v}" placeholder="${placeholder}" ${raw(attrs)} />
      ${hint ? html`<small class="hint">${hint}</small>` : ''}
    </label>
  `;
}

function area(label, path, { rows = 3, placeholder = '', hint = '' } = {}) {
  const v = get(state.ed.config, path) ?? '';
  return html`
    <label class="f" data-field="${path}">
      <span>${label}</span>
      <textarea data-path="${path}" rows="${rows}" placeholder="${placeholder}">${v}</textarea>
      ${hint ? html`<small class="hint">${hint}</small>` : ''}
    </label>
  `;
}

function check(label, path, def = false) {
  const v = get(state.ed.config, path);
  return html`<label class="check"><input type="checkbox" data-path="${path}" data-kind="bool" ${(v ?? def) ? 'checked' : ''} /> ${label}</label>`;
}

function section(id, title, body, { open = false, toggle = null } = {}) {
  const on = toggle ? toggle.on : true;
  return html`
    <details class="sec ${on ? '' : 'sec--off'}" id="sec-${id}" ${open ? 'open' : ''}>
      <summary>${title}</summary>
      <div class="sec__body">
        ${toggle ? html`<div class="toggle-row"><label class="check"><input type="checkbox" data-toggle="${id}" ${on ? 'checked' : ''} /> ${toggle.label}</label></div>` : ''}
        ${body}
      </div>
    </details>
  `;
}

/* --- Asosiy ma'lumotlar --- */
function secMain() {
  const ed = state.ed;
  const c = ed.config;
  const slugTaken = ed.isNew && state.clients.some((x) => x.slug === ed.slug);
  return section(
    'main',
    'Asosiy ma’lumotlar',
    html`
      <div class="grid2">
        ${field('Kuyov ismi', 'couple.groom', { placeholder: 'Sanjar' })}
        ${field('Kelin ismi', 'couple.bride', { placeholder: 'Dilnoza' })}
      </div>
      <div class="grid3">
        ${field('Sana', 'event.date', { type: 'date' })}
        ${field('Vaqt', 'event.time', { type: 'time' })}
        ${field('Muhrdagi harflar', 'couple.initials', { placeholder: 'avtomatik', hint: 'Bo‘sh — ismlardan' })}
      </div>
      ${c.template !== 'yz' ? field('Taklif qiluvchilar (oila nomi)', 'hosts', { placeholder: 'To‘rayevlar va Qurbonovlar oilasi', hint: 'Bo‘sh qoldirilsa ko‘rsatilmaydi' }) : ''}
      ${ed.isNew
        ? html`
            <label class="f ${slugTaken ? 'f--bad' : ''}">
              <span>Sayt manzili</span>
              <input id="slug" value="${ed.slug}" placeholder="sanjar-dilnoza" />
              <small class="hint ${slugTaken ? '' : 'hint--ok'}" id="slug-hint">${slugTaken ? 'Bu nom band — boshqasini yozing' : ed.slug ? `${siteUrl(ed.slug)}` : 'Ismlardan avtomatik tuziladi'}</small>
            </label>
          `
        : html`<p class="hint">Sayt: <a href="${siteUrl(ed.slug)}" target="_blank" rel="noopener">${siteUrl(ed.slug)}</a></p>`}
    `,
    { open: true },
  );
}

/* --- Manzil va xarita --- */
function secVenue() {
  const c = state.ed.config;
  const v = c.venue || {};
  const parts = [];
  if (v.googleMaps) parts.push(html`<span>✓ Google: <a href="${v.googleMaps}" target="_blank" rel="noopener">havola</a></span>`);
  if (v.yandexMaps) parts.push(html`<span>✓ Yandex: <a href="${v.yandexMaps}" target="_blank" rel="noopener">havola</a></span>`);
  if (c.template === 'yz' && v.mapEmbed) parts.push(html`<span>✓ Sahifadagi xarita</span>`);
  return section(
    'venue',
    'Manzil va xarita',
    html`
      ${field('To‘yxona nomi', 'venue.name', { placeholder: '“Zumrad” to‘yxonasi' })}
      ${field('Manzil', 'venue.address', { placeholder: 'Navoiy viloyati, Qiziltepa tumani…' })}
      <label class="f">
        <span>Xarita: mijoz yuborgan havola, &lt;iframe&gt; kodi yoki koordinata</span>
        <textarea id="map-input" rows="3" placeholder="https://maps.app.goo.gl/…  yoki  <iframe src=…>  yoki  40.1461, 65.1949"></textarea>
        <small class="hint" id="map-note">Joylashtirsangiz, Google va Yandex havolalari o‘zi tuziladi</small>
      </label>
      <div class="map-result" id="map-result" ${parts.length ? '' : 'hidden'}>${parts}</div>
      <details>
        <summary class="hint" style="cursor:pointer">Havolalarni qo‘lda tahrirlash</summary>
        <div class="grid2" style="margin-top:.6rem">
          ${field('Google Maps havolasi', 'venue.googleMaps')}
          ${field('Yandex havolasi', 'venue.yandexMaps')}
        </div>
      </details>
    `,
    { open: state.ed.isNew },
  );
}

/* --- Osmon (osmon shabloni) --- */
// Yulduzlar qaysi joy uchun hisoblanadi: sky.lat/lng → xarita havolasidagi koordinata → Toshkent
function skyStatus(c) {
  const lat = c.sky?.lat;
  const lng = c.sky?.lng;
  if (lat !== '' && lat != null && lng !== '' && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return { ok: true, text: `✓ Osmon shu nuqta uchun hisoblanadi: ${lat}, ${lng}` };
  }
  for (const src of [c.venue?.googleMaps, c.venue?.yandexMaps]) {
    const r = parseMapInput(src || '');
    if (r.ok && r.lat != null) return { ok: true, text: `✓ Koordinata xarita havolasidan olinadi: ${r.lat}, ${r.lng}` };
  }
  return { ok: false, text: '⚠ Koordinata topilmadi — Toshkent osmoni ko‘rsatiladi. Xaritaga koordinata (masalan 40.1461, 65.1949) yoki to‘liq havola kiriting, yoki quyida qo‘lda yozing.' };
}

function updateSkyStatus() {
  const el = $('#sky-status');
  if (!el) return;
  const st = skyStatus(state.ed.config);
  el.textContent = st.text;
  el.className = `hint ${st.ok ? 'hint--ok' : 'hint--warn'}`;
}

function secSky() {
  const st = skyStatus(state.ed.config);
  return section(
    'sky',
    'Osmon (yulduzlar qaysi joy uchun)',
    html`
      <small class="hint ${st.ok ? 'hint--ok' : 'hint--warn'}" id="sky-status">${st.text}</small>
      ${field('Shahar nomi', 'sky.city', { placeholder: 'Samarqand', hint: 'Saytda: “… Samarqand osmonida”. Bo‘sh qoldirilsa — to‘yxona nomi' })}
      <div class="grid2">
        ${field('Kenglik (lat)', 'sky.lat', { type: 'number', placeholder: '39.6542', attrs: 'step="any"' })}
        ${field('Uzunlik (lng)', 'sky.lng', { type: 'number', placeholder: '66.9597', attrs: 'step="any"' })}
      </div>
      <small class="hint">Xaritaga koordinatali havola kiritilsa, bu yer o‘zi to‘ladi.</small>
    `,
    { open: state.ed.isNew },
  );
}

/* --- To'y dasturi --- */
function programRows() {
  const rows = state.ed.config.program || [];
  return html`
    ${rows.map(
      (r, i) => html`
        <div class="row">
          <input type="time" data-program="${i}" data-key="time" value="${r.time}" />
          <input data-program="${i}" data-key="title" value="${r.title}" placeholder="Tadbir" />
          <button class="icon-btn" type="button" data-program-del="${i}" aria-label="O‘chirish">✕</button>
        </div>
      `,
    )}
  `;
}

function secProgram() {
  const c = state.ed.config;
  const on = (c.program || []).length > 0;
  return section(
    'program',
    'To‘y dasturi',
    html`
      <div class="actions-row">
        <select id="program-preset">
          ${PROGRAM_PRESETS.map((p) => html`<option value="${p.id}" ${p.id === suggestProgramPreset(c.event?.time) ? 'selected' : ''}>${p.title}</option>`)}
        </select>
        <button class="btn btn--small" type="button" data-action="program-preset">Shablondan qo‘yish</button>
        <button class="btn btn--small btn--gold" type="button" data-action="program-auto">✨ Vaqtga qarab avtomatik</button>
      </div>
      <small class="hint">Vaqt boshlanish soatidan hisoblanadi. To‘y vaqti o‘zgarsa, dastur ham o‘zi suriladi.</small>
      <div class="rows" id="program-rows">${programRows()}</div>
      <div><button class="btn btn--small" type="button" data-action="program-add">+ Tadbir qo‘shish</button></div>
    `,
    { toggle: { on, label: 'Saytda to‘y dasturini ko‘rsatish' } },
  );
}

/* --- Dress-kod --- */
function colorsHtml() {
  const colors = state.ed.config.dressCode?.colors || [];
  return html`
    ${colors.map(
      (col, i) => html`<span class="swatch"><input type="color" data-color="${i}" value="${col}" /><button type="button" data-color-del="${i}" aria-label="O‘chirish">×</button></span>`,
    )}
    ${colors.length < 6 ? html`<button class="btn btn--small" type="button" data-action="color-add">+ Rang</button>` : ''}
  `;
}

function secDress() {
  const c = state.ed.config;
  const on = !!c.dressCode?.text;
  return section(
    'dress',
    'Dress-kod',
    html`
      <div class="actions-row">
        <select id="dress-preset">
          ${DRESS_PRESETS.filter((p) => p.id !== 'none').map((p) => html`<option value="${p.id}">${p.title}</option>`)}
        </select>
        <button class="btn btn--small" type="button" data-action="dress-preset">Shablondan qo‘yish</button>
      </div>
      ${area('Matn', 'dressCode.text', { rows: 2 })}
      <div class="f"><span>Ranglar (bo‘sh bo‘lsa ko‘rsatilmaydi)</span><div class="colors" id="colors">${colorsHtml()}</div></div>
    `,
    { toggle: { on, label: 'Saytda dress-kodni ko‘rsatish' } },
  );
}

/* --- Aloqa --- */
function contactRows() {
  return html`
    ${(state.ed.config.contacts || []).map(
      (r, i) => html`
        <div class="row row--contact">
          <input data-contact="${i}" data-key="name" value="${r.name}" placeholder="Kuyov tomoni" />
          <input data-contact="${i}" data-key="phone" value="${r.phone}" placeholder="+998 90 123 45 67" inputmode="tel" />
          <button class="icon-btn" type="button" data-contact-del="${i}" aria-label="O‘chirish">✕</button>
        </div>
      `,
    )}
  `;
}

function secContacts() {
  const on = (state.ed.config.contacts || []).length > 0;
  return section(
    'contacts',
    'Aloqa uchun telefon',
    html`
      <div class="rows" id="contact-rows">${contactRows()}</div>
      <div><button class="btn btn--small" type="button" data-action="contact-add">+ Raqam qo‘shish</button></div>
    `,
    { toggle: { on, label: 'Saytda aloqa raqamlarini ko‘rsatish' } },
  );
}

/* --- Rasmlar (volume2) --- */
function galleryHtml() {
  const c = state.ed.config;
  return html`
    ${(c.gallery || []).map(
      (n, i) => html`<div class="thumb"><img src="${mediaSrc(n)}" alt="" /><button class="thumb__x" type="button" data-gallery-del="${i}" aria-label="O‘chirish">✕</button></div>`,
    )}
    <button class="upload" type="button" data-action="gallery-add">+ Rasm qo‘shish</button>
  `;
}

function secGallery() {
  const c = state.ed.config;
  const on = (c.gallery || []).length > 0 || state.ed.galleryOn;
  return section(
    'gallery',
    'Galereya (“Lahzalarimiz”)',
    html`
      <div class="thumbs" id="gallery-thumbs">${galleryHtml()}</div>
      <div class="actions-row">
        <label class="check"><input type="radio" name="gstyle" value="grid" ${c.galleryStyle !== 'garland' ? 'checked' : ''} /> To‘r (grid)</label>
        <label class="check"><input type="radio" name="gstyle" value="garland" ${c.galleryStyle === 'garland' ? 'checked' : ''} /> Ipga osilgan (suriladi)</label>
      </div>
    `,
    { toggle: { on, label: 'Saytda galereyani ko‘rsatish' } },
  );
}

function secBackground() {
  const c = state.ed.config;
  const on = !!c.backgroundImage;
  return section(
    'background',
    'Fon rasmi',
    html`
      <div class="thumbs">
        ${c.backgroundImage
          ? html`<div class="thumb"><img src="${mediaSrc(c.backgroundImage)}" alt="" /></div>`
          : ''}
        <button class="upload" type="button" data-action="bg-set">${c.backgroundImage ? 'Almashtirish' : '+ Rasm tanlash'}</button>
      </div>
      <label class="f">
        <span>Rasm ustidagi parda: <b id="veil-val">${Math.round((c.backgroundOverlay ?? 0.84) * 100)}%</b> (ko‘p — matn aniqroq, rasm xiraroq)</span>
        <input type="range" min="0.5" max="0.95" step="0.01" data-path="backgroundOverlay" data-kind="number" value="${c.backgroundOverlay ?? 0.84}" />
      </label>
    `,
    { toggle: { on, label: 'Butun sahifa ortida surat' } },
  );
}

function secGiftNote() {
  const on = !!state.ed.config.giftNote?.title;
  return section(
    'giftnote',
    'Sovg‘a haqida matn (xarita o‘rnida)',
    html`
      <div class="grid2">
        ${field('Kichik sarlavha', 'giftNote.eyebrow')}
        ${field('Sarlavha', 'giftNote.title')}
      </div>
      ${area('Matn', 'giftNote.text', { rows: 3 })}
    `,
    { toggle: { on, label: '“Kelishingizning o‘zi sovg‘a” matnini ko‘rsatish' } },
  );
}

/* --- Rasmlar (yz) --- */
const YZ_PHOTOS = [
  ['hero', 'Bosh sahifa'],
  ['invitation', 'Taklif'],
  ['details', 'Tafsilotlar'],
  ['countdown', 'Sanoq'],
  ['map', 'Xarita'],
  ['gift', 'Sovg‘a'],
];

function yzPhotosHtml() {
  const photos = state.ed.config.photos || {};
  return html`
    ${YZ_PHOTOS.map(([key, label], i) => {
      const own = photos[key];
      return html`
        <div class="thumb">
          <img src="${own ? mediaSrc(own) : `/images/yz/wedding${i + 1}.jpg`}" alt="" />
          ${own ? '' : html`<span class="thumb__tag">standart</span>`}
          <span>${label}</span>
          <div class="actions-row" style="justify-content:center">
            <button class="link" type="button" data-photo-set="${key}">${own ? 'Almashtirish' : 'Yuklash'}</button>
            ${own ? html`<button class="link" type="button" data-photo-reset="${key}">Standart</button>` : ''}
          </div>
        </div>
      `;
    })}
  `;
}

function secYzPhotos() {
  return section(
    'photos',
    'Bo‘limlar suratlari',
    html`<small class="hint">Yuklanmagan bo‘limlarda shablonning o‘z surati turadi.</small><div class="thumbs" id="yz-photos">${yzPhotosHtml()}</div>`,
  );
}

function secYzCard() {
  const on = !!state.ed.config.giftCard?.number;
  return section(
    'card',
    'Sovg‘a kartasi',
    html`
      <div class="grid2">
        ${field('Karta raqami', 'giftCard.number', { placeholder: '8600 1234 5678 9012', attrs: 'inputmode="numeric"' })}
        ${field('Karta egasi', 'giftCard.holder', { placeholder: 'kuyov ismi' })}
      </div>
      <div class="grid2">
        <label class="f"><span>Karta turi</span>
          <select data-path="giftCard.bank">
            ${['Uzcard', 'Humo', 'Visa', 'Mastercard', ''].map((b) => html`<option value="${b}" ${(state.ed.config.giftCard?.bank || '') === b ? 'selected' : ''}>${b || '— ko‘rsatilmasin —'}</option>`)}
          </select>
        </label>
        ${field('Amal qilish muddati (ixtiyoriy)', 'giftCard.expiry', { placeholder: '09/30' })}
      </div>
    `,
    { toggle: { on, label: 'Kartani ko‘rsatish (o‘chiq bo‘lsa — faqat “Kelaman” tugmasi)' } },
  );
}

function secYzRu() {
  const c = state.ed.config;
  const ph = (v) => (v ? latinToCyrillic(v) : '');
  return section(
    'ru',
    'Rus tilidagi ko‘rinish',
    html`
      <small class="hint">Bo‘sh maydonlar avtomatik kirillga o‘giriladi (ko‘rsatilgan). Xato bo‘lsa, to‘g‘risini yozing.</small>
      <div class="grid2">
        ${field('Kuyov (ruscha)', 'ru.groom', { placeholder: ph(c.couple?.groom) })}
        ${field('Kelin (ruscha)', 'ru.bride', { placeholder: ph(c.couple?.bride) })}
      </div>
      ${field('To‘yxona nomi (ruscha)', 'ru.venueName', { placeholder: c.venue?.name || '' })}
      ${field('Manzil (ruscha)', 'ru.address', { placeholder: ph(c.venue?.address) })}
    `,
  );
}

function secYzTexts() {
  return section(
    'yztexts',
    'Matnlar (ixtiyoriy)',
    html`
      <small class="hint">Bo‘sh qoldirilsa shablonning asl matni turadi.</small>
      ${field('Sarlavha ostidagi yozuv', 'texts.uz.heroSubtitle', { placeholder: 'To‘yimizga taklif etamiz' })}
      ${field('Murojaat', 'texts.uz.invTitle', { placeholder: 'Hurmatli va aziz mehmon!' })}
      ${area('Taklif matni', 'texts.uz.invText', { rows: 4, placeholder: 'Sizni hayotimizdagi eng quvonchli ayyom…' })}
      ${field('Murojaat (ruscha)', 'texts.ru.invTitle', { placeholder: 'Уважаемый и дорогой гость!' })}
      ${area('Taklif matni (ruscha)', 'texts.ru.invText', { rows: 4, placeholder: 'От всей души приглашаем вас…' })}
    `,
  );
}

/* --- Matnlar (volume2) --- */
function secTexts() {
  return section(
    'texts',
    'Taklif matni',
    html`
      <div class="grid2">
        ${field('Bosh sahifadagi yozuv', 'texts.heroCaption')}
        ${field('Murojaat', 'texts.greeting')}
      </div>
      ${area('Asosiy matn', 'texts.invitation', { rows: 4, hint: 'Ismlar o‘zgarsa, o‘zi yangilanadi (qo‘lda tahrirlamaguncha)' })}
      <div><button class="link" type="button" data-action="invitation-auto">Matnni ismlardan qayta tuzish</button></div>
      ${field('Yakuniy so‘z', 'texts.closing')}
    `,
  );
}

/* --- Musiqa va javoblar --- */
function secMusicRsvp() {
  const c = state.ed.config;
  const current = c.musicTrack === 'none' ? 'none' : c.musicTrack ? `track:${c.musicTrack}` : c.music ? 'file' : 'none';
  return section(
    'music',
    'Musiqa va mehmon javoblari',
    html`
      <div class="actions-row">
        <label class="f" style="flex:1">
          <span>Fon musiqasi</span>
          <select id="music-select">
            ${MUSIC_LIBRARY.map((t) => html`<option value="track:${t.id}" ${current === `track:${t.id}` ? 'selected' : ''}>${t.title}</option>`)}
            ${c.music ? html`<option value="file" ${current === 'file' ? 'selected' : ''}>Mijozning o‘z fayli (${c.music})</option>` : ''}
            <option value="none" ${current === 'none' ? 'selected' : ''}>Musiqasiz</option>
          </select>
        </label>
        <button class="btn btn--small" type="button" data-action="music-play" style="align-self:end">▶ Tinglash</button>
      </div>
      <div class="toggle-row">${check('Mehmonlar javob yubora olsin', 'rsvp.enabled', true)} ${c.template === 'volume2' || !c.template ? check('Tilaklarni saytda ko‘rsatish', 'rsvp.showWishes', true) : ''}</div>
      <div class="grid2">
        ${field('Javob qabul qilish muddati', 'rsvp.deadline', { type: 'date', hint: 'Odatda to‘ydan 1 kun oldin' })}
        ${field('Bir javobda ko‘pi bilan necha kishi', 'rsvp.maxGuests', { type: 'number', attrs: 'min="1" max="20"' })}
      </div>
    `,
  );
}

function secEffects() {
  return section(
    'effects',
    'Effektlar',
    html`<div class="toggle-row">${check('Ochiladigan konvert', 'effects.envelope', true)} ${check('Gul barglari', 'effects.petals', true)} ${check('Yozuv effekti (harfma-harf)', 'effects.typing', true)}</div>`,
  );
}

function secSeo() {
  return section(
    'seo',
    'Havola ulashilganda (Telegram, Instagram)',
    html`
      ${field('Sarlavha', 'seo.title', { placeholder: 'avtomatik: Kuyov & Kelin — Taklifnoma' })}
      ${area('Qisqa tavsif', 'seo.description', { rows: 2, placeholder: 'avtomatik tuziladi' })}
    `,
  );
}

/* ------------------------------------------------------------------ */
/*  Tahrirlash sahifasi                                                 */
/* ------------------------------------------------------------------ */
async function openExisting(slug, { copy = false } = {}) {
  root.innerHTML = html`${topbar()}<div class="wrap"><p class="empty">Yuklanmoqda…</p></div>`;
  const r = await api('client', { query: `?slug=${encodeURIComponent(slug)}` }).catch(() => null);
  if (!r?.ok) {
    root.innerHTML = html`${topbar()}<div class="wrap"><p class="empty">${r?.message || 'Topilmadi'}</p></div>`;
    return;
  }
  if (state.clients.length === 0) {
    const l = await api('clients').catch(() => null);
    if (l?.ok) state.clients = l.clients;
  }
  const config = r.config;
  if (copy) {
    // Rasmlar boshqa mijoz papkasida — nusxada ular qaytadan yuklanadi
    const c = clone(config);
    c.couple = { groom: '', bride: '', initials: '' };
    delete c.backgroundImage;
    c.gallery = [];
    c.photos = {};
    if (c.venue) c.venue.image = '';
    if (c.seo) c.seo.ogImage = '';
    if (c.music) {
      c.music = '';
      c.musicTrack ||= c.template === 'yz' ? 'musiqa-4' : c.template === 'osmon' ? 'musiqa-3' : 'musiqa-1';
    }
    delete c.giftCard;
    state.ed = newEditor({ isNew: true, config: c });
    state.ed.invitationTouched = false;
    showEditor();
    toast('Nusxa olindi: ismlar va rasmlarni kiriting');
    return;
  }
  state.ed = newEditor({ slug, isNew: false, config, media: r.media, source: r.source });
  showEditor();
}

function showEditor() {
  const ed = state.ed;
  const c = ed.config;
  const yz = c.template === 'yz';
  const tpl = findTemplate(c.template);
  const osmon = c.template === 'osmon';
  const sections = yz
    ? [secMain(), secVenue(), secYzPhotos(), secYzCard(), secMusicRsvp(), secYzRu(), secYzTexts(), secSeo()]
    : osmon
      ? [secMain(), secTexts(), secVenue(), secSky(), secProgram(), secDress(), secContacts(), secMusicRsvp(), secSeo()]
      : [secMain(), secTexts(), secVenue(), secProgram(), secDress(), secContacts(), secGallery(), secBackground(), secGiftNote(), secMusicRsvp(), secEffects(), secSeo()];

  root.innerHTML = html`
    ${topbar(html`<span class="badge ${yz ? 'badge--yz' : osmon ? 'badge--osmon' : ''}">${tpl?.title}</span>`)}
    <div class="wrap">
      <div class="list-head">
        <a class="btn btn--small btn--ghost" href="#/">← Ro‘yxat</a>
        <h1>${ed.isNew ? 'Yangi to‘y' : `${c.couple.groom} & ${c.couple.bride}`}</h1>
        <span class="top__spacer"></span>
        ${ed.isNew ? '' : html`<button class="btn btn--small" type="button" data-action="password">🔑 Mijoz uchun /admin parol</button>`}
        <button class="btn btn--small preview-toggle" type="button" data-action="preview-open">📱 Ko‘rinish</button>
      </div>
      <div class="editor">
        <form class="form" id="form" autocomplete="off" novalidate>
          ${sections}
          <div class="savebar" id="savebar">
            <div class="savebar__row">
              <button class="btn btn--primary" type="submit" id="save-btn">${ed.isNew ? 'Saqlash va saytni yaratish' : 'Saqlash va chiqarish'}</button>
              <span class="progress" id="progress"></span>
            </div>
            <ul class="errors" id="errors" hidden></ul>
            <pre class="log" id="log" hidden></pre>
          </div>
        </form>
        <aside class="preview" id="preview">
          <div class="phone"><iframe id="preview-frame" title="Jonli ko‘rinish" src="${yz ? '/preview-yz.html' : osmon ? '/preview-osmon.html' : '/preview-v2.html'}"></iframe></div>
          <p class="preview__note">Jonli ko‘rinish — saqlanmagan o‘zgarishlar ham ko‘rinadi</p>
          <button class="btn btn--small preview-toggle" type="button" data-action="preview-close">Yopish</button>
        </aside>
      </div>
    </div>
  `;
  bindEditor();
}

let previewTimer = 0;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(sendPreview, 300);
}

function sendPreview() {
  const ed = state.ed;
  const frame = $('#preview-frame');
  if (!ed || !frame?.contentWindow) return;
  const media = Object.fromEntries(Object.entries(ed.uploads).map(([n, u]) => [n, u.url]));
  frame.contentWindow.postMessage(
    { config: previewConfig(ed.config), media, mediaBase: ed.isNew ? '/media/' : `${siteUrl(ed.slug)}/media/` },
    location.origin,
  );
}

window.addEventListener('message', (e) => {
  if (e.origin === location.origin && e.data?.previewReady) sendPreview();
});

function markDirty() {
  state.ed.dirty = true;
  schedulePreview();
}

function rerender(sel, fn) {
  const el = $(sel);
  if (el) el.innerHTML = fn();
}

function updateSlugFromNames() {
  const ed = state.ed;
  if (!ed.isNew || ed.slugTouched) return;
  ed.slug = toSlug(ed.config.couple.groom, ed.config.couple.bride);
  const input = $('#slug');
  if (input) input.value = ed.slug;
  updateSlugHint();
}

function updateSlugHint() {
  const ed = state.ed;
  const hint = $('#slug-hint');
  if (!hint) return;
  const taken = state.clients.some((x) => x.slug === ed.slug);
  hint.className = `hint ${taken ? '' : 'hint--ok'}`;
  hint.textContent = taken ? 'Bu nom band — boshqasini yozing' : ed.slug ? siteUrl(ed.slug) : 'Ismlardan avtomatik tuziladi';
  hint.closest('.f')?.classList.toggle('f--bad', taken);
}

function applyMapInput(text) {
  const c = state.ed.config;
  const r = parseMapInput(text);
  const note = $('#map-note');
  if (!text.trim()) {
    note.textContent = 'Joylashtirsangiz, Google va Yandex havolalari o‘zi tuziladi';
    note.className = 'hint';
    return;
  }
  if (!r.ok) {
    note.textContent = r.note || 'Tushunarsiz havola';
    note.className = 'hint hint--warn';
    return;
  }
  c.venue ||= {};
  if (r.googleMaps) c.venue.googleMaps = r.googleMaps;
  if (r.yandexMaps) c.venue.yandexMaps = r.yandexMaps;
  // Faqat bitta tomon havolasi berilsa, ikkinchisi eski qiymatda qolmasin
  if (r.googleMaps && !r.yandexMaps && r.lat == null) c.venue.yandexMaps = '';
  if (r.yandexMaps && !r.googleMaps && r.lat == null) c.venue.googleMaps = '';
  if (c.template === 'yz') c.venue.mapEmbed = r.embedUrl || '';
  if (c.template === 'osmon' && r.lat != null) {
    c.sky = { ...(c.sky || {}), lat: r.lat, lng: r.lng };
    for (const k of ['lat', 'lng']) {
      const input = $(`[data-path="sky.${k}"]`);
      if (input) input.value = c.sky[k];
    }
  }
  if (r.placeName && !c.venue.name) c.venue.name = r.placeName;
  note.textContent = r.lat != null ? `✓ Joy aniqlandi: ${r.lat}, ${r.lng}${r.placeName ? ` (${r.placeName})` : ''}` : r.note;
  note.className = `hint ${r.lat != null ? 'hint--ok' : 'hint--warn'}`;
  for (const k of ['googleMaps', 'yandexMaps', 'name']) {
    const input = $(`[data-path="venue.${k}"]`);
    if (input) input.value = c.venue[k] || '';
  }
  const parts = [];
  if (c.venue.googleMaps) parts.push('✓ Google havolasi');
  if (c.venue.yandexMaps) parts.push('✓ Yandex havolasi');
  if (c.template === 'yz' && c.venue.mapEmbed) parts.push('✓ Sahifadagi xarita');
  const box = $('#map-result');
  box.hidden = !parts.length;
  box.textContent = parts.join('  ·  ');
  updateSkyStatus();
  markDirty();
}

function setToggle(id, on) {
  const c = state.ed.config;
  const sec = $(`#sec-${id}`);
  sec?.classList.toggle('sec--off', !on);
  if (id === 'program') {
    c.program = on ? (c.program?.length ? c.program : buildProgram(suggestProgramPreset(c.event.time), c.event.time)) : [];
    rerender('#program-rows', programRows);
  }
  if (id === 'dress') {
    const kechki = DRESS_PRESETS.find((p) => p.id === 'kechki');
    c.dressCode = on ? { text: c.dressCode?.text || kechki.text, colors: c.dressCode?.colors?.length ? c.dressCode.colors : [...kechki.colors] } : { text: '', colors: [] };
    const t = $('[data-path="dressCode.text"]');
    if (t) t.value = c.dressCode.text;
    rerender('#colors', colorsHtml);
  }
  if (id === 'contacts') {
    c.contacts = on ? (c.contacts?.length ? c.contacts : [{ name: 'Aloqa uchun', phone: '' }]) : [];
    rerender('#contact-rows', contactRows);
  }
  if (id === 'gallery') {
    state.ed.galleryOn = on;
    if (!on) c.gallery = [];
    rerender('#gallery-thumbs', galleryHtml);
  }
  if (id === 'background' && !on) {
    delete c.backgroundImage;
    delete c.backgroundOverlay;
  }
  if (id === 'background' && on && !c.backgroundImage) {
    pickBackground();
  }
  if (id === 'giftnote') {
    if (on) {
      c.giftNote = c.giftNote?.title
        ? c.giftNote
        : {
            eyebrow: 'Eng qimmatli sovg‘a',
            title: 'Sizning tashrifingiz',
            text: 'Kelishingizning o‘zi biz uchun eng katta sovg‘a. Quvonchimizga sherik bo‘lib, duolaringiz bilan qutlasangiz — shuning o‘zi kifoya.',
          };
      for (const k of ['eyebrow', 'title', 'text']) {
        const el = $(`[data-path="giftNote.${k}"]`);
        if (el) el.value = c.giftNote[k];
      }
    } else delete c.giftNote;
  }
  if (id === 'card') {
    if (on) c.giftCard = { holder: c.couple.groom || '', bank: 'Uzcard', number: '', ...(c.giftCard || {}) };
    else delete c.giftCard;
    for (const k of ['number', 'holder', 'bank', 'expiry']) {
      const el = $(`[data-path="giftCard.${k}"]`);
      if (el) el.value = c.giftCard?.[k] || '';
    }
  }
  markDirty();
}

async function pickBackground() {
  const [file] = await pickFiles();
  if (!file) return;
  const name = await addUpload('fon', file, 1600);
  state.ed.config.backgroundImage = name;
  state.ed.config.backgroundOverlay ??= 0.84;
  $('#sec-background').outerHTML = secBackground();
  $('#sec-background').open = true;
  markDirty();
}

function bindEditor() {
  const ed = state.ed;
  const form = $('#form');

  form.addEventListener('input', (e) => {
    const t = e.target;
    const c = ed.config;
    if (t.id === 'slug') {
      ed.slugTouched = true;
      ed.slug = t.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (t.value !== ed.slug) t.value = ed.slug;
      updateSlugHint();
      return;
    }
    if (t.id === 'map-input') return; // change hodisasida
    if (t.dataset.path) {
      let v = t.value;
      if (t.dataset.kind === 'bool') v = t.checked;
      else if (t.dataset.kind === 'number' || t.type === 'number' || t.type === 'range') v = t.value === '' ? '' : Number(t.value);
      const path = t.dataset.path;
      const oldTime = c.event?.time;
      set(c, path, v);
      if (path === 'backgroundOverlay') $('#veil-val').textContent = `${Math.round(v * 100)}%`;
      if (path.startsWith('sky.') || path.startsWith('venue.')) updateSkyStatus();
      if (path === 'couple.groom' || path === 'couple.bride') {
        updateSlugFromNames();
        if (!yzTemplate() && !ed.invitationTouched) {
          c.texts.invitation = autoInvitation(c);
          const inv = $('[data-path="texts.invitation"]');
          if (inv) inv.value = c.texts.invitation;
        }
      }
      if (path === 'texts.invitation') ed.invitationTouched = true;
      // To'y vaqti o'zgarsa, dastur ham shuncha suriladi
      if (path === 'event.time' && TIME_RE.test(v) && TIME_RE.test(oldTime || '') && c.program?.length) {
        c.program = shiftProgram(c.program, oldTime, v);
        rerender('#program-rows', programRows);
      }
      // Sana o'zgarsa, javob muddati ham (avvalgi farq bilan) suriladi
      if (path === 'event.date' && isValidDate(v) && c.rsvp) {
        c.rsvp.deadline = addDays(v, -1);
        const dl = $('[data-path="rsvp.deadline"]');
        if (dl) dl.value = c.rsvp.deadline;
      }
      markDirty();
      return;
    }
    if (t.dataset.program != null) {
      c.program[Number(t.dataset.program)][t.dataset.key] = t.value;
      markDirty();
      return;
    }
    if (t.dataset.contact != null) {
      c.contacts[Number(t.dataset.contact)][t.dataset.key] = t.value;
      markDirty();
      return;
    }
    if (t.dataset.color != null) {
      c.dressCode.colors[Number(t.dataset.color)] = t.value;
      markDirty();
      return;
    }
    if (t.name === 'gstyle') {
      c.galleryStyle = t.value === 'garland' ? 'garland' : undefined;
      if (!c.galleryStyle) delete c.galleryStyle;
      markDirty();
    }
  });

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'map-input') applyMapInput(t.value);
    if (t.dataset.toggle) setToggle(t.dataset.toggle, t.checked);
    if (t.id === 'music-select') {
      const c = ed.config;
      const v = t.value;
      if (v.startsWith('track:')) {
        c.musicTrack = v.slice(6);
      } else if (v === 'file') {
        delete c.musicTrack;
      } else {
        c.musicTrack = 'none';
      }
      markDirty();
    }
    if (t.name === 'gstyle') markDirty();
  });
  // Xarita maydoniga joylashtirilganda darhol
  $('#map-input')?.addEventListener('paste', (e) => setTimeout(() => applyMapInput(e.target.value), 0));

  form.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const c = ed.config;
    const a = b.dataset.action;
    if (a) e.preventDefault();
    if (a === 'program-preset' || a === 'program-auto') {
      const id = a === 'program-auto' ? suggestProgramPreset(c.event.time) : $('#program-preset').value;
      if (!TIME_RE.test(c.event.time || '')) return toast('Avval to‘y vaqtini kiriting');
      c.program = buildProgram(id, c.event.time);
      $('#program-preset').value = id;
      const tg = $('[data-toggle="program"]');
      tg.checked = true;
      $('#sec-program').classList.remove('sec--off');
      rerender('#program-rows', programRows);
      toast(`Dastur tuzildi: ${PROGRAM_PRESETS.find((p) => p.id === id).title}`);
      markDirty();
    }
    if (a === 'program-add') {
      const last = c.program?.[c.program.length - 1];
      const [h, m] = (last?.time || c.event.time || '18:00').split(':').map(Number);
      const t = (h * 60 + m + 30) % 1440;
      (c.program ||= []).push({ time: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, title: '' });
      rerender('#program-rows', programRows);
      markDirty();
    }
    if (b.dataset.programDel != null) {
      c.program.splice(Number(b.dataset.programDel), 1);
      rerender('#program-rows', programRows);
      markDirty();
    }
    if (a === 'dress-preset') {
      const p = DRESS_PRESETS.find((x) => x.id === $('#dress-preset').value);
      c.dressCode = { text: p.text, colors: [...p.colors] };
      $('[data-path="dressCode.text"]').value = p.text;
      $('[data-toggle="dress"]').checked = true;
      $('#sec-dress').classList.remove('sec--off');
      rerender('#colors', colorsHtml);
      markDirty();
    }
    if (a === 'color-add') {
      (c.dressCode.colors ||= []).push('#c9a96e');
      rerender('#colors', colorsHtml);
      markDirty();
    }
    if (b.dataset.colorDel != null) {
      c.dressCode.colors.splice(Number(b.dataset.colorDel), 1);
      rerender('#colors', colorsHtml);
      markDirty();
    }
    if (a === 'contact-add') {
      (c.contacts ||= []).push({ name: '', phone: '' });
      rerender('#contact-rows', contactRows);
      markDirty();
    }
    if (b.dataset.contactDel != null) {
      c.contacts.splice(Number(b.dataset.contactDel), 1);
      rerender('#contact-rows', contactRows);
      markDirty();
    }
    if (a === 'gallery-add') {
      const files = await pickFiles({ multiple: true });
      for (const f of files) (c.gallery ||= []).push(await addUpload('rasm', f, 1600));
      ed.galleryOn = true;
      rerender('#gallery-thumbs', galleryHtml);
      markDirty();
    }
    if (b.dataset.galleryDel != null) {
      c.gallery.splice(Number(b.dataset.galleryDel), 1);
      rerender('#gallery-thumbs', galleryHtml);
      markDirty();
    }
    if (a === 'bg-set') pickBackground();
    if (b.dataset.photoSet) {
      e.preventDefault();
      const [file] = await pickFiles();
      if (!file) return;
      (c.photos ||= {})[b.dataset.photoSet] = await addUpload(b.dataset.photoSet, file, 1600);
      rerender('#yz-photos', yzPhotosHtml);
      markDirty();
    }
    if (b.dataset.photoReset) {
      e.preventDefault();
      delete c.photos[b.dataset.photoReset];
      rerender('#yz-photos', yzPhotosHtml);
      markDirty();
    }
    if (a === 'invitation-auto') {
      c.texts.invitation = autoInvitation(c);
      $('[data-path="texts.invitation"]').value = c.texts.invitation;
      ed.invitationTouched = false;
      markDirty();
    }
    if (a === 'music-play') playMusic(b);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });

}

// Forma tashqarisidagi tugmalar (bir marta ulanadi)
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]')?.dataset.action;
  if (!state.ed) return;
  if (a === 'preview-open') {
    $('#preview').classList.add('preview--open');
    sendPreview();
  }
  if (a === 'preview-close') $('#preview').classList.remove('preview--open');
  if (a === 'password') createPassword();
});

const yzTemplate = () => state.ed?.config.template === 'yz';

let audio = null;
function playMusic(btn) {
  const c = state.ed.config;
  const track = c.musicTrack && c.musicTrack !== 'none' ? findTrack(c.musicTrack) : null;
  const src = track?.file || (c.music ? mediaSrc(c.music) : '');
  if (audio && !audio.paused) {
    audio.pause();
    btn.textContent = '▶ Tinglash';
    return;
  }
  if (!src) return toast('Musiqa tanlanmagan');
  audio = new Audio(src);
  audio.play().catch(() => toast('Ijro etib bo‘lmadi'));
  btn.textContent = '⏸ To‘xtatish';
  audio.onended = () => (btn.textContent = '▶ Tinglash');
}

/* ------------------------------------------------------------------ */
/*  Saqlash                                                            */
/* ------------------------------------------------------------------ */
// Saqlashdan oldin: bo'sh ixtiyoriy qismlar tozalanadi
function cleanConfig(c0) {
  const c = clone(c0);
  c.couple.groom = c.couple.groom.trim();
  c.couple.bride = c.couple.bride.trim();
  if (Array.isArray(c.program)) c.program = c.program.filter((p) => p.time || p.title?.trim());
  if (Array.isArray(c.contacts)) c.contacts = c.contacts.filter((p) => p.name?.trim() || p.phone?.trim());
  if (c.giftCard && !String(c.giftCard.number || '').trim()) delete c.giftCard;
  if (c.template === 'yz') {
    for (const lang of ['uz', 'ru']) {
      for (const [k, v] of Object.entries(c.texts?.[lang] || {})) if (!String(v).trim()) delete c.texts[lang][k];
    }
    for (const [k, v] of Object.entries(c.ru || {})) if (!String(v).trim()) delete c.ru[k];
  }
  if (c.sky) {
    // Bo'sh maydonlar yozilmaydi; koordinata bo'lmasa — xarita havolasidan olinadi
    if (c.sky.lat === '' || c.sky.lng === '' || c.sky.lat == null || c.sky.lng == null) {
      delete c.sky.lat;
      delete c.sky.lng;
    }
    if (!String(c.sky.city || '').trim()) delete c.sky.city;
    else c.sky.city = c.sky.city.trim();
    if (!Object.keys(c.sky).length) delete c.sky;
  }
  if (c.rsvp?.maxGuests !== undefined) c.rsvp.maxGuests = Number(c.rsvp.maxGuests) || 5;
  return c;
}

async function save() {
  const ed = state.ed;
  if (ed.saving) return;
  const c = cleanConfig(ed.config);
  const errorsEl = $('#errors');
  const progress = $('#progress');
  const log = $('#log');
  log.hidden = true;

  const errs = [];
  if (ed.isNew) {
    if (!ed.slug) errs.push('Sayt manzilini kiriting');
    else if (state.clients.some((x) => x.slug === ed.slug)) errs.push('Bu sayt manzili band');
  }
  const used = strings(c);
  const mediaNames = [...ed.media, ...Object.keys(ed.uploads)].filter((n) => used.has(n));
  errs.push(...validateConfig(c, mediaNames).map(humanError));
  if (errs.length) {
    errorsEl.innerHTML = html`${errs.map((x) => html`<li>${x}</li>`)}`;
    errorsEl.hidden = false;
    progress.textContent = '';
    return;
  }
  errorsEl.hidden = true;

  const media = Object.fromEntries(Object.entries(ed.uploads).filter(([n]) => used.has(n)).map(([n, u]) => [n, u.b64]));
  const deleteMedia = ed.media.filter((n) => !used.has(n));

  ed.saving = true;
  const btn = $('#save-btn');
  btn.disabled = true;
  progress.className = 'progress';
  progress.textContent = Object.keys(media).length ? 'Rasmlar yuklanmoqda va GitHub’ga yozilmoqda…' : 'GitHub’ga yozilmoqda…';
  try {
    const r = await api('save', { method: 'POST', body: { slug: ed.slug, isNew: ed.isNew, config: c, media, deleteMedia } });
    if (!r.ok) {
      progress.className = 'progress progress--fail';
      progress.textContent = r.message || 'Saqlab bo‘lmadi';
      if (r.details?.length) {
        errorsEl.innerHTML = html`${r.details.map((x) => html`<li>${humanError(x)}</li>`)}`;
        errorsEl.hidden = false;
      }
      return;
    }
    // Endi bu mijoz serverda bor: yangi fayllar mavjudlar qatoriga o'tadi
    const wasNew = ed.isNew;
    ed.isNew = false;
    ed.media = mediaNames;
    ed.config = c;
    ed.dirty = false;
    if (wasNew) {
      state.clients.push({ slug: ed.slug, template: c.template, groom: c.couple.groom, bride: c.couple.bride, date: c.event.date, time: c.event.time, venue: c.venue.name, rsvp: null });
      history.replaceState(null, '', `#/tahrir/${ed.slug}`);
      currentHash = location.hash;
      // Endi mavjud to'y: sarlavha, manzil maydoni va parol tugmasi yangilanadi
      $('.list-head h1').textContent = `${c.couple.groom} & ${c.couple.bride}`;
      $('#save-btn').textContent = 'Saqlash va chiqarish';
      const slugField = $('#slug')?.closest('.f');
      if (slugField) slugField.outerHTML = html`<p class="hint">Sayt: <a href="${siteUrl(ed.slug)}" target="_blank" rel="noopener">${siteUrl(ed.slug)}</a></p>`;
      if (!$('[data-action="password"]')) {
        $('.preview-toggle').insertAdjacentHTML('beforebegin', String(html`<button class="btn btn--small" type="button" data-action="password">🔑 Mijoz uchun /admin parol</button>`));
      }
    }
    if (r.unchanged) {
      progress.className = 'progress progress--ok';
      progress.textContent = 'O‘zgarish yo‘q — sayt avvalgidek';
      return;
    }
    await waitDeploy(r.sha, wasNew);
  } catch (err) {
    if (err.message !== 'unauthorized') {
      progress.className = 'progress progress--fail';
      progress.textContent = 'Server bilan aloqa uzildi — qayta urinib ko‘ring';
    }
  } finally {
    ed.saving = false;
    btn.disabled = false;
  }
}

async function waitDeploy(sha, wasNew) {
  const progress = $('#progress');
  const log = $('#log');
  const started = Date.now();
  progress.textContent = 'Saqlandi ✓ Sayt yig‘ilmoqda…';
  while (Date.now() - started < 5 * 60e3) {
    await new Promise((r) => setTimeout(r, 2500));
    const s = await refreshStatus();
    if (!s?.ok || !$('#progress')) continue;
    if (s.deployed === sha) {
      const url = siteUrl(state.ed.slug);
      progress.className = 'progress progress--ok';
      progress.innerHTML = html`✓ Tayyor! <a href="${url}" target="_blank" rel="noopener">${url}</a>${wasNew ? html` <br /><small class="hint">Yangi sayt ochilishi uchun DNS'da <b>${state.ed.slug}</b> (yoki umumiy <b>*</b>) A yozuvi serverga yo‘naltirilgan bo‘lishi kerak. Keyin HTTPS 2–3 daqiqada o‘zi yoqiladi.</small>` : ''}`;
      return;
    }
    if (s.deploy?.sha === sha && s.deploy.state === 'failed') {
      progress.className = 'progress progress--fail';
      progress.textContent = `✖ Sayt yig‘ilmadi: ${s.deploy.message}. Saytlar oldingi holatda qoldi.`;
      if (s.deploy.log) {
        log.textContent = s.deploy.log;
        log.hidden = false;
      }
      return;
    }
  }
  progress.textContent = 'Saqlandi. Yig‘ish odatdagidan uzoq — birozdan keyin saytni tekshiring.';
}

// validateConfig xabarlarini tushunarliroq qilish
function humanError(msg) {
  return String(msg)
    .replace(/^couple\.groom.*/, 'Kuyov ismini kiriting')
    .replace(/^couple\.bride.*/, 'Kelin ismini kiriting')
    .replace(/^event\.date.*/, 'To‘y sanasini to‘g‘ri kiriting')
    .replace(/^event\.time.*/, 'To‘y vaqtini to‘g‘ri kiriting')
    .replace(/^venue\.name.*/, 'To‘yxona nomini kiriting')
    .replace(/^venue\.address.*/, 'Manzilni kiriting')
    .replace(/^program\[(\d+)\]\.time.*/, (_, i) => `Dasturdagi ${Number(i) + 1}-tadbir vaqti noto‘g‘ri`)
    .replace(/^program\[(\d+)\]\.title.*/, (_, i) => `Dasturdagi ${Number(i) + 1}-tadbir nomi kiritilmagan`)
    .replace(/^contacts\[(\d+)\]\.phone.*/, (_, i) => `${Number(i) + 1}-telefon raqami noto‘g‘ri`)
    .replace(/^contacts\[(\d+)\]\.name.*/, (_, i) => `${Number(i) + 1}-raqam uchun nom kiritilmagan`)
    .replace(/^giftCard\.number.*/, 'Karta raqami 16 xonali bo‘lishi kerak')
    .replace(/^rsvp\.deadline.*/, 'Javob muddati to‘y sanasidan oldin bo‘lishi kerak');
}

/* ------------------------------------------------------------------ */
/*  Mijoz paroli                                                       */
/* ------------------------------------------------------------------ */
async function createPassword() {
  const ed = state.ed;
  if (!confirm('Mijoz uchun yangi /admin parol yaratilsinmi? Oldingi (panelda yaratilgan) parol ishlamay qoladi.')) return;
  const r = await api('password', { method: 'POST', body: { slug: ed.slug } }).catch(() => null);
  if (!r?.ok) return toast(r?.message || 'Parol yaratib bo‘lmadi');
  const url = `${siteUrl(ed.slug)}/admin`;
  const text = `Mehmonlar javoblari: ${url}\nParol: ${r.password}`;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = html`
    <div class="modal__box">
      <h3>Mijoz uchun parol</h3>
      <p class="hint">Bu parol faqat hozir ko‘rsatiladi. Mijozga yuboring.</p>
      <p>Sahifa: <a href="${url}" target="_blank" rel="noopener">${url}</a></p>
      <p class="secret">${r.password}</p>
      <div class="actions-row">
        <button class="btn btn--primary" type="button" data-copy>Nusxa olish (havola + parol)</button>
        <button class="btn" type="button" data-close>Yopish</button>
      </div>
    </div>
  `;
  document.body.append(modal);
  modal.addEventListener('click', async (e) => {
    if (e.target.closest('[data-copy]')) {
      await navigator.clipboard?.writeText(text).catch(() => {});
      toast('Nusxa olindi');
    }
    if (e.target.closest('[data-close]') || e.target === modal) modal.remove();
  });
}

/* ------------------------------------------------------------------ */
/*  Yo'naltirish                                                       */
/* ------------------------------------------------------------------ */
function route() {
  if (!token.get()) return showLogin();
  const h = location.hash.replace(/^#/, '') || '/';
  let m;
  if (h === '/yangi') return showTemplatePicker();
  if ((m = /^\/tahrir\/([a-z0-9-]+)$/.exec(h))) {
    if (state.ed && !state.ed.isNew && state.ed.slug === m[1]) return; // saqlashdan keyingi URL almashishi
    return openExisting(m[1]);
  }
  if ((m = /^\/nusxa\/([a-z0-9-]+)$/.exec(h))) return openExisting(m[1], { copy: true });
  return showList();
}

let currentHash = location.hash;
window.addEventListener('hashchange', () => {
  if (state.ed?.dirty && !confirm('Saqlanmagan o‘zgarishlar bor. Chiqib ketilsinmi?')) {
    history.replaceState(null, '', currentHash || '#/');
    return;
  }
  currentHash = location.hash;
  route();
});
window.addEventListener('beforeunload', (e) => {
  if (state.ed?.dirty) e.preventDefault();
});

route();
