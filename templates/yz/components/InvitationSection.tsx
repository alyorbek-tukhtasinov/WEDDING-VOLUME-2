import React, { useMemo, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { SplitTextReveal } from './decor/SplitTextReveal';
import { wedding } from '../wedding';

const GOLD = '#C9A96E';

const CornerFlourish: React.FC<{ corner: 'tl' | 'tr' | 'bl' | 'br'; isInView: boolean; delay: number }> = ({ corner, isInView, delay }) => {
  const prefersReducedMotion = useReducedMotion();
  const rotate = { tl: 0, tr: 90, bl: 270, br: 180 }[corner];
  const pos: React.CSSProperties =
    corner === 'tl'
      ? { top: -8, left: -8 }
      : corner === 'tr'
      ? { top: -8, right: -8 }
      : corner === 'bl'
      ? { bottom: -8, left: -8 }
      : { bottom: -8, right: -8 };

  return (
    <svg width="26" height="26" viewBox="0 0 26 26" style={{ position: 'absolute', ...pos, transform: `rotate(${rotate}deg)`, pointerEvents: 'none' }} aria-hidden="true">
      <motion.path
        d="M2,2 L2,16 M2,2 L16,2 M2,9 Q9,9 9,2"
        stroke={GOLD}
        strokeWidth={0.8}
        fill="none"
        strokeLinecap="round"
        opacity={0.55}
        initial={prefersReducedMotion ? undefined : { pathLength: 0 }}
        animate={isInView && !prefersReducedMotion ? { pathLength: 1 } : prefersReducedMotion ? undefined : { pathLength: 0 }}
        transition={{ duration: 1, delay, ease: 'easeOut' }}
      />
    </svg>
  );
};

export const InvitationSection: React.FC = () => {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.4 });

  const sentences = useMemo(
    () => t.invText.split(/(?<=[.!?])\s+/).filter(Boolean),
    [t.invText],
  );

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
          src={wedding().photos.invitation}
          alt="Floral background"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'saturate(0.6) brightness(0.3)' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(30,8,15,0.88) 0%, rgba(22,6,12,0.82) 50%, rgba(30,8,15,0.92) 100%)',
        }} />
      </div>

      {/* Decorative corner roses */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '-10px',
          width: '140px',
          height: '140px',
          backgroundImage: `url(${wedding().photos.invitation})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
          maskImage: 'radial-gradient(circle at 0% 0%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 0% 0%, black 20%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10px',
          right: '-10px',
          width: '140px',
          height: '140px',
          backgroundImage: `url(${wedding().photos.invitation})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
          maskImage: 'radial-gradient(circle at 100% 100%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 100% 100%, black 20%, transparent 70%)',
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '32px 36px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '360px',
      }}>
        {/* Top ornament */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
          transition={{ duration: 0.8 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}
        >
          <div style={{ width: '32px', height: '1px', background: 'linear-gradient(to right, transparent, #C9A96E)' }} />
          <span style={{ color: '#C9A96E', fontSize: '12px' }}>✦</span>
          <span style={{ color: '#C9A96E', fontSize: '16px' }}>✿</span>
          <span style={{ color: '#C9A96E', fontSize: '12px' }}>✦</span>
          <div style={{ width: '32px', height: '1px', background: 'linear-gradient(to left, transparent, #C9A96E)' }} />
        </motion.div>

        {/* Title */}
        <SplitTextReveal
          text={t.invTitle}
          mode="words"
          as="h2"
          delay={0.1}
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(24px, 7vw, 30px)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: '#F8F0E3',
            margin: '0 0 10px',
            lineHeight: 1.3,
          }}
        />
        <div
          style={{
            width: '64px',
            height: '1px',
            backgroundImage: 'linear-gradient(100deg, transparent 10%, #C9A96E 50%, transparent 90%)',
            backgroundSize: '250% 100%',
            animation: prefersReducedMotion ? undefined : 'shimmerSweep 4s ease-in-out infinite',
            marginBottom: '24px',
          }}
        />

        {/* Body text, framed by a drawn-in filigree corner frame, revealed sentence by sentence */}
        <div style={{ position: 'relative', padding: '4px 6px' }}>
          <CornerFlourish corner="tl" isInView={isInView} delay={0.2} />
          <CornerFlourish corner="tr" isInView={isInView} delay={0.3} />
          <CornerFlourish corner="bl" isInView={isInView} delay={0.4} />
          <CornerFlourish corner="br" isInView={isInView} delay={0.5} />

          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(17px, 5vw, 20px)',
            fontWeight: 300,
            color: 'rgba(245,235,220,0.88)',
            lineHeight: 1.75,
            margin: '0 0 32px',
            letterSpacing: '0.01em',
          }}>
            {sentences.map((sentence, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.22 }}
                style={{ display: 'block' }}
              >
                {sentence}
              </motion.span>
            ))}
          </p>
        </div>

        {/* Closing ornament */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          style={{
            width: '80px',
            height: '1px',
            background: 'linear-gradient(to right, transparent, #C9A96E, transparent)',
            marginBottom: '24px',
          }}
        />

        {/* Signature, revealed left-to-right like a hand writing it */}
        <motion.p
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={isInView ? { clipPath: 'inset(0 0% 0 0)' } : { clipPath: 'inset(0 100% 0 0)' }}
          transition={{ duration: 1.1, delay: 0.6, ease: 'easeInOut' }}
          style={{
            fontFamily: 'Dancing Script, cursive',
            fontSize: 'clamp(26px, 8vw, 32px)',
            fontWeight: 600,
            color: '#C9A96E',
            margin: 0,
            textShadow: '0 0 20px rgba(201,169,110,0.4)',
          }}
        >
          {t.invClosing}
        </motion.p>

        {/* Hearts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.75 }}
          style={{ marginTop: '16px', display: 'flex', gap: '8px' }}
        >
          {['♡', '♡', '♡'].map((h, i) => (
            <motion.span
              key={i}
              animate={{ scale: [1, 1.3, 1], filter: ['drop-shadow(0 0 0px rgba(201,169,110,0))', 'drop-shadow(0 0 5px rgba(201,169,110,0.8))', 'drop-shadow(0 0 0px rgba(201,169,110,0))'] }}
              transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
              style={{ color: '#C9A96E', fontSize: '14px', opacity: 0.7 }}
            >
              {h}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
