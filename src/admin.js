import './admin.css';
import config from '@wedding-config';
import { deriveConfig, MONTHS, mediaUrl } from './lib/config.js';
import { MUSIC_LIBRARY } from './lib/music.js';
import { html, $, $$ } from './lib/dom.js';

const d = deriveConfig(config);
const root = document.getElementById('admin');
const PW_KEY = 'admin-pw';

let password = '';
let data = null;
let filter = 'all';
let query = '';

try {
  password = sessionStorage.getItem(PW_KEY) || '';
} catch {
  /* e'tiborsiz */
}

const ERRORS = {
  unauthorized: 'Parol noto‘g‘ri.',
  no_password:
    'Admin paroli o‘rnatilmagan. Vercel → Settings → Environment Variables ga ADMIN_PASSWORD qo‘shing va Redeploy qiling.',
  store_not_configured:
    'Ma’lumotlar bazasi ulanmagan. Vercel → Storage → Upstash for Redis ni shu loyihaga ulang va Redeploy qiling.',
  store_failed: 'Bazadan o‘qishda xatolik. Birozdan so‘ng qayta urinib ko‘ring.',
  network: 'Internet aloqasini tekshiring.',
};

async function api(method = 'GET', body) {
  let res;
  try {
    res = await fetch('/api/admin', {
      method,
      headers: { Authorization: `Bearer ${password}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('network');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new Error(json.error || 'store_failed');
  return json;
}

/* ------------------------------ Kirish ------------------------------ */
function renderLogin(error = '') {
  root.innerHTML = html`
    <main class="login">
      <p class="eyebrow">Mehmonlar javoblari</p>
      <h1 class="names">${d.groom} <span>&amp;</span> ${d.bride}</h1>
      <form class="login__form" id="login">
        <label class="field">
          <span>Parol</span>
          <input type="password" name="password" autocomplete="current-password" required autofocus />
        </label>
        <p class="error" role="alert">${error}</p>
        <button class="btn btn--solid" type="submit">Kirish</button>
      </form>
    </main>
  `.value;
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    password = e.target.password.value.trim();
    const btn = $('button', e.target);
    btn.disabled = true;
    await load();
    btn.disabled = false;
  });
}

async function load() {
  try {
    data = await api();
    try {
      sessionStorage.setItem(PW_KEY, password);
    } catch {
      /* e'tiborsiz */
    }
    renderDashboard();
  } catch (err) {
    if (err.message === 'unauthorized') {
      try {
        sessionStorage.removeItem(PW_KEY);
      } catch {
        /* e'tiborsiz */
      }
    }
    renderLogin(ERRORS[err.message] || ERRORS.store_failed);
  }
}

/* ------------------------------ Panel ------------------------------- */
const fmtDate = (iso) => {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
};

function visibleEntries() {
  const q = query.toLowerCase();
  return data.entries.filter(
    (e) =>
      (filter === 'all' || e.attending === filter) &&
      (!q || `${e.name} ${e.phone} ${e.message}`.toLowerCase().includes(q)),
  );
}

function renderDashboard() {
  const s = data.stats;
  root.innerHTML = html`
    <header class="top">
      <div>
        <p class="eyebrow">Mehmonlar javoblari</p>
        <h1 class="names">${d.groom} <span>&amp;</span> ${d.bride}</h1>
        <p class="scope">Faqat shu taklifnoma javoblari · ${data.wedding}</p>
      </div>
      <div class="top__actions">
        <button class="btn" id="refresh" type="button">Yangilash</button>
        <button class="btn" id="csv" type="button">Excel (CSV)</button>
        <button class="btn btn--ghost" id="logout" type="button">Chiqish</button>
      </div>
    </header>

    <section class="card" id="date-card">
      <h2 class="card__title">To‘y sanasi va vaqti</h2>
      <form class="date-form" id="date-form">
        <label class="field"><span>Sana</span><input type="date" name="date" required /></label>
        <label class="field"><span>Vaqt</span><input type="time" name="time" required /></label>
        <button class="btn btn--dark" type="submit">Saqlash</button>
      </form>
      <p class="card__note" id="date-note"></p>
    </section>

    <section class="card" id="music-card">
      <h2 class="card__title">Fon musiqasi</h2>
      <form class="date-form" id="music-form">
        <label class="field">
          <span>Qo‘shiq</span>
          <select name="music" id="music-select"></select>
        </label>
        <button class="btn btn--dark" type="submit">Saqlash</button>
      </form>
      <audio class="music-preview" id="music-preview" controls preload="none"></audio>
      <p class="card__note" id="music-note"></p>
    </section>

    <section class="stats">
      <div class="stat"><b>${s.total}</b><span>jami javob</span></div>
      <div class="stat stat--yes"><b>${s.attending}</b><span>keladi</span></div>
      <div class="stat stat--no"><b>${s.declined}</b><span>kelmaydi</span></div>
      <div class="stat stat--guests"><b>${s.guests}</b><span>jami mehmon</span></div>
    </section>

    <section class="toolbar">
      <div class="tabs" role="tablist">
        ${[
          ['all', 'Hammasi'],
          ['yes', 'Keladi'],
          ['no', 'Kelmaydi'],
        ].map(
          ([k, label]) =>
            html`<button type="button" role="tab" data-filter="${k}" aria-selected="${String(filter === k)}">${label}</button>`,
        )}
      </div>
      <input class="search" id="search" type="search" placeholder="Ism, telefon yoki tilak bo‘yicha qidirish" value="${query}" />
    </section>

    <section class="list" id="list"></section>
  `.value;

  initDateCard();
  initMusicCard();
  $('#refresh').addEventListener('click', load);
  $('#csv').addEventListener('click', downloadCsv);
  $('#logout').addEventListener('click', () => {
    try {
      sessionStorage.removeItem(PW_KEY);
    } catch {
      /* e'tiborsiz */
    }
    password = '';
    renderLogin();
  });
  $$('[data-filter]').forEach((b) =>
    b.addEventListener('click', () => {
      filter = b.dataset.filter;
      $$('[data-filter]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      renderList();
    }),
  );
  $('#search').addEventListener('input', (e) => {
    query = e.target.value.trim();
    renderList();
  });
  renderList();
}

/* ------------------------ Sana va vaqt ------------------------ */
const humanDate = (iso, time) => {
  const [y, m, dd] = iso.split('-').map(Number);
  return `${dd}-${MONTHS[m - 1]} ${y}, soat ${time}`;
};

function initDateCard() {
  const form = $('#date-form');
  const note = $('#date-note');
  const changed = data.settings?.date ? data.settings : null;
  const current = changed || { date: config.event.date, time: config.event.time };
  form.date.value = current.date;
  form.time.value = current.time;

  const original = humanDate(config.event.date, config.event.time);
  if (changed) {
    note.innerHTML = html`Saytda hozir: <b>${humanDate(changed.date, changed.time)}</b> (admin'dan o‘zgartirilgan).
      Asl sana: ${original}. <button class="link" type="button" id="date-reset">Asl holiga qaytarish</button>`.value;
    $('#date-reset').addEventListener('click', async () => {
      if (!confirm(`Sana va vaqt asl holiga (${original}) qaytarilsinmi?`)) return;
      await saveDate({ action: 'settings', date: null, time: null });
    });
  } else {
    note.textContent = `Saytda hozir: ${original}. O‘zgartirsangiz, taklifnoma darhol yangi sana bilan ochiladi.`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = form.date.value;
    const time = form.time.value.slice(0, 5);
    if (!date || !time) return;
    if (!confirm(`To‘y sanasi ${humanDate(date, time)} qilib o‘zgartirilsinmi?`)) return;
    await saveDate({ action: 'settings', date, time });
  });

  async function saveDate(body) {
    $$('button', $('#date-card')).forEach((b) => (b.disabled = true));
    try {
      await api('POST', body);
      await load();
    } catch (err) {
      alert(err.message === 'validation' ? 'Sana yoki vaqt noto‘g‘ri kiritilgan.' : ERRORS[err.message] || ERRORS.store_failed);
      $$('button', $('#date-card')).forEach((b) => (b.disabled = false));
    }
  }
}

/* ------------------------ Fon musiqasi ------------------------ */
function initMusicCard() {
  const form = $('#music-form');
  const select = $('#music-select');
  const preview = $('#music-preview');
  const note = $('#music-note');
  const saved = data.settings?.music || '';
  const defaultSrc = config.music ? mediaUrl(config.music) : '';

  const options = [
    { value: '', label: defaultSrc ? 'Standart (sayt bilan birga kelgan)' : 'Standart (musiqasiz)', src: defaultSrc },
    ...MUSIC_LIBRARY.map((t) => ({ value: t.id, label: t.title, src: t.file })),
    { value: 'none', label: 'Musiqasiz', src: '' },
  ];
  select.innerHTML = options
    .map((o) => html`<option value="${o.value}">${o.label}</option>`.value)
    .join('');
  select.value = options.some((o) => o.value === saved) ? saved : '';

  const syncPreview = () => {
    const src = options.find((o) => o.value === select.value)?.src || '';
    preview.pause();
    preview.hidden = !src;
    if (src) preview.src = src;
    else preview.removeAttribute('src');
  };
  select.addEventListener('change', syncPreview);
  syncPreview();

  const current = options.find((o) => o.value === saved);
  note.textContent = saved
    ? `Saytda hozir: ${current ? current.label : saved}. Mehmonlar taklifnomani ochganda shu qo‘shiq yangraydi.`
    : 'Saytda hozir standart musiqa. Ro‘yxatdan boshqasini tanlab, ▶ bilan eshitib ko‘ring va saqlang.';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button', form);
    btn.disabled = true;
    try {
      await api('POST', { action: 'settings', music: select.value || null });
      await load();
    } catch (err) {
      alert(ERRORS[err.message] || ERRORS.store_failed);
      btn.disabled = false;
    }
  });
}

function renderList() {
  const list = $('#list');
  const items = visibleEntries();
  if (!data.entries.length) {
    list.innerHTML = html`<p class="empty">Hozircha javoblar yo‘q. Mehmonlar formani to‘ldirganda shu yerda paydo bo‘ladi.</p>`.value;
    return;
  }
  if (!items.length) {
    list.innerHTML = html`<p class="empty">Hech narsa topilmadi.</p>`.value;
    return;
  }
  list.innerHTML = items
    .map(
      (e) => html`
        <article class="entry entry--${e.attending}">
          <div class="entry__head">
            <h2>${e.name}</h2>
            <span class="badge">${e.attending === 'yes' ? `Keladi · ${e.guests} kishi` : 'Kelmaydi'}</span>
          </div>
          ${e.phone ? html`<a class="entry__phone" href="tel:${e.phone.replace(/[^\d+]/g, '')}">${e.phone}</a>` : ''}
          ${e.message ? html`<p class="entry__msg">${e.message}</p>` : ''}
          <div class="entry__foot">
            <time>${fmtDate(e.updatedAt)}</time>
            <button class="link" type="button" data-delete="${e.id}">O‘chirish</button>
          </div>
        </article>
      `.value,
    )
    .join('');

  $$('[data-delete]', list).forEach((b) =>
    b.addEventListener('click', async () => {
      const entry = data.entries.find((x) => x.id === b.dataset.delete);
      if (!entry || !confirm(`"${entry.name}" javobini o‘chirasizmi?`)) return;
      b.disabled = true;
      try {
        await api('POST', { action: 'delete', id: entry.id });
        await load();
      } catch (err) {
        alert(ERRORS[err.message] || ERRORS.store_failed);
        b.disabled = false;
      }
    }),
  );
}

function downloadCsv() {
  // Excel formula sifatida bajarmasligi uchun (=, @, yoki raqamsiz +/- bilan boshlansa)
  const safe = (v) => (/^[=@\t\r]|^[+-](?!\d)/.test(v) ? `'${v}` : v);
  const cell = (v) => `"${safe(String(v ?? '')).replace(/"/g, '""')}"`;
  const rows = [
    ['Ism', 'Telefon', 'Javob', 'Mehmonlar soni', 'Tilak', 'Sana'],
    ...data.entries.map((e) => [
      e.name,
      e.phone,
      e.attending === 'yes' ? 'Keladi' : 'Kelmaydi',
      e.attending === 'yes' ? e.guests : 0,
      e.message,
      fmtDate(e.updatedAt),
    ]),
  ];
  // BOM — Excel o'zbek harflarini to'g'ri ko'rsatishi uchun; ";" — Excel'ning mahalliy ajratuvchisi
  const csv = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `mehmonlar-${config.event.date}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (password) load();
else renderLogin();
