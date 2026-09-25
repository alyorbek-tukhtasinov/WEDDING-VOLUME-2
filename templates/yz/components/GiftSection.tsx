import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, useMotionValue, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { useLanguage } from './LanguageContext';
import { CoupleIllustration } from './decor/CoupleIllustration';
import { RsvpForm } from './RsvpForm';
import { wedding } from '../wedding';

const CONFETTI_COLORS = ['#C9A96E', '#F8F0E3', '#a07840', '#efe3cd'];

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const GiftSection: React.FC = () => {
  const { t } = useLanguage();
  // Karta raqami config'dan (giftCard). Kiritilmagan bo'lsa karta ko'rsatilmaydi.
  const card = wedding().giftCard;
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });
  const [copied, setCopied] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [holo, setHolo] = useState({ x: 50, y: 50 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);
  const cardRotateX = useMotionValue(0);
  const cardRotateY = useMotionValue(0);

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cardRotateY.set(px * 10);
    cardRotateX.set(-py * 10);
    setHolo({ x: (px + 0.5) * 100, y: (py + 0.5) * 100 });
  };

  const handleCardPointerLeave = () => {
    cardRotateX.set(0);
    cardRotateY.set(0);
  };

  const copyCard = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = rippleId.current++;
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 650);

    try {
      await navigator.clipboard.writeText(card?.raw || '');
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = card?.raw || '';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    if (!prefersReducedMotion) {
      const originY = rect.top / window.innerHeight;
      confetti({
        particleCount: 28,
        spread: 55,
        startVelocity: 22,
        gravity: 1,
        origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: originY },
        colors: CONFETTI_COLORS,
        scalar: 0.7,
        ticks: 150,
        disableForReducedMotion: true,
      });
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      ref={ref}
      style={{
        height: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img
          src={wedding().photos.gift}
          alt="Wedding background"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(0.3)' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(5,1,3,0.55) 0%, rgba(8,2,5,0.4) 35%, rgba(12,3,7,0.65) 70%, rgba(5,1,3,0.92) 100%)',
        }} />
      </div>

      {/* Background glow effects */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(201,169,110,0.2) 0%, transparent 70%)',
          }}
        />
        {/* Floating gold particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: 3 + i % 3,
              delay: i * 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: `${(i * 8.5 + 5) % 90}%`,
              top: `${(i * 13.3 + 10) % 85}%`,
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: '#C9A96E',
              opacity: 0.2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        width: '100%',
        maxWidth: '380px',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '28px',
      }}>
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '30px', height: '1px', background: 'linear-gradient(to right, transparent, #C9A96E)' }} />
            <span style={{ color: '#C9A96E', fontSize: '18px' }}>💝</span>
            <div style={{ width: '30px', height: '1px', background: 'linear-gradient(to left, transparent, #C9A96E)' }} />
          </div>
          <h2 style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(28px, 8vw, 36px)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: '#F8F0E3',
            margin: '0 0 4px',
          }}>
            {card ? t.giftTitle : t.rsvpTitle}
          </h2>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '11px',
            fontWeight: 300,
            color: 'rgba(201,169,110,0.7)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            {card ? t.giftSubtitle : t.rsvpSubtitle}
          </p>
        </motion.div>

        {card && (<>
        {/* Premium Bank Card: tilts on pointer move, flips on click */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          onPointerMove={handleCardPointerMove}
          onPointerLeave={handleCardPointerLeave}
          onClick={() => setIsFlipped((f) => !f)}
          style={{
            width: '100%',
            height: '195px',
            borderRadius: '20px',
            position: 'relative',
            cursor: 'pointer',
            rotateX: cardRotateX,
            rotateY: cardRotateY,
            transformPerspective: 800,
          }}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.65, ease: 'easeInOut' }}
            style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
          >
            {/* Card Front */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1a1205 0%, #2d2008 35%, #1e1606 65%, #2a1d05 100%)',
              border: '1px solid rgba(201,169,110,0.35)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,169,110,0.1) inset',
              overflow: 'hidden',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}>
              {/* Holographic shine following the pointer */}
              {!prefersReducedMotion && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at ${holo.x}% ${holo.y}%, rgba(255,255,255,0.28) 0%, rgba(201,169,110,0.14) 35%, transparent 65%)`,
                    mixBlendMode: 'screen',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {/* Card shimmer overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(110deg, transparent 30%, rgba(201,169,110,0.06) 50%, transparent 70%)',
              }} />
              {/* Circular decorative element */}
              <div style={{
                position: 'absolute',
                right: '-30px',
                bottom: '-30px',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                border: '1px solid rgba(201,169,110,0.12)',
              }} />
              <div style={{
                position: 'absolute',
                right: '-10px',
                bottom: '-10px',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '1px solid rgba(201,169,110,0.08)',
              }} />

              {/* Chip */}
              <div style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                width: '42px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #C9A96E 0%, #a07840 50%, #C9A96E 100%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: '100%',
                  height: '1px',
                  background: 'rgba(0,0,0,0.3)',
                  position: 'absolute',
                  top: '40%',
                }} />
                <div style={{
                  width: '1px',
                  height: '70%',
                  background: 'rgba(0,0,0,0.2)',
                  position: 'absolute',
                  left: '50%',
                }} />
              </div>

              {/* Bank logo / name */}
              <div style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
              }}>
                <span style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#C9A96E',
                  letterSpacing: '0.05em',
                }}>
                  {t.giftBank}
                </span>
              </div>

              {/* Card number */}
              <div style={{
                position: 'absolute',
                bottom: '56px',
                left: '24px',
                right: '24px',
              }}>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '10px',
                  fontWeight: 300,
                  color: 'rgba(201,169,110,0.6)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  margin: '0 0 6px',
                }}>
                  {t.giftCardLabel}
                </p>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '18px',
                  fontWeight: 300,
                  color: '#F8F0E3',
                  letterSpacing: '0.18em',
                  margin: 0,
                }}>
                  {card?.number}
                </p>
              </div>

              {/* Cardholder */}
              <div style={{
                position: 'absolute',
                bottom: '22px',
                left: '24px',
              }}>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  fontWeight: 300,
                  color: 'rgba(248,240,227,0.7)',
                  letterSpacing: '0.1em',
                  margin: 0,
                }}>
                  {t.giftHolder}
                </p>
              </div>

              {/* Validity */}
              {card?.expiry && <div style={{
                position: 'absolute',
                bottom: '22px',
                right: '24px',
              }}>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '11px',
                  fontWeight: 300,
                  color: 'rgba(248,240,227,0.5)',
                  letterSpacing: '0.08em',
                  margin: 0,
                }}>
                  {card.expiry}
                </p>
              </div>}
            </div>

            {/* Card Back */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1e1606 0%, #2a1d05 60%, #1a1205 100%)',
              border: '1px solid rgba(201,169,110,0.35)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}>
              <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, height: '38px', background: '#0e0a03' }} />
              <span style={{ fontFamily: 'Dancing Script, cursive', fontSize: '26px', color: '#C9A96E', marginTop: '20px' }}>
                {t.giftBack}
              </span>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(248,240,227,0.55)', textTransform: 'uppercase' }}>
                {t.giftHolder}{t.giftBank ? ` · ${t.giftBank}` : ''}
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Copy button */}
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          onClick={copyCard}
          whileHover={{ scale: 1.02, boxShadow: '0 4px 24px rgba(201,169,110,0.25)' }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            background: copied
              ? 'rgba(80,160,100,0.15)'
              : 'rgba(201,169,110,0.1)',
            border: `1px solid ${copied ? 'rgba(80,160,100,0.4)' : 'rgba(201,169,110,0.3)'}`,
            color: copied ? 'rgba(140,220,160,0.9)' : '#C9A96E',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'background 0.3s, border-color 0.3s, color 0.3s',
          }}
        >
          {ripples.map((r) => (
            <motion.span
              key={r.id}
              initial={{ width: 0, height: 0, opacity: 0.45 }}
              animate={{ width: 220, height: 220, opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: r.x,
                top: r.y,
                borderRadius: '50%',
                background: '#C9A96E',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
          ))}
          <motion.span
            animate={copied ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {copied ? '✓' : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
            )}
          </motion.span>
          {copied ? t.giftCopied : t.giftCopy}
        </motion.button>

        </>)}

        {/* Mehmon javobi (asl shablonda faqat tabrik animatsiyasi edi) */}
        <RsvpForm isInView={isInView} />

        {/* Thank you note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            fontFamily: 'Dancing Script, cursive',
            fontSize: '20px',
            fontWeight: 400,
            color: 'rgba(201,169,110,0.6)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          ♡ {t.giftNote} ♡
        </motion.p>

        {/* Closing scene */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.8 }}
          style={{ position: 'relative' }}
        >
          {!prefersReducedMotion &&
            [0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -22, -34], opacity: [0, 0.8, 0], x: [0, (i % 2 === 0 ? 1 : -1) * 6] }}
                transition={{ duration: 2.2, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: `${20 + i * 18}%`,
                  bottom: '10%',
                  width: '2.5px',
                  height: '2.5px',
                  borderRadius: '50%',
                  background: '#C9A96E',
                  boxShadow: '0 0 6px rgba(201,169,110,0.8)',
                  pointerEvents: 'none',
                }}
              />
            ))}
          <CoupleIllustration variant="lantern" width={90} />
        </motion.div>
      </div>
    </section>
  );
};
