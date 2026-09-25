import React, { useRef, useMemo, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { SplitTextReveal } from './decor/SplitTextReveal';
import { CoupleIllustration } from './decor/CoupleIllustration';
import { gsap, ensureScrollTrigger, getScroller } from '../lib/scrollTrigger';
import { wedding } from '../wedding';


interface Petal {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  startY: number;
  dust: boolean;
}

const PETAL_COLORS = [
  'rgba(220,160,170,0.7)',
  'rgba(240,200,210,0.6)',
  'rgba(255,230,235,0.5)',
  'rgba(200,140,155,0.65)',
  'rgba(245,215,220,0.55)',
];

export const HeroSection: React.FC = () => {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !bgRef.current) return;
    ensureScrollTrigger();
    const ctx = gsap.context(() => {
      gsap.to(bgRef.current, {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          scroller: getScroller(),
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // Every third particle becomes a tiny twinkling gold dust mote instead of a petal — same total count.
  const petals: Petal[] = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: (i * 5.8 + Math.sin(i * 1.3) * 8) % 95,
      delay: (i * 0.6) % 9,
      duration: 7 + (i % 4) * 1.5,
      size: i % 3 === 2 ? 2.5 : 7 + (i % 5) * 2.5,
      color: i % 3 === 2 ? 'rgba(201,169,110,0.85)' : PETAL_COLORS[i % PETAL_COLORS.length],
      startY: -(20 + (i % 3) * 15),
      dust: i % 3 === 2,
    })),
  []);

  return (
    <section
      ref={sectionRef}
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
      {/* Background Image */}
      <div ref={bgRef} style={{ position: 'absolute', top: '-8%', left: 0, right: 0, height: '116%', zIndex: 0, willChange: 'transform' }}>
        <img
          src={wedding().photos.hero}
          alt="Wedding couple"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />
        {/* Multi-layer overlay for cinematic depth */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(5,1,3,0.55) 0%, rgba(8,2,5,0.4) 35%, rgba(12,3,7,0.65) 70%, rgba(5,1,3,0.92) 100%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(5,1,3,0.5) 100%)',
        }} />
      </div>

      {/* God rays: soft diagonal light shafts drifting behind the content */}
      {!prefersReducedMotion && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, overflow: 'hidden', pointerEvents: 'none' }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ x: [0, 30, 0], opacity: [0.08, 0.18, 0.08] }}
              transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 1.4 }}
              style={{
                position: 'absolute',
                top: '-20%',
                left: `${18 + i * 28}%`,
                width: '60px',
                height: '150%',
                background: 'linear-gradient(180deg, rgba(248,240,227,0.28) 0%, transparent 75%)',
                transform: 'rotate(14deg)',
                filter: 'blur(6px)',
                mixBlendMode: 'screen',
              }}
            />
          ))}
        </div>
      )}

      {/* Floating Petals + gold dust */}
      {petals.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.startY}px`,
            width: `${p.size}px`,
            height: p.dust ? `${p.size}px` : `${p.size * 1.6}px`,
            borderRadius: p.dust ? '50%' : '50% 20% 50% 20%',
            background: p.color,
            boxShadow: p.dust ? `0 0 ${p.size * 2}px rgba(201,169,110,0.7)` : undefined,
            zIndex: 1,
            pointerEvents: 'none',
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, Math.sin(p.id) * 40, Math.cos(p.id) * 20, 0],
            rotate: p.dust ? undefined : [0, 180, 360],
            opacity: p.dust ? [0, 0.9, 0.2, 0.9, 0] : [0, 0.8, 0.9, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Decorative top ornament */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0, x: "-50%" }}    /* x qo'shildi */
        animate={{ opacity: 1, scaleX: 1, x: "-50%" }}    /* x qo'shildi */
        transition={{ duration: 1.2, delay: 0.5 }}
        style={{
          position: 'absolute',
          top: '72px',
          left: '50%',
          /* transform: 'translateX(-50%)', bu qatorni o'chirib tashlang */
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 5,
        }}
      >
        <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to right, transparent, #C9A96E)' }} />
        <span style={{ color: '#C9A96E', fontSize: '14px' }}>✦</span>
        <div style={{ width: '40px', height: '1px', background: 'linear-gradient(to left, transparent, #C9A96E)' }} />
      </motion.div>

      {/* Main content */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        textAlign: 'center',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Save the date label, in a thin gold pill */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          style={{
            border: '1px solid rgba(201,169,110,0.35)',
            borderRadius: '999px',
            padding: '7px 18px',
            marginBottom: '28px',
          }}
        >
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '10px',
            fontWeight: 300,
            color: '#C9A96E',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            ♡ {t.heroDate} ♡
          </p>
        </motion.div>

        {/* Groom name, with a slow-breathing gold halo behind it */}
        <div style={{ position: 'relative' }}>
          {!prefersReducedMotion && (
            <motion.div
              aria-hidden="true"
              animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.9, 1.05, 0.9] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: '-20% -10%',
                background: 'radial-gradient(ellipse at center, rgba(201,169,110,0.35) 0%, transparent 70%)',
                filter: 'blur(14px)',
                zIndex: -1,
                pointerEvents: 'none',
              }}
            />
          )}
          <SplitTextReveal
            text={t.heroGroom}
            mode="chars"
            as="h1"
            delay={0.5}
            shimmer
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(52px, 16vw, 72px)',
              fontWeight: 300,
              color: '#F8F0E3',
              margin: 0,
              lineHeight: 1.1,
              textShadow: '0 2px 30px rgba(201,169,110,0.3)',
            }}
          />
        </div>

        {/* Ampersand, with a slow-rotating ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, delay: 0.7, type: 'spring' }}
          style={{ margin: '6px 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {!prefersReducedMotion && (
            <motion.svg
              width="72" height="72" viewBox="0 0 72 72"
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', zIndex: -1 }}
              aria-hidden="true"
            >
              <circle cx="36" cy="36" r="32" stroke="#C9A96E" strokeWidth="0.6" fill="none" opacity="0.35" strokeDasharray="2 8" />
            </motion.svg>
          )}
          <span style={{
            fontFamily: 'Dancing Script, cursive',
            fontSize: 'clamp(42px, 13vw, 58px)',
            fontWeight: 400,
            color: '#C9A96E',
            display: 'block',
            textShadow: '0 0 30px rgba(201,169,110,0.5)',
          }}>
            &
          </span>
        </motion.div>

        {/* Bride name, with a slow-breathing gold halo behind it */}
        <div style={{ position: 'relative' }}>
          {!prefersReducedMotion && (
            <motion.div
              aria-hidden="true"
              animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.9, 1.05, 0.9] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              style={{
                position: 'absolute',
                inset: '-20% -10%',
                background: 'radial-gradient(ellipse at center, rgba(201,169,110,0.35) 0%, transparent 70%)',
                filter: 'blur(14px)',
                zIndex: -1,
                pointerEvents: 'none',
              }}
            />
          )}
          <SplitTextReveal
            text={t.heroBride}
            mode="chars"
            as="h1"
            delay={0.9}
            shimmer
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(52px, 16vw, 72px)',
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#F8F0E3',
              margin: 0,
              lineHeight: 1.1,
              textShadow: '0 2px 30px rgba(201,169,110,0.3)',
            }}
          />
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
          style={{
            width: '120px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, #C9A96E, transparent)',
            margin: '24px 0 18px',
          }}
        />

        {/* Couple illustration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          <CoupleIllustration variant="holding-hands" width={84} />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.3 }}
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(16px, 5vw, 20px)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'rgba(245,240,227,0.85)',
            margin: 0,
            letterSpacing: '0.03em',
          }}
        >
          {t.heroSubtitle}
        </motion.p>
      </div>

      {/* Scroll indicator: layered pulsing chevrons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <p style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '9px',
          fontWeight: 300,
          color: 'rgba(201,169,110,0.7)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          {t.scrollHint}
        </p>
        <div style={{ position: 'relative', width: '20px', height: '22px' }}>
          <motion.svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            animate={{ y: [0, 8, 0], opacity: [0.7, 0.15, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <path d="M6 9l6 6 6-6" stroke="#C9A96E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
          <motion.svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            animate={{ y: [0, 8, 0], opacity: [0.15, 0.7, 0.15] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <path d="M6 4l6 6 6-6" stroke="#C9A96E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          </motion.svg>
        </div>
      </motion.div>

      {/* Glowing orb background effects */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '-20%',
        width: '60%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(180,80,100,0.12) 0%, transparent 70%)',
        zIndex: 2,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '-20%',
        width: '60%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(201,169,110,0.1) 0%, transparent 70%)',
        zIndex: 2,
        pointerEvents: 'none',
      }} />
    </section>
  );
};
