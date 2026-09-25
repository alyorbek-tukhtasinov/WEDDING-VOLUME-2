import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { useLanguage } from './LanguageContext';
import { wedding } from '../wedding';

// "Kelaman ♡" — asl shablonda faqat tabrik animatsiyasi edi. Endi mehmon javobi saqlanadi
// (/api/rsvp) va mijozning /admin sahifasida ko'rinadi. Javob brauzerda eslab qolinadi.
const RSVP_COLORS = ['#C9A96E', '#F8F0E3', '#a07840', '#e0a0a8'];
const GOLD = '#C9A96E';

type Saved = { id: string; attending: 'yes' | 'no'; name: string; guests: number };

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function load(key: string): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function save(key: string, v: Saved) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* localStorage mavjud emas */
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid rgba(201,169,110,0.3)',
  background: 'rgba(255,255,255,0.05)',
  color: '#F8F0E3',
  fontFamily: 'Montserrat, sans-serif',
  fontSize: '14px',
  outline: 'none',
};

export const RsvpForm: React.FC<{ isInView: boolean }> = ({ isInView }) => {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const w = wedding();
  const [saved, setSaved] = useState<Saved | null>(() => load(w.storageKey));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(saved?.name || '');
  const [guests, setGuests] = useState(saved?.guests || 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const idRef = useRef(saved?.id || newId());
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) nameRef.current?.focus({ preventScroll: true });
  }, [open]);

  const closed = !!w.rsvp.closesAt && Date.now() > w.rsvp.closesAt.getTime();

  const celebrate = () => {
    if (prefersReducedMotion) return;
    confetti({
      particleCount: 120,
      spread: 100,
      startVelocity: 38,
      gravity: 0.9,
      origin: { x: 0.5, y: 0.6 },
      colors: RSVP_COLORS,
      scalar: 0.9,
      ticks: 220,
      disableForReducedMotion: true,
    });
  };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 3200);
  };

  const submit = async (attending: 'yes' | 'no') => {
    if (name.trim().length < 2) {
      setError(t.rsvpNameError);
      nameRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idRef.current, name: name.trim(), attending, guests: attending === 'yes' ? guests : 0, message: '' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'failed');
      const v: Saved = { id: json.id || idRef.current, attending, name: name.trim(), guests };
      idRef.current = v.id;
      save(w.storageKey, v);
      setSaved(v);
      setOpen(false);
      if (attending === 'yes') celebrate();
      showToast(attending === 'yes' ? t.giftRsvpToast : t.rsvpDeclineToast);
    } catch {
      setError(t.rsvpError);
    } finally {
      setBusy(false);
    }
  };

  // Javob qabul qilinmaydigan holat: asl shablondagidek faqat tabrik animatsiyasi
  const legacy = !w.rsvp.enabled;

  return (
    <>
      {!open && !closed && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
        >
          {saved && !legacy && (
            <p style={{ margin: 0, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '16px', color: '#F8F0E3' }}>
              {saved.attending === 'yes' ? t.rsvpDone : t.rsvpDoneNo}
            </p>
          )}
          <motion.button
            onClick={() => {
              if (legacy) {
                celebrate();
                showToast(t.giftRsvpToast);
              } else setOpen(true);
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: '10px 22px',
              borderRadius: '999px',
              background: 'transparent',
              border: '1px solid rgba(201,169,110,0.4)',
              color: GOLD,
              fontFamily: 'Dancing Script, cursive',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            {saved && !legacy ? t.rsvpChange : t.giftRsvp}
          </motion.button>
        </motion.div>
      )}

      <AnimatePresence>
        {open && (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            onSubmit={(e) => {
              e.preventDefault();
              submit('yes');
            }}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '16px',
              borderRadius: '18px',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(201,169,110,0.25)',
            }}
          >
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder={t.rsvpName}
              aria-label={t.rsvpName}
              maxLength={80}
              autoComplete="name"
              style={inputStyle}
            />
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontFamily: 'Montserrat, sans-serif', fontSize: '13px', color: 'rgba(245,235,215,0.75)' }}>
              {t.rsvpGuests}
              <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} style={{ ...inputStyle, width: '84px', padding: '8px 10px' }}>
                {Array.from({ length: w.rsvp.maxGuests }, (_, i) => (
                  <option key={i + 1} value={i + 1} style={{ color: '#111' }}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            {error && <p style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: '12px', color: '#e8a0a0' }}>{error}</p>}
            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(201,169,110,0.5)',
                background: 'rgba(201,169,110,0.15)',
                color: GOLD,
                fontFamily: 'Dancing Script, cursive',
                fontSize: '20px',
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {t.giftRsvp}
            </motion.button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submit('no')}
              style={{ padding: '4px', border: 0, background: 'none', color: 'rgba(245,235,215,0.55)', fontFamily: 'Montserrat, sans-serif', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {t.rsvpDecline}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          // Markazlash tashqi blokda: motion'ning y/scale animatsiyasi transform'ni almashtirib yuboradi
          <div key="toast" style={{ position: 'fixed', left: 0, right: 0, bottom: '100px', zIndex: 200, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            style={{
              background: 'rgba(10,4,8,0.9)',
              border: '1px solid rgba(201,169,110,0.35)',
              borderRadius: '14px',
              padding: '12px 20px',
              fontFamily: 'Cormorant Garamond, serif',
              fontStyle: 'italic',
              fontSize: '16px',
              color: '#F8F0E3',
              maxWidth: 'calc(100vw - 32px)',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
          >
            {toast}
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
