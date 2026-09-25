import React, { useRef, useState } from 'react';
import { motion, useReducedMotion, type PanInfo } from 'motion/react';
import confetti from 'canvas-confetti';
import { gsap } from '../lib/scrollTrigger';
import { useLanguage } from './LanguageContext';
import { useMusic } from './MusicContext';
import { wedding } from '../wedding';

interface EnvelopeIntroProps {
  onOpen: () => void;
}

const GOLD = '#C9A96E';
const CREAM = '#F8F0E3';
const CONFETTI_COLORS = ['#C9A96E', '#F8F0E3', '#a07840', '#efe3cd'];

export const EnvelopeIntro: React.FC<EnvelopeIntroProps> = ({ onOpen }) => {
  const { t } = useLanguage();
  const { start } = useMusic();
  const prefersReducedMotion = useReducedMotion();

  const [isOpening, setIsOpening] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (isOpening) return;
    setIsOpening(true);

    // Must be first: kicks off audio inside the user gesture call stack.
    start();

    if (!prefersReducedMotion) {
      confetti({
        particleCount: 60,
        spread: 75,
        startVelocity: 32,
        gravity: 0.9,
        origin: { x: 0.5, y: 0.38 },
        colors: CONFETTI_COLORS,
        scalar: 0.85,
        ticks: 200,
        disableForReducedMotion: true,
      });
    }

    if (prefersReducedMotion) {
      gsap.to(groupRef.current, {
        opacity: 0,
        scale: 0.98,
        duration: 0.5,
        ease: 'power1.out',
        onComplete: onOpen,
      });
      return;
    }

    const tl = gsap.timeline({ onComplete: onOpen });
    tl.to(flapRef.current, {
      rotateX: -175,
      duration: 0.7,
      ease: 'power2.inOut',
    })
      .to(
        sealRef.current,
        { scale: 1.25, boxShadow: '0 0 28px 6px rgba(201,169,110,0.6)', duration: 0.22, ease: 'power2.out' },
        '-=0.55',
      )
      .to(sealRef.current, { scale: 0, opacity: 0, duration: 0.25, ease: 'power1.in' }, '-=0.05')
      .to(
        paperRef.current,
        { opacity: 1, y: -108, scale: 1.03, duration: 0.6, ease: 'power2.out' },
        '-=0.32',
      )
      .to(groupRef.current, { opacity: 0, scale: 1.08, duration: 0.55, ease: 'power2.in' }, '+=0.3');
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -60 || info.velocity.y < -350) {
      handleOpen();
    }
  };

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #170810 0%, #050102 100%)',
        touchAction: 'none',
      }}
    >
      {/* Ambient sparkle dots */}
      {!prefersReducedMotion &&
        Array.from({ length: 16 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: 2.5 + (i % 4), repeat: Infinity, delay: (i * 0.31) % 3 }}
            style={{
              position: 'absolute',
              left: `${(i * 13.7 + 4) % 96}%`,
              top: `${(i * 17.3 + 6) % 92}%`,
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              background: GOLD,
              pointerEvents: 'none',
            }}
          />
        ))}

      {/* Center spotlight behind the envelope */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(480px, 110vw)',
          height: 'min(480px, 110vw)',
          background: 'radial-gradient(circle, rgba(201,169,110,0.16) 0%, transparent 68%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ perspective: '1400px', width: 'min(320px, 78vw)', position: 'relative' }}>
        {/* Corner filigree */}
        {!prefersReducedMotion && (
          <svg width="100%" height="100%" viewBox="0 0 100 70" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6 }} aria-hidden="true">
            {[
              { x: 4, y: 4, r: 0 },
              { x: 96, y: 4, r: 90 },
              { x: 96, y: 66, r: 180 },
              { x: 4, y: 66, r: 270 },
            ].map((c, i) => (
              <g key={i} transform={`translate(${c.x},${c.y}) rotate(${c.r})`}>
                <path d="M0,0 Q7,0 7,7 M0,0 Q0,7 -7,0" stroke={GOLD} strokeWidth={0.5} fill="none" opacity={0.5} />
              </g>
            ))}
          </svg>
        )}

        <motion.div
          ref={groupRef}
          drag={isOpening ? false : 'y'}
          dragConstraints={{ top: -140, bottom: 0 }}
          dragElastic={0.5}
          onDragEnd={handleDragEnd}
          onClick={handleOpen}
          whileTap={{ scale: 0.98 }}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1.42',
            cursor: isOpening ? 'default' : 'grab',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Paper / invitation card that slides out */}
          <div
            ref={paperRef}
            style={{
              position: 'absolute',
              left: '6%',
              right: '6%',
              top: '8%',
              bottom: '-6%',
              borderRadius: '10px',
              background: `linear-gradient(160deg, ${CREAM} 0%, #efe3cd 100%)`,
              boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
              opacity: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              zIndex: 3,
              overflow: 'hidden',
            }}
          >
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#a07840' }}>
              {t.envelopeInvite}
            </span>
            <span style={{ fontFamily: 'Dancing Script, cursive', fontSize: '28px', color: '#5a4324' }}>
              {t.heroGroom} &amp; {t.heroBride}
            </span>

            {/* Rising sparkles once the paper is revealed */}
            {isOpening &&
              !prefersReducedMotion &&
              [0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 0.9, 0], y: -40 }}
                  transition={{ duration: 1.6, delay: 0.3 + i * 0.2, repeat: 2, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    left: `${38 + i * 12}%`,
                    bottom: '30%',
                    width: '3px',
                    height: '3px',
                    borderRadius: '50%',
                    background: GOLD,
                    boxShadow: `0 0 6px ${GOLD}`,
                    pointerEvents: 'none',
                  }}
                />
              ))}
          </div>

          {/* Envelope body */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '10px',
              background: 'linear-gradient(160deg, #2a1310 0%, #170a09 60%, #200f0d 100%)',
              border: `1px solid rgba(201,169,110,0.4)`,
              boxShadow: '0 25px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
              zIndex: 2,
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 40%, rgba(201,169,110,0.06) 55%, transparent 70%)' }} />
            {/* bottom fold lines suggesting an envelope pocket */}
            <svg width="100%" height="100%" viewBox="0 0 200 141" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
              <path d="M0 141 L100 60 L200 141" stroke={GOLD} strokeWidth="0.6" fill="none" opacity="0.4" />
            </svg>
          </div>

          {/* Flap (hinged at top, flips open) */}
          <div
            ref={flapRef}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '68%',
              transformOrigin: 'top center',
              backfaceVisibility: 'hidden',
              clipPath: 'polygon(0% 0%, 100% 0%, 50% 82%)',
              background: 'linear-gradient(160deg, #3a1c17 0%, #241010 70%)',
              border: `1px solid rgba(201,169,110,0.35)`,
              zIndex: 4,
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, transparent 45%, rgba(201,169,110,0.1) 55%, transparent 65%)' }} />
          </div>

          {/* Wax seal / monogram */}
          <div
            ref={sealRef}
            style={{
              position: 'absolute',
              left: '50%',
              top: '44%',
              transform: 'translate(-50%, -50%)',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, #c9a96e 0%, #8a6a35 60%, #6b4f24 100%)`,
              boxShadow: '0 6px 16px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
            }}
          >
            <span style={{ fontFamily: 'Dancing Script, cursive', fontSize: '20px', color: '#2a1a08', fontWeight: 700 }}>
              {wedding().initials}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Hint */}
      <motion.div
        animate={prefersReducedMotion ? {} : { opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          marginTop: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <motion.svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          animate={prefersReducedMotion ? {} : { y: [0, -6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M12 19V5M6 11l6-6 6 6" stroke={GOLD} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        </motion.svg>
        <p style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '10px',
          fontWeight: 300,
          color: 'rgba(201,169,110,0.85)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          {t.envelopeHint}
        </p>
        <div
          style={{
            width: '46px',
            height: '1px',
            backgroundImage: 'linear-gradient(100deg, transparent 10%, #C9A96E 50%, transparent 90%)',
            backgroundSize: '250% 100%',
            animation: prefersReducedMotion ? undefined : 'shimmerSweep 3s ease-in-out infinite',
          }}
        />
      </motion.div>
    </motion.div>
  );
};
