import { $, $$, prefersReducedMotion } from './lib/dom.js';

/* ------------------------------ Konvert ------------------------------ */
export function initEnvelope({ onOpen }) {
  const el = $('#envelope');
  if (!el) {
    onOpen?.({ gesture: false });
    return;
  }
  document.documentElement.classList.add('is-locked');
  const btn = $('#envelope-open', el);
  btn.focus({ preventScroll: true });

  let opened = false;
  const open = () => {
    if (opened) return;
    opened = true;
    window.scrollTo(0, 0);
    el.classList.add('is-opening');
    // Foydalanuvchi bosgan paytda chaqiriladi — brauzer musiqani ijro etishga ruxsat beradi
    onOpen?.({ gesture: true });
    const done = () => {
      el.remove();
      document.documentElement.classList.remove('is-locked');
      $('.hero')?.classList.add('is-in');
    };
    setTimeout(done, prefersReducedMotion() ? 300 : 1500);
  };

  btn.addEventListener('click', open);
  // Konvertning istalgan joyini bosish ham ochadi
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('.envelope__half')) open();
  });
}

/* ---------------------------- Hisoblagich ---------------------------- */
export function initCountdown(d) {
  const grid = $('#countdown');
  if (!grid) return;
  const cells = Object.fromEntries($$('[data-unit]', grid).map((n) => [n.dataset.unit, n]));
  const doneEl = $('#countdown-done');
  const title = $('.countdown__title');
  let timer;

  const finish = (text) => {
    grid.hidden = true;
    title.hidden = true;
    doneEl.hidden = false;
    doneEl.textContent = text;
  };

  const tick = () => {
    const now = Date.now();
    if (now >= d.end.getTime()) {
      clearInterval(timer);
      return finish('To‘y bo‘lib o‘tdi. Barchangizga tashrifingiz uchun rahmat!');
    }
    if (now >= d.start.getTime()) {
      return finish('To‘y boshlandi! Sizni kutib qolamiz 🤍');
    }
    let s = Math.floor((d.start.getTime() - now) / 1000);
    const values = {
      days: Math.floor(s / 86400),
      hours: Math.floor((s %= 86400) / 3600),
      minutes: Math.floor((s %= 3600) / 60),
      seconds: s % 60,
    };
    for (const [k, v] of Object.entries(values)) {
      const text = String(v).padStart(2, '0');
      if (cells[k].textContent !== text) cells[k].textContent = text;
    }
  };
  tick();
  timer = setInterval(tick, 1000);
}

/* ------------------------------ Taqvim ------------------------------ */
const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function initCalendar(c, d) {
  const details = `${c.texts?.invitation || ''}\n\n${location.href}`;
  const where = `${c.venue.name}, ${c.venue.address}`;
  const title = `${d.names} — to‘y`;

  const gcal = $('#gcal');
  if (gcal) {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${utcStamp(d.start)}/${utcStamp(d.end)}`,
      details,
      location: where,
    });
    gcal.href = `https://calendar.google.com/calendar/render?${params}`;
  }

  $('#ics')?.addEventListener('click', () => {
    const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Taklifnoma//UZ',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${utcStamp(d.start)}-${encodeURIComponent(d.names)}@taklifnoma`,
      `DTSTAMP:${utcStamp(new Date())}`,
      `DTSTART:${utcStamp(d.start)}`,
      `DTEND:${utcStamp(d.end)}`,
      `SUMMARY:${icsEsc(title)}`,
      `LOCATION:${icsEsc(where)}`,
      `DESCRIPTION:${icsEsc(details)}`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEsc(title)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'toy-taklifnoma.ics' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

/* ------------------------------ Musiqa ------------------------------ */
export function initMusic() {
  const audio = $('#music');
  const btn = $('#music-toggle');
  if (!audio || !btn) return { play() {} };

  const sync = () => {
    const on = !audio.paused;
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Musiqani o‘chirish' : 'Musiqani yoqish');
  };
  const play = () => audio.play().catch(() => {}).finally(sync);

  audio.volume = 0.6;
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  btn.addEventListener('click', () => (audio.paused ? play() : audio.pause()));
  // Boshqa ilovaga o'tilganda musiqa to'xtaydi
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !audio.paused) {
      audio.pause();
      audio.dataset.resume = '1';
    } else if (!document.hidden && audio.dataset.resume) {
      delete audio.dataset.resume;
      play();
    }
  });
  return { play };
}

/* --------------------------- Paydo bo'lish --------------------------- */
export function initReveal() {
  const items = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  items.forEach((el) => io.observe(el));
}

/* ---------------------------- Gul barglari --------------------------- */
export function initPetals(enabled) {
  const box = $('#petals');
  if (!box || !enabled || prefersReducedMotion()) return;
  const count = window.innerWidth < 600 ? 9 : 14;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('img');
    p.src = '/images/rose.webp';
    p.alt = '';
    p.className = 'petal';
    const size = 14 + Math.random() * 16;
    p.style.cssText = [
      `left:${Math.random() * 100}%`,
      `width:${size}px`,
      `animation-duration:${9 + Math.random() * 9}s`,
      `animation-delay:${-Math.random() * 16}s`,
      `--drift:${(Math.random() - 0.5) * 160}px`,
      `--spin:${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360)}deg`,
    ].join(';');
    box.append(p);
  }
}

/* ------------------------------ Galereya ----------------------------- */
export function initGallery() {
  const dlg = $('#lightbox');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const img = $('img', dlg);
  $$('.gallery__item').forEach((btn) =>
    btn.addEventListener('click', () => {
      img.src = $('img', btn).src;
      dlg.showModal();
    }),
  );
  dlg.addEventListener('click', () => dlg.close());
}

/* ------------------------------- RSVP -------------------------------- */
export function initRsvp(c, d) {
  const form = $('#rsvp-form');
  if (!form) return;
  const status = $('#rsvp-status');
  const doneBox = $('#rsvp-done');
  const guestsField = $('#guests-field');
  const storageKey = `rsvp:${d.names}:${c.event.date}`;

  const showDone = (text) => {
    form.hidden = true;
    doneBox.hidden = false;
    doneBox.textContent = text;
  };

  // Muddat o'tgan yoki to'y boshlangan bo'lsa forma yopiladi
  const now = Date.now();
  if ((d.rsvpClosesAt && now > d.rsvpClosesAt.getTime()) || now >= d.start.getTime()) {
    $('.rsvp__deadline')?.remove();
    return showDone(
      c.contacts?.length
        ? 'Javoblar qabul qilish muddati tugagan. Savollar bo‘lsa, quyidagi raqamlarga qo‘ng‘iroq qiling.'
        : 'Javoblar qabul qilish muddati tugagan.',
    );
  }

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch {
    /* localStorage mavjud emas */
  }
  if (saved) {
    showDone(thanks(saved.attending, saved.name));
    appendResend();
    return;
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'attending') guestsField.hidden = e.target.value !== 'yes';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.name = (data.name || '').trim();

    if (data.name.length < 2) return setStatus('Iltimos, ismingizni kiriting.', true, form.elements.namedItem('name'));
    if (!data.attending) return setStatus('Iltimos, kela olishingizni belgilang.', true);
    if (data.phone && !/^\+?[\d\s()-]{7,}$/.test(data.phone.trim())) {
      return setStatus('Telefon raqami noto‘g‘ri kiritilgan.', true, form.elements.namedItem('phone'));
    }

    const submit = $('button[type="submit"]', form);
    submit.disabled = true;
    setStatus('Yuborilmoqda…');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, couple: d.names }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({ name: data.name, attending: data.attending }));
        } catch {
          /* e'tiborsiz */
        }
        showDone(thanks(data.attending, data.name));
        appendResend();
        return;
      }
      if (json.error === 'not_configured') {
        if (c.rsvp.fallbackUrl) {
          setStatus('');
          status.append(linkTo(c.rsvp.fallbackUrl, 'Javobni shu yerda qoldiring →'));
        } else {
          setStatus(
            c.contacts?.length
              ? 'Hozircha onlayn javob qabul qilinmayapti. Iltimos, telefon orqali bog‘laning.'
              : 'Hozircha onlayn javob qabul qilinmayapti.',
            true,
          );
        }
        return;
      }
      setStatus('Xatolik yuz berdi. Iltimos, birozdan so‘ng qayta urinib ko‘ring.', true);
    } catch {
      setStatus('Internet aloqasini tekshirib, qayta urinib ko‘ring.', true);
    } finally {
      submit.disabled = false;
    }
  });

  function setStatus(text, isError = false, focusEl) {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
    focusEl?.focus();
  }

  function appendResend() {
    const btn = Object.assign(document.createElement('button'), {
      type: 'button',
      className: 'link',
      textContent: 'Javobni o‘zgartirish',
    });
    btn.addEventListener('click', () => {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* e'tiborsiz */
      }
      doneBox.hidden = true;
      form.hidden = false;
      setStatus('');
    });
    doneBox.append(document.createElement('br'), btn);
  }
}

function thanks(attending, name) {
  return attending === 'yes'
    ? `Rahmat, ${name}! Sizni to‘yimizda intizorlik bilan kutamiz.`
    : `Rahmat, ${name}! Javobingiz uchun minnatdormiz.`;
}

function linkTo(href, text) {
  return Object.assign(document.createElement('a'), { href, textContent: text, target: '_blank', rel: 'noopener' });
}
